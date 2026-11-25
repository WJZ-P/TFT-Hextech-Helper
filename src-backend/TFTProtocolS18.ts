/**
 * @file S18（虚幻客户端）界面点位
 * @description 虚幻引擎版云顶客户端的点击坐标和识别区域，命名与 TFTProtocol.ts 中老客户端的点位一一对应，
 *              识别代码切换过来时只需换 import。
 *
 * 坐标约定：
 *   - 基于 1280x720 的游戏画面（客户区），原点是客户区左上角，不含窗口标题栏和边框
 *     （挂机时 TftWindowLocator 会把客户区调成 1280x720，实际屏幕坐标 = 客户区左上角 + 这里的坐标）
 *   - 数据来源：public/gamePhotos/S18 下的截图，用像素扫描测量（格子轮廓、文字包围盒、边框边缘）
 *
 * 布局差异：
 *   常规模式和发条鸟模式的底部 HUD（等级、金币、商店、升级/刷新按钮）位置不同，发条鸟整体左移 69px，
 *   这些点位提供了 xxx（常规）和 xxxClockwork（发条鸟）两套；棋盘、备战席、装备栏两种模式相同。
 *
 * 不需要的点位：发条鸟阵亡后的"现在退出"按钮（打完会自动回到主菜单）
 */

import type { SimplePoint } from "./TFTProtocol.ts";

/** 矩形区域（与 TFTProtocol.ts 中的写法一致） */
interface SimpleRegion {
    leftTop: SimplePoint;
    rightBottom: SimplePoint;
}

/** 发条鸟模式底部 HUD 相对常规模式的水平偏移 */
const CLOCKWORK_HUD_OFFSET_X = -69;

function shiftPointX<T extends Record<string, SimplePoint>>(points: T, dx: number): T {
    return Object.fromEntries(
        Object.entries(points).map(([key, p]) => [key, { x: p.x + dx, y: p.y }])
    ) as T;
}

function shiftRegionX<T extends SimpleRegion>(region: T, dx: number): T {
    return {
        leftTop: { x: region.leftTop.x + dx, y: region.leftTop.y },
        rightBottom: { x: region.rightBottom.x + dx, y: region.rightBottom.y },
    } as T;
}

function shiftRegionsX<T extends Record<string, SimpleRegion>>(regions: T, dx: number): T {
    return Object.fromEntries(
        Object.entries(regions).map(([key, r]) => [key, shiftRegionX(r, dx)])
    ) as T;
}

// ============================================================================
// 底部 HUD：等级、金币、升级 / 刷新按钮
// ============================================================================

//  左下角等级 region，包含等级和经验（"5级" 文字 x 232-252，"4/20" 文字 x 317-335，y 592-603）
//  getLevelInfo 按 "5级 4/20" 的格式解析，两段文字都要框进来
export const levelRegion = {
    leftTop: { x: 229, y: 589 },
    rightBottom: { x: 345, y: 606 }
}
export const levelRegionClockwork = shiftRegionX(levelRegion, CLOCKWORK_HUD_OFFSET_X);

//  持有金币 region（数字居中显示，"22" 文字 x 679-694, y 594-604）
export const coinRegion = {
    leftTop: { x: 671, y: 591 },
    rightBottom: { x: 702, y: 607 }
}
export const coinRegionClockwork = shiftRegionX(coinRegion, CLOCKWORK_HUD_OFFSET_X);

//  购买经验 Point（"购买经验值"按钮，x 232-355, y 620-662）
export const buyExpPoint = { x: 293, y: 641 }
//  刷新商店 Point（"刷新"按钮，在购买经验下方）
export const refreshShopPoint = { x: 293, y: 691 }
export const buyExpPointClockwork = { x: buyExpPoint.x + CLOCKWORK_HUD_OFFSET_X, y: buyExpPoint.y }
export const refreshShopPointClockwork = { x: refreshShopPoint.x + CLOCKWORK_HUD_OFFSET_X, y: refreshShopPoint.y }

// ============================================================================
// 商店
// ============================================================================

//  商店卡片：x [366-494] [500-628] [635-763] [769-897] [904-1032]，y 618-716
//  点击坐标取卡片立绘中心
export const shopSlot = {
    SHOP_SLOT_1: { x: 430, y: 656 },
    SHOP_SLOT_2: { x: 564, y: 656 },
    SHOP_SLOT_3: { x: 699, y: 656 },
    SHOP_SLOT_4: { x: 833, y: 656 },
    SHOP_SLOT_5: { x: 968, y: 656 },
}
export const shopSlotClockwork = shiftPointX(shopSlot, CLOCKWORK_HUD_OFFSET_X);

//  商店卡片底部的英雄名字 region（名字栏 y 694-716，文字从卡片左边 +5 开始、y 698-709，右侧 +106 起是价格）
//  宽 96 高 16，与 detailChampionNameRegion 尺寸相同，两处共用一套名字模板
export const shopSlotNameRegions = {
    SLOT_1: {
        leftTop: { x: 370, y: 696 },
        rightBottom: { x: 466, y: 712 }
    },
    SLOT_2: {
        leftTop: { x: 504, y: 696 },
        rightBottom: { x: 600, y: 712 }
    },
    SLOT_3: {
        leftTop: { x: 639, y: 696 },
        rightBottom: { x: 735, y: 712 }
    },
    SLOT_4: {
        leftTop: { x: 773, y: 696 },
        rightBottom: { x: 869, y: 712 }
    },
    SLOT_5: {
        leftTop: { x: 908, y: 696 },
        rightBottom: { x: 1004, y: 712 }
    },
}
export const shopSlotNameRegionsClockwork = shiftRegionsX(shopSlotNameRegions, CLOCKWORK_HUD_OFFSET_X);

// ============================================================================
// 右侧棋子详情面板（选中棋子时出现，测量自发条鸟截图）
// ============================================================================

//  英雄名字 region（"洛" 文字 x 1128-1137, y 235-245），尺寸必须与 shopSlotNameRegions 一致以复用名字模板
export const detailChampionNameRegion = {
    leftTop: { x: 1126, y: 233 },
    rightBottom: { x: 1222, y: 249 },
}
//  3 个装备槽（空槽是 40x40 的方格）
export const detailEquipRegion = {
    SLOT_1: {
        leftTop: { x: 1132, y: 360 },
        rightBottom: { x: 1172, y: 400 },
    },
    SLOT_2: {
        leftTop: { x: 1180, y: 360 },
        rightBottom: { x: 1220, y: 400 },
    },
    SLOT_3: {
        leftTop: { x: 1228, y: 360 },
        rightBottom: { x: 1268, y: 400 },
    },
}
//  星级 region（面板顶部居中的星星，以 x 1200 居中，y 126-133）：
//  1 星铜色 x 1196-1203，2 星银色 x 1192-1207，3 星金色 x 1187-1212。下边到 137 为止，再往下是棋子原画
export const detailChampionStarRegion = {
    leftTop: { x: 1180, y: 124 },
    rightBottom: { x: 1220, y: 137 }
}

// ============================================================================
// 左侧装备栏（10 格，图标 x 9-34，第一格 y 176-200，往下每格 +36）
// ============================================================================

//  装备槽位点击坐标
export const equipmentSlot = {
    EQ_SLOT_1: { x: 21, y: 188 },   //  y+=36
    EQ_SLOT_2: { x: 21, y: 224 },
    EQ_SLOT_3: { x: 21, y: 260 },
    EQ_SLOT_4: { x: 21, y: 296 },
    EQ_SLOT_5: { x: 21, y: 332 },
    EQ_SLOT_6: { x: 21, y: 368 },
    EQ_SLOT_7: { x: 21, y: 404 },
    EQ_SLOT_8: { x: 21, y: 440 },
    EQ_SLOT_9: { x: 21, y: 476 },
    EQ_SLOT_10: { x: 21, y: 512 },
}
//  装备槽位图标区域（宽 26，高 25）
export const equipmentRegion = {
    SLOT_1: {                   //  y+=36
        leftTop: { x: 9, y: 176 },
        rightBottom: { x: 34, y: 200 }
    },
    SLOT_2: {
        leftTop: { x: 9, y: 212 },
        rightBottom: { x: 34, y: 236 }
    },
    SLOT_3: {
        leftTop: { x: 9, y: 248 },
        rightBottom: { x: 34, y: 272 }
    },
    SLOT_4: {
        leftTop: { x: 9, y: 284 },
        rightBottom: { x: 34, y: 308 }
    },
    SLOT_5: {
        leftTop: { x: 9, y: 320 },
        rightBottom: { x: 34, y: 344 }
    },
    SLOT_6: {
        leftTop: { x: 9, y: 356 },
        rightBottom: { x: 34, y: 380 }
    },
    SLOT_7: {
        leftTop: { x: 9, y: 392 },
        rightBottom: { x: 34, y: 416 }
    },
    SLOT_8: {
        leftTop: { x: 9, y: 428 },
        rightBottom: { x: 34, y: 452 }
    },
    SLOT_9: {
        leftTop: { x: 9, y: 464 },
        rightBottom: { x: 34, y: 488 }
    },
    SLOT_10: {
        leftTop: { x: 9, y: 500 },
        rightBottom: { x: 34, y: 524 }
    },
}

// ============================================================================
// 棋盘（4 行 x 7 列六边形，R1 是离自己最远的一行；透视下越往下格子越大）
// ============================================================================

//  棋子在战场上的点位，用于鼠标点击选择英雄
//  取六边形中心，Y 往上偏移 5 像素（与老客户端一致），避免点击时误触到下一行的棋子
export const fightBoardSlotPoint = {
    //  第一行的棋子位置        //  x+=77
    R1_C1: { x: 374, y: 292 },
    R1_C2: { x: 451, y: 292 },
    R1_C3: { x: 527, y: 292 },
    R1_C4: { x: 604, y: 292 },
    R1_C5: { x: 681, y: 292 },
    R1_C6: { x: 757, y: 292 },
    R1_C7: { x: 834, y: 292 },
    //  第二行的棋子位置        //  x+=79
    R2_C1: { x: 404, y: 340 },
    R2_C2: { x: 484, y: 340 },
    R2_C3: { x: 563, y: 340 },
    R2_C4: { x: 642, y: 340 },
    R2_C5: { x: 721, y: 340 },
    R2_C6: { x: 801, y: 340 },
    R2_C7: { x: 880, y: 340 },
    //  第三行棋子的位置        //  x+=82
    R3_C1: { x: 355, y: 390 },
    R3_C2: { x: 437, y: 390 },
    R3_C3: { x: 519, y: 390 },
    R3_C4: { x: 601, y: 390 },
    R3_C5: { x: 683, y: 390 },
    R3_C6: { x: 765, y: 390 },
    R3_C7: { x: 847, y: 390 },
    //  第四行棋子的位置        //  x+=85
    R4_C1: { x: 387, y: 445 },
    R4_C2: { x: 472, y: 445 },
    R4_C3: { x: 557, y: 445 },
    R4_C4: { x: 642, y: 445 },
    R4_C5: { x: 728, y: 445 },
    R4_C6: { x: 813, y: 445 },
    R4_C7: { x: 898, y: 445 },
}
//  棋子在战场上的 region，用来判断是否有棋子
//  由六边形内部的包围盒得出：leftTop.y 使用 -10 偏移，兼容 3D 飞行棋子的高度；
//  leftTop.x +5, rightBottom.x -5，避免宽体棋子占据邻居位置导致误判（与老客户端一致）
//  第四行的六边形到 y 478，但备战席棋子的头和血条会伸到 y 456 左右，所以只取到 450，避免把空格子误判成有棋子
//  改了这里要重新运行 scripts/generate_s18_screenshot_templates.cjs
export const fightBoardSlotRegion = {
    //  第一行（六边形 y 275-320）
    R1_C1: {
        leftTop: { x: 342 + 5, y: 275 - 10 },
        rightBottom: { x: 405 - 5, y: 320 }
    },
    R1_C2: {
        leftTop: { x: 419 + 5, y: 275 - 10 },
        rightBottom: { x: 482 - 5, y: 320 }
    },
    R1_C3: {
        leftTop: { x: 496 + 5, y: 275 - 10 },
        rightBottom: { x: 558 - 5, y: 320 }
    },
    R1_C4: {
        leftTop: { x: 573 + 5, y: 275 - 10 },
        rightBottom: { x: 635 - 5, y: 320 }
    },
    R1_C5: {
        leftTop: { x: 650 + 5, y: 275 - 10 },
        rightBottom: { x: 713 - 5, y: 320 }
    },
    R1_C6: {
        leftTop: { x: 726 + 5, y: 275 - 10 },
        rightBottom: { x: 788 - 5, y: 320 }
    },
    R1_C7: {
        leftTop: { x: 802 + 5, y: 275 - 10 },
        rightBottom: { x: 866 - 5, y: 320 }
    },
    //  第二行（六边形 y 321-369）
    R2_C1: {
        leftTop: { x: 371 + 5, y: 321 - 10 },
        rightBottom: { x: 437 - 5, y: 369 }
    },
    R2_C2: {
        leftTop: { x: 451 + 5, y: 321 - 10 },
        rightBottom: { x: 516 - 5, y: 369 }
    },
    R2_C3: {
        leftTop: { x: 531 + 5, y: 321 - 10 },
        rightBottom: { x: 595 - 5, y: 369 }
    },
    R2_C4: {
        leftTop: { x: 610 + 5, y: 321 - 10 },
        rightBottom: { x: 674 - 5, y: 369 }
    },
    R2_C5: {
        leftTop: { x: 689 + 5, y: 321 - 10 },
        rightBottom: { x: 754 - 5, y: 369 }
    },
    R2_C6: {
        leftTop: { x: 768 + 5, y: 321 - 10 },
        rightBottom: { x: 833 - 5, y: 369 }
    },
    R2_C7: {
        leftTop: { x: 847 + 5, y: 321 - 10 },
        rightBottom: { x: 913 - 5, y: 369 }
    },
    //  第三行（六边形 y 369-421）
    R3_C1: {
        leftTop: { x: 320 + 5, y: 369 - 10 },
        rightBottom: { x: 389 - 5, y: 421 }
    },
    R3_C2: {
        leftTop: { x: 403 + 5, y: 369 - 10 },
        rightBottom: { x: 470 - 5, y: 421 }
    },
    R3_C3: {
        leftTop: { x: 485 + 5, y: 369 - 10 },
        rightBottom: { x: 552 - 5, y: 421 }
    },
    R3_C4: {
        leftTop: { x: 568 + 5, y: 369 - 10 },
        rightBottom: { x: 634 - 5, y: 421 }
    },
    R3_C5: {
        leftTop: { x: 651 + 5, y: 369 - 10 },
        rightBottom: { x: 717 - 5, y: 421 }
    },
    R3_C6: {
        leftTop: { x: 732 + 5, y: 369 - 10 },
        rightBottom: { x: 799 - 5, y: 421 }
    },
    R3_C7: {
        leftTop: { x: 814 + 5, y: 369 - 10 },
        rightBottom: { x: 881 - 5, y: 421 }
    },
    //  第四行（六边形 y 422-478）
    R4_C1: {
        leftTop: { x: 351 + 5, y: 422 - 10 },
        rightBottom: { x: 422 - 5, y: 450 }
    },
    R4_C2: {
        leftTop: { x: 437 + 5, y: 422 - 10 },
        rightBottom: { x: 506 - 5, y: 450 }
    },
    R4_C3: {
        leftTop: { x: 523 + 5, y: 422 - 10 },
        rightBottom: { x: 591 - 5, y: 450 }
    },
    R4_C4: {
        leftTop: { x: 608 + 5, y: 422 - 10 },
        rightBottom: { x: 676 - 5, y: 450 }
    },
    R4_C5: {
        leftTop: { x: 693 + 5, y: 422 - 10 },
        rightBottom: { x: 762 - 5, y: 450 }
    },
    R4_C6: {
        leftTop: { x: 778 + 5, y: 422 - 10 },
        rightBottom: { x: 848 - 5, y: 450 }
    },
    R4_C7: {
        leftTop: { x: 863 + 5, y: 422 - 10 },
        rightBottom: { x: 933 - 5, y: 450 }
    },
}

// ============================================================================
// 备战席（9 格方格，x 间距 77，方格 y 501-551）
// ============================================================================

//  棋子在备战席的 region，用来判断是否有棋子
//  leftTop.y 使用 -15 偏移，兼容 3D 飞行棋子的高度
//  leftTop.x +5, rightBottom.x -5，避免宽体棋子占据邻居位置导致误判（与老客户端一致）
export const benchSlotRegion = {
    SLOT_1: {
        leftTop: { x: 256 + 5, y: 501 - 15 },
        rightBottom: { x: 321 - 5, y: 551 }
    },
    SLOT_2: {
        leftTop: { x: 333 + 5, y: 501 - 15 },
        rightBottom: { x: 398 - 5, y: 551 }
    },
    SLOT_3: {
        leftTop: { x: 410 + 5, y: 501 - 15 },
        rightBottom: { x: 475 - 5, y: 551 }
    },
    SLOT_4: {
        leftTop: { x: 487 + 5, y: 501 - 15 },
        rightBottom: { x: 552 - 5, y: 551 }
    },
    SLOT_5: {
        leftTop: { x: 564 + 5, y: 501 - 15 },
        rightBottom: { x: 629 - 5, y: 551 }
    },
    SLOT_6: {
        leftTop: { x: 642 + 5, y: 501 - 15 },
        rightBottom: { x: 706 - 5, y: 551 }
    },
    SLOT_7: {
        leftTop: { x: 719 + 5, y: 501 - 15 },
        rightBottom: { x: 784 - 5, y: 551 }
    },
    SLOT_8: {
        leftTop: { x: 796 + 5, y: 501 - 15 },
        rightBottom: { x: 861 - 5, y: 551 }
    },
    SLOT_9: {
        leftTop: { x: 873 + 5, y: 501 - 15 },
        rightBottom: { x: 938 - 5, y: 551 }
    },
}

//  备战席点位（方格中心）
export const benchSlotPoints = {
    SLOT_1: { x: 289, y: 526 },
    SLOT_2: { x: 366, y: 526 },
    SLOT_3: { x: 443, y: 526 },
    SLOT_4: { x: 520, y: 526 },
    SLOT_5: { x: 597, y: 526 },
    SLOT_6: { x: 674, y: 526 },
    SLOT_7: { x: 752, y: 526 },
    SLOT_8: { x: 829, y: 526 },
    SLOT_9: { x: 906, y: 526 },
}

// ============================================================================
// 装备锻造器
// ============================================================================

//  右键锻造器弹出的浮窗里，名称文字的识别区域（相对备战席格子中心 benchSlotPoints）
//  虚幻客户端的浮窗不跟随鼠标，固定显示在格子右侧，右侧的格子也不会翻到左边。
//  实测（格子 1 / 2 / 9）：文字左边缘相对格子中心 +110 / +109 / +124，宽 91，y 固定 476-489；
//  浮窗里的图标在文字左边 13px。区域按三者的并集留余量，9 个格子通用
export const itemForgeTooltipRegion = {
    leftTop: { x: 103, y: -55 },
    rightBottom: { x: 225, y: -31 },
}

//  锻造器选择界面（四选一）的卡片中心：卡片 149x96，间距 160.5，y 607-703，整排以 x 640 居中
export const forgeCardSlot = {
    SLOT_1: { x: 399, y: 670 },
    SLOT_2: { x: 559, y: 670 },
    SLOT_3: { x: 720, y: 670 },
    SLOT_4: { x: 880, y: 670 },
}
//  不区分装备时的默认点击位置：四选一时落在第 2 张（485-634）。
//  五选一没有截图，按同样的卡片尺寸和间距推算，会落在正中间那张（566-715）
export const forgePickPoint = { x: 600, y: 670 }

// ============================================================================
// 选择环节
// ============================================================================

//  三选一卡片的点击坐标（S18 的强化选择，标题"选择一个"；卡片间距 273）
export const hexSlot = {   //  x+=273
    SLOT_1: { x: 367, y: 380 },
    SLOT_2: { x: 640, y: 380 },
    SLOT_3: { x: 913, y: 380 },
}
//  三选一卡片下方的刷新按钮
export const hexRefreshSlot = {
    SLOT_1: { x: 367, y: 570 },
    SLOT_2: { x: 640, y: 570 },
    SLOT_3: { x: 913, y: 570 },
}

//  选秀站位：环形选秀区离自己（屏幕下方）最近的棋子位置
export const sharedDraftPoint = { x: 640, y: 370 }

// ============================================================================
// 阶段显示
// ============================================================================

//  顶部阶段文字的位置随回合图标数量变化，分三种情况（文字高度都是 y 7-16）
//  第一阶段（"1-3" 文字 x 551-569）
export const gameStageDisplayStageOne = {
    leftTop: { x: 548, y: 4 },
    rightBottom: { x: 575, y: 20 }
}
//  从 2-1 开始（"2-6" 文字 x 513-532）
export const gameStageDisplayNormal = {
    leftTop: { x: 510, y: 4 },
    rightBottom: { x: 538, y: 20 }
}
//  发条鸟（"1-1" 文字 x 477-493；一个大阶段有 10 场，会出现 "x-10"，右侧多留空间）
export const gameStageDisplayTheClockworkTrails = {
    leftTop: { x: 474, y: 4 },
    rightBottom: { x: 506, y: 20 }
}

//  "战斗环节" / "备战环节" 四字 region（文字 x 601-678, y 100-118），用来判断是否停止操作
export const combatPhaseTextRegion = {
    leftTop: { x: 598, y: 97 },
    rightBottom: { x: 682, y: 121 }
}

//  发条鸟模式右下角"战斗"按钮
export const clockworkTrailsFightButtonPoint = {
    x: 1047,
    y: 660
}

// ============================================================================
// 阵亡后的结算界面（"你获得了 第 x 名"，下方是"现在退出"和"继续观看"）
// ============================================================================

//  "现在退出"按钮（边框 x 566-713, y 321-351，文字 x 615-664, y 330-342）
export const exitGameButtonPoint = { x: 640, y: 336 }
//  按钮文字的检测区域，比模板（74x20）四周各大几个像素
export const exitGameButtonRegion = {
    leftTop: { x: 590, y: 322 },
    rightBottom: { x: 690, y: 350 },
}

// ============================================================================
// 小小英雄与战利品（估计值，需实机验证）
// ============================================================================

//  小小英雄默认站位（棋盘左侧平台，开局时站在这里）
export const littleLegendDefaultPoint = { x: 210, y: 390 };

//  小小英雄随机走位 Point（防挂机检测），沿棋盘左右两侧
export const selfWalkAroundPoints = {
    left: [{ x: 300, y: 450 }, { x: 310, y: 400 }, { x: 320, y: 350 }, { x: 330, y: 300 }, { x: 340, y: 250 }],
    right: [{ x: 935, y: 450 }, { x: 925, y: 400 }, { x: 915, y: 350 }, { x: 905, y: 300 }, { x: 895, y: 250 }],
}

//  战利品掉落 region，可能的掉落区域（自己的棋盘范围）
export const lootRegion = {
    leftTop: { x: 300, y: 100 },
    rightBottom: { x: 980, y: 490 }
}
