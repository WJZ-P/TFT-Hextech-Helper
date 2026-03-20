import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
test("Electron lineup GUI verification reports local assets when season-pack resources are available offline", { timeout: 120000 }, async () => {
    const { stdout } = await execFileAsync(
        process.execPath,
        ["--import", "tsx", "scripts/verify-lineups-gui.ts"],
        {
            cwd: repoRoot,
            windowsHide: true,
            timeout: 45000,
        }
    );

    const summaryMarker = stdout.split("[gui-verify] summary=").pop();
    assert.ok(summaryMarker, "未找到 GUI 验证输出");
    const parsed = JSON.parse((summaryMarker ?? "").split(/\r?\n/)[0]) as {
        hash: string;
        lineupPageVisible: boolean;
        createButtonVisible: boolean;
        localImageCount: number;
        remoteImageCount: number;
        brokenImageCount: number;
    };

    assert.equal(parsed.hash, "#/lineups");
    assert.equal(parsed.lineupPageVisible, true);
    assert.equal(parsed.createButtonVisible, true);
    assert.ok(parsed.localImageCount > 0, "应至少命中一个本地 season-pack 资源");
    assert.equal(parsed.remoteImageCount, 0, "离线阻断远端资源时不应依赖 CDN");
    assert.equal(parsed.brokenImageCount, 0, "离线场景下不应出现破图");
});
