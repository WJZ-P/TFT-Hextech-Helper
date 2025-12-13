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
import { Button, Point, Region } from "@nut-tree-fork/nut-js";
import { screen } from "electron";
import path from "path";
import fs from "fs-extra";
import sharp from "sharp";
import cv from "@techstark/opencv-js";

// 协议层导入
import {
    benchSlotPoints,
    benchSlotRegion,
    detailChampionNameRegion,
    detailChampionStarRegion,
    equipmentRegion,
    fightBoardSlotRegion,
    gameStageDisplayNormal,
    gameStageDisplayStageOne,
    gameStageDisplayTheClockworkTrails,
    GameStageType,
    itemForgeTooltipRegion,
    shopSlot,
    shopSlotNameRegions,
    TFT_16_CHAMPION_DATA,
    TFTEquip,
    TFTMode,
    TFTUnit,
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
} from "./tft";
import { sleep } from "./utils/HelperTools";

// ============================================================================
// 类型重导出 (保持向后兼容)
// ============================================================================

export { IdentifiedEquip, ShopUnit, BoardLocation, BoardUnit, BenchLocation, BenchUnit };

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
    private gameWindowRegion: Point | null = null;

    /** 当前游戏模式 */
    private tftMode: TFTMode = TFTMode.CLASSIC;

    /** 当前棋盘状态 */
    private currentBoardState: Map<BoardLocation, TFTUnit | null> = new Map();

    /** 当前装备状态 */
    private currentEquipState: TFTEquip[] = [];

    /** 当前备战席状态 */
    private currentBenchState: TFTUnit[] = [];

    /** 空槽匹配阈值：平均像素差值大于此值视为"有棋子占用" */
    private readonly benchEmptyDiffThreshold = 12;

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

            this.gameWindowRegion = new Point(originX, originY);

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
            await sleep(50); // 等待 UI 刷新 (游戏 25fps，额外给10ms缓冲时间)

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

                logger.info(
                    `[备战席槽位 ${benchSlot.slice(-1)}] 识别成功 -> ` +
                    `${tftUnit.displayName} (${tftUnit.price}费-${starLevel}星)`
                );

                benchUnits.push({
                    location: benchSlot as BenchLocation,
                    tftUnit,
                    starLevel,
                    equips: [],
                });
            } else {
                // 英雄识别失败，尝试检测是否为基础装备锻造器
                const clickPoint = benchSlotPoints[benchSlot as keyof typeof benchSlotPoints];
                //await sleep(250);//  额外等一段时间，看看是不是延迟问题导致浮窗未生成
                const isItemForge = await this.checkItemForgeTooltip(clickPoint);

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
                const filename = `bench_${slotKey.toLowerCase()}_${Date.now()}.png`;
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

        diff.delete();
        mat.delete();

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
     * @returns 是否为基础装备锻造器
     */
    private async checkItemForgeTooltip(clickPoint: Point): Promise<boolean> {
        this.ensureInitialized();

        // 计算浮窗名称区域的绝对坐标
        // itemForgeTooltipRegion 是相对于点击位置的偏移量
        const absoluteRegion = new Region(
            Math.round(this.gameWindowRegion!.x + clickPoint.x + itemForgeTooltipRegion.leftTop.x),
            Math.round(this.gameWindowRegion!.y + clickPoint.y + itemForgeTooltipRegion.leftTop.y),
            Math.round(itemForgeTooltipRegion.rightBottom.x - itemForgeTooltipRegion.leftTop.x),
            Math.round(itemForgeTooltipRegion.rightBottom.y - itemForgeTooltipRegion.leftTop.y)
        );

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
            const filename = `itemForge_debug_${Date.now()}.png`;
            const savePath = path.join(saveDir, filename);
            fs.writeFileSync(savePath, rawPngBuffer);  // 保存原图，方便排查
            logger.warn(`[TftOperator] 锻造器识别失败，已保存截图: ${filename}`);
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
        type: "shop" | "bench",
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
}

// ============================================================================
// 导出
// ============================================================================

/** TftOperator 单例实例 */
export const tftOperator = TftOperator.getInstance();
