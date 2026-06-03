import test from "node:test";
import assert from "node:assert/strict";
import type cv from "@techstark/opencv-js";
import { convertOpenCvMatType, createOpenCvSize, getMatType, resizeOpenCvMat } from "../../src-backend/tft/recognition/OpenCvMatUtils";
import { templateMatcher } from "../../src-backend/tft/recognition/TemplateMatcher";

function createDataMat(data: Uint8Array, type?: number): cv.Mat {
    return {
        rows: 2,
        cols: 2,
        data,
        type,
    } as unknown as cv.Mat;
}

test("template matcher empty-slot check works without OpenCV meanStdDev", () => {
    const flatMat = createDataMat(new Uint8Array([10, 10, 10, 10]));
    const variedMat = createDataMat(new Uint8Array([0, 255, 0, 255]));

    assert.equal(templateMatcher.isEmptySlot(flatMat), true);
    assert.equal(templateMatcher.isEmptySlot(variedMat), false);
});

test("OpenCV mat helpers tolerate property-style type and missing Size constructor", () => {
    const mat = createDataMat(new Uint8Array([0, 0, 0, 0]), 17);
    const size = createOpenCvSize({}, 24, 35) as { width: number; height: number };

    assert.equal(getMatType(mat), 17);
    assert.deepEqual(size, { width: 24, height: 35 });
    assert.equal(resizeOpenCvMat({}, mat, createDataMat(new Uint8Array(4)), 24, 35, 0), false);
});

test("OpenCV mat helpers wrap convertTo when available", () => {
    let convertedType: number | null = null;
    const mat = {
        rows: 2,
        cols: 2,
        data: new Uint8Array([0, 0, 0, 0]),
        convertTo: (_destination: cv.Mat, targetType: number) => {
            convertedType = targetType;
        },
    } as unknown as cv.Mat;

    assert.equal(convertOpenCvMatType(mat, createDataMat(new Uint8Array(4)), 0), true);
    assert.equal(convertedType, 0);
    assert.equal(convertOpenCvMatType(createDataMat(new Uint8Array(4)), createDataMat(new Uint8Array(4)), 0), false);
});
