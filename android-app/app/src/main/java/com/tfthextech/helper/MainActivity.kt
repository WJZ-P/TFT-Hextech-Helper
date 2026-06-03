package com.tfthextech.helper

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.tfthextech.helper.automation.AndroidAutomationRunStore
import com.tfthextech.helper.automation.AndroidLiveStartPolicy
import com.tfthextech.helper.automation.TftAppGraph
import com.tfthextech.helper.capture.ScreenCaptureRepository
import com.tfthextech.helper.capture.ScreenCaptureService
import com.tfthextech.helper.input.TftAccessibilityService
import com.tfthextech.helper.overlay.TftOverlayService

class MainActivity : Activity() {
    private lateinit var status: TextView
    private val projectionRequestCode = 4101
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        TftAppGraph.initialize(applicationContext)
        buildUi()
        handleAutomationIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleAutomationIntent(intent)
    }

    override fun onResume() {
        super.onResume()
        refreshStatus()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == projectionRequestCode && resultCode == RESULT_OK && data != null) {
            ScreenCaptureService.start(this, resultCode, data)
        }
        refreshStatus()
    }

    private fun buildUi() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(32, 48, 32, 32)
        }
        status = TextView(this).apply {
            textSize = 16f
            setPadding(0, 0, 0, 24)
        }
        root.addView(status)
        root.addView(button("1. Request screen capture") { requestScreenCapture() })
        root.addView(button("2. Open accessibility settings") { openAccessibilitySettings() })
        root.addView(button("3. Grant overlay permission") { openOverlaySettings() })
        root.addView(button("4. Start overlay") { TftOverlayService.start(this) })
        root.addView(button("Start overlay + open TFT") {
            TftOverlayService.start(this)
            openTft()
        })
        root.addView(button("Start dry-run + open TFT") {
            TftOverlayService.start(this)
            openTftThenEnableAutomation(dryRun = true, queueMode = null)
        })
        root.addView(button("Start live normal + open TFT") {
            AndroidAutomationRunStore.save(this, dryRun = false, queueMode = "normal")
            TftOverlayService.start(this)
            openTftThenEnableAutomation(dryRun = false, queueMode = "normal")
        })
        root.addView(button("5. Dry-run once") {
            TftAppGraph.automationCoordinator.setDryRun(true)
            TftAppGraph.automationCoordinator.setEnabled(true)
            TftAppGraph.automationCoordinator.tick()
            refreshStatus()
        })
        root.addView(button("Open TFT") { openTft() })
        root.addView(button("Stop automation") {
            AndroidAutomationRunStore.clear(this)
            TftAppGraph.automationCoordinator.setEnabled(false)
            refreshStatus()
        })
        setContentView(root)
        requestNotificationPermissionIfNeeded()
        refreshStatus()
    }

    private fun button(label: String, onClick: () -> Unit): Button {
        return Button(this).apply {
            text = label
            setOnClickListener { onClick() }
        }
    }

    private fun requestScreenCapture() {
        val manager = getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
        startActivityForResult(manager.createScreenCaptureIntent(), projectionRequestCode)
    }

    private fun openAccessibilitySettings() {
        startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS))
    }

    private fun openOverlaySettings() {
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName"))
        startActivity(intent)
    }

    private fun openTft() {
        if (launchTft()) {
            mainHandler.postDelayed({ moveTaskToBack(true) }, 250L)
            mainHandler.postDelayed({
                launchTft()
                moveTaskToBack(true)
            }, 1_250L)
        }
    }

    private fun launchTft(): Boolean {
        val launchIntent = packageManager.getLaunchIntentForPackage("com.riotgames.league.teamfighttactics")
        if (launchIntent != null) {
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            startActivity(launchIntent)
            return true
        } else {
            status.text = "${status.text}\nTFT package not found"
        }
        return false
    }

    private fun openTftThenEnableAutomation(dryRun: Boolean, queueMode: String?) {
        if (!dryRun && queueMode == "normal") {
            AndroidAutomationRunStore.save(this, dryRun = false, queueMode = "normal")
        }
        queueMode?.let { TftAppGraph.automationCoordinator.setQueueMode(it) }
        TftAppGraph.automationCoordinator.setDryRun(effectiveDryRun(dryRun))
        TftAppGraph.automationCoordinator.setEnabled(false)
        refreshStatus()
        openTft()
        mainHandler.postDelayed({
            TftAppGraph.automationCoordinator.setDryRun(effectiveDryRun(dryRun))
            TftAppGraph.automationCoordinator.setEnabled(true)
            refreshStatus()
        }, AUTOMATION_ENABLE_AFTER_OPEN_TFT_MS)
        if (!dryRun && queueMode == "normal") {
            mainHandler.postDelayed({
                TftAppGraph.automationCoordinator.setQueueMode("normal")
                TftAppGraph.automationCoordinator.setDryRun(effectiveDryRun(false))
                TftAppGraph.automationCoordinator.setEnabled(true)
                refreshStatus()
            }, AUTOMATION_LIVE_RECHECK_AFTER_OPEN_TFT_MS)
        }
    }

    private fun handleAutomationIntent(intent: Intent?) {
        val command = intent?.getStringExtra(EXTRA_AUTOMATION_COMMAND)?.lowercase() ?: return
        val shouldOpenTft = intent.getBooleanExtra(EXTRA_OPEN_TFT, false)
        TftAppGraph.automationCoordinator.setQueueMode(intent.getStringExtra(EXTRA_QUEUE_MODE) ?: "unknown")
        when (command) {
            COMMAND_OVERLAY -> TftOverlayService.start(this)
            COMMAND_DRY -> {
                AndroidAutomationRunStore.clear(this)
                TftOverlayService.start(this)
                if (shouldOpenTft) {
                    openTftThenEnableAutomation(dryRun = true, queueMode = null)
                } else {
                    TftAppGraph.automationCoordinator.setDryRun(true)
                    TftAppGraph.automationCoordinator.setEnabled(true)
                }
            }
            COMMAND_LIVE -> {
                AndroidAutomationRunStore.save(this, dryRun = false, queueMode = intent.getStringExtra(EXTRA_QUEUE_MODE) ?: "unknown")
                TftOverlayService.start(this)
                if (shouldOpenTft) {
                    openTftThenEnableAutomation(
                        dryRun = false,
                        queueMode = intent.getStringExtra(EXTRA_QUEUE_MODE) ?: "unknown"
                    )
                } else {
                    TftAppGraph.automationCoordinator.setDryRun(effectiveDryRun(false))
                    TftAppGraph.automationCoordinator.setEnabled(true)
                }
            }
            COMMAND_STOP -> {
                AndroidAutomationRunStore.clear(this)
                TftAppGraph.automationCoordinator.setEnabled(false)
            }
            COMMAND_DRY_ONCE -> {
                AndroidAutomationRunStore.clear(this)
                TftOverlayService.start(this)
                TftAppGraph.automationCoordinator.setDryRun(true)
                TftAppGraph.automationCoordinator.setEnabled(true)
                TftAppGraph.automationCoordinator.tick()
            }
        }
        refreshStatus()
        if (shouldOpenTft && command != COMMAND_DRY && command != COMMAND_LIVE) {
            openTft()
        }
    }

    private fun effectiveDryRun(requestedDryRun: Boolean): Boolean {
        return AndroidLiveStartPolicy.decide(
            requestedDryRun = requestedDryRun,
            hasFrame = ScreenCaptureRepository.hasFrame(),
            accessibilityEnabled = TftAccessibilityService.isEnabled()
        ).dryRun
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1002)
        }
    }

    private fun refreshStatus() {
        val snapshot = TftAppGraph.automationCoordinator.snapshot()
        status.text = buildString {
            appendLine("TFT Hextech Android MVP")
            appendLine("Screen capture: start from button 1")
            appendLine("Frame: ${frameStatus()}")
            appendLine("Accessibility: ${if (TftAccessibilityService.isEnabled()) "enabled" else "disabled"}")
            appendLine("Overlay: ${if (Settings.canDrawOverlays(this@MainActivity)) "granted" else "missing"}")
            appendLine("Enabled: ${snapshot.enabled}")
            appendLine("Automation: ${snapshot.status}")
            appendLine("Dry-run: ${snapshot.dryRun}")
        }
    }

    private fun frameStatus(): String {
        val age = ScreenCaptureRepository.latestFrameAgeMs()
        return if (ScreenCaptureRepository.hasFrame() && age != null) "ready (${age / 1000}s ago)" else "missing"
    }

    companion object {
        private const val EXTRA_AUTOMATION_COMMAND = "automation"
        private const val EXTRA_OPEN_TFT = "openTft"
        private const val EXTRA_QUEUE_MODE = "queueMode"
        private const val COMMAND_OVERLAY = "overlay"
        private const val COMMAND_DRY = "dry"
        private const val COMMAND_LIVE = "live"
        private const val COMMAND_STOP = "stop"
        private const val COMMAND_DRY_ONCE = "dry-once"
        private const val AUTOMATION_ENABLE_AFTER_OPEN_TFT_MS = 1_500L
        private const val AUTOMATION_LIVE_RECHECK_AFTER_OPEN_TFT_MS = 5_000L
    }
}
