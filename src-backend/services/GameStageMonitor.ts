/**
 * 游戏阶段监视器
 * @module GameStageMonitor
 * @description 负责后台轮询游戏阶段，检测变化后发出事件
 *              采用观察者模式，将"阶段检测"与"策略执行"解耦
 * 
 * 检测逻辑（只检测两个区域）：
 * 1. 游戏阶段文本区域（如 "2-1"）：文本变化 → 进入新回合 → 触发 stageChange
 * 2. "战斗环节"文字区域：检测到文字 → 进入战斗状态 → 触发 fightingStart
 * 
 * 事件类型：
 * - stageChange: 阶段/回合变化时触发（如 1-1 → 1-2 或 1-4 → 2-1）
 * - fightingStart: 战斗阶段开始时触发（检测到"战斗环节"文字）
 * 
 * 注意：不需要单独检测战斗结束，因为进入新回合时会自动重置战斗状态
 * 
 * 使用方式：
 * ```typescript
 * const monitor = GameStageMonitor.getInstance();
 * monitor.on('stageChange', (event) => { ... });
 * monitor.start();
 * ```
 */

import { EventEmitter } from 'events';
import { tftOperator } from '../TftOperator';
import { GameStageType, GameStageResult, combatPhaseTextRegion } from '../TFTProtocol';
import { logger } from '../utils/Logger';
import { ocrService, OcrWorkerType, screenCapture } from '../tft';


// ============================================================================
// 类型定义
// ============================================================================

/**
 * 阶段变化事件数据
 * @description 当检测到新回合或新阶段时，携带的事件数据
 */
export interface GameStageEvent {
    /** 阶段文本，如 "2-1" */
    stageText: string;
    /** 阶段类型枚举 */
    type: GameStageType;
    /** 大阶段号（如 "2-1" 中的 2） */
    stage: number;
    /** 回合号（如 "2-1" 中的 1） */
    round: number;
    /** 是否进入了新的大阶段（如从 1 阶段进入 2 阶段） */
    isNewStage: boolean;
}

/**
 * 事件类型映射
 * @description 定义 GameStageMonitor 支持的所有事件及其数据类型
 */
export interface GameStageEvents {
    /** 阶段/回合变化事件 */
    stageChange: [GameStageEvent];
    /** 战斗阶段开始事件（检测到"战斗环节"文字） */
    fightingStart: [];
}

// ============================================================================
// GameStageMonitor 类
// ============================================================================

/**
 * 游戏阶段监视器（单例）
 * @description 后台轮询游戏阶段，检测变化后发出事件
 *              订阅者（如 StrategyService）监听事件并执行相应策略
 */
export class GameStageMonitor extends EventEmitter {
    private static instance: GameStageMonitor;

    /** 轮询间隔（毫秒）：2 秒一次，避免高频检测 */
    private pollInterval: number = 2000;

    /** 轮询定时器 ID */
    private pollTimer: NodeJS.Timeout | null = null;

    /** 是否正在运行 */
    public isRunning: boolean = false;

    /** 当前阶段文本（如 "2-1"） */
    public stageText: string = '';

    /** 当前大阶段号（如 "2-1" 中的 2） */
    public stage: number = 0;

    /** 当前回合号（如 "2-1" 中的 1） */
    public round: number = 0;

    /** 当前是否处于战斗阶段 */
    public isFighting: boolean = false;

    /** 当前阶段类型（如 PVE、PVP、CAROUSEL 等） */
    public currentStageType: GameStageType = GameStageType.UNKNOWN;

    private constructor() {
        super();
        // 设置最大监听器数量，避免内存泄漏警告
        this.setMaxListeners(20);
    }

    /**
     * 获取单例实例
     */
    public static getInstance(): GameStageMonitor {
        if (!GameStageMonitor.instance) {
            GameStageMonitor.instance = new GameStageMonitor();
        }
        return GameStageMonitor.instance;
    }

    // ============================================================================
    // 公共接口
    // ============================================================================

    /**
     * 启动阶段轮询
     * @param interval 轮询间隔（毫秒），默认 2000ms（2 秒）
     * @description 开始后台轮询，检测阶段变化并发出事件
     */
    public start(interval: number = 2000): void {
        if (this.isRunning) {
            logger.warn('[GameStageMonitor] 已经在运行中，忽略重复启动');
            return;
        }

        this.pollInterval = interval;
        this.isRunning = true;

        logger.info(`[GameStageMonitor] 启动阶段轮询，间隔: ${interval}ms`);

        // 立即执行一次检测
        this.checkStage();

        // 启动定时轮询
        this.pollTimer = setInterval(() => {
            this.checkStage();
        }, this.pollInterval);
    }

    /**
     * 停止阶段轮询
     * @description 停止后台轮询，清理定时器
     */
    public stop(): void {
        if (!this.isRunning) {
            logger.debug('[GameStageMonitor] 未在运行，忽略停止请求');
            return;
        }

        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }

        this.isRunning = false;
        logger.info('[GameStageMonitor] 阶段轮询已停止');
    }

    /**
     * 重置状态
     * @description 清除所有缓存的阶段信息，通常在游戏结束时调用
     */
    public reset(): void {
        this.stageText = '';
        this.stage = 0;
        this.round = 0;
        this.isFighting = false;
        this.currentStageType = GameStageType.UNKNOWN;
        logger.info('[GameStageMonitor] 状态已重置');
    }

    // ============================================================================
    // 私有方法
    // ============================================================================

    /**
     * 检测阶段变化
     * @description 轮询的核心方法，检测两个区域：
     *              1. 阶段文本区域 → 检测是否进入新回合
     *              2. "战斗环节"文字区域 → 检测是否进入战斗状态
     */
    private async checkStage(): Promise<void> {
        try {
            // 1. 获取当前游戏阶段
            const stageResult: GameStageResult = await tftOperator.getGameStage();
            const { type, stageText } = stageResult;

            // 2. 如果无法识别，跳过本次检测
            if (type === GameStageType.UNKNOWN || !stageText) {
                return;
            }

            // 3. 检测阶段文本是否变化（进入新回合）
            if (stageText !== this.stageText) {
                // 解析阶段文本
                const parsed = this.parseStageText(stageText);

                if (parsed) {
                    const { stage, round } = parsed;

                    // 判断是否进入新的大阶段
                    const isNewStage = stage !== this.stage;

                    // 构建事件数据
                    const event: GameStageEvent = {
                        stageText,
                        type,
                        stage,
                        round,
                        isNewStage,
                    };

                    // 更新缓存
                    this.stageText = stageText;
                    this.stage = stage;
                    this.round = round;
                    this.currentStageType = type;  // 更新当前阶段类型

                    // 新回合开始时，重置战斗状态（默认是准备阶段）
                    this.isFighting = false;

                    // 发出事件
                    logger.info(
                        `[GameStageMonitor] 阶段变化: ${stageText} ` +
                        `(${isNewStage ? '新阶段' : '新回合'}, 类型: ${type})`
                    );
                    this.emit('stageChange', event);
                }
            }

            // 4. 检测战斗阶段（检测"战斗环节"文字）
            await this.checkFightingPhase();

        } catch (error) {
            logger.error(`[GameStageMonitor] 阶段检测异常: ${error}`);
        }
    }

    /**
     * 解析阶段文本
     * @param stageText 阶段文本（如 "2-1"）
     * @returns 解析结果，包含 stage 和 round，解析失败返回 null
     */
    private parseStageText(stageText: string): { stage: number; round: number } | null {
        // 匹配 "数字-数字" 格式
        const match = stageText.match(/^(\d+)-(\d+)$/);
        if (!match) {
            // 特殊模式（如 clockwork）暂不处理
            logger.debug(`[GameStageMonitor] 无法解析阶段文本: "${stageText}"`);
            return null;
        }

        let stage = parseInt(match[1], 10);
        const round = parseInt(match[2], 10);

        // 修正 OCR 误识别：41-1 → 1-1, 11-1 → 1-1
        // TFT 最多只有 7 个大阶段，超过说明是误识别，取最后一位
        if (stage > 7 && match[1].length > 1) {
            const fixedStage = parseInt(match[1].slice(-1), 10);
            logger.info(`[GameStageMonitor] 修正阶段误识别: "${stageText}" → "${fixedStage}-${round}"`);
            stage = fixedStage;
        }

        return { stage, round };
    }

    /**
     * 检测战斗阶段
     * @description 检测"战斗环节"文字区域，如果检测到文字则进入战斗状态
     *              只检测"进入战斗"，不检测"战斗结束"（新回合开始时自动重置）
     * 
     * TODO: 实现战斗阶段检测逻辑
     * - 使用 combatPhaseTextRegion 区域进行 OCR 识别
     * - 检测到"战斗环节"文字 → 设置 _isFighting = true，发出 fightingStart 事件
     */
    private async checkFightingPhase(): Promise<void> {
        // 如果已经是战斗状态，不需要重复检测
        if (this.isFighting) {
            return;
        }

        // 如果截图模块还没初始化（尚未定位到游戏窗口），先不检测
        if (!screenCapture.isInitialized()) {
            return;
        }

        try {
            const isFightingNow = await this.detectCombatPhaseText();

            if (isFightingNow) {
                this.isFighting = true;
                logger.info('[GameStageMonitor] 检测到"战斗环节"，进入战斗状态');
                this.emit('fightingStart');
            }
        } catch (e: any) {
            // 这里用 debug，避免 OCR 失败时刷屏；需要排查时再开 debug
            logger.debug(`[GameStageMonitor] 战斗阶段检测失败: ${e?.message ?? e}`);
        }
    }


    /**
     * 检测"战斗环节"文字
     * @description 通过 OCR 识别 `combatPhaseTextRegion` 区域的文字。
     * 
     * 实现要点：
     * - 该区域是固定 UI 文本（短语），因此 OCR 白名单可以收紧，提升准确率
     * - 只要识别结果包含“战斗”就判定为进入战斗（允许 OCR 少字/漏字）
     */
    private async detectCombatPhaseText(): Promise<boolean> {
        // 截取“战斗环节”文字区域（游戏相对坐标 -> 屏幕绝对坐标）
        const pngBuffer = await screenCapture.captureGameRegionAsPng(combatPhaseTextRegion, true);

        // 使用专用 Worker，避免 CHESS/LEVEL 的白名单限制导致识别不了“战斗环节”
        const text = await ocrService.recognize(pngBuffer, OcrWorkerType.COMBAT_PHASE);
        const cleanText = text.replace(/\s/g, "");

        // logger.debug(`[GameStageMonitor] 战斗文字 OCR: "${cleanText}"`);

        // 只要包含“战斗”就算命中（更鲁棒）
        return cleanText.includes("战斗");
    }

}

// ============================================================================
// 导出
// ============================================================================

/** GameStageMonitor 单例实例 */
export const gameStageMonitor = GameStageMonitor.getInstance();
