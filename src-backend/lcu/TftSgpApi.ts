/**
 * @file 云顶之弈 SGP 接口
 * @description 虚幻引擎版云顶客户端（TFTTencentClient）不走 LCU 的 /lol-lobby 流程，
 *              选队列、排队、接受对局都是客户端直接请求 Riot 的 SGP 后端（league edge）。
 *              这里调用同样的接口来驱动排队：
 *                1. PUT  /parties-ledge/v1/parties/{partyId}/gamemode                    选择队列
 *                2. POST /parties-ledge/v1/parties/{partyId}/members/{puuid}/startAction  开始排队
 *                3. POST /team-builder-ledge/v3/indicateAfkReadiness                     接受对局
 *              取消排队：POST /parties-ledge/v1/parties/{partyId}/members/{puuid}/stopAction
 *              是否有进行中的对局：GET /gsm/v1/ledge/region/{platformId}/puuid/{puuid}（200 有，404 没有），
 *              客户端启动时也是用这个接口决定要不要走重连流程。
 *
 *              鉴权用 Bearer <league-session-token>，从 LCU 获取。这个 token 是 10 分钟有效的 JWT，
 *              LCU 会自己续期，所以每次请求前都重新取一次，不做缓存。
 *              SGP 域名按大区不同，从 LCU 的客户端配置里读取。
 *
 *              日志里只记录接口名和状态码，不记录 token、puuid、partyId。
 */

import axios, { AxiosInstance, Method } from "axios";
import LCUManager from "./LCUManager.ts";
import { Queue } from "./utils/LCUProtocols.ts";

/** LCU：SGP 域名配置项（如 https://hn1-k8s-sgp.lol.qq.com:21019） */
const LEAGUE_EDGE_URL_ENDPOINT = '/lol-client-config/v3/client-config/lol.client_settings.league_edge.url';

/** LCU：SGP 鉴权用的 session token */
const SESSION_TOKEN_ENDPOINT = '/lol-league-session/v1/league-session-token';

/** SGP 请求超时 (ms) */
const REQUEST_TIMEOUT_MS = 10000;

/** 接受对局的请求体（和客户端自己发的一致，云顶没有选英雄和召唤师技能，全部留空） */
const AFK_READY_BODY = {
    additionalInventoryJWT: '',
    afkReady: true,
    initialSpellIds: [],
    lastSelectedSkinIdByChampionId: {},
    simplifiedInventoryJWT: '',
};

/** SGP 请求失败（非 2xx 或网络错误） */
export class SgpRequestError extends Error {
    constructor(
        /** 接口名，用于日志 */
        public readonly api: string,
        /** HTTP 状态码，网络错误时为 undefined */
        public readonly status: number | undefined,
        detail: string,
    ) {
        super(`SGP 接口 ${api} 请求失败 (${status ?? '无响应'})${detail ? `: ${detail}` : ''}`);
        this.name = 'SgpRequestError';
    }
}

/** 玩家的云顶小队（每个玩家常驻一个 partyProduct 为 tft 的小队） */
export interface TftParty {
    partyId: string;
    /** 大区标识，如 HN1 */
    platformId: string;
}

/** 一次请求需要的上下文 */
interface SgpContext {
    baseUrl: string;
    puuid: string;
    token: string;
}

class TftSgpApi {
    private static instance: TftSgpApi | null = null;

    private readonly http: AxiosInstance;

    /** SGP 域名和 puuid 不会变，按 LCU 实例缓存（客户端重连后 LCU 实例会重建，缓存随之失效） */
    private cache: { lcu: LCUManager; baseUrl: string; puuid: string } | null = null;

    private constructor() {
        this.http = axios.create({
            timeout: REQUEST_TIMEOUT_MS,
            proxy: false,   // 和 LCUManager 一样，不走系统代理
            validateStatus: () => true,  // 状态码由调用方判断（比如 gsm 的 404 是正常结果）
            headers: { Accept: 'application/json' },
        });
    }

    public static getInstance(): TftSgpApi {
        if (!TftSgpApi.instance) {
            TftSgpApi.instance = new TftSgpApi();
        }
        return TftSgpApi.instance;
    }

    /**
     * 获取玩家的云顶小队
     * @description 每个玩家同时有 lol 和 tft 两个小队，只取 tft 的那个
     */
    public async getTftParty(): Promise<TftParty> {
        const ctx = await this.getContext();
        const data = await this.expectOk('players', ctx, 'GET', `/parties-ledge/v1/players/${ctx.puuid}`);
        const party = (data?.parties ?? []).find((p: any) => p?.partyProduct === 'tft');
        if (!party?.partyId || !party?.platformId) {
            throw new Error('没有找到云顶之弈小队，请确认云顶之弈客户端已登录');
        }
        return { partyId: party.partyId, platformId: party.platformId };
    }

    /**
     * 选择队列
     * @param partyId 云顶小队 ID
     * @param queueId 队列 ID
     * @description maxPartySize 和客户端自己发的一样，取队列配置里的 maximumParticipantListSize
     *              （匹配 8、排位 5、发条鸟 1）
     */
    public async setGameMode(partyId: string, queueId: Queue): Promise<void> {
        const maxPartySize = await this.getQueueMaxPartySize(queueId);
        const ctx = await this.getContext();
        await this.expectOk('gamemode', ctx, 'PUT', `/parties-ledge/v1/parties/${partyId}/gamemode`, {
            queueId,
            maxPartySize,
            gameCustomization: {},
            gameType: '',
        });
    }

    /** 开始排队 */
    public async startMatchmaking(partyId: string): Promise<void> {
        const ctx = await this.getContext();
        await this.expectOk('startAction', ctx, 'POST', `/parties-ledge/v1/parties/${partyId}/members/${ctx.puuid}/startAction`);
    }

    /** 取消排队 */
    public async stopMatchmaking(partyId: string): Promise<void> {
        const ctx = await this.getContext();
        await this.expectOk('stopAction', ctx, 'POST', `/parties-ledge/v1/parties/${partyId}/members/${ctx.puuid}/stopAction`);
    }

    /** 接受对局（找到对局后服务端推送 AFK_CHECK，需要在约 10 秒内调用） */
    public async acceptMatch(): Promise<void> {
        const ctx = await this.getContext();
        await this.expectOk('indicateAfkReadiness', ctx, 'POST', '/team-builder-ledge/v3/indicateAfkReadiness', AFK_READY_BODY);
    }

    /**
     * 是否有进行中的对局
     * @returns true 表示服务端记录玩家在对局中（包括掉线待重连）
     */
    public async isInGame(): Promise<boolean> {
        const { platformId } = await this.getTftParty();
        const ctx = await this.getContext();
        const res = await this.send('gsm', ctx, 'GET', `/gsm/v1/ledge/region/${platformId}/puuid/${ctx.puuid}`);
        if (res.status === 200) return true;
        if (res.status === 404) return false;
        throw new SgpRequestError('gsm', res.status, describeError(res.data));
    }

    /** 读取队列允许的最大人数 */
    private async getQueueMaxPartySize(queueId: Queue): Promise<number> {
        const queue = await this.getLcu().request('GET', `/lol-game-queues/v1/queues/${queueId}`);
        const size = Number(queue?.maximumParticipantListSize);
        if (!Number.isInteger(size) || size <= 0) {
            throw new Error(`队列 ${queueId} 的配置里没有有效的人数上限`);
        }
        return size;
    }

    private getLcu(): LCUManager {
        const lcu = LCUManager.getInstance();
        if (!lcu) {
            throw new Error('LOL 客户端未连接，无法调用排队接口');
        }
        return lcu;
    }

    /** 获取 SGP 域名、puuid 和最新的 token */
    private async getContext(): Promise<SgpContext> {
        const lcu = this.getLcu();

        if (!this.cache || this.cache.lcu !== lcu) {
            const [edgeUrl, summoner] = await Promise.all([
                lcu.request('GET', LEAGUE_EDGE_URL_ENDPOINT),
                lcu.getSummonerInfo(),
            ]);
            if (typeof edgeUrl !== 'string' || !/^https:\/\//.test(edgeUrl)) {
                throw new Error('从 LCU 读取 SGP 地址失败');
            }
            if (!summoner?.puuid) {
                throw new Error('从 LCU 读取玩家信息失败');
            }
            this.cache = { lcu, baseUrl: edgeUrl.replace(/\/+$/, ''), puuid: summoner.puuid };
        }

        const token = await lcu.request('GET', SESSION_TOKEN_ENDPOINT);
        if (typeof token !== 'string' || !token) {
            throw new Error('从 LCU 获取 SGP 鉴权 token 失败');
        }

        return { baseUrl: this.cache.baseUrl, puuid: this.cache.puuid, token };
    }

    /** 发请求，非 2xx 时抛出 SgpRequestError */
    private async expectOk(api: string, ctx: SgpContext, method: Method, path: string, body?: object): Promise<any> {
        const res = await this.send(api, ctx, method, path, body);
        if (res.status < 200 || res.status >= 300) {
            throw new SgpRequestError(api, res.status, describeError(res.data));
        }
        return res.data;
    }

    private async send(api: string, ctx: SgpContext, method: Method, path: string, body?: object): Promise<{ status: number; data: any }> {
        try {
            const res = await this.http.request({
                method,
                url: ctx.baseUrl + path,
                data: body,
                headers: { Authorization: `Bearer ${ctx.token}` },
            });
            return { status: res.status, data: res.data };
        } catch (error) {
            // 只取错误码和消息，axios 的错误对象里带着请求头（含 token），不能整个打出去
            const reason = axios.isAxiosError(error) ? (error.code ?? error.message) : String(error);
            throw new SgpRequestError(api, undefined, reason);
        }
    }
}

/** 从 SGP 错误响应里取出可读的原因 */
function describeError(data: any): string {
    if (!data || typeof data !== 'object') return '';
    return [data.errorCode, data.message].filter(Boolean).join(' ');
}

export const tftSgpApi = TftSgpApi.getInstance();
