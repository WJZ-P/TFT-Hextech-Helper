"use strict";
const electron = require("electron");
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
const lcuApi = {
  getSummonerInfo: () => {
    return electron.ipcRenderer.invoke("lcu-request", "GET", "/lol-summoner/v1/current-summoner");
  },
  createCustomLobby: (config) => {
    console.log("📬 [Preload] 向主进程发送创建房间请求:", config);
    return electron.ipcRenderer.invoke("lcu-request", "POST", "/lol-lobby/v2/lobby", config);
  },
  createLobbyByQueueId: (queueId) => {
    console.log("📬 [Preload] 向主进程发送创建房间请求:", queueId);
    return electron.ipcRenderer.invoke("lcu-request", "POST", "/lol-lobby/v2/lobby", { queueId });
  },
  getCurrentGamemodeInfo: () => {
    return electron.ipcRenderer.invoke("lcu-request", "GET", "/lol-lobby/v1/parties/gamemode");
  },
  startMatch: () => {
    return electron.ipcRenderer.invoke("lcu-request", "POST", "/lol-lobby/v2/lobby/matchmaking/search");
  },
  stopMatch: () => {
    return electron.ipcRenderer.invoke("lcu-request", "DELETE", "/lol-lobby/v2/lobby/matchmaking/search");
  },
  checkMatchState: () => {
    return electron.ipcRenderer.invoke("lcu-request", "GET", "/lol-lobby/v2/lobby/matchmaking/search-state");
  },
  getCustomGames: () => {
    return electron.ipcRenderer.invoke("lcu-request", "GET", "/lol-lobby/v1/custom-games");
  },
  getQueues: () => {
    return electron.ipcRenderer.invoke("lcu-request", "GET", "/lol-game-queues/v1/queues");
  },
  getChatConfig: () => {
    return electron.ipcRenderer.invoke("lcu-request", "GET", "/lol-game-queues/v1/queues");
  }
};
electron.contextBridge.exposeInMainWorld("lcu", lcuApi);
