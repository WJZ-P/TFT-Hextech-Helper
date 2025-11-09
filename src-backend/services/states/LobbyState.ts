import {IState} from "./IState";
import LCUManager, {LcuEventUri, LCUWebSocketMessage} from "../../lcu/LCUManager.ts";
import {Queue} from "../../lcu/utils/LCUProtocols.ts";
import {sleep} from "../../utils/HelperTools.ts";
import {logger} from "../../utils/Logger.ts";

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
        if (!this.lcuManager) {
            throw Error("[LobbyState] 检测到客户端未启动！")
        }
        await this.lcuManager.createLobbyByQueueId(Queue.TFT_FATIAO) //  先用发条鸟试炼模式测试效果
        await sleep(500)    //  等待一会
        await this.lcuManager.startMatch()   //  开始排队
        await this.waitForMatchFound()  //  等待找到对局

    }

    private async onReadyCheck(event: LCUWebSocketMessage) {
        console.log("已找到对局！")
        console.log('onReadyCheck' + JSON.stringify(event))
        console.log("准备拒绝对局")
        this.lcuManager?.declineMatch()
    }

    private waitForMatchFound(): Promise<boolean> {
        return new Promise((resolve) => {
            //  自动接受对局
            const onReadyCheck = (eventData: LCUWebSocketMessage) => {
                this.signal.throwIfAborted()
                console.log("已找到对局！")
                console.log(JSON.stringify(eventData))
                console.log("准备拒绝对局")
                this.lcuManager?.declineMatch()
            }
            this.lcuManager?.on(LcuEventUri.READY_CHECK,onReadyCheck)   //  监听

            //  在接受对局后，还要检查游戏是否开始，可能有人秒退等情况重新回到了队列。

            const onGameflowPhase = (eventData: LCUWebSocketMessage) => {
                this.signal.throwIfAborted()
                const phase = eventData.data?.phase;
                console.log('onGameflowPhase'+JSON.stringify(eventData))

                if (phase === 'InProgress') {
                    logger.info('[LobbyState] 监听到 GAMEFLOW 变为 InProgress，游戏即将开始');
                    resolve(true);
                }

            };
            this.lcuManager?.on(LcuEventUri.GAMEFLOW_PHASE,onGameflowPhase)
        })
    }
}