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

test("android foreground progression requires a stable frontend before tapping update CTA", () => {
    const observation = createObservation({
        state: "UPDATE_READY",
        actionPoints: { PRIMARY_CTA: { x: 0.5, y: 0.545 } },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    assert.equal(first.decision.kind, "WAIT");

    const second = planAndroidForegroundProgress(observation, first.nextState);
    assert.equal(second.decision.kind, "TAP_PRIMARY_CTA");
    assert.deepEqual(second.decision.targetPoint, { x: 0.5, y: 0.545 });
});

test("android foreground progression does not spam update taps on repeated identical frames", () => {
    const observation = createObservation({
        state: "UPDATE_READY",
        actionPoints: { PRIMARY_CTA: { x: 0.5, y: 0.545 } },
    });

    const first = planAndroidForegroundProgress(observation, createInitialAndroidForegroundProgressState());
    const second = planAndroidForegroundProgress(observation, first.nextState);
    const third = planAndroidForegroundProgress(observation, second.nextState);

    assert.equal(second.decision.kind, "TAP_PRIMARY_CTA");
    assert.equal(third.decision.kind, "WAIT");
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

test("android foreground progression retries queue via synthetic cancel action after timeout", () => {
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

    assert.equal(timeoutDecision.decision.kind, "TAP_CANCEL_QUEUE");
    assert.match(timeoutDecision.decision.reason, /timeout/i);
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
