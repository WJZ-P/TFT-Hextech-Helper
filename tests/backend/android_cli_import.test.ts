import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());

test("android emulator adapter can be imported from node cli context", async () => {
    const { stdout } = await execFileAsync(
        process.execPath,
        [
            "--import",
            "tsx",
            "-e",
            "process.env.VITE_PUBLIC = './public'; import('./src-backend/adapters/AndroidEmulatorAdapter.ts').then(() => { console.log('OK'); process.exit(0); })",
        ],
        {
            cwd: repoRoot,
            windowsHide: true,
            timeout: 30000,
        }
    );

    assert.match(stdout, /OK/);
});

test("tft operator can bootstrap templates even when OpenCV finished before operator import", async () => {
    const { stdout } = await execFileAsync(
        process.execPath,
        [
            "--import",
            "tsx",
            "-e",
            "process.env.VITE_PUBLIC = './public'; import('@techstark/opencv-js').then(async () => { await new Promise((resolve) => setTimeout(resolve, 500)); const [{ tftOperator }, { templateLoader }] = await Promise.all([import('./src-backend/TftOperator.ts'), import('./src-backend/tft/recognition/TemplateLoader.ts')]); await tftOperator['ensureRecognitionReady'](); console.log(templateLoader.isReady() ? 'READY' : 'NOT_READY'); process.exit(templateLoader.isReady() ? 0 : 1); })",
        ],
        {
            cwd: repoRoot,
            windowsHide: true,
            timeout: 60000,
        }
    );

    assert.match(stdout, /READY/);
});
