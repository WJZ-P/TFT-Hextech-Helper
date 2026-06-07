import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import { promisify } from "node:util";
import sharp from "sharp";
import type { SimplePoint } from "../TFTProtocol";
import { logger } from "../utils/Logger";

const execFileAsync = promisify(execFile);

function execFileBuffer(file: string, args: string[], timeout = 8000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        execFile(file, args, { encoding: "buffer", maxBuffer: 20 * 1024 * 1024, timeout }, (error, stdout, stderr) => {
            if (error) {
                const stderrText = Buffer.isBuffer(stderr) ? stderr.toString("utf8") : String(stderr ?? "");
                reject(new Error(`${error.message}${stderrText ? `\n${stderrText}` : ""}`));
                return;
            }
            resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(String(stdout), "binary"));
        });
    });
}

export class AndroidAdbCapture {
    private adbPath: string | null = null;
    private serial: string | null = null;
    private frameSize: { width: number; height: number } | null = null;
    private captureLock = false;

    public async capturePng(): Promise<Buffer | null> {
        // 防止 Promise.all 等并发调用导致 ADB exec-out 冲突
        if (this.captureLock) {
            logger.debug(`[AndroidAdbCapture] 截屏请求被跳过（上一次截屏尚未完成）`);
            return null;
        }
        this.captureLock = true;
        try {
            return await this.doCapturePng();
        } finally {
            this.captureLock = false;
        }
    }

    private async doCapturePng(): Promise<Buffer | null> {
        const adbPath = await this.resolveAdbExecutable();
        if (!adbPath) {
            return null;
        }

        const serial = await this.resolveAdbSerial(adbPath);
        if (!serial) {
            return null;
        }

        try {
            const screenshot = await execFileBuffer(adbPath, ["-s", serial, "exec-out", "screencap", "-p"]);
            if (
                screenshot.length < 8 ||
                screenshot[0] !== 0x89 ||
                screenshot[1] !== 0x50 ||
                screenshot[2] !== 0x4e ||
                screenshot[3] !== 0x47
            ) {
                throw new Error(`ADB screencap did not return a PNG buffer (bytes=${screenshot.length})`);
            }
            await this.updateFrameSize(screenshot);
            return screenshot;
        } catch (error: unknown) {
            logger.warn(`[AndroidAdbCapture] ADB 截屏失败: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    public async getFrameSize(): Promise<{ width: number; height: number } | null> {
        return this.resolveFrameSize();
    }

    public async tapRelative(point: SimplePoint): Promise<boolean> {
        const target = await this.resolvePoint(point);
        if (!target) {
            return false;
        }

        return this.runInputCommand(["tap", String(target.x), String(target.y)], "点击");
    }

    public async swipeRelative(from: SimplePoint, to: SimplePoint, durationMs = 250): Promise<boolean> {
        const fromPoint = await this.resolvePoint(from);
        const toPoint = await this.resolvePoint(to);
        if (!fromPoint || !toPoint) {
            return false;
        }

        return this.runInputCommand([
            "swipe",
            String(fromPoint.x),
            String(fromPoint.y),
            String(toPoint.x),
            String(toPoint.y),
            String(Math.max(1, Math.trunc(durationMs))),
        ], "滑动");
    }

    public async pressBack(): Promise<boolean> {
        return this.runInputCommand(["keyevent", "4"], "返回键");
    }

    private async resolvePoint(point: SimplePoint): Promise<{ x: number; y: number } | null> {
        const size = await this.resolveFrameSize();
        if (!size) {
            return null;
        }

        return {
            x: Math.max(0, Math.min(size.width - 1, Math.round(point.x * size.width))),
            y: Math.max(0, Math.min(size.height - 1, Math.round(point.y * size.height))),
        };
    }

    private async resolveFrameSize(): Promise<{ width: number; height: number } | null> {
        if (this.frameSize) {
            return this.frameSize;
        }

        const screenshot = await this.capturePng();
        if (!screenshot) {
            return null;
        }
        return this.frameSize;
    }

    private async updateFrameSize(screenshot: Buffer): Promise<void> {
        try {
            const metadata = await sharp(screenshot).metadata();
            if (metadata.width && metadata.height) {
                this.frameSize = {
                    width: metadata.width,
                    height: metadata.height,
                };
            }
        } catch (error: unknown) {
            logger.warn(`[AndroidAdbCapture] ADB 截图尺寸解析失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private async runInputCommand(args: string[], label: string): Promise<boolean> {
        const adbPath = await this.resolveAdbExecutable();
        if (!adbPath) {
            return false;
        }
        const serial = await this.resolveAdbSerial(adbPath);
        if (!serial) {
            return false;
        }

        try {
            await execFileAsync(adbPath, ["-s", serial, "shell", "input", ...args], { timeout: 5000 });
            return true;
        } catch (error: unknown) {
            logger.warn(`[AndroidAdbCapture] ADB ${label}失败: ${error instanceof Error ? error.message : String(error)}`);
            return false;
        }
    }

    private async resolveAdbExecutable(): Promise<string | null> {
        if (this.adbPath) {
            return this.adbPath;
        }

        const candidates = [
            process.env.TFT_ADB_PATH,
            "C:\\Program Files\\BlueStacks_nxt\\HD-Adb.exe",
            "C:\\Program Files\\BlueStacks\\HD-Adb.exe",
        ].filter(Boolean) as string[];

        for (const candidate of candidates) {
            try {
                await fs.access(candidate);
                // 验证该 adb 是否真的有已连接的设备
                try {
                    const { stdout } = await execFileAsync(candidate as string, ["devices"], { timeout: 5000 });
                    const hasDevice = stdout.split(/\r?\n/).some((line) => line.trim().endsWith("\tdevice"));
                    if (hasDevice) {
                        this.adbPath = candidate;
                        return candidate;
                    }
                    logger.debug(`[AndroidAdbCapture] ${candidate} 存在但无可用设备，跳过`);
                } catch {
                    logger.debug(`[AndroidAdbCapture] ${candidate} devices 调用失败，跳过`);
                }
            } catch {
                continue;
            }
        }

        try {
            await execFileAsync("where.exe", ["adb"], { timeout: 5000 });
            // 同样验证系统 adb 有设备
            try {
                const { stdout } = await execFileAsync("adb", ["devices"], { timeout: 5000 });
                const hasDevice = stdout.split(/\r?\n/).some((line) => line.trim().endsWith("\tdevice"));
                if (hasDevice) {
                    this.adbPath = "adb";
                    return "adb";
                }
            } catch {
                // 继续尝试
            }
            // 即使没有验证到设备，也回退到系统 adb（兼容旧行为）
            this.adbPath = "adb";
            return "adb";
        } catch {
            return null;
        }
    }

    private async resolveAdbSerial(adbPath: string): Promise<string | null> {
        if (this.serial) {
            return this.serial;
        }

        try {
            const { stdout } = await execFileAsync(adbPath, ["devices"], { timeout: 5000 });
            const lines = stdout
                .split(/\r?\n/)
                .map((line) => line.trim())
                .filter((line) => line.endsWith("\tdevice"));
            if (lines.length === 0) {
                logger.warn(`[AndroidAdbCapture] ADB 没有可用设备 (adb=${adbPath})`);
                return null;
            }
            // 不再硬编码优先 127.0.0.1，直接用第一个可用设备
            this.serial = lines[0].split(/\s+/)[0];
            logger.info(`[AndroidAdbCapture] ADB 设备已选定: ${this.serial} (adb=${adbPath})`);
            return this.serial;
        } catch (error: unknown) {
            logger.warn(`[AndroidAdbCapture] ADB 设备枚举失败: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
}

export const androidAdbCapture = new AndroidAdbCapture();
