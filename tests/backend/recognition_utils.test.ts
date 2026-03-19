import test from "node:test";
import assert from "node:assert/strict";
import type { TFTUnit } from "../../src-backend/TFTProtocol";
import { ocrCorrectionService } from "../../src-backend/tft/recognition/OcrCorrectionService";
import {
    extractLikelyStageText,
    resolveChampionNameFromText,
} from "../../src-backend/tft/recognition/RecognitionUtils";

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
