/**
 * 启动状态
 * @module StartState
 * @description 海克斯科技启动后的初始化状态
 */

import { IState } from "./IState";
import { logger } from "../utils/Logger.ts";
import { LobbyState } from "./LobbyState.ts";
import { inGameApi, InGameApiEndpoints } from "../lcu/InGameApi.ts";
import { GameLoadingState } from "./GameLoadingState.ts";
import GameConfigHelper from "../utils/GameConfigHelper.ts";

/**
 * 启动状态类
 * @description 负责初始化检查和配置备份，决定进入哪个后续状态
 * 
 * 注意：策略服务的初始化已移至 GameRunningState，
 * 因为需要在游戏实际开始后才能正确读取棋子信息进行阵容匹配
 */
export class StartState implements IState {
    /** 状态名称 */
    public readonly name = "StartState";

    /**
     * 执行启动状态逻辑
     * @param signal AbortSignal 用于取消操作
     * @returns 下一个状态 (LobbyState 或 GameLoadingState)
     * @throws Error 如果 TFT 配置应用失败，抛出错误终止流程
     */
    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted();

        logger.info("[StartState] 正在初始化...");

        // 备份当前游戏配置（必须在应用 TFT 配置之前！）
        await this.backupGameConfig();

        // 应用 TFT 专用配置（分辨率、画质等）- 必须成功才能继续
        await this.applyTFTConfig();

        // 检查是否已经在游戏中
        const isInGame = await this.checkIfInGame();

        if (isInGame) {
            logger.info("[StartState] 检测到已在游戏中，直接进入游戏状态");
            return new GameLoadingState();
        }

        logger.info("[StartState] 初始化完成，进入大厅状态");
        return new LobbyState();
    }

    /**
     * 备份游戏配置（临时备份）
     * @description 使用临时备份目录（TempConfig），与用户手动备份（UserConfig）完全隔离。
     *              每次挂机启动都会覆盖上一次的临时备份，确保恢复的是最新的用户配置。
     */
    private async backupGameConfig(): Promise<void> {
        try {
            logger.info("[StartState] 正在临时备份游戏配置...");
            await GameConfigHelper.tempBackup();
            logger.info("[StartState] 游戏配置临时备份完成");
        } catch (error) {
            logger.warn("[StartState] 游戏配置临时备份失败，继续执行");
            if (error instanceof Error) {
                logger.debug(error.message);
            }
        }
    }

    /**
     * 应用 TFT 专用配置
     * @description 将预设的 TFT 配置（分辨率 1024x768、低画质等）应用到游戏
     *              这样可以确保截图识别的坐标准确，同时降低系统资源占用
     * @throws Error 如果配置应用失败，抛出错误阻止进入游戏
     */
    private async applyTFTConfig(): Promise<void> {
        logger.info("[StartState] 正在应用 TFT 专用配置...");

        // 先停止上一轮可能残留的配置守护监听器
        GameConfigHelper.stopConfigGuard();
        
        const success = await GameConfigHelper.applyTFTConfig();
        
        if (!success) {
            // 配置应用失败，必须终止流程
            // 因为如果分辨率/画质不对，截图识别坐标会出错
            const errorMsg = "TFT 专用配置应用失败！请检查游戏配置文件是否被占用或设为只读。";
            logger.error(`[StartState] ${errorMsg}`);
            throw new Error(errorMsg);
        }
        
        logger.info("[StartState] TFT 专用配置应用成功");
    }

    /**
     * 检查是否已在游戏中
     * @returns true 表示已在游戏中
     */
    private async checkIfInGame(): Promise<boolean> {
        try {
            await inGameApi.get(InGameApiEndpoints.ALL_GAME_DATA);
            return true;
        } catch {
            return false;
        }
    }
}
