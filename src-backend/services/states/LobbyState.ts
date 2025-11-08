import {IState} from "./IState";
import LCUManager from "../../lcu/LCUManager.ts";
import {Queue} from "../../lcu/utils/LCUProtocols.ts";
import {sleep} from "../../utils/HelperTools.ts";
import {logger} from "../../utils/Logger.ts";

/**
 * 表示当前已经启动了客户端，要选择下棋模式，进入队伍中排队开启游戏。
 */
export class LobbyState implements IState {
    async action(signal:AbortSignal): Promise<IState> {
        signal.throwIfAborted()
        //  创建游戏房间，选择下棋模式
        const lcuManager = LCUManager.getInstance()
        if(!lcuManager) {
            throw Error("[LobbyState] 检测到客户端未启动！")
        }
        await lcuManager.createLobbyByQueueId(Queue.TFT_FATIAO) //  先用发条鸟试炼模式测试效果
        await sleep(500)    //  等待一会
        await lcuManager.startMatch()   //  开始排队
        const matchState = await lcuManager.checkMatchState()
        logger.info(`[${LobbyState.constructor.name}] -> 当前排队状态：`)
    }
}