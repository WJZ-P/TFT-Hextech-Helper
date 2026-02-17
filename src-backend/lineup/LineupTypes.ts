/**
 * 阵容配置类型定义
 * @description 定义 TFT 阵容模板的数据结构，支持按等级分阶段配置
 *              参考 OP.GG 等网站的阵容分级系统设计
 */

import {ChampionKey, EquipKey} from "../TFTProtocol";

/**
 * 棋盘位置类型
 * @description 4x7 的棋盘格子，R1-R4 表示行（从上到下），C1-C7 表示列（从左到右）
 */
export type BoardPosition =
    | 'R1_C1' | 'R1_C2' | 'R1_C3' | 'R1_C4' | 'R1_C5' | 'R1_C6' | 'R1_C7'
    | 'R2_C1' | 'R2_C2' | 'R2_C3' | 'R2_C4' | 'R2_C5' | 'R2_C6' | 'R2_C7'
    | 'R3_C1' | 'R3_C2' | 'R3_C3' | 'R3_C4' | 'R3_C5' | 'R3_C6' | 'R3_C7'
    | 'R4_C1' | 'R4_C2' | 'R4_C3' | 'R4_C4' | 'R4_C5' | 'R4_C6' | 'R4_C7';

/**
 * 单个棋子配置
 * @description 阵容中每个棋子的详细配置
 */
export interface ChampionConfig {
    /** 棋子名称（必须与 TFT_16_CHESS_DATA 中的 key 一致） */
    name: ChampionKey;
    
    /** 是否为核心棋子（核心棋子优先升星，不轻易卖掉） */
    isCore: boolean;
    
    /** 目标星级（1-3 星） */
    starTarget: 1 | 2 | 3;
    
    /** 推荐装备列表（可选，没有则表示不需要装备；纯字符串数组，如 ["无尽之刃", "鬼索的狂暴之刃"]） */
    items?: EquipKey[];
    
    /** 推荐站位（可选，用于自动布阵） */
    position?: BoardPosition;
}

/**
 * 阶段配置
 * @description 某个人口等级下的阵容配置
 */
export interface StageConfig {
    /** 该阶段的棋子列表 */
    champions: ChampionConfig[];
    
    /** 该阶段的说明/tips（可选） */
    tips?: string;
}

/**
 * 海克斯强化推荐
 * @description 按优先级排序的海克斯强化列表
 */
export interface AugmentRecommendation {
    /** 强化名称 */
    name: string;
    /** 优先级（1 最高） */
    priority: number;
}

/**
 * 完整阵容配置
 * @description 一个完整的 TFT 阵容模板，包含各阶段配置
 *              专注于自动挂机所需的核心信息
 */
export interface LineupConfig {
    /** 阵容唯一标识（用于文件名和引用） */
    id: string;
    
    /** 阵容名称（显示用） */
    name: string;

    /** 赛季信息 (例如: S4, S16) */
    season?: string;

    /** 是否为玩家自建阵容（true 时允许删除） */
    isUserCreated?: boolean;

    /** 最终成型阵容（finalComp），用于阵容卡片展示 */
    finalComp?: StageConfig;
    
    /**
     * 按人口等级分阶段的阵容配置
     * @description key 为人口数（4-10），value 为该人口下的阵容配置
     *              参考 OP.GG 的阵容数据范围
     *              - level4:  开局阵容，通常是 1-4 到 2-1 阶段
     *              - level5:  通常是 2-1 到 2-5 阶段
     *              - level6:  通常是 3-1 到 3-5 阶段
     *              - level7:  通常是 4-1 到 4-5 阶段
     *              - level8:  通常是 5-1 之后，大多数阵容成型点
     *              - level9:  追求极限的阵容
     *              - level10: 满人口终极阵容（需要金铲铲冠冕等）
     */
    stages: {
        level4?: StageConfig;   // 4 人口开局阵容
        level5?: StageConfig;
        level6?: StageConfig;
        level7?: StageConfig;
        level8: StageConfig;    // 8 人口是必须的，大多数阵容在这里成型
        level9?: StageConfig;
        level10?: StageConfig;  // 10 人口极限阵容（需要额外人口装备）
    };
    
    /**
     * 海克斯强化推荐
     * @description 按阶段分类的强化推荐
     */
    augments?: {
        /** 第一个强化（2-1） */
        first?: AugmentRecommendation[];
        /** 第二个强化（3-2） */
        second?: AugmentRecommendation[];
        /** 第三个强化（4-2） */
        third?: AugmentRecommendation[];
    };
}
