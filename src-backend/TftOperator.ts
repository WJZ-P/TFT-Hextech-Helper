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
import { Region } from "@nut-tree-fork/nut-js";
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
    equipmentSlot,
    fightBoardSlotPoint,

    fightBoardSlotRegion,
    gameStageDisplayNormal,
    gameStageDisplayStageOne,
    gameStageDisplayTheClockworkTrails,
    GameStageResult,
    GameStageType,
    hexSlot,
    ItemForgeType,
    itemForgeTooltipRegion,
    itemForgeTooltipRegionEdge,
    levelRegion,
    littleLegendDefaultPoint,
    lootRegion,
    selfWalkAroundPoints,
    shopSlot,
    shopSlotNameRegions,
    ShopSlotIndex,
    refreshShopPoint,
    buyExpPoint,
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
    MouseButtonType,
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

    /** 
     * 上一次随机走位的方向
     * @description 用于实现左右交替走动，让行为更像真人
     *              'left' 表示上次走的是左边，下次应该走右边
     *              'right' 表示上次走的是右边，下次应该走左边
     */
    private lastWalkSide: 'left' | 'right' = 'left';

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
     * @returns 游戏阶段结果，包含阶段类型和原始文本
     */
    public async getGameStage(): Promise<GameStageResult> {
        try {
            /**
             * 阶段识别统一使用 `forOCR=false`（原图，不做二值化/灰度等预处理）。
             *
             * 原因：海克斯出现时背景会整体变暗，二值化(threshold)会丢失大量细节，
             * 直接导致 "2-1" 这类阶段文字被“吃掉”。用原图 OCR 能保留色彩/对比信息。
             */
            const recognizeStageText = async (region: Region): Promise<string> => {
                const rawPng = await screenCapture.captureRegionAsPng(region, false);
                return await ocrService.recognize(rawPng, OcrWorkerType.GAME_STAGE);
            };

            let stageText = "";

            // 1. 尝试识别标准区域 (2-1, 3-5, 4-2 等)
            const normalRegion = this.getStageAbsoluteRegion(false);
            stageText = await recognizeStageText(normalRegion);

            // 2. 如果标准区域识别失败，尝试 Stage 1 区域
            if (!isValidStageFormat(stageText)) {
                // logger.info(`[TftOperator] 标准区域识别未命中: "${stageText}"，尝试 Stage-1 区域...`);
                const stageOneRegion = this.getStageAbsoluteRegion(true);
                stageText = await recognizeStageText(stageOneRegion);
            }

            // 3. 检查是否为"发条鸟试炼"模式
            if (!isValidStageFormat(stageText)) {
                const clockworkRegion = this.getClockworkTrialsRegion();
                const clockText = await recognizeStageText(clockworkRegion);

                if (clockText && clockText.length > 2) {
                    this.tftMode = TFTMode.CLOCKWORK_TRAILS;
                    logger.info("[TftOperator] 识别为发条鸟试炼模式");
                    // 发条鸟模式没有标准阶段文本，用特殊标记
                    return { type: GameStageType.PVP, stageText: "clockwork" };
                }
            }

            // 4. 解析阶段字符串
            const stageType = parseStageStringToEnum(stageText);

            if (stageType !== GameStageType.UNKNOWN) {
                // logger.info(`[TftOperator] 识别阶段: [${stageText}] -> ${stageType}`);
                this.tftMode = TFTMode.CLASSIC;
            } else {
                logger.warn(`[TftOperator] 无法识别当前阶段: "${stageText ?? "null"}"`);
            }

            return { type: stageType, stageText: stageText || "" };
        } catch (e: any) {
            logger.error(`[TftOperator] 阶段识别异常: ${e.message}`);
            return { type: GameStageType.UNKNOWN, stageText: "" };
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
                logger.warn(`[商店槽位 ${i}] OCR 识别失败，尝试模板匹配...`, true);
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
                logger.debug(`[商店槽位 ${i}] 识别成功 -> ${tftUnit.displayName} (${tftUnit.price}费)`);
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

                if (!matchResult) {
                    logger.error(`[TftOperator] ${slotName} 槽位识别失败`);
                    // 【已注释】保存装备栏识别失败的截图到本地，用于排查问题
                    // await this.saveFailedImage("equip", slotName, targetMat, 3);
                    continue;
                }

                // 空槽位不写入结果列表：让上层拿到的是“紧凑装备数组”，避免把 10 个空格当成 10 件装备。
                if (matchResult.name === "空槽位") {
                    logger.debug(`[TftOperator] ${slotName} 为空槽位`);
                    continue;
                }

                // 注意：这里把 slot 统一写成紧凑后的槽位（SLOT_1..SLOT_n）。
                // 这样 StrategyService/GameStateManager 的“索引=槽位”假设始终成立。
                matchResult.slot = `SLOT_${resultEquips.length + 1}`;

                logger.debug(
                    `[TftOperator] ${slotName} 识别成功: ${matchResult.name} ` +
                    `(相似度: ${(matchResult.confidence * 100).toFixed(1)}%)`
                );

                resultEquips.push(matchResult);
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
     * 检查指定商店槽位是否为空
     * @param slotIndex 槽位索引 (0-4)
     * @returns true 表示槽位为空（购买成功），false 表示还有棋子（购买失败）
     * @description 复用 templateMatcher.matchChampion 的空槽检测逻辑
     *              matchChampion 内部会先调用 isEmptySlot 快速检测空槽
     *              如果返回 "empty" 则表示槽位为空
     */
    public async isShopSlotEmpty(slotIndex: ShopSlotIndex): Promise<boolean> {
        // 槽位索引 0-4 对应 SLOT_1 到 SLOT_5
        const slotKey = `SLOT_${slotIndex + 1}` as keyof typeof shopSlotNameRegions;
        const region = screenCapture.toAbsoluteRegion(shopSlotNameRegions[slotKey]);

        // 截图并转为灰度图
        const processedPng = await screenCapture.captureRegionAsPng(region);
        const mat = await screenCapture.pngBufferToMat(processedPng);
        if (mat.channels() > 1) {
            cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
        }

        // matchChampion 内部会先检测空槽，空槽返回 "empty"
        const result = templateMatcher.matchChampion(mat);
        mat.delete();

        // 返回 "empty" 或 null 都表示槽位为空
        return result === "empty" || result === null;
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

        // 单击购买
        await mouseController.clickAt(targetPoint, MouseButtonType.LEFT);
    }

    /**
     * 刷新商店 (D牌)
     */
    public async refreshShop(): Promise<void> {
        this.ensureInitialized();
        logger.info("[TftOperator] 刷新商店");
        await mouseController.clickAt(refreshShopPoint, MouseButtonType.LEFT);
        // 刷新后需要一点时间让新棋子出现
        await sleep(20);
    }

    /**
     * 购买经验值 (F键)
     */
    public async buyExperience(): Promise<void> {
        this.ensureInitialized();
        logger.info("[TftOperator] 购买经验值");
        await mouseController.clickAt(buyExpPoint, MouseButtonType.LEFT);
        await sleep(10);
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
            await mouseController.clickAt(benchSlotPoints[benchSlot], MouseButtonType.RIGHT);

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
                logger.warn(`[备战席槽位 ${benchSlot.slice(-1)}] OCR 识别失败，尝试模板匹配...`, true);
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

                logger.debug(
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
                // 英雄识别失败，尝试检测是否为锻造器（基础装备锻造器 或 成装锻造器）
                const clickPoint = benchSlotPoints[benchSlot as keyof typeof benchSlotPoints];
                // 从槽位名称中提取槽位索引 (SLOT_1 -> 1, SLOT_9 -> 9)
                const slotIndex = parseInt(benchSlot.slice(-1));
                const forgeType = await this.checkItemForgeTooltip(clickPoint, slotIndex);

                // 关闭浮窗：再次右键点击同一位置，避免浮窗遮挡后续槽位的检测
                await mouseController.clickAt(benchSlotPoints[benchSlot], MouseButtonType.RIGHT);
                await sleep(10); // 等待 UI 渲染完成（右键后游戏会立即刷新 UI，10ms 足够）
                
                if (forgeType !== ItemForgeType.NONE) {
                    // 根据锻造器类型选择对应的棋子数据
                    const forgeUnit = forgeType === ItemForgeType.COMPLETED 
                        ? TFT_16_CHAMPION_DATA.成装锻造器 
                        : TFT_16_CHAMPION_DATA.基础装备锻造器;
                    const forgeName = forgeType === ItemForgeType.COMPLETED ? "成装锻造器" : "基础装备锻造器";
                    
                    logger.info(`[备战席槽位 ${benchSlot.slice(-1)}] 识别为${forgeName}`);
                    // 锻造器作为特殊单位处理
                    benchUnits.push({
                        location: benchSlot as BenchLocation,
                        tftUnit: forgeUnit,
                        starLevel: -1,  // 锻造器无星级
                        equips: [],
                    });
                } else {
                    // 英雄和锻造器都识别失败，说明是误识别（空槽位被误判为有棋子）
                    this.handleRecognitionFailure("bench", benchSlot.slice(-1), cleanName, namePng);
                    benchUnits.push(null);
                    
                    // 归位小小英雄：右键点击空槽位会导致小小英雄走过去，影响后续识别
                    await this.selfResetPosition();
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
            await mouseController.clickAt(clickPoint, MouseButtonType.RIGHT);

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
                logger.warn(`[棋盘槽位 ${boardSlot}] OCR 识别失败，尝试模板匹配...`, true);
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

                logger.debug(
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
     * 检测当前是否显示锻造器的浮窗，并识别锻造器类型
     * @description 锻造器右键后不会在固定位置显示详情，
     *              而是在鼠标点击位置附近弹出浮窗，需要用相对偏移量计算实际区域
     *              支持识别：基础装备锻造器、成装锻造器、神器装备锻造器、辅助装锻造器
     * @param clickPoint 右键点击的位置 (游戏内相对坐标)
     * @param slotIndex 备战席槽位索引 (1-9)，用于判断是否为边缘情况
     * @returns 锻造器类型 (NONE 表示不是锻造器)
     */
    private async checkItemForgeTooltip(clickPoint: SimplePoint, slotIndex: number): Promise<ItemForgeType> {
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

        // 判断锻造器类型
        // 注意：判断顺序很重要，更具体的关键词要放在前面
        // 使用模糊匹配，因为 OCR 可能有误差
        
        // 1. 成装锻造器判断（"成装"是独特关键词）
        const isCompletedForge = cleanText.includes("成装锻造器") ||
                                 cleanText.includes("成装锻造") ||
                                 cleanText.includes("成装");
        
        if (isCompletedForge) {
            logger.debug(`[TftOperator] 识别为成装锻造器`);
            return ItemForgeType.COMPLETED;
        }

        // 2. 神器装备锻造器判断（"神器"是独特关键词）
        const isArtifactForge = cleanText.includes("神器装备锻造器") ||
                                cleanText.includes("神器装备") ||
                                cleanText.includes("神器");
        
        if (isArtifactForge) {
            logger.debug(`[TftOperator] 识别为神器装备锻造器`);
            return ItemForgeType.ARTIFACT;
        }

        // 3. 辅助装锻造器判断（"辅助装"是独特关键词）
        const isSupportForge = cleanText.includes("辅助装锻造器") ||
                               cleanText.includes("辅助装锻造") ||
                               cleanText.includes("辅助装");
        
        if (isSupportForge) {
            logger.debug(`[TftOperator] 识别为辅助装锻造器`);
            return ItemForgeType.SUPPORT;
        }
        
        // 4. 基础装备锻造器判断（放最后，因为"锻造器"是通用关键词）
        const isBasicForge = cleanText.includes("基础装备锻造器") ||
                            cleanText.includes("基础装备") ||
                            cleanText.includes("锻造器");
        
        if (isBasicForge) {
            logger.debug(`[TftOperator] 识别为基础装备锻造器`);
            return ItemForgeType.BASIC;
        }

        // 【已注释】锻造器识别失败时保存截图到本地，用于排查问题
        // const saveDir = this.failChampionTemplatePath;
        // fs.ensureDirSync(saveDir);
        // const filename = `itemForge_slot${slotIndex}_${Date.now()}.png`;
        // const savePath = path.join(saveDir, filename);
        // fs.writeFileSync(savePath, rawPngBuffer);  // 保存原图，方便排查
        logger.warn(`[TftOperator] 锻造器识别失败(槽位${slotIndex})`, true);

        return ItemForgeType.NONE;
    }

    /**
     * 识别锻造器选择界面中的装备类型
     * @description 当玩家点击锻造器后，会弹出装备选择界面。
     *              此方法用于识别选择界面中各个槽位的装备。
     * 
     * 界面布局说明：
     * - 成装锻造器：5 选 1（5 个装备槽位）
     * - 其他锻造器（基础/神器/辅助）：4 选 1（4 个装备槽位）
     * 
     * @param slotNum 装备槽位数量，默认为 4（只有成装锻造器是 5）
     * @returns 识别到的装备数组（TFTEquip 类型）
     * 
     * @example
     * // 基础装备锻造器（4选1）
     * const equips = await operator.identifyForgeEquipments(4);
     * 
     * // 成装锻造器（5选1）
     * const equips = await operator.identifyForgeEquipments(5);
     * 
     * TODO: 实现装备识别逻辑
     * 1. 根据 slotNum 计算各个装备槽位的 region
     *    - 4 槽位和 5 槽位的布局不同，需要分别定义坐标
     * 2. 截取每个槽位的图像
     * 3. 使用 templateMatcher.matchEquip() 进行模板匹配
     * 4. 返回识别结果数组
     */
    public async identifyForgeEquipments(slotNum: number = 4): Promise<TFTEquip[]> {
        this.ensureInitialized();

        logger.info(`[TftOperator] 识别锻造器装备选择界面 (${slotNum} 槽位)...`);

        // TODO: 定义锻造器选择界面的装备槽位 region
        // 需要在 TFTProtocol.ts 中添加对应的坐标定义：
        // - forgeEquipSlotRegion4: 4 槽位布局的各个装备位置
        // - forgeEquipSlotRegion5: 5 槽位布局的各个装备位置

        // TODO: 根据 slotNum 选择对应的 region 配置
        // const slotRegions = slotNum === 5 
        //     ? forgeEquipSlotRegion5 
        //     : forgeEquipSlotRegion4;

        // TODO: 遍历各个槽位，截图并识别装备
        // const equips: TFTEquip[] = [];
        // for (const [slotKey, regionDef] of Object.entries(slotRegions)) {
        //     const targetRegion = screenCapture.toAbsoluteRegion(regionDef);
        //     const targetMat = await screenCapture.captureRegionAsMat(targetRegion);
        //     const matchResult = templateMatcher.matchEquip(targetMat);
        //     
        //     if (matchResult && matchResult.name !== "空槽位") {
        //         equips.push({
        //             name: matchResult.name,
        //             englishName: matchResult.englishName,
        //             equipId: matchResult.equipId,
        //             formula: matchResult.formula,
        //         });
        //     }
        //     targetMat.delete();
        // }
        // return equips;

        logger.warn(`[TftOperator] identifyForgeEquipments() 尚未实现`);
        return [];
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
            logger.debug(`[${type}槽位 ${slot}] 识别为空槽位`);
        } else if (recognizedName && recognizedName.length > 0) {
            logger.warn(`[${type}槽位 ${slot}] 匹配到模板但名称未知: ${recognizedName}`, true);
        } else {
            logger.warn(`[${type}槽位 ${slot}] 识别失败`, true);
            // 【已注释】保存识别失败的截图到本地，用于排查问题
            // const filename = `fail_${type}_slot_${slot}_${Date.now()}.png`;
            // fs.writeFileSync(path.join(this.failChampionTemplatePath, filename), imageBuffer);
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

            // 4. 兜底策略：当 "/" 被误识别为 "1" 时，尝试修复
            // 例如 "4级 416" 应该是 "4级 4/6"，"4级 12116" 应该是 "4级 12/16"
            const fallbackResult = this.tryFixMisrecognizedXp(text);
            if (fallbackResult) {
                logger.info(
                    `[TftOperator] 等级解析成功(兜底修复): Lv.${fallbackResult.level}, ` +
                    `经验 ${fallbackResult.currentXp}/${fallbackResult.totalXp}`
                );
                return fallbackResult;
            }

            logger.warn(`[TftOperator] 等级解析失败，无法匹配格式: "${text}"`);
            return null;
        } catch (error) {
            logger.error(`[TftOperator] 获取等级信息异常: ${error}`);
            return null;
        }
    }

    /**
     * 尝试修复 "/" 被误识别的经验值
     * @param text OCR 识别的原始文本
     * @returns 修复后的等级信息，无法修复返回 null
     * 
     * @description TFT 经验值规则：
     * - totalXp 只有固定的几个值: 2, 6, 10, 20, 36, 48, 76, 84
     * - currentXp 范围是 0 ~ totalXp-1（可以是奇数，比如通过任务/战斗获得 1 点经验）
     * - currentXp 和 totalXp 最多都是两位数
     * 
     * "/" 可能被误识别为 "1"、"7" 或 "0"：
     * - "4/6" → "416" 或 "476" 或 "406"
     * - "16/76" → "16176" 或 "16776" 或 "16076"
     * 
     * 修复策略：
     * 1. 匹配 "X级 数字串" 格式
     * 2. 遍历数字串的所有可能切分点（"1" 或 "7" 的位置）
     * 3. 检查切分后的 currentXp 和 totalXp 是否符合规则
     */
    private tryFixMisrecognizedXp(text: string): { level: number; currentXp: number; totalXp: number } | null {
        // TFT 各等级升级所需经验（totalXp 的所有合法值）
        // 等级3=2, 等级4=6, 等级5=10, 等级6=20, 等级7=36, 等级8=60, 等级9=68, 等级10=68
        const VALID_TOTAL_XP = new Set([2, 6, 10, 20, 36, 60, 68]);
        
        // "/" 可能被误识别的字符（斜杠形状类似 1、7，有时也会识别成 0）
        const SLASH_MISRECOGNIZED_CHARS = ['1', '7', '0'];

        // 匹配 "X级 纯数字" 格式（没有 / 的情况）
        const match = text.match(/(\d+)\s*级\s*(\d+)/);
        if (!match) return null;

        const level = parseInt(match[1], 10);
        const xpDigits = match[2]; // 例如 "416" 或 "576"

        // 遍历所有可能的切分点
        for (let i = 1; i < xpDigits.length; i++) {
            // 检查切分点是否是可能被误识别的字符（"1" 或 "7"）
            if (!SLASH_MISRECOGNIZED_CHARS.includes(xpDigits[i])) continue;

            const currentXpStr = xpDigits.substring(0, i);
            const totalXpStr = xpDigits.substring(i + 1);

            // 跳过空字符串或以 0 开头的多位数（如 "06"）
            if (!currentXpStr || !totalXpStr) continue;
            if (currentXpStr.length > 1 && currentXpStr[0] === '0') continue;
            if (totalXpStr.length > 1 && totalXpStr[0] === '0') continue;

            const currentXp = parseInt(currentXpStr, 10);
            const totalXp = parseInt(totalXpStr, 10);

            // 验证规则：
            // 1. totalXp 必须是合法值（这是最严格的约束）
            // 2. currentXp < totalXp（当前经验不能超过升级所需）
            // 3. currentXp >= 0（当前经验不能为负）
            // 4. currentXp 和 totalXp 都最多两位数
            if (
                VALID_TOTAL_XP.has(totalXp) &&
                currentXp >= 0 &&
                currentXp < totalXp &&
                currentXp <= 99 &&
                totalXp <= 99
            ) {
                logger.debug(
                    `[TftOperator] 兜底修复: "${xpDigits}" → "${currentXp}/${totalXp}" ` +
                    `(在位置 ${i} 处将 "${xpDigits[i]}" 还原为 "/")`
                );
                return { level, currentXp, totalXp };
            }
        }

        return null;
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

            // 4. 识别失败：可能有弹窗/海克斯选择/事件遮挡，尝试点击关闭遮挡
            logger.warn(`[TftOperator] 金币解析失败，OCR 结果: "${text}"，尝试点击关闭遮挡...`);
            
            // 4.1 先点击海克斯槽位 2（可能是海克斯选择弹窗遮挡了金币区域）
            await mouseController.clickAt(hexSlot.SLOT_2, MouseButtonType.LEFT);
            await sleep(50);

            // 4.2 再点击商店槽位 3 关闭可能的其他遮挡弹窗/事件
            await this.buyAtSlot(3);
            await sleep(100);  // 等待弹窗关闭动画

            // 5. 重新尝试识别一次
            const retryBuffer = await screenCapture.captureRegionAsPng(absoluteRegion);
            const retryText = await ocrService.recognize(retryBuffer, OcrWorkerType.GAME_STAGE);
            const retryClean = retryText.replace(/\D/g, "");

            if (retryClean.length > 0) {
                const coinCount = parseInt(retryClean, 10);
                logger.info(`[TftOperator] 金币重试识别成功: ${coinCount}`);
                return coinCount;
            }

            logger.warn(`[TftOperator] 金币重试仍失败，OCR 结果: "${retryText}"`);
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

    /**
     * 让小小英雄归位到默认站位
     * @description 通过右键点击两次默认站位坐标，让小小英雄移动回棋盘左下角
     *              用于：
     *              - 战斗结束后归位，避免遮挡棋盘
     *              - 拾取战利品前归位，确保路径规划的起点一致
     *              - 防挂机时的随机移动起点
     * 
     * 为什么点击两次？
     * - 第一次点击：发出移动指令
     * - 第二次点击：确保小小英雄确实开始移动（有时候单次点击可能被忽略）
     * 
     * @example
     * // 战斗结束后归位
     * await tftOperator.selfResetPosition();
     */
    public async selfResetPosition(): Promise<void> {
        this.ensureInitialized();

        logger.info(`[TftOperator] 小小英雄归位中... 目标坐标: (${littleLegendDefaultPoint.x}, ${littleLegendDefaultPoint.y})`);

        // 右键点击默认站位，让小小英雄移动到目标位置
        await mouseController.clickAt(littleLegendDefaultPoint, MouseButtonType.RIGHT);
    }

    /**
     * 让小小英雄随机走动（防挂机）
     * @description 在战斗阶段让小小英雄随机移动，避免被系统判定为挂机
     *              用于：
     *              - PVP 战斗阶段的防挂机
     *              - 等待时的随机移动
     * 
     * 走位逻辑：
     * - 每次调用时，走向与上一次相反的方向（左右交替）
     * - 从对应方向的点位数组中随机选择一个点
     * - 这样小小英雄会在棋盘两侧来回走动，更像真人操作
     * 
     * @example
     * // PVP 战斗阶段防挂机
     * await tftOperator.selfWalkAround();
     */
    public async selfWalkAround(): Promise<void> {
        this.ensureInitialized();

        // 决定这次走哪边（与上次相反）
        const targetSide: 'left' | 'right' = this.lastWalkSide === 'left' ? 'right' : 'left';
        
        // 获取目标方向的点位数组
        const targetPoints = selfWalkAroundPoints[targetSide];
        
        // 从数组中随机选择一个点位
        const randomIndex = Math.floor(Math.random() * targetPoints.length);
        const targetPoint = targetPoints[randomIndex];

        logger.info(
            `[TftOperator] 小小英雄随机走动: ${this.lastWalkSide} → ${targetSide}，` +
            `目标坐标: (${targetPoint.x}, ${targetPoint.y})`
        );

        // 右键点击目标位置，小小英雄会自动走过去
        await mouseController.clickAt(targetPoint, MouseButtonType.RIGHT);

        // 更新上次走位方向
        this.lastWalkSide = targetSide;
    }

    // ========================================================================
    // 棋子移动操作
    // ========================================================================

    /**
     * 出售指定位置的棋子
     * @param location 棋子当前位置 (备战席 "SLOT_x" 或 棋盘 "Rx_Cx")
     * @description 操作流程：
     *              1. 鼠标移动到棋子位置
     *              2. 左键拖拽（拿起）
     *              3. 移动到商店区域 (使用 SHOP_SLOT_3 作为卖出点，因为它在中间)
     *              4. 释放左键（卖出）
     */
    public async sellUnit(location: string): Promise<void> {
        this.ensureInitialized();

        let fromPoint: SimplePoint | undefined;

        // 判断是备战席还是棋盘
        if (location.startsWith('SLOT_')) {
            fromPoint = benchSlotPoints[location as keyof typeof benchSlotPoints];
        } else if (location.startsWith('R')) {
            fromPoint = fightBoardSlotPoint[location as keyof typeof fightBoardSlotPoint];
        }

        if (!fromPoint) {
            logger.error(`[TftOperator] 卖出失败，无效的位置: ${location}`);
            return;
        }

        // 卖出点：商店中间位置 (SLOT_3)
        // 也可以是屏幕左右下角的卖出区域，但拖到商店最通用
        const sellPoint = shopSlot.SHOP_SLOT_3;

        logger.info(`[TftOperator] 卖出棋子: ${location}`);

        // 执行拖拽操作卖出
        // 这里的拖拽逻辑 (move -> press -> move -> release) 符合 "拿起 -> 移动 -> 放下" 的过程
        await mouseController.drag(fromPoint, sellPoint);
    }

    /**
     * 将备战席的棋子移动到棋盘指定位置
     * @param benchLocation 备战席位置 (如 "SLOT_1")
     * @param boardLocation 棋盘目标位置 (如 "R1_C1")
     * @description 通过拖拽操作将棋子从备战席移动到棋盘上
     *              这是上场棋子的核心操作
     * 
     * @example
     * // 将备战席 SLOT_1 的棋子移动到棋盘 R1_C1 位置
     * await tftOperator.moveBenchToBoard("SLOT_1", "R1_C1");
     */
    public async moveBenchToBoard(
        benchLocation: BenchLocation,
        boardLocation: BoardLocation
    ): Promise<void> {
        this.ensureInitialized();

        // 获取备战席槽位坐标
        const fromPoint = benchSlotPoints[benchLocation];
        
        if (!fromPoint) {
            logger.error(`[TftOperator] 无效的备战席位置: ${benchLocation}`);
            return;
        }

        // 获取棋盘目标位置坐标
        const toPoint = fightBoardSlotPoint[boardLocation];
        
        if (!toPoint) {
            logger.error(`[TftOperator] 无效的棋盘位置: ${boardLocation}`);
            return;
        }

        logger.info(`[TftOperator] 移动棋子: ${benchLocation} -> ${boardLocation}`);

        // 执行拖拽操作
        await mouseController.drag(fromPoint, toPoint);
    }

    /**
     * 将棋盘上的棋子移动到另一个棋盘位置
     * @param fromLocation 起始位置 (如 "R1_C1")
     * @param toLocation 目标位置 (如 "R4_C4")
     * @description 用于调整棋子站位，前后排调整等
     * 
     * @example
     * // 将 R1_C1 的棋子移动到 R4_C4
     * await tftOperator.moveBoardToBoard("R1_C1", "R4_C4");
     */
    public async moveBoardToBoard(
        fromLocation: keyof typeof fightBoardSlotPoint,
        toLocation: keyof typeof fightBoardSlotPoint
    ): Promise<void> {
        this.ensureInitialized();

        const fromPoint = fightBoardSlotPoint[fromLocation];
        const toPoint = fightBoardSlotPoint[toLocation];

        if (!fromPoint || !toPoint) {
            logger.error(`[TftOperator] 无效的棋盘位置: ${fromLocation} -> ${toLocation}`);
            return;
        }

        logger.info(`[TftOperator] 调整站位: ${fromLocation} -> ${toLocation}`);

        // 执行拖拽操作
        await mouseController.drag(fromPoint, toPoint);
    }

    /**
     * 将棋盘上的棋子移回备战席
     * @param boardLocation 棋盘位置 (如 "R1_C1")
     * @param benchSlotIndex 备战席目标槽位索引 (0-8)，如果不指定则移到第一个空位
     * @description 用于下场棋子，腾出人口等
     * 
     * @example
     * // 将 R1_C1 的棋子移回备战席第一个槽位
     * await tftOperator.moveBoardToBench("R1_C1", 0);
     */
    public async moveBoardToBench(
        boardLocation: keyof typeof fightBoardSlotPoint,
        benchSlotIndex: number = 0
    ): Promise<void> {
        this.ensureInitialized();

        const fromPoint = fightBoardSlotPoint[boardLocation];
        const benchSlotKey = `SLOT_${benchSlotIndex + 1}` as keyof typeof benchSlotPoints;
        const toPoint = benchSlotPoints[benchSlotKey];

        if (!fromPoint || !toPoint) {
            logger.error(
                `[TftOperator] 无效的位置: 棋盘 ${boardLocation} -> 备战席 SLOT_${benchSlotIndex + 1}`
            );
            return;
        }

        logger.info(
            `[TftOperator] 下场棋子: 棋盘 ${boardLocation} -> 备战席 SLOT_${benchSlotIndex + 1}`
        );

        // 执行拖拽操作
        await mouseController.drag(fromPoint, toPoint);
    }

    /**
     * 打开锻造器并选择装备
     * @param benchUnit 备战席上的锻造器单位
     * @description 锻造器打开后会弹出装备选择界面（4选1 或 5选1）
     *              当前实现：固定选择中间的装备
     *              - 4选1 时选择第2个（索引1，从左数第二个）
     *              - 5选1 时选择第3个（索引2，正中间）
     * 
     *              操作流程：
     *              1. 校验传入的单位是否为锻造器
     *              2. 将锻造器从备战席拖拽到商店位置（SHOP_SLOT_3）
     *              3. 松开鼠标后，再左键点击商店位置打开选择界面
     *              4. 等待界面出现（约 300ms）
     *              5. 点击中间位置的装备完成选择
     * 
     * @example
     * // 打开备战席上的锻造器
     * const forges = gameStateManager.findItemForges();
     * if (forges.length > 0) {
     *     await tftOperator.openItemForge(forges[0]);
     * }
     * 
     * TODO: 识别装备并精准选择（根据阵容需求选择最优装备）
     */
    public async openItemForge(benchUnit: BenchUnit): Promise<void> {
        this.ensureInitialized();

        // 1. 校验是否为锻造器
        const unitName = benchUnit.tftUnit.displayName;
        if (!unitName.includes('锻造器')) {
            logger.error(`[TftOperator] openItemForge 传入的不是锻造器: ${unitName}`);
            return;
        }

        // 2. 获取备战席槽位坐标
        const forgePoint = benchSlotPoints[benchUnit.location];

        if (!forgePoint) {
            logger.error(`[TftOperator] 无效的备战席位置: ${benchUnit.location}`);
            return;
        }

        logger.info(`[TftOperator] 打开锻造器: ${unitName} (${benchUnit.location})`);

        // 3. 将锻造器拖拽到商店位置（SHOP_SLOT_3，商店中间位置）
        //    锻造器不能像普通棋子那样双击打开，需要先拖到商店再点击
        const shopPoint = shopSlot.SHOP_SLOT_3;
        await mouseController.drag(forgePoint, shopPoint);

        // 4. 等待锻造器选择页面刷新
        await sleep(500);
        //  选择装备,先固定选中中间的装备
        await mouseController.clickAt(shopPoint, MouseButtonType.LEFT);
        // TODO: 识别装备并精准选择（根据阵容需求选择最优装备）
    }

    /**
     * 将装备穿戴给棋盘上的单位
     * @param equipSlotIndex 装备栏索引 (0-9)
     * @param boardLocation 棋盘目标位置 (如 "R1_C1")
     * @description 将指定装备槽位的装备拖拽到棋盘上的指定位置
     */
    public async equipToBoardUnit(
        equipSlotIndex: number,
        boardLocation: BoardLocation
    ): Promise<void> {
        this.ensureInitialized();

        // 1. 获取装备槽位坐标
        // 装备索引 0-9 -> EQ_SLOT_1 ~ EQ_SLOT_10
        if (equipSlotIndex < 0 || equipSlotIndex > 9) {
            logger.error(`[TftOperator] 无效的装备槽位索引: ${equipSlotIndex} (只接受 0-9)`);
            return;
        }

        const equipSlotKey = `EQ_SLOT_${equipSlotIndex + 1}` as keyof typeof equipmentSlot;
        const fromPoint = equipmentSlot[equipSlotKey];


        if (!fromPoint) {
            logger.error(`[TftOperator] 无效的装备槽位索引: ${equipSlotIndex}`);
            return;
        }

        // 2. 获取棋盘目标位置坐标
        const toPoint = fightBoardSlotPoint[boardLocation];

        if (!toPoint) {
            logger.error(`[TftOperator] 无效的棋盘位置: ${boardLocation}`);
            return;
        }

        logger.info(`[TftOperator] 穿装备: 槽位${equipSlotIndex}(${equipSlotKey}) -> ${boardLocation}`);

        // 3. 执行拖拽操作
        await mouseController.drag(fromPoint, toPoint);
    }
}

// ============================================================================
// 导出
// ============================================================================

/** TftOperator 单例实例 */
export const tftOperator = TftOperator.getInstance();
