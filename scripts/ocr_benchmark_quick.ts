/**
 * 快速 OCR 基准测试 - 抽样测试
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 精选的位置和预处理组合
const TEST_CONFIGS = [
    { name: 'pos340-thresh140', position: 340, args: '--grayscale --threshold 140' },
    { name: 'pos380-thresh140', position: 380, args: '--grayscale --threshold 140' },
    { name: 'pos340-thresh160', position: 340, args: '--grayscale --threshold 160' },
    { name: 'pos380-thresh160', position: 380, args: '--grayscale --threshold 160' },
    { name: 'pos340-gray', position: 340, args: '--grayscale' },
    { name: 'pos380-gray', position: 380, args: '--grayscale' },
];

interface FrameResult {
    frame: string;
    expectedStage: string;
    bestResult: string;
    bestConfidence: number;
    bestConfig: string;
    isCorrect: boolean;
}

function parseStageFromFilename(filename: string): string | null {
    const match = filename.match(/(\d)-(\d)/);
    return match ? `${match[1]}-${match[2]}` : null;
}

function inferExpectedStage(frameIndex: number, totalFrames: number): string {
    const VALID_STAGES = ['1-1', '1-2', '1-3', '1-4', '2-1', '2-2', '2-3', '2-4', '2-5',
        '3-1', '3-2', '3-3', '3-4', '3-5', '4-1', '4-2', '4-3', '4-4', '4-5',
        '5-1', '5-2', '5-3', '5-4', '5-5', '6-1', '6-2', '6-3', '6-4', '6-5',
        '7-1', '7-2', '7-3', '7-4'];
    const stageIndex = Math.floor((frameIndex / totalFrames) * VALID_STAGES.length);
    return VALID_STAGES[Math.min(stageIndex, VALID_STAGES.length - 1)];
}

function extractStageText(text: string): string {
    const match = text.replace(/[^0-9-]/g, '').match(/(\d)-(\d)/);
    return match ? `${match[1]}-${match[2]}` : '';
}

async function runOcr(imagePath: string, position: number, args: string): Promise<{ text: string; confidence: number }> {
    try {
        const roiArg = `--roi ${position},0,200,60`;
        const cmd = `python scripts/easyocr_bridge.py "${imagePath}" ${roiArg} ${args}`;
        const { stdout } = await execAsync(cmd);
        const result = JSON.parse(stdout.trim());
        return { text: result.text || '', confidence: result.confidence || 0 };
    } catch {
        return { text: '', confidence: 0 };
    }
}

async function main() {
    console.log('=== 快速 OCR 基准测试 (抽样) ===\n');

    const recordings = [
        { dir: 'examples/recordings/derived/screen-recording-20260322/frames', name: 'Recording 1' },
        { dir: 'examples/recordings/derived/screen-recording-20260323/frames', name: 'Recording 2' },
        { dir: 'examples/recordings/derived/screen-recording-20260323-2/frames', name: 'Recording 3' },
    ];

    const allResults: Record<string, { correct: number; total: number }> = {};

    for (const rec of recordings) {
        if (!fs.existsSync(rec.dir)) {
            console.log(`跳过 ${rec.name}: 目录不存在`);
            continue;
        }

        const frames = fs.readdirSync(rec.dir).filter(f => f.endsWith('.jpg')).sort();
        // 每 10 帧取一帧进行测试
        const sampleFrames = frames.filter((_, i) => i % 10 === 0);

        console.log(`\n${rec.name}: 测试 ${sampleFrames.length}/${frames.length} 帧`);

        let correct = 0;
        let total = 0;

        for (let i = 0; i < sampleFrames.length; i++) {
            const frame = sampleFrames[i];
            const frameIndex = frames.indexOf(frame);
            const framePath = path.join(rec.dir, frame);
            const expectedStage = parseStageFromFilename(frame) || inferExpectedStage(frameIndex, frames.length);

            process.stdout.write(`\r[${i + 1}/${sampleFrames.length}] ${frame} (期望: ${expectedStage})`);

            let bestResult = '';
            let bestConfidence = 0;
            let bestConfig = '';

            for (const config of TEST_CONFIGS) {
                const ocr = await runOcr(framePath, config.position, config.args);
                const stage = extractStageText(ocr.text);
                if (stage && ocr.confidence > bestConfidence) {
                    bestResult = stage;
                    bestConfidence = ocr.confidence;
                    bestConfig = config.name;
                }
            }

            total++;
            if (bestResult === expectedStage) correct++;
        }

        console.log('');
        const accuracy = total > 0 ? (correct / total) * 100 : 0;
        console.log(`  准确率: ${accuracy.toFixed(1)}% (${correct}/${total})`);
        allResults[rec.name] = { correct, total };
    }

    // 总结
    console.log('\n========== 总结 ==========');
    let totalCorrect = 0, totalFrames = 0;
    for (const [name, result] of Object.entries(allResults)) {
        const acc = result.total > 0 ? (result.correct / result.total) * 100 : 0;
        console.log(`${name}: ${acc.toFixed(1)}% (${result.correct}/${result.total})`);
        totalCorrect += result.correct;
        totalFrames += result.total;
    }
    console.log(`\n总体: ${totalFrames > 0 ? ((totalCorrect / totalFrames) * 100).toFixed(1) : 0}% (${totalCorrect}/${totalFrames})`);

    // 保存结果
    fs.writeFileSync('examples/ocr-benchmark-quick.json', JSON.stringify(allResults, null, 2));
    console.log('\n结果已保存到 examples/ocr-benchmark-quick.json');
}

main().catch(console.error);
