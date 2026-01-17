import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ThemeType } from '../styles/theme';
import CloseIcon from '@mui/icons-material/Close';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

// ============================================
// 样式组件
// ============================================

/** 遮罩层 - 覆盖整个屏幕 */
const Overlay = styled.div<{ $isVisible: boolean }>`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: ${props => props.$isVisible ? 1 : 0};
    visibility: ${props => props.$isVisible ? 'visible' : 'hidden'};
    transition: opacity 0.3s ease, visibility 0.3s ease;
`;

/** 弹窗容器 */
const ModalContainer = styled.div<{ theme: ThemeType; $isVisible: boolean }>`
    background-color: ${props => props.theme.colors.elementBg};
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    transform: ${props => props.$isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)'};
    transition: transform 0.3s ease;
`;

/** 弹窗头部 */
const ModalHeader = styled.div<{ theme: ThemeType }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid ${props => props.theme.colors.border};
    background: linear-gradient(135deg, ${props => props.theme.colors.primary}20 0%, transparent 100%);
`;

/** 标题区域 */
const TitleArea = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

/** 标题图标 */
const TitleIcon = styled.div<{ theme: ThemeType }>`
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.primaryHover} 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    
    .MuiSvgIcon-root {
        font-size: 1.4rem;
    }
`;

/** 标题文字 */
const Title = styled.h2<{ theme: ThemeType }>`
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    color: ${props => props.theme.colors.text};
`;

/** 关闭按钮 */
const CloseButton = styled.button<{ theme: ThemeType }>`
    background: none;
    border: none;
    padding: 8px;
    cursor: pointer;
    color: ${props => props.theme.colors.textSecondary};
    border-radius: 8px;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
        background-color: ${props => props.theme.colors.elementHover};
        color: ${props => props.theme.colors.text};
    }
`;

/** 弹窗内容 */
const ModalContent = styled.div<{ theme: ThemeType }>`
    padding: 24px;
    overflow-y: auto;
    max-height: 50vh;
    text-align: left;  /* 确保内容左对齐 */
`;

/** 说明文字段落 */
const Paragraph = styled.p<{ theme: ThemeType }>`
    margin: 0 0 16px 0;
    font-size: 0.95rem;
    line-height: 1.7;
    color: ${props => props.theme.colors.text};
    text-align: left;  /* 段落左对齐 */
    
    &:last-child {
        margin-bottom: 0;
    }
`;

/** 高亮文字 */
const Highlight = styled.span<{ theme: ThemeType }>`
    color: ${props => props.theme.colors.primary};
    font-weight: 600;
`;

/** 警告文字 */
const Warning = styled.span<{ theme: ThemeType }>`
    color: ${props => props.theme.colors.warning};
    font-weight: 600;
`;

/** 列表 */
const List = styled.ul<{ theme: ThemeType }>`
    margin: 0 0 16px 0;
    padding-left: 20px;
    text-align: left;  /* 列表左对齐 */
    
    li {
        margin-bottom: 8px;
        font-size: 0.9rem;
        line-height: 1.6;
        color: ${props => props.theme.colors.text};
    }
`;

/** GitHub 链接容器 - 放在底部按钮左侧 */
const GitHubCard = styled.a<{ theme: ThemeType }>`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: linear-gradient(135deg, #24292e 0%, #1a1e22 100%);
    border-radius: 8px;
    text-decoration: none;
    color: #ffffff;
    font-weight: 600;
    font-size: 0.85rem;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
        background: linear-gradient(135deg, #2d333b 0%, #24292e 100%);
    }
    
    svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
        flex-shrink: 0;
    }
`;

/** 弹窗底部 - 使用 space-between 让卡片靠左、按钮靠右 */
const ModalFooter = styled.div<{ theme: ThemeType }>`
    display: flex;
    justify-content: space-between;  /* 两端对齐 */
    align-items: center;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid ${props => props.theme.colors.border};
    background-color: ${props => props.theme.colors.background};
`;

/** 确认按钮 */
const ConfirmButton = styled.button<{ theme: ThemeType }>`
    padding: 10px 24px;
    font-size: 0.95rem;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.primaryHover} 100%);
    color: ${props => props.theme.colors.textOnPrimary};
    transition: all 0.2s ease;
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px ${props => props.theme.colors.primary}40;
    }
    
    &:active {
        transform: translateY(0);
    }
`;

// ============================================
// 组件
// ============================================

interface FirstLaunchModalProps {
    /** 是否显示弹窗 */
    isOpen: boolean;
    /** 关闭弹窗的回调 */
    onClose: () => void;
    /** 确认按钮的回调 */
    onConfirm: () => void;
}

/**
 * 首次启动引导弹窗
 * 向首次使用的用户展示软件说明信息
 */
export const FirstLaunchModal: React.FC<FirstLaunchModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
}) => {
    // 内部状态控制动画
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // 延迟一帧再显示，确保动画生效
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    // 点击遮罩层关闭
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
                            <RocketLaunchIcon />
                        </TitleIcon>
                        <Title>欢迎使用 TFT 海克斯助手！ᕦ( •̀ ∀ •́ )ᕤ</Title>
                    </TitleArea>
                    <CloseButton onClick={onClose}>
                        <CloseIcon />
                    </CloseButton>
                </ModalHeader>

                <ModalContent>
                    <Paragraph>
                        感谢你选择使用我的妙妙软件！在开始之前，请阅读以下重要说明：
                    </Paragraph>

                    <List>
                        <li>
                            <Warning>必须以管理员模式运行</Warning>，否则无法识别客户端
                        </li>
                        <li>
                            默认快捷键：<Highlight>F1</Highlight> 开始/停止挂机，<Highlight>F2</Highlight> 本局结束后停止
                        </li>
                        <li>
                            首次使用建议在「阵容搭配」页面选择想要运营的阵容
                        </li>
                        <li>
                            先在设置页中<Warning>备份当前设置</Warning>，以免偶尔关闭功能时备份自动恢复失败
                        </li>
                    </List>

                    <Paragraph>
                        <Warning>本软件完全开源免费（记得点star）</Warning>，若你付费购买了本软件，那你被坑了！
                    </Paragraph>
                    <Paragraph>
                        本软件仅供学习交流使用，请勿用于任何商业用途。使用本软件所产生的任何后果由用户自行承担！
                    </Paragraph>
                </ModalContent>

                <ModalFooter>
                    <GitHubCard
                        href="https://github.com/WJZ-P/TFT-Hextech-Helper"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        给我点个 Star ⭐ 吧！
                    </GitHubCard>

                    {/* 确认按钮 - 靠右 */}
                    <ConfirmButton onClick={onConfirm}>
                        我已了解，开始使用
                    </ConfirmButton>
                </ModalFooter>
            </ModalContainer>
        </Overlay>
    );
};
