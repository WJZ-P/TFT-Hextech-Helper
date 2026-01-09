/**
 * 游戏运行状态
 * @module GameRunningState
 * @description 游戏进行中的状态，负责：
 *              1. 启动 GameStageMonitor（阶段监视器）
 *              2. 启动 StrategyService（策略服务订阅事件）
 *              3. 监听 GAMEFLOW_PHASE 事件，等待游戏结束
 *              4. 游戏结束后流转到 LobbyState 开始下一局
 * 
 * 与旧版 GameStageState 的区别：
 * - 旧版：自己轮询阶段 + 调用 StrategyService.executeStrategy()
 * - 新版：启动 Monitor，Monitor 发事件，StrategyService 订阅事件自动响应
 * 
 * 状态流转：
 * - 游戏结束（phase !== InProgress）→ LobbyState（自动开下一局）
 * - 用户手动停止（signalAbort）→ EndState
 */

import { IState } from "./IState";
import { LobbyState } from "./LobbyState";
import { EndState } from "./EndState";
import LCUManager, { LcuEventUri, LCUWebSocketMessage } from "../lcu/LCUManager";
import { GameFlowPhase } from "../lcu/utils/LCUProtocols";
import { gameStageMonitor } from "../services/GameStageMonitor";
import { strategyService } from "../services/StrategyService";
import { gameStateManager } from "../services/GameStateManager";
import { logger } from "../utils/Logger";
import { mouseController } from "../tft";
import { exitGameButtonPoint } from "../TFTProtocol";
import {sleep} from "../utils/HelperTools";

/** abort 信号轮询间隔 (ms)，作为事件监听的兜底 */
const ABORT_CHECK_INTERVAL_MS = 2000;

/**
 * 游戏运行状态类
 * @description 游戏进行中的主状态，启动 Monitor 后挂起等待游戏结束
 */
export class GameRunningState implements IState {
    /** 状态名称 */
    public readonly name = "GameRunningState";

    /** LCU 管理器实例 */
    private lcuManager = LCUManager.getInstance();

    /**
     * 执行游戏运行状态逻辑
     * @param signal AbortSignal 用于取消操作
     * @returns 下一个状态
     * 
     * @description 执行流程：
     * 1. 初始化游戏状态（标记游戏开始）
     * 2. 初始化策略服务（加载阵容配置）
     * 3. 订阅策略服务到 Monitor 事件
     * 4. 启动 GameStageMonitor（开始轮询阶段）
     * 5. 监听 GAMEFLOW_PHASE 事件，等待游戏结束
     * 6. 游戏结束后清理资源，返回下一个状态
     */
    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted();

        logger.info("[GameRunningState] 进入游戏运行状态");

        // 1. 标记游戏开始
        gameStateManager.startGame();
        logger.info("[GameRunningState] 游戏已开始");

        // 2. 初始化策略服务（加载阵容配置）
        const initSuccess = strategyService.initialize();
        if (!initSuccess) {
            logger.error("[GameRunningState] 策略服务初始化失败，请先选择阵容");
            // 即使初始化失败，也继续运行（避免卡死）
        }

        // 3. 订阅策略服务到 Monitor 事件
        strategyService.subscribe();

        // 4. 启动 GameStageMonitor
        gameStageMonitor.start(1000);
        logger.info("[GameRunningState] GameStageMonitor 已启动");

        // 5. 等待游戏结束
        const isGameEnded = await this.waitForGameToEnd(signal);

        // 6. 清理资源
        this.cleanup();


        // 7. 返回下一个状态
        if (signal.aborted) {
            // 用户手动停止
            logger.info("[GameRunningState] 用户手动停止，流转到 EndState");
            return new EndState();
        } else if (isGameEnded) {
            // 游戏正常结束，返回大厅开始下一局
            logger.info("[GameRunningState] 游戏结束，流转到 LobbyState 开始下一局");
            return new LobbyState();
        } else {
            // 异常情况，也返回大厅重试
            logger.warn("[GameRunningState] 异常退出，流转到 LobbyState");
            return new LobbyState();
        }
    }

    /**
     * 等待游戏结束
     * @param signal AbortSignal 用于取消等待
     * @returns true 表示游戏正常结束，false 表示被中断
     * 
     * @description 游戏结束的完整链路：
     * 1. 玩家死亡 → 触发 TFT_BATTLE_PASS 事件（此时游戏窗口还开着）
     * 2. 收到 TFT_BATTLE_PASS 后 → 调用 quitGame() 关闭游戏窗口
     * 3. 游戏窗口关闭后 → 触发 GAMEFLOW_PHASE = "WaitingForStats"
     * 4. 收到 WaitingForStats → 流转到 LobbyState
     */
    private waitForGameToEnd(signal: AbortSignal): Promise<boolean> {
        return new Promise((resolve) => {
            let stopCheckInterval: NodeJS.Timeout | null = null;
            let isResolved = false;
            /** 标记是否已经尝试过退出游戏，避免重复调用 */
            let hasTriedQuit = false;

            /**
             * 安全的 resolve，防止重复调用
             */
            const safeResolve = (value: boolean) => {
                if (isResolved) return;
                isResolved = true;
                cleanup();
                resolve(value);
            };

            /**
             * 清理所有监听器和定时器
             */
            const cleanup = () => {
                this.lcuManager?.off(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);
                this.lcuManager?.off(LcuEventUri.TFT_BATTLE_PASS, onBattlePass);
                signal.removeEventListener("abort", onAbort);
                if (stopCheckInterval) {
                    clearInterval(stopCheckInterval);
                    stopCheckInterval = null;
                }
            };

            /**
             * 处理 abort 事件
             */
            const onAbort = () => {
                logger.info("[GameRunningState] 收到取消信号，停止等待");
                safeResolve(false);
            };

            /**
             * 监听 TFT_BATTLE_PASS 事件（玩家死亡/对局结束）
             * @description 此时游戏窗口还开着，需要主动退出游戏
             *              等待 3 秒后再退出，让玩家看到结算画面
             *              
             *              退出策略：
             *              1. 先点击游戏内的"现在退出"按钮（更可靠）
             *              2. 再调用 LCU API quitGame() 作为兜底
             */
            const onBattlePass = async (_eventData: LCUWebSocketMessage) => {
                if (hasTriedQuit) return; // 避免重复调用
                hasTriedQuit = true;

                logger.info("[GameRunningState] 收到 TFT_BATTLE_PASS 事件，玩家已死亡/对局结束");
                
                // 等待 3 秒，让玩家看到结算画面，同时避免游戏还在做结算动画时就退出
                const QUIT_DELAY_MS = 3000;
                logger.info(`[GameRunningState] 等待 ${QUIT_DELAY_MS / 1000} 秒后退出游戏...`);
                await new Promise(resolve => setTimeout(resolve, QUIT_DELAY_MS));
                
                logger.info("[GameRunningState] 正在尝试关闭游戏窗口...");

                // 方案 1：点击游戏内的"现在退出"按钮
                try {
                    logger.info(`[GameRunningState] 点击"现在退出"按钮 (${exitGameButtonPoint.x}, ${exitGameButtonPoint.y})`);
                    await mouseController.clickAt(exitGameButtonPoint);
                    // 等待一小段时间让点击生效
                    await sleep(100);
                } catch (error) {
                    logger.warn(`[GameRunningState] 点击退出按钮失败: ${error}`);
                }

                // 方案 2：调用 LCU API 作为兜底
                try {
                    await this.lcuManager?.quitGame();
                    logger.info("[GameRunningState] 退出游戏请求已发送，等待 GAMEFLOW_PHASE 变化...");
                } catch (error) {
                    logger.warn(`[GameRunningState] 退出游戏请求失败: ${error}`);
                    // 即使失败也不阻塞，可能玩家已经手动关闭了
                }
            };

            /**
             * 监听"游戏阶段变化"事件
             * @description 游戏结束的两种状态：
             *              - PreEndOfGame: 游戏结束，进入结算画面
             *              - WaitingForStats: 游戏窗口已关闭，等待统计数据
             */
            const onGameflowPhase = (eventData: LCUWebSocketMessage) => {
                const phase = eventData.data?.phase as GameFlowPhase | undefined;
                logger.info(`[GameRunningState] 监听到游戏阶段: ${phase}`);

                // 游戏结束的两种状态都表示对局已结束
                if (phase && (phase === "WaitingForStats" || phase === "PreEndOfGame")) {
                    logger.info(`[GameRunningState] 检测到游戏结束 (${phase})，准备流转到下一状态`);
                    safeResolve(true);
                }
            };

            // 监听 abort 事件
            signal.addEventListener("abort", onAbort, { once: true });

            // 注册 LCU 事件监听器
            this.lcuManager?.on(LcuEventUri.TFT_BATTLE_PASS, onBattlePass);
            this.lcuManager?.on(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);

            // 定期检查 signal 状态 (作为 abort 事件的兜底)
            stopCheckInterval = setInterval(() => {
                if (signal.aborted) {
                    safeResolve(false);
                }
            }, ABORT_CHECK_INTERVAL_MS);
        });
    }

    /**
     * 清理资源
     * @description 游戏结束时调用，停止 Monitor 并重置相关服务
     */
    private cleanup(): void {
        // 1. 停止 GameStageMonitor
        gameStageMonitor.stop();
        gameStageMonitor.reset();
        logger.info("[GameRunningState] GameStageMonitor 已停止并重置");

        // 2. 重置策略服务（会自动取消订阅）
        strategyService.reset();
        logger.info("[GameRunningState] StrategyService 已重置");

        // 3. 重置游戏状态管理器
        gameStateManager.reset();
        logger.info("[GameRunningState] GameStateManager 已重置");
    }
}
