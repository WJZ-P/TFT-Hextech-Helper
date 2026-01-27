import { EventEmitter } from 'events';
import cp from 'child_process';
import util from 'util';
import path from "node:path";
import fs from 'fs-extra';
import { logger } from "../../utils/Logger.ts";

// 使用 util.promisify 将 exec 转换为 Promise 版本，避免回调地狱
// 新版不能从lockfile读取信息，只能从进程里读取
// 参考自https://github.com/junlarsen/league-connect/blob/0317262512fb1a04ff1d6ecea05969a68ccc0b61/src/authentication.ts
const exec = util.promisify(cp.exec);

/**
 * @interface LCUProcessInfo
 * @description 定义 从LOL进程信息解析后的数据结构
 * @property {number} pid - 进程ID
 * @property {number} port - LCU API 的端口号
 * @property {string} token - LCU API 的认证密码
 * @property {string} installDirectory - 游戏安装目录
 */
export interface LCUProcessInfo {
    pid: number;
    port: number;
    token: string;
    installDirectory: string;
}

// 定义 LCUConnector 能触发的所有事件
interface LCUConnectorEvents {
    'connect': (data: LCUProcessInfo) => void;
    'disconnect': () => void;
}

/**
 * 无法找到英雄联盟客户端进程
 */
export class ClientNotFoundError extends Error {
    constructor() {
        super('无法找到英雄联盟客户端进程！');
    }
}

/**
 * 软件没有以管理员模式运行
 */
export class ClientElevatedPermsError extends Error {
    constructor() {
        super('软件没有在管理员模式下运行！');
    }
}

/**
 * 用于连接LOL客户端，通过监听进程自动管理连接状态。
 * 基于 league-connect 的健壮实现进行改造
 */
class LCUConnector extends EventEmitter {
    private isMonitoring = false;
    private pollInterval = 1000;
    private checkTimer: NodeJS.Timeout | null = null;

    /**
     * 声明 on 方法的类型
     */
    public declare on: <E extends keyof LCUConnectorEvents>(event: E, listener: LCUConnectorEvents[E]) => this;

    /**
     * 声明 emit 方法的类型
     */
    public declare emit: <E extends keyof LCUConnectorEvents>(event: E, ...args: Parameters<LCUConnectorEvents[E]>) => boolean;

    /**
     * 启动连接器，开始轮询查找客户端进程
     */
    start() {
        if (this.isMonitoring) return;
        this.isMonitoring = true;
        console.info('[LCUConnector] 开始监听 LOL 客户端进程...');
        this.monitor();
    }

    /**
     * 停止连接器
     */
    stop() {
        this.isMonitoring = false;
        if (this.checkTimer) {
            clearTimeout(this.checkTimer);
            this.checkTimer = null;
        }
        console.info('[LCUConnector] 停止监听 LOL 客户端进程');
    }

    /**
     * 轮询监控逻辑
     */
    private async monitor() {
        if (!this.isMonitoring) return;

        try {
            const info = await this.authenticate();
            console.info(`[LCUConnector] 成功获取客户端信息: PID=${info.pid}, Port=${info.port}`);
            this.emit('connect', info);
            this.isMonitoring = false; // 连接成功后停止轮询
        } catch (err) {
            if (err instanceof ClientNotFoundError) {
                // 没找到是正常的，继续轮询
                logger.error("未检测到LOL客户端，一秒后将再次检查...");
            } else if (err instanceof ClientElevatedPermsError) {
                logger.warn('[LCUConnector] 检测到客户端以管理员权限运行，获取进程信息失败。请以管理员身份运行海克斯科技助手！');
            } else {
                logger.error(`[LCUConnector] 查找客户端时发生未知错误: ${err}`);
            }

            // 继续下一轮轮询
            if (this.isMonitoring) {
                this.checkTimer = setTimeout(() => this.monitor(), this.pollInterval);
            }
        }
    }

    /**
     * 核心认证逻辑，参考 league-connect 实现
     */
    private async authenticate(): Promise<LCUProcessInfo> {
        const name = 'LeagueClientUx';
        const isWindows = process.platform === 'win32';
        
        // 更严谨的正则表达式匹配，避免误匹配
        const portRegex = /--app-port=([0-9]+)(?= *"| --)/;
        const passwordRegex = /--remoting-auth-token=(.+?)(?= *"| --)/;
        const pidRegex = /--app-pid=([0-9]+)(?= *"| --)/;
        
        // 安装目录匹配：兼容 Windows（带引号）和 macOS（不带引号）
        const installDirRegexWin = /--install-directory=(.*?)"/;
        const installDirRegexMac = /--install-directory=(.+?)(?=\s+--|$)/;

        let command: string;
        let executionOptions = {};

        if (!isWindows) {
            // macOS / Linux: 使用 ps 命令
            command = `ps x -o args | grep '${name}'`;
        } else {
            // Windows: 优先使用 PowerShell (Get-CimInstance)，因为它更现代且解析更准确
            // 比老旧的 WMIC 更快、更稳定，而且能获取更完整的命令行参数
            command = `Get-CimInstance -Query "SELECT * from Win32_Process WHERE name LIKE '${name}.exe'" | Select-Object -ExpandProperty CommandLine`;
            executionOptions = { shell: 'powershell' };
        }

        try {
            const { stdout: rawStdout } = await exec(command, executionOptions);
            const stdout = rawStdout.replace(/\n|\r/g, ''); // 移除换行符

            // 尝试匹配关键信息
            const portMatch = stdout.match(portRegex);
            const passwordMatch = stdout.match(passwordRegex);
            const pidMatch = stdout.match(pidRegex);

            if (!portMatch || !passwordMatch || !pidMatch) {
                throw new ClientNotFoundError();
            }

            // 提取安装目录
            let installDir = '';
            const installDirMatch = stdout.match(installDirRegexWin) || stdout.match(installDirRegexMac);
            if (installDirMatch) {
                installDir = installDirMatch[1].trim();
            }

            return {
                port: Number(portMatch[1]),
                pid: Number(pidMatch[1]),
                token: passwordMatch[1],
                installDirectory: installDir ? path.dirname(installDir) : '' // 返回父目录作为安装目录
            };

        } catch (err) {
            // 如果是 ClientNotFoundError 或者是 exec 执行出错（比如进程没找到），我们需要进一步判断
            
            // Windows 下检查是否是因为权限问题导致找不到进程
            if (isWindows && executionOptions['shell'] === 'powershell') {
                try {
                    const checkAdminCmd = `if ((Get-Process -Name ${name} -ErrorAction SilentlyContinue | Where-Object {!$_.Handle -and !$_.Path})) {Write-Output "True"} else {Write-Output "False"}`;
                    const { stdout: isAdmin } = await exec(checkAdminCmd, executionOptions);
                    if (isAdmin.includes('True')) {
                        throw new ClientElevatedPermsError();
                    }
                } catch (ignore) {
                    // 忽略检查权限时的错误
                }
            }
            
            // 如果上面的检查没有抛出权限错误，那就抛出未找到错误
            throw new ClientNotFoundError();
        }
    }

    /**
     * @static
     * @description 检查给定的路径是否是一个有效的英雄联盟客户端路径
     * @param {string} dirPath - 目录路径
     * @returns {boolean}
     */
    static isValidLCUPath(dirPath: string) {
        if (!dirPath) return false;

        const IS_MAC = process.platform === 'darwin';
        const lcuClientApp = IS_MAC ? 'LeagueClient.app' : 'LeagueClient.exe';
        
        // 检查路径中是否包含通用的客户端文件和配置目录
        const common = fs.existsSync(path.join(dirPath, lcuClientApp)) && fs.existsSync(path.join(dirPath, 'Config'));
        // 检查特定区域的文件来判断版本（国际服、国服、Garena）
        const isGlobal = common && fs.existsSync(path.join(dirPath, 'RADS'));
        const isCN = common && fs.existsSync(path.join(dirPath, 'TQM'));
        const isGarena = common; // Garena 没有其他特殊文件

        return isGlobal || isCN || isGarena;
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