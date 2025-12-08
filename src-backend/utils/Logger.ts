/**
 * 日志服务
 * @module Logger
 * @description 统一的日志管理器，支持前后端同步输出
 *
 * 功能特性：
 * - 多级别日志 (debug, info, warn, error)
 * - 时间戳支持
 * - 前端实时推送
 * - 后端控制台输出
 */

import { BrowserWindow } from "electron";

/**
 * 日志级别枚举
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * 日志级别优先级映射
 * @description 数值越大，级别越高
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

/**
 * 日志级别对应的控制台颜色
 */
const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
    debug: "\x1b[36m", // 青色
    info: "\x1b[32m",  // 绿色
    warn: "\x1b[33m",  // 黄色
    error: "\x1b[31m", // 红色
};

/** 颜色重置码 */
const COLOR_RESET = "\x1b[0m";

/**
 * Logger 类
 * @description 单例模式的日志管理器
 */
class Logger {
    private static instance: Logger | null = null;
    private window: BrowserWindow | undefined;

    /** 当前日志级别，低于此级别的日志不会输出 */
    private minLevel: LogLevel = "debug";

    /** 是否启用时间戳 */
    private enableTimestamp: boolean = true;

    /**
     * 获取 Logger 单例
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private constructor() {}

    /**
     * 初始化 Logger
     * @param window Electron BrowserWindow 实例，用于向前端推送日志
     */
    public init(window: BrowserWindow): void {
        this.window = window;
    }

    /**
     * 设置最低日志级别
     * @param level 日志级别
     */
    public setMinLevel(level: LogLevel): void {
        this.minLevel = level;
    }

    /**
     * 设置是否启用时间戳
     * @param enable 是否启用
     */
    public setTimestampEnabled(enable: boolean): void {
        this.enableTimestamp = enable;
    }

    /**
     * 格式化时间戳
     * @returns 格式化的时间字符串 [HH:MM:SS.mmm]
     */
    private getTimestamp(): string {
        if (!this.enableTimestamp) return "";

        const now = new Date();
        const hours = now.getHours().toString().padStart(2, "0");
        const minutes = now.getMinutes().toString().padStart(2, "0");
        const seconds = now.getSeconds().toString().padStart(2, "0");
        const ms = now.getMilliseconds().toString().padStart(3, "0");

        return `[${hours}:${minutes}:${seconds}.${ms}]`;
    }

    /**
     * 检查日志级别是否应该输出
     * @param level 要检查的日志级别
     */
    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
    }

    /**
     * 输出 debug 级别日志
     * @param message 日志消息
     */
    public debug(message: string): void {
        this.log(message, "debug");
    }

    /**
     * 输出 info 级别日志
     * @param message 日志消息
     */
    public info(message: string): void {
        this.log(message, "info");
    }

    /**
     * 输出 warn 级别日志
     * @param message 日志消息
     */
    public warn(message: string): void {
        this.log(message, "warn");
    }

    /**
     * 输出 error 级别日志
     * @param message 日志消息或 Error 对象
     */
    public error(message: string | Error): void {
        const msg = message instanceof Error ? message.message : message;
        this.log(msg, "error");

        // Error 对象额外打印堆栈
        if (message instanceof Error && message.stack) {
            console.error(message.stack);
        }
    }

    /**
     * 核心日志方法
     * @param message 日志消息
     * @param level 日志级别
     */
    private log(message: string, level: LogLevel): void {
        if (!this.shouldLog(level)) return;

        const timestamp = this.getTimestamp();
        const color = LOG_LEVEL_COLORS[level];
        const levelTag = `[${level.toUpperCase()}]`.padEnd(7);

        // 后端控制台输出 (带颜色)
        console.log(`${color}${timestamp}${levelTag}${COLOR_RESET} ${message}`);

        // 前端推送 (不带颜色码)
        this.sendLogToFrontend(`${timestamp}${levelTag} ${message}`, level);
    }

    /**
     * 向前端发送日志
     * @param message 日志消息
     * @param level 日志级别
     */
    private sendLogToFrontend(message: string, level: LogLevel): void {
        if (this.window) {
            this.window.webContents.send("log-message", { message, level });
        }
        // 注意：不再打印 "window未初始化" 的警告，避免日志污染
    }
}

/** 导出 Logger 单例 */
export const logger = Logger.getInstance();
