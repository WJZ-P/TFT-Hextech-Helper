import {IState} from "./IState";
import {tftOperator} from "../../TftOperator.ts";
import {sleep} from "../../utils/HelperTools.ts";

/**
 * 判断当前游戏处于哪个阶段，如1-1，1-2，1-3等。
 */
export class GameStageState implements IState{
    async action(signal: AbortSignal): Promise<IState> {
        await tftOperator.getGameStage()
        await sleep(3000)
        return this
    }
}