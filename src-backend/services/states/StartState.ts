import {IState} from "./IState";
import LCUManager from "../../lcu/LCUManager";
import {logger} from "../../utils/PanelLogger";
import {EndState} from "./EndState";
import ConfigHelper from "../../utils/ConfigHelper";
import {LobbyState} from "./LobbyState";

/// 服务开始阶段，判断客户端是否开启，备份用户配置，应用云顶挂机配置
export class StartState implements IState {
    async action(): Promise<IState> {
        /// 开始启动服务
        const isGameOpen =LCUManager?.getInstance()?.isConnected
        if(!isGameOpen){
            logger.error('[StartState] 客户端未启动!')
            return new EndState()
        }
        //  备份当前客户端设置
        logger.info('[HexService] 正在备份当前客户端配置...')
        await ConfigHelper.backup()
        logger.info('[HexService] 正在应用云顶之弈配置...')
        await ConfigHelper.applyTFTConfig()
        return new LobbyState()
    }
}