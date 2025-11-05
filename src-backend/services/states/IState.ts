//  定义一个Istate接口，
export interface IState {
    //  signal用于控制程序退出
    action: (signal: AbortSignal) => Promise<IState>,
}