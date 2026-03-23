declare global {
    interface Window {
        appEnv?: {
            blocksRemoteAssets?: boolean | undefined;
            isGuiVerify?: boolean | undefined;
        };
    }
}

export {};
