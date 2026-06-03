import fs from "fs/promises";
import path from "path";
import type { ActionPlan, AdapterHealth, GameAdapter, ObservedState, PlatformTarget } from "../src-backend/core/types";
import { androidAdbCapture } from "../src-backend/services/AndroidAdbCapture";
import {
    createInitialAndroidForegroundProgressState,
    planAndroidForegroundProgress,
    type AndroidForegroundDecision,
    type AndroidForegroundProgressState,
} from "../src-backend/services/AndroidForegroundProgression";
import { normalizeAndroidForegroundObservation } from "../src-backend/services/AndroidForegroundProtocol";
import { classifyAndroidWindowScreenshot } from "../src-backend/utils/AndroidWindowClassifier";

process.env.TFT_LOG_STDERR = "1";

interface CliArgs {
    statePath: string | null;
    ticks: number;
    dryRun: boolean;
    safeObserve: boolean | null;
    intervalMs: number;
    operationTimeoutMs: number;
    snapshotDir: string | null;
    snapshotEveryTicks: number;
}

class FixtureAndroidAdapter implements GameAdapter {
    public readonly target: PlatformTarget = "ANDROID_EMULATOR";
    public executeCalls: ActionPlan[][] = [];
    private observeIndex = 0;

    constructor(private readonly states: ObservedState[]) {}

    async attach(): Promise<void> {}

    async observe(): Promise<ObservedState> {
        const state = this.states[Math.min(this.observeIndex, this.states.length - 1)];
        this.observeIndex += 1;
        return state;
    }

    async execute(actions: ActionPlan[]): Promise<void> {
        this.executeCalls.push(actions);
    }

    async healthCheck(): Promise<AdapterHealth> {
        return { ok: true, detail: "fixture" };
    }
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        statePath: null,
        ticks: 1,
        dryRun: true,
        safeObserve: null,
        intervalMs: 1000,
        operationTimeoutMs: 60000,
        snapshotDir: null,
        snapshotEveryTicks: 90,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--state" && argv[index + 1]) {
            args.statePath = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
            continue;
        }
        if (token === "--ticks" && argv[index + 1]) {
            const parsed = Number(argv[index + 1]);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.ticks = Math.trunc(parsed);
            }
            index += 1;
            continue;
        }
        if (token === "--interval-ms" && argv[index + 1]) {
            const parsed = Number(argv[index + 1]);
            if (Number.isFinite(parsed) && parsed >= 0) {
                args.intervalMs = Math.trunc(parsed);
            }
            index += 1;
            continue;
        }
        if (token === "--operation-timeout-ms" && argv[index + 1]) {
            const parsed = Number(argv[index + 1]);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.operationTimeoutMs = Math.trunc(parsed);
            }
            index += 1;
            continue;
        }
        if (token === "--live") {
            args.dryRun = false;
            continue;
        }
        if (token === "--dry-run") {
            args.dryRun = true;
            continue;
        }
        if (token === "--safe-observe") {
            args.safeObserve = true;
            continue;
        }
        if (token === "--full-observe") {
            args.safeObserve = false;
            continue;
        }
        if (token === "--snapshot-dir" && argv[index + 1]) {
            args.snapshotDir = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
            continue;
        }
        if (token === "--snapshot-every-ticks" && argv[index + 1]) {
            const parsed = Number(argv[index + 1]);
            if (Number.isFinite(parsed) && parsed > 0) {
                args.snapshotEveryTicks = Math.trunc(parsed);
            }
            index += 1;
        }
    }

    return args;
}

function safeFileToken(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "state";
}

function extractForegroundState(reason: string): string | null {
    const match = reason.match(/foreground is not live content \(([^)]+)\)/);
    return match?.[1] ?? null;
}

function isForegroundSkip(reason: string): reason is string {
    return reason.includes("Android foreground is not live content (");
}

function isSafeForegroundTapDecision(
    decision: AndroidForegroundDecision
): decision is AndroidForegroundDecision & { targetPoint: { x: number; y: number } } {
    return (
        decision.kind === "TAP_PRIMARY_CTA" ||
        decision.kind === "TAP_DISMISS_OVERLAY" ||
        decision.kind === "TAP_SELECT_GAME_MODE" ||
        decision.kind === "TAP_CONFIRM_MODAL" ||
        decision.kind === "TAP_START_QUEUE" ||
        decision.kind === "TAP_ACCEPT_READY" ||
        decision.kind === "TAP_GAME_OVER_EXIT"
    );
}

function isQueueFastPollTapDecision(
    decision: AndroidForegroundDecision
): decision is AndroidForegroundDecision & { targetPoint: { x: number; y: number } } {
    return decision.kind === "TAP_ACCEPT_READY" || decision.kind === "TAP_CONFIRM_MODAL";
}

function shouldStopAfterPausedResult(reason: string): boolean {
    return reason.includes("timed out after") || reason.includes("previous timed-out adapter operation");
}

async function persistForegroundSnapshot(
    snapshotDir: string,
    tick: number,
    reason: string
): Promise<string> {
    const screenshot = await androidAdbCapture.capturePng();
    if (!screenshot) {
        return "none";
    }

    await fs.mkdir(snapshotDir, { recursive: true });
    const state = safeFileToken(extractForegroundState(reason) ?? "unknown");
    const fileName = `tick-${String(tick).padStart(5, "0")}-${state}.png`;
    const outputPath = path.join(snapshotDir, fileName);
    await fs.writeFile(outputPath, screenshot);

    let classification = "unclassified";
    try {
        const result = await classifyAndroidWindowScreenshot(screenshot);
        classification = `${result.state}`;
    } catch {
        classification = "classify-failed";
    }

    process.stderr.write(`[android:adb] tick ${tick} snapshot saved: ${outputPath}; classified=${classification}\n`);
    return outputPath;
}

async function persistForegroundSnapshotBuffer(
    snapshotDir: string,
    tick: number,
    state: string,
    suffix: string,
    screenshot: Buffer
): Promise<string> {
    await fs.mkdir(snapshotDir, { recursive: true });
    const fileName = `tick-${String(tick).padStart(5, "0")}-${safeFileToken(state)}-${safeFileToken(suffix)}.png`;
    const outputPath = path.join(snapshotDir, fileName);
    await fs.writeFile(outputPath, screenshot);
    process.stderr.write(`[android:adb] tick ${tick} snapshot saved: ${outputPath}; classified=${state}\n`);
    return outputPath;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tapForegroundDecision(decision: AndroidForegroundDecision & { targetPoint: { x: number; y: number } }): Promise<boolean> {
    const tapped = await androidAdbCapture.tapRelative(decision.targetPoint);
    if (decision.kind !== "TAP_GAME_OVER_EXIT") {
        return tapped;
    }

    // Result-modal exit occasionally ignores the first tap while the placement banner animates.
    // Keep retries inside the same button band and only for game-over recovery.
    const retryPoints = [
        { x: decision.targetPoint.x, y: Math.max(0.0, decision.targetPoint.y - 0.025) },
        { x: decision.targetPoint.x, y: Math.min(1.0, decision.targetPoint.y + 0.025) },
    ];
    let anyTapped = tapped;
    for (const point of retryPoints) {
        await sleep(250);
        anyTapped = (await androidAdbCapture.tapRelative(point)) || anyTapped;
    }
    return anyTapped;
}

async function fastPollQueueForeground(
    snapshotDir: string,
    tick: number,
    previousState: AndroidForegroundProgressState
): Promise<AndroidForegroundProgressState> {
    let foregroundProgressState = previousState;

    for (let attempt = 1; attempt <= 60; attempt += 1) {
        await sleep(900);
        const screenshot = await androidAdbCapture.capturePng();
        if (!screenshot) {
            process.stderr.write(`[android:auto] queue-poll ${attempt}/60 capture unavailable\n`);
            continue;
        }

        const classification = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(classification);
        const progressResult = planAndroidForegroundProgress(observation, foregroundProgressState);
        foregroundProgressState = progressResult.nextState;

        if (observation.state !== "QUEUE") {
            await persistForegroundSnapshotBuffer(
                snapshotDir,
                tick,
                observation.state,
                `queue-poll-${String(attempt).padStart(2, "0")}`,
                screenshot
            );
        }

        if (isQueueFastPollTapDecision(progressResult.decision)) {
            const tapped = await androidAdbCapture.tapRelative(progressResult.decision.targetPoint);
            process.stderr.write(
                `[android:auto] queue-poll ${attempt}/60 ${progressResult.decision.kind} ` +
                `state=${observation.state} tapped=${tapped} reason=${progressResult.decision.reason}\n`
            );
            continue;
        }

        if (observation.state === "LIVE_CONTENT" || observation.state === "IN_GAME_TRANSITION") {
            process.stderr.write(
                `[android:auto] queue-poll ${attempt}/60 state=${observation.state}: ${progressResult.decision.reason}\n`
            );
            break;
        }

        if (observation.state !== "QUEUE") {
            process.stderr.write(
                `[android:auto] queue-poll ${attempt}/60 state=${observation.state}: ${progressResult.decision.reason}\n`
            );
        } else if (attempt % 10 === 0) {
            process.stderr.write(
                `[android:auto] queue-poll ${attempt}/60 state=QUEUE: ${progressResult.decision.reason}\n`
            );
        }
    }

    return foregroundProgressState;
}

function writeStdout(payload: string): Promise<void> {
    return new Promise((resolve, reject) => {
        process.stdout.write(payload, (error) => {
            if (error) {
                reject(error);
                return;
            }
            resolve();
        });
    });
}

async function loadFixtureState(statePath: string): Promise<ObservedState> {
    const payload = JSON.parse(await fs.readFile(statePath, "utf8")) as {
        state?: ObservedState;
    } & Partial<ObservedState>;
    return (payload.state ?? payload) as ObservedState;
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    const { AndroidAutomationLoop } = await import("../src-backend/services/AndroidAutomationLoop");

    const fixtureState = args.statePath ? await loadFixtureState(args.statePath) : null;
    const adapter = fixtureState ? new FixtureAndroidAdapter([fixtureState]) : undefined;
    const safeObserve = args.safeObserve ?? true;
    const liveAdapter = adapter
        ? adapter
        : new (await import("../src-backend/adapters/AndroidEmulatorAdapter")).AndroidEmulatorAdapter({
            safeObserve,
            fastStageRead: true,
            componentReadTimeoutMs: 12000,
            stageReadAttempts: 4,
        });
    const loop = new AndroidAutomationLoop({
        adapter: liveAdapter,
        dryRun: args.dryRun,
        operationTimeoutMs: args.operationTimeoutMs,
    });
    const snapshotDir = args.snapshotDir ?? path.join(process.cwd(), "reports", "live-skip-snapshots");
    const results = [];
    let lastForegroundSignature = "";
    let lastForegroundSnapshotTick = -Infinity;
    let consecutiveForegroundSkips = 0;
    let foregroundProgressState = createInitialAndroidForegroundProgressState();

    for (let tick = 0; tick < args.ticks; tick += 1) {
        process.stderr.write(`[android:auto] tick ${tick + 1}/${args.ticks} start\n`);
        const result = await loop.runOnce();
        results.push(result);
        process.stderr.write(`[android:auto] tick ${tick + 1}/${args.ticks} ${result.status}: ${result.reason}\n`);

        if (result.status === "PAUSED" && shouldStopAfterPausedResult(result.reason)) {
            process.stderr.write(
                `[android:auto] stopping bounded run after PAUSED timeout/settling state: ${result.reason}\n`
            );
            break;
        }

        if (result.status === "SKIPPED" && isForegroundSkip(result.reason)) {
            consecutiveForegroundSkips += 1;
            const reasonState = extractForegroundState(result.reason) ?? "unknown";
            const signature = `${reasonState}`;
            const shouldCapture = signature !== lastForegroundSignature
                || tick + 1 - lastForegroundSnapshotTick >= args.snapshotEveryTicks;
            if (shouldCapture) {
                const outputPath = await persistForegroundSnapshot(snapshotDir, tick + 1, result.reason);
                if (outputPath !== "none") {
                    lastForegroundSignature = signature;
                    lastForegroundSnapshotTick = tick + 1;
                }
            }
            if (consecutiveForegroundSkips === args.snapshotEveryTicks) {
                process.stderr.write(
                    `[android:auto] warning: 连续 ${consecutiveForegroundSkips} 个 tick 未进入 LIVE_CONTENT，` +
                    `当前状态=${reasonState}。` +
                    "建议检查是否卡住在确认弹窗或登录/网络弹窗。\n"
                );
            }
            if (!args.dryRun) {
                try {
                    const screenshot = await androidAdbCapture.capturePng();
                    if (screenshot) {
                        const classification = await classifyAndroidWindowScreenshot(screenshot);
                        const observation = normalizeAndroidForegroundObservation(classification);
                        const progressResult = planAndroidForegroundProgress(observation, foregroundProgressState);
                        foregroundProgressState = progressResult.nextState;
                        if (isSafeForegroundTapDecision(progressResult.decision)) {
                            const tapped = await tapForegroundDecision(progressResult.decision);
                            process.stderr.write(
                                `[android:auto] foreground ${progressResult.decision.kind} ` +
                                `state=${observation.state} tapped=${tapped} reason=${progressResult.decision.reason}\n`
                            );
                        } else if (progressResult.decision.kind === "BLOCKED") {
                            process.stderr.write(
                                `[android:auto] foreground blocked state=${observation.state}: ${progressResult.decision.reason}\n`
                            );
                        } else {
                            process.stderr.write(
                                `[android:auto] foreground wait state=${observation.state}: ${progressResult.decision.reason}\n`
                            );
                        }
                        if (observation.state === "QUEUE") {
                            foregroundProgressState = await fastPollQueueForeground(
                                snapshotDir,
                                tick + 1,
                                foregroundProgressState
                            );
                        }
                    }
                } catch (error) {
                    process.stderr.write(
                        `[android:auto] foreground progression failed: ${error instanceof Error ? error.message : String(error)}\n`
                    );
                }
            }
        } else {
            if (consecutiveForegroundSkips !== 0) {
                process.stderr.write(`[android:auto] foreground skip streak reset at tick ${tick + 1}\n`);
            }
            consecutiveForegroundSkips = 0;
            foregroundProgressState = createInitialAndroidForegroundProgressState();
        }
        if (tick < args.ticks - 1 && args.intervalMs > 0) {
            await sleep(args.intervalMs);
        }
    }

    await writeStdout(`${JSON.stringify({
        mode: args.dryRun ? "dry-run" : "live",
        statePath: args.statePath,
        safeObserve,
        ticks: args.ticks,
        intervalMs: args.intervalMs,
        operationTimeoutMs: args.operationTimeoutMs,
        results,
    }, null, 2)}\n`);

    // Live OCR/native work can leave non-cancellable handles after a timed-out observe.
    // This CLI is a one-shot verifier, so exit after the serializable result is flushed.
    process.exit(0);
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
});
