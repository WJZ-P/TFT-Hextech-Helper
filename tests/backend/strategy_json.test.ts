import test from "node:test";
import assert from "node:assert/strict";
import { RuleBasedDecisionEngine } from "../../src-backend/core/RuleBasedDecisionEngine";
import type { DecisionContext } from "../../src-backend/core/types";

// Minimal observed state fixture
const baseState: any = {
    timestamp: Date.now(),
    client: { id: "test" },
    target: "PC_LOGIC",
    stageText: "2-1",
    stageType: 0,
    level: 3,
    currentXp: 0,
    totalXp: 0,
    gold: 10,
    bench: [],
    board: [],
    shop: [],
    items: [],
    patch: "",
};

test("round trips a generated strategy", () => {
    const engine = new RuleBasedDecisionEngine();
    const ctx: DecisionContext = {};
    const json = engine.exportStrategy(baseState, ctx);
    assert.equal(typeof json, "string");

    const ok = engine.importStrategy(json, ctx);
    assert.equal(ok, true, "import should accept valid exported JSON");
});

test("rejects malformed JSON", () => {
    const engine = new RuleBasedDecisionEngine();
    const ctx: DecisionContext = {};
    const ok = engine.importStrategy("not a json", ctx);
    assert.equal(ok, false, "malformed JSON should be rejected");
});

test("rejects invalid structure", () => {
    const engine = new RuleBasedDecisionEngine();
    const ctx: DecisionContext = {};
    const bad = JSON.stringify({ planType: "UNKNOWN", priority: 999, reason: 123 });
    const ok = engine.importStrategy(bad, ctx);
    assert.equal(ok, false, "invalid strategy fields should be rejected");
});
