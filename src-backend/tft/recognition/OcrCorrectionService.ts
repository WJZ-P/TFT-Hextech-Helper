import type { TftOcrCorrectionContext, TftOcrCorrectionEntry } from "../../data/types";

function normalizeContext(context: TftOcrCorrectionEntry["context"]): TftOcrCorrectionContext {
    if (context === "stage" || context === "shop" || context === "all") {
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

    public loadCorrections(corrections: TftOcrCorrectionEntry[]): void {
        this.corrections = corrections
            .filter((entry) => entry.incorrect.trim().length > 0)
            .map((entry) => ({
                incorrect: entry.incorrect,
                correct: entry.correct,
                context: normalizeContext(entry.context),
            }));
    }

    public clearCorrections(): void {
        this.corrections = [];
    }

    public applyCorrections(rawText: string, context: TftOcrCorrectionContext): string {
        let corrected = String(rawText ?? "");

        for (const entry of this.corrections) {
            if (!matchesContext(entry, context) || !corrected.includes(entry.incorrect)) {
                continue;
            }

            corrected = corrected.split(entry.incorrect).join(entry.correct);
        }

        return corrected;
    }
}

export const ocrCorrectionService = new OcrCorrectionService();
