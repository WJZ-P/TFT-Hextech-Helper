import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { buildAndroidSeasonCatalog, buildAndroidSeasonCatalogWithAssets } from "../../scripts/build-android-season-catalog";

const FIXTURE_RESOURCES_DIR = path.resolve(
    process.cwd(),
    "tests",
    "backend",
    "fixtures",
    "jinchan-main",
    "Resources"
);
const GUI_FIXTURE_RESOURCES_DIR = path.resolve(
    process.cwd(),
    "tests",
    "backend",
    "fixtures",
    "gui-season-pack",
    "Resources"
);

test("buildAndroidSeasonCatalog converts a JinChan Resources root into APK catalog JSON", () => {
    const catalog = buildAndroidSeasonCatalog(FIXTURE_RESOURCES_DIR);

    assert.equal(catalog.season, "英雄联盟传奇");
    assert.deepEqual(catalog.champions, ["蕾欧娜", "卡密尔", "巴德"]);
    assert.deepEqual(catalog.equipment, ["反曲之弓", "无尽之刃", "迅击战士纹章"]);
    assert.equal(catalog.championAliases["梦欧娜"], "蕾欧娜");
    assert.equal(catalog.championAliases["套欧娜"], "蕾欧娜");
    assert.equal(catalog.championAliases["卡宝尔"], "卡密尔");
    assert.equal(catalog.equipmentAliases["反曲弓"], "反曲之弓");
    assert.equal(catalog.equipmentAliases["ie"], "无尽之刃");
    assert.deepEqual(catalog.equipmentIconSignatures, {});
    assert.equal(catalog.aliases["梦欧娜"], "蕾欧娜");
});

test("buildAndroidSeasonCatalogWithAssets emits equipment icon signatures when EquipmentImages exist", async () => {
    const catalog = await buildAndroidSeasonCatalogWithAssets(GUI_FIXTURE_RESOURCES_DIR);

    assert.equal(catalog.equipmentIconSignatures["无尽之刃"].length, 64);
    assert.equal(catalog.equipmentIconSignatures["鬼索的狂暴之刃"].length, 64);
    assert.match(catalog.equipmentIconSignatures["无尽之刃"], /^[01]+$/);
});
