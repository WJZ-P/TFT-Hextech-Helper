export interface AndroidObservePolicyOptions {
    safeObserve?: boolean;
}

export function shouldReadShopDuringAndroidObserve(_options: AndroidObservePolicyOptions): boolean {
    // Shop OCR is screenshot-only and is required for Android BUY decisions.
    // safeObserve still skips bench, board, and equipment reads in AndroidEmulatorAdapter.
    return true;
}

export function shouldUseShopTemplateFallbackDuringAndroidObserve(options: AndroidObservePolicyOptions): boolean {
    // The template fallback is CPU-heavy and currently cannot improve Android safe-observe shop reads
    // when champion name strips and templates have incompatible channel formats. Keep it for full observe.
    return options.safeObserve !== true;
}
