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
