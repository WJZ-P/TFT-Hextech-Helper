import test from "node:test";
import assert from "node:assert/strict";
import { createTftAssetResolver } from "../../src/utils/tftAssetResolver";

test("tft asset resolver prefers local season-pack assets before CDN fallbacks", () => {
    const resolver = createTftAssetResolver({
        champions: [
            { name: "蕾欧娜", imageUrl: "resources/season-packs/英雄联盟传奇/champions/蕾欧娜.png" },
        ],
        items: [
            { name: "反曲之弓", imageUrl: "resources/season-packs/英雄联盟传奇/equipment/反曲之弓.png" },
        ],
    });

    assert.deepEqual(
        resolver.resolveChampionAvatarSources("蕾欧娜", "S16").slice(0, 2),
        [
            "./resources/season-packs/英雄联盟传奇/champions/蕾欧娜.png",
            "https://c-tft-api.op.gg/img/set/16/tft-champion/tiles/TFT16_Leona.tft_set16.png?image=q_auto:good,f_webp&v=1765176243",
        ]
    );
    assert.deepEqual(
        resolver.resolveItemIconSources("反曲之弓", "9118"),
        [
            "./resources/season-packs/英雄联盟传奇/equipment/反曲之弓.png",
            "https://game.gtimg.cn/images/lol/act/img/tft/equip/9118.png",
        ]
    );
});

test("tft asset resolver falls back to CDN when local season-pack assets are unavailable", () => {
    const resolver = createTftAssetResolver({
        champions: [],
        items: [],
    });

    // S16: only OP.GG — Tencent champions/{chessId}.png is broken for S16 (returns skill icons)
    const s16Sources = resolver.resolveChampionAvatarSources("蕾欧娜", "S16");
    assert.equal(s16Sources[0]?.startsWith("https://c-tft-api.op.gg/"), true);
    assert.equal(s16Sources[1], undefined); // no broken Tencent fallback for S16

    // S4: Tencent CDN is the only available fallback
    const s4Sources = resolver.resolveChampionAvatarSources("德莱厄斯", "S4");
    assert.equal(s4Sources[0]?.startsWith("https://game.gtimg.cn/images/lol/act/img/tft/champions/"), true);

    assert.deepEqual(
        resolver.resolveItemIconSources("反曲之弓", "9118"),
        ["https://game.gtimg.cn/images/lol/act/img/tft/equip/9118.png"]
    );
});

test("tft asset resolver keeps working when only local assets exist and network fallback is absent", () => {
    const resolver = createTftAssetResolver({
        champions: [
            { name: "本地测试英雄", imageUrl: "/resources/season-packs/custom/champions/local-only.png" },
        ],
        items: [],
    });

    assert.deepEqual(
        resolver.resolveChampionAvatarSources("本地测试英雄", "S16"),
        ["/resources/season-packs/custom/champions/local-only.png"]
    );
});

test("tft asset resolver filters out S16 skill icon URLs from corrupted snapshot data", () => {
    // Simulate snapshot containing skill icon URLs instead of avatar URLs for S16 champions
    const corruptedSnapshot = {
        champions: [
            // Ekko skill E icon (should be filtered out for S16)
            { name: "艾克", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_ekko_e.tft_set15.png" },
            // Nidalee passive skill icon (should be filtered out for S16)
            { name: "妮蔻", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_nidalee_passive.tft_set15.png" },
            // Valid non-skill URL (should be kept for S4, but filtered for S16 to enforce OP.GG)
            { name: "蕾欧娜", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/TFT4_Leona.png" },
        ],
        items: [],
    };

    const resolver = createTftAssetResolver(corruptedSnapshot);

    // S16: skill icon URLs should be filtered out, fallback to OP.GG
    const ekkoS16Sources = resolver.resolveChampionAvatarSources("艾克", "S16");
    assert.equal(ekkoS16Sources[0]?.includes("c-tft-api.op.gg"), true, "艾克 S16 should use OP.GG, not skill icon");
    
    const nidaleeS16Sources = resolver.resolveChampionAvatarSources("妮蔻", "S16");
    assert.equal(nidaleeS16Sources[0]?.includes("c-tft-api.op.gg"), true, "妮蔻 S16 should use OP.GG, not skill icon");

    // S4: Tencent non-skill URLs should be preserved, then fallback to Tencent CDN
    const leonaS4Sources = resolver.resolveChampionAvatarSources("蕾欧娜", "S4");
    assert.equal(leonaS4Sources[0], "https://game.gtimg.cn/images/lol/act/img/tft/champions/TFT4_Leona.png", "蕾欧娜 S4 should use snapshot URL if not a skill icon");
});

test("tft asset resolver detects skill icon URL patterns including passive and q/w/e/r abilities", () => {
    const corruptedSnapshot = {
        champions: [
            // Q ability
            { name: "提莫", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft16_teemo_q.tft_set16.png" },
            // W ability
            { name: "厄斐琉斯", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft16_aphelios_w.tft_set16.png" },
            // R ability
            { name: "蔚", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft16_vi_r.tft_set16.png" },
            // Icon strip pattern
            { name: "艾克", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/icons_tft16_ekko.tft_set16.png" },
        ],
        items: [],
    };

    const resolver = createTftAssetResolver(corruptedSnapshot);

    // All should fallback to OP.GG for S16
    ["提莫", "厄斐琉斯", "蔚", "艾克"].forEach((name) => {
        const sources = resolver.resolveChampionAvatarSources(name, "S16");
        assert.equal(sources[0]?.includes("c-tft-api.op.gg"), true, `${name} should fallback to OP.GG`);
    });
});
