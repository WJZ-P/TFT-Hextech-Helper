import test from "node:test";
import assert from "node:assert/strict";
import { GameStageType } from "../../src-backend/TFTProtocol";
import { RuleBasedDecisionEngine } from "../../src-backend/core/RuleBasedDecisionEngine";
import type { ObservedState } from "../../src-backend/core/types";

function buildBaseState(): ObservedState {
    return {
        timestamp: Date.now(),
        client: "RIOT_PC" as any,
        target: "PC_LOGIC",
        stageText: "3-2",
        stageType: GameStageType.PVP,
        level: 6,
        currentXp: 0,
        totalXp: 20,
        gold: 58,
        bench: [
            {
                id: "TFT_Annie",
                name: "安妮",
                star: 2,
                cost: 3,
                location: "SLOT_1",
                items: [],
                traits: ["法师"],
            },
        ],
        board: [
            {
                id: "TFT_Garen",
                name: "盖伦",
                star: 1,
                cost: 2,
                location: "R4_C4",
                items: [],
                traits: ["护卫"],
            },
        ],
        shop: [
            {
                slot: 0,
                cost: 3,
                unit: {
                    id: "TFT_Annie",
                    name: "安妮",
                    star: 1,
                    cost: 3,
                    items: [],
                    traits: ["法师"],
                },
            },
            { slot: 1, cost: null, unit: null },
            { slot: 2, cost: null, unit: null },
            { slot: 3, cost: null, unit: null },
            { slot: 4, cost: null, unit: null },
        ],
        items: ["无尽之刃"],
    };
}

test("RuleBasedDecisionEngine generates buy/move/level actions for standard PVP economy state", () => {
    const engine = new RuleBasedDecisionEngine();
    const state = buildBaseState();
    const plans = engine.generatePlan(state, {
        targetChampionNames: ["安妮"],
    });

    assert.ok(plans.some((plan) => plan.type === "BUY" && plan.payload.champion === "安妮"));
    assert.ok(plans.some((plan) => plan.type === "MOVE"));
    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP"));
    assert.ok(plans.some((plan) => plan.type === "EQUIP"));
});

test("RuleBasedDecisionEngine emits NOOP when no profitable action exists", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        gold: 10,
        level: 8,
        bench: [],
        shop: [
            { slot: 0, cost: null, unit: null },
            { slot: 1, cost: null, unit: null },
            { slot: 2, cost: null, unit: null },
            { slot: 3, cost: null, unit: null },
            { slot: 4, cost: null, unit: null },
        ],
        items: [],
    };

    const plans = engine.generatePlan(state);
    assert.equal(plans.length, 1);
    assert.equal(plans[0].type, "NOOP");
});
