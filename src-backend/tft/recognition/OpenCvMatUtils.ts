import type * as OpencvType from "@techstark/opencv-js";

type MatWithOptionalChannels = OpencvType.Mat & {
    channels?: (() => number) | number;
    type?: (() => number) | number;
    convertTo?: unknown;
    data?: Uint8Array | Uint8ClampedArray;
};

type OpenCvSizeConstructor = new(width: number, height: number) => OpencvType.Size;
type OpenCvSizeFactory = (width: number, height: number) => OpencvType.Size;
type OpenCvModuleWithOptionalSize = {
    Size?: unknown;
};
type OpenCvModuleWithOptionalResize = OpenCvModuleWithOptionalSize & {
    resize?: unknown;
};

/**
 * OpenCV.js builds and test doubles do not expose Mat#channels consistently.
 * Prefer the native method, then infer from data shape before falling back.
 */
export function getMatChannels(mat: OpencvType.Mat): number {
    const maybeMat = mat as MatWithOptionalChannels;
    const nativeChannels = maybeMat.channels;
    if (typeof nativeChannels === "function") {
        return nativeChannels.call(mat);
    }
    if (typeof nativeChannels === "number" && nativeChannels > 0) {
        return nativeChannels;
    }

    const pixelCount = Math.max(0, mat.rows) * Math.max(0, mat.cols);
    const dataLength = maybeMat.data?.length ?? 0;
    if (pixelCount > 0 && dataLength > 0) {
        const inferred = Math.round(dataLength / pixelCount);
        if (inferred === 1 || inferred === 3 || inferred === 4) {
            return inferred;
        }
    }

    const typeValue = typeof maybeMat.type === "function" ? maybeMat.type.call(mat) : maybeMat.type;
    if (typeof typeValue === "number" && typeValue >= 0) {
        const openCvChannels = ((typeValue >> 3) & 63) + 1;
        if (openCvChannels === 1 || openCvChannels === 3 || openCvChannels === 4) {
            return openCvChannels;
        }
    }

    return 4;
}

export function getMatType(mat: OpencvType.Mat): number {
    const maybeMat = mat as MatWithOptionalChannels;
    const nativeType = maybeMat.type;
    if (typeof nativeType === "function") {
        return nativeType.call(mat);
    }
    if (typeof nativeType === "number" && nativeType >= 0) {
        return nativeType;
    }

    return getMatChannels(mat);
}

export function createOpenCvSize(
    cvModule: OpenCvModuleWithOptionalSize,
    width: number,
    height: number
): OpencvType.Size {
    const Size = cvModule.Size;
    if (typeof Size === "function") {
        try {
            return new (Size as OpenCvSizeConstructor)(width, height);
        } catch {
            return (Size as OpenCvSizeFactory)(width, height);
        }
    }

    return { width, height } as OpencvType.Size;
}

export function resizeOpenCvMat(
    cvModule: OpenCvModuleWithOptionalResize,
    source: OpencvType.Mat,
    destination: OpencvType.Mat,
    width: number,
    height: number,
    interpolation: number
): boolean {
    if (typeof cvModule.resize !== "function") {
        return false;
    }

    cvModule.resize(
        source,
        destination,
        createOpenCvSize(cvModule, width, height),
        0,
        0,
        interpolation
    );
    return true;
}

export function convertOpenCvMatType(
    source: OpencvType.Mat,
    destination: OpencvType.Mat,
    targetType: number
): boolean {
    const convertTo = (source as MatWithOptionalChannels).convertTo;
    if (typeof convertTo !== "function") {
        return false;
    }

    convertTo.call(source, destination, targetType);
    return true;
}
