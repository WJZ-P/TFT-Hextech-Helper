import type { GameStageType } from "../TFTProtocol";
import type { GameClient } from "../utils/SettingsStore";

export type PlatformTarget = "ANDROID_EMULATOR" | "PC_LOGIC";

export type ActionType =
    | "BUY"
    | "SELL"
    | "ROLL"
    | "LEVEL_UP"
    | "MOVE"
    | "EQUIP"
    | "PICK_AUGMENT"
    | "NOOP";

export interface ObservedUnit {
    id: string;
    name: string;
    star: number;
    cost?: number;
    location?: string;
    items: string[];
    traits: string[];
}

export interface ObservedTrait {
    name: string;
    count: number;
    required: number | null;
    levels: number[];
    active: boolean;
}

export interface ShopOffer {
    slot: number;
    unit: ObservedUnit | null;
    cost: number | null;
}

export interface AugmentOffer {
    slot: number;
    name: string;
    score?: number;
}

export interface ObservedState {
    timestamp: number;
    client: GameClient;
    target: PlatformTarget;
    patch?: string;
    stageText: string;
    stageType: GameStageType;
    level: number;
    currentXp: number;
    totalXp: number;
    gold: number;
    hp?: number;
    streak?: number;
    bench: ObservedUnit[];
    board: ObservedUnit[];
    shop: ShopOffer[];
    items: string[];
    activeTraits?: ObservedTrait[];
    augments?: AugmentOffer[];
    metadata?: Record<string, unknown>;
}

export interface ActionPlan {
    tick: number;
    type: ActionType;
    payload: Record<string, unknown>;
    priority: number;
    reason: string;
}

export interface DecisionContext {
    targetChampionNames?: string[];
    conservativeEconomyFloor?: number;
    strategyPreset?: "STANDARD" | "FAST8" | "REROLL";
    stabilizeHpThreshold?: number;
}

export interface DecisionEngine {
    generatePlan(state: ObservedState, context?: DecisionContext): ActionPlan[];
}

export interface AdapterHealth {
    ok: boolean;
    detail?: string;
}

export interface GameAdapter {
    readonly target: PlatformTarget;
    attach(): Promise<void>;
    observe(): Promise<ObservedState>;
    execute(actions: ActionPlan[]): Promise<void>;
    healthCheck(): Promise<AdapterHealth>;
}
