import {IState} from "./IState";
import LCUManager, {LcuEventUri, LCUWebSocketMessage} from "../../lcu/LCUManager.ts";
import {Queue} from "../../lcu/utils/LCUProtocols.ts";
import {sleep} from "../../utils/HelperTools.ts";

/**
 * 表示当前已经启动了客户端，要选择下棋模式，进入队伍中排队开启游戏。
 */
export class LobbyState implements IState {
    private lcuManager = LCUManager.getInstance()
    private checkFunc = null;

    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted()
        //  创建游戏房间，选择下棋模式
        if (!this.lcuManager) {
            throw Error("[LobbyState] 检测到客户端未启动！")
        }
        await this.lcuManager.createLobbyByQueueId(Queue.TFT_FATIAO) //  先用发条鸟试炼模式测试效果
        await sleep(500)    //  等待一会
        //  注册事件，自动接收对局
        this.checkFunc = this.lcuManager.on(LcuEventUri.READY_CHECK, (event) =>{this.onReadyCheck(event)})

        await this.lcuManager.startMatch()   //  开始排队
    }

    private onReadyCheck(event:LCUWebSocketMessage){
        //  只要check到了一次，就可以取消监听了
        this.lcuManager?.off(LcuEventUri.READY_CHECK,this.checkFunc)
        console.log("已找到对局！")
        console.log(JSON.stringify(event))
        console.log("准备拒绝对局")
        this.lcuManager?.declineMatch()
    }
}