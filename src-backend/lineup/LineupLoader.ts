/**
 * 阵容加载器
 * @description 负责加载、验证和管理阵容配置文件
 */

import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import { LineupConfig, ChampionConfig, StageConfig } from './LineupTypes';
import { getChessDataBySeason, getEquipDataBySeason } from '../TFTProtocol';
import { logger } from '../utils/Logger';


/**
 * 阵容加载器类
 * @description 单例模式，负责加载和管理所有阵容配置
 */
class LineupLoader {
    private static instance: LineupLoader;
    
    /** 已加载的阵容配置 Map<阵容ID, 阵容配置> */
    private lineups: Map<string, LineupConfig> = new Map();
    
    /** 阵容文件目录路径 */
    private lineupsDir: string;
    
    private constructor() {
        // 根据运行环境确定阵容目录路径
        // 开发环境：项目根目录/public/lineups
        // 生产环境：应用资源目录/lineups
        if (app.isPackaged) {
            this.lineupsDir = path.join(process.resourcesPath, 'lineups');
        } else {
            this.lineupsDir = path.join(__dirname, '../../../public/lineups');
        }
    }
    
    /**
     * 获取 LineupLoader 单例
     */
    public static getInstance(): LineupLoader {
        if (!LineupLoader.instance) {
            LineupLoader.instance = new LineupLoader();
        }
        return LineupLoader.instance;
    }
    
    /**
     * 加载所有阵容配置
     * @description 扫描阵容目录及其子目录，加载所有 JSON 文件
     * @returns 加载成功的阵容数量
     */
    public async loadAllLineups(): Promise<number> {
        this.lineups.clear();
        
        if (!fs.existsSync(this.lineupsDir)) {
            logger.warn(`[LineupLoader] 阵容目录不存在: ${this.lineupsDir}`);
            return 0;
        }
        
        let loadedCount = 0;
        const entries = fs.readdirSync(this.lineupsDir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.isDirectory()) {
                // 处理子目录 (如 S4, S16)
                const seasonDir = path.join(this.lineupsDir, entry.name);
                const seasonFiles = fs.readdirSync(seasonDir);
                
                for (const file of seasonFiles) {
                    if (!file.endsWith('.json')) continue;
                    if (await this.loadLineupFile(path.join(seasonDir, file), entry.name)) {
                        loadedCount++;
                    }
                }
            } else if (entry.isFile() && entry.name.endsWith('.json')) {
                // 处理根目录下的文件
                if (await this.loadLineupFile(path.join(this.lineupsDir, entry.name))) {
                    loadedCount++;
                }
            }
        }
        
        logger.info(`[LineupLoader] 共加载 ${loadedCount} 个阵容配置`);
        return loadedCount;
    }

    /**
     * 加载单个阵容文件
     * @param filePath 文件路径
     * @param season 赛季名称
     * @returns 是否加载成功
     */
    private async loadLineupFile(filePath: string, season?: string): Promise<boolean> {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const config = JSON.parse(content) as LineupConfig;
            
            // 如果传入了 season 且 config 中没有 season，则设置它
            if (season && !config.season) {
                config.season = season;
            }

            // 验证阵容配置
            const validationResult = this.validateLineup(config);
            if (!validationResult.valid) {
                logger.warn(
                    `[LineupLoader] 阵容配置验证失败 [${path.basename(filePath)}]: ${validationResult.errors.join(', ')}`
                );
                return false;
            }
            
            this.lineups.set(config.id, config);
            logger.info(`[LineupLoader] 加载阵容成功: ${config.name} (${config.id}) [Season: ${config.season || 'Unknown'}]`);
            return true;
            
        } catch (e: any) {
            logger.error(`[LineupLoader] 加载阵容失败 [${path.basename(filePath)}]: ${e.message}`);
            return false;
        }
    }
    
    /**
     * 验证阵容配置
     * @param config 阵容配置对象
     * @returns 验证结果
     */
    public validateLineup(config: LineupConfig): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        // 基础字段验证
        if (!config.id) errors.push('缺少阵容 ID');
        if (!config.name) errors.push('缺少阵容名称');
        if (!config.stages?.level8) errors.push('缺少 level8 阶段配置（必须）');
        
        // 根据阵容的赛季字段选择对应的棋子数据集和装备数据集
        // getChessDataBySeason() / getEquipDataBySeason() 集中管理赛季→数据的映射，未来加新赛季只改 TFTProtocol 一处
        const chessData = getChessDataBySeason(config.season);
        const equipData = getEquipDataBySeason(config.season);

        // 验证各阶段的棋子配置（4-10 人口，参考 OP.GG 数据范围）
        const stageKeys = ['level4', 'level5', 'level6', 'level7', 'level8', 'level9', 'level10'] as const;
        
        for (const stageKey of stageKeys) {
            const stage = config.stages?.[stageKey];
            if (!stage) continue;
            
            for (const champion of stage.champions) {
                // 验证棋子名称是否存在于数据集中
                // champion.name 已经是 ChampionKey 类型，但 JSON 解析时是 string
                // 所以这里仍需验证实际值是否有效
                if (!chessData[champion.name]) {
                    errors.push(`[${stageKey}] 未知棋子: ${champion.name}`);
                }
                
                // 验证装备名称是否存在于数据集中
                if (champion.items) {
                    for (const item of champion.items.core) {
                        if (!equipData[item]) {
                            errors.push(`[${stageKey}] 未知装备: ${item}`);
                        }
                    }
                    if (champion.items.alternatives) {
                        for (const item of champion.items.alternatives) {
                            if (!equipData[item]) {
                                errors.push(`[${stageKey}] 未知替代装备: ${item}`);
                            }
                        }
                    }
                }
                
                // 验证星级目标
                if (champion.starTarget < 1 || champion.starTarget > 3) {
                    errors.push(`[${stageKey}] ${champion.name} 星级目标无效: ${champion.starTarget}`);
                }
            }
        }
        
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    
    /**
     * 获取指定阵容配置
     * @param lineupId 阵容 ID
     * @returns 阵容配置，不存在返回 undefined
     */
    public getLineup(lineupId: string): LineupConfig | undefined {
        return this.lineups.get(lineupId);
    }
    
    /**
     * 获取所有已加载的阵容
     * @returns 阵容配置数组
     */
    public getAllLineups(): LineupConfig[] {
        return Array.from(this.lineups.values());
    }

    /**
     * 根据赛季获取阵容列表
     * @param season 赛季名称 (如 S4, S16)
     * @returns 该赛季的阵容配置数组
     */
    public getLineupsBySeason(season: string): LineupConfig[] {
        return Array.from(this.lineups.values()).filter(lineup => lineup.season === season);
    }
    
    /**
     * 获取指定人口等级的阵容配置
     * @param lineupId 阵容 ID
     * @param level 人口等级 (4-10)
     * @returns 该等级的阶段配置，不存在返回 undefined
     */
    public getStageConfig(lineupId: string, level: 4 | 5 | 6 | 7 | 8 | 9 | 10): StageConfig | undefined {
        const lineup = this.getLineup(lineupId);
        if (!lineup) return undefined;
        
        const stageKey = `level${level}` as keyof typeof lineup.stages;
        return lineup.stages[stageKey];
    }
    
    /**
     * 获取阵容中的核心棋子列表
     * @param lineupId 阵容 ID
     * @param level 人口等级（可选，不传则返回所有阶段的核心棋子）
     * @returns 核心棋子配置数组
     */
    public getCoreChampions(lineupId: string, level?: 4 | 5 | 6 | 7 | 8 | 9 | 10): ChampionConfig[] {
        const lineup = this.getLineup(lineupId);
        if (!lineup) return [];
        
        if (level) {
            const stage = this.getStageConfig(lineupId, level);
            return stage?.champions.filter(c => c.isCore) ?? [];
        }
        
        // 返回所有阶段的核心棋子（去重）
        const coreChampions = new Map<string, ChampionConfig>();
        const stageKeys = ['level4', 'level5', 'level6', 'level7', 'level8', 'level9', 'level10'] as const;
        
        for (const stageKey of stageKeys) {
            const stage = lineup.stages[stageKey];
            if (!stage) continue;
            
            for (const champion of stage.champions) {
                if (champion.isCore && !coreChampions.has(champion.name)) {
                    coreChampions.set(champion.name, champion);
                }
            }
        }
        
        return Array.from(coreChampions.values());
    }
    
    /**
     * 获取阵容中需要装备的棋子列表
     * @param lineupId 阵容 ID
     * @param level 人口等级 (4-10)
     * @returns 需要装备的棋子配置数组（按核心优先排序）
     */
    public getChampionsNeedingItems(lineupId: string, level: 4 | 5 | 6 | 7 | 8 | 9 | 10): ChampionConfig[] {
        const stage = this.getStageConfig(lineupId, level);
        if (!stage) return [];
        
        return stage.champions
            .filter(c => c.items && c.items.core.length > 0)
            .sort((a, b) => {
                // 核心棋子优先
                if (a.isCore && !b.isCore) return -1;
                if (!a.isCore && b.isCore) return 1;
                return 0;
            });
    }
}

// 导出单例
export const lineupLoader = LineupLoader.getInstance();
