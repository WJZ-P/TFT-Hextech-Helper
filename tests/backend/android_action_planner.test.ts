import test from "node:test";
import assert from "node:assert/strict";
import { buildAndroidExecutionPlan } from "../../src-backend/adapters/AndroidActionPlanner";
import type { ActionPlan } from "../../src-backend/core/types";

test("android action planner renders loot pickup hint coordinates", () => {
    const actions: ActionPlan[] = [
        {
            tick: 0,
            type: "PICK_LOOT",
            priority: 110,
            reason: "检测到战利品球",
            payload: {
                x: 520,
                y: 180,
                count: 2,
            },
        },
    ];

    const executionPlan = buildAndroidExecutionPlan(actions, null);
    const lootStep = executionPlan.steps.find((step) => step.kind === "PICK_LOOT");

    assert.equal(lootStep?.targetPoint?.label, "LOOT_ORB_HINT");
    assert.deepEqual(lootStep?.targetPoint?.point, { x: 520, y: 180 });
});

test("android action planner renders direct augment choice coordinates", () => {
    const actions: ActionPlan[] = [
        {
            tick: 0,
            type: "PICK_AUGMENT",
            priority: 100,
            reason: "遭遇两选一",
            payload: {
                slot: 2,
                x: 0.35,
                y: 0.54,
            },
        },
    ];

    const executionPlan = buildAndroidExecutionPlan(actions, null);
    const augmentStep = executionPlan.steps.find((step) => step.kind === "PICK_AUGMENT");

    assert.equal(augmentStep?.targetPoint?.label, "AUGMENT_CHOICE_HINT");
    assert.deepEqual(augmentStep?.targetPoint?.point, { x: 0.35, y: 0.54 });
});

test("android action planner uses Android shop control coordinates", () => {
    const actions: ActionPlan[] = [
        {
            tick: 0,
            type: "BUY",
            priority: 80,
            reason: "buy target",
            payload: { slot: 0 },
        },
        {
            tick: 1,
            type: "ROLL",
            priority: 70,
            reason: "refresh shop",
            payload: { count: 1 },
        },
        {
            tick: 2,
            type: "LEVEL_UP",
            priority: 60,
            reason: "buy xp",
            payload: { count: 1 },
        },
    ];

    const executionPlan = buildAndroidExecutionPlan(actions, null);

    assert.deepEqual(executionPlan.steps.map((step) => step.targetPoint), [
        { label: "SHOP_SLOT_1", point: { x: 0.211, y: 0.385 } },
        { label: "REFRESH_SHOP", point: { x: 0.936, y: 0.672 } },
        { label: "BUY_EXP", point: { x: 0.073, y: 0.873 } },
    ]);
});

test("android action planner buys observed shop slots before rolling", () => {
    const actions: ActionPlan[] = [
        {
            tick: 0,
            type: "ROLL",
            priority: 82,
            reason: "refresh shop",
            payload: { count: 2 },
        },
        {
            tick: 1,
            type: "BUY",
            priority: 72,
            reason: "buy observed target",
            payload: { slot: 2, champion: "泰隆" },
        },
    ];

    const executionPlan = buildAndroidExecutionPlan(actions, null);

    assert.deepEqual(executionPlan.steps.map((step) => step.kind), [
        "BUY_SLOT",
        "REFRESH_SHOP",
        "REFRESH_SHOP",
    ]);
});

test("android action planner preserves high-gold level-up click count", () => {
    const actions: ActionPlan[] = [
        {
            tick: 0,
            type: "LEVEL_UP",
            priority: 90,
            reason: "convert excess economy",
            payload: { count: 5 },
        },
    ];

    const executionPlan = buildAndroidExecutionPlan(actions, null);
    const xpSteps = executionPlan.steps.filter((step) => step.kind === "BUY_XP");

    assert.equal(xpSteps.length, 5);
    assert.equal(xpSteps.at(-1)?.description, "购买经验 5/5");
});
