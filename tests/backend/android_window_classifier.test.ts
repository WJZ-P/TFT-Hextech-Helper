import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { classifyAndroidWindowScreenshot } from "../../src-backend/utils/AndroidWindowClassifier";

test("android window classifier detects BlueStacks boot splash", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-live-smoke-1773702691252.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "BLUESTACKS_BOOT");
    assert.ok(result.brightBlueRatio > 0.18);
});

test("android window classifier detects TFT frontend/update screen", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-live-smoke-1773702968907.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "TFT_FRONTEND");
    assert.equal(result.frontendVariant, "UPDATE_READY");
    assert.ok(result.brightWhiteRatio > 0.05);
    assert.deepEqual(result.primaryActionPoint, { x: 0.5, y: 0.545 });
});

test("android window classifier blocks login-required frontend screens", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-live-smoke-1773703133640.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "TFT_FRONTEND");
    assert.equal(result.frontendVariant, "LOGIN_REQUIRED");
    assert.equal(result.primaryActionPoint, undefined);
});

test("android window classifier keeps real TFT frames out of boot state", async () => {
    const frames = [
        "recording-board-5-2.png",
        "recording-shop-5-1.png",
        "recording-opening-augment-2-1.png",
        "recording-augment-3-2.png",
    ];

    for (const frame of frames) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "examples",
                "recordings",
                "derived",
                "android-real-recording-20260315-ionia",
                "frames",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);

        assert.equal(result.state, "LIVE_CONTENT", `${frame} 被误判为 BlueStacks 启动页`);
        assert.ok(result.brightBlueRatio < 0.18);
        assert.ok(result.brightWhiteRatio < 0.05);
    }
});

test("android window classifier rejects unrelated desktop screenshots", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-live-smoke-1773701883707.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "UNKNOWN");
    assert.equal(result.frontendVariant, undefined);
    assert.equal(result.primaryActionPoint, undefined);
});
