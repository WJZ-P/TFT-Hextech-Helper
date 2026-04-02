/**
 * @file 多位置扫描器 — 自动检测 Android 阶段指示器位置
 * @description Android 端的阶段指示器位置会因分辨率和模拟器而异。
 *              本模块通过在多个位置扫描并选择最佳结果来提高识别率。
 *
 * 扫描策略:
 * - 在预设的 X 坐标范围内进行多位置扫描
 * - 并行执行多个位置的 OCR
 * - 选择置信度最高的结果
 * - 使用 StageValidator 验证结果的有效性
 */

import { logger } from "../utils/Logger";
import { ConfidenceNormalizer } from "../ocr/ConfidenceNormalizer";
import { validateStageProgression } from "../ocr/StageValidator";
import type { IOcrEngine, OcrResult, RecognitionOptions } from "../ocr/IOcrEngine";

/**
 * 扫描位置配置
 */
export interface ScanPosition {
    /** X 坐标 */
    x: number;
    /** Y 坐标 (默认: 0) */
    y?: number;
    /** 宽度 (默认: 200) */
    width?: number;
    /** 高度 (默认: 60) */
    height?: number;
}

/**
 * 扫描结果
 */
export interface ScanResult {
    /** 识别的阶段文本 */
    text: string;
    /** 归一化置信度 (0-1) */
    confidence: number;
    /** 使用的扫描位置 */
    position: ScanPosition;
    /** 原始 OCR 结果 */
    rawResult: OcrResult;
    /** 是否通过阶段验证 */
    isValid: boolean;
}

/**
 * 多位置扫描配置
 */
export interface MultiPositionScanConfig {
    /** 扫描位置列表 (默认: Android 常见位置) */
    positions?: ScanPosition[];
    /** 是否并行扫描 (默认: true) */
    parallel?: boolean;
    /** 是否验证阶段连续性 (默认: true) */
    validateStage?: boolean;
    /** 上次识别的阶段 (用于验证) */
    lastStage?: string | null;
    /** 最小置信度阈值 (默认: 0.3) */
    minConfidence?: number;
}

/**
 * 默认的 Android 阶段指示器扫描位置
 * 覆盖常见的模拟器和投屏分辨率
 */
const DEFAULT_SCAN_POSITIONS: ScanPosition[] = [
    { x: 280, y: 0, width: 200, height: 60 },
    { x: 320, y: 0, width: 200, height: 60 },
    { x: 360, y: 0, width: 200, height: 60 },
    { x: 400, y: 0, width: 200, height: 60 },
    { x: 440, y: 0, width: 200, height: 60 },
];

/**
 * 多位置扫描器
 *
 * 在多个预设位置进行 OCR 扫描，选择最佳结果。
 * 适用于 Android 端阶段指示器位置不确定的情况。
 */
export class MultiPositionScanner {
    private config: Required<MultiPositionScanConfig>;
    private normalizer: ConfidenceNormalizer;
    private bestPosition: ScanPosition | null = null;

    constructor(config?: MultiPositionScanConfig) {
        this.config = {
            positions: config?.positions ?? DEFAULT_SCAN_POSITIONS,
            parallel: config?.parallel ?? true,
            validateStage: config?.validateStage ?? true,
            lastStage: config?.lastStage ?? null,
            minConfidence: config?.minConfidence ?? 0.3,
        };
        this.normalizer = new ConfidenceNormalizer();
    }

    /**
     * 执行多位置扫描
     *
     * @param engine OCR 引擎
     * @param imageBuffer 图片缓冲区
     * @param options 识别选项
     * @returns 扫描结果 (可能为 null 如果所有位置都失败)
     */
    public async scan(
        engine: IOcrEngine,
        imageBuffer: Buffer,
        options?: RecognitionOptions
    ): Promise<ScanResult | null> {
        const startTime = Date.now();

        let results: ScanResult[];

        if (this.config.parallel) {
            // 并行扫描
            results = await this.scanParallel(engine, imageBuffer, options);
        } else {
            // 串行扫描 (早期退出优化)
            results = await this.scanSerial(engine, imageBuffer, options);
        }

        // 选择最佳结果
        const bestResult = this.selectBestResult(results);

        if (bestResult) {
            // 记录最佳位置 (用于后续优化)
            this.bestPosition = bestResult.position;

            const elapsed = Date.now() - startTime;
            logger.debug(
                `[MultiPositionScanner] 最佳位置: x=${bestResult.position.x}, ` +
                `text="${bestResult.text}", confidence=${bestResult.confidence.toFixed(3)}, ` +
                `time=${elapsed}ms`
            );
        }

        return bestResult;
    }

    /**
     * 并行扫描所有位置
     */
    private async scanParallel(
        engine: IOcrEngine,
        imageBuffer: Buffer,
        options?: RecognitionOptions
    ): Promise<ScanResult[]> {
        const promises = this.config.positions.map(async (position) => {
            try {
                const roi = {
                    x: position.x,
                    y: position.y ?? 0,
                    width: position.width ?? 200,
                    height: position.height ?? 60,
                };

                const result = await engine.recognize(imageBuffer, {
                    ...options,
                    roi,
                });

                const stageText = this.extractStageText(result.text);
                const normalizedConfidence = this.normalizer.normalize(
                    result.rawConfidence ?? result.confidence,
                    this.getEngineType(engine.name),
                    result.text
                );

                const isValid = !this.config.validateStage || 
                    !stageText || 
                    validateStageProgression(stageText, this.config.lastStage);

                return {
                    text: stageText,
                    confidence: normalizedConfidence,
                    position,
                    rawResult: result,
                    isValid,
                } as ScanResult;
            } catch (error) {
                logger.debug(
                    `[MultiPositionScanner] 位置 x=${position.x} 扫描失败: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
                return null;
            }
        });

        const results = await Promise.all(promises);
        return results.filter((r): r is ScanResult => r !== null);
    }

    /**
     * 串行扫描 (支持早期退出)
     */
    private async scanSerial(
        engine: IOcrEngine,
        imageBuffer: Buffer,
        options?: RecognitionOptions
    ): Promise<ScanResult[]> {
        const results: ScanResult[] = [];
        const highConfidenceThreshold = 0.85;

        for (const position of this.config.positions) {
            try {
                const roi = {
                    x: position.x,
                    y: position.y ?? 0,
                    width: position.width ?? 200,
                    height: position.height ?? 60,
                };

                const result = await engine.recognize(imageBuffer, {
                    ...options,
                    roi,
                });

                const stageText = this.extractStageText(result.text);
                const normalizedConfidence = this.normalizer.normalize(
                    result.rawConfidence ?? result.confidence,
                    this.getEngineType(engine.name),
                    result.text
                );

                const isValid = !this.config.validateStage || 
                    !stageText || 
                    validateStageProgression(stageText, this.config.lastStage);

                results.push({
                    text: stageText,
                    confidence: normalizedConfidence,
                    position,
                    rawResult: result,
                    isValid,
                });

                // 早期退出: 如果找到高置信度且有效结果，跳过剩余位置
                if (stageText && isValid && normalizedConfidence >= highConfidenceThreshold) {
                    logger.debug(
                        `[MultiPositionScanner] 早期退出: x=${position.x}, ` +
                        `confidence=${normalizedConfidence.toFixed(3)}`
                    );
                    break;
                }
            } catch (error) {
                logger.debug(
                    `[MultiPositionScanner] 位置 x=${position.x} 扫描失败: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }
        }

        return results;
    }

    /**
     * 选择最佳扫描结果
     */
    private selectBestResult(results: ScanResult[]): ScanResult | null {
        if (results.length === 0) return null;

        // 过滤掉无效结果和低置信度结果
        const validResults = results.filter(
            (r) => r.text && r.isValid && r.confidence >= this.config.minConfidence
        );

        if (validResults.length === 0) {
            // 没有有效结果，返回置信度最高的 (即使无效)
            const highestConfidence = results.reduce((best, r) =>
                r.confidence > best.confidence ? r : best
            );
            return highestConfidence.text ? highestConfidence : null;
        }

        // 选择置信度最高的有效结果
        return validResults.reduce((best, r) =>
            r.confidence > best.confidence ? r : best
        );
    }

    /**
     * 从 OCR 文本中提取阶段
     */
    private extractStageText(rawText: string): string {
        if (!rawText) return "";

        const normalized = rawText
            .replace(/[—–－]/g, "-")
            .replace(/\s+/g, "")
            .replace(/[^0-9-]/g, "");

        const match = normalized.match(/(\d)-(\d)/);
        if (match) {
            const stage = parseInt(match[1], 10);
            const round = parseInt(match[2], 10);
            if (stage >= 1 && stage <= 7 && round >= 1 && round <= 7) {
                return `${stage}-${round}`;
            }
        }

        return "";
    }

    /**
     * 从引擎名称推断类型
     */
    private getEngineType(name: string): "tesseract" | "easyocr" | "unknown" {
        const lower = name.toLowerCase();
        if (lower.includes("tesseract")) return "tesseract";
        if (lower.includes("easyocr")) return "easyocr";
        return "unknown";
    }

    /**
     * 获取上次找到的最佳位置
     */
    public getBestPosition(): ScanPosition | null {
        return this.bestPosition;
    }

    /**
     * 设置上次识别的阶段 (用于验证)
     */
    public setLastStage(stage: string | null): void {
        this.config.lastStage = stage;
    }

    /**
     * 添加自定义扫描位置
     */
    public addPosition(position: ScanPosition): void {
        this.config.positions.push(position);
    }

    /**
     * 获取当前扫描位置列表
     */
    public getPositions(): ScanPosition[] {
        return [...this.config.positions];
    }
}
