//  这个文件里定义了需要用到的协议

import {LCUProcessInfo} from "./LcuConnector";

export interface IpcChannels {
    'lcu-connect':(data:LCUProcessInfo)=>void;  //  LOL客户端连接
    'lcu-disconnect': ()=>void;                 //  LOL客户端断开连接
}