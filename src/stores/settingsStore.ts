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

// 设置状态接口（前端关心的设置项）
interface SettingsState {
    showDebugPage: boolean;
}

class SettingsStore {
    // 内部状态（从后端同步的缓存）
    private state: SettingsState = {
        showDebugPage: false,
    };
    
    // 订阅者列表
    private listeners: Set<SettingsListener> = new Set();
    
    // 是否已初始化
    private initialized = false;

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
            this.notifyListeners();
        } catch (error) {
            console.error('[SettingsStore] 初始化失败:', error);
        }
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
}

// 导出单例实例
export const settingsStore = new SettingsStore();
