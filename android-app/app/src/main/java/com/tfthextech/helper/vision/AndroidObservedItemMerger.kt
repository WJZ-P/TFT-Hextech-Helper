package com.tfthextech.helper.vision

object AndroidObservedItemMerger {
    fun merge(itemText: String, iconSignatures: List<String>): List<String> {
        return mergeDetailed(itemText, iconSignatures).items
    }

    fun mergeDetailed(itemText: String, iconSignatures: List<String>): AndroidObservedItemResult {
        val textItems = AndroidItemTextParser.parse(itemText)
        val iconItems = AndroidEquipmentIconRecognizer.recognizeSignatures(iconSignatures)
        val seen = linkedSetOf<String>()
        textItems.forEach { item -> seen.add(item) }
        iconItems.forEach { item -> seen.add(item) }
        return AndroidObservedItemResult(
            textItems = textItems,
            iconItems = iconItems,
            items = seen.toList()
        )
    }
}

data class AndroidObservedItemResult(
    val textItems: List<String>,
    val iconItems: List<String>,
    val items: List<String>
)
