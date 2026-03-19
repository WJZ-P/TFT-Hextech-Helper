import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRuntimeState } from "../../src-backend/core/StateNormalizer";
import { GameStageType, TFTMode, TFT_16_CHESS_DATA, TFT_16_EQUIP_DATA } from "../../src-backend/TFTProtocol";

test("normalizeRuntimeState builds active traits from board units and emblems", () => {
    const state = normalizeRuntimeState({
        client: "ANDROID" as any,
        target: "ANDROID_EMULATOR",
        mode: TFTMode.NORMAL,
        stageText: "2-5",
        stageType: GameStageType.PVP,
        level: 5,
        currentXp: 0,
        totalXp: 20,
        gold: 32,
        benchUnits: [],
        boardUnits: [
            {
                location: "R1_C1",
                tftUnit: TFT_16_CHESS_DATA["克格莫"],
                starLevel: 1,
                equips: [],
            },
            {
                location: "R1_C2",
                tftUnit: TFT_16_CHESS_DATA["妮蔻"],
                starLevel: 1,
                equips: [
                    TFT_16_EQUIP_DATA["法师纹章"],
                ],
            },
            {
                location: "R1_C3",
                tftUnit: TFT_16_CHESS_DATA["嘉文四世"],
                starLevel: 1,
                equips: [],
            },
        ],
        shopUnits: [],
        equipments: [],
    });

    const sorcererTrait = state.activeTraits?.find((trait) => trait.name === "法师");
    const defenderTrait = state.activeTraits?.find((trait) => trait.name === "护卫");

    assert.ok(sorcererTrait);
    assert.equal(sorcererTrait?.count, 3);
    assert.equal(sorcererTrait?.required, 2);
    assert.equal(sorcererTrait?.active, true);

    assert.ok(defenderTrait);
    assert.equal(defenderTrait?.count, 2);
    assert.equal(defenderTrait?.active, true);
});
