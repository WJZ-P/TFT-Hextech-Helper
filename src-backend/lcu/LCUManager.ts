import { EventEmitter } from 'events';
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
  // --- 单例模式核心 ---
  private static instance: LCUManager | null = null;

  public static init(details: LCUProcessInfo): LCUManager {
    if (!LCUManager.instance) {
      LCUManager.instance = new LCUManager(details);
    }
    return LCUManager.instance;
  }
  public static getInstance():LCUManager | null{
    if (!LCUManager.instance) {
      console.error("[LCUManager] 尚未初始化，无法获取实例。")
      return
    }
    return LCUManager.instance
  }
  // --------------------

  private readonly port: number;
  private readonly token: string;
  private readonly authHeader: string;
  private readonly httpsAgent: https.Agent;
  private readonly api: AxiosInstance; // 我们将拥有一个专属的 axios 实例


  private ws: WebSocket | null = null;
  public isConnected: boolean = false;

  // 构造函数是私有的，这确保了外部不能用 new 来创建实例
  private constructor(details: LCUProcessInfo) {
    super();
    this.port = details.port;
    this.token = details.token;

    // 准备用于 fetch 的认证头和 HTTPS Agent
    this.authHeader = 'Basic ' + Buffer.from(`riot:${this.token}`).toString('base64');
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: false, // LCU 使用的是自签名证书，我们必须忽略它
    })

    // 喵~ 3. 关键改动！创建一个配置好的 axios 实例
    this.api = axios.create({
      baseURL: `https://127.0.0.1:${this.port}`,
      httpsAgent: this.httpsAgent, // 把我们的“通行证”交给 axios
      auth: { // axios 自带了更方便的 Basic Auth 写法
        username: 'riot',
        password: this.token,
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
  public connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('⚠️ [LCUManager] WebSocket 已经连接，无需重复操作。');
      return;
    }

    const wsUrl = `wss://127.0.0.1:${this.port}`;
    this.ws = new WebSocket(wsUrl, {
      headers: { Authorization: this.authHeader },
      agent: this.httpsAgent,
    });

    this.ws.on('open', () => {
      this.isConnected = true;
      console.log('✅ [LCUManager] WebSocket 连接成功！');
      this.emit('connect');
      // 订阅所有 JSON API 事件
      this.subscribe('OnJsonApiEvent');
    });

    this.ws.on('message', (data) => {
      const messageString = data.toString();
      // 喵~ 关键修正！在解析之前，先检查消息是不是空的！
      if (!messageString) {
        // 如果是空的，就当是心跳或确认消息，直接忽略
        return;
      }

      try {
        const message = JSON.parse(messageString);
        // LCU 的事件格式是 [8, "OnJsonApiEvent", EventData] (注意，事件推送的操作码是 8)
        if (message[0] === 8 && message[1] === 'OnJsonApiEvent' && message[2]) {
          this.emit('lcu-event', message[2] as LCUWebSocketMessage);
        }
      } catch (e) {
        console.error('❌ [LCUManager] 解析 WebSocket 消息失败:', e);
        console.log('收到的原始消息:', messageString);
      }
    });

    this.ws.on('close', () => {
      if (this.isConnected) {
        console.log('❌ [LCUManager] WebSocket 连接已断开。');
        this.isConnected = false;
        this.emit('disconnect');
        LCUManager.instance = null; // 清理单例，以便下次可以重新创建
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
      // 喵~ 4. 使用我们配置好的 axios 实例来发请求！
      const response = await this.api.request<T>({
        method: method,
        url: endpoint, // axios 会自动拼接 baseURL
        data: body, // axios 用 data 字段来表示请求体
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
}

export default LCUManager;