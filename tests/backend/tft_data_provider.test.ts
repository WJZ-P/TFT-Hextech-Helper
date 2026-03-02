import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import os from "os";
import { TftDataProvider } from "../../src-backend/data/TftDataProvider";

type FakeResponse = { data: unknown };
type FakeGet = (url: string) => Promise<FakeResponse>;

function buildFakeClient(getImpl: FakeGet): any {
    return {
        get: getImpl,
    };
}

test("TftDataProvider falls back to local snapshot when remote endpoints fail", async () => {
    const provider = new TftDataProvider({
        cacheFilePath: path.join(os.tmpdir(), `tft-fallback-${Date.now()}.json`),
        httpClient: buildFakeClient(async () => {
            throw new Error("network down");
        }),
        refreshIntervalMs: 1,
    });

    await provider.refresh(true);
    const snapshot = provider.getSnapshot();

    assert.equal(snapshot.source, "fallback");
    assert.ok(snapshot.champions.length > 0);
    assert.ok(snapshot.items.length > 0);
    assert.ok(snapshot.traits.length > 0);
});

test("TftDataProvider maps remote champion/item/lineup payloads into snapshot", async () => {
    const responses: Record<string, unknown> = {
        "https://game.gtimg.cn/images/lol/act/img/tft/js/chess.js": {
            version: "16.4",
            data: [
                {
                    chessId: "1001",
                    displayName: "测试英雄",
                    hero_EN_name: "TFT_TestHero",
                    price: "3",
                    races: "虚空",
                    jobs: "狙神",
                    imagePath: "//example.com/champ.png",
                },
            ],
        },
        "https://game.gtimg.cn/images/lol/act/img/tft/js/equip.js": {
            version: "16.4",
            data: [
                {
                    equipId: "9001",
                    name: "测试装备",
                    englishName: "TFT_TestItem",
                    imagePath: "//example.com/item.png",
                    formula: "501,502",
                },
            ],
        },
        "https://game.gtimg.cn/images/lol/act/img/tft/js/race.js": {
            version: "16.4",
            data: [
                {
                    traitId: "2001",
                    name: "虚空",
                    level: { "2": "desc" },
                    imagePath: "//example.com/race.png",
                },
            ],
        },
        "https://game.gtimg.cn/images/lol/act/img/tft/js/job.js": {
            version: "16.4",
            data: [
                {
                    traitId: "3001",
                    name: "狙神",
                    level: { "2": "desc" },
                    imagePath: "//example.com/job.png",
                },
            ],
        },
        "https://game.gtimg.cn/images/lol/act/img/tft/js/hex.js": {
            version: "16.4",
            data: [{ id: "hex1" }],
        },
        "https://game.gtimg.cn/images/lol/act/tftzlkauto/json/lineupJson/s16/53/lineup_detail_total.json": {
            version: "16.4",
            lineup_list: [
                {
                    id: "lineup-1",
                    quality: "S",
                    update_time: "2026-02-28 10:00:00",
                    detail: JSON.stringify({
                        line_name: "测试阵容",
                        hero_location: [{ hero_id: "1001", is_carry_hero: true }],
                        equipment_order: "9001",
                    }),
                },
            ],
        },
    };

    const provider = new TftDataProvider({
        cacheFilePath: path.join(os.tmpdir(), `tft-remote-${Date.now()}.json`),
        httpClient: buildFakeClient(async (url: string) => {
            if (!(url in responses)) {
                throw new Error(`unexpected url ${url}`);
            }
            return { data: responses[url] };
        }),
    });

    await provider.refresh(true);
    const snapshot = provider.getSnapshot();

    assert.equal(snapshot.source, "remote");
    assert.equal(snapshot.champions[0]?.name, "测试英雄");
    assert.equal(snapshot.items[0]?.name, "测试装备");
    assert.equal(snapshot.lineups[0]?.name, "测试阵容");
    assert.deepEqual(snapshot.lineups[0]?.coreChampions, ["测试英雄"]);
    assert.deepEqual(snapshot.lineups[0]?.recommendedItems, ["测试装备"]);
});
