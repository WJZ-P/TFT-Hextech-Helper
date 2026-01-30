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
import GameConfigHelper from "../utils/GameConfigHelper.ts";
import { settingsStore } from "../utils/SettingsStore.ts";
import { TFTMode } from "../TFTProtocol.ts";

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

    /**
     * 启动海克斯科技
     * @returns true 表示启动成功
     */
    public async start(): Promise<boolean> {
        if (this.isRunning) {
            logger.warn("[HexService] 引擎已在运行中，无需重复启动。");
            return true;
        }

        // 检查是否选择了阵容
        const selectedLineupIds = settingsStore.get('selectedLineupIds');
        if (!selectedLineupIds || selectedLineupIds.length === 0) {
            logger.warn("[HexService] 未选择任何阵容，无法启动！");
            return false;
        }

        try {
            logger.info("———————— [HexService] ————————");
            logger.info("[HexService] 海克斯科技，启动！");

            this.abortController = new AbortController();
            this.currentState = new StartState();
            this._stopAfterCurrentGame = false;  // 重置"本局结束后停止"标志

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

            // 触发取消信号
            this.abortController?.abort("user stop");

            // 兜底：确保配置被恢复
            const configHelper = GameConfigHelper.getInstance();
            if (configHelper?.isTFTConfig === true) {
                await GameConfigHelper.restore();
            }

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
