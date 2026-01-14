/// <reference types="vite/client" />

import {ConfigApi, HexApi, IpcApi, LcuApi, TftApi, LineupApi, UtilApi} from "../electron/preload.ts";

export {}   // 让文件变成模块，避免全局污染

//  typescript里面，一个.ts or .d.ts文件如果没有任何import和export，ts会把它视为脚本文件，可能污染全局命名空间。

declare global {
    interface Window {
        ipc:IpcApi
        lcu:LcuApi
        config:ConfigApi
        hex:HexApi
        tft:TftApi
        lineup:LineupApi      // 阵容配置 API
        util:UtilApi          // 通用工具 API
    }
}