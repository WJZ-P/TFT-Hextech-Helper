import {EventEmitter} from 'events'
import os from 'os'; // 用于获取操作系统相关信息，比如当前平台
import cp from 'child_process';
import path from "node:path";
import fs from 'fs-extra';
import {logger} from "../../utils/Logger.ts"; // 增强版的 fs 模块，用于文件系统操作，比如检查文件是否存在

//  新版已不能从lockfile读取信息，而是全部通过进程读取

//  参考自https://github.com/Pupix/lcu-connector/blob/master/lib/index.js

/**
 * @interface LCUProcessInfo
 * @description 定义 从LOL进程信息解析后的数据结构
 * @property {number} pid - 进程ID
 * @property {number} port - LCU API 的端口号
 * @property {string} token - LCU API 的认证密码
 */
export interface LCUProcessInfo {
    pid: number;
    port: number;
    token: string;
    installDirectory: string;
}

//  定义操作系统常量
const IS_WIN = process.platform === 'win32'
const IS_MAC = process.platform === 'darwin';
const IS_WSL = process.platform === 'linux' && os.release().toLowerCase().includes('microsoft');

//  定义 LCUConnector能触发的所有事件，以及每个事件对应的数据类型
interface LCUConnectorEvents {
    'connect': (data:LCUProcessInfo) => void;
    'disconnect': ()=> void;
}

/**
 * 用于连接LOL客户端，通过监听进程和lockfile自动管理连接状态。
 */
class LCUConnector extends EventEmitter {
    private processWatcher : NodeJS.Timeout

    /**
     * 声明 on 方法的类型，使其能够识别我们定义的事件和数据类型
     */
    public declare on: <E extends keyof LCUConnectorEvents>(event: E, listener: LCUConnectorEvents[E]) => this;

    /**
     * 声明 emit 方法的类型，使其在触发事件时也能进行类型检查
     */
    public declare emit: <E extends keyof LCUConnectorEvents>(event: E, ...args: Parameters<LCUConnectorEvents[E]>) => boolean;

    
    /**
     * @static
     * @description 从进程命令行中获取英雄联盟客户端的有关信息
     * @returns {Promise<LCUProcessInfo>}
     */
    static getLCUInfoFromProcess(): Promise<LCUProcessInfo | null> {
        return new Promise(resolve => {
            // 定义用于不同平台的正则表达式，来匹配命令行中的安装路径
            // const INSTALL_REGEX_WIN = /"--install-directory=(.*?)"/;
            // const INSTALL_REGEX_MAC = /--install-directory=(.*?)( --|\n|$)/;
            // const INSTALL_REGEX = IS_WIN || IS_WSL ? INSTALL_REGEX_WIN : INSTALL_REGEX_MAC;

            // 根据操作系统构建不同的命令行命令
            const command = IS_WIN ?
                `WMIC PROCESS WHERE name='LeagueClientUx.exe' GET commandline` :
                IS_WSL ?
                    `WMIC.exe PROCESS WHERE "name='LeagueClientUx.exe'" GET commandline` :
                    `ps x -o args | grep 'LeagueClientUx'`;

            // 执行命令行命令
            cp.exec(command, (err, stdout, stderr) => {
                // 如果执行出错或没有输出，则解决 Promise 并返回空
                if (err || !stdout || stderr) {
                    resolve();
                    return;
                }
                console.log(`process命令执行结果：${stdout}`)

                // 匹配命令行输出，提取安装路径
                //const parts = stdout.match(INSTALL_REGEX) || [];
                // 处理 WSL 路径，将 Windows 路径转换为 Linux 路径
                //const dirPath = !IS_WSL ? parts[1] : parts[1].split(path.win32.sep).join(path.sep).replace(/^([a-zA-Z]):/, match => '/mnt/' + match[0].toLowerCase());


                //  拿我们其他需要用到的数据
                const portMatch = stdout.match(/--app-port=(\d+)/)
                const tokenMatch = stdout.match(/--remoting-auth-token=([\w-]+)/)
                const pidMatch = stdout.match(/--app-pid=(\d+)/)
                const installDirectoryMatch = stdout.match(/--install-directory=(.*?)"/)
                // 确保所有需要的信息都找到了
                if (portMatch && tokenMatch && pidMatch && installDirectoryMatch) {
                    const data: LCUProcessInfo = {
                        port: parseInt(portMatch[1]),
                        pid: parseInt(pidMatch[1]) ,
                        token: tokenMatch[1],
                        installDirectory:path.dirname(installDirectoryMatch[1]) //  父目录
                    }
                    resolve(data);
                }
                else resolve(null)
            });
        });
    }

    /**
     * @static
     * @description 检查给定的路径是否是一个有效的英雄联盟客户端路径
     * @param {string} dirPath - 目录路径
     * @returns {boolean}
     */
    static isValidLCUPath(dirPath) {
        if (!dirPath) {
            return false;
        }

        // 定义不同平台下的客户端可执行文件名
        const lcuClientApp = IS_MAC ? 'LeagueClient.app' : 'LeagueClient.exe';
        // 检查路径中是否包含通用的客户端文件和配置目录
        const common = fs.existsSync(path.join(dirPath, lcuClientApp)) && fs.existsSync(path.join(dirPath, 'Config'));
        // 检查特定区域的文件来判断版本（国际服、国服、Garena）
        const isGlobal = common && fs.existsSync(path.join(dirPath, 'RADS'));
        const isCN = common && fs.existsSync(path.join(dirPath, 'TQM'));
        const isGarena = common; // Garena 没有其他特殊文件

        return isGlobal || isCN || isGarena;
    }

    /**
     * @description 启动连接器，开始监听客户端进程和 lockfile
     */
    start() {
        // 开始监听客户端进程
        this.initProcessWatcher();
    }

    stop() {
        this.clearProcessWatcher();
    }

    /**
     * @private
     * @description 初始化客户端进程监听器
     */
    private initProcessWatcher() {
        return LCUConnector.getLCUInfoFromProcess().then(lcuData => {
            if (lcuData) {
                this.emit('connect', lcuData);
                this.clearProcessWatcher();
                return;
            }
            logger.error("LOL客户端未启动，一秒后将再次检查...");
            // 如果没找到，设置一个定时器，每秒执行一次 _initProcessWatcher 来重新查找
            if (!this.processWatcher) {
                this.processWatcher = setInterval(this.initProcessWatcher.bind(this), 1000);
            }
        });
    }


    /**
     * @description 清除进程监听器
     */
    private clearProcessWatcher(){
        clearInterval(this.processWatcher)
        this.processWatcher = null as any;  // 重置为 null，允许下次重新创建定时器
    }

}

// 导出 LCUConnector 类
export default LCUConnector;

//d:/wegameapps/英雄联盟/LeagueClient/LeagueClientUx.exe
// "--riotclient-auth-token=rZXol9PnmJGhSxNEevxxxx"
// "--riotclient-app-port=8109"
// "--riotclient-tencent"
// "--no-rads"
// "--disable-self-update"
// "--region=TENCENT"
// "--locale=zh_CN"
// "--t.lcdshost=hn1-k8s-feapp.lol.qq.com"
// "--t.chathost=hn1-k8s-ejabberd.lol.qq.com"
// "--t.storeurl=https://hn1-k8s-sr.lol.qq.com:8443"
// "--t.rmsurl=wss://hn1-k8s-rms.lol.qq.com:443"
// "--rso-auth.url=https://prod-rso.lol.qq.com:3000"
// "--rso_platform_id=HN1" "--rso-auth.client=lol"
// "--t.location=loltencent.gz1.HN1"
// "--tglog-endpoint=https://tglogsz.datamore.qq.com/lolcli/report/"
// "--ccs=https://hn1-k8s-cc.lol.qq.com:8093"
// "--entitlements-url=https://hn1-k8s-entitlements.lol.qq.com:28088/api/token/v1"
// "--dradis-endpoint=http://some.url"
// "--tDALauncher"
// "--remoting-auth-token=O5i14k4B4y81rAzCF0DEhQ"
// "--app-port=8199"
// "--install-directory=d:\wegameapps\鑻遍泟鑱旂洘\LeagueClient"
// "--app-name=LeagueClient"
// "--ux-name=LeagueClientUx"
// "--ux-helper-name=LeagueClientUxHelper"
// "--log-dir=LeagueClient Logs"
// "--crash-reporting="
// "--crash-environment=HN1"
// "--app-log-file-path=d:/wegameapps/英雄联盟/LeagueClient/../Game/Logs/LeagueClient Logs/2025-09-24T21-51-17_19648_LeagueClient.log"
// "--app-pid=19648"
// "--output-base-dir=d:/wegameapps/鑻遍泟鑱旂洘/LeagueClient/../Game"
// "--no-proxy-server"
// "--ignore-certificate-errors"