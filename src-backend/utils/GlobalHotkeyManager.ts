/**
 * 全局快捷键管理器
 * @module GlobalHotkeyManager
 * @description 使用 uiohook-napi 低级键盘钩子实现全局快捷键，可穿透游戏全屏
 */

import { uIOhook, UiohookKey } from 'uiohook-napi';

/**
 * UiohookKey 键码到 Accelerator 名称的映射
 * @description uiohook-napi 使用的键码与 Electron Accelerator 格式不同，需要转换
 */
const keyCodeToName: Record<number, string> = {
    // F1-F12 功能键
    [UiohookKey.F1]: 'F1',
    [UiohookKey.F2]: 'F2',
    [UiohookKey.F3]: 'F3',
    [UiohookKey.F4]: 'F4',
    [UiohookKey.F5]: 'F5',
    [UiohookKey.F6]: 'F6',
    [UiohookKey.F7]: 'F7',
    [UiohookKey.F8]: 'F8',
    [UiohookKey.F9]: 'F9',
    [UiohookKey.F10]: 'F10',
    [UiohookKey.F11]: 'F11',
    [UiohookKey.F12]: 'F12',
    // 数字键 0-9
    [UiohookKey['0']]: '0',
    [UiohookKey['1']]: '1',
    [UiohookKey['2']]: '2',
    [UiohookKey['3']]: '3',
    [UiohookKey['4']]: '4',
    [UiohookKey['5']]: '5',
    [UiohookKey['6']]: '6',
    [UiohookKey['7']]: '7',
    [UiohookKey['8']]: '8',
    [UiohookKey['9']]: '9',
    // 字母键 A-Z
    [UiohookKey.A]: 'A',
    [UiohookKey.B]: 'B',
    [UiohookKey.C]: 'C',
    [UiohookKey.D]: 'D',
    [UiohookKey.E]: 'E',
    [UiohookKey.F]: 'F',
    [UiohookKey.G]: 'G',
    [UiohookKey.H]: 'H',
    [UiohookKey.I]: 'I',
    [UiohookKey.J]: 'J',
    [UiohookKey.K]: 'K',
    [UiohookKey.L]: 'L',
    [UiohookKey.M]: 'M',
    [UiohookKey.N]: 'N',
    [UiohookKey.O]: 'O',
    [UiohookKey.P]: 'P',
    [UiohookKey.Q]: 'Q',
    [UiohookKey.R]: 'R',
    [UiohookKey.S]: 'S',
    [UiohookKey.T]: 'T',
    [UiohookKey.U]: 'U',
    [UiohookKey.V]: 'V',
    [UiohookKey.W]: 'W',
    [UiohookKey.X]: 'X',
    [UiohookKey.Y]: 'Y',
    [UiohookKey.Z]: 'Z',
    // 特殊键
    [UiohookKey.Space]: 'Space',
    [UiohookKey.Tab]: 'Tab',
    [UiohookKey.Enter]: 'Enter',
    [UiohookKey.Backspace]: 'Backspace',
    [UiohookKey.Delete]: 'Delete',
    [UiohookKey.Insert]: 'Insert',
    [UiohookKey.Home]: 'Home',
    [UiohookKey.End]: 'End',
    [UiohookKey.PageUp]: 'PageUp',
    [UiohookKey.PageDown]: 'PageDown',
    [UiohookKey.ArrowUp]: 'Up',
    [UiohookKey.ArrowDown]: 'Down',
    [UiohookKey.ArrowLeft]: 'Left',
    [UiohookKey.ArrowRight]: 'Right',
    // 小键盘
    [UiohookKey.Numpad0]: 'num0',
    [UiohookKey.Numpad1]: 'num1',
    [UiohookKey.Numpad2]: 'num2',
    [UiohookKey.Numpad3]: 'num3',
    [UiohookKey.Numpad4]: 'num4',
    [UiohookKey.Numpad5]: 'num5',
    [UiohookKey.Numpad6]: 'num6',
    [UiohookKey.Numpad7]: 'num7',
    [UiohookKey.Numpad8]: 'num8',
    [UiohookKey.Numpad9]: 'num9',
};

/** 解析后的快捷键结构 */
interface ParsedAccelerator {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
    key: string;
}

/** 快捷键回调函数类型 */
type HotkeyCallback = () => void | Promise<void>;

/** 已注册快捷键的信息（包含解析缓存） */
interface RegisteredHotkey {
    callback: HotkeyCallback;
    parsed: ParsedAccelerator;  // 缓存解析结果，避免每次按键都解析
}

/**
 * 全局快捷键管理器
 * @description 单例模式，使用低级键盘钩子实现真正的全局快捷键
 */
class GlobalHotkeyManager {
    /** 单例实例 */
    private static instance: GlobalHotkeyManager | null = null;
    
    /** 是否已启动 uiohook */
    private isStarted = false;
    
    /** 当前按下的修饰键状态 */
    private modifierState = {
        ctrl: false,
        alt: false,
        shift: false,
        meta: false,
    };
    
    /** 已注册的快捷键映射 (accelerator -> { callback, parsed }) */
    private hotkeyMap = new Map<string, RegisteredHotkey>();
    
    private constructor() {}
    
    /**
     * 获取单例实例
     */
    public static getInstance(): GlobalHotkeyManager {
        if (!GlobalHotkeyManager.instance) {
            GlobalHotkeyManager.instance = new GlobalHotkeyManager();
        }
        return GlobalHotkeyManager.instance;
    }
    
    /**
     * 解析 Electron Accelerator 字符串为组件
     * @param accelerator 如 "Ctrl+Shift+F1"
     */
    private parseAccelerator(accelerator: string): ParsedAccelerator {
        const parts = accelerator.split('+');
        const result: ParsedAccelerator = { ctrl: false, alt: false, shift: false, meta: false, key: '' };
        
        for (const part of parts) {
            const lowerPart = part.toLowerCase();
            if (lowerPart === 'ctrl' || lowerPart === 'control' || lowerPart === 'commandorcontrol') {
                result.ctrl = true;
            } else if (lowerPart === 'alt') {
                result.alt = true;
            } else if (lowerPart === 'shift') {
                result.shift = true;
            } else if (lowerPart === 'meta' || lowerPart === 'super' || lowerPart === 'command') {
                result.meta = true;
            } else {
                result.key = part.toUpperCase();
            }
        }
        return result;
    }
    
    /**
     * 检查当前按键是否匹配指定的已解析快捷键
     * @param keyCode 按下的键码
     * @param parsed 已解析的快捷键结构
     */
    private matchHotkey(keyCode: number, parsed: ParsedAccelerator): boolean {
        const keyName = keyCodeToName[keyCode];
        if (!keyName) return false;
        
        return (
            this.modifierState.ctrl === parsed.ctrl &&
            this.modifierState.alt === parsed.alt &&
            this.modifierState.shift === parsed.shift &&
            this.modifierState.meta === parsed.meta &&
            keyName.toUpperCase() === parsed.key
        );
    }
    
    /**
     * 启动键盘监听
     */
    public start(): void {
        if (this.isStarted) return;
        
        // 监听键盘按下事件
        uIOhook.on('keydown', (e) => {
            // 更新修饰键状态
            if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
                this.modifierState.ctrl = true;
                return;
            }
            if (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) {
                this.modifierState.alt = true;
                return;
            }
            if (e.keycode === UiohookKey.Shift || e.keycode === UiohookKey.ShiftRight) {
                this.modifierState.shift = true;
                return;
            }
            if (e.keycode === UiohookKey.Meta || e.keycode === UiohookKey.MetaRight) {
                this.modifierState.meta = true;
                return;
            }
            
            // 检查是否匹配已注册的快捷键
            for (const [accelerator, { callback, parsed }] of this.hotkeyMap) {
                if (this.matchHotkey(e.keycode, parsed)) {
                    console.log(`🎮 [GlobalHotkeyManager] 快捷键 ${accelerator} 被触发`);
                    callback();
                    break;  // 只触发第一个匹配的
                }
            }
        });
        
        // 监听键盘释放事件，更新修饰键状态
        uIOhook.on('keyup', (e) => {
            if (e.keycode === UiohookKey.Ctrl || e.keycode === UiohookKey.CtrlRight) {
                this.modifierState.ctrl = false;
            }
            if (e.keycode === UiohookKey.Alt || e.keycode === UiohookKey.AltRight) {
                this.modifierState.alt = false;
            }
            if (e.keycode === UiohookKey.Shift || e.keycode === UiohookKey.ShiftRight) {
                this.modifierState.shift = false;
            }
            if (e.keycode === UiohookKey.Meta || e.keycode === UiohookKey.MetaRight) {
                this.modifierState.meta = false;
            }
        });
        
        uIOhook.start();
        this.isStarted = true;
        console.log('🎮 [GlobalHotkeyManager] 低级键盘钩子已启动');
    }
    
    /**
     * 停止键盘监听
     */
    public stop(): void {
        if (!this.isStarted) return;
        
        uIOhook.stop();
        this.isStarted = false;
        this.hotkeyMap.clear();
        console.log('🎮 [GlobalHotkeyManager] 低级键盘钩子已停止');
    }
    
    /**
     * 注册快捷键
     * @param accelerator Electron Accelerator 格式的快捷键字符串，如 "Ctrl+F1"
     * @param callback 快捷键触发时的回调函数
     * @returns 是否注册成功
     */
    public register(accelerator: string, callback: HotkeyCallback): boolean {
        if (!accelerator) {
            console.error('[GlobalHotkeyManager] 快捷键不能为空');
            return false;
        }
        
        // 解析并验证格式
        const parsed = this.parseAccelerator(accelerator);
        if (!parsed.key) {
            console.error(`[GlobalHotkeyManager] 无效的快捷键格式: ${accelerator}`);
            return false;
        }
        
        // 确保已启动
        if (!this.isStarted) {
            this.start();
        }
        
        // 保存快捷键、回调和解析缓存
        this.hotkeyMap.set(accelerator, { callback, parsed });
        
        console.log(`✅ [GlobalHotkeyManager] 快捷键 ${accelerator} 注册成功`);
        return true;
    }
    
    /**
     * 注销快捷键
     * @param accelerator 要注销的快捷键
     */
    public unregister(accelerator: string): void {
        if (this.hotkeyMap.delete(accelerator)) {
            console.log(`🎮 [GlobalHotkeyManager] 快捷键 ${accelerator} 已注销`);
        }
    }
    
    /**
     * 注销所有快捷键
     */
    public unregisterAll(): void {
        this.hotkeyMap.clear();
        console.log('🎮 [GlobalHotkeyManager] 所有快捷键已注销');
    }
    
    /**
     * 检查是否已注册某个快捷键
     */
    public isRegistered(accelerator: string): boolean {
        return this.hotkeyMap.has(accelerator);
    }
}

/** 导出单例实例 */
export const globalHotkeyManager = GlobalHotkeyManager.getInstance();
