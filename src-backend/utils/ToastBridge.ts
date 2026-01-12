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
