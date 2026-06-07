import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {
    isLikelyOpponentBoardViewForHud,
    isLikelyOpponentBoardViewForLoot,
} from "../../src-backend/adapters/AndroidOpponentBoardView";
import { classifyAndroidWindowScreenshot } from "../../src-backend/utils/AndroidWindowClassifier";

async function classifyFixture(...segments: string[]) {
    const screenshot = await fs.readFile(path.resolve(process.cwd(), ...segments));
    return classifyAndroidWindowScreenshot(screenshot);
}

test("android emulator adapter detects opponent board view before loot pickup", async () => {
    const beforeDirectTap = await classifyFixture(
        "reports",
        "goal-continue-20260603-after-direct-adb-orb-tap.png"
    );
    const afterDirectTap = await classifyFixture(
        "reports",
        "goal-continue-20260603-after-direct-adb-left-orb-tap.png"
    );

    assert.equal(isLikelyOpponentBoardViewForLoot(beforeDirectTap), true);
    assert.equal(isLikelyOpponentBoardViewForLoot(afterDirectTap), true);
});

test("android emulator adapter does not treat shop-open own board as opponent board", async () => {
    const shopOpen = await classifyFixture(
        "reports",
        "goal-continue-20260603-after-shop-open-loot-pick.png"
    );
    const augmentShopOpen = await classifyFixture(
        "reports",
        "goal-continue-20260603-after-augment-pick-run.png"
    );

    assert.equal(isLikelyOpponentBoardViewForLoot(shopOpen), false);
    assert.equal(isLikelyOpponentBoardViewForLoot(augmentShopOpen), false);
});

test("android emulator adapter detects opponent board view before HUD reads", async () => {
    const opponentCombat = await classifyFixture(
        "reports",
        "goal-current-after-econ-patch-live-validation.png"
    );
    const sideListCombat = await classifyFixture(
        "reports",
        "goal-current-20260603-after-recovered-queue-run.png"
    );
    const darkArenaSideListCombat = await classifyFixture(
        "reports",
        "goal-current-20260603-after-stage3-econ-patch-live.png"
    );
    const brightArenaSideListCombat = await classifyFixture(
        "reports",
        "goal-continue-20260603-181820-stage3-econ-patch-live",
        "tick-00024-in-game-transition.png"
    );
    const shopOpenOpponentBoardCombat = await classifyFixture(
        "reports",
        "goal-current-20260604-after-post-augment-rule-requeue.png"
    );
    const earlyOpponentBoardCombat = await classifyFixture(
        "reports",
        "goal-continue-20260605-unknown-econ-level-fix-live",
        "tick-00010-unknown.png"
    );
    const currentStage3OpponentCombat = await classifyFixture(
        "reports",
        "goal-continue-20260605-item-room-guard-midgame-live",
        "tick-00009-unknown.png"
    );
    const freshWeakOpponentCombat = await classifyFixture(
        "reports",
        "goal-continue-20260605-post-stage3-classifier-fresh-live",
        "tick-00009-unknown.png"
    );
    const freshStage3OpponentCombat = await classifyFixture(
        "reports",
        "goal-continue-20260605-post-stage3-classifier-fresh-live",
        "tick-00018-unknown.png"
    );

    assert.equal(isLikelyOpponentBoardViewForHud(opponentCombat), true);
    assert.equal(isLikelyOpponentBoardViewForHud(sideListCombat), true);
    assert.equal(isLikelyOpponentBoardViewForHud(darkArenaSideListCombat), true);
    assert.equal(isLikelyOpponentBoardViewForHud(brightArenaSideListCombat), true);
    assert.equal(isLikelyOpponentBoardViewForHud(shopOpenOpponentBoardCombat), true);
    assert.equal(isLikelyOpponentBoardViewForHud(earlyOpponentBoardCombat), true);
    assert.equal(isLikelyOpponentBoardViewForHud(currentStage3OpponentCombat), true);
    assert.equal(isLikelyOpponentBoardViewForHud(freshWeakOpponentCombat), true);
    assert.equal(isLikelyOpponentBoardViewForHud(freshStage3OpponentCombat), true);
});

test("android emulator adapter does not return from own-board shop before HUD reads", async () => {
    const shopOpen = await classifyFixture(
        "reports",
        "goal-current-after-shop-loot-follow.png"
    );
    const augmentShopOpen = await classifyFixture(
        "reports",
        "goal-current-after-live-protect-run.png"
    );

    assert.equal(isLikelyOpponentBoardViewForHud(shopOpen), false);
    assert.equal(isLikelyOpponentBoardViewForHud(augmentShopOpen), false);
});
