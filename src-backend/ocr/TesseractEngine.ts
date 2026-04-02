/**
 * @file Tesseract OCR 引擎适配器 — 实现 IOcrEngine 接口的 Tesseract.js 实现
 * @description 本模块提供符合统一 OCR 引擎接口的 Tesseract 实现，支持：
 *              - 多语言识别 (eng/chi_sim 等)
 *              - 字符白名单过滤
 *              - 置信度归一化
 *              - 健康状态监控
 *
 * @example
 * ```typescript
 * // 使用默认英文配置
 * const engine = new TesseractEngine();
 * await engine.initialize();
 * const result = await engine.recognize(imageBuffer);
 *
 * // 使用中文配置
 * const chineseEngine = new TesseractEngine("chi_sim");
 * await chineseEngine.initialize();
 * const result = await chineseEngine.recognize(imageBuffer, {
 *     charWhitelist: "王者荣耀"
 * });
 * ```
 */

import { createWorker, PSM } from "tesseract.js";
import path from "path";
import type {
    IOcrEngine,
    OcrResult,
    RecognitionOptions,
    EngineInfo,
    EngineHealthStatus,
} from "./IOcrEngine";
import { ConfidenceNormalizer } from "./ConfidenceNormalizer";
import { logger } from "../utils/Logger";

/** Tesseract 引擎配置选项 */
export interface TesseractEngineOptions {
    /** 识别的语言包 (默认: "eng") */
    language?: string;
    /** OEM 模式: 1=LSTM_ONLY (快), 3=DEFAULT (全引擎) */
    oemMode?: 1 | 3;
    /** 语言包路径 */
    langPath?: string;
    /** 缓存路径 */
    cachePath?: string;
}

/** 默认配置 */
const DEFAULT_OPTIONS: Required<TesseractEngineOptions> = {
    language: "eng",
    oemMode: 3,
    langPath: path.join(process.env.VITE_PUBLIC || ".", "resources/tessdata"),
    cachePath: path.join(process.env.VITE_PUBLIC || ".", "resources/tessdata"),
};

/**
 * Tesseract OCR 引擎
 *
 * 实现 IOcrEngine 接口的 Tesseract.js 适配器，提供统一的 OCR 识别能力。
 * 支持多语言、字符白名单、置信度归一化和健康监控。
 */
export class TesseractEngine implements IOcrEngine {
    /** 引擎名称 */
    readonly name = "tesseract";

    /** 引擎选项 */
    private readonly options: Required<TesseractEngineOptions>;

    /** Tesseract Worker 实例 */
    private worker: Tesseract.Worker | null = null;

    /** 置信度归一化器 */
    private readonly normalizer: ConfidenceNormalizer;

    /** 健康状态追踪 */
    private healthStatus: EngineHealthStatus = {
        initialized: false,
        busy: false,
        recognitionCount: 0,
        failureCount: 0,
        averageProcessingTimeMs: 0,
        lastRecognitionAt: undefined,
        lastError: undefined,
    };

    /** 总处理时间累计 (用于计算平均值) */
    private totalProcessingTimeMs = 0;

    /**
     * 创建 TesseractEngine 实例
     * @param options 引擎配置选项
     */
    constructor(options: TesseractEngineOptions = {}) {
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.normalizer = new ConfidenceNormalizer();
        logger.info(`[TesseractEngine] 创建引擎实例，语言: ${this.options.language}`);
    }

    /**
     * 初始化 Tesseract Worker
     * @description 加载语言包并准备 OCR 环境
     * @throws 如果 Worker 初始化失败
     */
    public async initialize(): Promise<void> {
        if (this.worker) {
            logger.debug("[TesseractEngine] Worker 已存在，跳过初始化");
            return;
        }

        logger.info(`[TesseractEngine] 正在初始化 Worker，语言: ${this.options.language}...`);

        try {
            this.worker = await createWorker(this.options.language, this.options.oemMode, {
                langPath: this.options.langPath,
                cachePath: this.options.cachePath,
            });

            this.healthStatus.initialized = true;
            logger.info(`[TesseractEngine] Worker 初始化完成`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error(`[TesseractEngine] Worker 初始化失败: ${message}`);
            this.healthStatus.lastError = message;
            throw error;
        }
    }

    /**
     * 执行 OCR 识别
     * @param imageBuffer 图片缓冲区 (PNG/JPG)
     * @param options 识别选项
     * @returns 识别结果
     * @throws 如果引擎未初始化或识别失败
     */
    public async recognize(imageBuffer: Buffer, options?: RecognitionOptions): Promise<OcrResult> {
        // 检查初始化状态
        if (!this.worker) {
            throw new Error("[TesseractEngine] 引擎未初始化，请先调用 initialize()");
        }

        // 标记为忙碌状态
        this.healthStatus.busy = true;

        const startTime = Date.now();

        try {
            // 应用字符白名单 (如果提供)
            if (options?.charWhitelist) {
                await this.worker.setParameters({
                    tessedit_char_whitelist: options.charWhitelist,
                });
            } else {
                // 重置白名单为空 (允许所有字符)
                await this.worker.setParameters({
                    tessedit_char_whitelist: "",
                });
            }

            // 设置页面分割模式
            await this.worker.setParameters({
                tessedit_pageseg_mode: PSM.SINGLE_LINE,
            });

            // 执行识别
            const result = await this.worker.recognize(imageBuffer);
            const processingTimeMs = Date.now() - startTime;

            // 提取识别文本
            const text = result.data.text.trim();

            // Tesseract 置信度范围是 0-100
            const rawConfidence = result.data.confidence;

            // 使用归一化器处理置信度
            const confidence = this.normalizer.normalize(rawConfidence, "tesseract", text);

            // 检查最小置信度阈值
            if (options?.minConfidence && confidence < options.minConfidence) {
                logger.debug(
                    `[TesseractEngine] 置信度 ${confidence.toFixed(3)} 低于阈值 ${options.minConfidence}，丢弃结果`
                );
                return {
                    text: "",
                    confidence: 0,
                    engine: this.name,
                    rawConfidence,
                    processingTimeMs,
                };
            }

            // 更新健康状态
            this.updateHealthMetrics(processingTimeMs, true);

            logger.debug(
                `[TesseractEngine] 识别完成: "${text}" (raw=${rawConfidence.toFixed(2)}, norm=${confidence.toFixed(3)}, ${processingTimeMs}ms)`
            );

            return {
                text,
                confidence,
                engine: this.name,
                rawConfidence,
                processingTimeMs,
            };
        } catch (error) {
            const processingTimeMs = Date.now() - startTime;
            const message = error instanceof Error ? error.message : String(error);

            // 更新健康状态
            this.healthStatus.failureCount++;
            this.healthStatus.lastError = message;
            this.healthStatus.busy = false;

            logger.error(`[TesseractEngine] 识别失败: ${message} (${processingTimeMs}ms)`);

            // 返回错误结果而非抛出异常
            return {
                text: "",
                confidence: 0,
                engine: this.name,
                rawConfidence: 0,
                processingTimeMs,
            };
        }
    }

    /**
     * 检查引擎是否可用
     * @returns true 表示引擎已初始化且可用
     */
    public isAvailable(): boolean {
        return this.healthStatus.initialized && this.worker !== null;
    }

    /**
     * 获取引擎信息
     * @returns 引擎元数据
     */
    public getEngineInfo(): EngineInfo {
        // Worker 类型可能没有 version 属性，使用类型断言访问
        const version = (this.worker as { version?: string } | null)?.version;
        return {
            name: this.name,
            version,
            languages: [this.options.language],
            type: "tesseract",
            requiresGpu: false,
            estimatedInitTimeMs: 2000, // Tesseract 初始化大约需要 2 秒
        };
    }

    /**
     * 销毁引擎，释放资源
     * @description 终止 Worker 并清理状态
     */
    public async destroy(): Promise<void> {
        logger.info("[TesseractEngine] 正在销毁 Worker...");

        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }

        this.healthStatus = {
            initialized: false,
            busy: false,
            recognitionCount: 0,
            failureCount: 0,
            averageProcessingTimeMs: 0,
            lastRecognitionAt: undefined,
            lastError: undefined,
        };

        this.totalProcessingTimeMs = 0;

        logger.info("[TesseractEngine] Worker 已销毁");
    }

    /**
     * 获取引擎健康状态
     * @returns 当前健康状态信息
     */
    public getHealthStatus(): EngineHealthStatus {
        return {
            ...this.healthStatus,
        };
    }

    /**
     * 更新健康指标
     * @param processingTimeMs 处理耗时
     * @param success 是否成功
     */
    private updateHealthMetrics(processingTimeMs: number, success: boolean): void {
        this.healthStatus.recognitionCount++;
        this.healthStatus.lastRecognitionAt = Date.now();
        this.healthStatus.busy = false;

        if (success) {
            // 计算滑动平均处理时间
            const count = this.healthStatus.recognitionCount;
            this.totalProcessingTimeMs += processingTimeMs;
            this.healthStatus.averageProcessingTimeMs =
                this.totalProcessingTimeMs / count;
        }
    }

    /**
     * 设置字符白名单 (快捷方法)
     * @description 在下次识别前设置字符白名单
     * @param whitelist 允许的字符集合
     */
    public async setWhitelist(whitelist: string): Promise<void> {
        if (!this.worker) {
            throw new Error("[TesseractEngine] 引擎未初始化");
        }

        await this.worker.setParameters({
            tessedit_char_whitelist: whitelist,
        });

        logger.debug(`[TesseractEngine] 设置白名单: ${whitelist}`);
    }

    /**
     * 重置字符白名单 (允许所有字符)
     */
    public async resetWhitelist(): Promise<void> {
        if (!this.worker) {
            throw new Error("[TesseractEngine] 引擎未初始化");
        }

        await this.worker.setParameters({
            tessedit_char_whitelist: "",
        });

        logger.debug("[TesseractEngine] 白名单已重置");
    }

    /**
     * 获取当前语言配置
     * @returns 当前使用的语言
     */
    public getLanguage(): string {
        return this.options.language;
    }
}
