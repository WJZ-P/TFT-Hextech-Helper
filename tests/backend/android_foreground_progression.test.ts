import test from "node:test";
import assert from "node:assert/strict";
import {
    createInitialAndroidForegroundProgressState,
    planAndroidForegroundProgress,
} from "../../src-backend/services/AndroidForegroundProgression";
import type { AndroidForegroundObservation } from "../../src-backend/services/AndroidForegroundProtocol";

function createObservation(
    overrides: Partial<AndroidForegroundObservation> & Pick<AndroidForegroundObservation, "state">
): AndroidForegroundObservation {
    return {
        state: overrides.state,
        verification: overrides.verification ?? "VERIFIED_REAL",
        source: overrides.source ?? "SMOKE_FIXTURE",
        reason: overrides.reason ?? `test-${overrides.state.toLowerCase()}`,
        anchors: overrides.anchors,
        actionPoints: overrides.actionPoints,
        note: overrides.note,
        rawClassification: overrides.rawClassification,
    };
}

test("android foreground progression waits on BlueStacks boot screens", () => {
    const result = planAndroidForegroundProgress(
        createObservation({ state: "BLUESTACKS_BOOT" }),
        createInitialAndroidForegroundProgressState()
    );

    assert.equal(result.decision.kind, "WAIT");
    assert.match(result.decision.reason, /BlueStacks/i);
});

test("android foreground progression waits on unknown non-game windows", () => {
    const result = planAndroidForegroundProgress(
        createObservation({ state: "UNKNOWN" }),
        createInitialAndroidForegroundProgressState()
    );

    assert.equal(result.decision.kind, "WAIT");
    assert.match(result.decision.reason, /recognized Android game state/i);
});

test("android foreground progression taps verified real update CTA on first frame", () => {
    const observation = createObservation({
        state: "UPDATE_READY",
        actionPoints: { PRIMARY_CTA: { x: 0.5, y: 0.545 } },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    assert.equal(first.decision.kind, "TAP_PRIMARY_CTA");
    assert.deepEqual(first.decision.targetPoint, { x: 0.5, y: 0.545 });
});

test("android foreground progression does not spam update taps on repeated identical frames", () => {
    const observation = createObservation({
        state: "UPDATE_READY",
        actionPoints: { PRIMARY_CTA: { x: 0.5, y: 0.545 } },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    const second = planAndroidForegroundProgress(observation, first.nextState);
    const third = planAndroidForegroundProgress(observation, second.nextState);

    assert.equal(first.decision.kind, "TAP_PRIMARY_CTA");
    assert.equal(second.decision.kind, "WAIT");
    assert.equal(third.decision.kind, "WAIT");
    assert.match(second.decision.reason, /awaiting/i);
    assert.match(third.decision.reason, /awaiting/i);
});

test("android foreground progression blocks login-required frontend screens", () => {
    const result = planAndroidForegroundProgress(
        createObservation({ state: "LOGIN_REQUIRED" }),
        createInitialAndroidForegroundProgressState()
    );

    assert.equal(result.decision.kind, "BLOCKED");
    assert.match(result.decision.reason, /login/i);
});

test("android foreground progression prepares a synthetic lobby start action", () => {
    const observation = createObservation({
        state: "LOBBY",
        verification: "SYNTHETIC_PLACEHOLDER",
        actionPoints: { START_QUEUE: { x: 0.86, y: 0.90 } },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    const second = planAndroidForegroundProgress(observation, first.nextState);

    assert.equal(first.decision.kind, "WAIT");
    assert.equal(second.decision.kind, "TAP_START_QUEUE");
    assert.deepEqual(second.decision.targetPoint, { x: 0.86, y: 0.90 });
});

test("android foreground progression taps verified real lobby start on first frame", () => {
    const observation = createObservation({
        state: "LOBBY",
        verification: "VERIFIED_REAL",
        actionPoints: { START_QUEUE: { x: 0.87, y: 0.90 } },
    });

    const result = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());

    assert.equal(result.decision.kind, "TAP_START_QUEUE");
    assert.deepEqual(result.decision.targetPoint, { x: 0.87, y: 0.90 });
});

test("android foreground progression retries lobby start with a cap", () => {
    const observation = createObservation({
        state: "LOBBY",
        actionPoints: { START_QUEUE: { x: 0.84, y: 0.90 } },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    const second = planAndroidForegroundProgress(observation, first.nextState);
    const third = planAndroidForegroundProgress(observation, second.nextState);
    const fourth = planAndroidForegroundProgress(observation, third.nextState);
    const fifth = planAndroidForegroundProgress(observation, fourth.nextState);

    assert.equal(first.decision.kind, "TAP_START_QUEUE");
    assert.equal(second.decision.kind, "TAP_START_QUEUE");
    assert.match(second.decision.reason, /retrying start-match/i);
    assert.equal(third.decision.kind, "TAP_START_QUEUE");
    assert.match(third.decision.reason, /retrying start-match/i);
    assert.equal(fourth.decision.kind, "BLOCKED");
    assert.match(fourth.decision.reason, /retry cap/i);
    assert.equal(fifth.decision.kind, "BLOCKED");
});

test("android foreground progression cools down room start retries instead of forcing a leave tap", () => {
    const observation = createObservation({
        state: "LOBBY",
        actionPoints: {
            START_QUEUE: { x: 0.87, y: 0.90 },
            LEAVE_ROOM: { x: 0.24, y: 0.14 },
        },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    const second = planAndroidForegroundProgress(observation, first.nextState);
    const third = planAndroidForegroundProgress(observation, second.nextState);
    const fourth = planAndroidForegroundProgress(observation, third.nextState);
    const fifth = planAndroidForegroundProgress(observation, fourth.nextState);
    const sixth = planAndroidForegroundProgress(observation, fifth.nextState);
    const seventh = planAndroidForegroundProgress(observation, sixth.nextState);

    assert.equal(first.decision.kind, "TAP_START_QUEUE");
    assert.equal(second.decision.kind, "TAP_START_QUEUE");
    assert.equal(third.decision.kind, "TAP_START_QUEUE");
    assert.equal(fourth.decision.kind, "WAIT");
    assert.match(fourth.decision.reason, /cooldown/i);
    assert.equal(fifth.decision.kind, "TAP_START_QUEUE");
    assert.equal(sixth.decision.kind, "TAP_START_QUEUE");
    assert.equal(seventh.decision.kind, "TAP_START_QUEUE");
});

test("android foreground progression dismisses open lobby side menu before queueing", () => {
    const observation = createObservation({
        state: "LOBBY",
        actionPoints: { DISMISS_OVERLAY: { x: 0.78, y: 0.52 } },
    });

    const result = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());

    assert.equal(result.decision.kind, "TAP_DISMISS_OVERLAY");
    assert.deepEqual(result.decision.targetPoint, { x: 0.78, y: 0.52 });
});

test("android foreground progression does not spam lobby side-menu dismiss clicks", () => {
    const observation = createObservation({
        state: "LOBBY",
        actionPoints: { DISMISS_OVERLAY: { x: 0.78, y: 0.52 } },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    const second = planAndroidForegroundProgress(observation, first.nextState);

    assert.equal(first.decision.kind, "TAP_DISMISS_OVERLAY");
    assert.equal(second.decision.kind, "WAIT");
    assert.match(second.decision.reason, /dismiss already issued/i);
});

test("android foreground progression resumes canonical lobby flow after side menu closes", () => {
    const sideMenu = createObservation({
        state: "LOBBY",
        actionPoints: { DISMISS_OVERLAY: { x: 0.78, y: 0.52 } },
    });
    const cleanLobby = createObservation({
        state: "LOBBY",
        actionPoints: { START_QUEUE: { x: 0.84, y: 0.90 } },
    });

    const dismissed = planAndroidForegroundProgress(sideMenu, createInitialAndroidForegroundProgressState());
    const firstLobby = planAndroidForegroundProgress(cleanLobby, dismissed.nextState);
    const secondLobby = planAndroidForegroundProgress(cleanLobby, firstLobby.nextState);

    assert.equal(dismissed.decision.kind, "TAP_DISMISS_OVERLAY");
    assert.equal(firstLobby.decision.kind, "TAP_START_QUEUE");
    assert.equal(secondLobby.decision.kind, "TAP_START_QUEUE");
    assert.match(secondLobby.decision.reason, /retrying start-match/i);
});

test("android foreground progression selects game mode before starting queue", () => {
    const observation = createObservation({
        state: "MODE_SELECT",
        actionPoints: {
            SELECT_GAME_MODE: { x: 0.35, y: 0.66 },
            START_QUEUE: { x: 0.84, y: 0.90 },
        },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    const second = planAndroidForegroundProgress(observation, first.nextState);
    const third = planAndroidForegroundProgress(observation, second.nextState);

    assert.equal(first.decision.kind, "TAP_SELECT_GAME_MODE");
    assert.deepEqual(first.decision.targetPoint, { x: 0.35, y: 0.66 });
    assert.equal(second.decision.kind, "TAP_START_QUEUE");
    assert.deepEqual(second.decision.targetPoint, { x: 0.84, y: 0.90 });
    assert.equal(third.decision.kind, "WAIT");
    assert.match(third.decision.reason, /Mode-selection actions already issued/i);
});

test("android foreground progression can requeue after ready-check returns to lobby", () => {
    const lobby = createObservation({
        state: "LOBBY",
        actionPoints: { START_QUEUE: { x: 0.84, y: 0.90 } },
    });
    const acceptReady = createObservation({
        state: "ACCEPT_READY",
        actionPoints: { ACCEPT_READY: { x: 0.51, y: 0.68 } },
    });

    const startQueue = planAndroidForegroundProgress(lobby, createInitialAndroidForegroundProgressState());
    const accept = planAndroidForegroundProgress(acceptReady, startQueue.nextState);
    const returnedLobbyStart = planAndroidForegroundProgress(lobby, accept.nextState);
    const returnedLobbyRetry = planAndroidForegroundProgress(lobby, returnedLobbyStart.nextState);

    assert.equal(startQueue.decision.kind, "TAP_START_QUEUE");
    assert.equal(accept.decision.kind, "TAP_ACCEPT_READY");
    assert.equal(returnedLobbyStart.decision.kind, "TAP_START_QUEUE");
    assert.equal(returnedLobbyRetry.decision.kind, "TAP_START_QUEUE");
    assert.match(returnedLobbyRetry.decision.reason, /retrying start-match/i);
});

test("android foreground progression retries recoverable confirmation modals with a cap", () => {
    const observation = createObservation({
        state: "CONFIRM_MODAL",
        actionPoints: { CONFIRM_MODAL: { x: 0.59, y: 0.61 } },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    const second = planAndroidForegroundProgress(observation, first.nextState);
    const third = planAndroidForegroundProgress(observation, second.nextState);
    const fourth = planAndroidForegroundProgress(observation, third.nextState);

    assert.equal(first.decision.kind, "TAP_CONFIRM_MODAL");
    assert.deepEqual(first.decision.targetPoint, { x: 0.59, y: 0.61 });
    assert.equal(second.decision.kind, "TAP_CONFIRM_MODAL");
    assert.match(second.decision.reason, /retrying dismiss/i);
    assert.equal(third.decision.kind, "TAP_CONFIRM_MODAL");
    assert.match(third.decision.reason, /retrying dismiss/i);
    assert.equal(fourth.decision.kind, "BLOCKED");
    assert.match(fourth.decision.reason, /manual\/network recovery/i);
});

test("android foreground progression labels network confirmation modal retries", () => {
    const observation = createObservation({
        state: "CONFIRM_MODAL",
        actionPoints: { CONFIRM_MODAL: { x: 0.57, y: 0.62 } },
        rawClassification: {
            state: "CONFIRM_MODAL",
            brightBlueRatio: 0,
            blueDominantRatio: 0,
            brightWhiteRatio: 0,
            confirmModalVariant: "NETWORK_ERROR",
            confirmModalPoint: { x: 0.57, y: 0.62 },
        },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    const second = planAndroidForegroundProgress(observation, first.nextState);
    const third = planAndroidForegroundProgress(observation, second.nextState);
    const fourth = planAndroidForegroundProgress(observation, third.nextState);

    assert.equal(first.decision.kind, "TAP_CONFIRM_MODAL");
    assert.match(first.decision.reason, /Network confirmation modal detected/);
    assert.equal(second.decision.kind, "TAP_CONFIRM_MODAL");
    assert.match(second.decision.reason, /Network confirmation modal still present/);
    assert.equal(fourth.decision.kind, "BLOCKED");
    assert.match(fourth.decision.reason, /network\/account recovery/i);
});

test("android foreground progression keeps long queue active instead of cancelling live matchmaking", () => {
    const observation = createObservation({
        state: "QUEUE",
        verification: "SYNTHETIC_PLACEHOLDER",
        actionPoints: { CANCEL_QUEUE: { x: 0.82, y: 0.90 } },
    });

    let current = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    for (let index = 0; index < 4; index += 1) {
        current = planAndroidForegroundProgress(observation, current.nextState);
    }
    const timeoutDecision = planAndroidForegroundProgress(observation, current.nextState);

    assert.equal(timeoutDecision.decision.kind, "WAIT");
    assert.match(timeoutDecision.decision.reason, /keeping matchmaking active/i);
});

test("android foreground progression prepares accept-ready action", () => {
    const observation = createObservation({
        state: "ACCEPT_READY",
        verification: "SYNTHETIC_PLACEHOLDER",
        actionPoints: { ACCEPT_READY: { x: 0.61, y: 0.69 } },
    });

    const result = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());

    assert.equal(result.decision.kind, "TAP_ACCEPT_READY");
    assert.deepEqual(result.decision.targetPoint, { x: 0.61, y: 0.69 });
});

test("android foreground progression retries transient ready-check accepts", () => {
    const observation = createObservation({
        state: "ACCEPT_READY",
        verification: "VERIFIED_REAL",
        actionPoints: { ACCEPT_READY: { x: 0.59, y: 0.78 } },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    const second = planAndroidForegroundProgress(observation, first.nextState);
    const third = planAndroidForegroundProgress(observation, second.nextState);
    const fourth = planAndroidForegroundProgress(observation, third.nextState);

    assert.equal(first.decision.kind, "TAP_ACCEPT_READY");
    assert.equal(second.decision.kind, "TAP_ACCEPT_READY");
    assert.match(second.decision.reason, /retrying accept/i);
    assert.equal(third.decision.kind, "TAP_ACCEPT_READY");
    assert.match(third.decision.reason, /retrying accept/i);
    assert.equal(fourth.decision.kind, "WAIT");
});

test("android foreground progression keeps waiting during in-game transition until live HUD arrives", () => {
    const observation = createObservation({
        state: "IN_GAME_TRANSITION",
        verification: "SYNTHETIC_PLACEHOLDER",
    });

    let current = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    assert.equal(current.decision.kind, "WAIT");

    for (let index = 0; index < 5; index += 1) {
        current = planAndroidForegroundProgress(observation, current.nextState);
    }

    assert.equal(current.decision.kind, "WAIT");
    assert.match(current.decision.reason, /timeout/i);
});

test("android foreground progression reports ready once live HUD is available", () => {
    const result = planAndroidForegroundProgress(
        createObservation({ state: "LIVE_CONTENT" }),
        createInitialAndroidForegroundProgressState()
    );

    assert.equal(result.decision.kind, "READY");
});
