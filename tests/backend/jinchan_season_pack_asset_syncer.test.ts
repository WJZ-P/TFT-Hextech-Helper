import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
    applySeasonPackAssetPaths,
    loadJinChanSeasonPackSnapshot,
    syncJinChanSeasonPackAssets,
} from "../../src-backend/data";

const FIXTURE_ROOT = path.resolve(
    process.cwd(),
    "tests",
    "backend",
    "fixtures",
    "jinchan-main",
    "Resources"
);

const ONE_PIXEL_PNG = Buffer.from(
    "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C6360606060000000050001A5F645400000000049454E44AE426082",
    "hex"
);

async function copyFixtureResources(): Promise<string> {
    const rootDir = await fsp.mkdtemp(path.join(os.tmpdir(), "jinchan-main-sync-"));
    await fsp.cp(FIXTURE_ROOT, rootDir, { recursive: true });
    return rootDir;
}

test("season-pack image sync copies assets and maps local image URLs without overwriting existing files", async () => {
    const resourcesDir = await copyFixtureResources();
    const seasonDir = path.join(resourcesDir, "HeroDatas", "英雄联盟传奇");
    const heroImageDir = path.join(seasonDir, "images");
    const equipmentImageDir = path.join(seasonDir, "EquipmentImages");

    await fsp.mkdir(heroImageDir, { recursive: true });
    await fsp.mkdir(equipmentImageDir, { recursive: true });
    await fsp.writeFile(path.join(heroImageDir, "蕾欧娜.png"), ONE_PIXEL_PNG);
    await fsp.writeFile(path.join(heroImageDir, "卡密尔.png"), ONE_PIXEL_PNG);
    await fsp.writeFile(path.join(equipmentImageDir, "反曲之弓.png"), ONE_PIXEL_PNG);
    await fsp.writeFile(path.join(equipmentImageDir, "无尽之刃.png"), ONE_PIXEL_PNG);

    const snapshot = loadJinChanSeasonPackSnapshot(resourcesDir);
    assert.ok(snapshot);

    const outputRootDir = await fsp.mkdtemp(path.join(os.tmpdir(), "jinchan-synced-assets-"));
    const preexistingPath = path.join(outputRootDir, "英雄联盟传奇", "champions", "卡密尔.png");
    await fsp.mkdir(path.dirname(preexistingPath), { recursive: true });
    await fsp.writeFile(preexistingPath, Buffer.from("preexisting"));

    const report = syncJinChanSeasonPackAssets({
        baseDir: resourcesDir,
        snapshot,
        outputRootDir,
        publicPathPrefix: "resources/season-packs",
    });

    assert.ok(report);
    const syncedSnapshot = applySeasonPackAssetPaths(snapshot, report);
    assert.ok(fs.existsSync(path.join(outputRootDir, "英雄联盟传奇", "asset-map.json")));
    assert.ok(fs.existsSync(path.join(outputRootDir, "英雄联盟传奇", "metadata.json")));
    assert.ok(fs.existsSync(path.join(outputRootDir, "英雄联盟传奇", "champions", "蕾欧娜.png")));
    assert.ok(fs.existsSync(path.join(outputRootDir, "英雄联盟传奇", "equipment", "反曲之弓.png")));
    assert.equal(fs.readFileSync(preexistingPath, "utf8"), "preexisting");
    assert.equal(
        syncedSnapshot.champions.find((champion) => champion.name === "蕾欧娜")?.imageUrl,
        "resources/season-packs/英雄联盟传奇/champions/蕾欧娜.png"
    );
    assert.equal(
        syncedSnapshot.items.find((item) => item.name === "反曲之弓")?.imageUrl,
        "resources/season-packs/英雄联盟传奇/equipment/反曲之弓.png"
    );

    const existingEntry = report?.entries.find((entry) => entry.entityName === "卡密尔" && entry.kind === "champion");
    assert.equal(existingEntry?.status, "existing");
});
