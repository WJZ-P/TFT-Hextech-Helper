package com.tfthextech.helper.vision

import com.tfthextech.helper.protocol.ObservedUnit
import com.tfthextech.helper.protocol.ShopOffer

object AndroidShopTextParser {
    fun parseSlotOffer(slot: Int, text: String): ShopOffer? {
        val match = AndroidChampionNameNormalizer.findKnownMatches(text)
            .maxWithOrNull(compareBy<AndroidChampionNameNormalizer.ChampionTextMatch> { it.start }.thenBy { it.end - it.start })
            ?: return null
        val cost = parseCostNear(text, match) ?: parseBoundedInt(text, 1, 5) ?: return null
        return ShopOffer(
            slot = slot,
            unit = ObservedUnit(id = match.name, name = match.name, cost = cost, location = "shop"),
            cost = cost
        )
    }

    fun parseSlotOffers(slotTexts: List<Pair<Int, String>>): List<ShopOffer> {
        val seenSlots = mutableSetOf<Int>()
        return slotTexts.mapNotNull { (slot, text) ->
            if (seenSlots.contains(slot)) {
                null
            } else {
                parseSlotOffer(slot, text)?.also { seenSlots.add(slot) }
            }
        }.sortedBy { it.slot }
    }

    fun parseFullOffers(text: String): List<ShopOffer> {
        val seen = mutableSetOf<String>()
        val seenSlots = mutableSetOf<Int>()
        return AndroidChampionNameNormalizer.findKnownMatches(text)
            .sortedBy { it.start }
            .mapNotNull { match ->
                if (!seen.add(match.name)) return@mapNotNull null
                val cost = parseCostNear(text, match) ?: return@mapNotNull null
                val slot = inferFullShopSlot(text, match).takeIf { it in 1..5 } ?: return@mapNotNull null
                if (!seenSlots.add(slot)) return@mapNotNull null
                ShopOffer(
                    slot = slot,
                    unit = ObservedUnit(id = match.name, name = match.name, cost = cost, location = "shop"),
                    cost = cost
                )
            }
            .take(5)
    }

    fun parseFullOffers(texts: List<String>): List<ShopOffer> {
        return texts.firstNotNullOfOrNull { text ->
            parseFullOffers(text).takeIf { it.isNotEmpty() }
        } ?: emptyList()
    }

    private fun parseCostNear(text: String, match: AndroidChampionNameNormalizer.ChampionTextMatch): Int? {
        val compact = text.replace(Regex("""\s+"""), "")
        val window = compact.substring(match.end.coerceAtMost(compact.length))
            .take(3)
        return Regex("""(?:^|[^\d])9?([1-5])(?:$|[^\d])""")
            .find(window)
            ?.groupValues
            ?.getOrNull(1)
            ?.toIntOrNull()
    }

    private fun inferFullShopSlot(text: String, match: AndroidChampionNameNormalizer.ChampionTextMatch): Int {
        val compact = text.replace(Regex("""\s+"""), "")
        val before = compact.take(match.start.coerceIn(0, compact.length))
        return countTrustedCostMarkers(before) + 1
    }

    private fun countTrustedCostMarkers(text: String): Int {
        return Regex("""(?:^|[^\d])9?([1-5])(?:$|[^\d])""")
            .findAll(text)
            .count()
    }

    private fun parseBoundedInt(text: String, min: Int, max: Int): Int? {
        return Regex("""\d{1,3}""").findAll(text)
            .mapNotNull { it.value.toIntOrNull() }
            .firstOrNull { it in min..max }
    }
}
