import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import cv from "@techstark/opencv-js";
import {
    TFTMode,
    androidDetailChampionNameRegion,
    androidGameStageDisplayNormal,
    androidGameStageDisplayStageOne,
    androidShopSlotNameRegions,
    getSeasonTemplateDir,
    getChessDataForMode,
    type SimpleRegion,
} from "../src-backend/TFTProtocol.ts";
import {
    buildAndroidStageOcrVariants,
    buildChampionOcrVariants,
    extractLikelyStageText,
    OcrWorkerType,
    ocrService,
    resolveChampionNameFromText,
    screenCapture,
    selectBestStageText,
    templateLoader,
    templateMatcher,
} from "../src-backend/tft/index.ts";

const execFileAsync = promisify(execFile);

interface CropSpec {
    id: string;
    label: string;
    region: SimpleRegion;
    workerType?: OcrWorkerType;
    expectedText?: string;
}

interface KeyframeSpec {
    id: string;
    label: string;
    description: string;
    timestamp: string;
    mode: TFTMode;
    crops: CropSpec[];
}

interface RecordingPreset {
    id: string;
    label: string;
    recordingPath: string;
    outputDir: string;
    keyframes: KeyframeSpec[];
}

interface CliArgs {
    presetId?: string;
    recordingPath?: string;
    listPresets: boolean;
}

interface OcrCropResult {
    id: string;
    label: string;
    expectedText?: string;
    rawPath: string;
    ocrPath?: string;
    ocrText?: string;
    normalizedText?: string;
    selectedRegionLabel?: string;
    templateMatchName?: string | null;
    templateConfidence?: number | null;
}

interface KeyframeResult {
    id: string;
    label: string;
    description: string;
    timestamp: string;
    framePath: string;
    crops: OcrCropResult[];
}

const DEFAULT_PRESET_ID = "android-real-recording-20260315-ionia";

const PRESETS: Record<string, RecordingPreset> = {
    [DEFAULT_PRESET_ID]: {
        id: DEFAULT_PRESET_ID,
        label: "2026-03-15 安卓真机艾欧尼亚对局",
        recordingPath: path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "Screen_Recording_20260315_134448_TFT.mp4"
        ),
        outputDir: path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "derived",
            DEFAULT_PRESET_ID
        ),
        keyframes: [
            {
                id: "recording-opening-detail-1-4",
                label: "1-4 详情面板",
                description: "开局阶段的真实详情面板，用于抽取凯特琳名称裁片。",
                timestamp: "00:01:40",
                mode: TFTMode.NORMAL,
                crops: [
                    {
                        id: "stage",
                        label: "回合 1-4",
                        region: androidGameStageDisplayStageOne,
                        workerType: OcrWorkerType.GAME_STAGE,
                        expectedText: "1-4",
                    },
                    {
                        id: "detail-name",
                        label: "详情名 凯特琳",
                        region: androidDetailChampionNameRegion,
                        workerType: OcrWorkerType.CHESS,
                        expectedText: "凯特琳",
                    },
                ],
            },
            {
                id: "recording-opening-augment-2-1",
                label: "2-1 海克斯",
                description: "真实 2-1 海克斯选择画面。",
                timestamp: "00:02:10",
                mode: TFTMode.NORMAL,
                crops: [
                    {
                        id: "stage",
                        label: "回合 2-1",
                        region: androidGameStageDisplayNormal,
                        workerType: OcrWorkerType.GAME_STAGE,
                        expectedText: "2-1",
                    },
                ],
            },
            {
                id: "recording-board-2-5",
                label: "2-5 过渡站位",
                description: "真实 2-5 战斗结算后的棋盘和备战席状态。",
                timestamp: "00:06:50",
                mode: TFTMode.NORMAL,
                crops: [
                    {
                        id: "stage",
                        label: "回合 2-5",
                        region: androidGameStageDisplayNormal,
                        workerType: OcrWorkerType.GAME_STAGE,
                        expectedText: "2-5",
                    },
                    {
                        id: "trait-ionia-count",
                        label: "羁绊 艾欧尼亚 3/5",
                        region: {
                            leftTop: { x: 0.0673, y: 0.1479 },
                            rightBottom: { x: 0.1058, y: 0.2021 },
                        },
                    },
                    {
                        id: "trait-fighter-count",
                        label: "羁绊 斗士 1/2",
                        region: {
                            leftTop: { x: 0.0705, y: 0.1771 },
                            rightBottom: { x: 0.1282, y: 0.2396 },
                        },
                    },
                    {
                        id: "trait-mage-count",
                        label: "羁绊 法师 1/2",
                        region: {
                            leftTop: { x: 0.0705, y: 0.2465 },
                            rightBottom: { x: 0.1282, y: 0.3090 },
                        },
                    },
                ],
            },
            {
                id: "recording-augment-3-2",
                label: "3-2 海克斯",
                description: "真实 3-2 海克斯选择画面。",
                timestamp: "00:10:40",
                mode: TFTMode.NORMAL,
                crops: [
                    {
                        id: "stage",
                        label: "回合 3-2",
                        region: androidGameStageDisplayNormal,
                        workerType: OcrWorkerType.GAME_STAGE,
                        expectedText: "3-2",
                    },
                ],
            },
            {
                id: "recording-shop-5-1",
                label: "5-1 商店 D 牌",
                description: "真实 5-1 商店开启状态，用于抽取商店名称裁片。",
                timestamp: "00:24:15",
                mode: TFTMode.NORMAL,
                crops: [
                    {
                        id: "stage",
                        label: "回合 5-1",
                        region: androidGameStageDisplayNormal,
                        workerType: OcrWorkerType.GAME_STAGE,
                        expectedText: "5-1",
                    },
                    {
                        id: "shop-slot-1",
                        label: "商店 1 赛恩",
                        region: androidShopSlotNameRegions.SLOT_1,
                        workerType: OcrWorkerType.CHESS,
                        expectedText: "赛恩",
                    },
                    {
                        id: "shop-slot-2",
                        label: "商店 2 德莱文",
                        region: androidShopSlotNameRegions.SLOT_2,
                        workerType: OcrWorkerType.CHESS,
                        expectedText: "德莱文",
                    },
                    {
                        id: "shop-slot-3",
                        label: "商店 3 拉克丝",
                        region: androidShopSlotNameRegions.SLOT_3,
                        workerType: OcrWorkerType.CHESS,
                        expectedText: "拉克丝",
                    },
                    {
                        id: "shop-slot-4",
                        label: "商店 4 蒙多医生",
                        region: androidShopSlotNameRegions.SLOT_4,
                        workerType: OcrWorkerType.CHESS,
                        expectedText: "蒙多医生",
                    },
                    {
                        id: "shop-slot-5",
                        label: "商店 5 艾希",
                        region: androidShopSlotNameRegions.SLOT_5,
                        workerType: OcrWorkerType.CHESS,
                        expectedText: "艾希",
                    },
                ],
            },
            {
                id: "recording-board-5-2",
                label: "5-2 成型棋盘",
                description: "真实 5-2 的 8 人口成型站位。",
                timestamp: "00:25:45",
                mode: TFTMode.NORMAL,
                crops: [
                    {
                        id: "stage",
                        label: "回合 5-2",
                        region: androidGameStageDisplayNormal,
                        workerType: OcrWorkerType.GAME_STAGE,
                        expectedText: "5-2",
                    },
                    {
                        id: "recurve-bow",
                        label: "散件 反曲弓",
                        region: {
                            leftTop: { x: 0.0305, y: 0.4360 },
                            rightBottom: { x: 0.0851, y: 0.5548 },
                        },
                    },
                ],
            },
        ],
    },
};

let openCvReadyPromise: Promise<void> | null = null;

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        listPresets: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--preset" && argv[index + 1]) {
            args.presetId = argv[index + 1];
            index += 1;
            continue;
        }

        if (token === "--recording" && argv[index + 1]) {
            args.recordingPath = path.resolve(process.cwd(), argv[index + 1]);
            index += 1;
            continue;
        }

        if (token === "--list-presets") {
            args.listPresets = true;
        }
    }

    return args;
}

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

async function extractFrame(recordingPath: string, timestamp: string, outputPath: string): Promise<void> {
    await execFileAsync("ffmpeg", [
        "-y",
        "-i",
        recordingPath,
        "-ss",
        timestamp,
        "-frames:v",
        "1",
        "-update",
        "1",
        outputPath,
    ], {
        windowsHide: true,
    });
}

async function cropRegion(buffer: Buffer, metadata: sharp.Metadata, region: SimpleRegion): Promise<Buffer> {
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (!width || !height) {
        throw new Error("无法读取帧图片尺寸");
    }

    const left = Math.max(0, Math.min(width - 1, Math.round(region.leftTop.x * width)));
    const top = Math.max(0, Math.min(height - 1, Math.round(region.leftTop.y * height)));
    const right = Math.max(left + 1, Math.min(width, Math.round(region.rightBottom.x * width)));
    const bottom = Math.max(top + 1, Math.min(height, Math.round(region.rightBottom.y * height)));

    return sharp(buffer)
        .extract({
            left,
            top,
            width: right - left,
            height: bottom - top,
        })
        .png()
        .toBuffer();
}

async function recognizeTemplateName(buffer: Buffer): Promise<{ name: string | null; confidence: number | null }> {
    const mat = await screenCapture.pngBufferToMat(buffer);
    try {
        if (mat.channels() > 1) {
            cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
        }
        const match = templateMatcher.matchChampionDetailed(mat);
        return {
            name: match?.name ?? null,
            confidence: match?.confidence ?? null,
        };
    } finally {
        if (!mat.isDeleted()) {
            mat.delete();
        }
    }
}

async function ensureRecognitionReady(mode: TFTMode): Promise<void> {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");
    await waitForOpenCvReady();
    await ocrService.switchChessWorker(mode);
    await templateLoader.initialize({ watch: false });
    await templateLoader.switchSeason(getSeasonTemplateDir(mode));
}

async function chooseChampionOcrVariant(
    rawCrop: Buffer,
    mode: TFTMode,
    cropId: string,
    expectedText?: string
): Promise<{ variantBuffer: Buffer; rawText: string; normalizedText: string }> {
    const chessData = getChessDataForMode(mode);
    const variants = await buildChampionOcrVariants(
        rawCrop,
        cropId.startsWith("shop-slot") ? "SHOP" : "DETAIL"
    );

    let fallback: { variantBuffer: Buffer; rawText: string; normalizedText: string } | null = null;

    for (const variant of variants) {
        const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.CHESS);
        const resolved = resolveChampionNameFromText(rawText, chessData);

        if (!fallback || resolved.normalizedText.length > fallback.normalizedText.length) {
            fallback = {
                variantBuffer: variant.buffer,
                rawText,
                normalizedText: resolved.normalizedText,
            };
        }

        if (resolved.name && (!expectedText || resolved.name === expectedText)) {
            return {
                variantBuffer: variant.buffer,
                rawText,
                normalizedText: resolved.name,
            };
        }
    }

    return fallback ?? {
        variantBuffer: rawCrop,
        rawText: "",
        normalizedText: "",
    };
}

async function chooseStageOcrVariant(
    frameBuffer: Buffer,
    metadata: sharp.Metadata,
    defaultRegion: SimpleRegion,
    expectedText?: string
): Promise<{
    rawCrop: Buffer;
    variantBuffer: Buffer;
    rawText: string;
    normalizedText: string;
    selectedRegionLabel: string;
}> {
    const regionCandidates: Array<{ label: string; region: SimpleRegion }> = [
        { label: "requested", region: defaultRegion },
        {
            label: "candidate-a",
            region: {
                leftTop: { x: 0.32, y: 0.00 },
                rightBottom: { x: 0.42, y: 0.06 },
            },
        },
        {
            label: "tight",
            region: {
                leftTop: { x: 0.321, y: 0.00 },
                rightBottom: { x: 0.411, y: 0.055 },
            },
        },
        {
            label: "stage-one",
            region: androidGameStageDisplayStageOne,
        },
    ];

    const matches: Array<{
        regionLabel: string;
        rawCrop: Buffer;
        variantBuffer: Buffer;
        rawText: string;
        normalizedText: string;
        label: string;
    }> = [];

    for (const candidate of regionCandidates) {
        const rawCrop = await cropRegion(frameBuffer, metadata, candidate.region);
        const variants = await buildAndroidStageOcrVariants(rawCrop);

        for (const variant of variants) {
            const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.GAME_STAGE);
            const normalizedText = extractLikelyStageText(rawText);
            if (!normalizedText) {
                continue;
            }

            matches.push({
                regionLabel: candidate.label,
                rawCrop,
                variantBuffer: variant.buffer,
                rawText,
                normalizedText,
                label: `${candidate.label}/${variant.label}`,
            });
        }
    }

    const exactMatch = expectedText
        ? matches.find((entry) => entry.normalizedText === expectedText)
        : null;

    if (exactMatch) {
        return {
            rawCrop: exactMatch.rawCrop,
            variantBuffer: exactMatch.variantBuffer,
            rawText: exactMatch.rawText,
            normalizedText: exactMatch.normalizedText,
            selectedRegionLabel: exactMatch.regionLabel,
        };
    }

    const selection = selectBestStageText(
        matches.map((entry) => ({
            text: entry.normalizedText,
            rawText: entry.rawText,
            label: entry.label,
        }))
    );
    const fallback = selection.text
        ? matches.find((entry) => entry.normalizedText === selection.text)
        : null;

    if (fallback) {
        return {
            rawCrop: fallback.rawCrop,
            variantBuffer: fallback.variantBuffer,
            rawText: fallback.rawText,
            normalizedText: fallback.normalizedText,
            selectedRegionLabel: fallback.regionLabel,
        };
    }

    const requestedRawCrop = await cropRegion(frameBuffer, metadata, defaultRegion);
    return {
        rawCrop: requestedRawCrop,
        variantBuffer: requestedRawCrop,
        rawText: "",
        normalizedText: "",
        selectedRegionLabel: "requested",
    };
}

async function buildPresetManifest(preset: RecordingPreset): Promise<{ presetId: string; presetLabel: string; recordingPath: string; outputDir: string; generatedAt: string; keyframes: KeyframeResult[] }> {
    const frameDir = path.join(preset.outputDir, "frames");
    const cropDir = path.join(preset.outputDir, "crops");
    await fs.mkdir(frameDir, { recursive: true });
    await fs.mkdir(cropDir, { recursive: true });

    const results: KeyframeResult[] = [];

    for (const keyframe of preset.keyframes) {
        await ensureRecognitionReady(keyframe.mode);

        const framePath = path.join(frameDir, `${keyframe.id}.png`);
        await extractFrame(preset.recordingPath, keyframe.timestamp, framePath);

        const frameBuffer = await fs.readFile(framePath);
        const frameMetadata = await sharp(frameBuffer).metadata();
        const cropResults: OcrCropResult[] = [];

        for (const crop of keyframe.crops) {
            let rawCrop = await cropRegion(frameBuffer, frameMetadata, crop.region);

            let ocrPath: string | undefined;
            let ocrText: string | undefined;
            let normalizedText: string | undefined;
            let selectedRegionLabel: string | undefined;
            let templateMatchName: string | null | undefined;
            let templateConfidence: number | null | undefined;

            if (crop.workerType) {
                const selected =
                    crop.workerType === OcrWorkerType.CHESS
                        ? await chooseChampionOcrVariant(rawCrop, keyframe.mode, crop.id, crop.expectedText)
                        : await chooseStageOcrVariant(frameBuffer, frameMetadata, crop.region, crop.expectedText);

                rawCrop = "rawCrop" in selected ? selected.rawCrop : rawCrop;
                ocrPath = path.join(cropDir, `${keyframe.id}-${crop.id}-ocr.png`);
                await fs.writeFile(ocrPath, selected.variantBuffer);
                ocrText = selected.rawText;
                normalizedText = selected.normalizedText;
                selectedRegionLabel = "selectedRegionLabel" in selected ? selected.selectedRegionLabel : undefined;

                if (crop.workerType === OcrWorkerType.CHESS) {
                    const match = await recognizeTemplateName(selected.variantBuffer);
                    templateMatchName = match.name;
                    templateConfidence = match.confidence;
                }
            }

            const rawPath = path.join(cropDir, `${keyframe.id}-${crop.id}-raw.png`);
            await fs.writeFile(rawPath, rawCrop);

            cropResults.push({
                id: crop.id,
                label: crop.label,
                expectedText: crop.expectedText,
                rawPath,
                ocrPath,
                ocrText,
                normalizedText,
                selectedRegionLabel,
                templateMatchName,
                templateConfidence,
            });
        }

        results.push({
            id: keyframe.id,
            label: keyframe.label,
            description: keyframe.description,
            timestamp: keyframe.timestamp,
            framePath,
            crops: cropResults,
        });
    }

    return {
        presetId: preset.id,
        presetLabel: preset.label,
        recordingPath: preset.recordingPath,
        outputDir: preset.outputDir,
        generatedAt: new Date().toISOString(),
        keyframes: results,
    };
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));

    try {
        if (args.listPresets) {
            const presets = Object.values(PRESETS).map((preset) => ({
                id: preset.id,
                label: preset.label,
                recordingPath: preset.recordingPath,
                outputDir: preset.outputDir,
                keyframeCount: preset.keyframes.length,
            }));
            process.stdout.write(`${JSON.stringify(presets, null, 2)}\n`);
            return;
        }

        const preset = PRESETS[args.presetId ?? DEFAULT_PRESET_ID];
        if (!preset) {
            throw new Error(`未知录屏提取预设: ${args.presetId}`);
        }

        const effectivePreset: RecordingPreset = {
            ...preset,
            recordingPath: args.recordingPath ?? preset.recordingPath,
        };

        const manifest = await buildPresetManifest(effectivePreset);
        const manifestPath = path.join(effectivePreset.outputDir, "manifest.json");
        await fs.mkdir(effectivePreset.outputDir, { recursive: true });
        await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

        process.stdout.write(`${JSON.stringify({ manifestPath, outputDir: effectivePreset.outputDir }, null, 2)}\n`);
    } finally {
        await ocrService.destroy();
        templateLoader.destroy();
    }
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
});
