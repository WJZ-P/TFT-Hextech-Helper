package com.tfthextech.helper.vision

import android.graphics.Bitmap

object AndroidIconSignatureHasher {
    fun fromBitmap(bitmap: Bitmap): String {
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return fromPixels(pixels, bitmap.width, bitmap.height, sampleWidth = 8, sampleHeight = 8)
    }

    fun fromPixels(
        pixels: IntArray,
        width: Int,
        height: Int,
        sampleWidth: Int = width,
        sampleHeight: Int = height
    ): String {
        if (width <= 0 || height <= 0 || sampleWidth <= 0 || sampleHeight <= 0 || pixels.size < width * height) {
            return ""
        }

        val luminance = IntArray(sampleWidth * sampleHeight)
        var total = 0
        for (sampleY in 0 until sampleHeight) {
            for (sampleX in 0 until sampleWidth) {
                val sourceX = (((sampleX + 0.5f) * width) / sampleWidth).toInt().coerceIn(0, width - 1)
                val sourceY = (((sampleY + 0.5f) * height) / sampleHeight).toInt().coerceIn(0, height - 1)
                val index = sampleY * sampleWidth + sampleX
                val pixel = pixels[sourceY * width + sourceX]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                val value = (red * 299 + green * 587 + blue * 114) / 1000
                luminance[index] = value
                total += value
            }
        }

        val average = total / luminance.size.coerceAtLeast(1)
        return buildString(luminance.size) {
            luminance.forEach { value -> append(if (value > average) '1' else '0') }
        }
    }
}
