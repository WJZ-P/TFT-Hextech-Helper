import { GameStageType } from "../TFTProtocol";
import { buildAndroidExecutionPlan, type AndroidExecutionPlan } from "../adapters/AndroidActionPlanner";
import type { ActionPlan, DecisionContext, DecisionEngine, GameAdapter, ObservedState } from "../core/types";
import { createDefaultDecisionEngine } from "../core/DecisionEngineFactory";
import { logger } from "../utils/Logger";

export type AndroidAutomationLoopStatus =
    | "DRY_RUN"
    | "EXECUTED"
    | "EXECUTED_WITH_WARNING"
    | "SKIPPED"
    | "PAUSED";

export interface AndroidAutomationLoopTraceState {
    stageText: string;
    stageType: string;
    level: number;
    currentXp: number;
    totalXp: number;
    gold: number;
    hp: number | null;
    shopSignature: string;
    benchSignature: string;
    boardSignature: string;
    itemSignature: string;
}

export interface AndroidAutomationVerification {
    ok: boolean;
    reason: string;
    checkedActionTypes: string[];
}

export interface AndroidAutomationLoopResult {
    status: AndroidAutomationLoopStatus;
    reason: string;
    plans: ActionPlan[];
    executionPlan: AndroidExecutionPlan;
    trace: {
        before: AndroidAutomationLoopTraceState;
        after: AndroidAutomationLoopTraceState | null;
    };
    verification: AndroidAutomationVerification | null;
}

export interface AndroidAutomationLoopOptions {
    adapter?: GameAdapter;
    engine?: DecisionEngine;
    context?: DecisionContext;
    dryRun?: boolean;
    maxVerificationFailures?: number;
    operationTimeoutMs?: number;
}

function summarizeState(state: ObservedState): AndroidAutomationLoopTraceState {
    return {
        stageText: state.stageText,
        stageType: String(state.stageType),
        level: state.level,
        currentXp: state.currentXp,
        totalXp: state.totalXp,
        gold: state.gold,
        hp: state.hp ?? null,
        shopSignature: state.shop
            .map((offer) => `${offer.slot}:${offer.unit?.id ?? offer.unit?.name ?? "empty"}`)
            .join("|"),
        benchSignature: state.bench
            .map((unit) => `${unit.location ?? ""}:${unit.id}:${unit.star}:${unit.items.join(",")}`)
            .join("|"),
        boardSignature: state.board
            .map((unit) => `${unit.location ?? ""}:${unit.id}:${unit.star}:${unit.items.join(",")}`)
            .join("|"),
        itemSignature: state.items.join("|"),
    };
}

function hasValidAndroidStage(state: ObservedState): boolean {
    const metadataHasValidStage = state.metadata?.hasValidStage;
    return (
        metadataHasValidStage !== false &&
        state.stageType !== GameStageType.UNKNOWN &&
        state.stageText.trim().length > 0
    );
}

function hasObservedLootOrbs(state: ObservedState): boolean {
    const lootOrbs = state.metadata?.lootOrbs;
    return Array.isArray(lootOrbs) && lootOrbs.length > 0;
}

function hasExcessEconomyForLevelMaintenance(state: ObservedState): boolean {
    return state.level >= 5 && state.level < 8 && state.gold >= 60;
}

function hasUnreliableHudExcessEconomyForLevelMaintenance(state: ObservedState): boolean {
    const parsed = parseStage(state.stageText);
    if (
        parsed !== null &&
        parsed.stage === 2 &&
        parsed.round >= 5 &&
        state.stageType === GameStageType.PVP &&
        state.level <= 1 &&
        state.gold >= 4
    ) {
        return true;
    }

    return (
        parsed !== null &&
        parsed.stage >= 3 &&
        (state.stageType === GameStageType.PVP || state.stageType === GameStageType.AUGMENT) &&
        state.level <= 1 &&
        state.gold >= 24
    );
}

function hasUnreliableHudSafeMaintenance(state: ObservedState): boolean {
    return (
        hasValidAndroidStage(state) &&
        !hasReliableAndroidHud(state) &&
        (
            state.stageType === GameStageType.EARLY_PVE ||
            state.stageType === GameStageType.PVE ||
            state.stageType === GameStageType.AUGMENT ||
            state.stageType === GameStageType.PVP
        )
    );
}

function isSafeUnreliableHudAction(action: ActionPlan): boolean {
    return action.type === "PICK_AUGMENT" || action.type === "PICK_LOOT" || action.type === "BUY";
}

function isUnreliableHudLevelMaintenanceAction(action: ActionPlan): boolean {
    return action.type === "LEVEL_UP" || action.type === "PICK_AUGMENT" || action.type === "PICK_LOOT";
}

function parseStageNumber(stageText: string): number | null {
    return parseStage(stageText)?.stage ?? null;
}

function parseStage(stageText: string): { stage: number; round: number } | null {
    const match = stageText.match(/^(\d+)-(\d+)$/);
    if (!match) {
        return null;
    }
    const stage = Number(match[1]);
    const round = Number(match[2]);
    return Number.isFinite(stage) && Number.isFinite(round) ? { stage, round } : null;
}

function hasReliableAndroidHud(state: ObservedState): boolean {
    const stage = parseStageNumber(state.stageText);
    if (stage !== null && stage >= 2 && state.level <= 1) {
        return false;
    }
    if (state.level < 1 || state.gold < 0 || state.currentXp < 0 || state.totalXp < 0) {
        return false;
    }
    return true;
}

function isExecutableAction(action: ActionPlan): boolean {
    return action.type !== "NOOP";
}

function buildActionSignature(actions: ActionPlan[]): string {
    return actions
        .filter(isExecutableAction)
        .map((action) => `${action.type}:${JSON.stringify(action.payload)}`)
        .join("||");
}

function verifyActions(
    actions: ActionPlan[],
    before: AndroidAutomationLoopTraceState,
    after: AndroidAutomationLoopTraceState
): AndroidAutomationVerification {
    const actionTypes = new Set(actions.filter(isExecutableAction).map((action) => action.type));
    const checkedActionTypes: string[] = [];
    const failures: string[] = [];

    if (actionTypes.has("BUY")) {
        checkedActionTypes.push("BUY");
        if (!(after.gold < before.gold || after.shopSignature !== before.shopSignature)) {
            failures.push("BUY did not change gold or shop signature");
        }
    }

    if (actionTypes.has("ROLL")) {
        checkedActionTypes.push("ROLL");
        if (after.shopSignature === before.shopSignature) {
            failures.push("ROLL did not change shop signature");
        }
    }

    if (actionTypes.has("LEVEL_UP")) {
        checkedActionTypes.push("LEVEL_UP");
        if (!(after.level > before.level || after.currentXp > before.currentXp || after.gold < before.gold)) {
            failures.push("LEVEL_UP did not change level, XP, or gold");
        }
    }

    if (actionTypes.has("MOVE")) {
        checkedActionTypes.push("MOVE");
        if (after.boardSignature === before.boardSignature && after.benchSignature === before.benchSignature) {
            failures.push("MOVE did not change board or bench signature");
        }
    }

    if (actionTypes.has("EQUIP")) {
        checkedActionTypes.push("EQUIP");
        if (after.boardSignature === before.boardSignature && after.itemSignature === before.itemSignature) {
            failures.push("EQUIP did not change board items or inventory signature");
        }
    }

    if (checkedActionTypes.length === 0) {
        return {
            ok: true,
            reason: "No verifiable action types in plan",
            checkedActionTypes,
        };
    }

    return {
        ok: failures.length === 0,
        reason: failures.length === 0 ? "Post-action verification passed" : failures.join("; "),
        checkedActionTypes,
    };
}

export class AndroidAutomationLoop {
    private adapter: GameAdapter | null;
    private readonly engine: DecisionEngine;
    private readonly context: DecisionContext;
    private readonly dryRun: boolean;
    private readonly maxVerificationFailures: number;
    private readonly operationTimeoutMs: number;
    private readonly failedActionSignatures = new Map<string, number>();
    private timedOutOperationActive = false;

    constructor(options: AndroidAutomationLoopOptions = {}) {
        this.adapter = options.adapter ?? null;
        this.engine = options.engine ?? createDefaultDecisionEngine();
        this.context = options.context ?? {};
        this.dryRun = options.dryRun ?? true;
        this.maxVerificationFailures = Math.max(1, options.maxVerificationFailures ?? 2);
        this.operationTimeoutMs = Math.max(1, options.operationTimeoutMs ?? 60000);
    }

    public async runOnce(): Promise<AndroidAutomationLoopResult> {
        const adapter = await this.getAdapter();
        const beforeStateResult = await this.runAdapterOperation("observe before action", () => adapter.observe());
        if (!beforeStateResult.ok) {
            return this.buildSkippedResult("PAUSED", beforeStateResult.reason);
        }

        const beforeState = beforeStateResult.value;
        const before = summarizeState(beforeState);
        const allowLootOnlyMaintenance = !hasValidAndroidStage(beforeState) && hasObservedLootOrbs(beforeState);
        const allowLevelOnlyMaintenance =
            !hasValidAndroidStage(beforeState) &&
            hasExcessEconomyForLevelMaintenance(beforeState);
        const allowUnreliableHudLevelOnlyMaintenance =
            hasValidAndroidStage(beforeState) &&
            !hasReliableAndroidHud(beforeState) &&
            hasUnreliableHudExcessEconomyForLevelMaintenance(beforeState);
        const allowUnreliableHudSafeMaintenance =
            !allowUnreliableHudLevelOnlyMaintenance &&
            hasUnreliableHudSafeMaintenance(beforeState);
        if (!hasValidAndroidStage(beforeState) && !allowLootOnlyMaintenance && !allowLevelOnlyMaintenance) {
            const foregroundState = beforeState.metadata?.foregroundState;
            const foregroundReason = beforeState.metadata?.foregroundReason;
            return this.buildResult({
                status: "SKIPPED",
                reason: typeof foregroundState === "string"
                    ? `Android foreground is not live content (${foregroundState}); execution skipped${typeof foregroundReason === "string" ? `: ${foregroundReason}` : ""}`
                    : "Android stage is unknown or invalid; execution skipped",
                plans: [],
                executionPlan: buildAndroidExecutionPlan([], beforeState),
                before,
                after: null,
                verification: null,
            });
        }

        if (
            !allowLootOnlyMaintenance &&
            !allowUnreliableHudLevelOnlyMaintenance &&
            !allowUnreliableHudSafeMaintenance &&
            !hasReliableAndroidHud(beforeState)
        ) {
            return this.buildResult({
                status: "SKIPPED",
                reason: "Android HUD is inconsistent with stage; execution skipped",
                plans: [],
                executionPlan: buildAndroidExecutionPlan([], beforeState),
                before,
                after: null,
                verification: null,
            });
        }

        const generatedPlans = this.engine.generatePlan(beforeState, this.context);
        const plans = allowLootOnlyMaintenance && allowLevelOnlyMaintenance
            ? generatedPlans.filter((plan) => plan.type === "PICK_LOOT" || plan.type === "LEVEL_UP")
            : allowLootOnlyMaintenance
            ? generatedPlans.filter((plan) => plan.type === "PICK_LOOT")
              : allowLevelOnlyMaintenance
              ? generatedPlans.filter((plan) => plan.type === "LEVEL_UP")
              : allowUnreliableHudLevelOnlyMaintenance
              ? generatedPlans.filter(isUnreliableHudLevelMaintenanceAction)
              : allowUnreliableHudSafeMaintenance
              ? generatedPlans.filter(isSafeUnreliableHudAction)
              : generatedPlans;
        const executionPlan = buildAndroidExecutionPlan(plans, beforeState);
        const executablePlans = plans.filter(isExecutableAction);
        const actionSignature = buildActionSignature(executablePlans);

        if (executablePlans.length === 0 || actionSignature.length === 0) {
            return this.buildResult({
                status: "SKIPPED",
                reason: "No executable Android actions in this tick",
                plans,
                executionPlan,
                before,
                after: null,
                verification: null,
            });
        }

        const previousFailures = this.failedActionSignatures.get(actionSignature) ?? 0;
        if (previousFailures >= this.maxVerificationFailures) {
            return this.buildResult({
                status: "PAUSED",
                reason: `Action signature paused after ${previousFailures} verification failure(s)`,
                plans,
                executionPlan,
                before,
                after: null,
                verification: null,
            });
        }

        const healthResult = await this.runAdapterOperation("health check", () => adapter.healthCheck());
        if (!healthResult.ok) {
            return this.buildSkippedResult("PAUSED", healthResult.reason);
        }

        const health = healthResult.value;
        if (!health.ok) {
            return this.buildSkippedResult("PAUSED", `Adapter health check failed: ${health.detail ?? "unknown"}`);
        }

        if (this.dryRun) {
            return this.buildResult({
                status: "DRY_RUN",
                reason: "Dry-run mode: actions planned but not executed",
                plans,
                executionPlan,
                before,
                after: null,
                verification: null,
            });
        }

        const executeResult = await this.runAdapterOperation("execute action plan", () => adapter.execute(executablePlans));
        if (!executeResult.ok) {
            return this.buildResult({
                status: "PAUSED",
                reason: executeResult.reason,
                plans,
                executionPlan,
                before,
                after: null,
                verification: {
                    ok: false,
                    reason: executeResult.reason,
                    checkedActionTypes: executablePlans.map((action) => action.type),
                },
            });
        }

        const afterStateResult = await this.runAdapterOperation("observe after action", () => adapter.observe());
        if (!afterStateResult.ok) {
            return this.buildResult({
                status: "EXECUTED_WITH_WARNING",
                reason: afterStateResult.reason,
                plans,
                executionPlan,
                before,
                after: null,
                verification: {
                    ok: false,
                    reason: afterStateResult.reason,
                    checkedActionTypes: executablePlans.map((action) => action.type),
                },
            });
        }

        const afterState = afterStateResult.value;
        const after = summarizeState(afterState);
        const verification = verifyActions(executablePlans, before, after);
        if (verification.ok) {
            this.failedActionSignatures.delete(actionSignature);
        } else {
            this.failedActionSignatures.set(actionSignature, previousFailures + 1);
            logger.warn(`[AndroidAutomationLoop] 动作后验证失败: ${verification.reason}`);
        }

        return this.buildResult({
            status: verification.ok ? "EXECUTED" : "EXECUTED_WITH_WARNING",
            reason: verification.reason,
            plans,
            executionPlan,
            before,
            after,
            verification,
        });
    }

    private async getAdapter(): Promise<GameAdapter> {
        if (!this.adapter) {
            const { AndroidEmulatorAdapter } = await import("../adapters/AndroidEmulatorAdapter");
            this.adapter = new AndroidEmulatorAdapter();
        }
        return this.adapter;
    }

    private async runAdapterOperation<T>(
        label: string,
        operation: () => Promise<T>
    ): Promise<{ ok: true; value: T } | { ok: false; reason: string }> {
        if (this.timedOutOperationActive) {
            return {
                ok: false,
                reason:
                    `Adapter ${label} skipped because a previous timed-out adapter operation is still settling; ` +
                    "avoiding overlapping ADB/OCR work",
            };
        }

        let timeoutId: NodeJS.Timeout | null = null;
        let timedOut = false;
        try {
            const operationPromise = operation();
            operationPromise
                .catch((error) => {
                    if (timedOut) {
                        const message = error instanceof Error ? error.message : String(error);
                        logger.warn(`[AndroidAutomationLoop] ${label} 后台操作在超时后失败: ${message}`);
                    }
                })
                .finally(() => {
                    if (timedOut) {
                        this.timedOutOperationActive = false;
                    }
                });
            const timeout = new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    timedOut = true;
                    this.timedOutOperationActive = true;
                    reject(new Error(`Adapter ${label} timed out after ${this.operationTimeoutMs}ms`));
                }, this.operationTimeoutMs);
            });
            const value = await Promise.race([operationPromise, timeout]);
            return { ok: true, value };
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn(`[AndroidAutomationLoop] ${label} 失败: ${message}`);
            return {
                ok: false,
                reason: `Adapter ${label} failed: ${message}`,
            };
        } finally {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
        }
    }

    private buildSkippedResult(status: AndroidAutomationLoopStatus, reason: string): AndroidAutomationLoopResult {
        return {
            status,
            reason,
            plans: [],
            executionPlan: buildAndroidExecutionPlan([]),
            trace: {
                before: {
                    stageText: "",
                    stageType: String(GameStageType.UNKNOWN),
                    level: 0,
                    currentXp: 0,
                    totalXp: 0,
                    gold: 0,
                    hp: null,
                    shopSignature: "",
                    benchSignature: "",
                    boardSignature: "",
                    itemSignature: "",
                },
                after: null,
            },
            verification: null,
        };
    }

    private buildResult(input: {
        status: AndroidAutomationLoopStatus;
        reason: string;
        plans: ActionPlan[];
        executionPlan: AndroidExecutionPlan;
        before: AndroidAutomationLoopTraceState;
        after: AndroidAutomationLoopTraceState | null;
        verification: AndroidAutomationVerification | null;
    }): AndroidAutomationLoopResult {
        return {
            status: input.status,
            reason: input.reason,
            plans: input.plans,
            executionPlan: input.executionPlan,
            trace: {
                before: input.before,
                after: input.after,
            },
            verification: input.verification,
        };
    }
}
