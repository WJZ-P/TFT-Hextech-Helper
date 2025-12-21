/**
 * 策略服务
 * @module StrategyService
 * @description 负责游戏内的决策逻辑，如选牌、站位、装备合成等 "大脑" 工作
 */
import { tftOperator, BenchUnit } from "../TftOperator";
import { logger } from "../utils/Logger";
import { TFTUnit, GameStageType } from "../TFTProtocol";
import { settingsStore } from "../utils/SettingsStore";
import { lineupLoader } from "../lineup";
import { LineupConfig, StageConfig, ChampionConfig } from "../lineup/LineupTypes";

/**
 * 阵容选择状态枚举
 * @description 用于追踪当前阵容的锁定状态
 */
enum LineupSelectionState {
    /** 未初始化：尚未读取用户选择的阵容 */
    NOT_INITIALIZED = "NOT_INITIALIZED",
    /** 已锁定：只有一个阵容，或已通过匹配算法确定阵容 */
    LOCKED = "LOCKED",
    /** 待定中：有多个候选阵容，等待第一个 PVP 阶段进行匹配 */
    PENDING = "PENDING",
}

/**
 * 阵容匹配结果
 */
interface LineupMatchResult {
    /** 阵容配置 */
    lineup: LineupConfig;
    /** 匹配分数（匹配到的棋子数量） */
    score: number;
    /** 匹配到的棋子名称列表 */
    matchedChampions: string[];
}

/**
 * 策略服务类 (单例)
 * @description 负责根据选中的阵容配置，执行自动下棋的决策逻辑
 * 
 * 阵容选择流程：
 * 1. 游戏开始后，读取用户选择的阵容列表
 * 2. 如果只有 1 个阵容 → 直接锁定
 * 3. 如果有多个阵容 → 进入 PENDING 状态，等待第一个 PVP 阶段
 * 4. 第一个 PVP 阶段时，根据备战席 + 商店的棋子，匹配最合适的阵容并锁定
 */
export class StrategyService {
    private static instance: StrategyService;

    /** 当前选中的阵容配置（运行时缓存，锁定后才有值） */
    private currentLineup: LineupConfig | null = null;
    
    /** 候选阵容列表（多阵容时使用，锁定后清空） */
    private candidateLineups: LineupConfig[] = [];
    
    /** 阵容选择状态 */
    private selectionState: LineupSelectionState = LineupSelectionState.NOT_INITIALIZED;
    
    /** 当前人口等级，默认是从一级开始 */
    private currentLevel: number = 1;
    
    /** 当前阶段的目标棋子名称列表（缓存，避免重复计算） */
    private targetChampionNames: Set<string> = new Set();
    
    /** 是否已经经历过第一个 PVP 阶段（用于触发阵容匹配） */
    private hasFirstPvpOccurred: boolean = false;

    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): StrategyService {
        if (!StrategyService.instance) {
            StrategyService.instance = new StrategyService();
        }
        return StrategyService.instance;
    }

    /**
     * 初始化策略服务
     * @description 加载用户选中的阵容配置，准备执行策略
     *              - 单阵容：直接锁定
     *              - 多阵容：进入 PENDING 状态，等待匹配
     * @returns 是否初始化成功
     */
    public initialize(): boolean {
        // 防止重复初始化
        if (this.selectionState !== LineupSelectionState.NOT_INITIALIZED) {
            logger.debug("[StrategyService] 已初始化，跳过");
            return true;
        }

        // 1. 获取用户选中的阵容 ID 列表
        const selectedIds = settingsStore.get('selectedLineupIds');
        
        if (!selectedIds || selectedIds.length === 0) {
            logger.warn("[StrategyService] 未选择任何阵容，请先在阵容页面选择要使用的阵容");
            return false;
        }
        
        // 2. 加载所有选中的阵容配置
        const lineups: LineupConfig[] = [];
        for (const lineupId of selectedIds) {
            const lineup = lineupLoader.getLineup(lineupId);
            if (lineup) {
                lineups.push(lineup);
            } else {
                logger.warn(`[StrategyService] 找不到阵容配置: ${lineupId}，已跳过`);
            }
        }
        
        if (lineups.length === 0) {
            logger.error("[StrategyService] 所有选中的阵容都无法加载");
            return false;
        }
        
        // 3. 根据阵容数量决定状态
        if (lineups.length === 1) {
            // 单阵容：直接锁定
            this.currentLineup = lineups[0];
            this.selectionState = LineupSelectionState.LOCKED;
            logger.info(`[StrategyService] 单阵容模式，已锁定: ${this.currentLineup.name}`);
            
            // 初始化目标棋子列表
            this.updateTargetChampions(4);
        } else {
            // 多阵容：进入待定状态
            this.candidateLineups = lineups;
            this.selectionState = LineupSelectionState.PENDING;
            logger.info(
                `[StrategyService] 多阵容模式，候选阵容: ${lineups.map(l => l.name).join(', ')}，` +
                `等待第一个 PVP 阶段进行匹配...`
            );
        }
        
        return true;
    }

    /**
     * 获取当前选中的阵容
     */
    public getCurrentLineup(): LineupConfig | null {
        return this.currentLineup;
    }
    
    /**
     * 获取阵容选择状态
     */
    public getSelectionState(): LineupSelectionState {
        return this.selectionState;
    }
    
    /**
     * 检查阵容是否已锁定
     */
    public isLineupLocked(): boolean {
        return this.selectionState === LineupSelectionState.LOCKED;
    }

    /**
     * 获取当前人口等级
     */
    public getCurrentLevel(): number {
        return this.currentLevel;
    }

    /**
     * 更新目标棋子列表
     * @param level 当前人口等级
     * @description 根据人口等级获取对应阶段的目标棋子
     */
    private updateTargetChampions(level: number): void {
        if (!this.currentLineup) {
            this.targetChampionNames.clear();
            return;
        }
        
        this.currentLevel = level;
        
        // 获取对应等级的阶段配置
        const stageConfig = this.getStageConfigForLevel(level);
        
        if (!stageConfig) {
            logger.warn(`[StrategyService] 阵容 ${this.currentLineup.name} 没有 level${level} 及以下的配置`);
            this.targetChampionNames.clear();
            return;
        }
        
        // 更新目标棋子名称集合
        this.targetChampionNames.clear();
        for (const champion of stageConfig.champions) {
            this.targetChampionNames.add(champion.name);
        }
        
        logger.info(
            `[StrategyService] 人口 ${level} 目标棋子: ${Array.from(this.targetChampionNames).join(', ')}`
        );
    }

    /**
     * 获取指定等级的阶段配置（支持双向查找）
     * @param level 目标人口等级
     * @returns 阶段配置，如果找不到返回 undefined
     * 
     * @description 查找逻辑：
     * 1. 先尝试精确匹配当前等级
     * 2. 如果没有，向下查找（比如 7 级找不到就找 6 级）
     * 3. 如果向下也找不到，向上查找（比如 3 级找不到就找 4 级）
     * 
     * 这样可以处理游戏初期（1-3 级）没有配置的情况，自动使用 level4 配置
     */
    private getStageConfigForLevel(level: number): StageConfig | undefined {
        if (!this.currentLineup) return undefined;
        
        // 人口等级范围：4-10（配置文件中定义的等级）
        const validLevels = [4, 5, 6, 7, 8, 9, 10] as const;
        
        // 1. 先尝试精确匹配
        const exactKey = `level${level}` as keyof typeof this.currentLineup.stages;
        if (this.currentLineup.stages[exactKey]) {
            return this.currentLineup.stages[exactKey];
        }
        
        // 2. 向下查找（从当前等级往下找最近的配置）
        for (let checkLevel = level - 1; checkLevel >= 4; checkLevel--) {
            const stageKey = `level${checkLevel}` as keyof typeof this.currentLineup.stages;
            const config = this.currentLineup.stages[stageKey];
            if (config) {
                return config;
            }
        }
        
        // 3. 向上查找（适用于 1-3 级的情况，找 level4 或更高）
        for (const checkLevel of validLevels) {
            if (checkLevel <= level) continue; // 跳过已经检查过的等级
            
            const stageKey = `level${checkLevel}` as keyof typeof this.currentLineup.stages;
            const config = this.currentLineup.stages[stageKey];
            if (config) {
                logger.debug(`[StrategyService] 等级 ${level} 无配置，向上取用 level${checkLevel} 配置`);
                return config;
            }
        }
        
        return undefined;
    }

    /**
     * 执行当前阶段的策略逻辑
     * @param stage 当前游戏阶段
     */
    public async executeStrategy(stage: GameStageType) {
        // 确保已初始化
        if (this.selectionState === LineupSelectionState.NOT_INITIALIZED) {
            const success = this.initialize();
            if (!success) {
                logger.error("[StrategyService] 策略服务未初始化，跳过执行");
                return;
            }
        }
        
        // 如果是 PVP 阶段且阵容尚未锁定，尝试进行阵容匹配
        if (stage === GameStageType.PVP && this.selectionState === LineupSelectionState.PENDING) {
            if (!this.hasFirstPvpOccurred) {
                logger.info("[StrategyService] 检测到第一个 PVP 阶段，开始阵容匹配...");
                await this.matchAndLockLineup();
                this.hasFirstPvpOccurred = true;
            }
        }
        
        // 如果阵容仍未锁定，跳过策略执行（等待匹配完成）
        if (!this.isLineupLocked()) {
            logger.debug("[StrategyService] 阵容尚未锁定，跳过策略执行");
            return;
        }
        
        // 更新当前人口等级
        await this.refreshCurrentLevel();
        
        switch (stage) {
            case GameStageType.PVE:
                await this.handlePve();
                break;
            case GameStageType.PVP:
                await this.handlePvp();
                break;
            case GameStageType.CAROUSEL:
                await this.handleCarousel();
                break;
            case GameStageType.AUGMENT:
                await this.handleAugment();
                break;
            case GameStageType.UNKNOWN:
            default:
                logger.debug(`[StrategyService] 未处理的阶段: ${stage}`);
                break;
        }
    }

    /**
     * 根据当前棋子匹配并锁定最合适的阵容
     * @description 获取备战席和商店的棋子，计算与各候选阵容 level4 的匹配度，
     *              选择匹配度最高的阵容并锁定
     */
    private async matchAndLockLineup(): Promise<void> {
        if (this.candidateLineups.length === 0) {
            logger.error("[StrategyService] 没有候选阵容可供匹配");
            return;
        }
        
        // 1. 获取当前拥有的棋子（备战席 + 商店）
        const currentChampions = await this.getCurrentChampionNames();
        
        if (currentChampions.size === 0) {
            logger.warn("[StrategyService] 未检测到任何棋子，使用第一个候选阵容");
            this.lockLineup(this.candidateLineups[0]);
            return;
        }
        
        logger.info(`[StrategyService] 当前棋子: ${Array.from(currentChampions).join(', ')}`);
        
        // 2. 计算每个候选阵容的匹配分数
        const matchResults: LineupMatchResult[] = [];
        
        for (const lineup of this.candidateLineups) {
            const result = this.calculateLineupMatchScore(lineup, currentChampions);
            matchResults.push(result);
            
            logger.info(
                `[StrategyService] 阵容 "${lineup.name}" 匹配分数: ${result.score}，` +
                `匹配棋子: ${result.matchedChampions.join(', ') || '无'}`
            );
        }
        
        // 3. 选择匹配分数最高的阵容
        // 如果有多个阵容分数相同，随机选择一个
        matchResults.sort((a, b) => b.score - a.score);
        const highestScore = matchResults[0].score;
        
        // 筛选出所有最高分的阵容
        const topMatches = matchResults.filter(r => r.score === highestScore);
        
        // 如果有多个最高分，随机选择一个
        let bestMatch: LineupMatchResult;
        if (topMatches.length > 1) {
            const randomIndex = Math.floor(Math.random() * topMatches.length);
            bestMatch = topMatches[randomIndex];
            logger.info(
                `[StrategyService] 有 ${topMatches.length} 个阵容分数相同 (${highestScore})，` +
                `随机选择: "${bestMatch.lineup.name}"`
            );
        } else {
            bestMatch = topMatches[0];
        }
        
        // 4. 锁定阵容
        this.lockLineup(bestMatch.lineup);
        
        logger.info(
            `[StrategyService] 阵容匹配完成！选择: "${bestMatch.lineup.name}"，` +
            `匹配分数: ${bestMatch.score}，匹配棋子: ${bestMatch.matchedChampions.join(', ')}`
        );
    }
    
    /**
     * 获取当前拥有的棋子名称集合
     * @description 合并备战席和商店中的棋子
     * @returns 棋子名称集合
     */
    private async getCurrentChampionNames(): Promise<Set<string>> {
        const championNames = new Set<string>();
        
        try {
            // 1. 获取备战席棋子
            const benchUnits = await tftOperator.getBenchInfo();
            for (const unit of benchUnits) {
                if (unit && unit.tftUnit) {
                    championNames.add(unit.tftUnit.displayName);
                }
            }
            
            // 2. 获取商店棋子
            const shopUnits = await tftOperator.getShopInfo();
            for (const unit of shopUnits) {
                if (unit) {
                    championNames.add(unit.displayName);
                }
            }
        } catch (error) {
            logger.error(`[StrategyService] 获取棋子信息失败: ${error}`);
        }
        
        return championNames;
    }
    
    /**
     * 计算阵容与当前棋子的匹配分数
     * @param lineup 阵容配置
     * @param currentChampions 当前拥有的棋子名称集合
     * @returns 匹配结果
     */
    private calculateLineupMatchScore(
        lineup: LineupConfig,
        currentChampions: Set<string>
    ): LineupMatchResult {
        // 获取阵容的 level4 配置（早期阵容）
        const level4Config = lineup.stages.level4;
        
        if (!level4Config) {
            logger.warn(`[StrategyService] 阵容 "${lineup.name}" 没有 level4 配置`);
            return { lineup, score: 0, matchedChampions: [] };
        }
        
        // 计算匹配的棋子
        const matchedChampions: string[] = [];
        
        for (const champion of level4Config.champions) {
            if (currentChampions.has(champion.name)) {
                matchedChampions.push(champion.name);
            }
        }
        
        // 匹配分数 = 匹配到的棋子数量
        // TODO: 可以加入权重，比如核心棋子权重更高
        const score = matchedChampions.length;
        
        return { lineup, score, matchedChampions };
    }
    
    /**
     * 锁定指定阵容
     * @param lineup 要锁定的阵容配置
     */
    private lockLineup(lineup: LineupConfig): void {
        this.currentLineup = lineup;
        this.selectionState = LineupSelectionState.LOCKED;
        this.candidateLineups = []; // 清空候选列表
        
        // 初始化目标棋子列表
        this.updateTargetChampions(this.currentLevel);
        
        logger.info(`[StrategyService] 阵容已锁定: ${lineup.name} (${lineup.id})`);
    }

    /**
     * 刷新当前人口等级
     * @description 通过 OCR 识别当前人口，并更新目标棋子列表
     */
    private async refreshCurrentLevel(): Promise<void> {
        const levelInfo = await tftOperator.getLevelInfo();
        
        if (levelInfo && levelInfo.level !== this.currentLevel) {
            logger.info(`[StrategyService] 人口变化: ${this.currentLevel} -> ${levelInfo.level}`);
            this.updateTargetChampions(levelInfo.level);
        }
    }

    /**
     * 处理 PVE 阶段 (打野怪)
     */
    private async handlePve() {
        logger.info("[StrategyService] PVE阶段：除了捡球，我们也要盯着商店...");
        // 野怪回合也可能刷出关键牌
        await this.analyzeAndBuy();
        
        // TODO: 添加捡战利品球的逻辑
        // await this.pickUpOrbs();
    }

    /**
     * 处理 PVP 阶段 (玩家对战)
     */
    private async handlePvp() {
        logger.info("[StrategyService] PVP阶段：全力运营...");
        // 核心：拿牌
        await this.analyzeAndBuy();

        // TODO: 添加升级(F)、D牌(D)、调整站位逻辑
        // await this.levelUpOrRoll();
        // await this.adjustPosition();
    }

    /**
     * 处理 选秀阶段
     */
    private async handleCarousel() {
        logger.info("[StrategyService] 选秀阶段：寻找最优装备/英雄...");
        // TODO: 识别场上单位，控制鼠标移动抢夺
    }

    /**
     * 处理 海克斯选择阶段
     */
    private async handleAugment() {
        logger.info("[StrategyService] 海克斯阶段：分析最优强化...");
        // TODO: 识别三个海克斯，选择胜率最高的
    }

    /**
     * 分析商店并执行购买
     * @description 获取当前商店棋子信息，对比目标阵容，自动购买需要的棋子
     */
    private async analyzeAndBuy() {
        // 1. 获取商店信息
        const shopUnits = await tftOperator.getShopInfo();

        // 2. 遍历商店里的 5 个位置
        for (let i = 0; i < shopUnits.length; i++) {
            const unit = shopUnits[i];

            // 如果是空槽位 (null) 或者识别失败，直接跳过
            if (!unit) continue;

            // 3. 决策逻辑：是我想玩的英雄吗？
            if (this.shouldIBuy(unit)) {
                logger.info(`[StrategyService] 发现目标棋子: ${unit.displayName} (￥${unit.price})，正在购买...`);
                
                // 4. 执行购买
                await tftOperator.buyAtSlot(i + 1);
            } else {
                logger.debug(`[StrategyService] 路人棋子: ${unit.displayName}，跳过`);
            }
        }
    }

    /**
     * 判断某个棋子是否应该购买
     * @param unit 商店里的棋子信息
     * @returns true 表示建议购买，false 表示不买
     */
    private shouldIBuy(unit: TFTUnit): boolean {
        // 基础逻辑：只要在我们的目标阵容名单里，就买！
        return this.targetChampionNames.has(unit.displayName);

        // --- 进阶逻辑思路 (留给未来的作业) ---
        // 1. 检查金币：如果买了会卡利息 (比如剩 51 块，买个 2 块的变 49)，是否值得？
        // 2. 检查星级：如果场上 + 备战席已经有 9 张了 (能合 3 星)，是否还需要买？
        // 3. 检查备战席空间：如果备战席满了，买了也没地放，是不是要先卖别的？
        // 4. 优先级：核心棋子优先购买
    }

    /**
     * 获取当前阶段的目标棋子配置列表
     * @returns 棋子配置数组
     */
    public getTargetChampions(): ChampionConfig[] {
        if (!this.currentLineup) return [];
        
        const stageConfig = this.getStageConfigForLevel(this.currentLevel);
        return stageConfig?.champions ?? [];
    }

    /**
     * 获取当前阶段的核心棋子配置列表
     * @returns 核心棋子配置数组
     */
    public getCoreChampions(): ChampionConfig[] {
        return this.getTargetChampions().filter(c => c.isCore);
    }

    /**
     * 重置策略服务状态
     * @description 在游戏结束或停止时调用，清理状态
     */
    public reset(): void {
        this.currentLineup = null;
        this.candidateLineups = [];
        this.selectionState = LineupSelectionState.NOT_INITIALIZED;
        this.currentLevel = 1; // 重置为 1 级（游戏开始时的初始等级）
        this.targetChampionNames.clear();
        this.hasFirstPvpOccurred = false;
        logger.info("[StrategyService] 策略服务已重置");
    }
}

// 导出单例实例，方便其他文件直接使用
export const strategyService = StrategyService.getInstance();
