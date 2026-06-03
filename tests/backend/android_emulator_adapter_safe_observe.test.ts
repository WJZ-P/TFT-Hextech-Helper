import test from "node:test";
import assert from "node:assert/strict";
import { shouldReadShopDuringAndroidObserve } from "../../src-backend/adapters/AndroidObservePolicy.ts";

test("android emulator adapter skips shop OCR while safe observe is enabled", () => {
    assert.equal(shouldReadShopDuringAndroidObserve({ safeObserve: true }), false);
});

test("android emulator adapter keeps shop OCR available for explicit full observe", () => {
    assert.equal(shouldReadShopDuringAndroidObserve({ safeObserve: false }), true);
    assert.equal(shouldReadShopDuringAndroidObserve({}), true);
});
