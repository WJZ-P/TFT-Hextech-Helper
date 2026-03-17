import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { mouseController, MouseButtonType, screenCapture } from "../src-backend/tft";
import { classifyAndroidWindowScreenshot, type AndroidWindowClassification } from "../src-backend/utils/AndroidWindowClassifier";
import { windowHelper } from "../src-backend/utils/WindowHelper";
import { GameClient, GameRegion, settingsStore } from "../src-backend/utils/SettingsStore";
import type { ObservedState } from "../src-backend/core/types";
import {
    createInitialAndroidForegroundProgressState,
    planAndroidForegroundProgress,
    type AndroidForegroundDecision,
} from "../src-backend/services/AndroidForegroundProgression";

const execFileAsync = promisify(execFile);
const DEFAULT_SHORTCUT_PATH = "C:\\Users\\ASUS\\Desktop\\TFT.lnk";

interface CliArgs {
    shortcutPath: string;
    skipLaunch: boolean;
    waitSeconds: number;
    screenshotPaths: string[];
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        shortcutPath: DEFAULT_SHORTCUT_PATH,
        skipLaunch: false,
        waitSeconds: 45,
        screenshotPaths: [],
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--shortcut" && argv[index + 1]) {
            args.shortcutPath = path.resolve(argv[index + 1]);
            index += 1;
            continue;
        }

        if (token === "--skip-launch") {
            args.skipLaunch = true;
            continue;
        }

        if (token === "--wait-seconds" && argv[index + 1]) {
            const parsed = Number(argv[index + 1]);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.waitSeconds = Math.trunc(parsed);
            }
            index += 1;
            continue;
        }

        if (token === "--screenshot" && argv[index + 1]) {
            args.screenshotPaths.push(path.resolve(argv[index + 1]));
            index += 1;
        }
    }

    return args;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchShortcut(shortcutPath: string): Promise<void> {
    await execFileAsync("powershell.exe", [
        "-NoProfile",
        "-Command",
        `Start-Process -FilePath '${shortcutPath.replace(/'/g, "''")}'`,
    ]);
}

async function waitForAndroidWindow(timeoutMs: number) {
    const startedAt = Date.now();
    let candidates = await windowHelper.findLOLWindows(GameClient.ANDROID);

    while (Date.now() - startedAt < timeoutMs) {
        if (candidates.length > 0) {
            return candidates;
        }

        await sleep(2000);
        candidates = await windowHelper.findLOLWindows(GameClient.ANDROID);
    }

    return candidates;
}

function summarizeState(state: ObservedState) {
    return {
        stageText: state.stageText,
        stageType: state.stageType,
        level: state.level,
        currentXp: state.currentXp,
        totalXp: state.totalXp,
        gold: state.gold,
        hp: state.hp ?? null,
        shopCount: state.shop.filter((entry) => entry.unit !== null).length,
        benchCount: state.bench.filter(Boolean).length,
        boardCount: state.board.filter(Boolean).length,
        itemCount: state.items.length,
        activeTraits: state.activeTraits?.map((trait) => ({
            name: trait.name,
            count: trait.count,
            active: trait.active,
        })) ?? [],
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
    const outputPath = path.join(outputDir, `android-live-smoke-${Date.now()}.png`);
    await fs.writeFile(outputPath, screenshot);
    return outputPath;
}

async function waitForEmulatorContent(
    initialWindow: { title: string; left: number; top: number; width: number; height: number },
    timeoutMs: number
): Promise<{
    screenshot: Buffer;
    classification: AndroidWindowClassification;
    windowInfo: { title: string; left: number; top: number; width: number; height: number };
    foregroundDecision: AndroidForegroundDecision | null;
}> {
    const startedAt = Date.now();
    let lastScreenshot = await captureWindowScreenshot(initialWindow);
    let lastClassification = await classifyAndroidWindowScreenshot(lastScreenshot);
    let lastWindowInfo = initialWindow;
    let progressState = createInitialAndroidForegroundProgressState();
    let foregroundDecision: AndroidForegroundDecision | null = null;

    while (lastClassification.state !== "LIVE_CONTENT" && Date.now() - startedAt < timeoutMs) {
        const progressResult = planAndroidForegroundProgress(lastClassification, progressState);
        progressState = progressResult.nextState;
        foregroundDecision = progressResult.decision;

        if (progressResult.decision.kind === "BLOCKED") {
            break;
        }

        if (progressResult.decision.kind === "TAP_PRIMARY_CTA") {
            await windowHelper.focusWindow(lastWindowInfo);
            mouseController.setGameWindowOrigin(
                { x: lastWindowInfo.left, y: lastWindowInfo.top },
                { width: lastWindowInfo.width, height: lastWindowInfo.height },
                true
            );
            await mouseController.clickAt(progressResult.decision.targetPoint, MouseButtonType.LEFT);
            await sleep(3000);
        } else {
            await sleep(2000);
        }

        const refreshedWindow = await windowHelper.findLOLWindow(GameClient.ANDROID) ?? lastWindowInfo;
        lastWindowInfo = refreshedWindow;
        lastScreenshot = await captureWindowScreenshot(refreshedWindow);
        lastClassification = await classifyAndroidWindowScreenshot(lastScreenshot);
    }

    if (lastClassification.state === "LIVE_CONTENT") {
        foregroundDecision = {
            kind: "READY",
            reason: "Live HUD detected",
        };
    }

    return {
        screenshot: lastScreenshot,
        classification: lastClassification,
        windowInfo: lastWindowInfo,
        foregroundDecision,
    };
}

async function main(): Promise<void> {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const args = parseArgs(process.argv.slice(2));

    if (args.screenshotPaths.length > 0) {
        let progressState = createInitialAndroidForegroundProgressState();
        const analysisSequence: Array<{
            screenshotPath: string;
            contentClassification: AndroidWindowClassification;
            foregroundDecision: AndroidForegroundDecision;
        }> = [];

        for (const screenshotPath of args.screenshotPaths) {
            const screenshot = await fs.readFile(screenshotPath);
            const classification = await classifyAndroidWindowScreenshot(screenshot);
            const progression = planAndroidForegroundProgress(classification, progressState);
            progressState = progression.nextState;
            analysisSequence.push({
                screenshotPath,
                contentClassification: classification,
                foregroundDecision: progression.decision,
            });
        }

        const lastStep = analysisSequence[analysisSequence.length - 1];

        process.stdout.write(`${JSON.stringify({
            launchedShortcut: false,
            shortcutPath: args.shortcutPath,
            waitSeconds: args.waitSeconds,
            detectedWindow: null,
            focusedWindow: null,
            candidateCount: 0,
            health: null,
            screenshotPath: lastStep?.screenshotPath ?? null,
            screenshotPaths: args.screenshotPaths,
            contentClassification: lastStep?.contentClassification ?? null,
            foregroundDecision: lastStep?.foregroundDecision ?? null,
            analysisSequence,
            observedSummary: null,
            observeError: null,
        }, null, 2)}\n`);
        return;
    }

    settingsStore.setMultiple({
        gameClient: GameClient.ANDROID,
        gameRegion: GameRegion.NA,
    });

    if (!args.skipLaunch) {
        await launchShortcut(args.shortcutPath);
    }

    const candidates = await waitForAndroidWindow(args.waitSeconds * 1000);
    const detectedWindow = candidates[0] ?? null;

    if (!detectedWindow) {
        throw new Error(`在 ${args.waitSeconds} 秒内未检测到安卓模拟器窗口`);
    }

    await windowHelper.focusWindow(detectedWindow);
    await sleep(1500);

    const activeWindow = await windowHelper.findLOLWindow(GameClient.ANDROID) ?? detectedWindow;
    const contentProbe = await waitForEmulatorContent(activeWindow, Math.min(args.waitSeconds * 1000, 90000));
    const screenshotPath = await persistWindowScreenshot(contentProbe.screenshot);

    const { AndroidEmulatorAdapter } = await import("../src-backend/adapters/AndroidEmulatorAdapter");
    const adapter = new AndroidEmulatorAdapter();
    const health = await adapter.healthCheck();

    let observedSummary: ReturnType<typeof summarizeState> | null = null;
    let observeError: string | null = null;

        if (contentProbe.classification.state !== "LIVE_CONTENT") {
        observeError =
            contentProbe.foregroundDecision?.kind === "BLOCKED"
                ? contentProbe.foregroundDecision.reason
                : contentProbe.classification.state === "BLUESTACKS_BOOT"
                    ? "模拟器仍停留在 BlueStacks 启动页，尚未进入 TFT 内容界面"
                    : contentProbe.classification.state === "UNKNOWN"
                        ? "检测到的窗口内容不符合安卓 TFT 已知前台或局内 HUD 特征"
                    : "模拟器已进入 TFT 前台界面，但还未进入可读 HUD 的对局画面";
        process.exitCode = 1;
    } else {
        try {
            const state = await adapter.observe();
            observedSummary = summarizeState(state);
        } catch (error) {
            observeError = error instanceof Error ? error.stack ?? error.message : String(error);
            process.exitCode = 1;
        }
    }

    process.stdout.write(`${JSON.stringify({
        launchedShortcut: !args.skipLaunch,
        shortcutPath: args.shortcutPath,
        waitSeconds: args.waitSeconds,
        detectedWindow,
        focusedWindow: contentProbe.windowInfo,
        candidateCount: candidates.length,
        health,
        screenshotPath,
        contentClassification: contentProbe.classification,
        foregroundDecision: contentProbe.foregroundDecision,
        observedSummary,
        observeError,
    }, null, 2)}\n`);
}

main()
    .then(() => {
        setImmediate(() => process.exit(process.exitCode ?? 0));
    })
    .catch((error) => {
        process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
        process.exitCode = 1;
        setImmediate(() => process.exit(1));
    });
