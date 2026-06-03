package com.tfthextech.helper.vision

import com.tfthextech.helper.protocol.AugmentOffer

object AndroidAugmentTextParser {
    fun parse(text: String): List<AugmentOffer> {
        val normalized = text.replace(Regex("""\s+"""), "")
        val hasEquipmentChoiceWords = equipmentChoiceWords.any { word -> normalized.contains(word) }
        val hasGenericChoiceCards = genericChoiceWords.any { word -> normalized.contains(word) } && !hasEquipmentChoiceWords
        val hasAugmentWords = augmentWords.any { word -> normalized.contains(word) } || hasGenericChoiceCards
        if (!hasAugmentWords) {
            return emptyList()
        }

        // MVP: OCR only needs to confirm the augment screen exists. The action layer
        // deliberately picks the center slot until we add per-augment scoring.
        return listOf(AugmentOffer(slot = 2, name = "默认海克斯"))
    }
}

private val augmentWords = setOf(
    "强化符文",
    "海克斯",
    "符文"
)

private val genericChoiceWords = setOf(
    "选择一件"
)

private val equipmentChoiceWords = setOf(
    "选择一件装备",
    "装备"
)
