package com.tfthextech.helper.overlay

import com.tfthextech.helper.protocol.AutomationSnapshot

object TftOverlayVisibilityPolicy {
    fun shouldHideOverlay(snapshot: AutomationSnapshot, accessibilityEnabled: Boolean): Boolean {
        if (!snapshot.enabled || snapshot.dryRun) {
            return false
        }
        if (!accessibilityEnabled) {
            return false
        }
        val state = snapshot.lastState ?: return false
        if (snapshot.status.contains("no-capture-frame") || state.metadata["reason"] == "no-capture-frame") {
            return false
        }
        if (state.stageType == "FRONTEND") {
            return true
        }
        if (snapshot.executionSteps.isNotEmpty()) {
            return true
        }
        if (
            state.metadata["frontendState"] == "queue" ||
            state.metadata["frontendState"] == "accept-ready" ||
            state.metadata["frontendState"] == "mode-select"
        ) {
            return true
        }
        return state.stageType == "NORMAL" || state.stageType == "AUGMENT" || state.stageText.isNotBlank()
    }
}
