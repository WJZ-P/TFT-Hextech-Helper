/**
 * @file 多引擎 OCR 服务 — 集成 Tesseract + EasyOCR 投票系统
 * @description 本模块扩展了现有 OcrService，添加多引擎投票支持。
 *              保持与现有 API 的向后兼容，同时提供增强的 OCR 准确率。
 *
 * 使用方式:
 * - 原有代码无需修改，继续使用 OcrService
 * - 新代码可使用 MultiEngineOcrService 获取投票结果
 * - 支持动态切换引擎配置
 */

import { logger } from "../../utils/Logger";
import { memoryMonitor } from "../../utils/MemoryMonitor";
import { TesseractEngine } from "../../ocr/TesseractEngine";
import { EasyOcrNodeAdapter } from "../../ocr/EasyOcrNodeAdapter";
import { VotingEngine } from "../../ocr/VotingEngine";
import type { OcrResult, RecognitionOptions, VotingResult } from "../../ocr";
import { validateStageProgression } from "../../ocr/StageValidator";
import { FrameSelector } from "../../ocr/FrameSelector";

/**
 * 多引擎 OCR 配置
 */
export interface MultiEngineConfig {
    /** 是否启用 EasyOCR 引擎 (默认: true) */
    enableEasyOcr?: boolean;
    /** 是否启用投票机制 (默认: true) */
    enableVoting?: boolean;
    /** 投票策略 (默认: WEIGHTED_CONFIDENCE) */
    votingStrategy?: "MAJORITY" | "WEIGHTED_CONFIDENCE" | "BEST_SINGLE";
    /** 最小一致性阈值 (默认: 0.6) */
    minAgreement?: number;
    /** 是否启用帧质量过滤 (默认: true) */
    enableFrameFiltering?: boolean;
    /** 是否启用阶段验证 (默认: true) */
    enableStageValidation?: boolean;
    /** 安卓阶段指示器 X 坐标 (默认: 380) */
    stageIndicatorX?: number;
}

/**
 * 识别结果扩展 — 包含投票详情
 */
export interface EnhancedOcrResult {
    /** 识别的文字 */
    text: string;
    /** 置信度 (0-1) */
    confidence: number;
    /** 使用的引擎 */
    engine: string;
    /** 是否通过投票验证 */
    isVotingVerified: boolean;
    /** 投票一致性 (0-1) */
    votingAgreement?: number;
    /** 是否通过阶段验证 */
    isStageValid?: boolean;
    /** 处理耗时 (毫秒) */
    processingTimeMs: number;
}

/**
 * 多引擎 OCR 服务
 *
 * 扩展现有 OcrService，添加多引擎投票支持。
 * 提供增强的 OCR 准确率，同时保持 API 简洁。
 */
export class MultiEngineOcrService {
    private static instance: MultiEngineOcrService;

    /** Tesseract 引擎 */
    private tesseractEngine: TesseractEngine | null = null;

    /** EasyOCR 引擎 */
    private easyOcrEngine: EasyOcrNodeAdapter | null = null;

    /** 投票引擎 */
    private votingEngine: VotingEngine | null = null;

    /** 帧选择器 */
    private frameSelector: FrameSelector | null = null;

    /** 配置 */
    private config: Required<MultiEngineConfig>;

    /** 是否已初始化 */
    private initialized = false;

    /** 上次识别的阶段 (用于验证连续性) */
    private lastStage: string | null = null;

    private constructor(config?: MultiEngineConfig) {
        this.config = {
            enableEasyOcr: config?.enableEasyOcr ?? true,
            enableVoting: config?.enableVoting ?? true,
            votingStrategy: config?.votingStrategy ?? "WEIGHTED_CONFIDENCE",
            minAgreement: config?.minAgreement ?? 0.6,
            enableFrameFiltering: config?.enableFrameFiltering ?? true,
            enableStageValidation: config?.enableStageValidation ?? true,
            stageIndicatorX: config?.stageIndicatorX ?? 380,
        };
    }

    /**
     * 获取单例实例
     */
    public static getInstance(config?: MultiEngineConfig): MultiEngineOcrService {
        if (!MultiEngineOcrService.instance) {
            MultiEngineOcrService.instance = new MultiEngineOcrService(config);
        }
        return MultiEngineOcrService.instance;
    }

    /**
     * 初始化所有引擎
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            logger.info("[MultiEngineOcrService] 已初始化，跳过");
            return;
        }

        logger.info("[MultiEngineOcrService] 初始化多引擎 OCR 服务...");

        // 1. 初始化 Tesseract 引擎
        this.tesseractEngine = new TesseractEngine({ language: "eng" });
        await this.tesseractEngine.initialize();
        logger.info("[MultiEngineOcrService] Tesseract 引擎就绪");

        // 2. 初始化 EasyOCR 引擎 (可选)
        if (this.config.enableEasyOcr) {
            try {
                this.easyOcrEngine = new EasyOcrNodeAdapter({
                    useGpu: false,
                });
                await this.easyOcrEngine.initialize();

                if (this.easyOcrEngine.isAvailable()) {
                    logger.info("[MultiEngineOcrService] EasyOCR 引擎就绪");
                } else {
                    logger.warn("[MultiEngineOcrService] EasyOCR 不可用，仅使用 Tesseract");
                    this.easyOcrEngine = null;
                }
            } catch (error) {
                logger.warn(
                    `[MultiEngineOcrService] EasyOCR 初始化失败: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );
                this.easyOcrEngine = null;
            }
        }

        // 3. 初始化投票引擎 (如果有两个引擎)
        if (this.config.enableVoting && this.easyOcrEngine) {
            this.votingEngine = new VotingEngine({
                engines: [this.tesseractEngine, this.easyOcrEngine],
                strategy: this.config.votingStrategy,
                minAgreement: this.config.minAgreement,
            });
            await this.votingEngine.initialize();
            logger.info("[MultiEngineOcrService] 投票引擎就绪");
        }

        // 4. 初始化帧选择器
        if (this.config.enableFrameFiltering) {
            this.frameSelector = new FrameSelector();
        }

        this.initialized = true;
        logger.info("[MultiEngineOcrService] 多引擎 OCR 服务初始化完成");
    }

    /**
     * 识别游戏阶段 (增强版，带投票验证)
     *
     * @param imageBuffer 图片缓冲区
     * @param options 识别选项
     * @returns 增强的识别结果
     */
    public async recognizeStage(imageBuffer: Buffer, options?: RecognitionOptions): Promise<EnhancedOcrResult> {
        const startTime = Date.now();

        if (!this.initialized) {
            throw new Error("MultiEngineOcrService 未初始化，请先调用 initialize()");
        }

        // 1. 帧质量检查 (可选)
        if (this.config.enableFrameFiltering && this.frameSelector) {
            const isSuitable = await this.frameSelector.isFrameSuitableForOcr(imageBuffer);
            if (!isSuitable) {
                return {
                    text: "",
                    confidence: 0,
                    engine: "filtered",
                    isVotingVerified: false,
                    isStageValid: false,
                    processingTimeMs: Date.now() - startTime,
                };
            }
        }

        // 2. 使用投票引擎或单引擎识别
        let result: OcrResult;
        let isVotingVerified = false;
        let votingAgreement: number | undefined;

        if (this.votingEngine) {
            const votingResult: VotingResult = await this.votingEngine.recognize(imageBuffer, {
                ...options,
                charWhitelist: "0123456789-",
                minConfidence: 0.3,
            });
            result = votingResult;
            isVotingVerified = votingResult.isHighConfidence;
            votingAgreement = votingResult.votingDetails.agreement;
        } else {
            // 仅使用 Tesseract
            result = await this.tesseractEngine!.recognize(imageBuffer, {
                ...options,
                charWhitelist: "0123456789-",
            });
        }

        // 3. 提取并验证阶段文本
        const stageText = this.extractStageText(result.text);

        // 4. 阶段连续性验证 (可选)
        let isStageValid = true;
        if (this.config.enableStageValidation && stageText) {
            isStageValid = validateStageProgression(stageText, this.lastStage);
            if (isStageValid) {
                this.lastStage = stageText;
            }
        }

        const processingTimeMs = Date.now() - startTime;

        // 记录处理时间
        memoryMonitor.sample(`ocr:multi_engine:${result.engine}`);

        return {
            text: stageText,
            confidence: result.confidence,
            engine: result.engine,
            isVotingVerified,
            votingAgreement,
            isStageValid,
            processingTimeMs,
        };
    }

    /**
     * 识别棋子名称 (使用 Tesseract)
     *
     * @param imageBuffer 图片缓冲区
     * @param chessData 棋子数据 (用于白名单)
     * @returns 识别的棋子名称
     */
    public async recognizeChessName(imageBuffer: Buffer, chessData?: Record<string, unknown>): Promise<EnhancedOcrResult> {
        const startTime = Date.now();

        if (!this.initialized) {
            throw new Error("MultiEngineOcrService 未初始化");
        }

        // 构建字符白名单
        let charWhitelist: string | undefined;
        if (chessData) {
            charWhitelist = [...new Set(Object.keys(chessData).join(""))].join("");
        }

        const result = await this.tesseractEngine!.recognize(imageBuffer, {
            charWhitelist,
            preprocessing: {
                grayscale: true,
                scale: 6,
            },
        });

        return {
            text: result.text,
            confidence: result.confidence,
            engine: result.engine,
            isVotingVerified: false,
            processingTimeMs: Date.now() - startTime,
        };
    }

    /**
     * 从 OCR 文本中提取阶段
     */
    private extractStageText(rawText: string): string {
        if (!rawText) return "";

        // 清理文本
        const normalized = rawText
            .replace(/[—–－]/g, "-")
            .replace(/\s+/g, "")
            .replace(/[^0-9-]/g, "");

        // 尝试匹配标准格式 (如 "2-1", "3-5")
        const match = normalized.match(/(\d)-(\d)/);
        if (match) {
            const stage = parseInt(match[1], 10);
            const round = parseInt(match[2], 10);

            // 验证阶段范围
            if (stage >= 1 && stage <= 7 && round >= 1 && round <= 7) {
                return `${stage}-${round}`;
            }
        }

        // 尝试从连续数字中提取
        const digits = normalized.replace(/-/g, "");
        for (let i = 0; i <= digits.length - 2; i++) {
            const stage = parseInt(digits[i], 10);
            const round = parseInt(digits[i + 1], 10);
            if (stage >= 1 && stage <= 7 && round >= 1 && round <= 7) {
                return `${stage}-${round}`;
            }
        }

        return "";
    }

    /**
     * 重置阶段追踪 (用于新游戏开始时)
     */
    public resetStageTracking(): void {
        this.lastStage = null;
        logger.info("[MultiEngineOcrService] 阶段追踪已重置");
    }

    /**
     * 获取服务状态
     */
    public getStatus(): {
        initialized: boolean;
        tesseractAvailable: boolean;
        easyOcrAvailable: boolean;
        votingEnabled: boolean;
        lastStage: string | null;
    } {
        return {
            initialized: this.initialized,
            tesseractAvailable: this.tesseractEngine?.isAvailable() ?? false,
            easyOcrAvailable: this.easyOcrEngine?.isAvailable() ?? false,
            votingEnabled: this.votingEngine !== null,
            lastStage: this.lastStage,
        };
    }

    /**
     * 销毁所有引擎
     */
    public async destroy(): Promise<void> {
        logger.info("[MultiEngineOcrService] 销毁多引擎 OCR 服务...");

        const destroyPromises: Promise<void>[] = [];

        if (this.votingEngine) {
            destroyPromises.push(this.votingEngine.destroy());
        }
        if (this.easyOcrEngine) {
            destroyPromises.push(this.easyOcrEngine.destroy());
        }
        if (this.tesseractEngine) {
            destroyPromises.push(this.tesseractEngine.destroy());
        }

        await Promise.all(destroyPromises);

        this.votingEngine = null;
        this.easyOcrEngine = null;
        this.tesseractEngine = null;
        this.initialized = false;
        this.lastStage = null;

        logger.info("[MultiEngineOcrService] 多引擎 OCR 服务已销毁");
    }
}

/** 多引擎 OCR 服务单例导出 */
export const multiEngineOcrService = MultiEngineOcrService.getInstance();
