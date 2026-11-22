//  S16:英雄联盟传奇羁绊
import type { TraitData } from "../TFTProtocol.ts";

export enum UnitOrigin_S16 {
    // 地区/大型羁绊
    Bilgewater = "比尔吉沃特",
    Darkin = "暗裔",
    Demacia = "德玛西亚",
    Freljord = "弗雷尔卓德",
    Ionia = "艾欧尼亚",
    Ixtal = "以绪塔尔",
    Noxus = "诺克萨斯",
    Piltover = "皮尔特沃夫",
    ShadowIsles = "暗影岛",
    Shurima = "恕瑞玛",
    Targon = "巨神峰",
    Void = "虚空",
    Yordle = "约德尔人",
    Zaun = "祖安",

    // 5费/特殊单卡独有羁绊
    Starforger = "铸星龙王", // 奥瑞利安·索尔
    Baron = "纳什男爵",     // 纳什男爵
    Blacksmith = "山隐之焰", // 奥恩
    Caretaker = "星界游神",  // 巴德/星界游神
    Chronokeeper = "时光守护者", // 基兰
    DarkChild = "黑暗之女",  // 安妮
    Emperor = "沙漠皇帝",    // 阿兹尔
    Glutton = "河流之王",    // 塔姆
    Harvester = "远古恐惧",  // 费德提克
    Heroic = "正义巨像",     // 加里奥
    HexMech = "海克斯机甲",  // 黑默丁格/霸龙
    Huntress = "狂野女猎手", // 奈德丽
    Assimilator = "虚空之女", // 卡莎
    Kindred = "永猎双子",    // 千珏
    RuneMage = "符文法师",   // 瑞兹
    Dragonborn = "龙血武姬", // 希瓦娜
    Soulbound = "系魂圣枪",  // 卢锡安/赛娜
    Chainbreaker = "解脱者", // 塞拉斯
    TheBoss = "腕豪",       // 瑟提
    Ascendant = "远古巫灵",  // 泽拉斯
    Immortal = "不落魔锋",   // 亚恒/剑魔?

    // 组合技羁绊 (Teamup)
    TeamupJarvanShyvana = "巨龙卫士", // 皇子+龙女
    TeamupLucianVayne = "光明哨兵",   // 卢锡安+薇恩
    TeamupSingedTeemo = "绝命毒师",   // 辛吉德+提莫
    TeamupAmbessaKindred = "与狼共舞", // 安蓓萨+千珏
}
export enum UnitClass_S16 {
    Bruiser = "斗士",
    Defender = "护卫",
    Gunslinger = "枪手",
    Invoker = "神谕者",
    Juggernaut = "主宰",
    Longshot = "狙神",
    Magus = "耀光使",
    Rapidfire = "迅击战士",
    Slayer = "裁决战士",
    Sorcerer = "法师",
    Vanquisher = "征服者",
    Warden = "神盾使",
}

// S16 羁绊详细数据 Map (key 为中文名)
export const TFT_16_TRAIT_DATA: Record<string, TraitData> = {
    // === Origins (origins) ===
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

    // === Classes (classes) ===
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

// S4.5:瑞兽闹新春
export enum UnitOrigin_S4_5 {
    // 大型羁绊（多等级激活）
    Cultist = "腥红之月",      // 召唤加里奥
    Divine = "天神",          // 飞升获得伤害减免和真实伤害
    Dragonsoul = "龙魂",      // 巨龙赐福，龙焰爆裂
    Elderwood = "永恒之森",    // 随时间成长获得属性
    Enlightened = "玉剑仙",    // 额外法力值生成
    Fortune = "福星",         // 战斗胜利获得额外战利品
    Spirit = "灵魂莲华明昼",   // 施法后全队获得攻速
    Warlord = "三国猛将",      // 获得生命和法强，胜利时叠加

    // 小型羁绊（少等级激活）
    Exile = "浪人",           // 独处时获得护盾和吸血
    Fabled = "山海绘卷",       // 强化技能效果
    Ninja = "忍者",           // 恰好1或4名时获得攻击和法强

    // 5费/特殊单卡独有羁绊
    Blacksmith = "铁匠",       // 奥恩：打造神器
    Boss = "霸王",            // 瑟提：仰卧起坐回血后真伤
    Daredevil = "主宰",       // 莎弥拉：冲刺和评价系统
    Emperor = "枭雄",         // 阿兹尔：部署沙漠卫兵
}
export enum UnitClass_S4_5 {
    Adept = "宗师",           // 开战时降低敌人攻速
    Assassin = "刺客",        // 跳后排，技能可暴击
    Brawler = "斗士",         // 额外生命值和攻击力
    Duelist = "决斗大师",      // 攻击叠加攻速
    Executioner = "裁决使",    // 对低血量目标暴击
    Keeper = "神盾使",        // 开战时为邻格友军提供护盾
    Mage = "魔法师",          // 双重施法，修正法强
    Mystic = "秘术师",        // 全队获得魔抗
    Sharpshooter = "神射手",   // 攻击和技能弹射
    Slayer = "战神",          // 基于已损失生命获得吸血和伤害加成
    Syphoner = "摄魂使",       // 全队获得全能吸血
    Vanguard = "重装战士",     // 额外护甲和魔抗
}

// S4 羁绊详细数据 Map (key 为中文名)
export const TFT_4_TRAIT_DATA: Record<string, TraitData> = {
    // === Origins (origins) ===
    "铁匠": { id: "10270", name: "铁匠", type: "origins", levels: [1] },
    "霸王": { id: "10271", name: "霸王", type: "origins", levels: [1] },
    "腥红之月": { id: "10273", name: "腥红之月", type: "origins", levels: [3, 6, 9, 11] },
    "主宰": { id: "10274", name: "主宰", type: "origins", levels: [1] },
    "天神": { id: "10276", name: "天神", type: "origins", levels: [2, 4, 6, 8] },
    "龙魂": { id: "10277", name: "龙魂", type: "origins", levels: [3, 6, 9] },
    "永恒之森": { id: "10279", name: "永恒之森", type: "origins", levels: [3, 6, 9] },
    "枭雄": { id: "10280", name: "枭雄", type: "origins", levels: [1] },
    "玉剑仙": { id: "10281", name: "玉剑仙", type: "origins", levels: [2, 4, 6, 8] },
    "浪人": { id: "10283", name: "浪人", type: "origins", levels: [1, 2] },
    "山海绘卷": { id: "10284", name: "山海绘卷", type: "origins", levels: [3] },
    "福星": { id: "10285", name: "福星", type: "origins", levels: [3, 6, 10] },
    "忍者": { id: "10289", name: "忍者", type: "origins", levels: [1, 4] },
    "灵魂莲华明昼": { id: "10292", name: "灵魂莲华明昼", type: "origins", levels: [2, 4, 6] },
    "三国猛将": { id: "10295", name: "三国猛将", type: "origins", levels: [3, 6, 9, 11] },

    // === Classes (classes) ===
    "宗师": { id: "10268", name: "宗师", type: "classes", levels: [2, 3, 4] },
    "刺客": { id: "10269", name: "刺客", type: "classes", levels: [2, 4, 6] },
    "斗士": { id: "10272", name: "斗士", type: "classes", levels: [2, 4, 6, 8] },
    "决斗大师": { id: "10278", name: "决斗大师", type: "classes", levels: [2, 4, 6, 8] },
    "裁决使": { id: "10282", name: "裁决使", type: "classes", levels: [2, 3, 4] },
    "神盾使": { id: "10286", name: "神盾使", type: "classes", levels: [2, 4, 6, 8] },
    "魔法师": { id: "10287", name: "魔法师", type: "classes", levels: [3, 5, 7, 10] },
    "秘术师": { id: "10288", name: "秘术师", type: "classes", levels: [2, 3, 4, 5] },
    "神射手": { id: "10290", name: "神射手", type: "classes", levels: [2, 4, 6] },
    "战神": { id: "10291", name: "战神", type: "classes", levels: [3, 6, 9] },
    "摄魂使": { id: "10293", name: "摄魂使", type: "classes", levels: [2, 4, 6] },
    "重装战士": { id: "10294", name: "重装战士", type: "classes", levels: [2, 4, 6, 8] },
};

// =====================================================================================
// S17: 新赛季 - 科幻主题（观星者/幻灵战队/太空律动等）
// =====================================================================================
// 本赛季关键词：宇宙、机甲、观星者、特工队
// 羁绊划分说明：
//   - Origins（种族/主题）：代表阵营 / 世界观背景（比如"幻灵战队""暗星""太空律动"）
//   - Classes（职业/打法）：代表战斗角色定位（比如"挑战者""狙神""堡垒卫士"）
// 注：S17 有多个"观星者:xxx"分支羁绊（泉水/女猎手/勋章/秀山/蝰蛇/圣坛/野猪），
//     它们共享主羁绊"观星者"，但各自有独立的 id 和激活节点。
export enum UnitOrigin_S17 {
    // === 主力大型羁绊（多激活节点） ===
    Admin = "法官",              // 10296 自定义律法
    AnimaSquad = "幻灵战队",     // 10299 连败经济
    Astronaut = "木灵族",        // 10301 木灵增幅
    DRX = "新星特攻队",          // 10303 能量激增
    DarkStar = "暗星",           // 10304 吞噬/变强
    Mecha = "霸天机甲",          // 10312 机甲变形
    Primordian = "海魔人",       // 10316 海洋原生
    PsyOps = "灵能特工",         // 10317 特工系
    SpaceGroove = "太空律动",    // 10324 律动节奏
    Timebreaker = "未来战士",    // 10335 时空核心

    // === 观星者系（主羁绊 + 星座分支）===
    Stargazer = "观星者",                      // 10325 主羁绊
    StargazerFountain = "观星者:泉水",          // 10326 分支-泉水（治疗）
    StargazerHuntress = "观星者:女猎手",        // 10327 分支-女猎手（标记）
    StargazerMedallion = "观星者:勋章",         // 10328 分支-勋章（伤害增幅）
    StargazerMountain = "观星者:秀山",          // 10329 分支-秀山（多属性）
    StargazerSerpent = "观星者:蝰蛇",           // 10330 分支-蝰蛇（中毒）
    StargazerShield = "观星者:圣坛",            // 10331 分支-圣坛（献祭）
    StargazerWolf = "观星者:野猪",              // 10332 分支-野猪（金币）

    // === 5费/特殊单卡独有羁绊（只有 1 级激活）===
    Blitzcrank = "汪星机器人",      // 10302 布里茨
    Fiora = "斗神",                 // 10306 菲奥娜
    Graves = "军工1号",             // 10308 格雷福斯
    Jhin = "灭星尊",                // 10310 烬
    MissFortune = "武装战姬",       // 10314 厄运小姐
    Morgana = "黑暗魔女",           // 10315 莫甘娜
    Rhaast = "救世主",              // 10320 瑞亚斯特/卡莎里克
    Shen = "暮光铁壁",              // 10321 慎
    Sona = "最高指挥官",            // 10323 娑娜
    TahmKench = "命运祭司",         // 10334 塔姆
    Vex = "末日使者",               // 10336 薇古丝
    Zed = "天煞",                   // 10337 劫
}

export enum UnitClass_S17 {
    APTrait = "魔术师",           // 10297 法强-双次施放
    ASTrait = "挑战者",           // 10298 攻速-冲刺
    Assassin = "游侠",            // 10300 遁影刺客
    Fateweaver = "织命人",        // 10305 命运编织
    Flex = "旅人",                // 10307 万能补位
    HPTank = "斗士",              // 10309 生命坦克
    Mana = "神谕",                // 10311 法力/技能流
    Melee = "狂战士",             // 10313 近战输出
    Ranged = "狙神",              // 10318 远程狙击
    ResistTank = "堡垒卫士",      // 10319 抗性坦克
    ShieldTank = "重装战士",      // 10322 护盾坦克
    Summon = "牧羊人",            // 10333 召唤系
}

/**
 * S17 羁绊详细数据 Map（key 为中文名）
 * @description
 * 数据来源：public/TFTInfo/S17/{race,job}.ts
 * - id：后端用的 raceId/jobId，与 race_color_list 的图标资源对应
 * - levels：从 race_color_list / job_color_list 的 key 提取（激活节点）
 * 
 * ⚠️ 重名冲突提示：
 * - "斗士"（S17 HPTank, id=10309）与 S16 的"斗士"（id=10220）/S4 的"斗士"（id=10272）同名不同赛季
 * - "狙神"（S17 Ranged, id=10318）与 S16 的"狙神"（id=10241）同名不同赛季
 * - "神盾使"（S4 id=10286）S17 里没有同名
 * 这些羁绊根据当前赛季切换对应的 data Map，不会在同一局游戏中混用，所以安全。
 */
export const TFT_17_TRAIT_DATA: Record<string, TraitData> = {
    // === Origins (origins) ===
    // 主力大型羁绊
    "法官": { id: "10296", name: "法官", type: "origins", levels: [2, 3] },
    "幻灵战队": { id: "10299", name: "幻灵战队", type: "origins", levels: [3, 6] },
    "木灵族": { id: "10301", name: "木灵族", type: "origins", levels: [3, 5, 7, 10] },
    "新星特攻队": { id: "10303", name: "新星特攻队", type: "origins", levels: [2, 5] },
    "暗星": { id: "10304", name: "暗星", type: "origins", levels: [2, 4, 6, 9] },
    "霸天机甲": { id: "10312", name: "霸天机甲", type: "origins", levels: [3, 4, 6] },
    "海魔人": { id: "10316", name: "海魔人", type: "origins", levels: [2, 3] },
    "灵能特工": { id: "10317", name: "灵能特工", type: "origins", levels: [2, 4] },
    "太空律动": { id: "10324", name: "太空律动", type: "origins", levels: [1, 3, 5, 7, 10] },
    "未来战士": { id: "10335", name: "未来战士", type: "origins", levels: [2, 3, 4] },

    // 观星者系（主羁绊 + 7 个星座分支）
    "观星者": { id: "10325", name: "观星者", type: "origins", levels: [3, 5, 7] },
    "观星者:泉水": { id: "10326", name: "观星者:泉水", type: "origins", levels: [3, 5] },
    "观星者:女猎手": { id: "10327", name: "观星者:女猎手", type: "origins", levels: [3, 5, 7] },
    "观星者:勋章": { id: "10328", name: "观星者:勋章", type: "origins", levels: [3] },
    "观星者:秀山": { id: "10329", name: "观星者:秀山", type: "origins", levels: [3, 4, 5, 6, 7, 8] },
    "观星者:蝰蛇": { id: "10330", name: "观星者:蝰蛇", type: "origins", levels: [3, 5, 7] },
    "观星者:圣坛": { id: "10331", name: "观星者:圣坛", type: "origins", levels: [3] },
    "观星者:野猪": { id: "10332", name: "观星者:野猪", type: "origins", levels: [3, 4, 5, 6] },

    // 5费独有羁绊（全部只有 1 级激活）
    "汪星机器人": { id: "10302", name: "汪星机器人", type: "origins", levels: [1] },
    "斗神": { id: "10306", name: "斗神", type: "origins", levels: [1] },
    "军工1号": { id: "10308", name: "军工1号", type: "origins", levels: [1] },
    "灭星尊": { id: "10310", name: "灭星尊", type: "origins", levels: [1] },
    "武装战姬": { id: "10314", name: "武装战姬", type: "origins", levels: [1] },
    "黑暗魔女": { id: "10315", name: "黑暗魔女", type: "origins", levels: [1] },
    "救世主": { id: "10320", name: "救世主", type: "origins", levels: [1] },
    "暮光铁壁": { id: "10321", name: "暮光铁壁", type: "origins", levels: [1] },
    "最高指挥官": { id: "10323", name: "最高指挥官", type: "origins", levels: [1] },
    "命运祭司": { id: "10334", name: "命运祭司", type: "origins", levels: [1] },
    "末日使者": { id: "10336", name: "末日使者", type: "origins", levels: [1] },
    "天煞": { id: "10337", name: "天煞", type: "origins", levels: [1] },

    // === Classes (classes) ===
    "魔术师": { id: "10297", name: "魔术师", type: "classes", levels: [2, 4] },
    "挑战者": { id: "10298", name: "挑战者", type: "classes", levels: [2, 3, 4, 5] },
    "游侠": { id: "10300", name: "游侠", type: "classes", levels: [2, 3, 4, 5] },
    "织命人": { id: "10305", name: "织命人", type: "classes", levels: [2, 4] },
    "旅人": { id: "10307", name: "旅人", type: "classes", levels: [2, 3, 4, 5, 6] },
    "斗士": { id: "10309", name: "斗士", type: "classes", levels: [2, 4, 6] },
    "神谕": { id: "10311", name: "神谕", type: "classes", levels: [2, 3, 4, 5] },
    "狂战士": { id: "10313", name: "狂战士", type: "classes", levels: [2, 4, 6] },
    "狙神": { id: "10318", name: "狙神", type: "classes", levels: [2, 3, 4] },
    "堡垒卫士": { id: "10319", name: "堡垒卫士", type: "classes", levels: [2, 4, 6] },
    "重装战士": { id: "10322", name: "重装战士", type: "classes", levels: [2, 4, 6] },
    "牧羊人": { id: "10333", name: "牧羊人", type: "classes", levels: [3, 5, 7] },
};

// <generated:S18-trait>
// =====================================================================================
// S18: 自然之力（虚幻客户端），由 scripts/generate_s18_chess_data.cjs 生成，请勿手改
// 来源: https://game.gtimg.cn/images/lol/act/img/tft/js/{race,job}.js（season=2026.S18 version=16.22）
// =====================================================================================
export enum UnitOrigin_S18 {
    ApexPredator = "顶级掠食者",                 // 10380 DA_18_ApexPredator
    Battlemage = "魔岩巨兽",                    // 10381 DA_18_Battlemage
    Blackthorn = "黑荆棘",                     // 10382 DA_18_Blackthorn
    Blossom = "灵魂莲华",                       // 10383 DA_18_Blossom
    Caustic = "帝王斑蝶",                       // 10385 DA_18_Caustic
    Coven = "魔女",                           // 10386 DA_18_Coven
    Eclipse = "日月双蚀",                       // 10388 DA_18_Eclipse
    Elderwood = "永恒之森",                     // 10389 DA_18_Elderwood
    Fae = "花仙子",                            // 10391 DA_18_Fae
    Greenfather = "翠神",                     // 10392 DA_18_Greenfather
    Inferno = "地狱火",                        // 10394 DA_18_Inferno
    Lunar = "月蚀骑士",                         // 10396 DA_18_Lunar
    LuxUniqueTrait = "自然之力！大元素使",           // 10397 DA_18_LuxUniqueTrait
    MaokaiUniqueTrait = "远古树精",             // 10398 DA_18_Maokai_UniqueTrait
    Rival = "宿敌",                           // 10400 DA_18_Rival
    Solar = "日蚀骑士",                         // 10402 DA_18_Solar
    Sprykin = "约德尔人和朋友",                    // 10404 DA_18_Sprykin
    ZyraUniqueTrait = "荆棘之兴",               // 10407 DA_18_ZyraUniqueTrait
    AluneUniqueTrait = "月华神女",              // 10408 DA_AluneUniqueTrait18
    DravenUniqueTrait = "赏金猎人",             // 10409 DA_DravenUniqueTrait18
    Emerald = "宝石骑士",                       // 10410 DA_Emerald18
    FloraFatalis = "绝命花妖",                  // 10411 DA_FloraFatalis18
    Primal = "野兽之灵",                        // 10413 DA_Primal18
    Riftbeast = "峡谷野怪",                     // 10414 DA_Riftbeast18
}

export enum UnitClass_S18 {
    Adaptor = "魔战士",                        // 10379 DA_18_Adaptor
    Brawler = "斗士",                         // 10384 DA_18_Brawler
    Defender = "护卫",                        // 10387 DA_18_Defender
    Executioner = "裁决使",                    // 10390 DA_18_Executioner
    Hunter = "猎人",                          // 10393 DA_18_Hunter
    Invoker = "神谕",                         // 10395 DA_18_Invoker
    Rapidfire = "迅捷射手",                     // 10399 DA_18_Rapidfire
    Slayer = "狂战士",                         // 10401 DA_18_Slayer
    Spellweaver = "法师",                     // 10403 DA_18_Spellweaver
    Summoner = "召唤师",                       // 10405 DA_18_Summoner
    Vanguard = "重装战士",                      // 10406 DA_18_Vanguard
    Juggernaut = "主宰",                      // 10412 DA_Juggernaut18
}

/**
 * S18 羁绊详细数据 Map（key 为中文名）
 * @description levels 为空表示该羁绊没有激活节点（如"日月双蚀"）
 */
export const TFT_18_TRAIT_DATA: Record<string, TraitData> = {
    "顶级掠食者": { id: "10380", name: "顶级掠食者", type: "origins", levels: [1] },
    "魔岩巨兽": { id: "10381", name: "魔岩巨兽", type: "origins", levels: [1] },
    "黑荆棘": { id: "10382", name: "黑荆棘", type: "origins", levels: [2, 4, 6] },
    "灵魂莲华": { id: "10383", name: "灵魂莲华", type: "origins", levels: [3, 5, 7, 9, 11] },
    "帝王斑蝶": { id: "10385", name: "帝王斑蝶", type: "origins", levels: [1] },
    "魔女": { id: "10386", name: "魔女", type: "origins", levels: [3, 4, 5, 7] },
    "日月双蚀": { id: "10388", name: "日月双蚀", type: "origins", levels: [] },
    "永恒之森": { id: "10389", name: "永恒之森", type: "origins", levels: [3, 5, 7, 9, 11] },
    "花仙子": { id: "10391", name: "花仙子", type: "origins", levels: [2, 4] },
    "翠神": { id: "10392", name: "翠神", type: "origins", levels: [1] },
    "地狱火": { id: "10394", name: "地狱火", type: "origins", levels: [2, 3, 5, 7] },
    "月蚀骑士": { id: "10396", name: "月蚀骑士", type: "origins", levels: [2, 3, 4, 5] },
    "自然之力！大元素使": { id: "10397", name: "自然之力！大元素使", type: "origins", levels: [1] },
    "远古树精": { id: "10398", name: "远古树精", type: "origins", levels: [1] },
    "宿敌": { id: "10400", name: "宿敌", type: "origins", levels: [1, 2] },
    "日蚀骑士": { id: "10402", name: "日蚀骑士", type: "origins", levels: [3] },
    "约德尔人和朋友": { id: "10404", name: "约德尔人和朋友", type: "origins", levels: [3, 5, 7] },
    "荆棘之兴": { id: "10407", name: "荆棘之兴", type: "origins", levels: [1] },
    "月华神女": { id: "10408", name: "月华神女", type: "origins", levels: [1] },
    "赏金猎人": { id: "10409", name: "赏金猎人", type: "origins", levels: [1] },
    "宝石骑士": { id: "10410", name: "宝石骑士", type: "origins", levels: [1] },
    "绝命花妖": { id: "10411", name: "绝命花妖", type: "origins", levels: [1, 2] },
    "野兽之灵": { id: "10413", name: "野兽之灵", type: "origins", levels: [2, 4] },
    "峡谷野怪": { id: "10414", name: "峡谷野怪", type: "origins", levels: [3, 5, 7, 10] },
    "魔战士": { id: "10379", name: "魔战士", type: "classes", levels: [2, 3, 4] },
    "斗士": { id: "10384", name: "斗士", type: "classes", levels: [2, 4, 6] },
    "护卫": { id: "10387", name: "护卫", type: "classes", levels: [2, 4, 6] },
    "裁决使": { id: "10390", name: "裁决使", type: "classes", levels: [2, 3, 4] },
    "猎人": { id: "10393", name: "猎人", type: "classes", levels: [2, 3, 4, 5] },
    "神谕": { id: "10395", name: "神谕", type: "classes", levels: [2, 3, 4, 5] },
    "迅捷射手": { id: "10399", name: "迅捷射手", type: "classes", levels: [2, 3, 4, 5] },
    "狂战士": { id: "10401", name: "狂战士", type: "classes", levels: [2, 4, 6] },
    "法师": { id: "10403", name: "法师", type: "classes", levels: [2, 4, 6] },
    "召唤师": { id: "10405", name: "召唤师", type: "classes", levels: [2, 3] },
    "重装战士": { id: "10406", name: "重装战士", type: "classes", levels: [2, 4, 6] },
    "主宰": { id: "10412", name: "主宰", type: "classes", levels: [2, 4, 6] },
};
// </generated:S18-trait>
