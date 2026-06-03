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
    actionAttempts: Partial<Record<AndroidForegroundDecisionKind, number>>;
}

export type AndroidForegroundDecision =
    | { kind: "WAIT"; reason: string }
    | { kind: "BLOCKED"; reason: string }
    | { kind: "READY"; reason: string }
    | { kind: "TAP_PRIMARY_CTA"; reason: string; targetPoint: SimplePoint }
    | { kind: "TAP_DISMISS_OVERLAY"; reason: string; targetPoint: SimplePoint }
    | { kind: "TAP_SELECT_GAME_MODE"; reason: string; targetPoint: SimplePoint }
    | { kind: "TAP_CONFIRM_MODAL"; reason: string; targetPoint: SimplePoint }
    | { kind: "TAP_START_QUEUE"; reason: string; targetPoint: SimplePoint }
    | { kind: "TAP_LEAVE_ROOM"; reason: string; targetPoint: SimplePoint }
    | { kind: "TAP_ACCEPT_READY"; reason: string; targetPoint: SimplePoint }
    | { kind: "TAP_GAME_OVER_EXIT"; reason: string; targetPoint: SimplePoint }
    | { kind: "TAP_CANCEL_QUEUE"; reason: string; targetPoint: SimplePoint };

export interface AndroidForegroundProgressResult {
    decision: AndroidForegroundDecision;
    nextState: AndroidForegroundProgressState;
}

const REQUIRED_STABLE_UPDATE_FRAMES = 2;
const REQUIRED_STABLE_LOBBY_FRAMES = 2;
const REQUIRED_STABLE_QUEUE_FRAMES = 2;
const QUEUE_LONG_WAIT_FRAMES = 6;
const IN_GAME_TRANSITION_TIMEOUT_FRAMES = 6;
const MAX_TRANSIENT_ACTION_ATTEMPTS = 3;

export function createInitialAndroidForegroundProgressState(): AndroidForegroundProgressState {
    return {
        lastSignature: null,
        stableCount: 0,
        actionedSignatures: {},
        actionAttempts: {},
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
    const actionedSignatures = previousState.lastSignature === signature ? previousState.actionedSignatures : {};
    const actionAttempts = previousState.lastSignature === signature ? previousState.actionAttempts : {};
    const currentAttempts = actionedDecisionKind ? (actionAttempts[actionedDecisionKind] ?? 0) : 0;

    return {
        lastSignature: signature,
        stableCount,
        actionedSignatures: actionedDecisionKind
            ? {
                ...actionedSignatures,
                [actionedDecisionKind]: signature,
            }
            : actionedSignatures,
        actionAttempts: actionedDecisionKind
            ? {
                ...actionAttempts,
                [actionedDecisionKind]: currentAttempts + 1,
            }
            : actionAttempts,
    };
}

function alreadyActioned(
    decisionKind: AndroidForegroundDecisionKind,
    nextState: AndroidForegroundProgressState
): boolean {
    return Boolean(nextState.lastSignature && nextState.actionedSignatures[decisionKind] === nextState.lastSignature);
}

function shouldRetryTransientAction(
    decisionKind: AndroidForegroundDecisionKind,
    nextState: AndroidForegroundProgressState
): boolean {
    const attempts = nextState.actionAttempts[decisionKind] ?? 0;
    return attempts > 0 && attempts < MAX_TRANSIENT_ACTION_ATTEMPTS && nextState.stableCount > attempts;
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

function resetActionCooldown(nextState: AndroidForegroundProgressState): AndroidForegroundProgressState {
    return {
        ...nextState,
        stableCount: 0,
        actionedSignatures: {},
        actionAttempts: {},
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

    if (observation.state === "NETWORK_ERROR") {
        return {
            decision: {
                kind: "BLOCKED",
                reason: "Android TFT is on a Riot network/account error screen; manual session recovery is required before automation can continue",
            },
            nextState,
        };
    }

    if (observation.state === "GAME_OVER") {
        const exitPoint = getActionPoint(observation, "GAME_OVER_EXIT");
        if (!exitPoint) {
            return waitDecision("Game-over/result screen detected, but no safe exit action point is available", nextState);
        }

        if (alreadyActioned("TAP_GAME_OVER_EXIT", nextState) && !shouldRetryTransientAction("TAP_GAME_OVER_EXIT", nextState)) {
            return waitDecision("Game-over/result exit already issued; waiting for lobby or post-game transition", nextState);
        }

        return {
            decision: {
                kind: "TAP_GAME_OVER_EXIT",
                reason: alreadyActioned("TAP_GAME_OVER_EXIT", nextState)
                    ? `Game-over/result screen is still present; retrying exit (${observation.verification})`
                    : `Game-over/result screen detected; exiting before next normal-match queue (${observation.verification})`,
                targetPoint: exitPoint,
            },
            nextState: buildNextState(observation, previousState, "TAP_GAME_OVER_EXIT"),
        };
    }

    if (observation.state === "UPDATE_READY") {
        const requiredStableUpdateFrames = observation.verification === "VERIFIED_REAL"
            ? 1
            : REQUIRED_STABLE_UPDATE_FRAMES;
        const targetPoint = getActionPoint(observation, "PRIMARY_CTA");
        if (!targetPoint) {
            return waitDecision("Update-ready frontend detected, but no primary CTA is available", nextState);
        }

        if (nextState.stableCount < requiredStableUpdateFrames) {
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
        const dismissOverlayPoint = getActionPoint(observation, "DISMISS_OVERLAY");
        if (dismissOverlayPoint) {
            if (alreadyActioned("TAP_DISMISS_OVERLAY", nextState)) {
                return waitDecision("Lobby side menu dismiss already issued; waiting for clean lobby frame", nextState);
            }

            return {
                decision: {
                    kind: "TAP_DISMISS_OVERLAY",
                    reason: `Lobby side menu is open; dismissing overlay before queueing (${observation.verification})`,
                    targetPoint: dismissOverlayPoint,
                },
                nextState: buildNextState(observation, previousState, "TAP_DISMISS_OVERLAY"),
            };
        }

        const startQueuePoint = getActionPoint(observation, "START_QUEUE");
        if (!startQueuePoint) {
            return waitDecision("Lobby detected, waiting for a verified or synthetic start-queue action point", nextState);
        }

        const requiredStableLobbyFrames = observation.verification === "VERIFIED_REAL"
            ? 1
            : REQUIRED_STABLE_LOBBY_FRAMES;
        if (nextState.stableCount < requiredStableLobbyFrames) {
            return waitDecision("Waiting for a stable lobby before tapping start queue", nextState);
        }

        if (alreadyActioned("TAP_START_QUEUE", nextState) && !shouldRetryTransientAction("TAP_START_QUEUE", nextState)) {
            const leaveRoomPoint = getActionPoint(observation, "LEAVE_ROOM");
            if (leaveRoomPoint) {
                return waitDecision(
                    "Lobby room start-match tap did not transition; waiting for queue cooldown before retrying start",
                    resetActionCooldown(nextState)
                );
            }

            return {
                decision: {
                    kind: "BLOCKED",
                    reason: "Lobby start-match tap did not transition after retry cap; manual room reset is required",
                },
                nextState,
            };
        }

        return {
            decision: {
                kind: "TAP_START_QUEUE",
                reason: alreadyActioned("TAP_START_QUEUE", nextState)
                    ? `Lobby is still present; retrying start-match tap (${observation.verification})`
                    : `Lobby start-match action prepared (${observation.verification})`,
                targetPoint: startQueuePoint,
            },
            nextState: buildNextState(observation, previousState, "TAP_START_QUEUE"),
        };
    }

    if (observation.state === "MODE_SELECT") {
        const selectGameModePoint = getActionPoint(observation, "SELECT_GAME_MODE");
        const startQueuePoint = getActionPoint(observation, "START_QUEUE");

        if (!selectGameModePoint) {
            return waitDecision("Mode-selection screen detected, but no game-mode action point is available", nextState);
        }

        if (!alreadyActioned("TAP_SELECT_GAME_MODE", nextState)) {
            return {
                decision: {
                    kind: "TAP_SELECT_GAME_MODE",
                    reason: `Mode-selection screen detected; selecting the preferred TFT mode (${observation.verification})`,
                    targetPoint: selectGameModePoint,
                },
                nextState: buildNextState(observation, previousState, "TAP_SELECT_GAME_MODE"),
            };
        }

        if (startQueuePoint && !alreadyActioned("TAP_START_QUEUE", nextState)) {
            return {
                decision: {
                    kind: "TAP_START_QUEUE",
                    reason: `Preferred mode already selected; tapping start from mode-selection screen (${observation.verification})`,
                    targetPoint: startQueuePoint,
                },
                nextState: buildNextState(observation, previousState, "TAP_START_QUEUE"),
            };
        }

        return waitDecision("Mode-selection actions already issued; waiting for queue or ready-check transition", nextState);
    }

    if (observation.state === "CONFIRM_MODAL") {
        const confirmModalPoint = getActionPoint(observation, "CONFIRM_MODAL");
        const isNetworkErrorModal = observation.rawClassification?.confirmModalVariant === "NETWORK_ERROR";
        if (!confirmModalPoint) {
            return waitDecision(
                isNetworkErrorModal
                    ? "Network confirmation modal detected, but no confirm action point is available"
                    : "Recoverable confirmation modal detected, but no confirm action point is available",
                nextState
            );
        }

        if (alreadyActioned("TAP_CONFIRM_MODAL", nextState) && !shouldRetryTransientAction("TAP_CONFIRM_MODAL", nextState)) {
            return {
                decision: {
                    kind: "BLOCKED",
                    reason: isNetworkErrorModal
                        ? "Network confirmation modal did not dismiss after retry cap; manual emulator network/account recovery is required"
                        : "Confirmation modal did not dismiss after retry cap; manual/network recovery is required",
                },
                nextState,
            };
        }

        return {
            decision: {
                kind: "TAP_CONFIRM_MODAL",
                reason: isNetworkErrorModal
                    ? alreadyActioned("TAP_CONFIRM_MODAL", nextState)
                        ? `Network confirmation modal still present; retrying dismiss (${observation.verification})`
                        : `Network confirmation modal detected; dismissing it once before blocking if it persists (${observation.verification})`
                    : alreadyActioned("TAP_CONFIRM_MODAL", nextState)
                        ? `Recoverable foreground confirmation modal still present; retrying dismiss (${observation.verification})`
                        : `Recoverable foreground confirmation modal detected; dismissing it (${observation.verification})`,
                targetPoint: confirmModalPoint,
            },
            nextState: buildNextState(observation, previousState, "TAP_CONFIRM_MODAL"),
        };
    }

    if (observation.state === "QUEUE") {
        if (nextState.stableCount < REQUIRED_STABLE_QUEUE_FRAMES) {
            return waitDecision("Queue detected; waiting for a stable matchmaking state", nextState);
        }

        if (nextState.stableCount < QUEUE_LONG_WAIT_FRAMES) {
            return waitDecision("Queue is active; polling for ready-check or live transition", nextState);
        }

        return waitDecision("Queue wait is long; keeping matchmaking active and waiting for ready-check", nextState);
    }

    if (observation.state === "ACCEPT_READY") {
        const acceptPoint = getActionPoint(observation, "ACCEPT_READY");
        if (!acceptPoint) {
            return waitDecision("Ready-check detected, but no accept action point is available", nextState);
        }

        if (alreadyActioned("TAP_ACCEPT_READY", nextState) && !shouldRetryTransientAction("TAP_ACCEPT_READY", nextState)) {
            return waitDecision("Ready-check accept already issued; waiting for in-game transition", nextState);
        }

        return {
            decision: {
                kind: "TAP_ACCEPT_READY",
                reason: alreadyActioned("TAP_ACCEPT_READY", nextState)
                    ? `Ready-check is still present; retrying accept (${observation.verification})`
                    : `Ready-check accept action prepared (${observation.verification})`,
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
