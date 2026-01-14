import path from 'path';
import fs from 'fs-extra';
// 从 electron 中引入 'app'，用来获取我们应用的安全数据存储路径
import {app} from 'electron';
import {logger} from "./Logger.ts";
import {sleep} from "./HelperTools.ts";

// -------------------------------------------------------------------
// ✨ GameConfigHelper 类的定义 ✨
// Definition of the GameConfigHelper class
// -------------------------------------------------------------------
class GameConfigHelper {
    private static instance: GameConfigHelper;
    // 实例的属性，用来存储路径信息
    private readonly installPath: string;
    private readonly gameConfigPath: string;
    private readonly backupPath: string;
    private readonly tftConfigPath: string;//   预设的云顶设置

    public isTFTConfig: boolean = false;

    private constructor(installPath: string) {
        if (!installPath) {
            throw new Error("初始化失败，必须提供一个有效的游戏安装路径！");
        }
        this.installPath = installPath;
        this.gameConfigPath = path.join(this.installPath, 'Game', 'Config');

        // 备份路径
        this.backupPath = path.join(app.getPath('userData'), 'GameConfigBackup');
        //  预设云顶配置路径
        this.tftConfigPath = path.join(app.getAppPath(), 'public', 'GameConfig', 'TFTConfig')

        console.log(`[ConfigHelper] 游戏设置目录已设定: ${this.gameConfigPath}`);
        console.log(`[ConfigHelper] 备份将存储在: ${this.backupPath}`);
        console.log(`[ConfigHelper] 预设云顶之弈设置目录: ${this.tftConfigPath}`);
    }

    /**
     * 喵~ ✨ 这是新的初始化方法！✨
     * 在你的应用程序启动时，调用一次这个方法来设置好一切。
     * @param installPath 游戏安装目录
     */
    public static init(installPath: string): void {
        if (GameConfigHelper.instance) {
            console.warn("[GameConfigHelper] GameConfigHelper 已被初始化过！");
            return;
        }
        GameConfigHelper.instance = new GameConfigHelper(installPath);
    }

    public static getInstance(): GameConfigHelper | null {
        if (!GameConfigHelper.instance) {
            console.error("[GameConfigHelper]GameConfigHelper 还没有被初始化！请先在程序入口调用 init(installPath) 方法。");
            return null
        }
        return GameConfigHelper.instance;
    }

    // --- 核心功能方法 (Core Function Methods) ---

    /**
     * 备份当前的游戏设置
     * @description 把游戏目录的 Config 文件夹完整地拷贝到我们应用的备份目录里
     */
    public static async backup(): Promise<boolean> {
        const instance = GameConfigHelper.getInstance();
        if (!instance) {
            //  LOL未启动
            return false
        }
        const sourceExists = await fs.pathExists(instance.gameConfigPath);
        if (!sourceExists) {
            logger.error(`备份失败！找不到游戏设置目录：${instance.gameConfigPath}`);
            return false
        }
        try {
            await fs.emptyDir(instance.backupPath);
            await fs.copy(instance.gameConfigPath, instance.backupPath);
            instance.isTFTConfig = false;
            logger.info('设置备份成功！');
        } catch (err) {
            logger.error(`备份过程中发生错误:,${err}`);
            return false
        }
        return true
    }

    /**
     * 应用预设的云顶设置
     */
    public static async applyTFTConfig(): Promise<boolean> {
        const instance = GameConfigHelper.getInstance();
        if (!instance) {
            logger.info("[GameConfigHelper] restore错误。尚未初始化！")
            return false
        }
        const pathExist = await fs.pathExists(instance.tftConfigPath)
        if (!pathExist) {
            logger.error(`应用云顶设置失败！找不到设置目录：${instance.tftConfigPath}`);
            // TODO: Toast
            return false
        }
        //  应用设置
        try {
            await fs.copy(instance.tftConfigPath, instance.gameConfigPath)
            logger.info('云顶挂机游戏设置应用成功！')
            instance.isTFTConfig = true;
        } catch (e: unknown) {
            logger.error(`云顶设置应用失败！,${e}`)
            return false
        }
        return true
    }

    /**
     * 从备份恢复游戏设置
     * @description 把我们备份的 Config 文件夹拷贝回游戏目录
     * @important 必须先清空目标目录，否则 TFT 配置文件可能残留！
     * @param retryCount 重试次数，默认 3 次
     * @param retryDelay 重试间隔（毫秒），默认 1000ms
     */
    public static async restore(retryCount: number = 3, retryDelay: number = 1000): Promise<boolean> {
        const instance = GameConfigHelper.getInstance();
        if (!instance) {
            console.log("[GameConfigHelper] restore错误。尚未初始化！")
            return false
        }

        const backupExists = await fs.pathExists(instance.backupPath);
        if (!backupExists) {
            console.error(`恢复设置失败！找不到备份目录：${instance.backupPath}`);
            return false
        }
        
        // 带重试的恢复逻辑
        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                // 🔑 关键修复：先清空游戏配置目录，再从备份恢复
                // 如果不清空，TFT 配置的文件可能会残留（fs.copy 默认只覆盖同名文件）
                await fs.emptyDir(instance.gameConfigPath);
                await fs.copy(instance.backupPath, instance.gameConfigPath, {
                    overwrite: true,       // 强制覆盖已存在的文件
                    errorOnExist: false,   // 文件存在时不报错
                });
                instance.isTFTConfig = false;  // 标记当前不是 TFT 配置
                return true;
            } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : String(err);
                // 检查是否是文件被占用的错误 (Windows EBUSY / EPERM)
                const isFileLocked = errMsg.includes('EBUSY') || errMsg.includes('EPERM') || errMsg.includes('resource busy');
                
                if (attempt < retryCount && isFileLocked) {
                    logger.warn(`[GameConfigHelper] 配置文件被占用，${retryDelay}ms 后重试 (${attempt}/${retryCount})...`);
                    await sleep(retryDelay);
                } else {
                    console.error(`[GameConfigHelper] 恢复设置失败 (尝试 ${attempt}/${retryCount}):`, err);
                    if (attempt === retryCount) {
                        return false;
                    }
                }
            }
        }
        return false;
    }
}

// 导出这个类，方便在其他地方 import
export default GameConfigHelper;
