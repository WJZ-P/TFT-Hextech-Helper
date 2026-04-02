#!/usr/bin/env node --import tsx
/**
 * 预处理预设基准测试 - 测试哪个预设对 TFT 阶段识别效果最好
 */

import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ANDROID_TFT_PRESETS } from "../src-backend/ocr/AndroidTftPresets";

const execAsync = promisify(exec);

interface PresetResult {
    preset: string;
    text: string;
    confidence: number;
    isCorrect: boolean;
}

async function testPreset(
    framePath: string,
    presetName: string,
    position: number
): Promise<PresetResult> {
    // 对于 Python bridge，我们需要先预处理图片，然后传给 bridge
    // 但 bridge 有自己的预处理选项，所以我们直接使用 bridge 的预处理
    const preset = ANDROID_TFT_PRESETS.find((p) => p.name === presetName);
    if (!preset) {
        return { preset: presetName, text: "", confidence: 0, isCorrect: false };
    }

    // 构建命令行参数
    const args: string[] = [
        `--roi ${position},0,200,60`,
        "--grayscale",
    ];
    if (preset.threshold !== null) {
        args.push(`--threshold ${preset.threshold}`);
    }

    try {
        const cmd = `python scripts/easyocr_bridge.py "${framePath}" ${args.join(" ")}`;
        const { stdout } = await execAsync(cmd, { timeout: 30000 });
        const result = JSON.parse(stdout.trim());

        // 提取阶段文本
        const match = (result.text || "").replace(/[^0-9-]/g, "").match(/(\d)-(\d)/);
        const stageText = match ? `${match[1]}-${match[2]}` : "";

        return {
            preset: presetName,
            text: stageText,
            confidence: result.confidence || 0,
            isCorrect: stageText.length > 0,
        };
    } catch {
        return { preset: presetName, text: "", confidence: 0, isCorrect: false };
    }
}

async function main() {
    console.log("=== 预处理预设基准测试 ===\n");

    const framesDir = "examples/recordings/derived/screen-recording-20260322/frames";
    if (!fs.existsSync(framesDir)) {
        console.log("测试帧目录不存在");
        process.exit(1);
    }

    // 测试几帧
    const frames = fs.readdirSync(framesDir).filter((f) => f.endsWith(".jpg")).slice(0, 3);
    const positions = [340, 380, 420];
    const presetNames = ANDROID_TFT_PRESETS.map((p) => p.name);

    // 聚合结果
    const presetStats: Record<string, { correct: number; total: number; totalConfidence: number }> = {};
    for (const name of presetNames) {
        presetStats[name] = { correct: 0, total: 0, totalConfidence: 0 };
    }

    for (const frame of frames) {
        console.log(`\n测试帧: ${frame}`);
        const framePath = path.join(framesDir, frame);

        for (const pos of positions) {
            process.stdout.write(`  位置 x=${pos}: `);

            // 并行测试所有预设
            const results = await Promise.all(
                presetNames.map((name) => testPreset(framePath, name, pos))
            );

            // 找到最佳预设
            const best = results.reduce((a, b) => (b.confidence > a.confidence ? b : b.text ? b : a));
            console.log(`最佳=${best.preset} (${(best.confidence * 100).toFixed(0)}%) "${best.text}"`);

            // 聚合
            for (const r of results) {
                presetStats[r.preset].total++;
                presetStats[r.preset].totalConfidence += r.confidence;
                if (r.isCorrect) presetStats[r.preset].correct++;
            }
        }
    }

    // 输出总结
    console.log("\n\n========== 预设排名 ==========");
    console.log("预设 | 检出率 | 平均置信度");
    console.log("-----|--------|------------");

    const sorted = Object.entries(presetStats)
        .map(([name, stats]) => ({
            name,
            detectionRate: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
            avgConfidence: stats.total > 0 ? (stats.totalConfidence / stats.total) * 100 : 0,
        }))
        .sort((a, b) => b.avgConfidence - a.avgConfidence);

    for (const s of sorted) {
        console.log(`${s.name.padEnd(20)} | ${s.detectionRate.toFixed(0)}% | ${s.avgConfidence.toFixed(1)}%`);
    }

    console.log(`\n推荐预设: ${sorted[0]?.name || "unknown"}`);
}

main().catch(console.error);
