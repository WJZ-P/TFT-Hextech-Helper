//  游戏分辨率是1024x768
import {mouse, Button, Point, Region} from "@nut-tree-fork/nut-js";
import {logger} from "./utils/Logger";
import { screen } from "electron";

const GAME_WIDTH = 1024;
const GAME_HEIGHT = 768;

export enum ShopSLot{
    SHOP_SLOT_1
}


class TftOperator {
    private static instance: TftOperator;
    //  缓存游戏窗口的左上角坐标
    private gameWindowRegion: Point;

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
            const { width: screenWidth, height: screenHeight } = primaryDisplay.size;
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

    private async clickAt(offset: Point) {

    }
}

export const tftOperator = TftOperator.getInstance();