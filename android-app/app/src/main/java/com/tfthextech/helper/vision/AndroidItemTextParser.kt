package com.tfthextech.helper.vision

object AndroidItemTextParser {
    private val tokenRegex = Regex("""[A-Za-z][A-Za-z .'-]{1,28}|[\u4e00-\u9fa5]{2,10}""")
    private val ignoredTokens = setOf(
        "选择一件",
        "选择一件装备",
        "备战环节",
        "你获得了",
        "装备",
        "刷新"
    )

    fun parse(text: String): List<String> {
        val seen = linkedSetOf<String>()
        tokenRegex.findAll(text).forEach { match ->
            val rawToken = match.value.trim()
            if (ignoredTokens.any { ignored -> rawToken.contains(ignored) || ignored.contains(rawToken) }) {
                return@forEach
            }
            val normalized = AndroidEquipmentNameNormalizer.normalize(rawToken)
            if (AndroidEquipmentNameNormalizer.isKnownEquipmentName(normalized)) {
                seen.add(normalized)
            }
        }
        return seen.toList()
    }
}
