/**
 * @file Memory Monitor Utility
 * @description 轻量级内存监控工具，用于压力测试和长时间运行会话
 * 
 * 功能：
 * - 采样 process.memoryUsage() 快照
 * - 追踪峰值内存和增长率
 * - 导出聚合统计到日志
 * 
 * 使用场景：
 * - Android OCR 压力测试
 * - Worker 生命周期监控
 * - 长时间运行会话的内存泄漏检测
 */

import { logger } from "./Logger";

/**
 * 内存快照
 */
export interface MemorySnapshot {
    /** 时间戳 */
    timestamp: number;
    /** 标签（可选） */
    label?: string;
    /** RSS (Resident Set Size) - 总分配内存 */
    rss: number;
    /** JavaScript 堆总大小 */
    heapTotal: number;
    /** JavaScript 堆已使用大小 */
    heapUsed: number;
    /** 外部内存（C++ 对象绑定到 JS，包括 WASM） */
    external: number;
    /** 数组缓冲区 + DataView */
    arrayBuffers: number;
}

/**
 * 内存统计聚合
 */
export interface MemoryStats {
    /** 采样次数 */
    sampleCount: number;
    /** 最小 RSS */
    minRss: number;
    /** 最大 RSS（峰值） */
    maxRss: number;
    /** 平均 RSS */
    avgRss: number;
    /** 最小堆使用 */
    minHeapUsed: number;
    /** 最大堆使用 */
    maxHeapUsed: number;
    /** 平均堆使用 */
    avgHeapUsed: number;
    /** 内存增长率（峰值 - 初始）/ 初始 * 100% */
    growthRate: number;
    /** 首次采样时间 */
    firstSample: number;
    /** 最后采样时间 */
    lastSample: number;
}

/**
 * 内存监控器单例
 */
export class MemoryMonitor {
    private static instance: MemoryMonitor;

    /** 内存快照环形缓冲区 */
    private samples: MemorySnapshot[] = [];
    /** 最大保留采样数 */
    private readonly MAX_SAMPLES = 1000;
    /** 是否启用监控 */
    private enabled = true;

    private constructor() {}

    /**
     * 获取单例
     */
    public static getInstance(): MemoryMonitor {
        if (!MemoryMonitor.instance) {
            MemoryMonitor.instance = new MemoryMonitor();
        }
        return MemoryMonitor.instance;
    }

    /**
     * 启用/禁用监控
     */
    public setEnabled(value: boolean): void {
        this.enabled = value;
    }

    /**
     * 采样当前内存使用
     * @param label 可选标签
     */
    public sample(label?: string): MemorySnapshot {
        if (!this.enabled) {
            return {
                timestamp: Date.now(),
                label,
                rss: 0,
                heapTotal: 0,
                heapUsed: 0,
                external: 0,
                arrayBuffers: 0,
            };
        }

        const usage = process.memoryUsage();
        const snapshot: MemorySnapshot = {
            timestamp: Date.now(),
            label,
            rss: usage.rss,
            heapTotal: usage.heapTotal,
            heapUsed: usage.heapUsed,
            external: usage.external,
            arrayBuffers: usage.arrayBuffers,
        };

        // 添加到环形缓冲区
        this.samples.push(snapshot);
        if (this.samples.length > this.MAX_SAMPLES) {
            this.samples.shift();
        }

        return snapshot;
    }

    /**
     * 获取内存统计聚合
     */
    public getStats(): MemoryStats | null {
        if (this.samples.length === 0) {
            return null;
        }

        const sampleCount = this.samples.length;
        const rssValues = this.samples.map(s => s.rss);
        const heapUsedValues = this.samples.map(s => s.heapUsed);

        const minRss = Math.min(...rssValues);
        const maxRss = Math.max(...rssValues);
        const avgRss = rssValues.reduce((a, b) => a + b, 0) / sampleCount;

        const minHeapUsed = Math.min(...heapUsedValues);
        const maxHeapUsed = Math.max(...heapUsedValues);
        const avgHeapUsed = heapUsedValues.reduce((a, b) => a + b, 0) / sampleCount;

        const growthRate = ((maxRss - minRss) / minRss) * 100;

        return {
            sampleCount,
            minRss,
            maxRss,
            avgRss,
            minHeapUsed,
            maxHeapUsed,
            avgHeapUsed,
            growthRate,
            firstSample: this.samples[0].timestamp,
            lastSample: this.samples[sampleCount - 1].timestamp,
        };
    }

    /**
     * 获取峰值 RSS（MB）
     */
    public getPeakRssMB(): number {
        const stats = this.getStats();
        return stats ? stats.maxRss / 1024 / 1024 : 0;
    }

    /**
     * 获取平均 RSS（MB）
     */
    public getAvgRssMB(): number {
        const stats = this.getStats();
        return stats ? stats.avgRss / 1024 / 1024 : 0;
    }

    /**
     * 获取内存增长率（%）
     */
    public getGrowthRate(): number {
        const stats = this.getStats();
        return stats ? stats.growthRate : 0;
    }

    /**
     * 导出日志
     * @param prefix 日志前缀
     */
    public exportToLog(prefix: string = "MemoryMonitor"): void {
        const stats = this.getStats();
        if (!stats) {
            logger.warn(`[${prefix}] 没有内存采样数据`);
            return;
        }

        logger.info(
            `[${prefix}] 内存统计: ` +
            `采样=${stats.sampleCount}, ` +
            `峰值=${stats.maxRss.toFixed(0)}B (${(stats.maxRss / 1024 / 1024).toFixed(2)}MB), ` +
            `平均=${stats.avgRss.toFixed(0)}B (${(stats.avgRss / 1024 / 1024).toFixed(2)}MB), ` +
            `增长=${stats.growthRate.toFixed(2)}%`
        );

        logger.debug(
            `[${prefix}] 堆使用: ` +
            `峰值=${(stats.maxHeapUsed / 1024 / 1024).toFixed(2)}MB, ` +
            `平均=${(stats.avgHeapUsed / 1024 / 1024).toFixed(2)}MB`
        );
    }

    /**
     * 清除所有采样
     */
    public clear(): void {
        this.samples = [];
    }

    /**
     * 获取最近 N 个采样
     */
    public getRecentSamples(count: number): MemorySnapshot[] {
        return this.samples.slice(-count);
    }
}

/**
 * 格式化字节为 MB
 */
export function formatMB(bytes: number): string {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * 单例导出
 */
export const memoryMonitor = MemoryMonitor.getInstance();
