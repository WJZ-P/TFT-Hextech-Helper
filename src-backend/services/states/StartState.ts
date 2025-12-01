import {IState} from "./IState";
import LCUManager from "../../lcu/LCUManager";
import {logger} from "../../utils/Logger.ts";
import GameConfigHelper from "../../utils/GameConfigHelper";
import {LobbyState} from "./LobbyState";
import {IdleState} from "./IdleState.ts";
import {inGameApi} from "./GameLoadingState";
import {GameStageState} from "./GameStageState";

/// 服务开始阶段，判断客户端是否开启，备份用户配置，应用云顶挂机配置
export class StartState implements IState {
    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted()

        /// 开始启动服务
        const isClientExist = LCUManager?.getInstance()?.isConnected
        if (isClientExist !== true) {
            logger.error('[StartState] 客户端未启动!')
            return new IdleState()
        }
        //  备份当前客户端设置
        logger.info('[HexService] 正在备份当前客户端配置...')
        await GameConfigHelper.backup()
        logger.info('[HexService] 正在应用云顶之弈配置...')
        await GameConfigHelper.applyTFTConfig()

        //  这里会存在State分叉，如果游戏已经开始，那么就直接进入GameStageState，判断游戏处于哪个状态。
        try{
            //  如果这里成功了，说明游戏已开启。
            await inGameApi.get('/liveclientdata/allgamedata')
            logger.info('[HexService] 检测到游戏已开启，流转到GameStageState')
            return new GameStageState()
        }catch (e){
             return new LobbyState()
        }

    }
}