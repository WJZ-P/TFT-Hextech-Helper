/**
 * 游戏状态管理器
 * @module GameStateManager
 * @description 单例模式，负责管理和缓存当前游戏的所有状态数据
 *              包括备战席、棋盘、商店、装备、等级、金币等信息
 * 
 * 设计理念：
 * - 统一管理游戏状态，避免多处重复扫描
 * - 提供快照机制，每阶段开始时刷新一次
 * - 支持游戏结束后重置，准备下一局
 */

import { tftOperator, BenchUnit, BoardUnit, IdentifiedEquip } from "../TftOperator";
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
 * @description 集中管理本局游戏的所有状态数据
 * 
 * 使用方式：
 * ```typescript
 * const manager = GameStateManager.getInstance();
 * 
 * // 刷新快照（每阶段开始时调用）
 * await manager.refreshSnapshot();
 * 
 * // 获取状态数据
 * const snapshot = manager.getSnapshot();
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
     * 刷新游戏状态快照
     * @description 扫描备战席、棋盘、商店、装备栏等，缓存到快照
     *              每个阶段开始时调用一次，后续决策直接读取缓存
     * 
     * 注意：getBenchInfo 和 getFightBoardInfo 需要操作鼠标（右键点击棋子），
     *       所以这两个必须串行执行，不能并行！
     * 
     * @returns 刷新后的快照
     */
    public async refreshSnapshot(): Promise<GameStateSnapshot> {
        logger.info("[GameStateManager] 开始刷新游戏状态快照...");
        
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
        
        // 3. 更新人口等级（独立追踪）
        if (levelInfo && levelInfo.level !== this.currentLevel) {
            logger.info(`[GameStateManager] 人口变化: ${this.currentLevel} -> ${levelInfo.level}`);
            this.currentLevel = levelInfo.level;
        }
        
        // 4. 构建快照对象
        this.snapshot = {
            benchUnits,
            boardUnits,
            shopUnits,
            equipments,
            level: levelInfo?.level ?? this.currentLevel,
            currentXp: levelInfo?.currentXp ?? 0,
            totalXp: levelInfo?.totalXp ?? 0,
            gold: gold ?? 0,
            timestamp: Date.now(),
        };
        
        // 5. 统计日志
        const benchCount = benchUnits.filter(u => u !== null).length;
        const boardCount = boardUnits.filter(u => u !== null).length;
        const shopCount = shopUnits.filter(u => u !== null).length;
        
        logger.info(
            `[GameStateManager] 快照刷新完成: ` +
            `备战席 ${benchCount}/9, 棋盘 ${boardCount}/28, 商店 ${shopCount}/5, ` +
            `装备 ${equipments.length} 件, 等级 Lv.${this.snapshot.level}, 金币 ${this.snapshot.gold}`
        );
        
        return this.snapshot;
    }

    /**
     * 获取当前快照
     * @description 如果快照不存在，会自动刷新
     * @returns 游戏状态快照
     */
    public async getSnapshot(): Promise<GameStateSnapshot> {
        if (!this.snapshot) {
            return this.refreshSnapshot();
        }
        return this.snapshot;
    }

    /**
     * 获取当前快照（同步版本，不自动刷新）
     * @returns 快照或 null（如果尚未刷新）
     */
    public getSnapshotSync(): GameStateSnapshot | null {
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
