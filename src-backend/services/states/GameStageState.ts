/**
 * 游戏阶段状态
 * @module GameStageState
 * @description 游戏进行中的主状态，根据当前阶段分发到不同子逻辑
 */

import { IState } from "./IState";
import { tftOperator } from "../../TftOperator.ts";
import { sleep } from "../../utils/HelperTools.ts";
import { GameStageType } from "../../TFTProtocol";
import { logger } from "../../utils/Logger";

/** 阶段检测间隔 (ms)，避免高频 OCR 占用 CPU */
const STAGE_CHECK_INTERVAL_MS = 1000;

/**
 * 游戏阶段状态类
 * @description 判断当前游戏处于哪个阶段 (PVE/PVP/选秀/海克斯)，并分发到对应逻辑
 */
export class GameStageState implements IState {
    /** 状态名称 */
    public readonly name = "GameStageState";

    /**
     * 执行游戏阶段状态逻辑
     * @param signal AbortSignal 用于取消操作
     * @returns 下一个状态 (目前保持自身循环)
     */
    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted();

        const currentGameStage = await tftOperator.getGameStage();

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
                // 识别不到，可能是在加载中或被遮挡，保持当前状态重试
                logger.debug("[GameStageState] 未知阶段，等待中...");
                break;
        }

        // 降低频率，避免高频 OCR 占用 CPU
        await sleep(STAGE_CHECK_INTERVAL_MS);

        // 暂时保持在这个状态循环，直到实现子状态
        return this;
    }
}
