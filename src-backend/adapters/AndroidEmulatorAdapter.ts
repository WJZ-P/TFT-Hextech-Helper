import { fightBoardSlotPoint, GameStageType, hexSlot, type GameStageResult, type SimplePoint } from "../TFTProtocol";
import { tftOperator } from "../TftOperator";
import { androidAdbCapture } from "../services/AndroidAdbCapture";
import type { BenchLocation, BoardLocation, LootOrb } from "../tft";
import { mouseController, MouseButtonType, screenCapture } from "../tft";
import { sleep } from "../utils/HelperTools";
import { logger } from "../utils/Logger";
import { GameClient } from "../utils/SettingsStore";
import { classifyAndroidWindowScreenshot } from "../utils/AndroidWindowClassifier";
import { normalizeAndroidForegroundObservation } from "../services/AndroidForegroundProtocol";
import { windowHelper } from "../utils/WindowHelper";
import { normalizeRuntimeState } from "../core/StateNormalizer";
import type { ActionPlan, AdapterHealth, GameAdapter, ObservedState, PlatformTarget } from "../core/types";
import { detectAndroidLootOrbsFromScreenshot } from "../utils/AndroidLootOrbDetector";
import { shouldReadShopDuringAndroidObserve } from "./AndroidObservePolicy";

export interface AndroidEmulatorAdapterOptions {
    safeObserve?: boolean;
    fastStageRead?: boolean;
    componentReadTimeoutMs?: number;
    stageReadAttempts?: number;
    stageReadRetryDelayMs?: number;
    minWindowWidth?: number;
    minWindowHeight?: number;
}

const DEFAULT_MIN_RELIABLE_ANDROID_WINDOW_WIDTH = 850;
const DEFAULT_MIN_RELIABLE_ANDROID_WINDOW_HEIGHT = 450;

function isBoardLocation(value: unknown): value is BoardLocation {
    return typeof value === "string" && /^R[1-4]_C[1-7]$/.test(value);
}

function isBenchLocation(value: unknown): value is BenchLocation {
    return typeof value === "string" && /^SLOT_[1-9]$/.test(value);
}

function parseSlotIndex(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    return Math.trunc(parsed);
}

function parseNormalizedPoint(rawX: unknown, rawY: unknown): SimplePoint | null {
    const x = Number(rawX);
    const y = Number(rawY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return null;
    }
    if (x < 0 || x > 1 || y < 0 || y > 1) {
        return null;
    }
    return { x, y };
}

function parseBenchIndex(value: unknown): number | null {
    if (typeof value === "string") {
        const match = value.match(/^SLOT_(\d+)$/);
        if (match) {
            const parsed = Number(match[1]);
            if (Number.isFinite(parsed)) {
                return parsed - 1;
            }
        }
    }
    return parseSlotIndex(value);
}

function normalizeBuySlotIndex(rawSlot: number): number {
    // normalizeRuntimeState currently emits shop slot as zero-based (0..4),
    // while tftOperator.buyAtSlot expects one-based (1..5).
    if (rawSlot >= 0 && rawSlot <= 4) {
        return rawSlot + 1;
    }
    return rawSlot;
}

export class AndroidEmulatorAdapter implements GameAdapter {
    public readonly target: PlatformTarget = "ANDROID_EMULATOR";
    private attached = false;

    constructor(private readonly options: AndroidEmulatorAdapterOptions = {}) {}

    public async attach(): Promise<void> {
        screenCapture.setFrameCaptureProvider(() => androidAdbCapture.capturePng());
        await windowHelper.ensureAndroidEmulatorWindowBounds(
            this.options.minWindowWidth ?? DEFAULT_MIN_RELIABLE_ANDROID_WINDOW_WIDTH,
            this.options.minWindowHeight ?? DEFAULT_MIN_RELIABLE_ANDROID_WINDOW_HEIGHT
        );
        const win = await windowHelper.findLOLWindow(GameClient.ANDROID);
        if (!win) {
            throw new Error("未找到安卓模拟器窗口");
        }

        const initResult = await tftOperator.init();
        if (!initResult.success) {
            throw new Error("TftOperator 初始化失败，无法绑定安卓窗口");
        }

        this.attached = true;
        logger.info(`[AndroidEmulatorAdapter] 已绑定窗口: ${win.title}`);
    }

    public async observe(): Promise<ObservedState> {
        const foregroundState = await this.readForegroundState();
        if (foregroundState?.augmentChoiceVisible) {
            return normalizeRuntimeState({
                client: GameClient.ANDROID,
                target: this.target,
                stageText: "augment-choice",
                stageType: GameStageType.AUGMENT,
                level: 1,
                currentXp: 0,
                totalXp: 0,
                gold: 0,
                shopUnits: [],
                benchUnits: [],
                boardUnits: [],
                equipments: [],
                metadata: {
                    hasValidStage: true,
                    foregroundState: foregroundState.state,
                    foregroundReason: foregroundState.reason,
                    augmentChoiceVisible: true,
                    ...(foregroundState.augmentChoicePoint ? { augmentChoicePoint: foregroundState.augmentChoicePoint } : {}),
                },
            });
        }

        if (foregroundState && foregroundState.state !== "LIVE_CONTENT") {
            return normalizeRuntimeState({
                client: GameClient.ANDROID,
                target: this.target,
                stageText: "",
                stageType: GameStageType.UNKNOWN,
                level: 1,
                currentXp: 0,
                totalXp: 0,
                gold: 0,
                shopUnits: [],
                benchUnits: [],
                boardUnits: [],
                equipments: [],
                metadata: {
                    hasValidStage: false,
                    foregroundState: foregroundState.state,
                    foregroundReason: foregroundState.reason,
                },
            });
        }

        if (!this.attached) {
            await this.attach();
        }

        const readShop = shouldReadShopDuringAndroidObserve(this.options);
        const stageResult = await this.readConfirmedStage();
        const [levelInfo, gold, shopUnits] = await Promise.all([
            tftOperator.getLevelInfo(),
            tftOperator.getCoinCount(),
            readShop ? this.readObservedComponent("shop", () => tftOperator.getShopInfo(), []) : Promise.resolve([]),
        ]);
        const lootOrbs = await this.readLootOrbs(stageResult, levelInfo, gold);
        const [benchUnits, boardUnits, equips] = this.options.safeObserve
            ? [[], [], []]
            : await Promise.all([
                this.readObservedComponent("bench", () => tftOperator.getBenchInfo(), []),
                this.readObservedComponent("board", () => tftOperator.getFightBoardInfo(), []),
                this.readObservedComponent("equip", () => tftOperator.getEquipInfo(), []),
            ]);

        // Live stability note: stageResult.type may be UNKNOWN when OCR crops fall outside expected
        // regions due to emulator resolution mismatch, shop-open UI shift, or frame timing.
        // Three known instability sources (as of Mar 2026, wave 3 investigation):
        //
        // 1. Crop offset drift — percentage-based region constants assume a fixed aspect ratio;
        //    emulators with non-standard resolutions shift the stage text out of the crop window.
        //    MITIGATED: getAndroidStageFallbackRegions() provides 9 fallback scan windows with
        //    varying percentages (TftOperator.ts lines 1783-1814).
        //
        // 2. Shop-open UI compression — when the shop is open, the topbar compresses horizontally,
        //    causing stage text to appear further left than the standard region covers.
        //    MITIGATED: androidGameStageDisplayShopOpen (TFTProtocol.ts) was widened to x=0.310-0.470
        //    to cover the leftward drift; recognizeAndroidStageWithVoting() also adds shop-open-wide
        //    and titlebar-shift variants (TftOperator.ts lines 1684-1709).
        //
        // 3. Frame timing — getGameStage() may capture mid-transition frames where text is partially
        //    obscured by animations; regression fixtures use settled frames only.
        //    MITIGATED: confirmStageWithHistory() requires 4 consecutive matching reads (TftOperator.ts
        //    lines 1821-1847) before confirming a stage.
        //
        // Remaining risk: very high-DPI emulators, emulators with title-bar/toolbar offsets not
        // captured by any fallback region, or rapid stage transitions where 4-frame confirmation
        // lags behind. UNKNOWN is a safe fallback — it triggers the "stay in place" behavior.
        if (stageResult.type === GameStageType.UNKNOWN) {
            logger.warn(
                `[AndroidEmulatorAdapter] stage OCR returned UNKNOWN — stageText="${stageResult.stageText ?? ""}". ` +
                `Possible causes: resolution crop drift, shop-open UI shift, or mid-transition frame.`
            );
        }

        return normalizeRuntimeState({
            client: GameClient.ANDROID,
            target: this.target,
            stageText: stageResult.stageText,
            stageType: stageResult.type,
            level: levelInfo?.level ?? 1,
            currentXp: levelInfo?.currentXp ?? 0,
            totalXp: levelInfo?.totalXp ?? 0,
            gold: gold ?? 0,
            shopUnits,
            benchUnits,
            boardUnits,
            equipments: equips,
            metadata: {
                hasValidStage: stageResult.type !== GameStageType.UNKNOWN,
                lootOrbs,
            },
        });
    }

    private async readForegroundState(): Promise<{
        state: string;
        reason: string | null;
        augmentChoiceVisible: boolean;
        augmentChoicePoint?: SimplePoint;
    } | null> {
        try {
            const screenshot = await androidAdbCapture.capturePng();
            if (!screenshot) {
                return null;
            }
            const classification = await classifyAndroidWindowScreenshot(screenshot);
            const observation = normalizeAndroidForegroundObservation(classification);
            return {
                state: observation.state,
                reason: observation.state === "LIVE_CONTENT"
                    ? "Live HUD detected"
                    : observation.reason,
                augmentChoiceVisible: classification.augmentChoiceVisible === true,
                augmentChoicePoint: classification.augmentChoicePoint,
            };
        } catch (error: unknown) {
            logger.warn(`[AndroidEmulatorAdapter] 前台状态预检查失败: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    private async readConfirmedStage() {
        if (this.options.safeObserve || this.options.fastStageRead) {
            return tftOperator.getAndroidGameStageFast();
        }

        const attempts = Math.max(1, Math.trunc(this.options.stageReadAttempts ?? 1));
        const retryDelayMs = Math.max(0, Math.trunc(this.options.stageReadRetryDelayMs ?? 150));
        let latest = await tftOperator.getGameStage();

        for (let attempt = 1; attempt < attempts; attempt += 1) {
            if (latest.type !== GameStageType.UNKNOWN && latest.stageText) {
                return latest;
            }
            if (retryDelayMs > 0) {
                await sleep(retryDelayMs);
            }
            latest = await tftOperator.getGameStage();
        }

        return latest;
    }

    private async readObservedComponent<T>(label: string, task: () => Promise<T>, fallback: T): Promise<T> {
        const timeoutMs = Math.max(1000, Math.trunc(this.options.componentReadTimeoutMs ?? 12000));
        let timeoutId: NodeJS.Timeout | null = null;
        let timedOut = false;
        const taskPromise = task()
            .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : String(error);
                logger.warn(`[AndroidEmulatorAdapter] ${label} 读取失败: ${message}`);
                return fallback;
            })
            .finally(() => {
                if (timedOut) {
                    logger.warn(`[AndroidEmulatorAdapter] ${label} 读取在超时后结束，结果已丢弃`);
                }
            });

        const timeoutPromise = new Promise<T>((resolve) => {
            timeoutId = setTimeout(() => {
                timedOut = true;
                logger.warn(`[AndroidEmulatorAdapter] ${label} 读取超过 ${timeoutMs}ms，降级为空结果`);
                resolve(fallback);
            }, timeoutMs);
        });

        try {
            return await Promise.race([taskPromise, timeoutPromise]);
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }

    private shouldSkipVisualLootFallback(
        stageResult: GameStageResult,
        levelInfo: { level: number } | null,
        gold: number | null
    ): boolean {
        return (
            stageResult.type === GameStageType.UNKNOWN &&
            (levelInfo?.level ?? 1) <= 1 &&
            (gold ?? 0) <= 0
        );
    }

    private async readLootOrbs(
        stageResult?: GameStageResult,
        levelInfo?: { level: number } | null,
        gold?: number | null
    ): Promise<LootOrb[]> {
        try {
            const templateOrbs = await tftOperator.getLootOrbs();
            if (templateOrbs.length > 0) {
                return templateOrbs;
            }

            if (stageResult && this.shouldSkipVisualLootFallback(stageResult, levelInfo ?? null, gold ?? null)) {
                logger.info("[AndroidEmulatorAdapter] 开局/选秀疑似帧跳过战利品视觉兜底");
                return [];
            }

            const screenshot = await androidAdbCapture.capturePng();
            if (!screenshot) {
                return [];
            }
            const visualOrbs = await detectAndroidLootOrbsFromScreenshot(screenshot);
            if (visualOrbs.length > 0) {
                logger.info(`[AndroidEmulatorAdapter] 视觉兜底检测到 ${visualOrbs.length} 个战利品球`);
            }
            return visualOrbs;
        } catch (error: unknown) {
            logger.warn(`[AndroidEmulatorAdapter] 战利品球检测失败: ${error instanceof Error ? error.message : String(error)}`);
            return [];
        }
    }

    private async pickUpLootOrbs(maxCount: number = 4): Promise<void> {
        const lootOrbs = await this.readLootOrbs();
        if (lootOrbs.length === 0) {
            logger.info("[AndroidEmulatorAdapter] PICK_LOOT 未检测到可拾取战利品球");
            return;
        }

        const typeRank: Record<string, number> = {
            gold: 0,
            blue: 1,
            normal: 2,
        };
        const sortedOrbs = [...lootOrbs]
            .sort((left, right) => {
                const leftRank = typeRank[left.type] ?? 3;
                const rightRank = typeRank[right.type] ?? 3;
                if (leftRank !== rightRank) {
                    return leftRank - rightRank;
                }
                if (left.y !== right.y) {
                    return left.y - right.y;
                }
                return left.x - right.x;
            })
            .slice(0, Math.max(1, Math.min(6, maxCount)));

        logger.info(`[AndroidEmulatorAdapter] PICK_LOOT 准备拾取 ${sortedOrbs.length}/${lootOrbs.length} 个战利品球`);
        for (const orb of sortedOrbs) {
            logger.info(`[AndroidEmulatorAdapter] PICK_LOOT ${orb.type} (${orb.x}, ${orb.y})`);
            await mouseController.clickAt({ x: orb.x, y: orb.y }, MouseButtonType.RIGHT);
            await sleep(900);
        }
        await tftOperator.selfResetPosition();
    }

    public async execute(actions: ActionPlan[]): Promise<void> {
        const sorted = [...actions].sort((a, b) => b.priority - a.priority || a.tick - b.tick);

        for (const action of sorted) {
            switch (action.type) {
                case "BUY": {
                    const rawSlot = parseSlotIndex(action.payload.slot);
                    if (rawSlot === null) {
                        break;
                    }
                    const slot = normalizeBuySlotIndex(rawSlot);
                    if (slot >= 1 && slot <= 5) {
                        await tftOperator.buyAtSlot(slot);
                    }
                    break;
                }
                case "ROLL": {
                    const count = Math.min(3, Math.max(1, parseSlotIndex(action.payload.count) ?? 1));
                    for (let i = 0; i < count; i += 1) {
                        await tftOperator.refreshShop();
                        await sleep(50);
                    }
                    break;
                }
                case "LEVEL_UP": {
                    const count = Math.min(3, Math.max(1, parseSlotIndex(action.payload.count) ?? 1));
                    for (let i = 0; i < count; i += 1) {
                        await tftOperator.buyExperience();
                        await sleep(50);
                    }
                    break;
                }
                case "MOVE": {
                    const fromBench = action.payload.fromBench;
                    const fromBoard = action.payload.fromBoard;
                    const toBoard = action.payload.toBoard;
                    const toBench = action.payload.toBench;

                    if (isBenchLocation(fromBench)) {
                        const targetBoard = await this.resolveBoardLocation(toBoard);
                        if (targetBoard) {
                            await tftOperator.moveBenchToBoard(fromBench, targetBoard);
                        }
                        break;
                    }

                    if (isBoardLocation(fromBoard) && isBoardLocation(toBoard)) {
                        await tftOperator.moveBoardToBoard(fromBoard, toBoard);
                        break;
                    }

                    if (isBoardLocation(fromBoard)) {
                        const benchIndexRaw = parseBenchIndex(toBench);
                        if (benchIndexRaw !== null) {
                            const benchIndex = Math.max(0, Math.min(8, benchIndexRaw));
                            await tftOperator.moveBoardToBench(fromBoard, benchIndex);
                        }
                    }
                    break;
                }
                case "EQUIP": {
                    const itemIndex = parseSlotIndex(action.payload.itemIndex);
                    const boardLocation = action.payload.toBoard;
                    if (itemIndex !== null && isBoardLocation(boardLocation)) {
                        await tftOperator.equipToBoardUnit(itemIndex, boardLocation);
                    }
                    break;
                }
                case "PICK_AUGMENT": {
                    const directPoint = parseNormalizedPoint(action.payload.x, action.payload.y);
                    if (directPoint) {
                        await mouseController.clickAt(directPoint, MouseButtonType.LEFT);
                        break;
                    }
                    const slot = Math.max(1, Math.min(3, parseSlotIndex(action.payload.slot) ?? 2));
                    const slotKey = `SLOT_${slot}` as keyof typeof hexSlot;
                    await mouseController.clickAt(hexSlot[slotKey], MouseButtonType.LEFT);
                    break;
                }
                case "PICK_LOOT": {
                    const maxCount = Math.max(1, Math.min(6, parseSlotIndex(action.payload.count) ?? 4));
                    await this.pickUpLootOrbs(maxCount);
                    break;
                }
                case "NOOP":
                case "SELL":
                default:
                    break;
            }
        }
    }

    public async healthCheck(): Promise<AdapterHealth> {
        if (!this.attached) {
            try {
                await this.attach();
            } catch (error: unknown) {
                return {
                    ok: false,
                    detail: error instanceof Error ? error.message : String(error),
                };
            }
        }

        const win = await windowHelper.findLOLWindow(GameClient.ANDROID);
        const minWidth = this.options.minWindowWidth ?? DEFAULT_MIN_RELIABLE_ANDROID_WINDOW_WIDTH;
        const minHeight = this.options.minWindowHeight ?? DEFAULT_MIN_RELIABLE_ANDROID_WINDOW_HEIGHT;
        if (win && (win.width < minWidth || win.height < minHeight)) {
            return {
                ok: false,
                detail:
                    `安卓模拟器窗口过小: ${win.width}x${win.height}，` +
                    `至少需要 ${minWidth}x${minHeight} 才能稳定识别 HUD/OCR`,
            };
        }
        return {
            ok: true,
            detail: win ? `窗口已就绪: ${win.title}` : "窗口已通过 attach 绑定",
        };
    }

    private async resolveBoardLocation(rawValue: unknown): Promise<BoardLocation | null> {
        if (isBoardLocation(rawValue)) {
            return rawValue;
        }
        if (rawValue === "AUTO_SLOT") {
            const boardUnits = await tftOperator.getFightBoardInfo();
            const boardKeys = Object.keys(fightBoardSlotPoint) as BoardLocation[];
            for (let i = 0; i < boardKeys.length && i < boardUnits.length; i += 1) {
                if (boardUnits[i] === null) {
                    return boardKeys[i];
                }
            }
            return boardKeys[0] ?? null;
        }
        return null;
    }
}
