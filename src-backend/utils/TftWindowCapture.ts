/**
 * @file TFT 窗口截图（调试工具）
 * @description 截取 TFT 虚幻客户端的游戏画面（客户区）并保存为 PNG，用于采集识别模板。
 *
 *              和挂机识别用的是同一套方案：由 TftWindowLocator 给出游戏画面当前在屏幕上的位置，
 *              再用 nut-js 截取这块屏幕。窗口被拖动后也能截对；截的是屏幕像素，
 *              所以截图前会先把 TFT 切到前台，避免截到挡在上面的窗口。
 */

import path from "path";
import fs from "fs-extra";
import { logger } from "./Logger";
import { tftWindowLocator } from "./TftWindowLocator";
import { screenCapture } from "../tft/recognition/ScreenCapture";

/** 截图结果 */
export interface TftWindowCaptureResult {
    /** 保存的 PNG 文件路径 */
    filePath: string;
    /** 截图宽高（游戏客户区） */
    width: number;
    height: number;
    /** 本次截图耗时 (ms) */
    elapsedMs: number;
}

/**
 * TFT 窗口截图器
 * @description 单例，防止快捷键连按导致的并发截图
 */
class TftWindowCapture {
    private static instance: TftWindowCapture | null = null;

    /** 是否有截图正在进行（按住快捷键会连续触发，需要挡掉） */
    private isCapturing = false;

    private constructor() {}

    public static getInstance(): TftWindowCapture {
        if (!TftWindowCapture.instance) {
            TftWindowCapture.instance = new TftWindowCapture();
        }
        return TftWindowCapture.instance;
    }

    /**
     * 截取 TFT 游戏画面并保存为 PNG
     * @param saveDir 保存目录（不存在会自动创建）
     * @returns 截图结果
     * @throws 找不到窗口、窗口最小化、截图失败或上一张还没截完时抛出错误
     */
    public async capture(saveDir: string): Promise<TftWindowCaptureResult> {
        if (this.isCapturing) {
            throw new Error('上一张截图还在处理中');
        }
        this.isCapturing = true;
        const startTime = Date.now();

        try {
            await tftWindowLocator.ensureForeground();
            const region = await tftWindowLocator.getClientRegion();
            const png = await screenCapture.captureRegionAsPng(region, false);

            fs.ensureDirSync(saveDir);
            const filePath = path.join(saveDir, `tft_${this.formatTimestamp(new Date())}.png`);
            fs.writeFileSync(filePath, png);

            const elapsedMs = Date.now() - startTime;
            logger.info(`[TftWindowCapture] 已保存 TFT 窗口截图 ${region.width}x${region.height} (${elapsedMs}ms): ${filePath}`);

            return { filePath, width: region.width, height: region.height, elapsedMs };
        } finally {
            this.isCapturing = false;
        }
    }

    /** 生成文件名用的时间戳，如 20261121_203015_123 */
    private formatTimestamp(date: Date): string {
        const pad = (n: number, len = 2) => String(n).padStart(len, '0');
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
            + `_${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
            + `_${pad(date.getMilliseconds(), 3)}`;
    }
}

/** 导出单例实例 */
export const tftWindowCapture = TftWindowCapture.getInstance();
