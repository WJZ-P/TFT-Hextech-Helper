// --- 图标组件 ---
import {NavLink} from "react-router-dom";
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import BoltIcon from '@mui/icons-material/Bolt';
import styled from "styled-components";
import React, {useEffect, useState} from "react";
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HomeIcon from '@mui/icons-material/Home';
import ExtensionIcon from '@mui/icons-material/Extension';
import { settingsStore } from "../stores/settingsStore";
import type { SvgIconComponent } from "@mui/icons-material";
import { RoutePath } from "../constants/routes";
import { hextechButtonGhost } from "../styles/hextech";

// 导航项类型定义
interface NavItem {
    path: RoutePath;  // 使用枚举类型，类型更安全
    label: string;
    icon: SvgIconComponent;
    show: boolean;  // 是否显示
}

// 导航项初始配置（默认全部显示）
const defaultNavItems: NavItem[] = [
    { path: RoutePath.HOME, label: '主界面', icon: HomeIcon, show: true },
    { path: RoutePath.LINEUPS, label: '阵容搭配', icon: ExtensionIcon, show: true },
    { path: RoutePath.DEBUG, label: '调试页', icon: DashboardIcon, show: true },
    { path: RoutePath.SETTINGS, label: '设置', icon: SettingsIcon, show: true },
];

// 喵~ 这是一个新的组件，专门用来包裹需要“消失”的文字
const LinkText = styled.span<{ $isCollapsed: boolean }>`
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  width: ${props => props.$isCollapsed ? '0' : 'auto'};
  transition: opacity 0.2s ease-in-out, width 0.2s ease-in-out;
  white-space: nowrap;
  overflow: hidden;
`;

const SidebarContainer = styled.aside<{ $isCollapsed: boolean }>`
  background: ${props => props.theme.colors.sidebarGlassBg};
  backdrop-filter: blur(8px);
  color: ${props => props.theme.colors.text};
  display: flex;
  flex-direction: column;
  padding: ${props => props.theme.spacing.medium};
  /* 右侧金边 + 一条暗线，和客户端面板边框一致 */
  border-right: 1px solid ${props => props.theme.colors.goldDim};
  box-shadow: inset -1px 0 0 rgba(0, 0, 0, 0.6), 4px 0 16px rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  /* 喵~ 宽度现在由 theme 和 isCollapsed 状态共同决定！*/
  width: ${props => props.$isCollapsed 
    ? props.theme.sidebar.collapsedWidth 
    : props.theme.sidebar.width}px;
`;

const Logo = styled.div`
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: 1px;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  color: ${props => props.theme.colors.goldBright};
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid ${props => props.theme.colors.goldDeep};

  /* MUI的组件设置 */

  .MuiSvgIcon-root {
    color: ${props => props.theme.colors.gold};
    font-size: 2rem;
    filter: drop-shadow(0 0 6px ${props => props.theme.colors.gold}88);
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
  position: relative;
  border: 1px solid transparent;

  .MuiSvgIcon-root {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  &:hover {
    background-color: ${props => props.theme.colors.elementHover};
    color: ${props => props.theme.colors.goldBright};
  }

  /* 选中项：淡蓝底 + 金边 + 左侧青色竖条 */
  &.active {
    background: linear-gradient(90deg, ${props => props.theme.colors.navActiveBg} 0%, transparent 100%);
    border-color: ${props => props.theme.colors.goldDeep};
    color: ${props => props.theme.colors.navActiveText};
    .MuiSvgIcon-root {
      color: ${props => props.theme.colors.gold};
    }

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 3px;
      background: ${props => props.theme.colors.accentCyan};
      box-shadow: 0 0 8px ${props => props.theme.colors.accentCyan};
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
  ${hextechButtonGhost};
  margin-top: auto;
  padding: 0.5rem;
`;

// 导航项动画包装器 - 用于实现平滑的显示/隐藏动画
const NavItemWrapper = styled.div<{ $isVisible: boolean }>`
  /* 使用 grid 技巧实现高度动画（从 0 到 auto） */
  display: grid;
  grid-template-rows: ${props => props.$isVisible ? '1fr' : '0fr'};
  transition: grid-template-rows 0.3s ease-in-out;
  
  /* 内部容器，配合 grid 实现溢出隐藏 */
  > div {
    overflow: hidden;
  }
`;

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  // 导航项列表（带 show 属性）
  const [navItems, setNavItems] = useState<NavItem[]>(defaultNavItems);
  
  // 根据设置更新指定导航项的 show 属性
  const updateNavItemShow = (path: RoutePath, show: boolean) => {
    setNavItems(prev => prev.map(item => 
      item.path === path ? { ...item, show } : item
    ));
  };
  
  // 初始化 settingsStore 并订阅变化
  useEffect(() => {
    // 初始化（会从后端加载设置）
    settingsStore.init().then(() => {
      updateNavItemShow(RoutePath.DEBUG, settingsStore.getShowDebugPage());
    });
    
    // 订阅设置变化，当其他组件修改设置时，动态更新对应项的 show
    return settingsStore.subscribe((settings) => {
      updateNavItemShow(RoutePath.DEBUG, settings.showDebugPage);
    });
  }, []);

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
            <NavItemWrapper key={item.path} $isVisible={item.show}>
              <div>
                <StyledNavLink to={item.path} $isCollapsed={isCollapsed}>
                  <Icon />
                  <LinkText $isCollapsed={isCollapsed}>{item.label}</LinkText>
                </StyledNavLink>
              </div>
            </NavItemWrapper>
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