export interface AndroidObservePolicyOptions {
    safeObserve?: boolean;
}

export function shouldReadShopDuringAndroidObserve(options: AndroidObservePolicyOptions): boolean {
    return options.safeObserve !== true;
}
