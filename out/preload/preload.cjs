"use strict";
const electron = require("electron");
var IpcChannel = /* @__PURE__ */ ((IpcChannel2) => {
  IpcChannel2["CONFIG_BACKUP"] = "config-backup";
  IpcChannel2["CONFIG_RESTORE"] = "config-restore";
  IpcChannel2["LCU_REQUEST"] = "lcu-request";
  IpcChannel2["HEX_START"] = "hex-start";
  IpcChannel2["HEX_STOP"] = "hex-stop";
  IpcChannel2["TFT_BUY_AT_SLOT"] = "tft-buy-at-slot";
  IpcChannel2["TFT_GET_SHOP_INFO"] = "tft-get-shop-info";
  IpcChannel2["TFT_GET_EQUIP_INFO"] = "tft-get-equip-info";
  IpcChannel2["TFT_GET_BENCH_INFO"] = "tft-get-bench-info";
  IpcChannel2["TFT_GET_FIGHT_BOARD_INFO"] = "tft-get-fight-board-info";
  IpcChannel2["TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT"] = "tft-test-save-bench-slot-snapshot";
  IpcChannel2["TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT"] = "tft-test-save-fight-board-slot-snapshot";
  IpcChannel2["LINEUP_GET_ALL"] = "lineup-get-all";
  IpcChannel2["LINEUP_GET_BY_ID"] = "lineup-get-by-id";
  return IpcChannel2;
})(IpcChannel || {});
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
  // You can expose other APTs you need here.
  // ...
});
const ipcApi = {
  on: (channel, callback) => {
    const listener = (_event, ...args) => {
      callback(...args);
    };
    electron.ipcRenderer.on(channel, listener);
    return () => {
      electron.ipcRenderer.removeListener(channel, listener);
    };
  }
};
electron.contextBridge.exposeInMainWorld("ipc", ipcApi);
const configApi = {
  backup: () => {
    return electron.ipcRenderer.invoke(IpcChannel.CONFIG_BACKUP);
  },
  restore: () => {
    return electron.ipcRenderer.invoke(IpcChannel.CONFIG_RESTORE);
  }
};
electron.contextBridge.exposeInMainWorld("config", configApi);
const hexApi = {
  start: () => {
    return electron.ipcRenderer.invoke(IpcChannel.HEX_START);
  },
  stop: () => {
    return electron.ipcRenderer.invoke(IpcChannel.HEX_STOP);
  }
};
electron.contextBridge.exposeInMainWorld("hex", hexApi);
const tftApi = {
  buyAtSlot: (slot) => electron.ipcRenderer.invoke(IpcChannel.TFT_BUY_AT_SLOT, slot),
  getShopInfo: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_SHOP_INFO),
  getEquipInfo: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_EQUIP_INFO),
  getBenchInfo: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_BENCH_INFO),
  getFightBoardInfo: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_FIGHT_BOARD_INFO),
  saveBenchSlotSnapshots: () => electron.ipcRenderer.invoke(IpcChannel.TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT),
  saveFightBoardSlotSnapshots: () => electron.ipcRenderer.invoke(IpcChannel.TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT)
};
electron.contextBridge.exposeInMainWorld("tft", tftApi);
const lineupApi = {
  /** 获取所有已加载的阵容配置 */
  getAll: () => electron.ipcRenderer.invoke(IpcChannel.LINEUP_GET_ALL),
  /** 根据 ID 获取单个阵容配置 */
  getById: (id) => electron.ipcRenderer.invoke(IpcChannel.LINEUP_GET_BY_ID, id)
};
electron.contextBridge.exposeInMainWorld("lineup", lineupApi);
const lcuApi = {
  getSummonerInfo: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-summoner/v1/current-summoner");
  },
  createCustomLobby: (config) => {
    console.log("📬 [Preload] 向主进程发送创建房间请求:", config);
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "POST", "/lol-lobby/v2/lobby", config);
  },
  createLobbyByQueueId: (queueId) => {
    console.log("📬 [Preload] 向主进程发送创建房间请求:", queueId);
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "POST", "/lol-lobby/v2/lobby", { queueId });
  },
  getCurrentGamemodeInfo: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-lobby/v1/parties/gamemode");
  },
  startMatch: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "POST", "/lol-lobby/v2/lobby/matchmaking/search");
  },
  stopMatch: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "DELETE", "/lol-lobby/v2/lobby/matchmaking/search");
  },
  checkMatchState: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-lobby/v2/lobby/matchmaking/search-state");
  },
  getCustomGames: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-lobby/v1/custom-games");
  },
  getQueues: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-game-queues/v1/queues");
  },
  getChatConfig: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-game-queues/v1/queues");
  },
  getChampSelectSession: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-champ-select/v1/session");
  },
  getChatConversations: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-chat/v1/conversations");
  },
  getGameflowSession: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-gameflow/v1/session");
  },
  getExtraGameClientArgs: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-gameflow/v1/extra-game-client-args");
  },
  getLobby: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-lobby/v2/lobby");
  },
  buySlotOne: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "POST", "/lol-tft-tutorial/v1/helpers/buy-champion-in-slot", { "slot": 0 });
  },
  testFunc: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-lobby/v2/notifications");
  }
};
electron.contextBridge.exposeInMainWorld("lcu", lcuApi);
