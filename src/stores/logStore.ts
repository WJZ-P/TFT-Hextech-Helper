/**
 * 全局日志存储 - 单例模式
 * 让日志数据持久化，不受组件卸载影响
 */

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

    /**
     * 初始化 IPC 监听（只执行一次）
     */
    init() {
        if (this.initialized) return;
        this.initialized = true;

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
        }
        this.notifyListeners();
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
