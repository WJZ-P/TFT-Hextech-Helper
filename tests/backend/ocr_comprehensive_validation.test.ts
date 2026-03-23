/**
 * Comprehensive OCR validation — Stage recognition across all available samples
 *
 * - Runs stage OCR on all stage crops found in:
 *   - examples/recordings/derived/android-real-recording-20260315-ionia/crops/*-stage-raw.png
 *   - examples/recordings/derived/stage-scan-crops/*.png
 * - Compares default OCR mode (OEM=3) with optimized mode (OEM=1)
 * - Ensures optimized mode does not degrade recognition quality
 * - Reports total samples, pass rate, and average recognition time
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

import {
    OcrWorkerType,
    buildAndroidStageOcrVariants,
    extractLikelyStageText,
    selectBestStageText,
    ocrService,
} from "../../src-backend/tft";

import { GameStageType } from "../../src-backend/TFTProtocol";
import { parseStageStringToEnum } from "../../src-backend/tft/utils/GameStageParser";

after(async () => {
    await ocrService.destroy();
});

test("ocr: comprehensive stage recognition validation across all samples", { timeout: 20 * 60 * 1000 }, async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const dir1 = path.resolve(
        process.cwd(),
        "examples",
        "recordings",
        "derived",
        "android-real-recording-20260315-ionia",
        "crops"
    );
    const dir2 = path.resolve(process.cwd(), "examples", "recordings", "derived", "stage-scan-crops");

    const dir1Files = (await fs.readdir(dir1)).filter((f) => f.endsWith(".png") && /stage.*raw/i.test(f));
    const dir2Files = (await fs.readdir(dir2)).filter((f) => f.endsWith(".png") && f.toLowerCase().includes("stage"));

    const samplePaths: string[] = [
        ...dir1Files.map((f) => path.join(dir1, f)),
        ...dir2Files.map((f) => path.join(dir2, f)),
    ].sort();

    if (samplePaths.length === 0) {
        throw new Error("No stage sample files found in expected directories");
    }

    type RunResult = {
        filePath: string;
        selectedText: string | null;
        support: number;
        rawExactSupport: number;
        hyphenSupport: number;
        label: string | null;
        pass: boolean;
        timeMs: number;
        derivedScore: number;
    };

    async function runMode(optimized: boolean): Promise<RunResult[]> {
        await ocrService.setOptimizedMode(optimized);
        // Clear cache so that both modes are compared fairly
        ocrService.clearCache();

        const results: RunResult[] = [];

        for (const p of samplePaths) {
            const imgBuffer = await sharp(p).png().toBuffer();
            const variants = await buildAndroidStageOcrVariants(imgBuffer);

            const candidates: Array<{ text: string; rawText: string; label: string }> = [];
            const start = Date.now();

            for (const variant of variants) {
                const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.GAME_STAGE);
                const extracted = extractLikelyStageText(rawText);
                if (extracted) {
                    candidates.push({ text: extracted, rawText, label: variant.label });
                }
            }

            const selection = selectBestStageText(candidates);
            const selectedText = selection.text;
            const derivedScore = selection.support * 100 + selection.rawExactSupport * 10 + selection.hyphenSupport * 3;
            const parsed = selectedText ? parseStageStringToEnum(selectedText) : GameStageType.UNKNOWN;
            const pass = selectedText !== null && parsed !== GameStageType.UNKNOWN;
            const timeMs = Date.now() - start;

            results.push({
                filePath: p,
                selectedText,
                support: selection.support,
                rawExactSupport: selection.rawExactSupport,
                hyphenSupport: selection.hyphenSupport,
                label: selection.label,
                pass,
                timeMs,
                derivedScore,
            });
        }

        return results;
    }

    const defaultResults = await runMode(false);
    const optimizedResults = await runMode(true);

    // Validate optimized mode does not degrade per-sample score
    for (let i = 0; i < samplePaths.length; i += 1) {
        const sPath = samplePaths[i];
        const def = defaultResults[i];
        const opt = optimizedResults[i];
        assert.ok(
            opt.derivedScore >= def.derivedScore,
            `Optimized OCR degraded for ${path.basename(sPath)}: default score=${def.derivedScore}, optimized score=${opt.derivedScore}, default="${def.selectedText}", optimized="${opt.selectedText}"`
        );
    }

    const total = samplePaths.length;
    const defaultPass = defaultResults.filter((r) => r.pass).length;
    const optimizedPass = optimizedResults.filter((r) => r.pass).length;
    const avgTimeDefault = defaultResults.reduce((s, r) => s + r.timeMs, 0) / total;
    const avgTimeOptimized = optimizedResults.reduce((s, r) => s + r.timeMs, 0) / total;

    console.log(`OCR Comprehensive Validation: totalSamples=${total}`);
    console.log(
        `Default (OEM=3): pass=${defaultPass}/${total} (${Math.round((defaultPass / total) * 100)}%), avgTimeMs=${avgTimeDefault.toFixed(1)}`
    );
    console.log(
        `Optimized (OEM=1): pass=${optimizedPass}/${total} (${Math.round((optimizedPass / total) * 100)}%), avgTimeMs=${avgTimeOptimized.toFixed(1)}`
    );

    // Sanity check: optimized pass count should not be lower than default
    assert.ok(
        optimizedPass >= defaultPass,
        `Optimized pass count ${optimizedPass} is less than default ${defaultPass}`
    );
});
