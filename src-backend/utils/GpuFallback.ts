/**
 * GPU 兼容性自动降级
 * @module GpuFallback
 * @description 默认开启 GPU 渲染；如果启动阶段 GPU 进程崩溃，就记录到本地文件，下次启动自动关闭 GPU。
 *
 * 部分用户的显卡驱动不兼容，GPU 进程一启动就崩溃，Chromium 重试几次后会直接结束主进程
 * （"GPU process isn't usable. Goodbye."），表现为启动闪退，这时已经没有机会再执行任何代码。
 * 实测在这之前的几次崩溃都会触发 child-process-gone（导致主进程结束的最后那次没有事件），
 * 所以在第一次崩溃时就同步写盘。第一次崩溃就直接结束主进程、或主进程自身崩溃的情况记录不到。
 */

import * as fs from 'fs';
import * as path from 'path';
import { app, type Details } from 'electron';
import { writeCrashLog } from './CrashLogger.ts';

const STATE_FILE_NAME = 'gpu-fallback.json';

/** 主窗口加载完成后再观察这么久，期间没有崩溃就认为启动成功，之后的崩溃 Chromium 会自行恢复，不再记录 */
const STARTUP_GRACE_MS = 15_000;

/** 算作"GPU 崩溃"的原因；killed（被外部结束）和 clean-exit（正常退出）不算 */
const CRASH_REASONS: ReadonlySet<Details['reason']> = new Set<Details['reason']>([
    'crashed',
    'abnormal-exit',
    'launch-failed',
    'integrity-failure',
]);

interface GpuFallbackState {
    /** 崩溃时的 Electron 版本；升级 Electron 后会重新尝试开启 GPU */
    electronVersion: string;
    reason: string;
    exitCode: number;
    crashedAt: string;
}

class GpuFallback {
    private static instance: GpuFallback | null = null;

    /** 本次启动是否因为之前的崩溃而关闭了 GPU */
    private disabledState: GpuFallbackState | null = null;

    /** 是否仍处于启动阶段 */
    private watching = false;

    private constructor() {}

    public static getInstance(): GpuFallback {
        if (!GpuFallback.instance) {
            GpuFallback.instance = new GpuFallback();
        }
        return GpuFallback.instance;
    }

    /**
     * 应用 GPU 设置并开始监听启动阶段的 GPU 崩溃
     * @description 必须在 app ready 之前调用
     */
    public init(): void {
        this.disabledState = this.readState();

        if (this.disabledState) {
            app.disableHardwareAcceleration();
            app.commandLine.appendSwitch('disable-gpu');
            app.commandLine.appendSwitch('disable-software-rasterizer');
            console.warn(`⚠️ [GpuFallback] 之前启动时 GPU 崩溃过，本次已自动关闭 GPU 渲染`);
            // 已经关闭了，没有更低的配置可退，不需要再监听
            return;
        }

        this.watching = true;
        app.on('child-process-gone', (_event, details) => this.handleProcessGone(details));
        // 退出过程中 GPU 进程的异常退出不算启动崩溃
        app.on('before-quit', () => {
            this.watching = false;
        });
    }

    /** 主窗口加载完成后调用，观察一段时间没有崩溃就结束监听 */
    public markWindowLoaded(): void {
        if (!this.watching) return;
        setTimeout(() => {
            this.watching = false;
        }, STARTUP_GRACE_MS);
    }

    /**
     * 本次启动关闭了 GPU 时，返回给用户看的说明；没有关闭则返回 null
     */
    public getNotice(): string | null {
        if (!this.disabledState) return null;
        const { reason, exitCode, crashedAt } = this.disabledState;
        return `之前启动时 GPU 崩溃过（${new Date(crashedAt).toLocaleString('zh-CN')}，${reason}，退出码 ${exitCode}），`
            + `已自动关闭 GPU 渲染。更新显卡驱动后如需重新开启，请删除 ${this.getStatePath()} 再重启软件`;
    }

    private handleProcessGone(details: Details): void {
        if (!this.watching || details.type !== 'GPU' || !CRASH_REASONS.has(details.reason)) return;
        // 崩溃会连续触发多次，只需要记录第一次
        this.watching = false;

        const state: GpuFallbackState = {
            electronVersion: process.versions.electron,
            reason: details.reason,
            exitCode: details.exitCode,
            crashedAt: new Date().toISOString(),
        };
        try {
            // 必须同步写：主进程随时可能被 Chromium 直接结束
            const file = this.getStatePath();
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8');
            console.error(`❌ [GpuFallback] 启动时 GPU 崩溃（${details.reason}，退出码 ${details.exitCode}），下次启动将自动关闭 GPU 渲染`);
        } catch (error) {
            console.error('❌ [GpuFallback] 记录 GPU 崩溃失败:', error);
        }
        writeCrashLog(
            `GPU 进程退出: ${details.reason}，退出码 ${details.exitCode}`,
            '启动时 GPU 崩溃（下次启动将自动关闭 GPU 渲染）',
        );
    }

    /** 读取崩溃记录；没有记录、文件损坏或 Electron 已升级时返回 null */
    private readState(): GpuFallbackState | null {
        const file = this.getStatePath();
        try {
            if (!fs.existsSync(file)) return null;
            const state = JSON.parse(fs.readFileSync(file, 'utf-8')) as GpuFallbackState;
            if (state.electronVersion === process.versions.electron) return state;

            // Electron（Chromium）升级后 GPU 部分的代码也变了，清掉记录重新尝试；还崩溃的话会再次记录
            console.log(`[GpuFallback] Electron 已从 ${state.electronVersion} 升级到 ${process.versions.electron}，重新尝试开启 GPU 渲染`);
            fs.unlinkSync(file);
            return null;
        } catch (error) {
            console.error('❌ [GpuFallback] 读取 GPU 崩溃记录失败:', error);
            return null;
        }
    }

    private getStatePath(): string {
        return path.join(app.getPath('userData'), STATE_FILE_NAME);
    }
}

export const gpuFallback = GpuFallback.getInstance();
