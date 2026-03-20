import { getChessDataBySeason, type TFTUnit } from "../../src-backend/TFTProtocol";
import { TFT_16_CHESS } from "../../public/TFTInfo/S16/chess";
import { TFT_4_CHESS } from "../../public/TFTInfo/S4/chess";

export type TftUiSeason = "S16" | "S4";

interface TftImageEntity {
    name: string;
    imageUrl?: string;
}

interface TftImageSnapshot {
    champions: TftImageEntity[];
    items: TftImageEntity[];
}

const OPGG_AVATAR_BASE_S16 = "https://c-tft-api.op.gg/img/set/16/tft-champion/tiles/{englishId}.tft_set16.png?image=q_auto:good,f_webp&v=1765176243";
const SPLASH_ART_BASE_S16 = "https://game.gtimg.cn/images/lol/tftstore/s16/624x318/{chessId}.jpg";
const SPLASH_ART_BASE_S4 = "https://game.gtimg.cn/images/lol/tftstore/s4/624x318/{chessId}.jpg";
const FALLBACK_AVATAR_BASE = "https://game.gtimg.cn/images/lol/act/img/tft/champions/{chessId}.png";
const FALLBACK_SPLASH_ART_BASE = "https://game.gtimg.cn/images/lol/tftstore/s4.5m16/624x318/{chessId}.jpg";
const EQUIP_ICON_BASE = "https://game.gtimg.cn/images/lol/act/img/tft/equip/{equipId}.png";

function normalizeRendererAssetPath(assetPath: string): string {
    if (!assetPath) {
        return "";
    }

    if (/^(https?:|data:|blob:|file:|\/)/i.test(assetPath)) {
        return assetPath;
    }

    return `./${assetPath.replace(/^\.\//, "")}`;
}

function uniqueSources(sources: Array<string | null | undefined>): string[] {
    return [...new Set(sources.map((source) => source?.trim() ?? "").filter(Boolean))];
}

function buildImageLookup(entities: TftImageEntity[]): Map<string, string> {
    return new Map(
        entities
            .filter((entity) => entity.imageUrl)
            .map((entity) => [entity.name, normalizeRendererAssetPath(entity.imageUrl as string)] as const)
    );
}

function getChessId(cnName: string, season: TftUiSeason): string {
    const chessList = season === "S4" ? TFT_4_CHESS : TFT_16_CHESS;
    const chessItem = chessList.find((chess: any) => chess.displayName === cnName);
    return chessItem?.chessId || "";
}

function getUnitData(cnName: string, season: TftUiSeason): TFTUnit | undefined {
    const chessData = getChessDataBySeason(season) as Record<string, TFTUnit>;
    return chessData[cnName];
}

function getCdnAvatarSources(cnName: string, season: TftUiSeason): string[] {
    const chessId = getChessId(cnName, season);
    const unitData = getUnitData(cnName, season);
    if (!chessId || !unitData) {
        return [];
    }

    if (season === "S4") {
        return [FALLBACK_AVATAR_BASE.replace("{chessId}", chessId)];
    }

    // S16: only use OP.GG — Tencent champions/{chessId}.png is broken for S16
    return [OPGG_AVATAR_BASE_S16.replace("{englishId}", unitData.englishId)];
}

function getCdnSplashSources(cnName: string, season: TftUiSeason): string[] {
    const chessId = getChessId(cnName, season);
    if (!chessId) {
        return [];
    }

    const primary = (season === "S4" ? SPLASH_ART_BASE_S4 : SPLASH_ART_BASE_S16).replace("{chessId}", chessId);
    return uniqueSources([primary, FALLBACK_SPLASH_ART_BASE.replace("{chessId}", chessId)]);
}

function getCdnEquipSources(equipId?: string): string[] {
    if (!equipId) {
        return [];
    }

    return [EQUIP_ICON_BASE.replace("{equipId}", equipId)];
}

export interface TftAssetResolver {
    resolveChampionAvatarSources: (championName: string, season: TftUiSeason) => string[];
    resolveChampionSplashSources: (championName: string, season: TftUiSeason) => string[];
    resolveItemIconSources: (itemName: string, equipId?: string) => string[];
}

export function createTftAssetResolver(snapshot?: TftImageSnapshot | null): TftAssetResolver {
    const championImageByName = buildImageLookup(snapshot?.champions ?? []);
    const itemImageByName = buildImageLookup(snapshot?.items ?? []);

    return {
        resolveChampionAvatarSources(championName: string, season: TftUiSeason): string[] {
            const snapshotUrl = championImageByName.get(championName);
            
            // S16: Skip snapshot URLs from Tencent CDN (game.gtimg.cn) because nearly all
            // S16 champions have ability/skill icon URLs embedded as their imageUrl
            // (e.g. tft16_jinx_q1, tft16_garen_e1, tft16_viw2, etc.).
            // Pattern-matching individual ability names is a losing game with 28+ variants.
            // Local season-pack paths are safe to use; only remote Tencent CDN is unreliable.
            // OP.GG is the only reliable remote source for S16 champion portraits.
            const isTencentCdnUrl = snapshotUrl && /game\.gtimg\.cn/i.test(snapshotUrl);
            const safeSnapshotUrl = season === "S16" && isTencentCdnUrl ? undefined : snapshotUrl;
            
            return uniqueSources([
                safeSnapshotUrl,
                ...getCdnAvatarSources(championName, season),
            ]);
        },

        resolveChampionSplashSources(championName: string, season: TftUiSeason): string[] {
            return getCdnSplashSources(championName, season);
        },

        resolveItemIconSources(itemName: string, equipId?: string): string[] {
            return uniqueSources([
                itemImageByName.get(itemName),
                ...getCdnEquipSources(equipId),
            ]);
        },
    };
}

export function resolveSingleAssetSource(sources: string[]): string {
    return sources[0] ?? "";
}
