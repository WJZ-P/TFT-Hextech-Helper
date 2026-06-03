package com.tfthextech.helper.automation

data class AndroidLiveStartDecision(
    val dryRun: Boolean
)

object AndroidLiveStartPolicy {
    fun decide(
        requestedDryRun: Boolean,
        hasFrame: Boolean,
        accessibilityEnabled: Boolean
    ): AndroidLiveStartDecision {
        if (requestedDryRun) {
            return AndroidLiveStartDecision(dryRun = true)
        }
        return AndroidLiveStartDecision(dryRun = !hasFrame || !accessibilityEnabled)
    }
}
