import test from "node:test";
import assert from "node:assert/strict";

// Ensure navigator exists in the Node test environment before importing the module
if (typeof (globalThis as any).navigator === "undefined") {
    (globalThis as any).navigator = { userAgent: "node-test" };
}

import { dataCollector } from "../../src-backend/services/DataCollector";

test("recordDecision returns false when collection is disabled", () => {
    dataCollector.updateConfig({ enabled: false, mode: "disabled" });
    dataCollector.clearQueue();

    const ok = dataCollector.recordDecision({
        planType: "BUY_TEST",
        priority: 10,
        reason: "testing",
        gameStage: "1-1",
        hp: 50,
    });

    assert.equal(ok, false);
    assert.equal(dataCollector.getQueueSize(), 0);
});

test("recordDecision anonymizes fields and enqueues when enabled", () => {
    dataCollector.updateConfig({ enabled: true, mode: "anonymous" });
    dataCollector.clearQueue();

    const ok = dataCollector.recordDecision({
        planType: "BUY_HELIX",
        priority: 42,
        reason: "bought for test",
        gameStage: "1-8",
        hp: 45,
    });

    assert.equal(ok, true);
    assert.equal(dataCollector.getQueueSize(), 1);

    const queued = (dataCollector as any).queue[0];
    // Basic shape assertions
    assert.ok(typeof queued.decisionId === "string" && queued.decisionId.length > 0);
    assert.ok(typeof queued.timestamp === "number" && queued.timestamp > 0);
    assert.ok(typeof queued.planTypeHash === "string" && queued.planTypeHash.length > 0);
    assert.ok(typeof queued.outcomeHash === "string" && queued.outcomeHash.length > 0);
    // sanitizeStage turns "1-8" -> "1-*"
    assert.equal(queued.gameStage, "1-*");
    // hpBucket for hp=45 -> 40
    assert.equal(queued.hpBucket, 40);

    // cleanup
    dataCollector.clearQueue();
    dataCollector.updateConfig({ enabled: false, mode: "disabled" });
});

test("flush without endpoint keeps local queue (local-only storage)", async () => {
    dataCollector.updateConfig({ enabled: true, mode: "anonymous", endpoint: undefined });
    dataCollector.clearQueue();

    dataCollector.recordDecision({ planType: "A", priority: 1, reason: "r", gameStage: "1-1", hp: 10 });
    dataCollector.recordDecision({ planType: "B", priority: 2, reason: "r", gameStage: "1-2", hp: 20 });

    assert.equal(dataCollector.getQueueSize(), 2);
    const res = await dataCollector.flush();
    assert.equal(res, true);
    // With no endpoint configured flush should not clear the queue (keeps local cache)
    assert.equal(dataCollector.getQueueSize(), 2);

    // cleanup
    dataCollector.clearQueue();
    dataCollector.updateConfig({ enabled: false, mode: "disabled" });
});

test("flush with endpoint clears queue and returns true", async () => {
    dataCollector.updateConfig({ enabled: true, mode: "anonymous", endpoint: "http://localhost/collect" });
    dataCollector.clearQueue();

    dataCollector.recordDecision({ planType: "X", priority: 2, reason: "R", gameStage: "2-1", hp: 88 });
    assert.equal(dataCollector.getQueueSize(), 1);

    const res = await dataCollector.flush();
    assert.equal(res, true);
    assert.equal(dataCollector.getQueueSize(), 0);

    // cleanup
    dataCollector.updateConfig({ enabled: false, mode: "disabled", endpoint: undefined });
});

test("updateConfig disabling clears queue immediately", () => {
    dataCollector.updateConfig({ enabled: true, mode: "research", endpoint: "http://x" });
    dataCollector.clearQueue();

    dataCollector.recordDecision({ planType: "Y", priority: 3, reason: "Z", gameStage: "3-2", hp: 62 });
    assert.equal(dataCollector.getQueueSize(), 1);

    dataCollector.updateConfig({ enabled: false });
    assert.equal(dataCollector.getQueueSize(), 0);
    assert.equal(dataCollector.getConfig().enabled, false);
});
