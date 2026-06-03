import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
    matchAndroidItemIconSignature,
    scanAndroidItemIconMatches,
    writeAndroidItemIconMatchCrops,
} from "../../scripts/diagnose-android-item-icons";

test("matchAndroidItemIconSignature returns the nearest equipment signature within threshold", () => {
    const match = matchAndroidItemIconSignature("0000fffe", {
        "反曲之弓": "0000ffff",
        "无尽之刃": "ffffffff",
    }, 2);

    assert.deepEqual(match, {
        name: "反曲之弓",
        distance: 1,
    });
});

test("matchAndroidItemIconSignature returns null when all signatures exceed threshold", () => {
    const match = matchAndroidItemIconSignature("ffff0000", {
        "反曲之弓": "0000ffff",
    }, 2);

    assert.equal(match, null);
});

test("scanAndroidItemIconMatches finds matching signatures on a screenshot grid", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tft-icon-scan-"));
    const screenshotPath = path.join(tempDir, "screen.png");
    const catalogPath = path.join(tempDir, "catalog.json");
    const pixels = Buffer.alloc(32 * 32 * 3, 0);
    const pattern = [
        "01010101",
        "10101010",
        "01010101",
        "10101010",
        "01010101",
        "10101010",
        "01010101",
        "10101010",
    ];
    for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 8; x += 1) {
            const value = pattern[y][x] === "1" ? 255 : 0;
            const offset = ((8 + y) * 32 + 8 + x) * 3;
            pixels[offset] = value;
            pixels[offset + 1] = value;
            pixels[offset + 2] = value;
        }
    }
    await sharp(pixels, { raw: { width: 32, height: 32, channels: 3 } }).png().toFile(screenshotPath);
    await fs.writeFile(catalogPath, JSON.stringify({
        equipmentIconSignatures: {
            "测试装备": pattern.join(""),
        },
    }));

    const matches = await scanAndroidItemIconMatches(screenshotPath, catalogPath, {
        iconWidth: 8,
        iconHeight: 8,
        stride: 8,
        maxDistance: 0,
        maxResults: 3,
    });

    assert.equal(matches[0].match.name, "测试装备");
    assert.deepEqual(
        { left: matches[0].left, top: matches[0].top, width: matches[0].width, height: matches[0].height },
        { left: 8, top: 8, width: 8, height: 8 }
    );
    assert.deepEqual(matches[0].crop, {
        label: "scan-1",
        x: 0.25,
        y: 0.25,
        width: 0.25,
        height: 0.25,
    });
    assert.equal(matches[0].kotlinCrop, "crop(frame, 0.250000f, 0.250000f, 0.250000f, 0.250000f)");
});

test("writeAndroidItemIconMatchCrops writes matched crop images for manual QA", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tft-icon-crop-"));
    const screenshotPath = path.join(tempDir, "screen.png");
    const outputDir = path.join(tempDir, "crops");
    const pixels = Buffer.alloc(32 * 32 * 3, 0);
    for (let y = 8; y < 16; y += 1) {
        for (let x = 8; x < 16; x += 1) {
            const offset = (y * 32 + x) * 3;
            pixels[offset] = 255;
            pixels[offset + 1] = 32;
            pixels[offset + 2] = 16;
        }
    }
    await sharp(pixels, { raw: { width: 32, height: 32, channels: 3 } }).png().toFile(screenshotPath);

    const written = await writeAndroidItemIconMatchCrops(screenshotPath, outputDir, [{
        left: 8,
        top: 8,
        width: 8,
        height: 8,
        crop: {
            label: "scan-1",
            x: 0.25,
            y: 0.25,
            width: 0.25,
            height: 0.25,
        },
        kotlinCrop: "crop(frame, 0.250000f, 0.250000f, 0.250000f, 0.250000f)",
        signature: "unused",
        match: {
            name: "测试装备",
            distance: 0,
        },
    }]);

    assert.equal(written.length, 1);
    assert.equal(path.basename(written[0]), "scan-1-测试装备-d0.png");
    const metadata = await sharp(written[0]).metadata();
    assert.equal(metadata.width, 8);
    assert.equal(metadata.height, 8);
});
