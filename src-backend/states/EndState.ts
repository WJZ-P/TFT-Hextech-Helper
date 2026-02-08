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
        
        // 带重试机制的恢复，防止文件被占用
        const success = await GameConfigHelper.restore(3, 1500);
        
        if (success) {
            logger.info("[EndState] 客户端设置恢复完成");
            // 启动长期配置守护：持续监听游戏配置目录
            // 防止 LOL 客户端在游戏结束时又把配置改回下棋设置
            // 守护会一直运行直到下次开始挂机或软件退出
            GameConfigHelper.startConfigGuard();
        } else {
            // 恢复失败，打印醒目的警告和操作指引
            logger.error("═══════════════════════════════════════════════════════════");
            logger.error("[EndState] ⚠️ 客户端设置恢复失败！");
            logger.error("[EndState] 您的游戏可能仍在使用 TFT 挂机专用设置（低分辨率/低画质）");
            logger.error("[EndState] 请手动恢复：打开本软件「设置」页面 → 点击「恢复游戏设置」按钮");
            logger.error("═══════════════════════════════════════════════════════════");
        }

        logger.info("[EndState] 海克斯科技已关闭，回到空闲状态");
        return new IdleState();
    }
}
