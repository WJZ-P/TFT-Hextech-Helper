import { createDefaultDecisionEngine } from "../core/DecisionEngineFactory";
import type { ActionPlan, DecisionContext, ObservedState } from "../core/types";
import { pcLogicAdapter } from "../adapters/PcLogicAdapter";

class PcLogicRunner {
    private engine = createDefaultDecisionEngine();

    public async planOnce(state: ObservedState, context: DecisionContext = {}): Promise<ActionPlan[]> {
        pcLogicAdapter.setStateProvider(async () => state);
        await pcLogicAdapter.attach();
        const observedState = await pcLogicAdapter.observe();
        const plans = this.engine.generatePlan(observedState, context);
        await pcLogicAdapter.execute(plans);
        return plans;
    }

    public getLastPlans(): ActionPlan[] {
        return pcLogicAdapter.getLastActions();
    }
}

export const pcLogicRunner = new PcLogicRunner();
