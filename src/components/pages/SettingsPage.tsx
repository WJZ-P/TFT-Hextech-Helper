import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import {ThemeType} from "../../styles/theme.ts";
import {toast} from "../toast/toast-core.ts";
import { logStore, LogAutoCleanThreshold } from "../../stores/logStore.ts";

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
  margin-bottom: ${props=>props.theme.spacing.medium};
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

    // 初始化时从后端获取设置
    useEffect(() => {
        const loadSettings = async () => {
            // 加载日志阈值
            await logStore.refreshThreshold();
            setLogAutoCleanThreshold(logStore.getThreshold());
            
            // 加载快捷键设置
            const hotkey = await window.util.getToggleHotkey();
            setToggleHotkey(hotkey);
        };
        loadSettings();
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
        
        // 尝试设置新快捷键
        const success = await window.util.setToggleHotkey(accelerator);
        if (success) {
            setToggleHotkey(accelerator);
            toast.success(`快捷键已设置为 ${accelerator}`);
        } else {
            toast.error(`快捷键 ${accelerator} 设置失败，可能被其他程序占用`);
        }
        
        setIsRecordingHotkey(false);
    }, [toggleHotkey]);
    
    // 监听快捷键录入
    useEffect(() => {
        if (isRecordingHotkey) {
            window.addEventListener('keydown', handleHotkeyKeyDown);
            return () => window.removeEventListener('keydown', handleHotkeyKeyDown);
        }
    }, [isRecordingHotkey, handleHotkeyKeyDown]);

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
    
    // 点击快捷键输入框，开始录入
    const handleHotkeyClick = () => {
        setIsRecordingHotkey(true);
    };

    return (
        <PageWrapper>
            {/* 快捷键设置 */}
            <SettingsHeader>
                快捷键
            </SettingsHeader>
            <SettingsCard>
                <SettingItem>
                    <SettingInfo>
                        <SettingText>
                            <h3>挂机开关</h3>
                            <p>按下此快捷键可随时开启/关闭自动挂机功能。</p>
                        </SettingText>
                    </SettingInfo>
                    <HotkeyInput 
                        $isRecording={isRecordingHotkey}
                        onClick={handleHotkeyClick}
                        tabIndex={0}
                    >
                        {isRecordingHotkey ? '按下快捷键... (ESC取消绑定)' : (toggleHotkey || '未绑定')}
                    </HotkeyInput>
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
        </PageWrapper>
    );
};

export default SettingsPage;

