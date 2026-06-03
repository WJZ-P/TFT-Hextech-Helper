package com.tfthextech.helper.vision

import android.graphics.Bitmap

object AndroidResultVisualDetector {
    fun detectResultScreen(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        if (detectScoreboardResultScreen(bitmap)) {
            return true
        }
        return detectModalResultScreen(bitmap)
    }

    fun detectModalResultScreen(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.36f).toInt()
        val top = (bitmap.height * 0.55f).toInt()
        val width = (bitmap.width * 0.28f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.22f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        val bannerLeft = (bitmap.width * 0.36f).toInt()
        val bannerTop = (bitmap.height * 0.32f).toInt()
        val bannerWidth = (bitmap.width * 0.28f).toInt().coerceAtLeast(1)
        val bannerHeight = (bitmap.height * 0.22f).toInt().coerceAtLeast(1)
        val bannerPixels = IntArray(bannerWidth * bannerHeight)
        bitmap.getPixels(bannerPixels, 0, bannerWidth, bannerLeft, bannerTop, bannerWidth, bannerHeight)

        val backdropLeft = (bitmap.width * 0.28f).toInt()
        val backdropTop = (bitmap.height * 0.30f).toInt()
        val backdropWidth = (bitmap.width * 0.44f).toInt().coerceAtLeast(1)
        val backdropHeight = (bitmap.height * 0.52f).toInt().coerceAtLeast(1)
        val backdropPixels = IntArray(backdropWidth * backdropHeight)
        bitmap.getPixels(backdropPixels, 0, backdropWidth, backdropLeft, backdropTop, backdropWidth, backdropHeight)

        return detectModalResultScreen(pixels, width, height, bannerPixels, backdropPixels)
    }

    internal fun detectModalResultScreen(
        buttonPixels: IntArray,
        buttonWidth: Int,
        buttonHeight: Int,
        bannerPixels: IntArray,
        backdropPixels: IntArray
    ): Boolean {
        val hasResultControls = detectResultButtonStack(buttonPixels, buttonWidth, buttonHeight, minDarkRatio = 0.12f) ||
            detectEliminatedResultButtonPanel(buttonPixels, buttonWidth, buttonHeight)
        if (!hasResultControls) {
            return false
        }
        return detectRankModalBanner(bannerPixels) || detectDimmedModalBackdrop(backdropPixels)
    }

    fun detectScoreboardResultScreen(bitmap: Bitmap): Boolean {
        val buttonLeft = (bitmap.width * 0.72f).toInt()
        val buttonTop = (bitmap.height * 0.82f).toInt()
        val buttonWidth = (bitmap.width * 0.26f).toInt().coerceAtLeast(1)
        val buttonHeight = (bitmap.height * 0.16f).toInt().coerceAtLeast(1)
        val buttonPixels = IntArray(buttonWidth * buttonHeight)
        bitmap.getPixels(buttonPixels, 0, buttonWidth, buttonLeft, buttonTop, buttonWidth, buttonHeight)

        val rankLeft = (bitmap.width * 0.74f).toInt()
        val rankTop = (bitmap.height * 0.08f).toInt()
        val rankWidth = (bitmap.width * 0.22f).toInt().coerceAtLeast(1)
        val rankHeight = (bitmap.height * 0.16f).toInt().coerceAtLeast(1)
        val rankPixels = IntArray(rankWidth * rankHeight)
        bitmap.getPixels(rankPixels, 0, rankWidth, rankLeft, rankTop, rankWidth, rankHeight)

        val panelLeft = (bitmap.width * 0.70f).toInt()
        val panelTop = 0
        val panelWidth = (bitmap.width * 0.30f).toInt().coerceAtLeast(1)
        val panelHeight = (bitmap.height * 0.80f).toInt().coerceAtLeast(1)
        val panelPixels = IntArray(panelWidth * panelHeight)
        bitmap.getPixels(panelPixels, 0, panelWidth, panelLeft, panelTop, panelWidth, panelHeight)

        return detectScoreboardResultScreen(buttonPixels, rankPixels, panelPixels)
    }

    fun detectScoreboardResultScreen(buttonPixels: IntArray, rankPixels: IntArray): Boolean {
        return detectScoreboardResultScreen(buttonPixels, rankPixels, null)
    }

    fun detectScoreboardResultScreen(buttonPixels: IntArray, rankPixels: IntArray, panelPixels: IntArray?): Boolean {
        if (buttonPixels.isEmpty() || rankPixels.isEmpty()) {
            return false
        }
        val blueButtonRatio = buttonPixels.count { pixel ->
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            isCyanButtonPixel(red, green, blue)
        }.toFloat() / buttonPixels.size.toFloat()
        val brightRankRatio = rankPixels.count { pixel ->
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            red >= 190 && green >= 185 && blue >= 170
        }.toFloat() / rankPixels.size.toFloat()
        val darkRankRatio = rankPixels.count { pixel ->
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            isDarkPanelPixel(red, green, blue)
        }.toFloat() / rankPixels.size.toFloat()
        val darkPanelRatio = panelPixels?.takeIf { it.isNotEmpty() }?.count { pixel ->
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            isDarkPanelPixel(red, green, blue)
        }?.toFloat()?.div(panelPixels.size.toFloat()) ?: 1.0f
        return blueButtonRatio >= 0.08f && brightRankRatio >= 0.03f && darkRankRatio >= 0.45f && darkPanelRatio >= 0.20f
    }

    fun shouldTreatAsVisualResult(
        liveHudVisible: Boolean,
        scoreboardResult: Boolean,
        modalResult: Boolean,
        choiceVisible: Boolean = false,
        rightPlayerListVisible: Boolean = false
    ): Boolean {
        if (choiceVisible) {
            return false
        }
        if (liveHudVisible && rightPlayerListVisible) {
            return modalResult
        }
        if (liveHudVisible) {
            return modalResult
        }
        return scoreboardResult || modalResult
    }

    fun detectResultScreen(pixels: IntArray, width: Int, height: Int): Boolean {
        return detectResultButtonStack(pixels, width, height, minDarkRatio = 0.22f)
    }

    private fun detectResultButtonStack(pixels: IntArray, width: Int, height: Int, minDarkRatio: Float): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }

        var cyanTopButtonPixels = 0
        var goldBottomButtonPixels = 0
        var darkPanelPixels = 0
        var topBandPixels = 0
        var bottomBandPixels = 0
        val buttonLeft = (width * 0.10f).toInt()
        val buttonRight = (width * 0.90f).toInt()
        val topButtonTop = (height * 0.08f).toInt()
        val topButtonBottom = (height * 0.42f).toInt()
        val bottomButtonTop = (height * 0.55f).toInt()
        val bottomButtonBottom = (height * 0.90f).toInt()

        for (y in 0 until height) {
            for (x in buttonLeft until buttonRight) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (isDarkPanelPixel(red, green, blue)) {
                    darkPanelPixels += 1
                }
                if (y in topButtonTop until topButtonBottom) {
                    topBandPixels += 1
                    if (isCyanButtonPixel(red, green, blue)) {
                        cyanTopButtonPixels += 1
                    }
                }
                if (y in bottomButtonTop until bottomButtonBottom) {
                    bottomBandPixels += 1
                    if (isGoldBorderPixel(red, green, blue)) {
                        goldBottomButtonPixels += 1
                    }
                }
            }
        }

        val cyanRatio = cyanTopButtonPixels.toFloat() / topBandPixels.coerceAtLeast(1).toFloat()
        val goldRatio = goldBottomButtonPixels.toFloat() / bottomBandPixels.coerceAtLeast(1).toFloat()
        val darkRatio = darkPanelPixels.toFloat() / pixels.size.toFloat()
        return darkRatio >= minDarkRatio && cyanRatio >= 0.08f && goldRatio >= 0.01f
    }

    internal fun detectEliminatedResultButtonPanel(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }

        var darkPixels = 0
        var topDarkPixels = 0
        var bottomDarkPixels = 0
        var topTextPixels = 0
        var bottomTextPixels = 0
        var topBandPixels = 0
        var bottomBandPixels = 0
        val buttonLeft = (width * 0.10f).toInt()
        val buttonRight = (width * 0.90f).toInt()
        val topButtonTop = (height * 0.08f).toInt()
        val topButtonBottom = (height * 0.42f).toInt()
        val bottomButtonTop = (height * 0.55f).toInt()
        val bottomButtonBottom = (height * 0.90f).toInt()

        for (y in 0 until height) {
            for (x in buttonLeft until buttonRight) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                val dark = isDarkPanelPixel(red, green, blue)
                val text = red >= 150 && green >= 130 && blue >= 95
                if (dark) {
                    darkPixels += 1
                }
                if (y in topButtonTop until topButtonBottom) {
                    topBandPixels += 1
                    if (dark) topDarkPixels += 1
                    if (text) topTextPixels += 1
                }
                if (y in bottomButtonTop until bottomButtonBottom) {
                    bottomBandPixels += 1
                    if (dark) bottomDarkPixels += 1
                    if (text) bottomTextPixels += 1
                }
            }
        }

        val darkRatio = darkPixels.toFloat() / pixels.size.toFloat()
        val topDarkRatio = topDarkPixels.toFloat() / topBandPixels.coerceAtLeast(1).toFloat()
        val bottomDarkRatio = bottomDarkPixels.toFloat() / bottomBandPixels.coerceAtLeast(1).toFloat()
        val topTextRatio = topTextPixels.toFloat() / topBandPixels.coerceAtLeast(1).toFloat()
        val bottomTextRatio = bottomTextPixels.toFloat() / bottomBandPixels.coerceAtLeast(1).toFloat()
        return darkRatio >= 0.45f &&
            topDarkRatio >= 0.45f &&
            bottomDarkRatio >= 0.45f &&
            topTextRatio >= 0.01f &&
            bottomTextRatio >= 0.01f
    }

    internal fun detectRankModalBanner(pixels: IntArray): Boolean {
        if (pixels.isEmpty()) {
            return false
        }
        var darkPixels = 0
        var goldTextPixels = 0
        var cyanAccentPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (isDarkPanelPixel(red, green, blue)) {
                darkPixels += 1
            }
            if (red >= 150 && green >= 115 && blue <= 80) {
                goldTextPixels += 1
            }
            if (isCyanButtonPixel(red, green, blue)) {
                cyanAccentPixels += 1
            }
        }
        val size = pixels.size.toFloat()
        // The mobile result banner is translucent over the arena, so real captures can
        // have very few fully-dark pixels. Gold rank text plus cyan trim is the stable
        // signature; keep a tiny dark-panel floor to avoid matching bright board noise.
        return darkPixels / size >= 0.001f && goldTextPixels / size >= 0.005f && cyanAccentPixels / size >= 0.002f
    }

    private fun detectDimmedModalBackdrop(pixels: IntArray): Boolean {
        if (pixels.isEmpty()) {
            return false
        }
        val darkPixels = pixels.count { pixel ->
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            isDarkPanelPixel(red, green, blue)
        }
        return darkPixels.toFloat() / pixels.size.toFloat() >= 0.55f
    }

    private fun isCyanButtonPixel(red: Int, green: Int, blue: Int): Boolean {
        return blue >= 100 && green >= 100 && red <= 80 && blue - red >= 45
    }

    private fun isGoldBorderPixel(red: Int, green: Int, blue: Int): Boolean {
        return red >= 110 && green >= 80 && blue <= 95 && red - blue >= 35
    }

    private fun isDarkPanelPixel(red: Int, green: Int, blue: Int): Boolean {
        return red <= 45 && green <= 55 && blue <= 70
    }
}
