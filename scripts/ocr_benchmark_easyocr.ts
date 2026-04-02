/**
 * EasyOCR 多位置 + 预处理基准测试
 * 测试 EasyOCR 在不同预处理和位置扫描下的准确率
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface FrameResult {
    frame: string;
    expectedStage: string | null;
    bestResult: string;
    bestConfidence: number;
    bestPosition: number;
    bestPreprocessing: string;
    isCorrect: boolean;
}

interface BenchmarkSummary {
    recording: string;
    totalFrames: number;
    validFrames: number;
    accuracy: number;
    correct: number;
    averageConfidence: number;
}

// TFT 阶段列表
const VALID_STAGES = [
    '1-1', '1-2', '1-3', '1-4',
    '2-1', '2-2', '2-3', '2-4', '2-5',
    '3-1', '3-2', '3-3', '3-4', '3-5',
    '4-1', '4-2', '4-3', '4-4', '4-5',
    '5-1', '5-2', '5-3', '5-4', '5-5',
    '6-1', '6-2', '6-3', '6-4', '6-5',
    '7-1', '7-2', '7-3', '7-4',
];

// Android 阶段指示器位置 (X 坐标范围)
const STAGE_POSITIONS = [280, 300, 320, 340, 360, 380, 400, 420, 440];

// 预处理选项
const PREPROCESSING_OPTIONS = [
    { name: 'none', args: '' },
    { name: 'grayscale', args: '--grayscale' },
    { name: 'threshold-120', args: '--grayscale --threshold 120' },
    { name: 'threshold-140', args: '--grayscale --threshold 140' },
    { name: 'threshold-160', args: '--grayscale --threshold 160' },
];

// 从文件名解析阶段
function parseStageFromFilename(filename: string): string | null {
    const match = filename.match(/(\d)-(\d)/);
    if (match) {
        return `${match[1]}-${match[2]}`;
    }
    return null;
}

// 根据帧索引推断期望的阶段
function inferExpectedStage(frameIndex: number, totalFrames: number): string | null {
    const progress = frameIndex / totalFrames;
    const stageIndex = Math.floor(progress * VALID_STAGES.length);
    return VALID_STAGES[Math.min(stageIndex, VALID_STAGES.length - 1)];
}

// 使用 Python 运行 EasyOCR
async function runEasyOcr(
    imagePath: string,
    position: number,
    preprocArgs: string
): Promise<{ text: string; confidence: number }> {
    try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'easyocr_bridge.py');
        // 使用 ROI 裁剪到阶段指示器位置
        const roiArg = `--roi ${position},0,200,60`;
        const cmd = `python "${scriptPath}" "${imagePath}" ${roiArg} ${preprocArgs}`;
        const { stdout } = await execAsync(cmd);
        const result = JSON.parse(stdout.trim());
        return { text: result.text || '', confidence: result.confidence || 0 };
    } catch (error) {
        return { text: '', confidence: 0 };
    }
}

// 提取阶段文本
function extractStageText(text: string): string {
    const normalized = text.replace(/[^0-9-]/g, '').trim();
    const match = normalized.match(/(\d)-(\d)/);
    if (match) {
        return `${match[1]}-${match[2]}`;
    }
    return '';
}

async function processRecording(framesDir: string, recordingName: string): Promise<BenchmarkSummary> {
    console.log(`\n========== 处理录制: ${recordingName} ==========`);

    const frames = fs.readdirSync(framesDir)
        .filter(f => f.endsWith('.jpg') || f.endsWith('.png'))
        .sort();

    let correct = 0;
    let validFrames = 0;
    let totalConfidence = 0;

    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const framePath = path.join(framesDir, frame);
        const expectedStage = parseStageFromFilename(frame) || inferExpectedStage(i, frames.length);

        if (!expectedStage) continue;

        validFrames++;
        process.stdout.write(`\r处理帧 ${i + 1}/${frames.length}: ${frame}    `);

        let bestResult = '';
        let bestConfidence = 0;
        let bestPosition = 0;
        let bestPreprocessing = '';

        // 测试所有位置和预处理组合
        for (const position of STAGE_POSITIONS) {
            for (const preproc of PREPROCESSING_OPTIONS) {
                const ocrResult = await runEasyOcr(framePath, position, preproc.name === 'none' ? '' : preproc.args);
                const stage = extractStageText(ocrResult.text);

                if (stage && ocrResult.confidence > bestConfidence) {
                    bestResult = stage;
                    bestConfidence = ocrResult.confidence;
                    bestPosition = position;
                    bestPreprocessing = preproc.name;
                }
            }
        }

        if (bestResult === expectedStage) {
            correct++;
        }
        totalConfidence += bestConfidence;
    }

    console.log('\n');

    const summary: BenchmarkSummary = {
        recording: recordingName,
        totalFrames: frames.length,
        validFrames,
        accuracy: validFrames > 0 ? (correct / validFrames) * 100 : 0,
        correct,
        averageConfidence: validFrames > 0 ? totalConfidence / validFrames : 0,
    };

    console.log(`EasyOCR 准确率: ${summary.accuracy.toFixed(2)}% (${correct}/${validFrames})`);
    console.log(`平均置信度: ${(summary.averageConfidence * 100).toFixed(2)}%`);

    return summary;
}

async function main() {
    console.log('=== EasyOCR 多位置 + 预处理 基准测试 ===\n');
    console.log(`测试位置: ${STAGE_POSITIONS.join(', ')}`);
    console.log(`预处理选项: ${PREPROCESSING_OPTIONS.map(p => p.name).join(', ')}\n`);

    const recordings = [
        { dir: 'examples/recordings/derived/screen-recording-20260322/frames', name: 'Recording 1 (20260322)' },
        { dir: 'examples/recordings/derived/screen-recording-20260323/frames', name: 'Recording 2 (20260323)' },
        { dir: 'examples/recordings/derived/screen-recording-20260323-2/frames', name: 'Recording 3 (20260323-2)' },
    ];

    const summaries: BenchmarkSummary[] = [];

    for (const rec of recordings) {
        if (fs.existsSync(rec.dir)) {
            const summary = await processRecording(rec.dir, rec.name);
            summaries.push(summary);
        } else {
            console.log(`跳过 ${rec.name}: 目录不存在`);
        }
    }

    // 总结
    console.log('\n\n========== 基准测试总结 ==========');
    console.log('| 录制 | 帧数 | 准确率 | 平均置信度 |');
    console.log('|------|------|--------|------------|');
    for (const s of summaries) {
        console.log(`| ${s.recording} | ${s.validFrames} | ${s.accuracy.toFixed(1)}% | ${(s.averageConfidence * 100).toFixed(1)}% |`);
    }

    const totalCorrect = summaries.reduce((sum, s) => sum + s.correct, 0);
    const totalValid = summaries.reduce((sum, s) => sum + s.validFrames, 0);
    console.log(`\n总体准确率: ${totalValid > 0 ? ((totalCorrect / totalValid) * 100).toFixed(2) : 0}% (${totalCorrect}/${totalValid})`);

    // 保存结果
    const reportPath = path.join(process.cwd(), 'examples', 'ocr-benchmark-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(summaries, null, 2));
    console.log(`\n结果已保存到: ${reportPath}`);
}

main().catch(console.error);
