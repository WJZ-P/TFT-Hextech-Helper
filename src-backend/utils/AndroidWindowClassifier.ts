import sharp from "sharp";
import type { SimplePoint } from "../TFTProtocol";

export type AndroidWindowScreenState = "BLUESTACKS_BOOT" | "TFT_FRONTEND" | "LIVE_CONTENT" | "UNKNOWN";
export type AndroidFrontendVariant = "UPDATE_READY" | "LOGIN_REQUIRED";

export interface AndroidWindowClassification {
    state: AndroidWindowScreenState;
    brightBlueRatio: number;
    blueDominantRatio: number;
    brightWhiteRatio: number;
    liveHudGoldSignalRatio?: number;
    liveHudScoreSignalRatio?: number;
    frontendVariant?: AndroidFrontendVariant;
    primaryActionPoint?: SimplePoint;
    loginSecondaryGoldRatio?: number;
    progressDarkRatio?: number;
}

const UPDATE_PRIMARY_ACTION_POINT: SimplePoint = { x: 0.5, y: 0.545 };

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

    let blueDominant = 0;
    let brightBlue = 0;
    let brightWhite = 0;
    let loginSecondaryGold = 0;
    let progressDark = 0;
    let liveHudGoldSignal = 0;
    let liveHudScoreSignal = 0;

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
    const liveHudGoldPixelCount = Math.max(1, liveHudGoldBuffer.info.width * liveHudGoldBuffer.info.height);
    const liveHudScorePixelCount = Math.max(1, liveHudScoreBuffer.info.width * liveHudScoreBuffer.info.height);
    const blueDominantRatio = blueDominant / pixelCount;
    const brightBlueRatio = brightBlue / pixelCount;
    const brightWhiteRatio = brightWhite / whitePixelCount;
    const loginSecondaryGoldRatio = loginSecondaryGold / loginSecondaryPixelCount;
    const progressDarkRatio = progressDark / progressPixelCount;
    const liveHudGoldSignalRatio = liveHudGoldSignal / liveHudGoldPixelCount;
    const liveHudScoreSignalRatio = liveHudScoreSignal / liveHudScorePixelCount;

    let state: AndroidWindowScreenState = "UNKNOWN";
    let frontendVariant: AndroidFrontendVariant | undefined;
    let primaryActionPoint: SimplePoint | undefined;

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
        frontendVariant,
        primaryActionPoint,
        loginSecondaryGoldRatio,
        progressDarkRatio,
    };
}
