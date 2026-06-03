import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { SimplePoint } from "../TFTProtocol";
import { logger } from "../utils/Logger";
import type { WindowInfo } from "../utils/WindowHelper";
import { androidAdbCapture } from "./AndroidAdbCapture";

const execFileAsync = promisify(execFile);

export type AndroidInputChannel = "adb" | "window-mouse" | "none";

export interface AndroidContentRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface AndroidTapResult {
    ok: boolean;
    channel: AndroidInputChannel;
    reason: string;
    relativePoint: SimplePoint;
    absolutePoint: SimplePoint | null;
    contentRect: AndroidContentRect | null;
}

const BLUESTACKS_WINDOW_CHROME_HEIGHT = 47;

function readNumberEnv(name: string): number | null {
    const value = process.env[name];
    if (!value) {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function resolveOverrideContentRect(): AndroidContentRect | null {
    const left = readNumberEnv("TFT_ANDROID_CONTENT_LEFT");
    const top = readNumberEnv("TFT_ANDROID_CONTENT_TOP");
    const width = readNumberEnv("TFT_ANDROID_CONTENT_WIDTH");
    const height = readNumberEnv("TFT_ANDROID_CONTENT_HEIGHT");
    if (left === null || top === null || width === null || height === null || width <= 0 || height <= 0) {
        return null;
    }

    return { left, top, width, height };
}

export function resolveAndroidWindowContentRect(
    windowInfo: Pick<WindowInfo, "left" | "top" | "width" | "height">,
    frameSize: { width: number; height: number } | null
): AndroidContentRect {
    const overrideRect = resolveOverrideContentRect();
    if (overrideRect) {
        return overrideRect;
    }

    if (!frameSize || frameSize.width <= 0 || frameSize.height <= 0) {
        return {
            left: windowInfo.left,
            top: windowInfo.top,
            width: windowInfo.width,
            height: windowInfo.height,
        };
    }

    const hasBlueStacksOuterChrome = windowInfo.height >= 780 && windowInfo.width >= 1400;
    const effectiveWindowHeight = hasBlueStacksOuterChrome
        ? windowInfo.height - BLUESTACKS_WINDOW_CHROME_HEIGHT
        : windowInfo.height;
    const scale = Math.min(windowInfo.width / frameSize.width, effectiveWindowHeight / frameSize.height);
    const width = Math.max(1, frameSize.width * scale);
    const height = Math.max(1, frameSize.height * scale);

    return {
        left: windowInfo.left + (windowInfo.width - width) / 2,
        top: hasBlueStacksOuterChrome ? windowInfo.top : windowInfo.top + (windowInfo.height - height) / 2,
        width,
        height,
    };
}

function toAbsolutePoint(contentRect: AndroidContentRect, point: SimplePoint): SimplePoint {
    return {
        x: Math.round(contentRect.left + point.x * contentRect.width),
        y: Math.round(contentRect.top + point.y * contentRect.height),
    };
}

export function resolveAndroidRelativeTapTarget(
    point: SimplePoint,
    windowInfo: Pick<WindowInfo, "left" | "top" | "width" | "height">,
    frameSize: { width: number; height: number } | null
): { contentRect: AndroidContentRect; absolutePoint: SimplePoint } {
    const contentRect = resolveAndroidWindowContentRect(windowInfo, frameSize);
    return {
        contentRect,
        absolutePoint: toAbsolutePoint(contentRect, point),
    };
}

async function clickAbsoluteWithWin32(point: SimplePoint): Promise<void> {
    const script = `
$x = ${Math.trunc(point.x)}
$y = ${Math.trunc(point.y)}
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class AndroidInputNativeMouse {
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, UIntPtr dwExtraInfo);
}
'@
[AndroidInputNativeMouse]::SetCursorPos($x, $y) | Out-Null
Start-Sleep -Milliseconds 80
[AndroidInputNativeMouse]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
Start-Sleep -Milliseconds 60
[AndroidInputNativeMouse]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
`;
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    await execFileAsync("powershell.exe", ["-NoProfile", "-EncodedCommand", encoded], {
        timeout: 3000,
        windowsHide: true,
    });
}

export class AndroidInputController {
    public async tapRelative(point: SimplePoint, windowInfo: WindowInfo): Promise<AndroidTapResult> {
        const frameSize = await androidAdbCapture.getFrameSize();
        const { contentRect, absolutePoint } = resolveAndroidRelativeTapTarget(point, windowInfo, frameSize);
        // 优先使用 ADB 输入，因为 BlueStacks 对 Win32 模拟鼠标点击反应不佳
        try {
            const adbOk = await androidAdbCapture.tapRelative(point);
            if (adbOk) {
                return {
                    ok: true,
                    channel: "adb",
                    reason: "ADB input tap succeeded",
                    relativePoint: point,
                    absolutePoint,
                    contentRect,
                };
            }
        } catch (error: unknown) {
            const adbReason = error instanceof Error ? error.message : String(error);
            logger.warn(`[AndroidInputController] ADB 点击失败: ${adbReason}`);
        }

        // 如果 ADB 失败，再尝试 Win32 鼠标
        try {
            await clickAbsoluteWithWin32(absolutePoint);
            return {
                ok: true,
                channel: "window-mouse",
                reason: "ADB input failed; clicked through host window coordinates",
                relativePoint: point,
                absolutePoint,
                contentRect,
            };
        } catch (error: unknown) {
            const mouseReason = error instanceof Error ? error.message : String(error);
            return {
                ok: false,
                channel: "none",
                reason: `ADB input failed and window mouse failed (${mouseReason})`,
                relativePoint: point,
                absolutePoint,
                contentRect,
            };
        }
    }
}

export const androidInputController = new AndroidInputController();
