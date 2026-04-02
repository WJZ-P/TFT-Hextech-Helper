/**
 * @file OCR 多引擎模块 — 导出所有 OCR 相关类型和工具
 * @description 本模块提供了统一的 OCR 引擎接口，支持 Tesseract 和 EasyOCR 的插件式集成。
 *
 * @example
 * ```typescript
 * import { IOcrEngine, TesseractEngine, ConfidenceNormalizer } from '../ocr';
 *
 * // 使用引擎
 * const engine = new TesseractEngine();
 * await engine.initialize();
 * const result = await engine.recognize(imageBuffer);
 *
 * // 使用归一化器
 * const normalizer = new ConfidenceNormalizer();
 * const normalizedConf = normalizer.normalize(result.rawConfidence, "tesseract");
 * ```
 */

// 核心接口
export type {
    IOcrEngine,
    OcrResult,
    OcrRegion,
    RecognitionOptions,
    EngineInfo,
    EngineHealthStatus,
    EngineFactory,
} from "./IOcrEngine";

// 工具类
export { ConfidenceNormalizer } from "./ConfidenceNormalizer";
export type { EngineType, NormalizationConfig } from "./ConfidenceNormalizer";

// 引擎实现
export { TesseractEngine } from "./TesseractEngine";
export type { TesseractEngineOptions } from "./TesseractEngine";

export { EasyOcrNodeAdapter, createEasyOcrAdapter } from "./EasyOcrNodeAdapter";
export type { EasyOcrNodeAdapterConfig } from "./EasyOcrNodeAdapter";

// 投票引擎
export { VotingEngine } from "./VotingEngine";
export type { VotingStrategy, VotingEngineConfig, VotingDetails, VotingResult } from "./VotingEngine";

// 帧选择器
export { FrameSelector } from "./FrameSelector";
export type { FrameQualityResult, SsimComparisonResult, FrameSelectorConfig } from "./FrameSelector";

// 阶段验证器 (函数集合，无类)
export {
    validateStageProgression,
    validateStageTransition,
    getValidNextStages,
    isValidStage,
    parseStage,
    compareStages,
    validateAndNormalizeStage,
    isRiskyStage,
    isEarlyGame,
    isLateGame,
} from "./StageValidator";
export type { StageInfo, StageTransitionResult } from "./StageValidator";

// 预处理管线
export { PreprocessPipeline } from "./PreprocessPipeline";
export type { PreprocessOptions, PreprocessVariant } from "./PreprocessPipeline";

// 多位置扫描器
export { MultiPositionScanner } from "./MultiPositionScanner";
export type { ScanPosition, ScanResult, MultiPositionScanConfig } from "./MultiPositionScanner";

// Android TFT 预处理预设
export {
    ANDROID_TFT_PRESETS,
    getPreset,
    getRecommendedPreset,
    applyPreset,
    generatePresetVariants,
    benchmarkPresets,
} from "./AndroidTftPresets";
export type { PreprocessPreset } from "./AndroidTftPresets";
