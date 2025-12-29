/**
 * 游戏状态管理器
 * @module GameStateManager
 * @description 单例模式，负责管理和缓存当前游戏的所有状态数据
 *              包括备战席、棋盘、商店、装备、等级、金币等信息
 * 
 * 设计理念：
 * - 纯粹的"记忆"角色：只负责存储和查询，不负责数据采集
 * - 数据采集由 StrategyService 调用 TftOperator 完成，然后通过 updateSnapshot() 更新
 * - 这样实现了职责分离：Operator(眼睛) -> Service(大脑) -> Manager(记忆)
 * - 支持游戏结束后重置，准备下一局
 */

import { BenchUnit, BoardUnit, IdentifiedEquip, BoardLocation } from "../TftOperator";
import { logger } from "../utils/Logger";
import { TFTUnit, GameStageType, fightBoardSlotPoint, ChampionKey } from "../TFTProtocol";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 游戏状态快照
 * @description 缓存当前阶段扫描到的游戏数据
 */
export interface GameStateSnapshot {
    /** 备战席棋子 (9 个槽位) */
    benchUnits: (BenchUnit | null)[];
    /** 棋盘棋子 (28 个槽位: 4行 x 7列) */
    boardUnits: (BoardUnit | null)[];
    /** 商店棋子 (5 个槽位) */
    shopUnits: (TFTUnit | null)[];
    /** 装备栏装备 */
    equipments: IdentifiedEquip[];
    /** 当前等级 */
    level: number;
    /** 当前经验值 */
    currentXp: number;
    /** 升级所需经验值 */
    totalXp: number;
    /** 当前金币 */
    gold: number;
    /** 快照时间戳 */
    timestamp: number;
}

/**
 * 游戏进程状态
 * @description 追踪当前游戏的进程信息
 */
export interface GameProgress {
    /** 当前游戏阶段 (如 "2-1", "3-5") */
    currentStage: string;
    /** 当前阶段类型 */
    currentStageType: GameStageType;
    /** 是否已经过了第一个 PVP 阶段 */
    hasFirstPvpOccurred: boolean;
    /** 游戏是否正在进行中 */
    isGameRunning: boolean;
    /** 游戏开始时间戳 */
    gameStartTime: number;
}

// ============================================================================
// GameStateManager 类
// ============================================================================

/**
 * 游戏状态管理器 (单例)
 * @description 集中管理本局游戏的所有状态数据，纯存储角色
 * 
 * 使用方式：
 * ```typescript
 * const manager = GameStateManager.getInstance();
 * 
 * // 由 StrategyService 采集数据后更新快照
 * manager.updateSnapshot({
 *     benchUnits,
 *     boardUnits,
 *     shopUnits,
 *     equipments,
 *     level: 4,
 *     currentXp: 2,
 *     totalXp: 6,
 *     gold: 50,
 * });
 * 
 * // 获取状态数据
 * const snapshot = manager.getSnapshotSync();
 * const level = manager.getLevel();
 * const benchUnits = manager.getBenchUnits();
 * 
 * // 游戏结束时重置
 * manager.reset();
 * ```
 */
export class GameStateManager {
    private static instance: GameStateManager;

    // ========== 游戏状态快照 ==========

    /** 当前阶段的游戏状态快照 */
    private snapshot: GameStateSnapshot | null = null;

    // ========== 游戏进程状态 ==========

    /** 游戏进程信息 */
    private progress: GameProgress = {
        currentStage: "",
        currentStageType: GameStageType.UNKNOWN,
        hasFirstPvpOccurred: false,
        isGameRunning: false,
        gameStartTime: 0,
    };

    // ========== 等级相关（独立追踪，因为可能频繁变化）==========

    /** 当前人口等级 */
    private currentLevel: number = 1;

    private constructor() { }

    /**
     * 获取单例实例
     */
    public static getInstance(): GameStateManager {
        if (!GameStateManager.instance) {
            GameStateManager.instance = new GameStateManager();
        }
        return GameStateManager.instance;
    }

    // ============================================================================
    // 快照管理
    // ============================================================================

    /**
     * 更新游戏状态快照
     * @description 由 StrategyService 调用 TftOperator 采集数据后，通过此方法更新快照
     *              GameStateManager 本身不负责数据采集，只负责存储
     * @param data 快照数据（不含 timestamp，会自动添加）
     */
    public updateSnapshot(data: Omit<GameStateSnapshot, 'timestamp'>): void {
        // 更新人口等级（独立追踪）
        if (data.level !== this.currentLevel) {
            logger.info(`[GameStateManager] 人口变化: ${this.currentLevel} -> ${data.level}`);
            this.currentLevel = data.level;
        }

        // 构建完整快照（添加时间戳）
        this.snapshot = {
            ...data,
            timestamp: Date.now(),
        };

        // 统计日志
        const benchCount = data.benchUnits.filter(u => u !== null).length;
        const boardCount = data.boardUnits.filter(u => u !== null).length;
        const shopCount = data.shopUnits.filter(u => u !== null).length;

        logger.info(
            `[GameStateManager] 快照更新完成: ` +
            `备战席 ${benchCount}/9, 棋盘 ${boardCount}/28, 商店 ${shopCount}/5, ` +
            `装备 ${data.equipments.length} 件, 等级 Lv.${data.level}, 金币 ${data.gold}`
        );
    }

    /**
     * 刷新游戏状态快照 (已废弃，保留向后兼容)
     * @deprecated 请使用 StrategyService.refreshGameState() 代替
     *             GameStateManager 不再直接调用 TftOperator
     * @returns 当前快照，如果不存在则返回空快照
     */
    public async refreshSnapshot(): Promise<GameStateSnapshot> {
        logger.warn("[GameStateManager] refreshSnapshot() 已废弃，请使用 StrategyService.refreshGameState()");

        // 如果已有快照，直接返回
        if (this.snapshot) {
            return this.snapshot;
        }

        // 返回空快照（向后兼容）
        return {
            benchUnits: [],
            boardUnits: [],
            shopUnits: [],
            equipments: [],
            level: this.currentLevel,
            currentXp: 0,
            totalXp: 0,
            gold: 0,
            timestamp: Date.now(),
        };
    }

    /**
     * 获取当前快照（同步版本）
     * @returns 快照或 null（如果尚未更新）
     */
    public getSnapshotSync(): GameStateSnapshot | null {
        return this.snapshot;
    }

    /**
     * 获取当前快照 (已废弃，保留向后兼容)
     * @deprecated 请使用 getSnapshotSync() 代替
     *             异步版本不再自动刷新，直接返回当前快照
     * @returns 游戏状态快照
     */
    public async getSnapshot(): Promise<GameStateSnapshot> {
        logger.warn("[GameStateManager] getSnapshot() 已废弃，请使用 getSnapshotSync()");
        if (!this.snapshot) {
            return this.refreshSnapshot();
        }
        return this.snapshot;
    }

    /**
     * 检查快照是否存在
     */
    public hasSnapshot(): boolean {
        return this.snapshot !== null;
    }

    /**
     * 清除当前快照
     * @description 在阶段切换时调用，强制下次获取时重新扫描
     */
    public clearSnapshot(): void {
        this.snapshot = null;
        logger.debug("[GameStateManager] 快照已清除");
    }

    // ============================================================================
    // 便捷 Getter（直接从快照读取）
    // ============================================================================

    /**
     * 获取备战席棋子
     * @returns 备战席棋子数组，如果快照不存在返回空数组
     */
    public getBenchUnits(): (BenchUnit | null)[] {
        return this.snapshot?.benchUnits ?? [];
    }

    /**
     * 获取棋盘棋子
     * @returns 棋盘棋子数组，如果快照不存在返回空数组
     */
    public getBoardUnits(): (BoardUnit | null)[] {
        return this.snapshot?.boardUnits ?? [];
    }

    /**
     * 获取商店棋子
     * @returns 商店棋子数组，如果快照不存在返回空数组
     */
    public getShopUnits(): (TFTUnit | null)[] {
        return this.snapshot?.shopUnits ?? [];
    }

    /**
     * 获取装备栏装备
     * @returns 装备数组，如果快照不存在返回空数组
     */
    public getEquipments(): IdentifiedEquip[] {
        return this.snapshot?.equipments ?? [];
    }

    /**
     * 获取当前等级
     * @returns 当前人口等级
     */
    public getLevel(): number {
        return this.currentLevel;
    }

    /**
     * 获取当前金币
     * @returns 金币数量，如果快照不存在返回 0
     */
    public getGold(): number {
        return this.snapshot?.gold ?? 0;
    }

    /**
     * 获取备战席空位数量
     * @returns 空位数量 (0-9)
     * @description 备战席共 9 个槽位，遍历统计 null（空槽）的数量
     *              TftOperator 扫描备战席时，空槽位会返回 null
     */
    public getEmptyBenchSlotCount(): number {
        const benchUnits = this.getBenchUnits();
        // 使用 filter 统计 null 的数量，更简洁
        return benchUnits.filter(unit => unit === null).length;
    }

    /**
     * 获取当前经验值信息
     * @returns 经验值对象 { current, total }
     */
    public getXpInfo(): { current: number; total: number } {
        return {
            current: this.snapshot?.currentXp ?? 0,
            total: this.snapshot?.totalXp ?? 0,
        };
    }

    /**
     * 获取所有已拥有的棋子名称（备战席 + 棋盘）
     * @returns 棋子名称集合
     */
    public getOwnedChampionNames(): Set<ChampionKey> {
        const names = new Set<ChampionKey>();

        // 备战席
        for (const unit of this.getBenchUnits()) {
            if (unit?.tftUnit) {
                names.add(unit.tftUnit.displayName as ChampionKey);
            }
        }

        // 棋盘
        for (const unit of this.getBoardUnits()) {
            if (unit?.tftUnit) {
                names.add(unit.tftUnit.displayName as ChampionKey);
            }
        }

        return names;
    }

    /**
     * 获取所有可见棋子名称（备战席 + 棋盘 + 商店）
     * @returns 棋子名称集合
     */
    public getAllVisibleChampionNames(): Set<ChampionKey> {
        const names = this.getOwnedChampionNames();

        // 商店
        for (const unit of this.getShopUnits()) {
            if (unit) {
                names.add(unit.displayName as ChampionKey);
            }
        }

        return names;
    }

    /**
     * 获取指定棋子的 1 星数量（备战席 + 棋盘）
     * @param championName 棋子名称
     * @returns 1 星棋子的数量
     * @description 用于判断购买后是否能升星
     *              TFT 合成规则：3 个 1 星 → 1 个 2 星，3 个 2 星 → 1 个 3 星
     *              所以如果已有 2 个 1 星，再买 1 个就能升 2 星
     */
    public getOneStarChampionCount(championName: string): number {
        let count = 0;

        // 统计备战席
        for (const unit of this.getBenchUnits()) {
            if (unit?.tftUnit?.displayName === championName && unit.starLevel === 1) {
                count++;
            }
        }

        // 统计棋盘
        for (const unit of this.getBoardUnits()) {
            if (unit?.tftUnit?.displayName === championName && unit.starLevel === 1) {
                count++;
            }
        }

        return count;
    }

    /**
     * 判断购买指定棋子后是否能升星
     * @param championName 棋子名称
     * @returns 是否能升星（true = 买了能升星，不占额外格子）
     * @description 如果已有 2 个 1 星同名棋子，买第 3 个会自动合成 2 星
     *              这种情况下即使备战席满了也可以购买
     */
    public canUpgradeAfterBuy(championName: string): boolean {
        const oneStarCount = this.getOneStarChampionCount(championName);
        // 已有 2 个 1 星，买第 3 个会升 2 星
        return oneStarCount >= 2;
    }

    /**
     * 查找指定棋子的 1 星位置信息
     * @param championName 棋子名称
     * @returns 所有 1 星棋子的位置数组，包含位置类型（bench/board）和索引
     * @description 用于购买后更新状态时，确定哪些棋子会参与合成
     *              TFT 合成规则：优先合成场上的棋子，备战席按从左到右顺序
     */
    public findOneStarChampionPositions(championName: string): Array<{
        location: 'bench' | 'board';
        index: number;
    }> {
        const positions: Array<{ location: 'bench' | 'board'; index: number }> = [];

        // 先找棋盘上的（场上棋子优先参与合成）
        const boardUnits = this.getBoardUnits();
        for (let i = 0; i < boardUnits.length; i++) {
            const unit = boardUnits[i];
            if (unit?.tftUnit?.displayName === championName && unit.starLevel === 1) {
                positions.push({ location: 'board', index: i });
            }
        }

        // 再找备战席的（从左到右，索引小的先参与合成）
        const benchUnits = this.getBenchUnits();
        for (let i = 0; i < benchUnits.length; i++) {
            const unit = benchUnits[i];
            if (unit?.tftUnit?.displayName === championName && unit.starLevel === 1) {
                positions.push({ location: 'bench', index: i });
            }
        }

        return positions;
    }

    /**
     * 获取备战席第一个空位的索引
     * @returns 空位索引 (0-8)，如果没有空位返回 -1
     * @description 购买棋子后，新棋子会放到备战席最左边的空位
     */
    public getFirstEmptyBenchSlotIndex(): number {
        const benchUnits = this.getBenchUnits();
        for (let i = 0; i < benchUnits.length; i++) {
            if (benchUnits[i] === null) {
                return i;
            }
        }
        return -1; // 没有空位
    }

    /**
     * 更新备战席指定槽位为空
     * @param index 槽位索引 (0-8)
     * @description 当棋子被合成消耗时，需要将对应槽位标记为空
     *              直接修改快照中的 benchUnits 数组
     */
    public setBenchSlotEmpty(index: number): void {
        if (!this.snapshot) {
            logger.warn("[GameStateManager] 快照不存在，无法更新备战席");
            return;
        }

        if (index < 0 || index >= this.snapshot.benchUnits.length) {
            logger.warn(`[GameStateManager] 无效的备战席索引: ${index}`);
            return;
        }

        const oldUnit = this.snapshot.benchUnits[index];
        this.snapshot.benchUnits[index] = null;

        logger.debug(
            `[GameStateManager] 备战席槽位 ${index} 已清空` +
            (oldUnit?.tftUnit ? ` (原: ${oldUnit.tftUnit.displayName})` : '')
        );
    }

    /**
     * 设置备战席指定槽位的棋子
     * @param index 槽位索引 (0-8)
     * @param unit 要放置的棋子
     * @description 购买棋子后，将新棋子放入备战席指定槽位
     */
    public setBenchSlotUnit(index: number, unit: BenchUnit): void {
        if (!this.snapshot) {
            logger.warn("[GameStateManager] 快照不存在，无法设置棋子");
            return;
        }

        if (index < 0 || index >= this.snapshot.benchUnits.length) {
            logger.warn(`[GameStateManager] 无效的备战席索引: ${index}`);
            return;
        }

        this.snapshot.benchUnits[index] = unit;

        logger.debug(
            `[GameStateManager] 备战席槽位 ${index} 已放置: ` +
            `${unit.tftUnit.displayName} ${unit.starLevel}★`
        );
    }

    /**
     * 更新备战席指定槽位的棋子星级
     * @param index 槽位索引 (0-8)
     * @param newStarLevel 新的星级
     * @description 当棋子升星时，更新对应槽位的星级
     */
    public updateBenchSlotStarLevel(index: number, newStarLevel: -1 | 1 | 2 | 3 | 4): void {
        if (!this.snapshot) {
            logger.warn("[GameStateManager] 快照不存在，无法更新星级");
            return;
        }

        const unit = this.snapshot.benchUnits[index];
        if (!unit) {
            logger.warn(`[GameStateManager] 备战席槽位 ${index} 为空，无法更新星级`);
            return;
        }

        const oldStarLevel = unit.starLevel;
        unit.starLevel = newStarLevel;

        logger.debug(
            `[GameStateManager] 备战席槽位 ${index} 星级更新: ` +
            `${unit.tftUnit?.displayName} ${oldStarLevel}★ → ${newStarLevel}★`
        );
    }

    /**
     * 更新棋盘指定槽位的棋子星级
     * @param index 槽位索引 (0-27)
     * @param newStarLevel 新的星级
     * @description 当场上棋子升星时，更新对应槽位的星级
     */
    public updateBoardSlotStarLevel(index: number, newStarLevel: -1 | 1 | 2 | 3 | 4): void {
        if (!this.snapshot) {
            logger.warn("[GameStateManager] 快照不存在，无法更新星级");
            return;
        }

        const unit = this.snapshot.boardUnits[index];
        if (!unit) {
            logger.warn(`[GameStateManager] 棋盘槽位 ${index} 为空，无法更新星级`);
            return;
        }

        const oldStarLevel = unit.starLevel;
        unit.starLevel = newStarLevel;

        logger.debug(
            `[GameStateManager] 棋盘槽位 ${index} 星级更新: ` +
            `${unit.tftUnit?.displayName} ${oldStarLevel}★ → ${newStarLevel}★`
        );
    }

    /**
     * 更新商店指定槽位为空（已购买）
     * @param index 槽位索引 (0-4)
     * @description 购买棋子后，将商店对应槽位标记为空
     */
    public setShopSlotEmpty(index: number): void {
        if (!this.snapshot) {
            logger.warn("[GameStateManager] 快照不存在，无法更新商店");
            return;
        }

        if (index < 0 || index >= this.snapshot.shopUnits.length) {
            logger.warn(`[GameStateManager] 无效的商店索引: ${index}`);
            return;
        }

        const oldUnit = this.snapshot.shopUnits[index];
        this.snapshot.shopUnits[index] = null;

        logger.debug(
            `[GameStateManager] 商店槽位 ${index} 已清空` +
            (oldUnit ? ` (原: ${oldUnit.displayName})` : '')
        );
    }

    /**
     * 扣减金币
     * @param amount 扣减数量
     * @description 购买棋子后更新金币数量
     */
    public deductGold(amount: number): void {
        if (!this.snapshot) {
            logger.warn("[GameStateManager] 快照不存在，无法扣减金币");
            return;
        }

        const oldGold = this.snapshot.gold;
        this.snapshot.gold = Math.max(0, this.snapshot.gold - amount);

        logger.debug(`[GameStateManager] 金币扣减: ${oldGold} - ${amount} = ${this.snapshot.gold}`);
    }

    // ============================================================================
    // 游戏进程管理
    // ============================================================================

    /**
     * 获取游戏进程信息
     */
    public getProgress(): GameProgress {
        return { ...this.progress };
    }

    /**
     * 更新当前阶段
     * @param stage 阶段字符串 (如 "2-1")
     * @param stageType 阶段类型
     */
    public updateStage(stage: string, stageType: GameStageType): void {
        this.progress.currentStage = stage;
        this.progress.currentStageType = stageType;

        // 检测第一个 PVP 阶段
        if (stageType === GameStageType.PVP && !this.progress.hasFirstPvpOccurred) {
            this.progress.hasFirstPvpOccurred = true;
            logger.info("[GameStateManager] 检测到第一个 PVP 阶段");
        }
    }

    /**
     * 标记游戏开始
     */
    public startGame(): void {
        this.progress.isGameRunning = true;
        this.progress.gameStartTime = Date.now();
        logger.info("[GameStateManager] 游戏开始");
    }

    /**
     * 标记游戏结束
     */
    public endGame(): void {
        this.progress.isGameRunning = false;
        logger.info("[GameStateManager] 游戏结束");
    }

    /**
     * 检查游戏是否正在进行
     */
    public isGameRunning(): boolean {
        return this.progress.isGameRunning;
    }

    /**
     * 检查是否已经过了第一个 PVP 阶段
     */
    public hasFirstPvpOccurred(): boolean {
        return this.progress.hasFirstPvpOccurred;
    }

    // ============================================================================
    // 棋盘状态查询
    // ============================================================================

    /**
     * 获取当前棋盘上的棋子数量
     * @returns 棋盘上非空槽位的数量
     * @description 用于判断是否需要上更多棋子
     *              棋盘最大容量 = 玩家等级
     */
    public getBoardUnitCount(): number {
        const boardUnits = this.getBoardUnits();
        return boardUnits.filter(unit => unit !== null).length;
    }

    /**
     * 获取棋盘空位数量
     * @returns 棋盘上空槽位的数量
     * @description 棋盘共 28 个槽位 (4行 x 7列)
     *              但实际可用数量受等级限制
     */
    public getEmptyBoardSlotCount(): number {
        const boardUnits = this.getBoardUnits();
        return boardUnits.filter(unit => unit === null).length;
    }

    /**
     * 获取可以再上场的棋子数量
     * @returns 当前等级下还能上场多少棋子
     * @description 计算公式: 等级 - 当前棋盘棋子数
     *              如果返回 0 或负数，说明已满员或超员
     */
    public getAvailableBoardSlots(): number {
        const level = this.getLevel();
        const currentCount = this.getBoardUnitCount();
        return Math.max(0, level - currentCount);
    }

    /**
     * 获取备战席上的非空棋子列表（带索引）
     * @returns 包含棋子信息和索引的数组
     * @description 用于遍历备战席上的棋子，决定哪些应该上场
     */
    public getBenchUnitsWithIndex(): Array<{ unit: BenchUnit; index: number }> {
        const result: Array<{ unit: BenchUnit; index: number }> = [];
        const benchUnits = this.getBenchUnits();
        
        for (let i = 0; i < benchUnits.length; i++) {
            const unit = benchUnits[i];
            if (unit !== null) {
                result.push({ unit, index: i });
            }
        }
        
        return result;
    }

    /**
     * 获取棋盘上的非空棋子列表（带位置）
     * @returns 包含棋子信息的数组
     * @description 用于遍历棋盘上的棋子，分析当前站位
     */
    public getBoardUnitsWithLocation(): BoardUnit[] {
        const boardUnits = this.getBoardUnits();
        return boardUnits.filter((unit): unit is BoardUnit => unit !== null);
    }

    /**
     * 获取棋盘上的空位列表
     * @returns 空位的 BoardLocation 数组
     * @description 返回所有空槽位的位置标识（如 "R1_C1"）
     */
    public getEmptyBoardLocations(): BoardLocation[] {
        const boardUnits = this.getBoardUnits();
        const emptyLocations: BoardLocation[] = [];
        const boardLocationKeys = Object.keys(fightBoardSlotPoint) as BoardLocation[];
        
        for (let i = 0; i < boardUnits.length && i < boardLocationKeys.length; i++) {
            if (boardUnits[i] === null) {
                emptyLocations.push(boardLocationKeys[i]);
            }
        }
        
        return emptyLocations;
    }

    /**
     * 获取前排空位列表
     * @returns 前排（R1, R2）的空位 BoardLocation 数组
     * @description 前排适合放置近战棋子（射程 1-2）
     */
    public getFrontRowEmptyLocations(): BoardLocation[] {
        return this.getEmptyBoardLocations().filter(loc => 
            loc.startsWith('R1_') || loc.startsWith('R2_')
        );
    }

    /**
     * 获取后排空位列表
     * @returns 后排（R3, R4）的空位 BoardLocation 数组
     * @description 后排适合放置远程棋子（射程 3+）
     */
    public getBackRowEmptyLocations(): BoardLocation[] {
        return this.getEmptyBoardLocations().filter(loc => 
            loc.startsWith('R3_') || loc.startsWith('R4_')
        );
    }

    // ============================================================================
    // 重置
    // ============================================================================

    /**
     * 重置所有状态
     * @description 在游戏结束或停止时调用，清理所有状态，准备下一局
     */
    public reset(): void {
        // 清除快照
        this.snapshot = null;

        // 重置等级
        this.currentLevel = 1;

        // 重置游戏进程
        this.progress = {
            currentStage: "",
            currentStageType: GameStageType.UNKNOWN,
            hasFirstPvpOccurred: false,
            isGameRunning: false,
            gameStartTime: 0,
        };

        logger.info("[GameStateManager] 游戏状态已重置，准备下一局");
    }
}

// ============================================================================
// 导出单例实例
// ============================================================================

/** GameStateManager 单例实例 */
export const gameStateManager = GameStateManager.getInstance();
