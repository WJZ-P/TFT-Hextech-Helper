import './App.css'
import {router} from "./Router.tsx";
import {RouterProvider} from "react-router-dom";
import {ThemeProvider} from "styled-components";
import {lightTheme} from "./styles/theme.ts";

import {GlobalStyle} from "./styles/GlobalStyle.ts";
import {Toaster} from "./components/toast/Toast.tsx";
import {useEffect, useState} from "react";
import {toast, ToastType, ToastPosition} from "./components/toast/toast-core.ts";
import {FirstLaunchModal} from "./components/FirstLaunchModal.tsx";
import {OnboardingTour} from "./components/onboarding/OnboardingTour.tsx";
import {settingsStore} from "./stores/settingsStore.ts";

// Toast 消息的类型定义
interface ToastPayload {
    message: string;
    type?: ToastType;
    position?: ToastPosition;
}

function App() {
    const currentTheme = lightTheme;
    
    // 首次启动弹窗状态
    const [showFirstLaunchModal, setShowFirstLaunchModal] = useState(false);
    
    // 新手引导状态
    const [showOnboarding, setShowOnboarding] = useState(false);

    // 监听主进程发来的 Toast 事件
    useEffect(() => {
        // @ts-expect-error - window.ipc 由 preload.ts 暴露
        const cleanup = window.ipc?.on('show-toast', (payload: ToastPayload) => {
            toast(payload.message, {
                type: payload.type || 'info',
                position: payload.position || 'top-right'
            });
        });
        return () => cleanup?.();
    }, []);
    
    // 检查是否首次启动与新手引导
    useEffect(() => {
        const checkStatus = async () => {
            await settingsStore.init();
            
            const isFirstLaunch = await window.settings.get<boolean>('isFirstLaunch');
            if (isFirstLaunch) {
                setShowFirstLaunchModal(true);
            } else if (!settingsStore.getOnboardingCompleted()) {
                setShowOnboarding(true);
            }
        };
        checkStatus();
        
        const unsubscribe = settingsStore.subscribe((state) => {
            if (state.onboardingCompleted) {
                setShowOnboarding(false);
            }
        });
        
        return () => unsubscribe();
    }, []);
    
    // 用户确认首次启动弹窗
    const handleFirstLaunchConfirm = async () => {
        // 标记为非首次启动
        await window.settings.set('isFirstLaunch', false);
        setShowFirstLaunchModal(false);
        // 首次启动弹窗确认后，触发新手引导
        if (!settingsStore.getOnboardingCompleted()) {
            setShowOnboarding(true);
        }
    };
    
    // 完成新手引导
    const handleOnboardingComplete = async () => {
        await settingsStore.setOnboardingCompleted(true);
        setShowOnboarding(false);
    };

    return (
        <ThemeProvider theme={currentTheme}>
            <GlobalStyle/>
            <Toaster/>
            <FirstLaunchModal 
                isOpen={showFirstLaunchModal}
                onClose={() => setShowFirstLaunchModal(false)}
                onConfirm={handleFirstLaunchConfirm}
            />
            <OnboardingTour
                open={showOnboarding}
                onClose={() => setShowOnboarding(false)}
                onComplete={handleOnboardingComplete}
            />
            <RouterProvider router={router}/>
        </ThemeProvider>
    );
}

export default App;