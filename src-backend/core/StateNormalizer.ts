import { GameStageType, type TFTUnit } from "../TFTProtocol";
import type { BenchUnit, BoardUnit, IdentifiedEquip } from "../tft";
import type { GameClient } from "../utils/SettingsStore";
import type { ObservedState, ObservedUnit, PlatformTarget, ShopOffer } from "./types";

export interface NormalizeRuntimeStateInput {
    client: GameClient;
    target: PlatformTarget;
    stageText?: string;
    stageType?: GameStageType;
    level: number;
    currentXp: number;
    totalXp: number;
    gold: number;
    benchUnits: (BenchUnit | null)[];
    boardUnits: (BoardUnit | null)[];
    shopUnits: (TFTUnit | null)[];
    equipments: IdentifiedEquip[];
    metadata?: Record<string, unknown>;
}

function mapUnit(
    unit: { tftUnit: TFTUnit; starLevel: number; location?: string; equips?: { name: string }[] } | null
): ObservedUnit | null {
    if (!unit) {
        return null;
    }

    return {
        id: unit.tftUnit.englishId || unit.tftUnit.displayName,
        name: unit.tftUnit.displayName,
        star: unit.starLevel,
        cost: unit.tftUnit.price,
        location: unit.location,
        items: (unit.equips ?? []).map((item) => item.name),
        traits: unit.tftUnit.traits ?? [],
    };
}

function mapShop(shopUnits: (TFTUnit | null)[]): ShopOffer[] {
    return shopUnits.map((unit, index) => {
        if (!unit) {
            return {
                slot: index,
                unit: null,
                cost: null,
            };
        }

        return {
            slot: index,
            cost: unit.price,
            unit: {
                id: unit.englishId || unit.displayName,
                name: unit.displayName,
                star: 1,
                cost: unit.price,
                items: [],
                traits: unit.traits ?? [],
            },
        };
    });
}

export function normalizeRuntimeState(input: NormalizeRuntimeStateInput): ObservedState {
    const bench = input.benchUnits
        .map((unit) => mapUnit(unit))
        .filter((unit): unit is ObservedUnit => unit !== null);
    const board = input.boardUnits
        .map((unit) => mapUnit(unit))
        .filter((unit): unit is ObservedUnit => unit !== null);

    return {
        timestamp: Date.now(),
        client: input.client,
        target: input.target,
        stageText: input.stageText ?? "",
        stageType: input.stageType ?? GameStageType.UNKNOWN,
        level: input.level,
        currentXp: input.currentXp,
        totalXp: input.totalXp,
        gold: input.gold,
        bench,
        board,
        shop: mapShop(input.shopUnits),
        items: input.equipments.map((item) => item.name),
        metadata: input.metadata,
    };
}
