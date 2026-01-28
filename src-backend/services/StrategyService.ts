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
import {
    TFTUnit,
    GameStageType,
    fightBoardSlotPoint,
    getChampionRange,
    ChampionKey,
    ShopSlotIndex,
    TFT_16_EQUIP_DATA,
    EquipKey,
    sharedDraftPoint,
    hexSlot,
    TFTMode,
    clockworkTrailsFightButtonPoint,
} from "../TFTProtocol";
import {gameStateManager} from "./GameStateManager";
import {gameStageMonitor, GameStageEvent} from "./GameStageMonitor";
import {settingsStore} from "../utils/SettingsStore";
import {lineupLoader} from "../lineup";
import {LineupConfig, StageConfig, ChampionConfig} from "../lineup/LineupTypes";
import {mouseController, MouseButtonType, BenchUnit, BenchLocation, BoardUnit, BoardLocation} from "../tft";
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
 * 购买结果枚举
 * @description 用于区分购买行为的不同结果
 */
enum BuyResult {
    /** 成功购买了至少一个棋子 */
    BOUGHT = "BOUGHT",
    /** 商店没有想买的棋子 */
    NOTHING_TO_BUY = "NOTHING_TO_BUY",
    /** 备战席已满，无法购买（卖棋子也腾不出位置） */
    BENCH_FULL = "BENCH_FULL",
}

/**
 * 单次购买结果枚举（内部使用）
 * @description 用于 buyAndUpdateState 返回更详细的购买结果
 */
enum SingleBuyResult {
    /** 购买成功 */
    SUCCESS = "SUCCESS",
    /** 金币不足 */
    NOT_ENOUGH_GOLD = "NOT_ENOUGH_GOLD",
    /** 备战席已满（卖棋子也腾不出位置） */
    BENCH_FULL = "BENCH_FULL",
    /** 其他失败原因 */
    FAILED = "FAILED",
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

    /**
     * 游戏是否已结束
     * @description 当收到 TFT_BATTLE_PASS 事件（玩家死亡）时设为 true
     *              此时虽然游戏窗口还开着，但玩家已经无法操作
     *              其他玩家可能还在游戏，会触发新阶段事件，但我们不应该响应
     *              在 initialize() 时会重置为 false（每局开始时重新初始化）
     */
    private isGameEnded: boolean = false;

    /**
     * 当前游戏模式
     * @description 用于区分不同模式的策略逻辑：
     *              - NORMAL/RANK：普通模式，执行完整的自动下棋策略
     *              - CLOCKWORK_TRAILS：发条鸟模式，执行速通刷经验策略
     */
    private gameMode: TFTMode = TFTMode.NORMAL;

    /**
     * 事件处理器引用（⚠️ 必须缓存同一个函数引用，才能在 unsubscribe 时成功 off）
     * @description
     * - EventEmitter 的 on/off 是按"函数引用"匹配的
     * - 如果每次都写 this.onStageChange.bind(this)，会生成新函数 → off 失败
     */
    private readonly onStageChangeHandler: (event: GameStageEvent) => void;
    private readonly onFightingStartHandler: () => void;

    private constructor() {
        // 缓存绑定后的 handler，确保 subscribe/unsubscribe 用的是同一个引用
        this.onStageChangeHandler = this.onStageChange.bind(this);
        this.onFightingStartHandler = this.onFightingStart.bind(this);
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

        // 订阅阶段变化事件（使用缓存的 handler 引用，便于取消订阅）
        gameStageMonitor.on('stageChange', this.onStageChangeHandler);

        // 订阅战斗阶段开始事件
        gameStageMonitor.on('fightingStart', this.onFightingStartHandler);


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

        // 注意：off 必须传入 subscribe 时的同一个函数引用
        gameStageMonitor.off('stageChange', this.onStageChangeHandler);
        gameStageMonitor.off('fightingStart', this.onFightingStartHandler);


        this.isSubscribed = false;
        logger.info("[StrategyService] 已取消订阅 GameStageMonitor 事件");
    }

    /**
     * 标记游戏已结束
     * @description 当收到 TFT_BATTLE_PASS 事件（玩家死亡）时调用
     *              设置后，onStageChange 将不再响应新阶段事件
     *              避免在等待退出按钮期间，因其他玩家触发的新阶段而执行操作
     */
    public setGameEnded(): void {
        this.isGameEnded = true;
        logger.info("[StrategyService] 游戏已标记为结束，后续阶段事件将被忽略");
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
        // 游戏已结束（玩家已死亡），忽略后续阶段事件
        // 避免在等待退出按钮期间，因其他玩家触发的新阶段而执行操作
        if (this.isGameEnded) {
            logger.debug(`[StrategyService] 游戏已结束，忽略阶段事件: ${event.stageText}`);
            return;
        }

        const {type, stageText, stage, round, isNewStage} = event;

        // 更新当前阶段/回合
        this.currentStage = stage;
        this.currentRound = round;

        // ====== 发条鸟模式：走专用的速通逻辑 ======
        if (this.gameMode === TFTMode.CLOCKWORK_TRAILS) {
            await this.handleClockworkTrailsStage(stage, round);
            return; // 发条鸟模式不走普通逻辑
        }

        // ====== 以下是普通模式（匹配/排位）的处理逻辑 ======

        // 确保已初始化
        if (this.selectionState === LineupSelectionState.NOT_INITIALIZED) {
            const success = this.initialize(this.gameMode);
            if (!success) {
                logger.error("[StrategyService] 策略服务未初始化，跳过执行");
                return;
            }
        }

        // 等待，让游戏画面稳定，再进行后续操作（如 UI 识别、购买等）
        await sleep(500);

        // 【2-1 回合】阵容匹配：在进入 2-1 时锁定阵容
        // 放在 onStageChange 而不是 handleAugment，原因：
        // - 阵容匹配是"进入 2-1"时的决策，跟"海克斯选择"是两件独立的事
        // - 这样 handleAugment 可以根据已锁定的阵容来选择合适的海克斯
        if (stage === 2 && round === 1 && this.selectionState === LineupSelectionState.PENDING) {
            logger.info("[StrategyService] 检测到 2-1 回合，开始阵容匹配...");
            await this.matchAndLockLineup();
        }

        // 刷新游戏状态（采集所有数据，包括等级、商店、棋盘等）
        // 注意：部分阶段不需要在这里刷新，由各自的 handler 自行决定
        if (this.shouldRefreshStateOnStageChange(type)) {
            await this.refreshGameState();
        }

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
        // 游戏已结束，忽略战斗事件
        if (this.isGameEnded) {
            logger.debug("[StrategyService] 游戏已结束，忽略战斗开始事件");
            return;
        }

        // 发条鸟模式：战斗阶段不需要做任何事情，等死就行
        if (this.gameMode === TFTMode.CLOCKWORK_TRAILS) {
            logger.debug("[StrategyService] 发条鸟模式：战斗阶段无需处理，等待死亡...");
            return;
        }

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
     * 判断：进入新回合时是否应该刷新游戏状态
     * @param stageType 阶段类型
     * @returns 是否应该刷新
     *
     * @description
     * 以下情况 **不需要** 在 onStageChange 里刷新状态：
     * - EARLY_PVE 的 1-1、1-2：商店未开放，没有什么可识别的
     * - CAROUSEL（选秀）：界面完全不同，刷新无意义
     * - AUGMENT（海克斯）：界面被三个海克斯挡住，必须先选完再刷新
     *   （handleAugment 内部会自行调用 refreshGameState）
     */
    private shouldRefreshStateOnStageChange(stageType: GameStageType): boolean {
        // 1-1、1-2 回合：商店未开放，不需要刷新
        if (stageType === GameStageType.EARLY_PVE && this.currentStage === 1 && this.currentRound <= 2) {
            logger.debug(`[StrategyService] 跳过刷新：EARLY_PVE 1-${this.currentRound}（商店未开放）`);
            return false;
        }

        // 选秀阶段：界面完全不同，不需要刷新
        if (stageType === GameStageType.CAROUSEL) {
            logger.debug("[StrategyService] 跳过刷新：CAROUSEL（选秀阶段）");
            return false;
        }

        // 海克斯阶段：界面被海克斯选项挡住，由 handleAugment 自行刷新
        if (stageType === GameStageType.AUGMENT) {
            logger.debug("[StrategyService] 跳过刷新：AUGMENT（海克斯阶段，由 handler 自行刷新）");
            return false;
        }

        // 其他阶段：正常刷新
        return true;
    }

    /**
     * 获取当前阶段类型
     * @description
     * 这里直接读 `GameStageMonitor` 的缓存值，因为它是全局轮询的"最新真值"。
     */
    private getCurrentStageType(): GameStageType {
        return gameStageMonitor.currentStageType;
    }

    /**
     * 判断：某个"装备栏物品"是否是真正可穿戴的装备
     * @description
     * TFT 的装备栏里可能出现一些"特殊道具"，它们并不是给棋子穿的：
     * - 装备拆卸器：对目标棋子使用后，会把身上装备全部拆下来回到装备栏
     * - 金质装备拆卸器：同上，但可无限次使用
     * - 装备重铸器：对目标棋子使用后，会把身上装备全部重铸并回到装备栏
     *
     * 这类道具当前版本暂不支持自动使用（风险较高，容易误操作），因此先在装备策略里跳过。
     *
     * TODO: 实现特殊道具的使用策略（拆卸器/金拆/重铸器等），并加入更严格的目标选择与安全保护。
     */
    private isWearableEquipmentName(itemName: string): boolean {
        const data = TFT_16_EQUIP_DATA[itemName as EquipKey];

        // 未知物品：为了安全，默认按"不可穿戴"处理，避免误把道具当装备拖到棋子身上。
        if (!data) {
            return false;
        }

        // 当前协议里 specialEquip 统一用 equipId = "-1" 标记（例如：装备拆卸器/重铸器/强化果实/复制器等）
        // 这些都不是"穿上去就生效"的传统装备。
        if (data.equipId === "-1") {
            return false;
        }

        return true;
    }

    /**
     * 推断：装备更适合"前排"还是"后排"
     * @description
     * 我们没有直接的"装备类型标签"（坦装/输出装），但可以利用 `TFT_16_EQUIP_DATA.formula`：
     * - 基础散件：formula 为空
     * - 成装：formula 是 "散件ID1,散件ID2"
     *
     * 基于散件做一个非常粗粒度的启发式（足够让"随便上装备"变得更像人）：
     * - 反曲之弓/暴风之剑/无用大棒/女神之泪 → 倾向后排（输出/攻速/法强/回蓝）
     * - 锁子甲/负极斗篷/巨人腰带 → 倾向前排（抗性/血量）
     * - 拳套/金铲铲/金锅锅 → 偏中性（很多装备/转职比较灵活）
     *
     * TODO: 后续可以结合"阵容配置的前排/后排位"或"英雄定位(主C/主T)"做更准确的分配。
     */
    private getEquipmentRolePreference(itemName: string): 'frontline' | 'backline' | 'any' {
        const data = TFT_16_EQUIP_DATA[itemName as EquipKey];
        if (!data) return 'any';

        // 取组成它的散件名（成装取 2 个散件；散件本身返回自己）
        const componentNames = this.getComponentNamesOfItem(itemName);
        if (componentNames.length === 0) return 'any';

        const isFrontlineComponent = (name: string): boolean => {
            return name === '锁子甲' || name === '负极斗篷' || name === '巨人腰带';
        };

        const isBacklineComponent = (name: string): boolean => {
            return name === '反曲之弓' || name === '暴风之剑' || name === '无用大棒' || name === '女神之泪';
        };

        const isNeutralComponent = (name: string): boolean => {
            return name === '拳套' || name === '金铲铲' || name === '金锅锅';
        };

        // 只有一个散件（基础散件）时：直接按散件决定倾向
        if (componentNames.length === 1) {
            const c = componentNames[0];
            if (isFrontlineComponent(c)) return 'frontline';
            if (isBacklineComponent(c)) return 'backline';
            if (isNeutralComponent(c)) return 'any';
            return 'any';
        }

        // 两个散件（成装）时：
        // - 双防御散件 → 更像前排装
        // - 双输出散件 → 更像后排装
        // - 混搭 → 暂时按通用装处理（避免误导）
        const frontlineCount = componentNames.filter(isFrontlineComponent).length;
        const backlineCount = componentNames.filter(isBacklineComponent).length;

        if (frontlineCount === 2) return 'frontline';
        if (backlineCount === 2) return 'backline';

        // 混搭/含拳套/转职等，先按通用
        return 'any';
    }

    /**
     * 获取某件装备由哪些"基础散件"组成
     * @returns 散件名称数组：
     * - 基础散件：返回 [自身]
     * - 成装：返回 [散件1, 散件2]
     */
    private getComponentNamesOfItem(itemName: string): string[] {
        const equip = TFT_16_EQUIP_DATA[itemName as EquipKey];
        if (!equip) return [];

        const formula = (equip.formula ?? '').trim();
        if (!formula) {
            return [itemName];
        }

        const [id1, id2] = formula.split(',');
        const name1 = id1 ? this.findEquipNameById(id1) : undefined;
        const name2 = id2 ? this.findEquipNameById(id2) : undefined;

        return [name1, name2].filter((n): n is string => Boolean(n));
    }

    /**
     * 判断某个棋子是否符合装备倾向（这里用"射程"近似判断前排/后排）
     * - 近战(1-2) → 前排
     * - 远程(3+) → 后排
     */
    private doesUnitMatchEquipRole(unit: BoardUnit, role: 'frontline' | 'backline' | 'any'): boolean {
        if (role === 'any') return true;

        const name = unit.tftUnit.displayName;
        const range = getChampionRange(name) ?? 1;
        const isMelee = range <= 2;

        return role === 'frontline' ? isMelee : !isMelee;
    }

    /**
     * 为某件装备找一个"更合适"的穿戴目标（优先不影响核心装分配，其次按前排/后排倾向选人）
     */
    private findBestEquipmentTargetLocation(itemName: string, coreChampions: ChampionConfig[]): BoardLocation | null {
        const role = this.getEquipmentRolePreference(itemName);

        // 1) 优先走"核心/打工仔"逻辑（但会额外做一层前排/后排匹配）
        for (const config of coreChampions) {
            const wrapper = this.findUnitForEquipment(config.name, itemName);
            if (!wrapper) continue;
            if (wrapper.unit.equips.length >= 3) continue;

            if (this.doesUnitMatchEquipRole(wrapper.unit, role)) {
                return wrapper.unit.location;
            }
        }

        // 2) 退化：在全棋盘上按"装备倾向"挑一个最值钱（最强）的单位
        const boardUnits = gameStateManager.getBoardUnitsWithLocation().filter(u => u.equips.length < 3);
        if (boardUnits.length === 0) return null;

        const candidates = role === 'any'
            ? boardUnits
            : boardUnits.filter(u => this.doesUnitMatchEquipRole(u, role));

        const finalCandidates = candidates.length > 0 ? candidates : boardUnits;
        const targetChampions = this.targetChampionNames;

        let best: { location: BoardLocation; score: number } | null = null;
        for (const u of finalCandidates) {
            const score = this.calculateUnitScore(u.tftUnit, u.starLevel, targetChampions);
            if (!best || score > best.score) {
                best = { location: u.location, score };
            }
        }

        return best?.location ?? null;
    }

    /**
     * 判断：当前场上是否存在任意一个"核心棋子"
     * @returns 是否存在核心棋子
     *
     * @description
     * - "核心棋子"来自阵容配置（`ChampionConfig.items.core` 的那批）。
     * - 这个判断用于装备策略的触发门槛：
     *   - 有核心在场 → 可以更积极给核心做神装
     *   - 核心不在场 → 默认选择"捏装备"等核心，除非装备快满
     */
    private hasAnyCoreChampionOnBoard(): boolean {
        const coreChampions = this.getCoreChampions();
        if (coreChampions.length === 0) return false;

        const boardUnits = gameStateManager.getBoardUnitsWithLocation();
        if (boardUnits.length === 0) return false;

        const boardNames = new Set(boardUnits.map(u => u.tftUnit.displayName as ChampionKey));
        return coreChampions.some(c => boardNames.has(c.name));
    }

    /**
     * 判断：当前是否存在"可执行的上装备动作"
     * @param equipments 当前装备栏（紧凑数组，只包含真实装备）
     *
     * @description
     * 这是为了做"聪明闸门"：
     * - 你说得对：前期的打工仔（item holder）最后会卖掉，装备会回到装备栏。
     *   因此 **核心没到场时，也可以先把核心推荐装挂在打工仔身上**（保血/提速）。
     * - 但我们又不想每回合都"空跑"一遍装备策略，所以这里先做一次轻量判断：
     *   只要发现「能穿」或「能合成并穿」的动作，就允许进入 `executeEquipStrategy()`。
     */
    private canPerformAnyEquipOperation(equipments: IdentifiedEquip[]): { can: boolean; reason: string } {
        // =========================
        // 保前四的装备思路：
        // - 优先：如果能合出"核心推荐装/替代装"，就合成并立刻给（稳定提升战力）
        // - 其次：有散件就先挂到场上（打工仔也行），用即时战力换血量
        // =========================

        // 0) 过滤掉"特殊道具"（拆卸器/重铸器等），这些不属于可穿戴装备。
        const wearableEquipments = equipments.filter(e => this.isWearableEquipmentName(e.name));
        if (wearableEquipments.length === 0) {
            return { can: false, reason: "装备栏里没有可穿戴装备（可能全是拆卸器/重铸器等特殊道具）" };
        }

        // 1) 先检查是否存在"可上装备的单位"（⚠️ 目前只支持给棋盘单位穿装备）
        const boardUnits = gameStateManager.getBoardUnitsWithLocation();

        // 使用与"上棋/替换弱子"一致的价值评分（calculateUnitScore），挑选最值得挂装备的单位。
        // 这样后期即使 4/5 费棋子还没 2★，也不会被低费 2★长期压制而拿不到装备。
        const targetChampions = this.targetChampionNames;

        let equipableUnit: (typeof boardUnits)[number] | null = null;
        let bestScore = -Infinity;

        for (const u of boardUnits) {
            if (u.equips.length >= 3) continue;
            const score = this.calculateUnitScore(u.tftUnit, u.starLevel, targetChampions);
            if (!equipableUnit || score > bestScore) {
                equipableUnit = u;
                bestScore = score;
            }
        }

        if (!equipableUnit) {
            return { can: false, reason: "棋盘上没有可穿戴装备的单位（可能全员满装备/无单位）" };
        }

        // 2) 如果背包里有"散件"，就允许执行装备策略（散件先上，拉即时战力）
        //    这里用 formula 是否为空来粗略判断"基础散件"（暴风大剑/反曲弓/女神泪等）
        const component = wearableEquipments.find(e => {
            const data = TFT_16_EQUIP_DATA[e.name as EquipKey];
            return data && (data.formula ?? "") === "";
        });
        if (component) {
            return { can: true, reason: `存在散件可穿戴：${component.name} -> ${equipableUnit.tftUnit.displayName}` };
        }

        // 3) 再判断"能否合成/穿戴核心装"（没有核心配置时，直接跳过这一段）
        const coreChampions = this.getCoreChampions();
        if (coreChampions.length === 0) {
            return { can: false, reason: "阵容配置中没有核心棋子/核心装备配置" };
        }

        // 建立装备背包快照（模拟数量）
        const bagSnapshot = new Map<string, number>();
        for (const equip of equipments) {
            bagSnapshot.set(equip.name, (bagSnapshot.get(equip.name) || 0) + 1);
        }

        for (const config of coreChampions) {
            // 注意：这里复用 `findUnitForEquipment()`
            // - 核心在场 → 返回核心
            // - 核心不在场 → 返回打工仔（item holder）
            const targetWrapper = this.findUnitForEquipment(config.name);
            if (!targetWrapper) continue;

            // 装备已满（3件）就不考虑
            if (targetWrapper.unit.equips.length >= 3) continue;

            // 取推荐装备列表
            const desiredItems: string[] = [];
            if (config.items) {
                desiredItems.push(...config.items.core);
                if (config.items.alternatives) {
                    desiredItems.push(...config.items.alternatives);
                }
            }
            if (desiredItems.length === 0) continue;

            // 只要存在一个"能执行"的动作就放行
            for (const itemName of desiredItems) {
                const alreadyHas = targetWrapper.unit.equips.some(e => e.name === itemName);
                if (alreadyHas) continue;

                if ((bagSnapshot.get(itemName) || 0) > 0) {
                    return {
                        can: true,
                        reason: `存在可穿戴动作：${itemName} -> ${targetWrapper.isCore ? '核心' : '打工'}(${targetWrapper.unit.tftUnit.displayName})`,
                    };
                }

                const synthesis = this.checkSynthesis(itemName, bagSnapshot);
                if (synthesis) {
                    return {
                        can: true,
                        reason: `存在可合成动作：${itemName}(${synthesis.component1}+${synthesis.component2}) -> ${targetWrapper.isCore ? '核心' : '打工'}(${targetWrapper.unit.tftUnit.displayName})`,
                    };
                }
            }
        }

        return { can: false, reason: "当前没有可执行的上装备/合成动作" };
    }

    /**
     * 装备策略触发门槛
     * @returns should: 是否执行；reason: 便于日志排查的原因
     *
     * @description
     * 触发原则（更激进 / 保前四向）：
     * - 只要"不在战斗中"且"装备栏非空" → 就执行装备策略
     * - 原因：前期即使把散件/成装先挂到打工仔，也能显著提升即时战力，提高前四率
     *
     * 注意：装备拖拽是高风险操作，所以仍然严格禁止在战斗中执行。
     */
    private getEquipStrategyGateDecision(): { should: boolean; reason: string } {
        const stageType = this.getCurrentStageType();

        if (this.isFighting()) {
            return { should: false, reason: "战斗中" };
        }

        const rawEquipments = gameStateManager.getEquipments();
        if (rawEquipments.length === 0) {
            return { should: false, reason: "装备栏为空" };
        }

        // 过滤掉"特殊道具"（拆卸器/重铸器等），只对可穿戴装备执行策略。
        const equipments = rawEquipments.filter(e => this.isWearableEquipmentName(e.name));
        const skipped = rawEquipments.filter(e => !this.isWearableEquipmentName(e.name));

        if (equipments.length === 0) {
            const skippedHint = skipped.length > 0
                ? `（已跳过特殊道具: ${skipped.map(s => s.name).join(', ')}）`
                : "";
            return { should: false, reason: `装备栏无可穿戴装备${skippedHint}` };
        }

        return {
            should: true,
            reason: `可穿戴装备非空(${equipments.length})，激进策略：有装备就上（当前阶段=${stageType}）`,
        };
    }


    /**
     * 初始化策略服务
     * @param mode 游戏模式（匹配/排位/发条鸟）
     * @description 加载用户选中的阵容配置，准备执行策略
     *              - 发条鸟模式：不需要阵容，直接返回成功
     *              - 单阵容：直接锁定
     *              - 多阵容：进入 PENDING 状态，等待匹配
     * @returns 是否初始化成功
     */
    public initialize(mode: TFTMode = TFTMode.NORMAL): boolean {
        // 重置游戏结束标记（每局开始时重新初始化）
        this.isGameEnded = false;

        // 保存当前游戏模式
        this.gameMode = mode;
        logger.info(`[StrategyService] 初始化，游戏模式: ${mode}`);

        // 发条鸟模式：不需要阵容配置，直接初始化成功
        if (mode === TFTMode.CLOCKWORK_TRAILS) {
            this.selectionState = LineupSelectionState.LOCKED; // 标记为已锁定，避免后续检查
            logger.info("[StrategyService] 发条鸟模式：速通刷经验，无需阵容配置");
            return true;
        }

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
     * @description 根据人口等级获取目标棋子
     *
     * 策略说明：
     * - 目标棋子 = 当前等级及以上所有等级配置中的棋子（合并去重）
     * - 例如：4 级时，目标 = level4 + level5 + ... + level10 的所有棋子
     * - 升到 5 级时，目标 = level5 + level6 + ... + level10（剔除 level4 的低费打工仔）
     *
     * 这样随着等级提升，低费打工仔会被逐渐剔除，只保留当前等级及以上的目标棋子
     */
    private updateTargetChampions(level: number): void {
        if (!this.currentLineup) {
            this.targetChampionNames.clear();
            return;
        }

        // 清空旧的目标棋子
        this.targetChampionNames.clear();

        // 人口等级范围：4-10（配置文件中定义的等级）
        const validLevels = [4, 5, 6, 7, 8, 9, 10] as const;

        // 确定起始等级（最低 4 级，因为配置从 level4 开始）
        const startLevel = Math.max(level, 4);

        // 收集当前等级及以上所有等级的棋子
        for (const checkLevel of validLevels) {
            // 跳过低于当前等级的配置
            if (checkLevel < startLevel) continue;

            const stageKey = `level${checkLevel}` as keyof typeof this.currentLineup.stages;
            const stageConfig = this.currentLineup.stages[stageKey];

            if (stageConfig) {
                for (const champion of stageConfig.champions) {
                    this.targetChampionNames.add(champion.name);
                }
            }
        }
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
        logger.info("[StrategyService] PVE阶段：执行通用逻辑...");

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
        const scanInterval = 2000;

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

        // 2. 防挂机：持续随机走动
        // 说明：我们复用 antiAfk()，它内部会循环调用 `tftOperator.selfWalkAround()`，
        //      并在"战斗状态变化/回合变化"时自动退出循环，避免一直阻塞。
        await this.antiAfk();
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
     * 中断策略：
     * - 记录调用时的战斗状态（isFighting）
     * - 每次拾取前检查状态是否变化
     * - 状态变化时立即停止（无论是战斗→非战斗，还是非战斗→战斗）
     *
     * @returns 是否成功拾取了至少一个法球（用于判断是否需要重新执行装备策略）
     */
    private async pickUpLootOrbs(): Promise<boolean> {
        const sleepTime = 2500; //  每次点击之间的间隔时间

        // 记录调用时的战斗状态，用于检测状态变化
        const initialFightingState = this.isFighting();

        logger.info(`[StrategyService] 开始检测战利品球... (当前战斗状态: ${initialFightingState})`);

        // 1. 检测场上的战利品球
        const lootOrbs = await tftOperator.getLootOrbs();

        if (lootOrbs.length === 0) {
            logger.info("[StrategyService] 未检测到战利品球");
            return false;
        }

        logger.info(`[StrategyService] 检测到 ${lootOrbs.length} 个战利品球`);

        // 2. 按 X 坐标从左到右排序（最短路径：小小英雄默认在左下角）
        const sortedOrbs = [...lootOrbs].sort((a, b) => a.x - b.x);

        // 3. 依次拾取战利品球
        let pickedCount = 0;  // 记录成功拾取的数量

        for (const orb of sortedOrbs) {
            // 检查战斗状态是否发生变化
            // 无论是 战斗→非战斗 还是 非战斗→战斗，状态变了就停止拾取
            const currentFightingState = this.isFighting();
            if (currentFightingState !== initialFightingState) {
                logger.info(
                    `[StrategyService] 战斗状态变化 (${initialFightingState} → ${currentFightingState})，停止拾取`
                );
                break;
            }

            logger.info(`[StrategyService] 正在拾取 ${orb.type} 战利品球，位置: (${orb.x}, ${orb.y}), 等待 ${sleepTime}ms`);

            // 右键点击战利品球位置，小小英雄会自动移动过去拾取
            // mouseController.clickAt 接受的是游戏内相对坐标，orb.x/orb.y 正好是相对坐标
            await mouseController.clickAt({x: orb.x, y: orb.y}, MouseButtonType.RIGHT);

            // 等待小小英雄移动到目标位置并拾取
            await sleep(sleepTime);
            pickedCount++;
        }

        logger.info(`[StrategyService] 战利品拾取完成，共拾取 ${pickedCount} 个`);
        await tftOperator.selfResetPosition();

        return pickedCount > 0;
    }

    // ============================================================
    // 🤖 发条鸟模式专用处理器 (Clockwork Trails Mode)
    // ============================================================

    /**
     * 发条鸟模式阶段处理器
     * @param stage 阶段号
     * @param round 回合号
     * @description 发条鸟模式的速通刷经验策略：
     *              - 1-1 回合：卖掉备战席第一个棋子，然后点击右下角开始战斗按钮
     *              - 1-5 回合（选秀兜底）：如果意外打到了选秀，随机选一个棋子后点击战斗按钮
     *              - 其他回合：直接点击右下角开始战斗按钮
     *              - 战斗阶段：什么都不做，等待死亡
     *              - 死亡后自动退出，开始下一局
     */
    private async handleClockworkTrailsStage(stage: number, round: number): Promise<void> {
        logger.info(`[StrategyService] 发条鸟模式：阶段 ${stage}-${round}`);

        // 1-1 回合特殊处理：先卖掉备战席第一个棋子
        if (stage === 1 && round === 1) {
            await sleep(200);
            logger.info("[StrategyService] 发条鸟模式 1-1：卖掉备战席第一个棋子...");
            await tftOperator.sellUnit('SLOT_1');
            await sleep(50);
        }

        // 1-5 回合兜底处理：棋子没卖成功，意外打到了海克斯选择阶段
        // 操作：点击中间海克斯 → 等待动画 → 点击战斗按钮
        if (stage === 1 && round === 5) {
            logger.warn("[StrategyService] 发条鸟模式 1-5（兜底）：意外进入海克斯选择，开始处理...");

            // 1. 等待海克斯选项加载
            await sleep(800);

            // 2. 点击中间的海克斯槽位（SLOT_2）
            logger.info("[StrategyService] 发条鸟模式 1-5：点击中间海克斯 SLOT_2");
            await mouseController.clickAt(hexSlot.SLOT_2, MouseButtonType.LEFT);
            await sleep(200);
            // 点两次，怕点不上
            await mouseController.clickAt(hexSlot.SLOT_2, MouseButtonType.LEFT);

            // 3. 等待海克斯选择动画完成
            await sleep(500);

            // 4. 点击战斗按钮开始下一回合
            logger.info("[StrategyService] 发条鸟模式 1-5：海克斯选择完成，点击开始战斗按钮...");
            await mouseController.clickAt(clockworkTrailsFightButtonPoint, MouseButtonType.LEFT);
            return;
        }

        // 点击右下角的"开始战斗"按钮
        logger.info("[StrategyService] 发条鸟模式：点击开始战斗按钮...");
        await mouseController.clickAt(clockworkTrailsFightButtonPoint, MouseButtonType.LEFT);
    }

    // ============================================================
    // 🎮 普通模式阶段处理器 (Normal/Ranked Mode)
    // ============================================================

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
            return await this.antiAfk();
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
        // 小小英雄归位
        await tftOperator.selfResetPosition();

        // 1. 获取所有候选阵容的 level4 目标棋子（合并去重）
        const candidateTargets = this.getCandidateTargetChampions();
        const ownedChampions = gameStateManager.getOwnedChampionNames();

        logger.info(
            `[StrategyService] 前期策略 - 金币: ${gameStateManager.getGold()}，` +
            `备战席空位: ${gameStateManager.getEmptyBenchSlotCount()}，` +
            `已有棋子: ${Array.from(ownedChampions).join(', ') || '无'}，` +
            `候选目标: ${Array.from(candidateTargets).join(', ') || '无'}`
        );

        // 2. 执行自动购买
        await this.autoBuyFromShop(candidateTargets, "前期决策购买");

        // 3. 购买完成后，优化棋盘阵容（上棋子、替换）
        await this.optimizeBoard(candidateTargets);
    }

    /**
     * 检查是否已拥有指定棋子的 3 星版本
     */
    private hasThreeStarCopy(championName: string): boolean {
        // 检查棋盘
        for (const unit of gameStateManager.getBoardUnits()) {
            if (unit && unit.tftUnit.displayName === championName && unit.starLevel >= 3) {
                return true;
            }
        }
        // 检查备战席
        for (const unit of gameStateManager.getBenchUnits()) {
            if (unit && unit.tftUnit.displayName === championName && unit.starLevel >= 3) {
                return true;
            }
        }
        return false;
    }

    /**
     * 尝试卖出一个无用棋子单位（用于腾位置）
     * @param targetChampions 目标棋子集合
     * @returns 是否成功卖出
     */
    private async sellSingleTrashUnit(targetChampions: Set<ChampionKey>): Promise<boolean> {
        const benchUnits = gameStateManager.getBenchUnitsWithIndex();

        // 筛选可卖棋子：非目标、非对子、非核心
        const candidates = benchUnits.filter(({unit}) => {
            const name = unit.tftUnit.displayName as ChampionKey;
            // 目标棋子不卖
            if (targetChampions.has(name)) return false;
            // 对子不卖（除非迫不得已，这里先保守一点）
            if (gameStateManager.getOneStarChampionCount(name) >= 2) return false;
            return true;
        });

        if (candidates.length === 0) return false;

        // 按价格从低到高排序，优先卖便宜的
        candidates.sort((a, b) => a.unit.tftUnit.price - b.unit.tftUnit.price);

        const target = candidates[0];
        logger.info(`[StrategyService] 腾位置卖出: ${target.unit.tftUnit.displayName}`);

        await tftOperator.sellUnit(`SLOT_${target.index + 1}`);
        gameStateManager.setBenchSlotEmpty(target.index);
        gameStateManager.updateGold(gameStateManager.getGold() + target.unit.tftUnit.price);
        await sleep(100);

        return true;
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

            // 如果已经有 3 星了，就不买了
            if (this.hasThreeStarCopy(name)) {
                continue;
            }

            if (targetChampions.has(name)) {
                // 目标阵容棋子：必买
                targetIndices.push(slotIndex);
            } else if (ownedChampions.has(name)) {
                // 已有棋子：必买（可升星）
                ownedIndices.push(slotIndex);
            } else {
                // 非目标棋子：候选打工仔
                workerCandidates.push({index: slotIndex, price: unit.price});
            }
        }

        // 打工棋子按费用从高到低排序（高费战斗力强）
        workerCandidates.sort((a, b) => b.price - a.price);

        // 计算可以买多少个打工仔（只有场上有空位才买）
        // 注意：这里用 BoardSlots 来限制打工仔数量是合理的，因为打工仔最终是要上场的
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
            // 同步更新 GameStateManager 状态
            gameStateManager.moveBenchToBoard(unit.location, targetLocation);
            await sleep(200);
        }

        logger.info(`[StrategyService] 棋子摆放完成，共摆放 ${unitsToPlace.length} 个棋子`);
    }

    /**
     * 替换场上最弱的棋子
     * @param targetChampions 目标棋子集合
     * @description 用备战席价值更高的棋子替换场上价值最低的棋子
     *
     *              替换策略（保护目标阵容棋子，但优先回收装备）：
     *              1. 如果被换下的棋子身上有装备 → 卖掉（让装备回到装备栏）
     *              2. 备战席有空位且棋子无装备 → 把场上棋子移回备战席 → 新棋子上场
     *              3. 备战席没空位 → 卖掉场上棋子 → 新棋子上场
     */
    private async autoReplaceWeakestUnit(targetChampions: Set<ChampionKey>): Promise<void> {
        const benchUnits = gameStateManager.getBenchUnits().filter((u): u is BenchUnit => u !== null);
        if (benchUnits.length === 0) return;

        // 找棋盘最差的棋子
        const worstBoard = this.findWorstBoardUnit(targetChampions);
        if (!worstBoard) return;

        // 多样性优化：优先用"场上没有的棋子"去替换（避免重复上同名棋子）
        // 注意：如果把 `worstBoard` 位置的棋子换下去，那么它的名字可以从"禁止名单"里移除。
        const avoidChampionNames = new Set<ChampionKey>(
            gameStateManager.getBoardUnitsWithLocation().map(u => u.tftUnit.displayName as ChampionKey)
        );
        avoidChampionNames.delete(worstBoard.unit.tftUnit.displayName as ChampionKey);

        // 找备战席最好的棋子（优先避开场上已有的同名棋子；如果避开后一个都没有，再退化到原逻辑）
        const bestBench = this.findBestBenchUnit(benchUnits, targetChampions, avoidChampionNames);
        if (!bestBench) return;

        // 备战席棋子价值更高才替换
        if (bestBench.score > worstBoard.score) {
            const worstName = worstBoard.unit.tftUnit.displayName;
            const bestName = bestBench.unit.tftUnit.displayName;

            // 检查被换下的棋子是否带有装备
            const hasEquips = worstBoard.unit.equips && worstBoard.unit.equips.length > 0;

            // 检查备战席是否有空位
            const emptyBenchSlot = gameStateManager.getFirstEmptyBenchSlotIndex();
            const hasEmptyBenchSlot = emptyBenchSlot !== -1;

            // 决策：如果棋子带装备，必须卖掉让装备回到装备栏
            // 否则装备会卡在备战席棋子身上，不利于后续对战
            if (hasEquips) {
                // 棋子带装备，卖掉回收装备
                const equipNames = worstBoard.unit.equips!.map(e => e.name).join(', ');
                logger.info(
                    `[StrategyService] 替换(卖出回收装备): ${worstName}(${worstBoard.score}分) ` +
                    `[装备: ${equipNames}] -> ${bestName}(${bestBench.score}分) 上场`
                );

                await tftOperator.sellUnit(worstBoard.location);
                await sleep(500);
                // 卖掉带装备的棋子后，立即刷新装备栏状态
                // 因为装备已经回到装备栏了，需要同步更新 GameStateManager
                await this.updateEquipStateFromScreen();
                // 同步清空棋盘槽位状态
                gameStateManager.clearBoardLocation(worstBoard.location);
            } else if (hasEmptyBenchSlot) {
                // 方案 A：棋子无装备且备战席有空位，把场上棋子移回备战席（保护目标阵容棋子）
                logger.info(
                    `[StrategyService] 替换(保留): ${worstName}(${worstBoard.score}分) 移回备战席，` +
                    `${bestName}(${bestBench.score}分) 上场`
                );

                // 先把场上棋子移回备战席（参数是数字索引 0-8）
                await tftOperator.moveBoardToBench(worstBoard.location, emptyBenchSlot);
                // 同步更新 GameStateManager 状态
                gameStateManager.moveBoardToBench(worstBoard.location, emptyBenchSlot);
                await sleep(100);
            } else {
                // 方案 B：备战席没空位，只能卖掉
                logger.info(
                    `[StrategyService] 替换(卖出): ${worstName}(${worstBoard.score}分) ` +
                    `-> ${bestName}(${bestBench.score}分)`
                );

                await tftOperator.sellUnit(worstBoard.location);
                // 同步清空棋盘槽位状态
                gameStateManager.clearBoardLocation(worstBoard.location);
                await sleep(100);
            }

            // 根据新棋子的射程，找到最佳位置上场
            const targetLocation = this.findBestPositionForUnit(bestBench.unit);

            if (targetLocation) {
                await tftOperator.moveBenchToBoard(bestBench.unit.location, targetLocation);
                // 同步更新 GameStateManager 状态
                gameStateManager.moveBenchToBoard(bestBench.unit.location, targetLocation);
                await sleep(10);
            } else {
                logger.warn(`[StrategyService] 找不到合适位置放置 ${bestName}`);
            }
        }
    }

    /**
     * 找备战席中价值最高的棋子
     * @param avoidChampionNames 可选：避免选择"同名棋子"（例如场上已经有的棋子名）
     */
    private findBestBenchUnit(
        benchUnits: BenchUnit[],
        targetChampions: Set<ChampionKey>,
        avoidChampionNames?: Set<ChampionKey>
    ): { unit: BenchUnit; score: number } | null {
        const isNormalUnit = (u: BenchUnit): boolean => {
            // 锻造器/特殊单位：不参与上场选择
            if (u.starLevel === -1) return false;
            return !u.tftUnit.displayName.includes('锻造器');
        };

        const filtered = benchUnits.filter(isNormalUnit);
        if (filtered.length === 0) return null;

        // 1) 优先挑选"避开同名"的候选集
        const candidates = avoidChampionNames
            ? filtered.filter(u => !avoidChampionNames.has(u.tftUnit.displayName as ChampionKey))
            : filtered;

        // 2) 如果避开后没有候选，则退化回"不过滤同名"的候选集（避免无子可换）
        const finalCandidates = candidates.length > 0 ? candidates : filtered;

        let best: { unit: BenchUnit; score: number } | null = null;

        for (const unit of finalCandidates) {
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
     * 处理 PVP 阶段 (玩家对战)
     * @description 正常运营阶段：拿牌、升级、调整站位
     *
     * @note 阵容匹配已移至 handleAugment()，在 2-1 首次海克斯选择时执行
     *       因为 2-1 是海克斯阶段（AUGMENT），不是 PVP 阶段
     */
    private async handlePVP(): Promise<void> {
        // 通用运营策略
        await this.executeCommonStrategy();
    }

    /**
     * 防挂机：随机移动小小英雄
     * @description 在战斗阶段（如前期 PVE、野怪回合）时调用，
     *              让小小英雄持续随机走动，避免被系统判定为挂机
     *
     * 循环逻辑：
     * - 使用 while 循环持续调用 selfWalkAround()（左右交替走位，更像真人）
     * - 每次走动后等待 3 秒再进行下一次
     * - 退出条件：战斗状态变化（非战斗→战斗 或 战斗→非战斗）或回合变化
     */
    private async antiAfk(): Promise<void> {
        logger.info("[StrategyService] 开始防挂机循环走动...");

        // 记录进入时的阶段/回合，用于检测回合变化
        const entryStage = this.currentStage;
        const entryRound = this.currentRound;

        // 记录进入时的战斗状态，用于检测战斗状态变化
        const entryFightingState = this.isFighting();

        // 走动间隔（毫秒）
        const walkInterval = 3000;

        while (true) {
            // 退出条件 1：战斗状态发生变化（非战斗→战斗 或 战斗→非战斗）
            if (this.isFighting() !== entryFightingState) {
                logger.info("[StrategyService] 检测到战斗状态变化，退出防挂机循环");
                break;
            }

            // 退出条件 2：回合发生变化（说明进入了新回合）
            if (this.currentStage !== entryStage || this.currentRound !== entryRound) {
                logger.info("[StrategyService] 检测到回合变化，退出防挂机循环");
                break;
            }

            // 执行一次随机走动
            try {
                await tftOperator.selfWalkAround();
            } catch (e: any) {
                logger.warn(`[StrategyService] 防挂机移动失败: ${e?.message ?? e}`);
            }

            // 等待 3 秒后再次走动
            await sleep(walkInterval);
        }
    }


    /**
     * 通用运营策略入口
     * @description 阵容锁定后的核心运营逻辑
     *
     * 执行顺序：
     * 1. 先购买当前商店的目标棋子（每回合商店会自动刷新，不要浪费）
     * 2. 优化棋盘（上棋子 + 替换弱棋子）
     * 3. TODO: 根据策略决定是否 D 牌、升级等
     *
     * 调用时机：2-1 首次 PVP 锁定阵容后，以及后续所有回合
     */
    private async executeCommonStrategy(): Promise<void> {
        logger.debug("[StrategyService] 执行通用运营策略");

        // 小小英雄归位（避免挡住商店）
        // 注意：通用策略过程中会发生很多鼠标操作（买牌/上场/卖棋/拖装备等），
        //      小小英雄可能在过程中被"顺带"移动导致遮挡识别区域。
        //      所以这里除了开头归位一次外，函数结束时也会兜底再归位一次。
        await tftOperator.selfResetPosition();

        try {
            // 0. 处理锻造器（优先处理，腾出备战席空间）
            await this.handleItemForges();

            // 1. 获取已有棋子和目标棋子
            const ownedChampions = gameStateManager.getOwnedChampionNames();
            const targetChampions = this.targetChampionNames;

            logger.info(
                `[StrategyService] 通用策略 - 金币: ${gameStateManager.getGold()}，` +
                `备战席空位: ${gameStateManager.getEmptyBenchSlotCount()}，` +
                `已有棋子: ${Array.from(ownedChampions).join(', ') || '无'}`
            );

            // 2. 分析商店并购买
            await this.autoBuyFromShop(targetChampions, "购买决策");

            // 3. 优化棋盘（上棋子 + 替换弱棋子）
            await this.optimizeBoard(targetChampions);

            // 4. 升级策略 (先决定是否升级，因为升级会消耗大量金币，影响后续 D 牌)
            await this.executeLevelUpStrategy();

            // 5. D 牌前清理：为了防止 D 牌时爆仓，先清理掉无用的杂鱼
            //    (腾出空间比凑利息更重要，否则 D 到了好牌买不下来)
            await this.trySellTrashUnits();

            // 6. D 牌策略，包含D牌，买牌和上牌
            await this.executeRollingLoop(targetChampions);

            // 7. 卖多余棋子 (凑利息/再次清理)
            await this.sellExcessUnits();

            // 刷新游戏状态，确保 D 牌后的棋盘和备战席状态是最新的
            // (因为 D 牌过程中可能有买卖和上场操作，但 GameStateManager 只是部分模拟更新)
            // 暂时先注释掉，看看会不会影响实际效果。
            // await this.refreshGameState();

            // 但调用一下operator的刷新装备栏是有必要的。并把新的数据更新到manager中。
            // 因为我们在卖棋子的过程中，可能棋子本身是带装备的。卖掉后，装备就变多了。
            await this.updateEquipStateFromScreen();

            // 8. 调整站位 (近战前排/远程后排)
            await this.adjustPositions();

            // 9. 装备策略 (合成与穿戴)
            // 注意：装备拖拽属于"高风险操作"。
            // 激进策略（保前四向）：只要"不在战斗中"且"装备栏非空"，就执行（哪怕先给打工仔挂装备也行）。
            // executeEquipStrategy 内部会自动判断是否满足执行条件
            await this.executeEquipStrategy();
        } finally {
            // 兜底：通用策略结束后，再拾取一次法球，避免浪费剩余时间
            // 如果捡到了法球，可能获得了新装备，需要重新执行装备策略
            try {
                logger.info("[StrategyService] 通用策略结束，兜底拾取法球...");
                const pickedOrbs = await this.pickUpLootOrbs();

                // 如果捡到了法球，重新执行装备策略（法球可能掉落装备）
                // executeEquipStrategy 内部会自动判断是否满足执行条件
                if (pickedOrbs) {
                    logger.info("[StrategyService] 捡到法球，重新检查装备策略...");
                    // 先刷新装备栏状态
                    const newEquipments = await tftOperator.getEquipInfo();
                    gameStateManager.updateEquipments(newEquipments);

                    // 直接调用，内部会判断是否需要执行
                    await this.executeEquipStrategy();
                }
            } catch (e: any) {
                logger.warn(`[StrategyService] 通用策略结束兜底拾取法球失败: ${e?.message ?? e}`);
            }

            // 兜底：无论通用策略中间发生什么，都把小小英雄再归位一次，减少遮挡导致的识别失败。
            try {
                await tftOperator.selfResetPosition();
            } catch (e: any) {
                logger.warn(`[StrategyService] 通用策略结束兜底归位失败: ${e?.message ?? e}`);
            }
        }
    }

    /**
     * 处理备战席中的锻造器
     * @description 检查备战席是否有锻造器，如果有则打开并选择中间的装备
     *              锻造器是特殊单位，占用备战席位置但不能上场
     *              及时处理可以：
     *              1. 腾出备战席空间，方便购买棋子
     *              2. 获得装备，可以立即用于后续的装备策略
     *
     *              策略：固定选择中间的装备，免去复杂的装备识别和评估
     */
    private async handleItemForges(): Promise<void> {
        // 查找备战席中的所有锻造器
        const forges = gameStateManager.findItemForges();

        if (forges.length === 0) {
            // logger.debug("[StrategyService] 备战席没有锻造器");
            return;
        }

        logger.info(`[StrategyService] 发现 ${forges.length} 个锻造器: ${forges.map(f => f.tftUnit.displayName).join(', ')}`);

        // 依次处理每个锻造器
        for (const forge of forges) {
            logger.info(`[StrategyService] 处理锻造器: ${forge.tftUnit.displayName} (${forge.location})`);

            // 打开锻造器并选择装备
            await tftOperator.openItemForge(forge);

            // 等待一下，确保选择完成
            await sleep(200);
        }

        // 处理完锻造器后，刷新装备栏状态（因为获得了新装备）
        await this.updateEquipStateFromScreen();

        logger.info(`[StrategyService] 锻造器处理完成，已获得 ${forges.length} 件装备`);
    }

    /**
     * 从屏幕重新识别并更新等级和经验状态
     */
    private async updateLevelStateFromScreen(): Promise<void> {
        const levelInfo = await tftOperator.getLevelInfo();
        if (levelInfo) {
            gameStateManager.updateLevelInfo(levelInfo);
        }
    }

    /**
     * 升级策略 (F键)
     * @description 决定是否购买经验值
     *              策略优先级：
     *              1. 关键回合抢人口 (2-1升4, 2-5升5, 3-2升6, 4-1升7, 5-1升8) - 无视利息强制升
     *              2. 卡利息买经验 - 只要金币 > 50，就一直买经验直到剩余金币 < 50
     */
    private async executeLevelUpStrategy(): Promise<void> {
        // 安全保护：在真正开始按 F 买经验之前，先从屏幕刷新一次等级/经验。
        // 原因：经验值可能在"回合开始自然 +2XP"等情况下变化，
        //       如果只依赖 GameStateManager 的缓存，可能会出现买多/买少。
        await this.updateLevelStateFromScreen();

        const snapshot = gameStateManager.getSnapshotSync();
        if (!snapshot) return;

        let {level, currentXp, totalXp, gold} = snapshot;

        // 已达最大等级 (10 为上限)
        if (level >= 10 || totalXp <= 0) return;

        // 1. 关键回合判定 (Standard Curve) - 无视利息，强制升到目标等级
        const criticalLevel = this.getCriticalLevelTarget();
        if (criticalLevel !== null && level < criticalLevel) {
            const xpNeeded = totalXp - currentXp;
            const buyCount = Math.ceil(xpNeeded / 4);
            const cost = buyCount * 4;

            if (gold >= cost) {
                logger.info(
                    `[StrategyService] 关键回合升级: ${this.currentStage}-${this.currentRound} ` +
                    `拉 ${criticalLevel} (Lv.${level} -> Lv.${level + 1}, 花费 ${cost})`
                );

                for (let i = 0; i < buyCount; i++) {
                    await tftOperator.buyExperience();
                    await sleep(100);
                }

                gameStateManager.deductGold(cost);
                await this.updateLevelStateFromScreen();
            } else {
                logger.warn(
                    `[StrategyService] 关键回合升级失败: 金币不足 (需要 ${cost}, 当前 ${gold})`
                );
            }
            return;
        }

        // 2. 卡利息买经验 - 只要金币 > 50，就一直买经验直到剩余金币 < 50
        // 计算可以买多少次经验（保持 50 利息）
        const maxBuys = Math.floor((gold - 50) / 4);

        if (maxBuys > 0) {
            // 但不能超过升级所需的次数（避免浪费）
            const xpNeeded = totalXp - currentXp;
            const buysToLevelUp = Math.ceil(xpNeeded / 4);
            const actualBuys = Math.min(maxBuys, buysToLevelUp);

            if (actualBuys > 0) {
                const willLevelUp = actualBuys >= buysToLevelUp;
                const cost = actualBuys * 4;

                logger.info(
                    `[StrategyService] 卡利息买经验: 购买 ${actualBuys} 次 (花费 ${cost}, 剩余 ${gold - cost})` +
                    (willLevelUp ? ` -> 升级到 Lv.${level + 1}` : ` -> 经验 +${actualBuys * 4}`)
                );

                for (let i = 0; i < actualBuys; i++) {
                    await tftOperator.buyExperience();
                    await sleep(100);
                }

                gameStateManager.deductGold(cost);
                await this.updateLevelStateFromScreen();
            }
        }
    }

    /**
     * 获取当前回合的关键升级目标等级
     * @returns 目标等级，如果不是关键回合返回 null
     *
     * @description 标准运营节奏 (Standard Curve):
     * - 2-1: 升 4 级
     * - 2-5: 升 5 级
     * - 3-2: 升 6 级
     * - 4-1: 升 7 级
     * - 5-1: 升 8 级
     */
    private getCriticalLevelTarget(): number | null {
        const stage = this.currentStage;
        const round = this.currentRound;

        if (stage === 2 && round === 1) return 4;
        if (stage === 2 && round === 5) return 5;
        if (stage === 3 && round === 2) return 6;
        if (stage === 4 && round === 1) return 7;
        if (stage === 5 && round === 1) return 8;

        return null;
    }

    /**
     * D 牌循环流程
     * @description 负责协调 "判断 -> 刷新 -> 购买 -> 整理" 的完整 D 牌节奏
     */
    private async executeRollingLoop(targetChampions: Set<ChampionKey>): Promise<void> {
        let rollCount = 0;
        const maxRolls = 30; // 安全上限：防止极端情况下死循环

        // 连续多少次刷新都没有买到任何棋子，就认为"继续 D 的收益很低"，主动停手。
        // 这个阈值的意义：避免在"目标牌不在概率池/牌库被卡"时，把金币和时间无意义地烧掉。
        // 注意：备战席满导致的无法购买不计入空转次数，会直接退出循环
        const maxConsecutiveNoBuyRolls = 10;
        let consecutiveNoBuyRolls = 0;

        while (rollCount < maxRolls) {
            // 1. 判断是否需要/可以 D 牌
            const rolled = await this.executeRollStrategy();
            if (!rolled) break;

            rollCount++;

            // 2. 刷新后，尝试购买
            const buyResult = await this.autoBuyFromShop(targetChampions, "D牌后购买");

            // 3. 根据购买结果决定下一步
            switch (buyResult) {
                case BuyResult.BOUGHT:
                    // 买到了棋子，重置空转计数，尝试优化棋盘
                    consecutiveNoBuyRolls = 0;
                    await this.optimizeBoard(targetChampions);
                    continue;

                case BuyResult.BENCH_FULL:
                    // 备战席满了，再 D 也没用，直接退出
                    logger.info(
                        `[StrategyService] D牌停止：备战席已满，无法继续购买`
                    );
                    return;

                case BuyResult.NOTHING_TO_BUY:
                    // 商店没有想买的棋子，累积空转次数
                    consecutiveNoBuyRolls++;
                    if (consecutiveNoBuyRolls >= maxConsecutiveNoBuyRolls) {
                        logger.info(
                            `[StrategyService] D牌提前停止：连续 ${consecutiveNoBuyRolls} 次刷新未购买任何棋子`
                        );
                        return;
                    }
                    break;
            }
        }

        if (rollCount > 0) {
            logger.info(`[StrategyService] D牌结束：共刷新 ${rollCount} 次`);
        }
    }

    /**
     * D 牌 (刷新商店) 策略
     * @description **只负责 D 牌本身**：判断是否该刷新、执行刷新、并更新商店快照。
     *              本方法不做任何买牌/卖牌/上棋逻辑。
     *
     * @returns 本次是否执行了 D 牌（刷新商店）。
     */
    private async executeRollStrategy(): Promise<boolean> {
        // =========================
        // "节点搜"策略（面向保前四）
        // =========================
        // 核心思想：
        // - 非关键节点：尽量不 D，靠自然商店+上人口吃经济
        // - 关键节点：集中花钱把"质量"抬上去（更稳定保血、保前四）
        //
        // 注意：这里的 threshold 表示"本回合最多 D 到剩多少金币为止"。
        // 例如 threshold=30 表示：金币 >= 32 才会继续 D 一次，保证 D 完还能剩 >=30。

        const stage = this.currentStage;
        const round = this.currentRound;

        let shouldRollThisRound = false;
        let threshold = 50;
        let reason = "";

        // 关键节点（可按需要继续加）：3-2 / 4-1 / 5-1
        if (stage === 3 && round === 2) {
            shouldRollThisRound = true;
            threshold = 30;
            reason = "3-2 节点搜（上 6 后补 2★稳血）";
        } else if (stage === 4 && round === 1) {
            shouldRollThisRound = true;
            threshold = 20;
            reason = "4-1 节点搜（上 7 后提升质量）";
        } else if (stage === 5 && round === 1) {
            shouldRollThisRound = true;
            threshold = 10;
            reason = "5-1 节点搜（上 8 后补强阵容）";
        } else if (stage >= 6) {
            // 决赛圈（通常只剩 4 人左右）：
            // 这时"利息"的边际收益很低，而"强度"决定你能不能苟到更高名次。
            // 所以允许把钱打干（仍然受 executeRollingLoop 的 maxRolls / 空转阈值保护）。
            shouldRollThisRound = true;
            threshold = 0;
            reason = "决赛圈（强度优先，允许打干）";
        }

        if (!shouldRollThisRound) {
            return false;
        }

        // 检查是否有大量对子：对子多时，D 一次"命中升星"的收益更高，可以更激进一点
        const ownedChampions = gameStateManager.getOwnedChampionNames();
        let pairCount = 0;
        for (const name of ownedChampions) {
            if (gameStateManager.getOneStarChampionCount(name) >= 2) {
                pairCount++;
            }
        }

        if (pairCount >= 2) {
            threshold = Math.max(0, threshold - 10);
            reason += ` + 对子(${pairCount})`;
        }

        const currentGold = gameStateManager.getGold();

        // 保证 D 完还 >= threshold；即 currentGold >= threshold + 2 才能执行一次刷新
        if (currentGold < 2 || currentGold < threshold + 2) {
            return false;
        }

        logger.info(`[StrategyService] D牌: 当前金币 ${currentGold}，底线 ${threshold}，原因: ${reason}，执行刷新...`);

        // 执行刷新
        await tftOperator.refreshShop();

        // 刷新后重新识别商店和金币（不假设扣多少钱，因为某些海克斯会让刷新免费）
        await this.updateShopStateFromScreen();

        return true;
    }

    /**
     * 获取购买原因（用于日志输出）
     */
    private getBuyReason(
        unit: TFTUnit,
        ownedChampions: Set<ChampionKey>,
        targetChampions: Set<ChampionKey>
    ): string {
        const name = unit.displayName as ChampionKey;
        if (targetChampions.has(name)) {
            return '目标阵容棋子';
        }
        if (ownedChampions.has(name)) {
            return '已有棋子，可升星';
        }
        return `打工仔 (${unit.price}费)`;
    }

    /**
     * 卖多余棋子策略
     * @description
     * 1. 凑利息：如果当前金币接近 10/20/30/40/50，尝试卖怪凑单
     * 2. 清理打工仔：卖掉非目标且非对子的棋子
     */
    private async sellExcessUnits(): Promise<void> {
        const currentGold = gameStateManager.getGold();
        const benchUnits = gameStateManager.getBenchUnitsWithIndex();

        // 1. 计算离下一个利息点还差多少钱
        // 利息点：10, 20, 30, 40, 50 (50以上不需要凑)
        if (currentGold >= 50) return;

        const nextInterest = Math.floor(currentGold / 10 + 1) * 10;
        const diff = nextInterest - currentGold;

        // 如果差额在 2 金币以内 (比如 18, 19, 28, 29...)，尝试凑利息
        if (diff > 0 && diff <= 2) {
            logger.info(`[StrategyService] 尝试凑利息: 当前 ${currentGold}, 目标 ${nextInterest}, 需 ${diff} 金币`);
            await this.trySellForGold(diff);
        }

        // 2. 如果备战席快满了 (>6个)，清理一波杂鱼
        if (benchUnits.length > 6) {
            logger.info(`[StrategyService] 备战席拥挤 (${benchUnits.length}/9), 清理杂鱼...`);
            await this.trySellTrashUnits();
        }
    }

    /**
     * 尝试卖出棋子以获取指定金币
     * @param amountNeeded 需要的金币数量
     */
    private async trySellForGold(amountNeeded: number): Promise<void> {
        let currentAmount = 0;
        const unitsToSell: { index: number; unit: BenchUnit }[] = [];

        // 获取所有备战席棋子
        const benchUnits = gameStateManager.getBenchUnitsWithIndex();

        // 筛选可卖棋子：非目标阵容、非核心、非对子
        const candidates = benchUnits.filter(({unit}) => {
            const name = unit.tftUnit.displayName as ChampionKey;
            // 如果是目标棋子，绝对不卖
            if (this.targetChampionNames.has(name)) return false;
            // 如果是对子（已有2个1星），尽量不卖（可能合2星打工）
            return gameStateManager.getOneStarChampionCount(name) < 2;

        });

        // 排序优先级：
        // 1. 星级低优先 (先卖 1 星，再卖 2 星)
        // 2. 价格低优先 (同星级先卖便宜的)
        candidates.sort((a, b) => {
            if (a.unit.starLevel !== b.unit.starLevel) {
                return a.unit.starLevel - b.unit.starLevel;
            }
            return a.unit.tftUnit.price - b.unit.tftUnit.price;
        });

        for (const candidate of candidates) {
            if (currentAmount >= amountNeeded) break;

            unitsToSell.push(candidate);
            currentAmount += candidate.unit.tftUnit.price;
        }

        if (currentAmount >= amountNeeded) {
            for (const {index, unit} of unitsToSell) {
                logger.info(`[StrategyService] 卖出凑利息: ${unit.tftUnit.displayName} (${unit.starLevel}星, +${unit.tftUnit.price})`);
                await tftOperator.sellUnit(`SLOT_${index + 1}`);
                gameStateManager.setBenchSlotEmpty(index);
                gameStateManager.updateGold(gameStateManager.getGold() + unit.tftUnit.price);
                await sleep(200);
            }
        }
    }

    /**
     * 清理备战席的杂鱼
     */
    private async trySellTrashUnits(): Promise<void> {
        const benchUnits = gameStateManager.getBenchUnitsWithIndex();

        for (const {index, unit} of benchUnits) {
            const name = unit.tftUnit.displayName as ChampionKey;
            // 目标棋子不卖
            if (this.targetChampionNames.has(name)) continue;

            // 对子保留 (可能三连)
            if (gameStateManager.getOneStarChampionCount(name) >= 2) continue;

            // 高费卡 (4,5费) 如果不是目标也不是对子，也直接卖掉，腾位置要紧
            // if (unit.tftUnit.price >= 4) continue;

            logger.info(`[StrategyService] 清理杂鱼: ${name}`);
            await tftOperator.sellUnit(`SLOT_${index + 1}`);
            gameStateManager.setBenchSlotEmpty(index);
            gameStateManager.updateGold(gameStateManager.getGold() + unit.tftUnit.price);
            await sleep(100);
        }
    }

    /**
     * 调整站位
     * @description 遍历场上棋子，检查是否在最佳区域（前排/后排）
     *              如果不在，尝试移动到最佳区域
     */
    private async adjustPositions(): Promise<void> {
        const boardUnits = gameStateManager.getBoardUnitsWithLocation();
        if (boardUnits.length === 0) return;

        logger.debug("[StrategyService] 检查站位...");

        for (const unit of boardUnits) {
            const name = unit.tftUnit.displayName;
            const range = getChampionRange(name) ?? 1;
            const isMelee = range <= 2;
            const currentRow = parseInt(unit.location.split('_')[0].replace('R', ''));

            // 判断是否位置不佳
            // 近战(1-2) 应该在 R1, R2
            // 远程(3+) 应该在 R3, R4
            let needsMove = false;
            if (isMelee && currentRow > 2) needsMove = true;
            if (!isMelee && currentRow <= 2) needsMove = true;

            if (needsMove) {
                // 寻找最佳位置
                // 直接传入 unit (BoardUnit)，因为它包含 tftUnit 属性，满足 findBestPositionForUnit 的要求
                const targetLoc = this.findBestPositionForUnit(unit);

                if (targetLoc) {
                    logger.info(`[StrategyService] 调整站位: ${name} (${unit.location} -> ${targetLoc})`);
                    await tftOperator.moveBoardToBoard(unit.location, targetLoc);
                    // 同步更新 GameStateManager 状态
                    gameStateManager.moveBoardToBoard(unit.location, targetLoc);
                    await sleep(500);
                    return; // 一次只调整一个
                }
            }
        }
    }

    /**
     * 装备策略 (合成与穿戴)
     * @description
     * 1. 内部自动判断是否满足执行条件（战斗中/装备栏空等情况会跳过）
     * 2. 循环执行，直到没有可执行的操作（防止因索引变化导致错误）
     * 3. 优先给核心英雄分配最佳装备
     * 4. 如果核心英雄不在场，给"打工仔"（非目标阵容棋子）分配装备，保住血量
     * 5. 考虑装备合成逻辑
     *
     * @returns 是否执行了装备策略（用于日志/调试）
     */
    private async executeEquipStrategy(): Promise<boolean> {
        // 先判断是否满足执行条件
        const gate = this.getEquipStrategyGateDecision();
        if (!gate.should) {
            logger.debug(`[StrategyService] 跳过装备策略：${gate.reason}`);
            return false;
        }

        logger.info(`[StrategyService] 执行装备策略：${gate.reason}`);

        const maxOperations = 10; // 防止死循环
        let operationCount = 0;

        while (operationCount < maxOperations) {
            const rawEquipments = gameStateManager.getEquipments();
            if (rawEquipments.length === 0) break;

            // 跳过"特殊道具"（拆卸器/重铸器等），这些不是给棋子"穿戴"的装备。
            const equipments = rawEquipments.filter(e => this.isWearableEquipmentName(e.name));
            if (equipments.length === 0) {
                break;
            }

            let actionTaken = false;

            // 1) 先尝试"核心装合成/成装直上"（优先级最高）
            const coreChampions = this.getCoreChampions();

            // 建立装备背包的快照（用于模拟合成可行性；真实消耗由 GameStateManager.removeEquipment 维护）
            const bagSnapshot = new Map<string, number>();
            for (const equip of equipments) {
                bagSnapshot.set(equip.name, (bagSnapshot.get(equip.name) || 0) + 1);
            }

            for (const config of coreChampions) {
                const desiredItems: string[] = [];
                if (config.items) {
                    desiredItems.push(...config.items.core);
                    if (config.items.alternatives) {
                        desiredItems.push(...config.items.alternatives);
                    }
                }
                if (desiredItems.length === 0) continue;

                for (const itemName of desiredItems) {
                    // 目标单位的选择需要"按装备动态决定"：
                    // - 核心在场：一定返回核心
                    // - 核心不在场：返回更合适的打工仔（会参考装备的前排/后排倾向）
                    const targetWrapper = this.findUnitForEquipment(config.name, itemName);
                    if (!targetWrapper) continue;

                    // 装备已满 (3件) 跳过
                    if (targetWrapper.unit.equips.length >= 3) continue;

                    const alreadyHas = targetWrapper.unit.equips.some(e => e.name === itemName);
                    if (alreadyHas) continue;

                    // A) 背包有成装 → 直接给
                    if ((bagSnapshot.get(itemName) || 0) > 0) {
                        logger.info(
                            `[StrategyService] 发现成装 ${itemName}，给 ${targetWrapper.isCore ? '核心' : '打工'}: ${targetWrapper.unit.tftUnit.displayName}`
                        );
                        await this.equipItemToUnit(itemName, targetWrapper.unit.location);
                        actionTaken = true;
                        break;
                    }

                    // B) 能合成核心装 → 合成并给
                    const synthesis = this.checkSynthesis(itemName, bagSnapshot);
                    if (synthesis) {
                        logger.info(
                            `[StrategyService] 合成 ${itemName} (${synthesis.component1} + ${synthesis.component2}) ` +
                            `给 ${targetWrapper.isCore ? '核心' : '打工'}: ${targetWrapper.unit.tftUnit.displayName}`
                        );
                        await this.synthesizeAndEquip(
                            synthesis.component1,
                            synthesis.component2,
                            targetWrapper.unit.location,
                            itemName  // 传入合成后的装备名称
                        );
                        actionTaken = true;
                        break;
                    }
                }

                if (actionTaken) break;
            }

            // 2) 如果没有核心装可做：把背包里的装备尽快"合理地"挂出去（保前四：即时战力）
            if (!actionTaken) {
                // 2.1 优先选择一个"基础散件"（formula 为空）；没有散件就随便取一个可穿戴装备
                const component = equipments.find(e => {
                    const data = TFT_16_EQUIP_DATA[e.name as EquipKey];
                    return data && (data.formula ?? "") === "";
                });

                const itemToEquip = component?.name ?? equipments[0].name;

                // 2.2 根据"散件构成"推断它更适合前排/后排，并按倾向找一个更合适的穿戴目标
                const targetLocation = this.findBestEquipmentTargetLocation(itemToEquip, coreChampions);

                if (targetLocation) {
                    const role = this.getEquipmentRolePreference(itemToEquip);
                    logger.info(`[StrategyService] 装备上场(${role}): ${itemToEquip} -> ${targetLocation}`);
                    await this.equipItemToUnit(itemToEquip, targetLocation);
                    actionTaken = true;
                }
            }

            if (!actionTaken) {
                break;
            }

            operationCount++;
            await sleep(100);
        }

        return true;  // 成功执行了装备策略
    }

    /**
     * 寻找适合穿戴装备的单位
     * @param coreChampionName 核心英雄名字
     * @returns { unit: BoardUnit, isCore: boolean } | null
     * @description
     * 1. 优先找场上的 Core Champion
     * 2. 如果没找到，找场上的 "打工仔" (非 Target Champion)
     * 3. 打工仔选择标准：2星优先 > 费用高优先
     */
    private findUnitForEquipment(coreChampionName: string, itemName?: string): { unit: BoardUnit, isCore: boolean } | null {
        const boardUnits = gameStateManager.getBoardUnitsWithLocation();

        // 1. 找 Core（核心在场时，优先给核心；不做"前排/后排"限制，避免与阵容配置冲突）
        const coreUnits = boardUnits
            .filter(u => u.tftUnit.displayName === coreChampionName)
            .sort((a, b) => b.starLevel - a.starLevel); // 优先高星

        if (coreUnits.length > 0) {
            return { unit: coreUnits[0], isCore: true };
        }

        // 2. 找打工仔 (Item Holder)
        // 定义：只要不是 targetChampionNames 里的，就是纯粹的打工仔
        let holderUnits = boardUnits.filter(u => !this.targetChampionNames.has(u.tftUnit.displayName as ChampionKey));

        if (holderUnits.length > 0 && itemName) {
            // 根据装备倾向做一次过滤：
            // - 坦装/抗性散件 → 更偏向给近战前排
            // - 输出/回蓝散件 → 更偏向给远程后排
            const role = this.getEquipmentRolePreference(itemName);
            if (role !== 'any') {
                const matched = holderUnits.filter(u => this.doesUnitMatchEquipRole(u, role));
                if (matched.length > 0) {
                    holderUnits = matched;
                }
            }
        }

        if (holderUnits.length > 0) {
            // 排序：优先给强的打工仔 (星级高 > 价格高)
            holderUnits.sort((a, b) => {
                if (a.starLevel !== b.starLevel) return b.starLevel - a.starLevel;
                return b.tftUnit.price - a.tftUnit.price;
            });
            return { unit: holderUnits[0], isCore: false };
        }

        return null;
    }

    /**
     * 检查是否可以合成指定装备
     * @param targetItemName 目标装备名称
     * @param bag 装备背包快照
     * @returns 如果可以合成，返回两个散件的名称；否则返回 null
     */
    private checkSynthesis(targetItemName: string, bag: Map<string, number>): { component1: string, component2: string } | null {
        const targetEquip = TFT_16_EQUIP_DATA[targetItemName as EquipKey];
        if (!targetEquip || !targetEquip.formula) return null;

        // 解析配方 ID
        const [id1, id2] = targetEquip.formula.split(',');
        if (!id1 || !id2) return null;

        // 将 ID 转换为名称 (需要遍历所有装备数据查找，性能稍低但数据量小没问题)
        // 优化：可以预先建立 ID -> Name 的映射，但这里为了简单直接查找
        const name1 = this.findEquipNameById(id1);
        const name2 = this.findEquipNameById(id2);

        if (!name1 || !name2) return null;

        // 检查背包数量
        const count1 = bag.get(name1) || 0;
        const count2 = bag.get(name2) || 0;

        if (name1 === name2) {
            // 如果是同一种散件合成（如蓝霸符=眼泪+眼泪），需要至少 2 个
            if (count1 >= 2) return { component1: name1, component2: name2 };
        } else {
            // 不同散件
            if (count1 >= 1 && count2 >= 1) return { component1: name1, component2: name2 };
        }

        return null;
    }

    /**
     * 根据 ID 查找装备名称
     */
    private findEquipNameById(id: string): string | undefined {
        for (const key in TFT_16_EQUIP_DATA) {
            if (TFT_16_EQUIP_DATA[key].equipId === id) {
                return TFT_16_EQUIP_DATA[key].name;
            }
        }
        return undefined;
    }

    /**
     * 将装备给棋子（成装直接给）
     */
    private async equipItemToUnit(itemName: string, unitLocation: BoardLocation): Promise<void> {
        // 找到背包中该装备的索引（真实索引）
        const equipIndex = gameStateManager.findEquipmentIndex(itemName);
        if (equipIndex === -1) {
            logger.error(`[StrategyService] 背包中找不到装备 ${itemName}`);
            return;
        }

        logger.info(`[StrategyService] 穿戴: ${itemName} -> ${unitLocation}`);

        // 装备栏索引 0-9，对应槽位 EQ_SLOT_1 ~ 10
        await tftOperator.equipToBoardUnit(equipIndex, unitLocation);

        // 消耗了装备，更新 GameStateManager (模拟消耗，索引前移)
        gameStateManager.removeEquipment(equipIndex);
        // 同步更新棋子身上的装备列表
        gameStateManager.addEquipToUnit(unitLocation, itemName);

        // 这里为了稳妥，操作后暂停一下
        await sleep(100);
    }

    /**
     * 合成并穿戴（将两个散件依次给棋子）
     * @param comp1 第一个散件名称
     * @param comp2 第二个散件名称
     * @param unitLocation 目标棋子位置
     * @param resultItemName 合成后的装备名称（用于同步更新棋子装备状态）
     */
    private async synthesizeAndEquip(
        comp1: string,
        comp2: string,
        unitLocation: BoardLocation,
        resultItemName: string
    ): Promise<void> {
        // 1. 找到第一个散件
        const index1 = gameStateManager.findEquipmentIndex(comp1);
        if (index1 === -1) {
             logger.error(`[StrategyService] 合成失败：找不到第一个散件 ${comp1}`);
             return;
        }

        logger.info(`[StrategyService] 合成步骤1: ${comp1}(slot${index1}) -> ${unitLocation}`);
        await tftOperator.equipToBoardUnit(index1, unitLocation);

        // 移除第一个散件，后续索引会自动前移
        gameStateManager.removeEquipment(index1);
        await sleep(500);

        // 2. 找到第二个散件 (注意：必须重新查找，因为索引可能变了)
        const index2 = gameStateManager.findEquipmentIndex(comp2);
        if (index2 === -1) {
             logger.error(`[StrategyService] 合成失败：找不到第二个散件 ${comp2} (可能被挪用了?)`);
             return;
        }

        logger.info(`[StrategyService] 合成步骤2: ${comp2}(slot${index2}) -> ${unitLocation}`);
        await tftOperator.equipToBoardUnit(index2, unitLocation);

        // 移除第二个散件
        gameStateManager.removeEquipment(index2);
        // 同步更新棋子身上的装备列表（合成后的成装）
        gameStateManager.addEquipToUnit(unitLocation, resultItemName);
        await sleep(500);
    }

    /**
     * 处理 选秀阶段
     * @description
     * 选秀阶段会循环右键点击选秀位置（sharedDraftPoint），每隔 3 秒点一次，
     * 直到 GameStageMonitor 检测到进入下一个回合（stageText 变化）时自动退出。
     *
     */
    private async handleCarousel(): Promise<void> {
        logger.info("[StrategyService] 选秀阶段：开始循环点击选秀位置...");

        // 记录进入选秀时的阶段文本，用于判断是否进入下一回合
        const entryStageText = gameStageMonitor.stageText;

        // 点击间隔（毫秒）
        const clickInterval = 2000;

        while (true) {
            // 检查是否已经进入下一个回合（stageText 变化说明选秀结束）
            if (gameStageMonitor.stageText !== entryStageText) {
                logger.info("[StrategyService] 选秀阶段结束，进入下一回合");
                break;
            }
            // 右键点击选秀位置（小小英雄会自动走向最近的棋子）
            await mouseController.clickAt(sharedDraftPoint, MouseButtonType.RIGHT);
            logger.debug(`[StrategyService] 选秀点击: (${sharedDraftPoint.x}, ${sharedDraftPoint.y})`);
            // 等待 3 秒后再次点击
            await sleep(clickInterval);
        }
    }

    /**
     * 处理 海克斯选择阶段 (2-1, 3-2, 4-2)
     * @description 进入海克斯阶段后：
     *              1. 等待 1.5 秒（让海克斯选项完全加载）
     *              2. 随机点击一个海克斯槽位（SLOT_1 / SLOT_2 / SLOT_3）
     *              3. 等待 0.5 秒（让选择动画完成）
     *              4. 刷新游戏状态
     *              5. 执行通用运营策略（因为海克斯选完后就是正常 PVP 准备阶段）
     */
    private async handleAugment(): Promise<void> {
        logger.info("[StrategyService] 海克斯阶段：等待海克斯选项加载...");

        // 1. 等待，让海克斯选项完全显示出来
        await sleep(800);

        // 2. 随机选择一个海克斯槽位
        //    hexSlot 有 SLOT_1, SLOT_2, SLOT_3 三个选项
        const slotKeys = Object.keys(hexSlot) as (keyof typeof hexSlot)[];
        const randomIndex = Math.floor(Math.random() * slotKeys.length);
        const selectedSlotKey = slotKeys[randomIndex];
        const selectedPoint = hexSlot[selectedSlotKey];

        logger.info(
            `[StrategyService] 海克斯阶段：随机选择一个海克斯槽位: ${selectedSlotKey}`
        );

        // 左键点击选择海克斯
        await mouseController.clickAt(selectedPoint, MouseButtonType.LEFT);

        // 3. 等待 0.5 秒，让选择动画完成
        await sleep(500);

        // 4. 刷新游戏状态（海克斯选完后，商店/备战席/棋盘可能有变化）
        await this.refreshGameState();

        // 5. 执行通用运营策略（海克斯选完后就是正常 PVP 准备阶段）
        await this.executeCommonStrategy();
    }

    /**
     * 购买棋子并更新游戏状态
     * @param shopSlotIndex 商店槽位索引 (0-4)
     * @returns SingleBuyResult 购买结果
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
     *   → 尝试卖棋子腾位置，如果无法腾位置则返回 BENCH_FULL
     */
    private async buyAndUpdateState(
        shopSlotIndex: ShopSlotIndex
    ): Promise<SingleBuyResult> {
        // 1. 获取商店棋子信息
        const shopUnits = gameStateManager.getShopUnits();
        const unit = shopUnits[shopSlotIndex];

        if (!unit) {
            logger.error(`[StrategyService] 商店槽位 ${shopSlotIndex} 为空，无法购买`);
            return SingleBuyResult.FAILED;
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
            return SingleBuyResult.NOT_ENOUGH_GOLD;
        }

        // 3. 检查备战席空位和升星情况
        const emptyBenchSlots = gameStateManager.getEmptyBenchSlotCount();
        const canUpgrade = gameStateManager.canUpgradeAfterBuy(championName);

        // 4. 判断是否可以购买
        if (emptyBenchSlots <= 0 && !canUpgrade) {
            logger.warn(
                `[StrategyService] 备战席已满且买了不能升星，无法购买 ${championName}`
            );
            return SingleBuyResult.BENCH_FULL;
        }

        // 5. 执行购买操作（调用 TftOperator）
        //    商店槽位是 1-5，所以要 +1
        logger.info(
            `[StrategyService] 购买 ${championName} (￥${price})` +
            (canUpgrade ? ' [可升星]' : '')
        );
        await tftOperator.buyAtSlot(shopSlotIndex + 1);

        // 6. 购买成功，更新 GameStateManager 状态
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

        return SingleBuyResult.SUCCESS;
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
        if (benchUnits.length === 0 || maxCount <= 0) {
            return [];
        }

        // 多样性优化：优先不上场"场上已经存在"的同名棋子
        // 说明：同名棋子重复上场往往带来较低的收益，但会占用人口。
        //      因此这里优先让场面更"多样"，把人口用在不同棋子上；如果备战席全是重复棋子，会自动兜底。
        const boardChampionNames = new Set<ChampionKey>(
            gameStateManager.getBoardUnitsWithLocation().map(u => u.tftUnit.displayName as ChampionKey)
        );

        // 先过滤掉特殊单位（例如锻造器）
        const filtered = benchUnits.filter(u => {
            if (u.starLevel === -1) return false;
            return !u.tftUnit.displayName.includes('锻造器');
        });

        if (filtered.length === 0) {
            return [];
        }

        // 多样性候选：优先选择"场上没有的同名棋子"
        // 兜底：如果备战席全是重复棋子，仍然允许上场（否则会亏人口）
        const candidates = filtered.filter(u => !boardChampionNames.has(u.tftUnit.displayName as ChampionKey));
        const finalCandidates = candidates.length > 0 ? candidates : filtered;

        // 复用 calculateUnitScore 计算分数，按分数从高到低排序
        const sortedUnits = [...finalCandidates].sort((a, b) => {
            const aScore = this.calculateUnitScore(a.tftUnit, a.starLevel, targetChampions);
            const bScore = this.calculateUnitScore(b.tftUnit, b.starLevel, targetChampions);
            return bScore - aScore; // 分数高的排前面
        });

        // 第一轮：尽量保证"上场棋子也不重复"（同一回合优先上不同英雄）
        const result: BenchUnit[] = [];
        const pickedChampionNames = new Set<ChampionKey>();

        for (const u of sortedUnits) {
            const name = u.tftUnit.displayName as ChampionKey;
            if (pickedChampionNames.has(name)) continue;
            pickedChampionNames.add(name);
            result.push(u);
            if (result.length >= maxCount) break;
        }

        // 第二轮兜底：如果仍然没凑满人口（备战席大多是重复棋子），用剩余高分棋子补齐
        if (result.length < maxCount) {
            for (const u of sortedUnits) {
                if (result.includes(u)) continue;
                result.push(u);
                if (result.length >= maxCount) break;
            }
        }

        return result;
    }

    /**
     * 为棋子找到最佳摆放位置
     * @param unit 棋子对象 (需要包含 tftUnit 信息)
     * @returns 最佳位置的 BoardLocation，如果找不到返回 undefined
     *
     * @description 摆放逻辑：
     *              - 射程 1-2（近战）：优先放前排 (R1, R2)
     *              - 射程 3+（远程）：优先放后排 (R3, R4)
     *              - 如果优先区域没有空位，则放到任意空位
     */
    private findBestPositionForUnit(unit: { tftUnit: TFTUnit }): BoardLocation | undefined {
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
     * 自动购买商店中的目标棋子
     * @param targetChampions 目标棋子集合
     * @param logPrefix 日志前缀
     * @returns BuyResult 购买结果
     *          - BOUGHT: 成功购买了至少一个棋子
     *          - NOTHING_TO_BUY: 商店没有想买的棋子
     *          - BENCH_FULL: 备战席已满，无法继续购买
     */
    private async autoBuyFromShop(
        targetChampions: Set<ChampionKey>,
        logPrefix: string = "自动购买"
    ): Promise<BuyResult> {
        const shopUnits = gameStateManager.getShopUnits();
        const ownedChampions = gameStateManager.getOwnedChampionNames();

        const buyIndices = this.analyzePurchaseDecision(shopUnits, ownedChampions, targetChampions);

        // 商店没有想买的棋子
        if (buyIndices.length === 0) {
            return BuyResult.NOTHING_TO_BUY;
        }

        let hasBought = false;
        let benchFull = false;

        for (const index of buyIndices) {
            const unit = shopUnits[index];
            if (!unit) continue;

            const championName = unit.displayName as ChampionKey;
            const isTarget = targetChampions.has(championName);

            logger.info(
                `[StrategyService] ${logPrefix}: ${championName} (￥${unit.price})，` +
                `原因: ${this.getBuyReason(unit, ownedChampions, targetChampions)}`
            );

            // 尝试购买
            const result = await this.buyAndUpdateState(index);

            if (result === SingleBuyResult.SUCCESS) {
                hasBought = true;
                ownedChampions.add(championName);
            } else if (result === SingleBuyResult.BENCH_FULL) {
                // 备战席满了，后续的棋子也买不下
                benchFull = true;
                if (isTarget) {
                    logger.warn(`[StrategyService] 备战席已满，无法购买目标棋子 ${championName}`);
                }
                break; // 不再尝试购买后续棋子
            } else if (isTarget) {
                // 其他原因导致目标棋子购买失败
                logger.warn(`[StrategyService] 目标棋子 ${championName} 购买失败`);
            }
        }

        // 返回结果优先级：BENCH_FULL > BOUGHT > NOTHING_TO_BUY
        if (benchFull && !hasBought) {
            return BuyResult.BENCH_FULL;
        }
        return hasBought ? BuyResult.BOUGHT : BuyResult.NOTHING_TO_BUY;
    }

    /**
     * 从屏幕重新识别并更新商店和金币状态
     * @description D 牌后调用，重新识别商店棋子和金币并更新到 GameStateManager
     *              不假设刷新扣多少钱，因为某些海克斯强化会让刷新免费或打折
     */
    private async updateShopStateFromScreen(): Promise<void> {
        // 并行识别商店和金币（两者都只需要截图+OCR，不冲突）
        const [newShopUnits, newGold]: [(TFTUnit | null)[], number | null] = await Promise.all([
            tftOperator.getShopInfo(),
            tftOperator.getCoinCount()
        ]);

        // 更新商店
        gameStateManager.updateShopUnits(newShopUnits);

        // 更新金币（如果识别成功）
        if (newGold !== null) {
            gameStateManager.updateGold(newGold);
        }
    }

    /**
     * 从屏幕重新识别并更新装备栏状态
     */
    private async updateEquipStateFromScreen(): Promise<void> {
        const equipments = await tftOperator.getEquipInfo();
        gameStateManager.updateEquipments(equipments);
    }

    /**
     * 从屏幕重新识别并更新备战席状态
     * @description 卖棋子后调用，重新识别备战席棋子并更新到 GameStateManager
     */
    private async updateBenchStateFromScreen(): Promise<void> {
        const benchUnits = await tftOperator.getBenchInfo();
        gameStateManager.updateBenchUnits(benchUnits);
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

        // 重置游戏模式为默认值
        this.gameMode = TFTMode.NORMAL;

        // 同时重置 GameStateManager
        gameStateManager.reset();

        logger.info("[StrategyService] 策略服务已重置");
    }
}

// 导出单例实例，方便其他文件直接使用
export const strategyService = StrategyService.getInstance();
