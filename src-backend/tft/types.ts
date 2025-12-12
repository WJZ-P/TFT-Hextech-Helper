/**
 * @file TFT 类型定义
 * @description 云顶之弈自动化工具的核心类型定义，包括棋子、装备、位置等接口
 * @author TFT-Hextech-Helper
 */

import {
    benchSlotPoints,
    fightBoardSlotPoint,
    TFTEquip,
    TFTUnit
} from "../TFTProtocol";

// ============================================================================
// 游戏常量
// ============================================================================

/** 游戏窗口宽度 (固定分辨率) */
export const GAME_WIDTH = 1024;

/** 游戏窗口高度 (固定分辨率) */
export const GAME_HEIGHT = 768;

/**
 * 装备资源路径优先级排序
 * @description 按照稀有度从低到高排列，优先匹配常见装备以提高效率
 * - component: 散件 (最常见)
 * - special: 特殊装备
 * - core: 成装
 * - emblem: 纹章
 * - artifact: 神器
 * - radiant: 光明装备 (最稀有)
 */
export const EQUIP_CATEGORY_PRIORITY = [
    'component',
    'special',
    'core',
    'emblem',
    'artifact',
    'radiant'
] as const;

/** 装备分类类型 */
export type EquipCategory = typeof EQUIP_CATEGORY_PRIORITY[number];

// ============================================================================
// 位置类型
// ============================================================================

/** 战斗棋盘位置 (从协议中的 fightBoardSlotPoint 推导) */
export type BoardLocation = keyof typeof fightBoardSlotPoint;

/** 备战席位置 (从协议中的 benchSlotPoints 推导) */
export type BenchLocation = keyof typeof benchSlotPoints;

// ============================================================================
// 识别结果接口
// ============================================================================

/**
 * 识别到的装备信息
 * @description 继承自协议中的基础装备接口，添加识别特有的属性
 */
export interface IdentifiedEquip extends TFTEquip {
    /** 所在的槽位名称，如 "SLOT_1" */
    slot: string;
    /** 匹配置信度 (0-1)，越高表示匹配越准确 */
    confidence: number;
    /** 装备分类 (component, core 等) */
    category: string;
}

/**
 * 商店中的单个棋子信息
 * @description 用于表示商店 5 个槽位中的棋子
 */
export interface ShopUnit {
    /** 槽位编号 (1-5) */
    slot: number;
    /** OCR 识别到的名字；识别不到为 null */
    name: string | null;
    /** 棋子费用 (可通过颜色判断) */
    cost: number | null;
}

/**
 * 棋盘上的棋子单位
 * @description 表示战斗棋盘 (4x7) 上的一个棋子
 */
export interface BoardUnit {
    /** 棋盘位置 */
    location: BoardLocation;
    /** 棋子基础信息 */
    tftUnit: TFTUnit;
    /** 棋子星级 (1-4 星) */
    starLevel: 1 | 2 | 3 | 4;
    /** 棋子携带的装备列表 */
    equips: TFTEquip[];
}

/**
 * 备战席上的棋子单位
 * @description 表示备战席 (9 格) 上的一个棋子
 */
export interface BenchUnit {
    /** 备战席位置 */
    location: BenchLocation;
    /** 棋子基础信息 */
    tftUnit: TFTUnit;
    /** 棋子星级 (-1 表示未识别，1-4 为正常星级) */
    starLevel: -1 | 1 | 2 | 3 | 4;
    /** 棋子携带的装备列表 */
    equips: TFTEquip[];
}

// ============================================================================
// 区域定义接口
// ============================================================================

/**
 * 简单区域定义
 * @description 用于定义游戏内的 UI 区域，基于游戏窗口相对坐标
 */
export interface SimpleRegion {
    /** 左上角坐标 */
    leftTop: { x: number; y: number };
    /** 右下角坐标 */
    rightBottom: { x: number; y: number };
}

// ============================================================================
// 模板匹配结果
// ============================================================================

/**
 * 模板匹配结果
 * @description 通用的模板匹配返回结构
 */
export interface TemplateMatchResult<T = string> {
    /** 匹配到的名称/标识 */
    name: T;
    /** 匹配置信度 (0-1) */
    confidence: number;
}
