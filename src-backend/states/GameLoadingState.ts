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
import { GameClient, settingsStore } from "../utils/SettingsStore.ts";
import { windowHelper, type WindowInfo } from "../utils/WindowHelper.ts";
import { GameStageType } from "../TFTProtocol.ts";

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
                const gameClient = settingsStore.get('gameClient');
                // PC 客户端强制要求 1024x768；安卓端允许任意窗口尺寸（由缩放适配）
                const { width, height } = initResult.windowInfo;
                if (gameClient !== GameClient.ANDROID && (width !== GAME_WIDTH || height !== GAME_HEIGHT)) {
                    logger.error(
                        `[GameLoadingState] ❌ 游戏分辨率不正确！` +
                        `当前: ${width}x${height}, 需要: ${GAME_WIDTH}x${GAME_HEIGHT}。` +
                        `请在游戏设置中将分辨率修改为 ${GAME_WIDTH}x${GAME_HEIGHT}！`
                    );
                } else if (gameClient === GameClient.ANDROID) {
                    logger.info(
                        `[GameLoadingState] 安卓端窗口尺寸: ${width}x${height}，已启用动态缩放坐标适配`
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
            let preferredAndroidWindow: WindowInfo | null = null;
            let checking = false;
            let androidValidStageStreak = 0;
            let lastValidWindowKey = "";

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
                if (checking) {
                    return;
                }
                checking = true;

                try {
                    const gameClient = settingsStore.get('gameClient');
                    if (gameClient === GameClient.ANDROID) {
                        const candidates = await windowHelper.findLOLWindows(GameClient.ANDROID);
                        if (candidates.length > 0) {
                            const orderedCandidates = [...candidates];
                            if (preferredAndroidWindow) {
                                orderedCandidates.sort((a, b) => {
                                    const score = (candidate: WindowInfo): number => {
                                        const sameTitle = candidate.title === preferredAndroidWindow!.title ? 1 : 0;
                                        const delta =
                                            Math.abs(candidate.left - preferredAndroidWindow!.left) +
                                            Math.abs(candidate.top - preferredAndroidWindow!.top) +
                                            Math.abs(candidate.width - preferredAndroidWindow!.width) +
                                            Math.abs(candidate.height - preferredAndroidWindow!.height);
                                        return sameTitle * 10000 - delta;
                                    };
                                    return score(b) - score(a);
                                });
                            }

                            // 安卓模式下，模拟器窗口常驻，不能只靠窗口存在判定进局。
                            // 这里对前几个候选窗口逐个尝试阶段识别，避免命中 bluestacks-services 等错误窗口。
                            const topCandidates = orderedCandidates.slice(0, 3);
                            for (const candidate of topCandidates) {
                                const initResult = await tftOperator.init(candidate);
                                if (!initResult.success) {
                                    logger.debug(`[GameLoadingState] 安卓候选窗口初始化失败: ${candidate.title}`);
                                    continue;
                                }

                                preferredAndroidWindow = candidate;

                                const stageResult = await tftOperator.getGameStage();
                                if (stageResult.type === GameStageType.UNKNOWN || !stageResult.stageText) {
                                    logger.debug(
                                        `[GameLoadingState] 安卓候选窗口未识别到有效阶段: ${candidate.title} ` +
                                        `(${candidate.width}x${candidate.height})`
                                    );
                                    continue;
                                }

                                logger.info(
                                    `[GameLoadingState] 安卓端检测到有效阶段: ${stageResult.stageText} ` +
                                    `(窗口: ${candidate.title})`
                                );
                                const windowKey = `${candidate.title}|${candidate.left}|${candidate.top}|${candidate.width}|${candidate.height}`;
                                if (windowKey === lastValidWindowKey) {
                                    androidValidStageStreak += 1;
                                } else {
                                    androidValidStageStreak = 1;
                                    lastValidWindowKey = windowKey;
                                }

                                if (androidValidStageStreak >= 2) {
                                    logger.info(
                                        `[GameLoadingState] 安卓端阶段确认通过（连续 ${androidValidStageStreak} 次有效识别）`
                                    );
                                    signal.removeEventListener("abort", onAbort);
                                    cleanup();
                                    resolve(true);
                                    return;
                                }

                                logger.debug(
                                    `[GameLoadingState] 安卓端阶段确认中: ${androidValidStageStreak}/2 ` +
                                    `(窗口: ${candidate.title}, 阶段: ${stageResult.stageText})`
                                );
                                return;
                            }

                            androidValidStageStreak = 0;
                            lastValidWindowKey = "";
                            logger.debug("[GameLoadingState] 安卓端候选窗口均未识别到有效阶段，继续等待...");
                        }
                    } else {
                        await inGameApi.get(InGameApiEndpoints.ALL_GAME_DATA);
                        signal.removeEventListener("abort", onAbort);
                        cleanup();
                        resolve(true);
                        return;
                    }
                    logger.debug("[GameLoadingState] 游戏仍在加载中...");
                } catch {
                    logger.debug("[GameLoadingState] 游戏仍在加载中...");
                } finally {
                    checking = false;
                }
            };

            // 启动轮询
            intervalId = setInterval(checkIfGameStart, POLL_INTERVAL_MS);

            // 立即执行一次检测，不用等第一个间隔
            checkIfGameStart();
        });
    }

    /**
     * 检测是否存在真实的“已进入对局”信号
     * @description 避免安卓模式仅凭模拟器窗口存在就误判为已进游戏。
     *              使用 InGame API 的 allGameData 作为实际在局指标。
     */
    private async hasInGameSignal(): Promise<boolean> {
        try {
            const response = await inGameApi.get(InGameApiEndpoints.ALL_GAME_DATA);
            const gameData = response?.data;

            const hasPlayers = Array.isArray(gameData?.allPlayers) && gameData.allPlayers.length > 0;
            const hasActivePlayer = Boolean(gameData?.activePlayer);

            return hasPlayers && hasActivePlayer;
        } catch {
            return false;
        }
    }
}
