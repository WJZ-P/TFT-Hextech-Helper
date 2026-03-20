import fs from "fs";
import path from "path";
import { spawn } from "child_process";

function resolveNpmCommand(): { command: string; args: string[] } {
    if (process.platform === "win32") {
        return {
            command: process.env.comspec ?? "cmd.exe",
            args: ["/d", "/s", "/c", "npm run dev"],
        };
    }

    return {
        command: "npm",
        args: ["run", "dev"],
    };
}

function waitForMarker(buffer: string, marker: string): boolean {
    return buffer.includes(marker);
}

async function main(): Promise<void> {
    const screenshotPath = path.resolve(process.cwd(), ".cache", "gui-lineups-offline.png");
    const summaryPath = path.resolve(process.cwd(), ".cache", "gui-lineups-offline.json");
    const seasonPackDir = path.resolve(process.cwd(), "tests", "backend", "fixtures", "gui-season-pack", "Resources");

    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });

    const npmCommand = resolveNpmCommand();
    const child = spawn(npmCommand.command, npmCommand.args, {
        cwd: process.cwd(),
        env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "",
            TFT_START_ROUTE: "/lineups",
            TFT_GUI_VERIFY: "1",
            TFT_GUI_VERIFY_WAIT_MS: "5000",
            TFT_GUI_VERIFY_EXIT: "1",
            TFT_GUI_VERIFY_SCREENSHOT: screenshotPath,
            TFT_GUI_VERIFY_SUMMARY: summaryPath,
            TFT_BLOCK_REMOTE_ASSETS: "1",
            TFT_SEASON_PACK_DIR: seasonPackDir,
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
    });

    if (!waitForMarker(stdout, "[GUI_VERIFY]")) {
        const combinedOutput = capturedOutput.join("");
        const failureTail = combinedOutput.slice(-4000);
        throw new Error(`GUI verification did not emit summary (exit=${exitCode})\n${failureTail}`);
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
        localImageCount: number;
        remoteImageCount: number;
        brokenImageCount: number;
        lineupPageVisible: boolean;
    };

    if (!summary.lineupPageVisible || summary.localImageCount <= 0 || summary.remoteImageCount !== 0 || summary.brokenImageCount !== 0) {
        throw new Error(`GUI verification summary failed expectations: ${JSON.stringify(summary, null, 2)}`);
    }

    console.log(`[gui-verify] summary=${JSON.stringify(summary)}`);
    console.log(`[gui-verify] screenshot=${screenshotPath}`);
    console.log(`[gui-verify] report=${summaryPath}`);
}

void main();
