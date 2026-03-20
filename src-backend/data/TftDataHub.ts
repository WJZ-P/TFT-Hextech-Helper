import {
    getChampionRange,
    getChessDataBySeason,
    getChessDataForMode,
    getEquipDataBySeason,
    TFTMode,
    type TFTEquip,
    type TFTUnit,
} from "../TFTProtocol";
import { TFT_16_TRAIT_DATA, TFT_4_TRAIT_DATA } from "../TFTInfo/trait";
import { UNSELLABLE_BOARD_UNITS } from "../TFTInfo/chess";
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
