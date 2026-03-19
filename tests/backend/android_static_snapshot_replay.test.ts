import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

async function runFixture(fixtureId: string) {
    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-recognition-replay.ts", "--fixture", fixtureId],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const jsonStart = stdout.indexOf("{\n  \"fixture\"");
    assert.ok(jsonStart >= 0, `CLI 输出中未找到 JSON 结果: ${fixtureId}`);

    let depth = 0;
    let inString = false;
    let escaped = false;
    let jsonEnd = -1;

    for (let index = jsonStart; index < stdout.length; index += 1) {
        const char = stdout[index];

        if (escaped) {
            escaped = false;
            continue;
        }

        if (char === "\\") {
            escaped = true;
            continue;
        }

        if (char === "\"") {
            inString = !inString;
            continue;
        }

        if (inString) {
            continue;
        }

        if (char === "{") {
            depth += 1;
        } else if (char === "}") {
            depth -= 1;
            if (depth === 0) {
                jsonEnd = index + 1;
                break;
            }
        }
    }

    assert.ok(jsonEnd > jsonStart, `CLI 输出中的 JSON 不完整: ${fixtureId}`);
    return JSON.parse(stdout.slice(jsonStart, jsonEnd)) as {
        summary: {
            allPassed: boolean;
        };
        staticSnapshotResult: {
            passed: boolean;
            boardOccupancyResults: Array<{ recognizedOccupied: boolean }>;
            benchOccupancyResults: Array<{ recognizedOccupied: boolean }>;
            equipmentResults: Array<{ passed: boolean; recognizedSource: string }>;
            traitResults: Array<{ name: string; recognizedCount: number; recognizedActive: boolean; recognizedSource: string }>;
        } | null;
    };
}

test("android static snapshot replay validates bundled real-device lineup fixtures via CLI", { timeout: 120000 }, async () => {
    const early = await runFixture("android-s16-tempo-2-5-static");
    assert.equal(early.summary.allPassed, true);
    assert.ok(early.staticSnapshotResult);
    assert.equal(early.staticSnapshotResult?.passed, true);
    assert.equal(early.staticSnapshotResult?.boardOccupancyResults.filter((entry) => entry.recognizedOccupied).length, 4);
    assert.equal(early.staticSnapshotResult?.benchOccupancyResults.filter((entry) => entry.recognizedOccupied).length, 4);
    assert.equal(early.staticSnapshotResult?.equipmentResults.length, 0);

    const ionia = early.staticSnapshotResult?.traitResults.find((entry) => entry.name === "艾欧尼亚");
    assert.ok(ionia);
    assert.equal(ionia?.recognizedCount, 3);
    assert.equal(ionia?.recognizedActive, false);

    const late = await runFixture("android-s16-cap-5-2-static");
    assert.equal(late.summary.allPassed, true);
    assert.ok(late.staticSnapshotResult);
    assert.equal(late.staticSnapshotResult?.passed, true);
    assert.equal(late.staticSnapshotResult?.boardOccupancyResults.filter((entry) => entry.recognizedOccupied).length, 8);
    assert.equal(late.staticSnapshotResult?.benchOccupancyResults.filter((entry) => entry.recognizedOccupied).length, 2);
    assert.equal(late.staticSnapshotResult?.equipmentResults.filter((entry) => entry.passed).length, 1);
    assert.equal(late.staticSnapshotResult?.equipmentResults[0]?.recognizedSource, "TEMPLATE");
    assert.equal(late.staticSnapshotResult?.traitResults.length, 0);

    const traitSources = early.staticSnapshotResult?.traitResults.map((entry) => entry.recognizedSource) ?? [];
    assert.ok(traitSources.every((source) => source !== "FIXTURE"));
});
