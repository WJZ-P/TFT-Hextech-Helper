import sharp from "sharp";
import type { SimplePoint } from "../TFTProtocol";

export type AndroidWindowScreenState =
    | "BLUESTACKS_BOOT"
    | "TFT_FRONTEND"
    | "LOBBY"
    | "QUEUE"
    | "ACCEPT_READY"
    | "IN_GAME_TRANSITION"
    | "LIVE_CONTENT"
    | "UNKNOWN";
export type AndroidFrontendVariant = "UPDATE_READY" | "LOGIN_REQUIRED";

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
    frontendVariant?: AndroidFrontendVariant;
    primaryActionPoint?: SimplePoint;
    startQueuePoint?: SimplePoint;
    cancelQueuePoint?: SimplePoint;
    acceptReadyPoint?: SimplePoint;
    loginSecondaryGoldRatio?: number;
    progressDarkRatio?: number;
}

const UPDATE_PRIMARY_ACTION_POINT: SimplePoint = { x: 0.5, y: 0.545 };
const START_QUEUE_ACTION_POINT: SimplePoint = { x: 0.84, y: 0.90 };
const CANCEL_QUEUE_ACTION_POINT: SimplePoint = { x: 0.83, y: 0.90 };
const ACCEPT_READY_ACTION_POINT: SimplePoint = { x: 0.51, y: 0.68 };

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

    let blueDominant = 0;
    let brightBlue = 0;
    let brightWhite = 0;
    let loginSecondaryGold = 0;
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
    const liveHudGoldPixelCount = Math.max(1, liveHudGoldBuffer.info.width * liveHudGoldBuffer.info.height);
    const liveHudScorePixelCount = Math.max(1, liveHudScoreBuffer.info.width * liveHudScoreBuffer.info.height);
    const blueDominantRatio = blueDominant / pixelCount;
    const brightBlueRatio = brightBlue / pixelCount;
    const brightWhiteRatio = brightWhite / whitePixelCount;
    const loginSecondaryGoldRatio = loginSecondaryGold / loginSecondaryPixelCount;
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
    const liveHudGoldSignalRatio = liveHudGoldSignal / liveHudGoldPixelCount;
    const liveHudScoreSignalRatio = liveHudScoreSignal / liveHudScorePixelCount;

    let state: AndroidWindowScreenState = "UNKNOWN";
    let frontendVariant: AndroidFrontendVariant | undefined;
    let primaryActionPoint: SimplePoint | undefined;
    let startQueuePoint: SimplePoint | undefined;
    let cancelQueuePoint: SimplePoint | undefined;
    let acceptReadyPoint: SimplePoint | undefined;

    if (brightBlueRatio > 0.18) {
        state = "BLUESTACKS_BOOT";
    } else if (brightWhiteRatio > 0.05) {
        state = "TFT_FRONTEND";
        if (loginSecondaryGoldRatio > 0.02 && progressDarkRatio > 0.08) {
            frontendVariant = "LOGIN_REQUIRED";
        } else {
            frontendVariant = "UPDATE_READY";
            primaryActionPoint = UPDATE_PRIMARY_ACTION_POINT;
        }
    } else if (acceptModalDarkRatio > 0.38 && acceptButtonBlueRatio > 0.04 && acceptButtonDarkRatio < 0.65) {
        state = "ACCEPT_READY";
        acceptReadyPoint = ACCEPT_READY_ACTION_POINT;
    } else if (queueCancelDarkRatio > 0.60 && queueStatusGoldRatio > 0.035 && queueStatusDarkRatio > 0.15 && queueStatusDarkRatio < 0.45) {
        state = "QUEUE";
        cancelQueuePoint = CANCEL_QUEUE_ACTION_POINT;
    } else if (lobbyStartBlueRatio > 0.30 && lobbyStartDarkRatio < 0.20) {
        state = "LOBBY";
        startQueuePoint = START_QUEUE_ACTION_POINT;
    } else if (
        (transitionCenterGoldRatio > 0.10 && transitionCenterDarkRatio < 0.12) ||
        (
            acceptButtonDarkRatio > 0.65 &&
            acceptButtonBlueRatio < 0.01 &&
            acceptModalDarkRatio > 0.40 &&
            transitionCenterGoldRatio > 0.03 &&
            transitionCenterDarkRatio > 0.65 &&
            progressDarkRatio > 0.90
        )
    ) {
        state = "IN_GAME_TRANSITION";
    } else if (liveHudGoldSignalRatio > 0.10 || liveHudScoreSignalRatio > 0.10) {
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
        frontendVariant,
        primaryActionPoint,
        startQueuePoint,
        cancelQueuePoint,
        acceptReadyPoint,
        loginSecondaryGoldRatio,
        progressDarkRatio,
    };
}
