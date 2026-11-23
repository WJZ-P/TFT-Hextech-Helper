import {Outlet} from "react-router-dom";
import Sidebar from "./Sidebar.tsx";
import {TitleBar} from "./TitleBar.tsx";
import styled from "styled-components";
// 全局背景：S18「自然之力」客户端大厅背景图（CommunityDragon: assets/ux/tft/outofgame/backgrounds/lobby.tft_set18.jpg）
import lobbyBackgroundUrl from "../assets/backgrounds/lobby-set18.jpg";

const LayoutContainer = styled.div`
  /* 对应 h-screen 和 w-screen，让布局撑满整个视口 */
  height: 100vh;
  width: 100vw;

  /* 纵向：上面是自绘标题栏，下面是侧边栏 + 内容区 */
  display: flex;
  flex-direction: column;

  /* 背景图上叠一层深色渐变，保证文字对比度；原图是竖版，取中下部的湖面和浮岛 */
  background:
    linear-gradient(180deg, rgba(9, 14, 22, 0.55) 0%, rgba(9, 14, 22, 0.45) 45%, rgba(9, 14, 22, 0.55) 100%),
    url(${lobbyBackgroundUrl}) center 62% / cover no-repeat,
    ${props => props.theme.colors.background};

  /* 对应 antialiased，让字体渲染更平滑 */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
`;

// 标题栏下方的主体：侧边栏 + 内容区横向排列
const LayoutBody = styled.div`
  flex: 1;
  min-height: 0;   /* 允许内容区在剩余高度内滚动，而不是把整个窗口撑高 */
  display: flex;
`;

// 喵~ 2. 为 main 标签创建一个样式组件
const MainContent = styled.main`
  /* 对应 flex-1，让主内容区占据所有剩余空间 */
  flex: 1;

  /* 对应 overflow-y-auto，当内容超长时显示垂直滚动条 */
  overflow-y: auto;
`;

const MainLayout = () => {
    return (
        <LayoutContainer>
            <TitleBar/>
            <LayoutBody>
                <Sidebar/>
                <MainContent>
                    {/* 路由匹配到的页面组件，将会在这里显示 */}
                    <Outlet/>
                </MainContent>
            </LayoutBody>
        </LayoutContainer>
    )
}

export default MainLayout;  