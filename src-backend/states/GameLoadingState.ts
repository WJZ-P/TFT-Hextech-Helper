/**
 * 游戏加载状态
 * @module GameLoadingState
 * @description 等待游戏加载完成的状态
 */

import { IState } from "./IState";
import { logger } from "../utils/Logger.ts";
import { EndState } from "./EndState.ts";
import { GameRunningState } from "./GameRunningState.ts";
import { inGameApi, InGameApiEndpoints } from "../lcu/InGameApi.ts";
import { tftOperator, GAME_WIDTH, GAME_HEIGHT } from "../TftOperator.ts";

/** 轮询间隔 (ms) */
const POLL_INTERVAL_MS = 500;

/**
 * 游戏加载状态类
 * @description 开局后等待游戏加载完成，轮询检测游戏是否已启动
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

        const isGameLoaded = await this.waitForGameToLoad(signal);

        if (isGameLoaded) {
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
        } else {
            logger.info("[GameLoadingState] 加载被中断");
            return new EndState();
        }
    }

    /**
     * 等待游戏加载完成
     * @param signal AbortSignal 用于取消轮询
     * @returns true 表示游戏已加载，false 表示被取消
     */
    private waitForGameToLoad(signal: AbortSignal): Promise<boolean> {
        return new Promise((resolve) => {
            let intervalId: NodeJS.Timeout | null = null;

            /**
             * 清理函数：确保定时器被正确清除
             */
            const cleanup = () => {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            };

            /**
             * 处理 abort 事件
             */
            const onAbort = () => {
                logger.info("[GameLoadingState] 收到取消信号，停止轮询");
                cleanup();
                resolve(false);
            };

            // 监听 abort 事件，确保信号触发时能清理定时器
            signal.addEventListener("abort", onAbort, { once: true });

            /**
             * 轮询检测游戏是否启动
             */
            const checkIfGameStart = async () => {
                // 双重检查：如果已经 abort，直接返回
                if (signal.aborted) {
                    cleanup();
                    return;
                }

                try {
                    await inGameApi.get(InGameApiEndpoints.ALL_GAME_DATA);
                    // 请求成功，游戏已加载
                    signal.removeEventListener("abort", onAbort);
                    cleanup();
                    resolve(true);
                } catch {
                    // 请求失败，游戏仍在加载中
                    logger.debug("[GameLoadingState] 游戏仍在加载中...");
                }
            };

            // 启动轮询
            intervalId = setInterval(checkIfGameStart, POLL_INTERVAL_MS);

            // 立即执行一次检测，不用等第一个间隔
            checkIfGameStart();
        });
    }
}
