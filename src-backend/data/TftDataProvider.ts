import axios, { type AxiosInstance } from "axios";
import fs from "fs";
import path from "path";
import {
    CHAMPION_EN_TO_CN,
    EQUIP_EN_TO_CN,
    TFT_16_CHESS_DATA,
    TFT_16_EQUIP_DATA,
    TFT_4_CHESS_DATA,
    TFT_4_EQUIP_DATA,
} from "../TFTProtocol";
import { TFT_16_TRAIT_DATA, TFT_4_TRAIT_DATA } from "../TFTInfo/trait";
import { logger } from "../utils/Logger";
import type {
    TftChampionData,
    TftDataSnapshot,
    TftItemData,
    TftLineupData,
    TftTraitData,
} from "./types";
import { loadJinChanSeasonPackSnapshot } from "./JinChanSeasonPackLoader";

const DEFAULT_REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_LINEUP_SEASON = "s16";
const DEFAULT_LINEUP_CHANNEL = "53";
const DEFAULT_CACHE_FILE = path.join(process.cwd(), ".cache", "tft-data-snapshot.json");
const DEFAULT_SEASON_PACK_DIR = path.join(process.cwd(), "season-packs");

const QQ_DATA_BASE = "https://game.gtimg.cn/images/lol/act/img/tft/js";
const LINEUP_BASE = "https://game.gtimg.cn/images/lol/act/tftzlkauto/json/lineupJson";

interface TftDataProviderOptions {
    refreshIntervalMs?: number;
    timeoutMs?: number;
    lineupSeason?: string;
    lineupChannel?: string;
    cacheFilePath?: string;
    seasonPackDir?: string;
    httpClient?: AxiosInstance;
}

function normalizeUrl(value: string | undefined): string | undefined {
    if (!value) {
        return undefined;
    }
    if (value.startsWith("//")) {
        return `https:${value}`;
    }
    return value;
}

function dedupe(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
}

function splitCsv(value: unknown): string[] {
    if (typeof value !== "string") {
        return [];
    }
    return value
        .split(/[,，]/)
        .map((part) => part.trim())
        .filter(Boolean);
}

export class TftDataProvider {
    private readonly httpClient: AxiosInstance;
    private readonly refreshIntervalMs: number;
    private readonly lineupSeason: string;
    private readonly lineupChannel: string;
    private readonly cacheFilePath: string;
    private readonly seasonPackDir: string;
    private snapshot: TftDataSnapshot | null = null;
    private lastRefreshTs = 0;

    constructor(options: TftDataProviderOptions = {}) {
        this.httpClient =
            options.httpClient ??
            axios.create({
                timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
            });
        this.refreshIntervalMs = options.refreshIntervalMs ?? DEFAULT_REFRESH_INTERVAL_MS;
        this.lineupSeason = options.lineupSeason ?? DEFAULT_LINEUP_SEASON;
        this.lineupChannel = options.lineupChannel ?? DEFAULT_LINEUP_CHANNEL;
        this.cacheFilePath = options.cacheFilePath ?? DEFAULT_CACHE_FILE;
        this.seasonPackDir = options.seasonPackDir ?? DEFAULT_SEASON_PACK_DIR;
    }

    public async refresh(force = false): Promise<void> {
        if (
            !force &&
            this.snapshot &&
            Date.now() - this.lastRefreshTs < this.refreshIntervalMs
        ) {
            return;
        }

        const seasonPackSnapshot = this.loadSeasonPackSnapshot();
        if (seasonPackSnapshot) {
            this.snapshot = seasonPackSnapshot;
            this.lastRefreshTs = Date.now();
            logger.info(
                `[TftDataProvider] 赛季资源包加载成功: 英雄 ${seasonPackSnapshot.champions.length}, 阵容 ${seasonPackSnapshot.lineups.length}`
            );
            return;
        }

        try {
            const remoteSnapshot = await this.fetchRemoteSnapshot();
            this.snapshot = remoteSnapshot;
            this.lastRefreshTs = Date.now();
            this.persistSnapshot(remoteSnapshot);
            logger.info(
                `[TftDataProvider] 远程数据刷新成功: 英雄 ${remoteSnapshot.champions.length}, 阵容 ${remoteSnapshot.lineups.length}`
            );
            return;
        } catch (error: any) {
            logger.warn(`[TftDataProvider] 远程刷新失败，将尝试回退: ${error?.message ?? error}`);
        }

        const cachedSnapshot = this.loadCachedSnapshot();
        if (cachedSnapshot) {
            this.snapshot = {
                ...cachedSnapshot,
                source: "cache",
                fetchedAt: new Date().toISOString(),
            };
            this.lastRefreshTs = Date.now();
            logger.info("[TftDataProvider] 已回退到本地缓存快照");
            return;
        }

        this.snapshot = this.buildFallbackSnapshot();
        this.lastRefreshTs = Date.now();
        logger.info("[TftDataProvider] 已回退到内置静态快照");
    }

    public getSnapshot(): TftDataSnapshot {
        if (!this.snapshot) {
            this.snapshot = this.loadSeasonPackSnapshot() ?? this.buildFallbackSnapshot();
            this.lastRefreshTs = Date.now();
        }
        return this.snapshot;
    }

    public getSeasonPackDir(): string {
        return this.seasonPackDir;
    }

    private loadSeasonPackSnapshot(): TftDataSnapshot | null {
        return loadJinChanSeasonPackSnapshot(this.seasonPackDir);
    }

    private async fetchRemoteSnapshot(): Promise<TftDataSnapshot> {
        const [
            chessResponse,
            equipResponse,
            raceResponse,
            jobResponse,
            hexResponse,
            lineupResponse,
        ] = await Promise.all([
            this.httpClient.get(`${QQ_DATA_BASE}/chess.js`),
            this.httpClient.get(`${QQ_DATA_BASE}/equip.js`),
            this.httpClient.get(`${QQ_DATA_BASE}/race.js`),
            this.httpClient.get(`${QQ_DATA_BASE}/job.js`),
            this.httpClient.get(`${QQ_DATA_BASE}/hex.js`),
            this.httpClient.get(
                `${LINEUP_BASE}/${this.lineupSeason}/${this.lineupChannel}/lineup_detail_total.json`
            ),
        ]);

        const chessList = this.readDataArray(chessResponse.data);
        const equipList = this.readDataArray(equipResponse.data);
        const raceList = this.readDataArray(raceResponse.data);
        const jobList = this.readDataArray(jobResponse.data);
        const lineupList = this.readLineupArray(lineupResponse.data);

        const champions = chessList.map((raw) => this.mapChampion(raw));
        const items = equipList.map((raw) => this.mapItem(raw));
        const traits = [
            ...raceList.map((raw) => this.mapTrait(raw, "origins")),
            ...jobList.map((raw) => this.mapTrait(raw, "classes")),
        ];

        const championNameById = new Map<string, string>();
        for (const champion of champions) {
            championNameById.set(champion.id, champion.name);
        }
        const itemNameById = new Map<string, string>();
        for (const item of items) {
            itemNameById.set(item.id, item.name);
        }

        const lineups = lineupList
            .map((raw) => this.mapLineup(raw, championNameById, itemNameById))
            .filter((lineup): lineup is TftLineupData => lineup !== null);

        return {
            fetchedAt: new Date().toISOString(),
            source: "remote",
            versions: {
                chess: this.readString(chessResponse.data, ["version"]),
                equip: this.readString(equipResponse.data, ["version"]),
                race: this.readString(raceResponse.data, ["version"]),
                job: this.readString(jobResponse.data, ["version"]),
                hex: this.readString(hexResponse.data, ["version"]),
                lineup: this.readString(lineupResponse.data, ["version"]),
            },
            champions,
            items,
            traits,
            lineups,
        };
    }

    private buildFallbackSnapshot(): TftDataSnapshot {
        const championMap = new Map<string, TftChampionData>();
        for (const unit of [...Object.values(TFT_16_CHESS_DATA), ...Object.values(TFT_4_CHESS_DATA)]) {
            const id = unit.englishId || unit.displayName;
            if (championMap.has(id)) {
                continue;
            }
            championMap.set(id, {
                id,
                name: unit.displayName,
                englishId: unit.englishId,
                cost: unit.price,
                traits: unit.traits ?? [],
            });
        }

        const itemMap = new Map<string, TftItemData>();
        for (const item of [...Object.values(TFT_16_EQUIP_DATA), ...Object.values(TFT_4_EQUIP_DATA)]) {
            const id = item.equipId || item.englishName || item.name;
            if (itemMap.has(id)) {
                continue;
            }
            itemMap.set(id, {
                id,
                name: item.name,
                englishName: item.englishName,
                formula: item.formula,
            });
        }

        const traitMap = new Map<string, TftTraitData>();
        const fallbackTraitEntries = [
            ...Object.values(TFT_16_TRAIT_DATA),
            ...Object.values(TFT_4_TRAIT_DATA),
        ];
        for (const trait of fallbackTraitEntries) {
            if (traitMap.has(trait.id)) {
                continue;
            }
            traitMap.set(trait.id, {
                id: trait.id,
                name: trait.name,
                type: trait.type,
                breakpoints: [...trait.levels],
            });
        }

        return {
            fetchedAt: new Date().toISOString(),
            source: "fallback",
            versions: {
                chess: "local",
                equip: "local",
                race: "local",
                job: "local",
                lineup: "local",
            },
            champions: [...championMap.values()],
            items: [...itemMap.values()],
            traits: [...traitMap.values()],
            lineups: this.loadLocalLineups(),
        };
    }

    private loadLocalLineups(): TftLineupData[] {
        const candidates = [
            process.env.VITE_PUBLIC
                ? path.join(process.env.VITE_PUBLIC, "lineups")
                : "",
            path.join(process.cwd(), "public", "lineups"),
        ].filter(Boolean);

        const rootDir = candidates.find((dir) => fs.existsSync(dir));
        if (!rootDir) {
            return [];
        }

        const lineups: TftLineupData[] = [];
        const seasonEntries = fs.readdirSync(rootDir, { withFileTypes: true });
        for (const seasonEntry of seasonEntries) {
            if (!seasonEntry.isDirectory()) {
                continue;
            }
            const seasonDir = path.join(rootDir, seasonEntry.name);
            const files = fs.readdirSync(seasonDir).filter((name) => name.endsWith(".json"));
            for (const fileName of files) {
                try {
                    const filePath = path.join(seasonDir, fileName);
                    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Record<string, any>;
                    const finalChampions = Array.isArray(parsed?.finalComp?.champions)
                        ? parsed.finalComp.champions
                        : [];
                    const championNames = dedupe(
                        finalChampions
                            .map((champion: any) => String(champion?.name ?? "").trim())
                            .filter(Boolean)
                    );
                    const coreChampions = dedupe(
                        finalChampions
                            .filter((champion: any) => champion?.isCore === true)
                            .map((champion: any) => String(champion?.name ?? "").trim())
                            .filter(Boolean)
                    );
                    const recommendedItems = dedupe(
                        finalChampions.flatMap((champion: any) =>
                            Array.isArray(champion?.items)
                                ? champion.items.map((item: unknown) => String(item))
                                : []
                        )
                    );

                    lineups.push({
                        id: String(parsed.id ?? fileName.replace(/\.json$/, "")),
                        name: String(parsed.name ?? fileName.replace(/\.json$/, "")),
                        season: String(parsed.season ?? seasonEntry.name),
                        champions: championNames,
                        coreChampions: coreChampions.length > 0 ? coreChampions : championNames.slice(0, 2),
                        recommendedItems,
                    });
                } catch (error) {
                    continue;
                }
            }
        }

        return lineups;
    }

    private readDataArray(payload: unknown): Record<string, unknown>[] {
        const record = payload as Record<string, unknown>;
        if (Array.isArray(record?.data)) {
            return record.data as Record<string, unknown>[];
        }
        if (Array.isArray(payload)) {
            return payload as Record<string, unknown>[];
        }
        return [];
    }

    private readLineupArray(payload: unknown): Record<string, unknown>[] {
        const record = payload as Record<string, unknown>;
        if (Array.isArray(record?.lineup_list)) {
            return record.lineup_list as Record<string, unknown>[];
        }
        return [];
    }

    private readString(source: unknown, keys: string[]): string | undefined {
        const record = source as Record<string, unknown>;
        for (const key of keys) {
            const value = record?.[key];
            if (typeof value === "string" && value.trim().length > 0) {
                return value.trim();
            }
            if (typeof value === "number" && Number.isFinite(value)) {
                return String(value);
            }
        }
        return undefined;
    }

    private readNumber(source: unknown, keys: string[]): number {
        const record = source as Record<string, unknown>;
        for (const key of keys) {
            const value = record?.[key];
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
                return parsed;
            }
        }
        return 0;
    }

    private mapChampion(raw: Record<string, unknown>): TftChampionData {
        const id = this.readString(raw, ["chessId", "TFTID", "id", "name", "displayName"]) ?? "unknown";
        const name = this.readString(raw, ["displayName", "name"]) ?? id;
        const englishId = this.readString(raw, ["hero_EN_name", "englishId"]);
        const traits = dedupe([
            ...splitCsv(raw.races),
            ...splitCsv(raw.jobs),
            ...splitCsv(raw.synergies),
        ]);

        return {
            id,
            name,
            englishId,
            cost: this.readNumber(raw, ["price", "cost"]),
            traits,
            imageUrl: normalizeUrl(
                this.readString(raw, [
                    "imagePath",
                    "originalImage",
                    "$avatar",
                    "json_chess_image_url",
                ])
            ),
        };
    }

    private mapItem(raw: Record<string, unknown>): TftItemData {
        const id = this.readString(raw, ["equipId", "TFTID", "id", "name", "displayName"]) ?? "unknown";
        return {
            id,
            name: this.readString(raw, ["name", "displayName"]) ?? id,
            englishName: this.readString(raw, ["englishName", "name_en"]),
            imageUrl: normalizeUrl(
                this.readString(raw, ["imagePath", "originalImage", "json_equip_url", "iconPath"])
            ),
            formula: this.readString(raw, ["formula"]),
        };
    }

    private mapTrait(raw: Record<string, unknown>, type: "origins" | "classes"): TftTraitData {
        const breakpoints = dedupe([
            ...Object.keys((raw.level as Record<string, unknown>) ?? {}),
            ...splitCsv(raw.race_color_list).map((entry) => entry.split(":")[0] ?? ""),
            ...splitCsv(raw.job_color_list).map((entry) => entry.split(":")[0] ?? ""),
        ])
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value))
            .sort((a, b) => a - b);

        return {
            id: this.readString(raw, ["traitId", "id", "raceId", "jobId"]) ?? "unknown",
            name: this.readString(raw, ["name"]) ?? "unknown",
            type,
            breakpoints,
            imageUrl: normalizeUrl(this.readString(raw, ["imagePath", "trait_icon"])),
        };
    }

    private mapLineup(
        raw: Record<string, unknown>,
        championNameById: Map<string, string>,
        itemNameById: Map<string, string>
    ): TftLineupData | null {
        const detailObject = this.parseLineupDetail(raw.detail);
        if (!detailObject) {
            return null;
        }

        const heroLocations = this.readArray(detailObject, [
            "hero_location",
            "hero_location_l9",
            "y21_metaphase_heros",
            "hero_location_l8",
        ]);

        const championIds = heroLocations
            .map((hero) => this.readString(hero, ["hero_id", "chessId", "id"]))
            .filter((value): value is string => Boolean(value));
        const champions = dedupe(
            championIds.map((id) => championNameById.get(id) ?? id)
        );

        const coreChampions = dedupe(
            heroLocations
                .filter((hero) => Boolean(hero.is_carry_hero))
                .map((hero) => this.readString(hero, ["hero_id", "chessId", "id"]))
                .filter((value): value is string => Boolean(value))
                .map((id) => championNameById.get(id) ?? id)
        );

        const equipmentOrder = splitCsv(this.readString(detailObject, ["equipment_order"]));
        const recommendedItems = dedupe(
            equipmentOrder.map((id) => itemNameById.get(id) ?? id)
        );

        const notes = [
            this.readString(detailObject, ["early_info"]),
            this.readString(detailObject, ["equipment_info"]),
            this.readString(detailObject, ["d_time"]),
            this.readString(detailObject, ["location_info"]),
        ].filter((value): value is string => Boolean(value));

        return {
            id: this.readString(raw, ["id"]) ?? `${Date.now()}`,
            name:
                this.readString(detailObject, ["line_name"]) ??
                this.readString(raw, ["id"]) ??
                "unknown-lineup",
            season: this.readString(raw, ["simulator_season", "season"]),
            quality: this.readString(raw, ["quality"]),
            updatedAt: this.readString(raw, ["update_time", "rel_time", "sub_time"]),
            champions,
            coreChampions: coreChampions.length > 0 ? coreChampions : champions.slice(0, 2),
            recommendedItems,
            notes,
        };
    }

    private parseLineupDetail(detail: unknown): Record<string, any> | null {
        if (typeof detail === "string") {
            try {
                return JSON.parse(detail) as Record<string, any>;
            } catch {
                return null;
            }
        }
        if (detail && typeof detail === "object") {
            return detail as Record<string, any>;
        }
        return null;
    }

    private readArray(
        source: Record<string, any>,
        keys: string[]
    ): Record<string, any>[] {
        for (const key of keys) {
            const value = source[key];
            if (Array.isArray(value)) {
                return value.filter((item) => Boolean(item && typeof item === "object"));
            }
        }
        return [];
    }

    private persistSnapshot(snapshot: TftDataSnapshot): void {
        try {
            fs.mkdirSync(path.dirname(this.cacheFilePath), { recursive: true });
            fs.writeFileSync(this.cacheFilePath, JSON.stringify(snapshot, null, 2), "utf8");
        } catch (error: any) {
            logger.warn(`[TftDataProvider] 写入缓存失败: ${error?.message ?? error}`);
        }
    }

    private loadCachedSnapshot(): TftDataSnapshot | null {
        try {
            if (!fs.existsSync(this.cacheFilePath)) {
                return null;
            }
            const raw = fs.readFileSync(this.cacheFilePath, "utf8");
            const parsed = JSON.parse(raw) as TftDataSnapshot;
            if (!Array.isArray(parsed?.champions) || !Array.isArray(parsed?.items)) {
                return null;
            }
            return parsed;
        } catch {
            return null;
        }
    }
}

export function buildDefaultTftDataProvider(): TftDataProvider {
    return new TftDataProvider();
}

export const championEnToCnMap = CHAMPION_EN_TO_CN as Record<string, string>;
export const equipEnToCnMap = EQUIP_EN_TO_CN as Record<string, string>;
