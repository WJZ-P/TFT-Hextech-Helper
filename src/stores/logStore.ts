/**
 * 全局日志存储 - 单例模式
 * 让日志数据持久化，不受组件卸载影响
 */

// 日志自动清理阈值的可选值，0 表示"从不"自动清理
export type LogAutoCleanThreshold = 0 | 100 | 200 | 500 | 1000;

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
    id: number;
    timestamp: string;
    level: LogLevel;
    message: string;
    count: number;  // 重复次数，默认为1
}

// 日志变化监听器类型
type LogListener = (logs: LogEntry[]) => void;

/**
 * 格式化时间戳，只保留 HH:MM:SS，去掉毫秒部分
 */
const formatTimestamp = (timestamp: string): string => {
    // 匹配 HH:MM:SS 部分，忽略后面的 .mmm 毫秒
    const match = timestamp.match(/^(\d{1,2}:\d{2}:\d{2})/);
    return match ? match[1] : timestamp;
};

/**
 * 解析后端日志消息，提取时间戳和正文
 * 后端格式: "[HH:MM:SS.mmm][LEVEL] message"
 */
const parseLogMessage = (message: string): { timestamp: string; content: string } => {
    const regex = /^\[([^\]]+)\]\[[^\]]+\]\s*/;
    const match = message.match(regex);
    
    if (match) {
        return {
            timestamp: formatTimestamp(match[1]),
            content: message.slice(match[0].length)
        };
    }
    
    return {
        // hour12: false 使用24小时制，只显示时:分:秒
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        content: message
    };
};

class LogStore {
    private logs: LogEntry[] = [];
    private listeners: Set<LogListener> = new Set();
    private ipcCleanup: (() => void) | null = null;
    private initialized = false;
    // 缓存的日志清理阈值，避免每次添加日志都调用 IPC
    private cachedThreshold: LogAutoCleanThreshold = 500;

    /**
     * 初始化 IPC 监听（只执行一次）
     */
    init() {
        if (this.initialized) return;
        this.initialized = true;

        // 初始化时从后端获取日志清理阈值
        this.refreshThreshold();

        if (window.ipc?.on) {
            try {
                this.ipcCleanup = window.ipc.on('log-message', (logData: { message: string; level?: LogLevel }) => {
                    if (logData) {
                        this.addLog(logData.message, logData.level || 'info');
                    }
                });
                this.addLog('日志监听器已就绪');
            } catch (error) {
                console.error('设置IPC监听失败', error);
                this.addLog('日志监听器启动失败！', 'error');
            }
        } else {
            console.warn('IPC listener for logs not available.');
            this.addLog('无法连接到后端日志通道', 'warn');
        }
    }

    /**
     * 从后端刷新日志清理阈值
     */
    async refreshThreshold(): Promise<void> {
        try {
            const threshold = await window.lineup?.getLogAutoCleanThreshold();
            if (typeof threshold === 'number') {
                this.cachedThreshold = threshold as LogAutoCleanThreshold;
            }
        } catch (error) {
            console.error('[LogStore] 获取日志清理阈值失败:', error);
        }
    }

    /**
     * 设置日志清理阈值（同时更新缓存和后端）
     */
    async setThreshold(threshold: LogAutoCleanThreshold): Promise<void> {
        this.cachedThreshold = threshold;
        try {
            await window.lineup?.setLogAutoCleanThreshold(threshold);
        } catch (error) {
            console.error('[LogStore] 设置日志清理阈值失败:', error);
        }
    }

    /**
     * 获取当前缓存的阈值
     */
    getThreshold(): LogAutoCleanThreshold {
        return this.cachedThreshold;
    }

    /**
     * 添加一条日志
     * 如果与最后一条日志内容和级别相同，则增加计数而非新增
     */
    addLog(message: string, level: LogLevel = 'info') {
        const parsed = parseLogMessage(message);
        
        // 检查是否与最后一条日志重复（内容和级别都相同）
        const lastLog = this.logs[this.logs.length - 1];
        if (lastLog && lastLog.message === parsed.content && lastLog.level === level) {
            // 重复日志：更新计数和时间戳
            const updatedLog = {
                ...lastLog,
                count: lastLog.count + 1,
                timestamp: parsed.timestamp  // 更新为最新时间
            };
            this.logs = [...this.logs.slice(0, -1), updatedLog];
        } else {
            // 新日志
            const newLog: LogEntry = {
                id: Date.now() + Math.random(),
                timestamp: parsed.timestamp,
                level,
                message: parsed.content,
                count: 1
            };
            this.logs = [...this.logs, newLog];
            
            // 检查是否需要自动清理
            this.autoCleanIfNeeded();
        }
        this.notifyListeners();
    }

    /**
     * 自动清理日志（如果超过阈值）
     * 当日志数量超过设置的阈值时，删除最旧的一半日志
     */
    private autoCleanIfNeeded(): void {
        const threshold = this.cachedThreshold;
        
        // threshold 为 0 表示"从不"清理
        if (threshold === 0) return;
        
        if (this.logs.length > threshold) {
            // 删除最旧的一半日志，保留较新的
            const keepCount = Math.floor(threshold / 2);
            this.logs = this.logs.slice(-keepCount);
            console.log(`[LogStore] 日志数量超过 ${threshold}，已自动清理至 ${keepCount} 条`);
        }
    }

    /**
     * 清空所有日志
     */
    clearLogs() {
        this.logs = [];
        this.notifyListeners();
    }

    /**
     * 获取当前所有日志
     */
    getLogs(): LogEntry[] {
        return this.logs;
    }

    /**
     * 订阅日志变化
     * @returns 取消订阅的函数
     */
    subscribe(listener: LogListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * 通知所有监听器
     */
    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.logs));
    }
}

// 导出单例实例
export const logStore = new LogStore();
