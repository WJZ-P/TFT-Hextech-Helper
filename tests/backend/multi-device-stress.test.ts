/**
 * Multi-Resolution Stress Tests
 * 
 * Tests resolution scaling for Android recognition regions.
 * Validates that region coordinates correctly scale across different resolutions.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
    scaleRegionToResolution,
    scalePointToResolution,
    getResolutionScaleFactor,
    BASE_RESOLUTION,
    androidGameStageDisplayNormal,
    androidHudGoldTextRegion,
} from "../../src-backend/TFTProtocol";

test.describe("Multi-resolution adaptation", () => {
    test("scaleRegionToResolution converts 1024x768 to 720p correctly", () => {
        const region = { leftTop: { x: 0.25, y: 0.01 }, rightBottom: { x: 0.42, y: 0.035 } };
        const target = { width: 960, height: 540 };
        
        const scaled = scaleRegionToResolution(region, target);
        
        // 0.25 * 960 = 240, 0.01 * 540 = 5.4 ≈ 5
        // 0.42 * 960 = 403.2 ≈ 403, 0.035 * 540 = 18.9 ≈ 19
        assert.equal(scaled.leftTop.x, 240, "leftTop.x should be 240");
        assert.equal(scaled.leftTop.y, 5, "leftTop.y should be 5");
        assert.equal(scaled.rightBottom.x, 403, "rightBottom.x should be 403");
        assert.equal(scaled.rightBottom.y, 19, "rightBottom.y should be 19");
    });

    test("scaleRegionToResolution converts 1024x768 to 1080p correctly", () => {
        const region = { leftTop: { x: 0.25, y: 0.01 }, rightBottom: { x: 0.42, y: 0.035 } };
        const target = { width: 1920, height: 1080 };
        
        const scaled = scaleRegionToResolution(region, target);
        
        // 0.25 * 1920 = 480, 0.01 * 1080 = 10.8 ≈ 11
        // 0.42 * 1920 = 806.4 ≈ 806, 0.035 * 1080 = 37.8 ≈ 38
        assert.equal(scaled.leftTop.x, 480, "leftTop.x should be 480");
        assert.equal(scaled.leftTop.y, 11, "leftTop.y should be 11");
        assert.equal(scaled.rightBottom.x, 806, "rightBottom.x should be 806");
        assert.equal(scaled.rightBottom.y, 38, "rightBottom.y should be 38");
    });

    test("scaleRegionToResolution converts 1024x768 to 1440p correctly", () => {
        const region = { leftTop: { x: 0.25, y: 0.01 }, rightBottom: { x: 0.42, y: 0.035 } };
        const target = { width: 2560, height: 1440 };
        
        const scaled = scaleRegionToResolution(region, target);
        
        // 0.25 * 2560 = 640, 0.01 * 1440 = 14.4 ≈ 14
        // 0.42 * 2560 = 1075.2 ≈ 1075, 0.035 * 1440 = 50.4 ≈ 50
        assert.equal(scaled.leftTop.x, 640, "leftTop.x should be 640");
        assert.equal(scaled.leftTop.y, 14, "leftTop.y should be 14");
        assert.equal(scaled.rightBottom.x, 1075, "rightBottom.x should be 1075");
        assert.equal(scaled.rightBottom.y, 50, "rightBottom.y should be 50");
    });

    test("scalePointToResolution works for game slot coordinates", () => {
        // Shop slot 3 center is at x=0.508, y=0.911
        const point = { x: 0.508, y: 0.911 };
        const target1080p = { width: 1920, height: 1080 };
        
        const scaled = scalePointToResolution(point, target1080p);
        
        // 0.508 * 1920 = 975.36 ≈ 975
        // 0.911 * 1080 = 983.88 ≈ 984
        assert.equal(scaled.x, 975, "Shop slot 3 x at 1080p");
        assert.equal(scaled.y, 984, "Shop slot 3 y at 1080p");
    });

    test("getResolutionScaleFactor returns correct ratios", () => {
        const scale1080p = getResolutionScaleFactor({ width: 1920, height: 1080 });
        
        // 1920 / 1024 = 1.875
        // 1080 / 768 = 1.40625
        assert.ok(Math.abs(scale1080p.scaleX - 1.875) < 0.001, "scaleX should be ~1.875");
        assert.ok(Math.abs(scale1080p.scaleY - 1.40625) < 0.001, "scaleY should be ~1.406");
    });

    test("Android stage region scales correctly across resolutions", () => {
        const resolutions = [
            { width: 960, height: 540, name: "720p" },
            { width: 1920, height: 1080, name: "1080p" },
            { width: 2560, height: 1440, name: "1440p" },
        ];
        
        for (const res of resolutions) {
            const scaled = scaleRegionToResolution(androidGameStageDisplayNormal, res);
            
            // Verify region is within bounds
            assert.ok(scaled.leftTop.x >= 0, `${res.name}: leftTop.x >= 0`);
            assert.ok(scaled.leftTop.y >= 0, `${res.name}: leftTop.y >= 0`);
            assert.ok(scaled.rightBottom.x <= res.width, `${res.name}: rightBottom.x <= width`);
            assert.ok(scaled.rightBottom.y <= res.height, `${res.name}: rightBottom.y <= height`);
            
            // Verify region has positive area
            assert.ok(scaled.rightBottom.x > scaled.leftTop.x, `${res.name}: positive width`);
            assert.ok(scaled.rightBottom.y > scaled.leftTop.y, `${res.name}: positive height`);
        }
    });

    test("HUD digit region maintains readable size across resolutions", () => {
        const resolutions = [
            { width: 960, height: 540 },
            { width: 1920, height: 1080 },
            { width: 2560, height: 1440 },
        ];
        
        for (const res of resolutions) {
            const scaled = scaleRegionToResolution(androidHudGoldTextRegion, res);
            
            const regionWidth = scaled.rightBottom.x - scaled.leftTop.x;
            const regionHeight = scaled.rightBottom.y - scaled.leftTop.y;
            
            // HUD text should be at least 20px wide and 8px tall at any resolution
            assert.ok(regionWidth >= 20, `Region width ${regionWidth}px >= 20px at ${res.width}x${res.height}`);
            assert.ok(regionHeight >= 8, `Region height ${regionHeight}px >= 8px at ${res.width}x${res.height}`);
        }
    });

    test("BASE_RESOLUTION matches original design coordinates", () => {
        assert.equal(BASE_RESOLUTION.width, 1024, "Base width should be 1024");
        assert.equal(BASE_RESOLUTION.height, 768, "Base height should be 768");
    });
});
