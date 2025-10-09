import {app, BrowserWindow, globalShortcut, ipcMain} from 'electron'
//import { createRequire } from 'node:module'
import {fileURLToPath} from 'node:url'
import path from 'node:path'
import LCUConnector from "../src-backend/lcu/utils/LcuConnector.ts";
import {ArgsFromIpcChannel, IpcChannels} from "../src-backend/lcu/utils/Protocols.ts";
import LCUManager from "../src-backend/lcu/LCUManager.ts";
import 'source-map-support/register';
import https from "https";
import axios from "axios";
import ConfigHelper from "../src-backend/ConfigHelper.ts";

/**
 * 下面这两行代码是历史原因，新版的ESM模式下需要CJS里面的require、__dirname来提供方便
 * import.meta.url：file:///C:/Users/YourProject/electron/main.ts (一个标准的 URL 格式路径)。
 * path.dirname：把一个完整的文件路径，只剪下它所在的文件夹部分。
 * 这里的__dirname就是我们手造出来的。
 *
 * 然后require也同理，是我们手搓的，因为新版ESM不提供require。
 */
//const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

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
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, 'icon.png'),//  窗口左上角的图标
        webPreferences: {
            preload: path.join(__dirname, 'preload.mjs'),// 指定preload文件
        },
    })

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })


    //  判断是在开发环境还是打包好的程序
    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(RENDERER_DIST, 'index.html'))
        win.setMenu(null) //  release包里面不显示菜单。
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

// 喵~ 这是一个好习惯：在应用退出前，注销所有已注册的快捷键
app.on('will-quit', () => {
    globalShortcut.unregisterAll()
})

//  正式启动app
app.whenReady().then(async () => {
    createWindow()  //  创建窗口
    init()  //  执行LCU相关函数
    registerHandler()
})

function init() {

    //  启动LCUConnector
    const connector = new LCUConnector()

    connector.on('connect', (data) => {
        console.log("LOL客户端已登录！", data);

        //  发消息给renderer线程，那边收到再做处理
        sendToRenderer('lcu-connect', data)

        // 喵~ 使用单例模式获取 LCUManager 实例，并把“钥匙”交给它
        const lcu = LCUManager.init(data);

        //  注册configHelper
        ConfigHelper.init(data.installDirectory)

        // 连接 WebSocket
        lcu.start();

        lcu.on('connect', async () => {
            sendToRenderer('lcu-connect', data); // 通知前台
            try {
                const summoner = await lcu.request('GET', '/lol-summoner/v1/current-summoner');
                console.log('召唤师信息:', summoner);
            } catch (e) {
                console.error('请求召唤师信息失败:', e);
            }
        });

        lcu.on('disconnect', () => {
            console.log('LCUManager 已断开');
            sendToRenderer('lcu-disconnect'); // 通知前台
        });

        lcu.on('lcu-event', (event) => {
            // 在这里处理实时收到的游戏事件
            // console.log('收到LCU事件:', event);
            console.log('收到LCU事件:', event.uri, event.eventType);
        });
    });

    connector.on('disconnect', () => {
        console.log("LOL客户端登出！")
        sendToRenderer('lcu-disconnect')
    })

    connector.start()

}

//  包装下webContents
function sendToRenderer<E extends keyof IpcChannels>(channel: E, ...args: ArgsFromIpcChannel<IpcChannels[E]>) {
    return win?.webContents.send(channel, ...args)
}

function registerHandler() {
    ipcMain.handle('lcu-request', async (
        event, // 固定的第一个参数，包含了事件的源信息
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
            return await lcu.request(method, endpoint, body);
        } catch (e: any) {
            console.error(`❌ [IPC] 处理请求 ${method} ${endpoint} 时出错:`, e);
            // 失败后，把错误信息包装在 error 字段里返回
            return {error: e.message};
        }
    });
}