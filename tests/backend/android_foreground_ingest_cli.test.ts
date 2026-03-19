import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

test("android foreground ingest CLI creates fixture, manifest, and crops for real-capture drafts", { timeout: 120000 }, async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "android-foreground-ingest-"));
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
            "scripts/ingest-android-foreground-captures.ts",
            "--output-dir",
            tempDir,
            "--id",
            "android-na-lobby-draft",
            "--label",
            "安卓大厅真实草稿",
            "--description",
            "用真实截图生成大厅草稿 fixture",
            "--state",
            "LOBBY",
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

    const cliResult = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        fixturePath: string;
        manifestPath: string;
        frameCount: number;
    };
    assert.equal(cliResult.frameCount, 2);

    const fixture = JSON.parse(await fs.readFile(cliResult.fixturePath, "utf8")) as {
        schemaVersion: string;
        frames: Array<{
            expectedObservation: {
                state: string;
                verification: string;
            };
            expectedDecisionKind: string;
        }>;
    };

    const manifest = JSON.parse(await fs.readFile(cliResult.manifestPath, "utf8")) as {
        schemaVersion: string;
        frames: Array<{
            classifiedState: string;
            expectedState: string;
            crops: Array<{ path: string }>;
        }>;
    };

    assert.equal(fixture.schemaVersion, "android-foreground-fixture.v1");
    assert.equal(fixture.frames[0]?.expectedObservation.state, "LOBBY");
    assert.equal(fixture.frames[0]?.expectedObservation.verification, "REAL_CAPTURE_DRAFT");
    assert.equal(fixture.frames[1]?.expectedDecisionKind, "TAP_START_QUEUE");
    assert.equal(manifest.schemaVersion, "android-foreground-manifest.v1");
    assert.equal(manifest.frames[0]?.classifiedState, "UPDATE_READY");
    assert.equal(manifest.frames[0]?.expectedState, "LOBBY");
    assert.ok((manifest.frames[0]?.crops.length ?? 0) >= 1);
    await fs.access(manifest.frames[0]!.crops[0]!.path);
});
