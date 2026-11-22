import path from 'path';
import fs from 'fs-extra';
import * as crypto from 'crypto';
import { execFile } from 'child_process';
// 从 electron 中引入 'app'，用来获取我们应用的安全数据存储路径
import {app} from 'electron';
import {logger} from "./Logger.ts";

/**
 * 云顶之弈（虚幻客户端）设置文件所在的根目录：%LOCALAPPDATA%\TFT\Saved
 */
const TFT_SAVED_DIR = path.join(process.env.LOCALAPPDATA || path.join(app.getPath('home'), 'AppData', 'Local'), 'TFT', 'Saved');

/**
 * 需要备份的内容（相对 TFT_SAVED_DIR 的子目录）
 *   - Config/WindowsClient：GameUserSettings.ini（分辨率、窗口模式、画质、音量）和 Engine.ini
 *   - SaveGames：EnhancedInputUserSettings.sav（按键绑定）
 */
const BACKUP_ITEMS = [path.join('Config', 'WindowsClient'), 'SaveGames'];

/** 恢复后用来校验的关键文件 */
const KEY_FILE = path.join('Config', 'WindowsClient', 'GameUserSettings.ini');

/** 云顶之弈客户端的进程名 */
const TFT_PROCESS_EXE = 'TFTTencentClient-Win64-Shipping.exe';

// -------------------------------------------------------------------
// GameConfigHelper 类的定义
// 负责云顶之弈客户端设置的手动备份与恢复
//
// 注意：虚幻客户端只在启动时读取这些文件、退出时把内存里的设置写回去，
//       所以客户端运行时恢复是无效的（退出时会被覆盖），恢复前必须先关闭客户端。
//       挂机时需要的固定画面尺寸改由 TftWindowLocator 在运行时调整窗口大小实现，不再改配置文件。
// -------------------------------------------------------------------
class GameConfigHelper {
    private static instance: GameConfigHelper;
    /** 主备份路径（软件根目录下） */
    private readonly primaryBackupPath: string;
    /** 备用备份路径（C盘 userData，作为兜底） */
    private readonly fallbackBackupPath: string;
    /** 当前实际使用的备份路径 */
    private currentBackupPath: string;

    private constructor() {
        // 主路径：软件根目录下的 GameConfig/TFTUserConfig
        // - 开发环境：项目根目录/public/GameConfig/TFTUserConfig
        // - 生产环境：应用根目录/resources/GameConfig/TFTUserConfig
        if (app.isPackaged) {
            this.primaryBackupPath = path.join(process.resourcesPath, 'GameConfig', 'TFTUserConfig');
        } else {
            this.primaryBackupPath = path.join(app.getAppPath(), 'public', 'GameConfig', 'TFTUserConfig');
        }

        // 兜底路径：C盘用户数据目录（当主路径写入失败时使用）
        this.fallbackBackupPath = path.join(app.getPath('userData'), 'TFTConfigBackup');

        // 默认使用主路径
        this.currentBackupPath = this.primaryBackupPath;

        logger.debug(`[ConfigHelper] 云顶之弈设置目录: ${TFT_SAVED_DIR}`);
        logger.debug(`[ConfigHelper] 备份主路径: ${this.primaryBackupPath}`);
        logger.debug(`[ConfigHelper] 备份兜底路径: ${this.fallbackBackupPath}`);
    }

    /**
     * 初始化（应用启动时调用一次）
     */
    public static init(): void {
        if (GameConfigHelper.instance) {
            console.warn("[GameConfigHelper] GameConfigHelper 已被初始化过！");
            return;
        }
        GameConfigHelper.instance = new GameConfigHelper();
    }

    public static getInstance(): GameConfigHelper | null {
        if (!GameConfigHelper.instance) {
            console.error("[GameConfigHelper] GameConfigHelper 还没有被初始化！请先在程序入口调用 init() 方法。");
            return null
        }
        return GameConfigHelper.instance;
    }

    // --- 核心功能方法 (Core Function Methods) ---

    /**
     * 备份当前的云顶之弈设置
     * @description 把设置文件拷贝到备份目录，优先使用软件根目录，失败则使用 C 盘 userData 作为兜底。
     *              客户端运行中也可以备份（备份的是客户端上次写回的设置）。
     * @returns true 表示备份成功, false 表示备份失败
     */
    public static async backup(): Promise<boolean> {
        const instance = GameConfigHelper.getInstance();
        if (!instance) return false;

        if (!await fs.pathExists(path.join(TFT_SAVED_DIR, KEY_FILE))) {
            logger.error(`备份失败！找不到云顶之弈设置文件：${path.join(TFT_SAVED_DIR, KEY_FILE)}（客户端至少要启动过一次）`);
            return false;
        }

        for (const target of [instance.primaryBackupPath, instance.fallbackBackupPath]) {
            try {
                await instance.copyItems(TFT_SAVED_DIR, target);
                instance.currentBackupPath = target;
                logger.info(`云顶之弈设置备份成功！路径: ${target}`);
                return true;
            } catch (err) {
                logger.warn(`备份路径写入失败: ${target}，原因: ${err}`);
            }
        }
        logger.error(`备份失败！主路径和兜底路径均不可用`);
        return false;
    }

    /**
     * 从备份恢复云顶之弈设置
     * @description 客户端运行中会拒绝恢复：它退出时会把内存里的设置写回文件，恢复的内容会被覆盖。
     *              会自动检测备份文件存在于哪个路径（当前路径、主路径或兜底路径）。
     * @returns true 表示恢复成功
     */
    public static async restore(): Promise<boolean> {
        const instance = GameConfigHelper.getInstance();
        if (!instance) return false;

        if (await GameConfigHelper.isTftClientRunning()) {
            logger.error(`恢复失败！云顶之弈客户端正在运行，请先关闭客户端再恢复设置（否则客户端退出时会覆盖恢复的设置）`);
            return false;
        }

        let backupPath: string | null = null;
        for (const candidate of [instance.currentBackupPath, instance.primaryBackupPath, instance.fallbackBackupPath]) {
            if (await fs.pathExists(path.join(candidate, KEY_FILE))) {
                backupPath = candidate;
                break;
            }
        }
        if (!backupPath) {
            logger.error(`恢复失败！找不到备份（已检查主路径和兜底路径），请先备份一次`);
            return false;
        }

        try {
            await instance.copyItems(backupPath, TFT_SAVED_DIR);
        } catch (err) {
            logger.error(`恢复失败！写入云顶之弈设置目录出错: ${err}`);
            return false;
        }

        // 恢复后校验关键文件
        const [backupHash, currentHash] = await Promise.all([
            instance.getFileHash(path.join(backupPath, KEY_FILE)),
            instance.getFileHash(path.join(TFT_SAVED_DIR, KEY_FILE)),
        ]);
        if (backupHash !== currentHash) {
            logger.error(`恢复后校验失败！GameUserSettings.ini 与备份不一致`);
            return false;
        }

        logger.info(`云顶之弈设置恢复成功！来源: ${backupPath}`);
        return true;
    }

    /**
     * 云顶之弈客户端是否正在运行
     */
    public static isTftClientRunning(): Promise<boolean> {
        return new Promise(resolve => {
            execFile('tasklist', ['/FI', `IMAGENAME eq ${TFT_PROCESS_EXE}`, '/FO', 'CSV', '/NH'], { windowsHide: true }, (err, stdout) => {
                // tasklist 查询失败时按"未运行"处理，不阻塞用户操作
                resolve(!err && stdout.toLowerCase().includes(TFT_PROCESS_EXE.toLowerCase()));
            });
        });
    }

    /**
     * 把 BACKUP_ITEMS 中存在的子目录从 fromRoot 拷贝到 toRoot（保持相对路径）
     */
    private async copyItems(fromRoot: string, toRoot: string): Promise<void> {
        for (const item of BACKUP_ITEMS) {
            const source = path.join(fromRoot, item);
            if (!await fs.pathExists(source)) continue;
            const target = path.join(toRoot, item);
            await fs.ensureDir(target);
            await fs.copy(source, target, { overwrite: true });
        }
    }

    /**
     * 计算文件的 MD5 哈希值
     * @param filePath 文件路径
     * @returns 文件的 MD5 哈希字符串
     */
    private async getFileHash(filePath: string): Promise<string> {
        const content = await fs.readFile(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    }
}

// 导出这个类，方便在其他地方 import
export default GameConfigHelper;
