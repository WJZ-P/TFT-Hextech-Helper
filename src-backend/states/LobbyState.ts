/**
 * 大厅状态
 * @module LobbyState
 * @description 客户端已启动，创建房间、选择模式、排队匹配
 */

import { IState } from "./IState";
import LCUManager, { LcuEventUri, LCUWebSocketMessage } from "../lcu/LCUManager.ts";
import { Queue, GameFlowPhase } from "../lcu/utils/LCUProtocols.ts";
import { sleep } from "../utils/HelperTools.ts";
import { logger } from "../utils/Logger.ts";
import { GameLoadingState } from "./GameLoadingState.ts";
import { EndState } from "./EndState.ts";
import { settingsStore } from "../utils/SettingsStore.ts";
import { TFTMode } from "../TFTProtocol.ts";

/** 创建房间后的等待时间 (ms) */
const LOBBY_CREATE_DELAY_MS = 500;

/** 流程中断后重试前的等待时间 (ms) */
const RETRY_DELAY_MS = 1000;

/** abort 信号轮询间隔 (ms)，作为事件监听的兜底 */
const ABORT_CHECK_INTERVAL_MS = 500;

/**
 * 大厅状态类
 * @description 负责创建房间、开始匹配、等待游戏开始
 */
export class LobbyState implements IState {
    /** 状态名称 */
    public readonly name = "LobbyState";

    private lcuManager = LCUManager.getInstance();

    /**
     * 根据用户设置获取对应的队列 ID
     * @returns TFT 队列 ID（匹配或排位）
     */
    private getQueueId(): Queue {
        const tftMode = settingsStore.get('tftMode');
        
        switch (tftMode) {
            case TFTMode.RANK:
                logger.info("[LobbyState] 当前模式: 排位赛");
                return Queue.TFT_RANKED;
            case TFTMode.NORMAL:
            default:
                logger.info("[LobbyState] 当前模式: 匹配模式");
                return Queue.TFT_NORMAL;
        }
    }

    /**
     * 执行大厅状态逻辑
     * @param signal AbortSignal 用于取消操作
     * @returns 下一个状态
     */
    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted();

        if (!this.lcuManager) {
            throw Error("[LobbyState] 检测到客户端未启动！");
        }

        // 获取用户选择的游戏模式
        const queueId = this.getQueueId();

        // 创建房间
        logger.info("[LobbyState] 正在创建房间...");
        await this.lcuManager.createLobbyByQueueId(queueId);
        await sleep(LOBBY_CREATE_DELAY_MS);

        // 开始排队
        logger.info("[LobbyState] 正在开始排队...");
        await this.lcuManager.startMatch();

        // 等待游戏开始
        const isGameStarted = await this.waitForGameToStart(signal);

        if (isGameStarted) {
            logger.info("[LobbyState] 游戏已开始！流转到 GameLoadingState");
            return new GameLoadingState();
        } else if (signal.aborted) {
            // 用户主动停止
            return new EndState();
        } else {
            // 流程中断 (如秒退)，重新排队
            logger.warn("[LobbyState] 流程中断 (如秒退)，将重新排队...");
            await sleep(RETRY_DELAY_MS);
            return this;
        }
    }

    /**
     * 等待从"排队"到"游戏开始"的完整流程
     * @param signal AbortSignal 用于取消等待
     * @returns true 表示游戏成功开始，false 表示流程中断
     */
    private waitForGameToStart(signal: AbortSignal): Promise<boolean> {
        return new Promise((resolve) => {
            let stopCheckInterval: NodeJS.Timeout | null = null;
            let isResolved = false;
            let lastAcceptTime = 0;  // 上次接受对局的时间戳，用于节流

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
                this.lcuManager?.off(LcuEventUri.READY_CHECK, onReadyCheck);
                this.lcuManager?.off(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);
                if (stopCheckInterval) {
                    clearInterval(stopCheckInterval);
                    stopCheckInterval = null;
                }
            };

            /**
             * 处理 abort 事件
             */
            const onAbort = () => {
                logger.info("[LobbyState] 收到取消信号，停止等待");
                safeResolve(false);
            };

            /**
             * 监听"找到对局"事件，自动接受
             * 使用节流：1秒内只调用一次 acceptMatch
             */
            const onReadyCheck = (eventData: LCUWebSocketMessage) => {
                const now = Date.now();
                if (eventData.data?.state === "InProgress" && now - lastAcceptTime >= 1000) {
                    lastAcceptTime = now;
                    logger.info("[LobbyState] 已找到对局！正在自动接受...");
                    this.lcuManager?.acceptMatch().catch((reason) => {
                        logger.warn(`[LobbyState] 接受对局失败: ${reason}`);
                    });
                }
            };

            /**
             * 监听"游戏阶段变化"事件
             */
            const onGameflowPhase = (eventData: LCUWebSocketMessage) => {
                const phase = eventData.data?.phase as GameFlowPhase | undefined;
                //  这个EventData.data 内容太多了。主要是跟对局相关的信息。
                //logger.debug(`[LobbyState] 游戏阶段: ${JSON.stringify(eventData, null, 2)}`);
                logger.info(`[LobbyState] 监听到游戏阶段: ${phase}`);

                if (phase === "InProgress") {
                    logger.info("[LobbyState] 监听到 GAMEFLOW 变为 InProgress");
                    safeResolve(true);
                }
            };

            // 监听 abort 事件
            signal.addEventListener("abort", onAbort, { once: true });

            // 注册 LCU 事件监听器
            this.lcuManager?.on(LcuEventUri.READY_CHECK, onReadyCheck);
            this.lcuManager?.on(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);

            // 定期检查 signal 状态 (作为 abort 事件的兜底)
            stopCheckInterval = setInterval(() => {
                if (signal.aborted) {
                    safeResolve(false);
                }
            }, ABORT_CHECK_INTERVAL_MS);
        });
    }
}
