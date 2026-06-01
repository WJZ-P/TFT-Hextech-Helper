import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { normalizeAndroidForegroundObservation } from "../../src-backend/services/AndroidForegroundProtocol";
import {
    classifyAndroidWindowScreenshot,
    type AndroidWindowClassification,
} from "../../src-backend/utils/AndroidWindowClassifier";

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
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "derived",
            "android-real-recording-20260315-ionia",
            "frames",
            "recording-board-5-2.png"
        ),
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "derived",
            "android-real-recording-20260315-ionia",
            "frames",
            "recording-shop-5-1.png"
        ),
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "derived",
            "android-real-recording-20260315-ionia",
            "frames",
            "recording-opening-augment-2-1.png"
        ),
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "derived",
            "android-real-recording-20260315-ionia",
            "frames",
            "recording-augment-3-2.png"
        ),
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "live-content",
            "na_live_shop_open_small_window_01.png"
        ),
    ];

    for (const frame of frames) {
        const screenshot = await fs.readFile(frame);

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

test("android window classifier rejects Windows wallpaper as ready-check", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "unknown",
            "na_windows_wallpaper_01.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "UNKNOWN");
    assert.equal(result.acceptReadyPoint, undefined);
    assert.ok((result.modeSelectBlueRatio ?? 0) > 0.04);
});

test("android window classifier detects game-over result screen before live HUD", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "game-over",
            "na_game_over_rank8_01.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "GAME_OVER");
    assert.ok((result.gameOverReplayBlueRatio ?? 0) > 0.05);
    assert.ok((result.gameOverRowsDarkRatio ?? 0) > 0.35);
    assert.equal(result.startQueuePoint, undefined);
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
    assert.deepEqual(result.acceptReadyPoint, { x: 0.59, y: 0.78 });
    assert.ok((result.acceptModalDarkRatio ?? 0) > 0.35);
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.04);
});

test("android window classifier detects low-contrast real ready-check accept state", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "accept-ready",
            "na_accept_ready_07.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "ACCEPT_READY");
    assert.deepEqual(result.acceptReadyPoint, { x: 0.59, y: 0.78 });
    assert.ok((result.acceptModalDarkRatio ?? 0) > 0.50);
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.02);
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

test("android window classifier detects room timer queue state", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "queue",
            "na_queue_room_timer_01.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "QUEUE");
    assert.deepEqual(result.cancelQueuePoint, { x: 0.83, y: 0.9 });
    assert.ok((result.queueCancelDarkRatio ?? 0) > 0.55);
    assert.ok((result.queueStatusDarkRatio ?? 0) > 0.35);
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
    assert.equal(result.lobbyVariant, "ROOM");
    assert.deepEqual(result.startQueuePoint, { x: 0.87, y: 0.9 });
    assert.deepEqual(result.leaveRoomPoint, { x: 0.08, y: 0.06 });
    assert.ok((result.lobbyStartBlueRatio ?? 0) > 0.30);
    assert.ok((result.roomBackGoldRatio ?? 0) > 0.05);
});

test("android window classifier detects ad-sidebar room lobby reset point", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "lobby",
            "na_room_start_blocked_01.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "LOBBY");
    assert.equal(result.lobbyVariant, "ROOM");
    assert.deepEqual(result.startQueuePoint, { x: 0.87, y: 0.9 });
    assert.deepEqual(result.leaveRoomPoint, { x: 0.24, y: 0.14 });
    assert.ok((result.roomBackGoldRatio ?? 0) > 0.018);
});

test("android window classifier detects mode-selection carousel after tapping start", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "mode-select",
            "na_mode_select_01.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "MODE_SELECT");
    assert.deepEqual(result.selectGameModePoint, { x: 0.35, y: 0.66 });
    assert.deepEqual(result.startQueuePoint, { x: 0.87, y: 0.90 });
    assert.ok((result.modeSelectGoldRatio ?? 0) > 0.04);
    assert.ok((result.modeSelectBlueRatio ?? 0) > 0.04);
});

test("android window classifier keeps selected-mode start screen in lobby flow", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "mode-select",
            "na_mode_selected_start_01.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "LOBBY");
    assert.equal(result.lobbyVariant, "ROOM");
    assert.deepEqual(result.startQueuePoint, { x: 0.87, y: 0.9 });
    assert.deepEqual(result.leaveRoomPoint, { x: 0.24, y: 0.14 });
    assert.ok((result.lobbyStartBlueRatio ?? 0) > 0.25);
});

test("android window classifier detects recoverable foreground confirmation modal", async () => {
    const fixtureNames = [
        "na_ready_declined_modal_01.png",
        "na_ready_declined_room_modal_02.png",
    ];

    for (const fixtureName of fixtureNames) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "examples",
                "recordings",
                "android-foreground-na-captures",
                "pending-real-captures",
                "confirm-modal",
                fixtureName
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);

        assert.equal(result.state, "CONFIRM_MODAL", fixtureName);
        assert.equal(result.confirmModalVariant, "RECOVERABLE_CONFIRM", fixtureName);
        assert.deepEqual(result.confirmModalPoint, { x: 0.50, y: 0.62 });
        assert.ok((result.acceptModalDarkRatio ?? 0) > 0.85, fixtureName);
        assert.ok((result.transitionCenterDarkRatio ?? 0) > 0.80, fixtureName);
    }
});

test("android window classifier uses centered confirm button for latest ranked-room modal", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-live-smoke-1779779391022.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "CONFIRM_MODAL");
    assert.equal(result.confirmModalVariant, "RECOVERABLE_CONFIRM");
    assert.deepEqual(result.confirmModalPoint, { x: 0.50, y: 0.62 });
});

test("android foreground protocol labels network confirmation modal separately", () => {
    const classification: AndroidWindowClassification = {
        state: "CONFIRM_MODAL",
        brightBlueRatio: 0,
        blueDominantRatio: 0,
        brightWhiteRatio: 0,
        confirmModalVariant: "NETWORK_ERROR",
        confirmModalPoint: { x: 0.57, y: 0.62 },
    };

    const observation = normalizeAndroidForegroundObservation(classification);

    assert.equal(observation.state, "CONFIRM_MODAL");
    assert.match(observation.reason, /Network-error/);
    assert.deepEqual(observation.anchors, ["network-error-modal", "modal-confirm-cta"]);
    assert.deepEqual(observation.actionPoints?.CONFIRM_MODAL, { x: 0.57, y: 0.62 });
});

test("android window classifier detects side-menu-open lobby as recoverable lobby", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-live-smoke-1773875308190.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "LOBBY");
    assert.equal(result.lobbyVariant, "SIDE_MENU_OPEN");
    assert.deepEqual(result.dismissOverlayPoint, { x: 0.78, y: 0.52 });
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.sideDismissDarkRatio ?? 0) > 0.85);
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
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "in-game-transition",
            "na_in_game_transition_loading_roster_03.png"
        ),
    ];

    for (const frame of frames) {
        const screenshot = await fs.readFile(frame);
        const result = await classifyAndroidWindowScreenshot(screenshot);

        assert.equal(result.state, "IN_GAME_TRANSITION");
    }
});
