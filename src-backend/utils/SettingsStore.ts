import type {Rectangle} from 'electron';
import Store from 'electron-store';
import {TFTMode} from "../TFTProtocol";
import {LogMode} from "../types/AppTypes";

type WindowBounds = Pick<Rectangle, 'x' | 'y' | 'width' | 'height'>;

// 日志自动清理阈值的可选值，0 表示"从不"自动清理
export type LogAutoCleanThreshold = 0 | 100 | 200 | 500 | 1000;

// ============================================================================
// 点号路径类型工具 (Dot Notation Type Utilities)
// ============================================================================

/**
 * 判断一个类型是否为"可继续展开的对象"
 * - 排除 null、undefined、数组、Date 等特殊类型
 * - 只有纯对象 { key: value } 才返回 true
 */
type IsPlainObject<T> = T extends object
    ? T extends any[] | Date | null | undefined
        ? false
        : true
    : false;

/**
 * 生成对象的所有点号路径 key
 * @example
 * type Keys = DotNotationKeyOf<{ a: { b: number }, c: string }>
 * // 结果: "a" | "c" | "a.b"
 */
export type DotNotationKeyOf<T> = T extends object
    ? {
        // 遍历 T 的每个 key
        [K in keyof T & string]:
            // 如果值是可展开的对象，递归生成子路径
            IsPlainObject<T[K]> extends true
                ? K | `${K}.${DotNotationKeyOf<T[K]>}`
                // 否则只返回当前 key
                : K;
    }[keyof T & string]
    : never;

/**
 * 根据点号路径获取对应的值类型
 * @example
 * type Value = DotNotationValueFor<{ a: { b: number } }, "a.b">
 * // 结果: number
 */
export type DotNotationValueFor<T, K extends string> =
    // 情况 1: K 是 T 的直接 key
    K extends keyof T
        ? T[K]
        // 情况 2: K 是点号路径 "first.rest"
        : K extends `${infer First}.${infer Rest}`
            ? First extends keyof T
                ? DotNotationValueFor<T[First], Rest>
                : never
            : never;

//  配置类
interface AppSettings {
    isFirstLaunch: boolean,  //  是否为首次启动（用于显示引导弹窗）
    tftMode: TFTMode,    //  下棋模式选择
    logMode: LogMode,    //  日志模式：简略/详细
    logAutoCleanThreshold: LogAutoCleanThreshold,  //  日志自动清理阈值
    toggleHotkeyAccelerator: string,  //  挂机开关快捷键（Electron Accelerator 格式，如 "F1", "Ctrl+Shift+F1"）
    stopAfterGameHotkeyAccelerator: string,  //  "本局结束后停止"快捷键
    showOverlay: boolean,    //  对局中是否显示游戏浮窗（真人/人机信息）
    showDebugPage: boolean,  //  是否显示调试页面
    window: {
        bounds: WindowBounds | null, // 上次关闭时的窗口信息
        isMaximized: boolean,   //  上次关闭是否最大化
    },
    selectedLineupIds: string[],  // 用户选中的阵容 ID 列表
    // 统计数据（持久化到磁盘，跨会话保留）
    statistics: {
        totalGamesPlayed: number,   // 历史累计挂机局数
    },
    // Google Analytics 数据统计
    analyticsClientId: string,      // GA4 设备唯一标识（随机 UUID，不含个人隐私信息）
}

class SettingsStore {
    private static instance: SettingsStore;
    private store: Store<AppSettings>;

    public static getInstance(): SettingsStore {
        if (!SettingsStore.instance) {
            SettingsStore.instance = new SettingsStore()
        }
        return SettingsStore.instance
    }

    private constructor() {
        //  创建默认配置
        const defaults: AppSettings = {
            isFirstLaunch: true,        //  首次启动默认为 true，用户确认后设为 false
            tftMode: TFTMode.NORMAL,    //  默认是匹配模式
            logMode: LogMode.SIMPLE,    //  默认是简略日志模式
            logAutoCleanThreshold: 500, //  默认超过 500 条时自动清理
            toggleHotkeyAccelerator: 'F1',  //  默认快捷键是 F1
            stopAfterGameHotkeyAccelerator: 'F2',  //  默认快捷键是 F2
            showOverlay: true,              //  默认显示游戏浮窗
            showDebugPage: false,       //  默认隐藏调试页面
            window: {
                bounds: null,           //  第一次启动，默认为null
                isMaximized: false     //  默认不最大化窗口
            },
            selectedLineupIds: [],       //  默认没有选中任何阵容
            statistics: {
                totalGamesPlayed: 0,    //  默认历史总局数为 0
            },
            analyticsClientId: '',       //  默认为空，首次启动时由 AnalyticsManager 生成
        }
        this.store = new Store<AppSettings>({defaults})
    }

    /**
     * 获取配置项（支持点号路径访问嵌套属性）
     * @param key 配置 key，支持 "window.bounds" 这样的点号路径
     * @returns 对应的配置值
     * 
     * @example
     * settingsStore.get('tftMode')           // 返回 TFTMode
     * settingsStore.get('window')            // 返回整个 window 对象
     * settingsStore.get('window.bounds')     // 返回 WindowBounds | null
     * settingsStore.get('window.isMaximized') // 返回 boolean
     */
    public get<K extends DotNotationKeyOf<AppSettings>>(
        key: K
    ): DotNotationValueFor<AppSettings, K> {
        return this.store.get(key as any);
    }

    /**
     * 设置配置项（支持点号路径访问嵌套属性）
     * @param key 配置 key，支持 "window.bounds" 这样的点号路径
     * @param value 要设置的值
     * 
     * @example
     * settingsStore.set('tftMode', TFTMode.CLASSIC)
     * settingsStore.set('window.isMaximized', true)
     * settingsStore.set('window.bounds', { x: 0, y: 0, width: 800, height: 600 })
     */
    public set<K extends DotNotationKeyOf<AppSettings>>(
        key: K,
        value: DotNotationValueFor<AppSettings, K>
    ): void {
        this.store.set(key as any, value);
    }

    public getRawStore(): Store<AppSettings> {
        return this.store
    }

    /**
     * 【批量设置】
     * (类型安全) 一次性写入 *多个* 设置项。
     * @param settings 要合并的设置对象 (Partial 意味着 "部分的", 允许你只传一个子集)
     */
    public setMultiple(settings: Partial<AppSettings>): void {
        // store.set(object) 会自动合并它们
        this.store.set(settings as AppSettings);
    }

    //  返回的是unsubscribe，方便取消订阅
    public onDidChange<K extends keyof AppSettings>(key: K, callback: (newValue: AppSettings[K], oldValue: AppSettings[K]) => void) {
        return this.store.onDidChange(key, callback as any)
    }
}

export const settingsStore = SettingsStore.getInstance()