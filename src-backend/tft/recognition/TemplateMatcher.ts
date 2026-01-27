/**
 * @file 模板匹配器
 * @description 基于 OpenCV 的模板匹配服务，用于识别装备、英雄和星级
 * @author TFT-Hextech-Helper
 */

import cv from "@techstark/opencv-js";
import path from "path";
import fs from "fs-extra";
import sharp from "sharp";
import {logger} from "../../utils/Logger";
import {IdentifiedEquip, EquipCategory, EQUIP_CATEGORY_PRIORITY, LootOrb, LootOrbType} from "../types";
import {TFT_16_EQUIP_DATA} from "../../TFTProtocol";
import {templateLoader} from "./TemplateLoader";

/**
 * 匹配阈值配置
 * @description 不同类型的模板匹配需要不同的阈值
 */
const MATCH_THRESHOLDS = {
    /** 装备匹配阈值 */
    EQUIP: 0.60,
    /** 英雄匹配阈值 */
    CHAMPION: 0.40,
    /** 星级匹配阈值 (星级图标特征明显，阈值设高) */
    STAR_LEVEL: 0.85,
    /** 空槽位标准差阈值 (低于此值判定为空) */
    EMPTY_SLOT_STDDEV: 10,
    /** 战利品球匹配阈值 */
    LOOT_ORB: 0.75,
    /** 按钮匹配阈值 (按钮有明显文字特征，阈值设较高) */
    BUTTON: 0.80,
} as const;

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

    private constructor() {
    }

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
     *              会将输入图像缩放到 24x24 以匹配模板尺寸
     * @param targetMat 目标图像 (需要是 RGB 3 通道)
     * @returns 匹配到的装备信息，未匹配返回 null
     */
    public matchEquip(targetMat: cv.Mat): IdentifiedEquip | null {
        // 模板统一尺寸为 24x24，需要将输入图像也缩放到相同尺寸
        const TEMPLATE_SIZE = 24;
        let resizedMat: cv.Mat | null = null;

        try {
            // 缩放输入图像到 24x24，与模板尺寸一致
            // 使用 INTER_AREA 插值算法，适合缩小图像，能保持更好的细节
            resizedMat = new cv.Mat();
            cv.resize(targetMat, resizedMat, new cv.Size(TEMPLATE_SIZE, TEMPLATE_SIZE), 0, 0, cv.INTER_AREA);

            // 快速空槽位检测（使用缩放后的图像）
            if (this.isEmptySlot(resizedMat)) {
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
                        // 由于已经统一缩放到 24x24，尺寸应该完全匹配
                        // 但为了安全起见，仍然保留检查
                        if (templateMat.rows > resizedMat.rows || templateMat.cols > resizedMat.cols) {
                            continue;
                        }

                        cv.matchTemplate(resizedMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
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
            } finally {
                mask.delete();
                resultMat.delete();
            }
        } catch (e) {
            logger.error(`[TemplateMatcher] 装备匹配出错: ${e}`);
            return null;
        } finally {
            // 释放缩放后的图像内存
            if (resizedMat && !resizedMat.isDeleted()) {
                resizedMat.delete();
            }
        }
    }

    /**
     * 匹配英雄模板
     * @description 用于商店和备战席的棋子名称识别
     * @param targetMat 目标图像 (需要是 Gray 单通道)
     * @returns 匹配到的英雄名称，空槽位返回 "empty"，未匹配返回 null
     */
    public matchChampion(targetMat: cv.Mat): string | null {
        // 快速空槽位检测
        if (this.isEmptySlot(targetMat)) {
            return "empty";
        }

        const championTemplates = templateLoader.getChampionTemplates();
        if (championTemplates.size === 0) {
            logger.warn("[TemplateMatcher] 英雄模板为空，跳过匹配");
            return null;
        }

        const mask = new cv.Mat();
        const resultMat = new cv.Mat();

        try {
            let bestMatchName: string | null = null;
            let maxConfidence = 0;

            for (const [name, templateMat] of championTemplates) {
                // 尺寸检查
                if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) {
                    logger.debug(`[TemplateMatcher] 模板尺寸过大: ${name} (${templateMat.cols}x${templateMat.rows}) > 目标 (${targetMat.cols}x${targetMat.rows})`);
                    continue;
                }

                // 通道检查 (防止崩溃)
                if (templateMat.type() !== targetMat.type()) {
                    logger.warn(`[TemplateMatcher] 通道类型不匹配: ${name} (${templateMat.type()}) vs 目标 (${targetMat.type()})`);
                    continue;
                }

                cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
                const result = cv.minMaxLoc(resultMat, mask);

                if (result.maxVal >= MATCH_THRESHOLDS.CHAMPION && result.maxVal > maxConfidence) {
                    maxConfidence = result.maxVal;
                    bestMatchName = name;
                }
            }

            if (bestMatchName) {
                logger.info(
                    `[TemplateMatcher] 英雄模板匹配成功: ${bestMatchName} (相似度 ${(maxConfidence * 100).toFixed(1)}%)`
                );
            } else {
                // 记录最高分但未达标的情况，方便调试
                if (maxConfidence > 0.3) {
                    logger.debug(`[TemplateMatcher] 英雄匹配失败，最高分: ${(maxConfidence * 100).toFixed(1)}%`);
                }
            }

            return bestMatchName;
        } catch (e) {
            logger.error(`[TemplateMatcher] 英雄匹配出错: ${e}`);
            return null;
        } finally {
            mask.delete();
            resultMat.delete();
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
                logger.debug(
                    `[TemplateMatcher] 星级识别成功: ${bestMatchLevel}星 (相似度: ${(maxConfidence * 100).toFixed(1)}%)`
                );
                return bestMatchLevel;
            }

            // 调试日志
            if (maxConfidence > 0.5) {
                logger.warn(
                    `[TemplateMatcher] 星级识别未达标 (最高相似度: ${(maxConfidence * 100).toFixed(1)}%)`,
                    true  // 仅详细模式下显示
                );
            }

            // 【已注释】星级识别失败时保存图片到本地，用于排查问题
            // TODO: 我擦，这里居然星级的RGB没反转
            // this.saveFailedStarLevelImage(targetMat);

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

    /**
     * 多目标匹配战利品球
     * @description 在目标图像中查找所有战利品球，支持多种类型 (normal/blue/gold)
     *              使用非极大值抑制 (NMS) 避免重复检测
     * @param targetMat 目标图像 (需要是 RGB 3 通道)
     * @returns 检测到的战利品球数组
     */
    public matchLootOrbs(targetMat: cv.Mat): LootOrb[] {
        const lootOrbTemplates = templateLoader.getLootOrbTemplates();
        if (lootOrbTemplates.size === 0) {
            logger.warn("[TemplateMatcher] 战利品球模板为空，跳过匹配");
            return [];
        }

        const results: LootOrb[] = [];
        const mask = new cv.Mat();
        const resultMat = new cv.Mat();

        try {
            // 遍历每种类型的模板
            for (const [orbType, templateMat] of lootOrbTemplates) {
                // 尺寸检查
                if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) {
                    logger.debug(`[TemplateMatcher] 战利品模板尺寸过大: ${orbType}`);
                    continue;
                }

                // 通道检查
                if (templateMat.type() !== targetMat.type()) {
                    logger.warn(
                        `[TemplateMatcher] 战利品模板通道不匹配: ${orbType} ` +
                        `(模板: ${templateMat.type()}, 目标: ${targetMat.type()})`
                    );
                    continue;
                }

                // 执行模板匹配
                cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);

                // 多目标检测：循环查找所有超过阈值的匹配点
                const templateWidth = templateMat.cols;
                const templateHeight = templateMat.rows;

                // 使用循环查找所有匹配点
                while (true) {
                    const minMax = cv.minMaxLoc(resultMat, mask);
                    
                    if (minMax.maxVal < MATCH_THRESHOLDS.LOOT_ORB) {
                        break; // 没有更多匹配点了
                    }

                    const matchX = minMax.maxLoc.x;
                    const matchY = minMax.maxLoc.y;

                    // 计算球心坐标 (模板左上角 + 模板尺寸的一半)
                    const centerX = matchX + Math.floor(templateWidth / 2);
                    const centerY = matchY + Math.floor(templateHeight / 2);

                    results.push({
                        x: centerX,
                        y: centerY,
                        type: orbType,
                        confidence: minMax.maxVal,
                    });

                    // 抑制当前匹配区域，避免重复检测
                    // 将匹配点周围区域的值设为 -1 (低于任何阈值)
                    cv.rectangle(
                        resultMat,
                        new cv.Point(
                            Math.max(0, matchX - templateWidth / 2),
                            Math.max(0, matchY - templateHeight / 2)
                        ),
                        new cv.Point(
                            Math.min(resultMat.cols - 1, matchX + templateWidth / 2),
                            Math.min(resultMat.rows - 1, matchY + templateHeight / 2)
                        ),
                        new cv.Scalar(-1),
                        -1 // 填充矩形
                    );
                }
            }

            // 对结果进行非极大值抑制 (NMS)，去除重叠的检测框
            const nmsResults = this.applyNMS(results, 10); // 10 像素的距离阈值

            logger.info(`[TemplateMatcher] 战利品球检测完成，共 ${nmsResults.length} 个`);
            return nmsResults;
        } catch (e) {
            logger.error(`[TemplateMatcher] 战利品球匹配出错: ${e}`);
            return [];
        } finally {
            mask.delete();
            resultMat.delete();
        }
    }

    /**
     * 匹配按钮模板
     * @description 在目标图像中查找指定按钮，返回是否匹配成功及置信度
     * @param targetMat 目标图像 (需要是 RGB 3 通道)
     * @param buttonName 按钮名称，例如 "clockwork_quit_button"
     * @returns 匹配结果对象，包含 matched (是否匹配) 和 confidence (置信度)
     */
    public matchButton(targetMat: cv.Mat, buttonName: string): { matched: boolean; confidence: number } {
        const templateMat = templateLoader.getButtonTemplate(buttonName);
        
        if (!templateMat) {
            logger.warn(`[TemplateMatcher] 未找到按钮模板: ${buttonName}`);
            return { matched: false, confidence: 0 };
        }

        // 尺寸检查：模板不能大于目标图像
        if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) {
            logger.warn(
                `[TemplateMatcher] 按钮模板尺寸过大: ${buttonName} ` +
                `(模板: ${templateMat.cols}x${templateMat.rows}, 目标: ${targetMat.cols}x${targetMat.rows})`
            );
            return { matched: false, confidence: 0 };
        }

        // 通道检查
        if (templateMat.type() !== targetMat.type()) {
            logger.warn(
                `[TemplateMatcher] 按钮模板通道不匹配: ${buttonName} ` +
                `(模板: ${templateMat.type()}, 目标: ${targetMat.type()})`
            );
            return { matched: false, confidence: 0 };
        }

        const mask = new cv.Mat();
        const resultMat = new cv.Mat();

        try {
            // 执行模板匹配 (使用归一化相关系数匹配法)
            cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);

            // 获取最大匹配值
            const minMax = cv.minMaxLoc(resultMat, mask);
            const confidence = minMax.maxVal;

            const matched = confidence >= MATCH_THRESHOLDS.BUTTON;

            if (matched) {
                logger.info(
                    `[TemplateMatcher] 按钮匹配成功: ${buttonName} ` +
                    `(置信度: ${(confidence * 100).toFixed(1)}%)`
                );
            } else {
                logger.debug(
                    `[TemplateMatcher] 按钮匹配失败: ${buttonName} ` +
                    `(置信度: ${(confidence * 100).toFixed(1)}%, 阈值: ${MATCH_THRESHOLDS.BUTTON * 100}%)`
                );
            }

            return { matched, confidence };
        } catch (e) {
            logger.error(`[TemplateMatcher] 按钮匹配出错: ${e}`);
            return { matched: false, confidence: 0 };
        } finally {
            mask.delete();
            resultMat.delete();
        }
    }

    /**
     * 非极大值抑制 (NMS)
     * @description 去除距离过近的重复检测结果，保留置信度最高的
     * @param orbs 检测到的战利品球数组
     * @param distanceThreshold 距离阈值 (像素)
     * @returns 去重后的战利品球数组
     */
    private applyNMS(orbs: LootOrb[], distanceThreshold: number): LootOrb[] {
        if (orbs.length === 0) return [];

        // 按置信度降序排序
        const sorted = [...orbs].sort((a, b) => b.confidence - a.confidence);
        const kept: LootOrb[] = [];

        for (const orb of sorted) {
            // 检查是否与已保留的球距离过近
            const isTooClose = kept.some((keptOrb) => {
                const dx = orb.x - keptOrb.x;
                const dy = orb.y - keptOrb.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < distanceThreshold;
            });

            if (!isTooClose) {
                kept.push(orb);
            }
        }

        return kept;
    }
}

/** TemplateMatcher 单例导出 */
export const templateMatcher = TemplateMatcher.getInstance();
