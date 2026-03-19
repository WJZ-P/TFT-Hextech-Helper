import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { GameStageType } from "../TFTProtocol";
import { createDefaultDecisionEngine } from "../core/DecisionEngineFactory";
import type { ActionPlan, DecisionContext, ObservedState } from "../core/types";
import { buildAndroidExecutionPlan, type AndroidExecutionPlan } from "../adapters/AndroidActionPlanner";

export interface AndroidSimulationScenario {
    id: string;
    label: string;
    description: string;
    state: ObservedState;
    context: DecisionContext;
    sequence?: {
        id: string;
        label: string;
        index: number;
        total?: number;
    };
}

interface AndroidScenarioFile {
    id?: string;
    label?: string;
    description?: string;
    state: Partial<ObservedState>;
    context?: DecisionContext;
    sequence?: {
        id?: string;
        label?: string;
        index?: number;
        total?: number;
    };
}

export interface AndroidSimulationResult {
    state: ObservedState;
    context: DecisionContext;
    plans: ActionPlan[];
    executionPlan: AndroidExecutionPlan;
}

const LOCAL_SCENARIO_DIR = path.resolve(process.cwd(), "examples", "android-simulator");
const REPO_SCENARIO_DIR = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "examples",
    "android-simulator"
);

function withAndroidDefaults(state: Partial<ObservedState>): ObservedState {
    return {
        timestamp: state.timestamp ?? Date.now(),
        client: (state.client ?? "ANDROID") as ObservedState["client"],
        target: state.target ?? "ANDROID_EMULATOR",
        stageText: state.stageText ?? "",
        stageType: state.stageType ?? GameStageType.UNKNOWN,
        level: state.level ?? 1,
        currentXp: state.currentXp ?? 0,
        totalXp: state.totalXp ?? 0,
        gold: state.gold ?? 0,
        hp: state.hp,
        streak: state.streak,
        patch: state.patch,
        bench: state.bench ?? [],
        board: state.board ?? [],
        shop: state.shop ?? [],
        items: state.items ?? [],
        activeTraits: state.activeTraits,
        augments: state.augments,
        metadata: state.metadata,
    };
}

async function findScenarioDirectory(): Promise<string | null> {
    for (const candidate of [LOCAL_SCENARIO_DIR, REPO_SCENARIO_DIR]) {
        try {
            const stat = await fs.stat(candidate);
            if (stat.isDirectory()) {
                return candidate;
            }
        } catch {
            // ignore
        }
    }

    return null;
}

function buildScenarioId(fileName: string, payload: AndroidScenarioFile): string {
    if (payload.id && payload.id.trim().length > 0) {
        return payload.id.trim();
    }

    return path.basename(fileName, path.extname(fileName));
}

function buildScenarioLabel(fileName: string, payload: AndroidScenarioFile): string {
    if (payload.label && payload.label.trim().length > 0) {
        return payload.label.trim();
    }

    return buildScenarioId(fileName, payload);
}

function buildScenarioDescription(payload: AndroidScenarioFile): string {
    if (payload.description && payload.description.trim().length > 0) {
        return payload.description.trim();
    }

    return "安卓端离线回放样例";
}

function buildScenarioSequence(payload: AndroidScenarioFile): AndroidSimulationScenario["sequence"] {
    if (!payload.sequence?.id || !payload.sequence?.label || payload.sequence.index === undefined) {
        return undefined;
    }

    return {
        id: payload.sequence.id,
        label: payload.sequence.label,
        index: payload.sequence.index,
        total: payload.sequence.total,
    };
}

export class AndroidSimulationRunner {
    private engine = createDefaultDecisionEngine();

    public async planOnce(
        rawState: Partial<ObservedState>,
        context: DecisionContext = {}
    ): Promise<AndroidSimulationResult> {
        const state = withAndroidDefaults(rawState);
        const plans = this.engine.generatePlan(state, context);
        const executionPlan = buildAndroidExecutionPlan(plans, state);

        return {
            state,
            context,
            plans,
            executionPlan,
        };
    }

    public async listScenarios(): Promise<AndroidSimulationScenario[]> {
        const scenarioDir = await findScenarioDirectory();
        if (!scenarioDir) {
            return [];
        }

        const files = await fs.readdir(scenarioDir);
        const scenarios = await Promise.all(
            files
                .filter((fileName) => fileName.toLowerCase().endsWith(".json"))
                .sort((a, b) => a.localeCompare(b))
                .map(async (fileName) => {
                    const fullPath = path.join(scenarioDir, fileName);
                    const payload = JSON.parse(await fs.readFile(fullPath, "utf8")) as AndroidScenarioFile;
                    return {
                        id: buildScenarioId(fileName, payload),
                        label: buildScenarioLabel(fileName, payload),
                        description: buildScenarioDescription(payload),
                        state: withAndroidDefaults(payload.state),
                        context: payload.context ?? {},
                        sequence: buildScenarioSequence(payload),
                    } satisfies AndroidSimulationScenario;
                })
        );

        return scenarios.sort((left, right) => {
            const leftSequence = left.sequence;
            const rightSequence = right.sequence;

            if (leftSequence && rightSequence && leftSequence.id === rightSequence.id) {
                return leftSequence.index - rightSequence.index;
            }

            if (leftSequence && rightSequence && leftSequence.label !== rightSequence.label) {
                return leftSequence.label.localeCompare(rightSequence.label);
            }

            if (leftSequence && !rightSequence) {
                return -1;
            }

            if (!leftSequence && rightSequence) {
                return 1;
            }

            return left.label.localeCompare(right.label);
        });
    }
}

export const androidSimulationRunner = new AndroidSimulationRunner();
