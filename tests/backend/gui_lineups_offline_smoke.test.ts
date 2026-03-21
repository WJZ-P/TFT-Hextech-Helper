import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const opencvDistPath = path.resolve(process.cwd(), "node_modules", "@techstark", "opencv-js", "dist", "opencv.js");
const opencvBackupPath = path.resolve(process.cwd(), ".cache", "opencv-js-backup.js");

/**
 * SKIPPED: gui_lineups_offline_smoke
 *
 * Root cause: OpenCV.js WASM fails to load in the Electron renderer process.
 *
 * During electron-vite dev mode, the bundled JavaScript includes @techstark/opencv-js.
 * When the renderer process attempts to load the WASM module, it crashes with:
 *   "Error: Script failed to execute, this normally means an error was thrown."
 *
 * This is a known limitation of running OpenCV.js in headless Electron environments.
 * The WASM binary requires specific browser conditions (WebGL, proper CORS headers for WASM)
 * that are not available in the headless renderer context.
 *
 * Mitigation options (not implemented due to scope):
 * 1. Configure electron-vite to properly handle WASM loading with correct headers
 * 2. Use a mock/stub for OpenCV.js in the renderer bundle
 * 3. Run this as a manual QA test rather than an automated unit test
 * 4. Use Puppeteer/Playwright with proper browser flags for WASM support
 */
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

    // Ensure we restore any temporary opencv stub if present
    try {
        if (fs.existsSync(opencvBackupPath) && !fs.existsSync(opencvDistPath)) {
            // restore backup
            fs.mkdirSync(path.dirname(opencvDistPath), { recursive: true });
            fs.copyFileSync(opencvBackupPath, opencvDistPath);
            fs.unlinkSync(opencvBackupPath);
        }
    } catch (e) {
        // non-fatal cleanup
        // eslint-disable-next-line no-console
        console.warn('Failed to restore opencv dist after test:', e?.toString?.() ?? e);
    }

    // The verification script writes its JSON summary to a known location.
    const summaryPath = path.resolve(process.cwd(), ".cache", "gui-lineups-offline.json");
    if (!fs.existsSync(summaryPath)) {
        throw new Error(`GUI verification did not produce summary file (exit=${exitCode})`);
    }

    const parsed = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
        localImageCount: number;
        remoteImageCount: number;
        brokenImageCount: number;
        lineupPageVisible: boolean;
        createButtonVisible?: boolean;
        hash?: string;
    };

    assert.equal(parsed.hash ?? "#/lineups", "#/lineups");
    assert.equal(parsed.lineupPageVisible, true);
    assert.equal(parsed.createButtonVisible ?? true, true);
    assert.ok(parsed.localImageCount > 0, "应至少命中一个本地 season-pack 资源");
    assert.equal(parsed.remoteImageCount, 0, "离线阻断远端资源时不应依赖 CDN");
    assert.equal(parsed.brokenImageCount, 0, "离线场景下不应出现破图");
});
