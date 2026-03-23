/**
 * 海克斯科技核心服务
 * @module HexService
 * @description 自动下棋的状态机引擎，管理整个自动化流程的生命周期
 */

import { logger } from "../utils/Logger.ts";
import { IState } from "../states/IState.ts";
import { IdleState } from "../states/IdleState.ts";
import { EndState } from "../states/EndState.ts";
import { StartState } from "../states/StartState.ts";
import { sleep } from "../utils/HelperTools.ts";
import { settingsStore } from "../utils/SettingsStore.ts";
import { TFTMode } from "../TFTProtocol.ts";
import { notifyStatsUpdated, notifyStopAfterGameState, notifyScheduledStopTriggered, showToast } from "../utils/ToastBridge.ts";
import { analyticsManager, AnalyticsEvent } from "../utils/AnalyticsManager.ts";

/** 状态转换间隔 (ms) - 设置较短以提高状态切换响应速度 */
const STATE_TRANSITION_DELAY_MS = 200;

/**
 * 海克斯科技服务类
 * @description 单例模式的状态机引擎，负责协调各个状态的执行
 */
export class HexService {
    private static instance: HexService | null = null;

    /** 取消控制器，用于优雅停止 */
    private abortController: AbortController | null = null;

    /** 当前状态 */
    private currentState: IState;

    /** 本局结束后自动停止的标志 */
    private _stopAfterCurrentGame: boolean = false;

    /** 本次会话已挂机局数（应用重启才重置） */
    private _sessionGamesPlayed: number = 0;

    /** 当前运行段的起始时间戳（ms），0 表示当前未运行 */
    private _currentSegmentStart: number = 0;

    /** 已累计的运行时长（ms），stop() 时把当前段累加进来 */
    private _accumulatedMs: number = 0;

    /** 定时停止的定时器 ID，null 表示未设置 */
    private _scheduledStopTimer: NodeJS.Timeout | null = null;
    /** 定时停止的目标时间（ISO 字符串），用于 UI 展示和持久化 */
    private _scheduledStopTime: string | null = null;

    /**
     * 私有构造函数，确保单例
     */
    private constructor() {
        this.currentState = new IdleState();
    }

    /**
     * 获取 HexService 单例
     */
    public static getInstance(): HexService {
        if (!HexService.instance) {
            HexService.instance = new HexService();
        }
        return HexService.instance;
    }

    /**
     * 检查服务是否正在运行
     * @description 通过 abortController 是否存在来判断
     */
    public get isRunning(): boolean {
        return this.abortController !== null;
    }

    /**
     * 获取"本局结束后自动停止"状态
     */
    public get stopAfterCurrentGame(): boolean {
        return this._stopAfterCurrentGame;
    }

    /**
     * 切换"本局结束后自动停止"状态
     * @returns 切换后的状态值
     */
    public toggleStopAfterCurrentGame(): boolean {
        this._stopAfterCurrentGame = !this._stopAfterCurrentGame;
        logger.info(`[HexService] 本局结束后自动停止: ${this._stopAfterCurrentGame ? '已开启' : '已关闭'}`);
        return this._stopAfterCurrentGame;
    }

    /**
     * 设置"本局结束后自动停止"状态
     * @param value 要设置的值
     */
    public setStopAfterCurrentGame(value: boolean): void {
        this._stopAfterCurrentGame = value;
        logger.info(`[HexService] 本局结束后自动停止: ${value ? '已开启' : '已关闭'}`);
    }

    // ========================================================================
    // 定时停止功能
    // ========================================================================

    /**
     * 获取当前设置的定时停止时间
     * @returns ISO 时间字符串 或 null（未设置）
     */
    public get scheduledStopTime(): string | null {
        return this._scheduledStopTime;
    }

    /**
     * 设置定时停止
     * @param timeStr 目标时间，格式为 "HH:mm"（如 "23:00"）
     * @returns 实际的目标时间戳（ISO 字符串），供 UI 展示
     * 
     * @description 计算逻辑：
     *   1. 将 "HH:mm" 解析为今天的时间点
     *   2. 如果该时间已过，则自动推到明天
     *   3. 设置一个 setTimeout，到点后自动启用 stopAfterCurrentGame
     */
    public setScheduledStop(timeStr: string): string {
        // 先清理旧定时器
        this.clearScheduledStop();

        // 解析 "HH:mm" 格式
        const [hours, minutes] = timeStr.split(':').map(Number);
        const now = new Date();
        const target = new Date();
        target.setHours(hours, minutes, 0, 0);

        // 如果目标时间已过，推到明天
        if (target.getTime() <= now.getTime()) {
            target.setDate(target.getDate() + 1);
        }

        const delayMs = target.getTime() - now.getTime();
        this._scheduledStopTime = target.toISOString();

        logger.info(`[HexService] ⏰ 定时停止已设置: ${timeStr}（${Math.round(delayMs / 60000)} 分钟后）`);

        // 设置定时器，到点后自动启用"本局结束后停止"
        this._scheduledStopTimer = setTimeout(() => {
            logger.info('[HexService] ⏰ 定时停止时间到！自动启用"本局结束后停止"');
            this._stopAfterCurrentGame = true;
            this._scheduledStopTime = null;
            this._scheduledStopTimer = null;

            // 通知前端更新 UI（触发 stopAfterGame 状态变化）
            notifyStopAfterGameState(true);
            // 通知前端设置页面关闭定时开关（一次性触发后自动关闭）
            notifyScheduledStopTriggered();
            showToast.info('⏰ 定时停止已触发，本局结束后将自动停止挂机', { position: 'top-center' });
        }, delayMs);

        return this._scheduledStopTime;
    }

    /**
     * 取消定时停止
     */
    public clearScheduledStop(): void {
        if (this._scheduledStopTimer) {
            clearTimeout(this._scheduledStopTimer);
            this._scheduledStopTimer = null;
            logger.info('[HexService] ⏰ 定时停止已取消');
        }
        this._scheduledStopTime = null;
    }

    /**
     * 获取本次会话已挂机局数
     */
    public get sessionGamesPlayed(): number {
        return this._sessionGamesPlayed;
    }

    /**
     * 获取本次会话已运行的总时长（秒）
     * @description 累计时长 + 当前运行段时长（如果正在运行）
     */
    public get sessionElapsedSeconds(): number {
        const currentSegment = this._currentSegmentStart > 0
            ? Date.now() - this._currentSegmentStart
            : 0;
        return Math.floor((this._accumulatedMs + currentSegment) / 1000);
    }

    /**
     * 记录一局游戏完成
     * @description 在 GameRunningState 游戏正常结束时调用
     *              同时更新运行时统计（会话局数）和持久化统计（历史总局数）
     */
    public recordGameCompleted(): void {
        // 1. 运行时统计：本次会话局数 +1
        this._sessionGamesPlayed++;

        // 2. 持久化统计：历史总局数 +1
        const currentTotal = settingsStore.get('statistics.totalGamesPlayed') as number;
        settingsStore.set('statistics.totalGamesPlayed', currentTotal + 1);

        logger.info(`[HexService] 📊 本局完成！本次会话: ${this._sessionGamesPlayed} 局, 历史总计: ${currentTotal + 1} 局`);

        // 3. 通知前端统计数据已更新（实时刷新统计面板）
        notifyStatsUpdated(this.getStatistics());

        // 4. 上报游戏完成事件到 Google Analytics
        analyticsManager.trackEvent(AnalyticsEvent.GAME_COMPLETED, {
            session_games: this._sessionGamesPlayed,
            total_games: currentTotal + 1,
            tft_mode: settingsStore.get('tftMode'),
        });
    }

    /**
     * 获取完整的统计数据快照
     * @returns 包含运行时 + 持久化的统计数据
     */
    public getStatistics(): {
        sessionGamesPlayed: number;
        totalGamesPlayed: number;
        sessionElapsedSeconds: number;
    } {
        const stats = settingsStore.get('statistics');
        return {
            sessionGamesPlayed: this._sessionGamesPlayed,
            totalGamesPlayed: stats.totalGamesPlayed,
            sessionElapsedSeconds: this.sessionElapsedSeconds,
        };
    }

    /**
     * 启动海克斯科技
     * @returns true 表示启动成功
     */
    public async start(): Promise<boolean> {
        if (this.isRunning) {
            logger.warn("[HexService] 引擎已在运行中，无需重复启动。");
            return true;
        }

        // 如果不是发条鸟模式，检查是否选择了阵容
        if (settingsStore.get('tftMode') != TFTMode.CLOCKWORK_TRAILS) {
            const selectedLineupIds = settingsStore.get('selectedLineupIds');
            if (!selectedLineupIds || selectedLineupIds.length === 0) {
                logger.warn("[HexService] 未选择任何阵容，无法启动！");
                return false;
            }
        }

        try {
            logger.info("———————— [HexService] ————————");
            logger.info("[HexService] 海克斯科技，启动！");

            this.abortController = new AbortController();
            this.currentState = new StartState();
            this._stopAfterCurrentGame = false;  // 重置“本局结束后停止”标志
            this._currentSegmentStart = Date.now();  // 记录本段开始时间（不重置累计时长和局数）

            // 上报开始挂机事件
            const tftMode = settingsStore.get('tftMode');
            analyticsManager.trackEvent(AnalyticsEvent.HEX_START, {
                tft_mode: tftMode,
            });
            // 启动主循环 (异步，不阻塞)
            this.runMainLoop(this.abortController.signal);

            return true;
        } catch (e: unknown) {
            logger.error("[HexService] 启动失败！");
            console.error(e);
            return false;
        }
    }

    /**
     * 停止海克斯科技
     * @returns true 表示停止成功
     */
    public async stop(): Promise<boolean> {
        if (!this.isRunning) {
            logger.warn("[HexService] 服务已停止，无需重复操作。");
            return true;
        }

        try {
            logger.info("———————— [HexService] ————————");
            logger.info("[HexService] 海克斯科技，关闭！");

            // 把当前运行段的时长累加到总计，然后清零段起始
            if (this._currentSegmentStart > 0) {
                this._accumulatedMs += Date.now() - this._currentSegmentStart;
                this._currentSegmentStart = 0;
            }

            // 清理定时停止的定时器（用户已主动停止，不再需要定时触发）
            this.clearScheduledStop();

            // 触发取消信号，runMainLoop 的 finally 块会执行 EndState 进行清理
            this.abortController?.abort("user stop");

            return true;
        } catch (e: unknown) {
            console.error(e);
            logger.error("[HexService] 海克斯科技关闭失败！");
            return false;
        }
    }

    /**
     * 状态机主循环
     * @param signal AbortSignal 用于控制循环退出
     */
    private async runMainLoop(signal: AbortSignal): Promise<void> {
        logger.info("[HexService-Looper] 启动事件循环。");

        try {
            signal.throwIfAborted();

            // eslint-disable-next-line no-constant-condition
            while (true) {
                signal.throwIfAborted();

                // 使用状态的 name 属性输出日志
                logger.info(`[HexService-Looper] -> 当前状态: ${this.currentState.name}`);

                // 执行当前状态的 action
                const nextState = await this.currentState.action(signal);

                if (nextState === null) {
                    logger.error("[HexService-Looper] -> 状态返回 null，流程中止！");
                    break;
                }

                this.currentState = nextState;
                await sleep(STATE_TRANSITION_DELAY_MS);
            }
        } catch (error: unknown) {
            if (error instanceof Error && error.name === "AbortError") {
                logger.info("[HexService-Looper] -> 用户手动退出，挂机流程结束");
                // 上报停止挂机事件
                analyticsManager.trackEvent(AnalyticsEvent.HEX_STOP, {
                    session_games: this._sessionGamesPlayed,
                    session_elapsed_seconds: this.sessionElapsedSeconds,
                });
            } else if (error instanceof Error) {
                logger.error(
                    `[HexService-Looper] 状态机在 [${this.currentState.name}] 状态下发生严重错误: ${error.message}`
                );
            }
        } finally {
            // 收尾工作
            this.currentState = await new EndState().action(signal);
            this.abortController = null;
        }
    }
}

/** 导出 HexService 单例 */
export const hexService = HexService.getInstance();
