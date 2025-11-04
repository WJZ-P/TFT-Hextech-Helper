import {IState} from "./IState";
import {StartState} from "./StartState.ts";

/**
 * 表示当前已经启动了客户端，要选择下棋模式，进入队伍中排队开启游戏。
 */
export class LobbyState implements IState {
    async action(): StartState {
        //  创建游戏房间，选择下棋模式
    }
}