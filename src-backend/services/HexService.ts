import {logger} from "../utils/PanelLogger";
import ConfigHelper from "../ConfigHelper";

export enum GameState {
    GAME_START,
    PLAYING,
    GAME_END
}

//  海克斯科技核心逻辑！
class HexService {
    private static instance: HexService | null = null

    private constructor() {
        // 私有构造函数，确保是单例
    }

    public static getInstance(): HexService {
        if (!HexService.instance) {
            HexService.instance = new HexService();
        }
        return HexService.instance;
    }

    /**
     * 海克斯科技，启动！
     */
    public async start(): Promise<boolean> {
        try {
            console.log('[HexService] 海克斯科技，启动！')
            logger.info('海克斯科技，启动！')

            //  备份配置
            logger.info('正在备份当前客户端配置...')
            await ConfigHelper.backup()
            logger.info('正在应用云顶之弈配置...')


        } catch (e: unknown) {
            console.error(e)
            logger.error('[HexService] 启动失败！')
            return true
        }
        return true
    }

    public async stop(): Promise<boolean>{
        try{
            console.log('[HexService] 海克斯科技，关闭。')
            logger.info('[HexService] 海克斯科技，关闭。')
            return true
        }catch (e:unknown){
                        console.error(e)
            logger.error('[HexService] 关闭失败！')
        }
    }
}