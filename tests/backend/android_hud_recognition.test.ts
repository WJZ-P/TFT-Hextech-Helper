/**
 * Regression coverage — Android OCR (opening, augment, shop, board stages)
 *
 * - Tests below validate recognition on all real-device crops in
 *   `examples/recordings/derived/android-real-recording-20260315-ionia/crops/`
 * - Shop-open 5-1 regression (`recording-shop-5-1-stage-raw.png`) root-cause note:
 *   - before fix: OCR candidates commonly had only one `5-1` hit (`stage/threshold-100`), but two `3-1` hits (`stage/threshold-120`, `stage/threshold-130`), so `selectBestStageText` picked `3-1`
 *   - after fix: added `stage/threshold-110` variant; this crop now contributes an extra `5-1`, letting selection prefer `5-1`
 *   - manual QA reference candidate sample (Mar 2026):
 *     `stage/raw="1"`, `stage/gray-normalize="2"`, `stage/threshold-100="5-1"`, `stage/threshold-110="5-1"`, `stage/threshold-120="31"`, `stage/threshold-130="3-1"`
 * - If adding new OCR/correction logic or new fixtures, update regression docblocks in OcrService.ts & RecognitionUtils.ts
 *   and ensure all edge/failure cases are clearly called out here and in code
 */
import test, { after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";
import {
    OcrWorkerType,
    buildChampionOcrVariants,
    buildAndroidStageOcrVariants,
    buildAndroidHudDigitVariants,
    buildAndroidPlayerNameOcrVariants,
    extractLikelyHudNumber,
    extractLikelyPlayerNameToken,
    extractLikelyStageText,
    extractLikelyXpText,
    extractSelfHpFromScoreboardText,
    inferLevelFromXpTotal,
    ocrService,
    resolveChampionNameFromText,
    selectBestPlayerNameCandidate,
    selectBestStageText,
} from "../../src-backend/tft";
import { GameStageType, androidShopSlotNameRegions, type TFTUnit } from "../../src-backend/TFTProtocol";
import { parseStageStringToEnum } from "../../src-backend/tft/utils/GameStageParser";
import {
    androidHudBottomGoldTextRegion,
    androidHudGoldTextRegion,
    androidScoreboardRegion,
    androidSelfNameplateRegion,
    androidHudXpTextRegion,
} from "../../src-backend/TFTProtocol";
import { tftDataService } from "../../src-backend/services/TftDataService";

function resolveFramePath(fileName: string): string {
    return path.resolve(
        process.cwd(),
        "examples",
        "recordings",
        "derived",
        "android-real-recording-20260315-ionia",
        "frames",
        fileName
    );
}

async function cropRegionFromFrame(
    framePath: string,
    region: {
        leftTop: { x: number; y: number };
        rightBottom: { x: number; y: number };
    }
): Promise<Buffer> {
    const metadata = await sharp(framePath).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    const left = Math.round(region.leftTop.x * width);
    const top = Math.round(region.leftTop.y * height);
    const right = Math.round(region.rightBottom.x * width);
    const bottom = Math.round(region.rightBottom.y * height);

    return sharp(framePath)
        .extract({
            left,
            top,
            width: right - left,
            height: bottom - top,
        })
        .png()
        .toBuffer();
}

function resolveCropPath(fileName: string): string {
    return path.resolve(
        process.cwd(),
        "examples",
        "recordings",
        "derived",
        "android-real-recording-20260315-ionia",
        "crops",
        fileName
    );
}

function resolveAnalysisPath(fileName: string): string {
    return path.resolve(
        process.cwd(),
        "examples",
        "recordings",
        "analysis",
        fileName
    );
}

after(async () => {
    await ocrService.destroy();
});

test("android HUD gold OCR recognizes legacy real-device 2-5 / 5-1 / 5-2 frames", { timeout: 120000 }, async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const fixtures = [
        { crop: "recording-board-2-5-gold-aligned.png", expectedGold: 20 },
        { crop: "recording-shop-5-1-gold-aligned.png", expectedGold: 64 },
        { crop: "recording-board-5-2-gold-aligned.png", expectedGold: 64 },
    ];

    for (const fixture of fixtures) {
        const crop = await sharp(resolveAnalysisPath(fixture.crop)).png().toBuffer();
        const variants = await buildAndroidHudDigitVariants(crop);
        const candidates: string[] = [];

        for (const variant of variants) {
            const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.HUD_DIGITS);
            const normalized = extractLikelyHudNumber(rawText, { min: 0, max: 99, maxDigits: 2, preferSuffix: true });
            if (normalized) {
                candidates.push(normalized);
            }
        }

        const best = [...new Set(candidates)]
            .sort((left, right) => candidates.filter((entry) => entry === right).length - candidates.filter((entry) => entry === left).length)[0];

        assert.equal(
            parseInt(best ?? "", 10),
            fixture.expectedGold,
            `金币识别失败: ${fixture.crop}, candidates=${candidates.join(",")}`
        );
    }
});

test("android HUD gold OCR recognizes current top-HUD live frames", { timeout: 120000 }, async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const fixtures = [
        {
            frame: path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-110806-safe-shop-no-template-live",
                "tick-00009-unknown.png"
            ),
            expectedGold: 11,
        },
        {
            frame: path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-110806-safe-shop-no-template-live",
                "tick-00011-in-game-transition.png"
            ),
            expectedGold: 29,
        },
        {
            frame: path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-111920-combat-live-after-classifier",
                "tick-00002-unknown.png"
            ),
            expectedGold: 44,
        },
    ];

    for (const fixture of fixtures) {
        const crop = await cropRegionFromFrame(fixture.frame, androidHudGoldTextRegion);
        const variants = await buildAndroidHudDigitVariants(crop);
        const candidates: string[] = [];

        for (const variant of variants) {
            const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.HUD_DIGITS);
            const normalized = extractLikelyHudNumber(rawText, { min: 0, max: 99, maxDigits: 2, preferSuffix: true });
            if (normalized) {
                candidates.push(normalized);
            }
        }

        const best = [...new Set(candidates)]
            .sort((left, right) => candidates.filter((entry) => entry === right).length - candidates.filter((entry) => entry === left).length)[0];

        assert.equal(
            parseInt(best ?? "", 10),
            fixture.expectedGold,
            `当前顶部金币识别失败: ${fixture.frame}, candidates=${candidates.join(",")}`
        );
    }
});

test("android HUD gold OCR recognizes bottom-right shop coin badge", { timeout: 120000 }, async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const crop = await cropRegionFromFrame(
        path.resolve(process.cwd(), "reports", "goal-current-after-star-guardian-patch.png"),
        androidHudBottomGoldTextRegion
    );
    const variants = await buildAndroidHudDigitVariants(crop);
    const candidates: string[] = [];

    for (const variant of variants) {
        const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.HUD_DIGITS);
        const normalized = extractLikelyHudNumber(rawText, {
            min: 0,
            max: 200,
            maxDigits: 3,
            preferSuffix: true,
        });
        if (normalized) {
            candidates.push(normalized);
        }
    }

    const support = candidates.filter((candidate) => candidate === "82").length;
    assert.ok(support >= 2, `底部金币识别支持不足: candidates=${candidates.join(",")}`);
});

test("android HUD XP OCR can derive level info from real-device 2-5 / 5-1 / 5-2 frames", { timeout: 120000 }, async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const fixtures = [
        { frame: "recording-board-2-5.png", expectedXp: "2/10", expectedLevel: 4 },
        { frame: "recording-shop-5-1.png", expectedXp: "58/60", expectedLevel: 7 },
        { frame: "recording-board-5-2.png", expectedXp: "20/68", expectedLevel: 8 },
    ];

    for (const fixture of fixtures) {
        const crop = await cropRegionFromFrame(resolveFramePath(fixture.frame), androidHudXpTextRegion);
        const variants = await buildAndroidHudDigitVariants(crop);
        const candidates: string[] = [];

        for (const variant of variants) {
            const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.HUD_DIGITS);
            const normalized = extractLikelyXpText(rawText);
            if (normalized) {
                candidates.push(normalized);
            }
        }

        const best = [...new Set(candidates)]
            .sort((left, right) => candidates.filter((entry) => entry === right).length - candidates.filter((entry) => entry === left).length)[0];

        assert.equal(best, fixture.expectedXp, `经验识别失败: ${fixture.frame}, candidates=${candidates.join(",")}`);

        const totalXp = parseInt(best.split("/")[1], 10);
        assert.equal(inferLevelFromXpTotal(totalXp), fixture.expectedLevel);
    }
});

test("android HUD XP OCR recognizes current mobile 18-XP level-five frames", { timeout: 120000 }, async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const fixtures = [
        {
            frame: path.resolve(
                process.cwd(),
                "reports",
                "goal-continue-20260603-144248-roster-transition-live",
                "tick-00001-unknown.png"
            ),
            expectedXp: "2/18",
            expectedLevel: 5,
        },
        {
            frame: path.resolve(process.cwd(), "reports", "goal-current-after-roster-transition-patch.png"),
            expectedXp: "0/18",
            expectedLevel: 5,
        },
    ];

    for (const fixture of fixtures) {
        const crop = await cropRegionFromFrame(fixture.frame, androidHudXpTextRegion);
        const variants = await buildAndroidHudDigitVariants(crop);
        const candidates: string[] = [];

        for (const variant of variants) {
            const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.HUD_DIGITS);
            const normalized = extractLikelyXpText(rawText);
            if (normalized) {
                candidates.push(normalized);
            }
        }

        const best = [...new Set(candidates)]
            .sort((left, right) => candidates.filter((entry) => entry === right).length - candidates.filter((entry) => entry === left).length)[0];

        assert.equal(best, fixture.expectedXp, `当前 18 经验识别失败: ${fixture.frame}, candidates=${candidates.join(",")}`);

        const totalXp = parseInt(best.split("/")[1], 10);
        assert.equal(inferLevelFromXpTotal(totalXp), fixture.expectedLevel);
    }
});

test("android HUD self HP can be matched from self nameplate and scoreboard OCR", { timeout: 120000 }, async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const framePath = resolveFramePath("recording-board-5-2.png");
    const selfNameCrop = await cropRegionFromFrame(framePath, androidSelfNameplateRegion);
    const scoreboardCrop = await cropRegionFromFrame(framePath, androidScoreboardRegion);
    const selfNameVariants = await buildAndroidPlayerNameOcrVariants(selfNameCrop);
    const scoreboardVariants = await buildAndroidPlayerNameOcrVariants(scoreboardCrop);

    const selfNameCandidates: string[] = [];
    for (const variant of selfNameVariants) {
        const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.PLAYER_NAME);
        const normalized = extractLikelyPlayerNameToken(rawText);
        if (normalized) {
            selfNameCandidates.push(normalized);
        }
    }

    const selfName = selectBestPlayerNameCandidate(selfNameCandidates);
    assert.ok(selfName, `未能从名牌识别自己名称: ${selfNameCandidates.join(",")}`);

    let hp: number | null = null;
    for (const variant of scoreboardVariants) {
        const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.PLAYER_NAME);
        hp = extractSelfHpFromScoreboardText(selfName, rawText);
        if (hp !== null) {
            break;
        }
    }

    assert.equal(hp, 29);
});

test("android stage OCR recognizes opening, shop-open, and topbar variant crops from real-device samples", { timeout: 120000 }, async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const fixtures = [
        { crop: "recording-opening-detail-1-4-stage-raw.png", expectedText: "1-4", expectedType: GameStageType.EARLY_PVE },
        { crop: "recording-augment-3-2-stage-raw.png", expectedText: "3-2", expectedType: GameStageType.AUGMENT },
        { crop: "recording-board-2-5-stage-raw.png", expectedText: "2-5", expectedType: GameStageType.PVP },
        { crop: "recording-shop-5-1-stage-raw.png", expectedText: "5-1", expectedType: GameStageType.PVP }
    ];

    for (const fixture of fixtures) {
        const cropBuffer = await sharp(resolveCropPath(fixture.crop)).png().toBuffer();
        const variants = await buildAndroidStageOcrVariants(cropBuffer);
        const candidates: Array<{ text: string; rawText: string; label: string }> = [];

        for (const variant of variants) {
            const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.GAME_STAGE);
            const extracted = extractLikelyStageText(rawText);
            if (!extracted) {
                continue;
            }

            candidates.push({
                text: extracted,
                rawText,
                label: variant.label,
            });
        }

        const best = selectBestStageText(candidates).text ?? "";
        assert.equal(best, fixture.expectedText, `阶段识别失败: ${fixture.crop}`);
        assert.equal(parseStageStringToEnum(best), fixture.expectedType, `阶段类型识别失败: ${fixture.crop}`);
    }
});

test("android shop OCR recognizes current live shop names with dynamic champion catalog", { timeout: 120000 }, async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");
    await tftDataService.refresh(false);

    const catalog: Record<string, TFTUnit> = {};
    for (const champion of tftDataService.getSnapshot().champions) {
        catalog[champion.name] = {
            displayName: champion.name,
            englishId: champion.englishId ?? champion.id,
            price: champion.cost,
            traits: champion.traits,
            origins: champion.traits,
            classes: [],
            attackRange: champion.attackRange ?? 1,
        };
    }

    const framePath = path.resolve(process.cwd(), "reports", "goal-continue-current-after-continued.png");
    const expected: Record<keyof typeof androidShopSlotNameRegions, string> = {
        SLOT_1: "蕾欧娜",
        SLOT_2: "伊泽瑞尔",
        SLOT_3: "纳尔",
        SLOT_4: "潘森",
        SLOT_5: "丽桑卓",
    };

    for (const [slot, expectedName] of Object.entries(expected)) {
        const crop = await cropRegionFromFrame(
            framePath,
            androidShopSlotNameRegions[slot as keyof typeof androidShopSlotNameRegions]
        );
        const variants = await buildChampionOcrVariants(crop, "SHOP");
        const candidates: string[] = [];

        for (const variant of variants) {
            const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.CHESS);
            const resolved = resolveChampionNameFromText(rawText, catalog);
            if (resolved.name) {
                candidates.push(resolved.name);
            }
        }

        assert.ok(
            candidates.includes(expectedName),
            `当前商店 ${slot} 识别失败: expected=${expectedName}, candidates=${candidates.join(",")}`
        );
    }
});
