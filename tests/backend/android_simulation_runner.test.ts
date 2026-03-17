import test from "node:test";
import assert from "node:assert/strict";
import { GameStageType } from "../../src-backend/TFTProtocol";
import { buildAndroidExecutionPlan } from "../../src-backend/adapters/AndroidActionPlanner";
import type { ActionPlan, ObservedState } from "../../src-backend/core/types";
import { androidSimulationRunner } from "../../src-backend/services/AndroidSimulationRunner";

function buildBaseAndroidState(): ObservedState {
    return {
        timestamp: Date.now(),
        client: "ANDROID" as ObservedState["client"],
        target: "ANDROID_EMULATOR",
        stageText: "3-2",
        stageType: GameStageType.PVP,
        level: 6,
        currentXp: 0,
        totalXp: 20,
        gold: 48,
        hp: 52,
        bench: [
            {
                id: "TFT16_Annie",
                name: "安妮",
                star: 2,
                cost: 3,
                location: "SLOT_1",
                items: [],
                traits: ["法师"],
            },
            {
                id: "TFT16_Syndra",
                name: "辛德拉",
                star: 1,
                cost: 2,
                location: "SLOT_2",
                items: [],
                traits: ["法师"],
            },
        ],
        board: [
            {
                id: "TFT16_Galio",
                name: "加里奥",
                star: 1,
                cost: 2,
                location: "R1_C1",
                items: [],
                traits: ["护卫"],
            },
            {
                id: "TFT16_Annie",
                name: "安妮",
                star: 1,
                cost: 3,
                location: "R4_C4",
                items: ["鬼索的狂暴之刃"],
                traits: ["法师"],
            },
        ],
        shop: [
            {
                slot: 0,
                cost: 3,
                unit: {
                    id: "TFT16_Annie",
                    name: "安妮",
                    star: 1,
                    cost: 3,
                    items: [],
                    traits: ["法师"],
                },
            },
            {
                slot: 1,
                cost: 2,
                unit: {
                    id: "TFT16_Syndra",
                    name: "辛德拉",
                    star: 1,
                    cost: 2,
                    items: [],
                    traits: ["法师"],
                },
            },
            { slot: 2, cost: null, unit: null },
            { slot: 3, cost: null, unit: null },
            { slot: 4, cost: null, unit: null },
        ],
        items: ["无尽之刃"],
    };
}

test("AndroidActionPlanner allocates unique AUTO_SLOT targets across consecutive move actions", () => {
    const state = buildBaseAndroidState();
    const actions: ActionPlan[] = [
        {
            tick: 0,
            type: "MOVE",
            priority: 90,
            reason: "上第一只棋子",
            payload: {
                fromBench: "SLOT_1",
                toBoard: "AUTO_SLOT",
                champion: "安妮",
            },
        },
        {
            tick: 1,
            type: "MOVE",
            priority: 89,
            reason: "上第二只棋子",
            payload: {
                fromBench: "SLOT_2",
                toBoard: "AUTO_SLOT",
                champion: "辛德拉",
            },
        },
    ];

    const executionPlan = buildAndroidExecutionPlan(actions, state);
    const moveSteps = executionPlan.steps.filter((step) => step.kind === "MOVE_BENCH_TO_BOARD");

    assert.equal(moveSteps.length, 2);
    assert.equal(moveSteps[0]?.toBoard, "R1_C2");
    assert.equal(moveSteps[1]?.toBoard, "R1_C3");
});

test("AndroidSimulationRunner emits buy, move, equip, and roll steps for a midgame reroll state", async () => {
    const result = await androidSimulationRunner.planOnce(buildBaseAndroidState(), {
        targetChampionNames: ["安妮", "辛德拉"],
        strategyPreset: "REROLL",
        stabilizeHpThreshold: 35,
    });

    const kinds = new Set(result.executionPlan.steps.map((step) => step.kind));

    assert.ok(result.plans.some((plan) => plan.type === "BUY"));
    assert.ok(result.plans.some((plan) => plan.type === "MOVE"));
    assert.ok(result.plans.some((plan) => plan.type === "ROLL"));
    assert.ok(result.plans.some((plan) => plan.type === "EQUIP"));
    assert.ok(kinds.has("BUY_SLOT"));
    assert.ok(kinds.has("MOVE_BENCH_TO_BOARD"));
    assert.ok(kinds.has("REFRESH_SHOP"));
    assert.ok(kinds.has("EQUIP_TO_BOARD"));
    assert.ok(result.executionPlan.steps.some((step) => step.kind === "BUY_SLOT" && step.slot === 1));
    assert.ok(result.executionPlan.steps.some((step) => step.kind === "BUY_SLOT" && step.slot === 2));
});

test("AndroidSimulationRunner loads bundled offline scenarios", async () => {
    const scenarios = await androidSimulationRunner.listScenarios();
    const scenarioIds = scenarios.map((scenario) => scenario.id);
    const sequenceScenarios = scenarios.filter((scenario) => scenario.sequence?.id === "android-real-recording-20260315-ionia");

    assert.ok(scenarios.length >= 8);
    assert.ok(scenarioIds.includes("android-reroll-midgame"));
    assert.ok(scenarioIds.includes("android-augment-choice"));
    assert.ok(scenarioIds.includes("android-low-hp-stabilize"));
    assert.equal(sequenceScenarios.length, 5);
    assert.deepEqual(
        sequenceScenarios.map((scenario) => scenario.sequence?.index),
        [1, 2, 3, 4, 5]
    );
});
