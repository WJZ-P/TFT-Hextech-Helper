import type { AndroidWindowClassification } from "../utils/AndroidWindowClassifier";

export function isLikelyOpponentBoardViewForLoot(classification: AndroidWindowClassification): boolean {
    return (
        classification.state === "LIVE_CONTENT" &&
        (classification.liveHudGoldSignalRatio ?? 0) > 0.15 &&
        (classification.liveHudScoreSignalRatio ?? 0) > 0.25 &&
        (classification.gameOverRowsDarkRatio ?? 0) < 0.08 &&
        (classification.lobbyStartBlueRatio ?? 0) > 0.15 &&
        (classification.progressDarkRatio ?? 0) < 0.05
    );
}

export function isLikelyOpponentBoardViewForHud(classification: AndroidWindowClassification): boolean {
    const classicPlayerListCombat = (
        classification.state === "LIVE_CONTENT" &&
        (classification.liveHudGoldSignalRatio ?? 0) > 0.24 &&
        (classification.liveHudScoreSignalRatio ?? 0) > 0.05 &&
        (classification.liveHudScoreSignalRatio ?? 0) < 0.12 &&
        (classification.queueStatusGoldRatio ?? 0) > 0.30 &&
        (classification.lobbyStartBlueRatio ?? 0) < 0.08 &&
        (classification.gameOverRowsDarkRatio ?? 0) < 0.10 &&
        (classification.acceptModalDarkRatio ?? 0) < 0.08 &&
        (classification.gameOverReplayBlueRatio ?? 0) < 0.01 &&
        (classification.progressDarkRatio ?? 0) < 0.03
    );
    const sideListCombat = (
        classification.state === "LIVE_CONTENT" &&
        (classification.liveHudGoldSignalRatio ?? 0) > 0.015 &&
        (classification.liveHudGoldSignalRatio ?? 0) < 0.025 &&
        (classification.liveHudScoreSignalRatio ?? 0) > 0.020 &&
        (classification.liveHudScoreSignalRatio ?? 0) < 0.035 &&
        (classification.lobbyStartBlueRatio ?? 0) > 0.025 &&
        (classification.lobbyStartBlueRatio ?? 0) < 0.050 &&
        (classification.queueStatusGoldRatio ?? 0) < 0.005 &&
        (classification.sideMenuDarkRatio ?? 0) > 0.28 &&
        (classification.sideMenuDarkRatio ?? 0) < 0.34 &&
        (classification.roomBackDarkRatio ?? 0) > 0.60 &&
        (classification.gameOverReplayBlueRatio ?? 0) < 0.02 &&
        (classification.gameOverResultExitBlueRatio ?? 0) > 0.25 &&
        (classification.gameOverResultExitBlueRatio ?? 0) < 0.35 &&
        (classification.progressDarkRatio ?? 0) > 0.16 &&
        (classification.progressDarkRatio ?? 0) < 0.24
    );
    const darkArenaSideListCombat = (
        classification.state === "LIVE_CONTENT" &&
        (classification.liveHudGoldSignalRatio ?? 0) > 0.035 &&
        (classification.liveHudGoldSignalRatio ?? 0) < 0.055 &&
        (classification.liveHudScoreSignalRatio ?? 0) > 0.080 &&
        (classification.liveHudScoreSignalRatio ?? 0) < 0.10 &&
        (classification.lobbyStartBlueRatio ?? 0) < 0.01 &&
        (classification.queueStatusGoldRatio ?? 0) < 0.01 &&
        (classification.sideMenuDarkRatio ?? 0) > 0.43 &&
        (classification.sideMenuDarkRatio ?? 0) < 0.50 &&
        (classification.roomBackDarkRatio ?? 0) > 0.65 &&
        (classification.gameOverReplayBlueRatio ?? 0) < 0.02 &&
        (classification.progressDarkRatio ?? 0) > 0.07 &&
        (classification.progressDarkRatio ?? 0) < 0.13
    );
    const brightArenaSideListCombat = (
        classification.state === "LIVE_CONTENT" &&
        (classification.liveHudGoldSignalRatio ?? 0) > 0.015 &&
        (classification.liveHudGoldSignalRatio ?? 0) < 0.025 &&
        (classification.liveHudScoreSignalRatio ?? 0) > 0.020 &&
        (classification.liveHudScoreSignalRatio ?? 0) < 0.035 &&
        (classification.lobbyStartBlueRatio ?? 0) < 0.01 &&
        (classification.queueStatusGoldRatio ?? 0) > 0.015 &&
        (classification.queueStatusGoldRatio ?? 0) < 0.025 &&
        (classification.sideMenuGoldRatio ?? 0) > 0.19 &&
        (classification.sideMenuGoldRatio ?? 0) < 0.24 &&
        (classification.transitionCenterGoldRatio ?? 0) > 0.20 &&
        (classification.gameOverReplayBlueRatio ?? 0) < 0.02 &&
        (classification.progressDarkRatio ?? 0) < 0.02
    );
    const shopOpenOpponentBoardCombat = (
        classification.state === "LIVE_CONTENT" &&
        (classification.liveHudGoldSignalRatio ?? 0) > 0.030 &&
        (classification.liveHudGoldSignalRatio ?? 0) < 0.040 &&
        (classification.liveHudScoreSignalRatio ?? 0) > 0.030 &&
        (classification.liveHudScoreSignalRatio ?? 0) < 0.045 &&
        (classification.lobbyStartBlueRatio ?? 0) < 0.005 &&
        (classification.queueStatusGoldRatio ?? 0) < 0.005 &&
        (classification.sideMenuDarkRatio ?? 0) > 0.32 &&
        (classification.sideMenuDarkRatio ?? 0) < 0.36 &&
        (classification.roomBackDarkRatio ?? 0) > 0.62 &&
        (classification.roomBackDarkRatio ?? 0) < 0.72 &&
        (classification.gameOverReplayBlueRatio ?? 0) < 0.01 &&
        (classification.gameOverResultExitBlueRatio ?? 0) > 0.50 &&
        (classification.gameOverResultExitBlueRatio ?? 0) < 0.58 &&
        (classification.modeSelectBlueRatio ?? 0) > 0.10 &&
        (classification.modeSelectBlueRatio ?? 0) < 0.14 &&
        (classification.progressDarkRatio ?? 0) > 0.11 &&
        (classification.progressDarkRatio ?? 0) < 0.15
    );
    const earlyOpponentBoardCombat = (
        classification.state === "LIVE_CONTENT" &&
        (classification.liveHudGoldSignalRatio ?? 0) > 0.018 &&
        (classification.liveHudGoldSignalRatio ?? 0) < 0.023 &&
        (classification.liveHudScoreSignalRatio ?? 0) > 0.030 &&
        (classification.liveHudScoreSignalRatio ?? 0) < 0.050 &&
        (classification.lobbyStartBlueRatio ?? 0) > 0.015 &&
        (classification.lobbyStartBlueRatio ?? 0) < 0.025 &&
        (classification.queueStatusGoldRatio ?? 0) > 0.020 &&
        (classification.queueStatusGoldRatio ?? 0) < 0.030 &&
        (classification.transitionCenterGoldRatio ?? 0) > 0.10 &&
        (classification.transitionCenterGoldRatio ?? 0) < 0.13 &&
        (classification.transitionCenterDarkRatio ?? 0) > 0.07 &&
        (classification.transitionCenterDarkRatio ?? 0) < 0.09 &&
        (classification.sideMenuDarkRatio ?? 0) > 0.15 &&
        (classification.sideMenuDarkRatio ?? 0) < 0.18 &&
        (classification.roomBackDarkRatio ?? 0) > 0.20 &&
        (classification.roomBackDarkRatio ?? 0) < 0.24 &&
        (classification.gameOverReplayBlueRatio ?? 0) > 0.07 &&
        (classification.gameOverReplayBlueRatio ?? 0) < 0.09 &&
        (classification.progressDarkRatio ?? 0) > 0.08 &&
        (classification.progressDarkRatio ?? 0) < 0.10
    );
    const stage3PlayerListCombat = (
        classification.state === "LIVE_CONTENT" &&
        (classification.liveHudGoldSignalRatio ?? 0) > 0.050 &&
        (classification.liveHudGoldSignalRatio ?? 0) < 0.065 &&
        (classification.liveHudScoreSignalRatio ?? 0) > 0.035 &&
        (classification.liveHudScoreSignalRatio ?? 0) < 0.045 &&
        (classification.lobbyStartBlueRatio ?? 0) < 0.005 &&
        (classification.queueStatusGoldRatio ?? 0) < 0.005 &&
        (classification.sideMenuDarkRatio ?? 0) > 0.32 &&
        (classification.sideMenuDarkRatio ?? 0) < 0.39 &&
        (classification.roomBackGoldRatio ?? 0) > 0.045 &&
        (classification.roomBackGoldRatio ?? 0) < 0.065 &&
        (classification.roomBackDarkRatio ?? 0) > 0.55 &&
        (classification.roomBackDarkRatio ?? 0) < 0.62 &&
        (classification.gameOverReplayBlueRatio ?? 0) < 0.01 &&
        (classification.progressDarkRatio ?? 0) > 0.14 &&
        (classification.progressDarkRatio ?? 0) < 0.17
    );
    const weakStage2OpponentCombat = (
        classification.state === "LIVE_CONTENT" &&
        (classification.liveHudGoldSignalRatio ?? 0) > 0.050 &&
        (classification.liveHudGoldSignalRatio ?? 0) < 0.065 &&
        (classification.liveHudScoreSignalRatio ?? 0) > 0.010 &&
        (classification.liveHudScoreSignalRatio ?? 0) < 0.018 &&
        (classification.lobbyStartBlueRatio ?? 0) < 0.005 &&
        (classification.queueStatusGoldRatio ?? 0) < 0.005 &&
        (classification.sideMenuDarkRatio ?? 0) > 0.30 &&
        (classification.sideMenuDarkRatio ?? 0) < 0.34 &&
        (classification.roomBackGoldRatio ?? 0) > 0.020 &&
        (classification.roomBackGoldRatio ?? 0) < 0.040 &&
        (classification.roomBackDarkRatio ?? 0) > 0.30 &&
        (classification.roomBackDarkRatio ?? 0) < 0.34 &&
        (classification.gameOverReplayBlueRatio ?? 0) > 0.020 &&
        (classification.gameOverReplayBlueRatio ?? 0) < 0.040 &&
        (classification.progressDarkRatio ?? 0) > 0.030 &&
        (classification.progressDarkRatio ?? 0) < 0.050
    );
    const weakStage3OpponentCombat = (
        classification.state === "LIVE_CONTENT" &&
        (classification.liveHudGoldSignalRatio ?? 0) > 0.050 &&
        (classification.liveHudGoldSignalRatio ?? 0) < 0.105 &&
        (classification.liveHudScoreSignalRatio ?? 0) > 0.030 &&
        (classification.liveHudScoreSignalRatio ?? 0) < 0.038 &&
        (classification.lobbyStartBlueRatio ?? 0) > 0.030 &&
        (classification.lobbyStartBlueRatio ?? 0) < 0.065 &&
        (classification.queueStatusGoldRatio ?? 0) < 0.005 &&
        (classification.sideMenuDarkRatio ?? 0) > 0.22 &&
        (classification.sideMenuDarkRatio ?? 0) < 0.26 &&
        (classification.roomBackGoldRatio ?? 0) > 0.035 &&
        (classification.roomBackGoldRatio ?? 0) < 0.045 &&
        (classification.roomBackDarkRatio ?? 0) > 0.56 &&
        (classification.roomBackDarkRatio ?? 0) < 0.61 &&
        (classification.gameOverReplayBlueRatio ?? 0) > 0.14 &&
        (classification.gameOverReplayBlueRatio ?? 0) < 0.16 &&
        (classification.progressDarkRatio ?? 0) < 0.020
    );

    return (
        classicPlayerListCombat ||
        sideListCombat ||
        darkArenaSideListCombat ||
        brightArenaSideListCombat ||
        shopOpenOpponentBoardCombat ||
        earlyOpponentBoardCombat ||
        stage3PlayerListCombat ||
        weakStage2OpponentCombat ||
        weakStage3OpponentCombat
    );
}
