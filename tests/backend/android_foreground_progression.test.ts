import test from "node:test";
import assert from "node:assert/strict";
import {
    createInitialAndroidForegroundProgressState,
    planAndroidForegroundProgress,
} from "../../src-backend/services/AndroidForegroundProgression";

test("android foreground progression waits on BlueStacks boot screens", () => {
    const result = planAndroidForegroundProgress(
        {
            state: "BLUESTACKS_BOOT",
            brightBlueRatio: 0.22,
            blueDominantRatio: 0.25,
            brightWhiteRatio: 0.01,
        },
        createInitialAndroidForegroundProgressState()
    );

    assert.equal(result.decision.kind, "WAIT");
    assert.match(result.decision.reason, /BlueStacks/i);
});

test("android foreground progression waits on unknown non-game windows", () => {
    const result = planAndroidForegroundProgress(
        {
            state: "UNKNOWN",
            brightBlueRatio: 0,
            blueDominantRatio: 0,
            brightWhiteRatio: 0.03,
        },
        createInitialAndroidForegroundProgressState()
    );

    assert.equal(result.decision.kind, "WAIT");
    assert.match(result.decision.reason, /recognized Android game state/i);
});

test("android foreground progression requires a stable frontend before tapping update CTA", () => {
    const classification = {
        state: "TFT_FRONTEND" as const,
        frontendVariant: "UPDATE_READY" as const,
        brightBlueRatio: 0,
        blueDominantRatio: 0,
        brightWhiteRatio: 0.24,
        primaryActionPoint: { x: 0.5, y: 0.545 },
    };

    const first = planAndroidForegroundProgress(
        classification,
        createInitialAndroidForegroundProgressState()
    );
    assert.equal(first.decision.kind, "WAIT");

    const second = planAndroidForegroundProgress(classification, first.nextState);
    assert.equal(second.decision.kind, "TAP_PRIMARY_CTA");
    assert.deepEqual(second.decision.targetPoint, { x: 0.5, y: 0.545 });
});

test("android foreground progression does not spam update taps on repeated identical frames", () => {
    const classification = {
        state: "TFT_FRONTEND" as const,
        frontendVariant: "UPDATE_READY" as const,
        brightBlueRatio: 0,
        blueDominantRatio: 0,
        brightWhiteRatio: 0.24,
        primaryActionPoint: { x: 0.5, y: 0.545 },
    };

    const first = planAndroidForegroundProgress(
        classification,
        createInitialAndroidForegroundProgressState()
    );
    const second = planAndroidForegroundProgress(classification, first.nextState);
    const third = planAndroidForegroundProgress(classification, second.nextState);

    assert.equal(second.decision.kind, "TAP_PRIMARY_CTA");
    assert.equal(third.decision.kind, "WAIT");
    assert.match(third.decision.reason, /awaiting/i);
});

test("android foreground progression blocks login-required frontend screens", () => {
    const result = planAndroidForegroundProgress(
        {
            state: "TFT_FRONTEND",
            frontendVariant: "LOGIN_REQUIRED",
            brightBlueRatio: 0,
            blueDominantRatio: 0,
            brightWhiteRatio: 0.24,
        },
        createInitialAndroidForegroundProgressState()
    );

    assert.equal(result.decision.kind, "BLOCKED");
    assert.match(result.decision.reason, /login/i);
});

test("android foreground progression reports ready once live HUD is available", () => {
    const result = planAndroidForegroundProgress(
        {
            state: "LIVE_CONTENT",
            brightBlueRatio: 0,
            blueDominantRatio: 0,
            brightWhiteRatio: 0.01,
        },
        createInitialAndroidForegroundProgressState()
    );

    assert.equal(result.decision.kind, "READY");
});
