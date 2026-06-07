import test from "node:test";
import assert from "node:assert/strict";
import { buildAndroidSafeObserveAutoDeploySwipes } from "../../src-backend/adapters/AndroidAutoDeployPoints.ts";
import {
    shouldReadShopDuringAndroidObserve,
    shouldUseShopTemplateFallbackDuringAndroidObserve,
} from "../../src-backend/adapters/AndroidObservePolicy.ts";

test("android emulator adapter keeps shop OCR while safe observe is enabled", () => {
    assert.equal(shouldReadShopDuringAndroidObserve({ safeObserve: true }), true);
});

test("android emulator adapter keeps shop OCR available for explicit full observe", () => {
    assert.equal(shouldReadShopDuringAndroidObserve({ safeObserve: false }), true);
    assert.equal(shouldReadShopDuringAndroidObserve({}), true);
});

test("android emulator adapter skips shop template fallback only during safe observe", () => {
    assert.equal(shouldUseShopTemplateFallbackDuringAndroidObserve({ safeObserve: true }), false);
    assert.equal(shouldUseShopTemplateFallbackDuringAndroidObserve({ safeObserve: false }), true);
    assert.equal(shouldUseShopTemplateFallbackDuringAndroidObserve({}), true);
});

test("android safe observe auto deploy uses Android bench coordinates", () => {
    const swipes = buildAndroidSafeObserveAutoDeploySwipes(1);

    assert.equal(swipes.length, 2);
    assert.equal(swipes[0].fromBench, "SLOT_1");
    assert.equal(swipes[0].toBoard, "R4_C3");
    assert.ok(swipes[0].fromPoint.y > 0.84);
    assert.ok(swipes[0].toPoint.y > 0.68);
    assert.ok(swipes[0].toPoint.y < swipes[0].fromPoint.y);
});

test("android safe observe auto deploy expands after multiple economy triggers", () => {
    const swipes = buildAndroidSafeObserveAutoDeploySwipes(4);

    assert.equal(swipes.length, 5);
    assert.equal(swipes.at(-1)?.fromBench, "SLOT_5");
    assert.equal(swipes.at(-1)?.toBoard, "R3_C4");
});
