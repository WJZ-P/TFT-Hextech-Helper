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
import {IdentifiedEquip, tftOperator} from "../TftOperator";
import {logger} from "../utils/Logger";
import {TFTUnit, GameStageType, fightBoardSlotPoint, getChampionRange, ChampionKey, ShopSlotIndex} from "../TFTProtocol";
import {gameStateManager} from "./GameStateManager";
import {gameStageMonitor, GameStageEvent} from "./GameStageMonitor";
import {settingsStore} from "../utils/SettingsStore";
import {lineupLoader} from "../lineup";
import {LineupConfig, StageConfig, ChampionConfig} from "../lineup/LineupTypes";
import {mouseController, BenchUnit, BenchLocation, BoardUnit, BoardLocation} from "../tft";
import {sleep} from "../utils/HelperTools";

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
    private targetChampionNames: Set<ChampionKey> = new Set();

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

    private constructor() {
    }

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
        const {type, stageText, stage, round, isNewStage} = event;

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
        const selectedIds: string[] = settingsStore.get('selectedLineupIds');

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
        currentChampions: Set<ChampionKey>
    ): LineupMatchResult {
        // 获取阵容的 level4 配置（早期阵容）
        const level4Config = lineup.stages.level4;

        if (!level4Config) {
            logger.warn(`[StrategyService] 阵容 "${lineup.name}" 没有 level4 配置`);
            return {lineup, score: 0, matchedChampions: []};
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

        return {lineup, score, matchedChampions};
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
        ]) as [
            (TFTUnit | null)[],
            IdentifiedEquip[],
            { level: number; currentXp: number; totalXp: number } | null,
            number | null
        ];

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
     *
     * 循环逻辑：
     * - 使用 while 循环持续扫描和拾取战利品球
     * - 每次拾取完成后等待一小段时间再扫描（避免频繁截图）
     * - 战斗结束（isFighting = false）时自动退出循环
     */
    private async handlePVEFighting(): Promise<void> {
        logger.info("[StrategyService] PVE 战斗阶段：开始循环拾取战利品...");

        // 扫描间隔（毫秒）：每次拾取完成后等待一段时间再重新扫描
        // 设置较短的间隔，确保及时发现新掉落的战利品球
        const scanInterval = 1000;

        // 使用 while 循环持续扫描，直到战斗结束
        // 这样可以确保：
        // 1. 上一次 pickUpLootOrbs() 完成后才开始下一次
        // 2. 战斗结束时自动退出，不会残留定时器
        while (this.isFighting()) {
            // 执行一轮战利品拾取
            await this.pickUpLootOrbs();

            // 如果战斗已结束，直接退出（避免多余的等待）
            if (!this.isFighting()) {
                break;
            }

            // 等待一段时间后再次扫描
            // 这个间隔可以根据实际情况调整：
            // - 太短：频繁截图，CPU 占用高
            // - 太长：响应太慢
            await sleep(scanInterval);
        }

        logger.info("[StrategyService] PVE 战斗阶段结束，停止拾取循环");
    }

    /**
     * 处理 PVP 战斗阶段 (玩家对战)
     * @description PVP 回合的战斗阶段：
     *              - 玩家对战通常不会掉落战利品球，但某些海克斯可能会
     *              - 执行一次战利品球搜索（以防万一）
     *              - 让小小英雄随机走动（防挂机）
     */
    private async handlePVPFighting(): Promise<void> {
        logger.info("[StrategyService] PVP 战斗阶段：观战中...");

        // 1. 执行一次战利品球搜索（某些海克斯可能会在 PVP 阶段掉落战利品）
        await this.pickUpLootOrbs();

        // 2. 让小小英雄随机走动（防挂机）
        // TODO: 实现随机走动逻辑
        await tftOperator.selfWalkAround();
    }

    /**
     * 拾取战利品球
     * @description 检测并拾取场上的战利品球
     *              战利品球有三种类型：普通(银色)、蓝色、金色
     *
     * 拾取策略：
     * 1. 检测场上所有战利品球的位置
     * 2. 按 X 坐标从左到右排序（小小英雄默认在左下角，从左往右是最短路径）
     * 3. 依次移动小小英雄到战利品球位置拾取
     *
     * TODO: 实现完整的拾取逻辑
     */
    private async pickUpLootOrbs(): Promise<void> {
        const sleepTime = 2000; //  每次点击之间的间隔时间
        logger.info("[StrategyService] 开始检测战利品球...");

        // 1. 检测场上的战利品球
        const lootOrbs = await tftOperator.getLootOrbs();

        if (lootOrbs.length === 0) {
            logger.info("[StrategyService] 未检测到战利品球");
            return;
        }

        logger.info(`[StrategyService] 检测到 ${lootOrbs.length} 个战利品球`);

        // 2. 按 X 坐标从左到右排序（最短路径：小小英雄默认在左下角）
        const sortedOrbs = [...lootOrbs].sort((a, b) => a.x - b.x);

        // 3. 依次拾取战利品球
        for (const orb of sortedOrbs) {
            // 检查是否仍在战斗阶段（战斗结束后停止拾取）
            if (!this.isFighting()) {
                logger.info("[StrategyService] 战斗已结束，停止拾取");
                break;
            }
            logger.info(`[StrategyService] 正在拾取 ${orb.type} 战利品球，位置: (${orb.x}, ${orb.y}), 等待 ${sleepTime}ms`);

            // 右键点击战利品球位置，小小英雄会自动移动过去拾取
            // mouseController.clickAt 接受的是游戏内相对坐标，orb.x/orb.y 正好是相对坐标
            await mouseController.clickAt({x: orb.x, y: orb.y});

            // 等待小小英雄移动到目标位置并拾取
            await sleep(sleepTime);
        }
        logger.info("[StrategyService] 战利品拾取完成");
        await tftOperator.selfResetPosition();
    }

    /**
     * 处理游戏前期阶段（第一阶段 1-1 ~ 1-4）
     * @description 整个第一阶段的处理逻辑：
     *              - 1-1、1-2：商店未开放，只执行防挂机
     *              - 1-3、1-4：商店已开放，执行前期特殊运营策略
     */
    private async handleEarlyPVE(): Promise<void> {
        // 前两个回合：商店未开放，只需防挂机
        if (this.currentRound <= 2) {
            logger.info(`[StrategyService] 前期阶段 1-${this.currentRound}：商店未开放，执行防挂机...`);
            await this.antiAfk();
            return;
        }

        // 1-3、1-4 回合：商店已开放，执行前期特殊策略
        logger.info(`[StrategyService] 前期阶段 1-${this.currentRound}：商店已开放，执行前期运营...`);
        await this.executeEarlyPVEStrategy();
    }

    /**
     * 前期 PVE 阶段专用策略 (1-3、1-4 回合)
     * @description 这个阶段的特殊性：
     *              - 阵容尚未锁定（要等到 2-1 第一个 PVP 阶段才匹配）
     *              - 金币有限（通常只有 4-6 金币）
     *              - 目标：尽可能买到候选阵容中的棋子，为后续匹配做准备
     *
     * 购买优先级：
     * 1. 优先购买备战席/场上已有的棋子（方便升星）
     * 2. 优先购买所有候选阵容 level4 中出现的棋子
     * 3. 低费棋子（1-2 费）可以考虑购买（增加后续匹配可能性）
     */
    private async executeEarlyPVEStrategy(): Promise<void> {
        //  小小英雄归位
        await tftOperator.selfResetPosition();

        // 0. 先刷新游戏状态，确保拿到最新的备战席、棋盘、商店数据
        await this.refreshGameState();

        // 1. 获取当前已有的棋子名称（备战席 + 棋盘）
        const ownedChampions = gameStateManager.getOwnedChampionNames();

        // 2. 获取所有候选阵容的 level4 目标棋子（合并去重）
        const candidateTargets = this.getCandidateTargetChampions();

        logger.info(
            `[StrategyService] 前期策略 - 金币: ${gameStateManager.getGold()}，` +
            `备战席空位: ${gameStateManager.getEmptyBenchSlotCount()}，` +
            `已有棋子: ${Array.from(ownedChampions).join(', ') || '无'}，` +
            `候选目标: ${Array.from(candidateTargets).join(', ') || '无'}`
        );

        // 3. 获取商店信息并批量分析购买决策
        const shopUnits = gameStateManager.getShopUnits();
        const buyIndices = this.analyzePurchaseDecision(shopUnits, ownedChampions, candidateTargets);

        // 4. 按顺序执行购买
        for (const index of buyIndices) {
            const unit = shopUnits[index];
            if (!unit) continue;

            logger.info(
                `[StrategyService] 前期决策购买: ${unit.displayName} (￥${unit.price})，` +
                `原因: ${this.getEarlyBuyReason(unit, ownedChampions, candidateTargets)}`
            );

            const success = await this.buyAndUpdateState(index);

            if (success) {
                // 将刚买的棋子加入已有棋子集合（影响后续"已有棋子可升星"的判断）
                ownedChampions.add(unit.displayName as ChampionKey);
            }
        }

        // 5. 购买完成后，优化棋盘阵容（上棋子、替换）
        await this.optimizeBoard(candidateTargets);
    }

    /**
     * 批量分析商店购买决策
     * @param shopUnits 商店棋子列表
     * @param ownedChampions 已拥有的棋子名称集合
     * @param targetChampions 目标阵容棋子集合
     * @returns 建议购买的商店槽位索引数组（已按优先级排序）
     * 
     * @description 购买优先级：
     *              1. 目标阵容内的棋子 → 无条件购买（不管有没有空位）
     *              2. 已拥有的棋子 → 无条件购买（可以升星）
     *              3. 非目标棋子 → 只有场上有空位时才买，优先买高费的（当打工仔）
     */
    private analyzePurchaseDecision(
        shopUnits: (TFTUnit | null)[],
        ownedChampions: Set<ChampionKey>,
        targetChampions: Set<ChampionKey>
    ): ShopSlotIndex[] {
        // 分类：目标棋子、已有棋子、打工棋子
        const targetIndices: ShopSlotIndex[] = [];      // 目标阵容棋子（必买）
        const ownedIndices: ShopSlotIndex[] = [];       // 已有棋子（必买，可升星）
        const workerCandidates: { index: ShopSlotIndex; price: number }[] = [];  // 打工候选

        for (let i = 0; i < shopUnits.length; i++) {
            const unit = shopUnits[i];
            if (!unit) continue;

            const name = unit.displayName as ChampionKey;
            const slotIndex = i as ShopSlotIndex;  // 安全断言：i 的范围是 0-4

            if (targetChampions.has(name)) {
                // 目标阵容棋子：必买
                targetIndices.push(slotIndex);
            } else if (ownedChampions.has(name)) {
                // 已有棋子：必买（可升星）
                ownedIndices.push(slotIndex);
            } else {
                // 非目标棋子：候选打工仔
                workerCandidates.push({ index: slotIndex, price: unit.price });
            }
        }

        // 打工棋子按费用从高到低排序（高费战斗力强）
        workerCandidates.sort((a, b) => b.price - a.price);

        // 计算可以买多少个打工仔（只有场上有空位才买）
        const availableSlots = gameStateManager.getAvailableBoardSlots();
        const workersToBuy = workerCandidates
            .slice(0, Math.max(0, availableSlots))  // 最多买到填满空位
            .map(w => w.index);

        // 合并结果：目标棋子 > 已有棋子 > 打工棋子
        const result = [...targetIndices, ...ownedIndices, ...workersToBuy];

        logger.debug(
            `[StrategyService] 购买分析 - 目标棋子: ${targetIndices.length}个，` +
            `已有棋子: ${ownedIndices.length}个，打工棋子: ${workersToBuy.length}个`
        );

        return result;
    }

    /**
     * 优化棋盘阵容（通用方法，适用于所有阶段）
     * @param targetChampions 目标棋子集合（用于评估棋子价值）
     * @description 
     * - 有空位：自动上场备战席的目标棋子
     * - 满员：用备战席的强力棋子替换场上的弱棋子
     */
    private async optimizeBoard(targetChampions: Set<ChampionKey>): Promise<void> {
        const availableSlots = gameStateManager.getAvailableBoardSlots();
        
        if (availableSlots > 0) {
            // 有空位，上场备战席棋子
            await this.autoPlaceUnitsToEmptySlots(targetChampions, availableSlots);
        } else {
            // 满员，执行替换逻辑
            await this.autoReplaceWeakestUnit(targetChampions);
        }
    }

    /**
     * 自动根据算法将备战席棋子上场到空位
     * @param targetChampions 目标棋子集合
     * @param availableSlots 可用空位数量
     */
    private async autoPlaceUnitsToEmptySlots(targetChampions: Set<ChampionKey>, availableSlots: number): Promise<void> {
        // 获取备战席上的棋子
        const benchUnits = gameStateManager.getBenchUnits().filter((u): u is BenchUnit => u !== null);
        
        if (benchUnits.length === 0) {
            logger.debug("[StrategyService] 备战席没有棋子，跳过摆放");
            return;
        }

        // 筛选并排序需要上场的棋子
        const unitsToPlace = this.selectUnitsToPlace(benchUnits, targetChampions, availableSlots);
        
        if (unitsToPlace.length === 0) {
            logger.debug("[StrategyService] 备战席没有可以上场的棋子");
            return;
        }

        logger.info(
            `[StrategyService] 开始摆放棋子，当前等级: ${gameStateManager.getLevel()}，` +
            `可上场数量: ${availableSlots}，待上场: ${unitsToPlace.length}`
        );

        // 依次摆放棋子
        for (const unit of unitsToPlace) {
            const championName = unit.tftUnit.displayName;
            const targetLocation = this.findBestPositionForUnit(unit);

            if (!targetLocation) {
                logger.warn(`[StrategyService] 找不到合适的位置放置 ${championName}`);
                continue;
            }

            logger.info(
                `[StrategyService] 摆放棋子: ${championName} ` +
                `(射程: ${getChampionRange(championName as any) ?? '未知'}) -> ${targetLocation}`
            );

            await tftOperator.moveBenchToBoard(unit.location, targetLocation);
            await sleep(200);
        }

        logger.info(`[StrategyService] 棋子摆放完成，共摆放 ${unitsToPlace.length} 个棋子`);
    }

    /**
     * 替换场上最弱的棋子
     * @param targetChampions 目标棋子集合
     * @description 用备战席价值更高的棋子替换场上价值最低的棋子
     *              
     *              替换策略（保护目标阵容棋子）：
     *              1. 备战席有空位 → 把场上棋子移回备战席 → 新棋子上场
     *              2. 备战席没空位 → 卖掉场上棋子 → 新棋子上场
     */
    private async autoReplaceWeakestUnit(targetChampions: Set<ChampionKey>): Promise<void> {
        const benchUnits = gameStateManager.getBenchUnits().filter((u): u is BenchUnit => u !== null);
        if (benchUnits.length === 0) return;

        // 找备战席最好的棋子
        const bestBench = this.findBestBenchUnit(benchUnits, targetChampions);
        if (!bestBench) return;

        // 找棋盘最差的棋子
        const worstBoard = this.findWorstBoardUnit(targetChampions);
        if (!worstBoard) return;

        // 备战席棋子价值更高才替换
        if (bestBench.score > worstBoard.score) {
            const worstName = worstBoard.unit.tftUnit.displayName;
            const bestName = bestBench.unit.tftUnit.displayName;

            // 检查备战席是否有空位
            const emptyBenchSlot = gameStateManager.getFirstEmptyBenchSlotIndex();
            const hasEmptyBenchSlot = emptyBenchSlot !== -1;

            if (hasEmptyBenchSlot) {
                // 方案 A：备战席有空位，把场上棋子移回备战席（保护目标阵容棋子）
                logger.info(
                    `[StrategyService] 替换(保留): ${worstName}(${worstBoard.score}分) 移回备战席，` +
                    `${bestName}(${bestBench.score}分) 上场`
                );

                // 先把场上棋子移回备战席（参数是数字索引 0-8）
                await tftOperator.moveBoardToBench(worstBoard.location, emptyBenchSlot);
                await sleep(100);
            } else {
                // 方案 B：备战席没空位，只能卖掉
                logger.info(
                    `[StrategyService] 替换(卖出): ${worstName}(${worstBoard.score}分) ` +
                    `-> ${bestName}(${bestBench.score}分)`
                );

                await tftOperator.sellUnit(worstBoard.location);
                await sleep(100);
            }

            // 根据新棋子的射程，找到最佳位置上场
            const targetLocation = this.findBestPositionForUnit(bestBench.unit);
            
            if (targetLocation) {
                await tftOperator.moveBenchToBoard(bestBench.unit.location, targetLocation);
                await sleep(10);
            } else {
                logger.warn(`[StrategyService] 找不到合适位置放置 ${bestName}`);
            }
        }
    }

    /**
     * 找备战席中价值最高的棋子
     */
    private findBestBenchUnit(
        benchUnits: BenchUnit[],
        targetChampions: Set<ChampionKey>
    ): { unit: BenchUnit; score: number } | null {
        let best: { unit: BenchUnit; score: number } | null = null;

        for (const unit of benchUnits) {
            const score = this.calculateUnitScore(unit.tftUnit, unit.starLevel, targetChampions);
            if (!best || score > best.score) {
                best = {unit, score};
            }
        }

        return best;
    }

    /**
     * 找棋盘上价值最低的棋子
     */
    private findWorstBoardUnit(
        targetChampions: Set<ChampionKey>
    ): { unit: BoardUnit; location: BoardLocation; score: number } | null {
        const boardUnits = gameStateManager.getBoardUnits();
        const boardLocationKeys = Object.keys(fightBoardSlotPoint) as BoardLocation[];

        let worst: { unit: BoardUnit; location: BoardLocation; score: number } | null = null;

        for (let i = 0; i < boardUnits.length; i++) {
            const unit = boardUnits[i];
            if (!unit) continue;

            const score = this.calculateUnitScore(unit.tftUnit, unit.starLevel, targetChampions);
            if (!worst || score < worst.score) {
                worst = {unit, location: boardLocationKeys[i], score};
            }
        }

        return worst;
    }

    /**
     * 计算棋子价值分数
     * @description 评分规则（优先级从高到低）：
     *              1. 目标阵容中的核心棋子 → +10000
     *              2. 目标阵容中的普通棋子 → +1000
     *              3. 棋子费用 → 每费 +100（高费棋子战斗力更强）
     *              4. 棋子星级 → 每星 +10（最低优先级）
     * 
     * 分数设计说明：
     * - 使用不同数量级确保优先级不会被低优先级的高数值覆盖
     * - 例如：1费核心棋子 (10000+100+10=10110) > 5费非目标棋子 (500+10=510)
     */
    private calculateUnitScore(unit: TFTUnit, starLevel: number, targetChampions: Set<ChampionKey>): number {
        let score = 0;
        const championName = unit.displayName as ChampionKey;
        
        // 获取核心棋子名称集合
        const coreChampionNames = new Set<ChampionKey>(
            this.getCoreChampions().map(c => c.name as ChampionKey)
        );

        // 优先级 1: 目标阵容中的核心棋子
        if (targetChampions.has(championName) && coreChampionNames.has(championName)) {
            score += 10000;
        }
        // 优先级 2: 目标阵容中的普通棋子（非核心）
        else if (targetChampions.has(championName)) {
            score += 1000;
        }

        // 优先级 3: 棋子费用（高费棋子战斗力更强）
        score += unit.price * 100;

        // 优先级 4: 棋子星级（最低优先级）
        score += starLevel * 10;

        return score;
    }

    /**
     * 获取所有候选阵容的 level4 目标棋子（合并去重）
     * @returns 所有候选阵容 level4 棋子名称的集合
     * @description 用于前期策略，在阵容未锁定时，
     *              购买任何一个候选阵容中的棋子都是有价值的
     */
    private getCandidateTargetChampions(): Set<ChampionKey> {
        const targets = new Set<ChampionKey>();

        // 如果阵容已锁定，直接返回当前目标棋子
        if (this.isLineupLocked() && this.currentLineup) {
            return this.targetChampionNames;
        }

        // 遍历所有候选阵容，收集 level4 的棋子
        for (const lineup of this.candidateLineups) {
            const level4Config = lineup.stages.level4;
            if (level4Config) {
                for (const champion of level4Config.champions) {
                    targets.add(champion.name);
                }
            }
        }

        return targets;
    }

    /**
     * 前期购买决策逻辑
     * @param unit 商店中的棋子
     * @param ownedChampions 已拥有的棋子名称集合
     * @param candidateTargets 候选阵容的目标棋子集合
     * @returns 是否应该购买
    /**
     * 获取前期购买原因（用于日志输出）
     * @description 帮助调试，了解为什么购买某个棋子
     */
    private getEarlyBuyReason(
        unit: TFTUnit,
        ownedChampions: Set<ChampionKey>,
        candidateTargets: Set<ChampionKey>
    ): string {
        const name = unit.displayName as ChampionKey;
        if (candidateTargets.has(name)) {
            return '目标阵容棋子';
        }
        if (ownedChampions.has(name)) {
            return '已有棋子，可升星';
        }
        return `打工仔 (${unit.price}费)`;
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

            // 优化棋盘（上棋子 + 替换弱棋子）
            await this.optimizeBoard(this.targetChampionNames);

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
        return this.targetChampionNames.has(unit.displayName as ChampionKey);

        // --- 进阶逻辑思路 (留给未来的作业) ---
        // 1. 检查金币：如果买了会卡利息 (比如剩 51 块，买个 2 块的变 49)，是否值得？
        // 2. 检查星级：如果场上 + 备战席已经有 9 张了 (能合 3 星)，是否还需要买？
        // 3. 检查备战席空间：如果备战席满了，买了也没地放，是不是要先卖别的？
        // 4. 优先级：核心棋子优先购买
    }

    /**
     * 购买棋子并更新游戏状态
     * @param shopSlotIndex 商店槽位索引 (0-4)
     * @returns 是否购买成功
     *
     * @description 这是一个核心方法，负责：
     *              1. 检查购买条件（金币、备战席空位、是否能升星）
     *              2. 执行购买操作
     *              3. 更新 GameStateManager 中的状态（金币、备战席、商店）
     *
     * TFT 合成规则：
     * - 3 个 1★ 同名棋子 → 自动合成 1 个 2★
     * - 合成时，场上的棋子优先变为高星，备战席的棋子被消耗
     * - 如果都在备战席，靠左（索引小）的棋子变为高星，其他被消耗
     *
     * 购买后状态变化：
     * - 情况 A：备战席有空位，不能升星
     *   → 新棋子放入最左边的空位
     * - 情况 B：能升星（已有 2 个 1★）
     *   - B1：场上 1 个 + 备战席 1 个 → 场上棋子升 2★，备战席棋子消失
     *   - B2：备战席 2 个 → 靠左的升 2★，另一个消失
     * - 情况 C：备战席满且不能升星
     *   → 无法购买，返回 false
     */
    private async buyAndUpdateState(shopSlotIndex: ShopSlotIndex): Promise<boolean> {
        // 1. 获取商店棋子信息
        const shopUnits = gameStateManager.getShopUnits();
        const unit = shopUnits[shopSlotIndex];

        if (!unit) {
            logger.error(`[StrategyService] 商店槽位 ${shopSlotIndex} 为空，无法购买`);
            return false;
        }

        const championName = unit.displayName;
        const price = unit.price;

        // 2. 检查金币是否足够
        const currentGold = gameStateManager.getGold();
        if (currentGold < price) {
            logger.error(
                `[StrategyService] 金币不足，无法购买 ${championName}` +
                `（需要 ${price}，当前 ${currentGold}）`
            );
            return false;
        }

        // 3. 检查备战席空位和升星情况
        const emptyBenchSlots = gameStateManager.getEmptyBenchSlotCount();
        const canUpgrade = gameStateManager.canUpgradeAfterBuy(championName);

        // 4. 判断是否可以购买
        if (emptyBenchSlots <= 0 && !canUpgrade) {
            logger.error(
                `[StrategyService] 备战席已满且买了不能升星，无法购买 ${championName}`
            );
            return false;
        }

        // 5. 执行购买操作（调用 TftOperator）
        //    商店槽位是 1-5，所以要 +1
        logger.info(
            `[StrategyService] 购买 ${championName} (￥${price})` +
            (canUpgrade ? ' [可升星]' : '')
        );
        await tftOperator.buyAtSlot(shopSlotIndex + 1);

        // 6. 更新 GameStateManager 状态
        // 6.1 扣减金币
        gameStateManager.deductGold(price);

        // 6.2 清空商店槽位
        gameStateManager.setShopSlotEmpty(shopSlotIndex);

        // 6.3 更新备战席/棋盘状态
        if (canUpgrade) {
            // 能升星：找到参与合成的 2 个 1★ 棋子
            this.handleUpgradeAfterBuy(championName);
        } else {
            // 不能升星：新棋子放入备战席最左边的空位
            const emptySlotIndex = gameStateManager.getFirstEmptyBenchSlotIndex();

            if (emptySlotIndex === -1) {
                // 理论上不应该发生，因为前面已经检查过
                logger.error(`[StrategyService] 备战席没有空位，但购买已执行`);
            } else {
                // 构造新的 BenchUnit 对象
                // 商店买的棋子都是 1 星，且没有装备
                const newBenchUnit: BenchUnit = {
                    location: `SLOT_${emptySlotIndex + 1}` as BenchLocation,  // 索引 0 对应 SLOT_1
                    tftUnit: unit,  // 商店棋子信息
                    starLevel: 1,   // 商店买的都是 1 星
                    equips: [],     // 刚买的棋子没有装备
                };

                gameStateManager.setBenchSlotUnit(emptySlotIndex, newBenchUnit);

                logger.debug(
                    `[StrategyService] ${championName} 放入备战席槽位 ${emptySlotIndex} (SLOT_${emptySlotIndex + 1})`
                );
            }
        }

        return true;
    }

    /**
     * 处理购买后的升星逻辑
     * @param championName 购买的棋子名称
     * @description 当购买的棋子能触发升星时，更新 GameStateManager 中的状态：
     *              - 找到参与合成的 2 个 1★ 棋子位置
     *              - 决定哪个棋子升级、哪个棋子消失
     *              - 更新对应槽位的状态
     *
     * TFT 合成优先级：
     * 1. 如果场上有 1★，场上的棋子升级，备战席的消失
     * 2. 如果都在备战席，索引小（靠左）的升级，另一个消失
     */
    private handleUpgradeAfterBuy(championName: string): void {
        // 获取所有 1★ 棋子的位置
        const positions = gameStateManager.findOneStarChampionPositions(championName);

        if (positions.length < 2) {
            // 理论上不应该发生，因为 canUpgradeAfterBuy 已经检查过
            logger.warn(
                `[StrategyService] 升星异常：${championName} 只找到 ${positions.length} 个 1★`
            );
            return;
        }

        // 取前 2 个位置（已按优先级排序：场上优先，然后按索引从小到大）
        const [first, second] = positions;

        logger.info(
            `[StrategyService] ${championName} 升星：` +
            `${first.location}[${first.index}] 升为 2★，` +
            `${second.location}[${second.index}] 消失`
        );

        // 第一个位置的棋子升级为 2★
        if (first.location === 'board') {
            gameStateManager.updateBoardSlotStarLevel(first.index, 2);
        } else {
            gameStateManager.updateBenchSlotStarLevel(first.index, 2);
        }

        // 第二个位置的棋子消失
        if (second.location === 'bench') {
            gameStateManager.setBenchSlotEmpty(second.index);
        }
        // 注意：如果第二个在棋盘上，理论上不会发生（因为场上棋子优先升级）
        // 但如果真的发生了，我们不处理棋盘槽位清空（棋盘上的棋子不会因合成消失）
    }

    // ============================================================
    // 🎯 棋子摆放策略 (Unit Placement Strategy)
    // ============================================================

    /**
     * 选择需要上场的棋子
     * @param benchUnits 备战席上的棋子列表
     * @param targetChampions 目标棋子集合
     * @param maxCount 最多可以上场的数量
     * @returns 需要上场的棋子列表（已排序）
     *
     * @description 选择逻辑：
     *              场上有空位必须填满！不能因为不是目标棋子就空着不放。
     *              复用 calculateUnitScore 计算分数，按分数从高到低排序。
     *              
     *              非目标棋子作为"打工仔"，虽然没有羁绊加成，但也能提供战斗力。
     */
    private selectUnitsToPlace(benchUnits: BenchUnit[], targetChampions: Set<ChampionKey>, maxCount: number): BenchUnit[] {
        if (benchUnits.length === 0) {
            return [];
        }

        // 复用 calculateUnitScore 计算分数，按分数从高到低排序
        const sortedUnits = [...benchUnits].sort((a, b) => {
            const aScore = this.calculateUnitScore(a.tftUnit, a.starLevel, targetChampions);
            const bScore = this.calculateUnitScore(b.tftUnit, b.starLevel, targetChampions);
            return bScore - aScore;  // 分数高的排前面
        });

        return sortedUnits.slice(0, maxCount);
    }

    /**
     * 为棋子找到最佳摆放位置
     * @param unit 要摆放的棋子
     * @returns 最佳位置的 BoardLocation，如果找不到返回 undefined
     *
     * @description 摆放逻辑：
     *              - 射程 1-2（近战）：优先放前排 (R1, R2)
     *              - 射程 3+（远程）：优先放后排 (R3, R4)
     *              - 如果优先区域没有空位，则放到任意空位
     */
    private findBestPositionForUnit(unit: BenchUnit): BoardLocation | undefined {
        const championName = unit.tftUnit.displayName;
        const range = getChampionRange(championName) ?? 1;

        // 判断是近战还是远程
        const isMelee = range <= 2;

        // 获取前后排空位
        const frontRowEmpty = gameStateManager.getFrontRowEmptyLocations();
        const backRowEmpty = gameStateManager.getBackRowEmptyLocations();

        logger.debug(
            `[StrategyService] ${championName} 射程: ${range}，` +
            `${isMelee ? '近战' : '远程'}，` +
            `前排空位: ${frontRowEmpty.length}，后排空位: ${backRowEmpty.length}`
        );

        // 根据近战/远程决定优先和备选区域
        const [primary, secondary] = isMelee 
            ? [frontRowEmpty, backRowEmpty]   // 近战：优先前排
            : [backRowEmpty, frontRowEmpty];  // 远程：优先后排

        // 优先区域有空位就放，否则放备选区域，都没有则返回 undefined
        const candidates = primary.length > 0 ? primary : secondary;
        return candidates.length > 0 ? this.selectPositionFromCenter(candidates) : undefined;
    }

    /**
     * 从空位列表中选择最佳位置。这里传入的时候就已经区分了前排和后排。
     * @param emptyLocations 空位列表（如 ["R1_C1", "R1_C3", "R2_C4"]）
     * @returns 最佳位置
     *
     * @description 行优先 + 列居中的选择策略：
     *              1. 行优先级：R1 > R2 > R3 > R4（前排棋子先站前面）
     *              2. 同行内列优先级：C4 > C3 > C5 > C2 > C6 > C1 > C7（从中间向两边）
     *              这样可以让阵型紧凑，近战棋子不用绕路
     */
    private selectPositionFromCenter(emptyLocations: BoardLocation[]): BoardLocation | undefined {
        if (emptyLocations.length === 0) return undefined;

        // 行优先级（前排到后排，注意这里后排是第四排优先于第三排，因为后排手长）
        const rowPriority = ['R1', 'R2', 'R4', 'R3'];
        // 列优先级（从中间到两边）
        const columnPriority = ['C4', 'C3', 'C5', 'C2', 'C6', 'C1', 'C7'];

        // 先按行优先级，再按列优先级
        for (const row of rowPriority) {
            // 筛选出当前行的空位
            const rowLocations = emptyLocations.filter(loc => loc.startsWith(row));
            if (rowLocations.length === 0) continue;

            // 在当前行内按列优先级选择
            for (const col of columnPriority) {
                const found = rowLocations.find(loc => loc.endsWith(col));
                if (found) return found;
            }
        }

        return emptyLocations[0];
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
