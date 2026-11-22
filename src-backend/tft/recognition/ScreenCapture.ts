/**
 * @file 截图服务
 * @description 封装屏幕截图和图像预处理功能
 * @author TFT-Hextech-Helper
 */

import { Region, screen as nutScreen } from "@nut-tree-fork/nut-js";
import sharp from "sharp";
import cv from "@techstark/opencv-js";
import { logger } from "../../utils/Logger";
import { SimpleRegion } from "../types";
import { SimplePoint } from "../../TFTProtocol";

/**
 * OCR 预处理选项
 * @description 不传时使用默认流程：亮度灰度 + 阈值 160
 */
export interface OcrPreprocessOptions {
    /**
     * 灰度方式
     * - luminance：普通亮度灰度（默认）
     * - minChannel：取 RGB 三个通道的最小值。白色文字保持亮，彩色图标 / 背景会变暗，
     *   用于去掉紧挨着数字的彩色图标（如 S18 金币数字左边的金币图标，会被识别成 "7"）
     */
    grayscale?: 'luminance' | 'minChannel';
    /** 二值化阈值，默认 160；文字较暗时（如 S18 的经验值 "4/20"）需要调低 */
    threshold?: number;
}

/** 默认二值化阈值 */
const DEFAULT_OCR_THRESHOLD = 160;

/**
 * 截图服务
 * @description 单例模式，提供屏幕截图和图像处理功能
 * 
 * 功能：
 * - 区域截图并转换为 PNG Buffer
 * - 针对 OCR 的图像预处理 (放大、灰度、二值化)
 * - 截图转换为 OpenCV Mat
 * - 游戏坐标到屏幕坐标的转换
 */
export class ScreenCapture {
    private static instance: ScreenCapture;

    /** 游戏窗口基准点 (左上角坐标) */
    private gameWindowOrigin: SimplePoint | null = null;

    private constructor() {}

    /**
     * 获取 ScreenCapture 单例
     */
    public static getInstance(): ScreenCapture {
        if (!ScreenCapture.instance) {
            ScreenCapture.instance = new ScreenCapture();
        }
        return ScreenCapture.instance;
    }

    /**
     * 设置游戏窗口基准点
     * @param origin 游戏窗口左上角坐标
     */
    public setGameWindowOrigin(origin: SimplePoint): void {
        this.gameWindowOrigin = origin;
    }

    /**
     * 获取游戏窗口基准点
     */
    public getGameWindowOrigin(): SimplePoint | null {
        return this.gameWindowOrigin;
    }

    /**
     * 检查是否已初始化
     */
    public isInitialized(): boolean {
        return this.gameWindowOrigin !== null;
    }

    // ========== 坐标转换 ==========

    /**
     * 将游戏内相对区域转换为屏幕绝对区域
     * @param simpleRegion 游戏内相对区域定义
     * @returns nut-js Region 对象
     * @throws 如果未初始化游戏窗口基准点
     */
    public toAbsoluteRegion(simpleRegion: SimpleRegion): Region {
        if (!this.gameWindowOrigin) {
            throw new Error("[ScreenCapture] 尚未设置游戏窗口基准点");
        }

        return new Region(
            this.gameWindowOrigin.x + simpleRegion.leftTop.x,
            this.gameWindowOrigin.y + simpleRegion.leftTop.y,
            simpleRegion.rightBottom.x - simpleRegion.leftTop.x,
            simpleRegion.rightBottom.y - simpleRegion.leftTop.y
        );
    }

    // ========== 截图方法 ==========

    /**
     * 截取指定区域并输出为 PNG Buffer
     * @param region nut-js Region 对象 (屏幕绝对坐标)
     * @param forOCR 是否针对 OCR 进行预处理
     * @param ocrOptions OCR 预处理选项（仅 forOCR=true 时生效），不传时与原流程一致
     * @returns PNG 格式的 Buffer
     */
    public async captureRegionAsPng(region: Region, forOCR: boolean = true, ocrOptions: OcrPreprocessOptions = {}): Promise<Buffer> {
        const screenshot = await nutScreen.grabRegion(region);

        // nut-js 返回 BGRA，需要先转换为 RGBA，否则颜色会偏/颠倒
        const mat = new cv.Mat(screenshot.height, screenshot.width, cv.CV_8UC4);
        mat.data.set(new Uint8Array(screenshot.data));
        cv.cvtColor(mat, mat, cv.COLOR_BGRA2RGBA);

        // 拷贝一份 RGBA Buffer 供 sharp 使用，避免 mat.delete() 释放内存后被引用
        const rgbaBuffer = Buffer.from(mat.data);

        let pipeline = sharp(rgbaBuffer, {
            raw: {
                width: screenshot.width,
                height: screenshot.height,
                channels: 4, // RGBA
            },
        });

        if (forOCR) {
            // OCR 专用流程：放大 + 灰度 + 二值化 + 锐化
            const threshold = ocrOptions.threshold ?? DEFAULT_OCR_THRESHOLD;

            if (ocrOptions.grayscale === 'minChannel') {
                // 先按 RGB 最小值转成单通道，再走同样的放大和二值化
                const pixelCount = screenshot.width * screenshot.height;
                const minChannel = Buffer.alloc(pixelCount);
                for (let i = 0; i < pixelCount; i++) {
                    const offset = i * 4;
                    minChannel[i] = Math.min(rgbaBuffer[offset], rgbaBuffer[offset + 1], rgbaBuffer[offset + 2]);
                }
                pipeline = sharp(minChannel, {
                    raw: { width: screenshot.width, height: screenshot.height, channels: 1 },
                });
            }

            pipeline = pipeline.resize({
                width: Math.round(screenshot.width * 3),
                height: Math.round(screenshot.height * 3),
                kernel: "lanczos3",
            });
            if (ocrOptions.grayscale !== 'minChannel') {
                pipeline = pipeline.grayscale();
            }
            pipeline = pipeline
                .normalize()
                .threshold(threshold)
                .sharpen();
        }
        // 非 OCR 场景保持原图，不做任何处理

        try {
            return await pipeline.toFormat("png").toBuffer();
        } finally {
            mat.delete();
        }
    }


    /**
     * 截取游戏内相对区域并输出为 PNG Buffer
     * @param simpleRegion 游戏内相对区域定义
     * @param forOCR 是否针对 OCR 进行预处理
     * @param ocrOptions OCR 预处理选项（仅 forOCR=true 时生效）
     * @returns PNG 格式的 Buffer
     */
    public async captureGameRegionAsPng(simpleRegion: SimpleRegion, forOCR: boolean = true, ocrOptions: OcrPreprocessOptions = {}): Promise<Buffer> {
        const absoluteRegion = this.toAbsoluteRegion(simpleRegion);
        return this.captureRegionAsPng(absoluteRegion, forOCR, ocrOptions);
    }

    /**
     * 截取指定区域并转换为 OpenCV Mat
     * @description 用于模板匹配，自动进行 BGRA -> RGB 颜色转换
     * @param region nut-js Region 对象 (屏幕绝对坐标)
     * @returns OpenCV Mat 对象 (RGB 3 通道)
     */
    public async captureRegionAsMat(region: Region): Promise<cv.Mat> {
        const screenshot = await nutScreen.grabRegion(region);

        // 创建 4 通道 Mat
        const mat = new cv.Mat(screenshot.height, screenshot.width, cv.CV_8UC4);
        mat.data.set(new Uint8Array(screenshot.data));

        // BGRA -> RGB 颜色转换 (nut-js 返回的是 BGRA 格式)
        cv.cvtColor(mat, mat, cv.COLOR_BGRA2RGB);

        return mat;
    }

    /**
     * 截取游戏内相对区域并转换为 OpenCV Mat
     * @param simpleRegion 游戏内相对区域定义
     * @returns OpenCV Mat 对象 (RGB 3 通道)
     */
    public async captureGameRegionAsMat(simpleRegion: SimpleRegion): Promise<cv.Mat> {
        const absoluteRegion = this.toAbsoluteRegion(simpleRegion);
        return this.captureRegionAsMat(absoluteRegion);
    }

    // ========== 图像转换工具 ==========

    /**
     * 将 PNG Buffer 转换为 OpenCV Mat (RGBA 4 通道)
     * @param pngBuffer PNG 格式的 Buffer
     * @returns OpenCV Mat 对象 (RGBA 4 通道)
     */
    public async pngBufferToMat(pngBuffer: Buffer): Promise<cv.Mat> {
        const { data, info } = await sharp(pngBuffer)
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const mat = cv.matFromImageData({
            data: new Uint8Array(data),
            width: info.width,
            height: info.height,
        });

        return mat;
    }

    /**
     * 将 OpenCV Mat 转换为 PNG Buffer
     * @param mat OpenCV Mat 对象
     * @param channels 通道数 (3 或 4)
     * @returns PNG 格式的 Buffer
     */
    public async matToPngBuffer(mat: cv.Mat, channels: 3 | 4 = 4): Promise<Buffer> {
        return await sharp(mat.data, {
            raw: {
                width: mat.cols,
                height: mat.rows,
                channels,
            },
        })
            .png()
            .toBuffer();
    }
}

/** ScreenCapture 单例导出 */
export const screenCapture = ScreenCapture.getInstance();
