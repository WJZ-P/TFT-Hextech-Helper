import {ipcRenderer, contextBridge} from 'electron'
import IpcRendererEvent = Electron.IpcRendererEvent;
import {LobbyConfig, Queue, SummonerInfo} from "../src-backend/lcu/utils/LCUProtocols.ts";
import {IpcChannel} from "./protocol.ts";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
    on(...args: Parameters<typeof ipcRenderer.on>) {
        const [channel, listener] = args
        return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
        const [channel, ...omit] = args
        return ipcRenderer.off(channel, ...omit)
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
        const [channel, ...omit] = args
        return ipcRenderer.send(channel, ...omit)
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
        const [channel, ...omit] = args
        return ipcRenderer.invoke(channel, ...omit)
    },

    // You can expose other APTs you need here.
    // ...
})

const ipcApi = {
    on: (channel: string, callback: (...args: any[]) => void) => {
        const listener = (_event: IpcRendererEvent, ...args: any[]) => {
            callback(...args)
        }
        //  监听指定频道
        ipcRenderer.on(channel, listener)
        //  返回一个清理函数
        return () => {
            ipcRenderer.removeListener(channel, listener)
        }
    }
}
export type IpcApi = typeof ipcApi
contextBridge.exposeInMainWorld('ipc', ipcApi)

const configApi = {
    backup: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.CONFIG_BACKUP);
    },
    restore: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.CONFIG_RESTORE);
    },
}
export type ConfigApi = typeof configApi
contextBridge.exposeInMainWorld('config', configApi)

//  hexApi：海克斯科技核心
const hexApi = {
    start: (): Promise<boolean> => {
        return ipcRenderer.invoke(IpcChannel.HEX_START)
    },
    stop: (): Promise<boolean> => {
        return ipcRenderer.invoke(IpcChannel.HEX_STOP)
    }
}
export type HexApi = typeof hexApi
contextBridge.exposeInMainWorld('hex', hexApi)

//  TFTApi: 下棋控制器相关操作
const tftApi = {
    buyAtSlot: (slot: number) => ipcRenderer.invoke(IpcChannel.TFT_BUY_AT_SLOT, slot),
    getShopInfo: () => ipcRenderer.invoke(IpcChannel.TFT_GET_SHOP_INFO),
    getEquipInfo: () => ipcRenderer.invoke(IpcChannel.TFT_GET_EQUIP_INFO),
}
export type TftApi = typeof tftApi
contextBridge.exposeInMainWorld('tft', tftApi)

const lcuApi = {
    getSummonerInfo: (): Promise<{ data?: SummonerInfo; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-summoner/v1/current-summoner');
    },
    createCustomLobby: (config: LobbyConfig): Promise<{ data?: any; error?: string }> => {
        console.log('📬 [Preload] 向主进程发送创建房间请求:', config);
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'POST', '/lol-lobby/v2/lobby', config);
    },
    createLobbyByQueueId: (queueId: Queue): Promise<{ data?: any; error?: string }> => {
        console.log('📬 [Preload] 向主进程发送创建房间请求:', queueId);
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'POST', '/lol-lobby/v2/lobby', {queueId: queueId});
    },
    getCurrentGamemodeInfo: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-lobby/v1/parties/gamemode');
    },
    startMatch: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'POST', '/lol-lobby/v2/lobby/matchmaking/search');
    },
    stopMatch: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'DELETE', '/lol-lobby/v2/lobby/matchmaking/search');
    },
    checkMatchState: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-lobby/v2/lobby/matchmaking/search-state');
    },
    getCustomGames: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-lobby/v1/custom-games');
    },
    getQueues: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-game-queues/v1/queues');
    },
    getChatConfig: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-game-queues/v1/queues');
    },
    getChampSelectSession: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-champ-select/v1/session');
    },
    getChatConversations: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-chat/v1/conversations');
    },
    getGameflowSession: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-gameflow/v1/session');
    },
    getExtraGameClientArgs: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-gameflow/v1/extra-game-client-args');
    },
    getLobby: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-lobby/v2/lobby');
    },
    buySlotOne: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'POST', '/lol-tft-tutorial/v1/helpers/buy-champion-in-slot', {"slot": 0});
    },
    testFunc: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-lobby/v2/notifications');
    },
}
export type LcuApi = typeof lcuApi
contextBridge.exposeInMainWorld('lcu', lcuApi)

// https://127.0.0.1:2999/liveclientdata/allgamedata    开游戏后，这个url会有一些数据推送。
