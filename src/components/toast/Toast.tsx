import {keyframes} from "@mui/material";
import styled from "styled-components";
import store, {toast, ToastMessage, ToastPosition, ToastType} from "./toast-core.ts";
import {ThemeType} from "../../styles/theme.ts";
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
  ${({position}) => (position.includes('top') ? 'top: 1.5rem;' : 'bottom: 1.5rem;')}
  ${({position}) => {
    if (position.includes('left')) return 'left: 1.5rem;';
    if (position.includes('right')) return 'right: 1.5rem;';
    return 'left: 50%; transform: translateX(-50%);';
  }}
`;

const ToastWrapper = styled.div<{ type: ToastType, isVisible: boolean, theme: ThemeType }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: ${({theme}) => theme.borderRadius};
  background-color: ${({theme}) => theme.colors.elementBg};
  color: ${({theme}) => theme.colors.text};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 5px solid;
  animation: ${({isVisible}) => isVisible ? fadeIn : fadeOut} 0.3s ease-in-out forwards;
  min-width: 300px;
  max-width: 400px;
  min-height: 25px;
  border-color: ${({type, theme}) => {
    switch (type) {
      case 'success':
        return theme.colors.success;
      case 'warning':
        return theme.colors.warning;
      case 'error':
        return theme.colors.error;
      case 'info':
      default:
        return theme.colors.primary;
    }
  }};
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
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
        const timer = setTimeout(() => {
            store.dismissToast(toast.id)
        }, toastDuration);
        return () => clearTimeout(timer)
    }, [toast.id]);

    const icons = {
        info: <InfoIcon color="primary"/>,
        success: <CheckCircleIcon style={{color: '#10B981'}}/>,
        warning: <WarningIcon style={{color: '#F59E0B'}}/>,
        error: <ErrorIcon color="error"/>,
    }
    return(
        <ToastWrapper isVisible={toast.isVisible} type={toast.type}>
            <IconContainer>{icons[toast.type]}</IconContainer>
            {toast.message}
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
