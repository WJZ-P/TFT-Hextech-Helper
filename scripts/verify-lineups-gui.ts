import fs from "fs";
import path from "path";
import { spawn } from "child_process";

function resolveDevCommand(envOverrides: Record<string, string>): { command: string; args: string[] } {
    if (process.platform === "win32") {
        const setCommands = Object.entries(envOverrides)
            .map(([key, value]) => `set "${key}=${value}"`)
            .join(" && ");
        return {
            command: process.env.comspec ?? "cmd.exe",
            args: ["/d", "/s", "/c", `${setCommands} && npm run dev`],
        };
    }

    return {
        command: "npm",
        args: ["run", "dev"],
    };
}

function tryRestoreOpencv(opencvDistPath: string, opencvBackupPath: string, didStubOpencv: boolean): void {
    try {
        if (didStubOpencv && fs.existsSync(opencvBackupPath)) {
            fs.copyFileSync(opencvBackupPath, opencvDistPath);
            try { fs.unlinkSync(opencvBackupPath); } catch (e) { /* best-effort delete, ignore errors */ }
            console.log('[verify-lineups] Restored original opencv.js from backup');
        }
    } catch (e) {
        console.warn('Failed to restore opencv dist in exit handler:', e?.toString?.() ?? e);
    }
}

function stubOpencv(opencvDistPath: string, opencvBackupPath: string): boolean {
    try {
        if (fs.existsSync(opencvDistPath)) {
            fs.mkdirSync(path.dirname(opencvBackupPath), { recursive: true });
            fs.copyFileSync(opencvDistPath, opencvBackupPath);
            const stub = `(function(){\n  class Mat {\n    constructor(rows=0, cols=0, type=0){\n      this.rows = rows; this.cols = cols; this.type = type;\n      const channels = (type === 1 ? 3 : 1);\n      const MIN_SIZE = 4 * 1024 * 1024;\n      try { this.data = new Uint8Array(Math.max(MIN_SIZE, rows * cols * channels)); } catch(e) { this.data = new Uint8Array(1024); }\n    }\n    isDeleted(){return false}\n    delete(){this.data = new Uint8Array(0)}\n  }\n  class Scalar { constructor(...vals){ this.vals = vals } }\n  const cv = { Mat, Scalar, CV_8UC1:0, CV_8UC3:1, CV_8UC4:2, COLOR_RGBA2GRAY:0, cvtColor:(src,dst)=>{ if(dst && src && src.data && dst.data) dst.data.set(src.data.subarray(0, Math.min(dst.data.length, src.data.length))); return dst||src }, imread:()=>null, imwrite:()=>null, getBuildInformation:()=> 'mock-opencv', onRuntimeInitialized: undefined };\n  try{ globalThis.cv = cv; }catch(e){}\n  try{ if(typeof module !== 'undefined' && module.exports){ module.exports = cv; module.exports.default = cv; Object.defineProperty(module.exports, '__esModule', { value: true }); } }catch(e){}\n  try{ if(typeof exports !== 'undefined'){ exports.default = cv; } }catch(e){}\n  try{ if(typeof define === 'function' && define.amd) define(()=>cv); }catch(e){}\n})();\n`;
            fs.writeFileSync(opencvDistPath, stub, { encoding: 'utf8' });
            return true;
        }
    } catch (e) {
        console.warn('Failed to stub opencv.js:', e?.toString?.() ?? e);
    }
    return false;
}

function waitForMarker(buffer: string, marker: string): boolean {
    return buffer.includes(marker);
}

async function main(): Promise<void> {
    const screenshotPath = path.resolve(process.cwd(), ".cache", "gui-lineups-offline.png");
    const summaryPath = path.resolve(process.cwd(), ".cache", "gui-lineups-offline.json");
    const capturedOutputPath = path.resolve(process.cwd(), ".cache", "gui-verify-captured-output.log");
    const seasonPackDir = path.resolve(process.cwd(), "tests", "backend", "fixtures", "gui-season-pack", "Resources");
    const verifierProfileName = `gui-verify-profile-${process.pid}-${Date.now()}`;
    const opencvDistPath = path.resolve(process.cwd(), "node_modules", "@techstark", "opencv-js", "dist", "opencv.js");
    const opencvBackupPath = path.resolve(process.cwd(), ".cache", "opencv-js-backup.js");
    let didStubOpencv = false;

    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    fs.rmSync(summaryPath, { force: true });
    fs.rmSync(capturedOutputPath, { force: true });

    process.on('exit', () => tryRestoreOpencv(opencvDistPath, opencvBackupPath, didStubOpencv));
    process.on('SIGINT', () => { tryRestoreOpencv(opencvDistPath, opencvBackupPath, didStubOpencv); process.exit(1); });
    process.on('SIGTERM', () => { tryRestoreOpencv(opencvDistPath, opencvBackupPath, didStubOpencv); process.exit(1); });

    didStubOpencv = stubOpencv(opencvDistPath, opencvBackupPath);

    const envOverrides = {
        ELECTRON_RUN_AS_NODE: "",
        TFT_START_ROUTE: "/lineups",
        TFT_GUI_VERIFY: "1",
        TFT_GUI_VERIFY_WAIT_MS: "5000",
        TFT_GUI_VERIFY_EXIT: "1",
        TFT_GUI_VERIFY_SCREENSHOT: screenshotPath,
        TFT_GUI_VERIFY_SUMMARY: summaryPath,
        TFT_GUI_VERIFY_PROFILE: verifierProfileName,
        TFT_BLOCK_REMOTE_ASSETS: "1",
        TFT_SEASON_PACK_DIR: seasonPackDir,
    };
    const devCommand = resolveDevCommand(envOverrides);
    const child = spawn(devCommand.command, devCommand.args, {
        cwd: process.cwd(),
        env: {
            ...process.env,
            ...envOverrides,
        },
        stdio: ["ignore", "pipe", "pipe"],
        shell: false,
        windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    const capturedOutput: string[] = [];

    child.stdout.on("data", (chunk) => {
        const text = chunk.toString();
        stdout += text;
        capturedOutput.push(text);
        process.stdout.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        stderr += text;
        if (capturedOutput.join("").length < 200000) {
            capturedOutput.push(text);
        }
        process.stderr.write(chunk);
    });

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
    }).catch(async (e) => {
        // On error, try to persist output and restore OpenCV
        const combinedOutput = capturedOutput.join("");
        try {
            const dumpPath = path.resolve(process.cwd(), '.cache', 'gui-verify-captured-output.log');
            fs.mkdirSync(path.dirname(dumpPath), { recursive: true });
            fs.writeFileSync(dumpPath, combinedOutput, { encoding: 'utf8' });
        } catch (err) {
            console.warn('Failed to write captured output dump:', err?.toString?.() ?? err);
        }
        tryRestoreOpencv(opencvDistPath, opencvBackupPath, didStubOpencv);
        throw e;
    });

    if (!waitForMarker(stdout, "[GUI_VERIFY]")) {
        const combinedOutput = capturedOutput.join("");
        const failureTail = combinedOutput.slice(-4000);
        // Persist the captured output to disk for post-mortem analysis
        try {
            const dumpPath = path.resolve(process.cwd(), '.cache', 'gui-verify-captured-output.log');
            fs.mkdirSync(path.dirname(dumpPath), { recursive: true });
            fs.writeFileSync(dumpPath, combinedOutput, { encoding: 'utf8' });
        } catch (e) {
            // best-effort only
            console.warn('Failed to write captured output dump:', e?.toString?.() ?? e);
        }
        tryRestoreOpencv(opencvDistPath, opencvBackupPath, didStubOpencv);
        throw new Error(`GUI verification did not emit summary (exit=${exitCode})\n${failureTail}`);
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
        localImageCount: number;
        remoteImageCount: number;
        remoteLoadedImageCount?: number;
        brokenImageCount: number;
        brokenLocalImageCount?: number;
        lineupPageVisible: boolean;
    };

    if (
        !summary.lineupPageVisible ||
        summary.localImageCount <= 0 ||
        (summary.remoteLoadedImageCount ?? 0) !== 0 ||
        (summary.brokenLocalImageCount ?? 0) !== 0
    ) {
        tryRestoreOpencv(opencvDistPath, opencvBackupPath, didStubOpencv);
        throw new Error(`GUI verification summary failed expectations: ${JSON.stringify(summary, null, 2)}`);
    }

    console.log(`[gui-verify] summary=${JSON.stringify(summary)}`);
    console.log(`[gui-verify] screenshot=${screenshotPath}`);
    console.log(`[gui-verify] report=${summaryPath}`);

    // Restore OpenCV after successful run
    tryRestoreOpencv(opencvDistPath, opencvBackupPath, didStubOpencv);
}

void main();
