import { TftDataProvider } from "../data/TftDataProvider";
import type { TftDataSnapshot } from "../data/types";

class TftDataService {
    private readonly provider = new TftDataProvider();
    private initialized = false;

    public async refresh(force = false): Promise<void> {
        await this.provider.refresh(force);
        this.initialized = true;
    }

    public async warmup(): Promise<void> {
        if (this.initialized) {
            return;
        }
        await this.refresh(false);
    }

    public getSnapshot(): TftDataSnapshot {
        return this.provider.getSnapshot();
    }
}

export const tftDataService = new TftDataService();
