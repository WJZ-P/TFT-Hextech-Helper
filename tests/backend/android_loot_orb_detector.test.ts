import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { detectAndroidLootOrbsFromScreenshot } from "../../src-backend/utils/AndroidLootOrbDetector";

test("android loot orb detector finds blue orbs in real live stage frame", async () => {
    const screenshot = await fs.readFile(path.resolve(
        process.cwd(),
        "examples",
        "recordings",
        "android-foreground-na-captures",
        "pending-real-captures",
        "live-content",
        "na_live_loot_orbs_stage_2_3_01.png"
    ));

    const orbs = await detectAndroidLootOrbsFromScreenshot(screenshot);

    assert.ok(orbs.length >= 1);
    assert.ok(orbs.some((orb) => orb.type === "blue"));
    for (const orb of orbs) {
        assert.ok(orb.x > 0 && orb.x < 1);
        assert.ok(orb.y > 0 && orb.y < 1);
    }
});

test("android loot orb detector finds current white and blue question orbs", async () => {
    const screenshot = await fs.readFile(path.resolve(
        process.cwd(),
        "reports",
        "goal-continue-20260603-loot-diagnosis-current.png"
    ));

    const orbs = await detectAndroidLootOrbsFromScreenshot(screenshot);

    assert.ok(orbs.length >= 2);
    assert.ok(orbs.some((orb) => orb.type === "normal"));
    assert.ok(orbs.some((orb) => orb.type === "blue"));
});

test("android loot orb detector ignores ordinary shop and board colors", async () => {
    const fixtureNames = [
        "na_live_shop_2_1_no_augment_no_loot_01.png",
        "na_live_shop_3_6_blue_decor_no_loot_01.png",
    ];

    for (const fixtureName of fixtureNames) {
        const screenshot = await fs.readFile(path.resolve(
            process.cwd(),
            "examples",
            "recordings",
            "android-foreground-na-captures",
            "pending-real-captures",
            "live-content",
            fixtureName
        ));

        const orbs = await detectAndroidLootOrbsFromScreenshot(screenshot);

        assert.equal(orbs.length, 0, fixtureName);
    }
});
