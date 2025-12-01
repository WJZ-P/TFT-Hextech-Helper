import {IState} from "./IState";
import {IdleState} from "./IdleState.ts";
import {logger} from "../../utils/Logger.ts";
import GameConfigHelper from "../../utils/GameConfigHelper.ts";

export class EndState implements IState {
    async action(): Promise<IdleState> {
        logger.info('正在恢复客户端设置...')
        await GameConfigHelper.restore()
        logger.info('客户端设置恢复完成')
        logger.info('[HexService] 海克斯科技关闭。')
        return new IdleState()
    }
}