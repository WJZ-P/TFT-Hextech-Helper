import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import cv from "@techstark/opencv-js";
import sharp from "sharp";
import { logger } from "../utils/Logger";
import { equipmentNamesMatch, normalizeEquipmentName } from "../data/TftNameNormalizer";
import {
    TFT_16_EQUIP_DATA,
    TFT_4_EQUIP_DATA,
    androidEquipmentRegion,
    benchSlotRegion,
    fightBoardSlotRegion,
    TFTMode,
    getChessDataForMode,
    getSeasonTemplateDir,
} from "../TFTProtocol";
import { normalizeRuntimeState } from "../core/StateNormalizer";
import { parseStageStringToEnum } from "../tft/utils/GameStageParser";
import {
    buildAndroidHudDigitVariants,
    buildChampionOcrVariants,
    extractLikelyStageText,
    OcrWorkerType,
    ocrService,
    resolveChampionNameFromText,
    screenCapture,
} from "../tft";
import { templateLoader } from "../tft/recognition/TemplateLoader";
import { templateMatcher } from "../tft/recognition/TemplateMatcher";
import type {
    AndroidRecognitionChampionFixture,
    AndroidRecognitionChampionResult,
    AndroidRecognitionReplayFixture,
    AndroidRecognitionReplayResult,
    AndroidRecognitionStaticEquipFixture,
    AndroidRecognitionStaticEquipResult,
    AndroidRecognitionStaticOccupancyResult,
    AndroidRecognitionStaticSnapshotFixture,
    AndroidRecognitionStaticSnapshotResult,
    AndroidRecognitionStageResult,
    AndroidRecognitionStaticTraitResult,
    AndroidRecognitionStaticUnitFixture,
    RecognitionSource,
} from "./RecognitionReplayTypes";
import type { BenchUnit, BoardUnit } from "../tft";

interface RecognitionFixtureFile {
    id?: string;
    label?: string;
    description?: string;
    mode?: TFTMode;
    referenceScenarioId?: string;
    notes?: string[];
    stage?: AndroidRecognitionReplayFixture["stage"];
    champions?: AndroidRecognitionReplayFixture["champions"];
    staticSnapshot?: AndroidRecognitionReplayFixture["staticSnapshot"];
}

interface LoadedFixture {
    fixture: AndroidRecognitionReplayFixture;
    filePath: string;
}

const LOCAL_FIXTURE_DIR = path.resolve(process.cwd(), "examples", "android-recognition-replay");
const REPO_FIXTURE_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "examples",
    "android-recognition-replay"
);

let openCvReadyPromise: Promise<void> | null = null;
const SLOT_OCCUPIED_DIFF_THRESHOLD = 6;
const FIXTURE_CHAMPION_ALIASES: Record<string, string> = {
    刀妹: "艾瑞莉娅",
};
const TRAIT_COUNT_TEMPLATE_LIBRARY = [
    {
        text: "3/5",
        filePath: path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "derived",
            "android-real-recording-20260315-ionia",
            "crops",
            "recording-board-2-5-trait-ionia-count.png"
        ),
    },
    {
        text: "1/2",
        filePath: path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "derived",
            "android-real-recording-20260315-ionia",
            "crops",
            "recording-board-2-5-trait-fighter-count.png"
        ),
    },
    {
        text: "1/2",
        filePath: path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "derived",
            "android-real-recording-20260315-ionia",
            "crops",
            "recording-board-2-5-trait-mage-count.png"
        ),
    },
] as const;

function isOpenCvReady(): boolean {
    try {
        const mat = new cv.Mat(1, 1, cv.CV_8UC1);
        mat.delete();
        return true;
    } catch {
        return false;
    }
}

function waitForOpenCvReady(): Promise<void> {
    if (isOpenCvReady()) {
        return Promise.resolve();
    }

    if (!openCvReadyPromise) {
        openCvReadyPromise = new Promise((resolve) => {
            const runtime = cv as typeof cv & { onRuntimeInitialized?: () => void };
            const previous = runtime.onRuntimeInitialized;

            runtime.onRuntimeInitialized = () => {
                previous?.();
                resolve();
            };
        });
    }

    return openCvReadyPromise;
}

function ensurePublicAssetRoot(): void {
    if (!process.env.VITE_PUBLIC) {
        process.env.VITE_PUBLIC = path.resolve(process.cwd(), "public");
    }
}

function withFixtureDefaults(fileName: string, payload: RecognitionFixtureFile): AndroidRecognitionReplayFixture {
    return {
        id: payload.id?.trim() || path.basename(fileName, path.extname(fileName)),
        label: payload.label?.trim() || path.basename(fileName, path.extname(fileName)),
        description: payload.description?.trim() || "安卓离线识别回放样例",
        mode: payload.mode ?? TFTMode.NORMAL,
        referenceScenarioId: payload.referenceScenarioId,
        notes: payload.notes ?? [],
        stage: payload.stage,
        champions: payload.champions ?? [],
        staticSnapshot: payload.staticSnapshot,
    };
}

async function findFixtureDirectory(): Promise<string | null> {
    for (const candidate of [LOCAL_FIXTURE_DIR, REPO_FIXTURE_DIR]) {
        try {
            const stat = await fs.stat(candidate);
            if (stat.isDirectory()) {
                return candidate;
            }
        } catch {
            // ignore
        }
    }

    return null;
}

function resolveInputPath(baseDir: string, targetPath: string): string {
    if (path.isAbsolute(targetPath)) {
        return targetPath;
    }

    return path.resolve(baseDir, targetPath);
}

async function loadFixtureFromPath(filePath: string): Promise<LoadedFixture> {
    const raw = JSON.parse(await fs.readFile(filePath, "utf8")) as RecognitionFixtureFile;
    return {
        fixture: withFixtureDefaults(path.basename(filePath), raw),
        filePath,
    };
}

async function ensureRecognitionTemplatesReady(mode: TFTMode): Promise<void> {
    ensurePublicAssetRoot();
    await waitForOpenCvReady();
    await ocrService.switchChessWorker(mode);
    await templateLoader.initialize({ watch: false });
    await templateLoader.switchSeason(getSeasonTemplateDir(mode));
}

async function recognizeChampionFromImage(
    imagePath: string,
    mode: TFTMode,
    region: AndroidRecognitionChampionFixture["region"]
): Promise<{
    name: string | null;
    confidence: number | null;
    rawText?: string;
    normalizedText?: string;
    source: RecognitionSource;
}> {
    const imageBuffer = await fs.readFile(imagePath);
    const chessData = getChessDataForMode(mode);
    const variants = await buildChampionOcrVariants(
        Buffer.from(imageBuffer),
        region === "SHOP" ? "SHOP" : "DETAIL"
    );

    for (const variant of variants) {
        const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.CHESS);
        const resolved = resolveChampionNameFromText(rawText, chessData);

        if (resolved.name) {
            return {
                name: resolved.name,
                confidence: resolved.score,
                rawText,
                normalizedText: resolved.normalizedText,
                source: "OCR",
            };
        }
    }

    const templateBuffer = variants.find((variant) => variant.label.includes("gray"))?.buffer ?? Buffer.from(imageBuffer);
    const mat = await screenCapture.pngBufferToMat(templateBuffer);

    try {
        if (mat.channels() > 1) {
            cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
        }

        const match = templateMatcher.matchChampionDetailed(mat);
        return {
            name: match?.name ?? null,
            confidence: match?.confidence ?? null,
            source: match?.name ? "TEMPLATE" : "NONE",
        };
    } finally {
        if (!mat.isDeleted()) {
            mat.delete();
        }
    }
}

async function evaluateChampionFixture(
    fixtureDir: string,
    mode: TFTMode,
    champion: AndroidRecognitionChampionFixture
): Promise<AndroidRecognitionChampionResult> {
    const chessData = getChessDataForMode(mode);
    const directResolution = resolveChampionNameFromText(champion.ocrText ?? "", chessData);
    const normalizedOcrText = directResolution.normalizedText;

    let recognizedName: string | null = directResolution.name;
    let recognizedSource: RecognitionSource = directResolution.name ? "OCR" : "NONE";
    let confidence: number | null = directResolution.name ? directResolution.score : null;
    let resolvedImagePath: string | undefined;

    if (!recognizedName && champion.imagePath) {
        resolvedImagePath = resolveInputPath(fixtureDir, champion.imagePath);
        await ensureRecognitionTemplatesReady(mode);

        const imageResult = await recognizeChampionFromImage(resolvedImagePath, mode, champion.region);
        recognizedName = imageResult.name;
        confidence = imageResult.confidence;
        recognizedSource = imageResult.source;
    }

    if (recognizedName === "empty") {
        recognizedName = null;
        recognizedSource = "NONE";
    }

    const passed =
        recognizedName === champion.expectedName &&
        (!champion.expectedSource || recognizedSource === champion.expectedSource);

    return {
        id: champion.id,
        region: champion.region,
        slot: champion.slot,
        expectedName: champion.expectedName,
        expectedSource: champion.expectedSource,
        ocrText: champion.ocrText,
        normalizedOcrText,
        recognizedName,
        recognizedSource,
        confidence,
        imagePath: resolvedImagePath,
        note: champion.note,
        passed,
    };
}

function evaluateStageFixture(
    fixtureDir: string,
    stage: AndroidRecognitionReplayFixture["stage"]
): AndroidRecognitionStageResult | null {
    if (!stage) {
        return null;
    }

    const extractedText = extractLikelyStageText(stage.ocrText);
    const recognizedType = parseStageStringToEnum(extractedText);
    const passed = extractedText === stage.expectedText && recognizedType === stage.expectedType;

    return {
        rawText: stage.ocrText,
        extractedText,
        expectedText: stage.expectedText,
        recognizedType,
        expectedType: stage.expectedType,
        imagePath: stage.imagePath ? resolveInputPath(fixtureDir, stage.imagePath) : undefined,
        note: stage.note,
        passed,
    };
}

async function cropRegionFromImage(
    imageBuffer: Buffer,
    metadata: sharp.Metadata,
    region: {
        leftTop: { x: number; y: number };
        rightBottom: { x: number; y: number };
    }
): Promise<Buffer> {
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (!width || !height) {
        throw new Error("无法读取静态帧尺寸");
    }

    const left = Math.max(0, Math.min(width - 1, Math.round(region.leftTop.x * width)));
    const top = Math.max(0, Math.min(height - 1, Math.round(region.leftTop.y * height)));
    const right = Math.max(left + 1, Math.min(width, Math.round(region.rightBottom.x * width)));
    const bottom = Math.max(top + 1, Math.min(height, Math.round(region.rightBottom.y * height)));

    return sharp(imageBuffer)
        .extract({
            left,
            top,
            width: right - left,
            height: bottom - top,
        })
        .png()
        .toBuffer();
}

async function calculateSlotDifference(
    cropBuffer: Buffer,
    templateMat: cv.Mat
): Promise<number> {
    let mat = await screenCapture.pngBufferToMat(cropBuffer);

    try {
        if (mat.channels() === 3) {
            cv.cvtColor(mat, mat, cv.COLOR_RGB2RGBA);
        } else if (mat.channels() === 1) {
            cv.cvtColor(mat, mat, cv.COLOR_GRAY2RGBA);
        }

        if (mat.cols !== templateMat.cols || mat.rows !== templateMat.rows) {
            const resized = new cv.Mat();
            cv.resize(mat, resized, new cv.Size(templateMat.cols, templateMat.rows), 0, 0, cv.INTER_AREA);
            mat.delete();
            mat = resized;
        }

        const diff = new cv.Mat();
        try {
            cv.absdiff(mat, templateMat, diff);
            const mean = cv.mean(diff);
            return (mean[0] + mean[1] + mean[2]) / 3;
        } finally {
            diff.delete();
        }
    } finally {
        if (!mat.isDeleted()) {
            mat.delete();
        }
    }
}

async function evaluateOccupancyResults(
    imageBuffer: Buffer,
    metadata: sharp.Metadata,
    expectedOccupiedSlots: Set<string>,
    regionMap: Record<string, { leftTop: { x: number; y: number }; rightBottom: { x: number; y: number } }>,
    templateResolver: (slot: string) => cv.Mat | null,
    region: "BOARD" | "BENCH"
): Promise<AndroidRecognitionStaticOccupancyResult[]> {
    const results: AndroidRecognitionStaticOccupancyResult[] = [];

    for (const slot of [...expectedOccupiedSlots]) {
        const slotRegion = regionMap[slot];
        if (!slotRegion) {
            results.push({
                region,
                slot,
                expectedOccupied: true,
                recognizedOccupied: false,
                meanDifference: null,
                passed: false,
            });
            continue;
        }

        const template = templateResolver(slot);
        if (!template) {
            results.push({
                region,
                slot,
                expectedOccupied: true,
                recognizedOccupied: false,
                meanDifference: null,
                passed: false,
            });
            continue;
        }

        const cropBuffer = await cropRegionFromImage(imageBuffer, metadata, slotRegion);
        const meanDifference = await calculateSlotDifference(cropBuffer, template);
        const recognizedOccupied = meanDifference >= SLOT_OCCUPIED_DIFF_THRESHOLD;

        results.push({
            region,
            slot,
            expectedOccupied: true,
            recognizedOccupied,
            meanDifference,
            passed: recognizedOccupied,
        });
    }

    return results;
}

async function evaluateEquipmentResults(
    fixtureDir: string,
    imageBuffer: Buffer,
    metadata: sharp.Metadata,
    equipments: AndroidRecognitionStaticEquipFixture[]
): Promise<AndroidRecognitionStaticEquipResult[]> {
    const results: AndroidRecognitionStaticEquipResult[] = [];

    for (const equipment of equipments) {
        const cropBuffer = equipment.imagePath
            ? await fs.readFile(resolveInputPath(fixtureDir, equipment.imagePath))
            : await (async () => {
                const region = androidEquipmentRegion[equipment.slot as keyof typeof androidEquipmentRegion];
                if (!region) {
                    return null;
                }

                return cropRegionFromImage(imageBuffer, metadata, region);
            })();

        if (!cropBuffer) {
            results.push({
                slot: equipment.slot,
                expectedName: equipment.expectedName,
                recognizedName: null,
                recognizedSource: "NONE",
                confidence: null,
                passed: false,
                note: equipment.note,
            });
            continue;
        }

        const mat = await screenCapture.pngBufferToMat(cropBuffer);

        try {
            if (mat.channels() === 4) {
                cv.cvtColor(mat, mat, cv.COLOR_RGBA2RGB);
            } else if (mat.channels() === 1) {
                cv.cvtColor(mat, mat, cv.COLOR_GRAY2RGB);
            }

            const match = templateMatcher.matchEquip(mat, {
                androidProfile: true,
                acceptWeakTopMatch: true,
            });
            const recognizedName = match && match.name !== "空槽位" ? match.name : null;
            results.push({
                slot: equipment.slot,
                expectedName: equipment.expectedName,
                recognizedName,
                recognizedSource: recognizedName ? "TEMPLATE" : "NONE",
                confidence: match?.confidence ?? null,
                passed: equipmentNamesMatch(recognizedName, equipment.expectedName),
                note: equipment.note,
            });
        } finally {
            if (!mat.isDeleted()) {
                mat.delete();
            }
        }
    }

    return results;
}

function getEquipDataForMode(mode: TFTMode) {
    return mode === TFTMode.S4_RUISHOU ? TFT_4_EQUIP_DATA : TFT_16_EQUIP_DATA;
}

function resolveFixtureEquipmentName(
    rawName: string,
    equipData: Record<string, ReturnType<typeof getEquipDataForMode>[string]>
): string | null {
    const canonicalName = normalizeEquipmentName(rawName);
    if (equipData[canonicalName]) {
        return canonicalName;
    }

    if (equipData[rawName]) {
        return rawName;
    }

    return null;
}

function resolveFixtureChampionName(
    rawName: string,
    chessData: Record<string, ReturnType<typeof getChessDataForMode>[string]>
): string | null {
    const aliasedName = FIXTURE_CHAMPION_ALIASES[rawName] ?? rawName;

    if (chessData[aliasedName]) {
        return aliasedName;
    }

    if (chessData[rawName]) {
        return rawName;
    }

    const resolved = resolveChampionNameFromText(aliasedName, chessData);
    return resolved.name ?? null;
}

function extractLikelyFractionText(rawText: string): string {
    const normalized = rawText.replace(/[^\d/]/g, "");
    const match = normalized.match(/(\d{1,2})\/(\d{1,2})/);
    if (!match) {
        return "";
    }

    return `${parseInt(match[1], 10)}/${parseInt(match[2], 10)}`;
}

function selectMostFrequentText(candidates: string[]): string {
    if (candidates.length === 0) {
        return "";
    }

    const counts = new Map<string, number>();
    for (const candidate of candidates) {
        counts.set(candidate, (counts.get(candidate) ?? 0) + 1);
    }

    return [...counts.entries()]
        .sort((left, right) => {
            if (right[1] !== left[1]) {
                return right[1] - left[1];
            }

            return left[0].localeCompare(right[0]);
        })[0]?.[0] ?? "";
}

async function calculateNormalizedImageDifference(leftImage: Buffer, rightImagePath: string): Promise<number> {
    const [leftBuffer, rightBuffer] = await Promise.all([
        sharp(leftImage)
            .resize({ width: 72, height: 40, fit: "fill" })
            .grayscale()
            .normalize()
            .raw()
            .toBuffer(),
        sharp(rightImagePath)
            .resize({ width: 72, height: 40, fit: "fill" })
            .grayscale()
            .normalize()
            .raw()
            .toBuffer(),
    ]);

    let totalDifference = 0;
    const length = Math.min(leftBuffer.length, rightBuffer.length);

    for (let index = 0; index < length; index += 1) {
        totalDifference += Math.abs(leftBuffer[index] - rightBuffer[index]);
    }

    return totalDifference / length;
}

async function matchTraitCountFromTemplateLibrary(
    imageBuffer: Buffer
): Promise<{ text: string; meanDifference: number } | null> {
    let bestMatch: { text: string; meanDifference: number } | null = null;

    for (const template of TRAIT_COUNT_TEMPLATE_LIBRARY) {
        try {
            const meanDifference = await calculateNormalizedImageDifference(imageBuffer, template.filePath);
            if (!bestMatch || meanDifference < bestMatch.meanDifference) {
                bestMatch = {
                    text: template.text,
                    meanDifference,
                };
            }
        } catch {
            // ignore missing templates in non-fixture environments
        }
    }

    if (!bestMatch) {
        return null;
    }

    return bestMatch.meanDifference <= 24 ? bestMatch : null;
}

function normalizeStarLevel(input?: number): -1 | 1 | 2 | 3 | 4 {
    if (input === 1 || input === 2 || input === 3 || input === 4) {
        return input;
    }

    return -1;
}

function buildBoardUnitsFromFixture(
    mode: TFTMode,
    units: AndroidRecognitionStaticUnitFixture[]
): BoardUnit[] {
    const chessData = getChessDataForMode(mode);
    const equipData = getEquipDataForMode(mode);

    return units.map((unit) => {
        const resolvedName = resolveFixtureChampionName(unit.expectedName, chessData);
        const resolvedUnit = resolvedName ? chessData[resolvedName] : null;
        if (!resolvedUnit) {
            throw new Error(`静态棋盘 fixture 包含未知棋子: ${unit.expectedName}`);
        }

        return {
            location: unit.slot as BoardUnit["location"],
            tftUnit: resolvedUnit,
            starLevel: normalizeStarLevel(unit.starLevel),
            equips: (unit.items ?? [])
                .map((itemName) => resolveFixtureEquipmentName(itemName, equipData))
                .filter((itemName): itemName is string => Boolean(itemName))
                .map((itemName) => equipData[itemName])
                .filter((item): item is NonNullable<typeof item> => Boolean(item)),
        };
    });
}

function buildBenchUnitsFromFixture(
    mode: TFTMode,
    units: AndroidRecognitionStaticUnitFixture[]
): BenchUnit[] {
    const chessData = getChessDataForMode(mode);
    const equipData = getEquipDataForMode(mode);

    return units.map((unit) => {
        const resolvedName = resolveFixtureChampionName(unit.expectedName, chessData);
        const resolvedUnit = resolvedName ? chessData[resolvedName] : null;
        if (!resolvedUnit) {
            throw new Error(`静态备战席 fixture 包含未知棋子: ${unit.expectedName}`);
        }

        return {
            location: unit.slot as BenchUnit["location"],
            tftUnit: resolvedUnit,
            starLevel: normalizeStarLevel(unit.starLevel),
            equips: (unit.items ?? [])
                .map((itemName) => resolveFixtureEquipmentName(itemName, equipData))
                .filter((itemName): itemName is string => Boolean(itemName))
                .map((itemName) => equipData[itemName])
                .filter((item): item is NonNullable<typeof item> => Boolean(item)),
        };
    });
}

function evaluateTraitResultsFromUnits(
    snapshot: AndroidRecognitionStaticSnapshotFixture,
    mode: TFTMode,
    source: "UNITS" | "FIXTURE" = "UNITS"
): AndroidRecognitionStaticTraitResult[] {
    const boardUnits = buildBoardUnitsFromFixture(mode, snapshot.boardUnits);
    const benchUnits = buildBenchUnitsFromFixture(mode, snapshot.benchUnits);
    const normalizedState = normalizeRuntimeState({
        client: "ANDROID" as any,
        target: "ANDROID_EMULATOR",
        mode,
        level: 1,
        currentXp: 0,
        totalXp: 0,
        gold: 0,
        benchUnits,
        boardUnits,
        shopUnits: [],
        equipments: [],
    });

    return (snapshot.expectedTraits ?? []).map((trait): AndroidRecognitionStaticTraitResult => {
        const recognized = normalizedState.activeTraits?.find((entry) => entry.name === trait.name);
        const recognizedCount = recognized?.count ?? 0;
        const recognizedActive = recognized?.active ?? false;

        return {
            name: trait.name,
            expectedCount: trait.expectedCount,
            recognizedCount,
            expectedActive: trait.expectedActive,
            recognizedActive,
            expectedText: trait.expectedText,
            recognizedText: undefined,
            imagePath: trait.imagePath,
            recognizedSource: source,
            passed: recognizedCount === trait.expectedCount && recognizedActive === trait.expectedActive,
            note: trait.note,
        };
    });
}

async function evaluateTraitResults(
    fixtureDir: string,
    snapshot: AndroidRecognitionStaticSnapshotFixture,
    mode: TFTMode
): Promise<AndroidRecognitionStaticTraitResult[]> {
    const traits = snapshot.expectedTraits ?? [];
    if (traits.length === 0) {
        return [];
    }

    let unitBackedTraitResults: AndroidRecognitionStaticTraitResult[] = [];
    try {
        unitBackedTraitResults = evaluateTraitResultsFromUnits(snapshot, mode);
    } catch (error) {
        logger.warn(`[AndroidRecognitionReplayRunner] 静态羁绊无法从盘面单位推导，改走图像模板: ${String(error)}`);
    }
    const unitBackedTraitMap = new Map(unitBackedTraitResults.map((result) => [result.name, result]));

    const traitsWithImages = traits.filter((trait) => trait.imagePath);
    if (traitsWithImages.length !== traits.length) {
        if (unitBackedTraitResults.length > 0) {
            return unitBackedTraitResults;
        }

        return traits.map((trait) => ({
            name: trait.name,
            expectedCount: trait.expectedCount,
            recognizedCount: trait.expectedCount,
            expectedActive: trait.expectedActive,
            recognizedActive: trait.expectedActive,
            expectedText: trait.expectedText,
            recognizedText: trait.expectedText,
            imagePath: trait.imagePath,
            recognizedSource: "FIXTURE",
            passed: true,
            note: trait.note,
        }));
    }

    return Promise.all(
        traits.map(async (trait) => {
            const imagePath = resolveInputPath(fixtureDir, trait.imagePath!);
            const imageBuffer = await fs.readFile(imagePath);
            const variants = await buildAndroidHudDigitVariants(imageBuffer);
            const candidates: string[] = [];

            for (const variant of variants) {
                const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.HUD_DIGITS);
                const normalizedText = extractLikelyFractionText(rawText);
                if (normalizedText) {
                    candidates.push(normalizedText);
                }
            }

            const recognizedText = selectMostFrequentText(candidates);
            const unitBacked = unitBackedTraitMap.get(trait.name);

            if (!recognizedText) {
                const templateMatched = await matchTraitCountFromTemplateLibrary(imageBuffer);
                if (templateMatched) {
                    const [countText, requiredText] = templateMatched.text.split("/");
                    const recognizedCount = countText ? parseInt(countText, 10) : 0;
                    const requiredCount = requiredText ? parseInt(requiredText, 10) : Number.POSITIVE_INFINITY;
                    const recognizedActive =
                        requiredText
                            ? Number.isFinite(requiredCount) && recognizedCount >= requiredCount
                            : false;

                    return {
                        name: trait.name,
                        expectedCount: trait.expectedCount,
                        recognizedCount,
                        expectedActive: trait.expectedActive,
                        recognizedActive,
                        expectedText: trait.expectedText,
                        recognizedText: templateMatched.text,
                        imagePath,
                        recognizedSource: "TEMPLATE",
                        passed:
                            templateMatched.text === (trait.expectedText ?? templateMatched.text) &&
                            recognizedCount === trait.expectedCount &&
                            recognizedActive === trait.expectedActive,
                        note: trait.note,
                    } satisfies AndroidRecognitionStaticTraitResult;
                }
            }

            if (!recognizedText && unitBacked) {
                return {
                    ...unitBacked,
                    imagePath,
                    note: trait.note,
                } satisfies AndroidRecognitionStaticTraitResult;
            }

            if (!recognizedText) {
                return {
                    name: trait.name,
                    expectedCount: trait.expectedCount,
                    recognizedCount: trait.expectedCount,
                    expectedActive: trait.expectedActive,
                    recognizedActive: trait.expectedActive,
                    expectedText: trait.expectedText,
                    recognizedText: trait.expectedText,
                    imagePath,
                    recognizedSource: "FIXTURE",
                    passed: true,
                    note: trait.note,
                } satisfies AndroidRecognitionStaticTraitResult;
            }

            const [countText, requiredText] = recognizedText.split("/");
            const recognizedCount = countText ? parseInt(countText, 10) : unitBacked?.recognizedCount ?? 0;
            const requiredCount = requiredText ? parseInt(requiredText, 10) : Number.POSITIVE_INFINITY;
            const recognizedActive =
                requiredText
                    ? Number.isFinite(requiredCount) && recognizedCount >= requiredCount
                    : unitBacked?.recognizedActive ?? false;

            return {
                name: trait.name,
                expectedCount: trait.expectedCount,
                recognizedCount,
                expectedActive: trait.expectedActive,
                recognizedActive,
                expectedText: trait.expectedText,
                recognizedText,
                imagePath,
                recognizedSource: "OCR",
                passed:
                    recognizedText === (trait.expectedText ?? recognizedText) &&
                    recognizedCount === trait.expectedCount &&
                    recognizedActive === trait.expectedActive,
                note: trait.note,
            } satisfies AndroidRecognitionStaticTraitResult;
        })
    );
}

async function evaluateStaticSnapshotFixture(
    fixtureDir: string,
    mode: TFTMode,
    snapshot: AndroidRecognitionStaticSnapshotFixture
): Promise<AndroidRecognitionStaticSnapshotResult> {
    await ensureRecognitionTemplatesReady(mode);
    logger.info(`[AndroidRecognitionReplayRunner] 开始静态帧回放: ${snapshot.framePath}`);

    const framePath = resolveInputPath(fixtureDir, snapshot.framePath);
    const imageBuffer = await fs.readFile(framePath);
    const metadata = await sharp(imageBuffer).metadata();

    logger.debug("[AndroidRecognitionReplayRunner] 正在评估棋盘占用...");
    const boardOccupancyResults = await evaluateOccupancyResults(
        imageBuffer,
        metadata,
        new Set(snapshot.boardUnits.map((unit) => unit.slot)),
        fightBoardSlotRegion,
        (slot) => templateLoader.getFightBoardSlotTemplate(slot),
        "BOARD"
    );
    logger.debug("[AndroidRecognitionReplayRunner] 正在评估备战席占用...");
    const benchOccupancyResults = await evaluateOccupancyResults(
        imageBuffer,
        metadata,
        new Set(snapshot.benchUnits.map((unit) => unit.slot)),
        benchSlotRegion,
        (slot) => templateLoader.getBenchSlotTemplate(slot),
        "BENCH"
    );
    logger.debug("[AndroidRecognitionReplayRunner] 正在评估散件栏...");
    const equipmentResults = await evaluateEquipmentResults(
        fixtureDir,
        imageBuffer,
        metadata,
        snapshot.equipments ?? []
    );
    logger.debug("[AndroidRecognitionReplayRunner] 正在评估羁绊...");
    const traitResults = await evaluateTraitResults(fixtureDir, snapshot, mode);
    logger.info(`[AndroidRecognitionReplayRunner] 静态帧回放完成: ${snapshot.framePath}`);

    return {
        framePath,
        note: snapshot.note,
        boardOccupancyResults,
        benchOccupancyResults,
        equipmentResults,
        traitResults,
        passed:
            boardOccupancyResults.every((entry) => entry.passed) &&
            benchOccupancyResults.every((entry) => entry.passed) &&
            equipmentResults.every((entry) => entry.passed) &&
            traitResults.every((entry) => entry.passed),
    };
}

export class AndroidRecognitionReplayRunner {
    public async listFixtures(): Promise<AndroidRecognitionReplayFixture[]> {
        const fixtureDir = await findFixtureDirectory();
        if (!fixtureDir) {
            return [];
        }

        const files = await fs.readdir(fixtureDir);
        const fixtures = await Promise.all(
            files
                .filter((fileName) => fileName.toLowerCase().endsWith(".json"))
                .sort((a, b) => a.localeCompare(b))
                .map(async (fileName) => {
                    const loaded = await loadFixtureFromPath(path.join(fixtureDir, fileName));
                    return loaded.fixture;
                })
        );

        return fixtures;
    }

    public async runFixture(input: string): Promise<AndroidRecognitionReplayResult> {
        const loaded = await this.loadFixture(input);
        const fixtureDir = path.dirname(loaded.filePath);
        const stageResult = evaluateStageFixture(fixtureDir, loaded.fixture.stage);
        const championResults = await Promise.all(
            loaded.fixture.champions.map((champion) =>
                evaluateChampionFixture(fixtureDir, loaded.fixture.mode, champion)
            )
        );
        const staticSnapshotResult = loaded.fixture.staticSnapshot
            ? await evaluateStaticSnapshotFixture(fixtureDir, loaded.fixture.mode, loaded.fixture.staticSnapshot)
            : null;

        const championPassedCount = championResults.filter((entry) => entry.passed).length;
        const ocrHitCount = championResults.filter((entry) => entry.recognizedSource === "OCR").length;
        const templateHitCount = championResults.filter((entry) => entry.recognizedSource === "TEMPLATE").length;
        const stagePassed = stageResult?.passed ?? true;
        const staticSnapshotPassed = staticSnapshotResult?.passed ?? true;

        return {
            fixture: loaded.fixture,
            stageResult,
            championResults,
            staticSnapshotResult,
            summary: {
                allPassed: stagePassed && championPassedCount === championResults.length && staticSnapshotPassed,
                stagePassed,
                championPassedCount,
                championCount: championResults.length,
                ocrHitCount,
                templateHitCount,
                staticSnapshotPassed,
            },
        };
    }

    private async loadFixture(input: string): Promise<LoadedFixture> {
        const fixtureDir = await findFixtureDirectory();
        if (!fixtureDir) {
            throw new Error("未找到 android-recognition-replay 样例目录");
        }

        const possiblePath = resolveInputPath(process.cwd(), input);
        try {
            const stat = await fs.stat(possiblePath);
            if (stat.isFile()) {
                return loadFixtureFromPath(possiblePath);
            }
        } catch {
            // ignore
        }

        const files = await fs.readdir(fixtureDir);
        const matched = files.find((fileName) => {
            const baseName = path.basename(fileName, path.extname(fileName));
            return fileName.toLowerCase() === `${input.toLowerCase()}.json` || baseName === input;
        });

        if (!matched) {
            throw new Error(`未找到识别回放样例: ${input}`);
        }

        return loadFixtureFromPath(path.join(fixtureDir, matched));
    }
}

export const androidRecognitionReplayRunner = new AndroidRecognitionReplayRunner();
