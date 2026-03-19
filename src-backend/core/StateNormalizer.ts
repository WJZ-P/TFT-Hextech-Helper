import { GameStageType, TFTMode, type TFTUnit } from "../TFTProtocol";
import { TFT_16_TRAIT_DATA, TFT_4_TRAIT_DATA } from "../TFTInfo/trait";
import type { BenchUnit, BoardUnit, IdentifiedEquip } from "../tft";
import type { GameClient } from "../utils/SettingsStore";
import type { ObservedState, ObservedTrait, ObservedUnit, PlatformTarget, ShopOffer } from "./types";

export interface NormalizeRuntimeStateInput {
    client: GameClient;
    target: PlatformTarget;
    mode?: TFTMode;
    stageText?: string;
    stageType?: GameStageType;
    level: number;
    currentXp: number;
    totalXp: number;
    gold: number;
    hp?: number;
    benchUnits: (BenchUnit | null)[];
    boardUnits: (BoardUnit | null)[];
    shopUnits: (TFTUnit | null)[];
    equipments: IdentifiedEquip[];
    metadata?: Record<string, unknown>;
}

function getTraitDataForMode(mode?: TFTMode) {
    return mode === TFTMode.S4_RUISHOU ? TFT_4_TRAIT_DATA : TFT_16_TRAIT_DATA;
}

function resolveEmblemTrait(itemName: string, traitData: Record<string, { levels: number[] }>): string | null {
    const match = itemName.match(/(.+?)(纹章|徽章)$/);
    if (!match) {
        return null;
    }

    const traitName = match[1];
    return traitData[traitName] ? traitName : null;
}

function buildActiveTraits(
    boardUnits: (BoardUnit | null)[],
    mode?: TFTMode
): ObservedTrait[] {
    const traitData = getTraitDataForMode(mode);
    const counts = new Map<string, number>();

    for (const unit of boardUnits) {
        if (!unit) {
            continue;
        }

        for (const trait of unit.tftUnit.traits ?? []) {
            counts.set(trait, (counts.get(trait) ?? 0) + 1);
        }

        for (const item of unit.equips ?? []) {
            const emblemTrait = resolveEmblemTrait(item.name, traitData);
            if (emblemTrait) {
                counts.set(emblemTrait, (counts.get(emblemTrait) ?? 0) + 1);
            }
        }
    }

    return [...counts.entries()]
        .map(([name, count]) => {
            const data = traitData[name];
            const levels = data?.levels ?? [];
            const required = levels[0] ?? null;
            return {
                name,
                count,
                required,
                levels,
                active: required !== null ? count >= required : false,
            } satisfies ObservedTrait;
        })
        .sort((left, right) => {
            if (left.active !== right.active) {
                return left.active ? -1 : 1;
            }
            if (left.count !== right.count) {
                return right.count - left.count;
            }
            return left.name.localeCompare(right.name);
        });
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
        hp: input.hp,
        bench,
        board,
        shop: mapShop(input.shopUnits),
        items: input.equipments.map((item) => item.name),
        activeTraits: buildActiveTraits(input.boardUnits, input.mode),
        metadata: input.metadata,
    };
}
