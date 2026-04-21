/**
 * @file 游戏阶段解析器
 * @description 将游戏阶段字符串 (如 "2-1") 解析为游戏行为枚举
 * @author TFT-Hextech-Helper
 */

import { GameStageType } from "../../TFTProtocol";

/**
 * 海克斯强化选择回合列表
 * @description 云顶之弈中只有 3 次海克斯选择机会：
 *              - 2-1: 第一个海克斯（2阶段第1回合，比较特殊）
 *              - 3-2: 第二个海克斯
 *              - 4-2: 第三个海克斯
 */
const AUGMENT_ROUNDS: ReadonlySet<string> = new Set(["2-1", "3-2", "4-2"]);

/**
 * 【S17 新增】星神选择回合列表
 * @description S17 星神赛季中，每隔一个大阶段会出现一次星神选择
 *              从 2 个候选槽位中 2 选 1，对应 TFTProtocol 中的 starGodSlot (2 slots)
 *              - 2-4: 第一次星神选择
 *              - 3-4: 第二次星神选择
 *              - 4-4: 第三次星神选择
 */
const STAR_GOD_ROUNDS: ReadonlySet<string> = new Set(["2-4", "3-4", "4-4"]);

/**
 * 【S17 新增】大恩赐回合列表
 * @description S17 星神赛季 4-7 野怪回合结束后，会出现一次大恩赐
 *              表现为右下角出现一个按钮，需要点击触发
 *              对应 TFTProtocol 中的 grandBlessingPoint (790, 670)
 *              注意：此回合原本是 PVE (x-7)，S17 中要特判，优先级高于 PVE
 */
const GRAND_BLESSING_ROUNDS: ReadonlySet<string> = new Set(["4-7"]);

/**
 * 【S17 新增】小恩赐回合列表
 * @description S17 星神赛季中，后半程每个大阶段的第 4 回合是小恩赐
 *              从 4 个候选装备中 4 选 1，对应 TFTProtocol 中的 minorBlessingSlot (4 slots)
 *              - 5-4: 第一次小恩赐
 *              - 6-4: 第二次小恩赐
 *              - 7-4: 第三次小恩赐
 */
const MINOR_BLESSING_ROUNDS: ReadonlySet<string> = new Set(["5-4", "6-4", "7-4"]);

/**
 * 将游戏阶段字符串解析为游戏行为枚举
 * @description 根据云顶之弈 S17 星神赛季的游戏规则，不同阶段有不同的行为
 * 
 * 规则说明（优先级从高到低）：
 * - 第一阶段 (1-1 ~ 1-4): EARLY_PVE，内部根据回合号判断具体策略
 *   - 1-1, 1-2: 商店未开放，只需防挂机
 *   - 1-3, 1-4: 商店已开放，执行前期运营策略
 * - 海克斯强化回合 (2-1, 3-2, 4-2): AUGMENT
 * - 【S17】星神选择 (2-4, 3-4, 4-4): STAR_GOD_CHOOSE
 * - 【S17】大恩赐 (4-7): GRAND_BLESSING（注意要在 PVE 判断之前）
 * - 【S17】小恩赐 (5-4, 6-4, 7-4): MINOR_BLESSING
 * - Round 7 (x-7): PVE 野怪回合（4-7 除外）
 * - 【S17 下线】选秀回合 (x-4) 已废弃，由星神/小恩赐取代
 * - 其他回合: PVP 玩家对战
 * 
 * @param stageText 阶段字符串，如 "2-1", "3-5"
 * @returns 游戏阶段枚举
 * 
 * @example
 * parseStageStringToEnum("1-1") // -> GameStageType.EARLY_PVE
 * parseStageStringToEnum("2-1") // -> GameStageType.AUGMENT (第一个海克斯)
 * parseStageStringToEnum("3-2") // -> GameStageType.AUGMENT (第二个海克斯)
 * parseStageStringToEnum("2-4") // -> GameStageType.STAR_GOD_CHOOSE (星神选择)
 * parseStageStringToEnum("4-7") // -> GameStageType.GRAND_BLESSING (大恩赐)
 * parseStageStringToEnum("5-4") // -> GameStageType.MINOR_BLESSING (小恩赐)
 * parseStageStringToEnum("3-7") // -> GameStageType.PVE (野怪)
 * parseStageStringToEnum("4-3") // -> GameStageType.PVP
 */
export function parseStageStringToEnum(stageText: string): GameStageType {
    try {
        // 清理空白字符
        let cleanText = stageText.replace(/\s/g, "");

        // 兜底修复：OCR 可能把 "1-1" 误识别为 "41-1"、"11-1" 等
        // TFT 最多只有 7 个大阶段，所以 stage > 7 一定是误识别
        // 常见误识别：41-1 → 1-1, 11-1 → 1-1
        cleanText = fixMisrecognizedStage(cleanText);

        // 匹配 "数字-数字" 格式
        const match = cleanText.match(/^(\d+)-(\d+)$/);
        if (!match) {
            return GameStageType.UNKNOWN;
        }

        const stage = parseInt(match[1]); // 大阶段 (如 2)
        const round = parseInt(match[2]); // 小回合 (如 1)

        // 1) 第一阶段全部归为 EARLY_PVE
        // handleEarlyPVE() 内部会根据 round 判断：
        // - 1-1, 1-2: 商店未开放，只需防挂机
        // - 1-3, 1-4: 商店已开放，执行前期运营策略
        if (stage === 1) {
            return GameStageType.EARLY_PVE;
        }

        // 2) 海克斯强化回合：只有 2-1, 3-2, 4-2 这三个特定回合
        if (AUGMENT_ROUNDS.has(cleanText)) {
            return GameStageType.AUGMENT;
        }

        // 3) 【S17】星神选择：2-4, 3-4, 4-4，从 2 个槽位中 2 选 1
        if (STAR_GOD_ROUNDS.has(cleanText)) {
            return GameStageType.STAR_GOD_CHOOSE;
        }

        // 4) 【S17】大恩赐：4-7，右下角点击按钮触发
        //    注意：此判断必须在 PVE (x-7) 之前，否则会被 PVE 分支拦截
        if (GRAND_BLESSING_ROUNDS.has(cleanText)) {
            return GameStageType.GRAND_BLESSING;
        }

        // 5) 【S17】小恩赐：5-4, 6-4, 7-4，从 4 个槽位中 4 选 1
        if (MINOR_BLESSING_ROUNDS.has(cleanText)) {
            return GameStageType.MINOR_BLESSING;
        }

        // 6) PVE 野怪回合 (x-7)，注意 4-7 已被上面的大恩赐拦截
        if (round === 7) {
            return GameStageType.PVE;
        }

        // 7) 其他阶段进行玩家对战
        //    注意：S17 下线了 CAROUSEL 选秀，原来的 x-4 分支已被星神/小恩赐取代
        return GameStageType.PVP;
    } catch (e) {
        console.error("[GameStageParser] 解析阶段字符串失败:", e);
        return GameStageType.UNKNOWN;
    }
}

/**
 * 验证阶段字符串格式是否有效
 * @param text 待验证的字符串
 * @returns 是否为有效的阶段格式 (如 "2-1")
 */
export function isValidStageFormat(text: string): boolean {
    return /^\d+\s*[-]\s*\d+$/.test(text.trim());
}

/**
 * 修复 OCR 误识别的阶段字符串
 * @param text 原始阶段字符串
 * @returns 修复后的阶段字符串
 * 
 * @description 常见误识别情况：
 * - "41-1" → "1-1"：OCR 把干扰像素识别成了 "4"
 * - "11-1" → "1-1"：OCR 重复识别了 "1"
 * 
 * 修复策略：
 * - TFT 最多只有 7 个大阶段 (1-7)
 * - 如果 stage > 7，尝试取最后一位数字作为真正的 stage
 * - 例如 "41" → "1", "11" → "1"
 */
function fixMisrecognizedStage(text: string): string {
    const match = text.match(/^(\d+)-(\d+)$/);
    if (!match) return text;

    const stageStr = match[1];
    const roundStr = match[2];
    const stage = parseInt(stageStr);

    // TFT 大阶段最多到 7，超过说明是误识别
    if (stage > 7 && stageStr.length > 1) {
        // 取最后一位作为真正的 stage
        const fixedStage = stageStr.slice(-1);
        console.log(`[GameStageParser] 修复阶段误识别: "${text}" → "${fixedStage}-${roundStr}"`);
        return `${fixedStage}-${roundStr}`;
    }

    return text;
}
