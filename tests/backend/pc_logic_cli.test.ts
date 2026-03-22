import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

test("pc logic CLI replays a fast-8 4-1 sample and recommends leveling to 7", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "fast8-4-1-level7.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as {
        plans: Array<{ type: string; reason: string }>;
    };

    assert.ok(parsed.plans.some((plan) => plan.type === "LEVEL_UP" && /4-1/.test(plan.reason)));
});

test("pc logic CLI replays a winstreak 3-2 sample and keeps tempo with an early level", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "winstreak-keep-tempo-3-2.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as {
        plans: Array<{ type: string; reason: string }>;
    };

    assert.ok(parsed.plans.some((plan) => plan.type === "LEVEL_UP" && /3-2/.test(plan.reason)));
});

test("pc logic CLI replays a target-pair 4-2 sample and increases roll commitment within a capped window", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "target-allin-4-2.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as {
        plans: Array<{ type: string; payload?: { count?: number } }>;
    };

    const rollPlan = parsed.plans.find((plan) => plan.type === "ROLL");
    assert.equal(rollPlan?.payload?.count, 4);
});

test("pc logic CLI replays a winstreak 2-5 sample and keeps tempo with an early level", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "winstreak-tempo-2-5.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as {
        plans: Array<{ type: string; reason: string }>;
    };

    assert.ok(parsed.plans.some((plan) => plan.type === "LEVEL_UP" && /2-5/.test(plan.reason)));
});

test("pc logic CLI replays a 5-stage low-hp sample and chooses capped all-in rolling", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "stage5-lowhp-allin.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as {
        plans: Array<{ type: string; payload?: { count?: number }; reason?: string }>;
    };

    const rollPlan = parsed.plans.find((plan) => plan.type === "ROLL");
    assert.equal(rollPlan?.payload?.count, 3);
    assert.ok(parsed.plans.some((plan) => plan.reason && /5 阶段低血量/.test(plan.reason)));
});

test("pc logic CLI replays a 5-stage healthy sample and preserves economy", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "stage5-highhp-econ.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as {
        plans: Array<{ type: string }>;
    };

    assert.ok(!parsed.plans.some((plan) => plan.type === "ROLL"));
    assert.ok(!parsed.plans.some((plan) => plan.type === "BUY"));
});

test("pc logic CLI replays a healthy stage-5 target-pair sample without forcing all-in", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "stage5-highhp-targetpair-econ.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as {
        plans: Array<{ type: string; payload?: { champion?: string }; reason?: string }>;
    };

    assert.ok(!parsed.plans.some((plan) => plan.type === "ROLL"));
    assert.ok(parsed.plans.some((plan) => plan.type === "BUY" && plan.payload?.champion === "安妮"));
    assert.ok(!parsed.plans.some((plan) => plan.reason && /5 阶段低血量/.test(plan.reason)));
});

test("pc logic CLI replays a 4-5 healthy greed sample and levels up", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "greed-levelup-4-5.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as {
        plans: Array<{ type: string; reason?: string }>;
    };

    assert.ok(parsed.plans.some((plan) => plan.type === "LEVEL_UP" && /4-5/.test(plan.reason ?? "")));
    assert.ok(!parsed.plans.some((plan) => plan.type === "ROLL"));
});

test("pc logic CLI replays a 4-5 high-hp late-game sample and greed-levels", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "lategame-4-5-highhp-greed.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as { plans: Array<{ type: string; reason?: string }> };

    assert.ok(parsed.plans.some((plan) => plan.type === "LEVEL_UP" && /4-5/.test(plan.reason ?? "")));
    assert.ok(!parsed.plans.some((plan) => plan.type === "ROLL"));
});

test("pc logic CLI replays a 4-5 mid-hp late-game sample and small-Ds", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "lategame-4-5-midhp-small-d.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as { plans: Array<{ type: string; payload?: { count?: number }; reason?: string }> };

    const rollPlan = parsed.plans.find((plan) => plan.type === "ROLL");
    assert.equal(rollPlan?.payload?.count, 2);
    assert.ok(parsed.plans.some((plan) => plan.reason && /中血量小 D 稳血/.test(plan.reason)));
});

test("pc logic CLI replays a 5-1 low-hp late-game sample and all-ins", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "lategame-5-1-lowhp-allin.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as { plans: Array<{ type: string; payload?: { count?: number }; reason?: string }> };

    const rollPlan = parsed.plans.find((plan) => plan.type === "ROLL");
    assert.equal(rollPlan?.payload?.count, 3);
    assert.ok(parsed.plans.some((plan) => plan.reason && /全力止损/.test(plan.reason)));
});

test("pc logic CLI replays a 5-1 low-hp sample and roll-downs to stabilize", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "roll-down-5-1.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as {
        plans: Array<{ type: string; payload?: { count?: number }; reason?: string }>;
    };

    const rollPlan = parsed.plans.find((plan) => plan.type === "ROLL");
    assert.equal(rollPlan?.payload?.count, 2);
    assert.ok(parsed.plans.some((plan) => plan.reason && /中血量小 D 稳血/.test(plan.reason)));
});

test("pc logic CLI replays a 4-2 target-pair greed sample and levels up", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "targetpair-greed-4-2-levelup.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as {
        plans: Array<{ type: string; reason?: string }>;
    };

    assert.ok(parsed.plans.some((plan) => plan.type === "LEVEL_UP" && /4-2/.test(plan.reason ?? "")));
});

test("pc logic CLI replays a 5-1 target-pair danger sample and roll-downs to stabilize", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "pc-logic", "targetpair-stabilize-5-1-danger.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-pc-logic.ts", statePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout) as {
        plans: Array<{ type: string; payload?: { count?: number }; reason?: string }>;
    };

    const rollPlan = parsed.plans.find((plan) => plan.type === "ROLL");
    assert.equal(rollPlan?.payload?.count, 4);
    assert.ok(parsed.plans.some((plan) => plan.reason && /4-5 \/ 5-1 进入低血量 roll-down/.test(plan.reason)));
});
