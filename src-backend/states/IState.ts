/**
 * 状态机状态接口
 * @description 定义状态机中每个状态需要实现的契约
 */
export interface IState {
    /**
     * 状态名称
     * @description 用于日志输出和调试，便于追踪状态流转
     */
    readonly name: string;

    /**
     * 状态主逻辑
     * @param signal AbortSignal 用于控制程序退出，支持优雅取消
     * @returns 下一个状态，返回 null 表示状态机终止
     */
    action(signal: AbortSignal): Promise<IState | null>;
}
