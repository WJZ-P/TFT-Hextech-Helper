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

test("android foreground fixture scaffold CLI creates replay schema from screenshots", { timeout: 120000 }, async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "android-foreground-fixture-"));
    const outputPath = path.join(tempDir, "lobby.json");
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773702968907.png"
    );

    await execFileAsync(
        process.execPath,
        [
            tsxCli,
            "scripts/scaffold-android-foreground-fixture.ts",
            "--output",
            outputPath,
            "--id",
            "android-na-lobby-capture",
            "--label",
            "安卓大厅采集脚手架",
            "--description",
            "用于补录真实大厅素材。",
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

    const parsed = JSON.parse(await fs.readFile(outputPath, "utf8")) as {
        schemaVersion: string;
        id: string;
        frames: Array<{
            screenshotPath: string;
            expectedDecisionKind: string;
        }>;
    };

    assert.equal(parsed.schemaVersion, "android-foreground-fixture.v1");
    assert.equal(parsed.id, "android-na-lobby-capture");
    assert.equal(parsed.frames.length, 2);
    assert.equal(parsed.frames[0]?.expectedDecisionKind, "WAIT");
    assert.equal(parsed.frames[1]?.expectedDecisionKind, "TAP_START_QUEUE");
    assert.match(parsed.frames[0]?.screenshotPath ?? "", /android-live-smoke-1773702968907\.png$/);
});
