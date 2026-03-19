import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadJinChanSeasonPackSnapshot, resolveJinChanSeasonPackLocation } from "../../src-backend/data/JinChanSeasonPackLoader";

const FIXTURE_RESOURCES_DIR = path.resolve(
    process.cwd(),
    "tests",
    "backend",
    "fixtures",
    "jinchan-main",
    "Resources"
);

test("JinChan season pack loader maps a real-main-branch-shaped Resources root into snapshot data", () => {
    const snapshot = loadJinChanSeasonPackSnapshot(FIXTURE_RESOURCES_DIR);

    assert.ok(snapshot);
    assert.equal(snapshot?.source, "season-pack");
    assert.equal(snapshot?.champions.length, 3);
    assert.deepEqual(
        snapshot?.champions.map((champion) => champion.name),
        ["蕾欧娜", "卡密尔", "巴德"]
    );
    assert.deepEqual(
        snapshot?.traits.map((trait) => `${trait.name}:${trait.type}`).sort(),
        ["哨兵:classes", "执法官:origins", "旅者:origins", "源计划:origins", "裁决使:classes"]
    );
    assert.equal(snapshot?.lineups.length, 1);
    assert.deepEqual(snapshot?.lineups.find((lineup) => lineup.name === "真实推荐阵容")?.coreChampions, ["卡密尔"]);
    assert.equal(snapshot?.lineups.find((lineup) => lineup.name === "真实推荐阵容")?.quality, "S");
    assert.deepEqual(
        snapshot?.ocrCorrections?.map((entry) => `${entry.incorrect}:${entry.correct}`),
        ["梦欧娜:蕾欧娜", "套欧娜:蕾欧娜", "卡宝尔:卡密尔"]
    );
    assert.deepEqual(
        snapshot?.lineups[0]?.recommendedItems,
        ["无尽之刃", "反曲之弓", "迅击战士纹章"]
    );
});

test("JinChan season pack loader supports passing the HeroDatas directory directly and skips incomplete seasons", () => {
    const heroDatasDir = path.join(FIXTURE_RESOURCES_DIR, "HeroDatas");
    const snapshot = loadJinChanSeasonPackSnapshot(heroDatasDir);

    assert.ok(snapshot);
    assert.equal(snapshot?.source, "season-pack");
    assert.equal(snapshot?.versions.chess, "英雄联盟传奇");
    assert.equal(snapshot?.champions.some((champion) => champion.name === "安妮"), false);
    assert.equal(snapshot?.ocrCorrections?.length, 3);
});

test("JinChan season pack location resolver keeps actual Resources-root correction lookup semantics", () => {
    const location = resolveJinChanSeasonPackLocation(FIXTURE_RESOURCES_DIR);

    assert.ok(location);
    assert.equal(location?.seasonName, "英雄联盟传奇");
    assert.equal(location?.seasonRootDir.endsWith(path.join("Resources", "HeroDatas")), true);
    assert.equal(location?.correctionsSearchDirs.includes(FIXTURE_RESOURCES_DIR), true);
});
