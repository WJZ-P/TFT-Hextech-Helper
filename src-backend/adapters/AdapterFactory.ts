import type { GameAdapter } from "../core/types";
import { GameClient } from "../utils/SettingsStore";
import { AndroidEmulatorAdapter } from "./AndroidEmulatorAdapter";
import { pcLogicAdapter } from "./PcLogicAdapter";

const androidAdapter = new AndroidEmulatorAdapter();

export function getAdapterByClient(client: GameClient): GameAdapter {
    if (client === GameClient.ANDROID) {
        return androidAdapter;
    }
    return pcLogicAdapter;
}

export { androidAdapter, pcLogicAdapter };
