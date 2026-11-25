import {useState, useEffect, useCallback, useRef, type ReactNode} from 'react';
import styled, { css, keyframes } from 'styled-components';
import StopIcon from '@mui/icons-material/Stop';
import BlockIcon from '@mui/icons-material/Block';
import LockIcon from '@mui/icons-material/Lock';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import type { SvgIconComponent } from '@mui/icons-material';
import TftIcon from '../TftIcon';
import {StartButton, type StartButtonVariant} from '../StartButton';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {ThemeType} from "../../styles/theme.ts";
import {hextechPanel, hextechPanelSeeThrough} from "../../styles/hextech.ts";
import {LogPanel} from "../LogPanel.tsx";
import {usePageActive} from "../../hooks/usePageActive";
import {HextechDialog} from "../HextechDialog.tsx";
import {toast} from "../toast/toast-core.ts";
import {showQueueTip} from "../toast/queueTip.ts";
import {SummonerInfo} from "../../../src-backend/lcu/utils/LCUProtocols.ts";
import {TFTMode} from "../../../src-backend/TFTProtocol.ts";
import {settingsStore, GameStatistics} from "../../stores/settingsStore.ts";

// 导入 APP 图标（让 Vite 正确处理资源路径）
import appIconUrl from '../../../public/icon.png';

// 模式卡片的官方素材：云顶之弈手游的模式选择卡片图和模式图标
// 来源：CommunityDragon 解包资源 game/assets/ux/tftmobile/modeselect/
//   （modeselect_cardimage_*.png 转成 webp，tftm_modeicon_*.png 原样保留）
import modeArtNormal from '../../assets/modes/card-normal.webp';
import modeArtRanked from '../../assets/modes/card-ranked.webp';
import modeArtTreasure from '../../assets/modes/card-treasure.webp';
import modeArtDoubleUp from '../../assets/modes/card-doubleup.webp';
import modeArtClockwork from '../../assets/modes/card-clockwork.webp';
import modeIconNormal from '../../assets/modes/icon-normal.png';
import modeIconRanked from '../../assets/modes/icon-ranked.png';
import modeIconTreasure from '../../assets/modes/icon-treasure.png';
import modeIconDoubleUp from '../../assets/modes/icon-doubleup.png';
import modeIconClockwork from '../../assets/modes/icon-clockwork.png';

// ============================================
// 动画
// ============================================

/** 雷达扫描圈旋转 */
const radarSpin = keyframes`
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
`;

/** APP 图标呼吸光晕 */
const iconBreath = keyframes`
  0%, 100% { box-shadow: 0 0 14px rgba(200, 170, 110, 0.25); }
  50% { box-shadow: 0 0 28px rgba(91, 211, 255, 0.45); }
`;

/** 横幅滑入 */
const slideIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ============================================
// 页面骨架
// ============================================

const PageWrapper = styled.div<{ theme: ThemeType }>`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.medium};
  padding: ${props => props.theme.spacing.medium} ${props => props.theme.spacing.large};
  height: 100%;
  overflow: hidden;
  text-align: left;
  color: ${props => props.theme.colors.text};
  /* 顶部一团淡淡的蓝光，模拟客户端主界面的氛围光 */
  background:
    radial-gradient(ellipse 80% 45% at 50% 0%, rgba(47, 139, 255, 0.10) 0%, transparent 70%),
    transparent;  /* 底色透明，透出全局背景图 */
`;

// ============================================
// 召唤师信息栏
// ============================================

const ProfileBar = styled.div`
  ${hextechPanel};
  ${hextechPanelSeeThrough};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.large};
  padding: 12px 20px;
  flex-shrink: 0;
`;

/** 头像外框：金色双圈，和客户端左上角的头像框一致 */
const AvatarFrame = styled.div`
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 50%;
  padding: 3px;
  background: linear-gradient(160deg, ${props => props.theme.colors.goldBright} 0%, ${props => props.theme.colors.gold} 40%, ${props => props.theme.colors.goldDim} 100%);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.6);
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid ${props => props.theme.colors.sidebarBg};
  display: block;
`;

/** 等级徽章：压在头像底部 */
const LevelBadge = styled.div`
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0 8px;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 16px;
  white-space: nowrap;
  color: ${props => props.theme.colors.goldBright};
  background: ${props => props.theme.colors.sidebarBg};
  border: 1px solid ${props => props.theme.colors.gold};
`;

const ProfileInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`;

const ProfileName = styled.div`
  font-size: 1.15rem;
  font-weight: 700;
  color: ${props => props.theme.colors.goldBright};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ProfileTag = styled.span`
  margin-left: 4px;
  font-size: 0.85rem;
  font-weight: 400;
  color: ${props => props.theme.colors.textSecondary};
`;

/** 经验条：细长的蓝色进度条，外面一圈暗金边 */
const ExpBar = styled.div`
  width: 180px;
  height: 6px;
  background: ${props => props.theme.colors.sidebarBg};
  border: 1px solid ${props => props.theme.colors.goldDeep};
  overflow: hidden;
`;

const ExpFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${props => Math.max(0, Math.min(100, props.$percent))}%;
  background: linear-gradient(90deg, #1450B8 0%, ${props => props.theme.colors.accentCyan} 100%);
  box-shadow: 0 0 6px ${props => props.theme.colors.accentCyan}99;
  transition: width 0.5s ease;
`;

const ExpText = styled.span`
  font-size: 0.72rem;
  color: ${props => props.theme.colors.textSecondary};
`;

/** 右侧统计：三项横排，中间用暗金竖线分隔 */
const StatsGroup = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
`;

const StatItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 18px;

  &:not(:first-child) {
    border-left: 1px solid ${props => props.theme.colors.goldDeep};
  }

  .MuiSvgIcon-root {
    font-size: 1.3rem;
    color: ${props => props.theme.colors.gold};
  }
`;

const StatText = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatLabel = styled.span`
  font-size: 0.72rem;
  color: ${props => props.theme.colors.statsLabelColor};
  letter-spacing: 1px;
`;

const StatValue = styled.span`
  font-size: 1rem;
  font-weight: 700;
  color: ${props => props.theme.colors.statsValueColor};
  font-variant-numeric: tabular-nums;
`;

// ============================================
// 未连接 / 加载中
// ============================================

const WelcomePanel = styled.div`
  ${hextechPanel};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${props => props.theme.spacing.large};
  padding: 18px 24px;
  flex-shrink: 0;
`;

const WelcomeText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

/** 项目名称：金色渐变字 */
const ProjectTitle = styled.h1`
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 3px;
  background: linear-gradient(180deg, ${props => props.theme.colors.goldBright} 0%, ${props => props.theme.colors.gold} 55%, ${props => props.theme.colors.goldDim} 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6));
`;

const WelcomeHint = styled.span`
  font-size: 0.9rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const AppIconContainer = styled.div`
  position: relative;
  width: 96px;
  height: 96px;
  flex-shrink: 0;
`;

const AppIconImage = styled.img`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 76px;
  height: 76px;
  border-radius: 50%;
  z-index: 2;
  border: 2px solid ${props => props.theme.colors.gold};
  background-color: ${props => props.theme.colors.sidebarBg};
  animation: ${iconBreath} 3s ease-in-out infinite;
`;

/** 雷达扫描圈 - 外圈（金色虚线） */
const RadarCircle = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px dashed ${props => props.theme.colors.gold}66;
  animation: ${radarSpin} 10s linear infinite;

  &::before {
    content: '';
    position: absolute;
    top: -2px;
    left: 50%;
    width: 4px;
    height: 4px;
    background: ${props => props.theme.colors.accentCyan};
    border-radius: 50%;
    box-shadow: 0 0 10px ${props => props.theme.colors.accentCyan};
  }
`;

/** 雷达扫描圈 - 内圈（青色弧线） */
const RadarCircleInner = styled(RadarCircle)`
  border: 1px solid transparent;
  border-left-color: ${props => props.theme.colors.accentCyan}aa;
  animation-duration: 3s;
`;

/** 管理员权限提示横幅 */
const AdminWarningBanner = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 4px 10px;
  font-size: 0.85rem;
  color: ${props => props.theme.colors.warning};
  background: ${props => props.theme.colors.warning}14;
  border: 1px solid ${props => props.theme.colors.warning}66;
`;

// ============================================
// 模式卡片
// ============================================

/** 确认切换模式时卡片弹一下：从按下的状态弹过头，再回到选中的放大状态 */
const modeCardPop = keyframes`
  0% { transform: scale(1.05); }
  55% { transform: scale(1.14); }
  100% { transform: scale(1.08); }
`;

/** 确认切换模式时角色图亮一下 */
const modeArtFlash = keyframes`
  0% { filter: brightness(1.7) drop-shadow(0 6px 12px rgba(0, 0, 0, 0.55)); }
  100% { filter: brightness(1) drop-shadow(0 6px 12px rgba(0, 0, 0, 0.55)); }
`;

/** 模式卡片之间的间距 */
const MODE_CARD_GAP = 16;

/**
 * 模式卡片的宽度，高度按官方卡片图 1:2 的比例计算
 * 跟随窗口高度变化（把空间留给日志），同时保证五张卡片一行放得下（多留 14px 给两端卡片选中放大）
 */
const MODE_CARD_WIDTH = `min(clamp(116px, 19vh, 168px), calc((100cqw - ${MODE_CARD_GAP * 4 + 14}px) / 5))`;

/**
 * 官方卡片图里，透明的"探头区"占顶部 24%（角色从这里探出），往下才是不透明的卡面。
 * 边框、角标、遮罩都只覆盖卡面部分
 */
const MODE_CARD_BODY_TOP = '24%';

/**
 * 悬停 / 选中时整张卡片（图、边框、文字）一起放大，以卡面中心为原点
 * 卡面从 24% 高度开始，所以卡面中心在 62% 处
 */
const MODE_CARD_HIGHLIGHT_SCALE = 'scale(1.08)';
const MODE_CARD_BODY_CENTER = '50% 62%';

/**
 * 卡片顶部的透明探头区会让卡面离上方面板很远，整行上移一些，让探头区落进面板之间的空隙。
 * 最高的角色（发条鸟）选中放大后会稍微盖住上方的召唤师信息栏，这是允许的
 */
const MODE_GRID_PULL_UP = 54;

/** 作为尺寸容器，卡片用 cqw 按这里的宽度计算 */
const ModeSection = styled.section`
  container-type: inline-size;
  flex-shrink: 0;
`;

const ModeGrid = styled.div`
  display: flex;
  justify-content: center;
  gap: ${MODE_CARD_GAP}px;
  margin-top: -${MODE_GRID_PULL_UP}px;
`;

/** 官方模式卡片图（256x512 竖版，原比例显示） */
const ModeArt = styled.div<{ $src: string }>`
  position: absolute;
  inset: 0;
  background: url(${props => props.$src}) center bottom / 100% 100% no-repeat;
  opacity: 0.88;
  transition: opacity 0.25s ease, filter 0.25s ease;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.55));
  pointer-events: none;
`;

/** 卡面边框（不含顶部透明的探头区） */
/** 边框层向外扩出的距离，用来容纳选中时的外发光（mask 会裁掉元素范围以外的部分） */
const MODE_FRAME_GLOW_SPACE = 14;

/**
 * 卡面边框：不画顶边；两侧从下往上 75% 以内保持不透明，再往上迅速淡出，让角色和背景自然衔接。
 * 渐隐用 mask 实现，作用在整个边框层上（包括选中时的外发光）；真正的边框画在 ::before 上
 */
const ModeFrame = styled.div`
  position: absolute;
  top: calc(${MODE_CARD_BODY_TOP} - ${MODE_FRAME_GLOW_SPACE}px);
  left: -${MODE_FRAME_GLOW_SPACE}px;
  right: -${MODE_FRAME_GLOW_SPACE}px;
  bottom: -${MODE_FRAME_GLOW_SPACE}px;
  pointer-events: none;
  -webkit-mask-image: linear-gradient(to top, #000 0%, #000 75%, transparent 90%);
  mask-image: linear-gradient(to top, #000 0%, #000 75%, transparent 90%);

  &::before {
    content: '';
    position: absolute;
    inset: ${MODE_FRAME_GLOW_SPACE}px;
    border: 1px solid ${props => props.theme.colors.goldDim};
    border-top: none;
    box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.45);
    transition: border-color 0.25s ease, box-shadow 0.25s ease;
  }
`;

/** 卡面右上角的状态角标 */
const ModeStatus = styled.span<{ $ready: boolean }>`
  position: absolute;
  top: calc(${MODE_CARD_BODY_TOP} + 6px);
  right: 6px;
  padding: 0 5px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: ${props => props.$ready ? props.theme.colors.accentCyan : props.theme.colors.gold};
  border: 1px solid ${props => props.$ready ? props.theme.colors.accentCyan : props.theme.colors.goldDim};
  background: rgba(1, 10, 19, 0.65);
  transition: opacity 0.2s ease;
`;

/** 底部磨砂玻璃信息区：图标 + 模式名 + 队列号 */
const ModeInfo = styled.div`
  position: absolute;
  left: 1px;
  right: 1px;
  bottom: 1px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 18px 6px 8px;
  text-align: center;
  background: linear-gradient(180deg, rgba(8, 14, 22, 0) 0%, rgba(8, 14, 22, 0.72) 32%, rgba(8, 14, 22, 0.86) 100%);
  backdrop-filter: blur(3px);
  transition: opacity 0.2s ease;
`;

/** 模式图标：金框小菱形 */
const ModeIconBadge = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-bottom: 5px;
  border: 1px solid ${props => props.theme.colors.gold};
  background: rgba(1, 10, 19, 0.6);
  transform: rotate(45deg);
`;

/** 官方模式图标（白色剪影），用 mask 染成主题金色 */
const ModeIconGlyph = styled.span<{ $src: string }>`
  width: 17px;
  height: 17px;
  transform: rotate(-45deg);
  background: ${props => props.theme.colors.goldBright};
  -webkit-mask: url(${props => props.$src}) center / contain no-repeat;
  mask: url(${props => props.$src}) center / contain no-repeat;
`;

/** 模式名的系列前缀（如"自然之力"），小字单独一行，避免长名字在窄卡片里断行 */
const ModeSeries = styled.div`
  font-size: 0.72rem;
  letter-spacing: 2px;
  color: ${props => props.theme.colors.gold};
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
`;

const ModeName = styled.div`
  white-space: nowrap;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.25;
  color: ${props => props.theme.colors.goldBright};
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
`;

const ModeMeta = styled.div`
  font-size: 0.68rem;
  color: ${props => props.theme.colors.textSecondary};
`;

/** 未适配的模式悬停时显示的提示（盖住卡面，原有的文字同时淡出） */
const ModeLockOverlay = styled.div`
  position: absolute;
  top: ${MODE_CARD_BODY_TOP};
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 700;
  line-height: 1.4;
  color: ${props => props.theme.colors.goldBright};
  background: rgba(1, 10, 19, 0.78);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;

  .MuiSvgIcon-root {
    font-size: 1.3rem;
    color: ${props => props.theme.colors.error};
  }
`;

const ModeCard = styled.button<{ $selected: boolean; $locked: boolean; $justSelected: boolean }>`
  appearance: none;
  position: relative;
  flex: 0 0 auto;
  width: ${MODE_CARD_WIDTH};
  aspect-ratio: 1 / 2;
  padding: 0;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  cursor: ${props => props.$locked ? 'not-allowed' : 'pointer'};
  transform-origin: ${MODE_CARD_BODY_CENTER};
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1.2);

  ${props => props.$selected && css`
    z-index: 1;
    transform: ${MODE_CARD_HIGHLIGHT_SCALE};
    ${ModeArt} {
      opacity: 1;
    }
    ${ModeFrame}::before {
      border-color: ${props.theme.colors.accentCyan};
      box-shadow:
        inset 0 -1px 0 rgba(0, 0, 0, 0.45),
        0 0 0 1px ${props.theme.colors.accentCyan}66,
        0 0 18px ${props.theme.colors.accentCyan}55;
    }
  `}

  ${props => props.$locked ? css`
    ${ModeArt} {
      filter: grayscale(0.75) brightness(0.6) drop-shadow(0 6px 12px rgba(0, 0, 0, 0.55));
    }
    &:hover ${ModeLockOverlay} {
      opacity: 1;
    }
    &:hover ${ModeInfo}, &:hover ${ModeStatus} {
      opacity: 0;
    }
  ` : css`
    &:hover {
      z-index: 1;
      transform: ${MODE_CARD_HIGHLIGHT_SCALE};
    }
    &:hover ${ModeArt} {
      opacity: 1;
    }
    &:hover ${ModeFrame}::before {
      border-color: ${props.$selected ? props.theme.colors.accentCyan : props.theme.colors.gold};
    }
    /* 按下时从放大状态回缩，给出"按到了"的反馈 */
    &:active {
      transform: scale(1.05);
      transition-duration: 0.2s;
    }
  `}

  ${props => props.$justSelected && css`
    animation: ${modeCardPop} 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    ${ModeArt} {
      animation: ${modeArtFlash} 0.5s ease-out both;
    }
  `}

  &:focus-visible {
    outline: none;
  }
  &:focus-visible ${ModeFrame}::before {
    border-color: ${props => props.theme.colors.goldBright};
  }
`;

// ============================================
// 运行日志标题栏里的提示（开始按钮见 StartButton.tsx）
// ============================================

/** "本局结束后停止"提示；日志标题栏不够宽时只显示图标，完整说明在 title 里 */
const StopAfterGameBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  color: ${props => props.theme.colors.accentCyan};
  border: 1px solid ${props => props.theme.colors.accentCyan}66;
  background: ${props => props.theme.colors.accentCyan}14;
  animation: ${slideIn} 0.25s ease-out;

  .MuiSvgIcon-root {
    font-size: 0.95rem;
  }

  @container (max-width: 900px) {
    span {
      display: none;
    }
  }
`;

// ============================================
// 模式配置
// ============================================

/** OP.GG 头像 CDN 基础 URL */
const PROFILE_ICON_BASE_URL = 'https://opgg-static.akamaized.net/meta/images/profile_icons/profileIcon';

/** 模式卡片的配置 */
interface ModeOption {
    /** 唯一标识 */
    key: string;
    /** 卡片上显示的模式名 */
    name: string;
    /** 客户端里的队列 ID（仅展示用） */
    queueId: number;
    /** 对应的后端模式；null 表示后端还没有这个模式 */
    mode: TFTMode | null;
    /** 卡片背景图（官方模式卡片图） */
    art: string;
    /** 卡片图标（官方模式图标） */
    iconUrl: string;
    /** 卡片的点缀色 */
    accent: string;
    /** 是否已适配、允许选择 */
    enabled: boolean;
    /** 只在开发版开放（用来调试），卡片角标显示"调试" */
    debugOnly?: boolean;
}

/**
 * 模式列表，和云顶之弈（虚幻客户端）当前开放的队列一一对应：
 *   自然之力 匹配 1090 / 排位 1100 / 恭喜发财 6080 / 双人作战 1160、发条鸟的试炼 1220
 *
 * 目前开放了自然之力 匹配和发条鸟的试炼，其他模式是"适配中"状态，点击无效。
 * 以后适配了某个模式，把它的 enabled 改成 true（没有 mode 的还要先在后端加 TFTMode）即可。
 */
const MODE_OPTIONS: ModeOption[] = [
    { key: 'NATURE_NORMAL', name: '自然之力 匹配', queueId: 1090, mode: TFTMode.NORMAL, art: modeArtNormal, iconUrl: modeIconNormal, accent: '#2F8BFF', enabled: true },
    { key: 'NATURE_RANK', name: '自然之力 排位', queueId: 1100, mode: TFTMode.RANK, art: modeArtRanked, iconUrl: modeIconRanked, accent: '#C8AA6E', enabled: false },
    { key: 'NATURE_TREASURE', name: '自然之力 恭喜发财', queueId: 6080, mode: null, art: modeArtTreasure, iconUrl: modeIconTreasure, accent: '#E8A33D', enabled: false },
    { key: 'NATURE_DOUBLE', name: '自然之力 双人作战', queueId: 1160, mode: null, art: modeArtDoubleUp, iconUrl: modeIconDoubleUp, accent: '#B57BFF', enabled: false },
    { key: 'CLOCKWORK', name: '发条鸟的试炼', queueId: 1220, mode: TFTMode.CLOCKWORK_TRAILS, art: modeArtClockwork, iconUrl: modeIconClockwork, accent: '#0AC8B9', enabled: true },
];

/** 默认模式：历史配置里的模式已下线/未适配时，兜底切到第一个已开放的模式 */
const DEFAULT_TFT_MODE: TFTMode =
    MODE_OPTIONS.find(option => option.enabled && option.mode !== null)?.mode ?? TFTMode.NORMAL;

/** 判断某个模式当前是否可选 */
const isSelectableMode = (mode: string): boolean =>
    MODE_OPTIONS.some(option => option.enabled && option.mode === mode);

// ============================================
// 组件主体
// ============================================

export const HomePage = () => {
    const isPageActive = usePageActive();
    const [isRunning, setIsRunning] = useState(false);
    const [summonerInfo, setSummonerInfo] = useState<SummonerInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // 新增：跟踪 LCU 连接状态
    const [isLcuConnected, setIsLcuConnected] = useState(false);
    // 新增：TFT 游戏模式
    const [tftMode, setTftMode] = useState<TFTMode>(DEFAULT_TFT_MODE);
    // 刚被用户切换到的模式卡片，用来播放一次确认动画（页面加载时的默认选中不播放）
    const [justSelectedKey, setJustSelectedKey] = useState<string | null>(null);
    // 新增：管理员权限状态（null 表示还在检测中）
    const [isElevated, setIsElevated] = useState<boolean | null>(null);
    // 新增："本局结束后停止"状态
    const [stopAfterGame, setStopAfterGame] = useState(false);
    // 新增：是否有选中的阵容（针对当前赛季）
    const [hasSelectedLineup, setHasSelectedLineup] = useState(false);
    // 云顶之弈独立客户端是否已打开（新版云顶之弈和 LOL 客户端是两个程序，要分开检查）
    const [isTftClientOpen, setIsTftClientOpen] = useState(false);
    // 新增：统计数据（本次会话局数、历史总局数、运行时长）
    const [statistics, setStatistics] = useState<GameStatistics>(settingsStore.getStatistics());
    // 新增：格式化后的运行时长文本
    const [elapsedTime, setElapsedTime] = useState('00:00:00');
    // 开始挂机前检查游戏窗口不通过时的提示弹窗（null 表示不显示）
    const [windowAlert, setWindowAlert] = useState<{ title: string; content: ReactNode } | null>(null);

    /**
     * 检查指定模式对应的赛季是否有已选中的阵容
     * @param mode 当前 TFT 模式
     * @description 根据 mode 确定赛季（S16/S4），获取该赛季的阵容列表，
     *              然后检查 selectedIds 与该赛季阵容 ID 是否有交集
     */
    const checkHasSelectedLineup = async (mode: TFTMode) => {
        try {
            // 根据模式确定赛季字符串
            // NORMAL / RANK / CLOCKWORK_TRAILS → 当前主赛季（S18 自然之力）
            // S4_RUISHOU → S4 回归赛季
            const season = (mode === TFTMode.S4_RUISHOU) ? 'S4' : 'S18';

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

            // 获取 TFT 游戏模式
            // 历史配置里可能存着已下线/未适配的模式（如老版本的星神匹配），
            // 统一兜底到默认模式并写回，避免后端按旧模式去排队
            const mode = await window.lineup.getTftMode();
            const currentMode = isSelectableMode(mode) ? mode as TFTMode : DEFAULT_TFT_MODE;
            if (currentMode !== mode) {
                await window.lineup.setTftMode(currentMode);
            }
            setTftMode(currentMode);

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

    // 从别的页面切回来时，静默同步在别处可能变化的状态（页面没有卸载，不会重新走上面的初始化）
    const wasHiddenRef = useRef(false);
    useEffect(() => {
        if (!isPageActive) {
            wasHiddenRef.current = true;
            return;
        }
        if (!wasHiddenRef.current) return;
        wasHiddenRef.current = false;

        const syncState = async () => {
            try {
                // 阵容可能刚在阵容页改过；挂机可能被定时停止等后端逻辑停掉
                const [connected, running] = await Promise.all([
                    window.lcu.getConnectionStatus(),
                    window.hex.getStatus(),
                    checkHasSelectedLineup(tftMode),
                    settingsStore.refreshStatistics(),
                ]);
                setIsLcuConnected(connected);
                setIsRunning(running);

                // 刷新召唤师经验等信息，失败就保留原来的显示
                if (connected) {
                    const result = await window.lcu.getSummonerInfo();
                    if (result.data) setSummonerInfo(result.data);
                }
            } catch (error) {
                console.error('同步主页状态失败:', error);
            }
        };
        syncState();
    }, [isPageActive]);

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

    // 轮询云顶之弈独立客户端是否已打开（只在页面显示、已连上 LOL 客户端、且没在挂机时检查；挂机中由状态机自己处理）
    useEffect(() => {
        if (!isPageActive || !isLcuConnected || isRunning) return;

        let cancelled = false;
        const check = async () => {
            try {
                const open = await window.tft.isClientOpen();
                if (!cancelled) setIsTftClientOpen(open);
            } catch (error) {
                // 检测本身失败（例如主进程还是旧版本，没有这个接口）时不能把按钮卡在禁用状态，
                // 先放行，点击开始时 checkGameWindow 还会再检查一次窗口
                console.error('检测云顶之弈客户端失败:', error);
                if (!cancelled) setIsTftClientOpen(true);
            }
        };
        check();
        const timer = setInterval(check, 2000);
        return () => {
            cancelled = true;
            clearInterval(timer);
        };
    }, [isPageActive, isLcuConnected, isRunning]);

    // 每秒更新运行时长显示
    useEffect(() => {
        // 立即用 store 中的快照更新一次
        setElapsedTime(formatElapsed(statistics.sessionElapsedSeconds));

        // 只有页面显示且正在运行时才启动计时器（轮询后端获取实时秒数）
        if (!isPageActive || !isRunning) return;

        const timer = setInterval(async () => {
            try {
                const stats = await window.stats.getStatistics();
                setElapsedTime(formatElapsed(stats.sessionElapsedSeconds));
            } catch {
                // 忽略，下次再试
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isPageActive, isRunning, statistics.sessionElapsedSeconds, formatElapsed]);

    // 监听快捷键触发的挂机切换事件（主进程已完成 start/stop，这里只同步 UI 状态）
    useEffect(() => {
        const cleanup = window.hex.onToggleTriggered((newRunningState: boolean) => {
            console.log('🎮 [HomePage] 收到快捷键切换事件，新状态:', newRunningState);
            setIsRunning(newRunningState);

            // 显示提示
            if (newRunningState) {
                toast.success('海克斯科技启动!');
                showQueueTip();
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

    /** 当前选中模式对应的卡片配置 */
    const activeOption = MODE_OPTIONS.find(option => option.mode === tftMode);

    /** 当前模式是否已适配（未适配时不允许开始挂机） */
    const isModeReady = !!activeOption?.enabled;

    /** 当前模式是否需要选择阵容（发条鸟不需要，其他都需要） */
    const needsLineup = tftMode !== TFTMode.CLOCKWORK_TRAILS;

    const handleToggle = async () => {
        // 未连接客户端时禁止操作
        if (!isLcuConnected) {
            return;
        }

        // 当前模式还没适配时禁止启动（运行中仍然允许停止）
        if (!isRunning && !isModeReady) {
            return;
        }

        // 开始挂机前检查游戏窗口：挂机需要把游戏画面调成固定尺寸，只有窗口化模式才能调整
        if (!isRunning && !(await checkGameWindow())) {
            return;
        }

        // 需要阵容的模式下，实时检查当前赛季是否有选中阵容
        if (needsLineup) {
            await checkHasSelectedLineup(tftMode);
            // 检查后如果仍然没有选中阵容，阻止操作
            // 注意：这里用最新的 state 值无法直接获取（因为 setState 是异步的）
            // 所以我们直接再做一次内联检查
            // 赛季字符串与 checkHasSelectedLineup 保持一致：非 S4 模式走当前主赛季 S18
            const season = (tftMode === TFTMode.S4_RUISHOU) ? 'S4' : 'S18';
            const [seasonLineups, selectedIds] = await Promise.all([
                window.lineup.getAll(season),
                window.lineup.getSelectedIds(),
            ]);
            const seasonIds = new Set((seasonLineups || []).map((l: any) => l.id));
            const hasSelection = (selectedIds || []).some((id: string) => seasonIds.has(id));

            if (!hasSelection) {
                const seasonName = tftMode === TFTMode.S4_RUISHOU ? '瑞兽闹新春' : 'S18 自然之力';
                toast.error(`请先在阵容页面选择至少一个【${seasonName}】阵容！`);
                setHasSelectedLineup(false);
                return;
            }
        }

        if (!isRunning) {
            const success = await window.hex.start();
            if (success) {
                toast.success('海克斯科技启动!');
                showQueueTip();
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
     * 检查云顶之弈窗口是否满足挂机条件（已启动、未最小化、窗口化）
     * @returns 不满足时弹窗提醒用户并返回 false
     */
    const checkGameWindow = async (): Promise<boolean> => {
        const state = await window.tft.getWindowMode();
        if (!state.found) {
            setWindowAlert({
                title: '未检测到云顶之弈窗口',
                content: <>{state.error}。<br/>请先打开云顶之弈客户端（不要最小化），再点击开始。</>,
            });
            return false;
        }
        if (!state.windowed) {
            setWindowAlert({
                title: '请先切换为窗口化模式',
                content: (
                    <>
                        检测到云顶之弈当前是<strong>无边框</strong>或<strong>全屏</strong>模式。<br/>
                        挂机时需要把游戏画面调整为固定尺寸，只有窗口化模式才能调整。<br/>
                        请在云顶之弈的<strong>设置 → 显示模式</strong>里手动改为<strong>「窗口化」</strong>，再点击开始。
                    </>
                ),
            });
            return false;
        }
        return true;
    };

    /**
     * 切换游戏模式
     *
     * 交互说明喵：
     * - 未适配的模式：hover 时卡片上显示"不许选"，点击直接忽略
     * - 运行中禁止切换
     */
    const handleModeSelect = async (option: ModeOption) => {
        if (!option.enabled || option.mode === null) return;
        if (option.mode === tftMode) return;

        if (isRunning) {
            toast.error('运行中无法切换模式');
            return;
        }

        const newMode = option.mode;
        setTftMode(newMode);
        // 播放一次确认切换的动画（卡片本身就是反馈，不再弹 toast）
        setJustSelectedKey(option.key);
        await window.lineup.setTftMode(newMode);
        // 切换模式后重新检查对应赛季是否有选中阵容
        await checkHasSelectedLineup(newMode);
    };

    /**
     * 根据 profileIconId 生成头像 URL
     * @param iconId - 头像图标 ID
     */
    const getAvatarUrl = (iconId: number): string => {
        return `${PROFILE_ICON_BASE_URL}${iconId}.jpg`;
    };

    /**
     * 主按钮的状态和文案，按顺序检查：
     * LOL 客户端 → 云顶之弈独立客户端 → 模式是否已适配 → 是否选择了阵容 → 可以开始
     * 运行中一律显示"停止挂机"（对局加载时云顶之弈窗口可能短暂消失，不能因此禁用停止）
     */
    const startButton: { variant: StartButtonVariant; icon: SvgIconComponent; label: string } =
        !isLcuConnected ? { variant: 'disabled', icon: BlockIcon, label: '未打开LOL客户端' }
        : isRunning ? { variant: 'running', icon: StopIcon, label: '停止挂机' }
        : !isTftClientOpen ? { variant: 'disabled', icon: TftIcon, label: '未打开云顶之弈' }
        : !isModeReady ? { variant: 'disabled', icon: LockIcon, label: '模式适配中' }
        : (needsLineup && !hasSelectedLineup) ? { variant: 'disabled', icon: BlockIcon, label: '未选择阵容' }
        : { variant: 'ready', icon: TftIcon, label: '开始挂机' };

    /** 顶部区域：已连接显示召唤师信息栏，否则显示欢迎面板 */
    const renderTopSection = () => {
        if (isLoading) {
            return (
                <WelcomePanel>
                    <WelcomeHint>正在获取召唤师信息...</WelcomeHint>
                </WelcomePanel>
            );
        }

        if (!isLcuConnected || !summonerInfo) {
            return (
                <WelcomePanel>
                    <AppIconContainer>
                        <RadarCircle />
                        <RadarCircleInner />
                        <AppIconImage src={appIconUrl} alt="App Icon" />
                    </AppIconContainer>
                    <WelcomeText>
                        <ProjectTitle>TFT-Hextech-Helper</ProjectTitle>
                        <WelcomeHint>
                            {isLcuConnected ? '未能获取召唤师信息，请确保已登录游戏客户端' : '等待英雄联盟客户端连接...'}
                        </WelcomeHint>
                        {/* 未检测到管理员权限时显示警告 */}
                        {isElevated === false && (
                            <AdminWarningBanner>
                                <WarningAmberIcon style={{ fontSize: '1rem' }} />
                                请以管理员模式运行本软件！(╯°□°)╯︵ ┻━┻
                            </AdminWarningBanner>
                        )}
                    </WelcomeText>
                </WelcomePanel>
            );
        }

        return (
            <ProfileBar>
                <AvatarFrame title={`${summonerInfo.gameName}#${summonerInfo.tagLine}`}>
                    <AvatarImage
                        src={getAvatarUrl(summonerInfo.profileIconId)}
                        alt="召唤师头像"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = getAvatarUrl(29);
                        }}
                    />
                    <LevelBadge>Lv.{summonerInfo.summonerLevel}</LevelBadge>
                </AvatarFrame>
                <ProfileInfo>
                    <ProfileName>
                        {summonerInfo.gameName}
                        <ProfileTag>#{summonerInfo.tagLine}</ProfileTag>
                    </ProfileName>
                    <ExpBar>
                        <ExpFill $percent={summonerInfo.percentCompleteForNextLevel} />
                    </ExpBar>
                    <ExpText>经验 {summonerInfo.xpSinceLastLevel} / {summonerInfo.xpUntilNextLevel}</ExpText>
                </ProfileInfo>
                <StatsGroup>
                    <StatItem>
                        <SportsEsportsIcon />
                        <StatText>
                            <StatLabel>本次挂机</StatLabel>
                            <StatValue>{statistics.sessionGamesPlayed} 局</StatValue>
                        </StatText>
                    </StatItem>
                    <StatItem>
                        <EmojiEventsIcon />
                        <StatText>
                            <StatLabel>累计挂机</StatLabel>
                            <StatValue>{statistics.totalGamesPlayed} 局</StatValue>
                        </StatText>
                    </StatItem>
                    <StatItem>
                        <AccessTimeIcon />
                        <StatText>
                            <StatLabel>运行时长</StatLabel>
                            <StatValue>{elapsedTime}</StatValue>
                        </StatText>
                    </StatItem>
                </StatsGroup>
            </ProfileBar>
        );
    };

    return (
        <PageWrapper>
            {renderTopSection()}

            {/* 模式选择 */}
            <ModeSection>
                <ModeGrid>
                    {MODE_OPTIONS.map(option => {
                        // "自然之力 恭喜发财" 拆成系列名 + 模式名两行显示
                        const [series, title] = option.name.includes(' ')
                            ? option.name.split(' ', 2)
                            : [null, option.name];
                        return (
                            <ModeCard
                                key={option.key}
                                type="button"
                                title={option.name}
                                $selected={option.enabled && option.mode === tftMode}
                                $locked={!option.enabled}
                                $justSelected={justSelectedKey === option.key}
                                aria-disabled={!option.enabled}
                                onClick={() => handleModeSelect(option)}
                                onAnimationEnd={(e) => {
                                    // 子元素的动画结束也会冒泡上来，只认卡片自己的
                                    if (e.target === e.currentTarget) setJustSelectedKey(null);
                                }}
                            >
                                <ModeArt $src={option.art} />
                                <ModeFrame />
                                <ModeStatus $ready={option.enabled}>{option.enabled ? (option.debugOnly ? '调试' : '可用') : '适配中'}</ModeStatus>
                                <ModeInfo>
                                    <ModeIconBadge>
                                        <ModeIconGlyph $src={option.iconUrl} />
                                    </ModeIconBadge>
                                    {series && <ModeSeries>{series}</ModeSeries>}
                                    <ModeName>{title}</ModeName>
                                    <ModeMeta>BETA · 队列 {option.queueId}</ModeMeta>
                                </ModeInfo>
                                {!option.enabled && (
                                    <ModeLockOverlay>
                                        <LockIcon />
                                        不许选，我还没适配呢！
                                    </ModeLockOverlay>
                                )}
                            </ModeCard>
                        );
                    })}
                </ModeGrid>
            </ModeSection>

            {/* 日志面板：标题栏中间是开始按钮 */}
            <LogPanel
                isVisible={true}
                headerBadge={stopAfterGame && (
                    <StopAfterGameBadge title="对局结束后自动停止挂机">
                        <TimerOffIcon />
                        <span>本局后停止</span>
                    </StopAfterGameBadge>
                )}
                headerCenter={<StartButton {...startButton} onClick={handleToggle}/>}
            />

            {/* 开始挂机前游戏窗口检查不通过时的提醒 */}
            <HextechDialog
                open={!!windowAlert}
                title={windowAlert?.title ?? ''}
                onClose={() => setWindowAlert(null)}
            >
                {windowAlert?.content}
            </HextechDialog>
        </PageWrapper>
    );
};
