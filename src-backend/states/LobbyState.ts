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
import { StartState } from "./StartState.ts";
import { settingsStore } from "../utils/SettingsStore.ts";
import { TFTMode } from "../TFTProtocol.ts";

/** 创建房间后的等待时间 (ms) */
const LOBBY_CREATE_DELAY_MS = 500;

/** 流程中断后重试前的等待时间 (ms) */
const RETRY_DELAY_MS = 1000;

/** abort 信号轮询间隔 (ms)，作为事件监听的兜底 */
const ABORT_CHECK_INTERVAL_MS = 500;

/** 开始匹配的最大重试次数 */
const MAX_START_MATCH_RETRIES = 10;

/** 开始匹配重试间隔 (ms) */
const START_MATCH_RETRY_DELAY_MS = 1000;

/** 发条鸟模式排队超时时间 (ms) - 超过此时间未进入游戏则退出房间重试 */
const CLOCKWORK_MATCH_TIMEOUT_MS = 3000;

/** 退出房间重试间隔 (ms) - 每秒重试一次，用于收集限频 CD 数据 */
const LEAVE_LOBBY_RETRY_DELAY_MS = 1000;

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
     * @returns TFT 队列 ID（匹配、排位或发条鸟）
     */
    private getQueueId(): Queue {
        const tftMode = settingsStore.get('tftMode');
        
        switch (tftMode) {
            case TFTMode.RANK:
                logger.info("[LobbyState] 当前模式: 排位赛");
                return Queue.TFT_RANKED;
            case TFTMode.CLOCKWORK_TRAILS:
                logger.info("[LobbyState] 当前模式: 发条鸟的试炼");
                return Queue.TFT_FATIAO; // 发条鸟队列ID = 1220
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
        const tftMode = settingsStore.get('tftMode');
        const isClockworkMode = tftMode === TFTMode.CLOCKWORK_TRAILS;

        // 创建房间
        logger.info("[LobbyState] 正在创建房间...");
        await this.lcuManager.createLobbyByQueueId(queueId);
        await sleep(LOBBY_CREATE_DELAY_MS);

        // 开始排队（带重试机制）
        const matchStarted = await this.startMatchWithRetry(signal);
        if (!matchStarted) {
            // 重试都失败了，返回 EndState 结束流程
            logger.error("[LobbyState] 开始匹配失败，已达到最大重试次数，流程结束");
            return new EndState();
        }

        // 等待游戏开始（发条鸟模式有超时机制）
        const waitResult = await this.waitForGameToStart(signal, isClockworkMode);

        if (waitResult === 'started') {
            logger.info("[LobbyState] 游戏已开始！流转到 GameLoadingState");
            return new GameLoadingState();
        } else if (waitResult === 'timeout') {
            // 发条鸟模式超时，退出房间（带重试机制），回到 StartState 重新开始
            logger.warn("[LobbyState] 发条鸟模式排队超时，退出房间重新开始...");
            const leaveSuccess = await this.leaveLobbyWithRetry(signal);
            if (!leaveSuccess) {
                // 退出房间重试都失败了，返回 EndState 结束流程
                logger.error("[LobbyState] 退出房间失败，已达到最大重试次数，流程结束");
                return new EndState();
            }
            return new StartState();
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
     * 开始匹配（带重试机制）
     * @param signal AbortSignal 用于取消操作
     * @returns true 表示成功开始匹配，false 表示重试都失败了
     * @description 当 LCU 请求失败时（如 400 Bad Request），最多重试 10 次
     *              每次重试前等待 1 秒，给客户端一些缓冲时间
     */
    private async startMatchWithRetry(signal: AbortSignal): Promise<boolean> {
        for (let attempt = 1; attempt <= MAX_START_MATCH_RETRIES; attempt++) {
            // 检查是否已取消
            if (signal.aborted) {
                logger.info("[LobbyState] 收到取消信号，停止匹配重试");
                return false;
            }

            try {
                logger.info(`[LobbyState] 正在开始排队...`);
                await this.lcuManager!.startMatch();
                logger.info("[LobbyState] 排队成功！");
                return true;
            } catch (e: any) {
                logger.warn(`[LobbyState] 开始匹配失败 (第 ${attempt} 次): ${e.message}`);

                // 如果还有重试机会，等待一段时间后重试
                if (attempt < MAX_START_MATCH_RETRIES) {
                    logger.info(`[LobbyState] ${START_MATCH_RETRY_DELAY_MS}ms 后重试...`);
                    await sleep(START_MATCH_RETRY_DELAY_MS);
                }
            }
        }

        return false;
    }

    /**
     * 退出房间（无限重试，每秒一次，直到成功）
     * @param signal AbortSignal 用于取消操作
     * @returns true 表示成功退出房间，false 表示被取消
     * @description LCU API 有限频机制（约 11 秒 CD），每秒重试一次直到成功
     *              特殊错误码处理：
     *              - 404：房间已不存在，视为退出成功
     *              - 423：房间已锁定（已进入对局），视为正常状态
     */
    private async leaveLobbyWithRetry(signal: AbortSignal): Promise<boolean> {
        let attempt = 0;
        
        while (true) {
            attempt++;
            
            // 检查是否已取消
            if (signal.aborted) {
                logger.info("[LobbyState] 收到取消信号，停止退出房间重试");
                return false;
            }

            try {
                logger.info(`[LobbyState] 正在退出房间... (第 ${attempt} 次尝试)`);
                await this.lcuManager!.leaveLobby();
                await sleep(100);  // 等待房间退出完成
                logger.info(`[LobbyState] 成功退出房间！共尝试 ${attempt} 次`);
                return true;
            } catch (e: any) {
                const errorMsg = e.message || '';
                
                // 404 表示房间已不存在，视为退出成功
                if (errorMsg.includes('404')) {
                    logger.info(`[LobbyState] 房间已不存在 (404)，视为退出成功！共尝试 ${attempt} 次`);
                    return true;
                }
                
                // 423 Locked 表示已进入对局，房间被锁定，视为正常（已经进游戏了）
                if (errorMsg.includes('423')) {
                    logger.info(`[LobbyState] 房间已锁定 (423)，已进入对局，视为正常！共尝试 ${attempt} 次`);
                    return true;
                }
                
                logger.warn(`[LobbyState] 退出房间失败 (第 ${attempt} 次): ${errorMsg}`);
                // 等待 1 秒后重试
                await sleep(LEAVE_LOBBY_RETRY_DELAY_MS);
            }
        }
    }

    /**
     * 等待从"排队"到"游戏开始"的完整流程
     * @param signal AbortSignal 用于取消等待
     * @param isClockworkMode 是否为发条鸟模式（启用超时机制）
     * @returns 'started' 表示游戏成功开始，'timeout' 表示超时，'interrupted' 表示流程中断
     */
    private waitForGameToStart(signal: AbortSignal, isClockworkMode: boolean = false): Promise<'started' | 'timeout' | 'interrupted'> {
        return new Promise((resolve) => {
            let stopCheckInterval: NodeJS.Timeout | null = null;
            let timeoutTimer: NodeJS.Timeout | null = null;
            let isResolved = false;
            let lastAcceptTime = 0;  // 上次接受对局的时间戳，用于节流

            /**
             * 安全的 resolve，防止重复调用
             */
            const safeResolve = (value: 'started' | 'timeout' | 'interrupted') => {
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
                if (timeoutTimer) {
                    clearTimeout(timeoutTimer);
                    timeoutTimer = null;
                }
            };

            /**
             * 处理 abort 事件
             */
            const onAbort = () => {
                logger.info("[LobbyState] 收到取消信号，停止等待");
                safeResolve('interrupted');
            };

            /**
             * 监听"找到对局"事件，自动接受
             * 使用节流：100ms内只调用一次 acceptMatch
             */
            const onReadyCheck = (eventData: LCUWebSocketMessage) => {
                const now = Date.now();
                if (eventData.data?.state === "InProgress" && now - lastAcceptTime >= 100) {
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
                    safeResolve('started');
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
                    safeResolve('interrupted');
                }
            }, ABORT_CHECK_INTERVAL_MS);

            // 发条鸟模式：设置超时定时器
            if (isClockworkMode) {
                logger.info(`[LobbyState] 发条鸟模式：${CLOCKWORK_MATCH_TIMEOUT_MS / 1000}秒内未进入游戏将退出重试`);
                timeoutTimer = setTimeout(() => {
                    logger.warn("[LobbyState] 发条鸟模式排队超时！");
                    safeResolve('timeout');
                }, CLOCKWORK_MATCH_TIMEOUT_MS);
            }
        });
    }
}
