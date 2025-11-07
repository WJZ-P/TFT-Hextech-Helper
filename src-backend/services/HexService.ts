import {logger} from "../utils/Logger.ts";
import {IState} from "./states/IState.ts";
import {IdleState} from "./states/IdleState.ts";
import {EndState} from "./states/EndState.ts";
import {StartState} from "./states/StartState.ts";
import {sleep} from "../utils/HelperTools.ts";

//  海克斯科技核心逻辑！
class HexService {
    private static instance: HexService | null = null
    //  状态
    private abortController: AbortController | null = null;
    private currentState: IState;
    private readonly TICK_RATE_MS = 3000;// looper的心跳间隔。

    private constructor() {
        //  私有构造函数，确保是单例
        //  初始状态为空闲
        this.currentState = new IdleState()
    }

    public static getInstance(): HexService {
        if (!HexService.instance) {
            HexService.instance = new HexService();
        }
        return HexService.instance;
    }

    /**
     * 我们检查 abortController 是不是存在
     */
    public get isRunning(): boolean {
        // 只要 abortController 不是 null，就说明服务已启动
        return this.abortController !== null;
    }

    /**
     * 海克斯科技，启动！
     */
    public async start(): Promise<boolean> {
        if (this.isRunning) {
            logger.warn('[HexService] 引擎已在运行中，无需重复启动。');
            return true;
        }
        try {
            logger.info('———————— [HexService] ————————')
            logger.info('[HexService] 海克斯科技，启动！')
            this.abortController = new AbortController()
            this.currentState = new StartState();

            //  点火
            this.runMainLoop(this.abortController.signal)

            return true
        } catch (e: unknown) {
            logger.error('[HexService] 启动失败！')
            console.error(e)
            return false
        }
    }

    public async stop(): Promise<boolean> {
        if (!this.isRunning) {
            logger.warn('[HexService] 服务已停止，无需重复操作。');
            return true;
        }
        try {
            logger.info('———————— [HexService] ————————')
            logger.info('[HexService] 海克斯科技，关闭！')

            this.abortController?.abort('user stop')

            // logger.info('———— 停止运行 ————')
            // logger.info('正在恢复客户端设置...')
            // await ConfigHelper.restore()
            // console.log('[HexService] 海克斯科技关闭。')
            // logger.info('[HexService] 海克斯科技关闭。')
            return true
        } catch (e: unknown) {
            console.error(e)
            logger.error('[HexService] 海克斯科技关闭失败！')
            return false
        }
    }

    /**
     * 创建状态机引擎
     */
    private async runMainLoop(signal: AbortSignal) {
        logger.info('[HexService-Looper] 启动事件循环。')
        try {
            //  开始前先检查一次
            signal.throwIfAborted()

            // eslint-disable-next-line no-constant-condition
            while (true) {
                signal.throwIfAborted()
                logger.info(`[HexService-Looper] -> 当前状态: ${this.currentState.constructor.name}`);
                /// 执行当前state操作
                this.currentState = await this.currentState.action(signal);
                await sleep(2000)
            }
        } catch (error: any) {
            if (error.name === 'AbortError') {
                logger.info(`[HexService-Looper] -> 用户手动退出，挂机流程结束`);
            } else {
                logger.error(`[HexService-Looper] 状态机在 [${this.currentState}] 状态下发生严重错误: ${error.message}`)
            }
        } finally {
            //  收尾工作
            this.currentState = await new EndState().action()
            this.abortController = null
        }
    }
}

export const hexService = HexService.getInstance();