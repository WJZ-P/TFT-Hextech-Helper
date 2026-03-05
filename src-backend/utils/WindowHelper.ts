/**
 * @file 窗口查找助手
 * @description 使用 nut-js 的窗口 API 查找 LOL 游戏窗口位置
 *              用于替代"假设窗口居中"的方案，提高窗口识别的健壮性
 * @author TFT-Hextech-Helper
 */

import { getActiveWindow, getWindows } from "@nut-tree-fork/nut-js";
import { logger } from "./Logger";
import { GameClient } from "./SettingsStore";

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

const RIOT_PC_WINDOW_TITLES = [
    "League of Legends (TM) Client",
    "League of Legends",
    "League of Legends Client",
];

/**
 * 安卓模拟器中的 TFT 窗口标题
 * @description 同时兼容国服(金铲铲/云顶)与国际服(TFT/Teamfight Tactics)的可见标题。
 *              某些模拟器（如 MuMu / BlueStacks / LDPlayer）在对局时可见标题
 *              仍是模拟器名称，因此保留这些关键字作为兜底。
 */
const ANDROID_WINDOW_TITLES = [
    "金铲铲之战",
    "云顶之弈",
    "TFT",
    "Teamfight Tactics",
    "MuMu",
    "BlueStacks",
    "LDPlayer",
    "Nox",
    "雷电",
    "夜神",
];

/**
 * 安卓窗口识别排除关键词
 * @description 避免把本工具窗口（标题里包含 TFT）误识别成游戏窗口。
 */
const ANDROID_WINDOW_EXCLUDE_TITLES = [
    "tft-hextech-helper",
    "hextech helper",
    "keymap overlay",
    "overlay",
    "notificationareaiconwindowclass",
];

/**
 * 安卓弱候选关键词
 * @description services/helper 等窗口通常不是用户可见主窗口，降级为兜底候选。
 */
const ANDROID_WEAK_WINDOW_TITLES = [
    "services",
    "service",
    "helper",
];

const ANDROID_ACTIVE_WINDOW_HINT_TITLES = [
    "bluestacks",
    "app player",
    "mumu",
    "ldplayer",
    "nox",
    "teamfight",
    "tft",
    "金铲",
    "云顶",
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
     * 为候选窗口打分（分数越高越优先）
     */
    private scoreWindow(windowInfo: WindowInfo, clientType: GameClient): number {
        const title = windowInfo.title.toLowerCase();
        const area = windowInfo.width * windowInfo.height;
        let score = 0;

        if (clientType === GameClient.RIOT_PC) {
            if (title === "league of legends (tm) client".toLowerCase()) score += 300;
            if (title.includes("league of legends")) score += 200;
            score += area / 100000;
            return score;
        }

        // 安卓端：优先真实游戏标题和 4:3 比例窗口
        if (title.includes("金铲铲") || title.includes("云顶")) score += 260;
        if (title.includes("teamfight tactics")) score += 260;
        if (title.includes("app player")) score += 240;
        if (title.includes("bluestacks")) score += 80;
        if (title.includes("bluestacks-services")) score -= 160;
        if (title.includes("helper") || title.includes("service")) score -= 20;

        const ratio = windowInfo.width / Math.max(1, windowInfo.height);
        const ratioDiff = Math.abs(ratio - 4 / 3);
        if (ratioDiff < 0.02) score += 220;
        else if (ratioDiff < 0.05) score += 150;
        else if (ratioDiff < 0.10) score += 80;
        else score -= 60;

        score += area / 80000;
        return score;
    }

    /**
     * 查找所有候选窗口（按优先级排序）
     */
    public async findLOLWindows(clientType: GameClient = GameClient.RIOT_PC): Promise<WindowInfo[]> {
        const titleList = clientType === GameClient.ANDROID ? ANDROID_WINDOW_TITLES : RIOT_PC_WINDOW_TITLES;
        const normalizedTitles = titleList.map((title) => title.toLowerCase());
        const isAndroidClient = clientType === GameClient.ANDROID;
        try {
            const windows = await getWindows();
            logger.debug(`[WindowHelper] 找到 ${windows.length} 个窗口`);
            let activeWindowTitle = "";
            let activeWindowRegion: { left: number; top: number; width: number; height: number } | null = null;
            try {
                const activeWindow = await getActiveWindow();
                activeWindowTitle = ((await activeWindow.title) || "").toLowerCase();
                const region = await activeWindow.region;
                activeWindowRegion = {
                    left: region.left,
                    top: region.top,
                    width: region.width,
                    height: region.height,
                };
            } catch {
                activeWindowTitle = "";
                activeWindowRegion = null;
            }
            if (isAndroidClient && activeWindowTitle) {
                logger.debug(
                    `[WindowHelper] 当前激活窗口: "${activeWindowTitle}" ` +
                    `${activeWindowRegion ? `(${activeWindowRegion.width}x${activeWindowRegion.height})` : ""}`
                );
            }

            const candidates: Array<{ info: WindowInfo; score: number }> = [];
            const weakCandidates: Array<{ info: WindowInfo; score: number }> = [];
            const minWidth = isAndroidClient ? 500 : MIN_GAME_WINDOW_WIDTH;
            const minHeight = isAndroidClient ? 300 : MIN_GAME_WINDOW_HEIGHT;

            for (const window of windows) {
                try {
                    const title = await window.title;
                    if (!title) continue;

                    const normalizedWindowTitle = title.toLowerCase();

                    if (
                        isAndroidClient &&
                        ANDROID_WINDOW_EXCLUDE_TITLES.some((kw) => normalizedWindowTitle.includes(kw))
                    ) {
                        continue;
                    }

                    const isTargetWindow = normalizedTitles.some(
                        (candidateTitle) => normalizedWindowTitle.includes(candidateTitle)
                    );
                    if (!isTargetWindow) continue;

                    const region = await window.region;
                    if (
                        region.width < minWidth ||
                        region.height < minHeight ||
                        region.width <= 0 ||
                        region.height <= 0
                    ) {
                        logger.debug(
                            `[WindowHelper] 跳过小窗口: ${title} (${region.width}x${region.height})`
                        );
                        continue;
                    }

                    const info: WindowInfo = {
                        title,
                        left: region.left,
                        top: region.top,
                        width: region.width,
                        height: region.height,
                    };

                    const score = this.scoreWindow(info, clientType);
                    const isWeakAndroidCandidate =
                        isAndroidClient &&
                        ANDROID_WEAK_WINDOW_TITLES.some((kw) => normalizedWindowTitle.includes(kw));

                    let withActiveBonus = score;
                    if (activeWindowTitle && normalizedWindowTitle === activeWindowTitle) {
                        withActiveBonus += 600;
                        if (activeWindowRegion) {
                            // 同名窗口（如 BlueStacks 子窗口）可能有多个，优先坐标/尺寸最接近当前激活窗口的候选
                            const delta =
                                Math.abs(region.left - activeWindowRegion.left) +
                                Math.abs(region.top - activeWindowRegion.top) +
                                Math.abs(region.width - activeWindowRegion.width) +
                                Math.abs(region.height - activeWindowRegion.height);

                            withActiveBonus += Math.max(0, 500 - delta * 0.5);
                            if (delta === 0) {
                                withActiveBonus += 400;
                            }
                        }
                    }

                    if (isWeakAndroidCandidate) {
                        weakCandidates.push({ info, score: withActiveBonus });
                    } else {
                        candidates.push({ info, score: withActiveBonus });
                    }
                } catch {
                    continue;
                }
            }

            // 安卓端额外兜底：把当前激活窗口强制纳入候选（即便标题未命中关键词）
            if (
                isAndroidClient &&
                activeWindowTitle &&
                activeWindowRegion &&
                activeWindowRegion.width >= minWidth &&
                activeWindowRegion.height >= minHeight &&
                ANDROID_ACTIVE_WINDOW_HINT_TITLES.some((kw) => activeWindowTitle.includes(kw)) &&
                !ANDROID_WINDOW_EXCLUDE_TITLES.some((kw) => activeWindowTitle.includes(kw))
            ) {
                const alreadyIncluded = [...candidates, ...weakCandidates].some(
                    (c) =>
                        c.info.title.toLowerCase() === activeWindowTitle &&
                        c.info.left === activeWindowRegion.left &&
                        c.info.top === activeWindowRegion.top
                );

                if (!alreadyIncluded) {
                    const activeInfo: WindowInfo = {
                        title: activeWindowTitle,
                        left: activeWindowRegion.left,
                        top: activeWindowRegion.top,
                        width: activeWindowRegion.width,
                        height: activeWindowRegion.height,
                    };
                    const activeScore = this.scoreWindow(activeInfo, clientType) + 1200;
                    candidates.push({ info: activeInfo, score: activeScore });
                }
            }

            if (candidates.length === 0 && weakCandidates.length === 0) {
                logger.warn("[WindowHelper] 未找到可识别的游戏窗口。请确认客户端已进入对局且窗口未最小化。");
                return [];
            }

            const finalCandidates = candidates.length > 0 ? candidates : weakCandidates;
            if (candidates.length === 0 && weakCandidates.length > 0 && isAndroidClient) {
                logger.warn("[WindowHelper] 安卓端仅找到弱候选窗口（services/helper），可能导致识别不稳定");
            }

            finalCandidates.sort((a, b) => b.score - a.score);
            const sorted = finalCandidates.map((item) => item.info);

            if (isAndroidClient) {
                const preview = finalCandidates
                    .slice(0, 5)
                    .map((c) => `"${c.info.title}"(${c.info.width}x${c.info.height}, score=${c.score.toFixed(1)})`)
                    .join(" | ");
                logger.info(`[WindowHelper] 安卓候选窗口: ${preview}`);
            }

            return sorted;
        } catch (error: any) {
            logger.error(`[WindowHelper] 查找窗口失败: ${error.message}`);
            return [];
        }
    }

    /**
     * 查找 LOL 游戏窗口
     * @description 遍历所有窗口，查找标题包含指定关键字且尺寸足够大的窗口。
     *              PC 客户端匹配 League of Legends 窗口标题；
     *              安卓客户端匹配国服与国际服游戏标题，并支持常见模拟器标题兜底。
     * @param clientType 客户端类型，用于选择匹配的标题列表
     * @returns 找到的游戏窗口信息，如果没找到则返回 null
     */
    public async findLOLWindow(clientType: GameClient = GameClient.RIOT_PC): Promise<WindowInfo | null> {
        const windows = await this.findLOLWindows(clientType);
        const selected = windows[0] ?? null;
        if (selected) {
            logger.info(
                `[WindowHelper] 找到 LOL 窗口: "${selected.title}" ` +
                `位置: (${selected.left}, ${selected.top}) ` +
                `尺寸: ${selected.width}x${selected.height}`
            );
        }
        return selected;
    }

    /**
     * 查找 LOL 游戏窗口并返回游戏区域的左上角坐标
     * @description 便捷方法，直接返回可用于截图计算的坐标
     * @param clientType 客户端类型，用于选择匹配的标题列表
     * @returns { x, y } 坐标对象，如果没找到则返回 null
     */
    public async findLOLWindowOrigin(clientType: GameClient = GameClient.RIOT_PC): Promise<{ x: number; y: number } | null> {
        const windowInfo = await this.findLOLWindow(clientType);
        if (windowInfo) {
            return { x: windowInfo.left, y: windowInfo.top };
        }
        return null;
    }
}

// 导出单例
export const windowHelper = new WindowHelper();
