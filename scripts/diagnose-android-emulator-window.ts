import fs from "node:fs/promises";
import path from "node:path";
import { screenCapture } from "../src-backend/tft";
import { classifyAndroidWindowScreenshot, type AndroidWindowClassification } from "../src-backend/utils/AndroidWindowClassifier";
import { windowHelper } from "../src-backend/utils/WindowHelper";
import {
    buildAndroidWindowDiagnosticsSummary,
    getEmulatorProcessDiagnostics,
    getInterestingWindowEntries,
    getNativeInterestingEntries,
} from "../src-backend/utils/AndroidWindowDiagnostics";
import { GameClient, GameRegion, settingsStore } from "../src-backend/utils/SettingsStore";
import {
    createInitialAndroidForegroundProgressState,
    planAndroidForegroundProgress,
    type AndroidForegroundDecision,
} from "../src-backend/services/AndroidForegroundProgression";
import { normalizeAndroidForegroundObservation, type AndroidForegroundObservation } from "../src-backend/services/AndroidForegroundProtocol";

interface CliArgs {
    captureTopCandidate: boolean;
}

function parseArgs(argv: string[]): CliArgs {
    return {
        captureTopCandidate: !argv.includes("--no-capture"),
    };
}

async function captureWindowScreenshot(windowInfo: { left: number; top: number; width: number; height: number }): Promise<Buffer> {
    screenCapture.setGameWindowOrigin(
        { x: windowInfo.left, y: windowInfo.top },
        { width: windowInfo.width, height: windowInfo.height },
        true
    );

    return screenCapture.captureGameRegionAsPng({
        leftTop: { x: 0, y: 0 },
        rightBottom: { x: 1, y: 1 },
    }, false);
}

async function persistWindowScreenshot(screenshot: Buffer): Promise<string> {
    const outputDir = path.resolve(process.cwd(), "examples", "recordings", "smoke");
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, `android-window-diagnose-${Date.now()}.png`);
    await fs.writeFile(outputPath, screenshot);
    return outputPath;
}

async function main(): Promise<void> {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");
    settingsStore.setMultiple({
        gameClient: GameClient.ANDROID,
        gameRegion: GameRegion.NA,
    });

    const args = parseArgs(process.argv.slice(2));
    const diagnostics = await windowHelper.diagnoseLOLWindows(GameClient.ANDROID);
    const emulatorProcesses = await getEmulatorProcessDiagnostics();
    const nativeInterestingEntries = getNativeInterestingEntries(diagnostics);
    const interestingEntries = getInterestingWindowEntries(diagnostics);
    const summary = buildAndroidWindowDiagnosticsSummary(diagnostics, emulatorProcesses);

    let topCandidateCapturePath: string | null = null;
    let topCandidateClassification: AndroidWindowClassification | null = null;
    let topCandidateObservation: AndroidForegroundObservation | null = null;
    let topCandidateDecision: AndroidForegroundDecision | null = null;

    if (args.captureTopCandidate && diagnostics.selected) {
        try {
            await windowHelper.focusWindow(diagnostics.selected);
            const screenshot = await captureWindowScreenshot(diagnostics.selected);
            topCandidateCapturePath = await persistWindowScreenshot(screenshot);
            topCandidateClassification = await classifyAndroidWindowScreenshot(screenshot);
            topCandidateObservation = normalizeAndroidForegroundObservation(topCandidateClassification);
            topCandidateDecision = planAndroidForegroundProgress(
                topCandidateObservation,
                createInitialAndroidForegroundProgressState()
            ).decision;
        } catch (error) {
            topCandidateDecision = {
                kind: "WAIT",
                reason: error instanceof Error ? error.stack ?? error.message : String(error),
            };
        }
    }

    process.stdout.write(`${JSON.stringify({
        summary,
        activeWindow: diagnostics.activeWindow,
        selected: diagnostics.selected,
        usedWeakFallback: diagnostics.usedWeakFallback,
        interestingEntries,
        nativeInterestingEntries,
        emulatorProcesses,
        topCandidateCapturePath,
        topCandidateClassification,
        topCandidateObservation,
        topCandidateDecision,
    }, null, 2)}\n`);

    if (!diagnostics.selected) {
        process.exitCode = 1;
    }
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
});
