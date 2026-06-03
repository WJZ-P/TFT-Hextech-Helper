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
