"use strict";
const electron = require("electron");
var IpcChannel = /* @__PURE__ */ ((IpcChannel2) => {
  IpcChannel2["CONFIG_BACKUP"] = "config-backup";
  IpcChannel2["CONFIG_RESTORE"] = "config-restore";
  IpcChannel2["LCU_REQUEST"] = "lcu-request";
  IpcChannel2["LCU_CONNECT"] = "lcu-connect";
  IpcChannel2["LCU_DISCONNECT"] = "lcu-disconnect";
  IpcChannel2["LCU_GET_CONNECTION_STATUS"] = "lcu-get-connection-status";
  IpcChannel2["HEX_START"] = "hex-start";
  IpcChannel2["HEX_STOP"] = "hex-stop";
  IpcChannel2["HEX_GET_STATUS"] = "hex-get-status";
  IpcChannel2["HEX_TOGGLE_TRIGGERED"] = "hex-toggle-triggered";
  IpcChannel2["TFT_BUY_AT_SLOT"] = "tft-buy-at-slot";
  IpcChannel2["TFT_GET_SHOP_INFO"] = "tft-get-shop-info";
  IpcChannel2["TFT_GET_EQUIP_INFO"] = "tft-get-equip-info";
  IpcChannel2["TFT_GET_BENCH_INFO"] = "tft-get-bench-info";
  IpcChannel2["TFT_GET_FIGHT_BOARD_INFO"] = "tft-get-fight-board-info";
  IpcChannel2["TFT_GET_LEVEL_INFO"] = "tft-get-level-info";
  IpcChannel2["TFT_GET_COIN_COUNT"] = "tft-get-coin-count";
  IpcChannel2["TFT_GET_LOOT_ORBS"] = "tft-get-loot-orbs";
  IpcChannel2["TFT_GET_STAGE_INFO"] = "tft-get-stage-info";
  IpcChannel2["TFT_SAVE_STAGE_SNAPSHOTS"] = "tft-save-stage-snapshots";
  IpcChannel2["TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT"] = "tft-test-save-bench-slot-snapshot";
  IpcChannel2["TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT"] = "tft-test-save-fight-board-slot-snapshot";
  IpcChannel2["TFT_TEST_SAVE_QUIT_BUTTON_SNAPSHOT"] = "tft-test-save-quit-button-snapshot";
  IpcChannel2["LINEUP_GET_ALL"] = "lineup-get-all";
  IpcChannel2["LINEUP_GET_BY_ID"] = "lineup-get-by-id";
  IpcChannel2["LINEUP_GET_SELECTED_IDS"] = "lineup-get-selected-ids";
  IpcChannel2["LINEUP_SET_SELECTED_IDS"] = "lineup-set-selected-ids";
  IpcChannel2["LINEUP_SAVE"] = "lineup-save";
  IpcChannel2["LINEUP_DELETE"] = "lineup-delete";
  IpcChannel2["TFT_GET_CHAMPION_CN_TO_EN_MAP"] = "tft-get-champion-cn-to-en-map";
  IpcChannel2["TFT_DATA_REFRESH"] = "tft-data-refresh";
  IpcChannel2["TFT_DATA_GET_SNAPSHOT"] = "tft-data-get-snapshot";
  IpcChannel2["PC_LOGIC_PLAN_ONCE"] = "pc-logic-plan-once";
  IpcChannel2["ANDROID_SIMULATION_PLAN_ONCE"] = "android-simulation-plan-once";
  IpcChannel2["ANDROID_SIMULATION_LIST_SCENARIOS"] = "android-simulation-list-scenarios";
  IpcChannel2["ANDROID_RECOGNITION_REPLAY_RUN"] = "android-recognition-replay-run";
  IpcChannel2["ANDROID_RECOGNITION_REPLAY_LIST_FIXTURES"] = "android-recognition-replay-list-fixtures";
  IpcChannel2["TFT_GET_MODE"] = "tft-get-mode";
  IpcChannel2["TFT_SET_MODE"] = "tft-set-mode";
  IpcChannel2["LOG_GET_MODE"] = "log-get-mode";
  IpcChannel2["LOG_SET_MODE"] = "log-set-mode";
  IpcChannel2["LOG_GET_AUTO_CLEAN_THRESHOLD"] = "log-get-auto-clean-threshold";
  IpcChannel2["LOG_SET_AUTO_CLEAN_THRESHOLD"] = "log-set-auto-clean-threshold";
  IpcChannel2["LCU_KILL_GAME_PROCESS"] = "lcu-kill-game-process";
  IpcChannel2["SHOW_TOAST"] = "show-toast";
  IpcChannel2["HOTKEY_GET_TOGGLE"] = "hotkey-get-toggle";
  IpcChannel2["HOTKEY_SET_TOGGLE"] = "hotkey-set-toggle";
  IpcChannel2["HOTKEY_GET_STOP_AFTER_GAME"] = "hotkey-get-stop-after-game";
  IpcChannel2["HOTKEY_SET_STOP_AFTER_GAME"] = "hotkey-set-stop-after-game";
  IpcChannel2["HEX_STOP_AFTER_GAME_TRIGGERED"] = "hex-stop-after-game-triggered";
  IpcChannel2["HEX_GET_STOP_AFTER_GAME"] = "hex-get-stop-after-game";
  IpcChannel2["HEX_TOGGLE_STOP_AFTER_GAME"] = "hex-toggle-stop-after-game";
  IpcChannel2["SETTINGS_GET"] = "settings-get";
  IpcChannel2["SETTINGS_SET"] = "settings-set";
  IpcChannel2["UTIL_IS_ELEVATED"] = "util-is-elevated";
  IpcChannel2["STATS_GET"] = "stats-get";
  IpcChannel2["STATS_UPDATED"] = "stats-updated";
  IpcChannel2["HEX_SET_SCHEDULED_STOP"] = "hex-set-scheduled-stop";
  IpcChannel2["HEX_CLEAR_SCHEDULED_STOP"] = "hex-clear-scheduled-stop";
  IpcChannel2["HEX_GET_SCHEDULED_STOP"] = "hex-get-scheduled-stop";
  IpcChannel2["HEX_SCHEDULED_STOP_TRIGGERED"] = "hex-scheduled-stop-triggered";
  IpcChannel2["APP_GET_VERSION"] = "app-get-version";
  IpcChannel2["APP_CHECK_UPDATE"] = "app-check-update";
  IpcChannel2["OVERLAY_SHOW"] = "overlay-show";
  IpcChannel2["OVERLAY_CLOSE"] = "overlay-close";
  IpcChannel2["OVERLAY_UPDATE_PLAYERS"] = "overlay-update-players";
  return IpcChannel2;
})(IpcChannel || {});
const exposedIpcRenderer = {
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
};
electron.contextBridge.exposeInMainWorld("ipcRenderer", exposedIpcRenderer);
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
  },
  /** 获取当前运行状态 */
  getStatus: () => {
    return electron.ipcRenderer.invoke(IpcChannel.HEX_GET_STATUS);
  },
  /** 
   * 监听快捷键触发的挂机切换事件
   * @param callback 回调函数，参数为切换后的运行状态（true=运行中，false=已停止）
   */
  onToggleTriggered: (callback) => {
    const listener = (_event, isRunning) => callback(isRunning);
    electron.ipcRenderer.on(IpcChannel.HEX_TOGGLE_TRIGGERED, listener);
    return () => electron.ipcRenderer.removeListener(IpcChannel.HEX_TOGGLE_TRIGGERED, listener);
  },
  /** 获取"本局结束后停止"状态 */
  getStopAfterGame: () => {
    return electron.ipcRenderer.invoke(IpcChannel.HEX_GET_STOP_AFTER_GAME);
  },
  /** 切换"本局结束后停止"状态 */
  toggleStopAfterGame: () => {
    return electron.ipcRenderer.invoke(IpcChannel.HEX_TOGGLE_STOP_AFTER_GAME);
  },
  /**
   * 监听快捷键触发的"本局结束后停止"切换事件
   * @param callback 回调函数，参数为切换后的状态（true=开启，false=关闭）
   */
  onStopAfterGameTriggered: (callback) => {
    const listener = (_event, isEnabled) => callback(isEnabled);
    electron.ipcRenderer.on(IpcChannel.HEX_STOP_AFTER_GAME_TRIGGERED, listener);
    return () => electron.ipcRenderer.removeListener(IpcChannel.HEX_STOP_AFTER_GAME_TRIGGERED, listener);
  },
  /** 设置定时停止时间，格式 "HH:mm"  */
  setScheduledStop: (timeStr) => {
    return electron.ipcRenderer.invoke(IpcChannel.HEX_SET_SCHEDULED_STOP, timeStr);
  },
  /** 取消定时停止 */
  clearScheduledStop: () => {
    return electron.ipcRenderer.invoke(IpcChannel.HEX_CLEAR_SCHEDULED_STOP);
  },
  /** 获取当前定时停止时间（ISO 字符串 或 null） */
  getScheduledStop: () => {
    return electron.ipcRenderer.invoke(IpcChannel.HEX_GET_SCHEDULED_STOP);
  },
  /** 监听定时停止触发事件（时间到后通知前端） */
  onScheduledStopTriggered: (callback) => {
    const listener = () => callback();
    electron.ipcRenderer.on(IpcChannel.HEX_SCHEDULED_STOP_TRIGGERED, listener);
    return () => electron.ipcRenderer.removeListener(IpcChannel.HEX_SCHEDULED_STOP_TRIGGERED, listener);
  }
};
electron.contextBridge.exposeInMainWorld("hex", hexApi);
const tftApi = {
  buyAtSlot: (slot) => electron.ipcRenderer.invoke(IpcChannel.TFT_BUY_AT_SLOT, slot),
  getShopInfo: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_SHOP_INFO),
  getEquipInfo: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_EQUIP_INFO),
  getBenchInfo: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_BENCH_INFO),
  getFightBoardInfo: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_FIGHT_BOARD_INFO),
  getLevelInfo: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_LEVEL_INFO),
  getCoinCount: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_COIN_COUNT),
  getLootOrbs: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_LOOT_ORBS),
  /** 获取当前游戏阶段信息（如 "2-1"） */
  getStageInfo: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_STAGE_INFO),
  /** 保存所有阶段区域截图（发条鸟/标准/第一阶段三种区域） */
  saveStageSnapshots: () => electron.ipcRenderer.invoke(IpcChannel.TFT_SAVE_STAGE_SNAPSHOTS),
  saveBenchSlotSnapshots: () => electron.ipcRenderer.invoke(IpcChannel.TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT),
  saveFightBoardSlotSnapshots: () => electron.ipcRenderer.invoke(IpcChannel.TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT),
  saveQuitButtonSnapshot: () => electron.ipcRenderer.invoke(IpcChannel.TFT_TEST_SAVE_QUIT_BUTTON_SNAPSHOT),
  // 保存发条鸟退出按钮截图
  planAndroidSimulation: (state, context) => electron.ipcRenderer.invoke(IpcChannel.ANDROID_SIMULATION_PLAN_ONCE, state, context),
  getAndroidSimulationScenarios: () => electron.ipcRenderer.invoke(IpcChannel.ANDROID_SIMULATION_LIST_SCENARIOS),
  runAndroidRecognitionReplay: (fixtureId) => electron.ipcRenderer.invoke(IpcChannel.ANDROID_RECOGNITION_REPLAY_RUN, fixtureId),
  getAndroidRecognitionReplayFixtures: () => electron.ipcRenderer.invoke(IpcChannel.ANDROID_RECOGNITION_REPLAY_LIST_FIXTURES),
  getDataSnapshot: () => electron.ipcRenderer.invoke(IpcChannel.TFT_DATA_GET_SNAPSHOT),
  refreshDataSnapshot: () => electron.ipcRenderer.invoke(IpcChannel.TFT_DATA_REFRESH)
};
electron.contextBridge.exposeInMainWorld("tft", tftApi);
const lineupApi = {
  /** 获取所有已加载的阵容配置 */
  getAll: (season) => electron.ipcRenderer.invoke(IpcChannel.LINEUP_GET_ALL, season),
  /** 根据 ID 获取单个阵容配置 */
  getById: (id) => electron.ipcRenderer.invoke(IpcChannel.LINEUP_GET_BY_ID, id),
  /** 获取用户选中的阵容 ID 列表 */
  getSelectedIds: () => electron.ipcRenderer.invoke(IpcChannel.LINEUP_GET_SELECTED_IDS),
  /** 保存用户选中的阵容 ID 列表 */
  setSelectedIds: (ids) => electron.ipcRenderer.invoke(IpcChannel.LINEUP_SET_SELECTED_IDS, ids),
  /** 保存玩家自建阵容，返回阵容 ID */
  save: (config) => electron.ipcRenderer.invoke(IpcChannel.LINEUP_SAVE, config),
  /** 删除玩家自建阵容，返回是否成功 */
  delete: (id) => electron.ipcRenderer.invoke(IpcChannel.LINEUP_DELETE, id),
  /** 获取当前 TFT 游戏模式（匹配/排位） */
  getTftMode: () => electron.ipcRenderer.invoke(IpcChannel.TFT_GET_MODE),
  /** 设置 TFT 游戏模式 */
  setTftMode: (mode) => electron.ipcRenderer.invoke(IpcChannel.TFT_SET_MODE, mode),
  /** 获取当前日志模式（简略/详细） */
  getLogMode: () => electron.ipcRenderer.invoke(IpcChannel.LOG_GET_MODE),
  /** 设置日志模式 */
  setLogMode: (mode) => electron.ipcRenderer.invoke(IpcChannel.LOG_SET_MODE, mode),
  /** 获取日志自动清理阈值 */
  getLogAutoCleanThreshold: () => electron.ipcRenderer.invoke(IpcChannel.LOG_GET_AUTO_CLEAN_THRESHOLD),
  /** 设置日志自动清理阈值 */
  setLogAutoCleanThreshold: (threshold) => electron.ipcRenderer.invoke(IpcChannel.LOG_SET_AUTO_CLEAN_THRESHOLD, threshold)
};
electron.contextBridge.exposeInMainWorld("lineup", lineupApi);
const utilApi = {
  /** 获取挂机开关快捷键 */
  getToggleHotkey: () => electron.ipcRenderer.invoke(IpcChannel.HOTKEY_GET_TOGGLE),
  /** 设置挂机开关快捷键（返回是否设置成功），空字符串表示取消绑定 */
  setToggleHotkey: (accelerator) => electron.ipcRenderer.invoke(IpcChannel.HOTKEY_SET_TOGGLE, accelerator),
  /** 获取"本局结束后停止"快捷键 */
  getStopAfterGameHotkey: () => electron.ipcRenderer.invoke(IpcChannel.HOTKEY_GET_STOP_AFTER_GAME),
  /** 设置"本局结束后停止"快捷键（返回是否设置成功），空字符串表示取消绑定 */
  setStopAfterGameHotkey: (accelerator) => electron.ipcRenderer.invoke(IpcChannel.HOTKEY_SET_STOP_AFTER_GAME, accelerator),
  /**
   * 检测当前是否以管理员权限运行
   * 原理：执行 `net session` 命令，该命令只有管理员权限下才能成功
   * @returns true = 有管理员权限，false = 无管理员权限
   */
  isElevated: () => electron.ipcRenderer.invoke(IpcChannel.UTIL_IS_ELEVATED),
  /** 获取当前应用版本号 */
  getAppVersion: () => electron.ipcRenderer.invoke(IpcChannel.APP_GET_VERSION),
  /** 
   * 检查更新
   * @returns 更新信息对象，包含当前版本、最新版本、是否有更新等
   */
  checkUpdate: () => electron.ipcRenderer.invoke(IpcChannel.APP_CHECK_UPDATE)
};
electron.contextBridge.exposeInMainWorld("util", utilApi);
const statsApi = {
  /** 获取完整的统计数据快照（包含运行时 + 持久化数据） */
  getStatistics: () => electron.ipcRenderer.invoke(IpcChannel.STATS_GET),
  /**
   * 监听统计数据更新事件
   * @param callback 回调函数，每当一局游戏完成时触发
   * @returns 清理函数，用于取消监听
   */
  onStatsUpdated: (callback) => {
    const listener = (_event, stats) => callback(stats);
    electron.ipcRenderer.on(IpcChannel.STATS_UPDATED, listener);
    return () => electron.ipcRenderer.removeListener(IpcChannel.STATS_UPDATED, listener);
  }
};
electron.contextBridge.exposeInMainWorld("stats", statsApi);
const settingsApi = {
  /** 
   * 读取设置项（支持点号路径）
   * @example settings.get('showDebugPage')
   * @example settings.get('window.bounds')
   */
  get: (key) => electron.ipcRenderer.invoke(IpcChannel.SETTINGS_GET, key),
  /**
   * 写入设置项（支持点号路径）
   * @example settings.set('showDebugPage', true)
   * @example settings.set('window.bounds', { x: 0, y: 0, width: 800, height: 600 })
   */
  set: (key, value) => electron.ipcRenderer.invoke(IpcChannel.SETTINGS_SET, key, value)
};
electron.contextBridge.exposeInMainWorld("settings", settingsApi);
const lcuApi = {
  /**
   * 获取当前召唤师信息
   */
  getSummonerInfo: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "GET", "/lol-summoner/v1/current-summoner");
  },
  /**
   * 获取当前 LCU 连接状态
   * @returns 是否已连接
   */
  getConnectionStatus: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_GET_CONNECTION_STATUS);
  },
  /**
   * 监听 LCU 连接事件
   * @param callback - 连接成功时的回调函数
   * @returns 清理函数，用于取消监听
   */
  onConnect: (callback) => {
    const listener = () => callback();
    electron.ipcRenderer.on(IpcChannel.LCU_CONNECT, listener);
    return () => electron.ipcRenderer.removeListener(IpcChannel.LCU_CONNECT, listener);
  },
  /**
   * 监听 LCU 断开事件
   * @param callback - 断开连接时的回调函数
   * @returns 清理函数，用于取消监听
   */
  onDisconnect: (callback) => {
    const listener = () => callback();
    electron.ipcRenderer.on(IpcChannel.LCU_DISCONNECT, listener);
    return () => electron.ipcRenderer.removeListener(IpcChannel.LCU_DISCONNECT, listener);
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
  },
  /** 强制杀掉游戏进程 */
  killGameProcess: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_KILL_GAME_PROCESS);
  },
  /** 退出当前房间（离开大厅） */
  leaveLobby: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "DELETE", "/lol-lobby/v2/lobby");
  },
  /** 退出当前游戏（关闭游戏窗口，触发 early-exit） */
  quitGame: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "POST", "/lol-gameflow/v1/early-exit");
  },
  /** 投降（LCU 隐藏接口，触发游戏内投降） */
  surrender: () => {
    return electron.ipcRenderer.invoke(IpcChannel.LCU_REQUEST, "POST", "/lol-gameflow/v1/surrender");
  }
};
electron.contextBridge.exposeInMainWorld("lcu", lcuApi);
