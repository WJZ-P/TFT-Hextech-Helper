// 喵~ 使用 React.lazy 实现路由懒加载，优化初始加载速度
import {lazy, Suspense} from "react";
import {createHashRouter, Navigate} from "react-router-dom";
import MainLayout from "./components/MainLayout.tsx";
import ErrorPage from "./components/pages/ErrorPage.tsx";
import {HomePage} from "./components/pages/HomePage.tsx";
import { RoutePath } from "./constants/routes";

const DebugPage = lazy(() => import('./components/pages/DebugPage'));
const SettingsPage = lazy(() => import('./components/pages/SettingsPage'));
const LineupsPage = lazy(() => import('./components/pages/LineupsPage')); // 阵容搭配页面


const LoadingSpinner = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
    </div>
)



export const router = createHashRouter([
    {
        path: RoutePath.HOME,
        element: <MainLayout/>, // 使用我们的主布局
        errorElement: <ErrorPage/>,
        children: [
            // 当用户访问根路径时，显示主页
            {
                index:true,
                element: (
                    <Suspense fallback={<LoadingSpinner/>}>
                        <HomePage/>
                    </Suspense>
                )
            },
            {
                // 去掉开头的 '/'，因为这是嵌套路由
                path: RoutePath.LINEUPS.slice(1),
                element: (
                    <Suspense fallback={<LoadingSpinner/>}>
                        <LineupsPage/>
                    </Suspense>
                )
            },
            {
                path: RoutePath.DEBUG.slice(1),
                element: (
                    <Suspense fallback={<LoadingSpinner/>}>
                        <DebugPage/>
                    </Suspense>
                )
            },
            {
                path: RoutePath.SETTINGS.slice(1),
                element: (
                    <Suspense fallback={<LoadingSpinner/>}>
                        <SettingsPage/>
                    </Suspense>
                )
            },
        ]
    },
]);
