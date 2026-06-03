package com.tfthextech.helper.vision

import android.graphics.Bitmap

object AndroidDialogVisualDetector {
    fun detectConfirmDialog(bitmap: Bitmap): Boolean {
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectConfirmDialog(pixels, bitmap.width, bitmap.height)
    }

    fun detectTwoButtonConfirmDialog(bitmap: Bitmap): Boolean {
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectTwoButtonConfirmDialog(pixels, bitmap.width, bitmap.height)
    }

    fun detectCenteredConfirmDialog(bitmap: Bitmap): Boolean {
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectCenteredConfirmDialog(pixels, bitmap.width, bitmap.height)
    }

    fun detectProminentConfirmDialog(bitmap: Bitmap): Boolean {
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectProminentConfirmDialog(pixels, bitmap.width, bitmap.height)
    }

    fun detectConfirmDialog(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }

        var darkPixels = 0
        var goldPixelsInButtonBand = 0
        var buttonBandPixels = 0
        var goldPixelsInUpperDialog = 0
        var upperDialogPixels = 0
        var brightTextPixelsInUpperDialog = 0
        val buttonTop = (height * 0.62f).toInt()
        val buttonBottom = (height * 0.92f).toInt()
        val buttonLeft = (width * 0.25f).toInt()
        val buttonRight = (width * 0.75f).toInt()
        val upperDialogTop = (height * 0.12f).toInt()
        val upperDialogBottom = (height * 0.58f).toInt()
        val upperDialogLeft = (width * 0.12f).toInt()
        val upperDialogRight = (width * 0.88f).toInt()

        for (y in 0 until height) {
            for (x in 0 until width) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (isDialogDark(red, green, blue)) {
                    darkPixels += 1
                }
                if (x in buttonLeft until buttonRight && y in buttonTop until buttonBottom) {
                    buttonBandPixels += 1
                    if (isGoldButtonPixel(red, green, blue)) {
                        goldPixelsInButtonBand += 1
                    }
                }
                if (x in upperDialogLeft until upperDialogRight && y in upperDialogTop until upperDialogBottom) {
                    upperDialogPixels += 1
                    if (isGoldButtonPixel(red, green, blue)) {
                        goldPixelsInUpperDialog += 1
                    }
                    if (isBrightTextPixel(red, green, blue)) {
                        brightTextPixelsInUpperDialog += 1
                    }
                }
            }
        }

        val darkRatio = darkPixels.toFloat() / pixels.size.toFloat()
        val goldRatio = goldPixelsInButtonBand.toFloat() / buttonBandPixels.coerceAtLeast(1).toFloat()
        val upperGoldRatio = goldPixelsInUpperDialog.toFloat() / upperDialogPixels.coerceAtLeast(1).toFloat()
        val upperTextRatio = brightTextPixelsInUpperDialog.toFloat() / upperDialogPixels.coerceAtLeast(1).toFloat()
        val hasVisibleUpperDialog = upperGoldRatio >= 0.004f && upperTextRatio >= 0.01f
        val hasOccludedTextDialog = darkRatio >= 0.75f && upperTextRatio >= 0.02f
        return darkRatio >= 0.35f && (goldRatio >= 0.025f || (darkRatio >= 0.60f && hasVisibleUpperDialog) || hasOccludedTextDialog)
    }

    fun detectCenteredConfirmDialog(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.size < width * height) {
            return false
        }

        val panel = RatioCounts()
        val button = RatioCounts()
        val text = RatioCounts()
        val panelLeft = (width * 0.32f).toInt()
        val panelRight = (width * 0.68f).toInt()
        val panelTop = (height * 0.25f).toInt()
        val panelBottom = (height * 0.72f).toInt()
        val buttonLeft = (width * 0.40f).toInt()
        val buttonRight = (width * 0.60f).toInt()
        val buttonTop = (height * 0.56f).toInt()
        val buttonBottom = (height * 0.68f).toInt()
        val textLeft = (width * 0.34f).toInt()
        val textRight = (width * 0.66f).toInt()
        val textTop = (height * 0.34f).toInt()
        val textBottom = (height * 0.48f).toInt()

        for (y in panelTop until panelBottom) {
            for (x in panelLeft until panelRight) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                panel.total += 1
                if (isDialogDark(red, green, blue)) {
                    panel.dark += 1
                }
                if (isGoldButtonPixel(red, green, blue)) {
                    panel.gold += 1
                }
                if (isBrightTextPixel(red, green, blue)) {
                    panel.bright += 1
                }
                if (x in buttonLeft until buttonRight && y in buttonTop until buttonBottom) {
                    button.total += 1
                    if (isGoldButtonPixel(red, green, blue)) {
                        button.gold += 1
                    }
                }
                if (x in textLeft until textRight && y in textTop until textBottom) {
                    text.total += 1
                    if (isBrightTextPixel(red, green, blue)) {
                        text.bright += 1
                    }
                }
            }
        }

        return panel.darkRatio >= 0.65f &&
            panel.goldRatio >= 0.015f &&
            button.goldRatio >= 0.015f &&
            text.brightRatio >= 0.010f
    }

    fun detectProminentConfirmDialog(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.size < width * height) {
            return false
        }

        val panel = RatioCounts()
        val button = RatioCounts()
        val text = RatioCounts()
        val panelLeft = (width * 0.30f).toInt()
        val panelRight = (width * 0.70f).toInt()
        val panelTop = (height * 0.24f).toInt()
        val panelBottom = (height * 0.74f).toInt()
        val buttonLeft = (width * 0.40f).toInt()
        val buttonRight = (width * 0.60f).toInt()
        val buttonTop = (height * 0.56f).toInt()
        val buttonBottom = (height * 0.70f).toInt()
        val textLeft = (width * 0.34f).toInt()
        val textRight = (width * 0.66f).toInt()
        val textTop = (height * 0.32f).toInt()
        val textBottom = (height * 0.52f).toInt()

        for (y in panelTop until panelBottom) {
            for (x in panelLeft until panelRight) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                panel.total += 1
                if (isDialogDark(red, green, blue)) {
                    panel.dark += 1
                }
                if (isGoldButtonPixel(red, green, blue)) {
                    panel.gold += 1
                }
                if (isBrightTextPixel(red, green, blue)) {
                    panel.bright += 1
                }
                if (x in buttonLeft until buttonRight && y in buttonTop until buttonBottom) {
                    button.total += 1
                    if (isGoldButtonPixel(red, green, blue)) {
                        button.gold += 1
                    }
                }
                if (x in textLeft until textRight && y in textTop until textBottom) {
                    text.total += 1
                    if (isBrightTextPixel(red, green, blue)) {
                        text.bright += 1
                    }
                }
            }
        }

        return panel.darkRatio >= 0.55f &&
            panel.goldRatio >= 0.010f &&
            text.brightRatio >= 0.030f &&
            (button.goldRatio >= 0.008f || panel.goldRatio >= 0.025f)
    }

    fun detectTwoButtonConfirmDialog(pixels: IntArray, width: Int, height: Int): Boolean {
        if (!detectConfirmDialog(pixels, width, height)) {
            return false
        }
        val buttonTop = (height * 0.62f).toInt()
        val buttonBottom = (height * 0.92f).toInt()
        val buttonLeft = (width * 0.10f).toInt()
        val buttonRight = (width * 0.90f).toInt()
        val minGoldPixelsInColumn = ((buttonBottom - buttonTop).coerceAtLeast(1) * 0.18f).toInt().coerceAtLeast(2)
        var groupCount = 0
        var inGroup = false
        var gap = 0

        for (x in buttonLeft until buttonRight) {
            var goldInColumn = 0
            for (y in buttonTop until buttonBottom) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (isGoldButtonPixel(red, green, blue)) {
                    goldInColumn += 1
                }
            }
            val hasGoldColumn = goldInColumn >= minGoldPixelsInColumn
            if (hasGoldColumn) {
                if (!inGroup) {
                    groupCount += 1
                    inGroup = true
                }
                gap = 0
            } else if (inGroup) {
                gap += 1
                if (gap >= 4) {
                    inGroup = false
                    gap = 0
                }
            }
        }

        return groupCount >= 2
    }

    private fun isDialogDark(red: Int, green: Int, blue: Int): Boolean {
        return red <= 45 && green <= 55 && blue <= 65
    }

    private fun isGoldButtonPixel(red: Int, green: Int, blue: Int): Boolean {
        return red >= 120 && green >= 85 && green <= 190 && blue <= 90 && red - blue >= 45
    }

    private fun isBrightTextPixel(red: Int, green: Int, blue: Int): Boolean {
        return red >= 190 && green >= 185 && blue >= 165 && kotlin.math.abs(red - green) <= 45
    }

    private data class RatioCounts(
        var total: Int = 0,
        var dark: Int = 0,
        var gold: Int = 0,
        var bright: Int = 0
    ) {
        val darkRatio: Float get() = dark.toFloat() / total.coerceAtLeast(1).toFloat()
        val goldRatio: Float get() = gold.toFloat() / total.coerceAtLeast(1).toFloat()
        val brightRatio: Float get() = bright.toFloat() / total.coerceAtLeast(1).toFloat()
    }
}
