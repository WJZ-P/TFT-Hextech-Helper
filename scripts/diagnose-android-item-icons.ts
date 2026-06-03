import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export interface AndroidItemIconCrop {
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface AndroidItemIconDiagnostic {
    label: string;
    signature: string;
    match: { name: string; distance: number } | null;
}

export interface AndroidItemIconScanOptions {
    iconWidth: number;
    iconHeight: number;
    stride: number;
    maxDistance: number;
    maxResults: number;
}

export interface AndroidItemIconScanMatch {
    left: number;
    top: number;
    width: number;
    height: number;
    crop: AndroidItemIconCrop;
    kotlinCrop: string;
    signature: string;
    match: { name: string; distance: number };
}

type RawAndroidItemIconScanMatch = Omit<AndroidItemIconScanMatch, "kotlinCrop">;

export const DEFAULT_ANDROID_ITEM_ICON_CROPS: AndroidItemIconCrop[] = [
    { label: "item-1", x: 0.31, y: 0.55, width: 0.035, height: 0.055 },
    { label: "item-2", x: 0.38, y: 0.55, width: 0.035, height: 0.055 },
    { label: "item-3", x: 0.45, y: 0.55, width: 0.035, height: 0.055 },
    { label: "item-4", x: 0.52, y: 0.55, width: 0.035, height: 0.055 },
    { label: "item-5", x: 0.59, y: 0.55, width: 0.035, height: 0.055 },
    { label: "item-6", x: 0.66, y: 0.55, width: 0.035, height: 0.055 },
];

interface AndroidSeasonCatalogForIcons {
    equipmentIconSignatures?: Record<string, string>;
}

export function matchAndroidItemIconSignature(
    signature: string,
    equipmentIconSignatures: Record<string, string>,
    maxDistance = 8
): { name: string; distance: number } | null {
    let best: { name: string; distance: number } | null = null;
    for (const [name, candidate] of Object.entries(equipmentIconSignatures)) {
        const distance = hammingDistance(signature, candidate);
        if (distance === Number.POSITIVE_INFINITY) {
            continue;
        }
        if (!best || distance < best.distance) {
            best = { name, distance };
        }
    }
    return best && best.distance <= maxDistance ? best : null;
}

export async function diagnoseAndroidItemIcons(
    screenshotPath: string,
    catalogPath: string,
    crops: AndroidItemIconCrop[] = DEFAULT_ANDROID_ITEM_ICON_CROPS
): Promise<AndroidItemIconDiagnostic[]> {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as AndroidSeasonCatalogForIcons;
    const signatures = catalog.equipmentIconSignatures ?? {};
    const metadata = await sharp(screenshotPath).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (width <= 0 || height <= 0) {
        throw new Error(`Unable to read screenshot size: ${screenshotPath}`);
    }

    const diagnostics: AndroidItemIconDiagnostic[] = [];
    for (const crop of crops) {
        const signature = await buildCropSignature(screenshotPath, width, height, crop);
        diagnostics.push({
            label: crop.label,
            signature,
            match: matchAndroidItemIconSignature(signature, signatures),
        });
    }
    return diagnostics;
}

export async function scanAndroidItemIconMatches(
    screenshotPath: string,
    catalogPath: string,
    options: AndroidItemIconScanOptions = {
        iconWidth: 42,
        iconHeight: 42,
        stride: 24,
        maxDistance: 8,
        maxResults: 20,
    }
): Promise<AndroidItemIconScanMatch[]> {
    const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8")) as AndroidSeasonCatalogForIcons;
    const signatures = catalog.equipmentIconSignatures ?? {};
    const metadata = await sharp(screenshotPath).metadata();
    const frameWidth = metadata.width ?? 0;
    const frameHeight = metadata.height ?? 0;
    if (frameWidth <= 0 || frameHeight <= 0) {
        throw new Error(`Unable to read screenshot size: ${screenshotPath}`);
    }

    const matches: RawAndroidItemIconScanMatch[] = [];
    for (let top = 0; top <= frameHeight - options.iconHeight; top += options.stride) {
        for (let left = 0; left <= frameWidth - options.iconWidth; left += options.stride) {
            const signature = await buildAbsoluteCropSignature(
                screenshotPath,
                left,
                top,
                options.iconWidth,
                options.iconHeight
            );
            const match = matchAndroidItemIconSignature(signature, signatures, options.maxDistance);
            if (match) {
                matches.push({
                    left,
                    top,
                    width: options.iconWidth,
                    height: options.iconHeight,
                    crop: {
                        label: "",
                        x: left / frameWidth,
                        y: top / frameHeight,
                        width: options.iconWidth / frameWidth,
                        height: options.iconHeight / frameHeight,
                    },
                    signature,
                    match,
                });
            }
        }
    }

    return matches
        .sort((left, right) => left.match.distance - right.match.distance)
        .slice(0, options.maxResults)
        .map((match, index) => {
            const labeledCrop = {
                ...match.crop,
                label: `scan-${index + 1}`,
            };
            return {
                ...match,
                crop: labeledCrop,
                kotlinCrop: formatKotlinCrop(labeledCrop),
            };
        });
}

export async function writeAndroidItemIconMatchCrops(
    screenshotPath: string,
    outputDir: string,
    matches: AndroidItemIconScanMatch[]
): Promise<string[]> {
    await fs.promises.mkdir(outputDir, { recursive: true });
    const written: string[] = [];
    for (const match of matches) {
        const fileName = `${sanitizeFileName(match.crop.label)}-${sanitizeFileName(match.match.name)}-d${match.match.distance}.png`;
        const outputPath = path.join(outputDir, fileName);
        await sharp(screenshotPath)
            .extract({
                left: match.left,
                top: match.top,
                width: match.width,
                height: match.height,
            })
            .png()
            .toFile(outputPath);
        written.push(outputPath);
    }
    return written;
}

async function buildCropSignature(
    screenshotPath: string,
    frameWidth: number,
    frameHeight: number,
    crop: AndroidItemIconCrop
): Promise<string> {
    const left = clamp(Math.floor(frameWidth * crop.x), 0, frameWidth - 1);
    const top = clamp(Math.floor(frameHeight * crop.y), 0, frameHeight - 1);
    const width = clamp(Math.floor(frameWidth * crop.width), 1, frameWidth - left);
    const height = clamp(Math.floor(frameHeight * crop.height), 1, frameHeight - top);
    return buildAbsoluteCropSignature(screenshotPath, left, top, width, height);
}

async function buildAbsoluteCropSignature(
    screenshotPath: string,
    left: number,
    top: number,
    width: number,
    height: number
): Promise<string> {
    const { data } = await sharp(screenshotPath)
        .extract({ left, top, width, height })
        .resize(8, 8, { fit: "fill", kernel: "nearest" })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    return buildBinarySignature(data);
}

function buildBinarySignature(data: Buffer): string {
    const luminance: number[] = [];
    for (let index = 0; index < data.length; index += 3) {
        luminance.push(Math.round((data[index] * 299 + data[index + 1] * 587 + data[index + 2] * 114) / 1000));
    }
    const average = luminance.reduce((sum, value) => sum + value, 0) / Math.max(1, luminance.length);
    return luminance.map((value) => (value > average ? "1" : "0")).join("");
}

function hammingDistance(left: string, right: string): number {
    if (left.length !== right.length) {
        return Number.POSITIVE_INFINITY;
    }

    let distance = 0;
    for (let index = 0; index < left.length; index += 1) {
        if (left[index] !== right[index]) {
            distance += 1;
        }
    }
    return distance;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function formatKotlinCrop(crop: AndroidItemIconCrop): string {
    return `crop(frame, ${formatKotlinFloat(crop.x)}, ${formatKotlinFloat(crop.y)}, ${formatKotlinFloat(crop.width)}, ${formatKotlinFloat(crop.height)})`;
}

function formatKotlinFloat(value: number): string {
    return `${value.toFixed(6)}f`;
}

function sanitizeFileName(value: string): string {
    return value.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_").replace(/\s+/g, "_");
}

async function runCli(): Promise<void> {
    const args = process.argv.slice(2);
    const scan = args.includes("--scan");
    const maxDistance = readNumberFlag(args, "--max-distance");
    const maxResults = readNumberFlag(args, "--max-results");
    const writeCropsDir = readStringFlag(args, "--write-crops");
    const positional = args.filter((arg, index) => {
        if (!arg.startsWith("--")) {
            return !["--max-distance", "--max-results", "--write-crops"].includes(args[index - 1]);
        }
        return false;
    });
    const [screenshotArg, catalogArg] = positional;
    if (!screenshotArg) {
        throw new Error("Usage: tsx scripts/diagnose-android-item-icons.ts [--scan] [--write-crops <dir>] <screenshotPath> [catalogPath]");
    }

    const screenshotPath = path.resolve(screenshotArg);
    const catalogPath = catalogArg
        ? path.resolve(catalogArg)
        : path.resolve(process.cwd(), "android-app", "app", "src", "main", "assets", "tft-season-pack", "catalog.json");
    if (scan) {
        const matches = await scanAndroidItemIconMatches(screenshotPath, catalogPath, {
            iconWidth: 42,
            iconHeight: 42,
            stride: 24,
            maxDistance: maxDistance ?? 8,
            maxResults: maxResults ?? 20,
        });
        const writtenCrops = writeCropsDir
            ? await writeAndroidItemIconMatchCrops(screenshotPath, path.resolve(writeCropsDir), matches)
            : [];
        console.log(JSON.stringify({ screenshotPath, catalogPath, matches, writtenCrops }, null, 2));
        return;
    }

    const diagnostics = await diagnoseAndroidItemIcons(screenshotPath, catalogPath);
    console.log(JSON.stringify({ screenshotPath, catalogPath, diagnostics }, null, 2));
}

function readNumberFlag(args: string[], flag: string): number | null {
    const index = args.indexOf(flag);
    if (index < 0) {
        return null;
    }
    const value = Number(args[index + 1]);
    return Number.isFinite(value) ? value : null;
}

function readStringFlag(args: string[], flag: string): string | null {
    const index = args.indexOf(flag);
    if (index < 0) {
        return null;
    }
    const value = args[index + 1];
    return value && !value.startsWith("--") ? value : null;
}

const currentFilePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFilePath) {
    runCli().catch((error) => {
        console.error(error);
        process.exitCode = 1;
    });
}
