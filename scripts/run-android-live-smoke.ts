import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { mouseController, MouseButtonType, screenCapture } from "../src-backend/tft";
import { analyzeAndroidCaptureSurface, type AndroidCaptureSurfaceDiagnostics } from "../src-backend/utils/AndroidCaptureSurface";
import { classifyAndroidWindowScreenshot, type AndroidWindowClassification } from "../src-backend/utils/AndroidWindowClassifier";
import { windowHelper, type WindowInfo } from "../src-backend/utils/WindowHelper";
import {
    buildAndroidWindowDiagnosticsSummary,
    getEmulatorProcessDiagnostics,
    getInterestingWindowEntries,
    getNativeInterestingEntries,
} from "../src-backend/utils/AndroidWindowDiagnostics";
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

interface ForegroundTraceEntry {
    state: string;
    verification: string;
    decisionKind: string;
    decisionReason: string;
    clickEligible: boolean;
    clicked: boolean;
    blocker: string | null;
    targetPoint: { x: number; y: number } | null;
}

interface CaptureAttemptTraceEntry {
    source: "selected-window" | "selected-window-retry" | "child-window" | "selected-window-print" | "child-window-print";
    targetWindow: WindowInfo;
    surface: AndroidCaptureSurfaceDiagnostics;
}

function buildCaptureFailureSurface(reason: string): AndroidCaptureSurfaceDiagnostics {
    return {
        state: "BLACK_SURFACE",
        meanBrightness: 0,
        darkPixelRatio: 1,
        nonBlackPixelRatio: 0,
        brightPixelRatio: 0,
        lumaStdDev: 0,
        isUniform: true,
        blockerReason: reason,
    };
}

async function tryCaptureWindowContent(
    source: CaptureAttemptTraceEntry["source"],
    targetWindow: WindowInfo,
    capture: () => Promise<Buffer>
): Promise<{ screenshot: Buffer | null; surface: AndroidCaptureSurfaceDiagnostics }> {
    try {
        const screenshot = await capture();
        const surface = await analyzeAndroidCaptureSurface(screenshot);
        return { screenshot, surface };
    } catch (error) {
        const reason = error instanceof Error ? error.stack ?? error.message : String(error);
        return {
            screenshot: null,
            surface: buildCaptureFailureSurface(`[${source}] ${reason}`),
        };
    }
}

function buildCaptureRecoverySummary(
    captureSurface: AndroidCaptureSurfaceDiagnostics,
    captureAttempts: CaptureAttemptTraceEntry[]
) {
    const firstVisibleAttempt = captureAttempts.find((attempt) => attempt.surface.state !== "BLACK_SURFACE") ?? null;
    const attemptedSources = captureAttempts.map((attempt) => attempt.source);
    return {
        finalSurfaceState: captureSurface.state,
        blockerReason: captureSurface.blockerReason,
        attemptedSources,
        recoveredFromBlackSurface: firstVisibleAttempt !== null && captureAttempts[0]?.surface.state === "BLACK_SURFACE",
        firstVisibleSource: firstVisibleAttempt?.source ?? null,
    };
}

function buildVerificationGateSummary(input: {
    captureSurface: AndroidCaptureSurfaceDiagnostics | null;
    foregroundDecision: AndroidForegroundDecision | null;
    classificationState: string | null;
    observeError: string | null;
}) {
    const blockerType = input.captureSurface?.state === "BLACK_SURFACE"
        ? "BLACK_SURFACE"
        : input.captureSurface?.state === "DIM_SURFACE"
            ? "DIM_SURFACE"
            : input.foregroundDecision?.kind === "BLOCKED"
                ? "BLOCKED_STATE"
                : input.observeError
                    ? "STATE_NOT_READY"
                    : null;

    return {
        readyToClassify: input.captureSurface?.state === "VISIBLE_CONTENT",
        readyToClick: input.captureSurface?.state === "VISIBLE_CONTENT" && input.foregroundDecision?.kind !== "BLOCKED",
        blockerType,
        blockerReason:
            input.captureSurface?.blockerReason ??
            (input.foregroundDecision?.kind === "BLOCKED" ? input.foregroundDecision.reason : input.observeError),
        currentState: input.classificationState,
    };
}

async function classifyScreenshotOrUnknown(screenshot: Buffer): Promise<AndroidWindowClassification> {
    if (screenshot.length === 0) {
        return {
            state: "UNKNOWN",
            brightBlueRatio: 0,
            blueDominantRatio: 0,
            brightWhiteRatio: 0,
        };
    }

    return classifyAndroidWindowScreenshot(screenshot);
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

function scoreChildCaptureTarget(parent: { left: number; top: number; width: number; height: number }, child: { left: number; top: number; width: number; height: number; visible?: boolean }): number {
    const overlapLeft = Math.max(parent.left, child.left);
    const overlapTop = Math.max(parent.top, child.top);
    const overlapRight = Math.min(parent.left + parent.width, child.left + child.width);
    const overlapBottom = Math.min(parent.top + parent.height, child.top + child.height);
    const overlapArea = Math.max(0, overlapRight - overlapLeft) * Math.max(0, overlapBottom - overlapTop);
    const childArea = Math.max(1, child.width * child.height);
    const overlapRatio = overlapArea / childArea;
    let score = overlapArea;
    if (child.visible) {
        score += 1_000_000;
    }
    if (overlapRatio > 0.8) {
        score += 500_000;
    }
    return score;
}

async function probeRenderableWindowContent(
    focusWindow: WindowInfo
): Promise<{
    captureWindow: WindowInfo;
    screenshot: Buffer;
    surface: AndroidCaptureSurfaceDiagnostics;
    attempts: CaptureAttemptTraceEntry[];
}> {
    const attempts: CaptureAttemptTraceEntry[] = [];

    const topLevelResult = await tryCaptureWindowContent(
        "selected-window",
        focusWindow,
        () => captureWindowScreenshot(focusWindow)
    );
    attempts.push({
        source: "selected-window",
        targetWindow: focusWindow,
        surface: topLevelResult.surface,
    });
    if (topLevelResult.screenshot && topLevelResult.surface.state !== "BLACK_SURFACE") {
        return {
            captureWindow: focusWindow,
            screenshot: topLevelResult.screenshot,
            surface: topLevelResult.surface,
            attempts,
        };
    }

    await sleep(1200);
    const retryResult = await tryCaptureWindowContent(
        "selected-window-retry",
        focusWindow,
        () => captureWindowScreenshot(focusWindow)
    );
    attempts.push({
        source: "selected-window-retry",
        targetWindow: focusWindow,
        surface: retryResult.surface,
    });
    if (retryResult.screenshot && retryResult.surface.state !== "BLACK_SURFACE") {
        return {
            captureWindow: focusWindow,
            screenshot: retryResult.screenshot,
            surface: retryResult.surface,
            attempts,
        };
    }

    const childWindows = (await windowHelper.getNativeChildWindows(focusWindow))
        .filter((child) => (child.visible ?? true) && child.width >= 300 && child.height >= 200)
        .sort((a, b) => scoreChildCaptureTarget(focusWindow, b) - scoreChildCaptureTarget(focusWindow, a));

    for (const childWindow of childWindows.slice(0, 5)) {
        const childResult = await tryCaptureWindowContent(
            "child-window",
            childWindow,
            () => captureWindowScreenshot(childWindow)
        );
        attempts.push({
            source: "child-window",
            targetWindow: childWindow,
            surface: childResult.surface,
        });
        if (childResult.screenshot && childResult.surface.state !== "BLACK_SURFACE") {
            return {
                captureWindow: childWindow,
                screenshot: childResult.screenshot,
                surface: childResult.surface,
                attempts,
            };
        }
    }

    const nativeTopLevelResult = await tryCaptureWindowContent(
        "selected-window-print",
        focusWindow,
        async () => {
            const screenshot = await windowHelper.captureNativeWindowPng(focusWindow);
            if (!screenshot) {
                throw new Error("PrintWindow top-level capture returned null");
            }
            return screenshot;
        }
    );
    if (nativeTopLevelResult.screenshot) {
        attempts.push({
            source: "selected-window-print",
            targetWindow: focusWindow,
            surface: nativeTopLevelResult.surface,
        });
        if (nativeTopLevelResult.surface.state !== "BLACK_SURFACE") {
            return {
                captureWindow: focusWindow,
                screenshot: nativeTopLevelResult.screenshot,
                surface: nativeTopLevelResult.surface,
                attempts,
            };
        }
    } else {
        attempts.push({
            source: "selected-window-print",
            targetWindow: focusWindow,
            surface: nativeTopLevelResult.surface,
        });
    }

    for (const childWindow of childWindows.slice(0, 5)) {
        const nativeChildResult = await tryCaptureWindowContent(
            "child-window-print",
            childWindow,
            async () => {
                const screenshot = await windowHelper.captureNativeWindowPng(childWindow);
                if (!screenshot) {
                    throw new Error("PrintWindow child capture returned null");
                }
                return screenshot;
            }
        );
        attempts.push({
            source: "child-window-print",
            targetWindow: childWindow,
            surface: nativeChildResult.surface,
        });
        if (nativeChildResult.screenshot && nativeChildResult.surface.state !== "BLACK_SURFACE") {
            return {
                captureWindow: childWindow,
                screenshot: nativeChildResult.screenshot,
                surface: nativeChildResult.surface,
                attempts,
            };
        }
    }

    const fallbackScreenshot = retryResult.screenshot ?? topLevelResult.screenshot ?? Buffer.alloc(0);
    return {
        captureWindow: focusWindow,
        screenshot: fallbackScreenshot,
        surface: retryResult.surface,
        attempts,
    };
}

async function waitForEmulatorContent(
    initialWindow: { title: string; left: number; top: number; width: number; height: number },
    timeoutMs: number
): Promise<{
    screenshot: Buffer;
    classification: AndroidWindowClassification;
    windowInfo: { title: string; left: number; top: number; width: number; height: number };
    foregroundDecision: AndroidForegroundDecision | null;
    foregroundTrace: ForegroundTraceEntry[];
    captureSurface: AndroidCaptureSurfaceDiagnostics;
    captureAttempts: CaptureAttemptTraceEntry[];
}> {
    const startedAt = Date.now();
    let initialProbe = await probeRenderableWindowContent(initialWindow);
    let lastScreenshot = initialProbe.screenshot;
    let lastClassification = await classifyScreenshotOrUnknown(lastScreenshot);
    let lastObservation = normalizeAndroidForegroundObservation(lastClassification);
    let lastWindowInfo = initialProbe.captureWindow;
    let progressState = createInitialAndroidForegroundProgressState();
    let foregroundDecision: AndroidForegroundDecision | null = null;
    const foregroundTrace: ForegroundTraceEntry[] = [];
    let captureSurface = initialProbe.surface;
    let captureAttempts = initialProbe.attempts;

    const isTapDecision = (
        decision: AndroidForegroundDecision
    ): decision is Extract<AndroidForegroundDecision, { targetPoint: { x: number; y: number } }> => {
        return (
            decision.kind === "TAP_PRIMARY_CTA" ||
            decision.kind === "TAP_DISMISS_OVERLAY" ||
            decision.kind === "TAP_START_QUEUE" ||
            decision.kind === "TAP_ACCEPT_READY" ||
            decision.kind === "TAP_CANCEL_QUEUE"
        );
    };

    while (lastObservation.state !== "LIVE_CONTENT" && Date.now() - startedAt < timeoutMs) {
        if (captureSurface.state === "BLACK_SURFACE") {
            foregroundDecision = {
                kind: "WAIT",
                reason: captureSurface.blockerReason ?? "Capture target is black/unrendered",
            };
            foregroundTrace.push({
                state: lastObservation.state,
                verification: lastObservation.verification,
                decisionKind: foregroundDecision.kind,
                decisionReason: foregroundDecision.reason,
                clickEligible: false,
                clicked: false,
                blocker: captureSurface.blockerReason,
                targetPoint: null,
            });
            await sleep(2000);
        } else {
            const progressResult = planAndroidForegroundProgress(lastObservation, progressState);
        progressState = progressResult.nextState;
        const decision = progressResult.decision;
        foregroundDecision = decision;
        const clickEligible = isTapDecision(decision);
        let clicked = false;
        let blocker: string | null = null;

        if (decision.kind === "BLOCKED") {
            blocker = decision.reason;
            foregroundTrace.push({
                state: lastObservation.state,
                verification: lastObservation.verification,
                decisionKind: decision.kind,
                decisionReason: decision.reason,
                clickEligible,
                clicked,
                blocker,
                targetPoint: null,
            });
            break;
        }

        if (clickEligible) {
            await windowHelper.focusWindow(lastWindowInfo);
            mouseController.setGameWindowOrigin(
                { x: lastWindowInfo.left, y: lastWindowInfo.top },
                { width: lastWindowInfo.width, height: lastWindowInfo.height },
                true
            );
            await mouseController.clickAt(decision.targetPoint, MouseButtonType.LEFT);
            clicked = true;
            foregroundTrace.push({
                state: lastObservation.state,
                verification: lastObservation.verification,
                decisionKind: decision.kind,
                decisionReason: decision.reason,
                clickEligible,
                clicked,
                blocker,
                targetPoint: decision.targetPoint,
            });
            await sleep(3000);
        } else {
            foregroundTrace.push({
                state: lastObservation.state,
                verification: lastObservation.verification,
                decisionKind: decision.kind,
                decisionReason: decision.reason,
                clickEligible,
                clicked,
                blocker,
                targetPoint: null,
            });
            await sleep(2000);
        }
        }

        const refreshedWindow = await windowHelper.findLOLWindow(GameClient.ANDROID) ?? lastWindowInfo;
        const probe = await probeRenderableWindowContent(refreshedWindow);
        lastWindowInfo = probe.captureWindow;
        lastScreenshot = probe.screenshot;
        captureSurface = probe.surface;
        captureAttempts = probe.attempts;
        lastClassification = await classifyScreenshotOrUnknown(lastScreenshot);
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
        foregroundTrace,
        captureSurface,
        captureAttempts,
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
        const verificationGate = buildVerificationGateSummary({
            captureSurface: null,
            foregroundDecision: lastStep?.foregroundDecision ?? null,
            classificationState: lastStep?.foregroundObservation.state ?? null,
            observeError: null,
        });
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
            verificationGate,
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
            captureSurface: AndroidCaptureSurfaceDiagnostics;
            contentClassification: AndroidWindowClassification;
            foregroundObservation: AndroidForegroundObservation;
            foregroundDecision: AndroidForegroundDecision;
        }> = [];

        for (const screenshotPath of args.screenshotPaths) {
            const screenshot = await fs.readFile(screenshotPath);
            const captureSurface = await analyzeAndroidCaptureSurface(screenshot);
            const classification = await classifyAndroidWindowScreenshot(screenshot);
            const observation = normalizeAndroidForegroundObservation(classification);
            const progression = planAndroidForegroundProgress(observation, progressState);
            progressState = progression.nextState;
            analysisSequence.push({
                screenshotPath,
                captureSurface,
                contentClassification: classification,
                foregroundObservation: observation,
                foregroundDecision: progression.decision,
            });
        }

        const lastStep = analysisSequence[analysisSequence.length - 1];
        const traceSummary = buildTraceSummary(analysisSequence);
        const verificationGate = buildVerificationGateSummary({
            captureSurface: lastStep?.captureSurface ?? null,
            foregroundDecision: lastStep?.foregroundDecision ?? null,
            classificationState: lastStep?.contentClassification?.state ?? null,
            observeError: null,
        });

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
            captureSurface: lastStep?.captureSurface ?? null,
            verificationGate,
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
        const diagnostics = await windowHelper.diagnoseLOLWindows(GameClient.ANDROID);
        const emulatorProcesses = await getEmulatorProcessDiagnostics();
        const interestingEntries = getInterestingWindowEntries(diagnostics);
        const nativeInterestingEntries = getNativeInterestingEntries(diagnostics);
        const diagnosticsSummary = buildAndroidWindowDiagnosticsSummary(diagnostics, emulatorProcesses);

        process.stdout.write(`${JSON.stringify({
            launchedShortcut: !args.skipLaunch,
            shortcutPath: args.shortcutPath,
            waitSeconds: args.waitSeconds,
            detectedWindow: null,
            focusedWindow: null,
            candidateCount: 0,
            health: null,
            diagnosticsSummary,
            activeWindow: diagnostics.activeWindow,
            interestingEntries,
            nativeInterestingEntries,
            emulatorProcesses,
            screenshotPath: null,
            contentClassification: null,
            foregroundDecision: null,
            foregroundTrace: [],
            observedSummary: null,
            observeError: `在 ${args.waitSeconds} 秒内未检测到安卓模拟器窗口`,
        }, null, 2)}\n`);
        process.exitCode = 1;
        return;
    }

    await windowHelper.focusWindow(detectedWindow);
    await sleep(1500);

    const activeWindow = await windowHelper.findLOLWindow(GameClient.ANDROID) ?? detectedWindow;
    const contentProbe = await waitForEmulatorContent(activeWindow, Math.min(args.waitSeconds * 1000, 90000));
    const screenshotPath = await persistWindowScreenshot(contentProbe.screenshot);
    const captureRecovery = buildCaptureRecoverySummary(contentProbe.captureSurface, contentProbe.captureAttempts);

    const { AndroidEmulatorAdapter } = await import("../src-backend/adapters/AndroidEmulatorAdapter");
    const adapter = new AndroidEmulatorAdapter();
    const health = await adapter.healthCheck();

    let observedSummary: ReturnType<typeof summarizeState> | null = null;
    let observeError: string | null = null;

        if (contentProbe.captureSurface.state === "BLACK_SURFACE") {
        observeError = contentProbe.captureSurface.blockerReason ?? "检测到黑屏/未渲染表面，无法进入前台识别链";
        process.exitCode = 1;
    } else if (contentProbe.captureSurface.state === "DIM_SURFACE") {
        observeError = contentProbe.captureSurface.blockerReason ?? "检测到异常偏暗表面，当前渲染内容不稳定";
        process.exitCode = 1;
    } else if (contentProbe.classification.state !== "LIVE_CONTENT") {
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

    const verificationGate = buildVerificationGateSummary({
        captureSurface: contentProbe.captureSurface,
        foregroundDecision: contentProbe.foregroundDecision,
        classificationState: contentProbe.classification.state,
        observeError,
    });

    process.stdout.write(`${JSON.stringify({
        launchedShortcut: !args.skipLaunch,
        shortcutPath: args.shortcutPath,
        waitSeconds: args.waitSeconds,
        detectedWindow,
        focusedWindow: contentProbe.windowInfo,
        candidateCount: candidates.length,
        health,
        screenshotPath,
        verificationGate,
        captureRecovery,
        contentClassification: contentProbe.classification,
        foregroundDecision: contentProbe.foregroundDecision,
        foregroundTrace: contentProbe.foregroundTrace,
        captureSurface: contentProbe.captureSurface,
        captureAttempts: contentProbe.captureAttempts,
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
