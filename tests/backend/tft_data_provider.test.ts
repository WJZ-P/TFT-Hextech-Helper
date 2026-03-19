import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
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

async function writeJson(filePath: string, data: unknown): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
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

test("TftDataProvider prioritizes season-pack data before remote qq snapshot", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "tft-season-pack-"));
    const seasonDir = path.join(rootDir, "英雄联盟传奇");
    let remoteCalls = 0;

    await writeJson(path.join(seasonDir, "HeroData.json"), [
        {
            HeroName: "赛季包英雄",
            Cost: 3,
            Profession: ["狙神"],
            Peculiarity: ["虚空"],
        },
    ]);
    await writeJson(path.join(seasonDir, "Equipment.json"), [
        {
            Name: "赛季包装备",
            EquipmentType: "普通装备",
            SyntheticPathway: ["暴风之剑", "拳套"],
        },
    ]);

    const provider = new TftDataProvider({
        cacheFilePath: path.join(os.tmpdir(), `tft-season-pack-cache-${Date.now()}.json`),
        seasonPackDir: rootDir,
        httpClient: buildFakeClient(async () => {
            remoteCalls += 1;
            throw new Error("remote should not be called");
        }),
    });

    await provider.refresh(true);
    const snapshot = provider.getSnapshot();

    assert.equal(snapshot.source, "season-pack");
    assert.equal(snapshot.champions[0]?.name, "赛季包英雄");
    assert.equal(snapshot.items[0]?.name, "赛季包装备");
    assert.equal(remoteCalls, 0);
});
