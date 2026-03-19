import sharp from "sharp";

export type AndroidCaptureSurfaceState = "VISIBLE_CONTENT" | "BLACK_SURFACE" | "DIM_SURFACE";

export interface AndroidCaptureSurfaceDiagnostics {
    state: AndroidCaptureSurfaceState;
    meanBrightness: number;
    darkPixelRatio: number;
    nonBlackPixelRatio: number;
    brightPixelRatio: number;
    lumaStdDev: number;
    isUniform: boolean;
    blockerReason: string | null;
}

export async function analyzeAndroidCaptureSurface(screenshot: Buffer): Promise<AndroidCaptureSurfaceDiagnostics> {
    const { data, info } = await sharp(screenshot)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const pixels = Math.max(1, info.width * info.height);
    let darkPixels = 0;
    let nonBlackPixels = 0;
    let brightPixels = 0;
    let lumaSum = 0;
    let lumaSquaredSum = 0;

    for (let index = 0; index < data.length; index += info.channels) {
        const red = data[index] ?? 0;
        const green = data[index + 1] ?? 0;
        const blue = data[index + 2] ?? 0;
        const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
        lumaSum += luma;
        lumaSquaredSum += luma * luma;

        if (red < 16 && green < 16 && blue < 16) {
            darkPixels += 1;
        }
        if (red > 8 || green > 8 || blue > 8) {
            nonBlackPixels += 1;
        }
        if (luma > 180) {
            brightPixels += 1;
        }
    }

    const meanBrightness = lumaSum / pixels;
    const variance = Math.max(0, lumaSquaredSum / pixels - meanBrightness * meanBrightness);
    const lumaStdDev = Math.sqrt(variance);
    const darkPixelRatio = darkPixels / pixels;
    const nonBlackPixelRatio = nonBlackPixels / pixels;
    const brightPixelRatio = brightPixels / pixels;
    const isUniform = lumaStdDev < 3;

    if (darkPixelRatio > 0.985 && nonBlackPixelRatio < 0.01 && isUniform) {
        return {
            state: "BLACK_SURFACE",
            meanBrightness,
            darkPixelRatio,
            nonBlackPixelRatio,
            brightPixelRatio,
            lumaStdDev,
            isUniform,
            blockerReason: "Captured surface is effectively solid black; likely unrendered, obscured, or wrong render target",
        };
    }

    if (darkPixelRatio > 0.85 && meanBrightness < 40 && brightPixelRatio < 0.01) {
        return {
            state: "DIM_SURFACE",
            meanBrightness,
            darkPixelRatio,
            nonBlackPixelRatio,
            brightPixelRatio,
            lumaStdDev,
            isUniform,
            blockerReason: "Captured surface is abnormally dark; rendering may be unstable or target may be partially obscured",
        };
    }

    return {
        state: "VISIBLE_CONTENT",
        meanBrightness,
        darkPixelRatio,
        nonBlackPixelRatio,
        brightPixelRatio,
        lumaStdDev,
        isUniform,
        blockerReason: null,
    };
}
