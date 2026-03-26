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

test("TftDataHub champion/trait helpers", () => {
    const hub = new TftDataHub();

    // Known champion by Chinese name
    const leona = hub.getChampionDefinition("蕾欧娜");
    assert.ok(leona, "蕾欧娜 should resolve");
    assert.equal(leona?.englishId, "TFT16_Leona");

    // Known champion by english id alias
    const leonaByEn = hub.getChampionDefinition("TFT16_Leona");
    assert.ok(leonaByEn, "TFT16_Leona should resolve via alias");
    assert.equal(leonaByEn?.englishId, "TFT16_Leona");

    // Trait lookup by chinese name
    const bruiser = hub.getTraitDefinition("斗士");
    assert.ok(bruiser);
    assert.deepEqual(bruiser?.levels, [2, 4, 6]);

    // Trait lookup by id
    const bruiserById = hub.getTraitDefinition("10220");
    assert.ok(bruiserById);
    assert.equal(bruiserById?.name, "斗士");

    // Trait breakpoints for a champion (蕾欧娜 -> 巨神峰)
    const breakpoints = hub.getTraitBreakpointsForChampion("蕾欧娜");
    assert.deepEqual(breakpoints, [1, 2, 3, 4, 5, 6]);

    // Unknown champion returns undefined/empty
    assert.equal(hub.getChampionDefinition("不存在的棋子"), undefined);
    assert.deepEqual(hub.getTraitBreakpointsForChampion("不存在的棋子"), []);
});
