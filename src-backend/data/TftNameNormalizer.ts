import type { TFTUnit } from "../TFTProtocol";

/**
 * English Alias Support — Capability Boundaries
 * ==============================================
 *
 * WHAT IS SUPPORTED:
 *   ✅ Common NA server equipment abbreviations (e.g., "lw", "morello", "quicksilver")
 *   ✅ Base component englishId names (e.g., "bfsword", "chainvest")
 *   ✅ Champion name shorthands (e.g., "asol", "kog", "tf", "mf")
 *   ✅ Direct champion englishId simplification (e.g., "TFT16_Graves" → "格雷福斯")
 *
 * WHAT IS NOT SUPPORTED:
 *   ❌ Full English UI text parsing (e.g., "Last Whisper" with space)
 *   ❌ OCR-corrected names (relies on game returning standardized names)
 *   ❌ Trait/abyss abbreviations (not implemented)
 *   ❌ Champion Korean/Japanese names (Chinese game required)
 *
 * DESIGN NOTES:
 *   - normalizeEquipmentName() is strict: only explicitly mapped aliases resolve
 *   - resolveChampionAlias() is fuzzy: auto-simplifies englishId tokens for coverage
 *   - Both functions preserve case-insensitivity via normalizeAliasToken()
 */

const EQUIPMENT_NAME_ALIASES: Record<string, string> = {
    反曲弓: "反曲之弓",
    recurvebow: "反曲之弓",
    bfsword: "暴风之剑",
    // English abbreviations for base components (NA server shorthand)
    chainvest: "锁子甲",
    negatroncloak: "负极斗篷",
    giantsbelt: "无用大棒",
    sparringgloves: "拳套",
    spatula: "金铲铲",
    tearofthegoddess: "女神之泪",
    tear: "女神之泪",
    needlesslylargerod: "金锅锅",
    nlr: "金锅锅",
    cloakofagility: "敏捷斗篷",
    // ---- Completed Equipment (Standard) ----
    quicksilver: "水银",
    lastwhisper: "最后的轻语",
    lw: "最后的轻语",
    rabadonsdeathcap: "灭世者的死亡之帽",
    rabadon: "灭世者的死亡之帽",
    dcap: "灭世者的死亡之帽",
    morellonomicon: "莫雷洛秘典",
    morello: "莫雷洛秘典",
    shojin: "朔极之矛",
    spearofshojin: "朔极之矛",
    hextechgunblade: "海克斯科技枪刃",
    hoj: "海克斯科技枪刃",
    giantslayer: "巨人杀手",
    gs: "巨人杀手",
    madredsbloodrazor: "巨人杀手",
    jeweledgauntlet: "珠光护手",
    jgs: "珠光护手",
};

/**
 * 常用英文简写 → 中文名映射
 * 补充 englishId 自动匹配无法覆盖的惯用简写（NA 服务器常见缩写）
 */
export const CHAMPION_NAME_ALIASES: Record<string, string> = {
    asol: "奥瑞利安·索尔",
    aurelionsol: "奥瑞利安·索尔",
    kaisa: "卡莎",
    kogmaw: "科加斯",
    kog: "科加斯",
    tf: "崔斯特",
    twistedfate: "崔斯特",
    mf: "财富小姐",
    misfortune: "财富小姐",
    // Additional common champion shorthands
    morg: "魔甘娜",
    morgana: "魔甘娜",
    heimer: "维迦",
    viego: "厄运小姐",
};

function normalizeAliasToken(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

function simplifyEnglishUnitId(englishId: string): string {
    return normalizeAliasToken(englishId.replace(/^TFT\d+_?/i, "").replace(/^TFT_?/i, ""));
}

export function resolveChampionAlias(value: string, chessData: Record<string, TFTUnit>): string | null {
    const rawValue = value.trim();
    if (!rawValue) {
        return null;
    }

    if (chessData[rawValue]) {
        return rawValue;
    }

    const normalizedToken = normalizeAliasToken(rawValue);
    if (!normalizedToken) {
        return null;
    }

    // Check explicit shorthand aliases first (covers common NA abbreviations like "asol", "kaisa")
    const shorthandResult = CHAMPION_NAME_ALIASES[normalizedToken];
    if (shorthandResult) {
        return shorthandResult;
    }

    for (const [championName, unit] of Object.entries(chessData)) {
        const candidateTokens = new Set<string>([
            normalizeAliasToken(championName),
            normalizeAliasToken(unit.englishId),
            simplifyEnglishUnitId(unit.englishId),
        ]);

        if (candidateTokens.has(normalizedToken)) {
            return championName;
        }
    }

    return null;
}

export function normalizeEquipmentName(value: string): string {
    const trimmed = value.trim();
    const normalizedToken = normalizeAliasToken(trimmed);
    return EQUIPMENT_NAME_ALIASES[trimmed] ?? EQUIPMENT_NAME_ALIASES[normalizedToken] ?? trimmed;
}

export function equipmentNamesMatch(left: string | null | undefined, right: string | null | undefined): boolean {
    if (!left || !right) {
        return left === right;
    }

    return normalizeEquipmentName(left) === normalizeEquipmentName(right);
}
