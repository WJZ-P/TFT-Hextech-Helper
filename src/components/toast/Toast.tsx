import {keyframes} from "@mui/material";
import styled from "styled-components";
import store, {toast, ToastMessage, ToastPosition, ToastType} from "./toast-core.ts";
import {ThemeType} from "../../styles/theme.ts";
import {hextechButtonGhost, hextechButtonPrimary} from "../../styles/hextech.ts";
import {useEffect, useMemo, useState} from "react";
import InfoIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import WarningIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorIcon from '@mui/icons-material/ErrorOutline';
import {createPortal} from "react-dom";

const toastDuration=2000

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }`;
const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-20px);
  }`;

const ToastContainer = styled.div<{ position: ToastPosition }>`
  position: fixed;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  /* 顶部的 Toast 避开自绘标题栏，不压住窗口按钮 */
  ${({position, theme}) => (position.includes('top') ? `top: calc(${theme.titleBarHeight}px + 1rem);` : 'bottom: 1.5rem;')}
  ${({position}) => {
    if (position.includes('left')) return 'left: 1.5rem;';
    if (position.includes('right')) return 'right: 1.5rem;';
    return 'left: 50%; transform: translateX(-50%);';
  }}
`;

/** Toast 类型对应的强调色 */
const typeColor = (type: ToastType, theme: ThemeType): string => {
    switch (type) {
        case 'success':
            return theme.colors.success;
        case 'warning':
            return theme.colors.warning;
        case 'error':
            return theme.colors.error;
        case 'info':
        default:
            return theme.colors.accentCyan;
    }
};

/** 海克斯风格：深色底板 + 暗金边框，左侧一条类型色竖线 */
const ToastWrapper = styled.div<{ type: ToastType, isVisible: boolean, theme: ThemeType }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 1rem;
  border-radius: ${({theme}) => theme.borderRadius};
  background: ${({theme}) => theme.colors.panelBg};
  color: ${({theme}) => theme.colors.goldBright};
  border: 1px solid ${({theme}) => theme.colors.goldDim};
  border-left: 3px solid ${({type, theme}) => typeColor(type, theme)};
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.5);
  animation: ${({isVisible}) => isVisible ? fadeIn : fadeOut} 0.3s ease-in-out forwards;
  min-width: 300px;
  max-width: 400px;
  min-height: 25px;
`;

const IconContainer = styled.div<{ type: ToastType, theme: ThemeType }>`
  display: flex;
  align-items: center;

  .MuiSvgIcon-root {
    color: ${({type, theme}) => typeColor(type, theme)};
  }
`;

/** 文字 + 按钮，纵向排列 */
const ToastBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  line-height: 1.5;
  white-space: pre-line;
`;

const ToastActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
`;

const ToastButton = styled.button<{ $primary?: boolean }>`
  ${({$primary}) => $primary ? hextechButtonPrimary : hextechButtonGhost};
  padding: 0.3rem 0.9rem;
`;

//  创建一个自定义hook，用来连接react组件和store，只在Toast组件内部使用
function useStore() {
    const [toasts, setToasts] = useState(() => store.getSnapshot())
    useEffect(() => {
        const unsubscribe = store.subscribe(newToasts => {
            setToasts([...newToasts]);
        })
        return () => unsubscribe()
    }, []);
    return toasts;
}

const SingleToast = ({toast}: { toast: ToastMessage }) => {
    useEffect(() => {
        if (toast.persistent) return;
        const timer = setTimeout(() => {
            store.dismissToast(toast.id)
        }, toastDuration);
        return () => clearTimeout(timer)
    }, [toast.id, toast.persistent]);

    const icons = {
        info: <InfoIcon/>,
        success: <CheckCircleIcon/>,
        warning: <WarningIcon/>,
        error: <ErrorIcon/>,
    }
    return(
        <ToastWrapper isVisible={toast.isVisible} type={toast.type}>
            <IconContainer type={toast.type}>{icons[toast.type]}</IconContainer>
            {toast.actions?.length ? (
                <ToastBody>
                    {toast.message}
                    <ToastActions>
                        {toast.actions.map(action => (
                            <ToastButton
                                key={action.label}
                                type="button"
                                $primary={action.primary}
                                onClick={() => {
                                    action.onClick?.();
                                    store.dismissToast(toast.id);
                                }}
                            >
                                {action.label}
                            </ToastButton>
                        ))}
                    </ToastActions>
                </ToastBody>
            ) : toast.message}
        </ToastWrapper>
    )
}

export const Toaster = ()=>{
    const toasts = useStore();
    const groupedToasts = useMemo(()=>{
        return toasts.reduce((acc,toast)=>{
            if(!acc[toast.position]) acc[toast.position] = [];
            acc[toast.position].push(toast);
            return acc;
        },{} as Record<ToastPosition, ToastMessage[]>)
    },[toasts]);

    return createPortal(
        <>
         {Object.entries(groupedToasts).map(([position, toastList]) => (
                <ToastContainer key={position} position={position as ToastPosition}>
                    {toastList.map(toast => (
                       <SingleToast key={toast.id} toast={toast} />
                    ))}
                </ToastContainer>
            ))}
        </>
    ,document.body)
}
