//  这个文件里定义了需要用到的协议

import {LCUProcessInfo} from "./LcuConnector";

export interface IpcChannels {
    'lcu-connect': LCUProcessInfo;  //  LOL客户端连接
    'lcu-disconnect': null;         //  LOL客户端断开连接
}

//  创建超级参数提取器
export type ArgsFromIpcChannel<V>= V extends (...args:unknown[]) => unknown ? Parameters<V> : [V];