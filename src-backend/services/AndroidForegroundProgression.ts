import type { SimplePoint } from "../TFTProtocol";
import {
    type AndroidForegroundActionPointKey,
    type AndroidForegroundDecisionKind,
    type AndroidForegroundObservation,
    type AndroidForegroundState,
} from "./AndroidForegroundProtocol";

export interface AndroidForegroundProgressState {
    lastSignature: string | null;
    stableCount: number;
    actionedSignatures: Partial<Record<AndroidForegroundDecisionKind, string>>;
}

export type AndroidForegroundDecision =
    | { kind: "WAIT"; reason: string }
    | { kind: "BLOCKED"; reason: string }
    | { kind: "READY"; reason: string }
    | { kind: "TAP_PRIMARY_CTA"; reason: string; targetPoint: SimplePoint }
    | { kind: "TAP_START_QUEUE"; reason: string; targetPoint: SimplePoint }
    | { kind: "TAP_ACCEPT_READY"; reason: string; targetPoint: SimplePoint }
    | { kind: "TAP_CANCEL_QUEUE"; reason: string; targetPoint: SimplePoint };

export interface AndroidForegroundProgressResult {
    decision: AndroidForegroundDecision;
    nextState: AndroidForegroundProgressState;
}

const REQUIRED_STABLE_UPDATE_FRAMES = 2;
const REQUIRED_STABLE_LOBBY_FRAMES = 2;
const REQUIRED_STABLE_QUEUE_FRAMES = 2;
const QUEUE_TIMEOUT_FRAMES = 6;
const IN_GAME_TRANSITION_TIMEOUT_FRAMES = 6;

export function createInitialAndroidForegroundProgressState(): AndroidForegroundProgressState {
    return {
        lastSignature: null,
        stableCount: 0,
        actionedSignatures: {},
    };
}

function buildSignature(observation: AndroidForegroundObservation): string {
    const keys = Object.keys(observation.actionPoints ?? {}).sort();
    const pointKey = keys
        .map((key) => {
            const point = observation.actionPoints?.[key as AndroidForegroundActionPointKey];
            return point ? `${key}:${point.x},${point.y}` : `${key}:none`;
        })
        .join("|");
    return `${observation.state}:${observation.verification}:${pointKey}`;
}

function buildNextState(
    observation: AndroidForegroundObservation,
    previousState: AndroidForegroundProgressState,
    actionedDecisionKind?: AndroidForegroundDecisionKind
): AndroidForegroundProgressState {
    const signature = buildSignature(observation);
    const stableCount = previousState.lastSignature === signature ? previousState.stableCount + 1 : 1;

    return {
        lastSignature: signature,
        stableCount,
        actionedSignatures: actionedDecisionKind
            ? {
                ...previousState.actionedSignatures,
                [actionedDecisionKind]: signature,
            }
            : previousState.actionedSignatures,
    };
}

function alreadyActioned(
    decisionKind: AndroidForegroundDecisionKind,
    nextState: AndroidForegroundProgressState
): boolean {
    return Boolean(nextState.lastSignature && nextState.actionedSignatures[decisionKind] === nextState.lastSignature);
}

function getActionPoint(
    observation: AndroidForegroundObservation,
    pointKey: AndroidForegroundActionPointKey
): SimplePoint | null {
    return observation.actionPoints?.[pointKey] ?? null;
}

function waitDecision(reason: string, nextState: AndroidForegroundProgressState): AndroidForegroundProgressResult {
    return {
        decision: { kind: "WAIT", reason },
        nextState,
    };
}

export function planAndroidForegroundProgress(
    observation: AndroidForegroundObservation,
    previousState: AndroidForegroundProgressState
): AndroidForegroundProgressResult {
    if (observation.state === "LIVE_CONTENT") {
        return {
            decision: {
                kind: "READY",
                reason: "Live HUD detected",
            },
            nextState: createInitialAndroidForegroundProgressState(),
        };
    }

    const nextState = buildNextState(observation, previousState);

    if (observation.state === "BLUESTACKS_BOOT") {
        return waitDecision("BlueStacks boot screen is still active", nextState);
    }

    if (observation.state === "UNKNOWN") {
        return waitDecision("Waiting for a recognized Android game state", nextState);
    }

    if (observation.state === "LOGIN_REQUIRED") {
        return {
            decision: {
                kind: "BLOCKED",
                reason: "Android TFT is on a login-required screen; automation will not click through credentials",
            },
            nextState,
        };
    }

    if (observation.state === "UPDATE_READY") {
        const targetPoint = getActionPoint(observation, "PRIMARY_CTA");
        if (!targetPoint) {
            return waitDecision("Update-ready frontend detected, but no primary CTA is available", nextState);
        }

        if (nextState.stableCount < REQUIRED_STABLE_UPDATE_FRAMES) {
            return waitDecision("Waiting for a stable update-ready frontend before tapping", nextState);
        }

        if (alreadyActioned("TAP_PRIMARY_CTA", nextState)) {
            return waitDecision("Still awaiting a post-tap frontend transition", nextState);
        }

        return {
            decision: {
                kind: "TAP_PRIMARY_CTA",
                reason: `Stable update-ready frontend detected (${observation.verification})`,
                targetPoint,
            },
            nextState: buildNextState(observation, previousState, "TAP_PRIMARY_CTA"),
        };
    }

    if (observation.state === "LOBBY") {
        const startQueuePoint = getActionPoint(observation, "START_QUEUE");
        if (!startQueuePoint) {
            return waitDecision("Lobby detected, waiting for a verified or synthetic start-queue action point", nextState);
        }

        if (nextState.stableCount < REQUIRED_STABLE_LOBBY_FRAMES) {
            return waitDecision("Waiting for a stable lobby before tapping start queue", nextState);
        }

        if (alreadyActioned("TAP_START_QUEUE", nextState)) {
            return waitDecision("Lobby tap already issued; waiting for queue or ready-check transition", nextState);
        }

        return {
            decision: {
                kind: "TAP_START_QUEUE",
                reason: `Lobby start-match action prepared (${observation.verification})`,
                targetPoint: startQueuePoint,
            },
            nextState: buildNextState(observation, previousState, "TAP_START_QUEUE"),
        };
    }

    if (observation.state === "QUEUE") {
        const cancelQueuePoint = getActionPoint(observation, "CANCEL_QUEUE");

        if (nextState.stableCount < REQUIRED_STABLE_QUEUE_FRAMES) {
            return waitDecision("Queue detected; waiting for a stable matchmaking state", nextState);
        }

        if (nextState.stableCount < QUEUE_TIMEOUT_FRAMES) {
            return waitDecision("Queue is active; polling for ready-check or live transition", nextState);
        }

        if (cancelQueuePoint && !alreadyActioned("TAP_CANCEL_QUEUE", nextState)) {
            return {
                decision: {
                    kind: "TAP_CANCEL_QUEUE",
                    reason: `Queue timeout reached; issuing one cancel/retry placeholder action (${observation.verification})`,
                    targetPoint: cancelQueuePoint,
                },
                nextState: buildNextState(observation, previousState, "TAP_CANCEL_QUEUE"),
            };
        }

        return waitDecision("Queue timeout reached; awaiting recovery or fresh fixture evidence", nextState);
    }

    if (observation.state === "ACCEPT_READY") {
        const acceptPoint = getActionPoint(observation, "ACCEPT_READY");
        if (!acceptPoint) {
            return waitDecision("Ready-check detected, but no accept action point is available", nextState);
        }

        if (alreadyActioned("TAP_ACCEPT_READY", nextState)) {
            return waitDecision("Ready-check accept already issued; waiting for in-game transition", nextState);
        }

        return {
            decision: {
                kind: "TAP_ACCEPT_READY",
                reason: `Ready-check accept action prepared (${observation.verification})`,
                targetPoint: acceptPoint,
            },
            nextState: buildNextState(observation, previousState, "TAP_ACCEPT_READY"),
        };
    }

    if (observation.state === "IN_GAME_TRANSITION") {
        if (nextState.stableCount >= IN_GAME_TRANSITION_TIMEOUT_FRAMES) {
            return waitDecision("In-game transition timeout reached; still waiting for a real HUD frame", nextState);
        }

        return waitDecision("Transitioning into game; waiting for live HUD confirmation", nextState);
    }

    return waitDecision(`Unhandled Android foreground state: ${observation.state as AndroidForegroundState}`, nextState);
}
