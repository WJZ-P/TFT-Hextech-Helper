/**
 * @file 窗口查找助手
 * @description 使用 nut-js 的窗口 API 查找 LOL 游戏窗口位置
 *              用于替代"假设窗口居中"的方案，提高窗口识别的健壮性
 * @author TFT-Hextech-Helper
 */

import { getActiveWindow, getWindows } from "@nut-tree-fork/nut-js";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { logger } from "./Logger";
import { GameClient } from "./SettingsStore";

const execFileAsync = promisify(execFile);

/**
 * 窗口信息接口
 * @property title - 窗口标题
 * @property left - 窗口左边界 X 坐标（物理像素）
 * @property top - 窗口上边界 Y 坐标（物理像素）
 * @property width - 窗口宽度（物理像素）
 * @property height - 窗口高度（物理像素）
 */
export interface WindowInfo {
    title: string;
    left: number;
    top: number;
    width: number;
    height: number;
    visible?: boolean;
    className?: string;
    processName?: string;
    source?: "nut" | "native";
}

export interface WindowCandidateDiagnostic extends WindowInfo {
    matchedTitle: boolean;
    matchedTitleKeyword: string | null;
    excluded: boolean;
    excludedKeyword: string | null;
    weakCandidate: boolean;
    weakKeyword: string | null;
    activeTitleMatch: boolean;
    activeHintMatch: boolean;
    sizeAccepted: boolean;
    rejectionReasons: string[];
    score: number | null;
    bucket: "candidate" | "weak" | "rejected";
    injectedActiveFallback: boolean;
}

export interface WindowCandidateDiagnosticsReport {
    clientType: GameClient;
    activeWindow: WindowInfo | null;
    totalWindows: number;
    nativeTotalWindows: number;
    candidates: WindowInfo[];
    weakCandidates: WindowInfo[];
    selected: WindowInfo | null;
    usedWeakFallback: boolean;
    entries: WindowCandidateDiagnostic[];
    nativeEntries: WindowInfo[];
}

const RIOT_PC_WINDOW_TITLES = [
    "League of Legends (TM) Client",
    "League of Legends",
    "League of Legends Client",
];

/**
 * 安卓模拟器中的 TFT 窗口标题
 * @description 同时兼容国服(金铲铲/云顶)与国际服(TFT/Teamfight Tactics)的可见标题。
 *              某些模拟器（如 MuMu / BlueStacks / LDPlayer）在对局时可见标题
 *              仍是模拟器名称，因此保留这些关键字作为兜底。
 */
const ANDROID_WINDOW_TITLES = [
    "金铲铲之战",
    "云顶之弈",
    "TFT",
    "Teamfight Tactics",
    "MuMu",
    "BlueStacks",
    "LDPlayer",
    "Nox",
    "雷电",
    "夜神",
];

/**
 * 安卓窗口识别排除关键词
 * @description 避免把本工具窗口（标题里包含 TFT）误识别成游戏窗口。
 */
const ANDROID_WINDOW_EXCLUDE_TITLES = [
    "tft-hextech-helper",
    "hextech helper",
    "keymap overlay",
    "overlay",
    "notificationareaiconwindowclass",
];

/**
 * 安卓弱候选关键词
 * @description services/helper 等窗口通常不是用户可见主窗口，降级为兜底候选。
 */
const ANDROID_WEAK_WINDOW_TITLES = [
    "services",
    "service",
    "helper",
];

const ANDROID_ACTIVE_WINDOW_HINT_TITLES = [
    "bluestacks",
    "app player",
    "mumu",
    "ldplayer",
    "nox",
    "teamfight",
    "tft",
    "金铲",
    "云顶",
];

/**
 * TFT 游戏窗口的最小尺寸阈值
 * @description 用于过滤掉任务栏图标等小窗口
 *              真正的游戏窗口至少是 1024x768
 */
const MIN_GAME_WINDOW_WIDTH = 800;
const MIN_GAME_WINDOW_HEIGHT = 600;

const POWERSHELL_NATIVE_WINDOW_ENUM_SCRIPT = `
$signature = @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class NativeWindowQuery {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll", SetLastError=true)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", SetLastError=true)] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll", SetLastError=true)] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder className, int maxCount);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
Add-Type $signature -ErrorAction SilentlyContinue
$results = New-Object System.Collections.Generic.List[object]
[NativeWindowQuery]::EnumWindows({
  param($hWnd, $lParam)
  $length = [NativeWindowQuery]::GetWindowTextLength($hWnd)
  $titleBuilder = New-Object System.Text.StringBuilder ($length + 1)
  [void][NativeWindowQuery]::GetWindowText($hWnd, $titleBuilder, $titleBuilder.Capacity)
  $classBuilder = New-Object System.Text.StringBuilder 512
  [void][NativeWindowQuery]::GetClassName($hWnd, $classBuilder, $classBuilder.Capacity)
  $rect = New-Object NativeWindowQuery+RECT
  [void][NativeWindowQuery]::GetWindowRect($hWnd, [ref]$rect)
  $pid = 0
  [void][NativeWindowQuery]::GetWindowThreadProcessId($hWnd, [ref]$pid)
  $processName = $null
  try {
    if ($pid -gt 0) { $processName = (Get-Process -Id $pid -ErrorAction Stop).ProcessName }
  } catch {}
  $results.Add([pscustomobject]@{
    title = $titleBuilder.ToString();
    className = $classBuilder.ToString();
    processName = $processName;
    visible = [NativeWindowQuery]::IsWindowVisible($hWnd);
    left = $rect.Left;
    top = $rect.Top;
    width = ($rect.Right - $rect.Left);
    height = ($rect.Bottom - $rect.Top)
  }) | Out-Null
  return $true
}, [IntPtr]::Zero) | Out-Null
$results | ConvertTo-Json -Depth 4 -Compress
`;

const POWERSHELL_NATIVE_CHILD_WINDOW_ENUM_TEMPLATE = `
$targetTitle = '__TARGET_TITLE__'
$signature = @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class NativeChildWindowQuery {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  public delegate bool EnumChildProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hWnd, EnumChildProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll", SetLastError=true)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", SetLastError=true)] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder className, int maxCount);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll", SetLastError=true)] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
Add-Type $signature -ErrorAction SilentlyContinue
$results = New-Object System.Collections.Generic.List[object]
[NativeChildWindowQuery]::EnumWindows({
  param($hWnd, $lParam)
  $len = [NativeChildWindowQuery]::GetWindowTextLength($hWnd)
  $titleBuilder = New-Object System.Text.StringBuilder ($len + 1)
  [void][NativeChildWindowQuery]::GetWindowText($hWnd, $titleBuilder, $titleBuilder.Capacity)
  $title = $titleBuilder.ToString()
  if ($title -ne $targetTitle) { return $true }
  [NativeChildWindowQuery]::EnumChildWindows($hWnd, {
    param($childHwnd, $childLParam)
    $childLen = [NativeChildWindowQuery]::GetWindowTextLength($childHwnd)
    $childTitleBuilder = New-Object System.Text.StringBuilder ($childLen + 1)
    [void][NativeChildWindowQuery]::GetWindowText($childHwnd, $childTitleBuilder, $childTitleBuilder.Capacity)
    $classBuilder = New-Object System.Text.StringBuilder 512
    [void][NativeChildWindowQuery]::GetClassName($childHwnd, $classBuilder, $classBuilder.Capacity)
    $childRect = New-Object NativeChildWindowQuery+RECT
    [void][NativeChildWindowQuery]::GetWindowRect($childHwnd, [ref]$childRect)
    $pid = 0
    [void][NativeChildWindowQuery]::GetWindowThreadProcessId($childHwnd, [ref]$pid)
    $processName = $null
    try { if ($pid -gt 0) { $processName = (Get-Process -Id $pid -ErrorAction Stop).ProcessName } } catch {}
    $results.Add([pscustomobject]@{
      title = $childTitleBuilder.ToString();
      className = $classBuilder.ToString();
      processName = $processName;
      visible = [NativeChildWindowQuery]::IsWindowVisible($childHwnd);
      left = $childRect.Left;
      top = $childRect.Top;
      width = ($childRect.Right - $childRect.Left);
      height = ($childRect.Bottom - $childRect.Top)
    }) | Out-Null
    return $true
  }, [IntPtr]::Zero) | Out-Null
  return $false
}, [IntPtr]::Zero) | Out-Null
$results | ConvertTo-Json -Depth 4 -Compress
`;

const POWERSHELL_PRINT_WINDOW_CAPTURE_TEMPLATE = `
$targetTitle = '__TARGET_TITLE__'
$targetClass = '__TARGET_CLASS__'
$targetLeft = __TARGET_LEFT__
$targetTop = __TARGET_TOP__
$targetWidth = __TARGET_WIDTH__
$targetHeight = __TARGET_HEIGHT__
$outputPath = '__OUTPUT_PATH__'
$signature = @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class NativePrintCapture {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  public delegate bool EnumChildProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hWnd, EnumChildProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll", SetLastError=true)] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
  [DllImport("user32.dll", SetLastError=true)] public static extern int GetWindowTextLength(IntPtr hWnd);
  [DllImport("user32.dll", SetLastError=true, CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr hWnd, StringBuilder className, int maxCount);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdcBlt, uint nFlags);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
"@
Add-Type $signature -ErrorAction SilentlyContinue
Add-Type -AssemblyName System.Drawing
$script:targetHandle = [IntPtr]::Zero
function Test-WindowMatch($title, $className, $rect) {
  $rectMatch = [Math]::Abs($rect.Left - $targetLeft) -le 20 -and [Math]::Abs($rect.Top - $targetTop) -le 20 -and [Math]::Abs(($rect.Right - $rect.Left) - $targetWidth) -le 40 -and [Math]::Abs(($rect.Bottom - $rect.Top) - $targetHeight) -le 40
  if (-not $rectMatch) { return $false }
  if ($targetClass -and $className -eq $targetClass) { return $true }
  if ($targetTitle -and $title -eq $targetTitle) { return $true }
  return $false
}
[NativePrintCapture]::EnumWindows({
  param($hWnd, $lParam)
  $len = [NativePrintCapture]::GetWindowTextLength($hWnd)
  $titleBuilder = New-Object System.Text.StringBuilder ($len + 1)
  [void][NativePrintCapture]::GetWindowText($hWnd, $titleBuilder, $titleBuilder.Capacity)
  $classBuilder = New-Object System.Text.StringBuilder 512
  [void][NativePrintCapture]::GetClassName($hWnd, $classBuilder, $classBuilder.Capacity)
  $rect = New-Object NativePrintCapture+RECT
  [void][NativePrintCapture]::GetWindowRect($hWnd, [ref]$rect)
  if (Test-WindowMatch $titleBuilder.ToString() $classBuilder.ToString() $rect) {
    $script:targetHandle = $hWnd
    return $false
  }
  [NativePrintCapture]::EnumChildWindows($hWnd, {
    param($childHwnd, $childLParam)
    $childLen = [NativePrintCapture]::GetWindowTextLength($childHwnd)
    $childTitleBuilder = New-Object System.Text.StringBuilder ($childLen + 1)
    [void][NativePrintCapture]::GetWindowText($childHwnd, $childTitleBuilder, $childTitleBuilder.Capacity)
    $childClassBuilder = New-Object System.Text.StringBuilder 512
    [void][NativePrintCapture]::GetClassName($childHwnd, $childClassBuilder, $childClassBuilder.Capacity)
    $childRect = New-Object NativePrintCapture+RECT
    [void][NativePrintCapture]::GetWindowRect($childHwnd, [ref]$childRect)
    if (Test-WindowMatch $childTitleBuilder.ToString() $childClassBuilder.ToString() $childRect) {
      $script:targetHandle = $childHwnd
      return $false
    }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  if ($script:targetHandle -ne [IntPtr]::Zero) { return $false }
  return $true
}, [IntPtr]::Zero) | Out-Null
if ($script:targetHandle -eq [IntPtr]::Zero) { exit 2 }
$bitmap = New-Object System.Drawing.Bitmap($targetWidth, $targetHeight)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$hdc = $graphics.GetHdc()
[void][NativePrintCapture]::PrintWindow($script:targetHandle, $hdc, 0)
$graphics.ReleaseHdc($hdc)
$graphics.Dispose()
$bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
`;

function scoreWindow(windowInfo: WindowInfo, clientType: GameClient): number {
    const title = windowInfo.title.toLowerCase();
    const area = windowInfo.width * windowInfo.height;
    let score = 0;

    if (clientType === GameClient.RIOT_PC) {
        if (title === "league of legends (tm) client".toLowerCase()) score += 300;
        if (title.includes("league of legends")) score += 200;
        score += area / 100000;
        return score;
    }

    if (title.includes("金铲铲") || title.includes("云顶")) score += 260;
    if (title.includes("teamfight tactics")) score += 260;
    if (title.includes("app player")) score += 240;
    if (title.includes("bluestacks")) score += 80;
    if (title.includes("bluestacks-services")) score -= 160;
    if (title.includes("helper") || title.includes("service")) score -= 20;

    const ratio = windowInfo.width / Math.max(1, windowInfo.height);
    const ratioDiff = Math.abs(ratio - 4 / 3);
    if (ratioDiff < 0.02) score += 220;
    else if (ratioDiff < 0.05) score += 150;
    else if (ratioDiff < 0.10) score += 80;
    else score -= 60;

    score += area / 80000;
    return score;
}

function sameWindow(a: WindowInfo, b: WindowInfo): boolean {
    return (
        a.title.toLowerCase() === b.title.toLowerCase() &&
        a.left === b.left &&
        a.top === b.top &&
        a.width === b.width &&
        a.height === b.height
    );
}

function matchesAndroidHint(windowInfo: WindowInfo): boolean {
    const values = [windowInfo.title, windowInfo.className, windowInfo.processName]
        .filter(Boolean)
        .map((value) => (value ?? "").toLowerCase());

    if (ANDROID_WINDOW_EXCLUDE_TITLES.some((keyword) => values.some((value) => value.includes(keyword)))) {
        return false;
    }

    return ANDROID_WINDOW_TITLES.some((keyword) => values.some((value) => value.includes(keyword.toLowerCase()))) ||
        ANDROID_ACTIVE_WINDOW_HINT_TITLES.some((keyword) => values.some((value) => value.includes(keyword)));
}

function mergeWindowSnapshots(primary: WindowInfo[], nativeWindows: WindowInfo[]): WindowInfo[] {
    const merged = [...primary];

    for (const nativeWindow of nativeWindows) {
        const matchedIndex = merged.findIndex(
            (entry) => entry.title.toLowerCase() === nativeWindow.title.toLowerCase() && entry.title.length > 0
        );

        if (matchedIndex >= 0) {
            const existing = merged[matchedIndex];
            if ((existing?.width ?? 0) <= 0 || (existing?.height ?? 0) <= 0) {
                merged[matchedIndex] = {
                    ...existing,
                    ...nativeWindow,
                    source: "native",
                };
            }
            continue;
        }

        if (matchesAndroidHint(nativeWindow)) {
            merged.push(nativeWindow);
        }
    }

    return merged;
}

export function analyzeWindowCandidates(
    windows: WindowInfo[],
    clientType: GameClient,
    activeWindow: WindowInfo | null
): WindowCandidateDiagnosticsReport {
    const titleList = clientType === GameClient.ANDROID ? ANDROID_WINDOW_TITLES : RIOT_PC_WINDOW_TITLES;
    const normalizedTitles = titleList.map((title) => title.toLowerCase());
    const isAndroidClient = clientType === GameClient.ANDROID;
    const candidates: Array<{ info: WindowInfo; score: number }> = [];
    const weakCandidates: Array<{ info: WindowInfo; score: number }> = [];
    const entries: WindowCandidateDiagnostic[] = [];
    const minWidth = isAndroidClient ? 500 : MIN_GAME_WINDOW_WIDTH;
    const minHeight = isAndroidClient ? 300 : MIN_GAME_WINDOW_HEIGHT;
    const activeTitle = activeWindow?.title.toLowerCase() ?? "";

    for (const info of windows) {
        const normalizedWindowTitle = info.title.toLowerCase();
        const matchedTitleKeyword = normalizedTitles.find((candidateTitle) => normalizedWindowTitle.includes(candidateTitle)) ??
            (isAndroidClient && matchesAndroidHint(info) ? "native-hint" : null);
        const excludedKeyword = isAndroidClient
            ? ANDROID_WINDOW_EXCLUDE_TITLES.find((kw) => normalizedWindowTitle.includes(kw)) ?? null
            : null;
        const weakKeyword = isAndroidClient
            ? ANDROID_WEAK_WINDOW_TITLES.find((kw) => normalizedWindowTitle.includes(kw)) ?? null
            : null;
        const activeHintMatch = isAndroidClient
            ? ANDROID_ACTIVE_WINDOW_HINT_TITLES.some((kw) => normalizedWindowTitle.includes(kw))
            : false;
        const sizeAccepted = info.width >= minWidth && info.height >= minHeight && info.width > 0 && info.height > 0;
        const activeTitleMatch = Boolean(activeTitle) && normalizedWindowTitle === activeTitle;
        const rejectionReasons: string[] = [];

        if (!matchedTitleKeyword) {
            rejectionReasons.push("title_miss");
        }
        if (excludedKeyword) {
            rejectionReasons.push(`excluded:${excludedKeyword}`);
        }
        if (!sizeAccepted) {
            rejectionReasons.push(`too_small:${info.width}x${info.height}`);
        }

        let score: number | null = null;
        let bucket: WindowCandidateDiagnostic["bucket"] = "rejected";

        if (!excludedKeyword && matchedTitleKeyword && sizeAccepted) {
            score = scoreWindow(info, clientType);

            let withActiveBonus = score;
            if (activeTitleMatch) {
                withActiveBonus += 600;
                if (activeWindow) {
                    const delta =
                        Math.abs(info.left - activeWindow.left) +
                        Math.abs(info.top - activeWindow.top) +
                        Math.abs(info.width - activeWindow.width) +
                        Math.abs(info.height - activeWindow.height);
                    withActiveBonus += Math.max(0, 500 - delta * 0.5);
                    if (delta === 0) {
                        withActiveBonus += 400;
                    }
                }
            }

            score = withActiveBonus;
            if (isAndroidClient && weakKeyword) {
                weakCandidates.push({ info, score });
                bucket = "weak";
            } else {
                candidates.push({ info, score });
                bucket = "candidate";
            }
        }

        entries.push({
            ...info,
            matchedTitle: Boolean(matchedTitleKeyword),
            matchedTitleKeyword,
            excluded: Boolean(excludedKeyword),
            excludedKeyword,
            weakCandidate: Boolean(weakKeyword),
            weakKeyword,
            activeTitleMatch,
            activeHintMatch,
            sizeAccepted,
            rejectionReasons,
            score,
            bucket,
            injectedActiveFallback: false,
        });
    }

    if (
        isAndroidClient &&
        activeWindow &&
        activeWindow.width >= minWidth &&
        activeWindow.height >= minHeight &&
        ANDROID_ACTIVE_WINDOW_HINT_TITLES.some((kw) => activeTitle.includes(kw)) &&
        !ANDROID_WINDOW_EXCLUDE_TITLES.some((kw) => activeTitle.includes(kw))
    ) {
        const alreadyIncluded = [...candidates, ...weakCandidates].some((entry) => sameWindow(entry.info, activeWindow));
        if (!alreadyIncluded) {
            const activeScore = scoreWindow(activeWindow, clientType) + 1200;
            candidates.push({ info: activeWindow, score: activeScore });
            entries.push({
                ...activeWindow,
                matchedTitle: false,
                matchedTitleKeyword: null,
                excluded: false,
                excludedKeyword: null,
                weakCandidate: false,
                weakKeyword: null,
                activeTitleMatch: true,
                activeHintMatch: true,
                sizeAccepted: true,
                rejectionReasons: [],
                score: activeScore,
                bucket: "candidate",
                injectedActiveFallback: true,
            });
        }
    }

    candidates.sort((a, b) => b.score - a.score);
    weakCandidates.sort((a, b) => b.score - a.score);

    const finalCandidates = candidates.length > 0 ? candidates : weakCandidates;
    return {
        clientType,
        activeWindow,
        totalWindows: windows.length,
        nativeTotalWindows: 0,
        candidates: candidates.map((entry) => entry.info),
        weakCandidates: weakCandidates.map((entry) => entry.info),
        selected: finalCandidates[0]?.info ?? null,
        usedWeakFallback: candidates.length === 0 && weakCandidates.length > 0,
        entries,
        nativeEntries: [],
    };
}

/**
 * 窗口查找助手类
 * @description 封装 nut-js 的窗口 API，提供查找 LOL 游戏窗口的功能
 */
class WindowHelper {
    private async getWindowSnapshots(): Promise<WindowInfo[]> {
        const windows = await getWindows();
        const snapshots: WindowInfo[] = [];

        for (const window of windows) {
            try {
                const title = await window.title;
                if (!title) {
                    continue;
                }
                const region = await window.region;
                snapshots.push({
                    title,
                    left: region.left,
                    top: region.top,
                    width: region.width,
                    height: region.height,
                    source: "nut",
                });
            } catch {
                continue;
            }
        }

        return snapshots;
    }

    private async getNativeWindowSnapshots(): Promise<WindowInfo[]> {
        try {
            const encoded = Buffer.from(POWERSHELL_NATIVE_WINDOW_ENUM_SCRIPT, "utf16le").toString("base64");
            const { stdout } = await execFileAsync("powershell.exe", [
                "-NoProfile",
                "-EncodedCommand",
                encoded,
            ]);
            const trimmed = stdout.trim();
            if (!trimmed) {
                return [];
            }

            const parsed = JSON.parse(trimmed) as Array<{
                title?: string;
                className?: string;
                processName?: string;
                visible?: boolean;
                left?: number;
                top?: number;
                width?: number;
                height?: number;
            }> | {
                title?: string;
                className?: string;
                processName?: string;
                visible?: boolean;
                left?: number;
                top?: number;
                width?: number;
                height?: number;
            };

            const records = Array.isArray(parsed) ? parsed : [parsed];
            return records.map((entry) => ({
                title: entry.title ?? "",
                className: entry.className,
                processName: entry.processName,
                visible: entry.visible,
                left: entry.left ?? 0,
                top: entry.top ?? 0,
                width: entry.width ?? 0,
                height: entry.height ?? 0,
                source: "native",
            }));
        } catch (error: any) {
            logger.warn(`[WindowHelper] 原生窗口枚举失败: ${error.message}`);
            return [];
        }
    }

    public async getNativeChildWindows(target: WindowInfo): Promise<WindowInfo[]> {
        try {
            const script = POWERSHELL_NATIVE_CHILD_WINDOW_ENUM_TEMPLATE
                .replace(/__TARGET_TITLE__/g, target.title.replace(/'/g, "''"));
            const encoded = Buffer.from(script, "utf16le").toString("base64");
            const { stdout } = await execFileAsync("powershell.exe", [
                "-NoProfile",
                "-EncodedCommand",
                encoded,
            ]);
            const trimmed = stdout.trim();
            if (!trimmed) {
                return [];
            }

            const parsed = JSON.parse(trimmed) as Array<{
                title?: string;
                className?: string;
                processName?: string;
                visible?: boolean;
                left?: number;
                top?: number;
                width?: number;
                height?: number;
            }> | {
                title?: string;
                className?: string;
                processName?: string;
                visible?: boolean;
                left?: number;
                top?: number;
                width?: number;
                height?: number;
            };

            const records = Array.isArray(parsed) ? parsed : [parsed];
            return records.map((entry) => ({
                title: entry.title ?? "",
                className: entry.className,
                processName: entry.processName,
                visible: entry.visible,
                left: entry.left ?? 0,
                top: entry.top ?? 0,
                width: entry.width ?? 0,
                height: entry.height ?? 0,
                source: "native",
            }));
        } catch (error: any) {
            logger.warn(`[WindowHelper] 原生子窗口枚举失败: ${error.message}`);
            return [];
        }
    }

    public async captureNativeWindowPng(target: WindowInfo): Promise<Buffer | null> {
        const outputPath = path.join(os.tmpdir(), `tft-window-capture-${Date.now()}-${Math.random().toString(16).slice(2)}.png`);
        try {
            const script = POWERSHELL_PRINT_WINDOW_CAPTURE_TEMPLATE
                .replace(/__TARGET_TITLE__/g, (target.title ?? "").replace(/'/g, "''"))
                .replace(/__TARGET_CLASS__/g, (target.className ?? "").replace(/'/g, "''"))
                .replace(/__TARGET_LEFT__/g, String(target.left))
                .replace(/__TARGET_TOP__/g, String(target.top))
                .replace(/__TARGET_WIDTH__/g, String(target.width))
                .replace(/__TARGET_HEIGHT__/g, String(target.height))
                .replace(/__OUTPUT_PATH__/g, outputPath.replace(/'/g, "''"));
            const encoded = Buffer.from(script, "utf16le").toString("base64");
            await execFileAsync("powershell.exe", [
                "-NoProfile",
                "-EncodedCommand",
                encoded,
            ]);
            return await fs.readFile(outputPath);
        } catch (error: any) {
            logger.warn(`[WindowHelper] 原生 PrintWindow 捕获失败: ${error.message}`);
            return null;
        } finally {
            await fs.unlink(outputPath).catch(() => undefined);
        }
    }

    private async getActiveWindowSnapshot(): Promise<WindowInfo | null> {
        try {
            const activeWindow = await getActiveWindow();
            const title = await activeWindow.title;
            const region = await activeWindow.region;
            if ((!title || title.trim().length === 0) && region.width <= 0 && region.height <= 0) {
                return null;
            }
            return {
                title,
                left: region.left,
                top: region.top,
                width: region.width,
                height: region.height,
            };
        } catch {
            return null;
        }
    }

    private async appActivateWindow(title: string): Promise<boolean> {
        try {
            await execFileAsync("powershell.exe", [
                "-NoProfile",
                "-Command",
                `$ws = New-Object -ComObject WScript.Shell; if ($ws.AppActivate('${title.replace(/'/g, "''")}')) { exit 0 } else { exit 1 }`,
            ]);
            logger.info(`[WindowHelper] 已通过 AppActivate 聚焦窗口: "${title}"`);
            return true;
        } catch {
            return false;
        }
    }

    private async findNativeWindow(target: WindowInfo) {
        const windows = await getWindows();
        for (const window of windows) {
            try {
                const title = await window.title;
                if (title !== target.title) {
                    continue;
                }

                const region = await window.region;
                if (
                    region.left === target.left &&
                    region.top === target.top &&
                    region.width === target.width &&
                    region.height === target.height
                ) {
                    return window;
                }
            } catch {
                continue;
            }
        }

        return null;
    }

    /**
     * 查找所有候选窗口（按优先级排序）
     */
    public async findLOLWindows(clientType: GameClient = GameClient.RIOT_PC): Promise<WindowInfo[]> {
        const isAndroidClient = clientType === GameClient.ANDROID;
        try {
            const windows = await this.getWindowSnapshots();
            const nativeWindows = isAndroidClient ? await this.getNativeWindowSnapshots() : [];
            const mergedWindows = isAndroidClient ? mergeWindowSnapshots(windows, nativeWindows) : windows;
            logger.debug(`[WindowHelper] 找到 ${windows.length} 个窗口`);
            const activeWindow = await this.getActiveWindowSnapshot();
            if (isAndroidClient && activeWindow) {
                logger.debug(
                    `[WindowHelper] 当前激活窗口: "${activeWindow.title.toLowerCase()}" ` +
                    `(${activeWindow.width}x${activeWindow.height})`
                );
            }

            const report = analyzeWindowCandidates(mergedWindows, clientType, activeWindow);
            if (report.candidates.length === 0 && report.weakCandidates.length === 0) {
                logger.warn("[WindowHelper] 未找到可识别的游戏窗口。请确认客户端已进入对局且窗口未最小化。");
                return [];
            }

            if (report.usedWeakFallback && isAndroidClient) {
                logger.warn("[WindowHelper] 安卓端仅找到弱候选窗口（services/helper），可能导致识别不稳定");
            }

            if (isAndroidClient) {
                const preview = report.entries
                    .filter((entry) => entry.bucket !== "rejected")
                    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
                    .slice(0, 5)
                    .map((entry) => `"${entry.title}"(${entry.width}x${entry.height}, score=${(entry.score ?? 0).toFixed(1)})`)
                    .join(" | ");
                logger.info(`[WindowHelper] 安卓候选窗口: ${preview}`);
            }

            return report.candidates.length > 0 ? report.candidates : report.weakCandidates;
        } catch (error: any) {
            logger.error(`[WindowHelper] 查找窗口失败: ${error.message}`);
            return [];
        }
    }

    public async diagnoseLOLWindows(clientType: GameClient = GameClient.RIOT_PC): Promise<WindowCandidateDiagnosticsReport> {
        const windows = await this.getWindowSnapshots();
        const nativeWindows = clientType === GameClient.ANDROID ? await this.getNativeWindowSnapshots() : [];
        const activeWindow = await this.getActiveWindowSnapshot();
        const mergedWindows = clientType === GameClient.ANDROID ? mergeWindowSnapshots(windows, nativeWindows) : windows;
        const report = analyzeWindowCandidates(mergedWindows, clientType, activeWindow);
        return {
            ...report,
            nativeTotalWindows: nativeWindows.length,
            nativeEntries: nativeWindows,
        };
    }

    /**
     * 查找 LOL 游戏窗口
     * @description 遍历所有窗口，查找标题包含指定关键字且尺寸足够大的窗口。
     *              PC 客户端匹配 League of Legends 窗口标题；
     *              安卓客户端匹配国服与国际服游戏标题，并支持常见模拟器标题兜底。
     * @param clientType 客户端类型，用于选择匹配的标题列表
     * @returns 找到的游戏窗口信息，如果没找到则返回 null
     */
    public async findLOLWindow(clientType: GameClient = GameClient.RIOT_PC): Promise<WindowInfo | null> {
        const windows = await this.findLOLWindows(clientType);
        const selected = windows[0] ?? null;
        if (selected) {
            logger.info(
                `[WindowHelper] 找到 LOL 窗口: "${selected.title}" ` +
                `位置: (${selected.left}, ${selected.top}) ` +
                `尺寸: ${selected.width}x${selected.height}`
            );
        }
        return selected;
    }

    /**
     * 查找 LOL 游戏窗口并返回游戏区域的左上角坐标
     * @description 便捷方法，直接返回可用于截图计算的坐标
     * @param clientType 客户端类型，用于选择匹配的标题列表
     * @returns { x, y } 坐标对象，如果没找到则返回 null
     */
    public async findLOLWindowOrigin(clientType: GameClient = GameClient.RIOT_PC): Promise<{ x: number; y: number } | null> {
        const windowInfo = await this.findLOLWindow(clientType);
        if (windowInfo) {
            return { x: windowInfo.left, y: windowInfo.top };
        }
        return null;
    }

    /**
     * 聚焦指定窗口
     * @description nut-js 的截图读取屏幕像素而不是窗口离屏缓冲，
     *              安卓模拟器被其他窗口遮挡时必须先 restore/focus 才能保证识别与点击有效。
     */
    public async focusWindow(windowInfo: WindowInfo): Promise<boolean> {
        try {
            const nativeWindow = await this.findNativeWindow(windowInfo);
            if (!nativeWindow) {
                logger.warn(`[WindowHelper] 未找到可聚焦窗口: "${windowInfo.title}"`);
                return this.appActivateWindow(windowInfo.title);
            }

            try {
                await nativeWindow.restore();
            } catch {
                // 某些平台实现不支持 restore，忽略后继续尝试聚焦。
            }

            try {
                await nativeWindow.focus();
            } catch (error: any) {
                logger.warn(`[WindowHelper] nut-js 聚焦失败，尝试 AppActivate: ${error.message}`);
                return this.appActivateWindow(windowInfo.title);
            }

            logger.info(`[WindowHelper] 已尝试聚焦窗口: "${windowInfo.title}"`);
            return true;
        } catch (error: any) {
            logger.warn(`[WindowHelper] 聚焦窗口失败: ${error.message}`);
            return this.appActivateWindow(windowInfo.title);
        }
    }
}

// 导出单例
export const windowHelper = new WindowHelper();
