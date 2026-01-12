import './App.css'
import {router} from "./Router.tsx";
import {RouterProvider} from "react-router-dom";
import {ThemeProvider} from "styled-components";
import {lightTheme} from "./styles/theme.ts";

import {GlobalStyle} from "./styles/GlobalStyle.ts";
import {Toaster} from "./components/toast/Toast.tsx";
import {useEffect} from "react";
import {toast, ToastType, ToastPosition} from "./components/toast/toast-core.ts";

// Toast 消息的类型定义
interface ToastPayload {
    message: string;
    type?: ToastType;
    position?: ToastPosition;
}

function App() {
    const currentTheme = lightTheme;

    // 监听主进程发来的 Toast 事件
    useEffect(() => {
        // @ts-ignore - window.ipc 由 preload.ts 暴露
        const cleanup = window.ipc?.on('show-toast', (payload: ToastPayload) => {
            toast(payload.message, {
                type: payload.type || 'info',
                position: payload.position || 'top-right'
            });
        });
        return () => cleanup?.();
    }, []);

    return (
        <ThemeProvider theme={currentTheme}>
            <GlobalStyle/>
            <Toaster/>
            <RouterProvider router={router}/>
        </ThemeProvider>
    );
}

export default App;