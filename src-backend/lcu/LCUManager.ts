import {EventEmitter} from 'events';
import WebSocket from 'ws';
import https from 'https';
import {LCUProcessInfo} from "./utils/LcuConnector";
import axios, {AxiosInstance} from "axios";

// 定义 LCUManager 能广播的所有事件
interface LCUManagerEvents {
    'connect': () => void;
    'disconnect': () => void;
    'lcu-event': (data: LCUWebSocketMessage) => void;
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
            httpsAgent: this.httpsAgent, // 把我们的“通行证”交给 axios
            proxy: false,   // ← 关键：禁止任何系统/环境变量代理!!!这里debug找了一万年才发现是这个问题。
            auth:{
                username: 'riot',
                password:this.token
            },
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            }
        });

        console.log(`🔌 [LCUManager] 准备就绪，目标端口: ${this.port}`);
    }

    // 声明 on/emit 的类型，提供完美的智能提示
    public declare on: <E extends keyof LCUManagerEvents>(event: E, listener: LCUManagerEvents[E]) => this;
    public declare emit: <E extends keyof LCUManagerEvents>(event: E, ...args: Parameters<LCUManagerEvents[E]>) => boolean;

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
            this.emit('connect'); // 只有在此时，才广播“真正连接成功”的事件
            this.subscribe('OnJsonApiEvent');
        });

        this.ws.on('message', (data) => {
            const messageString = data.toString();
            if (!messageString) return;
            try {
                const message = JSON.parse(messageString);
                if (message[0] === 8 && message[1] === 'OnJsonApiEvent' && message[2]) {
                    this.emit('lcu-event', message[2] as LCUWebSocketMessage);
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
    public async request<T = any>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', endpoint: string, body?: object): Promise<T> {
        try {
            // 在这里打印出完整的请求 URL
            const fullUrl = `${this.api.defaults.baseURL}${endpoint}`;
            console.log(`➡️  [LCUManager] 准备发起请求: ${method} ${fullUrl}`);

            const response = await this.api.request<T>({
                method: method,
                url: fullUrl, // axios 会自动拼接 baseURL
                data:body
            });
            return response.data; // axios 会自动处理 JSON 解析，结果在 response.data 里
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error(`❌ [LCUManager] Axios 请求失败: ${error.message}`);
                throw new Error(`LCU 请求失败: ${error.response?.status} - ${error.response?.statusText}`);
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
    public subscribe(event: string): void {
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
     * 喵~ 一个有礼貌的函数，会一直“敲门”直到后厨回应
     */
    private async confirmApiReady(): Promise<void> {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            try {
                // 像 willump 一样，使用 /riotclient/ux-state 作为“敲门”方式
                await this.request('GET', '/riotclient/ux-state');
                console.log('✅ [LCUManager] API 服务已就绪！');
                return; // API 准备好了，退出循环
            } catch (error) {
                console.log('⏳ [LCUManager] API 服务尚未就绪，1秒后重试...', error);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
}

export default LCUManager;