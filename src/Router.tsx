import {createHashRouter} from "react-router-dom";
import MainLayout from "./components/MainLayout.tsx";
import ErrorPage from "./components/pages/ErrorPage.tsx";
import { RoutePath } from "./constants/routes";

/**
 * 路由只负责匹配路径，页面本身由 MainLayout 里的 KeepAlivePages 渲染（切换 tab 时不卸载），
 * 所以子路由没有 element；不在这里的路径仍然会走 errorElement
 */
export const router = createHashRouter([
    {
        path: RoutePath.HOME,
        element: <MainLayout/>, // 使用我们的主布局
        errorElement: <ErrorPage/>,
        children: [
            // 当用户访问根路径时，显示主页
            {
                index:true,
                element: null
            },
            {
                // 去掉开头的 '/'，因为这是嵌套路由
                path: RoutePath.LINEUPS.slice(1),
                element: null
            },
            {
                path: RoutePath.DEBUG.slice(1),
                element: null
            },
            {
                path: RoutePath.SETTINGS.slice(1),
                element: null
            },
        ]
    },
]);
