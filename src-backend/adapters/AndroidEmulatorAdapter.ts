import { fightBoardSlotPoint, GameStageType, hexSlot } from "../TFTProtocol";
import { tftOperator } from "../TftOperator";
import type { BenchLocation, BoardLocation } from "../tft";
import { mouseController, MouseButtonType } from "../tft";
import { sleep } from "../utils/HelperTools";
import { logger } from "../utils/Logger";
import { GameClient } from "../utils/SettingsStore";
import { windowHelper } from "../utils/WindowHelper";
import { normalizeRuntimeState } from "../core/StateNormalizer";
import type { ActionPlan, AdapterHealth, GameAdapter, ObservedState, PlatformTarget } from "../core/types";

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

export class AndroidEmulatorAdapter implements GameAdapter {
    public readonly target: PlatformTarget = "ANDROID_EMULATOR";
    private attached = false;

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

        const [stageResult, levelInfo, gold, shopUnits, benchUnits, boardUnits, equips] = await Promise.all([
            tftOperator.getGameStage(),
            tftOperator.getLevelInfo(),
            tftOperator.getCoinCount(),
            tftOperator.getShopInfo(),
            tftOperator.getBenchInfo(),
            tftOperator.getFightBoardInfo(),
            tftOperator.getEquipInfo(),
        ]);

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
            },
        });
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
                    const slot = rawSlot >= 1 ? rawSlot : rawSlot + 1;
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
                    const slot = Math.max(1, Math.min(3, parseSlotIndex(action.payload.slot) ?? 2));
                    const slotKey = `SLOT_${slot}` as keyof typeof hexSlot;
                    await mouseController.clickAt(hexSlot[slotKey], MouseButtonType.LEFT);
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
