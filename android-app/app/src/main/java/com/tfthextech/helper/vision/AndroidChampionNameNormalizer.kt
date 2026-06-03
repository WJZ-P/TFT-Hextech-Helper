package com.tfthextech.helper.vision

/**
 * Lightweight on-device correction for OCR-truncated champion names.
 *
 * The desktop app has a richer season-pack correction pipeline. The standalone
 * APK cannot depend on that yet, so this layer only handles conservative,
 * high-confidence suffix matches observed in live Android shop OCR.
 */
object AndroidChampionNameNormalizer {
    data class ChampionTextMatch(
        val token: String,
        val name: String,
        val start: Int,
        val end: Int
    )

    private val fallbackChampionNames = listOf(
        "蕾欧娜",
        "内瑟斯",
        "莫德凯撒",
        "崔斯特",
        "波比",
        "佐伊",
        "伊泽瑞尔",
        "凯特琳",
        "提莫",
        "泰隆",
        "米利欧",
        "丽桑卓",
        "亚托克斯",
        "古拉加斯",
        "格温",
        "贝蕾亚",
        "俄洛伊",
        "维迦",
        "维克托",
        "卡莎",
        "纳尔",
        "茂凯",
        "阿卡丽",
        "莎弥拉",
        "阿萝拉",
        "厄加特",
        "派克",
        "雷克塞",
        "卑尔维斯",
        "潘森",
        "拉亚斯特",
        "厄运小姐"
    )

    private val fallbackAliases = mapOf(
        "欧娜" to "蕾欧娜",
        "科料加斯" to "科加斯",
        "料加斯" to "科加斯",
        "伊译瑞尔" to "伊泽瑞尔",
        "伊澤瑞尔" to "伊泽瑞尔",
        "伊逢瑞尔" to "伊泽瑞尔",
        "伊泽" to "伊泽瑞尔",
        "凯特珠" to "凯特琳",
        "秦隆" to "泰隆",
        "黍隆" to "泰隆",
        "菲茲" to "菲兹",
        "維克托" to "维克托",
        "納尔" to "纳尔",
        "卑尔維斯" to "卑尔维斯",
        "卑尔维斯" to "卑尔维斯",
        "阿羅拉" to "阿萝拉",
        "拉亞斯特" to "拉亚斯特",
        "米利歐" to "米利欧",
        "来利欧" to "米利欧",
        "來利歐" to "米利欧",
        "米利政" to "米利欧",
        "米利莉欧" to "米利欧",
        "莎弥拉" to "莎弥拉",
        "阿卡丽" to "阿卡丽"
    )

    @Volatile
    private var catalog: AndroidTftAssetCatalog = AndroidTftAssetCatalog(
        championNames = fallbackChampionNames,
        championAliases = fallbackAliases
    )

    fun configure(assetCatalog: AndroidTftAssetCatalog) {
        catalog = AndroidTftAssetCatalog(
            championNames = (fallbackChampionNames + assetCatalog.championNames).distinct(),
            equipmentNames = assetCatalog.equipmentNames,
            championAliases = fallbackAliases + assetCatalog.championAliases
        )
    }

    fun normalize(rawName: String): String {
        val compact = rawName.replace(Regex("""\s+"""), "")
        catalog.championAliases[compact]?.let { return it }
        catalog.championNames.firstOrNull { name -> compact.length >= 2 && name.endsWith(compact) }?.let { return it }
        return compact
    }

    fun isKnown(name: String): Boolean {
        val compact = name.replace(Regex("""\s+"""), "")
        return catalog.championNames.contains(compact) || catalog.championAliases.containsKey(compact)
    }

    fun findKnownMatches(rawText: String): List<ChampionTextMatch> {
        val compact = rawText.replace(Regex("""\s+"""), "")
        if (compact.isBlank()) return emptyList()

        val tokens = buildList {
            catalog.championNames.forEach { name ->
                add(name to name)
                val withoutMiddleDot = name.replace("·", "")
                if (withoutMiddleDot != name) {
                    add(withoutMiddleDot to name)
                }
            }
            catalog.championAliases.forEach { (alias, name) ->
                add(alias to name)
                val withoutMiddleDot = alias.replace("·", "")
                if (withoutMiddleDot != alias) {
                    add(withoutMiddleDot to name)
                }
            }
        }.filter { (token) -> token.length >= 2 }

        val matches = mutableListOf<ChampionTextMatch>()
        tokens.forEach { (token, name) ->
            var start = compact.indexOf(token)
            while (start >= 0) {
                matches.add(ChampionTextMatch(token, name, start, start + token.length))
                start = compact.indexOf(token, start + 1)
            }
        }

        return matches
            .sortedWith(compareBy<ChampionTextMatch> { it.start }.thenByDescending { it.end - it.start })
            .fold(emptyList()) { accepted, match ->
                if (accepted.any { existing ->
                        match.start >= existing.start && match.end <= existing.end && match.name == existing.name
                    }
                ) {
                    accepted
                } else {
                    accepted + match
                }
            }
    }
}
