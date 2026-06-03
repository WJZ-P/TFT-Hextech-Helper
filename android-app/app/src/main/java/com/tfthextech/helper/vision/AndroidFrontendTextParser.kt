package com.tfthextech.helper.vision

object AndroidFrontendTextParser {
    fun parseState(text: String): String? {
        val normalized = text.replace(Regex("""\s+"""), "")
        if (resultWords.any { word -> normalized.contains(word) }) {
            return null
        }
        if (queueWords.any { word -> normalized.contains(word) } || Regex("""\d{1,2}:\d{2}""").containsMatchIn(normalized)) {
            return "queue"
        }
        if (acceptWords.any { word -> normalized.contains(word) }) {
            return "accept-ready"
        }
        if (continueWords.any { word -> normalized.contains(word) }) {
            return "continue-ready"
        }
        val hasStart = normalized.contains("开始")
        return if (hasStart) "start-ready" else null
    }
}

private val resultWords = setOf(
    "第七名",
    "第八名",
    "再来一局",
    "继续观看"
)

private val queueWords = setOf(
    "匹配中",
    "队列中",
    "取消"
)

private val acceptWords = setOf(
    "对局已找到",
    "接受"
)

private val continueWords = setOf(
    "轻触以继续",
    "点击继续",
    "触以继续"
)
