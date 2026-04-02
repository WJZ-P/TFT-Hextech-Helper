/**
 * @file PreprocessPipeline — 图像预处理流水线
 * @description 本模块提供多种图像预处理操作，用于提升 OCR 识别效果。
 *
 * 支持的预处理操作:
 * - CLAHE (对比度限制自适应直方图均衡化)
 * - 去噪 (高斯、均值、双边滤波)
 * - 锐化
 * - 阈值处理 (Otsu、自适应阈值)
 *
 * 设计原则:
 * - 所有操作都是无状态的，可以并行执行
 * - 支持多种预处理变体的批量生成
 * - 与 sharp 库深度集成
 *
 * @example
 * ```typescript
 * const pipeline = new PreprocessPipeline();
 * const processed = await pipeline.applyPreprocessingPipeline(buffer, { clahe: true });
 * const variants = await pipeline.generatePreprocessingVariants(buffer);
 * ```
 */

import sharp from "sharp";

/**
 * 预处理选项 — 控制各预处理操作的参数
 */
export interface PreprocessOptions {
    /** 是否使用 CLAHE 增强对比度 */
    clahe?: boolean;
    /** CLAHE 剪辑限制 (默认: 2) */
    claheClipLimit?: number;
    /** CLAHE 网格大小 (默认: 8) */
    claheTileGridSize?: number;
    /** 是否去噪 */
    denoise?: boolean;
    /** 去噪类型 */
    denoiseType?: "gaussian" | "median" | "bilateral";
    /** 去噪强度 (1-10, 默认: 3) */
    denoiseStrength?: number;
    /** 是否锐化 */
    sharpen?: boolean;
    /** 锐化 sigma (默认: 1) */
    sharpenSigma?: number;
    /** 锐化强度 (默认: 1) */
    sharpenAmount?: number;
    /** 是否应用阈值处理 */
    threshold?: boolean;
    /** 阈值类型 */
    thresholdType?: "otsu" | "adaptive" | "binary" | "inverse";
    /** 固定阈值 (0-255, 用于 binary/inverse) */
    thresholdValue?: number;
    /** 是否灰度化 */
    grayscale?: boolean;
    /** 是否归一化 */
    normalize?: boolean;
    /** 缩放因子 (默认: 1) */
    scale?: number;
    /** 输出格式 */
    outputFormat?: "png" | "jpeg";
}

/**
 * 预处理变体描述
 */
export interface PreprocessVariant {
    /** 变体标签 (如 "clahe+sharpen") */
    label: string;
    /** 处理后的图像缓冲区 */
    buffer: Buffer;
}

/**
 * 预处理流水线默认配置
 */
const DEFAULT_OPTIONS: Required<PreprocessOptions> = {
    clahe: false,
    claheClipLimit: 2,
    claheTileGridSize: 8,
    denoise: false,
    denoiseType: "gaussian",
    denoiseStrength: 3,
    sharpen: false,
    sharpenSigma: 1,
    sharpenAmount: 1,
    threshold: false,
    thresholdType: "otsu",
    thresholdValue: 128,
    grayscale: false,
    normalize: false,
    scale: 1,
    outputFormat: "png",
};

/**
 * 预处理流水线 — 组合多种图像处理操作
 */
export class PreprocessPipeline {
    /**
     * 应用预处理流水线
     *
     * @param buffer 输入图像缓冲区
     * @param options 预处理选项
     * @returns 处理后的图像缓冲区
     */
    async applyPreprocessingPipeline(
        buffer: Buffer,
        options: PreprocessOptions
    ): Promise<Buffer> {
        const opts = { ...DEFAULT_OPTIONS, ...options };

        // 获取图像元数据
        const metadata = await sharp(buffer).metadata();
        const originalWidth = metadata.width ?? 1;
        const originalHeight = metadata.height ?? 1;

        // 计算目标尺寸
        const targetWidth = Math.max(1, Math.round(originalWidth * opts.scale));
        const targetHeight = Math.max(1, Math.round(originalHeight * opts.scale));

        let pipeline = sharp(buffer);

        // 1. 缩放
        if (opts.scale !== 1) {
            pipeline = pipeline.resize({
                width: targetWidth,
                height: targetHeight,
                kernel: "lanczos3",
            });
        }

        // 2. 灰度化
        if (opts.grayscale) {
            pipeline = pipeline.grayscale();
        }

        // 3. CLAHE 增强 (通过 normalize 近似实现)
        // 注: sharp 不直接支持 CLAHE，这里使用 normalize + 对比度增强的组合来近似
        if (opts.clahe) {
            // 先进行归一化
            pipeline = pipeline.normalize();

            // 然后调整对比度 (模拟 CLAHE 的局部对比度增强效果)
            // 使用 linear 参数调整对比度
            const contrastFactor = 1 + (opts.claheClipLimit - 1) * 0.2;
            pipeline = pipeline.linear(contrastFactor, -(contrastFactor - 1) * 128);
        }

        // 4. 去噪 (使用 blur 近似)
        // 注: sharp 的 blur 可以减少高频噪声
        if (opts.denoise) {
            // blur sigma 与去噪强度相关
            const blurSigma = opts.denoiseStrength * 0.3;

            switch (opts.denoiseType) {
                case "gaussian":
                    pipeline = pipeline.blur(Math.min(blurSigma, 10));
                    break;

                case "median":
                    // median 滤波无法直接实现，使用多次 blur 近似
                    pipeline = pipeline.blur(0.5);
                    break;

                case "bilateral":
                    // 双边滤波需要专门实现，这里使用轻度 blur 近似
                    pipeline = pipeline.blur(0.3);
                    break;
            }
        }

        // 5. 归一化
        if (opts.normalize && !opts.clahe) {
            pipeline = pipeline.normalize();
        }

        // 6. 锐化
        if (opts.sharpen) {
            pipeline = pipeline.sharpen({
                sigma: opts.sharpenSigma,
                m1: opts.sharpenAmount * 0.5,
                m2: opts.sharpenAmount,
                x1: 2,
                y2: 10,
                y3: 20,
            });
        }

        // 7. 阈值处理
        if (opts.threshold) {
            pipeline = await this.applyThreshold(pipeline, opts);
        }

        // 8. 输出格式
        if (opts.outputFormat === "jpeg") {
            return pipeline.jpeg({ quality: 90 }).toBuffer();
        }

        return pipeline.png().toBuffer();
    }

    /**
     * 应用阈值处理
     *
     * @param pipeline sharp 处理流水线
     * @param opts 预处理选项
     * @returns 应用阈值后的流水线
     */
    private async applyThreshold(
        pipeline: sharp.Sharp,
        opts: Required<PreprocessOptions>
    ): Promise<sharp.Sharp> {
        // 先转为灰度 (如果还不是)
        const img = await pipeline.grayscale().raw().toBuffer({ resolveWithObject: true });

        // 获取像素数据
        const data = img.data;
        const width = img.info.width;
        const height = img.info.height;

        // 根据阈值类型计算
        let thresholdValue = opts.thresholdValue;

        // Otsu 自动阈值
        if (opts.thresholdType === "otsu") {
            thresholdValue = this.computeOtsuThreshold(data, width, height);
        }

        // 创建输出缓冲区
        const output = Buffer.alloc(data.length);

        for (let i = 0; i < data.length; i += 1) {
            const pixel = data[i] ?? 0;

            switch (opts.thresholdType) {
                case "otsu":
                case "binary":
                    output[i] = pixel >= thresholdValue ? 255 : 0;
                    break;

                case "inverse":
                    output[i] = pixel >= thresholdValue ? 0 : 255;
                    break;

                case "adaptive": {
                    // 自适应阈值: 使用局部均值
                    const localThreshold = this.computeLocalThreshold(data, width, height, i, width);
                    output[i] = pixel >= localThreshold ? 255 : 0;
                    break;
                }

                default:
                    output[i] = pixel;
            }
        }

        // 重新创建 sharp 实例
        return sharp(output, {
            raw: {
                width: width,
                height: height,
                channels: 1,
            },
        });
    }

    /**
     * 计算 Otsu 自动阈值
     *
     * Otsu 算法通过最大化类间方差来确定最佳阈值
     *
     * @param data 灰度像素数据
     * @param width 图像宽度
     * @param height 图像高度
     * @returns Otsu 阈值
     */
    private computeOtsuThreshold(data: Buffer, width: number, height: number): number {
        const histogram = new Array(256).fill(0);
        const pixelCount = width * height;

        // 计算直方图
        for (let i = 0; i < data.length; i += 1) {
            const value = data[i] ?? 0;
            histogram[value] += 1;
        }

        // 归一化直方图
        const normalizedHistogram = histogram.map((count) => count / pixelCount);

        // 计算 Otsu 阈值
        let sumTotal = 0;
        for (let i = 0; i < 256; i += 1) {
            sumTotal += i * normalizedHistogram[i];
        }

        let sumBg = 0;
        let weightBg = 0;
        let weightFg = 0;
        let maxVariance = 0;
        let threshold = 128;

        for (let t = 0; t < 256; t += 1) {
            weightBg += normalizedHistogram[t];
            sumBg += t * normalizedHistogram[t];

            if (weightBg === 0) continue;

            weightFg = 1 - weightBg;
            if (weightFg === 0) break;

            const meanBg = sumBg / weightBg;
            const meanFg = (sumTotal - sumBg) / weightFg;

            // 类间方差
            const variance = weightBg * weightFg * (meanBg - meanFg) * (meanBg - meanFg);

            if (variance > maxVariance) {
                maxVariance = variance;
                threshold = t;
            }
        }

        return threshold;
    }

    /**
     * 计算局部自适应阈值
     *
     * @param data 像素数据
     * @param width 图像宽度
     * @param height 图像高度
     * @param index 当前像素索引
     * @param rowWidth 行宽度
     * @returns 局部阈值
     */
    private computeLocalThreshold(
        data: Buffer,
        width: number,
        height: number,
        index: number,
        rowWidth: number
    ): number {
        const windowSize = 5;
        const halfWindow = Math.floor(windowSize / 2);

        const x = index % rowWidth;
        const y = Math.floor(index / rowWidth);

        let sum = 0;
        let count = 0;

        for (let dy = -halfWindow; dy <= halfWindow; dy += 1) {
            for (let dx = -halfWindow; dx <= halfWindow; dx += 1) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const neighborIndex = ny * rowWidth + nx;
                    sum += data[neighborIndex] ?? 0;
                    count += 1;
                }
            }
        }

        return count > 0 ? sum / count : 128;
    }

    /**
     * 生成多个预处理变体
     *
     * 用于 OCR 引擎投票: 同一图像的不同预处理版本可能产生不同的识别结果
     *
     * @param buffer 输入图像缓冲区
     * @returns 预处理变体数组
     */
    async generatePreprocessingVariants(
        buffer: Buffer
    ): Promise<PreprocessVariant[]> {
        const variants: PreprocessVariant[] = [];

        // 获取图像尺寸用于确定合适的缩放因子
        const metadata = await sharp(buffer).metadata();
        const baseScale = metadata.width && metadata.width < 200 ? 6 : 4;

        // 1. 原始图像
        variants.push({ label: "original", buffer });

        // 2. 灰度 + 归一化
        const grayNormalized = await this.applyPreprocessingPipeline(buffer, {
            grayscale: true,
            normalize: true,
            scale: baseScale,
        });
        variants.push({ label: "gray-normalize", buffer: grayNormalized });

        // 3. 灰度 + 归一化 + 不同阈值
        const thresholds = [100, 120, 130, 140, 150];
        for (const th of thresholds) {
            const variant = await this.applyPreprocessingPipeline(buffer, {
                grayscale: true,
                normalize: true,
                threshold: true,
                thresholdType: "binary",
                thresholdValue: th,
                scale: baseScale + 1,
                sharpen: true,
            });
            variants.push({ label: `threshold-${th}`, buffer: variant });
        }

        // 4. CLAHE 风格变体
        const claheVariant = await this.applyPreprocessingPipeline(buffer, {
            grayscale: true,
            clahe: true,
            claheClipLimit: 3,
            scale: baseScale,
            sharpen: true,
        });
        variants.push({ label: "clahe", buffer: claheVariant });

        // 5. 去噪 + 锐化
        const denoiseSharpVariant = await this.applyPreprocessingPipeline(buffer, {
            grayscale: true,
            denoise: true,
            denoiseType: "gaussian",
            denoiseStrength: 2,
            sharpen: true,
            scale: baseScale,
        });
        variants.push({ label: "denoise-sharp", buffer: denoiseSharpVariant });

        // 6. 自适应阈值
        const adaptiveVariant = await this.applyPreprocessingPipeline(buffer, {
            grayscale: true,
            normalize: true,
            threshold: true,
            thresholdType: "adaptive",
            scale: baseScale + 2,
        });
        variants.push({ label: "adaptive-threshold", buffer: adaptiveVariant });

        return variants;
    }

    /**
     * 生成阶段 OCR 专用的预处理变体
     *
     * 阶段文本通常较小，需要更高的缩放因子
     *
     * @param buffer 输入图像缓冲区
     * @returns 预处理变体数组
     */
    async generateStageOcrVariants(
        buffer: Buffer
    ): Promise<PreprocessVariant[]> {
        const variants: PreprocessVariant[] = [];

        // 阶段文本区域通常较小，需要高缩放
        const scale = 6;

        // 1. 原始
        variants.push({ label: "stage/raw", buffer });

        // 2. 灰度 + 归一化
        const grayNormalized = await this.applyPreprocessingPipeline(buffer, {
            grayscale: true,
            normalize: true,
            scale,
        });
        variants.push({ label: "stage/gray-normalize", buffer: grayNormalized });

        // 3. 不同阈值的灰度变体
        const thresholds = [100, 110, 120, 130, 140, 155];
        for (const th of thresholds) {
            const variant = await this.applyPreprocessingPipeline(buffer, {
                grayscale: true,
                normalize: true,
                threshold: true,
                thresholdType: "binary",
                thresholdValue: th,
                scale: scale + 1,
                sharpen: true,
            });
            variants.push({ label: `stage/threshold-${th}`, buffer: variant });
        }

        // 4. Otsu 自动阈值
        const otsuVariant = await this.applyPreprocessingPipeline(buffer, {
            grayscale: true,
            normalize: true,
            threshold: true,
            thresholdType: "otsu",
            scale: scale + 1,
            sharpen: true,
        });
        variants.push({ label: "stage/otsu", buffer: otsuVariant });

        return variants;
    }

    /**
     * 生成商店 OCR 专用的预处理变体
     *
     * @param buffer 输入图像缓冲区
     * @returns 预处理变体数组
     */
    async generateShopOcrVariants(
        buffer: Buffer
    ): Promise<PreprocessVariant[]> {
        const variants: PreprocessVariant[] = [];

        const scale = 8;

        // 1. 原始
        variants.push({ label: "shop/raw", buffer });

        // 2. 灰度 + 归一化
        const grayNormalized = await this.applyPreprocessingPipeline(buffer, {
            grayscale: true,
            normalize: true,
            scale,
        });
        variants.push({ label: "shop/gray-normalize", buffer: grayNormalized });

        // 3. 高阈值变体
        const thresholds = [140, 150, 160, 170];
        for (const th of thresholds) {
            const variant = await this.applyPreprocessingPipeline(buffer, {
                grayscale: true,
                normalize: true,
                threshold: true,
                thresholdType: "binary",
                thresholdValue: th,
                scale: scale + 1,
                sharpen: true,
            });
            variants.push({ label: `shop/threshold-${th}`, buffer: variant });
        }

        // 4. CLAHE
        const claheVariant = await this.applyPreprocessingPipeline(buffer, {
            grayscale: true,
            clahe: true,
            claheClipLimit: 2,
            scale,
            sharpen: true,
        });
        variants.push({ label: "shop/clahe", buffer: claheVariant });

        return variants;
    }
}

// 导出便捷函数

/**
 * 便捷函数: 应用预处理流水线
 *
 * @param buffer 输入图像缓冲区
 * @param options 预处理选项
 * @returns 处理后的图像缓冲区
 */
export async function applyPreprocessingPipeline(
    buffer: Buffer,
    options: PreprocessOptions
): Promise<Buffer> {
    const pipeline = new PreprocessPipeline();
    return pipeline.applyPreprocessingPipeline(buffer, options);
}

/**
 * 便捷函数: 生成预处理变体
 *
 * @param buffer 输入图像缓冲区
 * @returns 预处理变体数组
 */
export async function generatePreprocessingVariants(
    buffer: Buffer
): Promise<PreprocessVariant[]> {
    const pipeline = new PreprocessPipeline();
    return pipeline.generatePreprocessingVariants(buffer);
}

/**
 * 便捷函数: 生成阶段 OCR 变体
 *
 * @param buffer 输入图像缓冲区
 * @returns 预处理变体数组
 */
export async function generateStageOcrVariants(
    buffer: Buffer
): Promise<PreprocessVariant[]> {
    const pipeline = new PreprocessPipeline();
    return pipeline.generateStageOcrVariants(buffer);
}

/**
 * 便捷函数: 生成商店 OCR 变体
 *
 * @param buffer 输入图像缓冲区
 * @returns 预处理变体数组
 */
export async function generateShopOcrVariants(
    buffer: Buffer
): Promise<PreprocessVariant[]> {
    const pipeline = new PreprocessPipeline();
    return pipeline.generateShopOcrVariants(buffer);
}
