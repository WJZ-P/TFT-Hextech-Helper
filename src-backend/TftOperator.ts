//  游戏分辨率是1024x768
import {logger} from "./utils/Logger";

//  自己定义一个简单的点类型
interface SimplePoint {
    x: number;
    y: number;
}

//  简单的Region定义
interface SimpleRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}

const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;

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
//  游戏战斗阶段展示坐标，如1-2，1-3等
const gameStageDisplay = {
    leftTop: {x: 374, y: 6},
    rightBottom: {x: 403, y: 22}
}

class TftOperator {
    private static instance: TftOperator;
    //  缓存游戏窗口的左上角坐标
    private gameWindowRegion: SimplePoint | null;
    // 用来判断游戏阶段的Worker
    private gameStageWorker: any | null = null; //  必须动态导入，没法写类型

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
            const primaryDisplay = Electron.screen.getPrimaryDisplay();
            const {width: screenWidth, height: screenHeight} = primaryDisplay.size;
            // b. (关键) 计算屏幕中心
            const screenCenterX = screenWidth / 2;
            const screenCenterY = screenHeight / 2;

            // c. (关键) 计算游戏窗口的左上角 (0,0) 点
            const originX = screenCenterX - (GAME_WIDTH / 2);
            const originY = screenCenterY - (GAME_HEIGHT / 2);

            this.gameWindowRegion = {x: originX, y: originY};

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
            const gameStageRegion = this.getStageAbsoluteRegion()
            // ✨ 3. (重要!) 动态导入 nut-js 的 CJS 方式
            //    因为这是一个 CJS 文件，nut-js 终于可以开心地找到 __dirname 了！
            const { screen: nutScreen, Region } = await import("@nut-tree-fork/nut-js");
            //  选定坐标并截图
            const nutRegion = new Region(gameStageRegion.x, gameStageRegion.y, gameStageRegion.width, gameStageRegion.height);
            const screenshot = await nutScreen.grabRegion(nutRegion);
            //  截图结果转buffer识别
            const recognizeResult = await worker.recognize(screenshot.data)
            console.log('[TftOperator] gameStage识别成功：' + recognizeResult.data)

        } catch (e: any) {
            logger.error(`[TftOperator] nut-js textFinder 失败: ${e.message}`);
            logger.error("请确保 @nut-tree/plugin-ocr 已正确安装和配置！");
            return null;
        }
    }


    //  处理点击事件
    private async clickAt(offset: SimplePoint) {
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
            // ✨ 7. (核心) 在“运行时”动态导入 nut-js！ ✨
            // 此时 __dirname 垫片早已运行完毕
            const {mouse, Button, Point} = await require("@nut-tree-fork/nut-js");

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
    private getStageAbsoluteRegion(): SimpleRegion {
        if (!this.gameWindowRegion) {
            logger.error("[TftOperator] 尝试在 init() 之前计算 Region！");
            // 抛出一个错误或者返回一个默认值，取决于你的健壮性需求
            // 这里我们先假设 init() 总是先被调用
            if (!this.init()) {
                throw new Error("[TftOperator] 未初始化，请先调用 init()");
            }
        }

        const originX = this.gameWindowRegion!.x;
        const originY = this.gameWindowRegion!.y;

        // nut-js 的 Region(x, y, width, height)
        const x = Math.round(originX + gameStageDisplay.leftTop.x);
        const y = Math.round(originY + gameStageDisplay.leftTop.y);
        const width = Math.round(gameStageDisplay.rightBottom.x - gameStageDisplay.leftTop.x);
        const height = Math.round(gameStageDisplay.rightBottom.y - gameStageDisplay.leftTop.y);

        // ✨ 3. (修改) 返回我们自己的“简单”对象，而不是 nut-js 的 Region
        return {x, y, width, height};
    }

    //  一个懒加载的 Tesseract worker
    private async getGameStageWorker(): Promise<any> {
        if (this.gameStageWorker) return this.gameStageWorker;
        logger.info("[TftOperator] 正在创建 Tesseract worker...");
        // ✅ 动态导入 tesseract.js
        const { createWorker, PSM } = await import("tesseract.js");
        const worker = await createWorker('eng', 1, {
            logger: m => logger.info(`[Tesseract] ${m.status}: ${Math.round(m.progress * 100)}%`)
        })
        await worker.setParameters({
            tessedit_char_whitelist: '0123456789-',
            tessedit_pageseg_mode: PSM.SINGLE_LINE,    //  图片排版模式为简单的单行
        })
        this.gameStageWorker = worker;
        logger.info("[TftOperator] Tesseract worker 准备就绪！");
        return this.gameStageWorker;
    }

}

export const tftOperator = TftOperator.getInstance();