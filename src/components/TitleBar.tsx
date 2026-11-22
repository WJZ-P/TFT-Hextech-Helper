/**
 * 自绘标题栏
 * @description 主窗口是无边框的（frame: false），标题栏由这里绘制：
 *              左侧图标 + 标题（可拖动窗口、双击最大化），右侧最小化 / 最大化 / 关闭按钮。
 *              风格参考英雄联盟客户端顶部：深色底、金色图标，hover 时变亮。
 */

import {useEffect, useState} from "react";
import styled from "styled-components";
import RemoveIcon from '@mui/icons-material/Remove';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import CloseIcon from '@mui/icons-material/Close';
import appIconUrl from '../../public/icon.png';

const Bar = styled.header`
  height: ${props => props.theme.titleBarHeight}px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  background: ${props => props.theme.colors.titleBarBg};
  /* 底部一条暗金线 + 一条更淡的金色高光，和面板金边呼应 */
  border-bottom: 1px solid ${props => props.theme.colors.goldDim};
  box-shadow: 0 1px 0 ${props => props.theme.colors.goldDeep}80;
  position: relative;
  z-index: 2000;
  user-select: none;
  /* 整条标题栏都可以拖动窗口，按钮区域单独设为 no-drag */
  -webkit-app-region: drag;
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  min-width: 0;
`;

const BrandIcon = styled.img`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid ${props => props.theme.colors.goldDim};
`;

const BrandTitle = styled.span`
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: ${props => props.theme.colors.goldBright};
  white-space: nowrap;
`;

const BrandSubtitle = styled.span`
  font-size: 0.72rem;
  letter-spacing: 1px;
  color: ${props => props.theme.colors.textSecondary};
  white-space: nowrap;
`;

const Controls = styled.div`
  margin-left: auto;
  display: flex;
  height: 100%;
  -webkit-app-region: no-drag;
`;

const ControlButton = styled.button<{ $danger?: boolean }>`
  appearance: none;
  border: none;
  width: 46px;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: ${props => props.theme.colors.gold};
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;

  .MuiSvgIcon-root {
    font-size: 1rem;
  }

  &:hover {
    color: ${props => props.$danger ? '#FFFFFF' : props.theme.colors.goldBright};
    background: ${props => props.$danger ? `${props.theme.colors.error}d9` : `${props.theme.colors.gold}1f`};
  }

  &:focus-visible {
    outline: 1px solid ${props => props.theme.colors.goldBright};
    outline-offset: -2px;
  }
`;

export const TitleBar = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        window.windowControls.isMaximized().then(setIsMaximized);
        // 双击标题栏、Win+方向键等系统操作也会改变最大化状态，统一由主进程推送
        return window.windowControls.onMaximizedChange(setIsMaximized);
    }, []);

    return (
        <Bar>
            <Brand>
                <BrandIcon src={appIconUrl} alt="" />
                <BrandTitle>海克斯科技助手</BrandTitle>
                <BrandSubtitle>TFT Hextech Helper</BrandSubtitle>
            </Brand>
            <Controls>
                <ControlButton type="button" title="最小化" onClick={() => window.windowControls.minimize()}>
                    <RemoveIcon />
                </ControlButton>
                <ControlButton type="button" title={isMaximized ? '还原' : '最大化'} onClick={() => window.windowControls.toggleMaximize()}>
                    {isMaximized ? <FilterNoneIcon style={{ fontSize: '0.85rem' }} /> : <CropSquareIcon />}
                </ControlButton>
                <ControlButton type="button" title="关闭" $danger onClick={() => window.windowControls.close()}>
                    <CloseIcon />
                </ControlButton>
            </Controls>
        </Bar>
    );
};
