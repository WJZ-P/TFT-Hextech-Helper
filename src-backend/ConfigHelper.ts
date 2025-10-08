import path from 'path';
import fs from 'fs-extra';
// 从 electron 中引入 'app'，用来获取我们应用的安全数据存储路径
import {app} from 'electron';

// -------------------------------------------------------------------
// ✨ ConfigHelper 类的定义 ✨
// Definition of the ConfigHelper class
// -------------------------------------------------------------------
class ConfigHelper {
    private static instance: ConfigHelper;
    // 实例的属性，用来存储路径信息
    private readonly installPath: string;
    private readonly gameConfigPath: string;
    private readonly backupPath: string;

    private constructor(installPath: string) {
        if (!installPath) {
            throw new Error("初始化失败，必须提供一个有效的游戏安装路径！");
        }
        this.installPath = installPath;
        this.gameConfigPath = path.join(this.installPath, 'Game', 'Config');

        // 备份路径
        this.backupPath = path.join(app.getPath('userData'), 'GameConfigBackup');

        console.log(`[ConfigHelper] 游戏设置目录已设定: ${this.gameConfigPath}`);
        console.log(`[ConfigHelper] 备份将存储在: ${this.backupPath}`);
    }

    /**
     * 喵~ ✨ 这是新的初始化方法！✨
     * 在你的应用程序启动时，调用一次这个方法来设置好一切。
     * @param installPath 游戏安装目录
     */
    public static init(installPath: string): void {
        if (ConfigHelper.instance) {
            console.warn("ConfigHelper 已被初始化过！");
            return;
        }
        ConfigHelper.instance = new ConfigHelper(installPath);
    }

    private static getInstance(): ConfigHelper {
        if (!ConfigHelper.instance) {
            throw new Error("喵呜！ConfigHelper 还没有被初始化！请先在程序入口调用 init(installPath) 方法。");
        }
        return ConfigHelper.instance;
    }

    // --- 类的成员变量 (Class Member Variables) ---

    // 设置为 readonly，因为这些路径在初始化后就不应该被改变了
    public readonly installDir: string;
    public readonly gameConfigDir: string;
    public readonly backupDir: string;

    // --- 核心功能方法 (Core Function Methods) ---

    /**
     * 备份当前的游戏设置
     * @description 把游戏目录的 Config 文件夹完整地拷贝到我们应用的备份目录里
     */
    public static async backup(): Promise<void> {
        const instance = ConfigHelper.getInstance();

        const sourceExists = await fs.pathExists(instance.gameConfigPath);
        if (!sourceExists) {
            throw new Error(`喵~ 备份失败！找不到游戏设置目录：${instance.gameConfigPath}`);
        }

        try {
            await fs.emptyDir(instance.backupPath);
            await fs.copy(instance.gameConfigPath, instance.backupPath);
            console.log('喵！设置备份成功！');
        } catch (err) {
            console.error('备份过程中发生错误:', err);
            throw new Error('喵~ 备份失败了，请检查控制台的错误信息。');
        }
    }

    /**
     * 从备份恢复游戏设置
     * @description 把我们备份的 Config 文件夹拷贝回游戏目录
     */
    public static async restore(): Promise<void> {
        const instance = ConfigHelper.getInstance();

        const backupExists = await fs.pathExists(instance.backupPath);
        if (!backupExists) {
            throw new Error(`喵~ 恢复失败！找不到备份目录：${instance.backupPath}`);
        }

        try {
            // 为安全起见，先清空目标文件夹再恢复
            await fs.copy(instance.backupPath, instance.gameConfigPath);
            console.log('设置恢复成功！');
        } catch (err) {
            console.error('恢复过程中发生错误:', err);
            throw new Error('恢复失败了，请检查控制台的错误信息。');
        }
    }
}

// 导出这个类，方便在其他地方 import
export default ConfigHelper;
