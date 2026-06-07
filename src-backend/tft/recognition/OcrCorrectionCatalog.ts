import type { TftOcrCorrectionEntry } from "../../data/types";

export const BUILTIN_OCR_CORRECTIONS: TftOcrCorrectionEntry[] = [
    { incorrect: "2—1", correct: "2-1", context: "stage" },
    { incorrect: "梦欧娜", correct: "蕾欧娜", context: "shop" },
    { incorrect: "套欧娜", correct: "蕾欧娜", context: "shop" },
    { incorrect: "营欧娜", correct: "蕾欧娜", context: "shop" },
    { incorrect: "伊瑞尔", correct: "伊泽瑞尔", context: "shop" },
    { incorrect: "丽桑蛙", correct: "丽桑卓", context: "shop" },
    { incorrect: "卡宝尔", correct: "卡密尔", context: "shop" },
    { incorrect: "卡室尔", correct: "卡密尔", context: "shop" },
];

export function mergeOcrCorrections(...groups: TftOcrCorrectionEntry[][]): TftOcrCorrectionEntry[] {
    const merged = new Map<string, TftOcrCorrectionEntry>();

    for (const group of groups) {
        for (const entry of group) {
            const context = entry.context ?? "all";
            const key = `${context}:${entry.incorrect}:${entry.correct}`;
            if (!merged.has(key)) {
                merged.set(key, {
                    incorrect: entry.incorrect,
                    correct: entry.correct,
                    context,
                });
            }
        }
    }

    return [...merged.values()];
}
