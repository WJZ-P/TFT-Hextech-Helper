/**
 * @file OCR 模块单元测试 — ConfidenceNormalizer, StageValidator, VotingEngine
 * @description 测试多引擎 OCR 系统的核心模块
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { ConfidenceNormalizer } from "../../src-backend/ocr/ConfidenceNormalizer";
import {
    validateStageProgression,
    getValidNextStages,
    isValidStage,
    parseStage,
} from "../../src-backend/ocr/StageValidator";

describe("ConfidenceNormalizer", () => {
    let normalizer: ConfidenceNormalizer;

    before(() => {
        normalizer = new ConfidenceNormalizer();
    });

    describe("baseNormalize", () => {
        it("should normalize Tesseract confidence (0-100) to 0-1 with corrections", () => {
            // With nonlinear correction (power 1.5): 100 → 1, 0 → 0
            assert.equal(normalizer.normalize(100, "tesseract"), 1);
            assert.equal(normalizer.normalize(0, "tesseract"), 0);
            // 50 → 0.5^1.5 ≈ 0.35 (nonlinear correction applied)
            const result50 = normalizer.normalize(50, "tesseract");
            assert.ok(result50 < 0.5 && result50 > 0.3, `Expected ~0.35, got ${result50}`);
        });

        it("should handle EasyOCR confidence (0-1) with corrections", () => {
            // With nonlinear correction: 0.95^1.5 ≈ 0.926
            const result95 = normalizer.normalize(0.95, "easyocr");
            assert.ok(result95 < 0.95 && result95 > 0.9, `Expected ~0.926, got ${result95}`);
            assert.equal(normalizer.normalize(0, "easyocr"), 0);
        });

        it("should clamp values outside valid range", () => {
            assert.equal(normalizer.normalize(150, "tesseract"), 1);
            assert.equal(normalizer.normalize(-10, "tesseract"), 0);
            assert.equal(normalizer.normalize(1.5, "easyocr"), 1);
            assert.equal(normalizer.normalize(-0.5, "easyocr"), 0);
        });
    });

    describe("nonlinear correction", () => {
        it("should apply power correction (confidence^1.5)", () => {
            // 0.8^1.5 ≈ 0.716
            const result = normalizer.normalize(80, "tesseract");
            assert.ok(result < 0.8, "Should compress high confidence slightly");
            assert.ok(result > 0.7, "But not too much");
        });
    });

    describe("length correction", () => {
        it("should reduce confidence for very short text", () => {
            const shortText = normalizer.normalize(80, "tesseract", "2");
            const normalText = normalizer.normalize(80, "tesseract", "2-1");
            assert.ok(shortText < normalText, "Short text should have lower confidence");
        });
    });

    describe("static methods", () => {
        it("should calculate weighted average correctly", () => {
            const results = [
                { confidence: 0.9, weight: 1 },
                { confidence: 0.7, weight: 2 },
            ];
            // (0.9 * 1 + 0.7 * 2) / 3 = 2.3 / 3 ≈ 0.767
            const avg = ConfidenceNormalizer.weightedAverage(results);
            assert.ok(Math.abs(avg - 0.767) < 0.01);
        });

        it("should return correct quality levels", () => {
            assert.equal(ConfidenceNormalizer.getQualityLevel(0.95), "high");
            assert.equal(ConfidenceNormalizer.getQualityLevel(0.75), "medium");
            assert.equal(ConfidenceNormalizer.getQualityLevel(0.55), "low");
            assert.equal(ConfidenceNormalizer.getQualityLevel(0.3), "very_low");
        });

        it("should check acceptability threshold", () => {
            assert.equal(ConfidenceNormalizer.isAcceptable(0.8), true);
            assert.equal(ConfidenceNormalizer.isAcceptable(0.65), false);
            assert.equal(ConfidenceNormalizer.isAcceptable(0.7, 0.7), true);
        });
    });
});

describe("StageValidator", () => {
    describe("isValidStage", () => {
        it("should accept valid stages", () => {
            assert.equal(isValidStage("1-1"), true);
            assert.equal(isValidStage("3-5"), true);
            assert.equal(isValidStage("7-4"), true);
        });

        it("should reject invalid stages", () => {
            assert.equal(isValidStage("0-1"), false);
            assert.equal(isValidStage("8-1"), false);
            assert.equal(isValidStage("1-8"), false);
            assert.equal(isValidStage("abc"), false);
        });
    });

    describe("parseStage", () => {
        it("should parse valid stage strings", () => {
            const stage = parseStage("2-3");
            assert.equal(stage.chapter, 2);
            assert.equal(stage.round, 3);
            assert.equal(stage.isValid, true);
        });

        it("should handle invalid stage strings", () => {
            const stage = parseStage("invalid");
            assert.equal(stage.isValid, false);
        });
    });

    describe("validateStageProgression", () => {
        it("should accept valid forward progression", () => {
            assert.equal(validateStageProgression("1-2", "1-1"), true);
            assert.equal(validateStageProgression("2-1", "1-4"), true);
            assert.equal(validateStageProgression("3-1", "2-5"), true);
        });

        it("should reject invalid backward progression", () => {
            assert.equal(validateStageProgression("1-1", "1-2"), false);
            assert.equal(validateStageProgression("1-4", "2-1"), false);
        });

        it("should not allow staying on same stage (requires forward progression)", () => {
            // StageValidator is designed to detect PROGRESS, so same stage returns false
            assert.equal(validateStageProgression("2-1", "2-1"), false);
        });

        it("should allow first stage with no previous", () => {
            assert.equal(validateStageProgression("1-1", null), true);
        });
    });

    describe("getValidNextStages", () => {
        it("should return correct next stages", () => {
            const next = getValidNextStages("1-1");
            assert.ok(next.includes("1-2"), "1-1 should lead to 1-2");
        });

        it("should handle stage transitions", () => {
            const next = getValidNextStages("1-4");
            assert.ok(next.includes("2-1"), "1-4 should lead to 2-1");
        });

        it("should handle late game stages", () => {
            // 7-4 can lead to 7-5 (end game indicator)
            const next = getValidNextStages("7-4");
            assert.ok(next.length > 0, "7-4 should have at least one next stage");
        });
    });
});

describe("VotingEngine", () => {
    // VotingEngine requires initialized engines, so we test the logic indirectly
    // through the ConfidenceNormalizer's voting methods

    it("should handle empty results in weighted average", () => {
        const result = ConfidenceNormalizer.weightedAverage([]);
        assert.equal(result, 0);
    });

    it("should handle single result in weighted average", () => {
        const result = ConfidenceNormalizer.weightedAverage([{ confidence: 0.8 }]);
        assert.equal(result, 0.8);
    });
});
