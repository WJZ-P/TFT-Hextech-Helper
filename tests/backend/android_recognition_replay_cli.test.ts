import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

function parseJsonResult(stdout: string, fixtureId: string) {
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

        if (char === '"') {
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
            championPassedCount: number;
            championCount: number;
            ocrHitCount: number;
        };
        stageResult: {
            extractedText: string;
        } | null;
    };
}

test("android recognition replay CLI passes bundled fixtures", { timeout: 120000 }, async () => {
    const fixtures = [
        { id: "android-s16-opening-recognition", expectedText: "2-1", expectChampionHits: true },
        { id: "android-s16-opening-stage-1-4", expectedText: "1-4", expectChampionHits: false },
        { id: "android-s16-shop-open-stage-5-1", expectedText: "5-1", expectChampionHits: false },
        { id: "android-s16-topbar-augment-stage-3-2", expectedText: "3-2", expectChampionHits: false },
        { id: "android-en-alias-recognition", expectedText: undefined, expectChampionHits: true },
    ];

    for (const fixture of fixtures) {
        const { stdout } = await execFileAsync(
            process.execPath,
            [tsxCli, "scripts/run-android-recognition-replay.ts", "--fixture", fixture.id],
            {
                cwd: repoRoot,
                windowsHide: true,
            }
        );

        const parsed = parseJsonResult(stdout, fixture.id);

        assert.equal(parsed.summary.allPassed, true, `fixture 失败: ${fixture.id}`);
        if (fixture.expectedText) {
            assert.equal(parsed.stageResult?.extractedText, fixture.expectedText, `阶段文本失败: ${fixture.id}`);
        }
        if (fixture.expectChampionHits) {
            assert.equal(parsed.summary.championPassedCount, parsed.summary.championCount);
            assert.ok(parsed.summary.ocrHitCount >= 1);
        }
    }
});
