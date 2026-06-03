package com.tfthextech.helper.vision

/**
 * Matches compact hexadecimal perceptual signatures for equipment icons.
 *
 * This is intentionally pure and Android-framework-free so the icon recognition
 * boundary can be regression-tested before wiring it into live screenshot crops.
 */
class AndroidEquipmentIconMatcher(
    private val signatures: Map<String, String>,
    private val maxDistance: Int = 6
) {
    fun match(signature: String): String? {
        val normalized = signature.lowercase()
        return signatures
            .mapNotNull { (name, knownSignature) ->
                val distance = hammingDistance(normalized, knownSignature.lowercase())
                if (distance == Int.MAX_VALUE) null else name to distance
            }
            .minByOrNull { it.second }
            ?.takeIf { it.second <= maxDistance }
            ?.first
    }

    private fun hammingDistance(left: String, right: String): Int {
        if (left.length != right.length) return Int.MAX_VALUE

        var distance = 0
        for (index in left.indices) {
            val leftNibble = left[index].digitToIntOrNull(16) ?: return Int.MAX_VALUE
            val rightNibble = right[index].digitToIntOrNull(16) ?: return Int.MAX_VALUE
            distance += Integer.bitCount(leftNibble xor rightNibble)
        }
        return distance
    }
}
