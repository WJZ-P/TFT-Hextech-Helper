import React, {useState, useEffect, useCallback} from 'react';
import styled, { keyframes } from 'styled-components';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import BlockIcon from '@mui/icons-material/Block';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {ThemeType} from "../../styles/theme.ts";
import {LogPanel} from "../LogPanel.tsx";
import {toast} from "../toast/toast-core.ts";
import {SummonerInfo} from "../../../src-backend/lcu/utils/LCUProtocols.ts";
import {TFTMode} from "../../../src-backend/TFTProtocol.ts";
import {LogMode} from "../../../src-backend/types/AppTypes.ts";
import {settingsStore, GameStatistics} from "../../stores/settingsStore.ts";

// 导入 APP 图标（让 Vite 正确处理资源路径）
import appIconUrl from '../../../public/icon.png';

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
/** 召唤师信息区域 - 三列布局：左侧控制 | 中间头像 | 右侧统计 */
/** 使用 CSS Grid 三列布局，中间列固定居中，左右列各自贴边 */
const SummonerSection = styled.div<{ theme: ThemeType }>`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  width: 100%;
  padding: 0 20px;
  margin-bottom: ${props => props.theme.spacing.medium};
`;

/** 中间头像列 - 保持头像垂直居中 */
const AvatarColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
`;

/** 详情浮窗容器 - hover 时显示在右侧（必须在 AvatarContainer 之前定义） */
const InfoTooltip = styled.div<{ theme: ThemeType }>`
  position: absolute;
  top: 50%;
  left: 100%;  /* 出现在头像右侧 */
  transform: translateY(-50%);
  margin-left: 12px;  /* 与头像的间距 */
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
  
  /* 小三角箭头 - 指向左侧 */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: -6px;
    transform: translateY(-50%);
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
    border-right: 6px solid ${props => props.theme.colors.border};
  }
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: -5px;
    transform: translateY(-50%);
    border-top: 5px solid transparent;
    border-bottom: 5px solid transparent;
    border-right: 5px solid ${props => props.theme.colors.elementBg};
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
  padding: ${props => props.theme.spacing.small};
  grid-column: 1 / -1;        /* 横跨 grid 所有列，确保在整个区域中居中 */
`;

/** 管理员权限提示横幅 */
const AdminWarningBanner = styled.div<{ theme: ThemeType }>`
  background-color: ${props => props.theme.colors.warning}20;
  border: 1px solid ${props => props.theme.colors.warning}60;
  border-radius: ${props => props.theme.borderRadius};
  padding: 6px 12px;
  margin-top: 8px;
  font-size: 1rem;
  color: ${props => props.theme.colors.warning};
  display: flex;
  align-items: center;
  gap: 6px;
`;

/** 横幅滑入动画 - 从上方滑入并淡入 */
const slideInFromTop = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
    max-height: 0;
    padding: 0 12px;
    margin-bottom: 0;
    margin-top: 0;
  }
  to {
    opacity: 1;
    transform: translateY(0);
    max-height: 50px;
    padding: 6px 12px;
    margin-bottom: 12px;
    margin-top: -12px;
  }
`;

/** "本局结束后停止"信息横幅 */
const StopAfterGameBanner = styled.div<{ theme: ThemeType }>`
  background-color: ${props => props.theme.colors.primary}20;
  border: 1px solid ${props => props.theme.colors.primary}60;
  border-radius: ${props => props.theme.borderRadius};
  padding: 6px 12px;
  margin-bottom: 12px;
  margin-top: -12px;
  font-size: 1rem;
  color: ${props => props.theme.colors.primary};
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  
  /* 入场动画 */
  animation: ${slideInFromTop} 0.3s ease-out forwards;
`;

// ============================================
// 游戏模式切换样式（两级选择器）
// ============================================

/** 模式选择区域 - 垂直排列，上方赛季选择，下方子模式选择 */
const ModeToggleContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
`;

/**
 * 通用三选一胶囊组件（竖向）
 * 用于赛季选择：S16 / S4 / 发条鸟
 */
const ModeTogglePill = styled.div<{ theme: ThemeType }>`
  appearance: none;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.elementBg};
  border-radius: 20px;
  padding: 4px;
  width: 150px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 5px 11px rgba(0, 0, 0, 0.22);
  }
`;

/**
 * 赛季选择滑块指示器（竖向滑动）
 * $modeIndex: 0=S16, 1=S4, 2=发条鸟
 * 通过 top 值变化实现上下滑动
 */
const ModeToggleIndicator = styled.div<{ theme: ThemeType; $modeIndex: number }>`
  position: absolute;
  left: 2px;
  top: ${props => `calc(${props.$modeIndex * 33.33}% + 2px)`};
  width: calc(100% - 4px);
  height: calc(33.33% - 3px);
  border-radius: 999px;
  background: ${props => {
    switch (props.$modeIndex) {
      case 1: // S4 瑞兽 - 新春红金渐变
        return 'linear-gradient(135deg, #e53935 0%, #ff8f00 100%)';
      case 2: // 发条鸟 - 紫色
        return 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)';
      default: // S16 - 主色蓝
        return `linear-gradient(135deg, ${props.theme.colors.primary} 0%, ${props.theme.colors.primaryHover} 100%)`;
    }
  }};
  transition: top 0.22s ease, background 0.22s ease;
`;

/** 文本层（在滑块之上），竖向三行 grid 布局 */
const ModeToggleTextRow = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  display: grid;
  grid-template-rows: 1fr 1fr 1fr;
  align-items: center;
`;

/** 单个文本标签（可点击切换） */
const ModeToggleLabel = styled.button<{ theme: ThemeType; $active: boolean }>`
  background: none;
  border: none;
  padding: 6px 0;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.5px;
  color: ${props => props.$active ? props.theme.colors.textOnPrimary : props.theme.colors.textSecondary};
  transition: color 0.25s ease;
  cursor: pointer;

  &:hover {
    color: ${props => props.$active ? props.theme.colors.textOnPrimary : props.theme.colors.text};
  }

  &:focus-visible {
    outline: none;
  }
`;

/**
 * S16 子模式选择器（匹配/排位）- 二选一胶囊
 * 仅在选择 S16 赛季时显示
 */
const SubModeTogglePill = styled.div<{ theme: ThemeType }>`
  appearance: none;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.elementBg};
  border-radius: 32px;
  padding: 4px;
  height: 30px;
  width: 140px;
  display: inline-flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, opacity 0.3s ease, max-height 0.3s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 3px 9px rgba(0, 0, 0, 0.18);
  }
`;

/** S16 子模式滑块指示器 - 匹配=蓝色, 排位=橙色 */
const SubModeToggleIndicator = styled.div<{ theme: ThemeType; $isRank: boolean }>`
  position: absolute;
  top: 2px;
  left: ${props => props.$isRank ? 'calc(50% + 2px)' : '2px'};
  width: calc(50% - 4px);
  height: calc(100% - 4px);
  border-radius: 999px;
  background: ${props => props.$isRank
    ? `linear-gradient(135deg, ${props.theme.colors.warning} 0%, ${props.theme.colors.warning}cc 100%)`
    : `linear-gradient(135deg, ${props.theme.colors.primary} 0%, ${props.theme.colors.primaryHover} 100%)`};
  transition: left 0.22s ease, background 0.22s ease;
`;

/** S16 子模式文本层 */
const SubModeToggleTextRow = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
`;

/** S16 子模式文本标签 */
const SubModeToggleLabel = styled.button<{ theme: ThemeType; $active: boolean }>`
  background: none;
  border: none;
  padding: 0;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.5px;
  color: ${props => props.$active ? props.theme.colors.textOnPrimary : props.theme.colors.textSecondary};
  transition: color 0.25s ease;
  cursor: pointer;

  &:hover {
    color: ${props => props.$active ? props.theme.colors.textOnPrimary : props.theme.colors.text};
  }

  &:focus-visible {
    outline: none;
  }
`;

// ============================================
// 左侧控制面板样式（模式选择 + 日志模式）
// ============================================

/** 左侧控制面板 - 垂直排列模式选择和日志模式 */
/** 左侧控制面板 - 贴左边，内部内容居中对齐 */
const LeftControlPanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: start;           /* 在 grid 中顶部对齐，让标题和右侧 StatsPanel 对齐 */
  gap: 10px;
  min-width: 200px;
  justify-self: start;
`;

/** 控制面板小节标题 */
const PanelSectionTitle = styled.span<{ theme: ThemeType }>`
  font-size: 1rem;
  font-weight: 700;
  color: ${props => props.theme.colors.textSecondary};
  letter-spacing: 2px;
  text-transform: uppercase;
  margin-bottom: -4px;
`;

/** 日志模式切换开关 - 紧凑版 */
const LogModeTogglePill = styled.button<{ theme: ThemeType; $isDetailed: boolean }>`
  appearance: none;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.elementBg};
  border-radius: 32px;
  padding: 4px;
  height: 30px;
  width: 120px;
  display: inline-flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 3px 9px rgba(0, 0, 0, 0.18);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 3px solid ${props => props.theme.colors.primary}80;
    outline-offset: 2px;
  }
`;

/** 日志模式滑块指示器 */
const LogModeToggleIndicator = styled.div<{ theme: ThemeType; $isDetailed: boolean }>`
  position: absolute;
  top: 2px;
  left: ${props => props.$isDetailed ? 'calc(50% + 2px)' : '2px'};
  width: calc(50% - 4px);
  height: calc(100% - 4px);
  border-radius: 999px;
  background: ${props => props.$isDetailed
    ? `linear-gradient(135deg, ${props.theme.colors.warning} 0%, ${props.theme.colors.warning}cc 100%)`
    : `linear-gradient(135deg, ${props.theme.colors.primary} 0%, ${props.theme.colors.primaryHover} 100%)`};
  transition: left 0.22s ease, background 0.22s ease;
`;

/** 日志模式文本层 */
const LogModeToggleTextRow = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
`;

/** 日志模式单个文本 */
const LogModeToggleLabel = styled.span<{ theme: ThemeType; $active: boolean }>`
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  letter-spacing: 1px;
  color: ${props => props.$active ? props.theme.colors.textOnPrimary : props.theme.colors.textSecondary};
  transition: color 0.25s ease;
`;

// ============================================
// 右侧统计面板样式
// ============================================

/** 右侧统计面板容器 - 贴右边 */
const StatsPanel = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: start;           /* 在 grid 中顶部对齐，让标题和左侧 LeftControlPanel 对齐 */
  gap: 8px;
  min-width: 200px;
  justify-self: end;
`;

/** 统计卡片 - 精致的数据展示卡 */
const StatsCard = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 16px;
  background: ${props => props.theme.colors.statsCardBg};
  border: 1px solid ${props => props.theme.colors.statsCardBorder};
  border-radius: ${props => props.theme.borderRadius};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  width: 100%;
  transition: border-color 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary}40;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }
`;

/** 统计项 - 单行数据 */
const StatsItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

/** 统计图标容器 */
const StatsIcon = styled.div<{ theme: ThemeType; $color?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: ${props => (props.$color || props.theme.colors.statsIconColor) + '18'};
  color: ${props => props.$color || props.theme.colors.statsIconColor};
  flex-shrink: 0;

  .MuiSvgIcon-root {
    font-size: 1rem;
  }
`;

/** 统计文本容器 */
const StatsTextGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
`;

/** 统计标签 */
const StatsLabel = styled.span<{ theme: ThemeType }>`
  font-size: 0.80rem;
  font-weight: 600;
  color: ${props => props.theme.colors.statsLabelColor};
  letter-spacing: 0.5px;
`;

/** 统计数值 */
const StatsValue = styled.span<{ theme: ThemeType }>`
  font-size: 1rem;
  font-weight: 800;
  color: ${props => props.theme.colors.statsValueColor};
  letter-spacing: 0.5px;
`;



// ============================================
// 控制按钮样式
// ============================================

/**
 * 按钮动画定义
 * - pulse: 呼吸光晕效果
 * - shimmer: 光泽流动效果
 * - rippleFloat: 水纹漂浮效果
 */
const buttonAnimations = `
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(102, 204, 255, 0.6);
    }
    70% {
      box-shadow: 0 0 0 12px rgba(102, 204, 255, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(102, 204, 255, 0);
    }
  }
  
  @keyframes pulseRed {
    0% {
      box-shadow: 0 0 0 0 rgba(244, 67, 54, 0.6);
    }
    70% {
      box-shadow: 0 0 0 12px rgba(244, 67, 54, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(244, 67, 54, 0);
    }
  }
  
  /* 光泽流动 - 从左到右的高光扫过 */
  @keyframes shimmer {
    0% {
      transform: translateX(-100%) skewX(-15deg);
    }
    100% {
      transform: translateX(200%) skewX(-15deg);
    }
  }
  
  /* 水纹漂浮 - 模拟水面波动 */
  @keyframes rippleFloat {
    0%, 100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.15;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.1);
      opacity: 0.25;
    }
  }
  
  @keyframes rippleFloat2 {
    0%, 100% {
      transform: translate(-50%, -50%) scale(1.15);
      opacity: 0.1;
    }
    50% {
      transform: translate(-50%, -50%) scale(1.25);
      opacity: 0.2;
    }
  }

  @keyframes pulseGray {
    0% {
      box-shadow: 0 0 0 0 rgba(120, 144, 156, 0.6);
    }
    70% {
      box-shadow: 0 0 0 12px rgba(120, 144, 156, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(120, 144, 156, 0);
    }
  }

  /* 标题流光特效 */
  @keyframes titleFlow {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  /* 图标呼吸与旋转 */
  @keyframes iconBreath {
    0% {
      box-shadow: 0 0 15px rgba(102, 204, 255, 0.3);
      transform: translate(-50%, -50%) scale(1);
    }
    50% {
      box-shadow: 0 0 30px rgba(102, 204, 255, 0.6);
      transform: translate(-50%, -50%) scale(1.05);
    }
    100% {
      box-shadow: 0 0 15px rgba(102, 204, 255, 0.3);
      transform: translate(-50%, -50%) scale(1);
    }
  }

  /* 雷达扫描圈 */
  @keyframes radarSpin {
    0% {
      transform: translate(-50%, -50%) rotate(0deg);
    }
    100% {
      transform: translate(-50%, -50%) rotate(360deg);
    }
  }
`;

const ControlButton = styled.button<{ $isRunning: boolean; $disabled: boolean; theme: ThemeType }>`
  ${buttonAnimations}
  
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.small};
  padding: 0.9rem 2.2rem;
  font-size: 1.1rem;
  font-weight: 600;
  border: none;
  border-radius: ${props => props.theme.borderRadius};
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  min-width: 160px;
  color: ${props => props.theme.colors.textOnPrimary};
  overflow: hidden;
  
  /* 渐变背景 - 根据状态切换 */
  background: ${props => {
    // 禁用/等待状态：使用科技灰/蓝灰渐变，保留高级感
    if (props.$disabled) return 'linear-gradient(135deg, #78909c 0%, #455a64 100%)';
    // 运行状态：红色
    if (props.$isRunning) return 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)';
    // 就绪状态：蓝色
    return 'linear-gradient(135deg, #66ccff 0%, #3399dd 50%, #2277bb 100%)';
  }};
  
  /* 基础光晕 */
  box-shadow: ${props => {
    if (props.$disabled) return '0 4px 15px rgba(120, 144, 156, 0.4)';
    if (props.$isRunning) return '0 4px 15px rgba(244, 67, 54, 0.4)';
    return '0 4px 15px rgba(102, 204, 255, 0.5)';
  }};
  
  /* 脉冲动画 - 禁用状态也播放，使用灰色脉冲 */
  animation: ${props => {
    if (props.$disabled) return 'pulseGray 2s infinite';
    return props.$isRunning ? 'pulseRed 2s infinite' : 'pulse 2s infinite';
  }};
  
  transition: transform 0.2s ease, box-shadow 0.3s ease, background 0.3s ease;
  
  /* 流动光泽效果 - 始终显示 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 50%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 100%
    );
    /* 禁用状态也播放动画 */
    animation: shimmer 3s ease-in-out infinite;
    pointer-events: none;
  }
  
  /* 内部水纹效果 - 始终显示 */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 150%;
    height: 150%;
    background: radial-gradient(
      ellipse at center,
      rgba(255, 255, 255, 0.3) 0%,
      rgba(255, 255, 255, 0.1) 30%,
      transparent 60%
    );
    border-radius: 50%;
    /* 禁用状态也播放动画 */
    animation: rippleFloat 2.5s ease-in-out infinite;
    pointer-events: none;
  }

  &:hover {
    /* 禁用状态下 Hover 不做位移，但保持光影 */
    transform: ${props => props.$disabled ? 'none' : 'translateY(-3px) scale(1.02)'};
    box-shadow: ${props => {
      if (props.$disabled) return '0 4px 15px rgba(120, 144, 156, 0.4)';
      if (props.$isRunning) return '0 8px 25px rgba(244, 67, 54, 0.5)';
      return '0 8px 25px rgba(102, 204, 255, 0.6)';
    }};
  }

  &:active {
    transform: ${props => props.$disabled ? 'none' : 'translateY(-1px) scale(0.98)'};
    box-shadow: ${props => {
      if (props.$disabled) return '0 4px 15px rgba(120, 144, 156, 0.4)';
      if (props.$isRunning) return '0 2px 10px rgba(244, 67, 54, 0.4)';
      return '0 2px 10px rgba(102, 204, 255, 0.4)';
    }};
  }

  .MuiSvgIcon-root {
    font-size: 1.5rem;
    filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.15));
    /* 图标相对于伪元素要在上层 */
    position: relative;
    z-index: 1;
  }
  
  /* 文字也要在上层 */
  & > span, & > * {
    position: relative;
    z-index: 1;
  }
`;

/**
 * 控制区域容器 - 使用 Flexbox 水平排列
 * 左：日志模式 | 中：控制按钮 | 右：游戏模式
 * 
 * 布局策略：
 * - 中间按钮使用绝对定位，始终保持水平居中
 * - 仅包含中间的控制按钮
 */
const ControlRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 20px;
`;

/** 按钮水纹外层容器 - 居中显示 */
const ButtonWrapper = styled.div`
  position: relative;
  
  /* 外围水纹 - 始终显示 */
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      ellipse at center,
      rgba(102, 204, 255, 0.3) 0%,
      rgba(102, 204, 255, 0.1) 40%,
      transparent 70%
    );
    border-radius: 50%;
    animation: rippleFloat2 3s ease-in-out infinite;
    pointer-events: none;
  }
`;

/** 项目名称大标题 */
const ProjectTitle = styled.h1<{ theme: ThemeType }>`
  font-size: 2rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin-top: -10px;
  margin-bottom: 10px;
  
  /* 酷炫流光渐变 */
  background: linear-gradient(
    -45deg,
    #2196f3,
    #00bcd4,
    #3f51b5,
    #2196f3
  );
  background-size: 300% 300%;
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  /* 发光阴影效果 */
  filter: drop-shadow(0 0 10px rgba(33, 150, 243, 0.3));
  
  animation: titleFlow 6s ease infinite;
`;

/** APP图标容器 */
const AppIconContainer = styled.div<{ theme: ThemeType }>`
  position: relative;
  width: 130px;
  height: 130px;
  margin: 0 auto;
`;

/** APP图标图片 */
const AppIconImage = styled.img<{ theme: ThemeType }>`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 110px;
  height: 110px;
  border-radius: 50%; /* 圆形（球形）图标 */
  z-index: 2;
  border: 2px solid rgba(102, 204, 255, 0.3);
  background-color: ${props => props.theme.colors.elementBg};
  
  /* 呼吸动画 */
  animation: iconBreath 3s ease-in-out infinite;
`;

/** 雷达扫描圈 - 外圈 */
const RadarCircle = styled.div<{ theme: ThemeType }>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px dashed ${props => props.theme.colors.primary}40;
  
  /* 旋转动画 */
  animation: radarSpin 10s linear infinite;
  
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 50%;
    width: 4px;
    height: 4px;
    background: ${props => props.theme.colors.primary};
    border-radius: 50%;
    box-shadow: 0 0 10px ${props => props.theme.colors.primary};
  }
`;

/** 雷达扫描圈 - 内圈 */
const RadarCircleInner = styled(RadarCircle)`
  width: 100%;
  height: 100%;
  border: 1px solid ${props => props.theme.colors.primary}20;
  border-left-color: ${props => props.theme.colors.primary}80;
  animation: radarSpin 3s linear infinite;
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
    // 新增：TFT 游戏模式（匹配/排位）
    const [tftMode, setTftMode] = useState<TFTMode>(TFTMode.NORMAL);
    // 新增：日志模式（简略/详细）
    const [logMode, setLogMode] = useState<LogMode>(LogMode.SIMPLE);
    // 新增：管理员权限状态（null 表示还在检测中）
    const [isElevated, setIsElevated] = useState<boolean | null>(null);
    // 新增："本局结束后停止"状态
    const [stopAfterGame, setStopAfterGame] = useState(false);
    // 新增：是否有选中的阵容（针对当前赛季）
    const [hasSelectedLineup, setHasSelectedLineup] = useState(false);
    // 新增：统计数据（本次会话局数、历史总局数、运行时长）
    const [statistics, setStatistics] = useState<GameStatistics>(settingsStore.getStatistics());
    // 新增：格式化后的运行时长文本
    const [elapsedTime, setElapsedTime] = useState('00:00:00');

    /**
     * 检查指定模式对应的赛季是否有已选中的阵容
     * @param mode 当前 TFT 模式
     * @description 根据 mode 确定赛季（S16/S4），获取该赛季的阵容列表，
     *              然后检查 selectedIds 与该赛季阵容 ID 是否有交集
     */
    const checkHasSelectedLineup = async (mode: TFTMode) => {
        try {
            // 根据模式确定赛季字符串
            const season = (mode === TFTMode.S4_RUISHOU) ? 'S4' : 'S16';
            
            // 并行获取该赛季的阵容列表和已选中的 ID
            const [seasonLineups, selectedIds] = await Promise.all([
                window.lineup.getAll(season),
                window.lineup.getSelectedIds(),
            ]);
            
            if (!seasonLineups || !selectedIds || selectedIds.length === 0) {
                setHasSelectedLineup(false);
                return;
            }
            
            // 检查是否有交集：selectedIds 中是否有属于当前赛季的阵容
            const seasonIds = new Set(seasonLineups.map((l: any) => l.id));
            const hasSelection = selectedIds.some((id: string) => seasonIds.has(id));
            setHasSelectedLineup(hasSelection);
        } catch (error) {
            console.error('检查阵容选中状态失败:', error);
            setHasSelectedLineup(false);
        }
    };

    /**
     * 获取召唤师信息的函数
     * 只有在 LCU 已连接时才会调用
     * 支持重试机制，最多重试 3 次
     */
    const fetchSummonerInfo = async (retryCount = 0) => {
        const maxRetries = 3;
        const retryDelay = 1000; // 1秒后重试
        
        setIsLoading(true);
        try {
            const result = await window.lcu.getSummonerInfo();
            if (result.data) {
                setSummonerInfo(result.data);
                setIsLoading(false);
            } else if (result.error) {
                console.warn('获取召唤师信息失败:', result.error);
                // 失败时重试
                if (retryCount < maxRetries) {
                    console.log(`⏳ 将在 ${retryDelay/1000}s 后重试 (${retryCount + 1}/${maxRetries})...`);
                    setTimeout(() => fetchSummonerInfo(retryCount + 1), retryDelay);
                } else {
                    setIsLoading(false); // 重试次数用尽
                }
            }
        } catch (error) {
            console.error('获取召唤师信息异常:', error);
            // 异常时也重试
            if (retryCount < maxRetries) {
                console.log(`⏳ 将在 ${retryDelay/1000}s 后重试 (${retryCount + 1}/${maxRetries})...`);
                setTimeout(() => fetchSummonerInfo(retryCount + 1), retryDelay);
            } else {
                setIsLoading(false); // 重试次数用尽
            }
        }
    };

    // 组件挂载时：检查连接状态 + 监听连接/断开事件 + 获取运行状态
    useEffect(() => {
        // 1. 先检查当前是否已经连接
        const checkInitialStatus = async () => {
            // 特殊日期彩蛋！8月21日，这意味着什么？也许只有他知道。
            const today = new Date();
            if (today.getMonth() === 7 && today.getDate() === 21) {
                // getMonth() 返回 0-11，所以 8 月是 7
                toast('Today is a special day!', { type: 'info' });
            }
            
            // 检测管理员权限
            const elevated = await window.util.isElevated();
            setIsElevated(elevated);
            
            // 获取 LCU 连接状态
            const connected = await window.lcu.getConnectionStatus();
            setIsLcuConnected(connected);
            
            // 获取 HexService 运行状态（页面切换回来时恢复正确状态）
            const running = await window.hex.getStatus();
            setIsRunning(running);

            // 获取 TFT 游戏模式（支持所有赛季模式）
            const mode = await window.lineup.getTftMode();
            const currentMode = Object.values(TFTMode).includes(mode as TFTMode) 
                ? mode as TFTMode 
                : TFTMode.NORMAL;
            setTftMode(currentMode);

            // 获取日志模式
            const savedLogMode = await window.lineup.getLogMode();
            if (savedLogMode === LogMode.SIMPLE || savedLogMode === LogMode.DETAILED) {
                setLogMode(savedLogMode as LogMode);
            }

            // 检查当前赛季是否有选中的阵容
            await checkHasSelectedLineup(currentMode);

            // 初始化统计数据
            await settingsStore.refreshStatistics();
            setStatistics(settingsStore.getStatistics());
            
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

    // 订阅统计数据变化 + 运行时长计时器
    useEffect(() => {
        // 订阅 settingsStore 的变化，实时更新统计数据
        const unsubscribe = settingsStore.subscribe(() => {
            setStatistics(settingsStore.getStatistics());
        });

        return () => unsubscribe();
    }, []);

    /**
     * 将秒数格式化为 HH:MM:SS
     * @param totalSeconds 总秒数
     */
    const formatElapsed = useCallback((totalSeconds: number): string => {
        const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(totalSeconds % 60).padStart(2, '0');
        return `${h}:${m}:${s}`;
    }, []);

    // 每秒更新运行时长显示
    useEffect(() => {
        // 立即用 store 中的快照更新一次
        setElapsedTime(formatElapsed(statistics.sessionElapsedSeconds));

        // 只有正在运行时才启动计时器（轮询后端获取实时秒数）
        if (!isRunning) return;

        const timer = setInterval(async () => {
            try {
                const stats = await window.stats.getStatistics();
                setElapsedTime(formatElapsed(stats.sessionElapsedSeconds));
            } catch {
                // 忽略，下次再试
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isRunning, statistics.sessionElapsedSeconds, formatElapsed]);
    
    // 监听快捷键触发的挂机切换事件（主进程已完成 start/stop，这里只同步 UI 状态）
    useEffect(() => {
        const cleanup = window.hex.onToggleTriggered((newRunningState: boolean) => {
            console.log('🎮 [HomePage] 收到快捷键切换事件，新状态:', newRunningState);
            setIsRunning(newRunningState);
            
            // 显示提示
            if (newRunningState) {
                toast.success('海克斯科技启动!');
            } else {
                toast.success('海克斯科技已关闭!');
                // 停止时清除"本局结束后停止"状态
                setStopAfterGame(false);
            }
        });
        
        return () => cleanup();
    }, []);
    
    // 监听快捷键触发的"本局结束后停止"切换事件
    useEffect(() => {
        const cleanup = window.hex.onStopAfterGameTriggered((newState: boolean) => {
            console.log('🎮 [HomePage] 收到"本局结束后停止"切换事件，新状态:', newState);
            setStopAfterGame(newState);
            
            // 显示提示
            if (newState) {
                toast.info('对局结束后自动停止挂机');
            } else {
                toast.info('已取消对局结束后停止');
            }
        });
        
        return () => cleanup();
    }, []);

    const handleToggle = async () => {
        // 未连接客户端时禁止操作
        if (!isLcuConnected) {
            return;
        }

        // 需要阵容的模式下，实时检查当前赛季是否有选中阵容
        if (needsLineup) {
            await checkHasSelectedLineup(tftMode);
            // 检查后如果仍然没有选中阵容，阻止操作
            // 注意：这里用最新的 state 值无法直接获取（因为 setState 是异步的）
            // 所以我们直接再做一次内联检查
            const season = (tftMode === TFTMode.S4_RUISHOU) ? 'S4' : 'S16';
            const [seasonLineups, selectedIds] = await Promise.all([
                window.lineup.getAll(season),
                window.lineup.getSelectedIds(),
            ]);
            const seasonIds = new Set((seasonLineups || []).map((l: any) => l.id));
            const hasSelection = (selectedIds || []).some((id: string) => seasonIds.has(id));
            
            if (!hasSelection) {
                const seasonName = tftMode === TFTMode.S4_RUISHOU ? '瑞兽闹新春' : '英雄联盟传奇';
                toast.error(`请先在阵容页面选择至少一个【${seasonName}】阵容！`);
                setHasSelectedLineup(false);
                return;
            }
        }
        
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
     * 切换赛季模式（S16 / S4 瑞兽 / 发条鸟）
     *
     * 交互说明：
     * - 上层胶囊：选择赛季（S16 / S4 / 发条鸟）
     * - S16 选中时，下方显示匹配/排位子选择器
     * - S4 和发条鸟只支持匹配，切换时自动设置对应模式
     * - 运行中禁止切换
     */
    const handleSeasonChange = async (season: 'S16' | 'S4' | 'CLOCKWORK') => {
        if (isRunning) {
            toast.error('运行中无法切换模式');
            return;
        }

        let newMode: TFTMode;
        let toastMsg: string;

        switch (season) {
            case 'S16':
                // 切回 S16 时，默认用匹配模式（如果之前已经在 S16 的排位则保持）
                newMode = (tftMode === TFTMode.RANK) ? TFTMode.RANK : TFTMode.NORMAL;
                toastMsg = '已切换到 S16 英雄联盟传奇';
                break;
            case 'S4':
                newMode = TFTMode.S4_RUISHOU;
                toastMsg = '已切换到 S4 瑞兽闹新春';
                break;
            case 'CLOCKWORK':
                newMode = TFTMode.CLOCKWORK_TRAILS;
                toastMsg = '已切换到发条鸟的试炼';
                break;
        }

        if (newMode === tftMode) return;

        setTftMode(newMode);
        await window.lineup.setTftMode(newMode);
        // 切换模式后重新检查对应赛季是否有选中阵容
        await checkHasSelectedLineup(newMode);
        toast.success(toastMsg);
    };

    /**
     * S16 模式下切换匹配/排位
     */
    const handleS16SubModeChange = async (isRank: boolean) => {
        const newMode = isRank ? TFTMode.RANK : TFTMode.NORMAL;
        if (newMode === tftMode) return;

        if (isRunning) {
            toast.error('运行中无法切换模式');
            return;
        }

        setTftMode(newMode);
        await window.lineup.setTftMode(newMode);
        toast.success(isRank ? '已切换到排位模式' : '已切换到匹配模式');
    };

    /**
     * 获取当前赛季对应的索引（用于上层胶囊滑块位置）
     * 0=S16, 1=S4, 2=发条鸟
     */
    const getSeasonIndex = (): number => {
        switch (tftMode) {
            case TFTMode.NORMAL:
            case TFTMode.RANK:
                return 0; // S16
            case TFTMode.S4_RUISHOU:
                return 1; // S4
            case TFTMode.CLOCKWORK_TRAILS:
                return 2; // 发条鸟
            default:
                return 0;
        }
    };

    /** 当前是否处于 S16 赛季（显示匹配/排位子选择器） */
    const isS16Season = tftMode === TFTMode.NORMAL || tftMode === TFTMode.RANK;

    /** 当前模式是否需要选择阵容（发条鸟不需要，其他都需要） */
    const needsLineup = tftMode !== TFTMode.CLOCKWORK_TRAILS;

    /**
     * 切换日志模式（简略/详细）
     *
     * 交互说明：
     * - 简略模式：不打印 debug 级别日志，日志更简洁
     * - 详细模式：打印所有日志（包括 debug），方便调试
     */
    const handleLogModeToggle = async () => {
        const newMode = logMode === LogMode.SIMPLE ? LogMode.DETAILED : LogMode.SIMPLE;
        setLogMode(newMode);
        await window.lineup.setLogMode(newMode);
        toast.success(newMode === LogMode.DETAILED ? '已切换到详细日志模式' : '已切换到简略日志模式');
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
            {/* 召唤师信息区域 - 三列布局：左侧控制 | 中间头像 | 右侧统计 */}
            <SummonerSection>
                {isLoading ? (
                    <LoadingPlaceholder>
                        <span>正在获取召唤师信息...</span>
                    </LoadingPlaceholder>
                ) : !isLcuConnected ? (
                    // 未连接 LOL 客户端时的提示 - 海克斯科技风格
                    <LoadingPlaceholder>
                        <ProjectTitle>TFT-Hextech-Helper</ProjectTitle>
                        
                        <AppIconContainer>
                            <RadarCircle />
                            <RadarCircleInner />
                            <AppIconImage src={appIconUrl} alt="App Icon" />
                        </AppIconContainer>
                        
                        {/* 未检测到管理员权限时显示警告 */}
                        {isElevated === false && (
                            <AdminWarningBanner>
                                <WarningAmberIcon style={{ fontSize: '1rem' }} />
                                请以管理员模式运行本软件！(╯°□°)╯︵ ┻━┻
                            </AdminWarningBanner>
                        )}
                    </LoadingPlaceholder>
                ) : summonerInfo ? (
                    <>
                        {/* ===== 左侧：控制面板（模式选择 + 日志等级） ===== */}
                        <LeftControlPanel>
                            <PanelSectionTitle>模式选择</PanelSectionTitle>
                            <ModeToggleContainer>
                                <ModeTogglePill>
                                    <ModeToggleIndicator $modeIndex={getSeasonIndex()} />
                                    <ModeToggleTextRow>
                                        <ModeToggleLabel
                                            $active={isS16Season}
                                            onClick={() => handleSeasonChange('S16')}
                                            title="S16 英雄联盟传奇"
                                        >
                                            英雄联盟传奇
                                        </ModeToggleLabel>
                                        <ModeToggleLabel
                                            $active={tftMode === TFTMode.S4_RUISHOU}
                                            onClick={() => handleSeasonChange('S4')}
                                            title="S4 回归赛季: 瑞兽闹新春"
                                        >
                                            瑞兽闹新春
                                        </ModeToggleLabel>
                                        <ModeToggleLabel
                                            $active={tftMode === TFTMode.CLOCKWORK_TRAILS}
                                            onClick={() => handleSeasonChange('CLOCKWORK')}
                                            title="发条鸟的试炼"
                                        >
                                            发条鸟的试炼
                                        </ModeToggleLabel>
                                    </ModeToggleTextRow>
                                </ModeTogglePill>

                                {/* S16 子模式选择 匹配/排位（仅 S16 赛季时显示） */}
                                {isS16Season && (
                                    <SubModeTogglePill>
                                        <SubModeToggleIndicator $isRank={tftMode === TFTMode.RANK} />
                                        <SubModeToggleTextRow>
                                            <SubModeToggleLabel
                                                $active={tftMode === TFTMode.NORMAL}
                                                onClick={() => handleS16SubModeChange(false)}
                                                title="匹配模式"
                                            >
                                                匹配
                                            </SubModeToggleLabel>
                                            <SubModeToggleLabel
                                                $active={tftMode === TFTMode.RANK}
                                                onClick={() => handleS16SubModeChange(true)}
                                                title="排位模式"
                                            >
                                                排位
                                            </SubModeToggleLabel>
                                        </SubModeToggleTextRow>
                                    </SubModeTogglePill>
                                )}
                            </ModeToggleContainer>

                            <PanelSectionTitle>日志等级</PanelSectionTitle>
                            <LogModeTogglePill
                                type="button"
                                $isDetailed={logMode === LogMode.DETAILED}
                                onClick={handleLogModeToggle}
                                title={logMode === LogMode.DETAILED ? '当前：详细（点击切换到简略）' : '当前：简略（点击切换到详细）'}
                            >
                                <LogModeToggleIndicator $isDetailed={logMode === LogMode.DETAILED} />
                                <LogModeToggleTextRow>
                                    <LogModeToggleLabel $active={logMode === LogMode.SIMPLE}>简略</LogModeToggleLabel>
                                    <LogModeToggleLabel $active={logMode === LogMode.DETAILED}>详细</LogModeToggleLabel>
                                </LogModeToggleTextRow>
                            </LogModeTogglePill>
                        </LeftControlPanel>

                        {/* ===== 中间：头像 + 名字 ===== */}
                        <AvatarColumn>
                            <AvatarContainer>
                                {/* SVG 经验条环 */}
                                <ExpRing viewBox="0 0 100 100">
                                    <ExpRingBackground cx="50" cy="50" r="46" />
                                    <ExpRingProgress cx="50" cy="50" r="46" $percent={summonerInfo.percentCompleteForNextLevel} />
                                </ExpRing>
                                {/* 头像图片 */}
                                <AvatarWrapper>
                                    <AvatarImage
                                        src={getAvatarUrl(summonerInfo.profileIconId)}
                                        alt="召唤师头像"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = getAvatarUrl(29);
                                        }}
                                    />
                                </AvatarWrapper>
                                {/* 等级徽章 */}
                                <LevelBadge>Lv.{summonerInfo.summonerLevel}</LevelBadge>
                                {/* hover 详情浮窗 */}
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
                            <SummonerNameContainer>
                                <SummonerName>{summonerInfo.gameName}</SummonerName>
                            </SummonerNameContainer>
                        </AvatarColumn>

                        {/* ===== 右侧：统计面板 ===== */}
                        <StatsPanel>
                            <PanelSectionTitle>挂机统计</PanelSectionTitle>
                            <StatsCard>
                                <StatsItem>
                                    <StatsIcon>
                                        <SportsEsportsIcon />
                                    </StatsIcon>
                                    <StatsTextGroup>
                                        <StatsLabel>本次挂机</StatsLabel>
                                        <StatsValue>{statistics.sessionGamesPlayed} 局</StatsValue>
                                    </StatsTextGroup>
                                </StatsItem>
                                <StatsItem>
                                    <StatsIcon $color="#10B981">
                                        <EmojiEventsIcon />
                                    </StatsIcon>
                                    <StatsTextGroup>
                                        <StatsLabel>累计挂机</StatsLabel>
                                        <StatsValue>{statistics.totalGamesPlayed} 局</StatsValue>
                                    </StatsTextGroup>
                                </StatsItem>
                                <StatsItem>
                                    <StatsIcon $color="#F59E0B">
                                        <AccessTimeIcon />
                                    </StatsIcon>
                                    <StatsTextGroup>
                                        <StatsLabel>运行时长</StatsLabel>
                                        <StatsValue>{elapsedTime}</StatsValue>
                                    </StatsTextGroup>
                                </StatsItem>
                            </StatsCard>
                        </StatsPanel>
                    </>
                ) : (
                    <LoadingPlaceholder>
                        <span>未能获取召唤师信息</span>
                        <span>请确保已登录游戏客户端</span>
                    </LoadingPlaceholder>
                )}
            </SummonerSection>
            
            {/* "本局结束后停止"状态提示 */}
            {stopAfterGame && (
                <StopAfterGameBanner>
                    <TimerOffIcon style={{ fontSize: '1rem' }} />
                    对局结束后自动停止挂机
                </StopAfterGameBanner>
            )}

            {/* 控制按钮区域 - 仅包含开始/停止按钮 */}
            <ControlRow>
                <ButtonWrapper>
                    <ControlButton 
                        onClick={handleToggle} 
                        $isRunning={isRunning}
                        $disabled={!isLcuConnected || (needsLineup && !hasSelectedLineup)}
                    >
                        {!isLcuConnected ? (
                            <>
                                <BlockIcon />
                                未检测到客户端
                            </>
                        ) : (needsLineup && !hasSelectedLineup) ? (
                            <>
                                <BlockIcon />
                                未选择{tftMode === TFTMode.S4_RUISHOU ? '瑞兽' : '云顶'}阵容
                            </>
                        ) : isRunning ? (
                            <>
                                <StopCircleOutlinedIcon />
                                关闭
                            </>
                        ) : (
                            <>
                                <PlayCircleOutlineIcon />
                                开始
                            </>
                        )}
                    </ControlButton>
                </ButtonWrapper>
            </ControlRow>

            {/* 日志面板 */}
            <LogPanel isVisible={true} />
        </PageWrapper>
    );
};

