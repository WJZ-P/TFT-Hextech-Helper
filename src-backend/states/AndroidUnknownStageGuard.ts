/** 安卓端：连续识别不到有效阶段的阈值（达到后判定本局已结束） */
export const ANDROID_UNKNOWN_STAGE_THRESHOLD = 40;

/** 安卓端：HUD 连续缺失达到该次数后，才开始累计 UNKNOWN 阶段结束计数 */
export const ANDROID_MISSING_HUD_SIGNAL_GRACE_COUNT = 3;

export interface AndroidUnknownStageProgress {
    unknownStageCount: number;
    missingHudSignalCount: number;
    shouldEndGame: boolean;
}

export function updateAndroidUnknownStageProgress(params: {
    hasValidStage: boolean;
    hasHudSignal: boolean;
    previousUnknownStageCount: number;
    previousMissingHudSignalCount: number;
    unknownStageThreshold?: number;
    missingHudSignalGraceCount?: number;
}): AndroidUnknownStageProgress {
    const unknownStageThreshold = params.unknownStageThreshold ?? ANDROID_UNKNOWN_STAGE_THRESHOLD;
    const missingHudSignalGraceCount = params.missingHudSignalGraceCount ?? ANDROID_MISSING_HUD_SIGNAL_GRACE_COUNT;

    if (params.hasValidStage || params.hasHudSignal) {
        return {
            unknownStageCount: 0,
            missingHudSignalCount: 0,
            shouldEndGame: false,
        };
    }

    const missingHudSignalCount = params.previousMissingHudSignalCount + 1;
    if (missingHudSignalCount < missingHudSignalGraceCount) {
        return {
            unknownStageCount: 0,
            missingHudSignalCount,
            shouldEndGame: false,
        };
    }

    const unknownStageCount = params.previousUnknownStageCount + 1;
    return {
        unknownStageCount,
        missingHudSignalCount,
        shouldEndGame: unknownStageCount >= unknownStageThreshold,
    };
}
