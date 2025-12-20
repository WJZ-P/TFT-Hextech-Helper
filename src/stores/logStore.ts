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
}

// 日志变化监听器类型
type LogListener = (logs: LogEntry[]) => void;

/**
 * 解析后端日志消息，提取时间戳和正文
 * 后端格式: "[HH:MM:SS][LEVEL] message"
 */
const parseLogMessage = (message: string): { timestamp: string; content: string } => {
    const regex = /^\[([^\]]+)\]\[[^\]]+\]\s*/;
    const match = message.match(regex);
    
    if (match) {
        return {
            timestamp: match[1],
            content: message.slice(match[0].length)
        };
    }
    
    return {
        timestamp: new Date().toLocaleTimeString(),
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
     */
    addLog(message: string, level: LogLevel = 'info') {
        const parsed = parseLogMessage(message);
        const newLog: LogEntry = {
            id: Date.now() + Math.random(),
            timestamp: parsed.timestamp,
            level,
            message: parsed.content
        };
        this.logs = [...this.logs, newLog];
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
