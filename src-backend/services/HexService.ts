import {logger} from "../utils/PanelLogger";
import {IState} from "./states/IState.ts";
import {IdleState} from "./states/IdleState.ts";
import {EndState} from "./states/EndState.ts";

//  海克斯科技核心逻辑！
class HexService {
    private static instance: HexService | null = null

    //  状态
    private _isRunning: boolean = false;
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
     * (公共) 为 State 类提供一个“读取”总开关的 getter
     */
    public get isRunning(): boolean {
        return this._isRunning;
    }

    /**
     * 海克斯科技，启动！
     */
    public async start(): Promise<boolean> {
        if (this._isRunning) {
            logger.warn('[HexService] 引擎已在运行中，无需重复启动。');
            return true;
        }
        try {
            logger.info('———————— [HexService] ————————')
            logger.info('[HexService] 海克斯科技，启动！')
            this._isRunning = true  //  表示服务启动
            if (this.currentState != IdleState) {
                this.runMainLoop(); //  点火
            }

            //  备份配置
            // logger.info('[HexService] 正在备份当前客户端配置...')
            // await ConfigHelper.backup()
            // logger.info('[HexService] 正在应用云顶之弈配置...')
            // await ConfigHelper.applyTFTConfig()
            return true
        } catch (e: unknown) {
            logger.error('[HexService] 启动失败！')
            console.error(e)
        }
        return false
    }

    public async stop(): Promise<boolean> {
        if (!this._isRunning) {
            logger.warn('[HexService] 服务已停止，无需重复操作。');
            return true;
        }
        try {
            logger.info('———————— [HexService] ————————')
            logger.info('[HexService] 海克斯科技，关闭！')
            this._isRunning = false; // 松开总开关.
            // logger.info('———— 停止运行 ————')
            // logger.info('正在恢复客户端设置...')
            // await ConfigHelper.restore()
            // console.log('[HexService] 海克斯科技关闭。')
            // logger.info('[HexService] 海克斯科技关闭。')
            return true
        } catch (e: unknown) {
            console.error(e)
            logger.error('[HexService] 海克斯科技关闭失败！')
        }
        return false
    }

    /**
     * 创建状态机引擎
     */
    private async runMainLoop() {
        logger.info('[HexService-Looper] 启动事件循环。')
        try {
            while (this._isRunning) {
                /// 执行当前state操作
                this.currentState = await this.currentState.action();

            }
        }catch (error:any){
            `[HexService-Looper] 状态机在 [${this.currentState}] 状态下发生严重错误: ${error.message}`
            //  执行收尾工作
            this.currentState =await new EndState().action()
            this._isRunning = false
        }

    }
}

export const hexService = HexService.getInstance();