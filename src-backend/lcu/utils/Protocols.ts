//  这个文件里定义了需要用到的协议

import {LCUProcessInfo} from "./LcuConnector";

export interface IpcChannels {
    'lcu-connect': LCUProcessInfo;  //  LOL客户端连接
    'lcu-disconnect': null;         //  LOL客户端断开连接
}

//  创建超级参数提取器
export type ArgsFromIpcChannel<V>= V extends (...args:unknown[]) => unknown ? Parameters<V> : [V];

//  这里开始写LCU-API的一些数据定义。

/**
 *  /lol-summoner/v1/current-summoner 接口返回的召唤师信息“身份档案”
 */
export interface SummonerInfo {
  accountId: number;
  displayName: string;
  gameName: string;
  internalName: string;
  nameChangeFlag: boolean;
  percentCompleteForNextLevel: number;
  privacy: 'PUBLIC' | 'PRIVATE';
  profileIconId: number;
  puuid: string;
  rerollPoints: {
    currentPoints: number;
    maxRolls: number;
    numberOfRolls: number;
    pointsCostToRoll: number;
    pointsToReroll: number;
  };
  summonerId: number;
  summonerLevel: number;
  tagLine: string;
  unnamed: boolean;
  xpSinceLastLevel: number;
  xpUntilNextLevel: number;
}