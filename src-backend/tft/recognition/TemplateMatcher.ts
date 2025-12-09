/**
 * @file 模板匹配器
 * @description 基于 OpenCV 的模板匹配服务，用于识别装备、英雄和星级
 * @author TFT-Hextech-Helper
 */

import cv from "@techstark/opencv-js";
import path from "path";
import fs from "fs-extra";
import sharp from "sharp";
import { logger } from "../../utils/Logger";
import { IdentifiedEquip, EquipCategory, EQUIP_CATEGORY_PRIORITY } from "../types";
import { TFT_16_EQUIP_DATA } from "../../TFTProtocol";
import { templateLoader } from "./TemplateLoader";

/**
 * 匹配阈值配置
 * @description 不同类型的模板匹配需要不同的阈值
 */
const MATCH_THRESHOLDS = {
    /** 装备匹配阈值 */
    EQUIP: 0.75,
    /** 英雄匹配阈值 */
    CHAMPION: 0.70,
    /** 星级匹配阈值 (星级图标特征明显，阈值设高) */
    STAR_LEVEL: 0.85,
    /** 空槽位标准差阈值 (低于此值判定为空) */
    EMPTY_SLOT_STDDEV: 10,
} as const;

/**
 * 形态学膨胀核大小
 * @description 用于英雄名称模板匹配前的预处理
 * 膨胀操作可以让文字笔画"变粗"，从而容忍 1-2 像素的渲染偏移
 * 核=5 在"容忍偏移"和"保留特征"之间取得平衡，避免单字英雄(慎/烬)糊成一团
 */
const DILATE_KERNEL_SIZE = 5;

/**
 * 模板匹配器
 * @description 单例模式，提供各种模板匹配功能
 * 
 * 核心功能：
 * - 装备识别：支持分类优先级匹配
 * - 英雄识别：用于商店/备战席棋子识别
 * - 星级识别：识别棋子星级 (1-4 星)
 * - 空槽位检测：基于标准差的快速判断
 */
export class TemplateMatcher {
    private static instance: TemplateMatcher;

    private constructor() {}

    // ========== 路径 Getter ==========

    /** 星级识别失败图片保存路径 (运行时获取，确保 VITE_PUBLIC 已设置) */
    private get starLevelFailPath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/starLevel");
    }

    /**
     * 获取 TemplateMatcher 单例
     */
    public static getInstance(): TemplateMatcher {
        if (!TemplateMatcher.instance) {
            TemplateMatcher.instance = new TemplateMatcher();
        }
        return TemplateMatcher.instance;
    }

    // ========== 公共匹配方法 ==========

    /**
     * 检测是否为空槽位
     * @description 基于图像标准差快速判断，纯色/纯黑图片标准差接近 0
     * @param targetMat 目标图像
     * @returns 是否为空槽位
     */
    public isEmptySlot(targetMat: cv.Mat): boolean {
        const mean = new cv.Mat();
        const stddev = new cv.Mat();

        try {
            cv.meanStdDev(targetMat, mean, stddev);
            const deviation = stddev.doubleAt(0, 0);
            return deviation < MATCH_THRESHOLDS.EMPTY_SLOT_STDDEV;
        } finally {
            mean.delete();
            stddev.delete();
        }
    }

    /**
     * 匹配装备模板
     * @description 按分类优先级顺序匹配，找到即返回
     * @param targetMat 目标图像 (需要是 RGB 3 通道)
     * @returns 匹配到的装备信息，未匹配返回 null
     */
    public matchEquip(targetMat: cv.Mat): IdentifiedEquip | null {
        // 快速空槽位检测
        if (this.isEmptySlot(targetMat)) {
            return {
                name: "空槽位",
                confidence: 1,
                slot: "",
                category: "empty",
            } as IdentifiedEquip;
        }

        const equipTemplates = templateLoader.getEquipTemplates();
        if (equipTemplates.size === 0) {
            logger.warn("[TemplateMatcher] 装备模板为空，跳过匹配");
            return null;
        }

        const mask = new cv.Mat();
        const resultMat = new cv.Mat();

        try {
            // 按优先级顺序遍历各分类
            for (const category of EQUIP_CATEGORY_PRIORITY) {
                const categoryMap = equipTemplates.get(category);
                if (!categoryMap || categoryMap.size === 0) continue;

                for (const [templateName, templateMat] of categoryMap) {
                    // 尺寸检查：模板必须小于等于目标
                    if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) {
                        continue;
                    }

                    cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
                    const result = cv.minMaxLoc(resultMat, mask);

                    if (result.maxVal >= MATCH_THRESHOLDS.EQUIP) {
                        // 从数据集中查找装备信息
                        const equipData = Object.values(TFT_16_EQUIP_DATA).find(
                            (e) => e.englishName.toLowerCase() === templateName.toLowerCase()
                        );

                        if (equipData) {
                            return {
                                ...equipData,
                                slot: "",
                                confidence: result.maxVal,
                                category,
                            };
                        }
                    }
                }
            }

            return null;
        } catch (e) {
            logger.error(`[TemplateMatcher] 装备匹配出错: ${e}`);
            return null;
        } finally {
            mask.delete();
            resultMat.delete();
        }
    }

    /**
     * 对图像进行形态学膨胀
     * @description 膨胀操作让文字笔画"变粗"，容忍像素级偏移
     * @param mat 输入图像 (会被转换为灰度图处理)
     * @returns 膨胀后的灰度图
     */
    private dilateMat(mat: cv.Mat): cv.Mat {
        // 先转换为灰度图 (如果是多通道)
        let grayMat: cv.Mat;
        if (mat.channels() === 4) {
            grayMat = new cv.Mat();
            cv.cvtColor(mat, grayMat, cv.COLOR_RGBA2GRAY);
        } else if (mat.channels() === 3) {
            grayMat = new cv.Mat();
            cv.cvtColor(mat, grayMat, cv.COLOR_RGB2GRAY);
        } else {
            // 已经是灰度图，克隆一份
            grayMat = mat.clone();
        }

        // 创建膨胀核 (矩形结构元素)
        const kernel = cv.getStructuringElement(
            cv.MORPH_RECT,
            new cv.Size(DILATE_KERNEL_SIZE, DILATE_KERNEL_SIZE)
        );

        // 执行膨胀
        const dilated = new cv.Mat();
        cv.dilate(grayMat, dilated, kernel);

        // 清理
        kernel.delete();
        grayMat.delete();

        return dilated;
    }

    /**
     * 匹配英雄模板
     * @description 用于商店和备战席的棋子名称识别
     * 使用预膨胀的模板进行匹配，解决文字渲染位置偏移导致的匹配失败问题
     * @param targetMat 目标图像 (需要是 RGBA 4 通道)
     * @returns 匹配到的英雄名称，空槽位返回 "empty"，未匹配返回 null
     */
    public matchChampion(targetMat: cv.Mat): string | null {
        // 快速空槽位检测
        if (this.isEmptySlot(targetMat)) {
            return "empty";
        }

        // 获取预膨胀的英雄模板 (在 TemplateLoader 加载时已经膨胀好了)
        const championDilatedTemplates = templateLoader.getChampionDilatedTemplates();
        if (championDilatedTemplates.size === 0) {
            logger.warn("[TemplateMatcher] 英雄模板为空，跳过匹配");
            return null;
        }

        const mask = new cv.Mat();
        const resultMat = new cv.Mat();

        // 只需要对目标图像进行膨胀 (模板已经预膨胀了)
        const dilatedTarget = this.dilateMat(targetMat);

        try {
            let bestMatchName: string | null = null;
            let maxConfidence = 0;

            for (const [name, dilatedTemplate] of championDilatedTemplates) {
                // 尺寸检查
                if (dilatedTemplate.rows > dilatedTarget.rows || dilatedTemplate.cols > dilatedTarget.cols) {
                    continue;
                }

                cv.matchTemplate(dilatedTarget, dilatedTemplate, resultMat, cv.TM_CCOEFF_NORMED, mask);
                const result = cv.minMaxLoc(resultMat, mask);

                // 调试日志
                // logger.debug(`英雄模板名：${name}，相似度：${(result.maxVal * 100).toFixed(3)}%`);

                if (result.maxVal >= MATCH_THRESHOLDS.CHAMPION && result.maxVal > maxConfidence) {
                    maxConfidence = result.maxVal;
                    bestMatchName = name;
                }
            }

            if (bestMatchName) {
                logger.info(
                    `[TemplateMatcher] 英雄模板匹配成功: ${bestMatchName} (相似度 ${(maxConfidence * 100).toFixed(1)}%)`
                );
            }

            return bestMatchName;
        } catch (e) {
            logger.error(`[TemplateMatcher] 英雄匹配出错: ${e}`);
            return null;
        } finally {
            mask.delete();
            resultMat.delete();
            dilatedTarget.delete();
        }
    }

    /**
     * 匹配星级模板
     * @description 识别棋子星级 (1-4 星)
     * @param targetMat 目标图像 (需要是 RGBA 4 通道)
     * @returns 星级 (1-4)，未识别返回 -1
     */
    public matchStarLevel(targetMat: cv.Mat): -1 | 1 | 2 | 3 | 4 {
        const starLevelTemplates = templateLoader.getStarLevelTemplates();
        if (starLevelTemplates.size === 0) {
            logger.warn("[TemplateMatcher] 星级模板为空，跳过匹配");
            return -1;
        }

        const mask = new cv.Mat();
        const resultMat = new cv.Mat();

        try {
            let bestMatchLevel: 1 | 2 | 3 | 4 | null = null;
            let maxConfidence = 0;

            for (const [levelStr, templateMat] of starLevelTemplates) {
                // 尺寸检查
                if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) {
                    continue;
                }

                cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
                const result = cv.minMaxLoc(resultMat, mask);

                if (result.maxVal > maxConfidence) {
                    maxConfidence = result.maxVal;
                    const lvl = parseInt(levelStr);
                    if (!isNaN(lvl) && [1, 2, 3, 4].includes(lvl)) {
                        bestMatchLevel = lvl as 1 | 2 | 3 | 4;
                    }
                }
            }

            if (maxConfidence >= MATCH_THRESHOLDS.STAR_LEVEL && bestMatchLevel !== null) {
                logger.info(
                    `[TemplateMatcher] 星级识别成功: ${bestMatchLevel}星 (相似度: ${(maxConfidence * 100).toFixed(1)}%)`
                );
                return bestMatchLevel;
            }

            // 调试日志
            if (maxConfidence > 0.5) {
                logger.warn(
                    `[TemplateMatcher] 星级识别未达标 (最高相似度: ${(maxConfidence * 100).toFixed(1)}%)`
                );
            }

            // 识别失败时保存图片到本地，方便排查问题
            this.saveFailedStarLevelImage(targetMat);

            return -1;
        } catch (e) {
            logger.error(`[TemplateMatcher] 星级匹配出错: ${e}`);
            return -1;
        } finally {
            mask.delete();
            resultMat.delete();
        }
    }

    /**
     * 保存星级识别失败的图片
     * @description 将识别失败的图片保存到本地，方便排查问题
     * @param mat 目标图像
     */
    private async saveFailedStarLevelImage(mat: cv.Mat): Promise<void> {
        try {
            // 确保目录存在 (使用 getter 在运行时获取路径)
            const savePath = this.starLevelFailPath;
            fs.ensureDirSync(savePath);

            // 生成带时间戳的文件名
            const timestamp = Date.now();
            const filename = `fail_star_${timestamp}.png`;
            const filePath = path.join(savePath, filename);

            // 将 Mat 转换为 PNG 并保存
            // Mat 数据格式：RGBA 或 RGB
            const channels = mat.channels();
            const width = mat.cols;
            const height = mat.rows;

            // 创建 sharp 实例并保存
            await sharp(Buffer.from(mat.data), {
                raw: {
                    width,
                    height,
                    channels: channels as 1 | 2 | 3 | 4,
                },
            })
                .png()
                .toFile(filePath);

            logger.info(`[TemplateMatcher] 星级识别失败图片已保存: ${filePath}`);
        } catch (e) {
            logger.error(`[TemplateMatcher] 保存星级失败图片出错: ${e}`);
        }
    }
}

/** TemplateMatcher 单例导出 */
export const templateMatcher = TemplateMatcher.getInstance();
