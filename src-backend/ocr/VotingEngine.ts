/**
 * @file 多引擎投票表决器 — 融合多个 OCR 引擎的结果
 * @description 本模块实现了多引擎投票机制，通过融合 Tesseract 和 EasyOCR 的结果来提高识别准确率。
 *              支持三种投票策略: 多数表决、加权置信度、最佳单引擎。
 *
 * 投票策略:
 * - MAJORITY: 多数表决 — 选择超过半数引擎认可的结果
 * - WEIGHTED_CONFIDENCE: 加权置信度 — 基于归一化置信度加权投票
 * - BEST_SINGLE: 最佳单引擎 — 选择置信度最高的结果 (不做融合)
 *
 * @example
 * ```typescript
 * const votingEngine = new VotingEngine({
 *     engines: [tesseractEngine, easyOcrEngine],
 *     strategy: "WEIGHTED_CONFIDENCE",
 *     minAgreement: 0.6
 * });
 * await votingEngine.initialize();
 * const result = await votingEngine.recognize(imageBuffer);
 * ```
 */

import { logger } from "../utils/Logger";
import type {
    IOcrEngine,
    OcrResult,
    RecognitionOptions,
    EngineInfo,
    EngineHealthStatus,
} from "./IOcrEngine";
import { ConfidenceNormalizer } from "./ConfidenceNormalizer";

/**
 * 投票策略枚举
 */
export type VotingStrategy = "MAJORITY" | "WEIGHTED_CONFIDENCE" | "BEST_SINGLE";

/**
 * 投票引擎配置
 */
export interface VotingEngineConfig {
    /** 参与投票的 OCR 引擎列表 */
    engines: IOcrEngine[];
    /** 投票策略 (默认: WEIGHTED_CONFIDENCE) */
    strategy?: VotingStrategy;
    /** 最小一致性阈值 (0-1)，低于此值将返回低置信度警告 (默认: 0.6) */
    minAgreement?: number;
    /** 是否并行执行所有引擎 (默认: true) */
    parallel?: boolean;
    /** 单个引擎超时时间 (毫秒) (默认: 5000) */
    engineTimeoutMs?: number;
}

/**
 * 投票详细信息 — 包含每个引擎的结果
 */
export interface VotingDetails {
    /** 各引擎的识别结果 */
    engineResults: Array<{
        engine: string;
        result: OcrResult | null;
        error?: string;
    }>;
    /** 使用的投票策略 */
    strategy: VotingStrategy;
    /** 最终选出的引擎名称 */
    selectedEngine: string;
    /** 投票一致性 (0-1) */
    agreement: number;
}

/**
 * 扩展的识别结果 — 包含投票详情
 */
export interface VotingResult extends OcrResult {
    /** 投票详细信息 */
    votingDetails: VotingDetails;
    /** 是否达到最小一致性阈值 */
    isHighConfidence: boolean;
}

/**
 * 多引擎投票表决器
 *
 * 融合多个 OCR 引擎的结果，通过投票机制提高识别准确率。
 */
export class VotingEngine implements IOcrEngine {
    readonly name = "voting";
    private engines: IOcrEngine[] = [];
    private strategy: VotingStrategy;
    private minAgreement: number;
    private parallel: boolean;
    private engineTimeoutMs: number;
    private normalizer: ConfidenceNormalizer;

    /** 健康状态追踪 */
    private health: EngineHealthStatus = {
        initialized: false,
        busy: false,
        recognitionCount: 0,
        failureCount: 0,
        averageProcessingTimeMs: 0,
    };

    constructor(config: VotingEngineConfig) {
        this.engines = config.engines;
        this.strategy = config.strategy ?? "WEIGHTED_CONFIDENCE";
        this.minAgreement = config.minAgreement ?? 0.6;
        this.parallel = config.parallel ?? true;
        this.engineTimeoutMs = config.engineTimeoutMs ?? 5000;
        this.normalizer = new ConfidenceNormalizer();
    }

    /**
     * 初始化所有子引擎
     */
    async initialize(): Promise<void> {
        logger.info(`[VotingEngine] 初始化 ${this.engines.length} 个子引擎...`);

        const initPromises = this.engines.map(async (engine) => {
            try {
                await engine.initialize();
                logger.info(`[VotingEngine] ${engine.name} 初始化成功`);
            } catch (error) {
                logger.warn(
                    `[VotingEngine] ${engine.name} 初始化失败: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }
        });

        await Promise.all(initPromises);
        this.health.initialized = true;
        logger.info("[VotingEngine] 投票引擎初始化完成");
    }

    /**
     * 执行多引擎识别并投票
     */
    async recognize(imageBuffer: Buffer, options?: RecognitionOptions): Promise<VotingResult> {
        if (!this.health.initialized) {
            throw new Error("VotingEngine 未初始化，请先调用 initialize()");
        }

        this.health.busy = true;
        const startTime = Date.now();

        try {
            // 1. 收集所有引擎的结果
            const engineResults = await this.collectEngineResults(imageBuffer, options);

            // 2. 过滤出成功的结果
            const successfulResults = engineResults.filter((r) => r.result !== null);

            if (successfulResults.length === 0) {
                throw new Error("所有 OCR 引擎均失败");
            }

            // 3. 根据策略选择最终结果
            const selection = this.selectResult(successfulResults);

            // 4. 计算一致性
            const agreement = this.calculateAgreement(successfulResults, selection.text);

            // 5. 构建最终结果
            const processingTimeMs = Date.now() - startTime;
            const result: VotingResult = {
                text: selection.text,
                confidence: selection.confidence,
                regions: selection.regions,
                engine: `voting(${this.strategy})`,
                rawConfidence: selection.rawConfidence,
                processingTimeMs,
                votingDetails: {
                    engineResults,
                    strategy: this.strategy,
                    selectedEngine: selection.engine,
                    agreement,
                },
                isHighConfidence: agreement >= this.minAgreement,
            };

            // 6. 更新健康状态
            this.health.recognitionCount++;
            this.health.averageProcessingTimeMs =
                (this.health.averageProcessingTimeMs * (this.health.recognitionCount - 1) +
                    processingTimeMs) /
                this.health.recognitionCount;
            this.health.lastRecognitionAt = Date.now();

            return result;
        } catch (error) {
            this.health.failureCount++;
            this.health.lastError = error instanceof Error ? error.message : String(error);
            throw error;
        } finally {
            this.health.busy = false;
        }
    }

    /**
     * 收集所有引擎的识别结果
     */
    private async collectEngineResults(
        imageBuffer: Buffer,
        options?: RecognitionOptions
    ): Promise<VotingDetails["engineResults"]> {
        const results: VotingDetails["engineResults"] = [];

        if (this.parallel) {
            // 并行执行所有引擎
            const promises = this.engines.map(async (engine) => {
                try {
                    const result = await this.recognizeWithTimeout(engine, imageBuffer, options);
                    return { engine: engine.name, result };
                } catch (error) {
                    return {
                        engine: engine.name,
                        result: null,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            });

            const settled = await Promise.all(promises);
            results.push(...settled);
        } else {
            // 串行执行
            for (const engine of this.engines) {
                try {
                    const result = await this.recognizeWithTimeout(engine, imageBuffer, options);
                    results.push({ engine: engine.name, result });
                } catch (error) {
                    results.push({
                        engine: engine.name,
                        result: null,
                        error: error instanceof Error ? error.message : String(error),
                    });
                }
            }
        }

        return results;
    }

    /**
     * 带超时的识别
     */
    private async recognizeWithTimeout(
        engine: IOcrEngine,
        imageBuffer: Buffer,
        options?: RecognitionOptions
    ): Promise<OcrResult> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`${engine.name} 识别超时`)), this.engineTimeoutMs);
        });

        return Promise.race([engine.recognize(imageBuffer, options), timeoutPromise]);
    }

    /**
     * 根据策略选择最终结果
     */
    private selectResult(
        results: VotingDetails["engineResults"]
    ): OcrResult & { engine: string } {
        switch (this.strategy) {
            case "MAJORITY":
                return this.majorityVote(results);
            case "WEIGHTED_CONFIDENCE":
                return this.weightedConfidenceVote(results);
            case "BEST_SINGLE":
                return this.bestSingleVote(results);
            default:
                return this.weightedConfidenceVote(results);
        }
    }

    /**
     * 多数表决: 选择被超过半数引擎认可的结果
     */
    private majorityVote(
        results: VotingDetails["engineResults"]
    ): OcrResult & { engine: string } {
        const textCounts = new Map<string, { count: number; engines: string[]; result: OcrResult }>();

        for (const { engine, result } of results) {
            if (!result) continue;

            const normalizedText = result.text.trim().toLowerCase();
            const existing = textCounts.get(normalizedText);

            if (existing) {
                existing.count++;
                existing.engines.push(engine);
            } else {
                textCounts.set(normalizedText, { count: 1, engines: [engine], result });
            }
        }

        // 找到最多票数的结果
        let bestEntry: { count: number; engines: string[]; result: OcrResult } | null = null;
        for (const entry of textCounts.values()) {
            if (!bestEntry || entry.count > bestEntry.count) {
                bestEntry = entry;
            }
        }

        if (!bestEntry) {
            throw new Error("多数表决失败: 无有效结果");
        }

        return {
            ...bestEntry.result,
            engine: `majority(${bestEntry.engines.join(",")})`,
        };
    }

    /**
     * 加权置信度投票: 基于归一化置信度加权选择
     */
    private weightedConfidenceVote(
        results: VotingDetails["engineResults"]
    ): OcrResult & { engine: string } {
        // 按文本分组，计算加权平均置信度
        const textScores = new Map<string, { totalConfidence: number; count: number; result: OcrResult }>();

        for (const { result } of results) {
            if (!result) continue;

            const normalizedText = result.text.trim().toLowerCase();
            const normalizedConfidence = this.normalizer.normalize(
                result.rawConfidence ?? result.confidence,
                this.getEngineType(result.engine),
                result.text
            );

            const existing = textScores.get(normalizedText);
            if (existing) {
                existing.totalConfidence += normalizedConfidence;
                existing.count++;
            } else {
                textScores.set(normalizedText, {
                    totalConfidence: normalizedConfidence,
                    count: 1,
                    result,
                });
            }
        }

        // 找到加权置信度最高的结果
        let bestEntry: { totalConfidence: number; count: number; result: OcrResult } | null = null;
        let bestAvgConfidence = -1;

        for (const entry of textScores.values()) {
            const avgConfidence = entry.totalConfidence / entry.count;
            if (avgConfidence > bestAvgConfidence) {
                bestAvgConfidence = avgConfidence;
                bestEntry = entry;
            }
        }

        if (!bestEntry) {
            throw new Error("加权置信度投票失败: 无有效结果");
        }

        return {
            ...bestEntry.result,
            confidence: bestAvgConfidence,
            engine: "weighted_confidence",
        };
    }

    /**
     * 最佳单引擎: 选择置信度最高的结果
     */
    private bestSingleVote(
        results: VotingDetails["engineResults"]
    ): OcrResult & { engine: string } {
        let bestResult: OcrResult & { engine: string } | null = null;
        let bestConfidence = -1;

        for (const { engine, result } of results) {
            if (!result) continue;

            const normalizedConfidence = this.normalizer.normalize(
                result.rawConfidence ?? result.confidence,
                this.getEngineType(result.engine),
                result.text
            );

            if (normalizedConfidence > bestConfidence) {
                bestConfidence = normalizedConfidence;
                bestResult = {
                    ...result,
                    confidence: normalizedConfidence,
                    engine: `best_single(${engine})`,
                };
            }
        }

        if (!bestResult) {
            throw new Error("最佳单引擎选择失败: 无有效结果");
        }

        return bestResult;
    }

    /**
     * 计算投票一致性 (各引擎结果一致性的度量)
     */
    private calculateAgreement(
        results: VotingDetails["engineResults"],
        selectedText: string
    ): number {
        const normalizedSelected = selectedText.trim().toLowerCase();
        let matchCount = 0;

        for (const { result } of results) {
            if (result && result.text.trim().toLowerCase() === normalizedSelected) {
                matchCount++;
            }
        }

        return results.length > 0 ? matchCount / results.length : 0;
    }

    /**
     * 从引擎名称推断引擎类型
     */
    private getEngineType(engineName: string): "tesseract" | "easyocr" | "unknown" {
        const lower = engineName.toLowerCase();
        if (lower.includes("tesseract")) return "tesseract";
        if (lower.includes("easyocr")) return "easyocr";
        return "unknown";
    }

    /**
     * 检查是否有至少一个引擎可用
     */
    isAvailable(): boolean {
        return this.engines.some((engine) => engine.isAvailable());
    }

    /**
     * 获取引擎信息
     */
    getEngineInfo(): EngineInfo {
        return {
            name: "voting",
            languages: this.engines.flatMap((e) => e.getEngineInfo().languages),
            type: "custom",
            requiresGpu: this.engines.some((e) => e.getEngineInfo().requiresGpu),
            estimatedInitTimeMs: Math.max(...this.engines.map((e) => e.getEngineInfo().estimatedInitTimeMs)),
        };
    }

    /**
     * 获取健康状态
     */
    getHealthStatus(): EngineHealthStatus {
        return { ...this.health };
    }

    /**
     * 销毁所有子引擎
     */
    async destroy(): Promise<void> {
        logger.info("[VotingEngine] 销毁所有子引擎...");

        const destroyPromises = this.engines.map(async (engine) => {
            try {
                await engine.destroy();
            } catch (error) {
                logger.warn(
                    `[VotingEngine] ${engine.name} 销毁失败: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
            }
        });

        await Promise.all(destroyPromises);
        this.health.initialized = false;
        logger.info("[VotingEngine] 投票引擎已销毁");
    }

    /**
     * 获取子引擎列表
     */
    getEngines(): IOcrEngine[] {
        return [...this.engines];
    }

    /**
     * 动态添加引擎
     */
    addEngine(engine: IOcrEngine): void {
        this.engines.push(engine);
        logger.info(`[VotingEngine] 已添加引擎: ${engine.name}`);
    }

    /**
     * 动态移除引擎
     */
    removeEngine(engineName: string): boolean {
        const index = this.engines.findIndex((e) => e.name === engineName);
        if (index >= 0) {
            this.engines.splice(index, 1);
            logger.info(`[VotingEngine] 已移除引擎: ${engineName}`);
            return true;
        }
        return false;
    }
}
