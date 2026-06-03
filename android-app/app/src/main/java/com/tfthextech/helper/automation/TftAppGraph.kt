package com.tfthextech.helper.automation

import android.content.Context
import com.tfthextech.helper.capture.ScreenCaptureRepository
import com.tfthextech.helper.vision.AndroidChampionNameNormalizer
import com.tfthextech.helper.vision.AndroidEquipmentIconRecognizer
import com.tfthextech.helper.vision.AndroidEquipmentNameNormalizer
import com.tfthextech.helper.vision.AndroidTftAssetCatalog
import com.tfthextech.helper.vision.MlKitHudFrameObserver

object TftAppGraph {
    val captureRepository: ScreenCaptureRepository = ScreenCaptureRepository()
    val automationCoordinator: AndroidAutomationCoordinator = AndroidAutomationCoordinator(
        captureRepository,
        observer = MlKitHudFrameObserver()
    )
    private var initialized: Boolean = false

    fun initialize(context: Context) {
        if (initialized) return
        automationCoordinator.setAppRecovery(ContextAndroidTftAppRecovery(context.applicationContext))
        runCatching {
            context.assets.open("tft-season-pack/catalog.json").use { stream ->
                val catalog = AndroidTftAssetCatalog.fromStream(stream)
                AndroidChampionNameNormalizer.configure(catalog)
                AndroidEquipmentNameNormalizer.configure(catalog)
                AndroidEquipmentIconRecognizer.configure(catalog)
            }
        }
        initialized = true
    }
}
