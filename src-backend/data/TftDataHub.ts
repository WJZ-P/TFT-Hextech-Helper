import {
    getChampionRange,
    getChessDataBySeason,
    getChessDataForMode,
    getEquipDataBySeason,
    TFTMode,
    type TFTEquip,
    type TFTUnit,
} from "../TFTProtocol";
import type { TraitData } from "../TFTProtocol";
import { TFT_16_TRAIT_DATA, TFT_4_TRAIT_DATA } from "../TFTInfo/trait";
import { UNSELLABLE_BOARD_UNITS } from "../TFTInfo/chess";
import { resolveChampionAlias } from "./TftNameNormalizer";
import type { LineupConfig } from "../lineup/LineupTypes";
import { tftDataService } from "../services/TftDataService";
import type { TftDataSnapshot } from "./types";

interface TftDataHubDependencies {
    snapshotProvider?: {
        getSnapshot(): TftDataSnapshot;
    };
    lineupProvider?: {
        getLineup(id: string): LineupConfig | undefined;
        getAllLineups(): LineupConfig[];
        getLineupsBySeason(season: string): LineupConfig[];
    };
}

function resolveSeasonKey(input?: string): string {
    if (input === "S4" || input === TFTMode.S4_RUISHOU) {
        return "S4";
    }

    return "S16";
}

export class TftDataHub {
    constructor(
        private readonly dependencies: TftDataHubDependencies = {
            snapshotProvider: tftDataService,
        }
    ) {}

    public getSnapshot(): TftDataSnapshot {
        return (this.dependencies.snapshotProvider ?? tftDataService).getSnapshot();
    }

    public getDisplayLineups() {
        return this.getSnapshot().lineups;
    }

    public getAutomationLineup(lineupId: string): LineupConfig | undefined {
        return this.dependencies.lineupProvider?.getLineup(lineupId);
    }

    public getAutomationLineups(season?: string): LineupConfig[] {
        const lineupProvider = this.dependencies.lineupProvider;
        if (!lineupProvider) {
            return [];
        }
        return season ? lineupProvider.getLineupsBySeason(season) : lineupProvider.getAllLineups();
    }

    public getSelectedAutomationLineups(lineupIds: string[]): LineupConfig[] {
        return lineupIds
            .map((lineupId) => this.getAutomationLineup(lineupId))
            .filter((lineup): lineup is LineupConfig => Boolean(lineup));
    }

    public getChampionCatalogForMode(mode: TFTMode): Record<string, TFTUnit> {
        return getChessDataForMode(mode);
    }

    public getChampionCatalogForSeason(season?: string): Record<string, TFTUnit> {
        return getChessDataBySeason(resolveSeasonKey(season));
    }

    /**
     * 查找棋子定义，支持中文名、英文id 或常见别名
     */
    public getChampionDefinition(name: string, season?: string): TFTUnit | undefined {
        if (!name) return undefined;
        const catalog = this.getChampionCatalogForSeason(season);
        // Direct lookup by Chinese name
        if (catalog[name]) return catalog[name];

        // Try resolving aliases / english ids using normalizer
        const resolved = resolveChampionAlias(name, catalog);
        if (resolved && catalog[resolved]) return catalog[resolved];

        return undefined;
    }

    public getEquipmentCatalogForSeason(season?: string): Record<string, TFTEquip> {
        return getEquipDataBySeason(resolveSeasonKey(season));
    }

    public getEquipmentDefinition(name: string, season?: string): TFTEquip | undefined {
        return this.getEquipmentCatalogForSeason(season)[name];
    }

    public getTraitCatalogForSeason(season?: string) {
        return resolveSeasonKey(season) === "S4" ? TFT_4_TRAIT_DATA : TFT_16_TRAIT_DATA;
    }

    /**
     * 获取当前游戏模式对应的羁绊数据
     * CLOCKWORK_TRAILS → S4 羁绊数据，其他模式 → S16 羁绊数据
     */
    public getTraitCatalogForMode(mode: TFTMode): typeof TFT_16_TRAIT_DATA {
        if (mode === TFTMode.CLOCKWORK_TRAILS) {
            return TFT_4_TRAIT_DATA as typeof TFT_16_TRAIT_DATA;
        }
        return TFT_16_TRAIT_DATA;
    }

    public getChampionRange(name: string): number | undefined {
        return getChampionRange(name as any) ?? undefined;
    }

    /**
     * 根据羁绊 key（中文名 或 羁绊 id）查找羁绊定义
     */
    public getTraitDefinition(traitKey: string, season?: string): TraitData | undefined {
        if (!traitKey) return undefined;
        const catalog = this.getTraitCatalogForSeason(season);
        // direct key (中文名)
        if ((catalog as Record<string, TraitData>)[traitKey]) {
            return (catalog as Record<string, TraitData>)[traitKey];
        }

        // search by id or name fallback
        for (const trait of Object.values(catalog)) {
            if (trait.id === traitKey || trait.name === traitKey) return trait;
        }

        return undefined;
    }

    /**
     * 返回指定棋子的所有羁绊激活节点的并集（升序，无重复）
     */
    public getTraitBreakpointsForChampion(championName: string, season?: string): number[] {
        const champ = this.getChampionDefinition(championName, season);
        if (!champ || !Array.isArray(champ.traits) || champ.traits.length === 0) return [];

        const catalog = this.getTraitCatalogForSeason(season);
        const numbers = new Set<number>();

        for (const traitKey of champ.traits) {
            const trait = (catalog as Record<string, TraitData>)[traitKey] ?? this.getTraitDefinition(traitKey, season);
            if (!trait || !Array.isArray(trait.levels)) continue;
            for (const n of trait.levels) numbers.add(n);
        }

        return Array.from(numbers).sort((a, b) => a - b);
    }

    /**
     * 根据装备 ID 查找装备中文名称
     * @param equipId 装备 ID（字符串）
     * @param season 赛季，默认为 S16
     */
    public getEquipmentNameById(equipId: string, season?: string): string | undefined {
        const equipData = this.getEquipmentCatalogForSeason(season);
        for (const [, equip] of Object.entries(equipData)) {
            if (equip.equipId === equipId) {
                return equip.name;
            }
        }
        return undefined;
    }

    /**
     * 检查某棋子是否为不可售卖的特殊单位（训练假人、魔像等）
     */
    public isUnitUnsellable(name: string): boolean {
        return UNSELLABLE_BOARD_UNITS.has(name);
    }

    /**
     * 判断某装备是否可穿戴（排除特殊道具，如拆卸器/重铸器，equipId="-1"）
     */
    public isWearableEquipment(name: string, season?: string): boolean {
        const data = this.getEquipmentDefinition(name, season);
        if (!data) return false;
        return data.equipId !== "-1";
    }

    /**
     * 根据装备散件组成推断前排/后排倾向
     */
    public getEquipmentRoleHint(name: string, season?: string): 'frontline' | 'backline' | 'any' {
        const components = this.getEquipmentComponents(name, season);
        if (components.length === 0) return 'any';
        const isFront = (n: string) => n === '锁子甲' || n === '负极斗篷' || n === '巨人腰带';
        const isBack = (n: string) => n === '反曲之弓' || n === '暴风之剑' || n === '无用大棒' || n === '女神之泪';
        if (components.length === 1) {
            if (isFront(components[0])) return 'frontline';
            if (isBack(components[0])) return 'backline';
            return 'any';
        }
        const frontCount = components.filter(isFront).length;
        const backCount = components.filter(isBack).length;
        if (frontCount === 2) return 'frontline';
        if (backCount === 2) return 'backline';
        return 'any';
    }

    /**
     * 判断某装备是否为基础散件（formula 为空字符串）
     */
    public isBaseComponentEquipment(name: string, season?: string): boolean {
        const equip = this.getEquipmentDefinition(name, season);
        if (!equip) return false;
        return (equip.formula ?? '').trim() === '';
    }

    /**
     * 获取装备的散件组成（基础散件返回 [自身]，成装返回 [散件1, 散件2]）
     */
    public getEquipmentComponents(name: string, season?: string): string[] {
        const equip = this.getEquipmentDefinition(name, season);
        if (!equip) return [];
        const formula = (equip.formula ?? '').trim();
        if (!formula) return [name];
        const [id1, id2] = formula.split(',');
        const n1 = id1 ? this.getEquipmentNameById(id1, season) : undefined;
        const n2 = id2 ? this.getEquipmentNameById(id2, season) : undefined;
        return [n1, n2].filter((n): n is string => Boolean(n));
    }
}
