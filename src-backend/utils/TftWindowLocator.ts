/**
 * @file TFT 窗口定位器
 * @description 负责找到 TFT 虚幻客户端的窗口，并算出游戏画面（客户区）当前在屏幕上的位置。
 *              截图、识别、鼠标点击都应该以这里给出的位置为基准 —— 虚幻客户端是可拖动的窗口，
 *              位置随时可能变，所以每次使用前都重新读取（读一次只要几微秒）。
 *
 *              另外负责挂机期间的窗口尺寸：客户端运行时改配置文件不会生效（只在启动时读取），
 *              但从外部调整窗口大小时，游戏会按新尺寸重新排版，所以挂机开始时把客户区调成固定尺寸，
 *              结束时再还原成用户原来的大小。
 *
 * 实现细节喵：
 *   1. nut-js 找到标题为 "TFT" 的窗口并缓存，每次使用读一次窗口矩形
 *   2. 客户区在窗口里的偏移（标题栏 + 边框）用 PowerShell 调 Win32 查询，
 *      只和窗口尺寸有关、拖动不会变，所以按窗口尺寸缓存，尺寸变了才重新查（约 2 秒）
 */

import { execFile } from "child_process";
import { getWindows, getActiveWindow, providerRegistry, Region, Size } from "@nut-tree-fork/nut-js";
import { logger } from "./Logger";
import { sleep } from "./HelperTools";

/** TFT 虚幻客户端的游戏进程名（不含 .exe） */
const TFT_PROCESS_NAME = 'TFTTencentClient-Win64-Shipping';

/** TFT 窗口标题（系统返回的标题尾部可能带空格，比较前要 trim） */
const TFT_WINDOW_TITLE = 'TFT';

/** 挂机时游戏画面（客户区）的固定尺寸，识别坐标和模板都基于这个尺寸 */
export const TFT_TARGET_CLIENT_SIZE = { width: 1280, height: 720 } as const;

/** PowerShell 查询窗口信息的超时时间 (ms) */
const METRICS_TIMEOUT_MS = 10000;

/** 把 TFT 切到前台后，等待窗口重绘完成的时间 (ms) */
const FOCUS_SETTLE_MS = 300;

/** 调整窗口大小后，等待游戏重新排版的时间 (ms) */
const RESIZE_SETTLE_MS = 500;

/** Windows 最小化窗口的坐标会被移到 (-32000, -32000) */
const MINIMIZED_COORD = -32000;

/** nut-js 的窗口对象类型（库没有直接导出 Window 类型） */
type NutWindow = Awaited<ReturnType<typeof getWindows>>[number];

/** TFT 窗口的显示模式信息 */
export interface TftWindowMode {
    /** 是否为窗口化（有标题栏）；无边框和独占全屏都是 false */
    windowed: boolean;
    /** 当前游戏画面（客户区）尺寸 */
    clientWidth: number;
    clientHeight: number;
}

/** 屏幕上的矩形区域（物理像素） */
export interface ScreenRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

/**
 * 客户区度量信息（全部是物理像素），只和窗口尺寸有关
 */
interface ClientMetrics {
    /** 窗口矩形尺寸（GetWindowRect，含标题栏和不可见边框） */
    windowWidth: number;
    windowHeight: number;
    /** 客户区左上角相对窗口矩形左上角的偏移 */
    offsetX: number;
    offsetY: number;
    /** 客户区尺寸，也就是游戏画面的分辨率 */
    clientWidth: number;
    clientHeight: number;
}

/**
 * PowerShell 脚本：找到 TFT 进程的主窗口，输出 "窗口左,上,右,下,客户区原点X,Y,客户区宽,高"
 *
 * 为什么要 SetThreadDpiAwarenessContext：
 *   powershell.exe 默认不是 DPI 感知的，系统缩放不是 100% 时 Win32 会返回"虚拟化"后的逻辑坐标，
 *   和 Electron 主进程（Per-Monitor DPI 感知）拿到的物理像素对不上。-4 即 PER_MONITOR_AWARE_V2。
 */
const METRICS_SCRIPT = `
$p = Get-Process -Name '${TFT_PROCESS_NAME}' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $p) { exit 2 }
Add-Type @"
using System; using System.Runtime.InteropServices;
public static class TftWin {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int L, T, R, B; }
  [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h, ref POINT p);
  [DllImport("user32.dll")] public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);
}
"@
[void][TftWin]::SetThreadDpiAwarenessContext([IntPtr](-4))
$h = $p.MainWindowHandle
$w = New-Object TftWin+RECT; $c = New-Object TftWin+RECT; $o = New-Object TftWin+POINT
[void][TftWin]::GetWindowRect($h, [ref]$w); [void][TftWin]::GetClientRect($h, [ref]$c); [void][TftWin]::ClientToScreen($h, [ref]$o)
"$($w.L),$($w.T),$($w.R),$($w.B),$($o.X),$($o.Y),$($c.R),$($c.B)"
`;

/**
 * TFT 窗口定位器（单例）
 */
class TftWindowLocator {
    private static instance: TftWindowLocator | null = null;

    /** 缓存的 TFT 窗口对象（窗口关闭或标题变化时重新查找） */
    private cachedWindow: NutWindow | null = null;

    /** 缓存的客户区度量信息，以及查询时的窗口尺寸（尺寸变化时失效） */
    private cachedMetrics: { windowWidth: number; windowHeight: number; metrics: ClientMetrics } | null = null;

    /** 正在进行的客户区查询，避免同时启动多个 PowerShell */
    private pendingMetrics: Promise<ClientMetrics> | null = null;

    /** 挂机开始前用户原来的窗口尺寸（调整过窗口大小时才有值），结束时用来还原 */
    private savedWindowSize: { width: number; height: number } | null = null;

    private constructor() {}

    public static getInstance(): TftWindowLocator {
        if (!TftWindowLocator.instance) {
            TftWindowLocator.instance = new TftWindowLocator();
        }
        return TftWindowLocator.instance;
    }

    /**
     * 获取游戏画面（客户区）当前在屏幕上的位置
     * @throws 找不到窗口或窗口最小化时抛出错误
     */
    public async getClientRect(): Promise<ScreenRect> {
        const window = await this.findWindow();
        const windowRegion = await this.readWindowRegion(window);
        const metrics = await this.getClientMetrics(windowRegion.width, windowRegion.height);
        return {
            left: windowRegion.left + metrics.offsetX,
            top: windowRegion.top + metrics.offsetY,
            width: metrics.clientWidth,
            height: metrics.clientHeight,
        };
    }

    /** 同上，返回 nut-js 的 Region，方便直接交给截图 */
    public async getClientRegion(): Promise<Region> {
        const rect = await this.getClientRect();
        return new Region(rect.left, rect.top, rect.width, rect.height);
    }

    /**
     * 获取 TFT 窗口当前的显示模式
     * @description 窗口化有标题栏和边框，客户区相对窗口有偏移；
     *              无边框 / 独占全屏没有标题栏，客户区就是整个窗口，偏移为 (0, 0)
     * @throws 找不到窗口或窗口最小化时抛出错误
     */
    public async getWindowMode(): Promise<TftWindowMode> {
        const window = await this.findWindow();
        const windowRegion = await this.readWindowRegion(window);
        const metrics = await this.getClientMetrics(windowRegion.width, windowRegion.height);
        return {
            windowed: this.isWindowed(metrics),
            clientWidth: metrics.clientWidth,
            clientHeight: metrics.clientHeight,
        };
    }

    /**
     * 云顶之弈独立客户端是否已打开（窗口存在即可，最小化也算打开）
     * @description 主页按钮轮询用：找到过窗口后只读一次标题，开销很小
     */
    public async isWindowOpen(): Promise<boolean> {
        try {
            await this.findWindow();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 确保 TFT 是前台窗口
     * @description 截屏幕像素、模拟鼠标点击都要求 TFT 在最前面，否则会截到/点到挡在上面的窗口
     */
    public async ensureForeground(): Promise<void> {
        const window = await this.findWindow();
        const activeTitle = await getActiveWindow().then(w => w.title).catch(() => '');
        if (activeTitle.trim() !== TFT_WINDOW_TITLE) {
            await window.focus();
            await sleep(FOCUS_SETTLE_MS);
        }
    }

    /**
     * 把客户区调整为挂机用的固定尺寸，并记住原来的窗口大小
     * @description 多次调用只会记录第一次的原始尺寸，避免把"已经调整过的尺寸"当成用户原值
     * @throws 找不到窗口、窗口最小化、全屏模式或调整后尺寸不对时抛出错误
     */
    public async applyTargetClientSize(): Promise<void> {
        const { width, height } = TFT_TARGET_CLIENT_SIZE;
        const window = await this.findWindow();
        const windowRegion = await this.readWindowRegion(window);
        const metrics = await this.getClientMetrics(windowRegion.width, windowRegion.height);

        // 全屏 / 无边框全屏时没有标题栏和边框，外部调整大小会和游戏自己的全屏逻辑打架
        if (!this.isWindowed(metrics)) {
            throw new Error('云顶之弈当前是全屏模式，请在游戏设置里切换为"窗口化"后再开始挂机');
        }

        if (metrics.clientWidth === width && metrics.clientHeight === height) {
            logger.info(`[TftWindowLocator] 游戏画面已经是 ${width}x${height}，无需调整`);
            return;
        }

        if (!this.savedWindowSize) {
            this.savedWindowSize = { width: windowRegion.width, height: windowRegion.height };
        }

        // 窗口外框 = 目标客户区 + 标题栏和边框（边框厚度从当前窗口算出来）
        const frameWidth = metrics.windowWidth - metrics.clientWidth;
        const frameHeight = metrics.windowHeight - metrics.clientHeight;
        await window.resize(new Size(width + frameWidth, height + frameHeight));
        await sleep(RESIZE_SETTLE_MS);

        // 调整后重新查询，确认客户区真的变成了目标尺寸
        this.cachedMetrics = null;
        const actual = await this.getClientRect();
        if (actual.width !== width || actual.height !== height) {
            throw new Error(`调整游戏窗口失败：期望 ${width}x${height}，实际 ${actual.width}x${actual.height}`);
        }
        logger.info(`[TftWindowLocator] 游戏画面已调整为 ${width}x${height}（原窗口 ${this.savedWindowSize.width}x${this.savedWindowSize.height}）`);
    }

    /**
     * 把窗口还原成挂机开始前的大小
     * @description 没有调整过窗口时什么都不做；窗口已关闭时只清掉记录
     */
    public async restoreWindowSize(): Promise<void> {
        const saved = this.savedWindowSize;
        if (!saved) return;
        this.savedWindowSize = null;

        try {
            const window = await this.findWindow();
            await window.resize(new Size(saved.width, saved.height));
            this.cachedMetrics = null;
            logger.info(`[TftWindowLocator] 游戏窗口已还原为 ${saved.width}x${saved.height}`);
        } catch (e: any) {
            logger.warn(`[TftWindowLocator] 还原游戏窗口大小失败: ${e.message}`);
        }
    }

    /**
     * 获取 TFT 窗口对象
     * @description 优先用缓存；缓存的窗口标题不再是 TFT（被关闭或句柄被复用）时重新查找。
     *              同名窗口有多个时取面积最大的那个。
     */
    private async findWindow(): Promise<NutWindow> {
        if (this.cachedWindow) {
            const title = await this.cachedWindow.title.catch(() => '');
            if (title.trim() === TFT_WINDOW_TITLE) {
                return this.cachedWindow;
            }
            this.cachedWindow = null;
            this.cachedMetrics = null;
        }

        let best: { window: NutWindow; area: number } | null = null;
        for (const window of await getWindows()) {
            try {
                const title = await window.title;
                if (title?.trim() !== TFT_WINDOW_TITLE) continue;

                const region = await window.region;
                const area = region.width * region.height;
                if (!best || area > best.area) {
                    best = { window, area };
                }
            } catch {
                // 某些窗口在遍历过程中被关闭，读取标题/区域会失败，跳过即可
            }
        }

        if (!best) {
            throw new Error('未找到 TFT 窗口，请确认云顶之弈客户端已启动');
        }
        this.cachedWindow = best.window;
        return best.window;
    }

    /** 有标题栏（客户区相对窗口有偏移）就是窗口化 */
    private isWindowed(metrics: ClientMetrics): boolean {
        return metrics.offsetX !== 0 || metrics.offsetY !== 0;
    }

    /**
     * 读取窗口矩形，窗口最小化时抛出错误
     * @description 不能用 window.region：nut-js 会把矩形裁到屏幕范围内。窗口贴着屏幕边缘时（窗口化的窗口
     *              四周有 8px 左右的不可见边框，很容易超出屏幕），左上角和尺寸都会偏，
     *              导致截图、点击整体错位，客户区缓存也会一直失效。这里直接读未裁剪的原始矩形
     */
    private async readWindowRegion(window: NutWindow): Promise<Region> {
        const { windowHandle } = window as unknown as { windowHandle: number };
        const region = await providerRegistry.getWindow().getWindowRegion(windowHandle);
        if (region.left <= MINIMIZED_COORD || region.width <= 0 || region.height <= 0) {
            throw new Error('TFT 窗口已最小化，请先还原窗口');
        }
        return region;
    }

    /**
     * 获取客户区度量信息
     * @description 客户区偏移只和窗口尺寸有关，尺寸没变就直接用缓存，否则用 PowerShell 重新查询
     */
    private async getClientMetrics(windowWidth: number, windowHeight: number): Promise<ClientMetrics> {
        const cached = this.cachedMetrics;
        if (cached && cached.windowWidth === windowWidth && cached.windowHeight === windowHeight) {
            return cached.metrics;
        }

        this.pendingMetrics ??= this.queryClientMetrics().finally(() => {
            this.pendingMetrics = null;
        });
        const metrics = await this.pendingMetrics;
        if (metrics.windowWidth !== windowWidth || metrics.windowHeight !== windowHeight) {
            logger.warn(`[TftWindowLocator] 窗口尺寸不一致 (nut-js ${windowWidth}x${windowHeight}, Win32 ${metrics.windowWidth}x${metrics.windowHeight})，可能正在调整窗口大小`);
        }
        // 以查询时读到的窗口尺寸为键：查询期间窗口又变了的话，下次读到新尺寸会重新查
        this.cachedMetrics = { windowWidth, windowHeight, metrics };
        return metrics;
    }

    /**
     * 通过 PowerShell 查询 TFT 窗口的窗口矩形和客户区
     */
    private queryClientMetrics(): Promise<ClientMetrics> {
        return new Promise((resolve, reject) => {
            execFile(
                'powershell.exe',
                ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', METRICS_SCRIPT],
                { windowsHide: true, timeout: METRICS_TIMEOUT_MS },
                (error, stdout) => {
                    if (error) {
                        // execFile 在进程非零退出时，error.code 是退出码；脚本找不到进程时 exit 2
                        const notFound = (error as { code?: unknown }).code === 2;
                        reject(new Error(notFound
                            ? `未找到 ${TFT_PROCESS_NAME} 进程的窗口`
                            : `查询窗口信息失败: ${error.message}`));
                        return;
                    }

                    const values = stdout.trim().split(',').map(Number);
                    if (values.length !== 8 || values.some(v => !Number.isFinite(v))) {
                        reject(new Error(`窗口信息格式异常: ${stdout.trim()}`));
                        return;
                    }

                    const [left, top, right, bottom, clientX, clientY, clientWidth, clientHeight] = values;
                    const metrics: ClientMetrics = {
                        windowWidth: right - left,
                        windowHeight: bottom - top,
                        offsetX: clientX - left,
                        offsetY: clientY - top,
                        clientWidth,
                        clientHeight,
                    };
                    logger.debug(`[TftWindowLocator] 客户区度量: ${JSON.stringify(metrics)}`);
                    resolve(metrics);
                }
            );
        });
    }
}

/** 导出单例实例 */
export const tftWindowLocator = TftWindowLocator.getInstance();
