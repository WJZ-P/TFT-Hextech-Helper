/**
 * @file Android TFT 预处理预设 — 针对 TFT 阶段指示器优化的图像预处理配置
 * @description 提供多组预设的预处理配置，专门针对 Android 端 TFT 阶段指示器的识别优化。
 *              每个预设包含缩放、灰度化、阈值、降噪等参数组合。
 */

import sharp from "sharp";

/**
 * 预处理预设配置
 */
export interface PreprocessPreset {
    /** 预设名称 */
    name: string;
    /** 描述 */
    description: string;
    /** 缩放因子 */
    scale: number;
    /** 是否灰度化 */
    grayscale: boolean;
    /** 阈值 (0-255, null 表示不应用阈值) */
    threshold: number | null;
    /** 是否应用锐化 */
    sharpen: boolean;
    /** 是否应用 normalize */
    normalize: boolean;
    /** 是否应用 CLAHE 近似 (通过 normalize 模拟) */
    clahe: boolean;
    /** 是否降噪 */
    denoise: boolean;
}

/**
 * 预定义的 Android TFT 预处理预设
 * 
 * 优化目标:
 * - 提高 EasyOCR 对 "X-Y" 格式阶段文本的识别准确率
 * - 适应不同模拟器和投屏的渲染差异
 * - 处理半透明、阴影、抗锯齿等视觉效果
 */
export const ANDROID_TFT_PRESETS: PreprocessPreset[] = [
    // === 基础预设 ===
    {
        name: "baseline",
        description: "基准预设 - 仅缩放和灰度化",
        scale: 6,
        grayscale: true,
        threshold: null,
        sharpen: false,
        normalize: false,
        clahe: false,
        denoise: false,
    },

    // === 阈值预设 (测试不同阈值) ===
    {
        name: "threshold-120",
        description: "低阈值 - 适合深色背景",
        scale: 6,
        grayscale: true,
        threshold: 120,
        sharpen: true,
        normalize: true,
        clahe: false,
        denoise: false,
    },
    {
        name: "threshold-140",
        description: "中低阈值 - 平衡模式",
        scale: 6,
        grayscale: true,
        threshold: 140,
        sharpen: true,
        normalize: true,
        clahe: false,
        denoise: false,
    },
    {
        name: "threshold-160",
        description: "中高阈值 - 适合浅色文字",
        scale: 6,
        grayscale: true,
        threshold: 160,
        sharpen: true,
        normalize: true,
        clahe: false,
        denoise: false,
    },
    {
        name: "threshold-180",
        description: "高阈值 - 适合高对比度",
        scale: 6,
        grayscale: true,
        threshold: 180,
        sharpen: true,
        normalize: true,
        clahe: false,
        denoise: false,
    },

    // === 高缩放预设 ===
    {
        name: "high-scale-8x",
        description: "高缩放 (8x) - 提升小字识别",
        scale: 8,
        grayscale: true,
        threshold: 140,
        sharpen: true,
        normalize: true,
        clahe: false,
        denoise: false,
    },
    {
        name: "high-scale-10x",
        description: "超高缩放 (10x) - 极小文字",
        scale: 10,
        grayscale: true,
        threshold: 140,
        sharpen: true,
        normalize: true,
        clahe: false,
        denoise: false,
    },

    // === 降噪预设 ===
    {
        name: "denoise-light",
        description: "轻度降噪 - 保留细节",
        scale: 6,
        grayscale: true,
        threshold: 140,
        sharpen: true,
        normalize: true,
        clahe: false,
        denoise: true,
    },

    // === 反转预设 (白字黑底 → 黑字白底) ===
    {
        name: "invert",
        description: "反转 - 适合白字场景",
        scale: 6,
        grayscale: true,
        threshold: 140,
        sharpen: true,
        normalize: true,
        clahe: false,
        denoise: false,
    },

    // === 推荐预设 ===
    {
        name: "recommended",
        description: "推荐预设 - 综合最佳表现",
        scale: 8,
        grayscale: true,
        threshold: 140,
        sharpen: true,
        normalize: true,
        clahe: true,
        denoise: true,
    },
];

/**
 * 根据名称获取预设
 */
export function getPreset(name: string): PreprocessPreset | undefined {
    return ANDROID_TFT_PRESETS.find((p) => p.name === name);
}

/**
 * 获取推荐预设
 */
export function getRecommendedPreset(): PreprocessPreset {
    return getPreset("recommended")!;
}

/**
 * 应用预设预处理到图片缓冲区
 */
export async function applyPreset(
    buffer: Buffer,
    preset: PreprocessPreset
): Promise<Buffer> {
    let pipeline = sharp(buffer);

    // 1. 缩放
    const metadata = await pipeline.metadata();
    const width = metadata.width ?? 1;
    pipeline = pipeline.resize({
        width: Math.max(1, Math.round(width * preset.scale)),
        kernel: "lanczos3",
    });

    // 2. 灰度化
    if (preset.grayscale) {
        pipeline = pipeline.grayscale();
    }

    // 3. Normalize (模拟 CLAHE)
    if (preset.normalize || preset.clahe) {
        pipeline = pipeline.normalize();
    }

    // 4. 阈值
    if (preset.threshold !== null) {
        pipeline = pipeline.threshold(preset.threshold);
    }

    // 5. 锐化
    if (preset.sharpen) {
        pipeline = pipeline.sharpen();
    }

    // 注意: sharp 不支持真正的降噪，需要外部库
    // denoise 会被忽略，但保留接口以便将来扩展

    return pipeline.png().toBuffer();
}

/**
 * 批量应用多个预设 (生成变体)
 */
export async function generatePresetVariants(
    buffer: Buffer,
    presetNames?: string[]
): Promise<Array<{ name: string; buffer: Buffer }>> {
    const names = presetNames ?? ANDROID_TFT_PRESETS.map((p) => p.name);
    const variants: Array<{ name: string; buffer: Buffer }> = [];

    for (const name of names) {
        const preset = getPreset(name);
        if (preset) {
            try {
                const processed = await applyPreset(buffer, preset);
                variants.push({ name, buffer: processed });
            } catch {
                // 跳过失败的预设
            }
        }
    }

    return variants;
}

/**
 * 通过测试确定最佳预设 (内部使用)
 */
export async function benchmarkPresets(
    buffer: Buffer,
    ocrFn: (buffer: Buffer) => Promise<{ text: string; confidence: number }>
): Promise<Array<{ name: string; text: string; confidence: number }>> {
    const results: Array<{ name: string; text: string; confidence: number }> = [];

    for (const preset of ANDROID_TFT_PRESETS) {
        try {
            const processed = await applyPreset(buffer, preset);
            const ocrResult = await ocrFn(processed);
            results.push({
                name: preset.name,
                text: ocrResult.text,
                confidence: ocrResult.confidence,
            });
        } catch {
            // 跳过失败的预设
        }
    }

    // 按置信度排序
    results.sort((a, b) => b.confidence - a.confidence);

    return results;
}
