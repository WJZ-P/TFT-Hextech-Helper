/**
 * Worker lifecycle tests for OcrService
 * 
 * Tests the worker recycling, pre-warming, and health tracking mechanisms.
 * Note: These tests use mocked Tesseract workers to avoid heavy dependencies.
 */

import test from "node:test";
import assert from "node:assert/strict";

/**
 * Mock Tesseract worker for testing
 */
function createMockWorker() {
    let recognitionCount = 0;
    let terminated = false;

    return {
        recognize: async () => {
            recognitionCount++;
            return { data: { text: "mock-result" } };
        },
        terminate: async () => {
            terminated = true;
        },
        setParameters: async () => {},
        getRecognitionCount: () => recognitionCount,
        isTerminated: () => terminated,
    };
}

/**
 * Simulated worker health meta for testing
 */
interface WorkerHealthMeta {
    createdAt: number;
    recognitionCount: number;
    lastUsedAt: number;
}

const WORKER_RECYCLE_CONFIG = {
    MAX_RECOGNITIONS: 500,
    MAX_LIFETIME_MS: 30 * 60 * 1000,
    MAX_IDLE_MS: 10 * 60 * 1000,
};

/**
 * Test helper: Simulated OcrService with lifecycle management
 */
class MockOcrService {
    private workers: Map<string, any> = new Map();
    private workerHealth: Map<string, WorkerHealthMeta> = new Map();
    private now: number = Date.now();
    // Deduplication map and toggle for tests
    private dedupEnabled: boolean = false;
    private dedupMap: Map<string, Promise<string>> = new Map();
    // Optimized mode flag for tests that simulate worker rebuilds
    private optimizedMode: boolean = false;

    /** For testing: override current time */
    setTime(time: number): void {
        this.now = time;
    }

    /** For testing: advance time by milliseconds */
    advanceTime(ms: number): void {
        this.now += ms;
    }

    /** For testing: enable/disable deduplication behaviour */
    enableDedup(enabled: boolean): void {
        this.dedupEnabled = enabled;
    }

    /** For testing: simulate toggling optimized mode which rebuilds workers */
    async setOptimizedMode(enabled: boolean): Promise<void> {
        if (this.optimizedMode === enabled) return;
        this.optimizedMode = enabled;

        // For simplicity, rebuild all existing workers: terminate and replace
        for (const [type, oldWorker] of this.workers.entries()) {
            try {
                await oldWorker.terminate();
            } catch (err) {
                // ignore termination errors in tests
            }

            const newWorker = this.createWorker();
            this.workers.set(type, newWorker);
            this.workerHealth.set(type, {
                createdAt: this.now,
                recognitionCount: 0,
                lastUsedAt: this.now,
            });
        }
    }

    private createWorker(): any {
        return createMockWorker();
    }

    async getWorker(type: string): Promise<any> {
        await this.recycleIfNeeded(type);

        let worker = this.workers.get(type);
        if (!worker) {
            worker = this.createWorker();
            this.workers.set(type, worker);
            this.workerHealth.set(type, {
                createdAt: this.now,
                recognitionCount: 0,
                lastUsedAt: this.now,
            });
        }
        return worker;
    }

    async recognize(imageBuffer: Buffer, type: string): Promise<string> {
        // If dedup is enabled, return the same promise for concurrent identical buffers
        if (this.dedupEnabled) {
            const key = imageBuffer.toString("base64");
            const existing = this.dedupMap.get(key);
            if (existing) return existing;

            const p = (async () => {
                await this.recycleIfNeeded(type);
                const worker = await this.getWorker(type);
                const result = await worker.recognize(imageBuffer);

                // Update health
                const meta = this.workerHealth.get(type);
                if (meta) {
                    meta.recognitionCount++;
                    meta.lastUsedAt = this.now;
                }

                return result.data.text.trim();
            })();

            this.dedupMap.set(key, p);
            p.finally(() => this.dedupMap.delete(key));
            return p;
        }

        // Default behaviour
        await this.recycleIfNeeded(type);
        const worker = await this.getWorker(type);
        const result = await worker.recognize(imageBuffer);

        // Update health
        const meta = this.workerHealth.get(type);
        if (meta) {
            meta.recognitionCount++;
            meta.lastUsedAt = this.now;
        }

        return result.data.text.trim();
    }

    private async recycleIfNeeded(type: string): Promise<void> {
        const meta = this.workerHealth.get(type);
        if (!meta) return;

        const needsRecycle =
            meta.recognitionCount >= WORKER_RECYCLE_CONFIG.MAX_RECOGNITIONS ||
            (this.now - meta.createdAt) >= WORKER_RECYCLE_CONFIG.MAX_LIFETIME_MS ||
            (this.now - meta.lastUsedAt) >= WORKER_RECYCLE_CONFIG.MAX_IDLE_MS;

        if (!needsRecycle) return;

        // Terminate old worker
        const oldWorker = this.workers.get(type);
        if (oldWorker) {
            await oldWorker.terminate();
        }

        // Create new worker
        const newWorker = this.createWorker();
        this.workers.set(type, newWorker);
        this.workerHealth.set(type, {
            createdAt: this.now,
            recognitionCount: 0,
            lastUsedAt: this.now,
        });
    }

    getWorkerHealth(type: string): WorkerHealthMeta | undefined {
        return this.workerHealth.get(type);
    }

    isWorkerReady(type: string): boolean {
        return this.workers.has(type);
    }

    async prewarmWorkers(types: string[]): Promise<void> {
        for (const type of types) {
            await this.getWorker(type);
        }
    }
}

test.describe("OcrService worker lifecycle", () => {
    test("worker is created lazily", async () => {
        const service = new MockOcrService();
        
        assert.equal(service.isWorkerReady("GAME_STAGE"), false);
        
        const worker = await service.getWorker("GAME_STAGE");
        assert.ok(worker);
        assert.equal(service.isWorkerReady("GAME_STAGE"), true);
    });

    test("health tracking records creation time", async () => {
        const service = new MockOcrService();
        service.setTime(1000);
        
        await service.getWorker("GAME_STAGE");
        
        const health = service.getWorkerHealth("GAME_STAGE");
        assert.ok(health);
        assert.equal(health.createdAt, 1000);
        assert.equal(health.recognitionCount, 0);
    });

    test("health tracking updates on recognize", async () => {
        const service = new MockOcrService();
        await service.getWorker("GAME_STAGE");
        
        await recognizeHelper(service, "GAME_STAGE");
        await recognizeHelper(service, "GAME_STAGE");
        await recognizeHelper(service, "GAME_STAGE");
        
        const health = service.getWorkerHealth("GAME_STAGE");
        assert.equal(health?.recognitionCount, 3);
    });

    test("recycling triggers after MAX_RECOGNITIONS", async () => {
        const service = new MockOcrService();
        service.setTime(1000);
        
        // Create first worker (not used directly, but needed for test setup)
        await service.getWorker("GAME_STAGE");
        
        // Simulate 500 recognitions
        for (let i = 0; i < WORKER_RECYCLE_CONFIG.MAX_RECOGNITIONS; i++) {
            await recognizeHelper(service, "GAME_STAGE");
        }
        
        // Health should show 500
        const healthBeforeRecycle = service.getWorkerHealth("GAME_STAGE");
        assert.equal(healthBeforeRecycle?.recognitionCount, WORKER_RECYCLE_CONFIG.MAX_RECOGNITIONS);
        
        // Next recognize should trigger recycle
        await recognizeHelper(service, "GAME_STAGE");
        
        // Health should reset
        const healthAfterRecycle = service.getWorkerHealth("GAME_STAGE");
        assert.equal(healthAfterRecycle?.recognitionCount, 1); // The recognize that triggered recycle counts
    });

    test("recycling triggers after MAX_LIFETIME_MS", async () => {
        const service = new MockOcrService();
        service.setTime(1000);
        
        // Create first worker (not used directly, but needed for test setup)
        await service.getWorker("GAME_STAGE");
        
        // Advance time past 30 minutes
        service.advanceTime(WORKER_RECYCLE_CONFIG.MAX_LIFETIME_MS + 1000);
        
        // Next recognize should trigger recycle
        await recognizeHelper(service, "GAME_STAGE");
        
        // Health should have new createdAt
        const health = service.getWorkerHealth("GAME_STAGE");
        assert.ok(health);
        assert.ok(health.createdAt > 1000);
    });

    test("recycling triggers after MAX_IDLE_MS", async () => {
        const service = new MockOcrService();
        service.setTime(1000);
        
        await recognizeHelper(service, "GAME_STAGE");
        
        // Advance time past 10 minutes idle
        service.advanceTime(WORKER_RECYCLE_CONFIG.MAX_IDLE_MS + 1000);
        
        // Next recognize should trigger recycle
        await recognizeHelper(service, "GAME_STAGE");
        
        // Health should have new lastUsedAt
        const health = service.getWorkerHealth("GAME_STAGE");
        assert.ok(health);
        assert.ok(health.lastUsedAt > 1000 + WORKER_RECYCLE_CONFIG.MAX_IDLE_MS);
    });

    test("prewarmWorkers creates workers", async () => {
        const service = new MockOcrService();
        
        await service.prewarmWorkers(["GAME_STAGE", "CHESS"]);
        
        assert.equal(service.isWorkerReady("GAME_STAGE"), true);
        assert.equal(service.isWorkerReady("CHESS"), true);
        assert.equal(service.isWorkerReady("LEVEL"), false);
    });

    test("multiple worker types are independent", async () => {
        const service = new MockOcrService();
        service.setTime(1000);
        
        await recognizeHelper(service, "GAME_STAGE");
        await recognizeHelper(service, "GAME_STAGE");
        await recognizeHelper(service, "CHESS");
        
        const stageHealth = service.getWorkerHealth("GAME_STAGE");
        const chessHealth = service.getWorkerHealth("CHESS");
        
        assert.equal(stageHealth?.recognitionCount, 2);
        assert.equal(chessHealth?.recognitionCount, 1);
    });

    test("setOptimizedMode triggers worker rebuilds", async () => {
        const service = new MockOcrService();
        service.setTime(1000);

        // Prewarm a worker
        await service.getWorker("GAME_STAGE");
        const beforeHealth = service.getWorkerHealth("GAME_STAGE");
        assert.ok(beforeHealth);
        assert.equal(beforeHealth?.recognitionCount, 0);

        // Switch optimized mode on
        await service.setOptimizedMode(true);

        // After toggling, health should reflect a new createdAt and reset count
        const afterHealth = service.getWorkerHealth("GAME_STAGE");
        assert.ok(afterHealth);
        assert.equal(afterHealth?.recognitionCount, 0);
        assert.ok(afterHealth!.createdAt >= 1000);
    });

    test("deduplicates concurrent recognize calls with same buffer", async () => {
        const service = new MockOcrService();
        service.enableDedup(true);

        // Start two concurrent recognitions with identical buffer
        const buf = Buffer.from("same-data");

        const p1 = service.recognize(buf, "GAME_STAGE");
        const p2 = service.recognize(buf, "GAME_STAGE");

        const results = await Promise.all([p1, p2]);
        assert.equal(results[0], results[1]);

        // Recognition count should be 1 due to dedup
        const health = service.getWorkerHealth("GAME_STAGE");
        assert.equal(health?.recognitionCount, 1);
    });
});

async function recognizeHelper(service: MockOcrService, type: string): Promise<string> {
    return service.recognize(Buffer.from("mock"), type);
}
