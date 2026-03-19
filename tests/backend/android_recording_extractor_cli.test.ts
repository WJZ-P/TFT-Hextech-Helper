import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

test("android recording extractor CLI lists bundled presets", { timeout: 120000 }, async () => {
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/extract-android-recording-fixtures.ts", "--list-presets"],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const jsonMatch = stdout.match(/\[\s*{[\s\S]*?}\s*\]/);
    assert.ok(jsonMatch, "CLI 输出中未找到 JSON 结果");

    const presets = JSON.parse(jsonMatch[0]) as Array<{
        id: string;
        keyframeCount: number;
    }>;

    assert.ok(presets.some((preset) => preset.id === "android-real-recording-20260315-ionia"));
    assert.ok(presets.every((preset) => preset.keyframeCount > 0));
});
