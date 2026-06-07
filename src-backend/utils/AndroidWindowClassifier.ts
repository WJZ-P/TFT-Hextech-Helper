import sharp from "sharp";
import type { SimplePoint } from "../TFTProtocol";

export type AndroidWindowScreenState =
    | "BLUESTACKS_BOOT"
    | "TFT_FRONTEND"
    | "LOBBY"
    | "MODE_SELECT"
    | "CONFIRM_MODAL"
    | "QUEUE"
    | "ACCEPT_READY"
    | "IN_GAME_TRANSITION"
    | "LIVE_CONTENT"
    | "GAME_OVER"
    | "UNKNOWN";
export type AndroidFrontendVariant = "UPDATE_READY" | "LOGIN_REQUIRED" | "NETWORK_ERROR";
export type AndroidLobbyVariant = "DEFAULT" | "ROOM" | "SIDE_MENU_OPEN" | "SETTINGS_OPEN";
export type AndroidConfirmModalVariant = "RECOVERABLE_CONFIRM" | "NETWORK_ERROR";

export interface AndroidWindowClassification {
    state: AndroidWindowScreenState;
    brightBlueRatio: number;
    blueDominantRatio: number;
    brightWhiteRatio: number;
    liveHudGoldSignalRatio?: number;
    liveHudScoreSignalRatio?: number;
    lobbyStartBlueRatio?: number;
    lobbyStartDarkRatio?: number;
    queueStatusGoldRatio?: number;
    queueStatusDarkRatio?: number;
    queueCancelDarkRatio?: number;
    acceptModalDarkRatio?: number;
    acceptButtonBlueRatio?: number;
    acceptButtonDarkRatio?: number;
    transitionCenterGoldRatio?: number;
    transitionCenterDarkRatio?: number;
    sideMenuDarkRatio?: number;
    sideMenuGoldRatio?: number;
    sideDismissDarkRatio?: number;
    roomBackGoldRatio?: number;
    roomBackDarkRatio?: number;
    modeSelectGoldRatio?: number;
    modeSelectBlueRatio?: number;
    modeSelectDarkRatio?: number;
    gameOverReplayBlueRatio?: number;
    gameOverRowsDarkRatio?: number;
    gameOverResultExitBlueRatio?: number;
    gameOverResultWatchDarkRatio?: number;
    gameOverResultTitleBlueRatio?: number;
    gameOverResultTitleDarkRatio?: number;
    augmentCardPurpleRatio?: number;
    augmentCardDarkRatio?: number;
    augmentRerollGoldRatio?: number;
    augmentRerollBlueRatio?: number;
    augmentChoiceVisible?: boolean;
    augmentChoicePoint?: SimplePoint;
    frontendVariant?: AndroidFrontendVariant;
    lobbyVariant?: AndroidLobbyVariant;
    confirmModalVariant?: AndroidConfirmModalVariant;
    primaryActionPoint?: SimplePoint;
    startQueuePoint?: SimplePoint;
    selectGameModePoint?: SimplePoint;
    confirmModalPoint?: SimplePoint;
    cancelQueuePoint?: SimplePoint;
    acceptReadyPoint?: SimplePoint;
    gameOverExitPoint?: SimplePoint;
    dismissOverlayPoint?: SimplePoint;
    leaveRoomPoint?: SimplePoint;
    loginSecondaryGoldRatio?: number;
    frontendRetryRedRatio?: number;
    progressDarkRatio?: number;
}

const UPDATE_PRIMARY_ACTION_POINT: SimplePoint = { x: 0.5, y: 0.545 };
const START_QUEUE_ACTION_POINT: SimplePoint = { x: 0.82, y: 0.90 };
const SELECT_GAME_MODE_ACTION_POINT: SimplePoint = { x: 0.35, y: 0.66 };
const CONFIRM_MODAL_ACTION_POINT: SimplePoint = { x: 0.50, y: 0.62 };
const NETWORK_CONFIRM_MODAL_ACTION_POINT: SimplePoint = { x: 0.50, y: 0.62 };
const CANCEL_QUEUE_ACTION_POINT: SimplePoint = { x: 0.83, y: 0.90 };
const ACCEPT_READY_ACTION_POINT: SimplePoint = { x: 0.50, y: 0.76 };
const GAME_OVER_RESULT_EXIT_ACTION_POINT: SimplePoint = { x: 0.50, y: 0.625 };
const GAME_OVER_SCOREBOARD_EXIT_ACTION_POINT: SimplePoint = { x: 0.87, y: 0.85 };
const DISMISS_OVERLAY_ACTION_POINT: SimplePoint = { x: 0.78, y: 0.52 };
const SETTINGS_DISMISS_ACTION_POINT: SimplePoint = { x: 0.80, y: 0.148 };
const ENCOUNTER_CHOICE_LEFT_POINT: SimplePoint = { x: 0.35, y: 0.54 };
const ENCOUNTER_CHOICE_RIGHT_POINT: SimplePoint = { x: 0.65, y: 0.54 };

function getLeaveRoomActionPoint(width: number, height: number): SimplePoint {
    return width / Math.max(1, height) > 1.90 ? { x: 0.24, y: 0.14 } : { x: 0.08, y: 0.06 };
}

function isGoldLoginPixel(red: number, green: number, blue: number): boolean {
    return red > 150 && green > 100 && green < 220 && blue < 140 && red > green;
}

function isDarkProgressPixel(red: number, green: number, blue: number): boolean {
    return red < 80 && green < 80 && blue < 80;
}

/**
 * 识别 BlueStacks 启动页。
 * 启动页右下角常驻大块亮蓝色 CTA，而真实 TFT 画面该区域通常不会出现如此高占比的亮蓝块。
 */
export async function classifyAndroidWindowScreenshot(
    screenshot: Buffer
): Promise<AndroidWindowClassification> {
    const metadata = await sharp(screenshot).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    const blueRegion = {
        left: Math.max(0, Math.round(width * 0.75)),
        top: Math.max(0, Math.round(height * 0.80)),
        width: Math.max(1, Math.round(width * 0.24)),
        height: Math.max(1, Math.round(height * 0.18)),
    };

    const whiteRegion = {
        left: Math.max(0, Math.round(width * 0.28)),
        top: Math.max(0, Math.round(height * 0.16)),
        width: Math.max(1, Math.round(width * 0.55)),
        height: Math.max(1, Math.round(height * 0.42)),
    };

    const loginSecondaryRegion = {
        left: Math.max(0, Math.round(width * 0.38)),
        top: Math.max(0, Math.round(height * 0.59)),
        width: Math.max(1, Math.round(width * 0.24)),
        height: Math.max(1, Math.round(height * 0.08)),
    };

    const progressRegion = {
        left: Math.max(0, Math.round(width * 0.15)),
        top: Math.max(0, Math.round(height * 0.92)),
        width: Math.max(1, Math.round(width * 0.7)),
        height: Math.max(1, Math.round(height * 0.04)),
    };

    const frontendRetryRegion = {
        left: Math.max(0, Math.round(width * 0.50)),
        top: Math.max(0, Math.round(height * 0.78)),
        width: Math.max(1, Math.round(width * 0.45)),
        height: Math.max(1, Math.round(height * 0.18)),
    };

    const lobbyStartRegion = {
        left: Math.max(0, Math.round(width * 0.72)),
        top: Math.max(0, Math.round(height * 0.83)),
        width: Math.max(1, Math.round(width * 0.24)),
        height: Math.max(1, Math.round(height * 0.14)),
    };

    const queueStatusRegion = {
        left: Math.max(0, Math.round(width * 0.58)),
        top: Math.max(0, Math.round(height * 0.74)),
        width: Math.max(1, Math.round(width * 0.20)),
        height: Math.max(1, Math.round(height * 0.20)),
    };

    const queueCancelRegion = {
        left: Math.max(0, Math.round(width * 0.72)),
        top: Math.max(0, Math.round(height * 0.80)),
        width: Math.max(1, Math.round(width * 0.24)),
        height: Math.max(1, Math.round(height * 0.16)),
    };

    const acceptModalRegion = {
        left: Math.max(0, Math.round(width * 0.30)),
        top: Math.max(0, Math.round(height * 0.22)),
        width: Math.max(1, Math.round(width * 0.40)),
        height: Math.max(1, Math.round(height * 0.56)),
    };

    const acceptButtonRegion = {
        left: Math.max(0, Math.round(width * 0.40)),
        top: Math.max(0, Math.round(height * 0.60)),
        width: Math.max(1, Math.round(width * 0.22)),
        height: Math.max(1, Math.round(height * 0.16)),
    };

    const transitionCenterRegion = {
        left: Math.max(0, Math.round(width * 0.24)),
        top: Math.max(0, Math.round(height * 0.18)),
        width: Math.max(1, Math.round(width * 0.52)),
        height: Math.max(1, Math.round(height * 0.62)),
    };

    const sideMenuRegion = {
        left: Math.max(0, Math.round(width * 0.00)),
        top: Math.max(0, Math.round(height * 0.08)),
        width: Math.max(1, Math.round(width * 0.42)),
        height: Math.max(1, Math.round(height * 0.84)),
    };

    const sideDismissRegion = {
        left: Math.max(0, Math.round(width * 0.62)),
        top: Math.max(0, Math.round(height * 0.28)),
        width: Math.max(1, Math.round(width * 0.30)),
        height: Math.max(1, Math.round(height * 0.50)),
    };

    const roomBackRegion = {
        left: 0,
        top: 0,
        width: Math.max(1, Math.round(width * 0.32)),
        height: Math.max(1, Math.round(height * 0.18)),
    };

    const modeSelectRegion = {
        left: Math.max(0, Math.round(width * 0.02)),
        top: Math.max(0, Math.round(height * 0.36)),
        width: Math.max(1, Math.round(width * 0.94)),
        height: Math.max(1, Math.round(height * 0.48)),
    };

    const { data, info } = await sharp(screenshot)
        .extract(blueRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const whiteRegionBuffer = await sharp(screenshot)
        .extract(whiteRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const loginSecondaryBuffer = await sharp(screenshot)
        .extract(loginSecondaryRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const progressBuffer = await sharp(screenshot)
        .extract(progressRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const frontendRetryBuffer = await sharp(screenshot)
        .extract(frontendRetryRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const lobbyStartBuffer = await sharp(screenshot)
        .extract(lobbyStartRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const queueStatusBuffer = await sharp(screenshot)
        .extract(queueStatusRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const queueCancelBuffer = await sharp(screenshot)
        .extract(queueCancelRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const acceptModalBuffer = await sharp(screenshot)
        .extract(acceptModalRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const acceptButtonBuffer = await sharp(screenshot)
        .extract(acceptButtonRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const transitionCenterBuffer = await sharp(screenshot)
        .extract(transitionCenterRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const sideMenuBuffer = await sharp(screenshot)
        .extract(sideMenuRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const sideDismissBuffer = await sharp(screenshot)
        .extract(sideDismissRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const roomBackBuffer = await sharp(screenshot)
        .extract(roomBackRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const modeSelectBuffer = await sharp(screenshot)
        .extract(modeSelectRegion)
        .raw()
        .toBuffer({ resolveWithObject: true });

    const gameOverReplayBuffer = await sharp(screenshot)
        .extract({
            left: Math.max(0, Math.round(width * 0.77)),
            top: Math.max(0, Math.round(height * 0.78)),
            width: Math.max(1, Math.round(width * 0.20)),
            height: Math.max(1, Math.round(height * 0.14)),
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const gameOverRowsBuffer = await sharp(screenshot)
        .extract({
            left: Math.max(0, Math.round(width * 0.22)),
            top: Math.max(0, Math.round(height * 0.18)),
            width: Math.max(1, Math.round(width * 0.42)),
            height: Math.max(1, Math.round(height * 0.72)),
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const gameOverResultExitBuffer = await sharp(screenshot)
        .extract({
            left: Math.max(0, Math.round(width * 0.40)),
            top: Math.max(0, Math.round(height * 0.56)),
            width: Math.max(1, Math.round(width * 0.22)),
            height: Math.max(1, Math.round(height * 0.10)),
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const gameOverResultWatchBuffer = await sharp(screenshot)
        .extract({
            left: Math.max(0, Math.round(width * 0.40)),
            top: Math.max(0, Math.round(height * 0.68)),
            width: Math.max(1, Math.round(width * 0.22)),
            height: Math.max(1, Math.round(height * 0.12)),
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const gameOverResultTitleBuffer = await sharp(screenshot)
        .extract({
            left: Math.max(0, Math.round(width * 0.36)),
            top: Math.max(0, Math.round(height * 0.36)),
            width: Math.max(1, Math.round(width * 0.28)),
            height: Math.max(1, Math.round(height * 0.18)),
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const augmentCardBuffer = await sharp(screenshot)
        .extract({
            left: Math.max(0, Math.round(width * 0.10)),
            top: Math.max(0, Math.round(height * 0.12)),
            width: Math.max(1, Math.round(width * 0.78)),
            height: Math.max(1, Math.round(height * 0.72)),
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const augmentRerollBuffer = await sharp(screenshot)
        .extract({
            left: Math.max(0, Math.round(width * 0.15)),
            top: Math.max(0, Math.round(height * 0.78)),
            width: Math.max(1, Math.round(width * 0.65)),
            height: Math.max(1, Math.round(height * 0.17)),
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    let blueDominant = 0;
    let brightBlue = 0;
    let brightWhite = 0;
    let loginSecondaryGold = 0;
    let frontendRetryRed = 0;
    let progressDark = 0;
    let liveHudGoldSignal = 0;
    let liveHudScoreSignal = 0;
    let lobbyStartBlue = 0;
    let lobbyStartDark = 0;
    let queueStatusGold = 0;
    let queueStatusDark = 0;
    let queueCancelDark = 0;
    let acceptModalDark = 0;
    let acceptButtonBlue = 0;
    let acceptButtonDark = 0;
    let transitionCenterGold = 0;
    let transitionCenterDark = 0;
    let sideMenuDark = 0;
    let sideMenuGold = 0;
    let sideDismissDark = 0;
    let roomBackGold = 0;
    let roomBackDark = 0;
    let modeSelectGold = 0;
    let modeSelectBlue = 0;
    let modeSelectDark = 0;
    let gameOverReplayBlue = 0;
    let gameOverReplayGold = 0;
    let gameOverRowsDark = 0;
    let gameOverResultExitBlue = 0;
    let gameOverResultWatchDark = 0;
    let gameOverResultTitleBlue = 0;
    let gameOverResultTitleDark = 0;
    let augmentCardPurple = 0;
    let augmentCardDark = 0;
    let augmentRerollGold = 0;
    let augmentRerollBlue = 0;

    for (let index = 0; index < data.length; index += info.channels) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        if (blue > 150 && blue > red + 40 && blue > green + 20) {
            blueDominant += 1;
        }

        if (blue > 180 && green > 120 && red < 120) {
            brightBlue += 1;
        }
    }

    for (let index = 0; index < whiteRegionBuffer.data.length; index += whiteRegionBuffer.info.channels) {
        const red = whiteRegionBuffer.data[index];
        const green = whiteRegionBuffer.data[index + 1];
        const blue = whiteRegionBuffer.data[index + 2];

        if (red > 225 && green > 225 && blue > 225) {
            brightWhite += 1;
        }
    }

    for (let index = 0; index < loginSecondaryBuffer.data.length; index += loginSecondaryBuffer.info.channels) {
        const red = loginSecondaryBuffer.data[index];
        const green = loginSecondaryBuffer.data[index + 1];
        const blue = loginSecondaryBuffer.data[index + 2];

        if (isGoldLoginPixel(red, green, blue)) {
            loginSecondaryGold += 1;
        }
    }

    for (let index = 0; index < progressBuffer.data.length; index += progressBuffer.info.channels) {
        const red = progressBuffer.data[index];
        const green = progressBuffer.data[index + 1];
        const blue = progressBuffer.data[index + 2];

        if (isDarkProgressPixel(red, green, blue)) {
            progressDark += 1;
        }
    }

    for (let index = 0; index < frontendRetryBuffer.data.length; index += frontendRetryBuffer.info.channels) {
        const red = frontendRetryBuffer.data[index];
        const green = frontendRetryBuffer.data[index + 1];
        const blue = frontendRetryBuffer.data[index + 2];

        if (red > 180 && green < 90 && blue < 90) {
            frontendRetryRed += 1;
        }
    }

    for (let index = 0; index < lobbyStartBuffer.data.length; index += lobbyStartBuffer.info.channels) {
        const red = lobbyStartBuffer.data[index];
        const green = lobbyStartBuffer.data[index + 1];
        const blue = lobbyStartBuffer.data[index + 2];

        if (blue > 150 && green > 80 && red < 120) {
            lobbyStartBlue += 1;
        }
        if (isDarkProgressPixel(red, green, blue)) {
            lobbyStartDark += 1;
        }
    }

    for (let index = 0; index < queueStatusBuffer.data.length; index += queueStatusBuffer.info.channels) {
        const red = queueStatusBuffer.data[index];
        const green = queueStatusBuffer.data[index + 1];
        const blue = queueStatusBuffer.data[index + 2];

        if (isGoldLoginPixel(red, green, blue)) {
            queueStatusGold += 1;
        }
        if (isDarkProgressPixel(red, green, blue)) {
            queueStatusDark += 1;
        }
    }

    for (let index = 0; index < queueCancelBuffer.data.length; index += queueCancelBuffer.info.channels) {
        const red = queueCancelBuffer.data[index];
        const green = queueCancelBuffer.data[index + 1];
        const blue = queueCancelBuffer.data[index + 2];

        if (isDarkProgressPixel(red, green, blue)) {
            queueCancelDark += 1;
        }
    }

    for (let index = 0; index < acceptModalBuffer.data.length; index += acceptModalBuffer.info.channels) {
        const red = acceptModalBuffer.data[index];
        const green = acceptModalBuffer.data[index + 1];
        const blue = acceptModalBuffer.data[index + 2];

        if (isDarkProgressPixel(red, green, blue)) {
            acceptModalDark += 1;
        }
    }

    for (let index = 0; index < acceptButtonBuffer.data.length; index += acceptButtonBuffer.info.channels) {
        const red = acceptButtonBuffer.data[index];
        const green = acceptButtonBuffer.data[index + 1];
        const blue = acceptButtonBuffer.data[index + 2];

        if (blue > 150 && green > 80 && red < 120) {
            acceptButtonBlue += 1;
        }
        if (isDarkProgressPixel(red, green, blue)) {
            acceptButtonDark += 1;
        }
    }

    for (let index = 0; index < transitionCenterBuffer.data.length; index += transitionCenterBuffer.info.channels) {
        const red = transitionCenterBuffer.data[index];
        const green = transitionCenterBuffer.data[index + 1];
        const blue = transitionCenterBuffer.data[index + 2];

        if (isGoldLoginPixel(red, green, blue)) {
            transitionCenterGold += 1;
        }
        if (isDarkProgressPixel(red, green, blue)) {
            transitionCenterDark += 1;
        }
    }

    for (let index = 0; index < sideMenuBuffer.data.length; index += sideMenuBuffer.info.channels) {
        const red = sideMenuBuffer.data[index];
        const green = sideMenuBuffer.data[index + 1];
        const blue = sideMenuBuffer.data[index + 2];

        if (isDarkProgressPixel(red, green, blue)) {
            sideMenuDark += 1;
        }
        if (isGoldLoginPixel(red, green, blue)) {
            sideMenuGold += 1;
        }
    }

    for (let index = 0; index < sideDismissBuffer.data.length; index += sideDismissBuffer.info.channels) {
        const red = sideDismissBuffer.data[index];
        const green = sideDismissBuffer.data[index + 1];
        const blue = sideDismissBuffer.data[index + 2];

        if (isDarkProgressPixel(red, green, blue)) {
            sideDismissDark += 1;
        }
    }

    for (let index = 0; index < roomBackBuffer.data.length; index += roomBackBuffer.info.channels) {
        const red = roomBackBuffer.data[index];
        const green = roomBackBuffer.data[index + 1];
        const blue = roomBackBuffer.data[index + 2];

        if (isGoldLoginPixel(red, green, blue)) {
            roomBackGold += 1;
        }
        if (isDarkProgressPixel(red, green, blue)) {
            roomBackDark += 1;
        }
    }

    for (let index = 0; index < modeSelectBuffer.data.length; index += modeSelectBuffer.info.channels) {
        const red = modeSelectBuffer.data[index];
        const green = modeSelectBuffer.data[index + 1];
        const blue = modeSelectBuffer.data[index + 2];

        if (isGoldLoginPixel(red, green, blue)) {
            modeSelectGold += 1;
        }
        if (blue > 150 && green > 80 && red < 120) {
            modeSelectBlue += 1;
        }
        if (isDarkProgressPixel(red, green, blue)) {
            modeSelectDark += 1;
        }
    }

    for (let index = 0; index < gameOverReplayBuffer.data.length; index += gameOverReplayBuffer.info.channels) {
        const red = gameOverReplayBuffer.data[index];
        const green = gameOverReplayBuffer.data[index + 1];
        const blue = gameOverReplayBuffer.data[index + 2];

        if (blue > 150 && green > 80 && red < 140) {
            gameOverReplayBlue += 1;
        }
        if (isGoldLoginPixel(red, green, blue)) {
            gameOverReplayGold += 1;
        }
    }

    for (let index = 0; index < gameOverRowsBuffer.data.length; index += gameOverRowsBuffer.info.channels) {
        const red = gameOverRowsBuffer.data[index];
        const green = gameOverRowsBuffer.data[index + 1];
        const blue = gameOverRowsBuffer.data[index + 2];

        if (isDarkProgressPixel(red, green, blue)) {
            gameOverRowsDark += 1;
        }
    }

    for (let index = 0; index < gameOverResultExitBuffer.data.length; index += gameOverResultExitBuffer.info.channels) {
        const red = gameOverResultExitBuffer.data[index];
        const green = gameOverResultExitBuffer.data[index + 1];
        const blue = gameOverResultExitBuffer.data[index + 2];

        if (blue > 150 && green > 80 && red < 140) {
            gameOverResultExitBlue += 1;
        }
    }

    for (let index = 0; index < gameOverResultWatchBuffer.data.length; index += gameOverResultWatchBuffer.info.channels) {
        const red = gameOverResultWatchBuffer.data[index];
        const green = gameOverResultWatchBuffer.data[index + 1];
        const blue = gameOverResultWatchBuffer.data[index + 2];

        if (isDarkProgressPixel(red, green, blue)) {
            gameOverResultWatchDark += 1;
        }
    }

    for (let index = 0; index < gameOverResultTitleBuffer.data.length; index += gameOverResultTitleBuffer.info.channels) {
        const red = gameOverResultTitleBuffer.data[index];
        const green = gameOverResultTitleBuffer.data[index + 1];
        const blue = gameOverResultTitleBuffer.data[index + 2];

        if (blue > 150 && green > 80 && red < 140) {
            gameOverResultTitleBlue += 1;
        }
        if (isDarkProgressPixel(red, green, blue)) {
            gameOverResultTitleDark += 1;
        }
    }

    for (let index = 0; index < augmentCardBuffer.data.length; index += augmentCardBuffer.info.channels) {
        const red = augmentCardBuffer.data[index];
        const green = augmentCardBuffer.data[index + 1];
        const blue = augmentCardBuffer.data[index + 2];

        if (blue > 120 && red > 55 && red < 190 && green < 130) {
            augmentCardPurple += 1;
        }
        if (red < 65 && green < 65 && blue < 90) {
            augmentCardDark += 1;
        }
    }

    for (let index = 0; index < augmentRerollBuffer.data.length; index += augmentRerollBuffer.info.channels) {
        const red = augmentRerollBuffer.data[index];
        const green = augmentRerollBuffer.data[index + 1];
        const blue = augmentRerollBuffer.data[index + 2];

        if (isGoldLoginPixel(red, green, blue)) {
            augmentRerollGold += 1;
        }
        if (blue > 150 && green > 80 && red < 140) {
            augmentRerollBlue += 1;
        }
    }

    const liveHudGoldBuffer = await sharp(screenshot)
        .extract({
            left: Math.max(0, Math.round(width * 0.80)),
            top: Math.max(0, Math.round(height * 0.82)),
            width: Math.max(1, Math.round(width * 0.13)),
            height: Math.max(1, Math.round(height * 0.10)),
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const liveHudScoreBuffer = await sharp(screenshot)
        .extract({
            left: Math.max(0, Math.round(width * 0.77)),
            top: Math.max(0, Math.round(height * 0.11)),
            width: Math.max(1, Math.round(width * 0.20)),
            height: Math.max(1, Math.round(height * 0.56)),
        })
        .raw()
        .toBuffer({ resolveWithObject: true });

    for (let index = 0; index < liveHudGoldBuffer.data.length; index += liveHudGoldBuffer.info.channels) {
        const red = liveHudGoldBuffer.data[index];
        const green = liveHudGoldBuffer.data[index + 1];
        const blue = liveHudGoldBuffer.data[index + 2];

        if (isGoldLoginPixel(red, green, blue) || (blue > 150 && green > 120 && red < 130)) {
            liveHudGoldSignal += 1;
        }
    }

    for (let index = 0; index < liveHudScoreBuffer.data.length; index += liveHudScoreBuffer.info.channels) {
        const red = liveHudScoreBuffer.data[index];
        const green = liveHudScoreBuffer.data[index + 1];
        const blue = liveHudScoreBuffer.data[index + 2];

        if (isGoldLoginPixel(red, green, blue) || (blue > 150 && green > 120 && red < 130)) {
            liveHudScoreSignal += 1;
        }
    }

    const pixelCount = Math.max(1, info.width * info.height);
    const whitePixelCount = Math.max(1, whiteRegionBuffer.info.width * whiteRegionBuffer.info.height);
    const loginSecondaryPixelCount = Math.max(1, loginSecondaryBuffer.info.width * loginSecondaryBuffer.info.height);
    const progressPixelCount = Math.max(1, progressBuffer.info.width * progressBuffer.info.height);
    const lobbyStartPixelCount = Math.max(1, lobbyStartBuffer.info.width * lobbyStartBuffer.info.height);
    const queueStatusPixelCount = Math.max(1, queueStatusBuffer.info.width * queueStatusBuffer.info.height);
    const queueCancelPixelCount = Math.max(1, queueCancelBuffer.info.width * queueCancelBuffer.info.height);
    const acceptModalPixelCount = Math.max(1, acceptModalBuffer.info.width * acceptModalBuffer.info.height);
    const acceptButtonPixelCount = Math.max(1, acceptButtonBuffer.info.width * acceptButtonBuffer.info.height);
    const transitionCenterPixelCount = Math.max(1, transitionCenterBuffer.info.width * transitionCenterBuffer.info.height);
    const sideMenuPixelCount = Math.max(1, sideMenuBuffer.info.width * sideMenuBuffer.info.height);
    const sideDismissPixelCount = Math.max(1, sideDismissBuffer.info.width * sideDismissBuffer.info.height);
    const roomBackPixelCount = Math.max(1, roomBackBuffer.info.width * roomBackBuffer.info.height);
    const modeSelectPixelCount = Math.max(1, modeSelectBuffer.info.width * modeSelectBuffer.info.height);
    const gameOverReplayPixelCount = Math.max(1, gameOverReplayBuffer.info.width * gameOverReplayBuffer.info.height);
    const gameOverRowsPixelCount = Math.max(1, gameOverRowsBuffer.info.width * gameOverRowsBuffer.info.height);
    const gameOverResultExitPixelCount = Math.max(1, gameOverResultExitBuffer.info.width * gameOverResultExitBuffer.info.height);
    const gameOverResultWatchPixelCount = Math.max(1, gameOverResultWatchBuffer.info.width * gameOverResultWatchBuffer.info.height);
    const gameOverResultTitlePixelCount = Math.max(1, gameOverResultTitleBuffer.info.width * gameOverResultTitleBuffer.info.height);
    const augmentCardPixelCount = Math.max(1, augmentCardBuffer.info.width * augmentCardBuffer.info.height);
    const augmentRerollPixelCount = Math.max(1, augmentRerollBuffer.info.width * augmentRerollBuffer.info.height);
    const liveHudGoldPixelCount = Math.max(1, liveHudGoldBuffer.info.width * liveHudGoldBuffer.info.height);
    const liveHudScorePixelCount = Math.max(1, liveHudScoreBuffer.info.width * liveHudScoreBuffer.info.height);
    const blueDominantRatio = blueDominant / pixelCount;
    const brightBlueRatio = brightBlue / pixelCount;
    const brightWhiteRatio = brightWhite / whitePixelCount;
    const loginSecondaryGoldRatio = loginSecondaryGold / loginSecondaryPixelCount;
    const frontendRetryRedRatio = frontendRetryRed / (frontendRetryBuffer.info.width * frontendRetryBuffer.info.height);
    const progressDarkRatio = progressDark / progressPixelCount;
    const lobbyStartBlueRatio = lobbyStartBlue / lobbyStartPixelCount;
    const lobbyStartDarkRatio = lobbyStartDark / lobbyStartPixelCount;
    const queueStatusGoldRatio = queueStatusGold / queueStatusPixelCount;
    const queueStatusDarkRatio = queueStatusDark / queueStatusPixelCount;
    const queueCancelDarkRatio = queueCancelDark / queueCancelPixelCount;
    const acceptModalDarkRatio = acceptModalDark / acceptModalPixelCount;
    const acceptButtonBlueRatio = acceptButtonBlue / acceptButtonPixelCount;
    const acceptButtonDarkRatio = acceptButtonDark / acceptButtonPixelCount;
    const transitionCenterGoldRatio = transitionCenterGold / transitionCenterPixelCount;
    const transitionCenterDarkRatio = transitionCenterDark / transitionCenterPixelCount;
    const sideMenuDarkRatio = sideMenuDark / sideMenuPixelCount;
    const sideMenuGoldRatio = sideMenuGold / sideMenuPixelCount;
    const sideDismissDarkRatio = sideDismissDark / sideDismissPixelCount;
    const roomBackGoldRatio = roomBackGold / roomBackPixelCount;
    const roomBackDarkRatio = roomBackDark / roomBackPixelCount;
    const modeSelectGoldRatio = modeSelectGold / modeSelectPixelCount;
    const modeSelectBlueRatio = modeSelectBlue / modeSelectPixelCount;
    const modeSelectDarkRatio = modeSelectDark / modeSelectPixelCount;
    const gameOverReplayBlueRatio = gameOverReplayBlue / gameOverReplayPixelCount;
    const gameOverReplayGoldRatio = gameOverReplayGold / gameOverReplayPixelCount;
    const gameOverRowsDarkRatio = gameOverRowsDark / gameOverRowsPixelCount;
    const gameOverResultExitBlueRatio = gameOverResultExitBlue / gameOverResultExitPixelCount;
    const gameOverResultWatchDarkRatio = gameOverResultWatchDark / gameOverResultWatchPixelCount;
    const gameOverResultTitleBlueRatio = gameOverResultTitleBlue / gameOverResultTitlePixelCount;
    const gameOverResultTitleDarkRatio = gameOverResultTitleDark / gameOverResultTitlePixelCount;
    const augmentCardPurpleRatio = augmentCardPurple / augmentCardPixelCount;
    const augmentCardDarkRatio = augmentCardDark / augmentCardPixelCount;
    const augmentRerollGoldRatio = augmentRerollGold / augmentRerollPixelCount;
    const augmentRerollBlueRatio = augmentRerollBlue / augmentRerollPixelCount;
    const liveHudGoldSignalRatio = liveHudGoldSignal / liveHudGoldPixelCount;
    const liveHudScoreSignalRatio = liveHudScoreSignal / liveHudScorePixelCount;

    let state: AndroidWindowScreenState = "UNKNOWN";
    let frontendVariant: AndroidFrontendVariant | undefined;
    let lobbyVariant: AndroidLobbyVariant | undefined;
    let confirmModalVariant: AndroidConfirmModalVariant | undefined;
    let primaryActionPoint: SimplePoint | undefined;
    let startQueuePoint: SimplePoint | undefined;
    let selectGameModePoint: SimplePoint | undefined;
    let confirmModalPoint: SimplePoint | undefined;
    let cancelQueuePoint: SimplePoint | undefined;
    let acceptReadyPoint: SimplePoint | undefined;
    let gameOverExitPoint: SimplePoint | undefined;
    let dismissOverlayPoint: SimplePoint | undefined;
    let leaveRoomPoint: SimplePoint | undefined;
    let augmentChoicePoint: SimplePoint | undefined;
    const isStandardAcceptReady =
        acceptModalDarkRatio > 0.50 &&
        acceptButtonBlueRatio > 0.02 &&
        acceptButtonDarkRatio < 0.72 &&
        transitionCenterDarkRatio > 0.55 &&
        modeSelectBlueRatio < 0.04;
    const isLargeCircleAcceptReady =
        acceptModalDarkRatio > 0.33 &&
        acceptButtonBlueRatio > 0.045 &&
        acceptButtonDarkRatio > 0.20 &&
        acceptButtonDarkRatio < 0.60 &&
        transitionCenterDarkRatio > 0.48 &&
        transitionCenterDarkRatio < 0.62 &&
        queueStatusGoldRatio < 0.01 &&
        queueStatusDarkRatio > 0.75 &&
        lobbyStartBlueRatio < 0.03 &&
        modeSelectBlueRatio < 0.04;

    const isGameOverResultModal =
        gameOverResultExitBlueRatio > 0.055 &&
        gameOverResultWatchDarkRatio > 0.30 &&
        gameOverResultWatchDarkRatio < 0.65 &&
        gameOverResultTitleBlueRatio > 0.035 &&
        gameOverResultTitleBlueRatio < 0.12 &&
        (gameOverResultTitleDarkRatio > 0.18 || gameOverResultTitleDarkRatio < 0.15) &&
        modeSelectBlueRatio < 0.04;
    const isDimmedGameOverResultModal =
        gameOverResultExitBlueRatio > 0.06 &&
        gameOverResultExitBlueRatio < 0.09 &&
        gameOverResultWatchDarkRatio > 0.90 &&
        gameOverRowsDarkRatio > 0.70 &&
        gameOverRowsDarkRatio < 0.80 &&
        gameOverResultTitleBlueRatio > 0.045 &&
        gameOverResultTitleBlueRatio < 0.075 &&
        gameOverResultTitleDarkRatio > 0.50 &&
        gameOverResultTitleDarkRatio < 0.60 &&
        acceptModalDarkRatio > 0.70 &&
        acceptModalDarkRatio < 0.78 &&
        transitionCenterDarkRatio > 0.70 &&
        transitionCenterDarkRatio < 0.78 &&
        progressDarkRatio > 0.90 &&
        lobbyStartBlueRatio < 0.01;
    const isLateDimmedGameOverResultModal =
        liveHudGoldSignalRatio < 0.005 &&
        gameOverResultExitBlueRatio > 0.06 &&
        gameOverResultExitBlueRatio < 0.09 &&
        gameOverResultWatchDarkRatio > 0.90 &&
        gameOverRowsDarkRatio > 0.65 &&
        gameOverRowsDarkRatio < 0.72 &&
        gameOverResultTitleBlueRatio > 0.065 &&
        gameOverResultTitleBlueRatio < 0.085 &&
        gameOverResultTitleDarkRatio > 0.42 &&
        gameOverResultTitleDarkRatio < 0.52 &&
        acceptModalDarkRatio > 0.60 &&
        acceptModalDarkRatio < 0.70 &&
        transitionCenterDarkRatio > 0.62 &&
        transitionCenterDarkRatio < 0.70 &&
        progressDarkRatio > 0.80 &&
        progressDarkRatio < 0.86 &&
        lobbyStartBlueRatio < 0.01 &&
        modeSelectBlueRatio < 0.02;
    const isBrightGameOverResultModal =
        liveHudGoldSignalRatio < 0.005 &&
        gameOverResultExitBlueRatio > 0.06 &&
        gameOverResultExitBlueRatio < 0.10 &&
        gameOverResultWatchDarkRatio > 0.35 &&
        gameOverResultWatchDarkRatio < 0.50 &&
        gameOverResultTitleBlueRatio > 0.16 &&
        gameOverResultTitleBlueRatio < 0.24 &&
        gameOverResultTitleDarkRatio < 0.02 &&
        acceptModalDarkRatio > 0.05 &&
        acceptModalDarkRatio < 0.12 &&
        transitionCenterDarkRatio > 0.06 &&
        transitionCenterDarkRatio < 0.12 &&
        progressDarkRatio > 0.60 &&
        lobbyStartBlueRatio < 0.01 &&
        modeSelectBlueRatio < 0.04;
    const isMutedGameOverResultModal =
        gameOverResultExitBlueRatio > 0.06 &&
        gameOverResultExitBlueRatio < 0.09 &&
        gameOverResultWatchDarkRatio > 0.75 &&
        gameOverResultWatchDarkRatio < 0.85 &&
        gameOverRowsDarkRatio > 0.42 &&
        gameOverRowsDarkRatio < 0.52 &&
        gameOverResultTitleBlueRatio > 0.045 &&
        gameOverResultTitleBlueRatio < 0.070 &&
        gameOverResultTitleDarkRatio > 0.18 &&
        gameOverResultTitleDarkRatio < 0.32 &&
        acceptModalDarkRatio > 0.34 &&
        acceptModalDarkRatio < 0.42 &&
        transitionCenterDarkRatio > 0.38 &&
        transitionCenterDarkRatio < 0.46 &&
        progressDarkRatio < 0.06 &&
        lobbyStartBlueRatio < 0.01 &&
        modeSelectBlueRatio < 0.02;
    const isPurpleMutedGameOverResultModal =
        gameOverResultExitBlueRatio > 0.06 &&
        gameOverResultExitBlueRatio < 0.09 &&
        gameOverResultWatchDarkRatio > 0.40 &&
        gameOverResultWatchDarkRatio < 0.52 &&
        gameOverRowsDarkRatio > 0.18 &&
        gameOverRowsDarkRatio < 0.24 &&
        gameOverResultTitleBlueRatio > 0.09 &&
        gameOverResultTitleBlueRatio < 0.13 &&
        gameOverResultTitleDarkRatio > 0.14 &&
        gameOverResultTitleDarkRatio < 0.20 &&
        acceptModalDarkRatio > 0.13 &&
        acceptModalDarkRatio < 0.18 &&
        transitionCenterDarkRatio > 0.14 &&
        transitionCenterDarkRatio < 0.19 &&
        queueCancelDarkRatio > 0.58 &&
        queueCancelDarkRatio < 0.66 &&
        progressDarkRatio > 0.22 &&
        progressDarkRatio < 0.30 &&
        lobbyStartBlueRatio < 0.01 &&
        modeSelectBlueRatio < 0.025;
    const isLiveHudPlacementGameOverResultModal =
        liveHudGoldSignalRatio > 0.30 &&
        liveHudGoldSignalRatio < 0.38 &&
        gameOverReplayBlueRatio > 0.055 &&
        gameOverReplayBlueRatio < 0.075 &&
        gameOverResultExitBlueRatio > 0.065 &&
        gameOverResultExitBlueRatio < 0.085 &&
        gameOverResultWatchDarkRatio > 0.42 &&
        gameOverResultWatchDarkRatio < 0.48 &&
        gameOverRowsDarkRatio > 0.10 &&
        gameOverRowsDarkRatio < 0.14 &&
        gameOverResultTitleBlueRatio > 0.060 &&
        gameOverResultTitleBlueRatio < 0.080 &&
        gameOverResultTitleDarkRatio > 0.14 &&
        gameOverResultTitleDarkRatio < 0.18 &&
        acceptModalDarkRatio > 0.10 &&
        acceptModalDarkRatio < 0.14 &&
        transitionCenterDarkRatio > 0.08 &&
        transitionCenterDarkRatio < 0.12 &&
        augmentCardPurpleRatio > 0.10 &&
        augmentCardPurpleRatio < 0.13 &&
        progressDarkRatio > 0.22 &&
        progressDarkRatio < 0.27 &&
        lobbyStartBlueRatio > 0.015 &&
        lobbyStartBlueRatio < 0.030 &&
        modeSelectBlueRatio < 0.020;
    const isGameOverScoreboard =
        gameOverReplayBlueRatio > 0.06 &&
        gameOverRowsDarkRatio > 0.30 &&
        gameOverRowsDarkRatio < 0.55 &&
        acceptModalDarkRatio < 0.50 &&
        transitionCenterDarkRatio > 0.30 &&
        lobbyStartBlueRatio < 0.70 &&
        progressDarkRatio > 0.50;
    const isDarkGameOverScoreboard =
        gameOverReplayBlueRatio < 0.01 &&
        gameOverRowsDarkRatio > 0.40 &&
        gameOverRowsDarkRatio < 0.50 &&
        gameOverResultExitBlueRatio > 0.05 &&
        gameOverResultExitBlueRatio < 0.10 &&
        gameOverResultWatchDarkRatio > 0.75 &&
        gameOverResultWatchDarkRatio < 0.90 &&
        gameOverResultTitleBlueRatio > 0.035 &&
        gameOverResultTitleBlueRatio < 0.07 &&
        gameOverResultTitleDarkRatio > 0.35 &&
        gameOverResultTitleDarkRatio < 0.48 &&
        acceptModalDarkRatio > 0.45 &&
        acceptModalDarkRatio < 0.60 &&
        progressDarkRatio > 0.035 &&
        progressDarkRatio < 0.08 &&
        lobbyStartBlueRatio < 0.01;
    const standardAugmentChoiceVisible =
        augmentCardPurpleRatio > 0.15 &&
        augmentCardDarkRatio > 0.30 &&
        augmentRerollGoldRatio > 0.04 &&
        augmentRerollBlueRatio < 0.03 &&
        liveHudScoreSignalRatio < 0.055;
    const brightEncounterChoiceVisible =
        acceptModalDarkRatio > 0.75 &&
        transitionCenterDarkRatio > 0.75 &&
        augmentCardDarkRatio > 0.65 &&
        augmentCardPurpleRatio > 0.015 &&
        augmentCardPurpleRatio < 0.06 &&
        augmentRerollGoldRatio > 0.015 &&
        augmentRerollGoldRatio < 0.04 &&
        augmentRerollBlueRatio > 0.012 &&
        augmentRerollBlueRatio < 0.04 &&
        liveHudGoldSignalRatio > 0.015 &&
        liveHudGoldSignalRatio < 0.06 &&
        liveHudScoreSignalRatio > 0.015 &&
        liveHudScoreSignalRatio < 0.05 &&
        lobbyStartBlueRatio < 0.05 &&
        modeSelectBlueRatio > 0.02 &&
        modeSelectBlueRatio < 0.06 &&
        progressDarkRatio > 0.35 &&
        progressDarkRatio < 0.75;
    const darkEncounterChoiceVisible =
        acceptModalDarkRatio > 0.75 &&
        transitionCenterDarkRatio > 0.75 &&
        augmentCardDarkRatio > 0.75 &&
        augmentCardPurpleRatio > 0.015 &&
        augmentCardPurpleRatio < 0.06 &&
        augmentRerollGoldRatio < 0.01 &&
        augmentRerollBlueRatio < 0.012 &&
        liveHudGoldSignalRatio > 0.015 &&
        liveHudGoldSignalRatio < 0.06 &&
        liveHudScoreSignalRatio > 0.015 &&
        liveHudScoreSignalRatio < 0.05 &&
        queueCancelDarkRatio > 0.55 &&
        queueStatusDarkRatio > 0.70 &&
        lobbyStartBlueRatio < 0.05 &&
        modeSelectBlueRatio < 0.03 &&
        progressDarkRatio > 0.55 &&
        progressDarkRatio < 0.85;
    const starGodEncounterChoiceVisible =
        acceptModalDarkRatio > 0.80 &&
        transitionCenterDarkRatio > 0.82 &&
        augmentCardDarkRatio > 0.77 &&
        augmentCardPurpleRatio > 0.007 &&
        augmentCardPurpleRatio < 0.020 &&
        augmentRerollGoldRatio > 0.015 &&
        augmentRerollGoldRatio < 0.040 &&
        augmentRerollBlueRatio > 0.010 &&
        augmentRerollBlueRatio < 0.030 &&
        liveHudGoldSignalRatio > 0.015 &&
        liveHudGoldSignalRatio < 0.030 &&
        liveHudScoreSignalRatio > 0.025 &&
        liveHudScoreSignalRatio < 0.055 &&
        gameOverRowsDarkRatio > 0.80 &&
        queueCancelDarkRatio > 0.55 &&
        queueCancelDarkRatio < 0.78 &&
        progressDarkRatio > 0.55 &&
        progressDarkRatio < 0.70;
    const illustratedStarGodEncounterChoiceVisible =
        acceptModalDarkRatio > 0.80 &&
        transitionCenterDarkRatio > 0.84 &&
        augmentCardDarkRatio > 0.76 &&
        augmentCardPurpleRatio > 0.007 &&
        augmentCardPurpleRatio < 0.020 &&
        augmentRerollGoldRatio > 0.015 &&
        augmentRerollGoldRatio < 0.035 &&
        augmentRerollBlueRatio > 0.012 &&
        augmentRerollBlueRatio < 0.030 &&
        liveHudGoldSignalRatio > 0.035 &&
        liveHudGoldSignalRatio < 0.065 &&
        liveHudScoreSignalRatio > 0.045 &&
        liveHudScoreSignalRatio < 0.070 &&
        gameOverRowsDarkRatio > 0.84 &&
        queueStatusDarkRatio > 0.50 &&
        queueStatusDarkRatio < 0.62 &&
        queueCancelDarkRatio > 0.24 &&
        queueCancelDarkRatio < 0.30 &&
        gameOverResultExitBlueRatio < 0.01 &&
        lobbyStartBlueRatio < 0.04 &&
        progressDarkRatio > 0.62 &&
        progressDarkRatio < 0.70;
    const starGuardianEncounterChoiceVisible =
        acceptModalDarkRatio > 0.80 &&
        acceptModalDarkRatio < 0.86 &&
        transitionCenterDarkRatio > 0.84 &&
        transitionCenterDarkRatio < 0.89 &&
        augmentCardDarkRatio > 0.76 &&
        augmentCardDarkRatio < 0.81 &&
        augmentCardPurpleRatio > 0.020 &&
        augmentCardPurpleRatio < 0.030 &&
        augmentRerollGoldRatio > 0.020 &&
        augmentRerollGoldRatio < 0.035 &&
        augmentRerollBlueRatio < 0.008 &&
        liveHudGoldSignalRatio > 0.020 &&
        liveHudGoldSignalRatio < 0.030 &&
        liveHudScoreSignalRatio > 0.020 &&
        liveHudScoreSignalRatio < 0.035 &&
        gameOverRowsDarkRatio > 0.82 &&
        gameOverRowsDarkRatio < 0.86 &&
        queueStatusDarkRatio > 0.76 &&
        queueStatusDarkRatio < 0.81 &&
        queueCancelDarkRatio > 0.62 &&
        queueCancelDarkRatio < 0.66 &&
        lobbyStartBlueRatio < 0.03 &&
        progressDarkRatio > 0.58 &&
        progressDarkRatio < 0.63;
    const versusStarGodEncounterChoiceVisible =
        acceptModalDarkRatio > 0.80 &&
        acceptModalDarkRatio < 0.86 &&
        transitionCenterDarkRatio > 0.84 &&
        transitionCenterDarkRatio < 0.88 &&
        augmentCardDarkRatio > 0.80 &&
        augmentCardDarkRatio < 0.84 &&
        augmentCardPurpleRatio > 0.012 &&
        augmentCardPurpleRatio < 0.022 &&
        augmentRerollGoldRatio > 0.025 &&
        augmentRerollGoldRatio < 0.040 &&
        augmentRerollBlueRatio < 0.008 &&
        liveHudGoldSignalRatio > 0.015 &&
        liveHudGoldSignalRatio < 0.025 &&
        liveHudScoreSignalRatio > 0.008 &&
        liveHudScoreSignalRatio < 0.015 &&
        gameOverRowsDarkRatio > 0.82 &&
        gameOverRowsDarkRatio < 0.86 &&
        gameOverResultTitleDarkRatio > 0.80 &&
        gameOverResultTitleDarkRatio < 0.86 &&
        queueStatusDarkRatio > 0.90 &&
        queueCancelDarkRatio > 0.78 &&
        queueCancelDarkRatio < 0.84 &&
        lobbyStartBlueRatio < 0.01 &&
        progressDarkRatio > 0.68 &&
        progressDarkRatio < 0.75;
    const darkVersusStarGodEncounterChoiceVisible =
        acceptModalDarkRatio > 0.82 &&
        acceptModalDarkRatio < 0.86 &&
        transitionCenterDarkRatio > 0.85 &&
        transitionCenterDarkRatio < 0.89 &&
        augmentCardDarkRatio > 0.78 &&
        augmentCardDarkRatio < 0.82 &&
        augmentCardPurpleRatio > 0.005 &&
        augmentCardPurpleRatio < 0.012 &&
        augmentRerollGoldRatio > 0.008 &&
        augmentRerollGoldRatio < 0.014 &&
        augmentRerollBlueRatio < 0.006 &&
        liveHudGoldSignalRatio > 0.015 &&
        liveHudGoldSignalRatio < 0.025 &&
        liveHudScoreSignalRatio > 0.050 &&
        liveHudScoreSignalRatio < 0.065 &&
        gameOverRowsDarkRatio > 0.87 &&
        gameOverRowsDarkRatio < 0.92 &&
        gameOverResultTitleDarkRatio > 0.80 &&
        gameOverResultTitleDarkRatio < 0.87 &&
        queueStatusDarkRatio > 0.85 &&
        queueStatusDarkRatio < 0.90 &&
        queueCancelDarkRatio > 0.55 &&
        queueCancelDarkRatio < 0.62 &&
        lobbyStartBlueRatio < 0.005 &&
        modeSelectBlueRatio < 0.010 &&
        progressDarkRatio > 0.88 &&
        progressDarkRatio < 0.93;
    const darkStarGodItemEncounterChoiceVisible =
        acceptModalDarkRatio > 0.84 &&
        acceptModalDarkRatio < 0.86 &&
        transitionCenterDarkRatio > 0.86 &&
        transitionCenterDarkRatio < 0.89 &&
        augmentCardDarkRatio > 0.82 &&
        augmentCardDarkRatio < 0.85 &&
        augmentCardPurpleRatio > 0.019 &&
        augmentCardPurpleRatio < 0.024 &&
        augmentRerollGoldRatio > 0.014 &&
        augmentRerollGoldRatio < 0.018 &&
        augmentRerollBlueRatio < 0.006 &&
        liveHudGoldSignalRatio > 0.018 &&
        liveHudGoldSignalRatio < 0.022 &&
        liveHudScoreSignalRatio > 0.09 &&
        liveHudScoreSignalRatio < 0.10 &&
        gameOverRowsDarkRatio > 0.86 &&
        gameOverRowsDarkRatio < 0.89 &&
        queueStatusDarkRatio > 0.72 &&
        queueStatusDarkRatio < 0.75 &&
        queueCancelDarkRatio > 0.45 &&
        queueCancelDarkRatio < 0.48 &&
        lobbyStartBlueRatio < 0.002 &&
        modeSelectBlueRatio < 0.006 &&
        progressDarkRatio > 0.71 &&
        progressDarkRatio < 0.74;
    const brightStarGodItemEncounterChoiceVisible =
        acceptModalDarkRatio > 0.80 &&
        acceptModalDarkRatio < 0.85 &&
        transitionCenterDarkRatio > 0.84 &&
        transitionCenterDarkRatio < 0.88 &&
        augmentCardDarkRatio > 0.75 &&
        augmentCardDarkRatio < 0.80 &&
        augmentCardPurpleRatio > 0.012 &&
        augmentCardPurpleRatio < 0.019 &&
        augmentRerollGoldRatio > 0.030 &&
        augmentRerollGoldRatio < 0.040 &&
        augmentRerollBlueRatio > 0.015 &&
        augmentRerollBlueRatio < 0.022 &&
        liveHudGoldSignalRatio > 0.018 &&
        liveHudGoldSignalRatio < 0.023 &&
        liveHudScoreSignalRatio > 0.090 &&
        liveHudScoreSignalRatio < 0.100 &&
        gameOverRowsDarkRatio > 0.80 &&
        gameOverRowsDarkRatio < 0.85 &&
        queueStatusDarkRatio > 0.70 &&
        queueStatusDarkRatio < 0.76 &&
        queueCancelDarkRatio > 0.43 &&
        queueCancelDarkRatio < 0.48 &&
        lobbyStartBlueRatio < 0.005 &&
        modeSelectBlueRatio > 0.015 &&
        modeSelectBlueRatio < 0.025 &&
        progressDarkRatio > 0.52 &&
        progressDarkRatio < 0.57;
    const mutedStarGodItemEncounterChoiceVisible =
        acceptModalDarkRatio > 0.82 &&
        acceptModalDarkRatio < 0.86 &&
        transitionCenterDarkRatio > 0.85 &&
        transitionCenterDarkRatio < 0.89 &&
        augmentCardDarkRatio > 0.81 &&
        augmentCardDarkRatio < 0.84 &&
        augmentCardPurpleRatio > 0.012 &&
        augmentCardPurpleRatio < 0.017 &&
        augmentRerollGoldRatio > 0.004 &&
        augmentRerollGoldRatio < 0.009 &&
        augmentRerollBlueRatio > 0.003 &&
        augmentRerollBlueRatio < 0.010 &&
        liveHudGoldSignalRatio > 0.018 &&
        liveHudGoldSignalRatio < 0.023 &&
        liveHudScoreSignalRatio > 0.055 &&
        liveHudScoreSignalRatio < 0.065 &&
        gameOverRowsDarkRatio > 0.86 &&
        gameOverRowsDarkRatio < 0.89 &&
        queueStatusDarkRatio > 0.84 &&
        queueStatusDarkRatio < 0.88 &&
        queueCancelDarkRatio > 0.55 &&
        queueCancelDarkRatio < 0.60 &&
        lobbyStartBlueRatio < 0.003 &&
        modeSelectBlueRatio > 0.006 &&
        modeSelectBlueRatio < 0.011 &&
        progressDarkRatio > 0.82 &&
        progressDarkRatio < 0.86;
    const balancedStarGodItemEncounterChoiceVisible =
        acceptModalDarkRatio > 0.81 &&
        acceptModalDarkRatio < 0.85 &&
        transitionCenterDarkRatio > 0.85 &&
        transitionCenterDarkRatio < 0.87 &&
        augmentCardDarkRatio > 0.83 &&
        augmentCardDarkRatio < 0.84 &&
        augmentCardPurpleRatio > 0.017 &&
        augmentCardPurpleRatio < 0.019 &&
        augmentRerollGoldRatio > 0.012 &&
        augmentRerollGoldRatio < 0.014 &&
        augmentRerollBlueRatio < 0.006 &&
        liveHudGoldSignalRatio > 0.018 &&
        liveHudGoldSignalRatio < 0.021 &&
        liveHudScoreSignalRatio > 0.090 &&
        liveHudScoreSignalRatio < 0.100 &&
        gameOverRowsDarkRatio > 0.86 &&
        gameOverRowsDarkRatio < 0.88 &&
        gameOverResultWatchDarkRatio > 0.90 &&
        gameOverResultTitleDarkRatio > 0.81 &&
        gameOverResultTitleDarkRatio < 0.86 &&
        queueStatusDarkRatio > 0.72 &&
        queueStatusDarkRatio < 0.74 &&
        queueCancelDarkRatio > 0.45 &&
        queueCancelDarkRatio < 0.48 &&
        lobbyStartBlueRatio < 0.003 &&
        modeSelectBlueRatio < 0.008 &&
        progressDarkRatio > 0.77 &&
        progressDarkRatio < 0.80;
    const dimStarGodItemEncounterChoiceVisible =
        acceptModalDarkRatio > 0.82 &&
        acceptModalDarkRatio < 0.84 &&
        transitionCenterDarkRatio > 0.85 &&
        transitionCenterDarkRatio < 0.87 &&
        augmentCardDarkRatio > 0.82 &&
        augmentCardDarkRatio < 0.83 &&
        augmentCardPurpleRatio > 0.020 &&
        augmentCardPurpleRatio < 0.022 &&
        augmentRerollGoldRatio > 0.017 &&
        augmentRerollGoldRatio < 0.020 &&
        augmentRerollBlueRatio < 0.006 &&
        liveHudGoldSignalRatio > 0.018 &&
        liveHudGoldSignalRatio < 0.021 &&
        liveHudScoreSignalRatio > 0.090 &&
        liveHudScoreSignalRatio < 0.100 &&
        gameOverRowsDarkRatio > 0.86 &&
        gameOverRowsDarkRatio < 0.88 &&
        gameOverResultWatchDarkRatio > 0.90 &&
        gameOverResultTitleDarkRatio > 0.83 &&
        gameOverResultTitleDarkRatio < 0.85 &&
        queueStatusDarkRatio > 0.72 &&
        queueStatusDarkRatio < 0.74 &&
        queueCancelDarkRatio > 0.45 &&
        queueCancelDarkRatio < 0.47 &&
        lobbyStartBlueRatio < 0.003 &&
        modeSelectBlueRatio < 0.006 &&
        progressDarkRatio > 0.71 &&
        progressDarkRatio < 0.73;
    const redGreenStarGodItemEncounterChoiceVisible =
        acceptModalDarkRatio > 0.86 &&
        acceptModalDarkRatio < 0.87 &&
        transitionCenterDarkRatio > 0.88 &&
        transitionCenterDarkRatio < 0.90 &&
        augmentCardDarkRatio > 0.80 &&
        augmentCardDarkRatio < 0.82 &&
        augmentCardPurpleRatio > 0.006 &&
        augmentCardPurpleRatio < 0.009 &&
        augmentRerollGoldRatio > 0.009 &&
        augmentRerollGoldRatio < 0.012 &&
        augmentRerollBlueRatio < 0.007 &&
        liveHudGoldSignalRatio > 0.018 &&
        liveHudGoldSignalRatio < 0.021 &&
        liveHudScoreSignalRatio > 0.055 &&
        liveHudScoreSignalRatio < 0.060 &&
        gameOverRowsDarkRatio > 0.89 &&
        gameOverRowsDarkRatio < 0.91 &&
        gameOverResultWatchDarkRatio > 0.90 &&
        gameOverResultTitleDarkRatio > 0.86 &&
        gameOverResultTitleDarkRatio < 0.87 &&
        queueStatusDarkRatio > 0.85 &&
        queueStatusDarkRatio < 0.87 &&
        queueCancelDarkRatio > 0.57 &&
        queueCancelDarkRatio < 0.59 &&
        lobbyStartBlueRatio < 0.003 &&
        modeSelectBlueRatio < 0.006 &&
        progressDarkRatio > 0.88 &&
        progressDarkRatio < 0.89;
    const lowContrastStarGodEncounterChoiceVisible =
        acceptModalDarkRatio > 0.80 &&
        acceptModalDarkRatio < 0.84 &&
        transitionCenterDarkRatio > 0.84 &&
        transitionCenterDarkRatio < 0.87 &&
        augmentCardDarkRatio > 0.77 &&
        augmentCardDarkRatio < 0.80 &&
        augmentCardPurpleRatio > 0.017 &&
        augmentCardPurpleRatio < 0.022 &&
        augmentRerollGoldRatio > 0.015 &&
        augmentRerollGoldRatio < 0.023 &&
        augmentRerollBlueRatio > 0.005 &&
        augmentRerollBlueRatio < 0.010 &&
        liveHudGoldSignalRatio > 0.018 &&
        liveHudGoldSignalRatio < 0.021 &&
        liveHudScoreSignalRatio > 0.090 &&
        liveHudScoreSignalRatio < 0.100 &&
        gameOverRowsDarkRatio > 0.84 &&
        gameOverRowsDarkRatio < 0.87 &&
        queueStatusDarkRatio > 0.70 &&
        queueStatusDarkRatio < 0.75 &&
        queueCancelDarkRatio > 0.45 &&
        queueCancelDarkRatio < 0.49 &&
        lobbyStartBlueRatio < 0.002 &&
        modeSelectBlueRatio > 0.010 &&
        modeSelectBlueRatio < 0.015 &&
        progressDarkRatio > 0.74 &&
        progressDarkRatio < 0.78;
    const lowScoreStarGodEncounterChoiceVisible =
        acceptModalDarkRatio > 0.81 &&
        acceptModalDarkRatio < 0.84 &&
        transitionCenterDarkRatio > 0.84 &&
        transitionCenterDarkRatio < 0.88 &&
        augmentCardDarkRatio > 0.80 &&
        augmentCardDarkRatio < 0.83 &&
        augmentCardPurpleRatio > 0.014 &&
        augmentCardPurpleRatio < 0.017 &&
        augmentRerollGoldRatio > 0.030 &&
        augmentRerollGoldRatio < 0.038 &&
        augmentRerollBlueRatio > 0.003 &&
        augmentRerollBlueRatio < 0.006 &&
        liveHudGoldSignalRatio > 0.018 &&
        liveHudGoldSignalRatio < 0.024 &&
        liveHudScoreSignalRatio > 0.028 &&
        liveHudScoreSignalRatio < 0.036 &&
        gameOverRowsDarkRatio > 0.82 &&
        gameOverRowsDarkRatio < 0.86 &&
        gameOverResultWatchDarkRatio > 0.90 &&
        gameOverResultTitleDarkRatio > 0.83 &&
        gameOverResultTitleDarkRatio < 0.86 &&
        queueCancelDarkRatio > 0.70 &&
        queueCancelDarkRatio < 0.74 &&
        lobbyStartBlueRatio < 0.003 &&
        modeSelectBlueRatio < 0.006 &&
        progressDarkRatio > 0.64 &&
        progressDarkRatio < 0.68;
    const pinkBlueStarGodItemEncounterChoiceVisible =
        acceptModalDarkRatio > 0.84 &&
        acceptModalDarkRatio < 0.87 &&
        transitionCenterDarkRatio > 0.87 &&
        transitionCenterDarkRatio < 0.90 &&
        augmentCardDarkRatio > 0.82 &&
        augmentCardDarkRatio < 0.85 &&
        augmentCardPurpleRatio > 0.010 &&
        augmentCardPurpleRatio < 0.016 &&
        augmentRerollGoldRatio > 0.025 &&
        augmentRerollGoldRatio < 0.035 &&
        augmentRerollBlueRatio < 0.008 &&
        liveHudGoldSignalRatio > 0.018 &&
        liveHudGoldSignalRatio < 0.022 &&
        liveHudScoreSignalRatio > 0.010 &&
        liveHudScoreSignalRatio < 0.015 &&
        gameOverRowsDarkRatio > 0.84 &&
        gameOverRowsDarkRatio < 0.87 &&
        gameOverResultWatchDarkRatio > 0.90 &&
        gameOverResultTitleDarkRatio > 0.84 &&
        gameOverResultTitleDarkRatio < 0.87 &&
        queueStatusDarkRatio > 0.91 &&
        queueStatusDarkRatio < 0.94 &&
        queueCancelDarkRatio > 0.80 &&
        queueCancelDarkRatio < 0.84 &&
        lobbyStartBlueRatio < 0.003 &&
        modeSelectBlueRatio < 0.011 &&
        progressDarkRatio > 0.69 &&
        progressDarkRatio < 0.72;
    const lowScoreStarGodItemChoiceVisible =
        acceptModalDarkRatio > 0.83 &&
        acceptModalDarkRatio < 0.86 &&
        transitionCenterDarkRatio > 0.86 &&
        transitionCenterDarkRatio < 0.88 &&
        augmentCardDarkRatio > 0.82 &&
        augmentCardDarkRatio < 0.84 &&
        augmentCardPurpleRatio > 0.014 &&
        augmentCardPurpleRatio < 0.020 &&
        augmentRerollGoldRatio > 0.004 &&
        augmentRerollGoldRatio < 0.007 &&
        augmentRerollBlueRatio > 0.008 &&
        augmentRerollBlueRatio < 0.012 &&
        liveHudGoldSignalRatio > 0.018 &&
        liveHudGoldSignalRatio < 0.021 &&
        liveHudScoreSignalRatio > 0.010 &&
        liveHudScoreSignalRatio < 0.014 &&
        gameOverRowsDarkRatio > 0.85 &&
        gameOverRowsDarkRatio < 0.88 &&
        gameOverResultWatchDarkRatio > 0.89 &&
        gameOverResultWatchDarkRatio < 0.91 &&
        gameOverResultTitleDarkRatio > 0.86 &&
        gameOverResultTitleDarkRatio < 0.89 &&
        queueStatusDarkRatio > 0.92 &&
        queueStatusDarkRatio < 0.95 &&
        queueCancelDarkRatio > 0.80 &&
        queueCancelDarkRatio < 0.85 &&
        lobbyStartBlueRatio < 0.002 &&
        modeSelectBlueRatio > 0.007 &&
        modeSelectBlueRatio < 0.011 &&
        progressDarkRatio > 0.89 &&
        progressDarkRatio < 0.92;
    const shopStarGodEncounterChoiceVisible =
        acceptModalDarkRatio > 0.82 &&
        acceptModalDarkRatio < 0.86 &&
        transitionCenterDarkRatio > 0.85 &&
        transitionCenterDarkRatio < 0.88 &&
        augmentCardDarkRatio > 0.77 &&
        augmentCardDarkRatio < 0.81 &&
        augmentCardPurpleRatio > 0.008 &&
        augmentCardPurpleRatio < 0.013 &&
        augmentRerollGoldRatio > 0.035 &&
        augmentRerollGoldRatio < 0.050 &&
        augmentRerollBlueRatio < 0.010 &&
        liveHudGoldSignalRatio > 0.018 &&
        liveHudGoldSignalRatio < 0.024 &&
        liveHudScoreSignalRatio > 0.045 &&
        liveHudScoreSignalRatio < 0.055 &&
        gameOverRowsDarkRatio > 0.84 &&
        gameOverRowsDarkRatio < 0.88 &&
        gameOverResultWatchDarkRatio > 0.89 &&
        gameOverResultTitleDarkRatio > 0.85 &&
        gameOverResultTitleDarkRatio < 0.89 &&
        queueStatusDarkRatio > 0.74 &&
        queueStatusDarkRatio < 0.78 &&
        queueCancelDarkRatio > 0.54 &&
        queueCancelDarkRatio < 0.58 &&
        lobbyStartBlueRatio > 0.010 &&
        lobbyStartBlueRatio < 0.017 &&
        modeSelectBlueRatio > 0.020 &&
        modeSelectBlueRatio < 0.028 &&
        progressDarkRatio > 0.59 &&
        progressDarkRatio < 0.62;
    const duelStarGodEncounterChoiceVisible =
        acceptModalDarkRatio > 0.82 &&
        acceptModalDarkRatio < 0.84 &&
        transitionCenterDarkRatio > 0.85 &&
        transitionCenterDarkRatio < 0.88 &&
        augmentCardDarkRatio > 0.76 &&
        augmentCardDarkRatio < 0.79 &&
        augmentCardPurpleRatio > 0.008 &&
        augmentCardPurpleRatio < 0.015 &&
        augmentRerollGoldRatio > 0.045 &&
        augmentRerollGoldRatio < 0.060 &&
        augmentRerollBlueRatio > 0.010 &&
        augmentRerollBlueRatio < 0.016 &&
        liveHudGoldSignalRatio > 0.040 &&
        liveHudGoldSignalRatio < 0.055 &&
        liveHudScoreSignalRatio > 0.050 &&
        liveHudScoreSignalRatio < 0.065 &&
        gameOverRowsDarkRatio > 0.83 &&
        gameOverRowsDarkRatio < 0.86 &&
        gameOverResultWatchDarkRatio > 0.89 &&
        gameOverResultTitleDarkRatio > 0.80 &&
        gameOverResultTitleDarkRatio < 0.84 &&
        queueStatusGoldRatio > 0.050 &&
        queueStatusGoldRatio < 0.065 &&
        queueStatusDarkRatio > 0.53 &&
        queueStatusDarkRatio < 0.58 &&
        queueCancelDarkRatio > 0.25 &&
        queueCancelDarkRatio < 0.30 &&
        lobbyStartBlueRatio > 0.018 &&
        lobbyStartBlueRatio < 0.024 &&
        modeSelectBlueRatio > 0.016 &&
        modeSelectBlueRatio < 0.022 &&
        progressDarkRatio > 0.46 &&
        progressDarkRatio < 0.51;
    const lowPurpleDuelStarGodEncounterChoiceVisible =
        acceptModalDarkRatio > 0.84 &&
        acceptModalDarkRatio < 0.88 &&
        transitionCenterDarkRatio > 0.86 &&
        transitionCenterDarkRatio < 0.90 &&
        augmentCardDarkRatio > 0.77 &&
        augmentCardDarkRatio < 0.81 &&
        augmentCardPurpleRatio > 0.002 &&
        augmentCardPurpleRatio < 0.007 &&
        augmentRerollGoldRatio > 0.020 &&
        augmentRerollGoldRatio < 0.032 &&
        augmentRerollBlueRatio > 0.008 &&
        augmentRerollBlueRatio < 0.015 &&
        liveHudGoldSignalRatio > 0.035 &&
        liveHudGoldSignalRatio < 0.050 &&
        liveHudScoreSignalRatio > 0.052 &&
        liveHudScoreSignalRatio < 0.064 &&
        gameOverRowsDarkRatio > 0.87 &&
        gameOverRowsDarkRatio < 0.91 &&
        gameOverResultExitBlueRatio < 0.01 &&
        gameOverResultWatchDarkRatio > 0.88 &&
        gameOverResultTitleDarkRatio > 0.82 &&
        gameOverResultTitleDarkRatio < 0.87 &&
        queueStatusGoldRatio > 0.050 &&
        queueStatusGoldRatio < 0.065 &&
        queueStatusDarkRatio > 0.53 &&
        queueStatusDarkRatio < 0.58 &&
        queueCancelDarkRatio > 0.25 &&
        queueCancelDarkRatio < 0.30 &&
        lobbyStartBlueRatio > 0.015 &&
        lobbyStartBlueRatio < 0.025 &&
        modeSelectBlueRatio > 0.010 &&
        modeSelectBlueRatio < 0.018 &&
        progressDarkRatio > 0.66 &&
        progressDarkRatio < 0.70;
    const singleEncounterChoiceVisible =
        acceptModalDarkRatio > 0.75 &&
        transitionCenterDarkRatio > 0.75 &&
        augmentCardDarkRatio > 0.75 &&
        augmentCardPurpleRatio > 0.03 &&
        augmentCardPurpleRatio < 0.06 &&
        augmentRerollGoldRatio < 0.01 &&
        augmentRerollBlueRatio < 0.012 &&
        liveHudGoldSignalRatio > 0.015 &&
        liveHudGoldSignalRatio < 0.04 &&
        liveHudScoreSignalRatio > 0.015 &&
        liveHudScoreSignalRatio < 0.04 &&
        queueCancelDarkRatio > 0.55 &&
        queueCancelDarkRatio < 0.75 &&
        queueStatusDarkRatio > 0.60 &&
        queueStatusDarkRatio < 0.75 &&
        gameOverRowsDarkRatio > 0.80 &&
        lobbyStartBlueRatio < 0.05 &&
        modeSelectBlueRatio < 0.03 &&
        progressDarkRatio > 0.75 &&
        progressDarkRatio < 0.90;
    const encounterChoiceVisible =
        brightEncounterChoiceVisible ||
        darkEncounterChoiceVisible ||
        starGodEncounterChoiceVisible ||
        illustratedStarGodEncounterChoiceVisible ||
        starGuardianEncounterChoiceVisible ||
        versusStarGodEncounterChoiceVisible ||
        darkVersusStarGodEncounterChoiceVisible ||
        darkStarGodItemEncounterChoiceVisible ||
        brightStarGodItemEncounterChoiceVisible ||
        mutedStarGodItemEncounterChoiceVisible ||
        balancedStarGodItemEncounterChoiceVisible ||
        dimStarGodItemEncounterChoiceVisible ||
        redGreenStarGodItemEncounterChoiceVisible ||
        lowContrastStarGodEncounterChoiceVisible ||
        lowScoreStarGodEncounterChoiceVisible ||
        pinkBlueStarGodItemEncounterChoiceVisible ||
        lowScoreStarGodItemChoiceVisible ||
        shopStarGodEncounterChoiceVisible ||
        duelStarGodEncounterChoiceVisible ||
        lowPurpleDuelStarGodEncounterChoiceVisible ||
        singleEncounterChoiceVisible;
    const augmentChoiceVisible = standardAugmentChoiceVisible || encounterChoiceVisible;
    if (encounterChoiceVisible) {
        augmentChoicePoint = starGodEncounterChoiceVisible ||
            illustratedStarGodEncounterChoiceVisible ||
            starGuardianEncounterChoiceVisible ||
            versusStarGodEncounterChoiceVisible ||
            darkVersusStarGodEncounterChoiceVisible ||
            darkStarGodItemEncounterChoiceVisible ||
            brightStarGodItemEncounterChoiceVisible ||
            mutedStarGodItemEncounterChoiceVisible ||
            balancedStarGodItemEncounterChoiceVisible ||
            dimStarGodItemEncounterChoiceVisible ||
            redGreenStarGodItemEncounterChoiceVisible ||
            lowContrastStarGodEncounterChoiceVisible ||
            lowScoreStarGodEncounterChoiceVisible ||
            lowScoreStarGodItemChoiceVisible ||
            duelStarGodEncounterChoiceVisible ||
            lowPurpleDuelStarGodEncounterChoiceVisible ||
            singleEncounterChoiceVisible
            ? ENCOUNTER_CHOICE_RIGHT_POINT
            : ENCOUNTER_CHOICE_LEFT_POINT;
    }

    const hasStrongLiveHudSignal =
        (liveHudGoldSignalRatio > 0.30 && progressDarkRatio < 0.10) ||
        liveHudScoreSignalRatio > 0.10;
    const hasBootExcludingLiveHudSignal =
        hasStrongLiveHudSignal ||
        (
            liveHudGoldSignalRatio > 0.20 &&
            liveHudScoreSignalRatio > 0.045 &&
            progressDarkRatio < 0.04 &&
            roomBackDarkRatio > 0.45
        );
    const isS16LoadingRosterTransition =
        brightWhiteRatio > 0.045 &&
        brightWhiteRatio < 0.080 &&
        liveHudGoldSignalRatio < 0.005 &&
        liveHudScoreSignalRatio > 0.010 &&
        liveHudScoreSignalRatio < 0.020 &&
        loginSecondaryGoldRatio > 0.18 &&
        loginSecondaryGoldRatio < 0.24 &&
        queueStatusGoldRatio > 0.060 &&
        queueStatusGoldRatio < 0.10 &&
        queueStatusDarkRatio > 0.48 &&
        queueStatusDarkRatio < 0.56 &&
        transitionCenterGoldRatio > 0.08 &&
        transitionCenterGoldRatio < 0.11 &&
        transitionCenterDarkRatio > 0.22 &&
        transitionCenterDarkRatio < 0.28 &&
        augmentCardPurpleRatio > 0.28 &&
        augmentCardPurpleRatio < 0.33 &&
        gameOverResultTitleDarkRatio > 0.55 &&
        progressDarkRatio > 0.65 &&
        progressDarkRatio < 0.80;
    const hasLiveContentHudSignal =
        lowPurpleDuelStarGodEncounterChoiceVisible ||
        (
            liveHudGoldSignalRatio > 0.18 &&
            liveHudScoreSignalRatio > 0.05 &&
            progressDarkRatio < 0.20
        ) ||
        liveHudScoreSignalRatio > 0.10 ||
        (
            liveHudGoldSignalRatio > 0.10 &&
            liveHudGoldSignalRatio < 0.13 &&
            liveHudScoreSignalRatio > 0.038 &&
            liveHudScoreSignalRatio < 0.055 &&
            acceptModalDarkRatio < 0.04 &&
            transitionCenterGoldRatio > 0.10 &&
            transitionCenterGoldRatio < 0.14 &&
            transitionCenterDarkRatio < 0.08 &&
            queueCancelDarkRatio > 0.18 &&
            queueCancelDarkRatio < 0.22 &&
            roomBackGoldRatio > 0.20 &&
            roomBackGoldRatio < 0.31 &&
            modeSelectGoldRatio > 0.09 &&
            modeSelectGoldRatio < 0.16 &&
            gameOverRowsDarkRatio < 0.09 &&
            progressDarkRatio < 0.22
        ) ||
        (
            liveHudGoldSignalRatio > 0.018 &&
            liveHudGoldSignalRatio < 0.023 &&
            liveHudScoreSignalRatio > 0.030 &&
            liveHudScoreSignalRatio < 0.050 &&
            lobbyStartBlueRatio > 0.015 &&
            lobbyStartBlueRatio < 0.025 &&
            queueStatusGoldRatio > 0.020 &&
            queueStatusGoldRatio < 0.030 &&
            transitionCenterGoldRatio > 0.10 &&
            transitionCenterGoldRatio < 0.13 &&
            transitionCenterDarkRatio > 0.07 &&
            transitionCenterDarkRatio < 0.09 &&
            sideMenuDarkRatio > 0.15 &&
            sideMenuDarkRatio < 0.18 &&
            roomBackDarkRatio > 0.20 &&
            roomBackDarkRatio < 0.24 &&
            gameOverReplayBlueRatio > 0.07 &&
            gameOverReplayBlueRatio < 0.09 &&
            progressDarkRatio > 0.08 &&
            progressDarkRatio < 0.10
        ) ||
        (
            liveHudGoldSignalRatio > 0.015 &&
            liveHudGoldSignalRatio < 0.025 &&
            liveHudScoreSignalRatio > 0.055 &&
            liveHudScoreSignalRatio < 0.065 &&
            lobbyStartBlueRatio > 0.025 &&
            lobbyStartBlueRatio < 0.045 &&
            lobbyStartDarkRatio > 0.70 &&
            lobbyStartDarkRatio < 0.78 &&
            queueStatusGoldRatio < 0.010 &&
            queueStatusDarkRatio > 0.49 &&
            queueStatusDarkRatio < 0.55 &&
            queueCancelDarkRatio > 0.68 &&
            queueCancelDarkRatio < 0.75 &&
            acceptModalDarkRatio > 0.16 &&
            acceptModalDarkRatio < 0.22 &&
            transitionCenterDarkRatio > 0.24 &&
            transitionCenterDarkRatio < 0.29 &&
            augmentCardPurpleRatio > 0.018 &&
            augmentCardPurpleRatio < 0.030 &&
            augmentCardDarkRatio > 0.28 &&
            augmentCardDarkRatio < 0.33 &&
            progressDarkRatio > 0.88 &&
            progressDarkRatio < 0.93
        ) ||
        (
            liveHudGoldSignalRatio > 0.018 &&
            liveHudGoldSignalRatio < 0.021 &&
            liveHudScoreSignalRatio > 0.070 &&
            liveHudScoreSignalRatio < 0.080 &&
            lobbyStartBlueRatio < 0.005 &&
            lobbyStartDarkRatio > 0.28 &&
            lobbyStartDarkRatio < 0.31 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio < 0.02 &&
            queueCancelDarkRatio > 0.31 &&
            queueCancelDarkRatio < 0.34 &&
            acceptModalDarkRatio > 0.05 &&
            acceptModalDarkRatio < 0.07 &&
            acceptButtonBlueRatio > 0.075 &&
            acceptButtonBlueRatio < 0.085 &&
            transitionCenterGoldRatio > 0.06 &&
            transitionCenterGoldRatio < 0.08 &&
            transitionCenterDarkRatio < 0.06 &&
            roomBackDarkRatio > 0.79 &&
            roomBackDarkRatio < 0.82 &&
            sideMenuGoldRatio > 0.08 &&
            sideMenuGoldRatio < 0.10 &&
            augmentCardPurpleRatio > 0.18 &&
            augmentCardPurpleRatio < 0.21 &&
            progressDarkRatio > 0.010 &&
            progressDarkRatio < 0.020
        ) ||
        (
            liveHudGoldSignalRatio > 0.018 &&
            liveHudGoldSignalRatio < 0.021 &&
            liveHudScoreSignalRatio > 0.014 &&
            liveHudScoreSignalRatio < 0.020 &&
            lobbyStartBlueRatio < 0.005 &&
            lobbyStartDarkRatio > 0.20 &&
            lobbyStartDarkRatio < 0.24 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio < 0.005 &&
            queueCancelDarkRatio > 0.20 &&
            queueCancelDarkRatio < 0.23 &&
            acceptModalDarkRatio > 0.030 &&
            acceptModalDarkRatio < 0.045 &&
            acceptButtonBlueRatio > 0.075 &&
            acceptButtonBlueRatio < 0.090 &&
            transitionCenterDarkRatio > 0.035 &&
            transitionCenterDarkRatio < 0.050 &&
            gameOverRowsDarkRatio > 0.035 &&
            gameOverRowsDarkRatio < 0.050 &&
            gameOverResultExitBlueRatio > 0.015 &&
            gameOverResultExitBlueRatio < 0.025 &&
            augmentCardDarkRatio > 0.09 &&
            augmentCardDarkRatio < 0.11 &&
            progressDarkRatio > 0.015 &&
            progressDarkRatio < 0.025 &&
            modeSelectBlueRatio > 0.006 &&
            modeSelectBlueRatio < 0.011
        ) ||
        (
            liveHudGoldSignalRatio > 0.040 &&
            liveHudGoldSignalRatio < 0.055 &&
            liveHudScoreSignalRatio > 0.090 &&
            liveHudScoreSignalRatio < 0.100 &&
            lobbyStartBlueRatio > 0.045 &&
            lobbyStartBlueRatio < 0.075 &&
            lobbyStartDarkRatio > 0.17 &&
            lobbyStartDarkRatio < 0.22 &&
            queueStatusGoldRatio > 0.015 &&
            queueStatusGoldRatio < 0.035 &&
            queueStatusDarkRatio > 0.035 &&
            queueStatusDarkRatio < 0.065 &&
            queueCancelDarkRatio > 0.17 &&
            queueCancelDarkRatio < 0.23 &&
            acceptModalDarkRatio < 0.05 &&
            transitionCenterDarkRatio < 0.06 &&
            augmentCardPurpleRatio > 0.008 &&
            augmentCardPurpleRatio < 0.015 &&
            augmentCardDarkRatio > 0.030 &&
            augmentCardDarkRatio < 0.055 &&
            progressDarkRatio < 0.025
        ) ||
        (
            liveHudGoldSignalRatio > 0.040 &&
            liveHudGoldSignalRatio < 0.055 &&
            liveHudScoreSignalRatio > 0.065 &&
            liveHudScoreSignalRatio < 0.075 &&
            lobbyStartBlueRatio < 0.005 &&
            lobbyStartDarkRatio > 0.16 &&
            lobbyStartDarkRatio < 0.19 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio < 0.02 &&
            queueCancelDarkRatio > 0.20 &&
            queueCancelDarkRatio < 0.23 &&
            acceptModalDarkRatio > 0.05 &&
            acceptModalDarkRatio < 0.08 &&
            transitionCenterGoldRatio > 0.08 &&
            transitionCenterGoldRatio < 0.10 &&
            transitionCenterDarkRatio > 0.05 &&
            transitionCenterDarkRatio < 0.07 &&
            roomBackDarkRatio > 0.82 &&
            roomBackDarkRatio < 0.88 &&
            gameOverRowsDarkRatio > 0.07 &&
            gameOverRowsDarkRatio < 0.10 &&
            progressDarkRatio > 0.10 &&
            progressDarkRatio < 0.13
        ) ||
        (
            liveHudGoldSignalRatio > 0.20 &&
            liveHudGoldSignalRatio < 0.22 &&
            liveHudScoreSignalRatio > 0.030 &&
            liveHudScoreSignalRatio < 0.040 &&
            lobbyStartBlueRatio > 0.20 &&
            lobbyStartBlueRatio < 0.24 &&
            lobbyStartDarkRatio < 0.04 &&
            queueStatusGoldRatio > 0.07 &&
            queueStatusGoldRatio < 0.09 &&
            queueStatusDarkRatio < 0.005 &&
            queueCancelDarkRatio > 0.04 &&
            queueCancelDarkRatio < 0.055 &&
            acceptModalDarkRatio > 0.09 &&
            acceptModalDarkRatio < 0.12 &&
            transitionCenterDarkRatio > 0.07 &&
            transitionCenterDarkRatio < 0.10 &&
            sideMenuGoldRatio > 0.09 &&
            sideMenuGoldRatio < 0.12 &&
            modeSelectGoldRatio > 0.08 &&
            modeSelectGoldRatio < 0.11 &&
            gameOverReplayBlueRatio > 0.09 &&
            gameOverReplayBlueRatio < 0.12 &&
            gameOverResultTitleBlueRatio > 0.10 &&
            gameOverResultTitleBlueRatio < 0.12 &&
            augmentCardPurpleRatio > 0.50 &&
            augmentCardPurpleRatio < 0.56 &&
            progressDarkRatio < 0.01
        ) ||
        (
            liveHudGoldSignalRatio > 0.20 &&
            liveHudGoldSignalRatio < 0.22 &&
            liveHudScoreSignalRatio > 0.025 &&
            liveHudScoreSignalRatio < 0.035 &&
            lobbyStartBlueRatio > 0.22 &&
            lobbyStartBlueRatio < 0.25 &&
            lobbyStartDarkRatio < 0.03 &&
            queueStatusGoldRatio > 0.07 &&
            queueStatusGoldRatio < 0.09 &&
            queueStatusDarkRatio < 0.02 &&
            queueCancelDarkRatio < 0.05 &&
            acceptModalDarkRatio > 0.15 &&
            acceptModalDarkRatio < 0.18 &&
            transitionCenterDarkRatio > 0.12 &&
            transitionCenterDarkRatio < 0.14 &&
            sideMenuGoldRatio > 0.09 &&
            sideMenuGoldRatio < 0.12 &&
            modeSelectGoldRatio > 0.08 &&
            modeSelectGoldRatio < 0.10 &&
            gameOverReplayBlueRatio > 0.10 &&
            gameOverReplayBlueRatio < 0.12 &&
            augmentCardPurpleRatio > 0.52 &&
            augmentCardPurpleRatio < 0.55 &&
            augmentRerollBlueRatio > 0.34 &&
            augmentRerollBlueRatio < 0.38 &&
            progressDarkRatio < 0.005
        ) ||
        (
            liveHudGoldSignalRatio > 0.055 &&
            liveHudGoldSignalRatio < 0.075 &&
            liveHudScoreSignalRatio > 0.080 &&
            liveHudScoreSignalRatio < 0.090 &&
            lobbyStartBlueRatio > 0.55 &&
            lobbyStartBlueRatio < 0.59 &&
            lobbyStartDarkRatio < 0.03 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio < 0.005 &&
            queueCancelDarkRatio > 0.03 &&
            queueCancelDarkRatio < 0.05 &&
            acceptModalDarkRatio > 0.06 &&
            acceptModalDarkRatio < 0.09 &&
            acceptButtonBlueRatio > 0.70 &&
            acceptButtonBlueRatio < 0.80 &&
            transitionCenterDarkRatio > 0.06 &&
            transitionCenterDarkRatio < 0.08 &&
            modeSelectBlueRatio > 0.55 &&
            modeSelectBlueRatio < 0.65 &&
            gameOverReplayBlueRatio > 0.55 &&
            gameOverReplayBlueRatio < 0.62 &&
            gameOverResultExitBlueRatio > 0.60 &&
            gameOverResultExitBlueRatio < 0.70 &&
            gameOverResultTitleBlueRatio > 0.70 &&
            gameOverResultTitleBlueRatio < 0.77 &&
            augmentCardPurpleRatio > 0.55 &&
            augmentCardPurpleRatio < 0.60 &&
            progressDarkRatio < 0.01
        ) ||
        (
            liveHudGoldSignalRatio > 0.040 &&
            liveHudGoldSignalRatio < 0.050 &&
            liveHudScoreSignalRatio > 0.018 &&
            liveHudScoreSignalRatio < 0.026 &&
            lobbyStartBlueRatio < 0.01 &&
            lobbyStartDarkRatio > 0.45 &&
            lobbyStartDarkRatio < 0.49 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio > 0.32 &&
            queueStatusDarkRatio < 0.37 &&
            queueCancelDarkRatio > 0.45 &&
            queueCancelDarkRatio < 0.49 &&
            acceptModalDarkRatio > 0.14 &&
            acceptModalDarkRatio < 0.18 &&
            transitionCenterDarkRatio > 0.14 &&
            transitionCenterDarkRatio < 0.17 &&
            sideMenuDarkRatio > 0.34 &&
            sideMenuDarkRatio < 0.38 &&
            roomBackDarkRatio > 0.35 &&
            roomBackDarkRatio < 0.39 &&
            gameOverRowsDarkRatio > 0.20 &&
            gameOverRowsDarkRatio < 0.24 &&
            gameOverResultWatchDarkRatio > 0.07 &&
            gameOverResultWatchDarkRatio < 0.10 &&
            gameOverResultTitleDarkRatio > 0.24 &&
            gameOverResultTitleDarkRatio < 0.28 &&
            progressDarkRatio > 0.58 &&
            progressDarkRatio < 0.62
        ) ||
        (
            liveHudGoldSignalRatio > 0.060 &&
            liveHudGoldSignalRatio < 0.075 &&
            liveHudScoreSignalRatio > 0.080 &&
            liveHudScoreSignalRatio < 0.095 &&
            lobbyStartBlueRatio < 0.005 &&
            lobbyStartDarkRatio > 0.77 &&
            lobbyStartDarkRatio < 0.82 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio > 0.93 &&
            queueStatusDarkRatio < 0.98 &&
            queueCancelDarkRatio > 0.76 &&
            queueCancelDarkRatio < 0.82 &&
            acceptModalDarkRatio > 0.81 &&
            acceptModalDarkRatio < 0.86 &&
            transitionCenterDarkRatio > 0.78 &&
            transitionCenterDarkRatio < 0.84 &&
            roomBackDarkRatio > 0.63 &&
            roomBackDarkRatio < 0.69 &&
            modeSelectDarkRatio > 0.81 &&
            modeSelectDarkRatio < 0.86 &&
            gameOverRowsDarkRatio > 0.78 &&
            gameOverRowsDarkRatio < 0.83 &&
            gameOverResultWatchDarkRatio > 0.85 &&
            gameOverResultWatchDarkRatio < 0.90 &&
            progressDarkRatio > 0.97
        ) ||
        (
            liveHudGoldSignalRatio > 0.055 &&
            liveHudGoldSignalRatio < 0.070 &&
            liveHudScoreSignalRatio > 0.045 &&
            liveHudScoreSignalRatio < 0.055 &&
            lobbyStartBlueRatio > 0.010 &&
            lobbyStartBlueRatio < 0.025 &&
            lobbyStartDarkRatio > 0.26 &&
            lobbyStartDarkRatio < 0.31 &&
            queueStatusGoldRatio > 0.020 &&
            queueStatusGoldRatio < 0.030 &&
            queueStatusDarkRatio > 0.035 &&
            queueStatusDarkRatio < 0.055 &&
            queueCancelDarkRatio > 0.27 &&
            queueCancelDarkRatio < 0.31 &&
            acceptModalDarkRatio < 0.04 &&
            transitionCenterGoldRatio > 0.11 &&
            transitionCenterGoldRatio < 0.14 &&
            transitionCenterDarkRatio < 0.06 &&
            roomBackGoldRatio > 0.28 &&
            roomBackGoldRatio < 0.33 &&
            modeSelectGoldRatio > 0.09 &&
            modeSelectGoldRatio < 0.12 &&
            gameOverReplayBlueRatio > 0.07 &&
            gameOverReplayBlueRatio < 0.10 &&
            gameOverRowsDarkRatio > 0.04 &&
            gameOverRowsDarkRatio < 0.07 &&
            progressDarkRatio > 0.08 &&
            progressDarkRatio < 0.12
        ) ||
        (
            liveHudGoldSignalRatio > 0.10 &&
            lobbyStartBlueRatio < 0.20 &&
            acceptModalDarkRatio > 0.60 &&
            transitionCenterDarkRatio > 0.60
        ) ||
        (
            liveHudGoldSignalRatio > 0.16 &&
            liveHudGoldSignalRatio < 0.24 &&
            liveHudScoreSignalRatio > 0.025 &&
            liveHudScoreSignalRatio < 0.05 &&
            lobbyStartBlueRatio > 0.18 &&
            lobbyStartBlueRatio < 0.24 &&
            lobbyStartDarkRatio < 0.08 &&
            queueStatusGoldRatio > 0.04 &&
            queueStatusGoldRatio < 0.07 &&
            queueStatusDarkRatio < 0.05 &&
            queueCancelDarkRatio < 0.08 &&
            acceptModalDarkRatio < 0.08 &&
            transitionCenterDarkRatio < 0.08 &&
            modeSelectGoldRatio > 0.04 &&
            modeSelectGoldRatio < 0.10 &&
            progressDarkRatio < 0.05
        ) ||
        (
            liveHudGoldSignalRatio > 0.18 &&
            liveHudGoldSignalRatio < 0.24 &&
            liveHudScoreSignalRatio > 0.012 &&
            liveHudScoreSignalRatio < 0.03 &&
            lobbyStartBlueRatio > 0.20 &&
            lobbyStartBlueRatio < 0.28 &&
            lobbyStartDarkRatio < 0.06 &&
            queueStatusGoldRatio > 0.05 &&
            queueStatusGoldRatio < 0.09 &&
            queueStatusDarkRatio < 0.02 &&
            queueCancelDarkRatio < 0.08 &&
            acceptModalDarkRatio < 0.05 &&
            transitionCenterDarkRatio < 0.05 &&
            modeSelectGoldRatio > 0.07 &&
            modeSelectGoldRatio < 0.10 &&
            gameOverRowsDarkRatio < 0.04 &&
            augmentCardPurpleRatio > 0.55 &&
            augmentCardPurpleRatio < 0.66 &&
            augmentRerollBlueRatio > 0.35 &&
            augmentRerollBlueRatio < 0.45 &&
            progressDarkRatio < 0.02
        ) ||
        (
            liveHudGoldSignalRatio > 0.02 &&
            liveHudScoreSignalRatio > 0.035 &&
            acceptModalDarkRatio < 0.45 &&
            transitionCenterDarkRatio > 0.25 &&
            queueCancelDarkRatio < 0.50 &&
            lobbyStartBlueRatio < 0.05
        ) ||
        (
            liveHudScoreSignalRatio > 0.033 &&
            liveHudGoldSignalRatio > 0.004 &&
            acceptModalDarkRatio < 0.45 &&
            transitionCenterDarkRatio > 0.12 &&
            transitionCenterDarkRatio < 0.45 &&
            queueCancelDarkRatio < 0.58 &&
            lobbyStartBlueRatio < 0.05 &&
            modeSelectBlueRatio < 0.04 &&
            progressDarkRatio < 0.90
        ) ||
        (
            liveHudGoldSignalRatio > 0.12 &&
            liveHudGoldSignalRatio < 0.22 &&
            liveHudScoreSignalRatio > 0.012 &&
            acceptModalDarkRatio < 0.15 &&
            acceptButtonBlueRatio < 0.01 &&
            transitionCenterDarkRatio < 0.12 &&
            queueCancelDarkRatio < 0.20 &&
            lobbyStartBlueRatio < 0.05 &&
            progressDarkRatio > 0.10 &&
            progressDarkRatio < 0.20
        ) ||
        (
            liveHudGoldSignalRatio > 0.12 &&
            liveHudGoldSignalRatio < 0.16 &&
            liveHudScoreSignalRatio > 0.012 &&
            liveHudScoreSignalRatio < 0.025 &&
            roomBackGoldRatio > 0.22 &&
            roomBackGoldRatio < 0.34 &&
            roomBackDarkRatio > 0.24 &&
            roomBackDarkRatio < 0.36 &&
            sideDismissDarkRatio > 0.38 &&
            sideDismissDarkRatio < 0.50 &&
            acceptModalDarkRatio > 0.08 &&
            acceptModalDarkRatio < 0.18 &&
            transitionCenterDarkRatio > 0.09 &&
            transitionCenterDarkRatio < 0.18 &&
            queueCancelDarkRatio < 0.14 &&
            lobbyStartBlueRatio < 0.01 &&
            progressDarkRatio > 0.06 &&
            progressDarkRatio < 0.12
        ) ||
        (
            liveHudGoldSignalRatio > 0.12 &&
            liveHudGoldSignalRatio < 0.16 &&
            liveHudScoreSignalRatio > 0.055 &&
            liveHudScoreSignalRatio < 0.08 &&
            lobbyStartBlueRatio > 0.06 &&
            lobbyStartBlueRatio < 0.12 &&
            lobbyStartDarkRatio > 0.30 &&
            lobbyStartDarkRatio < 0.40 &&
            queueCancelDarkRatio > 0.28 &&
            queueCancelDarkRatio < 0.36 &&
            acceptModalDarkRatio < 0.03 &&
            acceptButtonDarkRatio < 0.02 &&
            transitionCenterDarkRatio < 0.05 &&
            roomBackGoldRatio > 0.10 &&
            roomBackGoldRatio < 0.15 &&
            roomBackDarkRatio > 0.36 &&
            roomBackDarkRatio < 0.44 &&
            gameOverReplayBlueRatio > 0.14 &&
            gameOverReplayBlueRatio < 0.20 &&
            progressDarkRatio > 0.26 &&
            progressDarkRatio < 0.34
        ) ||
        (
            liveHudGoldSignalRatio > 0.12 &&
            liveHudGoldSignalRatio < 0.16 &&
            liveHudScoreSignalRatio > 0.045 &&
            liveHudScoreSignalRatio < 0.07 &&
            lobbyStartBlueRatio < 0.01 &&
            queueStatusGoldRatio > 0.015 &&
            queueStatusGoldRatio < 0.035 &&
            queueStatusDarkRatio < 0.03 &&
            queueCancelDarkRatio < 0.12 &&
            acceptModalDarkRatio < 0.08 &&
            acceptButtonBlueRatio < 0.01 &&
            transitionCenterGoldRatio > 0.08 &&
            transitionCenterGoldRatio < 0.12 &&
            transitionCenterDarkRatio < 0.09 &&
            modeSelectGoldRatio > 0.09 &&
            modeSelectGoldRatio < 0.13 &&
            progressDarkRatio < 0.05
        ) ||
        (
            liveHudGoldSignalRatio > 0.12 &&
            liveHudGoldSignalRatio < 0.16 &&
            liveHudScoreSignalRatio > 0.065 &&
            liveHudScoreSignalRatio < 0.09 &&
            lobbyStartBlueRatio > 0.45 &&
            lobbyStartBlueRatio < 0.60 &&
            lobbyStartDarkRatio < 0.08 &&
            queueStatusGoldRatio < 0.01 &&
            queueStatusDarkRatio > 0.10 &&
            queueStatusDarkRatio < 0.16 &&
            queueCancelDarkRatio > 0.05 &&
            queueCancelDarkRatio < 0.09 &&
            acceptModalDarkRatio > 0.06 &&
            acceptModalDarkRatio < 0.10 &&
            transitionCenterDarkRatio > 0.05 &&
            transitionCenterDarkRatio < 0.09 &&
            modeSelectBlueRatio > 0.40 &&
            modeSelectBlueRatio < 0.50 &&
            gameOverReplayBlueRatio > 0.45 &&
            gameOverReplayBlueRatio < 0.55 &&
            gameOverRowsDarkRatio > 0.08 &&
            gameOverRowsDarkRatio < 0.13 &&
            augmentCardPurpleRatio > 0.45 &&
            augmentCardPurpleRatio < 0.55 &&
            augmentRerollBlueRatio > 0.25 &&
            augmentRerollBlueRatio < 0.35 &&
            progressDarkRatio < 0.03
        ) ||
        (
            liveHudGoldSignalRatio > 0.02 &&
            liveHudGoldSignalRatio < 0.20 &&
            liveHudScoreSignalRatio > 0.08 &&
            liveHudScoreSignalRatio < 0.095 &&
            lobbyStartBlueRatio > 0.48 &&
            lobbyStartBlueRatio < 0.60 &&
            lobbyStartDarkRatio > 0.12 &&
            lobbyStartDarkRatio < 0.16 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio < 0.01 &&
            queueCancelDarkRatio > 0.12 &&
            queueCancelDarkRatio < 0.16 &&
            acceptModalDarkRatio < 0.05 &&
            acceptButtonBlueRatio > 0.90 &&
            transitionCenterDarkRatio < 0.04 &&
            modeSelectBlueRatio > 0.65 &&
            gameOverReplayBlueRatio > 0.45 &&
            gameOverReplayBlueRatio < 0.60 &&
            gameOverRowsDarkRatio < 0.04 &&
            gameOverResultExitBlueRatio > 0.90 &&
            gameOverResultWatchDarkRatio < 0.01 &&
            augmentCardPurpleRatio > 0.60 &&
            augmentCardPurpleRatio < 0.66 &&
            progressDarkRatio < 0.01
        ) ||
        (
            liveHudGoldSignalRatio > 0.025 &&
            liveHudGoldSignalRatio < 0.08 &&
            liveHudScoreSignalRatio > 0.055 &&
            liveHudScoreSignalRatio < 0.09 &&
            acceptModalDarkRatio > 0.65 &&
            acceptModalDarkRatio < 0.85 &&
            transitionCenterDarkRatio > 0.65 &&
            transitionCenterDarkRatio < 0.85 &&
            queueStatusDarkRatio > 0.75 &&
            queueCancelDarkRatio > 0.75 &&
            lobbyStartBlueRatio < 0.05 &&
            modeSelectBlueRatio > 0.02 &&
            modeSelectBlueRatio < 0.05 &&
            progressDarkRatio > 0.55 &&
            progressDarkRatio < 0.85
        ) ||
        (
            liveHudGoldSignalRatio > 0.030 &&
            liveHudGoldSignalRatio < 0.040 &&
            liveHudScoreSignalRatio > 0.040 &&
            liveHudScoreSignalRatio < 0.090 &&
            lobbyStartBlueRatio > 0.075 &&
            lobbyStartBlueRatio < 0.17 &&
            lobbyStartDarkRatio > 0.19 &&
            lobbyStartDarkRatio < 0.22 &&
            queueStatusDarkRatio < 0.01 &&
            queueCancelDarkRatio > 0.20 &&
            queueCancelDarkRatio < 0.24 &&
            acceptModalDarkRatio > 0.24 &&
            acceptModalDarkRatio < 0.34 &&
            transitionCenterDarkRatio > 0.24 &&
            transitionCenterDarkRatio < 0.34 &&
            roomBackDarkRatio > 0.64 &&
            roomBackDarkRatio < 0.68 &&
            modeSelectBlueRatio > 0.24 &&
            modeSelectBlueRatio < 0.32 &&
            gameOverReplayBlueRatio > 0.07 &&
            gameOverReplayBlueRatio < 0.15 &&
            gameOverRowsDarkRatio > 0.20 &&
            gameOverRowsDarkRatio < 0.32 &&
            progressDarkRatio < 0.05
        ) ||
        (
            liveHudGoldSignalRatio > 0.045 &&
            liveHudGoldSignalRatio < 0.08 &&
            liveHudScoreSignalRatio > 0.030 &&
            liveHudScoreSignalRatio < 0.055 &&
            acceptModalDarkRatio < 0.15 &&
            transitionCenterDarkRatio < 0.12 &&
            queueCancelDarkRatio < 0.20 &&
            lobbyStartBlueRatio > 0.05 &&
            lobbyStartBlueRatio < 0.12 &&
            lobbyStartDarkRatio < 0.12 &&
            modeSelectBlueRatio > 0.20 &&
            modeSelectBlueRatio < 0.40 &&
            gameOverRowsDarkRatio < 0.15 &&
            progressDarkRatio > 0.08 &&
            progressDarkRatio < 0.16
        ) ||
        (
            liveHudGoldSignalRatio > 0.018 &&
            liveHudGoldSignalRatio < 0.050 &&
            liveHudScoreSignalRatio > 0.018 &&
            liveHudScoreSignalRatio < 0.040 &&
            acceptModalDarkRatio < 0.15 &&
            transitionCenterDarkRatio > 0.15 &&
            transitionCenterDarkRatio < 0.35 &&
            queueStatusDarkRatio > 0.25 &&
            queueStatusDarkRatio < 0.55 &&
            queueCancelDarkRatio < 0.40 &&
            lobbyStartBlueRatio < 0.08 &&
            modeSelectBlueRatio > 0.05 &&
            modeSelectBlueRatio < 0.12 &&
            gameOverRowsDarkRatio < 0.30 &&
            progressDarkRatio < 0.08
        ) ||
        (
            liveHudGoldSignalRatio > 0.030 &&
            liveHudGoldSignalRatio < 0.040 &&
            liveHudScoreSignalRatio > 0.070 &&
            liveHudScoreSignalRatio < 0.080 &&
            lobbyStartBlueRatio < 0.005 &&
            lobbyStartDarkRatio > 0.60 &&
            lobbyStartDarkRatio < 0.68 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio > 0.32 &&
            queueStatusDarkRatio < 0.38 &&
            queueCancelDarkRatio > 0.60 &&
            queueCancelDarkRatio < 0.67 &&
            acceptModalDarkRatio > 0.24 &&
            acceptModalDarkRatio < 0.29 &&
            acceptButtonBlueRatio < 0.01 &&
            acceptButtonDarkRatio < 0.02 &&
            transitionCenterDarkRatio > 0.25 &&
            transitionCenterDarkRatio < 0.30 &&
            sideMenuDarkRatio > 0.32 &&
            sideMenuDarkRatio < 0.37 &&
            sideDismissDarkRatio > 0.39 &&
            sideDismissDarkRatio < 0.45 &&
            roomBackDarkRatio > 0.48 &&
            roomBackDarkRatio < 0.54 &&
            modeSelectDarkRatio > 0.27 &&
            modeSelectDarkRatio < 0.32 &&
            gameOverReplayBlueRatio < 0.01 &&
            gameOverRowsDarkRatio > 0.24 &&
            gameOverRowsDarkRatio < 0.29 &&
            gameOverResultTitleDarkRatio > 0.34 &&
            gameOverResultTitleDarkRatio < 0.39 &&
            progressDarkRatio > 0.56 &&
            progressDarkRatio < 0.64
        ) ||
        (
            liveHudGoldSignalRatio > 0.015 &&
            liveHudGoldSignalRatio < 0.025 &&
            liveHudScoreSignalRatio > 0.020 &&
            liveHudScoreSignalRatio < 0.030 &&
            lobbyStartBlueRatio < 0.01 &&
            lobbyStartDarkRatio > 0.25 &&
            lobbyStartDarkRatio < 0.30 &&
            queueStatusGoldRatio > 0.015 &&
            queueStatusGoldRatio < 0.025 &&
            queueStatusDarkRatio > 0.04 &&
            queueStatusDarkRatio < 0.07 &&
            queueCancelDarkRatio > 0.26 &&
            queueCancelDarkRatio < 0.31 &&
            acceptModalDarkRatio > 0.14 &&
            acceptModalDarkRatio < 0.18 &&
            acceptButtonBlueRatio < 0.01 &&
            transitionCenterGoldRatio > 0.20 &&
            transitionCenterGoldRatio < 0.25 &&
            transitionCenterDarkRatio > 0.11 &&
            transitionCenterDarkRatio < 0.15 &&
            sideMenuGoldRatio > 0.19 &&
            sideMenuGoldRatio < 0.24 &&
            roomBackDarkRatio > 0.19 &&
            roomBackDarkRatio < 0.24 &&
            modeSelectGoldRatio > 0.14 &&
            modeSelectGoldRatio < 0.19 &&
            gameOverReplayBlueRatio < 0.01 &&
            gameOverRowsDarkRatio > 0.08 &&
            gameOverRowsDarkRatio < 0.11 &&
            progressDarkRatio < 0.01
        ) ||
        (
            liveHudGoldSignalRatio > 0.040 &&
            liveHudGoldSignalRatio < 0.055 &&
            liveHudScoreSignalRatio > 0.018 &&
            liveHudScoreSignalRatio < 0.030 &&
            lobbyStartBlueRatio < 0.01 &&
            lobbyStartDarkRatio > 0.15 &&
            lobbyStartDarkRatio < 0.19 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio > 0.42 &&
            queueStatusDarkRatio < 0.48 &&
            queueCancelDarkRatio > 0.23 &&
            queueCancelDarkRatio < 0.28 &&
            acceptModalDarkRatio > 0.12 &&
            acceptModalDarkRatio < 0.16 &&
            transitionCenterDarkRatio > 0.24 &&
            transitionCenterDarkRatio < 0.28 &&
            sideMenuDarkRatio > 0.36 &&
            sideMenuDarkRatio < 0.42 &&
            roomBackDarkRatio > 0.39 &&
            roomBackDarkRatio < 0.44 &&
            modeSelectDarkRatio > 0.38 &&
            modeSelectDarkRatio < 0.44 &&
            gameOverReplayBlueRatio < 0.01 &&
            gameOverRowsDarkRatio > 0.26 &&
            gameOverRowsDarkRatio < 0.30 &&
            gameOverResultWatchDarkRatio > 0.40 &&
            gameOverResultWatchDarkRatio < 0.45 &&
            progressDarkRatio > 0.05 &&
            progressDarkRatio < 0.08
        ) ||
        (
            liveHudGoldSignalRatio > 0.040 &&
            liveHudGoldSignalRatio < 0.055 &&
            liveHudScoreSignalRatio > 0.030 &&
            liveHudScoreSignalRatio < 0.040 &&
            lobbyStartBlueRatio < 0.01 &&
            lobbyStartDarkRatio > 0.09 &&
            lobbyStartDarkRatio < 0.12 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio > 0.06 &&
            queueStatusDarkRatio < 0.10 &&
            queueCancelDarkRatio > 0.12 &&
            queueCancelDarkRatio < 0.15 &&
            acceptModalDarkRatio > 0.04 &&
            acceptModalDarkRatio < 0.08 &&
            transitionCenterDarkRatio > 0.05 &&
            transitionCenterDarkRatio < 0.09 &&
            sideMenuDarkRatio > 0.22 &&
            sideMenuDarkRatio < 0.26 &&
            roomBackDarkRatio > 0.34 &&
            roomBackDarkRatio < 0.38 &&
            modeSelectDarkRatio > 0.20 &&
            modeSelectDarkRatio < 0.23 &&
            gameOverReplayBlueRatio < 0.01 &&
            gameOverRowsDarkRatio > 0.07 &&
            gameOverRowsDarkRatio < 0.11 &&
            augmentCardPurpleRatio > 0.18 &&
            augmentCardPurpleRatio < 0.22 &&
            augmentCardDarkRatio > 0.10 &&
            augmentCardDarkRatio < 0.14 &&
            progressDarkRatio < 0.03
        ) ||
        (
            liveHudGoldSignalRatio > 0.045 &&
            liveHudGoldSignalRatio < 0.060 &&
            liveHudScoreSignalRatio > 0.030 &&
            liveHudScoreSignalRatio < 0.045 &&
            lobbyStartBlueRatio > 0.14 &&
            lobbyStartBlueRatio < 0.19 &&
            lobbyStartDarkRatio > 0.24 &&
            lobbyStartDarkRatio < 0.30 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio > 0.11 &&
            queueStatusDarkRatio < 0.16 &&
            queueCancelDarkRatio > 0.24 &&
            queueCancelDarkRatio < 0.29 &&
            acceptModalDarkRatio > 0.27 &&
            acceptModalDarkRatio < 0.32 &&
            acceptButtonBlueRatio > 0.06 &&
            acceptButtonBlueRatio < 0.09 &&
            transitionCenterDarkRatio > 0.27 &&
            transitionCenterDarkRatio < 0.32 &&
            sideMenuDarkRatio > 0.38 &&
            sideMenuDarkRatio < 0.43 &&
            roomBackDarkRatio > 0.37 &&
            roomBackDarkRatio < 0.43 &&
            modeSelectDarkRatio > 0.31 &&
            modeSelectDarkRatio < 0.37 &&
            gameOverReplayBlueRatio > 0.02 &&
            gameOverReplayBlueRatio < 0.04 &&
            gameOverRowsDarkRatio > 0.26 &&
            gameOverRowsDarkRatio < 0.31 &&
            gameOverResultWatchDarkRatio > 0.45 &&
            gameOverResultWatchDarkRatio < 0.53 &&
            progressDarkRatio > 0.02 &&
            progressDarkRatio < 0.04
        ) ||
        (
            liveHudGoldSignalRatio > 0.055 &&
            liveHudGoldSignalRatio < 0.070 &&
            liveHudScoreSignalRatio > 0.050 &&
            liveHudScoreSignalRatio < 0.060 &&
            lobbyStartBlueRatio < 0.01 &&
            lobbyStartDarkRatio > 0.16 &&
            lobbyStartDarkRatio < 0.20 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio < 0.04 &&
            queueCancelDarkRatio > 0.18 &&
            queueCancelDarkRatio < 0.20 &&
            acceptModalDarkRatio < 0.08 &&
            transitionCenterDarkRatio < 0.10 &&
            gameOverRowsDarkRatio < 0.10 &&
            progressDarkRatio < 0.03
        ) ||
        (
            liveHudGoldSignalRatio > 0.085 &&
            liveHudGoldSignalRatio < 0.13 &&
            liveHudScoreSignalRatio > 0.08 &&
            liveHudScoreSignalRatio < 0.095 &&
            lobbyStartBlueRatio > 0.10 &&
            lobbyStartBlueRatio < 0.13 &&
            lobbyStartDarkRatio > 0.13 &&
            lobbyStartDarkRatio < 0.16 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio < 0.01 &&
            queueCancelDarkRatio > 0.14 &&
            queueCancelDarkRatio < 0.16 &&
            acceptModalDarkRatio < 0.06 &&
            transitionCenterDarkRatio < 0.055 &&
            gameOverRowsDarkRatio < 0.05 &&
            progressDarkRatio < 0.02
        ) ||
        (
            liveHudGoldSignalRatio > 0.030 &&
            liveHudGoldSignalRatio < 0.040 &&
            liveHudScoreSignalRatio > 0.095 &&
            liveHudScoreSignalRatio < 0.105 &&
            lobbyStartBlueRatio > 0.055 &&
            lobbyStartBlueRatio < 0.075 &&
            lobbyStartDarkRatio > 0.24 &&
            lobbyStartDarkRatio < 0.30 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio < 0.07 &&
            queueCancelDarkRatio > 0.25 &&
            queueCancelDarkRatio < 0.31 &&
            acceptModalDarkRatio > 0.34 &&
            acceptModalDarkRatio < 0.38 &&
            transitionCenterDarkRatio > 0.30 &&
            transitionCenterDarkRatio < 0.35 &&
            modeSelectBlueRatio > 0.05 &&
            modeSelectBlueRatio < 0.08 &&
            gameOverRowsDarkRatio > 0.28 &&
            gameOverRowsDarkRatio < 0.32 &&
            augmentCardDarkRatio > 0.32 &&
            augmentCardDarkRatio < 0.36 &&
            augmentRerollBlueRatio > 0.15 &&
            augmentRerollBlueRatio < 0.19 &&
            progressDarkRatio < 0.02
        ) ||
        (
            liveHudGoldSignalRatio > 0.040 &&
            liveHudGoldSignalRatio < 0.055 &&
            liveHudScoreSignalRatio > 0.085 &&
            liveHudScoreSignalRatio < 0.10 &&
            lobbyStartBlueRatio > 0.055 &&
            lobbyStartBlueRatio < 0.08 &&
            lobbyStartDarkRatio > 0.10 &&
            lobbyStartDarkRatio < 0.15 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio < 0.02 &&
            queueCancelDarkRatio > 0.12 &&
            queueCancelDarkRatio < 0.16 &&
            acceptModalDarkRatio > 0.05 &&
            acceptModalDarkRatio < 0.09 &&
            acceptButtonBlueRatio > 0.12 &&
            acceptButtonBlueRatio < 0.15 &&
            transitionCenterDarkRatio > 0.06 &&
            transitionCenterDarkRatio < 0.10 &&
            sideMenuDarkRatio > 0.32 &&
            sideMenuDarkRatio < 0.37 &&
            roomBackDarkRatio > 0.45 &&
            roomBackDarkRatio < 0.52 &&
            modeSelectBlueRatio > 0.05 &&
            modeSelectBlueRatio < 0.08 &&
            gameOverRowsDarkRatio > 0.09 &&
            gameOverRowsDarkRatio < 0.13 &&
            gameOverResultExitBlueRatio > 0.12 &&
            gameOverResultExitBlueRatio < 0.17 &&
            progressDarkRatio > 0.02 &&
            progressDarkRatio < 0.04
        ) ||
        (
            liveHudGoldSignalRatio > 0.035 &&
            liveHudGoldSignalRatio < 0.055 &&
            liveHudScoreSignalRatio > 0.080 &&
            liveHudScoreSignalRatio < 0.095 &&
            lobbyStartBlueRatio < 0.01 &&
            lobbyStartDarkRatio > 0.21 &&
            lobbyStartDarkRatio < 0.26 &&
            queueStatusGoldRatio < 0.01 &&
            queueStatusDarkRatio > 0.11 &&
            queueStatusDarkRatio < 0.16 &&
            queueCancelDarkRatio > 0.18 &&
            queueCancelDarkRatio < 0.23 &&
            acceptModalDarkRatio > 0.06 &&
            acceptModalDarkRatio < 0.09 &&
            acceptButtonBlueRatio < 0.01 &&
            transitionCenterDarkRatio > 0.09 &&
            transitionCenterDarkRatio < 0.14 &&
            sideMenuDarkRatio > 0.43 &&
            sideMenuDarkRatio < 0.49 &&
            roomBackDarkRatio > 0.68 &&
            roomBackDarkRatio < 0.76 &&
            modeSelectBlueRatio < 0.02 &&
            gameOverReplayBlueRatio < 0.01 &&
            gameOverRowsDarkRatio > 0.11 &&
            gameOverRowsDarkRatio < 0.15 &&
            progressDarkRatio > 0.08 &&
            progressDarkRatio < 0.12
        ) ||
        (
            liveHudGoldSignalRatio > 0.050 &&
            liveHudGoldSignalRatio < 0.060 &&
            liveHudScoreSignalRatio > 0.010 &&
            liveHudScoreSignalRatio < 0.020 &&
            lobbyStartBlueRatio < 0.02 &&
            lobbyStartDarkRatio > 0.17 &&
            lobbyStartDarkRatio < 0.22 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio > 0.40 &&
            queueStatusDarkRatio < 0.46 &&
            queueCancelDarkRatio > 0.25 &&
            queueCancelDarkRatio < 0.30 &&
            acceptModalDarkRatio > 0.11 &&
            acceptModalDarkRatio < 0.15 &&
            acceptButtonBlueRatio > 0.40 &&
            acceptButtonBlueRatio < 0.45 &&
            transitionCenterDarkRatio > 0.22 &&
            transitionCenterDarkRatio < 0.26 &&
            sideMenuDarkRatio > 0.36 &&
            sideMenuDarkRatio < 0.40 &&
            roomBackDarkRatio > 0.37 &&
            roomBackDarkRatio < 0.41 &&
            modeSelectBlueRatio > 0.08 &&
            modeSelectBlueRatio < 0.10 &&
            gameOverReplayBlueRatio < 0.01 &&
            gameOverRowsDarkRatio > 0.20 &&
            gameOverRowsDarkRatio < 0.25 &&
            gameOverResultExitBlueRatio > 0.55 &&
            gameOverResultExitBlueRatio < 0.70 &&
            progressDarkRatio > 0.03 &&
            progressDarkRatio < 0.05
        ) ||
        (
            liveHudGoldSignalRatio > 0.040 &&
            liveHudGoldSignalRatio < 0.055 &&
            liveHudScoreSignalRatio > 0.008 &&
            liveHudScoreSignalRatio < 0.015 &&
            lobbyStartBlueRatio < 0.015 &&
            lobbyStartDarkRatio > 0.08 &&
            lobbyStartDarkRatio < 0.13 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio > 0.015 &&
            queueStatusDarkRatio < 0.035 &&
            queueCancelDarkRatio > 0.10 &&
            queueCancelDarkRatio < 0.13 &&
            acceptModalDarkRatio > 0.045 &&
            acceptModalDarkRatio < 0.075 &&
            acceptButtonBlueRatio > 0.23 &&
            acceptButtonBlueRatio < 0.27 &&
            acceptButtonDarkRatio > 0.08 &&
            acceptButtonDarkRatio < 0.12 &&
            transitionCenterDarkRatio > 0.05 &&
            transitionCenterDarkRatio < 0.08 &&
            sideMenuDarkRatio > 0.25 &&
            sideMenuDarkRatio < 0.30 &&
            roomBackDarkRatio > 0.48 &&
            roomBackDarkRatio < 0.54 &&
            modeSelectBlueRatio > 0.16 &&
            modeSelectBlueRatio < 0.19 &&
            gameOverRowsDarkRatio > 0.09 &&
            gameOverRowsDarkRatio < 0.12 &&
            gameOverResultExitBlueRatio > 0.48 &&
            gameOverResultExitBlueRatio < 0.54 &&
            gameOverResultTitleBlueRatio > 0.38 &&
            gameOverResultTitleBlueRatio < 0.42 &&
            augmentCardPurpleRatio > 0.22 &&
            augmentCardPurpleRatio < 0.26 &&
            augmentCardDarkRatio > 0.22 &&
            augmentCardDarkRatio < 0.26 &&
            progressDarkRatio > 0.10 &&
            progressDarkRatio < 0.13
        ) ||
        (
            liveHudGoldSignalRatio > 0.050 &&
            liveHudGoldSignalRatio < 0.065 &&
            liveHudScoreSignalRatio > 0.010 &&
            liveHudScoreSignalRatio < 0.020 &&
            lobbyStartBlueRatio < 0.02 &&
            lobbyStartDarkRatio > 0.17 &&
            lobbyStartDarkRatio < 0.20 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio > 0.40 &&
            queueStatusDarkRatio < 0.46 &&
            queueCancelDarkRatio > 0.24 &&
            queueCancelDarkRatio < 0.29 &&
            acceptModalDarkRatio > 0.19 &&
            acceptModalDarkRatio < 0.23 &&
            acceptButtonBlueRatio > 0.17 &&
            acceptButtonBlueRatio < 0.22 &&
            acceptButtonDarkRatio > 0.06 &&
            acceptButtonDarkRatio < 0.10 &&
            transitionCenterGoldRatio > 0.035 &&
            transitionCenterGoldRatio < 0.050 &&
            transitionCenterDarkRatio > 0.28 &&
            transitionCenterDarkRatio < 0.32 &&
            sideMenuDarkRatio > 0.38 &&
            sideMenuDarkRatio < 0.42 &&
            sideDismissDarkRatio > 0.57 &&
            sideDismissDarkRatio < 0.62 &&
            roomBackGoldRatio > 0.025 &&
            roomBackGoldRatio < 0.038 &&
            roomBackDarkRatio > 0.35 &&
            roomBackDarkRatio < 0.40 &&
            modeSelectBlueRatio > 0.055 &&
            modeSelectBlueRatio < 0.075 &&
            gameOverReplayBlueRatio < 0.015 &&
            gameOverRowsDarkRatio > 0.27 &&
            gameOverRowsDarkRatio < 0.31 &&
            gameOverResultExitBlueRatio > 0.22 &&
            gameOverResultExitBlueRatio < 0.27 &&
            gameOverResultTitleDarkRatio > 0.23 &&
            gameOverResultTitleDarkRatio < 0.28 &&
            augmentCardPurpleRatio > 0.10 &&
            augmentCardPurpleRatio < 0.14 &&
            progressDarkRatio > 0.04 &&
            progressDarkRatio < 0.07
        ) ||
        (
            liveHudGoldSignalRatio > 0.015 &&
            liveHudGoldSignalRatio < 0.025 &&
            liveHudScoreSignalRatio > 0.020 &&
            liveHudScoreSignalRatio < 0.030 &&
            lobbyStartBlueRatio > 0.025 &&
            lobbyStartBlueRatio < 0.045 &&
            lobbyStartDarkRatio > 0.17 &&
            lobbyStartDarkRatio < 0.22 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio > 0.10 &&
            queueStatusDarkRatio < 0.15 &&
            queueCancelDarkRatio > 0.16 &&
            queueCancelDarkRatio < 0.20 &&
            acceptModalDarkRatio > 0.13 &&
            acceptModalDarkRatio < 0.16 &&
            acceptButtonBlueRatio > 0.15 &&
            acceptButtonBlueRatio < 0.20 &&
            acceptButtonDarkRatio > 0.05 &&
            acceptButtonDarkRatio < 0.08 &&
            transitionCenterDarkRatio > 0.12 &&
            transitionCenterDarkRatio < 0.16 &&
            sideMenuDarkRatio > 0.28 &&
            sideMenuDarkRatio < 0.33 &&
            roomBackDarkRatio > 0.64 &&
            roomBackDarkRatio < 0.70 &&
            modeSelectBlueRatio > 0.05 &&
            modeSelectBlueRatio < 0.07 &&
            gameOverReplayBlueRatio < 0.01 &&
            gameOverRowsDarkRatio > 0.10 &&
            gameOverRowsDarkRatio < 0.14 &&
            gameOverResultExitBlueRatio > 0.28 &&
            gameOverResultExitBlueRatio < 0.33 &&
            augmentCardPurpleRatio > 0.25 &&
            augmentCardPurpleRatio < 0.30 &&
            augmentCardDarkRatio > 0.20 &&
            augmentCardDarkRatio < 0.24 &&
            progressDarkRatio > 0.18 &&
            progressDarkRatio < 0.23
        ) ||
        (
            liveHudGoldSignalRatio > 0.42 &&
            liveHudScoreSignalRatio > 0.035 &&
            liveHudScoreSignalRatio < 0.06 &&
            lobbyStartBlueRatio > 0.45 &&
            lobbyStartBlueRatio < 0.65 &&
            lobbyStartDarkRatio < 0.20 &&
            queueStatusGoldRatio < 0.005 &&
            queueStatusDarkRatio < 0.02 &&
            queueCancelDarkRatio > 0.12 &&
            queueCancelDarkRatio < 0.17 &&
            acceptModalDarkRatio < 0.08 &&
            acceptButtonBlueRatio < 0.01 &&
            transitionCenterDarkRatio < 0.05 &&
            gameOverReplayBlueRatio > 0.25 &&
            gameOverRowsDarkRatio < 0.04 &&
            gameOverResultWatchDarkRatio < 0.02 &&
            augmentCardDarkRatio < 0.05 &&
            progressDarkRatio < 0.02
        ) ||
        (
            liveHudGoldSignalRatio > 0.18 &&
            liveHudGoldSignalRatio < 0.24 &&
            liveHudScoreSignalRatio > 0.025 &&
            liveHudScoreSignalRatio < 0.06 &&
            lobbyStartBlueRatio > 0.20 &&
            lobbyStartBlueRatio < 0.30 &&
            acceptModalDarkRatio < 0.15 &&
            transitionCenterDarkRatio < 0.10 &&
            progressDarkRatio < 0.06 &&
            augmentCardPurpleRatio > 0.55 &&
            augmentCardPurpleRatio < 0.66
        ) ||
        (
            liveHudGoldSignalRatio > 0.25 &&
            liveHudGoldSignalRatio < 0.32 &&
            liveHudScoreSignalRatio > 0.018 &&
            liveHudScoreSignalRatio < 0.035 &&
            lobbyStartBlueRatio > 0.24 &&
            lobbyStartBlueRatio < 0.32 &&
            lobbyStartDarkRatio < 0.08 &&
            queueStatusGoldRatio > 0.04 &&
            queueStatusGoldRatio < 0.08 &&
            queueStatusDarkRatio < 0.08 &&
            queueCancelDarkRatio < 0.10 &&
            acceptModalDarkRatio < 0.22 &&
            transitionCenterDarkRatio < 0.18 &&
            modeSelectGoldRatio > 0.05 &&
            modeSelectGoldRatio < 0.10 &&
            gameOverRowsDarkRatio < 0.18 &&
            augmentCardPurpleRatio > 0.45 &&
            augmentCardPurpleRatio < 0.58 &&
            augmentRerollBlueRatio > 0.25 &&
            augmentRerollBlueRatio < 0.38 &&
            progressDarkRatio < 0.03
        ) ||
        (
            liveHudGoldSignalRatio > 0.025 &&
            liveHudGoldSignalRatio < 0.045 &&
            liveHudScoreSignalRatio > 0.030 &&
            liveHudScoreSignalRatio < 0.050 &&
            lobbyStartBlueRatio > 0.14 &&
            lobbyStartBlueRatio < 0.18 &&
            lobbyStartDarkRatio > 0.17 &&
            lobbyStartDarkRatio < 0.22 &&
            queueStatusGoldRatio < 0.010 &&
            queueStatusDarkRatio < 0.010 &&
            queueCancelDarkRatio > 0.19 &&
            queueCancelDarkRatio < 0.23 &&
            acceptModalDarkRatio > 0.25 &&
            acceptModalDarkRatio < 0.30 &&
            acceptButtonBlueRatio > 0.34 &&
            acceptButtonBlueRatio < 0.39 &&
            acceptButtonDarkRatio > 0.14 &&
            acceptButtonDarkRatio < 0.18 &&
            transitionCenterDarkRatio > 0.26 &&
            transitionCenterDarkRatio < 0.31 &&
            gameOverResultExitBlueRatio > 0.50 &&
            gameOverResultExitBlueRatio < 0.58 &&
            gameOverResultTitleBlueRatio > 0.26 &&
            gameOverResultTitleBlueRatio < 0.32 &&
            augmentCardPurpleRatio > 0.34 &&
            augmentCardPurpleRatio < 0.39 &&
            augmentCardDarkRatio > 0.28 &&
            augmentCardDarkRatio < 0.32 &&
            progressDarkRatio < 0.02
        ) ||
        (
            liveHudGoldSignalRatio > 0.050 &&
            liveHudGoldSignalRatio < 0.065 &&
            liveHudScoreSignalRatio > 0.052 &&
            liveHudScoreSignalRatio < 0.067 &&
            lobbyStartBlueRatio > 0.060 &&
            lobbyStartBlueRatio < 0.090 &&
            lobbyStartDarkRatio > 0.13 &&
            lobbyStartDarkRatio < 0.18 &&
            queueStatusDarkRatio < 0.005 &&
            queueCancelDarkRatio > 0.15 &&
            queueCancelDarkRatio < 0.20 &&
            acceptModalDarkRatio > 0.28 &&
            acceptModalDarkRatio < 0.34 &&
            acceptButtonBlueRatio > 0.56 &&
            acceptButtonBlueRatio < 0.63 &&
            acceptButtonDarkRatio > 0.040 &&
            acceptButtonDarkRatio < 0.080 &&
            transitionCenterDarkRatio > 0.27 &&
            transitionCenterDarkRatio < 0.32 &&
            roomBackDarkRatio > 0.52 &&
            roomBackDarkRatio < 0.60 &&
            modeSelectBlueRatio > 0.17 &&
            modeSelectBlueRatio < 0.22 &&
            gameOverResultExitBlueRatio > 0.54 &&
            gameOverResultExitBlueRatio < 0.62 &&
            gameOverResultTitleBlueRatio > 0.14 &&
            gameOverResultTitleBlueRatio < 0.18 &&
            augmentCardPurpleRatio > 0.22 &&
            augmentCardPurpleRatio < 0.27 &&
            augmentCardDarkRatio > 0.29 &&
            augmentCardDarkRatio < 0.35 &&
            progressDarkRatio > 0.025 &&
            progressDarkRatio < 0.050
        ) ||
        (
            liveHudGoldSignalRatio > 0.018 &&
            liveHudGoldSignalRatio < 0.030 &&
            liveHudScoreSignalRatio > 0.025 &&
            liveHudScoreSignalRatio < 0.040 &&
            lobbyStartBlueRatio < 0.005 &&
            lobbyStartDarkRatio > 0.18 &&
            lobbyStartDarkRatio < 0.23 &&
            queueStatusGoldRatio > 0.015 &&
            queueStatusGoldRatio < 0.030 &&
            queueStatusDarkRatio > 0.035 &&
            queueStatusDarkRatio < 0.060 &&
            queueCancelDarkRatio > 0.18 &&
            queueCancelDarkRatio < 0.22 &&
            acceptModalDarkRatio > 0.045 &&
            acceptModalDarkRatio < 0.065 &&
            acceptButtonBlueRatio > 0.50 &&
            acceptButtonBlueRatio < 0.56 &&
            transitionCenterDarkRatio > 0.045 &&
            transitionCenterDarkRatio < 0.070 &&
            gameOverRowsDarkRatio < 0.09 &&
            gameOverResultExitBlueRatio > 0.62 &&
            gameOverResultExitBlueRatio < 0.70 &&
            gameOverResultTitleBlueRatio > 0.48 &&
            gameOverResultTitleBlueRatio < 0.55 &&
            augmentCardPurpleRatio > 0.56 &&
            augmentCardPurpleRatio < 0.64 &&
            augmentCardDarkRatio > 0.10 &&
            augmentCardDarkRatio < 0.15 &&
            progressDarkRatio > 0.08 &&
            progressDarkRatio < 0.13
        ) ||
        (
            liveHudGoldSignalRatio > 0.19 &&
            liveHudGoldSignalRatio < 0.22 &&
            liveHudScoreSignalRatio > 0.018 &&
            liveHudScoreSignalRatio < 0.030 &&
            lobbyStartBlueRatio > 0.20 &&
            lobbyStartBlueRatio < 0.23 &&
            lobbyStartDarkRatio < 0.04 &&
            queueStatusGoldRatio > 0.06 &&
            queueStatusGoldRatio < 0.09 &&
            transitionCenterGoldRatio > 0.015 &&
            transitionCenterGoldRatio < 0.030 &&
            transitionCenterDarkRatio > 0.04 &&
            transitionCenterDarkRatio < 0.08 &&
            roomBackGoldRatio > 0.05 &&
            roomBackGoldRatio < 0.08 &&
            roomBackDarkRatio > 0.22 &&
            roomBackDarkRatio < 0.30 &&
            gameOverReplayBlueRatio > 0.09 &&
            gameOverReplayBlueRatio < 0.12 &&
            progressDarkRatio < 0.02
        ) ||
        (
            liveHudGoldSignalRatio > 0.050 &&
            liveHudGoldSignalRatio < 0.065 &&
            liveHudScoreSignalRatio > 0.035 &&
            liveHudScoreSignalRatio < 0.045 &&
            lobbyStartBlueRatio < 0.005 &&
            lobbyStartDarkRatio > 0.12 &&
            lobbyStartDarkRatio < 0.14 &&
            queueStatusGoldRatio < 0.005 &&
            transitionCenterGoldRatio > 0.005 &&
            transitionCenterGoldRatio < 0.035 &&
            transitionCenterDarkRatio > 0.08 &&
            transitionCenterDarkRatio < 0.12 &&
            sideMenuDarkRatio > 0.32 &&
            sideMenuDarkRatio < 0.39 &&
            roomBackGoldRatio > 0.045 &&
            roomBackGoldRatio < 0.065 &&
            roomBackDarkRatio > 0.55 &&
            roomBackDarkRatio < 0.62 &&
            gameOverReplayBlueRatio < 0.01 &&
            progressDarkRatio > 0.14 &&
            progressDarkRatio < 0.17
        ) ||
        (
            liveHudGoldSignalRatio > 0.050 &&
            liveHudGoldSignalRatio < 0.065 &&
            liveHudScoreSignalRatio > 0.010 &&
            liveHudScoreSignalRatio < 0.018 &&
            lobbyStartBlueRatio < 0.005 &&
            lobbyStartDarkRatio > 0.14 &&
            lobbyStartDarkRatio < 0.17 &&
            queueStatusGoldRatio < 0.005 &&
            transitionCenterDarkRatio > 0.13 &&
            transitionCenterDarkRatio < 0.16 &&
            sideMenuDarkRatio > 0.30 &&
            sideMenuDarkRatio < 0.34 &&
            roomBackGoldRatio > 0.020 &&
            roomBackGoldRatio < 0.040 &&
            roomBackDarkRatio > 0.30 &&
            roomBackDarkRatio < 0.34 &&
            gameOverReplayBlueRatio > 0.020 &&
            gameOverReplayBlueRatio < 0.040 &&
            progressDarkRatio > 0.030 &&
            progressDarkRatio < 0.050
        ) ||
        (
            liveHudGoldSignalRatio > 0.050 &&
            liveHudGoldSignalRatio < 0.105 &&
            liveHudScoreSignalRatio > 0.030 &&
            liveHudScoreSignalRatio < 0.038 &&
            lobbyStartBlueRatio > 0.030 &&
            lobbyStartBlueRatio < 0.065 &&
            lobbyStartDarkRatio > 0.14 &&
            lobbyStartDarkRatio < 0.17 &&
            queueStatusGoldRatio < 0.005 &&
            transitionCenterDarkRatio > 0.035 &&
            transitionCenterDarkRatio < 0.050 &&
            sideMenuDarkRatio > 0.22 &&
            sideMenuDarkRatio < 0.26 &&
            roomBackGoldRatio > 0.035 &&
            roomBackGoldRatio < 0.045 &&
            roomBackDarkRatio > 0.56 &&
            roomBackDarkRatio < 0.61 &&
            gameOverReplayBlueRatio > 0.14 &&
            gameOverReplayBlueRatio < 0.16 &&
            progressDarkRatio < 0.020
        );
    const isDarkItemRoomTransition =
        !hasLiveContentHudSignal &&
        liveHudGoldSignalRatio > 0.015 &&
        liveHudGoldSignalRatio < 0.030 &&
        liveHudScoreSignalRatio > 0.010 &&
        liveHudScoreSignalRatio < 0.025 &&
        lobbyStartBlueRatio < 0.005 &&
        lobbyStartDarkRatio > 0.80 &&
        queueStatusGoldRatio < 0.005 &&
        queueStatusDarkRatio > 0.95 &&
        queueCancelDarkRatio > 0.80 &&
        acceptModalDarkRatio > 0.95 &&
        acceptButtonBlueRatio < 0.005 &&
        acceptButtonDarkRatio > 0.95 &&
        transitionCenterGoldRatio < 0.005 &&
        transitionCenterDarkRatio > 0.95 &&
        sideMenuDarkRatio > 0.95 &&
        roomBackGoldRatio > 0.020 &&
        roomBackGoldRatio < 0.040 &&
        roomBackDarkRatio > 0.84 &&
        modeSelectDarkRatio > 0.95 &&
        gameOverRowsDarkRatio > 0.95 &&
        gameOverResultWatchDarkRatio > 0.95 &&
        progressDarkRatio > 0.95;

    if (brightBlueRatio > 0.18 && !hasBootExcludingLiveHudSignal) {
        state = "BLUESTACKS_BOOT";
    } else if (isS16LoadingRosterTransition || isDarkItemRoomTransition) {
        state = "IN_GAME_TRANSITION";
    } else if (brightWhiteRatio > 0.05) {
        state = "TFT_FRONTEND";
        if (frontendRetryRedRatio > 0.24 && loginSecondaryGoldRatio < 0.01 && progressDarkRatio < 0.02) {
            frontendVariant = "NETWORK_ERROR";
        } else if (loginSecondaryGoldRatio > 0.02 && progressDarkRatio > 0.08) {
            frontendVariant = "LOGIN_REQUIRED";
        } else {
            frontendVariant = "UPDATE_READY";
            primaryActionPoint = UPDATE_PRIMARY_ACTION_POINT;
        }
    } else if (isStandardAcceptReady || isLargeCircleAcceptReady) {
        state = "ACCEPT_READY";
        acceptReadyPoint = ACCEPT_READY_ACTION_POINT;
    } else if (queueCancelDarkRatio > 0.60 && queueStatusGoldRatio > 0.035 && queueStatusDarkRatio > 0.15 && queueStatusDarkRatio < 0.45) {
        state = "QUEUE";
        cancelQueuePoint = CANCEL_QUEUE_ACTION_POINT;
    } else if (
        queueCancelDarkRatio > 0.55 &&
        queueStatusGoldRatio > 0.015 &&
        queueStatusDarkRatio > 0.35 &&
        queueStatusDarkRatio < 0.70 &&
        lobbyStartBlueRatio < 0.05 &&
        acceptButtonBlueRatio < 0.01
    ) {
        state = "QUEUE";
        cancelQueuePoint = CANCEL_QUEUE_ACTION_POINT;
    } else if (
        modeSelectGoldRatio > 0.04 &&
        modeSelectBlueRatio > 0.04 &&
        modeSelectDarkRatio > 0.30 &&
        lobbyStartBlueRatio < 0.05
    ) {
        state = "MODE_SELECT";
        selectGameModePoint = SELECT_GAME_MODE_ACTION_POINT;
        startQueuePoint = START_QUEUE_ACTION_POINT;
    } else if (
        acceptModalDarkRatio > 0.85 &&
        transitionCenterDarkRatio > 0.80 &&
        lobbyStartBlueRatio < 0.05 &&
        acceptButtonBlueRatio < 0.02 &&
        modeSelectGoldRatio < 0.02 &&
        modeSelectBlueRatio < 0.04 &&
        loginSecondaryGoldRatio > 0.01
    ) {
        state = "CONFIRM_MODAL";
        confirmModalVariant = loginSecondaryGoldRatio < 0.011 ? "NETWORK_ERROR" : "RECOVERABLE_CONFIRM";
        confirmModalPoint = confirmModalVariant === "NETWORK_ERROR"
            ? NETWORK_CONFIRM_MODAL_ACTION_POINT
            : CONFIRM_MODAL_ACTION_POINT;
    } else if (
        sideMenuDarkRatio > 0.30 &&
        sideMenuGoldRatio > 0.02 &&
        sideDismissDarkRatio > 0.85 &&
        lobbyStartBlueRatio < 0.05 &&
        queueStatusGoldRatio < 0.04 &&
        acceptButtonBlueRatio < 0.02 &&
        progressDarkRatio < 0.80
    ) {
        state = "LOBBY";
        lobbyVariant = "SIDE_MENU_OPEN";
        dismissOverlayPoint = DISMISS_OVERLAY_ACTION_POINT;
    } else if (
        acceptModalDarkRatio > 0.92 &&
        transitionCenterDarkRatio > 0.92 &&
        queueCancelDarkRatio > 0.85 &&
        queueStatusGoldRatio > 0.035 &&
        gameOverRowsDarkRatio > 0.90 &&
        gameOverResultWatchDarkRatio > 0.90 &&
        lobbyStartBlueRatio < 0.02 &&
        augmentCardPurpleRatio < 0.005 &&
        progressDarkRatio > 0.86
    ) {
        state = "LOBBY";
        lobbyVariant = "SETTINGS_OPEN";
        dismissOverlayPoint = SETTINGS_DISMISS_ACTION_POINT;
    } else if (isGameOverScoreboard || isDarkGameOverScoreboard) {
        state = "GAME_OVER";
        gameOverExitPoint = GAME_OVER_SCOREBOARD_EXIT_ACTION_POINT;
    } else if (
        lobbyStartBlueRatio > 0.25 &&
        lobbyStartDarkRatio < 0.20 &&
        !hasLiveContentHudSignal
    ) {
        state = "LOBBY";
        if (roomBackGoldRatio > 0.018 && roomBackDarkRatio > 0.50) {
            lobbyVariant = "ROOM";
            leaveRoomPoint = getLeaveRoomActionPoint(width, height);
        } else {
            lobbyVariant = "DEFAULT";
        }
        startQueuePoint = START_QUEUE_ACTION_POINT;
    } else if (isGameOverResultModal || isDimmedGameOverResultModal || isLateDimmedGameOverResultModal || isBrightGameOverResultModal || isMutedGameOverResultModal || isPurpleMutedGameOverResultModal || isLiveHudPlacementGameOverResultModal) {
        state = "GAME_OVER";
        gameOverExitPoint = GAME_OVER_RESULT_EXIT_ACTION_POINT;
    } else if (
        !hasLiveContentHudSignal &&
        (
            (transitionCenterGoldRatio > 0.10 && transitionCenterDarkRatio < 0.12) ||
            (
                liveHudGoldSignalRatio < 0.005 &&
                liveHudScoreSignalRatio > 0.018 &&
                liveHudScoreSignalRatio < 0.026 &&
                lobbyStartBlueRatio < 0.005 &&
                acceptModalDarkRatio > 0.32 &&
                acceptModalDarkRatio < 0.36 &&
                acceptButtonBlueRatio > 0.36 &&
                acceptButtonBlueRatio < 0.41 &&
                acceptButtonDarkRatio > 0.10 &&
                acceptButtonDarkRatio < 0.14 &&
                transitionCenterGoldRatio > 0.050 &&
                transitionCenterGoldRatio < 0.065 &&
                transitionCenterDarkRatio > 0.31 &&
                transitionCenterDarkRatio < 0.35 &&
                queueStatusGoldRatio > 0.025 &&
                queueStatusGoldRatio < 0.040 &&
                queueStatusDarkRatio > 0.46 &&
                queueStatusDarkRatio < 0.51 &&
                queueCancelDarkRatio > 0.20 &&
                queueCancelDarkRatio < 0.25 &&
                gameOverRowsDarkRatio > 0.38 &&
                gameOverRowsDarkRatio < 0.43 &&
                gameOverResultExitBlueRatio > 0.22 &&
                gameOverResultExitBlueRatio < 0.27 &&
                gameOverResultTitleDarkRatio > 0.59 &&
                gameOverResultTitleDarkRatio < 0.63 &&
                augmentCardPurpleRatio > 0.29 &&
                augmentCardPurpleRatio < 0.32 &&
                augmentCardDarkRatio > 0.23 &&
                augmentCardDarkRatio < 0.27 &&
                progressDarkRatio > 0.70 &&
                progressDarkRatio < 0.75
            ) ||
            (
                acceptButtonDarkRatio > 0.65 &&
                acceptButtonBlueRatio < 0.01 &&
                acceptModalDarkRatio > 0.40 &&
                transitionCenterGoldRatio > 0.03 &&
                transitionCenterDarkRatio > 0.65 &&
                progressDarkRatio > 0.90
            ) ||
            (
                lobbyStartBlueRatio < 0.02 &&
                acceptModalDarkRatio < 0.35 &&
                transitionCenterGoldRatio > 0.045 &&
                transitionCenterDarkRatio > 0.12 &&
                transitionCenterDarkRatio < 0.30 &&
                modeSelectBlueRatio > 0.03 &&
                modeSelectBlueRatio < 0.06 &&
                brightWhiteRatio > 0.005
            ) ||
            (
                lobbyStartBlueRatio < 0.02 &&
                acceptModalDarkRatio < 0.35 &&
                transitionCenterDarkRatio > 0.18 &&
                transitionCenterDarkRatio < 0.32 &&
                queueStatusGoldRatio > 0.08 &&
                queueStatusDarkRatio > 0.25 &&
                queueCancelDarkRatio < 0.30 &&
                progressDarkRatio > 0.55 &&
                brightWhiteRatio > 0.004
            ) ||
            (
                lobbyStartBlueRatio < 0.02 &&
                acceptModalDarkRatio > 0.25 &&
                acceptModalDarkRatio < 0.40 &&
                transitionCenterGoldRatio > 0.045 &&
                transitionCenterDarkRatio > 0.28 &&
                transitionCenterDarkRatio < 0.36 &&
                queueStatusGoldRatio > 0.055 &&
                queueStatusDarkRatio > 0.45 &&
                queueStatusDarkRatio < 0.68 &&
                queueCancelDarkRatio < 0.30 &&
                progressDarkRatio > 0.60 &&
                brightWhiteRatio > 0.004 &&
                augmentCardPurpleRatio > 0.25 &&
                augmentCardDarkRatio > 0.15 &&
                augmentCardDarkRatio < 0.25
            ) ||
            (
                liveHudGoldSignalRatio < 0.01 &&
                liveHudScoreSignalRatio < 0.01 &&
                acceptButtonBlueRatio > 0.10 &&
                acceptButtonDarkRatio > 0.10 &&
                acceptButtonDarkRatio < 0.25 &&
                transitionCenterDarkRatio > 0.25 &&
                transitionCenterDarkRatio < 0.40 &&
                queueCancelDarkRatio > 0.15 &&
                queueCancelDarkRatio < 0.30 &&
                augmentCardPurpleRatio > 0.25 &&
                augmentCardDarkRatio > 0.15 &&
                augmentCardDarkRatio < 0.30 &&
                progressDarkRatio > 0.65 &&
                gameOverRowsDarkRatio > 0.30 &&
                gameOverRowsDarkRatio < 0.50
            ) ||
            (
                liveHudGoldSignalRatio < 0.01 &&
                liveHudScoreSignalRatio > 0.010 &&
                liveHudScoreSignalRatio < 0.018 &&
                lobbyStartBlueRatio < 0.01 &&
                acceptModalDarkRatio > 0.22 &&
                acceptModalDarkRatio < 0.28 &&
                acceptButtonBlueRatio > 0.055 &&
                acceptButtonBlueRatio < 0.075 &&
                acceptButtonDarkRatio > 0.030 &&
                acceptButtonDarkRatio < 0.060 &&
                transitionCenterGoldRatio > 0.050 &&
                transitionCenterGoldRatio < 0.065 &&
                transitionCenterDarkRatio > 0.20 &&
                transitionCenterDarkRatio < 0.26 &&
                queueStatusGoldRatio > 0.015 &&
                queueStatusGoldRatio < 0.025 &&
                queueStatusDarkRatio > 0.34 &&
                queueStatusDarkRatio < 0.40 &&
                queueCancelDarkRatio > 0.17 &&
                queueCancelDarkRatio < 0.22 &&
                augmentCardPurpleRatio > 0.32 &&
                augmentCardPurpleRatio < 0.38 &&
                augmentCardDarkRatio > 0.13 &&
                augmentCardDarkRatio < 0.18 &&
                augmentRerollBlueRatio > 0.020 &&
                augmentRerollBlueRatio < 0.035 &&
                progressDarkRatio > 0.70 &&
                progressDarkRatio < 0.75 &&
                brightWhiteRatio > 0.010 &&
                brightWhiteRatio < 0.020
            ) ||
            (
                liveHudGoldSignalRatio < 0.005 &&
                liveHudScoreSignalRatio > 0.014 &&
                liveHudScoreSignalRatio < 0.020 &&
                lobbyStartBlueRatio < 0.005 &&
                acceptModalDarkRatio > 0.27 &&
                acceptModalDarkRatio < 0.31 &&
                acceptButtonBlueRatio < 0.010 &&
                acceptButtonDarkRatio > 0.09 &&
                acceptButtonDarkRatio < 0.13 &&
                transitionCenterGoldRatio > 0.030 &&
                transitionCenterGoldRatio < 0.045 &&
                transitionCenterDarkRatio > 0.24 &&
                transitionCenterDarkRatio < 0.29 &&
                queueStatusGoldRatio > 0.020 &&
                queueStatusGoldRatio < 0.035 &&
                queueStatusDarkRatio > 0.42 &&
                queueStatusDarkRatio < 0.48 &&
                queueCancelDarkRatio > 0.22 &&
                queueCancelDarkRatio < 0.27 &&
                augmentCardPurpleRatio > 0.32 &&
                augmentCardPurpleRatio < 0.37 &&
                augmentCardDarkRatio > 0.15 &&
                augmentCardDarkRatio < 0.20 &&
                progressDarkRatio > 0.70 &&
                progressDarkRatio < 0.75 &&
                brightWhiteRatio > 0.006 &&
                brightWhiteRatio < 0.012
            ) ||
            (
                liveHudGoldSignalRatio < 0.005 &&
                liveHudScoreSignalRatio > 0.010 &&
                liveHudScoreSignalRatio < 0.018 &&
                lobbyStartBlueRatio < 0.005 &&
                acceptModalDarkRatio > 0.33 &&
                acceptModalDarkRatio < 0.37 &&
                acceptButtonBlueRatio > 0.012 &&
                acceptButtonBlueRatio < 0.020 &&
                acceptButtonDarkRatio > 0.27 &&
                acceptButtonDarkRatio < 0.31 &&
                transitionCenterGoldRatio > 0.035 &&
                transitionCenterGoldRatio < 0.045 &&
                transitionCenterDarkRatio > 0.29 &&
                transitionCenterDarkRatio < 0.32 &&
                queueStatusGoldRatio > 0.040 &&
                queueStatusGoldRatio < 0.055 &&
                queueStatusDarkRatio > 0.43 &&
                queueStatusDarkRatio < 0.47 &&
                queueCancelDarkRatio > 0.20 &&
                queueCancelDarkRatio < 0.22 &&
                gameOverRowsDarkRatio > 0.36 &&
                gameOverRowsDarkRatio < 0.40 &&
                gameOverResultWatchDarkRatio > 0.32 &&
                gameOverResultWatchDarkRatio < 0.36 &&
                gameOverResultTitleDarkRatio > 0.62 &&
                gameOverResultTitleDarkRatio < 0.66 &&
                augmentCardPurpleRatio > 0.31 &&
                augmentCardPurpleRatio < 0.34 &&
                augmentCardDarkRatio > 0.21 &&
                augmentCardDarkRatio < 0.24 &&
                progressDarkRatio > 0.70 &&
                progressDarkRatio < 0.73
            ) ||
            (
                liveHudGoldSignalRatio < 0.005 &&
                liveHudScoreSignalRatio > 0.010 &&
                liveHudScoreSignalRatio < 0.013 &&
                lobbyStartBlueRatio > 0.004 &&
                lobbyStartBlueRatio < 0.008 &&
                acceptModalDarkRatio > 0.30 &&
                acceptModalDarkRatio < 0.34 &&
                acceptButtonBlueRatio > 0.070 &&
                acceptButtonBlueRatio < 0.080 &&
                acceptButtonDarkRatio > 0.085 &&
                acceptButtonDarkRatio < 0.11 &&
                transitionCenterGoldRatio > 0.030 &&
                transitionCenterGoldRatio < 0.040 &&
                transitionCenterDarkRatio > 0.27 &&
                transitionCenterDarkRatio < 0.30 &&
                queueStatusDarkRatio > 0.48 &&
                queueStatusDarkRatio < 0.52 &&
                queueCancelDarkRatio > 0.23 &&
                queueCancelDarkRatio < 0.26 &&
                gameOverRowsDarkRatio > 0.32 &&
                gameOverRowsDarkRatio < 0.35 &&
                gameOverResultWatchDarkRatio > 0.20 &&
                gameOverResultWatchDarkRatio < 0.23 &&
                gameOverResultTitleDarkRatio > 0.62 &&
                gameOverResultTitleDarkRatio < 0.66 &&
                augmentCardPurpleRatio > 0.31 &&
                augmentCardPurpleRatio < 0.34 &&
                augmentCardDarkRatio > 0.18 &&
                augmentCardDarkRatio < 0.20 &&
                augmentRerollBlueRatio > 0.06 &&
                augmentRerollBlueRatio < 0.08 &&
                progressDarkRatio > 0.72 &&
                progressDarkRatio < 0.74 &&
                modeSelectBlueRatio > 0.08 &&
                modeSelectBlueRatio < 0.09
            ) ||
            (
                liveHudGoldSignalRatio > 0.075 &&
                liveHudGoldSignalRatio < 0.095 &&
                liveHudScoreSignalRatio > 0.060 &&
                liveHudScoreSignalRatio < 0.075 &&
                lobbyStartBlueRatio > 0.14 &&
                lobbyStartBlueRatio < 0.18 &&
                lobbyStartDarkRatio > 0.20 &&
                lobbyStartDarkRatio < 0.24 &&
                queueStatusGoldRatio > 0.025 &&
                queueStatusGoldRatio < 0.040 &&
                queueStatusDarkRatio > 0.18 &&
                queueStatusDarkRatio < 0.22 &&
                queueCancelDarkRatio > 0.20 &&
                queueCancelDarkRatio < 0.25 &&
                acceptModalDarkRatio > 0.23 &&
                acceptModalDarkRatio < 0.27 &&
                transitionCenterDarkRatio > 0.27 &&
                transitionCenterDarkRatio < 0.31 &&
                augmentCardPurpleRatio > 0.22 &&
                augmentCardPurpleRatio < 0.25 &&
                augmentCardDarkRatio > 0.40 &&
                augmentCardDarkRatio < 0.43 &&
                progressDarkRatio > 0.26 &&
                progressDarkRatio < 0.30
            ) ||
            (
                liveHudGoldSignalRatio < 0.005 &&
                liveHudScoreSignalRatio > 0.030 &&
                liveHudScoreSignalRatio < 0.040 &&
                lobbyStartBlueRatio < 0.005 &&
                acceptModalDarkRatio > 0.34 &&
                acceptModalDarkRatio < 0.38 &&
                transitionCenterDarkRatio > 0.30 &&
                transitionCenterDarkRatio < 0.35 &&
                queueStatusGoldRatio > 0.030 &&
                queueStatusGoldRatio < 0.040 &&
                queueStatusDarkRatio > 0.48 &&
                queueStatusDarkRatio < 0.53 &&
                queueCancelDarkRatio > 0.21 &&
                queueCancelDarkRatio < 0.24 &&
                gameOverRowsDarkRatio > 0.37 &&
                gameOverRowsDarkRatio < 0.42 &&
                gameOverResultWatchDarkRatio > 0.20 &&
                gameOverResultWatchDarkRatio < 0.24 &&
                augmentCardPurpleRatio > 0.30 &&
                augmentCardPurpleRatio < 0.34 &&
                progressDarkRatio > 0.68 &&
                progressDarkRatio < 0.73
            )
        )
    ) {
        state = "IN_GAME_TRANSITION";
    } else if (
        gameOverReplayBlueRatio > 0.06 &&
        gameOverReplayGoldRatio < 0.08 &&
        gameOverRowsDarkRatio > 0.35 &&
        gameOverRowsDarkRatio < 0.55 &&
        acceptModalDarkRatio < 0.50 &&
        transitionCenterDarkRatio > 0.30 &&
        lobbyStartBlueRatio < 0.18 &&
        progressDarkRatio > 0.52
    ) {
        state = "GAME_OVER";
        gameOverExitPoint = GAME_OVER_SCOREBOARD_EXIT_ACTION_POINT;
    } else if (
        hasLiveContentHudSignal
    ) {
        state = "LIVE_CONTENT";
    }

    return {
        state,
        brightBlueRatio,
        blueDominantRatio,
        brightWhiteRatio,
        liveHudGoldSignalRatio,
        liveHudScoreSignalRatio,
        lobbyStartBlueRatio,
        lobbyStartDarkRatio,
        queueStatusGoldRatio,
        queueStatusDarkRatio,
        queueCancelDarkRatio,
        acceptModalDarkRatio,
        acceptButtonBlueRatio,
        acceptButtonDarkRatio,
        transitionCenterGoldRatio,
        transitionCenterDarkRatio,
        sideMenuDarkRatio,
        sideMenuGoldRatio,
        sideDismissDarkRatio,
        roomBackGoldRatio,
        roomBackDarkRatio,
        modeSelectGoldRatio,
        modeSelectBlueRatio,
        modeSelectDarkRatio,
        gameOverReplayBlueRatio,
        gameOverRowsDarkRatio,
        gameOverResultExitBlueRatio,
        gameOverResultWatchDarkRatio,
        gameOverResultTitleBlueRatio,
        gameOverResultTitleDarkRatio,
        augmentCardPurpleRatio,
        augmentCardDarkRatio,
        augmentRerollGoldRatio,
        augmentRerollBlueRatio,
        augmentChoiceVisible,
        augmentChoicePoint,
        frontendVariant,
        lobbyVariant,
        confirmModalVariant,
        primaryActionPoint,
        startQueuePoint,
        selectGameModePoint,
        confirmModalPoint,
        cancelQueuePoint,
        acceptReadyPoint,
        gameOverExitPoint,
        dismissOverlayPoint,
        leaveRoomPoint,
        loginSecondaryGoldRatio,
        frontendRetryRedRatio,
        progressDarkRatio,
    };
}
