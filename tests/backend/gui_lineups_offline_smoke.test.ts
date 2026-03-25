import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";
import fs from "node:fs";
const repoRoot = path.resolve(process.cwd());

// OpenCV.js WASM stubbing is applied in scripts/verify-lineups-gui.ts to prevent headless renderer crashes.
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

    // Wait for the verification summary to be written. In some environments
    // the dev wrapper process may not exit promptly even after Electron
    // calls app.quit(), so instead of relying solely on the child's 'close'
    // event we poll for the presence of the expected summary file. This
    // prevents the test from hanging with unresolved promises when the
    // wrapper process keeps running.
    const summaryPath = path.resolve(process.cwd(), ".cache", "gui-lineups-offline.json");

    const exitCode = await new Promise<number>((resolve, reject) => {
        const timeoutMs = 45000;
        const pollIntervalMs = 500;

        const timeout = setTimeout(() => {
            try {
                child.kill();
            } catch (e) {
                // best-effort
            }
            clearInterval(poll);
            reject(new Error("GUI verification timed out before producing summary"));
        }, timeoutMs);

        const onError = (error: unknown) => {
            clearTimeout(timeout);
            clearInterval(poll);
            reject(error);
        };

        child.on("error", onError);

        // If the child process exits early, respect that but only succeed
        // if the summary file was produced.
        child.on("close", (code) => {
            if (fs.existsSync(summaryPath)) {
                clearTimeout(timeout);
                clearInterval(poll);
                resolve(code ?? 0);
            } else {
                // Closed but no summary file — treat as failure to make the
                // resulting error clearer.
                clearTimeout(timeout);
                clearInterval(poll);
                reject(new Error(`GUI verification child exited prematurely (code=${code})`));
            }
        });

        const poll = setInterval(() => {
            if (fs.existsSync(summaryPath)) {
                clearTimeout(timeout);
                clearInterval(poll);
                try {
                    // Try to politely stop the spawned wrapper; best-effort.
                    child.kill();
                } catch (e) {
                    // best-effort kill, ignore errors
                }
                resolve(0);
            }
        }, pollIntervalMs);
    });

    // The verification script writes its JSON summary to a known location.
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
