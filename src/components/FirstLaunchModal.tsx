import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ThemeType } from '../styles/theme';
import { hextechButtonGhost, hextechButtonGold } from '../styles/hextech';
import CloseIcon from '@mui/icons-material/Close';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

// ============================================
// 样式组件
// ============================================

/** 遮罩层 - 覆盖整个屏幕 */
const Overlay = styled.div<{ $isVisible: boolean }>`
    position: fixed;
    top: ${props => props.theme.titleBarHeight}px;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${props => props.theme.colors.overlayBg};
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: ${props => props.$isVisible ? 1 : 0};
    visibility: ${props => props.$isVisible ? 'visible' : 'hidden'};
    transition: opacity 0.3s ease, visibility 0.3s ease;
`;

/** 弹窗容器：参考客户端"退出到桌面"弹窗 —— 近黑底板 + 金边 + 内描边 */
const ModalContainer = styled.div<{ theme: ThemeType; $isVisible: boolean }>`
    position: relative;
    background: ${props => props.theme.colors.dialogBg};
    border: 1px solid ${props => props.theme.colors.gold}b3;
    border-radius: ${props => props.theme.borderRadius};
    box-shadow:
        inset 0 0 0 1px rgba(0, 0, 0, 0.7),
        inset 0 0 0 3px ${props => props.theme.colors.goldDeep}80,
        0 20px 60px rgba(0, 0, 0, 0.6);
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow: hidden;
    transform: ${props => props.$isVisible ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(12px)'};
    transition: transform 0.3s ease;
`;

/** 弹窗头部 */
const ModalHeader = styled.div<{ theme: ThemeType }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px 14px;
    border-bottom: 1px solid ${props => props.theme.colors.goldDeep};
`;

/** 标题区域 */
const TitleArea = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

/** 标题图标：金框菱形 */
const TitleIcon = styled.div<{ theme: ThemeType }>`
    width: 30px;
    height: 30px;
    transform: rotate(45deg);
    border: 1px solid ${props => props.theme.colors.gold};
    background: ${props => props.theme.colors.primary}26;
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${props => props.theme.colors.goldBright};
    margin: 0 4px;
    
    .MuiSvgIcon-root {
        transform: rotate(-45deg);
        font-size: 1.1rem;
    }
`;

/** 标题文字 */
const Title = styled.h2<{ theme: ThemeType }>`
    margin: 0;
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: 1px;
    color: ${props => props.theme.colors.goldBright};
`;

/** 关闭按钮 */
const CloseButton = styled.button<{ theme: ThemeType }>`
    background: none;
    border: 1px solid transparent;
    padding: 4px;
    cursor: pointer;
    color: ${props => props.theme.colors.textSecondary};
    border-radius: ${props => props.theme.borderRadius};
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &:hover {
        border-color: ${props => props.theme.colors.goldDim};
        color: ${props => props.theme.colors.goldBright};
    }
`;

/** 弹窗内容 */
const ModalContent = styled.div<{ theme: ThemeType }>`
    padding: 20px 24px;
    overflow-y: auto;
    max-height: 50vh;
    text-align: left;  /* 确保内容左对齐 */
`;

/** 说明文字段落 */
const Paragraph = styled.p<{ theme: ThemeType }>`
    margin: 0 0 14px 0;
    font-size: 0.92rem;
    line-height: 1.7;
    color: ${props => props.theme.colors.textSecondary};
    text-align: left;  /* 段落左对齐 */
    
    &:last-child {
        margin-bottom: 0;
    }
`;

/** 高亮文字 */
const Highlight = styled.span<{ theme: ThemeType }>`
    color: ${props => props.theme.colors.accentCyan};
    font-weight: 600;
`;

/** 警告文字 */
const Warning = styled.span<{ theme: ThemeType }>`
    color: ${props => props.theme.colors.warning};
    font-weight: 600;
`;

/** 列表：金色菱形作为项目符号 */
const List = styled.ul<{ theme: ThemeType }>`
    margin: 0 0 14px 0;
    padding-left: 0;
    list-style: none;
    text-align: left;  /* 列表左对齐 */
    
    li {
        position: relative;
        padding-left: 18px;
        margin-bottom: 8px;
        font-size: 0.9rem;
        line-height: 1.6;
        color: ${props => props.theme.colors.text};

        &::before {
            content: '';
            position: absolute;
            left: 2px;
            top: 0.6em;
            width: 6px;
            height: 6px;
            transform: rotate(45deg);
            background: ${props => props.theme.colors.gold};
        }
    }
`;

/** GitHub 链接 - 放在底部按钮左侧（深底金边，对应弹窗里的次要按钮） */
const GitHubCard = styled.a<{ theme: ThemeType }>`
    ${hextechButtonGhost};
    text-decoration: none;
    
    svg {
        width: 16px;
        height: 16px;
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
    padding: 14px 24px 18px;
    border-top: 1px solid ${props => props.theme.colors.goldDeep};
`;

/** 确认按钮（古铜色，对应弹窗里的"✓"） */
const ConfirmButton = styled.button<{ theme: ThemeType }>`
    ${hextechButtonGold};
    padding: 0.6rem 1.6rem;
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
