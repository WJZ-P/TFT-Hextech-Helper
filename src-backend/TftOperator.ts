/**
 * @file TFT 操作器
 * @description 云顶之弈自动化工具的核心操作类，提供游戏识别和操作的统一接口
 * 
 * 数据来源：
 * - 官方模拟器: https://lol.qq.com/act/a20220802tftsimulator/#/index (高清棋子图标)
 * - OP.GG: https://op.gg/zh-cn/tft/meta-trends/item (标清版最新信息)
 * 
 * 游戏分辨率: 1024x768
 * 
 * @author TFT-Hextech-Helper
 */

import { logger } from "./utils/Logger";
import { Button, Region } from "@nut-tree-fork/nut-js";
import { screen } from "electron";
import path from "path";
import fs from "fs-extra";
import sharp from "sharp";
import cv from "@techstark/opencv-js";

// 协议层导入
import {
    benchSlotPoints,
    benchSlotRegion,
    coinRegion,
    detailChampionNameRegion,
    detailChampionStarRegion,
    detailEquipRegion,
    equipmentRegion,
    fightBoardSlotPoint,
    fightBoardSlotRegion,
    gameStageDisplayNormal,
    gameStageDisplayStageOne,
    gameStageDisplayTheClockworkTrails,
    GameStageType,
    itemForgeTooltipRegion,
    itemForgeTooltipRegionEdge,
    levelRegion,
    lootRegion,
    shopSlot,
    shopSlotNameRegions,
    TFT_16_CHAMPION_DATA,
    TFTEquip,
    TFTMode,
    TFTUnit,
    SimplePoint,
} from "./TFTProtocol";



// 内部模块导入
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    ocrService,
    OcrWorkerType,
    templateLoader,
    templateMatcher,
    screenCapture,
    mouseController,
    parseStageStringToEnum,
    isValidStageFormat,
} from "./tft";
import type {
    IdentifiedEquip,
    BenchUnit,
    BenchLocation,
    BoardUnit,
    BoardLocation,
    ShopUnit,
    LootOrb,
} from "./tft";
import { sleep } from "./utils/HelperTools";

// ============================================================================
// 类型重导出 (保持向后兼容)
// ============================================================================

export { IdentifiedEquip, ShopUnit, BoardLocation, BoardUnit, BenchLocation, BenchUnit, LootOrb };

/** 装备资源路径优先级 (向后兼容导出) */
export const equipResourcePath = ["component", "special", "core", "emblem", "artifact", "radiant"];

// ============================================================================
// TftOperator 主类
// ============================================================================

/**
 * TFT 操作器
 * @description 单例模式，提供云顶之弈游戏的所有识别和操作功能
 * 
 * 核心功能：
 * - 游戏阶段识别 (PVE/PVP/选秀/海克斯)
 * - 商店棋子识别
 * - 备战席棋子识别
 * - 装备栏识别
 * - 棋子购买操作
 * 
 * 使用方式：
 * ```typescript
 * const operator = TftOperator.getInstance();
 * operator.init();
 * const stage = await operator.getGameStage();
 * const shopUnits = await operator.getShopInfo();
 * ```
 */
class TftOperator {
    private static instance: TftOperator;

    /** 游戏窗口左上角坐标 */
    private gameWindowRegion: SimplePoint | null = null;

    /** 当前游戏模式 */
    private tftMode: TFTMode = TFTMode.CLASSIC;

    /** 空槽匹配阈值：平均像素差值大于此值视为"有棋子占用" */
    private readonly benchEmptyDiffThreshold = 6;

    /** OpenCV 是否已初始化 */
    private isOpenCVReady = false;

    // ========== 路径 Getter ==========


    private get failChampionTemplatePath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/英雄备份");
    }

    private get equipTemplatePath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/equipment");
    }

    private get starLevelTemplatePath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/starLevel");
    }

    private get benchSlotSnapshotPath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/benchSlot");
    }

    private get fightBoardSlotSnapshotPath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/fightBoardSlot");
    }




    // ========== 构造函数 ==========

    private constructor() {
        this.initOpenCV();
    }

    /**
     * 初始化 OpenCV
     * @description 在 OpenCV WASM 加载完成后初始化模板加载器
     */
    private initOpenCV(): void {
        cv["onRuntimeInitialized"] = async () => {
            logger.info("[TftOperator] OpenCV (WASM) 核心模块加载完毕");
            this.isOpenCVReady = true;

            // 初始化模板加载器
            await templateLoader.initialize();
        };
    }

    /**
     * 获取 TftOperator 单例
     */
    public static getInstance(): TftOperator {
        if (!TftOperator.instance) {
            TftOperator.instance = new TftOperator();
        }
        return TftOperator.instance;
    }

    // ============================================================================
    // 公共接口 (Public API)
    // ============================================================================

    /**
     * 初始化操作器
     * @description 计算游戏窗口位置，LOL 窗口默认居中显示
     * @returns 是否初始化成功
     */
    public init(): boolean {
        try {
            const primaryDisplay = screen.getPrimaryDisplay();
            const scaleFactor = primaryDisplay.scaleFactor;
            const { width: logicalWidth, height: logicalHeight } = primaryDisplay.size;

            // 还原为物理像素
            const screenWidth = Math.round(logicalWidth * scaleFactor);
            const screenHeight = Math.round(logicalHeight * scaleFactor);

            // 计算屏幕中心
            const screenCenterX = screenWidth / 2;
            const screenCenterY = screenHeight / 2;

            // 计算游戏窗口左上角
            const originX = screenCenterX - GAME_WIDTH / 2;
            const originY = screenCenterY - GAME_HEIGHT / 2;

            this.gameWindowRegion = { x: originX, y: originY };

            // 同步到子模块
            screenCapture.setGameWindowOrigin(this.gameWindowRegion);
            mouseController.setGameWindowOrigin(this.gameWindowRegion);

            logger.info(`[TftOperator] 屏幕尺寸: ${screenWidth}x${screenHeight}`);
            logger.info(`[TftOperator] 游戏基准点: (${originX}, ${originY})`);

            return true;
        } catch (e: any) {
            logger.error(`[TftOperator] 初始化失败: ${e.message}`);
            this.gameWindowRegion = null;
            return false;
        }
    }

    /**
     * 获取当前游戏阶段
     * @description 通过 OCR 识别游戏阶段 (如 "2-1", "3-5")
     * @returns 游戏阶段枚举
     */
    public async getGameStage(): Promise<GameStageType> {
        try {
            let stageText = "";

            // 1. 尝试识别标准区域 (2-1, 3-5, 4-2 等)
            const normalRegion = this.getStageAbsoluteRegion(false);
            const normalPng = await screenCapture.captureRegionAsPng(normalRegion);
            stageText = await ocrService.recognize(normalPng, OcrWorkerType.GAME_STAGE);

            // 2. 如果标准区域识别失败，尝试 Stage 1 区域
            if (!isValidStageFormat(stageText)) {
                logger.info(`[TftOperator] 标准区域识别未命中: "${stageText}"，尝试 Stage-1 区域...`);
                const stageOneRegion = this.getStageAbsoluteRegion(true);
                const stageOnePng = await screenCapture.captureRegionAsPng(stageOneRegion);
                stageText = await ocrService.recognize(stageOnePng, OcrWorkerType.GAME_STAGE);
            }

            // 3. 检查是否为"发条鸟试炼"模式
            if (!isValidStageFormat(stageText)) {
                const clockworkRegion = this.getClockworkTrialsRegion();
                const clockPng = await screenCapture.captureRegionAsPng(clockworkRegion);
                const clockText = await ocrService.recognize(clockPng, OcrWorkerType.GAME_STAGE);

                if (clockText && clockText.length > 2) {
                    this.tftMode = TFTMode.CLOCKWORK_TRAILS;
                    logger.info("[TftOperator] 识别为发条鸟试炼模式");
                    return GameStageType.PVP;
                }
            }

            // 4. 解析阶段字符串
            const stageType = parseStageStringToEnum(stageText);

            if (stageType !== GameStageType.UNKNOWN) {
                logger.info(`[TftOperator] 识别阶段: [${stageText}] -> ${stageType}`);
                this.tftMode = TFTMode.CLASSIC;
            } else {
                logger.warn(`[TftOperator] 无法识别当前阶段: "${stageText ?? "null"}"`);
            }

            return stageType;
        } catch (e: any) {
            logger.error(`[TftOperator] 阶段识别异常: ${e.message}`);
            return GameStageType.UNKNOWN;
        }
    }

    /**
     * 获取当前商店的所有棋子信息
     * @description 扫描商店 5 个槽位，通过 OCR + 模板匹配识别棋子
     * @returns 商店中的棋子数组 (空槽位为 null)
     */
    public async getShopInfo(): Promise<(TFTUnit | null)[]> {
        logger.info("[TftOperator] 正在扫描商店中的 5 个槽位...");
        const shopUnits: (TFTUnit | null)[] = [];

        for (let i = 1; i <= 5; i++) {
            const slotKey = `SLOT_${i}` as keyof typeof shopSlotNameRegions;
            const region = screenCapture.toAbsoluteRegion(shopSlotNameRegions[slotKey]);

            // 截图并 OCR 识别
            const processedPng = await screenCapture.captureRegionAsPng(region);
            const text = await ocrService.recognize(processedPng, OcrWorkerType.CHESS);
            let cleanName = text.replace(/\s/g, "");

            // 尝试从 OCR 结果中找到匹配的英雄
            let tftUnit: TFTUnit | null = TFT_16_CHAMPION_DATA[cleanName] || null;

            // OCR 失败时使用模板匹配兜底
            if (!tftUnit) {
                logger.warn(`[商店槽位 ${i}] OCR 识别失败，尝试模板匹配...`);
                // 复用 processedPng (已经是 3x 放大后的了)
                const mat = await screenCapture.pngBufferToMat(processedPng);

                // 关键步骤：转为灰度图！
                // 因为我们的模板是灰度/单通道的，而 captureRegionAsPng 返回的是 RGB/RGBA。
                if (mat.channels() > 1) {
                    cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
                }

                cleanName = templateMatcher.matchChampion(mat) || "";
                mat.delete();
            }

            // 从数据集中找到对应英雄
            tftUnit = TFT_16_CHAMPION_DATA[cleanName] || null;

            if (tftUnit) {
                logger.info(`[商店槽位 ${i}] 识别成功 -> ${tftUnit.displayName} (${tftUnit.price}费)`);
                shopUnits.push(tftUnit);
            } else {
                this.handleRecognitionFailure("shop", i, cleanName, processedPng);
                shopUnits.push(null);
            }
        }

        return shopUnits;
    }

    /**
     * 获取当前装备栏信息
     * @description 扫描装备栏所有槽位，通过模板匹配识别装备
     * @returns 识别到的装备数组
     */
    public async getEquipInfo(): Promise<IdentifiedEquip[]> {
        if (!this.gameWindowRegion) {
            logger.error("[TftOperator] 尚未初始化游戏窗口位置");
            return [];
        }

        if (!templateLoader.isReady()) {
            logger.warn("[TftOperator] 模板未加载完成，跳过识别");
            return [];
        }

        const resultEquips: IdentifiedEquip[] = [];
        logger.info("[TftOperator] 开始扫描装备栏...");

        for (const [slotName, regionDef] of Object.entries(equipmentRegion)) {
            const targetRegion = new Region(
                this.gameWindowRegion.x + regionDef.leftTop.x,
                this.gameWindowRegion.y + regionDef.leftTop.y,
                regionDef.rightBottom.x - regionDef.leftTop.x + 1,
                regionDef.rightBottom.y - regionDef.leftTop.y + 1
            );

            let targetMat: cv.Mat | null = null;

            try {
                targetMat = await screenCapture.captureRegionAsMat(targetRegion);
                const matchResult = templateMatcher.matchEquip(targetMat);

                if (matchResult) {
                    logger.info(
                        `[TftOperator] ${slotName} 识别成功: ${matchResult.name} ` +
                        `(相似度: ${(matchResult.confidence * 100).toFixed(1)}%)`
                    );
                    matchResult.slot = slotName;
                    resultEquips.push(matchResult);
                } else {
                    logger.error(`[TftOperator] ${slotName} 槽位识别失败`);
                    await this.saveFailedImage("equip", slotName, targetMat, 3);
                }
            } catch (e: any) {
                logger.error(`[TftOperator] ${slotName} 扫描异常: ${e.message}`);
            } finally {
                if (targetMat && !targetMat.isDeleted()) {
                    targetMat.delete();
                }
            }
        }

        return resultEquips;
    }

    /**
     * 识别详情面板中棋子携带的装备
     * @description 当右键点击棋子后，会在右侧详情面板显示该棋子的装备（最多 3 件）
     *              此方法扫描详情面板的 3 个装备槽位，通过模板匹配识别装备
     *              复用了 templateMatcher.matchEquip 方法，与装备栏识别逻辑一致
     * @returns 识别到的装备数组（TFTEquip 类型，不包含槽位信息，空槽位会被过滤）
     */
    private async getDetailPanelEquips(): Promise<TFTEquip[]> {
        const equips: TFTEquip[] = [];

        // 遍历详情面板的 3 个装备槽位 (SLOT_1, SLOT_2, SLOT_3)
        for (const [slotName, regionDef] of Object.entries(detailEquipRegion)) {
            // 将相对坐标转换为屏幕绝对坐标
            const targetRegion = screenCapture.toAbsoluteRegion(regionDef);

            let targetMat: cv.Mat | null = null;

            try {
                // 截取装备槽位区域的图像
                targetMat = await screenCapture.captureRegionAsMat(targetRegion);
                
                // 使用模板匹配识别装备（复用装备栏的识别逻辑）
                // matchEquip 内部会将图像缩放到 24x24 以匹配模板尺寸
                const matchResult = templateMatcher.matchEquip(targetMat);

                // 过滤掉空槽位，只保留实际装备
                if (matchResult && matchResult.name !== "空槽位") {
                    logger.debug(
                        `[详情面板装备 ${slotName}] 识别成功: ${matchResult.name} ` +
                        `(相似度: ${(matchResult.confidence * 100).toFixed(1)}%)`
                    );
                    // 只保留 TFTEquip 的基础信息，不需要 slot/confidence 等额外字段
                    equips.push({
                        name: matchResult.name,
                        englishName: matchResult.englishName,
                        equipId: matchResult.equipId,
                        formula: matchResult.formula,
                    });
                }
                // 注意：如果槽位为空或识别失败，不添加到数组中（棋子可能没有装备或只有 1-2 件）
            } catch (e: any) {
                logger.warn(`[详情面板装备 ${slotName}] 扫描异常: ${e.message}`);
            } finally {
                // 释放 OpenCV Mat 内存，防止内存泄漏
                if (targetMat && !targetMat.isDeleted()) {
                    targetMat.delete();
                }
            }
        }

        return equips;
    }

    /**
     * 购买指定槽位的棋子
     * @param slot 槽位编号 (1-5)
     */
    public async buyAtSlot(slot: number): Promise<void> {
        const slotKey = `SHOP_SLOT_${slot}` as keyof typeof shopSlot;
        const targetPoint = shopSlot[slotKey];

        if (!targetPoint) {
            logger.error(`[TftOperator] 无效的槽位: ${slot}，只接受 1-5`);
            return;
        }

        logger.info(`[TftOperator] 正在购买棋子，槽位: ${slot}...`);

        // 双击确保购买成功
        await mouseController.doubleClickAt(targetPoint, Button.LEFT, 50);
    }

    /**
     * 获取当前备战席的棋子信息
     * @description 通过右键点击棋子，识别详情面板中的英雄名和星级
     * @returns 备战席棋子数组 (空槽位为 null)
     */
    public async getBenchInfo(): Promise<(BenchUnit | null)[]> {
        const benchUnits: (BenchUnit | null)[] = [];

        for (const benchSlot of Object.keys(benchSlotPoints)) {
            // 右键点击槽位显示详细信息
            // 先检测该槽位是否为空：对比空槽模板
            const benchRegion = screenCapture.toAbsoluteRegion(benchSlotRegion[benchSlot as keyof typeof benchSlotRegion]);
            const isEmpty = await this.isBenchSlotEmpty(benchSlot, benchRegion);

            if (isEmpty) {
                logger.info(`[备战席槽位 ${benchSlot.slice(-1)}] 检测为空，跳过点击`);
                benchUnits.push(null);
                continue;
            }

            // 右键点击槽位显示详细信息
            await mouseController.clickAt(benchSlotPoints[benchSlot], Button.RIGHT);

            await sleep(10); // 等待 UI 渲染完成（右键后游戏会立即刷新 UI，10ms 足够）

            // 识别英雄名称
            const nameRegion = screenCapture.toAbsoluteRegion(detailChampionNameRegion);
            const namePng = await screenCapture.captureRegionAsPng(nameRegion);
            const text = await ocrService.recognize(namePng, OcrWorkerType.CHESS);
            let cleanName = text.replace(/\s/g, "");


            // 尝试从 OCR 结果中找到匹配的英雄
            let tftUnit: TFTUnit | null = TFT_16_CHAMPION_DATA[cleanName] || null;

            // OCR 失败时使用模板匹配兜底
            if (!tftUnit) {
                logger.warn(`[备战席槽位 ${benchSlot.slice(-1)}] OCR 识别失败，尝试模板匹配...`);
                // 喵~ 同样的，复用 namePng (3x 放大后的图片)
                const mat = await screenCapture.pngBufferToMat(namePng);
                // 转灰度
                if (mat.channels() > 1) {
                    cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
                }

                cleanName = templateMatcher.matchChampion(mat) || "";
                mat.delete();
            }

            tftUnit = TFT_16_CHAMPION_DATA[cleanName] || null;

            if (tftUnit) {
                // 识别星级
                const starRegion = screenCapture.toAbsoluteRegion(detailChampionStarRegion);
                const starPng = await screenCapture.captureRegionAsPng(starRegion, false);
                const starMat = await screenCapture.pngBufferToMat(starPng);
                const starLevel = templateMatcher.matchStarLevel(starMat);
                starMat.delete();

                // 识别棋子携带的装备（详情面板右键后已显示，直接读取即可）
                const equips = await this.getDetailPanelEquips();

                logger.info(
                    `[备战席槽位 ${benchSlot.slice(-1)}] 识别成功 -> ` +
                    `${tftUnit.displayName} (${tftUnit.price}费-${starLevel}星)` +
                    (equips.length > 0 ? ` [装备: ${equips.map(e => e.name).join(', ')}]` : '')
                );

                benchUnits.push({
                    location: benchSlot as BenchLocation,
                    tftUnit,
                    starLevel,
                    equips,
                });
            } else {
                // 英雄识别失败，尝试检测是否为基础装备锻造器
                const clickPoint = benchSlotPoints[benchSlot as keyof typeof benchSlotPoints];
                // 从槽位名称中提取槽位索引 (SLOT_1 -> 1, SLOT_9 -> 9)
                const slotIndex = parseInt(benchSlot.slice(-1));
                const isItemForge = await this.checkItemForgeTooltip(clickPoint, slotIndex);

                // 关闭浮窗：再次右键点击同一位置，避免浮窗遮挡后续槽位的检测
                await mouseController.clickAt(benchSlotPoints[benchSlot], Button.RIGHT);
                await sleep(10) // 等待 UI 渲染完成（右键后游戏会立即刷新 UI，10ms 足够）
                if (isItemForge) {
                    logger.info(`[备战席槽位 ${benchSlot.slice(-1)}] 识别为基础装备锻造器`);
                    // 基础装备锻造器作为特殊单位处理，
                    benchUnits.push({
                        location: benchSlot as BenchLocation,
                        tftUnit: TFT_16_CHAMPION_DATA.基础装备锻造器,
                        starLevel: -1,  // 锻造器无星级
                        equips: [],
                    });
                } else {
                    this.handleRecognitionFailure("bench", benchSlot.slice(-1), cleanName, namePng);
                    benchUnits.push(null);
                }
            }
        }

        return benchUnits;
    }

    /**
     * 获取当前棋盘上的棋子信息
     * @description 通过右键点击棋子，识别详情面板中的英雄名和星级
     *              棋盘为 4 行 7 列，共 28 个槽位
     * @returns 棋盘棋子数组 (空槽位为 null)
     */
    public async getFightBoardInfo(): Promise<(BoardUnit | null)[]> {
        logger.info("[TftOperator] 正在扫描棋盘上的 28 个槽位...");
        const boardUnits: (BoardUnit | null)[] = [];

        // 遍历所有棋盘槽位 (R1_C1 ~ R4_C7)
        for (const boardSlot of Object.keys(fightBoardSlotPoint)) {
            // 先检测该槽位是否为空：对比空槽模板
            const boardRegion = screenCapture.toAbsoluteRegion(
                fightBoardSlotRegion[boardSlot as keyof typeof fightBoardSlotRegion]
            );
            const isEmpty = await this.isFightBoardSlotEmpty(boardSlot, boardRegion);

            if (isEmpty) {
                logger.debug(`[棋盘槽位 ${boardSlot}] 检测为空，跳过点击`);
                boardUnits.push(null);
                continue;
            }

            // 右键点击槽位显示详细信息
            const clickPoint = fightBoardSlotPoint[boardSlot as keyof typeof fightBoardSlotPoint];
            await mouseController.clickAt(clickPoint, Button.RIGHT);

            await sleep(10); // 等待 UI 渲染完成（右键后游戏会立即刷新 UI，10ms 足够）

            // 识别英雄名称
            const nameRegion = screenCapture.toAbsoluteRegion(detailChampionNameRegion);
            const namePng = await screenCapture.captureRegionAsPng(nameRegion);
            const text = await ocrService.recognize(namePng, OcrWorkerType.CHESS);
            let cleanName = text.replace(/\s/g, "");

            // 尝试从 OCR 结果中找到匹配的英雄
            let tftUnit: TFTUnit | null = TFT_16_CHAMPION_DATA[cleanName] || null;

            // OCR 失败时使用模板匹配兜底
            if (!tftUnit) {
                logger.warn(`[棋盘槽位 ${boardSlot}] OCR 识别失败，尝试模板匹配...`);
                const mat = await screenCapture.pngBufferToMat(namePng);
                // 转灰度
                if (mat.channels() > 1) {
                    cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
                }
                cleanName = templateMatcher.matchChampion(mat) || "";
                mat.delete();
            }

            tftUnit = TFT_16_CHAMPION_DATA[cleanName] || null;

            if (tftUnit) {
                // 识别星级
                const starRegion = screenCapture.toAbsoluteRegion(detailChampionStarRegion);
                const starPng = await screenCapture.captureRegionAsPng(starRegion, false);
                const starMat = await screenCapture.pngBufferToMat(starPng);
                const starLevel = templateMatcher.matchStarLevel(starMat);
                starMat.delete();

                // 识别棋子携带的装备（详情面板右键后已显示，直接读取即可）
                const equips = await this.getDetailPanelEquips();

                logger.info(
                    `[棋盘槽位 ${boardSlot}] 识别成功 -> ` +
                    `${tftUnit.displayName} (${tftUnit.price}费-${starLevel}星)` +
                    (equips.length > 0 ? ` [装备: ${equips.map(e => e.name).join(', ')}]` : '')
                );

                boardUnits.push({
                    location: boardSlot as BoardLocation,
                    tftUnit,
                    starLevel,
                    equips,
                });
            } else {
                // 识别失败
                this.handleRecognitionFailure("board", boardSlot, cleanName, namePng);
                boardUnits.push(null);
            }
        }

        logger.info(`[TftOperator] 棋盘扫描完成，识别到 ${boardUnits.filter(u => u !== null).length} 个棋子`);
        return boardUnits;
    }

    /**
     * 判断棋盘槽位是否为空
     * @description 通过 templateLoader 获取空槽模板，比较当前截图的 RGBA 均值差异
     * @param slotKey 槽位 key，例如 R1_C1
     * @param region nut-js Region (绝对坐标)
     */
    private async isFightBoardSlotEmpty(slotKey: string, region: Region): Promise<boolean> {
        if (!templateLoader.isReady()) {
            logger.warn("[TftOperator] 模板未加载完成，空槽检测暂时跳过");
            return false; // 无法判断时，默认继续点击以保证功能
        }

        // 从 templateLoader 获取槽位模板 (RGBA)
        const tmpl = templateLoader.getFightBoardSlotTemplate(slotKey);
        if (!tmpl) {
            logger.warn(`[TftOperator] 未找到棋盘槽位模板: ${slotKey}，跳过空槽检测`);
            return false;
        }

        // 计算与模板的差异
        const meanDiff = await this.calculateSlotDifference(region, tmpl);

        // 棋盘槽位的阈值可能需要调整，暂时复用备战席的阈值
        const isEmpty = meanDiff < this.benchEmptyDiffThreshold;

        if (!isEmpty) {
            logger.debug(`[TftOperator] 棋盘槽位 ${slotKey} 判定为占用, meanDiff=${meanDiff.toFixed(2)}`);
        }

        return isEmpty;
    }

    /**
     * 保存备战席槽位截图到本地 (benchSlotRegion)
     * 用于采集空槽/有子样本，帮助后续做占用检测或模板生成
     */
    public async saveBenchSlotSnapshots(): Promise<void> {
        this.ensureInitialized();
        const saveDir = this.benchSlotSnapshotPath;
        fs.ensureDirSync(saveDir);

        for (const [slotKey, regionDef] of Object.entries(benchSlotRegion)) {
            try {
                const region = screenCapture.toAbsoluteRegion(regionDef);
                // 不放大，拿 1x 原图，便于做差异/模板
                const pngBuffer = await screenCapture.captureRegionAsPng(region, false);
                const filename = `${slotKey}.png`;
                fs.writeFileSync(path.join(saveDir, filename), pngBuffer);
                logger.info(`[TftOperator] 保存备战席槽位截图: ${slotKey} -> ${filename}`);
            } catch (e: any) {
                logger.error(`[TftOperator] 保存备战席槽位截图失败: ${slotKey}, ${e.message}`);
            }
        }
    }

    /**
     * 保存棋盘槽位截图到本地 (fightBoardSlotRegion)
     * 文件名直接使用对象 key (如 R1_C1.png)
     */
    public async saveFightBoardSlotSnapshots(): Promise<void> {
        this.ensureInitialized();
        const saveDir = this.fightBoardSlotSnapshotPath;
        fs.ensureDirSync(saveDir);

        for (const [slotKey, regionDef] of Object.entries(fightBoardSlotRegion)) {
            try {
                const region = screenCapture.toAbsoluteRegion(regionDef);
                // 不放大，使用 1x 原始截图，便于差异/占用检测
                const pngBuffer = await screenCapture.captureRegionAsPng(region, false);
                const filename = `${slotKey}.png`;
                fs.writeFileSync(path.join(saveDir, filename), pngBuffer);
                logger.info(`[TftOperator] 保存棋盘槽位截图: ${slotKey} -> ${filename}`);
            } catch (e: any) {
                logger.error(`[TftOperator] 保存棋盘槽位截图失败: ${slotKey}, ${e.message}`);
            }
        }
    }

    // ============================================================================
    // 私有方法 (Private Methods)
    // ============================================================================

    /**
     * 比较截图与模板的 RGBA 均值差异，判断槽位是否为空
     * @description 通用的空槽检测方法，供备战席和棋盘槽位复用
     * @param region 槽位的绝对坐标区域
     * @param tmpl 空槽模板 (RGBA 格式的 cv.Mat)
     * @returns 平均像素差值 (RGB 三通道均值)
     */
    private async calculateSlotDifference(region: Region, tmpl: cv.Mat): Promise<number> {
        // 截取当前槽位 1x 原图 (RGBA)
        const pngBuffer = await screenCapture.captureRegionAsPng(region, false);
        let mat = await screenCapture.pngBufferToMat(pngBuffer);

        // 确保通道数一致：都转为 RGBA
        if (mat.channels() === 3) {
            cv.cvtColor(mat, mat, cv.COLOR_RGB2RGBA);
        }

        // 尺寸对齐：如果当前图尺寸与模板不同，按模板尺寸缩放
        if (mat.cols !== tmpl.cols || mat.rows !== tmpl.rows) {
            const resized = new cv.Mat();
            cv.resize(mat, resized, new cv.Size(tmpl.cols, tmpl.rows), 0, 0, cv.INTER_AREA);
            mat.delete();
            mat = resized;
        }

        // 计算绝对差值并求均值 (RGBA 四通道取平均)
        const diff = new cv.Mat();
        cv.absdiff(mat, tmpl, diff);
        const meanScalar = cv.mean(diff); // [R_mean, G_mean, B_mean, A_mean]
        // 取 RGB 三通道的平均值（忽略 Alpha）
        const meanDiff = (meanScalar[0] + meanScalar[1] + meanScalar[2]) / 3;

        // 释放资源
        diff.delete();
        mat.delete();

        return meanDiff;
    }

    /**
     * 判断备战席槽位是否为空
     * @description 通过 templateLoader 获取空槽模板，比较当前截图的 RGBA 均值差异
     * @param slotKey 槽位 key，例如 SLOT_1
     * @param region nut-js Region (绝对坐标)
     */
    private async isBenchSlotEmpty(slotKey: string, region: Region): Promise<boolean> {
        if (!templateLoader.isReady()) {
            logger.warn("[TftOperator] 模板未加载完成，空槽检测暂时跳过");
            return false; // 无法判断时，默认继续点击以保证功能
        }

        // 从 templateLoader 获取槽位模板 (RGBA)
        const tmpl = templateLoader.getBenchSlotTemplate(slotKey);
        if (!tmpl) {
            logger.warn(`[TftOperator] 未找到槽位模板: ${slotKey}，跳过空槽检测`);
            return false;
        }

        // 计算与模板的差异
        const meanDiff = await this.calculateSlotDifference(region, tmpl);

        // 平均差值大于阈值 -> 判定"有棋子占用"
        const isEmpty = meanDiff < this.benchEmptyDiffThreshold;

        if (!isEmpty) {
            logger.debug(`[TftOperator] 槽位 ${slotKey} 判定为占用, meanDiff=${meanDiff.toFixed(2)}`);
        }

        return isEmpty;
    }

    /**
     * 检测当前是否显示基础装备锻造器的浮窗
     * @description 基础装备锻造器右键后不会在固定位置显示详情，
     *              而是在鼠标点击位置附近弹出浮窗，需要用相对偏移量计算实际区域
     * @param clickPoint 右键点击的位置 (游戏内相对坐标)
     * @param slotIndex 备战席槽位索引 (1-9)，用于判断是否为边缘情况
     * @returns 是否为基础装备锻造器
     */
    private async checkItemForgeTooltip(clickPoint: SimplePoint, slotIndex: number): Promise<boolean> {
        this.ensureInitialized();

        // 判断是否为边缘情况 (槽位 6-9 靠近屏幕右边缘，浮窗会向左弹出)
        const isEdgeCase = slotIndex >= 6;
        const tooltipRegion = isEdgeCase ? itemForgeTooltipRegionEdge : itemForgeTooltipRegion;

        // 计算浮窗名称区域的绝对坐标
        let absoluteRegion: Region;
        if (isEdgeCase) {
            // 边缘情况（槽位 6-9）：
            // - X 坐标：基于游戏窗口的绝对坐标（tooltipRegion.leftTop.x 已经是相对游戏窗口的）
            // - Y 坐标：基于鼠标点击位置的偏移量（需要加上 clickPoint.y）
            absoluteRegion = new Region(
                Math.round(this.gameWindowRegion!.x + tooltipRegion.leftTop.x),
                Math.round(this.gameWindowRegion!.y + clickPoint.y + tooltipRegion.leftTop.y),
                Math.round(tooltipRegion.rightBottom.x - tooltipRegion.leftTop.x),
                Math.round(tooltipRegion.rightBottom.y - tooltipRegion.leftTop.y)
            );
            logger.debug(`[TftOperator] 边缘槽位 ${slotIndex}，X坐标固定=${tooltipRegion.leftTop.x}，Y偏移=${tooltipRegion.leftTop.y}`);
        } else {
            // 正常情况（槽位 1-5）：X、Y 坐标都相对于鼠标点击位置计算
            absoluteRegion = new Region(
                Math.round(this.gameWindowRegion!.x + clickPoint.x + tooltipRegion.leftTop.x),
                Math.round(this.gameWindowRegion!.y + clickPoint.y + tooltipRegion.leftTop.y),
                Math.round(tooltipRegion.rightBottom.x - tooltipRegion.leftTop.x),
                Math.round(tooltipRegion.rightBottom.y - tooltipRegion.leftTop.y)
            );
        }

        // 截图时不做任何预处理 (forOCR = false)
        // 锻造器浮窗的文字在二值化/灰度化后会变得细碎，直接用原图 OCR
        const rawPngBuffer = await screenCapture.captureRegionAsPng(absoluteRegion, false);

        // 直接用原图进行 OCR，不做任何图像处理
        const text = await ocrService.recognize(rawPngBuffer, OcrWorkerType.CHESS);
        const cleanText = text.replace(/\s/g, "");

        logger.debug(`[TftOperator] 锻造器浮窗 OCR 结果: "${cleanText}"`);

        // 判断是否包含"基础装备锻造器"关键字
        // 使用模糊匹配，因为 OCR 可能有误差
        const isItemForge = cleanText.includes("基础装备锻造器") ||
                           cleanText.includes("基础装备") ||
                           cleanText.includes("锻造器");

        // 识别失败时保存截图到英雄备份文件夹，方便排查问题
        if (!isItemForge) {
            const saveDir = this.failChampionTemplatePath;
            fs.ensureDirSync(saveDir);
            const filename = `itemForge_slot${slotIndex}_${Date.now()}.png`;
            const savePath = path.join(saveDir, filename);
            fs.writeFileSync(savePath, rawPngBuffer);  // 保存原图，方便排查
            logger.warn(`[TftOperator] 锻造器识别失败(槽位${slotIndex})，已保存截图: ${filename}`);
        }

        return isItemForge;
    }


    /**
     * 获取游戏阶段显示区域
     * @param isStageOne 是否为第一阶段 (UI 位置不同)
     */

    private getStageAbsoluteRegion(isStageOne: boolean = false): Region {
        this.ensureInitialized();

        const display = isStageOne ? gameStageDisplayStageOne : gameStageDisplayNormal;

        return new Region(
            Math.round(this.gameWindowRegion!.x + display.leftTop.x),
            Math.round(this.gameWindowRegion!.y + display.leftTop.y),
            Math.round(display.rightBottom.x - display.leftTop.x),
            Math.round(display.rightBottom.y - display.leftTop.y)
        );
    }

    /**
     * 获取发条鸟试炼模式的阶段显示区域
     */
    private getClockworkTrialsRegion(): Region {
        return new Region(
            this.gameWindowRegion!.x + gameStageDisplayTheClockworkTrails.leftTop.x,
            this.gameWindowRegion!.y + gameStageDisplayTheClockworkTrails.leftTop.y,
            gameStageDisplayTheClockworkTrails.rightBottom.x - gameStageDisplayTheClockworkTrails.leftTop.x,
            gameStageDisplayTheClockworkTrails.rightBottom.y - gameStageDisplayTheClockworkTrails.leftTop.y
        );
    }

    /**
     * 确保操作器已初始化
     * @throws 如果未初始化
     */
    private ensureInitialized(): void {
        if (!this.gameWindowRegion) {
            logger.error("[TftOperator] 尝试在 init() 之前操作");
            if (!this.init()) {
                throw new Error("[TftOperator] 未初始化，请先调用 init()");
            }
        }
    }

    /**
     * 处理识别失败的情况
     * @param type 识别类型 (shop/bench)
     * @param slot 槽位标识
     * @param recognizedName 识别到的名称
     * @param imageBuffer 截图 Buffer
     */
    private handleRecognitionFailure(
        type: "shop" | "bench" | "board",
        slot: string | number,
        recognizedName: string | null,
        imageBuffer: Buffer
    ): void {
        if (recognizedName === "empty") {
            logger.info(`[${type}槽位 ${slot}] 识别为空槽位`);
        } else if (recognizedName && recognizedName.length > 0) {
            logger.warn(`[${type}槽位 ${slot}] 匹配到模板但名称未知: ${recognizedName}`);
        } else {
            logger.warn(`[${type}槽位 ${slot}] 识别失败，保存截图...`);
            const filename = `fail_${type}_slot_${slot}_${Date.now()}.png`;
            fs.writeFileSync(path.join(this.failChampionTemplatePath, filename), imageBuffer);
            //logger.warn(`[${type}槽位 ${slot}] 识别失败，兜底判定为空槽位`);
        }
    }

    /**
     * 保存识别失败的图片
     * @param type 类型标识
     * @param slot 槽位标识
     * @param mat OpenCV Mat 对象
     * @param channels 通道数
     */
    private async saveFailedImage(
        type: string,
        slot: string,
        mat: cv.Mat,
        channels: 3 | 4
    ): Promise<void> {
        try {
            const fileName = `${type}_${slot}_${Date.now()}.png`;
            const pngBuffer = await sharp(mat.data, {
                raw: {
                    width: mat.cols,
                    height: mat.rows,
                    channels,
                },
            })
                .png()
                .toBuffer();

            fs.writeFileSync(path.join(this.equipTemplatePath, fileName), pngBuffer);
            logger.info(`[TftOperator] 已保存失败样本: ${fileName}`);
        } catch (e) {
            logger.error(`[TftOperator] 保存失败样本出错: ${e}`);
        }
    }

    /**
     * 获取当前等级信息
     * @description 通过 OCR 识别左下角等级区域，解析等级和经验值
     * @returns 等级信息对象，包含当前等级、当前经验值、升级所需总经验值
     * 
     * @example
     * // 扫描区域内容示例: "4级  4/6"
     * const levelInfo = await operator.getLevelInfo();
     * // 返回: { level: 4, currentXp: 4, totalXp: 6 }
     */
    public async getLevelInfo(): Promise<{ level: number; currentXp: number; totalXp: number } | null> {
        this.ensureInitialized();

        try {
            // 1. 计算等级区域的绝对坐标
            const absoluteRegion = new Region(
                Math.round(this.gameWindowRegion!.x + levelRegion.leftTop.x),
                Math.round(this.gameWindowRegion!.y + levelRegion.leftTop.y),
                Math.round(levelRegion.rightBottom.x - levelRegion.leftTop.x),
                Math.round(levelRegion.rightBottom.y - levelRegion.leftTop.y)
            );

            // 2. 截图并 OCR 识别
            const pngBuffer = await screenCapture.captureRegionAsPng(absoluteRegion);
            const text = await ocrService.recognize(pngBuffer, OcrWorkerType.LEVEL);
            
            // logger.info(`[TftOperator] 等级区域 OCR 结果: "${text}"`);

            // 3. 解析文本，格式示例: "4级  4/6" 或 "4级 4/6"
            // 正则匹配: 数字 + "级" + 空格 + 数字 + "/" + 数字
            const match = text.match(/(\d+)\s*级\s*(\d+)\s*\/\s*(\d+)/);
            
            if (match) {
                const level = parseInt(match[1], 10);
                const currentXp = parseInt(match[2], 10);
                const totalXp = parseInt(match[3], 10);

                logger.info(`[TftOperator] 等级解析成功: Lv.${level}, 经验 ${currentXp}/${totalXp}`);
                
                return { level, currentXp, totalXp };
            }

            logger.warn(`[TftOperator] 等级解析失败，无法匹配格式: "${text}"`);
            return null;
        } catch (error) {
            logger.error(`[TftOperator] 获取等级信息异常: ${error}`);
            return null;
        }
    }

    /**
     * 获取当前持有的金币数量
     * @description 通过 OCR 识别左下角金币区域，解析当前金币数
     *              金币显示区域只会出现 0-9 的数字，复用 GAME_STAGE worker
     * @returns 金币数量，识别失败返回 null
     * 
     * @example
     * const coins = await operator.getCoinCount();
     * // 返回: 50 (当前持有 50 金币)
     */
    public async getCoinCount(): Promise<number | null> {
        this.ensureInitialized();

        try {
            // 1. 计算金币区域的绝对坐标
            const absoluteRegion = new Region(
                Math.round(this.gameWindowRegion!.x + coinRegion.leftTop.x),
                Math.round(this.gameWindowRegion!.y + coinRegion.leftTop.y),
                Math.round(coinRegion.rightBottom.x - coinRegion.leftTop.x),
                Math.round(coinRegion.rightBottom.y - coinRegion.leftTop.y)
            );

            // 2. 截图并 OCR 识别
            // 复用 GAME_STAGE worker，因为金币只会是 0-9 的数字
            const pngBuffer = await screenCapture.captureRegionAsPng(absoluteRegion);
            const text = await ocrService.recognize(pngBuffer, OcrWorkerType.GAME_STAGE);

            // 3. 解析数字（去除空格和非数字字符）
            const cleanText = text.replace(/\D/g, "");

            if (cleanText.length > 0) {
                const coinCount = parseInt(cleanText, 10);
                logger.info(`[TftOperator] 金币识别成功: ${coinCount}`);
                return coinCount;
            }

            logger.warn(`[TftOperator] 金币解析失败，OCR 结果: "${text}"`);
            return null;
        } catch (error) {
            logger.error(`[TftOperator] 获取金币数量异常: ${error}`);
            return null;
        }
    }

    /**
     * 检测当前画面中的战利品球
     * @description 扫描战利品掉落区域，通过模板匹配识别所有战利品球
     *              支持识别普通(银色)、蓝色、金色三种等级的战利品球
     * @returns 检测到的战利品球数组，包含位置、类型和置信度
     * 
     * @example
     * const lootOrbs = await operator.getLootOrbs();
     * // 返回: [{ x: 450, y: 300, type: 'gold', confidence: 0.92 }, ...]
     */
    public async getLootOrbs(): Promise<LootOrb[]> {
        this.ensureInitialized();

        if (!templateLoader.isReady()) {
            logger.warn("[TftOperator] 模板未加载完成，跳过战利品球检测");
            return [];
        }

        try {
            // 1. 计算战利品掉落区域的绝对坐标
            const absoluteRegion = new Region(
                Math.round(this.gameWindowRegion!.x + lootRegion.leftTop.x),
                Math.round(this.gameWindowRegion!.y + lootRegion.leftTop.y),
                Math.round(lootRegion.rightBottom.x - lootRegion.leftTop.x),
                Math.round(lootRegion.rightBottom.y - lootRegion.leftTop.y)
            );

            // 2. 截取区域图像 (captureRegionAsMat 返回 RGB 3 通道，正好用于模板匹配)
            const targetMat = await screenCapture.captureRegionAsMat(absoluteRegion);

            // 3. 执行多目标模板匹配
            const relativeOrbs = templateMatcher.matchLootOrbs(targetMat);

            // 4. 将相对坐标转换为游戏窗口内的坐标
            const absoluteOrbs: LootOrb[] = relativeOrbs.map((orb) => {
                const absX = orb.x + lootRegion.leftTop.x;
                const absY = orb.y + lootRegion.leftTop.y;
                logger.debug(
                    `[TftOperator] 检测到战利品球: ${orb.type} ` +
                    `位置 (${absX}, ${absY}), 置信度 ${(orb.confidence * 100).toFixed(1)}%`
                );
                return { ...orb, x: absX, y: absY };
            });

            // 5. 释放资源
            targetMat.delete();

            logger.info(
                `[TftOperator] 战利品球检测完成: ` +
                `普通 ${absoluteOrbs.filter(o => o.type === 'normal').length} 个, ` +
                `蓝色 ${absoluteOrbs.filter(o => o.type === 'blue').length} 个, ` +
                `金色 ${absoluteOrbs.filter(o => o.type === 'gold').length} 个`
            );

            return absoluteOrbs;
        } catch (error) {
            logger.error(`[TftOperator] 战利品球检测异常: ${error}`);
            return [];
        }
    }
}

// ============================================================================
// 导出
// ============================================================================

/** TftOperator 单例实例 */
export const tftOperator = TftOperator.getInstance();
