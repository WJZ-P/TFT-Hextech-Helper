/**
 * 结束状态
 * @module EndState
 * @description 状态机的终止状态，负责清理和恢复工作
 */

import { IState } from "./IState";
import { IdleState } from "./IdleState.ts";
import { logger } from "../utils/Logger.ts";
import GameConfigHelper from "../utils/GameConfigHelper.ts";
import { strategyService } from "../services/StrategyService.ts";
import { sleep } from "../utils/HelperTools.ts";

/** 恢复前等待时间（毫秒），等待 LOL 完成结算写入 */
const RESTORE_DELAY_MS = 500;

/**
 * 结束状态类
 * @description 当自动下棋流程结束时进入此状态，执行清理工作后回到空闲状态
 */
export class EndState implements IState {
    /** 状态名称 */
    public readonly name = "EndState";

    /**
     * 执行结束状态逻辑
     * @param _signal AbortSignal (此状态不需要，但为保持接口一致性保留)
     * @returns 返回 IdleState，回到空闲状态
     */
    async action(_signal: AbortSignal): Promise<IdleState> {
        // 重置策略服务状态（如果 GameRunningState 没有正常清理的话，这里兜底）
        strategyService.reset();

        logger.info("[EndState] 正在恢复客户端设置...");
        try {
            // 带重试机制的恢复，防止文件被占用
            const success = await GameConfigHelper.restore(3, 1500);
            if (success) {
                logger.info("[EndState] 客户端设置恢复完成");
            } else {
                logger.warn("[EndState] 设置恢复返回失败，可能需要手动恢复");
            }
        } catch (error) {
            logger.error("[EndState] 恢复设置异常，可能需要手动恢复");
            if (error instanceof Error) {
                logger.error(error);
            }
        }

        logger.info("[EndState] 海克斯科技已关闭，回到空闲状态");
        return new IdleState();
    }
}
