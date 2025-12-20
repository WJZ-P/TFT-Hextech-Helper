import React, {useState, useEffect} from 'react';
import styled from 'styled-components';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import {ThemeType} from "../../styles/theme.ts";
import {LogPanel} from "../LogPanel.tsx";
import {toast} from "../toast/toast-core.ts";
import {SummonerInfo} from "../../../src-backend/lcu/utils/LCUProtocols.ts";

// ============================================
// 样式组件定义
// ============================================

const PageWrapper = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${props => props.theme.spacing.large};
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  text-align: center;
  height: 100%;
  overflow: hidden;
`;

// ============================================
// 召唤师信息区域样式
// ============================================

/** 召唤师信息容器 */
const SummonerSection = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.large};
`;

/** 详情浮窗容器 - hover 时显示（必须在 AvatarContainer 之前定义） */
const InfoTooltip = styled.div<{ theme: ThemeType }>`
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 12px;
  padding: ${props => props.theme.spacing.medium};
  background-color: ${props => props.theme.colors.elementBg};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: ${props => props.theme.borderRadius};
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s ease, visibility 0.2s ease;
  z-index: 10;
  white-space: nowrap; /* 防止内容换行，让宽度自适应 */
  
  /* 小三角箭头 */
  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-bottom: 6px solid ${props => props.theme.colors.border};
  }
  &::after {
    content: '';
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 5px solid ${props => props.theme.colors.elementBg};
  }
`;

/** 详情项 */
const InfoItem = styled.div<{ theme: ThemeType }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 0.85rem;
  
  &:not(:last-child) {
    border-bottom: 1px solid ${props => props.theme.colors.border}20;
  }
`;

/** 详情标签 */
const InfoLabel = styled.span<{ theme: ThemeType }>`
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 700;
  margin-right: 20px;
`;

/** 详情值 */
const InfoValue = styled.span<{ theme: ThemeType }>`
  color: ${props => props.theme.colors.text};
  font-weight: 500;
  flex: 1;
  text-align: right;
`;

/** 头像外层容器 - 包含经验条环，hover 时显示详情浮窗 */
const AvatarContainer = styled.div<{ theme: ThemeType }>`
  position: relative;
  width: 100px;
  height: 100px;
  margin-bottom: ${props => props.theme.spacing.medium};
  cursor: pointer;
  
  /* hover 时显示浮窗 */
  &:hover ${InfoTooltip} {
    opacity: 1;
    visibility: visible;
  }
`;

/**
 * 经验条环 - 使用 SVG 圆环实现
 * 通过 stroke-dasharray 和 stroke-dashoffset 控制进度
 * 起点从等级徽章左侧开始（约 7 点钟方向，即 120°）
 */
const ExpRing = styled.svg`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* 旋转 120° 让起点在等级徽章左侧（7 点钟方向） */
  transform: rotate(120deg);
`;

/** 经验条背景圆环 */
const ExpRingBackground = styled.circle<{ theme: ThemeType }>`
  fill: none;
  stroke: ${props => props.theme.colors.border};
  stroke-width: 4;
`;

/** 经验条进度圆环 */
const ExpRingProgress = styled.circle<{ theme: ThemeType; $percent: number }>`
  fill: none;
  stroke: ${props => props.theme.colors.primary};
  stroke-width: 4;
  stroke-linecap: round;
  /* 
   * 经验条只覆盖圆环的 2/3（从等级徽章左侧到右侧，跳过底部）
   * 完整圆周长 = 2 * π * 46 ≈ 289
   * 2/3 圆周长 ≈ 193（这是经验条的最大长度）
   */
  stroke-dasharray: 289;
  /* 
   * dashoffset 计算：
   * - 当 percent = 0 时，offset = 289（完全不显示）
   * - 当 percent = 100 时，offset = 289 - 193 = 96（显示 2/3 圆弧）
   */
  stroke-dashoffset: ${props => 289 - (193 * props.$percent / 100)};
  transition: stroke-dashoffset 0.5s ease;
`;

/** 头像图片容器 */
const AvatarWrapper = styled.div<{ theme: ThemeType }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 84px;
  height: 84px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid ${props => props.theme.colors.elementBg};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
`;

/** 头像图片 */
const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

/** 等级徽章 - 显示在头像底部 */
const LevelBadge = styled.div<{ theme: ThemeType }>`
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.primaryHover} 100%);
  color: ${props => props.theme.colors.textOnPrimary};
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 10px;
  border: 2px solid ${props => props.theme.colors.elementBg};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

/** 召唤师名称容器 */
const SummonerNameContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
`;

/** 召唤师名称 */
const SummonerName = styled.span<{ theme: ThemeType }>`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

/** 加载状态占位 */
const LoadingPlaceholder = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  padding: ${props => props.theme.spacing.medium};
`;

// ============================================
// 控制按钮样式
// ============================================

const ControlButton = styled.button<{ $isRunning: boolean; theme: ThemeType }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.small};
  padding: 0.8rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: ${props => props.theme.borderRadius};
  cursor: pointer;
  transition: background-color 0.2s ease-in-out, transform 0.1s ease, box-shadow 0.2s ease;
  min-width: 150px;
  background-color: ${props => props.$isRunning ? props.theme.colors.error : props.theme.colors.primary};
  color: ${props => props.theme.colors.textOnPrimary};

  &:hover {
    background-color: ${props => props.$isRunning ? '#D32F2F' : props.theme.colors.primaryHover};
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
    box-shadow: none;
  }

  .MuiSvgIcon-root {
    font-size: 1.4rem;
  }
`;

// ============================================
// 组件主体
// ============================================

/** OP.GG 头像 CDN 基础 URL */
const PROFILE_ICON_BASE_URL = 'https://opgg-static.akamaized.net/meta/images/profile_icons/profileIcon';

export const HomePage = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [summonerInfo, setSummonerInfo] = useState<SummonerInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // 新增：跟踪 LCU 连接状态
    const [isLcuConnected, setIsLcuConnected] = useState(false);

    /**
     * 获取召唤师信息的函数
     * 只有在 LCU 已连接时才会调用
     */
    const fetchSummonerInfo = async () => {
        setIsLoading(true);
        try {
            const result = await window.lcu.getSummonerInfo();
            if (result.data) {
                setSummonerInfo(result.data);
            } else if (result.error) {
                console.warn('获取召唤师信息失败:', result.error);
            }
        } catch (error) {
            console.error('获取召唤师信息异常:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 组件挂载时：检查连接状态 + 监听连接/断开事件
    useEffect(() => {
        // 1. 先检查当前是否已经连接
        const checkInitialStatus = async () => {
            const connected = await window.lcu.getConnectionStatus();
            setIsLcuConnected(connected);
            if (connected) {
                // 如果已经连接了，直接获取召唤师信息
                fetchSummonerInfo();
            } else {
                // 未连接时，停止 loading 状态，显示"等待连接"
                setIsLoading(false);
            }
        };
        checkInitialStatus();

        // 2. 监听 LCU 连接事件
        const cleanupConnect = window.lcu.onConnect(() => {
            console.log('🎮 [HomePage] 收到 LCU 连接事件');
            setIsLcuConnected(true);
            fetchSummonerInfo();
        });

        // 3. 监听 LCU 断开事件
        const cleanupDisconnect = window.lcu.onDisconnect(() => {
            console.log('🎮 [HomePage] 收到 LCU 断开事件');
            setIsLcuConnected(false);
            setSummonerInfo(null);
            setIsLoading(false);
        });

        // 4. 组件卸载时清理监听器
        return () => {
            cleanupConnect();
            cleanupDisconnect();
        };
    }, []);

    const handleToggle = async () => {
        if (!isRunning) {
            const success = await window.hex.start();
            if (success) {
                toast.success('海克斯科技启动!');
            } else {
                return toast.error('海克斯科技启动失败!');
            }
        } else {
            const success = await window.hex.stop();
            if (success) {
                toast.success('海克斯科技已关闭!');
            } else {
                return toast.error('海克斯科技关闭失败!');
            }
        }
        setIsRunning(!isRunning);
    };

    /**
     * 根据 profileIconId 生成头像 URL
     * @param iconId - 头像图标 ID
     */
    const getAvatarUrl = (iconId: number): string => {
        return `${PROFILE_ICON_BASE_URL}${iconId}.jpg`;
    };

    return (
        <PageWrapper>
            {/* 召唤师信息区域 */}
            <SummonerSection>
                {isLoading ? (
                    <LoadingPlaceholder>
                        <span>正在获取召唤师信息...</span>
                    </LoadingPlaceholder>
                ) : !isLcuConnected ? (
                    // 新增：未连接 LOL 客户端时的提示
                    <LoadingPlaceholder>
                        <span>等待 LOL 客户端连接...</span>
                        <span>请启动并登录游戏客户端</span>
                    </LoadingPlaceholder>
                ) : summonerInfo ? (
                    <>
                        {/* 头像 + 经验条环 */}
                        <AvatarContainer>
                            {/* SVG 经验条环 */}
                            <ExpRing viewBox="0 0 100 100">
                                {/* 背景圆环 */}
                                <ExpRingBackground
                                    cx="50"
                                    cy="50"
                                    r="46"
                                />
                                {/* 进度圆环 - 使用 percentCompleteForNextLevel 作为进度 */}
                                <ExpRingProgress
                                    cx="50"
                                    cy="50"
                                    r="46"
                                    $percent={summonerInfo.percentCompleteForNextLevel}
                                />
                            </ExpRing>
                            {/* 头像图片 */}
                            <AvatarWrapper>
                                <AvatarImage
                                    src={getAvatarUrl(summonerInfo.profileIconId)}
                                    alt="召唤师头像"
                                    onError={(e) => {
                                        // 图片加载失败时使用默认头像
                                        (e.target as HTMLImageElement).src = getAvatarUrl(29);
                                    }}
                                />
                            </AvatarWrapper>
                            {/* 等级徽章 */}
                            <LevelBadge>Lv.{summonerInfo.summonerLevel}</LevelBadge>
                            {/* hover 时显示的详情浮窗 */}
                            <InfoTooltip>
                                <InfoItem>
                                    <InfoLabel>游戏ID</InfoLabel>
                                    <InfoValue>{summonerInfo.gameName}#{summonerInfo.tagLine}</InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>等级</InfoLabel>
                                    <InfoValue>Lv.{summonerInfo.summonerLevel}</InfoValue>
                                </InfoItem>
                                <InfoItem>
                                    <InfoLabel>经验进度</InfoLabel>
                                    <InfoValue>{summonerInfo.xpSinceLastLevel} / {summonerInfo.xpUntilNextLevel}</InfoValue>
                                </InfoItem>
                            </InfoTooltip>
                        </AvatarContainer>
                        {/* 召唤师名称（不显示 tagLine） */}
                        <SummonerNameContainer>
                            <SummonerName>{summonerInfo.gameName}</SummonerName>
                        </SummonerNameContainer>
                    </>
                ) : (
                    <LoadingPlaceholder>
                        <span>未能获取召唤师信息</span>
                        <span>请确保已登录游戏客户端</span>
                    </LoadingPlaceholder>
                )}
            </SummonerSection>

            {/* 控制按钮 */}
            <ControlButton onClick={handleToggle} $isRunning={isRunning}>
                {isRunning ? <StopCircleOutlinedIcon /> : <PlayCircleOutlineIcon />}
                {isRunning ? '关闭' : '开始'}
            </ControlButton>

            {/* 日志面板 */}
            <LogPanel isVisible={true} />
        </PageWrapper>
    );
};
