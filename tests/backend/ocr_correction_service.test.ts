import test from "node:test";
import assert from "node:assert/strict";
import { ocrCorrectionService } from "../../src-backend/tft/recognition/OcrCorrectionService";

test("OcrCorrectionService applies context-aware replacements", () => {
    ocrCorrectionService.clearCorrections();
    ocrCorrectionService.configureLogging({ enabled: false });
    ocrCorrectionService.loadCorrections([
        { incorrect: "梦欧娜", correct: "蕾欧娜", context: "shop" },
        { incorrect: "2—1", correct: "2-1", context: "stage" },
    ]);

    assert.equal(ocrCorrectionService.applyCorrections("梦欧娜", "shop"), "蕾欧娜");
    assert.equal(ocrCorrectionService.applyCorrections("梦欧娜", "stage"), "梦欧娜");
    assert.equal(ocrCorrectionService.applyCorrections("2—1", "stage"), "2-1");
    assert.deepEqual(
        ocrCorrectionService.getHitStats().map((entry) => `${entry.context}:${entry.incorrect}:${entry.count}`),
        ["shop:梦欧娜:1", "stage:2—1:1"]
    );

    ocrCorrectionService.clearCorrections();
});
