import {IState} from "./IState";
import LCUManager, {LcuEventUri, LCUWebSocketMessage} from "../../lcu/LCUManager.ts";
import {Queue} from "../../lcu/utils/LCUProtocols.ts";
import {sleep} from "../../utils/HelperTools.ts";
import {logger} from "../../utils/Logger.ts";
import {GameLoadingState} from "./GameLoadingState.ts";
import {hexService} from "../HexService.ts";
import {EndState} from "./EndState.ts";

/**
 * 表示当前已经启动了客户端，要选择下棋模式，进入队伍中排队开启游戏。
 */
export class LobbyState implements IState {
    private lcuManager = LCUManager.getInstance()
    private signal: AbortSignal

    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted()
        this.signal = signal
        //  创建游戏房间，选择下棋模式
        if (!this.lcuManager) throw Error("[LobbyState] 检测到客户端未启动！")

        logger.info('[LobbyState] 正在创建房间...');
        await this.lcuManager.createLobbyByQueueId(Queue.TFT_FATIAO) //  先用发条鸟试炼模式测试效果
        await sleep(500)    //  等待一会
        logger.info('[LobbyState] 正在开始排队...')
        await this.lcuManager.startMatch()   //  开始排队
        const isGameStarted = await this.waitForGameToStart();

        if (isGameStarted) {
            // (关键) 整个流程完成！流转到“游戏中”状态
            logger.info('[LobbyState] 游戏已开始！流转到 InGameRunningState');
            return new GameLoadingState();
        } else {
            // 如果返回 false，说明是被用户停止了，或者流程意外中断（如秒退）
            // 检查总开关，决定是“停止”还是“重新排队”
            if (!hexService.isRunning) {
                return new EndState(); // 用户按了停止
            } else {
                logger.warn('[LobbyState] 流程中断 (如秒退)，将重新排队...');
                await sleep(1000); // 防止因 LCU 状态延迟导致死循环
                return this; // 返回 this，Looper 会在下次循环重新执行整个 action
            }
        }

    }

    /**
     * 辅助函数：等待从“排队”到“游戏开始”的完整流程
     * @returns Promise<boolean> - true 表示游戏成功开始, false 表示流程中断(被停止或被秒退)
     */
    private waitForGameToStart(): Promise<boolean> {
        return new Promise((resolve) => {
            const cleanup = () => {
                this.lcuManager?.off(LcuEventUri.READY_CHECK, onReadyCheck);
                this.lcuManager?.off(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);
                clearInterval(stopCheckInterval);
            };

            // --- 监听器 1：处理“找到对局” ---
            const onReadyCheck = (eventData: LCUWebSocketMessage) => {
                if (eventData.data?.state === 'InProgress') {
                    logger.info('[LobbyState] 已找到对局！正在自动接受...');
                        this.lcuManager?.acceptMatch().catch((reason)=>{console.log(reason)})
                }
            };

            // --- 监听器 2：处理“游戏阶段变化” (真正的状态决策者) ---
            const onGameflowPhase = (eventData: LCUWebSocketMessage) => {
                const phase = eventData.data?.phase;
                console.log('onGameflowPhase'+JSON.stringify(eventData,null,4))
                logger.info(`[LobbyState] 监听到游戏阶段: ${phase}`);

                if (phase === 'InProgress') {
                    logger.info('[LobbyState] 监听到 GAMEFLOW 变为 InProgress');
                    cleanup();
                    resolve(true); // 成功！游戏已开始！
                }
            };

            // --- 监听器 3：处理“用户停止” ---
            const onCheckStopSignal = () => {
                if (!hexService.isRunning) {
                    logger.info('[LobbyState] 检测到用户停止运行');
                    cleanup();
                    resolve(false); // 流程失败(被用户停止)
                }
            };

            // --- 注册所有监听器 ---
            this.lcuManager?.on(LcuEventUri.READY_CHECK, onReadyCheck);
            this.lcuManager?.on(LcuEventUri.GAMEFLOW_PHASE, onGameflowPhase);
            const stopCheckInterval = setInterval(onCheckStopSignal, 500);

        });
    }
}