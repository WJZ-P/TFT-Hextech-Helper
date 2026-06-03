package com.tfthextech.helper.automation

data class AutomationResumeDecision(
    val dryRun: Boolean,
    val queueMode: String
)

object AndroidAutomationResumePolicy {
    fun decide(saved: SavedAutomationRun?): AutomationResumeDecision? {
        if (saved == null || !saved.enabled) {
            return null
        }
        return AutomationResumeDecision(
            dryRun = saved.dryRun,
            queueMode = saved.queueMode.lowercase().takeIf { it == "normal" } ?: "unknown"
        )
    }
}
