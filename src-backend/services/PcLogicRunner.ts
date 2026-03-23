import { createDefaultDecisionEngine } from "../core/DecisionEngineFactory";
import type { ActionPlan, DecisionContext, ObservedState } from "../core/types";
import { pcLogicAdapter } from "../adapters/PcLogicAdapter";
import { logger } from "../utils/Logger.ts";

class PcLogicRunner {
    private engine = createDefaultDecisionEngine();

    public async planOnce(state: ObservedState, context: DecisionContext = {}): Promise<ActionPlan[]> {
        try {
            pcLogicAdapter.setStateProvider(async () => state);
            await pcLogicAdapter.attach();
            const observedState = await pcLogicAdapter.observe();
            const plans = this.engine.generatePlan(observedState, context);
            await pcLogicAdapter.execute(plans);
            return plans;
        } catch (error: unknown) {
            logger.error(`[PcLogicRunner] planOnce failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
            throw error;
        }
    }

    public getLastPlans(): ActionPlan[] {
        return pcLogicAdapter.getLastActions();
    }
}

export const pcLogicRunner = new PcLogicRunner();
