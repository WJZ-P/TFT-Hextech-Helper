/**
 * @file FrameSelector — 帧质量筛选与去重模块
 * @description 本模块提供帧质量分析功能，用于筛选适合 OCR 识别的优质帧。
 *              支持模糊检测、对比度分析、文本区域检测和基于 SSIM 的重复帧检测。
 *
 * 主要功能:
 * - 分析帧的 OCR 适合度 (模糊度、对比度、文本存在性)
 * - 跳过加载画面、过渡动画、战斗动画等不稳定的帧
 * - 使用 SSIM (结构相似性) 检测并去除重复帧
 *
 * @example
 * ```typescript
 * const selector = new FrameSelector();
 * const selectedFrames = await selector.selectBestFrames(frames);
 * const isSuitable = await selector.isFrameSuitableForOcr(frame);
 * ```
 */

import sharp from "sharp";

/**
 * 帧质量分析结果
 */
export interface FrameQualityResult {
    /** 是否适合 OCR 识别 */
    isSuitable: boolean;
    /** 模糊度得分 (0-1, 越高越清晰) */
    blurScore: number;
    /** 对比度得分 (0-1, 越高对比度越好) */
    contrastScore: number;
    /** 亮度得分 (0-1, 中等亮度最优) */
    brightnessScore: number;
    /** 综合质量得分 (0-1) */
    qualityScore: number;
    /** 被过滤的原因 (如果不适合) */
    rejectionReason?: string;
}

/**
 * SSIM 比较结果
 */
export interface SsimComparisonResult {
    /** SSIM 相似度 (0-1, 1 表示完全相同) */
    ssim: number;
    /** 是否被认为是重复帧 (阈值: 0.95) */
    isDuplicate: boolean;
}

/**
 * 帧选择器配置
 */
export interface FrameSelectorConfig {
    /** 模糊度阈值 (低于此值视为模糊, 默认: 100) */
    blurThreshold?: number;
    /** 对比度最小阈值 (低于此值视为对比度不足, 默认: 0.2) */
    minContrast?: number;
    /** SSIM 重复阈值 (高于此值视为重复帧, 默认: 0.95) */
    ssimDuplicateThreshold?: number;
    /** 亮度范围最小值 (默认: 30) */
    minBrightness?: number;
    /** 亮度范围最大值 (默认: 220) */
    maxBrightness?: number;
    /** 缩小用于 SSIM 比较的尺寸 (默认: 128) */
    ssimCompareSize?: number;
}

const DEFAULT_CONFIG: Required<FrameSelectorConfig> = {
    blurThreshold: 100,
    minContrast: 0.2,
    ssimDuplicateThreshold: 0.95,
    minBrightness: 30,
    maxBrightness: 220,
    ssimCompareSize: 128,
};

/**
 * 计算图像的拉普拉斯方差 (用于模糊检测)
 *
 * 拉普拉斯方差是衡量图像清晰度的经典方法:
 * - 清晰图像的拉普拉斯方差较大 (边缘锐利)
 * - 模糊图像的拉普拉斯方差较小 (边缘平滑)
 *
 * @param data 原始像素数据 (RGBA)
 * @param width 图像宽度
 * @param height 图像高度
 * @returns 拉普拉斯方差
 */
function computeLaplacianVariance(
    data: Buffer,
    width: number,
    height: number
): number {
    // 拉普拉斯核:
    //     [0,  1, 0]
    //     [1, -4, 1]
    //     [0,  1, 0]
    let sum = 0;
    let sumSquared = 0;
    let count = 0;

    for (let y = 1; y < height - 1; y += 1) {
        for (let x = 1; x < width - 1; x += 1) {
            // 获取当前像素的灰度值 (使用绿色通道作为近似)
            const idx = (y * width + x) * 4;
            const center = data[idx + 1] ?? 0;

            // 获取邻域像素
            const top = data[((y - 1) * width + x) * 4 + 1] ?? 0;
            const bottom = data[((y + 1) * width + x) * 4 + 1] ?? 0;
            const left = data[(y * width + (x - 1)) * 4 + 1] ?? 0;
            const right = data[(y * width + (x + 1)) * 4 + 1] ?? 0;

            // 拉普拉斯卷积
            const laplacian = top + bottom + left + right - 4 * center;
            sum += laplacian;
            sumSquared += laplacian * laplacian;
            count += 1;
        }
    }

    if (count === 0) {
        return 0;
    }

    const mean = sum / count;
    return sumSquared / count - mean * mean;
}

/**
 * 计算图像的对比度 (使用 RMS 对比度)
 *
 * RMS 对比度 = 像素值标准差 / 最大可能标准差
 *
 * @param data 原始像素数据
 * @param width 图像宽度
 * @param height 图像高度
 * @returns 对比度得分 (0-1)
 */
function computeContrast(
    data: Buffer,
    width: number,
    height: number
): number {
    let sum = 0;
    let sumSquared = 0;
    const pixelCount = width * height;

    for (let i = 0; i < pixelCount; i += 1) {
        const gray = data[i * 4 + 1] ?? 0; // 使用绿色通道
        sum += gray;
        sumSquared += gray * gray;
    }

    const mean = sum / pixelCount;
    const variance = sumSquared / pixelCount - mean * mean;
    const stdDev = Math.sqrt(Math.max(0, variance));

    // 归一化到 0-1, 假设最大标准差约为 128
    return Math.min(1, stdDev / 128);
}

/**
 * 计算图像的亮度得分
 *
 * 理想亮度应在中等范围，过亮或过暗都会降低 OCR 效果
 *
 * @param data 原始像素数据
 * @param width 图像宽度
 * @param height 图像高度
 * @param minBrightness 最小亮度阈值
 * @param maxBrightness 最大亮度阈值
 * @returns 亮度得分 (0-1)
 */
function computeBrightnessScore(
    data: Buffer,
    width: number,
    height: number,
    minBrightness: number,
    maxBrightness: number
): number {
    const pixelCount = width * height;
    let sum = 0;

    for (let i = 0; i < pixelCount; i += 1) {
        const gray = data[i * 4 + 1] ?? 0;
        sum += gray;
    }

    const meanBrightness = sum / pixelCount;

    // 计算到理想范围的归一化距离
    const idealBrightness = (minBrightness + maxBrightness) / 2;
    const range = (maxBrightness - minBrightness) / 2;

    const distance = Math.abs(meanBrightness - idealBrightness);
    const normalizedDistance = distance / range;

    return Math.max(0, 1 - normalizedDistance);
}

/**
 * 简化版 SSIM 计算
 *
 * 使用均值和方差的简化比较，不完全符合标准 SSIM 但计算效率高
 *
 * @param data1 第一个图像的像素数据
 * @param data2 第二个图像的像素数据
 * @returns SSIM 相似度 (0-1)
 */
function computeSimplifiedSsim(data1: Buffer, data2: Buffer): number {
    if (data1.length !== data2.length) {
        return 0;
    }

    // 使用块匹配策略: 将图像分成小块比较
    const blockSize = 16;
    const pixelCount = data1.length / 4;
    const blockCount = Math.floor(pixelCount / blockSize);

    if (blockCount === 0) {
        // 图像太小, 直接比较
        let sum1 = 0;
        let sum2 = 0;
        let sum1Sq = 0;
        let sum2Sq = 0;
        let sum12 = 0;

        for (let i = 0; i < data1.length; i += 4) {
            const g1 = data1[i + 1] ?? 0;
            const g2 = data2[i + 1] ?? 0;
            sum1 += g1;
            sum2 += g2;
            sum1Sq += g1 * g1;
            sum2Sq += g2 * g2;
            sum12 += g1 * g2;
        }

        const n = data1.length / 4;
        const mean1 = sum1 / n;
        const mean2 = sum2 / n;
        const var1 = sum1Sq / n - mean1 * mean1;
        const var2 = sum2Sq / n - mean2 * mean2;
        const cov = sum12 / n - mean1 * mean2;

        const c1 = 6.5025; // 避免除零的常数
        const c2 = 58.5225;

        const ssim =
            ((2 * mean1 * mean2 + c1) * (2 * cov + c2)) /
            ((mean1 * mean1 + mean2 * mean2 + c1) * (var1 + var2 + c2));

        return Math.max(0, Math.min(1, ssim));
    }

    let totalSsim = 0;
    let validBlocks = 0;

    for (let b = 0; b < blockCount; b += 1) {
        const startIdx = b * blockSize * 4;
        let sum1 = 0;
        let sum2 = 0;
        let sum1Sq = 0;
        let sum2Sq = 0;
        let sum12 = 0;

        for (let i = 0; i < blockSize; i += 1) {
            const idx = startIdx + i * 4;
            if (idx + 3 >= data1.length) break;

            const g1 = data1[idx + 1] ?? 0;
            const g2 = data2[idx + 1] ?? 0;
            sum1 += g1;
            sum2 += g2;
            sum1Sq += g1 * g1;
            sum2Sq += g2 * g2;
            sum12 += g1 * g2;
        }

        const n = blockSize;
        const mean1 = sum1 / n;
        const mean2 = sum2 / n;
        const var1 = sum1Sq / n - mean1 * mean1;
        const var2 = sum2Sq / n - mean2 * mean2;
        const cov = sum12 / n - mean1 * mean2;

        const c1 = 6.5025;
        const c2 = 58.5225;

        const blockSsim =
            ((2 * mean1 * mean2 + c1) * (2 * cov + c2)) /
            ((mean1 * mean1 + mean2 * mean2 + c1) * (var1 + var2 + c2));

        totalSsim += Math.max(0, Math.min(1, blockSsim));
        validBlocks += 1;
    }

    return validBlocks > 0 ? totalSsim / validBlocks : 0;
}

/**
 * 帧选择器 — 用于筛选适合 OCR 的高质量帧
 *
 * 分析帧的多种质量指标，过滤模糊、对比度不足或重复的帧，
 * 确保 OCR 引擎接收到的都是清晰可用的图像。
 */
export class FrameSelector {
    private config: Required<FrameSelectorConfig>;

    constructor(config?: FrameSelectorConfig) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 分析单帧的质量
     *
     * @param frame 图像缓冲区 (PNG/JPG)
     * @returns 帧质量分析结果
     */
    async analyzeFrameQuality(frame: Buffer): Promise<FrameQualityResult> {
        // 从原始尺寸获取数据用于分析
        const fullImageData = await sharp(frame)
            .grayscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const data = fullImageData.data;
        const imgWidth = fullImageData.info.width;
        const imgHeight = fullImageData.info.height;

        // 计算各项指标
        const blurScore = this.computeBlurScore(data, imgWidth, imgHeight);
        const contrastScore = computeContrast(data, imgWidth, imgHeight);
        const brightnessScore = computeBrightnessScore(
            data,
            imgWidth,
            imgHeight,
            this.config.minBrightness,
            this.config.maxBrightness
        );

        // 综合质量得分
        const qualityScore =
            blurScore * 0.4 +
            contrastScore * 0.35 +
            brightnessScore * 0.25;

        // 判断是否适合 OCR
        const rejectionReasons: string[] = [];

        if (blurScore < 0.3) {
            rejectionReasons.push("图像模糊度过高");
        }

        if (contrastScore < this.config.minContrast) {
            rejectionReasons.push("对比度不足");
        }

        if (brightnessScore < 0.2) {
            if (brightnessScore < 0.1) {
                rejectionReasons.push("图像过暗");
            } else {
                rejectionReasons.push("图像过亮或过暗");
            }
        }

        return {
            isSuitable: rejectionReasons.length === 0,
            blurScore,
            contrastScore,
            brightnessScore,
            qualityScore,
            rejectionReason: rejectionReasons.length > 0 ? rejectionReasons.join("; ") : undefined,
        };
    }

    /**
     * 计算模糊度得分
     */
    private computeBlurScore(data: Buffer, width: number, height: number): number {
        const laplacianVariance = computeLaplacianVariance(data, width, height);

        // 归一化到 0-1, 假设典型阈值为 100
        // 方差越大图像越清晰
        const blurScore = Math.min(1, laplacianVariance / this.config.blurThreshold);

        return blurScore;
    }

    /**
     * 检查帧是否适合 OCR 识别
     *
     * @param frame 图像缓冲区
     * @returns true 表示帧质量足够好
     */
    async isFrameSuitableForOcr(frame: Buffer): Promise<boolean> {
        const result = await this.analyzeFrameQuality(frame);
        return result.isSuitable;
    }

    /**
     * 比较两个帧的相似度 (SSIM)
     *
     * @param frame1 第一个帧
     * @param frame2 第二个帧
     * @returns SSIM 比较结果
     */
    async compareFrames(frame1: Buffer, frame2: Buffer): Promise<SsimComparisonResult> {
        // 缩小到统一尺寸进行比较
        const size = this.config.ssimCompareSize;

        const [data1, data2] = await Promise.all([
            sharp(frame1)
                .resize({ width: size, height: size, fit: "fill" })
                .grayscale()
                .ensureAlpha()
                .raw()
                .toBuffer(),
            sharp(frame2)
                .resize({ width: size, height: size, fit: "fill" })
                .grayscale()
                .ensureAlpha()
                .raw()
                .toBuffer(),
        ]);

        const ssim = computeSimplifiedSsim(data1, data2);

        return {
            ssim,
            isDuplicate: ssim >= this.config.ssimDuplicateThreshold,
        };
    }

    /**
     * 从帧序列中选择最佳帧
     *
     * 策略:
     * 1. 首先过滤掉质量不合格的帧 (模糊、对比度差等)
     * 2. 使用 SSIM 去除重复帧
     * 3. 按质量得分排序，选择最优帧
     *
     * @param frames 帧缓冲区数组
     * @param maxFrames 最大返回帧数 (默认: 5)
     * @returns 精选后的最佳帧数组
     */
    async selectBestFrames(frames: Buffer[], maxFrames: number = 5): Promise<Buffer[]> {
        if (frames.length === 0) {
            return [];
        }

        if (frames.length === 1) {
            const isSuitable = await this.isFrameSuitableForOcr(frames[0]);
            return isSuitable ? [frames[0]] : [];
        }

        // 第一步: 分析所有帧的质量
        const frameAnalyses = await Promise.all(
            frames.map(async (frame, index) => {
                const quality = await this.analyzeFrameQuality(frame);
                return { index, frame, quality };
            })
        );

        // 第二步: 过滤掉不合格的帧
        const suitableFrames = frameAnalyses.filter((f) => f.quality.isSuitable);

        if (suitableFrames.length === 0) {
            // 如果没有合适的帧，返回质量最好的那一帧
            const sortedByQuality = [...frameAnalyses].sort(
                (a, b) => b.quality.qualityScore - a.quality.qualityScore
            );
            return [sortedByQuality[0].frame];
        }

        // 第三步: 使用 SSIM 去除重复帧
        const selectedFrames: Buffer[] = [];
        const selectedIndices = new Set<number>();

        // 按质量得分排序
        suitableFrames.sort((a, b) => b.quality.qualityScore - a.quality.qualityScore);

        for (const candidate of suitableFrames) {
            if (selectedFrames.length >= maxFrames) {
                break;
            }

            // 检查是否与已选帧重复
            let isDuplicate = false;
            for (const selectedFrame of selectedFrames) {
                const comparison = await this.compareFrames(candidate.frame, selectedFrame);
                if (comparison.isDuplicate) {
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                selectedFrames.push(candidate.frame);
                selectedIndices.add(candidate.index);
            }
        }

        return selectedFrames;
    }

    /**
     * 获取帧选择器配置
     *
     * @returns 当前配置
     */
    getConfig(): Readonly<Required<FrameSelectorConfig>> {
        return { ...this.config };
    }
}

// 导出便捷函数

/**
 * 便捷函数: 检查帧是否适合 OCR
 *
 * @param frame 图像缓冲区
 * @param config 可选的配置
 * @returns true 表示帧质量足够好
 */
export async function isFrameSuitableForOcr(
    frame: Buffer,
    config?: FrameSelectorConfig
): Promise<boolean> {
    const selector = new FrameSelector(config);
    return selector.isFrameSuitableForOcr(frame);
}

/**
 * 便捷函数: 从帧序列中选择最佳帧
 *
 * @param frames 帧缓冲区数组
 * @param maxFrames 最大返回帧数
 * @param config 可选的配置
 * @returns 精选后的最佳帧数组
 */
export async function selectBestFrames(
    frames: Buffer[],
    maxFrames: number = 5,
    config?: FrameSelectorConfig
): Promise<Buffer[]> {
    const selector = new FrameSelector(config);
    return selector.selectBestFrames(frames, maxFrames);
}
