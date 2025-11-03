import {logger} from "../utils/PanelLogger";
import ConfigHelper from "../utils/ConfigHelper";

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
            logger.info('[HexService] 海克斯科技，启动！')

            //  备份配置
            logger.info('[HexService] 正在备份当前客户端配置...')
            await ConfigHelper.backup()
            logger.info('[HexService] 正在应用云顶之弈配置...')
            await ConfigHelper.applyTFTConfig()

        } catch (e: unknown) {
            console.error(e)
            logger.error('[HexService] 启动失败！')
            return true
        }
        return true
    }

    public async stop(): Promise<boolean> {
        try {
            logger.info('———— 停止运行 ————')
            logger.info('正在恢复客户端设置...')
            await ConfigHelper.restore()

            console.log('[HexService] 海克斯科技关闭。')
            logger.info('[HexService] 海克斯科技关闭。')
            return true
        } catch (e: unknown) {
            console.error(e)
            logger.error('[HexService] 海克斯科技关闭失败！')
        }
    }
}

export enum GamePhase {
    IN_LOBBY,   //  在大厅
    IN_QUEUE,   //  在排队
    //  游戏开始后
    CAROUSEL,   //  选秀
    SHOPPING,   //  购买/准备阶段
    BATTLE,     //  战斗阶段
    //  游戏结束
    GAME_END,   //  进行结算
}


class Action {

}

export const hexService = HexService.getInstance();