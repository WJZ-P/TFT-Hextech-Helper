import test from "node:test";
import assert from "node:assert/strict";
import { updateAndroidUnknownStageProgress } from "../../src-backend/states/AndroidUnknownStageGuard";

test("android unknown-stage guard resets immediately when a valid stage is seen", () => {
    const result = updateAndroidUnknownStageProgress({
        hasValidStage: true,
        hasHudSignal: false,
        previousUnknownStageCount: 11,
        previousMissingHudSignalCount: 2,
    });

    assert.deepEqual(result, {
        unknownStageCount: 0,
        missingHudSignalCount: 0,
        shouldEndGame: false,
    });
});

test("android unknown-stage guard resets immediately when HUD signal is still readable", () => {
    const result = updateAndroidUnknownStageProgress({
        hasValidStage: false,
        hasHudSignal: true,
        previousUnknownStageCount: 11,
        previousMissingHudSignalCount: 2,
    });

    assert.deepEqual(result, {
        unknownStageCount: 0,
        missingHudSignalCount: 0,
        shouldEndGame: false,
    });
});

test("android unknown-stage guard ignores a short burst of missing HUD signals", () => {
    let progress = updateAndroidUnknownStageProgress({
        hasValidStage: false,
        hasHudSignal: false,
        previousUnknownStageCount: 0,
        previousMissingHudSignalCount: 0,
        missingHudSignalGraceCount: 3,
        unknownStageThreshold: 5,
    });
    assert.deepEqual(progress, {
        unknownStageCount: 0,
        missingHudSignalCount: 1,
        shouldEndGame: false,
    });

    progress = updateAndroidUnknownStageProgress({
        hasValidStage: false,
        hasHudSignal: false,
        previousUnknownStageCount: progress.unknownStageCount,
        previousMissingHudSignalCount: progress.missingHudSignalCount,
        missingHudSignalGraceCount: 3,
        unknownStageThreshold: 5,
    });
    assert.deepEqual(progress, {
        unknownStageCount: 0,
        missingHudSignalCount: 2,
        shouldEndGame: false,
    });
});

test("android unknown-stage guard only ends after sustained missing HUD and sustained unknown stage", () => {
    let progress = {
        unknownStageCount: 0,
        missingHudSignalCount: 0,
        shouldEndGame: false,
    };

    for (let index = 0; index < 4; index += 1) {
        progress = updateAndroidUnknownStageProgress({
            hasValidStage: false,
            hasHudSignal: false,
            previousUnknownStageCount: progress.unknownStageCount,
            previousMissingHudSignalCount: progress.missingHudSignalCount,
            missingHudSignalGraceCount: 3,
            unknownStageThreshold: 2,
        });
    }

    assert.deepEqual(progress, {
        unknownStageCount: 2,
        missingHudSignalCount: 4,
        shouldEndGame: true,
    });
});
