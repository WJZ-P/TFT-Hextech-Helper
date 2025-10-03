// --- 图标组件 ---
import {NavLink} from "react-router-dom";
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import BoltIcon from '@mui/icons-material/Bolt';
import styled, {ThemeContext} from "styled-components";
import React, {useCallback, useContext, useRef, useState} from "react"; // 一个好看的闪电图标给 Logo


const navItems = [
    {path: '/dashboard', label: '仪表盘', icon: DashboardIcon},
    {path: '/settings', label: '设置', icon: SettingsIcon},
]


const Resizer = styled.div`
  position: absolute;
  top: 0;
  right: -4px;
  width: 8px;
  height: 100%;
  cursor: col-resize;
  background-color: transparent;
  transition: background-color 0.2s ease-in-out;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 3px;
    width: 2px;
    height: 100%;
    background-color: ${props => props.theme.colors.resizer};
    transition: background-color 0.2s ease-in-out;
  }

  &:hover::after {
    background-color: ${props => props.theme.colors.resizerHover};
  }
`;

const SidebarContainer = styled.aside<{ width: number }>`
  position: relative; 
  width: ${props => props.width}px;
  background-color: ${props => props.theme.colors.sidebarBg};
  color: ${props => props.theme.colors.text};
  display: flex;
  flex-direction: column;
  padding: ${props => props.theme.spacing.medium};
  border-right: 1px solid ${props => props.theme.colors.border};
  flex-shrink: 0; // 防止在 flex 布局中被压缩
`;

const Logo = styled.div`
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;

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

const StyledNavLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  text-decoration: none;
  font-weight: 500;
  transition: all 0.2s ease-in-out;
  border-radius: ${props => props.theme.borderRadius};
  color: ${props => props.theme.colors.textSecondary};

  .MuiSvgIcon-root {
    font-size: 1.25rem;
  }

  /* 喵~ 悬停状态的颜色，也从 theme 读取 */

  &:hover {
    background-color: ${props => props.theme.colors.elementHover};
    color: ${props => props.theme.colors.text};
  }

  /* 喵~ 激活状态的颜色，现在完全由 theme 控制！*/

  &.active {
    background-color: ${props => props.theme.colors.navActiveBg};
    color: ${props => props.theme.colors.navActiveText};
    box-shadow: 0 4px 14px 0 rgba(102, 204, 255, 0.3); /* 阴影也用主色调 */

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


const Sidebar = () => {
    const [width, setWidth] = useState(240);//  240看起来比较合适
    const isResizing = useRef(false);
    // 喵~ 修正1：使用 useContext 来安全地获取 theme 对象
    const theme = useContext(ThemeContext);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        isResizing.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const handleMouseMove = (event: MouseEvent) => {
            if (isResizing.current && theme) { // 喵~ 确保 theme 存在
                // 喵~ 修正2：从正确的 theme 对象中读取最小/最大宽度
                const minWidth = theme.sidebar.minWidth;
                const maxWidth = theme.sidebar.maxWidth;
                const newWidth = Math.max(minWidth, Math.min(event.clientX, maxWidth));
                setWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            isResizing.current = false;
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';

            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    }, [theme]); // 喵~ 修正3：将 theme 添加到 useCallback 的依赖项中

    return (
        <SidebarContainer width={width}>
            <Logo>
                <BoltIcon/>
                <span>海克斯科技助手</span>
            </Logo>
            <Nav>
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <StyledNavLink key={item.path} to={item.path}>
                            <Icon/>
                            <span>{item.label}</span>
                        </StyledNavLink>
                    );
                })}
            </Nav>
            <Version>
                <p>版本 v1.0.0</p>
            </Version>
            <Resizer onMouseDown={handleMouseDown} />
        </SidebarContainer>
    );
};

export default Sidebar;