/**
 * 数据来源：官方的https://lol.qq.com/act/a20220802tftsimulator/#/index，高清棋子图标，但感觉不是最新
 * https://op.gg/zh-cn/tft/meta-trends/item OPGG上可以拿到标清版最新信息。
 */

//  游戏分辨率是1024x768
import {logger} from "./utils/Logger";
import {Button, mouse, Point, Region, screen as nutScreen} from "@nut-tree-fork/nut-js"
import Tesseract, {createWorker, PSM} from "tesseract.js";
import {screen} from 'electron';
import path from "path";
import sharp from 'sharp';
import fs from "fs-extra";
import {sleep} from "./utils/HelperTools";
import {
    equipmentRegion,
    fightBoardSlot, gameStageDisplayNormal, gameStageDisplayStageOne, gameStageDisplayTheClockworkTrails, shopSlot,
    shopSlotNameRegions,
    TFT_15_CHAMPION_DATA, TFT_15_EQUIP_DATA,
    TFTEquip,
    TFTUnit
} from "./TFTProtocol";
import cv from "@techstark/opencv-js";
import {TFT_15_EQUIP} from "../public/TFTInfo/equip";

const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;

//  装备的资源路径，从public/resources/assets/images/equipment里面算起
// 优先级排序：散件 -> 成装 -> 纹章 -> 神器 -> 光明
export const equipResourcePath = ['component', 'core', 'emblem', 'artifact', 'radiant',];

// 定义识别到的装备接口，继承自协议中的基础装备接口，并添加识别特有的属性
export interface IdentifiedEquip extends TFTEquip {
    slot: string;       // 所在的槽位名称，如 "SLOT_1"
    confidence: number; // 匹配相似度 (0-1)
    category: string;   // 装备分类 (component, core 等)
}

//  当前购买栏中的单个对象信息。
export interface ShopUnit {
    slot: number;
    name: string | null;   // OCR 识别到的名字；识别不到就 null
    cost: number | null;   // 武斗、3 费、4 费可用颜色判断（可选）
}

//  战斗棋盘上的棋子位置
export type BoardLocation = keyof typeof fightBoardSlot;


//  棋盘上的一个棋子单位
export interface BoardUnit {
    location: BoardLocation;   //  位置信息
    tftUnit: TFTUnit;         //  棋子信息
    starLevel: 1 | 2 | 3 | 4;         //  棋子星级
    items: string[]
}

// 整个棋盘的快照状态
export interface BoardState {
    // 使用 Map 来存储，Key 是位置，Value 是棋子
    // 这样查询 "R1_C1 有没有人" 会非常快！
    cells: Map<BoardLocation, BoardUnit>;
}

//  当前下棋的游戏模式
export enum GAME_TYPE {
    CLASSIC,    //  经典
    CLOCKWORK_TRAILS    //  PVE，发条鸟的试炼。
}


class TftOperator {
    private static instance: TftOperator;
    //  缓存游戏窗口的左上角坐标
    private gameWindowRegion: Point | null;
    //  用来判断游戏阶段的Worker
    private gameStageWorker: Tesseract.Worker | null = null;
    //  用来判断棋子内容的Worker
    private chessWorker: Tesseract.Worker | null = null;
    //  当前的游戏模式
    private gameType: GAME_TYPE;
    //  当前战场状态，初始化为空 Map
    private currentBoardState: BoardState = {
        cells: new Map()
    };
    //  当前装备状态。
    private currentEquipState: TFTEquip[] = [];
    // 缓存已加载的图片模板 (分层存储)
    private equipTemplates: Array<Map<string, cv.Mat>> = [];
    // 装备图片资源根目录
    private readonly BASE_TEMPLATE_DIR = path.join(process.env.VITE_PUBLIC || '.', 'resources/assets/images/equipment');
    // ⚡️ 新增：全黑的空槽位模板，宽高均为24
    private emptySlotTemplate: cv.Mat = null;


    private constructor() {
        cv['onRuntimeInitialized'] = () => {
            this.emptySlotTemplate = new cv.Mat(24, 24, cv.CV_8UC4, new cv.Scalar(0, 0, 0, 255))
            logger.info("[TftOperator] OpenCV (WASM) 核心模块加载完毕！");
        };
    }

    public static getInstance(): TftOperator {
        if (!TftOperator.instance) {
            TftOperator.instance = new TftOperator();
        }
        return TftOperator.instance;
    }

    /**
     * 初始化，通过electron找到屏幕中心点，LOL窗口默认居中，以此判断布局。
     */
    public init(): boolean {
        try {
            // 从electron获取屏幕尺寸
            const primaryDisplay = screen.getPrimaryDisplay();
            const {width: screenWidth, height: screenHeight} = primaryDisplay.size;
            // b. (关键) 计算屏幕中心
            const screenCenterX = screenWidth / 2;
            const screenCenterY = screenHeight / 2;

            // c. (关键) 计算游戏窗口的左上角 (0,0) 点
            const originX = screenCenterX - (GAME_WIDTH / 2);
            const originY = screenCenterY - (GAME_HEIGHT / 2);

            this.gameWindowRegion = new Point(originX, originY);

            logger.info(`[TftOperator] 屏幕尺寸: ${screenWidth}x${screenHeight}.`);
            logger.info(`[TftOperator] 游戏基准点 (0,0) 已计算在: (${originX}, ${originY})`);
            return true;

        } catch (e: any) {
            logger.error(`[TftOperator] 无法从 Electron 获取屏幕尺寸: ${e.message}`);
            this.gameWindowRegion = null;
            return false;
        }
    }

    //  获取当前游戏阶段
    public async getGameStage(): Promise<string | null> {
        try {
            const worker = await this.getGameStageWorker();

            const normalRegion = this.getStageAbsoluteRegion(false);
            const normalPng = await this.captureRegionAsPng(normalRegion);
            let text = await this.ocr(normalPng, worker);
            console.log('[TftOperator] 普通区域识别：' + text)

            if (text !== "") {
                this.gameType = GAME_TYPE.CLASSIC;
                return text;
            }
            // ======================================
            // 2) 若失败，尝试识别经典模式 stage-one 区域
            // ======================================
            console.log('[TftOperator] 普通识别失败，尝试 Stage-One 区域…');

            const stageOneRegion = this.getStageAbsoluteRegion(true);
            const stageOnePng = await this.captureRegionAsPng(stageOneRegion);
            //this.saveDebugImage('stage_one.png', stageOnePng);

            text = await this.ocr(stageOnePng, worker);
            console.log('[TftOperator] Stage-One 识别：' + text);

            if (text !== "") {
                this.gameType = GAME_TYPE.CLASSIC;
                return text;
            }

            // ======================================
            // 3) 若仍失败，则尝试发条鸟试炼（PVE）区域
            // ======================================
            console.log('[TftOperator] Stage-One 也失败，尝试发条鸟试炼模式…');

            const clockworkRegion = this.getClockworkTrialsRegion();
            const clockPng = await this.captureRegionAsPng(clockworkRegion);
            //this.saveDebugImage('stage_clockwork.png', clockPng);

            text = await this.ocr(clockPng, worker);
            console.log('[TftOperator] 发条鸟试炼识别：' + text);

            if (text !== "") {
                this.gameType = GAME_TYPE.CLOCKWORK_TRAILS;
                return text;
            }

            // 三种模式均识别失败
            console.log('[TftOperator] 三种模式全部识别失败！');
            return null;

        } catch (e: any) {
            logger.error(`[TftOperator] nut-js textFinder 失败: ${e.message}`);
            logger.error("请确保 @nut-tree/plugin-ocr 已正确安装和配置！");
            return null;
        }
    }

    /**
     * 获取当前商店的所有棋子信息
     */
    public async getShopInfo(): Promise<TFTUnit[]> {
        const worker = await this.getChessWorker()
        logger.info('[TftOperator] 正在扫描商店中的 5 个槽位...')
        const shopUnits: TFTUnit[] = [];
        for (let i = 1; i <= 5; i++) {
            const slotKey = `SLOT_${i}` as keyof typeof shopSlotNameRegions
            const simpleRegion = shopSlotNameRegions[slotKey]
            const tessRegion = new Region(this.gameWindowRegion.x + simpleRegion.leftTop.x,
                this.gameWindowRegion.y + simpleRegion.leftTop.y,
                simpleRegion.rightBottom.x - simpleRegion.leftTop.x,
                simpleRegion.rightBottom.y - simpleRegion.leftTop.y
            )
            //  处理得到png
            const processedPng = await this.captureRegionAsPng(tessRegion);
            //  识别图片
            const {data: {text}} = await worker.recognize(processedPng)

            const cleanName = text.replace(/\s/g, "")

            //  从数据集中找到对应英雄
            const unitData: TFTUnit | null = TFT_15_CHAMPION_DATA[cleanName]
            if (unitData) {
                logger.info(`[商店槽位 ${i}] 识别成功-> ${unitData.displayName}-(${unitData.price}费)`);
                shopUnits.push(unitData)
            } else {
                // 没找到 (可能是空槽位，或者识别错误)
                if (text.length > 0) {
                    logger.warn(`[商店槽位 ${i}] 识别到未知名称: ${cleanName}`);
                } else {
                    // 空字符串通常意味着槽位是空的（比如买完了）
                    logger.info(`[商店槽位 ${i}] 空槽位`);
                }
            }
        }
        return shopUnits;
    }

    public async getEquipInfo(): Promise<IdentifiedEquip[]> {
        if (!this.gameWindowRegion) {
            logger.error("[TftOperator] 尚未初始化游戏窗口位置！");
            return [];
        }

        // 1. 确保模板已加载
        await this.loadEquipTemplates();
        if (this.equipTemplates.length === 0) {
            logger.warn("[TftOperator] 装备模板为空，跳过识别");
            return [];
        }

        const resultEquips: IdentifiedEquip[] = [];
        logger.info('[TftOperator] 开始扫描装备栏...');

        for (const [slotName, regionDef] of Object.entries(equipmentRegion)) {
            // --- A. 计算绝对坐标 Region ---
            const targetRegion = new Region(
                this.gameWindowRegion.x + regionDef.leftTop.x,
                this.gameWindowRegion.y + regionDef.leftTop.y,
                regionDef.rightBottom.x - regionDef.leftTop.x + 1,
                regionDef.rightBottom.y - regionDef.leftTop.y + 1
            );

            try {
                // --- B. 直接获取 Raw Data (跳过 PNG 编解码，极致性能) ---
                const screenshot = await nutScreen.grabRegion(targetRegion);
                // ⚡️ 关键修改：把 nut-js 的截图数据也转一下
                // nut-js 的 screenshot.data 是一个 Buffer，我们需要转成 Uint8Array
                const screenData = new Uint8Array(screenshot.data);
                const targetImageData = {
                    data: screenData,
                    width: screenshot.width,
                    height: screenshot.height
                };
                // 注意：这里可能会抛出错误，如果抛出数字错误，说明是这里挂了
                let targetMat: cv.Mat;
                try {
                    targetMat = cv.matFromImageData(targetImageData);
                } catch (err) {
                    logger.error(`[TftOperator] matFromImageData 失败 (Slot: ${slotName}): ${err}`);
                    continue; // 跳过这个槽位
                }
                // 颜色转换
                try {
                    cv.cvtColor(targetMat, targetMat, cv.COLOR_BGRA2RGBA);
                } catch (err) {
                    logger.error(`[TftOperator] cvtColor 失败: ${err}`);
                    targetMat.delete();
                    continue;
                }
                // --- E. 在内存中寻找最匹配的装备 ---
                const matchResult = this.findBestMatchEquipTemplate(targetMat);
                // 释放截图产生的 Mat
                targetMat.delete();

                if (matchResult) {
                    logger.info(`[TftOperator] ${slotName} 识别成功: ${matchResult.name} (相似度: ${(matchResult.confidence * 100).toFixed(1)}%)`);
                    // 补全 slot 信息
                    matchResult.slot = slotName;
                    resultEquips.push(matchResult);
                } else {
                    // logger.info(`[TftOperator] ${slotName} 槽位为空或识别失败。`)
                }

            } catch (e: any) {
                logger.error(`[TftOperator] ${slotName} 扫描流程异常: ${e.message}`);
            }
        }
        return resultEquips;
    }

    /**
     * 购买指定槽位的棋子
     * @param slot 槽位编号 (1, 2, 3, 4, 或 5)
     */
    public async buyAtSlot(slot: number): Promise<void> {
        const slotKey = `SHOP_SLOT_${slot}` as keyof typeof shopSlot
        const targetPoint = shopSlot[slotKey];

        // 3. (健壮性) 检查这个坐标是否存在
        //    如果 slot 是 6, "SHOP_SLOT_6" 不存在, targetSlotCoords 就会是 undefined
        //    这完美地替代了 "default" 分支！
        if (!targetPoint) {
            logger.error(`[TftOperator] 尝试购买一个无效的槽位: ${slot}。只接受 1-5。`);
            return;
        }

        logger.info(`[TftOperator] 正在购买棋子，槽位：${slot}...`);
        //  为了健壮，买棋子的时候点两次，避免买不上
        await this.clickAt(targetPoint);
        await sleep(50)
        await this.clickAt(targetPoint);
    }

    // ----------------------   这下面都是private方法  ----------------------


    //  处理点击事件
    private async clickAt(offset: Point) {
        if (!this.gameWindowRegion) {
            if (!this.init()) {
                throw new Error("TftOperator 尚未初始化。");
            }
        }

        const target = {
            x: this.gameWindowRegion!.x + offset.x,
            y: this.gameWindowRegion!.y + offset.y
        };

        logger.info(`[TftOperator] 正在点击: (Origin: ${this.gameWindowRegion!.x},${this.gameWindowRegion!.y}) + (Offset: ${offset.x},${offset.y}) -> (Target: ${target.x},${target.y})`);
        try {
            // (重要) nut-js 的 API 需要它们自己的 Point 实例
            const nutPoint = new Point(target.x, target.y);

            await mouse.move([nutPoint]);
            await new Promise(resolve => setTimeout(resolve, 30));
            await mouse.click(Button.LEFT);
            await new Promise(resolve => setTimeout(resolve, 50));
        } catch (e: any) {
            logger.error(`[TftOperator] 模拟鼠标点击失败: ${e.message}`);
        }
    }

    // 获取游戏里表示战斗阶段(如1-1)的Region
    private getStageAbsoluteRegion(isStageOne: boolean = false): Region {
        if (!this.gameWindowRegion) {
            logger.error("[TftOperator] 尝试在 init() 之前计算 Region！");
            if (!this.init()) throw new Error("[TftOperator] 未初始化，请先调用 init()");
        }

        const originX = this.gameWindowRegion!.x;
        const originY = this.gameWindowRegion!.y;

        const display = isStageOne ? gameStageDisplayStageOne : gameStageDisplayNormal;

        const x = Math.round(originX + display.leftTop.x);
        const y = Math.round(originY + display.leftTop.y);
        const width = Math.round(display.rightBottom.x - display.leftTop.x);
        const height = Math.round(display.rightBottom.y - display.leftTop.y);

        return new Region(x, y, width, height);
    }

    //  一个懒加载的 Tesseract worker
    private async getGameStageWorker(): Promise<any> {
        if (this.gameStageWorker) return this.gameStageWorker;
        logger.info("[TftOperator] 正在创建 Tesseract worker...");
        const localLangPath = path.join(process.env.VITE_PUBLIC, 'resources/tessdata');
        logger.info(`[TftOperator] Tesseract 本地语言包路径: ${localLangPath}`);

        const worker = await createWorker('eng', 1, {
            logger: m => logger.info(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`),
            langPath: localLangPath,
            cachePath: localLangPath,
        })
        await worker.setParameters({
            tessedit_char_whitelist: '0123456789-',
            tessedit_pageseg_mode: PSM.SINGLE_LINE,    //  图片排版模式为简单的单行
        })
        this.gameStageWorker = worker;
        logger.info("[TftOperator] Tesseract worker 准备就绪！");
        return this.gameStageWorker;
    }

    //  同样懒加载Worker，用来识别棋子名字，中文模型
    private async getChessWorker(): Promise<any> {
        if (this.chessWorker) return this.chessWorker
        logger.info("[TftOperator] 正在创建 Tesseract worker...");
        const localLangPath = path.join(process.env.VITE_PUBLIC, 'resources/tessdata');
        logger.info(`[TftOperator] Tesseract 本地语言包路径: ${localLangPath}`);
        const worker = await createWorker('chi_sim', 1, {
            logger: m => logger.info(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`),
            langPath: localLangPath,
            cachePath: localLangPath,
        })
        //  识别字体白名单做一下处理
        const uniqueChars = [...new Set(Object.keys(TFT_15_CHAMPION_DATA).join(''))].join('')
        await worker.setParameters({
                tessedit_char_whitelist: uniqueChars,
                tessedit_pageseg_mode: PSM.SINGLE_LINE, // 单行模式
            }
        )
        this.chessWorker = worker
        logger.info("[TftOperator] Tesseract worker 准备就绪！");
        return this.chessWorker;
    }

    // ======================================
    // 工具函数：截图某区域并输出 PNG buffer
    // ======================================
    private async captureRegionAsPng(region: Region, forOCR: boolean = true): Promise<Buffer> {
        const screenshot = await nutScreen.grabRegion(region);
        //  中间变量
        let pipeline = sharp(screenshot.data, {
            raw: {
                width: screenshot.width,
                height: screenshot.height,
                channels: 4, // RGBA / BGRA
            }
        }).removeAlpha();

        // 3. 根据用途分叉处理
        if (forOCR) {
            // --- OCR 专用流程 (增强文字对比度) ---
            pipeline = pipeline
                .resize({
                    width: Math.round(screenshot.width * 3),  // 放大 3 倍以提高 OCR 精度
                    height: Math.round(screenshot.height * 3),
                    kernel: "lanczos3"
                })
                .grayscale()      // 去色
                .normalize()      // 拉伸对比度
                .threshold(160)   // 二值化 (非黑即白)
                .sharpen();       // 锐化边缘
        } else {
            // --- 模板匹配/图像识别流程 (保留原貌) ---
            // 喵！这里什么都不做，保持原汁原味！
            // 千万不要 resize！模板匹配对尺寸非常敏感！
            // 也不要 grayscale，因为红buff和蓝buff形状很像，颜色才是关键！
        }
        // 4. 输出 buffer
        return await pipeline
            .toFormat('png')
            .toBuffer();
    }

    //  保存调试图片，debug用的
    private saveDebugImage(name: string, pngBuffer: Buffer) {
        const filePath = path.join(process.env.VITE_PUBLIC!, name);
        console.log('[Debug] 保存截图：' + filePath);
        fs.writeFileSync(filePath, pngBuffer);
    }

    // ======================================
    // 工具函数：OCR 识别
    // ======================================
    private async ocr(pngBuffer: Buffer, worker: any): Promise<string> {
        const result = await worker.recognize(pngBuffer);
        return result.data.text.trim();
    }

    //  发条鸟试炼的布局
    private getClockworkTrialsRegion(): Region {
        const originX = this.gameWindowRegion!.x;
        const originY = this.gameWindowRegion!.y;

        return new Region(
            originX + gameStageDisplayTheClockworkTrails.leftTop.x,
            originY + gameStageDisplayTheClockworkTrails.leftTop.y,
            gameStageDisplayTheClockworkTrails.rightBottom.x - gameStageDisplayTheClockworkTrails.leftTop.x,
            gameStageDisplayTheClockworkTrails.rightBottom.y - gameStageDisplayTheClockworkTrails.leftTop.y
        );
    }

    /**
     * 加载装备模板
     */
    /**
     * 加载装备模板
     */
    private async loadEquipTemplates() {
        if (this.equipTemplates.length > 0) return;
        logger.info(`[TftOperator] 开始加载装备模板...`);
        const TEMPLATE_SIZE = 24;
        // 初始化空模板
        if (!this.emptySlotTemplate) {
            try {
                this.emptySlotTemplate = new cv.Mat(TEMPLATE_SIZE, TEMPLATE_SIZE, cv.CV_8UC4, new cv.Scalar(0, 0, 0, 255));
            } catch (e) {
                logger.error(`[TftOperator] 创建空模板失败: ${e}`);
            }
        }

        const validExtensions = ['.png', '.webp', '.jpg', '.jpeg'];

        for (const category of equipResourcePath) {
            const resourcePath = path.join(this.BASE_TEMPLATE_DIR, category);
            const categoryMap = new Map<string, cv.Mat>();

            if (fs.existsSync(resourcePath)) {
                const files = fs.readdirSync(resourcePath);
                for (const file of files) {
                    const ext = path.extname(file).toLowerCase();
                    if (!validExtensions.includes(ext)) continue;

                    const filePath = path.join(resourcePath, file);
                    const fileNameNotExt = path.parse(file).name;

                    try {
                        const fileBuf = fs.readFileSync(filePath);
                        const {data, info} = await sharp(fileBuf)
                            .resize(TEMPLATE_SIZE, TEMPLATE_SIZE, {fit: "fill"})
                            .ensureAlpha()
                            .raw()
                            .toBuffer({resolveWithObject: true});

                        // ⚡️ 关键修改：显式转换为 Uint8Array，防止 Buffer 类型不兼容
                        const uint8Data = new Uint8Array(data);

                        // 再次检查数据长度是否合法 (w * h * 4)
                        if (uint8Data.length !== info.width * info.height * 4) {
                            logger.warn(`[TftOperator] 图片数据长度异常: ${file}`);
                            continue;
                        }

                        // 构造符合 ImageData 接口的对象
                        const imageData = {
                            data: uint8Data,
                            width: info.width,
                            height: info.height,
                        };

                        const mat = cv.matFromImageData(imageData);
                        categoryMap.set(fileNameNotExt, mat);

                    } catch (e) {
                        logger.error(`[TftOperator] 加载模板失败 [${file}]: ${e}`);
                    }
                }
                logger.info(`[TftOperator] 加载 [${category}] 模板: ${categoryMap.size} 个`);
            }
            this.equipTemplates.push(categoryMap);
        }
        logger.info(`[TftOperator] 图片模板加载完成！`);
    }

    /**
     *  传入一个Mat对象，并从图片模板中找到最匹配的装备
     */
    private findBestMatchEquipTemplate(targetMat: cv.Mat): IdentifiedEquip | null {
        let bestMatchEquip: TFTEquip | null = null;
        let maxConfidence = 0;
        let foundCategory = "";
        const THRESHOLD = 0.80; // 匹配阈值

        const mask = new cv.Mat();  //  判断模板时候用，遮罩为空表示匹配所有像素
        const resultMat = new cv.Mat();
        //  开始比对
        try {
            //  优先判断是否是空槽位，TM_CCOEFF_NORMED是归一化算法，-1完全相反，1完美匹配，0毫无关系
            cv.matchTemplate(targetMat, this.emptySlotTemplate, resultMat, cv.TM_CCOEFF_NORMED)
            const emptyResult = cv.minMaxLoc(resultMat, mask)
            if (emptyResult.maxVal > 0.9) {
                // logger.debug("[TftOperator] 判定为空槽位");
                return null;
            }

            for (let i = 0; i < this.equipTemplates.length; i++) {
                const currentMap = this.equipTemplates[i];
                const currentCategory = equipResourcePath[i];// 这个是目录里面的图片路径
                if (currentMap.size === 0) continue;

                for (const [templateName, templateMat] of currentMap) {
                    //  保证模板的大小一定要小于等于目标Mat的，不然无法匹配。
                    if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) continue;

                    cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
                    const result = cv.minMaxLoc(resultMat, mask);

                    if (result.maxVal >= THRESHOLD) {
                        //  匹配度高，说明已经找到了图片
                        maxConfidence = result.maxVal
                        bestMatchEquip = Object.values(TFT_15_EQUIP_DATA).find(e => e.englishName === templateName)
                        break;
                    }
                }
            }
        } catch (e) {
            logger.error("[TftOperator] 匹配过程出错: " + e);
        } finally {
            mask.delete();
            resultMat.delete();
        }

        //  到这里为止全部类别图片都找完了或者提前找到图片且结束。
        return bestMatchEquip ? {
            ...bestMatchEquip,
            slot: "",   //  槽位信息留给外面加
            confidence: maxConfidence,
            category: foundCategory
        } : null
    }
}

export const tftOperator = TftOperator.getInstance();