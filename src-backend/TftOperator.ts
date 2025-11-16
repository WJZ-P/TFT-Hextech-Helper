// //  游戏分辨率是1024x768
import {logger} from "./utils/Logger";
import {Button, mouse, Point, Region, screen as nutScreen} from "@nut-tree-fork/nut-js"
import Tesseract, {createWorker, PSM} from "tesseract.js";
import {screen} from 'electron';
import path from "path";
import sharp from 'sharp';
import fs from "fs-extra";
import {sleep} from "./utils/HelperTools";

const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;

//  当前下棋的游戏模式
enum GAME_TYPE {
    CLASSIC,    //  经典
    CLOCKWORK_TRAILS    //  PVE，发条鸟的试炼。
}

//  英雄购买槽坐标
const shopSlot = {
    SHOP_SLOT_1: {x: 240, y: 700},
    SHOP_SLOT_2: {x: 380, y: 700},
    SHOP_SLOT_3: {x: 520, y: 700},
    SHOP_SLOT_4: {x: 660, y: 700},
    SHOP_SLOT_5: {x: 800, y: 700},
}
//  装备槽位坐标
const equipmentSlot = {
    EQ_SLOT_1: {x: 20, y: 210},//+35
    EQ_SLOT_2: {x: 20, y: 245},
    EQ_SLOT_3: {x: 20, y: 280},
    EQ_SLOT_4: {x: 20, y: 315},
    EQ_SLOT_5: {x: 20, y: 350},
    EQ_SLOT_6: {x: 20, y: 385},
    EQ_SLOT_7: {x: 20, y: 430},//   这里重置下准确位置
    EQ_SLOT_8: {x: 20, y: 465},
    EQ_SLOT_9: {x: 20, y: 500},
    EQ_SLOT_10: {x: 20, y: 535},
}

//  选秀站位，为离自己最近的棋子位置。
const sharedDraftPoint = {x: 530, y: 400}
//  游戏战斗阶段展示坐标，第一阶段。因为第一阶段只有四个回合，跟其他阶段的不一样。
const gameStageDisplayStageOne = {
    leftTop: {x: 411, y: 6},
    rightBottom: {x: 442, y: 22}
}
//  游戏战斗阶段展示坐标，从2-1开始。
const gameStageDisplayNormal = {
    leftTop: {x: 374, y: 6},
    rightBottom: {x: 403, y: 22}
}
//  发条鸟的战斗阶段，布局跟其他的都不一样，因为发条鸟一个大阶段有10场
const gameStageDisplayTheClockworkTrails = {
    leftTop: {x: 337, y: 6},
    rightBottom: {x: 366, y: 22}
}

class TftOperator {
    private static instance: TftOperator;
    //  缓存游戏窗口的左上角坐标
    private gameWindowRegion: Point | null;
    // 用来判断游戏阶段的Worker
    private gameStageWorker: Tesseract.Worker | null = null;
    private gameType: GAME_TYPE;

    private constructor() {
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
     * 购买指定槽位的棋子
     * @param slot 槽位编号 (1, 2, 3, 4, 或 5)
     */
    public async buyAtSlot(slot: number): Promise<void> {
        const slotKey = `SHOP_SLOT_${slot}` as keyof typeof shopSlot
        const targetSlotCoords = shopSlot[slotKey];

        // 3. (健壮性) 检查这个坐标是否存在
        //    如果 slot 是 6, "SHOP_SLOT_6" 不存在, targetSlotCoords 就会是 undefined
        //    这完美地替代了 "default" 分支！
        if (!targetSlotCoords) {
            logger.error(`[TftOperator] 尝试购买一个无效的槽位: ${slot}。只接受 1-5。`);
            return;
        }

        // 3. (核心) 将我们自己的坐标 {x, y} 转换为 nut-js 需要的 Point 对象
        const targetPoint = new Point(
            targetSlotCoords.x,
            targetSlotCoords.y
        );

        logger.info(`[TftOperator] 正在购买棋子，槽位：${slot}...`);
        //  为了健壮，买棋子的时候点两次，避免买不上
        await this.clickAt(targetPoint);
        await sleep(100)
        await this.clickAt(targetPoint);
    }


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

    // ======================================
    // 工具函数：截图某区域并输出 PNG buffer
    // ======================================
    private async captureRegionAsPng(region: Region): Promise<Buffer> {
        const screenshot = await nutScreen.grabRegion(region);

        // 识别前：原始像素数据转换成 PNG
        return await sharp(screenshot.data, {
            raw: {
                width: screenshot.width,
                height: screenshot.height,
                channels: 4, // RGBA 四通道
            }
        })
            .removeAlpha()      // nut-js 截图为 BGRA，移除 alpha 防止通道错乱
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
}

export const tftOperator = TftOperator.getInstance();