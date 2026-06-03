package com.tfthextech.helper.automation

import com.tfthextech.helper.protocol.ActionPlan
import com.tfthextech.helper.protocol.ActionType
import com.tfthextech.helper.protocol.ExecutionStep
import com.tfthextech.helper.protocol.ObservedState
import com.tfthextech.helper.protocol.PointF01
import com.tfthextech.helper.protocol.ShopOffer

class AndroidRulePolicy {
    fun decide(state: ObservedState): List<ActionPlan> {
        if (state.metadata["hasValidStage"] == "false" || state.stageType == "UNKNOWN") {
            return emptyList()
        }

        if (state.metadata["dialogState"] == "confirm") {
            val target = if (state.metadata["dialogButtonLayout"] == "two-buttons") "dialog-positive-right" else "dialog-confirm"
            return listOf(
                ActionPlan(
                    tick = 0,
                    type = ActionType.DISMISS_DIALOG,
                    payload = mapOf("dialogState" to "confirm", "target" to target),
                    priority = 120,
                    reason = if (target == "dialog-positive-right") {
                        "Tap right-side reconnect/confirm button on blocking Android frontend dialog"
                    } else {
                        "Dismiss blocking Android frontend dialog"
                    }
                )
            )
        }
        if (state.metadata["dialogState"] == "settings" && !hasVisibleChoiceProof(state)) {
            return listOf(
                ActionPlan(
                    tick = 0,
                    type = ActionType.DISMISS_DIALOG,
                    payload = mapOf("target" to "settings-close"),
                    priority = 119,
                    reason = "Close blocking Android settings dialog with in-game close button"
                )
            )
        }

        val frontendState = state.metadata["frontendState"]
        rankedRoomRecoveryAction(state)?.let { action ->
            return listOf(action)
        }
        modeSelectorNormalCardAction(state)?.let { action ->
            return listOf(action)
        }
        normalHomeCardSelectAction(state)?.let { action ->
            return listOf(action)
        }
        if (isQueueAutomationFrontend(frontendState)) {
            val canSelectRequestedNormalMode = canSelectRequestedNormalMode(state)
            val canOpenRequestedNormalModeRoom = canOpenRequestedNormalModeRoom(state)
            val canStartRequestedNormalMode = canStartRequestedNormalFromModeSelect(state)
            if (!canSelectRequestedNormalMode && !canOpenRequestedNormalModeRoom && !canStartRequestedNormalMode && !allowsLiveQueueAutomation(state)) {
                return emptyList()
            }
        }

        val resultReason = state.metadata["reason"] in setOf("android-result-screen", "android-result-visual")
        if (state.metadata["resultState"] == "finished" && (state.stageType != "NORMAL" || resultReason)) {
            val visualScoreboardResult = state.metadata["reason"] == "android-result-visual" &&
                state.metadata["resultLayout"] == "scoreboard" &&
                state.metadata["resultProof"] == "visual-scoreboard-stable"
            val stableVisualResult = state.metadata["reason"] == "android-result-visual" &&
                state.metadata["resultProof"] == "visual-stable"
            if (state.metadata["reason"] == "android-result-screen" || visualScoreboardResult || stableVisualResult) {
                return listOf(
                    ActionPlan(
                        tick = 0,
                        type = ActionType.EXIT_RESULT,
                        payload = mapOf(
                            "resultLayout" to (state.metadata["resultLayout"] ?: ""),
                            "resultProof" to (state.metadata["resultProof"] ?: "")
                        ),
                        priority = 118,
                        reason = if (visualScoreboardResult) {
                            "Exit visually confirmed Android scoreboard result screen"
                        } else if (stableVisualResult) {
                            "Exit stable visually confirmed Android result screen"
                        } else {
                            "Exit OCR-confirmed Android result screen"
                        }
                    )
                )
            }
            // Fast visual result detection can collide with live HUD frames.
            // Require OCR confirmation before tapping result buttons.
            return emptyList()
        }

        urgentVisiblePickupBeforeEconomyAction(state)?.let { action ->
            return listOf(action)
        }

        urgentLateStageHighEconomyTempoLevelAction(state)?.let { action ->
            return listOf(action)
        }

        urgentPreStageThreeTempoLevelAction(state)?.let { action ->
            return listOf(action)
        }

        urgentSidePanelTempoLevelAction(state)?.let { action ->
            return listOf(action)
        }

        urgentStageFourRollAction(state)?.let { action ->
            return listOf(action)
        }

        val sidePanelOpen = state.metadata["sidePanelState"] == "open"
        val confirmedSidePanelOpen = sidePanelOpen && state.metadata["reason"] == "android-side-panel-visual"
        if (sidePanelOpen && !isBlockingFullBenchShopOverlay(state) && !canBypassStaleSidePanelForTempoLevel(state)) {
            if (canCloseSidePanelWithBoardTap(state)) {
                return listOf(closeSidePanelAction("confirmed-normal-side-panel-board-tap", target = "side-panel"))
            }
            if (
                shouldCloseEarlyStageTwoLowGoldPanelStall(state) ||
                shouldCloseConfirmedNormalSidePanelWithBack(state) && state.metadata["lootState"] != "visible"
            ) {
                return listOf(closeSidePanelAction("confirmed-normal-side-panel", target = "side-panel-global-back"))
            }
            // Loot taps can land on units and open the detail panel. Once a
            // panel-like visual is present, only tap loot that is still
            // uncovered on the board; do not continue shop/economy actions
            // behind the panel.
            if (!confirmedSidePanelOpen) {
                return emptyList()
            }
            return emptyList()
        }

        if (state.metadata["frontendState"] == "launcher-home" && state.metadata["requestedQueueMode"] == "normal") {
            return listOf(
                ActionPlan(
                    tick = 0,
                    type = ActionType.RESTART_TFT,
                    payload = mapOf("frontendState" to "launcher-home"),
                    priority = 125,
                    reason = "Bring TFT back to foreground from Android launcher"
                )
            )
        }

        if (state.metadata["frontendState"] == "career-history") {
            if (state.metadata["requestedQueueMode"] != "normal") {
                return emptyList()
            }
            return listOf(
                ActionPlan(
                    tick = 0,
                    type = ActionType.RECOVER_BACK,
                    payload = mapOf("target" to "career-history-back"),
                    priority = 122,
                    reason = "Back out of Android player career/history before normal-only training"
                )
            )
        }

        if (state.metadata["frontendState"] == "accept-ready") {
            if (!allowsLiveQueueAutomation(state)) {
                return emptyList()
            }
            return listOf(
                ActionPlan(
                    tick = 0,
                    type = ActionType.ACCEPT_QUEUE,
                    payload = mapOf("frontendState" to "accept-ready"),
                    priority = 115,
                    reason = "Accept TFT ready check from Android frontend MVP policy"
                )
            )
        }

        if (state.metadata["frontendState"] == "continue-ready") {
            if (
                state.stageType == "FRONTEND" &&
                state.stageText.isBlank() &&
                state.metadata["requestedQueueMode"] == "normal" &&
                state.metadata["reason"] == "android-frontend-tap-to-continue-visual" &&
                state.metadata["dialogState"].isNullOrBlank() &&
                state.metadata["resultState"].isNullOrBlank()
            ) {
                return listOf(
                    ActionPlan(
                        tick = 0,
                        type = ActionType.DISMISS_DIALOG,
                        payload = mapOf("target" to "tap-to-continue"),
                        priority = 87,
                        reason = "Tap safe Android continue screen after TFT foreground restart"
                    )
                )
            }
            // Wider continue visuals have collided with live board/shop states.
            return emptyList()
        }

        if (state.metadata["frontendState"] == "mode-room-customization") {
            if (state.metadata["requestedQueueMode"] != "normal") {
                return emptyList()
            }
            return listOf(
                ActionPlan(
                    tick = 0,
                    type = ActionType.DISMISS_DIALOG,
                    payload = mapOf("target" to "mode-room-customization-back"),
                    priority = 113,
                    reason = "Close Android match-room customization panel before normal-only queue automation"
                )
            )
        }

        if (state.metadata["frontendState"] == "mode-select") {
            if (!canSelectRequestedNormalMode(state)) {
                return emptyList()
            }
            return listOf(
                ActionPlan(
                    tick = 0,
                    type = ActionType.SELECT_MODE,
                    payload = mapOf(
                        "frontendState" to "mode-select",
                        "queueMode" to (state.metadata["queueMode"] ?: ""),
                        "target" to "normal-card"
                    ),
                    priority = 112,
                    reason = "Confirm Android TFT normal match mode card before queue start"
                )
            )
        }

        forcedLateTempoLevelAction(state)?.let { action ->
            return listOf(action)
        }

        urgentStageThreeTempoLevelAction(state)?.let { action ->
            return listOf(action)
        }

        suspectedAwayBoardReturnHomeAction(state)?.let { action ->
            return listOf(action)
        }

        visualEncounterChoiceFallbackActions(state)?.let { actions ->
            return actions
        }

        visualAugmentChoiceFallbackAction(state)?.let { action ->
            return listOf(action)
        }

        if (
            state.metadata["reason"] == "android-augment-visual" &&
            state.metadata["augmentLayout"] == "wide" &&
            isSharedDraftVisualNoiseStage(state.stageText)
        ) {
            return emptyList()
        }

        if (state.augments.isNotEmpty()) {
            val augmentLayout = state.metadata["augmentLayout"] ?: ""
            if (
                state.metadata["reason"] == "android-augment-visual" &&
                isSharedDraftVisualNoiseStage(state.stageText) &&
                state.augments.all { it.name == "默认海克斯" }
            ) {
                return emptyList()
            }
            if (
                state.metadata["reason"] == "android-augment-visual" &&
                augmentLayout !in setOf("encounter", "gift", "item-choice") &&
                state.stageText.isBlank() &&
                state.level <= 1 &&
                state.gold <= 0 &&
                !hasNormalLootModeProof(state)
            ) {
                return emptyList()
            }
            if (state.metadata["reason"] == "android-augment-visual" && augmentLayout !in setOf("wide", "encounter", "gift", "item-choice")) {
                return emptyList()
            }
            val layout = state.metadata["augmentLayout"] ?: ""
            val primary = ActionPlan(
                tick = 0,
                type = ActionType.PICK_AUGMENT,
                payload = mapOf(
                    "slot" to state.augments.first().slot.toString(),
                    "layout" to layout
                ),
                priority = 110,
                reason = "Pick visible augment from Android MVP policy"
            )
            return if (layout == "encounter") {
                listOf(primary, confirmChoiceAction(priority = 109, reason = "Confirm selected Android encounter choice"))
            } else if (layout == "item-choice") {
                listOf(primary, confirmChoiceAction(priority = 109, reason = "Confirm selected Android item choice"))
            } else if (layout == "gift") {
                listOf(primary, confirmChoiceAction(priority = 109, reason = "Confirm selected Android gift choice"))
            } else if (state.metadata["reason"] == "android-augment-visual" && layout == "wide") {
                listOf(primary, confirmChoiceAction(priority = 108, reason = "Confirm selected Android wide choice if the card tap did not resolve"))
            } else {
                listOf(primary)
            }
        }

        if (state.metadata["frontendState"] == "start-ready") {
            if (canOpenRequestedNormalModeRoom(state)) {
                return listOf(
                    ActionPlan(
                        tick = 0,
                        type = ActionType.OPEN_MODE_ROOM,
                        payload = mapOf("frontendState" to "start-ready"),
                        priority = 92,
                        reason = "Open TFT match room to verify normal mode before queue start"
                    )
                )
            }
            if (!allowsLiveQueueAutomation(state)) {
                return emptyList()
            }
            return listOf(
                ActionPlan(
                    tick = 0,
                    type = ActionType.START_GAME,
                    payload = mapOf("frontendState" to "start-ready"),
                    priority = 90,
                    reason = "Start TFT match from Android frontend MVP policy"
                )
            )
        }

        if (state.metadata["frontendState"] == "update-ready") {
            return listOf(
                ActionPlan(
                    tick = 0,
                    type = ActionType.START_UPDATE,
                    payload = mapOf("frontendState" to "update-ready"),
                    priority = 88,
                    reason = "Start Android TFT version update from frontend recovery policy"
                )
            )
        }

        if (state.metadata["frontendState"] == "loading") {
            return emptyList()
        }

        if (
            state.stageType == "NORMAL" &&
            state.metadata["playerListState"] == "visible" &&
            state.metadata["shopOverlayState"] != "open"
        ) {
            // A visible right-side player list means the camera may be on an
            // opponent/spectator board. Returning home is non-destructive and
            // safer than running economy/shop/loot actions on someone else's
            // board, including during combat.
            returnHomeFromStageTwoAwayBoardAction(state)?.let { return listOf(it) }
            returnHomeFromStageThreeCombatPlayerListAction(state)?.let { return listOf(it) }
            returnHomeAction(state)?.let { return listOf(it) }
        }

        if (hasBlockingFullBenchWarning(state)) {
            val safeActions = listOfNotNull(emergencyFullBenchSellAction(state)) +
                listOfNotNull(lootPickupAction(state)) +
                listOfNotNull(anvilAction(state)) +
                benchSellActions(state) +
                listOfNotNull(levelUpAction(state))
            return prioritized(safeActions).ifEmpty { emptyList() }
        }

        urgentPreCombatEquipmentAction(state)?.let { action ->
            return listOf(action)
        }

        val buyActions = trustedShopBuyActions(state)
        if (buyActions.isNotEmpty() && shouldPrioritizeTrustedShopBuyBeforeCombatLoot(state)) {
            return buyActions
        }

        anvilAction(state)?.takeIf { shouldPrioritizeAnvilBeforeLoot(state) }?.let { action ->
            return listOf(action)
        }

        val safetyActions = prioritized(listOfNotNull(lootPickupAction(state)))
        if (safetyActions.isNotEmpty()) {
            return safetyActions
        }

        prioritizedTempoLevelAction(state)?.let { action ->
            return listOf(action)
        }
        anvilAction(state)?.let { action ->
            return listOf(action)
        }

        val sellActions = benchSellActions(state)
        val deployActions = benchDeployActions(state)
        val equipActions = equipmentActions(state)
        val levelAction = levelUpAction(state)

        val candidateActions = buyActions + sellActions + listOfNotNull(levelAction) + equipActions + deployActions + listOfNotNull(returnHomeAction(state))
        return if (candidateActions.isNotEmpty()) {
            candidateActions.sortedWith(compareByDescending<ActionPlan> { it.priority }.thenBy { it.tick })
        } else if (shouldSmallRoll(state)) {
            listOf(
                ActionPlan(
                    tick = 0,
                    type = ActionType.ROLL,
                    payload = mapOf("stage" to state.stageText),
                    priority = 70,
                    reason = "Use one controlled roll at late stage from Android MVP policy"
                )
            )
        } else {
            emptyList()
        }
    }

    private fun levelUpAction(state: ObservedState): ActionPlan? {
        if (!shouldLevelUp(state)) {
            return null
        }
        return rawLevelUpAction(state)
    }

    private fun rawLevelUpAction(state: ObservedState): ActionPlan {
        return ActionPlan(
            tick = 0,
            type = ActionType.LEVEL_UP,
            payload = mapOf("stage" to state.stageText),
            priority = 97,
            reason = "Spend safe economy on tempo level from Android MVP policy"
        )
    }

    private fun urgentVisiblePickupBeforeEconomyAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || state.metadata["sidePanelState"] == "open") {
            return null
        }
        if (!hasNormalLootModeProof(state) || !isStageAtLeast(state.stageText, major = 4, minor = 1)) {
            return null
        }
        if (!hasCurrentOwnBoardGoldHud(state) && !hasCurrentShopAndGoldHud(state)) {
            return null
        }
        anvilAction(state)?.takeIf { shouldPrioritizeAnvilBeforeLoot(state) }?.let { action ->
            return action.copy(
                priority = 116,
                reason = "Open visible Android item anvil before urgent economy actions"
            )
        }
        val lootX = state.metadata["lootX"]?.toFloatOrNull()
        val lootY = state.metadata["lootY"]?.toFloatOrNull()
        if (lootX == null || lootY == null || lootX !in 0.42f..0.72f || lootY !in 0.62f..0.78f) {
            return null
        }
        return lootPickupAction(state)?.copy(
            priority = 115,
            reason = "Pick visible Android loot orb before urgent economy actions"
        )
    }

    private fun prioritizedTempoLevelAction(state: ObservedState): ActionPlan? {
        if (!shouldPrioritizeTempoLevel(state)) {
            return null
        }
        return levelUpAction(state)
    }

    private fun urgentStageThreeTempoLevelAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || state.metadata["reason"] != "android-fast-hud") {
            return null
        }
        if (!hasNormalLootModeProof(state)) {
            return null
        }
        if (!hasCurrentOwnBoardGoldHud(state) && !canUseHighRecentStageThreeGoldForTempo(state)) {
            return null
        }
        val shouldLevelEarlyStageThree = isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            state.level <= 4 &&
            state.gold >= 50
        val levelFiveStageThreeGoldThreshold = if (isStageAtLeast(state.stageText, major = 3, minor = 2)) 50 else 60
        val shouldLevelFiveWithHighStageThreeGold = isStageAtLeast(state.stageText, major = 3, minor = 2) &&
            state.level == 5 &&
            state.gold >= levelFiveStageThreeGoldThreshold
        if (!shouldLevelEarlyStageThree && !shouldLevelFiveWithHighStageThreeGold) {
            return null
        }
        if (shouldLevelFiveWithHighStageThreeGold && hasImmediateOwnBoardCombatLoot(state)) {
            return null
        }
        val lootX = state.metadata["lootX"]?.toFloatOrNull()
        val lootY = state.metadata["lootY"]?.toFloatOrNull()
        if (
            shouldLevelFiveWithHighStageThreeGold &&
            lootX != null &&
            lootY != null &&
            isStageThreeAwayBoardRightRailLootNoise(state, lootX, lootY)
        ) {
            return null
        }
        if (!state.metadata["frontendState"].isNullOrBlank() || !state.metadata["dialogState"].isNullOrBlank()) {
            return null
        }
        return levelUpAction(state)?.copy(
            priority = 109,
            reason = "Urgent Android stage-three tempo level before loot noise stalls economy"
        )
    }

    private fun urgentLateStageHighEconomyTempoLevelAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || state.metadata["reason"] != "android-fast-hud") {
            return null
        }
        val shouldRecoverStageFourLevelDrop = isStageAtLeast(state.stageText, major = 4, minor = 2) &&
            state.level <= 1 &&
            state.gold >= 35
        if (!hasNormalLootModeProof(state) && !(shouldRecoverStageFourLevelDrop && hasConfirmedNormalModeProof(state))) {
            return null
        }
        if (state.metadata["goldSource"] == "last-stable" || !hasCurrentOwnBoardGoldHud(state)) {
            return null
        }
        if (state.metadata["sidePanelState"] == "open") {
            return null
        }
        if (state.augments.isNotEmpty() || state.metadata["augmentLayout"] == "item-choice") {
            return null
        }
        if (!state.metadata["frontendState"].isNullOrBlank() || !state.metadata["dialogState"].isNullOrBlank()) {
            return null
        }
        val shouldSpendBeforeStageFour = isStageAtLeast(state.stageText, major = 3, minor = 5) &&
            !isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            state.level == 6 &&
            state.gold >= 50
        val lootX = state.metadata["lootX"]?.toFloatOrNull()
        val lootY = state.metadata["lootY"]?.toFloatOrNull()
        val shouldPickPreStageFourLocalLootFirst = shouldSpendBeforeStageFour &&
            state.stageText.trim() == "3-5" &&
            state.metadata["lootState"] == "visible" &&
            lootX != null &&
            lootY != null &&
            (isOwnBoardUpperLootTarget(state, lootX, lootY) || lootX in 0.42f..0.72f && lootY >= 0.65f)
        if (shouldPickPreStageFourLocalLootFirst) {
            return null
        }
        val stageFourLevelSixLootLooksLocal = state.metadata["lootState"] != "visible" ||
            lootX == null ||
            lootY == null ||
            state.metadata["playerListState"] != "visible" ||
            lootX >= 0.45f
        val shouldRecoverStageFourLevelSix = isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            state.level == 6 &&
            state.gold >= 50 &&
            stageFourLevelSixLootLooksLocal
        val shouldSpendAtStageFour = isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            canSafelyPushLevelEight(state)
        val shouldContinueStageFourLevelSevenPush = isStageAtLeast(state.stageText, major = 4, minor = 2) &&
            state.gold in 32..49 &&
            canSafelyPushLevelEight(state)
        if (
            (shouldSpendAtStageFour || shouldContinueStageFourLevelSevenPush) &&
            state.metadata["lootState"] == "visible" &&
            hasLateCombatBoardLootTarget(state) &&
            !shouldContinueStageFourLevelSevenPush &&
            !isStageFourHighEconomyRightPanelLootStall(state, lootX, lootY)
        ) {
            return null
        }
        if (!shouldSpendBeforeStageFour && !shouldRecoverStageFourLevelSix && !shouldRecoverStageFourLevelDrop && !shouldSpendAtStageFour && !shouldContinueStageFourLevelSevenPush) {
            return null
        }
        val action = if (shouldContinueStageFourLevelSevenPush || shouldRecoverStageFourLevelDrop) rawLevelUpAction(state) else levelUpAction(state) ?: return null
        return action.copy(
            priority = 110,
            reason = "Urgent Android late-stage tempo level before persistent loot noise stalls economy"
        )
    }

    private fun isStageFourHighEconomyRightPanelLootStall(state: ObservedState, x: Float?, y: Float?): Boolean {
        return x != null &&
            y != null &&
            isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            state.level == 7 &&
            state.gold >= 50 &&
            x in 0.70f..0.80f &&
            y in 0.50f..0.68f
    }

    private fun urgentPreStageThreeTempoLevelAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || state.metadata["reason"] != "android-fast-hud") {
            return null
        }
        if (!hasNormalLootModeProof(state)) {
            return null
        }
        if (state.stageText.trim() != "2-7" || state.level > 4 || state.gold < 40) {
            return null
        }
        if (state.metadata["goldSource"] == "last-stable" || !hasCurrentOwnBoardGoldHud(state)) {
            return null
        }
        if (
            state.metadata["lootState"] == "visible" &&
            hasBoardLocalLootTarget(state) &&
            !isPreStageThreeFloatingEconomyLootStall(state)
        ) {
            return null
        }
        if (state.augments.isNotEmpty() || state.metadata["augmentLayout"] == "item-choice") {
            return null
        }
        if (!state.metadata["frontendState"].isNullOrBlank() || !state.metadata["dialogState"].isNullOrBlank()) {
            return null
        }
        return levelUpAction(state)?.copy(
            priority = 109,
            reason = "Urgent Android pre-stage-three tempo level before floating early economy"
        )
    }

    private fun isPreStageThreeFloatingEconomyLootStall(state: ObservedState): Boolean {
        val lootX = state.metadata["lootX"]?.toFloatOrNull() ?: return false
        val lootY = state.metadata["lootY"]?.toFloatOrNull() ?: return false
        return state.stageText.trim() == "2-7" &&
            state.level <= 4 &&
            state.gold >= 40 &&
            state.shop.isNotEmpty() &&
            state.metadata["shopOverlayState"] == "open" &&
            lootX in 0.52f..0.62f &&
            lootY in 0.68f..0.78f
    }

    private fun urgentSidePanelTempoLevelAction(state: ObservedState): ActionPlan? {
        if (
            state.stageType != "NORMAL" ||
            state.metadata["sidePanelState"] != "open" && state.metadata["reason"] != "android-side-panel-visual"
        ) {
            return null
        }
        if (state.metadata["reason"] != "android-side-panel-visual" || !hasNormalLootModeProof(state)) {
            return null
        }
        if (!hasCurrentOwnBoardGoldHud(state) && !canUseHighRecentSidePanelGoldForTempo(state)) {
            return null
        }
        if (state.gold >= 100 && !hasCurrentOwnBoardGoldHud(state)) {
            return null
        }
        val shouldSpendStageThreeLevelFive = isStageAtLeast(state.stageText, major = 3, minor = 2) &&
            !isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            state.level == 5 &&
            state.gold >= 50
        val shouldSpendStageThreeLate = isStageAtLeast(state.stageText, major = 3, minor = 5) &&
            !isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            state.level <= 6 &&
            state.gold >= 40
        val shouldRecoverStageFourLevelSix = isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            state.level == 6 &&
            state.gold >= 50
        val shouldSpendStageFourLevelSeven = isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            canSafelyPushLevelEight(state)
        val lootX = state.metadata["lootX"]?.toFloatOrNull()
        val lootY = state.metadata["lootY"]?.toFloatOrNull()
        val stageThreeLevelFiveSafeLootShouldWin = shouldSpendStageThreeLevelFive &&
            lootY != null &&
            lootY > 0.66f
        val stageThreeLateLevelFiveSafeLootShouldWin = shouldSpendStageThreeLate &&
            state.level == 5 &&
            lootY != null &&
            lootY > 0.66f
        val stageThreeLateLevelSixSafeLootShouldWin = shouldSpendStageThreeLate &&
            state.level == 6 &&
            lootX != null &&
            lootY != null &&
            lootX in 0.42f..0.72f &&
            lootY in 0.62f..0.72f
        if (
            !shouldRecoverStageFourLevelSix &&
            !(shouldSpendStageFourLevelSeven && state.metadata["playerListState"] == "visible") &&
            (!shouldSpendStageThreeLevelFive || stageThreeLevelFiveSafeLootShouldWin) &&
            (!shouldSpendStageThreeLate || stageThreeLateLevelFiveSafeLootShouldWin || stageThreeLateLevelSixSafeLootShouldWin) &&
            state.metadata["lootState"] == "visible" &&
            lootX != null &&
            lootY != null &&
            isSafeSidePanelLootTarget(state, lootX, lootY)
        ) {
            return null
        }
        if (!shouldSpendStageThreeLevelFive && !shouldSpendStageThreeLate && !shouldRecoverStageFourLevelSix && !shouldSpendStageFourLevelSeven) {
            return null
        }
        if (
            shouldSpendStageThreeLate &&
            state.level == 6 &&
            isStageAtLeast(state.stageText, major = 3, minor = 6) &&
            state.gold < 45
        ) {
            return null
        }
        if (state.augments.isNotEmpty() || state.metadata["augmentLayout"] == "item-choice") {
            return null
        }
        if (!state.metadata["frontendState"].isNullOrBlank() || !state.metadata["dialogState"].isNullOrBlank()) {
            return null
        }
        return levelUpAction(state)?.copy(
            priority = 111,
            reason = "Spend critical Android tempo level without closing verified side panel"
        )
    }

    private fun canUseHighRecentSidePanelGoldForTempo(state: ObservedState): Boolean {
        return state.metadata["goldSource"] == "last-stable" &&
            state.metadata["reason"] == "android-side-panel-visual" &&
            state.metadata["sidePanelState"] == "open" &&
            hasNormalLootModeProof(state) &&
            isStageAtLeast(state.stageText, major = 3, minor = 6) &&
            !isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            state.level == 6 &&
            state.gold >= 70
    }

    private fun canUseHighRecentStageThreeGoldForTempo(state: ObservedState): Boolean {
        return state.metadata["goldSource"] == "last-stable" &&
            state.metadata["reason"] == "android-fast-hud" &&
            hasNormalLootModeProof(state) &&
            isStageAtLeast(state.stageText, major = 3, minor = 3) &&
            !isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            state.level == 5 &&
            state.gold >= 70 &&
            state.metadata["shopOverlayState"] == "open" &&
            state.metadata["playerListState"] == "visible" &&
            state.metadata["combatState"] == "active"
    }

    private fun hasImmediateOwnBoardCombatLoot(state: ObservedState): Boolean {
        if (state.metadata["lootState"] != "visible" || state.metadata["combatState"] != "active") {
            return false
        }
        val x = state.metadata["lootX"]?.toFloatOrNull() ?: return false
        val y = state.metadata["lootY"]?.toFloatOrNull() ?: return false
        return x in 0.68f..0.74f && y in 0.42f..0.54f
    }

    private fun equipmentActions(state: ObservedState): List<ActionPlan> {
        return equipmentActions(state, allowVisibleLoot = false, allowCombat = false)
    }

    private fun urgentPreCombatEquipmentAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || state.items.size < 2) {
            return null
        }
        if (!isStageAtLeast(state.stageText, major = 2, minor = 5)) {
            return null
        }
        if (state.metadata["lootState"] != "visible") {
            return null
        }
        val lootX = state.metadata["lootX"]?.toFloatOrNull()
        val lootY = state.metadata["lootY"]?.toFloatOrNull()
        if (
            hasNormalLootModeProof(state) &&
            lootX != null &&
            lootY != null &&
            (isBoardLocalLootTarget(state, lootX, lootY) || isOwnBoardRightLootTarget(state, lootX, lootY))
        ) {
            return null
        }
        if (!state.metadata["frontendState"].isNullOrBlank() || !state.metadata["dialogState"].isNullOrBlank()) {
            return null
        }
        val allowCombat = state.metadata["combatState"] == "active" &&
            state.items.size >= 4 &&
            isStageAtLeast(state.stageText, major = 3, minor = 5)
        return equipmentActions(state, allowVisibleLoot = true, allowCombat = allowCombat).firstOrNull()?.copy(
            priority = 106,
            reason = "Equip observed Android item before persistent loot noise stalls combat strength"
        )
    }

    private fun equipmentActions(state: ObservedState, allowVisibleLoot: Boolean, allowCombat: Boolean): List<ActionPlan> {
        if (state.stageType != "NORMAL" || state.items.isEmpty()) {
            return emptyList()
        }
        if (!allowCombat && state.metadata["combatState"] == "active") {
            return emptyList()
        }
        if (!allowVisibleLoot && state.metadata["lootState"] == "visible") {
            return emptyList()
        }
        if (isOpeningSharedEncounter(state)) {
            return emptyList()
        }
        return state.items.take(5).mapIndexed { index, item ->
            val slot = index + 1
            ActionPlan(
                tick = slot,
                type = ActionType.EQUIP,
                payload = mapOf(
                    "itemSlot" to slot.toString(),
                    "item" to item
                ),
                priority = 94,
                reason = "Drag observed Android item onto a likely board carry"
            )
        }
    }

    private fun benchDeployActions(state: ObservedState): List<ActionPlan> {
        if (state.stageType != "NORMAL" || state.metadata["shopOverlayState"] != "open" || state.level < 2) {
            return emptyList()
        }
        if (state.metadata["combatState"] == "active") {
            return emptyList()
        }
        if (isPostKrugsStage(state.stageText) && !hasKnownOpenBoardCapacity(state)) {
            return emptyList()
        }
        return (1..state.level.coerceIn(2, 6)).map { slot ->
            val boardSlot = slot.coerceIn(1, 6)
            ActionPlan(
                tick = slot,
                type = ActionType.MOVE,
                payload = mapOf(
                    "fromBenchSlot" to slot.toString(),
                    "toBoardSlot" to boardSlot.toString()
                ),
                priority = 95,
                reason = "Drag a bench unit onto the Android board when there is likely open capacity"
            )
        }
    }

    private fun benchSellActions(state: ObservedState): List<ActionPlan> {
        if (state.stageType != "NORMAL" || !hasConfirmedFullBenchSellNeed(state) || !hasTrustedBenchNames(state)) {
            return emptyList()
        }
        if (state.metadata["combatState"] == "active") {
            return emptyList()
        }
        if (state.metadata["lootState"] == "visible" && !hasBlockingFullBenchWarning(state)) {
            return emptyList()
        }
        val protectedNames = protectedBenchNames(state)
        return state.bench.mapIndexedNotNull { index, unit ->
            val name = unit.name.trim()
            val cost = unit.cost ?: 1
            if (name.isBlank() || name in protectedNames || cost > 2) {
                null
            } else {
                val slot = benchSlotOf(unit.location) ?: index + 1
                ActionPlan(
                    tick = slot,
                    type = ActionType.SELL,
                    payload = mapOf(
                        "benchSlot" to slot.toString(),
                        "champion" to name
                    ),
                    priority = 99,
                    reason = "Sell low-cost bench unit outside protected Android roster to free space"
                )
            }
        }.sortedByDescending { it.tick }.take(1)
    }

    private fun emergencyFullBenchSellAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || !hasConfirmedFullBenchSellNeed(state) || hasTrustedBenchNames(state)) {
            return null
        }
        if (state.metadata["combatState"] == "active" && !hasFullBenchWarning(state)) {
            return null
        }
        return ActionPlan(
            tick = 9,
            type = ActionType.SELL,
            payload = mapOf("benchSlot" to "9", "target" to "emergency-full-bench"),
            priority = 108,
            reason = "Emergency sell rightmost Android bench slot when full-bench warning blocks pickups"
        )
    }

    private fun hasKnownOpenBoardCapacity(state: ObservedState): Boolean {
        if (state.board.isNotEmpty()) {
            return state.board.size < state.level
        }
        val boardCount = state.metadata["boardCount"]?.toIntOrNull() ?: return false
        return boardCount < state.level
    }

    private fun shouldLevelUp(state: ObservedState): Boolean {
        if (state.stageType != "NORMAL" || state.level !in 4..8) {
            return false
        }
        if (isStageAtLeast(state.stageText, major = 3, minor = 1) && state.level <= 4) {
            return state.gold >= 32
        }
        if (isStageAtLeast(state.stageText, major = 3, minor = 2) && state.level <= 5) {
            return state.gold >= 50
        }
        if (state.stageText.trim() == "2-7" && state.level <= 4) {
            return state.gold >= 40 && hasNormalLootModeProof(state)
        }
        if (!isPostKrugsStage(state.stageText)) {
            return false
        }
        if (isStageAtLeast(state.stageText, major = 3, minor = 5) && state.level <= 6) {
            return state.gold >= 40
        }
        if (isStageAtLeast(state.stageText, major = 4, minor = 1) && state.level == 7) {
            return canSafelyPushLevelEight(state)
        }
        val requiredGold = if (state.level >= 8) 100 else 50
        return state.gold >= requiredGold
    }

    private fun canSafelyPushLevelEight(state: ObservedState): Boolean {
        if (state.level != 7) {
            return false
        }
        if (state.gold >= 90) {
            return true
        }
        if (state.gold < 32 || state.totalXp <= 0) {
            return false
        }
        val remainingXp = state.totalXp - state.currentXp
        return remainingXp in 1..16
    }

    private fun shouldPrioritizeTempoLevel(state: ObservedState): Boolean {
        if (!shouldLevelUp(state)) {
            return false
        }
        if (state.augments.isNotEmpty() || state.metadata["augmentLayout"] == "item-choice") {
            return false
        }
        return isStageAtLeast(state.stageText, major = 3, minor = 2) &&
            state.level <= 6 &&
            state.gold >= 70
    }

    private fun forcedLateTempoLevelAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || state.metadata["reason"] != "android-fast-hud") {
            return null
        }
        if (state.metadata["shopOverlayState"] != "open") {
            return null
        }
        if (!isStageAtLeast(state.stageText, major = 3, minor = 5) || state.level > 6) {
            return null
        }
        val requiredGold = if (state.level <= 5) 50 else 70
        if (state.gold < requiredGold) {
            return null
        }
        if (state.gold >= 100 && state.metadata["goldSource"] == "last-stable") {
            return null
        }
        val lootX = state.metadata["lootX"]?.toFloatOrNull()
        val lootY = state.metadata["lootY"]?.toFloatOrNull()
        if (lootX != null && lootY != null && isOwnBoardUpperLootTarget(state, lootX, lootY)) {
            return null
        }
        if (
            state.stageText.trim() == "3-5" &&
            state.gold < 80 &&
            lootX != null &&
            lootY != null &&
            lootX in 0.42f..0.72f &&
            lootY >= 0.65f
        ) {
            return null
        }
        if (!state.metadata["frontendState"].isNullOrBlank() || !state.metadata["dialogState"].isNullOrBlank()) {
            return null
        }
        return levelUpAction(state)?.copy(
            priority = 109,
            reason = "Force late Android tempo level before floating fatal economy"
        )
    }

    private fun isStageAtLeast(stageText: String, major: Int, minor: Int): Boolean {
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(stageText) ?: return false
        val observedMajor = match.groupValues[1].toIntOrNull() ?: return false
        val observedMinor = match.groupValues[2].toIntOrNull() ?: return false
        return observedMajor > major || observedMajor == major && observedMinor >= minor
    }

    private fun shouldSmallRoll(state: ObservedState): Boolean {
        if (state.stageType != "NORMAL" || !hasNormalLootModeProof(state)) {
            return false
        }
        if (!isStageAtLeast(state.stageText, major = 3, minor = 7) || state.level < 7) {
            return false
        }
        if (state.gold !in 30..60) {
            return false
        }
        if (
            state.metadata["lootState"] == "visible" ||
            state.metadata["sidePanelState"] == "open" ||
            state.metadata["augmentLayout"] == "item-choice" ||
            state.augments.isNotEmpty() ||
            !state.metadata["frontendState"].isNullOrBlank() ||
            !state.metadata["dialogState"].isNullOrBlank()
        ) {
            return false
        }
        return true
    }

    private fun urgentStageFourRollAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || !hasNormalLootModeProof(state)) {
            return null
        }
        if (!isStageAtLeast(state.stageText, major = 4, minor = 1) || state.level != 7) {
            return null
        }
        if (state.gold !in 50..70) {
            return null
        }
        if (shouldLevelUp(state)) {
            return null
        }
        if (state.metadata["sidePanelState"] == "open" || state.metadata["goldSource"] == "last-stable") {
            return null
        }
        if (state.metadata["lootState"] == "visible" && (hasBoardLocalLootTarget(state) || hasLateCombatBoardLootTarget(state))) {
            return null
        }
        if (
            state.metadata["augmentLayout"] == "item-choice" ||
            state.augments.isNotEmpty() ||
            !state.metadata["frontendState"].isNullOrBlank() ||
            !state.metadata["dialogState"].isNullOrBlank() ||
            state.metadata["resultState"] == "finished"
        ) {
            return null
        }
        return ActionPlan(
            tick = 0,
            type = ActionType.ROLL,
            payload = mapOf("stage" to state.stageText),
            priority = 108,
            reason = "Use urgent Android stage-four roll before loot noise stalls combat strength"
        )
    }

    private fun allowsLiveQueueAutomation(state: ObservedState): Boolean {
        // Product safety: until the Android app is stable, do not auto-start or
        // auto-start queues from ranked/unknown rooms. Ready checks often hide
        // the lobby title, so accepting can trust a just-verified normal queue,
        // while starting still requires a current normal-room OCR signal.
        val modeNotRanked = state.metadata["detectedQueueMode"] != "ranked" &&
            state.metadata["lastDetectedQueueMode"] != "ranked"
        if (isModeSelectorOverlayVisible(state)) {
            return false
        }
        if (state.metadata["frontendState"] == "accept-ready") {
            return state.metadata["queueMode"] == "normal" && modeNotRanked
        }
        if (state.metadata["frontendState"] == "start-ready" && state.metadata["queueMode"] == "normal") {
            if (state.metadata["matchRoomState"] == "home" && state.metadata["lastDetectedQueueMode"] == "normal") {
                return modeNotRanked
            }
            return state.metadata["detectedQueueMode"] == "normal" && modeNotRanked
        }
        val requestedOrVerifiedNormal = state.metadata["requestedQueueMode"] == "normal" ||
            state.metadata["queueMode"] == "normal"
        return requestedOrVerifiedNormal &&
            state.metadata["detectedQueueMode"] == "normal" &&
            modeNotRanked
    }

    private fun canSelectRequestedNormalMode(state: ObservedState): Boolean {
        return state.metadata["frontendState"] == "mode-select" &&
            state.metadata["requestedQueueMode"] == "normal" &&
            state.metadata["detectedQueueMode"] == "normal" &&
            state.metadata["lastDetectedQueueMode"] != "ranked"
    }

    private fun canStartRequestedNormalFromModeSelect(state: ObservedState): Boolean {
        return false
    }

    private fun isModeSelectorOverlayVisible(state: ObservedState): Boolean {
        return state.metadata["modeVisualSelect"] == "true" ||
            state.metadata["reason"] == "android-frontend-mode-select-visual"
    }

    private fun canOpenRequestedNormalModeRoom(state: ObservedState): Boolean {
        // The Android start button shares the same hot zone on the home card and
        // in an already-created room. Only the launcher/home start card may be
        // used to open the room; unknown in-room starts still fail closed.
        val matchRoomState = state.metadata["matchRoomState"]
        val isHomeStart = matchRoomState == "home"
        return state.metadata["frontendState"] == "start-ready" &&
            state.metadata["requestedQueueMode"] == "normal" &&
            state.metadata["queueMode"] != "normal" &&
            state.metadata["detectedQueueMode"] != "ranked" &&
            isHomeStart
    }

    private fun rankedRoomRecoveryAction(state: ObservedState): ActionPlan? {
        if (state.metadata["requestedQueueMode"] != "normal") {
            return null
        }
        if (state.metadata["frontendState"] != "start-ready" || state.metadata["matchRoomState"] != "room") {
            return null
        }
        if (state.metadata["detectedQueueMode"] == "normal") {
            return null
        }
        if (state.metadata["queueMode"] == "normal" &&
            state.metadata["detectedQueueMode"] != "ranked" &&
            state.metadata["lastDetectedQueueMode"] != "ranked"
        ) {
            return null
        }
        if (state.metadata["detectedQueueMode"] == "ranked") {
            return ActionPlan(
                tick = 0,
                type = ActionType.SELECT_MODE,
                payload = mapOf("target" to "mode-room-selector", "queueMode" to "ranked"),
                priority = 123,
                reason = "Open Android TFT mode selector from ranked room before normal-only training"
            )
        }
        if (state.metadata["lastDetectedQueueMode"] == "ranked") {
            return ActionPlan(
                tick = 0,
                type = ActionType.RECOVER_BACK,
                payload = mapOf("target" to "ranked-room-back", "queueMode" to (state.metadata["detectedQueueMode"] ?: "")),
                priority = 123,
                reason = "Back out of Android TFT room after stale ranked evidence before normal-only training"
            )
        }
        return null
    }

    private fun modeSelectorNormalCardAction(state: ObservedState): ActionPlan? {
        if (state.metadata["requestedQueueMode"] != "normal") {
            return null
        }
        if (!isModeSelectorOverlayVisible(state)) {
            return null
        }
        if (state.metadata["detectedQueueMode"] != "normal") {
            return null
        }
        if (state.metadata["lastDetectedQueueMode"] == "ranked") {
            return null
        }
        return ActionPlan(
            tick = 0,
            type = ActionType.SELECT_MODE,
            payload = mapOf("target" to "normal-card", "queueMode" to "normal"),
            priority = 124,
            reason = "Select Android TFT normal card while mode selector is open before queue start"
        )
    }

    private fun normalHomeCardSelectAction(state: ObservedState): ActionPlan? {
        if (state.metadata["requestedQueueMode"] != "normal") {
            return null
        }
        if (state.metadata["frontendState"] != "start-ready" || state.metadata["matchRoomState"] == "room") {
            return null
        }
        if (state.metadata["homeNormalModeVisible"] != "true") {
            return null
        }
        if (state.metadata["queueMode"] == "normal" && state.metadata["detectedQueueMode"] == "normal") {
            return null
        }
        if (state.metadata["detectedQueueMode"] !in setOf("ranked", "normal") && state.metadata["queueMode"] != "normal") {
            return null
        }
        return ActionPlan(
            tick = 0,
            type = ActionType.SELECT_MODE,
            payload = mapOf("target" to "home-normal-card", "queueMode" to "normal"),
            priority = 123,
            reason = "Select visible Android TFT normal match card before normal-only training"
        )
    }

    private fun hasFullBenchWarning(state: ObservedState): Boolean {
        val text = listOf(
            state.metadata["shopRaw"],
            state.metadata["dialogRaw"],
            state.metadata["frontendRaw"]
        ).filterNotNull().joinToString(" ")
        return (text.contains("备战") || text.contains("備戰")) &&
            (text.contains("已满") || text.contains("已滿"))
    }

    private fun hasBlockingFullBenchWarning(state: ObservedState): Boolean {
        if (!isStageAtLeast(state.stageText, major = 2, minor = 1)) {
            return false
        }
        return state.metadata["benchFullState"] == "full" || hasFullBenchWarning(state)
    }

    private fun hasConfirmedFullBenchSellNeed(state: ObservedState): Boolean {
        if (!isStageAtLeast(state.stageText, major = 2, minor = 1)) {
            return false
        }
        if (hasFullBenchWarning(state)) {
            return true
        }
        return isStageAtLeast(state.stageText, major = 2, minor = 5) &&
            state.metadata["benchFullState"] == "full" &&
            state.metadata["shopOverlayState"] == "open"
    }

    private fun isBlockingFullBenchShopOverlay(state: ObservedState): Boolean {
        return state.metadata["shopOverlayState"] == "open" && hasBlockingFullBenchWarning(state)
    }

    private fun hasTrustedShopNames(state: ObservedState): Boolean {
        val source = state.metadata["shopSource"]
        if (source == "last-ocr" || source == "visual-fallback" || source == "last-visual-shop") {
            return false
        }
        return state.shop.any { offer ->
            val name = offer.unit?.name?.trim().orEmpty()
            name.isNotBlank() && !name.startsWith("商店位")
        }
    }

    private fun effectiveShopGold(state: ObservedState): Int {
        if (state.gold > 0) {
            return state.gold
        }
        return if (state.metadata["shopSource"] == "last-ocr-fresh") 1 else 0
    }

    private fun isSafeShopBuy(state: ObservedState, offer: ShopOffer): Boolean {
        val name = offer.unit?.name?.trim().orEmpty()
        if (name.isBlank() || name.startsWith("商店位")) {
            return false
        }
        if (state.metadata["combatState"] == "active" && isPostOpeningNeutralLootRound(state.stageText)) {
            return false
        }
        if (name in protectedBenchNames(state)) {
            return true
        }
        val cost = offer.cost ?: offer.unit?.cost ?: return false
        if (cost <= 2) {
            return true
        }
        if (isStageAtLeast(state.stageText, major = 4, minor = 1) && state.level >= 7) {
            return cost <= 3
        }
        return state.level >= 8 && state.gold >= 70 && cost <= 4
    }

    private fun trustedShopBuyActions(state: ObservedState): List<ActionPlan> {
        if (!hasTrustedShopNames(state)) {
            return emptyList()
        }
        val spendableGold = effectiveShopGold(state)
        return state.shop.filter { offer ->
            offer.unit?.name?.isNotBlank() == true &&
                (offer.cost ?: 0) <= spendableGold &&
                isSafeShopBuy(state, offer)
        }.sortedBy { it.slot }.map { targetOffer ->
            ActionPlan(
                tick = targetOffer.slot,
                type = ActionType.BUY,
                payload = mapOf("slot" to targetOffer.slot.toString(), "champion" to (targetOffer.unit?.name ?: "")),
                priority = 100,
                reason = "Buy affordable shop unit from Android MVP policy"
            )
        }
    }

    private fun shouldPrioritizeTrustedShopBuyBeforeCombatLoot(state: ObservedState): Boolean {
        return state.stageType == "NORMAL" &&
            state.metadata["combatState"] == "active" &&
            state.metadata["lootState"] == "visible" &&
            state.metadata["shopOverlayState"] == "open" &&
            hasNormalLootModeProof(state) &&
            !hasBlockingFullBenchWarning(state) &&
            state.metadata["sidePanelState"] != "open" &&
            state.metadata["reason"] != "android-side-panel-visual" &&
            isStageAtLeast(state.stageText, major = 2, minor = 2) &&
            !isNeutralLootRound(state.stageText)
    }

    private fun lootPickupAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || state.metadata["lootState"] != "visible") {
            return null
        }
        val queueMode = state.metadata["queueMode"] ?: ""
        val requestedQueueMode = state.metadata["requestedQueueMode"] ?: ""
        val detectedQueueMode = state.metadata["detectedQueueMode"] ?: ""
        val requestedNormalWithoutRankedEvidence = requestedQueueMode == "normal" && detectedQueueMode != "ranked"
        if (queueMode.isNotBlank() && queueMode != "normal" && !requestedNormalWithoutRankedEvidence) {
            return null
        }
        if (!isLootPickupStage(state.stageText)) {
            return null
        }
        if (isOpeningSharedEncounter(state)) {
            return null
        }
        if (state.metadata["sidePanelState"] == "open" || state.metadata["reason"] == "android-side-panel-visual") {
            return null
        }
        if (shouldSuppressLootDuringCombat(state)) {
            return null
        }
        val x = state.metadata["lootX"]?.toFloatOrNull()?.takeIf { it in 0.16f..0.88f } ?: return null
        val y = state.metadata["lootY"]?.toFloatOrNull()?.takeIf { it in 0.18f..0.84f } ?: return null
        if (
            state.metadata["sidePanelState"] == "open" &&
            state.metadata["reason"] == "android-side-panel-visual" &&
            isStageAtLeast(state.stageText, major = 2, minor = 2) &&
            !isNeutralLootRound(state.stageText) &&
            y < 0.42f
        ) {
            return null
        }
        if (isUnsafeTopHudLootTarget(x, y) || isUnsafeRightPanelLootTarget(state, x, y)) {
            return null
        }
        if (isShopCardCoveredLootTarget(state, x, y) && !isEarlyStageTwoUpperLeftLootWithShopOverlay(state, x, y)) {
            return null
        }
        if (isUpperLeftAwayBoardLootFalsePositive(state, x, y)) {
            return null
        }
        if (
            state.metadata["playerListState"] == "visible" &&
            !isBoardLocalLootTarget(state, x, y) &&
            !isLikelyOwnBoardCombatLoot(state, x, y) &&
            !isOwnBoardRightLootTarget(state, x, y)
        ) {
            return null
        }
        return ActionPlan(
            tick = 0,
            type = ActionType.PICK_LOOT,
            payload = mapOf("x" to x.toString(), "y" to y.toString()),
            priority = 105,
            reason = "Pick visible Android loot orb before shop/economy actions"
        )
    }

    private fun shouldSuppressLootDuringCombat(state: ObservedState): Boolean {
        if (!isActiveOrLikelyPvpCombat(state)) {
            return false
        }
        if (state.metadata["sidePanelState"] == "open" || state.metadata["reason"] == "android-side-panel-visual") {
            val x = state.metadata["lootX"]?.toFloatOrNull()
            val y = state.metadata["lootY"]?.toFloatOrNull()
            if (
                x != null &&
                y != null &&
                hasNormalLootModeProof(state) &&
                (isStageAtLeast(state.stageText, major = 2, minor = 2) || isStageOneNeutralLootRound(state.stageText)) &&
                isSafeSidePanelLootTarget(state, x, y)
            ) {
                return false
            }
            return true
        }
        if (
            hasBoardLocalLootTarget(state) &&
            (isPostOpeningNeutralLootRound(state.stageText) ||
                isStageOneNeutralLootRound(state.stageText) && hasNormalLootModeProof(state))
        ) {
            return false
        }
        val x = state.metadata["lootX"]?.toFloatOrNull()
        val y = state.metadata["lootY"]?.toFloatOrNull()
        if (x != null && y != null && isFastHudRightEventPanelLootFalsePositive(state, x, y)) {
            return true
        }
        if (x != null && y != null && isLateStageTwoOwnBoardLootWithShopOverlay(state, x, y)) {
            return false
        }
        if (x != null && y != null && isEarlyStageTwoOwnBoardLoot(state, x, y)) {
            return false
        }
        if (x != null && y != null && isEarlyStageTwoUpperLeftLootWithShopOverlay(state, x, y)) {
            return false
        }
        if (x != null && y != null && isCentralPvpCombatLootFalsePositive(state, x, y)) {
            return true
        }
        if (
            x != null &&
            y != null &&
            state.metadata["combatState"] == "active" &&
            state.metadata["shopOverlayState"] == "open" &&
            y >= 0.78f
        ) {
            return true
        }
        if (
            hasNormalLootModeProof(state) &&
            state.metadata["playerListState"] == "visible" &&
            hasBoardLocalLootTarget(state) &&
            isStageAtLeast(state.stageText, major = 2, minor = 2)
        ) {
            return false
        }
        if (x != null && y != null && isLikelyOwnBoardCombatLoot(state, x, y)) {
            return false
        }
        if (x != null && y != null && isOwnBoardRightLootTarget(state, x, y)) {
            return false
        }
        if (
            x != null &&
            y != null &&
            hasNormalLootModeProof(state) &&
            hasCurrentOwnBoardGoldHud(state) &&
            x <= 0.72f &&
            isBoardLocalLootTarget(x, y)
        ) {
            return false
        }
        if (state.metadata["combatState"] == "active") {
            return true
        }
        if (x != null && y != null && isBoardLocalLootTarget(x, y)) {
            return false
        }
        if (state.metadata["playerListState"] == "visible" && !hasCurrentOwnBoardGoldHud(state)) {
            return true
        }
        return isStageAtLeast(state.stageText, major = 2, minor = 1) &&
            state.metadata["shopOverlayState"] == "open" &&
            !hasCurrentOwnBoardGoldHud(state)
    }

    private fun isCentralPvpCombatLootFalsePositive(state: ObservedState, x: Float, y: Float): Boolean {
        return !isNeutralLootRound(state.stageText) &&
            !isStageOneNeutralLootRound(state.stageText) &&
            isStageAtLeast(state.stageText, major = 2, minor = 1) &&
            !isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            x in 0.38f..0.72f &&
            y in 0.42f..0.74f
    }

    private fun isLateStageTwoOwnBoardLootWithShopOverlay(state: ObservedState, x: Float, y: Float): Boolean {
        return hasNormalLootModeProof(state) &&
            hasCurrentOwnBoardGoldHud(state) &&
            state.metadata["reason"] == "android-fast-hud" &&
            state.metadata["combatState"] == "active" &&
            state.metadata["playerListState"] == "visible" &&
            state.metadata["shopOverlayState"] == "open" &&
            isStageAtLeast(state.stageText, major = 2, minor = 5) &&
            !isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            x in 0.48f..0.72f &&
            y in 0.62f..0.76f
    }

    private fun isEarlyStageTwoOwnBoardLoot(state: ObservedState, x: Float, y: Float): Boolean {
        return hasNormalLootModeProof(state) &&
            hasCurrentOwnBoardGoldHud(state) &&
            state.metadata["reason"] == "android-fast-hud" &&
            state.metadata["combatState"] == "active" &&
            state.metadata["playerListState"] == "visible" &&
            isStageAtLeast(state.stageText, major = 2, minor = 1) &&
            !isStageAtLeast(state.stageText, major = 2, minor = 5) &&
            x in 0.42f..0.72f &&
            y in 0.54f..0.74f
    }

    private fun isActiveOrLikelyPvpCombat(state: ObservedState): Boolean {
        if (state.metadata["combatState"] == "active") {
            return true
        }
        if (!isStageAtLeast(state.stageText, major = 2, minor = 1) || isNeutralLootRound(state.stageText)) {
            return false
        }
        if (state.metadata["reason"] != "android-fast-hud") {
            return false
        }
        if (hasCurrentOwnBoardGoldHud(state)) {
            return false
        }
        return state.metadata["playerListState"] == "visible" || state.metadata["shopOverlayState"] == "open"
    }

    private fun isUnsafeTopHudLootTarget(x: Float, y: Float): Boolean {
        return x >= 0.72f && y <= 0.34f
    }

    private fun isShopCardCoveredLootTarget(state: ObservedState, @Suppress("UNUSED_PARAMETER") x: Float, y: Float): Boolean {
        if (state.metadata["shopOverlayState"] != "open") {
            return false
        }
        return y < 0.40f
    }

    private fun isUnsafeRightPanelLootTarget(state: ObservedState, x: Float, y: Float): Boolean {
        if (isFastHudRightEventPanelLootFalsePositive(state, x, y)) {
            return true
        }
        if (isLikelyOwnBoardCombatLoot(state, x, y)) {
            return false
        }
        if (isOwnBoardRightLootTarget(state, x, y)) {
            return false
        }
        if (
            hasNormalLootModeProof(state) &&
            isStageAtLeast(state.stageText, major = 2, minor = 2) &&
            x in 0.74f..0.80f &&
            y in 0.52f..0.66f
        ) {
            return false
        }
        return x >= 0.74f && y in 0.40f..0.64f
    }

    private fun isFastHudRightEventPanelLootFalsePositive(state: ObservedState, x: Float, y: Float): Boolean {
        if (
            hasNormalLootModeProof(state) &&
            hasCurrentOwnBoardGoldHud(state) &&
            isStageAtLeast(state.stageText, major = 2, minor = 2) &&
            x in 0.74f..0.80f &&
            y in 0.54f..0.66f
        ) {
            return false
        }
        return hasNormalLootModeProof(state) &&
            state.metadata["reason"] == "android-fast-hud" &&
            state.metadata["combatState"] == "active" &&
            state.metadata["playerListState"] == "visible" &&
            state.metadata["shopOverlayState"] == "open" &&
            isStageAtLeast(state.stageText, major = 2, minor = 2) &&
            !isNeutralLootRound(state.stageText) &&
            x in 0.74f..0.80f &&
            y in 0.52f..0.66f
    }

    private fun isUpperLeftAwayBoardLootFalsePositive(state: ObservedState, x: Float, y: Float): Boolean {
        return state.metadata["reason"] == "android-fast-hud" &&
            state.metadata["shopOverlayState"] != "open" &&
            state.metadata["playerListState"] != "visible" &&
            !isNeutralLootRound(state.stageText) &&
            isStageAtLeast(state.stageText, major = 2, minor = 1) &&
            x < 0.58f &&
            y < 0.42f
    }

    private fun isBoardLocalLootTarget(x: Float, y: Float): Boolean {
        return x in 0.18f..0.80f && y >= 0.45f
    }

    private fun isBoardLocalLootTarget(state: ObservedState, x: Float, y: Float): Boolean {
        if (state.metadata["playerListState"] == "visible") {
            return (x in 0.18f..0.72f && y >= 0.45f) || isOwnBoardUpperLootTarget(state, x, y)
        }
        return isBoardLocalLootTarget(x, y)
    }

    private fun isOwnBoardUpperLootTarget(state: ObservedState, x: Float, y: Float): Boolean {
        return hasNormalLootModeProof(state) &&
            (hasCurrentOwnBoardGoldHud(state) || hasCurrentShopAndGoldHud(state)) &&
            x in 0.30f..0.78f &&
            y in 0.24f..0.44f
    }

    private fun isEarlyStageTwoUpperLeftLootWithShopOverlay(state: ObservedState, x: Float, y: Float): Boolean {
        return isOwnBoardUpperLootTarget(state, x, y) &&
            state.metadata["shopOverlayState"] == "open" &&
            state.metadata["playerListState"] == "visible" &&
            state.metadata["combatState"] == "active" &&
            isStageAtLeast(state.stageText, major = 2, minor = 1) &&
            !isStageAtLeast(state.stageText, major = 2, minor = 5) &&
            x in 0.30f..0.37f &&
            y in 0.30f..0.40f
    }

    private fun isUncoveredSidePanelLootTarget(x: Float, y: Float): Boolean {
        return x in 0.18f..0.58f && y in 0.42f..0.72f
    }

    private fun isUncoveredSidePanelLootTarget(state: ObservedState, x: Float, y: Float): Boolean {
        return isUncoveredSidePanelLootTarget(x, y) ||
            hasNormalLootModeProof(state) && x in 0.18f..0.72f && y in 0.42f..0.78f
    }

    private fun isSafeSidePanelLootTarget(state: ObservedState, x: Float, y: Float): Boolean {
        if (
            state.metadata["sidePanelState"] == "open" &&
            state.metadata["reason"] == "android-side-panel-visual" &&
            isStageAtLeast(state.stageText, major = 2, minor = 2) &&
            !isNeutralLootRound(state.stageText) &&
            y < 0.42f
        ) {
            return false
        }
        if (isOwnBoardUpperLootTarget(state, x, y)) {
            return true
        }
        if (
            state.metadata["sidePanelState"] != "open" &&
            state.metadata["reason"] != "android-side-panel-visual" &&
            isOwnBoardRightLootTarget(state, x, y)
        ) {
            return true
        }
        val shouldPickCentralSidePanelLoot = isStageAtLeast(state.stageText, major = 4, minor = 1) ||
            !isStageAtLeast(state.stageText, major = 3, minor = 5) && state.level <= 4 && state.gold < 50
        if (
            hasNormalLootModeProof(state) &&
            hasCurrentOwnBoardGoldHud(state) &&
            state.metadata["reason"] == "android-side-panel-visual" &&
            state.metadata["sidePanelState"] == "open" &&
            state.metadata["playerListState"] != "visible" &&
            shouldPickCentralSidePanelLoot &&
            isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            x in 0.42f..0.62f &&
            y in 0.48f..0.78f
        ) {
            return true
        }
        if (isStageThreeSidePanelAwayBoardCombat(state)) {
            return hasNormalLootModeProof(state) &&
                hasCurrentOwnBoardGoldHud(state) &&
                x in 0.48f..0.62f &&
                y in 0.68f..0.78f
        }
        if (
            hasNormalLootModeProof(state) &&
            hasCurrentOwnBoardGoldHud(state) &&
            state.metadata["reason"] == "android-side-panel-visual" &&
            state.metadata["sidePanelState"] == "open" &&
            isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            x in 0.72f..0.77f &&
            y in 0.48f..0.78f
        ) {
            return true
        }
        if (!isUncoveredSidePanelLootTarget(state, x, y)) {
            return false
        }
        if (isNeutralLootRound(state.stageText) || isStageOneNeutralLootRound(state.stageText)) {
            return true
        }
        if (
            hasNormalLootModeProof(state) &&
            hasCurrentOwnBoardGoldHud(state) &&
            state.metadata["sidePanelState"] != "open" &&
            isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            x in 0.42f..0.72f &&
            y in 0.48f..0.78f
        ) {
            return true
        }
        if (!hasCurrentOwnBoardGoldHud(state)) {
            return false
        }
        val rightBoardLimit = if (isStageAtLeast(state.stageText, major = 4, minor = 1)) 0.77f else 0.72f
        return x in 0.62f..rightBoardLimit && y in 0.48f..0.78f
    }

    private fun isStageThreeSidePanelAwayBoardCombat(state: ObservedState): Boolean {
        return state.metadata["combatState"] == "active" &&
            state.metadata["sidePanelState"] == "open" &&
            state.metadata["playerListState"] != "visible" &&
            state.metadata["shopOverlayState"] != "open" &&
            isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            !isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            !isNeutralLootRound(state.stageText)
    }

    private fun isLikelyOwnBoardCombatLoot(state: ObservedState, x: Float, y: Float): Boolean {
        return state.metadata["combatState"] == "active" &&
            state.metadata["sidePanelState"] != "open" &&
            state.metadata["shopOverlayState"] == "open" &&
            hasCurrentOwnBoardGoldHud(state) &&
            (isStageAtLeast(state.stageText, major = 3, minor = 1) ||
                isStageAtLeast(state.stageText, major = 2, minor = 5)) &&
            x in 0.68f..0.79f &&
            y in 0.45f..0.76f
    }

    private fun isOwnBoardRightLootTarget(state: ObservedState, x: Float, y: Float): Boolean {
        if (isFastHudRightEventPanelLootFalsePositive(state, x, y)) {
            return false
        }
        if (state.gold <= 0 && state.level < 4) {
            return false
        }
        if (
            hasNormalLootModeProof(state) &&
            isStageOneNeutralLootRound(state.stageText) &&
            x in 0.74f..0.80f &&
            y in 0.44f..0.54f
        ) {
            return true
        }
        if (
            hasNormalLootModeProof(state) &&
            hasCurrentOwnBoardGoldHud(state) &&
            state.metadata["shopOverlayState"] != "open" &&
            hasVerifiedNormalLootModeProof(state) &&
            isStageAtLeast(state.stageText, major = 2, minor = 2) &&
            x in 0.72f..0.80f &&
            y in 0.43f..0.52f
        ) {
            return true
        }
        if (
            hasNormalLootModeProof(state) &&
            isStageAtLeast(state.stageText, major = 2, minor = 2) &&
            x in 0.72f..0.80f &&
            y in 0.54f..0.66f
        ) {
            return true
        }
        if (
            hasNormalLootModeProof(state) &&
            hasCurrentOwnBoardGoldHud(state) &&
            isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            !isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            x in 0.74f..0.82f &&
            y in 0.66f..0.76f
        ) {
            return true
        }
        if (
            hasNormalLootModeProof(state) &&
            isStageAtLeast(state.stageText, major = 2, minor = 2) &&
            state.metadata["combatState"] != "active" &&
            hasCurrentOwnBoardGoldHud(state) &&
            x in 0.74f..0.80f &&
            y in 0.45f..0.54f
        ) {
            return true
        }
        return isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            x in 0.74f..0.80f &&
            y in 0.45f..0.66f
    }

    private fun isLootPickupStage(stageText: String): Boolean {
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(stageText) ?: return false
        val major = match.groupValues[1].toIntOrNull() ?: return false
        val minor = match.groupValues[2].toIntOrNull() ?: return false
        return major >= 1
    }

    private fun hasNormalLootModeProof(state: ObservedState): Boolean {
        val queueMode = state.metadata["queueMode"] ?: ""
        val requestedQueueMode = state.metadata["requestedQueueMode"] ?: ""
        val detectedQueueMode = state.metadata["detectedQueueMode"] ?: ""
        return queueMode == "normal" || requestedQueueMode == "normal" && detectedQueueMode != "ranked"
    }

    private fun hasVerifiedNormalLootModeProof(state: ObservedState): Boolean {
        return state.metadata["queueMode"] == "normal"
    }

    private fun hasConfirmedNormalModeProof(state: ObservedState): Boolean {
        return state.metadata["queueMode"] == "normal" || state.metadata["detectedQueueMode"] == "normal"
    }

    private fun hasVisibleChoiceProof(state: ObservedState): Boolean {
        val layout = state.metadata["augmentLayout"].orEmpty()
        return state.augments.isNotEmpty() &&
            state.metadata["reason"] == "android-augment-visual" &&
            layout in setOf("wide", "encounter", "gift", "item-choice")
    }

    private fun isOpeningSharedEncounter(state: ObservedState): Boolean {
        return state.stageText.trim() == "1-1" &&
            state.level <= 1 &&
            state.metadata["playerListState"] == "visible"
    }

    private fun isNeutralLootRound(stageText: String): Boolean {
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(stageText) ?: return false
        val major = match.groupValues[1].toIntOrNull() ?: return false
        val minor = match.groupValues[2].toIntOrNull() ?: return false
        return major == 1 || minor == 7
    }

    private fun isStageOneNeutralLootRound(stageText: String): Boolean {
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(stageText) ?: return false
        val major = match.groupValues[1].toIntOrNull() ?: return false
        return major == 1
    }

    private fun isPostOpeningNeutralLootRound(stageText: String): Boolean {
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(stageText) ?: return false
        val major = match.groupValues[1].toIntOrNull() ?: return false
        val minor = match.groupValues[2].toIntOrNull() ?: return false
        return major >= 2 && minor == 7
    }

    private fun visualEncounterChoiceFallbackActions(state: ObservedState): List<ActionPlan>? {
        if (state.stageType != "AUGMENT") {
            return null
        }
        if (state.augments.isNotEmpty()) {
            return null
        }
        if (state.metadata["reason"] != "android-augment-visual" || state.metadata["augmentLayout"] != "encounter") {
            return null
        }
        if (isSharedDraftVisualNoiseStage(state.stageText)) {
            return null
        }
        val primary = ActionPlan(
            tick = 0,
            type = ActionType.PICK_AUGMENT,
            payload = mapOf("slot" to "1", "layout" to "encounter"),
            priority = 109,
            reason = "Pick default Android encounter choice when visual layout is confirmed but OCR offers are missing"
        )
        return listOf(primary, confirmChoiceAction(priority = 108, reason = "Confirm selected Android encounter choice"))
    }

    private fun confirmChoiceAction(priority: Int, reason: String): ActionPlan {
        return ActionPlan(
            tick = 1,
            type = ActionType.PICK_AUGMENT,
            payload = mapOf("slot" to "1", "target" to "confirm-choice"),
            priority = priority,
            reason = reason
        )
    }

    private fun visualAugmentChoiceFallbackAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "AUGMENT") {
            return null
        }
        if (state.augments.isNotEmpty()) {
            return null
        }
        if (state.metadata["reason"] != "android-augment-visual") {
            return null
        }
        if (isSharedDraftVisualNoiseStage(state.stageText)) {
            return null
        }
        val layout = state.metadata["augmentLayout"].orEmpty()
        if (layout.isNotBlank() && layout != "wide") {
            return null
        }
        if (
            layout == "wide" &&
            (state.stageText.isBlank() || state.stageText == "?") &&
            state.level <= 1 &&
            state.gold <= 0 &&
            !hasNormalLootModeProof(state)
        ) {
            return null
        }
        if (layout.isBlank() && !hasNormalLootModeProof(state)) {
            return null
        }
        if (!state.metadata["frontendState"].isNullOrBlank() || !state.metadata["dialogState"].isNullOrBlank()) {
            return null
        }
        if (!state.metadata["resultState"].isNullOrBlank()) {
            return null
        }
        return ActionPlan(
            tick = 0,
            type = ActionType.PICK_AUGMENT,
            payload = mapOf("slot" to "2", "layout" to "wide"),
            priority = 109,
            reason = "Pick default Android augment choice when visual layout is confirmed but OCR offers are missing"
        )
    }

    private fun returnHomeAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || state.metadata["playerListState"] != "visible") {
            return null
        }
        if (hasCurrentOwnBoardGoldHud(state)) {
            return null
        }
        if (state.metadata["combatState"] == "active" || state.metadata["lootState"] == "visible") {
            return null
        }
        if (!isStageAtLeast(state.stageText, major = 2, minor = 1)) {
            return null
        }
        if (isPlainPlayerListOnly(state)) {
            return null
        }
        if (state.metadata["shopOverlayState"] == "open") {
            return null
        }
        if (state.metadata["augmentLayout"] == "item-choice" || state.augments.isNotEmpty()) {
            return null
        }
        return ActionPlan(
            tick = 0,
            type = ActionType.RETURN_HOME,
            payload = mapOf("target" to "own-player-row"),
            priority = 96,
            reason = "Return to own Android board when no higher-value local action is pending"
        )
    }

    private fun returnHomeGuardAction(guard: String): ActionPlan {
        return ActionPlan(
            tick = 0,
            type = ActionType.RETURN_HOME,
            payload = mapOf("target" to "own-player-row", "guard" to guard),
            priority = 117,
            reason = "Return to own Android board before running gameplay actions"
        )
    }

    private fun returnHomeFromStageThreeCombatPlayerListAction(state: ObservedState): ActionPlan? {
        if (
            state.metadata["reason"] != "android-fast-hud" ||
            state.metadata["combatState"] != "active" ||
            !hasNormalLootModeProof(state) ||
            !hasCurrentOwnBoardGoldHud(state) ||
            !isStageAtLeast(state.stageText, major = 3, minor = 1) ||
            isStageAtLeast(state.stageText, major = 4, minor = 1) ||
            isNeutralLootRound(state.stageText) ||
            state.metadata["augmentLayout"] == "item-choice" ||
            state.augments.isNotEmpty() ||
            !state.metadata["frontendState"].isNullOrBlank() ||
            !state.metadata["dialogState"].isNullOrBlank() ||
            !state.metadata["resultState"].isNullOrBlank()
        ) {
            return null
        }
        val x = state.metadata["lootX"]?.toFloatOrNull()
        val y = state.metadata["lootY"]?.toFloatOrNull()
        if (state.metadata["lootState"] != "visible" || x == null || y == null) {
            return returnHomeGuardAction("stage-three-combat-player-list")
        }
        if (x in 0.42f..0.72f && y in 0.42f..0.56f) {
            return returnHomeGuardAction("stage-three-combat-player-list-mid-board")
        }
        return null
    }

    private fun returnHomeFromStageTwoAwayBoardAction(state: ObservedState): ActionPlan? {
        if (
            state.metadata["reason"] != "android-fast-hud" ||
            state.metadata["playerListState"] != "visible" ||
            state.metadata["shopOverlayState"] == "open" ||
            state.metadata["sidePanelState"] == "open" ||
            !isStageAtLeast(state.stageText, major = 2, minor = 4) ||
            isStageAtLeast(state.stageText, major = 3, minor = 1) ||
            state.metadata["augmentLayout"] == "item-choice" ||
            state.augments.isNotEmpty() ||
            !state.metadata["frontendState"].isNullOrBlank() ||
            !state.metadata["dialogState"].isNullOrBlank() ||
            !state.metadata["resultState"].isNullOrBlank()
        ) {
            return null
        }
        if (hasCurrentOwnBoardGoldHud(state)) {
            return null
        }
        val x = state.metadata["lootX"]?.toFloatOrNull() ?: return null
        val y = state.metadata["lootY"]?.toFloatOrNull() ?: return null
        if (
            state.metadata["combatState"] != "active" ||
            state.metadata["lootState"] != "visible" ||
            x !in 0.45f..0.70f ||
            y !in 0.42f..0.56f
        ) {
            return null
        }
        return returnHomeGuardAction("stage-two-away-board-player-list")
    }

    private fun closeSidePanelAction(guard: String, target: String = "side-panel-back"): ActionPlan {
        return ActionPlan(
            tick = 0,
            type = ActionType.DISMISS_DIALOG,
            payload = mapOf("target" to target, "guard" to guard),
            priority = 115,
            reason = "Close Android side detail panel before gameplay actions"
        )
    }

    private fun canBypassStaleSidePanelForTempoLevel(state: ObservedState): Boolean {
        return state.metadata["reason"] == "android-fast-hud" &&
            state.metadata["shopOverlayState"] == "open" &&
            forcedLateTempoLevelAction(state) != null
    }

    private fun canCloseSidePanelWithBoardTap(state: ObservedState): Boolean {
        if (state.stageType != "NORMAL" || state.metadata["reason"] != "android-side-panel-visual") {
            return false
        }
        if (state.metadata["lootState"] != "visible") {
            return false
        }
        if (
            state.metadata["shopOverlayState"] != "open" &&
            state.metadata["playerListState"] != "visible" &&
            state.metadata["frontendState"].isNullOrBlank() &&
            state.metadata["dialogState"].isNullOrBlank() &&
            state.metadata["resultState"].isNullOrBlank() &&
            state.level <= 1 &&
            state.gold <= 2 &&
            (state.stageText.trim() == "1-2" || state.stageText.trim() == "1-3")
        ) {
            return true
        }
        val lootX = state.metadata["lootX"]?.toFloatOrNull()
        val lootY = state.metadata["lootY"]?.toFloatOrNull()
        return isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            state.gold >= 80 &&
            state.level in 6..7 &&
            state.metadata["requestedQueueMode"] == "normal" &&
            state.metadata["detectedQueueMode"] != "ranked" &&
            state.metadata["combatState"] == "active" &&
            state.metadata["shopOverlayState"] != "open" &&
            state.metadata["frontendState"].isNullOrBlank() &&
            state.metadata["dialogState"].isNullOrBlank() &&
            state.metadata["resultState"].isNullOrBlank() &&
            lootX != null &&
            lootY != null &&
            lootX in 0.52f..0.76f &&
            lootY in 0.58f..0.76f
    }

    private fun shouldCloseBlockingSidePanel(state: ObservedState): Boolean {
        val lootY = state.metadata["lootY"]?.toFloatOrNull()
        val lootX = state.metadata["lootX"]?.toFloatOrNull()
        val stageFourHighEconomyPanel = isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            state.level >= 7 &&
            state.gold >= 50 &&
            (lootY == null || lootY >= 0.65f || lootX != null && lootX >= 0.62f)
        return state.stageType == "NORMAL" &&
            state.metadata["reason"] == "android-side-panel-visual" &&
            state.metadata["sidePanelState"] == "open" &&
            hasNormalLootModeProof(state) &&
            hasCurrentOwnBoardGoldHud(state) &&
            state.metadata["combatState"] == "active" &&
            stageFourHighEconomyPanel &&
            state.metadata["frontendState"].isNullOrBlank() &&
            state.metadata["dialogState"].isNullOrBlank() &&
            state.metadata["resultState"].isNullOrBlank()
    }

    private fun shouldCloseConfirmedNormalSidePanelWithBack(state: ObservedState): Boolean {
        val stageTwoConfirmedPanel = isStageAtLeast(state.stageText, major = 2, minor = 2) &&
            !isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            state.gold >= 10
        val lateStageThreeEconomyPanel = isStageAtLeast(state.stageText, major = 3, minor = 5) &&
            !isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            state.level >= 7 &&
            state.gold >= 35
        return state.stageType == "NORMAL" &&
            state.metadata["reason"] == "android-side-panel-visual" &&
            state.metadata["sidePanelState"] == "open" &&
            hasNormalLootModeProof(state) &&
            (stageTwoConfirmedPanel || lateStageThreeEconomyPanel) &&
            state.metadata["augmentLayout"] != "item-choice" &&
            state.augments.isEmpty() &&
            state.metadata["frontendState"].isNullOrBlank() &&
            state.metadata["dialogState"].isNullOrBlank() &&
            state.metadata["resultState"].isNullOrBlank()
    }

    private fun shouldCloseEarlyStageTwoLowGoldPanelStall(state: ObservedState): Boolean {
        val confirmedEarlyLowGold = state.metadata["queueMode"] == "normal" &&
            state.metadata["detectedQueueMode"] == "normal" &&
            state.level <= 3 &&
            state.gold in 8..9 &&
            isStageAtLeast(state.stageText, major = 2, minor = 2) &&
            !isStageAtLeast(state.stageText, major = 2, minor = 5)
        val requestedStageTwoSevenMidGold = state.metadata["requestedQueueMode"] == "normal" &&
            state.metadata["detectedQueueMode"] != "ranked" &&
            state.level <= 5 &&
            state.gold in 20..39 &&
            state.stageText.trim() == "2-7"
        return state.metadata["reason"] == "android-side-panel-visual" &&
            state.metadata["sidePanelState"] == "open" &&
            state.metadata["lootState"] != "visible" &&
            hasCurrentOwnBoardGoldHud(state) &&
            (confirmedEarlyLowGold || requestedStageTwoSevenMidGold)
    }

    private fun isStageThreeSidePanelRightLootStall(state: ObservedState): Boolean {
        val x = state.metadata["lootX"]?.toFloatOrNull() ?: return false
        val y = state.metadata["lootY"]?.toFloatOrNull() ?: return false
        return state.metadata["lootState"] == "visible" &&
            isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            !isStageAtLeast(state.stageText, major = 3, minor = 6) &&
            state.level >= 5 &&
            state.gold >= 40 &&
            x in 0.72f..0.80f &&
            y in 0.48f..0.66f
    }

    private fun suspectedAwayBoardReturnHomeAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || state.metadata["playerListState"] != "visible") {
            return null
        }
        if (hasCurrentOwnBoardGoldHud(state)) {
            return null
        }
        val lootX = state.metadata["lootX"]?.toFloatOrNull()
        val lootY = state.metadata["lootY"]?.toFloatOrNull()
        if (lootX != null && lootY != null && isFastHudRightEventPanelLootFalsePositive(state, lootX, lootY)) {
            return null
        }
        if (
            isStageAtLeast(state.stageText, major = 2, minor = 1) &&
            !isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            state.level <= 1 &&
            state.gold <= 0 &&
            state.metadata["lootState"] == "visible"
        ) {
            return null
        }
        if (
            lootX != null &&
            lootY != null &&
            state.metadata["lootState"] == "visible" &&
            hasCurrentOwnBoardGoldHud(state) &&
            hasNormalLootModeProof(state) &&
            isUnsafeTopHudLootTarget(lootX, lootY)
        ) {
            return null
        }
        if (
            lootX != null &&
            lootY != null &&
            isOwnBoardRightLootTarget(state, lootX, lootY) &&
            !isStageThreeAwayBoardRightRailLootNoise(state, lootX, lootY)
        ) {
            return null
        }
        if (
            state.metadata["combatState"] == "active" &&
            state.metadata["shopOverlayState"] == "open" &&
            isStageAtLeast(state.stageText, major = 2, minor = 1) &&
            !isNeutralLootRound(state.stageText) &&
            state.metadata["augmentLayout"] != "item-choice" &&
            state.augments.isEmpty()
        ) {
            if (lootX != null && lootY != null && isStageThreeAwayBoardRightRailLootNoise(state, lootX, lootY)) {
                return returnHomeGuardAction("stage-three-away-board-right-rail")
            }
            if ((hasCurrentOwnBoardGoldHud(state) || hasCurrentShopAndGoldHud(state) && state.metadata["goldSource"] != "last-stable") && state.metadata["lootState"] != "visible") {
                return null
            }
            if (hasNormalLootModeProof(state) && (hasBoardLocalLootTarget(state) || hasLikelyOwnBoardCombatLoot(state))) {
                return null
            }
            return returnHomeGuardAction("combat-shop-player-list")
        }
        if (
            state.metadata["combatState"] == "active" &&
            state.metadata["shopOverlayState"] != "open" &&
            isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            !isNeutralLootRound(state.stageText) &&
            state.metadata["augmentLayout"] != "item-choice" &&
            state.augments.isEmpty()
        ) {
            if (hasLateCombatBoardLootTarget(state)) {
                return null
            }
            return returnHomeGuardAction("late-combat-player-list")
        }
        if (
            state.metadata["combatState"] == "active" &&
            state.metadata["shopOverlayState"] != "open" &&
            isStageAtLeast(state.stageText, major = 2, minor = 1) &&
            state.metadata["augmentLayout"] != "item-choice" &&
            state.augments.isEmpty() &&
            !hasBoardLocalLootTarget(state)
        ) {
            if (lootX != null && lootY != null && isStageThreeAwayBoardRightRailLootNoise(state, lootX, lootY)) {
                return returnHomeGuardAction("stage-three-away-board-right-rail")
            }
            if (
                isStageAtLeast(state.stageText, major = 2, minor = 1) &&
                !isStageAtLeast(state.stageText, major = 3, minor = 1) &&
                hasCurrentOwnBoardGoldHud(state) &&
                state.metadata["lootState"] == "visible" &&
                lootY != null &&
                lootY >= 0.48f
            ) {
                return null
            }
            if (hasCurrentOwnBoardGoldHud(state) && state.metadata["lootState"] != "visible") {
                return null
            }
            return returnHomeGuardAction("combat-player-list")
        }
        if (state.metadata["sidePanelState"] == "open") {
            return null
        }
        if (state.metadata["shopOverlayState"] == "open" && (hasCurrentOwnBoardGoldHud(state) || hasCurrentShopAndGoldHud(state) && state.metadata["goldSource"] != "last-stable")) {
            return null
        }
        if (state.metadata["lootState"] == "visible") {
            val x = state.metadata["lootX"]?.toFloatOrNull()
            val y = state.metadata["lootY"]?.toFloatOrNull()
            if (
                x != null &&
                y != null &&
                (isBoardLocalLootTarget(state, x, y) || isOwnBoardRightLootTarget(state, x, y))
            ) {
                return null
            }
        }
        if (!isStageAtLeast(state.stageText, major = 2, minor = 1)) {
            return null
        }
        if (state.metadata["augmentLayout"] == "item-choice" || state.augments.isNotEmpty()) {
            return null
        }
        if (state.metadata["reason"] != "android-fast-hud") {
            return null
        }
        if (isPlainPlayerListOnly(state)) {
            return null
        }
        return returnHomeGuardAction("suspected-away-board")
    }

    private fun isStageThreeAwayBoardRightRailLootNoise(state: ObservedState, x: Float, y: Float): Boolean {
        return state.metadata["reason"] == "android-fast-hud" &&
            state.metadata["playerListState"] == "visible" &&
            state.metadata["combatState"] == "active" &&
            hasNormalLootModeProof(state) &&
            isStageAtLeast(state.stageText, major = 3, minor = 1) &&
            !isStageAtLeast(state.stageText, major = 4, minor = 1) &&
            x in 0.72f..0.74f &&
            y in 0.54f..0.66f
    }

    private fun isPlainPlayerListOnly(state: ObservedState): Boolean {
        return state.metadata["playerListState"] == "visible" &&
            state.metadata["combatState"] != "active" &&
            state.metadata["lootState"] != "visible" &&
            state.metadata["shopOverlayState"] != "open"
    }

    private fun hasBoardLocalLootTarget(state: ObservedState): Boolean {
        val x = state.metadata["lootX"]?.toFloatOrNull()
        val y = state.metadata["lootY"]?.toFloatOrNull()
        return x != null && y != null && isBoardLocalLootTarget(state, x, y)
    }

    private fun hasLikelyOwnBoardCombatLoot(state: ObservedState): Boolean {
        val x = state.metadata["lootX"]?.toFloatOrNull()
        val y = state.metadata["lootY"]?.toFloatOrNull()
        return x != null && y != null && isLikelyOwnBoardCombatLoot(state, x, y)
    }

    private fun hasLateCombatBoardLootTarget(state: ObservedState): Boolean {
        val x = state.metadata["lootX"]?.toFloatOrNull()
        val y = state.metadata["lootY"]?.toFloatOrNull()
        if (x == null || y == null) {
            return false
        }
        if (isLikelyOwnBoardCombatLoot(state, x, y) || isOwnBoardRightLootTarget(state, x, y)) {
            return true
        }
        return hasNormalLootModeProof(state) &&
            (x in 0.18f..0.72f && y >= 0.56f ||
                isStageAtLeast(state.stageText, major = 4, minor = 1) && x in 0.45f..0.72f && y >= 0.46f)
    }

    private fun hasCurrentOwnBoardGoldHud(state: ObservedState): Boolean {
        return state.gold > 0 && state.metadata["goldSource"] != "last-stable"
    }

    private fun hasCurrentShopAndGoldHud(state: ObservedState): Boolean {
        return state.gold > 0 && state.metadata["shopOverlayState"] == "open" && state.shop.isNotEmpty()
    }

    private fun shouldPrioritizeAnvilBeforeLoot(state: ObservedState): Boolean {
        return state.metadata["anvilState"] == "visible" &&
            state.metadata["lootState"] == "visible" &&
            state.metadata["sidePanelState"] != "open" &&
            state.metadata["reason"] != "android-side-panel-visual" &&
            isStageAtLeast(state.stageText, major = 2, minor = 5) &&
            !isNeutralLootRound(state.stageText)
    }

    private fun prioritized(actions: List<ActionPlan>): List<ActionPlan> {
        return actions.sortedWith(compareByDescending<ActionPlan> { it.priority }.thenBy { it.tick })
    }

    private fun anvilAction(state: ObservedState): ActionPlan? {
        if (state.stageType != "NORMAL" || state.metadata["anvilState"] != "visible") {
            return null
        }
        if (!isStageAtLeast(state.stageText, major = 2, minor = 1) || isOpeningSharedEncounter(state)) {
            return null
        }
        val x = state.metadata["anvilX"]?.toFloatOrNull()?.takeIf { it in 0.12f..0.92f } ?: return null
        val y = state.metadata["anvilY"]?.toFloatOrNull()?.takeIf { it in 0.80f..0.95f } ?: return null
        return ActionPlan(
            tick = 0,
            type = ActionType.USE_ANVIL,
            payload = mapOf("x" to x.toString(), "y" to y.toString()),
            priority = 104,
            reason = "Open visible Android item anvil before shop/economy actions"
        )
    }

    private fun isQueueAutomationFrontend(frontendState: String?): Boolean {
        return frontendState == "start-ready" || frontendState == "accept-ready" || frontendState == "mode-select"
    }

    private fun hasCrowdedBench(state: ObservedState): Boolean {
        return state.bench.size >= 8 ||
            state.metadata["benchState"] == "full" ||
            state.metadata["benchFullState"] == "full" ||
            hasFullBenchWarning(state)
    }

    private fun hasTrustedBenchNames(state: ObservedState): Boolean {
        val source = state.metadata["benchSource"].orEmpty()
        return source == "ocr" || source == "manual" || source == "trusted"
    }

    private fun protectedBenchNames(state: ObservedState): Set<String> {
        val configured = listOf(
            state.metadata["keepUnits"],
            state.metadata["preferredUnits"],
            state.metadata["targetCompUnits"]
        ).filterNotNull()
            .flatMap { value -> value.split(',', '，', '|', '/', ' ') }
            .map { it.trim() }
            .filter { it.isNotBlank() }
        val boardNames = state.board.map { it.name.trim() }.filter { it.isNotBlank() }
        return (configured + boardNames).toSet()
    }

    private fun benchSlotOf(location: String?): Int? {
        return Regex("""(\d+)""").find(location.orEmpty())?.groupValues?.getOrNull(1)?.toIntOrNull()?.coerceIn(1, 9)
    }

    private fun isChoiceStage(stageText: String): Boolean {
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(stageText) ?: return false
        val major = match.groupValues[1].toIntOrNull() ?: return false
        val minor = match.groupValues[2].toIntOrNull() ?: return false
        return when (major) {
            2 -> minor == 1 || minor == 4
            3 -> minor == 2 || minor == 4
            4 -> minor == 2
            5 -> minor == 1
            else -> false
        }
    }

    private fun isSharedDraftVisualNoiseStage(stageText: String): Boolean {
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(stageText) ?: return false
        val major = match.groupValues[1].toIntOrNull() ?: return false
        val minor = match.groupValues[2].toIntOrNull() ?: return false
        return major >= 2 && minor == 4
    }

    private fun isPostKrugsStage(stageText: String): Boolean {
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(stageText) ?: return false
        val major = match.groupValues[1].toIntOrNull() ?: return false
        val minor = match.groupValues[2].toIntOrNull() ?: return false
        return major > 3 || major == 3 && minor >= 1
    }

}

class AndroidExecutionPlanner {
    fun build(actions: List<ActionPlan>): List<ExecutionStep> {
        return actions.sortedWith(compareByDescending<ActionPlan> { it.priority }.thenBy { it.tick })
            .mapIndexed { index, action ->
                when (action.type) {
                    ActionType.BUY -> {
                        val slot = action.payload["slot"]?.toIntOrNull()?.coerceIn(1, 5) ?: 1
                        ExecutionStep(
                            index = index,
                            type = action.type,
                            point = shopPoint(slot),
                            description = "Tap shop slot $slot",
                            reason = action.reason
                        )
                    }
                    ActionType.MOVE -> {
                        val fromSlot = action.payload["fromBenchSlot"]?.toIntOrNull()?.coerceIn(1, 6) ?: 1
                        val toSlot = action.payload["toBoardSlot"]?.toIntOrNull()?.coerceIn(1, 6) ?: 1
                        ExecutionStep(index, action.type, null, benchPoint(fromSlot), boardPoint(toSlot), "Deploy bench slot $fromSlot", action.reason)
                    }
                    ActionType.EQUIP -> {
                        val itemSlot = action.payload["itemSlot"]?.toIntOrNull()?.coerceIn(1, 5) ?: 1
                        ExecutionStep(index, action.type, null, itemPoint(itemSlot), boardCarryPoint(), "Equip item slot $itemSlot", action.reason)
                    }
                    ActionType.SELL -> {
                        val benchSlot = action.payload["benchSlot"]?.toIntOrNull()?.coerceIn(1, 9) ?: 9
                        ExecutionStep(index, action.type, null, benchPoint(benchSlot), sellPoint(), "Sell bench slot $benchSlot", action.reason)
                    }
                    ActionType.USE_ANVIL -> {
                        val x = action.payload["x"]?.toFloatOrNull()?.coerceIn(0.12f, 0.92f) ?: 0.18f
                        val y = action.payload["y"]?.toFloatOrNull()?.coerceIn(0.80f, 0.95f) ?: 0.88f
                        ExecutionStep(index, action.type, null, PointF01(x, y), PointF01(0.50f, 0.32f), "Drag item anvil to shop", action.reason)
                    }
                    ActionType.ROLL -> ExecutionStep(index, action.type, PointF01(0.88f, 0.70f), null, null, "Refresh shop", action.reason)
                    ActionType.LEVEL_UP -> ExecutionStep(index, action.type, PointF01(0.075f, 0.885f), null, null, "Buy XP", action.reason)
                    ActionType.PICK_AUGMENT -> {
                        val slot = action.payload["slot"]?.toIntOrNull()?.coerceIn(1, 3) ?: 2
                        val isEncounter = action.payload["layout"] == "encounter"
                        val isItemChoice = action.payload["layout"] == "item-choice"
                        val isGift = action.payload["layout"] == "gift"
                        if (action.payload["target"] == "confirm-choice") {
                            return@mapIndexed ExecutionStep(index, action.type, PointF01(0.93f, 0.90f), null, null, "Confirm augment choice", action.reason)
                        }
                        val x = if (isItemChoice) {
                            when (slot) {
                                2 -> 0.47f
                                3 -> 0.65f
                                else -> 0.30f
                            }
                        } else if (isEncounter || isGift) {
                            when (slot) {
                                1 -> 0.38f
                                3 -> 0.74f
                                else -> 0.56f
                            }
                        } else {
                            when (slot) {
                                1 -> 0.35f
                                3 -> 0.65f
                                else -> 0.50f
                            }
                        }
                        val y = if (isItemChoice) {
                            0.36f
                        } else if (isGift) {
                            0.28f
                        } else if (isEncounter) {
                            0.50f
                        } else if (action.payload["layout"] == "wide") {
                            0.60f
                        } else {
                            0.36f
                        }
                        ExecutionStep(index, action.type, PointF01(x, y), null, null, "Pick augment slot $slot", action.reason)
                    }
                    ActionType.PICK_LOOT -> {
                        val x = action.payload["x"]?.toFloatOrNull()?.coerceIn(0.16f, 0.88f) ?: 0.50f
                        val y = action.payload["y"]?.toFloatOrNull()?.coerceIn(0.18f, 0.84f) ?: 0.60f
                        ExecutionStep(index, action.type, PointF01(x, y), null, null, "Pick loot orb", action.reason)
                    }
                    ActionType.OPEN_MODE_ROOM -> ExecutionStep(index, action.type, PointF01(0.875f, 0.90f), null, null, "Open TFT match room", action.reason)
                    ActionType.START_GAME -> ExecutionStep(index, action.type, PointF01(0.875f, 0.90f), null, null, "Start TFT match", action.reason)
                    ActionType.START_UPDATE -> ExecutionStep(index, action.type, PointF01(0.50f, 0.80f), null, null, "Start TFT version update", action.reason)
                    ActionType.SELECT_MODE -> {
                        val target = action.payload["target"]
                        val point = when (target) {
                            "mode-room-selector" -> PointF01(0.22f, 0.05f)
                            "normal-card" -> PointF01(0.35f, 0.54f)
                            else -> PointF01(0.35f, 0.66f)
                        }
                        val description = if (target == "mode-room-selector") "Open mode selector" else "Select match mode"
                        ExecutionStep(index, action.type, point, null, null, description, action.reason)
                    }
                    ActionType.ACCEPT_QUEUE -> ExecutionStep(index, action.type, PointF01(0.50f, 0.76f), null, null, "Accept ready check", action.reason)
                    ActionType.RECOVER_BACK -> ExecutionStep(index, action.type, PointF01(0.08f, 0.05f), null, null, "Back out of match room", action.reason)
                    ActionType.DISMISS_DIALOG -> {
                        val target = action.payload["target"]
                        val point = when (target) {
                            "side-panel-global-back" -> null
                            "settings-global-back" -> null
                            "mode-room-customization-back" -> null
                            "settings-close" -> PointF01(0.80f, 0.15f)
                            "side-panel-back" -> PointF01(0.85f, 0.26f)
                            "side-panel" -> PointF01(0.50f, 0.42f)
                            "dialog-positive-right" -> PointF01(0.55f, 0.62f)
                            else -> PointF01(0.50f, 0.62f)
                        }
                        val description = if (target == "side-panel-global-back") {
                            "Close side panel with Android Back"
                        } else if (target == "settings-global-back") {
                            "Close settings with Android Back"
                        } else if (target == "mode-room-customization-back") {
                            "Close match room customization panel with Android Back"
                        } else if (target == "settings-close") {
                            "Close settings"
                        } else if (target?.startsWith("side-panel") == true) {
                            "Close side panel"
                        } else if (target == "dialog-positive-right") {
                            "Tap dialog positive button"
                        } else {
                            "Dismiss dialog"
                        }
                        ExecutionStep(index, action.type, point, null, null, description, action.reason)
                    }
                    ActionType.RETURN_HOME -> ExecutionStep(index, action.type, PointF01(0.93f, 0.88f), null, null, "Return to own board", action.reason)
                    ActionType.EXIT_RESULT -> {
                        val resultLayout = action.payload["resultLayout"]
                        val resultProof = action.payload["resultProof"]
                        val point = if (
                            resultLayout == "scoreboard" ||
                            resultProof.isNullOrBlank() ||
                            resultProof == "visual-frontend-long-stable"
                        ) {
                            PointF01(0.84f, 0.90f)
                        } else {
                            PointF01(0.50f, 0.63f)
                        }
                        ExecutionStep(index, action.type, point, null, null, "Exit result screen", action.reason)
                    }
                    ActionType.RESTART_TFT -> ExecutionStep(index, action.type, null, null, null, "Bring TFT to foreground", action.reason)
                    else -> ExecutionStep(index, ActionType.NOOP, null, null, null, "Unsupported action in Android MVP", action.reason)
                }
            }
    }

    private fun benchPoint(slot: Int): PointF01 {
        val x = when (slot) {
            1 -> 0.18f
            2 -> 0.26f
            3 -> 0.35f
            4 -> 0.44f
            5 -> 0.54f
            6 -> 0.64f
            7 -> 0.73f
            8 -> 0.82f
            else -> 0.90f
        }
        return PointF01(x, 0.88f)
    }

    private fun boardPoint(slot: Int): PointF01 {
        val x = when (slot) {
            1 -> 0.46f
            2 -> 0.54f
            3 -> 0.62f
            4 -> 0.70f
            5 -> 0.38f
            else -> 0.78f
        }
        return PointF01(x, 0.68f)
    }

    private fun boardCarryPoint(): PointF01 = PointF01(0.56f, 0.68f)

    private fun sellPoint(): PointF01 = PointF01(0.56f, 0.35f)

    private fun itemPoint(slot: Int): PointF01 {
        val y = when (slot) {
            1 -> 0.17f
            2 -> 0.31f
            3 -> 0.45f
            4 -> 0.58f
            else -> 0.70f
        }
        return PointF01(0.04f, y)
    }

    private fun shopPoint(slot: Int): PointF01 {
        val x = when (slot) {
            1 -> 0.21f
            2 -> 0.39f
            3 -> 0.56f
            4 -> 0.73f
            else -> 0.91f
        }
        return PointF01(x, 0.35f)
    }
}
