package com.tfthextech.helper.input

import com.tfthextech.helper.protocol.PointF01

data class GesturePixelTarget(
    val x: Float,
    val y: Float,
    val screenWidth: Int,
    val screenHeight: Int
) {
    fun summary(): String {
        return "x=${x.toInt()} y=${y.toInt()} screen=${screenWidth}x${screenHeight}"
    }
}

object AndroidGestureMath {
    fun toPixelTarget(point: PointF01, screenWidth: Int, screenHeight: Int): GesturePixelTarget {
        val x = point.x.coerceIn(0f, 1f) * screenWidth
        val y = point.y.coerceIn(0f, 1f) * screenHeight
        return GesturePixelTarget(x, y, screenWidth, screenHeight)
    }
}
