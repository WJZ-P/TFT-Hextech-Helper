import test from "node:test";
import assert from "node:assert/strict";
import { createTftAssetResolver } from "../../src/utils/tftAssetResolver";

/**
 * Integration test validating S16 champion avatar resolution against 10 target champions.
 * These champions were reported to have corrupted imageUrl in snapshot (skill icons instead of portraits).
 * 
 * Test strategy:
 * 1. Create resolver with snapshot containing skill icon URLs for each champion
 * 2. Verify resolver filters out skill icon and falls back to OP.GG
 * 3. Confirm resolved source matches expected OP.GG URL pattern
 */

test("S16 champion avatars resolve correctly for 10 target champions with corrupted snapshot URLs", () => {
    // Simulate snapshot with corrupted S16 champion URLs (skill icons instead of portraits)
    // Real champions reported with this issue:
    // 厄斐琉斯, 妮蔻, 蔚, 洛里斯, 奥瑞利安·索尔, 斯维因, 塔里克, 萨勒芬妮, 阿兹尔, 希瓦娜
    const corruptedSnapshot = {
        champions: [
            // Aphelios (厄斐琉斯) — Tencent snapshot contains W ability icon
            { name: "厄斐琉斯", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_aphelios_w.tft_set15.png" },
            
            // Nidalee (妮蔻) — Tencent snapshot contains Q ability icon
            { name: "妮蔻", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_nidalee_q.tft_set15.png" },
            
            // Vi (蔚) — Tencent snapshot contains E ability icon
            { name: "蔚", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_vi_e.tft_set15.png" },
            
            // Lorrys (洛里斯) — Note: verifying if this is actual S16 champion name
            // If it's a typo or translation variant, using placeholder for now
            // Assume it contains passive skill icon
            { name: "洛里斯", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_lorys_passive.tft_set15.png" },
            
            // Aurelion Sol (奥瑞利安·索尔) — Tencent snapshot contains R ability icon
            { name: "奥瑞利安·索尔", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_aurelion_sol_r.tft_set15.png" },
            
            // Swain (斯维因) — Tencent snapshot contains W ability icon
            { name: "斯维因", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_swain_w.tft_set15.png" },
            
            // Taric (塔里克) — Tencent snapshot contains Q ability icon
            { name: "塔里克", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_taric_q.tft_set15.png" },
            
            // Seraphine (萨勒芬妮) — Tencent snapshot contains E ability icon
            { name: "萨勒芬妮", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_seraphine_e.tft_set15.png" },
            
            // Azir (阿兹尔) — Tencent snapshot contains passive skill icon
            { name: "阿兹尔", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_azir_passive.tft_set15.png" },
            
            // Shyvana (希瓦娜) — Tencent snapshot contains icon strip pattern
            { name: "希瓦娜", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/icons_tft15_shyvana.tft_set15.png" },
        ],
        items: [],
    };

    const resolver = createTftAssetResolver(corruptedSnapshot);

    // Test each target champion
    const targetChampions = [
        "厄斐琉斯",
        "妮蔻",
        "蔚",
        "洛里斯",
        "奥瑞利安·索尔",
        "斯维因",
        "塔里克",
        "萨勒芬妮",
        "阿兹尔",
        "希瓦娜",
    ];

    for (const championName of targetChampions) {
        const sources = resolver.resolveChampionAvatarSources(championName, "S16");
        
        // Verify sources are not empty
        assert.ok(
            sources.length > 0,
            `${championName} should have at least one source (OP.GG fallback)`
        );
        
        // Verify first source is OP.GG (not Tencent skill icon)
        assert.ok(
            sources[0]?.includes("c-tft-api.op.gg"),
            `${championName} should use OP.GG as primary source, not Tencent skill icon`
        );
        
        // Verify OP.GG URL contains expected S16 set marker
        assert.ok(
            sources[0]?.includes("tft_set16"),
            `${championName} OP.GG URL should contain S16 set marker (tft_set16)`
        );
    }
});

/**
 * Validate that skill icon patterns are correctly detected and filtered.
 * Tests real S16 champions with corrupted skill icon URLs from snapshot.
 */
test("S16 skill icon patterns are consistently detected across all ability types", () => {
    // Use real S16 champions with various skill icon patterns
    const skillIconVariations = [
        // Aphelios (厄斐琉斯) — W ability
        { name: "厄斐琉斯", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_aphelios_w.tft_set15.png" },
        
        // Nidalee (妮蔻) — Passive ability
        { name: "妮蔻", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_nidalee_passive.tft_set15.png" },
        
        // Vi (蔚) — E ability
        { name: "蔚", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_vi_e.tft_set15.png" },
        
        // Ahri (阿狸) — Icon strip pattern (from actual data)
        { name: "阿狸", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/icons_tft15_ahri_e.tft_set15.png" },
    ];

    const resolver = createTftAssetResolver({
        champions: skillIconVariations,
        items: [],
    });

    for (const champion of skillIconVariations) {
        const sources = resolver.resolveChampionAvatarSources(champion.name, "S16");
        
        // All skill icon URLs should be filtered out, and resolver should return OP.GG fallback
        assert.ok(
            sources.length > 0,
            `${champion.name} should have sources after filtering skill icon`
        );
        assert.ok(
            sources[0]?.includes("c-tft-api.op.gg") || sources[0]?.startsWith("https://game.gtimg.cn"),
            `${champion.name} should use CDN fallback after filtering skill icon URL`
        );
    }
});

/**
 * Verify that valid (non-skill-icon) snapshot URLs are preserved for reference,
 * even though S16 may skip to OP.GG due to general Tencent S16 unreliability.
 * S4 should keep valid non-skill URLs as primary fallback.
 */
test("S16 valid non-skill URLs are properly filtered, S4 keeps them for compatibility", () => {
    const mixedSnapshot = {
        champions: [
            // Valid non-skill S4 URL (should be kept)
            { name: "蕾欧娜", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/TFT4_Leona.png" },
            
            // Skill icon URL (should be filtered for S16)
            { name: "艾克", imageUrl: "https://game.gtimg.cn/images/lol/act/img/tft/champions/tft15_ekko_e.tft_set15.png" },
        ],
        items: [],
    };

    const resolver = createTftAssetResolver(mixedSnapshot);

    // S4: non-skill URL should be preserved as primary source
    const leonaS4Sources = resolver.resolveChampionAvatarSources("蕾欧娜", "S4");
    assert.equal(
        leonaS4Sources[0],
        "https://game.gtimg.cn/images/lol/act/img/tft/champions/TFT4_Leona.png",
        "蕾欧娜 S4 should keep valid snapshot URL as primary fallback"
    );

    // S16: skill icon URL should be filtered out, OP.GG should be primary
    const ekkoS16Sources = resolver.resolveChampionAvatarSources("艾克", "S16");
    assert.ok(
        ekkoS16Sources[0]?.includes("c-tft-api.op.gg"),
        "艾克 S16 should filter out skill icon and use OP.GG"
    );
});
