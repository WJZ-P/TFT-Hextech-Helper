import type {Rectangle} from 'electron';
import Store from 'electron-store';
import {TFTMode} from "../TFTProtocol";

type WindowBounds = Pick<Rectangle, 'x' | 'y' | 'width' | 'height'>;

export type DotNotationKeyOf<T> =
    keyof T // 联合类型的第一部分
    | {       // 联合类型的第二部分 (通过 Mapped Type + Lookup 方式)
    [K in keyof T]: T[K] extends Record<string, any>
        ? `${K & string}.${DotNotationKeyOf<T[K]>}`
        : never;
}[keyof T]; // 扁平化为联合类型

export type DotNotationValueFor<
    T,
    K extends DotNotationKeyOf<T>
> = K extends keyof T
    ? T[K]
    : K extends `${infer F}.${infer R}`
        ? F extends keyof T
            ? R extends DotNotationKeyOf<T[F]>
                ? DotNotationValueFor<T[F], R>
                : never
            : never
        : never;

//  配置类
interface AppSettings {
    tftMode: TFTMode,    //  下棋模式选择
    window: {
        bounds: WindowBounds | null, // 上次关闭时的窗口信息
        isMaximized: boolean,   //  上次关闭是否最大化
    },
    selectedLineupIds: string[],  // 用户选中的阵容 ID 列表
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
            tftMode: TFTMode.NORMAL,    //  默认是匹配模式
            window: {
                bounds: null,           //  第一次启动，默认为null
                isMaximized: false     //  默认不最大化窗口
            },
            selectedLineupIds: []       //  默认没有选中任何阵容
        }
        this.store = new Store<AppSettings>({defaults})
    }

    public get<K extends keyof AppSettings>(key: K): AppSettings[K] {
        return this.store.get(key)
    }

    public set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
        this.store.set(key, value)
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