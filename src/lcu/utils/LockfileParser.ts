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

    async read(path) {
        const parts = await this.parse(path);

        return {
            process: parts[0],
            PID: Number(parts[1]),
            port: Number(parts[2]),
            password: parts[3],
            protocol: parts[4]
        };
    }

    async extract(input, output) {
        const file = await this.read(input);
        await fs.outputJson(output, file, { spaces: 2 });
    }

}

module.exports = LockfileParser;