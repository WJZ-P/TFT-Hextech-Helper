package com.tfthextech.helper.vision

object AndroidDialogTextParser {
    fun parseState(text: String): String? {
        val normalized = text.replace(Regex("""\s+"""), "")
        if (dialogWords.any { word -> normalized.contains(word) }) {
            return "confirm"
        }
        return null
    }
}

private val dialogWords = setOf(
    "服务器错误",
    "错误代码",
    "无法完成操作",
    "无法更新应用",
    "已拒绝",
    "回到了房间",
    "准备确认",
    "确定",
    "确认"
)
