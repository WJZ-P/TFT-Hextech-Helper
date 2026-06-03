package com.tfthextech.helper.vision

import android.graphics.Bitmap
import java.util.ArrayDeque

object AndroidNumericHudVisualParser {
    internal fun classifyDigitForTest(width: Int, height: Int, densities: FloatArray): Int? {
        if (width <= 0 || height <= 0 || densities.size != SEGMENT_COUNT) {
            return null
        }
        return classifyDigit(width, height, densities.map { it >= SEGMENT_THRESHOLD }.toBooleanArray(), densities)
    }

    internal fun chooseStageForTest(ocrText: String, visualStage: String?): String? {
        return chooseStage(ocrText, visualStage)
    }

    internal fun normalizeGoldForTest(value: Int?): Int? {
        return normalizeGold(value)
    }

    internal fun normalizeGoldForStageForTest(value: Int?, stageText: String?): Int? {
        return normalizeGoldForStage(value, stageText)
    }

    internal fun chooseGoldForStageForTest(ocrGold: Int?, visualGold: Int?, stageText: String?): Int? {
        return chooseGoldForStage(ocrGold, visualGold, stageText)
    }

    internal fun normalizeGoldForStage(value: Int?, stageText: String?): Int? {
        val normalized = normalizeGold(value) ?: return null
        val major = Regex("""^([1-9])-[1-9]$""").find(stageText.orEmpty())
            ?.groupValues
            ?.getOrNull(1)
            ?.toIntOrNull()
        val maxForStage = when (major) {
            1 -> 20
            2 -> 80
            3 -> 120
            else -> 200
        }
        return normalized.takeIf { it <= maxForStage }
    }

    internal fun chooseGoldForStage(ocrGold: Int?, visualGold: Int?, stageText: String?): Int? {
        val normalizedOcr = normalizeGoldForStage(ocrGold, stageText)
        val normalizedVisual = normalizeGoldForStage(visualGold, stageText)
        if (normalizedOcr == null) {
            return normalizedVisual
        }
        if (normalizedVisual == null) {
            return normalizedOcr
        }
        if (isLikelyTruncatedGoldOcr(normalizedOcr, normalizedVisual)) {
            return normalizedVisual
        }
        return normalizedOcr
    }

    internal fun goldSourceForStage(ocrGold: Int?, visualGold: Int?, selectedGold: Int, stageText: String?): String {
        val normalizedOcr = normalizeGoldForStage(ocrGold, stageText)
        val normalizedVisual = normalizeGoldForStage(visualGold, stageText)
        return when {
            normalizedVisual == selectedGold && normalizedOcr != selectedGold -> "visual-hud"
            normalizedOcr == selectedGold -> "ocr"
            normalizedVisual == selectedGold -> "visual-hud"
            else -> ""
        }
    }

    private fun isLikelyTruncatedGoldOcr(ocrGold: Int, visualGold: Int): Boolean {
        if (visualGold < 100 || ocrGold >= 100) {
            return false
        }
        if (ocrGold < 10) {
            return visualGold % 10 == ocrGold
        }
        return visualGold % 100 == ocrGold
    }

    fun chooseStage(ocrText: String, visualStage: String?): String? {
        return visualStage?.takeIf { isValidStageText(it) } ?: parseStageText(ocrText)
    }

    fun parseStage(frame: Bitmap): String? {
        val components = componentsFor(frame, 0.28f, 0.00f, 0.16f, 0.08f)
            .filter { it.centerY <= it.canvasHeight * 0.50f }
            .sortedBy { it.left }
        val digitHeight = components.maxOfOrNull { it.height } ?: return null
        val tokens = components.mapNotNull { component ->
            if (component.height < digitHeight * 0.45f && component.width >= digitHeight * 0.18f) {
                "-"
            } else {
                classifyDigit(component)?.toString()
            }
        }
        val joined = tokens.joinToString("")
        val match = Regex("""([1-9])-([1-9])""").find(joined) ?: return null
        if (!isValidStage(match.groupValues[1].toInt(), match.groupValues[2].toInt())) {
            return null
        }
        return "${match.groupValues[1]}-${match.groupValues[2]}"
    }

    fun parseGold(frame: Bitmap): Int? {
        val digits = componentsFor(frame, 0.865f, 0.885f, 0.125f, 0.095f)
            .filter { it.height >= 90 && it.centerY <= it.canvasHeight * 0.62f }
            .sortedBy { it.left }
            .mapNotNull { classifyDigit(it) }
        return normalizeGold(digits.joinToString("").takeIf { it.isNotBlank() }?.toIntOrNull())
    }

    fun parseGold(frame: Bitmap, stageText: String?): Int? {
        return normalizeGoldForStage(parseGold(frame), stageText)
    }

    fun parseLevel(frame: Bitmap): Int? {
        val digits = componentsFor(frame, 0.07f, 0.82f, 0.08f, 0.17f)
            .filter { it.height >= 70 && it.centerY >= it.canvasHeight * 0.42f }
            .sortedBy { it.left }
            .mapNotNull { classifyDigit(it) }
        return digits.lastOrNull()
    }

    private fun componentsFor(frame: Bitmap, x: Float, y: Float, width: Float, height: Float): List<Component> {
        if (frame.width <= 0 || frame.height <= 0) {
            return emptyList()
        }
        val left = (frame.width * x).toInt().coerceIn(0, frame.width - 1)
        val top = (frame.height * y).toInt().coerceIn(0, frame.height - 1)
        val cropWidth = (frame.width * width).toInt().coerceIn(1, frame.width - left)
        val cropHeight = (frame.height * height).toInt().coerceIn(1, frame.height - top)
        val raw = Bitmap.createBitmap(frame, left, top, cropWidth, cropHeight)
        val scale = 5
        val scaled = Bitmap.createScaledBitmap(raw, raw.width * scale, raw.height * scale, false)
        raw.recycle()
        val pixels = IntArray(scaled.width * scaled.height)
        scaled.getPixels(pixels, 0, scaled.width, 0, 0, scaled.width, scaled.height)
        val foreground = BooleanArray(pixels.size)
        for (index in pixels.indices) {
            val pixel = pixels[index]
            val red = pixel shr 16 and 0xff
            val green = pixel shr 8 and 0xff
            val blue = pixel and 0xff
            foreground[index] = red >= 175 && green >= 175 && blue >= 150
        }
        val components = findComponents(foreground, scaled.width, scaled.height)
        scaled.recycle()
        return components
    }

    private fun findComponents(foreground: BooleanArray, width: Int, height: Int): List<Component> {
        val visited = BooleanArray(foreground.size)
        val result = mutableListOf<Component>()
        val queue = ArrayDeque<Int>()
        for (index in foreground.indices) {
            if (!foreground[index] || visited[index]) {
                continue
            }
            visited[index] = true
            queue.add(index)
            var left = width
            var right = 0
            var top = height
            var bottom = 0
            var area = 0
            val points = mutableListOf<Pair<Int, Int>>()
            while (queue.isNotEmpty()) {
                val current = queue.removeFirst()
                val x = current % width
                val y = current / width
                area += 1
                left = minOf(left, x)
                right = maxOf(right, x)
                top = minOf(top, y)
                bottom = maxOf(bottom, y)
                points += x to y
                addNeighbor(current - 1, x > 0, foreground, visited, queue)
                addNeighbor(current + 1, x < width - 1, foreground, visited, queue)
                addNeighbor(current - width, y > 0, foreground, visited, queue)
                addNeighbor(current + width, y < height - 1, foreground, visited, queue)
            }
            val component = Component(left, top, right, bottom, area, width, height, points)
            if (component.area >= 80 && component.width >= 6 && component.height >= 12) {
                result += component
            }
        }
        return result
    }

    private fun addNeighbor(
        index: Int,
        enabled: Boolean,
        foreground: BooleanArray,
        visited: BooleanArray,
        queue: ArrayDeque<Int>
    ) {
        if (enabled && foreground[index] && !visited[index]) {
            visited[index] = true
            queue.add(index)
        }
    }

    private fun classifyDigit(component: Component): Int? {
        if (component.width.toFloat() / component.height.toFloat() <= 0.50f) {
            return 1
        }
        val densities = floatArrayOf(
            component.regionDensity(0.20f, 0.00f, 0.80f, 0.18f),
            component.regionDensity(0.00f, 0.18f, 0.38f, 0.48f),
            component.regionDensity(0.62f, 0.18f, 1.00f, 0.48f),
            component.regionDensity(0.20f, 0.40f, 0.80f, 0.62f),
            component.regionDensity(0.00f, 0.52f, 0.38f, 0.82f),
            component.regionDensity(0.62f, 0.52f, 1.00f, 0.82f),
            component.regionDensity(0.20f, 0.82f, 0.80f, 1.00f)
        )
        return classifyDigit(component.width, component.height, densities.map { it >= SEGMENT_THRESHOLD }.toBooleanArray(), densities)
    }

    private fun classifyDigit(width: Int, height: Int, observed: BooleanArray, densities: FloatArray): Int? {
        val ratio = width.toFloat() / height.toFloat()
        // Mobile TFT's topbar font draws 7 as a slanted stroke. The diagonal often
        // leaks into the middle/bottom bands, so segment-distance alone prefers 2/5.
        if (ratio in 0.52f..0.70f &&
            densities[0] >= 0.70f &&
            densities[1] <= 0.25f &&
            densities[2] >= 0.35f &&
            densities[4] <= 0.25f &&
            densities[5] <= 0.20f
        ) {
            return 7
        }
        if (ratio in 0.50f..0.70f &&
            densities[0] >= 0.60f &&
            densities[1] in 0.25f..0.40f &&
            densities[2] >= 0.45f &&
            densities[3] >= 0.75f &&
            densities[4] >= 0.60f &&
            densities[5] <= 0.25f &&
            densities[6] >= 0.50f
        ) {
            return 7
        }
        if (ratio in 0.60f..0.78f &&
            densities[0] in 0.35f..0.60f &&
            densities[1] <= 0.30f &&
            densities[2] >= 0.45f &&
            densities[3] >= 0.50f &&
            densities[4] >= 0.45f &&
            densities[5] >= 0.45f &&
            densities[6] <= 0.45f
        ) {
            return 4
        }
        if (ratio in 1.00f..1.45f &&
            densities[0] in 0.45f..0.75f &&
            densities[1] >= 0.55f &&
            densities[2] >= 0.55f &&
            densities[3] >= 0.60f &&
            densities[4] <= 0.25f &&
            densities[5] >= 0.45f &&
            densities[6] in 0.25f..0.55f
        ) {
            return 4
        }
        if (ratio in 1.05f..1.45f &&
            densities[0] >= 0.65f &&
            densities[1] >= 0.55f &&
            densities[2] >= 0.55f &&
            densities[3] <= 0.34f &&
            densities[4] >= 0.55f &&
            densities[5] >= 0.55f &&
            densities[6] >= 0.65f
        ) {
            return 8
        }
        if (ratio in 1.05f..1.40f &&
            densities[0] in 0.40f..0.65f &&
            densities[1] >= 0.60f &&
            densities[2] >= 0.60f &&
            densities[3] in 0.30f..0.50f &&
            densities[4] >= 0.65f &&
            densities[5] >= 0.65f &&
            densities[6] >= 0.75f
        ) {
            return 6
        }
        if (ratio in 1.05f..1.40f &&
            densities[0] <= 0.35f &&
            densities[1] >= 0.65f &&
            densities[2] >= 0.65f &&
            densities[3] in 0.30f..0.45f &&
            densities[4] >= 0.65f &&
            densities[5] >= 0.65f &&
            densities[6] >= 0.75f
        ) {
            return 0
        }
        if (ratio in 0.55f..0.75f &&
            densities[0] >= 0.65f &&
            densities[1] >= 0.55f &&
            densities[2] in 0.25f..0.50f &&
            densities[3] >= 0.45f &&
            densities[4] >= 0.55f &&
            densities[5] >= 0.50f &&
            densities[6] >= 0.55f
        ) {
            return 6
        }
        if (ratio in 1.00f..1.35f &&
            densities[0] >= 0.60f &&
            densities[1] <= 0.25f &&
            densities[2] >= 0.60f &&
            densities[3] <= 0.34f &&
            densities[4] >= 0.65f &&
            densities[5] >= 0.65f &&
            densities[6] >= 0.70f
        ) {
            return 3
        }
        if (ratio in 1.00f..1.35f &&
            densities[0] in 0.45f..0.70f &&
            densities[1] in 0.20f..0.45f &&
            densities[2] <= 0.25f &&
            densities[3] >= 0.35f &&
            densities[4] >= 0.65f &&
            densities[5] in 0.25f..0.55f &&
            densities[6] >= 0.75f
        ) {
            return 2
        }
        if (ratio in 1.00f..1.35f &&
            densities[0] <= 0.35f &&
            densities[1] <= 0.35f &&
            densities[2] >= 0.55f &&
            densities[3] <= 0.40f &&
            densities[4] >= 0.65f &&
            densities[5] >= 0.65f &&
            densities[6] >= 0.75f
        ) {
            return 5
        }
        if (ratio in 1.00f..1.35f &&
            densities[0] >= 0.80f &&
            densities[1] in 0.20f..0.45f &&
            densities[2] >= 0.65f &&
            densities[3] <= 0.45f &&
            densities[4] >= 0.65f &&
            densities[5] >= 0.60f &&
            densities[6] >= 0.70f
        ) {
            return 9
        }
        return DIGIT_SEGMENTS.minByOrNull { (_, expected) -> segmentDistance(observed, expected) }
            ?.takeIf { (_, expected) -> segmentDistance(observed, expected) <= 2 }
            ?.first
    }

    private fun parseStageText(text: String): String? {
        val normalized = text
            .replace('—', '-')
            .replace('–', '-')
            .replace('_', '-')
        val match = Regex("""([1-9])\s*-\s*([1-9])""").find(normalized) ?: return null
        if (!isValidStage(match.groupValues[1].toInt(), match.groupValues[2].toInt())) {
            return null
        }
        return "${match.groupValues[1]}-${match.groupValues[2]}"
    }

    private fun isValidStageText(stage: String): Boolean {
        val match = Regex("""^([1-9])-([1-9])$""").find(stage) ?: return false
        return isValidStage(match.groupValues[1].toInt(), match.groupValues[2].toInt())
    }

    private fun isValidStage(stage: Int, round: Int): Boolean {
        return stage in 1..7 && round in 1..7
    }

    private fun normalizeGold(value: Int?): Int? {
        return value?.takeIf { it in 0..200 }
    }


    private fun segmentDistance(observed: BooleanArray, expected: BooleanArray): Int {
        var distance = 0
        for (index in observed.indices) {
            if (observed[index] != expected[index]) {
                distance += 1
            }
        }
        return distance
    }

    private data class Component(
        val left: Int,
        val top: Int,
        val right: Int,
        val bottom: Int,
        val area: Int,
        val canvasWidth: Int,
        val canvasHeight: Int,
        val points: List<Pair<Int, Int>>
    ) {
        val width: Int = right - left + 1
        val height: Int = bottom - top + 1
        val centerX: Float = (left + right) / 2f
        val centerY: Float = (top + bottom) / 2f

        fun regionDensity(x0: Float, y0: Float, x1: Float, y1: Float): Float {
            val minX = left + (width * x0).toInt()
            val maxX = left + (width * x1).toInt()
            val minY = top + (height * y0).toInt()
            val maxY = top + (height * y1).toInt()
            val regionArea = ((maxX - minX).coerceAtLeast(1)) * ((maxY - minY).coerceAtLeast(1))
            val count = points.count { (x, y) -> x in minX..maxX && y in minY..maxY }
            return count.toFloat() / regionArea.toFloat()
        }
    }

    private const val SEGMENT_COUNT = 7
    private const val SEGMENT_THRESHOLD = 0.35f

    private val DIGIT_SEGMENTS = listOf(
        0 to booleanArrayOf(true, true, true, false, true, true, true),
        1 to booleanArrayOf(false, false, true, false, false, true, false),
        2 to booleanArrayOf(true, false, true, true, true, false, true),
        3 to booleanArrayOf(true, false, true, true, false, true, true),
        4 to booleanArrayOf(false, true, true, true, false, true, false),
        5 to booleanArrayOf(true, true, false, true, false, true, true),
        6 to booleanArrayOf(true, true, false, true, true, true, true),
        7 to booleanArrayOf(true, false, true, false, false, true, false),
        8 to booleanArrayOf(true, true, true, true, true, true, true),
        9 to booleanArrayOf(true, true, true, true, false, true, true)
    )
}
