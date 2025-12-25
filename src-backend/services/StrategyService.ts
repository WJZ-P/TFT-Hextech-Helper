/**
 * 策略服务
 * @module StrategyService
 * @description 负责游戏内的决策逻辑，如选牌、站位、装备合成等 "大脑" 工作
 *              同时负责协调数据采集：调用 TftOperator 获取数据，更新到 GameStateManager
 * 
 * 架构说明：
 * - StrategyService 是 GameStageMonitor 的订阅者
 * - 当 GameStageMonitor 检测到阶段变化时，会发出事件
 * - StrategyService 监听事件并执行相应的策略逻辑
 * 
 * 职责分离：
 * - TftOperator：纯粹的"眼睛和手"，负责识别和操作
 * - GameStateManager：纯粹的"记忆"，负责存储状态
 * - GameStageMonitor：纯粹的"感知器"，负责检测阶段变化并发出事件
 * - StrategyService：纯粹的"大脑"，负责决策和协调（作为订阅者）
 */
import { tftOperator } from "../TftOperator";
import { logger } from "../utils/Logger";
import { TFTUnit, GameStageType } from "../TFTProtocol";
import { gameStateManager } from "./GameStateManager";
import { gameStageMonitor, GameStageEvent } from "./GameStageMonitor";
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
 *              作为 GameStageMonitor 的订阅者，监听阶段变化事件并执行策略
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
    
    /** 当前阶段的目标棋子名称列表（缓存，避免重复计算） */
    private targetChampionNames: Set<string> = new Set();
    
    /** 
     * 当前阶段号（如 "2-1" 中的 2）
     * @description 阶段变化意味着进入新的大阶段（如从 1 阶段进入 2 阶段）
     */
    private currentStage: number = 0;
    
    /**
     * 当前回合号（如 "2-1" 中的 1）
     * @description 回合变化意味着同一阶段内的小回合切换
     */
    private currentRound: number = 0;

    /** 是否已订阅 GameStageMonitor 事件 */
    private isSubscribed: boolean = false;

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

    // ============================================================
    // 🔔 事件订阅管理
    // ============================================================

    /**
     * 订阅 GameStageMonitor 事件
     * @description 开始监听阶段变化事件，执行相应策略
     *              调用此方法后，StrategyService 会自动响应游戏阶段变化
     */
    public subscribe(): void {
        if (this.isSubscribed) {
            logger.debug("[StrategyService] 已订阅事件，跳过重复订阅");
            return;
        }

        // 订阅阶段变化事件
        gameStageMonitor.on('stageChange', this.onStageChange.bind(this));
        
        // 订阅战斗阶段开始事件
        gameStageMonitor.on('fightingStart', this.onFightingStart.bind(this));

        this.isSubscribed = true;
        logger.info("[StrategyService] 已订阅 GameStageMonitor 事件");
    }

    /**
     * 取消订阅 GameStageMonitor 事件
     * @description 停止监听阶段变化事件
     */
    public unsubscribe(): void {
        if (!this.isSubscribed) {
            logger.debug("[StrategyService] 未订阅事件，跳过取消订阅");
            return;
        }

        gameStageMonitor.off('stageChange', this.onStageChange.bind(this));
        gameStageMonitor.off('fightingStart', this.onFightingStart.bind(this));

        this.isSubscribed = false;
        logger.info("[StrategyService] 已取消订阅 GameStageMonitor 事件");
    }

    // ============================================================
    // 🎯 事件处理器
    // ============================================================

    /**
     * 阶段变化事件处理器
     * @param event 阶段变化事件数据
     * @description 当 GameStageMonitor 检测到阶段/回合变化时触发
     *              这是整个策略服务的核心入口！
     */
    private async onStageChange(event: GameStageEvent): Promise<void> {
        const { type, stageText, stage, round, isNewStage } = event;

        // 更新当前阶段/回合
        this.currentStage = stage;
        this.currentRound = round;

        // 日志输出
        if (isNewStage) {
            logger.info(
                `[StrategyService] ====== 进入新阶段: ${stageText} (第${stage}阶段第${round}回合) ======`
            );
        } else {
            logger.info(
                `[StrategyService] 进入新回合: ${stageText} (第${stage}阶段第${round}回合)`
            );
        }

        // 确保已初始化
        if (this.selectionState === LineupSelectionState.NOT_INITIALIZED) {
            const success = this.initialize();
            if (!success) {
                logger.error("[StrategyService] 策略服务未初始化，跳过执行");
                return;
            }
        }

        // 刷新游戏状态（采集所有数据，包括等级、商店、棋盘等）
        await this.refreshGameState();

        // 根据阶段类型分发到对应的 handler
        switch (type) {
            case GameStageType.EARLY_PVE:
                await this.handleEarlyPVE();
                break;
            case GameStageType.PVE:
                await this.handlePVE();
                break;
            case GameStageType.PVP:
                await this.handlePVP();
                break;
            case GameStageType.CAROUSEL:
                await this.handleCarousel();
                break;
            case GameStageType.AUGMENT:
                await this.handleAugment();
                break;
            case GameStageType.UNKNOWN:
            default:
                logger.debug(`[StrategyService] 未处理的阶段: ${type}`);
                break;
        }
    }

    /**
     * 战斗开始事件处理器
     * @description 当检测到"战斗环节"文字时触发
     *              根据当前阶段类型分发到不同的战斗阶段处理器
     * 
     * 战斗阶段的操作：
     * - EARLY_PVE / PVE 阶段：打野怪，拾取战利品球
     * - PVP / AUGMENT 阶段：观战（海克斯选完后就是普通 PVP 战斗）
     * - CAROUSEL 阶段 (选秀)：不会触发战斗
     */
    private async onFightingStart(): Promise<void> {
        logger.info("[StrategyService] 战斗阶段开始");

        // 获取当前阶段类型（从 GameStageMonitor 获取最新的阶段信息）
        const currentStageType = gameStageMonitor.currentStageType;

        // 根据阶段类型分发到对应的战斗阶段处理器
        switch (currentStageType) {
            case GameStageType.EARLY_PVE:
            case GameStageType.PVE:
                // 所有 PVE 战斗阶段共用同一个处理器（打野怪、捡战利品）
                await this.handlePVEFighting();
                break;
            case GameStageType.PVP:
            case GameStageType.AUGMENT:
                // 海克斯阶段选完强化后就是普通 PVP 战斗，共用同一个处理器
                await this.handlePVPFighting();
                break;
            default:
                logger.debug(`[StrategyService] 战斗阶段：当前阶段类型 ${currentStageType} 无需特殊处理`);
                break;
        }
    }

    /**
     * 检查当前是否处于战斗阶段
     * @description 战斗阶段时，涉及棋盘的操作应暂停
     *              进入新回合时会自动重置为非战斗状态
     * @returns 是否处于战斗阶段
     */
    public isFighting(): boolean {
        return gameStageMonitor.isFighting;
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

    // ============================================================
    // 📊 状态查询方法
    // ============================================================

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
     * @description 从 GameStateManager 获取
     */
    public getCurrentLevel(): number {
        return gameStateManager.getLevel();
    }

    /**
     * 获取当前阶段文本
     * @returns 格式化的阶段文本（如 "2-1"）
     */
    public getCurrentStageText(): string {
        if (this.currentStage === 0) return "";
        return `${this.currentStage}-${this.currentRound}`;
    }

    /**
     * 获取当前阶段的目标棋子配置列表
     * @returns 棋子配置数组
     */
    public getTargetChampions(): ChampionConfig[] {
        if (!this.currentLineup) return [];
        
        const stageConfig = this.getStageConfigForLevel(gameStateManager.getLevel());
        return stageConfig?.champions ?? [];
    }

    /**
     * 获取当前阶段的核心棋子配置列表
     * @returns 核心棋子配置数组
     */
    public getCoreChampions(): ChampionConfig[] {
        return this.getTargetChampions().filter(c => c.isCore);
    }

    // ============================================================
    // 🔧 内部辅助方法
    // ============================================================

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
     * 根据当前棋子匹配并锁定最合适的阵容
     * @description 使用 GameStateManager 获取备战席、棋盘和商店的棋子，
     *              计算与各候选阵容 level4 的匹配度，选择匹配度最高的阵容并锁定
     * 
     * 匹配优先级：
     * 1. 匹配分数（匹配到的棋子数量）最高
     * 2. 分数相同时，随机选择
     */
    private async matchAndLockLineup(): Promise<void> {
        if (this.candidateLineups.length === 0) {
            logger.error("[StrategyService] 没有候选阵容可供匹配");
            return;
        }
        
        // 1. 刷新快照并获取所有可见棋子名称（备战席 + 棋盘 + 商店）
        await this.refreshGameState();
        const currentChampions = gameStateManager.getAllVisibleChampionNames();
        
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
        
        // 3. 按分数降序排序
        matchResults.sort((a, b) => b.score - a.score);
        
        const highestScore = matchResults[0].score;
        
        // 4. 筛选出所有最高分的阵容
        const topMatches = matchResults.filter(r => r.score === highestScore);
        
        // 5. 如果有多个最高分，随机选择
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
        
        // 6. 锁定阵容
        this.lockLineup(bestMatch.lineup);
        
        logger.info(
            `[StrategyService] 阵容匹配完成！选择: "${bestMatch.lineup.name}"，` +
            `匹配分数: ${bestMatch.score}，匹配棋子: ${bestMatch.matchedChampions.join(', ')}`
        );
    }
    
    /**
     * 计算阵容与当前棋子的匹配分数
     * @param lineup 阵容配置
     * @param currentChampions 当前拥有的棋子名称集合（备战席 + 棋盘 + 商店）
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
        
        // 初始化目标棋子列表（使用 GameStateManager 的等级）
        this.updateTargetChampions(gameStateManager.getLevel());
        
        logger.info(`[StrategyService] 阵容已锁定: ${lineup.name} (${lineup.id})`);
    }
    
    /**
     * 刷新游戏状态快照
     * @description 调用 TftOperator 采集所有游戏数据，更新到 GameStateManager
     *              这是 StrategyService 作为"大脑"协调数据采集的核心方法
     * 
     * 注意：getBenchInfo 和 getFightBoardInfo 需要操作鼠标（右键点击棋子），
     *       所以这两个必须串行执行，不能并行！
     */
    public async refreshGameState(): Promise<void> {
        logger.info("[StrategyService] 开始采集游戏状态...");
        
        // 记录采集前的等级，用于检测等级变化
        const previousLevel = gameStateManager.getLevel();
        
        // 1. 先并行执行不需要鼠标操作的识别任务
        //    - getShopInfo: 只需要截图 + OCR，不操作鼠标
        //    - getEquipInfo: 只需要截图 + 模板匹配，不操作鼠标
        //    - getLevelInfo: 只需要截图 + OCR，不操作鼠标
        //    - getCoinCount: 只需要截图 + OCR，不操作鼠标
        const [shopUnits, equipments, levelInfo, gold] = await Promise.all([
            tftOperator.getShopInfo(),
            tftOperator.getEquipInfo(),
            tftOperator.getLevelInfo(),
            tftOperator.getCoinCount(),
        ]);
        
        // 2. 串行执行需要鼠标操作的识别任务
        //    - getBenchInfo: 需要右键点击每个槽位
        //    - getFightBoardInfo: 需要右键点击每个槽位
        //    这两个不能并行，否则鼠标会乱跑！
        const benchUnits = await tftOperator.getBenchInfo();
        const boardUnits = await tftOperator.getFightBoardInfo();
        
        const newLevel = levelInfo?.level ?? previousLevel;
        
        // 3. 更新到 GameStateManager
        gameStateManager.updateSnapshot({
            benchUnits,
            boardUnits,
            shopUnits,
            equipments,
            level: newLevel,
            currentXp: levelInfo?.currentXp ?? 0,
            totalXp: levelInfo?.totalXp ?? 0,
            gold: gold ?? 0,
        });
        
        // 4. 如果等级变化，更新目标棋子列表
        if (newLevel !== previousLevel) {
            logger.info(`[StrategyService] 等级变化: ${previousLevel} → ${newLevel}`);
            this.updateTargetChampions(newLevel);
        }
        
        logger.info("[StrategyService] 游戏状态采集完成");
    }

    /**
     * 处理 PVE 阶段 (打野怪)
     * @description 
     * - 1-3、1-4 回合：商店已开启，执行购买策略
     * - 后续 PVE（野怪回合）：继续购买 + 捡战利品球
     * 
     * 注意：1-3、1-4 时阵容可能尚未锁定，此时执行随机购买策略
     */
    private async handlePVE(): Promise<void> {
        logger.info("[StrategyService] PVE阶段：商店运营中...");
        
        // 通用运营策略
        await this.executeCommonStrategy();
    }

    // ============================================================
    // ⚔️ 战斗阶段处理器 (Fighting Phase Handlers)
    // ============================================================

    /**
     * 处理 PVE 战斗阶段 (所有打野怪的回合)
     * @description 包括前期 PVE (1-1, 1-2) 和后期野怪回合：
     *              - 战斗中会持续掉落战利品球
     *              - 需要边打边捡（小小英雄可以移动拾取）
     *              - 同时执行防挂机操作
     */
    private async handlePVEFighting(): Promise<void> {
        logger.info("[StrategyService] PVE 战斗阶段：准备拾取战利品...");
        
        // 执行战利品拾取逻辑（拾取过程中会移动小小英雄，同时起到防挂机作用）
        await this.pickUpLootOrbs();
    }

    /**
     * 处理 PVP 战斗阶段 (玩家对战)
     * @description PVP 回合的战斗阶段：
     *              - 玩家对战不会掉落战利品球
     *              - 可以观察对手阵容、调整下回合策略
     *              - 主要是等待战斗结束
     */
    private async handlePVPFighting(): Promise<void> {
        logger.info("[StrategyService] PVP 战斗阶段：观战中...");
        
        // PVP 战斗阶段暂无特殊操作
        // TODO: 可以在这里添加观察对手阵容的逻辑
        // await this.analyzeOpponentBoard();
    }

    /**
     * 拾取战利品球
     * @description 检测并拾取场上的战利品球
     *              战利品球有三种类型：普通(银色)、蓝色、金色
     *              
     * 拾取策略：
     * 1. 检测场上所有战利品球的位置
     * 2. 按优先级排序（金色 > 蓝色 > 普通）
     * 3. 依次移动小小英雄到战利品球位置拾取
     * 
     * TODO: 实现完整的拾取逻辑
     */
    private async pickUpLootOrbs(): Promise<void> {
        logger.info("[StrategyService] 开始检测战利品球...");
        
        // 1. 检测场上的战利品球
        const lootOrbs = await tftOperator.getLootOrbs();
        
        if (lootOrbs.length === 0) {
            logger.info("[StrategyService] 未检测到战利品球");
            return;
        }
        
        logger.info(`[StrategyService] 检测到 ${lootOrbs.length} 个战利品球`);
        
        // 2. 按优先级排序：金色 > 蓝色 > 普通
        const priorityOrder = { gold: 0, blue: 1, normal: 2 };
        const sortedOrbs = [...lootOrbs].sort((a, b) => {
            return priorityOrder[a.type] - priorityOrder[b.type];
        });
        
        // 3. 依次拾取战利品球
        for (const orb of sortedOrbs) {
            // 检查是否仍在战斗阶段（战斗结束后停止拾取）
            if (!this.isFighting()) {
                logger.info("[StrategyService] 战斗已结束，停止拾取");
                break;
            }
            
            logger.info(`[StrategyService] 正在拾取 ${orb.type} 战利品球，位置: (${orb.x}, ${orb.y})`);
            
            // TODO: 移动小小英雄到战利品球位置
            // await this.moveLittleLegendTo(orb.x, orb.y);
            
            // TODO: 等待拾取动画完成
            // await sleep(200);
        }
        
        logger.info("[StrategyService] 战利品拾取完成");
    }

    /**
     * 处理游戏前期阶段（第一阶段 1-1 ~ 1-4）
     * @description 整个第一阶段的处理逻辑：
     *              - 1-1、1-2：商店未开放，只执行防挂机
     *              - 1-3、1-4：商店已开放，执行前期运营策略（组建阵容）
     */
    private async handleEarlyPVE(): Promise<void> {
        // 前两个回合：商店未开放，只需防挂机
        if (this.currentRound <= 2) {
            logger.info(`[StrategyService] 前期阶段 1-${this.currentRound}：商店未开放，执行防挂机...`);
            await this.antiAfk();
            return;
        }
        
        // 1-3、1-4 回合：商店已开放，执行运营策略
        logger.info(`[StrategyService] 前期阶段 1-${this.currentRound}：商店已开放，执行前期运营...`);
        await this.executeCommonStrategy();
    }

    /**
     * 处理 PVP 阶段 (玩家对战)
     * @description 
     * - 首次 PVP（2-1）：如果阵容未锁定，进行阵容匹配
     * - 后续 PVP：正常运营（拿牌、升级、调整站位）
     */
    private async handlePVP(): Promise<void> {
        // 首次 PVP 阶段：进行阵容匹配
        if (this.selectionState === LineupSelectionState.PENDING) {
            if (!gameStateManager.hasFirstPvpOccurred()) {
                logger.info("[StrategyService] 检测到第一个 PVP 阶段，开始阵容匹配...");
                await this.matchAndLockLineup();
            }
        }
        
        logger.info("[StrategyService] PVP阶段：全力运营...");
        
        // 通用运营策略
        await this.executeCommonStrategy();

        // TODO: 添加升级(F)、D牌(D)、调整站位逻辑
        // await this.levelUpOrRoll();
        // await this.adjustPosition();
    }

    /**
     * 防挂机：随机移动小小英雄
     * @description 在战斗阶段（如前期 PVE、野怪回合）时调用，
     *              让小小英雄随机走动，避免被系统判定为挂机
     * 
     * TODO: 实现随机移动逻辑
     * - 生成随机目标坐标（在安全区域内）
     * - 调用 tftOperator 移动小小英雄
     * - 可以考虑添加移动间隔，避免频繁移动
     */
    private async antiAfk(): Promise<void> {
        // TODO: 实现防挂机随机移动
        logger.debug("[StrategyService] 防挂机移动（待实现）");
    }

    /**
     * 通用运营策略入口
     * @description 每个回合的核心运营逻辑入口，包含：
     *              - 购买棋子（目标棋子 / 前期随机购买）
     *              - D 牌（刷新商店）
     *              - 升级（买经验）
     *              - 卖棋子（清理备战席）
     *              - 上装备
     *              - 调整站位
     *              - 更换阵容（如果需要）
     * 
     * 根据阵容锁定状态和当前阶段，执行不同的子策略
     * 
     * TODO: 逐步实现各个子策略
     */
    private async executeCommonStrategy(): Promise<void> {
        if (this.isLineupLocked()) {
            // 阵容已锁定：执行正常运营
            logger.debug("[StrategyService] 阵容已锁定，执行正常运营策略");
            
            // TODO: D 牌策略
            // await this.executeRollStrategy();
            
            // TODO: 升级策略
            // await this.executeLevelUpStrategy();
            
            // 购买目标棋子
            await this.analyzeAndBuy();
            
            // TODO: 上装备
            // await this.equipItems();
            
            // TODO: 调整站位
            // await this.adjustPositions();
            
            // TODO: 卖多余棋子
            // await this.sellExcessUnits();
        } else {
            // 阵容未锁定：执行前期策略
            logger.debug("[StrategyService] 阵容未锁定，执行前期运营策略");
            await this.executeEarlyGameStrategy();
        }
    }

    /**
     * 前期运营策略（阵容未锁定时使用）
     * @description 阵容尚未锁定时的运营策略：
     *              1. 优先购买备战席/场上已有的棋子（方便升星）
     *              2. 优先购买所有候选阵容中出现的棋子
     *              3. 其他低费棋子随机购买（增加后续匹配的可能性）
     * 
     * TODO: 实现前期运营逻辑
     */
    private async executeEarlyGameStrategy(): Promise<void> {
        // TODO: 实现前期运营策略
        // 1. 获取当前已有的棋子名称（用于判断是否能升星）
        // 2. 获取所有候选阵容的 level4 目标棋子（合并去重）
        // 3. 遍历商店，按优先级决策购买
        logger.debug("[StrategyService] 前期运营策略（待实现）");
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
     * 重置策略服务状态
     * @description 在游戏结束或停止时调用，清理所有状态
     *              会同时取消订阅事件并重置 GameStateManager
     */
    public reset(): void {
        // 取消订阅事件
        this.unsubscribe();

        this.currentLineup = null;
        this.candidateLineups = [];
        this.selectionState = LineupSelectionState.NOT_INITIALIZED;
        this.targetChampionNames.clear();
        
        // 重置阶段/回合追踪
        this.currentStage = 0;
        this.currentRound = 0;
        
        // 同时重置 GameStateManager
        gameStateManager.reset();
        
        logger.info("[StrategyService] 策略服务已重置");
    }
}

// 导出单例实例，方便其他文件直接使用
export const strategyService = StrategyService.getInstance();
