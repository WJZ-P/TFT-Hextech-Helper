package com.tfthextech.helper.vision

import java.io.InputStream

data class AndroidTftAssetCatalog(
    val championNames: List<String>,
    val equipmentNames: List<String> = emptyList(),
    val championAliases: Map<String, String>,
    val equipmentAliases: Map<String, String> = emptyMap(),
    val equipmentIconSignatures: Map<String, String> = emptyMap()
) {
    companion object {
        fun fromJson(json: String): AndroidTftAssetCatalog {
            return AndroidTftAssetCatalog(
                championNames = parseStringArray(json, "champions"),
                equipmentNames = parseStringArray(json, "equipment"),
                championAliases = parseStringMap(json, "championAliases").ifEmpty { parseStringMap(json, "aliases") },
                equipmentAliases = parseStringMap(json, "equipmentAliases"),
                equipmentIconSignatures = parseStringMap(json, "equipmentIconSignatures")
            )
        }

        fun fromStream(stream: InputStream): AndroidTftAssetCatalog {
            return stream.bufferedReader(Charsets.UTF_8).use { reader -> fromJson(reader.readText()) }
        }

        private fun parseStringArray(json: String, key: String): List<String> {
            val body = Regex(""""$key"\s*:\s*\[(.*?)]""", RegexOption.DOT_MATCHES_ALL)
                .find(json)
                ?.groupValues
                ?.get(1)
                ?: return emptyList()
            return Regex(""""([^"]+)"""").findAll(body).map { it.groupValues[1] }.toList()
        }

        private fun parseStringMap(json: String, key: String): Map<String, String> {
            val body = Regex(""""$key"\s*:\s*\{(.*?)}""", RegexOption.DOT_MATCHES_ALL)
                .find(json)
                ?.groupValues
                ?.get(1)
                ?: return emptyMap()
            return Regex(""""([^"]+)"\s*:\s*"([^"]+)"""")
                .findAll(body)
                .associate { it.groupValues[1] to it.groupValues[2] }
        }
    }
}
