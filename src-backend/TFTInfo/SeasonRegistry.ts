/**
 * 赛季注册中心（Season Registry）
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  本模块的职责喵：
 *    集中管理"当前赛季是哪个"以及"每个赛季对应的数据在哪"。
 *    当新赛季（比如 S18）到来时，只需：
 *      1. 在 chess.ts / equip.ts / trait.ts 里加上 S18 数据
 *      2. 在本文件最下方新增 S18 的 get 函数
 *      3. 把 CURRENT_SEASON 从 'S17' 改成 'S18'
 *      4. 把 ACTIVE_MODE_TO_SEASON 里 NORMAL/RANK 的目标改成 'S18'
 *    其余业务代码通过 getCurrentXxxData() / getXxxDataByMode() 自动跟随切换。
 *
 *  设计要点：
 *    1. 本模块不使用显式返回类型标注，让 TypeScript 自动从"赛季具体常量"
 *       推导出精确的字面量类型（能拿到 "烬" | "亚托克斯" 这样的 key 联合）。
 *    2. 每个赛季对应一组 getXxxS17() / getXxxS16() / getXxxS4() 函数，
 *       是"硬编码返回"—— 这样 TS 知道"当前赛季的 chess 数据就是 S17 那个常量"。
 *    3. CURRENT_SEASON 是一个 const 字面量（不是 enum、不是函数），
 *       因为联合类型的 switch 需要字面量才能触发 TS 的类型收窄。
 * ═══════════════════════════════════════════════════════════════════════
 */

import {
    TFT_4_CHESS_DATA,
    TFT_16_CHESS_DATA,
    TFT_17_CHESS_DATA,
    TFT_4_EQUIP_DATA,
    TFT_16_EQUIP_DATA,
    TFT_17_EQUIP_DATA,
    TFTUnit,
    ChampionKey,
} from "../TFTProtocol.ts";
// 底层原始数据（用于 AnyChampionEnglishId 类型派生）直接从源头 import，
// 避免从 TFTProtocol 中转——TFTProtocol 里没有对外 export 这些下划线前缀的内部常量
import {
    _TFT_4_CHESS_DATA,
    _TFT_16_CHESS_DATA,
    _TFT_17_CHESS_DATA,
} from "./chess.ts";
import {
    TFT_4_TRAIT_DATA,
    TFT_16_TRAIT_DATA,
    TFT_17_TRAIT_DATA,
} from "./trait.ts";
import { TFTMode } from "../TFTProtocol.ts";

// =====================================================================================
//  ① 赛季 ID 与"当前主赛季"
// =====================================================================================

/**
 * 项目中存在的所有赛季 ID
 *
 * 命名约定喵：
 *   - 每个 ID 对应 chess.ts / equip.ts / trait.ts 里的一组 _TFT_xx_XXX_DATA 常量
 *   - 也对应 public/resources/assets/images/champion/sxx 下的模板目录
 */
export type SeasonId = 'S4' | 'S16' | 'S17';

/**
 * 🌟 当前主赛季标识
 *
 * 这是整个项目的"单一数据源"——换赛季时只改这一行：
 *   - 发版前把 'S17' 改成 'S18'
 *   - 所有 getCurrentXxx() 会自动跟随
 *
 * 用 `as const` 让 TS 把类型收窄成字面量 'S17' 而不是宽泛的 SeasonId，
 * 这样后续 switch(CURRENT_SEASON) 才能被 TS 认为是"已知分支"。
 */
export const CURRENT_SEASON = 'S17' as const satisfies SeasonId;

/**
 * 当前主赛季的人类可读名称
 * 用于 Toast / 日志 / 浮窗文案显示
 */
export const CURRENT_SEASON_DISPLAY_NAME = 'S17 星神';

// =====================================================================================
//  ② 游戏模式 → 赛季的映射
//
//  为什么要单独维护这个映射？
//    项目里"游戏模式 TFTMode"和"赛季 SeasonId"是两个维度：
//      - TFTMode.NORMAL：当前主赛季的匹配模式
//      - TFTMode.RANK：当前主赛季的排位模式
//      - TFTMode.S4_RUISHOU：回归赛季，固定用 S4 数据
//      - TFTMode.CLOCKWORK_TRAILS：发条鸟试炼，用当前主赛季的棋子
//    换主赛季时，NORMAL 和 RANK 应该跟着主赛季走，而 S4_RUISHOU 保持 S4。
//    所以我们把这个映射做成"当前主赛季"的函数，而不是写死。
// =====================================================================================

/**
 * 把游戏模式翻译到赛季 ID
 *
 * @param mode TFT 游戏模式
 * @returns 赛季 ID
 *
 * 实现细节喵：
 *   1. S4_RUISHOU 永远绑死 S4
 *   2. 其他模式（NORMAL/RANK/CLOCKWORK_TRAILS/CLASSIC）都走当前主赛季
 *      未来如果发条鸟要单独用 S16 数据，可以在这里加 case
 */
export function getSeasonIdByMode(mode: TFTMode): SeasonId {
    switch (mode) {
        case TFTMode.S4_RUISHOU:
            return 'S4';
        default:
            return CURRENT_SEASON;
    }
}

/**
 * 获取赛季对应的模板子目录名
 * 用于 TemplateLoader 加载对应赛季的英雄名称模板
 *
 * @param season 赛季 ID
 * @returns 子目录名，如 "s17", "s16", "s4"
 */
export function getSeasonTemplateDirById(season: SeasonId): string {
    return season.toLowerCase();   // 'S17' → 's17'
}

/**
 * 按游戏模式获取模板子目录名（便利函数）
 */
export function getSeasonTemplateDirByMode(mode: TFTMode): string {
    return getSeasonTemplateDirById(getSeasonIdByMode(mode));
}

// =====================================================================================
//  ③ 按赛季 ID 取数据（硬编码返回具体常量，保留 TS 字面量类型推导）
//
//  关键设计：这些函数都不写显式返回类型！
//  原因：如果写成 function getChessDataS17(): Record<string, TFTUnit>，
//        TS 会把精确的 "烬" | "亚托克斯" 等 key 信息擦除，
//        使用方就拿不到"当前赛季有哪些棋子"的类型提示。
// =====================================================================================

/** 获取 S17 星神赛季的棋子数据（字面量类型精确） */
export function getChessDataS17() {
    return TFT_17_CHESS_DATA;
}

/** 获取 S16 英雄联盟传奇赛季的棋子数据 */
export function getChessDataS16() {
    return TFT_16_CHESS_DATA;
}

/** 获取 S4 瑞兽闹新春赛季的棋子数据 */
export function getChessDataS4() {
    return TFT_4_CHESS_DATA;
}

/** 获取 S17 装备数据（字面量类型精确） */
export function getEquipDataS17() {
    return TFT_17_EQUIP_DATA;
}

/** 获取 S16 装备数据 */
export function getEquipDataS16() {
    return TFT_16_EQUIP_DATA;
}

/** 获取 S4 装备数据 */
export function getEquipDataS4() {
    return TFT_4_EQUIP_DATA;
}

/** 获取 S17 羁绊数据（字面量类型精确） */
export function getTraitDataS17() {
    return TFT_17_TRAIT_DATA;
}

/** 获取 S16 羁绊数据 */
export function getTraitDataS16() {
    return TFT_16_TRAIT_DATA;
}

/** 获取 S4.5 羁绊数据（已经用不到了） */
export function getTraitDataS4() {
    return TFT_4_TRAIT_DATA;
}

// =====================================================================================
//  ④ "当前主赛季"数据的便利函数（业务代码的主要入口）
//
//  这里用 switch(CURRENT_SEASON) + as const，让 TS 的控制流分析
//  自动识别"只有第一个 case 会被执行"，从而把返回类型收窄成精确的
//  TFT_17_CHESS_DATA 的字面量类型，而不是三个赛季的联合。
//
//  换赛季时，只改上面的 CURRENT_SEASON = 'S18'，这里不用动——
//  switch 会自动走到 'S18' 的分支。
// =====================================================================================

/**
 * 🌟 获取当前主赛季的棋子数据
 *
 * 业务代码应该优先用这个，而不是直接引用 TFT_17_CHESS_DATA：
 * @example
 *   const chess = getCurrentChessData();
 *   const unit = chess["烬"];   // TS 能精确知道 "烬" 是合法 key
 */
export function getCurrentChessData() {
    // 之所以写 switch 而不直接 return getChessDataS17()，
    // 是因为 switch + CURRENT_SEASON as const 能让 TS 的穷尽性检查生效：
    // 如果未来 SeasonId 加了 'S18' 但忘了在这里加 case，TS 会报错
    switch (CURRENT_SEASON) {
        case 'S17':
            return getChessDataS17();
        // 注：未来 S18 来了就新增 case 'S18': return getChessDataS18();
        // S16 / S4 永远不会是"当前主赛季"（它们只通过 getChessDataByMode 访问）
    }
}

/**
 * 🌟 获取当前主赛季的装备数据
 */
export function getCurrentEquipData() {
    switch (CURRENT_SEASON) {
        case 'S17':
            return getEquipDataS17();
    }
}

/**
 * 🌟 获取当前主赛季的羁绊数据
 */
export function getCurrentTraitData() {
    switch (CURRENT_SEASON) {
        case 'S17':
            return getTraitDataS17();
    }
}

/**
 * 🌟 获取当前主赛季对应的模板子目录名
 * @example getCurrentTemplateDir() → 's17'
 */
export function getCurrentTemplateDir(): string {
    return getSeasonTemplateDirById(CURRENT_SEASON);
}

// =====================================================================================
//  ⑤ 按"游戏模式"获取数据（运行时识别用）
//
//  这里牺牲了部分类型精度——返回类型会是"所有可能赛季数据的联合"，
//  因为编译时不知道 mode 最终会指向哪个赛季。
//  但这对业务代码无所谓——OCR/模板匹配拿到的棋子名本来就是 string。
// =====================================================================================

/**
 * 根据游戏模式获取棋子数据（运行时识别链使用）
 *
 * 返回值是"所有支持赛季"的联合类型，访问 [某棋子名] 时 TS 知道可能来自任一赛季
 *
 * @param mode 当前 TFT 模式
 */
export function getChessDataByMode(mode: TFTMode) {
    const season = getSeasonIdByMode(mode);
    switch (season) {
        case 'S17':
            return getChessDataS17();
        case 'S16':
            return getChessDataS16();
        case 'S4':
            return getChessDataS4();
    }
}

/**
 * 根据游戏模式获取装备数据
 * @param mode 当前 TFT 模式
 */
export function getEquipDataByMode(mode: TFTMode) {
    const season = getSeasonIdByMode(mode);
    switch (season) {
        case 'S17':
            return getEquipDataS17();
        case 'S16':
            return getEquipDataS16();
        case 'S4':
            return getEquipDataS4();
    }
}

/**
 * 根据游戏模式获取羁绊数据
 *
 * 注意：发条鸟（CLOCKWORK_TRAILS）走当前主赛季的羁绊，
 *       但策略评分时如果需要"用 S4.5 羁绊数据"，请直接调用 getTraitDataS4()
 * @param mode 当前 TFT 模式
 */
export function getTraitDataByMode(mode: TFTMode) {
    const season = getSeasonIdByMode(mode);
    switch (season) {
        case 'S17':
            return getTraitDataS17();
        case 'S16':
            return getTraitDataS16();
        case 'S4':
            return getTraitDataS4();
    }
}

// =====================================================================================
//  ⑥ 按"阵容配置的 season 字符串"获取数据（阵容加载验证用）
//
//  阵容 JSON 里用户填的是字符串 "S16" / "S17"，不是 TFTMode 枚举，
//  所以单独提供一组接口。
// =====================================================================================

/**
 * 按阵容配置的赛季字符串获取棋子数据
 * @param season 阵容 JSON 里的 season 字段，如 "S17"；undefined 时默认当前主赛季
 */
export function getChessDataBySeasonId(season: SeasonId = CURRENT_SEASON) {
    switch (season) {
        case 'S17':
            return getChessDataS17();
        case 'S16':
            return getChessDataS16();
        case 'S4':
            return getChessDataS4();
    }
}

/**
 * 按阵容配置的赛季字符串获取装备数据
 */
export function getEquipDataBySeasonId(season: SeasonId = CURRENT_SEASON) {
    switch (season) {
        case 'S17':
            return getEquipDataS17();
        case 'S16':
            return getEquipDataS16();
        case 'S4':
            return getEquipDataS4();
    }
}

// =====================================================================================
//  ⑦ 类型系统辅助（保留静态类型推导）
//
//  这些类型会从"当前主赛季的数据常量"自动推导出 key 联合，
//  比如 CurrentChampionName 会是 "烬" | "亚托克斯" | ... 这种精确类型。
// =====================================================================================

/** 当前主赛季的"棋子数据"类型（保留 key 的精确字面量） */
export type CurrentChessData = ReturnType<typeof getCurrentChessData>;

/** 当前主赛季的"装备数据"类型 */
export type CurrentEquipData = ReturnType<typeof getCurrentEquipData>;

/** 当前主赛季所有棋子的中文名联合类型，如 "烬" | "亚托克斯" | ... */
export type CurrentChampionName = keyof CurrentChessData;

/** 当前主赛季所有装备的中文名联合类型 */
export type CurrentEquipName = keyof CurrentEquipData;

/** 跨赛季的英雄名联合类型（包含所有赛季，用于历史阵容兼容） */
export type AnyChampionName =
    | keyof typeof TFT_17_CHESS_DATA
    | keyof typeof TFT_16_CHESS_DATA
    | keyof typeof TFT_4_CHESS_DATA;

/** 跨赛季的英雄英文 ID 联合类型（用于 OP.GG 等外部数据解析） */
export type AnyChampionEnglishId =
    | typeof _TFT_17_CHESS_DATA[keyof typeof _TFT_17_CHESS_DATA]['englishId']
    | typeof _TFT_16_CHESS_DATA[keyof typeof _TFT_16_CHESS_DATA]['englishId']
    | typeof _TFT_4_CHESS_DATA[keyof typeof _TFT_4_CHESS_DATA]['englishId'];

/** 跨赛季的装备名联合类型 */
export type AnyEquipName =
    | keyof typeof TFT_17_EQUIP_DATA
    | keyof typeof TFT_16_EQUIP_DATA
    | keyof typeof TFT_4_EQUIP_DATA;

// =====================================================================================
//  ⑧ 跨赛季棋子属性查询（近战/远程/射程）
//
//  这些函数需要"查找所有赛季"——因为历史阵容配置里可能有 S16 的棋子名，
//  或者 TFT 偶尔也会在新赛季复用旧赛季的棋子名字。
//  所以查询顺序：当前主赛季 → S16 → S4，任一赛季能查到就返回。
//
//  之所以放在 SeasonRegistry 而不是 TFTProtocol，是为了避免 TFTProtocol
//  反向依赖 SeasonRegistry 形成的循环 import 问题。
// =====================================================================================

/**
 * 判断棋子是否为近战单位
 * @param championName 棋子中文名
 * @returns true 表示近战，false 表示远程
 */
export function isMeleeChampion(championName: ChampionKey): boolean {
    const champion = (getCurrentChessData() as Record<string, TFTUnit>)[championName]
        ?? (TFT_16_CHESS_DATA as Record<string, TFTUnit>)[championName]
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
    const champion = (getCurrentChessData() as Record<string, TFTUnit>)[championName]
        ?? (TFT_16_CHESS_DATA as Record<string, TFTUnit>)[championName]
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
    return ((getCurrentChessData() as Record<string, TFTUnit>)[championName]
        ?? (TFT_16_CHESS_DATA as Record<string, TFTUnit>)[championName]
        ?? (TFT_4_CHESS_DATA as Record<string, TFTUnit>)[championName])?.attackRange;
}
