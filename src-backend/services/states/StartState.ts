/**
 * 启动状态
 * @module StartState
 * @description 海克斯科技启动后的初始化状态
 */

import { IState } from "./IState";
import { logger } from "../../utils/Logger.ts";
import { LobbyState } from "./LobbyState.ts";
import { inGameApi, InGameApiEndpoints } from "../../lcu/InGameApi.ts";
import { GameLoadingState } from "./GameLoadingState.ts";
import GameConfigHelper from "../../utils/GameConfigHelper.ts";

/**
 * 启动状态类
 * @description 负责初始化检查和配置备份，决定进入哪个后续状态
 */
export class StartState implements IState {
    /** 状态名称 */
    public readonly name = "StartState";

    /**
     * 执行启动状态逻辑
     * @param signal AbortSignal 用于取消操作
     * @returns 下一个状态 (LobbyState 或 GameLoadingState)
     */
    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted();

        logger.info("[StartState] 正在初始化...");

        // 备份当前游戏配置
        await this.backupGameConfig();

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
     * 备份游戏配置
     * @description 在修改游戏设置前先备份，以便结束时恢复
     */
    private async backupGameConfig(): Promise<void> {
        try {
            logger.info("[StartState] 正在备份游戏配置...");
            await GameConfigHelper.backup();
            logger.info("[StartState] 游戏配置备份完成");
        } catch (error) {
            logger.warn("[StartState] 游戏配置备份失败，继续执行");
            if (error instanceof Error) {
                logger.debug(error.message);
            }
        }
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
