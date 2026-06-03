import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { loadJinChanSeasonPackSnapshot } from "../src-backend/data/JinChanSeasonPackLoader";

export interface AndroidSeasonCatalog {
    season: string;
    champions: string[];
    equipment: string[];
    championAliases: Record<string, string>;
    equipmentAliases: Record<string, string>;
    equipmentIconSignatures: Record<string, string>;
    /** Backward-compatible champion alias field consumed by older APK builds. */
    aliases: Record<string, string>;
}

export function buildAndroidSeasonCatalog(resourcesDir: string): AndroidSeasonCatalog {
    const snapshot = loadJinChanSeasonPackSnapshot(resourcesDir);
    if (!snapshot) {
        throw new Error(`Unable to load JinChan season pack from ${resourcesDir}`);
    }

    const champions = uniqueSortedByInputOrder(snapshot.champions.map((champion) => champion.name));
    const equipment = uniqueSortedByInputOrder(snapshot.items.map((item) => item.name));
    const championNameSet = new Set(champions);
    const equipmentNameSet = new Set(equipment);
    const correctionEntries = snapshot.ocrCorrections ?? [];
    const championAliases = Object.fromEntries(
        correctionEntries
            .filter((entry) => championNameSet.has(entry.correct))
            .map((entry) => [entry.incorrect, entry.correct])
    );
    const equipmentAliases = {
        ...buildCommonEquipmentAliases(equipmentNameSet),
        ...Object.fromEntries(
            correctionEntries
                .filter((entry) => equipmentNameSet.has(entry.correct))
                .map((entry) => [entry.incorrect, entry.correct])
        )
    };

    return {
        season: snapshot.versions.chess ?? "unknown",
        champions,
        equipment,
        championAliases,
        equipmentAliases,
        equipmentIconSignatures: {},
        aliases: championAliases
    };
}

export async function buildAndroidSeasonCatalogWithAssets(resourcesDir: string): Promise<AndroidSeasonCatalog> {
    const catalog = buildAndroidSeasonCatalog(resourcesDir);
    return {
        ...catalog,
        equipmentIconSignatures: await buildEquipmentIconSignatures(resourcesDir, new Set(catalog.equipment))
    };
}

export function writeAndroidSeasonCatalog(resourcesDir: string, outputPath: string): AndroidSeasonCatalog {
    const catalog = buildAndroidSeasonCatalog(resourcesDir);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    return catalog;
}

export async function writeAndroidSeasonCatalogWithAssets(
    resourcesDir: string,
    outputPath: string
): Promise<AndroidSeasonCatalog> {
    const catalog = await buildAndroidSeasonCatalogWithAssets(resourcesDir);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
    return catalog;
}

function uniqueSortedByInputOrder(values: string[]): string[] {
    return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

async function runCli(): Promise<void> {
    const [, , resourcesDirArg, outputPathArg] = process.argv;
    if (!resourcesDirArg) {
        throw new Error("Usage: tsx scripts/build-android-season-catalog.ts <ResourcesDir> [outputPath]");
    }

    const outputPath = outputPathArg
        ? path.resolve(outputPathArg)
        : path.resolve(process.cwd(), "android-app", "app", "src", "main", "assets", "tft-season-pack", "catalog.json");
    const catalog = await writeAndroidSeasonCatalogWithAssets(path.resolve(resourcesDirArg), outputPath);
    console.log(
        JSON.stringify(
            {
                outputPath,
                season: catalog.season,
                champions: catalog.champions.length,
                equipment: catalog.equipment.length,
                championAliases: Object.keys(catalog.championAliases).length,
                equipmentAliases: Object.keys(catalog.equipmentAliases).length,
                equipmentIconSignatures: Object.keys(catalog.equipmentIconSignatures).length
            },
            null,
            2
        )
    );
}

async function buildEquipmentIconSignatures(
    resourcesDir: string,
    equipmentNames: Set<string>
): Promise<Record<string, string>> {
    const imageDirs = findDirectoriesNamed(resourcesDir, "EquipmentImages");
    const entries: Array<[string, string]> = [];

    for (const imageDir of imageDirs) {
        for (const fileName of fs.readdirSync(imageDir)) {
            const imagePath = path.join(imageDir, fileName);
            if (!fs.statSync(imagePath).isFile() || !isSupportedImage(imagePath)) {
                continue;
            }

            const equipmentName = path.parse(fileName).name;
            if (!equipmentNames.has(equipmentName)) {
                continue;
            }

            entries.push([equipmentName, await buildImageSignature(imagePath)]);
        }
    }

    return Object.fromEntries(entries);
}

function findDirectoriesNamed(rootDir: string, targetName: string): string[] {
    const results: string[] = [];
    if (!fs.existsSync(rootDir)) {
        return results;
    }

    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
        const fullPath = path.join(rootDir, entry.name);
        if (!entry.isDirectory()) {
            continue;
        }
        if (entry.name === targetName) {
            results.push(fullPath);
            continue;
        }
        results.push(...findDirectoriesNamed(fullPath, targetName));
    }
    return results;
}

function isSupportedImage(imagePath: string): boolean {
    return [".png", ".jpg", ".jpeg", ".webp", ".svg"].includes(path.extname(imagePath).toLowerCase());
}

async function buildImageSignature(imagePath: string): Promise<string> {
    const { data } = await sharp(imagePath)
        .resize(8, 8, { fit: "fill", kernel: "nearest" })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const luminance: number[] = [];
    for (let index = 0; index < data.length; index += 3) {
        luminance.push(Math.round((data[index] * 299 + data[index + 1] * 587 + data[index + 2] * 114) / 1000));
    }
    const average = luminance.reduce((sum, value) => sum + value, 0) / Math.max(1, luminance.length);
    return luminance.map((value) => (value > average ? "1" : "0")).join("");
}

function buildCommonEquipmentAliases(equipmentNames: Set<string>): Record<string, string> {
    const commonAliases: Record<string, string> = {
        反曲弓: "反曲之弓",
        recurvebow: "反曲之弓",
        infinityedge: "无尽之刃",
        ie: "无尽之刃"
    };

    return Object.fromEntries(
        Object.entries(commonAliases).filter(([, canonicalName]) => equipmentNames.has(canonicalName))
    );
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
    runCli().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
