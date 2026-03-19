import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadJinChanSeasonPackSnapshot } from "../../src-backend/data/JinChanSeasonPackLoader";

async function writeJson(filePath: string, data: unknown): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
}

test("JinChan season pack loader maps a compatible pack into snapshot data", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "jinchan-pack-"));
    const seasonDir = path.join(rootDir, "英雄联盟传奇");

    await writeJson(path.join(seasonDir, "HeroData.json"), [
        {
            HeroName: "蕾欧娜",
            Cost: 1,
            Profession: ["哨兵"],
            Peculiarity: ["源计划"],
        },
        {
            HeroName: "卡密尔",
            Cost: 2,
            Profession: ["裁决使"],
            Peculiarity: ["执法官"],
        },
    ]);
    await writeJson(path.join(seasonDir, "Equipment.json"), [
        {
            Name: "暴风之剑",
            EquipmentType: "散件",
        },
        {
            Name: "无尽之刃",
            EquipmentType: "普通装备",
            SyntheticPathway: ["暴风之剑", "拳套"],
        },
    ]);
    await writeJson(path.join(seasonDir, "LineUps.json"), [
        {
            LineUpName: "测试阵容",
            SubLineUps: [
                {
                    SubLineUpName: "前期",
                    LineUpUnits: [
                        {
                            HeroName: "蕾欧娜",
                            EquipmentNames: ["", "", ""],
                            Position: { Item1: 0, Item2: 0 },
                        },
                    ],
                },
                {
                    SubLineUpName: "后期",
                    LineUpUnits: [
                        {
                            HeroName: "卡密尔",
                            EquipmentNames: ["无尽之刃", "", ""],
                            Position: { Item1: 1, Item2: 2 },
                        },
                    ],
                },
            ],
        },
    ]);
    await writeJson(path.join(seasonDir, "RecommendedLineUps.json"), {
        UpdateTime: "2026-01-09T00:55:41.4931775+08:00",
        LineUps: [
            {
                LineUpName: "推荐阵容",
                Tier: "S",
                Tags: ["运营"],
                Description: "测试推荐阵容",
                LineUpUnits: [
                    {
                        HeroName: "蕾欧娜",
                        EquipmentNames: ["暴风之剑", "", ""],
                        Position: { Item1: 2, Item2: 3 },
                    },
                ],
            },
        ],
    });
    await writeJson(path.join(rootDir, "CorrectionsList.json"), [
        {
            Incorrect: ["梦欧娜", "营欧娜"],
            Correct: "蕾欧娜",
        },
        {
            Incorrect: ["卡宝尔"],
            Correct: "卡密尔",
        },
    ]);

    const snapshot = loadJinChanSeasonPackSnapshot(rootDir);

    assert.ok(snapshot);
    assert.equal(snapshot?.source, "season-pack");
    assert.equal(snapshot?.champions.length, 2);
    assert.deepEqual(
        snapshot?.champions.map((champion) => champion.name),
        ["蕾欧娜", "卡密尔"]
    );
    assert.deepEqual(
        snapshot?.traits.map((trait) => `${trait.name}:${trait.type}`).sort(),
        ["哨兵:classes", "执法官:origins", "源计划:origins", "裁决使:classes"]
    );
    assert.equal(snapshot?.lineups.length, 2);
    assert.deepEqual(snapshot?.lineups.find((lineup) => lineup.name === "测试阵容")?.coreChampions, ["卡密尔"]);
    assert.equal(snapshot?.lineups.find((lineup) => lineup.name === "推荐阵容")?.quality, "S");
    assert.deepEqual(
        snapshot?.ocrCorrections?.map((entry) => `${entry.incorrect}:${entry.correct}`),
        ["梦欧娜:蕾欧娜", "营欧娜:蕾欧娜", "卡宝尔:卡密尔"]
    );
});

test("JinChan season pack loader returns null when required files are missing", async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "jinchan-pack-missing-"));
    const seasonDir = path.join(rootDir, "英雄联盟传奇");

    await writeJson(path.join(seasonDir, "HeroData.json"), [
        {
            HeroName: "蕾欧娜",
            Cost: 1,
            Profession: ["哨兵"],
            Peculiarity: ["源计划"],
        },
    ]);

    assert.equal(loadJinChanSeasonPackSnapshot(rootDir), null);
});
