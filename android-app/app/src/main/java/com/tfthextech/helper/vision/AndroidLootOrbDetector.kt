package com.tfthextech.helper.vision

import android.graphics.Bitmap
import com.tfthextech.helper.protocol.PointF01

internal object AndroidLootOrbDetector {
    fun detect(frame: Bitmap): PointF01? {
        return detect(frame, requireQuestionGlyph = false)
    }

    fun detectQuestionGlyph(frame: Bitmap): PointF01? {
        return detect(frame, requireQuestionGlyph = true)
    }

    fun detectCombat(frame: Bitmap): PointF01? {
        return detectQuestionGlyph(frame)
    }

    private fun detect(frame: Bitmap, requireQuestionGlyph: Boolean): PointF01? {
        if (frame.width <= 0 || frame.height <= 0) {
            return null
        }
        val bounds = BoardBounds.from(frame.width, frame.height)
        val regionWidth = bounds.right - bounds.left
        val regionHeight = bounds.bottom - bounds.top
        if (regionWidth <= 0 || regionHeight <= 0) {
            return null
        }
        val pixels = IntArray(regionWidth * regionHeight)
        frame.getPixels(pixels, 0, regionWidth, bounds.left, bounds.top, regionWidth, regionHeight)
        if (requireQuestionGlyph) {
            return findQuestionGlyphFallback(
                pixels = pixels,
                stride = regionWidth,
                normWidth = frame.width,
                normHeight = frame.height,
                scanLeft = 0,
                scanTop = 0,
                scanRight = regionWidth,
                scanBottom = regionHeight,
                offsetX = bounds.left,
                offsetY = bounds.top
            )
        }
        return findQuestionGlyphFallback(
            pixels = pixels,
            stride = regionWidth,
            normWidth = frame.width,
            normHeight = frame.height,
            scanLeft = 0,
            scanTop = 0,
            scanRight = regionWidth,
            scanBottom = regionHeight,
            offsetX = bounds.left,
            offsetY = bounds.top
        ) ?: findBestComponent(
            pixels = pixels,
            stride = regionWidth,
            normWidth = frame.width,
            normHeight = frame.height,
            scanLeft = 0,
            scanTop = 0,
            scanRight = regionWidth,
            scanBottom = regionHeight,
            offsetX = bounds.left,
            offsetY = bounds.top
        )
    }

    internal fun detect(pixels: IntArray, width: Int, height: Int): PointF01? {
        return detect(pixels, width, height, requireQuestionGlyph = false)
    }

    internal fun detectQuestionGlyph(pixels: IntArray, width: Int, height: Int): PointF01? {
        return detect(pixels, width, height, requireQuestionGlyph = true)
    }

    internal fun detectCombat(pixels: IntArray, width: Int, height: Int): PointF01? {
        return detectQuestionGlyph(pixels, width, height)
    }

    private fun detect(pixels: IntArray, width: Int, height: Int, requireQuestionGlyph: Boolean): PointF01? {
        if (width <= 0 || height <= 0 || pixels.size < width * height) {
            return null
        }
        val bounds = BoardBounds.from(width, height)
        if (requireQuestionGlyph) {
            return findQuestionGlyphFallback(
                pixels = pixels,
                stride = width,
                normWidth = width,
                normHeight = height,
                scanLeft = bounds.left,
                scanTop = bounds.top,
                scanRight = bounds.right,
                scanBottom = bounds.bottom,
                offsetX = 0,
                offsetY = 0
            )
        }
        return findQuestionGlyphFallback(
            pixels = pixels,
            stride = width,
            normWidth = width,
            normHeight = height,
            scanLeft = bounds.left,
            scanTop = bounds.top,
            scanRight = bounds.right,
            scanBottom = bounds.bottom,
            offsetX = 0,
            offsetY = 0
        ) ?: findBestComponent(
            pixels = pixels,
            stride = width,
            normWidth = width,
            normHeight = height,
            scanLeft = bounds.left,
            scanTop = bounds.top,
            scanRight = bounds.right,
            scanBottom = bounds.bottom,
            offsetX = 0,
            offsetY = 0
        )
    }

    private fun findBestComponent(
        pixels: IntArray,
        stride: Int,
        normWidth: Int,
        normHeight: Int,
        scanLeft: Int,
        scanTop: Int,
        scanRight: Int,
        scanBottom: Int,
        offsetX: Int,
        offsetY: Int
    ): PointF01? {
        val visited = BooleanArray(pixels.size)
        val queue = IntArray(pixels.size)
        val minArea = maxOf(18, (normWidth * normHeight * 0.00005f).toInt())
        var best: Component? = null
        var bestScore = 0

        for (y in scanTop until scanBottom) {
            for (x in scanLeft until scanRight) {
                val startIndex = y * stride + x
                if (visited[startIndex] || !isLootColor(pixels[startIndex])) {
                    continue
                }

                var head = 0
                var tail = 0
                queue[tail++] = startIndex
                visited[startIndex] = true
                var count = 0
                var sumX = 0L
                var sumY = 0L
                var minX = x
                var maxX = x
                var minY = y
                var maxY = y

                while (head < tail) {
                    val index = queue[head++]
                    val currentY = index / stride
                    val currentX = index - currentY * stride
                    count += 1
                    sumX += currentX
                    sumY += currentY
                    minX = minOf(minX, currentX)
                    maxX = maxOf(maxX, currentX)
                    minY = minOf(minY, currentY)
                    maxY = maxOf(maxY, currentY)

                    tail = enqueueNeighbor(pixels, visited, queue, tail, currentX - 1, currentY, stride, scanLeft, scanTop, scanRight, scanBottom)
                    tail = enqueueNeighbor(pixels, visited, queue, tail, currentX + 1, currentY, stride, scanLeft, scanTop, scanRight, scanBottom)
                    tail = enqueueNeighbor(pixels, visited, queue, tail, currentX, currentY - 1, stride, scanLeft, scanTop, scanRight, scanBottom)
                    tail = enqueueNeighbor(pixels, visited, queue, tail, currentX, currentY + 1, stride, scanLeft, scanTop, scanRight, scanBottom)
                }

                if (count < minArea) {
                    continue
                }
                val componentWidth = maxX - minX + 1
                val componentHeight = maxY - minY + 1
                val aspect = componentWidth.toFloat() / componentHeight.coerceAtLeast(1).toFloat()
                if (aspect !in 0.70f..1.35f) {
                    continue
                }
                val brightCount = countCenteredBrightPixels(pixels, stride, minX, minY, maxX, maxY)
                if (brightCount < 4) {
                    continue
                }
                val centerX = (sumX.toFloat() / count + offsetX) / normWidth
                val centerY = (sumY.toFloat() / count + offsetY) / normHeight
                if (centerX !in 0.16f..0.88f || centerY !in 0.18f..0.84f) {
                    continue
                }
                val score = count + brightCount * 4
                if (score > bestScore) {
                    bestScore = score
                    best = Component(sumX = sumX, sumY = sumY, count = count)
                }
            }
        }

        val component = best ?: return null
        val centerX = (component.sumX.toFloat() / component.count + offsetX) / normWidth
        val centerY = (component.sumY.toFloat() / component.count + offsetY) / normHeight
        return PointF01(centerX.coerceIn(0f, 1f), centerY.coerceIn(0f, 1f))
    }

    private fun findQuestionGlyphFallback(
        pixels: IntArray,
        stride: Int,
        normWidth: Int,
        normHeight: Int,
        scanLeft: Int,
        scanTop: Int,
        scanRight: Int,
        scanBottom: Int,
        offsetX: Int,
        offsetY: Int
    ): PointF01? {
        val components = findColorComponents(
            pixels = pixels,
            stride = stride,
            scanLeft = scanLeft,
            scanTop = scanTop,
            scanRight = scanRight,
            scanBottom = scanBottom,
            matcher = ::isQuestionGlyphPixel
        )
        val candidates = components
            .asSequence()
            .filter { it.count in 24..140 }
            .filter { it.width in 5..28 && it.height in 6..26 }
            .filter { it.aspect in 0.30f..2.20f }
            .filter { component ->
                val x = (component.centerX + offsetX) / normWidth
                val y = (component.centerY + offsetY) / normHeight
                x in 0.16f..0.80f && y in 0.22f..0.84f
            }
            .toList()
        val component = chooseQuestionGlyphCandidate(candidates, offsetX, offsetY, normWidth, normHeight)
        return component
            ?.let { component ->
                val centerX = (component.centerX + offsetX) / normWidth
                val rawCenterY = (component.centerY + offsetY) / normHeight
                val centerY = if (rawCenterY >= 0.42f) rawCenterY + LOWER_BOARD_ORB_CENTER_Y_OFFSET else rawCenterY
                PointF01(centerX.coerceIn(0f, 1f), centerY.coerceIn(0f, 1f))
            }
    }

    private fun chooseQuestionGlyphCandidate(
        candidates: List<Component>,
        offsetX: Int,
        offsetY: Int,
        normWidth: Int,
        normHeight: Int
    ): Component? {
        val strongest = candidates.maxByOrNull { it.count } ?: return null
        val strongestX = (strongest.centerX + offsetX) / normWidth
        val strongestY = (strongest.centerY + offsetY) / normHeight
        val lowerBoardCandidate = candidates
            .maxByOrNull { component ->
                val x = (component.centerX + offsetX) / normWidth
                val y = (component.centerY + offsetY) / normHeight
                val lowerBoardBonus = if (
                    x in 0.32f..0.82f &&
                    y in 0.45f..0.82f &&
                    (strongestY < 0.45f || x >= strongestX - 0.05f)
                ) {
                    strongest.count * 0.45f
                } else {
                    0f
                }
                component.count + lowerBoardBonus
            }
        return lowerBoardCandidate ?: strongest
    }

    private fun findColorComponents(
        pixels: IntArray,
        stride: Int,
        scanLeft: Int,
        scanTop: Int,
        scanRight: Int,
        scanBottom: Int,
        matcher: (Int) -> Boolean
    ): List<Component> {
        val visited = BooleanArray(pixels.size)
        val queue = IntArray(pixels.size)
        val result = mutableListOf<Component>()
        for (y in scanTop until scanBottom) {
            for (x in scanLeft until scanRight) {
                val startIndex = y * stride + x
                if (visited[startIndex] || !matcher(pixels[startIndex])) {
                    continue
                }

                var head = 0
                var tail = 0
                queue[tail++] = startIndex
                visited[startIndex] = true
                var count = 0
                var sumX = 0L
                var sumY = 0L
                var minX = x
                var maxX = x
                var minY = y
                var maxY = y

                while (head < tail) {
                    val index = queue[head++]
                    val currentY = index / stride
                    val currentX = index - currentY * stride
                    count += 1
                    sumX += currentX
                    sumY += currentY
                    minX = minOf(minX, currentX)
                    maxX = maxOf(maxX, currentX)
                    minY = minOf(minY, currentY)
                    maxY = maxOf(maxY, currentY)

                    tail = enqueueNeighbor(pixels, visited, queue, tail, currentX - 1, currentY, stride, scanLeft, scanTop, scanRight, scanBottom, matcher)
                    tail = enqueueNeighbor(pixels, visited, queue, tail, currentX + 1, currentY, stride, scanLeft, scanTop, scanRight, scanBottom, matcher)
                    tail = enqueueNeighbor(pixels, visited, queue, tail, currentX, currentY - 1, stride, scanLeft, scanTop, scanRight, scanBottom, matcher)
                    tail = enqueueNeighbor(pixels, visited, queue, tail, currentX, currentY + 1, stride, scanLeft, scanTop, scanRight, scanBottom, matcher)
                }
                result += Component(sumX = sumX, sumY = sumY, count = count, minX = minX, minY = minY, maxX = maxX, maxY = maxY)
            }
        }
        return result
    }

    private fun enqueueNeighbor(
        pixels: IntArray,
        visited: BooleanArray,
        queue: IntArray,
        tail: Int,
        x: Int,
        y: Int,
        stride: Int,
        scanLeft: Int,
        scanTop: Int,
        scanRight: Int,
        scanBottom: Int,
        matcher: (Int) -> Boolean = ::isLootColor
    ): Int {
        if (x < scanLeft || x >= scanRight || y < scanTop || y >= scanBottom) {
            return tail
        }
        val index = y * stride + x
        if (visited[index] || !matcher(pixels[index])) {
            return tail
        }
        visited[index] = true
        queue[tail] = index
        return tail + 1
    }

    private fun countCenteredBrightPixels(
        pixels: IntArray,
        stride: Int,
        minX: Int,
        minY: Int,
        maxX: Int,
        maxY: Int
    ): Int {
        var count = 0
        val width = maxX - minX + 1
        val height = maxY - minY + 1
        val left = minX + (width * 0.25f).toInt()
        val right = maxX - (width * 0.25f).toInt()
        val top = minY + (height * 0.15f).toInt()
        val bottom = maxY - (height * 0.15f).toInt()
        for (y in top..bottom) {
            for (x in left..right) {
                if (isBrightQuestionPixel(pixels[y * stride + x])) {
                    count += 1
                }
            }
        }
        return count
    }

    private fun isLootColor(pixel: Int): Boolean {
        val red = pixel shr 16 and 0xff
        val green = pixel shr 8 and 0xff
        val blue = pixel and 0xff
        val isBlueQuestionOrb = blue >= 150 && green >= 105 && red <= 120 && blue - red >= 75 && blue >= green + 20
        val isGoldQuestionOrb = red >= 195 && green >= 150 && green <= 220 && blue in 35..135 && red - blue >= 75
        return isBlueQuestionOrb || isGoldQuestionOrb
    }

    private fun isBrightQuestionPixel(pixel: Int): Boolean {
        val red = pixel shr 16 and 0xff
        val green = pixel shr 8 and 0xff
        val blue = pixel and 0xff
        return red >= 220 && green >= 220 && blue >= 180
    }

    private fun isQuestionGlyphPixel(pixel: Int): Boolean {
        val red = pixel shr 16 and 0xff
        val green = pixel shr 8 and 0xff
        val blue = pixel and 0xff
        return isBrightQuestionPixel(pixel) ||
            (red >= 120 && green >= 185 && blue >= 200 && blue - red >= 35)
    }

    private data class Component(
        val sumX: Long,
        val sumY: Long,
        val count: Int,
        val minX: Int = 0,
        val minY: Int = 0,
        val maxX: Int = 0,
        val maxY: Int = 0
    ) {
        val width: Int = maxX - minX + 1
        val height: Int = maxY - minY + 1
        val aspect: Float = width.toFloat() / height.coerceAtLeast(1).toFloat()
        val centerX: Float = sumX.toFloat() / count.toFloat()
        val centerY: Float = sumY.toFloat() / count.toFloat()
    }

    private data class BoardBounds(
        val left: Int,
        val top: Int,
        val right: Int,
        val bottom: Int
    ) {
        companion object {
            fun from(width: Int, height: Int): BoardBounds {
                return BoardBounds(
                    left = (width * 0.30f).toInt().coerceIn(0, width - 1),
                    top = (height * 0.16f).toInt().coerceIn(0, height - 1),
                    right = (width * 0.92f).toInt().coerceIn(1, width),
                    bottom = (height * 0.78f).toInt().coerceIn(1, height)
                )
            }
        }
    }

    private const val LOWER_BOARD_ORB_CENTER_Y_OFFSET = 0.035f
}
