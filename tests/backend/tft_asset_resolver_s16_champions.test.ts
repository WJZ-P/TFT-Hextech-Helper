import test from "node:test";
import assert from "node:assert/strict";
import { createTftAssetResolver } from "../../src/utils/tftAssetResolver";

/**
 * S16 champion avatar resolution tests.
 *
 * The Tencent CDN snapshot is universally unreliable for S16 — nearly all
 * champions have ability/skill icon URLs as their imageUrl (e.g.
 * tft16_jinx_q1, tft16_garen_e1, tft16_viw2, tft16_shyvanadragonsdescent).
 *
 * The resolver must skip Tencent CDN snapshot URLs for S16 and resolve to OP.GG.
 * Local season-pack paths are preserved since they are user-provided and reliable.
 */

test("S16: Tencent CDN snapshot URLs are always skipped, OP.GG is primary for ALL champions", () => {
    // Real snapshot entries from tft-data-snapshot.json — these are ALL corrupted
    // with ability/skill icon URLs, not champion portraits
    const realCorruptedSnapshot = {
        champions: [
            // Ability suffix patterns: _q, _w, _e, _r, _p, _q1, _e1, _r1, _w1, _w2
            { name: "厄斐琉斯", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_apheliosq.tft_set16.png" },
            { name: "蔚", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_viw2.tft_set16.png" },
            { name: "金克丝", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_jinx_q1.tft_set16.png" },
            { name: "盖伦", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_garen_e1.tft_set16.png" },
            { name: "菲兹", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_fizz_e1.tft_set16.png" },
            { name: "俄洛伊", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_illaoi_p.tft_set16.png" },
            { name: "赛恩", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_sion_w1.tft_set16.png" },
            { name: "沃里克", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_warwickp.tft_set16.png" },
            { name: "赵信", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_xinzhaoq.tft_set16.png" },
            { name: "奥恩", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_ornnr1.tft_set16.png" },

            // Ability name suffix patterns (not just single letter)
            { name: "希瓦娜", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_shyvanadragonsdescent.tft_set16.png" },
            { name: "德莱文", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_draven_spinningaxe.tft_set16.png" },
            { name: "拉克丝", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_luxfinalefunkeln.tft_set16.png" },
            { name: "维迦", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_veigardarkmatter.tft_set16.png" },
            { name: "孙悟空", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_wukongstoneskin.tft_set16.png" },
            { name: "璐璐", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_lulu_whimsy.tft_set16.png" },
            { name: "诺提勒斯", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_nautilus_wrath.tft_set16.png" },
            { name: "提莫", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_teemoe.tft_set16.png" },

            // Truncated ability name — looks like champion name but is actually skill
            { name: "吉格斯", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_ziggsr.tft_set16.png" },
            { name: "蕾欧娜", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_leonar.tft_set16.png" },
            { name: "永恩", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_yoner.tft_set16.png" },
            { name: "格雷福斯", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_gravesr.tft_set16.png" },
            { name: "布里茨", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_blitzcrankr.tft_set16.png" },
            { name: "费德提克", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_fiddlesticksr.tft_set16.png" },
            { name: "贝蕾亚", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_briarw.tft_set16.png" },
            
            // Wrapper/compound suffixes
            { name: "塔姆", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_tahmkenchrwrapper.tft_set16.png" },
            { name: "嘉文四世", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_jarvanive.tft_set16.png" },
            { name: "奥瑞利安·索尔", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_aurelionsole.tft_set16.png" },
            { name: "卑尔维斯", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/original-image/tft16_belvethr.tft_set16.png" },
        ],
        items: [],
    };

    const resolver = createTftAssetResolver(realCorruptedSnapshot);

    for (const champion of realCorruptedSnapshot.champions) {
        const sources = resolver.resolveChampionAvatarSources(champion.name, "S16");

        // Must have at least one source
        assert.ok(
            sources.length > 0,
            `${champion.name} should have at least one avatar source`
        );

        // Primary source MUST be OP.GG, not the Tencent snapshot
        assert.ok(
            sources[0]?.includes("c-tft-api.op.gg"),
            `${champion.name}: primary source should be OP.GG, got: ${sources[0]}`
        );

        // Snapshot URL must NOT appear in sources at all
        assert.ok(
            !sources.includes(champion.imageUrl),
            `${champion.name}: snapshot URL should NOT appear in resolved sources`
        );
    }
});

test("S16: even valid-looking Tencent CDN snapshot URLs are skipped in favor of OP.GG", () => {
    // Some snapshot URLs might accidentally look valid (e.g. no obvious ability suffix)
    // but S16 should ALWAYS skip Tencent CDN URLs to avoid any risk
    const innocentLookingSnapshot = {
        champions: [
            { name: "巴德", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/TFT16_Bard.png" },
            { name: "慎", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/TFT16_Shen.png" },
        ],
        items: [],
    };

    const resolver = createTftAssetResolver(innocentLookingSnapshot);

    for (const champion of innocentLookingSnapshot.champions) {
        const sources = resolver.resolveChampionAvatarSources(champion.name, "S16");
        assert.ok(
            sources[0]?.includes("c-tft-api.op.gg"),
            `${champion.name}: even valid-looking snapshot URL should be skipped for S16, got: ${sources[0]}`
        );
    }
});

test("S4: snapshot URLs ARE preserved as primary source (not skipped)", () => {
    const s4Snapshot = {
        champions: [
            { name: "蕾欧娜", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/TFT4_Leona.png" },
        ],
        items: [],
    };

    const resolver = createTftAssetResolver(s4Snapshot);

    const sources = resolver.resolveChampionAvatarSources("蕾欧娜", "S4");
    assert.equal(
        sources[0],
        "https://game.gtimg.cn/images/lol/act/img/tft/champions/TFT4_Leona.png",
        "S4 should keep valid snapshot URL as primary"
    );
});

test("S16: null/empty snapshot still resolves to OP.GG", () => {
    const resolver = createTftAssetResolver(null);

    // 巴德 should still resolve from CDN fallback
    const sources = resolver.resolveChampionAvatarSources("巴德", "S16");
    assert.ok(
        sources.length > 0,
        "巴德 should have sources even with null snapshot"
    );
    assert.ok(
        sources[0]?.includes("c-tft-api.op.gg"),
        `巴德: should resolve to OP.GG with null snapshot, got: ${sources[0]}`
    );
});
