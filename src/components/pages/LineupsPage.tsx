/**
 * 阵容搭配页面
 * @description 展示和管理 TFT 阵容配置，仿 OP.GG 风格
 */

import React, {useEffect, useState} from 'react';
import styled from 'styled-components';
import {ThemeType} from '../../styles/theme';
import {TFT_16_CHAMPION_DATA, TFTEquip, TraitData} from "../../../src-backend/TFTProtocol";
// 导入 S16 棋子数据，用于获取英雄原画 ID
import {TFT_16_CHESS} from "../../../public/TFTInfo/S16/chess";
import {TFT_16_TRAIT_DATA} from "../../../src-backend/TFTInfo/trait.ts";

// ==================== 类型定义 ====================

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

/**
 * OP.GG 头像 API 基础 URL
 * 将 {englishId} 替换为英雄英文ID即可获取头像
 */
const OPGG_AVATAR_BASE = 'https://c-tft-api.op.gg/img/set/16/tft-champion/tiles/{englishId}.tft_set16.png?image=q_auto:good,f_webp&v=1765176243';

/**
 * 羁绊图标 API 基础 URL
 */
const TRAIT_ICON_BASE = 'https://game.gtimg.cn/images/lol/act/img/tft';

/**
 * 英雄原画 API 基础 URL
 * 将 {chessId} 替换为英雄的 chessId 即可获取原画
 */
const SPLASH_ART_BASE = 'https://game.gtimg.cn/images/lol/tftstore/s16/624x318/{chessId}.jpg';

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
}

/**
 * 根据中文名获取头像 URL
 * @param cnName 棋子中文名
 */
const getAvatarUrl = (cnName: string): string => {
    // @ts-ignore
    const champion = TFT_16_CHAMPION_DATA[cnName];
    if (!champion) {
        console.warn(`未找到英雄 "${cnName}" 的数据`);
        return '';
    }
    const englishId = champion.englishId;
    return OPGG_AVATAR_BASE.replace('{englishId}', englishId);
};

/**
 * 根据中文名获取英雄原画 URL
 * 从 TFT_16_CHESS 数据中查找对应的 chessId
 * @param cnName 棋子中文名
 */
const getSplashArtUrl = (cnName: string): string => {
    // 在 TFT_16_CHESS 数组中查找匹配的英雄
    const chessData = TFT_16_CHESS.find(chess => chess.displayName === cnName);
    if (!chessData) {
        console.warn(`未找到英雄 "${cnName}" 的原画数据`);
        return '';
    }
    return SPLASH_ART_BASE.replace('{chessId}', chessData.chessId);
};

/**
 * 英雄头像组件
 * 处理图片加载失败的情况，并在 hover 时显示原画
 * 自动检测边界，当顶部空间不足时改为在下方显示，左右超出时自动偏移
 * 添加 3D 倾斜效果：鼠标 hover 时卡片会朝鼠标方向轻微倾斜
 */
const ChampionAvatarComponent: React.FC<ChampionAvatarProps> = ({champion}) => {
    const [imgError, setImgError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);  // hover 状态
    const [splashError, setSplashError] = useState(false);  // 原画加载失败状态
    const [showBelow, setShowBelow] = useState(false);  // 是否在下方显示悬浮框
    const [horizontalOffset, setHorizontalOffset] = useState(0);  // 水平偏移量
    
    // 3D 倾斜效果的旋转角度状态
    const [rotateX, setRotateX] = useState(0);  // X 轴旋转（上下倾斜）
    const [rotateY, setRotateY] = useState(0);  // Y 轴旋转（左右倾斜）
    
    // 用于获取元素位置的 ref
    const containerRef = React.useRef<HTMLDivElement>(null);
    // 头像元素的 ref，用于计算鼠标相对位置
    const avatarRef = React.useRef<HTMLDivElement>(null);
    
    const avatarUrl = getAvatarUrl(champion.name);
    const splashArtUrl = getSplashArtUrl(champion.name);  // 获取原画 URL

    // 获取英雄费用
    // @ts-ignore
    const tftUnit = TFT_16_CHAMPION_DATA[champion.name];
    const cost = tftUnit ? tftUnit.price : 0;

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
            {splashArtUrl && !splashError && (
                <SplashArtTooltip $visible={isHovered} $showBelow={showBelow} $horizontalOffset={horizontalOffset}>
                    <SplashArtContainer>
                        <SplashArtImg
                            src={splashArtUrl}
                            alt={`${champion.name} 原画`}
                            onError={() => setSplashError(true)}
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
                {!imgError && avatarUrl ? (
                    <AvatarImg
                        src={avatarUrl}
                        alt={champion.name}
                        onError={() => setImgError(true)}
                        loading="lazy"  // 懒加载优化性能
                    />
                ) : (
                    <AvatarPlaceholder>{champion.name.slice(0, 2)}</AvatarPlaceholder>
                )}
            </ChampionAvatar>
            <ChampionName>{champion.name}</ChampionName>
        </ChampionItem>
    );
};

// ==================== 主组件 ====================

const LineupsPage: React.FC = () => {
    // 阵容列表状态
    const [lineups, setLineups] = useState<LineupConfig[]>([]);
    // 加载状态
    const [loading, setLoading] = useState(true);
    // 展开状态：记录每个阵容的展开状态，key 是阵容 id
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    // 已选中的阵容 ID 集合
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

    // 获取选中的阵容名称（用于单选时显示）
    const getSelectedLineupName = (): string => {
        if (selectedIds.size !== 1) return '';
        const selectedId = Array.from(selectedIds)[0];
        const lineup = lineups.find(l => l.id === selectedId);
        return lineup?.name || '';
    };

    // 全选所有阵容
    const selectAll = () => {
        setSelectedIds(new Set(lineups.map(l => l.id)));
    };

    // 取消全部选择
    const clearAll = () => {
        setSelectedIds(new Set());
    };

    // 组件挂载时从后端加载阵容数据
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 并行获取阵容数据和选中状态
                const [lineupsData, savedSelectedIds] = await Promise.all([
                    window.lineup.getAll(),
                    window.lineup.getSelectedIds(),
                ]);
                setLineups(lineupsData || []);
                // 恢复之前保存的选中状态
                if (savedSelectedIds && savedSelectedIds.length > 0) {
                    setSelectedIds(new Set(savedSelectedIds));
                }
            } catch (error) {
                console.error('加载数据失败:', error);
                setLineups([]);
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
                // 从 key 中提取等级数字，如 'level8' -> 8
                const level = parseInt(key.replace('level', ''), 10);
                levels.push([level, stage.champions]);
            }
        });
        
        return levels;
    };

    /**
     * 计算当前阵容的激活羁绊
     */
    const calculateTraits = (champions: ChampionConfig[]) => {
        const traitCounts: Record<string, number> = {};
        const uniqueChamps = new Set<string>();

        champions.forEach(champ => {
            // 同名英雄去重，不重复计算羁绊
            if (uniqueChamps.has(champ.name)) return;
            uniqueChamps.add(champ.name);

            // @ts-ignore
            const unitData = TFT_16_CHAMPION_DATA[champ.name];
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
                const data = TFT_16_TRAIT_DATA[name];
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
            {/* 状态提示栏（常驻） */}
            <SelectionInfo $hasSelection={selectedIds.size > 0}>
                <SelectionText $hasSelection={selectedIds.size > 0}>
                    {selectedIds.size === 0 ? (
                        <>未选择阵容</>
                    ) : selectedIds.size === 1 ? (
                        <>当前阵容：<LineupName>{getSelectedLineupName()}</LineupName></>
                    ) : (
                        <>已勾选 <strong>{selectedIds.size}</strong> 个阵容，将根据开局情况智能选择最终阵容</>
                    )}
                </SelectionText>
                {/* 全选/取消按钮（智能切换） */}
                <SelectionActions>
                    {selectedIds.size === lineups.length ? (
                        <ActionButton onClick={clearAll}>全部取消</ActionButton>
                    ) : (
                        <ActionButton onClick={selectAll}>全部勾选</ActionButton>
                    )}
                </SelectionActions>
            </SelectionInfo>

            {lineups.length > 0 ? (
                <LineupsList>
                    {lineups.map((lineup) => {
                        const champions = getDisplayChampions(lineup);
                        const availableLevels = getAvailableLevels(lineup);
                        const isExpanded = expandedIds.has(lineup.id);
                        const isSelected = selectedIds.has(lineup.id);
                        const activeTraits = calculateTraits(champions);
                        
                        return (
                            <LineupCardWrapper key={lineup.id} $expanded={isExpanded}>
                                <LineupCard 
                                    $expanded={isExpanded}
                                    $selected={isSelected}
                                    onClick={() => toggleExpand(lineup.id)}
                                >
                                    {/* 选择复选框 */}
                                    <CheckboxWrapper onClick={(e) => toggleSelect(lineup.id, e)}>
                                        <Checkbox $checked={isSelected} />
                                    </CheckboxWrapper>
                                    
                                    <ContentWrapper>
                                        {/* 羁绊列表 */}
                                        <TraitsListContainer>
                                            {activeTraits.map((trait, idx) => {
                                                const isActive = trait.count >= trait.data.levels[0];
                                                // 只显示激活的羁绊，或者显示所有？
                                                // 用户说“每个羁绊列出单独的Item表示”，这里我们显示所有存在的羁绊，用样式区分激活状态
                                                // 或者只显示激活的会让界面更干净？通常阵容网只显示激活的。
                                                // 这里我们稍微宽容一点，只要有1个单位就显示，通过透明度区分
                                                
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
                                                />
                                            ))}
                                        </ChampionsList>
                                    </ContentWrapper>

                                    <CardHeader>
                                        <CardTitle>{lineup.name}</CardTitle>
                                        <Arrow $expanded={isExpanded}>▼</Arrow>
                                    </CardHeader>
                                </LineupCard>
                                
                                {/* 展开面板：显示各等级阵容 */}
                                <ExpandPanel $expanded={isExpanded}>
                                    {availableLevels.map(([level, levelChampions]) => (
                                        <LevelRow key={`${lineup.id}-level-${level}`}>
                                            <LevelLabel>Lv.{level}</LevelLabel>
                                            <LevelChampionsList>
                                                {levelChampions.map((champion, idx) => {
                                                    // @ts-ignore
                                                    const tftUnit = TFT_16_CHAMPION_DATA[champion.name];
                                                    const cost = tftUnit ? tftUnit.price : 0;
                                                    const avatarUrl = getAvatarUrl(champion.name);
                                                    
                                                    return (
                                                        <SmallChampionAvatar 
                                                            key={`${lineup.id}-lv${level}-${champion.name}-${idx}`}
                                                            $cost={cost}
                                                            title={champion.name}
                                                        >
                                                            {avatarUrl && (
                                                                <SmallAvatarImg 
                                                                    src={avatarUrl} 
                                                                    alt={champion.name}
                                                                    loading="lazy"
                                                                />
                                                            )}
                                                        </SmallChampionAvatar>
                                                    );
                                                })}
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
                    <p>请在 public/lineups 目录下添加阵容 JSON 文件</p>
                </EmptyState>
            )}
        </PageWrapper>
    );
};

export default LineupsPage;
