import { analyzeAndroidCaptureSurface } from "../src-backend/utils/AndroidCaptureSurface";
import { classifyAndroidWindowScreenshot } from "../src-backend/utils/AndroidWindowClassifier";
import { windowHelper } from "../src-backend/utils/WindowHelper";
import { GameClient, GameRegion, settingsStore } from "../src-backend/utils/SettingsStore";
import { androidAdbCapture } from "../src-backend/services/AndroidAdbCapture";
import {
    androidInputController,
    resolveAndroidRelativeTapTarget,
} from "../src-backend/services/AndroidInputController";
import { normalizeAndroidForegroundObservation } from "../src-backend/services/AndroidForegroundProtocol";
import {
    createInitialAndroidForegroundProgressState,
    planAndroidForegroundProgress,
} from "../src-backend/services/AndroidForegroundProgression";

interface CliArgs {
    tapDecision: boolean;
}

function parseArgs(argv: string[]): CliArgs {
    return {
        tapDecision: argv.includes("--tap-start") || argv.includes("--tap-decision"),
    };
}

function getDecisionTargetPoint(
    decision: ReturnType<typeof planAndroidForegroundProgress>["decision"]
): { x: number; y: number } | null {
    return "targetPoint" in decision ? decision.targetPoint : null;
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    settingsStore.setMultiple({
        gameClient: GameClient.ANDROID,
        gameRegion: GameRegion.NA,
    });

    const screenshot = await androidAdbCapture.capturePng();
    const frameSize = await androidAdbCapture.getFrameSize();
    const windowInfo = await windowHelper.findLOLWindow(GameClient.ANDROID);

    if (!screenshot || !windowInfo) {
        console.log(JSON.stringify({
            ok: false,
            reason: !screenshot ? "ADB screencap unavailable" : "Android emulator window unavailable",
            frameSize,
            windowInfo,
        }, null, 2));
        return;
    }

    const surface = await analyzeAndroidCaptureSurface(screenshot);
    const classification = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(classification);
    const progression = planAndroidForegroundProgress(
        observation,
        createInitialAndroidForegroundProgressState()
    );
    const decisionTargetPoint = getDecisionTargetPoint(progression.decision);
    const target = decisionTargetPoint
        ? resolveAndroidRelativeTapTarget(decisionTargetPoint, windowInfo, frameSize)
        : null;

    const tapResult = args.tapDecision && decisionTargetPoint
        ? await androidInputController.tapRelative(decisionTargetPoint, windowInfo)
        : null;

    console.log(JSON.stringify({
        ok: true,
        frameSize,
        windowInfo,
        surface,
        classification: {
            state: classification.state,
            frontendVariant: classification.frontendVariant ?? null,
            lobbyVariant: classification.lobbyVariant ?? null,
            startQueuePoint: classification.startQueuePoint ?? null,
        },
        observation: {
            state: observation.state,
            verification: observation.verification,
            actionPoints: observation.actionPoints ?? {},
        },
        foregroundDecision: progression.decision,
        target,
        tapResult,
        envOverrideKeys: [
            "TFT_ANDROID_CONTENT_LEFT",
            "TFT_ANDROID_CONTENT_TOP",
            "TFT_ANDROID_CONTENT_WIDTH",
            "TFT_ANDROID_CONTENT_HEIGHT",
        ],
    }, null, 2));
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
});
