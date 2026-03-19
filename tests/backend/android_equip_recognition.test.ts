import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import cv from "@techstark/opencv-js";
import { templateLoader, templateMatcher, screenCapture } from "../../src-backend/tft";
import { getSeasonTemplateDir, TFTMode } from "../../src-backend/TFTProtocol";

let openCvReadyPromise: Promise<void> | null = null;

function isOpenCvReady(): boolean {
    try {
        const mat = new cv.Mat(1, 1, cv.CV_8UC1);
        mat.delete();
        return true;
    } catch {
        return false;
    }
}

async function waitForOpenCvReady(): Promise<void> {
    if (isOpenCvReady()) {
        return;
    }

    if (!openCvReadyPromise) {
        openCvReadyPromise = new Promise((resolve) => {
            const runtime = cv as typeof cv & { onRuntimeInitialized?: () => void };
            const previous = runtime.onRuntimeInitialized;
            runtime.onRuntimeInitialized = () => {
                previous?.();
                resolve();
            };
        });
    }

    await openCvReadyPromise;
}

test("android equipment matcher recognizes real-device recurve bow crop without fixture fallback", async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    await waitForOpenCvReady();
    await templateLoader.initialize({ watch: false });
    await templateLoader.switchSeason(getSeasonTemplateDir(TFTMode.NORMAL));

    const cropPath = path.resolve(
        process.cwd(),
        "examples",
        "recordings",
        "derived",
        "android-real-recording-20260315-ionia",
        "crops",
        "recording-board-5-2-recurve-bow-raw.png"
    );
    const cropBuffer = await fs.readFile(cropPath);
    const mat = await screenCapture.pngBufferToMat(cropBuffer);

    try {
        const match = templateMatcher.matchEquip(mat, {
            androidProfile: true,
            acceptWeakTopMatch: true,
        });

        assert.ok(match, "未识别到任何装备");
        assert.equal(match?.name, "反曲之弓");
        assert.ok((match?.confidence ?? 0) >= 0.30);
    } finally {
        if (!mat.isDeleted()) {
            mat.delete();
        }
    }
});
