/**
 * @file 窗口查找助手
 * @description 使用 nut-js 的窗口 API 查找 LOL 游戏窗口位置
 *              用于替代"假设窗口居中"的方案，提高窗口识别的健壮性
 * @author TFT-Hextech-Helper
 */

import { getWindows } from "@nut-tree-fork/nut-js";
import { logger } from "./Logger";

/**
 * 窗口信息接口
 * @property title - 窗口标题
 * @property left - 窗口左边界 X 坐标（物理像素）
 * @property top - 窗口上边界 Y 坐标（物理像素）
 * @property width - 窗口宽度（物理像素）
 * @property height - 窗口高度（物理像素）
 */
export interface WindowInfo {
    title: string;
    left: number;
    top: number;
    width: number;
    height: number;
}

/**
 * LOL 游戏窗口的可能标题
 * @description LOL 游戏窗口的标题会因客户端语言而不同：
 *              - 中文客户端："League of Legends"
 *              - 英文客户端："League of Legends"
 *              - 某些情况下可能带有 "(TM) Client" 后缀
 */
const LOL_WINDOW_TITLES = [
    //"League of Legends",           // 这个是UX
    "League of Legends (TM) Client", // 带有商标后缀
];

/**
 * TFT 游戏窗口的最小尺寸阈值
 * @description 用于过滤掉任务栏图标等小窗口
 *              真正的游戏窗口至少是 1024x768
 */
const MIN_GAME_WINDOW_WIDTH = 800;
const MIN_GAME_WINDOW_HEIGHT = 600;

/**
 * 窗口查找助手类
 * @description 封装 nut-js 的窗口 API，提供查找 LOL 游戏窗口的功能
 */
class WindowHelper {
    /**
     * 查找 LOL 游戏窗口
     * @description 遍历所有窗口，查找标题包含 "League of Legends" 且尺寸足够大的窗口
     *              nut-js 的 getWindows() 返回的是物理像素坐标，不需要额外的 DPI 转换
     * @returns 找到的游戏窗口信息，如果没找到则返回 null
     */
    public async findLOLWindow(): Promise<WindowInfo | null> {
        try {
            // 获取所有窗口
            const windows = await getWindows();
            logger.debug(`[WindowHelper] 找到 ${windows.length} 个窗口`);

            // 遍历查找 LOL 窗口
            for (const window of windows) {
                try {
                    const title = await window.title;
                    
                    // 检查窗口标题是否匹配
                    const isLOLWindow = LOL_WINDOW_TITLES.some(
                        lolTitle => title && title.includes(lolTitle)
                    );

                    if (!isLOLWindow) continue;

                    // 获取窗口区域（物理像素）
                    const region = await window.region;
                    
                    // 过滤掉太小的窗口（如任务栏图标）
                    if (region.width < MIN_GAME_WINDOW_WIDTH || 
                        region.height < MIN_GAME_WINDOW_HEIGHT) {
                        logger.debug(
                            `[WindowHelper] 跳过小窗口: ${title} (${region.width}x${region.height})`
                        );
                        continue;
                    }

                    // 找到了有效的游戏窗口！
                    const windowInfo: WindowInfo = {
                        title: title,
                        left: region.left,
                        top: region.top,
                        width: region.width,
                        height: region.height,
                    };

                    logger.info(
                        `[WindowHelper] 找到 LOL 窗口: "${title}" ` +
                        `位置: (${region.left}, ${region.top}) ` +
                        `尺寸: ${region.width}x${region.height}`
                    );

                    return windowInfo;
                } catch (innerError: any) {
                    // 某些窗口可能无法获取标题或区域，跳过
                    continue;
                }
            }

            // 没有找到匹配的窗口
            logger.warn("[WindowHelper] 未找到 LOL 游戏窗口，检测名称为League of Legends (TM) Client，若外服客户端不为此标题，请联系开发者处理。");
            return null;

        } catch (error: any) {
            logger.error(`[WindowHelper] 查找窗口失败: ${error.message}`);
            return null;
        }
    }

    /**
     * 查找 LOL 游戏窗口并返回游戏区域的左上角坐标
     * @description 便捷方法，直接返回可用于截图计算的坐标
     * @returns { x, y } 坐标对象，如果没找到则返回 null
     */
    public async findLOLWindowOrigin(): Promise<{ x: number; y: number } | null> {
        const windowInfo = await this.findLOLWindow();
        if (windowInfo) {
            return { x: windowInfo.left, y: windowInfo.top };
        }
        return null;
    }
}

// 导出单例
export const windowHelper = new WindowHelper();
