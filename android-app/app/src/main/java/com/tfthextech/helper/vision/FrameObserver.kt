package com.tfthextech.helper.vision

import android.graphics.Bitmap
import com.tfthextech.helper.protocol.ObservedState

interface FrameObserver {
    fun observe(bitmap: Bitmap?): ObservedState
}

class StubFrameObserver : FrameObserver {
    override fun observe(bitmap: Bitmap?): ObservedState {
        if (bitmap == null) {
            return ObservedState(
                stageType = "UNKNOWN",
                metadata = mapOf("hasValidStage" to "false", "reason" to "no-capture-frame")
            )
        }

        return ObservedState(
            stageText = "",
            stageType = "UNKNOWN",
            metadata = mapOf(
                "hasValidStage" to "false",
                "reason" to "vision-not-implemented",
                "frameWidth" to bitmap.width.toString(),
                "frameHeight" to bitmap.height.toString()
            )
        )
    }
}
