import fs from "fs";
import path from "path";
import { pcLogicRunner } from "../src-backend/services/PcLogicRunner";
import type { DecisionContext, ObservedState } from "../src-backend/core/types";

function printUsage(): void {
    console.log("Usage: npm run pc:logic -- <state-json-path> [target1,target2,...]");
}

async function main(): Promise<void> {
    const [, , statePathArg, targetArg] = process.argv;
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
    const context: DecisionContext = payload.context ?? {};
    if (targetArg && !context.targetChampionNames) {
        context.targetChampionNames = targetArg
            .split(",")
            .map((name) => name.trim())
            .filter(Boolean);
    }

    const plans = await pcLogicRunner.planOnce(state, context);
    console.log(JSON.stringify({ plans }, null, 2));
}

void main();
