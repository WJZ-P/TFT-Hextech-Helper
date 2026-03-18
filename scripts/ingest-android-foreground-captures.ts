import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { SimplePoint } from "../src-backend/TFTProtocol";
import { classifyAndroidWindowScreenshot } from "../src-backend/utils/AndroidWindowClassifier";
import {
    normalizeAndroidForegroundObservation,
    type AndroidForegroundDecisionKind,
    type AndroidForegroundFixtureDocument,
    type AndroidForegroundFixtureObservationInput,
    type AndroidForegroundState,
} from "../src-backend/services/AndroidForegroundProtocol";

interface CliArgs {
    outputDir: string;
    id: string;
    label: string;
    description: string;
    state?: AndroidForegroundState;
    screenshotPaths: string[];
}

interface CropPreset {
    id: string;
    label: string;
    region: {
        leftTop: SimplePoint;
        rightBottom: SimplePoint;
    };
    note: string;
}

interface GeneratedCrop {
    id: string;
    label: string;
    path: string;
    note: string;
}

interface FrameManifestEntry {
    id: string;
    screenshotPath: string;
    width: number;
    height: number;
    classifiedState: string;
    classifiedVerification: string;
    expectedState: string;
    expectedVerification: string;
    expectedDecisionKind: AndroidForegroundDecisionKind;
    crops: GeneratedCrop[];
}

interface AndroidForegroundCaptureManifest {
    schemaVersion: "android-foreground-manifest.v1";
    id: string;
    label: string;
    description: string;
    generatedAt: string;
    outputDir: string;
    fixturePath: string;
    stateHint: AndroidForegroundState | null;
    frames: FrameManifestEntry[];
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = {
        outputDir: "",
        id: "",
        label: "",
        description: "",
        screenshotPaths: [],
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        if (token === "--output-dir" && argv[index + 1]) {
            args.outputDir = path.resolve(argv[index + 1]);
            index += 1;
            continue;
        }
        if (token === "--id" && argv[index + 1]) {
            args.id = argv[index + 1];
            index += 1;
            continue;
        }
        if (token === "--label" && argv[index + 1]) {
            args.label = argv[index + 1];
            index += 1;
            continue;
        }
        if (token === "--description" && argv[index + 1]) {
            args.description = argv[index + 1];
            index += 1;
            continue;
        }
        if (token === "--state" && argv[index + 1]) {
            args.state = argv[index + 1] as AndroidForegroundState;
            index += 1;
            continue;
        }
        if (token === "--screenshot" && argv[index + 1]) {
            args.screenshotPaths.push(path.resolve(argv[index + 1]));
            index += 1;
        }
    }

    if (!args.outputDir || !args.id || !args.label || !args.description || args.screenshotPaths.length === 0) {
        throw new Error("缺少必要参数: --output-dir --id --label --description --screenshot");
    }

    return args;
}

function inferExpectedDecisionKind(state: AndroidForegroundState, frameIndex: number): AndroidForegroundDecisionKind {
    switch (state) {
        case "UPDATE_READY":
            return frameIndex === 0 ? "WAIT" : frameIndex === 1 ? "TAP_PRIMARY_CTA" : "WAIT";
        case "LOGIN_REQUIRED":
            return "BLOCKED";
        case "LOBBY":
            return frameIndex === 0 ? "WAIT" : frameIndex === 1 ? "TAP_START_QUEUE" : "WAIT";
        case "QUEUE":
            return frameIndex < 5 ? "WAIT" : "TAP_CANCEL_QUEUE";
        case "ACCEPT_READY":
            return frameIndex === 0 ? "TAP_ACCEPT_READY" : "WAIT";
        case "IN_GAME_TRANSITION":
            return "WAIT";
        case "LIVE_CONTENT":
            return "READY";
        case "BLUESTACKS_BOOT":
        case "UNKNOWN":
        default:
            return "WAIT";
    }
}

function buildDraftObservation(
    state: AndroidForegroundState,
    classifiedState: string
): AndroidForegroundFixtureObservationInput {
    switch (state) {
        case "LOBBY":
            return {
                state,
                verification: "REAL_CAPTURE_DRAFT",
                reason: `Real capture draft for lobby; current classifier still sees ${classifiedState}`,
                anchors: ["play-button-draft", "team-planner-draft"],
                actionPoints: { START_QUEUE: { x: 0.86, y: 0.9 } },
                note: "Review lobby anchors and start-queue point against the captured frame.",
            };
        case "QUEUE":
            return {
                state,
                verification: "REAL_CAPTURE_DRAFT",
                reason: `Real capture draft for queue; current classifier still sees ${classifiedState}`,
                anchors: ["queue-status-draft", "cancel-queue-draft"],
                actionPoints: { CANCEL_QUEUE: { x: 0.82, y: 0.9 } },
                note: "Review queue status region and cancel button against the captured frame.",
            };
        case "ACCEPT_READY":
            return {
                state,
                verification: "REAL_CAPTURE_DRAFT",
                reason: `Real capture draft for ready-check accept; current classifier still sees ${classifiedState}`,
                anchors: ["accept-modal-draft", "accept-button-draft"],
                actionPoints: { ACCEPT_READY: { x: 0.61, y: 0.69 } },
                note: "Review ready-check accept button and modal anchors.",
            };
        case "IN_GAME_TRANSITION":
            return {
                state,
                verification: "REAL_CAPTURE_DRAFT",
                reason: `Real capture draft for in-game transition; current classifier still sees ${classifiedState}`,
                anchors: ["loading-center-draft", "pre-hud-transition-draft"],
                note: "Review whether this should stay a unique transition state or fold into queue/accept wait flow.",
            };
        case "UPDATE_READY":
            return {
                state,
                verification: "VERIFIED_REAL",
                reason: "Verified update-ready capture draft",
                anchors: ["update-primary-cta"],
                actionPoints: { PRIMARY_CTA: { x: 0.5, y: 0.545 } },
            };
        case "LOGIN_REQUIRED":
            return {
                state,
                verification: "VERIFIED_REAL",
                reason: "Verified login-required capture draft",
                anchors: ["login-secondary-cta", "patch-progress-bar"],
            };
        case "LIVE_CONTENT":
            return {
                state,
                verification: "VERIFIED_REAL",
                reason: "Verified live-content capture draft",
                anchors: ["hud-gold-region", "scoreboard-region"],
            };
        case "BLUESTACKS_BOOT":
            return {
                state,
                verification: "VERIFIED_REAL",
                reason: "Verified BlueStacks boot capture draft",
                anchors: ["bright-blue-launcher-cta"],
            };
        case "UNKNOWN":
        default:
            return {
                state: "UNKNOWN",
                verification: "VERIFIED_REAL",
                reason: "Classifier could not map this screenshot to a verified Android foreground state",
                anchors: ["no-verified-foreground-match"],
            };
    }
}

function getCropPresetsForState(state: AndroidForegroundState): CropPreset[] {
    switch (state) {
        case "UPDATE_READY":
            return [
                {
                    id: "update-primary-cta",
                    label: "更新主按钮",
                    region: { leftTop: { x: 0.34, y: 0.47 }, rightBottom: { x: 0.66, y: 0.61 } },
                    note: "Review the update CTA for click calibration.",
                },
                {
                    id: "update-dialog-center",
                    label: "更新对话框主体",
                    region: { leftTop: { x: 0.22, y: 0.18 }, rightBottom: { x: 0.79, y: 0.70 } },
                    note: "Useful for distinguishing update from login dialogs.",
                },
            ];
        case "LOGIN_REQUIRED":
            return [
                {
                    id: "login-primary-area",
                    label: "登录主区域",
                    region: { leftTop: { x: 0.30, y: 0.36 }, rightBottom: { x: 0.70, y: 0.70 } },
                    note: "Review login/create-account controls.",
                },
                {
                    id: "login-progress-strip",
                    label: "登录进度条区域",
                    region: { leftTop: { x: 0.15, y: 0.90 }, rightBottom: { x: 0.85, y: 0.97 } },
                    note: "Classifier uses this band to distinguish login/update states.",
                },
            ];
        case "LOBBY":
            return [
                {
                    id: "lobby-start-queue",
                    label: "大厅开始匹配按钮草稿",
                    region: { leftTop: { x: 0.72, y: 0.83 }, rightBottom: { x: 0.96, y: 0.97 } },
                    note: "Review and tighten the real start-queue CTA.",
                },
                {
                    id: "lobby-top-anchors",
                    label: "大厅顶部锚点草稿",
                    region: { leftTop: { x: 0.55, y: 0.05 }, rightBottom: { x: 0.95, y: 0.22 } },
                    note: "Use for invite/team-planner/header anchors.",
                },
            ];
        case "QUEUE":
            return [
                {
                    id: "queue-status-center",
                    label: "匹配中状态草稿",
                    region: { leftTop: { x: 0.30, y: 0.24 }, rightBottom: { x: 0.70, y: 0.56 } },
                    note: "Review for spinner/text/modal anchors.",
                },
                {
                    id: "queue-cancel-cta",
                    label: "取消匹配按钮草稿",
                    region: { leftTop: { x: 0.70, y: 0.83 }, rightBottom: { x: 0.94, y: 0.97 } },
                    note: "Review cancel-queue action point and hitbox.",
                },
            ];
        case "ACCEPT_READY":
            return [
                {
                    id: "accept-modal-center",
                    label: "接受对局弹窗草稿",
                    region: { leftTop: { x: 0.22, y: 0.25 }, rightBottom: { x: 0.78, y: 0.78 } },
                    note: "Review accept modal header/body anchors.",
                },
                {
                    id: "accept-cta",
                    label: "接受对局按钮草稿",
                    region: { leftTop: { x: 0.42, y: 0.61 }, rightBottom: { x: 0.78, y: 0.76 } },
                    note: "Review accept button location.",
                },
            ];
        case "IN_GAME_TRANSITION":
            return [
                {
                    id: "transition-center",
                    label: "入局过渡中心区域草稿",
                    region: { leftTop: { x: 0.18, y: 0.18 }, rightBottom: { x: 0.82, y: 0.72 } },
                    note: "Review loading/fade anchors before live HUD appears.",
                },
                {
                    id: "transition-hud-probe",
                    label: "入局 HUD 探针草稿",
                    region: { leftTop: { x: 0.77, y: 0.10 }, rightBottom: { x: 0.97, y: 0.90 } },
                    note: "Helps determine when transition should hand over to LIVE_CONTENT.",
                },
            ];
        case "LIVE_CONTENT":
            return [
                {
                    id: "live-scoreboard",
                    label: "局内记分板",
                    region: { leftTop: { x: 0.77, y: 0.11 }, rightBottom: { x: 0.97, y: 0.67 } },
                    note: "Existing verified live HUD anchor region.",
                },
                {
                    id: "live-gold",
                    label: "局内金币区域",
                    region: { leftTop: { x: 0.80, y: 0.82 }, rightBottom: { x: 0.93, y: 0.92 } },
                    note: "Existing verified live HUD anchor region.",
                },
            ];
        case "BLUESTACKS_BOOT":
            return [
                {
                    id: "bluestacks-cta",
                    label: "BlueStacks 启动按钮",
                    region: { leftTop: { x: 0.75, y: 0.80 }, rightBottom: { x: 0.99, y: 0.98 } },
                    note: "Existing verified launcher CTA region.",
                },
            ];
        case "UNKNOWN":
        default:
            return [
                {
                    id: "unknown-center",
                    label: "未知状态中心区域",
                    region: { leftTop: { x: 0.20, y: 0.20 }, rightBottom: { x: 0.80, y: 0.80 } },
                    note: "Use to inspect why the frame does not match known states.",
                },
            ];
    }
}

function extractRect(
    width: number,
    height: number,
    region: {
        leftTop: SimplePoint;
        rightBottom: SimplePoint;
    }
) {
    const left = Math.max(0, Math.round(region.leftTop.x * width));
    const top = Math.max(0, Math.round(region.leftTop.y * height));
    const right = Math.max(left + 1, Math.round(region.rightBottom.x * width));
    const bottom = Math.max(top + 1, Math.round(region.rightBottom.y * height));

    return {
        left,
        top,
        width: Math.max(1, right - left),
        height: Math.max(1, bottom - top),
    };
}

async function writeCrops(
    screenshotPath: string,
    outputDir: string,
    frameId: string,
    state: AndroidForegroundState,
    width: number,
    height: number
): Promise<GeneratedCrop[]> {
    const cropDir = path.join(outputDir, "crops");
    await fs.mkdir(cropDir, { recursive: true });
    const presets = getCropPresetsForState(state);

    const generated: GeneratedCrop[] = [];
    for (const preset of presets) {
        const rect = extractRect(width, height, preset.region);
        const cropPath = path.join(cropDir, `${frameId}-${preset.id}.png`);
        await sharp(screenshotPath).extract(rect).png().toFile(cropPath);
        generated.push({
            id: preset.id,
            label: preset.label,
            path: cropPath,
            note: preset.note,
        });
    }

    return generated;
}

async function main(): Promise<void> {
    const args = parseArgs(process.argv.slice(2));
    await fs.mkdir(args.outputDir, { recursive: true });

    const fixturePath = path.join(args.outputDir, `${args.id}.json`);
    const manifestPath = path.join(args.outputDir, "manifest.json");

    const fixtureFrames: AndroidForegroundFixtureDocument["frames"] = [];
    const manifestFrames: FrameManifestEntry[] = [];

    for (const [index, screenshotPath] of args.screenshotPaths.entries()) {
        const metadata = await sharp(screenshotPath).metadata();
        const width = metadata.width ?? 0;
        const height = metadata.height ?? 0;
        const classification = await classifyAndroidWindowScreenshot(await fs.readFile(screenshotPath));
        const normalized = normalizeAndroidForegroundObservation(classification);
        const targetState = args.state ?? normalized.state;
        const expectedObservation = buildDraftObservation(targetState, normalized.state);
        const expectedDecisionKind = inferExpectedDecisionKind(targetState, index);
        const frameId = `${targetState.toLowerCase()}-${index + 1}`;
        const crops = await writeCrops(screenshotPath, args.outputDir, frameId, targetState, width, height);

        fixtureFrames.push({
            id: frameId,
            label: `${targetState} frame ${index + 1}`,
            screenshotPath: path.relative(args.outputDir, screenshotPath).replace(/\\/g, "/"),
            expectedObservation,
            expectedDecisionKind,
            note: `Generated from real screenshot ${index + 1}. Review expectedObservation/action points before promoting to VERIFIED_REAL.`,
        });

        manifestFrames.push({
            id: frameId,
            screenshotPath,
            width,
            height,
            classifiedState: normalized.state,
            classifiedVerification: normalized.verification,
            expectedState: expectedObservation.state,
            expectedVerification: expectedObservation.verification,
            expectedDecisionKind,
            crops,
        });
    }

    const fixtureDocument: AndroidForegroundFixtureDocument = {
        schemaVersion: "android-foreground-fixture.v1",
        id: args.id,
        label: args.label,
        description: args.description,
        notes: [
            "Generated by scripts/ingest-android-foreground-captures.ts.",
            "Frames include expectedObservation drafts so replay can compare current classifier output against target real-state onboarding.",
        ],
        frames: fixtureFrames,
    };

    const manifest: AndroidForegroundCaptureManifest = {
        schemaVersion: "android-foreground-manifest.v1",
        id: args.id,
        label: args.label,
        description: args.description,
        generatedAt: new Date().toISOString(),
        outputDir: args.outputDir,
        fixturePath,
        stateHint: args.state ?? null,
        frames: manifestFrames,
    };

    await fs.writeFile(fixturePath, `${JSON.stringify(fixtureDocument, null, 2)}\n`, "utf8");
    await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    process.stdout.write(`${JSON.stringify({
        outputDir: args.outputDir,
        fixturePath,
        manifestPath,
        frameCount: manifestFrames.length,
    }, null, 2)}\n`);
}

main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
});
