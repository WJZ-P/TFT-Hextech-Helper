import type { TFTUnit } from "../TFTProtocol";

const EQUIPMENT_NAME_ALIASES: Record<string, string> = {
    反曲弓: "反曲之弓",
    recurvebow: "反曲之弓",
    bfsword: "暴风之剑",
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
