/**
 * 游戏阶段状态
 * @module GameStageState
 * @description 游戏进行中的主状态，根据当前阶段分发到不同子逻辑
 */

import { IState } from "./IState";
import { tftOperator } from "../TftOperator.ts";
import { sleep } from "../utils/HelperTools.ts";
import { GameStageType } from "../TFTProtocol";
import { logger } from "../utils/Logger";
import { strategyService } from "../services/StrategyService";

/** 阶段检测间隔 (ms)，避免高频 OCR 占用 CPU */
const STAGE_CHECK_INTERVAL_MS = 1000;

/**
 * 游戏阶段状态类
 * @description 判断当前游戏处于哪个阶段 (PVE/PVP/选秀/海克斯)，并分发到对应逻辑
 * 
 * 策略服务初始化时机：
 * - 在 GameStageState 首次执行时初始化策略服务
 * - 这样可以确保游戏已经开始，棋子信息可以被正确读取
 * 
 * 设计原则：
 * - State 保持无状态（stateless），只负责传递信息
 * - 阶段去重等决策逻辑由 StrategyService 处理
 */
export class GameStageState implements IState {
    /** 状态名称 */
    public readonly name = "GameStageState";
    
    /** 是否已初始化策略服务（静态变量，跨实例共享） */
    private static isStrategyInitialized: boolean = false;

    /**
     * 执行游戏阶段状态逻辑
     * @param signal AbortSignal 用于取消操作
     * @returns 下一个状态 (目前保持自身循环)
     */
    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted();

        // 首次进入时初始化策略服务
        if (!GameStageState.isStrategyInitialized) {
            logger.info("[GameStageState] 首次进入游戏阶段，初始化策略服务...");
            const success = strategyService.initialize();
            
            if (!success) {
                logger.error("[GameStageState] 策略服务初始化失败，请先选择阵容");
                // 即使初始化失败，也标记为已尝试，避免重复尝试
            }
            
            GameStageState.isStrategyInitialized = true;
        }

        const stageResult = await tftOperator.getGameStage();

        // 将具体逻辑委托给 StrategyService（阶段去重由 StrategyService 内部处理）
        if (stageResult.type !== GameStageType.UNKNOWN) {
            await strategyService.executeStrategy(stageResult);
        } else {
            // 识别不到，可能是在加载中或被遮挡，保持当前状态重试
            logger.debug("[GameStageState] 未知阶段，稍后重试...");
        }

        // 降低频率，避免高频 OCR 占用 CPU
        await sleep(STAGE_CHECK_INTERVAL_MS);

        // 状态循环
        return this;
    }
    
    /**
     * 重置策略初始化状态
     * @description 在游戏结束时调用，确保下一局游戏可以重新初始化
     */
    public static resetStrategyInitialized(): void {
        GameStageState.isStrategyInitialized = false;
    }
}
