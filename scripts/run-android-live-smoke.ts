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
import {
    createAndroidForegroundObservationFromFixture,
    normalizeAndroidForegroundObservation,
    type AndroidForegroundFixtureDocument,
    type AndroidForegroundFixtureObservationInput,
    type AndroidForegroundObservation,
} from "../src-backend/services/AndroidForegroundProtocol";

const execFileAsync = promisify(execFile);
const DEFAULT_SHORTCUT_PATH = "C:\\Users\\ASUS\\Desktop\\TFT.lnk";

interface CliArgs {
    shortcutPath: string;
    skipLaunch: boolean;
    waitSeconds: number;
    screenshotPaths: string[];
    fixturePath: string | null;
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        shortcutPath: DEFAULT_SHORTCUT_PATH,
        skipLaunch: false,
        waitSeconds: 45,
        screenshotPaths: [],
        fixturePath: null,
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
            continue;
        }

        if (token === "--fixture" && argv[index + 1]) {
            args.fixturePath = path.resolve(argv[index + 1]);
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
    let lastObservation = normalizeAndroidForegroundObservation(lastClassification);
    let lastWindowInfo = initialWindow;
    let progressState = createInitialAndroidForegroundProgressState();
    let foregroundDecision: AndroidForegroundDecision | null = null;

    while (lastObservation.state !== "LIVE_CONTENT" && Date.now() - startedAt < timeoutMs) {
        const progressResult = planAndroidForegroundProgress(lastObservation, progressState);
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
        lastObservation = normalizeAndroidForegroundObservation(lastClassification);
    }

    if (lastObservation.state === "LIVE_CONTENT") {
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

async function buildObservationFromFixtureFrame(
    fixturePath: string,
    frame: AndroidForegroundFixtureDocument["frames"][number]
): Promise<{
    screenshotPath: string | null;
    observation: AndroidForegroundObservation;
    expectedObservation: AndroidForegroundObservation | null;
}> {
    const expectedObservation = frame.expectedObservation
        ? createAndroidForegroundObservationFromFixture(frame.expectedObservation)
        : null;

    if (frame.screenshotPath) {
        const screenshotPath = path.resolve(path.dirname(fixturePath), frame.screenshotPath);
        const screenshot = await fs.readFile(screenshotPath);
        const classification = await classifyAndroidWindowScreenshot(screenshot);
        return {
            screenshotPath,
            observation: normalizeAndroidForegroundObservation(classification),
            expectedObservation,
        };
    }

    if (frame.observation) {
        return {
            screenshotPath: null,
            observation: createAndroidForegroundObservationFromFixture(frame.observation),
            expectedObservation,
        };
    }

    throw new Error(`前台 fixture 帧缺少 screenshotPath 或 observation: ${frame.id}`);
}

function buildTraceSummary(
    analysisSequence: Array<{
        foregroundObservation: AndroidForegroundObservation;
        foregroundDecision: AndroidForegroundDecision;
    }>
) {
    const verificationCounts: Record<string, number> = {};
    const stateCounts: Record<string, number> = {};
    let stateTransitionCount = 0;
    let decisionTransitionCount = 0;

    for (let index = 0; index < analysisSequence.length; index += 1) {
        const entry = analysisSequence[index];
        verificationCounts[entry.foregroundObservation.verification] =
            (verificationCounts[entry.foregroundObservation.verification] ?? 0) + 1;
        stateCounts[entry.foregroundObservation.state] = (stateCounts[entry.foregroundObservation.state] ?? 0) + 1;

        if (index === 0) {
            continue;
        }

        const previous = analysisSequence[index - 1];
        if (previous?.foregroundObservation.state !== entry.foregroundObservation.state) {
            stateTransitionCount += 1;
        }
        if (previous?.foregroundDecision.kind !== entry.foregroundDecision.kind) {
            decisionTransitionCount += 1;
        }
    }

    return {
        frameCount: analysisSequence.length,
        verificationCounts,
        stateCounts,
        stateTransitionCount,
        decisionTransitionCount,
    };
}

async function main(): Promise<void> {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const args = parseArgs(process.argv.slice(2));

    if (args.fixturePath) {
        const fixture = JSON.parse(await fs.readFile(args.fixturePath, "utf8")) as AndroidForegroundFixtureDocument;
        if (fixture.schemaVersion !== "android-foreground-fixture.v1") {
            throw new Error(`不支持的前台 fixture schemaVersion: ${String((fixture as { schemaVersion?: string }).schemaVersion)}`);
        }

        let progressState = createInitialAndroidForegroundProgressState();
        const analysisSequence: Array<{
            frameId: string;
            frameLabel: string;
            screenshotPath: string | null;
            foregroundObservation: AndroidForegroundObservation;
            expectedObservation: AndroidForegroundObservation | null;
            foregroundDecision: AndroidForegroundDecision;
            expectedDecisionKind: string | null;
            expectedDecisionMatched: boolean | null;
            expectedStateMatched: boolean | null;
        }> = [];

        for (const frame of fixture.frames) {
            const { screenshotPath, observation, expectedObservation } = await buildObservationFromFixtureFrame(args.fixturePath, frame);
            const progression = planAndroidForegroundProgress(observation, progressState);
            progressState = progression.nextState;
            analysisSequence.push({
                frameId: frame.id,
                frameLabel: frame.label,
                screenshotPath,
                foregroundObservation: observation,
                expectedObservation,
                foregroundDecision: progression.decision,
                expectedDecisionKind: frame.expectedDecisionKind ?? null,
                expectedDecisionMatched: frame.expectedDecisionKind
                    ? progression.decision.kind === frame.expectedDecisionKind
                    : null,
                expectedStateMatched: expectedObservation ? expectedObservation.state === observation.state : null,
            });
        }

        const lastStep = analysisSequence[analysisSequence.length - 1];
        const allExpectedMatched = analysisSequence.every(
            (entry) => entry.expectedDecisionMatched !== false && entry.expectedStateMatched !== false
        );
        const traceSummary = buildTraceSummary(analysisSequence);
        if (!allExpectedMatched) {
            process.exitCode = 1;
        }
        process.stdout.write(`${JSON.stringify({
            launchedShortcut: false,
            shortcutPath: args.shortcutPath,
            waitSeconds: args.waitSeconds,
            detectedWindow: null,
            focusedWindow: null,
            candidateCount: 0,
            health: null,
            fixturePath: args.fixturePath,
            fixtureId: fixture.id,
            fixtureLabel: fixture.label,
            screenshotPath: lastStep?.screenshotPath ?? null,
            screenshotPaths: analysisSequence.map((entry) => entry.screenshotPath).filter(Boolean),
            contentClassification: lastStep?.foregroundObservation.rawClassification ?? null,
            foregroundObservation: lastStep?.foregroundObservation ?? null,
            expectedObservation: lastStep?.expectedObservation ?? null,
            foregroundDecision: lastStep?.foregroundDecision ?? null,
            analysisSequence,
            allExpectedMatched,
            traceSummary,
            observedSummary: null,
            observeError: null,
        }, null, 2)}\n`);
        return;
    }

    if (args.screenshotPaths.length > 0) {
        let progressState = createInitialAndroidForegroundProgressState();
        const analysisSequence: Array<{
            screenshotPath: string;
            contentClassification: AndroidWindowClassification;
            foregroundObservation: AndroidForegroundObservation;
            foregroundDecision: AndroidForegroundDecision;
        }> = [];

        for (const screenshotPath of args.screenshotPaths) {
            const screenshot = await fs.readFile(screenshotPath);
            const classification = await classifyAndroidWindowScreenshot(screenshot);
            const observation = normalizeAndroidForegroundObservation(classification);
            const progression = planAndroidForegroundProgress(observation, progressState);
            progressState = progression.nextState;
            analysisSequence.push({
                screenshotPath,
                contentClassification: classification,
                foregroundObservation: observation,
                foregroundDecision: progression.decision,
            });
        }

        const lastStep = analysisSequence[analysisSequence.length - 1];
        const traceSummary = buildTraceSummary(analysisSequence);

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
            foregroundObservation: lastStep?.foregroundObservation ?? null,
            foregroundDecision: lastStep?.foregroundDecision ?? null,
            analysisSequence,
            traceSummary,
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
