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

test("android window classifier detects real ready-check accept state", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "accept-ready",
            "na_accept_ready_03.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "ACCEPT_READY");
    assert.deepEqual(result.acceptReadyPoint, { x: 0.51, y: 0.68 });
    assert.ok((result.acceptModalDarkRatio ?? 0) > 0.35);
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.04);
});

test("android window classifier detects real queue state", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "queue",
            "na_queue_02.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "QUEUE");
    assert.deepEqual(result.cancelQueuePoint, { x: 0.83, y: 0.9 });
    assert.ok((result.queueCancelDarkRatio ?? 0) > 0.60);
    assert.ok((result.queueStatusGoldRatio ?? 0) > 0.035);
});

test("android window classifier detects real lobby state", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "queue",
            "na_queue_04.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "LOBBY");
    assert.deepEqual(result.startQueuePoint, { x: 0.84, y: 0.9 });
    assert.ok((result.lobbyStartBlueRatio ?? 0) > 0.30);
});

test("android window classifier detects post-accept and loading transition states", async () => {
    const frames = [
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "accept-ready",
            "na_accept_ready_05.png"
        ),
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "in-game-transition",
            "na_in_game_transition_01.png"
        ),
    ];

    for (const frame of frames) {
        const screenshot = await fs.readFile(frame);
        const result = await classifyAndroidWindowScreenshot(screenshot);

        assert.equal(result.state, "IN_GAME_TRANSITION");
    }
});
