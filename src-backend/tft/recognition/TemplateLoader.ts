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
    /** 是否转换为灰度图 */
    grayscale?: boolean;
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

    /** 英雄名称模板缓存 */
    private championTemplates: Map<string, cv.Mat> = new Map();

    /** 星级模板缓存 */
    private starLevelTemplates: Map<string, cv.Mat> = new Map();

    /** 备战席槽位模板缓存 (RGBA 彩色图，用于空槽检测) */
    private benchSlotTemplates: Map<string, cv.Mat> = new Map();

    /** 棋盘槽位模板缓存 (RGBA 彩色图，用于空槽检测) */
    private fightBoardSlotTemplates: Map<string, cv.Mat> = new Map();

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

    private get benchEmptySlotTemplatePath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/benchSlot");
    }

    private get fightBoardSlotTemplatePath(): string {
        return path.join(process.env.VITE_PUBLIC || ".", "resources/assets/images/fightBoardSlot");
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
            this.loadBenchSlotTemplates(),
            this.loadFightBoardSlotTemplates(),
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
     * 获取英雄模板
     */
    public getChampionTemplates(): Map<string, cv.Mat> {
        return this.championTemplates;
    }

    /**
     * 获取星级模板
     */
    public getStarLevelTemplates(): Map<string, cv.Mat> {
        return this.starLevelTemplates;
    }

    /**
     * 获取备战席槽位模板
     * @param slotKey 槽位 key，例如 "SLOT_1"
     * @returns 对应的 RGBA 模板 Mat，未找到返回 null
     */
    public getBenchSlotTemplate(slotKey: string): cv.Mat | null {
        return this.benchSlotTemplates.get(slotKey) || null;
    }

    /**
     * 获取棋盘槽位模板
     * @param slotKey 槽位 key，例如 "R1_C1"
     * @returns 对应的 RGBA 模板 Mat，未找到返回 null
     */
    public getFightBoardSlotTemplate(slotKey: string): cv.Mat | null {
        return this.fightBoardSlotTemplates.get(slotKey) || null;
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
                // 加载为灰度图，以匹配 TftOperator 中转换后的灰度截图
                const mat = await this.loadImageAsMat(filePath, { 
                    ensureAlpha: false,
                    grayscale: true 
                });

                if (mat) {
                    this.championTemplates.set(championName, mat);
                }
            } catch (e) {
                logger.error(`[TemplateLoader] 加载英雄模板失败 [${file}]: ${e}`);
            }
        }

        logger.info(`[TemplateLoader] 英雄模板加载完成，共 ${this.championTemplates.size} 个`);
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

    /**
     * 加载备战席槽位模板
     * @description 用于判断备战席槽位是否有棋子占用
     * 文件命名格式：SLOT_1.png ~ SLOT_9.png，保留 RGBA 彩色信息
     */
    private async loadBenchSlotTemplates(): Promise<void> {
        // 清理旧模板
        this.clearBenchSlotTemplates();

        logger.info("[TemplateLoader] 开始加载备战席槽位模板...");

        if (!fs.existsSync(this.benchEmptySlotTemplatePath)) {
            fs.ensureDirSync(this.benchEmptySlotTemplatePath);
            logger.info(`[TemplateLoader] 备战席槽位模板目录不存在，已自动创建: ${this.benchEmptySlotTemplatePath}`);
            return;
        }

        // 备战席共 9 个槽位：SLOT_1 ~ SLOT_9
        for (let i = 1; i <= 9; i++) {
            const slotKey = `SLOT_${i}`;
            const filePath = path.join(this.benchEmptySlotTemplatePath, `${slotKey}.png`);

            if (!fs.existsSync(filePath)) {
                logger.warn(`[TemplateLoader] 未找到槽位模板: ${slotKey}.png`);
                continue;
            }

            try {
                // 保留 RGBA 彩色信息，空槽检测需要颜色差异来区分有无棋子
                const mat = await this.loadImageAsMat(filePath, {
                    ensureAlpha: true,
                    grayscale: false,
                });

                if (mat) {
                    this.benchSlotTemplates.set(slotKey, mat);
                }
            } catch (e) {
                logger.error(`[TemplateLoader] 加载备战席槽位模板失败 [${slotKey}]: ${e}`);
            }
        }

        logger.info(`[TemplateLoader] 备战席槽位模板加载完成，共 ${this.benchSlotTemplates.size} 个`);
    }

    /**
     * 加载棋盘槽位模板
     * @description 棋盘共 4 行 7 列，共 28 个槽位 (R1_C1 ~ R4_C7)
     */
    private async loadFightBoardSlotTemplates(): Promise<void> {
        // 清理旧模板
        this.clearFightBoardSlotTemplates();

        logger.info("[TemplateLoader] 开始加载棋盘槽位模板...");

        if (!fs.existsSync(this.fightBoardSlotTemplatePath)) {
            fs.ensureDirSync(this.fightBoardSlotTemplatePath);
            logger.info(`[TemplateLoader] 棋盘槽位模板目录不存在，已自动创建: ${this.fightBoardSlotTemplatePath}`);
            return;
        }

        // 棋盘共 4 行 7 列：R1_C1 ~ R4_C7
        for (let row = 1; row <= 4; row++) {
            for (let col = 1; col <= 7; col++) {
                const slotKey = `R${row}_C${col}`;
                const filePath = path.join(this.fightBoardSlotTemplatePath, `${slotKey}.png`);

                if (!fs.existsSync(filePath)) {
                    logger.warn(`[TemplateLoader] 未找到棋盘槽位模板: ${slotKey}.png`);
                    continue;
                }

                try {
                    // 保留 RGBA 彩色信息，空槽检测需要颜色差异来区分有无棋子
                    const mat = await this.loadImageAsMat(filePath, {
                        ensureAlpha: true,
                        grayscale: false,
                    });

                    if (mat) {
                        this.fightBoardSlotTemplates.set(slotKey, mat);
                    }
                } catch (e) {
                    logger.error(`[TemplateLoader] 加载棋盘槽位模板失败 [${slotKey}]: ${e}`);
                }
            }
        }

        logger.info(`[TemplateLoader] 棋盘槽位模板加载完成，共 ${this.fightBoardSlotTemplates.size} 个`);
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

            // 灰度处理
            if (config.grayscale) {
                pipeline = pipeline.grayscale();
            }

            // Alpha 通道处理
            if (config.removeAlpha) {
                pipeline = pipeline.removeAlpha();
            } else if (config.ensureAlpha && !config.grayscale) {
                // 灰度图通常只有 1 或 2 通道 (含Alpha)，sharp 的 grayscale() 会移除色彩信息
                // 如果需要 Alpha，sharp 会保留。但 OpenCV 的灰度通常指单通道。
                // 如果 config.grayscale 为 true，我们期望得到单通道 (CV_8UC1)
                // sharp output for grayscale is usually 1 channel if no alpha, 2 if alpha.
                // 我们这里假设灰度不需要 Alpha，或者如果是模板匹配，通常用单通道。
                // 强制确保 Alpha 在灰度模式下可能有点复杂，这里简单处理：
                // 如果是灰度，就不要 ensureAlpha 了，除非明确要求。
                // 但为了保险，如果是灰度，我们通常只想要单通道。
                pipeline = pipeline.ensureAlpha();
            }

            const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });

            let channels = info.channels;
            // sharp 的 info.channels 会返回实际通道数
            
            // 验证数据长度
            const expectedLength = info.width * info.height * channels;

            if (data.length !== expectedLength) {
                logger.warn(`[TemplateLoader] 图片数据长度异常: ${filePath}`);
                return null;
            }

            // 创建 Mat
            let matType;
            if (channels === 1) matType = cv.CV_8UC1;
            else if (channels === 3) matType = cv.CV_8UC3;
            else if (channels === 4) matType = cv.CV_8UC4;
            else {
                 logger.warn(`[TemplateLoader] 不支持的通道数 [${channels}]: ${filePath}`);
                 return null;
            }

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
     * 清理英雄模板缓存
     */
    private clearChampionTemplates(): void {
        for (const mat of this.championTemplates.values()) {
            if (mat && !mat.isDeleted()) {
                mat.delete();
            }
        }
        this.championTemplates.clear();
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
     * 清理备战席槽位模板缓存
     */
    private clearBenchSlotTemplates(): void {
        for (const mat of this.benchSlotTemplates.values()) {
            if (mat && !mat.isDeleted()) {
                mat.delete();
            }
        }
        this.benchSlotTemplates.clear();
    }

    /**
     * 清理棋盘槽位模板缓存
     */
    private clearFightBoardSlotTemplates(): void {
        for (const mat of this.fightBoardSlotTemplates.values()) {
            if (mat && !mat.isDeleted()) {
                mat.delete();
            }
        }
        this.fightBoardSlotTemplates.clear();
    }

    /**
     * 销毁所有资源
     */
    public destroy(): void {
        this.clearEquipTemplates();
        this.clearChampionTemplates();
        this.clearStarLevelTemplates();
        this.clearBenchSlotTemplates();
        this.clearFightBoardSlotTemplates();

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
