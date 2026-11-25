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
import { tftWindowLocator, type ScreenRect } from "./utils/TftWindowLocator";
import { Region } from "@nut-tree-fork/nut-js";
import path from "path";
import fs from "fs-extra";
import sharp from "sharp";
import cv from "@techstark/opencv-js";

// 协议层导入
// 类型、枚举，以及 S18 还没有截图测量的点位（阵亡后的"现在退出"按钮、装备锻造器浮窗）仍来自老协议
import {
    clockworkTrailsQuitNowButtonPoint,
    clockworkTrailsQuitNowButtonRegion,
    GameStageResult,
    GameStageType,
    ItemForgeType,
    ShopSlotIndex,
    TFTEquip,
    TFTMode,
    TFTUnit,
    SimplePoint,
} from "./TFTProtocol";
// 界面点位：S18 虚幻客户端（1280x720 客户区）
// 底部 HUD（商店、等级、金币、升级/刷新按钮）发条鸟模式整体左移，通过 this.hud 按模式选取
import {
    benchSlotPoints,
    benchSlotRegion,
    detailChampionNameRegion,
    detailChampionStarRegion,
    detailEquipRegion,
    detailPanelRegion,
    equipmentRegion,
    equipmentRegionClockwork,
    equipmentSlot,
    fightBoardSlotPoint,
    fightBoardSlotRegion,
    fightBoardUnitPoint,
    unitHealthBar,
    boardHealthBarRegion,
    benchHealthBarRegion,
    gameStageDisplayNormal,
    gameStageDisplayStageOne,
    gameStageDisplayTheClockworkTrails,
    hexSlot,
    littleLegendDefaultPoint,
    lootRegion,
    lootOrbScaleAt,
    selfWalkAroundPoints,
    shopSlot,
    shopSlotNameRegions,
    shopSlotClockwork,
    shopSlotNameRegionsClockwork,
    levelRegion,
    levelRegionClockwork,
    coinRegion,
    coinRegionClockwork,
    streakIconRegion,
    streakIconRegionClockwork,
    streakCountRegion,
    streakCountRegionClockwork,
    refreshShopPoint,
    refreshShopPointClockwork,
    buyExpPoint,
    buyExpPointClockwork,
    buyExpIconRegion,
    buyExpIconRegionClockwork,
    heldHintRegion,
    heldHintRegionClockwork,
    itemForgeTooltipRegion,
    forgePickPoint,
    exitGameButtonPoint,
    exitGameButtonRegion,
    shopFairyProbeRegion,
    shopFairyProbeRegionClockwork,
    SHOP_FAIRY_COLOR,
} from "./TFTProtocolS18";
// 赛季数据通过统一管理接口访问
import { getCurrentChessData, getChessDataByMode, getSeasonTemplateDirByMode } from "./TFTInfo/SeasonRegistry";



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
    EQUIP_DRAG_OPTIONS,
    FRAME_MS,
    parseStageStringToEnum,
    isValidStageFormat,
} from "./tft";
import { settingsStore } from "./utils/SettingsStore";
import type {
    IdentifiedEquip,
    BenchUnit,
    BenchLocation,
    BoardUnit,
    BoardLocation,
    ShopUnit,
    LootOrb,
    DebugEquipResult,
    StreakInfo,
    SimpleRegion,
} from "./tft";
import { sleep } from "./utils/HelperTools";
import type { OcrPreprocessOptions } from "./tft/recognition/ScreenCapture";

/** 等级 / 经验 OCR 预处理：经验值文字偏暗，阈值调低（S18 截图实测 120 时三个样本全部能解析） */
const LEVEL_OCR_OPTIONS: OcrPreprocessOptions = { threshold: 120 };

/** 金币 OCR 预处理：用 RGB 最小值灰度去掉左侧的金币图标（S18 截图实测三个样本全部正确） */
const COIN_OCR_OPTIONS: OcrPreprocessOptions = { grayscale: 'minChannel' };

/**
 * 自然仙灵卡底色的容差（每个通道的最大差值）
 * 截图实测：仙灵卡差 1 以内，其他商店卡片和空格子最少差 23
 */
const SHOP_FAIRY_COLOR_TOLERANCE = 8;

/** 连胜 / 连败图标里，红蓝通道相差超过这个值的像素才算有颜色（灰色火焰相差 15 左右） */
const STREAK_COLOR_DIFF = 60;

/** 图标里至少这么多个有颜色的像素，才算连胜 / 连败（实测橙色 70 多个、蓝色 230 多个，灰色 0 个） */
const STREAK_MIN_COLORED_PIXELS = 25;

/** 装备栏里认不出来的装备的占位名 */
const UNKNOWN_EQUIP_NAME = "未识别装备";

/** 关闭锻造器浮窗后等待界面刷新的时间 (ms) */
const TOOLTIP_CLOSE_SETTLE_MS = 100;

/** 有血条、确定是棋子的格子，等待详情面板打开的最长时间 (ms)。认出棋子后会立刻继续 */
const DETAIL_PANEL_TIMEOUT_MS = 500;

/** 没有血条的格子，等待详情面板或浮窗的最长时间 (ms)。左键已经确认格子上有东西，所以等久一点；认出锻造器后会立刻继续 */
const NO_BAR_TIMEOUT_MS = 600;

/** 详情面板检查几次还没认出棋子，就开始看是不是锻造器的浮窗 */
const FORGE_CHECK_AFTER_POLLS = 3;

/** 左键按住备战席格子，等东西被拿起来的最长时间 (ms)，约 5 帧 */
const PICK_UP_HOLD_MS = 170;

/** 松开左键后，再等东西被拿起来的最长时间 (ms)，约 5 帧 */
const PICK_UP_AFTER_RELEASE_MS = 170;

/** 等拿起的东西放回原位的最长时间 (ms) */
const PUT_DOWN_TIMEOUT_MS = 300;

/** 等待详情面板刷新时的检查间隔 (ms) */
const DETAIL_PANEL_POLL_MS = 15;

/** 两张面板截图的同一个像素，任一通道差值超过这个值才算不同 */
const PANEL_PIXEL_DIFF_THRESHOLD = 24;

/** 不同的像素达到这个数量，才算面板有变化（星级不同约 60 个像素，名字、血量不同会更多） */
const PANEL_CHANGED_PIXELS = 10;

/** 一行里至少这么多个绿色像素才算血条（血条宽 42；实测有棋子的格子不低于 32，空格子不高于 6） */
const HEALTH_BAR_MIN_PIXELS = 24;

/** 右键查看一个格子的结果 */
interface InspectResult {
    /** 认出的棋子，没认出来为 null */
    tftUnit: TFTUnit | null;
    /** 锻造器类型，不是锻造器为 NONE */
    forgeType: ItemForgeType;
    /** 识别过程的中间结果，识别失败时用于排查 */
    cleanName: string;
    namePng: Buffer;
}

/** 锻造器浮窗名称：文字偏暗，默认阈值 160 会丢笔画，原图（不放大）会漏字 */
const FORGE_TOOLTIP_OCR_OPTIONS: OcrPreprocessOptions = { threshold: 110 };

// ============================================================================
// 类型重导出 (保持向后兼容)
// ============================================================================

export { IdentifiedEquip, ShopUnit, BoardLocation, BoardUnit, BenchLocation, BenchUnit, LootOrb };

// 重新导出游戏分辨率常量，供其他模块使用
export { GAME_WIDTH, GAME_HEIGHT };

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

    /**
     * 当前赛季对应的棋子数据集
     * 根据 tftMode 自动切换，用于 OCR/模板匹配后查找英雄
     * 默认使用当前主赛季（通过 getCurrentChessData 动态获取），init() 时会通过 getActiveChessData() 覆盖
     */
    private currentChessData: Record<string, TFTUnit> = getCurrentChessData();

    /** 调试面板临时指定的模式，null 表示用设置里的模式 */
    private debugMode: TFTMode | null = null;

    /** 当前使用的模式 */
    private get activeMode(): TFTMode {
        return this.debugMode ?? (settingsStore.get('tftMode') as TFTMode || TFTMode.NORMAL);
    }

    /** 【调试用】临时指定模式，操作做完要传 null 恢复 */
    public setDebugMode(mode: TFTMode | null): void {
        this.debugMode = mode;
    }

    /**
     * 获取当前模式对应的棋子数据集
     * 从 settingsStore 读取当前模式，返回对应赛季的棋子数据
     * 同时更新内部缓存（避免每次都重新创建引用）
     */
    private getActiveChessData(): Record<string, TFTUnit> {
        const mode = this.activeMode;
        this.currentChessData = getChessDataByMode(mode);
        return this.currentChessData;
    }

    /**
     * 当前模式的 HUD 点位
     * @description 发条鸟模式的商店、等级、金币、升级/刷新按钮整体左移 69px，装备栏左移 3px，其余模式用常规布局
     */
    private get hud() {
        const isClockwork = this.activeMode === TFTMode.CLOCKWORK_TRAILS;
        return isClockwork
            ? {
                shopSlot: shopSlotClockwork,
                shopSlotNameRegions: shopSlotNameRegionsClockwork,
                levelRegion: levelRegionClockwork,
                coinRegion: coinRegionClockwork,
                streakIconRegion: streakIconRegionClockwork,
                streakCountRegion: streakCountRegionClockwork,
                refreshShopPoint: refreshShopPointClockwork,
                buyExpPoint: buyExpPointClockwork,
                buyExpIconRegion: buyExpIconRegionClockwork,
                heldHintRegion: heldHintRegionClockwork,
                shopFairyProbeRegion: shopFairyProbeRegionClockwork,
                equipmentRegion: equipmentRegionClockwork,
            }
            : { shopSlot, shopSlotNameRegions, levelRegion, coinRegion, streakIconRegion, streakCountRegion, refreshShopPoint, buyExpPoint, buyExpIconRegion, heldHintRegion, shopFairyProbeRegion, equipmentRegion };
    }

    /** 同步游戏窗口位置的定时器（虚幻客户端窗口可以拖动，需要持续跟随） */
    private windowSyncTimer: NodeJS.Timeout | null = null;

    /** 同步游戏窗口位置的间隔 (ms)，读一次窗口位置只要几微秒 */
    private static readonly WINDOW_SYNC_INTERVAL_MS = 500;

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

    /** 当前模式对应的赛季模板目录名（如 s18），空槽位模板按赛季存放 */
    private get seasonTemplateDir(): string {
        return getSeasonTemplateDirByMode(this.activeMode);
    }

    private get benchSlotSnapshotPath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/benchSlot", this.seasonTemplateDir);
    }

    private get fightBoardSlotSnapshotPath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/fightBoardSlot", this.seasonTemplateDir);
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
     * 读取 TFT 客户区当前位置，更新截图和点击的基准点
     * @throws 找不到窗口或窗口最小化时抛出错误
     */
    public async syncWindowOrigin(): Promise<ScreenRect> {
        const rect = await tftWindowLocator.getClientRect();
        const previous = this.gameWindowRegion;
        if (!previous || previous.x !== rect.left || previous.y !== rect.top) {
            if (previous) {
                logger.info(`[TftOperator] 游戏窗口位置变化: (${previous.x}, ${previous.y}) → (${rect.left}, ${rect.top})`);
            }
            this.gameWindowRegion = { x: rect.left, y: rect.top };
            screenCapture.setGameWindowOrigin(this.gameWindowRegion);
            mouseController.setGameWindowOrigin(this.gameWindowRegion);
        }
        return rect;
    }

    /** 开始定时同步窗口位置（重复调用没有副作用） */
    private startWindowSync(): void {
        if (this.windowSyncTimer) return;
        this.windowSyncTimer = setInterval(() => {
            this.syncWindowOrigin().catch((e: any) => {
                logger.debug(`[TftOperator] 同步游戏窗口位置失败: ${e.message}`);
            });
        }, TftOperator.WINDOW_SYNC_INTERVAL_MS);
    }

    /** 停止定时同步窗口位置（对局结束时调用） */
    public stopWindowSync(): void {
        if (this.windowSyncTimer) {
            clearInterval(this.windowSyncTimer);
            this.windowSyncTimer = null;
        }
    }

    /**
     * 初始化操作器
     * @description 通过 TftWindowLocator 找到 TFT 窗口的游戏画面（客户区）位置，作为截图和点击的基准点，
     *              并把窗口切到前台（点击必须落在游戏窗口上）。
     *              虚幻客户端的窗口可以拖动，初始化后会定时同步位置，对局结束时调用 stopWindowSync() 停止。
     * @returns 初始化结果，包含成功状态和客户区信息
     */
    public async init(): Promise<{
        success: boolean;
        windowInfo?: { left: number; top: number; width: number; height: number };
        usedFallback: boolean;
    }> {
        try {
            const rect = await this.syncWindowOrigin();
            await tftWindowLocator.ensureForeground();
            this.startWindowSync();

            logger.info(`[TftOperator] ✅ 已定位 TFT 游戏画面: (${rect.left}, ${rect.top}) ${rect.width}x${rect.height}`);

            return {
                success: true,
                windowInfo: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
                usedFallback: false,
            };
        } catch (e: any) {
            logger.error(`[TftOperator] 初始化失败: ${e.message}`);
            this.gameWindowRegion = null;
            return {
                success: false,
                windowInfo: undefined,
                usedFallback: false,
            };
        }
    }

    /**
     * 为调试面板做准备：定位游戏窗口、切到前台、加载当前模式的识别资源
     * @description 挂机时这些由 GameLoadingState / GameRunningState 完成，调试时可能还没开过挂机
     * @throws 找不到窗口、窗口尺寸不对或模板没加载完时抛出错误，错误信息会直接显示给用户
     */
    public async prepareForDebug(): Promise<void> {
        const rect = await this.syncWindowOrigin();
        if (rect.width !== GAME_WIDTH || rect.height !== GAME_HEIGHT) {
            throw new Error(
                `游戏画面是 ${rect.width}x${rect.height}，识别点位按 ${GAME_WIDTH}x${GAME_HEIGHT} 设置，请先把云顶之弈调成这个尺寸的窗口化（开启挂机时会自动调整）`
            );
        }
        if (!templateLoader.isReady()) {
            throw new Error("识别模板还在加载，请稍后再试");
        }

        const mode = this.activeMode;
        await templateLoader.switchSeason(getSeasonTemplateDirByMode(mode));
        await ocrService.switchChessWorker(mode);

        // 截的是屏幕像素，游戏窗口必须在最前面
        await tftWindowLocator.ensureForeground();
    }

    /**
     * 获取当前游戏阶段
     * @description 通过 OCR 识别游戏阶段 (如 "2-1", "3-5")
     *              根据用户设置的游戏模式，直接读取对应区域，避免逐个试错
     * @returns 游戏阶段结果，包含阶段类型和原始文本
     */
    public async getGameStage(): Promise<GameStageResult> {
        try {
            /**
             * 阶段识别统一使用 `forOCR=false`（原图，不做二值化/灰度等预处理）。
             *
             * 原因：海克斯出现时背景会整体变暗，二值化(threshold)会丢失大量细节，
             * 直接导致 "2-1" 这类阶段文字被"吃掉"。用原图 OCR 能保留色彩/对比信息。
             */
            const recognizeStageText = async (region: Region): Promise<string> => {
                const rawPng = await screenCapture.captureRegionAsPng(region, false);
                return await ocrService.recognize(rawPng, OcrWorkerType.GAME_STAGE);
            };

            // 从设置中获取当前游戏模式，根据模式选择识别策略
            const currentMode = this.activeMode;

            // ============================================================
            // 发条鸟试炼模式：直接读取固定区域
            // ============================================================
            if (currentMode === TFTMode.CLOCKWORK_TRAILS) {
                const clockworkRegion = this.getClockworkTrialsRegion();
                const clockText = await recognizeStageText(clockworkRegion);

                if (clockText && clockText.length > 0) {
                    this.tftMode = TFTMode.CLOCKWORK_TRAILS;
                    const stageType = parseStageStringToEnum(clockText);
                    if (stageType !== GameStageType.UNKNOWN) {
                        return { type: stageType, stageText: clockText };
                    }
                    // 解析失败时，返回 PVP 类型（发条鸟模式全程都是战斗）
                    return { type: GameStageType.PVP, stageText: clockText };
                }

                // 发条鸟区域 OCR 识别失败，可能是过渡帧等临时情况
                // 对局结束由客户端日志判断（见 GameRunningState），这里不做处理
                logger.warn(`[TftOperator] 发条鸟模式阶段识别失败: "${clockText ?? "null"}"。请检查：1. 云顶之弈是否为窗口化；2. 挂机期间是否手动改过窗口大小；3. 游戏窗口是否被其他窗口遮挡。`);
                return { type: GameStageType.UNKNOWN, stageText: "" };
            }

            // ============================================================
            // 经典/排位模式：标准识别流程
            // ============================================================
            let stageText = "";

            // 1. 先尝试标准区域 (2-1, 3-5, 4-2 等)
            const normalRegion = this.getStageAbsoluteRegion(false);
            stageText = await recognizeStageText(normalRegion);

            // 2. 如果标准区域识别失败，尝试 Stage 1 区域
            //    （第一阶段的 UI 位置略有不同）
            if (!isValidStageFormat(stageText)) {
                const stageOneRegion = this.getStageAbsoluteRegion(true);
                stageText = await recognizeStageText(stageOneRegion);
            }

            // 3. 解析阶段字符串
            const stageType = parseStageStringToEnum(stageText);

            if (stageType !== GameStageType.UNKNOWN) {
                // logger.info(`[TftOperator] 识别阶段: [${stageText}] -> ${stageType}`);
                this.tftMode = TFTMode.CLASSIC;
            } else {
                logger.warn(`[TftOperator] 无法识别当前阶段: "${stageText ?? "null"}。请检查：1. 云顶之弈是否为窗口化；2. 挂机期间是否手动改过窗口大小；3. 游戏窗口是否被其他窗口遮挡。"`);
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
        // 获取当前赛季对应的棋子数据集
        const chessData = this.getActiveChessData();

        for (let i = 1; i <= 5; i++) {
            // 最右边可能是自然仙灵卡，不是棋子，直接跳过
            if (i === 5 && (await this.isShopFairyCard())) {
                logger.debug(`[商店槽位 ${i}] 自然仙灵卡，跳过`);
                shopUnits.push(null);
                continue;
            }

            const slotKey = `SLOT_${i}` as keyof typeof shopSlotNameRegions;
            const region = screenCapture.toAbsoluteRegion(this.hud.shopSlotNameRegions[slotKey]);

            // 截图并 OCR 识别
            const processedPng = await screenCapture.captureRegionAsPng(region);
            const text = await ocrService.recognize(processedPng, OcrWorkerType.CHESS);
            let cleanName = text.replace(/\s/g, "");

            // 尝试从 OCR 结果中找到匹配的英雄
            let tftUnit: TFTUnit | null = chessData[cleanName] || null;

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
            tftUnit = chessData[cleanName] || null;

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
     * 商店最右边一格是不是自然仙灵卡
     * @description 看名字栏的底色。不靠"认不出名字"来推断：仙灵卡的名字可能凑巧和某个棋子的模板比较像
     *              （实测"抛硬币"对"奥恩"有 0.35 分，阈值是 0.40），而真正的棋子也有认不出来的时候
     */
    private async isShopFairyCard(): Promise<boolean> {
        const mat = await screenCapture.captureGameRegionAsMat(this.hud.shopFairyProbeRegion);
        try {
            const mean = cv.mean(mat); // [R, G, B, _]
            return SHOP_FAIRY_COLOR.every((value, channel) => Math.abs(mean[channel] - value) <= SHOP_FAIRY_COLOR_TOLERANCE);
        } finally {
            mat.delete();
        }
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

        for (const [slotName, regionDef] of Object.entries(this.hud.equipmentRegion)) {
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

                    // 有装备但认不出来，用占位补上。装备栏是紧凑排列的，直接跳过会让后面的装备序号前移，
                    // 拖装备时就会拖到前一格。占位不在装备数据里，策略层会当成不可穿戴的道具跳过
                    resultEquips.push({
                        name: UNKNOWN_EQUIP_NAME,
                        englishName: "",
                        equipId: "-1",
                        formula: "",
                        slot: `SLOT_${resultEquips.length + 1}`,
                        confidence: 0,
                        category: "unknown",
                    });
                    continue;
                }

                // 空槽位不写入结果列表：让上层拿到的是"紧凑装备数组"，避免把 10 个空格当成 10 件装备。
                if (matchResult.name === "空槽位") {
                    logger.debug(`[TftOperator] ${slotName} 为空槽位`);
                    continue;
                }

                // 注意：这里把 slot 统一写成紧凑后的槽位（SLOT_1..SLOT_n）。
                // 这样 StrategyService/GameStateManager 的"索引=槽位"假设始终成立。
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
     * 右键一个格子，等详情面板打开后识别棋子或锻造器
     * @description 不固定等待：面板变了、画面稳定下来、认出棋子就立刻返回，锻造器则是认出浮窗就返回。
     *              看完一个棋子要调用 closeDetailPanel：
     *              右键锻造器不会关掉已经打开的面板，面板上留着上一个棋子的话，会把锻造器认成上一个棋子
     * @param point 格子坐标
     * @param label 日志里的格子名称
     * @param chessData 当前赛季的棋子数据
     * @param forgeSlotIndex 备战席槽位索引 (1-9)，没有血条的备战席格子才传，会检测锻造器
     */
    private async inspectUnit(
        point: SimplePoint,
        label: string,
        chessData: Record<string, TFTUnit>,
        forgeSlotIndex?: number,
    ): Promise<InspectResult> {
        const checkForge = async () => forgeSlotIndex === undefined
            ? ItemForgeType.NONE
            : this.checkItemForgeTooltip(point, forgeSlotIndex);

        const before = await this.captureDetailPanel();
        await mouseController.clickInFrames(point, MouseButtonType.RIGHT);

        const deadline = Date.now() + (forgeSlotIndex === undefined ? DETAIL_PANEL_TIMEOUT_MS : NO_BAR_TIMEOUT_MS);
        let previous = before;

        for (let polls = 1; Date.now() < deadline; polls++) {
            const current = await this.captureDetailPanel();

            // 变了，而且和上一次检查相比已经稳定（不在过渡动画里）
            if (this.isPanelDifferent(before, current) && !this.isPanelDifferent(previous, current)) {
                const result = await this.recognizeDetailPanelUnit(chessData);
                if (result.tftUnit) return { ...result, forgeType: ItemForgeType.NONE };
            }

            // 面板一直没打开，看一下是不是锻造器
            if (polls >= FORGE_CHECK_AFTER_POLLS) {
                const forgeType = await checkForge();
                if (forgeType !== ItemForgeType.NONE) {
                    return { tftUnit: null, forgeType, cleanName: '', namePng: Buffer.alloc(0) };
                }
            }

            previous = current;
            await sleep(DETAIL_PANEL_POLL_MS);
        }

        // 等满了：点的不是棋子，或者一直认不出来
        const forgeType = await checkForge();
        const result = await this.recognizeDetailPanelUnit(chessData);
        if (forgeType !== ItemForgeType.NONE) return { ...result, tftUnit: null, forgeType };

        if (!result.tftUnit) {
            logger.warn(`[${label}] 没有认出棋子`, true);
        }
        return { ...result, forgeType };
    }

    /**
     * 右键小小英雄的默认站位，关掉详情面板
     * @description 看完一个棋子后调用，这样右键下一个格子时，面板上不会留着上一个棋子。
     *              点完只等一帧就继续，不等面板消失：点下一个格子还要花几帧，面板会在这期间关掉
     */
    private async closeDetailPanel(): Promise<void> {
        await mouseController.clickInFrames(littleLegendDefaultPoint, MouseButtonType.RIGHT);
        await sleep(FRAME_MS);
    }

    /** 截取详情面板上会变化的部分 (RGB 像素) */
    private async captureDetailPanel(): Promise<Uint8Array> {
        const mat = await screenCapture.captureGameRegionAsMat(detailPanelRegion);
        try {
            return Uint8Array.from(mat.data);
        } finally {
            mat.delete();
        }
    }

    /** 两张详情面板截图是否不同 */
    private isPanelDifferent(a: Uint8Array, b: Uint8Array): boolean {
        let changedPixels = 0;
        for (let i = 0; i < a.length; i += 3) {
            if (
                Math.abs(a[i] - b[i]) > PANEL_PIXEL_DIFF_THRESHOLD ||
                Math.abs(a[i + 1] - b[i + 1]) > PANEL_PIXEL_DIFF_THRESHOLD ||
                Math.abs(a[i + 2] - b[i + 2]) > PANEL_PIXEL_DIFF_THRESHOLD
            ) {
                if (++changedPixels >= PANEL_CHANGED_PIXELS) return true;
            }
        }
        return false;
    }

    /**
     * 识别详情面板当前显示的棋子
     * @description 先 OCR 名字，失败时用名字模板兜底
     */
    private async recognizeDetailPanelUnit(chessData: Record<string, TFTUnit>): Promise<Omit<InspectResult, 'forgeType'>> {
        const nameRegion = screenCapture.toAbsoluteRegion(detailChampionNameRegion);
        const namePng = await screenCapture.captureRegionAsPng(nameRegion);
        const text = await ocrService.recognize(namePng, OcrWorkerType.CHESS);
        let cleanName = text.replace(/\s/g, "");

        // OCR 失败时使用模板匹配兜底
        if (!chessData[cleanName]) {
            // 复用 namePng (3x 放大后的图片)，模板是灰度的，所以转灰度
            const mat = await screenCapture.pngBufferToMat(namePng);
            if (mat.channels() > 1) {
                cv.cvtColor(mat, mat, cv.COLOR_RGBA2GRAY);
            }
            cleanName = templateMatcher.matchChampion(mat) || "";
            mat.delete();
        }

        return { tftUnit: chessData[cleanName] ?? null, cleanName, namePng };
    }

    /**
     * 识别详情面板中棋子的星级
     * @description 识别不出来时按 1 星处理。不能返回 -1：策略层用 -1 表示锻造器之类的特殊单位，
     *              会把正常棋子排除在上场、替换之外
     */
    private async getDetailPanelStarLevel(): Promise<1 | 2 | 3 | 4> {
        const starRegion = screenCapture.toAbsoluteRegion(detailChampionStarRegion);
        const starPng = await screenCapture.captureRegionAsPng(starRegion, false);
        const starMat = await screenCapture.pngBufferToMat(starPng);
        const starLevel = templateMatcher.matchStarLevel(starMat);
        starMat.delete();

        if (starLevel === -1) {
            logger.debug("[TftOperator] 星级识别失败，按 1 星处理");
            return 1;
        }
        return starLevel;
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
        const region = screenCapture.toAbsoluteRegion(this.hud.shopSlotNameRegions[slotKey]);

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
        const targetPoint = this.hud.shopSlot[slotKey];

        if (!targetPoint) {
            logger.error(`[TftOperator] 无效的槽位: ${slot}，只接受 1-5`);
            return;
        }

        logger.info(`[TftOperator] 正在购买棋子，槽位: ${slot}...`);

        // 单击购买
        await mouseController.clickAt(targetPoint, MouseButtonType.LEFT);
        
        // 等待游戏 UI 响应，避免连续购买时漏买
        await sleep(10);
    }

    /**
     * 刷新商店 (D牌)
     */
    public async refreshShop(): Promise<void> {
        this.ensureInitialized();
        logger.info("[TftOperator] 刷新商店");
        await mouseController.clickAt(this.hud.refreshShopPoint, MouseButtonType.LEFT);
        // 刷新后需要一点时间让新棋子出现
        await sleep(20);
    }

    /**
     * 购买经验值 (F键)
     */
    public async buyExperience(): Promise<void> {
        this.ensureInitialized();
        logger.info("[TftOperator] 购买经验值");
        await mouseController.clickAt(this.hud.buyExpPoint, MouseButtonType.LEFT);
        await sleep(10);
    }

    /**
     * 获取当前备战席的棋子信息
     * @description 通过右键点击棋子，识别详情面板中的英雄名和星级
     * @returns 备战席棋子数组 (空槽位为 null)
     */
    public async getBenchInfo(): Promise<(BenchUnit | null)[]> {
        const benchUnits: (BenchUnit | null)[] = [];
        // 获取当前赛季对应的棋子数据集
        const chessData = this.getActiveChessData();

        const occupiedSlots = await this.findSlotsWithUnit(benchSlotPoints, benchHealthBarRegion);

        for (const benchSlot of Object.keys(benchSlotPoints)) {
            // 有血条的一定是棋子；没有血条的可能是空格子，也可能是锻造器（没有血条）。
            // 和默认棋盘的空格模板一样就是空的，不用点；不一样再用左键拿起来试
            const hasUnit = occupiedSlots.has(benchSlot);
            const clickPoint = benchSlotPoints[benchSlot as keyof typeof benchSlotPoints];

            if (!hasUnit) {
                const benchRegion = screenCapture.toAbsoluteRegion(benchSlotRegion[benchSlot as keyof typeof benchSlotRegion]);
                const heldForgeType = await this.isBenchSlotEmpty(benchSlot, benchRegion)
                    ? null
                    : await this.identifyByPickingUp(clickPoint, benchSlot);

                if (heldForgeType === null) {
                    logger.info(`[备战席槽位 ${benchSlot.slice(-1)}] 检测为空，跳过点击`);
                    benchUnits.push(null);
                    continue;
                }
                if (heldForgeType !== ItemForgeType.NONE) {
                    benchUnits.push(this.createForgeBenchUnit(benchSlot, heldForgeType, chessData));
                    continue;
                }
            }

            // 右键点击槽位显示详细信息
            const { tftUnit, forgeType, cleanName, namePng } = await this.inspectUnit(
                clickPoint,
                `备战席槽位 ${benchSlot.slice(-1)}`,
                chessData,
                // 只有没血条的才可能是锻造器。从槽位名称中提取槽位索引 (SLOT_1 -> 1, SLOT_9 -> 9)
                hasUnit ? undefined : parseInt(benchSlot.slice(-1))
            );

            if (tftUnit) {
                // 识别星级
                const starLevel = await this.getDetailPanelStarLevel();

                // 识别棋子携带的装备（详情面板右键后已显示，直接读取即可）
                const equips = await this.getDetailPanelEquips();

                await this.closeDetailPanel();

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
                // 关闭浮窗：再次右键点击同一位置，避免浮窗遮挡后续槽位的检测
                await mouseController.clickAt(clickPoint, MouseButtonType.RIGHT);
                await sleep(TOOLTIP_CLOSE_SETTLE_MS); // 等待 UI 渲染完成
                
                if (forgeType !== ItemForgeType.NONE) {
                    benchUnits.push(this.createForgeBenchUnit(benchSlot, forgeType, chessData));
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
     * 把锻造器 / 时空核心转换成备战席单位
     * @returns chess.ts 里没有对应定义时为 null
     */
    private createForgeBenchUnit(benchSlot: string, forgeType: ItemForgeType, chessData: Record<string, TFTUnit>): BenchUnit | null {
        // 根据特殊单位类型选择对应的 chessData 中的单位定义
        // 注意：未来战士核心也走这个分支（它和锻造器一样都是"右键弹浮窗"特殊单位）
        const forgeUnit = this.resolveSpecialUnitByForgeType(forgeType, chessData);

        if (!forgeUnit) {
            // 理论不会到这里：除非 chess.ts 里没有对应的特殊单位定义
            logger.warn(`[备战席槽位 ${benchSlot.slice(-1)}] 识别为 ${forgeType} 但 chessData 中无对应定义`);
            return null;
        }

        logger.info(`[备战席槽位 ${benchSlot.slice(-1)}] 识别为${forgeUnit.displayName}`);
        // 锻造器/时空核心 作为特殊单位处理
        return {
            location: benchSlot as BenchLocation,
            tftUnit: forgeUnit,
            starLevel: -1,  // 特殊单位无星级
            equips: [],
        };
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
        // 获取当前赛季对应的棋子数据集
        const chessData = this.getActiveChessData();

        const occupiedSlots = await this.findSlotsWithUnit(fightBoardSlotPoint, boardHealthBarRegion);

        // 遍历所有棋盘槽位 (R1_C1 ~ R4_C7)
        for (const boardSlot of Object.keys(fightBoardSlotPoint)) {
            // 头顶没有血条的是空格子
            if (!occupiedSlots.has(boardSlot)) {
                logger.debug(`[棋盘槽位 ${boardSlot}] 检测为空，跳过点击`);
                boardUnits.push(null);
                continue;
            }

            // 右键点击槽位显示详细信息
            const clickPoint = fightBoardUnitPoint[boardSlot as keyof typeof fightBoardUnitPoint];
            const { tftUnit, cleanName, namePng } = await this.inspectUnit(clickPoint, `棋盘槽位 ${boardSlot}`, chessData);

            if (tftUnit) {
                // 识别星级
                const starLevel = await this.getDetailPanelStarLevel();

                // 识别棋子携带的装备（详情面板右键后已显示，直接读取即可）
                const equips = await this.getDetailPanelEquips();

                await this.closeDetailPanel();

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

                // 归位小小英雄：右键点击空格子会导致小小英雄走上棋盘，影响后续识别
                await this.selfResetPosition();
            }
        }

        logger.info(`[TftOperator] 棋盘扫描完成，识别到 ${boardUnits.filter(u => u !== null).length} 个棋子`);
        return boardUnits;
    }

    /**
     * 找出有棋子的格子
     * @description 看格子上方有没有己方棋子的血条，一次截图判断所有格子。
     *              不比对格子的画面，所以不受高大的棋子遮挡和棋盘皮肤影响。锻造器没有血条
     * @param points 格子的点位
     * @param region 能包住这些格子血条的区域
     * @returns 有棋子的格子 key，例如 R1_C1、SLOT_1
     */
    private async findSlotsWithUnit(points: Record<string, SimplePoint>, region: SimpleRegion): Promise<Set<string>> {
        const mat = await screenCapture.captureGameRegionAsMat(region);
        const occupied = new Set<string>();

        try {
            const { data, cols, rows } = mat;
            const channels = mat.channels();
            const { leftTop } = region;
            const { width, offsetYMin, offsetYMax, centerX, lean } = unitHealthBar;

            const isBarPixel = (x: number, y: number): boolean => {
                const i = ((y - leftTop.y) * cols + (x - leftTop.x)) * channels;
                return data[i] < 60 && data[i + 1] > 150 && data[i + 2] < 60;
            };

            for (const [slot, point] of Object.entries(points)) {
                const left = Math.round(point.x + (point.x - centerX) * lean) - width / 2;
                const top = Math.max(point.y + offsetYMin, leftTop.y);
                const bottom = Math.min(point.y + offsetYMax, leftTop.y + rows - 1);

                let matchedRows = 0;
                for (let y = top; y <= bottom; y++) {
                    let barPixels = 0;
                    for (let x = left; x < left + width; x++) {
                        if (isBarPixel(x, y)) barPixels++;
                    }

                    // 血条高 3 像素，连续两行都够才算，排除零星的绿色特效
                    matchedRows = barPixels >= HEALTH_BAR_MIN_PIXELS ? matchedRows + 1 : 0;
                    if (matchedRows === 2) {
                        occupied.add(slot);
                        break;
                    }
                }
            }
        } finally {
            mat.delete();
        }

        logger.debug(`[TftOperator] 有棋子的格子: ${[...occupied].join(', ') || '无'}`);
        return occupied;
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

    /**
     * 保存发条鸟模式"现在退出"按钮区域截图
     * @description 用于调试发条鸟模式下的退出按钮识别
     *              截图保存到 public/resources/assets/images/button 目录
     *              使用原图（不做 OCR 预处理），保留完整色彩信息
     */
    public async saveQuitButtonSnapshot(): Promise<void> {
        this.ensureInitialized();

        // 保存目录：public/resources/assets/images/button
        const saveDir = path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/button");
        fs.ensureDirSync(saveDir);

        try {
            // 将相对坐标转换为屏幕绝对坐标
            const region = screenCapture.toAbsoluteRegion(clockworkTrailsQuitNowButtonRegion);

            // 截图时 forOCR=false，保留原始色彩（不做灰度/二值化处理）
            const pngBuffer = await screenCapture.captureRegionAsPng(region, false);

            // 文件名带时间戳，方便多次截图对比
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `clockwork_quit_button_${timestamp}.png`;
            const savePath = path.join(saveDir, filename);

            fs.writeFileSync(savePath, pngBuffer);
            logger.info(`[TftOperator] 发条鸟退出按钮截图已保存: ${filename}`);
        } catch (e: any) {
            logger.error(`[TftOperator] 保存发条鸟退出按钮截图失败: ${e.message}`);
        }
    }

    /**
     * 保存所有阶段识别区域的截图
     * @description 用于调试阶段 OCR 识别问题，会保存三种区域的截图：
     *              1. 发条鸟模式区域 (clockwork_stage_xxx.png)
     *              2. 标准阶段区域 (normal_stage_xxx.png) - 用于 2-1, 3-5 等
     *              3. 第一阶段区域 (stage1_stage_xxx.png) - 第一阶段 UI 位置不同
     *              截图保存到 public/resources/debug/stage_snapshots 目录
     * @returns 保存结果信息，包含成功/失败的文件名
     */
    public async saveStageSnapshots(): Promise<{
        success: string[];
        failed: string[];
        saveDir: string;
    }> {
        this.ensureInitialized();

        // 保存目录
        const saveDir = path.join(process.env.VITE_PUBLIC || ".", "resources/debug/stage_snapshots");
        fs.ensureDirSync(saveDir);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const success: string[] = [];
        const failed: string[] = [];

        // 定义三种区域的截图任务
        const tasks = [
            {
                name: "clockwork_stage",      // 发条鸟模式区域
                getRegion: () => this.getClockworkTrialsRegion(),
                description: "发条鸟模式",
            },
            {
                name: "normal_stage",         // 标准阶段区域 (2-1, 3-5 等)
                getRegion: () => this.getStageAbsoluteRegion(false),
                description: "标准模式",
            },
            {
                name: "stage1_stage",         // 第一阶段区域 (UI 位置略有不同)
                getRegion: () => this.getStageAbsoluteRegion(true),
                description: "第一阶段",
            },
        ];

        for (const task of tasks) {
            try {
                const region = task.getRegion();
                // 使用 forOCR=false，保留原始色彩（不做灰度/二值化处理）
                const pngBuffer = await screenCapture.captureRegionAsPng(region, false);
                const filename = `${task.name}_${timestamp}.png`;
                const savePath = path.join(saveDir, filename);

                fs.writeFileSync(savePath, pngBuffer);
                logger.info(`[TftOperator] ${task.description}阶段截图已保存: ${filename}`);
                success.push(filename);
            } catch (e: any) {
                const filename = `${task.name}_${timestamp}.png`;
                logger.error(`[TftOperator] 保存${task.description}阶段截图失败: ${e.message}`);
                failed.push(filename);
            }
        }

        logger.info(`[TftOperator] 阶段截图保存完成: 成功 ${success.length} 个, 失败 ${failed.length} 个`);
        return { success, failed, saveDir };
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
     * 用左键拿起备战席格子上的东西，看有没有、是哪种锻造器，然后放回去。给没有血条的格子用（空格子或锻造器）
     * @description 左键拿起格子上的东西时，商店会变成出售 / 开启武器库的提示，"购买经验值"的箭头会消失；
     *              点到空格子则没有反应。不看格子的画面，所以和棋盘皮肤、画质无关
     * @param point 格子坐标
     * @param slotKey 槽位 key，用于日志
     * @returns 空格子为 null；有东西但不知道是什么为 NONE，需要再右键看
     */
    private async identifyByPickingUp(point: SimplePoint, slotKey: string): Promise<ItemForgeType | null> {
        // 商店本来就没显示，没法判断，交给右键去看
        if (!await this.isBuyExpIconVisible()) return ItemForgeType.NONE;

        const startedAt = Date.now();
        const identifyHeld = async (timeoutMs: number): Promise<ItemForgeType | null> => {
            if (!await this.waitForBuyExpIcon(false, timeoutMs)) return null;
            logger.debug(`[TftOperator] 槽位 ${slotKey} 左键拿起了东西，用时 ${Date.now() - startedAt}ms`);
            return this.recognizeHeldForge();
        };

        const forgeType =
            await mouseController.holdAt(point, MouseButtonType.LEFT, () => identifyHeld(PICK_UP_HOLD_MS))
            // 也可能松开后才拿起来
            ?? await identifyHeld(PICK_UP_AFTER_RELEASE_MS);

        if (forgeType === null) {
            logger.debug(`[TftOperator] 槽位 ${slotKey} 左键没有拿起东西，是空格子`);
            return null;
        }

        // 松开后会放回原位；如果还拿着，原地再点一下放下
        for (let attempt = 1; attempt <= 3; attempt++) {
            if (await this.waitForBuyExpIcon(true, PUT_DOWN_TIMEOUT_MS)) return forgeType;
            await mouseController.clickInFrames(point, MouseButtonType.LEFT);
        }
        logger.warn(`[TftOperator] 槽位 ${slotKey} 拿起的东西没有放下`);
        return forgeType;
    }

    /**
     * 拿着锻造器时，从商店的提示文字识别是哪种锻造器
     * @returns 不是锻造器或认不出来为 NONE
     */
    private async recognizeHeldForge(): Promise<ItemForgeType> {
        const hintRegion = screenCapture.toAbsoluteRegion(this.hud.heldHintRegion);

        // 提示文字可能比箭头消失晚一点出来，认不出来再试一次
        for (let attempt = 1; attempt <= 2; attempt++) {
            const pngBuffer = await screenCapture.captureRegionAsPng(hintRegion, true, FORGE_TOOLTIP_OCR_OPTIONS);
            const text = (await ocrService.recognize(pngBuffer, OcrWorkerType.CHESS)).replace(/\s/g, "");
            logger.debug(`[TftOperator] 拿起时的提示 OCR 结果: "${text}"`);

            const forgeType = this.parseForgeType(text);
            if (forgeType !== ItemForgeType.NONE) return forgeType;
        }
        return ItemForgeType.NONE;
    }

    /** "购买经验值"的箭头是否显示着（被出售提示盖住时是纯色底） */
    private async isBuyExpIconVisible(): Promise<boolean> {
        const mat = await screenCapture.captureGameRegionAsMat(this.hud.buyExpIconRegion);
        try {
            return !templateMatcher.isEmptySlot(mat);
        } finally {
            mat.delete();
        }
    }

    /**
     * 等"购买经验值"的箭头出现或消失
     * @returns 超时前有没有等到
     */
    private async waitForBuyExpIcon(visible: boolean, timeoutMs: number): Promise<boolean> {
        const deadline = Date.now() + timeoutMs;
        for (;;) {
            if (await this.isBuyExpIconVisible() === visible) return true;
            if (Date.now() >= deadline) return false;
            await sleep(DETAIL_PANEL_POLL_MS);
        }
    }

    /**
     * 检测当前是否显示锻造器的浮窗，并识别锻造器类型
     * @description 锻造器右键后不显示右侧详情面板，而是在格子右侧弹出浮窗，
     *              浮窗相对格子的位置固定（老客户端是跟随鼠标，且靠右的格子会向左弹出）
     *              支持识别：基础装备锻造器、成装锻造器、神器装备锻造器、辅助装锻造器
     * @param slotPoint 备战席格子中心 (游戏内相对坐标)
     * @param slotIndex 备战席槽位索引 (1-9)，用于日志
     * @returns 锻造器类型 (NONE 表示不是锻造器)
     */
    private async checkItemForgeTooltip(slotPoint: SimplePoint, slotIndex: number): Promise<ItemForgeType> {
        this.ensureInitialized();

        const absoluteRegion = screenCapture.toAbsoluteRegion({
            leftTop: {
                x: slotPoint.x + itemForgeTooltipRegion.leftTop.x,
                y: slotPoint.y + itemForgeTooltipRegion.leftTop.y,
            },
            rightBottom: {
                x: slotPoint.x + itemForgeTooltipRegion.rightBottom.x,
                y: slotPoint.y + itemForgeTooltipRegion.rightBottom.y,
            },
        });

        const pngBuffer = await screenCapture.captureRegionAsPng(absoluteRegion, true, FORGE_TOOLTIP_OCR_OPTIONS);
        const text = await ocrService.recognize(pngBuffer, OcrWorkerType.CHESS);
        const cleanText = text.replace(/\s/g, "");

        logger.debug(`[TftOperator] 锻造器浮窗 OCR 结果: "${cleanText}"`);

        const forgeType = this.parseForgeType(cleanText);
        if (forgeType === ItemForgeType.NONE) {
            logger.debug(`[TftOperator] 槽位${slotIndex} 没有锻造器浮窗`);
        }
        return forgeType;
    }

    /**
     * 从文字判断锻造器类型（右键浮窗的名称，或拿起时商店的提示）
     * @returns 不是锻造器为 NONE
     */
    private parseForgeType(cleanText: string): ItemForgeType {
        // 判断特殊单位类型
        // 注意：判断顺序很重要，更具体的关键词要放在前面
        // 使用模糊匹配，因为 OCR 可能有误差

        // 0. 【S17】时空核心（未来战士核心）判断
        //    "时空"是独特关键词，且在所有特殊单位中最特殊（不是锻造器）
        //    放最前面是为了在 OCR 部分误识别时（如把"时空"识别成"成空"）也能优先命中
        const isTimebreakerCore = cleanText.includes("时空核心") ||
                                  cleanText.includes("时空");

        if (isTimebreakerCore) {
            logger.debug(`[TftOperator] 识别为时空核心（未来战士核心）`);
            return ItemForgeType.TIMEBREAKER_CORE;
        }

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
                            cleanText.includes("基础") ||
                            cleanText.includes("锻造器");
        
        if (isBasicForge) {
            logger.debug(`[TftOperator] 识别为基础装备锻造器`);
            return ItemForgeType.BASIC;
        }

        return ItemForgeType.NONE;
    }

    /**
     * 根据 ItemForgeType 把识别结果映射为 chessData 中的 TFTUnit 实例
     * @param forgeType 浮窗 OCR 识别出的类型（必须是非 NONE）
     * @param chessData 当前赛季的棋子数据集（一般是 getActiveChessData() 的返回）
     * @returns 匹配到的 TFTUnit；若 chessData 中找不到对应键则返回 null
     *
     * @description
     * 设计意图：
     *   - 把"枚举类型 → chessData 字段名"的映射集中到一处
     *   - 上层调用代码不需要再写 if/switch，只关心"拿到一个 TFTUnit"
     *   - 未来要新增"右键弹浮窗"的特殊单位（比如某个赛季又出新核心），
     *     只需在这张映射表里加一行，OCR 关键词加一段，上层完全不用动
     *
     * 注意 chessData[字段名] 的写法：
     *   chessData 的类型是 Record<string, TFTUnit>，所以下标访问总能编译通过；
     *   但运行时若 chess.ts 里漏定义了对应中文键，会拿到 undefined。
     *   所以这里返回 TFTUnit | null，让调用方做兜底处理。
     */
    private resolveSpecialUnitByForgeType(
        forgeType: ItemForgeType,
        chessData: Record<string, TFTUnit>
    ): TFTUnit | null {
        // 映射表：枚举值 → chess.ts 里 TFT_SPECIAL_CHESS 对应的中文键名
        // 用 Record<ItemForgeType, ...> 让 TS 帮我们检查"枚举是否穷尽覆盖"
        // 这样以后 enum 加新成员，这张表会立即报错提醒
        const FORGE_TYPE_TO_CHESS_KEY: Record<ItemForgeType, string | null> = {
            [ItemForgeType.NONE]: null,                        // 占位：上层不应传 NONE 进来
            [ItemForgeType.BASIC]: "基础装备锻造器",
            [ItemForgeType.COMPLETED]: "成装锻造器",
            [ItemForgeType.ARTIFACT]: "神器装备锻造器",
            [ItemForgeType.SUPPORT]: "辅助装锻造器",
            [ItemForgeType.TIMEBREAKER_CORE]: "未来战士核心",  // 备战席显示"时空核心"
        };

        const chessKey = FORGE_TYPE_TO_CHESS_KEY[forgeType];
        if (!chessKey) return null;

        return chessData[chessKey] ?? null;
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
     * 点击发条鸟模式的退出游戏按钮（固定坐标）
     * @description 由 GameStageMonitor 的 clockworkDead 事件触发，
     *              当 InGame API 检测到玩家 isDead=true 时，
     *              直接点击固定区域退出按钮，无需模板匹配。
     */
    public async clickClockworkQuitButton(): Promise<void> {
        this.ensureInitialized();

        try {
            logger.info("[TftOperator] 发条鸟模式：玩家已死亡，点击退出按钮坐标");
            await mouseController.clickAt(clockworkTrailsQuitNowButtonPoint, MouseButtonType.LEFT);

        } catch (e: any) {
            logger.error(`[TftOperator] 点击发条鸟退出按钮异常: ${e.message}`);
        }
    }

    /**
     * 阵亡后的结算界面（"你获得了 第 x 名"）是否正在显示
     * @description 检测"现在退出"按钮的文字；窗口未初始化或截图失败时视为没有显示
     */
    public async isExitGameButtonVisible(): Promise<boolean> {
        if (!this.gameWindowRegion || !templateLoader.isReady()) return false;

        const mat = await screenCapture.captureGameRegionAsMat(exitGameButtonRegion);
        try {
            return templateMatcher.matchButton(mat, "exit_game_button").matched;
        } finally {
            mat.delete();
        }
    }

    /**
     * 点击阵亡后结算界面的"现在退出"
     */
    public async clickExitGameButton(): Promise<void> {
        this.ensureInitialized();
        await mouseController.clickAt(exitGameButtonPoint, MouseButtonType.LEFT);
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
            const levelRegion = this.hud.levelRegion;
            const absoluteRegion = new Region(
                Math.round(this.gameWindowRegion!.x + levelRegion.leftTop.x),
                Math.round(this.gameWindowRegion!.y + levelRegion.leftTop.y),
                Math.round(levelRegion.rightBottom.x - levelRegion.leftTop.x),
                Math.round(levelRegion.rightBottom.y - levelRegion.leftTop.y)
            );

            // 2. 截图并 OCR 识别
            // S18 的经验值（"4/20"）字小且偏暗，默认阈值 160 会把笔画抹掉，调低到 120
            const pngBuffer = await screenCapture.captureRegionAsPng(absoluteRegion, true, LEVEL_OCR_OPTIONS);
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
     * "/" 也可能整个丢失：
     * - "0/10" → "010"
     *
     * 修复策略：
     * 1. 匹配 "X级 数字串" 格式
     * 2. 先假设 "/" 被误识别，遍历数字串里可能是 "/" 的字符；都不合法再假设 "/" 丢失，遍历所有切分位置
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

        // 校验切分结果，不合法返回 null
        const parseXp = (currentXpStr: string, totalXpStr: string) => {
            // 跳过空字符串或以 0 开头的多位数（如 "06"）
            if (!currentXpStr || !totalXpStr) return null;
            if (currentXpStr.length > 1 && currentXpStr[0] === '0') return null;
            if (totalXpStr.length > 1 && totalXpStr[0] === '0') return null;

            const currentXp = parseInt(currentXpStr, 10);
            const totalXp = parseInt(totalXpStr, 10);

            // totalXp 必须是合法值（这是最严格的约束），且当前经验不能超过升级所需
            if (!VALID_TOTAL_XP.has(totalXp) || currentXp >= totalXp) return null;
            return { level, currentXp, totalXp };
        };

        // 1. "/" 被误识别成了别的字符
        for (let i = 1; i < xpDigits.length; i++) {
            if (!SLASH_MISRECOGNIZED_CHARS.includes(xpDigits[i])) continue;

            const result = parseXp(xpDigits.substring(0, i), xpDigits.substring(i + 1));
            if (result) {
                logger.debug(
                    `[TftOperator] 兜底修复: "${xpDigits}" → "${result.currentXp}/${result.totalXp}" ` +
                    `(在位置 ${i} 处将 "${xpDigits[i]}" 还原为 "/")`
                );
                return result;
            }
        }

        // 2. "/" 整个丢失
        for (let i = 1; i < xpDigits.length; i++) {
            const result = parseXp(xpDigits.substring(0, i), xpDigits.substring(i));
            if (result) {
                logger.debug(
                    `[TftOperator] 兜底修复: "${xpDigits}" → "${result.currentXp}/${result.totalXp}" (在位置 ${i} 处补上 "/")`
                );
                return result;
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
            const coinRegion = this.hud.coinRegion;
            const absoluteRegion = new Region(
                Math.round(this.gameWindowRegion!.x + coinRegion.leftTop.x),
                Math.round(this.gameWindowRegion!.y + coinRegion.leftTop.y),
                Math.round(coinRegion.rightBottom.x - coinRegion.leftTop.x),
                Math.round(coinRegion.rightBottom.y - coinRegion.leftTop.y)
            );

            // 2. 截图并 OCR 识别
            // 复用 GAME_STAGE worker，因为金币只会是 0-9 的数字
            // S18 的金币图标紧挨着数字、随数字位数一起移动，没法靠裁剪排除，用 RGB 最小值灰度把它压暗
            const pngBuffer = await screenCapture.captureRegionAsPng(absoluteRegion, true, COIN_OCR_OPTIONS);
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
            const retryBuffer = await screenCapture.captureRegionAsPng(absoluteRegion, true, COIN_OCR_OPTIONS);
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
            const relativeOrbs = templateMatcher.matchLootOrbs(targetMat, y => lootOrbScaleAt(y + lootRegion.leftTop.y));

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

        logger.debug(`[TftOperator] 小小英雄归位中... 目标坐标: (${littleLegendDefaultPoint.x}, ${littleLegendDefaultPoint.y})`);

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
            fromPoint = fightBoardUnitPoint[location as keyof typeof fightBoardUnitPoint];
        }

        if (!fromPoint) {
            logger.error(`[TftOperator] 卖出失败，无效的位置: ${location}`);
            return;
        }

        // 卖出点：商店中间位置 (SLOT_3)
        // 也可以是屏幕左右下角的卖出区域，但拖到商店最通用
        const sellPoint = this.hud.shopSlot.SHOP_SLOT_3;

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

        const fromPoint = fightBoardUnitPoint[fromLocation];
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

        const fromPoint = fightBoardUnitPoint[boardLocation];
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
        const shopPoint = this.hud.shopSlot.SHOP_SLOT_3;
        await mouseController.drag(forgePoint, shopPoint);

        // 4. 等待锻造器选择页面刷新
        await sleep(500);
        // 5. 选择装备，先固定选中间的装备（选择界面在屏幕中间，不再和商店卡片重合）
        await mouseController.clickAt(forgePickPoint, MouseButtonType.LEFT);
        // TODO: 识别装备并精准选择（根据阵容需求选择最优装备）
    }

    /**
     * 识别当前的连胜 / 连败
     * @description 看金币右边火焰图标的颜色（蓝色连败、橙色连胜、灰色没有），再识别旁边的次数
     * @returns 认不出来为 null
     */
    public async getStreak(): Promise<StreakInfo | null> {
        this.ensureInitialized();

        const mat = await screenCapture.captureGameRegionAsMat(this.hud.streakIconRegion);
        let bluePixels = 0;
        let orangePixels = 0;
        try {
            const channels = mat.channels();
            for (let i = 0; i < mat.data.length; i += channels) {
                const redMinusBlue = mat.data[i] - mat.data[i + 2];
                if (redMinusBlue < -STREAK_COLOR_DIFF) bluePixels++;
                if (redMinusBlue > STREAK_COLOR_DIFF) orangePixels++;
            }
        } finally {
            mat.delete();
        }

        if (Math.max(bluePixels, orangePixels) < STREAK_MIN_COLORED_PIXELS) {
            return { type: 'none', count: 0 };
        }

        const countRegion = screenCapture.toAbsoluteRegion(this.hud.streakCountRegion);
        const text = await ocrService.recognize(await screenCapture.captureRegionAsPng(countRegion, true), OcrWorkerType.GAME_STAGE);
        const count = parseInt(text.replace(/\D/g, ""), 10);

        if (Number.isNaN(count)) {
            logger.warn(`[TftOperator] 连胜 / 连败次数识别失败: "${text.trim()}"`, true);
            return null;
        }
        return { type: bluePixels > orangePixels ? 'loss' : 'win', count };
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
        const toPoint = fightBoardUnitPoint[boardLocation];

        if (!toPoint) {
            logger.error(`[TftOperator] 无效的棋盘位置: ${boardLocation}`);
            return;
        }

        logger.info(`[TftOperator] 穿装备: 槽位${equipSlotIndex}(${equipSlotKey}) -> ${boardLocation}`);

        // 3. 执行拖拽操作
        await mouseController.drag(fromPoint, toPoint, EQUIP_DRAG_OPTIONS);
    }

    /**
     * 【调试用】扫描棋盘和装备栏，随机挑一件装备穿给一个随机棋子，并检查有没有穿上
     * @description 装备穿上后拿不下来，所以一次只穿一件
     */
    public async equipRandomForDebug(): Promise<DebugEquipResult> {
        const units = (await this.getFightBoardInfo()).filter((unit): unit is BoardUnit => unit !== null);
        const candidates = units.filter(unit => unit.equips.length < 3);
        if (candidates.length === 0) {
            throw new Error(units.length === 0 ? "棋盘上没有识别到棋子" : "棋盘上的棋子都已经有 3 件装备");
        }

        const equips = await this.getEquipInfo();
        if (equips.length > 0 && equips.every(e => e.name === UNKNOWN_EQUIP_NAME)) {
            throw new Error("装备栏全部没认出来，请检查「发条鸟模式」开关和当前对局是否一致");
        }
        // equipId 为 "-1" 的是拆卸器、重铸器等道具，以及没认出来的装备，不能穿
        const wearableIndexes = equips.flatMap((equip, index) => equip.equipId === "-1" ? [] : [index]);
        if (wearableIndexes.length === 0) {
            throw new Error(equips.length === 0 ? "装备栏为空" : `装备栏里没有能穿的装备：${equips.map(e => e.name).join("、")}`);
        }

        const pick = <T>(list: T[]): T => list[Math.floor(Math.random() * list.length)];
        const target = pick(candidates);
        const equipIndex = pick(wearableIndexes);
        const equip = equips[equipIndex];

        logger.info(`[TftOperator] 随机穿装备: ${equip.name}(${equip.slot}) -> ${target.location} ${target.tftUnit.displayName}`);
        await this.equipToBoardUnit(equipIndex, target.location);

        // 等装备飞到棋子身上、装备栏重新排列
        await sleep(800);
        const countOf = (list: IdentifiedEquip[]) => list.filter(e => e.name === equip.name).length;
        const success = countOf(await this.getEquipInfo()) < countOf(equips);

        logger.info(`[TftOperator] 随机穿装备: ${success ? "已穿上" : "没有穿上，装备栏没有变化"}`);
        return { units, equips, equip, target, success };
    }
}

// ============================================================================
// 导出
// ============================================================================

/** TftOperator 单例实例 */
export const tftOperator = TftOperator.getInstance();
