package com.tfthextech.helper.automation

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.util.Log

interface AndroidTftAppRecovery {
    fun restartTft(): Boolean
    fun launchTft(): Boolean = restartTft()
}

object NoopAndroidTftAppRecovery : AndroidTftAppRecovery {
    override fun restartTft(): Boolean = false
}

class ContextAndroidTftAppRecovery(
    private val context: Context
) : AndroidTftAppRecovery {
    override fun launchTft(): Boolean {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(TFT_PACKAGE)
            ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        if (launchIntent == null) {
            Log.w(TAG, "TFT package not found for foreground recovery")
            return false
        }

        return runCatching {
            context.startActivity(launchIntent)
            true
        }.getOrElse { error ->
            Log.w(TAG, "TFT foreground recovery failed: ${error.javaClass.simpleName}")
            false
        }
    }

    override fun restartTft(): Boolean {
        val launchIntent = context.packageManager.getLaunchIntentForPackage(TFT_PACKAGE)
            ?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        if (launchIntent == null) {
            Log.w(TAG, "TFT package not found for recovery restart")
            return false
        }

        runCatching {
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            activityManager.killBackgroundProcesses(TFT_PACKAGE)
        }.onFailure { error ->
            Log.w(TAG, "TFT background kill failed before relaunch: ${error.javaClass.simpleName}")
        }

        return runCatching {
            context.startActivity(launchIntent)
            true
        }.getOrElse { error ->
            Log.w(TAG, "TFT relaunch failed: ${error.javaClass.simpleName}")
            false
        }
    }

    companion object {
        private const val TAG = "TftAppRecovery"
        private const val TFT_PACKAGE = "com.riotgames.league.teamfighttactics"
    }
}
