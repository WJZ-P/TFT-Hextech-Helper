import { GameStageType, hexSlot } from "../TFTProtocol";
import { tftOperator } from "../TftOperator";
import { mouseController, MouseButtonType } from "../tft";
import { sleep } from "../utils/HelperTools";
import { logger } from "../utils/Logger";
import { GameClient, settingsStore } from "../utils/SettingsStore";
import { windowHelper } from "../utils/WindowHelper";
import { normalizeRuntimeState } from "../core/StateNormalizer";
import type { ActionPlan, AdapterHealth, GameAdapter, ObservedState, PlatformTarget } from "../core/types";
import { buildAndroidExecutionPlan } from "./AndroidActionPlanner";
import { TFTMode } from "../TFTProtocol";

export class AndroidEmulatorAdapter implements GameAdapter {
    public readonly target: PlatformTarget = "ANDROID_EMULATOR";
    private attached = false;
    private lastObservedState: ObservedState | null = null;

    public async attach(): Promise<void> {
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
        if (!this.attached) {
            await this.attach();
        }

        const [stageResult, levelInfo, gold, hp, shopUnits, benchUnits, boardUnits, equips] = await Promise.all([
            tftOperator.getGameStage(),
            tftOperator.getLevelInfo(),
            tftOperator.getCoinCount(),
            tftOperator.getSelfHp(),
            tftOperator.getShopInfo(),
            tftOperator.getBenchInfo(),
            tftOperator.getFightBoardInfo(),
            tftOperator.getEquipInfo(),
        ]);

        const state = normalizeRuntimeState({
            client: GameClient.ANDROID,
            target: this.target,
            mode: (settingsStore.get("tftMode") as TFTMode | undefined) ?? TFTMode.NORMAL,
            stageText: stageResult.stageText,
            stageType: stageResult.type,
            level: levelInfo?.level ?? 1,
            currentXp: levelInfo?.currentXp ?? 0,
            totalXp: levelInfo?.totalXp ?? 0,
            gold: gold ?? 0,
            hp: hp ?? undefined,
            shopUnits,
            benchUnits,
            boardUnits,
            equipments: equips,
            metadata: {
                hasValidStage: stageResult.type !== GameStageType.UNKNOWN,
            },
        });

        this.lastObservedState = state;
        return state;
    }

    public async execute(actions: ActionPlan[]): Promise<void> {
        const executionPlan = buildAndroidExecutionPlan(actions, this.lastObservedState);

        if (executionPlan.warnings.length > 0) {
            logger.warn(`[AndroidEmulatorAdapter] 离线执行计划存在警告: ${executionPlan.warnings.join(" | ")}`);
        }

        for (const step of executionPlan.steps) {
            switch (step.kind) {
                case "BUY_SLOT":
                    if (typeof step.slot === "number") {
                        await tftOperator.buyAtSlot(step.slot);
                    }
                    break;
                case "REFRESH_SHOP":
                    await tftOperator.refreshShop();
                    await sleep(50);
                    break;
                case "BUY_XP":
                    await tftOperator.buyExperience();
                    await sleep(50);
                    break;
                case "MOVE_BENCH_TO_BOARD":
                    if (step.fromBench && step.toBoard) {
                        await tftOperator.moveBenchToBoard(step.fromBench, step.toBoard);
                    }
                    break;
                case "MOVE_BOARD_TO_BOARD":
                    if (step.fromBoard && step.toBoard) {
                        await tftOperator.moveBoardToBoard(step.fromBoard, step.toBoard);
                    }
                    break;
                case "MOVE_BOARD_TO_BENCH":
                    if (step.fromBoard && typeof step.benchIndex === "number") {
                        await tftOperator.moveBoardToBench(step.fromBoard, step.benchIndex);
                    }
                    break;
                case "EQUIP_TO_BOARD":
                    if (typeof step.itemIndex === "number" && step.toBoard) {
                        await tftOperator.equipToBoardUnit(step.itemIndex, step.toBoard);
                    }
                    break;
                case "PICK_AUGMENT":
                    if (typeof step.slot === "number") {
                        const slotKey = `SLOT_${step.slot}` as keyof typeof hexSlot;
                        await mouseController.clickAt(hexSlot[slotKey], MouseButtonType.LEFT);
                    }
                    break;
                case "NOOP":
                case "UNSUPPORTED":
                default:
                    break;
            }
        }
    }

    public async healthCheck(): Promise<AdapterHealth> {
        const win = await windowHelper.findLOLWindow(GameClient.ANDROID);
        if (!win) {
            return {
                ok: false,
                detail: "未检测到安卓模拟器窗口",
            };
        }
        return {
            ok: true,
            detail: `窗口已就绪: ${win.title}`,
        };
    }
}
