import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
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

test("android window classifier blocks Riot network error frontend screens", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-app-riot-refresh-token-error.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "TFT_FRONTEND");
    assert.equal(result.frontendVariant, "NETWORK_ERROR");
    assert.equal(result.primaryActionPoint, undefined);
    assert.equal(observation.state, "NETWORK_ERROR");
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
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "live-content",
            "na_live_stage_1_2_combat_requeue_01.png"
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

test("android window classifier detects in-game placement modal before live HUD", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "game-over",
            "na_game_over_rank6_modal_01.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "GAME_OVER");
    assert.deepEqual(result.gameOverExitPoint, { x: 0.50, y: 0.625 });
    assert.ok((result.gameOverResultExitBlueRatio ?? 0) > 0.055);
    assert.ok((result.gameOverResultWatchDarkRatio ?? 0) > 0.30);
    assert.deepEqual(observation.actionPoints?.GAME_OVER_EXIT, { x: 0.50, y: 0.625 });
});

test("android window classifier detects live-HUD placement modal before gameplay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-low-purple-classifier-install",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "GAME_OVER");
    assert.deepEqual(result.gameOverExitPoint, { x: 0.50, y: 0.625 });
    assert.equal(result.startQueuePoint, undefined);
    assert.deepEqual(observation.actionPoints?.GAME_OVER_EXIT, { x: 0.50, y: 0.625 });
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.30);
    assert.ok((result.gameOverResultExitBlueRatio ?? 0) > 0.06);
});

test("android window classifier detects transparent placement modal before live HUD", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-app-current-result-lv-issue.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "GAME_OVER");
    assert.deepEqual(result.gameOverExitPoint, { x: 0.50, y: 0.625 });
    assert.deepEqual(observation.actionPoints?.GAME_OVER_EXIT, { x: 0.50, y: 0.625 });
});

test("android window classifier detects late dimmed placement modal", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-maintenance-gate-patch",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "GAME_OVER");
    assert.deepEqual(result.gameOverExitPoint, { x: 0.50, y: 0.625 });
    assert.ok((result.gameOverResultWatchDarkRatio ?? 0) > 0.90);
    assert.deepEqual(observation.actionPoints?.GAME_OVER_EXIT, { x: 0.50, y: 0.625 });
});

test("android window classifier keeps animated placement result above live HUD fallback", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260602-result-exit-live",
            "tick-00002-game-over.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "GAME_OVER");
    assert.deepEqual(result.gameOverExitPoint, { x: 0.50, y: 0.625 });
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.03);
});

test("android window classifier detects bright placement result modal", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260603-after-player-list-patch",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "GAME_OVER");
    assert.deepEqual(result.gameOverExitPoint, { x: 0.50, y: 0.625 });
    assert.deepEqual(observation.actionPoints?.GAME_OVER_EXIT, { x: 0.50, y: 0.625 });
    assert.ok((result.gameOverResultTitleBlueRatio ?? 0) > 0.16);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) < 0.005);
});

test("android window classifier detects game-over scoreboard before lobby start regions", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-app-result-scoreboard-detect.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "GAME_OVER");
    assert.deepEqual(result.gameOverExitPoint, { x: 0.87, y: 0.85 });
    assert.deepEqual(observation.actionPoints?.GAME_OVER_EXIT, { x: 0.87, y: 0.85 });
});

test("android window classifier detects dark game-over scoreboard with again button", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-185825-stage3-classifier-live",
            "tick-00001-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "GAME_OVER");
    assert.deepEqual(result.gameOverExitPoint, { x: 0.87, y: 0.85 });
    assert.ok((result.gameOverResultWatchDarkRatio ?? 0) > 0.75);
});

test("android window classifier detects dimmed game-over modal", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-195500-level-count-live",
            "tick-00001-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "GAME_OVER");
    assert.deepEqual(result.gameOverExitPoint, { x: 0.50, y: 0.625 });
    assert.ok((result.progressDarkRatio ?? 0) > 0.90);
});

test("android window classifier detects muted late placement modal", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-cont-current",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "GAME_OVER");
    assert.deepEqual(result.gameOverExitPoint, { x: 0.50, y: 0.625 });
    assert.deepEqual(observation.actionPoints?.GAME_OVER_EXIT, { x: 0.50, y: 0.625 });
    assert.ok((result.gameOverResultWatchDarkRatio ?? 0) > 0.75);
    assert.ok((result.gameOverRowsDarkRatio ?? 0) > 0.42);
});

test("android window classifier detects purple muted placement modal", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-bright-opponent-live-classifier",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "GAME_OVER");
    assert.deepEqual(result.gameOverExitPoint, { x: 0.50, y: 0.625 });
    assert.deepEqual(observation.actionPoints?.GAME_OVER_EXIT, { x: 0.50, y: 0.625 });
    assert.ok((result.gameOverResultWatchDarkRatio ?? 0) > 0.40);
    assert.ok((result.queueCancelDarkRatio ?? 0) > 0.58);
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
    assert.deepEqual(result.acceptReadyPoint, { x: 0.50, y: 0.76 });
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
    assert.deepEqual(result.acceptReadyPoint, { x: 0.50, y: 0.76 });
    assert.ok((result.acceptModalDarkRatio ?? 0) > 0.50);
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.02);
});

test("android window classifier detects large-circle ready-check accept state", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "accept-ready",
            "na_accept_ready_08_large_circle.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "ACCEPT_READY");
    assert.deepEqual(result.acceptReadyPoint, { x: 0.50, y: 0.76 });
    assert.ok((result.acceptModalDarkRatio ?? 0) > 0.33);
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.045);
    assert.ok((result.transitionCenterDarkRatio ?? 0) > 0.48);
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
    assert.deepEqual(result.startQueuePoint, { x: 0.82, y: 0.9 });
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
    assert.deepEqual(result.startQueuePoint, { x: 0.82, y: 0.9 });
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
    assert.deepEqual(result.startQueuePoint, { x: 0.82, y: 0.90 });
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
    assert.deepEqual(result.startQueuePoint, { x: 0.82, y: 0.9 });
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
        assert.equal(result.augmentChoiceVisible, false, fixtureName);
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

test("android window classifier detects current loading roster transition", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-post-encounter-timeout.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "IN_GAME_TRANSITION");
    assert.ok((result.queueStatusGoldRatio ?? 0) > 0.08);
    assert.ok((result.progressDarkRatio ?? 0) > 0.55);
});

test("android window classifier detects S16 loading roster transition after normal requeue", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-scoreboard-requeue-live",
            "tick-00002-unknown-queue-poll-10.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "IN_GAME_TRANSITION");
    assert.ok((result.queueStatusGoldRatio ?? 0) > 0.055);
    assert.ok((result.progressDarkRatio ?? 0) > 0.60);
});

test("android window classifier keeps 65-percent roster loading out of login-required", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-player-list-live-classifier-install-validation",
            "tick-00007-login-required.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "IN_GAME_TRANSITION");
    assert.equal(result.frontendVariant, undefined);
    assert.equal(observation.state, "IN_GAME_TRANSITION");
    assert.ok((result.brightWhiteRatio ?? 0) > 0.05);
    assert.ok((result.queueStatusGoldRatio ?? 0) > 0.06);
    assert.ok((result.progressDarkRatio ?? 0) > 0.65);
});

test("android window classifier detects bright S16 loading roster transition after normal requeue", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-heartbeat-settings-back-fallback-live",
            "tick-00003-unknown-queue-poll-60.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "IN_GAME_TRANSITION");
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.10);
    assert.ok((result.progressDarkRatio ?? 0) > 0.65);
});

test("android window classifier detects current 100-percent roster transition after normal requeue", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-142720-dark-star-god-live",
            "tick-00004-unknown-queue-poll-60.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "IN_GAME_TRANSITION");
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.055);
    assert.ok((result.progressDarkRatio ?? 0) > 0.70);
});

test("android window classifier treats dark item room as non-actionable transition", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260605-after-early-opponent-return-live.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "IN_GAME_TRANSITION");
    assert.equal(observation.state, "IN_GAME_TRANSITION");
    assert.equal(result.augmentChoiceVisible, false);
    assert.ok((result.progressDarkRatio ?? 0) > 0.95);
    assert.ok((result.transitionCenterDarkRatio ?? 0) > 0.95);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) < 0.03);
});

test("android window classifier detects dark 71-percent roster transition after normal requeue", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-low-blue-shop-classifier-validate-live",
            "tick-00007-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "IN_GAME_TRANSITION");
    assert.equal(observation.state, "IN_GAME_TRANSITION");
    assert.equal(result.augmentChoiceVisible, false);
    assert.ok((result.queueStatusGoldRatio ?? 0) > 0.020);
    assert.ok((result.queueStatusDarkRatio ?? 0) > 0.42);
    assert.ok((result.progressDarkRatio ?? 0) > 0.70);
});

test("android window classifier detects current 72-percent roster transition after normal requeue", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-balanced-choice-detail-patch-live",
            "tick-00005-unknown-queue-poll-60.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "IN_GAME_TRANSITION");
    assert.equal(observation.state, "IN_GAME_TRANSITION");
    assert.equal(result.augmentChoiceVisible, false);
    assert.ok((result.queueStatusDarkRatio ?? 0) > 0.43);
    assert.ok((result.progressDarkRatio ?? 0) > 0.70);
});

test("android window classifier detects current 76-percent roster transition after normal requeue", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-pinkblue-choice-live",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "IN_GAME_TRANSITION");
    assert.equal(observation.state, "IN_GAME_TRANSITION");
    assert.equal(result.augmentChoiceVisible, false);
    assert.ok((result.progressDarkRatio ?? 0) > 0.70);
    assert.ok((result.augmentCardPurpleRatio ?? 0) > 0.30);
});

test("android window classifier detects current 95-percent roster transition after normal requeue", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-continuation-from-7th-result-live",
            "tick-00005-unknown-queue-poll-46.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "IN_GAME_TRANSITION");
    assert.equal(observation.state, "IN_GAME_TRANSITION");
    assert.equal(result.augmentChoiceVisible, false);
    assert.ok((result.queueStatusDarkRatio ?? 0) > 0.48);
    assert.ok((result.progressDarkRatio ?? 0) > 0.72);
});

test("android window classifier keeps roster loading cards out of augment actions", async () => {
    for (const { dir, frame } of [
        {
            dir: "goal-current-20260604-after-post-shop-overlay-run",
            frame: "current.png",
        },
        {
            dir: "goal-continue-20260604-post-shop-overlay-classifier-live",
            frame: "tick-00005-unknown.png",
        },
    ]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                dir,
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);

        assert.equal(result.state, "IN_GAME_TRANSITION", frame);
        assert.equal(result.augmentChoiceVisible, false, frame);
    }
});

test("android window classifier flags live augment choice overlays without false-positive combat frames", async () => {
    const augmentScreenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "live-content",
            "na_live_augment_choice_3_2_01.png"
        )
    );
    const combatScreenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "android-app-combat-no-augment-false-positive.png"
        )
    );

    const augmentResult = await classifyAndroidWindowScreenshot(augmentScreenshot);
    const combatResult = await classifyAndroidWindowScreenshot(combatScreenshot);

    assert.equal(augmentResult.augmentChoiceVisible, true);
    assert.ok((augmentResult.augmentCardDarkRatio ?? 0) > 0.30);
    assert.equal(combatResult.augmentChoiceVisible, false);
});

test("android foreground protocol treats visible augment choices as live actionable content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-after-back-fallback-timeout.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.equal(observation.state, "LIVE_CONTENT");
});

test("android foreground protocol treats damage-panel combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-after-augment-fix.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.12);
    assert.ok((result.progressDarkRatio ?? 0) > 0.10);
});

test("android foreground protocol treats dark shop combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-heartbeat-after-loot-fp-run-timeout.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.055);
    assert.ok((result.progressDarkRatio ?? 0) > 0.55);
});

test("android window classifier detects dark post-roster shop combat as live content", async () => {
    for (const frame of ["tick-00001-unknown.png", "tick-00002-unknown.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-144248-roster-transition-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
    }
});

test("android foreground protocol dismisses settings overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-after-own-board-return-run.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LOBBY");
    assert.equal(result.lobbyVariant, "SETTINGS_OPEN");
    assert.deepEqual(observation.actionPoints?.DISMISS_OVERLAY, { x: 0.80, y: 0.148 });
});

test("android foreground protocol keeps faded settings overlay recoverable", async () => {
    for (const frame of ["tick-00005-lobby.png", "tick-00012-lobby.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-1326-detail-panel-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.state, "LOBBY", frame);
        assert.equal(result.lobbyVariant, "SETTINGS_OPEN", frame);
        assert.deepEqual(observation.actionPoints?.DISMISS_OVERLAY, { x: 0.80, y: 0.148 });
    }
});

test("android window classifier flags two-option encounter choice overlays", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-loot-follow",
            "tick-00002-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.35, y: 0.54 });
    assert.ok((result.acceptModalDarkRatio ?? 0) > 0.75);
    assert.ok((result.augmentCardDarkRatio ?? 0) > 0.65);
});

test("android window classifier flags dark two-option encounter choice overlays", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-loot-fix-live",
            "tick-00003-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.35, y: 0.54 });
    assert.ok((result.queueCancelDarkRatio ?? 0) > 0.55);
    assert.ok((result.augmentCardDarkRatio ?? 0) > 0.75);
});

test("android window classifier flags S16 star-god encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-own-board-stability-live",
            "tick-00002-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
});

test("android window classifier flags darker S16 star-god encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-heartbeat-loot-fp-fix-live",
            "tick-00005-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
});

test("android window classifier flags illustrated S16 star-god encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-1300-corrected-android-controls-live",
            "tick-00026-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
});

test("android window classifier flags S16 star-guardian encounter choice overlay", async () => {
    for (const frame of ["tick-00013-unknown.png", "tick-00014-unknown.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-133811-safe-buy-autodeploy-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.augmentChoiceVisible, true, frame);
        assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 }, frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
    }
});

test("android window classifier flags dark S16 star-god item encounter choice overlay", async () => {
    for (const frame of ["tick-00004-unknown.png", "tick-00005-unknown.png", "tick-00006-unknown.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-141327-bottom-gold-economy-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.augmentChoiceVisible, true, frame);
        assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 }, frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
    }
});

test("android window classifier flags bright S16 star-god item encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-205900-bright-combat-emergency-level-live",
            "tick-00028-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
});

test("android window classifier flags muted S16 star-god item encounter choice overlays", async () => {
    for (const [folder, frame] of [
        ["goal-continue-20260603-212600-star-god-choice-fix-live", "tick-00022-unknown.png"],
        ["goal-current-20260603-after-star-god-choice-run", "current.png"],
    ] as const) {
        const screenshot = await fs.readFile(path.resolve(process.cwd(), "reports", folder, frame));

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.augmentChoiceVisible, true, frame);
        assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 }, frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
    }
});

test("android window classifier flags balanced S16 star-god item encounter choice overlays", async () => {
    for (const frame of ["tick-00011-unknown.png", "tick-00021-unknown.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260604-maintenance-gameover-recovery-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.augmentChoiceVisible, true, frame);
        assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 }, frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
        assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.090, frame);
        assert.ok((result.progressDarkRatio ?? 0) > 0.77, frame);
    }
});

test("android window classifier flags dim S16 star-god item encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-weak-hud-transition-patch-live",
            "tick-00002-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.progressDarkRatio ?? 0) > 0.71);
});

test("android window classifier flags red-green S16 star-god item encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-continuation-from-7th-result-live",
            "tick-00014-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.progressDarkRatio ?? 0) > 0.88);
});

test("android window classifier flags low-contrast S16 star-god encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-001100-post-detail-patch-live-slice",
            "tick-00002-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
});

test("android window classifier flags pink-blue S16 star-god item encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-buy-before-roll-timeout",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.35, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.augmentCardDarkRatio ?? 0) > 0.83);
    assert.ok((result.queueStatusDarkRatio ?? 0) > 0.90);
});

test("android window classifier flags low-score S16 star-god encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-levelup-autodeploy-validation3.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudScoreSignalRatio ?? 0) < 0.036);
    assert.ok((result.progressDarkRatio ?? 0) > 0.64);
});

test("android window classifier flags S16 star-god shop encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-resume-from-8th-live",
            "tick-00014-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.35, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.045);
    assert.ok((result.progressDarkRatio ?? 0) > 0.59);
});

test("android window classifier flags S16 star-god duel encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-post-purple-recovery-gameplay-live",
            "tick-00001-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.040);
    assert.ok((result.progressDarkRatio ?? 0) > 0.46);
});

test("android window classifier flags low-purple S16 star-god duel encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-after-high-blue-shop-live-continue",
            "tick-00001-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.augmentCardPurpleRatio ?? 0) < 0.007);
    assert.ok((result.gameOverResultExitBlueRatio ?? 0) < 0.01);
});

test("android window classifier flags low-score S16 star-god item choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260605-post-stage3-classifier-fresh-live",
            "tick-00011-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudScoreSignalRatio ?? 0) < 0.015);
    assert.ok((result.progressDarkRatio ?? 0) > 0.90);
});

test("android window classifier flags S16 versus star-god encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-extreme-econ-rule-live",
            "tick-00005-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
});

test("android window classifier flags dark S16 versus star-god encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-continuation-from-42-augment-live",
            "tick-00014-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.augmentCardDarkRatio ?? 0) > 0.78);
    assert.ok((result.progressDarkRatio ?? 0) > 0.88);
});

test("android window classifier flags one-option encounter choice overlay", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-1024-after-direct-orb-tap.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.augmentChoiceVisible, true);
    assert.deepEqual(result.augmentChoicePoint, { x: 0.65, y: 0.54 });
    assert.equal(observation.state, "LIVE_CONTENT");
});

test("android window classifier detects live player-list board view without gold HUD", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "live-content",
            "na_live_player_list_stage_4_1_01.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.033);
});

test("android window classifier keeps stage-3 opponent player-list combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-223000-post-panel-fix-fresh-normal-live",
            "tick-00021-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.12);
    assert.ok((result.lobbyStartBlueRatio ?? 0) < 0.12);
});

test("android window classifier keeps live unit-detail combat out of lobby recovery", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260605-item-room-guard-midgame-live",
            "tick-00004-lobby.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.20);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.018);
    assert.ok((result.progressDarkRatio ?? 0) < 0.02);
});

test("android window classifier keeps current stage-3 opponent combat as live content", async () => {
    for (const frame of ["tick-00009-unknown.png", "tick-00010-unknown.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260605-item-room-guard-midgame-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
        assert.equal(result.startQueuePoint, undefined, frame);
        assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.050, frame);
        assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.035, frame);
        assert.ok((result.progressDarkRatio ?? 0) > 0.14, frame);
    }
});

test("android window classifier keeps fresh weak-HUD opponent combat as live content", async () => {
    for (const frame of ["tick-00009-unknown.png", "tick-00017-unknown.png", "tick-00018-unknown.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260605-post-stage3-classifier-fresh-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
        assert.equal(result.startQueuePoint, undefined, frame);
        assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.050, frame);
        assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.010, frame);
    }
});

test("android window classifier keeps stage-3 opponent bench combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-continue-after-dark-choice-patch-live",
            "tick-00004-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.055);
    assert.ok((result.progressDarkRatio ?? 0) > 0.88);
});

test("android window classifier keeps weak-HUD early opponent board as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-balanced-choice-detail-patch-live",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.018);
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.075);
});

test("android window classifier keeps weak-HUD stage-3 opponent board as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-after-result-recovery-fix-gameplay-live",
            "tick-00004-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.070);
    assert.ok((result.roomBackDarkRatio ?? 0) > 0.79);
});

test("android window classifier keeps bright stage-3 opponent combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-continue-after-dark-choice-patch-live",
            "tick-00011-in-game-transition.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.090);
    assert.ok((result.progressDarkRatio ?? 0) < 0.025);
});

test("android window classifier detects blue-side-list combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-1050-adb-augment-live",
            "tick-00004-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.045);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.030);
    assert.ok((result.lobbyStartBlueRatio ?? 0) < 0.12);
});

test("android window classifier detects weak-HUD player-list combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-110806-safe-shop-no-template-live",
            "tick-00009-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.018);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.018);
});

test("android window classifier keeps current stage 3-2 opponent board out of lobby recovery", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-after-xp18-live.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.42);
    assert.ok((result.lobbyStartBlueRatio ?? 0) > 0.45);
});

test("android window classifier detects current damage-panel combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-151551-xp18-live",
            "tick-00010-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.040);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.085);
});

test("android window classifier detects current low-HUD 2-3 combat as live content", async () => {
    for (const frame of ["tick-00007-unknown.png", "tick-00008-unknown.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-163421-own-board-hud-live-match",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
        assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.40, frame);
        assert.ok((result.gameOverResultExitBlueRatio ?? 0) > 0.55, frame);
    }
});

test("android window classifier prioritizes strong live HUD over transition colors", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-110806-safe-shop-no-template-live",
            "tick-00011-in-game-transition.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.30);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.05);
});

test("android window classifier keeps bright opponent board combat out of boot state", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-stale-augment-guard-live",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok(result.brightBlueRatio > 0.18);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.20);
    assert.ok((result.roomBackDarkRatio ?? 0) > 0.45);
});

test("android window classifier detects top-HUD low-blue combat after augment as live content", async () => {
    for (const frame of ["tick-00011-in-game-transition.png", "tick-00012-in-game-transition.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-115012-top-gold-live-validation",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
        assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.12, frame);
        assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.045, frame);
    }
});

test("android window classifier detects shop detail loot panel as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-1102-blue-combat-live",
            "tick-00003-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.16);
    assert.ok((result.lobbyStartBlueRatio ?? 0) < 0.24);
    assert.ok((result.queueStatusGoldRatio ?? 0) > 0.04);
});

test("android window classifier keeps S16 right detail panel in live content", async () => {
    for (const frame of ["tick-00012-unknown.png", "tick-00016-unknown.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-1315-illustrated-encounter-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.18, frame);
        assert.ok((result.augmentCardPurpleRatio ?? 0) > 0.55, frame);
    }
});

test("android window classifier keeps live combat unit detail panel out of lobby recovery", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-085303-live-match-validation",
            "tick-00033-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.25);
    assert.ok((result.lobbyStartBlueRatio ?? 0) > 0.24);
    assert.ok((result.progressDarkRatio ?? 0) < 0.03);
});

test("android window classifier keeps bright stage-2 unit detail panel out of lobby recovery", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-maintenance-gameover-recovery-live",
            "tick-00015-lobby.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.20);
    assert.ok((result.augmentRerollBlueRatio ?? 0) > 0.34);
});

test("android window classifier keeps stage-3 right unit detail panel as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-220000-muted-choice-econ-guard-live",
            "tick-00022-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.12);
    assert.ok((result.roomBackGoldRatio ?? 0) > 0.22);
});

test("android window classifier keeps stage-2 combat unit detail panel as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-post-hud-level-maintenance-live",
            "tick-00012-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.040);
    assert.ok((result.gameOverResultTitleBlueRatio ?? 0) > 0.38);
    assert.ok((result.augmentCardPurpleRatio ?? 0) > 0.22);
});

test("android window classifier keeps star-god side panel out of lobby recovery", async () => {
    for (const frame of ["tick-00019-unknown.png", "tick-00020-lobby.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-1155-fresh-match-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.18, frame);
        assert.ok((result.augmentCardPurpleRatio ?? 0) > 0.55, frame);
        assert.ok((result.queueStatusGoldRatio ?? 0) > 0.05, frame);
    }
});

test("android window classifier keeps live HUD priority over large blue shop/start regions", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "smoke",
            "codex_live_newgame_shop_100s.png"
        )
    );
    const metadata = await sharp(screenshot).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const blueOverlay = Buffer.from(
        `<svg width="${width}" height="${height}"><rect x="${Math.round(width * 0.75)}" y="${Math.round(height * 0.80)}" width="${Math.round(width * 0.24)}" height="${Math.round(height * 0.18)}" fill="rgb(0,200,255)"/></svg>`
    );
    const synthetic = await sharp(screenshot)
        .composite([{ input: blueOverlay, left: 0, top: 0 }])
        .png()
        .toBuffer();

    const result = await classifyAndroidWindowScreenshot(synthetic);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.ok(result.brightBlueRatio > 0.18);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.10);
});

test("android window classifier keeps live shop state out of lobby recovery", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-post-gold-live.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.ok((result.lobbyStartBlueRatio ?? 0) > 0.25);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.10);
});

test("android window classifier keeps current shop combat frames as live content", async () => {
    for (const frame of [
        path.join(
            "reports",
            "goal-continue-20260603-191600-result-recovery-live",
            "tick-00007-unknown.png"
        ),
        path.join("reports", "goal-current-20260603-after-result-recovery-live.png"),
    ]) {
        const screenshot = await fs.readFile(path.resolve(process.cwd(), frame));

        const result = await classifyAndroidWindowScreenshot(screenshot);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.030, frame);
        assert.ok((result.modeSelectBlueRatio ?? 0) > 0.24, frame);
    }
});

test("android window classifier keeps low-blue shop combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-resume-post-econ-star-choice-live",
            "tick-00013-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.070);
    assert.ok((result.queueCancelDarkRatio ?? 0) > 0.60);
});

test("android window classifier keeps stage-2 shop with combat-ring banner as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-post-augment-fallback-live",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.025);
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.34);
    assert.ok((result.gameOverResultExitBlueRatio ?? 0) > 0.50);
});

test("android window classifier keeps high-blue stage-2 shop combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-resume-stage36-econ-live",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.050);
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.56);
    assert.ok((result.gameOverResultExitBlueRatio ?? 0) > 0.54);
});

test("android window classifier keeps bright late opponent-board combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-2-1-augment-fallback-live",
            "current.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.50);
    assert.ok((result.gameOverResultExitBlueRatio ?? 0) > 0.62);
    assert.ok((result.augmentCardPurpleRatio ?? 0) > 0.56);
});

test("android window classifier keeps high-blue stage-3 combat out of lobby recovery", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-194000-shop-classifier-live",
            "tick-00002-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.12);
    assert.ok((result.lobbyStartBlueRatio ?? 0) > 0.45);
});

test("android window classifier keeps high-blue S16 combat out of lobby recovery", async () => {
    for (const frame of [
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-230600-bright-result-recovery-live",
            "tick-00007-lobby.png"
        ),
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260603-after-timeout-check",
            "current.png"
        ),
    ]) {
        const screenshot = await fs.readFile(frame);

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
        assert.equal(result.startQueuePoint, undefined, frame);
        assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.08, frame);
        assert.ok((result.lobbyStartBlueRatio ?? 0) > 0.48, frame);
    }
});

test("android window classifier keeps late-stage live combat/detail panels out of recovery", async () => {
    for (const { dir, frame } of [
        {
            dir: "goal-continue-20260603-232200-high-blue-live-retry",
            frame: "tick-00006-unknown.png",
        },
        {
            dir: "goal-continue-20260603-232200-high-blue-live-retry",
            frame: "tick-00012-lobby.png",
        },
        {
            dir: "goal-continue-20260603-232200-high-blue-live-retry",
            frame: "tick-00015-unknown.png",
        },
        {
            dir: "goal-continue-20260603-235200-detail-panel-live-retry",
            frame: "tick-00003-unknown.png",
        },
        {
            dir: "goal-continue-20260604-continue-scoreboard-recovery-live",
            frame: "tick-00011-in-game-transition.png",
        },
        {
            dir: "goal-current-20260604-after-scoreboard-recovery-run",
            frame: "current.png",
        },
    ]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                dir,
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
        assert.equal(result.startQueuePoint, undefined, frame);
    }
});

test("android window classifier keeps early opponent-board combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-195500-level-count-live",
            "tick-00013-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.040);
    assert.ok((result.queueStatusDarkRatio ?? 0) > 0.42);
});

test("android window classifier keeps bright early combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260603-202900-emergency-level-priority-live",
            "tick-00008-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.030);
    assert.ok((result.augmentCardPurpleRatio ?? 0) > 0.18);
});

test("android window classifier keeps snowy player-list combat as live content", async () => {
    for (const frame of [
        "tick-00006-unknown.png",
        "tick-00007-unknown.png",
        "tick-00009-unknown.png",
        "tick-00010-unknown.png",
    ]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-131612-buying-followup-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.05, frame);
    }
});

test("android window classifier keeps current side-list combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260603-after-recovered-queue-run.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.015);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.020);
    assert.ok((result.roomBackDarkRatio ?? 0) > 0.60);
    assert.ok((result.progressDarkRatio ?? 0) > 0.16);
});

test("android window classifier keeps dark arena player-list combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260603-after-stage3-econ-patch-live.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.08);
    assert.ok((result.sideMenuDarkRatio ?? 0) > 0.43);
    assert.ok((result.roomBackDarkRatio ?? 0) > 0.65);
});

test("android window classifier keeps stage-3 combat snapshots out of transition skips", async () => {
    for (const frame of [
        "tick-00024-in-game-transition.png",
        "tick-00029-unknown.png",
    ]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-181820-stage3-econ-patch-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
    }
});

test("android window classifier keeps panel-open stage-3 combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-continue-20260604-augment-choice-followup-live",
            "tick-00002-unknown.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.050);
    assert.ok((result.acceptButtonBlueRatio ?? 0) > 0.17);
    assert.ok((result.sideDismissDarkRatio ?? 0) > 0.57);
});

test("android window classifier keeps player-list stage-3 combat as live content", async () => {
    const screenshot = await fs.readFile(
        path.resolve(
            process.cwd(),
            "reports",
            "goal-current-20260604-after-opponent-board-patch-fresh-live.png"
        )
    );

    const result = await classifyAndroidWindowScreenshot(screenshot);
    const observation = normalizeAndroidForegroundObservation(result);

    assert.equal(result.state, "LIVE_CONTENT");
    assert.equal(observation.state, "LIVE_CONTENT");
    assert.equal(result.startQueuePoint, undefined);
    assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.10);
    assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.038);
    assert.ok((result.transitionCenterGoldRatio ?? 0) > 0.10);
    assert.ok((result.progressDarkRatio ?? 0) < 0.22);
});

test("android window classifier keeps early opponent-board combat out of transition", async () => {
    for (const frame of ["tick-00010-unknown.png", "tick-00011-in-game-transition.png"]) {
        const screenshot = await fs.readFile(
            path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260605-unknown-econ-level-fix-live",
                frame
            )
        );

        const result = await classifyAndroidWindowScreenshot(screenshot);
        const observation = normalizeAndroidForegroundObservation(result);

        assert.equal(result.state, "LIVE_CONTENT", frame);
        assert.equal(observation.state, "LIVE_CONTENT", frame);
        assert.ok((result.liveHudGoldSignalRatio ?? 0) > 0.018, frame);
        assert.ok((result.liveHudScoreSignalRatio ?? 0) > 0.030, frame);
        assert.ok((result.transitionCenterGoldRatio ?? 0) > 0.10, frame);
        assert.ok((result.progressDarkRatio ?? 0) < 0.10, frame);
    }
});
