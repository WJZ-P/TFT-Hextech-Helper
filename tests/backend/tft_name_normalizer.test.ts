import test from "node:test";
import assert from "node:assert/strict";
import { equipmentNamesMatch, normalizeEquipmentName } from "../../src-backend/data";
import { resolveChampionAlias } from "../../src-backend/data/TftNameNormalizer";
import { getChessDataBySeason } from "../../src-backend/TFTProtocol";

const chessData = getChessDataBySeason("S16");

test("equipment name normalizer maps shorthand aliases to canonical data names", () => {
    assert.equal(normalizeEquipmentName("反曲弓"), "反曲之弓");
    assert.equal(normalizeEquipmentName("反曲之弓"), "反曲之弓");
    assert.equal(equipmentNamesMatch("反曲弓", "反曲之弓"), true);
});

test("TftNameNormalizer normalizes English equipment aliases for common NA items", () => {
    assert.equal(normalizeEquipmentName("bfsword"), "暴风之剑");
    assert.equal(normalizeEquipmentName("recurvebow"), "反曲之弓");
    assert.equal(normalizeEquipmentName("chainvest"), "锁子甲");
    assert.equal(normalizeEquipmentName("negatroncloak"), "负极斗篷");
    assert.equal(normalizeEquipmentName("giantsbelt"), "无用大棒");
    assert.equal(normalizeEquipmentName("sparringgloves"), "拳套");
    assert.equal(normalizeEquipmentName("spatula"), "金铲铲");
    assert.equal(normalizeEquipmentName("tearofthegoddess"), "女神之泪");
    assert.equal(normalizeEquipmentName("tear"), "女神之泪");
    assert.equal(normalizeEquipmentName("needlesslylargerod"), "金锅锅");
    assert.equal(normalizeEquipmentName("nlr"), "金锅锅");
});

test("TftNameNormalizer normalizes completed equipment English aliases (Round 4 expansion)", () => {
    // Completed equipment aliases
    assert.equal(normalizeEquipmentName("quicksilver"), "水银");
    assert.equal(normalizeEquipmentName("lastwhisper"), "最后的轻语");
    assert.equal(normalizeEquipmentName("lw"), "最后的轻语");
    assert.equal(normalizeEquipmentName("rabadon"), "灭世者的死亡之帽");
    assert.equal(normalizeEquipmentName("dcap"), "灭世者的死亡之帽");
    assert.equal(normalizeEquipmentName("morello"), "莫雷洛秘典");
    assert.equal(normalizeEquipmentName("shojin"), "朔极之矛");
    assert.equal(normalizeEquipmentName("hoj"), "海克斯科技枪刃");
    assert.equal(normalizeEquipmentName("ie"), "无尽之刃");
    assert.equal(normalizeEquipmentName("bt"), "饮血剑");
    assert.equal(normalizeEquipmentName("gs"), "巨人杀手");
    assert.equal(normalizeEquipmentName("jgs"), "珠光护手");
    // Case insensitivity
    assert.equal(normalizeEquipmentName("QUICKSILVER"), "水银");
    assert.equal(normalizeEquipmentName("LW"), "最后的轻语");
    assert.equal(normalizeEquipmentName("MORELLO"), "莫雷洛秘典");
});

test("TftNameNormalizer supports spaced and punctuated English equipment aliases without hurting canonical Chinese names", () => {
    assert.equal(normalizeEquipmentName("Last Whisper"), "最后的轻语");
    assert.equal(normalizeEquipmentName("Rabadon's Deathcap"), "灭世者的死亡之帽");
    assert.equal(normalizeEquipmentName("Infinity Edge"), "无尽之刃");
    assert.equal(normalizeEquipmentName("Bloodthirster"), "饮血剑");
    assert.equal(normalizeEquipmentName("无尽之刃"), "无尽之刃");
});

test("TftNameNormalizer resolves champion shorthand asol to 奥瑞利安·索尔", () => {
    const result = resolveChampionAlias("asol", chessData);
    assert.equal(result, "奥瑞利安·索尔");
});

test("TftNameNormalizer resolves champion shorthand kaisa to 卡莎", () => {
    const result = resolveChampionAlias("kaisa", chessData);
    assert.equal(result, "卡莎");
});

test("TftNameNormalizer resolves English champion alias Ekko to 艾克", () => {
    const result = resolveChampionAlias("Ekko", chessData);
    assert.equal(result, "艾克");
});

test("TftNameNormalizer does not corrupt Chinese champion name lookup", () => {
    // Chinese names must pass through unchanged if they exist in chessData
    const result = resolveChampionAlias("奥瑞利安·索尔", chessData);
    assert.equal(result, "奥瑞利安·索尔");
});

test("TftNameNormalizer does not corrupt Chinese equipment name normalization", () => {
    assert.equal(normalizeEquipmentName("反曲之弓"), "反曲之弓");
    assert.equal(normalizeEquipmentName("暴风之剑"), "暴风之剑");
    assert.equal(normalizeEquipmentName("女神之泪"), "女神之泪");
});

test("TftNameNormalizer resolves additional champion shorthands (Round 4 expansion)", () => {
    // Additional champion shorthand aliases
    const morgResult = resolveChampionAlias("morg", chessData);
    assert.equal(morgResult, "魔甘娜");
    const morganaResult = resolveChampionAlias("morgana", chessData);
    assert.equal(morganaResult, "魔甘娜");
    const heimerResult = resolveChampionAlias("heimer", chessData);
    assert.equal(heimerResult, "维迦");
    const viegoResult = resolveChampionAlias("viego", chessData);
    assert.equal(viegoResult, "厄运小姐");
    // Case insensitivity
    const morgUpper = resolveChampionAlias("MORG", chessData);
    assert.equal(morgUpper, "魔甘娜");
});

test("TftNameNormalizer resolves spaced or punctuated English champion aliases through normalized tokens", () => {
    assert.equal(resolveChampionAlias("Miss Fortune", chessData), "厄运小姐");
    assert.equal(resolveChampionAlias("Twisted Fate", chessData), "崔斯特");
    assert.equal(resolveChampionAlias("Kog'Maw", chessData), "科加斯");
});
