import fs from "fs";
import path from "path";
import { pcLogicRunner } from "../src-backend/services/PcLogicRunner";
import type { DecisionContext, ObservedState } from "../src-backend/core/types";

function printUsage(): void {
    console.log("Usage:");
    console.log("  npm run pc:logic -- <state-json-path>");
    console.log("  npm run pc:logic -- <state-json-path> --targets 安妮,巴德 --preset FAST8 --hp-threshold 45");
}

async function main(): Promise<void> {
    const [, , ...args] = process.argv;
    const statePathArg = args[0];
    if (!statePathArg) {
        printUsage();
        process.exitCode = 1;
        return;
    }

    const statePath = path.resolve(process.cwd(), statePathArg);
    if (!fs.existsSync(statePath)) {
        console.error(`State file not found: ${statePath}`);
        process.exitCode = 1;
        return;
    }

    const payload = JSON.parse(fs.readFileSync(statePath, "utf8")) as {
        state?: ObservedState;
        context?: DecisionContext;
    };

    const state = (payload.state ?? payload) as ObservedState;
    const context: DecisionContext = {
        ...(payload.context ?? {}),
    };

    for (let i = 1; i < args.length; i += 1) {
        const arg = args[i];
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
        // 兼容旧版：第二个参数直接传 targets csv
        if (!arg.startsWith("-") && !context.targetChampionNames) {
            context.targetChampionNames = arg
                .split(",")
                .map((name) => name.trim())
                .filter(Boolean);
        }
    }

    const plans = await pcLogicRunner.planOnce(state, context);
    console.log(JSON.stringify({ plans }, null, 2));
}

void main();
