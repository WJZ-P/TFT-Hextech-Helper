import React, { useState, useEffect } from 'react';
import {Outlet} from "react-router-dom";
import Sidebar from "./Sidebar.tsx";
import styled from "styled-components";
import { HelpModal } from "./HelpModal.tsx";
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

const LayoutContainer = styled.div`
  /* 对应 h-screen 和 w-screen，让布局撑满整个视口 */
  height: 100vh;
  width: 100vw;

  /* 对应 flex */
  display: flex;

  /* 对应 bg-gray-800，一个舒适的深灰色背景 */
  background-color: ${props => props.theme.colors.background};

  /* 对应 antialiased，让字体渲染更平滑 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  position: relative;
`;

// 喵~ 2. 为 main 标签创建一个样式组件
const MainContent = styled.main`
  /* 对应 flex-1，让主内容区占据所有剩余空间 */
  flex: 1;

  /* 对应 overflow-y-auto，当内容超长时显示垂直滚动条 */
  overflow-y: auto;
`;

const HelpFab = styled.button`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 24px;
  background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.primaryHover} 100%);
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 100;
  
  &:hover {
    transform: scale(1.1) rotate(5deg);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
  }
  
  &:active {
    transform: scale(0.95);
  }
  
  .MuiSvgIcon-root {
    font-size: 1.5rem;
  }
`;

const MainLayout = () => {
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F1') {
                e.preventDefault();
                setIsHelpOpen(prev => !prev);
            }
            if (e.key === 'Escape' && isHelpOpen) {
                setIsHelpOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHelpOpen]);

    return (
        <LayoutContainer>
            <Sidebar/>
            <MainContent>
                {/* 路由匹配到的页面组件，将会在这里显示 */}
                <Outlet/>
            </MainContent>
            
            <HelpFab onClick={() => setIsHelpOpen(true)} title="打开帮助 (F1)">
                <HelpOutlineIcon />
            </HelpFab>
            
            <HelpModal 
                isOpen={isHelpOpen} 
                onClose={() => setIsHelpOpen(false)} 
            />
        </LayoutContainer>
    )
}

export default MainLayout;
