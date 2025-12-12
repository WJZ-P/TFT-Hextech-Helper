/**
 * 空闲状态
 * @module IdleState
 * @description 状态机的初始/空闲状态，等待用户启动
 */

import { IState } from "./IState";

/**
 * 空闲状态类
 * @description 状态机的默认状态，表示系统处于待命状态
 */
export class IdleState implements IState {
    /** 状态名称 */
    public readonly name = "IdleState";

    /**
     * 执行空闲状态逻辑
     * @param _signal AbortSignal (此状态不需要，但为保持接口一致性保留)
     * @returns 返回自身，保持空闲状态
     * @description 空闲状态下不做任何操作，等待外部触发状态转换
     */
    async action(_signal: AbortSignal): Promise<IState> {
        // 空闲状态不执行任何操作，保持当前状态
        return this;
    }
}
