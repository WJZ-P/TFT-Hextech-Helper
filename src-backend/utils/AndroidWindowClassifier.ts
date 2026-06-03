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
export type AndroidLobbyVariant = "DEFAULT" | "ROOM" | "SIDE_MENU_OPEN";
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
const ENCOUNTER_CHOICE_LEFT_POINT: SimplePoint = { x: 0.35, y: 0.54 };

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
    const isGameOverScoreboard =
        gameOverReplayBlueRatio > 0.06 &&
        gameOverRowsDarkRatio > 0.30 &&
        gameOverRowsDarkRatio < 0.55 &&
        acceptModalDarkRatio < 0.50 &&
        transitionCenterDarkRatio > 0.30 &&
        lobbyStartBlueRatio < 0.70 &&
        progressDarkRatio > 0.50;
    const standardAugmentChoiceVisible =
        augmentCardPurpleRatio > 0.15 &&
        augmentCardDarkRatio > 0.30 &&
        augmentRerollGoldRatio > 0.04 &&
        augmentRerollBlueRatio < 0.03;
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
    const encounterChoiceVisible = brightEncounterChoiceVisible || darkEncounterChoiceVisible;
    const augmentChoiceVisible = standardAugmentChoiceVisible || encounterChoiceVisible;
    if (encounterChoiceVisible) {
        augmentChoicePoint = ENCOUNTER_CHOICE_LEFT_POINT;
    }

    const hasStrongLiveHudSignal =
        (liveHudGoldSignalRatio > 0.30 && progressDarkRatio < 0.10) ||
        liveHudScoreSignalRatio > 0.10;
    const hasLiveContentHudSignal =
        (
            liveHudGoldSignalRatio > 0.18 &&
            liveHudScoreSignalRatio > 0.05 &&
            progressDarkRatio < 0.20
        ) ||
        liveHudScoreSignalRatio > 0.10 ||
        (
            liveHudGoldSignalRatio > 0.10 &&
            lobbyStartBlueRatio < 0.20 &&
            acceptModalDarkRatio > 0.60 &&
            transitionCenterDarkRatio > 0.60
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
        );

    if (brightBlueRatio > 0.18 && !hasStrongLiveHudSignal) {
        state = "BLUESTACKS_BOOT";
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
    } else if (isGameOverScoreboard) {
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
    } else if (isGameOverResultModal) {
        state = "GAME_OVER";
        gameOverExitPoint = GAME_OVER_RESULT_EXIT_ACTION_POINT;
    } else if (
        (transitionCenterGoldRatio > 0.10 && transitionCenterDarkRatio < 0.12) ||
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
