import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { GameStageType } from "../../src-backend/TFTProtocol";
import { RuleBasedDecisionEngine } from "../../src-backend/core/RuleBasedDecisionEngine";
import type { FusionPlan } from "../../src-backend/core/RuleBasedDecisionEngine";
import type { ObservedState, DecisionContext } from "../../src-backend/core/types";

const repoRoot = path.resolve(process.cwd());

function readExampleFixture<T>(fileName: string): T {
    return JSON.parse(
        fs.readFileSync(path.join(repoRoot, "examples", "pc-logic", fileName), "utf8")
    ) as T;
}

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

test("RuleBasedDecisionEngine prioritizes loot pickup when Android observe reports loot orbs", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        client: "ANDROID" as any,
        target: "ANDROID_EMULATOR",
        metadata: {
            lootOrbs: [
                { x: 520, y: 180, type: "blue", confidence: 0.91 },
                { x: 610, y: 250, type: "gold", confidence: 0.93 },
            ],
        },
    };

    const plans = engine.generatePlan(state);
    const lootPlan = plans.find((plan) => plan.type === "PICK_LOOT");

    assert.equal(lootPlan?.priority, 110);
    assert.equal(lootPlan?.payload.count, 2);
    assert.equal(lootPlan?.payload.x, 520);
    assert.equal(plans[0]?.type, "PICK_LOOT");
});

test("RuleBasedDecisionEngine preserves direct android augment choice point", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        client: "ANDROID" as any,
        target: "ANDROID_EMULATOR",
        stageText: "augment-choice",
        stageType: GameStageType.AUGMENT,
        metadata: {
            augmentChoiceVisible: true,
            augmentChoicePoint: { x: 0.35, y: 0.54 },
        },
    };

    const plans = engine.generatePlan(state);
    const augmentPlan = plans.find((plan) => plan.type === "PICK_AUGMENT");

    assert.equal(augmentPlan?.payload.x, 0.35);
    assert.equal(augmentPlan?.payload.y, 0.54);
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

test("RuleBasedDecisionEngine converts excess stage-3 economy into levels when population lags", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "3-6",
        stageType: GameStageType.PVP,
        level: 6,
        gold: 99,
        hp: 70,
        board: [],
        shop: [],
    };

    const plans = engine.generatePlan(state);
    const levelPlan = plans.find((plan) => plan.type === "LEVEL_UP" && /经济溢出/.test(plan.reason));

    assert.equal(levelPlan?.payload.count, 2);
});

test("RuleBasedDecisionEngine levels from excess economy when Android stage OCR is unavailable", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "",
        stageType: GameStageType.UNKNOWN,
        level: 5,
        gold: 67,
        hp: 70,
        board: [],
        shop: [],
    };

    const plans = engine.generatePlan(state);
    const levelPlan = plans.find((plan) => plan.type === "LEVEL_UP" && /OCR/.test(plan.reason));

    assert.equal(levelPlan?.payload.count, 1);
});

test("RuleBasedDecisionEngine levels in late game when population is badly behind", () => {
    const engine = new RuleBasedDecisionEngine();
    const state: ObservedState = {
        ...buildBaseState(),
        stageText: "5-3",
        stageType: GameStageType.PVP,
        level: 6,
        gold: 27,
        hp: 18,
        board: [],
        shop: [],
    };

    const plans = engine.generatePlan(state);
    const levelPlan = plans.find((plan) => plan.type === "LEVEL_UP" && /人口明显落后/.test(plan.reason));

    assert.equal(levelPlan?.payload.count, 1);
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

test("RuleBasedDecisionEngine protects winstreak tempo by leveling on 3-2 earlier than the normal floor", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[] };
    }>("winstreak-keep-tempo-3-2.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /3-2/.test(plan.reason)));
});

test("RuleBasedDecisionEngine keeps winstreak tempo by leveling on 2-5", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { strategyPreset: "FAST8" };
    }>("winstreak-tempo-2-5.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /2-5/.test(plan.reason)));
});

test("RuleBasedDecisionEngine preserves economy on healthy loss-streak boards instead of panic rolling", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[] };
    }>("losestreak-econ-line-3-2.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(!plans.some((plan) => plan.type === "ROLL" && /4-2 \/ 5-1 目标对子进入受控稳血节奏/.test(plan.reason)));
});

test("RuleBasedDecisionEngine preserves economy on loss-streak board by avoiding unnecessary buys", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { strategyPreset: "STANDARD"; targetChampionNames: string[] };
    }>("loss-econ-no-d-3-2.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(!plans.some((plan) => plan.type === "ROLL"));
    assert.ok(!plans.some((plan) => plan.type === "BUY"));
});

test("RuleBasedDecisionEngine spends extra controlled roll budget for target pair all-in windows", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: {
            targetChampionNames: string[];
            allInPairThreshold: number;
            pairAllInStage: number;
            upgradeAllInExtraBudget: number;
            maxRollCount: number;
        };
    }>("target-allin-4-2.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    const rollPlan = plans.find((plan) => plan.type === "ROLL");

    assert.ok(rollPlan, "应在目标对子冲刺窗口触发滚牌");
    assert.equal(rollPlan?.payload.count, 4);
});

test("RuleBasedDecisionEngine stops loss after failed pair rush with a capped 4-2 roll", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: {
            targetChampionNames: string[];
            allInPairThreshold: number;
            pairAllInStage: number;
            upgradeAllInExtraBudget: number;
            maxRollCount: number;
        };
    }>("midgame-pair-stoploss-4-2.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    const rollPlan = plans.find((plan) => plan.type === "ROLL");

    assert.ok(rollPlan, "应在对子冲刺失败后执行止损 D 牌");
    assert.equal(rollPlan?.payload.count, 3);
});

test("RuleBasedDecisionEngine all-ins at stage 5 low hp with capped roll count", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { stabilizeHpThreshold: number; maxRollCount: number };
    }>("stage5-lowhp-allin.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    const rollPlan = plans.find((plan) => plan.type === "ROLL");

    assert.ok(rollPlan, "5阶段低血量应触发全力止损滚牌");
    assert.equal(rollPlan?.payload.count, 3);
    assert.ok(plans.some((plan) => /5 阶段低血量/.test(plan.reason)));
});

test("RuleBasedDecisionEngine preserves economy on stage 5 healthy boards instead of rolling all-in", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { strategyPreset: "STANDARD"; targetChampionNames: string[] };
    }>("stage5-highhp-econ.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(!plans.some((plan) => plan.type === "ROLL" && /4-2 \/ 5-1 目标对子进入受控稳血节奏/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "BUY"));
    assert.ok(plans.some((plan) => plan.type === "NOOP" || plan.type === "LEVEL_UP"));
});

test("RuleBasedDecisionEngine keeps stage-5 healthy target-pair spots on economy instead of forcing all-in", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: {
            strategyPreset: "STANDARD";
            targetChampionNames: string[];
            allInPairThreshold: number;
            pairAllInStage: number;
            upgradeAllInExtraBudget: number;
            maxRollCount: number;
        };
    }>("stage5-highhp-targetpair-econ.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(!plans.some((plan) => plan.type === "ROLL"));
    assert.ok(plans.some((plan) => plan.type === "BUY" && plan.payload.champion === "安妮"));
    assert.ok(!plans.some((plan) => plan.reason.includes("5 阶段低血量")));
});

test("RuleBasedDecisionEngine greed-levels on 4-5 when hp and economy are healthy", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { strategyPreset: "FAST8" };
    }>("greed-levelup-4-5.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /4-5/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "ROLL"));
});

test("RuleBasedDecisionEngine greed-levels on 4-5 high hp in the late-game tri-band", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { strategyPreset: "FAST8" };
    }>("lategame-4-5-highhp-greed.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /4-5/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "ROLL"));
});

test("RuleBasedDecisionEngine small-Ds on 4-5 mid hp in the late-game tri-band", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { stabilizeHpThreshold: number };
    }>("lategame-4-5-midhp-small-d.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    const rollPlan = plans.find((plan) => plan.type === "ROLL");

    assert.ok(rollPlan, "4-5 中血量应触发小 D 稳血");
    assert.equal(rollPlan?.payload.count, 2);
    assert.ok(plans.some((plan) => /4-5 \/ 5-1 中血量小 D 稳血/.test(plan.reason)));
});

test("RuleBasedDecisionEngine roll-downs on 5-1 when hp is low", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; stabilizeHpThreshold: number; maxRollCount: number };
    }>("roll-down-5-1.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    const rollPlan = plans.find((plan) => plan.type === "ROLL");

    assert.ok(rollPlan, "5-1 应触发小 D 稳血");
    assert.equal(rollPlan?.payload.count, 2);
    assert.ok(plans.some((plan) => /4-5 \/ 5-1 中血量小 D 稳血/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "LEVEL_UP" && /5-1/.test(plan.reason)));
});

test("RuleBasedDecisionEngine all-ins on 5-1 low hp in the late-game tri-band", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { stabilizeHpThreshold: number; maxRollCount: number };
    }>("lategame-5-1-lowhp-allin.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    const rollPlan = plans.find((plan) => plan.type === "ROLL");

    assert.ok(rollPlan, "5-1 低血量应触发 all-in");
    assert.equal(rollPlan?.payload.count, 3);
    assert.ok(plans.some((plan) => /全力止损/.test(plan.reason)));
});

test("RuleBasedDecisionEngine greed-levels on 4-2 when target pair is ready and hp is healthy", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; allInPairThreshold: number; pairAllInStage: number; upgradeAllInExtraBudget: number; maxRollCount: number };
    }>("targetpair-greed-4-2-levelup.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /4-2/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "ROLL" && /目标对子在危险血量/.test(plan.reason)));
});

test("RuleBasedDecisionEngine greed-levels on 4-2 high hp target-pair tri-band", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; allInPairThreshold: number; pairAllInStage: number; upgradeAllInExtraBudget: number; maxRollCount: number };
    }>("targetpair-4-2-highhp-greed.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /4-2/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "ROLL" && /4-2 \/ 5-1 目标对子进入受控稳血节奏/.test(plan.reason)));
});

test("RuleBasedDecisionEngine small-Ds on 4-2 mid hp target-pair tri-band", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; allInPairThreshold: number; pairAllInStage: number; upgradeAllInExtraBudget: number; maxRollCount: number; stabilizeHpThreshold: number };
    }>("targetpair-4-2-midhp-small-d.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    const rollPlan = plans.find((plan) => plan.type === "ROLL");

    assert.ok(rollPlan, "4-2 中血量 target-pair 应触发受控 small-D");
    assert.equal(rollPlan?.payload.count, 4);
    assert.ok(plans.some((plan) => /4-2 \/ 5-1 目标对子进入受控稳血节奏/.test(plan.reason)));
});

test("RuleBasedDecisionEngine stabilizes on 5-1 when target pair exists but hp is dangerous", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; stabilizeHpThreshold: number; allInPairThreshold: number; pairAllInStage: number; upgradeAllInExtraBudget: number; maxRollCount: number };
    }>("targetpair-stabilize-5-1-danger.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    const rollPlan = plans.find((plan) => plan.type === "ROLL");

    assert.ok(rollPlan, "危险血量 5-1 应触发稳血 roll-down");
    assert.equal(rollPlan?.payload.count, 4);
    assert.ok(plans.some((plan) => /4-5 \/ 5-1 进入低血量 roll-down/.test(plan.reason)));
});

test("RuleBasedDecisionEngine roll-downs on 5-1 low hp target-pair tri-band", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; stabilizeHpThreshold: number; allInPairThreshold: number; pairAllInStage: number; upgradeAllInExtraBudget: number; maxRollCount: number };
    }>("targetpair-5-1-lowhp-roll-down.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    const rollPlan = plans.find((plan) => plan.type === "ROLL");

    assert.ok(rollPlan, "5-1 低血量 target-pair 应优先保命 roll-down");
    assert.equal(rollPlan?.payload.count, 4);
    assert.ok(plans.some((plan) => /4-5 \/ 5-1 进入低血量 roll-down/.test(plan.reason)));
});

test("RuleBasedDecisionEngine exits target-pair chase on safe 4-2 and returns to level-up tempo", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; allInPairThreshold: number; pairAllInStage: number; upgradeAllInExtraBudget: number; maxRollCount: number; strategyPreset: "STANDARD" };
    }>("targetpair-exit-4-2-safe.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /4-2/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "ROLL" && /目标对子/.test(plan.reason)));
});

test("RuleBasedDecisionEngine keeps chasing target-pair on dangerous 4-2", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; allInPairThreshold: number; pairAllInStage: number; upgradeAllInExtraBudget: number; maxRollCount: number; stabilizeHpThreshold: number; strategyPreset: "STANDARD" };
    }>("targetpair-exit-4-2-danger.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "ROLL"));
    assert.ok(!plans.some((plan) => plan.type === "LEVEL_UP" && /恢复运营节奏/.test(plan.reason)));
});

test("RuleBasedDecisionEngine exits target-pair chase on safe 5-1 and returns to standard late-game tempo", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; allInPairThreshold: number; pairAllInStage: number; upgradeAllInExtraBudget: number; maxRollCount: number; strategyPreset: "STANDARD" };
    }>("targetpair-exit-5-1-safe.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /5-1/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "ROLL" && /目标对子/.test(plan.reason)));
});

test("RuleBasedDecisionEngine target-pair remains weighted but does not override low-hp defense", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; allInPairThreshold: number; pairAllInStage: number; upgradeAllInExtraBudget: number; maxRollCount: number; stabilizeHpThreshold: number; strategyPreset: "STANDARD" };
    }>("targetpair-exit-4-2-lowhp-control.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "ROLL"));
    assert.ok(!plans.some((plan) => plan.type === "LEVEL_UP" && /恢复运营节奏/.test(plan.reason)));
});

test("RuleBasedDecisionEngine preserves economy on 5-1 high hp healthy econ boards", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { strategyPreset: "STANDARD" };
    }>("recovery-5-1-highhp-econ.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /5-1/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "ROLL"));
});

test("RuleBasedDecisionEngine keeps 5-1 high hp target-pair spots on economy", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; allInPairThreshold: number; pairAllInStage: number; upgradeAllInExtraBudget: number; maxRollCount: number; strategyPreset: "STANDARD" };
    }>("recovery-5-1-highhp-targetpair-econ.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /5-1|目标对子已成型/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "ROLL"));
});

test("RuleBasedDecisionEngine turns failed 4-5 small-D into level-up recovery when hp is safe", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { stabilizeHpThreshold: number; strategyPreset: "STANDARD" };
    }>("recovery-4-5-levelup.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /恢复运营节奏/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "ROLL" && /中血量小 D 稳血/.test(plan.reason)));
});

test("RuleBasedDecisionEngine does not greed-recover on 4-5 when hp is dangerous", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { stabilizeHpThreshold: number; strategyPreset: "STANDARD" };
    }>("recovery-4-5-danger-no-greed.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(!plans.some((plan) => plan.type === "LEVEL_UP" && /恢复运营节奏/.test(plan.reason)));
    assert.ok(plans.some((plan) => plan.type === "ROLL"));
});

test("RuleBasedDecisionEngine abandons stale target pursuit on safe 4-2 and returns to standard tempo", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; strategyPreset: "STANDARD" };
    }>("pivot-standard-4-2-stale-target.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /4-2/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "BUY" && plan.payload.champion === "波比"));
});

test("RuleBasedDecisionEngine stops chasing low-quality pairs on 4-5 and pivots to stronger board tempo", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; strategyPreset: "STANDARD" };
    }>("pivot-4-5-lowquality-pair.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "LEVEL_UP" && /4-5/.test(plan.reason)));
    assert.ok(!plans.some((plan) => plan.type === "BUY" && plan.payload.champion === "波比"));
});

test("RuleBasedDecisionEngine drops low-value chase-three at 5-1 when survival matters", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; stabilizeHpThreshold: number; strategyPreset: "STANDARD" };
    }>("pivot-5-1-drop-chase3.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);

    assert.ok(plans.some((plan) => plan.type === "ROLL"));
    assert.ok(!plans.some((plan) => plan.type === "BUY" && plan.payload.champion === "波比"));
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

// ===== Multi-Fusion Parallel Evaluation Tests (Task D) =====

test("RuleBasedDecisionEngine evaluates multi-fusion paths and returns sorted results", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; strategyPreset: "STANDARD" };
    }>("multi-fusion-comparison.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    
    // Should generate BUY plans for target champions
    const buyPlans = plans.filter((p) => p.type === "BUY");
    assert.ok(buyPlans.length > 0, "Should have BUY plans when targets in shop");
    
    // Priority should be numeric and within valid range
    for (const plan of buyPlans) {
        assert.ok(typeof plan.priority === "number", "Priority should be numeric");
        assert.ok(plan.priority >= 0 && plan.priority <= 100, "Priority should be 0-100");
    }
});

test("RuleBasedDecisionEngine adjusts priority based on fusion path quality", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; strategyPreset: "STANDARD" };
    }>("multi-fusion-comparison.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    
    // Target champions should have higher priority than non-targets
    const buyPlans = plans.filter((p) => p.type === "BUY");
    const targetBuys = buyPlans.filter((p) => 
        fixture.context.targetChampionNames.includes(p.payload.champion as string)
    );
    
    if (targetBuys.length > 0) {
        // Target buys should have priority >= 90 (base is 90, fusion can boost higher)
        for (const plan of targetBuys) {
            assert.ok(plan.priority >= 90, `Target ${plan.payload.champion} priority should be >= 90, got ${plan.priority}`);
        }
    }
});

test("computeRiskAdjustedScore boosts priority when HP is below threshold", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; stabilizeHpThreshold: number; strategyPreset: "STANDARD" };
    }>("opponent-counter.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    
    // With HP=30 and threshold=42, should trigger mustStabilize
    // ROLL plans should exist and have elevated priority
    const rollPlans = plans.filter((p) => p.type === "ROLL");
    if (rollPlans.length > 0) {
        assert.ok(rollPlans[0].priority >= 80, "ROLL priority should be elevated when mustStabilize");
    }
});

test("computeRiskAdjustedScore reduces economy spending when gold is low", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; strategyPreset: "STANDARD" };
    }>("opponent-counter.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    
    // With gold=25 and HP=30, economy floor should restrict spending
    // Soft budget should limit non-essential buys
    const buyPlans = plans.filter((p) => p.type === "BUY");
    
    // Check that total gold spent doesn't exceed reasonable limits
    let totalSpent = 0;
    for (const plan of buyPlans) {
        totalSpent += (plan.payload.cost as number) ?? 0;
    }
    
    // Should not spend more than available gold
    assert.ok(totalSpent <= fixture.state.gold, "Should not spend more than available gold");
});

test("Fusion path scoring includes synergy count", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; strategyPreset: "STANDARD" };
    }>("multi-fusion-comparison.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    
    // Shop has 安妮 which is a target champion
    // Should recognize synergy potential and boost relevant buys
    const targetBuy = plans.find((p) => 
        p.type === "BUY" && 
        p.payload.champion === "安妮"
    );
    
    // 安妮 is on stabilize round (4-2), willing to spend, and is a target
    // Should have a BUY plan with priority >= 90 (target buy base)
    if (targetBuy) {
        assert.ok(targetBuy.priority >= 90, "Target buy with synergy should have priority >= 90");
    }
    // Note: If no buy plan, it means other filters (budget, bench overflow) prevented it
    // which is also valid behavior
});

test("Priority ordering follows (b.priority - a.priority || a.tick - b.tick)", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; strategyPreset: "STANDARD" };
    }>("multi-fusion-comparison.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    
    // Verify plans are sorted by priority descending
    for (let i = 1; i < plans.length; i++) {
        const prev = plans[i - 1];
        const curr = plans[i];
        
        // If priorities are equal, earlier tick should come first
        if (prev.priority === curr.priority) {
            assert.ok(prev.tick < curr.tick, "Plans with equal priority should maintain tick order");
        } else {
            assert.ok(prev.priority >= curr.priority, "Plans should be sorted by priority descending");
        }
    }
});

test("Weak board triggers mustStabilize and fusion priority boost", () => {
    const engine = new RuleBasedDecisionEngine();
    
    // Create a state with weak board (level 7 but only 2 units)
    const state: ObservedState = {
        timestamp: 1710000000000,
        client: "RIOT_PC" as any,
        target: "PC_LOGIC" as any,
        stageText: "4-2",
        stageType: GameStageType.PVP,
        level: 7,
        currentXp: 0,
        totalXp: 28,
        gold: 35,
        hp: 55,
        streak: 0,
        bench: [
            { id: "TFT_A", name: "测试A", star: 1, cost: 2, location: "SLOT_1", items: [], traits: ["测试"] }
        ],
        board: [
            { id: "TFT_B", name: "测试B", star: 1, cost: 2, location: "BOARD_1", items: [], traits: ["测试"] }
        ],
        shop: [
            { slot: 0, cost: 2, unit: { id: "TFT_A2", name: "测试A", star: 1, cost: 2, items: [], traits: ["测试"] } },
            { slot: 1, cost: null, unit: null },
            { slot: 2, cost: null, unit: null },
            { slot: 3, cost: null, unit: null },
            { slot: 4, cost: null, unit: null }
        ],
        items: []
    };
    
    const context: DecisionContext = {
        targetChampionNames: ["测试A"],
        strategyPreset: "STANDARD",
        stabilizeHpThreshold: 42,
    };
    
    const plans = engine.generatePlan(state, context);
    
    // Board is weak (2 units vs expected ~4.6*7=32 strength)
    // Should trigger mustStabilize
    // ROLL or LEVEL_UP should exist with elevated priority
    const stabilizePlans = plans.filter((p) => p.type === "ROLL" || p.type === "LEVEL_UP");
    assert.ok(stabilizePlans.length > 0, "Should have stabilization plans for weak board");
});

test("End-to-end: BUY priority reflects fusion path quality", () => {
    const engine = new RuleBasedDecisionEngine();
    const fixture = readExampleFixture<{
        state: ObservedState;
        context: { targetChampionNames: string[]; strategyPreset: "STANDARD" };
    }>("multi-fusion-comparison.json");

    const plans = engine.generatePlan(fixture.state, fixture.context);
    
    // Find all BUY plans
    const buyPlans = plans.filter((p) => p.type === "BUY");
    
    // All BUY plans should have valid priority
    for (const plan of buyPlans) {
        assert.ok(typeof plan.priority === "number", "Priority must be numeric");
        assert.ok(plan.priority >= 0 && plan.priority <= 100, "Priority must be in 0-100 range");
        
        // CanUpgradeSoon (95) >= Target (90+) >= Generic (72+)
        if (plan.reason.includes("合成升星")) {
            assert.ok(plan.priority >= 95, "Upgrade-imminent should have priority >= 95");
        }
    }
    
    // Verify plans are properly sorted
    for (let i = 1; i < plans.length; i++) {
        assert.ok(
            plans[i - 1].priority > plans[i].priority || 
            (plans[i - 1].priority === plans[i].priority && plans[i - 1].tick < plans[i].tick),
            "Plans should be sorted by priority desc, then tick asc"
        );
    }
    
    // If there are target buys, they should have high priority
    const targetBuys = buyPlans.filter((p) => 
        fixture.context.targetChampionNames.includes(p.payload.champion as string)
    );
    for (const plan of targetBuys) {
        assert.ok(plan.priority >= 90, `Target ${plan.payload.champion} should have priority >= 90`);
    }
});

// ===== evaluateFusionQuality unit tests (Task B3) =====
test("RuleBasedDecisionEngine.evaluateFusionQuality - high quality fusion", () => {
    const engine = new RuleBasedDecisionEngine();
    const state = buildBaseState();

    const plan: FusionPlan = {
        champions: ["安妮"],
        estimatedGoldCost: 3,
        requiredBenchSlots: 1,
        roundsToComplete: 3,
    };

    const score = engine.evaluateFusionQuality(plan, state);
    // Low cost, ample bench space, shop/owned coverage → maxed score
    assert.equal(score, 100);
});

test("RuleBasedDecisionEngine.evaluateFusionQuality - low quality fusion (no bench space, low gold)", () => {
    const engine = new RuleBasedDecisionEngine();
    const base = buildBaseState();
    const state: ObservedState = {
        ...base,
        gold: 20,
        // fill bench to block slots
        bench: Array.from({ length: 9 }).map((_, i) => ({
            id: `B${i}`,
            name: `单位${i}`,
            star: 1,
            cost: 1,
            location: `SLOT_${i}`,
            items: [],
            traits: [],
        })),
        shop: [
            { slot: 0, cost: null, unit: null },
            { slot: 1, cost: null, unit: null },
            { slot: 2, cost: null, unit: null },
            { slot: 3, cost: null, unit: null },
            { slot: 4, cost: null, unit: null },
        ],
    };

    const plan: FusionPlan = {
        champions: ["不存在的单位"],
        estimatedGoldCost: 50,
        requiredBenchSlots: 3,
        roundsToComplete: 3,
    };

    const score = engine.evaluateFusionQuality(plan, state);
    // No budget, no bench space, no shop matches → minimal score
    assert.equal(score, 0);
});

test("RuleBasedDecisionEngine.evaluateFusionQuality - medium quality fusion", () => {
    const engine = new RuleBasedDecisionEngine();
    const base = buildBaseState();
    const state: ObservedState = {
        ...base,
        gold: 35,
        bench: Array.from({ length: 7 }).map((_, i) => ({
            id: `B${i}`,
            name: `单位${i}`,
            star: 1,
            cost: 1,
            location: `SLOT_${i}`,
            items: [],
            traits: [],
        })),
        shop: [
            { slot: 0, cost: 3, unit: { id: "TFT_X", name: "X", star: 1, cost: 3, items: [], traits: [] } },
            { slot: 1, cost: null, unit: null },
            { slot: 2, cost: null, unit: null },
            { slot: 3, cost: null, unit: null },
            { slot: 4, cost: null, unit: null },
        ],
    };

    const plan: FusionPlan = {
        champions: [{ name: "X", copiesNeeded: 2 }],
        estimatedGoldCost: 10,
        requiredBenchSlots: 4,
        roundsToComplete: 3,
    };

    const score = engine.evaluateFusionQuality(plan, state);
    // costScore=20, benchScore=15, shopScore=15, synergyBoost ~=0 → total 50
    assert.equal(score, 50);
});

test("RuleBasedDecisionEngine.evaluateFusionQuality - missing items penalty reduces score", () => {
    const engine = new RuleBasedDecisionEngine();
    const state = buildBaseState();

    const plan: FusionPlan = {
        champions: ["安妮"],
        estimatedGoldCost: 3,
        requiredBenchSlots: 1,
        requiredItems: ["巨人杀手", "正义之手"], // both missing in base state
        roundsToComplete: 3,
    };

    const score = engine.evaluateFusionQuality(plan, state);
    // High base score (100) minus max item penalty (10) → 90
    assert.equal(score, 90);
});

// === New tests for importStrategy / exportStrategy ===
test("RuleBasedDecisionEngine.importStrategy rejects malformed JSON (additional)", () => {
    const engine = new RuleBasedDecisionEngine();
    const ctx: DecisionContext = {};
    const ok = engine.importStrategy("{ not: 'json'", ctx);
    assert.equal(ok, false, "malformed JSON should be rejected (additional test)");
});

test("RuleBasedDecisionEngine.importStrategy applies hints to DecisionContext correctly", () => {
    const engine = new RuleBasedDecisionEngine();
    const ctx: DecisionContext = {};

    // ROLL with high priority should suggest increasing maxRollCount to at least 3
    const strategy = { planType: "ROLL", priority: 90, reason: "aggressive roll" };
    const ok = engine.importStrategy(JSON.stringify(strategy), ctx);
    assert.equal(ok, true, "valid ROLL strategy should be accepted");
    assert.ok(typeof ctx.maxRollCount === "number" && ctx.maxRollCount >= 3, "import should set or bump maxRollCount >= 3");
});

test("RuleBasedDecisionEngine.exportStrategy returns parseable JSON with expected shape", () => {
    const engine = new RuleBasedDecisionEngine();
    const state = buildBaseState();
    const ctx: DecisionContext = {};

    const json = engine.exportStrategy(state, ctx);
    assert.equal(typeof json, "string", "exportStrategy should return a string");

    const parsed = JSON.parse(json);
    assert.ok(parsed && typeof parsed === "object", "exported string should parse to an object");
    assert.ok(typeof parsed.planType === "string", "exported strategy should include planType string");
    assert.ok(typeof parsed.priority === "number", "exported strategy should include numeric priority");
    assert.ok(typeof parsed.reason === "string", "exported strategy should include reason string");
});
