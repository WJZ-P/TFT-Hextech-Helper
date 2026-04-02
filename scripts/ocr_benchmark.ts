/**
 * 多引擎 OCR 准确率基准测试
 * 测试 Tesseract + EasyOCR 投票引擎在所有 3 个录制上的表现
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface FrameResult {
    frame: string;
    expectedStage: string | null;
    tesseractResult: string;
    tesseractConfidence: number;
    easyocrResult: string;
    easyocrConfidence: number;
    votingResult: string;
    votingConfidence: number;
    isCorrect: boolean;
}

interface BenchmarkSummary {
    recording: string;
    totalFrames: number;
    validFrames: number;
    tesseractAccuracy: number;
    easyocrAccuracy: number;
    votingAccuracy: number;
    tesseractCorrect: number;
    easyocrCorrect: number;
    votingCorrect: number;
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

// 根据帧索引推断期望的阶段
function inferExpectedStage(frameIndex: number, totalFrames: number): string | null {
    // 假设游戏从 1-1 开始，到 7-4 结束
    // 每个阶段大约占总帧数的比例
    const progress = frameIndex / totalFrames;
    const stageIndex = Math.floor(progress * VALID_STAGES.length);
    return VALID_STAGES[Math.min(stageIndex, VALID_STAGES.length - 1)];
}

// 从文件名解析阶段
function parseStageFromFilename(filename: string): string | null {
    const match = filename.match(/(\d)-(\d)/);
    if (match) {
        return `${match[1]}-${match[2]}`;
    }
    return null;
}

// 使用 Python 运行 EasyOCR
async function runEasyOcr(imagePath: string): Promise<{ text: string; confidence: number }> {
    try {
        const scriptPath = path.join(process.cwd(), 'scripts', 'easyocr_bridge.py');
        const { stdout } = await execAsync(`python "${scriptPath}" "${imagePath}" --grayscale --threshold 140`);
        const result = JSON.parse(stdout.trim());
        return { text: result.text || '', confidence: result.confidence || 0 };
    } catch (error) {
        return { text: '', confidence: 0 };
    }
}

// 简化的 Tesseract 调用 (使用 tesseract.js 或命令行)
async function runTesseract(imagePath: string): Promise<{ text: string; confidence: number }> {
    try {
        const { stdout } = await execAsync(`tesseract "${imagePath}" stdout --psm 7 -c tessedit_char_whitelist=0123456789- 2>/dev/null`);
        const text = stdout.trim();
        // Tesseract 命令行不返回置信度，使用简单启发式
        const confidence = text.match(/\d-\d/) ? 0.85 : 0.5;
        return { text, confidence };
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

// 投票决策
function votingDecision(tesseractResult: string, easyocrResult: string, tesseractConf: number, easyocrConf: number): { text: string; confidence: number } {
    const tesseractStage = extractStageText(tesseractResult);
    const easyocrStage = extractStageText(easyocrResult);

    // 如果两者一致
    if (tesseractStage === easyocrStage && tesseractStage) {
        return { text: tesseractStage, confidence: Math.max(tesseractConf, easyocrConf) };
    }

    // 选择置信度更高的
    if (tesseractConf >= easyocrConf && tesseractStage) {
        return { text: tesseractStage, confidence: tesseractConf };
    }
    if (easyocrStage) {
        return { text: easyocrStage, confidence: easyocrConf };
    }

    return { text: '', confidence: 0 };
}

async function processRecording(framesDir: string, recordingName: string): Promise<BenchmarkSummary> {
    console.log(`\n========== 处理录制: ${recordingName} ==========`);

    const frames = fs.readdirSync(framesDir)
        .filter(f => f.endsWith('.png'))
        .sort();

    const results: FrameResult[] = [];
    let tesseractCorrect = 0;
    let easyocrCorrect = 0;
    let votingCorrect = 0;
    let validFrames = 0;

    for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const framePath = path.join(framesDir, frame);
        const expectedStage = parseStageFromFilename(frame) || inferExpectedStage(i, frames.length);

        if (!expectedStage) continue;

        validFrames++;
        process.stdout.write(`\r处理帧 ${i + 1}/${frames.length}: ${frame}`);

        // 运行 Tesseract
        const tesseract = await runTesseract(framePath);
        const tesseractStage = extractStageText(tesseract.text);

        // 运行 EasyOCR
        const easyocr = await runEasyOcr(framePath);
        const easyocrStage = extractStageText(easyocr.text);

        // 投票
        const voting = votingDecision(tesseract.text, easyocr.text, tesseract.confidence, easyocr.confidence);

        // 检查正确性
        if (tesseractStage === expectedStage) tesseractCorrect++;
        if (easyocrStage === expectedStage) easyocrCorrect++;
        if (voting.text === expectedStage) votingCorrect++;

        results.push({
            frame,
            expectedStage,
            tesseractResult: tesseractStage,
            tesseractConfidence: tesseract.confidence,
            easyocrResult: easyocrStage,
            easyocrConfidence: easyocr.confidence,
            votingResult: voting.text,
            votingConfidence: voting.confidence,
            isCorrect: voting.text === expectedStage,
        });
    }

    console.log('\n');

    const summary: BenchmarkSummary = {
        recording: recordingName,
        totalFrames: frames.length,
        validFrames,
        tesseractAccuracy: validFrames > 0 ? (tesseractCorrect / validFrames) * 100 : 0,
        easyocrAccuracy: validFrames > 0 ? (easyocrCorrect / validFrames) * 100 : 0,
        votingAccuracy: validFrames > 0 ? (votingCorrect / validFrames) * 100 : 0,
        tesseractCorrect,
        easyocrCorrect,
        votingCorrect,
    };

    console.log(`Tesseract 准确率: ${summary.tesseractAccuracy.toFixed(2)}% (${tesseractCorrect}/${validFrames})`);
    console.log(`EasyOCR 准确率: ${summary.easyocrAccuracy.toFixed(2)}% (${easyocrCorrect}/${validFrames})`);
    console.log(`Voting 准确率: ${summary.votingAccuracy.toFixed(2)}% (${votingCorrect}/${validFrames})`);

    return summary;
}

async function main() {
    console.log('=== 多引擎 OCR 准确率基准测试 ===\n');

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
    console.log('| 录制 | 帧数 | Tesseract | EasyOCR | Voting |');
    console.log('|------|------|-----------|---------|--------|');
    for (const s of summaries) {
        console.log(`| ${s.recording} | ${s.validFrames} | ${s.tesseractAccuracy.toFixed(1)}% | ${s.easyocrAccuracy.toFixed(1)}% | ${s.votingAccuracy.toFixed(1)}% |`);
    }

    // 保存结果
    const reportPath = path.join(process.cwd(), 'examples', 'ocr-benchmark-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(summaries, null, 2));
    console.log(`\n结果已保存到: ${reportPath}`);
}

main().catch(console.error);
