export type ToastType = 'info' | 'success' | 'warning' | 'error';
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface ToastMessage {
    id: string; // 使用 string 类型的 ID 更健壮
    message: string;
    type: ToastType;
    position: ToastPosition;
    isVisible: boolean;
    height?: number; // 用于更平滑的高度动画
}

//  创建一个事件中心，一个简单的发布/订阅实现