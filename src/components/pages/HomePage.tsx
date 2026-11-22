import {useState, useEffect, useCallback, type ReactNode} from 'react';
import styled, { css, keyframes } from 'styled-components';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import BlockIcon from '@mui/icons-material/Block';
import LockIcon from '@mui/icons-material/Lock';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import TimerOffIcon from '@mui/icons-material/TimerOff';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import MilitaryTechIcon from '@mui/icons-material/MilitaryTech';
import PaidIcon from '@mui/icons-material/Paid';
import PeopleIcon from '@mui/icons-material/People';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import type { SvgIconComponent } from '@mui/icons-material';
import {ThemeType} from "../../styles/theme.ts";
import {hextechPanel, hextechSectionTitle} from "../../styles/hextech.ts";
import {LogPanel} from "../LogPanel.tsx";
import {HextechDialog} from "../HextechDialog.tsx";
import {toast} from "../toast/toast-core.ts";
import {SummonerInfo} from "../../../src-backend/lcu/utils/LCUProtocols.ts";
import {TFTMode} from "../../../src-backend/TFTProtocol.ts";
import {LogMode} from "../../../src-backend/types/AppTypes.ts";
import {settingsStore, GameStatistics} from "../../stores/settingsStore.ts";

// 导入 APP 图标（让 Vite 正确处理资源路径）
import appIconUrl from '../../../public/icon.png';

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

/** 主按钮表面的流光 */
const shimmer = keyframes`
  0% { transform: translateX(-120%) skewX(-20deg); }
  60%, 100% { transform: translateX(320%) skewX(-20deg); }
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
    ${props => props.theme.colors.background};
`;

/** 小节标题行：左边标题，右边说明文字 */
const SectionHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${props => props.theme.spacing.medium};
  margin-bottom: ${props => props.theme.spacing.small};
`;

const SectionTitle = styled.h2`
  ${hextechSectionTitle};
  font-size: 0.95rem;
`;

const SectionHint = styled.span`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
`;

// ============================================
// 召唤师信息栏
// ============================================

const ProfileBar = styled.div`
  ${hextechPanel};
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

const ModeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
`;

/** 卡片右下角的"不许选"遮罩，hover 未适配的卡片时显示 */
const ModeLockOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: ${props => props.theme.colors.goldBright};
  background: rgba(1, 10, 19, 0.82);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;

  .MuiSvgIcon-root {
    font-size: 1.2rem;
    color: ${props => props.theme.colors.error};
  }
`;

const ModeCard = styled.button<{ $accent: string; $selected: boolean; $locked: boolean }>`
  appearance: none;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-height: 104px;
  padding: 12px;
  text-align: left;
  color: inherit;
  font: inherit;
  overflow: hidden;
  cursor: ${props => props.$locked ? 'not-allowed' : 'pointer'};
  border-radius: ${props => props.theme.borderRadius};
  /* 每个模式带一点自己的色调，从左上角往右下渐隐 */
  background:
    radial-gradient(circle at 0% 0%, ${props => props.$accent}38 0%, transparent 65%),
    ${props => props.theme.colors.panelBg};
  border: 1px solid ${props => props.$selected ? props.theme.colors.accentCyan : props.theme.colors.goldDim};
  box-shadow: ${props => props.$selected
    ? `0 0 0 1px ${props.theme.colors.accentCyan}55, 0 0 18px ${props.theme.colors.accentCyan}40`
    : `inset 0 0 0 1px rgba(0, 0, 0, 0.5)`};
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  /* 顶部一条亮线，选中时变青色 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 12px;
    right: 12px;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${props => props.$selected ? props.theme.colors.accentCyan : props.theme.colors.gold}, transparent);
    opacity: ${props => props.$selected ? 1 : 0.5};
  }

  ${props => props.$locked ? css`
    > :not(${ModeLockOverlay}) {
      filter: saturate(0.55) brightness(0.8);
    }
    &:hover ${ModeLockOverlay} {
      opacity: 1;
    }
  ` : css`
    &:hover {
      border-color: ${props.$selected ? props.theme.colors.accentCyan : props.theme.colors.gold};
      transform: translateY(-2px);
    }
  `}

  &:focus-visible {
    outline: 1px solid ${props => props.theme.colors.goldBright};
    outline-offset: 2px;
  }
`;

/** 模式图标：金框小方块 */
const ModeIconBadge = styled.div<{ $accent: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid ${props => props.theme.colors.gold};
  background: ${props => props.$accent}26;
  transform: rotate(45deg);
  margin: 4px 0 4px 4px;

  .MuiSvgIcon-root {
    transform: rotate(-45deg);
    font-size: 1.05rem;
    color: ${props => props.theme.colors.goldBright};
  }
`;

const ModeName = styled.div`
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1.3;
  color: ${props => props.theme.colors.goldBright};
`;

const ModeMeta = styled.div`
  font-size: 0.72rem;
  color: ${props => props.theme.colors.textSecondary};
`;

/** 卡片右上角的状态角标 */
const ModeStatus = styled.span<{ $ready: boolean }>`
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 1px 6px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: ${props => props.$ready ? props.theme.colors.accentCyan : props.theme.colors.gold};
  border: 1px solid ${props => props.$ready ? props.theme.colors.accentCyan : props.theme.colors.goldDim};
  background: rgba(1, 10, 19, 0.6);
`;

// ============================================
// 开始按钮行
// ============================================

/** 三栏：左当前模式说明 | 中开始按钮 | 右日志等级 */
const ControlRow = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: ${props => props.theme.spacing.medium};
  flex-shrink: 0;
`;

const ControlInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};

  strong {
    color: ${props => props.theme.colors.goldBright};
    font-weight: 700;
  }
`;

/** "本局结束后停止"提示 */
const StopAfterGameBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  align-self: flex-start;
  padding: 2px 8px;
  color: ${props => props.theme.colors.accentCyan};
  border: 1px solid ${props => props.theme.colors.accentCyan}66;
  background: ${props => props.theme.colors.accentCyan}14;
  animation: ${slideIn} 0.25s ease-out;

  .MuiSvgIcon-root {
    font-size: 0.95rem;
  }
`;

type StartButtonVariant = 'ready' | 'running' | 'disabled';

/** 按钮右侧的箭头形状（客户端"开始游戏"按钮的轮廓） */
const ARROW_SHAPE = 'polygon(0 0, calc(100% - 18px) 0, 100% 50%, calc(100% - 18px) 100%, 0 100%)';

/**
 * 主按钮外层：负责发光
 * 光晕要放在外层用 filter 做 —— 内层用了 clip-path，自己的 box-shadow 会被裁掉
 */
const StartButtonGlow = styled.div<{ $variant: StartButtonVariant }>`
  filter: ${props => {
    if (props.$variant === 'ready') return `drop-shadow(0 0 10px ${props.theme.colors.accentCyan}55)`;
    if (props.$variant === 'running') return `drop-shadow(0 0 10px ${props.theme.colors.gold}55)`;
    return 'none';
  }};
  transition: filter 0.2s ease;

  &:hover {
    filter: ${props => {
      if (props.$variant === 'ready') return `drop-shadow(0 0 16px ${props.theme.colors.accentCyan}88)`;
      if (props.$variant === 'running') return `drop-shadow(0 0 16px ${props.theme.colors.gold}88)`;
      return 'none';
    }};
  }
`;

/** 主按钮：外层是金框（2px 的金色底透出来），内层是按钮本体 */
const StartButton = styled.button<{ $variant: StartButtonVariant }>`
  appearance: none;
  border: none;
  padding: 2px;
  min-width: 240px;
  cursor: ${props => props.$variant === 'disabled' ? 'not-allowed' : 'pointer'};
  clip-path: ${ARROW_SHAPE};
  background: ${props => props.$variant === 'disabled'
    ? props.theme.colors.goldDim
    : `linear-gradient(180deg, ${props.theme.colors.goldBright} 0%, ${props.theme.colors.gold} 50%, ${props.theme.colors.goldDim} 100%)`};
  transition: transform 0.15s ease;

  &:active {
    transform: ${props => props.$variant === 'disabled' ? 'none' : 'scale(0.98)'};
  }

  &:focus-visible {
    outline: none;
  }
`;

const StartButtonInner = styled.span<{ $variant: StartButtonVariant }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 50px;
  padding: 0 40px 0 28px;
  overflow: hidden;
  clip-path: ${ARROW_SHAPE};
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 4px;
  color: ${props => {
    if (props.$variant === 'disabled') return props.theme.colors.textDisabled;
    if (props.$variant === 'running') return props.theme.colors.goldBright;
    return '#FFFFFF';
  }};
  text-shadow: ${props => props.$variant === 'disabled' ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.5)'};
  background: ${props => {
    if (props.$variant === 'disabled') return props.theme.colors.buttonBg;
    if (props.$variant === 'running') return 'linear-gradient(180deg, #7A5A30 0%, #3F2E17 100%)';
    return 'linear-gradient(180deg, #3A8EF6 0%, #1A5BD0 55%, #0F3E9E 100%)';
  }};
  /* 内描边：就绪时是青色，跟客户端按钮一样 */
  box-shadow: inset 0 0 0 1px ${props => {
    if (props.$variant === 'ready') return props.theme.colors.accentCyan;
    if (props.$variant === 'running') return props.theme.colors.gold;
    return props.theme.colors.goldDeep;
  }};

  /* 表面流光，禁用时不播放 */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 30%;
    height: 100%;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.28) 50%, transparent 100%);
    animation: ${shimmer} 3.2s ease-in-out infinite;
    display: ${props => props.$variant === 'disabled' ? 'none' : 'block'};
    pointer-events: none;
  }

  .MuiSvgIcon-root {
    font-size: 1.5rem;
  }
`;

/** 日志等级切换：方角分段按钮 */
const LogLevelGroup = styled.div`
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
`;

const SegmentedControl = styled.div`
  display: flex;
  border: 1px solid ${props => props.theme.colors.goldDim};
  background: ${props => props.theme.colors.sidebarBg};
`;

const SegmentButton = styled.button<{ $active: boolean }>`
  appearance: none;
  border: none;
  padding: 4px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: pointer;
  color: ${props => props.$active ? props.theme.colors.goldBright : props.theme.colors.textSecondary};
  background: ${props => props.$active ? `${props.theme.colors.primary}33` : 'transparent'};
  box-shadow: ${props => props.$active ? `inset 0 -2px 0 ${props.theme.colors.accentCyan}` : 'none'};
  transition: color 0.2s ease, background 0.2s ease;

  &:not(:first-child) {
    border-left: 1px solid ${props => props.theme.colors.goldDeep};
  }

  &:hover {
    color: ${props => props.theme.colors.goldBright};
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
    /** 卡片图标 */
    icon: SvgIconComponent;
    /** 卡片的点缀色 */
    accent: string;
    /** 是否已适配、允许选择 */
    enabled: boolean;
}

/**
 * 模式列表，和云顶之弈（虚幻客户端）当前开放的队列一一对应：
 *   自然之力 匹配 1090 / 排位 1100 / 恭喜发财 6080 / 双人作战 1160、发条鸟的试炼 1220
 *
 * S18「自然之力」的对局内识别还没有适配，所以目前全部是"适配中"状态，点击无效。
 * 以后适配了某个模式，把它的 enabled 改成 true（没有 mode 的还要先在后端加 TFTMode）即可。
 */
const MODE_OPTIONS: ModeOption[] = [
    { key: 'NATURE_NORMAL', name: '自然之力 匹配', queueId: 1090, mode: TFTMode.NORMAL, icon: SportsEsportsIcon, accent: '#2F8BFF', enabled: false },
    { key: 'NATURE_RANK', name: '自然之力 排位', queueId: 1100, mode: TFTMode.RANK, icon: MilitaryTechIcon, accent: '#C8AA6E', enabled: false },
    { key: 'NATURE_TREASURE', name: '自然之力 恭喜发财', queueId: 6080, mode: null, icon: PaidIcon, accent: '#E8A33D', enabled: false },
    { key: 'NATURE_DOUBLE', name: '自然之力 双人作战', queueId: 1160, mode: null, icon: PeopleIcon, accent: '#B57BFF', enabled: false },
    { key: 'CLOCKWORK', name: '发条鸟的试炼', queueId: 1220, mode: TFTMode.CLOCKWORK_TRAILS, icon: PrecisionManufacturingIcon, accent: '#0AC8B9', enabled: false },
];

/** 默认模式：历史配置里的模式已下线/未适配时，兜底切到这里 */
const DEFAULT_TFT_MODE = TFTMode.NORMAL;

/** 判断某个模式当前是否可选 */
const isSelectableMode = (mode: string): boolean =>
    MODE_OPTIONS.some(option => option.enabled && option.mode === mode);

/** 是否还没有任何模式适配完成 */
const NO_MODE_READY = !MODE_OPTIONS.some(option => option.enabled);

// ============================================
// 组件主体
// ============================================

export const HomePage = () => {
    const [isRunning, setIsRunning] = useState(false);
    const [summonerInfo, setSummonerInfo] = useState<SummonerInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // 新增：跟踪 LCU 连接状态
    const [isLcuConnected, setIsLcuConnected] = useState(false);
    // 新增：TFT 游戏模式
    const [tftMode, setTftMode] = useState<TFTMode>(DEFAULT_TFT_MODE);
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
            // NORMAL / RANK / CLOCKWORK_TRAILS → 当前主赛季（S17 星神）
            // S4_RUISHOU → S4 回归赛季
            const season = (mode === TFTMode.S4_RUISHOU) ? 'S4' : 'S17';

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
            // 赛季字符串与 checkHasSelectedLineup 保持一致：非 S4 模式走当前主赛季 S17
            const season = (tftMode === TFTMode.S4_RUISHOU) ? 'S4' : 'S17';
            const [seasonLineups, selectedIds] = await Promise.all([
                window.lineup.getAll(season),
                window.lineup.getSelectedIds(),
            ]);
            const seasonIds = new Set((seasonLineups || []).map((l: any) => l.id));
            const hasSelection = (selectedIds || []).some((id: string) => seasonIds.has(id));

            if (!hasSelection) {
                const seasonName = tftMode === TFTMode.S4_RUISHOU ? '瑞兽闹新春' : 'S17 星神';
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
        await window.lineup.setTftMode(newMode);
        // 切换模式后重新检查对应赛季是否有选中阵容
        await checkHasSelectedLineup(newMode);
        toast.success(`已切换到${option.name}`);
    };

    /**
     * 切换日志模式（简略/详细）
     *
     * 交互说明：
     * - 简略模式：不打印 debug 级别日志，日志更简洁
     * - 详细模式：打印所有日志（包括 debug），方便调试
     */
    const handleLogModeChange = async (newMode: LogMode) => {
        if (newMode === logMode) return;
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

    /** 主按钮的状态和文案（按优先级判断） */
    const startButton: { variant: StartButtonVariant; icon: SvgIconComponent; label: string } =
        !isLcuConnected ? { variant: 'disabled', icon: BlockIcon, label: '未检测到客户端' }
        : isRunning ? { variant: 'running', icon: StopIcon, label: '停止挂机' }
        : !isModeReady ? { variant: 'disabled', icon: LockIcon, label: '模式适配中' }
        : (needsLineup && !hasSelectedLineup) ? { variant: 'disabled', icon: BlockIcon, label: '未选择阵容' }
        : { variant: 'ready', icon: PlayArrowIcon, label: '开始挂机' };
    const StartIcon = startButton.icon;

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
            <section>
                <SectionHeader>
                    <SectionTitle>游戏模式</SectionTitle>
                    {NO_MODE_READY && <SectionHint>S18「自然之力」正在适配中，暂时只能看不能选</SectionHint>}
                </SectionHeader>
                <ModeGrid>
                    {MODE_OPTIONS.map(option => {
                        const Icon = option.icon;
                        return (
                            <ModeCard
                                key={option.key}
                                type="button"
                                $accent={option.accent}
                                $selected={option.enabled && option.mode === tftMode}
                                $locked={!option.enabled}
                                aria-disabled={!option.enabled}
                                onClick={() => handleModeSelect(option)}
                            >
                                <ModeIconBadge $accent={option.accent}>
                                    <Icon />
                                </ModeIconBadge>
                                <ModeName>{option.name}</ModeName>
                                <ModeMeta>BETA · 队列 {option.queueId}</ModeMeta>
                                <ModeStatus $ready={option.enabled}>{option.enabled ? '可用' : '适配中'}</ModeStatus>
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
            </section>

            {/* 开始按钮行 */}
            <ControlRow>
                <ControlInfo>
                    <span>当前模式：<strong>{activeOption?.name ?? '未选择'}</strong></span>
                    {stopAfterGame && (
                        <StopAfterGameBadge>
                            <TimerOffIcon />
                            对局结束后自动停止挂机
                        </StopAfterGameBadge>
                    )}
                </ControlInfo>

                <StartButtonGlow $variant={startButton.variant}>
                    <StartButton
                        type="button"
                        $variant={startButton.variant}
                        onClick={handleToggle}
                        aria-disabled={startButton.variant === 'disabled'}
                    >
                        <StartButtonInner $variant={startButton.variant}>
                            <StartIcon />
                            {startButton.label}
                        </StartButtonInner>
                    </StartButton>
                </StartButtonGlow>

                <LogLevelGroup>
                    日志等级
                    <SegmentedControl>
                        <SegmentButton
                            type="button"
                            $active={logMode === LogMode.SIMPLE}
                            onClick={() => handleLogModeChange(LogMode.SIMPLE)}
                        >
                            简略
                        </SegmentButton>
                        <SegmentButton
                            type="button"
                            $active={logMode === LogMode.DETAILED}
                            onClick={() => handleLogModeChange(LogMode.DETAILED)}
                        >
                            详细
                        </SegmentButton>
                    </SegmentedControl>
                </LogLevelGroup>
            </ControlRow>

            {/* 日志面板 */}
            <LogPanel isVisible={true} />

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
