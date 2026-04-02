/**
 * @file StageValidator — 阶段进度验证模块
 * @description 本模块提供 TFT 阶段进度的验证功能，确保 OCR 识别的阶段信息符合游戏规则。
 *
 * TFT 阶段规则:
 * - 阶段格式: "X-Y" (X = 章节, Y = 回合)
 * - 章节 1: 回合 1-4 (野怪回合)
 * - 章节 2-7: 回合 1-7 (每个回合有 PvP 和 PvE)
 * - 最大阶段: 7-4
 *
 * @example
 * ```typescript
 * const isValid = validateStageProgression("2-1", "1-4"); // true
 * const nextStages = getValidNextStages("2-1"); // ["2-2", "2-3", ...]
 * ```
 */

import { extractLikelyStageText } from "../tft/recognition/RecognitionUtils";

/**
 * 阶段信息 — 解析后的阶段数据
 */
export interface StageInfo {
    /** 章节号 (1-7) */
    chapter: number;
    /** 回合号 (1-7) */
    round: number;
    /** 原始格式字符串 (如 "2-1") */
    raw: string;
    /** 是否有效 */
    isValid: boolean;
}

/**
 * 阶段转换结果
 */
export interface StageTransitionResult {
    /** 是否是有效的转换 */
    isValid: boolean;
    /** 如果无效，错误原因 */
    reason?: string;
    /** 当前阶段 */
    from?: StageInfo;
    /** 目标阶段 */
    to?: StageInfo;
}

/**
 * 所有有效阶段列表
 */
export const ALL_VALID_STAGES: string[] = [];

// 生成所有有效阶段
for (let chapter = 1; chapter <= 7; chapter += 1) {
    const maxRound = chapter === 1 ? 4 : 7;
    for (let round = 1; round <= maxRound; round += 1) {
        ALL_VALID_STAGES.push(`${chapter}-${round}`);
    }
}

/**
 * 解析阶段字符串为阶段信息
 *
 * @param stageText 阶段字符串 (如 "2-1")
 * @returns 解析后的阶段信息
 */
export function parseStage(stageText: string): StageInfo {
    if (!stageText) {
        return { chapter: 0, round: 0, raw: "", isValid: false };
    }

    // 规范化输入: 允许不同的分隔符
    const normalized = stageText
        .replace(/[—–－]/g, "-")
        .replace(/\s+/g, "")
        .trim();

    // 尝试提取阶段格式
    const match = normalized.match(/^(\d+)-(\d+)$/);
    if (!match) {
        return { chapter: 0, round: 0, raw: stageText, isValid: false };
    }

    const chapter = parseInt(match[1], 10);
    const round = parseInt(match[2], 10);

    if (!isLikelyStagePair(chapter, round)) {
        return { chapter, round, raw: stageText, isValid: false };
    }

    return { chapter, round, raw: stageText, isValid: true };
}

/**
 * 检查章节和回合是否构成有效的 TFT 阶段对
 *
 * @param chapter 章节号
 * @param round 回合号
 * @returns 是否有效
 */
export function isLikelyStagePair(chapter: number, round: number): boolean {
    if (!Number.isFinite(chapter) || !Number.isFinite(round)) {
        return false;
    }
    if (chapter < 1 || chapter > 7) {
        return false;
    }
    if (round < 1 || round > 7) {
        return false;
    }
    // 章节 1 只有 4 个回合
    if (chapter === 1 && round > 4) {
        return false;
    }
    return true;
}

/**
 * 验证阶段字符串是否有效
 *
 * @param stageText 阶段字符串
 * @returns 是否有效
 */
export function isValidStage(stageText: string): boolean {
    const parsed = parseStage(stageText);
    return parsed.isValid;
}

/**
 * 获取阶段在所有有效阶段中的索引
 *
 * @param stageText 阶段字符串
 * @returns 索引 (0 开始), -1 表示无效
 */
export function getStageIndex(stageText: string): number {
    const normalized = extractLikelyStageText(stageText);
    if (!normalized) {
        return -1;
    }
    return ALL_VALID_STAGES.indexOf(normalized);
}

/**
 * 比较两个阶段的先后顺序
 *
 * @param stageA 阶段 A
 * @param stageB 阶段 B
 * @returns 负数表示 A 在 B 之前, 正数表示 A 在 B 之后, 0 表示相同
 */
export function compareStages(stageA: string, stageB: string): number {
    const indexA = getStageIndex(stageA);
    const indexB = getStageIndex(stageB);

    if (indexA === -1 || indexB === -1) {
        return 0;
    }

    return indexA - indexB;
}

/**
 * 验证阶段进度是否符合 TFT 规则
 *
 * 有效转换规则:
 * 1. previous 为 null 时，任何有效阶段都接受
 * 2. current 必须是有效的阶段
 * 3. current 必须在 previous 之后
 * 4. 跳过超过 1 个回合的转换 (可能表示遗漏)
 *
 * @param current 当前阶段 (如 "2-1")
 * @param previous 上一个阶段 (如 "1-4"), 可以为 null 表示无历史
 * @returns 是否是有效的进度
 *
 * @example
 * ```typescript
 * validateStageProgression("2-1", "1-4") // true
 * validateStageProgression("2-1", "1-3") // false (跳过了 1-4)
 * validateStageProgression("2-1", null) // true (新对局)
 * ```
 */
export function validateStageProgression(
    current: string,
    previous: string | null
): boolean {
    const result = validateStageTransition(current, previous);
    return result.isValid;
}

/**
 * 验证阶段转换并返回详细信息
 *
 * @param current 当前阶段
 * @param previous 上一个阶段
 * @returns 转换验证结果
 */
export function validateStageTransition(
    current: string,
    previous: string | null
): StageTransitionResult {
    const currentParsed = parseStage(current);
    if (!currentParsed.isValid) {
        return {
            isValid: false,
            reason: `无效的阶段格式: ${current}`,
            to: currentParsed,
        };
    }

    // 无历史记录时，接受任何有效阶段
    if (previous === null || previous === undefined) {
        return {
            isValid: true,
            from: undefined,
            to: currentParsed,
        };
    }

    const previousParsed = parseStage(previous);
    if (!previousParsed.isValid) {
        // 如果历史阶段无效，只发出警告但不阻止
        return {
            isValid: true,
            reason: `警告: 历史阶段格式无效: ${previous}`,
            from: previousParsed,
            to: currentParsed,
        };
    }

    const currentIndex = getStageIndex(current);
    const previousIndex = getStageIndex(previous);

    if (currentIndex <= previousIndex) {
        return {
            isValid: false,
            reason: `阶段倒退或相同: ${previous} -> ${current}`,
            from: previousParsed,
            to: currentParsed,
        };
    }

    // 检查是否跳过了过多阶段
    const stageGap = currentIndex - previousIndex;
    if (stageGap > 1) {
        return {
            isValid: true, // 仍然有效，但不推荐
            reason: `警告: 跳过了 ${stageGap - 1} 个阶段，可能遗漏了中间阶段`,
            from: previousParsed,
            to: currentParsed,
        };
    }

    return {
        isValid: true,
        from: previousParsed,
        to: currentParsed,
    };
}

/**
 * 获取指定阶段之后的所有有效下一个阶段
 *
 * @param current 当前阶段
 * @returns 可能的下一个阶段数组
 *
 * @example
 * ```typescript
 * getValidNextStages("1-4") // ["2-1"]
 * getValidNextStages("7-4") // [] (已是最终阶段)
 * ```
 */
export function getValidNextStages(current: string): string[] {
    const currentParsed = parseStage(current);
    if (!currentParsed.isValid) {
        return [];
    }

    const currentIndex = getStageIndex(current);
    if (currentIndex === -1 || currentIndex >= ALL_VALID_STAGES.length - 1) {
        return [];
    }

    // 下一个阶段
    const nextStage = ALL_VALID_STAGES[currentIndex + 1];

    // 检查是否需要跳过中间阶段 (如 1-4 -> 2-2 的情况)
    // 正常流程中，下一个阶段应该是唯一的
    return nextStage ? [nextStage] : [];
}

/**
 * 获取所有可能的下一个阶段 (考虑可能的识别误差)
 *
 * 返回当前阶段之后的 1-3 个阶段，用于 OCR 识别结果验证
 *
 * @param current 当前阶段
 * @param maxLookahead 最大向前查看阶段数 (默认: 3)
 * @returns 可能的下一个阶段数组
 */
export function getPossibleNextStages(
    current: string,
    maxLookahead: number = 3
): string[] {
    const currentParsed = parseStage(current);
    if (!currentParsed.isValid) {
        return [];
    }

    const currentIndex = getStageIndex(current);
    if (currentIndex === -1) {
        return [];
    }

    const results: string[] = [];
    for (let i = 1; i <= maxLookahead; i += 1) {
        const nextIndex = currentIndex + i;
        if (nextIndex < ALL_VALID_STAGES.length) {
            results.push(ALL_VALID_STAGES[nextIndex]);
        }
    }

    return results;
}

/**
 * 获取所有可能的上一阶段 (考虑可能的识别误差)
 *
 * 返回当前阶段之前的 1-3 个阶段，用于 OCR 识别结果验证
 *
 * @param current 当前阶段
 * @param maxLookback 最大向后查看阶段数 (默认: 3)
 * @returns 可能的上一阶段数组
 */
export function getPossiblePreviousStages(
    current: string,
    maxLookback: number = 3
): string[] {
    const currentParsed = parseStage(current);
    if (!currentParsed.isValid) {
        return [];
    }

    const currentIndex = getStageIndex(current);
    if (currentIndex === -1) {
        return [];
    }

    const results: string[] = [];
    for (let i = 1; i <= maxLookback; i += 1) {
        const prevIndex = currentIndex - i;
        if (prevIndex >= 0) {
            results.push(ALL_VALID_STAGES[prevIndex]);
        }
    }

    return results;
}

/**
 * 验证 OCR 识别的阶段文本
 *
 * 使用 extractLikelyStageText 进行规范化，然后验证是否符合规则
 *
 * @param rawText OCR 识别的原始文本
 * @returns 规范化后的阶段字符串，如果无效则返回空字符串
 */
export function validateAndNormalizeStage(rawText: string): string {
    const normalized = extractLikelyStageText(rawText);
    if (!normalized) {
        return "";
    }

    if (!isValidStage(normalized)) {
        return "";
    }

    return normalized;
}

/**
 * 检查阶段是否处于 "风险" 状态
 *
 * 某些阶段 OCR 识别容易出错，这些阶段需要额外验证:
 * - 1-1, 2-1, 3-1, 4-1, 5-1, 6-1, 7-1 (回合 1 容易识别成其他数字)
 * - 5-1 (特定问题，曾出现 "5-1" vs "3-1" 混淆)
 *
 * @param stageText 阶段字符串
 * @returns 是否是风险阶段
 */
export function isRiskyStage(stageText: string): boolean {
    const parsed = parseStage(stageText);
    if (!parsed.isValid) {
        return false;
    }

    // 回合 1 是风险阶段
    if (parsed.round === 1) {
        return true;
    }

    return false;
}

/**
 * 获取阶段的描述性名称
 *
 * @param stageText 阶段字符串
 * @returns 描述性名称
 */
export function getStageDescription(stageText: string): string {
    const parsed = parseStage(stageText);
    if (!parsed.isValid) {
        return "无效阶段";
    }

    const chapterNames: Record<number, string> = {
        1: "第一章节",
        2: "第二章节",
        3: "第三章节",
        4: "第四章节",
        5: "第五章节",
        6: "第六章节",
        7: "第七章节",
    };

    const roundNames: Record<number, string> = {
        1: "第一回合",
        2: "第二回合",
        3: "第三回合",
        4: "第四回合",
        5: "第五回合",
        6: "第六回合",
        7: "第七回合",
    };

    // 特殊回合名称
    if (parsed.chapter === 1) {
        if (parsed.round === 1) return "开局的选秀回合";
        if (parsed.round === 2) return "第一次战斗";
        if (parsed.round === 3) return "第一次野怪";
        if (parsed.round === 4) return "第二轮选秀";
    }

    if (parsed.round === 1) {
        return `${chapterNames[parsed.chapter]}开始`;
    }

    if (parsed.round === 4) {
        return `${chapterNames[parsed.chapter]}${roundNames[parsed.round]} (野怪回合)`;
    }

    return `${chapterNames[parsed.chapter]}${roundNames[parsed.round]}`;
}

/**
 * 检查是否是对局早期阶段
 *
 * 早期阶段定义: 章节 1 和章节 2
 *
 * @param stageText 阶段字符串
 * @returns 是否是早期阶段
 */
export function isEarlyGame(stageText: string): boolean {
    const parsed = parseStage(stageText);
    if (!parsed.isValid) {
        return false;
    }

    return parsed.chapter <= 2;
}

/**
 * 检查是否是对局后期阶段
 *
 * 后期阶段定义: 章节 5 及之后
 *
 * @param stageText 阶段字符串
 * @returns 是否是后期阶段
 */
export function isLateGame(stageText: string): boolean {
    const parsed = parseStage(stageText);
    if (!parsed.isValid) {
        return false;
    }

    return parsed.chapter >= 5;
}
