// --- 图标组件 ---
import {NavLink} from "react-router-dom";
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import BoltIcon from '@mui/icons-material/Bolt';
import styled from "styled-components"; // 一个好看的闪电图标给 Logo


const navItems = [
    {path:'/dashboard',label:'仪表盘',icon:DashboardIcon},
    { path: '/settings', label: '设置', icon: SettingsIcon },
]

const SidebarContainer = styled.aside`
  width: 256px;
  background-color: ${props => props.theme.colors.background};
  color: ${props => props.theme.colors.sidebarBg};
  display: flex;
  flex-direction: column;
  padding: ${props => props.theme.spacing.medium};
  border-right: 1px solid ${props => props.theme.colors.elementBg};
  flex-shrink: 0; // 防止在 flex 布局中被压缩
`;

const Logo = styled.div`
  font-size: 1.75rem;
  font-weight: bold;
  margin-bottom: 2rem;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.5rem;

  /* 喵~ Logo 里的图标颜色，我们用主色调 */
  .MuiSvgIcon-root {
    color: ${props => props.theme.colors.primary};
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
  return (
    <SidebarContainer>
      <Logo>
        <BoltIcon style={{ color: '#5856d6' }} />
        <span>我的助手</span>
      </Logo>
      <Nav>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <StyledNavLink key={item.path} to={item.path}>
              <Icon />
              <span>{item.label}</span>
            </StyledNavLink>
          );
        })}
      </Nav>
      <Version>
        <p>版本 v1.0.0</p>
      </Version>
    </SidebarContainer>
  );
};

export default Sidebar;