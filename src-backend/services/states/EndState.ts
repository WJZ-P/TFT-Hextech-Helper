import {IState} from "./IState";
import {StartState} from "./StartState";
import {IdleState} from "./IdleState.ts";
import {logger} from "../../utils/PanelLogger.ts";

export class EndState implements IState{
    async action(): Promise<IdleState> {
        logger.info('123')

        return new IdleState()
    }
}