import { GameStageType } from "../TFTProtocol";
import type { ActionPlan, DecisionContext, DecisionEngine, ObservedState, ObservedUnit, ShopOffer } from "./types";

const DEFAULT_ECONOMY_FLOOR = 30;
const DEFAULT_STABILIZE_HP_THRESHOLD = 42;

interface ParsedStage {
    stage: number;
    round: number;
}

function countOwnedUnits(units: ObservedUnit[]): Map<string, number> {
    const owned = new Map<string, number>();
    for (const unit of units) {
        owned.set(unit.name, (owned.get(unit.name) ?? 0) + 1);
    }
    return owned;
}

function parseStage(stageText: string): ParsedStage | null {
    const match = stageText.match(/^(\d+)-(\d+)$/);
    if (!match) {
        return null;
    }
    return {
        stage: Number(match[1]),
        round: Number(match[2]),
    };
}

function unitPower(unit: ObservedUnit): number {
    const starFactor = unit.star >= 3 ? 3.8 : unit.star >= 2 ? 2.2 : 1;
    const itemFactor = unit.items.length * 0.25;
    return (unit.cost ?? 1) * starFactor + itemFactor;
}

function boardStrength(board: ObservedUnit[]): number {
    return board.reduce((acc, unit) => acc + unitPower(unit), 0);
}

function expectedBoardStrengthByStage(parsed: ParsedStage | null, level: number): number {
    if (!parsed) {
        return Math.max(8, level * 4);
    }

    let perSlot = 3.5;
    if (parsed.stage <= 2) {
        perSlot = 2.7;
    } else if (parsed.stage === 3) {
        perSlot = 3.8;
    } else if (parsed.stage === 4) {
        perSlot = 4.6;
    } else if (parsed.stage >= 5) {
        perSlot = 5.2;
    }
    return Math.max(10, perSlot * Math.min(level, 9));
}

function isKeyRound(parsed: ParsedStage | null, stage: number, round: number): boolean {
    if (!parsed) {
        return false;
    }
    return parsed.stage === stage && parsed.round === round;
}

function isBenchOverflowed(state: ObservedState): boolean {
    // ObservedState 只记录有单位的槽位，9 格满员时长度通常会接近 9。
    return state.bench.length >= 9;
}

function chooseCarryUnit(board: ObservedUnit[], targetNames: Set<string>): ObservedUnit | null {
    if (board.length === 0) {
        return null;
    }

    const targetCarry = board
        .filter((unit) => targetNames.has(unit.name))
        .sort((a, b) => unitPower(b) - unitPower(a))[0];
    if (targetCarry) {
        return targetCarry;
    }

    return [...board].sort((a, b) => unitPower(b) - unitPower(a))[0] ?? null;
}

function getHighestTargetPairCount(ownedCounts: Map<string, number>, targetNames: Set<string>): number {
    let highest = 0;
    for (const name of targetNames) {
        highest = Math.max(highest, ownedCounts.get(name) ?? 0);
    }
    return highest;
}

function computeEconomyFloor(state: ObservedState, context: DecisionContext, parsed: ParsedStage | null): number {
    const hpThreshold = context.stabilizeHpThreshold ?? DEFAULT_STABILIZE_HP_THRESHOLD;
    const hp = state.hp ?? 100;
    const streak = state.streak ?? 0;

    if (context.strategyPreset === "REROLL") {
        if (hp <= hpThreshold) {
            return 8;
        }
        return parsed && parsed.stage <= 4 ? 18 : 30;
    }

    if (context.strategyPreset === "FAST8") {
        if (hp <= hpThreshold) {
            return 10;
        }
        if (!parsed) {
            return 36;
        }
        if (parsed.stage <= 3) {
            return 40;
        }
        return parsed.stage === 4 ? 24 : 18;
    }

    const base = Math.max(0, context.conservativeEconomyFloor ?? DEFAULT_ECONOMY_FLOOR);
    if (hp <= hpThreshold) {
        return 10;
    }
    if (streak <= -3 && parsed && parsed.stage <= 4) {
        return Math.max(base, 40);
    }
    if (streak >= 3 && parsed && parsed.stage <= 4) {
        return Math.min(base, 24);
    }
    if (parsed && parsed.stage <= 2) {
        return Math.min(base, 20);
    }
    if (parsed && parsed.stage >= 5) {
        return hp >= 60 ? Math.max(base, 35) : Math.min(base, 20);
    }
    return base;
}

/**
 * 评估单个融合路线的强度
 * @param board 当前棋盘
 * @param bench 备战席（用于计算备战潜力）
 * @param shop 商店
 * @param targetNames 目标棋子名集合
 * @returns { baseScore: number, synergyCount: number, unitStrength: number }
 */
function evaluateFusionPath(
    board: ObservedUnit[],
    _bench: ObservedUnit[],
    shop: ShopOffer[],
    targetNames: Set<string>
): { baseScore: number; synergyCount: number; unitStrength: number } {
    // 计算棋盘强度
    const currentStrength = boardStrength(board);
    
    // 计算目标棋子协同数
    let synergyCount = 0;
    for (const unit of board) {
        if (targetNames.has(unit.name)) {
            synergyCount++;
        }
    }
    
    // 评估商店购买潜力
    let shopPotential = 0;
    for (const offer of shop) {
        if (offer.unit && targetNames.has(offer.unit.name)) {
            shopPotential += unitPower(offer.unit);
        }
    }
    
    // 基础评分 = 棋盘强度 + 协同数*2 + 商店潜力
    const baseScore = currentStrength + synergyCount * 2 + shopPotential;
    
    return { baseScore, synergyCount, unitStrength: currentStrength };
}

/**
 * 并行评估多个融合路线
 * @param state 游戏状态
 * @param context 决策上下文
 * @param parsed 阶段解析结果
 * @returns 排序后的融合路线列表（按 adjustedScore 降序）
 */
function evaluateMultiFusionPaths(
    state: ObservedState,
    context: DecisionContext,
    parsed: ParsedStage | null
): Array<{ path: string; baseScore: number; adjustedScore: number; synergyCount: number }> {
    const targetNames = new Set(context.targetChampionNames ?? []);
    
    // 评估当前路线
    const currentPath = evaluateFusionPath(state.board, state.bench, state.shop, targetNames);
    
    // 构建所有路线结果
    const results: Array<{ path: string; baseScore: number; adjustedScore: number; synergyCount: number }> = [];
    
    // 添加当前路线
    results.push({
        path: "current",
        baseScore: currentPath.baseScore,
        synergyCount: currentPath.synergyCount,
        adjustedScore: computeRiskAdjustedScore(currentPath.baseScore, state, context, parsed),
    });
    
    // 评估备选路线（假设购买商店中的目标棋子）
    for (const offer of state.shop) {
        if (offer.unit && targetNames.has(offer.unit.name)) {
            const altBoard = [...state.board, offer.unit];
            const altResult = evaluateFusionPath(altBoard, state.bench, state.shop, targetNames);
            results.push({
                path: `buy-${offer.unit.name}`,
                baseScore: altResult.baseScore,
                synergyCount: altResult.synergyCount,
                adjustedScore: computeRiskAdjustedScore(altResult.baseScore, state, context, parsed),
            });
        }
    }
    
    // 按 adjustedScore 降序排序
    results.sort((a, b) => b.adjustedScore - a.adjustedScore);
    
    return results;
}

/**
 * 计算风险调整评分
 * @param baseScore 基础评分
 * @param state 游戏状态
 * @param context 决策上下文
 * @param parsed 阶段解析结果
 * @returns 调整后的评分（0-100 范围）
 */
function computeRiskAdjustedScore(
    baseScore: number,
    state: ObservedState,
    context: DecisionContext,
    parsed: ParsedStage | null
): number {
    const hpThreshold = context.stabilizeHpThreshold ?? DEFAULT_STABILIZE_HP_THRESHOLD;
    const hp = state.hp ?? 100;
    const economyFloor = computeEconomyFloor(state, context, parsed);
    const weakBoard = boardStrength(state.board) < expectedBoardStrengthByStage(parsed, state.level);
    
    // 计算风险因子
    const riskHp = Math.max(0, hpThreshold - hp) / hpThreshold;
    const econGap = Math.max(0, economyFloor - state.gold) / Math.max(1, economyFloor);
    const weakBoardRatio = weakBoard ? 0.5 : 0;
    
    // 风险评分
    const riskScore = riskHp * 1.8 + econGap * 1.2 + weakBoardRatio;
    
    // 调整幅度（0-30 范围）
    const priorityDelta = Math.round(riskScore * 10);
    
    // 低血量时大幅提升优先级
    const mustStabilize = hp <= hpThreshold;
    if (mustStabilize) {
        return Math.min(100, Math.round(baseScore + priorityDelta + 20));
    }
    
    return Math.min(100, Math.round(baseScore + priorityDelta));
}

export class RuleBasedDecisionEngine implements DecisionEngine {
    public generatePlan(state: ObservedState, context: DecisionContext = {}): ActionPlan[] {
        const plans: ActionPlan[] = [];
        const parsed = parseStage(state.stageText);
        const targetNames = new Set((context.targetChampionNames ?? []).filter(Boolean));
        const economyFloor = computeEconomyFloor(state, context, parsed);
        const hpThreshold = context.stabilizeHpThreshold ?? DEFAULT_STABILIZE_HP_THRESHOLD;
        const hp = state.hp ?? 100;
        const streak = state.streak ?? 0;
        const weakBoard =
            boardStrength(state.board) < expectedBoardStrengthByStage(parsed, state.level) ||
            state.board.length < Math.max(1, state.level - 1);
        const shouldProtectLossStreak = streak <= -3 && hp > hpThreshold + 10 && parsed?.stage !== undefined && parsed.stage <= 4;
        const shouldProtectWinStreak = streak >= 3 && hp > hpThreshold && parsed?.stage !== undefined && parsed.stage <= 4;
        const mustStabilize = hp <= hpThreshold || (weakBoard && !shouldProtectLossStreak);
        
        // 评估多融合路线，用于调整优先级
        const fusionPaths = targetNames.size > 0 ? evaluateMultiFusionPaths(state, context, parsed) : [];
        const bestFusionScore = fusionPaths[0]?.adjustedScore ?? 50;

        let tick = 0;
        const addPlan = (
            type: ActionPlan["type"],
            priority: number,
            reason: string,
            payload: Record<string, unknown>
        ) => {
            plans.push({
                tick,
                type,
                priority,
                reason,
                payload,
            });
            tick += 1;
        };

        if (state.stageType === GameStageType.AUGMENT && state.augments && state.augments.length > 0) {
            const selected = [...state.augments].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
            addPlan("PICK_AUGMENT", 100, "进入海克斯回合，优先选择评分最高的强化", { slot: selected.slot });
        }

        // 关键回合升人口节奏（参考自动运营常见节奏：2-1/2-5/3-2/4-2/5-1）
        if (state.stageType === GameStageType.PVP) {
            if (isKeyRound(parsed, 2, 1) && state.level < 4 && state.gold >= 4) {
                addPlan("LEVEL_UP", 96, "2-1 关键节奏，优先升人口保连胜或稳血", { count: 1 });
            } else if (isKeyRound(parsed, 2, 5) && state.level < 5 && state.gold >= 4) {
                addPlan("LEVEL_UP", 94, "2-5 节奏点，提前补人口提升战力", { count: 1 });
            } else if (isKeyRound(parsed, 3, 2) && state.level < 6 && state.gold >= (mustStabilize ? 16 : shouldProtectWinStreak ? 20 : 24)) {
                addPlan("LEVEL_UP", 90, "3-2 中期节奏，优先上 6 进入中期运营", { count: 1 });
            } else if (isKeyRound(parsed, 4, 1) && state.level < 7 && state.gold >= (mustStabilize ? 12 : 16)) {
                addPlan("LEVEL_UP", 91, "4-1 标准节奏，优先上 7 稳住中后期战力", { count: 1 });
            } else if (isKeyRound(parsed, 4, 2) && state.level < 8 && state.gold >= 20) {
                const count = state.gold >= 40 ? 2 : 1;
                addPlan("LEVEL_UP", 92, "4-2 关键转折，优先冲 8 寻找高费核心", { count });
            } else if (isKeyRound(parsed, 4, 5) && state.level < 8 && hp > hpThreshold + 10 && state.gold >= 30) {
                addPlan("LEVEL_UP", 88, "4-5 血量健康且经济充足，先贪人口拉上限", { count: 1 });
            } else if ((isKeyRound(parsed, 4, 2) || isKeyRound(parsed, 4, 5)) && state.level < 8 && hp > hpThreshold + 4 && state.gold >= 20 && state.gold < 30) {
                // 中期小 D 没能立刻扭转质量时，血量仍安全就该转回升人口恢复节奏，避免继续无脑 D 空经济。
                addPlan("LEVEL_UP", 86, "中期小D后血量仍安全，转向升人口恢复运营节奏", { count: 1 });
            } else if (isKeyRound(parsed, 5, 1) && state.level < 9 && hp > hpThreshold + 10 && state.gold >= 40) {
                addPlan("LEVEL_UP", 87, "5-1 仍然健康且经济够用，优先贪升级而不是提前 D 牌", { count: 1 });
            } else if (parsed && parsed.stage >= 5 && state.level < 9 && state.gold >= 50 && hp > hpThreshold) {
                addPlan("LEVEL_UP", 78, "后期经济充足且血量健康，准备上 9 提升上限", { count: 1 });
            }
        }

        const ownedCounts = countOwnedUnits([...state.bench, ...state.board]);
        const highestTargetPairCount = getHighestTargetPairCount(ownedCounts, targetNames);
        let spendableGold = state.gold;
        const softBudget = Math.max(0, state.gold - economyFloor);
        let spent = 0;
        const midgameRecoveryLevel = (isKeyRound(parsed, 4, 2) || isKeyRound(parsed, 4, 5)) && state.level < 8 && hp > hpThreshold + 4 && state.gold >= 20 && state.gold < 30;
        const lateHealthyPreserve = isKeyRound(parsed, 5, 1) && state.level < 9 && hp > hpThreshold + 10 && state.gold >= 40;
        const staleTargetPairPivot = highestTargetPairCount < 2 && ((isKeyRound(parsed, 4, 2) && hp > hpThreshold + 6 && state.gold >= 24) || (isKeyRound(parsed, 4, 5) && hp > hpThreshold + 6 && state.gold >= 24) || (isKeyRound(parsed, 5, 1) && hp > hpThreshold + 10 && state.gold >= 32));
        const dropLowValueChase = parsed !== null && parsed.stage >= 5 && hp <= hpThreshold && highestTargetPairCount < 2;

        if ((isKeyRound(parsed, 4, 2) || isKeyRound(parsed, 5, 1)) && highestTargetPairCount >= 2 && hp > hpThreshold + 8 && state.gold >= 24) {
            addPlan("LEVEL_UP", 89, "4-2 / 5-1 目标对子已成型且血量健康，优先贪人口吃上限", { count: 1 });
        }

        for (const offer of state.shop) {
            if (!offer.unit || offer.cost === null) {
                continue;
            }
            if (offer.cost > spendableGold) {
                continue;
            }

            const isTarget = targetNames.has(offer.unit.name);
            const pairCount = ownedCounts.get(offer.unit.name) ?? 0;
            const canUpgradeSoon = pairCount >= 2;
            const onStabilizeRound = isKeyRound(parsed, 3, 2) || isKeyRound(parsed, 4, 2);
            const willingToSpend =
                spent + offer.cost <= softBudget ||
                mustStabilize ||
                onStabilizeRound ||
                canUpgradeSoon;

            if (!willingToSpend) {
                continue;
            }

            if (!isTarget && !canUpgradeSoon && offer.cost > 2 && context.strategyPreset !== "FAST8") {
                continue;
            }

            if (!isTarget && !canUpgradeSoon && context.strategyPreset === "FAST8" && (offer.cost ?? 0) <= 2) {
                continue;
            }

            if (isTarget && staleTargetPairPivot && !canUpgradeSoon) {
                continue;
            }

            if (isTarget && dropLowValueChase && !canUpgradeSoon && (offer.cost ?? 0) <= 3) {
                continue;
            }

            // 使用融合评分调整优先级
            const basePriority = canUpgradeSoon ? 95 : isTarget ? 90 : 72;
            const fusionBoost = isTarget ? Math.round((bestFusionScore - 50) / 10) : 0;
            const adjustedPriority = Math.min(100, basePriority + fusionBoost);
            
            addPlan(
                "BUY",
                adjustedPriority,
                canUpgradeSoon
                    ? `检测到 ${offer.unit.name} 可合成升星，优先补对子`
                    : isTarget
                        ? `目标棋子 ${offer.unit.name} 出现在商店，按阵容节奏补牌`
                        : `补充中期过渡牌 ${offer.unit.name}`,
                {
                    slot: offer.slot,
                    champion: offer.unit.name,
                    cost: offer.cost,
                }
            );

            spent += offer.cost;
            spendableGold -= offer.cost;
            ownedCounts.set(offer.unit.name, pairCount + 1);
        }

        const boardMissing = Math.max(0, state.level - state.board.length);
        if (boardMissing > 0 && state.bench.length > 0) {
            const candidates = [...state.bench].sort((a, b) => unitPower(b) - unitPower(a));
            for (let i = 0; i < Math.min(boardMissing, candidates.length); i += 1) {
                const unit = candidates[i];
                if (!unit.location) {
                    continue;
                }
                addPlan("MOVE", 88 - i, `人口未满，上场战力更高的备战席单位 ${unit.name}`, {
                    fromBench: unit.location,
                    toBoard: "AUTO_SLOT",
                    champion: unit.name,
                });
            }
        }

        if (isBenchOverflowed(state) && hp <= hpThreshold && state.gold < 12) {
            const sellCandidate = [...state.bench]
                .filter((unit) => !targetNames.has(unit.name))
                .sort((a, b) => (a.cost ?? 99) - (b.cost ?? 99) || a.star - b.star)[0];
            if (sellCandidate?.location) {
                addPlan("SELL", 75, `备战席压力过大且血量危险，卖掉低价值单位 ${sellCandidate.name} 腾格子`, {
                    location: sellCandidate.location,
                    champion: sellCandidate.name,
                });
            }
        }

        if (state.stageType === GameStageType.PVP) {
            const keyStabilizeRound = isKeyRound(parsed, 3, 2) || isKeyRound(parsed, 4, 2);
            const lateRollDownRound = isKeyRound(parsed, 4, 5) || isKeyRound(parsed, 5, 1);
            const lateSmallDRound = isKeyRound(parsed, 4, 5) || isKeyRound(parsed, 5, 1);
            const targetPairTriBandActive = highestTargetPairCount >= 2 && (isKeyRound(parsed, 4, 2) || isKeyRound(parsed, 5, 1));
            // 5阶段低血量优先进入止损 all-in，避免被通用的小 D 稳场逻辑吃掉。
            const lateStageAllIn = parsed !== null && parsed.stage >= 5 && hp <= 20 && state.gold >= 12;
            if (lateStageAllIn) {
                const baseRoll =
                    hp <= 20 ? 6 :
                    hp <= 30 ? 5 :
                    4;
                const count = Math.max(
                    1,
                    Math.min(context.maxRollCount ?? Number.MAX_SAFE_INTEGER, Math.floor(state.gold / 6), baseRoll)
                );
                addPlan("ROLL", 84, "5 阶段低血量进入全力止损节奏，集中 D 牌找即时提升", { count });
            } else if (lateSmallDRound && hp > hpThreshold - 8 && hp <= hpThreshold + 8 && state.gold >= 12) {
                addPlan("ROLL", 83, "4-5 / 5-1 中血量小 D 稳血，先找即时提升再决定是否 all-in", { count: 2 });
            } else if (lateRollDownRound && hp <= hpThreshold && state.gold >= 12) {
                const count = hp <= 20 ? 5 : hp <= 30 ? 4 : 3;
                addPlan("ROLL", 83, "4-5 / 5-1 进入低血量 roll-down，先稳血再谈贪经济", { count });
            } else if (targetPairTriBandActive && hp <= hpThreshold && state.gold >= 16) {
                const count = hp <= 20 ? 5 : 4;
                addPlan("ROLL", 81, "4-2 / 5-1 目标对子在危险血量下先稳血，避免贪升级", { count });
            } else if (!((isKeyRound(parsed, 4, 2) || isKeyRound(parsed, 5, 1)) && highestTargetPairCount >= 2 && hp > hpThreshold + 8) && !midgameRecoveryLevel && !lateHealthyPreserve && ((mustStabilize && state.gold >= 12) || (keyStabilizeRound && weakBoard && !shouldProtectLossStreak && state.gold >= 16))) {
                const baseRoll =
                    hp <= 20 ? 5 :
                    hp <= 30 ? 4 :
                    hp <= hpThreshold ? 3 : 2;
                const pairAllInStage = context.pairAllInStage ?? 4;
                const allInPairThreshold = context.allInPairThreshold ?? 2;
                const extraRollBudget =
                    highestTargetPairCount >= allInPairThreshold &&
                    parsed !== null &&
                    parsed.stage >= pairAllInStage
                        ? context.upgradeAllInExtraBudget ?? 8
                        : 0;
                const baseRollBudget = Math.max(0, state.gold - (hp <= hpThreshold ? 0 : economyFloor));
                const count = extraRollBudget > 0
                    ? Math.max(
                        1,
                        Math.min(
                            context.maxRollCount ?? Number.MAX_SAFE_INTEGER,
                            Math.max(baseRoll, Math.floor((baseRollBudget + extraRollBudget) / 2))
                        )
                    )
                    : Math.max(1, Math.min(baseRoll, Math.floor(baseRollBudget / 2)));
                addPlan("ROLL", 82, targetPairTriBandActive ? "4-2 / 5-1 目标对子进入受控稳血节奏" : "战力或血量触发保命节奏，执行小规模 D 牌稳场", { count });
            } else if (weakBoard && state.gold > economyFloor + 6 && !lateHealthyPreserve) {
                addPlan("ROLL", 52, "当前战力偏弱且经济允许，补一次 D 牌找即时提升", { count: 1 });
            }
        }

        if (state.items.length > 0 && state.board.length > 0) {
            const carry = chooseCarryUnit(state.board, targetNames);
            if (carry) {
                addPlan("EQUIP", 58, `优先将装备补给主力单位 ${carry.name}`, {
                    itemIndex: 0,
                    itemName: state.items[0],
                    toBoard: carry.location ?? "AUTO_SLOT",
                });
            }
        }

        if (plans.length === 0) {
            addPlan("NOOP", 0, "当前局面无需强行动作，保持经济并继续观察", {});
        }

        return plans
            .sort((a, b) => b.priority - a.priority || a.tick - b.tick)
            .slice(0, 8);
    }

    /**
     * Export a compact strategy representation as JSON string.
     * It serializes the top generated plan (if any) into a Strategy object.
     */
    public exportStrategy(state: ObservedState, context: DecisionContext = {}): string {
        const plans = this.generatePlan(state, context);
        const strategy = plans[0]
            ? {
                  planType: plans[0].type,
                  priority: plans[0].priority,
                  reason: plans[0].reason,
              }
            : { planType: "NOOP" as const, priority: 0, reason: "no-op" };
        return JSON.stringify(strategy);
    }

    /**
     * Import a strategy from JSON string. Returns true if the strategy was valid and applied.
     * This method validates fields and updates the provided context accordingly (shallow mapping).
     */
    public importStrategy(json: string, context: DecisionContext): boolean {
        try {
            const parsed = JSON.parse(json) as unknown;
            if (!parsed || typeof parsed !== "object") return false;

            // Validate required fields
            const planType = (parsed as any).planType;
            const priority = (parsed as any).priority;
            const reason = (parsed as any).reason;

            const validPlanTypes = new Set<ActionPlan["type"]>([
                "BUY",
                "SELL",
                "ROLL",
                "LEVEL_UP",
                "MOVE",
                "EQUIP",
                "PICK_AUGMENT",
                "NOOP",
            ]);

            if (typeof planType !== "string" || !validPlanTypes.has(planType as ActionPlan["type"])) {
                return false;
            }
            if (typeof priority !== "number" || !Number.isFinite(priority) || priority < 0 || priority > 100) {
                return false;
            }
            if (typeof reason !== "string") {
                return false;
            }

            // Apply strategy to context in a minimal, safe manner. We don't mutate engine state here.
            // Map some plan hints into DecisionContext fields where sensible.
            // For example, a NOOP with low priority -> conservative economy.
            if (planType === "ROLL" && priority >= 80) {
                // suggest more aggressive roll behaviour
                context.maxRollCount = Math.max(context.maxRollCount ?? 0, 3);
            }
            if (planType === "LEVEL_UP" && priority >= 90) {
                context.pairAllInStage = Math.min(context.pairAllInStage ?? 4, 4);
            }

            return true;
        } catch (e) {
            return false;
        }
    }
}
