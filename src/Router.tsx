// 喵~ 使用 React.lazy 实现路由懒加载，优化初始加载速度
import {lazy, Suspense} from "react";
import {createBrowserRouter, createHashRouter, Navigate} from "react-router-dom";
import MainLayout from "./components/MainLayout.tsx";

const DashboardPage = lazy(() => import('./components/pages/DashboardPage'));
const SettingsPage = lazy(() => import('./components/pages/SettingsPage'));


const LoadingSpinner = () => (
    <div className="w-full h-full flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-indigo-400"></div>
    </div>
)



export const router = createHashRouter([
    {
        path: '/',
        element: <MainLayout/>, // 喵~ 使用我们的主布局
        errorElement: <ErrorPage/>,
        children: [
            // 当用户访问根路径时，自动跳转到仪表盘
            {index: true, element: <Navigate to="/dashboard" replace/>},
            {
                path: 'dashboard',
                element: (
                    <Suspense fallback={<LoadingSpinner/>}>
                        <DashboardPage/>
                    </Suspense>
                )
            },
            {
                path: 'settings',
                element: (
                    <Suspense fallback={<LoadingSpinner/>}>
                        <SettingsPage/>
                    </Suspense>
                )
            },
        ]
    },
]);
