import {IState} from "./IState";
import {logger} from "../../utils/Logger.ts";
import https from "https";
import axios, {AxiosInstance} from "axios";
import {EndState} from "./EndState.ts";
import {hexService} from "../HexService.ts";
import {GameStageState} from "./GameStageState.ts";

const inGameApi: AxiosInstance = axios.create({
    baseURL: 'https://127.0.0.1:2999',  //  What the fuck???
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
    }),
    timeout: 1000, // 设置一个较短的超时，方便快速轮询
    proxy: false,
});

//  开局后游戏加载中，等待进入游戏的状态。
export class GameLoadingState implements IState {

    async action(signal: AbortSignal): Promise<IState> {
        signal.throwIfAborted()
        logger.info('[GameLoadingState] 等待进入对局...');
        const isGameLoaded = await this.waitForGameToLoad();

        if (isGameLoaded) {
            // 游戏加载完成！
            logger.info('[GameLoadingState] 对局已开始！');
            return new GameStageState();
        } else {
            // 被用户停止了
            return new EndState();
        }
    }

    private waitForGameToLoad(): Promise<boolean> {
        let task :NodeJS.Timeout;
        return new Promise((resolve) => {
            const checkIfGameStart = async () =>{
                try {
                    if (!hexService.isRunning) return resolve(false)
                    await inGameApi.get('/liveclientdata/allgamedata')
                    clearTimeout(task)
                    resolve(true)
                } catch (e) {
                    logger.info('[GameLoadingState] 游戏仍在加载中...')
                }
            }
            task = setInterval(checkIfGameStart,2000)//  每两秒钟遍历一次
        })
    }
}