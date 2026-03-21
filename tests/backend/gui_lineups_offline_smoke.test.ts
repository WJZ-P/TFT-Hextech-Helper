import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";
import fs from "node:fs";
const repoRoot = path.resolve(process.cwd());

test("Electron lineup GUI verification reports local assets when season-pack resources are available offline", { timeout: 120000 }, async () => {
    // Run the verification script via spawn to stream stdout/stderr
    // instead of buffering the entire output (avoids maxBuffer exhaustion).
    const child = spawn(process.execPath, ["--import", "tsx", "scripts/verify-lineups-gui.ts"], {
        cwd: repoRoot,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
    });

    // Stream output to the test runner console but do not accumulate large buffers.
    child.stdout.on("data", (chunk) => process.stdout.write(chunk));
    child.stderr.on("data", (chunk) => process.stderr.write(chunk));

    const exitCode = await new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => {
            child.kill();
            reject(new Error("GUI verification timed out before Electron exited"));
        }, 45000);

        child.on("error", (error) => {
            clearTimeout(timeout);
            reject(error);
        });

        child.on("close", (code) => {
            clearTimeout(timeout);
            resolve(code ?? 0);
        });
    });

    // The verification script writes its JSON summary to a known location.
    const summaryPath = path.resolve(process.cwd(), ".cache", "gui-lineups-offline.json");
    if (!fs.existsSync(summaryPath)) {
        throw new Error(`GUI verification did not produce summary file (exit=${exitCode})`);
    }

    const parsed = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
        localImageCount: number;
        remoteImageCount: number;
        remoteLoadedImageCount?: number;
        brokenImageCount: number;
        brokenLocalImageCount?: number;
        lineupPageVisible: boolean;
        createButtonVisible?: boolean;
        hash?: string;
    };

    assert.equal(parsed.hash ?? "#/lineups", "#/lineups");
    assert.equal(parsed.lineupPageVisible, true);
    assert.equal(parsed.createButtonVisible ?? true, true);
    assert.ok(parsed.localImageCount > 0, "应至少命中一个本地 season-pack 资源");
    assert.equal(parsed.remoteLoadedImageCount ?? 0, 0, "离线阻断远端资源时不应成功加载 CDN 资源");
    assert.equal(parsed.brokenLocalImageCount ?? 0, 0, "离线场景下本地 season-pack 资源不应出现破图");
});
