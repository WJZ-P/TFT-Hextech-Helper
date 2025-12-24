//  这个文件里定义了需要用到的协议

import {LCUProcessInfo} from "./LcuConnector";

export interface LCUIpcChannels {
    'lcu-connect': LCUProcessInfo;  //  LOL客户端连接
    'lcu-disconnect': null;         //  LOL客户端断开连接
}

//  游戏flow阶段字符串枚举，接口是LcuEventUri.GAMEFLOW_PHASE
/**
 * 游戏流程阶段枚举
 * @description LOL 客户端的游戏流程状态，通过 GAMEFLOW_PHASE 事件获取
 * 
 * | Phase           | 说明                           
 * |-----------------|-------------------------------
 * | None            | 游戏结束后返回主界面            
 * | Lobby           | 进入房间                       
 * | Matchmaking     | 排队中                         
 * | ReadyCheck      | 已找到对局，等待点击确认        
 * | ChampSelect     | 英雄选择阶段                   
 * | GameStart       | 游戏开始         
 * | InProgress      | 游戏加载中 and 游戏进行中，具体区分是否开局，要ping本地端口                  
 * | WaitingForStats | 游戏已结束，等待加载对局统计    
 * | PreEndOfGame    | 游戏统计已就绪                               
 */
export type GameFlowPhase = 
    | 'None' 
    | 'Lobby' 
    | 'Matchmaking' 
    | 'ReadyCheck' 
    | 'ChampSelect' 
    | 'GameStart' 
    | 'InProgress' 
    | 'WaitingForStats' 
    | 'PreEndOfGame'
    | 'EndOfGame';

//  创建超级参数提取器
export type ArgsFromIpcChannel<V> = V extends (...args: unknown[]) => unknown ? Parameters<V> : [V];

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

//  LOL游戏模式
export enum Queue {
    NORMAL_DRAFT = 400, // 召唤师峡谷 - 征召模式
    RANKED_SOLO_DUO = 420, // 召唤师峡谷 - 单/双排
    NORMAL_BLIND = 430, // 召唤师峡谷 - 匹配模式 (自选)
    RANKED_FLEX = 440, // 召唤师峡谷 - 灵活排位
    ARAM = 450, // 极地大乱斗
    PICKURF = 900, // 无限乱斗
    TFT_NORMAL = 1090, // 云顶之弈 - 匹配模式
    TFT_RANKED = 1100, // 云顶之弈 - 排位模式
    TFT_DOUBLE = 1160, //云顶之弈 (双人作战)
    TFT_TREASURE = 1170, //云顶之弈 (恭喜发财)
    TFT_FATIAO = 1220,  // 云顶- 发条鸟的试炼
    URF = 1900, // 无限火力
    DOU_HUN = 1700,// 斗魂竞技场
    MORIRENJI = 4210, //  末日人工智能
    MORIRENJI_HARD = 4220, //  末日人工智能 - 困难
    MORIRENJI_VERY_HARD = 4260, //  末日人工智能 - 维迦的末日诅咒！
}

// --- 自定义游戏房间相关类型 ---
export type GameMode =
    | 'CLASSIC'         // 经典模式 (召唤师峡谷)
    | 'ARAM'            // 极地大乱斗
    | 'PRACTICETOOL'    // 训练模式
    | 'URF'             // 无限火力
    | 'NEXUSBLITZ'      // 极限闪击
// ... 其他轮换模式
    ;

export type MapId =
    | 11  // 召唤师峡谷 (Summoner's Rift)
    | 12  // 嚎哭深渊 (Howling Abyss)
    | 21  // 云顶之弈 (Teamfight Tactics)
// ... 其他地图
    ;

/**
 * 定义观战策略
 */
export type SpectatorPolicy =
    | 'AllAllowed'      // 允许所有人观战
    | 'LobbyAllowed'    // 只允许房间内的人观战
    | 'NotAllowed'      // 不允许观战
    ;

// 定义自定义游戏房间的配置类型
export interface LobbyConfig {
    isCustom: boolean;   //  自定义房间，这个一定是true。
    customGameLobby: {
        lobbyName: string;
        lobbyPassword?: string;
        configuration: {
            gameMode: GameMode;
            mapId: MapId; // 地图ID，11是召唤师峡谷，12是嚎哭深渊
            mutators?: { id: number };    // 游戏内的特殊规则修改器，比如无限火力模式需要特定的 mutator id。
            spectatorPolicy: SpectatorPolicy;
            teamSize: number; //  每支队伍的最大玩家数量 (例如 5v5 就是 5)。
        };
    };
}

//  排队状态
export type MatchState = 'Invalid' | 'Searching' | 'Found'

// 创建一个 5v5 的召唤师峡谷自定义房间
export const summonersRiftConfig: LobbyConfig = {
    isCustom: true,
    customGameLobby: {
        lobbyName: "",
        configuration: {
            gameMode: "CLASSIC",
            mapId: 11, // 召唤师峡谷
            spectatorPolicy: "AllAllowed",
            teamSize: 5,
        },
    },
};
// lcu.createCustomLobby(summonersRiftConfig);

// 创建一个“训练模式”房间
export const practiceToolConfig: LobbyConfig = {
    isCustom: true,
    customGameLobby: {
        lobbyName: "单人训练",
        configuration: {
            gameMode: "PRACTICETOOL", // 关键！模式设置为训练工具
            mapId: 11, // 召唤师峡谷
            spectatorPolicy: "NotAllowed",
            teamSize: 1, // 训练模式通常只有1个玩家
        },
    },
};