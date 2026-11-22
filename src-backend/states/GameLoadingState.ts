/**
 * 游戏加载状态
 * @module GameLoadingState
 * @description 等待游戏加载完成的状态
 *
 * 老客户端靠 2999 端口（Live Client Data API）能否访问来判断加载完成，虚幻客户端没有这个端口，
 * 改为看客户端日志：先进入 LobbyState[InGame]（连上游戏服务器），再出现 presentation_ready（场景加载完、可以操作）。
 */

import { IState } from "./IState";
import { logger } from "../utils/Logger.ts";
import { EndState } from "./EndState.ts";
import { GameRunningState } from "./GameRunningState.ts";
import { LobbyState } from "./LobbyState.ts";
import { StartState } from "./StartState.ts";
import { tftOperator, GAME_WIDTH, GAME_HEIGHT } from "../TftOperator.ts";
import { tftLogWatcher, TftLobbyState } from "../utils/TftLogWatcher.ts";

/** abort 信号轮询间隔 (ms)，作为事件监听的兜底 */
const ABORT_CHECK_INTERVAL_MS = 500;

/** 加载期间允许出现的大厅状态，变成其他状态说明对局没进成 */
const LOADING_LOBBY_STATES: ReadonlySet<string> = new Set([
    TftLobbyState.MATCHMAKING,
    TftLobbyState.RECONNECT,
    TftLobbyState.IN_GAME,
]);

type LoadResult = 'loaded' | 'interrupted' | 'failed' | 'clientExit';

/**
 * 游戏加载状态类
 * @description 开局后等待游戏加载完成
 */
export class GameLoadingState implements IState {
    /** 状态名称 */
    public readonly name = "GameLoadingState";

    /**
     * 执行游戏加载状态逻辑
     * @param signal AbortSignal 用于取消等待
     * @returns 下一个状态 (GameRunningState 或 EndState)
     */
    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted();
        logger.info("[GameLoadingState] 等待进入对局...");

        await tftLogWatcher.start();
        const loadResult = await this.waitForGameToLoad(signal);

        if (loadResult === 'loaded') {
            logger.info("[GameLoadingState] 对局已开始！");
            
            // ============================================================
            // 游戏加载完成后，初始化 TftOperator（查找游戏窗口位置）
            // 此时游戏窗口 "League of Legends (TM) Client" 已经创建且分辨率固定
            // ============================================================
            const initResult = await tftOperator.init();
            
            if (!initResult.success) {
                // 初始化失败（可能游戏窗口未找到），记录警告但继续运行
                logger.error("[GameLoadingState] TftOperator 初始化失败!");
            } else if (initResult.windowInfo) {
                // 检查窗口分辨率是否符合要求
                const { width, height } = initResult.windowInfo;
                if (width !== GAME_WIDTH || height !== GAME_HEIGHT) {
                    logger.error(
                        `[GameLoadingState] ❌ 游戏分辨率不正确！` +
                        `当前: ${width}x${height}, 需要: ${GAME_WIDTH}x${GAME_HEIGHT}。` +
                        `请在游戏设置中将分辨率修改为 ${GAME_WIDTH}x${GAME_HEIGHT}！`
                    );
                }
            }
            
            return new GameRunningState();
        } else if (loadResult === 'failed') {
            logger.warn("[GameLoadingState] 对局没有进成，重新排队");
            return new LobbyState();
        } else if (loadResult === 'clientExit') {
            logger.warn("[GameLoadingState] 云顶之弈客户端已退出，重新开始");
            return new StartState();
        } else {
            logger.info("[GameLoadingState] 加载被中断");
            return new EndState();
        }
    }

    /**
     * 等待游戏加载完成
     * @param signal AbortSignal 用于取消等待
     * @returns loaded 加载完成；failed 对局没进成；clientExit 客户端退出；interrupted 被取消
     */
    private waitForGameToLoad(signal: AbortSignal): Promise<LoadResult> {
        // 已经加载完了（比如开始挂机时就在对局里）
        if (tftLogWatcher.isGameLoaded) {
            return Promise.resolve('loaded');
        }

        return new Promise((resolve) => {
            let stopCheckInterval: NodeJS.Timeout | null = null;
            let isResolved = false;

            /** 清理所有监听器和定时器 */
            const cleanup = () => {
                tftLogWatcher.off('gameLoaded', onGameLoaded);
                tftLogWatcher.off('lobbyState', onLobbyState);
                tftLogWatcher.off('clientExit', onClientExit);
                signal.removeEventListener("abort", onAbort);
                if (stopCheckInterval) {
                    clearInterval(stopCheckInterval);
                    stopCheckInterval = null;
                }
            };

            /** 安全的 resolve，防止重复调用 */
            const safeResolve = (value: LoadResult) => {
                if (isResolved) return;
                isResolved = true;
                cleanup();
                resolve(value);
            };

            const onAbort = () => {
                logger.info("[GameLoadingState] 收到取消信号，停止等待");
                safeResolve('interrupted');
            };

            const onGameLoaded = () => safeResolve('loaded');

            const onLobbyState = (state: string) => {
                if (state === TftLobbyState.IN_GAME) {
                    logger.info("[GameLoadingState] 已连上游戏服务器，等待场景加载完成...");
                } else if (!LOADING_LOBBY_STATES.has(state)) {
                    logger.warn(`[GameLoadingState] 加载过程中客户端回到了 ${state}`);
                    safeResolve('failed');
                }
            };

            const onClientExit = () => safeResolve('clientExit');

            signal.addEventListener("abort", onAbort, { once: true });
            tftLogWatcher.on('gameLoaded', onGameLoaded);
            tftLogWatcher.on('lobbyState', onLobbyState);
            tftLogWatcher.on('clientExit', onClientExit);

            // 定期检查 signal 状态 (作为 abort 事件的兜底)
            stopCheckInterval = setInterval(() => {
                if (signal.aborted) {
                    safeResolve('interrupted');
                }
            }, ABORT_CHECK_INTERVAL_MS);
        });
    }
}
