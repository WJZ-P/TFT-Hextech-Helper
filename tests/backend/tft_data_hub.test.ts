import test from "node:test";
import assert from "node:assert/strict";
import { TftDataHub } from "../../src-backend/data/TftDataHub";
import type { TftDataSnapshot } from "../../src-backend/data/types";

test("TftDataHub merges snapshot display access with automation lineup access", () => {
    const snapshot: TftDataSnapshot = {
        fetchedAt: new Date().toISOString(),
        source: "season-pack",
        versions: {},
        champions: [],
        items: [],
        traits: [],
        lineups: [
            {
                id: "display-1",
                name: "展示阵容",
                season: "英雄联盟传奇",
                champions: ["蕾欧娜"],
                coreChampions: ["蕾欧娜"],
                recommendedItems: ["反曲之弓"],
            },
        ],
    };

    const hub = new TftDataHub({
        snapshotProvider: {
            getSnapshot() {
                return snapshot;
            },
        },
        lineupProvider: {
            getLineup(id: string) {
                return id === "auto-1"
                    ? {
                        id: "auto-1",
                        name: "运营阵容",
                        season: "S16",
                        stages: {
                            level8: {
                                champions: [],
                            },
                        },
                    }
                    : undefined;
            },
            getAllLineups() {
                return [
                    {
                        id: "auto-1",
                        name: "运营阵容",
                        season: "S16",
                        stages: {
                            level8: {
                                champions: [],
                            },
                        },
                    },
                ];
            },
            getLineupsBySeason(season: string) {
                return season === "S16" ? this.getAllLineups() : [];
            },
        },
    });

    assert.equal(hub.getDisplayLineups()[0]?.name, "展示阵容");
    assert.equal(hub.getSelectedAutomationLineups(["auto-1", "missing"]).length, 1);
    assert.equal(hub.getAutomationLineups("S16")[0]?.name, "运营阵容");
});
