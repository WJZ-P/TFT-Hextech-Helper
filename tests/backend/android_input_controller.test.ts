import test from "node:test";
import assert from "node:assert/strict";
import { resolveAndroidWindowContentRect } from "../../src-backend/services/AndroidInputController";

test("resolveAndroidWindowContentRect keeps secondary-monitor coordinates and letterboxes by ADB frame aspect", () => {
    const rect = resolveAndroidWindowContentRect(
        {
            left: 1911,
            top: -94,
            width: 1562,
            height: 750,
        },
        {
            width: 1920,
            height: 1080,
        }
    );

    assert.equal(Math.round(rect.width), 1333);
    assert.equal(Math.round(rect.height), 750);
    assert.ok(Math.abs(Math.round(rect.left) - 2026) <= 1);
    assert.equal(Math.round(rect.top), -94);
});

test("resolveAndroidWindowContentRect compensates BlueStacks title chrome on tall outer windows", () => {
    const rect = resolveAndroidWindowContentRect(
        {
            left: 1720,
            top: -154,
            width: 1562,
            height: 797,
        },
        {
            width: 1920,
            height: 1080,
        }
    );

    assert.equal(Math.round(rect.width), 1333);
    assert.equal(Math.round(rect.height), 750);
    assert.ok(Math.abs(Math.round(rect.left) - 1834) <= 1);
    assert.equal(Math.round(rect.top), -154);
});

test("resolveAndroidWindowContentRect accepts explicit content-rect override for emulator chrome calibration", () => {
    const previous = {
        left: process.env.TFT_ANDROID_CONTENT_LEFT,
        top: process.env.TFT_ANDROID_CONTENT_TOP,
        width: process.env.TFT_ANDROID_CONTENT_WIDTH,
        height: process.env.TFT_ANDROID_CONTENT_HEIGHT,
    };
    process.env.TFT_ANDROID_CONTENT_LEFT = "2000";
    process.env.TFT_ANDROID_CONTENT_TOP = "20";
    process.env.TFT_ANDROID_CONTENT_WIDTH = "1200";
    process.env.TFT_ANDROID_CONTENT_HEIGHT = "675";

    try {
        const rect = resolveAndroidWindowContentRect(
            { left: 0, top: 0, width: 100, height: 100 },
            { width: 1920, height: 1080 }
        );

        assert.deepEqual(rect, {
            left: 2000,
            top: 20,
            width: 1200,
            height: 675,
        });
    } finally {
        if (previous.left === undefined) {
            delete process.env.TFT_ANDROID_CONTENT_LEFT;
        } else {
            process.env.TFT_ANDROID_CONTENT_LEFT = previous.left;
        }
        if (previous.top === undefined) {
            delete process.env.TFT_ANDROID_CONTENT_TOP;
        } else {
            process.env.TFT_ANDROID_CONTENT_TOP = previous.top;
        }
        if (previous.width === undefined) {
            delete process.env.TFT_ANDROID_CONTENT_WIDTH;
        } else {
            process.env.TFT_ANDROID_CONTENT_WIDTH = previous.width;
        }
        if (previous.height === undefined) {
            delete process.env.TFT_ANDROID_CONTENT_HEIGHT;
        } else {
            process.env.TFT_ANDROID_CONTENT_HEIGHT = previous.height;
        }
    }
});
