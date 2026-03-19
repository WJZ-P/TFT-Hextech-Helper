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
 * - 文件记录（按天分割）
 * - 日志去重（防止短时间内重复日志刷屏）
 */

import { BrowserWindow } from "electron";
import fs from "fs-extra";
import path from "path";
import os from "os";

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

    /** 是否启用文件日志 */
    private enableFileLogging: boolean = true;

    /** 日志文件路径 */
    private logFilePath: string = "";

    /** 当前日志文件日期（用于判断是否需要切换文件） */
    private currentLogDate: string = "";

    /** 最近的日志缓存（用于去重），格式：{message: timestamp} */
    private recentLogs: Map<string, number> = new Map();

    /** 日志去重时间窗口（毫秒），相同日志在此时间内只输出一次 */
    private readonly DEDUP_WINDOW_MS = 2000;

    /**
     * 获取 Logger 单例
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private constructor() {
        this.initFileLogging();
    }

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
     * 初始化文件日志
     */
    private initFileLogging(): void {
        try {
            // 使用跨平台的用户数据目录
            // Windows: C:\Users\Username\AppData\Roaming\tft-hextech-helper\logs
            // macOS: ~/Library/Application Support/tft-hextech-helper/logs
            // Linux: ~/.config/tft-hextech-helper/logs
            const userDataDir = path.join(os.homedir(), process.platform === 'win32' ? 'AppData/Roaming' : '.config', 'tft-hextech-helper');
            const logsDir = path.join(userDataDir, 'logs');
            
            fs.ensureDirSync(logsDir);
            this.updateLogFilePath(logsDir);
            
            console.log(`[Logger] 日志文件路径: ${this.logFilePath}`);
            
            // 清理7天前的日志文件
            this.cleanOldLogs(logsDir, 7);
        } catch (error) {
            console.error('[Logger] 初始化文件日志失败:', error);
            this.enableFileLogging = false;
        }
    }

    /**
     * 更新日志文件路径（按日期切分）
     */
    private updateLogFilePath(logsDir: string): void {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        if (today !== this.currentLogDate) {
            this.currentLogDate = today;
            this.logFilePath = path.join(logsDir, `tft-${today}.log`);
        }
    }

    /**
     * 清理旧日志文件
     * @param logsDir 日志目录
     * @param daysToKeep 保留天数
     */
    private cleanOldLogs(logsDir: string, daysToKeep: number): void {
        try {
            const files = fs.readdirSync(logsDir);
            const now = Date.now();
            const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

            files.forEach(file => {
                const filePath = path.join(logsDir, file);
                const stat = fs.statSync(filePath);
                if (now - stat.mtime.getTime() > maxAge) {
                    fs.removeSync(filePath);
                    console.log(`[Logger] 清理旧日志: ${file}`);
                }
            });
        } catch (error) {
            console.error('[Logger] 清理旧日志失败:', error);
        }
    }

    /**
     * 检查是否为重复日志
     * @param message 日志消息
     * @param level 日志级别
     * @returns true 表示是重复日志，应该跳过
     */
    private isDuplicateLog(message: string, level: LogLevel): boolean {
        // error 级别的日志永远不去重
        if (level === 'error') {
            return false;
        }

        const key = `${level}:${message}`;
        const lastTime = this.recentLogs.get(key);
        const now = Date.now();

        if (lastTime && now - lastTime < this.DEDUP_WINDOW_MS) {
            return true; // 重复日志
        }

        // 更新时间戳
        this.recentLogs.set(key, now);

        // 清理过期的缓存（避免内存泄漏）
        if (this.recentLogs.size > 100) {
            const expiredKeys: string[] = [];
            this.recentLogs.forEach((time, k) => {
                if (now - time > this.DEDUP_WINDOW_MS) {
                    expiredKeys.push(k);
                }
            });
            expiredKeys.forEach(k => this.recentLogs.delete(k));
        }

        return false;
    }

    /**
     * 写入日志到文件
     * @param message 日志消息
     */
    private writeToFile(message: string): void {
        if (!this.enableFileLogging || !this.logFilePath) {
            return;
        }

        try {
            // 检查是否需要切换日志文件（跨天）
            const logsDir = path.dirname(this.logFilePath);
            this.updateLogFilePath(logsDir);

            // 异步追加，避免阻塞
            fs.appendFile(this.logFilePath, message + '\n', (err) => {
                if (err && this.enableFileLogging) {
                    // 只在首次失败时输出错误，避免循环报错
                    console.error('[Logger] 写入日志文件失败:', err);
                    this.enableFileLogging = false;
                }
            });
        } catch (error) {
            // 静默失败，不影响主流程
        }
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
     * @param verboseOnly 是否仅在详细模式（debug 级别）下显示，默认 false
     *                    设为 true 时，只有当 minLevel 为 debug 时才会输出
     *                    用于那些"技术上是警告，但频繁出现会刷屏"的日志
     */
    public warn(message: string, verboseOnly: boolean = false): void {
        // 如果设置了 verboseOnly，只有在 debug 模式下才输出
        if (verboseOnly && this.minLevel !== "debug") {
            return;
        }
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

        // 去重检查（error级别除外）
        if (this.isDuplicateLog(message, level)) {
            return;
        }

        const timestamp = this.getTimestamp();
        const color = LOG_LEVEL_COLORS[level];
        const levelTag = `[${level.toUpperCase()}]`.padEnd(7);
        const fullMessage = `${timestamp}${levelTag} ${message}`;

        // 后端控制台输出 (带颜色)
        console.log(`${color}${fullMessage}${COLOR_RESET}`);

        // 写入文件（不带颜色码）
        this.writeToFile(fullMessage);

        // 前端推送 (不带颜色码)
        this.sendLogToFrontend(fullMessage, level);
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
