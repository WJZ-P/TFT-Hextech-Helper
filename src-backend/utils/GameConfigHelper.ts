import path from 'path';
import fs from 'fs-extra';
// 从 electron 中引入 'app'，用来获取我们应用的安全数据存储路径
import {app} from 'electron';
import {logger} from "./Logger.ts";

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
     */
    public static async restore(): Promise<boolean> {
        const instance = GameConfigHelper.getInstance();
        if (!instance) {
            console.log("[GameConfigHelper] restore错误。尚未初始化！")
            return false
        }

        const backupExists = await fs.pathExists(instance.backupPath);
        if (!backupExists) {
            console.error(`恢复设置失败！找不到备份目录：${instance.backupPath}`);
            // TODO: Toast
            return false
        }
        try {
            // 为安全起见，先清空目标文件夹再恢复
            await fs.copy(instance.backupPath, instance.gameConfigPath);
            logger.info('设置恢复成功！');
            // TODO: Toast
        } catch (err) {
            console.error('恢复过程中发生错误:', err);
            return false
        }
        return true
    }
}

// 导出这个类，方便在其他地方 import
export default GameConfigHelper;
