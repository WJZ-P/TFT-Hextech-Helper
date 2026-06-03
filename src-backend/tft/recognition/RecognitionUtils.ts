/**
 * Android OCR Regression — Variant/Selection Logic
 *
 * The helpers below (e.g., buildAndroidStageOcrVariants, extractLikelyStageText, selectBestStageText)
 * implement normalization and selection for OCR results from game stage/augment/shop text crops.
 *
 * ## Role in Regression
 * - All such helpers are directly exercised by tests in `android_hud_recognition.test.ts` to assert correct OCR on
 *   a spectrum of real recorded crops (opening, augment, shop, board).
 * - If you are updating OCR, correction, or selection logic, you MUST update both the regression doc in OcrService.ts
 *   and augment/add test cases for coverage of any new edge/path.
 *
 * ## Edge Cases & Boundaries
* - Shop-open 5-1 was historically considered a regression risk, but as of Mar 2026 it now passes all automated regression and manual QA reliably. If new failures are observed, add notes and cases inline.
*   - Current variant set includes `stage/threshold-110` precisely to stabilize 5-1 vs 3-1 selection.
*   - Regularly review edge crops for new failures and document them here and in the regression notes.
 *
 * For detailed coverage, see top doc in OcrService.ts and test docblocks.
 */
import sharp from "sharp";
import type { TFTUnit } from "../../TFTProtocol";
import { resolveChampionAlias } from "../../data/TftNameNormalizer";
import { ocrCorrectionService } from "./OcrCorrectionService";

export interface StageOcrCandidate {
    text: string;
    rawText: string;
    label: string;
}

export interface StageOcrSelection {
    text: string | null;
    support: number;
    rawExactSupport: number;
    hyphenSupport: number;
    label: string | null;
}

export interface OcrVariant {
    label: string;
    buffer: Buffer;
}

interface VisualDigitComponent {
    left: number;
    top: number;
    right: number;
    bottom: number;
    area: number;
    width: number;
    height: number;
    centerY: number;
    points: Array<[number, number]>;
}

export type ChampionOcrProfile = "SHOP" | "DETAIL";

export interface ChampionTextResolution {
    name: string | null;
    normalizedText: string;
    rawText: string;
    score: number;
    strategy: "EXACT" | "FUZZY" | "NONE";
}

interface ImagePreprocessOptions {
    scale: number;
    grayscale?: boolean;
    normalize?: boolean;
    threshold?: number;
    sharpen?: boolean;
}

function normalizeText(rawText?: string): string {
    return String(rawText ?? "")
        .replace(/\s+/g, "")
        .trim();
}

export function normalizeChampionOcrText(rawText?: string): string {
    return normalizeText(ocrCorrectionService.applyCorrections(String(rawText ?? ""), "shop"));
}

async function preprocessImage(buffer: Buffer, options: ImagePreprocessOptions): Promise<Buffer> {
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width ?? 1;

    let pipeline = sharp(buffer).resize({
        width: Math.max(1, Math.round(width * options.scale)),
        kernel: "lanczos3",
    });

    if (options.grayscale) {
        pipeline = pipeline.grayscale();
    }

    if (options.normalize) {
        pipeline = pipeline.normalize();
    }

    if (typeof options.threshold === "number") {
        pipeline = pipeline.threshold(options.threshold);
    }

    if (options.sharpen) {
        pipeline = pipeline.sharpen();
    }

    return pipeline.png().toBuffer();
}

export async function buildChampionOcrVariants(
    rawBuffer: Buffer,
    profile: ChampionOcrProfile
): Promise<OcrVariant[]> {
    if (profile === "DETAIL") {
        return [
            { label: "detail/raw", buffer: rawBuffer },
            {
                label: "detail/gray-normalize",
                buffer: await preprocessImage(rawBuffer, {
                    scale: 4,
                    grayscale: true,
                    normalize: true,
                }),
            },
            {
                label: "detail/threshold-130",
                buffer: await preprocessImage(rawBuffer, {
                    scale: 6,
                    grayscale: true,
                    normalize: true,
                    threshold: 130,
                    sharpen: true,
                }),
            },
        ];
    }

    return [
        { label: "shop/raw", buffer: rawBuffer },
        {
            label: "shop/gray-normalize",
            buffer: await preprocessImage(rawBuffer, {
                scale: 6,
                grayscale: true,
                normalize: true,
            }),
        },
        {
            label: "shop/threshold-140",
            buffer: await preprocessImage(rawBuffer, {
                scale: 8,
                grayscale: true,
                normalize: true,
                threshold: 140,
                sharpen: true,
            }),
        },
        {
            label: "shop/threshold-150",
            buffer: await preprocessImage(rawBuffer, {
                scale: 8,
                grayscale: true,
                normalize: true,
                threshold: 150,
                sharpen: true,
            }),
        },
    ];
}

export async function buildAndroidStageOcrVariants(rawBuffer: Buffer): Promise<OcrVariant[]> {
    return [
        { label: "stage/raw", buffer: rawBuffer },
        {
            label: "stage/gray-normalize",
            buffer: await preprocessImage(rawBuffer, {
                scale: 4,
                grayscale: true,
                normalize: true,
            }),
        },
        {
            label: "stage/threshold-100",
            buffer: await preprocessImage(rawBuffer, {
                scale: 6,
                grayscale: true,
                normalize: true,
                threshold: 100,
                sharpen: true,
            }),
        },
        {
            label: "stage/threshold-110",
            buffer: await preprocessImage(rawBuffer, {
                scale: 6,
                grayscale: true,
                normalize: true,
                threshold: 110,
                sharpen: true,
            }),
        },
        {
            label: "stage/threshold-120",
            buffer: await preprocessImage(rawBuffer, {
                scale: 6,
                grayscale: true,
                normalize: true,
                threshold: 120,
                sharpen: true,
            }),
        },
        {
            label: "stage/threshold-130",
            buffer: await preprocessImage(rawBuffer, {
                scale: 6,
                grayscale: true,
                normalize: true,
                threshold: 130,
                sharpen: true,
            }),
        },
        {
            label: "stage/threshold-140",
            buffer: await preprocessImage(rawBuffer, {
                scale: 7,
                grayscale: true,
                normalize: true,
                threshold: 140,
                sharpen: true,
            }),
        },
        {
            label: "stage/threshold-155",
            buffer: await preprocessImage(rawBuffer, {
                scale: 7,
                grayscale: true,
                normalize: true,
                threshold: 155,
                sharpen: true,
            }),
        },
        {
            label: "stage/threshold-160",
            buffer: await preprocessImage(rawBuffer, {
                scale: 8,
                grayscale: true,
                normalize: true,
                threshold: 160,
                sharpen: true,
            }),
        },
    ];
}

export async function parseAndroidStageVisualFromFrame(frameBuffer: Buffer): Promise<string> {
    const metadata = await sharp(frameBuffer).metadata();
    const frameWidth = metadata.width ?? 0;
    const frameHeight = metadata.height ?? 0;
    if (frameWidth <= 0 || frameHeight <= 0) {
        return "";
    }

    const cropLeft = Math.round(frameWidth * 0.28);
    const cropTop = 0;
    const cropWidth = Math.max(1, Math.round(frameWidth * 0.16));
    const cropHeight = Math.max(1, Math.round(frameHeight * 0.08));
    const scale = 5;
    const { data, info } = await sharp(frameBuffer)
        .extract({
            left: cropLeft,
            top: cropTop,
            width: Math.min(cropWidth, frameWidth - cropLeft),
            height: Math.min(cropHeight, frameHeight - cropTop),
        })
        .resize({
            width: cropWidth * scale,
            height: cropHeight * scale,
            kernel: "nearest",
        })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const foreground = new Uint8Array(info.width * info.height);
    for (let offset = 0, pixelIndex = 0; offset < data.length; offset += info.channels, pixelIndex += 1) {
        const red = data[offset];
        const green = data[offset + 1];
        const blue = data[offset + 2];
        foreground[pixelIndex] = red >= 175 && green >= 175 && blue >= 150 ? 1 : 0;
    }

    const digitComponents = findVisualDigitComponents(foreground, info.width, info.height)
        .filter((component) => component.centerY <= info.height * 0.50)
        .sort((left, right) => left.left - right.left);
    const digitHeight = Math.max(...digitComponents.map((component) => component.height), 0);
    if (digitHeight <= 0) {
        return "";
    }

    const tokens = digitComponents.map((component) => {
        if (component.height < digitHeight * 0.45 && component.width >= digitHeight * 0.18) {
            return "-";
        }
        const digit = classifyVisualDigit(component);
        return digit === null ? "" : String(digit);
    }).join("");
    const match = tokens.match(/([1-7])-([1-7])/);
    return match ? `${match[1]}-${match[2]}` : "";
}

export async function buildAndroidHudDigitVariants(rawBuffer: Buffer): Promise<OcrVariant[]> {
    return [
        { label: "hud-digit/raw", buffer: rawBuffer },
        {
            label: "hud-digit/gray-normalize",
            buffer: await preprocessImage(rawBuffer, {
                scale: 10,
                grayscale: true,
                normalize: true,
            }),
        },
        {
            label: "hud-digit/threshold-165",
            buffer: await preprocessImage(rawBuffer, {
                scale: 14,
                grayscale: true,
                normalize: true,
                threshold: 165,
                sharpen: true,
            }),
        },
        {
            label: "hud-digit/threshold-175",
            buffer: await preprocessImage(rawBuffer, {
                scale: 14,
                grayscale: true,
                normalize: true,
                threshold: 175,
                sharpen: true,
            }),
        },
        {
            label: "hud-digit/threshold-190",
            buffer: await preprocessImage(rawBuffer, {
                scale: 14,
                grayscale: true,
                normalize: true,
                threshold: 190,
                sharpen: true,
            }),
        },
    ];
}

export async function buildAndroidPlayerNameOcrVariants(rawBuffer: Buffer): Promise<OcrVariant[]> {
    return [
        { label: "player-name/raw", buffer: rawBuffer },
        {
            label: "player-name/gray-normalize",
            buffer: await preprocessImage(rawBuffer, {
                scale: 6,
                grayscale: true,
                normalize: true,
            }),
        },
        {
            label: "player-name/threshold-145",
            buffer: await preprocessImage(rawBuffer, {
                scale: 8,
                grayscale: true,
                normalize: true,
                threshold: 145,
                sharpen: true,
            }),
        },
        {
            label: "player-name/threshold-170",
            buffer: await preprocessImage(rawBuffer, {
                scale: 8,
                grayscale: true,
                normalize: true,
                threshold: 170,
                sharpen: true,
            }),
        },
    ];
}

function isLikelyStagePair(stage: number, round: number): boolean {
    if (!Number.isFinite(stage) || !Number.isFinite(round)) {
        return false;
    }
    if (stage < 1 || stage > 7) {
        return false;
    }
    if (round < 1 || round > 7) {
        return false;
    }
    if (stage === 1 && round > 4) {
        return false;
    }
    return true;
}

function buildStagePair(stage: string, round: string): string {
    return `${parseInt(stage, 10)}-${parseInt(round, 10)}`;
}

function normalizeStageRawText(rawText?: string): string {
    return ocrCorrectionService.applyCorrections(String(rawText ?? ""), "stage")
        .replace(/[—–－]/g, "-")
        .replace(/\s+/g, "")
        .replace(/[^0-9-]/g, "");
}

function normalizeHudDigitRawText(rawText?: string): string {
    return String(rawText ?? "")
        .replace(/[Oo]/g, "0")
        .replace(/[Il|]/g, "1")
        .replace(/[Ss]/g, "5")
        .replace(/[—–－]/g, "-")
        .replace(/\s+/g, "")
        .trim();
}

function extractStageFromHyphenToken(token: string): string {
    const match = token.match(/^(\d+)-(\d+)$/);
    if (!match) {
        return "";
    }

    const [, leftDigits, rightDigits] = match;
    const directStage = parseInt(leftDigits, 10);
    const directRound = parseInt(rightDigits, 10);
    if (isLikelyStagePair(directStage, directRound)) {
        return buildStagePair(leftDigits, rightDigits);
    }

    const candidates: Array<[string, string]> = [];
    if (leftDigits.length > 0 && rightDigits.length > 0) {
        candidates.push([leftDigits.slice(-1), rightDigits[0]]);
        candidates.push([leftDigits[0], rightDigits[0]]);
        candidates.push([leftDigits.slice(-1), rightDigits.slice(-1)]);
    }

    for (const [stageText, roundText] of candidates) {
        const stage = parseInt(stageText, 10);
        const round = parseInt(roundText, 10);
        if (isLikelyStagePair(stage, round)) {
            return buildStagePair(stageText, roundText);
        }
    }

    return "";
}

export function extractLikelyStageText(rawText: string): string {
    if (!rawText) {
        return "";
    }

    const normalized = normalizeStageRawText(rawText);

    if (!normalized) {
        return "";
    }

    const hyphenTokens = normalized.match(/\d+-\d+/g) ?? [];
    for (const token of hyphenTokens) {
        const extracted = extractStageFromHyphenToken(token);
        if (extracted) {
            return extracted;
        }
    }

    const compactDigits = normalized.replace(/-/g, "");
    for (let index = 0; index <= compactDigits.length - 2; index += 1) {
        const stageText = compactDigits[index];
        const roundText = compactDigits[index + 1];
        const stage = parseInt(stageText, 10);
        const round = parseInt(roundText, 10);
        if (isLikelyStagePair(stage, round)) {
            return buildStagePair(stageText, roundText);
        }
    }

    return "";
}

export function extractLikelyHudNumber(
    rawText: string,
    options?: {
        min?: number;
        max?: number;
        maxDigits?: number;
    }
): string {
    const digits = normalizeHudDigitRawText(rawText).replace(/\D/g, "");
    if (!digits) {
        return "";
    }

    const min = options?.min ?? 0;
    const max = options?.max ?? 99;
    const maxDigits = options?.maxDigits ?? 2;
    const candidates = new Set<string>();

    if (digits.length <= maxDigits) {
        candidates.add(digits);
    }

    for (let length = Math.min(maxDigits, digits.length); length >= 1; length -= 1) {
        candidates.add(digits.slice(0, length));
        candidates.add(digits.slice(-length));
    }

    for (const candidate of candidates) {
        if (!candidate) {
            continue;
        }
        const numeric = parseInt(candidate, 10);
        if (numeric >= min && numeric <= max) {
            return numeric.toString();
        }
    }

    return "";
}

export function extractLikelyXpText(rawText: string): string {
    const normalized = normalizeHudDigitRawText(rawText).replace(/[^0-9/]/g, "");
    if (!normalized) {
        return "";
    }

    const validTotals = [2, 6, 10, 20, 36, 60, 68, 76, 84];

    const directMatch = normalized.match(/(\d{1,2})\/(\d{1,2})/);
    if (directMatch) {
        const current = parseInt(directMatch[1], 10);
        const total = parseInt(directMatch[2], 10);
        if (
            Number.isFinite(current) &&
            Number.isFinite(total) &&
            validTotals.includes(total) &&
            current >= 0 &&
            current <= total
        ) {
            return `${current}/${total}`;
        }
    }

    const digits = normalized.replace(/\D/g, "");
    if (!digits) {
        return "";
    }

    for (let splitIndex = 1; splitIndex < digits.length; splitIndex += 1) {
        const current = parseInt(digits.slice(0, splitIndex), 10);
        const total = parseInt(digits.slice(splitIndex), 10);
        if (
            Number.isFinite(current) &&
            Number.isFinite(total) &&
            validTotals.includes(total) &&
            current >= 0 &&
            current <= total
        ) {
            return `${current}/${total}`;
        }
    }

    return "";
}

export function inferLevelFromXpTotal(totalXp: number): number | null {
    const levelByTotalXp = new Map<number, number>([
        [2, 2],
        [6, 3],
        [10, 4],
        [20, 5],
        [36, 6],
        [60, 7],
        [68, 8],
        [76, 9],
        [84, 9],
    ]);

    return levelByTotalXp.get(totalXp) ?? null;
}

export function normalizePlayerNameOcrText(rawText?: string): string {
    return String(rawText ?? "")
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase()
        .trim();
}

export function extractLikelyPlayerNameToken(rawText: string): string {
    const tokens = String(rawText ?? "")
        .split(/\s+/)
        .map((token) => normalizePlayerNameOcrText(token))
        .filter((token) => token.length >= 3);

    if (tokens.length === 0) {
        return "";
    }

    return tokens.sort((left, right) => right.length - left.length)[0];
}

export function selectBestPlayerNameCandidate(candidates: string[]): string | null {
    const normalizedCandidates = candidates
        .map((candidate) => normalizePlayerNameOcrText(candidate))
        .filter((candidate) => candidate.length >= 3);

    if (normalizedCandidates.length === 0) {
        return null;
    }

    let bestCandidate: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const candidate of normalizedCandidates) {
        let score = 0;
        for (const other of normalizedCandidates) {
            if (candidate === other) {
                score += 1;
                continue;
            }
            score += scorePlayerNameCandidate(candidate, other);
        }

        score += candidate.length * 0.02;

        if (score > bestScore) {
            bestScore = score;
            bestCandidate = candidate;
        }
    }

    return bestCandidate;
}

export function selectBestStageText(candidates: StageOcrCandidate[]): StageOcrSelection {
    const grouped = new Map<string, {
        support: number;
        rawExactSupport: number;
        hyphenSupport: number;
        firstIndex: number;
        label: string;
    }>();

    candidates.forEach((candidate, index) => {
        if (!candidate.text) {
            return;
        }

        const normalizedRaw = normalizeStageRawText(candidate.rawText);
        const entry = grouped.get(candidate.text) ?? {
            support: 0,
            rawExactSupport: 0,
            hyphenSupport: 0,
            firstIndex: index,
            label: candidate.label,
        };

        entry.support += 1;
        if (normalizedRaw === candidate.text || normalizedRaw === candidate.text.replace("-", "")) {
            entry.rawExactSupport += 1;
        }
        if (normalizedRaw.includes("-")) {
            entry.hyphenSupport += 1;
        }

        grouped.set(candidate.text, entry);
    });

    let bestText: string | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    let bestSelection: StageOcrSelection = {
        text: null,
        support: 0,
        rawExactSupport: 0,
        hyphenSupport: 0,
        label: null,
    };

    for (const [text, entry] of grouped.entries()) {
        
        const score =
            entry.support * 100 +
            entry.rawExactSupport * 10 +
            entry.hyphenSupport * 3 -
            entry.firstIndex * 0.01;

        if (score > bestScore) {
            bestScore = score;
            bestText = text;
            bestSelection = {
                text,
                support: entry.support,
                rawExactSupport: entry.rawExactSupport,
                hyphenSupport: entry.hyphenSupport,
                label: entry.label,
            };
        }
    }

    if (!bestText) {
        return bestSelection;
    }

    return bestSelection;
}

function findVisualDigitComponents(foreground: Uint8Array, width: number, height: number): VisualDigitComponent[] {
    const visited = new Uint8Array(foreground.length);
    const result: VisualDigitComponent[] = [];
    const queue: number[] = [];

    for (let index = 0; index < foreground.length; index += 1) {
        if (!foreground[index] || visited[index]) {
            continue;
        }
        visited[index] = 1;
        queue.length = 0;
        queue.push(index);
        let head = 0;
        let left = width;
        let right = 0;
        let top = height;
        let bottom = 0;
        let area = 0;
        const points: Array<[number, number]> = [];

        while (head < queue.length) {
            const current = queue[head];
            head += 1;
            const x = current % width;
            const y = Math.floor(current / width);
            area += 1;
            left = Math.min(left, x);
            right = Math.max(right, x);
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
            points.push([x, y]);

            addVisualNeighbor(current - 1, x > 0, foreground, visited, queue);
            addVisualNeighbor(current + 1, x < width - 1, foreground, visited, queue);
            addVisualNeighbor(current - width, y > 0, foreground, visited, queue);
            addVisualNeighbor(current + width, y < height - 1, foreground, visited, queue);
        }

        const componentWidth = right - left + 1;
        const componentHeight = bottom - top + 1;
        if (area >= 80 && componentWidth >= 6 && componentHeight >= 12) {
            result.push({
                left,
                top,
                right,
                bottom,
                area,
                width: componentWidth,
                height: componentHeight,
                centerY: (top + bottom) / 2,
                points,
            });
        }
    }

    return result;
}

function addVisualNeighbor(
    index: number,
    enabled: boolean,
    foreground: Uint8Array,
    visited: Uint8Array,
    queue: number[]
): void {
    if (enabled && foreground[index] && !visited[index]) {
        visited[index] = 1;
        queue.push(index);
    }
}

function classifyVisualDigit(component: VisualDigitComponent): number | null {
    if (component.width / Math.max(1, component.height) <= 0.50) {
        return 1;
    }

    const densities = [
        visualRegionDensity(component, 0.20, 0.00, 0.80, 0.18),
        visualRegionDensity(component, 0.00, 0.18, 0.38, 0.48),
        visualRegionDensity(component, 0.62, 0.18, 1.00, 0.48),
        visualRegionDensity(component, 0.20, 0.40, 0.80, 0.62),
        visualRegionDensity(component, 0.00, 0.52, 0.38, 0.82),
        visualRegionDensity(component, 0.62, 0.52, 1.00, 0.82),
        visualRegionDensity(component, 0.20, 0.82, 0.80, 1.00),
    ];
    const observed = densities.map((density) => density >= 0.35);
    const match = VISUAL_DIGIT_SEGMENTS
        .map(([digit, expected]) => ({
            digit,
            distance: expected.reduce((count, value, index) => count + (value === observed[index] ? 0 : 1), 0),
        }))
        .sort((left, right) => left.distance - right.distance)[0];
    return match && match.distance <= 2 ? match.digit : null;
}

function visualRegionDensity(component: VisualDigitComponent, x0: number, y0: number, x1: number, y1: number): number {
    const minX = component.left + Math.trunc(component.width * x0);
    const maxX = component.left + Math.trunc(component.width * x1);
    const minY = component.top + Math.trunc(component.height * y0);
    const maxY = component.top + Math.trunc(component.height * y1);
    const regionArea = Math.max(1, maxX - minX) * Math.max(1, maxY - minY);
    const count = component.points.filter(([x, y]) => x >= minX && x <= maxX && y >= minY && y <= maxY).length;
    return count / regionArea;
}

const VISUAL_DIGIT_SEGMENTS: Array<[number, boolean[]]> = [
    [0, [true, true, true, false, true, true, true]],
    [1, [false, false, true, false, false, true, false]],
    [2, [true, false, true, true, true, false, true]],
    [3, [true, false, true, true, false, true, true]],
    [4, [false, true, true, true, false, true, false]],
    [5, [true, true, false, true, false, true, true]],
    [6, [true, true, false, true, true, true, true]],
    [7, [true, false, true, false, false, true, false]],
    [8, [true, true, true, true, true, true, true]],
    [9, [true, true, true, true, false, true, true]],
];

function longestCommonSubsequenceLength(left: string, right: string): number {
    const rows = left.length + 1;
    const cols = right.length + 1;
    const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

    for (let row = 1; row < rows; row += 1) {
        for (let col = 1; col < cols; col += 1) {
            if (left[row - 1] === right[col - 1]) {
                dp[row][col] = dp[row - 1][col - 1] + 1;
            } else {
                dp[row][col] = Math.max(dp[row - 1][col], dp[row][col - 1]);
            }
        }
    }

    return dp[left.length][right.length];
}

function editDistance(left: string, right: string): number {
    const rows = left.length + 1;
    const cols = right.length + 1;
    const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

    for (let row = 0; row < rows; row += 1) {
        dp[row][0] = row;
    }
    for (let col = 0; col < cols; col += 1) {
        dp[0][col] = col;
    }

    for (let row = 1; row < rows; row += 1) {
        for (let col = 1; col < cols; col += 1) {
            const replaceCost = left[row - 1] === right[col - 1] ? 0 : 1;
            dp[row][col] = Math.min(
                dp[row - 1][col] + 1,
                dp[row][col - 1] + 1,
                dp[row - 1][col - 1] + replaceCost
            );
        }
    }

    return dp[left.length][right.length];
}

function scoreChampionCandidate(normalizedText: string, candidate: string): number {
    const maxLength = Math.max(normalizedText.length, candidate.length);
    if (maxLength === 0) {
        return 0;
    }

    const lcs = longestCommonSubsequenceLength(normalizedText, candidate);
    const lcsRatio = lcs / maxLength;
    const distanceRatio = 1 - editDistance(normalizedText, candidate) / maxLength;
    const normalizedChars = new Set(normalizedText);
    const candidateChars = new Set(candidate);
    const overlapCount = [...normalizedChars].filter((char) => candidateChars.has(char)).length;
    const overlapRatio = overlapCount / Math.max(normalizedChars.size, candidateChars.size, 1);

    let score = lcsRatio * 0.50 + Math.max(distanceRatio, 0) * 0.25 + overlapRatio * 0.15;

    if (candidate.includes(normalizedText) || normalizedText.includes(candidate)) {
        score += 0.18;
    }
    if (candidate.startsWith(normalizedText) || normalizedText.startsWith(candidate)) {
        score += 0.08;
    }
    if (candidate.endsWith(normalizedText) || normalizedText.endsWith(candidate)) {
        score += 0.08;
    }

    return Math.min(score, 1);
}

function scorePlayerNameCandidate(normalizedText: string, candidate: string): number {
    if (!normalizedText || !candidate) {
        return 0;
    }

    const maxLength = Math.max(normalizedText.length, candidate.length, 1);
    const lcs = longestCommonSubsequenceLength(normalizedText, candidate);
    const distanceRatio = 1 - editDistance(normalizedText, candidate) / maxLength;
    const prefixBonus = candidate.startsWith(normalizedText) || normalizedText.startsWith(candidate) ? 0.12 : 0;
    const containsBonus = candidate.includes(normalizedText) || normalizedText.includes(candidate) ? 0.12 : 0;

    return Math.max(0, Math.min(1, (lcs / maxLength) * 0.55 + Math.max(distanceRatio, 0) * 0.33 + prefixBonus + containsBonus));
}

export function extractSelfHpFromScoreboardText(selfNameText: string, scoreboardText: string): number | null {
    const selfName = normalizePlayerNameOcrText(selfNameText);
    if (!selfName) {
        return null;
    }

    const rawTokens = String(scoreboardText ?? "")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);

    let bestIndex = -1;
    let bestScore = 0;

    rawTokens.forEach((token, index) => {
        const normalized = normalizePlayerNameOcrText(token);
        if (!normalized || /^\d+$/.test(normalized)) {
            return;
        }

        const score = scorePlayerNameCandidate(selfName, normalized);
        if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
        }
    });

    if (bestIndex < 0 || bestScore < 0.35) {
        return null;
    }

    for (let index = bestIndex + 1; index < Math.min(rawTokens.length, bestIndex + 5); index += 1) {
        const digits = extractLikelyHudNumber(rawTokens[index], { min: 0, max: 100, maxDigits: 3 });
        if (!digits) {
            continue;
        }

        const hp = parseInt(digits, 10);
        if (hp >= 0 && hp <= 100) {
            return hp;
        }
    }

    return null;
}

export function resolveChampionNameFromText(
    rawText: string,
    chessData: Record<string, TFTUnit>
): ChampionTextResolution {
    const normalizedText = normalizeChampionOcrText(rawText);
    if (!normalizedText) {
        return {
            name: null,
            normalizedText: "",
            rawText,
            score: 0,
            strategy: "NONE",
        };
    }

    const aliasedName = resolveChampionAlias(rawText, chessData);
    if (aliasedName) {
        return {
            name: aliasedName,
            normalizedText,
            rawText,
            score: 1,
            strategy: "EXACT",
        };
    }

    if (chessData[normalizedText]) {
        return {
            name: normalizedText,
            normalizedText,
            rawText,
            score: 1,
            strategy: "EXACT",
        };
    }

    if (normalizedText.length < 2) {
        return {
            name: null,
            normalizedText,
            rawText,
            score: 0,
            strategy: "NONE",
        };
    }

    let bestName: string | null = null;
    let bestScore = 0;
    let secondBestScore = 0;

    for (const candidate of Object.keys(chessData)) {
        if (candidate.length - normalizedText.length > 1) {
            continue;
        }

        const score = scoreChampionCandidate(normalizedText, candidate);
        if (score > bestScore) {
            secondBestScore = bestScore;
            bestScore = score;
            bestName = candidate;
        } else if (score > secondBestScore) {
            secondBestScore = score;
        }
    }

    const scoreGap = bestScore - secondBestScore;
    const canAcceptFuzzy =
        bestName !== null &&
        bestScore >= 0.74 &&
        scoreGap >= 0.12;

    return {
        name: canAcceptFuzzy ? bestName : null,
        normalizedText,
        rawText,
        score: bestScore,
        strategy: canAcceptFuzzy ? "FUZZY" : "NONE",
    };
}
