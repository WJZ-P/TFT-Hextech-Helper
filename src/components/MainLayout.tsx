import {Outlet} from "react-router-dom";
import Sidebar from "./Sidebar.tsx";

const MainLayout = () => {
    return (
        <div className="h-screen w-screen flex bg-gray-800 antialiased">
            <Sidebar/>
            <main className="flex-1 overflow-y-auto">
                {/* 喵~ 路由匹配到的页面组件，将会在这里显示 */}
                <Outlet/>
            </main>
        </div>
    )
}

export default MainLayout;