import type { TftOcrCorrectionContext, TftOcrCorrectionEntry } from "../../data/types";
import { logger } from "../../utils/Logger";

interface OcrCorrectionHitStat {
    context: TftOcrCorrectionContext;
    incorrect: string;
    correct: string;
    count: number;
    lastRawText: string;
}

interface OcrCorrectionLoggingOptions {
    enabled?: boolean;
    throttleMs?: number;
}

function normalizeContext(context: TftOcrCorrectionEntry["context"]): TftOcrCorrectionContext {
    if (context === "stage" || context === "shop" || context === "all" || context === "equipment") {
        return context;
    }

    return "all";
}

function matchesContext(entry: TftOcrCorrectionEntry, context: TftOcrCorrectionContext): boolean {
    const entryContext = normalizeContext(entry.context);
    return entryContext === "all" || entryContext === context;
}

export class OcrCorrectionService {
    private corrections: TftOcrCorrectionEntry[] = [];
    private hitStats = new Map<string, OcrCorrectionHitStat>();
    private lastLogAt = new Map<string, number>();
    private loggingEnabled = process.env.TFT_OCR_CORRECTION_LOG === "1";
    private loggingThrottleMs = 60000;

    public loadCorrections(corrections: TftOcrCorrectionEntry[]): void {
        this.corrections = corrections
            .filter((entry) => entry.incorrect.trim().length > 0)
            .map((entry) => ({
                incorrect: entry.incorrect,
                correct: entry.correct,
                context: normalizeContext(entry.context),
            }));
    }

    public configureLogging(options: OcrCorrectionLoggingOptions = {}): void {
        if (typeof options.enabled === "boolean") {
            this.loggingEnabled = options.enabled;
        }
        if (typeof options.throttleMs === "number" && options.throttleMs >= 0) {
            this.loggingThrottleMs = options.throttleMs;
        }
    }

    public clearCorrections(): void {
        this.corrections = [];
        this.hitStats.clear();
        this.lastLogAt.clear();
    }

    public getHitStats(): OcrCorrectionHitStat[] {
        return [...this.hitStats.values()].sort((left, right) => right.count - left.count);
    }

    private recordHit(entry: TftOcrCorrectionEntry, context: TftOcrCorrectionContext, rawText: string): void {
        const key = `${context}:${entry.incorrect}:${entry.correct}`;
        const current = this.hitStats.get(key);
        this.hitStats.set(key, {
            context,
            incorrect: entry.incorrect,
            correct: entry.correct,
            count: (current?.count ?? 0) + 1,
            lastRawText: rawText,
        });

        if (!this.loggingEnabled) {
            return;
        }

        const now = Date.now();
        const lastLoggedAt = this.lastLogAt.get(key) ?? 0;
        if (now - lastLoggedAt < this.loggingThrottleMs) {
            return;
        }

        this.lastLogAt.set(key, now);
        logger.debug(
            `[OcrCorrectionService] ${context} correction hit: "${entry.incorrect}" -> "${entry.correct}" (raw="${rawText}")`
        );
    }

    public applyCorrections(rawText: string, context: TftOcrCorrectionContext): string {
        let corrected = String(rawText ?? "");

        for (const entry of this.corrections) {
            if (!matchesContext(entry, context) || !corrected.includes(entry.incorrect)) {
                continue;
            }

            this.recordHit(entry, context, corrected);
            corrected = corrected.split(entry.incorrect).join(entry.correct);
        }

        return corrected;
    }
}

export const ocrCorrectionService = new OcrCorrectionService();
