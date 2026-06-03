package com.tfthextech.helper.vision

import android.graphics.Bitmap

internal object AndroidItemSlotVisualDetector {
    fun hasLikelyItem(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return hasLikelyItem(pixels)
    }

    fun hasLikelyItem(pixels: IntArray): Boolean {
        if (pixels.isEmpty()) {
            return false
        }
        var saturatedPixels = 0
        var brightPixels = 0
        var veryDarkPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            val max = maxOf(red, green, blue)
            val min = minOf(red, green, blue)
            if (max >= 80 && max - min >= 45) {
                saturatedPixels += 1
            }
            if (red + green + blue >= 330) {
                brightPixels += 1
            }
            if (red <= 35 && green <= 35 && blue <= 40) {
                veryDarkPixels += 1
            }
        }
        val saturatedRatio = saturatedPixels.toFloat() / pixels.size.toFloat()
        val brightRatio = brightPixels.toFloat() / pixels.size.toFloat()
        val veryDarkRatio = veryDarkPixels.toFloat() / pixels.size.toFloat()
        return (saturatedRatio >= 0.08f || brightRatio >= 0.10f) && veryDarkRatio <= 0.70f
    }
}
