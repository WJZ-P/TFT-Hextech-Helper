package com.tfthextech.helper.vision

import android.graphics.Bitmap

object AndroidFrontendVisualDetector {
    fun detectStartButton(bitmap: Bitmap): Boolean {
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectStartButton(pixels, bitmap.width, bitmap.height)
    }

    fun detectStartButton(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var blueButtonPixels = 0
        var maxBluePixelsInRow = 0
        for (y in 0 until height) {
            var rowBluePixels = 0
            for (x in 0 until width) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (isStartButtonBlue(red, green, blue)) {
                    blueButtonPixels += 1
                    rowBluePixels += 1
                }
            }
            maxBluePixelsInRow = maxOf(maxBluePixelsInRow, rowBluePixels)
        }
        val ratio = blueButtonPixels.toFloat() / pixels.size.toFloat()
        val rowRatio = maxBluePixelsInRow.toFloat() / width.toFloat()
        return (blueButtonPixels >= 500 || ratio >= 0.035f) && rowRatio >= 0.12f
    }

    fun detectInGameTopBar(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.32f).toInt()
        val top = 0
        val width = (bitmap.width * 0.40f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.13f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectInGameTopBar(pixels, width, height)
    }

    fun detectInGameTopBar(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var maxCyanPixelsInRow = 0
        var cyanPixels = 0
        for (y in 0 until height) {
            var cyanPixelsInRow = 0
            for (x in 0 until width) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (blue >= 130 && green >= 120 && red <= 120) {
                    cyanPixels += 1
                    cyanPixelsInRow += 1
                }
            }
            maxCyanPixelsInRow = maxOf(maxCyanPixelsInRow, cyanPixelsInRow)
        }
        val cyanRatio = cyanPixels.toFloat() / pixels.size.toFloat()
        val rowRatio = maxCyanPixelsInRow.toFloat() / width.toFloat()
        return cyanRatio >= 0.08f || rowRatio >= 0.45f
    }

    fun detectModeSelect(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val fullPixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(fullPixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        if (detectReconnectLoadingOverlay(fullPixels, bitmap.width, bitmap.height)) {
            return false
        }
        val left = (bitmap.width * 0.18f).toInt()
        val top = (bitmap.height * 0.26f).toInt()
        val width = (bitmap.width * 0.72f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.58f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectModeSelect(pixels, width, height)
    }

    fun detectModeRoomCustomizationOverlay(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectModeRoomCustomizationOverlay(pixels, bitmap.width, bitmap.height)
    }

    fun detectMatchRoom(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val width = (bitmap.width * 0.34f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.10f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
        return detectMatchRoomHeader(pixels, width, height)
    }

    fun detectCareerHistoryScreen(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectCareerHistoryScreen(pixels, bitmap.width, bitmap.height)
    }

    fun detectFullBenchWarning(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectFullBenchWarning(pixels, bitmap.width, bitmap.height)
    }

    fun detectNormalModeOption(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.25f).toInt()
        val top = (bitmap.height * 0.55f).toInt()
        val width = (bitmap.width * 0.20f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.28f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectNormalModeOption(pixels, width, height)
    }

    fun detectMatchmakingTimer(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.70f).toInt()
        val top = (bitmap.height * 0.82f).toInt()
        val width = (bitmap.width * 0.28f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.16f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectMatchmakingTimer(pixels, width, height)
    }

    fun detectAugmentChoice(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.24f).toInt()
        val top = (bitmap.height * 0.15f).toInt()
        val width = (bitmap.width * 0.58f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.63f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectAugmentChoice(pixels, width, height)
    }

    fun detectEncounterChoice(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.24f).toInt()
        val top = (bitmap.height * 0.15f).toInt()
        val width = (bitmap.width * 0.58f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.63f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectEncounterChoice(pixels, width, height)
    }

    fun detectGiftChoice(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.25f).toInt()
        val top = (bitmap.height * 0.08f).toInt()
        val width = (bitmap.width * 0.55f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.40f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectGiftChoice(pixels, width, height)
    }

    fun detectSidePanelOpen(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.83f).toInt()
        val top = (bitmap.height * 0.20f).toInt()
        val width = (bitmap.width * 0.16f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.60f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectSidePanelOpen(pixels, width, height)
    }

    fun detectSettingsDialog(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectSettingsDialog(pixels, bitmap.width, bitmap.height)
    }

    fun detectRightPlayerList(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.86f).toInt()
        val top = (bitmap.height * 0.12f).toInt()
        val width = (bitmap.width * 0.13f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.72f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectRightPlayerList(pixels, width, height)
    }

    fun detectCombatHealthBars(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.30f).toInt()
        val top = combatHealthBarsCropTop(bitmap.height)
        val right = (bitmap.width * 0.92f).toInt().coerceAtLeast(left + 1)
        val bottom = (bitmap.height * 0.78f).toInt().coerceAtLeast(top + 1)
        val width = (right - left).coerceAtLeast(1)
        val height = (bottom - top).coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectCombatHealthBars(pixels, width, height)
    }

    fun detectInGameShopOverlay(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val top = (bitmap.height * 0.04f).toInt()
        val height = (bitmap.height * 0.38f).toInt().coerceAtLeast(1)
        val pixels = IntArray(bitmap.width * height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, top, bitmap.width, height)
        return detectInGameShopOverlay(pixels, bitmap.width, height)
    }

    fun detectInGameShopOverlay(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var darkPanelPixels = 0
        var goldBorderPixels = 0
        var brightTextPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (red <= 55 && green <= 60 && blue <= 80) {
                darkPanelPixels += 1
            }
            if (isModeCardGold(red, green, blue)) {
                goldBorderPixels += 1
            }
            if (red >= 190 && green >= 185 && blue >= 170) {
                brightTextPixels += 1
            }
        }
        val size = pixels.size.toFloat()
        return darkPanelPixels / size >= 0.35f &&
            goldBorderPixels / size >= 0.005f &&
            brightTextPixels / size >= 0.010f
    }

    fun detectUpdateReadyButton(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.36f).toInt()
        val top = (bitmap.height * 0.74f).toInt()
        val width = (bitmap.width * 0.28f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.12f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectUpdateReadyButton(pixels, width, height)
    }

    fun detectAcceptedWaitingScreen(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = (bitmap.width * 0.25f).toInt()
        val top = (bitmap.height * 0.08f).toInt()
        val width = (bitmap.width * 0.50f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.78f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        return detectAcceptedWaitingScreen(pixels, width, height)
    }

    fun detectTapToContinueScreen(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        if (detectBlueStacksLauncherHome(bitmap)) {
            return false
        }
        if (detectHelperOverlayControls(bitmap)) {
            return false
        }
        val fullPixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(fullPixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        if (detectReconnectLoadingOverlay(fullPixels, bitmap.width, bitmap.height)) {
            return false
        }
        val left = (bitmap.width * 0.35f).toInt()
        val top = (bitmap.height * 0.84f).toInt()
        val width = (bitmap.width * 0.30f).toInt().coerceAtLeast(1)
        val height = (bitmap.height * 0.12f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        if (detectTapToContinueScreen(pixels, width, height)) {
            return true
        }
        val titleLeft = (bitmap.width * 0.35f).toInt()
        val titleTop = (bitmap.height * 0.03f).toInt()
        val titleWidth = (bitmap.width * 0.30f).toInt().coerceAtLeast(1)
        val titleHeight = (bitmap.height * 0.12f).toInt().coerceAtLeast(1)
        val titlePixels = IntArray(titleWidth * titleHeight)
        bitmap.getPixels(titlePixels, 0, titleWidth, titleLeft, titleTop, titleWidth, titleHeight)
        return detectBrightTitleOnDarkBand(titlePixels)
    }

    fun detectHelperOverlayControls(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        val controls = countRegion(
            pixels,
            bitmap.width,
            bitmap.height,
            leftRatio = 0.38f,
            topRatio = 0.75f,
            rightRatio = 0.62f,
            bottomRatio = 0.96f
        )
        return controls.brightRatio >= 0.18f && controls.darkRatio >= 0.12f
    }

    fun detectBlueStacksLauncherHome(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectBlueStacksLauncherHome(pixels, bitmap.width, bitmap.height)
    }

    fun detectBlueStacksLauncherHome(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.size < width * height) {
            return false
        }
        if (detectTftLogoLoadingScreen(pixels, width, height)) {
            return false
        }
        val searchLeft = (width * 0.31f).toInt()
        val searchTop = (height * 0.08f).toInt()
        val searchWidth = (width * 0.38f).toInt().coerceAtLeast(1)
        val searchHeight = (height * 0.08f).toInt().coerceAtLeast(1)
        var brightSearchPixels = 0
        for (y in searchTop until searchTop + searchHeight) {
            for (x in searchLeft until searchLeft + searchWidth) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (red >= 210 && green >= 210 && blue >= 210) {
                    brightSearchPixels += 1
                }
            }
        }
        val brightSearchRatio = brightSearchPixels.toFloat() / (searchWidth * searchHeight).coerceAtLeast(1).toFloat()

        val iconTop = (height * 0.22f).toInt()
        val iconHeight = (height * 0.18f).toInt().coerceAtLeast(1)
        var colorfulPixels = 0
        for (y in iconTop until iconTop + iconHeight) {
            for (x in 0 until width) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (maxOf(red, green, blue) - minOf(red, green, blue) >= 80 && maxOf(red, green, blue) >= 120) {
                    colorfulPixels += 1
                }
            }
        }
        val colorfulRatio = colorfulPixels.toFloat() / (width * iconHeight).coerceAtLeast(1).toFloat()
        return brightSearchRatio >= 0.45f && colorfulRatio >= 0.01f
    }

    fun detectBlueStacksAppCenter(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectBlueStacksAppCenter(pixels, bitmap.width, bitmap.height)
    }

    fun detectBlueStacksAppCenter(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.size < width * height) {
            return false
        }
        return detectBlueStacksAppCenterHome(pixels, width, height) ||
            detectBlueStacksAppCenterDetail(pixels, width, height) ||
            detectGooglePlayStorePage(pixels, width, height)
    }

    private fun detectGooglePlayStorePage(pixels: IntArray, width: Int, height: Int): Boolean {
        var brightPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (red >= 235 && green >= 235 && blue >= 235) {
                brightPixels += 1
            }
        }
        val brightRatio = brightPixels.toFloat() / pixels.size.toFloat()
        val logo = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.42f,
            topRatio = 0.30f,
            rightRatio = 0.58f,
            bottomRatio = 0.48f
        )
        return brightRatio >= 0.65f && logo.colorfulRatio >= 0.06f
    }

    private fun detectBlueStacksAppCenterHome(pixels: IntArray, width: Int, height: Int): Boolean {
        var topBrightPixels = 0
        var topDarkTextPixels = 0
        var contentColorfulPixels = 0
        val topBottom = (height * 0.08f).toInt().coerceIn(1, height)
        val contentTop = (height * 0.10f).toInt().coerceIn(0, height - 1)
        val contentBottom = (height * 0.62f).toInt().coerceIn(contentTop + 1, height)
        for (y in 0 until topBottom) {
            for (x in 0 until width) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (red >= 235 && green >= 235 && blue >= 235) {
                    topBrightPixels += 1
                }
                if (red in 35..115 && green in 35..115 && blue in 45..135) {
                    topDarkTextPixels += 1
                }
            }
        }
        for (y in contentTop until contentBottom) {
            for (x in 0 until width) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (maxOf(red, green, blue) - minOf(red, green, blue) >= 70 && maxOf(red, green, blue) >= 130) {
                    contentColorfulPixels += 1
                }
            }
        }
        val topSize = (width * topBottom).coerceAtLeast(1).toFloat()
        val contentSize = (width * (contentBottom - contentTop)).coerceAtLeast(1).toFloat()
        return topBrightPixels / topSize >= 0.70f &&
            topDarkTextPixels / topSize >= 0.002f &&
            contentColorfulPixels / contentSize >= 0.12f
    }

    private fun detectBlueStacksAppCenterDetail(pixels: IntArray, width: Int, height: Int): Boolean {
        val goBack = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.02f,
            topRatio = 0.05f,
            rightRatio = 0.14f,
            bottomRatio = 0.13f
        )
        val install = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.03f,
            topRatio = 0.48f,
            rightRatio = 0.27f,
            bottomRatio = 0.56f
        )
        val lower = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.0f,
            topRatio = 0.60f,
            rightRatio = 1.0f,
            bottomRatio = 1.0f
        )
        return goBack.darkRatio >= 0.75f &&
            install.brightRatio >= 0.45f &&
            lower.brightRatio >= 0.35f &&
            lower.colorfulRatio >= 0.02f
    }

    private fun countRegion(
        pixels: IntArray,
        width: Int,
        height: Int,
        leftRatio: Float,
        topRatio: Float,
        rightRatio: Float,
        bottomRatio: Float
    ): RegionCounts {
        val left = (width * leftRatio).toInt().coerceIn(0, width - 1)
        val top = (height * topRatio).toInt().coerceIn(0, height - 1)
        val right = (width * rightRatio).toInt().coerceIn(left + 1, width)
        val bottom = (height * bottomRatio).toInt().coerceIn(top + 1, height)
        var brightPixels = 0
        var darkPixels = 0
        var colorfulPixels = 0
        var goldPixels = 0
        for (y in top until bottom) {
            for (x in left until right) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (red >= 200 && green >= 200 && blue >= 190) {
                    brightPixels += 1
                }
                if (red <= 70 && green <= 75 && blue <= 90) {
                    darkPixels += 1
                }
                if (maxOf(red, green, blue) - minOf(red, green, blue) >= 70 && maxOf(red, green, blue) >= 120) {
                    colorfulPixels += 1
                }
                if (isModeCardGold(red, green, blue)) {
                    goldPixels += 1
                }
            }
        }
        val size = ((right - left) * (bottom - top)).coerceAtLeast(1).toFloat()
        return RegionCounts(
            brightRatio = brightPixels / size,
            darkRatio = darkPixels / size,
            colorfulRatio = colorfulPixels / size,
            goldRatio = goldPixels / size
        )
    }

    fun detectTapToContinueScreen(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var brightTextPixels = 0
        var darkPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (red >= 175 && green >= 170 && blue >= 155) {
                brightTextPixels += 1
            }
            if (red <= 45 && green <= 50 && blue <= 65) {
                darkPixels += 1
            }
        }
        val brightRatio = brightTextPixels.toFloat() / pixels.size.toFloat()
        val darkRatio = darkPixels.toFloat() / pixels.size.toFloat()
        return brightRatio >= 0.001f && darkRatio >= 0.20f
    }

    private fun detectBrightTitleOnDarkBand(pixels: IntArray): Boolean {
        if (pixels.isEmpty()) {
            return false
        }
        var brightTextPixels = 0
        var darkPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (red >= 175 && green >= 170 && blue >= 155) {
                brightTextPixels += 1
            }
            if (red <= 45 && green <= 50 && blue <= 65) {
                darkPixels += 1
            }
        }
        val size = pixels.size.toFloat()
        return brightTextPixels / size >= 0.02f && darkPixels / size >= 0.35f
    }

    fun detectAcceptedWaitingScreen(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var cyanRingPixels = 0
        var darkOverlayPixels = 0
        var brightTextPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (blue >= 125 && green >= 100 && red <= 110 && blue > red + 30) {
                cyanRingPixels += 1
            }
            if (red <= 50 && green <= 55 && blue <= 65) {
                darkOverlayPixels += 1
            }
            if (red >= 190 && green >= 185 && blue >= 170) {
                brightTextPixels += 1
            }
        }
        val cyanRatio = cyanRingPixels.toFloat() / pixels.size.toFloat()
        val darkRatio = darkOverlayPixels.toFloat() / pixels.size.toFloat()
        val brightRatio = brightTextPixels.toFloat() / pixels.size.toFloat()
        return cyanRatio >= 0.025f && darkRatio >= 0.30f && brightRatio >= 0.015f
    }

    fun detectLoadingScreen(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val left = 0
        val top = (bitmap.height * 0.90f).toInt()
        val width = bitmap.width
        val height = (bitmap.height * 0.10f).toInt().coerceAtLeast(1)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, left, top, width, height)
        if (detectLoadingScreen(pixels, width, height)) {
            return true
        }
        val fullPixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(fullPixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectReconnectLoadingOverlay(fullPixels, bitmap.width, bitmap.height) ||
            detectLoadingRosterScreen(fullPixels, bitmap.width, bitmap.height) ||
            detectTftLogoLoadingScreen(fullPixels, bitmap.width, bitmap.height)
    }

    fun detectLoadingScreen(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var cyanPixels = 0
        var maxCyanPixelsInRow = 0
        for (y in 0 until height) {
            var cyanPixelsInRow = 0
            for (x in 0 until width) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (isLoadingBarCyan(red, green, blue)) {
                    cyanPixels += 1
                    cyanPixelsInRow += 1
                }
            }
            maxCyanPixelsInRow = maxOf(maxCyanPixelsInRow, cyanPixelsInRow)
        }
        val rowRatio = maxCyanPixelsInRow.toFloat() / width.toFloat()
        val totalRatio = cyanPixels.toFloat() / pixels.size.toFloat()
        return rowRatio >= 0.035f && totalRatio <= 0.030f && cyanPixels >= (width * 0.20f).toInt()
    }

    fun detectReconnectLoadingOverlay(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.size < width * height) {
            return false
        }
        val center = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.25f,
            topRatio = 0.10f,
            rightRatio = 0.75f,
            bottomRatio = 0.38f
        )
        if (center.darkRatio < 0.25f || center.brightRatio < 0.012f) {
            return false
        }
        val left = (width * 0.25f).toInt().coerceIn(0, width - 1)
        val top = (height * 0.10f).toInt().coerceIn(0, height - 1)
        val right = (width * 0.75f).toInt().coerceIn(left + 1, width)
        val bottom = (height * 0.38f).toInt().coerceIn(top + 1, height)
        val cropWidth = right - left
        var maxCyanPixelsInRow = 0
        var cyanPixels = 0
        for (y in top until bottom) {
            var cyanPixelsInRow = 0
            for (x in left until right) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (isLoadingBarCyan(red, green, blue)) {
                    cyanPixels += 1
                    cyanPixelsInRow += 1
                }
            }
            maxCyanPixelsInRow = maxOf(maxCyanPixelsInRow, cyanPixelsInRow)
        }
        val rowRatio = maxCyanPixelsInRow.toFloat() / cropWidth.toFloat()
        val cropArea = (cropWidth * (bottom - top)).coerceAtLeast(1).toFloat()
        val totalRatio = cyanPixels.toFloat() / cropArea
        return rowRatio >= 0.16f && totalRatio >= 0.010f
    }

    fun detectLoadingRosterScreen(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.size < width * height) {
            return false
        }
        val topCards = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.18f,
            topRatio = 0.06f,
            rightRatio = 0.82f,
            bottomRatio = 0.49f
        )
        val bottomCards = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.18f,
            topRatio = 0.54f,
            rightRatio = 0.82f,
            bottomRatio = 0.98f
        )
        return topCards.colorfulRatio >= 0.18f &&
            bottomCards.colorfulRatio >= 0.06f &&
            topCards.darkRatio >= 0.08f &&
            bottomCards.darkRatio >= 0.08f &&
            bottomCards.brightRatio >= 0.01f
    }

    fun detectTftLogoLoadingScreen(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.size < width * height) {
            return false
        }
        val logoBand = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.14f,
            topRatio = 0.18f,
            rightRatio = 0.86f,
            bottomRatio = 0.62f
        )
        val backdrop = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.00f,
            topRatio = 0.00f,
            rightRatio = 1.00f,
            bottomRatio = 1.00f
        )
        val bottomLogo = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.02f,
            topRatio = 0.88f,
            rightRatio = 0.24f,
            bottomRatio = 0.99f
        )
        return logoBand.brightRatio >= 0.10f &&
            backdrop.colorfulRatio >= 0.35f &&
            backdrop.darkRatio <= 0.45f &&
            bottomLogo.brightRatio >= 0.02f
    }

    fun detectUpdateReadyButton(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var goldBorderPixels = 0
        var darkButtonPixels = 0
        var brightTextPixels = 0
        var mutedTextPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (isModeCardGold(red, green, blue)) {
                goldBorderPixels += 1
            }
            if (red <= 80 && green <= 70 && blue <= 55) {
                darkButtonPixels += 1
            }
            if (red >= 190 && green >= 185 && blue >= 170) {
                brightTextPixels += 1
            }
            if (red >= 120 && green >= 110 && blue >= 90 && kotlin.math.abs(red - green) <= 55) {
                mutedTextPixels += 1
            }
        }
        val goldRatio = goldBorderPixels.toFloat() / pixels.size.toFloat()
        val darkRatio = darkButtonPixels.toFloat() / pixels.size.toFloat()
        val brightRatio = brightTextPixels.toFloat() / pixels.size.toFloat()
        val mutedRatio = mutedTextPixels.toFloat() / pixels.size.toFloat()
        return goldRatio >= 0.025f && darkRatio >= 0.20f && (brightRatio >= 0.015f || mutedRatio >= 0.012f)
    }

    fun detectAugmentChoice(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var purpleCardPixels = 0
        var goldCardPixels = 0
        var darkCardPixels = 0
        var brightTextPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (blue >= 95 && red >= 45 && green <= 115 && blue - red >= 15) {
                purpleCardPixels += 1
            }
            if (red >= 170 && green >= 120 && green <= 190 && blue <= 80) {
                goldCardPixels += 1
            }
            if (red <= 55 && green <= 50 && blue <= 85) {
                darkCardPixels += 1
            }
            if (red >= 190 && green >= 185 && blue >= 170) {
                brightTextPixels += 1
            }
        }
        val purpleRatio = purpleCardPixels.toFloat() / pixels.size.toFloat()
        val goldRatio = goldCardPixels.toFloat() / pixels.size.toFloat()
        val darkRatio = darkCardPixels.toFloat() / pixels.size.toFloat()
        val brightRatio = brightTextPixels.toFloat() / pixels.size.toFloat()
        val classicCardLayout = (purpleRatio in 0.20f..0.45f || goldRatio in 0.08f..0.35f) &&
            darkRatio >= 0.18f &&
            brightRatio >= 0.02f
        val brightCrystalCardLayout = purpleRatio in 0.45f..0.75f &&
            goldRatio >= 0.015f &&
            darkRatio <= 0.12f &&
            brightRatio >= 0.006f
        return classicCardLayout || brightCrystalCardLayout
    }

    fun detectEncounterChoice(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var purplePixels = 0
        var darkCardPixels = 0
        var brightTextPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (blue >= 95 && red >= 45 && green <= 115 && blue - red >= 15) {
                purplePixels += 1
            }
            if (red <= 55 && green <= 50 && blue <= 85) {
                darkCardPixels += 1
            }
            if (red >= 190 && green >= 185 && blue >= 170) {
                brightTextPixels += 1
            }
        }
        val purpleRatio = purplePixels.toFloat() / pixels.size.toFloat()
        val darkRatio = darkCardPixels.toFloat() / pixels.size.toFloat()
        val brightRatio = brightTextPixels.toFloat() / pixels.size.toFloat()
        return purpleRatio <= 0.08f && darkRatio >= 0.55f && brightRatio >= 0.02f
    }

    fun detectGiftChoice(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var darkPixels = 0
        var brightTextPixels = 0
        var goldPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (red <= 55 && green <= 50 && blue <= 85) {
                darkPixels += 1
            }
            if (red >= 190 && green >= 185 && blue >= 170) {
                brightTextPixels += 1
            }
            if (isModeCardGold(red, green, blue)) {
                goldPixels += 1
            }
        }
        val darkRatio = darkPixels.toFloat() / pixels.size.toFloat()
        val brightRatio = brightTextPixels.toFloat() / pixels.size.toFloat()
        val goldRatio = goldPixels.toFloat() / pixels.size.toFloat()
        return darkRatio >= 0.50f && brightRatio >= 0.008f && goldRatio >= 0.0005f
    }

    fun detectSettingsDialog(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.size < width * height) {
            return false
        }
        val modal = countRegion(pixels, width, height, 0.16f, 0.09f, 0.84f, 0.92f)
        val topEdge = countRegion(pixels, width, height, 0.16f, 0.09f, 0.84f, 0.13f)
        val leftEdge = countRegion(pixels, width, height, 0.16f, 0.09f, 0.18f, 0.92f)
        val rightEdge = countRegion(pixels, width, height, 0.82f, 0.09f, 0.84f, 0.92f)
        val closeX = countRegion(pixels, width, height, 0.78f, 0.12f, 0.82f, 0.18f)
        val sliderBand = countRegion(pixels, width, height, 0.38f, 0.24f, 0.80f, 0.72f)
        val goldFrameRatio = topEdge.goldRatio + leftEdge.goldRatio + rightEdge.goldRatio
        return modal.darkRatio >= 0.35f &&
            modal.brightRatio >= 0.001f &&
            goldFrameRatio >= 0.045f &&
            closeX.goldRatio >= 0.020f &&
            sliderBand.darkRatio >= 0.55f
    }

    fun detectSidePanelOpen(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var darkPixels = 0
        var goldPixels = 0
        var brightTextPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (red <= 45 && green <= 60 && blue <= 65) {
                darkPixels += 1
            }
            if (isModeCardGold(red, green, blue)) {
                goldPixels += 1
            }
            if (red >= 170 && green >= 165 && blue >= 145) {
                brightTextPixels += 1
            }
        }
        val darkRatio = darkPixels.toFloat() / pixels.size.toFloat()
        val goldRatio = goldPixels.toFloat() / pixels.size.toFloat()
        val brightTextRatio = brightTextPixels.toFloat() / pixels.size.toFloat()
        return (darkRatio >= 0.45f && goldRatio >= 0.03f) ||
            (darkRatio >= 0.65f && brightTextRatio >= 0.012f && goldRatio <= 0.025f)
    }

    fun detectRightPlayerList(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var brightTextPixels = 0
        var colorfulAvatarPixels = 0
        var darkHudPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            val max = maxOf(red, green, blue)
            val min = minOf(red, green, blue)
            if (red >= 180 && green >= 175 && blue >= 155) {
                brightTextPixels += 1
            }
            if (max - min >= 75 && max >= 130) {
                colorfulAvatarPixels += 1
            }
            if (red <= 65 && green <= 70 && blue <= 85) {
                darkHudPixels += 1
            }
        }
        val size = pixels.size.toFloat()
        return brightTextPixels / size >= 0.025f &&
            colorfulAvatarPixels / size >= 0.020f &&
            darkHudPixels / size >= 0.08f
    }

    fun detectCombatHealthBars(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var redHealthPixels = 0
        var rowsWithHealthBand = 0
        for (y in 0 until height) {
            var redPixelsInRow = 0
            for (x in 0 until width) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (red >= 135 && green <= 90 && blue <= 85 && red - green >= 45) {
                    redHealthPixels += 1
                    redPixelsInRow += 1
                }
            }
            if (redPixelsInRow >= maxOf(18, (width * 0.012f).toInt())) {
                rowsWithHealthBand += 1
            }
        }
        val minPixels = maxOf(32, (pixels.size * 0.0012f).toInt())
        return redHealthPixels >= minPixels && rowsWithHealthBand >= 2
    }

    internal fun combatHealthBarsCropTop(height: Int): Int {
        return (height * 0.04f).toInt().coerceAtLeast(0)
    }

    fun detectMatchmakingTimer(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var darkButtonPixels = 0
        var goldBorderPixels = 0
        for (pixel in pixels) {
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            if (red in 20..95 && green in 25..100 && blue in 30..110) {
                darkButtonPixels += 1
            }
            if (isModeCardGold(red, green, blue)) {
                goldBorderPixels += 1
            }
        }
        val darkRatio = darkButtonPixels.toFloat() / pixels.size.toFloat()
        val goldRatio = goldBorderPixels.toFloat() / pixels.size.toFloat()
        return darkRatio >= 0.35f && goldRatio >= 0.015f
    }

    fun detectModeSelect(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        if (AndroidDialogVisualDetector.detectProminentConfirmDialog(pixels, width, height)) {
            return false
        }
        var goldBorderPixels = 0
        var darkOverlayPixels = 0
        var colorfulPixels = 0
        var maxGoldPixelsInColumn = 0
        for (x in 0 until width) {
            var goldPixelsInColumn = 0
            for (y in 0 until height) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (isModeCardGold(red, green, blue)) {
                    goldBorderPixels += 1
                    goldPixelsInColumn += 1
                }
                if (isDialogDark(red, green, blue)) {
                    darkOverlayPixels += 1
                }
                if (maxOf(red, green, blue) - minOf(red, green, blue) >= 70 && maxOf(red, green, blue) >= 120) {
                    colorfulPixels += 1
                }
            }
            maxGoldPixelsInColumn = maxOf(maxGoldPixelsInColumn, goldPixelsInColumn)
        }
        val goldRatio = goldBorderPixels.toFloat() / pixels.size.toFloat()
        val darkRatio = darkOverlayPixels.toFloat() / pixels.size.toFloat()
        val colorfulRatio = colorfulPixels.toFloat() / pixels.size.toFloat()
        val columnRatio = maxGoldPixelsInColumn.toFloat() / height.toFloat()
        val plainModePanel = colorfulRatio < 0.08f && (goldRatio >= 0.012f || columnRatio >= 0.28f)
        val colorfulCardPanel = goldRatio >= 0.045f && columnRatio >= 0.45f && darkRatio <= 0.55f
        return darkRatio >= 0.18f && (plainModePanel || colorfulCardPanel)
    }

    internal fun detectModeRoomCustomizationOverlay(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        val cardLeft = (width * 0.18f).toInt()
        val cardTop = (height * 0.26f).toInt()
        val cardWidth = (width * 0.72f).toInt().coerceAtLeast(1)
        val cardHeight = (height * 0.58f).toInt().coerceAtLeast(1)
        if (!detectModeSelect(cropPixels(pixels, width, cardLeft, cardTop, cardWidth, cardHeight), cardWidth, cardHeight)) {
            return false
        }

        val left = (width * 0.36f).toInt()
        val top = (height * 0.74f).toInt()
        val regionWidth = (width * 0.28f).toInt().coerceAtLeast(1)
        val regionHeight = (height * 0.12f).toInt().coerceAtLeast(1)
        var darkPixels = 0
        var goldPixels = 0
        var brightPixels = 0
        var maxGoldPixelsInRow = 0
        for (y in 0 until regionHeight) {
            var goldPixelsInRow = 0
            for (x in 0 until regionWidth) {
                val sourceX = left + x
                val sourceY = top + y
                if (sourceX !in 0 until width || sourceY !in 0 until height) {
                    continue
                }
                val pixel = pixels[sourceY * width + sourceX]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (isDialogDark(red, green, blue)) {
                    darkPixels += 1
                }
                if (isModeCardGold(red, green, blue)) {
                    goldPixels += 1
                    goldPixelsInRow += 1
                }
                if (red >= 210 && green >= 200 && blue >= 165) {
                    brightPixels += 1
                }
            }
            maxGoldPixelsInRow = maxOf(maxGoldPixelsInRow, goldPixelsInRow)
        }
        val size = (regionWidth * regionHeight).toFloat()
        val darkRatio = darkPixels.toFloat() / size
        val goldRatio = goldPixels.toFloat() / size
        val brightRatio = brightPixels.toFloat() / size
        val goldRowRatio = maxGoldPixelsInRow.toFloat() / regionWidth.toFloat()
        return darkRatio >= 0.35f &&
            (goldRowRatio >= 0.35f || brightRatio >= 0.005f && goldRatio >= 0.025f)
    }

    internal fun detectMatchRoomHeader(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var goldPixels = 0
        var darkPixels = 0
        var maxGoldPixelsInRow = 0
        var maxDarkPixelsInRow = 0
        var maxBrightPixelsInRow = 0
        for (y in 0 until height) {
            var goldPixelsInRow = 0
            var darkPixelsInRow = 0
            var brightPixelsInRow = 0
            for (x in 0 until width) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (isModeCardGold(red, green, blue)) {
                    goldPixels += 1
                    goldPixelsInRow += 1
                }
                if (isDialogDark(red, green, blue)) {
                    darkPixels += 1
                    darkPixelsInRow += 1
                }
                if (red >= 185 && green >= 180 && blue >= 160) {
                    brightPixelsInRow += 1
                }
            }
            maxGoldPixelsInRow = maxOf(maxGoldPixelsInRow, goldPixelsInRow)
            maxDarkPixelsInRow = maxOf(maxDarkPixelsInRow, darkPixelsInRow)
            maxBrightPixelsInRow = maxOf(maxBrightPixelsInRow, brightPixelsInRow)
        }
        val size = pixels.size.toFloat()
        val maxGoldRowRatio = maxGoldPixelsInRow.toFloat() / width.coerceAtLeast(1).toFloat()
        val maxDarkRowRatio = maxDarkPixelsInRow.toFloat() / width.coerceAtLeast(1).toFloat()
        val maxBrightRowRatio = maxBrightPixelsInRow.toFloat() / width.coerceAtLeast(1).toFloat()
        return goldPixels / size >= 0.02f &&
            maxGoldRowRatio >= 0.45f &&
            maxDarkRowRatio >= 0.55f &&
            maxBrightRowRatio < 0.45f
    }

    fun detectCareerHistoryScreen(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        val backHeader = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.0f,
            topRatio = 0.0f,
            rightRatio = 0.17f,
            bottomRatio = 0.10f
        )
        val titleHeader = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.18f,
            topRatio = 0.0f,
            rightRatio = 0.42f,
            bottomRatio = 0.10f
        )
        val leftNav = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.0f,
            topRatio = 0.10f,
            rightRatio = 0.18f,
            bottomRatio = 0.30f
        )
        val recordRows = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.20f,
            topRatio = 0.12f,
            rightRatio = 0.88f,
            bottomRatio = 0.94f
        )
        val topRightChrome = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.62f,
            topRatio = 0.0f,
            rightRatio = 0.98f,
            bottomRatio = 0.10f
        )
        return backHeader.darkRatio >= 0.40f &&
            backHeader.colorfulRatio >= 0.015f &&
            titleHeader.brightRatio >= 0.01f &&
            leftNav.brightRatio >= 0.01f &&
            leftNav.darkRatio >= 0.15f &&
            recordRows.brightRatio >= 0.008f &&
            recordRows.colorfulRatio >= 0.035f &&
            topRightChrome.brightRatio >= 0.015f
    }

    fun detectFullBenchWarning(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        val banner = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.33f,
            topRatio = 0.66f,
            rightRatio = 0.68f,
            bottomRatio = 0.75f
        )
        val lowerBench = countRegion(
            pixels,
            width,
            height,
            leftRatio = 0.24f,
            topRatio = 0.78f,
            rightRatio = 0.86f,
            bottomRatio = 0.98f
        )
        val lowerBenchUnitLikeRatio = countNonPurpleColorfulRegion(
            pixels,
            width,
            height,
            leftRatio = 0.24f,
            topRatio = 0.78f,
            rightRatio = 0.86f,
            bottomRatio = 0.98f
        )
        return banner.darkRatio >= 0.30f &&
            banner.brightRatio >= 0.025f &&
            lowerBench.colorfulRatio >= 0.08f &&
            lowerBenchUnitLikeRatio >= 0.08f
    }

    fun detectVisualBenchFull(bitmap: Bitmap): Boolean {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            return false
        }
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return countVisualBenchOccupiedSlots(pixels, bitmap.width, bitmap.height) >= 8
    }

    fun countVisualBenchOccupiedSlots(pixels: IntArray, width: Int, height: Int): Int {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return 0
        }
        val centers = floatArrayOf(0.18f, 0.26f, 0.35f, 0.44f, 0.54f, 0.64f, 0.73f, 0.82f, 0.90f)
        return centers.count { center ->
            isVisualBenchSlotOccupied(pixels, width, height, center)
        }
    }

    private fun isVisualBenchSlotOccupied(pixels: IntArray, width: Int, height: Int, center: Float): Boolean {
        val left = (width * (center - 0.035f)).toInt().coerceIn(0, width - 1)
        val top = (height * 0.84f).toInt().coerceIn(0, height - 1)
        val right = (width * (center + 0.035f)).toInt().coerceIn(left + 1, width)
        val bottom = (height * 0.965f).toInt().coerceIn(top + 1, height)
        var darkPixels = 0
        var cyanPixels = 0
        for (y in top until bottom) {
            for (x in left until right) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (red <= 70 && green <= 75 && blue <= 90) {
                    darkPixels += 1
                }
                if (red <= 110 && green >= 120 && blue >= 150) {
                    cyanPixels += 1
                }
            }
        }
        val size = ((right - left) * (bottom - top)).coerceAtLeast(1).toFloat()
        val darkRatio = darkPixels / size
        val cyanRatio = cyanPixels / size
        return darkRatio >= 0.06f && cyanRatio <= 0.38f
    }

    private fun countNonPurpleColorfulRegion(
        pixels: IntArray,
        width: Int,
        height: Int,
        leftRatio: Float,
        topRatio: Float,
        rightRatio: Float,
        bottomRatio: Float
    ): Float {
        val left = (width * leftRatio).toInt().coerceIn(0, width - 1)
        val top = (height * topRatio).toInt().coerceIn(0, height - 1)
        val right = (width * rightRatio).toInt().coerceIn(left + 1, width)
        val bottom = (height * bottomRatio).toInt().coerceIn(top + 1, height)
        var colorfulPixels = 0
        for (y in top until bottom) {
            for (x in left until right) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                val chroma = maxOf(red, green, blue) - minOf(red, green, blue)
                val purpleBackdrop = blue > red + 40 && red > green + 20 && green < 105
                if (chroma >= 60 && maxOf(red, green, blue) >= 120 && !purpleBackdrop) {
                    colorfulPixels += 1
                }
            }
        }
        val size = ((right - left) * (bottom - top)).coerceAtLeast(1).toFloat()
        return colorfulPixels / size
    }

    fun detectNormalModeOption(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var goldPixels = 0
        var darkPixels = 0
        var labelPixels = 0
        val labelTop = (height * 0.58f).toInt()
        val labelBottom = (height * 0.86f).toInt()
        val labelLeft = (width * 0.18f).toInt()
        val labelRight = (width * 0.82f).toInt()
        for (y in 0 until height) {
            for (x in 0 until width) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (isModeCardGold(red, green, blue)) {
                    goldPixels += 1
                }
                if (isDialogDark(red, green, blue)) {
                    darkPixels += 1
                }
                if (x in labelLeft until labelRight && y in labelTop until labelBottom && red >= 185 && green >= 180 && blue >= 155) {
                    labelPixels += 1
                }
            }
        }
        val size = pixels.size.toFloat()
        val labelArea = ((labelRight - labelLeft) * (labelBottom - labelTop)).coerceAtLeast(1).toFloat()
        return goldPixels / size >= 0.025f &&
            darkPixels / size >= 0.18f &&
            labelPixels / labelArea >= 0.04f
    }

    fun detectAcceptReadyButton(bitmap: Bitmap): Boolean {
        val pixels = IntArray(bitmap.width * bitmap.height)
        bitmap.getPixels(pixels, 0, bitmap.width, 0, 0, bitmap.width, bitmap.height)
        return detectAcceptReadyButton(pixels, bitmap.width, bitmap.height)
    }

    fun detectAcceptReadyButton(pixels: IntArray, width: Int, height: Int): Boolean {
        if (width <= 0 || height <= 0 || pixels.isEmpty()) {
            return false
        }
        var darkDialogPixels = 0
        var bluePixelsInButtonBand = 0
        var buttonBandPixels = 0
        var maxBluePixelsInRow = 0
        val buttonTop = (height * 0.62f).toInt()
        val buttonBottom = (height * 0.94f).toInt()
        val buttonLeft = (width * 0.24f).toInt()
        val buttonRight = (width * 0.76f).toInt()
        for (y in 0 until height) {
            var bluePixelsInRow = 0
            for (x in 0 until width) {
                val pixel = pixels[y * width + x]
                val red = pixel shr 16 and 0xff
                val green = pixel shr 8 and 0xff
                val blue = pixel and 0xff
                if (isDialogDark(red, green, blue)) {
                    darkDialogPixels += 1
                }
                if (x in buttonLeft until buttonRight && y in buttonTop until buttonBottom) {
                    buttonBandPixels += 1
                    if (isStartButtonBlue(red, green, blue)) {
                        bluePixelsInButtonBand += 1
                        bluePixelsInRow += 1
                    }
                }
            }
            maxBluePixelsInRow = maxOf(maxBluePixelsInRow, bluePixelsInRow)
        }
        val darkRatio = darkDialogPixels.toFloat() / pixels.size.toFloat()
        val ratio = bluePixelsInButtonBand.toFloat() / buttonBandPixels.coerceAtLeast(1).toFloat()
        val rowRatio = maxBluePixelsInRow.toFloat() / (buttonRight - buttonLeft).coerceAtLeast(1).toFloat()
        return darkRatio >= 0.15f && ratio >= 0.035f && rowRatio >= 0.45f
    }

    private fun isStartButtonBlue(red: Int, green: Int, blue: Int): Boolean {
        val deepBlue = blue >= 125 && green >= 55 && red <= 95 && blue - red >= 55
        val cyanEdge = blue >= 150 && green >= 120 && red <= 120 && blue - red >= 45
        return deepBlue || cyanEdge
    }

    private fun cropPixels(
        pixels: IntArray,
        sourceWidth: Int,
        left: Int,
        top: Int,
        width: Int,
        height: Int
    ): IntArray {
        val result = IntArray(width * height)
        for (y in 0 until height) {
            val sourceY = top + y
            for (x in 0 until width) {
                val sourceX = left + x
                result[y * width + x] = if (
                    sourceX in 0 until sourceWidth &&
                    sourceY >= 0 &&
                    sourceY * sourceWidth + sourceX in pixels.indices
                ) {
                    pixels[sourceY * sourceWidth + sourceX]
                } else {
                    0
                }
            }
        }
        return result
    }

    private fun isDialogDark(red: Int, green: Int, blue: Int): Boolean {
        return red <= 55 && green <= 65 && blue <= 75
    }

    private fun isModeCardGold(red: Int, green: Int, blue: Int): Boolean {
        return red in 115..230 && green in 85..190 && blue in 25..115 && red > blue + 45 && green > blue + 20
    }

    private fun isLoadingBarCyan(red: Int, green: Int, blue: Int): Boolean {
        return red <= 105 && green >= 105 && blue >= 95 && green > red + 25 && blue > red + 15
    }

    private data class RegionCounts(
        val brightRatio: Float,
        val darkRatio: Float,
        val colorfulRatio: Float,
        val goldRatio: Float = 0f
    )
}
