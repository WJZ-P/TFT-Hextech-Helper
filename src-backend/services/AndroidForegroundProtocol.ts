import type { SimplePoint } from "../TFTProtocol";
import type { AndroidWindowClassification } from "../utils/AndroidWindowClassifier";

export type AndroidForegroundState =
    | "BLUESTACKS_BOOT"
    | "UPDATE_READY"
    | "LOGIN_REQUIRED"
    | "LOBBY"
    | "MODE_SELECT"
    | "CONFIRM_MODAL"
    | "QUEUE"
    | "ACCEPT_READY"
    | "IN_GAME_TRANSITION"
    | "LIVE_CONTENT"
    | "UNKNOWN";

export type AndroidForegroundVerification = "VERIFIED_REAL" | "REAL_CAPTURE_DRAFT" | "SYNTHETIC_PLACEHOLDER";
export type AndroidForegroundSource = "SCREENSHOT_CLASSIFIER" | "SMOKE_FIXTURE";
export type AndroidForegroundActionPointKey =
    | "PRIMARY_CTA"
    | "START_QUEUE"
    | "SELECT_GAME_MODE"
    | "CONFIRM_MODAL"
    | "ACCEPT_READY"
    | "CANCEL_QUEUE"
    | "DISMISS_OVERLAY"
    | "LEAVE_ROOM";
export type AndroidForegroundDecisionKind =
    | "WAIT"
    | "BLOCKED"
    | "READY"
    | "TAP_PRIMARY_CTA"
    | "TAP_SELECT_GAME_MODE"
    | "TAP_CONFIRM_MODAL"
    | "TAP_START_QUEUE"
    | "TAP_ACCEPT_READY"
    | "TAP_CANCEL_QUEUE"
    | "TAP_DISMISS_OVERLAY"
    | "TAP_LEAVE_ROOM";

export interface AndroidForegroundObservation {
    state: AndroidForegroundState;
    verification: AndroidForegroundVerification;
    source: AndroidForegroundSource;
    reason: string;
    anchors?: string[];
    actionPoints?: Partial<Record<AndroidForegroundActionPointKey, SimplePoint>>;
    rawClassification?: AndroidWindowClassification;
    note?: string;
}

export interface AndroidForegroundFixtureObservationInput {
    state: AndroidForegroundState;
    verification: AndroidForegroundVerification;
    reason: string;
    anchors?: string[];
    actionPoints?: Partial<Record<AndroidForegroundActionPointKey, SimplePoint>>;
    note?: string;
}

export interface AndroidForegroundFixtureFrame {
    id: string;
    label: string;
    screenshotPath?: string;
    observation?: AndroidForegroundFixtureObservationInput;
    expectedObservation?: AndroidForegroundFixtureObservationInput;
    expectedDecisionKind?: AndroidForegroundDecisionKind;
    note?: string;
}

export interface AndroidForegroundFixtureDocument {
    schemaVersion: "android-foreground-fixture.v1";
    id: string;
    label: string;
    description: string;
    notes?: string[];
    frames: AndroidForegroundFixtureFrame[];
}

function cloneActionPoints(
    actionPoints?: Partial<Record<AndroidForegroundActionPointKey, SimplePoint>>
): Partial<Record<AndroidForegroundActionPointKey, SimplePoint>> | undefined {
    if (!actionPoints) {
        return undefined;
    }

    return Object.fromEntries(
        Object.entries(actionPoints).map(([key, point]) => [key, point ? { ...point } : point])
    ) as Partial<Record<AndroidForegroundActionPointKey, SimplePoint>>;
}

export function normalizeAndroidForegroundObservation(
    classification: AndroidWindowClassification
): AndroidForegroundObservation {
    if (classification.state === "BLUESTACKS_BOOT") {
        return {
            state: "BLUESTACKS_BOOT",
            verification: "VERIFIED_REAL",
            source: "SCREENSHOT_CLASSIFIER",
            reason: "BlueStacks boot splash detected from bright blue launcher CTA",
            anchors: ["bright-blue-launcher-cta"],
            rawClassification: classification,
        };
    }

    if (classification.state === "LIVE_CONTENT") {
        return {
            state: "LIVE_CONTENT",
            verification: "VERIFIED_REAL",
            source: "SCREENSHOT_CLASSIFIER",
            reason: "Live HUD signal detected from gold or scoreboard regions",
            anchors: ["hud-gold-region", "scoreboard-region"],
            rawClassification: classification,
        };
    }

    if (classification.state === "ACCEPT_READY") {
        return {
            state: "ACCEPT_READY",
            verification: "VERIFIED_REAL",
            source: "SCREENSHOT_CLASSIFIER",
            reason: "Match-found accept dialog detected from dark modal plus blue accept CTA",
            anchors: ["accept-modal", "accept-ready-cta"],
            actionPoints: classification.acceptReadyPoint
                ? { ACCEPT_READY: { ...classification.acceptReadyPoint } }
                : undefined,
            rawClassification: classification,
        };
    }

    if (classification.state === "QUEUE") {
        return {
            state: "QUEUE",
            verification: "VERIFIED_REAL",
            source: "SCREENSHOT_CLASSIFIER",
            reason: "Matchmaking queue detected from timer/status capsule plus cancel queue region",
            anchors: ["queue-status", "cancel-queue-cta"],
            actionPoints: classification.cancelQueuePoint
                ? { CANCEL_QUEUE: { ...classification.cancelQueuePoint } }
                : undefined,
            rawClassification: classification,
        };
    }

    if (classification.state === "LOBBY") {
        if (classification.dismissOverlayPoint) {
            return {
                state: "LOBBY",
                verification: "VERIFIED_REAL",
                source: "SCREENSHOT_CLASSIFIER",
                reason: "Lobby detected with side menu open; recover by dismissing the overlay before queueing",
                anchors: ["side-menu-overlay", "lobby-backdrop"],
                actionPoints: { DISMISS_OVERLAY: { ...classification.dismissOverlayPoint } },
                rawClassification: classification,
            };
        }

        if (classification.lobbyVariant === "ROOM") {
            return {
                state: "LOBBY",
                verification: "VERIFIED_REAL",
                source: "SCREENSHOT_CLASSIFIER",
                reason: "Lobby room detected from room back button plus start-game CTA",
                anchors: ["lobby-room", "room-back-cta", "start-queue-cta"],
                actionPoints: {
                    ...(classification.startQueuePoint ? { START_QUEUE: { ...classification.startQueuePoint } } : {}),
                    ...(classification.leaveRoomPoint ? { LEAVE_ROOM: { ...classification.leaveRoomPoint } } : {}),
                },
                rawClassification: classification,
            };
        }

        return {
            state: "LOBBY",
            verification: "VERIFIED_REAL",
            source: "SCREENSHOT_CLASSIFIER",
            reason: "Lobby detected from bright start-game CTA in the lower-right action region",
            anchors: ["start-queue-cta", "lobby-profile"],
            actionPoints: classification.startQueuePoint
                ? { START_QUEUE: { ...classification.startQueuePoint } }
                : undefined,
            rawClassification: classification,
        };
    }

    if (classification.state === "MODE_SELECT") {
        return {
            state: "MODE_SELECT",
            verification: "VERIFIED_REAL",
            source: "SCREENSHOT_CLASSIFIER",
            reason: "Mode-selection carousel detected after tapping start; select a TFT mode before queueing",
            anchors: ["mode-card-carousel", "dimmed-lobby-backdrop"],
            actionPoints: {
                ...(classification.selectGameModePoint ? { SELECT_GAME_MODE: { ...classification.selectGameModePoint } } : {}),
                ...(classification.startQueuePoint ? { START_QUEUE: { ...classification.startQueuePoint } } : {}),
            },
            rawClassification: classification,
        };
    }

    if (classification.state === "CONFIRM_MODAL") {
        const isNetworkErrorModal = classification.confirmModalVariant === "NETWORK_ERROR";
        return {
            state: "CONFIRM_MODAL",
            verification: "VERIFIED_REAL",
            source: "SCREENSHOT_CLASSIFIER",
            reason: isNetworkErrorModal
                ? "Network-error confirmation modal detected; dismiss it only after emulator network/account recovery"
                : "Recoverable foreground confirmation modal detected; dismiss it before retrying queue",
            anchors: isNetworkErrorModal
                ? ["network-error-modal", "modal-confirm-cta"]
                : ["foreground-confirm-modal", "modal-confirm-cta"],
            actionPoints: classification.confirmModalPoint
                ? { CONFIRM_MODAL: { ...classification.confirmModalPoint } }
                : undefined,
            rawClassification: classification,
            note: isNetworkErrorModal ? "External network/account state may need manual recovery before automation can continue." : undefined,
        };
    }

    if (classification.state === "IN_GAME_TRANSITION") {
        return {
            state: "IN_GAME_TRANSITION",
            verification: "VERIFIED_REAL",
            source: "SCREENSHOT_CLASSIFIER",
            reason: "Post-accept loading or transition art detected before live HUD becomes readable",
            anchors: ["transition-center", "pre-hud-loading"],
            rawClassification: classification,
        };
    }

    if (classification.state === "TFT_FRONTEND") {
        if (classification.frontendVariant === "LOGIN_REQUIRED") {
            return {
                state: "LOGIN_REQUIRED",
                verification: "VERIFIED_REAL",
                source: "SCREENSHOT_CLASSIFIER",
                reason: "Login/create-account frontend detected from secondary gold CTA and patch progress bar",
                anchors: ["login-secondary-cta", "patch-progress-bar"],
                rawClassification: classification,
            };
        }

        return {
            state: "UPDATE_READY",
            verification: "VERIFIED_REAL",
            source: "SCREENSHOT_CLASSIFIER",
            reason: "Update-ready frontend detected from central bright-white CTA",
            anchors: ["update-primary-cta"],
            actionPoints: classification.primaryActionPoint
                ? { PRIMARY_CTA: { ...classification.primaryActionPoint } }
                : undefined,
            rawClassification: classification,
        };
    }

    return {
        state: "UNKNOWN",
        verification: "VERIFIED_REAL",
        source: "SCREENSHOT_CLASSIFIER",
        reason: "Window content does not match any verified Android TFT foreground or HUD signature",
        anchors: ["no-verified-foreground-match"],
        rawClassification: classification,
    };
}

export function createAndroidForegroundObservationFromFixture(
    observation: AndroidForegroundFixtureObservationInput
): AndroidForegroundObservation {
    return {
        state: observation.state,
        verification: observation.verification,
        source: "SMOKE_FIXTURE",
        reason: observation.reason,
        anchors: observation.anchors ? [...observation.anchors] : undefined,
        actionPoints: cloneActionPoints(observation.actionPoints),
        note: observation.note,
    };
}
