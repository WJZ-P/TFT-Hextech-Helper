import React, {useState, useEffect} from 'react';
import styled, { keyframes } from 'styled-components';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined';
import BlockIcon from '@mui/icons-material/Block';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import {ThemeType} from "../../styles/theme.ts";
import {LogPanel} from "../LogPanel.tsx";
import {toast} from "../toast/toast-core.ts";
import {SummonerInfo} from "../../../src-backend/lcu/utils/LCUProtocols.ts";
import {TFTMode} from "../../../src-backend/TFTProtocol.ts";
import {LogMode} from "../../../src-backend/types/AppTypes.ts";

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
const SummonerSection = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: ${props => props.theme.spacing.large};
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
// 游戏模式切换样式
// ============================================

/** 模式切换容器 - 相对定位，让标题可以绝对定位在上方 */
const ModeToggleContainer = styled.div<{ theme: ThemeType }>`
  position: relative;
`;

/** 模式切换小标题 - 绝对定位浮在胶囊上方 */
const ModeToggleTitle = styled.span<{ theme: ThemeType }>`
  position: absolute;
  bottom: calc(100% + 4px);  /* 浮在容器上方 */
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.theme.colors.textSecondary};
  letter-spacing: 2.5px;
  white-space: nowrap;
`;

/**
 * 模式切换容器（三选一：匹配/排位/发条鸟）
 *
 * 设计目标：
 * - 三栏分段按钮，点击对应选项切换到该模式
 * - 圆角完全裁切，解决边缘"白边没包住"的问题（关键是 overflow: hidden）
 * - 滑块指示器会根据当前选中项平滑移动
 */
const ModeTogglePill = styled.div<{ theme: ThemeType }>`
  appearance: none;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.elementBg};
  border-radius: 32px;
  padding: 4px;
  height: 36px;
  width: 192px; /* 三选一需要更宽 */
  display: inline-flex;
  align-items: center;
  position: relative;
  overflow: hidden; /* 关键：让内部滑块与背景都被圆角裁切 */
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 5px 11px rgba(0, 0, 0, 0.22);
  }
`;

/**
 * 滑块指示器（内部移动的那一块）
 * $modeIndex: 0=匹配, 1=排位, 2=发条鸟
 * 
 * 计算逻辑：
 * - 三等分，每份宽度为 (总宽度 - 4px内边距) / 3
 * - 滑块宽度 = calc(33.33% - 2px)
 * - 位置 = index * 33.33% + 2px 偏移
 */
const ModeToggleIndicator = styled.div<{ theme: ThemeType; $modeIndex: number }>`
  position: absolute;
  top: 2px;
  /* 根据选中的模式索引计算 left 位置 */
  left: ${props => {
    // 计算每个选项的宽度百分比（三等分）
    const percent = 33.33;
    // 根据索引计算位置，加上初始偏移
    return `calc(${props.$modeIndex * percent}% + 2px)`;
  }};
  width: calc(33.33% - 3px); /* 三等分减去间隙 */
  height: calc(100% - 4px);
  border-radius: 999px;
  /* 根据模式显示不同颜色：匹配=主色, 排位=警告色, 发条鸟=紫色 */
  background: ${props => {
    switch (props.$modeIndex) {
      case 1: // 排位 - 橙色警告色
        return `linear-gradient(135deg, ${props.theme.colors.warning} 0%, ${props.theme.colors.warning}cc 100%)`;
      case 2: // 发条鸟 - 紫色
        return `linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)`;
      default: // 匹配 - 主色
        return `linear-gradient(135deg, ${props.theme.colors.primary} 0%, ${props.theme.colors.primaryHover} 100%)`;
    }
  }};
  transition: left 0.22s ease, background 0.22s ease;
`;

/** 文本层（在滑块之上），三栏 grid 布局 */
const ModeToggleTextRow = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr; /* 三等分 */
  align-items: center;
`;

/** 单个文本标签（可点击切换） */
const ModeToggleLabel = styled.button<{ theme: ThemeType; $active: boolean }>`
  background: none;
  border: none;
  padding: 0;
  font-size: 0.75rem; /* 稍微小一点适应三栏 */
  font-weight: 800;
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
// 日志模式切换样式（左侧）
// ============================================

/** 日志模式切换容器 - 相对定位，让标题可以绝对定位在上方 */
const LogModeToggleContainer = styled.div<{ theme: ThemeType }>`
  position: relative;
`;

/** 日志模式切换小标题 - 绝对定位浮在胶囊上方 */
const LogModeToggleTitle = styled.span<{ theme: ThemeType }>`
  position: absolute;
  bottom: calc(100% + 4px);  /* 浮在容器上方 */
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.theme.colors.textSecondary};
  letter-spacing: 2.5px;
  white-space: nowrap;
`;

/** 日志模式切换开关 */
const LogModeTogglePill = styled.button<{ theme: ThemeType; $isDetailed: boolean }>`
  appearance: none;
  border: 1px solid ${props => props.theme.colors.border};
  background: ${props => props.theme.colors.elementBg};
  border-radius: 32px;
  padding: 4px;
  height: 36px;
  width: 128px;
  display: inline-flex;
  align-items: center;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    box-shadow: 0 5px 11px rgba(0, 0, 0, 0.22);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 3px solid ${props => props.theme.colors.primary}80;
    outline-offset: 2px;
  }
`;

/** 日志模式滑块指示器 - 配色与模式选择统一 */
const LogModeToggleIndicator = styled.div<{ theme: ThemeType; $isDetailed: boolean }>`
  position: absolute;
  top: 2px;
  left: ${props => props.$isDetailed ? 'calc(50% + 2px)' : '2px'};
  width: calc(50% - 4px);
  height: calc(100% - 4px);
  border-radius: 999px;
  /* 简略用蓝色，详细用橙色（与模式选择的匹配/排位配色一致） */
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
  font-weight: 800;
  text-align: center;
  letter-spacing: 1px;
  color: ${props => props.$active ? props.theme.colors.textOnPrimary : props.theme.colors.textSecondary};
  transition: color 0.25s ease;
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
 * - 左右两侧使用 space-between 分布在两端
 * - 这样无论左右组件宽度如何，中间按钮始终居中
 */
const ControlRow = styled.div`
  display: flex;
  align-items: center;  /* 垂直居中对齐 */
  justify-content: space-between;  /* 左右两端分布 */
  position: relative;  /* 为中间按钮的绝对定位提供参照 */
  width: 100%;
  padding: 0 20px;  /* 左右留白 */
  min-height: 60px;  /* 最小高度，确保绝对定位的按钮有空间 */
`;

/** 按钮水纹外层容器 - 绝对定位保持居中 */
const ButtonWrapper = styled.div`
  /* 绝对定位，始终保持水平居中 */
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  
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
    // 新增：是否有选中的阵容
    const [hasSelectedLineup, setHasSelectedLineup] = useState(false);

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

            // 获取 TFT 游戏模式（匹配/排位/发条鸟）
            const mode = await window.lineup.getTftMode();
            if (mode === TFTMode.RANK || mode === TFTMode.NORMAL || mode === TFTMode.CLOCKWORK_TRAILS) {
                setTftMode(mode as TFTMode);
            }

            // 获取日志模式
            const savedLogMode = await window.lineup.getLogMode();
            if (savedLogMode === LogMode.SIMPLE || savedLogMode === LogMode.DETAILED) {
                setLogMode(savedLogMode as LogMode);
            }

            // 检查是否有选中的阵容
            const selectedIds = await window.lineup.getSelectedIds();
            setHasSelectedLineup(selectedIds && selectedIds.length > 0);
            
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

        // 未选择阵容时禁止操作
        if (!hasSelectedLineup) {
            toast.error('请先在阵容页面选择至少一个阵容！');
            return;
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
     * 切换 TFT 游戏模式（匹配/排位/发条鸟）
     *
     * 交互说明：
     * - 点击对应的模式标签切换到该模式
     * - 运行中禁止切换，避免队列创建与实际期望不一致
     * 
     * @param newMode - 要切换到的新模式
     */
    const handleModeChange = async (newMode: TFTMode) => {
        // 如果点击的是当前模式，不做任何操作
        if (newMode === tftMode) {
            return;
        }

        if (isRunning) {
            toast.error('运行中无法切换模式');
            return;
        }

        setTftMode(newMode);
        await window.lineup.setTftMode(newMode);
        
        // 根据模式显示不同的提示
        const modeNames: Record<TFTMode, string> = {
            [TFTMode.NORMAL]: '匹配模式',
            [TFTMode.RANK]: '排位模式',
            [TFTMode.CLOCKWORK_TRAILS]: '发条鸟的试炼',
            [TFTMode.CLASSIC]: '经典模式', // 不会用到，但类型完整性需要
        };
        toast.success(`已切换到${modeNames[newMode]}`);
    };

    /**
     * 获取当前模式对应的索引（用于滑块位置计算）
     * 0=匹配, 1=排位, 2=发条鸟
     */
    const getModeIndex = (mode: TFTMode): number => {
        switch (mode) {
            case TFTMode.NORMAL:
                return 0;
            case TFTMode.RANK:
                return 1;
            case TFTMode.CLOCKWORK_TRAILS:
                return 2;
            default:
                return 0;
        }
    };

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
            {/* 召唤师信息区域 */}
            <SummonerSection>
                {isLoading ? (
                    <LoadingPlaceholder>
                        <span>正在获取召唤师信息...</span>
                    </LoadingPlaceholder>
                ) : !isLcuConnected ? (
                    // 新增：未连接 LOL 客户端时的提示 - 海克斯科技风格
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
            
            {/* "本局结束后停止"状态提示 - 在召唤师区域下方显示 */}
            {stopAfterGame && (
                <StopAfterGameBanner>
                    <TimerOffIcon style={{ fontSize: '1rem' }} />
                    对局结束后自动停止挂机
                </StopAfterGameBanner>
            )}

            {/* 控制区域 - Flexbox 水平排列 */}
            <ControlRow>
                {/* 日志模式切换 - 简略/详细（左侧） */}
                <LogModeToggleContainer>
                    <LogModeToggleTitle>日志模式</LogModeToggleTitle>
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
                </LogModeToggleContainer>

                {/* 控制按钮 - 带水纹效果 */}
                <ButtonWrapper>
                    <ControlButton 
                        onClick={handleToggle} 
                        $isRunning={isRunning}
                        $disabled={!isLcuConnected || !hasSelectedLineup}
                    >
                        {!isLcuConnected ? (
                            <>
                                <BlockIcon />
                                未检测到客户端
                            </>
                        ) : !hasSelectedLineup ? (
                            <>
                                <BlockIcon />
                                未选择阵容
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

                {/* 游戏模式切换 - 匹配/排位/发条鸟（右侧） */}
                <ModeToggleContainer>
                    <ModeToggleTitle>模式选择</ModeToggleTitle>
                    <ModeTogglePill
                        title={`当前模式：${tftMode === TFTMode.NORMAL ? '匹配' : tftMode === TFTMode.RANK ? '排位' : '发条鸟'}`}
                    >
                        {/* 滑块指示器 - 根据当前模式索引定位 */}
                        <ModeToggleIndicator $modeIndex={getModeIndex(tftMode)} />
                        {/* 三个可点击的模式标签 */}
                        <ModeToggleTextRow>
                            <ModeToggleLabel 
                                $active={tftMode === TFTMode.NORMAL}
                                onClick={() => handleModeChange(TFTMode.NORMAL)}
                                title="匹配模式"
                            >
                                匹配
                            </ModeToggleLabel>
                            <ModeToggleLabel 
                                $active={tftMode === TFTMode.RANK}
                                onClick={() => handleModeChange(TFTMode.RANK)}
                                title="排位模式"
                            >
                                排位
                            </ModeToggleLabel>
                            <ModeToggleLabel 
                                $active={tftMode === TFTMode.CLOCKWORK_TRAILS}
                                onClick={() => handleModeChange(TFTMode.CLOCKWORK_TRAILS)}
                                title="发条鸟的试炼"
                            >
                                发条鸟
                            </ModeToggleLabel>
                        </ModeToggleTextRow>
                    </ModeTogglePill>
                </ModeToggleContainer>
            </ControlRow>

            {/* 日志面板 */}
            <LogPanel isVisible={true} />
        </PageWrapper>
    );
};

