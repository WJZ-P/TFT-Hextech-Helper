import {app, BrowserWindow, ipcMain, shell, net} from 'electron'
import LCUConnector from "../src-backend/lcu/utils/LcuConnector.ts";
import LCUManager, { LcuEventUri, LCUWebSocketMessage } from "../src-backend/lcu/LCUManager.ts";
import 'source-map-support/register';
import GameConfigHelper from "../src-backend/utils/GameConfigHelper.ts";
import path from "path";
import {IpcChannel} from "./protocol.ts";
import {logger} from "../src-backend/utils/Logger.ts";
import {hexService} from "../src-backend/services/HexService.ts";
import {settingsStore} from "../src-backend/utils/SettingsStore.ts";
import {debounce} from "../src-backend/utils/HelperTools.ts";
import {tftOperator} from "../src-backend/TftOperator.ts";
import {Point} from "@nut-tree-fork/nut-js";
import {is, optimizer} from "@electron-toolkit/utils";
import {lineupLoader} from "../src-backend/lineup";  // 导入阵容加载器
import {TFT_16_CHAMPION_DATA} from "../src-backend/TFTProtocol";  // 导入棋子数据
import {globalHotkeyManager} from "../src-backend/utils/GlobalHotkeyManager.ts";  // 全局快捷键管理器
import { exec } from 'child_process';  // 用于执行系统命令

/**
 * 下面这两行代码是历史原因，新版的ESM模式下需要CJS里面的require、__dirname来提供方便
 * import.meta.url：file:///C:/Users/YourProject/electron/main.ts (一个标准的 URL 格式路径)。
 * path.dirname：把一个完整的文件路径，只剪下它所在的文件夹部分。
 * 这里的__dirname就是我们手造出来的。
 *
 * 然后require也同理，是我们手搓的，因为新版ESM不提供require。
 */
// const require = createRequire(import.meta.url)
// const __dirname = path.dirname(fileURLToPath(import.meta.url))

//  我们默认是使用cjs打包，就不考虑这个问题了。

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT)    //  renderer的文件路径，很重要

// VITE_PUBLIC 指向静态资源目录
// - 开发环境: 项目根目录下的 public 文件夹
// - 生产环境: 打包后的 resources 文件夹（extraResources 会把 public 下的文件复制到这里）
//   process.resourcesPath 在打包后指向 .../resources/ 目录
process.env.VITE_PUBLIC = is.dev 
    ? path.join(process.env.APP_ROOT, '../public') 
    : process.resourcesPath

let win: BrowserWindow | null

// 当前注册的挂机切换快捷键（用于更新时先注销旧的）
let currentToggleHotkey: string | null = null;
// 当前注册的"本局结束后停止"快捷键
let currentStopAfterGameHotkey: string | null = null;

/**
 * 注册挂机开关的全局快捷键
 * @param accelerator Electron Accelerator 格式的快捷键字符串，空字符串表示取消绑定
 * @returns 是否操作成功
 */
function registerToggleHotkey(accelerator: string): boolean {
    // 先注销旧的快捷键
    if (currentToggleHotkey) {
        globalHotkeyManager.unregister(currentToggleHotkey);
        currentToggleHotkey = null;
    }
    
    // 空字符串表示取消绑定
    if (!accelerator) {
        console.log('🎮 [Main] 挂机快捷键已取消绑定');
        return true;
    }
    
    // 注册新快捷键，回调函数中切换挂机状态
    const success = globalHotkeyManager.register(accelerator, async () => {
        console.log(`🎮 [Main] 快捷键 ${accelerator} 被触发，切换挂机状态`);
        
        // 记录切换前的状态，用于计算切换后的期望状态
        const wasRunning = hexService.isRunning;
        
        if (wasRunning) {
            await hexService.stop();
        } else {
            await hexService.start();
        }
        
        // 发送切换后的期望状态（与切换前相反）
        const newState = !wasRunning;
        win?.webContents.send(IpcChannel.HEX_TOGGLE_TRIGGERED, newState);
    });
    
    if (success) {
        currentToggleHotkey = accelerator;
    }
    return success;
}

/**
 * 注册"本局结束后停止"的全局快捷键
 * @param accelerator Electron Accelerator 格式的快捷键字符串，空字符串表示取消绑定
 * @returns 是否操作成功
 */
function registerStopAfterGameHotkey(accelerator: string): boolean {
    // 先注销旧的快捷键
    if (currentStopAfterGameHotkey) {
        globalHotkeyManager.unregister(currentStopAfterGameHotkey);
        currentStopAfterGameHotkey = null;
    }
    
    // 空字符串表示取消绑定
    if (!accelerator) {
        console.log('🎮 [Main] "本局结束后停止"快捷键已取消绑定');
        return true;
    }
    
    // 注册新快捷键，回调函数中切换"本局结束后停止"状态
    const success = globalHotkeyManager.register(accelerator, () => {
        console.log(`🎮 [Main] 快捷键 ${accelerator} 被触发，切换"本局结束后停止"状态`);
        const newState = hexService.toggleStopAfterCurrentGame();
        
        // 通知渲染进程更新 UI 状态
        win?.webContents.send(IpcChannel.HEX_STOP_AFTER_GAME_TRIGGERED, newState);
    });
    
    if (success) {
        currentStopAfterGameHotkey = accelerator;
    }
    return success;
}

function createWindow() {
    const savedWindowInfo = settingsStore.get("window")

    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),//  窗口左上角的图标
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, '../preload/preload.cjs'),// 指定preload文件
            sandbox: false,
        },
        ...(savedWindowInfo.bounds || {width: 1024, height: 600}),   //  控制窗口位置,第一次打开不会有保存值，就用默认的
    })

    console.log("图标路径为：" + path.join(process.env.VITE_PUBLIC, 'icon.png'))

    optimizer.watchWindowShortcuts(win) //  监听快捷键，打开F12控制台


    const debouncedSaveBounds = debounce(() => {
        // 核心！我们只在 "正常" 状态下才保存
        if (!win?.isMaximized() && !win?.isFullScreen()) {
            settingsStore.set('window.bounds', win?.getBounds());
        }
    }, 500)

    //  监听窗口变化事件
    win.on("resize", debouncedSaveBounds)
    win.on("move", debouncedSaveBounds)
    //  关闭窗口的时候，判断是否是全屏
    win.on("close", () => {
        settingsStore.set("window.isMaximized", win!.isMaximized())
    })

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })
    
    // 拦截所有外部链接，使用系统默认浏览器打开
    // 当渲染进程中 <a target="_blank"> 被点击时触发
    win.webContents.setWindowOpenHandler(({ url }) => {
        // 只处理 http/https 链接，用系统浏览器打开
        if (url.startsWith('http://') || url.startsWith('https://')) {
            shell.openExternal(url);
        }
        // 返回 { action: 'deny' } 阻止 Electron 打开新窗口
        return { action: 'deny' };
    })
    //  判断是在开发环境还是打包好的程序
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        console.log('Renderer URL:', process.env.ELECTRON_RENDERER_URL);

        win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        // prod: load built index.html
        // __dirname 在打包后指向 out/main/，而 index.html 在 out/renderer/ 目录
        win.loadFile(path.join(__dirname, '../renderer/index.html'))
    }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

// 在应用退出前，停止全局快捷键管理器
app.on('will-quit', () => {
    globalHotkeyManager.stop();
})

//  正式启动app
app.whenReady().then(async () => {
    createWindow()  //  创建窗口
    init()  //  执行LCU相关函数
    registerHandler()
    
    // 加载阵容配置
    const lineupCount = await lineupLoader.loadAllLineups()
    console.log(`📦 [Main] 已加载 ${lineupCount} 个阵容配置`)
    
    // 注册挂机开关快捷键（从设置中读取）
    const savedHotkey = settingsStore.get('toggleHotkeyAccelerator');
    registerToggleHotkey(savedHotkey);
    
    // 注册"本局结束后停止"快捷键（从设置中读取）
    const savedStopAfterGameHotkey = settingsStore.get('stopAfterGameHotkeyAccelerator');
    registerStopAfterGameHotkey(savedStopAfterGameHotkey);
})

function init() {
    //  初始化Logger
    logger.init(win)
    // 根据保存的设置初始化日志级别
    const logMode = settingsStore.get('logMode')
    logger.setMinLevel(logMode === 'DETAILED' ? 'debug' : 'info')

    //  启动LCUConnector
    const connector = new LCUConnector()
    //  初始化操作器
    tftOperator.init()

    connector.on('connect', (data) => {
        console.log("LOL客户端已登录！", data);

        // 喵~ 使用单例模式获取 LCUManager 实例，并把"钥匙"交给它
        const lcuManager = LCUManager.init(data);

        //  注册configHelper
        GameConfigHelper.init(data.installDirectory)

        // 连接 WebSocket
        lcuManager.start();

        lcuManager.on('connect', async () => {
            // 使用 IpcChannel 枚举发送连接事件给前端
            win?.webContents.send(IpcChannel.LCU_CONNECT);
            // try {
            //     const summoner = await lcuManager.request('GET', '/lol-summoner/v1/current-summoner');
            //     console.log('召唤师信息:', summoner);
            // } catch (e) {
            //     console.error('请求召唤师信息失败:', e);
            // }
        });

        lcuManager.on('disconnect', () => {
            console.log('LCUManager 已断开');
            // 使用 IpcChannel 枚举发送断开事件给前端
            win?.webContents.send(IpcChannel.LCU_DISCONNECT);
            // 重新启动 connector 轮询，等待客户端重新连接
            console.log('🔄 [Main] 重新启动 LCU 连接监听...');
            connector.start();
        });

        // 喵~ 这里是 LCU WebSocket 的"总事件"入口：所有 OnJsonApiEvent 都会从这里过。
        //
        // 【备忘】游戏结束时会触发的 LCU 事件（可用于判断对局结束）：
        //   - /lol-tft-pass/v1/battle-pass      → 战斗通行证更新（结算经验）
        //   - /lol-tft-pass/v1/active-passes    → 活跃通行证列表更新
        //   - /lol-objectives/v1/objectives/tft → TFT 任务进度更新
        //   - /lol-objectives/v1/objectives/lol → LOL 任务进度更新
        //
        lcuManager.on('lcu-event', (event: LCUWebSocketMessage) => {
            // 在这里处理实时收到的游戏事件（仅打印到控制台，便于调试）
            console.log('收到LCU事件:', event.uri, event.eventType);
        });

    });

    connector.on('disconnect', () => {
        console.log("LOL客户端登出！")
        win?.webContents.send(IpcChannel.LCU_DISCONNECT);
    })

    connector.start()

}

function registerHandler() {
    // LCU 连接状态查询
    ipcMain.handle(IpcChannel.LCU_GET_CONNECTION_STATUS, async () => {
        const lcu = LCUManager.getInstance();
        return lcu?.isConnected ?? false;
    });

    ipcMain.handle(IpcChannel.LCU_REQUEST, async (
        _event, // 固定的第一个参数，包含了事件的源信息
        method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', // 第二个参数：请求方法
        endpoint: string, // 第三个参数：API 端点
        body?: object      // 第四个参数：可选的请求体
    ) => {
        // 首先，从单例获取 LCUManager 实例
        const lcu = LCUManager.getInstance();

        // 安全检查：如果 LCU 还没准备好，就返回一个错误
        if (!lcu || !lcu.isConnected) {
            console.error("❌ [IPC] LCUManager 尚未连接，无法处理请求");
            return {error: "LCU is not connected yet."};
        }

        // 尝试执行请求
        try {
            console.log(`📞 [IPC] 收到请求: ${method} ${endpoint}`);
            // 成功后，把数据包装在 data 字段里返回给前台
            const data = await lcu.request(method, endpoint, body);
            return { data };  // 包装成 { data: ... } 格式
        } catch (e: any) {
            console.error(`❌ [IPC] 处理请求 ${method} ${endpoint} 时出错:`, e);
            // 失败后，把错误信息包装在 error 字段里返回
            return {error: e.message};
        }
    });
    //  游戏设置备份
    ipcMain.handle(IpcChannel.CONFIG_BACKUP, async (event) => GameConfigHelper.backup())
    ipcMain.handle(IpcChannel.CONFIG_RESTORE, async (event) => GameConfigHelper.restore())
    //  海克斯核心科技
    ipcMain.handle(IpcChannel.HEX_START, async (event) => hexService.start())
    ipcMain.handle(IpcChannel.HEX_STOP, async (event) => hexService.stop())
    ipcMain.handle(IpcChannel.HEX_GET_STATUS, async (event) => hexService.isRunning)
    //  TFT相关操作
    ipcMain.handle(IpcChannel.TFT_BUY_AT_SLOT, async (event, slot: number) => tftOperator.buyAtSlot(slot))
    ipcMain.handle(IpcChannel.TFT_GET_SHOP_INFO, async (event) => tftOperator.getShopInfo())
    ipcMain.handle(IpcChannel.TFT_GET_EQUIP_INFO, async (event) => tftOperator.getEquipInfo())
    ipcMain.handle(IpcChannel.TFT_GET_BENCH_INFO, async (event) => tftOperator.getBenchInfo())
    ipcMain.handle(IpcChannel.TFT_GET_FIGHT_BOARD_INFO, async (event) => tftOperator.getFightBoardInfo())
    ipcMain.handle(IpcChannel.TFT_GET_LEVEL_INFO, async (event) => tftOperator.getLevelInfo())
    ipcMain.handle(IpcChannel.TFT_GET_COIN_COUNT, async (event) => tftOperator.getCoinCount())
    ipcMain.handle(IpcChannel.TFT_GET_LOOT_ORBS, async (event) => tftOperator.getLootOrbs())
    ipcMain.handle(IpcChannel.TFT_TEST_SAVE_BENCH_SLOT_SNAPSHOT, async (event) => tftOperator.saveBenchSlotSnapshots())
    ipcMain.handle(IpcChannel.TFT_TEST_SAVE_FIGHT_BOARD_SLOT_SNAPSHOT, async (event) => tftOperator.saveFightBoardSlotSnapshots())
    
    // 阵容相关
    ipcMain.handle(IpcChannel.LINEUP_GET_ALL, async () => lineupLoader.getAllLineups())
    ipcMain.handle(IpcChannel.LINEUP_GET_BY_ID, async (_event, id: string) => lineupLoader.getLineup(id))
    // 阵容选中状态持久化
    ipcMain.handle(IpcChannel.LINEUP_GET_SELECTED_IDS, async () => settingsStore.get('selectedLineupIds'))
    ipcMain.handle(IpcChannel.LINEUP_SET_SELECTED_IDS, async (_event, ids: string[]) => {
        settingsStore.set('selectedLineupIds', ids)
    })
    
    // 棋子数据相关：从 TFT_16_CHAMPION_DATA 动态生成中英文映射表
    ipcMain.handle(IpcChannel.TFT_GET_CHAMPION_CN_TO_EN_MAP, async () => {
        // 遍历 TFT_16_CHAMPION_DATA，生成 { 中文名: 英文ID } 的映射
        const cnToEnMap: Record<string, string> = {};
        for (const [cnName, unitData] of Object.entries(TFT_16_CHAMPION_DATA)) {
            cnToEnMap[cnName] = unitData.englishId;
        }
        return cnToEnMap;
    })

    // TFT 游戏模式相关
    ipcMain.handle(IpcChannel.TFT_GET_MODE, async () => settingsStore.get('tftMode'))
    ipcMain.handle(IpcChannel.TFT_SET_MODE, async (_event, mode: string) => {
        settingsStore.set('tftMode', mode as any)
    })

    // 日志模式相关
    ipcMain.handle(IpcChannel.LOG_GET_MODE, async () => settingsStore.get('logMode'))
    ipcMain.handle(IpcChannel.LOG_SET_MODE, async (_event, mode: string) => {
        settingsStore.set('logMode', mode as any)
        // 同步更新 Logger 的最低日志级别
        logger.setMinLevel(mode === 'DETAILED' ? 'debug' : 'info')
    })
    
    // 日志自动清理阈值
    ipcMain.handle(IpcChannel.LOG_GET_AUTO_CLEAN_THRESHOLD, async () => settingsStore.get('logAutoCleanThreshold'))
    ipcMain.handle(IpcChannel.LOG_SET_AUTO_CLEAN_THRESHOLD, async (_event, threshold: number) => {
        settingsStore.set('logAutoCleanThreshold', threshold as any)
    })
    
    // 游戏进程操作
    ipcMain.handle(IpcChannel.LCU_KILL_GAME_PROCESS, async () => {
        const lcu = LCUManager.getInstance();
        return lcu?.killGameProcess() ?? false;
    })
    
    // 快捷键设置
    ipcMain.handle(IpcChannel.HOTKEY_GET_TOGGLE, async () => {
        return settingsStore.get('toggleHotkeyAccelerator');
    })
    ipcMain.handle(IpcChannel.HOTKEY_SET_TOGGLE, async (_event, accelerator: string) => {
        // 尝试注册新快捷键
        const success = registerToggleHotkey(accelerator);
        if (success) {
            // 注册成功才保存到设置
            settingsStore.set('toggleHotkeyAccelerator', accelerator);
        }
        return success;
    })
    
    // "本局结束后停止"快捷键设置
    ipcMain.handle(IpcChannel.HOTKEY_GET_STOP_AFTER_GAME, async () => {
        return settingsStore.get('stopAfterGameHotkeyAccelerator');
    })
    ipcMain.handle(IpcChannel.HOTKEY_SET_STOP_AFTER_GAME, async (_event, accelerator: string) => {
        const success = registerStopAfterGameHotkey(accelerator);
        if (success) {
            settingsStore.set('stopAfterGameHotkeyAccelerator', accelerator);
        }
        return success;
    })
    
    // "本局结束后停止"状态查询/切换
    ipcMain.handle(IpcChannel.HEX_GET_STOP_AFTER_GAME, async () => {
        return hexService.stopAfterCurrentGame;
    })
    ipcMain.handle(IpcChannel.HEX_TOGGLE_STOP_AFTER_GAME, async () => {
        const newState = hexService.toggleStopAfterCurrentGame();
        // 通知渲染进程更新 UI 状态
        win?.webContents.send(IpcChannel.HEX_STOP_AFTER_GAME_TRIGGERED, newState);
        return newState;
    })
    
    // 通用设置读写（支持点号路径，如 'window.bounds'）
    ipcMain.handle(IpcChannel.SETTINGS_GET, async (_event, key: string) => {
        return settingsStore.get(key as any);
    })
    ipcMain.handle(IpcChannel.SETTINGS_SET, async (_event, key: string, value: any) => {
        settingsStore.set(key as any, value);
    })
    
    // 系统工具：检测管理员权限
    // 原理：执行 `net session` 命令，该命令只有在管理员权限下才能成功执行
    ipcMain.handle(IpcChannel.UTIL_IS_ELEVATED, async () => {
        return new Promise<boolean>((resolve) => {
            exec('net session', (error) => {
                // 没有错误 = 有管理员权限
                resolve(!error);
            });
        });
    })
    
    // 版本与更新
    // 获取当前应用版本（从 package.json 读取）
    ipcMain.handle(IpcChannel.APP_GET_VERSION, async () => {
        return app.getVersion();
    })
    
    // 检查更新：调用 GitHub API 获取最新 release
    // 使用 Electron 的 net 模块，它会自动使用系统代理设置
    ipcMain.handle(IpcChannel.APP_CHECK_UPDATE, async () => {
        try {
            // net.fetch 是 Electron 提供的 fetch，会自动读取系统代理配置
            const response = await net.fetch(
                'https://api.github.com/repos/WJZ-P/TFT-Hextech-Helper/releases/latest',
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'User-Agent': 'TFT-Hextech-Helper'
                    }
                }
            );
            
            if (!response.ok) {
                return { error: `GitHub API 请求失败: ${response.status}` };
            }
            
            const data = await response.json();
            const latestVersion = data.tag_name?.replace(/^v/, '') || '';  // 去掉版本号前的 'v'
            const currentVersion = app.getVersion();
            
            return {
                currentVersion,
                latestVersion,
                hasUpdate: latestVersion && latestVersion !== currentVersion,
                releaseUrl: data.html_url,
                releaseNotes: data.body || '',
                publishedAt: data.published_at
            };
        } catch (error: any) {
            return { error: error.message || '检查更新失败' };
        }
    })
}