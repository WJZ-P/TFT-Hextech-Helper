/**
 * @file 置信度归一化器 — 将不同 OCR 引擎的置信度统一到 0-1 范围
 * @description 不同 OCR 引擎使用不同的置信度计算方法和范围:
 *              - Tesseract: 0-100 (基于字符级置信度)
 *              - EasyOCR: 0-1 (直接提供归一化置信度)
 *              本模块将所有置信度归一化到 0-1 范围，方便跨引擎比较和投票。
 *
 * 归一化策略:
 * - Tesseract: 除以 100，并应用基于字符长度的校正因子
 * - EasyOCR: 直接使用 (0-1 范围)
 * - 通用校正: 应用非线性变换提升高置信度区域的区分度
 *
 * @example
 * ```typescript
 * const normalizer = new ConfidenceNormalizer();
 *
 * // Tesseract 置信度 (0-100)
 * const tesseractConf = normalizer.normalize(85, "tesseract", "2-1");
 *
 * // EasyOCR 置信度 (0-1)
 * const easyocrConf = normalizer.normalize(0.92, "easyocr", "2-1");
 * ```
 */

/**
 * 引擎类型枚举 — 用于选择归一化策略
 */
export type EngineType = "tesseract" | "easyocr" | "unknown";

/**
 * 归一化配置 — 自定义归一化行为
 */
export interface NormalizationConfig {
    /** 是否应用非线性校正 (默认: true) */
    applyNonlinearCorrection?: boolean;
    /** 是否应用长度校正 (默认: true) */
    applyLengthCorrection?: boolean;
    /** 最小置信度阈值低于此值的结果将被视为低质量 (默认: 0.3) */
    lowConfidenceThreshold?: number;
    /** 最大置信度阈值 (默认: 1.0) */
    maxConfidence?: number;
}

const DEFAULT_CONFIG: Required<NormalizationConfig> = {
    applyNonlinearCorrection: true,
    applyLengthCorrection: true,
    lowConfidenceThreshold: 0.3,
    maxConfidence: 1.0,
};

/**
 * 置信度归一化器
 *
 * 将不同 OCR 引擎的原始置信度归一化到 0-1 范围。
 * 支持 Tesseract (0-100) 和 EasyOCR (0-1) 两种格式。
 */
export class ConfidenceNormalizer {
    private config: Required<NormalizationConfig>;

    constructor(config?: NormalizationConfig) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * 归一化置信度到 0-1 范围
     *
     * @param rawConfidence 原始置信度 (Tesseract: 0-100, EasyOCR: 0-1)
     * @param engineType 引擎类型
     * @param recognizedText 识别的文字 (用于长度校正)
     * @returns 归一化后的置信度 (0-1)
     */
    public normalize(
        rawConfidence: number,
        engineType: EngineType = "unknown",
        recognizedText?: string
    ): number {
        // 1. 基础归一化: 将原始值转换到 0-1 范围
        let normalized = this.baseNormalize(rawConfidence, engineType);

        // 2. 非线性校正: 提升高置信度区域的区分度
        if (this.config.applyNonlinearCorrection) {
            normalized = this.applyNonlinearCorrection(normalized);
        }

        // 3. 长度校正: 较长的识别结果通常更可靠
        if (this.config.applyLengthCorrection && recognizedText) {
            normalized = this.applyLengthCorrection(normalized, recognizedText);
        }

        // 4. 边界检查: 确保在 0-1 范围内
        return Math.max(0, Math.min(this.config.maxConfidence, normalized));
    }

    /**
     * 批量归一化多个结果
     *
     * @param results 原始置信度数组
     * @param engineType 引擎类型
     * @returns 归一化后的置信度数组
     */
    public normalizeBatch(
        results: Array<{ confidence: number; text?: string }>,
        engineType: EngineType = "unknown"
    ): number[] {
        return results.map((r) => this.normalize(r.confidence, engineType, r.text));
    }

    /**
     * 基础归一化: 将原始置信度转换到 0-1 范围
     */
    private baseNormalize(rawConfidence: number, engineType: EngineType): number {
        switch (engineType) {
            case "tesseract":
                // Tesseract 使用 0-100 范围
                return Math.max(0, Math.min(100, rawConfidence)) / 100;

            case "easyocr":
                // EasyOCR 已经是 0-1 范围，但需要检查边界
                return Math.max(0, Math.min(1, rawConfidence));

            default:
                // 未知引擎: 假设已经是 0-1 范围，或需要归一化
                if (rawConfidence > 1) {
                    // 可能是 0-100 范围
                    return Math.max(0, Math.min(100, rawConfidence)) / 100;
                }
                return Math.max(0, Math.min(1, rawConfidence));
        }
    }

    /**
     * 非线性校正: 使用幂函数提升高置信度区域的区分度
     *
     * 原理: OCR 引擎在高置信度区域 (0.7-1.0) 的区分度较低，
     *       幂函数可以拉大高置信度区域的差距，使投票更有效。
     *
     * 公式: corrected = confidence ^ power
     * 其中 power > 1 会压缩低置信度区域，放大高置信度区域的差异
     */
    private applyNonlinearCorrection(confidence: number): number {
        // 使用 power = 1.5 进行温和的非线性校正
        // 这会压缩低置信度 (<0.5)，同时保持高置信度的区分度
        const power = 1.5;
        return Math.pow(confidence, power);
    }

    /**
     * 长度校正: 较长的识别结果通常更可靠
     *
     * 原理: 对于较短的识别结果 (如 "2-1")，OCR 的误差容忍度较低。
     *       对于较长的结果，即使置信度略低，也可能更准确。
     *
     * 实现: 对于短文本 (< 5 字符)，轻微提升置信度
     */
    private applyLengthCorrection(confidence: number, text: string): number {
        const length = text.trim().length;

        if (length < 3) {
            // 极短文本 (如 "2"): 降低置信度，因为容易误识别
            return confidence * 0.9;
        }

        if (length >= 3 && length <= 6) {
            // 中等长度文本 (如 "2-1", "3-5"): 保持置信度
            return confidence;
        }

        // 较长文本: 轻微提升置信度
        return Math.min(1, confidence * 1.05);
    }

    /**
     * 计算加权平均置信度 (用于投票引擎)
     *
     * @param results 多个引擎的识别结果
     * @returns 加权平均置信度
     */
    public static weightedAverage(
        results: Array<{ confidence: number; weight?: number }>
    ): number {
        if (results.length === 0) {
            return 0;
        }

        let totalWeight = 0;
        let weightedSum = 0;

        for (const result of results) {
            const weight = result.weight ?? 1;
            weightedSum += result.confidence * weight;
            totalWeight += weight;
        }

        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }

    /**
     * 计算置信度质量等级
     *
     * @param confidence 归一化后的置信度
     * @returns 质量等级
     */
    public static getQualityLevel(confidence: number): "high" | "medium" | "low" | "very_low" {
        if (confidence >= 0.9) return "high";
        if (confidence >= 0.7) return "medium";
        if (confidence >= 0.5) return "low";
        return "very_low";
    }

    /**
     * 检查置信度是否足够用于最终结果
     *
     * @param confidence 归一化后的置信度
     * @param threshold 阈值 (默认: 0.7)
     * @returns true 表示置信度足够高
     */
    public static isAcceptable(confidence: number, threshold: number = 0.7): boolean {
        return confidence >= threshold;
    }
}
