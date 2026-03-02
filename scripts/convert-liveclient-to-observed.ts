import fs from "fs";
import path from "path";
import type { ObservedState, ObservedUnit, ShopOffer } from "../src-backend/core/types";
import { GameStageType } from "../src-backend/TFTProtocol";

interface LiveClientPayload {
    activePlayer?: {
        level?: number;
        currentGold?: number;
        championStats?: {
            currentHealth?: number;
        };
    };
}

interface OcrPayload {
    stageText?: string;
    stageType?: string;
    bench?: Array<Partial<ObservedUnit>>;
    board?: Array<Partial<ObservedUnit>>;
    shop?: Array<{ slot?: number; name?: string; cost?: number; unit?: Partial<ObservedUnit> | null }>;
    items?: string[];
}

interface InputPayload {
    liveclient?: LiveClientPayload;
    ocr?: OcrPayload;
    metadata?: Record<string, unknown>;
}

function parseStageType(value: string | undefined): GameStageType {
    if (!value) {
        return GameStageType.UNKNOWN;
    }
    if (Object.values(GameStageType).includes(value as GameStageType)) {
        return value as GameStageType;
    }
    return GameStageType.UNKNOWN;
}

function mapUnit(unit: Partial<ObservedUnit> | undefined): ObservedUnit | null {
    if (!unit || !unit.name) {
        return null;
    }
    return {
        id: unit.id ?? unit.name,
        name: unit.name,
        star: unit.star ?? 1,
        cost: unit.cost,
        location: unit.location,
        items: unit.items ?? [],
        traits: unit.traits ?? [],
    };
}

function mapShop(shop: OcrPayload["shop"]): ShopOffer[] {
    if (!Array.isArray(shop)) {
        return [];
    }
    return shop.map((entry, index) => {
        const slot = Number.isFinite(Number(entry.slot)) ? Number(entry.slot) : index;
        if (entry.unit) {
            const unit = mapUnit(entry.unit);
            return {
                slot,
                cost: Number.isFinite(Number(entry.cost)) ? Number(entry.cost) : unit?.cost ?? null,
                unit,
            };
        }
        if (entry.name) {
            return {
                slot,
                cost: Number.isFinite(Number(entry.cost)) ? Number(entry.cost) : null,
                unit: {
                    id: entry.name,
                    name: entry.name,
                    star: 1,
                    cost: Number.isFinite(Number(entry.cost)) ? Number(entry.cost) : undefined,
                    items: [],
                    traits: [],
                },
            };
        }
        return {
            slot,
            cost: null,
            unit: null,
        };
    });
}

function usage(): void {
    console.log("Usage:");
    console.log("  npm run pc:logic -- <observed-state-json>");
    console.log("  npx tsx scripts/convert-liveclient-to-observed.ts <input-json> <output-json>");
}

async function main(): Promise<void> {
    const [, , inputArg, outputArg] = process.argv;
    if (!inputArg || !outputArg) {
        usage();
        process.exitCode = 1;
        return;
    }

    const inputPath = path.resolve(process.cwd(), inputArg);
    const outputPath = path.resolve(process.cwd(), outputArg);
    if (!fs.existsSync(inputPath)) {
        console.error(`Input file not found: ${inputPath}`);
        process.exitCode = 1;
        return;
    }

    const parsed = JSON.parse(fs.readFileSync(inputPath, "utf8")) as InputPayload;
    const live = parsed.liveclient ?? {};
    const ocr = parsed.ocr ?? {};
    const bench = (ocr.bench ?? []).map(mapUnit).filter((unit): unit is ObservedUnit => unit !== null);
    const board = (ocr.board ?? []).map(mapUnit).filter((unit): unit is ObservedUnit => unit !== null);

    const observedState: ObservedState = {
        timestamp: Date.now(),
        client: "RIOT_PC" as any,
        target: "PC_LOGIC",
        stageText: ocr.stageText ?? "",
        stageType: parseStageType(ocr.stageType),
        level: live.activePlayer?.level ?? 1,
        currentXp: 0,
        totalXp: 0,
        gold: live.activePlayer?.currentGold ?? 0,
        hp: live.activePlayer?.championStats?.currentHealth,
        bench,
        board,
        shop: mapShop(ocr.shop),
        items: ocr.items ?? [],
        metadata: {
            ...(parsed.metadata ?? {}),
            source: "liveclient+ocr",
        },
    };

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(observedState, null, 2), "utf8");
    console.log(`Observed state written to: ${outputPath}`);
}

void main();
