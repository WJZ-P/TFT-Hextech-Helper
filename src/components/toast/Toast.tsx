//  尝试自己写一个toast

import React, {useState, useContext, createContext, useCallback, useMemo} from 'react';
import ReactDOM from 'react-dom';
import styled, {keyframes, ThemeProvider} from 'styled-components';

// 引入图标
import InfoIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircleOutline';
import WarningIcon from '@mui/icons-material/WarningAmberOutlined';
import ErrorIcon from '@mui/icons-material/ErrorOutline';
import {ThemeType} from "../../styles/theme.ts";

//  类型定义
type ToastType = 'info' | 'success' | 'warning' | 'error';
type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
    position: ToastPosition;
}

interface ToastContextType {
    showToast: (message: string, type: ToastType, position?: ToastPosition) => void;
}

//  动画和样式定义
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeOut = keyframes`
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(20px);
  }
`;

const ToastContainer = styled.div<{ position: ToastPosition }>`
  position: fixed;
  z-index: 1145;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  //  根据位置设置CSS
  ${({position}) => {
    if (position.includes('top')) return 'top: 1.5rem;';
    if (position.includes('bottom')) return 'bottom: 1.5rem;';
  }}
  ${({position}) => {
    if (position.includes('left')) return 'left: 1.5rem;';
    if (position.includes('right')) return 'right: 1.5rem;';
    if (position.includes('center')) return 'left: 50%; transform: translateX(-50%);';
  }}
}`

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

  // 根据类型设置左边框颜色
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
  align-items: center;`

//  react 上下文和Provider.

const ToastContext = createContext<ToastContextType | null>(null)   //  创建一个可以跨层级传递数据的保险箱。

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    //  showToast基本不变，所以useCallback。
    const showToast = useCallback((
        message: string,
        type: ToastType,
        position: ToastPosition = 'top-right'
    ) => {
        const id = Date.now() + Math.random();
        //  这里不直接写[...toasts,xxx]是因为会有陈旧状态！因为这里的set本身在useCallback的闭包内，它的闭包捕获了
        setToasts(prevToasts => [...prevToasts, {id, message, type, position}]);//  尾部插入新的Toast

        //  设置三秒后自动删除Toast
        setTimeout(() => {
            setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id))
        }, 3000)
    }, [])

    /**
     *   这里用useMemo，意味着只有showToast本身改变，这个toastContextValue才会被改变。如果不加：这个value被用于Provider的value，每次新的toast出现
     *   或者消失，属性toasts(它是state的)会改变，导致ToastProvider重新渲染，就会导致不用useMemo的话这里也会重新调用，没有必要。这里的重新调用导致 所
     *   有使用了useContext(ToastContext) 的子组件，都会因为 value 的改变而全部重新渲染
     */
    const toastContextValue = useMemo(() => ({showToast}), [showToast]);

    const groupedToasts = useMemo(() => {
        return toasts.reduce((acc, toast) => {
            if (!acc[toast.position]) acc[toast.position] = [];
            acc[toast.position].push(toast)
            return acc;
        }, {} as Record<ToastPosition, ToastMessage[]>);//  这里Record表示快速创建一个对象类型。
    }, [toasts]);

    return (
        <ToastContext.Provider value={toastContextValue}>
            {children}
            {ReactDOM.createPortal(
                <>{Object.entries(groupedToasts).map(([position, toastList]) => (
                    <ToastContainer key={position} position={position as ToastPosition}>
                        {toastList.map(toast => (
                            <SingleToast key={toast.id} message={toast.message} type={toast.type}/>
                        ))}
                    </ToastContainer>
                ))}</>,
                document.body)}
        </ToastContext.Provider>
    )
}

//  自定义 hook 和单个Toast组件
export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error("[Toast] useToast必须在ToastProvider内使用")
    }
    return context;
}

const SingleToast: React.FC<Omit<ToastMessage, 'id' | 'position'>> = ({message, type}) => {
    const [isVisible, setIsVisible] = useState(true);
    const icons = {
        info: <InfoIcon color="primary"/>,
        success: <CheckCircleIcon style={{color: '#10B981'}}/>,
        warning: <WarningIcon style={{color: '#F59E0B'}}/>,
        error: <ErrorIcon color="error"/>,
    };
    return (
        <ToastWrapper isVisible={isVisible} type={type}>
            <IconContainer>{icons[type]}</IconContainer>
            <span>{message}</span>
        </ToastWrapper>
    )
}