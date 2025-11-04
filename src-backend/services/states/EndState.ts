import {IState} from "./IState";
import {StartState} from "./StartState";
import {IdleState} from "./IdleState.ts";

export class EndState implements IState{
    async action(): Promise<IdleState> {
        return new IdleState()
    }
}