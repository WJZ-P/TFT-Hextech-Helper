import fs from "fs";
import path from "path";
import type { TftDataSnapshot } from "./types";
import { resolveJinChanSeasonPackLocation } from "./JinChanSeasonPackLoader";

const SUPPORTED_IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"] as const;
const DEFAULT_OUTPUT_ROOT = path.join(process.cwd(), "public", "resources", "season-packs");
const DEFAULT_PUBLIC_PREFIX = "resources/season-packs";

type AssetKind = "champion" | "equipment";
type AssetStatus = "copied" | "existing" | "missing" | "conflict";

export interface JinChanSeasonPackAssetEntry {
    kind: AssetKind;
    entityName: string;
    sourcePath: string | null;
    targetPath: string;
    publicPath: string;
    sourceFileName: string | null;
    targetFileName: string;
    status: AssetStatus;
    duplicateSources: string[];
}

export interface JinChanSeasonPackAssetReport {
    seasonName: string;
    outputDir: string;
    manifestPath: string;
    metadataPath: string;
    entries: JinChanSeasonPackAssetEntry[];
}

function extractLatestLineupUpdate(snapshot: TftDataSnapshot): string | null {
    const updatedValues = snapshot.lineups
        .map((lineup) => lineup.updatedAt)
        .filter((value): value is string => Boolean(value))
        .sort((left, right) => right.localeCompare(left));

    return updatedValues[0] ?? null;
}

function sanitizePathSegment(value: string): string {
    return value.replace(/[\\/:*?"<>|]/g, "-").trim();
}

function toPosixPath(value: string): string {
    return value.replace(/\\/g, "/");
}

function buildTargetFileName(entityName: string, extension: string): string {
    return `${sanitizePathSegment(entityName)}${extension.toLowerCase()}`;
}

function getCandidateFiles(directoryPath: string, entityName: string): string[] {
    return SUPPORTED_IMAGE_EXTENSIONS
        .map((extension) => path.join(directoryPath, `${entityName}${extension}`))
        .filter((candidatePath) => fs.existsSync(candidatePath));
}

function chooseSourceFile(directoryPath: string, entityName: string): { sourcePath: string | null; duplicates: string[] } {
    const candidates = getCandidateFiles(directoryPath, entityName);
    if (candidates.length === 0) {
        return {
            sourcePath: null,
            duplicates: [],
        };
    }

    return {
        sourcePath: candidates[0],
        duplicates: candidates.slice(1),
    };
}

function buildPublicPath(publicPrefix: string, seasonName: string, folderName: string, fileName: string): string {
    return toPosixPath(path.posix.join(publicPrefix, seasonName, folderName, fileName));
}

function syncEntityImage(input: {
    kind: AssetKind;
    entityName: string;
    sourceDirectory: string;
    outputDirectory: string;
    publicPrefix: string;
    seasonName: string;
    folderName: string;
}): JinChanSeasonPackAssetEntry {
    const { sourcePath, duplicates } = chooseSourceFile(input.sourceDirectory, input.entityName);
    const extension = sourcePath ? path.extname(sourcePath) : ".png";
    const targetFileName = buildTargetFileName(input.entityName, extension);
    const targetPath = path.join(input.outputDirectory, targetFileName);
    const publicPath = buildPublicPath(input.publicPrefix, input.seasonName, input.folderName, targetFileName);

    if (!sourcePath) {
        return {
            kind: input.kind,
            entityName: input.entityName,
            sourcePath: null,
            targetPath,
            publicPath,
            sourceFileName: null,
            targetFileName,
            status: "missing",
            duplicateSources: [],
        };
    }

    fs.mkdirSync(input.outputDirectory, { recursive: true });
    if (fs.existsSync(targetPath)) {
        return {
            kind: input.kind,
            entityName: input.entityName,
            sourcePath,
            targetPath,
            publicPath,
            sourceFileName: path.basename(sourcePath),
            targetFileName,
            status: "existing",
            duplicateSources: duplicates.map((candidate) => path.basename(candidate)),
        };
    }

    try {
        fs.copyFileSync(sourcePath, targetPath, fs.constants.COPYFILE_EXCL);
        return {
            kind: input.kind,
            entityName: input.entityName,
            sourcePath,
            targetPath,
            publicPath,
            sourceFileName: path.basename(sourcePath),
            targetFileName,
            status: "copied",
            duplicateSources: duplicates.map((candidate) => path.basename(candidate)),
        };
    } catch {
        return {
            kind: input.kind,
            entityName: input.entityName,
            sourcePath,
            targetPath,
            publicPath,
            sourceFileName: path.basename(sourcePath),
            targetFileName,
            status: "conflict",
            duplicateSources: duplicates.map((candidate) => path.basename(candidate)),
        };
    }
}

export function syncJinChanSeasonPackAssets(input: {
    baseDir: string;
    snapshot: TftDataSnapshot;
    outputRootDir?: string;
    publicPathPrefix?: string;
}): JinChanSeasonPackAssetReport | null {
    if (input.snapshot.source !== "season-pack") {
        return null;
    }

    const location = resolveJinChanSeasonPackLocation(input.baseDir);
    if (!location) {
        return null;
    }

    const outputRootDir = input.outputRootDir ?? DEFAULT_OUTPUT_ROOT;
    const publicPathPrefix = input.publicPathPrefix ?? DEFAULT_PUBLIC_PREFIX;
    const seasonDirectoryName = sanitizePathSegment(location.seasonName);
    const outputDir = path.join(outputRootDir, seasonDirectoryName);
    const championOutputDir = path.join(outputDir, "champions");
    const equipmentOutputDir = path.join(outputDir, "equipment");
    const championSourceDir = path.join(location.seasonDir, "images");
    const equipmentSourceDir = path.join(location.seasonDir, "EquipmentImages");

    const entries: JinChanSeasonPackAssetEntry[] = [
        ...input.snapshot.champions.map((champion) => syncEntityImage({
            kind: "champion",
            entityName: champion.name,
            sourceDirectory: championSourceDir,
            outputDirectory: championOutputDir,
            publicPrefix: publicPathPrefix,
            seasonName: seasonDirectoryName,
            folderName: "champions",
        })),
        ...input.snapshot.items.map((item) => syncEntityImage({
            kind: "equipment",
            entityName: item.name,
            sourceDirectory: equipmentSourceDir,
            outputDirectory: equipmentOutputDir,
            publicPrefix: publicPathPrefix,
            seasonName: seasonDirectoryName,
            folderName: "equipment",
        })),
    ];

    fs.mkdirSync(outputDir, { recursive: true });
    const manifestPath = path.join(outputDir, "asset-map.json");
    fs.writeFileSync(
        manifestPath,
        JSON.stringify(
            {
                seasonName: location.seasonName,
                generatedAt: new Date().toISOString(),
                entries: entries.map((entry) => ({
                    kind: entry.kind,
                    entityName: entry.entityName,
                    status: entry.status,
                    sourceFileName: entry.sourceFileName,
                    targetFileName: entry.targetFileName,
                    publicPath: entry.publicPath,
                    duplicateSources: entry.duplicateSources,
                })),
            },
            null,
            2
        ),
        "utf8"
    );

    const metadataPath = path.join(outputDir, "metadata.json");
    fs.writeFileSync(
        metadataPath,
        JSON.stringify(
            {
                seasonName: location.seasonName,
                source: input.snapshot.source,
                generatedAt: new Date().toISOString(),
                sourceRoot: location.rootDir,
                seasonDirectory: location.seasonDir,
                versions: input.snapshot.versions,
                latestLineupUpdate: extractLatestLineupUpdate(input.snapshot),
                counts: {
                    champions: input.snapshot.champions.length,
                    items: input.snapshot.items.length,
                    traits: input.snapshot.traits.length,
                    lineups: input.snapshot.lineups.length,
                    copiedAssets: entries.filter((entry) => entry.status === "copied").length,
                    existingAssets: entries.filter((entry) => entry.status === "existing").length,
                    missingAssets: entries.filter((entry) => entry.status === "missing").length,
                },
            },
            null,
            2
        ),
        "utf8"
    );

    return {
        seasonName: location.seasonName,
        outputDir,
        manifestPath,
        metadataPath,
        entries,
    };
}

export function applySeasonPackAssetPaths(
    snapshot: TftDataSnapshot,
    report: JinChanSeasonPackAssetReport | null
): TftDataSnapshot {
    if (!report) {
        return snapshot;
    }

    const championPathByName = new Map(
        report.entries
            .filter((entry) => entry.kind === "champion" && entry.status !== "missing")
            .map((entry) => [entry.entityName, entry.publicPath] as const)
    );
    const itemPathByName = new Map(
        report.entries
            .filter((entry) => entry.kind === "equipment" && entry.status !== "missing")
            .map((entry) => [entry.entityName, entry.publicPath] as const)
    );

    return {
        ...snapshot,
        champions: snapshot.champions.map((champion) => ({
            ...champion,
            imageUrl: championPathByName.get(champion.name) ?? champion.imageUrl,
        })),
        items: snapshot.items.map((item) => ({
            ...item,
            imageUrl: itemPathByName.get(item.name) ?? item.imageUrl,
        })),
    };
}
