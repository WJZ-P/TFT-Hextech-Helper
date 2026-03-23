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

    /** 最大批量上报大小 */
    private readonly MAX_BATCH_SIZE = 50;

    /** 设备 ID 哈希（启动时生成） */
    private deviceIdHash: string = "";

    private constructor() {
        // 生成匿名设备 ID
        this.deviceIdHash = this.generateDeviceHash();
    }

    public static getInstance(): DataCollectorService {
        if (!DataCollectorService.instance) {
            DataCollectorService.instance = new DataCollectorService();
        }
        return DataCollectorService.instance;
    }

    /**
     * 初始化收集器
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
     * 更新配置
     */
    public updateConfig(config: Partial<CollectionConfig>): void {
        this.config = { ...this.config, ...config };
        
        if (!this.config.enabled) {
            this.queue = []; // 禁用时清空队列
        }
        
        logger.info(`[DataCollector] 配置已更新: enabled=${this.config.enabled}, mode=${this.config.mode}`);
    }

    /**
     * 获取当前配置
     */
    public getConfig(): CollectionConfig {
        return { ...this.config };
    }

    /**
     * 记录一条决策数据
     * @param decision 原始决策数据
     * @returns 是否成功记录
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
     * 手动触发上报
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
            const payload: BatchPayload = {
                deviceIdHash: this.deviceIdHash,
                count: this.queue.length,
                decisions: [...this.queue],
                appVersion: "1.5.0", // 从 package.json 动态获取
                tzOffset: new Date().getTimezoneOffset(),
            };

            // TODO: 实际上报逻辑
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
     * 获取当前队列大小
     */
    public getQueueSize(): number {
        return this.queue.length;
    }

    /**
     * 清空队列
     */
    public clearQueue(): void {
        this.queue = [];
    }

    // ===================== 私有方法 =====================

    /**
     * 生成匿名设备 ID 哈希
     */
    private generateDeviceHash(): string {
        const seed = `${Date.now()}-${Math.random()}-${navigator.userAgent}`;
        return this.hashString(seed).substring(0, 16);
    }

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
