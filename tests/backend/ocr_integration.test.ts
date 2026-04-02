/**
 * @file OCR 集成测试 — 使用真实帧测试多位置扫描和预处理效果
 * @description 验证 MultiPositionScanner 在真实 Android 录制帧上的表现
 */

import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";

// 测试用的帧目录
const TEST_FRAMES_DIR = "examples/recordings/derived/screen-recording-20260322/frames";
const TEST_FRAME_COUNT = 5; // 测试前 5 帧

describe("OCR Integration Tests", () => {
    let frameFiles: string[];

    before(() => {
        // 检查测试帧是否存在
        if (!fs.existsSync(TEST_FRAMES_DIR)) {
            console.log(`跳过集成测试: 测试帧目录不存在 (${TEST_FRAMES_DIR})`);
            return;
        }

        frameFiles = fs.readdirSync(TEST_FRAMES_DIR)
            .filter(f => f.endsWith(".jpg"))
            .sort()
            .slice(0, TEST_FRAME_COUNT);
    });

    describe("Frame Availability", () => {
        it("should have test frames available", () => {
            if (!fs.existsSync(TEST_FRAMES_DIR)) {
                // 跳过测试而不是失败
                return;
            }
            assert.ok(frameFiles.length > 0, "Should have at least one test frame");
        });
    });

    describe("EasyOCR Bridge Integration", () => {
        it("should recognize stage text from frame using Python bridge", async () => {
            if (!fs.existsSync(TEST_FRAMES_DIR) || frameFiles.length === 0) {
                console.log("    [跳过] 测试帧不可用");
                return;
            }

            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);

            const framePath = path.join(TEST_FRAMES_DIR, frameFiles[0]);
            
            // 测试多个位置
            const positions = [340, 380, 420];
            let bestText = "";
            let bestConfidence = 0;

            for (const pos of positions) {
                try {
                    const cmd = `python scripts/easyocr_bridge.py "${framePath}" --roi ${pos},0,200,60 --grayscale --threshold 140`;
                    const { stdout } = await execAsync(cmd, { timeout: 30000 });
                    const result = JSON.parse(stdout.trim());
                    
                    if (result.confidence > bestConfidence) {
                        bestConfidence = result.confidence;
                        bestText = result.text;
                    }
                } catch {
                    // 忽略单个位置的失败
                }
            }

            // 验证结果
            console.log(`  帧 ${frameFiles[0]}: 识别="${bestText}", 置信度=${(bestConfidence * 100).toFixed(1)}%`);
            assert.ok(bestText.length > 0 || bestConfidence > 0, "Should get some OCR result");
        });
    });

    describe("Stage Extraction Logic", () => {
        it("should correctly extract stage text from OCR output", async () => {
            // 直接测试提取逻辑
            const extractStageText = (rawText: string): string => {
                if (!rawText) return "";
                const normalized = rawText
                    .replace(/[—–－]/g, "-")
                    .replace(/\s+/g, "")
                    .replace(/[^0-9-]/g, "");
                const match = normalized.match(/(\d)-(\d)/);
                if (match) {
                    const stage = parseInt(match[1], 10);
                    const round = parseInt(match[2], 10);
                    if (stage >= 1 && stage <= 7 && round >= 1 && round <= 7) {
                        return `${stage}-${round}`;
                    }
                }
                return "";
            };

            // 测试各种输入
            assert.equal(extractStageText("2-1"), "2-1");
            assert.equal(extractStageText("Stage: 3-5"), "3-5");
            assert.equal(extractStageText("round 1-4"), "1-4");
            assert.equal(extractStageText("7-4 (final)"), "7-4");
            assert.equal(extractStageText("invalid"), "");
            assert.equal(extractStageText(""), "");
        });
    });

    describe("Stage Progression Validation", () => {
        it("should validate stage progression correctly", async () => {
            const { validateStageProgression, getValidNextStages } = await import("../../src-backend/ocr/StageValidator");

            // 测试有效进展
            assert.equal(validateStageProgression("1-2", "1-1"), true);
            assert.equal(validateStageProgression("2-1", "1-4"), true);
            assert.equal(validateStageProgression("3-1", "2-5"), true);

            // 测试无效进展 (后退)
            assert.equal(validateStageProgression("1-1", "1-2"), false);
            assert.equal(validateStageProgression("1-4", "2-1"), false);

            // 测试下一阶段
            const next11 = getValidNextStages("1-1");
            assert.ok(next11.includes("1-2"), "1-1 should lead to 1-2");

            const next14 = getValidNextStages("1-4");
            assert.ok(next14.includes("2-1"), "1-4 should lead to 2-1");
        });
    });

    describe("Confidence Normalization", () => {
        it("should normalize Tesseract confidence (0-100) to 0-1", async () => {
            const { ConfidenceNormalizer } = await import("../../src-backend/ocr/ConfidenceNormalizer");
            const normalizer = new ConfidenceNormalizer();

            // 测试归一化
            assert.equal(normalizer.normalize(100, "tesseract"), 1);
            assert.equal(normalizer.normalize(0, "tesseract"), 0);
            
            // 50 → 应用非线性校正后 < 0.5
            const norm50 = normalizer.normalize(50, "tesseract");
            assert.ok(norm50 < 0.5 && norm50 > 0.3, `Expected ~0.35, got ${norm50}`);
        });

        it("should handle EasyOCR confidence (0-1)", async () => {
            const { ConfidenceNormalizer } = await import("../../src-backend/ocr/ConfidenceNormalizer");
            const normalizer = new ConfidenceNormalizer();

            const norm95 = normalizer.normalize(0.95, "easyocr");
            assert.ok(norm95 < 0.95 && norm95 > 0.9, `Expected ~0.926, got ${norm95}`);
        });
    });

    describe("MultiPosition Scanner Logic", () => {
        it("should select best result from multiple positions", async () => {
            const { MultiPositionScanner } = await import("../../src-backend/ocr/MultiPositionScanner");
            
            // 创建模拟引擎
            const mockEngine = {
                name: "mock-engine",
                recognize: async (_buffer: Buffer, options?: { roi?: { x: number; y: number; width: number; height: number } }) => {
                    const x = options?.roi?.x ?? 0;
                    // 模拟不同位置返回不同置信度
                    const confidences: Record<number, number> = {
                        280: 0.6,
                        320: 0.75,
                        360: 0.9,
                        400: 0.85,
                        440: 0.7,
                    };
                    return {
                        text: x >= 340 && x <= 400 ? "2-1" : "",
                        confidence: confidences[x] ?? 0.5,
                        engine: "mock",
                    };
                },
                initialize: async () => {},
                isAvailable: () => true,
                getEngineInfo: () => ({ name: "mock", languages: ["en"], type: "custom" as const, requiresGpu: false, estimatedInitTimeMs: 100 }),
                destroy: async () => {},
                getHealthStatus: () => ({ initialized: true, busy: false, recognitionCount: 0, failureCount: 0, averageProcessingTimeMs: 0 }),
            };

            const scanner = new MultiPositionScanner({
                positions: [
                    { x: 280, y: 0, width: 200, height: 60 },
                    { x: 320, y: 0, width: 200, height: 60 },
                    { x: 360, y: 0, width: 200, height: 60 },
                    { x: 400, y: 0, width: 200, height: 60 },
                    { x: 440, y: 0, width: 200, height: 60 },
                ],
                validateStage: false, // 禁用阶段验证以便测试
            });

            const result = await scanner.scan(mockEngine, Buffer.from("mock"));

            // 应该选择 x=360 的结果 (置信度最高: 0.9)
            assert.ok(result !== null, "Should get a result");
            assert.equal(result.text, "2-1");
            assert.ok(result.confidence > 0.8, `Expected high confidence, got ${result.confidence}`);
        });
    });
});
