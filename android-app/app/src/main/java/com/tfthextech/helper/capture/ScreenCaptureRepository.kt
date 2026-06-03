package com.tfthextech.helper.capture

import android.graphics.Bitmap
import java.util.concurrent.atomic.AtomicLong
import java.util.concurrent.atomic.AtomicReference

class ScreenCaptureRepository {
    fun latestFrame(): Bitmap? = synchronized(frameLock) {
        latest.get()?.takeUnless { it.isRecycled }?.copy(Bitmap.Config.ARGB_8888, false)
    }

    companion object {
        private val latest = AtomicReference<Bitmap?>()
        private val latestPublishedAtMs = AtomicLong(0L)
        private val frameLock = Any()

        fun hasFrame(): Boolean = latest.get() != null

        fun latestFrameAgeMs(nowMs: Long = System.currentTimeMillis()): Long? {
            val publishedAt = latestPublishedAtMs.get()
            return if (publishedAt > 0L) nowMs - publishedAt else null
        }

        fun publish(bitmap: Bitmap) {
            synchronized(frameLock) {
                latest.getAndSet(bitmap)?.recycle()
                latestPublishedAtMs.set(System.currentTimeMillis())
            }
        }
    }
}
