package com.tfthextech.helper.vision

import android.graphics.Bitmap

object AndroidEquipmentIconRecognizer {
    private var matcher: AndroidEquipmentIconMatcher = AndroidEquipmentIconMatcher(emptyMap())

    fun configure(catalog: AndroidTftAssetCatalog) {
        matcher = AndroidEquipmentIconMatcher(catalog.equipmentIconSignatures)
    }

    fun recognizeBitmaps(bitmaps: List<Bitmap>): List<String> {
        return recognizeSignatures(bitmaps.map { bitmap -> AndroidIconSignatureHasher.fromBitmap(bitmap) })
    }

    fun recognizeSignatures(signatures: List<String>): List<String> {
        val seen = linkedSetOf<String>()
        signatures.forEach { signature ->
            matcher.match(signature)?.let { name -> seen.add(name) }
        }
        return seen.toList()
    }
}
