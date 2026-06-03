package com.tfthextech.helper.input

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityService.GestureResultCallback
import android.accessibilityservice.GestureDescription
import android.graphics.Path
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import com.tfthextech.helper.protocol.ActionType
import com.tfthextech.helper.protocol.ExecutionStep
import com.tfthextech.helper.protocol.PointF01
import java.util.concurrent.atomic.AtomicReference

open class TftAccessibilityService : AccessibilityService() {
    override fun onServiceConnected() {
        instance.set(this)
        lastGestureStatus.set("service-connected")
        Log.i(TAG, "Accessibility service connected")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) = Unit

    override fun onInterrupt() = Unit

    override fun onDestroy() {
        instance.compareAndSet(this, null)
        super.onDestroy()
    }

    fun tap(point: PointF01, screenWidth: Int, screenHeight: Int, callback: ((Boolean) -> Unit)? = null): Boolean {
        val target = AndroidGestureMath.toPixelTarget(point, screenWidth, screenHeight)
        val path = Path().apply { moveTo(target.x, target.y) }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0L, 70L))
            .build()
        val dispatched = dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                lastGestureStatus.set("completed ${target.summary()}")
                Log.i(TAG, "Gesture completed ${target.summary()}")
                callback?.invoke(true)
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                lastGestureStatus.set("cancelled ${target.summary()}")
                Log.w(TAG, "Gesture cancelled ${target.summary()}")
                callback?.invoke(false)
            }
        }, null)
        lastGestureStatus.set("dispatched=$dispatched ${target.summary()}")
        Log.i(TAG, "Gesture dispatched=$dispatched ${target.summary()}")
        if (!dispatched) {
            callback?.invoke(false)
        }
        return dispatched
    }

    fun drag(from: PointF01, to: PointF01, screenWidth: Int, screenHeight: Int, callback: ((Boolean) -> Unit)? = null): Boolean {
        val start = AndroidGestureMath.toPixelTarget(from, screenWidth, screenHeight)
        val target = AndroidGestureMath.toPixelTarget(to, screenWidth, screenHeight)
        val path = Path().apply {
            moveTo(start.x, start.y)
            lineTo(target.x, target.y)
        }
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0L, 420L))
            .build()
        val dispatched = dispatchGesture(gesture, object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                lastGestureStatus.set("completed ${start.summary()} -> ${target.summary()}")
                Log.i(TAG, "Gesture completed ${start.summary()} -> ${target.summary()}")
                callback?.invoke(true)
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                lastGestureStatus.set("cancelled ${start.summary()} -> ${target.summary()}")
                Log.w(TAG, "Gesture cancelled ${start.summary()} -> ${target.summary()}")
                callback?.invoke(false)
            }
        }, null)
        lastGestureStatus.set("dispatched=$dispatched ${start.summary()} -> ${target.summary()}")
        Log.i(TAG, "Gesture dispatched=$dispatched ${start.summary()} -> ${target.summary()}")
        if (!dispatched) {
            callback?.invoke(false)
        }
        return dispatched
    }

    fun runStep(step: ExecutionStep, screenWidth: Int, screenHeight: Int, callback: ((Boolean) -> Unit)? = null): Boolean {
        val from = step.from
        val to = step.to
        if (from != null && to != null) {
            return drag(from, to, screenWidth, screenHeight, callback)
        }
        val target = step.point ?: step.to
        if (target == null) {
            if (step.type == ActionType.DISMISS_DIALOG) {
                val performed = performGlobalAction(GLOBAL_ACTION_BACK)
                lastGestureStatus.set("global-back=$performed")
                Log.i(TAG, "Global back performed=$performed")
                callback?.invoke(performed)
                return performed
            }
            callback?.invoke(false)
            return false
        }
        return tap(target, screenWidth, screenHeight, callback)
    }

    companion object {
        private const val TAG = "TftAccessibility"
        private val instance = AtomicReference<TftAccessibilityService?>()
        private val lastGestureStatus = AtomicReference("idle")

        fun isEnabled(): Boolean = instance.get() != null

        fun latestGestureStatus(): String = lastGestureStatus.get()

        fun execute(step: ExecutionStep, screenWidth: Int, screenHeight: Int, callback: ((Boolean) -> Unit)? = null): Boolean {
            val service = instance.get() ?: return false
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
                lastGestureStatus.set("unsupported-sdk")
                callback?.invoke(false)
                return false
            }
            return service.runStep(step, screenWidth, screenHeight, callback)
        }
    }
}
