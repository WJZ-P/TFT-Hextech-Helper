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
    benchSlotPoints, detailChampionNameRegion, detailChampionStarRegion,
    equipmentRegion,
    fightBoardSlot,
    gameStageDisplayNormal,
    gameStageDisplayStageOne,
    gameStageDisplayTheClockworkTrails,
    GameStageType,
    shopSlot,
    shopSlotNameRegions,
    TFT_15_CHAMPION_DATA,
    TFT_15_EQUIP_DATA,
    TFTEquip,
    TFTMode,
    TFTUnit
} from "./TFTProtocol";
import cv from "@techstark/opencv-js";

const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;

//  装备的资源路径，从public/resources/assets/images/equipment里面算起
// 优先级排序：散件 -> 特殊 -> 成装 -> 纹章 -> 神器 -> 光明
export const equipResourcePath = ['component', 'special', 'core', 'emblem', 'artifact', 'radiant',];

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
    equips: TFTEquip[]
}

export type BenchLocation = keyof typeof benchSlotPoints;

//  备战席上的一个单位
export interface BenchUnit {
    location: BenchLocation;   //  位置信息
    tftUnit: TFTUnit;         //  棋子信息
    starLevel: 1 | 2 | 3 | 4;         //  棋子星级
    equips: TFTEquip[]
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
    private tftMode: TFTMode;
    //  当前战场上的棋子状态，初始化为空 Map
    private currentBoardState: Map<BoardLocation, TFTUnit | null> = new Map()
    //  当前装备状态。
    private currentEquipState: TFTEquip[] = [];
    //  当前备战席状态。
    private currentBenchState: TFTUnit[] = [];
    // 缓存装备图片模板 (分层存储)
    private equipTemplates: Array<Map<string, cv.Mat>> = [];
    // 缓存商店栏英雄ID模板
    private championTemplates: Map<string, cv.Mat> = new Map();
    // 缓存星级模板
    private starLevelTemplates:Map<string,cv.Mat> = new Map();

    // ⚡️ 全黑的空装备槽位模板，宽高均为24
    private emptyEquipSlotTemplate: cv.Mat = null;

    //  每次使用计算路径，避免初始化的时候产生process.env的属性未定义的问题。
    private get championTemplatePath(): string {
        return path.join(process.env.VITE_PUBLIC || '.', 'resources/assets/images/champion');
    }

    // 3. 同样的，之前的装备路径也可以这样改，防止同样的问题
    private get equipTemplatePath(): string {
        return path.join(process.env.VITE_PUBLIC || '.', 'resources/assets/images/equipment');
    }

    private constructor() {
        cv['onRuntimeInitialized'] = () => {
            this.emptyEquipSlotTemplate = new cv.Mat(24, 24, cv.CV_8UC4, new cv.Scalar(0, 0, 0, 255))
            logger.info("[TftOperator] OpenCV (WASM) 核心模块加载完毕！");
            // 加载装备模板
            this.loadEquipTemplates();
            // 加载英雄ID模板
            this.loadChampionTemplates();
            // 加载星级模板
            this.loadStarLevelTemplates();
            // 启动文件监听
            this.setupChampionTemplateWatcher();
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
            // 获取屏幕的缩放因子
            const scaleFactor = primaryDisplay.scaleFactor;
            // 获取逻辑尺寸 (Electron 这里的 width/height 是缩放后的)
            const {width: logicalWidth, height: logicalHeight} = primaryDisplay.size;
            // 😺 关键修复：还原为物理像素！
            // Math.round 防止出现小数像素导致模糊
            const screenWidth = Math.round(logicalWidth * scaleFactor);
            const screenHeight = Math.round(logicalHeight * scaleFactor);

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
    public async getGameStage(): Promise<GameStageType> {
        try {
            //  定义一个小的辅助函数
            const isValidStageFormat = (text: string): boolean => {
                return /^d+\s*[-]\s*\d+$/.test(text.trim())
            }

            const worker = await this.getGameStageWorker();
            // 1. 尝试识别标准区域 (例如 2-1, 3-5, 4-2)
            // 大多数时候都在这里
            let stageText = "";
            const normalRegion = this.getStageAbsoluteRegion(false);
            const normalPng = await this.captureRegionAsPng(normalRegion);
            stageText = await this.ocr(normalPng, worker);

            // 2. 如果标准区域识别失败 (格式不对)，尝试识别 Stage 1 区域 (例如 1-1, 1-2)
            // Stage 1 的 UI 位置通常比较特殊（在屏幕中间上方）
            if (!isValidStageFormat(stageText)) {
                logger.info(`[TftOperator] 标准区域识别未命中: "${stageText}"，尝试 Stage-1 区域...`);
                const stageOneRegion = this.getStageAbsoluteRegion(true);
                const stageOnePng = await this.captureRegionAsPng(stageOneRegion);
                stageText = await this.ocr(stageOnePng, worker);
            }
            // 3. 再次校验，如果还是不行，检查是否为“发条鸟试炼”模式
            // 发条鸟模式的阶段显示位置更靠左，因为阶段更多
            if (!isValidStageFormat(stageText)) {
                const clockworkRegion = this.getClockworkTrialsRegion();
                const clockPng = await this.captureRegionAsPng(clockworkRegion);
                const clockText = await this.ocr(clockPng, worker);

                // 简单的文字检测，如果有文字，暂时默认为 PVP 或特殊处理
                if (clockText && clockText.length > 2) {
                    this.tftMode = TFTMode.CLOCKWORK_TRAILS;
                    logger.info('[TftOperator] 识别为发条鸟试炼模式，直接返回PVP。');
                    // 发条鸟主要是战斗，暂时返回 PVP
                    return GameStageType.PVP;
                }
            }
            // 4. 🧠 核心解析：把 "2-1" 这种字符串变成枚举
            const stageType = parseStageStringToEnum(stageText);

            if (stageType !== GameStageType.UNKNOWN) {
                logger.info(`[TftOperator] 识别阶段: [${stageText}] -> 判定为: ${stageType}`);
                this.tftMode = TFTMode.CLASSIC;
            } else {
                // 识别不到是正常的（比如加载中、黑屏、或者被挡住），静默处理即可
                logger.warn(`[TftOperator] 无法识别当前阶段: "${stageText ?? 'null'}"`);
            }
            return stageType;
        } catch (e: any) {
            logger.error(`[TftOperator] 阶段识别流程异常: ${e.message}`);
            return GameStageType.UNKNOWN;
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
            const tessRegion = this.getRealRegion(shopSlotNameRegions[slotKey])
            //  处理得到png
            const processedPng = await this.captureRegionAsPng(tessRegion);
            //  识别图片
            const text = await this.ocr(processedPng, worker);
            let tftUnit: TFTUnit | null = null;

            let cleanName = text.replace(/\s/g, "")
            //  看能否从OCR结果中找到匹配的英雄
            tftUnit = TFT_15_CHAMPION_DATA[cleanName];

            if (!tftUnit) {
                logger.warn(`[商店槽位 ${i}] OCR识别失败！尝试模板匹配...`);
                //  模板匹配兜底
                const rawData = await sharp(processedPng)
                    .ensureAlpha()//    如果用matFromImageData，必须保证有A才行。
                    .raw()
                    .toBuffer({resolveWithObject: true});
                const processedMat = cv.matFromImageData({
                    data: new Uint8Array(rawData.data),
                    width: rawData.info.width,
                    height: rawData.info.height
                })
                cleanName = this.findBestMatchChampionTemplate(processedMat)
            }

            //  从数据集中找到对应英雄
            tftUnit = TFT_15_CHAMPION_DATA[cleanName];
            if (tftUnit) {
                logger.info(`[商店槽位 ${i}] 识别成功-> ${tftUnit.displayName}-(${tftUnit.price}费)`);
                shopUnits.push(tftUnit)
            } else {
                // 没找到 (可能是空槽位，或者识别错误)
                if (cleanName?.length > 0) {
                    if (cleanName === "empty")
                        logger.info(`[商店槽位 ${i}] 识别为空槽位`);
                    else
                        logger.warn(`[商店槽位 ${i}] 成功匹配到模板，但识别到未知名称: ${cleanName}，请检查是否拼写有误！`);
                    // const filename = `fail_slot_${i}_${Date.now()}.png`;
                    // fs.writeFileSync(path.join(this.championTemplatePath, filename), processedPng);
                } else {
                    //  把识别失败的截图保存到本地
                    logger.warn(`[商店槽位 ${i}] 识别失败，保存截图...`);
                    const filename = `fail_shop_slot_${i}_${Date.now()}.png`;
                    fs.writeFileSync(path.join(this.championTemplatePath, filename), processedPng);
                }

                shopUnits.push(null);// 放入一个null占位
            }
        }
        return shopUnits;
    }

    public async getEquipInfo(): Promise<IdentifiedEquip[]> {
        if (!this.gameWindowRegion) {
            logger.error("[TftOperator] 尚未初始化游戏窗口位置！");
            return [];
        }

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

            let targetMat: cv.Mat;
            try {
                // --- B. 直接获取 Raw Data (跳过 PNG 编解码，极致性能) ---
                const screenshot = await nutScreen.grabRegion(targetRegion);
                // 1. 创建 Mat (假设屏幕是 BGRA 4通道)
                // 注意：nut-js 截屏通常返回的是 4 通道数据
                targetMat = new cv.Mat(screenshot.height, screenshot.width, cv.CV_8UC4);
                // 2. 注入数据 (nut-js 返回的是 Buffer，转成 Uint8Array 塞给 Mat)
                targetMat.data.set(new Uint8Array(screenshot.data));
                // 3. 🛡️ 【关键颜色修复】手动执行 BGRA -> RGB 转换
                cv.cvtColor(targetMat, targetMat, cv.COLOR_BGRA2RGB);

                // --- E. 在内存中寻找最匹配的装备 ---
                const matchResult = this.findBestMatchEquipTemplate(targetMat);

                if (matchResult) {
                    logger.info(`[TftOperator] ${slotName} 识别成功: ${matchResult.name} (相似度: ${(matchResult.confidence * 100).toFixed(1)}%)`);
                    // 补全 slot 信息
                    matchResult.slot = slotName;
                    resultEquips.push(matchResult);
                } else {
                    logger.error(`[TftOperator] ${slotName} 槽位识别失败。`)

                    //  把识别失败的图片保存到本地。
                    const fileName = `equip_${slotName}${Date.now()}.png`
                    const pngBuffer = await sharp(targetMat.data, {
                        raw: {
                            width: targetMat.cols,  // OpenCV 的宽
                            height: targetMat.rows, // OpenCV 的高
                            channels: 3             // RGBA 是 4 通道
                        }
                    }).png().toBuffer();
                    fs.writeFileSync(path.join(this.equipTemplatePath, fileName), pngBuffer);
                    logger.info(`[TftOperator] 槽位${slotName}图片已保存到本地。`)
                }

            } catch (e: any) {
                logger.error(`[TftOperator] ${slotName} 扫描流程异常: ${e.message}`);
            } finally {
                // 释放截图产生的 Mat
                targetMat.delete();
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

    /**
     * 获取当前备战席的棋子信息。
     */
    public async getBunchInfo(): Promise<BenchUnit[]> {
        const benchUnits: BenchUnit[] = [];
        //  拿到我们的worker。
        const worker = this.getChessWorker();
        for (const benchSlot of Object.keys(benchSlotPoints)) {
            // TODO 这里还需要判断英雄的星级

            //  先用鼠标右键点击槽位，以在右侧显示详细信息。
            await this.clickAt(benchSlotPoints[benchSlot]);
            await sleep(40);    //  下棋配置是25帧每秒，因此这里要等待一点时间以刷新画面。
            const tessRegion = this.getRealRegion(detailChampionNameRegion[benchSlot])
            //  处理得到png
            const processedPng = await this.captureRegionAsPng(tessRegion);
            //  识别图片
            const text = await this.ocr(processedPng, worker);
            let tftUnit: TFTUnit | null = null;

            let cleanName = text.replace(/\s/g, "")
            //  看能否从OCR结果中找到匹配的英雄
            tftUnit = TFT_15_CHAMPION_DATA[cleanName];

            if (!tftUnit) {
                logger.warn(`[备战席槽位${benchSlot.slice(-1)}] OCR识别失败！尝试模板匹配...`);
                //  模板匹配兜底
                const rawData = await sharp(processedPng)
                    .ensureAlpha()//    如果用matFromImageData，必须保证有A才行。
                    .raw()
                    .toBuffer({resolveWithObject: true});
                const processedMat = cv.matFromImageData({
                    data: new Uint8Array(rawData.data),
                    width: rawData.info.width,
                    height: rawData.info.height
                })
                cleanName = this.findBestMatchChampionTemplate(processedMat)
            }

            //  从数据集中找到对应英雄
            tftUnit = TFT_15_CHAMPION_DATA[cleanName];
            if (tftUnit) {
                //  星级探测，看当前的棋子是多少星
                const tessRegion = this.getRealRegion(detailChampionStarRegion)
                const starPng = await this.captureRegionAsPng(tessRegion)
                //  做模板匹配

                const rawData = await sharp(starPng)
                    .ensureAlpha()//    如果用matFromImageData，必须保证有A才行。
                    .raw()
                    .toBuffer({resolveWithObject: true});
                const processedMat = cv.matFromImageData({
                    data: new Uint8Array(rawData.data),
                    width: rawData.info.width,
                    height: rawData.info.height
                })

                const starLevel = await this.findBestMatchStarLevel(processedMat);

                logger.info(`[备战席槽位 ${benchSlot.slice(-1)}] 识别成功-> ${tftUnit.displayName}-(${tftUnit.price}费-${starLevel}星)`);
                //  组装一下
                const benchUnit: BenchUnit = {
                    location: benchSlot as BenchLocation,
                    tftUnit: tftUnit,         //  棋子信息
                    starLevel: starLevel,             //  棋子星级
                    equips: []
                }
                //  TODO 这里需要完善星级和装备探测
                benchUnits.push(benchUnit)
            } else {
                // 没找到 (可能是空槽位，或者识别错误)
                if (cleanName?.length > 0) {
                    if (cleanName === "empty")
                        logger.info(`[备战席槽位 ${benchSlot.slice(-1)}] 识别为空槽位`);
                    else
                        logger.warn(`[备战席槽位 ${benchSlot.slice(-1)}] 成功匹配到模板，但识别到未知名称: ${cleanName}，请检查是否拼写有误！`);
                    // const filename = `fail_slot_${i}_${Date.now()}.png`;
                    // fs.writeFileSync(path.join(this.championTemplatePath, filename), processedPng);
                } else {
                    //  把识别失败的截图保存到本地
                    logger.warn(`[备战席槽位 ${benchSlot.slice(-1)}] 识别失败，保存截图...`);
                    const filename = `fail_bench_slot_${benchSlot.slice(-1)}_${Date.now()}.png`;
                    fs.writeFileSync(path.join(this.championTemplatePath, filename), processedPng);
                }

                benchUnits.push(null);// 放入一个null占位
            }
        }
        return benchUnits;
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
            await sleep(10);    //  每次鼠标操作给定一定的间隔时间
            await mouse.click(Button.LEFT);
            await sleep(20);
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
            //logger: m => logger.info(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`),
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
            //logger: m => logger.info(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`),
            langPath: localLangPath,
            cachePath: localLangPath,
        })
        //  识别字体白名单做一下处理
        const uniqueChars = [...new Set(Object.keys(TFT_15_CHAMPION_DATA).join(''))].join('')
        await worker.setParameters({
                tessedit_char_whitelist: uniqueChars,
                tessedit_pageseg_mode: PSM.SINGLE_LINE, // 单行模式
                preserve_interword_spaces: '1',// 还可以尝试这个参数，强制将其视为单词
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
        })

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


    // ======================================
    // 工具函数：OCR 识别
    // ======================================
    private async ocr(pngBuffer: Buffer, worker: any): Promise<string> {
        const result = await worker.recognize(pngBuffer);
        return result.data.text.trim();
    }

    //  发条鸟试炼的对局阶段region，1-1的那个
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
    private async loadEquipTemplates() {

        if (this.equipTemplates.length > 0) {
            for (const category of this.equipTemplates) {
                for (const mat of category.values()) {
                    if (mat && !mat.isDeleted()) mat.delete()
                }
            }
            this.equipTemplates.length = 0;
        }
        logger.info(`[TftOperator] 开始加载装备模板...`);
        const TEMPLATE_SIZE = 24;
        // 初始化空模板
        if (!this.emptyEquipSlotTemplate) {
            try {
                this.emptyEquipSlotTemplate = new cv.Mat(TEMPLATE_SIZE, TEMPLATE_SIZE, cv.CV_8UC4, new cv.Scalar(0, 0, 0, 255));
            } catch (e) {
                logger.error(`[TftOperator] 创建空模板失败: ${e}`);
            }
        }

        const validExtensions = ['.png', '.webp', '.jpg', '.jpeg'];

        for (const category of equipResourcePath) {
            const resourcePath = path.join(this.equipTemplatePath, category);
            const categoryMap = new Map<string, cv.Mat>();
            if (!fs.existsSync(resourcePath)) {
                logger.warn(`[TftOperator] 装备模板目录不存在: ${resourcePath}`);
                continue;
            }

            const files = fs.readdirSync(resourcePath);
            for (const file of files) {
                const ext = path.extname(file).toLowerCase();
                if (!validExtensions.includes(ext)) continue;

                const filePath = path.join(resourcePath, file);
                const fileNameNotExt = path.parse(file).name;

                const processedBaseDir = path.join(process.env.VITE_PUBLIC || '.', 'resources/assets/images/processed_equipment');
                fs.ensureDirSync(processedBaseDir);

                try {
                    const fileBuf = fs.readFileSync(filePath);
                    // ⚡️ Sharp 处理：移除 Alpha，输出 RGB
                    // 注意：这里我们创建一个 sharp 实例，方便后面多次使用
                    const pipeline = sharp(fileBuf)
                        .resize(TEMPLATE_SIZE, TEMPLATE_SIZE, {fit: "fill"})
                        .removeAlpha(); // 扔掉透明通道 -> 变成 3 通道

                    // A. 获取 Raw Data 用于 OpenCV
                    const {data, info} = await pipeline
                        .clone() // ⚡️ 克隆流，防止被消耗
                        .raw()
                        .toBuffer({resolveWithObject: true});

                    //  debug，处理后的图片保存到本地
                    //const savePath = path.join(processedBaseDir, `${fileNameNotExt}.png`);
                    // await pipeline
                    //     .clone()
                    //     .png()
                    //     .toFile(savePath);
                    // logger.info(`[TftOperator] 已保存处理后的模板: ${savePath}`);

                    // ⚡️ 关键修改：显式转换为 Uint8Array，防止 Buffer 类型不兼容
                    const uint8Data = new Uint8Array(data);

                    // 再次检查数据长度是否合法 (w * h * 3), x3是因为RGB我们去掉了A，正常RGBA要x4
                    if (uint8Data.length !== info.width * info.height * 3) {
                        logger.warn(`[TftOperator] 图片数据长度异常: ${file}`);
                        continue;
                    }
                    const mat = new cv.Mat(info.height, info.width, cv.CV_8UC3);
                    mat.data.set(uint8Data)
                    categoryMap.set(fileNameNotExt, mat);

                } catch (e) {
                    logger.error(`[TftOperator] 加载模板失败 [${file}]: ${e}`);
                }
            }
            logger.info(`[TftOperator] 加载 [${category}] 模板: ${categoryMap.size} 个`);
            this.equipTemplates.push(categoryMap);
        }
        logger.info(`[TftOperator] 图片模板加载完成！`);
    }

    /**
     * 加载英雄ID模板
     */
    private async loadChampionTemplates() {
        //  refresh
        if (this.championTemplates.size > 0) {
            //  mat对象必须手动delete，因为它是指向C++内存地址的包装器
            for (const mat of this.championTemplates.values()) {
                if (mat && !mat.isDeleted()) {
                    mat.delete();
                }
            }
            this.championTemplates.clear();
        }
        logger.info(`[TftOperator] 开始加载英雄模板...`)
        if (!fs.existsSync(this.championTemplatePath)) {
            // 如果目录不存在，可能是第一次运行还没保存过失败图片，建一个
            fs.ensureDirSync(this.championTemplatePath);
            logger.info(`[TftOperator] 英雄模板目录不存在，已自动创建: ${this.championTemplatePath}`);
            return;
        }
        const files = fs.readdirSync(this.championTemplatePath);
        // 假设商店里的英雄名字截图高度大概是 20-30px，这里需要根据实际截图大小调整
        // 建议：把你的模板统一缩放到和 OCR 截图一样的高度（比如我们之前设定的 80px 高）

        for (const file of files) {
            const ext = path.extname(file).toLowerCase();
            if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;

            const championName = path.parse(file).name; // 文件名即英雄名，如 "阿狸"
            const filePath = path.join(this.championTemplatePath, file);

            try {
                const fileBuf = fs.readFileSync(filePath);
                const {data, info} = await sharp(fileBuf)
                    .ensureAlpha() // 确保有 Alpha 通道 (4通道)，跟 captureRegionAsPng 对齐
                    .raw()
                    .toBuffer({resolveWithObject: true});

                const mat = cv.matFromImageData({
                    data: new Uint8Array(data),
                    width: info.width,
                    height: info.height
                });

                this.championTemplates.set(championName, mat);
            } catch (e) {
                logger.error(`[TftOperator] 加载英雄模板失败 [${file}]: ${e}`);
            }
        }
        logger.info(`[TftOperator] 英雄模板加载完成，共 ${this.championTemplates.size} 个`);
    }

    /**
     * 加载星级模板
     */
    private async loadStarLevelTemplates(){
        // TODO 实现
    }

    /**
     *  传入一个Mat对象，并从图片模板中找到最匹配的装备，规定如果category为empty即为空模板。
     */
    private findBestMatchEquipTemplate(targetMat: cv.Mat): IdentifiedEquip | null {
        let bestMatchEquip: TFTEquip | null = null;
        let maxConfidence = 0;
        let foundCategory = "";
        const THRESHOLD = 0.75; // 匹配阈值

        const mask = new cv.Mat();  //  判断模板时候用，遮罩为空表示匹配所有像素
        const resultMat = new cv.Mat();
        //  开始比对
        try {
            // 1. ⚡️ 快速空槽位检查：基于统计学 (Standard Deviation)
            const mean = new cv.Mat();
            const stddev = new cv.Mat();

            // 计算目标图片的均值和标准差
            cv.meanStdDev(targetMat, mean, stddev);
            const deviation = stddev.doubleAt(0, 0); // 获取第一个通道的标准差

            // 记得释放内存！
            mean.delete();
            stddev.delete();

            // 阈值设定：如果标准差小于 10，说明图片没什么内容（纯黑），直接判定为空
            if (deviation < 10) {
                // logger.info(`[TftOperator] 判定为空槽位 (stddev=${deviation.toFixed(2)})`);
                return {name: "空槽位", confidence: 1 - deviation} as IdentifiedEquip;
            }

            for (let i = 0; i < this.equipTemplates.length; i++) {
                const currentMap = this.equipTemplates[i];  //  当前分类
                if (currentMap.size === 0) continue;
                let hasFind = false;
                for (const [templateName, templateMat] of currentMap) {
                    //  保证模板的大小一定要小于等于目标Mat的，不然无法匹配。
                    if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) continue;

                    cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
                    const result = cv.minMaxLoc(resultMat, mask);

                    //console.log(`当前模板：${templateName},匹配相似度：${(result.maxVal * 100).toFixed(4)}%`)

                    if (result.maxVal >= THRESHOLD) {
                        //  匹配度高，说明已经找到了图片
                        //console.log(`模板已匹配！当前模板：${templateName}，匹配度：${(result.maxVal * 100).toFixed(4)}%`)
                        maxConfidence = result.maxVal
                        bestMatchEquip = Object.values(TFT_15_EQUIP_DATA).find(e => e.englishName.toLowerCase() === templateName.toLowerCase())
                        hasFind = true;
                        break;
                    }
                }
                if (hasFind) break;
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

    /**
     * 😺 新增：寻找最匹配的英雄 (兜底逻辑)
     */
    private findBestMatchChampionTemplate(targetMat: cv.Mat): string | null {
        let bestMatchName: string | null = null;
        let maxConfidence = 0;
        const THRESHOLD = 0.80; // 匹配阈值
        const mask = new cv.Mat()
        const resultMat = new cv.Mat();

        try {
            //  首先判断是否为空内容的图片。
            // 1. ⚡️ 快速空槽位检查：基于统计学 (Standard Deviation)
            // 既然空槽位几乎是纯色的 (标准差接近0)，有字的图片标准差很高 (比如46)
            // 我们直接算一下目标图片的标准差，根本不需要用 matchTemplate！
            const mean = new cv.Mat();
            const stddev = new cv.Mat();

            // 计算目标图片的均值和标准差
            cv.meanStdDev(targetMat, mean, stddev);
            const deviation = stddev.doubleAt(0, 0); // 获取第一个通道的标准差

            // 记得释放内存！
            mean.delete();
            stddev.delete();

            // 阈值设定：如果标准差小于 10，说明图片没什么内容（纯黑），直接判定为空
            if (deviation < 10) {
                // logger.info(`[TftOperator] 判定为空槽位 (stddev=${deviation.toFixed(2)})`);
                return "empty";
            }

            for (const [name, templateMat] of this.championTemplates) {
                // 尺寸检查：模板必须小于等于目标
                if (templateMat.rows > targetMat.rows || templateMat.cols > targetMat.cols) continue;

                // 模板匹配
                cv.matchTemplate(targetMat, templateMat, resultMat, cv.TM_CCOEFF_NORMED, mask);
                const result = cv.minMaxLoc(resultMat, mask);
                console.log(`英雄模板名：${name}，相似度：${(result.maxVal * 100).toFixed(3)}%`)

                if (result.maxVal >= THRESHOLD) {
                    //  匹配度高，说明已经找到了图片
                    maxConfidence = result.maxVal
                    bestMatchName = name
                    break;
                }
            }
            //  检查是否找到了
            if (bestMatchName) {
                logger.info(`[TftOperator] 🛡️ 模板匹配挽救成功: ${bestMatchName} (相似度 ${(maxConfidence * 100).toFixed(1)}%)`);
                return bestMatchName
            }
        } catch (e) {
            logger.error(`[TftOperator] 英雄模板匹配出错: ${e}`);
        } finally {
            resultMat.delete();
        }
        return null;
    }

    /**
     *  寻找某个英雄匹配的星级，模板来源为右键点击英雄，可以在右侧看到英雄的详细信息
     */
    private async findBestMatchStarLevel(targetMat: cv.Mat): Promise<1 | 2 | 3 | 4 | null> {
        // TODO: 实现

        return 1;
    }

    /**
     * 监听英雄模板文件夹变更
     */
    private setupChampionTemplateWatcher() {
        if (!fs.existsSync(this.championTemplatePath)) fs.ensureDirSync(this.championTemplatePath)
        let debounceTimer: NodeJS.Timeout
        fs.watch(this.championTemplatePath, (event, filename) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                logger.info(`[TftOperator] 检测到英雄模板变更 (${event}: ${filename})，重新加载英雄模板...`);
                this.loadChampionTemplates()
            }, 500);
        })
    }

    /**
     * region转换，把自己定义的simpleRegion转换成实际屏幕中的region
     */
    private getRealRegion(simpleRegion: {
        leftTop: { x: number, y: number },
        rightBottom: { x: number, y: number }
    }): Region {
        return new Region(this.gameWindowRegion.x + simpleRegion.leftTop.x,
            this.gameWindowRegion.y + simpleRegion.leftTop.y,
            simpleRegion.rightBottom.x - simpleRegion.leftTop.x,
            simpleRegion.rightBottom.y - simpleRegion.leftTop.y
        )
    }

}

//  一些不依赖实例属性的方法

//  将 "2-1" 这种字符串映射为游戏行为枚举
function parseStageStringToEnum(stageText: string): GameStageType {
    try {
        //  先判断是否是合法的字符串，如1-1,1-2什么的
        const cleanText = stageText.replace(/\s/g, "");
        const match = cleanText.match(/^(\d+)-(\d+)$/);
        if (!match) return GameStageType.UNKNOWN;
        const stage = parseInt(match[1]); // 大阶段 (如 2)
        const round = parseInt(match[2]); // 小回合 (如 1)

        //  根据stage和round判断当前阶段
        if (stage === 1) return GameStageType.PVE    //  第一阶段全是打野怪。
        if (round === 2) return GameStageType.AUGMENT  //  第二回合选择海克斯
        if (round === 4) return GameStageType.CAROUSEL  //  第四回合选秀
        if (round === 7) return GameStageType.PVE        //  第七回合打野怪
        return GameStageType.PVP    //  其他的阶段直接进行玩家对战，无额外内容
    } catch (e) {
        console.log(e)
        return GameStageType.UNKNOWN;
    }
}

export const tftOperator = TftOperator.getInstance();