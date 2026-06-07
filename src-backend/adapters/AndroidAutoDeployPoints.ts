import {
    benchSlotPoints,
    fightBoardSlotPoint,
    type SimplePoint,
} from "../TFTProtocol";
import type { BenchLocation, BoardLocation } from "../tft";

const SAFE_OBSERVE_AUTO_DEPLOY_BENCH_SLOTS: BenchLocation[] = [
    "SLOT_1",
    "SLOT_2",
    "SLOT_3",
    "SLOT_4",
    "SLOT_5",
];
const SAFE_OBSERVE_AUTO_DEPLOY_BOARD_SLOTS: BoardLocation[] = [
    "R4_C3",
    "R4_C4",
    "R4_C5",
    "R3_C3",
    "R3_C4",
];
const ANDROID_SAFE_OBSERVE_BENCH_SLOT_POINTS: Record<BenchLocation, SimplePoint> = {
    SLOT_1: { x: 0.238, y: 0.890 },
    SLOT_2: { x: 0.322, y: 0.890 },
    SLOT_3: { x: 0.406, y: 0.890 },
    SLOT_4: { x: 0.490, y: 0.890 },
    SLOT_5: { x: 0.574, y: 0.890 },
    SLOT_6: { x: 0.658, y: 0.890 },
    SLOT_7: { x: 0.742, y: 0.890 },
    SLOT_8: { x: 0.826, y: 0.890 },
    SLOT_9: { x: 0.910, y: 0.890 },
};
const ANDROID_SAFE_OBSERVE_BOARD_SLOT_POINTS: Partial<Record<BoardLocation, SimplePoint>> = {
    R4_C3: { x: 0.420, y: 0.705 },
    R4_C4: { x: 0.505, y: 0.705 },
    R4_C5: { x: 0.590, y: 0.705 },
    R3_C3: { x: 0.385, y: 0.625 },
    R3_C4: { x: 0.470, y: 0.625 },
};

export interface AndroidAutoDeploySwipe {
    fromBench: BenchLocation;
    toBoard: BoardLocation;
    fromPoint: SimplePoint;
    toPoint: SimplePoint;
}

export function buildAndroidSafeObserveAutoDeploySwipes(actionTriggerCount: number): AndroidAutoDeploySwipe[] {
    const moveCount = Math.min(
        SAFE_OBSERVE_AUTO_DEPLOY_BENCH_SLOTS.length,
        SAFE_OBSERVE_AUTO_DEPLOY_BOARD_SLOTS.length,
        Math.max(2, actionTriggerCount + 1)
    );

    const swipes: AndroidAutoDeploySwipe[] = [];
    for (let index = 0; index < moveCount; index += 1) {
        const fromBench = SAFE_OBSERVE_AUTO_DEPLOY_BENCH_SLOTS[index];
        const toBoard = SAFE_OBSERVE_AUTO_DEPLOY_BOARD_SLOTS[index];
        swipes.push({
            fromBench,
            toBoard,
            fromPoint: ANDROID_SAFE_OBSERVE_BENCH_SLOT_POINTS[fromBench] ?? benchSlotPoints[fromBench],
            toPoint: ANDROID_SAFE_OBSERVE_BOARD_SLOT_POINTS[toBoard] ?? fightBoardSlotPoint[toBoard],
        });
    }
    return swipes;
}
