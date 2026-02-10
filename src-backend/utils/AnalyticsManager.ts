/**
 * Google Analytics 数据统计管理器
 * @module AnalyticsManager
 * @description 使用 GA4 Measurement Protocol (HTTP API) 发送事件到 Google Analytics
 *              无需浏览器 JS SDK，适合 Electron 主进程使用
 * 
 * GA4 Measurement Protocol 文档:
 * https://developers.google.com/analytics/devguides/collection/protocol/ga4
 * 
 * 工作原理:
 * 1. 通过 HTTP POST 请求将事件发送到 GA 服务器
 * 2. 使用 measurement_id + api_secret 进行鉴权
 * 3. 每个设备用一个随机生成的 client_id 来区分（存储在 SettingsStore 中）
 * 4. 使用 Electron 的 net.fetch 发送请求（自动走系统代理）
 */

import { net, app } from 'electron';
import { settingsStore } from './SettingsStore';

// ============================================================================
// GA4 配置常量
// ============================================================================

/** GA4 衡量 ID (Measurement ID) */
const GA_MEASUREMENT_ID = 'G-NBEKXB38M4';

/** GA4 Measurement Protocol API Secret */
const GA_API_SECRET = 'OIxU8BZSTYKfCOo9YNLzqg';

/** GA4 Measurement Protocol 的请求端点 */
const GA_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;

/**
 * GA4 Measurement Protocol 的调试端点
 * 调试端点不会真正记录数据，但会返回验证结果，方便排查问题
 */
const GA_DEBUG_ENDPOINT = `https://www.google-analytics.com/debug/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`;

// ============================================================================
// 预定义事件名称（统一管理，避免硬编码字符串散落在代码中）
// ============================================================================

/**
 * 所有可上报的事件名称枚举
 * @description GA4 自定义事件名称规则：
 *   - 最多 40 个字符
 *   - 只能包含字母、数字和下划线
 *   - 必须以字母开头
 */
export enum AnalyticsEvent {
    /** 应用启动 */
    APP_START = 'app_start',
    /** 开始挂机 */
    HEX_START = 'hex_start',
    /** 停止挂机 */
    HEX_STOP = 'hex_stop',
    /** 一局游戏完成 */
    GAME_COMPLETED = 'game_completed',
    /** 切换游戏模式（匹配/排位） */
    MODE_CHANGED = 'mode_changed',
    /** 选择阵容 */
    LINEUP_SELECTED = 'lineup_selected',
}

// ============================================================================
// AnalyticsManager 类
// ============================================================================

/**
 * Google Analytics 管理器（单例）
 * @description 封装 GA4 Measurement Protocol 的所有操作
 *              所有发送操作都是异步且不阻塞主流程的（fire-and-forget）
 */
class AnalyticsManager {
    private static instance: AnalyticsManager;

    /** 当前设备的唯一标识（持久化到 SettingsStore） */
    private clientId: string = '';

    /** 是否已完成初始化 */
    private initialized: boolean = false;

    /** 是否启用调试模式（发送到调试端点，不记录真实数据） */
    private debugMode: boolean = false;

    private constructor() {}

    /**
     * 获取 AnalyticsManager 单例
     */
    public static getInstance(): AnalyticsManager {
        if (!AnalyticsManager.instance) {
            AnalyticsManager.instance = new AnalyticsManager();
        }
        return AnalyticsManager.instance;
    }

    /**
     * 初始化分析管理器
     * @param debug 是否启用调试模式（默认 false）
     * 
     * @description 必须在 app.whenReady() 之后调用，因为需要：
     *   1. 读取 SettingsStore 获取/生成 client_id
     *   2. 使用 app.getVersion() 获取应用版本
     */
    public init(debug: boolean = false): void {
        if (this.initialized) {
            console.log('📊 [Analytics] 已经初始化过了，跳过');
            return;
        }

        this.debugMode = debug;

        // 获取或生成 client_id
        // client_id 用于区分不同的设备/用户，但不包含任何个人隐私信息
        let clientId = settingsStore.get('analyticsClientId');
        if (!clientId) {
            // 首次启动，生成一个随机的 UUID 作为 client_id
            clientId = this.generateUUID();
            settingsStore.set('analyticsClientId', clientId);
            console.log('📊 [Analytics] 生成新的 client_id:', clientId);
        }
        this.clientId = clientId;

        this.initialized = true;
        console.log(`📊 [Analytics] 初始化完成 (debug=${debug}, clientId=${this.clientId})`);

        // 上报应用启动事件
        console.log('📊 [Analytics] 正在发送 app_start 事件...');
        this.trackEvent(AnalyticsEvent.APP_START, {
            app_version: app.getVersion(),
        });
    }

    /**
     * 上报自定义事件
     * @param eventName 事件名称（推荐使用 AnalyticsEvent 枚举）
     * @param params 事件参数（可选，键值对形式）
     * 
     * @description
     * 这是一个 fire-and-forget 方法：
     * - 不会阻塞调用方
     * - 发送失败只会打印警告日志，不会抛出异常
     * - 适合在业务逻辑中随意插入，不影响主流程
     * 
     * @example
     * // 上报简单事件
     * analyticsManager.trackEvent(AnalyticsEvent.HEX_START);
     * 
     * // 上报带参数的事件
     * analyticsManager.trackEvent(AnalyticsEvent.GAME_COMPLETED, {
     *     session_games: 5,
     *     total_games: 100,
     *     tft_mode: 'NORMAL'
     * });
     */
    public trackEvent(eventName: string, params: Record<string, string | number> = {}): void {
        if (!this.initialized) {
            console.warn('📊 [Analytics] 尚未初始化，跳过事件:', eventName);
            return;
        }

        // 构造 GA4 Measurement Protocol 的请求体
        // 参考: https://developers.google.com/analytics/devguides/collection/protocol/ga4/reference
        const payload = {
            // client_id: 必须字段，用于标识用户/设备
            client_id: this.clientId,
            // events: 事件数组，每次请求可以发送多个事件（这里只发一个）
            events: [
                {
                    name: eventName,
                    params: {
                        // 把自定义参数展开到 params 里
                        ...params,
                        // engagement_time_msec: GA4 要求的参数，
                        // 表示用户参与时长（毫秒），至少 1ms 才会被 GA 统计
                        engagement_time_msec: '100',
                        // session_id: 用当前时间戳作为简易的 session 标识
                        // （GA4 自动 session 在 MP 中不可用，需要手动提供）
                        session_id: this.getSessionId(),
                    },
                },
            ],
        };

        // 异步发送，不等待结果（fire-and-forget）
        this.sendToGA(payload).catch((error) => {
            console.warn('📊 [Analytics] 发送事件失败:', eventName, error.message);
        });
    }

    // ========================================================================
    // 私有方法
    // ========================================================================

    /**
     * 发送数据到 GA4 Measurement Protocol 端点
     * @param payload 请求体（JSON 格式）
     * 
     * @description 使用 Electron 的 net.fetch 发送请求
     *              net.fetch 的优势：会自动使用系统代理设置
     */
    private async sendToGA(payload: object): Promise<void> {
        const endpoint = this.debugMode ? GA_DEBUG_ENDPOINT : GA_ENDPOINT;

        // 调试模式下打印请求详情，方便排查
        if (this.debugMode) {
            const events = (payload as any).events;
            const eventNames = events?.map((e: any) => e.name).join(', ') ?? '未知';
            console.log(`📊 [Analytics] 正在发送到: ${this.debugMode ? '调试端点' : '正式端点'}`);
            console.log(`📊 [Analytics] 事件: ${eventNames}`);
        }

        try {
            const response = await net.fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            console.log(`📊 [Analytics] 请求完成, HTTP 状态码: ${response.status}`);

            if (this.debugMode) {
                // 调试模式下，打印 GA 返回的验证结果
                const debugResult = await response.json();
                console.log('📊 [Analytics] 调试响应:', JSON.stringify(debugResult, null, 2));
            }

            // GA4 Measurement Protocol 成功时返回 204 No Content
            if (!response.ok && response.status !== 204) {
                console.warn(`📊 [Analytics] 请求返回非成功状态: ${response.status}`);
            }
        } catch (error: any) {
            // 网络错误等，只警告不抛出（不影响主流程）
            console.warn('📊 [Analytics] 网络请求失败:', error);
        }
    }

    /**
     * 生成一个随机 UUID (v4 格式)
     * @returns 形如 "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx" 的字符串
     * 
     * @description 用于生成 client_id，不依赖外部库
     *              使用 crypto.randomUUID() 如果可用，否则手动生成
     */
    private generateUUID(): string {
        // Node.js 14.17+ 和 Electron 都支持 crypto.randomUUID()
        try {
            return require('crypto').randomUUID();
        } catch {
            // 降级方案：手动生成 UUID v4
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                const r = (Math.random() * 16) | 0;
                const v = c === 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            });
        }
    }

    /**
     * 获取当前会话 ID
     * @returns 基于应用启动时间的会话标识字符串
     * 
     * @description GA4 的 Measurement Protocol 不支持自动 session 管理
     *              我们用一个简单的时间戳作为 session_id
     *              同一次应用生命周期内的所有事件共享同一个 session_id
     */
    private sessionId: string | null = null;
    private getSessionId(): string {
        if (!this.sessionId) {
            // 用当前时间戳（秒级）作为 session_id
            this.sessionId = Math.floor(Date.now() / 1000).toString();
        }
        return this.sessionId;
    }
}

/** 导出 AnalyticsManager 单例 */
export const analyticsManager = AnalyticsManager.getInstance();
