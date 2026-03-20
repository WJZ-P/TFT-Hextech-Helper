import {ipcRenderer, contextBridge} from 'electron'
import IpcRendererEvent = Electron.IpcRendererEvent;
import {LobbyConfig, Queue, SummonerInfo} from "../src-backend/lcu/utils/LCUProtocols";
import {IpcChannel} from "./protocol";

// --------- Expose some API to the Renderer process ---------
const exposedIpcRenderer = {
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
}
export type ExposedIpcRenderer = typeof exposedIpcRenderer
contextBridge.exposeInMainWorld('ipcRenderer', exposedIpcRenderer)

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
    },
    /** 获取当前运行状态 */
    getStatus: (): Promise<boolean> => {
        return ipcRenderer.invoke(IpcChannel.HEX_GET_STATUS)
    },
    /** 
     * 监听快捷键触发的挂机切换事件
     * @param callback 回调函数，参数为切换后的运行状态（true=运行中，false=已停止）
     */
    onToggleTriggered: (callback: (isRunning: boolean) => void): (() => void) => {
        const listener = (_event: IpcRendererEvent, isRunning: boolean) => callback(isRunning);
        ipcRenderer.on(IpcChannel.HEX_TOGGLE_TRIGGERED, listener);
        return () => ipcRenderer.removeListener(IpcChannel.HEX_TOGGLE_TRIGGERED, listener);
    },
    /** 获取"本局结束后停止"状态 */
    getStopAfterGame: (): Promise<boolean> => {
        return ipcRenderer.invoke(IpcChannel.HEX_GET_STOP_AFTER_GAME)
    },
    /** 切换"本局结束后停止"状态 */
    toggleStopAfterGame: (): Promise<boolean> => {
        return ipcRenderer.invoke(IpcChannel.HEX_TOGGLE_STOP_AFTER_GAME)
    },
    /**
     * 监听快捷键触发的"本局结束后停止"切换事件
     * @param callback 回调函数，参数为切换后的状态（true=开启，false=关闭）
     */
    onStopAfterGameTriggered: (callback: (isEnabled: boolean) => void): (() => void) => {
        const listener = (_event: IpcRendererEvent, isEnabled: boolean) => callback(isEnabled);
        ipcRenderer.on(IpcChannel.HEX_STOP_AFTER_GAME_TRIGGERED, listener);
        return () => ipcRenderer.removeListener(IpcChannel.HEX_STOP_AFTER_GAME_TRIGGERED, listener);
    },
    /** 设置定时停止时间，格式 "HH:mm"  */
    setScheduledStop: (timeStr: string): Promise<string> => {
        return ipcRenderer.invoke(IpcChannel.HEX_SET_SCHEDULED_STOP, timeStr);
    },
    /** 取消定时停止 */
    clearScheduledStop: (): Promise<void> => {
        return ipcRenderer.invoke(IpcChannel.HEX_CLEAR_SCHEDULED_STOP);
    },
    /** 获取当前定时停止时间（ISO 字符串 或 null） */
    getScheduledStop: (): Promise<string | null> => {
        return ipcRenderer.invoke(IpcChannel.HEX_GET_SCHEDULED_STOP);
    },
    /** 监听定时停止触发事件（时间到后通知前端） */
    onScheduledStopTriggered: (callback: () => void): (() => void) => {
        const listener = () => callback();
        ipcRenderer.on(IpcChannel.HEX_SCHEDULED_STOP_TRIGGERED, listener);
        return () => ipcRenderer.removeListener(IpcChannel.HEX_SCHEDULED_STOP_TRIGGERED, listener);
    },
}
export type HexApi = typeof hexApi
contextBridge.exposeInMainWorld('hex', hexApi)

//  TFTApi: 下棋控制器相关操作
const tftApi = {
    buyAtSlot: (slot: number) => ipcRenderer.invoke(IpcChannel.TFT_BUY_AT_SLOT, slot),
    getShopInfo: () => ipcRenderer.invoke(IpcChannel.TFT_GET_SHOP_INFO),
    getEquipInfo: () => ipcRenderer.invoke(IpcChannel.TFT_GET_EQUIP_INFO),
    getBenchInfo: () => ipcRenderer.invoke(IpcChannel.TFT_GET_BENCH_INFO),
    getFightBoardInfo: () => ipcRenderer.invoke(IpcChannel.TFT_GET_FIGHT_BOARD_INFO),
    getLevelInfo: () => ipcRenderer.invoke(IpcChannel.TFT_GET_LEVEL_INFO),
    getCoinCount: () => ipcRenderer.invoke(IpcChannel.TFT_GET_COIN_COUNT),
    getLootOrbs: () => ipcRenderer.invoke(IpcChannel.TFT_GET_LOOT_ORBS),
    /** 获取当前游戏阶段信息（如 "2-1"） */
    getStageInfo: () => ipcRenderer.invoke(IpcChannel.TFT_GET_STAGE_INFO),
    /** 保存所有阶段区域截图（发条鸟/标准/第一阶段三种区域） */
    saveStageSnapshots: () => ipcRenderer.invoke(IpcChannel.TFT_SAVE_STAGE_SNAPSHOTS),
    saveBenchSlotSnapshots : ()=> ipcRenderer.invoke(IpcChannel.TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT),
    saveFightBoardSlotSnapshots : ()=>ipcRenderer.invoke(IpcChannel.TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT),
    saveQuitButtonSnapshot: () => ipcRenderer.invoke(IpcChannel.TFT_TEST_SAVE_QUIT_BUTTON_SNAPSHOT),  // 保存发条鸟退出按钮截图
    planAndroidSimulation: (state: any, context?: any) => ipcRenderer.invoke(IpcChannel.ANDROID_SIMULATION_PLAN_ONCE, state, context),
    getAndroidSimulationScenarios: () => ipcRenderer.invoke(IpcChannel.ANDROID_SIMULATION_LIST_SCENARIOS),
    runAndroidRecognitionReplay: (fixtureId: string) => ipcRenderer.invoke(IpcChannel.ANDROID_RECOGNITION_REPLAY_RUN, fixtureId),
    getAndroidRecognitionReplayFixtures: () => ipcRenderer.invoke(IpcChannel.ANDROID_RECOGNITION_REPLAY_LIST_FIXTURES),
    getDataSnapshot: () => ipcRenderer.invoke(IpcChannel.TFT_DATA_GET_SNAPSHOT),
    refreshDataSnapshot: () => ipcRenderer.invoke(IpcChannel.TFT_DATA_REFRESH),
}
export type TftApi = typeof tftApi
contextBridge.exposeInMainWorld('tft', tftApi)

// lineupApi: 阵容配置相关操作
const lineupApi = {
    /** 获取所有已加载的阵容配置 */
    getAll: (season?: string) => ipcRenderer.invoke(IpcChannel.LINEUP_GET_ALL, season),
    /** 根据 ID 获取单个阵容配置 */
    getById: (id: string) => ipcRenderer.invoke(IpcChannel.LINEUP_GET_BY_ID, id),
    /** 获取用户选中的阵容 ID 列表 */
    getSelectedIds: (): Promise<string[]> => ipcRenderer.invoke(IpcChannel.LINEUP_GET_SELECTED_IDS),
    /** 保存用户选中的阵容 ID 列表 */
    setSelectedIds: (ids: string[]): Promise<void> => ipcRenderer.invoke(IpcChannel.LINEUP_SET_SELECTED_IDS, ids),
    /** 保存玩家自建阵容，返回阵容 ID */
    save: (config: any): Promise<string> => ipcRenderer.invoke(IpcChannel.LINEUP_SAVE, config),
    /** 删除玩家自建阵容，返回是否成功 */
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke(IpcChannel.LINEUP_DELETE, id),
    /** 获取当前 TFT 游戏模式（匹配/排位） */
    getTftMode: (): Promise<string> => ipcRenderer.invoke(IpcChannel.TFT_GET_MODE),
    /** 设置 TFT 游戏模式 */
    setTftMode: (mode: string): Promise<void> => ipcRenderer.invoke(IpcChannel.TFT_SET_MODE, mode),
    /** 获取当前日志模式（简略/详细） */
    getLogMode: (): Promise<string> => ipcRenderer.invoke(IpcChannel.LOG_GET_MODE),
    /** 设置日志模式 */
    setLogMode: (mode: string): Promise<void> => ipcRenderer.invoke(IpcChannel.LOG_SET_MODE, mode),
    /** 获取日志自动清理阈值 */
    getLogAutoCleanThreshold: (): Promise<number> => ipcRenderer.invoke(IpcChannel.LOG_GET_AUTO_CLEAN_THRESHOLD),
    /** 设置日志自动清理阈值 */
    setLogAutoCleanThreshold: (threshold: number): Promise<void> => ipcRenderer.invoke(IpcChannel.LOG_SET_AUTO_CLEAN_THRESHOLD, threshold),
}
export type LineupApi = typeof lineupApi
contextBridge.exposeInMainWorld('lineup', lineupApi)

// utilApi: 通用工具 API（快捷键等）
const utilApi = {
    /** 获取挂机开关快捷键 */
    getToggleHotkey: (): Promise<string> => ipcRenderer.invoke(IpcChannel.HOTKEY_GET_TOGGLE),
    /** 设置挂机开关快捷键（返回是否设置成功），空字符串表示取消绑定 */
    setToggleHotkey: (accelerator: string): Promise<boolean> => ipcRenderer.invoke(IpcChannel.HOTKEY_SET_TOGGLE, accelerator),
    /** 获取"本局结束后停止"快捷键 */
    getStopAfterGameHotkey: (): Promise<string> => ipcRenderer.invoke(IpcChannel.HOTKEY_GET_STOP_AFTER_GAME),
    /** 设置"本局结束后停止"快捷键（返回是否设置成功），空字符串表示取消绑定 */
    setStopAfterGameHotkey: (accelerator: string): Promise<boolean> => ipcRenderer.invoke(IpcChannel.HOTKEY_SET_STOP_AFTER_GAME, accelerator),
    /**
     * 检测当前是否以管理员权限运行
     * 原理：执行 `net session` 命令，该命令只有管理员权限下才能成功
     * @returns true = 有管理员权限，false = 无管理员权限
     */
    isElevated: (): Promise<boolean> => ipcRenderer.invoke(IpcChannel.UTIL_IS_ELEVATED),
    /** 获取当前应用版本号 */
    getAppVersion: (): Promise<string> => ipcRenderer.invoke(IpcChannel.APP_GET_VERSION),
    /** 
     * 检查更新
     * @returns 更新信息对象，包含当前版本、最新版本、是否有更新等
     */
    checkUpdate: (): Promise<{
        currentVersion?: string;
        latestVersion?: string;
        hasUpdate?: boolean;
        releaseUrl?: string;
        releaseNotes?: string;
        publishedAt?: string;
        error?: string;
    }> => ipcRenderer.invoke(IpcChannel.APP_CHECK_UPDATE),
}
export type UtilApi = typeof utilApi
contextBridge.exposeInMainWorld('util', utilApi)

// statsApi: 统计数据 API（读取挂机统计信息）
const statsApi = {
    /** 获取完整的统计数据快照（包含运行时 + 持久化数据） */
    getStatistics: (): Promise<{
        sessionGamesPlayed: number;
        totalGamesPlayed: number;
        sessionElapsedSeconds: number;
    }> => ipcRenderer.invoke(IpcChannel.STATS_GET),
    /**
     * 监听统计数据更新事件
     * @param callback 回调函数，每当一局游戏完成时触发
     * @returns 清理函数，用于取消监听
     */
    onStatsUpdated: (callback: (stats: {
        sessionGamesPlayed: number;
        totalGamesPlayed: number;
        sessionElapsedSeconds: number;
    }) => void): (() => void) => {
        const listener = (_event: IpcRendererEvent, stats: any) => callback(stats);
        ipcRenderer.on(IpcChannel.STATS_UPDATED, listener);
        return () => ipcRenderer.removeListener(IpcChannel.STATS_UPDATED, listener);
    },
}
export type StatsApi = typeof statsApi
contextBridge.exposeInMainWorld('stats', statsApi)

// settingsApi: 通用设置读写 API（与后端 SettingsStore 对接）
const settingsApi = {
    /** 
     * 读取设置项（支持点号路径）
     * @example settings.get('showDebugPage')
     * @example settings.get('window.bounds')
     */
    get: <T = any>(key: string): Promise<T> => ipcRenderer.invoke(IpcChannel.SETTINGS_GET, key),
    /**
     * 写入设置项（支持点号路径）
     * @example settings.set('showDebugPage', true)
     * @example settings.set('window.bounds', { x: 0, y: 0, width: 800, height: 600 })
     */
    set: <T = any>(key: string, value: T): Promise<void> => ipcRenderer.invoke(IpcChannel.SETTINGS_SET, key, value),
}
export type SettingsApi = typeof settingsApi
contextBridge.exposeInMainWorld('settings', settingsApi)

const lcuApi = {
    /**
     * 获取当前召唤师信息
     */
    getSummonerInfo: (): Promise<{ data?: SummonerInfo; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'GET', '/lol-summoner/v1/current-summoner');
    },
    /**
     * 获取当前 LCU 连接状态
     * @returns 是否已连接
     */
    getConnectionStatus: (): Promise<boolean> => {
        return ipcRenderer.invoke(IpcChannel.LCU_GET_CONNECTION_STATUS);
    },
    /**
     * 监听 LCU 连接事件
     * @param callback - 连接成功时的回调函数
     * @returns 清理函数，用于取消监听
     */
    onConnect: (callback: () => void): (() => void) => {
        const listener = () => callback();
        ipcRenderer.on(IpcChannel.LCU_CONNECT, listener);
        return () => ipcRenderer.removeListener(IpcChannel.LCU_CONNECT, listener);
    },
    /**
     * 监听 LCU 断开事件
     * @param callback - 断开连接时的回调函数
     * @returns 清理函数，用于取消监听
     */
    onDisconnect: (callback: () => void): (() => void) => {
        const listener = () => callback();
        ipcRenderer.on(IpcChannel.LCU_DISCONNECT, listener);
        return () => ipcRenderer.removeListener(IpcChannel.LCU_DISCONNECT, listener);
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
    /** 强制杀掉游戏进程 */
    killGameProcess: (): Promise<boolean> => {
        return ipcRenderer.invoke(IpcChannel.LCU_KILL_GAME_PROCESS);
    },
    /** 退出当前房间（离开大厅） */
    leaveLobby: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'DELETE', '/lol-lobby/v2/lobby');
    },
    /** 退出当前游戏（关闭游戏窗口，触发 early-exit） */
    quitGame: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'POST', '/lol-gameflow/v1/early-exit');
    },
    /** 投降（LCU 隐藏接口，触发游戏内投降） */
    surrender: (): Promise<{ data?: any; error?: string }> => {
        return ipcRenderer.invoke(IpcChannel.LCU_REQUEST, 'POST', '/lol-gameflow/v1/surrender');
    },
}
export type LcuApi = typeof lcuApi
contextBridge.exposeInMainWorld('lcu', lcuApi)

// https://127.0.0.1:2999/liveclientdata/allgamedata    开游戏后，这个url会有一些数据推送。
