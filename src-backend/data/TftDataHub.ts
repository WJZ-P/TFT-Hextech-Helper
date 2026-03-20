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
}
