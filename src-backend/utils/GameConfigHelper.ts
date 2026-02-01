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
    /** 主备份路径（软件根目录下） */
    private readonly primaryBackupPath: string;
    /** 备用备份路径（C盘 userData，作为兜底） */
    private readonly fallbackBackupPath: string;
    /** 当前实际使用的备份路径 */
    private currentBackupPath: string;
    private readonly tftConfigPath: string;  // 预设的云顶设置

    public isTFTConfig: boolean = false;

    private constructor(installPath: string) {
        if (!installPath) {
            throw new Error("初始化失败，必须提供一个有效的游戏安装路径！");
        }
        this.installPath = installPath;
        this.gameConfigPath = path.join(this.installPath, 'Game', 'Config');

        // 备份路径配置
        // 主路径：软件根目录下的 GameConfig/UserConfig
        // - 开发环境：项目根目录/public/GameConfig/UserConfig
        // - 生产环境：应用根目录/resources/GameConfig/UserConfig
        if (app.isPackaged) {
            this.primaryBackupPath = path.join(process.resourcesPath, 'GameConfig', 'UserConfig');
        } else {
            this.primaryBackupPath = path.join(app.getAppPath(), 'public', 'GameConfig', 'UserConfig');
        }
        
        // 兜底路径：C盘用户数据目录（当主路径写入失败时使用）
        this.fallbackBackupPath = path.join(app.getPath('userData'), 'GameConfigBackup');
        
        // 默认使用主路径
        this.currentBackupPath = this.primaryBackupPath;
        
        // 预设云顶配置路径
        // 开发环境：项目根目录/public/GameConfig/TFTConfig
        // 生产环境：应用资源目录/GameConfig/TFTConfig
        if (app.isPackaged) {
            this.tftConfigPath = path.join(process.resourcesPath, 'GameConfig', 'TFTConfig');
        } else {
            this.tftConfigPath = path.join(app.getAppPath(), 'public', 'GameConfig', 'TFTConfig');
        }

        logger.debug(`[ConfigHelper] 游戏设置目录已设定: ${this.gameConfigPath}`);
        logger.debug(`[ConfigHelper] 主备份路径: ${this.primaryBackupPath}`);
        logger.debug(`[ConfigHelper] 兜底备份路径: ${this.fallbackBackupPath}`);
        logger.debug(`[ConfigHelper] 预设云顶之弈设置目录: ${this.tftConfigPath}`);
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
     * @description 把游戏目录的 Config 文件夹完整地拷贝到备份目录
     *              优先使用软件根目录，失败则使用 C 盘 userData 作为兜底
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
        
        // 尝试使用主备份路径（软件根目录）
        try {
            await fs.ensureDir(instance.primaryBackupPath);
            await fs.copy(instance.gameConfigPath, instance.primaryBackupPath);
            instance.currentBackupPath = instance.primaryBackupPath;
            instance.isTFTConfig = false;
            logger.info(`设置备份成功！路径: ${instance.primaryBackupPath}`);
            return true;
        } catch (primaryErr) {
            logger.warn(`主备份路径写入失败: ${primaryErr}，尝试使用兜底路径...`);
        }
        
        // 兜底：使用 C 盘 userData 路径
        try {
            await fs.ensureDir(instance.fallbackBackupPath);
            await fs.copy(instance.gameConfigPath, instance.fallbackBackupPath);
            instance.currentBackupPath = instance.fallbackBackupPath;
            instance.isTFTConfig = false;
            logger.info(`设置备份成功（使用兜底路径）！路径: ${instance.fallbackBackupPath}`);
            return true;
        } catch (fallbackErr) {
            logger.error(`备份失败！主路径和兜底路径均不可用: ${fallbackErr}`);
            return false;
        }
    }

    /**
     * 应用预设的云顶设置
     * @description 用 TFTConfig 完全覆盖游戏配置目录
     *              会先清空目标目录，确保没有残留文件
     */
    public static async applyTFTConfig(): Promise<boolean> {
        const instance = GameConfigHelper.getInstance();
        if (!instance) {
            logger.error("[GameConfigHelper] applyTFTConfig 错误：尚未初始化！")
            return false
        }
        const pathExist = await fs.pathExists(instance.tftConfigPath)
        if (!pathExist) {
            logger.error(`应用云顶设置失败！找不到设置目录：${instance.tftConfigPath}`);
            return false
        }
        
        try {
            // 复制 TFT 配置
            await fs.copy(instance.tftConfigPath, instance.gameConfigPath);
            instance.isTFTConfig = true;
            logger.info('[GameConfigHelper] 云顶挂机游戏设置应用成功！');
            return true;
        } catch (e: unknown) {
            logger.error(`[GameConfigHelper] 云顶设置应用失败: ${e}`);
            return false;
        }
    }

    /**
     * 从备份恢复游戏设置
     * @description 把我们备份的 Config 文件夹拷贝回游戏目录
     *              会自动检测备份文件存在于哪个路径（主路径或兜底路径）
     * @param retryCount 重试次数，默认 3 次
     * @param retryDelay 重试间隔（毫秒），默认 1000ms
     */
    public static async restore(retryCount: number = 3, retryDelay: number = 1000): Promise<boolean> {
        const instance = GameConfigHelper.getInstance();
        if (!instance) {
            console.log("[GameConfigHelper] restore错误。尚未初始化！")
            return false
        }

        // 确定备份文件所在路径
        // 优先检查当前记录的路径，然后检查主路径，最后检查兜底路径
        let backupPath: string | null = null;
        
        if (await fs.pathExists(instance.currentBackupPath)) {
            backupPath = instance.currentBackupPath;
        } else if (await fs.pathExists(instance.primaryBackupPath)) {
            backupPath = instance.primaryBackupPath;
        } else if (await fs.pathExists(instance.fallbackBackupPath)) {
            backupPath = instance.fallbackBackupPath;
        }
        
        if (!backupPath) {
            logger.error(`恢复设置失败！找不到备份目录（已检查主路径和兜底路径）`);
            return false;
        }
        
        logger.debug(`[GameConfigHelper] 从备份恢复设置，备份路径: ${backupPath}`);
        
        // 带重试的恢复逻辑
        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                // 从备份恢复
                await fs.copy(backupPath, instance.gameConfigPath);
                instance.isTFTConfig = false;
                logger.info(`[GameConfigHelper] 设置恢复成功！`);
                return true;
            } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : String(err);
                // 检查是否是文件被占用的错误 (Windows EBUSY / EPERM)
                const isFileLocked = errMsg.includes('EBUSY') || errMsg.includes('EPERM') || errMsg.includes('resource busy');
                
                if (attempt < retryCount && isFileLocked) {
                    logger.warn(`[GameConfigHelper] 配置文件被占用，${retryDelay}ms 后重试 (${attempt}/${retryCount})...`);
                    await sleep(retryDelay);
                } else {
                    logger.error(`[GameConfigHelper] 恢复设置失败 (尝试 ${attempt}/${retryCount}): ${errMsg}`);
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
