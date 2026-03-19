import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import cv from "@techstark/opencv-js";
import sharp from "sharp";
import {
    androidEquipmentRegion,
    androidEquipmentSlot,
    getSeasonTemplateDir,
    TFTMode,
} from "../../src-backend/TFTProtocol";
import { buildAndroidExecutionPlan } from "../../src-backend/adapters/AndroidActionPlanner";
import { templateLoader, templateMatcher, screenCapture, mouseController } from "../../src-backend/tft";
import type { ActionPlan } from "../../src-backend/core/types";

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

test("android live equipment region can crop recurve bow directly from real-device 5-2 frame", async () => {
    process.env.VITE_PUBLIC ??= path.resolve(process.cwd(), "public");

    await waitForOpenCvReady();
    await templateLoader.initialize({ watch: false });
    await templateLoader.switchSeason(getSeasonTemplateDir(TFTMode.NORMAL));

    const framePath = path.resolve(
        process.cwd(),
        "examples",
        "recordings",
        "derived",
        "android-real-recording-20260315-ionia",
        "frames",
        "recording-board-5-2.png"
    );
    const cropBuffer = await cropRegionFromFrame(framePath, androidEquipmentRegion.SLOT_5);
    const mat = await screenCapture.pngBufferToMat(cropBuffer);

    try {
        const match = templateMatcher.matchEquip(mat, {
            androidProfile: true,
            acceptWeakTopMatch: true,
        });

        assert.ok(match, "安卓 live 裁切区域未识别到装备");
        assert.equal(match?.name, "反曲之弓");
    } finally {
        if (!mat.isDeleted()) {
            mat.delete();
        }
    }
});

test("android action planner uses android equipment slot coordinates for equip steps", () => {
    const actions: ActionPlan[] = [
        {
            tick: 0,
            type: "EQUIP",
            priority: 100,
            reason: "测试安卓装备拖拽点位",
            payload: {
                itemIndex: 0,
                itemName: "反曲之弓",
                toBoard: "R4_C4",
            },
        },
    ];

    const executionPlan = buildAndroidExecutionPlan(actions, null);
    const equipStep = executionPlan.steps.find((step) => step.kind === "EQUIP_TO_BOARD");

    assert.ok(equipStep?.fromPoint);
    assert.deepEqual(equipStep?.fromPoint?.point, androidEquipmentSlot.EQ_SLOT_1);
});

test("mouse controller converts percentage android points into scaled live coordinates", () => {
    mouseController.setGameWindowOrigin(
        { x: 49, y: 76 },
        { width: 852, height: 494 },
        true
    );

    const target = (mouseController as any).toAbsolutePoint({ x: 0.127, y: 0.7227 });

    assert.equal(target.x, 157);
    assert.equal(target.y, 433);
});
