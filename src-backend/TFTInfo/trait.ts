//  S16:英雄联盟传奇羁绊
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