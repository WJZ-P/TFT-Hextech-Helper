import {Outlet} from "react-router-dom";
import Sidebar from "./Sidebar.tsx";
import {TitleBar} from "./TitleBar.tsx";
import styled from "styled-components";

const LayoutContainer = styled.div`
  /* 对应 h-screen 和 w-screen，让布局撑满整个视口 */
  height: 100vh;
  width: 100vw;

  /* 纵向：上面是自绘标题栏，下面是侧边栏 + 内容区 */
  display: flex;
  flex-direction: column;

  /* 对应 bg-gray-800，一个舒适的深灰色背景 */
  background-color: ${props => props.theme.colors.background};

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