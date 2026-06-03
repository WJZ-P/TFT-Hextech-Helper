import test from "node:test";
import assert from "node:assert/strict";
import { GameStageType } from "../../src-backend/TFTProtocol";
import { AndroidAutomationLoop } from "../../src-backend/services/AndroidAutomationLoop";
import type {
    ActionPlan,
    AdapterHealth,
    DecisionEngine,
    GameAdapter,
    ObservedState,
    PlatformTarget,
} from "../../src-backend/core/types";

function buildState(overrides: Partial<ObservedState> = {}): ObservedState {
    return {
        timestamp: Date.now(),
        client: "ANDROID" as ObservedState["client"],
        target: "ANDROID_EMULATOR",
        stageText: "3-2",
        stageType: GameStageType.PVP,
        level: 6,
        currentXp: 0,
        totalXp: 20,
        gold: 30,
        hp: 70,
        bench: [],
        board: [],
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
        ],
        items: [],
        metadata: { hasValidStage: true },
        ...overrides,
    };
}

class FakeAdapter implements GameAdapter {
    public readonly target: PlatformTarget = "ANDROID_EMULATOR";
    public executeCalls: ActionPlan[][] = [];
    public healthCheckCalls = 0;
    private observeIndex = 0;

    constructor(
        private readonly states: ObservedState[],
        private readonly health: AdapterHealth = { ok: true, detail: "ok" }
    ) {}

    async attach(): Promise<void> {}

    async observe(): Promise<ObservedState> {
        const state = this.states[Math.min(this.observeIndex, this.states.length - 1)];
        this.observeIndex += 1;
        return state;
    }

    async execute(actions: ActionPlan[]): Promise<void> {
        this.executeCalls.push(actions);
    }

    async healthCheck(): Promise<AdapterHealth> {
        this.healthCheckCalls += 1;
        return this.health;
    }
}

class StaticEngine implements DecisionEngine {
    constructor(private readonly plans: ActionPlan[]) {}

    generatePlan(): ActionPlan[] {
        return this.plans;
    }
}

class HangingObserveAdapter extends FakeAdapter {
    async observe(): Promise<ObservedState> {
        return new Promise(() => {});
    }
}

function buyAction(): ActionPlan {
    return {
        tick: 0,
        type: "BUY",
        priority: 100,
        reason: "购买目标卡",
        payload: {
            slot: 0,
            champion: "安妮",
        },
    };
}

function pickLootAction(): ActionPlan {
    return {
        tick: 0,
        type: "PICK_LOOT",
        priority: 120,
        reason: "拾取散落战利品球",
        payload: {},
    };
}

function levelUpAction(): ActionPlan {
    return {
        tick: 0,
        type: "LEVEL_UP",
        priority: 88,
        reason: "阶段 OCR 暂不可用但经济明显溢出，先升人口避免空转",
        payload: {
            count: 1,
        },
    };
}

test("AndroidAutomationLoop skips execution when stage is unknown", async () => {
    const adapter = new FakeAdapter([
        buildState({
            stageText: "",
            stageType: GameStageType.UNKNOWN,
            metadata: { hasValidStage: false },
        }),
    ]);
    const loop = new AndroidAutomationLoop({
        adapter,
        engine: new StaticEngine([buyAction()]),
        dryRun: false,
    });

    const result = await loop.runOnce();

    assert.equal(result.status, "SKIPPED");
    assert.match(result.reason, /stage/i);
    assert.equal(adapter.executeCalls.length, 0);
});

test("AndroidAutomationLoop lets foreground recovery skip health-check misses", async () => {
    const adapter = new FakeAdapter(
        [
            buildState({
                stageText: "",
                stageType: GameStageType.UNKNOWN,
                metadata: {
                    hasValidStage: false,
                    foregroundState: "GAME_OVER",
                    foregroundReason: "Android foreground is GAME_OVER",
                },
            }),
        ],
        { ok: false, detail: "未找到安卓模拟器窗口" }
    );
    const loop = new AndroidAutomationLoop({
        adapter,
        engine: new StaticEngine([buyAction()]),
        dryRun: false,
    });

    const result = await loop.runOnce();

    assert.equal(result.status, "SKIPPED");
    assert.match(result.reason, /GAME_OVER/);
    assert.equal(adapter.healthCheckCalls, 0);
    assert.equal(adapter.executeCalls.length, 0);
});

test("AndroidAutomationLoop allows loot-only maintenance when stage OCR is unknown", async () => {
    const unknownStageWithLoot = buildState({
        stageText: "",
        stageType: GameStageType.UNKNOWN,
        metadata: {
            hasValidStage: false,
            lootOrbs: [{ x: 0.48, y: 0.62, type: "blue" }],
        },
    });
    const adapter = new FakeAdapter([unknownStageWithLoot, unknownStageWithLoot]);
    const loop = new AndroidAutomationLoop({
        adapter,
        engine: new StaticEngine([buyAction(), pickLootAction()]),
        dryRun: false,
    });

    const result = await loop.runOnce();

    assert.equal(result.status, "EXECUTED");
    assert.equal(adapter.executeCalls.length, 1);
    assert.deepEqual(adapter.executeCalls[0]?.map((action) => action.type), ["PICK_LOOT"]);
});

test("AndroidAutomationLoop allows level-only maintenance on excess economy when stage OCR is unknown", async () => {
    const before = buildState({
        stageText: "",
        stageType: GameStageType.UNKNOWN,
        level: 5,
        currentXp: 0,
        totalXp: 20,
        gold: 67,
        metadata: { hasValidStage: false },
    });
    const after = buildState({
        ...before,
        currentXp: 4,
        gold: 63,
    });
    const adapter = new FakeAdapter([before, after]);
    const loop = new AndroidAutomationLoop({
        adapter,
        engine: new StaticEngine([buyAction(), levelUpAction()]),
        dryRun: false,
    });

    const result = await loop.runOnce();

    assert.equal(result.status, "EXECUTED");
    assert.equal(adapter.executeCalls.length, 1);
    assert.deepEqual(adapter.executeCalls[0]?.map((action) => action.type), ["LEVEL_UP"]);
    assert.equal(result.verification?.ok, true);
});

test("AndroidAutomationLoop blocks early level-only maintenance when stage OCR is unknown", async () => {
    const before = buildState({
        stageText: "",
        stageType: GameStageType.UNKNOWN,
        level: 3,
        currentXp: 0,
        totalXp: 6,
        gold: 60,
        metadata: { hasValidStage: false },
    });
    const adapter = new FakeAdapter([before]);
    const loop = new AndroidAutomationLoop({
        adapter,
        engine: new StaticEngine([levelUpAction()]),
        dryRun: false,
    });

    const result = await loop.runOnce();

    assert.equal(result.status, "SKIPPED");
    assert.match(result.reason, /stage is unknown/i);
    assert.equal(adapter.executeCalls.length, 0);
});

test("AndroidAutomationLoop skips execution when HUD is inconsistent with stage", async () => {
    const adapter = new FakeAdapter([
        buildState({
            stageText: "4-4",
            stageType: GameStageType.CAROUSEL,
            level: 1,
            gold: 0,
        }),
    ]);
    const loop = new AndroidAutomationLoop({
        adapter,
        engine: new StaticEngine([buyAction()]),
        dryRun: false,
    });

    const result = await loop.runOnce();

    assert.equal(result.status, "SKIPPED");
    assert.match(result.reason, /HUD/i);
    assert.equal(adapter.executeCalls.length, 0);
});

test("AndroidAutomationLoop dry-run returns execution plan without clicking", async () => {
    const adapter = new FakeAdapter([buildState()]);
    const loop = new AndroidAutomationLoop({
        adapter,
        engine: new StaticEngine([buyAction()]),
        dryRun: true,
    });

    const result = await loop.runOnce();

    assert.equal(result.status, "DRY_RUN");
    assert.equal(result.plans.length, 1);
    assert.ok(result.executionPlan.steps.some((step) => step.kind === "BUY_SLOT"));
    assert.equal(adapter.executeCalls.length, 0);
});

test("AndroidAutomationLoop executes and verifies a BUY action by observed gold decrease", async () => {
    const adapter = new FakeAdapter([
        buildState({ gold: 30 }),
        buildState({ gold: 27 }),
    ]);
    const loop = new AndroidAutomationLoop({
        adapter,
        engine: new StaticEngine([buyAction()]),
        dryRun: false,
    });

    const result = await loop.runOnce();

    assert.equal(result.status, "EXECUTED");
    assert.equal(adapter.executeCalls.length, 1);
    assert.equal(result.verification?.ok, true);
    assert.equal(result.trace.after?.gold, 27);
});

test("AndroidAutomationLoop pauses repeated unverified actions before clicking again", async () => {
    const adapter = new FakeAdapter([
        buildState({ gold: 30 }),
        buildState({ gold: 30 }),
        buildState({ gold: 30 }),
    ]);
    const loop = new AndroidAutomationLoop({
        adapter,
        engine: new StaticEngine([buyAction()]),
        dryRun: false,
        maxVerificationFailures: 1,
    });

    const first = await loop.runOnce();
    const second = await loop.runOnce();

    assert.equal(first.status, "EXECUTED_WITH_WARNING");
    assert.equal(first.verification?.ok, false);
    assert.equal(second.status, "PAUSED");
    assert.match(second.reason, /verification/i);
    assert.equal(adapter.executeCalls.length, 1);
});

test("AndroidAutomationLoop pauses when live observe exceeds operation timeout", async () => {
    const adapter = new HangingObserveAdapter([buildState()]);
    const loop = new AndroidAutomationLoop({
        adapter,
        engine: new StaticEngine([buyAction()]),
        dryRun: false,
        operationTimeoutMs: 10,
    });

    const result = await loop.runOnce();

    assert.equal(result.status, "PAUSED");
    assert.match(result.reason, /observe before action/i);
    assert.match(result.reason, /timed out/i);
    assert.equal(adapter.executeCalls.length, 0);
});

test("AndroidAutomationLoop refuses overlapping work while a timed-out observe is still active", async () => {
    const adapter = new HangingObserveAdapter([buildState()]);
    const loop = new AndroidAutomationLoop({
        adapter,
        engine: new StaticEngine([buyAction()]),
        dryRun: false,
        operationTimeoutMs: 10,
    });

    const first = await loop.runOnce();
    const second = await loop.runOnce();

    assert.equal(first.status, "PAUSED");
    assert.match(first.reason, /timed out/i);
    assert.equal(second.status, "PAUSED");
    assert.match(second.reason, /previous timed-out adapter operation/i);
    assert.equal(adapter.executeCalls.length, 0);
});
