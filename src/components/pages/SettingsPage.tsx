import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import {ThemeType} from "../../styles/theme.ts";
import {toast} from "../toast/toast-core.ts";
import { logStore, LogAutoCleanThreshold } from "../../stores/logStore.ts";
import { settingsStore } from "../../stores/settingsStore.ts"; // 全局设置状态

// -------------------------------------------------------------------
// ✨ 样式组件定义 (Styled Components Definitions) ✨
// -------------------------------------------------------------------

// 整个页面的根容器
const PageWrapper = styled.div<{ theme: ThemeType }>`
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  padding: ${props => props.theme.spacing.small} ${props => props.theme.spacing.large};
  height: 100vh;
  overflow-y: auto;
  transition: background-color 0.3s, color 0.3s;
`;

//  设置每一组设置的标头
const SettingsHeader = styled.h2`
  margin: ${props=>props.theme.spacing.small};
  font-size: ${props=>props.theme.fontSizes.large};
  text-align: start;
  margin: ${props=>props.theme.spacing.medium} 8px 6px;
`;

// 用来包裹设置项的卡片
const SettingsCard = styled.div`
  background-color: ${props => props.theme.colors.elementBg};
  border-radius: ${props => props.theme.borderRadius};
  border: 1px solid ${props => props.theme.colors.border};
  padding: ${props => props.theme.spacing.medium};
  transition: background-color 0.3s, border-color 0.3s;
`;

// 单个设置项的容器
const SettingItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  // 如果不是最后一个设置项，给它加一点下边距
  &:not(:last-child) {
    margin-bottom: ${props => props.theme.spacing.medium};
    padding-bottom: ${props => props.theme.spacing.medium};
    border-bottom: 1px solid ${props => props.theme.colors.divider};
  }
`;

// 设置项左侧的图标和文字信息
const SettingInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.large};
`;

const IconWrapper = styled.div`
  color: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  justify-content: center;

  // 给 Material Icon 设置一下大小
  .MuiSvgIcon-root {
    font-size: 28px;
  }
`;

const SettingText = styled.div`
  h3 {
    font-size: ${props => props.theme.fontSizes.medium};
    font-weight: 600;
    color: ${props => props.theme.colors.text};
    text-align: start;
  }

  p {
    font-size: ${props => props.theme.fontSizes.small};
    color: ${props => props.theme.colors.textSecondary};
    margin-top: 0.3rem;
  }
`;

// 右侧的操作按钮
const ActionButton = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.textOnPrimary};
  border: none;
  font-size: ${props => props.theme.fontSizes.small};
  border-radius: ${props => props.theme.borderRadius};
  padding: 0.6rem 1.2rem;
  font-weight: bolder;
  cursor: pointer;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: ${props => props.theme.colors.primaryHover};
  }

  &:disabled {
    background-color: ${props => props.theme.colors.textDisabled};
    cursor: not-allowed;
  }
`;

// 下拉选择框样式
const SelectWrapper = styled.select<{ theme: ThemeType }>`
  background-color: ${props => props.theme.colors.elementBg};
  color: ${props => props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius};
  padding: 0.5rem 1rem;
  font-size: ${props => props.theme.fontSizes.small};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  min-width: 120px;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}30;
  }

  option {
    background-color: ${props => props.theme.colors.elementBg};
    color: ${props => props.theme.colors.text};
  }
`;

// 快捷键输入框样式
const HotkeyInput = styled.div<{ $isRecording: boolean }>`
  background-color: ${props => props.theme.colors.elementBg};
  color: ${props => props.$isRecording ? props.theme.colors.primary : props.theme.colors.text};
  border: 1px solid ${props => props.$isRecording ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius};
  padding: 0.5rem 1rem;
  font-size: ${props => props.theme.fontSizes.small};
  min-width: 120px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  user-select: none;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}30;
  }
`;

// Toggle Switch 开关样式
const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
  cursor: pointer;
`;

const ToggleSlider = styled.span<{ $isOn: boolean }>`
  position: absolute;
  top: 0;           /* ← 加上这个 */
  left: 0;          /* ← 加上这个 */
  width: 100%;
  height: 100%;
  background-color: ${props => props.$isOn ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 26px;
  transition: all 0.3s ease-in-out;

  &::before {
    content: '';
    position: absolute;
    height: 20px;
    width: 20px;
    left: ${props => props.$isOn ? '25px' : '3px'};
    bottom: 3px;
    background-color: white;
    border-radius: 50%;
    transition: all 0.3s ease-in-out;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

/** GitHub 链接按钮 - 放在设置项右侧 */
const GitHubButton = styled.a<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0.6rem 1.2rem;
  background: linear-gradient(135deg, #24292e 0%, #1a1e22 100%);
  border-radius: ${props => props.theme.borderRadius};
  text-decoration: none;
  color: #ffffff;
  font-weight: bold;
  font-size: ${props => props.theme.fontSizes.small};
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
    background: linear-gradient(135deg, #2d333b 0%, #24292e 100%);
  }
  
  svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
    flex-shrink: 0;
  }
`;

/** 名字抖动动画 - 左右位移 + 角度旋转 */
const shakeAnimation = keyframes`
  0% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-3px) rotate(-3deg); }
  50% { transform: translateX(3px) rotate(3deg); }
  75% { transform: translateX(-2px) rotate(-2deg); }
  100% { transform: translateX(0) rotate(0deg); }
`;

/** 作者 Banner - 显示在页面底部的酷酷卡片 */
const AuthorBanner = styled.div<{ theme: ThemeType }>`
  text-align: center;
  padding: ${props => props.theme.spacing.large};
  margin-top: ${props => props.theme.spacing.large};
  background: linear-gradient(135deg, 
    ${props => props.theme.colors.elementBg} 0%, 
    ${props => props.theme.colors.cardBg} 100%
  );
  border-radius: ${props => props.theme.borderRadius};
  border: 1px solid ${props => props.theme.colors.border};
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  font-size: ${props => props.theme.fontSizes.medium};
  color: ${props => props.theme.colors.text};
  
  a {
    background: linear-gradient(135deg, ${props => props.theme.colors.primary}, #ff6b6b, #ffd93d);
    background-size: 200% 200%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    font-weight: 900;
    font-size: 1.1em;
    text-decoration: none;
    cursor: pointer;
    display: inline-block;
    
    &:hover {
      animation: ${shakeAnimation} 0.8s ease-in-out infinite;
    }
  }
`;

/** 定时停止操作区域 - 包含时间输入和开关 */
const ScheduledStopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

/** 时间选择输入框 */
const TimeInput = styled.input<{ theme: ThemeType; disabled?: boolean }>`
  background-color: ${props => props.theme.colors.elementBg};
  color: ${props => props.disabled ? props.theme.colors.textDisabled : props.theme.colors.text};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius};
  padding: 0.5rem 0.8rem;
  font-size: ${props => props.theme.fontSizes.small};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  transition: all 0.2s ease-in-out;
  min-width: 100px;
  text-align: center;

  &:hover:not(:disabled) {
    border-color: ${props => props.theme.colors.primary};
  }

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}30;
  }

  /* 让时间选择器的点击区域覆盖整个输入框 */
  /* 原理：将原本只在右侧的小时钟图标通过绝对定位铺满整个 input，
     并设为透明，这样用户点击数字区域也能弹出时间选择器 */
  position: relative;
  &::-webkit-calendar-picker-indicator {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    opacity: 0;  /* 隐藏图标本身，但保留点击区域 */
  }
`;

/** 使用提示卡片 - 现代玻璃拟态风格 */
const TipsCard = styled.div<{ theme: ThemeType }>`
  position: relative;
  background: linear-gradient(135deg, 
    ${props => props.theme.colors.primary}10 0%, 
    ${props => props.theme.colors.primary}05 100%
  );
  border: 1px solid ${props => props.theme.colors.primary}30;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: ${props => props.theme.spacing.large};
  backdrop-filter: blur(10px);
  overflow: hidden;
  
  /* 左侧装饰条 */
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, 
      ${props => props.theme.colors.primary} 0%, 
      #ff6b6b 100%
    );
    border-radius: 4px 0 0 4px;
  }
  
  h3 {
    color: ${props => props.theme.colors.text};
    font-size: ${props => props.theme.fontSizes.medium};
    font-weight: 600;
    margin: 0 0 12px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    
    span {
      font-size: 1.1em;
    }
  }
  
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
    
    li {
      position: relative;
      padding-left: 20px;
      margin-bottom: 8px;
      color: ${props => props.theme.colors.secondaryText};
      font-size: ${props => props.theme.fontSizes.small};
      line-height: 1.6;
      
      /* 自定义列表符号 */
      &::before {
        content: '→';
        position: absolute;
        left: 0;
        color: ${props => props.theme.colors.primary};
        font-weight: bold;
      }
      
      &:last-child {
        margin-bottom: 0;
      }
      
      strong {
        color: ${props => props.theme.colors.text};
      }
    }
  }
`;

// -------------------------------------------------------------------
// ✨ 工具函数 ✨
// -------------------------------------------------------------------

/**
 * 将 KeyboardEvent 转换为 Electron Accelerator 格式
 * @description Electron Accelerator 格式示例: "Ctrl+Shift+F1", "Alt+A", "F12"
 */
function keyEventToAccelerator(e: KeyboardEvent): string | null {
    const parts: string[] = [];
    
    // 添加修饰键（顺序：Ctrl -> Alt -> Shift -> Meta）
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Meta');
    
    // 获取主键
    let key = e.key;
    
    // 如果只按了修饰键，不算有效快捷键
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        return null;
    }
    
    // 转换特殊按键名称为 Electron Accelerator 格式
    const keyMap: Record<string, string> = {
        ' ': 'Space',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'Escape': 'Esc',
    };
    
    if (keyMap[key]) {
        key = keyMap[key];
    } else if (key.length === 1) {
        // 单个字符转大写
        key = key.toUpperCase();
    }
    
    parts.push(key);
    return parts.join('+');
}

// -------------------------------------------------------------------
// ✨ React 组件本体 ✨
// -------------------------------------------------------------------

const SettingsPage = () => {
    // 备份/恢复按钮的加载状态
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    
    // 日志自动清理阈值设置
    const [logAutoCleanThreshold, setLogAutoCleanThreshold] = useState<LogAutoCleanThreshold>(
        logStore.getThreshold()
    );
    
    // 快捷键设置
    const [toggleHotkey, setToggleHotkey] = useState<string>('F1');
    const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
    
    // "本局结束后停止"快捷键设置
    const [stopAfterGameHotkey, setStopAfterGameHotkey] = useState<string>('F2');
    const [isRecordingStopAfterGameHotkey, setIsRecordingStopAfterGameHotkey] = useState(false);
    
    // 调试页面显示设置
    const [showDebugPage, setShowDebugPage] = useState(false);
    
    // 游戏浮窗显示设置
    const [showOverlay, setShowOverlay] = useState(true);
    
    // 版本与更新
    const [currentVersion, setCurrentVersion] = useState<string>('');
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    
    // 定时停止设置
    const [scheduledStopTime, setScheduledStopTime] = useState<string>('');  // "HH:mm" 格式
    const [scheduledStopIso, setScheduledStopIso] = useState<string | null>(null);  // 已设定的目标时间 ISO

    // 初始化时从后端获取设置
    useEffect(() => {
        const loadSettings = async () => {
            // 加载日志阈值
            await logStore.refreshThreshold();
            setLogAutoCleanThreshold(logStore.getThreshold());
            
            // 加载快捷键设置
            const hotkey = await window.util.getToggleHotkey();
            setToggleHotkey(hotkey);
            
            // 加载"本局结束后停止"快捷键设置
            const stopAfterGameHk = await window.util.getStopAfterGameHotkey();
            setStopAfterGameHotkey(stopAfterGameHk);
            
            // 加载调试页面显示设置（通过 settingsStore）
            await settingsStore.init();
            setShowDebugPage(settingsStore.getShowDebugPage());
            
            // 加载游戏浮窗显示设置
            const overlayEnabled = await window.settings.get<boolean>('showOverlay');
            setShowOverlay(overlayEnabled);
            
            // 加载当前版本号
            const version = await window.util.getAppVersion();
            setCurrentVersion(version);
            
            // 加载定时停止状态
            const savedScheduledStop = await window.hex.getScheduledStop();
            if (savedScheduledStop) {
                setScheduledStopIso(savedScheduledStop);
                // 从 ISO 字符串还原 "HH:mm" 显示
                const d = new Date(savedScheduledStop);
                setScheduledStopTime(
                    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                );
            }
        };
        loadSettings();
        
        // 订阅 settingsStore 变化（其他组件修改时同步更新）
        const unsubscribe = settingsStore.subscribe((settings) => {
            setShowDebugPage(settings.showDebugPage);
        });

        // 监听定时停止触发事件：后端定时器到点后通知前端自动关闭开关
        const cleanupScheduledStop = window.hex.onScheduledStopTriggered(() => {
            setScheduledStopIso(null);  // 关闭开关（一次性触发后自动关闭）
        });
        
        return () => {
            unsubscribe();
            cleanupScheduledStop();
        };
    }, []);
    
    // 快捷键录入处理
    const handleHotkeyKeyDown = useCallback(async (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // ESC 键：取消绑定快捷键
        if (e.key === 'Escape') {
            const success = await window.util.setToggleHotkey('');
            if (success) {
                setToggleHotkey('');
                toast.success('快捷键已取消绑定');
            }
            setIsRecordingHotkey(false);
            return;
        }
        
        const accelerator = keyEventToAccelerator(e);
        if (!accelerator) return;  // 只按了修饰键，忽略
        
        // 如果按下的快捷键和当前一样，直接退出录入模式
        if (accelerator === toggleHotkey) {
            toast.success(`快捷键保持为 ${accelerator}`);
            setIsRecordingHotkey(false);
            return;
        }
        
        // 检查是否与"本局结束后停止"快捷键冲突
        if (accelerator === stopAfterGameHotkey) {
            toast.error(`快捷键 ${accelerator} 已被"本局结束后停止"使用`);
            setIsRecordingHotkey(false);
            return;
        }
        
        // 尝试设置新快捷键
        const success = await window.util.setToggleHotkey(accelerator);
        if (success) {
            setToggleHotkey(accelerator);
            toast.success(`快捷键已设置为 ${accelerator}`);
        } else {
            toast.error(`快捷键 ${accelerator} 设置失败，可能被其他程序占用`);
        }
        
        setIsRecordingHotkey(false);
    }, [toggleHotkey, stopAfterGameHotkey]);
    
    // "本局结束后停止"快捷键录入处理
    const handleStopAfterGameHotkeyKeyDown = useCallback(async (e: KeyboardEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // ESC 键：取消绑定快捷键
        if (e.key === 'Escape') {
            const success = await window.util.setStopAfterGameHotkey('');
            if (success) {
                setStopAfterGameHotkey('');
                toast.success('快捷键已取消绑定');
            }
            setIsRecordingStopAfterGameHotkey(false);
            return;
        }
        
        const accelerator = keyEventToAccelerator(e);
        if (!accelerator) return;  // 只按了修饰键，忽略
        
        // 如果按下的快捷键和当前一样，直接退出录入模式
        if (accelerator === stopAfterGameHotkey) {
            toast.success(`快捷键保持为 ${accelerator}`);
            setIsRecordingStopAfterGameHotkey(false);
            return;
        }
        
        // 检查是否与"挂机开关"快捷键冲突
        if (accelerator === toggleHotkey) {
            toast.error(`快捷键 ${accelerator} 已被"挂机开关"使用`);
            setIsRecordingStopAfterGameHotkey(false);
            return;
        }
        
        // 尝试设置新快捷键
        const success = await window.util.setStopAfterGameHotkey(accelerator);
        if (success) {
            setStopAfterGameHotkey(accelerator);
            toast.success(`快捷键已设置为 ${accelerator}`);
        } else {
            toast.error(`快捷键 ${accelerator} 设置失败，可能被其他程序占用`);
        }
        
        setIsRecordingStopAfterGameHotkey(false);
    }, [toggleHotkey, stopAfterGameHotkey]);
    
    // 监听快捷键录入（统一处理两个快捷键的录入）
    useEffect(() => {
        if (isRecordingHotkey) {
            window.addEventListener('keydown', handleHotkeyKeyDown);
            return () => window.removeEventListener('keydown', handleHotkeyKeyDown);
        }
        if (isRecordingStopAfterGameHotkey) {
            window.addEventListener('keydown', handleStopAfterGameHotkeyKeyDown);
            return () => window.removeEventListener('keydown', handleStopAfterGameHotkeyKeyDown);
        }
    }, [isRecordingHotkey, isRecordingStopAfterGameHotkey, handleHotkeyKeyDown, handleStopAfterGameHotkeyKeyDown]);

    // 处理日志清理阈值变化
    const handleLogThresholdChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = Number(e.target.value) as LogAutoCleanThreshold;
        setLogAutoCleanThreshold(value);
        await logStore.setThreshold(value);
    };

    // 点击备份按钮的逻辑
    const handleBackup = async () => {
        console.log("开始备份游戏设置...");
        setIsBackingUp(true);
        // 执行备份
        const success = await window.config.backup() // Boolean
        if (!success) {
            toast.error("备份错误！请检查客户端是否启动！")
        } else {
            toast.success("设置备份成功!")
        }

        setIsBackingUp(false);
    };

    // 点击恢复按钮的逻辑
    const handleRestore = async () => {
        console.log("开始恢复游戏设置...");
        setIsRestoring(true);
        //  执行恢复
        const success = await window.config.restore() // Boolean
        if (!success) {
            toast.error("设置恢复错误！请检查客户端是否启动！")
        } else {
            toast.success("设置恢复成功!")
        }
        await window.config.restore()
        setIsRestoring(false);
    };
    
    // 点击快捷键输入框，开始录入（互斥：关闭另一个的录入状态）
    const handleHotkeyClick = () => {
        setIsRecordingStopAfterGameHotkey(false);
        setIsRecordingHotkey(true);
    };
    
    // 点击"本局结束后停止"快捷键输入框，开始录入（互斥：关闭另一个的录入状态）
    const handleStopAfterGameHotkeyClick = () => {
        setIsRecordingHotkey(false);
        setIsRecordingStopAfterGameHotkey(true);
    };
    
    // 切换调试页面显示
    const handleToggleDebugPage = async () => {
        const newValue = !showDebugPage;
        // 通过 settingsStore 修改，会自动通知 Sidebar 更新
        await settingsStore.setShowDebugPage(newValue);
        toast.success(newValue ? '调试页面已显示' : '调试页面已隐藏');
    };
    
    // 切换游戏浮窗显示
    const handleToggleOverlay = async () => {
        const newValue = !showOverlay;
        setShowOverlay(newValue);
        // 通过通用 settings API 持久化到后端 SettingsStore
        await window.settings.set('showOverlay', newValue);
        toast.success(newValue ? '游戏浮窗已开启' : '游戏浮窗已关闭');
    };
    
    /**
     * 切换定时停止开关
     * - 开启时：校验时间 → 调用后端设置定时 → 更新状态
     * - 关闭时：调用后端取消定时 → 清除状态
     */
    const handleToggleScheduledStop = async () => {
        if (scheduledStopIso) {
            // 当前已开启 → 关闭
            await window.hex.clearScheduledStop();
            setScheduledStopIso(null);
            toast.success('⏰ 定时停止已取消');
        } else {
            // 当前已关闭 → 开启
            if (!scheduledStopTime) {
                toast.error('请先选择一个时间');
                return;
            }
            try {
                const isoTime = await window.hex.setScheduledStop(scheduledStopTime);
                setScheduledStopIso(isoTime);
                
                // 计算友好的提示信息
                const target = new Date(isoTime);
                const now = new Date();
                const diffMinutes = Math.round((target.getTime() - now.getTime()) / 60000);
                const hours = Math.floor(diffMinutes / 60);
                const mins = diffMinutes % 60;
                const timeDesc = hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
                
                toast.success(`⏰ 定时停止已设置：${timeDesc}后本局结束将自动停止`);
            } catch (error: any) {
                toast.error(`设置失败: ${error.message || '未知错误'}`);
            }
        }
    };

    // 检查更新
    const handleCheckUpdate = async () => {
        setIsCheckingUpdate(true);
        try {
            const result = await window.util.checkUpdate();
            
            if (result.error) {
                toast.error(`检查更新失败: ${result.error}`);
                return;
            }
            
            if (result.hasUpdate) {
                toast.success(`发现新版本 v${result.latestVersion}！请前往 GitHub 下载更新`);
                // 自动打开 release 页面
                window.open(result.releaseUrl, '_blank');
            } else {
                toast.success('当前已是最新版本！');
            }
        } catch (error: any) {
            toast.error(`检查更新失败: ${error.message || '未知错误'}`);
        } finally {
            setIsCheckingUpdate(false);
        }
    };

    return (
        <PageWrapper>
            {/* 使用提示 */}
            <TipsCard>
                <ul>
                    <li><strong>游戏语言必须设置为中文</strong>，否则无法正确识别棋子</li>
                    <li><strong>推荐使用默认棋盘皮肤</strong>，已针对默认棋盘优化，能加快棋子识别速度</li>
                </ul>
            </TipsCard>

            {/* 快捷键设置 */}
            <SettingsHeader>
                快捷键
            </SettingsHeader>
            <SettingsCard>
                <SettingItem>
                    <SettingInfo>
                        <SettingText>
                            <h3>挂机开关</h3>
                            <p>随时开启/关闭自动挂机功能，按ESC取消绑定</p>
                        </SettingText>
                    </SettingInfo>
                    <HotkeyInput 
                        $isRecording={isRecordingHotkey}
                        onClick={handleHotkeyClick}
                        tabIndex={0}
                    >
                        {isRecordingHotkey ? '请按下快捷键' : (toggleHotkey || '未绑定')}
                    </HotkeyInput>
                </SettingItem>
                
                <SettingItem>
                    <SettingInfo>
                        <SettingText>
                            <h3>本局结束后停止</h3>
                            <p>开启后，当前对局结束将自动停止挂机，按ESC取消绑定</p>
                        </SettingText>
                    </SettingInfo>
                    <HotkeyInput 
                        $isRecording={isRecordingStopAfterGameHotkey}
                        onClick={handleStopAfterGameHotkeyClick}
                        tabIndex={0}
                    >
                        {isRecordingStopAfterGameHotkey ? '请按下快捷键' : (stopAfterGameHotkey || '未绑定')}
                    </HotkeyInput>
                </SettingItem>
            </SettingsCard>

            {/* 对局设置 */}
            <SettingsHeader>
                对局
            </SettingsHeader>
            <SettingsCard>
                <SettingItem>
                    <SettingInfo>
                        <SettingText>
                            <h3>显示游戏浮窗</h3>
                            <p>对局中在游戏窗口旁显示浮窗，展示真人/人机玩家信息。</p>
                        </SettingText>
                    </SettingInfo>
                    <ToggleSwitch onClick={handleToggleOverlay}>
                        <ToggleSlider $isOn={showOverlay} />
                    </ToggleSwitch>
                </SettingItem>
            </SettingsCard>

            {/* 定时停止设置 */}
            <SettingsHeader>
                智能定时
            </SettingsHeader>
            <SettingsCard>
                <SettingItem>
                    <SettingInfo>
                        <SettingText>
                            <h3>定时停止挂机</h3>
                            <p>到达指定时间后，自动在本局结束时停止挂机，方便控制挂机时长。</p>
                        </SettingText>
                    </SettingInfo>
                    <ScheduledStopRow>
                        <TimeInput
                            type="time"
                            value={scheduledStopTime}
                            onChange={(e) => setScheduledStopTime(e.target.value)}
                            disabled={!!scheduledStopIso}
                        />
                        <ToggleSwitch onClick={handleToggleScheduledStop}>
                            <ToggleSlider $isOn={!!scheduledStopIso} />
                        </ToggleSwitch>
                    </ScheduledStopRow>
                </SettingItem>
            </SettingsCard>
        
            {/* 日志设置 */}
            <SettingsHeader>
                日志
            </SettingsHeader>
            <SettingsCard>
                <SettingItem>
                    <SettingInfo>
                        <SettingText>
                            <h3>日志自动清理</h3>
                            <p>当日志数量超过阈值时，自动删除一半的旧日志以节省内存。</p>
                        </SettingText>
                    </SettingInfo>
                    <SelectWrapper 
                        value={logAutoCleanThreshold} 
                        onChange={handleLogThresholdChange}
                    >
                        <option value={0}>从不</option>
                        <option value={100}>100 条</option>
                        <option value={200}>200 条</option>
                        <option value={500}>500 条</option>
                        <option value={1000}>1000 条</option>
                    </SelectWrapper>
                </SettingItem>
            </SettingsCard>

            {/* 备份设置 */}
            <SettingsHeader>
                备份
            </SettingsHeader>
            <SettingsCard>
                <SettingItem>
                    <SettingInfo>
                        <SettingText>
                            <h3>备份游戏设置</h3>
                            <p>将当前的游戏内设置（如键位、画质等）备份到本地。</p>
                        </SettingText>
                    </SettingInfo>
                    <ActionButton onClick={handleBackup} disabled={isBackingUp || isRestoring}>
                        {isBackingUp ? '备份中...' : '立即备份'}
                    </ActionButton>
                </SettingItem>

                <SettingItem>
                    <SettingInfo>
                        <SettingText>
                            <h3>恢复游戏设置</h3>
                            <p>使用之前备份的设置，覆盖当前的游戏设置。</p>
                        </SettingText>
                    </SettingInfo>
                    <ActionButton onClick={handleRestore} disabled={isBackingUp || isRestoring}>
                        {isRestoring ? '恢复中...' : '恢复备份'}
                    </ActionButton>
                </SettingItem>
            </SettingsCard>

            {/* 开发者选项 */}
            <SettingsHeader>
                开发者选项
            </SettingsHeader>
            <SettingsCard>
                <SettingItem>
                    <SettingInfo>
                        <SettingText>
                            <h3>显示调试页面</h3>
                            <p>在侧边栏显示调试页面入口，用于开发调试。</p>
                        </SettingText>
                    </SettingInfo>
                    <ToggleSwitch onClick={handleToggleDebugPage}>
                        <ToggleSlider $isOn={showDebugPage} />
                    </ToggleSwitch>
                </SettingItem>
            </SettingsCard>

            {/* 关于 */}
            <SettingsHeader>
                关于
            </SettingsHeader>
            <SettingsCard>
                <SettingItem>
                    <SettingInfo>
                        <SettingText>
                            <h3>项目地址</h3>
                            <p>请你给我点个 Star⭐吧！</p>
                        </SettingText>
                    </SettingInfo>
                    <GitHubButton 
                        href="https://github.com/WJZ-P/TFT-Hextech-Helper" 
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                        </svg>
                        GitHub ⭐
                    </GitHubButton>
                </SettingItem>
                <SettingItem>
                    <SettingInfo>
                        <SettingText>
                            <h3>检查更新</h3>
                            <p>当前版本：v{currentVersion || '加载中...'}</p>
                        </SettingText>
                    </SettingInfo>
                    <ActionButton onClick={handleCheckUpdate} disabled={isCheckingUpdate}>
                        {isCheckingUpdate ? '检查中...' : '检查更新'}
                    </ActionButton>
                </SettingItem>
                
            </SettingsCard>

            {/* 作者署名 */}
            <AuthorBanner>
                本软件由神奇的 <a href="https://github.com/WJZ-P" target="_blank" rel="noopener noreferrer">WJZ_P</a> 倾力打造 ( •̀ ω •́ )✧ ✨
            </AuthorBanner>
        </PageWrapper>
    );
};

export default SettingsPage;

