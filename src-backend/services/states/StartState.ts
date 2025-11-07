import {IState} from "./IState";
import LCUManager from "../../lcu/LCUManager";
import {logger} from "../../utils/Logger.ts";
import {EndState} from "./EndState";
import ConfigHelper from "../../utils/ConfigHelper";
import {LobbyState} from "./LobbyState";
import {IdleState} from "./IdleState.ts";

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
        await ConfigHelper.backup()
        logger.info('[HexService] 正在应用云顶之弈配置...')
        await ConfigHelper.applyTFTConfig()
        return new LobbyState()
    }
}