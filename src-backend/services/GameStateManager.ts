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

import { BenchUnit, BoardUnit, IdentifiedEquip } from "../TftOperator";
import { logger } from "../utils/Logger";
import { TFTUnit, GameStageType } from "../TFTProtocol";

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

    private constructor() {}

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
    public getOwnedChampionNames(): Set<string> {
        const names = new Set<string>();
        
        // 备战席
        for (const unit of this.getBenchUnits()) {
            if (unit?.tftUnit) {
                names.add(unit.tftUnit.displayName);
            }
        }
        
        // 棋盘
        for (const unit of this.getBoardUnits()) {
            if (unit?.tftUnit) {
                names.add(unit.tftUnit.displayName);
            }
        }
        
        return names;
    }

    /**
     * 获取所有可见棋子名称（备战席 + 棋盘 + 商店）
     * @returns 棋子名称集合
     */
    public getAllVisibleChampionNames(): Set<string> {
        const names = this.getOwnedChampionNames();
        
        // 商店
        for (const unit of this.getShopUnits()) {
            if (unit) {
                names.add(unit.displayName);
            }
        }
        
        return names;
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
