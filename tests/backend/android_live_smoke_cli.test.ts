import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

test("android live smoke CLI can analyze update-ready screenshots", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773702968907.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        screenshotPath: string;
        screenshotPaths: string[];
        contentClassification: {
            state: string;
            frontendVariant?: string;
        };
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(path.resolve(parsed.screenshotPath), screenshotPath);
    assert.deepEqual(parsed.screenshotPaths, [screenshotPath]);
    assert.equal(parsed.contentClassification.state, "TFT_FRONTEND");
    assert.equal(parsed.contentClassification.frontendVariant, "UPDATE_READY");
    assert.equal(parsed.foregroundDecision?.kind, "WAIT");
});

test("android live smoke CLI can analyze login-required screenshots", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773703133640.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        contentClassification: {
            state: string;
            frontendVariant?: string;
        };
        foregroundDecision: {
            kind: string;
            reason: string;
        } | null;
    };

    assert.equal(parsed.contentClassification.state, "TFT_FRONTEND");
    assert.equal(parsed.contentClassification.frontendVariant, "LOGIN_REQUIRED");
    assert.equal(parsed.foregroundDecision?.kind, "BLOCKED");
    assert.match(parsed.foregroundDecision?.reason ?? "", /login/i);
});

test("android live smoke CLI can analyze live HUD screenshots", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "derived",
        "android-real-recording-20260315-ionia",
        "frames",
        "recording-board-5-2.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        contentClassification: {
            state: string;
        };
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(parsed.contentClassification.state, "LIVE_CONTENT");
    assert.equal(parsed.foregroundDecision?.kind, "READY");
});

test("android live smoke CLI treats augment overlay screenshots as live content", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "derived",
        "android-real-recording-20260315-ionia",
        "frames",
        "recording-augment-3-2.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        contentClassification: {
            state: string;
        };
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(parsed.contentClassification.state, "LIVE_CONTENT");
    assert.equal(parsed.foregroundDecision?.kind, "READY");
});

test("android live smoke CLI can analyze unknown non-game screenshots", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773701883707.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        contentClassification: {
            state: string;
        };
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(parsed.contentClassification.state, "UNKNOWN");
    assert.equal(parsed.foregroundDecision?.kind, "WAIT");
});

test("android live smoke CLI can replay screenshot sequences for progression QA", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773702968907.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [
            tsxCli,
            "scripts/run-android-live-smoke.ts",
            "--screenshot",
            screenshotPath,
            "--screenshot",
            screenshotPath,
            "--screenshot",
            screenshotPath,
        ],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        screenshotPaths: string[];
        analysisSequence: Array<{
            foregroundDecision: {
                kind: string;
            };
        }>;
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(parsed.screenshotPaths.length, 3);
    assert.deepEqual(
        parsed.analysisSequence.map((entry) => entry.foregroundDecision.kind),
        ["WAIT", "TAP_PRIMARY_CTA", "WAIT"]
    );
    assert.equal(parsed.foregroundDecision?.kind, "WAIT");
});
