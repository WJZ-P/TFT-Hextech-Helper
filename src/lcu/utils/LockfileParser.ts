import fs from 'fs-extra'

/**
 * @interface LockfileData
 * @description 定义 lockfile 文件解析后的数据结构
 * @property {string} process - 进程名, 通常是 'LeagueClient'
 * @property {number} PID - 进程ID
 * @property {number} port - LCU API 的端口号
 * @property {string} password - LCU API 的认证密码
 * @property {string} protocol - LCU API 使用的协议, 通常是 'https'
 */
export interface LockfileData {
    process: string;
    PID: number;
    port: number;
    password: string;
    protocol: string;
}

/**
 * @class LockfileParser
 * @description 用于解析英雄联盟客户端 lockfile 文件的工具类
 */
class LockfileParser {
    /**
     * @description 解析 lockfile 文件内容
     * @param {string | Buffer} path - lockfile 的路径或其 Buffer 内容
     * @returns {Promise<string[]>} 返回由冒号分割的字符串数组
     */
    async parse(path):Promise<string[]> {
        let fileContent: string;

        if (Buffer.isBuffer(path)) {
            // 如果输入是 Buffer，直接转换为字符串
            fileContent = path.toString();
        } else {
            // 否则，从文件路径异步读取内容
            fileContent = await fs.readFile(path, 'utf8');
        }

        // lockfile 的格式是 "LeagueClient:PID:port:password:protocol"
        return fileContent.split(':');
    }

    /**
     * @description 读取并解析 lockfile 文件，返回一个结构化的对象
     * @param {string | Buffer} path - lockfile 的路径或其 Buffer 内容
     * @returns {Promise<LockfileData>} 返回包含详细信息的对象
     */
    async read(path): Promise<LockfileData> {
        const parts = await this.parse(path);

        return {
            process: parts[0],
            PID: Number(parts[1]),
            port: Number(parts[2]),
            password: parts[3],
            protocol: parts[4]
        };
    }

    /**
     * @description 从一个 lockfile 提取信息并以 JSON 格式输出到另一个文件
     * @param {string | Buffer} inputPath - 输入的 lockfile 路径
     * @param {string} outputPath - 输出的 JSON 文件路径
     */
    async extract(inputPath: string | Buffer, outputPath: string): Promise<void> {
        const fileData = await this.read(inputPath);
        // 使用 fs-extra 的 outputJson 方法，可以自动创建目录并写入 JSON 文件
        await fs.outputJson(outputPath, fileData, { spaces: 2 });
    }

}

export default LockfileParser;

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