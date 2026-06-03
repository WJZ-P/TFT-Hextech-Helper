import test from "node:test";
import assert from "node:assert/strict";
import { Region } from "@nut-tree-fork/nut-js";
import sharp from "sharp";
import { screenCapture } from "../../src-backend/tft";

test("ScreenCapture crops regions from virtual frame provider using window-relative coordinates", async () => {
    const frame = await sharp({
        create: {
            width: 200,
            height: 100,
            channels: 4,
            background: { r: 20, g: 40, b: 60, alpha: 1 },
        },
    })
        .png()
        .toBuffer();

    screenCapture.setGameWindowOrigin({ x: 1973, y: -94 }, { width: 1000, height: 500 }, true);
    screenCapture.setFrameCaptureProvider(async () => frame);

    try {
        const cropped = await screenCapture.captureRegionAsPng(new Region(2223, 31, 500, 250), false);
        const metadata = await sharp(cropped).metadata();

        assert.equal(metadata.width, 100);
        assert.equal(metadata.height, 50);
    } finally {
        screenCapture.setFrameCaptureProvider(null);
    }
});

test("ScreenCapture preserves frame-provider crop dimensions when converting regions to Mat", async () => {
    const frame = await sharp({
        create: {
            width: 200,
            height: 100,
            channels: 4,
            background: { r: 80, g: 110, b: 140, alpha: 1 },
        },
    })
        .png()
        .toBuffer();

    screenCapture.setGameWindowOrigin({ x: 1973, y: -94 }, { width: 1000, height: 500 }, true);
    screenCapture.setFrameCaptureProvider(async () => frame);

    try {
        const mat = await screenCapture.captureRegionAsMat(new Region(2223, 31, 500, 250));

        assert.equal(mat.cols, 100);
        assert.equal(mat.rows, 50);
        mat.delete();
    } finally {
        screenCapture.setFrameCaptureProvider(null);
    }
});
