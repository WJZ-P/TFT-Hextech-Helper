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
import { gameStageMonitor, GameStageEvent } from "../services/GameStageMonitor";
import { strategyService } from "../services/StrategyService";
import { gameStateManager } from "../services/GameStateManager";
import { logger } from "../utils/Logger";
import { sleep } from "../utils/HelperTools";
import { inGameApi, InGameApiEndpoints } from "../lcu/InGameApi";
import { showToast, notifyStopAfterGameState, notifyHexRunningState } from "../utils/ToastBridge";
import { hexService } from "../services/HexService";
import { settingsStore } from "../utils/SettingsStore";
import { TFTMode, isStandardChessMode, getSeasonTemplateDir } from "../TFTProtocol";
import { templateLoader } from "../tft";
import { ocrService } from "../tft/recognition/OcrService";
import { tftOperator } from "../TftOperator";
import { showOverlay, closeOverlay, sendOverlayPlayers } from "../utils/OverlayBridge";
import { windowHelper } from "../utils/WindowHelper";

/** abort 信号轮询间隔 (ms)，作为事件监听的兜底 */
const ABORT_CHECK_INTERVAL_MS = 2000;

/** 发条鸟模式：阶段变化超时时间 (ms)，超过此时间未收到阶段事件则视为卡住 */
const CLOCKWORK_STAGE_TIMEOUT_MS = 60000;  // 1 分钟

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

        // 1.5 检测对局中的人机玩家并发送 Toast 通知 + 打开浮窗
        await this.detectAndNotifyBots();

        // 2. 获取当前游戏模式并初始化策略服务
        const currentMode = settingsStore.get('tftMode') as TFTMode || TFTMode.NORMAL;
        logger.info(`[GameRunningState] 当前游戏模式: ${currentMode}`);

        // 2.5 根据当前模式切换英雄模板赛季（加载对应赛季的棋子名称模板）
        const seasonDir = getSeasonTemplateDir(currentMode);
        await templateLoader.switchSeason(seasonDir);
        logger.debug(`[GameRunningState] 英雄模板已切换到赛季: ${seasonDir}`);

        // 2.6 切换 OCR 棋子识别 Worker 的字符白名单到当前赛季
        // 只包含当前赛季的棋子汉字，减少搜索空间，提升识别准确率
        await ocrService.switchChessWorker(currentMode);

        
        const initSuccess = strategyService.initialize(currentMode);
        if (!initSuccess) {
            // 发条鸟模式不需要阵容，标准下棋模式需要
            if (isStandardChessMode(currentMode)) {
                logger.error("[GameRunningState] 策略服务初始化失败，请先选择阵容");
            }
            // 即使初始化失败，也继续运行（避免卡死）
        }

        // 3. 订阅策略服务到 Monitor 事件
        strategyService.subscribe();

        // 4. 启动 GameStageMonitor
        gameStageMonitor.start(1000);
        logger.info("[GameRunningState] GameStageMonitor 已启动");

        // 5. 等待游戏结束（发条鸟模式有超时机制）
        const waitResult = await this.waitForGameToEnd(signal, currentMode === TFTMode.CLOCKWORK_TRAILS);

        // 6. 清理资源
        this.cleanup();


        // 7. 返回下一个状态
        if (signal.aborted) {
            // 用户手动停止
            logger.info("[GameRunningState] 用户手动停止，流转到 EndState");
            return new EndState();
        } else if (waitResult === 'ended') {
            // 游戏正常结束，记录统计数据
            hexService.recordGameCompleted();

            // 检查是否设置了"本局结束后停止"
            if (hexService.stopAfterCurrentGame) {
                logger.info("[GameRunningState] 游戏结束，检测到【本局结束后停止】标志，停止挂机");
                showToast.success("本局已结束，自动停止挂机", { position: 'top-center' });
                // 通知前端重置"本局结束后停止"状态（因为是一次性功能，生效后自动取消）
                notifyStopAfterGameState(false);
                
                // 通知前端挂机已停止（更新开关按钮状态）
                notifyHexRunningState(false);
                
                // 调用 hexService.stop() 来正确停止服务
                // 这会触发 AbortSignal，主循环会进入 finally 块执行 EndState 清理
                await hexService.stop();
                
                return new EndState();
            }
            // 否则返回大厅开始下一局
            logger.info("[GameRunningState] 游戏结束，流转到 LobbyState 开始下一局");
            return new LobbyState();
        } else if (waitResult === 'clockwork_timeout') {
            // 发条鸟模式：阶段变化超时，游戏可能卡住/无响应
            // 直接杀掉游戏进程，然后回到 LobbyState 重新开始排队
            logger.warn("[GameRunningState] 发条鸟模式阶段超时，强制杀掉游戏进程并重新排队");
            showToast.warning("发条鸟模式：游戏无响应，正在强制退出...", { position: 'top-center' });

            // 步骤 1：杀掉游戏进程（taskkill）
            try {
                await this.lcuManager?.killGameProcess();
                logger.info("[GameRunningState] 超时：游戏进程已被杀掉");
            } catch (error) {
                logger.warn(`[GameRunningState] 超时：杀掉游戏进程失败: ${error}`);
            }

            // 步骤 2：调用 LCU API 退出游戏作为兜底
            try {
                await this.lcuManager?.quitGame();
                logger.info("[GameRunningState] 超时：LCU 退出游戏请求已发送");
            } catch (error) {
                logger.warn(`[GameRunningState] 超时：LCU 退出游戏请求失败: ${error}`);
            }

            // 等待客户端回到大厅
            await sleep(3000);

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
     * @param isClockworkMode 是否为发条鸟模式（启用阶段超时机制 + isDead 轮询）
     * @returns 'ended' 表示游戏正常结束，'interrupted' 表示被中断，'clockwork_timeout' 表示发条鸟模式超时
     * 
     * @description 游戏结束的完整链路：
     * 
     * 【普通下棋模式】
     * 1. 玩家死亡 → 触发 TFT_BATTLE_PASS 事件（此时游戏窗口还开着）
     * 2. 收到 TFT_BATTLE_PASS 后 → 杀进程 + LCU API 关闭游戏窗口
     * 3. 游戏窗口关闭后 → 触发 GAMEFLOW_PHASE = "WaitingForStats"
     * 4. 收到 WaitingForStats → 流转到 LobbyState
     * 
     * 【发条鸟模式】
     * 1. GameStageMonitor 每秒轮询 InGame API，检测 isDead 字段
     * 2. isDead=true → Monitor 发出 'clockworkDead' 事件
     * 3. 本方法监听事件 → 调用 tftOperator.clickClockworkQuitButton() 点击退出按钮
     * 4. 游戏窗口关闭后 → 触发 GAMEFLOW_PHASE = "WaitingForStats"
     * 5. 收到 WaitingForStats → 流转到 LobbyState
     * 
     * 发条鸟额外机制：
     * - 监听 stageChange 事件，每次收到事件重置超时计时器
     * - 如果超过 1 分钟没有收到 stageChange 事件，视为游戏卡住，返回 'clockwork_timeout'
     */
    private waitForGameToEnd(signal: AbortSignal, isClockworkMode: boolean = false): Promise<'ended' | 'interrupted' | 'clockwork_timeout'> {
        return new Promise((resolve) => {
            let stopCheckInterval: NodeJS.Timeout | null = null;
            let stageTimeoutTimer: NodeJS.Timeout | null = null;
            let isResolved = false;
            /** 标记是否已经尝试过退出游戏，避免重复调用 */
            let hasTriedQuit = false;

            /**
             * 安全的 resolve，防止重复调用
             */
            const safeResolve = (value: 'ended' | 'interrupted' | 'clockwork_timeout') => {
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
                // 发条鸟模式：取消 stageChange 和 clockworkDead 监听
                if (isClockworkMode) {
                    gameStageMonitor.off('stageChange', onStageChange);
                    gameStageMonitor.off('clockworkDead', onClockworkDead);
                }
                signal.removeEventListener("abort", onAbort);
                if (stopCheckInterval) {
                    clearInterval(stopCheckInterval);
                    stopCheckInterval = null;
                }
                if (stageTimeoutTimer) {
                    clearTimeout(stageTimeoutTimer);
                    stageTimeoutTimer = null;
                }
            };

            /**
             * 重置发条鸟模式的阶段超时计时器
             * @description 每次收到 stageChange 事件时调用，重新开始 1 分钟倒计时
             */
            const resetStageTimeout = () => {
                if (stageTimeoutTimer) {
                    clearTimeout(stageTimeoutTimer);
                }
                stageTimeoutTimer = setTimeout(() => {
                    logger.warn(`[GameRunningState] 发条鸟模式：${CLOCKWORK_STAGE_TIMEOUT_MS / 1000}秒内未收到阶段变化事件，判定为游戏卡住`);
                    safeResolve('clockwork_timeout');
                }, CLOCKWORK_STAGE_TIMEOUT_MS);
            };

            /**
             * 处理 abort 事件
             */
            const onAbort = () => {
                logger.info("[GameRunningState] 收到取消信号，停止等待");
                safeResolve('interrupted');
            };

            /**
             * 发条鸟模式：监听 stageChange 事件，用于重置超时计时器
             */
            const onStageChange = (_event: GameStageEvent) => {
                logger.debug("[GameRunningState] 发条鸟模式：收到 stageChange 事件，重置超时计时器");
                resetStageTimeout();
            };

            /**
             * 发条鸟模式：监听 clockworkDead 事件
             * @description GameStageMonitor 通过 InGame API 检测到 isDead=true 后发出此事件。
             *              每次收到事件都调用点击退出按钮，因为刚死亡时退出按钮可能还没出现，
             *              需要反复点击直到游戏真正退出。
             */
            const onClockworkDead = async () => {
                if (isResolved) return;
                hasTriedQuit = true;

                logger.info("[GameRunningState] 发条鸟模式：收到 clockworkDead 事件，点击退出按钮");
                
                // 标记游戏已结束，阻止 StrategyService 响应后续阶段事件
                strategyService.setGameEnded();

                // 点击发条鸟退出按钮（固定坐标）
                await tftOperator.clickClockworkQuitButton();
            };

            /**
             * 监听 TFT_BATTLE_PASS 事件（玩家死亡/对局结束）
             * @description 普通下棋模式专用退出流程：
             *              1. 标记游戏结束，阻止 StrategyService 响应后续阶段事件
             *              2. 等待 3s 让玩家看到结算画面
             *              3. 直接杀掉游戏进程
             *              4. 调用 LCU API quitGame() 作为兜底
             *              
             *              发条鸟模式不走这条路，发条鸟靠 clockworkDead 事件 + 点击退出按钮
             */
            const onBattlePass = async (_eventData: LCUWebSocketMessage) => {
                if (hasTriedQuit) return; // 避免重复调用
                hasTriedQuit = true;

                logger.info("[GameRunningState] 收到 TFT_BATTLE_PASS 事件，玩家已死亡/对局结束");
                
                // 标记游戏已结束，阻止 StrategyService 响应后续阶段事件
                strategyService.setGameEnded();

                // 等待 3s 让玩家看到结算画面
                const EXIT_DELAY_MS = 3000;
                await sleep(EXIT_DELAY_MS);
                
                logger.info("[GameRunningState] 正在尝试关闭游戏窗口...");

                // 步骤 1：直接杀掉游戏进程
                try {
                    await this.lcuManager?.killGameProcess();
                    logger.info("[GameRunningState] 游戏进程已被杀掉");
                } catch (error) {
                    logger.warn(`[GameRunningState] 杀掉游戏进程失败: ${error}`);
                }

                // 步骤 2：调用 LCU API 作为兜底
                try {
                    await this.lcuManager?.quitGame();
                    logger.info("[GameRunningState] 退出游戏请求已发送");
                } catch (error) {
                    logger.warn(`[GameRunningState] 退出游戏请求失败: ${error}`);
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
                    safeResolve('ended');
                }
            };

            // 监听 abort 事件
            signal.addEventListener("abort", onAbort, { once: true });

            // 注册 LCU 事件监听器
            this.lcuManager?.on(LcuEventUri.TFT_BATTLE_PASS, onBattlePass);
            this.lcuManager?.on(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);

            // 发条鸟模式：监听 stageChange + clockworkDead 事件，启动超时计时器 + isDead 轮询
            if (isClockworkMode) {
                logger.info(`[GameRunningState] 发条鸟模式：启动阶段超时监控 (${CLOCKWORK_STAGE_TIMEOUT_MS / 1000}秒)`);
                gameStageMonitor.on('stageChange', onStageChange);
                gameStageMonitor.on('clockworkDead', onClockworkDead);
                resetStageTimeout();  // 立即启动第一个超时计时器

                // 启动 isDead 轮询（由 GameStageMonitor 管理）
                gameStageMonitor.startClockworkDeadPoll();
            }

            // 定期检查 signal 状态 (作为 abort 事件的兜底)
            stopCheckInterval = setInterval(() => {
                if (signal.aborted) {
                    safeResolve('interrupted');
                }
            }, ABORT_CHECK_INTERVAL_MS);
        });
    }

    /**
     * 检测对局中的人机玩家并发送 Toast 通知
     * @description 通过 InGame API 获取所有玩家信息，筛选出 isBot=true 的玩家
     *              并发送 Toast 通知告知用户本局有多少人机
     */
    private async detectAndNotifyBots(): Promise<void> {
        try {
            // 获取所有游戏数据
            const response = await inGameApi.get(InGameApiEndpoints.ALL_GAME_DATA);
            const gameData = response.data;

            // 从 allPlayers 数组中筛选出人机玩家
            const allPlayers = gameData?.allPlayers || [];
            const botPlayers = allPlayers.filter((player: any) => player.isBot === true);

            // 获取人机玩家的名字列表（使用 riotIdGameName，不带 tag）
            const botNames = botPlayers.map((player: any) => player.riotIdGameName || player.summonerName);

            // 发送 Toast 通知
            if (botNames.length > 0) {
                const message = `对局已开始！本局有 ${botNames.length} 个人机：${botNames.join('、')}`;
                showToast.info(message, { position: 'top-center' });
                logger.info(`[GameRunningState] ${message}`);
            } else {
                showToast.info("对局已开始！本局全是真人玩家", { position: 'top-center' });
                logger.info("[GameRunningState] 对局已开始，本局全是真人玩家");
            }
            
            // ============================================================
            // 打开游戏浮窗并发送玩家数据（需要先检查用户是否开启了浮窗功能）
            // ============================================================
            
            // 从持久化设置中读取浮窗开关状态
            const overlayEnabled = settingsStore.get('showOverlay');
            if (!overlayEnabled) {
                logger.debug('[GameRunningState] 用户已关闭游戏浮窗，跳过浮窗显示');
            } else {
                // 获取游戏窗口信息（由 TftOperator.init() 在 GameLoadingState 中已初始化）
                const windowInfo = await windowHelper.findLOLWindow();
            
                if (windowInfo) {
                    // 打开浮窗（传入游戏窗口的物理像素坐标）
                    showOverlay({
                        left: windowInfo.left,
                        top: windowInfo.top,
                        width: windowInfo.width,
                        height: windowInfo.height,
                    });
                    
                    // 发送玩家数据到浮窗
                    // sendOverlayPlayers 内部会等待浮窗 webContents 加载完成后再发送，无需硬编码延迟
                    const playerData = allPlayers.map((player: any) => ({
                        name: player.riotIdGameName || player.summonerName || '未知玩家',
                        isBot: player.isBot === true,
                    }));
                    sendOverlayPlayers(playerData);
                    logger.debug(`[GameRunningState] 已请求发送 ${playerData.length} 个玩家数据到浮窗`);
                } else {
                    logger.warn('[GameRunningState] 未找到游戏窗口，跳过浮窗显示');
                }
            }
        } catch (error: any) {
            logger.warn(`[GameRunningState] 检测人机玩家失败: ${error.message}`);
            // 即使检测失败也发送对局开始通知
            showToast.info("对局已开始！", { position: 'top-center' });
        }
    }

    /**
     * 清理资源
     * @description 游戏结束时调用，停止 Monitor 并重置相关服务
     */
    private cleanup(): void {
        // 0. 关闭游戏浮窗
        closeOverlay();
        logger.debug("[GameRunningState] 游戏浮窗已关闭");
        
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
