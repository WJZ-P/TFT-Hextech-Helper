package com.tfthextech.helper.automation

import com.tfthextech.helper.protocol.ActionType
import com.tfthextech.helper.protocol.ExecutionStep
import com.tfthextech.helper.protocol.ObservedState

class AndroidActionVerifier(
    private val timeoutMs: Long = 4_000L,
    private val levelUpTimeoutMs: Long = 3_500L
) {
    fun createPending(step: ExecutionStep, before: ObservedState, nowMs: Long): PendingAndroidAction {
        return PendingAndroidAction(step, before, signatureOf(step, before.stageText), nowMs)
    }

    fun evaluate(pending: PendingAndroidAction, current: ObservedState, nowMs: Long): VerificationResult {
        if (current.metadata["hasValidStage"] == "false" || current.stageType == "UNKNOWN") {
            return VerificationResult.Pending
        }

        if (hasVerifiedChange(pending.step, pending.before, current)) {
            return VerificationResult.Verified
        }

        val actionTimeoutMs = when (pending.step.type) {
            ActionType.LEVEL_UP -> levelUpTimeoutMs
            else -> timeoutMs
        }
        if (nowMs - pending.startedAtMs >= actionTimeoutMs) {
            return VerificationResult.Failed
        }

        return VerificationResult.Pending
    }

    fun signatureOf(step: ExecutionStep, stageText: String): String {
        return "${stageText}:${step.type}:${step.description}:${step.point}:${step.to}"
    }

    private fun hasVerifiedChange(step: ExecutionStep, before: ObservedState, current: ObservedState): Boolean {
        return when (step.type) {
            ActionType.BUY -> isPlausibleGoldSpend(before.gold, current.gold, maxSpend = 5) ||
                shopSignature(current) != shopSignature(before) ||
                isFreshBuyFollowedByStaleShopOcr(before, current)
            ActionType.ROLL -> current.gold <= before.gold - 2 || shopSignature(current) != shopSignature(before)
            ActionType.LEVEL_UP -> current.level > before.level || current.currentXp > before.currentXp || isAnyGoldSpend(before.gold, current.gold)
            ActionType.OPEN_MODE_ROOM -> before.metadata["frontendState"] == "start-ready" && current.metadata["frontendState"] != "start-ready"
            ActionType.START_GAME -> before.metadata["frontendState"] in setOf("start-ready", "mode-select") &&
                current.metadata["frontendState"] != before.metadata["frontendState"]
            ActionType.START_UPDATE -> before.metadata["frontendState"] == "update-ready" && current.metadata["frontendState"] != "update-ready"
            ActionType.SELECT_MODE -> if (before.metadata["frontendState"] == "start-ready" && before.metadata["homeNormalModeVisible"] == "true") {
                current.metadata["detectedQueueMode"] == "normal" ||
                    current.metadata["queueMode"] == "normal" ||
                    current.metadata["frontendState"] != "start-ready"
            } else if (before.metadata["frontendState"] == "start-ready" && pendingIsRoomModeSelector(current)) {
                current.metadata["frontendState"] == "mode-select" ||
                    current.metadata["frontendState"] != "start-ready"
            } else {
                before.metadata["frontendState"] == "mode-select" && current.metadata["frontendState"] != "mode-select"
            }
            ActionType.ACCEPT_QUEUE -> before.metadata["frontendState"] == "accept-ready" && current.metadata["frontendState"] != "accept-ready"
            ActionType.PICK_AUGMENT -> (before.augments.isNotEmpty() && current.augments.isEmpty()) ||
                isVisualAugmentChoiceResolved(before, current)
            ActionType.DISMISS_DIALOG ->
                (before.metadata["dialogState"] == "confirm" && current.metadata["dialogState"] != "confirm") ||
                    (before.metadata["sidePanelState"] == "open" && current.metadata["sidePanelState"] != "open")
            ActionType.RECOVER_BACK -> when (before.metadata["frontendState"]) {
                "start-ready" -> current.metadata["frontendState"] != "start-ready" ||
                    current.metadata["matchRoomState"] != before.metadata["matchRoomState"]
                "career-history" -> current.metadata["frontendState"] != "career-history"
                else -> false
            }
            ActionType.RETURN_HOME ->
                (before.metadata["playerListState"] == "visible" && current.metadata["playerListState"] != "visible") ||
                    (before.metadata["sidePanelState"] == "open" && current.metadata["sidePanelState"] != "open")
            ActionType.EXIT_RESULT -> before.metadata["resultState"] == "finished" && current.metadata["resultState"] != "finished"
            ActionType.PICK_LOOT -> isLootPickupResolved(step, before, current)
            else -> true
        }
    }

    private fun isLootPickupResolved(step: ExecutionStep, before: ObservedState, current: ObservedState): Boolean {
        if (current.stageType != "NORMAL") {
            return true
        }
        if (current.stageText != before.stageText && current.stageText.isNotBlank()) {
            return true
        }
        if (current.metadata["lootState"] != "visible") {
            return true
        }
        val target = step.point ?: return true
        val currentX = current.metadata["lootX"]?.toFloatOrNull() ?: return true
        val currentY = current.metadata["lootY"]?.toFloatOrNull() ?: return true
        return !areLootPointsClose(target.x, target.y, currentX, currentY)
    }

    private fun areLootPointsClose(ax: Float, ay: Float, bx: Float, by: Float): Boolean {
        return kotlin.math.abs(ax - bx) <= 0.045f && kotlin.math.abs(ay - by) <= 0.07f
    }

    private fun isFreshBuyFollowedByStaleShopOcr(before: ObservedState, current: ObservedState): Boolean {
        if (before.metadata["shopSource"] != "last-ocr-fresh") {
            return false
        }
        return current.metadata["shopSource"] == "last-ocr" && shopSignature(current) == shopSignature(before)
    }

    private fun shopSignature(state: ObservedState): String {
        return state.shop.joinToString("|") { offer ->
            "${offer.slot}:${offer.unit?.name ?: "-"}:${offer.cost ?: "-"}"
        }
    }

    private fun pendingIsRoomModeSelector(current: ObservedState): Boolean {
        return current.metadata["reason"] == "android-frontend-mode-select-visual" ||
            current.metadata["frontendState"] == "mode-select"
    }

    private fun isVisualAugmentChoiceResolved(before: ObservedState, current: ObservedState): Boolean {
        val beforeLayout = before.metadata["augmentLayout"].orEmpty()
        if (before.stageType != "AUGMENT" || before.metadata["reason"] != "android-augment-visual") {
            return false
        }
        if (beforeLayout !in setOf("wide", "encounter", "item-choice")) {
            return false
        }
        return current.stageType != "AUGMENT" &&
            current.metadata["reason"] != "android-augment-visual" &&
            current.metadata["augmentLayout"].isNullOrBlank()
    }

    private fun isPlausibleGoldSpend(beforeGold: Int, currentGold: Int, maxSpend: Int): Boolean {
        val drop = beforeGold - currentGold
        return drop in 1..maxSpend
    }

    private fun isAnyGoldSpend(beforeGold: Int, currentGold: Int): Boolean {
        return beforeGold > 0 && currentGold in 0 until beforeGold
    }
}

data class PendingAndroidAction(
    val step: ExecutionStep,
    val before: ObservedState,
    val signature: String,
    val startedAtMs: Long
)

sealed class VerificationResult {
    data object Pending : VerificationResult()
    data object Verified : VerificationResult()
    data object Failed : VerificationResult()
}
