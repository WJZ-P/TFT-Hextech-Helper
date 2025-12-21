/**
 * @file OCR 识别服务
 * @description 基于 Tesseract.js 的 OCR 识别服务，提供游戏阶段识别和棋子名称识别
 * @author TFT-Hextech-Helper
 */

import Tesseract, { createWorker, PSM } from "tesseract.js";
import path from "path";
import { logger } from "../../utils/Logger";
import { TFT_16_CHAMPION_DATA } from "../../TFTProtocol";

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
    LEVEL = "LEVEL"
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
     * @description 配置为中文识别，白名单限制为所有棋子名称中的字符
     */
    private async getChessWorker(): Promise<Tesseract.Worker> {
        if (this.chessWorker) {
            return this.chessWorker;
        }

        logger.info("[OcrService] 正在创建棋子名称识别 Worker...");

        const worker = await createWorker("chi_sim", 1, {
            langPath: this.langPath,
            cachePath: this.langPath,
        });

        // 构建字符白名单：所有棋子名称中出现的字符
        const uniqueChars = [...new Set(Object.keys(TFT_16_CHAMPION_DATA).join(""))].join("");

        await worker.setParameters({
            tessedit_char_whitelist: uniqueChars,
            tessedit_pageseg_mode: PSM.SINGLE_LINE,
            preserve_interword_spaces: "1",
        });

        this.chessWorker = worker;
        logger.info("[OcrService] 棋子名称识别 Worker 准备就绪");

        return this.chessWorker;
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
    }
}

/** OcrService 单例导出 */
export const ocrService = OcrService.getInstance();
