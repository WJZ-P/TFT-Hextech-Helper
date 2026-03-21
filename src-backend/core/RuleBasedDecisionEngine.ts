import { GameStageType } from "../TFTProtocol";
import type { ActionPlan, DecisionContext, DecisionEngine, ObservedState, ObservedUnit } from "./types";

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
            } else if (parsed && parsed.stage >= 5 && state.level < 9 && state.gold >= 50 && hp > hpThreshold) {
                addPlan("LEVEL_UP", 78, "后期经济充足且血量健康，准备上 9 提升上限", { count: 1 });
            }
        }

        const ownedCounts = countOwnedUnits([...state.bench, ...state.board]);
        let spendableGold = state.gold;
        const softBudget = Math.max(0, state.gold - economyFloor);
        let spent = 0;

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

            addPlan(
                "BUY",
                canUpgradeSoon ? 95 : isTarget ? 90 : 72,
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
            if ((mustStabilize && state.gold >= 12) || (keyStabilizeRound && weakBoard && !shouldProtectLossStreak && state.gold >= 16)) {
                const baseRoll =
                    hp <= 20 ? 5 :
                    hp <= 30 ? 4 :
                    hp <= hpThreshold ? 3 : 2;
                const rollBudget = Math.max(0, state.gold - (hp <= hpThreshold ? 0 : economyFloor));
                const count = Math.max(1, Math.min(baseRoll, Math.floor(rollBudget / 2)));
                addPlan("ROLL", 82, "战力或血量触发保命节奏，执行小规模 D 牌稳场", { count });
            } else if (weakBoard && state.gold > economyFloor + 6) {
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
}
