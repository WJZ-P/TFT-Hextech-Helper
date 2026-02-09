/**
 * Toast 桥接工具
 * @module ToastBridge
 * @description 用于从主进程/后端代码发送 Toast 通知到渲染进程
 *              通过 IPC 通信实现跨进程 Toast 显示
 */

import { BrowserWindow } from "electron";
import { IpcChannel } from "../../electron/protocol";

/** Toast 类型 */
export type ToastType = 'info' | 'success' | 'warning' | 'error';

/** Toast 位置 */
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

/** Toast 配置选项 */
interface ToastOptions {
    type?: ToastType;
    position?: ToastPosition;
}

/**
 * 发送 Toast 通知到渲染进程
 * @param message Toast 消息内容
 * @param options Toast 配置选项（类型、位置）
 * 
 * @example
 * // 显示信息提示
 * showToast("对局已开始！");
 * 
 * // 显示成功提示
 * showToast("购买成功", { type: "success" });
 * 
 * // 显示警告提示
 * showToast("备战席已满", { type: "warning", position: "top-center" });
 */
export function showToast(message: string, options: ToastOptions = {}): void {
    const { type = 'info', position = 'top-right' } = options;
    
    // 获取所有窗口并发送 Toast 事件
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
        win.webContents.send(IpcChannel.SHOW_TOAST, {
            message,
            type,
            position
        });
    }
}

// 快捷方法
showToast.info = (message: string, options?: Omit<ToastOptions, 'type'>) =>
    showToast(message, { ...options, type: 'info' });

showToast.success = (message: string, options?: Omit<ToastOptions, 'type'>) =>
    showToast(message, { ...options, type: 'success' });

showToast.warning = (message: string, options?: Omit<ToastOptions, 'type'>) =>
    showToast(message, { ...options, type: 'warning' });

showToast.error = (message: string, options?: Omit<ToastOptions, 'type'>) =>
    showToast(message, { ...options, type: 'error' });

/**
 * 通知前端更新"本局结束后停止"状态
 * @param newState 新的状态值
 * 
 * @description 用于从后端状态机通知前端更新 UI 状态
 *              主要在 GameRunningState 中，当"本局结束后停止"功能生效时调用
 */
export function notifyStopAfterGameState(newState: boolean): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
        win.webContents.send(IpcChannel.HEX_STOP_AFTER_GAME_TRIGGERED, newState);
    }
}

/**
 * 通知前端挂机服务运行状态变化
 * @param isRunning 新的运行状态（true=运行中，false=已停止）
 * 
 * @description 用于从后端通知前端更新挂机开关的 UI 状态
 *              主要在"本局结束后停止"功能生效、自动停止挂机时调用
 */
export function notifyHexRunningState(isRunning: boolean): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
        win.webContents.send(IpcChannel.HEX_TOGGLE_TRIGGERED, isRunning);
    }
}

/**
 * 通知前端统计数据已更新
 * @param stats 最新的统计数据快照
 * 
 * @description 在每局游戏完成时调用，通知前端实时刷新统计面板
 */
export function notifyStatsUpdated(stats: {
    sessionGamesPlayed: number;
    totalGamesPlayed: number;
    sessionStartTime: number;
}): void {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
        win.webContents.send(IpcChannel.STATS_UPDATED, stats);
    }
}
