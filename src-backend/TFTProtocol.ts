//  定义一下棋子相关的一些协议，包含棋子单位信息，各种位置信息和约定各种枚举值

import {_TFT_16_EQUIP_DATA, _TFT_4_EQUIP_DATA} from "./TFTInfo/equip.ts";
import {_TFT_16_CHESS_DATA, _TFT_4_CHESS_DATA, UNPURCHASABLE_CHESS} from "./TFTInfo/chess.ts";

/**
 * 游戏阶段的具体类型
 * 这里的分类决定了我们的 AI 应该采取什么策略
 */
export enum GameStageType {
    EARLY_PVE = 'EARLY_PVE', // 第一阶段 (1-1 ~ 1-4)，内部根据回合号判断具体策略
    PVE = 'PVE',             // 打野怪/小兵 (x-7 野怪回合)
    CAROUSEL = 'CAROUSEL',   // 选秀环节 (x-4)
    AUGMENT = 'AUGMENT',     // 海克斯强化选择环节 (2-1, 3-2, 4-2)
    PVP = 'PVP',             // 正常的玩家对战 (其他回合)
    UNKNOWN = 'UNKNOWN'      // 无法识别或不在游戏内
}

/**
 * 游戏阶段识别结果
 * @description getGameStage() 的返回类型，包含阶段类型和原始文本
 */
export interface GameStageResult {
    /** 阶段类型枚举 */
    type: GameStageType;
    /** 原始阶段文本 (如 "2-1", "3-5")，识别失败时为空字符串 */
    stageText: string;
}

export enum TFTMode {
    CLASSIC = 'CLASSIC',    //  经典模式，包括匹配和排位。
    NORMAL = 'NORMAL',      //  S16 匹配模式
    RANK = 'RANK',          //  S16 排位模式
    CLOCKWORK_TRAILS = 'CLOCKWORK_TRAILS',       //  PVE，发条鸟的试炼
    S4_RUISHOU = 'S4_RUISHOU',                   //  S4 回归赛季: 瑞兽闹新春（仅匹配）
}

//  左下角等级region
export const levelRegion = {
    leftTop: { x: 25, y: 625 },
    rightBottom: { x: 145, y: 645 }
}

//  战利品掉落region，可能的掉落区域
export const lootRegion = {
    leftTop: { x: 200, y: 125 },
    rightBottom: { x: 855, y: 585 }
}

//  小小英雄默认站位（棋盘左下角）
//  用于战斗结束后让小小英雄回到初始位置，或作为路径规划的起点
export const littleLegendDefaultPoint = { x: 120, y: 430 };

//  英雄购买槽坐标
export interface SimplePoint {
    x: number;
    y: number;
}

//  小小英雄随机走位Point(防挂机检测)
export const selfWalkAroundPoints = {
    left: [{ x: 156, y: 400 }, { x: 165, y: 355 }, { x: 175, y: 315 }, { x: 185, y: 185 }, { x: 195, y: 150 }],
    right: [{ x: 840, y: 495 }, { x: 830, y: 450 }, { x: 830, y: 420 }, { x: 800, y: 280 }, { x: 805, y: 295 }, { x: 790, y: 215 }, { x: 790, y: 215 }, { x: 785, y: 180 }, { x: 785, y: 150 }],
}

//  持有金币region
export const coinRegion = {
    leftTop: { x: 505, y: 626 },
    rightBottom: { x: 545, y: 642 }
}

export const shopSlot = {
    SHOP_SLOT_1: { x: 240, y: 700 },
    SHOP_SLOT_2: { x: 380, y: 700 },
    SHOP_SLOT_3: { x: 520, y: 700 },
    SHOP_SLOT_4: { x: 660, y: 700 },
    SHOP_SLOT_5: { x: 800, y: 700 },
}

/**
 * 商店槽位索引类型
 * @description 商店只有 5 个槽位（0-4），使用字面量类型限制取值范围
 *              比 number 更严谨，避免传入无效索引
 */
export type ShopSlotIndex = 0 | 1 | 2 | 3 | 4;
//  英雄购买槽英雄名字Region
export const shopSlotNameRegions = {
    SLOT_1: {   // width: 108 height:18
        leftTop: { x: 173, y: 740 },
        rightBottom: { x: 281, y: 758 }
    },
    SLOT_2: {
        leftTop: { x: 315, y: 740 },
        rightBottom: { x: 423, y: 758 }
    },
    SLOT_3: {
        leftTop: { x: 459, y: 740 },
        rightBottom: { x: 567, y: 758 }
    },
    SLOT_4: {
        leftTop: { x: 602, y: 740 },
        rightBottom: { x: 710, y: 758 }
    },
    SLOT_5: {
        leftTop: { x: 746, y: 740 },
        rightBottom: { x: 854, y: 758 }
    },
}
//  选中英雄时，右侧英雄详情的英雄idregion，必须分毫不差以复用商店英雄名称模板！
export const detailChampionNameRegion = {
    leftTop: { x: 870, y: 226 },
    rightBottom: { x: 978, y: 244 },
}
export const detailEquipRegion = {
    SLOT_1: {
        leftTop: { x: 881, y: 347 },
        rightBottom: { x: 919, y: 385 },
    },
    SLOT_2: {
        leftTop: { x: 927, y: 347 },
        rightBottom: { x: 965, y: 385 },
    },
    SLOT_3: {
        leftTop: { x: 973, y: 347 },
        rightBottom: { x: 1011, y: 385 },
    },
}

//  基础装备锻造器浮窗名称区域（槽位 1-5 使用）
//  注意：X 和 Y 都是相对于鼠标右键点击位置的偏移量，不是屏幕绝对坐标！
//  右键基础装备锻造器时，会以点击位置为左上角起点，在右下方弹出浮窗
export const itemForgeTooltipRegion = {
    leftTop: { x: 56, y: 7 },
    rightBottom: { x: 176, y: 27 },
}
//  基础装备锻造器浮窗名称区域（槽位 6-9 边缘情况使用）
//  当槽位靠近屏幕右边缘时，浮窗会向左弹出，位置计算规则不同：
//  - X 坐标：基于游戏窗口的绝对坐标（不依赖鼠标点击位置）
//  - Y 坐标：基于鼠标点击位置的偏移量（仍需加上 clickPoint.y）
export const itemForgeTooltipRegionEdge = {
    leftTop: { x: 585, y: 7 },
    rightBottom: { x: 695, y: 27 },
}
//  选中英雄时，右侧查看英雄星级的
export const detailChampionStarRegion = {
    leftTop: { x: 919, y: 122 },
    rightBottom: { x: 974, y: 132 }
}

//  刷新商店Point（D牌按钮，在升级按钮下方）
export const refreshShopPoint = {x:135, y:730}
//  购买经验Point（升级按钮，在D牌按钮上方）
export const buyExpPoint = {x:135, y:680}

//  装备槽位坐标
export const equipmentSlot = {
    EQ_SLOT_1: { x: 20, y: 210 },//+35
    EQ_SLOT_2: { x: 20, y: 245 },
    EQ_SLOT_3: { x: 20, y: 280 },
    EQ_SLOT_4: { x: 20, y: 315 },
    EQ_SLOT_5: { x: 20, y: 350 },
    EQ_SLOT_6: { x: 20, y: 385 },
    EQ_SLOT_7: { x: 20, y: 430 },//   这里重置下准确位置
    EQ_SLOT_8: { x: 20, y: 465 },
    EQ_SLOT_9: { x: 20, y: 500 },
    EQ_SLOT_10: { x: 20, y: 535 },
}
//  装备槽位具体区域
export const equipmentRegion = {   //  宽24，高25
    SLOT_1: {                   //  y+=36
        leftTop: { x: 9, y: 198 },
        rightBottom: { x: 32, y: 222 }
    },
    SLOT_2: {
        leftTop: { x: 9, y: 234 },
        rightBottom: { x: 32, y: 258 }
    },
    SLOT_3: {
        leftTop: { x: 9, y: 271 },
        rightBottom: { x: 32, y: 295 }
    },
    SLOT_4: {
        leftTop: { x: 9, y: 307 },
        rightBottom: { x: 32, y: 331 }
    },
    SLOT_5: {
        leftTop: { x: 9, y: 344 },
        rightBottom: { x: 32, y: 368 }
    },
    SLOT_6: {
        leftTop: { x: 9, y: 380 },
        rightBottom: { x: 32, y: 404 }
    },
    SLOT_7: {
        leftTop: { x: 9, y: 417 },
        rightBottom: { x: 32, y: 441 }
    },
    SLOT_8: {
        leftTop: { x: 9, y: 453 },
        rightBottom: { x: 32, y: 477 }
    },
    SLOT_9: {
        leftTop: { x: 9, y: 490 },
        rightBottom: { x: 32, y: 514 }
    },
    SLOT_10: {
        leftTop: { x: 9, y: 526 },
        rightBottom: { x: 32, y: 550 }
    },
}
//  棋子在战场上的点位，用于鼠标点击选择英雄
//  注意：Y 坐标往上偏移 5 像素，避免点击时误触到下一行的棋子
export const fightBoardSlotPoint = {
    // x+=80
    //  第一行的棋子位置
    R1_C1: { x: 230, y: 300 },
    R1_C2: { x: 310, y: 300 },
    R1_C3: { x: 390, y: 300 },
    R1_C4: { x: 470, y: 300 },
    R1_C5: { x: 550, y: 300 },
    R1_C6: { x: 630, y: 300 },
    R1_C7: { x: 710, y: 300 },
    //  第二行的棋子位置        //  x+=85
    R2_C1: { x: 260, y: 355 },
    R2_C2: { x: 345, y: 355 },
    R2_C3: { x: 430, y: 355 },
    R2_C4: { x: 515, y: 355 },
    R2_C5: { x: 600, y: 355 },
    R2_C6: { x: 685, y: 355 },
    R2_C7: { x: 770, y: 355 },
    //  第三行棋子的位置        //  x+=90
    R3_C1: { x: 200, y: 405 },
    R3_C2: { x: 290, y: 405 },
    R3_C3: { x: 380, y: 405 },
    R3_C4: { x: 470, y: 405 },
    R3_C5: { x: 560, y: 405 },
    R3_C6: { x: 650, y: 405 },
    R3_C7: { x: 740, y: 405 },
    //  第四行棋子的位置        //  x+=90
    R4_C1: { x: 240, y: 460 },
    R4_C2: { x: 330, y: 460 },
    R4_C3: { x: 420, y: 460 },
    R4_C4: { x: 510, y: 460 },
    R4_C5: { x: 600, y: 460 },
    R4_C6: { x: 690, y: 460 },
    R4_C7: { x: 780, y: 460 },
}
//  棋子在战场上的region，用来判断是否有棋子
//  leftTop.y 使用 -10 偏移，兼容 3D 飞行棋子的高度
//  leftTop.x +5, rightBottom.x -5，避免宽体棋子占据邻居位置导致误判
export const fightBoardSlotRegion = {
    // x+=80
    //  第一行的棋子位置
    R1_C1: {
        leftTop: { x: 210 + 5, y: 300 - 10 },
        rightBottom: { x: 255 - 5, y: 330 }
    },
    R1_C2: {
        leftTop: { x: 290 + 5, y: 300 - 10 },
        rightBottom: { x: 340 - 5, y: 330 }
    },
    R1_C3: {
        leftTop: { x: 370 + 5, y: 300 - 10 },
        rightBottom: { x: 420 - 5, y: 330 }
    },
    R1_C4: {
        leftTop: { x: 450 + 5, y: 300 - 10 },
        rightBottom: { x: 500 - 5, y: 330 }
    },
    R1_C5: {
        leftTop: { x: 530 + 5, y: 300 - 10 },
        rightBottom: { x: 585 - 5, y: 330 }
    },
    R1_C6: {
        leftTop: { x: 615 + 5, y: 300 - 10 },
        rightBottom: { x: 665 - 5, y: 330 }
    },
    R1_C7: {
        leftTop: { x: 695 + 5, y: 300 - 10 },
        rightBottom: { x: 750 - 5, y: 330 }
    },
    //  第二行的棋子位置        //  x+=85
    R2_C1: {
        leftTop: { x: 240 + 5, y: 350 - 10 },
        rightBottom: { x: 285 - 5, y: 385 }
    },
    R2_C2: {
        leftTop: { x: 325 + 5, y: 350 - 10 },
        rightBottom: { x: 370 - 5, y: 385 }
    },
    R2_C3: {
        leftTop: { x: 410 + 5, y: 350 - 10 },
        rightBottom: { x: 455 - 5, y: 385 }
    },
    R2_C4: {
        leftTop: { x: 495 + 5, y: 350 - 10 },
        rightBottom: { x: 540 - 5, y: 385 }
    },
    R2_C5: {
        leftTop: { x: 575 + 5, y: 350 - 10 },
        rightBottom: { x: 625 - 5, y: 385 }
    },
    R2_C6: {
        leftTop: { x: 660 + 5, y: 350 - 10 },
        rightBottom: { x: 710 - 5, y: 385 }
    },
    R2_C7: {
        leftTop: { x: 745 + 5, y: 350 - 10 },
        rightBottom: { x: 795 - 5, y: 385 }
    },
    //  第三行棋子的位置        //  x+=90
    R3_C1: {
        leftTop: { x: 185 + 5, y: 405 - 10 },
        rightBottom: { x: 230 - 5, y: 440 }
    },
    R3_C2: {
        leftTop: { x: 275 + 5, y: 405 - 10 },
        rightBottom: { x: 320 - 5, y: 440 }
    },
    R3_C3: {
        leftTop: { x: 360 + 5, y: 405 - 10 },
        rightBottom: { x: 410 - 5, y: 440 }
    },
    R3_C4: {
        leftTop: { x: 445 + 5, y: 405 - 10 },
        rightBottom: { x: 495 - 5, y: 440 }
    },
    R3_C5: {
        leftTop: { x: 535 + 5, y: 405 - 10 },
        rightBottom: { x: 585 - 5, y: 440 }
    },
    R3_C6: {
        leftTop: { x: 620 + 5, y: 405 - 10 },
        rightBottom: { x: 675 - 5, y: 440 }
    },
    R3_C7: {
        leftTop: { x: 705 + 5, y: 405 - 10 },
        rightBottom: { x: 760 - 5, y: 440 }
    },
    //  第四行棋子的位置        //  x+=90
    R4_C1: {
        leftTop: { x: 215 + 5, y: 465 - 10 },
        rightBottom: { x: 265 - 5, y: 500 }
    },
    R4_C2: {
        leftTop: { x: 310 + 5, y: 465 - 10 },
        rightBottom: { x: 355 - 5, y: 500 }
    },
    R4_C3: {
        leftTop: { x: 395 + 5, y: 465 - 10 },
        rightBottom: { x: 450 - 5, y: 500 }
    },
    R4_C4: {
        leftTop: { x: 490 + 5, y: 465 - 10 },
        rightBottom: { x: 540 - 5, y: 500 }
    },
    R4_C5: {
        leftTop: { x: 580 + 5, y: 465 - 10 },
        rightBottom: { x: 635 - 5, y: 500 }
    },
    R4_C6: {
        leftTop: { x: 670 + 5, y: 465 - 10 },
        rightBottom: { x: 725 - 5, y: 500 }
    },
    R4_C7: {
        leftTop: { x: 760 + 5, y: 465 - 10 },
        rightBottom: { x: 815 - 5, y: 500 }
    },
}

//  棋子在备战席的region，用来判断是否有棋子
//  leftTop.y 使用 -15 偏移，兼容 3D 飞行棋子的高度
//  leftTop.x +5, rightBottom.x -5，避免宽体棋子占据邻居位置导致误判
export const benchSlotRegion = {
    SLOT_1: {
        leftTop: { x: 105 + 5, y: 530 - 15 },
        rightBottom: { x: 155 - 5, y: 585 }
    },
    SLOT_2: {
        leftTop: { x: 190 + 5, y: 530 - 15 },
        rightBottom: { x: 245 - 5, y: 585 }
    },
    SLOT_3: {
        leftTop: { x: 270 + 5, y: 530 - 15 },
        rightBottom: { x: 325 - 5, y: 585 }
    },
    SLOT_4: {
        leftTop: { x: 355 + 5, y: 530 - 15 },
        rightBottom: { x: 410 - 5, y: 585 }
    },
    SLOT_5: {
        leftTop: { x: 435 + 5, y: 530 - 15 },
        rightBottom: { x: 495 - 5, y: 585 }
    },
    SLOT_6: {
        leftTop: { x: 520 + 5, y: 530 - 15 },
        rightBottom: { x: 580 - 5, y: 585 }
    },
    SLOT_7: {
        leftTop: { x: 600 + 5, y: 530 - 15 },
        rightBottom: { x: 665 - 5, y: 585 }
    },
    SLOT_8: {
        leftTop: { x: 680 + 5, y: 530 - 15 },
        rightBottom: { x: 750 - 5, y: 585 }
    },
    SLOT_9: {
        leftTop: { x: 765 + 5, y: 530 - 15 },
        rightBottom: { x: 830 - 5, y: 585 }
    },
}

//  备战席点位
export const benchSlotPoints = {
    SLOT_1: { x: 130, y: 555 },
    SLOT_2: { x: 210, y: 555 },
    SLOT_3: { x: 295, y: 555 },
    SLOT_4: { x: 385, y: 555 },
    SLOT_5: { x: 465, y: 555 },
    SLOT_6: { x: 550, y: 555 },
    SLOT_7: { x: 630, y: 555 },
    SLOT_8: { x: 720, y: 555 },
    SLOT_9: { x: 800, y: 555 },
}
//  海克斯选择槽位
export const hexSlot = {   //  x+=295
    SLOT_1: { x: 215, y: 410 },
    SLOT_2: { x: 510, y: 410 },
    SLOT_3: { x: 805, y: 410 },
}
//  选秀站位，为离自己最近的棋子位置。
export const sharedDraftPoint = { x: 530, y: 400 }

//  游戏结束后的"现在退出"按钮坐标
//  玩家死亡后会弹出结算界面，点击此按钮可以退出游戏，不直到第一和第二名的结算UI跟这个是否一样，因为前两名就没有继续观看了。
export const exitGameButtonPoint = { x: 515, y: 405 }
//  游戏战斗阶段展示坐标，第一阶段。因为第一阶段只有四个回合，跟其他阶段的不一样。
export const gameStageDisplayStageOne = {
    leftTop: { x: 411, y: 6 },
    rightBottom: { x: 442, y: 22 }
}
//  游戏战斗阶段展示坐标，从2-1开始。
export const gameStageDisplayNormal = {
    leftTop: { x: 374, y: 6 },
    rightBottom: { x: 403, y: 22 }
}
//  发条鸟的战斗阶段，布局跟其他的都不一样，因为发条鸟一个大阶段有10场
export const gameStageDisplayTheClockworkTrails = {
    leftTop: { x: 337, y: 6 },
    rightBottom: { x: 366, y: 22 }
}
//  发条鸟模式右下角战斗按钮
export const clockworkTrailsFightButtonPoint = {
    x: 955,
    y: 705
}
//  发条鸟模式死亡后右侧"现在退出按钮"
export const clockworkTrailsQuitNowButtonRegion = {
    leftTop: { x: 780, y: 555},
    rightBottom: { x: 845, y:570}
}
//  发条鸟模式"现在退出"按钮点击坐标
export const clockworkTrailsQuitNowButtonPoint = {
    x: 815,
    y: 560
}

//  "战斗环节"四字region（用来判断是否停止操作）
export const combatPhaseTextRegion = {
    leftTop: { x: 465, y: 110 },
    rightBottom: { x: 560, y: 135 }
}

//  棋子类型接口
//  使用 string 联合，兼容不同赛季枚举（S16 用 UnitOrigin_S16/UnitClass_S16，S4 用 UnitOrigin_S4_5/UnitClass_S4_5）
export interface TFTUnit {
    displayName: string;                 //  棋子的英雄名称，用于ocr
    englishId: string;                  //  英文ID，如 "TFT16_Graves"，用于解析外部数据（如 OP.GG）
    price: number;                       //  棋子的购买花费
    traits: string[];                    //  棋子所属羁绊，含种族和职业（枚举值的中文字符串）
    origins: string[];                   //  棋子种族
    classes: string[];                   //  棋子职业
    /**
     * 棋子攻击射程
     * @description 从 trait.ts 中提取的 attackRange 数据
     * | 射程值 | 类型说明 |
     * |--------|----------|
     * | 0      | 特殊单位（锻造器等，无射程概念） |
     * | 1      | 近战单位 |
     * | 2      | 短程单位 (如格雷福斯、费德提克) |
     * | 4      | 标准远程单位 |
     * | 6      | 超远程单位 (如凯特琳、提莫、克格莫) |
     */
    attackRange: number;
}

//  装备类型接口
export interface TFTEquip {
    name: string;               //  中文名
    englishName: string;        //  英文名，基本对应图片名字，方便检索
    equipId: string;            //  装备ID
    formula: string;            // 合成公式，例如 "501,502"
}

// 羁绊详细数据结构
export interface TraitData {
    id: string;      // 羁绊ID (用于获取图标)
    name: string;    // 中文名
    type: 'origins' | 'classes'; // 类型：种族或职业 (影响图标URL路径)
    levels: number[]; // 激活所需的数量节点
}

/**
 * 锻造器类型枚举
 * @description 用于区分不同类型的锻造器
 *
 * | 类型      | 中文名           | 说明                     |
 * |-----------|-----------------|--------------------------|
 * | NONE      | -               | 不是锻造器               |
 * | BASIC     | 基础装备锻造器   | 可以选择基础散件         |
 * | COMPLETED | 成装锻造器       | 可以选择完整装备         |
 * | ARTIFACT  | 神器装备锻造器   | 可以选择神器装备（奥恩） |
 * | SUPPORT   | 辅助装锻造器     | 可以选择辅助装备         |
 */
export enum ItemForgeType {
    /** 不是锻造器 */
    NONE = 'NONE',
    /** 基础装备锻造器 - 可以选择基础散件 */
    BASIC = 'BASIC',
    /** 成装锻造器 - 可以选择完整装备 */
    COMPLETED = 'COMPLETED',
    /** 神器装备锻造器 - 可以选择神器装备（奥恩锻造） */
    ARTIFACT = 'ARTIFACT',
    /** 辅助装锻造器 - 可以选择辅助装备 */
    SUPPORT = 'SUPPORT',
}

export const TFT_16_CHESS_DATA: Record<keyof typeof _TFT_16_CHESS_DATA, TFTUnit> = _TFT_16_CHESS_DATA;

/** S4 瑞兽闹新春赛季棋子数据（含特殊棋子） */
export const TFT_4_CHESS_DATA: Record<keyof typeof _TFT_4_CHESS_DATA, TFTUnit> = _TFT_4_CHESS_DATA;

/**
 * 不可购买的棋子名称集合（从 chess.ts 中 re-export）
 * 前端使用此集合过滤棋子池中不应展示的非商店单位
 */
export { UNPURCHASABLE_CHESS };

export const TFT_16_EQUIP_DATA: Record<keyof typeof _TFT_16_EQUIP_DATA, TFTEquip> = _TFT_16_EQUIP_DATA;

/** S4 瑞兽闹新春赛季装备数据 */
export const TFT_4_EQUIP_DATA: Record<keyof typeof _TFT_4_EQUIP_DATA, TFTEquip> = _TFT_4_EQUIP_DATA;

/**
 * 根据当前赛季模式获取对应的棋子数据集
 *
 * 这是多赛季支持的核心函数：
 * - S16（NORMAL / RANK）→ TFT_16_CHESS_DATA
 * - S4（S4_RUISHOU）→ TFT_4_CHESS_DATA
 * - CLOCKWORK_TRAILS（发条鸟）→ TFT_16_CHESS_DATA（发条鸟用的是当前赛季的棋子）
 *
 * @param mode 当前 TFT 模式
 * @returns 对应赛季的棋子数据 Record
 */
export function getChessDataForMode(mode: TFTMode): Record<string, TFTUnit> {
    switch (mode) {
        case TFTMode.S4_RUISHOU:
            return TFT_4_CHESS_DATA;
        case TFTMode.NORMAL:
        case TFTMode.RANK:
        case TFTMode.CLOCKWORK_TRAILS:
        default:
            return TFT_16_CHESS_DATA;
    }
}

/**
 * 获取赛季模式对应的模板子目录名
 * 用于 TemplateLoader 加载对应赛季的英雄名称模板
 *
 * @param mode 当前 TFT 模式
 * @returns 子目录名，如 "s16", "s4"
 */
export function getSeasonTemplateDir(mode: TFTMode): string {
    switch (mode) {
        case TFTMode.S4_RUISHOU:
            return 's4';
        case TFTMode.NORMAL:
        case TFTMode.RANK:
        case TFTMode.CLOCKWORK_TRAILS:
        default:
            return 's16';
    }
}

/**
 * 根据阵容配置的赛季字符串获取对应的棋子数据集
 * 
 * 与 getChessDataForMode() 的区别：
 * - getChessDataForMode(mode: TFTMode) —— 按游戏模式枚举查，用于运行时识别
 * - getChessDataBySeason(season: string) —— 按赛季字符串查，用于阵容配置验证
 * 
 * 未来新增赛季时，只需在此处添加一个 case 即可
 *
 * @param season 阵容配置中的赛季标识，如 "S4", "S16"
 * @returns 对应赛季的棋子数据 Record
 */
export function getChessDataBySeason(season?: string): Record<string, TFTUnit> {
    switch (season) {
        case 'S4':
            return TFT_4_CHESS_DATA;
        case 'S16':
        default:
            return TFT_16_CHESS_DATA;
    }
}

/**
 * 根据赛季字符串获取对应的装备数据集
 * 
 * 与 getChessDataBySeason() 配套使用，用于阵容配置中装备名称的验证
 * 
 * @param season 赛季标识，如 "S4", "S16"
 * @returns 对应赛季的装备数据 Record
 */
export function getEquipDataBySeason(season?: string): Record<string, TFTEquip> {
    switch (season) {
        case 'S4':
            return TFT_4_EQUIP_DATA;
        case 'S16':
        default:
            return TFT_16_EQUIP_DATA;
    }
}

// ==========================================
// 策略相关的类型定义
// ==========================================

// 合并所有赛季的棋子名称为联合类型，确保任何赛季的棋子名都能通过类型检查
export type ChampionKey = keyof typeof TFT_16_CHESS_DATA | keyof typeof TFT_4_CHESS_DATA;
export type ChampionEnglishId =
    | typeof _TFT_16_CHESS_DATA[keyof typeof _TFT_16_CHESS_DATA]['englishId']
    | typeof _TFT_4_CHESS_DATA[keyof typeof _TFT_4_CHESS_DATA]['englishId'];
export type EquipKey = keyof typeof TFT_16_EQUIP_DATA | keyof typeof TFT_4_EQUIP_DATA;

// ==========================================
// 英文ID到中文名的映射表 (自动从数据生成，用于解析 OP.GG 等外部数据)
// ==========================================

/**
 * 英雄英文ID到中文名的映射
 * @example "TFT16_Graves" -> "格雷福斯"
 */
export const CHAMPION_EN_TO_CN = {} as Record<ChampionEnglishId, ChampionKey>;

// 自动从所有赛季的棋子数据生成英文到中文的映射
for (const [cnName, champion] of Object.entries(TFT_16_CHESS_DATA)) {
    if (champion.englishId) {
        CHAMPION_EN_TO_CN[champion.englishId as ChampionEnglishId] = cnName as ChampionKey;
    }
}
for (const [cnName, champion] of Object.entries(TFT_4_CHESS_DATA)) {
    if (champion.englishId) {
        CHAMPION_EN_TO_CN[champion.englishId as ChampionEnglishId] = cnName as ChampionKey;
    }
}


/**
 * 装备英文ID到中文名的映射
 * @example "TFT_Item_InfinityEdge" -> "无尽之刃"
 */
export const EQUIP_EN_TO_CN: Record<string, EquipKey> = {};

// 自动从 TFT_16_EQUIP_DATA 生成英文到中文的映射
for (const [cnName, equip] of Object.entries(TFT_16_EQUIP_DATA)) {
    // englishName 可能包含逗号分隔的多个名称
    const englishNames = equip.englishName.split(',');
    for (const enName of englishNames) {
        EQUIP_EN_TO_CN[enName.trim()] = cnName as EquipKey;
    }
}

// 添加 OP.GG 使用的装备别名
const EQUIP_ALIASES: Record<string, EquipKey> = {
    "TFT16_Item_Bilgewater_DeadmansDagger": "亡者的短剑",
    "TFT16_Item_Bilgewater_FirstMatesFlintlock": "大副的燧发枪",
    "TFT16_Item_Bilgewater_PileOCitrus": "成堆柑橘",
};
Object.assign(EQUIP_EN_TO_CN, EQUIP_ALIASES);

export interface LineupUnit {
    name: ChampionKey;
    isCore: boolean;
    items?: EquipKey[];
    starTarget?: 1 | 2 | 3;
}

/**
 * 判断棋子是否为近战单位
 * @param championName 棋子中文名
 * @returns true 表示近战，false 表示远程
 */
export function isMeleeChampion(championName: ChampionKey): boolean {
    // 依次查找所有赛季的棋子数据，找到即返回
    const champion = (TFT_16_CHESS_DATA as Record<string, TFTUnit>)[championName]
        ?? (TFT_4_CHESS_DATA as Record<string, TFTUnit>)[championName];
    // 射程 <= 2 视为近战（包括格雷福斯这种短程枪手）
    return champion !== undefined && champion.attackRange <= 2;
}

/**
 * 判断棋子是否为远程单位
 * @param championName 棋子中文名
 * @returns true 表示远程，false 表示近战
 */
export function isRangedChampion(championName: ChampionKey): boolean {
    const champion = (TFT_16_CHESS_DATA as Record<string, TFTUnit>)[championName]
        ?? (TFT_4_CHESS_DATA as Record<string, TFTUnit>)[championName];
    // 射程 >= 4 视为远程
    return champion !== undefined && champion.attackRange >= 4;
}

/**
 * 获取棋子的射程值
 * @param championName 棋子中文名
 * @returns 射程值，未知棋子返回 undefined
 */
export function getChampionRange(championName: ChampionKey): number | undefined {
    // 依次查找所有赛季的数据，确保任何赛季的棋子都能查到射程
    return ((TFT_16_CHESS_DATA as Record<string, TFTUnit>)[championName]
        ?? (TFT_4_CHESS_DATA as Record<string, TFTUnit>)[championName])?.attackRange;
}

/**
 * 判断一个模式是否是"标准自动下棋"流程
 * （需要阵容配置、正常买棋、运营的模式）
 * 与之相对的是 CLOCKWORK_TRAILS（速通送死模式）
 */
export function isStandardChessMode(mode: TFTMode): boolean {
    return mode === TFTMode.NORMAL || mode === TFTMode.RANK || mode === TFTMode.S4_RUISHOU;
}

export interface TeamComposition {
    name: string;
    description?: string;
    earlyGame: LineupUnit[];
    midGame: LineupUnit[];
    lateGame: LineupUnit[];
}
