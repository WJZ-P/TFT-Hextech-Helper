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
    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" || plan.type === "ROLL"));
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

test("RuleBasedDecisionEngine follows key tempo level-up on 2-1", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "2-1",
        level: 3,
        gold: 12,
        board: [
            {
                id: "TFT_KSante",
                name: "奎桑提",
                star: 1,
                cost: 1,
                location: "R4_C4",
                items: [],
                traits: ["护卫"],
            },
        ],
    };

    const plans = engine.generatePlan(state, {
        targetChampionNames: ["安妮"],
    });
    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP"));
});

test("RuleBasedDecisionEngine triggers stabilize roll when hp is low", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "4-2",
        level: 8,
        gold: 40,
        hp: 28,
        board: [
            {
                id: "TFT_One",
                name: "过渡前排",
                star: 1,
                cost: 1,
                location: "R4_C4",
                items: [],
                traits: ["护卫"],
            },
            {
                id: "TFT_Two",
                name: "过渡后排",
                star: 1,
                cost: 1,
                location: "R3_C3",
                items: [],
                traits: ["狙神"],
            },
        ],
    };

    const plans = engine.generatePlan(state, {
        targetChampionNames: ["安妮"],
    });
    const rollPlan = plans.find((plan) => plan.type === "ROLL");
    assert.ok(rollPlan);
    assert.ok(Number((rollPlan?.payload.count ?? 0)) >= 2);
});

test("RuleBasedDecisionEngine follows standard level 7 timing on 4-1 for healthy fast-8 boards", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "4-1",
        level: 6,
        gold: 24,
        hp: 72,
        board: [
            {
                id: "TFT_Garen",
                name: "盖伦",
                star: 2,
                cost: 2,
                location: "R4_C4",
                items: [],
                traits: ["护卫"],
            },
            {
                id: "TFT_Malzahar",
                name: "玛尔扎哈",
                star: 2,
                cost: 3,
                location: "R3_C4",
                items: [],
                traits: ["法师"],
            },
        ],
    };

    const plans = engine.generatePlan(state, {
        strategyPreset: "FAST8",
        targetChampionNames: ["安妮"],
    });

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /4-1/.test(plan.reason)));
});

// 真人运营在3-2偏弱阵容时会D牌找升星，避免被打穿血量
// 中期节奏点：战力不足触发保命滚牌，优于死扛攒钱
test("RuleBasedDecisionEngine recommends D-card roll window on 3-2 when board is weak", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "3-2",
        level: 5,
        gold: 28,
        hp: 55,
        board: [
            {
                id: "TFT_WeakUnit",
                name: "弱单位",
                star: 1,
                cost: 1,
                location: "R4_C4",
                items: [],
                traits: ["护卫"],
            },
        ],
    };

    const plans = engine.generatePlan(state, {
        targetChampionNames: ["安妮"],
    });
    assert.ok(plans.some((p) => p.type === "ROLL" && /稳场/.test(p.reason)));
});

test("RuleBasedDecisionEngine holds economy floor on 4-5 late stage with FAST8 preset", () => {
    // FAST8路线在4-5非关键时机，真人会停手攒钱冲8，不随意买过渡牌
    // 前提：阵容满编（level=6 单位）、血量健康、经济恰好在 floor，softBudget=0 → 不买
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "4-5",
        level: 6,
        // gold exactly at FAST8 stage-4 economy floor (24) → softBudget=0
        gold: 24,
        hp: 60,
        // Provide a full board (6 units at level 6) with decent star-2 units so board is NOT weak
        board: [
            { id: "TFT_A", name: "盖伦", star: 2, cost: 3, location: "R4_C1", items: [], traits: ["护卫"] },
            { id: "TFT_B", name: "玛尔扎哈", star: 2, cost: 3, location: "R4_C2", items: [], traits: ["法师"] },
            { id: "TFT_C", name: "赛恩", star: 2, cost: 2, location: "R4_C3", items: [], traits: ["斗士"] },
            { id: "TFT_D", name: "慎", star: 2, cost: 2, location: "R4_C4", items: [], traits: ["护卫"] },
            { id: "TFT_E", name: "厄斐琉斯", star: 2, cost: 3, location: "R1_C5", items: [], traits: ["狙神"] },
            { id: "TFT_F", name: "巴德", star: 2, cost: 3, location: "R1_C6", items: [], traits: ["神谕者"] },
        ],
        shop: [
            {
                slot: 0,
                cost: 5,
                unit: {
                    id: "TFT_Expensive",
                    name: "昂贵单位",
                    star: 1,
                    cost: 5,
                    items: [],
                    traits: ["法师"],
                },
            },
            {
                slot: 1,
                cost: 3,
                unit: {
                    id: "TFT_NonTarget",
                    name: "非目标单位",
                    star: 1,
                    cost: 3,
                    items: [],
                    traits: ["狙神"],
                },
            },
            { slot: 2, cost: null, unit: null },
            { slot: 3, cost: null, unit: null },
            { slot: 4, cost: null, unit: null },
        ],
        bench: [],
        items: [],
    };

    const plans = engine.generatePlan(state, {
        strategyPreset: "FAST8",
        targetChampionNames: ["安妮"],
    });

    assert.ok(plans.every((p) => p.type !== "BUY"));
    assert.ok(plans.some((p) => p.type === "NOOP" || p.type === "LEVEL_UP" || p.type === "ROLL"));
});

test("RuleBasedDecisionEngine triggers stabilize roll on 5-1 when HP is critical", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "5-1",
        level: 8,
        gold: 22,
        hp: 25,
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
            {
                id: "TFT_Malzahar",
                name: "玛尔扎哈",
                star: 1,
                cost: 3,
                location: "R3_C4",
                items: [],
                traits: ["法师"],
            },
        ],
    };

    const plans = engine.generatePlan(state, {
        targetChampionNames: ["安妮"],
    });
    assert.ok(plans.some((p) => p.type === "ROLL" && Number(p.payload.count) >= 2));
});

// Combo judgment 1: medium-HP stabilize (hp=50, weak board at 3-2)
// Board is too weak for the stage (1-cost unit = 1.25 strength vs expected 22.8),
// triggering mustStabilize via weakBoard even though hp > 42.
// Roll fires (small D, count=2) rather than LEVEL_UP — stabilize takes priority
// over tempo when the board is the primary threat.
test("RuleBasedDecisionEngine rolls small D at 3-2 with medium HP and weak board (stabilize vs greedy)", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "3-2",
        level: 6,
        gold: 38,
        hp: 50,
        bench: [
            {
                id: "TFT_Annie",
                name: "安妮",
                star: 1,
                cost: 3,
                location: "SLOT_1",
                items: [],
                traits: ["法师"],
            },
        ],
        board: [
            {
                id: "TFT_WeakUnit",
                name: "过渡前排",
                star: 1,
                cost: 1,
                location: "R4_C4",
                items: [],
                traits: ["护卫"],
            },
        ],
    };

    const plans = engine.generatePlan(state, { targetChampionNames: ["安妮"] });

    // mustStabilize fires via weakBoard; 3-2 is a keyStabilizeRound → ROLL expected
    const rollPlan = plans.find((p) => p.type === "ROLL");
    assert.ok(rollPlan, "Should fire ROLL when board is weak even at medium HP");
    // Small D: hp=50 (42-50 bracket) → baseRoll=2, budget=(38-30)/2=4 → count=min(2,4)=2
    assert.equal(Number(rollPlan?.payload.count), 2, "Small targeted roll expected, not all-in");
    // Stabilize round: roll takes priority; no LEVEL_UP expected here
    assert.ok(!plans.some((p) => p.type === "LEVEL_UP"), "LEVEL_UP should not fire during stabilize round");
});

// Combo judgment 2: FAST8 vs standard economy floor difference (4-1)
// Board has 3 high-value units at level 6: board.length=3 < level-1=5 → weakBoard via slot underfill.
// Both presets: mustStabilize=true (via weakBoard).
// FAST8: economyFloor=24, rollBudget=8 → count=2
// Standard: economyFloor=30, rollBudget=2 → count=1
// FAST8's lower economy floor (24 vs 30) means more gold available for stabilization rolling
// when mustStabilize fires. Tests the compositional economy floor divergence.
test("RuleBasedDecisionEngine: FAST8 rolls more aggressively than standard due to lower economy floor", () => {
    const engine = new RuleBasedDecisionEngine();

    const baseState: ObservedState = {
        ...buildBaseState(),
        stageText: "4-1",
        level: 6,
        gold: 32,
        hp: 44,
        board: [
            { id: "TFT_A", name: "高费前排", star: 2, cost: 5, location: "R4_C4", items: [], traits: ["护卫"] },
            { id: "TFT_B", name: "高费后排", star: 2, cost: 5, location: "R3_C4", items: [], traits: ["斗士"] },
            { id: "TFT_C", name: "高费中排", star: 2, cost: 5, location: "R4_C5", items: [], traits: ["神谕者"] },
        ],
    };

    const fast8Plans = engine.generatePlan(baseState, { strategyPreset: "FAST8" });
    const standardPlans = engine.generatePlan(baseState, { strategyPreset: "STANDARD" });

    // Both roll due to mustStabilize (weakBoard from board underfill: 3 < 5)
    const fast8Roll = fast8Plans.find((p) => p.type === "ROLL");
    const standardRoll = standardPlans.find((p) => p.type === "ROLL");
    assert.ok(fast8Roll, "FAST8 should ROLL at 4-1 when mustStabilize fires (weakBoard from underfill)");
    assert.ok(standardRoll, "Standard should ROLL at 4-1 when mustStabilize fires");

    // FAST8: economyFloor=24, rollBudget=max(0,32-24)=8 → count=min(3,floor(8/2))=3
    // Standard: economyFloor=30, rollBudget=max(0,32-30)=2 → count=min(3,floor(2/2))=1
    assert.ok(
        Number(fast8Roll?.payload.count) > Number(standardRoll?.payload.count),
        "FAST8 should roll MORE than standard due to lower economy floor (24 vs 30)"
    );
});

// Combo judgment 3: small-roll threshold (hp=45, 3-2 weak board)
// Tests that the engine does NOT over-roll when hp is borderline.
// hp=45 (just above strict threshold 42), weakBoard=true, gold=36:
// mustStabilize fires via weakBoard. Roll budget = (36-30)/2=3, baseRoll=2 → count=2.
// This is a controlled "small D", not an all-in.
test("RuleBasedDecisionEngine: small roll threshold at borderline HP (45) — controlled D not all-in", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "3-2",
        level: 6,
        gold: 36,
        hp: 45,
        board: [
            {
                id: "TFT_WeakUnit",
                name: "过渡前排",
                star: 1,
                cost: 1,
                location: "R4_C4",
                items: [],
                traits: ["护卫"],
            },
        ],
    };

    const plans = engine.generatePlan(state, { targetChampionNames: [] });

    // mustStabilize fires via weakBoard (board strength 1.25 << expected 22.8)
    const rollPlan = plans.find((p) => p.type === "ROLL");
    assert.ok(rollPlan, "Should roll when board is weak (borderline hp does not override weakBoard)");
    // Controlled small D: hp=45 (42-50 bracket) → baseRoll=2, budget=(36-30)/2=3 → count=min(2,3)=2
    assert.equal(
        Number(rollPlan?.payload.count),
        2,
        "Borderline HP should produce small targeted roll, not aggressive all-in"
    );
    assert.ok(
        Number(rollPlan?.payload.count) <= 3,
        "Roll count should stay controlled even when stabilization fires"
    );
});

// Combo judgment 4: loss-streak sell (bench overflow + low HP + no gold)
// When bench is full, hp is dangerously low, and player cannot afford to roll,
// the engine must sell a non-target bench unit to prevent losing on overflow.
// hp=35, gold=8 (< 12 refresh cost), bench overflow (9 units):
// isBenchOverflowed=true, hp<=42=true, gold<12=true → SELL condition fires.
// Priority: sell cheapest, lowest-star, non-target unit.
test("RuleBasedDecisionEngine: sells bench unit when bench overflows with low HP and no gold for rolling", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "4-3",
        level: 6,
        gold: 8,
        hp: 35,
        bench: [
            { id: "TFT_B1", name: "卖一", star: 1, cost: 1, location: "SLOT_1", items: [], traits: ["护卫"] },
            { id: "TFT_B2", name: "卖二", star: 1, cost: 1, location: "SLOT_2", items: [], traits: ["斗士"] },
            { id: "TFT_B3", name: "卖三", star: 1, cost: 1, location: "SLOT_3", items: [], traits: ["护卫"] },
            { id: "TFT_B4", name: "卖四", star: 1, cost: 2, location: "SLOT_4", items: [], traits: ["斗士"] },
            { id: "TFT_B5", name: "卖五", star: 1, cost: 1, location: "SLOT_5", items: [], traits: ["神谕者"] },
            { id: "TFT_B6", name: "卖六", star: 1, cost: 1, location: "SLOT_6", items: [], traits: ["护卫"] },
            { id: "TFT_B7", name: "卖七", star: 1, cost: 1, location: "SLOT_7", items: [], traits: ["斗士"] },
            { id: "TFT_B8", name: "卖八", star: 2, cost: 2, location: "SLOT_8", items: [], traits: ["护卫"] },
            { id: "TFT_B9", name: "卖九", star: 1, cost: 1, location: "SLOT_9", items: [], traits: ["神谕者"] },
        ],
        board: [
            { id: "TFT_Front", name: "前排", star: 2, cost: 2, location: "R4_C4", items: [], traits: ["护卫"] },
            { id: "TFT_Back", name: "后排", star: 2, cost: 2, location: "R3_C4", items: [], traits: ["斗士"] },
        ],
    };

    const plans = engine.generatePlan(state, { targetChampionNames: [] });

    // Sell condition: benchOverflowed && hp<=42 && gold<12
    const sellPlan = plans.find((p) => p.type === "SELL");
    assert.ok(sellPlan, "Should SELL bench unit when bench overflows + low HP + cannot afford roll");
    // Sort order: cost asc, then star asc. "卖一" (cost=1, star=1) should be first.
    assert.equal(
        sellPlan?.payload.champion,
        "卖一",
        "Should sell cheapest, lowest-star non-target bench unit (cost=1, star=1)"
    );
    // Priority 75: sells take lower priority than stabilize rolls (82) and bench moves (88)
    assert.equal(sellPlan?.priority, 75, "Sell priority should be 75 (lower than roll at 82)");
});
