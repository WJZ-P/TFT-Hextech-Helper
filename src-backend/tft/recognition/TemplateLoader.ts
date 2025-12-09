/**
 * @file 模板加载器
 * @description 负责加载和管理 OpenCV 模板图片，支持热重载
 * @author TFT-Hextech-Helper
 */

import path from "path";
import fs from "fs-extra";
import sharp from "sharp";
import cv from "@techstark/opencv-js";
import { logger } from "../../utils/Logger";
import { EQUIP_CATEGORY_PRIORITY, EquipCategory } from "../types";

/**
 * 形态学膨胀核大小
 * @description 用于英雄名称模板的预处理
 * 膨胀操作让文字笔画"变粗"，容忍 1-2 像素的渲染偏移
 * 核=5 在"容忍偏移"和"保留特征"之间取得平衡，避免单字英雄(慎/烬)糊成一团
 * 注意：此值需要与 TemplateMatcher 中的 DILATE_KERNEL_SIZE 保持一致
 */
const DILATE_KERNEL_SIZE = 5;

/** 支持的图片扩展名 */
const VALID_IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"];

/**
 * 模板加载配置
 */
interface TemplateLoadConfig {
    /** 是否需要 Alpha 通道 */
    ensureAlpha: boolean;
    /** 目标尺寸 (可选，不指定则保持原尺寸) */
    targetSize?: { width: number; height: number };
    /** 是否移除 Alpha 通道 */
    removeAlpha?: boolean;
}

/**
 * 模板加载器
 * @description 单例模式，负责加载和缓存所有类型的模板图片
 * 
 * 支持的模板类型：
 * - 装备模板：分类存储 (散件、成装、神器等)
 * - 英雄模板：用于商店/备战席棋子识别
 * - 星级模板：用于棋子星级识别
 */
export class TemplateLoader {
    private static instance: TemplateLoader;

    /** 装备模板缓存 (按分类存储) */
    private equipTemplates: Map<EquipCategory, Map<string, cv.Mat>> = new Map();

    /** 英雄名称模板缓存 (原始图像) */
    private championTemplates: Map<string, cv.Mat> = new Map();

    /** 英雄名称模板缓存 (膨胀后的灰度图，用于模板匹配) */
    private championDilatedTemplates: Map<string, cv.Mat> = new Map();

    /** 星级模板缓存 */
    private starLevelTemplates: Map<string, cv.Mat> = new Map();

    /** 空装备槽位模板 (24x24 纯黑) */
    private emptyEquipSlotTemplate: cv.Mat | null = null;

    /** 文件监听器防抖定时器 */
    private watcherDebounceTimer: NodeJS.Timeout | null = null;

    /** 模板加载完成标志 */
    private isLoaded = false;

    // ========== 路径 Getter ==========

    private get championTemplatePath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/champion");
    }

    private get equipTemplatePath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/equipment");
    }

    private get starLevelTemplatePath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/starLevel");
    }

    private constructor() {}

    /**
     * 获取 TemplateLoader 单例
     */
    public static getInstance(): TemplateLoader {
        if (!TemplateLoader.instance) {
            TemplateLoader.instance = new TemplateLoader();
        }
        return TemplateLoader.instance;
    }

    /**
     * 初始化模板加载器
     * @description 在 OpenCV 初始化完成后调用，加载所有模板并启动文件监听
     */
    public async initialize(): Promise<void> {
        if (this.isLoaded) {
            logger.warn("[TemplateLoader] 模板已加载，跳过重复初始化");
            return;
        }

        logger.info("[TemplateLoader] 开始初始化模板加载器...");

        // 创建空槽位模板
        this.createEmptySlotTemplate();

        // 并行加载所有模板
        await Promise.all([
            this.loadEquipTemplates(),
            this.loadChampionTemplates(),
            this.loadStarLevelTemplates(),
        ]);

        // 启动文件监听
        this.setupChampionTemplateWatcher();

        this.isLoaded = true;
        logger.info("[TemplateLoader] 模板加载器初始化完成");
    }

    // ========== 公共访问方法 ==========

    /**
     * 获取装备模板
     */
    public getEquipTemplates(): Map<EquipCategory, Map<string, cv.Mat>> {
        return this.equipTemplates;
    }

    /**
     * 获取英雄模板 (原始图像)
     */
    public getChampionTemplates(): Map<string, cv.Mat> {
        return this.championTemplates;
    }

    /**
     * 获取英雄模板 (膨胀后的灰度图)
     * @description 用于模板匹配，预膨胀可以提升匹配性能
     */
    public getChampionDilatedTemplates(): Map<string, cv.Mat> {
        return this.championDilatedTemplates;
    }

    /**
     * 获取星级模板
     */
    public getStarLevelTemplates(): Map<string, cv.Mat> {
        return this.starLevelTemplates;
    }

    /**
     * 获取空装备槽位模板
     */
    public getEmptyEquipSlotTemplate(): cv.Mat | null {
        return this.emptyEquipSlotTemplate;
    }

    /**
     * 检查模板是否已加载
     */
    public isReady(): boolean {
        return this.isLoaded;
    }

    // ========== 私有加载方法 ==========

    /**
     * 创建空槽位模板 (24x24 纯黑)
     */
    private createEmptySlotTemplate(): void {
        const TEMPLATE_SIZE = 24;
        try {
            this.emptyEquipSlotTemplate = new cv.Mat(
                TEMPLATE_SIZE,
                TEMPLATE_SIZE,
                cv.CV_8UC4,
                new cv.Scalar(0, 0, 0, 255)
            );
            logger.info("[TemplateLoader] 空槽位模板创建成功");
        } catch (e) {
            logger.error(`[TemplateLoader] 创建空槽位模板失败: ${e}`);
        }
    }

    /**
     * 加载装备模板
     * @description 按分类加载装备图片，统一缩放到 24x24，移除 Alpha 通道
     */
    private async loadEquipTemplates(): Promise<void> {
        // 清理旧模板
        this.clearEquipTemplates();

        logger.info("[TemplateLoader] 开始加载装备模板...");
        const TEMPLATE_SIZE = 24;

        for (const category of EQUIP_CATEGORY_PRIORITY) {
            const resourcePath = path.join(this.equipTemplatePath, category);
            const categoryMap = new Map<string, cv.Mat>();

            if (!fs.existsSync(resourcePath)) {
                logger.warn(`[TemplateLoader] 装备模板目录不存在: ${resourcePath}`);
                this.equipTemplates.set(category, categoryMap);
                continue;
            }

            const files = fs.readdirSync(resourcePath);

            for (const file of files) {
                const ext = path.extname(file).toLowerCase();
                if (!VALID_IMAGE_EXTENSIONS.includes(ext)) continue;

                const filePath = path.join(resourcePath, file);
                const templateName = path.parse(file).name;

                try {
                    const mat = await this.loadImageAsMat(filePath, {
                        ensureAlpha: false,
                        removeAlpha: true,
                        targetSize: { width: TEMPLATE_SIZE, height: TEMPLATE_SIZE },
                    });

                    if (mat) {
                        categoryMap.set(templateName, mat);
                    }
                } catch (e) {
                    logger.error(`[TemplateLoader] 加载装备模板失败 [${file}]: ${e}`);
                }
            }

            logger.info(`[TemplateLoader] 加载 [${category}] 模板: ${categoryMap.size} 个`);
            this.equipTemplates.set(category, categoryMap);
        }

        logger.info("[TemplateLoader] 装备模板加载完成");
    }

    /**
     * 加载英雄模板
     * @description 用于商店和备战席的棋子名称识别
     * 同时生成膨胀后的灰度图版本，用于模板匹配时提升容错性
     */
    private async loadChampionTemplates(): Promise<void> {
        // 清理旧模板
        this.clearChampionTemplates();

        logger.info("[TemplateLoader] 开始加载英雄模板...");

        if (!fs.existsSync(this.championTemplatePath)) {
            fs.ensureDirSync(this.championTemplatePath);
            logger.info(`[TemplateLoader] 英雄模板目录不存在，已自动创建: ${this.championTemplatePath}`);
            return;
        }

        const files = fs.readdirSync(this.championTemplatePath);

        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (!VALID_IMAGE_EXTENSIONS.includes(ext)) continue;

            const championName = path.parse(file).name;
            const filePath = path.join(this.championTemplatePath, file);

            try {
                const mat = await this.loadImageAsMat(filePath, { ensureAlpha: true });

                if (mat) {
                    // 保存原始模板
                    this.championTemplates.set(championName, mat);

                    // 生成并保存膨胀后的灰度图版本
                    const dilatedMat = this.createDilatedGrayMat(mat);
                    this.championDilatedTemplates.set(championName, dilatedMat);
                }
            } catch (e) {
                logger.error(`[TemplateLoader] 加载英雄模板失败 [${file}]: ${e}`);
            }
        }

        logger.info(`[TemplateLoader] 英雄模板加载完成，共 ${this.championTemplates.size} 个 (含膨胀版本)`);
    }

    /**
     * 创建膨胀后的灰度图
     * @description 将图像转为灰度图后进行形态学膨胀
     * 膨胀让文字笔画"变粗"，容忍像素级偏移，提升模板匹配成功率
     * @param mat 原始图像 (RGBA/RGB/灰度)
     * @returns 膨胀后的灰度图
     */
    private createDilatedGrayMat(mat: cv.Mat): cv.Mat {
        // 1. 转换为灰度图
        let grayMat: cv.Mat;
        if (mat.channels() === 4) {
            grayMat = new cv.Mat();
            cv.cvtColor(mat, grayMat, cv.COLOR_RGBA2GRAY);
        } else if (mat.channels() === 3) {
            grayMat = new cv.Mat();
            cv.cvtColor(mat, grayMat, cv.COLOR_RGB2GRAY);
        } else {
            grayMat = mat.clone();
        }

        // 2. 创建膨胀核 (矩形结构元素)
        const kernel = cv.getStructuringElement(
            cv.MORPH_RECT,
            new cv.Size(DILATE_KERNEL_SIZE, DILATE_KERNEL_SIZE)
        );

        // 3. 执行膨胀
        const dilated = new cv.Mat();
        cv.dilate(grayMat, dilated, kernel);

        // 4. 清理临时对象
        kernel.delete();
        grayMat.delete();

        return dilated;
    }

    /**
     * 加载星级模板
     * @description 用于识别棋子星级 (1-4 星)
     */
    private async loadStarLevelTemplates(): Promise<void> {
        // 清理旧模板
        this.clearStarLevelTemplates();

        logger.info("[TemplateLoader] 开始加载星级模板...");

        if (!fs.existsSync(this.starLevelTemplatePath)) {
            fs.ensureDirSync(this.starLevelTemplatePath);
            logger.info(`[TemplateLoader] 星级模板目录不存在，已自动创建: ${this.starLevelTemplatePath}`);
            return;
        }

        const files = fs.readdirSync(this.starLevelTemplatePath);

        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (!VALID_IMAGE_EXTENSIONS.includes(ext)) continue;

            const starLevel = path.parse(file).name;
            const filePath = path.join(this.starLevelTemplatePath, file);

            try {
                const mat = await this.loadImageAsMat(filePath, { ensureAlpha: true });

                if (mat) {
                    this.starLevelTemplates.set(starLevel, mat);
                }
            } catch (e) {
                logger.error(`[TemplateLoader] 加载星级模板失败 [${file}]: ${e}`);
            }
        }

        logger.info(`[TemplateLoader] 星级模板加载完成，共 ${this.starLevelTemplates.size} 个`);
    }

    // ========== 工具方法 ==========

    /**
     * 加载图片为 OpenCV Mat
     * @param filePath 图片路径
     * @param config 加载配置
     * @returns OpenCV Mat 对象
     */
    private async loadImageAsMat(filePath: string, config: TemplateLoadConfig): Promise<cv.Mat | null> {
        try {
            const fileBuf = fs.readFileSync(filePath);

            let pipeline = sharp(fileBuf);

            // 缩放处理
            if (config.targetSize) {
                pipeline = pipeline.resize(config.targetSize.width, config.targetSize.height, {
                    fit: "fill",
                });
            }

            // Alpha 通道处理
            if (config.removeAlpha) {
                pipeline = pipeline.removeAlpha();
            } else if (config.ensureAlpha) {
                pipeline = pipeline.ensureAlpha();
            }

            const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

            const channels = config.removeAlpha ? 3 : 4;
            const expectedLength = info.width * info.height * channels;

            if (data.length !== expectedLength) {
                logger.warn(`[TemplateLoader] 图片数据长度异常: ${filePath}`);
                return null;
            }

            // 创建 Mat
            const matType = config.removeAlpha ? cv.CV_8UC3 : cv.CV_8UC4;
            const mat = new cv.Mat(info.height, info.width, matType);
            mat.data.set(new Uint8Array(data));

            return mat;
        } catch (e) {
            logger.error(`[TemplateLoader] 加载图片失败 [${filePath}]: ${e}`);
            return null;
        }
    }

    /**
     * 设置英雄模板文件夹监听
     * @description 监听文件变更，自动重新加载模板
     */
    private setupChampionTemplateWatcher(): void {
        if (!fs.existsSync(this.championTemplatePath)) {
            fs.ensureDirSync(this.championTemplatePath);
        }

        fs.watch(this.championTemplatePath, (event, filename) => {
            // 防抖处理
            if (this.watcherDebounceTimer) {
                clearTimeout(this.watcherDebounceTimer);
            }

            this.watcherDebounceTimer = setTimeout(() => {
                logger.info(`[TemplateLoader] 检测到英雄模板变更 (${event}: ${filename})，重新加载...`);
                this.loadChampionTemplates();
            }, 500);
        });

        logger.info("[TemplateLoader] 英雄模板文件监听已启动");
    }

    // ========== 清理方法 ==========

    /**
     * 清理装备模板缓存
     */
    private clearEquipTemplates(): void {
        for (const categoryMap of this.equipTemplates.values()) {
            for (const mat of categoryMap.values()) {
                if (mat && !mat.isDeleted()) {
                    mat.delete();
                }
            }
        }
        this.equipTemplates.clear();
    }

    /**
     * 清理英雄模板缓存 (包括原始和膨胀版本)
     */
    private clearChampionTemplates(): void {
        // 清理原始模板
        for (const mat of this.championTemplates.values()) {
            if (mat && !mat.isDeleted()) {
                mat.delete();
            }
        }
        this.championTemplates.clear();

        // 清理膨胀版本
        for (const mat of this.championDilatedTemplates.values()) {
            if (mat && !mat.isDeleted()) {
                mat.delete();
            }
        }
        this.championDilatedTemplates.clear();
    }

    /**
     * 清理星级模板缓存
     */
    private clearStarLevelTemplates(): void {
        for (const mat of this.starLevelTemplates.values()) {
            if (mat && !mat.isDeleted()) {
                mat.delete();
            }
        }
        this.starLevelTemplates.clear();
    }

    /**
     * 销毁所有资源
     */
    public destroy(): void {
        this.clearEquipTemplates();
        this.clearChampionTemplates();
        this.clearStarLevelTemplates();

        if (this.emptyEquipSlotTemplate && !this.emptyEquipSlotTemplate.isDeleted()) {
            this.emptyEquipSlotTemplate.delete();
            this.emptyEquipSlotTemplate = null;
        }

        if (this.watcherDebounceTimer) {
            clearTimeout(this.watcherDebounceTimer);
        }

        this.isLoaded = false;
        logger.info("[TemplateLoader] 模板加载器资源已释放");
    }
}

/** TemplateLoader 单例导出 */
export const templateLoader = TemplateLoader.getInstance();
