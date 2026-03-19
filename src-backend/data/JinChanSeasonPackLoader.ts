import fs from "fs";
import path from "path";
import type {
    TftChampionData,
    TftDataSnapshot,
    TftItemData,
    TftLineupData,
    TftOcrCorrectionContext,
    TftOcrCorrectionEntry,
    TftTraitData,
} from "./types";

interface SeasonPackLocation {
    rootDir: string;
    seasonDir: string;
    seasonName: string;
}

interface JinChanLineUpUnit {
    HeroName?: unknown;
    EquipmentNames?: unknown;
}

interface RecommendedEquipmentMap {
    [heroName: string]: string[];
}

const REQUIRED_FILES = ["HeroData.json", "Equipment.json"];

function stripBom(raw: string): string {
    return raw.replace(/^\uFEFF/, "");
}

function readJsonFile(filePath: string): unknown | null {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }

        return JSON.parse(stripBom(fs.readFileSync(filePath, "utf8")));
    } catch {
        return null;
    }
}

function dedupeStrings(values: string[]): string[] {
    return [...new Set(values.filter(Boolean))];
}

function isSupportedContext(value: unknown): value is TftOcrCorrectionContext {
    return value === "all" || value === "stage" || value === "shop";
}

function isPackDirectory(directoryPath: string): boolean {
    return REQUIRED_FILES.every((fileName) => fs.existsSync(path.join(directoryPath, fileName)));
}

function resolveSeasonPackLocation(baseDir: string): SeasonPackLocation | null {
    if (!fs.existsSync(baseDir)) {
        return null;
    }

    if (isPackDirectory(baseDir)) {
        return {
            rootDir: path.dirname(baseDir),
            seasonDir: baseDir,
            seasonName: path.basename(baseDir),
        };
    }

    const seasonCandidates = fs.readdirSync(baseDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right, "zh-CN"));

    for (const seasonName of seasonCandidates) {
        const seasonDir = path.join(baseDir, seasonName);
        if (!isPackDirectory(seasonDir)) {
            continue;
        }

        return {
            rootDir: baseDir,
            seasonDir,
            seasonName,
        };
    }

    return null;
}

function readString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return dedupeStrings(value.map((entry) => readString(entry)).filter(Boolean));
}

function mapChampion(raw: unknown): TftChampionData | null {
    const record = raw as Record<string, unknown>;
    const name = readString(record?.HeroName);
    if (!name) {
        return null;
    }

    const professions = readStringArray(record?.Profession);
    const peculiarities = readStringArray(record?.Peculiarity);

    return {
        id: name,
        name,
        cost: Number(record?.Cost) || 0,
        traits: dedupeStrings([...professions, ...peculiarities]),
    };
}

function mapTraitEntries(rawHeroes: unknown[]): TftTraitData[] {
    const traitMap = new Map<string, TftTraitData>();

    for (const rawHero of rawHeroes) {
        const record = rawHero as Record<string, unknown>;
        for (const profession of readStringArray(record?.Profession)) {
            if (!traitMap.has(`class:${profession}`)) {
                traitMap.set(`class:${profession}`, {
                    id: profession,
                    name: profession,
                    type: "classes",
                    breakpoints: [],
                });
            }
        }

        for (const peculiarity of readStringArray(record?.Peculiarity)) {
            if (!traitMap.has(`origin:${peculiarity}`)) {
                traitMap.set(`origin:${peculiarity}`, {
                    id: peculiarity,
                    name: peculiarity,
                    type: "origins",
                    breakpoints: [],
                });
            }
        }
    }

    return [...traitMap.values()];
}

function mapItem(raw: unknown): TftItemData | null {
    const record = raw as Record<string, unknown>;
    const name = readString(record?.Name);
    if (!name) {
        return null;
    }

    const syntheticPathway = readStringArray(record?.SyntheticPathway);

    return {
        id: name,
        name,
        formula: syntheticPathway.length > 0 ? syntheticPathway.join(",") : undefined,
    };
}

function parseEquipmentData(payload: unknown): RecommendedEquipmentMap {
    if (!payload || typeof payload !== "object") {
        return {};
    }

    if (Array.isArray(payload)) {
        const mappedEntries = payload.flatMap((entry) => {
            const record = entry as Record<string, unknown>;
            const heroName = readString(record.heroName);
            const equipments = readStringArray(record.equipments);
            return heroName ? [[heroName, equipments] as const] : [];
        });

        return Object.fromEntries(mappedEntries);
    }

    return Object.fromEntries(
        Object.entries(payload as Record<string, unknown>).map(([heroName, equipments]) => [heroName, readStringArray(equipments)])
    );
}

function getLineUpUnits(rawLineup: unknown): JinChanLineUpUnit[] {
    const record = rawLineup as Record<string, unknown>;

    if (Array.isArray(record?.LineUpUnits)) {
        return record.LineUpUnits as JinChanLineUpUnit[];
    }

    if (Array.isArray(record?.SubLineUps)) {
        return (record.SubLineUps as Array<Record<string, unknown>>).flatMap((subLineUp) =>
            Array.isArray(subLineUp?.LineUpUnits) ? (subLineUp.LineUpUnits as JinChanLineUpUnit[]) : []
        );
    }

    return [];
}

function buildLineupFromUnits(input: {
    id: string;
    name: string;
    season: string;
    updatedAt?: string;
    quality?: string;
    notes?: string[];
    units: JinChanLineUpUnit[];
    equipmentByHero: RecommendedEquipmentMap;
}): TftLineupData | null {
    const champions = dedupeStrings(input.units.map((unit) => readString(unit.HeroName)).filter(Boolean));
    if (champions.length === 0) {
        return null;
    }

    const equippedChampions = dedupeStrings(
        input.units
            .filter((unit) => readStringArray(unit.EquipmentNames).length > 0)
            .map((unit) => readString(unit.HeroName))
            .filter(Boolean)
    );
    const coreChampions = equippedChampions.length > 0 ? equippedChampions : champions.slice(0, 2);
    const recommendedItems = dedupeStrings([
        ...input.units.flatMap((unit) => readStringArray(unit.EquipmentNames)),
        ...coreChampions.flatMap((champion) => input.equipmentByHero[champion] ?? []),
    ]);

    return {
        id: input.id,
        name: input.name,
        season: input.season,
        quality: input.quality,
        updatedAt: input.updatedAt,
        champions,
        coreChampions,
        recommendedItems,
        notes: input.notes && input.notes.length > 0 ? dedupeStrings(input.notes) : undefined,
    };
}

function mapStandardLineups(
    payload: unknown,
    seasonName: string,
    equipmentByHero: RecommendedEquipmentMap
): TftLineupData[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload
        .map((rawLineup, index) => {
            const record = rawLineup as Record<string, unknown>;
            const name = readString(record?.LineUpName) || `lineup-${index + 1}`;
            const notes = Array.isArray(record?.SubLineUps)
                ? (record.SubLineUps as Array<Record<string, unknown>>)
                    .map((subLineUp) => readString(subLineUp?.SubLineUpName))
                    .filter(Boolean)
                : [];

            return buildLineupFromUnits({
                id: name,
                name,
                season: seasonName,
                notes,
                units: getLineUpUnits(rawLineup),
                equipmentByHero,
            });
        })
        .filter((lineup): lineup is TftLineupData => lineup !== null);
}

function mapRecommendedLineups(
    payload: unknown,
    seasonName: string,
    equipmentByHero: RecommendedEquipmentMap
): TftLineupData[] {
    const record = payload as Record<string, unknown>;
    const updatedAt = readString(record?.UpdateTime) || undefined;
    const rawLineups = Array.isArray(record?.LineUps)
        ? record.LineUps
        : Array.isArray(payload)
            ? payload
            : [];

    return rawLineups
        .map((rawLineup, index) => {
            const lineupRecord = rawLineup as Record<string, unknown>;
            const name = readString(lineupRecord?.LineUpName) || `recommended-lineup-${index + 1}`;
            const tags = readStringArray(lineupRecord?.Tags);
            const description = readString(lineupRecord?.Description);

            return buildLineupFromUnits({
                id: name,
                name,
                season: seasonName,
                updatedAt,
                quality: readString(lineupRecord?.Tier) || undefined,
                notes: [...tags, description].filter(Boolean),
                units: getLineUpUnits(rawLineup),
                equipmentByHero,
            });
        })
        .filter((lineup): lineup is TftLineupData => lineup !== null);
}

function mergeLineups(lineups: TftLineupData[]): TftLineupData[] {
    const lineupMap = new Map<string, TftLineupData>();

    for (const lineup of lineups) {
        const existing = lineupMap.get(lineup.name);
        if (!existing) {
            lineupMap.set(lineup.name, lineup);
            continue;
        }

        lineupMap.set(lineup.name, {
            ...existing,
            ...lineup,
            champions: dedupeStrings([...existing.champions, ...lineup.champions]),
            coreChampions: dedupeStrings([...existing.coreChampions, ...lineup.coreChampions]),
            recommendedItems: dedupeStrings([...existing.recommendedItems, ...lineup.recommendedItems]),
            notes: dedupeStrings([...(existing.notes ?? []), ...(lineup.notes ?? [])]),
        });
    }

    return [...lineupMap.values()];
}

function mapCorrections(payload: unknown): TftOcrCorrectionEntry[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload.flatMap((entry) => {
        const record = entry as Record<string, unknown>;
        if (Array.isArray(record?.Incorrect) && typeof record?.Correct === "string") {
            return record.Incorrect
                .map((incorrect) => readString(incorrect))
                .filter(Boolean)
                .map((incorrect) => ({
                    incorrect,
                    correct: record.Correct as string,
                    context: "all" as const,
                }));
        }

        const incorrect = readString(record?.incorrect);
        const correct = readString(record?.correct);
        if (!incorrect || !correct) {
            return [];
        }

        return [{
            incorrect,
            correct,
            context: isSupportedContext(record?.context) ? record.context : "all",
        }];
    });
}

export function loadJinChanSeasonPackSnapshot(baseDir: string): TftDataSnapshot | null {
    const location = resolveSeasonPackLocation(baseDir);
    if (!location) {
        return null;
    }

    const heroPayload = readJsonFile(path.join(location.seasonDir, "HeroData.json"));
    const equipmentPayload = readJsonFile(path.join(location.seasonDir, "Equipment.json"));
    if (!Array.isArray(heroPayload) || !Array.isArray(equipmentPayload)) {
        return null;
    }

    const equipmentDataPayload = readJsonFile(path.join(location.seasonDir, "EquipmentData.json"));
    const lineupsPayload = readJsonFile(path.join(location.seasonDir, "LineUps.json"));
    const recommendedLineupsPayload = readJsonFile(path.join(location.seasonDir, "RecommendedLineUps.json"));
    const correctionsPayload =
        readJsonFile(path.join(location.seasonDir, "CorrectionsList.json")) ??
        readJsonFile(path.join(location.rootDir, "CorrectionsList.json"));

    const champions = heroPayload
        .map((rawHero) => mapChampion(rawHero))
        .filter((champion): champion is TftChampionData => champion !== null);
    const items = equipmentPayload
        .map((rawItem) => mapItem(rawItem))
        .filter((item): item is TftItemData => item !== null);
    if (champions.length === 0 || items.length === 0) {
        return null;
    }

    const equipmentByHero = parseEquipmentData(equipmentDataPayload);
    const lineups = mergeLineups([
        ...mapStandardLineups(lineupsPayload, location.seasonName, equipmentByHero),
        ...mapRecommendedLineups(recommendedLineupsPayload, location.seasonName, equipmentByHero),
    ]);

    return {
        fetchedAt: new Date().toISOString(),
        source: "season-pack",
        versions: {
            chess: location.seasonName,
            equip: location.seasonName,
            lineup: location.seasonName,
        },
        champions,
        items,
        traits: mapTraitEntries(heroPayload),
        lineups,
        ocrCorrections: mapCorrections(correctionsPayload),
    };
}
