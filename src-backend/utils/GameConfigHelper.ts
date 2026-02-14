import path from 'path';
import fs from 'fs-extra';
import * as crypto from 'crypto';
// 从 electron 中引入 'app'，用来获取我们应用的安全数据存储路径
import {app} from 'electron';
import {logger} from "./Logger.ts";
import {sleep} from "./HelperTools.ts";

// -------------------------------------------------------------------
// GameConfigHelper 类的定义
// 负责游戏配置文件的备份、恢复、TFT 配置覆盖以及长期守护
// -------------------------------------------------------------------
class GameConfigHelper {
    private static instance: GameConfigHelper;
    // 实例的属性，用来存储路径信息
    private readonly installPath: string;
    private readonly gameConfigPath: string;
    /** 主备份路径（软件根目录下）—— 用于用户手动备份/恢复 */
    private readonly primaryBackupPath: string;
    /** 备用备份路径（C盘 userData，作为兜底）—— 用于用户手动备份/恢复 */
    private readonly fallbackBackupPath: string;
    /** 当前实际使用的手动备份路径 */
    private currentBackupPath: string;
    /** 临时备份路径 —— 仅用于挂机启动/结束时的自动备份恢复，与用户手动备份完全隔离 */
    private readonly tempBackupPath: string;
    private readonly tftConfigPath: string;  // 预设的云顶设置

    public isTFTConfig: boolean = false;

    /** TFT 下棋配置中 game.cfg 的 MD5 哈希值（在 applyTFTConfig 时记录） */
    private tftConfigHash: string = '';

    /** 文件监听器实例，用于长期守护恢复后的配置不被 LOL 客户端覆盖 */
    private configWatcher: fs.FSWatcher | null = null;
    /** 防抖定时器，避免短时间内触发多次恢复 */
    private watcherDebounceTimer: NodeJS.Timeout | null = null;
    /** 守护期间允许的最大自动恢复次数，防止无限循环 */
    private readonly MAX_GUARD_RESTORES = 1;
    /** 守护期间已执行的自动恢复次数 */
    private guardRestoreCount = 0;

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

        // 临时备份路径：用于挂机启动/结束的自动备份恢复
        // 与用户手动备份（UserConfig）完全隔离，互不覆盖
        if (app.isPackaged) {
            this.tempBackupPath = path.join(process.resourcesPath, 'GameConfig', 'TempConfig');
        } else {
            this.tempBackupPath = path.join(app.getAppPath(), 'public', 'GameConfig', 'TempConfig');
        }
        
        // 预设云顶配置路径
        // 开发环境：项目根目录/public/GameConfig/TFTConfig
        // 生产环境：应用资源目录/GameConfig/TFTConfig
        if (app.isPackaged) {
            this.tftConfigPath = path.join(process.resourcesPath, 'GameConfig', 'TFTConfig');
        } else {
            this.tftConfigPath = path.join(app.getAppPath(), 'public', 'GameConfig', 'TFTConfig');
        }

        logger.debug(`[ConfigHelper] 游戏设置目录已设定: ${this.gameConfigPath}`);
        logger.debug(`[ConfigHelper] 手动备份主路径: ${this.primaryBackupPath}`);
        logger.debug(`[ConfigHelper] 手动备份兜底路径: ${this.fallbackBackupPath}`);
        logger.debug(`[ConfigHelper] 临时备份路径: ${this.tempBackupPath}`);
        logger.debug(`[ConfigHelper] 预设云顶之弈设置目录: ${this.tftConfigPath}`);

        // 预计算 TFT 下棋配置的 game.cfg 哈希值
        // 后续备份时用于比对：如果用户当前配置哈希 === TFT 配置哈希，说明恢复失败了
        this.initTftConfigHash();
    }

    /**
     * 预计算 TFT 下棋配置 game.cfg 的哈希值
     * 这个哈希在整个软件生命周期内不会变化（TFT 配置是预设的固定文件）
     */
    private async initTftConfigHash(): Promise<void> {
        try {
            const tftGameCfg = path.join(this.tftConfigPath, 'game.cfg');
            if (await fs.pathExists(tftGameCfg)) {
                this.tftConfigHash = await this.getFileHash(tftGameCfg);
                logger.debug(`[ConfigHelper] TFT 配置哈希: ${this.tftConfigHash}`);
            }
        } catch (err) {
            logger.warn(`[ConfigHelper] 计算 TFT 配置哈希失败: ${err}`);
        }
    }

    /**
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
     * 
     * 安全检查：备份前会检测当前游戏配置是否为 TFT 下棋配置
     * 如果是，说明上次恢复失败了，此时不应该备份（否则会用错误配置覆盖正确备份）
     * 
     * @returns true 表示备份成功, false 表示备份失败或被拒绝
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
        
        // 安全检查：检测当前配置是否为 TFT 下棋配置
        // 如果用户的 game.cfg 哈希和我们预设的 TFT 配置哈希一致
        // 说明上次恢复失败了，当前配置就是我们的低分辨率挂机配置
        // 此时绝对不能备份，否则"正确的用户备份"会被"错误的 TFT 配置"覆盖
        const isTftConfig = await instance.isCurrentConfigTFT();
        if (isTftConfig) {
            logger.error(`[ConfigHelper] 备份被拒绝！当前游戏配置与 TFT 下棋配置一致，说明上次恢复失败`);
            logger.error(`[ConfigHelper] 将使用已有的备份进行恢复...`);

            // 自动尝试恢复
            await GameConfigHelper.restore(3, 1500);
            return false;
        }
        
        // 通过安全检查，正常备份
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
     * 检测当前游戏配置是否为 TFT 下棋配置
     * 
     * 通过比对当前 game.cfg 的哈希值和预设 TFT 配置的哈希值来判断
     * 如果一致，说明当前游戏还在用我们的低分辨率挂机配置
     * 
     * @returns true 表示当前配置是 TFT 下棋配置
     */
    private async isCurrentConfigTFT(): Promise<boolean> {
        if (!this.tftConfigHash) return false;  // 哈希还没算好，跳过检查
        
        try {
            const currentGameCfg = path.join(this.gameConfigPath, 'game.cfg');
            if (!await fs.pathExists(currentGameCfg)) return false;
            
            const currentHash = await this.getFileHash(currentGameCfg);
            const isTft = currentHash === this.tftConfigHash;
            
            if (isTft) {
                logger.warn(`[ConfigHelper] 当前 game.cfg 哈希 (${currentHash}) 与 TFT 配置完全一致！`);
            }
            return isTft;
        } catch (err) {
            logger.warn(`[ConfigHelper] 检测 TFT 配置失败: ${err}`);
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
                
                // 恢复后验证关键文件是否一致
                const verified = await instance.verifyRestore(backupPath);
                if (verified) {
                    logger.info(`[GameConfigHelper] 设置恢复成功，文件验证通过！`);
                } else {
                    logger.warn(`[GameConfigHelper] 设置恢复完成，但文件验证不一致！可能被外部程序覆盖`);
                    // 验证不一致时再尝试一次强制恢复
                    if (attempt < retryCount) {
                        logger.info(`[GameConfigHelper] 将在 ${retryDelay}ms 后重试...`);
                        await sleep(retryDelay);
                        continue;
                    }
                }
                
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

    /**
     * 临时备份当前游戏配置（挂机启动时调用）
     * @description 与用户手动备份完全隔离，写入 TempConfig/ 目录。
     *              每次挂机启动都会覆盖上一次的临时备份，保证恢复的是最新状态。
     *              即使临时备份失败也不影响用户手动备份的数据安全。
     * 
     * 安全检查逻辑与 backup() 一致：如果当前配置就是 TFT 挂机配置，
     * 说明上次恢复失败，拒绝备份并尝试从临时备份恢复。
     * 
     * @returns true 表示备份成功
     */
    public static async tempBackup(): Promise<boolean> {
        const instance = GameConfigHelper.getInstance();
        if (!instance) return false;

        const sourceExists = await fs.pathExists(instance.gameConfigPath);
        if (!sourceExists) {
            logger.error(`[ConfigHelper] 临时备份失败！找不到游戏设置目录：${instance.gameConfigPath}`);
            return false;
        }

        // 安全检查：如果当前配置已经是 TFT 挂机配置，说明上次恢复失败
        const isTftConfig = await instance.isCurrentConfigTFT();
        if (isTftConfig) {
            logger.error(`[ConfigHelper] 临时备份被拒绝！当前配置是 TFT 挂机配置，上次恢复可能失败`);
            logger.error(`[ConfigHelper] 尝试从临时备份恢复...`);
            await GameConfigHelper.tempRestore(3, 1500);
            return false;
        }

        try {
            await fs.ensureDir(instance.tempBackupPath);
            await fs.copy(instance.gameConfigPath, instance.tempBackupPath);
            instance.isTFTConfig = false;
            logger.info(`[ConfigHelper] 临时备份成功！路径: ${instance.tempBackupPath}`);
            return true;
        } catch (err) {
            logger.error(`[ConfigHelper] 临时备份失败: ${err}`);
            return false;
        }
    }

    /**
     * 从临时备份恢复游戏配置（挂机结束时调用）
     * @description 只从 TempConfig/ 目录读取，不会影响 UserConfig/ 中的用户手动备份。
     *              带重试机制，防止 LOL 客户端占用文件。
     * 
     * @param retryCount 重试次数，默认 3 次
     * @param retryDelay 重试间隔（毫秒），默认 1000ms
     * @returns true 表示恢复成功
     */
    public static async tempRestore(retryCount: number = 3, retryDelay: number = 1000): Promise<boolean> {
        const instance = GameConfigHelper.getInstance();
        if (!instance) {
            logger.error("[ConfigHelper] tempRestore 错误：尚未初始化！");
            return false;
        }

        // 临时备份只有一个目录，不需要多路径查找
        if (!await fs.pathExists(instance.tempBackupPath)) {
            logger.error(`[ConfigHelper] 临时恢复失败！找不到临时备份目录: ${instance.tempBackupPath}`);
            // 临时备份不存在时，降级尝试从用户手动备份恢复
            logger.warn(`[ConfigHelper] 降级：尝试从用户手动备份恢复...`);
            return GameConfigHelper.restore(retryCount, retryDelay);
        }

        logger.debug(`[ConfigHelper] 从临时备份恢复设置，路径: ${instance.tempBackupPath}`);

        // 带重试的恢复逻辑（与 restore 一致）
        for (let attempt = 1; attempt <= retryCount; attempt++) {
            try {
                await fs.copy(instance.tempBackupPath, instance.gameConfigPath);
                instance.isTFTConfig = false;

                // 验证恢复结果
                const verified = await instance.verifyRestore(instance.tempBackupPath);
                if (verified) {
                    logger.info(`[ConfigHelper] 临时恢复成功，文件验证通过！`);
                } else {
                    logger.warn(`[ConfigHelper] 临时恢复完成，但文件验证不一致！`);
                    if (attempt < retryCount) {
                        logger.info(`[ConfigHelper] 将在 ${retryDelay}ms 后重试...`);
                        await sleep(retryDelay);
                        continue;
                    }
                }
                return true;
            } catch (err: unknown) {
                const errMsg = err instanceof Error ? err.message : String(err);
                const isFileLocked = errMsg.includes('EBUSY') || errMsg.includes('EPERM') || errMsg.includes('resource busy');

                if (attempt < retryCount && isFileLocked) {
                    logger.warn(`[ConfigHelper] 文件被占用，${retryDelay}ms 后重试 (${attempt}/${retryCount})...`);
                    await sleep(retryDelay);
                } else {
                    logger.error(`[ConfigHelper] 临时恢复失败 (${attempt}/${retryCount}): ${errMsg}`);
                    if (attempt === retryCount) return false;
                }
            }
        }
        return false;
    }

    /**
     * 验证恢复结果：对比备份目录和游戏配置目录中的关键文件哈希值
     * 
     * 只对比最关键的 game.cfg 文件，因为它包含分辨率、画质等核心设置
     * 使用 MD5 哈希快速比较文件内容是否一致
     * 
     * @param backupPath 备份目录路径
     * @returns true 表示恢复后的文件与备份一致
     */
    private async verifyRestore(backupPath: string): Promise<boolean> {
        // game.cfg 是最关键的配置文件，包含分辨率、画质等设置
        const keyFile = 'game.cfg';
        const backupFile = path.join(backupPath, keyFile);
        const gameFile = path.join(this.gameConfigPath, keyFile);

        try {
            const [backupExists, gameExists] = await Promise.all([
                fs.pathExists(backupFile),
                fs.pathExists(gameFile)
            ]);
            
            if (!backupExists || !gameExists) {
                logger.warn(`[ConfigGuard] 验证跳过：文件不存在 (备份: ${backupExists}, 游戏: ${gameExists})`);
                return true;  // 文件缺失时不算验证失败
            }

            // 读取两个文件并计算 MD5 哈希值进行比较
            const [backupHash, gameHash] = await Promise.all([
                this.getFileHash(backupFile),
                this.getFileHash(gameFile)
            ]);

            const match = backupHash === gameHash;
            if (!match) {
                logger.warn(`[ConfigGuard] game.cfg 哈希不匹配！备份: ${backupHash}, 游戏: ${gameHash}`);
            }
            return match;
        } catch (err) {
            logger.warn(`[ConfigGuard] 验证过程出错: ${err}`);
            return true;  // 验证出错时不阻塞流程
        }
    }

    /**
     * 计算文件的 MD5 哈希值
     * 
     * crypto.createHash('md5') 创建一个哈希计算器
     * digest('hex') 将计算结果转为十六进制字符串（如 "d41d8cd98f00b204e9800998ecf8427e"）
     * 
     * @param filePath 文件路径
     * @returns 文件的 MD5 哈希字符串
     */
    private async getFileHash(filePath: string): Promise<string> {
        const content = await fs.readFile(filePath);
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * 启动长期配置守护监听器
     * 
     * 在 restore 成功后调用，持续监听游戏配置目录的文件变化。
     * 守护跟随软件生命周期运行，直到以下情况之一才停止：
     *   1. 调用 stopConfigGuard()（下次开始挂机前、软件退出时）
     *   2. 达到最大自动恢复次数（防止无限互相覆盖）
     * 
     * 守护逻辑：
     *   检测到 game.cfg 被修改 → 计算哈希 → 如果变成了 TFT 下棋配置 → 自动从临时备份恢复
     *   这样就能应对"中途退出软件功能 → 游戏结束 → LOL 写入下棋配置"的场景
     */
    public static startConfigGuard(): void {
        const instance = GameConfigHelper.getInstance();
        if (!instance) return;
        
        // 先停止之前可能存在的守护
        GameConfigHelper.stopConfigGuard();
        instance.guardRestoreCount = 0;
        
        logger.info(`[ConfigGuard] 启动长期配置守护（跟随软件生命周期）`);
        
        try {
            // fs.watch 监听目录变化，当目录内任何文件被修改/创建/删除时触发回调
            // recursive: true 表示递归监听子目录（Windows 支持）
            instance.configWatcher = fs.watch(
                instance.gameConfigPath,
                { recursive: true },
                (_eventType: string, filename: string | null) => {
                    // 只关注 game.cfg 的变化（最关键的配置文件）
                    if (!filename || !filename.toLowerCase().includes('game.cfg')) return;
                    
                    // 如果当前正在使用 TFT 配置（挂机中），不需要守护
                    if (instance.isTFTConfig) return;
                    
                    // 达到最大恢复次数，停止守护
                    if (instance.guardRestoreCount >= instance.MAX_GUARD_RESTORES) {
                        logger.warn(`[ConfigGuard] 已达最大自动恢复次数 (${instance.MAX_GUARD_RESTORES})，停止守护`);
                        GameConfigHelper.stopConfigGuard();
                        return;
                    }
                    
                    // 防抖：1 秒内多次变化只处理一次
                    // LOL 客户端写配置文件时可能触发多个 change 事件
                    if (instance.watcherDebounceTimer) {
                        clearTimeout(instance.watcherDebounceTimer);
                    }
                    
                    instance.watcherDebounceTimer = setTimeout(async () => {
                        // 核心判断：当前配置是否被改成了 TFT 下棋配置
                        // 只有当配置"变成了我们的下棋配置"时才需要干预
                        // 用户自己改画质、分辨率之类的操作不会匹配 TFT 哈希
                        const isTftNow = await instance.isCurrentConfigTFT();
                        
                        if (isTftNow) {
                            instance.guardRestoreCount++;
                            logger.warn(`[ConfigGuard] 检测到配置被改为 TFT 下棋配置！自动恢复中... (第 ${instance.guardRestoreCount} 次)`);
                            
                            // 优先从临时备份恢复，临时备份不存在则依次降级
                            let backupPath: string | null = null;
                            if (await fs.pathExists(instance.tempBackupPath)) {
                                backupPath = instance.tempBackupPath;
                            } else if (await fs.pathExists(instance.currentBackupPath)) {
                                backupPath = instance.currentBackupPath;
                            } else if (await fs.pathExists(instance.primaryBackupPath)) {
                                backupPath = instance.primaryBackupPath;
                            } else if (await fs.pathExists(instance.fallbackBackupPath)) {
                                backupPath = instance.fallbackBackupPath;
                            }
                            
                            if (!backupPath) {
                                logger.error(`[ConfigGuard] 找不到任何备份目录，无法恢复`);
                                return;
                            }
                            
                            try {
                                await fs.copy(backupPath, instance.gameConfigPath);
                                const verified = await instance.verifyRestore(backupPath);
                                if (verified) {
                                    logger.info(`[ConfigGuard] 自动恢复成功，用户配置已还原`);
                                } else {
                                    logger.warn(`[ConfigGuard] 自动恢复后验证仍不一致`);
                                }
                            } catch (err) {
                                logger.error(`[ConfigGuard] 自动恢复失败: ${err}`);
                            }
                        }
                    }, 1000);
                }
            );
            
        } catch (err) {
            logger.error(`[ConfigGuard] 启动监听失败: ${err}`);
        }
    }

    /**
     * 停止配置守护监听器
     * 在以下时机调用：
     *   - 下次开始挂机前（StartState）
     *   - 软件退出时（will-quit）
     *   - 达到最大恢复次数时（自动停止）
     */
    public static stopConfigGuard(): void {
        const instance = GameConfigHelper.getInstance();
        if (!instance) return;
        
        if (instance.configWatcher) {
            instance.configWatcher.close();
            instance.configWatcher = null;
            logger.info(`[ConfigGuard] 配置守护已停止`);
        }
        if (instance.watcherDebounceTimer) {
            clearTimeout(instance.watcherDebounceTimer);
            instance.watcherDebounceTimer = null;
        }
    }
}

// 导出这个类，方便在其他地方 import
export default GameConfigHelper;
