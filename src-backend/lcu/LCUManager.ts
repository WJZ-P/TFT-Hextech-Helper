import {EventEmitter} from 'events';
import WebSocket from 'ws';
import https from 'https';
import {LCUProcessInfo} from "./utils/LcuConnector";
import axios, {AxiosInstance} from "axios";
import {LobbyConfig, MatchState, Queue, SummonerInfo} from "./utils/LCUProtocols.ts";
import {logger} from "../utils/Logger.ts";

// 定义 LCUManager 能广播的所有事件

type LcuEventUriEvents = {
    [K in LcuEventUri]: (event: LCUWebSocketMessage) => void;
};

interface LCUManagerEvents extends LcuEventUriEvents {
    'connect': () => void;
    'disconnect': () => void;
    'lcu-event': (data: LCUWebSocketMessage) => void;
}


export enum LcuEventUri {
    /** 匹配准备就绪（接受/拒绝） */
    READY_CHECK = '/lol-matchmaking/v1/ready-check',
    /** 游戏流程阶段 (排队中, 游戏中, 游戏后等) */
    GAMEFLOW_PHASE = '/lol-gameflow/v1/session',
    /** 英雄选择阶段 */
    CHAMP_SELECT = '/lol-champ-select/v1/session',
}

// 定义 LCU WebSocket 消息的基本结构
export interface LCUWebSocketMessage {
    uri: string;
    eventType: 'Create' | 'Update' | 'Delete';
    data: any;
}


/**
 * LCUManager - 一个单例的、类型安全的英雄联盟客户端连接器
 * 负责管理 REST API 和 WebSocket 连接
 */
class LCUManager extends EventEmitter {
    private readonly port: number;
    private readonly token: string;
    private readonly httpsAgent: https.Agent;
    private readonly api: AxiosInstance; // 我们将拥有一个专属的 axios 实例
    private ws: WebSocket | null = null;
    public isConnected: boolean = false;

    // --- 单例模式核心 ---
    private static instance: LCUManager | null = null;

    public static init(details: LCUProcessInfo): LCUManager {
        if (!LCUManager.instance) {
            LCUManager.instance = new LCUManager(details);
        }
        return LCUManager.instance;
    }

    public static getInstance(): LCUManager | null {
        if (!LCUManager.instance) {
            console.error("[LCUManager] 尚未初始化，无法获取实例。")
            return null
        }
        return LCUManager.instance
    }

    /**
     * 全新的启动方法，它会先确认 REST API 就绪，再连接 WebSocket
     */
    public async start(): Promise<void> {
        console.log('🚀 [LCUManager] 开始启动，正在确认 API 服务状态...');
        try {
            await this.confirmApiReady();
            this.connectWebSocket();
        } catch (e) {
            console.error("❌ [LCUManager] 启动过程中发生错误:", e);
        }
    }

    // 构造函数是私有的，这确保了外部不能用 new 来创建实例
    private constructor(details: LCUProcessInfo) {
        super();
        this.port = details.port;
        this.token = details.token;

        this.httpsAgent = new https.Agent({
            rejectUnauthorized: false, // LCU 使用的是自签名证书，我们必须忽略它
        })
        // 创建一个配置好的 axios 实例
        this.api = axios.create({
            baseURL: `https://127.0.0.1:${this.port}`,
            httpsAgent: this.httpsAgent, // 把我们的"通行证"交给 axios
            proxy: false,   // ← 关键：禁止任何系统/环境变量代理!!!这里debug找了一万年才发现是这个问题。
            auth: {
                username: 'riot',
                password: this.token
            },
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        console.log(`🔌 [LCUManager] 准备就绪，目标端口: ${this.port}`);
    }

    // 声明 on/emit 的类型，提供完美的智能提示
    public declare on: <E extends keyof LCUManagerEvents | LcuEventUri>(event: E, listener: LCUManagerEvents[E]) => this;
    public declare emit: <E extends keyof LCUManagerEvents | LcuEventUri>(event: E, ...args: Parameters<LCUManagerEvents[E]>) => boolean;

    /**
     * 连接到 LCU WebSocket
     */
    private connectWebSocket(): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

        const wsUrl = `wss://127.0.0.1:${this.port}`;
        this.ws = new WebSocket(wsUrl, {
            headers: {Authorization: 'Basic ' + Buffer.from(`riot:${this.token}`).toString('base64')},
            agent: this.httpsAgent,
        });

        this.ws.on('open', () => {
            this.isConnected = true;
            console.log('✅ [LCUManager] WebSocket 连接成功！');
            this.emit('connect'); // 只有在此时，才广播"真正连接成功"的事件
            //  "OnJsonApiEvent" 是一个"总事件"，它会把 LCU 上所有的 API 事件（创建、更新、删除）都通过这一个通道推送给你。
            this.subscribe('OnJsonApiEvent');
        });

        this.ws.on('message', (data) => {
            const messageString = data.toString();
            if (!messageString) return;
            try {
                const message = JSON.parse(messageString);
                // 8 是服务器推送事件的操作码
                if (message[0] === 8 && message[1] === 'OnJsonApiEvent' && message[2]) {
                    const eventData = message[2] as LCUWebSocketMessage
                    const eventUri: LcuEventUri = eventData.uri as LcuEventUri
                    this.emit('lcu-event', eventData);
                    //  上面的lcu-event作为一个超级大事件对外发送，再发送一点细分的事件
                    if (Object.values(LcuEventUri).includes(eventUri)) {
                        //  命中了我们的事件，也发送一份
                        this.emit(eventUri, eventData);
                    }
                }
            } catch (e) {
                console.error('❌ [LCUManager] 解析 WebSocket 消息失败:', e);
            }
        });

        this.ws.on('close', () => {
            if (this.isConnected) {
                console.log('❌ [LCUManager] WebSocket 连接已断开。');
                this.isConnected = false;
                this.emit('disconnect');
                this.unsubscribe('OnJsonApiEvent');
                LCUManager.instance = null;
            }
        });

        this.ws.on('error', (err) => {
            console.error('❌ [LCUManager] WebSocket 发生错误:', err);
        });
    }

    /**
     * 发送一个 REST API 请求到 LCU
     * @param method 'GET', 'POST', 'PUT', 'DELETE', etc.
     * @param endpoint API 端点, e.g., '/lol-summoner/v1/current-summoner'
     * @param body 请求体 (可选)
     */
    public async request(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', endpoint: string, body?: object): Promise<any> {
        try {
            // 在这里打印出完整的请求 URL
            const fullUrl = `${this.api.defaults.baseURL}${endpoint}`;
            console.log(`➡️  [LCUManager] 准备发起请求: ${method} ${fullUrl}`);

            const response = await this.api.request({
                method: method,
                url: fullUrl, // axios 会自动拼接 baseURL
                data: body
            });
            return response.data; // axios 会自动处理 JSON 解析，结果在 response.data 里
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error(`❌ [LCUManager] Axios 请求失败: ${error.message}`);
                throw new Error(`LCU 请求失败:endpoint:${endpoint} state: ${error.response?.status} - ${error.response?.statusText}`);
            } else {
                console.error(`❌ [LCUManager] 未知请求错误:`, error);
                throw error;
            }
        }
    }

    /**
     * 订阅一个 WebSocket 事件
     * @param event 事件名, e.g., 'OnJsonApiEvent'
     */
    private subscribe(event: string): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify([5, event])); // 5 是 LCU 的订阅操作码
        }
    }


    /**
     * 取消订阅一个 WebSocket 事件
     * @param event 事件名
     */
    public unsubscribe(event: string): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify([6, event])); // 6 是 LCU 的取消订阅操作码
        }
    }

    /**
     * 关闭所有连接
     */
    public close(): void {
        if (this.ws) {
            this.ws.close();
        }
    }

    /**
     * 确认 LCU API 服务就绪
     * @description 轮询检测 API 是否可用，带超时机制防止无限等待
     * @param timeoutMs 超时时间 (ms)，默认 30 秒
     * @throws 超时后抛出错误
     */
    private async confirmApiReady(timeoutMs: number = 30000): Promise<void> {
        const startTime = Date.now();
        const retryIntervalMs = 2000;

        while (true) {
            // 检查是否超时
            if (Date.now() - startTime > timeoutMs) {
                throw new Error(
                    `[LCUManager] API 服务在 ${timeoutMs / 1000} 秒内未就绪，请检查客户端状态`
                );
            }

            try {
                // 使用 /riotclient/ux-state 作为健康检查端点
                await this.request("GET", "/riotclient/ux-state");
                console.log("✅ [LCUManager] API 服务已就绪！");
                return;
            } catch (error) {
                const elapsed = Math.round((Date.now() - startTime) / 1000);
                console.log(`⏳ [LCUManager] API 服务尚未就绪 (已等待 ${elapsed}s)，${retryIntervalMs / 1000}s 后重试...`);
                await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
            }
        }
    }

    //  一堆专注于后端使用的方法

    public getSummonerInfo(): Promise<SummonerInfo> {
        return this.request('GET', '/lol-summoner/v1/current-summoner');
    }

    public createCustomLobby(config: LobbyConfig): Promise<any> {
        logger.info('📬 [LCUManager] 正在创建自定义房间...');
        return this.request('POST', '/lol-lobby/v2/lobby', config);
    }

    public createLobbyByQueueId(queueId: Queue): Promise<any> {
        logger.info(`📬 [LCUManager] 正在创建房间 (队列ID: ${queueId})...`);
        return this.request('POST', '/lol-lobby/v2/lobby', {queueId: queueId});
    }

    public getCurrentGamemodeInfo(): Promise<any> {
        return this.request('GET', '/lol-lobby/v1/parties/gamemode');
    }

    public startMatch(): Promise<any> {
        logger.info('📬 [LCUManager] 正在开始匹配...');
        return this.request('POST', '/lol-lobby/v2/lobby/matchmaking/search');
    }

    public stopMatch(): Promise<any> {
        logger.info('📬 [LCUManager] 正在停止匹配...');
        return this.request('DELETE', '/lol-lobby/v2/lobby/matchmaking/search');
    }

    public async checkMatchState(): Promise<MatchState> {
        const result: {
            errors: [],
            lowPriorityData: {
                "bustedLeaverAccessToken": "",
                "penalizedSummonerIds": [],
                "penaltyTime": 0,
                "penaltyTimeRemaining": 0,
                "reason": ""
            },
            "searchState": MatchState
        } = await this.request('GET', '/lol-lobby/v2/lobby/matchmaking/search-state')

        return result.searchState
    }

    public getCustomGames(): Promise<any> {
        return this.request('GET', '/lol-lobby/v1/custom-games');
    }

    public getQueues(): Promise<any> {
        return this.request('GET', '/lol-game-queues/v1/queues');
    }

    public getChatConfig(): Promise<any> {
        return this.request('GET', '/lol-game-queues/v1/queues');
    }

    public getChampSelectSession(): Promise<any> {
        return this.request('GET', '/lol-champ-select/v1/session');
    }

    public getChatConversations(): Promise<any> {
        return this.request('GET', '/lol-chat/v1/conversations');
    }

    public getGameflowSession(): Promise<any> {
        return this.request('GET', '/lol-gameflow/v1/session');
    }

    public getExtraGameClientArgs(): Promise<any> {
        return this.request('GET', '/lol-gameflow/v1/extra-game-client-args');
    }

    public getLobby(): Promise<any> {
        return this.request('GET', '/lol-lobby/v2/lobby');
    }

    //  接受对局
    public acceptMatch(): Promise<any> {
        return this.request("POST", '/lol-matchmaking/v1/ready-check/accept');
    }

    //  拒绝对局
    public declineMatch(): Promise<any> {
        return this.request("POST", '/lol-matchmaking/v1/ready-check/decline');
    }
}

export default LCUManager;