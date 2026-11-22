/**
 * 大厅状态
 * @module LobbyState
 * @description 选择模式、排队匹配、接受对局
 *
 * 虚幻客户端的房间和排队不在 LCU 里（/lol-lobby 会返回 INVALID_REQUEST_FOR_PRODUCT），
 * 所以走 SGP 接口（见 TftSgpApi），排队进度从客户端日志里读（见 TftLogWatcher）：
 *   1. 选择队列：PUT gamemode
 *   2. 开始排队：POST startAction
 *   3. 日志出现 Event[AFK_CHECK]（找到对局）→ POST indicateAfkReadiness 接受
 *   4. 日志出现 Joining game server → 流转到 GameLoadingState 等待加载完成
 */

import { IState } from "./IState";
import { Queue } from "../lcu/utils/LCUProtocols.ts";
import { tftSgpApi } from "../lcu/TftSgpApi.ts";
import { sleep } from "../utils/HelperTools.ts";
import { logger } from "../utils/Logger.ts";
import { GameLoadingState } from "./GameLoadingState.ts";
import { EndState } from "./EndState.ts";
import { StartState } from "./StartState.ts";
import { settingsStore } from "../utils/SettingsStore.ts";
import { TFTMode } from "../TFTProtocol.ts";
import { tftLogWatcher, TftLobbyState } from "../utils/TftLogWatcher.ts";
import GameConfigHelper from "../utils/GameConfigHelper.ts";

/** 流程中断后重试前的等待时间 (ms) */
const RETRY_DELAY_MS = 1000;

/** abort 信号轮询间隔 (ms)，作为事件监听的兜底 */
const ABORT_CHECK_INTERVAL_MS = 500;

/** 选择队列的最大重试次数 */
const MAX_SET_GAME_MODE_RETRIES = 3;

/** 选择队列重试间隔 (ms) */
const SET_GAME_MODE_RETRY_DELAY_MS = 1000;

/** 开始匹配的最大重试次数 */
const MAX_START_MATCH_RETRIES = 5;

/** 开始匹配重试间隔 (ms) */
const START_MATCH_RETRY_DELAY_MS = 500;

/** 取消排队的最大重试次数 */
const MAX_STOP_MATCH_RETRIES = 3;

/** 取消排队重试间隔 (ms) */
const STOP_MATCH_RETRY_DELAY_MS = 1000;

/**
 * 发条鸟模式排队超时时间 (ms) - 超过此时间未找到对局则取消排队重试
 * @description 发条鸟是单人队列，正常 1 秒内就会找到对局（日志里 startAction 到 AFK_CHECK 约 0.2 秒），
 *              留出网络和日志写入的余量
 */
const CLOCKWORK_MATCH_TIMEOUT_MS = 10000;

/**
 * 上一局结束后等待客户端离开结算过渡画面的最长时间 (ms)
 * @description 结算过渡（EndOfGameInterstitial）一般几秒就结束，超时后照常排队
 */
const POST_GAME_SETTLE_TIMEOUT_MS = 30000;

/**
 * 接受对局后等待连接游戏服务器的最长时间 (ms)
 * @description 接受对局后客户端会先从 Matchmaking 回到 Frontend，约 1 秒后才开始连接游戏服务器，
 *              这段时间回到空闲状态是正常的；超过这个时间还没连上，才视为对局没开成
 */
const MATCH_JOIN_GRACE_MS = 30000;

/** 客户端还在对局 / 结算过渡中的大厅状态，此时不排队 */
const BUSY_LOBBY_STATES: ReadonlySet<string> = new Set([
    TftLobbyState.IN_GAME,
    TftLobbyState.RECONNECT,
    TftLobbyState.END_OF_GAME_INTERSTITIAL,
]);

/** 排队被取消后客户端会回到的大厅状态 */
const IDLE_LOBBY_STATES: ReadonlySet<string> = new Set([
    TftLobbyState.FRONTEND,
    TftLobbyState.SOLO_MODE,
    TftLobbyState.SOCIAL_MODE,
]);

type WaitResult = 'started' | 'timeout' | 'interrupted' | 'cancelled' | 'clientExit';

/**
 * 大厅状态类
 * @description 负责选择队列、开始匹配、接受对局、等待进入游戏
 */
export class LobbyState implements IState {
    /** 状态名称 */
    public readonly name = "LobbyState";

    /**
     * 根据用户设置获取对应的队列 ID
     * @returns TFT 队列 ID（匹配、排位、发条鸟或回归赛季）
     */
    private getQueueId(): Queue {
        const tftMode = settingsStore.get('tftMode');

        switch (tftMode) {
            case TFTMode.RANK:
                logger.info("[LobbyState] 当前模式: 主赛季排位赛");
                return Queue.TFT_RANKED;
            case TFTMode.CLOCKWORK_TRAILS:
                logger.info("[LobbyState] 当前模式: 发条鸟的试炼");
                return Queue.TFT_FATIAO; // 发条鸟队列ID = 1220
            case TFTMode.S4_RUISHOU:
                logger.info("[LobbyState] 当前模式: S4 瑞兽闹新春");
                return Queue.TFT_SET_REVIVAL; // 回归赛季队列ID = 6110
            case TFTMode.NORMAL:
            default:
                logger.info("[LobbyState] 当前模式: 主赛季匹配模式");
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

        // 排队接口不依赖客户端界面，客户端没开也能排上，所以先确认客户端还在
        if (!(await GameConfigHelper.isTftClientRunning())) {
            throw new Error("没有检测到云顶之弈客户端，请先启动云顶之弈");
        }

        await tftLogWatcher.start();

        // 获取用户选择的游戏模式
        const queueId = this.getQueueId();
        const isClockworkMode = settingsStore.get('tftMode') === TFTMode.CLOCKWORK_TRAILS;

        // 上一局刚结束时客户端还在结算过渡画面，等它回到房间或主界面
        await this.waitForClientIdle(signal);

        // 选择队列（带重试机制）
        const partyId = await this.setGameModeWithRetry(queueId, signal);
        if (!partyId) {
            signal.throwIfAborted();
            logger.error("[LobbyState] 选择队列失败，已达到最大重试次数，重新开始");
            await sleep(RETRY_DELAY_MS);
            return this;
        }

        // ── 排队随机间隔：如果用户开启了该功能，在排队前等待随机秒数 ──
        const delayConfig = settingsStore.get('queueRandomDelay');
        if (delayConfig.enabled && delayConfig.maxSeconds > 0) {
            // 在 [minSeconds, maxSeconds] 范围内取一个随机整数
            const min = Math.max(0, Math.floor(delayConfig.minSeconds));
            const max = Math.max(min, Math.floor(delayConfig.maxSeconds));
            const randomSeconds = min + Math.floor(Math.random() * (max - min + 1));
            if (randomSeconds > 0) {
                logger.info(`[LobbyState] 排队随机间隔：等待 ${randomSeconds} 秒后开始排队...`);
                await sleep(randomSeconds * 1000);
                // 等待期间可能被取消，检查一下
                signal.throwIfAborted();
            }
        }

        // ── 计算排队超时时间 ──
        // 发条鸟模式：固定超时
        // 普通模式：读取用户配置的超时分钟数（0 = 不超时）
        let timeoutMs = 0;
        if (isClockworkMode) {
            timeoutMs = CLOCKWORK_MATCH_TIMEOUT_MS;
        } else {
            const timeoutConfig = settingsStore.get('queueTimeout');
            if (timeoutConfig.enabled && timeoutConfig.minutes > 0) {
                timeoutMs = timeoutConfig.minutes * 60 * 1000;
                logger.info(`[LobbyState] 排队超时已开启：${timeoutConfig.minutes} 分钟后将自动退出重排`);
            }
        }

        // 先挂上日志监听再开始排队，避免漏掉很快就到来的 AFK_CHECK（发条鸟约 0.2 秒）
        const waitHandle = this.waitForGameToStart(signal, timeoutMs);

        // 开始排队（带重试机制）
        const matchStarted = await this.startMatchWithRetry(partyId, signal);
        if (!matchStarted) {
            waitHandle.cancel();
            signal.throwIfAborted();
            logger.error("[LobbyState] 开始匹配失败，已达到最大重试次数，重新开始");
            await sleep(RETRY_DELAY_MS);
            return this;
        }
        waitHandle.armTimeout();

        // 等待游戏开始
        const waitResult = await waitHandle.promise;

        switch (waitResult) {
            case 'started':
                logger.info("[LobbyState] 对局已开始！流转到 GameLoadingState");
                return new GameLoadingState();
            case 'timeout': {
                // 排队超时，取消排队后回到 StartState 重新开始
                logger.warn("[LobbyState] 排队超时，取消排队重新开始...");
                const stopped = await this.stopMatchWithRetry(partyId);
                if (!stopped) {
                    logger.error("[LobbyState] 取消排队失败，流程结束");
                    return new EndState();
                }
                return new StartState();
            }
            case 'clientExit':
                // 客户端退出或重启了，回到 StartState 重新检查窗口
                logger.warn("[LobbyState] 云顶之弈客户端已退出，重新开始");
                return new StartState();
            case 'cancelled':
                // 排队被取消（比如在客户端里点了取消，或有人没接受对局），重新排队
                logger.warn("[LobbyState] 排队已被取消，将重新排队...");
                await sleep(RETRY_DELAY_MS);
                return this;
            case 'interrupted':
            default:
                // 用户主动停止挂机：取消排队，免得挂机停了还在排、找到对局没人接受
                await this.stopMatchWithRetry(partyId, 1);
                return new EndState();
        }
    }

    /**
     * 等待客户端离开对局 / 结算过渡画面
     * @param signal AbortSignal 用于取消等待
     * @description 最多等 POST_GAME_SETTLE_TIMEOUT_MS，超时后照常继续
     */
    private async waitForClientIdle(signal: AbortSignal): Promise<void> {
        const deadline = Date.now() + POST_GAME_SETTLE_TIMEOUT_MS;
        let logged = false;

        while (tftLogWatcher.lobbyState && BUSY_LOBBY_STATES.has(tftLogWatcher.lobbyState)) {
            if (Date.now() >= deadline) {
                logger.warn(`[LobbyState] 客户端仍处于 ${tftLogWatcher.lobbyState} 状态，不再等待，直接开始排队`);
                return;
            }
            if (!logged) {
                logger.info(`[LobbyState] 客户端处于 ${tftLogWatcher.lobbyState} 状态，等待回到大厅...`);
                logged = true;
            }
            await sleep(ABORT_CHECK_INTERVAL_MS);
            signal.throwIfAborted();
        }
    }

    /**
     * 选择队列（带重试机制）
     * @param queueId 队列 ID
     * @param signal AbortSignal 用于取消操作
     * @returns 云顶小队 ID，重试都失败时返回 null
     */
    private async setGameModeWithRetry(queueId: Queue, signal: AbortSignal): Promise<string | null> {
        for (let attempt = 1; attempt <= MAX_SET_GAME_MODE_RETRIES; attempt++) {
            if (signal.aborted) {
                logger.info("[LobbyState] 收到取消信号，停止选择队列");
                return null;
            }

            try {
                logger.info(`[LobbyState] 正在选择队列 ${queueId}... (第 ${attempt} 次尝试)`);
                const { partyId } = await tftSgpApi.getTftParty();
                await tftSgpApi.setGameMode(partyId, queueId);
                logger.info("[LobbyState] 选择队列成功！");
                return partyId;
            } catch (e: any) {
                logger.warn(`[LobbyState] 选择队列失败 (第 ${attempt} 次): ${e.message}`);

                if (attempt < MAX_SET_GAME_MODE_RETRIES) {
                    await sleep(SET_GAME_MODE_RETRY_DELAY_MS);
                }
            }
        }

        return null;
    }

    /**
     * 开始匹配（带重试机制）
     * @param partyId 云顶小队 ID
     * @param signal AbortSignal 用于取消操作
     * @returns true 表示成功开始匹配，false 表示重试都失败了
     */
    private async startMatchWithRetry(partyId: string, signal: AbortSignal): Promise<boolean> {
        for (let attempt = 1; attempt <= MAX_START_MATCH_RETRIES; attempt++) {
            if (signal.aborted) {
                logger.info("[LobbyState] 收到取消信号，停止匹配重试");
                return false;
            }

            try {
                logger.info(`[LobbyState] 正在开始排队...`);
                await tftSgpApi.startMatchmaking(partyId);
                logger.info("[LobbyState] 排队成功！");
                return true;
            } catch (e: any) {
                logger.warn(`[LobbyState] 开始匹配失败 (第 ${attempt} 次): ${e.message}`);

                if (attempt < MAX_START_MATCH_RETRIES) {
                    await sleep(START_MATCH_RETRY_DELAY_MS);
                }
            }
        }

        return false;
    }

    /**
     * 取消排队（带重试机制）
     * @param partyId 云顶小队 ID
     * @param maxAttempts 最大尝试次数
     * @returns true 表示已取消（或本来就没在排队）
     * @description 不受 abort 信号影响：用户停止挂机时也要把排队取消掉
     */
    private async stopMatchWithRetry(partyId: string, maxAttempts: number = MAX_STOP_MATCH_RETRIES): Promise<boolean> {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                logger.info(`[LobbyState] 正在取消排队... (第 ${attempt} 次尝试)`);
                await tftSgpApi.stopMatchmaking(partyId);
                logger.info("[LobbyState] 已取消排队");
                return true;
            } catch (e: any) {
                logger.warn(`[LobbyState] 取消排队失败 (第 ${attempt} 次): ${e.message}`);

                if (attempt < maxAttempts) {
                    await sleep(STOP_MATCH_RETRY_DELAY_MS);
                }
            }
        }

        return false;
    }

    /**
     * 等待从"排队"到"开始连接游戏服务器"的完整流程
     * @param signal AbortSignal 用于取消等待
     * @param timeoutMs 排队超时毫秒数，0 表示不超时；找到对局后不再计时
     * @returns promise：等待结果；armTimeout：排队请求成功后开始计时；cancel：放弃等待
     * @description 要在发起排队之前调用，保证不漏掉日志事件
     */
    private waitForGameToStart(signal: AbortSignal, timeoutMs: number): {
        promise: Promise<WaitResult>;
        armTimeout: () => void;
        cancel: () => void;
    } {
        let stopCheckInterval: NodeJS.Timeout | null = null;
        let timeoutTimer: NodeJS.Timeout | null = null;
        /** 接受对局后等待连接游戏服务器的计时器 */
        let joinGraceTimer: NodeJS.Timeout | null = null;
        let isResolved = false;
        /** 是否已经找到过对局（找到后不再计算排队超时） */
        let matchFound = false;
        /** 客户端是否进入过排队状态（用来判断排队是否被取消） */
        let sawMatchmaking = false;
        let resolvePromise: (value: WaitResult) => void = () => {};

        const promise = new Promise<WaitResult>((resolve) => {
            resolvePromise = resolve;
        });

        /** 清理所有监听器和定时器 */
        const cleanup = () => {
            tftLogWatcher.off('partyEvent', onPartyEvent);
            tftLogWatcher.off('lobbyState', onLobbyState);
            tftLogWatcher.off('joiningGameServer', onJoiningGameServer);
            tftLogWatcher.off('clientExit', onClientExit);
            signal.removeEventListener("abort", onAbort);
            if (stopCheckInterval) {
                clearInterval(stopCheckInterval);
                stopCheckInterval = null;
            }
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = null;
            }
            clearJoinGrace();
        };

        const clearJoinGrace = () => {
            if (joinGraceTimer) {
                clearTimeout(joinGraceTimer);
                joinGraceTimer = null;
            }
        };

        /** 安全的 resolve，防止重复调用 */
        const safeResolve = (value: WaitResult) => {
            if (isResolved) return;
            isResolved = true;
            cleanup();
            resolvePromise(value);
        };

        const onAbort = () => {
            logger.info("[LobbyState] 收到取消信号，停止等待");
            safeResolve('interrupted');
        };

        /**
         * 服务端推送的排队事件
         * @description AFK_CHECK 表示找到对局，需要在约 10 秒内接受。
         *              有人没接受时服务端会重新排队，之后可能再来一次 AFK_CHECK，所以每次都接受。
         */
        const onPartyEvent = (name: string) => {
            if (name === 'MATCHMAKING') {
                logger.info("[LobbyState] 正在排队中...");
                return;
            }
            if (name !== 'AFK_CHECK') return;

            matchFound = true;
            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = null;
                logger.info("[LobbyState] 已找到对局，取消排队超时定时器");
            }

            logger.info("[LobbyState] 已找到对局！正在自动接受...");
            tftSgpApi.acceptMatch()
                .then(() => logger.info("[LobbyState] 已接受对局"))
                .catch((e: any) => logger.warn(`[LobbyState] 接受对局失败: ${e.message}`));
        };

        const onJoiningGameServer = () => {
            logger.info("[LobbyState] 客户端开始连接游戏服务器");
            safeResolve('started');
        };

        const onLobbyState = (state: string) => {
            if (state === TftLobbyState.MATCHMAKING) {
                // 有人没接受时服务端会重新排队，客户端回到 Matchmaking
                sawMatchmaking = true;
                clearJoinGrace();
            } else if (state === TftLobbyState.IN_GAME || state === TftLobbyState.RECONNECT) {
                // 正常会先收到 joiningGameServer，这里兜底
                safeResolve('started');
            } else if (sawMatchmaking && IDLE_LOBBY_STATES.has(state)) {
                if (!matchFound) {
                    logger.info(`[LobbyState] 客户端从排队回到了 ${state}`);
                    safeResolve('cancelled');
                } else if (!joinGraceTimer) {
                    // 接受对局后客户端会先回到 Frontend 再连接游戏服务器，等一会儿
                    joinGraceTimer = setTimeout(() => {
                        joinGraceTimer = null;
                        logger.warn(`[LobbyState] 接受对局后 ${MATCH_JOIN_GRACE_MS / 1000} 秒内没有连接游戏服务器`);
                        safeResolve('cancelled');
                    }, MATCH_JOIN_GRACE_MS);
                }
            }
        };

        const onClientExit = () => safeResolve('clientExit');

        signal.addEventListener("abort", onAbort, { once: true });
        tftLogWatcher.on('partyEvent', onPartyEvent);
        tftLogWatcher.on('lobbyState', onLobbyState);
        tftLogWatcher.on('joiningGameServer', onJoiningGameServer);
        tftLogWatcher.on('clientExit', onClientExit);

        // 定期检查 signal 状态 (作为 abort 事件的兜底)
        stopCheckInterval = setInterval(() => {
            if (signal.aborted) {
                safeResolve('interrupted');
            }
        }, ABORT_CHECK_INTERVAL_MS);

        const armTimeout = () => {
            if (isResolved || matchFound || timeoutMs <= 0) return;
            logger.info(`[LobbyState] 排队超时机制：${timeoutMs / 1000}秒内未找到对局将退出重试`);
            timeoutTimer = setTimeout(() => {
                logger.warn("[LobbyState] 排队超时！");
                safeResolve('timeout');
            }, timeoutMs);
        };

        const cancel = () => {
            if (isResolved) return;
            isResolved = true;
            cleanup();
        };

        return { promise, armTimeout, cancel };
    }
}
