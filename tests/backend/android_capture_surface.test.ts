import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { analyzeAndroidCaptureSurface } from "../../src-backend/utils/AndroidCaptureSurface";

test("android capture surface detects fully black smoke frames", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-live-smoke-1773876338476.png"
        )
    );

    const result = await analyzeAndroidCaptureSurface(screenshot);

    assert.equal(result.state, "BLACK_SURFACE");
    assert.ok(result.darkPixelRatio > 0.98);
    assert.ok(result.nonBlackPixelRatio < 0.01);
});

test("android capture surface keeps real rendered TFT content out of black-surface diagnosis", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-live-smoke-1773875308190.png"
        )
    );

    const result = await analyzeAndroidCaptureSurface(screenshot);

    assert.equal(result.state, "VISIBLE_CONTENT");
    assert.equal(result.blockerReason, null);
    assert.ok(result.nonBlackPixelRatio > 0.01);
});
