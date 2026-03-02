import type { DecisionEngine } from "./types";
import { RuleBasedDecisionEngine } from "./RuleBasedDecisionEngine";

export function createDefaultDecisionEngine(): DecisionEngine {
    return new RuleBasedDecisionEngine();
}
