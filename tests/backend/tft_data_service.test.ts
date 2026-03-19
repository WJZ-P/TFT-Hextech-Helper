import test from "node:test";
import assert from "node:assert/strict";
import type { TftDataSnapshot } from "../../src-backend/data/types";
import { TftDataService } from "../../src-backend/services/TftDataService";
import { ocrCorrectionService } from "../../src-backend/tft/recognition/OcrCorrectionService";

test("TftDataService loads OCR corrections from snapshot refreshes", async () => {
    ocrCorrectionService.clearCorrections();

    const snapshot: TftDataSnapshot = {
        fetchedAt: new Date().toISOString(),
        source: "season-pack",
        versions: {},
        champions: [],
        items: [],
        traits: [],
        lineups: [],
        ocrCorrections: [
            { incorrect: "2—1", correct: "2-1", context: "stage" },
        ],
    };

    const provider = {
        async refresh(): Promise<void> {
            return;
        },
        getSnapshot(): TftDataSnapshot {
            return snapshot;
        },
    };

    const service = new TftDataService(provider);
    await service.refresh(true);

    assert.equal(ocrCorrectionService.applyCorrections("2—1", "stage"), "2-1");
    ocrCorrectionService.clearCorrections();
});
