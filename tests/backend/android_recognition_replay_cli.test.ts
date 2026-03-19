import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

test("android recognition replay CLI passes bundled fixtures", { timeout: 120000 }, async () => {
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-recognition-replay.ts", "--fixture", "android-s16-opening-recognition"],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const jsonStart = stdout.indexOf("{\n  \"fixture\"");
    assert.ok(jsonStart >= 0, "CLI 输出中未找到 JSON 结果");

    const parsed = JSON.parse(stdout.slice(jsonStart)) as {
        summary: {
            allPassed: boolean;
            championPassedCount: number;
            championCount: number;
            ocrHitCount: number;
        };
        stageResult: {
            extractedText: string;
        } | null;
    };

    assert.equal(parsed.summary.allPassed, true);
    assert.equal(parsed.stageResult?.extractedText, "2-1");
    assert.equal(parsed.summary.championPassedCount, parsed.summary.championCount);
    assert.ok(parsed.summary.ocrHitCount >= 1);
});
