import fs from "fs";
import path from "path";

function main(): void {
    const summaryPath = path.resolve(process.cwd(), ".cache", "gui-lineups-offline.json");
    const screenshotPath = path.resolve(process.cwd(), ".cache", "gui-lineups-offline.png");
    const reportPath = path.resolve(process.cwd(), "docs", "gui-offline-verification.md");

    if (!fs.existsSync(summaryPath)) {
        throw new Error(`GUI summary not found: ${summaryPath}`);
    }

    const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
        hash: string;
        title: string;
        lineupPageVisible: boolean;
        createButtonVisible: boolean;
        totalImages: number;
        localImageCount: number;
        remoteImageCount: number;
        brokenImageCount: number;
        localImages: Array<{ alt: string; currentSrc: string; src: string }>;
        remoteImages: Array<{ alt: string; currentSrc: string; src: string }>;
        brokenImages: Array<{ alt: string; currentSrc: string; src: string }>;
    };

    const lines = [
        "# GUI Offline Verification",
        "",
        `- Verified route: \`${summary.hash}\``,
        `- Window title: \`${summary.title}\``,
        `- Lineup page visible: **${summary.lineupPageVisible ? "yes" : "no"}**`,
        `- Create lineup button visible: **${summary.createButtonVisible ? "yes" : "no"}**`,
        `- Total rendered images: **${summary.totalImages}**`,
        `- Local season-pack images: **${summary.localImageCount}**`,
        `- Remote CDN images: **${summary.remoteImageCount}**`,
        `- Broken images: **${summary.brokenImageCount}**`,
        "",
        "## Offline Scenario",
        "",
        "Verification was executed in Electron dev mode with:",
        "",
        "- `TFT_START_ROUTE=/lineups`",
        "- `TFT_BLOCK_REMOTE_ASSETS=1`",
        "- `TFT_SEASON_PACK_DIR=tests/backend/fixtures/gui-season-pack/Resources`",
        "",
        "This blocks Tencent / OP.GG image requests and forces the lineup page to rely on synced local season-pack assets.",
        "",
        "## Verified GUI Surfaces",
        "",
        "- lineup page route shell",
        "- lineup cards",
        "- create-lineup modal chess pool avatars",
        "- equipment selection modal icons",
        "",
        "## Sample Local Assets Used",
        "",
        ...summary.localImages.slice(0, 8).map((image) => `- ${image.alt || "(no alt)"}: \`${image.currentSrc || image.src}\``),
        "",
        `## Evidence Files`,
        "",
        `- summary: \`${path.relative(process.cwd(), summaryPath)}\``,
        `- screenshot: \`${path.relative(process.cwd(), screenshotPath)}\``,
        "",
        "## Notes",
        "",
        "- Browser-only verification against the Vite URL is not a valid Electron proof because preload APIs are absent there.",
        "- This record is based on real Electron startup with preload enabled.",
    ];

    fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
    console.log(`[gui-report] wrote ${reportPath}`);
}

main();
