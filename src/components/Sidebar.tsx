// --- 图标组件 ---
import {NavLink} from "react-router-dom";
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import BoltIcon from '@mui/icons-material/Bolt';
import styled, {ThemeContext} from "styled-components";
import React, {useContext, useRef, useState} from "react"; // 一个好看的闪电图标给 Logo
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HomeIcon from '@mui/icons-material/Home'; // 新增：导入 Home 图标

const navItems = [
    {path: '/',label:'主界面',icon:HomeIcon},
    {path: '/dashboard', label: '仪表盘', icon: DashboardIcon},
    {path: '/settings', label: '设置', icon: SettingsIcon},
]

// 喵~ 这是一个新的组件，专门用来包裹需要“消失”的文字
const LinkText = styled.span<{ $isCollapsed: boolean }>`
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  width: ${props => props.$isCollapsed ? '0' : 'auto'};
  transition: opacity 0.2s ease-in-out, width 0.2s ease-in-out;
  white-space: nowrap;
  overflow: hidden;
`;

const SidebarContainer = styled.aside<{ $isCollapsed: boolean }>`
  background-color: ${props => props.theme.colors.sidebarBg};
  color: ${props => props.theme.colors.text};
  display: flex;
  flex-direction: column;
  padding: ${props => props.theme.spacing.medium};
  border-right: 1.5px solid ${props => props.theme.colors.border};
  flex-shrink: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* 喵~ 宽度现在由 theme 和 isCollapsed 状态共同决定！*/
  width: ${props => props.$isCollapsed 
    ? props.theme.sidebar.collapsedWidth 
    : props.theme.sidebar.width}px;
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  justify-content: center;

  /* MUI的组件设置 */

  .MuiSvgIcon-root {
    color: ${props => props.theme.colors.primaryHover};
    font-size: 2rem;
  }
`;

const Nav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;


const StyledNavLink = styled(NavLink)<{ $isCollapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease-in-out;
  border-radius: ${props => props.theme.borderRadius};
  color: ${props => props.theme.colors.textSecondary};
  overflow: hidden;

  .MuiSvgIcon-root {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  &:hover {
    background-color: ${props => props.theme.colors.elementHover};
    color: ${props => props.theme.colors.text};
  }

  &.active {
    background-color: ${props => props.theme.colors.navActiveBg};
    color: ${props => props.theme.colors.navActiveText};
    .MuiSvgIcon-root {
      color: ${props => props.theme.colors.navActiveText};
    }
  }
`;

const Version = styled.div`
  margin-top: auto;
  text-align: center;
  font-size: 0.75rem;
  color: #4a5568;
`;

const ToggleButton = styled.button`
  margin-top: auto;
  background-color: ${props => props.theme.colors.elementHover};
  color: ${props => props.theme.colors.textSecondary};
  border: none;
  border-radius: ${props => props.theme.borderRadius};
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease-in-out;

  &:hover {
    color: ${props => props.theme.colors.text};
    background-color: ${props => props.theme.colors.primary};
  }
`;

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <SidebarContainer $isCollapsed={isCollapsed}>
      <Logo>
        <BoltIcon />
        <LinkText $isCollapsed={isCollapsed}>海克斯科技助手</LinkText>
      </Logo>
      <Nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <StyledNavLink key={item.path} to={item.path} $isCollapsed={isCollapsed}>
              <Icon />
              <LinkText $isCollapsed={isCollapsed}>{item.label}</LinkText>
            </StyledNavLink>
          );
        })}
      </Nav>
      <ToggleButton onClick={() => setIsCollapsed(!isCollapsed)}>
        {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
      </ToggleButton>
    </SidebarContainer>
  );
};

export default Sidebar;