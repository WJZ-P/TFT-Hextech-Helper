import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

test("android foreground compare CLI reports zero diff for identical fixtures", { timeout: 120000 }, async () => {
    const fixturePath = path.join(
        repoRoot,
        "examples",
        "android-foreground-replay",
        "android-na-frontend-synthetic-flow.json"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [
            tsxCli,
            "scripts/compare-android-foreground-fixtures.ts",
            "--baseline",
            fixturePath,
            "--candidate",
            fixturePath,
        ],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        diffCount: number;
        baselineExpectedMismatchCount: number;
        candidateExpectedMismatchCount: number;
    };

    assert.equal(parsed.diffCount, 0);
    assert.equal(parsed.baselineExpectedMismatchCount, 0);
    assert.equal(parsed.candidateExpectedMismatchCount, 0);
});

test("android foreground compare CLI surfaces state and decision diffs between fixtures", { timeout: 120000 }, async () => {
    const baselineFixture = path.join(
        repoRoot,
        "examples",
        "android-foreground-replay",
        "android-na-frontend-synthetic-flow.json"
    );
    const candidateFixture = path.join(
        repoRoot,
        "examples",
        "android-foreground-replay",
        "android-na-queue-timeout-synthetic.json"
    );

    let stdout = "";
    try {
        await execFileAsync(
            process.execPath,
            [
                tsxCli,
                "scripts/compare-android-foreground-fixtures.ts",
                "--baseline",
                baselineFixture,
                "--candidate",
                candidateFixture,
            ],
            {
                cwd: repoRoot,
                windowsHide: true,
            }
        );
        assert.fail("Expected compare script to exit non-zero when diffs exist");
    } catch (error) {
        const execError = error as { stdout?: string };
        stdout = execError.stdout ?? "";
    }

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        diffCount: number;
        candidateExpectedMismatchCount: number;
        diffs: Array<{
            stateChanged: boolean;
            decisionChanged: boolean;
        }>;
    };

    assert.ok(parsed.diffCount > 0);
    assert.equal(parsed.candidateExpectedMismatchCount, 0);
    assert.ok(parsed.diffs.some((entry) => entry.stateChanged || entry.decisionChanged));
});
