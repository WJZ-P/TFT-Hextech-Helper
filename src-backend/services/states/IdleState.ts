import {IState} from "./IState";
import {StartState} from "./StartState";

/**
 * 一个空闲状态，啥也不做，直接流转到开始状态
 */
export class IdleState implements IState{
    async action(): Promise<StartState>{
        return new StartState()
    }
}