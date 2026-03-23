/**
 * Strategy Effectiveness Calculator
 *
 * Tracks wins/losses per strategy (planType) and computes win rates.
 */
import { logger } from "../utils/Logger";

export interface StrategyEffectiveness {
    wins: number;
    losses: number;
    usageCount: number;
    winRate: number; // wins / usageCount, NaN when usageCount === 0
}

export class StrategyEffectivenessCalculator {
    private static instance: StrategyEffectivenessCalculator | null = null;

    /** internal counters per planType */
    private readonly counters: Map<string, { wins: number; losses: number }> = new Map();

    private constructor() {}

    public static getInstance(): StrategyEffectivenessCalculator {
        if (!StrategyEffectivenessCalculator.instance) {
            StrategyEffectivenessCalculator.instance = new StrategyEffectivenessCalculator();
        }
        return StrategyEffectivenessCalculator.instance;
    }

    /**
     * Record an outcome for a given planType.
     * @param planType arbitrary strategy identifier (e.g. ActionType)
     * @param outcome 'win' or 'loss'
     */
    public recordStrategyOutcome(planType: string, outcome: "win" | "loss"): void {
        if (!planType) {
            // defensive: require a non-empty planType
            logger.warn("[StrategyEffectiveness] recordStrategyOutcome called with empty planType");
            return;
        }

        const key = planType;
        const cur = this.counters.get(key) ?? { wins: 0, losses: 0 };
        if (outcome === "win") cur.wins += 1;
        else cur.losses += 1;

        this.counters.set(key, cur);
        logger.debug(`[StrategyEffectiveness] Recorded ${outcome} for ${planType} -> wins=${cur.wins}, losses=${cur.losses}`);
    }

    /**
     * Get effectiveness metrics for a single planType.
     */
    public getStrategyEffectiveness(planType: string): StrategyEffectiveness {
        const stored = this.counters.get(planType);
        if (!stored) {
            return { wins: 0, losses: 0, usageCount: 0, winRate: NaN };
        }

        const wins = stored.wins;
        const losses = stored.losses;
        const usageCount = wins + losses;
        const winRate = usageCount === 0 ? NaN : wins / usageCount;

        return { wins, losses, usageCount, winRate };
    }

    /**
     * Get effectiveness metrics for all tracked plan types.
     */
    public getAllStrategyEffectiveness(): Record<string, StrategyEffectiveness> {
        const out: Record<string, StrategyEffectiveness> = {};
        for (const [planType, val] of this.counters.entries()) {
            const wins = val.wins;
            const losses = val.losses;
            const usageCount = wins + losses;
            out[planType] = { wins, losses, usageCount, winRate: usageCount === 0 ? NaN : wins / usageCount };
        }
        return out;
    }

    /**
     * Clear all collected data. Useful for tests and resetting state.
     */
    public reset(): void {
        this.counters.clear();
    }
}

export const strategyEffectivenessCalculator = StrategyEffectivenessCalculator.getInstance();
