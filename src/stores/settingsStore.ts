/**
 * 全局设置存储 - 单例模式
 * 作为前端与后端 SettingsStore 通信的唯一入口
 * 
 * 使用方式：
 * 1. settingsStore.subscribe(callback) - 订阅变化
 * 2. settingsStore.setShowDebugPage(value) - 修改值并通知订阅者
 * 
 * 注意：其他组件不应该直接调用 window.settings，应该通过本 store 访问
 */

// 设置变化监听器类型
type SettingsListener = (settings: SettingsState) => void;

/** 统计数据接口（与后端 HexService.getStatistics() 返回结构一致） */
export interface GameStatistics {
    /** 本次会话已挂机局数 */
    sessionGamesPlayed: number;
    /** 历史累计挂机局数 */
    totalGamesPlayed: number;
    /** 本次会话已运行总时长（秒），后端计算好的，前端直接显示 */
    sessionElapsedSeconds: number;
}

// 设置状态接口（前端关心的设置项）
interface SettingsState {
    showDebugPage: boolean;
    /** 统计数据（运行时 + 持久化的聚合） */
    statistics: GameStatistics;
}

/** 默认的统计数据 */
const DEFAULT_STATISTICS: GameStatistics = {
    sessionGamesPlayed: 0,
    totalGamesPlayed: 0,
    sessionElapsedSeconds: 0,
};

class SettingsStore {
    // 内部状态（从后端同步的缓存）
    private state: SettingsState = {
        showDebugPage: false,
        statistics: { ...DEFAULT_STATISTICS },
    };
    
    // 订阅者列表
    private listeners: Set<SettingsListener> = new Set();
    
    // 是否已初始化
    private initialized = false;

    // 统计数据更新事件的清理函数
    private cleanupStatsListener: (() => void) | null = null;

    /**
     * 初始化：从后端加载设置（只执行一次）
     */
    async init(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        try {
            // 通过通用 settings API 读取后端设置
            const showDebugPage = await window.settings.get<boolean>('showDebugPage');
            this.state.showDebugPage = showDebugPage;

            // 读取统计数据
            const stats = await window.stats.getStatistics();
            this.state.statistics = stats;

            this.notifyListeners();
        } catch (error) {
            console.error('[SettingsStore] 初始化失败:', error);
        }

        // 监听后端推送的统计数据更新事件
        this.cleanupStatsListener = window.stats.onStatsUpdated((stats: GameStatistics) => {
            console.log('[SettingsStore] 收到统计数据更新:', stats);
            this.state.statistics = stats;
            this.notifyListeners();
        });
    }

    /**
     * 获取当前设置状态（返回副本，防止外部直接修改）
     */
    getState(): SettingsState {
        return { ...this.state };
    }

    /**
     * 获取 showDebugPage 的值
     */
    getShowDebugPage(): boolean {
        return this.state.showDebugPage;
    }

    /**
     * 获取统计数据（返回副本）
     */
    getStatistics(): GameStatistics {
        return { ...this.state.statistics };
    }

    /**
     * 设置 showDebugPage 并通知所有订阅者
     * @param value 新的值
     * @param persist 是否同步到后端（默认 true）
     */
    async setShowDebugPage(value: boolean, persist = true): Promise<void> {
        this.state.showDebugPage = value;
        
        // 同步到后端 SettingsStore
        if (persist) {
            try {
                await window.settings.set('showDebugPage', value);
            } catch (error) {
                console.error('[SettingsStore] 保存设置失败:', error);
            }
        }
        
        // 通知所有订阅者
        this.notifyListeners();
    }

    /**
     * 手动刷新统计数据（从后端重新读取）
     * @description 用于前端需要主动获取最新统计时调用（如挂机开始/停止时）
     */
    async refreshStatistics(): Promise<void> {
        try {
            const stats = await window.stats.getStatistics();
            this.state.statistics = stats;
            this.notifyListeners();
        } catch (error) {
            console.error('[SettingsStore] 刷新统计数据失败:', error);
        }
    }

    /**
     * 订阅设置变化
     * @param listener 回调函数，当设置变化时调用
     * @returns 取消订阅的函数
     */
    subscribe(listener: SettingsListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * 通知所有监听器
     */
    private notifyListeners(): void {
        const currentState = this.getState();
        this.listeners.forEach(listener => listener(currentState));
    }

    /**
     * 销毁（清理事件监听）
     */
    destroy(): void {
        if (this.cleanupStatsListener) {
            this.cleanupStatsListener();
            this.cleanupStatsListener = null;
        }
        this.listeners.clear();
    }
}

// 导出单例实例
export const settingsStore = new SettingsStore();
