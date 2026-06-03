package com.tfthextech.helper.vision

object AndroidEquipmentNameNormalizer {
    private val fallbackEquipmentNames = listOf(
        "反曲之弓",
        "无尽之刃"
    )

    private val fallbackAliases = mapOf(
        "反曲弓" to "反曲之弓",
        "recurvebow" to "反曲之弓",
        "ie" to "无尽之刃",
        "infinityedge" to "无尽之刃"
    )

    @Volatile
    private var catalog: AndroidTftAssetCatalog = AndroidTftAssetCatalog(
        championNames = emptyList(),
        equipmentNames = fallbackEquipmentNames,
        championAliases = emptyMap(),
        equipmentAliases = fallbackAliases
    )

    fun configure(assetCatalog: AndroidTftAssetCatalog) {
        catalog = AndroidTftAssetCatalog(
            championNames = assetCatalog.championNames,
            equipmentNames = (fallbackEquipmentNames + assetCatalog.equipmentNames).distinct(),
            championAliases = assetCatalog.championAliases,
            equipmentAliases = fallbackAliases + assetCatalog.equipmentAliases
        )
    }

    fun normalize(rawName: String): String {
        val compact = rawName.replace(Regex("""\s+"""), "")
        val token = compact.lowercase().replace(Regex("""[^a-z0-9\u4e00-\u9fa5]"""), "")
        catalog.equipmentAliases[compact]?.let { return it }
        catalog.equipmentAliases[token]?.let { return it }
        catalog.equipmentNames.firstOrNull { name -> compact.length >= 2 && name.endsWith(compact) }?.let { return it }
        return compact
    }

    fun isKnownEquipmentName(name: String): Boolean {
        return catalog.equipmentNames.contains(name)
    }
}
