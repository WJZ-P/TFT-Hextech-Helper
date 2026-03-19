import fs from "fs";
import path from "path";
import { androidSimulationRunner } from "../src-backend/services/AndroidSimulationRunner";
import type { DecisionContext, ObservedState } from "../src-backend/core/types";

function printUsage(): void {
    console.log("Usage:");
    console.log("  npm run android:sim -- <state-json-path>");
    console.log("  npm run android:sim -- --scenario android-reroll-midgame");
    console.log("  npm run android:sim -- --list-scenarios");
    console.log("  npm run android:sim -- <state-json-path> --targets 安妮,辛德拉 --preset REROLL --hp-threshold 35");
}

async function loadScenarioState(id: string): Promise<{ state: ObservedState; context: DecisionContext }> {
    const scenarios = await androidSimulationRunner.listScenarios();
    const scenario = scenarios.find((item) => item.id === id);

    if (!scenario) {
        throw new Error(`未找到内置场景: ${id}`);
    }

    return {
        state: scenario.state,
        context: scenario.context,
    };
}

async function main(): Promise<void> {
    const [, , ...args] = process.argv;

    if (args.includes("--list-scenarios")) {
        const scenarios = await androidSimulationRunner.listScenarios();
        console.log(JSON.stringify({ scenarios }, null, 2));
        return;
    }

    let state: ObservedState | null = null;
    const context: DecisionContext = {};

    for (let i = 0; i < args.length; i += 1) {
        const arg = args[i];

        if ((arg === "--scenario" || arg === "-s") && args[i + 1]) {
            const payload = await loadScenarioState(args[i + 1]);
            state = payload.state;
            Object.assign(context, payload.context);
            i += 1;
            continue;
        }

        if ((arg === "--targets" || arg === "-t") && args[i + 1]) {
            context.targetChampionNames = args[i + 1]
                .split(",")
                .map((name) => name.trim())
                .filter(Boolean);
            i += 1;
            continue;
        }

        if ((arg === "--preset" || arg === "-p") && args[i + 1]) {
            const preset = String(args[i + 1]).toUpperCase();
            if (preset === "STANDARD" || preset === "FAST8" || preset === "REROLL") {
                context.strategyPreset = preset;
            }
            i += 1;
            continue;
        }

        if (arg === "--hp-threshold" && args[i + 1]) {
            const value = Number(args[i + 1]);
            if (Number.isFinite(value)) {
                context.stabilizeHpThreshold = value;
            }
            i += 1;
            continue;
        }

        if (!arg.startsWith("-") && !state) {
            const statePath = path.resolve(process.cwd(), arg);
            if (!fs.existsSync(statePath)) {
                throw new Error(`State file not found: ${statePath}`);
            }

            const payload = JSON.parse(fs.readFileSync(statePath, "utf8")) as {
                state?: ObservedState;
                context?: DecisionContext;
            };

            state = (payload.state ?? payload) as ObservedState;
            Object.assign(context, payload.context ?? {});
        }
    }

    if (!state) {
        printUsage();
        process.exitCode = 1;
        return;
    }

    const result = await androidSimulationRunner.planOnce(state, context);
    console.log(JSON.stringify(result, null, 2));
}

void main();
