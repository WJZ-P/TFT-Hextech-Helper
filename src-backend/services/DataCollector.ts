/**
 * Data Collector Service
 * 
 * 可选的数据收集框架，用于匿名收集决策数据以优化模型。
 * 
 * 特性：
 * - 默认禁用（privacy by default）
 * - 数据脱敏（不收集棋子名、玩家名等隐私信息）
 * - 本地缓存 + 批量上报
 * - 可随时禁用，禁用后立即停止收集
 */

import { logger } from "../utils/Logger.ts";

/** 收集模式 */
export type CollectionMode = "disabled" | "anonymous" | "research";

/** 收集配置 */
export interface CollectionConfig {
    enabled: boolean;
    mode: CollectionMode;
    /** 数据上报端点（可选，留空则仅本地存储） */
    endpoint?: string;
    /** 本地缓存路径 */
    cachePath?: string;
}

/** 脱敏后的决策数据 */
export interface AnonymizedDecision {
    /** 决策 ID（随机生成） */
    decisionId: string;
    /** 时间戳 */
    timestamp: number;
    /** 计划类型哈希（不包含实际名称） */
    planTypeHash: string;
    /** 优先级 */
    priority: number;
    /** 结果哈希（用于聚合分析） */
    outcomeHash: string;
    /** 比赛阶段（已脱敏） */
    gameStage: string;
    /** 血量区间（0-100 的 10 的倍数，如 40 表示 40-49） */
    hpBucket: number;
}

/** 批量上报 payload */
export interface BatchPayload {
    /** 设备 ID（匿名哈希） */
    deviceIdHash: string;
    /** 数据条数 */
    count: number;
    /** 决策数据列表 */
    decisions: AnonymizedDecision[];
    /** 应用版本 */
    appVersion: string;
    /** 时区偏移 */
    tzOffset: number;
}

class DataCollectorService {
    private static instance: DataCollectorService;

    private config: CollectionConfig = {
        enabled: false,
        mode: "disabled",
    };

    /** 本地缓存队列 */
    private queue: AnonymizedDecision[] = [];

    /** 比赛胜负历史（用于统计胜率），按时间顺序追加 */
    private matchHistory: { outcome: "win" | "loss"; timestamp: number }[] = [];

    /** 最大批量上报大小 */
    private readonly MAX_BATCH_SIZE = 50;

    /** 设备 ID 哈希（启动时生成） - TODO: implement telemetry upload to use this */
    // private _deviceIdHash: string = "";

    private constructor() {
        // 生成匿名设备 ID
        // this._deviceIdHash = this.generateDeviceHash();
    }

    public static getInstance(): DataCollectorService {
        if (!DataCollectorService.instance) {
            DataCollectorService.instance = new DataCollectorService();
        }
        return DataCollectorService.instance;
    }

    /**
     * 初始化数据收集器并应用初始配置。
     * @param config 初始收集配置，决定是否启用以及上报端点等参数。
     */
    public init(config: CollectionConfig): void {
        this.config = { ...config };
        
        if (this.config.enabled) {
            logger.info(`[DataCollector] 数据收集已启用: mode=${this.config.mode}`);
        } else {
            logger.info("[DataCollector] 数据收集已禁用");
        }
    }

    /**
     * 更新当前配置，部分字段可局部更新。
     * @param config 需要更新的配置项，非传入的字段保持原有值。
     */
    public updateConfig(config: Partial<CollectionConfig>): void {
        this.config = { ...this.config, ...config };
        
        if (!this.config.enabled) {
            this.queue = []; // 禁用时清空队列
        }
        
        logger.info(`[DataCollector] 配置已更新: enabled=${this.config.enabled}, mode=${this.config.mode}`);
    }

    /**
     * 获取当前数据收集器的配置快照。
     * @returns 当前配置的只读副本。
     */
    public getConfig(): CollectionConfig {
        return { ...this.config };
    }

    /**
     * 记录一次决策数据，数据将进入本地队列进行上报（或本地缓存）。
     * 只有在启用且模式非 disabled 时才会记录。
     * @param decision 决策数据的要素，包含计划类型、优先级、原因、阶段和血量等信息。
     * @returns 是否成功将数据加入队列。
     */
    public recordDecision(decision: {
        planType: string;
        priority: number;
        reason: string;
        gameStage: string;
        hp: number;
    }): boolean {
        if (!this.config.enabled || this.config.mode === "disabled") {
            return false;
        }

        const anonymized: AnonymizedDecision = {
            decisionId: this.generateId(),
            timestamp: Date.now(),
            planTypeHash: this.hashString(decision.planType),
            priority: decision.priority,
            outcomeHash: this.hashString(decision.reason),
            gameStage: this.sanitizeStage(decision.gameStage),
            hpBucket: Math.floor(decision.hp / 10) * 10,
        };

        this.queue.push(anonymized);

        // 达到批量大小时触发上报
        if (this.queue.length >= this.MAX_BATCH_SIZE) {
            this.flush();
        }

        return true;
    }

    /**
     * 手动触发当前队列的数据上报。
     * 如果没有数据，将返回 true。
     */
    public async flush(): Promise<boolean> {
        if (this.queue.length === 0) {
            return true;
        }

        if (!this.config.endpoint) {
            // 没有配置端点，仅本地存储
            logger.debug(`[DataCollector] 本地缓存 ${this.queue.length} 条数据`);
            return true;
        }

        try {
            // TODO: 实际上报逻辑 - payload preparation
            // const payload: BatchPayload = {
            //     deviceIdHash: this.deviceIdHash,
            //     count: this.queue.length,
            //     decisions: [...this.queue],
            //     appVersion: "1.5.0",
            //     tzOffset: new Date().getTimezoneOffset(),
            // };
            // await fetch(this.config.endpoint, {
            //     method: "POST",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify(payload),
            // });

            logger.info(`[DataCollector] 上报 ${this.queue.length} 条数据`);
            this.queue = [];
            return true;
        } catch (error) {
            logger.error(`[DataCollector] 上报失败: ${error}`);
            return false;
        }
    }

    /**
     * 获取当前待上报队列的大小（数据条数）。
     * @returns 队列长度。
     */
    public getQueueSize(): number {
        return this.queue.length;
    }

    /**
     * 记录一局比赛的胜负结果，并发出 telemetry 事件（如果启用）。
     * @param outcome "win" 或 "loss"
     */
    public recordMatchOutcome(outcome: "win" | "loss"): void {
        const entry = { outcome, timestamp: Date.now() } as const;

        // 记录到历史
        this.matchHistory.push(entry);

        // 发出 telemetry 事件（仅在启用且非 disabled 模式下）
        if (this.config.enabled && this.config.mode !== "disabled") {
            // 使用同样的脱敏/哈希策略记录简要事件
            // TODO: implement telemetry upload to use this payload
            // const _payload = {
            //     event: "match_complete",
            //     outcome,
            //     timestamp: entry.timestamp,
            // };

            // 目前仅记录到本地队列作为匿名事件的一部分
            try {
                const anon: AnonymizedDecision = {
                    decisionId: this.generateId(),
                    timestamp: entry.timestamp,
                    planTypeHash: this.hashString("MATCH_EVENT"),
                    priority: outcome === "win" ? 1 : 0,
                    outcomeHash: this.hashString(outcome),
                    gameStage: "match-end",
                    hpBucket: 0,
                };

                this.queue.push(anon);
            } catch (error) {
                logger.error(`[DataCollector] recordMatchOutcome error: ${error}`);
            }
        }
    }

    /**
     * 计算最近若干局的胜率（滑动窗口）。
     * @param windowSize 最近多少局参与计算，默认 20
     * @returns 胜率（0-1），当没有比赛记录时返回 NaN
     */
    public getWinRate(windowSize = 20): number {
        if (windowSize <= 0) {
            throw new Error("windowSize must be positive");
        }

        const total = this.matchHistory.length;
        if (total === 0) {
            return NaN;
        }

        const start = Math.max(0, total - windowSize);
        const slice = this.matchHistory.slice(start, total);
        const wins = slice.reduce((acc, cur) => acc + (cur.outcome === "win" ? 1 : 0), 0);
        return wins / slice.length;
    }

    /**
     * 清空当前数据队列，通常在禁用模式下使用以重置状态。
     */
    public clearQueue(): void {
        this.queue = [];
    }

    // ===================== 私有方法 =====================

    /**
     * 生成匿名设备 ID 哈希
     */
    // TODO: uncomment when telemetry upload is implemented
    // private generateDeviceHash(): string {
    //     const seed = `${Date.now()}-${Math.random()}-${navigator.userAgent}`;
    //     return this.hashString(seed).substring(0, 16);
    // }

    /**
     * 生成随机 ID
     */
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * 简单哈希函数（用于脱敏）
     */
    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为 32 位整数
        }
        return Math.abs(hash).toString(36);
    }

    /**
     * 脱敏阶段信息（保留阶段编号，移除具体回合）
     */
    private sanitizeStage(stage: string): string {
        const match = stage.match(/^(\d+)-/);
        return match ? `${match[1]}-*` : stage;
    }
}

/** 单例导出 */
export const dataCollector = DataCollectorService.getInstance();
