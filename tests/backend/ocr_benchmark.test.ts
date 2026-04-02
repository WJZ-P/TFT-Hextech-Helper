/*
 * OCR benchmark test
 * Measures baseline vs optimized (parameters + caching) performance and verifies accuracy
 */
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import { ocrService, OcrWorkerType, buildAndroidStageOcrVariants, selectBestStageText } from "../../src-backend/tft";

function resolveCropDir(): string {
    return path.resolve(
        process.cwd(),
        "examples",
        "recordings",
        "derived",
        "android-real-recording-20260315-ionia",
        "crops"
    );
}

async function loadRawCropBuffers(): Promise<{ name: string; buffer: Buffer }[]> {
    const dir = resolveCropDir();
    const files = await fs.readdir(dir);
    const rawFiles = files.filter((f) => f.endsWith("-raw.png"));

    const out: { name: string; buffer: Buffer }[] = [];
    for (const file of rawFiles) {
        const full = path.join(dir, file);
        const buf = await sharp(full).png().toBuffer();
        out.push({ name: file, buffer: buf });
    }
    return out;
}

test("ocr: benchmark optimized vs baseline (params + cache)", { timeout: 300000 }, async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const samples = await loadRawCropBuffers();
    assert(samples.length > 0, "no crop samples found for benchmark");

    // Use a deterministic subset for accuracy checks (stage crops used in regression tests)
    const accuracyFiles = new Map<string, string>([
        ["recording-opening-detail-1-4-stage-raw.png", "1-4"],
        ["recording-augment-3-2-stage-raw.png", "3-2"],
        ["recording-board-2-5-stage-raw.png", "2-5"],
        ["recording-shop-5-1-stage-raw.png", "5-1"],
    ]);

    // Baseline: default parameters, empty cache
    await ocrService.setOptimizedMode(false);
    ocrService.clearCache();
    await ocrService.prewarmWorkers();

    // Run multiple passes to simulate repeated frames (caching benefits)
    const REPS = 4;
    const baselineStart = Date.now();
    const baselineResults: Map<string, string> = new Map();
    for (const sample of samples) {
        const variants = await buildAndroidStageOcrVariants(sample.buffer).catch(() => [] as any);
        const variantBuffer = variants && variants.length > 0 ? variants[0].buffer : sample.buffer;
        let lastText = "";
        for (let i = 0; i < REPS; i++) {
            // Force no-cache for baseline by clearing cache before each recognition
            ocrService.clearCache();
            lastText = await ocrService.recognize(variantBuffer, OcrWorkerType.GAME_STAGE).catch(() => "");
        }
        baselineResults.set(sample.name, lastText);
    }
    const baselineTime = Date.now() - baselineStart;

    // Evaluate baseline accuracy on known stage files
    let baselineCorrect = 0;
    let baselineTotal = 0;
    for (const [file, expected] of accuracyFiles.entries()) {
        baselineTotal++;
        const got = baselineResults.get(file) ?? "";
        const extracted = selectBestStageText([{ text: got, rawText: got, label: "baseline" }]).text ?? "";
        if (extracted === expected) baselineCorrect++;
    }
    const baselineAccuracy = baselineCorrect / Math.max(1, baselineTotal);

    // Optimized parameters (no cache) - measure param-only effect
    await ocrService.setOptimizedMode(true);
    ocrService.clearCache();
    await ocrService.prewarmWorkers();

    // param-only: still prevent cache to measure engine parameter impact
    const optStart = Date.now();
    const optResults: Map<string, string> = new Map();
    for (const sample of samples) {
        const variants = await buildAndroidStageOcrVariants(sample.buffer).catch(() => [] as any);
        const variantBuffer = variants && variants.length > 0 ? variants[0].buffer : sample.buffer;
        let lastText = "";
        for (let i = 0; i < REPS; i++) {
            // Prevent cache influence
            ocrService.clearCache();
            lastText = await ocrService.recognize(variantBuffer, OcrWorkerType.GAME_STAGE).catch(() => "");
        }
        optResults.set(sample.name, lastText);
    }
    const optTime = Date.now() - optStart;

    // Optimized with cache: run again (should hit cache)
    const cacheStart = Date.now();
    const cacheResults: Map<string, string> = new Map();
    for (const sample of samples) {
        const variants = await buildAndroidStageOcrVariants(sample.buffer).catch(() => [] as any);
        const variantBuffer = variants && variants.length > 0 ? variants[0].buffer : sample.buffer;
        let lastText = "";
        for (let i = 0; i < REPS; i++) {
            // Do NOT clear cache here; first pass will populate, subsequent will be cached
            lastText = await ocrService.recognize(variantBuffer, OcrWorkerType.GAME_STAGE).catch(() => "");
        }
        cacheResults.set(sample.name, lastText);
    }
    const cacheTime = Date.now() - cacheStart;

    // Accuracy for optimized (param-only)
    let optCorrect = 0;
    let optTotal = 0;
    for (const [file, expected] of accuracyFiles.entries()) {
        optTotal++;
        const got = optResults.get(file) ?? "";
        const extracted = selectBestStageText([{ text: got, rawText: got, label: "opt" }]).text ?? "";
        if (extracted === expected) optCorrect++;
    }
    const optAccuracy = optCorrect / Math.max(1, optTotal);

    // Compute improvements
    const paramImprovement = (baselineTime - optTime) / baselineTime;
    const cacheImprovement = (optTime - cacheTime) / optTime;
    const combinedImprovement = (baselineTime - cacheTime) / baselineTime;

    // Log numbers
    console.log("OCR benchmark results:");
    console.log(`samples=${samples.length}`);
    console.log(`baselineTime=${baselineTime}ms, baselineAccuracy=${baselineAccuracy}`);
    console.log(`optTime=${optTime}ms, optAccuracy=${optAccuracy}`);
    console.log(`cacheTime=${cacheTime}ms`);
    console.log(`paramImprovement=${(paramImprovement * 100).toFixed(1)}%`);
    console.log(`cacheImprovement=${(cacheImprovement * 100).toFixed(1)}%`);
    console.log(`combinedImprovement=${(combinedImprovement * 100).toFixed(1)}%`);

    // Assertions
    assert(combinedImprovement >= 0.3, `Combined improvement ${ (combinedImprovement*100).toFixed(1) }% < 30%`);

    // Accuracy must not degrade by more than 2 percentage points
    assert(optAccuracy >= baselineAccuracy - 0.02, `Accuracy dropped too much: baseline ${baselineAccuracy}, opt ${optAccuracy}`);
});
