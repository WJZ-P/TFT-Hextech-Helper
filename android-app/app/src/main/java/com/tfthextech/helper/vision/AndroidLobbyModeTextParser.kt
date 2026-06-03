package com.tfthextech.helper.vision

object AndroidLobbyModeTextParser {
    fun parse(vararg texts: String): String? {
        val compact = texts.joinToString(" ").replace(Regex("""\s+"""), "")
        if (compact.isBlank()) return null
        if (containsRankedMode(compact)) return "ranked"
        if (containsNormalMode(compact)) {
            return "normal"
        }
        return null
    }

    fun parseHomeCarousel(selectedNormalVisible: Boolean, vararg texts: String): String? {
        if (selectedNormalVisible) {
            return "normal"
        }
        return parse(*texts)
    }

    fun containsNormalMode(vararg texts: String): Boolean {
        val compact = texts.joinToString(" ").replace(Regex("""\s+"""), "")
        return compact.contains("匹配模式") ||
            compact.contains("普通模式") ||
            compact.contains("普通匹配")
    }

    fun containsRankedMode(vararg texts: String): Boolean {
        val compact = texts.joinToString(" ").replace(Regex("""\s+"""), "")
        return compact.contains("排位")
    }
}
