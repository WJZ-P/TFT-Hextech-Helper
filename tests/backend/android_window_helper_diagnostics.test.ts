import test from "node:test";
import assert from "node:assert/strict";
import { analyzeWindowCandidates, type WindowInfo } from "../../src-backend/utils/WindowHelper";
import { GameClient } from "../../src-backend/utils/SettingsStore";

test("window diagnostics selects strong Android emulator candidate over weak service window", () => {
    const windows: WindowInfo[] = [
        {
            title: "BlueStacks Services",
            left: 0,
            top: 0,
            width: 1280,
            height: 720,
        },
        {
            title: "BlueStacks App Player 5",
            left: 100,
            top: 100,
            width: 1440,
            height: 1080,
        },
        {
            title: "tft-hextech-helper",
            left: 50,
            top: 50,
            width: 1200,
            height: 900,
        },
    ];

    const report = analyzeWindowCandidates(windows, GameClient.ANDROID, windows[1] ?? null);

    assert.equal(report.selected?.title, "BlueStacks App Player 5");
    assert.equal(report.usedWeakFallback, false);
    assert.equal(report.entries.find((entry) => entry.title === "BlueStacks Services")?.bucket, "weak");
    assert.equal(report.entries.find((entry) => entry.title === "tft-hextech-helper")?.excluded, true);
});

test("window diagnostics injects active fallback for hinted emulator window titles", () => {
    const windows: WindowInfo[] = [
        {
            title: "Explorer",
            left: 10,
            top: 10,
            width: 1000,
            height: 700,
        },
    ];

    const activeWindow: WindowInfo = {
        title: "BlueStacks App Player",
        left: 200,
        top: 200,
        width: 1600,
        height: 900,
    };

    const report = analyzeWindowCandidates(windows, GameClient.ANDROID, activeWindow);

    assert.equal(report.selected?.title, "BlueStacks App Player");
    assert.equal(report.entries.some((entry) => entry.injectedActiveFallback), true);
});

test("window diagnostics keeps larger Android player window over active child surfaces", () => {
    const windows: WindowInfo[] = [
        {
            title: "BlueStacks App Player",
            left: 450,
            top: 351,
            width: 996,
            height: 482,
        },
        {
            title: "BlueStacks App Player",
            left: 852,
            top: 470,
            width: 684,
            height: 349,
        },
    ];

    const report = analyzeWindowCandidates(windows, GameClient.ANDROID, windows[1] ?? null);

    assert.equal(report.selected?.left, 450);
    assert.equal(report.selected?.width, 996);
});
