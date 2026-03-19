import type { ActionPlan, AdapterHealth, GameAdapter, ObservedState, PlatformTarget } from "../core/types";

export type PcStateProvider = () => Promise<ObservedState>;

const defaultProvider: PcStateProvider = async () => {
    throw new Error("未提供 PC 逻辑输入状态，请先调用 setStateProvider()");
};

export class PcLogicAdapter implements GameAdapter {
    public readonly target: PlatformTarget = "PC_LOGIC";

    private stateProvider: PcStateProvider = defaultProvider;
    private lastActions: ActionPlan[] = [];

    public setStateProvider(provider: PcStateProvider): void {
        this.stateProvider = provider;
    }

    public getLastActions(): ActionPlan[] {
        return [...this.lastActions];
    }

    public async attach(): Promise<void> {
        // PC 逻辑模式不需要连接客户端，这里保留空实现用于接口对齐
    }

    public async observe(): Promise<ObservedState> {
        return this.stateProvider();
    }

    public async execute(actions: ActionPlan[]): Promise<void> {
        this.lastActions = [...actions];
    }

    public async healthCheck(): Promise<AdapterHealth> {
        const hasProvider = this.stateProvider !== defaultProvider;
        return {
            ok: hasProvider,
            detail: hasProvider ? "PC 逻辑输入源已就绪" : "未配置 PC 逻辑输入源",
        };
    }
}

export const pcLogicAdapter = new PcLogicAdapter();
