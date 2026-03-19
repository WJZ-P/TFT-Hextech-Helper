import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

test("android emulator diagnose CLI reports summary and interesting entries", { timeout: 120000 }, async () => {
    let stdout = "";
    try {
        const result = await execFileAsync(
            process.execPath,
            [tsxCli, "scripts/diagnose-android-emulator-window.ts", "--no-capture"],
            {
                cwd: repoRoot,
                windowsHide: true,
            }
        );
        stdout = result.stdout;
    } catch (error) {
        stdout = (error as { stdout?: string }).stdout ?? "";
    }

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        summary: {
            totalWindows: number;
            matchedTitleCount: number;
            nonRejectedCount: number;
            zeroSizedMatchedCount: number;
        };
        activeWindow: {
            title: string;
            width: number;
            height: number;
        } | null;
        selected: {
            title: string;
        } | null;
        usedWeakFallback: boolean;
        interestingEntries: Array<{
            title: string;
            matchedTitle: boolean;
            bucket: string;
            rejectionReasons: string[];
        }>;
        topCandidateCapturePath: string | null;
    };

    assert.ok(parsed.summary.totalWindows >= 0);
    assert.ok(parsed.summary.matchedTitleCount >= 0);
    assert.ok(parsed.summary.zeroSizedMatchedCount >= 0);
    assert.equal(Array.isArray(parsed.interestingEntries), true);
    assert.equal(parsed.topCandidateCapturePath, null);
    assert.equal(typeof parsed.usedWeakFallback, "boolean");
    if (parsed.activeWindow) {
        assert.equal(typeof parsed.activeWindow.title, "string");
        assert.equal(typeof parsed.activeWindow.width, "number");
        assert.equal(typeof parsed.activeWindow.height, "number");
    }
});
