package com.tfthextech.helper.vision

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.chinese.ChineseTextRecognizerOptions
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import com.google.mlkit.vision.text.TextRecognizer
import com.tfthextech.helper.protocol.AugmentOffer
import com.tfthextech.helper.protocol.ObservedState
import com.tfthextech.helper.protocol.ObservedUnit
import com.tfthextech.helper.protocol.PointF01
import com.tfthextech.helper.protocol.ShopOffer
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicReference

internal object AndroidFastHudShopMerger {
    fun merge(fastState: ObservedState, last: ObservedState): ObservedState {
        val stableState = withStableResources(fastState, last)
        if (fastState.metadata["reason"] != "android-fast-hud") {
            return stableState
        }
        val fastHasTrustedShop = fastState.shop.isNotEmpty() && !isVisualFallbackShop(fastState)
        if (fastHasTrustedShop) {
            return stableState
        }
        if (last.metadata["reason"] != "android-mlkit-hud") {
            return stableState
        }
        if (fastState.metadata["shopOverlayState"] != "open") {
            return stableState
        }
        if (last.stageText.isNotBlank() && last.stageText != fastState.stageText) {
            return stableState
        }
        if (last.shop.isEmpty()) {
            return stableState.copy(
                metadata = stableState.metadata + mapOf(
                    "shopRaw" to (last.metadata["shopRaw"] ?: ""),
                    "shopSource" to "last-ocr-empty"
                )
            )
        }
        return stableState.copy(
            shop = last.shop,
            metadata = stableState.metadata + mapOf(
                "shopCount" to last.shop.size.toString(),
                "shopRaw" to (last.metadata["shopRaw"] ?: ""),
                "shopSource" to mergedShopSource(fastState, last)
            ) + shopOcrAgeMetadata(fastState, last)
        )
    }

    private fun withStableResources(state: ObservedState, last: ObservedState): ObservedState {
        if (!isFastInGameVisual(state)) {
            return state
        }
        val canCarry = last.stageType == "NORMAL" && canCarryForward(state, last)
        var next = state
        var metadata = state.metadata
        if (isLikelyForwardStageSpike(state, last, canCarry)) {
            next = next.copy(stageText = last.stageText)
            metadata = metadata + mapOf(
                "stageSource" to "last-stable-spike",
                "stageRawParsed" to state.stageText
            )
        }
        val levelCap = plausibleLevelCap(next.stageText)
        if (levelCap != null && state.level > levelCap) {
            val carriedLevel = if (canCarry && last.level in 2..levelCap) last.level else null
            next = next.copy(level = carriedLevel ?: levelCap)
            metadata = metadata + mapOf(
                "levelSource" to if (carriedLevel != null) "last-stable-capped" else "stage-cap",
                "levelRawParsed" to state.level.toString()
            )
        }
        if (next.level <= 1 && canCarry && last.level in 2..10) {
            next = next.copy(level = last.level)
            metadata = metadata + mapOf("levelSource" to "last-stable")
        }
        if (next.level in 2..10 && canCarry && last.level in (next.level + 1)..10) {
            next = next.copy(level = last.level)
            metadata = metadata + mapOf(
                "levelSource" to "last-stable-regression",
                "levelRawParsed" to state.level.toString()
            )
        }
        if (next.gold == 0 && canCarry && last.gold in 1..200) {
            next = next.copy(gold = last.gold)
            metadata = metadata + mapOf("goldSource" to "last-stable")
        }
        if (isLikelyLeadingOneGoldNoise(next.gold, last.gold, canCarry)) {
            next = next.copy(gold = last.gold)
            metadata = metadata + mapOf(
                "goldSource" to "last-stable",
                "goldRawParsed" to state.gold.toString()
            )
        }
        return next.copy(metadata = metadata)
    }

    private fun isLikelyLeadingOneGoldNoise(currentGold: Int, lastGold: Int, canCarry: Boolean): Boolean {
        if (!canCarry || currentGold < 100 || lastGold !in 1..99) {
            return false
        }
        val jump = currentGold - lastGold
        return jump in 90..110
    }

    private fun isLikelyForwardStageSpike(state: ObservedState, last: ObservedState, canCarry: Boolean): Boolean {
        if (!canCarry) {
            return false
        }
        val current = stageParts(state.stageText) ?: return false
        val previous = stageParts(last.stageText) ?: return false
        if (current.first <= previous.first) {
            return false
        }
        return current.first - previous.first >= 2
    }

    private fun isFastInGameVisual(state: ObservedState): Boolean {
        val reason = state.metadata["reason"]
        return state.stageType == "NORMAL" && (reason == "android-fast-hud" || reason == "android-side-panel-visual")
    }

    private fun canCarryForward(state: ObservedState, last: ObservedState): Boolean {
        if (last.stageText.isBlank() || state.stageText.isBlank()) {
            return false
        }
        val currentOrder = stageOrder(state.stageText) ?: return false
        val lastOrder = stageOrder(last.stageText) ?: return false
        if (lastOrder > currentOrder) {
            return false
        }
        val currentObservedAt = state.metadata["observedAtMs"]?.toLongOrNull()
        val lastObservedAt = last.metadata["observedAtMs"]?.toLongOrNull()
        if (currentObservedAt != null && lastObservedAt != null && currentObservedAt - lastObservedAt > RESOURCE_CARRY_FORWARD_MS) {
            return false
        }
        return true
    }

    private fun stageOrder(stageText: String): Int? {
        val (major, minor) = stageParts(stageText) ?: return null
        return major * 10 + minor
    }

    private fun stageParts(stageText: String): Pair<Int, Int>? {
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(stageText) ?: return null
        val major = match.groupValues[1].toIntOrNull() ?: return null
        val minor = match.groupValues[2].toIntOrNull() ?: return null
        return major to minor
    }

    private fun plausibleLevelCap(stageText: String): Int? {
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(stageText) ?: return null
        val major = match.groupValues[1].toIntOrNull() ?: return null
        val minor = match.groupValues[2].toIntOrNull() ?: return null
        return when {
            major <= 1 -> 3
            major == 2 && minor <= 1 -> 4
            major == 2 -> 6
            major == 3 -> 7
            major == 4 -> 8
            else -> 10
        }
    }

    private fun isVisualFallbackShop(state: ObservedState): Boolean {
        return state.metadata["shopSource"] == "visual-fallback" ||
            state.shop.isNotEmpty() && state.shop.all { it.unit?.name?.startsWith("商店位") == true }
    }

    private fun mergedShopSource(fastState: ObservedState, last: ObservedState): String {
        if (isVisualFallbackShop(last)) {
            return "last-visual-shop"
        }
        val ageMs = shopOcrAgeMs(fastState, last)
        return if (ageMs != null && ageMs in 0..FRESH_MERGED_SHOP_OCR_MS) "last-ocr-fresh" else "last-ocr"
    }

    private fun shopOcrAgeMetadata(fastState: ObservedState, last: ObservedState): Map<String, String> {
        val ageMs = shopOcrAgeMs(fastState, last) ?: return emptyMap()
        return mapOf("shopOcrAgeMs" to ageMs.toString())
    }

    private fun shopOcrAgeMs(fastState: ObservedState, last: ObservedState): Long? {
        val fastObservedAtMs = fastState.metadata["observedAtMs"]?.toLongOrNull() ?: return null
        val lastObservedAtMs = last.metadata["observedAtMs"]?.toLongOrNull() ?: return null
        return fastObservedAtMs - lastObservedAtMs
    }

    private const val FRESH_MERGED_SHOP_OCR_MS = 3_000L
    private const val RESOURCE_CARRY_FORWARD_MS = 10_000L
}

internal object AndroidChoiceStageGate {
    fun allowsVisualChoice(stageText: String?): Boolean {
        if (stageText.isNullOrBlank()) {
            return false
        }
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

    fun allowsDetectedVisualChoice(stageText: String?, detected: Boolean): Boolean {
        return detected && allowsVisualChoice(stageText)
    }
}

internal object AndroidShopOcrLoadPolicy {
    fun shouldRunShopOcr(shopOverlay: Boolean): Boolean {
        return shopOverlay
    }
}

internal object AndroidFrameOcrSafetyPolicy {
    fun shouldRunOcr(frame: Bitmap): Boolean {
        if (frame.width <= 0 || frame.height <= 0 || frame.isRecycled) {
            return false
        }
        val sampleStepX = (frame.width / SAMPLE_COLUMNS).coerceAtLeast(1)
        val sampleStepY = (frame.height / SAMPLE_ROWS).coerceAtLeast(1)
        var samples = 0
        var visiblePixels = 0
        var coloredPixels = 0
        var y = 0
        while (y < frame.height) {
            var x = 0
            while (x < frame.width) {
                val pixel = frame.getPixel(x, y)
                if (isVisiblePixel(pixel)) {
                    visiblePixels += 1
                }
                if (isColoredPixel(pixel)) {
                    coloredPixels += 1
                }
                samples += 1
                x += sampleStepX
            }
            y += sampleStepY
        }
        return shouldRunOcr(samples, visiblePixels, coloredPixels)
    }

    fun shouldRunOcr(pixels: IntArray): Boolean {
        if (pixels.isEmpty()) {
            return false
        }
        var visiblePixels = 0
        var coloredPixels = 0
        pixels.forEach { pixel ->
            if (isVisiblePixel(pixel)) {
                visiblePixels += 1
            }
            if (isColoredPixel(pixel)) {
                coloredPixels += 1
            }
        }
        return shouldRunOcr(pixels.size, visiblePixels, coloredPixels)
    }

    private fun shouldRunOcr(samples: Int, visiblePixels: Int, coloredPixels: Int): Boolean {
        if (samples <= 0) {
            return false
        }
        val visibleRatio = visiblePixels.toFloat() / samples.toFloat()
        val coloredRatio = coloredPixels.toFloat() / samples.toFloat()
        return visibleRatio >= MIN_VISIBLE_PIXEL_RATIO || coloredRatio >= MIN_COLORED_PIXEL_RATIO
    }

    private fun isVisiblePixel(pixel: Int): Boolean {
        val red = pixel shr 16 and 0xff
        val green = pixel shr 8 and 0xff
        val blue = pixel and 0xff
        return red >= MIN_VISIBLE_CHANNEL || green >= MIN_VISIBLE_CHANNEL || blue >= MIN_VISIBLE_CHANNEL
    }

    private fun isColoredPixel(pixel: Int): Boolean {
        val red = pixel shr 16 and 0xff
        val green = pixel shr 8 and 0xff
        val blue = pixel and 0xff
        val max = maxOf(red, green, blue)
        val min = minOf(red, green, blue)
        return max >= MIN_COLORED_CHANNEL && max - min >= MIN_COLOR_SPREAD
    }

    private const val SAMPLE_COLUMNS = 96
    private const val SAMPLE_ROWS = 54
    private const val MIN_VISIBLE_CHANNEL = 34
    private const val MIN_COLORED_CHANNEL = 26
    private const val MIN_COLOR_SPREAD = 24
    private const val MIN_VISIBLE_PIXEL_RATIO = 0.015f
    private const val MIN_COLORED_PIXEL_RATIO = 0.006f
}

internal object AndroidFrontendDialogGuard {
    fun shouldSuppressQueueConfirm(
        acceptReady: Boolean,
        loadingScreen: Boolean,
        modeSelect: Boolean,
        matchRoom: Boolean,
        startReady: Boolean,
        matchmakingQueue: Boolean,
        acceptedWaiting: Boolean
    ): Boolean {
        return acceptReady || matchmakingQueue || acceptedWaiting
    }
}

class MlKitHudFrameObserver : FrameObserver {
    private val latinRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
    private val chineseRecognizer = TextRecognition.getClient(ChineseTextRecognizerOptions.Builder().build())
    private val inFlight = AtomicBoolean(false)
    @Volatile
    private var inFlightStartedAtMs: Long = 0L
    private val lastState = AtomicReference(
        ObservedState(
            stageType = "UNKNOWN",
            metadata = mapOf("hasValidStage" to "false", "reason" to "ocr-not-started")
        )
    )

    override fun observe(bitmap: Bitmap?): ObservedState {
        if (bitmap == null) {
            val state = ObservedState(
                stageType = "UNKNOWN",
                metadata = mapOf("hasValidStage" to "false", "reason" to "no-capture-frame")
            )
            lastState.set(state)
            return state
        }

        val now = System.currentTimeMillis()
        val fastState = observeFastFrontend(bitmap)
        if (fastState != null) {
            val freshQueueModeState = freshQueueModeOcrState(fastState, now)
            if (freshQueueModeState != null) {
                return freshQueueModeState
            }
            val waitsForQueueModeOcr = waitsForQueueModeOcr(fastState)
            val state = mergeFastHudWithLastOcr(fastState, lastState.get())
            if (!waitsForQueueModeOcr && state.metadata["reason"] != "android-fast-hud" && state.metadata["reason"] != "android-result-visual") {
                lastState.set(state)
                return state
            }
            if (!waitsForQueueModeOcr && lastState.get().metadata["reason"] != "android-mlkit-hud") {
                lastState.set(state)
            }
        }

        if (inFlight.get() && now - inFlightStartedAtMs > OCR_IN_FLIGHT_TIMEOUT_MS) {
            inFlight.set(false)
        }

        if (inFlight.compareAndSet(false, true)) {
            inFlightStartedAtMs = now
            if (AndroidFrameOcrSafetyPolicy.shouldRunOcr(bitmap)) {
                runOcr(bitmap.copy(Bitmap.Config.ARGB_8888, false))
            } else {
                inFlight.set(false)
                val blankState = ObservedState(
                    stageType = "UNKNOWN",
                    metadata = mapOf(
                        "hasValidStage" to "false",
                        "reason" to "blank-frame",
                        "frontendState" to "blank",
                        "observedAtMs" to now.toString()
                    )
                )
                lastState.set(blankState)
            }
        }

        if (fastState != null && waitsForQueueModeOcr(fastState)) {
            return fastState
        }

        val last = lastState.get()
        if (fastState?.metadata?.get("reason") == "android-result-visual" &&
            last.metadata["reason"] == "android-result-screen" &&
            last.metadata["resultState"] == "finished"
        ) {
            return last.copy(
                metadata = last.metadata + mapOf(
                    "resultLayout" to (fastState.metadata["resultLayout"] ?: "")
                )
            )
        }
        return fastState?.let { mergeFastHudWithLastOcr(it, last) } ?: last
    }

    private fun waitsForQueueModeOcr(state: ObservedState): Boolean {
        val frontendState = state.metadata["frontendState"]
        return frontendState == "start-ready" || frontendState == "accept-ready"
    }

    private fun freshQueueModeOcrState(fastState: ObservedState, now: Long): ObservedState? {
        if (!waitsForQueueModeOcr(fastState)) {
            return null
        }
        if (fastState.metadata["detectedQueueMode"] == "normal") {
            return fastState.copy(
                metadata = fastState.metadata + mapOf(
                    "queueModeProof" to "visual-current",
                    "queueModeProofAgeMs" to "0"
                )
            )
        }
        val last = lastState.get()
        val detectedQueueMode = last.metadata["detectedQueueMode"] ?: ""
        if (detectedQueueMode != "normal" && detectedQueueMode != "ranked") {
            return null
        }
        if (last.metadata["frontendState"] != fastState.metadata["frontendState"]) {
            return null
        }
        val observedAtMs = last.metadata["observedAtMs"]?.toLongOrNull() ?: return null
        val ageMs = now - observedAtMs
        if (ageMs !in 0..QUEUE_MODE_OCR_FRESH_MS) {
            return null
        }
        return fastState.copy(
            metadata = fastState.metadata + mapOf(
                "detectedQueueMode" to detectedQueueMode,
                "lobbyTitleRaw" to (last.metadata["lobbyTitleRaw"] ?: ""),
                "frontendRaw" to (last.metadata["frontendRaw"] ?: fastState.metadata["frontendRaw"] ?: ""),
                "dialogRaw" to (last.metadata["dialogRaw"] ?: fastState.metadata["dialogRaw"] ?: ""),
                "queueModeProof" to "ocr-current",
                "queueModeProofAgeMs" to ageMs.toString()
            )
        )
    }

    private fun mergeFastHudWithLastOcr(fastState: ObservedState, last: ObservedState): ObservedState {
        return AndroidFastHudShopMerger.merge(fastState, last)
    }

    private fun observeFastFrontend(frame: Bitmap): ObservedState? {
        val crops = HudCrops.from(frame)
        val visualStage = AndroidNumericHudVisualParser.parseStage(frame)
        val topBarOrStage = AndroidFrontendVisualDetector.detectInGameTopBar(frame) || visualStage != null
        val rawRightPlayerList = AndroidFrontendVisualDetector.detectRightPlayerList(frame)
        val inGameContext = topBarOrStage || rawRightPlayerList
        val launcherHome = AndroidFrontendVisualDetector.detectBlueStacksLauncherHome(frame) ||
            AndroidFrontendVisualDetector.detectBlueStacksAppCenter(frame)
        val shopOverlay = AndroidFrontendVisualDetector.detectInGameShopOverlay(frame)
        val rawProminentConfirmDialog = AndroidDialogVisualDetector.detectProminentConfirmDialog(frame)
        val broadAugmentChoice = inGameContext && !rawProminentConfirmDialog && AndroidFrontendVisualDetector.detectAugmentChoice(frame)
        val giftChoice = !rawProminentConfirmDialog && AndroidFrontendVisualDetector.detectGiftChoice(frame)
        val broadEncounterChoice = (inGameContext && !rawProminentConfirmDialog && AndroidFrontendVisualDetector.detectEncounterChoice(frame)) || giftChoice
        val scoreboardResult = AndroidResultVisualDetector.detectScoreboardResultScreen(frame)
        val modalResult = AndroidResultVisualDetector.detectModalResultScreen(frame)
        val resultScreen = AndroidResultVisualDetector.shouldTreatAsVisualResult(
            topBarOrStage,
            scoreboardResult,
            modalResult,
            choiceVisible = broadAugmentChoice || broadEncounterChoice,
            rightPlayerListVisible = rawRightPlayerList
        )
        val rawSettingsDialog = AndroidFrontendVisualDetector.detectSettingsDialog(frame)
        val visualChoiceModal = rawSettingsDialog && inGameContext && broadAugmentChoice
        val settingsDialog = rawSettingsDialog && !visualChoiceModal
        val prominentDialogVisualConfirm = rawProminentConfirmDialog &&
            !broadAugmentChoice &&
            !broadEncounterChoice
        val acceptReady = !launcherHome && !inGameContext && AndroidFrontendVisualDetector.detectAcceptReadyButton(crops.dialog)
        val careerHistory = !launcherHome && !inGameContext && AndroidFrontendVisualDetector.detectCareerHistoryScreen(frame)
        val loadingScreen = !launcherHome && !inGameContext && AndroidFrontendVisualDetector.detectLoadingScreen(frame)
        val modeRoomCustomization = !launcherHome &&
            !inGameContext &&
            !careerHistory &&
            !loadingScreen &&
            !prominentDialogVisualConfirm &&
            AndroidFrontendVisualDetector.detectModeRoomCustomizationOverlay(frame)
        val modeSelect = !launcherHome &&
            !inGameContext &&
            !careerHistory &&
            !loadingScreen &&
            !prominentDialogVisualConfirm &&
            !modeRoomCustomization &&
            AndroidFrontendVisualDetector.detectModeSelect(frame)
        val matchRoom = !launcherHome && !inGameContext && !careerHistory && AndroidFrontendVisualDetector.detectMatchRoom(frame)
        val normalModeOption = !launcherHome &&
            !inGameContext &&
            !careerHistory &&
            AndroidFrontendVisualDetector.detectNormalModeOption(frame)
        val modeStartButton = modeSelect && AndroidFrontendVisualDetector.detectStartButton(frame)
        val startReady = !resultScreen &&
            !launcherHome &&
            !loadingScreen &&
            !shopOverlay &&
            !inGameContext &&
            !broadAugmentChoice &&
            !broadEncounterChoice &&
            AndroidFrontendVisualDetector.detectStartButton(crops.frontend)
        val matchmakingQueue = !launcherHome && !inGameContext && AndroidFrontendVisualDetector.detectMatchmakingTimer(frame)
        val acceptedWaiting = !launcherHome && !inGameContext && !modeSelect && !matchmakingQueue && AndroidFrontendVisualDetector.detectAcceptedWaitingScreen(frame)
        val tapToContinue = !inGameContext &&
            !launcherHome &&
            !loadingScreen &&
            !startReady &&
            !acceptReady &&
            !acceptedWaiting &&
            !matchmakingQueue &&
            !modeSelect &&
            !modeRoomCustomization &&
            AndroidFrontendVisualDetector.detectTapToContinueScreen(frame)
        val updateReady = !inGameContext &&
            !launcherHome &&
            !loadingScreen &&
            !acceptReady &&
            !tapToContinue &&
            !startReady &&
            !modeSelect &&
            !modeRoomCustomization &&
            !matchRoom &&
            !matchmakingQueue &&
            !acceptedWaiting &&
            AndroidFrontendVisualDetector.detectUpdateReadyButton(frame)
        val suppressQueueConfirm = AndroidFrontendDialogGuard.shouldSuppressQueueConfirm(
            acceptReady,
            loadingScreen,
            modeSelect,
            matchRoom,
            startReady,
            matchmakingQueue,
            acceptedWaiting
        )
        val centeredDialogVisualConfirm = !broadAugmentChoice &&
            !broadEncounterChoice &&
            (AndroidDialogVisualDetector.detectCenteredConfirmDialog(frame) ||
                prominentDialogVisualConfirm)
        val dialogVisualConfirm = !loadingScreen &&
            (!suppressQueueConfirm || centeredDialogVisualConfirm) &&
            !broadAugmentChoice &&
            !broadEncounterChoice &&
            (AndroidDialogVisualDetector.detectConfirmDialog(crops.dialog) || centeredDialogVisualConfirm)
        val twoButtonDialog = dialogVisualConfirm &&
            AndroidDialogVisualDetector.detectTwoButtonConfirmDialog(crops.dialog)
        val sidePanelOpen = inGameContext &&
            !settingsDialog &&
            !resultScreen &&
            !broadAugmentChoice &&
            !broadEncounterChoice &&
            AndroidFrontendVisualDetector.detectSidePanelOpen(frame)
        val rightPlayerList = inGameContext && rawRightPlayerList && !sidePanelOpen
        val combatHealthBars = topBarOrStage && AndroidFrontendVisualDetector.detectCombatHealthBars(frame)
        val fullBenchWarning = topBarOrStage && visualStage != null && AndroidFrontendVisualDetector.detectFullBenchWarning(frame)
        val visualBenchOccupiedSlots = if (topBarOrStage && visualStage != null && !sidePanelOpen && !resultScreen && !broadAugmentChoice && !broadEncounterChoice) {
            val pixels = IntArray(frame.width * frame.height)
            frame.getPixels(pixels, 0, frame.width, 0, 0, frame.width, frame.height)
            AndroidFrontendVisualDetector.countVisualBenchOccupiedSlots(pixels, frame.width, frame.height)
        } else {
            0
        }
        val visualBenchFull = visualBenchOccupiedSlots >= 8
        val trustedBenchFull = visualBenchFull || (fullBenchWarning && visualBenchOccupiedSlots >= 7)
        val augmentChoice = visualChoiceModal || inGameContext && (
            AndroidChoiceStageGate.allowsDetectedVisualChoice(visualStage, broadAugmentChoice) ||
                broadAugmentChoice && visualStage.isNullOrBlank()
            )
        val encounterChoice = inGameContext && (
            AndroidChoiceStageGate.allowsDetectedVisualChoice(visualStage, broadEncounterChoice) ||
                broadEncounterChoice && visualStage.isNullOrBlank()
            )
        val lootPoint = if (topBarOrStage && visualStage != null && !settingsDialog && !resultScreen && !broadAugmentChoice && !broadEncounterChoice) {
            if (combatHealthBars) AndroidLootOrbDetector.detectCombat(frame) else AndroidLootOrbDetector.detect(frame)
        } else {
            null
        }
        val anvilPoint = if (topBarOrStage && visualStage != null && !settingsDialog && !sidePanelOpen && !resultScreen && !broadAugmentChoice && !broadEncounterChoice) {
            AndroidBenchAnvilDetector.detect(frame)
        } else {
            null
        }
        val state = when {
            settingsDialog -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(frame, "android-settings-dialog-visual", frontendState = "", dialogState = "settings")
            )
            sidePanelOpen -> ObservedState(
                stageText = visualStage ?: "",
                stageType = "NORMAL",
                gold = AndroidNumericHudVisualParser.parseGold(frame, visualStage) ?: 0,
                level = AndroidNumericHudVisualParser.parseLevel(frame) ?: 1,
                metadata = mapOf(
                    "hasValidStage" to "true",
                    "reason" to "android-side-panel-visual",
                    "frontendState" to "",
                    "dialogState" to "",
                    "resultState" to "",
                    "sidePanelState" to "open",
                    "frameWidth" to frame.width.toString(),
                    "frameHeight" to frame.height.toString(),
                    "itemIconMatchCount" to "0",
                    "itemIconMatches" to "",
                    "shopCount" to "0",
                    "shopOverlayState" to if (shopOverlay) "open" else "",
                    "playerListState" to if (rightPlayerList) "visible" else "",
                    "combatState" to if (combatHealthBars) "active" else "",
                    "benchState" to if (trustedBenchFull) "full" else "",
                    "benchFullState" to if (trustedBenchFull) "full" else "",
                    "benchOccupiedSlots" to visualBenchOccupiedSlots.toString(),
                    "observedAtMs" to System.currentTimeMillis().toString()
                ) + lootMetadata(lootPoint) + anvilMetadata(anvilPoint)
            )
            resultScreen -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(
                    frame,
                    "android-result-visual",
                    frontendState = "",
                    dialogState = "",
                    resultState = "finished",
                    resultLayout = if (scoreboardResult) "scoreboard" else "modal"
                )
            )
            launcherHome -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(frame, "android-launcher-home-visual", frontendState = "launcher-home", dialogState = "")
            )
            careerHistory -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(frame, "android-frontend-career-history-visual", frontendState = "career-history", dialogState = "")
            )
            augmentChoice || encounterChoice -> ObservedState(
                stageText = visualStage ?: "",
                stageType = "AUGMENT",
                gold = AndroidNumericHudVisualParser.parseGold(frame, visualStage) ?: 0,
                level = AndroidNumericHudVisualParser.parseLevel(frame) ?: 1,
                augments = listOf(AugmentOffer(slot = if (encounterChoice) 1 else 2, name = "默认海克斯")),
                metadata = frontendMetadata(
                    frame,
                    "android-augment-visual",
                    frontendState = "",
                    dialogState = "",
                    augmentCount = 1,
                    augmentLayout = if (giftChoice) "gift" else if (encounterChoice) "encounter" else "wide"
                )
            )
            dialogVisualConfirm -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(frame, "android-dialog-visual-confirm", frontendState = "", dialogState = "confirm", dialogVisualConfirm = true) +
                    mapOf("dialogButtonLayout" to if (twoButtonDialog) "two-buttons" else "")
            )
            acceptReady -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(frame, "android-frontend-accept-ready-visual", frontendState = "accept-ready", dialogState = "", acceptVisual = true)
            )
            updateReady -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(frame, "android-frontend-update-ready-visual", frontendState = "update-ready", dialogState = "")
            )
            loadingScreen -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(frame, "android-frontend-loading-visual", frontendState = "loading", dialogState = "")
            )
            acceptedWaiting -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(frame, "android-frontend-accepted-waiting-visual", frontendState = "queue", dialogState = "")
            )
            modeRoomCustomization -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(frame, "android-frontend-mode-room-customization-visual", frontendState = "mode-room-customization", dialogState = "")
            )
            tapToContinue -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(frame, "android-frontend-tap-to-continue-visual", frontendState = "continue-ready", dialogState = "")
            )
            modeSelect -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(
                    frame,
                    "android-frontend-mode-select-visual",
                    frontendState = "mode-select",
                    dialogState = "",
                    frontendVisualStart = modeStartButton,
                    detectedQueueMode = if (normalModeOption) "normal" else "",
                    modeVisualNormal = normalModeOption,
                    modeVisualSelect = true
                )
            )
            startReady -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(
                    frame,
                    "android-frontend-start-ready-visual",
                    frontendState = "start-ready",
                    dialogState = "",
                    frontendVisualStart = true,
                    detectedQueueMode = if (!matchRoom && normalModeOption) "normal" else "",
                    modeVisualNormal = normalModeOption,
                    modeVisualSelect = modeSelect,
                    matchRoomState = if (matchRoom) "room" else "home",
                    homeNormalModeVisible = !matchRoom && normalModeOption
                )
            )
            matchmakingQueue -> ObservedState(
                stageType = "FRONTEND",
                metadata = frontendMetadata(frame, "android-frontend-matchmaking-visual", frontendState = "queue", dialogState = "")
            )
            visualStage != null -> {
                val fastGold = AndroidNumericHudVisualParser.parseGold(frame, visualStage) ?: 0
                val fastShop = if (shopOverlay && fastGold > 0) visualShopFallback() else emptyList()
                val fastItems = visualItemNames(crops)
                ObservedState(
                    stageText = visualStage,
                    stageType = "NORMAL",
                    gold = fastGold,
                    level = AndroidNumericHudVisualParser.parseLevel(frame) ?: 1,
                    shop = fastShop,
                    items = fastItems,
                    metadata = mapOf(
                        "hasValidStage" to "true",
                        "reason" to "android-fast-hud",
                        "frontendState" to "",
                        "dialogState" to "",
                        "resultState" to "",
                        "frameWidth" to frame.width.toString(),
                        "frameHeight" to frame.height.toString(),
                        "itemCount" to fastItems.size.toString(),
                        "itemVisualCount" to fastItems.size.toString(),
                        "itemIconMatchCount" to "0",
                        "itemIconMatches" to "",
                        "shopCount" to fastShop.size.toString(),
                        "shopRaw" to if (fastShop.isNotEmpty()) "visual-shop-slots" else "",
                        "shopSource" to if (fastShop.isNotEmpty()) "visual-fallback" else "",
                        "shopOverlayState" to if (shopOverlay) "open" else "",
                        "playerListState" to if (rightPlayerList) "visible" else "",
                        "combatState" to if (combatHealthBars) "active" else "",
                        "benchState" to if (trustedBenchFull) "full" else "",
                        "benchFullState" to if (trustedBenchFull) "full" else "",
                        "benchOccupiedSlots" to visualBenchOccupiedSlots.toString(),
                        "observedAtMs" to System.currentTimeMillis().toString()
                    ) + lootMetadata(lootPoint) + anvilMetadata(anvilPoint)
                )
            }
            else -> null
        }
        recycleCrops(crops)
        return state
    }

    private fun frontendMetadata(
        frame: Bitmap,
        reason: String,
        frontendState: String,
        dialogState: String,
        frontendVisualStart: Boolean = false,
        dialogVisualConfirm: Boolean = false,
        acceptVisual: Boolean = false,
        resultState: String = "",
        resultLayout: String = "",
        augmentCount: Int = 0,
        augmentLayout: String = "",
        detectedQueueMode: String = "",
        modeVisualNormal: Boolean = false,
        modeVisualSelect: Boolean = false,
        matchRoomState: String = "",
        homeNormalModeVisible: Boolean = false
    ): Map<String, String> {
        return mapOf(
            "hasValidStage" to "true",
            "reason" to reason,
            "frontendState" to frontendState,
            "dialogState" to dialogState,
            "resultState" to resultState,
            "resultLayout" to resultLayout,
            "frameWidth" to frame.width.toString(),
            "frameHeight" to frame.height.toString(),
            "frontendVisualStart" to frontendVisualStart.toString(),
            "dialogVisualConfirm" to dialogVisualConfirm.toString(),
            "acceptVisual" to acceptVisual.toString(),
            "detectedQueueMode" to detectedQueueMode,
            "modeVisualNormal" to modeVisualNormal.toString(),
            "modeVisualSelect" to modeVisualSelect.toString(),
            "homeNormalModeVisible" to homeNormalModeVisible.toString(),
            "observedAtMs" to System.currentTimeMillis().toString(),
            "augmentCount" to augmentCount.toString(),
            "augmentLayout" to augmentLayout,
            "matchRoomState" to matchRoomState,
            "itemIconMatchCount" to "0",
            "itemIconMatches" to ""
        )
    }

    private fun runOcr(frame: Bitmap) {
        val crops = HudCrops.from(frame)
        val shopOverlay = AndroidFrontendVisualDetector.detectInGameShopOverlay(frame)
        val shopSlotCrops = if (AndroidShopOcrLoadPolicy.shouldRunShopOcr(shopOverlay)) crops.shop else emptyList()
        val shopFullCrops = if (AndroidShopOcrLoadPolicy.shouldRunShopOcr(shopOverlay)) crops.shopFull else emptyList()
        recognize(crops.stage) { stageText ->
            recognize(crops.gold) { goldText ->
                recognize(crops.level) { levelText ->
                    recognizeChinese(crops.result) { resultText ->
                        recognizeChinese(crops.items) { itemText ->
                            recognizeChinese(crops.augment) { augmentText ->
                            recognizeChinese(crops.frontend) { frontendText ->
                                recognizeChinese(crops.dialog) { dialogText ->
                                    recognizeChinese(crops.lobbyTitle) { lobbyTitleText ->
                                        recognizeShop(shopSlotCrops, 0, emptyList()) { shopTexts ->
                                            recognizeShop(shopFullCrops, 0, emptyList()) { shopFullTexts ->
                                                lastState.set(buildState(frame, crops, stageText, goldText, levelText, resultText, itemText, augmentText, frontendText, dialogText, lobbyTitleText, shopTexts, shopFullTexts))
                                                frame.recycle()
                                                recycleCrops(crops)
                                                inFlight.set(false)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private fun recognize(bitmap: Bitmap, onDone: (String) -> Unit) {
        recognizeWith(latinRecognizer, bitmap, onDone)
    }

    private fun recognizeChinese(bitmap: Bitmap, onDone: (String) -> Unit) {
        recognizeWith(chineseRecognizer, bitmap, onDone)
    }

    private fun recognizeWith(recognizer: TextRecognizer, bitmap: Bitmap, onDone: (String) -> Unit) {
        recognizer.process(InputImage.fromBitmap(bitmap, 0))
            .addOnSuccessListener { result -> onDone(result.text) }
            .addOnFailureListener { error -> onDone("ocr-error:${error.javaClass.simpleName}") }
    }

    private fun recognizeShop(
        crops: List<Bitmap>,
        index: Int,
        results: List<String>,
        onDone: (List<String>) -> Unit
    ) {
        val crop = crops.getOrNull(index)
        if (crop == null) {
            onDone(results)
            return
        }

        recognizeChinese(crop) { text ->
            recognizeShop(crops, index + 1, results + text, onDone)
        }
    }

    private fun buildState(
        frame: Bitmap,
        crops: HudCrops,
        stageText: String,
        goldText: String,
        levelText: String,
        resultText: String,
        itemText: String,
        augmentText: String,
        frontendText: String,
        dialogText: String,
        lobbyTitleText: String,
        shopTexts: List<String>,
        shopFullTexts: List<String>
    ): ObservedState {
        val visualStage = AndroidNumericHudVisualParser.parseStage(frame)
        val inGameTopBar = AndroidFrontendVisualDetector.detectInGameTopBar(frame) || visualStage != null
        val rawRightPlayerList = inGameTopBar && AndroidFrontendVisualDetector.detectRightPlayerList(frame)
        val hasResultText = isResultScreen(resultText)
        val scoreboardResult = AndroidResultVisualDetector.detectScoreboardResultScreen(frame)
        val modalResult = AndroidResultVisualDetector.detectModalResultScreen(frame)
        val visualResultScreen = AndroidResultVisualDetector.shouldTreatAsVisualResult(
            liveHudVisible = inGameTopBar,
            scoreboardResult = scoreboardResult,
            modalResult = modalResult,
            rightPlayerListVisible = rawRightPlayerList
        )
        val isResultScreen = hasResultText && visualResultScreen || scoreboardResult && !inGameTopBar
        val rawProminentConfirmDialog = !isResultScreen && AndroidDialogVisualDetector.detectProminentConfirmDialog(frame)
        val broadAugmentChoice = !isResultScreen && inGameTopBar && !rawProminentConfirmDialog && AndroidFrontendVisualDetector.detectAugmentChoice(frame)
        val giftChoice = !isResultScreen && !rawProminentConfirmDialog && AndroidFrontendVisualDetector.detectGiftChoice(frame)
        val broadEncounterChoice = (!isResultScreen && inGameTopBar && !rawProminentConfirmDialog && AndroidFrontendVisualDetector.detectEncounterChoice(frame)) || giftChoice
        val rawSettingsDialog = !isResultScreen && AndroidFrontendVisualDetector.detectSettingsDialog(frame)
        val stage = if (isResultScreen) null else AndroidNumericHudVisualParser.chooseStage(stageText, visualStage)
        val ocrGold = parseBoundedInt(goldText, 0, 200)
        val visualGold = AndroidNumericHudVisualParser.parseGold(frame)
        val gold = AndroidNumericHudVisualParser.chooseGoldForStage(
            ocrGold,
            visualGold,
            stage
        ) ?: 0
        val goldSource = AndroidNumericHudVisualParser.goldSourceForStage(ocrGold, visualGold, gold, stage)
        val level = parseBoundedInt(levelText, 1, 10) ?: AndroidNumericHudVisualParser.parseLevel(frame) ?: 1
        val shopOverlay = !isResultScreen && inGameTopBar && AndroidFrontendVisualDetector.detectInGameShopOverlay(frame)
        val parsedSlotShop = if (isResultScreen) {
            emptyList()
        } else {
            AndroidShopTextParser.parseSlotOffers(
                shopTexts.mapIndexed { index, text -> (index % SHOP_SLOT_COUNT + 1) to text }
            )
        }
        val parsedFullShop = if (isResultScreen || parsedSlotShop.isNotEmpty()) emptyList() else AndroidShopTextParser.parseFullOffers(shopFullTexts)
        val parsedShop = parsedSlotShop.ifEmpty { parsedFullShop }
        val shop = if (parsedShop.isNotEmpty()) parsedShop else if (shopOverlay && gold > 0) visualShopFallback() else emptyList()
        val visualChoiceModal = rawSettingsDialog && inGameTopBar && broadAugmentChoice
        val settingsDialog = rawSettingsDialog && !visualChoiceModal
        val visualAugmentChoice = visualChoiceModal ||
            AndroidChoiceStageGate.allowsDetectedVisualChoice(stage, broadAugmentChoice) ||
            broadAugmentChoice && stage == null
        val visualEncounterChoice = AndroidChoiceStageGate.allowsDetectedVisualChoice(stage, broadEncounterChoice) ||
            broadEncounterChoice && stage == null
        val rightPlayerList = !isResultScreen && rawRightPlayerList
        val itemChoice = !isResultScreen && isItemChoiceScreen(itemText)
        val combatHealthBars = !isResultScreen && inGameTopBar && AndroidFrontendVisualDetector.detectCombatHealthBars(frame)
        val augments = if (isResultScreen) {
            emptyList()
        } else if (itemChoice) {
            itemChoiceOffers(itemText)
        } else {
            AndroidAugmentTextParser.parse(augmentText).ifEmpty {
                when {
                    visualEncounterChoice -> listOf(AugmentOffer(slot = 1, name = "默认海克斯"))
                    visualAugmentChoice -> listOf(AugmentOffer(slot = 2, name = "默认海克斯"))
                    else -> emptyList()
                }
            }
        }
        val frontendVisualLoading = !isResultScreen && stage == null && !inGameTopBar && AndroidFrontendVisualDetector.detectLoadingScreen(frame)
        val frontendVisualProminentDialog = rawProminentConfirmDialog &&
            !isResultScreen &&
            !settingsDialog &&
            !broadAugmentChoice &&
            !broadEncounterChoice
        val frontendVisualContinue = !isResultScreen && stage == null && !inGameTopBar && !frontendVisualLoading && AndroidFrontendVisualDetector.detectTapToContinueScreen(frame)
        val frontendVisualModeRoomCustomization = !isResultScreen &&
            stage == null &&
            !inGameTopBar &&
            !frontendVisualLoading &&
            !frontendVisualProminentDialog &&
            AndroidFrontendVisualDetector.detectModeRoomCustomizationOverlay(frame)
        val frontendVisualModeSelect = !isResultScreen &&
            stage == null &&
            !inGameTopBar &&
            !frontendVisualLoading &&
            !frontendVisualProminentDialog &&
            !frontendVisualModeRoomCustomization &&
            AndroidFrontendVisualDetector.detectModeSelect(frame)
        val frontendVisualNormalMode = frontendVisualModeSelect && AndroidFrontendVisualDetector.detectNormalModeOption(frame)
        val frontendVisualModeStart = frontendVisualModeSelect && AndroidFrontendVisualDetector.detectStartButton(frame)
        val frontendVisualMatchRoom = !isResultScreen && stage == null && !inGameTopBar && AndroidFrontendVisualDetector.detectMatchRoom(frame)
        val frontendVisualStart = !isResultScreen &&
            stage == null &&
            !inGameTopBar &&
            !frontendVisualLoading &&
            !AndroidFrontendVisualDetector.detectInGameShopOverlay(frame) &&
            !visualAugmentChoice &&
            !visualEncounterChoice &&
            AndroidFrontendVisualDetector.detectStartButton(crops.frontend)
        val frontendVisualMatchmaking = !isResultScreen && stage == null && !inGameTopBar && AndroidFrontendVisualDetector.detectMatchmakingTimer(frame)
        val frontendVisualAcceptedWaiting = !isResultScreen &&
            stage == null &&
            !inGameTopBar &&
            !frontendVisualModeSelect &&
            !frontendVisualMatchmaking &&
            AndroidFrontendVisualDetector.detectAcceptedWaitingScreen(frame)
        val frontendVisualAccept = !isResultScreen &&
            stage == null &&
            !inGameTopBar &&
            AndroidFrontendVisualDetector.detectAcceptReadyButton(crops.dialog)
        val launcherHome = !isResultScreen &&
            stage == null &&
            !inGameTopBar &&
            AndroidFrontendVisualDetector.detectBlueStacksLauncherHome(frame)
        val frontendVisualUpdate = !isResultScreen &&
            stage == null &&
            !inGameTopBar &&
            !launcherHome &&
            !frontendVisualLoading &&
            !frontendVisualAccept &&
            !frontendVisualContinue &&
            !frontendVisualStart &&
            !frontendVisualModeSelect &&
            !frontendVisualModeRoomCustomization &&
            !frontendVisualMatchRoom &&
            !frontendVisualMatchmaking &&
            !frontendVisualAcceptedWaiting &&
            AndroidFrontendVisualDetector.detectUpdateReadyButton(frame)
        val suppressQueueConfirm = AndroidFrontendDialogGuard.shouldSuppressQueueConfirm(
            frontendVisualAccept,
            frontendVisualLoading,
            frontendVisualModeSelect,
            frontendVisualMatchRoom,
            frontendVisualStart,
            frontendVisualMatchmaking,
            frontendVisualAcceptedWaiting
        )
        val centeredDialogVisualConfirm = !isResultScreen &&
            !settingsDialog &&
            !broadAugmentChoice &&
            !broadEncounterChoice &&
            (AndroidDialogVisualDetector.detectCenteredConfirmDialog(frame) ||
                frontendVisualProminentDialog)
        val dialogVisualConfirm = !isResultScreen &&
            (!suppressQueueConfirm || centeredDialogVisualConfirm) &&
            !settingsDialog &&
            !broadAugmentChoice &&
            !broadEncounterChoice &&
            (AndroidDialogVisualDetector.detectConfirmDialog(crops.dialog) || centeredDialogVisualConfirm)
        val twoButtonDialog = dialogVisualConfirm &&
            AndroidDialogVisualDetector.detectTwoButtonConfirmDialog(crops.dialog)
        val dialogState = if (isResultScreen) {
            null
        } else {
            if (settingsDialog) "settings" else AndroidDialogTextParser.parseState(dialogText) ?: if (dialogVisualConfirm) "confirm" else null
        }
        val lootPoint = if (!isResultScreen && !settingsDialog && stage != null && dialogState == null && !visualAugmentChoice && !visualEncounterChoice && !itemChoice) {
            if (combatHealthBars) AndroidLootOrbDetector.detectCombat(frame) else AndroidLootOrbDetector.detect(frame)
        } else {
            null
        }
        val anvilPoint = if (!isResultScreen && !settingsDialog && stage != null && dialogState == null && !visualAugmentChoice && !visualEncounterChoice && !itemChoice) {
            AndroidBenchAnvilDetector.detect(frame)
        } else {
            null
        }
        val frontendState = if (isResultScreen) {
            null
        } else if (stage != null) {
            null
        } else {
            AndroidFrontendTextParser.parseState(frontendText)
                ?: AndroidFrontendTextParser.parseState(dialogText)
                ?: when {
                    launcherHome -> "launcher-home"
                    frontendVisualAccept -> "accept-ready"
                    frontendVisualUpdate -> "update-ready"
                    frontendVisualModeStart && frontendVisualNormalMode -> "mode-select"
                    frontendVisualModeRoomCustomization -> "mode-room-customization"
                    frontendVisualLoading -> "loading"
                    frontendVisualAcceptedWaiting -> "queue"
                    frontendVisualContinue -> "continue-ready"
                    frontendVisualStart -> "start-ready"
                    frontendVisualMatchmaking -> "queue"
                    frontendVisualModeSelect -> "mode-select"
                    else -> null
                }
        }
        val iconSignatures = if (isResultScreen) emptyList() else crops.itemIcons.map { icon ->
            AndroidIconSignatureHasher.fromBitmap(icon)
        }
        val itemResult = if (isResultScreen) {
            AndroidObservedItemResult(textItems = emptyList(), iconItems = emptyList(), items = emptyList())
        } else {
            AndroidObservedItemMerger.mergeDetailed(itemText, iconSignatures)
        }
        val visualItems = if (isResultScreen) {
            emptyList()
        } else {
            visualItemNames(crops)
        }
        val items = (itemResult.items + visualItems).distinct()
        val hasStage = stage != null
        val hasFrontendState = frontendState != null
        val hasDialogState = dialogState != null
        val hasValidState = isResultScreen || hasStage || augments.isNotEmpty() || hasFrontendState || hasDialogState
        val selectedHomeNormalMode = frontendState == "start-ready" &&
            !frontendVisualMatchRoom &&
            AndroidFrontendVisualDetector.detectNormalModeOption(frame)
        val detectedQueueMode = AndroidLobbyModeTextParser.parseHomeCarousel(selectedHomeNormalMode, lobbyTitleText, frontendText, dialogText)
            ?: if (frontendVisualNormalMode) "normal" else null
        val homeNormalModeVisible = selectedHomeNormalMode || frontendState == "start-ready" &&
            AndroidLobbyModeTextParser.containsNormalMode(dialogText)
        val fullBenchWarning = AndroidFrontendVisualDetector.detectFullBenchWarning(frame) ||
            hasFullBenchWarningText(shopTexts + shopFullTexts + listOf(frontendText, dialogText))
        val visualBenchOccupiedSlots = if (hasStage && !isResultScreen && augments.isEmpty()) {
            val pixels = IntArray(frame.width * frame.height)
            frame.getPixels(pixels, 0, frame.width, 0, 0, frame.width, frame.height)
            AndroidFrontendVisualDetector.countVisualBenchOccupiedSlots(pixels, frame.width, frame.height)
        } else {
            0
        }
        val visualBenchFull = visualBenchOccupiedSlots >= 8
        val trustedBenchFull = visualBenchFull || (fullBenchWarning && visualBenchOccupiedSlots >= 7)
        val reason = when {
            isResultScreen -> "android-result-screen"
            itemChoice -> "android-item-choice-screen"
            augments.isNotEmpty() -> "android-augment-screen"
            hasDialogState -> "android-dialog-${dialogState}"
            frontendState == "launcher-home" -> "android-launcher-home-visual"
            hasFrontendState -> "android-frontend-${frontendState}"
            hasStage -> "android-mlkit-hud"
            else -> "stage-ocr-missing"
        }
        return ObservedState(
            stageText = stage ?: "",
            stageType = if (isResultScreen) "FRONTEND" else if (augments.isNotEmpty()) "AUGMENT" else if (hasFrontendState) "FRONTEND" else if (hasStage) "NORMAL" else "UNKNOWN",
            level = level,
            gold = gold,
            shop = shop,
            items = items,
            augments = augments,
            metadata = mapOf(
                "hasValidStage" to hasValidState.toString(),
                "reason" to reason,
                "frontendState" to (frontendState ?: ""),
                "dialogState" to (dialogState ?: ""),
                "resultState" to if (isResultScreen) "finished" else "",
                "resultLayout" to if (isResultScreen) {
                    if (scoreboardResult) "scoreboard" else "modal"
                } else {
                    ""
                },
                "dialogVisualConfirm" to dialogVisualConfirm.toString(),
                "dialogButtonLayout" to if (twoButtonDialog) "two-buttons" else "",
                "frameWidth" to frame.width.toString(),
                "frameHeight" to frame.height.toString(),
                "stageRaw" to compact(stageText),
                "goldRaw" to compact(goldText),
                "goldSource" to goldSource,
                "levelRaw" to compact(levelText),
                "resultRaw" to compact(resultText),
                "itemRaw" to compact(itemText),
                "frontendRaw" to compact(frontendText),
                "dialogRaw" to compact(dialogText),
                "lobbyTitleRaw" to compact(lobbyTitleText),
                "detectedQueueMode" to (detectedQueueMode ?: ""),
                "homeNormalModeVisible" to homeNormalModeVisible.toString(),
                "observedAtMs" to System.currentTimeMillis().toString(),
                "frontendVisualStart" to frontendVisualStart.toString(),
                "matchRoomState" to if (frontendVisualStart) {
                    if (frontendVisualMatchRoom || frontendVisualModeSelect) "room" else "home"
                } else {
                    ""
                },
                "modeVisualNormal" to frontendVisualNormalMode.toString(),
                "modeVisualSelect" to frontendVisualModeSelect.toString(),
                "itemCount" to items.size.toString(),
                "itemVisualCount" to visualItems.size.toString(),
                "augmentRaw" to compact(augmentText),
                "augmentCount" to augments.size.toString(),
                "augmentLayout" to if (itemChoice) "item-choice" else if (giftChoice) "gift" else if (visualEncounterChoice) "encounter" else if (visualAugmentChoice) "wide" else "",
                "itemTextCount" to itemResult.textItems.size.toString(),
                "itemIconCropCount" to crops.itemIcons.size.toString(),
                "itemIconMatchCount" to itemResult.iconItems.size.toString(),
                "itemIconMatches" to itemResult.iconItems.joinToString(",").take(80),
                "shopRaw" to (
                    (shopTexts + shopFullTexts).joinToString(" | ") { compact(it) }.take(180)
                        .ifBlank { if (shop.isNotEmpty()) "visual-shop-slots" else "" }
                    ),
                "shopCount" to shop.size.toString(),
                "shopSource" to if (parsedSlotShop.isNotEmpty()) "ocr" else if (parsedFullShop.isNotEmpty()) "ocr-full" else if (shop.isNotEmpty()) "visual-fallback" else "",
                "shopOverlayState" to if (shopOverlay) "open" else "",
                "playerListState" to if (rightPlayerList) "visible" else "",
                "combatState" to if (combatHealthBars) "active" else "",
                "benchState" to if (trustedBenchFull) "full" else "",
                "benchFullState" to if (trustedBenchFull) "full" else "",
                "benchOccupiedSlots" to visualBenchOccupiedSlots.toString()
            ) + lootMetadata(lootPoint) + anvilMetadata(anvilPoint)
        )
    }

    private fun hasFullBenchWarningText(texts: List<String>): Boolean {
        val text = texts.joinToString(" ")
        return (text.contains("备战") || text.contains("備戰")) &&
            (text.contains("已满") || text.contains("已滿"))
    }

    private fun lootMetadata(point: PointF01?): Map<String, String> {
        return mapOf(
            "lootState" to if (point != null) "visible" else "",
            "lootX" to (point?.x?.toString() ?: ""),
            "lootY" to (point?.y?.toString() ?: "")
        )
    }

    private fun anvilMetadata(point: PointF01?): Map<String, String> {
        return mapOf(
            "anvilState" to if (point != null) "visible" else "",
            "anvilX" to (point?.x?.toString() ?: ""),
            "anvilY" to (point?.y?.toString() ?: "")
        )
    }

    private fun visualItemNames(crops: HudCrops): List<String> {
        return crops.itemIcons.mapIndexedNotNull { index, icon ->
            if (AndroidItemSlotVisualDetector.hasLikelyItem(icon)) "视觉装备${index + 1}" else null
        }
    }

    private fun isItemChoiceScreen(text: String): Boolean {
        val compactText = text.replace(Regex("""\s+"""), "")
        return compactText.contains("选择一件") &&
            (compactText.contains("装备") ||
                compactText.contains("反曲") ||
                compactText.contains("腰带") ||
                compactText.contains("锁子") ||
                compactText.contains("拳套") ||
                compactText.contains("斗篷") ||
                compactText.contains("大棒") ||
                compactText.contains("眼泪") ||
                compactText.contains("铲"))
    }

    private fun itemChoiceOffers(text: String): List<AugmentOffer> {
        val parsedItems = AndroidItemTextParser.parse(text)
        if (parsedItems.isEmpty()) {
            return listOf(AugmentOffer(slot = 1, name = "默认装备"))
        }
        val best = parsedItems
            .mapIndexed { index, name -> AugmentOffer(slot = index + 1, name = name, score = itemChoiceScore(name)) }
            .maxWithOrNull(compareBy<AugmentOffer> { it.score ?: 0 }.thenByDescending { -it.slot })
        return listOf(best ?: AugmentOffer(slot = 1, name = parsedItems.first()))
    }

    private fun itemChoiceScore(name: String): Int {
        return when {
            name.contains("铲") || name.contains("纹章") -> 120
            name.contains("反曲") || name.contains("弓") -> 110
            name.contains("大剑") || name.contains("暴风") -> 100
            name.contains("大棒") || name.contains("无用") -> 95
            name.contains("拳套") -> 90
            name.contains("眼泪") || name.contains("女神") -> 85
            name.contains("锁子") || name.contains("护甲") -> 75
            name.contains("腰带") -> 70
            name.contains("斗篷") -> 65
            else -> 50
        }
    }

    private fun recycleCrops(crops: HudCrops) {
        crops.stage.recycle()
        crops.gold.recycle()
        crops.level.recycle()
        crops.result.recycle()
        crops.items.recycle()
        crops.augment.recycle()
        crops.frontend.recycle()
        crops.dialog.recycle()
        crops.lobbyTitle.recycle()
        crops.itemIcons.forEach { it.recycle() }
        crops.shop.forEach { it.recycle() }
        crops.shopFull.forEach { it.recycle() }
    }

    private fun parseStage(text: String): String? {
        val normalized = text
            .replace('—', '-')
            .replace('–', '-')
            .replace('_', '-')
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(normalized) ?: return null
        return "${match.groupValues[1]}-${match.groupValues[2]}"
    }

    private fun parseBoundedInt(text: String, min: Int, max: Int): Int? {
        return Regex("""\d{1,3}""").findAll(text)
            .mapNotNull { it.value.toIntOrNull() }
            .firstOrNull { it in min..max }
    }

    private fun isResultScreen(text: String): Boolean {
        return resultScreenWords.any { word -> text.contains(word) }
    }

    private fun visualShopFallback(): List<ShopOffer> {
        return (1..5).map { slot ->
            val name = "商店位$slot"
            ShopOffer(
                slot = slot,
                unit = ObservedUnit(id = name, name = name, cost = 1, location = "shop"),
                cost = 1
            )
        }
    }

    private fun compact(text: String): String {
        return text.replace(Regex("""\s+"""), " ").trim().take(80)
    }

}

private val resultScreenWords = setOf(
    "第七名",
    "第八名",
    "现在退出",
    "继续观看"
)

private data class HudCrops(
    val stage: Bitmap,
    val gold: Bitmap,
    val level: Bitmap,
    val result: Bitmap,
    val items: Bitmap,
    val augment: Bitmap,
    val frontend: Bitmap,
    val dialog: Bitmap,
    val lobbyTitle: Bitmap,
    val itemIcons: List<Bitmap>,
    val shop: List<Bitmap>,
    val shopFull: List<Bitmap>
) {
    companion object {
        fun from(frame: Bitmap): HudCrops {
            return HudCrops(
                // Mobile TFT live HUD: stage is top-left of the progress bar, gold is the
                // bottom-right money pouch. Keep the gold crop low enough to exclude the
                // blue economy/interest number above the pouch and the refresh cost.
                stage = numericOcrCrop(frame, 0.28f, 0.00f, 0.16f, 0.08f),
                gold = numericOcrCrop(frame, 0.895f, 0.885f, 0.095f, 0.095f),
                level = numericOcrCrop(frame, 0.07f, 0.82f, 0.08f, 0.17f),
                // Mobile result screens can be either a right-side scoreboard or a
                // centered rank modal over the board. Include both regions so OCR can
                // confirm result words before any exit tap is allowed.
                result = crop(frame, 0.34f, 0.08f, 0.64f, 0.72f),
                // Text-only MVP: catches item names in choice/tooltip panels. Icon-only
                // equipment recognition uses conservative fixed crops until board
                // localization is available.
                items = crop(frame, 0.18f, 0.16f, 0.64f, 0.50f),
                augment = crop(frame, 0.18f, 0.12f, 0.64f, 0.62f),
                frontend = crop(frame, 0.66f, 0.80f, 0.32f, 0.18f),
                dialog = crop(frame, 0.28f, 0.24f, 0.44f, 0.50f),
                lobbyTitle = textOcrCrop(frame, 0.17f, 0.00f, 0.30f, 0.11f),
                itemIcons = itemIconCrops(frame),
                shop = shopSlotCrops(frame),
                shopFull = listOf(
                    textOcrCrop(frame, 0.12f, 0.325f, 0.86f, 0.08f),
                    rawTextOcrCrop(frame, 0.12f, 0.325f, 0.86f, 0.08f)
                )
            )
        }

        private fun shopSlotCrops(frame: Bitmap): List<Bitmap> {
            val slots = listOf(0.12f, 0.30f, 0.475f, 0.65f, 0.82f)
            val textCrops = slots.map { x -> textOcrCrop(frame, x, 0.30f, 0.17f, 0.12f) }
            val rawCrops = slots.map { x -> rawTextOcrCrop(frame, x, 0.30f, 0.17f, 0.12f) }
            return textCrops + rawCrops
        }

        private fun itemIconCrops(frame: Bitmap): List<Bitmap> {
            return listOf(
                crop(frame, 0.012f, 0.135f, 0.058f, 0.105f),
                crop(frame, 0.012f, 0.245f, 0.058f, 0.105f),
                crop(frame, 0.012f, 0.355f, 0.058f, 0.105f),
                crop(frame, 0.012f, 0.465f, 0.058f, 0.105f),
                crop(frame, 0.012f, 0.575f, 0.058f, 0.105f),
                crop(frame, 0.012f, 0.685f, 0.058f, 0.105f)
            )
        }

        private fun crop(frame: Bitmap, x: Float, y: Float, width: Float, height: Float): Bitmap {
            val left = (frame.width * x).toInt().coerceIn(0, frame.width - 1)
            val top = (frame.height * y).toInt().coerceIn(0, frame.height - 1)
            val cropWidth = (frame.width * width).toInt().coerceIn(1, frame.width - left)
            val cropHeight = (frame.height * height).toInt().coerceIn(1, frame.height - top)
            val cropped = Bitmap.createBitmap(frame, left, top, cropWidth, cropHeight)
            val scale = 3
            val scaled = Bitmap.createScaledBitmap(cropped, cropped.width * scale, cropped.height * scale, false)
            cropped.recycle()
            return scaled
        }

        private fun numericOcrCrop(frame: Bitmap, x: Float, y: Float, width: Float, height: Float): Bitmap {
            val raw = cropRaw(frame, x, y, width, height)
            val scale = 5
            val scaled = Bitmap.createScaledBitmap(raw, raw.width * scale, raw.height * scale, false)
            raw.recycle()
            val pixels = IntArray(scaled.width * scaled.height)
            scaled.getPixels(pixels, 0, scaled.width, 0, 0, scaled.width, scaled.height)
            for (index in pixels.indices) {
                val pixel = pixels[index]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                val isBrightText = red >= 175 && green >= 175 && blue >= 150
                pixels[index] = if (isBrightText) 0xff000000.toInt() else 0xffffffff.toInt()
            }
            scaled.setPixels(pixels, 0, scaled.width, 0, 0, scaled.width, scaled.height)
            return scaled
        }

        private fun textOcrCrop(frame: Bitmap, x: Float, y: Float, width: Float, height: Float): Bitmap {
            val raw = cropRaw(frame, x, y, width, height)
            val scale = 4
            val scaled = Bitmap.createScaledBitmap(raw, raw.width * scale, raw.height * scale, false)
            raw.recycle()
            val pixels = IntArray(scaled.width * scaled.height)
            scaled.getPixels(pixels, 0, scaled.width, 0, 0, scaled.width, scaled.height)
            for (index in pixels.indices) {
                val pixel = pixels[index]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                val isBrightText = red >= 165 && green >= 155 && blue >= 135
                val isGoldIcon = red >= 175 && green >= 130 && blue <= 90
                pixels[index] = if (isBrightText && !isGoldIcon) 0xff000000.toInt() else 0xffffffff.toInt()
            }
            scaled.setPixels(pixels, 0, scaled.width, 0, 0, scaled.width, scaled.height)
            return scaled
        }

        private fun rawTextOcrCrop(frame: Bitmap, x: Float, y: Float, width: Float, height: Float): Bitmap {
            val raw = cropRaw(frame, x, y, width, height)
            val scale = 3
            val scaled = Bitmap.createScaledBitmap(raw, raw.width * scale, raw.height * scale, true)
            raw.recycle()
            return scaled
        }

        private fun cropRaw(frame: Bitmap, x: Float, y: Float, width: Float, height: Float): Bitmap {
            val left = (frame.width * x).toInt().coerceIn(0, frame.width - 1)
            val top = (frame.height * y).toInt().coerceIn(0, frame.height - 1)
            val cropWidth = (frame.width * width).toInt().coerceIn(1, frame.width - left)
            val cropHeight = (frame.height * height).toInt().coerceIn(1, frame.height - top)
            return Bitmap.createBitmap(frame, left, top, cropWidth, cropHeight)
        }
    }
}

private const val OCR_IN_FLIGHT_TIMEOUT_MS = 12_000L
private const val QUEUE_MODE_OCR_FRESH_MS = 3_000L
private const val SHOP_SLOT_COUNT = 5
