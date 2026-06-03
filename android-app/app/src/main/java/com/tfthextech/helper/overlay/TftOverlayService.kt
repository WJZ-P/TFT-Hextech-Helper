package com.tfthextech.helper.overlay

import android.app.Service
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.app.NotificationCompat
import com.tfthextech.helper.R
import com.tfthextech.helper.automation.AndroidAutomationResumePolicy
import com.tfthextech.helper.automation.AndroidAutomationRunStore
import com.tfthextech.helper.automation.AndroidLiveStartPolicy
import com.tfthextech.helper.automation.TftAppGraph
import com.tfthextech.helper.capture.ScreenCaptureRepository
import com.tfthextech.helper.input.TftAccessibilityService

class TftOverlayService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var windowManager: WindowManager? = null
    private var overlayView: View? = null
    private var statusText: TextView? = null

    private val tick = object : Runnable {
        override fun run() {
            val snapshot = TftAppGraph.automationCoordinator.tick()
            val state = snapshot.lastState
            val hud = if (state != null) {
                "stage=${state.stageText.ifBlank { "?" }} gold=${state.gold} lv=${state.level} shop=${state.shop.size} items=${state.items.size}"
            } else {
                "stage=? gold=? lv=? shop=? items=?"
            }
            val firstShop = state?.shop?.firstOrNull()?.unit?.name ?: "-"
            val firstItem = state?.items?.firstOrNull() ?: "-"
            val augmentCount = state?.metadata?.get("augmentCount") ?: "?"
            val iconMatchCount = state?.metadata?.get("itemIconMatchCount") ?: "?"
            val iconMatches = state?.metadata?.get("itemIconMatches")?.ifBlank { "-" } ?: "-"
            val frontend = state?.metadata?.get("frontendState")?.ifBlank { "-" } ?: "-"
            val dialog = state?.metadata?.get("dialogState")?.ifBlank { "-" } ?: "-"
            val result = state?.metadata?.get("resultState")?.ifBlank { "-" } ?: "-"
            val reason = state?.metadata?.get("reason")?.ifBlank { "-" } ?: "-"
            val requestedQueueMode = state?.metadata?.get("requestedQueueMode")?.ifBlank { "-" } ?: "-"
            val detectedQueueMode = state?.metadata?.get("detectedQueueMode")?.ifBlank { "-" } ?: "-"
            val queueMode = state?.metadata?.get("queueMode")?.ifBlank { "-" } ?: "-"
            val lobbyTitleRaw = state?.metadata?.get("lobbyTitleRaw")?.ifBlank { "-" } ?: "-"
            val stageRaw = state?.metadata?.get("stageRaw")?.ifBlank { "-" } ?: "-"
            val goldRaw = state?.metadata?.get("goldRaw")?.ifBlank { "-" } ?: "-"
            val levelRaw = state?.metadata?.get("levelRaw")?.ifBlank { "-" } ?: "-"
            val shopRaw = state?.metadata?.get("shopRaw")?.ifBlank { "-" }?.take(48) ?: "-"
            val shopSource = state?.metadata?.get("shopSource")?.ifBlank { "-" } ?: "-"
            val nextStep = snapshot.executionSteps.firstOrNull()?.type?.name ?: "-"
            val gesture = TftAccessibilityService.latestGestureStatus()
            statusText?.text = "TFT Helper\n${snapshot.status}\n$hud\nmode req=$requestedQueueMode det=$detectedQueueMode ok=$queueMode title=$lobbyTitleRaw\nraw s=$stageRaw g=$goldRaw l=$levelRaw\nshopRaw=$shopRaw src=$shopSource\nreason=$reason\nfirst=$firstShop item=$firstItem aug=$augmentCount\nfront=$frontend dialog=$dialog result=$result\nicons=$iconMatchCount $iconMatches\nnext=$nextStep steps=${snapshot.executionSteps.size} dry=${snapshot.dryRun}\ngesture=$gesture"
            val hideOverlay = TftOverlayVisibilityPolicy.shouldHideOverlay(
                snapshot,
                accessibilityEnabled = TftAccessibilityService.isEnabled()
            )
            overlayView?.visibility = if (hideOverlay) View.GONE else View.VISIBLE
            handler.postDelayed(this, 1000L)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onCreate() {
        super.onCreate()
        startForeground(NOTIFICATION_ID, buildNotification("Automation monitor active"))
        TftAppGraph.initialize(applicationContext)
        if (!Settings.canDrawOverlays(this)) {
            stopSelf()
            return
        }
        showOverlay()
        resumeSavedAutomationRun()
        handler.post(tick)
    }

    override fun onDestroy() {
        handler.removeCallbacks(tick)
        overlayView?.let { windowManager?.removeView(it) }
        overlayView = null
        super.onDestroy()
    }

    private fun showOverlay() {
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(18, 14, 18, 14)
            setBackgroundColor(0xAA111820.toInt())
        }
        statusText = TextView(this).apply {
            setTextColor(0xFFFFFFFF.toInt())
            textSize = 13f
            maxWidth = 760
            text = "TFT Helper\nidle"
        }
        val start = Button(this).apply {
            text = "Start Dry"
            setOnClickListener {
                AndroidAutomationRunStore.clear(this@TftOverlayService)
                TftAppGraph.automationCoordinator.setDryRun(true)
                TftAppGraph.automationCoordinator.setEnabled(true)
            }
        }
        val live = Button(this).apply {
            text = "Live Normal"
            setOnClickListener {
                val decision = AndroidLiveStartPolicy.decide(
                    requestedDryRun = false,
                    hasFrame = ScreenCaptureRepository.hasFrame(),
                    accessibilityEnabled = TftAccessibilityService.isEnabled()
                )
                AndroidAutomationRunStore.save(this@TftOverlayService, dryRun = false, queueMode = "normal")
                TftAppGraph.automationCoordinator.setQueueMode("normal")
                TftAppGraph.automationCoordinator.setDryRun(decision.dryRun)
                TftAppGraph.automationCoordinator.setEnabled(true)
                if (!decision.dryRun) {
                    overlayView?.visibility = View.GONE
                }
            }
        }
        val stop = Button(this).apply {
            text = "Stop"
            setOnClickListener {
                AndroidAutomationRunStore.clear(this@TftOverlayService)
                TftAppGraph.automationCoordinator.setEnabled(false)
            }
        }
        root.addView(statusText)
        root.addView(start)
        root.addView(live)
        root.addView(stop)
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY else WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            x = 0
            y = 24
        }
        overlayView = root
        windowManager?.addView(root, params)
    }

    private fun resumeSavedAutomationRun() {
        val decision = AndroidAutomationResumePolicy.decide(AndroidAutomationRunStore.load(this)) ?: return
        TftAppGraph.automationCoordinator.setQueueMode(decision.queueMode)
        TftAppGraph.automationCoordinator.setDryRun(decision.dryRun)
        TftAppGraph.automationCoordinator.setEnabled(true)
        if (!decision.dryRun) {
            overlayView?.visibility = View.GONE
        }
    }

    private fun buildNotification(text: String): Notification {
        ensureNotificationChannel()
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(text)
            .setOngoing(true)
            .build()
    }

    private fun ensureNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "TFT Helper Automation", NotificationManager.IMPORTANCE_LOW)
            )
        }
    }

    companion object {
        private const val CHANNEL_ID = "tft_hextech_overlay"
        private const val NOTIFICATION_ID = 1002

        fun start(context: Context) {
            val intent = Intent(context, TftOverlayService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
    }
}
