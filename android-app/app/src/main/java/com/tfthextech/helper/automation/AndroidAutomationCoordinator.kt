package com.tfthextech.helper.automation

import android.graphics.Bitmap
import android.util.Log
import com.tfthextech.helper.capture.ScreenCaptureRepository
import com.tfthextech.helper.input.TftAccessibilityService
import com.tfthextech.helper.protocol.ActionPlan
import com.tfthextech.helper.protocol.ActionType
import com.tfthextech.helper.protocol.AutomationSnapshot
import com.tfthextech.helper.protocol.ExecutionStep
import com.tfthextech.helper.protocol.ObservedState
import com.tfthextech.helper.vision.FrameObserver
import com.tfthextech.helper.vision.StubFrameObserver

class AndroidAutomationCoordinator(
    private val captureRepository: ScreenCaptureRepository,
    private val observer: FrameObserver = StubFrameObserver(),
    private val policy: AndroidRulePolicy = AndroidRulePolicy(),
    private val planner: AndroidExecutionPlanner = AndroidExecutionPlanner(),
    private val verifier: AndroidActionVerifier = AndroidActionVerifier(),
    private var appRecovery: AndroidTftAppRecovery = NoopAndroidTftAppRecovery
) {
    var enabled: Boolean = false
        private set
    var dryRun: Boolean = true
        private set
    private var lastSnapshot: AutomationSnapshot = AutomationSnapshot(false, true, null, emptyList(), emptyList(), "idle")
    private var lastExecutionAtMs: Long = 0L
    private var lastExecutionSignature: String = ""
    private var repeatedExecutionCount: Int = 0
    private var pendingAction: PendingAndroidAction? = null
    private var dialogConfirmCount: Int = 0
    private var firstDialogConfirmAtMs: Long = 0L
    private var restartAfterDialog: Boolean = false
    private var lastTraceSignature: String = ""
    private var lastGlobalBackDialogAtMs: Long = 0L
    private var lastSettingsDialogCloseAtMs: Long = 0L
    private var blockedBuySignature: String = ""
    private var blockedBuyUntilMs: Long = 0L
    private val blockedDragUntilBySignature: MutableMap<String, Long> = mutableMapOf()
    private val blockedLootByBucket: MutableMap<String, MutableList<LootBucketHit>> = mutableMapOf()
    private var blockedLevelUpSignature: String = ""
    private var blockedLevelUpUntilMs: Long = 0L
    private var blockedUpdateUntilMs: Long = 0L
    private var consecutiveUpdateVerifyFailures: Int = 0
    private var blockedReturnHomeUntilMs: Long = 0L
    private var blockedAnvilSignature: String = ""
    private var blockedAnvilUntilMs: Long = 0L
    private var blockedChoiceSignature: String = ""
    private var blockedChoiceUntilMs: Long = 0L
    private val recentLootActions: MutableList<LootStageHit> = mutableListOf()
    private val recentLootPointAttempts: MutableList<LootPointAttempt> = mutableListOf()
    private var overlayClearanceSignature: String = ""
    private var lastInGameObservedAtMs: Long = 0L
    private var firstLoadingObservedAtMs: Long = 0L
    private var lastLoadingObservedAtMs: Long = 0L
    private var lastLoadingRecoveryAtMs: Long = 0L
    private var firstUpdateReadyObservedAtMs: Long = 0L
    private var lastUpdateReadyRecoveryAtMs: Long = 0L
    private var lastModeSelectObservedAtMs: Long = 0L
    private var firstUnverifiedModeSelectObservedAtMs: Long = 0L
    private var lastUnverifiedModeSelectRecoveryAtMs: Long = 0L
    private var firstLauncherHomeObservedAtMs: Long = 0L
    private var consecutiveStartReadyCount: Int = 0
    private var consecutiveLauncherHomeCount: Int = 0
    private var consecutiveResultCount: Int = 0
    private var firstResultObservedAtMs: Long = 0L
    private var lastResultObservedAtMs: Long = 0L
    private var lastOcrConfirmedResultAtMs: Long = 0L
    private var requestedQueueMode: String = "unknown"
    private var verifiedQueueMode: String = "unknown"
    private var lastDetectedQueueMode: String = ""
    private var automationEnabledAtMs: Long = 0L
    private var lastHeartbeatTraceAtMs: Long = 0L

    fun setEnabled(value: Boolean) {
        if (value && !enabled) {
            automationEnabledAtMs = System.currentTimeMillis()
            resetQueueVerification()
        }
        enabled = value
    }

    fun setDryRun(value: Boolean) {
        dryRun = value
    }

    fun setQueueMode(value: String) {
        requestedQueueMode = value.lowercase().takeIf { it == "normal" } ?: "unknown"
        if (requestedQueueMode != "normal") {
            verifiedQueueMode = "unknown"
        }
    }

    fun setAppRecovery(value: AndroidTftAppRecovery) {
        appRecovery = value
    }

    fun tick(): AutomationSnapshot {
        if (!enabled) {
            if (lastSnapshot.status.startsWith("paused:")) {
                lastSnapshot = lastSnapshot.copy(enabled = false)
                return lastSnapshot
            }
            lastSnapshot = AutomationSnapshot(false, dryRun, lastSnapshot.lastState, emptyList(), emptyList(), "disabled")
            return lastSnapshot
        }

        val frame: Bitmap? = captureRepository.latestFrame()
        try {
            val now = System.currentTimeMillis()
            val observedState = observer.observe(frame)
            rememberDetectedQueueMode(observedState)
            val queuedState = applyQueueMode(observedState)
            rememberFrontendTransitionObservation(queuedState, now)
            val state = normalizeReliableInvalidHudState(promoteStableVisualResult(queuedState, now))
            if (shouldSuppressFrontendActionAfterSettingsClose(state, now)) {
                traceState(state, emptyList())
                lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), "skipped: recent-settings-close")
                return lastSnapshot
            }
            if (shouldSuppressFrontendActionDuringRecentInGame(state, now)) {
                traceState(state, emptyList())
                lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), "skipped: recent-ingame-frontend")
                return lastSnapshot
            }
            if (shouldSuppressGameplayDuringRecentResult(state, now)) {
                traceState(state, emptyList())
                lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), "skipped: recent-result-screen")
                return lastSnapshot
            }
            if (!dryRun && shouldRecoverStuckLoading(state, now)) {
                return restartTftAfterStuckLoading(state, now)
            }
            if (!dryRun && shouldRecoverStuckUpdateReady(state, now)) {
                return restartTftAfterStuckUpdateReady(state, now)
            }
            if (!dryRun && shouldRecoverStuckUnverifiedModeSelect(state, now)) {
                return restartTftAfterStuckUnverifiedModeSelect(state, now)
            }
            rememberInGameObservation(state, now)
            if (state.metadata["hasValidStage"] == "false") {
                if (state.metadata["reason"] == "android-result-screen") {
                    pendingAction = null
                }
                traceState(state, emptyList())
                lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), "skipped: ${state.metadata["reason"] ?: "invalid-state"}")
                return lastSnapshot
            }

            if (!dryRun) {
                val pending = pendingAction
                if (pending != null) {
                    if (!isFrontendRecoveryAction(pending.step.type) && hasFrontendInterruption(state)) {
                        pendingAction = null
                    } else {
                        when (verifier.evaluate(pending, state, System.currentTimeMillis())) {
                            VerificationResult.Pending -> {
                                lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), "verifying: ${pending.step.type}")
                                return lastSnapshot
                            }
                            VerificationResult.Verified -> {
                                rememberVerifiedAction(pending)
                                pendingAction = null
                                if (restartAfterDialog && pending.step.type == ActionType.DISMISS_DIALOG) {
                                    return restartTftAfterServerError(state)
                                }
                                lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), "verified: ${pending.step.type}")
                                return lastSnapshot
                            }
                            VerificationResult.Failed -> {
                                rememberFailedAction(pending)
                                pendingAction = null
                                if (restartAfterDialog && pending.step.type == ActionType.DISMISS_DIALOG) {
                                    return restartTftAfterServerError(state)
                                }
                                if (shouldPauseAfterRepeatedUpdateFailure(pending)) {
                                    lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), "paused: update-blocked")
                                    warn("Paused after repeated START_UPDATE verification failures")
                                    setEnabled(false)
                                    return lastSnapshot
                                }
                                if (shouldRecoverStartGameBySelectingNormalCard(pending, state)) {
                                    return recoverStartGameBySelectingNormalCard(frame, state)
                                }
                                if (isNonFatalVerificationFailure(pending.step.type)) {
                                    lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), "retrying: verify-failed ${pending.step.type}")
                                    warn("Retrying after verification failure for ${pending.step.type}")
                                    return lastSnapshot
                                }
                                lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), "paused: verify-failed ${pending.step.type}")
                                warn("Paused after verification failure for ${pending.step.type}")
                                setEnabled(false)
                                return lastSnapshot
                            }
                        }
                    }
                }
            }

            val actions = policy.decide(state)
            val steps = planner.build(actions)
            traceState(state, steps)

            val status = if (dryRun) "dry-run" else executeFirstStepSafely(steps, frame, state)
            lastSnapshot = AutomationSnapshot(enabled, dryRun, state, actions, steps, status)
            return lastSnapshot
        } finally {
            frame?.recycle()
        }
    }

    fun snapshot(): AutomationSnapshot = lastSnapshot.copy(enabled = enabled, dryRun = dryRun)

    private fun executeFirstStepSafely(steps: List<ExecutionStep>, frame: Bitmap?, state: ObservedState): String {
        val selected = selectExecutableStep(steps, state) ?: return if (steps.isEmpty()) "idle" else "skipped: action-blocked"
        val first = selected.first
        val signature = selected.second
        val now = System.currentTimeMillis()
        if (signature == lastExecutionSignature && now - lastExecutionAtMs < ACTION_COOLDOWN_MS) {
            return "skipped: cooldown"
        }
        if (signature == lastExecutionSignature && now - lastExecutionAtMs < REPEAT_RESET_MS) {
            repeatedExecutionCount += 1
        } else {
            repeatedExecutionCount = 0
        }
        val repeatLimit = if (first.type == ActionType.LEVEL_UP) LEVEL_UP_REPEAT_LIMIT else 2
        if (repeatedExecutionCount >= repeatLimit) {
            if (first.type == ActionType.LEVEL_UP) {
                return "skipped: level-up-repeat"
            }
            if (first.type == ActionType.START_GAME && state.metadata["frontendState"] == "mode-select") {
                return executeModeSelectStartFailureRecovery(frame, state, now)
            }
            if (first.type == ActionType.START_GAME && state.metadata["frontendState"] == "start-ready") {
                if (state.metadata["matchRoomState"] == "home") {
                    return "skipped: start-game-home-repeat"
                }
                return "skipped: start-game-repeat"
            }
            return "skipped: repeat-limit"
        }
        if (first.type == ActionType.START_GAME && shouldSuppressStartGameAfterFrontendTransition(state, now)) {
            return if (isRecentLoading(now)) {
                "skipped: recent-loading-start"
            } else {
                "skipped: start-ready-confirming"
            }
        }
        if (first.type == ActionType.EXIT_RESULT && shouldSuppressExitResultUntilConfirmed(state, now)) {
            return "skipped: result-confirming"
        }
        if (first.type == ActionType.DISMISS_DIALOG && shouldSuppressDialogDuringRecentInGame(state, now)) {
            return "skipped: recent-ingame-dialog"
        }
        if (first.type == ActionType.DISMISS_DIALOG && shouldSuppressStackedGlobalBackDuringRecentInGame(first, now)) {
            return "skipped: stacked-global-back"
        }
        if (isBlockedLevelUp(first, signature)) {
            return "skipped: level-up-blocked"
        }
        if (isBlockedChoice(first, signature)) {
            return "skipped: choice-blocked"
        }
        if (shouldWaitForOverlayClearance(first, signature)) {
            overlayClearanceSignature = signature
            return "waiting: overlay-clearance"
        }

        if (first.type == ActionType.RESTART_TFT) {
            if (state.metadata["frontendState"] == "launcher-home" &&
                !isRecentResult(now) &&
                consecutiveLauncherHomeCount < REQUIRED_LAUNCHER_HOME_CONFIRMATIONS
            ) {
                return "skipped: launcher-home-confirming"
            }
            val launched = appRecovery.launchTft()
            if (launched) {
                lastExecutionAtMs = now
                lastExecutionSignature = signature
                pendingAction = verifier.createPending(first, state, now)
                info("Executed ${first.type} by launching TFT foreground")
                return "executed: ${first.type}"
            }
            warn("TFT foreground launch unavailable")
            return "skipped: restart-unavailable"
        }

        val width = frame?.width ?: 0
        val height = frame?.height ?: 0
        if (width <= 0 || height <= 0) return "skipped: no-frame"

        if (shouldSuppressFrontendActionDuringWarmup(first, now)) {
            return "skipped: frontend-warmup"
        }

        if (first.type == ActionType.DISMISS_DIALOG) {
            recordDialogConfirm(now)
        }

        val accepted = TftAccessibilityService.execute(first, width, height)
        if (!accepted) {
            warn("Execution rejected for ${first.type}")
            return "skipped: accessibility-disabled"
        }
        lastExecutionAtMs = now
        lastExecutionSignature = signature
        if (first.type == ActionType.DISMISS_DIALOG && first.point == null) {
            lastGlobalBackDialogAtMs = now
        }
        if (first.type == ActionType.DISMISS_DIALOG && first.description == "Close settings") {
            lastSettingsDialogCloseAtMs = now
        }
        pendingAction = verifier.createPending(first, state, now)
        info("Executed ${first.type} at ${first.point ?: first.to}")
        return "executed: ${first.type}"
    }

    private fun shouldRecoverStartGameBySelectingNormalCard(pending: PendingAndroidAction, state: ObservedState): Boolean {
        if (pending.step.type != ActionType.START_GAME) {
            return false
        }
        if (pending.before.metadata["requestedQueueMode"] != "normal") {
            return false
        }
        if (pending.before.metadata["matchRoomState"] != "home") {
            return false
        }
        if (pending.before.metadata["homeNormalModeVisible"] != "true" && pending.before.metadata["detectedQueueMode"] != "normal") {
            return false
        }
        return state.metadata["detectedQueueMode"] != "ranked" &&
            state.metadata["lastDetectedQueueMode"] != "ranked"
    }

    private fun recoverStartGameBySelectingNormalCard(frame: Bitmap?, state: ObservedState): AutomationSnapshot {
        val actions = listOf(
            ActionPlan(
                tick = 0,
                type = ActionType.SELECT_MODE,
                payload = mapOf("target" to "normal-card", "queueMode" to "normal"),
                priority = 124,
                reason = "Recover Android normal queue by selecting normal card after start opened mode selector"
            )
        )
        val steps = planner.build(actions)
        val status = executeFirstStepSafely(steps, frame, state)
        lastSnapshot = AutomationSnapshot(enabled, dryRun, state, actions, steps, status)
        warn("Recovering START_GAME verification failure by selecting normal card")
        return lastSnapshot
    }

    private fun selectExecutableStep(steps: List<ExecutionStep>, state: ObservedState): Pair<ExecutionStep, String>? {
        for (step in steps) {
            val signature = verifier.signatureOf(step, state.stageText)
            if (isBlockedBuy(step, signature)) {
                continue
            }
            if (isBlockedDrag(step, signature)) {
                continue
            }
            if (isBlockedLoot(step, state)) {
                continue
            }
            if (isBlockedReturnHome(step)) {
                continue
            }
            if (isBlockedAnvil(step, signature)) {
                continue
            }
            if (isBlockedLevelUp(step, signature)) {
                continue
            }
            if (isBlockedUpdate(step)) {
                continue
            }
            return step to signature
        }
        return null
    }

    private fun rememberFailedAction(pending: PendingAndroidAction) {
        val now = System.currentTimeMillis()
        val fastRetryLoot = isFastRetryLootFailure(pending)
        val safeOwnBoardLootRetry = isSafeOwnBoardLootRetryFailure(pending)
        rememberBlockedBuy(pending, Long.MAX_VALUE)
        if (!safeOwnBoardLootRetry) {
            rememberBlockedLoot(
                pending = pending,
                untilMs = now + if (fastRetryLoot) LOOT_FAILED_FAST_RETRY_BLOCK_MS else LOOT_ACTION_BLOCK_MS,
                allowRepeatedBackoff = !fastRetryLoot,
                rememberPointAttempt = true
            )
        }
        rememberBlockedLevelUp(pending, now + LEVEL_UP_RETRY_BLOCK_MS)
        rememberBlockedChoice(pending, now + CHOICE_RETRY_BLOCK_MS)
        if (pending.step.type == ActionType.START_UPDATE) {
            consecutiveUpdateVerifyFailures += 1
            val blockMs = if (consecutiveUpdateVerifyFailures >= 2) UPDATE_FAILURE_LONG_BLOCK_MS else UPDATE_RETRY_BLOCK_MS
            rememberBlockedUpdate(pending, now + blockMs)
        }
    }

    private fun rememberVerifiedAction(pending: PendingAndroidAction) {
        if (pending.step.type == ActionType.START_UPDATE) {
            consecutiveUpdateVerifyFailures = 0
        }
        if (pending.step.type == ActionType.SELECT_MODE &&
            pending.before.metadata["requestedQueueMode"] == "normal"
        ) {
            verifiedQueueMode = "normal"
            lastDetectedQueueMode = "normal"
        }
        val buyBlockMs = if (isVisualFallbackBuy(pending)) VISUAL_BUY_SLOT_BLOCK_MS else BUY_SLOT_BLOCK_MS
        rememberBlockedBuy(pending, System.currentTimeMillis() + buyBlockMs)
        val dragBlockMs = if (pending.step.type == ActionType.EQUIP) EQUIP_ACTION_BLOCK_MS else MOVE_ACTION_BLOCK_MS
        rememberBlockedDrag(pending, System.currentTimeMillis() + dragBlockMs)
        rememberBlockedLoot(pending, System.currentTimeMillis() + LOOT_ACTION_BLOCK_MS)
        rememberBlockedReturnHome(pending, System.currentTimeMillis() + RETURN_HOME_BLOCK_MS)
        rememberBlockedAnvil(pending, System.currentTimeMillis() + ANVIL_ACTION_BLOCK_MS)
        rememberBlockedChoice(pending, System.currentTimeMillis() + CHOICE_ACTION_BLOCK_MS)
    }

    private fun rememberBlockedBuy(pending: PendingAndroidAction, untilMs: Long) {
        if (pending.step.type == ActionType.BUY) {
            blockedBuySignature = pending.signature
            blockedBuyUntilMs = untilMs
        }
    }

    private fun isVisualFallbackBuy(pending: PendingAndroidAction): Boolean {
        val source = pending.before.metadata["shopSource"]
        return pending.step.type == ActionType.BUY &&
            (source == "visual-fallback" || source == "last-visual-shop")
    }

    private fun rememberBlockedDrag(pending: PendingAndroidAction, untilMs: Long) {
        if (pending.step.type == ActionType.MOVE || pending.step.type == ActionType.EQUIP || pending.step.type == ActionType.SELL) {
            blockedDragUntilBySignature[pending.signature] = untilMs
        }
    }

    private fun isBlockedBuy(step: ExecutionStep, signature: String): Boolean {
        if (step.type != ActionType.BUY || blockedBuySignature.isBlank()) {
            return false
        }
        val now = System.currentTimeMillis()
        if (signature == blockedBuySignature && now < blockedBuyUntilMs) {
            return true
        }
        if (now >= blockedBuyUntilMs) {
            blockedBuySignature = ""
            blockedBuyUntilMs = 0L
            return false
        }
        return false
    }

    private fun isBlockedDrag(step: ExecutionStep, signature: String): Boolean {
        if ((step.type != ActionType.MOVE && step.type != ActionType.EQUIP && step.type != ActionType.SELL) ||
            blockedDragUntilBySignature.isEmpty()
        ) {
            return false
        }
        val now = System.currentTimeMillis()
        blockedDragUntilBySignature.entries.removeIf { it.value <= now }
        return (blockedDragUntilBySignature[signature] ?: 0L) > now
    }

    private fun rememberBlockedLoot(
        pending: PendingAndroidAction,
        untilMs: Long,
        allowRepeatedBackoff: Boolean = true,
        rememberPointAttempt: Boolean = true
    ) {
        if (pending.step.type != ActionType.PICK_LOOT) {
            return
        }
        val point = pending.step.point ?: return
        val now = System.currentTimeMillis()
        cleanupRecentLootPointAttempts(now)
        val repeatedPoint = recentLootPointAttempts.any { attempt ->
            attempt.untilMs > now && arePointsClose(point.x, point.y, attempt.x, attempt.y)
        }
        val effectiveUntilMs = if (allowRepeatedBackoff && repeatedPoint) {
            maxOf(untilMs, now + REPEATED_LOOT_ACTION_BLOCK_MS)
        } else {
            untilMs
        }
        val key = lootBucket(point.x, point.y)
        val history = blockedLootByBucket.getOrPut(key) { mutableListOf() }
        history += LootBucketHit(point.x, point.y, effectiveUntilMs)
        if (rememberPointAttempt) {
            recentLootPointAttempts += LootPointAttempt(point.x, point.y, now + LOOT_REPEAT_MEMORY_MS)
            while (recentLootPointAttempts.size > LOOT_POINT_MEMORY_LIMIT) {
                recentLootPointAttempts.removeAt(0)
            }
        }
        rememberRecentLootAction(pending.before.stageText)
        while (history.size > LOOT_HISTORY_PER_BUCKET) {
            history.removeAt(0)
        }
        cleanupExpiredLootBlocks(now)
    }

    private fun isFastRetryLootFailure(pending: PendingAndroidAction): Boolean {
        if (pending.step.type != ActionType.PICK_LOOT) {
            return false
        }
        val point = pending.step.point ?: return false
        val stage = pending.before.stageText.trim()
        val stageMatch = Regex("""([1-9])\s*-\s*([1-9])""").find(stage) ?: return false
        val major = stageMatch.groupValues[1].toIntOrNull() ?: return false
        if (major != 1) {
            return false
        }
        if (pending.before.metadata["sidePanelState"] == "open" ||
            pending.before.metadata["reason"] == "android-side-panel-visual"
        ) {
            return false
        }
        return point.x in 0.30f..0.70f && point.y in 0.45f..0.80f
    }

    private fun isSafeOwnBoardLootRetryFailure(pending: PendingAndroidAction): Boolean {
        if (pending.step.type != ActionType.PICK_LOOT) {
            return false
        }
        val point = pending.step.point ?: return false
        val state = pending.before
        if (state.stageType != "NORMAL" || state.metadata["lootState"] != "visible") {
            return false
        }
        if (state.metadata["requestedQueueMode"] != "normal" || state.metadata["detectedQueueMode"] == "ranked") {
            return false
        }
        if (state.metadata["sidePanelState"] == "open" || state.metadata["reason"] == "android-side-panel-visual") {
            return false
        }
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(state.stageText.trim()) ?: return false
        val major = match.groupValues[1].toIntOrNull() ?: return false
        val minor = match.groupValues[2].toIntOrNull() ?: return false
        if (major != 2 || minor !in 1..7) {
            return false
        }
        val hasOwnBoardHud = state.gold > 0 && state.metadata["goldSource"] != "last-stable"
        val hasShopHud = state.gold > 0 && state.metadata["shopOverlayState"] == "open" && state.shop.isNotEmpty()
        if (!hasOwnBoardHud && !hasShopHud) {
            return false
        }
        return point.x in 0.62f..0.80f && point.y in 0.58f..0.76f
    }

    private fun isBlockedLoot(step: ExecutionStep, state: ObservedState): Boolean {
        if (step.type != ActionType.PICK_LOOT) {
            return false
        }
        val now = System.currentTimeMillis()
        val point = step.point ?: return false
        cleanupExpiredLootBlocks(now)
        cleanupRecentLootActions(now)
        cleanupRecentLootPointAttempts(now)
        if (recentLootPointAttempts.any { attempt ->
                attempt.untilMs > now && arePointsClose(point.x, point.y, attempt.x, attempt.y)
            }
        ) {
            return true
        }
        if (blockedLootByBucket.isEmpty()) {
            return false
        }
        val stageKey = lootStageKey(state.stageText)
        if (recentLootActions.count { it.stageKey == stageKey && it.untilMs > now } >= MAX_LOOT_ACTIONS_PER_STAGE_WINDOW) {
            return true
        }
        val pointXBucket = lootBucketX(point.x)
        val pointYBucket = lootBucketY(point.y)
        for (yOffset in -LOOT_NEIGHBOR_BUCKET_RANGE..LOOT_NEIGHBOR_BUCKET_RANGE) {
            for (xOffset in -LOOT_NEIGHBOR_BUCKET_RANGE..LOOT_NEIGHBOR_BUCKET_RANGE) {
                val key = lootBucket(pointXBucket + xOffset, pointYBucket + yOffset)
                val hits = blockedLootByBucket[key] ?: continue
                for (hit in hits) {
                    if (hit.untilMs > now && arePointsClose(point.x, point.y, hit.x, hit.y)) {
                        return true
                    }
                }
            }
        }
        return false
    }

    private fun rememberRecentLootAction(stageText: String) {
        val now = System.currentTimeMillis()
        cleanupRecentLootActions(now)
        recentLootActions += LootStageHit(lootStageKey(stageText), now + LOOT_STAGE_ACTION_WINDOW_MS)
    }

    private fun cleanupRecentLootActions(now: Long) {
        recentLootActions.removeIf { it.untilMs <= now }
    }

    private fun cleanupRecentLootPointAttempts(now: Long) {
        recentLootPointAttempts.removeIf { it.untilMs <= now }
    }

    private fun lootStageKey(stageText: String): String {
        return stageText.takeIf { it.isNotBlank() } ?: "unknown"
    }

    private fun rememberBlockedReturnHome(pending: PendingAndroidAction, untilMs: Long) {
        if (pending.step.type == ActionType.RETURN_HOME) {
            blockedReturnHomeUntilMs = untilMs
        }
    }

    private fun isBlockedReturnHome(step: ExecutionStep): Boolean {
        if (step.type != ActionType.RETURN_HOME) {
            return false
        }
        val now = System.currentTimeMillis()
        if (now >= blockedReturnHomeUntilMs) {
            blockedReturnHomeUntilMs = 0L
            return false
        }
        return true
    }

    private fun rememberBlockedAnvil(pending: PendingAndroidAction, untilMs: Long) {
        if (pending.step.type == ActionType.USE_ANVIL) {
            blockedAnvilSignature = pending.signature
            blockedAnvilUntilMs = untilMs
        }
    }

    private fun isBlockedAnvil(step: ExecutionStep, signature: String): Boolean {
        if (step.type != ActionType.USE_ANVIL || blockedAnvilSignature.isBlank()) {
            return false
        }
        val now = System.currentTimeMillis()
        if (signature == blockedAnvilSignature && now < blockedAnvilUntilMs) {
            return true
        }
        if (signature != blockedAnvilSignature || now >= blockedAnvilUntilMs) {
            blockedAnvilSignature = ""
            blockedAnvilUntilMs = 0L
        }
        return false
    }

    private fun lootBucket(step: ExecutionStep): String {
        val point = step.point ?: return ""
        return lootBucket(point.x, point.y)
    }

    private fun lootBucket(x: Float, y: Float): String {
        return "${lootBucketX(x)}:${lootBucketY(y)}"
    }

    private fun lootBucketX(value: Float): Int {
        return clampBucket((value * LOOT_BUCKET_GRID).toInt(), LOOT_BUCKET_GRID)
    }

    private fun lootBucketY(value: Float): Int {
        return clampBucket((value * LOOT_BUCKET_GRID).toInt(), LOOT_BUCKET_GRID)
    }

    private fun lootBucket(xBucket: Int, yBucket: Int): String {
        val safeX = clampBucket(xBucket, LOOT_BUCKET_GRID)
        val safeY = clampBucket(yBucket, LOOT_BUCKET_GRID)
        return "$safeX:$safeY"
    }

    private fun arePointsClose(x1: Float, y1: Float, x2: Float, y2: Float): Boolean {
        return kotlin.math.abs(x1 - x2) <= LOOT_NEIGHBOR_RADIUS_X &&
            kotlin.math.abs(y1 - y2) <= LOOT_NEIGHBOR_RADIUS_Y
    }

    private fun clampBucket(value: Int, grid: Int): Int {
        return value.coerceIn(0, grid - 1)
    }

    private fun cleanupExpiredLootBlocks(now: Long) {
        blockedLootByBucket.entries.removeIf { (_, hits) ->
            hits.removeIf { it.untilMs <= now }
            hits.isEmpty()
        }
    }

    private fun isBlockedLevelUp(step: ExecutionStep, signature: String): Boolean {
        if (step.type != ActionType.LEVEL_UP || blockedLevelUpSignature.isBlank()) {
            return false
        }
        val now = System.currentTimeMillis()
        if (signature == blockedLevelUpSignature && now < blockedLevelUpUntilMs) {
            return true
        }
        if (signature != blockedLevelUpSignature || now >= blockedLevelUpUntilMs) {
            blockedLevelUpSignature = ""
            blockedLevelUpUntilMs = 0L
        }
        return false
    }

    private fun rememberBlockedLevelUp(pending: PendingAndroidAction, untilMs: Long) {
        if (pending.step.type == ActionType.LEVEL_UP) {
            blockedLevelUpSignature = pending.signature
            blockedLevelUpUntilMs = untilMs
        }
    }

    private fun rememberBlockedUpdate(pending: PendingAndroidAction, untilMs: Long) {
        if (pending.step.type == ActionType.START_UPDATE) {
            blockedUpdateUntilMs = untilMs
        }
    }

    private fun isBlockedUpdate(step: ExecutionStep): Boolean {
        if (step.type != ActionType.START_UPDATE) {
            return false
        }
        val now = System.currentTimeMillis()
        if (now >= blockedUpdateUntilMs) {
            blockedUpdateUntilMs = 0L
            return false
        }
        return true
    }

    private fun rememberBlockedChoice(pending: PendingAndroidAction, untilMs: Long) {
        if (pending.step.type == ActionType.PICK_AUGMENT) {
            blockedChoiceSignature = pending.signature
            blockedChoiceUntilMs = untilMs
        }
    }

    private fun isBlockedChoice(step: ExecutionStep, signature: String): Boolean {
        if (step.type != ActionType.PICK_AUGMENT || blockedChoiceSignature.isBlank()) {
            return false
        }
        val now = System.currentTimeMillis()
        if (signature == blockedChoiceSignature && now < blockedChoiceUntilMs) {
            return true
        }
        if (signature != blockedChoiceSignature || now >= blockedChoiceUntilMs) {
            blockedChoiceSignature = ""
            blockedChoiceUntilMs = 0L
            return false
        }
        return true
    }

    private fun shouldWaitForOverlayClearance(step: ExecutionStep, signature: String): Boolean {
        if (step.type == ActionType.PICK_LOOT) {
            return false
        }
        val point = step.point ?: step.to ?: return false
        val overlapsOverlay = point.x in 0.36f..0.64f && point.y in 0.49f..0.96f
        return overlapsOverlay && signature != overlayClearanceSignature
    }

    private fun shouldSuppressFrontendActionDuringWarmup(step: ExecutionStep, now: Long): Boolean {
        if (now - automationEnabledAtMs >= FRONTEND_ACTION_WARMUP_MS) {
            return false
        }
        return step.type == ActionType.OPEN_MODE_ROOM ||
            step.type == ActionType.START_GAME ||
            step.type == ActionType.SELECT_MODE ||
            step.type == ActionType.START_UPDATE ||
            step.type == ActionType.DISMISS_DIALOG ||
            step.type == ActionType.EXIT_RESULT ||
            step.type == ActionType.RECOVER_BACK
    }

    private fun normalizeReliableInvalidHudState(state: ObservedState): ObservedState {
        if (state.metadata["hasValidStage"] != "false" || !hasReliableInGameHudState(state)) {
            return state
        }
        return state.copy(
            metadata = state.metadata + mapOf(
                "hasValidStage" to "true",
                "validStageRecovered" to "strong-ingame-hud"
            )
        )
    }

    private fun hasReliableInGameHudState(state: ObservedState): Boolean {
        if (state.stageType != "NORMAL" || !isConcreteStageText(state.stageText)) {
            return false
        }
        if (!state.metadata["frontendState"].isNullOrBlank() ||
            !state.metadata["dialogState"].isNullOrBlank() ||
            !state.metadata["resultState"].isNullOrBlank()
        ) {
            return false
        }
        val hasCurrentGoldHud = state.gold > 0 && state.metadata["goldSource"] != "last-stable"
        val hasShopHud = state.metadata["shopOverlayState"] == "open" && state.shop.isNotEmpty()
        val hasFastHudProof = state.metadata["reason"] == "android-fast-hud" ||
            state.metadata["reason"] == "android-mlkit-hud"
        return hasFastHudProof && state.level in 2..10 && (hasCurrentGoldHud || hasShopHud)
    }

    private fun isConcreteStageText(stageText: String): Boolean {
        return Regex("""[1-9]\s*-\s*[1-9]""").containsMatchIn(stageText)
    }

    private fun rememberFrontendTransitionObservation(state: ObservedState, now: Long) {
        when (state.metadata["frontendState"]) {
            "loading" -> {
                if (firstLoadingObservedAtMs <= 0L) {
                    firstLoadingObservedAtMs = now
                }
                firstUpdateReadyObservedAtMs = 0L
                firstUnverifiedModeSelectObservedAtMs = 0L
                firstLauncherHomeObservedAtMs = 0L
                lastLoadingObservedAtMs = now
                consecutiveStartReadyCount = 0
            }
            "update-ready" -> {
                firstLoadingObservedAtMs = 0L
                firstUnverifiedModeSelectObservedAtMs = 0L
                firstLauncherHomeObservedAtMs = 0L
                if (firstUpdateReadyObservedAtMs <= 0L) {
                    firstUpdateReadyObservedAtMs = now
                }
                consecutiveStartReadyCount = 0
                consecutiveLauncherHomeCount = 0
            }
            "mode-select" -> {
                firstLoadingObservedAtMs = 0L
                firstUpdateReadyObservedAtMs = 0L
                firstLauncherHomeObservedAtMs = 0L
                if (isUnverifiedNormalModeSelect(state)) {
                    if (firstUnverifiedModeSelectObservedAtMs <= 0L) {
                        firstUnverifiedModeSelectObservedAtMs = now
                    }
                } else {
                    firstUnverifiedModeSelectObservedAtMs = 0L
                }
                lastModeSelectObservedAtMs = now
                consecutiveStartReadyCount = 0
            }
            "start-ready" -> {
                firstLoadingObservedAtMs = 0L
                firstUpdateReadyObservedAtMs = 0L
                firstUnverifiedModeSelectObservedAtMs = 0L
                firstLauncherHomeObservedAtMs = 0L
                consecutiveStartReadyCount += 1
                consecutiveLauncherHomeCount = 0
            }
            "launcher-home" -> {
                firstLoadingObservedAtMs = 0L
                firstUpdateReadyObservedAtMs = 0L
                firstUnverifiedModeSelectObservedAtMs = 0L
                if (firstLauncherHomeObservedAtMs <= 0L) {
                    firstLauncherHomeObservedAtMs = now
                }
                consecutiveStartReadyCount = 0
                consecutiveLauncherHomeCount += 1
            }
            else -> {
                firstLoadingObservedAtMs = 0L
                firstUpdateReadyObservedAtMs = 0L
                firstUnverifiedModeSelectObservedAtMs = 0L
                firstLauncherHomeObservedAtMs = 0L
                consecutiveStartReadyCount = 0
                consecutiveLauncherHomeCount = 0
            }
        }
        if (state.metadata["resultState"] == "finished") {
            lastResultObservedAtMs = now
            if (state.metadata["reason"] == "android-result-screen") {
                lastOcrConfirmedResultAtMs = now
            }
            if (consecutiveResultCount == 0) {
                firstResultObservedAtMs = now
            }
            consecutiveResultCount += 1
            resetQueueVerification()
        } else if (isResultScreenGameplayFlicker(state, now)) {
            // Result pages can intermittently look like a normal HUD; keep visual result confirmation intact.
        } else {
            consecutiveResultCount = 0
            firstResultObservedAtMs = 0L
        }
    }

    private fun shouldSuppressGameplayDuringRecentResult(state: ObservedState, now: Long): Boolean {
        if (state.metadata["resultState"] == "finished") {
            return false
        }
        return isResultScreenGameplayFlicker(state, now)
    }

    private fun isResultScreenGameplayFlicker(state: ObservedState, now: Long): Boolean {
        if (lastResultObservedAtMs <= 0L || now - lastResultObservedAtMs > RECENT_RESULT_GAMEPLAY_SUPPRESS_MS) {
            return false
        }
        if (!state.metadata["frontendState"].isNullOrBlank() || !state.metadata["dialogState"].isNullOrBlank()) {
            return false
        }
        if (state.stageType == "AUGMENT" || state.augments.isNotEmpty() || !state.metadata["augmentLayout"].isNullOrBlank()) {
            return false
        }
        if (state.stageType == "UNKNOWN" && state.metadata["reason"] == "ocr-not-started") {
            return true
        }
        if (isEarlyNewMatchStage(state.stageText)) {
            return false
        }
        return state.stageType == "NORMAL" ||
            state.stageText.isNotBlank() ||
            state.shop.isNotEmpty()
    }

    private fun isEarlyNewMatchStage(stageText: String): Boolean {
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(stageText) ?: return false
        val major = match.groupValues[1].toIntOrNull() ?: return false
        val minor = match.groupValues[2].toIntOrNull() ?: return false
        return major == 1 || major == 2 && minor == 1
    }

    private fun promoteStableVisualResult(state: ObservedState, now: Long): ObservedState {
        if (state.metadata["resultState"] != "finished" || state.metadata["reason"] != "android-result-visual") {
            return state
        }
        if (consecutiveResultCount < REQUIRED_RESULT_CONFIRMATIONS ||
            firstResultObservedAtMs <= 0L ||
            now - firstResultObservedAtMs < REQUIRED_RESULT_STABLE_MS
        ) {
            return state
        }
        val modalStableAfterRecentInGame = state.metadata["resultLayout"] == "modal" &&
            now - firstResultObservedAtMs >= RECENT_INGAME_MODAL_RESULT_ALLOW_MS
        if (lastInGameObservedAtMs > 0L &&
            now - lastInGameObservedAtMs < RECENT_INGAME_RESULT_SUPPRESS_MS &&
            !modalStableAfterRecentInGame
        ) {
            return state
        }
        if (state.metadata["resultLayout"] == "scoreboard") {
            return state.copy(
                metadata = state.metadata + mapOf(
                    "reason" to "android-result-screen",
                    "resultProof" to "visual-scoreboard-stable"
                )
            )
        }
        val recentlyOcrConfirmed = lastOcrConfirmedResultAtMs > 0L &&
            now - lastOcrConfirmedResultAtMs <= OCR_CONFIRMED_RESULT_RETRY_WINDOW_MS
        if (state.metadata["resultLayout"] == "modal" && recentlyOcrConfirmed) {
            return state.copy(
                metadata = state.metadata + mapOf(
                    "reason" to "android-result-screen",
                    "resultProof" to "visual-modal-after-ocr-confirmed"
                )
            )
        }
        val resultLayout = state.metadata["resultLayout"].orEmpty()
        if ((resultLayout == "modal" || resultLayout.isBlank()) &&
            now - firstResultObservedAtMs >= REQUIRED_MODAL_RESULT_STABLE_MS
        ) {
            val proof = if (resultLayout == "modal") "visual-modal-long-stable" else "visual-frontend-long-stable"
            return state.copy(
                metadata = state.metadata + mapOf(
                    "reason" to "android-result-screen",
                    "resultProof" to proof
                )
            )
        }
        return state.copy(
            metadata = state.metadata + mapOf(
                "resultProof" to "visual-stable"
            )
        )
    }

    private fun rememberInGameObservation(state: ObservedState, now: Long) {
        if (state.metadata["frontendState"].isNullOrBlank() &&
            state.metadata["resultState"].isNullOrBlank() &&
            state.metadata["dialogState"].isNullOrBlank() &&
            (state.stageType == "NORMAL" || state.stageType == "AUGMENT" || state.stageText.isNotBlank())
        ) {
            lastInGameObservedAtMs = now
        }
    }

    private fun shouldSuppressFrontendActionDuringRecentInGame(state: ObservedState, now: Long): Boolean {
        if (lastInGameObservedAtMs <= 0L || now - lastInGameObservedAtMs > RECENT_INGAME_FRONTEND_SUPPRESS_MS) {
            return false
        }
        val frontendState = state.metadata["frontendState"]
        if (!isQueueAutomationFrontend(frontendState)) {
            return false
        }
        if (frontendState == "launcher-home" && isRecentResult(now)) {
            return false
        }
        if (frontendState == "launcher-home" && hasStableLauncherHomeObservation(now)) {
            return false
        }
        return state.metadata["resultState"].isNullOrBlank() && state.metadata["dialogState"].isNullOrBlank()
    }

    private fun shouldSuppressFrontendActionAfterSettingsClose(state: ObservedState, now: Long): Boolean {
        if (lastSettingsDialogCloseAtMs <= 0L || now - lastSettingsDialogCloseAtMs > RECENT_SETTINGS_CLOSE_SUPPRESS_MS) {
            return false
        }
        if (!state.metadata["dialogState"].isNullOrBlank() || !state.metadata["resultState"].isNullOrBlank()) {
            return false
        }
        return isQueueAutomationFrontend(state.metadata["frontendState"]) ||
            state.metadata["frontendState"] == "launcher-home"
    }

    private fun hasStableLauncherHomeObservation(now: Long): Boolean {
        if (consecutiveLauncherHomeCount < REQUIRED_LAUNCHER_HOME_CONFIRMATIONS) {
            return false
        }
        return firstLauncherHomeObservedAtMs > 0L &&
            now - firstLauncherHomeObservedAtMs >= RECENT_INGAME_LAUNCHER_HOME_STABLE_MS
    }

    private fun isRecentResult(now: Long): Boolean {
        return lastResultObservedAtMs > 0L && now - lastResultObservedAtMs <= RECENT_RESULT_GAMEPLAY_SUPPRESS_MS
    }

    private fun shouldSuppressStartGameAfterFrontendTransition(state: ObservedState, now: Long): Boolean {
        if (state.metadata["frontendState"] != "start-ready") {
            return false
        }
        if (isRecentLoading(now)) {
            return true
        }
        if (lastModeSelectObservedAtMs > 0L && now - lastModeSelectObservedAtMs < RECENT_MODE_SELECT_START_SUPPRESS_MS) {
            return true
        }
        return consecutiveStartReadyCount < REQUIRED_START_READY_CONFIRMATIONS
    }

    private fun shouldSuppressExitResultUntilConfirmed(state: ObservedState, now: Long): Boolean {
        if (state.metadata["resultState"] != "finished") {
            return false
        }
        if (state.metadata["reason"] == "android-result-screen") {
            return false
        }
        if (state.metadata["reason"] == "android-result-visual" &&
            state.metadata["resultLayout"] == "modal" &&
            state.metadata["resultProof"] == "visual-stable"
        ) {
            return false
        }
        if (lastInGameObservedAtMs > 0L && now - lastInGameObservedAtMs < RECENT_INGAME_RESULT_SUPPRESS_MS) {
            return true
        }
        if (state.metadata["reason"] == "android-result-visual" &&
            state.metadata["resultLayout"] == "scoreboard" &&
            state.metadata["resultProof"] == "visual-scoreboard-stable"
        ) {
            return false
        }
        return consecutiveResultCount < REQUIRED_RESULT_CONFIRMATIONS ||
            firstResultObservedAtMs <= 0L ||
            now - firstResultObservedAtMs < REQUIRED_RESULT_STABLE_MS
    }

    private fun shouldSuppressDialogDuringRecentInGame(state: ObservedState, now: Long): Boolean {
        if (state.metadata["dialogState"] !in setOf("confirm", "settings")) {
            return false
        }
        return lastInGameObservedAtMs > 0L && now - lastInGameObservedAtMs < RECENT_INGAME_DIALOG_SUPPRESS_MS
    }

    private fun shouldSuppressStackedGlobalBackDuringRecentInGame(step: ExecutionStep, now: Long): Boolean {
        if (step.point != null) {
            return false
        }
        if (lastGlobalBackDialogAtMs <= 0L || now - lastGlobalBackDialogAtMs > STACKED_GLOBAL_BACK_SUPPRESS_MS) {
            return false
        }
        return lastInGameObservedAtMs > 0L && now - lastInGameObservedAtMs < RECENT_INGAME_DIALOG_SUPPRESS_MS
    }

    private fun isRecentLoading(now: Long): Boolean {
        return lastLoadingObservedAtMs > 0L && now - lastLoadingObservedAtMs < RECENT_LOADING_START_SUPPRESS_MS
    }

    private fun shouldRecoverStuckLoading(state: ObservedState, now: Long): Boolean {
        if (state.metadata["frontendState"] != "loading" || requestedQueueMode != "normal") {
            return false
        }
        if (firstLoadingObservedAtMs <= 0L || now - firstLoadingObservedAtMs < STUCK_LOADING_RECOVERY_MS) {
            return false
        }
        return lastLoadingRecoveryAtMs <= 0L || now - lastLoadingRecoveryAtMs >= STUCK_LOADING_RECOVERY_COOLDOWN_MS
    }

    private fun restartTftAfterStuckLoading(state: ObservedState, now: Long): AutomationSnapshot {
        pendingAction = null
        lastLoadingRecoveryAtMs = now
        val status = if (appRecovery.restartTft()) {
            info("Executed RESTART_TFT after stuck loading screen")
            "executed: RESTART_TFT"
        } else {
            warn("TFT stuck-loading recovery unavailable")
            "skipped: restart-unavailable"
        }
        lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), status)
        return lastSnapshot
    }

    private fun shouldRecoverStuckUpdateReady(state: ObservedState, now: Long): Boolean {
        if (state.metadata["frontendState"] != "update-ready" || requestedQueueMode != "normal") {
            return false
        }
        if (firstUpdateReadyObservedAtMs <= 0L || now - firstUpdateReadyObservedAtMs < STUCK_UPDATE_READY_RECOVERY_MS) {
            return false
        }
        return lastUpdateReadyRecoveryAtMs <= 0L ||
            now - lastUpdateReadyRecoveryAtMs >= STUCK_UPDATE_READY_RECOVERY_COOLDOWN_MS
    }

    private fun restartTftAfterStuckUpdateReady(state: ObservedState, now: Long): AutomationSnapshot {
        pendingAction = null
        blockedUpdateUntilMs = 0L
        lastUpdateReadyRecoveryAtMs = now
        val status = if (appRecovery.restartTft()) {
            info("Executed RESTART_TFT after stuck update-ready screen")
            "executed: RESTART_TFT"
        } else {
            warn("TFT stuck-update recovery unavailable")
            "skipped: restart-unavailable"
        }
        lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), status)
        return lastSnapshot
    }

    private fun shouldRecoverStuckUnverifiedModeSelect(state: ObservedState, now: Long): Boolean {
        if (!isUnverifiedNormalModeSelect(state)) {
            return false
        }
        if (firstUnverifiedModeSelectObservedAtMs <= 0L ||
            now - firstUnverifiedModeSelectObservedAtMs < STUCK_UNVERIFIED_MODE_SELECT_RECOVERY_MS
        ) {
            return false
        }
        return lastUnverifiedModeSelectRecoveryAtMs <= 0L ||
            now - lastUnverifiedModeSelectRecoveryAtMs >= STUCK_UNVERIFIED_MODE_SELECT_RECOVERY_COOLDOWN_MS
    }

    private fun isUnverifiedNormalModeSelect(state: ObservedState): Boolean {
        if (state.metadata["frontendState"] != "mode-select" || state.metadata["requestedQueueMode"] != "normal") {
            return false
        }
        val queueMode = state.metadata["queueMode"].orEmpty()
        val detectedQueueMode = state.metadata["detectedQueueMode"].orEmpty()
        return queueMode != "normal" && detectedQueueMode !in setOf("normal", "ranked")
    }

    private fun shouldPauseAfterRepeatedUpdateFailure(pending: PendingAndroidAction): Boolean {
        return pending.step.type == ActionType.START_UPDATE &&
            consecutiveUpdateVerifyFailures >= 2
    }

    private fun restartTftAfterStuckUnverifiedModeSelect(state: ObservedState, now: Long): AutomationSnapshot {
        pendingAction = null
        lastUnverifiedModeSelectRecoveryAtMs = now
        val status = if (appRecovery.restartTft()) {
            info("Executed RESTART_TFT after stuck unverified mode-select screen")
            "executed: RESTART_TFT"
        } else {
            warn("TFT stuck unverified mode-select recovery unavailable")
            "skipped: restart-unavailable"
        }
        lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), status)
        return lastSnapshot
    }

    private fun executeModeSelectStartFailureRecovery(frame: Bitmap?, state: ObservedState, now: Long): String {
        val width = frame?.width ?: 0
        val height = frame?.height ?: 0
        if (width <= 0 || height <= 0) return "skipped: no-frame"
        val recovery = ExecutionStep(
            index = 0,
            type = ActionType.DISMISS_DIALOG,
            point = com.tfthextech.helper.protocol.PointF01(0.50f, 0.62f),
            description = "Dismiss stale Android ready-check dialog",
            reason = "Recover after repeated START_GAME failures on mode select"
        )
        val accepted = TftAccessibilityService.execute(recovery, width, height)
        if (!accepted) {
            warn("Mode-select dialog recovery action rejected")
            return "skipped: accessibility-disabled"
        }
        lastExecutionAtMs = now
        lastExecutionSignature = verifier.signatureOf(recovery, state.stageText)
        repeatedExecutionCount = 0
        recordDialogConfirm(now)
        info("Executed ${recovery.type} at ${recovery.point}")
        return "executed: ${recovery.type}"
    }

    private fun recordDialogConfirm(now: Long) {
        if (firstDialogConfirmAtMs == 0L || now - firstDialogConfirmAtMs > SERVER_ERROR_WINDOW_MS) {
            firstDialogConfirmAtMs = now
            dialogConfirmCount = 0
        }
        dialogConfirmCount += 1
        if (dialogConfirmCount >= SERVER_ERROR_CONFIRM_LIMIT) {
            restartAfterDialog = true
        }
    }

    private fun restartTftAfterServerError(state: ObservedState): AutomationSnapshot {
        restartAfterDialog = false
        dialogConfirmCount = 0
        firstDialogConfirmAtMs = 0L
        pendingAction = null
        repeatedExecutionCount = 0
        lastExecutionSignature = ""
        val status = if (appRecovery.restartTft()) {
            "executed: RESTART_TFT"
        } else {
            "skipped: restart-unavailable"
        }
        lastSnapshot = AutomationSnapshot(enabled, dryRun, state, emptyList(), emptyList(), status)
        return lastSnapshot
    }

    private fun executeBackRecovery(frame: Bitmap?, state: ObservedState, now: Long): String {
        val width = frame?.width ?: 0
        val height = frame?.height ?: 0
        if (width <= 0 || height <= 0) return "skipped: no-frame"
        val recovery = ExecutionStep(
            index = 0,
            type = ActionType.RECOVER_BACK,
            point = com.tfthextech.helper.protocol.PointF01(0.08f, 0.05f),
            description = "Back out of stale Android match room",
            reason = "Recover after repeated START_GAME failures"
        )
        val accepted = TftAccessibilityService.execute(recovery, width, height)
        if (!accepted) {
            warn("Recovery back action rejected")
            return "skipped: accessibility-disabled"
        }
        lastExecutionAtMs = now
        lastExecutionSignature = verifier.signatureOf(recovery, state.stageText)
        repeatedExecutionCount = 0
        pendingAction = verifier.createPending(recovery, state, now)
        info("Executed ${recovery.type} at ${recovery.point}")
        return "executed: ${recovery.type}"
    }

    private fun isFrontendRecoveryAction(type: ActionType): Boolean {
        return type == ActionType.OPEN_MODE_ROOM ||
            type == ActionType.START_GAME ||
            type == ActionType.START_UPDATE ||
            type == ActionType.SELECT_MODE ||
            type == ActionType.ACCEPT_QUEUE ||
            type == ActionType.DISMISS_DIALOG ||
            type == ActionType.RETURN_HOME ||
            type == ActionType.EXIT_RESULT ||
            type == ActionType.RECOVER_BACK ||
            type == ActionType.RESTART_TFT
    }

    private fun isNonFatalVerificationFailure(type: ActionType): Boolean {
        return isFrontendRecoveryAction(type) ||
            type == ActionType.LEVEL_UP ||
            type == ActionType.BUY ||
            type == ActionType.ROLL ||
            type == ActionType.PICK_AUGMENT ||
            type == ActionType.PICK_LOOT
    }

    private fun isQueueAutomationFrontend(frontendState: String?): Boolean {
        return frontendState == "start-ready" ||
            frontendState == "accept-ready" ||
            frontendState == "mode-select" ||
            frontendState == "continue-ready" ||
            frontendState == "launcher-home"
    }

    private fun hasFrontendInterruption(state: ObservedState): Boolean {
        return state.metadata["resultState"] == "finished" ||
            !state.metadata["dialogState"].isNullOrBlank() ||
            !state.metadata["frontendState"].isNullOrBlank()
    }

    private fun warn(message: String) {
        runCatching { Log.w(TAG, message) }
    }

    private fun info(message: String) {
        runCatching { Log.i(TAG, message) }
    }

    private fun applyQueueMode(state: ObservedState): ObservedState {
        return state.copy(
            metadata = state.metadata + mapOf(
                "queueMode" to verifiedQueueMode,
                "requestedQueueMode" to requestedQueueMode,
                "lastDetectedQueueMode" to lastDetectedQueueMode
            )
        )
    }

    private fun rememberDetectedQueueMode(state: ObservedState) {
        when (state.metadata["detectedQueueMode"]) {
            "normal" -> {
                lastDetectedQueueMode = "normal"
                if (requestedQueueMode == "normal" && state.metadata["frontendState"] != "mode-select") {
                    verifiedQueueMode = "normal"
                }
            }
            "ranked" -> {
                lastDetectedQueueMode = "ranked"
                verifiedQueueMode = "unknown"
            }
        }
    }

    private fun resetQueueVerification() {
        verifiedQueueMode = "unknown"
        lastDetectedQueueMode = ""
    }

    private fun traceState(state: ObservedState, steps: List<ExecutionStep>) {
        val firstShop = state.shop.firstOrNull()?.unit?.name ?: "-"
        val next = steps.firstOrNull()?.type?.name ?: "-"
        val signature = listOf(
            state.stageText,
            state.stageType,
            state.gold.toString(),
            state.level.toString(),
            state.shop.size.toString(),
            state.metadata["shopRaw"] ?: "",
            state.metadata["shopSource"] ?: "",
            state.metadata["reason"] ?: "",
            state.metadata["frontendState"] ?: "",
            state.metadata["dialogState"] ?: "",
            state.metadata["resultState"] ?: "",
            state.metadata["combatState"] ?: "",
            state.metadata["lootState"] ?: "",
            state.metadata["anvilState"] ?: "",
            state.metadata["playerListState"] ?: "",
            state.metadata["shopOverlayState"] ?: "",
            state.metadata["itemCount"] ?: "",
            state.metadata["requestedQueueMode"] ?: "",
            state.metadata["detectedQueueMode"] ?: "",
            state.metadata["queueMode"] ?: "",
            state.metadata["hasValidStage"] ?: "",
            next
        ).joinToString("|")
        val now = System.currentTimeMillis()
        if (signature == lastTraceSignature) {
            if (now - lastHeartbeatTraceAtMs >= TRACE_HEARTBEAT_MS) {
                lastHeartbeatTraceAtMs = now
                info(
                    "Heartbeat status=${lastSnapshot.status} frontend=${state.metadata["frontendState"] ?: ""} " +
                        "reason=${state.metadata["reason"] ?: ""} " +
                        "mode=${state.metadata["queueMode"] ?: ""}/${state.metadata["detectedQueueMode"] ?: ""}/${state.metadata["requestedQueueMode"] ?: ""} " +
                        "room=${state.metadata["matchRoomState"] ?: ""} title=${state.metadata["lobbyTitleRaw"] ?: ""}"
                )
            }
            return
        }
        lastTraceSignature = signature
        lastHeartbeatTraceAtMs = now
        info(
            "State stage=${state.stageText.ifBlank { "?" }} type=${state.stageType} gold=${state.gold} lv=${state.level} " +
                "shop=${state.shop.size} first=$firstShop next=$next raw=${state.metadata["shopRaw"] ?: ""} src=${state.metadata["shopSource"] ?: ""} " +
                "mode=${state.metadata["queueMode"] ?: ""}/${state.metadata["detectedQueueMode"] ?: ""}/${state.metadata["requestedQueueMode"] ?: ""} " +
                "combat=${state.metadata["combatState"] ?: ""} loot=${state.metadata["lootState"] ?: ""} " +
                "lootAt=${state.metadata["lootX"] ?: ""},${state.metadata["lootY"] ?: ""} " +
                "anvil=${state.metadata["anvilState"] ?: ""} anvilAt=${state.metadata["anvilX"] ?: ""},${state.metadata["anvilY"] ?: ""} " +
                "players=${state.metadata["playerListState"] ?: ""} shopOverlay=${state.metadata["shopOverlayState"] ?: ""} " +
                "sidePanel=${state.metadata["sidePanelState"] ?: ""} " +
                "goldSource=${state.metadata["goldSource"] ?: ""} " +
                "bench=${state.metadata["benchFullState"] ?: ""}/${state.metadata["benchOccupiedSlots"] ?: ""} " +
                "items=${state.metadata["itemCount"] ?: state.items.size.toString()} " +
                "valid=${state.metadata["hasValidStage"] ?: ""} reason=${state.metadata["reason"] ?: ""}"
        )
    }

    private data class LootBucketHit(
        val x: Float,
        val y: Float,
        val untilMs: Long
    )

    private data class LootStageHit(
        val stageKey: String,
        val untilMs: Long
    )

    private data class LootPointAttempt(
        val x: Float,
        val y: Float,
        val untilMs: Long
    )

    companion object {
        private const val TAG = "TftAutomation"
        private const val ACTION_COOLDOWN_MS = 1_500L
        private const val REPEAT_RESET_MS = 20_000L
        private const val LEVEL_UP_REPEAT_LIMIT = 6
        private const val BUY_SLOT_BLOCK_MS = 30_000L
        private const val VISUAL_BUY_SLOT_BLOCK_MS = 60_000L
        private const val MOVE_ACTION_BLOCK_MS = 15_000L
        private const val EQUIP_ACTION_BLOCK_MS = 12_000L
        private const val LOOT_ACTION_BLOCK_MS = 20_000L
        private const val LOOT_FAILED_FAST_RETRY_BLOCK_MS = 3_000L
        private const val REPEATED_LOOT_ACTION_BLOCK_MS = 60_000L
        private const val LOOT_REPEAT_MEMORY_MS = 90_000L
        private const val LOOT_STAGE_ACTION_WINDOW_MS = 45_000L
        private const val MAX_LOOT_ACTIONS_PER_STAGE_WINDOW = 7
        private const val LOOT_BUCKET_GRID = 20
        private const val LOOT_HISTORY_PER_BUCKET = 4
        private const val LOOT_POINT_MEMORY_LIMIT = 16
        private const val LOOT_NEIGHBOR_BUCKET_RANGE = 1
        private const val LOOT_NEIGHBOR_RADIUS_X = 0.08f
        private const val LOOT_NEIGHBOR_RADIUS_Y = 0.12f
        private const val RETURN_HOME_BLOCK_MS = 18_000L
        private const val ANVIL_ACTION_BLOCK_MS = 20_000L
        private const val LEVEL_UP_RETRY_BLOCK_MS = 20_000L
        private const val UPDATE_RETRY_BLOCK_MS = 30_000L
        private const val UPDATE_FAILURE_LONG_BLOCK_MS = 300_000L
        private const val CHOICE_ACTION_BLOCK_MS = 90_000L
        private const val CHOICE_RETRY_BLOCK_MS = 8_000L
        private const val STACKED_GLOBAL_BACK_SUPPRESS_MS = 12_000L
        private const val FRONTEND_ACTION_WARMUP_MS = 15_000L
        private const val RECENT_INGAME_FRONTEND_SUPPRESS_MS = 60_000L
        private const val RECENT_SETTINGS_CLOSE_SUPPRESS_MS = 90_000L
        private const val RECENT_INGAME_LAUNCHER_HOME_STABLE_MS = 10_000L
        private const val RECENT_INGAME_RESULT_SUPPRESS_MS = 90_000L
        private const val RECENT_INGAME_MODAL_RESULT_ALLOW_MS = 30_000L
        private const val RECENT_INGAME_DIALOG_SUPPRESS_MS = 90_000L
        private const val RECENT_RESULT_GAMEPLAY_SUPPRESS_MS = 120_000L
        private const val RECENT_LOADING_START_SUPPRESS_MS = 1_000L
        private const val STUCK_LOADING_RECOVERY_MS = 180_000L
        private const val STUCK_LOADING_RECOVERY_COOLDOWN_MS = 180_000L
        private const val STUCK_UPDATE_READY_RECOVERY_MS = 180_000L
        private const val STUCK_UPDATE_READY_RECOVERY_COOLDOWN_MS = 180_000L
        private const val STUCK_UNVERIFIED_MODE_SELECT_RECOVERY_MS = 120_000L
        private const val STUCK_UNVERIFIED_MODE_SELECT_RECOVERY_COOLDOWN_MS = 180_000L
        private const val RECENT_MODE_SELECT_START_SUPPRESS_MS = 3_000L
        private const val REQUIRED_START_READY_CONFIRMATIONS = 2
        private const val REQUIRED_LAUNCHER_HOME_CONFIRMATIONS = 3
        private const val REQUIRED_RESULT_CONFIRMATIONS = 2
        private const val REQUIRED_RESULT_STABLE_MS = 8_000L
        private const val REQUIRED_MODAL_RESULT_STABLE_MS = 120_000L
        private const val OCR_CONFIRMED_RESULT_RETRY_WINDOW_MS = 60_000L
        private const val TRACE_HEARTBEAT_MS = 60_000L
        private const val SERVER_ERROR_WINDOW_MS = 120_000L
        private const val SERVER_ERROR_CONFIRM_LIMIT = 2
    }
}
