/**
 * 游戏浮窗的 React 入口
 * @description 独立于主应用的浮窗渲染入口，
 *              由 main.ts 创建的 overlayWindow 加载此页面
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { OverlayApp } from './OverlayApp';

ReactDOM.createRoot(document.getElementById('overlay-root')!).render(
    <React.StrictMode>
        <OverlayApp />
    </React.StrictMode>,
);
