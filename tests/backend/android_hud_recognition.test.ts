import test, { after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import sharp from "sharp";
import {
    OcrWorkerType,
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
    selectBestPlayerNameCandidate,
    selectBestStageText,
} from "../../src-backend/tft";
import { GameStageType } from "../../src-backend/TFTProtocol";
import { parseStageStringToEnum } from "../../src-backend/tft/utils/GameStageParser";
import {
    androidHudGoldTextRegion,
    androidScoreboardRegion,
    androidSelfNameplateRegion,
    androidHudXpTextRegion,
} from "../../src-backend/TFTProtocol";

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

after(async () => {
    await ocrService.destroy();
});

test("android HUD gold OCR recognizes real-device 2-5 / 5-1 / 5-2 frames", { timeout: 120000 }, async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    const fixtures = [
        { frame: "recording-board-2-5.png", expectedGold: 20 },
        { frame: "recording-shop-5-1.png", expectedGold: 64 },
        { frame: "recording-board-5-2.png", expectedGold: 64 },
    ];

    for (const fixture of fixtures) {
        const crop = await cropRegionFromFrame(resolveFramePath(fixture.frame), androidHudGoldTextRegion);
        const variants = await buildAndroidHudDigitVariants(crop);
        const candidates: string[] = [];

        for (const variant of variants) {
            const rawText = await ocrService.recognize(variant.buffer, OcrWorkerType.HUD_DIGITS);
            const normalized = extractLikelyHudNumber(rawText, { min: 0, max: 99, maxDigits: 2 });
            if (normalized) {
                candidates.push(normalized);
            }
        }

        const best = [...new Set(candidates)]
            .sort((left, right) => candidates.filter((entry) => entry === right).length - candidates.filter((entry) => entry === left).length)[0];

        assert.equal(
            parseInt(best ?? "", 10),
            fixture.expectedGold,
            `金币识别失败: ${fixture.frame}, candidates=${candidates.join(",")}`
        );
    }
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
