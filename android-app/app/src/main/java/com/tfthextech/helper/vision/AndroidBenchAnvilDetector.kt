package com.tfthextech.helper.vision

import android.graphics.Bitmap
import com.tfthextech.helper.protocol.PointF01

object AndroidBenchAnvilDetector {
    private val slotCenters = listOf(0.18f, 0.26f, 0.35f, 0.44f, 0.54f, 0.64f, 0.73f, 0.82f, 0.90f)

    fun detect(frame: Bitmap): PointF01? {
        val pixels = IntArray(frame.width * frame.height)
        frame.getPixels(pixels, 0, frame.width, 0, 0, frame.width, frame.height)
        return detect(pixels, frame.width, frame.height)
    }

    fun detect(pixels: IntArray, width: Int, height: Int): PointF01? {
        return slotCenters.mapIndexedNotNull { index, center ->
            val metrics = metricsForSlot(pixels, width, height, center)
            if (
                metrics.greyCoverage >= 0.18f &&
                metrics.brightGreyCoverage >= 0.08f &&
                metrics.brownCoverage >= 0.20f &&
                metrics.combinedCoverage >= 0.45f &&
                metrics.greenHealthCoverage < 0.04f
            ) {
                AnvilCandidate(index + 1, center, metrics.combinedCoverage)
            } else {
                null
            }
        }.maxWithOrNull(compareBy<AnvilCandidate> { it.score }.thenByDescending { -it.slot })
            ?.let { PointF01(it.center, 0.88f) }
    }

    private fun metricsForSlot(pixels: IntArray, width: Int, height: Int, centerX: Float): SlotMetrics {
        val left = ((centerX - 0.035f) * width).toInt().coerceIn(0, width - 1)
        val right = ((centerX + 0.035f) * width).toInt().coerceIn(left + 1, width)
        val top = (0.80f * height).toInt().coerceIn(0, height - 1)
        val bottom = (0.95f * height).toInt().coerceIn(top + 1, height)
        var total = 0
        var grey = 0
        var brightGrey = 0
        var brown = 0
        var healthTotal = 0
        var greenHealth = 0
        val healthTop = (0.76f * height).toInt().coerceIn(0, height - 1)
        val healthBottom = (0.84f * height).toInt().coerceIn(healthTop + 1, height)
        for (y in healthTop until healthBottom) {
            for (x in left until right) {
                val color = pixels[y * width + x]
                val r = (color shr 16) and 0xff
                val g = (color shr 8) and 0xff
                val b = color and 0xff
                healthTotal += 1
                if (g >= 150 && r <= 95 && b <= 120) {
                    greenHealth += 1
                }
            }
        }
        for (y in top until bottom) {
            for (x in left until right) {
                val color = pixels[y * width + x]
                val r = (color shr 16) and 0xff
                val g = (color shr 8) and 0xff
                val b = color and 0xff
                val max = maxOf(r, g, b)
                val min = minOf(r, g, b)
                total += 1
                if (max - min < 45 && max in 71..234) {
                    grey += 1
                }
                if (max - min < 55 && max in 120..234) {
                    brightGrey += 1
                }
                if (r > 80 && g > 45 && b < 95 && r > g * 1.1f) {
                    brown += 1
                }
            }
        }
        if (total == 0) {
            return SlotMetrics(0f, 0f, 0f, 0f, 0f)
        }
        return SlotMetrics(
            greyCoverage = grey.toFloat() / total,
            brightGreyCoverage = brightGrey.toFloat() / total,
            brownCoverage = brown.toFloat() / total,
            combinedCoverage = (grey + brightGrey + brown).toFloat() / total,
            greenHealthCoverage = if (healthTotal == 0) 0f else greenHealth.toFloat() / healthTotal
        )
    }

    private data class SlotMetrics(
        val greyCoverage: Float,
        val brightGreyCoverage: Float,
        val brownCoverage: Float,
        val combinedCoverage: Float,
        val greenHealthCoverage: Float
    )

    private data class AnvilCandidate(
        val slot: Int,
        val center: Float,
        val score: Float
    )
}
