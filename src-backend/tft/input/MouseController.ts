/**
 * @file 鼠标控制器
 * @description 封装 nut-js 的鼠标操作，提供游戏内点击功能
 * @author TFT-Hextech-Helper
 */

import { Button, mouse, Point, providerRegistry } from "@nut-tree-fork/nut-js";
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
    PRE_DRAG_DELAY: 100,
} as const;

/** 游戏的一帧 (ms)，按 30 帧算 */
export const FRAME_MS = 34;

/** 拖拽的节奏 */
export interface DragOptions {
    /** 按下之前在起点悬停的时间 (ms) */
    hoverDelay?: number;
    /** 按下之后、开始移动之前按住的时间 (ms)，确保游戏识别到拖拽开始 */
    holdDelay?: number;
    /** 从起点移动到终点分成几步，每步约 1ms；1 表示直接跳过去 */
    moveSteps?: number;
    /** 到达终点之后、松开之前等待的时间 (ms) */
    moveDelay?: number;
}

/**
 * 拖装备用的节奏
 * @description 虚幻客户端的装备要悬停、按住一会儿才会被拿起来
 */
export const EQUIP_DRAG_OPTIONS: DragOptions = {
    hoverDelay: 300,
    holdDelay: 300,
    moveSteps: 10,
    moveDelay: 150,
};

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
            await this.pressAndRelease(toNutButton(button));
            await sleep(MOUSE_CONFIG.CLICK_DELAY);
        } catch (e: any) {
            logger.error(`[MouseController] 鼠标点击失败: ${e.message}`);
            throw e;
        }
    }

    /**
     * 在游戏窗口内快速点击指定位置，按游戏的帧来计时
     * @description 悬停 1 帧、按住 2 帧就抬起，抬起后不等待，适合连续点很多个位置。
     *              直接用底层的按键接口，跳过 nut-js 每次按下、抬起前的 autoDelayMs（默认 100ms）
     * @param offset 相对于游戏窗口左上角的偏移坐标
     * @param button 鼠标按键类型
     */
    public async clickInFrames(offset: SimplePoint, button: MouseButtonType): Promise<void> {
        await this.holdAt(offset, button, () => sleep(FRAME_MS * 2));
    }

    /**
     * 在游戏窗口内指定位置按住鼠标，做完 action 再抬起
     * @param offset 相对于游戏窗口左上角的偏移坐标
     * @param button 鼠标按键类型
     * @param action 按住期间要做的事
     * @returns action 的结果
     */
    public async holdAt<T>(offset: SimplePoint, button: MouseButtonType, action: () => Promise<T>): Promise<T> {
        if (!this.gameWindowOrigin) {
            throw new Error("[MouseController] 尚未设置游戏窗口基准点，请先调用 setGameWindowOrigin()");
        }

        const nutButton = toNutButton(button);
        const mouseProvider = providerRegistry.getMouse();

        try {
            await mouse.move([new Point(this.gameWindowOrigin.x + offset.x, this.gameWindowOrigin.y + offset.y)]);
            await sleep(FRAME_MS);

            await mouseProvider.pressButton(nutButton);
            try {
                return await action();
            } finally {
                // 抬起失败再试一次，避免按键一直卡在按下状态
                await mouseProvider.releaseButton(nutButton).catch(() => mouseProvider.releaseButton(nutButton));
            }
        } catch (e: any) {
            logger.error(`[MouseController] 鼠标点击失败: ${e.message}`);
            throw e;
        }
    }

    /**
     * 按下并抬起鼠标按键
     * @description 不用 mouse.click()：它把按下和抬起连着发出去，中间没有间隔。虚幻客户端的界面按钮能响应，
     *              但场景里的操作（右键查看棋子、右键移动小小英雄）要在某一帧看到键是按着的，
     *              两个事件落在同一帧里就会被漏掉。
     *              nut-js 的 pressButton / releaseButton 各自会先等 autoDelayMs（默认 100ms），
     *              所以按住的时间约 100ms，不需要再额外等待
     */
    private async pressAndRelease(button: Button): Promise<void> {
        await mouse.pressButton(button);
        try {
            await mouse.releaseButton(button);
        } catch (e) {
            // 抬起失败再试一次，避免按键一直卡在按下状态
            await mouse.releaseButton(button);
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
            await this.pressAndRelease(toNutButton(button));
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
     * @param options 拖拽的节奏，默认适合拖棋子
     */
    public async drag(
        from: SimplePoint,
        to: SimplePoint,
        options: DragOptions = {}
    ): Promise<void> {
        const { hoverDelay = MOUSE_CONFIG.PRE_DRAG_DELAY, holdDelay = 50, moveSteps = 1, moveDelay = 100 } = options;

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
            await sleep(hoverDelay);

            // 2. 按下左键（不释放）
            await mouse.pressButton(Button.LEFT);
            await sleep(holdDelay);

            // 3. 移动到终点
            // 每个点之间由 nut-js 等待约 1ms（mouseSpeed 默认 1000）。不用 sleep，Windows 上它最短约 15ms
            await mouse.move(Array.from({ length: moveSteps }, (_, i) => {
                const progress = (i + 1) / moveSteps;
                return new Point(
                    Math.round(fromAbs.x + (toAbs.x - fromAbs.x) * progress),
                    Math.round(fromAbs.y + (toAbs.y - fromAbs.y) * progress)
                );
            }));
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
