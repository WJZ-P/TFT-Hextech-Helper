/**
 * 阵容搭配页面
 * @description 展示和管理 TFT 阵容配置，仿 OP.GG 风格
 */

import React, {useEffect, useState, useCallback, useMemo, useRef} from 'react';
import styled from 'styled-components';
import {ThemeType} from '../../styles/theme';
import {TFTEquip, TraitData, TFTUnit, getChessDataBySeason, getEquipDataBySeason, UNPURCHASABLE_CHESS} from "../../../src-backend/TFTProtocol";
// 导入两个赛季的棋子数据，用于获取英雄原画 ID
import {TFT_16_CHESS} from "../../../public/TFTInfo/S16/chess";
import {TFT_4_CHESS} from "../../../public/TFTInfo/S4/chess";
import {TFT_16_TRAIT_DATA} from "../../../src-backend/TFTInfo/trait.ts";
import {TFT_4_TRAIT_DATA} from "../../../src-backend/TFTInfo/trait.ts";
import {toast} from "../toast/toast-core.ts";

// ==================== 类型定义 ====================

/**
 * 自定义阵容中单个格子的数据结构
 * name: 棋子中文名
 * equips: 该棋子携带的装备名称数组（最多 3 个）
 */
interface ChampionSlot {
    name: string;
    equips: string[];
}

/**
 * 根据 equipId 拼接腾讯 CDN 的装备图标 URL
 * @param equipId 装备 ID（如 "91842"）
 * @returns 装备图标的完整 URL
 */
const getEquipIconUrl = (equipId: string): string =>
    `https://game.gtimg.cn/images/lol/act/img/tft/equip/${equipId}.png`;

/**
 * 棋子配置（从后端获取）
 */
interface ChampionConfig {
    name: string;           // 中文名
    isCore: boolean;        // 是否核心棋子
    items?: {
        core: TFTEquip[];       // 核心装备
        alternatives?: TFTEquip[];
    };
}

/**
 * 阶段配置
 */
interface StageConfig {
    champions: ChampionConfig[];
    tips?: string;
}

/**
 * 完整阵容配置（从后端获取）
 */
interface LineupConfig {
    id: string;
    name: string;
    finalComp?: StageConfig; // 最终成型阵容
    stages: {
        level4?: StageConfig;
        level5?: StageConfig;
        level6?: StageConfig;
        level7?: StageConfig;
        level8: StageConfig;
        level9?: StageConfig;
        level10?: StageConfig;
    };
}

// ==================== 常量 ====================

/** 赛季选项卡类型 */
type SeasonTab = 'S16' | 'S4';

/** 赛季 Tab 配置 */
const SEASON_TABS: { key: SeasonTab; label: string }[] = [
    { key: 'S16', label: '英雄联盟传奇' },
    { key: 'S4', label: '瑞兽闹新春' },
];

/**
 * OP.GG 头像 API 基础 URL
 * 将 {englishId} 替换为英雄英文ID即可获取头像
 */
const OPGG_AVATAR_BASE_S16 = 'https://c-tft-api.op.gg/img/set/16/tft-champion/tiles/{englishId}.tft_set16.png?image=q_auto:good,f_webp&v=1765176243';
const OPGG_AVATAR_BASE_S4 = 'https://c-tft-api.op.gg/img/set/4.5/tft-champion/tiles/{englishId}.tft_set4.5.png?image=q_auto:good,f_webp&v=1765176243';

/**
 * 羁绊图标 API 基础 URL
 */
const TRAIT_ICON_BASE = 'https://game.gtimg.cn/images/lol/act/img/tft';

/**
 * 英雄原画 API 基础 URL
 * 将 {chessId} 替换为英雄的 chessId 即可获取原画
 */
const SPLASH_ART_BASE_S16 = 'https://game.gtimg.cn/images/lol/tftstore/s16/624x318/{chessId}.jpg';
const SPLASH_ART_BASE_S4 = 'https://game.gtimg.cn/images/lol/tftstore/s4/624x318/{chessId}.jpg';

/**
 * 兜底 URL：当 OP.GG 的 CDN 资源不可用时（如老赛季数据缺失），使用腾讯 CDN 兜底
 * 
 * 头像兜底：使用腾讯 TFT 棋子头像接口，URL 末尾是 chessId（如 100170.png）
 * 原画兜底：使用 s4.5m16 路径下的原画资源
 */
const FALLBACK_AVATAR_BASE = 'https://game.gtimg.cn/images/lol/act/img/tft/champions/{chessId}.png';
const FALLBACK_SPLASH_ART_BASE = 'https://game.gtimg.cn/images/lol/tftstore/s4.5m16/624x318/{chessId}.jpg';

// ==================== 样式组件 ====================

const PageWrapper = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  padding: ${props => props.theme.spacing.large};
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.text};
  height: 100%;
  overflow-y: auto;
`;

// 阵容卡片容器（垂直列表布局）
const LineupsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
`;

/** 阵容分栏标题（如 "自定义阵容"、"默认阵容"） */
const SectionLabel = styled.div<{ theme: ThemeType }>`
  font-size: 1.2rem;
  font-weight: 700;
  color: ${props => props.theme.colors.textSecondary};
  padding: 4px 2px;
  border-bottom: 2px solid ${props => props.theme.colors.border};
  margin-bottom: -4px;
`;

// 单个阵容卡片 - 仿 OP.GG 风格
const LineupCard = styled.div<{ theme: ThemeType; $expanded?: boolean; $selected?: boolean }>`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  background-color: ${props => props.$selected 
    ? 'rgba(59, 130, 246, 0.1)'
    : props.theme.colors.cardBg};
  border: 1.5px solid ${props => props.$selected 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: ${props => props.$expanded 
    ? `${props.theme.borderRadius} ${props.theme.borderRadius} 0 0` 
    : props.theme.borderRadius};
  padding: ${props => props.theme.spacing.small};
  cursor: pointer;
  transition: all 0.2s ease-in-out;

  /* 未展开时，单独的 hover 效果 */
  ${props => !props.$expanded && `
    &:hover {
      border-color: ${props.theme.colors.primary};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `}
`;

// 卡片头部：阵容名称和箭头在同一行
const CardHeader = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: ${props => props.theme.spacing.small};
  padding-right: ${props => props.theme.spacing.medium};
`;

/** 删除阵容按钮（仅玩家自建阵容显示） */
const DeleteLineupBtn = styled.button<{ theme: ThemeType }>`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  font-size: 1.5rem;
  padding: 4px 6px;
  border-radius: 4px;
  opacity: 0.8;
  transition: all 0.15s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    opacity: 1;
    color: #ef4444;
    background: rgba(239, 68, 68, 0.1);
  }
`;

// ==================== 删除确认弹窗样式 ====================

/** 删除确认弹窗容器（小型居中弹窗） */
const ConfirmDialog = styled.div<{ theme: ThemeType }>`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  padding: 24px;
  width: 360px;
  max-width: 90vw;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

/** 确认弹窗标题（带红色警告图标） */
const ConfirmTitle = styled.div`
  font-size: 1.05rem;
  font-weight: 700;
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 8px;
`;

/** 确认弹窗描述文本 */
const ConfirmMessage = styled.p<{ theme: ThemeType }>`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.5;
  margin: 0;
  word-break: break-all;
`;

/** 确认弹窗中高亮的阵容名称 */
const ConfirmName = styled.span`
  font-weight: 700;
  color: #ef4444;
`;

/** 确认弹窗按钮行 */
const ConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

/** 确认弹窗通用按钮 */
const ConfirmBtn = styled.button<{ theme: ThemeType; $danger?: boolean }>`
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: 1px solid ${props => props.$danger ? '#ef4444' : props.theme.colors.border};
  background: ${props => props.$danger ? '#ef4444' : props.theme.colors.elementBg};
  color: ${props => props.$danger ? '#fff' : props.theme.colors.text};
  &:hover {
    background: ${props => props.$danger ? '#dc2626' : props.theme.colors.border};
  }
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

// 箭头图标（展开/收起指示器）
const Arrow = styled.span<{ $expanded: boolean }>`
  display: inline-block;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 16px;
  transition: transform 0.2s ease;
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

// 选择复选框容器（加大点击区域）
const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 12px;
  margin: -8px;
  flex-shrink: 0;
  cursor: pointer;
`;

// 自定义复选框样式
const Checkbox = styled.div<{ $checked: boolean; theme: ThemeType }>`
  width: 24px;
  height: 24px;
  border: 2px solid ${props => props.$checked 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: 4px;
  background-color: ${props => props.$checked 
    ? props.theme.colors.primary 
    : 'transparent'};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }

  /* 选中时显示勾号 */
  &::after {
    content: '✓';
    color: white;
    font-size: 14px;
    font-weight: bold;
    opacity: ${props => props.$checked ? 1 : 0};
    transition: opacity 0.2s ease;
  }
`;

// ==================== 赛季选项卡样式 ====================

/** 赛季选项卡容器 */
const SeasonTabContainer = styled.div`
  display: flex ;
  flex-direction: row ;
  margin-bottom: ${props => props.theme.spacing.medium};
  background-color: ${props => props.theme.colors.cardBg};
  border: 1.5px solid ${props => props.theme.colors.border};
  border-radius: 10px;
  overflow: hidden;
  min-height: 45px;
`;

/** 单个赛季选项卡 */
const SeasonTabItem = styled.button<{ $active: boolean; theme: ThemeType }>`
  flex: 1;
  padding: 10px 24px;
  font-size: 17px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
  background-color: ${props => props.$active 
    ? props.theme.colors.primary 
    : 'transparent'};
  color: ${props => props.$active 
    ? '#ffffff' 
    : props.theme.colors.textSecondary};

  &:hover {
    background-color: ${props => props.$active 
      ? props.theme.colors.primary 
      : props.theme.colors.elementHover};
  }

  /* 选项卡之间的分隔线 */
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: 0;
    top: 20%;
    height: 60%;
    width: 1px;
    background-color: ${props => props.$active ? 'transparent' : props.theme.colors.border};
  }
`;

// 选中状态提示栏（常驻显示）
const SelectionInfo = styled.div<{ $hasSelection: boolean; theme: ThemeType }>`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: ${props => props.theme.colors.cardBg};
  border: 1.5px solid ${props => props.$hasSelection 
    ? props.theme.colors.primary 
    : props.theme.colors.border};
  border-radius: 8px;
  margin-bottom: ${props => props.theme.spacing.medium};
  transition: border-color 0.2s ease;
`;

const SelectionText = styled.span<{ $hasSelection: boolean; theme: ThemeType }>`
  color: ${props => props.$hasSelection 
    ? props.theme.colors.text 
    : props.theme.colors.textSecondary};
  font-size: 16px;
`;

// 当前阵容名称高亮（使用黑色，更醒目）
const LineupName = styled.strong`
  color: #000000;
`;

// 选择操作按钮容器
const SelectionActions = styled.div`
  margin-left: auto;
  display: flex;
  gap: 8px;
`;

// 操作按钮样式
const ActionButton = styled.button<{ theme: ThemeType }>`
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 800;
  border: none;
  border-radius: 4px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.85;
  }
`;

// 内容容器（包裹羁绊列表和英雄列表）
const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  justify-content: center;
`;

// 羁绊列表容器
const TraitsListContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
`;

// 单个羁绊项
const TraitItem = styled.div<{ $active: boolean; theme: ThemeType }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 2px 4px;
  border-radius: 12px;
  
  /* 背景颜色：激活时不透明，未激活时 40% 透明度 */
  background-color: ${props => props.$active 
    ? props.theme.colors.traitActiveFull 
    : props.theme.colors.traitActiveInactive};

  /* 边框：与背景同色 */
  border: 1px solid ${props => props.$active 
    ? props.theme.colors.traitActiveFull 
    : props.theme.colors.traitActiveInactive};
    
  /* 文字颜色：统一白色，加阴影保证对比度 */
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);

  /* 阴影（仅激活时） */
  box-shadow: ${props => props.$active ? '0 2px 4px rgba(0, 0, 0, 0.25)' : 'none'};
  
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    /* Hover 时：激活态保持不变，未激活态增加到 60% 不透明度 */
    background-color: ${props => props.$active 
      ? props.theme.colors.traitActiveFull 
      : props.theme.colors.traitActiveHover};
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
  }
`;

// 羁绊图标
const TraitIcon = styled.img`
  width: 17px;
  height: 17px;
  object-fit: contain;
  /* 如果是黑色图标可能需要反色，视具体资源而定，先不做处理 */
`;

// 羁绊数量（大号字体突出显示）
const TraitCount = styled.span`
  font-size: 14px;
  color: #fff;
  font-weight: bold;
  line-height: 18px;
`;

// 羁绊名称（小号字体）
const TraitName = styled.span`
  font-size: 11px;
  color: #fff;
  font-weight: bold;
  line-height: 18px;
`;

// 英雄头像列表容器
const ChampionsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: flex-end;
  /* flex: 1;  移交给 ContentWrapper */
`;

// 单个英雄容器（包含头像和名字）- 使用相对定位作为悬浮框的锚点
// 添加 perspective 为子元素提供 3D 透视效果
// 关键：hover 时提升 z-index，确保悬浮框不被其他头像遮挡
const ChampionItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;  /* 作为悬浮框的定位参考 */
  perspective: 100px;  /* 透视距离，数值越小 3D 效果越明显 */
  z-index: 1;  /* 默认层级 */
  
  &:hover {
    z-index: 100;  /* hover 时提升层级，确保悬浮框在最上层 */
  }
`;

// 英雄原画悬浮框容器
// $showBelow: 当顶部空间不足时，改为在下方显示
// $horizontalOffset: 水平偏移量（px），用于左右边界检测后的位置调整
const SplashArtTooltip = styled.div<{ $visible: boolean; $showBelow: boolean; $horizontalOffset: number }>`
  position: absolute;
  z-index: 1000;
  
  /* 水平定位：默认居中，根据 $horizontalOffset 进行偏移调整 */
  left: 50%;
  transform: translateX(calc(-50% + ${props => props.$horizontalOffset}px));
  
  /* 根据 $showBelow 决定显示在上方还是下方 */
  ${props => props.$showBelow ? `
    top: 100%;
    margin-top: 8px;
  ` : `
    bottom: 100%;
    margin-bottom: 8px;
  `}
  
  /* 显示/隐藏动画 */
  opacity: ${props => props.$visible ? 1 : 0};
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};
  transition: opacity 0.2s ease, visibility 0.2s ease;
  
  /* 防止鼠标移到悬浮框上时触发 mouseleave */
  pointer-events: none;
`;

// 原画图片容器（带圆角和阴影）
const SplashArtContainer = styled.div`
  position: relative;  /* 作为名字和渐变蒙版的定位参考 */
  width: ${624*0.7}px;   /* 原图 624px 的一半 */
  height: ${318*0.7}px;  /* 原图 318px 的一半 */
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.2);
  background-color: ${props => props.theme.colors.elementBg};
`;

// 原画图片
const SplashArtImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

// 原画底部渐变蒙版 + 英雄名字容器
const SplashArtOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 20%;  /* 渐变覆盖底部 50% 区域 */
  /* 从透明到半透明黑色的渐变 */
  background: linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.5) 100%);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
`;

// 原画中的英雄名字
const SplashArtName = styled.span`
  color: #ffffff;
  font-size: 16px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
`;

// 英雄头像容器 - 带边框和星级标记
// 添加 3D 倾斜效果相关样式
const ChampionAvatar = styled.div<{ $isCore: boolean; $cost?: number; $rotateX?: number; $rotateY?: number }>`
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  /* 核心棋子用金色边框，普通棋子用灰色边框 */
  /* isCore 暂时不作为边框颜色判断依据，保留参数备用 */
  /* border: 2px solid ${props => props.$isCore ? '#FFD700' : props.theme.colors.border}; */
  
  /* 根据英雄费用显示不同颜色的边框 */
  border: 2.5px solid ${props => {
      const cost = props.$cost;
      // @ts-ignore
      const color = props.theme.colors.championCost[cost];
      return color || props.theme.colors.championCost.default;
  }};
  
  background-color: ${props => props.theme.colors.elementBg};

  /* 核心棋子添加发光效果 */
  ${props => props.$isCore && `
    box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
  `}
  
  /* 3D 倾斜效果 */
  transform-style: preserve-3d;  /* 保持子元素的 3D 变换 */
  transform: rotateX(${props => props.$rotateX || 0}deg) rotateY(${props => props.$rotateY || 0}deg);
  transition: transform 0.1s ease-out, box-shadow 0.2s ease;  /* 平滑过渡 */
  
  /* Hover 时添加阴影增强立体感 */
  &:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
  }
`;

// 英雄头像图片
const AvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

/**
 * 内嵌在 ChampionAvatar 底部的装备图标行
 * - absolute 定位贴近头像底部
 * - 半透明黑底，让图标在各种头像上都清晰可见
 */
const AvatarEquipRow = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 1px;
  padding: 1px 0;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: none;
  z-index: 1;
`;

/** 内嵌装备小图标（18x18） */
const AvatarEquipIcon = styled.img`
  width: 18px;
  height: 18px;
  border-radius: 2px;
  opacity: 0.95;
`;

// 英雄名字
const ChampionName = styled.span`
  font-size: 13px;
  font-weight: 800;
  color: ${props => props.theme.colors.textSecondary};
  text-align: center;
  max-width: 64px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

// ==================== 展开面板样式 ====================

// 阵容卡片容器（包含主卡片和展开面板）
// 展开后整体都有 hover 效果，保持视觉统一
const LineupCardWrapper = styled.div<{ $expanded: boolean; theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  border-radius: ${props => props.theme.borderRadius};
  transition: all 0.2s ease-in-out;

  /* 展开状态下，整个容器有 hover 效果 */
  ${props => props.$expanded && `
    &:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    &:hover > div {
      border-color: ${props.theme.colors.primary};
    }
  `}
`;

// 展开面板容器
const ExpandPanel = styled.div<{ $expanded: boolean; theme: ThemeType }>`
  overflow: hidden;
  max-height: ${props => props.$expanded ? '1000px' : '0'};
  opacity: ${props => props.$expanded ? 1 : 0};
  transition: all 0.3s ease-in-out;
  background-color: ${props => props.theme.colors.cardBg};
  border: 1.5px solid ${props => props.theme.colors.border};
  border-top: none;
  border-radius: 0 0 ${props => props.theme.borderRadius} ${props => props.theme.borderRadius};
  margin-top: -2px;
`;

// 单个等级行
const LevelRow = styled.div<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  padding: ${props => props.theme.spacing.small};
  border-bottom: 1px solid ${props => props.theme.colors.border};

  &:last-child {
    border-bottom: none;
  }
`;

// 等级标签
const LevelLabel = styled.div<{ theme: ThemeType }>`
  min-width: 60px;
  padding: 4px 8px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  font-size: 14px;
  font-weight: 800;
  border-radius: 4px;
  text-align: center;
  margin-right: ${props => props.theme.spacing.medium};
`;

// 等级对应的英雄列表（小尺寸版本）
const LevelChampionsList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  flex: 1;
`;

// 小尺寸英雄头像容器
const SmallChampionAvatar = styled.div<{ $cost?: number; theme: ThemeType }>`
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  border: 2px solid ${props => {
    const cost = props.$cost;
    // @ts-ignore
    const color = props.theme.colors.championCost[cost];
    return color || props.theme.colors.championCost.default;
  }};
  background-color: ${props => props.theme.colors.elementBg};
`;

// 小尺寸头像图片
const SmallAvatarImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

// 占位提示
const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.large};
  color: ${props => props.theme.colors.textSecondary};
  text-align: center;
`;

// ==================== 创建阵容弹窗样式 ====================

/** 弹窗遮罩层 */
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.55);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/** 弹窗主体 */
const ModalContent = styled.div<{ theme: ThemeType }>`
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 12px;
  width: 90%;
  height: 90%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  position: relative; /* 装备浮窗绝对定位的参照容器 */
`;

/** 弹窗顶部栏 */
const ModalHeader = styled.div<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  flex-shrink: 0;
`;

/** 弹窗标题 */
const ModalTitle = styled.h2<{ theme: ThemeType }>`
  font-size: 1.1rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin: 0;
`;

/** 关闭按钮 */
const ModalCloseBtn = styled.button<{ theme: ThemeType }>`
  background: none;
  border: none;
  font-size: 1.4rem;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s ease;
  &:hover {
    background: ${props => props.theme.colors.elementHover};
    color: ${props => props.theme.colors.text};
  }
`;

/** 弹窗主体区域：左右两栏 */
const ModalBody = styled.div<{ $isDragging?: boolean }>`
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
  /* 拖拽分割线时禁止文本选中，避免拖拽过程中选中一堆文字 */
  user-select: ${props => props.$isDragging ? 'none' : 'auto'};
`;

// ---------- 左侧：棋子面板 ----------

/** 左侧棋子选择面板（宽度由可拖拽分割线控制） */
const ChessPool = styled.div<{ theme: ThemeType; $width: number }>`
  width: ${props => props.$width}px;
  flex-shrink: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

/**
 * 可拖拽的分割线
 * 用于调整左侧棋子池和右侧阵容编辑区的宽度比例
 * $isDragging: 拖拽中时加粗高亮，给用户明确的操作反馈
 */
const SplitDivider = styled.div<{ theme: ThemeType; $isDragging: boolean }>`
  width: 4px;
  flex-shrink: 0;
  cursor: col-resize;
  background: ${props => props.$isDragging
    ? props.theme.colors.primary
    : props.theme.colors.border};
  transition: background 0.15s ease;
  &:hover {
    background: ${props => props.theme.colors.primary};
  }
`;

/** 费用分组标题（如 "1 费"） */
const CostGroupTitle = styled.div<{ theme: ThemeType; $cost: number }>`
  font-size: 0.8rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  color: white;
  display: inline-block;
  width: fit-content;
  margin-bottom: 16px;
  background: ${props => {
    // 不同费用不同颜色（和 OP.GG 风格一致）
    switch (props.$cost) {
      case 1: return '#9ca3af';
      case 2: return '#22c55e';
      case 3: return '#3b82f6';
      case 4: return '#a855f7';
      case 5: return '#eab308';
      case 6: return '#ef4444';
      case 7: return '#f97316';
      default: return props.theme.colors.textSecondary;
    }
  }};
`;

/** 费用分组内的棋子网格 */
const CostGroupGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

/** 单个可拖拽的棋子（左侧池子中） */
const DraggableChess = styled.div<{ theme: ThemeType; $cost: number }>`
  width: 48px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  cursor: grab;
  border: 2px solid ${props => {
    switch (props.$cost) {
      case 1: return '#9ca3af';
      case 2: return '#22c55e';
      case 3: return '#3b82f6';
      case 4: return '#a855f7';
      case 5: return '#eab308';
      case 6: return '#ef4444';
      case 7: return '#f97316';
      default: return props.theme.colors.border;
    }
  }};
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  position: relative;

  &:hover {
    transform: scale(1.12);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    z-index: 2;
  }

  &:active {
    cursor: grabbing;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    pointer-events: none;
  }
`;

/** 棋子名称提示（小字） */
const ChessName = styled.div<{ theme: ThemeType }>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  font-size: 0.55rem;
  text-align: center;
  background: rgba(0,0,0,0.6);
  color: white;
  line-height: 1.3;
  padding: 1px 0;
  pointer-events: none;
`;

// ---------- 右侧：阵容编辑面板 ----------

/** 右侧阵容编辑区域 */
const LineupEditor = styled.div<{ theme: ThemeType }>`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

/** 阵容名称输入区域 */
const LineupNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
`;

/** 阵容名称输入框 */
const LineupNameInput = styled.input<{ theme: ThemeType }>`
  flex: 1;
  padding: 6px 10px;
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 6px;
  background: ${props => props.theme.colors.elementBg};
  color: ${props => props.theme.colors.text};
  font-size: 0.9rem;
  font-weight: 600;
  outline: none;
  transition: border-color 0.2s ease;
  &:focus {
    border-color: ${props => props.theme.colors.primary};
  }
  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
    font-weight: 400;
  }
`;

/** 单个等级行 */
const LevelEditRow = styled.div<{ theme: ThemeType; $required: boolean }>`
  display: flex;
  /* stretch：让左右两侧的 RowSideWrapper 自动拉满行高 */
  align-items: stretch;
  gap: 8px;
  padding: 8px 8px;
  border-radius: 8px;
  background: ${props => props.theme.colors.cardBg};
  border: 1px solid ${props => props.theme.colors.border};
`;

/**
 * 等级行左右两侧的包裹容器
 * - align-self: stretch 继承父行高度（由中间 SlotContainer 撑开）
 * - 内部 flex + align-items: center 让子元素（标签/按钮）始终垂直居中
 */
const RowSideWrapper = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

/** 等级标签（如 "Lv.4"）—— 创建阵容弹窗中使用 */
const EditLevelLabel = styled.div<{ theme: ThemeType; $required: boolean }>`
  font-size: 0.8rem;
  font-weight: 700;
  color: ${props => props.$required ? props.theme.colors.primary : props.theme.colors.textSecondary};
  min-width: 38px;
  flex-shrink: 0;
  text-align: center;
`;

/** 等级行内的格子容器 */
const SlotContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 1;
  /* 防止同行某个格子带装备时，其他格子被 stretch 拉伸到相同高度 */
  align-items: flex-start;
`;

/** "应用至下一行"按钮 */
const ApplyNextBtn = styled.button<{ theme: ThemeType }>`
  flex-shrink: 0;
  padding: 4px 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.theme.colors.primary};
  background: transparent;
  border: 1px solid ${props => props.theme.colors.primary};
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s ease;
  &:hover {
    background: ${props => `${props.theme.colors.primary}15`};
  }
`;

/** 
 * 单个格子（空位或已放置棋子）
 * $isDragOver: 正在被拖拽经过时高亮
 */
const ChessSlot = styled.div<{ theme: ThemeType; $isDragOver?: boolean; $cost?: number }>`
  width: 64px;
  min-height: 64px;
  border-radius: 4px;
  border: 2px dashed ${props => {
    if (props.$isDragOver) return props.theme.colors.primary;
    if (props.$cost) {
      switch (props.$cost) {
        case 1: return '#9ca3af';
        case 2: return '#22c55e';
        case 3: return '#3b82f6';
        case 4: return '#a855f7';
        case 5: return '#eab308';
        case 6: return '#ef4444';
        case 7: return '#f97316';
      }
    }
    return props.theme.colors.border;
  }};
  ${props => props.$cost && `border-style: solid;`}
  background: ${props => props.$isDragOver
    ? `${props.theme.colors.primary}15`
    : props.theme.colors.elementBg};
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    background: ${props => `${props.theme.colors.primary}10`};
  }
`;

/** 空格子里的 + 号（需要撑满 48px 高度并居中） */
const SlotPlus = styled.span<{ theme: ThemeType }>`
  font-size: 1.2rem;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 300;
  pointer-events: none;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

/** 已放置棋子上的删除按钮 */
const SlotRemoveBtn = styled.div<{ theme: ThemeType }>`
  position: absolute;
  top: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ef4444;
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 3;

  ${ChessSlot}:hover & {
    opacity: 1;
  }
`;

/** 弹窗底部操作栏 */
const ModalFooter = styled.div<{ theme: ThemeType }>`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid ${props => props.theme.colors.border};
  flex-shrink: 0;
`;

/** 通用弹窗按钮 */
const ModalBtn = styled.button<{ theme: ThemeType; $primary?: boolean }>`
  padding: 6px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  border: 1px solid ${props => props.$primary ? 'transparent' : props.theme.colors.border};
  border-radius: 6px;
  background: ${props => props.$primary ? props.theme.colors.primary : props.theme.colors.elementBg};
  color: ${props => props.$primary ? 'white' : props.theme.colors.text};
  cursor: pointer;
  transition: all 0.15s ease;
  &:hover {
    opacity: 0.85;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

// ==================== 装备小图标（格子内） ====================

/** 棋子头像（固定 48x48 正方形） */
const SlotAvatar = styled.img`
  width: 64px;
  height: 64px;
  object-fit: cover;
  pointer-events: none;
  display: block;
`;

/** 头像下方的装备图标行（仅有装备时渲染） */
const SlotEquipIcons = styled.div`
  display: flex;
  justify-content: center;
  pointer-events: none;
`;

/** 单个装备小图标（14x14） */
const SlotEquipIcon = styled.img<{ theme: ThemeType }>`
  width: 20px;
  height: 20px;
  border-radius: 1px;
`;

// ==================== 装备选择浮窗样式 ====================

/** 装备浮窗遮罩（嵌套在创建阵容弹窗之上） */
const EquipModalOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
`;

/** 装备浮窗主体（宽度 90%，高度自适应内容，最大不超过 90%） */
const EquipModalContent = styled.div<{ theme: ThemeType }>`
  position: relative;
  width: 60%;
  max-height: 90%;
  background: ${props => props.theme.colors.background};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  overflow: hidden;
`;

/** 装备浮窗上方：英雄头像 + 装备槽 */
const EquipTopSection = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  gap: 12px;
  border-bottom: 2px solid ${props => props.theme.colors.border};
  flex-shrink: 0;
`;

/** 圆形英雄头像容器，边框颜色跟随棋子费用 */
const EquipHeroAvatar = styled.div<{ theme: ThemeType; $cost: number }>`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 3px solid ${props => {
    switch (props.$cost) {
      case 1: return '#9ca3af';
      case 2: return '#22c55e';
      case 3: return '#3b82f6';
      case 4: return '#a855f7';
      case 5: return '#eab308';
      case 6: return '#ef4444';
      case 7: return '#f97316';
      default: return props.theme.colors.primary;
    }
  }};
  overflow: hidden;
  flex-shrink: 0;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

/** 英雄名字 */
const EquipHeroName = styled.div<{ theme: ThemeType }>`
  font-size: 1.25rem;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
`;

/** 装备槽容器（3 个槽） */
const EquipSlotsRow = styled.div`
  display: flex;
  gap: 8px;
`;

/** 单个装备槽（空或已填充） */
const EquipSlotBox = styled.div<{ theme: ThemeType; $hasEquip: boolean }>`
  width: 48px;
  height: 48px;
  border: 2px ${props => props.$hasEquip ? 'solid' : 'dashed'} ${props =>
    props.$hasEquip ? props.theme.colors.primary : props.theme.colors.border};
  border-radius: 6px;
  background: ${props => props.theme.colors.elementBg};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${props => props.$hasEquip ? 'pointer' : 'default'};
  transition: all 0.15s ease;
  overflow: hidden;
  position: relative;
  &:hover {
    border-color: ${props => props.theme.colors.primary};
  }
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

/** 装备槽的空位占位 + 号 */
const EquipSlotPlus = styled.span<{ theme: ThemeType }>`
  font-size: 1rem;
  color: ${props => props.theme.colors.textSecondary};
  font-weight: 300;
`;

/** 装备浮窗下方：装备列表区域 */
const EquipBottomSection = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

/** 装备分类标题 */
const EquipCategoryTitle = styled.div<{ theme: ThemeType }>`
  font-size: 1rem;
  font-weight: 700;
  color: ${props => props.theme.colors.textSecondary};
  padding: 2px 0;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  margin-bottom: 4px;
`;

/** 装备网格 */
const EquipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

/** 单个装备项（图标 + 底部名称） */
const EquipItem = styled.div<{ theme: ThemeType }>`
  width: 64px;
  border-radius: 4px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.15s ease;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: scale(1.08);
  }
  img {
    width: 64px;
    height: 64px;
    object-fit: cover;
    display: block;
  }
`;

/** 装备名称标签（显示在图标下方） */
const EquipItemName = styled.div<{ theme: ThemeType }>`
  width: 100%;
  font-size: 0.8rem;
  text-align: center;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  line-height: 1.3;
  padding: 1px 2px;
  word-break: break-all;
  overflow-wrap: break-word;
  border-radius: 0 0 4px 4px;
`;

/** 装备浮窗关闭按钮（放在右上角） */
const EquipCloseBtn = styled.button<{ theme: ThemeType }>`
  position: absolute;
  top: 8px;
  right: 12px;
  background: none;
  border: none;
  font-size: 1.2rem;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  z-index: 1;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s ease;
  &:hover {
    background: ${props => props.theme.colors.elementHover};
    color: ${props => props.theme.colors.text};
  }
`;

/** 创建阵容入口按钮 - 使用描边风格以区分主操作 */
const CreateLineupBtn = styled.button<{ theme: ThemeType }>`
  padding: 6px 12px;
  font-size: 14px;
  font-weight: 800;
  border: 1.5px solid ${props => props.theme.colors.primary};
  border-radius: 4px;
  background: transparent;
  color: ${props => props.theme.colors.primary};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.theme.colors.primary};
    color: white;
  }
`;

// 头像加载失败时的占位符
const AvatarPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.theme.colors.elementHover};
  color: ${props => props.theme.colors.textSecondary};
  font-size: 12px;
`;

// ==================== 子组件 ====================

/**
 * 英雄头像组件 Props
 */
interface ChampionAvatarProps {
    champion: ChampionConfig;
    season: SeasonTab;  // 当前赛季，用于查找对应的棋子数据
}

/**
 * 根据中文名和赛季获取英雄的 chessId（数字ID）
 * chessId 存储在 public/TFTInfo 的完整棋子数据中（如 "100170"）
 * 用于构造腾讯 CDN 的图片 URL
 */
const getChessId = (cnName: string, season: SeasonTab): string => {
    const chessList = season === 'S4' ? TFT_4_CHESS : TFT_16_CHESS;
    const chessItem = chessList.find((chess: any) => chess.displayName === cnName);
    return chessItem?.chessId || '';
};

/**
 * 获取头像的兜底 URL（当 OP.GG 主 URL 加载失败时使用）
 * 使用腾讯 CDN：https://game.gtimg.cn/images/lol/act/img/tft/champions/{chessId}.png
 */
const getFallbackAvatarUrl = (cnName: string, season: SeasonTab): string => {
    const chessId = getChessId(cnName, season);
    if (!chessId) return '';
    return FALLBACK_AVATAR_BASE.replace('{chessId}', chessId);
};

/**
 * 获取原画的兜底 URL（当主 URL 加载失败时使用）
 * 使用腾讯 CDN 的 s4.5m16 路径作为备选
 */
const getFallbackSplashUrl = (cnName: string, season: SeasonTab): string => {
    const chessId = getChessId(cnName, season);
    if (!chessId) return '';
    return FALLBACK_SPLASH_ART_BASE.replace('{chessId}', chessId);
};

/**
 * 根据中文名和赛季获取头像 URL
 * @param cnName 棋子中文名
 * @param season 当前赛季标识
 */
const getAvatarUrl = (cnName: string, season: SeasonTab): string => {
    // 根据赛季选择对应的棋子数据集
    const chessData = getChessDataBySeason(season);
    const champion = (chessData as Record<string, TFTUnit>)[cnName];
    if (!champion) {
        console.warn(`未找到英雄 "${cnName}" 的数据 (${season})`);
        return '';
    }
    const englishId = champion.englishId;
    const baseUrl = season === 'S4' ? OPGG_AVATAR_BASE_S4 : OPGG_AVATAR_BASE_S16;
    return baseUrl.replace('{englishId}', englishId);
};

/**
 * 根据中文名和赛季获取英雄原画 URL
 * @param cnName 棋子中文名
 * @param season 当前赛季标识
 */
const getSplashArtUrl = (cnName: string, season: SeasonTab): string => {
    // 根据赛季选择对应的公开 chess 数据（包含 chessId）
    const chessList = season === 'S4' ? TFT_4_CHESS : TFT_16_CHESS;
    const chessItem = chessList.find((chess: any) => chess.displayName === cnName);
    if (!chessItem) {
        console.warn(`未找到英雄 "${cnName}" 的原画数据 (${season})`);
        return '';
    }
    const baseUrl = season === 'S4' ? SPLASH_ART_BASE_S4 : SPLASH_ART_BASE_S16;
    return baseUrl.replace('{chessId}', chessItem.chessId);
};

/**
 * 英雄头像组件
 * 处理图片加载失败的情况，并在 hover 时显示原画
 * 自动检测边界，当顶部空间不足时改为在下方显示，左右超出时自动偏移
 * 添加 3D 倾斜效果：鼠标 hover 时卡片会朝鼠标方向轻微倾斜
 */
const ChampionAvatarComponent: React.FC<ChampionAvatarProps> = ({champion, season}) => {
    const [imgError, setImgError] = useState(false);
    const [useFallbackAvatar, setUseFallbackAvatar] = useState(false);  // 是否已切换到兜底头像
    const [isHovered, setIsHovered] = useState(false);  // hover 状态
    const [splashError, setSplashError] = useState(false);  // 原画加载失败状态
    const [useFallbackSplash, setUseFallbackSplash] = useState(false);  // 是否已切换到兜底原画
    const [showBelow, setShowBelow] = useState(false);  // 是否在下方显示悬浮框
    const [horizontalOffset, setHorizontalOffset] = useState(0);  // 水平偏移量
    
    // 3D 倾斜效果的旋转角度状态
    const [rotateX, setRotateX] = useState(0);  // X 轴旋转（上下倾斜）
    const [rotateY, setRotateY] = useState(0);  // Y 轴旋转（左右倾斜）
    
    // 用于获取元素位置的 ref
    const containerRef = React.useRef<HTMLDivElement>(null);
    // 头像元素的 ref，用于计算鼠标相对位置
    const avatarRef = React.useRef<HTMLDivElement>(null);
    
    const avatarUrl = getAvatarUrl(champion.name, season);
    const fallbackAvatarUrl = getFallbackAvatarUrl(champion.name, season);  // 兜底头像 URL
    const splashArtUrl = getSplashArtUrl(champion.name, season);
    const fallbackSplashUrl = getFallbackSplashUrl(champion.name, season);  // 兜底原画 URL

    // S4 赛季 OP.GG 没有对应资源，直接使用兜底 URL 避免加载失败闪烁
    // S16 正常走：主 URL → 兜底 URL → 占位符
    const isS4 = season === 'S4';
    const currentAvatarUrl = (isS4 || useFallbackAvatar) ? fallbackAvatarUrl : avatarUrl;
    const currentSplashUrl = (isS4 || useFallbackSplash) ? fallbackSplashUrl : splashArtUrl;

    // 获取英雄费用（根据赛季查找对应数据集）
    const chessData = getChessDataBySeason(season);
    const tftUnit = (chessData as Record<string, TFTUnit>)[champion.name];
    const cost = tftUnit ? tftUnit.price : 0;

    /**
     * 头像加载失败的处理：
     * 第一次失败 → 切换到兜底 URL
     * 兜底也失败 → 显示文字占位符
     */
    const handleAvatarError = () => {
        if (!useFallbackAvatar && fallbackAvatarUrl) {
            // 主 URL 失败，切换到兜底
            setUseFallbackAvatar(true);
        } else {
            // 兜底也失败，显示占位符
            setImgError(true);
        }
    };

    /**
     * 原画加载失败的处理：
     * 第一次失败 → 切换到兜底 URL
     * 兜底也失败 → 隐藏原画悬浮框
     */
    const handleSplashError = () => {
        if (!useFallbackSplash && fallbackSplashUrl) {
            setUseFallbackSplash(true);
        } else {
            setSplashError(true);
        }
    };

    /**
     * 鼠标进入时检测边界并显示原画
     * 边界检测基于当前页面容器（PageWrapper），而非整个窗口
     * 这样可以正确处理左侧有 SideBar 的情况
     */
    const handleMouseEnter = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            
            // 悬浮框尺寸
            const tooltipWidth = 624 * 0.7;
            const tooltipHeight = 318 * 0.7;
            
            // 获取页面容器的边界（向上查找最近的 PageWrapper）
            // PageWrapper 有 overflow-y: auto，是实际的滚动容器
            const pageWrapper = containerRef.current.closest('[data-page-wrapper]');
            const containerRect = pageWrapper 
                ? pageWrapper.getBoundingClientRect() 
                : { left: 0, right: window.innerWidth, top: 0 };
            
            // === 垂直边界检测 ===
            // 如果元素顶部距离容器顶部的距离小于悬浮框高度，则在下方显示
            const topSpace = rect.top - containerRect.top;
            setShowBelow(topSpace < tooltipHeight);
            
            // === 水平边界检测（相对于页面容器，而非整个窗口）===
            const elementCenterX = rect.left + rect.width / 2;
            const tooltipLeft = elementCenterX - tooltipWidth / 2;
            const tooltipRight = elementCenterX + tooltipWidth / 2;
            
            let offset = 0;
            const padding = 16;  // 距离容器边缘的安全距离
            
            // 左边界：使用容器的左边界，而非视口左边界
            if (tooltipLeft < containerRect.left + padding) {
                offset = (containerRect.left + padding) - tooltipLeft;
            } 
            // 右边界：使用容器的右边界（或视口右边界，取较小值）
            else if (tooltipRight > containerRect.right - padding) {
                offset = (containerRect.right - padding) - tooltipRight;
            }
            
            setHorizontalOffset(offset);
        }
        setIsHovered(true);
    };

    /**
     * 鼠标在头像上移动时，计算倾斜角度
     * 原理：根据鼠标相对于头像中心的偏移量，计算 X/Y 轴的旋转角度
     */
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!avatarRef.current) return;
        
        const rect = avatarRef.current.getBoundingClientRect();
        
        // 计算鼠标相对于头像中心的偏移（-0.5 到 0.5 的范围）
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // 鼠标位置相对于中心的偏移比例（-0.5 ~ 0.5）
        const offsetX = (e.clientX - centerX) / rect.width;
        const offsetY = (e.clientY - centerY) / rect.height;
        
        // 最大倾斜角度（度）
        const maxTilt = 30;
        
        // 计算旋转角度
        // rotateY: 鼠标在右边时向右转（正值），在左边时向左转（负值）
        // rotateX: 鼠标在上方时向后仰（负值），在下方时向前倾（正值）
        // 注意：rotateX 的方向是反的，所以用负号
        setRotateY(offsetX * maxTilt);
        setRotateX(-offsetY * maxTilt);
    };

    /**
     * 鼠标离开时重置旋转角度
     */
    const handleMouseLeave = () => {
        setIsHovered(false);
        setRotateX(0);
        setRotateY(0);
    };

    return (
        <ChampionItem
            ref={containerRef}
            onMouseEnter={handleMouseEnter}   // 鼠标进入时检测边界并显示原画
            onMouseLeave={handleMouseLeave}   // 鼠标离开时隐藏原画并重置倾斜
            onMouseMove={handleMouseMove}     // 鼠标移动时更新倾斜角度
        >
            {/* 原画悬浮框 - 只有在有原画 URL 且未加载失败时才显示 */}
            {currentSplashUrl && !splashError && (
                <SplashArtTooltip $visible={isHovered} $showBelow={showBelow} $horizontalOffset={horizontalOffset}>
                    <SplashArtContainer>
                        <SplashArtImg
                            src={currentSplashUrl}
                            alt={`${champion.name} 原画`}
                            onError={handleSplashError}
                        />
                        {/* 底部渐变蒙版 + 英雄名字 */}
                        <SplashArtOverlay>
                            <SplashArtName>{champion.name}</SplashArtName>
                        </SplashArtOverlay>
                    </SplashArtContainer>
                </SplashArtTooltip>
            )}
            
            <ChampionAvatar 
                ref={avatarRef}
                $isCore={champion.isCore} 
                $cost={cost}
                $rotateX={rotateX}
                $rotateY={rotateY}
            >
                {!imgError && currentAvatarUrl ? (
                    <AvatarImg
                        src={currentAvatarUrl}
                        alt={champion.name}
                        onError={handleAvatarError}
                        loading="lazy"  // 懒加载优化性能
                    />
                ) : (
                    <AvatarPlaceholder>{champion.name.slice(0, 2)}</AvatarPlaceholder>
                )}
                {/* 装备图标行：仅当英雄有装备时，在头像底部内嵌显示 */}
                {(() => {
                    // 兼容两种数据格式：
                    // 1. 新格式（对象）：items: { core: TFTEquip[], alternatives?: TFTEquip[] }
                    // 2. 旧格式（字符串数组）：items: ["装备中文名", ...]
                    const rawItems = champion.items;
                    if (!rawItems) return null;

                    const equipData = getEquipDataBySeason(season) as Record<string, TFTEquip>;
                    let equipList: TFTEquip[] = [];

                    if (Array.isArray(rawItems)) {
                        // 旧格式：items 是装备名称字符串数组，通过名称查找 TFTEquip 对象
                        equipList = (rawItems as unknown as string[])
                            .map(name => equipData[name])
                            .filter(Boolean);
                    } else if (rawItems.core && Array.isArray(rawItems.core)) {
                        // 新格式：items.core 已经是 TFTEquip 对象数组
                        equipList = rawItems.core;
                    }

                    if (equipList.length === 0) return null;

                    return (
                        <AvatarEquipRow>
                            {equipList.map((equip, eqIdx) => (
                                <AvatarEquipIcon
                                    key={eqIdx}
                                    src={getEquipIconUrl(equip.equipId)}
                                    alt={equip.name}
                                />
                            ))}
                        </AvatarEquipRow>
                    );
                })()}
            </ChampionAvatar>
            <ChampionName>{champion.name}</ChampionName>
        </ChampionItem>
    );
};

/**
 * 小头像组件（用于 stages 展开面板）
 * 支持图片加载失败时自动切换到兜底 URL
 */
const SmallChampionAvatarComponent: React.FC<{
    champion: ChampionConfig;
    season: SeasonTab;
    lineupId: string;
    level: string;
    idx: number;
}> = ({ champion, season, lineupId, level, idx }) => {
    const [useFallback, setUseFallback] = useState(false);
    const [imgError, setImgError] = useState(false);

    const chessData = getChessDataBySeason(season);
    const tftUnit = (chessData as Record<string, TFTUnit>)[champion.name];
    const cost = tftUnit ? tftUnit.price : 0;

    const avatarUrl = getAvatarUrl(champion.name, season);
    const fallbackUrl = getFallbackAvatarUrl(champion.name, season);
    // S4 赛季直接用兜底 URL，避免 OP.GG 加载失败导致闪烁
    const isS4 = season === 'S4';
    const currentUrl = (isS4 || useFallback) ? fallbackUrl : avatarUrl;

    const handleError = () => {
        if (!useFallback && fallbackUrl) {
            setUseFallback(true);
        } else {
            setImgError(true);
        }
    };

    return (
        <SmallChampionAvatar
            key={`${lineupId}-lv${level}-${champion.name}-${idx}`}
            $cost={cost}
            title={champion.name}
        >
            {!imgError && currentUrl && (
                <SmallAvatarImg
                    src={currentUrl}
                    alt={champion.name}
                    loading="lazy"
                    onError={handleError}
                />
            )}
        </SmallChampionAvatar>
    );
};

// ==================== 主组件 ====================

const LineupsPage: React.FC = () => {
    // 阵容列表状态（所有赛季的完整列表）
    const [allLineups, setAllLineups] = useState<LineupConfig[]>([]);
    // 加载状态
    const [loading, setLoading] = useState(true);
    // 当前选中的赛季 Tab
    const [activeTab, setActiveTab] = useState<SeasonTab>('S16');
    // 展开状态：记录每个阵容的展开状态，key 是阵容 id
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    // 已选中的阵容 ID 集合（所有赛季统一存储）
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // 根据当前 Tab 过滤出对应赛季的阵容
    const lineups = allLineups.filter(l => (l as any).season === activeTab);

    // 将阵容分为「自定义」和「默认」两组，自定义阵容显示在上方
    const userLineups = lineups.filter(l => (l as any).isUserCreated);
    const defaultLineups = lineups.filter(l => !(l as any).isUserCreated);

    // 当前 Tab 下已选中的阵容数量
    const currentTabSelectedCount = lineups.filter(l => selectedIds.has(l.id)).length;

    // 切换某个阵容的展开/收起状态
    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // 切换阵容选中状态（自由勾选，不限制数量）
    const toggleSelect = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // 阻止冒泡，避免触发展开
        
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // 获取当前 Tab 下选中的阵容名称（用于单选时显示）
    const getSelectedLineupName = (): string => {
        if (currentTabSelectedCount !== 1) return '';
        const selected = lineups.find(l => selectedIds.has(l.id));
        return selected?.name || '';
    };

    // 全选当前 Tab 的所有阵容
    const selectAll = () => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            lineups.forEach(l => newSet.add(l.id));
            return newSet;
        });
    };

    // 取消当前 Tab 的所有选择（不影响其他赛季的选中状态）
    const clearAll = () => {
        const currentTabIds = new Set(lineups.map(l => l.id));
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            currentTabIds.forEach(id => newSet.delete(id));
            return newSet;
        });
    };

    // ==================== 删除确认弹窗状态 ====================

    /** 待删除的阵容信息，非 null 时弹窗显示 */
    const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

    // ==================== 创建阵容弹窗状态 ====================

    /** 弹窗是否打开 */
    const [showCreateModal, setShowCreateModal] = useState(false);
    /** 自定义阵容名称 */
    const [customLineupName, setCustomLineupName] = useState('');
    /** 
     * 各等级的棋子列表
     * key: 'level4' ~ 'level10'
     * value: ChampionSlot 数组，每个包含棋子名和装备列表
     */
    const [levelChampions, setLevelChampions] = useState<Record<string, ChampionSlot[]>>({
        level4: [], level5: [], level6: [], level7: [],
        level8: [], level9: [], level10: [],
    });
    /** 当前被拖拽经过的格子标识（'level4-0' 格式），用于高亮 */
    const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

    // ==================== 可拖拽分割线状态 ====================

    /** 左侧棋子池宽度（px），默认 400，最小 200，最大 800 */
    const [splitPos, setSplitPos] = useState(400);
    /** 是否正在拖拽分割线 */
    const [isDraggingSplit, setIsDraggingSplit] = useState(false);
    /** 弹窗 ModalBody 的 ref，用于计算分割线拖拽时的相对位置 */
    const modalBodyRef = useRef<HTMLDivElement>(null);

    /**
     * 分割线拖拽逻辑
     * 
     * mousedown 时开始拖拽，监听全局 mousemove/mouseup
     * mousemove 时计算鼠标相对于 ModalBody 左边界的 X 偏移，clamp 在 [200, 800] 区间内
     * mouseup 时结束拖拽，移除监听器
     * 
     * 为什么用 useCallback + 全局事件？
     * 因为拖拽过程中鼠标可能移出分割线甚至移出弹窗，
     * 全局事件能保证即使鼠标移出范围也能持续响应
     */
    const handleSplitMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsDraggingSplit(true);

        const onMouseMove = (ev: MouseEvent) => {
            if (!modalBodyRef.current) return;
            // getBoundingClientRect() 获取元素在视口中的位置
            const rect = modalBodyRef.current.getBoundingClientRect();
            // 鼠标 X 相对于 ModalBody 左边界的距离 = 左侧面板期望宽度
            const newPos = ev.clientX - rect.left;
            // Math.min / Math.max 将值限制在 [200, 800] 范围内
            setSplitPos(Math.min(800, Math.max(200, newPos)));
        };

        const onMouseUp = () => {
            setIsDraggingSplit(false);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }, []);

    // ==================== 装备选择浮窗状态 ====================

    /**
     * 当前正在编辑装备的棋子信息
     * null 表示装备浮窗关闭
     * levelKey + slotIndex 定位到具体哪个格子的棋子
     * cost: 棋子费用，用于头像边框颜色
     */
    const [equipEditTarget, setEquipEditTarget] = useState<{
        levelKey: string;
        slotIndex: number;
        chessName: string;
        cost: number;
    } | null>(null);

    /** 装备浮窗中临时选择的装备（最多 3 个） */
    const [tempEquips, setTempEquips] = useState<string[]>([]);

    /** 等级配置：等级数字、key、是否必填 */
    const LEVEL_CONFIG = [
        { level: 4, key: 'level4', required: true },
        { level: 5, key: 'level5', required: true },
        { level: 6, key: 'level6', required: true },
        { level: 7, key: 'level7', required: true },
        { level: 8, key: 'level8', required: true },
        { level: 9, key: 'level9', required: false },
        { level: 10, key: 'level10', required: false },
    ];

    /**
     * 按费用分组当前赛季的所有棋子
     * useMemo 缓存计算结果，只在 activeTab 变化时重新计算
     * 
     * @returns 二维数组，每项是 [费用, 棋子列表]
     *          棋子列表的每项包含 name（中文名）和 unit（TFTUnit 数据）
     */
    const groupedChessByCost = useMemo(() => {
        const chessData = getChessDataBySeason(activeTab) as Record<string, TFTUnit>;
        // 按费用分组，并过滤掉不可购买的棋子（锻造器、魔像、提伯斯等）
        const groups: Record<number, { name: string; unit: TFTUnit }[]> = {};
        for (const [name, unit] of Object.entries(chessData)) {
            // UNPURCHASABLE_CHESS 集合包含所有不可在商店购买的特殊单位，跳过它们
            if (UNPURCHASABLE_CHESS.has(name)) continue;
            const cost = unit.price;
            if (!groups[cost]) groups[cost] = [];
            groups[cost].push({ name, unit });
        }
        // 按费用排序后返回
        return Object.entries(groups)
            .map(([cost, list]) => [Number(cost), list] as [number, { name: string; unit: TFTUnit }[]])
            .sort((a, b) => a[0] - b[0]);
    }, [activeTab]);

    /** 打开创建阵容弹窗 */
    const openCreateModal = () => {
        // 重置所有状态
        setCustomLineupName('');
        setLevelChampions({
            level4: [], level5: [], level6: [], level7: [],
            level8: [], level9: [], level10: [],
        });
        setDragOverSlot(null);
        setShowCreateModal(true);
    };

    /** 关闭弹窗 */
    const closeCreateModal = () => {
        setShowCreateModal(false);
    };

    /**
     * 拖拽开始：把棋子中文名存入 dataTransfer
     * HTML5 原生拖拽 API：dragstart 事件会在用户开始拖拽元素时触发
     * setData 存储拖拽数据，drop 时通过 getData 取出
     */
    const handleDragStart = useCallback((e: React.DragEvent, chessName: string) => {
        e.dataTransfer.setData('text/plain', chessName);
        e.dataTransfer.effectAllowed = 'copy';
    }, []);

    /**
     * 点击棋子时，自动填充到右侧阵容编辑区的第一个空位
     * 
     * 填充规则：从 level 低 → level 高遍历，同 level 内从左 → 右找空位
     * 找到第一个空位后立即填入并停止遍历
     * 
     * @param chessName 被点击的棋子中文名
     */
    const handleChessClick = useCallback((chessName: string) => {
        setLevelChampions(prev => {
            const next = { ...prev };
            // 按 LEVEL_CONFIG 顺序遍历（level4 → level10）
            for (const { level, key } of LEVEL_CONFIG) {
                const current = next[key];
                // 当前等级还有空位（棋子数 < 格子数）
                if (current.length < level) {
                    next[key] = [...current, { name: chessName, equips: [] }];
                    return next;
                }
            }
            // 所有格子都满了，不做任何操作
            return prev;
        });
    }, []);

    /**
     * 拖拽经过格子：允许放置 + 高亮当前格子
     * preventDefault() 是关键 —— 默认情况下浏览器不允许 drop，
     * 必须在 dragover 事件中调用 preventDefault() 才能触发 drop 事件
     */
    const handleDragOver = useCallback((e: React.DragEvent, slotId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setDragOverSlot(slotId);
    }, []);

    /** 拖拽离开格子：取消高亮 */
    const handleDragLeave = useCallback(() => {
        setDragOverSlot(null);
    }, []);

    /**
     * 放置棋子到格子中
     * @param levelKey 等级 key（如 'level4'）
     * @param slotIndex 格子索引（0-based）
     * @param maxSlots 该等级最大格子数
     */
    const handleDrop = useCallback((e: React.DragEvent, levelKey: string, slotIndex: number, maxSlots: number) => {
        e.preventDefault();
        setDragOverSlot(null);

        const chessName = e.dataTransfer.getData('text/plain');
        if (!chessName) return;

        setLevelChampions(prev => {
            const current = [...prev[levelKey]];
            // 如果格子已有内容，替换（保留空装备）；如果是空位，插入
            if (slotIndex < current.length) {
                // 替换已有格子
                current[slotIndex] = { name: chessName, equips: [] };
            } else {
                // 格子是空的（index >= current.length），在末尾追加
                // 但不能超过最大格子数
                if (current.length < maxSlots) {
                    current.push({ name: chessName, equips: [] });
                }
            }
            return { ...prev, [levelKey]: current };
        });
    }, []);

    /** 从某个等级的某个格子中移除棋子 */
    const removeChampionFromSlot = useCallback((levelKey: string, slotIndex: number) => {
        setLevelChampions(prev => {
            const current = [...prev[levelKey]];
            current.splice(slotIndex, 1);
            return { ...prev, [levelKey]: current };
        });
    }, []);

    /**
     * 将当前等级的阵容复制到下一行
     * 下一行的格子数 = 当前等级 + 1，所以直接浅拷贝当前棋子数组即可
     * （下一行格子更多，多出来的格子自然是空的）
     * 
     * @param currentIndex LEVEL_CONFIG 数组中的索引
     */
    const applyToNextLevel = useCallback((currentIndex: number) => {
        const currentKey = LEVEL_CONFIG[currentIndex].key;
        const nextKey = LEVEL_CONFIG[currentIndex + 1].key;
        setLevelChampions(prev => ({
            ...prev,
            // 深拷贝每个 ChampionSlot，避免两行共享同一个引用
            [nextKey]: prev[currentKey].map(slot => ({ ...slot, equips: [...slot.equips] })),
        }));
    }, []);

    /**
     * 获取棋子头像 URL（用于创建阵容弹窗内）
     * 复用已有的 getAvatarUrl / getFallbackAvatarUrl 函数
     */
    const getChessAvatarForModal = useCallback((chessName: string): string => {
        // S4 赛季 OP.GG 没有资源，直接用兜底
        if (activeTab === 'S4') {
            return getFallbackAvatarUrl(chessName, activeTab);
        }
        return getAvatarUrl(chessName, activeTab) || getFallbackAvatarUrl(chessName, activeTab);
    }, [activeTab]);

    /**
     * 是否允许保存阵容
     * 条件：1) 阵容名不为空  2) 所有必填等级（level4~8）的格子必须全部填满
     * 
     * 每个等级的格子数 = 等级数字本身（如 level4 有 4 个格子）
     * Array.every() —— 检查数组中"每一项"是否都满足条件，全部满足才返回 true
     */
    const canSave = useMemo(() => {
        const hasName = customLineupName.trim().length > 0;
        // 必填等级的棋子数必须 === 等级数字（即格子全满）
        const allRequiredFull = LEVEL_CONFIG
            .filter(cfg => cfg.required)
            .every(cfg => levelChampions[cfg.key]?.length === cfg.level);
        return hasName && allRequiredFull;
    }, [customLineupName, levelChampions]);

    /**
     * 保存自定义阵容
     * 
     * 转换流程（参考 convert-manual-lineup.cjs）：
     * 1. 将前端 ChampionSlot[] 转换为后端 LineupConfig JSON 格式
     * 2. 最高等级的阵容作为 finalComp（包含 items、isCore、starTarget）
     * 3. 其余等级作为 stages（精简格式：仅 name、isCore）
     * 4. 自动计算羁绊信息
     * 5. 调用后端 lineup.save() 持久化到文件系统
     * 6. 刷新前端阵容列表
     */
    const handleSaveCustomLineup = useCallback(async () => {
        try {
            const chessData = getChessDataBySeason(activeTab) as Record<string, TFTUnit>;
            const traitData = activeTab === 'S4' ? TFT_4_TRAIT_DATA : TFT_16_TRAIT_DATA;

            /**
             * 计算一组棋子的羁绊激活信息（与 convert-manual-lineup.cjs 中 calculateTraits 对应）
             * 返回 [{ key, style, numUnits }] 数组
             */
            const computeTraits = (champNames: string[]) => {
                const traitCounts: Record<string, number> = {};
                const unique = new Set<string>();

                champNames.forEach(name => {
                    if (unique.has(name)) return;
                    unique.add(name);
                    const unit = chessData[name];
                    if (unit) {
                        [...(unit.origins || []), ...(unit.classes || [])].forEach(t => {
                            traitCounts[t] = (traitCounts[t] || 0) + 1;
                        });
                    }
                });

                const traits: { key: string; style: number; numUnits: number }[] = [];
                for (const [name, count] of Object.entries(traitCounts)) {
                    const data = traitData[name];
                    if (!data) continue;
                    let style = 0;
                    for (let i = 0; i < data.levels.length; i++) {
                        if (count >= data.levels[i]) style = i + 1;
                    }
                    // key 使用羁绊的 id（英文标识），如 "TFT16_Ionia"
                    traits.push({ key: data.id || name, style, numUnits: count });
                }
                // 按 style 降序、同级按 numUnits 降序
                traits.sort((a, b) => b.style !== a.style ? b.style - a.style : b.numUnits - a.numUnits);
                return traits;
            };

            // 找到用户填写的最高等级，作为 finalComp
            // LEVEL_CONFIG 按等级从低到高排列，倒序遍历找第一个有棋子的
            let finalCompKey = '';
            for (let i = LEVEL_CONFIG.length - 1; i >= 0; i--) {
                const cfg = LEVEL_CONFIG[i];
                if (levelChampions[cfg.key]?.length > 0) {
                    finalCompKey = cfg.key;
                    break;
                }
            }

            /**
             * 转换 finalComp 中的棋子（对应 convertChampionForFinal）
             * - 有装备 → isCore=true，items 为装备名称字符串数组
             * - starTarget 默认 2（核心棋子 3）
             */
            const convertFinal = (slot: ChampionSlot) => {
                const hasEquips = slot.equips.length > 0;
                const result: any = {
                    name: slot.name,
                    isCore: hasEquips,
                    starTarget: hasEquips ? 3 : 2,
                };
                if (hasEquips) {
                    // items 是纯字符串数组，如 ["无尽之刃", "鬼索的狂暴之刃"]
                    result.items = slot.equips;
                }
                return result;
            };

            /**
             * 转换 stages 过渡阵容的棋子（对应 convertChampionForStage）
             * 精简格式：仅 name + isCore
             */
            const convertStage = (slot: ChampionSlot) => ({
                name: slot.name,
                isCore: false,
            });

            // 构建 finalComp
            const finalSlots = levelChampions[finalCompKey] || [];
            const finalComp = {
                champions: finalSlots.map(convertFinal),
                traits: computeTraits(finalSlots.map(s => s.name)),
            };

            // 构建 stages（所有等级都存入，finalComp 对应的等级也保留在 stages 中）
            const stages: Record<string, any> = {};
            for (const cfg of LEVEL_CONFIG) {
                const slots = levelChampions[cfg.key];
                if (!slots || slots.length === 0) continue;
                // finalComp 等级使用完整格式（带装备），其余等级使用精简格式
                const converter = cfg.key === finalCompKey ? convertFinal : convertStage;
                stages[cfg.key] = {
                    champions: slots.map(converter),
                    traits: computeTraits(slots.map(s => s.name)),
                };
            }

            // 组装完整的阵容配置
            const lineupConfig = {
                id: crypto.randomUUID(),    // 生成唯一 ID
                name: customLineupName.trim(),
                season: activeTab,
                isUserCreated: true,
                finalComp,
                stages,
            };

            // 调用后端保存
            await window.lineup.save(lineupConfig);

            // 刷新阵容列表
            const freshLineups = await window.lineup.getAll();
            setAllLineups(freshLineups || []);

            toast.success(`阵容 [${lineupConfig.name}] 保存成功！`);
            closeCreateModal();
        } catch (err: any) {
            console.error('保存阵容失败:', err);
            toast.error(`保存失败: ${err.message || '未知错误'}`);
        }
    }, [customLineupName, activeTab, levelChampions]);

    /**
     * 删除玩家自建阵容
     * @param lineupId 阵容 ID
     * @param lineupName 阵容名称（用于弹窗显示）
     */
    const handleDeleteLineup = useCallback((lineupId: string, lineupName: string) => {
        // 打开确认弹窗，由 confirmDelete 执行真正的删除
        setDeleteTarget({ id: lineupId, name: lineupName });
    }, []);

    /** 确认删除：执行真正的后端删除操作 */
    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return;
        const { id, name } = deleteTarget;
        setDeleteTarget(null);  // 先关闭弹窗

        try {
            const success = await window.lineup.delete(id);
            if (success) {
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
                const freshLineups = await window.lineup.getAll();
                setAllLineups(freshLineups || []);
                toast.success(`阵容 [${name}] 已删除`);
            } else {
                toast.error('删除失败：该阵容不允许删除');
            }
        } catch (err: any) {
            console.error('删除阵容失败:', err);
            toast.error(`删除失败: ${err.message || '未知错误'}`);
        }
    }, [deleteTarget]);

    // ==================== 装备选择浮窗逻辑 ====================

    /**
     * 按类型分组当前赛季的装备数据
     * 
     * 分类规则：
     * - 基础散件：仅限 10 个真正的基础散件（暴风之剑 ~ 金锅锅）
     * - 合成装备：formula 中的两个组件 ID 都属于基础散件集合（即只展示可由散件合成的装备）
     *   纹章、光明装备、奥恩神器等不可由散件直接合成的装备不展示
     */
    const groupedEquips = useMemo(() => {
        const equipData = getEquipDataBySeason(activeTab) as Record<string, TFTEquip>;
        const base: { name: string; equip: TFTEquip }[] = [];
        const completed: { name: string; equip: TFTEquip }[] = [];

        // 基础散件 equipId 集合，用于后续判断合成装备是否可由散件合成
        const BASE_ITEM_IDS = new Set<string>();

        // 基础散件名称白名单（暴风之剑到金锅锅共 10 件）
        const BASE_ITEM_NAMES = new Set([
            '暴风之剑', '反曲之弓', '无用大棒', '女神之泪', '锁子甲',
            '负极斗篷', '巨人腰带', '拳套', '金铲铲', '金锅锅'
        ]);

        // 收集基础散件的 equipId，用于后续判断合成装备的合法性
        for (const [name, equip] of Object.entries(equipData)) {
            if (BASE_ITEM_NAMES.has(name)) {
                BASE_ITEM_IDS.add(equip.equipId);
                base.push({ name, equip });
            }
        }

        // 第二步：筛选合成装备 —— formula 非空且两个组件 ID 都属于基础散件
        for (const [name, equip] of Object.entries(equipData)) {
            if (!equip.formula) continue;
            // formula 格式为 "id1,id2"，按逗号拆分
            const parts = equip.formula.split(',');
            if (parts.length !== 2) continue;
            // 只有两个组件 ID 都是基础散件时才展示（排除纹章等含金铲铲/金锅锅以外特殊ID的装备）
            if (BASE_ITEM_IDS.has(parts[0]) && BASE_ITEM_IDS.has(parts[1])) {
                completed.push({ name, equip });
            }
        }

        return { base, completed };
    }, [activeTab]);

    /**
     * 打开装备选择浮窗
     * 左键点击右侧已放置棋子时触发
     */
    const openEquipModal = useCallback((levelKey: string, slotIndex: number, chessName: string) => {
        // 读取当前棋子已有的装备，作为临时编辑副本
        const currentSlot = levelChampions[levelKey][slotIndex];
        setTempEquips(currentSlot ? [...currentSlot.equips] : []);
        // 从当前赛季棋子数据中查找棋子费用（price），用于头像边框颜色
        const chessData = getChessDataBySeason(activeTab) as Record<string, TFTUnit>;
        const cost = chessData[chessName]?.price ?? 0;
        setEquipEditTarget({ levelKey, slotIndex, chessName, cost });
    }, [levelChampions, activeTab]);

    /**
     * 关闭装备浮窗，将临时选择的装备保存回 levelChampions
     */
    const closeEquipModal = useCallback(() => {
        if (equipEditTarget) {
            const { levelKey, slotIndex } = equipEditTarget;
            setLevelChampions(prev => {
                const current = [...prev[levelKey]];
                if (current[slotIndex]) {
                    current[slotIndex] = { ...current[slotIndex], equips: [...tempEquips] };
                }
                return { ...prev, [levelKey]: current };
            });
        }
        setEquipEditTarget(null);
        setTempEquips([]);
    }, [equipEditTarget, tempEquips]);

    /**
     * 点击装备列表中的装备 → 自动填充到装备槽（最多 3 个）
     */
    const addEquipToSlot = useCallback((equipName: string) => {
        setTempEquips(prev => {
            if (prev.length >= 3) return prev;
            return [...prev, equipName];
        });
    }, []);

    /**
     * 点击（左键或右键）装备槽 → 移除该装备
     */
    const removeEquipFromSlot = useCallback((slotIndex: number) => {
        setTempEquips(prev => {
            const next = [...prev];
            next.splice(slotIndex, 1);
            return next;
        });
    }, []);

    // 组件挂载时从后端加载所有赛季的阵容数据
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 并行获取所有阵容数据和选中状态
                const [lineupsData, savedSelectedIds] = await Promise.all([
                    window.lineup.getAll(),    // 不传 season，获取全部
                    window.lineup.getSelectedIds(),
                ]);
                setAllLineups(lineupsData || []);
                // 恢复之前保存的选中状态
                if (savedSelectedIds && savedSelectedIds.length > 0) {
                    setSelectedIds(new Set(savedSelectedIds));
                }
            } catch (error) {
                console.error('加载数据失败:', error);
                setAllLineups([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // 选中状态变化时，自动保存到本地（跳过初始加载阶段）
    useEffect(() => {
        // loading 为 true 时是初始加载，不保存
        if (loading) return;
        
        // 将 Set 转换为数组保存
        const idsArray = Array.from(selectedIds);
        window.lineup.setSelectedIds(idsArray).catch(err => {
            console.error('保存选中状态失败:', err);
        });
    }, [selectedIds, loading]);

    /**
     * 获取阵容的展示棋子列表
     * 优先显示 finalComp（成型阵容），如果没有则显示最高等级阵容
     */
    const getDisplayChampions = (lineup: LineupConfig): ChampionConfig[] => {
        if (lineup.finalComp) {
            return lineup.finalComp.champions;
        }
        
        const stage =
            lineup.stages.level10 ||
            lineup.stages.level9 ||
            lineup.stages.level8 ||
            lineup.stages.level7 ||
            lineup.stages.level6;
        return stage?.champions || [];
    };

    /**
     * 获取所有可用的等级阵容
     * 返回一个数组，包含 [等级, 英雄列表] 的元组
     */
    const getAvailableLevels = (lineup: LineupConfig): [number, ChampionConfig[]][] => {
        const levels: [number, ChampionConfig[]][] = [];
        const stageKeys: (keyof LineupConfig['stages'])[] = [
            'level4', 'level5', 'level6', 'level7', 'level8', 'level9', 'level10'
        ];
        
        stageKeys.forEach((key) => {
            const stage = lineup.stages[key];
            if (stage && stage.champions.length > 0) {
                const level = parseInt(key.replace('level', ''), 10);
                levels.push([level, stage.champions]);
            }
        });
        
        return levels;
    };

    /**
     * 计算当前阵容的激活羁绊
     * @param champions 棋子列表
     * @param season 当前赛季，用于查找对应的棋子和羁绊数据
     */
    const calculateTraits = (champions: ChampionConfig[], season: SeasonTab) => {
        const traitCounts: Record<string, number> = {};
        const uniqueChamps = new Set<string>();

        // 根据赛季选择对应的棋子数据集
        const chessData = getChessDataBySeason(season);
        // 根据赛季选择对应的羁绊数据集
        const traitData = season === 'S4' ? TFT_4_TRAIT_DATA : TFT_16_TRAIT_DATA;

        champions.forEach(champ => {
            // 同名英雄去重，不重复计算羁绊
            if (uniqueChamps.has(champ.name)) return;
            uniqueChamps.add(champ.name);

            const unitData = (chessData as Record<string, TFTUnit>)[champ.name];
            if (unitData) {
                // 合并 origins 和 classes
                const traits = [...(unitData.origins || []), ...(unitData.classes || [])];
                traits.forEach(traitName => {
                    traitCounts[traitName] = (traitCounts[traitName] || 0) + 1;
                });
            }
        });

        // 转换为数组并排序
        return Object.entries(traitCounts)
            .map(([name, count]) => {
                const data = traitData[name];
                return { name, count, data };
            })
            .filter(item => item.data) // 过滤掉无效羁绊
            .sort((a, b) => {
                // 排序逻辑：
                // 1. 是否激活 (count >= levels[0])
                // 2. 数量降序
                const isActiveA = a.count >= a.data.levels[0];
                const isActiveB = b.count >= b.data.levels[0];
                
                if (isActiveA !== isActiveB) return isActiveA ? -1 : 1;
                return b.count - a.count;
            });
    };

    /**
     * 获取羁绊图标 URL
     */
    const getTraitIconUrl = (trait: TraitData) => {
        return `${TRAIT_ICON_BASE}/${trait.type}/${trait.id}.png`;
    };

    /**
     * 计算创建弹窗中「最高已填充等级」对应的羁绊组
     * 从 level10 往下找，第一个有棋子的等级就是最终阵容
     * 放在 calculateTraits 之后，避免 const 变量初始化前引用报错
     */
    const editorTraits = useMemo(() => {
        const reversedKeys = [...LEVEL_CONFIG].reverse().map(c => c.key);
        let highestChampions: ChampionSlot[] = [];
        for (const key of reversedKeys) {
            const slots = levelChampions[key] || [];
            const filled = slots.filter(s => s && s.name);
            if (filled.length > 0) {
                highestChampions = filled;
                break;
            }
        }
        if (highestChampions.length === 0) return [];
        return calculateTraits(highestChampions as any, activeTab);
    }, [levelChampions, activeTab]);

    // 加载中状态
    if (loading) {
        return (
            <PageWrapper>
                <SelectionInfo $hasSelection={false}>
                    <SelectionText $hasSelection={false}>加载中...</SelectionText>
                </SelectionInfo>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper data-page-wrapper>
            {/* 赛季选项卡 */}
            <SeasonTabContainer>
                {SEASON_TABS.map(tab => (
                    <SeasonTabItem
                        key={tab.key}
                        $active={activeTab === tab.key}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </SeasonTabItem>
                ))}
            </SeasonTabContainer>

            {/* 状态提示栏（只展示当前 Tab 的选中情况） */}
            <SelectionInfo $hasSelection={currentTabSelectedCount > 0}>
                <SelectionText $hasSelection={currentTabSelectedCount > 0}>
                    {currentTabSelectedCount === 0 ? (
                        <>未选择阵容</>
                    ) : currentTabSelectedCount === 1 ? (
                        <>当前阵容：<LineupName>{getSelectedLineupName()}</LineupName></>
                    ) : (
                        <>已勾选 <strong>{currentTabSelectedCount}</strong> 个阵容，将根据开局情况智能选择最终阵容</>
                    )}
                </SelectionText>
                {/* 创建阵容 + 全选/取消按钮 */}
                <SelectionActions>
                    <CreateLineupBtn onClick={openCreateModal}>创建阵容</CreateLineupBtn>
                    {currentTabSelectedCount === lineups.length && lineups.length > 0 ? (
                        <ActionButton onClick={clearAll}>全部取消</ActionButton>
                    ) : (
                        <ActionButton onClick={selectAll}>全部勾选</ActionButton>
                    )}
                </SelectionActions>
            </SelectionInfo>

            {lineups.length > 0 ? (
                <LineupsList>
                    {/* ===== 自定义阵容分栏（仅在有自定义阵容时显示） ===== */}
                    {userLineups.length > 0 && (
                        <>
                            <SectionLabel>自定义阵容（{userLineups.length}）</SectionLabel>
                            {userLineups.map((lineup) => {
                                const champions = getDisplayChampions(lineup);
                                const availableLevels = getAvailableLevels(lineup);
                                const isExpanded = expandedIds.has(lineup.id);
                                const isSelected = selectedIds.has(lineup.id);
                                const activeTraits = calculateTraits(champions, activeTab);
                                
                                return (
                                    <LineupCardWrapper key={lineup.id} $expanded={isExpanded}>
                                        <LineupCard 
                                            $expanded={isExpanded}
                                            $selected={isSelected}
                                            onClick={() => toggleExpand(lineup.id)}
                                        >
                                            <CheckboxWrapper onClick={(e) => toggleSelect(lineup.id, e)}>
                                                <Checkbox $checked={isSelected} />
                                            </CheckboxWrapper>
                                            
                                            <ContentWrapper>
                                                <TraitsListContainer>
                                                    {activeTraits.map((trait, idx) => {
                                                        const isActive = trait.count >= trait.data.levels[0];
                                                        return (
                                                            <TraitItem key={`${lineup.id}-trait-${idx}`} $active={isActive}>
                                                                <TraitIcon src={getTraitIconUrl(trait.data)} alt={trait.name} />
                                                                <TraitCount>{trait.count}</TraitCount>
                                                                <TraitName>{trait.name}</TraitName>
                                                            </TraitItem>
                                                        );
                                                    })}
                                                </TraitsListContainer>

                                                <ChampionsList>
                                                    {champions.map((champion, index) => (
                                                        <ChampionAvatarComponent
                                                            key={`${lineup.id}-${champion.name}-${index}`}
                                                            champion={champion}
                                                            season={activeTab}
                                                        />
                                                    ))}
                                                </ChampionsList>
                                            </ContentWrapper>

                                            <CardHeader>
                                                <CardTitle>{lineup.name}</CardTitle>
                                                <DeleteLineupBtn
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteLineup(lineup.id, lineup.name);
                                                    }}
                                                    title="删除此阵容"
                                                >
                                                    {/* 内联 SVG 垃圾桶图标，比 emoji 更粗更清晰 */}
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                        <path d="M10 11v6" />
                                                        <path d="M14 11v6" />
                                                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                                    </svg>
                                                </DeleteLineupBtn>
                                                <Arrow $expanded={isExpanded}>▼</Arrow>
                                            </CardHeader>
                                        </LineupCard>
                                        
                                        <ExpandPanel $expanded={isExpanded}>
                                            {availableLevels.map(([level, levelChampions]) => (
                                                <LevelRow key={`${lineup.id}-level-${level}`}>
                                                    <LevelLabel>Lv.{level}</LevelLabel>
                                                    <LevelChampionsList>
                                                        {levelChampions.map((champion, idx) => (
                                                            <SmallChampionAvatarComponent
                                                                key={`${lineup.id}-lv${level}-${champion.name}-${idx}`}
                                                                champion={champion}
                                                                season={activeTab}
                                                                lineupId={lineup.id}
                                                                level={level.toString(10)}
                                                                idx={idx}
                                                            />
                                                        ))}
                                                    </LevelChampionsList>
                                                </LevelRow>
                                            ))}
                                        </ExpandPanel>
                                    </LineupCardWrapper>
                                );
                            })}
                        </>
                    )}

                    {/* ===== 默认阵容分栏（仅在同时存在自定义阵容时才显示标题） ===== */}
                    {userLineups.length > 0 && defaultLineups.length > 0 && (
                        <SectionLabel>默认阵容（{defaultLineups.length}）</SectionLabel>
                    )}
                    {defaultLineups.map((lineup) => {
                        const champions = getDisplayChampions(lineup);
                        const availableLevels = getAvailableLevels(lineup);
                        const isExpanded = expandedIds.has(lineup.id);
                        const isSelected = selectedIds.has(lineup.id);
                        const activeTraits = calculateTraits(champions, activeTab);
                        
                        return (
                            <LineupCardWrapper key={lineup.id} $expanded={isExpanded}>
                                <LineupCard 
                                    $expanded={isExpanded}
                                    $selected={isSelected}
                                    onClick={() => toggleExpand(lineup.id)}
                                >
                                    <CheckboxWrapper onClick={(e) => toggleSelect(lineup.id, e)}>
                                        <Checkbox $checked={isSelected} />
                                    </CheckboxWrapper>
                                    
                                    <ContentWrapper>
                                        <TraitsListContainer>
                                            {activeTraits.map((trait, idx) => {
                                                const isActive = trait.count >= trait.data.levels[0];
                                                return (
                                                    <TraitItem key={`${lineup.id}-trait-${idx}`} $active={isActive}>
                                                        <TraitIcon src={getTraitIconUrl(trait.data)} alt={trait.name} />
                                                        <TraitCount>{trait.count}</TraitCount>
                                                        <TraitName>{trait.name}</TraitName>
                                                    </TraitItem>
                                                );
                                            })}
                                        </TraitsListContainer>

                                        <ChampionsList>
                                            {champions.map((champion, index) => (
                                                <ChampionAvatarComponent
                                                    key={`${lineup.id}-${champion.name}-${index}`}
                                                    champion={champion}
                                                    season={activeTab}
                                                />
                                            ))}
                                        </ChampionsList>
                                    </ContentWrapper>

                                    <CardHeader>
                                        <CardTitle>{lineup.name}</CardTitle>
                                        <Arrow $expanded={isExpanded}>▼</Arrow>
                                    </CardHeader>
                                </LineupCard>
                                
                                <ExpandPanel $expanded={isExpanded}>
                                    {availableLevels.map(([level, levelChampions]) => (
                                        <LevelRow key={`${lineup.id}-level-${level}`}>
                                            <LevelLabel>Lv.{level}</LevelLabel>
                                            <LevelChampionsList>
                                                {levelChampions.map((champion, idx) => (
                                                    <SmallChampionAvatarComponent
                                                        key={`${lineup.id}-lv${level}-${champion.name}-${idx}`}
                                                        champion={champion}
                                                        season={activeTab}
                                                        lineupId={lineup.id}
                                                        level={level.toString(10)}
                                                        idx={idx}
                                                    />
                                                ))}
                                            </LevelChampionsList>
                                        </LevelRow>
                                    ))}
                                </ExpandPanel>
                            </LineupCardWrapper>
                        );
                    })}
                </LineupsList>
            ) : (
                <EmptyState>
                    <p>暂无阵容配置</p>
                    <p>请在 public/lineups/{activeTab} 目录下添加阵容 JSON 文件</p>
                </EmptyState>
            )}

            {/* ==================== 删除确认弹窗 ==================== */}
            {deleteTarget && (
                <ModalOverlay onClick={() => setDeleteTarget(null)}>
                    <ConfirmDialog onClick={(e) => e.stopPropagation()}>
                        <ConfirmTitle>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            确认删除
                        </ConfirmTitle>
                        <ConfirmMessage>
                            确定要删除阵容 <ConfirmName>[{deleteTarget.name}]</ConfirmName> 吗？此操作不可撤销。
                        </ConfirmMessage>
                        <ConfirmActions>
                            <ConfirmBtn onClick={() => setDeleteTarget(null)}>取消</ConfirmBtn>
                            <ConfirmBtn $danger onClick={confirmDelete}>删除</ConfirmBtn>
                        </ConfirmActions>
                    </ConfirmDialog>
                </ModalOverlay>
            )}

            {/* ==================== 创建阵容弹窗 ==================== */}
            {showCreateModal && (
                <ModalOverlay>
                    <ModalContent>
                        <ModalHeader>
                            <ModalTitle>创建自定义阵容（{activeTab === 'S16' ? '英雄联盟传奇' : '瑞兽闹新春'}）</ModalTitle>
                            <ModalCloseBtn onClick={closeCreateModal}>✕</ModalCloseBtn>
                        </ModalHeader>

                        <ModalBody ref={modalBodyRef} $isDragging={isDraggingSplit}>
                            {/* ===== 左侧：棋子池 ===== */}
                            <ChessPool $width={splitPos}>
                                {groupedChessByCost.map(([cost, chessList]) => (
                                    <div key={cost}>
                                        <CostGroupTitle $cost={cost}>{cost} 费</CostGroupTitle>
                                        <CostGroupGrid>
                                            {chessList.map(({ name, unit }) => (
                                                <DraggableChess
                                                    key={name}
                                                    $cost={unit.price}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, name)}
                                                    onClick={() => handleChessClick(name)}
                                                    title={name}
                                                >
                                                    <img
                                                        src={getChessAvatarForModal(name)}
                                                        alt={name}
                                                        loading="lazy"
                                                    />
                                                    <ChessName>{name}</ChessName>
                                                </DraggableChess>
                                            ))}
                                        </CostGroupGrid>
                                    </div>
                                ))}
                            </ChessPool>

                            {/* ===== 可拖拽分割线 ===== */}
                            <SplitDivider
                                $isDragging={isDraggingSplit}
                                onMouseDown={handleSplitMouseDown}
                            />

                            {/* ===== 右侧：阵容编辑 ===== */}
                            <LineupEditor>
                                <LineupNameRow>
                                    <LineupNameInput
                                        placeholder="请输入阵容名称..."
                                        value={customLineupName}
                                        onChange={(e) => setCustomLineupName(e.target.value)}
                                        maxLength={30}
                                    />
                                </LineupNameRow>

                                {/* 根据最高已填充等级实时显示羁绊组 */}
                                {editorTraits.length > 0 && (
                                    <TraitsListContainer>
                                        {editorTraits.map((trait, idx) => {
                                            const isActive = trait.count >= trait.data.levels[0];
                                            return (
                                                <TraitItem key={`editor-trait-${idx}`} $active={isActive}>
                                                    <TraitIcon src={getTraitIconUrl(trait.data)} alt={trait.name} />
                                                    <TraitCount>{trait.count}</TraitCount>
                                                    <TraitName>{trait.name}</TraitName>
                                                </TraitItem>
                                            );
                                        })}
                                    </TraitsListContainer>
                                )}

                                {LEVEL_CONFIG.map(({ level, key, required }, configIndex) => {
                                    const champions = levelChampions[key];
                                    // 生成 level 个格子
                                    const slots = Array.from({ length: level }, (_, i) => i);
                                    // 最后一行（level10）不需要"应用至下一行"按钮
                                    const isLastLevel = configIndex === LEVEL_CONFIG.length - 1;

                                    return (
                                        <LevelEditRow key={key} $required={required}>
                                            <RowSideWrapper>
                                                <EditLevelLabel $required={required}>
                                                    Lv.{level}
                                                    {required ? '' : ' (选填)'}
                                                </EditLevelLabel>
                                            </RowSideWrapper>
                                            <SlotContainer>
                                                {slots.map((slotIdx) => {
                                                    const slot = champions[slotIdx] || null;
                                                    const chessName = slot?.name || null;
                                                    const slotId = `${key}-${slotIdx}`;
                                                    const isDragOver = dragOverSlot === slotId;
                                                    // 获取该格子棋子的费用（用于边框颜色）
                                                    const chessData = chessName
                                                        ? (getChessDataBySeason(activeTab) as Record<string, TFTUnit>)[chessName]
                                                        : null;
                                                    const cost = chessData?.price;
                                                    const equipData = getEquipDataBySeason(activeTab) as Record<string, TFTEquip>;

                                                    return (
                                                        <ChessSlot
                                                            key={slotId}
                                                            $isDragOver={isDragOver}
                                                            $cost={cost}
                                                            onDragOver={(e) => handleDragOver(e, slotId)}
                                                            onDragLeave={handleDragLeave}
                                                            onDrop={(e) => handleDrop(e, key, slotIdx, level)}
                                                            onClick={() => chessName && openEquipModal(key, slotIdx, chessName)}
                                                            onContextMenu={(e) => {
                                                                e.preventDefault();
                                                                if (chessName) removeChampionFromSlot(key, slotIdx);
                                                            }}
                                                        >
                                                            {chessName ? (
                                                                <>
                                                                    <SlotAvatar
                                                                        src={getChessAvatarForModal(chessName)}
                                                                        alt={chessName}
                                                                    />
                                                                    {/* 装备图标行，仅有装备时显示在头像下方 */}
                                                                    {slot.equips.length > 0 && (
                                                                        <SlotEquipIcons>
                                                                            {slot.equips.map((eqName, eqIdx) => {
                                                                                const eq = equipData[eqName];
                                                                                return eq ? (
                                                                                    <SlotEquipIcon
                                                                                        key={eqIdx}
                                                                                        src={getEquipIconUrl(eq.equipId)}
                                                                                        alt={eqName}
                                                                                    />
                                                                                ) : null;
                                                                            })}
                                                                        </SlotEquipIcons>
                                                                    )}
                                                                    <SlotRemoveBtn
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            removeChampionFromSlot(key, slotIdx);
                                                                        }}
                                                                    >
                                                                        ✕
                                                                    </SlotRemoveBtn>
                                                                </>
                                                            ) : (
                                                                <SlotPlus>+</SlotPlus>
                                                            )}
                                                        </ChessSlot>
                                                    );
                                                })}
                                            </SlotContainer>
                                            {/* 除最后一行（level10）外，每行末尾加"应用至下一行" */}
                                            {!isLastLevel && (
                                                <RowSideWrapper>
                                                    <ApplyNextBtn onClick={() => applyToNextLevel(configIndex)}>
                                                        应用至下一行
                                                    </ApplyNextBtn>
                                                </RowSideWrapper>
                                            )}
                                        </LevelEditRow>
                                    );
                                })}
                            </LineupEditor>
                        </ModalBody>

                        <ModalFooter>
                            <ModalBtn onClick={closeCreateModal}>取消</ModalBtn>
                            <ModalBtn
                                $primary
                                disabled={!canSave}
                                onClick={handleSaveCustomLineup}
                            >
                                保存阵容
                            </ModalBtn>
                        </ModalFooter>

                        {/* ==================== 装备选择浮窗（嵌套） ==================== */}
                        {equipEditTarget && (
                            <EquipModalOverlay onClick={closeEquipModal}>
                                <EquipModalContent onClick={(e) => e.stopPropagation()}>
                                    <EquipCloseBtn onClick={closeEquipModal}>✕</EquipCloseBtn>

                                    {/* 上方：英雄头像（边框颜色=费用色） + 3 个装备槽 */}
                                    <EquipTopSection>
                                        <EquipHeroAvatar $cost={equipEditTarget.cost}>
                                            <img
                                                src={getChessAvatarForModal(equipEditTarget.chessName)}
                                                alt={equipEditTarget.chessName}
                                            />
                                        </EquipHeroAvatar>
                                        <EquipHeroName>{equipEditTarget.chessName}</EquipHeroName>
                                        <EquipSlotsRow>
                                            {[0, 1, 2].map((idx) => {
                                                const eqName = tempEquips[idx] || null;
                                                const eqData = eqName
                                                    ? (getEquipDataBySeason(activeTab) as Record<string, TFTEquip>)[eqName]
                                                    : null;
                                                return (
                                                    <EquipSlotBox
                                                        key={idx}
                                                        $hasEquip={!!eqName}
                                                        onClick={() => eqName && removeEquipFromSlot(idx)}
                                                        onContextMenu={(e) => {
                                                            e.preventDefault();
                                                            if (eqName) removeEquipFromSlot(idx);
                                                        }}
                                                        title={eqName || '空装备槽'}
                                                    >
                                                        {eqData ? (
                                                            <img src={getEquipIconUrl(eqData.equipId)} alt={eqName!} />
                                                        ) : (
                                                            <EquipSlotPlus>+</EquipSlotPlus>
                                                        )}
                                                    </EquipSlotBox>
                                                );
                                            })}
                                        </EquipSlotsRow>
                                    </EquipTopSection>

                                    {/* 下方：装备列表（图标+名称） */}
                                    <EquipBottomSection>
                                        {/* 基础散件 */}
                                        {groupedEquips.base.length > 0 && (
                                            <div>
                                                <EquipCategoryTitle>基础散件</EquipCategoryTitle>
                                                <EquipGrid>
                                                    {groupedEquips.base.map(({ name, equip }) => (
                                                        <EquipItem
                                                            key={name}
                                                            onClick={() => addEquipToSlot(name)}
                                                            title={name}
                                                        >
                                                            <img src={getEquipIconUrl(equip.equipId)} alt={name} />
                                                            <EquipItemName>{name}</EquipItemName>
                                                        </EquipItem>
                                                    ))}
                                                </EquipGrid>
                                            </div>
                                        )}
                                        {/* 合成装备 */}
                                        {groupedEquips.completed.length > 0 && (
                                            <div>
                                                <EquipCategoryTitle>合成装备</EquipCategoryTitle>
                                                <EquipGrid>
                                                    {groupedEquips.completed.map(({ name, equip }) => (
                                                        <EquipItem
                                                            key={name}
                                                            onClick={() => addEquipToSlot(name)}
                                                            title={name}
                                                        >
                                                            <img src={getEquipIconUrl(equip.equipId)} alt={name} />
                                                            <EquipItemName>{name}</EquipItemName>
                                                        </EquipItem>
                                                    ))}
                                                </EquipGrid>
                                            </div>
                                        )}
                                    </EquipBottomSection>
                                </EquipModalContent>
                            </EquipModalOverlay>
                        )}

                    </ModalContent>
                </ModalOverlay>
            )}
        </PageWrapper>
    );
};

export default LineupsPage;
