import {EventEmitter} from 'events'
import os from 'os'; // 用于获取操作系统相关信息，比如当前平台
import cp from 'child_process';
import path from "node:path";
import fs from 'fs-extra'; // 增强版的 fs 模块，用于文件系统操作，比如检查文件是否存在
import chokidar, {ChokidarOptions, FSWatcher} from 'chokidar'; // 一个高效的文件系统监听库，用于监控文件变化
import LockfileParser, {LockfileData} from "./LockfileParser.ts";

//  参考自https://github.com/Pupix/lcu-connector/blob/master/lib/index.js

const lockfile = new LockfileParser();

//  定义操作系统常量
const IS_WIN = process.platform === 'win32'
const IS_MAC = process.platform === 'darwin';
const IS_WSL = process.platform === 'linux' && os.release().toLowerCase().includes('microsoft');

//  定义 LCUConnector能触发的所有事件，以及每个事件对应的数据类型
interface LCUConnectorEvents {
    'connect': (data:LockfileData) => void;
    'disconnect': ()=> void;
}

/**
 * 用于连接LOL客户端，通过监听进程和lockfile自动管理连接状态。
 */
class LCUConnector extends EventEmitter {
    private dirPath?: string
    private processWatcher : NodeJS.Timeout
    private lockfileWatcher: FSWatcher

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
     * @description 从进程命令行中获取英雄联盟客户端的安装路径
     * @returns {Promise<string | undefined>} 返回路径字符串或 undefined
     */
    static getLCUPathFromProcess(): Promise<string | undefined> {
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
        this.clearLockfileWatcher();
    }
    
    /**
     * @description 初始化 lockfile 文件监听器
     */
    private initLockfileWatcher() {
        if (this.lockfileWatcher) {
            return;
        }

        // 拼接 lockfile 的完整路径
        const lockfilePath = path.join(this.dirPath!, 'lockfile');
        // 使用 chokidar 监听 lockfile 的变化, disableGlobbing禁止通配符展开
        this.lockfileWatcher = chokidar.watch(lockfilePath, { disableGlobbing: true } as ChokidarOptions);

        // 绑定事件监听器
        this.lockfileWatcher.on('add', this.onFileCreated.bind(this)); // 文件被创建时
        this.lockfileWatcher.on('change', this.onFileCreated.bind(this)); // 文件被修改时
        this.lockfileWatcher.on('unlink', this.onFileRemoved.bind(this)); // 文件被删除时
    }

    /**
     * @private
     * @description 初始化客户端进程监听器
     */
    private initProcessWatcher() {
        return LCUConnector.getLCUPathFromProcess().then(lcuPath => {
            if (lcuPath) {
                // 如果找到客户端路径，更新路径并开始监听 lockfile
                this.dirPath = lcuPath;
                this.clearProcessWatcher();
                this.initLockfileWatcher();
                return;
            }

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
    }
    private clearLockfileWatcher(){
        if (this.lockfileWatcher) this.lockfileWatcher.close();
    }

    /**
     * @private
     * @description 当 lockfile 文件被创建或更改时触发
     * @param {string} path - 文件路径
     */
    onFileCreated(path) {
        // 读取 lockfile 的内容并解析
        lockfile.read(path).then(data => {
            // 触发 'connect' 事件，并附带解析后的凭据
            this.emit('connect', data);
        });
    }

    /**
     * @private
     * @description 当 lockfile 文件被移除时触发
     */
    onFileRemoved() {
        // 触发 'disconnect' 事件
        this.emit('disconnect');
    }
}

// 导出 LCUConnector 类
export default LCUConnector;