import test from "node:test";
import assert from "node:assert/strict";
import type { TFTUnit } from "../../src-backend/TFTProtocol";
import { ocrCorrectionService } from "../../src-backend/tft/recognition/OcrCorrectionService";
import {
    extractLikelyStageText,
    resolveChampionNameFromText,
} from "../../src-backend/tft/recognition/RecognitionUtils";
import { resolveChampionAlias, normalizeEquipmentName } from "../../src-backend/data/TftNameNormalizer";

test("RecognitionUtils applies stage OCR corrections before stage extraction", () => {
    ocrCorrectionService.clearCorrections();
    ocrCorrectionService.loadCorrections([
        { incorrect: "2—1", correct: "2-1", context: "stage" },
    ]);

    assert.equal(extractLikelyStageText(" 2—1 "), "2-1");

    ocrCorrectionService.clearCorrections();
});

test("RecognitionUtils applies shop OCR corrections before champion resolution", () => {
    ocrCorrectionService.clearCorrections();
    ocrCorrectionService.loadCorrections([
        { incorrect: "梦欧娜", correct: "蕾欧娜", context: "shop" },
    ]);

    const result = resolveChampionNameFromText("梦欧娜", {
        蕾欧娜: {} as TFTUnit,
        卡密尔: {} as TFTUnit,
    });

    assert.equal(result.name, "蕾欧娜");
    assert.equal(result.normalizedText, "蕾欧娜");
    assert.equal(result.strategy, "EXACT");

    ocrCorrectionService.clearCorrections();
});

test("RecognitionUtils supports basic English champion aliases without breaking Chinese flow", () => {
    const result = resolveChampionNameFromText("Leona", {
        蕾欧娜: {
            displayName: "蕾欧娜",
            englishId: "TFT16_Leona",
            price: 1,
            traits: [],
            origins: [],
            classes: [],
            attackRange: 1,
        } as TFTUnit,
    });

    assert.equal(result.name, "蕾欧娜");
    assert.equal(result.strategy, "EXACT");
});

test("TftNameNormalizer resolves English champion alias Ekko to 艾克", () => {
    const chessData: Record<string, TFTUnit> = {
        艾克: {
            displayName: "艾克",
            englishId: "TFT16_Ekko",
            price: 3,
            traits: [],
            origins: [],
            classes: [],
            attackRange: 1,
        } as TFTUnit,
        卡蜜尔: {
            displayName: "卡蜜尔",
            englishId: "TFT16_Camille",
            price: 4,
            traits: [],
            origins: [],
            classes: [],
            attackRange: 1,
        } as TFTUnit,
    };

    // English champion name matches simplifyEnglishUnitId("TFT16_Ekko") → "ekko"
    assert.equal(resolveChampionAlias("Ekko", chessData), "艾克");
    // English champion name matches normalizeAliasToken("Ekko") → "ekko"
    assert.equal(resolveChampionAlias("ekko", chessData), "艾克");
    // Non-existent champion returns null
    assert.equal(resolveChampionAlias("Zed", chessData), null);
});

test("TftNameNormalizer normalizes English equipment alias bfsword to 暴风之剑", () => {
    assert.equal(normalizeEquipmentName("bfsword"), "暴风之剑");
    // Case-insensitive
    assert.equal(normalizeEquipmentName("BFSWORD"), "暴风之剑");
    // Unknown returns as-is
    assert.equal(normalizeEquipmentName("longsword"), "longsword");
});
