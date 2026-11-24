import {lazy, Suspense, useState, type ReactElement} from "react";
import {useLocation} from "react-router-dom";
import styled from "styled-components";
import {HomePage} from "./pages/HomePage.tsx";
import {RoutePath} from "../constants/routes";
import {PageActiveContext} from "../hooks/usePageActive";

// 懒加载：第一次进入某个页面时才加载它的代码
const DebugPage = lazy(() => import('./pages/DebugPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const LineupsPage = lazy(() => import('./pages/LineupsPage')); // 阵容搭配页面

const LoadingSpinner = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
    </div>
)

/**
 * 各路径对应的页面
 * 元素必须定义在组件外面：引用不变，切换 tab 时 React 才会跳过所有页面的重新渲染
 */
const PAGES: { path: RoutePath; element: ReactElement }[] = [
    { path: RoutePath.HOME, element: <HomePage/> },
    { path: RoutePath.LINEUPS, element: <LineupsPage/> },
    { path: RoutePath.DEBUG, element: <DebugPage/> },
    { path: RoutePath.SETTINGS, element: <SettingsPage/> },
];

const PagesContainer = styled.div`
  position: relative;
  height: 100%;
  overflow: hidden;
`;

/**
 * 单个页面的容器
 * 隐藏时用 content-visibility: hidden：跳过整个子树的布局和绘制，但保留渲染状态和滚动位置
 * - 不用 display: none：会丢掉布局，再次显示要全部重算
 * - 不用 visibility: hidden：它会继承，子元素的 transition: all 会把它也当成动画属性，
 *   而且逐层嵌套累加，切走后页面内容会残留几百毫秒
 */
const PagePane = styled.div<{ $active: boolean }>`
  position: absolute;
  inset: 0;
  content-visibility: ${props => props.$active ? 'visible' : 'hidden'};
  pointer-events: ${props => props.$active ? 'auto' : 'none'};
`;

/** 页面第一次访问时挂载，之后切换 tab 只切换显示，不卸载 */
export const KeepAlivePages = () => {
    const {pathname} = useLocation();
    const [visited, setVisited] = useState<ReadonlySet<string>>(() => new Set([pathname]));

    // 渲染期间直接更新，新页面在这一次渲染里就挂载，不会先闪一帧空白
    if (!visited.has(pathname)) {
        setVisited(new Set([...visited, pathname]));
    }

    return (
        <PagesContainer>
            {PAGES.filter(page => visited.has(page.path)).map(page => {
                const active = page.path === pathname;
                return (
                    <PagePane key={page.path} $active={active}>
                        <PageActiveContext.Provider value={active}>
                            <Suspense fallback={<LoadingSpinner/>}>
                                {page.element}
                            </Suspense>
                        </PageActiveContext.Provider>
                    </PagePane>
                );
            })}
        </PagesContainer>
    );
};
