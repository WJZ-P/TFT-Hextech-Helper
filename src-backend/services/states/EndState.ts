import {IState} from "./IState";
import {IdleState} from "./IdleState.ts";
import {logger} from "../../utils/PanelLogger.ts";
import ConfigHelper from "../../utils/ConfigHelper.ts";

export class EndState implements IState {
    async action(): Promise<IdleState> {
        logger.info('正在恢复客户端设置...')
        await ConfigHelper.restore()
        logger.info('客户端设置恢复完成')
        logger.info('[HexService] 海克斯科技关闭。')
        return new IdleState()
    }
}