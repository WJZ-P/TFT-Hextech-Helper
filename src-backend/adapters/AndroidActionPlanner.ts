import {
    androidEquipmentSlot,
    benchSlotPoints,
    buyExpPoint,
    fightBoardSlotPoint,
    hexSlot,
    refreshShopPoint,
    shopSlot,
    type SimplePoint,
} from "../TFTProtocol";
import type { ActionPlan, ObservedState } from "../core/types";
import type { BenchLocation, BoardLocation } from "../tft";

export type AndroidOperationKind =
    | "BUY_SLOT"
    | "REFRESH_SHOP"
    | "BUY_XP"
    | "MOVE_BENCH_TO_BOARD"
    | "MOVE_BOARD_TO_BOARD"
    | "MOVE_BOARD_TO_BENCH"
    | "EQUIP_TO_BOARD"
    | "PICK_AUGMENT"
    | "NOOP"
    | "UNSUPPORTED";

export interface AndroidNamedPoint {
    label: string;
    point: SimplePoint;
}

export interface AndroidExecutionStep {
    index: number;
    kind: AndroidOperationKind;
    actionType: ActionPlan["type"];
    description: string;
    reason: string;
    priority: number;
    slot?: number;
    itemIndex?: number;
    benchIndex?: number;
    fromBench?: BenchLocation;
    fromBoard?: BoardLocation;
    toBench?: BenchLocation;
    toBoard?: BoardLocation;
    targetPoint?: AndroidNamedPoint;
    fromPoint?: AndroidNamedPoint;
    toPoint?: AndroidNamedPoint;
}

export interface AndroidExecutionPlan {
    orderedActions: ActionPlan[];
    steps: AndroidExecutionStep[];
    warnings: string[];
}

function isBoardLocation(value: unknown): value is BoardLocation {
    return typeof value === "string" && /^R[1-4]_C[1-7]$/.test(value);
}

function isBenchLocation(value: unknown): value is BenchLocation {
    return typeof value === "string" && /^SLOT_[1-9]$/.test(value);
}

function parseInteger(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }
    return Math.trunc(parsed);
}

function normalizeShopSlot(rawValue: unknown): number | null {
    if (typeof rawValue === "string") {
        const match = rawValue.match(/^SHOP_SLOT_(\d+)$/);
        if (match) {
            const parsed = Number(match[1]);
            return parsed >= 1 && parsed <= 5 ? parsed : null;
        }
    }

    const rawSlot = parseInteger(rawValue);
    if (rawSlot === null) {
        return null;
    }

    if (rawSlot >= 0 && rawSlot <= 4) {
        return rawSlot + 1;
    }

    return rawSlot === 5 ? 5 : null;
}

function normalizeBenchLocation(rawValue: unknown): { location: BenchLocation; index: number } | null {
    if (isBenchLocation(rawValue)) {
        const index = parseInteger(String(rawValue).replace("SLOT_", ""));
        if (index === null) {
            return null;
        }
        return {
            location: rawValue,
            index: index - 1,
        };
    }

    const parsed = parseInteger(rawValue);
    if (parsed === null || parsed < 0 || parsed > 8) {
        return null;
    }

    return {
        location: `SLOT_${parsed + 1}` as BenchLocation,
        index: parsed,
    };
}

function buildPoint(label: string, point: SimplePoint): AndroidNamedPoint {
    return { label, point };
}

function buildInitialBoardOccupancy(state?: Partial<ObservedState> | null): Set<BoardLocation> {
    const occupied = new Set<BoardLocation>();
    for (const unit of state?.board ?? []) {
        if (isBoardLocation(unit.location)) {
            occupied.add(unit.location);
        }
    }
    return occupied;
}

function resolveTargetBoardLocation(rawValue: unknown, occupiedBoard: Set<BoardLocation>): BoardLocation | null {
    if (isBoardLocation(rawValue)) {
        return rawValue;
    }

    if (rawValue === "AUTO_SLOT") {
        const boardKeys = Object.keys(fightBoardSlotPoint) as BoardLocation[];
        return boardKeys.find((location) => !occupiedBoard.has(location)) ?? boardKeys[0] ?? null;
    }

    return null;
}

export function sortAndroidActionsForExecution(actions: ActionPlan[]): ActionPlan[] {
    return [...actions].sort((a, b) => b.priority - a.priority || a.tick - b.tick);
}

export function buildAndroidExecutionPlan(
    actions: ActionPlan[],
    state?: Partial<ObservedState> | null
): AndroidExecutionPlan {
    const orderedActions = sortAndroidActionsForExecution(actions);
    const steps: AndroidExecutionStep[] = [];
    const warnings: string[] = [];
    const occupiedBoard = buildInitialBoardOccupancy(state);

    const pushStep = (step: Omit<AndroidExecutionStep, "index">) => {
        steps.push({
            ...step,
            index: steps.length,
        });
    };

    for (const action of orderedActions) {
        switch (action.type) {
            case "BUY": {
                const slot = normalizeShopSlot(action.payload.slot);
                if (slot === null) {
                    warnings.push(`BUY 动作缺少合法槽位: ${JSON.stringify(action.payload)}`);
                    break;
                }

                const slotKey = `SHOP_SLOT_${slot}` as keyof typeof shopSlot;
                pushStep({
                    kind: "BUY_SLOT",
                    actionType: action.type,
                    description: `点击商店槽位 ${slot}${action.payload.champion ? `，尝试购买 ${String(action.payload.champion)}` : ""}`,
                    reason: action.reason,
                    priority: action.priority,
                    slot,
                    targetPoint: buildPoint(slotKey, shopSlot[slotKey]),
                });
                break;
            }
            case "ROLL": {
                const count = Math.min(3, Math.max(1, parseInteger(action.payload.count) ?? 1));
                for (let i = 0; i < count; i += 1) {
                    pushStep({
                        kind: "REFRESH_SHOP",
                        actionType: action.type,
                        description: `刷新商店 ${i + 1}/${count}`,
                        reason: action.reason,
                        priority: action.priority,
                        targetPoint: buildPoint("REFRESH_SHOP", refreshShopPoint),
                    });
                }
                break;
            }
            case "LEVEL_UP": {
                const count = Math.min(3, Math.max(1, parseInteger(action.payload.count) ?? 1));
                for (let i = 0; i < count; i += 1) {
                    pushStep({
                        kind: "BUY_XP",
                        actionType: action.type,
                        description: `购买经验 ${i + 1}/${count}`,
                        reason: action.reason,
                        priority: action.priority,
                        targetPoint: buildPoint("BUY_EXP", buyExpPoint),
                    });
                }
                break;
            }
            case "MOVE": {
                if (isBenchLocation(action.payload.fromBench)) {
                    const toBoard = resolveTargetBoardLocation(action.payload.toBoard, occupiedBoard);
                    if (!toBoard) {
                        warnings.push(`MOVE 动作无法解析目标棋盘位置: ${JSON.stringify(action.payload)}`);
                        break;
                    }

                    occupiedBoard.add(toBoard);
                    pushStep({
                        kind: "MOVE_BENCH_TO_BOARD",
                        actionType: action.type,
                        description: `将 ${String(action.payload.champion ?? "备战席棋子")} 从 ${action.payload.fromBench} 拖到 ${toBoard}`,
                        reason: action.reason,
                        priority: action.priority,
                        fromBench: action.payload.fromBench,
                        toBoard,
                        fromPoint: buildPoint(action.payload.fromBench, benchSlotPoints[action.payload.fromBench]),
                        toPoint: buildPoint(toBoard, fightBoardSlotPoint[toBoard]),
                    });
                    break;
                }

                if (isBoardLocation(action.payload.fromBoard) && isBoardLocation(action.payload.toBoard)) {
                    occupiedBoard.delete(action.payload.fromBoard);
                    occupiedBoard.add(action.payload.toBoard);
                    pushStep({
                        kind: "MOVE_BOARD_TO_BOARD",
                        actionType: action.type,
                        description: `调整站位：${action.payload.fromBoard} -> ${action.payload.toBoard}`,
                        reason: action.reason,
                        priority: action.priority,
                        fromBoard: action.payload.fromBoard,
                        toBoard: action.payload.toBoard,
                        fromPoint: buildPoint(action.payload.fromBoard, fightBoardSlotPoint[action.payload.fromBoard]),
                        toPoint: buildPoint(action.payload.toBoard, fightBoardSlotPoint[action.payload.toBoard]),
                    });
                    break;
                }

                if (isBoardLocation(action.payload.fromBoard)) {
                    const benchTarget = normalizeBenchLocation(action.payload.toBench);
                    if (!benchTarget) {
                        warnings.push(`MOVE 动作无法解析目标备战席位置: ${JSON.stringify(action.payload)}`);
                        break;
                    }

                    occupiedBoard.delete(action.payload.fromBoard);
                    pushStep({
                        kind: "MOVE_BOARD_TO_BENCH",
                        actionType: action.type,
                        description: `将棋盘单位从 ${action.payload.fromBoard} 拖回 ${benchTarget.location}`,
                        reason: action.reason,
                        priority: action.priority,
                        benchIndex: benchTarget.index,
                        fromBoard: action.payload.fromBoard,
                        toBench: benchTarget.location,
                        fromPoint: buildPoint(action.payload.fromBoard, fightBoardSlotPoint[action.payload.fromBoard]),
                        toPoint: buildPoint(benchTarget.location, benchSlotPoints[benchTarget.location]),
                    });
                    break;
                }

                warnings.push(`MOVE 动作缺少可执行坐标: ${JSON.stringify(action.payload)}`);
                break;
            }
            case "EQUIP": {
                const itemIndex = parseInteger(action.payload.itemIndex);
                const toBoard = resolveTargetBoardLocation(action.payload.toBoard, occupiedBoard);
                const maxEquipIndex = Object.keys(androidEquipmentSlot).length - 1;
                if (itemIndex === null || itemIndex < 0 || itemIndex > maxEquipIndex || !toBoard) {
                    warnings.push(`EQUIP 动作参数不完整: ${JSON.stringify(action.payload)}`);
                    break;
                }

                const slotKey = `EQ_SLOT_${itemIndex + 1}` as keyof typeof androidEquipmentSlot;
                pushStep({
                    kind: "EQUIP_TO_BOARD",
                    actionType: action.type,
                    description: `给 ${toBoard} 上装备${action.payload.itemName ? `：${String(action.payload.itemName)}` : ""}`,
                    reason: action.reason,
                    priority: action.priority,
                    itemIndex,
                    toBoard,
                    fromPoint: buildPoint(slotKey, androidEquipmentSlot[slotKey]),
                    toPoint: buildPoint(toBoard, fightBoardSlotPoint[toBoard]),
                });
                break;
            }
            case "PICK_AUGMENT": {
                const slot = Math.max(1, Math.min(3, parseInteger(action.payload.slot) ?? 2));
                const slotKey = `SLOT_${slot}` as keyof typeof hexSlot;
                pushStep({
                    kind: "PICK_AUGMENT",
                    actionType: action.type,
                    description: `选择海克斯槽位 ${slot}`,
                    reason: action.reason,
                    priority: action.priority,
                    slot,
                    targetPoint: buildPoint(slotKey, hexSlot[slotKey]),
                });
                break;
            }
            case "NOOP": {
                pushStep({
                    kind: "NOOP",
                    actionType: action.type,
                    description: "当前局面无需执行触控动作",
                    reason: action.reason,
                    priority: action.priority,
                });
                break;
            }
            case "SELL":
            default: {
                warnings.push(`暂未支持的安卓动作: ${action.type}`);
                pushStep({
                    kind: "UNSUPPORTED",
                    actionType: action.type,
                    description: `暂未实现的安卓动作: ${action.type}`,
                    reason: action.reason,
                    priority: action.priority,
                });
                break;
            }
        }
    }

    return {
        orderedActions,
        steps,
        warnings,
    };
}
