/**
 * 启动状态
 * @module StartState
 * @description 海克斯科技启动后的初始化状态
 */

import { IState } from "./IState";
import { logger } from "../utils/Logger.ts";
import { LobbyState } from "./LobbyState.ts";
import { tftSgpApi } from "../lcu/TftSgpApi.ts";
import { GameLoadingState } from "./GameLoadingState.ts";
import { tftWindowLocator, TFT_TARGET_CLIENT_SIZE } from "../utils/TftWindowLocator.ts";
import { tftLogWatcher, TftLobbyState } from "../utils/TftLogWatcher.ts";

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

        // 开始监听客户端日志（排队、进入对局、对局结束都靠它判断）
        await tftLogWatcher.start();

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
     * @returns true 表示有进行中的对局（包括掉线待重连）
     * @description 虚幻客户端没有 2999 端口，改为问服务端（客户端启动时也是用这个接口决定是否重连）。
     *              接口失败时退回到客户端日志里的大厅状态。
     */
    private async checkIfInGame(): Promise<boolean> {
        try {
            return await tftSgpApi.isInGame();
        } catch (error) {
            const state = tftLogWatcher.lobbyState;
            logger.warn(`[StartState] 查询对局状态失败，改用客户端日志判断（${state ?? '未知'}）: ${error instanceof Error ? error.message : error}`);
            return state === TftLobbyState.IN_GAME || state === TftLobbyState.RECONNECT;
        }
    }
}


// ====================================================================================================
// 历史代码：老客户端的配置准备与对局检测
// 老客户端开始挂机时会临时备份 LOL 的游戏配置，再写入挂机专用的预设（分辨率 1024x768、低画质），
// 结束时由 EndState 还原；是否已在对局中通过 2999 端口（Live Client Data API）能否访问来判断。
// 虚幻客户端运行时改配置文件不会生效，改为直接调整窗口大小（prepareGameWindow）；
// 它也不开 2999 端口，改为向服务端查询是否有进行中的对局（checkIfInGame）。
// 以下代码取自改造前的版本（840efc7），已不再使用，注释保留作参考。
// ====================================================================================================

// // ---- 原 action() 中，检查是否在游戏中之前的两步 ----
//         // 备份当前游戏配置（必须在应用 TFT 配置之前！）
//         await this.backupGameConfig();
//
//         // 应用 TFT 专用配置（分辨率、画质等）- 必须成功才能继续
//         await this.applyTFTConfig();
//
// // ---- 对应的方法 ----
//     /**
//      * 备份游戏配置（临时备份）
//      * @description 使用临时备份目录（TempConfig），与用户手动备份（UserConfig）完全隔离。
//      *              每次挂机启动都会覆盖上一次的临时备份，确保恢复的是最新的用户配置。
//      */
//     private async backupGameConfig(): Promise<void> {
//         try {
//             logger.info("[StartState] 正在临时备份游戏配置...");
//             await GameConfigHelper.tempBackup();
//             logger.info("[StartState] 游戏配置临时备份完成");
//         } catch (error) {
//             logger.warn("[StartState] 游戏配置临时备份失败，继续执行");
//             if (error instanceof Error) {
//                 logger.debug(error.message);
//             }
//         }
//     }
//
//     /**
//      * 应用 TFT 专用配置
//      * @description 将预设的 TFT 配置（分辨率 1024x768、低画质等）应用到游戏
//      *              这样可以确保截图识别的坐标准确，同时降低系统资源占用
//      * @throws Error 如果配置应用失败，抛出错误阻止进入游戏
//      */
//     private async applyTFTConfig(): Promise<void> {
//         logger.info("[StartState] 正在应用 TFT 专用配置...");
//
//         // 先停止上一轮可能残留的配置守护监听器
//         GameConfigHelper.stopConfigGuard();
//
//         const success = await GameConfigHelper.applyTFTConfig();
//
//         if (!success) {
//             // 配置应用失败，必须终止流程
//             // 因为如果分辨率/画质不对，截图识别坐标会出错
//             const errorMsg = "TFT 专用配置应用失败！请检查游戏配置文件是否被占用或设为只读。";
//             logger.error(`[StartState] ${errorMsg}`);
//             throw new Error(errorMsg);
//         }
//
//         logger.info("[StartState] TFT 专用配置应用成功");
//     }
//
//     /**
//      * 检查是否已在游戏中
//      * @returns true 表示已在游戏中
//      */
//     private async checkIfInGame(): Promise<boolean> {
//         try {
//             await inGameApi.get(InGameApiEndpoints.ALL_GAME_DATA);
//             return true;
//         } catch {
//             return false;
//         }
//     }
