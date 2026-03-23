import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ThemeType } from '../styles/theme';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// ============================================
// 样式组件
// ============================================

const Overlay = styled.div<{ $isVisible: boolean }>`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    opacity: ${props => props.$isVisible ? 1 : 0};
    visibility: ${props => props.$isVisible ? 'visible' : 'hidden'};
    transition: opacity 0.3s ease, visibility 0.3s ease;
    backdrop-filter: blur(4px);
`;

const ModalContainer = styled.div<{ theme: ThemeType; $isVisible: boolean }>`
    background-color: ${props => props.theme.colors.elementBg};
    border-radius: 16px;
    box-shadow: 0 24px 72px rgba(0, 0, 0, 0.4);
    max-width: 700px;
    width: 90%;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transform: ${props => props.$isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)'};
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: 1px solid ${props => props.theme.colors.border};
`;

const ModalHeader = styled.div<{ theme: ThemeType }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24px 32px;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary}15 0%, transparent 100%);
`;

const TitleArea = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
`;

const TitleIcon = styled.div<{ theme: ThemeType }>`
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.primaryHover} 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    box-shadow: 0 4px 12px ${props => props.theme.colors.primary}40;
    
    .MuiSvgIcon-root {
        font-size: 1.6rem;
    }
`;

const Title = styled.h2<{ theme: ThemeType }>`
    margin: 0;
    font-size: 1.4rem;
    font-weight: 800;
    color: ${props => props.theme.colors.text};
    letter-spacing: -0.5px;
`;

const CloseButton = styled.button<{ theme: ThemeType }>`
    background: none;
    border: none;
    padding: 10px;
    cursor: pointer;
    color: ${props => props.theme.colors.textSecondary};
    border-radius: 10px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
        background-color: ${props => props.theme.colors.elementHover};
        color: ${props => props.theme.colors.text};
        transform: rotate(90deg);
    }
`;

const ModalContent = styled.div<{ theme: ThemeType }>`
    padding: 16px 32px 32px;
    overflow-y: auto;
    flex: 1;
    
    &::-webkit-scrollbar {
        width: 6px;
    }
    &::-webkit-scrollbar-thumb {
        background-color: ${props => props.theme.colors.border};
        border-radius: 3px;
    }
`;

const SectionContainer = styled.div<{ theme: ThemeType }>`
    margin-bottom: 12px;
    border-radius: 12px;
    border: 1px solid ${props => props.theme.colors.border};
    overflow: hidden;
    background-color: ${props => props.theme.colors.cardBg}40;
    transition: all 0.2s ease;
    
    &:hover {
        border-color: ${props => props.theme.colors.primary}60;
    }
`;

const SectionHeader = styled.div<{ theme: ThemeType; $isOpen: boolean }>`
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    background-color: ${props => props.$isOpen ? props.theme.colors.primary + '08' : 'transparent'};
    
    h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: ${props => props.$isOpen ? props.theme.colors.primary : props.theme.colors.text};
        transition: color 0.2s ease;
    }
    
    .MuiSvgIcon-root {
        color: ${props => props.$isOpen ? props.theme.colors.primary : props.theme.colors.textSecondary};
        transition: transform 0.3s ease;
    }
`;

const SectionContent = styled.div<{ $isOpen: boolean }>`
    display: grid;
    grid-template-rows: ${props => props.$isOpen ? '1fr' : '0fr'};
    transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    
    > div {
        overflow: hidden;
    }
`;

const InnerContent = styled.div<{ theme: ThemeType }>`
    padding: 0 20px 20px;
    font-size: 0.95rem;
    line-height: 1.7;
    color: ${props => props.theme.colors.text};
    
    ul {
        margin: 8px 0 0;
        padding-left: 20px;
        li {
            margin-bottom: 8px;
            &::marker {
                color: ${props => props.theme.colors.primary};
            }
        }
    }
    
    code {
        background-color: ${props => props.theme.colors.elementHover};
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.85rem;
        color: ${props => props.theme.colors.primary};
    }
`;

const Kbd = styled.kbd<{ theme: ThemeType }>`
    background-color: ${props => props.theme.colors.elementBg};
    border: 1px solid ${props => props.theme.colors.divider};
    border-bottom-width: 3px;
    border-radius: 6px;
    padding: 2px 8px;
    font-size: 0.8rem;
    font-weight: 700;
    color: ${props => props.theme.colors.text};
    margin: 0 2px;
    box-shadow: 0 1px 1px rgba(0,0,0,0.1);
`;

const ModalFooter = styled.div<{ theme: ThemeType }>`
    padding: 16px 32px;
    border-top: 1px solid ${props => props.theme.colors.border};
    background-color: ${props => props.theme.colors.background};
    display: flex;
    justify-content: flex-end;
`;

const ConfirmButton = styled.button<{ theme: ThemeType }>`
    padding: 10px 28px;
    font-size: 1rem;
    font-weight: 700;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.primaryHover} 100%);
    color: ${props => props.theme.colors.textOnPrimary};
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 4px 12px ${props => props.theme.colors.primary}30;
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px ${props => props.theme.colors.primary}50;
    }
    
    &:active {
        transform: translateY(0);
    }
`;

// ============================================
// 组件
// ============================================

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface HelpSectionProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

const HelpSection: React.FC<HelpSectionProps> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <SectionContainer>
            <SectionHeader $isOpen={isOpen} onClick={() => setIsOpen(!isOpen)}>
                <h3>{title}</h3>
                {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </SectionHeader>
            <SectionContent $isOpen={isOpen}>
                <div>
                    <InnerContent>
                        {children}
                    </InnerContent>
                </div>
            </SectionContent>
        </SectionContainer>
    );
};

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <Overlay $isVisible={isVisible} onClick={handleOverlayClick}>
            <ModalContainer $isVisible={isVisible}>
                <ModalHeader>
                    <TitleArea>
                        <TitleIcon>
                            <HelpOutlineIcon />
                        </TitleIcon>
                        <Title>帮助中心 & 指南</Title>
                    </TitleArea>
                    <CloseButton onClick={onClose} title="关闭帮助">
                        <CloseIcon />
                    </CloseButton>
                </ModalHeader>

                <ModalContent>
                    <HelpSection title="🚀 快速开始 (Getting Started)" defaultOpen={true}>
                        <ul>
                            <li><strong>管理员权限：</strong> 必须以管理员身份运行本程序，否则无法正常读取游戏信息和发送指令。</li>
                            <li><strong>游戏语言：</strong> 请确保英雄联盟游戏语言设置为 <strong>简体中文</strong>，否则 OCR 将无法识别棋子。</li>
                            <li><strong>客户端连接：</strong> 开启软件后启动游戏，状态栏显示「已连接」即可开始挂机。</li>
                            <li><strong>分辨率：</strong> 推荐使用游戏默认分辨率 (1920x1080) 以获得最佳识别效果。</li>
                        </ul>
                    </HelpSection>

                    <HelpSection title="🤖 自动化技巧 (Automation Tips)">
                        <ul>
                            <li><strong>阵容选择：</strong> 在「阵容搭配」页面可以预设你想要运营的阵容，程序会自动帮你抢购关键棋子。</li>
                            <li><strong>快捷键：</strong> 
                                <ul>
                                    <li><Kbd>F1</Kbd>：全局开关，随时开启/停止挂机。</li>
                                    <li><Kbd>F2</Kbd>：本局结束后自动停止。</li>
                                </ul>
                            </li>
                            <li><strong>悬浮窗：</strong> 对局开始后右侧会出现悬浮窗，展示当前对手的真人和人机统计。</li>
                            <li><strong>游戏内设置：</strong> 建议在游戏设置中将「棋盘皮肤」设为默认，可以显著提高识别速度。</li>
                        </ul>
                    </HelpSection>

                    <HelpSection title="🛠️ 故障排除 (Troubleshooting)">
                        <ul>
                            <li><strong>无法识别窗口：</strong> 检查是否为管理员运行，或游戏窗口是否被其他全屏窗口遮挡。</li>
                            <li><strong>鼠标乱点：</strong> 如果遇到程序误操作，立即按 <Kbd>F1</Kbd> 停止挂机，检查游戏内是否有弹窗遮挡。</li>
                            <li><strong>OCR 报错：</strong> 检查是否安装了必要的运行库，或尝试重启程序。</li>
                            <li><strong>网络问题：</strong> 电脑端（Riot Client）模式需要稳定的网络连接 LCU 端口。</li>
                        </ul>
                    </HelpSection>
                </ModalContent>

                <ModalFooter>
                    <ConfirmButton onClick={onClose}>
                        明白了，感谢！
                    </ConfirmButton>
                </ModalFooter>
            </ModalContainer>
        </Overlay>
    );
};
