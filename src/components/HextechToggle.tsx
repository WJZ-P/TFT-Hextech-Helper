/**
 * 海克斯风格开关
 * @description 用法：<ToggleSwitch onClick={...}><ToggleSlider $isOn={...} /></ToggleSwitch>
 *
 * 喵~ 交互设计：
 *   - 打开：金色小方块向右滑，同时顺时针滚半圈
 *   - 关闭：向左滑，逆时针滚回来（像真的在轨道上滚动）
 *   - 缓动用 easeOutBack，转过头一点再弹回来，显得更灵动
 *   - 用 transition 而不是 keyframes：页面刚加载时不会平白转一圈，只有切换时才动
 */

import styled from "styled-components";

/** 轨道尺寸（含 1px 边框） */
const TRACK_WIDTH = 54;
const TRACK_HEIGHT = 26;
/** 小方块边长，旋转到 45° 时对角线约 20px，轨道内高 24px 放得下 */
const KNOB_SIZE = 14;
/** 小方块离轨道内壁的距离 */
const KNOB_GAP = 5;
/** 小方块从左到右的滑动距离 */
const KNOB_TRAVEL = TRACK_WIDTH - 2 - KNOB_SIZE - KNOB_GAP * 2;
/** 打开时小方块转过的角度（180° = 半圈） */
const KNOB_ROTATION = 180;

/**
 * 打开后小方块是转过 KNOB_ROTATION 度才停下的，渐变和内高光也跟着转了。
 * 这里把"打开"状态的渐变角度和内高光偏移提前反向转回去，静止时光源仍然在左上方。
 *   - 渐变：默认 135deg（左上亮），反向补偿后是 135 - θ
 *   - 内高光：默认 inset 偏移 (0, 1px) 画在顶边，反向补偿后是 (sinθ, cosθ)
 */
const ON_GRADIENT_ANGLE = 135 - KNOB_ROTATION;
const ON_HIGHLIGHT_X = Math.round(Math.sin(KNOB_ROTATION * Math.PI / 180));
const ON_HIGHLIGHT_Y = Math.round(Math.cos(KNOB_ROTATION * Math.PI / 180));

/**
 * 回弹缓动（easeOutBack 系列）
 * 位置和旋转分开用两条曲线：旋转冲过头约 14%（半圈时 ≈25°），位置只冲过一点点，
 * 否则方块倾斜时的角会顶到轨道金边上
 */
const ROTATE_EASING = 'cubic-bezier(0.34, 1.8, 0.64, 1)';
const SLIDE_EASING = 'cubic-bezier(0.34, 1.25, 0.64, 1)';
const ROTATE_DURATION = '0.6s';
const SLIDE_DURATION = '0.45s';

export const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
  width: ${TRACK_WIDTH}px;
  height: ${TRACK_HEIGHT}px;
  cursor: pointer;
`;

export const ToggleSlider = styled.span<{ $isOn: boolean }>`
  position: absolute;
  inset: 0;
  border-radius: ${props => props.theme.borderRadius};
  /* 轨道：关闭是凹陷的暗槽，打开是深蓝渐变 + 金边 + 一圈淡淡的青色内发光 */
  background: ${props => props.$isOn
    ? 'linear-gradient(90deg, #0B3766 0%, #1857B0 100%)'
    : props.theme.colors.sidebarBg};
  border: 1px solid ${props => props.$isOn ? props.theme.colors.gold : props.theme.colors.goldDim};
  box-shadow: ${props => props.$isOn
    ? `inset 0 0 8px ${props.theme.colors.accentCyan}55, 0 0 8px ${props.theme.colors.accentCyan}2e`
    : 'inset 0 1px 3px rgba(0, 0, 0, 0.6)'};
  transition: border-color 0.3s ease, box-shadow 0.3s ease;

  /* 小方块：打开是带高光的金色宝石，关闭是暗淡的灰色 */
  &::before {
    content: '';
    position: absolute;
    top: ${(TRACK_HEIGHT - 2 - KNOB_SIZE) / 2}px;
    left: ${KNOB_GAP}px;
    width: ${KNOB_SIZE}px;
    height: ${KNOB_SIZE}px;
    background: ${props => props.$isOn
      ? `linear-gradient(${ON_GRADIENT_ANGLE}deg, ${props.theme.colors.goldBright} 0%, ${props.theme.colors.gold} 50%, ${props.theme.colors.goldDim} 100%)`
      : 'linear-gradient(135deg, #A09B8C 0%, #5B5A56 100%)'};
    box-shadow: ${props => props.$isOn
      ? `inset ${ON_HIGHLIGHT_X}px ${ON_HIGHLIGHT_Y}px 0 rgba(255, 255, 255, 0.55), 0 0 6px ${props.theme.colors.gold}aa`
      : 'inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 1px 2px rgba(0, 0, 0, 0.6)'};
    /* 用独立的 translate / rotate 属性（而不是一个 transform），这样两者能用不同的缓动曲线 */
    translate: ${props => props.$isOn ? `${KNOB_TRAVEL}px 0` : '0 0'};
    rotate: ${props => props.$isOn ? `${KNOB_ROTATION}deg` : '0deg'};
    transition:
      translate ${SLIDE_DURATION} ${SLIDE_EASING},
      rotate ${ROTATE_DURATION} ${ROTATE_EASING},
      box-shadow 0.3s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      transition: none;
    }
  }
`;
