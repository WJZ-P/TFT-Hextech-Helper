import { EventEmitter } from 'events'
import os from 'os'; // 用于获取操作系统相关信息，比如当前平台
import cp from 'child_process';
import path from "node:path"; // 用于创建子进程和执行命令行命令

//  参考自https://github.com/Pupix/lcu-connector/blob/master/lib/index.js

//  定义操作系统常量
const IS_WIN = process.platform ==='win32'
const IS_MAC = process.platform === 'darwin';
const IS_WSL = process.platform === 'linux' && os.release().toLowerCase().includes('microsoft');

/**
 * 用于连接LOL客户端，通过监听进程和lockfile自动管理连接状态。
 */
class LcuConnector extends EventEmitter {
    /**
     * @static
     * @description 从进程命令行中获取英雄联盟客户端的安装路径
     * @returns {Promise<string | undefined>} 返回路径字符串或 undefined
     */
    static getLCUPathFromProcess() {
        return new Promise(resolve => {
            // 定义用于不同平台的正则表达式，来匹配命令行中的安装路径
            const INSTALL_REGEX_WIN = /"--install-directory=(.*?)"/;
            const INSTALL_REGEX_MAC = /--install-directory=(.*?)( --|\n|$)/;
            const INSTALL_REGEX = IS_WIN || IS_WSL ? INSTALL_REGEX_WIN : INSTALL_REGEX_MAC;

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

                // 匹配命令行输出，提取安装路径
                const parts = stdout.match(INSTALL_REGEX) || [];
                // 处理 WSL 路径，将 Windows 路径转换为 Linux 路径
                const dirPath = !IS_WSL ? parts[1] : parts[1].split(path.win32.sep).join(path.sep).replace(/^([a-zA-Z]):/, match => '/mnt/' + match[0].toLowerCase());
                resolve(dirPath);
            });
        });
    }
}