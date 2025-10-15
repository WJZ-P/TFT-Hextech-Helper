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
let toasts: ToastMessage[]
const listeners: Array<(newToasts: ToastMessage[]) => void> = [];

const store = {
    //让组件可以监听状态变化
    subscribe(listener: (newToasts:ToastMessage[])=>void){
        listeners.push(listener);
        //  返回一个取消订阅的函数
        return ()=>{
            const index = listeners.indexOf(listener);
            if(index>-1) listeners.splice(index,1)
        }
    },
    //  获取当前状态快照
    getSnapshot() {
        return toasts;
    },
    //  添加一个新的toast
    addToast(toast:Omit<ToastMessage, 'id'|'isVisible'>){
        const id =`${Date.now()}-${Math.random()}`
        toasts = [...toasts,{...toast,id,isVisible:true}];
        //  通知所有订阅者
        publish();
    },

}