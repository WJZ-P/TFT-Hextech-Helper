/**
 * @file 游戏阶段解析器
 * @description 将游戏阶段字符串 (如 "2-1") 解析为游戏行为枚举
 * @author TFT-Hextech-Helper
 */

import { GameStageType } from "../../TFTProtocol";

/**
 * 将游戏阶段字符串解析为游戏行为枚举
 * @description 根据云顶之弈的游戏规则，不同阶段有不同的行为
 * 
 * 规则说明：
 * - Stage 1 (1-x): 全部是 PVE 野怪回合
 * - Round 2 (x-2): 海克斯强化选择回合
 * - Round 4 (x-4): 选秀回合
 * - Round 7 (x-7): PVE 野怪回合
 * - 其他回合: PVP 玩家对战
 * 
 * @param stageText 阶段字符串，如 "2-1", "3-5"
 * @returns 游戏阶段枚举
 * 
 * @example
 * parseStageStringToEnum("1-1") // -> GameStageType.PVE
 * parseStageStringToEnum("2-2") // -> GameStageType.AUGMENT
 * parseStageStringToEnum("3-4") // -> GameStageType.CAROUSEL
 * parseStageStringToEnum("4-3") // -> GameStageType.PVP
 */
export function parseStageStringToEnum(stageText: string): GameStageType {
    try {
        // 清理空白字符
        const cleanText = stageText.replace(/\s/g, "");

        // 匹配 "数字-数字" 格式
        const match = cleanText.match(/^(\d+)-(\d+)$/);
        if (!match) {
            return GameStageType.UNKNOWN;
        }

        const stage = parseInt(match[1]); // 大阶段 (如 2)
        const round = parseInt(match[2]); // 小回合 (如 1)

        // 根据 stage 和 round 判断当前阶段
        if (stage === 1) {
            // 第一阶段全是打野怪
            return GameStageType.PVE;
        }

        if (round === 2) {
            // 第二回合选择海克斯
            return GameStageType.AUGMENT;
        }

        if (round === 4) {
            // 第四回合选秀
            return GameStageType.CAROUSEL;
        }

        if (round === 7) {
            // 第七回合打野怪
            return GameStageType.PVE;
        }

        // 其他阶段进行玩家对战
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
