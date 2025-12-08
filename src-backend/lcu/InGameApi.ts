/**
 * 游戏内 API 客户端
 * @module InGameApi
 * @description 用于访问 LOL 游戏内实时数据接口
 *
 * 注意事项：
 * - 端口固定为 2999，这是 Riot 官方的游戏内 API 端口
 * - 仅在游戏进行中可用，游戏未启动时请求会失败
 * - 使用自签名证书，需要禁用 SSL 验证
 */

import https from "https";
import axios, { AxiosInstance } from "axios";

/** 游戏内 API 端口 (Riot 官方固定端口) */
const IN_GAME_API_PORT = 2999;

/** 请求超时时间 (ms)，设置较短以便快速轮询 */
const REQUEST_TIMEOUT_MS = 1000;

/**
 * 游戏内 API Axios 实例
 * @description 预配置的 axios 实例，用于访问 LOL 游戏内实时数据
 *
 * @example
 * ```typescript
 * // 获取所有游戏数据
 * const gameData = await inGameApi.get('/liveclientdata/allgamedata');
 *
 * // 获取当前玩家信息
 * const player = await inGameApi.get('/liveclientdata/activeplayer');
 * ```
 */
export const inGameApi: AxiosInstance = axios.create({
    baseURL: `https://127.0.0.1:${IN_GAME_API_PORT}`,
    httpsAgent: new https.Agent({
        rejectUnauthorized: false, // 游戏使用自签名证书
    }),
    timeout: REQUEST_TIMEOUT_MS,
    proxy: false, // 禁用代理，避免连接问题
});

/**
 * 常用的游戏内 API 端点
 */
export const InGameApiEndpoints = {
    /** 获取所有游戏数据 */
    ALL_GAME_DATA: "/liveclientdata/allgamedata",
    /** 获取当前玩家信息 */
    ACTIVE_PLAYER: "/liveclientdata/activeplayer",
    /** 获取所有玩家列表 */
    PLAYER_LIST: "/liveclientdata/playerlist",
    /** 获取游戏事件 */
    EVENT_DATA: "/liveclientdata/eventdata",
    /** 获取游戏统计数据 */
    GAME_STATS: "/liveclientdata/gamestats",
} as const;
