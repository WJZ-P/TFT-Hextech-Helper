/**
 * 海克斯风格的通用样式片段
 * @description 各页面的 styled-components 通过 ${hextechPanel} 之类的方式复用，
 *              保证金边、面板、按钮在全应用里长得一样。
 *
 * 喵~ 视觉参考：云顶之弈客户端的弹窗（深色底板 + 细金边 + 内描边）、
 *     模式卡片（金框）和"开始游戏"按钮（亮蓝底 + 青色描边 + 金色外框）。
 */

import {css} from "styled-components";

/**
 * 金边面板：深色渐变底 + 金色外框 + 一圈很淡的内描边
 * 内描边用 inset box-shadow 实现，不占布局空间
 */
export const hextechPanel = css`
  background: ${props => props.theme.colors.panelBg};
  border: 1px solid ${props => props.theme.colors.goldDim};
  border-radius: ${props => props.theme.borderRadius};
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.6),
    inset 0 0 0 2px ${props => props.theme.colors.goldDeep}66,
    0 8px 24px rgba(0, 0, 0, 0.45);
`;

/** 小节标题：金色、字距拉开，左侧带一个小菱形装饰 */
export const hextechSectionTitle = css`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${props => props.theme.colors.goldBright};
  font-weight: 700;
  letter-spacing: 2px;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    flex-shrink: 0;
    transform: rotate(45deg);
    background: ${props => props.theme.colors.gold};
    box-shadow: 0 0 6px ${props => props.theme.colors.gold}99;
  }
`;

/** 按钮公共部分：方角、金边、去掉默认外观 */
const hextechButtonBase = css`
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 1.2rem;
  font-size: ${props => props.theme.fontSizes.small};
  font-weight: 600;
  letter-spacing: 1px;
  border-radius: ${props => props.theme.borderRadius};
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    box-shadow: none;
  }

  &:focus-visible {
    outline: 1px solid ${props => props.theme.colors.goldBright};
    outline-offset: 2px;
  }
`;

/** 次要按钮：深色底 + 金边（对应客户端弹窗里的"取消 ✕"） */
export const hextechButtonGhost = css`
  ${hextechButtonBase};
  background: ${props => props.theme.colors.buttonBg};
  border: 1px solid ${props => props.theme.colors.goldDim};
  color: ${props => props.theme.colors.goldBright};

  &:hover:not(:disabled) {
    border-color: ${props => props.theme.colors.gold};
    background: ${props => props.theme.colors.buttonBgHover};
    box-shadow: 0 0 10px ${props => props.theme.colors.gold}33;
  }
`;

/** 确认按钮：古铜色渐变 + 金边（对应客户端弹窗里的"确认 ✓"） */
export const hextechButtonGold = css`
  ${hextechButtonBase};
  background: linear-gradient(180deg, #7A5A30 0%, #4A361C 100%);
  border: 1px solid ${props => props.theme.colors.gold};
  color: ${props => props.theme.colors.goldBright};

  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #8C6A3A 0%, #5A4222 100%);
    box-shadow: 0 0 12px ${props => props.theme.colors.gold}55;
  }
`;

/** 主按钮：亮蓝渐变 + 青色描边（对应客户端的"开始游戏"） */
export const hextechButtonPrimary = css`
  ${hextechButtonBase};
  background: linear-gradient(180deg, #2A7BEA 0%, #1450B8 100%);
  border: 1px solid ${props => props.theme.colors.accentCyan};
  color: #FFFFFF;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);

  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #3A8BFA 0%, #1C5CC8 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 0 14px ${props => props.theme.colors.accentCyan}66;
  }
`;

/** 危险按钮：暗红渐变 + 红边（删除、强制结束等） */
export const hextechButtonDanger = css`
  ${hextechButtonBase};
  background: linear-gradient(180deg, #6E1E28 0%, #3E0F16 100%);
  border: 1px solid ${props => props.theme.colors.error};
  color: #FFE5E8;

  &:hover:not(:disabled) {
    background: linear-gradient(180deg, #82242F 0%, #4C131B 100%);
    box-shadow: 0 0 12px ${props => props.theme.colors.error}55;
  }
`;
