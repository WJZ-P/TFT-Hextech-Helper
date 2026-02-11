/**
 * 浮窗桥接工具
 * @module OverlayBridge
 * @description 用于从后端状态机代码控制游戏浮窗的显示/关闭/数据更新
 *              通过直接操作 BrowserWindow 实现跨模块控制
 * 
 * 架构说明：
 *   后端代码（如 GameRunningState）无法直接 import main.ts 中的函数（避免循环依赖），
 *   因此采用与 ToastBridge 相同的模式，通过 BrowserWindow 的 webContents 发送 IPC 消息。
 *   但浮窗的创建/关闭需要 main.ts 端来管理，所以这里用 ipcMain.emit 触发主进程事件。
 * 
 * 实际实现：
 *   创建和关闭浮窗通过 main.ts 注册的 IPC handler (OVERLAY_SHOW / OVERLAY_CLOSE) 实现
 *   这里使用一个注册回调的模式，让 main.ts 注册 createOverlay / closeOverlay 的实际实现
 */

import { BrowserWindow } from "electron";
import { IpcChannel } from "../../electron/protocol";
import { logger } from "./Logger";

/** 浮窗操作回调接口 */
interface OverlayCallbacks {
    /** 创建浮窗 */
    create: (gameWindowInfo: { left: number; top: number; width: number; height: number }) => void;
    /** 关闭浮窗 */
    close: () => void;
    /** 获取浮窗窗口实例（用于发送数据） */
    getWindow: () => BrowserWindow | null;
}

/** 已注册的浮窗回调（由 main.ts 注册） */
let callbacks: OverlayCallbacks | null = null;

/**
 * 注册浮窗操作回调
 * @description 由 main.ts 在启动时调用，注入浮窗的创建/关闭/获取函数
 *              这样后端代码就可以通过 overlayBridge 来控制浮窗
 * @param cbs 回调函数集合
 */
export function registerOverlayCallbacks(cbs: OverlayCallbacks): void {
    callbacks = cbs;
    logger.debug('[OverlayBridge] 浮窗回调已注册');
}

/**
 * 打开游戏浮窗
 * @param gameWindowInfo 游戏窗口的位置和尺寸（物理像素）
 */
export function showOverlay(gameWindowInfo: { left: number; top: number; width: number; height: number }): void {
    if (!callbacks) {
        logger.warn('[OverlayBridge] 浮窗回调未注册，无法打开浮窗');
        return;
    }
    callbacks.create(gameWindowInfo);
}

/**
 * 关闭游戏浮窗
 */
export function closeOverlay(): void {
    if (!callbacks) {
        logger.warn('[OverlayBridge] 浮窗回调未注册，无法关闭浮窗');
        return;
    }
    callbacks.close();
}

/**
 * 向浮窗发送玩家数据
 * @param players 玩家信息数组
 * @description 会等待浮窗的 webContents 完成加载（did-finish-load）后再发送数据，
 *              避免浮窗 React 还没挂载就收到 IPC 消息导致数据丢失。
 *              如果 webContents 已经加载完成则立即发送。
 */
export function sendOverlayPlayers(players: { name: string; isBot: boolean }[]): void {
    const win = callbacks?.getWindow();
    if (!win || win.isDestroyed()) return;

    /**
     * 实际发送数据的内部函数
     * webContents.send() 会通过 IPC 通道把数据推送到渲染进程
     */
    const doSend = () => {
        // 再次检查窗口是否还在（异步等待期间窗口可能已关闭）
        if (win.isDestroyed()) return;
        win.webContents.send(IpcChannel.OVERLAY_UPDATE_PLAYERS, players);
        logger.debug(`[OverlayBridge] 已发送 ${players.length} 个玩家数据到浮窗`);
    };

    // 检查 webContents 是否已经加载完成
    // isLoading() 返回 true 表示页面还在加载中（HTML/JS 还没执行完）
    if (!win.webContents.isLoading()) {
        // 已加载完成，直接发送
        doSend();
    } else {
        // 还在加载中，等 did-finish-load 事件再发
        // did-finish-load：页面的 JS 全部执行完毕（包括 React 挂载）
        logger.debug('[OverlayBridge] 浮窗尚未加载完成，等待 did-finish-load...');
        win.webContents.once('did-finish-load', () => {
            doSend();
        });
    }
}
