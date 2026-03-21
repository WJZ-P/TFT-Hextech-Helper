/**
 * 崩溃日志记录器 (增强版)
 * @module CrashLogger
 * @description 专门用于记录应用崩溃信息到本地文件，支持权限降级策略
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { app } from 'electron';

// 定义日志目录名称
const LOG_DIR_NAME = 'crash-logs';

/**
 * 获取可用的崩溃日志目录
 * 策略：尝试在程序根目录创建 -> 失败则回退到 UserData 目录 -> 失败则回退到 Temp 目录
 */
function getCrashLogDir(): string {
    // 候选路径列表
    const candidates: string[] = [];

    // 1. 第一优先级：程序根目录 (便携版最喜欢，且用户最容易找到)
    try {
        let exeDir = path.dirname(app.getPath('exe'));
        // 如果是开发环境，app.getPath('exe') 可能是 electron 的二进制路径
        // 使用 process.cwd() 通常是项目根目录
        if (!app.isPackaged) {
            exeDir = process.cwd();
        }
        candidates.push(path.join(exeDir, LOG_DIR_NAME));
    } catch (e) { /* 忽略 */ }

    // 2. 第二优先级：系统分配的数据目录 (%APPDATA%/YourApp/crash-logs)
    // 这里通常拥有绝对的读写权限
    try {
        candidates.push(path.join(app.getPath('userData'), LOG_DIR_NAME));
    } catch (e) { /* 忽略 */ }

    // 3. 第三优先级：系统临时目录 (保底)
    try {
        candidates.push(path.join(os.tmpdir(), app.name || 'electron-app', LOG_DIR_NAME));
    } catch (e) { /* 忽略 */ }

    // 遍历候选目录，返回第一个能成功创建/写入的目录
    for (const dir of candidates) {
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // 测试写入权限
            const testFile = path.join(dir, '.test-write');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);

            return dir; // 找到可用目录，直接返回
        } catch (e) {
            // 当前目录不可用，尝试下一个
            continue;
        }
    }

    // 如果所有目录都失败（极小概率），回退到当前工作目录
    return path.join(process.cwd(), LOG_DIR_NAME);
}

/**
 * 获取当前时间的格式化字符串
 */
function getTimestampForFilename(): string {
    const now = new Date();
    return now.getFullYear() +
        '-' + String(now.getMonth() + 1).padStart(2, '0') +
        '-' + String(now.getDate()).padStart(2, '0') +
        '_' + String(now.getHours()).padStart(2, '0') +
        '-' + String(now.getMinutes()).padStart(2, '0') +
        '-' + String(now.getSeconds()).padStart(2, '0');
}

/**
 * 收集系统环境信息
 */
function getSystemInfo(): string {
    const info: string[] = [
        `操作系统: ${os.platform()} ${os.release()} (${os.arch()})`,
        `主机名: ${os.hostname()}`,
        `Node.js: ${process.version}`,
        `Electron: ${process.versions.electron || '未知'}`,
        `Chrome: ${process.versions.chrome || '未知'}`,
        `总内存: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)} GB`,
        `可用内存: ${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`,
        `CPU 型号: ${os.cpus()[0]?.model || '未知'}`,
    ];

    try {
        info.push(`应用版本: ${app.getVersion()}`);
        info.push(`是否打包: ${app.isPackaged ? '是' : '否'}`);
    } catch {
        info.push(`应用状态: App 尚未初始化完成`);
    }

    return info.join('\n');
}

/**
 * 核心：写入崩溃日志
 */
export function writeCrashLog(error: Error | string | any, context: string = '未知错误上下文'): string {
    // 最终的日志路径
    let finalLogPath = '';

    try {
        const logDir = getCrashLogDir();
        const timestamp = getTimestampForFilename();
        finalLogPath = path.join(logDir, `crash_${timestamp}.log`);

        // 解析错误对象
        let errorMessage = '';
        let errorStack = '';

        if (error instanceof Error) {
            errorMessage = error.message;
            errorStack = error.stack || '无堆栈';
        } else if (typeof error === 'object') {
            try {
                errorMessage = JSON.stringify(error);
                errorStack = '非 Error 对象，无堆栈';
            } catch {
                errorMessage = String(error);
            }
        } else {
            errorMessage = String(error);
        }

        const logContent = `
================================================================================
                        应用崩溃报告 (Crash Report)
================================================================================
时间: ${new Date().toLocaleString('zh-CN')}
上下文: ${context}
日志路径: ${finalLogPath}
--------------------------------------------------------------------------------
[错误信息 / Message]
${errorMessage}

--------------------------------------------------------------------------------
[错误堆栈 / Stack Trace]
${errorStack}

--------------------------------------------------------------------------------
[系统环境 / System Info]
${getSystemInfo()}

--------------------------------------------------------------------------------
[环境变量 / Env]
NODE_ENV: ${process.env.NODE_ENV}
USER_DATA: ${app.getPath('userData')}
EXE_PATH: ${app.getPath('exe')}
================================================================================
`;
        // 同步写入，确保进程退出前写完
        fs.writeFileSync(finalLogPath, logContent, 'utf-8');

        // 尝试用 console 输出路径，方便调试。保护 console 调用以避免在父进程 pipe 已关闭时抛出 EPIPE
        try {
            console.error(`\n🔴 严重错误！崩溃日志已保存至: ${finalLogPath}\n`);
        } catch (e) {
            // 忽略写入控制台失败（例如父进程管道已关闭， causes EPIPE）
        }

    } catch (writeError) {
        try {
            console.error('❌ 写入崩溃日志失败 (Write Failed):', writeError);
            console.error('原始错误 (Original Error):', error);
        } catch (e) {
            // 忽略控制台写入失败
        }
    }

    return finalLogPath;
}

/**
 * 初始化全局错误捕获
 * 建议在 main.ts 最顶部调用
 */
export function initGlobalCrashHandler() {
    process.on('uncaughtException', (error) => {
        writeCrashLog(error, 'Main Process Uncaught Exception (主进程未捕获异常)');
        // 建议：不要在这里直接 exit，Electron 可能会尝试弹窗
    });

    process.on('unhandledRejection', (reason) => {
        writeCrashLog(reason, 'Main Process Unhandled Rejection (主进程未处理 Promise)');
    });
}
