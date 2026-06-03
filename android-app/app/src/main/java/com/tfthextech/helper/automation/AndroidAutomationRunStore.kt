package com.tfthextech.helper.automation

import android.content.Context

data class SavedAutomationRun(
    val enabled: Boolean,
    val dryRun: Boolean,
    val queueMode: String
)

object AndroidAutomationRunStore {
    private const val PREFS = "tft_automation_run"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_DRY_RUN = "dryRun"
    private const val KEY_QUEUE_MODE = "queueMode"

    fun save(context: Context, dryRun: Boolean, queueMode: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putBoolean(KEY_ENABLED, true)
            .putBoolean(KEY_DRY_RUN, dryRun)
            .putString(KEY_QUEUE_MODE, normalizeQueueMode(queueMode))
            .apply()
    }

    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .clear()
            .apply()
    }

    fun load(context: Context): SavedAutomationRun? {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_ENABLED, false)) {
            return null
        }
        return SavedAutomationRun(
            enabled = true,
            dryRun = prefs.getBoolean(KEY_DRY_RUN, true),
            queueMode = normalizeQueueMode(prefs.getString(KEY_QUEUE_MODE, null) ?: "unknown")
        )
    }

    private fun normalizeQueueMode(value: String): String {
        return value.lowercase().takeIf { it == "normal" } ?: "unknown"
    }
}
