import {useEffect, useRef} from 'react';
import styled from 'styled-components';
import type {SvgIconComponent} from '@mui/icons-material';
import {usePageActive} from '../hooks/usePageActive';
import {StartButtonRenderer, type StartButtonVariant} from './startButtonRenderer';

export type {StartButtonVariant} from './startButtonRenderer';

/** 各状态的文字、图标颜色，以及图标光晕 */
const CONTENT_STYLE: Record<StartButtonVariant, { text: string; icon: string; shadow: string; iconGlow: string }> = {
    ready: {
        text: '#FFFFFF',
        icon: '#E5EBFF',
        shadow: '0 2px 2px rgba(8, 28, 84, 0.75), 0 0 3px rgba(8, 28, 84, 0.45)',
        iconGlow: 'drop-shadow(0 0 3px #1D5CCE)',
    },
    running: {
        text: '#FFFFFF',
        icon: '#FFF3DC',
        shadow: '0 2px 2px rgba(70, 20, 4, 0.8), 0 0 3px rgba(70, 20, 4, 0.45)',
        iconGlow: 'drop-shadow(0 0 3px #A5481A)',
    },
    disabled: {
        text: '#7C8288',
        icon: '#7C8288',
        shadow: 'none',
        iconGlow: 'none',
    },
};

/** 外观全部由 canvas 绘制，这里只负责尺寸和点击区域 */
const ButtonRoot = styled.button<{ $variant: StartButtonVariant }>`
  appearance: none;
  position: relative;
  display: block;
  /* 各状态文案长短不一，固定宽度避免切换状态时按钮跳动 */
  width: 270px;
  height: 60px;
  padding: 0;
  border: none;
  border-radius: 30px 0 0 30px;
  background: none;
  cursor: ${props => props.$variant === 'disabled' ? 'not-allowed' : 'pointer'};

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: none;
  }

  /* 日志标题栏太窄时（如展开侧边栏）收窄，给两侧留位置 */
  @container (max-width: 720px) {
    width: 225px;
  }
`;

const Canvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
`;

const Content = styled.span<{ $variant: StartButtonVariant }>`
  position: absolute;
  /* 左边让出半圆边框，右边让出箭头 */
  inset: 0 34px 0 20px;
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${props => CONTENT_STYLE[props.$variant].text};
  text-shadow: ${props => CONTENT_STYLE[props.$variant].shadow};
  pointer-events: none;

  .MuiSvgIcon-root {
    flex-shrink: 0;
    font-size: 1.7rem;
    color: ${props => CONTENT_STYLE[props.$variant].icon};
    filter: ${props => CONTENT_STYLE[props.$variant].iconGlow};
  }
`;

const Label = styled.span`
  flex: 1;
  text-align: center;
  white-space: nowrap;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 2px;

  @container (max-width: 720px) {
    font-size: 1rem;
    letter-spacing: 0;
  }
`;

interface StartButtonProps {
    variant: StartButtonVariant;
    icon: SvgIconComponent;
    label: string;
    onClick: () => void;
}

/** 主页的开始 / 停止按钮，仿云顶之弈客户端的"开始游戏"按钮 */
export const StartButton = ({variant, icon: Icon, label, onClick}: StartButtonProps) => {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rendererRef = useRef<StartButtonRenderer | null>(null);
    const isPageActive = usePageActive();

    useEffect(() => {
        const button = buttonRef.current;
        const canvas = canvasRef.current;
        if (!button || !canvas) return;

        const renderer = new StartButtonRenderer(canvas, button, variant);
        rendererRef.current = renderer;
        const observer = new ResizeObserver(() => renderer.resize());
        observer.observe(button);

        return () => {
            observer.disconnect();
            renderer.stop();
            rendererRef.current = null;
        };
        // 状态变化由下面的 effect 通知 renderer，不需要重建
    }, []);

    useEffect(() => {
        rendererRef.current?.setVariant(variant);
    }, [variant]);

    // 页面切走时停止绘制
    useEffect(() => {
        if (!isPageActive) return;
        const renderer = rendererRef.current;
        renderer?.start();
        return () => renderer?.stop();
    }, [isPageActive]);

    return (
        <ButtonRoot
            ref={buttonRef}
            type="button"
            $variant={variant}
            disabled={variant === 'disabled'}
            onClick={onClick}
        >
            <Canvas ref={canvasRef} aria-hidden/>
            <Content $variant={variant}>
                <Icon/>
                <Label>{label}</Label>
            </Content>
        </ButtonRoot>
    );
};
