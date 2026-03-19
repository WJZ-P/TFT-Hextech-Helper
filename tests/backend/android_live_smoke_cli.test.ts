import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(process.cwd());
const tsxCli = path.join(repoRoot, "node_modules", "tsx", "dist", "cli.mjs");

test("android live smoke CLI can analyze update-ready screenshots", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773702968907.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        screenshotPath: string;
        screenshotPaths: string[];
        verificationGate: {
            readyToClassify: boolean;
            readyToClick: boolean;
            blockerType: string | null;
        };
        contentClassification: {
            state: string;
            frontendVariant?: string;
        };
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(path.resolve(parsed.screenshotPath), screenshotPath);
    assert.deepEqual(parsed.screenshotPaths, [screenshotPath]);
    assert.equal(parsed.verificationGate.readyToClassify, true);
    assert.equal(parsed.verificationGate.readyToClick, true);
    assert.equal(parsed.contentClassification.state, "TFT_FRONTEND");
    assert.equal(parsed.contentClassification.frontendVariant, "UPDATE_READY");
    assert.equal(parsed.foregroundDecision?.kind, "TAP_PRIMARY_CTA");
});

test("android live smoke CLI can analyze login-required screenshots", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773703133640.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        verificationGate: {
            blockerType: string | null;
        };
        contentClassification: {
            state: string;
            frontendVariant?: string;
        };
        foregroundDecision: {
            kind: string;
            reason: string;
        } | null;
    };

    assert.equal(parsed.verificationGate.blockerType, "BLOCKED_STATE");
    assert.equal(parsed.contentClassification.state, "TFT_FRONTEND");
    assert.equal(parsed.contentClassification.frontendVariant, "LOGIN_REQUIRED");
    assert.equal(parsed.foregroundDecision?.kind, "BLOCKED");
    assert.match(parsed.foregroundDecision?.reason ?? "", /login/i);
});

test("android live smoke CLI can analyze live HUD screenshots", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "derived",
        "android-real-recording-20260315-ionia",
        "frames",
        "recording-board-5-2.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        contentClassification: {
            state: string;
        };
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(parsed.contentClassification.state, "LIVE_CONTENT");
    assert.equal(parsed.foregroundDecision?.kind, "READY");
});

test("android live smoke CLI treats augment overlay screenshots as live content", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "derived",
        "android-real-recording-20260315-ionia",
        "frames",
        "recording-augment-3-2.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        contentClassification: {
            state: string;
        };
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(parsed.contentClassification.state, "LIVE_CONTENT");
    assert.equal(parsed.foregroundDecision?.kind, "READY");
});

test("android live smoke CLI can analyze unknown non-game screenshots", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773701883707.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        contentClassification: {
            state: string;
        };
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(parsed.contentClassification.state, "UNKNOWN");
    assert.equal(parsed.foregroundDecision?.kind, "WAIT");
});

test("android live smoke CLI reports black capture surfaces for black screenshots", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773876338476.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        verificationGate: {
            readyToClassify: boolean;
            blockerType: string | null;
        };
        captureSurface: {
            state: string;
            darkPixelRatio: number;
            blockerReason: string | null;
        } | null;
        contentClassification: {
            state: string;
        };
    };

    assert.equal(parsed.verificationGate.readyToClassify, false);
    assert.equal(parsed.verificationGate.blockerType, "BLACK_SURFACE");
    assert.equal(parsed.captureSurface?.state, "BLACK_SURFACE");
    assert.ok((parsed.captureSurface?.darkPixelRatio ?? 0) > 0.98);
    assert.match(parsed.captureSurface?.blockerReason ?? "", /black/i);
    assert.equal(parsed.contentClassification.state, "UNKNOWN");
});

test("android live smoke CLI reports visible capture surfaces for side-menu lobby screenshots", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773875308190.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        verificationGate: {
            readyToClassify: boolean;
            readyToClick: boolean;
        };
        captureSurface: {
            state: string;
            blockerReason: string | null;
        } | null;
        contentClassification: {
            state: string;
            lobbyVariant?: string;
        };
    };

    assert.equal(parsed.verificationGate.readyToClassify, true);
    assert.equal(parsed.verificationGate.readyToClick, true);
    assert.equal(parsed.captureSurface?.state, "VISIBLE_CONTENT");
    assert.equal(parsed.captureSurface?.blockerReason, null);
    assert.equal(parsed.contentClassification.state, "LOBBY");
    assert.equal(parsed.contentClassification.lobbyVariant, "SIDE_MENU_OPEN");
});

test("android live smoke CLI emits lobby recovery for side-menu-open screenshot", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773875308190.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--screenshot", screenshotPath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        contentClassification: {
            state: string;
            lobbyVariant?: string;
        };
        foregroundObservation: {
            state: string;
            anchors?: string[];
        } | null;
        foregroundDecision: {
            kind: string;
            reason: string;
        } | null;
    };

    assert.equal(parsed.contentClassification.state, "LOBBY");
    assert.equal(parsed.contentClassification.lobbyVariant, "SIDE_MENU_OPEN");
    assert.equal(parsed.foregroundObservation?.state, "LOBBY");
    assert.ok(parsed.foregroundObservation?.anchors?.includes("side-menu-overlay"));
    assert.equal(parsed.foregroundDecision?.kind, "TAP_DISMISS_OVERLAY");
    assert.match(parsed.foregroundDecision?.reason ?? "", /dismissing overlay/i);
});

test("android live smoke CLI can replay screenshot sequences for progression QA", { timeout: 120000 }, async () => {
    const screenshotPath = path.join(
        repoRoot,
        "examples",
        "recordings",
        "smoke",
        "android-live-smoke-1773702968907.png"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [
            tsxCli,
            "scripts/run-android-live-smoke.ts",
            "--screenshot",
            screenshotPath,
            "--screenshot",
            screenshotPath,
            "--screenshot",
            screenshotPath,
        ],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        screenshotPaths: string[];
        analysisSequence: Array<{
            foregroundDecision: {
                kind: string;
            };
        }>;
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(parsed.screenshotPaths.length, 3);
    assert.deepEqual(
        parsed.analysisSequence.map((entry) => entry.foregroundDecision.kind),
        ["TAP_PRIMARY_CTA", "WAIT", "WAIT"]
    );
    assert.equal(parsed.foregroundDecision?.kind, "WAIT");
});

test("android live smoke CLI can replay synthetic frontend flow fixtures", { timeout: 120000 }, async () => {
    const fixturePath = path.join(
        repoRoot,
        "examples",
        "android-foreground-replay",
        "android-na-frontend-synthetic-flow.json"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--fixture", fixturePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        fixtureId: string;
        allExpectedMatched: boolean;
        traceSummary: {
            verificationCounts: Record<string, number>;
            stateTransitionCount: number;
        };
        analysisSequence: Array<{
            foregroundObservation: {
                state: string;
                verification: string;
            };
            foregroundDecision: {
                kind: string;
            };
            expectedDecisionMatched: boolean | null;
        }>;
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(parsed.fixtureId, "android-na-frontend-synthetic-flow");
    assert.equal(parsed.allExpectedMatched, true);
    assert.ok((parsed.traceSummary.verificationCounts.SYNTHETIC_PLACEHOLDER ?? 0) >= 1);
    assert.ok(parsed.traceSummary.stateTransitionCount >= 1);
    assert.deepEqual(
        parsed.analysisSequence.map((entry) => entry.foregroundDecision.kind),
        [
            "TAP_PRIMARY_CTA",
            "WAIT",
            "WAIT",
            "TAP_START_QUEUE",
            "WAIT",
            "WAIT",
            "TAP_ACCEPT_READY",
            "WAIT",
            "READY",
        ]
    );
    assert.equal(parsed.analysisSequence[2]?.foregroundObservation.verification, "SYNTHETIC_PLACEHOLDER");
    assert.equal(parsed.foregroundDecision?.kind, "READY");
});

test("android live smoke CLI can replay queue-timeout fallback fixtures", { timeout: 120000 }, async () => {
    const fixturePath = path.join(
        repoRoot,
        "examples",
        "android-foreground-replay",
        "android-na-queue-timeout-synthetic.json"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--fixture", fixturePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        fixtureId: string;
        allExpectedMatched: boolean;
        analysisSequence: Array<{
            foregroundDecision: {
                kind: string;
            };
        }>;
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(parsed.fixtureId, "android-na-queue-timeout-synthetic");
    assert.equal(parsed.allExpectedMatched, true);
    assert.deepEqual(
        parsed.analysisSequence.map((entry) => entry.foregroundDecision.kind),
        ["WAIT", "WAIT", "WAIT", "WAIT", "WAIT", "TAP_CANCEL_QUEUE"]
    );
    assert.equal(parsed.foregroundDecision?.kind, "TAP_CANCEL_QUEUE");
});

test("android live smoke CLI can replay verified real frontend flow fixtures", { timeout: 120000 }, async () => {
    const fixturePath = path.join(
        repoRoot,
        "examples",
        "android-foreground-replay",
        "android-na-frontend-real-flow.json"
    );

    const { stdout } = await execFileAsync(
        process.execPath,
        [tsxCli, "scripts/run-android-live-smoke.ts", "--fixture", fixturePath],
        {
            cwd: repoRoot,
            windowsHide: true,
        }
    );

    const parsed = JSON.parse(stdout.slice(stdout.indexOf("{"))) as {
        fixtureId: string;
        allExpectedMatched: boolean;
        verificationGate: {
            blockerType: string | null;
        };
        traceSummary: {
            verificationCounts: Record<string, number>;
        };
        captureRecovery?: {
            firstVisibleSource: string | null;
        };
        analysisSequence: Array<{
            foregroundObservation: {
                state: string;
                verification: string;
            };
            foregroundDecision: {
                kind: string;
            };
            expectedStateMatched: boolean | null;
            expectedDecisionMatched: boolean | null;
        }>;
        foregroundDecision: {
            kind: string;
        } | null;
    };

    assert.equal(parsed.fixtureId, "android-na-frontend-real-flow");
    assert.equal(parsed.allExpectedMatched, true);
    assert.equal(parsed.verificationGate.blockerType, null);
    assert.equal(parsed.traceSummary.verificationCounts.VERIFIED_REAL, 11);
    assert.deepEqual(
        parsed.analysisSequence.map((entry) => entry.foregroundObservation.state),
        [
            "UPDATE_READY",
            "UPDATE_READY",
            "LOBBY",
            "LOBBY",
            "LOBBY",
            "QUEUE",
            "QUEUE",
            "ACCEPT_READY",
            "IN_GAME_TRANSITION",
            "IN_GAME_TRANSITION",
            "LIVE_CONTENT",
        ]
    );
    assert.equal(parsed.analysisSequence[2]?.foregroundDecision.kind, "TAP_DISMISS_OVERLAY");
    assert.ok(parsed.analysisSequence.every((entry) => entry.expectedStateMatched === true));
    assert.ok(parsed.analysisSequence.every((entry) => entry.expectedDecisionMatched === true));
    assert.equal(parsed.foregroundDecision?.kind, "READY");
});
