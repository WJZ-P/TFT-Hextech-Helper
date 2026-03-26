/**
 * @file Android Stress Test CLI
 * @description 长时间运行压力测试脚本，用于验证 Android OCR 稳定性
 * 
 * 功能：
 * - 连续运行 N 轮 smoke 测试
 * - 收集内存/准确率/响应时间指标
 * - 检测 Worker 回收触发点
 * - 输出 JSON 报告
 * 
 * 使用：
 *   node --import tsx scripts/run-android-stress-test.ts --rounds 5 --output-report reports/stress-test.json
 *   node --import tsx scripts/run-android-stress-test.ts --scenario android-reroll-midgame --rounds 3
 */

import { execFile } from "child_process";
import path from "path";
import fs from "fs-extra";
import { logger } from "../src-backend/utils/Logger";
import { memoryMonitor, formatMB } from "../src-backend/utils/MemoryMonitor";
import { ocrService, OcrWorkerType } from "../src-backend/tft/recognition/OcrService";
import { AndroidEmulatorAdapter } from "../src-backend/adapters/AndroidEmulatorAdapter";

/**
 * 压力测试报告结构
 */
interface StressTestReport {
    /** 测试开始时间 */
    startTime: number;
    /** 测试结束时间 */
    endTime: number;
    /** 总轮数 */
    totalRounds: number;
    /** 成功轮数 */
    successfulRounds: number;
    /** 失败信息 */
    failedAt: Array<{ round: number; stage: string; reason: string }>;
    /** 时间线指标 */
    timeline: {
        /** 每轮耗时 (ms) */
        roundTime: number[];
        /** OCR 准确率 (%) */
        ocrAccuracy: number;
        /** 内存峰值 (MB) */
        memoryPeak: number;
        /** 内存平均 (MB) */
        memoryAvg: number;
        /** 内存增长率 (%) */
        memoryGrowthRate: number;
        /** 错误次数 */
        errorCount: number;
    };
    /** 摘要 */
    summary: {
        /** 是否通过 */
        passed: boolean;
        /** 平均响应时间 (ms) */
        avgResponseTime: number;
        /** 最大内存 (MB) */
        maxMemory: number;
        /** 建议 */
        recommendation: string;
    };
}

/**
 * CLI 参数
 */
interface StressTestOptions {
    /** 运行轮数 */
    rounds: number;
    /** 场景名称（可选） */
    scenario?: string;
    /** 输出报告路径 */
    outputReport?: string;
    /**  fixture 路径（可选） */
    fixture?: string;
    /** 是否记录指标 */
    recordMetrics: boolean;
}

interface PerRoundDetail {
    round: number;
    success: boolean;
    durationMs: number;
    stageCount: number;
    avgResponsePerStageMs: number | null;
    ocrAccuracyPercent: number | null;
    misoperations: number | null;
    memoryRssMB: number;
    parsedSummary?: any;
    workerHealth?: Record<string, any>;
}

/**
 * 运行单轮 smoke 测试
 */
async function runSmokeRound(
    options: Pick<StressTestOptions, "scenario" | "fixture">
): Promise<{ success: boolean; stdout: string; stderr: string; code: number | null }> {
    return new Promise((resolve) => {
        const args: string[] = [];
        
        if (options.scenario) {
            args.push("--scenario", options.scenario);
        }
        
        if (options.fixture) {
            args.push("--fixture", options.fixture);
        }

        const scriptPath = path.join(process.cwd(), "scripts", "run-android-live-smoke.ts");
        
        logger.info(`[StressTest] 运行第 ${options.scenario || "default"} 轮...`);
        
        execFile("node", ["--import", "tsx", scriptPath, ...args], {
            cwd: process.cwd(),
            timeout: 120000, // 2 分钟超时
        }, (error, stdout, stderr) => {
            resolve({
                success: !error,
                stdout,
                stderr,
                code: error?.code ? null : 0,
            });
        });
    });
}

/**
 * 解析 smoke 测试 JSON 输出
 */
function parseSmokeOutput(stdout: string): any | null {
    try {
        // 查找 JSON 开始
        const jsonStart = stdout.indexOf("{");
        if (jsonStart === -1) return null;
        
        // 简单 JSON 提取（假设无嵌套大括号）
        const jsonEnd = stdout.lastIndexOf("}");
        if (jsonEnd === -1) return null;
        
        const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
        return JSON.parse(jsonStr);
    } catch {
        return null;
    }
}

/**
 * 主函数
 */
async function main(): Promise<void> {
    const args = process.argv.slice(2);
    
    const options: StressTestOptions = {
        rounds: 5,
        recordMetrics: false,
    };
    
    // 解析参数
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i];
        const value = args[i + 1];
        
        if (key === "--rounds" && value) {
            options.rounds = parseInt(value);
        } else if (key === "--scenario" && value) {
            options.scenario = value;
        } else if (key === "--output-report" && value) {
            options.outputReport = value;
        } else if (key === "--fixture" && value) {
            options.fixture = value;
        } else if (key === "--record-metrics") {
            options.recordMetrics = true;
        }
    }
    
    logger.info(
        `[StressTest] 开始压力测试：` +
        `轮数=${options.rounds}, ` +
        `场景=${options.scenario || "default"}, ` +
        `fixture=${options.fixture || "none"}`
    );
    
    const report: StressTestReport = {
        startTime: Date.now(),
        endTime: 0,
        totalRounds: options.rounds,
        successfulRounds: 0,
        failedAt: [],
        timeline: {
            roundTime: [],
            ocrAccuracy: 0,
            memoryPeak: 0,
            memoryAvg: 0,
            memoryGrowthRate: 0,
            errorCount: 0,
        },
        summary: {
            passed: false,
            avgResponseTime: 0,
            maxMemory: 0,
            recommendation: "",
        },
    };
    
    // 确保输出目录存在
    if (options.outputReport) {
        await fs.ensureDir(path.dirname(options.outputReport));
    }
    
    // 采样初始内存
    const initialMem = memoryMonitor.sample("stress:start");
    logger.info(`[StressTest] 初始内存：RSS=${formatMB(initialMem.rss)}`);
    
    // 安装中断/退出处理，优雅保存中间报告
    let aborted = false;
    process.on("SIGINT", async () => {
        if (aborted) return; // second SIGINT -> hard exit
        aborted = true;
        logger.warn("[StressTest] 收到 SIGINT，中止后写入中间报告...");
    });

    // adapter 用于健康检查/辅助信息采集（不用于直接控制子进程）
    const adapter = new AndroidEmulatorAdapter();

    const perRoundDetails: PerRoundDetail[] = [];

    // 运行多轮测试
    for (let round = 1; round <= options.rounds; round++) {
        if (aborted) break;
        const roundStart = Date.now();
        
        logger.info(`[StressTest] 第 ${round}/${options.rounds} 轮开始`);
        
        const result = await runSmokeRound({
            scenario: options.scenario,
            fixture: options.fixture,
        });
        
        const roundTime = Date.now() - roundStart;
        report.timeline.roundTime.push(roundTime);

        // 记录内存
        const memSnapshot = memoryMonitor.sample(`stress:round_${round}`);

        // 采集 OCR/worker 快照（非强制，会返回部分信息）
        const workerHealthSnapshot: Record<string, any> = {};
        try {
            workerHealthSnapshot.gameStage = ocrService.getWorkerHealth(OcrWorkerType.GAME_STAGE);
            workerHealthSnapshot.chess = ocrService.getWorkerHealth(OcrWorkerType.CHESS);
            workerHealthSnapshot.cache = ocrService.getCacheStats?.() ?? null;
        } catch (e) {
            // 允许失败（避免因为 tesseract 在子进程中被使用导致父进程抛错）
            logger.debug(`[StressTest] 获取 OCR 快照失败: ${String(e)}`);
        }

        const perRound: PerRoundDetail = {
            round,
            success: !!result.success,
            durationMs: roundTime,
            stageCount: 0,
            avgResponsePerStageMs: null,
            ocrAccuracyPercent: null,
            misoperations: null,
            memoryRssMB: memSnapshot.rss / 1024 / 1024,
            parsedSummary: null,
            workerHealth: workerHealthSnapshot,
        };

        if (result.success) {
            report.successfulRounds++;
            logger.info(`[StressTest] 第 ${round} 轮成功 (耗时=${roundTime}ms, RSS=${formatMB(memSnapshot.rss)})`);

            // 尝试解析输出
            const parsed = parseSmokeOutput(result.stdout);
            if (parsed) {
                logger.debug(`[StressTest] 第 ${round} 轮输出：${JSON.stringify(parsed, null, 2)}`);
                perRound.parsedSummary = parsed;

                // 计算 stageCount 优先使用 traceSummary.frameCount
                const stageCount = parsed.traceSummary?.frameCount ?? parsed.analysisSequence?.length ?? parsed.foregroundTrace?.length ?? 0;
                perRound.stageCount = stageCount;
                perRound.avgResponsePerStageMs = stageCount > 0 ? Math.round(roundTime / stageCount) : null;

                // 如果使用 fixture 模式且包含 expectedStateMatched，则可计算 OCR 准确率和误操作
                if (Array.isArray(parsed.analysisSequence) && parsed.analysisSequence.length > 0) {
                    const frames = parsed.analysisSequence as any[];
                    const framesWithExpected = frames.filter((f) => f.expectedStateMatched !== null && f.expectedStateMatched !== undefined);
                    if (framesWithExpected.length > 0) {
                        const matched = framesWithExpected.filter((f) => f.expectedStateMatched === true).length;
                        perRound.ocrAccuracyPercent = Math.round((matched / framesWithExpected.length) * 10000) / 100; // two decimals
                    }
                    // misoperations = expectedDecisionMatched === false
                    const misops = frames.filter((f) => f.expectedDecisionMatched === false).length;
                    perRound.misoperations = misops;
                }
            }
        } else {
            report.timeline.errorCount++;
            report.failedAt.push({
                round,
                stage: `round_${round}`,
                reason: result.stderr || "unknown error",
            });
            logger.error(`[StressTest] 第 ${round} 轮失败：${result.stderr}`);
        }

        perRoundDetails.push(perRound);
        
        // 轮间短暂休息（避免过热）
        if (round < options.rounds) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // 采样结束内存
    const finalMem = memoryMonitor.sample("stress:end");
    logger.info(`[StressTest] 结束内存：RSS=${formatMB(finalMem.rss)}`);
    
    // 导出内存统计
    const memStats = memoryMonitor.getStats();
    if (memStats) {
        report.timeline.memoryPeak = memStats.maxRss / 1024 / 1024;
        report.timeline.memoryAvg = memStats.avgRss / 1024 / 1024;
        report.timeline.memoryGrowthRate = memStats.growthRate;
    }
    
    report.endTime = Date.now();
    // attach per-round details
    (report as any).perRound = perRoundDetails;
    
    // 计算摘要
    const avgTime = report.timeline.roundTime.reduce((a, b) => a + b, 0) / report.timeline.roundTime.length;
    const allPassed = report.failedAt.length === 0;
    
    report.summary.avgResponseTime = avgTime;
    report.summary.maxMemory = report.timeline.memoryPeak;
    report.summary.passed = allPassed && report.timeline.memoryGrowthRate < 50; // 增长率 < 50%
    
    if (allPassed) {
        report.summary.recommendation = "压力测试通过，内存增长在可控范围内";
    } else {
        report.summary.recommendation = `压力测试失败：${report.failedAt.length} 轮出错，建议检查 Worker 回收机制`;
    }
    
    // 输出报告
    memoryMonitor.exportToLog("StressTest");
    
    logger.info(
        `[StressTest] 测试完成：` +
        `成功=${report.successfulRounds}/${report.totalRounds}, ` +
        `平均耗时=${avgTime.toFixed(0)}ms, ` +
        `峰值内存=${report.timeline.memoryPeak.toFixed(2)}MB, ` +
        `增长=${report.timeline.memoryGrowthRate.toFixed(2)}%`
    );
    
    // 写入报告文件
    if (options.outputReport) {
        await fs.writeFile(options.outputReport, JSON.stringify(report, null, 2), "utf-8");
        logger.info(`[StressTest] 报告已保存：${options.outputReport}`);
    }
    // 额外生成 Markdown 报告（如果提供输出路径，则同目录写入 .md）
    try {
        const mdPath = options.outputReport
            ? options.outputReport.replace(/\.json$/i, ".md")
            : path.join(process.cwd(), "reports", `stress-test-${Date.now()}.md`);
        const md = generateMarkdownReport(report as any, (report as any).perRound || []);
        await fs.ensureDir(path.dirname(mdPath));
        await fs.writeFile(mdPath, md, "utf-8");
        logger.info(`[StressTest] Markdown 报告已保存：${mdPath}`);
    } catch (e) {
        logger.warn(`[StressTest] 生成 Markdown 报告失败: ${String(e)}`);
    }
    
    // 输出 JSON 到 stdout（供 CI 使用）
    console.log(JSON.stringify(report, null, 2));
}

/**
 * 生成简单 Markdown 报告，遵循任务要求的表格布局（尽量使用已收集的数据）
 */
function generateMarkdownReport(report: any, perRound: PerRoundDetail[]): string {
    const totalDurationMs = Math.max(0, report.endTime - report.startTime);
    const totalMinutes = Math.round((totalDurationMs / 1000) / 60 * 10) / 10;
    const successRate = report.totalRounds > 0 ? Math.round((report.successfulRounds / report.totalRounds) * 10000) / 100 : 0;

    const header = `# Android Stress Test Report\n`;
    const summary = `## Summary\n- Games Run: ${report.totalRounds}\n- Total Duration: ${totalMinutes} minutes\n- Success Rate: ${successRate}%\n\n`;

    const perGameHeader = `## Per-Game Metrics\n| Game | Duration | Avg Response Time | OCR Accuracy | Misops | Memory (RSS MB) |\n|------|----------|-------------------|--------------|--------|-----------------:|\n`;
    const perGameRows = perRound.map((r) => {
        const dur = `${Math.floor(r.durationMs / 60000)}m ${Math.round((r.durationMs % 60000) / 1000)}s`;
        const avgResp = r.avgResponsePerStageMs !== null ? `${r.avgResponsePerStageMs}ms` : "-";
        const ocr = r.ocrAccuracyPercent !== null ? `${r.ocrAccuracyPercent}%` : "-";
        const mis = r.misoperations !== null ? `${r.misoperations}` : "-";
        const mem = r.memoryRssMB.toFixed(2);
        return `| ${r.round} | ${dur} | ${avgResp} | ${ocr} | ${mis} | ${mem} |`;
    }).join("\n");

    // Stage performance: use aggregated avgResponsePerStageMs if available
    const stageHeader = `\n## Stage Performance\n| Stage | Avg Response | OCR Accuracy |\n|-------|--------------|--------------|\n`;
    let stageRows = "| overall | - | - |";
    const avgPerStageValues = perRound.map(r => r.avgResponsePerStageMs).filter(Boolean) as number[];
    if (avgPerStageValues.length > 0) {
        const overallAvg = Math.round((avgPerStageValues.reduce((a,b) => a+b,0) / avgPerStageValues.length) * 100) / 100;
        stageRows = `| overall | ${overallAvg}ms | ${report.timeline.ocrAccuracy || "-"} |`;
    }

    return [header, summary, perGameHeader, perGameRows, stageHeader, stageRows, "\n"].join("\n");
}

// 运行
main().catch((e) => {
    logger.error(`[StressTest] 压力测试异常：${e.message}`);
    process.exit(1);
});
