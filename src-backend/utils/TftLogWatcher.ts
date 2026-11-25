/**
 * @file 云顶之弈客户端日志监听
 * @description 虚幻客户端不开 2999 端口（Live Client Data API），LCU 的 gameflow 也看不到它的对局，
 *              所以通过客户端日志 %LOCALAPPDATA%/TFT/Saved/Logs/TFT.log 判断客户端走到了哪一步。
 *
 *              用到的日志行（原文片段）：
 *              - "Entering LobbyState[ETFTLobbyState::Xxx]"                   客户端的大厅状态，取值见 TftLobbyState
 *              - "TFTPartiesService_...: Event[AFK_CHECK] received"           服务端推送的排队事件，AFK_CHECK = 找到对局
 *              - "Joining game server at Host[...]"                           对局已分配，开始连接游戏服务器
 *              - "GameMode[Match] TerminalEdge[presentation_ready]"           对局场景加载完、画面可以操作了
 *              - "Received RMS message ... resource 'cap/missions/v1/notifications'"  自己的对局已打完，服务端结算任务进度
 *              - "LogExit: Exiting."                                          客户端正常退出
 *
 *              一局完整的日志顺序：
 *                Matchmaking → Event[MATCHMAKING] → Event[AFK_CHECK] → Event[CHAMPION_SELECT]
 *                → Joining game server → InGame → presentation_ready
 *                → （对局结束）EndOfGameInterstitial → EndOfGameSummary → SoloMode / Frontend
 *              掉线后重启客户端时是 Reconnect → InGame → presentation_ready。
 *
 *              普通对局里阵亡后客户端仍停在 InGame（显示"现在退出 / 继续观看"），要点了退出才会离开。
 *              阵亡本身不写日志，但服务端会在几秒内推送任务结算（cap/missions）。
 *              翻过 17 局的日志，这条消息只出现在对局结束前 5~10 秒，从没在中途出现过；
 *              但没有任务进度可结算时（如开局就投降）不会推送，所以只能当作提示，不能作为唯一依据
 *
 * 实现细节：
 *   - 每 250ms 检查一次文件大小，只读新增部分；按字节切行，避免把中文字符切成两半
 *   - 客户端每次启动会把旧日志改名为 TFT-backup-<时间>.log 再新建 TFT.log，
 *     NTFS 的 tunneling 会让新文件继承旧文件的创建时间，所以用文件 ID（ino）和文件变小来识别轮转
 *   - start() 时先完整读一遍现有日志，只建立当前状态、不发事件，之后的新增内容才发事件
 */

import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import { logger } from "./Logger";

/** 日志文件路径 */
const TFT_LOG_FILE = path.join(process.env.LOCALAPPDATA || '', 'TFT', 'Saved', 'Logs', 'TFT.log');

/** 轮询间隔 (ms) */
const POLL_INTERVAL_MS = 250;

/** 客户端大厅状态（ETFTLobbyState），日志里出现过的取值 */
export const TftLobbyState = {
    /** 主界面 */
    FRONTEND: 'Frontend',
    /** 选好模式、在房间里 */
    SOLO_MODE: 'SoloMode',
    /** 和好友组队的房间 */
    SOCIAL_MODE: 'SocialMode',
    /** 排队中 */
    MATCHMAKING: 'Matchmaking',
    /** 有未结束的对局，等待重连 */
    RECONNECT: 'Reconnect',
    /** 对局中（从连上游戏服务器开始，加载完成要再等 presentation_ready） */
    IN_GAME: 'InGame',
    /** 对局结束后的过渡画面 */
    END_OF_GAME_INTERSTITIAL: 'EndOfGameInterstitial',
    /** 结算界面 */
    END_OF_GAME_SUMMARY: 'EndOfGameSummary',
} as const;

const LOBBY_STATE_PATTERN = /Entering LobbyState\[ETFTLobbyState::(\w+)\]/;
const PARTY_EVENT_PATTERN = /TFTPartiesService_\d+: Event\[(\w+)\] received/;
const JOINING_SERVER_PATTERN = /Joining game server at Host\[/;
const PRESENTATION_READY_PATTERN = /GameMode\[Match\] TerminalEdge\[presentation_ready\]/;
const MATCH_FINISHED_PATTERN = /RGIOPRms: Received RMS message ID '[^']*' for resource 'cap\/missions\/v1\/notifications'/;
const CLIENT_EXIT_PATTERN = /LogExit: Exiting\./;

/** 监听器发出的事件 */
interface TftLogWatcherEvents {
    /** 大厅状态变化 */
    lobbyState: (state: string, previous: string | null) => void;
    /** 服务端推送的排队事件：MATCHMAKING / AFK_CHECK / CHAMPION_SELECT */
    partyEvent: (name: string) => void;
    /** 开始连接游戏服务器 */
    joiningGameServer: () => void;
    /** 对局加载完成，可以操作 */
    gameLoaded: () => void;
    /** 对局中收到任务结算，说明自己的对局已经打完（阵亡或整局结束），此时可能还停留在对局画面 */
    matchFinished: () => void;
    /** 客户端退出（正常退出写了 LogExit，或日志被轮转说明客户端重启了） */
    clientExit: () => void;
}

class TftLogWatcher extends EventEmitter {
    private static instance: TftLogWatcher | null = null;

    private timer: NodeJS.Timeout | null = null;
    private startPromise: Promise<void> | null = null;
    private polling = false;

    /** 当前读取的文件 ID，用于识别轮转 */
    private fileId: bigint | null = null;
    /** 已读到的字节位置 */
    private offset = 0;
    /** 上次读取末尾不完整的一行（按字节保存） */
    private carry: Buffer = Buffer.alloc(0);

    private _lobbyState: string | null = null;
    private _gameLoaded = false;

    public declare on: <E extends keyof TftLogWatcherEvents>(event: E, listener: TftLogWatcherEvents[E]) => this;
    public declare off: <E extends keyof TftLogWatcherEvents>(event: E, listener: TftLogWatcherEvents[E]) => this;
    public declare emit: <E extends keyof TftLogWatcherEvents>(event: E, ...args: Parameters<TftLogWatcherEvents[E]>) => boolean;

    public static getInstance(): TftLogWatcher {
        if (!TftLogWatcher.instance) {
            TftLogWatcher.instance = new TftLogWatcher();
        }
        return TftLogWatcher.instance;
    }

    /** 当前大厅状态，还没读到时为 null */
    public get lobbyState(): string | null {
        return this._lobbyState;
    }

    /** 当前是否在对局中且已加载完成 */
    public get isGameLoaded(): boolean {
        return this._lobbyState === TftLobbyState.IN_GAME && this._gameLoaded;
    }

    /**
     * 开始监听（重复调用没有副作用）
     * @description 先读完现有日志建立当前状态，再开始轮询新增内容
     */
    public start(): Promise<void> {
        if (!this.startPromise) {
            const startPromise = this.initialScan().then(() => {
                // 初始扫描期间被 stop() 了就不再启动轮询
                if (this.startPromise !== startPromise) return;
                this.timer = setInterval(() => void this.poll(), POLL_INTERVAL_MS);
                logger.debug(`[TftLogWatcher] 开始监听客户端日志，当前大厅状态: ${this._lobbyState ?? '未知'}`);
            });
            this.startPromise = startPromise;
        }
        return this.startPromise;
    }

    /** 停止监听并清空状态 */
    public stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.startPromise = null;
        this.fileId = null;
        this.offset = 0;
        this.carry = Buffer.alloc(0);
        this._lobbyState = null;
        this._gameLoaded = false;
    }

    /** 读一遍现有日志，只建立状态、不发事件 */
    private async initialScan(): Promise<void> {
        const stat = await this.statLog();
        if (!stat) {
            logger.warn(`[TftLogWatcher] 没有找到客户端日志: ${TFT_LOG_FILE}`);
            return;
        }
        try {
            this.fileId = stat.ino;
            await this.readNewContent(stat.size, false);
        } catch (error) {
            // 读失败也继续启动轮询，后续轮询会接着读
            logger.warn(`[TftLogWatcher] 读取客户端日志失败: ${error instanceof Error ? error.message : error}`);
        }
    }

    private async poll(): Promise<void> {
        if (this.polling) return;
        this.polling = true;
        try {
            const stat = await this.statLog();
            if (!stat) return;

            const rotated = this.fileId !== null && stat.ino !== this.fileId;
            if (rotated || stat.size < this.offset) {
                logger.info("[TftLogWatcher] 客户端日志已轮转（客户端重启），从头读取新日志");
                this.offset = 0;
                this.carry = Buffer.alloc(0);
                this._lobbyState = null;
                this._gameLoaded = false;
                this.emit('clientExit');
            }
            this.fileId = stat.ino;

            if (stat.size > this.offset) {
                await this.readNewContent(stat.size, true);
            }
        } catch (error) {
            logger.debug(`[TftLogWatcher] 读取客户端日志失败: ${error instanceof Error ? error.message : error}`);
        } finally {
            this.polling = false;
        }
    }

    private async statLog(): Promise<{ ino: bigint; size: number } | null> {
        try {
            const stat = await fs.promises.stat(TFT_LOG_FILE, { bigint: true });
            return { ino: stat.ino, size: Number(stat.size) };
        } catch {
            return null;
        }
    }

    /** 读取 [offset, size) 之间的内容并逐行处理 */
    private async readNewContent(size: number, emitEvents: boolean): Promise<void> {
        const handle = await fs.promises.open(TFT_LOG_FILE, 'r');
        let chunk: Buffer;
        try {
            chunk = Buffer.alloc(size - this.offset);
            const { bytesRead } = await handle.read(chunk, 0, chunk.length, this.offset);
            chunk = chunk.subarray(0, bytesRead);
        } finally {
            await handle.close();
        }
        this.offset += chunk.length;

        // 只处理到最后一个换行符，剩下的半行留到下次
        const data = this.carry.length > 0 ? Buffer.concat([this.carry, chunk]) : chunk;
        const lastNewline = data.lastIndexOf(0x0a);
        if (lastNewline < 0) {
            this.carry = data;
            return;
        }
        this.carry = Buffer.from(data.subarray(lastNewline + 1));

        for (const line of data.subarray(0, lastNewline).toString('utf8').split('\n')) {
            this.handleLine(line, emitEvents);
        }
    }

    private handleLine(line: string, emitEvents: boolean): void {
        const lobbyMatch = LOBBY_STATE_PATTERN.exec(line);
        if (lobbyMatch) {
            const state = lobbyMatch[1];
            // 同一状态会再打一行 "... had no side effect"，只在状态真正变化时处理
            if (state !== this._lobbyState) {
                const previous = this._lobbyState;
                this._lobbyState = state;
                this._gameLoaded = false;
                if (emitEvents) {
                    logger.debug(`[TftLogWatcher] 大厅状态: ${previous ?? '未知'} -> ${state}`);
                    this.emit('lobbyState', state, previous);
                }
            }
            return;
        }

        if (PRESENTATION_READY_PATTERN.test(line)) {
            if (this._lobbyState === TftLobbyState.IN_GAME && !this._gameLoaded) {
                this._gameLoaded = true;
                if (emitEvents) this.emit('gameLoaded');
            }
            return;
        }

        // 客户端退出后 TFT.log 会一直停在这一行，直到下次启动才轮转，所以初始扫描时也要清空状态
        if (CLIENT_EXIT_PATTERN.test(line)) {
            this._lobbyState = null;
            this._gameLoaded = false;
            if (emitEvents) this.emit('clientExit');
            return;
        }

        if (!emitEvents) return;

        const partyMatch = PARTY_EVENT_PATTERN.exec(line);
        if (partyMatch) {
            this.emit('partyEvent', partyMatch[1]);
        } else if (JOINING_SERVER_PATTERN.test(line)) {
            this.emit('joiningGameServer');
        } else if (this.isGameLoaded && MATCH_FINISHED_PATTERN.test(line)) {
            logger.debug('[TftLogWatcher] 收到任务结算，对局已打完');
            this.emit('matchFinished');
        }
    }
}

export const tftLogWatcher = TftLogWatcher.getInstance();
