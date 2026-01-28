/**
 * @file 鼠标控制器
 * @description 封装 nut-js 的鼠标操作，提供游戏内点击功能
 * @author TFT-Hextech-Helper
 */

import { Button, mouse, Point } from "@nut-tree-fork/nut-js";
import { logger } from "../../utils/Logger";
import { sleep } from "../../utils/HelperTools";
import { SimplePoint } from "../../TFTProtocol";

// 配置 nut-js 鼠标行为
//mouse.config.mouseSpeed = 2000; // 设置鼠标移动速度 (像素/秒)，模拟人类操作，避免瞬移被检测，暂时不开
// mouse.config.autoDelayMs = 10; // (可选) 设置每步操作的最小间隔

/**
 * 鼠标按键类型枚举
 * @description 对外暴露的按键类型，避免上层模块直接依赖 nut-js 的 Button 枚举
 *              使用枚举而非字符串字面量，提供更好的 IDE 智能提示和类型安全
 */
export enum MouseButtonType {
    /** 鼠标左键 */
    LEFT = 'left',
    /** 鼠标右键 */
    RIGHT = 'right',
}

/**
 * 将 MouseButtonType 枚举映射为 nut-js 的 Button 枚举
 * @param button 鼠标按键枚举值
 * @returns nut-js Button 枚举值
 */
function toNutButton(button: MouseButtonType): Button {
    return button === MouseButtonType.RIGHT ? Button.RIGHT : Button.LEFT;
}

/**
 * 鼠标操作配置
 */
const MOUSE_CONFIG = {
    /** 移动后等待时间 (ms) */
    MOVE_DELAY: 10,
    /** 点击后等待时间 (ms) */
    CLICK_DELAY: 20,
    /** 拖拽前等待时间 (ms) - 确保游戏识别到鼠标在棋子上，游戏25帧约40ms/帧 */
    PRE_DRAG_DELAY: 50,
} as const;

/**
 * 鼠标控制器
 * @description 单例模式，封装所有鼠标操作
 * 
 * 功能：
 * - 移动鼠标到指定位置
 * - 执行左键/右键点击
 * - 支持游戏窗口坐标偏移计算
 */
export class MouseController {
    private static instance: MouseController;

    /** 游戏窗口基准点 (左上角坐标) */
    private gameWindowOrigin: SimplePoint | null = null;

    private constructor() {}

    /**
     * 获取 MouseController 单例
     */
    public static getInstance(): MouseController {
        if (!MouseController.instance) {
            MouseController.instance = new MouseController();
        }
        return MouseController.instance;
    }

    /**
     * 设置游戏窗口基准点
     * @param origin 游戏窗口左上角坐标
     */
    public setGameWindowOrigin(origin: SimplePoint): void {
        this.gameWindowOrigin = origin;
        logger.info(`[MouseController] 游戏窗口基准点已设置: (${origin.x}, ${origin.y})`);
    }

    /**
     * 获取游戏窗口基准点
     */
    public getGameWindowOrigin(): SimplePoint | null {
        return this.gameWindowOrigin;
    }

    /**
     * 检查是否已初始化
     */
    public isInitialized(): boolean {
        return this.gameWindowOrigin !== null;
    }

    /**
     * 在游戏窗口内点击指定位置
     * @description 自动将游戏内相对坐标转换为屏幕绝对坐标
     * @param offset 相对于游戏窗口左上角的偏移坐标
     * @param button 鼠标按键类型 (默认 MouseButtonType.LEFT)
     * @throws 如果未初始化游戏窗口基准点
     */
    public async clickAt(offset: SimplePoint, button: MouseButtonType = MouseButtonType.LEFT): Promise<void> {
        if (!this.gameWindowOrigin) {
            throw new Error("[MouseController] 尚未设置游戏窗口基准点，请先调用 setGameWindowOrigin()");
        }

        // 计算屏幕绝对坐标
        const target = new Point(
            this.gameWindowOrigin.x + offset.x,
            this.gameWindowOrigin.y + offset.y
        );

        logger.debug(
            `[MouseController] 点击: (Origin: ${this.gameWindowOrigin.x},${this.gameWindowOrigin.y}) + ` +
            `(Offset: ${offset.x},${offset.y}) -> (Target: ${target.x},${target.y})`
        );

        try {
            // 1. 模拟人类移动轨迹 (反作弊)
            await mouse.move([target]);

            await sleep(MOUSE_CONFIG.MOVE_DELAY);
            await mouse.click(toNutButton(button));
            await sleep(MOUSE_CONFIG.CLICK_DELAY);
        } catch (e: any) {
            logger.error(`[MouseController] 鼠标点击失败: ${e.message}`);
            throw e;
        }
    }

    /**
     * 在游戏窗口内双击指定位置
     * @description 用于需要双击的操作 (如购买棋子时为了确保成功)
     * @param offset 相对于游戏窗口左上角的偏移坐标
     * @param button 鼠标按键类型 (默认 MouseButtonType.LEFT)
     * @param interval 两次点击之间的间隔 (ms)
     */
    public async doubleClickAt(
        offset: SimplePoint,
        button: MouseButtonType = MouseButtonType.LEFT,
        interval: number = 50
    ): Promise<void> {
        await this.clickAt(offset, button);
        await sleep(interval);
        await this.clickAt(offset, button);
    }

    /**
     * 移动鼠标到指定位置 (不点击)
     * @param offset 相对于游戏窗口左上角的偏移坐标
     */
    public async moveTo(offset: SimplePoint): Promise<void> {
        if (!this.gameWindowOrigin) {
            throw new Error("[MouseController] 尚未设置游戏窗口基准点");
        }

        const target = new Point(
            this.gameWindowOrigin.x + offset.x,
            this.gameWindowOrigin.y + offset.y
        );

        try {
            await mouse.move([target]);
            await sleep(MOUSE_CONFIG.MOVE_DELAY);
        } catch (e: any) {
            logger.error(`[MouseController] 鼠标移动失败: ${e.message}`);
            throw e;
        }
    }

    /**
     * 在屏幕绝对坐标点击
     * @description 用于不需要游戏窗口偏移的场景
     * @param position 屏幕绝对坐标
     * @param button 鼠标按键类型 (默认 MouseButtonType.LEFT)
     */
    public async clickAtAbsolute(position: SimplePoint, button: MouseButtonType = MouseButtonType.LEFT): Promise<void> {
        try {
            // nut-js mouse.move expects Point[]
            const target = new Point(position.x, position.y);
            
            // 1. 模拟人类移动轨迹
            await mouse.move([target]);

            await sleep(MOUSE_CONFIG.MOVE_DELAY);
            await mouse.click(toNutButton(button));
            await sleep(MOUSE_CONFIG.CLICK_DELAY);
        } catch (e: any) {
            logger.error(`[MouseController] 鼠标点击失败: ${e.message}`);
            throw e;
        }
    }

    /**
     * 拖拽操作：从起点拖动到终点
     * @description 用于移动棋子（从备战席到棋盘、棋盘内调整位置等）
     *              TFT 中拖拽棋子的操作流程：
     *              1. 移动鼠标到起点
     *              2. 按下左键
     *              3. 移动鼠标到终点
     *              4. 释放左键
     * 
     * @param from 起点坐标（相对于游戏窗口）
     * @param to 终点坐标（相对于游戏窗口）
     * @param holdDelay 按下鼠标后等待的时间（ms），确保游戏识别到拖拽开始
     * @param moveDelay 移动过程中的延迟（ms），模拟人类拖拽速度
     */
    public async drag(
        from: SimplePoint,
        to: SimplePoint,
        holdDelay: number = 50,
        moveDelay: number = 50
    ): Promise<void> {
        if (!this.gameWindowOrigin) {
            throw new Error("[MouseController] 尚未设置游戏窗口基准点，请先调用 setGameWindowOrigin()");
        }

        // 计算屏幕绝对坐标
        const fromAbs = new Point(
            this.gameWindowOrigin.x + from.x,
            this.gameWindowOrigin.y + from.y
        );
        const toAbs = new Point(
            this.gameWindowOrigin.x + to.x,
            this.gameWindowOrigin.y + to.y
        );

        logger.info(
            `[MouseController] 拖拽: (${from.x},${from.y}) -> (${to.x},${to.y})`
        );

        try {
            await mouse.move([fromAbs]);
            // 等待游戏识别鼠标位置（游戏25帧，需要足够时间识别棋子悬停）
            await sleep(MOUSE_CONFIG.PRE_DRAG_DELAY);

            // 2. 按下左键（不释放）
            await mouse.pressButton(Button.LEFT);
            await sleep(holdDelay);

            // 3. 移动到终点
            await mouse.move([toAbs]);
            await sleep(moveDelay);

            // 4. 释放左键
            await mouse.releaseButton(Button.LEFT);
            await sleep(MOUSE_CONFIG.CLICK_DELAY);

            logger.debug("[MouseController] 拖拽完成");
        } catch (e: any) {
            // 确保异常时释放鼠标按键，避免鼠标卡住
            try {
                await mouse.releaseButton(Button.LEFT);
            } catch {
                // 忽略释放失败
            }
            logger.error(`[MouseController] 拖拽失败: ${e.message}`);
            throw e;
        }
    }
}

/** MouseController 单例导出 */
export const mouseController = MouseController.getInstance();
