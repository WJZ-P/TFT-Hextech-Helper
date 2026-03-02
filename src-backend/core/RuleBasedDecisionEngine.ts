import { GameStageType } from "../TFTProtocol";
import type { ActionPlan, DecisionContext, DecisionEngine, ObservedState, ObservedUnit } from "./types";

const DEFAULT_ECONOMY_FLOOR = 30;

function countOwnedUnits(units: ObservedUnit[]): Map<string, number> {
    const owned = new Map<string, number>();
    for (const unit of units) {
        owned.set(unit.name, (owned.get(unit.name) ?? 0) + 1);
    }
    return owned;
}

export class RuleBasedDecisionEngine implements DecisionEngine {
    public generatePlan(state: ObservedState, context: DecisionContext = {}): ActionPlan[] {
        const plans: ActionPlan[] = [];
        const targetNames = new Set((context.targetChampionNames ?? []).filter(Boolean));
        const economyFloor = Math.max(0, context.conservativeEconomyFloor ?? DEFAULT_ECONOMY_FLOOR);

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

        const ownedCounts = countOwnedUnits([...state.bench, ...state.board]);
        let spendableGold = state.gold;
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

            if (!isTarget && !canUpgradeSoon) {
                continue;
            }

            addPlan(
                "BUY",
                isTarget ? 95 : 88,
                isTarget ? `目标棋子 ${offer.unit.name} 出现在商店` : `检测到 ${offer.unit.name} 可追三连，优先补对子`,
                {
                    slot: offer.slot,
                    champion: offer.unit.name,
                    cost: offer.cost,
                }
            );

            spendableGold -= offer.cost;
        }

        const boardMissing = Math.max(0, state.level - state.board.length);
        if (boardMissing > 0 && state.bench.length > 0) {
            const candidates = [...state.bench].sort((a, b) => {
                if (b.star !== a.star) {
                    return b.star - a.star;
                }
                return (b.cost ?? 0) - (a.cost ?? 0);
            });

            for (let i = 0; i < Math.min(boardMissing, candidates.length); i += 1) {
                const unit = candidates[i];
                if (!unit.location) {
                    continue;
                }
                addPlan("MOVE", 90 - i, `人口未满，上场更高战力的备战席棋子 ${unit.name}`, {
                    fromBench: unit.location,
                    toBoard: "AUTO_SLOT",
                    champion: unit.name,
                });
            }
        }

        if (state.stageType === GameStageType.PVP && state.level < 9 && state.gold >= 54) {
            addPlan("LEVEL_UP", 70, "经济充足，优先提人口提升上限", { count: 1 });
        } else if (state.stageType === GameStageType.PVP && state.gold > economyFloor + 2) {
            addPlan("ROLL", 45, "高于保底经济，允许小额 D 牌提质量", { count: 1 });
        }

        if (state.items.length > 0 && state.board.length > 0) {
            const carry = [...state.board].sort((a, b) => {
                if (b.star !== a.star) {
                    return b.star - a.star;
                }
                return (b.cost ?? 0) - (a.cost ?? 0);
            })[0];

            addPlan("EQUIP", 55, `将首件装备分配给当前最高战力单位 ${carry.name}`, {
                itemIndex: 0,
                itemName: state.items[0],
                toBoard: carry.location ?? "AUTO_SLOT",
            });
        }

        if (plans.length === 0) {
            addPlan("NOOP", 0, "当前状态无高价值动作，保持观察", {});
        }

        return plans.sort((a, b) => b.priority - a.priority || a.tick - b.tick);
    }
}
