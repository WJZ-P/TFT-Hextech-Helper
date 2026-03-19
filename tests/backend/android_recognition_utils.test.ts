import test from "node:test";
import assert from "node:assert/strict";
import {
    extractLikelyXpText,
    extractLikelyStageText,
    resolveChampionNameFromText,
    selectBestStageText,
} from "../../src-backend/tft";
import { getChessDataForMode, TFTMode } from "../../src-backend/TFTProtocol";

const chessData = getChessDataForMode(TFTMode.NORMAL);

test("extractLikelyStageText repairs noisy android stage OCR", () => {
    assert.equal(extractLikelyStageText("21"), "2-1");
    assert.equal(extractLikelyStageText("81-4"), "1-4");
    assert.equal(extractLikelyStageText("25-2"), "5-2");
    assert.equal(extractLikelyStageText("5 1"), "5-1");
});

test("extractLikelyXpText rejects impossible OCR and keeps legal android XP text", () => {
    assert.equal(extractLikelyXpText("2/10"), "2/10");
    assert.equal(extractLikelyXpText("20/68"), "20/68");
    assert.equal(extractLikelyXpText("58/60"), "58/60");
    assert.equal(extractLikelyXpText("42/10"), "");
    assert.equal(extractLikelyXpText("98/60"), "");
});

test("resolveChampionNameFromText accepts exact and near-miss android OCR", () => {
    const exact = resolveChampionNameFromText("德莱文", chessData);
    const fuzzy = resolveChampionNameFromText("特琳", chessData);
    const invalid = resolveChampionNameFromText("诺克萨斯", chessData);

    assert.equal(exact.name, "德莱文");
    assert.equal(exact.strategy, "EXACT");

    assert.equal(fuzzy.name, "凯特琳");
    assert.equal(fuzzy.strategy, "FUZZY");

    assert.equal(invalid.name, null);
    assert.equal(invalid.strategy, "NONE");
});

test("selectBestStageText prefers majority support across android scan windows", () => {
    const selection = selectBestStageText([
        { text: "6-1", rawText: "6-1", label: "normal/stage/raw" },
        { text: "5-1", rawText: "5-1", label: "candidate-a/stage/threshold-100" },
        { text: "5-1", rawText: "51", label: "tight/stage/threshold-120" },
        { text: "5-1", rawText: "51", label: "more-left/stage/gray-normalize" },
        { text: "3-1", rawText: "31", label: "candidate-a/stage/threshold-120" },
    ]);

    assert.equal(selection.text, "5-1");
    assert.equal(selection.support, 3);
});
