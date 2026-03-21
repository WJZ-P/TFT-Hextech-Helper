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
    assert.equal(rollPlan?.payload?.count, 6);
});
