import { applySeasonPackAssetPaths, syncJinChanSeasonPackAssets } from "../data/JinChanSeasonPackAssetSyncer";
import { TftDataProvider } from "../data/TftDataProvider";
import type { TftDataSnapshot } from "../data/types";
import { BUILTIN_OCR_CORRECTIONS, mergeOcrCorrections } from "../tft/recognition/OcrCorrectionCatalog";
import { ocrCorrectionService } from "../tft/recognition/OcrCorrectionService";

interface TftSnapshotProvider {
    refresh(force?: boolean): Promise<void>;
    getSnapshot(): TftDataSnapshot;
    getSeasonPackDir?(): string;
}

export class TftDataService {
    constructor(private readonly provider: TftSnapshotProvider = new TftDataProvider()) {}

    private initialized = false;

    private syncOcrCorrections(snapshot: TftDataSnapshot): void {
        ocrCorrectionService.loadCorrections(
            mergeOcrCorrections(BUILTIN_OCR_CORRECTIONS, snapshot.ocrCorrections ?? [])
        );
    }

    private prepareSnapshot(snapshot: TftDataSnapshot): TftDataSnapshot {
        this.syncOcrCorrections(snapshot);

        if (snapshot.source !== "season-pack") {
            return snapshot;
        }

        const seasonPackDir = this.provider.getSeasonPackDir?.();
        if (!seasonPackDir) {
            return snapshot;
        }

        const assetReport = syncJinChanSeasonPackAssets({
            baseDir: seasonPackDir,
            snapshot,
        });

        return applySeasonPackAssetPaths(snapshot, assetReport);
    }

    public async refresh(force = false): Promise<void> {
        await this.provider.refresh(force);
        this.prepareSnapshot(this.provider.getSnapshot());
        this.initialized = true;
    }

    public async warmup(): Promise<void> {
        if (this.initialized) {
            return;
        }
        await this.refresh(false);
    }

    public getSnapshot(): TftDataSnapshot {
        const snapshot = this.prepareSnapshot(this.provider.getSnapshot());
        this.initialized = true;
        return snapshot;
    }
}

export const tftDataService = new TftDataService();
