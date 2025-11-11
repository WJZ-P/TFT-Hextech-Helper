//  游戏分辨率是1024x768
import {logger} from "./utils/Logger";
import {screen} from "electron";

//  自己定义一个简单的点类型
interface SimplePoint {
    x: number;
    y: number;
}

const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;

export enum ShopSLot {
    SHOP_SLOT_1
}


class TftOperator {
    private static instance: TftOperator;
    //  缓存游戏窗口的左上角坐标
    private gameWindowRegion: SimplePoint;

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

            this.gameWindowRegion = {x: originX, y: originY};

            logger.info(`[TftOperator] 屏幕尺寸: ${screenWidth}x${screenHeight}.`);
            logger.info(`[TftOperator] 游戏基准点 (0,0) 已计算在: (${originX}, ${originY})`);
            return true;

        } catch (e: any) {
            logger.error(`[TftOperator] 无法从 Electron 获取屏幕尺寸: ${e.message}`);
            return false;
        }
    }

    private async clickAt(offset: SimplePoint) {
        if (!this.gameWindowRegion) {
            logger.warn('[TftOperator] TftOperator 尚未初始化，正在尝试... (请确保 InGameRunningState 调用了 init)');
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
            const {mouse, Button, Point} = await import("@nut-tree-fork/nut-js");

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
}

export const tftOperator = TftOperator.getInstance();