import type { SimplePoint } from "../TFTProtocol";
import type { AndroidWindowClassification } from "../utils/AndroidWindowClassifier";

export interface AndroidForegroundProgressState {
    lastSignature: string | null;
    stableCount: number;
    tappedSignature: string | null;
}

export type AndroidForegroundDecision =
    | { kind: "WAIT"; reason: string }
    | { kind: "BLOCKED"; reason: string }
    | { kind: "READY"; reason: string }
    | { kind: "TAP_PRIMARY_CTA"; reason: string; targetPoint: SimplePoint };

export interface AndroidForegroundProgressResult {
    decision: AndroidForegroundDecision;
    nextState: AndroidForegroundProgressState;
}

const REQUIRED_STABLE_FRONTEND_FRAMES = 2;

export function createInitialAndroidForegroundProgressState(): AndroidForegroundProgressState {
    return {
        lastSignature: null,
        stableCount: 0,
        tappedSignature: null,
    };
}

function buildSignature(classification: AndroidWindowClassification): string {
    const point = classification.primaryActionPoint;
    const pointKey = point ? `${point.x},${point.y}` : "none";
    return `${classification.state}:${classification.frontendVariant ?? "NONE"}:${pointKey}`;
}

function buildNextState(
    classification: AndroidWindowClassification,
    previousState: AndroidForegroundProgressState,
    tappedSignature?: string | null
): AndroidForegroundProgressState {
    const signature = buildSignature(classification);
    const stableCount = previousState.lastSignature === signature ? previousState.stableCount + 1 : 1;

    return {
        lastSignature: signature,
        stableCount,
        tappedSignature: tappedSignature ?? (previousState.tappedSignature === signature ? signature : null),
    };
}

export function planAndroidForegroundProgress(
    classification: AndroidWindowClassification,
    previousState: AndroidForegroundProgressState
): AndroidForegroundProgressResult {
    if (classification.state === "LIVE_CONTENT") {
        return {
            decision: {
                kind: "READY",
                reason: "Live HUD detected",
            },
            nextState: createInitialAndroidForegroundProgressState(),
        };
    }

    if (classification.state === "BLUESTACKS_BOOT") {
        return {
            decision: {
                kind: "WAIT",
                reason: "BlueStacks boot screen is still active",
            },
            nextState: buildNextState(classification, previousState),
        };
    }

    if (classification.state === "UNKNOWN") {
        return {
            decision: {
                kind: "WAIT",
                reason: "Waiting for a recognized Android game state",
            },
            nextState: buildNextState(classification, previousState),
        };
    }

    if (classification.state !== "TFT_FRONTEND") {
        return {
            decision: {
                kind: "WAIT",
                reason: "Waiting for a recognized Android foreground state",
            },
            nextState: buildNextState(classification, previousState),
        };
    }

    if (classification.frontendVariant === "LOGIN_REQUIRED") {
        return {
            decision: {
                kind: "BLOCKED",
                reason: "Android TFT is on a login-required screen; automation will not click through credentials",
            },
            nextState: buildNextState(classification, previousState),
        };
    }

    if (classification.frontendVariant !== "UPDATE_READY" || !classification.primaryActionPoint) {
        return {
            decision: {
                kind: "WAIT",
                reason: "Frontend recognized, but no safe primary action is available yet",
            },
            nextState: buildNextState(classification, previousState),
        };
    }

    const nextState = buildNextState(classification, previousState);
    const signature = nextState.lastSignature;

    if (nextState.stableCount < REQUIRED_STABLE_FRONTEND_FRAMES) {
        return {
            decision: {
                kind: "WAIT",
                reason: "Waiting for a stable update-ready frontend before tapping",
            },
            nextState,
        };
    }

    if (signature && nextState.tappedSignature === signature) {
        return {
            decision: {
                kind: "WAIT",
                reason: "Still awaiting a post-tap frontend transition",
            },
            nextState,
        };
    }

    return {
        decision: {
            kind: "TAP_PRIMARY_CTA",
            reason: "Stable update-ready frontend detected",
            targetPoint: classification.primaryActionPoint,
        },
        nextState: {
            ...nextState,
            tappedSignature: signature,
        },
    };
}
