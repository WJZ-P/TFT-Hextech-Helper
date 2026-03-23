import test from "node:test";
import assert from "node:assert/strict";

// Ensure navigator exists in the Node test environment before importing the module
if (typeof (globalThis as any).navigator === "undefined") {
    (globalThis as any).navigator = { userAgent: "node-test" };
}

import { dataCollector } from "../../src-backend/services/DataCollector";

test("getWinRate returns NaN when no matches recorded", () => {
    // reset internal state
    dataCollector.updateConfig({ enabled: false, mode: "disabled" });
    // Clear history via direct access for test (keeps type safety)
    (dataCollector as any).matchHistory = [];

    const wr = dataCollector.getWinRate();
    assert.ok(Number.isNaN(wr));
});

test("recordMatchOutcome records outcomes and computes win rate with default window", () => {
    dataCollector.updateConfig({ enabled: true, mode: "anonymous" });
    (dataCollector as any).matchHistory = [];
    (dataCollector as any).queue = [];

    // record 3 wins and 2 losses
    dataCollector.recordMatchOutcome("win");
    dataCollector.recordMatchOutcome("loss");
    dataCollector.recordMatchOutcome("win");
    dataCollector.recordMatchOutcome("win");
    dataCollector.recordMatchOutcome("loss");

    const wr = dataCollector.getWinRate(5);
    assert.equal(wr, 3 / 5);

    // ensure telemetry anon events were enqueued for each match (since enabled)
    const queued = (dataCollector as any).queue as any[];
    // there should be 5 anonymized entries pushed
    assert.ok(Array.isArray(queued) && queued.length >= 5);

    // cleanup
    (dataCollector as any).matchHistory = [];
    (dataCollector as any).queue = [];
    dataCollector.updateConfig({ enabled: false, mode: "disabled" });
});

test("getWinRate respects windowSize smaller than history length", () => {
    (dataCollector as any).matchHistory = [];
    // create 10 entries: 6 wins then 4 losses
    for (let i = 0; i < 6; i++) dataCollector.recordMatchOutcome("win");
    for (let i = 0; i < 4; i++) dataCollector.recordMatchOutcome("loss");

    // last 5 should be: win, win, loss, loss, loss -> wins = 2
    const wr5 = dataCollector.getWinRate(5);
    assert.equal(wr5, 2 / 5);

    // windowSize larger than history -> use full history
    const wr20 = dataCollector.getWinRate(20);
    assert.equal(wr20, 6 / 10);

    // cleanup
    (dataCollector as any).matchHistory = [];
});
