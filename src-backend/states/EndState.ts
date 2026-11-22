/**
 * 结束状态
 * @module EndState
 * @description 状态机的终止状态，负责清理和恢复工作
 */

import { IState } from "./IState";
import { IdleState } from "./IdleState.ts";
import { logger } from "../utils/Logger.ts";
import { tftWindowLocator } from "../utils/TftWindowLocator.ts";
import { strategyService } from "../services/StrategyService.ts";
import { tftLogWatcher } from "../utils/TftLogWatcher.ts";

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

        // 停止监听客户端日志
        tftLogWatcher.stop();

        // 把游戏窗口还原成挂机开始前的大小（StartState 调整过才会有记录）
        await tftWindowLocator.restoreWindowSize();

        logger.info("[EndState] 海克斯科技已关闭，回到空闲状态");
        return new IdleState();
    }
}
