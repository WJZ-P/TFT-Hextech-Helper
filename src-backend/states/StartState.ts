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
import { tftWindowLocator, TFT_TARGET_CLIENT_SIZE } from "../utils/TftWindowLocator.ts";

/**
 * 启动状态类
 * @description 负责初始化检查和游戏窗口准备，决定进入哪个后续状态
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
     * @throws Error 如果游戏窗口无法调整到挂机尺寸，抛出错误终止流程
     */
    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted();

        logger.info("[StartState] 正在初始化...");

        // 把游戏画面调整为挂机用的固定尺寸 - 必须成功才能继续
        await this.prepareGameWindow();

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
     * 把游戏画面调整为挂机用的固定尺寸
     * @description 虚幻客户端运行时改配置文件不会生效，所以直接调整窗口大小（游戏会按新尺寸重新排版），
     *              原来的窗口大小由 TftWindowLocator 记住，挂机结束时在 EndState 里还原。
     *              识别坐标和模板都基于固定尺寸，调整失败时必须终止流程。
     * @throws Error 找不到窗口、全屏模式或调整失败时抛出错误
     */
    private async prepareGameWindow(): Promise<void> {
        const { width, height } = TFT_TARGET_CLIENT_SIZE;
        logger.info(`[StartState] 正在把游戏画面调整为 ${width}x${height}...`);
        try {
            await tftWindowLocator.applyTargetClientSize();
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            logger.error(`[StartState] 游戏窗口调整失败：${reason}`);
            throw new Error(`游戏窗口调整失败：${reason}`);
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
