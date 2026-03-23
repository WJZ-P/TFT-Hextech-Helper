import test from "node:test";
import assert from "node:assert/strict";

import { strategyEffectivenessCalculator } from "../../src-backend/services/StrategyEffectivenessCalculator";

test("initial state has no data and returns NaN winRate", () => {
    strategyEffectivenessCalculator.reset();

    const metrics = strategyEffectivenessCalculator.getStrategyEffectiveness("BUY");
    assert.equal(metrics.wins, 0);
    assert.equal(metrics.losses, 0);
    assert.equal(metrics.usageCount, 0);
    assert.ok(Number.isNaN(metrics.winRate));
});

test("recordStrategyOutcome increments wins and losses properly and computes winRate", () => {
    strategyEffectivenessCalculator.reset();

    strategyEffectivenessCalculator.recordStrategyOutcome("BUY", "win");
    strategyEffectivenessCalculator.recordStrategyOutcome("BUY", "loss");
    strategyEffectivenessCalculator.recordStrategyOutcome("BUY", "win");

    const metrics = strategyEffectivenessCalculator.getStrategyEffectiveness("BUY");
    assert.equal(metrics.wins, 2);
    assert.equal(metrics.losses, 1);
    assert.equal(metrics.usageCount, 3);
    assert.equal(metrics.winRate, 2 / 3);
});

test("getAllStrategyEffectiveness returns multiple tracked strategies", () => {
    strategyEffectivenessCalculator.reset();

    strategyEffectivenessCalculator.recordStrategyOutcome("BUY", "win");
    strategyEffectivenessCalculator.recordStrategyOutcome("SELL", "loss");
    strategyEffectivenessCalculator.recordStrategyOutcome("ROLL", "loss");
    strategyEffectivenessCalculator.recordStrategyOutcome("ROLL", "win");

    const all = strategyEffectivenessCalculator.getAllStrategyEffectiveness();
    assert.ok(all.BUY);
    assert.ok(all.SELL);
    assert.ok(all.ROLL);

    assert.equal(all.BUY.wins, 1);
    assert.equal(all.BUY.losses, 0);
    assert.equal(all.SELL.wins, 0);
    assert.equal(all.SELL.losses, 1);
    assert.equal(all.ROLL.wins, 1);
    assert.equal(all.ROLL.losses, 1);
});
