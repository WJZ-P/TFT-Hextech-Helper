import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

function parseCliJson(stdout: string): unknown {
    const jsonStart = stdout.indexOf("{\n  \"mode\"");
    assert.notEqual(jsonStart, -1, stdout);
    return JSON.parse(stdout.slice(jsonStart));
}

test("android automation loop CLI can dry-run an offline state fixture", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "android-simulator", "android-reroll-midgame.json");
    const { stdout, stderr } = await execFileAsync(
        process.execPath,
        [
            tsxCli,
            "scripts/run-android-automation-loop.ts",
            "--state",
            statePath,
            "--ticks",
            "1",
            "--dry-run",
            "--operation-timeout-ms",
            "5000",
        ],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = parseCliJson(stdout) as {
        mode: string;
        safeObserve: boolean;
        ticks: number;
        operationTimeoutMs: number;
        results: Array<{
            status: string;
            plans: Array<{ type: string }>;
            executionPlan: {
                steps: Array<{ kind: string }>;
            };
        }>;
    };

    assert.equal(parsed.mode, "dry-run");
    assert.equal(parsed.safeObserve, true);
    assert.equal(parsed.ticks, 1);
    assert.equal(parsed.operationTimeoutMs, 5000);
    assert.equal(parsed.results.length, 1);
    assert.ok(parsed.results[0]?.plans.length);
    assert.ok(parsed.results[0]?.executionPlan.steps.length);
    assert.equal(parsed.results[0]?.status, "DRY_RUN");
    assert.match(stderr, /\[android:auto\] tick 1\/1 start/);
    assert.match(stderr, /\[android:auto\] tick 1\/1 DRY_RUN/);
});

test("android automation loop CLI defaults live fixture runs to safe observe", { timeout: 120000 }, async () => {
    const statePath = path.join("examples", "android-simulator", "android-reroll-midgame.json");
    const { stdout } = await execFileAsync(
        process.execPath,
        [
            tsxCli,
            "scripts/run-android-automation-loop.ts",
            "--state",
            statePath,
            "--ticks",
            "1",
            "--live",
            "--operation-timeout-ms",
            "5000",
        ],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = parseCliJson(stdout) as {
        mode: string;
        safeObserve: boolean;
        ticks: number;
    };

    assert.equal(parsed.mode, "live");
    assert.equal(parsed.safeObserve, true);
    assert.equal(parsed.ticks, 1);
});
