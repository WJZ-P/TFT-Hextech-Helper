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

//  左下角等级region（百分比形式，留30%误差容限）
export const levelRegion = {
    leftTop: { x: 0.016, y: 0.796 },    // 原 25, 625 → 0.024, 0.813 -30%
    rightBottom: { x: 0.160, y: 0.856 } // 原 145, 645 → 0.142, 0.839 +30%
}

//  战利品掉落region，可能的掉落区域（百分比形式，留25%误差容限）
export const lootRegion = {
    leftTop: { x: 0.150, y: 0.130 },    // 原 200, 125 → 0.195, 0.163 -25%
    rightBottom: { x: 0.880, y: 0.800 } // 原 855, 585 → 0.835, 0.761 +25%
}

//  小小英雄默认站位（棋盘左下角）（百分比形式）
//  用于战斗结束后让小小英雄回到初始位置，或作为路径规划的起点
export const littleLegendDefaultPoint = { x: 0.100, y: 0.550 };  // 原 120, 430 → 0.117, 0.560

//  英雄购买槽坐标
export interface SimplePoint {
    x: number;
    y: number;
}

//  小小英雄随机走位Point(防挂机检测) - 百分比形式
export const selfWalkAroundPoints = {
    left: [
        { x: 0.135, y: 0.520 },   // 原 156, 400
        { x: 0.145, y: 0.462 },   // 原 165, 355
        { x: 0.160, y: 0.410 },   // 原 175, 315
        { x: 0.175, y: 0.240 },   // 原 185, 185
        { x: 0.190, y: 0.195 }    // 原 195, 150
    ],
    right: [
        { x: 0.820, y: 0.644 },   // 原 840, 495
        { x: 0.810, y: 0.586 },   // 原 830, 450
        { x: 0.810, y: 0.547 },   // 原 830, 420
        { x: 0.780, y: 0.365 },   // 原 800, 280
        { x: 0.790, y: 0.384 },   // 原 805, 295
        { x: 0.770, y: 0.280 },   // 原 790, 215
        { x: 0.770, y: 0.280 },   // 原 790, 215
        { x: 0.765, y: 0.234 },   // 原 785, 180
        { x: 0.765, y: 0.195 }    // 原 785, 150
    ],
}

//  持有金币region（百分比形式，留25%误差容限）
export const coinRegion = {
    leftTop: { x: 0.470, y: 0.796 },    // 原 505, 626 → 0.493, 0.815 -25%
    rightBottom: { x: 0.560, y: 0.856 } // 原 545, 642 → 0.532, 0.836 +25%
}

//  商店槽位（百分比形式）
export const shopSlot = {
    SHOP_SLOT_1: { x: 0.234, y: 0.911 },  // 原 240, 700
    SHOP_SLOT_2: { x: 0.371, y: 0.911 },  // 原 380, 700
    SHOP_SLOT_3: { x: 0.508, y: 0.911 },  // 原 520, 700
    SHOP_SLOT_4: { x: 0.645, y: 0.911 },  // 原 660, 700
    SHOP_SLOT_5: { x: 0.781, y: 0.911 },  // 原 800, 700
}

/**
 * 商店槽位索引类型
 * @description 商店只有 5 个槽位（0-4），使用字面量类型限制取值范围
 *              比 number 更严谨，避免传入无效索引
 */
export type ShopSlotIndex = 0 | 1 | 2 | 3 | 4;

//  英雄购买槽英雄名字Region（百分比形式，留20%误差容限）
export const shopSlotNameRegions = {
    SLOT_1: {   // width: 108 height:18
        leftTop: { x: 0.152, y: 0.960 },    // 原 173, 740 → 0.169, 0.964 -20%
        rightBottom: { x: 0.300, y: 1.000 } // 原 281, 758 → 0.274, 0.987 +20%
    },
    SLOT_2: {
        leftTop: { x: 0.289, y: 0.960 },    // 原 315, 740
        rightBottom: { x: 0.437, y: 1.000 } // 原 423, 758
    },
    SLOT_3: {
        leftTop: { x: 0.426, y: 0.960 },    // 原 459, 740
        rightBottom: { x: 0.574, y: 1.000 } // 原 567, 758
    },
    SLOT_4: {
        leftTop: { x: 0.563, y: 0.960 },    // 原 602, 740
        rightBottom: { x: 0.711, y: 1.000 } // 原 710, 758
    },
    SLOT_5: {
        leftTop: { x: 0.700, y: 0.960 },    // 原 746, 740
        rightBottom: { x: 0.848, y: 1.000 } // 原 854, 758
    },
}

//  选中英雄时，右侧英雄详情的英雄id region（百分比形式）
export const detailChampionNameRegion = {
    leftTop: { x: 0.840, y: 0.290 },      // 原 870, 226
    rightBottom: { x: 0.980, y: 0.320 }   // 原 978, 244
}

// 安卓真机右侧详情面板的棋子名称区域（基于 2026-03-15 真机录屏校准）
export const androidDetailChampionNameRegion = {
    leftTop: { x: 0.790, y: 0.205 },
    rightBottom: { x: 0.920, y: 0.250 }
}

// 安卓真机商店卡牌中的名称区域（基于 2026-03-15 真机录屏校准）
export const androidShopSlotNameRegions = {
    SLOT_1: {
        leftTop: { x: 0.250, y: 0.326 },
        rightBottom: { x: 0.322, y: 0.383 }
    },
    SLOT_2: {
        leftTop: { x: 0.385, y: 0.323 },
        rightBottom: { x: 0.478, y: 0.387 }
    },
    SLOT_3: {
        leftTop: { x: 0.525, y: 0.323 },
        rightBottom: { x: 0.617, y: 0.387 }
    },
    SLOT_4: {
        leftTop: { x: 0.663, y: 0.323 },
        rightBottom: { x: 0.778, y: 0.387 }
    },
    SLOT_5: {
        leftTop: { x: 0.808, y: 0.326 },
        rightBottom: { x: 0.873, y: 0.383 }
    },
}

// 安卓真机 HUD 金币数字区域（基于 2026-03-15 真机录屏校准）
export const androidHudGoldTextRegion = {
    leftTop: { x: 0.9019, y: 0.7833 },
    rightBottom: { x: 0.9577, y: 0.9125 }
}

// 安卓真机 HUD 经验文本区域（基于 2026-03-15 真机录屏校准）
export const androidHudXpTextRegion = {
    leftTop: { x: 0.0240, y: 0.6667 },
    rightBottom: { x: 0.1298, y: 0.7917 }
}

// 安卓真机 HUD 等级数字区域（基于 2026-03-15 真机录屏校准）
export const androidHudLevelDigitRegion = {
    leftTop: { x: 0.1173, y: 0.8792 },
    rightBottom: { x: 0.1346, y: 0.9417 }
}

// 安卓真机左下角色名牌区域（用于匹配自己在右侧分数板中的名字）
export const androidSelfNameplateRegion = {
    leftTop: { x: 0.1971, y: 0.5583 },
    rightBottom: { x: 0.2740, y: 0.6542 }
}

// 安卓真机右侧分数板区域（基于 2026-03-15 真机录屏校准）
export const androidScoreboardRegion = {
    leftTop: { x: 0.7885, y: 0.0417 },
    rightBottom: { x: 0.9904, y: 0.7083 }
}

//  右侧详情面板装备区域（百分比形式，留20%误差容限）
export const detailEquipRegion = {
    SLOT_1: {
        leftTop: { x: 0.844, y: 0.435 },   // 原 881, 347 → 0.859, 0.452 -20%
        rightBottom: { x: 0.956, y: 0.515 } // 原 919, 385 → 0.898, 0.501 +20%
    },
    SLOT_2: {
        leftTop: { x: 0.890, y: 0.435 },   // 原 927, 347
        rightBottom: { x: 0.990, y: 0.515 } // 原 965, 385
    },
    SLOT_3: {
        leftTop: { x: 0.936, y: 0.435 },   // 原 973, 347
        rightBottom: { x: 1.036, y: 0.515 } // 原 1011, 385
    },
}

//  基础装备锻造器浮窗名称区域（槽位 1-5 使用）（百分比形式）
//  注意：X 和 Y 都是相对于鼠标右键点击位置的偏移量，不是屏幕绝对坐标！
//  右键基础装备锻造器时，会以点击位置为左上角起点，在右下方弹出浮窗
export const itemForgeTooltipRegion = {
    leftTop: { x: 0.055, y: 0.009 },      // 原 56, 7 (相对坐标，保留绝对值)
    rightBottom: { x: 0.172, y: 0.035 }   // 原 176, 27
}

//  基础装备锻造器浮窗名称区域（槽位 6-9 边缘情况使用）（百分比形式）
//  当槽位靠近屏幕右边缘时，浮窗会向左弹出，位置计算规则不同：
//  - X 坐标：基于游戏窗口的绝对坐标（不依赖鼠标点击位置）
//  - Y 坐标：基于鼠标点击位置的偏移量（仍需加上 clickPoint.y）
export const itemForgeTooltipRegionEdge = {
    leftTop: { x: 0.571, y: 0.009 },      // 原 585, 7 (相对绝对坐标)
    rightBottom: { x: 0.679, y: 0.035 }   // 原 695, 27
}

//  选中英雄时，右侧查看英雄星级的（百分比形式）
export const detailChampionStarRegion = {
    leftTop: { x: 0.898, y: 0.151 },      // 原 919, 122
    rightBottom: { x: 0.952, y: 0.172 }   // 原 974, 132
}

//  刷新商店Point（D牌按钮，在升级按钮下方）（百分比形式）
export const refreshShopPoint = { x: 0.132, y: 0.950 }  // 原 135, 730

//  购买经验Point（升级按钮，在D牌按钮上方）（百分比形式）
export const buyExpPoint = { x: 0.132, y: 0.885 }  // 原 135, 680

//  装备槽位坐标（百分比形式）
export const equipmentSlot = {
    EQ_SLOT_1: { x: 0.0195, y: 0.273 },      // 原 20, 210
    EQ_SLOT_2: { x: 0.0195, y: 0.319 },      // 原 20, 245
    EQ_SLOT_3: { x: 0.0195, y: 0.364 },      // 原 20, 280
    EQ_SLOT_4: { x: 0.0195, y: 0.410 },      // 原 20, 315
    EQ_SLOT_5: { x: 0.0195, y: 0.455 },      // 原 20, 350
    EQ_SLOT_6: { x: 0.0195, y: 0.501 },      // 原 20, 385
    EQ_SLOT_7: { x: 0.0195, y: 0.560 },      // 原 20, 430
    EQ_SLOT_8: { x: 0.0195, y: 0.605 },      // 原 20, 465
    EQ_SLOT_9: { x: 0.0195, y: 0.651 },      // 原 20, 500
    EQ_SLOT_10: { x: 0.0195, y: 0.697 },     // 原 20, 535
}

//  装备槽位识别区域（百分比形式，留20%误差容限）
export const equipmentRegion = {
    SLOT_1: {
        leftTop: { x: 0.00879, y: 0.257 },    // 原 9, 198 → 留-20%
        rightBottom: { x: 0.0312, y: 0.289 }  // 原 32, 222 → 留+20%
    },
    SLOT_2: {
        leftTop: { x: 0.00879, y: 0.304 },    // 原 9, 234
        rightBottom: { x: 0.0312, y: 0.336 }  // 原 32, 258
    },
    SLOT_3: {
        leftTop: { x: 0.00879, y: 0.352 },    // 原 9, 271
        rightBottom: { x: 0.0312, y: 0.384 }  // 原 32, 295
    },
    SLOT_4: {
        leftTop: { x: 0.00879, y: 0.399 },    // 原 9, 307
        rightBottom: { x: 0.0312, y: 0.431 }  // 原 32, 331
    },
    SLOT_5: {
        leftTop: { x: 0.00879, y: 0.447 },    // 原 9, 344
        rightBottom: { x: 0.0312, y: 0.479 }  // 原 32, 368
    },
    SLOT_6: {
        leftTop: { x: 0.00879, y: 0.495 },    // 原 9, 380
        rightBottom: { x: 0.0312, y: 0.526 }  // 原 32, 404
    },
    SLOT_7: {
        leftTop: { x: 0.00879, y: 0.542 },    // 原 9, 417
        rightBottom: { x: 0.0312, y: 0.574 }  // 原 32, 441
    },
    SLOT_8: {
        leftTop: { x: 0.00879, y: 0.590 },    // 原 9, 453
        rightBottom: { x: 0.0312, y: 0.621 }  // 原 32, 477
    },
    SLOT_9: {
        leftTop: { x: 0.00879, y: 0.638 },    // 原 9, 490
        rightBottom: { x: 0.0312, y: 0.669 }  // 原 32, 514
    },
    SLOT_10: {
        leftTop: { x: 0.00879, y: 0.684 },    // 原 9, 526
        rightBottom: { x: 0.0312, y: 0.716 }  // 原 32, 550
    },
}

// 安卓真机/模拟器左侧装备栏（当前实机观测为 5 个可见槽位）
// 基于 2026-03-15 真机 5-2 录屏抽帧标定，后续如果出现滚动装备栏再单独补分页逻辑。
export const androidEquipmentSlot = {
    EQ_SLOT_1: { x: 0.0578, y: 0.1110 },
    EQ_SLOT_2: { x: 0.0578, y: 0.2070 },
    EQ_SLOT_3: { x: 0.0578, y: 0.3030 },
    EQ_SLOT_4: { x: 0.0578, y: 0.3990 },
    EQ_SLOT_5: { x: 0.0578, y: 0.4950 },
}

export const androidEquipmentRegion = {
    SLOT_1: {
        leftTop: { x: 0.0305, y: 0.0510 },
        rightBottom: { x: 0.0851, y: 0.1700 },
    },
    SLOT_2: {
        leftTop: { x: 0.0305, y: 0.1470 },
        rightBottom: { x: 0.0851, y: 0.2660 },
    },
    SLOT_3: {
        leftTop: { x: 0.0305, y: 0.2430 },
        rightBottom: { x: 0.0851, y: 0.3620 },
    },
    SLOT_4: {
        leftTop: { x: 0.0305, y: 0.3390 },
        rightBottom: { x: 0.0851, y: 0.4580 },
    },
    SLOT_5: {
        leftTop: { x: 0.0305, y: 0.4360 },
        rightBottom: { x: 0.0851, y: 0.5548 },
    },
}
//  棋子在战场上的点位，用于鼠标点击选择英雄（百分比形式）
// 注意：Y 坐标往上偏移 5 像素，避免点击时误触到下一行的棋子
export const fightBoardSlotPoint = {
    // 第一行的棋子位置
    R1_C1: { x: 0.2246, y: 0.3906 },   // 原 230, 300
    R1_C2: { x: 0.3027, y: 0.3906 },   // 原 310, 300
    R1_C3: { x: 0.3809, y: 0.3906 },   // 原 390, 300
    R1_C4: { x: 0.4590, y: 0.3906 },   // 原 470, 300
    R1_C5: { x: 0.5371, y: 0.3906 },   // 原 550, 300
    R1_C6: { x: 0.6152, y: 0.3906 },   // 原 630, 300
    R1_C7: { x: 0.6934, y: 0.3906 },   // 原 710, 300
    // 第二行的棋子位置
    R2_C1: { x: 0.2539, y: 0.4622 },   // 原 260, 355
    R2_C2: { x: 0.3369, y: 0.4622 },   // 原 345, 355
    R2_C3: { x: 0.4199, y: 0.4622 },   // 原 430, 355
    R2_C4: { x: 0.5029, y: 0.4622 },   // 原 515, 355
    R2_C5: { x: 0.5859, y: 0.4622 },   // 原 600, 355
    R2_C6: { x: 0.6689, y: 0.4622 },   // 原 685, 355
    R2_C7: { x: 0.7520, y: 0.4622 },   // 原 770, 355
    // 第三行棋子的位置
    R3_C1: { x: 0.1953, y: 0.5273 },   // 原 200, 405
    R3_C2: { x: 0.2832, y: 0.5273 },   // 原 290, 405
    R3_C3: { x: 0.3711, y: 0.5273 },   // 原 380, 405
    R3_C4: { x: 0.4590, y: 0.5273 },   // 原 470, 405
    R3_C5: { x: 0.5469, y: 0.5273 },   // 原 560, 405
    R3_C6: { x: 0.6348, y: 0.5273 },   // 原 650, 405
    R3_C7: { x: 0.7227, y: 0.5273 },   // 原 740, 405
    // 第四行棋子的位置
    R4_C1: { x: 0.2344, y: 0.5989 },   // 原 240, 460
    R4_C2: { x: 0.3223, y: 0.5989 },   // 原 330, 460
    R4_C3: { x: 0.4102, y: 0.5989 },   // 原 420, 460
    R4_C4: { x: 0.4980, y: 0.5989 },   // 原 510, 460
    R4_C5: { x: 0.5859, y: 0.5989 },   // 原 600, 460
    R4_C6: { x: 0.6738, y: 0.5989 },   // 原 690, 460
    R4_C7: { x: 0.7617, y: 0.5989 },   // 原 780, 460
}
//  棋子在战场上的region，用来判断是否有棋子（百分比形式）
//  leftTop.y 使用 -10 偏移，兼容 3D 飞行棋子的高度
//  leftTop.x +5, rightBottom.x -5，避免宽体棋子占据邻居位置导致误判
export const fightBoardSlotRegion = {
    // 第一行的棋子位置
    R1_C1: {
        leftTop: { x: 0.2148, y: 0.3776 },    // 原 215+5, 300-10 = 220, 290
        rightBottom: { x: 0.2441, y: 0.4297 } // 原 255-5, 330 = 250, 330
    },
    R1_C2: {
        leftTop: { x: 0.2871, y: 0.3776 },    // 原 295+5, 300-10
        rightBottom: { x: 0.3330, y: 0.4297 } // 原 340-5, 330
    },
    R1_C3: {
        leftTop: { x: 0.3662, y: 0.3776 },    // 原 375+5, 300-10
        rightBottom: { x: 0.4111, y: 0.4297 } // 原 420-5, 330
    },
    R1_C4: {
        leftTop: { x: 0.4443, y: 0.3776 },    // 原 455+5, 300-10
        rightBottom: { x: 0.4893, y: 0.4297 } // 原 500-5, 330
    },
    R1_C5: {
        leftTop: { x: 0.5225, y: 0.3776 },    // 原 535+5, 300-10
        rightBottom: { x: 0.5723, y: 0.4297 } // 原 585-5, 330
    },
    R1_C6: {
        leftTop: { x: 0.6006, y: 0.3776 },    // 原 615+5, 300-10
        rightBottom: { x: 0.6504, y: 0.4297 } // 原 665-5, 330
    },
    R1_C7: {
        leftTop: { x: 0.6787, y: 0.3776 },    // 原 695+5, 300-10
        rightBottom: { x: 0.7324, y: 0.4297 } // 原 750-5, 330
    },
    // 第二行的棋子位置
    R2_C1: {
        leftTop: { x: 0.2402, y: 0.4557 },    // 原 245+5, 350-10 = 250, 340
        rightBottom: { x: 0.2783, y: 0.5013 } // 原 285-5, 385 = 280, 385
    },
    R2_C2: {
        leftTop: { x: 0.3223, y: 0.4557 },    // 原 330+5, 350-10
        rightBottom: { x: 0.3613, y: 0.5013 } // 原 370-5, 385
    },
    R2_C3: {
        leftTop: { x: 0.4053, y: 0.4557 },    // 原 415+5, 350-10
        rightBottom: { x: 0.4443, y: 0.5013 } // 原 455-5, 385
    },
    R2_C4: {
        leftTop: { x: 0.4883, y: 0.4557 },    // 原 500+5, 350-10
        rightBottom: { x: 0.5273, y: 0.5013 } // 原 540-5, 385
    },
    R2_C5: {
        leftTop: { x: 0.5664, y: 0.4557 },    // 原 580+5, 350-10
        rightBottom: { x: 0.6104, y: 0.5013 } // 原 625-5, 385
    },
    R2_C6: {
        leftTop: { x: 0.6494, y: 0.4557 },    // 原 665+5, 350-10
        rightBottom: { x: 0.6934, y: 0.5013 } // 原 710-5, 385
    },
    R2_C7: {
        leftTop: { x: 0.7324, y: 0.4557 },    // 原 750+5, 350-10
        rightBottom: { x: 0.7764, y: 0.5013 } // 原 795-5, 385
    },
    // 第三行棋子的位置
    R3_C1: {
        leftTop: { x: 0.1855, y: 0.5273 },    // 原 190+5, 405-10 = 195, 395
        rightBottom: { x: 0.2246, y: 0.5729 } // 原 230-5, 440
    },
    R3_C2: {
        leftTop: { x: 0.2773, y: 0.5273 },    // 原 280+5, 405-10
        rightBottom: { x: 0.3125, y: 0.5729 } // 原 320-5, 440
    },
    R3_C3: {
        leftTop: { x: 0.3613, y: 0.5273 },    // 原 365+5, 405-10
        rightBottom: { x: 0.4004, y: 0.5729 } // 原 410-5, 440
    },
    R3_C4: {
        leftTop: { x: 0.4443, y: 0.5273 },    // 原 450+5, 405-10
        rightBottom: { x: 0.4834, y: 0.5729 } // 原 495-5, 440
    },
    R3_C5: {
        leftTop: { x: 0.5342, y: 0.5273 },    // 原 540+5, 405-10
        rightBottom: { x: 0.5713, y: 0.5729 } // 原 585-5, 440
    },
    R3_C6: {
        leftTop: { x: 0.6152, y: 0.5273 },    // 原 625+5, 405-10
        rightBottom: { x: 0.6592, y: 0.5729 } // 原 675-5, 440
    },
    R3_C7: {
        leftTop: { x: 0.6963, y: 0.5273 },    // 原 710+5, 405-10
        rightBottom: { x: 0.7422, y: 0.5729 } // 原 760-5, 440
    },
    // 第四行棋子的位置
    R4_C1: {
        leftTop: { x: 0.2148, y: 0.5989 },    // 原 220+5, 465-10 = 225, 455
        rightBottom: { x: 0.2588, y: 0.6510 } // 原 265-5, 500
    },
    R4_C2: {
        leftTop: { x: 0.3042, y: 0.5989 },    // 原 315+5, 465-10
        rightBottom: { x: 0.3467, y: 0.6510 } // 原 355-5, 500
    },
    R4_C3: {
        leftTop: { x: 0.3931, y: 0.5989 },    // 原 400+5, 465-10
        rightBottom: { x: 0.4404, y: 0.6510 } // 原 450-5, 500
    },
    R4_C4: {
        leftTop: { x: 0.4785, y: 0.5989 },    // 原 490+5, 465-10
        rightBottom: { x: 0.5283, y: 0.6510 } // 原 540-5, 500
    },
    R4_C5: {
        leftTop: { x: 0.5699, y: 0.5989 },    // 原 580+5, 465-10
        rightBottom: { x: 0.6201, y: 0.6510 } // 原 635-5, 500
    },
    R4_C6: {
        leftTop: { x: 0.6553, y: 0.5989 },    // 原 670+5, 465-10
        rightBottom: { x: 0.7085, y: 0.6510 } // 原 725-5, 500
    },
    R4_C7: {
        leftTop: { x: 0.7441, y: 0.5989 },    // 原 760+5, 465-10
        rightBottom: { x: 0.7959, y: 0.6510 } // 原 815-5, 500
    },
}

//  棋子在备战席的region，用来判断是否有棋子（百分比形式）
//  leftTop.y 使用 -15 偏移，兼容 3D 飞行棋子的高度
//  leftTop.x +5, rightBottom.x -5，避免宽体棋子占据邻居位置导致误判
export const benchSlotRegion = {
    SLOT_1: {
        leftTop: { x: 0.1074, y: 0.6719 },    // 原 110+5, 530-15 = 115, 515
        rightBottom: { x: 0.1514, y: 0.7617 } // 原 155-5, 585 = 150, 585
    },
    SLOT_2: {
        leftTop: { x: 0.1895, y: 0.6719 },    // 原 195+5, 530-15
        rightBottom: { x: 0.2388, y: 0.7617 } // 原 245-5, 585
    },
    SLOT_3: {
        leftTop: { x: 0.2686, y: 0.6719 },    // 原 275+5, 530-15
        rightBottom: { x: 0.3174, y: 0.7617 } // 原 325-5, 585
    },
    SLOT_4: {
        leftTop: { x: 0.3564, y: 0.6719 },    // 原 360+5, 530-15
        rightBottom: { x: 0.4053, y: 0.7617 } // 原 415-5, 585
    },
    SLOT_5: {
        leftTop: { x: 0.4443, y: 0.6719 },    // 原 440+5, 530-15
        rightBottom: { x: 0.4932, y: 0.7617 } // 原 495-5, 585
    },
    SLOT_6: {
        leftTop: { x: 0.5273, y: 0.6719 },    // 原 525+5, 530-15
        rightBottom: { x: 0.5859, y: 0.7617 } // 原 580-5, 585
    },
    SLOT_7: {
        leftTop: { x: 0.6055, y: 0.6719 },    // 原 605+5, 530-15
        rightBottom: { x: 0.6660, y: 0.7617 } // 原 665-5, 585
    },
    SLOT_8: {
        leftTop: { x: 0.6846, y: 0.6719 },    // 原 685+5, 530-15
        rightBottom: { x: 0.7373, y: 0.7617 } // 原 750-5, 585
    },
    SLOT_9: {
        leftTop: { x: 0.7715, y: 0.6719 },    // 原 770+5, 530-15
        rightBottom: { x: 0.8105, y: 0.7617 } // 原 830-5, 585
    },
}

//  备战席点位（百分比形式）
export const benchSlotPoints = {
    SLOT_1: { x: 0.1270, y: 0.7227 },   // 原 130, 555
    SLOT_2: { x: 0.2051, y: 0.7227 },   // 原 210, 555
    SLOT_3: { x: 0.2881, y: 0.7227 },   // 原 295, 555
    SLOT_4: { x: 0.3760, y: 0.7227 },   // 原 385, 555
    SLOT_5: { x: 0.4541, y: 0.7227 },   // 原 465, 555
    SLOT_6: { x: 0.5371, y: 0.7227 },   // 原 550, 555
    SLOT_7: { x: 0.6152, y: 0.7227 },   // 原 630, 555
    SLOT_8: { x: 0.7031, y: 0.7227 },   // 原 720, 555
    SLOT_9: { x: 0.7813, y: 0.7227 },   // 原 800, 555
}
//  海克斯选择槽位（百分比形式）
export const hexSlot = {
    SLOT_1: { x: 0.2100, y: 0.5339 },   // 原 215, 410
    SLOT_2: { x: 0.4980, y: 0.5339 },   // 原 510, 410
    SLOT_3: { x: 0.7861, y: 0.5339 },   // 原 805, 410
}

//  选秀站位，为离自己最近的棋子位置（百分比形式）
export const sharedDraftPoint = { x: 0.5176, y: 0.5208 }  // 原 530, 400

//  游戏结束后的"现在退出"按钮坐标（百分比形式）
//  玩家死亡后会弹出结算界面，点击此按钮可以退出游戏
export const exitGameButtonPoint = { x: 0.5029, y: 0.5273 }  // 原 515, 405

//  发条鸟模式右下角战斗按钮（百分比形式）
export const clockworkTrailsFightButtonPoint = {
    x: 0.9326,
    y: 0.9167
}  // 原 955, 705

//  发条鸟模式死亡后右侧"现在退出按钮"（百分比形式）
export const clockworkTrailsQuitNowButtonRegion = {
    leftTop: { x: 0.7617, y: 0.7227 },   // 原 780, 555
    rightBottom: { x: 0.8252, y: 0.7422 } // 原 845, 570
}

//  发条鸟模式"现在退出"按钮点击坐标（百分比形式）
export const clockworkTrailsQuitNowButtonPoint = {
    x: 0.7959,
    y: 0.7292
}  // 原 815, 560

export const combatPhaseTextRegion = {
    leftTop: { x: 0.4541, y: 0.1432 },   // 原 465, 110
    rightBottom: { x: 0.5469, y: 0.1757 } // 原 560, 135
}

//  游戏战斗阶段展示坐标，第一阶段。因为第一阶段只有四个回合，跟其他阶段的不一样（百分比形式）
export const gameStageDisplayStageOne = {
    leftTop: { x: 0.26, y: 0.01 },      // 占窗口的 26%, 1%
    rightBottom: { x: 0.44, y: 0.035 }  // 占窗口的 44%, 3.5%
}

//  游戏战斗阶段展示坐标，从2-1开始（百分比形式）
export const gameStageDisplayNormal = {
    leftTop: { x: 0.25, y: 0.01 },      // 占窗口的 25%, 1%
    rightBottom: { x: 0.42, y: 0.035 }  // 占窗口的 42%, 3.5%
}

//  游戏阶段展示（商店打开时）（百分比形式）
//  商店打开时顶部UI会有轻微位移，需要额外的识别区域
export const gameStageDisplayShopOpen = {
    leftTop: { x: 0.24, y: 0.005 },     // 占窗口的 24%, 0.5%
    rightBottom: { x: 0.45, y: 0.04 }   // 占窗口的 45%, 4%
}

// 安卓真机顶部回合号区域（比 PC 版更窄，避免把进度条一起裁进去）
export const androidGameStageDisplayStageOne = {
    leftTop: { x: 0.345, y: 0.000 },
    rightBottom: { x: 0.470, y: 0.080 }
}

export const androidGameStageDisplayNormal = {
    leftTop: { x: 0.330, y: 0.000 },
    rightBottom: { x: 0.430, y: 0.060 }
}

export const androidGameStageDisplayShopOpen = {
    leftTop: { x: 0.330, y: 0.000 },
    rightBottom: { x: 0.430, y: 0.060 }
}

//  发条鸟的战斗阶段，布局跟其他的都不一样，因为发条鸟一个大阶段有10场（百分比形式）
export const gameStageDisplayTheClockworkTrails = {
    leftTop: { x: 0.22, y: 0.01 },      // 占窗口的 22%, 1%
    rightBottom: { x: 0.40, y: 0.035 }  // 占窗口的 40%, 3.5%
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
 *
 * 注：此映射是运行时从各赛季的棋子数据自动生成的（见文件底部的生成逻辑）。
 * - 如果不同赛季或数据源中存在相同的 englishId，后面的赋值会覆盖之前的值（last-wins）。
 * - 映射的键为 champion.englishId（例如 "TFT16_Graves"），值为代码中使用的中文键名（ChampionKey）。
 * - 该常量被其他模块（例如 TftDataProvider.championEnToCnMap）以只读方式引用，用于解析来自外部数据的英文 ID。
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
