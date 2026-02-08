/**
 * @file OCR 识别服务
 * @description 基于 Tesseract.js 的 OCR 识别服务，提供游戏阶段识别和棋子名称识别
 * @author TFT-Hextech-Helper
 */

import Tesseract, { createWorker, PSM } from "tesseract.js";
import path from "path";
import { logger } from "../../utils/Logger";
import { TFTMode, getChessDataForMode } from "../../TFTProtocol";

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
    /** 战斗阶段文字识别 (中文，如 "战斗环节") */
    COMBAT_PHASE = "COMBAT_PHASE",
}


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

    /** 战斗阶段文字识别 Worker (中文"战斗环节") */
    private combatPhaseWorker: Tesseract.Worker | null = null;

    /** 当前棋子 Worker 对应的赛季模式，用于判断是否需要重建 Worker */
    private currentChessMode: TFTMode | null = null;

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
            case OcrWorkerType.COMBAT_PHASE:
                return this.getCombatPhaseWorker();
            default:
                throw new Error(`未知的 OCR Worker 类型: ${type}`);
        }

    }

    /**
     * 执行 OCR 识别
     * @param imageBuffer PNG 图片 Buffer
     * @param type Worker 类型
     * @returns 识别结果文本
     */
    public async recognize(imageBuffer: Buffer, type: OcrWorkerType): Promise<string> {
        const worker = await this.getWorker(type);
        const result = await worker.recognize(imageBuffer);
        return result.data.text.trim();
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

        const worker = await createWorker("eng", 1, {
            langPath: this.langPath,
            cachePath: this.langPath,
        });

        // 配置：只识别数字和连字符
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

        const worker = await createWorker("chi_sim", 1, {
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
     * 切换棋子 OCR Worker 到指定赛季
     * @param mode 目标 TFT 游戏模式
     * @description 外部调用入口。如果目标赛季与当前赛季相同，则跳过重建，避免不必要的开销。
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
        await this.buildChessWorker(mode);
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

        const worker = await createWorker("chi_sim", 1, {
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
     * 获取战斗阶段文字识别 Worker
     * @description 只需要识别“战斗环节”这类固定短语，白名单尽量收紧，提升准确率。
     */
    private async getCombatPhaseWorker(): Promise<Tesseract.Worker> {
        if (this.combatPhaseWorker) {
            return this.combatPhaseWorker;
        }

        logger.info("[OcrService] 正在创建战斗阶段识别 Worker...");

        const worker = await createWorker("chi_sim", 1, {
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

        if (this.combatPhaseWorker) {
            await this.combatPhaseWorker.terminate();
            this.combatPhaseWorker = null;
            logger.info("[OcrService] 战斗阶段识别 Worker 已销毁");
        }
    }
}


/** OcrService 单例导出 */
export const ocrService = OcrService.getInstance();
