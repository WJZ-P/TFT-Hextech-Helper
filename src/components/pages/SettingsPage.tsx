import React from 'react';
import styled from 'styled-components';
// 从 Material Icons 库中引入我们需要的图标
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import {ThemeType} from "../../styles/theme.ts";
import {toast} from "../toast/toast-core.ts";

// -------------------------------------------------------------------
// ✨ 样式组件定义 (Styled Components Definitions) ✨
// -------------------------------------------------------------------

// 整个页面的根容器
const PageWrapper = styled.div<{ theme: ThemeType }>`
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  padding: ${props => props.theme.spacing.large} ${props => props.theme.spacing.large};
  height: 100vh;
  overflow-y: auto;
  transition: background-color 0.3s, color 0.3s;
`;

// 页面顶部的标题和描述
const PageHeader = styled.div`
  margin-bottom: ${props => props.theme.spacing.large};

  h1 {
    font-size: 2rem;
    font-weight: bold;
    color: ${props => props.theme.colors.text};
  }

  p {
    margin-top: ${props => props.theme.spacing.small};
    color: ${props => props.theme.colors.textSecondary};
  }
`;

// 用来包裹设置项的卡片
const SettingsCard = styled.div`
  background-color: ${props => props.theme.colors.elementBg};
  border-radius: ${props => props.theme.borderRadius};
  border: 1px solid ${props => props.theme.colors.border};
  padding: ${props => props.theme.spacing.large};
  transition: background-color 0.3s, border-color 0.3s;
`;

// 单个设置项的容器
const SettingItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;

  // 如果不是最后一个设置项，给它加一点下边距
  &:not(:last-child) {
    margin-bottom: ${props => props.theme.spacing.large};
    padding-bottom: ${props => props.theme.spacing.large};
    border-bottom: 1px solid ${props => props.theme.colors.divider};
  }
`;

// 设置项左侧的图标和文字信息
const SettingInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.medium};
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
    margin-top: 4px;
  }
`;

// 右侧的操作按钮
const ActionButton = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.textOnPrimary};
  border: none;
  border-radius: ${props => props.theme.borderRadius};
  padding: 0.6rem 1.2rem;
  font-weight: 600;
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

// -------------------------------------------------------------------
// ✨ React 组件本体 ✨
// The React Component itself
// -------------------------------------------------------------------

const SettingsPage = () => {
    // 喵~ 在这里你可以添加状态管理，比如按钮是否在加载中
    const [isBackingUp, setIsBackingUp] = React.useState(false);
    const [isRestoring, setIsRestoring] = React.useState(false);

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
        await window.config.restore()
        setIsRestoring(false);
    };

    return (
        <PageWrapper>
            <PageHeader>
                <h1>设置</h1>
                <p>在这里管理你的游戏配置和其他应用参数。</p>
            </PageHeader>

            <SettingsCard>
                <SettingItem>
                    <SettingInfo>
                        <IconWrapper><BackupIcon/></IconWrapper>
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
                        <IconWrapper><RestoreIcon/></IconWrapper>
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

