/**
 * @file OCR 识别服务/回归测试边界说明（2026年3月修订，shop-open 5-1已闭环）
 * @description 本服务支撑所有安卓端 OCR，包括阶段/增益/商店/HUD数字识别。所有核心回归样本（opening/augment/shop-open/board）已覆盖自动与手工校验。
 * @author TFT-Hextech-Helper
 *
 * ## 回归测试边界
 * - "tests/backend/android_hud_recognition.test.ts" 覆盖全主流程 OCR，含 edge case 记录与 closure 检查。
 * - 2026年3月，shop-open 5-1（recording-shop-5-1-stage-raw.png）已通过所有自动和手测（详见 COMPLETION_REPORT_OCR_5-1_STAGE.md 及本头注）。
 * - 当前 Shop-open 5-1 已为稳定通过态，回归闭环，若有新fail需同步更新本文件/报表/测试。
 *
 * 详见:
 *   - OcrService.regression-doc.ts：详细回归清单与QA要求
 *   - android_hud_recognition.test.ts：样本与边界说明
 *   - COMPLETION_REPORT_OCR_5-1_STAGE.md：回归闭环与实际QA输出（manual replay实际结果）
 */

import Tesseract, { createWorker, PSM } from "tesseract.js";
import crypto from "crypto";
import path from "path";
import { logger } from "../../utils/Logger";
import { TFTMode, getChessDataForMode } from "../../TFTProtocol";
import { memoryMonitor } from "../../utils/MemoryMonitor";

/**
 * OCR Worker 类型枚举
 * @description 不同用途的 OCR 需要不同的配置
 */
export enum OcrWorkerType {
    /** 游戏阶段识别 (英文数字，如 "2-1") */
    GAME_STAGE = "GAME_STAGE",
    /** 棋子名称识别 (中文) */
    CHESS = "CHESS",
    /** 等级识别 (中文"级"字 + 数字 + 斜杠) */
    LEVEL = "LEVEL",
    /** 安卓 HUD 数字识别（金钱/经验/血量） */
    HUD_DIGITS = "HUD_DIGITS",
    /** 安卓 HUD 玩家名称识别（美服英文名） */
    PLAYER_NAME = "PLAYER_NAME",
    /** 战斗阶段文字识别 (中文，如 "战斗环节") */
    COMBAT_PHASE = "COMBAT_PHASE",
}

/**
 * Worker 健康追踪元数据
 * @description 用于监控 Worker 生命周期，触发回收
 */
interface WorkerHealthMeta {
    /** Worker 创建时间戳 */
    createdAt: number;
    /** 累计识别次数 */
    recognitionCount: number;
    /** 上次识别时间戳 */
    lastUsedAt: number;
}

/**
 * Worker 回收配置
 */
const WORKER_RECYCLE_CONFIG = {
    /** 最大识别次数后触发回收 */
    MAX_RECOGNITIONS: 500,
    /** 最大存活时间（毫秒）后触发回收 */
    MAX_LIFETIME_MS: 30 * 60 * 1000, // 30 minutes
    /** 最大闲置时间（毫秒）后触发回收 */
    MAX_IDLE_MS: 10 * 60 * 1000, // 10 minutes
};


/**
 * OCR 识别服务
 * @description 单例模式，管理 Tesseract Worker 的生命周期
 * 
 * 设计思路：
 * - 懒加载：Worker 在首次使用时才创建
 * - 复用：同类型 Worker 复用，避免重复创建开销
 * - 分离：游戏阶段和棋子名称使用不同配置的 Worker
 */
export class OcrService {
    private static instance: OcrService;

    /** 游戏阶段识别 Worker (英文+数字) */
    private gameStageWorker: Tesseract.Worker | null = null;

    /** 棋子名称识别 Worker (中文) */
    private chessWorker: Tesseract.Worker | null = null;

    /** 等级识别 Worker (中文"级"字 + 数字) */
    private levelWorker: Tesseract.Worker | null = null;

    /** 安卓 HUD 数字识别 Worker (英文数字 + 斜杠) */
    private hudDigitsWorker: Tesseract.Worker | null = null;

    /** 安卓 HUD 玩家名称识别 Worker (英文/数字) */
    private playerNameWorker: Tesseract.Worker | null = null;

    /** 战斗阶段文字识别 Worker (中文"战斗环节") */
    private combatPhaseWorker: Tesseract.Worker | null = null;

    /** 当前棋子 Worker 对应的赛季模式，用于判断是否需要重建 Worker */
    private currentChessMode: TFTMode | null = null;

    /** Worker 健康追踪元数据 */
    private workerHealth: Map<OcrWorkerType, WorkerHealthMeta> = new Map();

    /** 简单的内存缓存：imageHash -> recognized text */
    private ocrCache: Map<string, { text: string; createdAt: number; lastUsedAt: number; hits: number }> = new Map();

    /** 正在进行的识别请求（去重同一图像的并发识别） */
    private recognitionPromises: Map<string, Promise<string>> = new Map();

    /** 最大缓存条目数（可通过环境变量调整） */
    private maxCacheEntries: number = parseInt(process.env.OCR_CACHE_MAX_ENTRIES ?? "1000", 10);

    /** 当前 worker 是否为优化模式创建（用于在模式切换时重建 worker） */
    private optimizedModeActive: boolean | null = null;

    /** switchChessWorker 防抖定时器 */
    private switchChessDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    /** switchChessWorker 防抖等待中的模式 */
    private pendingChessMode: TFTMode | null = null;

    /** Tesseract 语言包路径 */
    private get langPath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/tessdata");
    }

    private constructor() {}

    /**
     * 获取 OcrService 单例
     */
    public static getInstance(): OcrService {
        if (!OcrService.instance) {
            OcrService.instance = new OcrService();
        }
        return OcrService.instance;
    }

    /**
     * 获取指定类型的 OCR Worker
     * @param type Worker 类型
     * @returns Tesseract Worker 实例
     */
    public async getWorker(type: OcrWorkerType): Promise<Tesseract.Worker> {
        switch (type) {
            case OcrWorkerType.GAME_STAGE:
                return this.getGameStageWorker();
            case OcrWorkerType.CHESS:
                return this.getChessWorker();
            case OcrWorkerType.LEVEL:
                return this.getLevelWorker();
            case OcrWorkerType.HUD_DIGITS:
                return this.getHudDigitsWorker();
            case OcrWorkerType.PLAYER_NAME:
                return this.getPlayerNameWorker();
            case OcrWorkerType.COMBAT_PHASE:
                return this.getCombatPhaseWorker();
            default:
                throw new Error(`未知的 OCR Worker 类型: ${type}`);
        }

    }

    /**
     * Perform OCR recognition with built-in resilience and observability.
     *
     * - Uses a dedicated OCR Worker per type and recycles workers when necessary.
     * - Includes retry logic with exponential backoff (up to 3 retries).
     * - Performs memory sampling after each recognition for monitoring purposes.
     * - May throw if all retries fail.
     *
     * @param imageBuffer PNG image buffer to recognize
     * @param type the OCR worker type to use
     * @returns the recognized text as a trimmed string
     *
     * Auto-recovery rules:
     * - Recycle when recognitions exceed MAX_RECOGNITIONS
     * - Recycle after MAX_LIFETIME_MS since creation
     * - Recycle after MAX_IDLE_MS since last use
     *
     * Memory sampling:
     * - Sample memoryUsage after each successful recognition
     */
    public async recognize(imageBuffer: Buffer, type: OcrWorkerType): Promise<string> {
        // 检查是否需要回收
        await this.recycleIfNeeded(type);

        const worker = await this.getWorker(type);
        // 1) 计算图像 hash，用于缓存及并发去重
        const imageHash = this.computeImageHash(imageBuffer);

        // 2) 先检查缓存
        const cached = this.ocrCache.get(imageHash);
        if (cached) {
            cached.hits++;
            cached.lastUsedAt = Date.now();
            // 更新健康追踪（不计入 worker recognitionCount）
            memoryMonitor.sample(`ocr:cache_hit:${type}`);
            return cached.text;
        }

        // 3) 去重并发请求：如果已有相同图像的识别在进行中，直接等待结果
        const pending = this.recognitionPromises.get(imageHash);
        if (pending) {
            return pending;
        }

        // 4) Retry logic with mild backoff; faster path tries fewer retries when optimizedModeActive
        const MAX_RETRIES = this.optimizedModeActive ? 1 : 3;
        const backoffDelays = [80, 160, 320];

        const recognitionPromise = (async (): Promise<string> => {
            let lastError: unknown;
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                    const result = await worker.recognize(imageBuffer);

                    const text = result.data.text.trim();

                    // 更新健康追踪 + 内存采样（仅在成功后执行一次）
                    this.updateHealthMeta(type);
                    memoryMonitor.sample(`ocr:${type}`);

                    // 将结果写入缓存
                    this.addToCache(imageHash, text);

                    return text;
                } catch (error: unknown) {
                    lastError = error;
                    if (attempt < MAX_RETRIES) {
                        const delay = backoffDelays[attempt] ?? backoffDelays[backoffDelays.length - 1];
                        logger.warn(
                            `[OcrService] OCR 识别失败 (type=${type}) 第 ${attempt + 1} 次尝试失败，将在 ${delay}ms 后重试: ${
                                error instanceof Error ? error.message : String(error)
                            }`
                        );
                        await new Promise((resolve) => setTimeout(resolve, delay));
                        continue;
                    }

                    logger.error(
                        `[OcrService] OCR 识别最终失败 (type=${type})，共尝试 ${MAX_RETRIES + 1} 次: ${
                            error instanceof Error ? error.stack ?? error.message : String(error)
                        }`
                    );
                    throw error;
                }
            }
            throw lastError as Error;
        })();

        // 登记进行中的识别请求，避免重复执行
        this.recognitionPromises.set(imageHash, recognitionPromise);

        try {
            const res = await recognitionPromise;
            return res;
        } finally {
            // 清理进行中请求
            this.recognitionPromises.delete(imageHash);
        }
    }

    /**
     * 计算图片的哈希值（用于缓存 key）
     */
    private computeImageHash(buffer: Buffer): string {
        // 使用 SHA-1 以减小 key 长度
        return crypto.createHash("sha1").update(buffer).digest("hex");
    }

    /**
     * 将识别结果加入缓存并进行简单的 LRU-like 淘汰
     */
    private addToCache(imageHash: string, text: string): void {
        if (this.ocrCache.has(imageHash)) {
            const entry = this.ocrCache.get(imageHash)!;
            entry.text = text;
            entry.lastUsedAt = Date.now();
            entry.hits++;
            return;
        }

        // 淘汰最旧或最少命中项以保持缓存大小
        if (this.ocrCache.size >= this.maxCacheEntries) {
            // 找到最久未使用的 entry
            let oldestKey: string | null = null;
            let oldestAt = Number.MAX_SAFE_INTEGER;
            for (const [k, v] of this.ocrCache.entries()) {
                if (v.lastUsedAt < oldestAt) {
                    oldestAt = v.lastUsedAt;
                    oldestKey = k;
                }
            }
            if (oldestKey) {
                this.ocrCache.delete(oldestKey);
            }
        }

        this.ocrCache.set(imageHash, { text, createdAt: Date.now(), lastUsedAt: Date.now(), hits: 0 });
    }

    /**
     * 更新 Worker 健康追踪元数据
     */
    private updateHealthMeta(type: OcrWorkerType): void {
        const meta = this.workerHealth.get(type);
        const now = Date.now();
        
        if (meta) {
            meta.recognitionCount++;
            meta.lastUsedAt = now;
        } else {
            this.workerHealth.set(type, {
                createdAt: now,
                recognitionCount: 1,
                lastUsedAt: now,
            });
        }
    }

    /**
     * 检查 Worker 是否需要回收，如果是则重建
     * @param type Worker 类型
     */
    private async recycleIfNeeded(type: OcrWorkerType): Promise<void> {
        const meta = this.workerHealth.get(type);
        if (!meta) return;

        const now = Date.now();
        const needsRecycle =
            meta.recognitionCount >= WORKER_RECYCLE_CONFIG.MAX_RECOGNITIONS ||
            (now - meta.createdAt) >= WORKER_RECYCLE_CONFIG.MAX_LIFETIME_MS ||
            (now - meta.lastUsedAt) >= WORKER_RECYCLE_CONFIG.MAX_IDLE_MS;

        if (!needsRecycle) return;

        logger.info(
            `[OcrService] Worker ${type} 触发回收: ` +
            `识别次数=${meta.recognitionCount}, ` +
            `存活=${Math.round((now - meta.createdAt) / 1000)}s, ` +
            `闲置=${Math.round((now - meta.lastUsedAt) / 1000)}s`
        );

        // 重建对应 Worker
        await this.rebuildWorker(type);

        // 重置健康追踪
        this.workerHealth.set(type, {
            createdAt: Date.now(),
            recognitionCount: 0,
            lastUsedAt: Date.now(),
        });
    }

    /**
     * 重建指定类型的 Worker（带内存日志）
     */
    private async rebuildWorker(type: OcrWorkerType): Promise<void> {
        // 采样回收前的内存
        const memBefore = memoryMonitor.sample(`ocr:recycle_before:${type}`);
        
        switch (type) {
            case OcrWorkerType.GAME_STAGE:
                if (this.gameStageWorker) {
                    await this.gameStageWorker.terminate();
                    this.gameStageWorker = null;
                }
                await this.getGameStageWorker();
                break;
            case OcrWorkerType.CHESS:
                if (this.chessWorker) {
                    await this.chessWorker.terminate();
                    this.chessWorker = null;
                }
                await this.getChessWorker();
                break;
            case OcrWorkerType.LEVEL:
                if (this.levelWorker) {
                    await this.levelWorker.terminate();
                    this.levelWorker = null;
                }
                await this.getLevelWorker();
                break;
            case OcrWorkerType.HUD_DIGITS:
                if (this.hudDigitsWorker) {
                    await this.hudDigitsWorker.terminate();
                    this.hudDigitsWorker = null;
                }
                await this.getHudDigitsWorker();
                break;
            case OcrWorkerType.PLAYER_NAME:
                if (this.playerNameWorker) {
                    await this.playerNameWorker.terminate();
                    this.playerNameWorker = null;
                }
                await this.getPlayerNameWorker();
                break;
            case OcrWorkerType.COMBAT_PHASE:
                if (this.combatPhaseWorker) {
                    await this.combatPhaseWorker.terminate();
                    this.combatPhaseWorker = null;
                }
                await this.getCombatPhaseWorker();
                break;
        }

        // 采样回收后的内存
        const memAfter = memoryMonitor.sample(`ocr:recycle_after:${type}`);
        logger.info(
            `[OcrService] Worker ${type} 回收完成：` +
            `回收前 RSS=${(memBefore.rss / 1024 / 1024).toFixed(2)}MB, ` +
            `回收后 RSS=${(memAfter.rss / 1024 / 1024).toFixed(2)}MB`
        );
    }

    /**
     * 获取游戏阶段识别 Worker
     * @description 配置为只识别数字和连字符 (如 "2-1", "3-5")
     */
    private async getGameStageWorker(): Promise<Tesseract.Worker> {
        if (this.gameStageWorker) {
            return this.gameStageWorker;
        }

        logger.info("[OcrService] 正在创建游戏阶段识别 Worker...");

        // OEM must be set during worker initialization, not via setParameters
        // OEM 1 = LSTM_ONLY (faster), OEM 3 = DEFAULT (both engines)
        const oem = this.optimizedModeActive ? 1 : 3;
        const worker = await createWorker("eng", oem, {
            langPath: this.langPath,
            cachePath: this.langPath,
        });

        await worker.setParameters({
            tessedit_char_whitelist: "0123456789-",
            tessedit_pageseg_mode: PSM.SINGLE_LINE,
        });

        this.gameStageWorker = worker;
        logger.info("[OcrService] 游戏阶段识别 Worker 准备就绪");

        return this.gameStageWorker;
    }

    /**
     * 获取棋子名称识别 Worker
     * @description 配置为中文识别，白名单限制为当前赛季棋子名称中的字符。
     *              首次调用时默认使用 NORMAL 模式（S16），后续可通过 switchChessWorker() 切换赛季。
     */
    private async getChessWorker(): Promise<Tesseract.Worker> {
        if (this.chessWorker) {
            return this.chessWorker;
        }

        // 如果还没有指定赛季，默认使用 S16
        await this.buildChessWorker(this.currentChessMode ?? TFTMode.NORMAL);

        return this.chessWorker!;
    }

    /**
     * 根据指定模式创建（或重建）棋子名称识别 Worker
     * @param mode 当前 TFT 游戏模式，用于决定加载哪个赛季的棋子白名单
     * @description 内部方法，负责：
     *   1. 销毁旧的 chessWorker（如果存在）
     *   2. 用 getChessDataForMode(mode) 获取该赛季的棋子数据
     *   3. 从棋子名称中提取所有独立汉字作为白名单
     *   4. 创建新的 Tesseract Worker 并应用白名单
     */
    private async buildChessWorker(mode: TFTMode): Promise<void> {
        // 先销毁旧 Worker
        if (this.chessWorker) {
            await this.chessWorker.terminate();
            this.chessWorker = null;
        }

        logger.info(`[OcrService] 正在为模式 ${mode} 创建棋子名称识别 Worker...`);

        // OEM must be set during worker initialization, not via setParameters
        const oem = this.optimizedModeActive ? 1 : 3;
        const worker = await createWorker("chi_sim", oem, {
            langPath: this.langPath,
            cachePath: this.langPath,
        });

        // 根据当前赛季获取对应的棋子数据集，构建精准的字符白名单
        const chessData = getChessDataForMode(mode);
        const uniqueChars = [...new Set(Object.keys(chessData).join(""))].join("");

        await worker.setParameters({
            tessedit_char_whitelist: uniqueChars,
            tessedit_pageseg_mode: PSM.SINGLE_LINE,
            preserve_interword_spaces: "1",
        });

        this.chessWorker = worker;
        this.currentChessMode = mode;
        logger.info(`[OcrService] 棋子名称识别 Worker 准备就绪 (白名单字符数: ${uniqueChars.length})`);
    }

    /**
     * 切换棋子 OCR Worker 到指定赛季（带防抖）
     * @param mode 目标 TFT 游戏模式
     * @description 外部调用入口。使用 500ms 防抖避免连续调用导致频繁重建。
     *              如果目标赛季与当前赛季相同，则跳过重建。
     *              应在每局游戏开始时（GameRunningState.action）调用。
     *
     * 使用示例：
     * ```ts
     * await ocrService.switchChessWorker(TFTMode.S4_RUISHOU);
     * ```
     */
    public async switchChessWorker(mode: TFTMode): Promise<void> {
        if (this.currentChessMode === mode && this.chessWorker) {
            logger.debug(`[OcrService] 棋子 Worker 赛季未变 (${mode})，跳过重建`);
            return;
        }

        // 防抖：如果有等待中的切换，取消它
        if (this.switchChessDebounceTimer) {
            clearTimeout(this.switchChessDebounceTimer);
            this.switchChessDebounceTimer = null;
        }

        this.pendingChessMode = mode;

        return new Promise((resolve) => {
            this.switchChessDebounceTimer = setTimeout(async () => {
                const targetMode = this.pendingChessMode;
                this.pendingChessMode = null;
                this.switchChessDebounceTimer = null;

                if (targetMode && targetMode !== this.currentChessMode) {
                    await this.buildChessWorker(targetMode);
                }
                resolve();
            }, 500);
        });
    }

    /**
     * 预热所有常用 Worker
     * @description 在应用启动或游戏开始时调用，避免首次使用时的延迟。
     *              预热 GAME_STAGE 和 CHESS Worker（最常用的两个）。
     */
    public async prewarmWorkers(): Promise<void> {
        logger.info("[OcrService] 开始预热 OCR Workers...");
        
        try {
            await Promise.all([
                this.getGameStageWorker(),
                this.getChessWorker(),
            ]);
            logger.info("[OcrService] OCR Workers 预热完成");
        } catch (e) {
            logger.warn(`[OcrService] Worker 预热部分失败: ${e}`);
        }
    }

    /**
     * Toggle optimized OCR mode.
     * - When enabled, we prefer faster OCR engine mode and fewer retries.
     * - Toggling will rebuild all workers to ensure parameters take effect.
     */
    public async setOptimizedMode(enabled: boolean): Promise<void> {
        if (this.optimizedModeActive === enabled) return;
        this.optimizedModeActive = enabled;

        logger.info(`[OcrService] Setting optimized OCR mode = ${enabled}`);

        // Rebuild all workers to apply new parameters
        await this.rebuildWorker(OcrWorkerType.GAME_STAGE);
        await this.rebuildWorker(OcrWorkerType.CHESS);
        await this.rebuildWorker(OcrWorkerType.LEVEL);
        await this.rebuildWorker(OcrWorkerType.HUD_DIGITS);
        await this.rebuildWorker(OcrWorkerType.PLAYER_NAME);
        await this.rebuildWorker(OcrWorkerType.COMBAT_PHASE);
    }

    /**
     * 检查指定类型的 Worker 是否已就绪
     * @param type Worker 类型
     * @returns true 表示 Worker 已创建且可用
     */
    public isWorkerReady(type: OcrWorkerType): boolean {
        switch (type) {
            case OcrWorkerType.GAME_STAGE:
                return this.gameStageWorker !== null;
            case OcrWorkerType.CHESS:
                return this.chessWorker !== null;
            case OcrWorkerType.LEVEL:
                return this.levelWorker !== null;
            case OcrWorkerType.HUD_DIGITS:
                return this.hudDigitsWorker !== null;
            case OcrWorkerType.PLAYER_NAME:
                return this.playerNameWorker !== null;
            case OcrWorkerType.COMBAT_PHASE:
                return this.combatPhaseWorker !== null;
            default:
                return false;
        }
    }

    /**
     * 获取指定 Worker 的健康状态（用于调试/监控）
     */
    public getWorkerHealth(type: OcrWorkerType): WorkerHealthMeta | undefined {
        return this.workerHealth.get(type);
    }

    /**
     * 获取等级识别 Worker
     * @description 配置为识别中文"级"字、数字和斜杠 (如 "4级 4/6")
     */
    private async getLevelWorker(): Promise<Tesseract.Worker> {
        if (this.levelWorker) {
            return this.levelWorker;
        }

        logger.info("[OcrService] 正在创建等级识别 Worker...");

        const oem = this.optimizedModeActive ? 1 : 3;
        const worker = await createWorker("chi_sim", oem, {
            langPath: this.langPath,
            cachePath: this.langPath,
        });

        // 配置：只识别数字、斜杠和中文"级"字
        await worker.setParameters({
            tessedit_char_whitelist: "0123456789/级",
            tessedit_pageseg_mode: PSM.SINGLE_LINE,
        });

        this.levelWorker = worker;
        logger.info("[OcrService] 等级识别 Worker 准备就绪");

        return this.levelWorker;
    }

    /**
     * 获取安卓 HUD 数字识别 Worker
     * @description 金币/经验/血量都属于短数字串，使用 eng + 稀疏文本模式更稳定。
     */
    private async getHudDigitsWorker(): Promise<Tesseract.Worker> {
        if (this.hudDigitsWorker) {
            return this.hudDigitsWorker;
        }

        logger.info("[OcrService] 正在创建安卓 HUD 数字识别 Worker...");

        const oem = this.optimizedModeActive ? 1 : 3;
        const worker = await createWorker("eng", oem, {
            langPath: this.langPath,
            cachePath: this.langPath,
        });

        await worker.setParameters({
            tessedit_char_whitelist: "0123456789/",
            tessedit_pageseg_mode: PSM.SPARSE_TEXT,
        });

        this.hudDigitsWorker = worker;
        logger.info("[OcrService] 安卓 HUD 数字识别 Worker 准备就绪");

        return this.hudDigitsWorker;
    }

    /**
     * 获取安卓 HUD 玩家名称识别 Worker
     * @description 美服安卓端名字通常是英文/数字混合，使用 eng + 稀疏文本模式读取。
     */
    private async getPlayerNameWorker(): Promise<Tesseract.Worker> {
        if (this.playerNameWorker) {
            return this.playerNameWorker;
        }

        logger.info("[OcrService] 正在创建安卓 HUD 玩家名称识别 Worker...");

        const oem = this.optimizedModeActive ? 1 : 3;
        const worker = await createWorker("eng", oem, {
            langPath: this.langPath,
            cachePath: this.langPath,
        });

        await worker.setParameters({
            tessedit_char_whitelist: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-",
            tessedit_pageseg_mode: PSM.SPARSE_TEXT,
            preserve_interword_spaces: "1",
        });

        this.playerNameWorker = worker;
        logger.info("[OcrService] 安卓 HUD 玩家名称识别 Worker 准备就绪");

        return this.playerNameWorker;
    }

    /**
     * 获取战斗阶段文字识别 Worker
     * @description 只需要识别"战斗环节"这类固定短语，白名单尽量收紧，提升准确率。
     */
    private async getCombatPhaseWorker(): Promise<Tesseract.Worker> {
        if (this.combatPhaseWorker) {
            return this.combatPhaseWorker;
        }

        logger.info("[OcrService] 正在创建战斗阶段识别 Worker...");

        const oem = this.optimizedModeActive ? 1 : 3;
        const worker = await createWorker("chi_sim", oem, {
            langPath: this.langPath,
            cachePath: this.langPath,
        });

        // 配置：只识别战斗/准备相关的汉字（避免模型输出无关字符导致误判）
        await worker.setParameters({
            tessedit_char_whitelist: "战斗环节",
            tessedit_pageseg_mode: PSM.SINGLE_LINE,
            preserve_interword_spaces: "1",
        });

        this.combatPhaseWorker = worker;
        logger.info("[OcrService] 战斗阶段识别 Worker 准备就绪");

        return this.combatPhaseWorker;
    }


    /**
     * 销毁所有 Worker，释放资源
     * @description 在应用退出时调用
     */
    public async destroy(): Promise<void> {
        // 清除防抖定时器
        if (this.switchChessDebounceTimer) {
            clearTimeout(this.switchChessDebounceTimer);
            this.switchChessDebounceTimer = null;
        }

        if (this.gameStageWorker) {
            await this.gameStageWorker.terminate();
            this.gameStageWorker = null;
            logger.info("[OcrService] 游戏阶段识别 Worker 已销毁");
        }

        if (this.chessWorker) {
            await this.chessWorker.terminate();
            this.chessWorker = null;
            logger.info("[OcrService] 棋子名称识别 Worker 已销毁");
        }

        if (this.levelWorker) {
            await this.levelWorker.terminate();
            this.levelWorker = null;
            logger.info("[OcrService] 等级识别 Worker 已销毁");
        }

        if (this.hudDigitsWorker) {
            await this.hudDigitsWorker.terminate();
            this.hudDigitsWorker = null;
            logger.info("[OcrService] 安卓 HUD 数字识别 Worker 已销毁");
        }

        if (this.playerNameWorker) {
            await this.playerNameWorker.terminate();
            this.playerNameWorker = null;
            logger.info("[OcrService] 安卓 HUD 玩家名称识别 Worker 已销毁");
        }

        if (this.combatPhaseWorker) {
            await this.combatPhaseWorker.terminate();
            this.combatPhaseWorker = null;
            logger.info("[OcrService] 战斗阶段识别 Worker 已销毁");
        }

        // 清空健康追踪
        this.workerHealth.clear();
    }

    /**
     * 清空 OCR 结果缓存（测试/调试用）
     */
    public clearCache(): void {
        this.ocrCache.clear();
    }

    /**
     * 返回缓存统计信息（测试/监控用）
     */
    public getCacheStats(): { entries: number } {
        return { entries: this.ocrCache.size };
    }
}


/** OcrService 单例导出 */
export const ocrService = OcrService.getInstance();
