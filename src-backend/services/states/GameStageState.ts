import {IState} from "./IState";
import {tftOperator} from "../../TftOperator.ts";
import {sleep} from "../../utils/HelperTools.ts";
import {GameStageType} from "../../TFTProtocol";
import {logger} from "../../utils/Logger";

/**
 * 判断当前游戏处于哪个阶段，如1-1，1-2，1-3等。
 */
export class GameStageState implements IState{
    async action(signal: AbortSignal): Promise<IState> {
        const currentGameStage = await tftOperator.getGameStage()

        switch (currentGameStage) {
            case GameStageType.PVE:
                // TODO: 返回 new PVEState() -> 摆位，捡球
                logger.info("[GameStageState] 正在打野怪，准备捡球...");
                break;
            case GameStageType.CAROUSEL:
                // TODO: 返回 new CarouselState() -> 抢装备逻辑
                logger.info("[GameStageState] 选秀环节，准备抢装备...");
                break;
            case GameStageType.AUGMENT:
                // TODO: 返回 new AugmentState() -> 选海克斯
                logger.info("[GameStageState] 海克斯选择环节，准备分析...");
                break;
            case GameStageType.PVP:
                // TODO: 返回 new PvPState() -> D牌，升级，调整站位
                logger.info("[GameStageState] 玩家对战环节，准备战斗...");
                break;
            case GameStageType.UNKNOWN:
                // 识别不到，可能是在加载中，或者被遮挡，保持当前状态重试
                // logger.warn("[GameStageState] 未知阶段，等待中...");
                break;
        }

        await sleep(1000); // 降低频率，避免高频 OCR 占用 CPU
        return this; // 暂时保持在这个状态循环，直到写好子状态
    }
}