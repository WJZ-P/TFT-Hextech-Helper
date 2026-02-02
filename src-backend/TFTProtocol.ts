//  定义一下棋子相关的一些协议，包含棋子单位信息，各种位置信息和约定各种枚举值

import {UnitClass_S16, UnitOrigin_S16} from "./TFTInfo/trait.ts";

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
    NORMAL = 'NORMAL',      //  匹配模式
    RANK = 'RANK',          //  排位模式
    CLOCKWORK_TRAILS = 'CLOCKWORK_TRAILS',       //  PVE，发条鸟的试炼。
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
//  TODO: 数据还没填充，需要实际测量确认坐标
export const combatPhaseTextRegion = {
    leftTop: { x: 465, y: 110 },
    rightBottom: { x: 560, y: 135 }
}

//  棋子类型接口
export interface TFTUnit {
    displayName: ChampionKey;            //  棋子的英雄名称，用于ocr
    englishId: string;                  //  英文ID，如 "TFT16_Graves"，用于解析外部数据（如 OP.GG）
    price: number;                       //  棋子的购买花费
    traits: (UnitOrigin_S16 | UnitClass_S16)[]; //  棋子所属羁绊，含种族和职业
    origins: UnitOrigin_S16[];              //  棋子种族
    classes: UnitClass_S16[];               //  棋子职业
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

// S16 羁绊详细数据 Map (key 为中文名)
export const TFT_16_TRAIT_DATA: Record<string, TraitData> = {
    // === Origins (Race) ===
    "铸星龙王": { id: "10216", name: "铸星龙王", type: "origins", levels: [1] },
    "纳什男爵": { id: "10217", name: "纳什男爵", type: "origins", levels: [1] },
    "比尔吉沃特": { id: "10218", name: "比尔吉沃特", type: "origins", levels: [3, 5, 7, 10] },
    "山隐之焰": { id: "10219", name: "山隐之焰", type: "origins", levels: [1] },
    "星界游神": { id: "10221", name: "星界游神", type: "origins", levels: [1] },
    "时光守护者": { id: "10222", name: "时光守护者", type: "origins", levels: [1] },
    "黑暗之女": { id: "10223", name: "黑暗之女", type: "origins", levels: [1] },
    "暗裔": { id: "10224", name: "暗裔", type: "origins", levels: [1, 2, 3] },
    "德玛西亚": { id: "10226", name: "德玛西亚", type: "origins", levels: [3, 5, 7, 11] },
    "沙漠皇帝": { id: "10227", name: "沙漠皇帝", type: "origins", levels: [1] },
    "以绪塔尔": { id: "10228", name: "以绪塔尔", type: "origins", levels: [3, 5, 7] },
    "弗雷尔卓德": { id: "10229", name: "弗雷尔卓德", type: "origins", levels: [3, 5, 7] },
    "河流之王": { id: "10230", name: "河流之王", type: "origins", levels: [1] },
    "远古恐惧": { id: "10232", name: "远古恐惧", type: "origins", levels: [1] },
    "正义巨像": { id: "10233", name: "正义巨像", type: "origins", levels: [1] },
    "海克斯机甲": { id: "10234", name: "海克斯机甲", type: "origins", levels: [1] },
    "狂野女猎手": { id: "10235", name: "狂野女猎手", type: "origins", levels: [1] },
    "艾欧尼亚": { id: "10237", name: "艾欧尼亚", type: "origins", levels: [3, 5, 7] },
    "虚空之女": { id: "10239", name: "虚空之女", type: "origins", levels: [1] },
    "永猎双子": { id: "10240", name: "永猎双子", type: "origins", levels: [1] },
    "诺克萨斯": { id: "10243", name: "诺克萨斯", type: "origins", levels: [3, 5, 7, 10] },
    "皮尔特沃夫": { id: "10244", name: "皮尔特沃夫", type: "origins", levels: [2, 4, 6] },
    "符文法师": { id: "10246", name: "符文法师", type: "origins", levels: [1] },
    "暗影岛": { id: "10247", name: "暗影岛", type: "origins", levels: [2, 3, 4, 5] },
    "恕瑞玛": { id: "10248", name: "恕瑞玛", type: "origins", levels: [2, 3, 4] },
    "龙血武姬": { id: "10249", name: "龙血武姬", type: "origins", levels: [1] },
    "系魂圣枪": { id: "10252", name: "系魂圣枪", type: "origins", levels: [1] },
    "解脱者": { id: "10253", name: "解脱者", type: "origins", levels: [1] },
    "巨神峰": { id: "10254", name: "巨神峰", type: "origins", levels: [1, 2, 3, 4, 5, 6] },
    "巨龙卫士": { id: "10255", name: "巨龙卫士", type: "origins", levels: [2] },
    "光明哨兵": { id: "10256", name: "光明哨兵", type: "origins", levels: [2] },
    "绝命毒师": { id: "10257", name: "绝命毒师", type: "origins", levels: [2] },
    "腕豪": { id: "10258", name: "腕豪", type: "origins", levels: [1] },
    "虚空": { id: "10260", name: "虚空", type: "origins", levels: [2, 4, 6, 9] },
    "远古巫灵": { id: "10262", name: "远古巫灵", type: "origins", levels: [1] },
    "约德尔人": { id: "10263", name: "约德尔人", type: "origins", levels: [2, 4, 6, 8] },
    "不落魔锋": { id: "10264", name: "不落魔锋", type: "origins", levels: [1] },
    "祖安": { id: "10265", name: "祖安", type: "origins", levels: [3, 5, 7] },
    "与狼共舞": { id: "10266", name: "与狼共舞", type: "origins", levels: [2] },

    // === Classes (Job) ===
    "斗士": { id: "10220", name: "斗士", type: "classes", levels: [2, 4, 6] },
    "护卫": { id: "10225", name: "护卫", type: "classes", levels: [2, 4, 6] },
    "枪手": { id: "10231", name: "枪手", type: "classes", levels: [2, 4] },
    "神谕者": { id: "10236", name: "神谕者", type: "classes", levels: [2, 4] },
    "主宰": { id: "10238", name: "主宰", type: "classes", levels: [2, 4, 6] },
    "狙神": { id: "10241", name: "狙神", type: "classes", levels: [2, 3, 4, 5] },
    "耀光使": { id: "10242", name: "耀光使", type: "classes", levels: [2, 4] },
    "迅击战士": { id: "10245", name: "迅击战士", type: "classes", levels: [2, 3, 4, 5] },
    "裁决战士": { id: "10250", name: "裁决战士", type: "classes", levels: [2, 4, 6] },
    "法师": { id: "10251", name: "法师", type: "classes", levels: [2, 4, 6] },
    "征服者": { id: "10259", name: "征服者", type: "classes", levels: [2, 3, 4, 5] },
    "神盾使": { id: "10261", name: "神盾使", type: "classes", levels: [2, 3, 4, 5] },
};

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

const TFT_SPECIAL_CHESS = {
    //  特殊的棋子，比如基础装备锻造器，这种不属于英雄
    "基础装备锻造器": {
        displayName: "基础装备锻造器",
        englishId: "TFT16_ItemForge",
        price: 8,   // what the fuck? 但数据是这么写的
        traits: [],
        origins: [],
        classes: [],
        attackRange: 0
    },
    "成装锻造器": {
        displayName: "成装锻造器",
        englishId: "TFT_ArmoryKeyCompleted",
        price: 0,   // what the fuck? 但数据是这么写的
        traits: [],
        origins: [],
        classes: [],
        attackRange: 0
    },
    "神器装备锻造器": {
        displayName: "神器装备锻造器",
        englishId: "TFT_ArmoryKeyOrnn",
        price: 8,   // what the fuck? 但数据是这么写的
        traits: [],
        origins: [],
        classes: [],
        attackRange: 0
    },
    "辅助装锻造器": {
        displayName: "辅助装锻造器",
        englishId: "TFT_ArmoryKeySupport",
        price: 8,   // what the fuck? 但数据是这么写的
        traits: [],
        origins: [],
        classes: [],
        attackRange: 0
    },
    "训练假人": {
        displayName: "训练假人",
        englishId: "TFT16_TrainingDummy",
        price: 1,   // what the fuck? 但数据是这么写的
        traits: [],
        origins: [],
        classes: [],
        attackRange: 0
    },
    "提伯斯": {
        displayName: "提伯斯",
        englishId: "TFT16_AnnieTibbers",
        price: 0,
        traits: [UnitClass_S16.Sorcerer],
        origins: [],
        classes: [UnitClass_S16.Sorcerer],
        attackRange: 1
    },
} satisfies Record<string, TFTUnit>;

const _TFT_16_CHAMPION_DATA = {
    //  特殊棋子
    ...TFT_SPECIAL_CHESS,

    // 1 费棋子
    "泰达米尔": {
        displayName: "泰达米尔",
        englishId: "TFT16_Tryndamere",
        price: 2,
        traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Slayer],
        origins: [UnitOrigin_S16.Freljord],
        classes: [UnitClass_S16.Slayer],
        attackRange: 1
    },
    "俄洛伊": {
        displayName: "俄洛伊",
        englishId: "TFT16_Illaoi",
        price: 1,
        traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Bruiser],
        origins: [UnitOrigin_S16.Bilgewater],
        classes: [UnitClass_S16.Bruiser],
        attackRange: 1
    },
    "贝蕾亚": {
        displayName: "贝蕾亚",
        englishId: "TFT16_Briar",
        price: 1,
        traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Slayer, UnitClass_S16.Juggernaut],
        origins: [UnitOrigin_S16.Noxus],
        classes: [UnitClass_S16.Slayer, UnitClass_S16.Juggernaut],
        attackRange: 1
    },
    "艾尼维亚": {
        displayName: "艾尼维亚",
        englishId: "TFT16_Anivia",
        price: 1,
        traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Invoker],
        origins: [UnitOrigin_S16.Freljord],
        classes: [UnitClass_S16.Invoker],
        attackRange: 4
    },
    "嘉文四世": {
        displayName: "嘉文四世",
        englishId: "TFT16_JarvanIV",
        price: 1,
        traits: [UnitOrigin_S16.Demacia, UnitClass_S16.Defender],
        origins: [UnitOrigin_S16.Demacia],
        classes: [UnitClass_S16.Defender],
        attackRange: 1
    },
    "烬": {
        displayName: "烬",
        englishId: "TFT16_Jhin",
        price: 1,
        traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Gunslinger],
        origins: [UnitOrigin_S16.Ionia],
        classes: [UnitClass_S16.Gunslinger],
        attackRange: 4
    },
    "凯特琳": {
        displayName: "凯特琳",
        englishId: "TFT16_Caitlyn",
        price: 1,
        traits: [UnitOrigin_S16.Piltover, UnitClass_S16.Longshot],
        origins: [UnitOrigin_S16.Piltover],
        classes: [UnitClass_S16.Longshot],
        attackRange: 6
    },
    "克格莫": {
        displayName: "克格莫",
        englishId: "TFT16_KogMaw",
        price: 1,
        traits: [UnitOrigin_S16.Void, UnitClass_S16.Sorcerer, UnitClass_S16.Longshot],
        origins: [UnitOrigin_S16.Void],
        classes: [UnitClass_S16.Sorcerer, UnitClass_S16.Longshot],
        attackRange: 6
    },
    "璐璐": {
        displayName: "璐璐",
        englishId: "TFT16_Lulu",
        price: 1,
        traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Sorcerer],
        origins: [UnitOrigin_S16.Yordle],
        classes: [UnitClass_S16.Sorcerer],
        attackRange: 4
    },
    "奇亚娜": {
        displayName: "奇亚娜",
        englishId: "TFT16_Qiyana",
        price: 1,
        traits: [UnitOrigin_S16.Ixtal, UnitClass_S16.Slayer],
        origins: [UnitOrigin_S16.Ixtal],
        classes: [UnitClass_S16.Slayer],
        attackRange: 1
    },
    "兰博": {
        displayName: "兰博",
        englishId: "TFT16_Rumble",
        price: 1,
        traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Defender],
        origins: [UnitOrigin_S16.Yordle],
        classes: [UnitClass_S16.Defender],
        attackRange: 1
    },
    "慎": {
        displayName: "慎",
        englishId: "TFT16_Shen",
        price: 1,
        traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Bruiser],
        origins: [UnitOrigin_S16.Ionia],
        classes: [UnitClass_S16.Bruiser],
        attackRange: 1
    },
    "娑娜": {
        displayName: "娑娜",
        englishId: "TFT16_Sona",
        price: 1,
        traits: [UnitOrigin_S16.Demacia, UnitClass_S16.Invoker],
        origins: [UnitOrigin_S16.Demacia],
        classes: [UnitClass_S16.Invoker],
        attackRange: 4
    },
    "佛耶戈": {
        displayName: "佛耶戈",
        englishId: "TFT16_Viego",
        price: 1,
        traits: [UnitOrigin_S16.ShadowIsles, UnitClass_S16.Rapidfire],
        origins: [UnitOrigin_S16.ShadowIsles],
        classes: [UnitClass_S16.Rapidfire],
        attackRange: 1
    },
    "布里茨": {
        displayName: "布里茨",
        englishId: "TFT16_Blitzcrank",
        price: 1,
        traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Juggernaut],
        origins: [UnitOrigin_S16.Zaun],
        classes: [UnitClass_S16.Juggernaut],
        attackRange: 1
    },

    // 2 费棋子
    "厄斐琉斯": {
        displayName: "厄斐琉斯",
        englishId: "TFT16_Aphelios",
        price: 2,
        traits: [UnitOrigin_S16.Targon],
        origins: [UnitOrigin_S16.Targon],
        classes: [],
        attackRange: 4
    },
    "艾希": {
        displayName: "艾希",
        englishId: "TFT16_Ashe",
        price: 2,
        traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Rapidfire],
        origins: [UnitOrigin_S16.Freljord],
        classes: [UnitClass_S16.Rapidfire],
        attackRange: 4
    },
    "科加斯": {
        displayName: "科加斯",
        englishId: "TFT16_ChoGath",
        price: 2,
        traits: [UnitOrigin_S16.Void, UnitClass_S16.Juggernaut],
        origins: [UnitOrigin_S16.Void],
        classes: [UnitClass_S16.Juggernaut],
        attackRange: 1
    },
    "崔斯特": {
        displayName: "崔斯特",
        englishId: "TFT16_TwistedFate",
        price: 2,
        traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Rapidfire],
        origins: [UnitOrigin_S16.Bilgewater],
        classes: [UnitClass_S16.Rapidfire],
        attackRange: 4
    },
    "艾克": {
        displayName: "艾克",
        englishId: "TFT16_Ekko",
        price: 2,
        traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Magus],
        origins: [UnitOrigin_S16.Zaun],
        classes: [UnitClass_S16.Magus],
        attackRange: 1
    },
    "格雷福斯": {
        displayName: "格雷福斯",
        englishId: "TFT16_Graves",
        price: 2,
        traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Gunslinger],
        origins: [UnitOrigin_S16.Bilgewater],
        classes: [UnitClass_S16.Gunslinger],
        attackRange: 2
    },
    "妮蔻": {
        displayName: "妮蔻",
        englishId: "TFT16_Neeko",
        price: 2,
        traits: [UnitOrigin_S16.Ixtal, UnitClass_S16.Sorcerer, UnitClass_S16.Defender],
        origins: [UnitOrigin_S16.Ixtal],
        classes: [UnitClass_S16.Sorcerer, UnitClass_S16.Defender],
        attackRange: 1
    },
    "奥莉安娜": {
        displayName: "奥莉安娜",
        englishId: "TFT16_Orianna",
        price: 2,
        traits: [UnitOrigin_S16.Piltover, UnitClass_S16.Invoker],
        origins: [UnitOrigin_S16.Piltover],
        classes: [UnitClass_S16.Invoker],
        attackRange: 4
    },
    "波比": {
        displayName: "波比",
        englishId: "TFT16_Poppy",
        price: 2,
        traits: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Yordle, UnitClass_S16.Juggernaut],
        origins: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Yordle],
        classes: [UnitClass_S16.Juggernaut],
        attackRange: 1
    },
    "雷克塞": {
        displayName: "雷克塞",
        englishId: "TFT16_RekSai",
        price: 2,
        traits: [UnitOrigin_S16.Void, UnitClass_S16.Vanquisher],
        origins: [UnitOrigin_S16.Void],
        classes: [UnitClass_S16.Vanquisher],
        attackRange: 1
    },
    "赛恩": {
        displayName: "赛恩",
        englishId: "TFT16_Sion",
        price: 2,
        traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Bruiser],
        origins: [UnitOrigin_S16.Noxus],
        classes: [UnitClass_S16.Bruiser],
        attackRange: 1
    },
    "提莫": {
        displayName: "提莫",
        englishId: "TFT16_Teemo",
        price: 2,
        traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Longshot],
        origins: [UnitOrigin_S16.Yordle],
        classes: [UnitClass_S16.Longshot],
        attackRange: 6
    },
    "崔丝塔娜": {
        displayName: "崔丝塔娜",
        englishId: "TFT16_Tristana",
        price: 2,
        traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Gunslinger],
        origins: [UnitOrigin_S16.Yordle],
        classes: [UnitClass_S16.Gunslinger],
        attackRange: 4
    },
    "蔚": {
        displayName: "蔚",
        englishId: "TFT16_Vi",
        price: 2,
        traits: [UnitOrigin_S16.Piltover, UnitOrigin_S16.Zaun, UnitClass_S16.Defender],
        origins: [UnitOrigin_S16.Piltover, UnitOrigin_S16.Zaun],
        classes: [UnitClass_S16.Defender],
        attackRange: 1
    },
    "亚索": {
        displayName: "亚索",
        englishId: "TFT16_Yasuo",
        price: 2,
        traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Slayer],
        origins: [UnitOrigin_S16.Ionia],
        classes: [UnitClass_S16.Slayer],
        attackRange: 1
    },
    "约里克": {
        displayName: "约里克",
        englishId: "TFT16_Yorick",
        price: 2,
        traits: [UnitOrigin_S16.ShadowIsles, UnitClass_S16.Warden],
        origins: [UnitOrigin_S16.ShadowIsles],
        classes: [UnitClass_S16.Warden],
        attackRange: 1
    },
    "赵信": {
        displayName: "赵信",
        englishId: "TFT16_XinZhao",
        price: 2,
        traits: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Ionia, UnitClass_S16.Warden],
        origins: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Ionia],
        classes: [UnitClass_S16.Warden],
        attackRange: 1
    },

    // 3 费棋子
    "阿狸": {
        displayName: "阿狸",
        englishId: "TFT16_Ahri",
        price: 3,
        traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Sorcerer],
        origins: [UnitOrigin_S16.Ionia],
        classes: [UnitClass_S16.Sorcerer],
        attackRange: 4
    },
    "巴德": {
        displayName: "巴德",
        englishId: "TFT16_Bard",
        price: 3,
        traits: [UnitOrigin_S16.Caretaker],
        origins: [UnitOrigin_S16.Caretaker],
        classes: [],
        attackRange: 4
    },
    "德莱文": {
        displayName: "德莱文",
        englishId: "TFT16_Draven",
        price: 3,
        traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Rapidfire],
        origins: [UnitOrigin_S16.Noxus],
        classes: [UnitClass_S16.Rapidfire],
        attackRange: 4
    },
    "德莱厄斯": {
        displayName: "德莱厄斯",
        englishId: "TFT16_Darius",
        price: 3,
        traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Defender],
        origins: [UnitOrigin_S16.Noxus],
        classes: [UnitClass_S16.Defender],
        attackRange: 1
    },
    "格温": {
        displayName: "格温",
        englishId: "TFT16_Gwen",
        price: 3,
        traits: [UnitOrigin_S16.ShadowIsles, UnitClass_S16.Magus],
        origins: [UnitOrigin_S16.ShadowIsles],
        classes: [UnitClass_S16.Magus],
        attackRange: 1
    },
    "金克丝": {
        displayName: "金克丝",
        englishId: "TFT16_Jinx",
        price: 3,
        traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Gunslinger],
        origins: [UnitOrigin_S16.Zaun],
        classes: [UnitClass_S16.Gunslinger],
        attackRange: 4
    },
    "凯南": {
        displayName: "凯南",
        englishId: "TFT16_Kennen",
        price: 3,
        traits: [UnitOrigin_S16.Ionia, UnitOrigin_S16.Yordle, UnitClass_S16.Defender],
        origins: [UnitOrigin_S16.Ionia, UnitOrigin_S16.Yordle],
        classes: [UnitClass_S16.Defender],
        attackRange: 1
    },
    "可酷伯与悠米": {
        displayName: "可酷伯与悠米",
        englishId: "TFT16_Kobuko",
        price: 3,
        traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Bruiser, UnitClass_S16.Invoker],
        origins: [UnitOrigin_S16.Yordle],
        classes: [UnitClass_S16.Bruiser, UnitClass_S16.Invoker],
        attackRange: 1
    },
    "乐芙兰": {
        displayName: "乐芙兰",
        englishId: "TFT16_Leblanc",
        price: 3,
        traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Invoker],
        origins: [UnitOrigin_S16.Noxus],
        classes: [UnitClass_S16.Invoker],
        attackRange: 4
    },
    "洛里斯": {
        displayName: "洛里斯",
        englishId: "TFT16_Loris",
        price: 3,
        traits: [UnitOrigin_S16.Piltover, UnitClass_S16.Warden],
        origins: [UnitOrigin_S16.Piltover],
        classes: [UnitClass_S16.Warden],
        attackRange: 1
    },
    "玛尔扎哈": {
        displayName: "玛尔扎哈",
        englishId: "TFT16_Malzahar",
        price: 3,
        traits: [UnitOrigin_S16.Void, UnitClass_S16.Magus],
        origins: [UnitOrigin_S16.Void],
        classes: [UnitClass_S16.Magus],
        attackRange: 4
    },
    "米利欧": {
        displayName: "米利欧",
        englishId: "TFT16_Milio",
        price: 3,
        traits: [UnitOrigin_S16.Ixtal, UnitClass_S16.Invoker],
        origins: [UnitOrigin_S16.Ixtal],
        classes: [UnitClass_S16.Invoker],
        attackRange: 4
    },
    "诺提勒斯": {
        displayName: "诺提勒斯",
        englishId: "TFT16_Nautilus",
        price: 3,
        traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Juggernaut, UnitClass_S16.Warden],
        origins: [UnitOrigin_S16.Bilgewater],
        classes: [UnitClass_S16.Juggernaut, UnitClass_S16.Warden],
        attackRange: 1
    },
    "普朗克": {
        displayName: "普朗克",
        englishId: "TFT16_Gangplank",
        price: 3,
        traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Slayer, UnitClass_S16.Vanquisher],
        origins: [UnitOrigin_S16.Bilgewater],
        classes: [UnitClass_S16.Slayer, UnitClass_S16.Vanquisher],
        attackRange: 1
    },
    "瑟庄妮": {
        displayName: "瑟庄妮",
        englishId: "TFT16_Sejuani",
        price: 3,
        traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Defender],
        origins: [UnitOrigin_S16.Freljord],
        classes: [UnitClass_S16.Defender],
        attackRange: 1
    },
    "薇恩": {
        displayName: "薇恩",
        englishId: "TFT16_Vayne",
        price: 3,
        traits: [UnitOrigin_S16.Demacia, UnitClass_S16.Longshot],
        origins: [UnitOrigin_S16.Demacia],
        classes: [UnitClass_S16.Longshot],
        attackRange: 4
    },
    "蒙多医生": {
        displayName: "蒙多医生",
        englishId: "TFT16_DrMundo",
        price: 3,
        traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Bruiser],
        origins: [UnitOrigin_S16.Zaun],
        classes: [UnitClass_S16.Bruiser],
        attackRange: 1
    },

    // 4 费棋子
    "安蓓萨": {
        displayName: "安蓓萨",
        englishId: "TFT16_Ambessa",
        price: 4,
        traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Vanquisher],
        origins: [UnitOrigin_S16.Noxus],
        classes: [UnitClass_S16.Vanquisher],
        attackRange: 1
    },
    "卑尔维斯": {
        displayName: "卑尔维斯",
        englishId: "TFT16_BelVeth",
        price: 4,
        traits: [UnitOrigin_S16.Void, UnitClass_S16.Slayer],
        origins: [UnitOrigin_S16.Void],
        classes: [UnitClass_S16.Slayer],
        attackRange: 2
    },
    "布隆": {
        displayName: "布隆",
        englishId: "TFT16_Braum",
        price: 4,
        traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Warden],
        origins: [UnitOrigin_S16.Freljord],
        classes: [UnitClass_S16.Warden],
        attackRange: 1
    },
    "黛安娜": {
        displayName: "黛安娜",
        englishId: "TFT16_Diana",
        price: 4,
        traits: [UnitOrigin_S16.Targon],
        origins: [UnitOrigin_S16.Targon],
        classes: [],
        attackRange: 1
    },
    "盖伦": {
        displayName: "盖伦",
        englishId: "TFT16_Garen",
        price: 4,
        traits: [UnitOrigin_S16.Demacia, UnitClass_S16.Defender],
        origins: [UnitOrigin_S16.Demacia],
        classes: [UnitClass_S16.Defender],
        attackRange: 1
    },
    "卡莉丝塔": {
        displayName: "卡莉丝塔",
        englishId: "TFT16_Kalista",
        price: 4,
        traits: [UnitOrigin_S16.ShadowIsles, UnitClass_S16.Vanquisher],
        origins: [UnitOrigin_S16.ShadowIsles],
        classes: [UnitClass_S16.Vanquisher],
        attackRange: 4
    },
    "卡莎": {
        displayName: "卡莎",
        englishId: "TFT16_Kaisa",
        price: 4,
        traits: [UnitOrigin_S16.Assimilator, UnitOrigin_S16.Void, UnitClass_S16.Longshot],
        origins: [UnitOrigin_S16.Assimilator, UnitOrigin_S16.Void],
        classes: [UnitClass_S16.Longshot],
        attackRange: 6
    },
    "蕾欧娜": {
        displayName: "蕾欧娜",
        englishId: "TFT16_Leona",
        price: 4,
        traits: [UnitOrigin_S16.Targon],
        origins: [UnitOrigin_S16.Targon],
        classes: [],
        attackRange: 1
    },
    "丽桑卓": {
        displayName: "丽桑卓",
        englishId: "TFT16_Lissandra",
        price: 4,
        traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Invoker],
        origins: [UnitOrigin_S16.Freljord],
        classes: [UnitClass_S16.Invoker],
        attackRange: 4
    },
    "拉克丝": {
        displayName: "拉克丝",
        englishId: "TFT16_Lux",
        price: 4,
        traits: [UnitOrigin_S16.Demacia, UnitClass_S16.Sorcerer],
        origins: [UnitOrigin_S16.Demacia],
        classes: [UnitClass_S16.Sorcerer],
        attackRange: 4
    },
    "厄运小姐": {
        displayName: "厄运小姐",
        englishId: "TFT16_MissFortune",
        price: 4,
        traits: [UnitOrigin_S16.Bilgewater, UnitClass_S16.Gunslinger],
        origins: [UnitOrigin_S16.Bilgewater],
        classes: [UnitClass_S16.Gunslinger],
        attackRange: 4
    },
    "内瑟斯": {
        displayName: "内瑟斯",
        englishId: "TFT16_Nasus",
        price: 4,
        traits: [UnitOrigin_S16.Shurima],
        origins: [UnitOrigin_S16.Shurima],
        classes: [],
        attackRange: 1
    },
    "奈德丽": {
        displayName: "奈德丽",
        englishId: "TFT16_Nidalee",
        price: 4,
        traits: [UnitOrigin_S16.Ixtal, UnitOrigin_S16.Huntress],
        origins: [UnitOrigin_S16.Ixtal, UnitOrigin_S16.Huntress],
        classes: [],
        attackRange: 1
    },
    "雷克顿": {
        displayName: "雷克顿",
        englishId: "TFT16_Renekton",
        price: 4,
        traits: [UnitOrigin_S16.Shurima],
        origins: [UnitOrigin_S16.Shurima],
        classes: [],
        attackRange: 1
    },
    "萨勒芬妮": {
        displayName: "萨勒芬妮",
        englishId: "TFT16_Seraphine",
        price: 4,
        traits: [UnitOrigin_S16.Piltover, UnitClass_S16.Magus],
        origins: [UnitOrigin_S16.Piltover],
        classes: [UnitClass_S16.Magus],
        attackRange: 4
    },
    "辛吉德": {
        displayName: "辛吉德",
        englishId: "TFT16_Singed",
        price: 4,
        traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Juggernaut],
        origins: [UnitOrigin_S16.Zaun],
        classes: [UnitClass_S16.Juggernaut],
        attackRange: 1
    },
    "斯卡纳": {
        displayName: "斯卡纳",
        englishId: "TFT16_Skarner",
        price: 4,
        traits: [UnitOrigin_S16.Ixtal],
        origins: [UnitOrigin_S16.Ixtal],
        classes: [],
        attackRange: 1
    },
    "斯维因": {
        displayName: "斯维因",
        englishId: "TFT16_Swain",
        price: 4,
        traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Sorcerer, UnitClass_S16.Juggernaut],
        origins: [UnitOrigin_S16.Noxus],
        classes: [UnitClass_S16.Sorcerer, UnitClass_S16.Juggernaut],
        attackRange: 2
    },
    "孙悟空": {
        displayName: "孙悟空",
        englishId: "TFT16_Wukong",
        price: 4,
        traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Bruiser],
        origins: [UnitOrigin_S16.Ionia],
        classes: [UnitClass_S16.Bruiser],
        attackRange: 1
    },
    "塔里克": {
        displayName: "塔里克",
        englishId: "TFT16_Taric",
        price: 4,
        traits: [UnitOrigin_S16.Targon],
        origins: [UnitOrigin_S16.Targon],
        classes: [],
        attackRange: 1
    },
    "维迦": {
        displayName: "维迦",
        englishId: "TFT16_Veigar",
        price: 4,
        traits: [UnitOrigin_S16.Yordle, UnitClass_S16.Sorcerer],
        origins: [UnitOrigin_S16.Yordle],
        classes: [UnitClass_S16.Sorcerer],
        attackRange: 4
    },
    "沃里克": {
        displayName: "沃里克",
        englishId: "TFT16_Warwick",
        price: 4,
        traits: [UnitOrigin_S16.Zaun, UnitClass_S16.Rapidfire],
        origins: [UnitOrigin_S16.Zaun],
        classes: [UnitClass_S16.Rapidfire],
        attackRange: 1
    },
    "永恩": {
        displayName: "永恩",
        englishId: "TFT16_Yone",
        price: 4,
        traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Slayer],
        origins: [UnitOrigin_S16.Ionia],
        classes: [UnitClass_S16.Slayer],
        attackRange: 1
    },
    "芸阿娜": {
        displayName: "芸阿娜",
        englishId: "TFT16_Yunara",
        price: 4,
        traits: [UnitOrigin_S16.Ionia, UnitClass_S16.Rapidfire],
        origins: [UnitOrigin_S16.Ionia],
        classes: [UnitClass_S16.Rapidfire],
        attackRange: 4
    },

    // 5 费棋子
    "亚托克斯": {
        displayName: "亚托克斯",
        englishId: "TFT16_Aatrox",
        price: 5,
        traits: [UnitOrigin_S16.Darkin, UnitClass_S16.Slayer],
        origins: [UnitOrigin_S16.Darkin],
        classes: [UnitClass_S16.Slayer],
        attackRange: 1
    },
    "安妮": {
        displayName: "安妮",
        englishId: "TFT16_Annie",
        price: 5,
        traits: [UnitOrigin_S16.DarkChild, UnitClass_S16.Sorcerer],
        origins: [UnitOrigin_S16.DarkChild],
        classes: [UnitClass_S16.Sorcerer],
        attackRange: 4
    },
    "阿兹尔": {
        displayName: "阿兹尔",
        englishId: "TFT16_Azir",
        price: 5,
        traits: [UnitOrigin_S16.Shurima, UnitOrigin_S16.Emperor, UnitClass_S16.Magus],
        origins: [UnitOrigin_S16.Shurima, UnitOrigin_S16.Emperor],
        classes: [UnitClass_S16.Magus],
        attackRange: 4
    },
    "费德提克": {
        displayName: "费德提克",
        englishId: "TFT16_Fiddlesticks",
        price: 5,
        traits: [UnitOrigin_S16.Harvester, UnitClass_S16.Vanquisher],
        origins: [UnitOrigin_S16.Harvester],
        classes: [UnitClass_S16.Vanquisher],
        attackRange: 2
    },
    "吉格斯": {
        displayName: "吉格斯",
        englishId: "TFT16_Ziggs",
        price: 5,
        traits: [UnitOrigin_S16.Zaun, UnitOrigin_S16.Yordle, UnitClass_S16.Longshot],
        origins: [UnitOrigin_S16.Zaun, UnitOrigin_S16.Yordle],
        classes: [UnitClass_S16.Longshot],
        attackRange: 6
    },
    "加里奥": {
        displayName: "加里奥",
        englishId: "TFT16_Galio",
        price: 5,
        traits: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Heroic],
        origins: [UnitOrigin_S16.Demacia, UnitOrigin_S16.Heroic],
        classes: [],
        attackRange: 1
    },
    "基兰": {
        displayName: "基兰",
        englishId: "TFT16_Zilean",
        price: 5,
        traits: [UnitOrigin_S16.Chronokeeper, UnitClass_S16.Invoker],
        origins: [UnitOrigin_S16.Chronokeeper],
        classes: [UnitClass_S16.Invoker],
        attackRange: 4
    },
    "千珏": {
        displayName: "千珏",
        englishId: "TFT16_Kindred",
        price: 5,
        traits: [UnitOrigin_S16.Kindred, UnitClass_S16.Rapidfire],
        origins: [UnitOrigin_S16.Kindred],
        classes: [UnitClass_S16.Rapidfire],
        attackRange: 4
    },
    "卢锡安与赛娜": {
        displayName: "卢锡安与赛娜",
        englishId: "TFT16_Lucian",
        price: 5,
        traits: [UnitOrigin_S16.Soulbound, UnitClass_S16.Gunslinger],
        origins: [UnitOrigin_S16.Soulbound],
        classes: [UnitClass_S16.Gunslinger],
        attackRange: 4
    },
    "梅尔": {
        displayName: "梅尔",
        englishId: "TFT16_Mel",
        price: 5,
        traits: [UnitOrigin_S16.Noxus, UnitClass_S16.Magus],
        origins: [UnitOrigin_S16.Noxus],
        classes: [UnitClass_S16.Magus],
        attackRange: 4
    },
    "奥恩": {
        displayName: "奥恩",
        englishId: "TFT16_Ornn",
        price: 5,
        traits: [UnitOrigin_S16.Blacksmith, UnitClass_S16.Warden],
        origins: [UnitOrigin_S16.Blacksmith],
        classes: [UnitClass_S16.Warden],
        attackRange: 1
    },
    "瑟提": {
        displayName: "瑟提",
        englishId: "TFT16_Sett",
        price: 5,
        traits: [UnitOrigin_S16.Ionia, UnitOrigin_S16.TheBoss],
        origins: [UnitOrigin_S16.Ionia, UnitOrigin_S16.TheBoss],
        classes: [],
        attackRange: 1
    },
    "希瓦娜": {
        displayName: "希瓦娜",
        englishId: "TFT16_Shyvana",
        price: 5,
        traits: [UnitOrigin_S16.Dragonborn, UnitClass_S16.Juggernaut],
        origins: [UnitOrigin_S16.Dragonborn],
        classes: [UnitClass_S16.Juggernaut],
        attackRange: 1
    },
    "塔姆": {
        displayName: "塔姆",
        englishId: "TFT16_TahmKench",
        price: 5,
        traits: [UnitOrigin_S16.Bilgewater, UnitOrigin_S16.Glutton, UnitClass_S16.Bruiser],
        origins: [UnitOrigin_S16.Bilgewater, UnitOrigin_S16.Glutton],
        classes: [UnitClass_S16.Bruiser],
        attackRange: 1
    },
    "锤石": {
        displayName: "锤石",
        englishId: "TFT16_Thresh",
        price: 5,
        traits: [UnitOrigin_S16.ShadowIsles, UnitClass_S16.Warden],
        origins: [UnitOrigin_S16.ShadowIsles],
        classes: [UnitClass_S16.Warden],
        attackRange: 1
    },
    "沃利贝尔": {
        displayName: "沃利贝尔",
        englishId: "TFT16_Volibear",
        price: 5,
        traits: [UnitOrigin_S16.Freljord, UnitClass_S16.Bruiser],
        origins: [UnitOrigin_S16.Freljord],
        classes: [UnitClass_S16.Bruiser],
        attackRange: 1
    },

    // 特殊/高费羁绊单位（价格 7）
    "奥瑞利安·索尔": {
        displayName: "奥瑞利安·索尔",
        englishId: "TFT16_AurelionSol",
        price: 7,
        traits: [UnitOrigin_S16.Starforger, UnitOrigin_S16.Targon],
        origins: [UnitOrigin_S16.Starforger, UnitOrigin_S16.Targon],
        classes: [],
        attackRange: 4
    },
    "纳什男爵": {
        displayName: "纳什男爵",
        englishId: "TFT16_BaronNashor",
        price: 7,
        traits: [UnitOrigin_S16.Void, UnitOrigin_S16.Baron],
        origins: [UnitOrigin_S16.Void, UnitOrigin_S16.Baron],
        classes: [],
        attackRange: 2
    },
    "瑞兹": {
        displayName: "瑞兹",
        englishId: "TFT16_Ryze",
        price: 7,
        traits: [UnitOrigin_S16.RuneMage],
        origins: [UnitOrigin_S16.RuneMage],
        classes: [],
        attackRange: 4
    },
    "亚恒": {
        displayName: "亚恒",
        englishId: "TFT16_Xayah",
        price: 7,
        traits: [UnitOrigin_S16.Darkin, UnitOrigin_S16.Immortal],
        origins: [UnitOrigin_S16.Darkin, UnitOrigin_S16.Immortal],
        classes: [],
        attackRange: 2
    },

    // 特殊召唤物/机甲/其他
    "海克斯霸龙": {
        displayName: "海克斯霸龙",
        englishId: "TFT16_THex",
        price: 5, // 官方数据是5费
        traits: [UnitOrigin_S16.HexMech, UnitOrigin_S16.Piltover, UnitClass_S16.Gunslinger],
        origins: [UnitOrigin_S16.HexMech, UnitOrigin_S16.Piltover],
        classes: [UnitClass_S16.Gunslinger],
        attackRange: 2
    },
    "佐伊": {
        displayName: "佐伊",
        englishId: "TFT16_Zoe",
        price: 3, // 官方数据是3费
        traits: [UnitOrigin_S16.Targon],
        origins: [UnitOrigin_S16.Targon],
        classes: [],
        attackRange: 4
    },
    "菲兹": {
        displayName: "菲兹",
        englishId: "TFT16_Fizz",
        price: 4, // 官方数据是4费
        traits: [UnitOrigin_S16.Bilgewater, UnitOrigin_S16.Yordle],
        origins: [UnitOrigin_S16.Bilgewater, UnitOrigin_S16.Yordle],
        classes: [], // 官方数据 jobs 为空
        attackRange: 1
    },
} satisfies Record<string, TFTUnit>;

export const TFT_16_CHAMPION_DATA: Record<keyof typeof _TFT_16_CHAMPION_DATA, TFTUnit> = _TFT_16_CHAMPION_DATA;


// ==========================================
//
// 下面是装备
//
// ==========================================
//
// 装备图标资源获取方式：
// URL 模板: https://game.gtimg.cn/images/lol/act/img/tft/equip/{equipId}.png
// 示例: https://game.gtimg.cn/images/lol/act/img/tft/equip/91840.png
//
// ==========================================


const specialEquip: Record<string, TFTEquip> = {
    //  特殊类型的装备，比如装备拆卸器，强化果实等
    "强化果实": {
        name: "强化果实",
        englishName: "TFT_Item_PowerSnax",
        equipId: "-1",  //  不知道装备ID
        formula: ""
    },
    "装备拆卸器": {
        name: "装备拆卸器",
        englishName: "TFT_Item_MagneticRemover",
        equipId: "-1",  //  不知道装备ID
        formula: ""
    },
    "金质装备拆卸器": {
        name: "金质装备拆卸器",
        englishName: "TFT_Item_GoldenItemRemover",
        equipId: "-1",  //  不知道装备ID
        formula: ""
    },
    "微型英雄复制器": {
        name: "微型英雄复制器",
        englishName: "TFT_Item_LesserChampionDuplicator",
        equipId: "-1",  //  不知道装备ID
        formula: ""
    },
    "装备重铸器": {
        name: "装备重铸器",
        englishName: "TFT_Item_Reforger",
        equipId: "-1",  //  不知道装备ID
        formula: ""
    },
}

const _TFT_16_EQUIP_DATA: Record<string, TFTEquip> = {
    ...specialEquip,
    // ==========================================
    // Type 1: 基础散件 (Base Items)
    // S16沿用了S15的9大基础散件，但ID已更新。
    // ==========================================
    "暴风之剑": {
        name: "暴风之剑",
        englishName: "TFT_Item_BFSword",
        equipId: "91811",
        formula: ""
    },
    "反曲之弓": {
        name: "反曲之弓",
        englishName: "TFT_Item_RecurveBow",
        equipId: "91859",
        formula: ""
    },
    "无用大棒": {
        name: "无用大棒",
        englishName: "TFT_Item_NeedlesslyLargeRod",
        equipId: "91851",
        formula: ""
    },
    "女神之泪": {
        name: "女神之泪",
        englishName: "TFT_Item_TearOfTheGoddess",
        equipId: "91874",
        formula: ""
    },
    "锁子甲": {
        name: "锁子甲",
        englishName: "TFT_Item_ChainVest",
        equipId: "91817",
        formula: ""
    },
    "负极斗篷": {
        name: "负极斗篷",
        englishName: "TFT_Item_NegatronCloak",
        equipId: "91852",
        formula: ""
    },
    "巨人腰带": {
        name: "巨人腰带",
        englishName: "TFT_Item_GiantsBelt",
        equipId: "91838",
        formula: ""
    },
    "拳套": {
        name: "拳套",
        englishName: "TFT_Item_SparringGloves",
        equipId: "91865",
        formula: ""
    },
    "金铲铲": {
        name: "金铲铲",
        englishName: "TFT_Item_Spatula",
        equipId: "91866",
        formula: ""
    },
    "金锅锅": {
        name: "金锅锅",
        englishName: "TFT_Item_FryingPan",
        equipId: "91836",
        formula: ""
    },

    // ==========================================
    // Type 2: 标准合成装备 (Standard Completed Items)
    // 公式使用S16的新基础装备ID进行引用。
    // ==========================================
    "死亡之刃": {
        name: "死亡之刃",
        englishName: "TFT_Item_Deathblade",
        equipId: "91820",
        formula: "91811,91811"
    },
    "巨人杀手": {
        name: "巨人杀手",
        englishName: "TFT_Item_MadredsBloodrazor",
        equipId: "91848",
        formula: "91811,91859"
    },
    "海克斯科技枪刃": {
        name: "海克斯科技枪刃",
        englishName: "TFT_Item_HextechGunblade",
        equipId: "91841",
        formula: "91811,91851"
    },
    "朔极之矛": {
        name: "朔极之矛",
        englishName: "TFT_Item_SpearOfShojin",
        equipId: "91867",
        formula: "91811,91874"
    },
    "夜之锋刃": {
        name: "夜之锋刃",
        englishName: "TFT_Item_GuardianAngel",
        equipId: "91839",
        formula: "91811,91817"
    },
    "饮血剑": {
        name: "饮血剑",
        englishName: "TFT_Item_Bloodthirster",
        equipId: "91814",
        formula: "91811,91852"
    },
    "斯特拉克的挑战护手": {
        name: "斯特拉克的挑战护手",
        englishName: "TFT_Item_SteraksGage",
        equipId: "91870",
        formula: "91811,91838"
    },
    "无尽之刃": {
        name: "无尽之刃",
        englishName: "TFT_Item_InfinityEdge",
        equipId: "91842",
        formula: "91811,91865"
    },
    "鬼索的狂暴之刃": {
        name: "鬼索的狂暴之刃",
        englishName: "TFT_Item_GuinsoosRageblade",
        equipId: "91840",
        formula: "91859,91851"
    },
    "虚空之杖": {
        name: "虚空之杖",
        englishName: "TFT_Item_StatikkShiv",
        equipId: "91869",
        formula: "91859,91874"
    },
    "泰坦的坚决": {
        name: "泰坦的坚决",
        englishName: "TFT_Item_TitansResolve",
        equipId: "91877",
        formula: "91817,91859"
    },
    "海妖之怒": {
        name: "海妖之怒",
        englishName: "TFT_Item_RunaansHurricane",
        equipId: "91862",
        formula: "91852,91859"
    },
    "纳什之牙": {
        name: "纳什之牙",
        englishName: "TFT_Item_Leviathan",
        equipId: "91846",
        formula: "91859,91838"
    },
    "最后的轻语": {
        name: "最后的轻语",
        englishName: "TFT_Item_LastWhisper",
        equipId: "91845",
        formula: "91859,91865"
    },
    "灭世者的死亡之帽": {
        name: "灭世者的死亡之帽",
        englishName: "TFT_Item_RabadonsDeathcap",
        equipId: "91856",
        formula: "91851,91851"
    },
    "大天使之杖": {
        name: "大天使之杖",
        englishName: "TFT_Item_ArchangelsStaff",
        equipId: "91776",
        formula: "91851,91874"
    },
    "冕卫": {
        name: "冕卫",
        englishName: "TFT_Item_Crownguard",
        equipId: "91819",
        formula: "91851,91817"
    },
    "离子火花": {
        name: "离子火花",
        englishName: "TFT_Item_IonicSpark",
        equipId: "91843",
        formula: "91851,91852"
    },
    "莫雷洛秘典": {
        name: "莫雷洛秘典",
        englishName: "TFT_Item_Morellonomicon",
        equipId: "91850",
        formula: "91851,91838"
    },
    "珠光护手": {
        name: "珠光护手",
        englishName: "TFT_Item_JeweledGauntlet",
        equipId: "91844",
        formula: "91851,91865"
    },
    "蓝霸符": {
        name: "蓝霸符",
        englishName: "TFT_Item_BlueBuff",
        equipId: "91815",
        formula: "91874,91874"
    },
    "圣盾使的誓约": {
        name: "圣盾使的誓约",
        englishName: "TFT_Item_FrozenHeart",
        equipId: "91835",
        formula: "91874,91817"
    },
    "棘刺背心": {
        name: "棘刺背心",
        englishName: "TFT_Item_BrambleVest",
        equipId: "91816",
        formula: "91817,91817"
    },
    "石像鬼石板甲": {
        name: "石像鬼石板甲",
        englishName: "TFT_Item_GargoyleStoneplate",
        equipId: "91837",
        formula: "91817,91852"
    },
    "日炎斗篷": {
        name: "日炎斗篷",
        englishName: "TFT_Item_RedBuff",
        equipId: "91860",
        formula: "91817,91838"
    },
    "坚定之心": {
        name: "坚定之心",
        englishName: "TFT_Item_NightHarvester",
        equipId: "91853",
        formula: "91817,91865"
    },
    "巨龙之爪": {
        name: "巨龙之爪",
        englishName: "TFT_Item_DragonsClaw",
        equipId: "91831",
        formula: "91852,91852"
    },
    "适应性头盔": {
        name: "适应性头盔",
        englishName: "TFT_Item_AdaptiveHelm",
        equipId: "91774",
        formula: "91852,91874"
    },
    "薄暮法袍": {
        name: "薄暮法袍",
        englishName: "TFT_Item_SpectralGauntlet",
        equipId: "91868",
        formula: "91852,91838"
    },
    "水银": {
        name: "水银",
        englishName: "TFT_Item_Quicksilver",
        equipId: "91855",
        formula: "91865,91852"
    },
    "振奋盔甲": {
        name: "振奋盔甲",
        englishName: "TFT_Item_Redemption",
        equipId: "91861",
        formula: "91874,91838"
    },
    "狂徒铠甲": {
        name: "狂徒铠甲",
        englishName: "TFT_Item_WarmogsArmor",
        equipId: "91881",
        formula: "91838,91838"
    },
    "强袭者的链枷": {
        name: "强袭者的链枷",
        englishName: "TFT_Item_PowerGauntlet",
        equipId: "91854",
        formula: "91838,91865"
    },
    "正义之手": {
        name: "正义之手",
        englishName: "TFT_Item_UnstableConcoction",
        equipId: "91878",
        formula: "91874,91865"
    },
    "窃贼手套": {
        name: "窃贼手套",
        englishName: "TFT_Item_ThiefsGloves",
        equipId: "91875",
        formula: "91865,91865"
    },
    "红霸符": {
        name: "红霸符",
        englishName: "TFT_Item_RapidFireCannon",
        equipId: "91858",
        formula: "91859,91859"
    },

    // ==========================================
    // Type 2/5: S16 纹章 (Emblems)
    // ==========================================
    "金铲铲冠冕": {
        name: "金铲铲冠冕",
        englishName: "TFT_Item_ForceOfNature",
        equipId: "91834",
        formula: "91866,91866"
    },
    "金锅铲冠冕": {
        name: "金锅铲冠冕",
        englishName: "TFT_Item_TacticiansRing",
        equipId: "91872",
        formula: "91866,91836"
    },
    "金锅锅冠冕": {
        name: "金锅锅冠冕",
        englishName: "TFT_Item_TacticiansScepter",
        equipId: "91873",
        formula: "91836,91836"
    },
    "比尔吉沃特纹章": {
        name: "比尔吉沃特纹章",
        englishName: "TFT16_Item_BilgewaterEmblemItem",
        equipId: "91520",
        formula: "91866,91874"
    },
    "斗士纹章": {
        name: "斗士纹章",
        englishName: "TFT16_Item_BrawlerEmblemItem",
        equipId: "91557",
        formula: "91836,91838"
    },
    "护卫纹章": {
        name: "护卫纹章",
        englishName: "TFT16_Item_DefenderEmblemItem",
        equipId: "91558",
        formula: "91836,91817"
    },
    "德玛西亚纹章": {
        name: "德玛西亚纹章",
        englishName: "TFT16_Item_DemaciaEmblemItem",
        equipId: "91559",
        formula: "91866,91817"
    },
    "弗雷尔卓德纹章": {
        name: "弗雷尔卓德纹章",
        englishName: "TFT16_Item_FreljordEmblemItem",
        equipId: "91560",
        formula: "91866,91838"
    },
    "枪手纹章": {
        name: "枪手纹章",
        englishName: "TFT16_Item_GunslingerEmblemItem",
        equipId: "91561",
        formula: ""
    },
    "神谕者纹章": {
        name: "神谕者纹章",
        englishName: "TFT16_Item_InvokerEmblemItem",
        equipId: "91562",
        formula: "91836,91874"
    },
    "艾欧尼亚纹章": {
        name: "艾欧尼亚纹章",
        englishName: "TFT16_Item_IoniaEmblemItem",
        equipId: "91563",
        formula: "91866,91851"
    },
    "以绪塔尔纹章": {
        name: "以绪塔尔纹章",
        englishName: "TFT16_Item_IxtalEmblemItem",
        equipId: "91564",
        formula: ""
    },
    "主宰纹章": {
        name: "主宰纹章",
        englishName: "TFT16_Item_JuggernautEmblemItem",
        equipId: "91565",
        formula: "91836,91852"
    },
    "狙神纹章": {
        name: "狙神纹章",
        englishName: "TFT16_Item_LongshotEmblemItem",
        equipId: "91566",
        formula: ""
    },
    "耀光使纹章": {
        name: "耀光使纹章",
        englishName: "TFT16_Item_MagusEmblemItem",
        equipId: "91567",
        formula: ""
    },
    "诺克萨斯纹章": {
        name: "诺克萨斯纹章",
        englishName: "TFT16_Item_NoxusEmblemItem",
        equipId: "91568",
        formula: "91866,91811"
    },
    "皮尔特沃夫纹章": {
        name: "皮尔特沃夫纹章",
        englishName: "TFT16_Item_PiltoverEmblemItem",
        equipId: "91569",
        formula: ""
    },
    "迅击战士纹章": {
        name: "迅击战士纹章",
        englishName: "TFT16_Item_RapidfireEmblemItem",
        equipId: "91590",
        formula: "91836,91859"
    },
    "裁决战士纹章": {
        name: "裁决战士纹章",
        englishName: "TFT16_Item_SlayerEmblemItem",
        equipId: "91591",
        formula: "91836,91811"
    },
    "法师纹章": {
        name: "法师纹章",
        englishName: "TFT16_Item_SorcererEmblemItem",
        equipId: "91592",
        formula: "91836,91851"
    },
    "征服者纹章": {
        name: "征服者纹章",
        englishName: "TFT16_Item_VanquisherEmblemItem",
        equipId: "91593",
        formula: "91836,91865"
    },
    "虚空纹章": {
        name: "虚空纹章",
        englishName: "TFT16_Item_VoidEmblemItem",
        equipId: "91594",
        formula: "91866,91859"
    },
    "神盾使纹章": {
        name: "神盾使纹章",
        englishName: "TFT16_Item_WardenEmblemItem",
        equipId: "91595",
        formula: ""
    },
    "约德尔人纹章": {
        name: "约德尔人纹章",
        englishName: "TFT16_Item_YordleEmblemItem",
        equipId: "91596",
        formula: "91866,91852"
    },
    "祖安纹章": {
        name: "祖安纹章",
        englishName: "TFT16_Item_ZaunEmblemItem",
        equipId: "91597",
        formula: "91866,91865"
    },

    // ==========================================
    // Type 3: 光明装备 (Radiant Items)
    // ==========================================
    "光明版适应性头盔": {
        name: "光明版适应性头盔",
        englishName: "TFT5_Item_AdaptiveHelmRadiant",
        equipId: "91621",
        formula: ""
    },
    "光明版大天使之杖": {
        name: "光明版大天使之杖",
        englishName: "TFT5_Item_ArchangelsStaffRadiant",
        equipId: "91622",
        formula: ""
    },
    "光明版饮血剑": {
        name: "光明版饮血剑",
        englishName: "TFT5_Item_BloodthirsterRadiant",
        equipId: "91623",
        formula: ""
    },
    "光明版蓝霸符": {
        name: "光明版蓝霸符",
        englishName: "TFT5_Item_BlueBuffRadiant",
        equipId: "91624",
        formula: ""
    },
    "光明版棘刺背心": {
        name: "光明版棘刺背心",
        englishName: "TFT5_Item_BrambleVestRadiant",
        equipId: "91625",
        formula: ""
    },
    "光明版冕卫": {
        name: "光明版冕卫",
        englishName: "TFT5_Item_CrownguardRadiant",
        equipId: "91626",
        formula: ""
    },
    "光明版死亡之刃": {
        name: "光明版死亡之刃",
        englishName: "TFT5_Item_DeathbladeRadiant",
        equipId: "91627",
        formula: ""
    },
    "光明版巨龙之爪": {
        name: "光明版巨龙之爪",
        englishName: "TFT5_Item_DragonsClawRadiant",
        equipId: "91628",
        formula: ""
    },
    "光明版圣盾使的誓约": {
        name: "光明版圣盾使的誓约",
        englishName: "TFT5_Item_FrozenHeartRadiant",
        equipId: "91629",
        formula: ""
    },
    "光明版石像鬼石板甲": {
        name: "光明版石像鬼石板甲",
        englishName: "TFT5_Item_GargoyleStoneplateRadiant",
        equipId: "91630",
        formula: ""
    },
    "光明版巨人杀手": {
        name: "光明版巨人杀手",
        englishName: "TFT5_Item_GiantSlayerRadiant",
        equipId: "91631",
        formula: ""
    },
    "光明版夜之锋刃": {
        name: "光明版夜之锋刃",
        englishName: "TFT5_Item_GuardianAngelRadiant",
        equipId: "91632",
        formula: ""
    },
    "光明版鬼索的狂暴之刃": {
        name: "光明版鬼索的狂暴之刃",
        englishName: "TFT5_Item_GuinsoosRagebladeRadiant",
        equipId: "91633",
        formula: ""
    },
    "光明版正义之手": {
        name: "光明版正义之手",
        englishName: "TFT5_Item_HandOfJusticeRadiant",
        equipId: "91634",
        formula: ""
    },
    "光明版海克斯科技枪刃": {
        name: "光明版海克斯科技枪刃",
        englishName: "TFT5_Item_HextechGunbladeRadiant",
        equipId: "91635",
        formula: ""
    },
    "光明版无尽之刃": {
        name: "光明版无尽之刃",
        englishName: "TFT5_Item_InfinityEdgeRadiant",
        equipId: "91636",
        formula: ""
    },
    "光明版离子火花": {
        name: "光明版离子火花",
        englishName: "TFT5_Item_IonicSparkRadiant",
        equipId: "91637",
        formula: ""
    },
    "光明版珠光护手": {
        name: "光明版珠光护手",
        englishName: "TFT5_Item_JeweledGauntletRadiant",
        equipId: "91638",
        formula: ""
    },
    "光明版最后的轻语": {
        name: "光明版最后的轻语",
        englishName: "TFT5_Item_LastWhisperRadiant",
        equipId: "91639",
        formula: ""
    },
    "光明版纳什之牙": {
        name: "光明版纳什之牙",
        englishName: "TFT5_Item_LeviathanRadiant",
        equipId: "91640",
        formula: ""
    },
    "光明版莫雷洛秘典": {
        name: "光明版莫雷洛秘典",
        englishName: "TFT5_Item_MorellonomiconRadiant",
        equipId: "91641",
        formula: ""
    },
    "光明版坚定之心": {
        name: "光明版坚定之心",
        englishName: "TFT5_Item_NightHarvesterRadiant",
        equipId: "91642",
        formula: ""
    },
    "光明版水银": {
        name: "光明版水银",
        englishName: "TFT5_Item_QuicksilverRadiant",
        equipId: "91643",
        formula: ""
    },
    "光明版灭世者的死亡之帽": {
        name: "光明版灭世者的死亡之帽",
        englishName: "TFT5_Item_RabadonsDeathcapRadiant",
        equipId: "91644",
        formula: ""
    },
    "光明版红霸符": {
        name: "光明版红霸符",
        englishName: "TFT5_Item_RapidFirecannonRadiant",
        equipId: "91645",
        formula: ""
    },
    "光明版振奋盔甲": {
        name: "光明版振奋盔甲",
        englishName: "TFT5_Item_RedemptionRadiant",
        equipId: "91646",
        formula: ""
    },
    "光明版海妖之怒": {
        name: "光明版海妖之怒",
        englishName: "TFT5_Item_RunaansHurricaneRadiant",
        equipId: "91647",
        formula: ""
    },
    "光明版朔极之矛": {
        name: "光明版朔极之矛",
        englishName: "TFT5_Item_SpearOfShojinRadiant",
        equipId: "91648",
        formula: ""
    },
    "光明版薄暮法袍": {
        name: "光明版薄暮法袍",
        englishName: "TFT5_Item_SpectralGauntletRadiant",
        equipId: "91649",
        formula: ""
    },
    "光明版虚空之杖": {
        name: "光明版虚空之杖",
        englishName: "TFT5_Item_StatikkShivRadiant",
        equipId: "91650",
        formula: ""
    },
    "光明版斯特拉克的挑战护手": {
        name: "光明版斯特拉克的挑战护手",
        englishName: "TFT5_Item_SteraksGageRadiant",
        equipId: "91651",
        formula: ""
    },
    "光明版日炎斗篷": {
        name: "光明版日炎斗篷",
        englishName: "TFT5_Item_SunfireCapeRadiant",
        equipId: "91652",
        formula: ""
    },
    "光明版窃贼手套": {
        name: "光明版窃贼手套",
        englishName: "TFT5_Item_ThiefsGlovesRadiant",
        equipId: "91653",
        formula: ""
    },
    "光明版泰坦的坚决": {
        name: "光明版泰坦的坚决",
        englishName: "TFT5_Item_TitansResolveRadiant",
        equipId: "91654",
        formula: ""
    },
    "光明版强袭者的链枷": {
        name: "光明版强袭者的链枷",
        englishName: "TFT5_Item_TrapClawRadiant",
        equipId: "91655",
        formula: ""
    },
    "光明版狂徒铠甲": {
        name: "光明版狂徒铠甲",
        englishName: "TFT5_Item_WarmogsArmorRadiant",
        equipId: "91656",
        formula: ""
    },

    // ==========================================
    // Type 4: S16 特殊/羁绊装备 (Unique Trait Items)
    // ==========================================
    "残酷弯刀": {
        name: "残酷弯刀",
        englishName: "TFT16_Item_Bilgewater_BilgeratCutlass",
        equipId: "91537",
        formula: ""
    },
    "黑市炸药": {
        name: "黑市炸药",
        englishName: "TFT16_Item_Bilgewater_BlackmarketExplosives",
        equipId: "91538",
        formula: ""
    },
    "强盗的骰子": {
        name: "强盗的骰子",
        englishName: "TFT16_Item_Bilgewater_BrigandsDice",
        equipId: "91539",
        formula: ""
    },
    "船长的酿造品": {
        name: "船长的酿造品",
        englishName: "TFT16_Item_Bilgewater_CaptainsBrew",
        equipId: "91540",
        formula: ""
    },
    "亡者的短剑": {
        name: "亡者的短剑",
        englishName: "TFT16_Item_Bilgewater_DeadmansDagger",
        equipId: "91541",
        formula: ""
    },
    "震畏大炮": {
        name: "震畏大炮",
        englishName: "TFT16_Item_Bilgewater_DreadwayCannon",
        equipId: "91542",
        formula: ""
    },
    "大副的燧发枪": {
        name: "大副的燧发枪",
        englishName: "TFT16_Item_Bilgewater_FirstMatesFlintlock",
        equipId: "91547",
        formula: ""
    },
    "酒吧指虎": {
        name: "酒吧指虎",
        englishName: "TFT16_Item_Bilgewater_FreebootersFrock",
        equipId: "91548",
        formula: ""
    },
    "鬼影望远镜": {
        name: "鬼影望远镜",
        englishName: "TFT16_Item_Bilgewater_HauntedSpyglass",
        equipId: "91549",
        formula: ""
    },
    "船长的帽子": {
        name: "船长的帽子",
        englishName: "TFT16_Item_Bilgewater_JollyRoger",
        equipId: "91553",
        formula: ""
    },
    "幸运达布隆金币": {
        name: "幸运达布隆金币",
        englishName: "TFT16_Item_Bilgewater_LuckyEyepatch",
        equipId: "91554",
        formula: ""
    },
    "成堆柑橘": {
        name: "成堆柑橘",
        englishName: "TFT16_Item_Bilgewater_PileOCitrus",
        equipId: "91555",
        formula: ""
    },
    "黑市补货": {
        name: "黑市补货",
        englishName: "TFT16_Item_Bilgewater_ShopRefresh",
        equipId: "91556",
        formula: ""
    },
    "暗裔之盾": {
        name: "暗裔之盾",
        englishName: "TFT16_TheDarkinAegis",
        equipId: "91598",
        formula: ""
    },
    "暗裔之弓": {
        name: "暗裔之弓",
        englishName: "TFT16_TheDarkinBow",
        equipId: "91599",
        formula: ""
    },
    "暗裔之镰": {
        name: "暗裔之镰",
        englishName: "TFT16_TheDarkinScythe",
        equipId: "91600",
        formula: ""
    },
    "暗裔之杖": {
        name: "暗裔之杖",
        englishName: "TFT16_TheDarkinStaff",
        equipId: "91601",
        formula: ""
    },

    // ==========================================
    // Type 6: 奥恩神器 (Ornn Artifacts)
    // 列表中只保留了 S16 资料中标记为 isShow: "1" 的神器
    // ==========================================
    "死亡之蔑": {
        name: "死亡之蔑",
        englishName: "TFT4_Item_OrnnDeathsDefiance",
        equipId: "91613",
        formula: ""
    },
    "永恒凛冬": {
        name: "永恒凛冬",
        englishName: "TFT4_Item_OrnnEternalWinter",
        equipId: "91614",
        formula: ""
    },
    "三相之力": {
        name: "三相之力",
        englishName: "TFT4_Item_OrnnInfinityForce",
        equipId: "91615",
        formula: ""
    },
    "魔蕴": {
        name: "魔蕴",
        englishName: "TFT4_Item_OrnnMuramana",
        equipId: "91616",
        formula: ""
    },
    "黑曜石切割者": {
        name: "黑曜石切割者",
        englishName: "TFT4_Item_OrnnObsidianCleaver",
        equipId: "91617",
        formula: ""
    },
    "兰顿之兆": {
        name: "兰顿之兆",
        englishName: "TFT4_Item_OrnnRanduinsSanctum",
        equipId: "91618",
        formula: ""
    },
    "金币收集者": {
        name: "金币收集者",
        englishName: "TFT4_Item_OrnnTheCollector",
        equipId: "91619",
        formula: ""
    },
    "中娅悖论": {
        name: "中娅悖论",
        englishName: "TFT4_Item_OrnnZhonyasParadox",
        equipId: "91620",
        formula: ""
    },
    "冥火之拥": {
        name: "冥火之拥",
        englishName: "TFT9_Item_OrnnDeathfireGrasp",
        equipId: "91670",
        formula: ""
    },
    "狙击手的专注": {
        name: "狙击手的专注",
        englishName: "TFT9_Item_OrnnHorizonFocus",
        equipId: "91671",
        formula: ""
    },
    "碎舰者": {
        name: "碎舰者",
        englishName: "TFT9_Item_OrnnHullbreaker",
        equipId: "91672",
        formula: ""
    },
    "铁匠手套": {
        name: "铁匠手套",
        englishName: "TFT9_Item_OrnnPrototypeForge",
        equipId: "91673",
        formula: ""
    },
    "诡术师之镜": {
        name: "诡术师之镜",
        englishName: "TFT9_Item_OrnnTrickstersGlass",
        equipId: "91674",
        formula: ""
    },
    "神器锻造器": {
        name: "神器锻造器",
        englishName: "TFT_Assist_ItemArmoryOrnn",
        equipId: "91720",
        formula: ""
    },
    "神器装备": {
        name: "神器装备",
        englishName: "TFT_Assist_RandomOrnnItem",
        equipId: "91730",
        formula: ""
    },
    "黎明圣盾": {
        name: "黎明圣盾",
        englishName: "TFT_Item_Artifact_AegisOfDawn",
        equipId: "91777",
        formula: ""
    },
    "黄昏圣盾": {
        name: "黄昏圣盾",
        englishName: "TFT_Item_Artifact_AegisOfDusk",
        equipId: "91778",
        formula: ""
    },
    "枯萎珠宝": {
        name: "枯萎珠宝",
        englishName: "TFT_Item_Artifact_BlightingJewel",
        equipId: "91779",
        formula: ""
    },
    "帽子饮品": {
        name: "帽子饮品",
        englishName: "TFT_Item_Artifact_CappaJuice",
        equipId: "91780",
        formula: ""
    },
    "黑暗吸血鬼节杖": {
        name: "黑暗吸血鬼节杖",
        englishName: "TFT_Item_Artifact_CursedVampiricScepter",
        equipId: "91781",
        formula: ""
    },
    "黎明核心": {
        name: "黎明核心",
        englishName: "TFT_Item_Artifact_Dawncore",
        equipId: "91782",
        formula: ""
    },
    "永恒契约": {
        name: "永恒契约",
        englishName: "TFT_Item_Artifact_EternalPact",
        equipId: "91783",
        formula: ""
    },
    "鱼骨头": {
        name: "鱼骨头",
        englishName: "TFT_Item_Artifact_Fishbones",
        equipId: "91784",
        formula: ""
    },
    "禁忌雕像": {
        name: "禁忌雕像",
        englishName: "TFT_Item_Artifact_ForbiddenIdol",
        equipId: "91785",
        formula: ""
    },
    "恶火小斧": {
        name: "恶火小斧",
        englishName: "TFT_Item_Artifact_HellfireHatchet",
        equipId: "91786",
        formula: ""
    },
    "视界专注": {
        name: "视界专注",
        englishName: "TFT_Item_Artifact_HorizonFocus",
        equipId: "91787",
        formula: ""
    },
    "激发之匣": {
        name: "激发之匣",
        englishName: "TFT_Item_Artifact_InnervatingLocket",
        equipId: "91788",
        formula: ""
    },
    "次级镜像人格面具": {
        name: "次级镜像人格面具",
        englishName: "TFT_Item_Artifact_LesserMirroredPersona",
        equipId: "91789",
        formula: ""
    },
    "巫妖之祸": {
        name: "巫妖之祸",
        englishName: "TFT_Item_Artifact_LichBane",
        equipId: "91790",
        formula: ""
    },
    "光盾徽章": {
        name: "光盾徽章",
        englishName: "TFT_Item_Artifact_LightshieldCrest",
        equipId: "91791",
        formula: ""
    },
    "卢登的激荡": {
        name: "卢登的激荡",
        englishName: "TFT_Item_Artifact_LudensTempest",
        equipId: "91792",
        formula: ""
    },
    "修复型回响": {
        name: "修复型回响",
        englishName: "TFT_Item_Artifact_MendingEchoes",
        equipId: "91793",
        formula: ""
    },
    "镜像人格面具": {
        name: "镜像人格面具",
        englishName: "TFT_Item_Artifact_MirroredPersona",
        equipId: "91794",
        formula: ""
    },
    "连指手套": {
        name: "连指手套",
        englishName: "TFT_Item_Artifact_Mittens",
        equipId: "91795",
        formula: ""
    },
    "烁刃": {
        name: "烁刃",
        englishName: "TFT_Item_Artifact_NavoriFlickerblades",
        equipId: "91796",
        formula: ""
    },
    "暗行者之爪": {
        name: "暗行者之爪",
        englishName: "TFT_Item_Artifact_ProwlersClaw",
        equipId: "91797",
        formula: ""
    },
    "疾射火炮": {
        name: "疾射火炮",
        englishName: "TFT_Item_Artifact_RapidFirecannon",
        equipId: "91798",
        formula: ""
    },
    "探索者的护臂": {
        name: "探索者的护臂",
        englishName: "TFT_Item_Artifact_SeekersArmguard",
        equipId: "91799",
        formula: ""
    },
    "暗影木偶": {
        name: "暗影木偶",
        englishName: "TFT_Item_Artifact_ShadowPuppet",
        equipId: "91800",
        formula: ""
    },
    "密银黎明": {
        name: "密银黎明",
        englishName: "TFT_Item_Artifact_SilvermereDawn",
        equipId: "91801",
        formula: ""
    },
    "幽魂弯刀": {
        name: "幽魂弯刀",
        englishName: "TFT_Item_Artifact_SpectralCutlass",
        equipId: "91802",
        formula: ""
    },
    "斯塔缇克电刃": {
        name: "斯塔缇克电刃",
        englishName: "TFT_Item_Artifact_StatikkShiv",
        equipId: "91803",
        formula: ""
    },
    "迷离风衣": {
        name: "迷离风衣",
        englishName: "TFT_Item_Artifact_SuspiciousTrenchCoat",
        equipId: "91804",
        formula: ""
    },
    "飞升护符": {
        name: "飞升护符",
        englishName: "TFT_Item_Artifact_TalismanOfAscension",
        equipId: "91805",
        formula: ""
    },
    "顽强不屈": {
        name: "顽强不屈",
        englishName: "TFT_Item_Artifact_TheIndomitable",
        equipId: "91806",
        formula: ""
    },
    "巨型九头蛇": {
        name: "巨型九头蛇",
        englishName: "TFT_Item_Artifact_TitanicHydra",
        equipId: "91807",
        formula: ""
    },
    "无终恨意": {
        name: "无终恨意",
        englishName: "TFT_Item_Artifact_UnendingDespair",
        equipId: "91808",
        formula: ""
    },
    "虚空护手": {
        name: "虚空护手",
        englishName: "TFT_Item_Artifact_VoidGauntlet",
        equipId: "91809",
        formula: ""
    },
    "智慧末刃": {
        name: "智慧末刃",
        englishName: "TFT_Item_Artifact_WitsEnd",
        equipId: "91810",
        formula: ""
    },

    // ==========================================
    // Type 7: 金鳞龙装备 (Shimmerscale Items)
    // ==========================================
    "坚定投资器": {
        name: "坚定投资器",
        englishName: "TFT7_Item_ShimmerscaleDeterminedInvestor",
        equipId: "91659",
        formula: ""
    },
    "钻石之手": {
        name: "钻石之手",
        englishName: "TFT7_Item_ShimmerscaleDiamondHands",
        equipId: "91660",
        formula: ""
    },
    "投机者之刃": {
        name: "投机者之刃",
        englishName: "TFT7_Item_ShimmerscaleGamblersBlade",
        equipId: "91661",
        formula: ""
    },
    "无用大宝石": {
        name: "无用大宝石",
        englishName: "TFT7_Item_ShimmerscaleHeartOfGold",
        equipId: "91663",
        formula: ""
    },
    "大亨之铠": {
        name: "大亨之铠",
        englishName: "TFT7_Item_ShimmerscaleMogulsMail",
        equipId: "91665",
        formula: ""
    },
    "投机者之刃_HR": {
        name: "投机者之刃",
        englishName: "TFT7_Item_ShimmerscaleGamblersBlade_HR",
        equipId: "91662",
        formula: ""
    },
    "无用大宝石_HR": {
        name: "无用大宝石",
        englishName: "TFT7_Item_ShimmerscaleHeartOfGold_HR",
        equipId: "91664",
        formula: ""
    },
    "大亨之铠_HR": {
        name: "大亨之铠",
        englishName: "TFT7_Item_ShimmerscaleMogulsMail_HR",
        equipId: "91666",
        formula: ""
    },
    "德莱文之斧": {
        name: "德莱文之斧",
        englishName: "TFT7_Item_ShimmerscaleDravensAxe",
        equipId: "91418",
        formula: ""
    },
    "贪婪宝珠": {
        name: "贪婪宝珠",
        englishName: "TFT7_Item_ShimmerscaleHighStakes",
        equipId: "91422",
        formula: ""
    },
    "群英冠冕": {
        name: "群英冠冕",
        englishName: "TFT7_Item_ShimmerscaleCrownOfChampions",
        equipId: "91423",
        formula: ""
    },

    // ==========================================
    // Type 8: 辅助装备 (Support Items)
    // ==========================================
    "军团圣盾": {
        name: "军团圣盾",
        englishName: "TFT_Item_AegisOfTheLegion",
        equipId: "9401",
        formula: ""
    },
    "女妖面纱": {
        name: "女妖面纱",
        englishName: "TFT_Item_BansheesVeil",
        equipId: "9402",
        formula: ""
    },
    "殉道美德": {
        name: "殉道美德",
        englishName: "TFT_Item_RadiantVirtue",
        equipId: "9404",
        formula: ""
    },
    "能量圣杯": {
        name: "能量圣杯",
        englishName: "TFT_Item_Chalice",
        equipId: "9405",
        formula: ""
    },
    "钢铁烈阳之匣": {
        name: "钢铁烈阳之匣",
        englishName: "TFT_Item_LocketOfTheIronSolari",
        equipId: "9406",
        formula: ""
    },
    "无用大宝石_8": { // 为了不与 Type 7 重复，添加后缀
        name: "无用大宝石",
        englishName: "TFT7_Item_ShimmerscaleHeartOfGold,TFT7_Item_ShimmerscaleHeartOfGold_HR",
        equipId: "9407",
        formula: ""
    },
    "黑曜石切割者_8": { // 为了不与 Type 6 重复，添加后缀
        name: "黑曜石切割者",
        englishName: "TFT4_Item_OrnnObsidianCleaver",
        equipId: "9408",
        formula: ""
    },
    "兰顿之兆_8": { // 为了不与 Type 6 重复，添加后缀
        name: "兰顿之兆",
        englishName: "TFT4_Item_OrnnRanduinsSanctum",
        equipId: "9409",
        formula: ""
    },
    "静止法衣": {
        name: "静止法衣",
        englishName: "TFT_Item_Shroud",
        equipId: "9410",
        formula: ""
    },
    "基克的先驱": {
        name: "基克的先驱",
        englishName: "TFT_Item_ZekesHerald",
        equipId: "9411",
        formula: ""
    },
    "灵风": {
        name: "灵风",
        englishName: "TFT_Item_Zephyr",
        equipId: "9412",
        formula: ""
    },
    "兹若特传送门_8": { // Type 8 辅助装版本
        name: "兹若特传送门",
        englishName: "TFT_Item_TitanicHydra,TFT5_Item_ZzRotPortalRadiant",
        equipId: "9413",
        formula: ""
    },
    "辅助手套": {
        name: "辅助手套",
        englishName: "TFT11_Item_ThiefsGlovesSupport",
        equipId: "91110",
        formula: ""
    },
    "永恒烈焰": {
        name: "永恒烈焰",
        englishName: "TFT_Item_EternalFlame",
        equipId: "91111",
        formula: ""
    },
    "骑士之誓": {
        name: "骑士之誓",
        englishName: "TFT_Item_SupportKnightsVow",
        equipId: "91112",
        formula: ""
    },
    "月石再生器": {
        name: "月石再生器",
        englishName: "TFT_Item_Moonstone",
        equipId: "91113",
        formula: ""
    },
    "恶意": {
        name: "恶意",
        englishName: "TFT_Item_Spite",
        equipId: "91114",
        formula: ""
    },
    "不稳定的财宝箱": {
        name: "不稳定的财宝箱",
        englishName: "TFT_Item_UnstableTreasureChest",
        equipId: "91115",
        formula: ""
    },

    // ==========================================
    // Type 1/2: S15 沿用到 S16 的低 ID 装备 (已在上方 918xx 中包含了大部分重编码，此处添加遗漏的)
    // *注意*: 只有ID小于91xxx, 但isShow: "1"的装备。
    // ==========================================
    "死亡之蔑_T4": { // ID 413, 旧版奥恩，但仍标记为可见
        name: "死亡之蔑",
        englishName: "TFT4_Item_OrnnDeathsDefiance",
        equipId: "413",
        formula: ""
    },
    "魔蕴_T4": { // ID 414
        name: "魔蕴",
        englishName: "TFT4_Item_OrnnMuramana",
        equipId: "414",
        formula: ""
    },
    "三相之力_T4": { // ID 415
        name: "三相之力",
        englishName: "TFT4_Item_OrnnInfinityForce",
        equipId: "415",
        formula: ""
    },
    "金币收集者_T4": { // ID 420
        name: "金币收集者",
        englishName: "TFT4_Item_OrnnTheCollector",
        equipId: "420",
        formula: ""
    },
    "中娅悖论_T4": { // ID 421
        name: "中娅悖论",
        englishName: "TFT4_Item_OrnnZhonyasParadox",
        equipId: "421",
        formula: ""
    },
    // 注意：基础散件 501-509 和 91163 也在S16数据中被标记为可见，
    // 但为保持S16新ID体系的清晰度，只保留918xx的同名物品。
    "夜之锋刃_T2": { // ID 6022, S15合成装
        name: "夜之锋刃",
        englishName: "TFT_Item_GuardianAngel",
        equipId: "6022",
        formula: "501,505"
    },
    "圣盾使的誓约_T2": { // ID 7034, S15合成装
        name: "圣盾使的誓约",
        englishName: "TFT_Item_FrozenHeart",
        equipId: "7034",
        formula: "505,504"
    },
    "黯灵龙纹章": { // ID 91397
        name: "黯灵龙纹章",
        englishName: "TFT7_Item_DarkflightEmblemItem",
        equipId: "91397",
        formula: "508,505"
    },
    "碧波龙纹章": { // ID 91398
        name: "碧波龙纹章",
        englishName: "TFT7_Item_LagoonEmblemItem",
        equipId: "91398",
        formula: "508,509"
    },
    "刺客纹章": { // ID 91399
        name: "刺客纹章",
        englishName: "TFT7_Item_AssassinEmblemItem",
        equipId: "91399",
        formula: ""
    },
    "星界龙纹章": { // ID 91400
        name: "星界龙纹章",
        englishName: "TFT7_Item_AstralEmblemItem",
        equipId: "91400",
        formula: ""
    },
    "狂刃战士纹章": { // ID 91401
        name: "狂刃战士纹章",
        englishName: "TFT7_Item_WarriorEmblemItem",
        equipId: "91401",
        formula: "91163,506"
    },
    "重骑兵纹章": { // ID 91402
        name: "重骑兵纹章",
        englishName: "TFT7_Item_CavalierEmblemItem",
        equipId: "91402",
        formula: "91163,505"
    },
    "护卫纹章_T7": { // ID 91403
        name: "护卫纹章",
        englishName: "TFT7_Item_GuardianEmblemItem",
        equipId: "91403",
        formula: "91163,509"
    },
    "法师纹章_T7": { // ID 91404
        name: "法师纹章",
        englishName: "TFT7_Item_MageEmblemItem",
        equipId: "91404",
        formula: "91163,504"
    },
    "格斗家纹章": { // ID 91405
        name: "格斗家纹章",
        englishName: "TFT7_Item_BruiserEmblemItem",
        equipId: "91405",
        formula: "91163,507"
    },
    "幻镜龙纹章": { // ID 91406
        name: "幻镜龙纹章",
        englishName: "TFT7_Item_MirageEmblemItem",
        equipId: "91406",
        formula: "508,506"
    },
    "金鳞龙纹章": { // ID 91407
        name: "金鳞龙纹章",
        englishName: "TFT7_Item_ShimmerscaleEmblemItem",
        equipId: "91407",
        formula: "508,501"
    },
    "屠龙勇士纹章": { // ID 91408
        name: "屠龙勇士纹章",
        englishName: "TFT7_Item_ScalescornEmblemItem",
        equipId: "91408",
        formula: ""
    },
    "风暴龙纹章": { // ID 91409
        name: "风暴龙纹章",
        englishName: "TFT7_Item_TempestEmblemItem",
        equipId: "91409",
        formula: "508,502"
    },
    "玉龙纹章": { // ID 91410
        name: "玉龙纹章",
        englishName: "TFT7_Item_JadeEmblemItem",
        equipId: "91410",
        formula: "508,504"
    },
    "迅捷射手纹章": { // ID 91411
        name: "迅捷射手纹章",
        englishName: "TFT7_Item_SwiftshotEmblemItem",
        equipId: "91411",
        formula: "91163,502"
    },
    "强袭炮手纹章": { // ID 91412
        name: "强袭炮手纹章",
        englishName: "TFT7_Item_CannoneerEmblemItem",
        equipId: "91412",
        formula: "91163,501"
    },
    "秘术师纹章": { // ID 91413
        name: "秘术师纹章",
        englishName: "TFT7_Item_MysticEmblemItem",
        equipId: "91413",
        formula: ""
    },
    "魔导师纹章": { // ID 91414
        name: "魔导师纹章",
        englishName: "TFT7_Item_EvokerEmblemItem",
        equipId: "91414",
        formula: ""
    },
    "冒险家纹章": { // ID 91415
        name: "冒险家纹章",
        englishName: "TFT7_Item_GuildEmblemItem",
        equipId: "91415",
        formula: "508,503"
    },
    "神龙尊者纹章": { // ID 91416
        name: "神龙尊者纹章",
        englishName: "TFT7_Item_DragonmancerEmblemItem",
        equipId: "91416",
        formula: "91163,503"
    },
    "幽影龙纹章": { // ID 91417
        name: "幽影龙纹章",
        englishName: "TFT7_Item_WhispersEmblemItem",
        equipId: "91417",
        formula: "508,507"
    }
} satisfies Record<string, TFTEquip>;

export const TFT_16_EQUIP_DATA: Record<keyof typeof _TFT_16_EQUIP_DATA, TFTEquip> = _TFT_16_EQUIP_DATA;

// ==========================================
// 策略相关的类型定义
// ==========================================

export type ChampionKey = keyof typeof TFT_16_CHAMPION_DATA;
export type ChampionEnglishId = typeof _TFT_16_CHAMPION_DATA[keyof typeof _TFT_16_CHAMPION_DATA]['englishId'];
export type EquipKey = keyof typeof TFT_16_EQUIP_DATA;

// ==========================================
// 英文ID到中文名的映射表 (自动从数据生成，用于解析 OP.GG 等外部数据)
// ==========================================

/**
 * 英雄英文ID到中文名的映射
 * @example "TFT16_Graves" -> "格雷福斯"
 */
export const CHAMPION_EN_TO_CN = {} as Record<ChampionEnglishId, ChampionKey>;

// 自动从 TFT_16_CHAMPION_DATA 生成英文到中文的映射
for (const [cnName, champion] of Object.entries(TFT_16_CHAMPION_DATA)) {
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
    const champion = TFT_16_CHAMPION_DATA[championName];
    // 射程 <= 2 视为近战（包括格雷福斯这种短程枪手）
    return champion !== undefined && champion.attackRange <= 2;
}

/**
 * 判断棋子是否为远程单位
 * @param championName 棋子中文名
 * @returns true 表示远程，false 表示近战
 */
export function isRangedChampion(championName: ChampionKey): boolean {
    const champion = TFT_16_CHAMPION_DATA[championName];
    // 射程 >= 4 视为远程
    return champion !== undefined && champion.attackRange >= 4;
}

/**
 * 获取棋子的射程值
 * @param championName 棋子中文名
 * @returns 射程值，未知棋子返回 undefined
 */
export function getChampionRange(championName: ChampionKey): number | undefined {
    return TFT_16_CHAMPION_DATA[championName]?.attackRange;
}

export interface TeamComposition {
    name: string;
    description?: string;
    earlyGame: LineupUnit[];
    midGame: LineupUnit[];
    lateGame: LineupUnit[];
}
