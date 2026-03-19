import { TftDataProvider } from "../data/TftDataProvider";
import type { TftDataSnapshot } from "../data/types";
import { ocrCorrectionService } from "../tft/recognition/OcrCorrectionService";

interface TftSnapshotProvider {
    refresh(force?: boolean): Promise<void>;
    getSnapshot(): TftDataSnapshot;
}

export class TftDataService {
    constructor(private readonly provider: TftSnapshotProvider = new TftDataProvider()) {}

    private initialized = false;

    private syncOcrCorrections(snapshot: TftDataSnapshot): void {
        ocrCorrectionService.loadCorrections(snapshot.ocrCorrections ?? []);
    }

    public async refresh(force = false): Promise<void> {
        await this.provider.refresh(force);
        this.syncOcrCorrections(this.provider.getSnapshot());
        this.initialized = true;
    }

    public async warmup(): Promise<void> {
        if (this.initialized) {
            return;
        }
        await this.refresh(false);
    }

    public getSnapshot(): TftDataSnapshot {
        const snapshot = this.provider.getSnapshot();
        this.syncOcrCorrections(snapshot);
        this.initialized = true;
        return snapshot;
    }
}

export const tftDataService = new TftDataService();
