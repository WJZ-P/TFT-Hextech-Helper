import {IState} from "./IState";

export class EndState implements IState{
    async action(){
        return this
    }
}