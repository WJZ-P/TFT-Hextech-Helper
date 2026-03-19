/**
 * @file 识别模块统一导出
 * @description 导出所有识别相关的服务和工具
 */

export { OcrService, ocrService, OcrWorkerType } from "./OcrService";
export { OcrCorrectionService, ocrCorrectionService } from "./OcrCorrectionService";
export { BUILTIN_OCR_CORRECTIONS, mergeOcrCorrections } from "./OcrCorrectionCatalog";
export { TemplateLoader, templateLoader } from "./TemplateLoader";
export { TemplateMatcher, templateMatcher } from "./TemplateMatcher";
export { ScreenCapture, screenCapture } from "./ScreenCapture";
export * from "./RecognitionUtils";
