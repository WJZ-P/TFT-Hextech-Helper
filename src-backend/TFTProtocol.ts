//  定义一下棋子相关的一些协议。

//  棋子类型接口
export interface TFTUnit {
    displayName: string;                //  棋子的英雄名称，用于ocr
    price: number;                       //  棋子的购买花费
    traits:  (UnitOrigin | UnitClass)[]; //  棋子所属羁绊，含种族和职业
    origins: UnitOrigin[];              //  棋子种族
    classes: UnitClass[];               //  棋子职业
}

//  所有Origins，棋子种族.方便起见用中文比较好
export enum UnitOrigin {
    BattleAcademia = "战斗学院",
    CrystalGambit = "水晶玫瑰",
    Luchador = "假面摔跤手",
    Mentor = "大宗师",
    MightyMech = "超级战队",
    MonsterTrainer = "小怪兽训练师",
    RogueCaptain = "卡牌大师",
    Rosemother = "荆棘之兴",
    SoulFighter = "斗魂战士",
    StanceMaster = "龙的传人",
    StarGuardian = "星之守护者",
    SupremeCells = "兵王",
    TheChamp = "布隆之心",
    TheCrew = "奥德赛",
    Wraith = "至高天",
}

//  所有class，棋子职业
export enum UnitClass {
    Bastion = "护卫",
    Duelist = "决斗大师",
    Edgelord = "刀锋领主",
    Executioner = "裁决使者",
    Heavyweight = "重量级斗士",
    Juggernaut = "主宰",
    Prodigy = "天才",
    Protector = "圣盾使",
    Sniper = "狙神",
    Sorcerer = "法师",
    Strategist = "司令",
}

//  S15赛季所有单位，包括英雄、召唤物什么的
export const TFT_15_CHAMPION_DATA = {
    "亚托克斯": {
        displayName: "亚托克斯",
        price: 1,
        traits: [UnitOrigin.MightyMech, UnitClass.Juggernaut, UnitClass.Heavyweight],
        origins: [UnitOrigin.MightyMech],
        classes: [UnitClass.Juggernaut, UnitClass.Heavyweight]
    },
    "阿狸": {
        displayName: "阿狸",
        price: 3,
        traits: [UnitOrigin.StarGuardian, UnitClass.Sorcerer],
        origins: [UnitOrigin.StarGuardian],
        classes: [UnitClass.Sorcerer]
    },
    "阿卡丽": {
        displayName: "阿卡丽",
        price: 4,
        traits: [UnitOrigin.SupremeCells, UnitClass.Executioner],
        origins: [UnitOrigin.SupremeCells],
        classes: [UnitClass.Executioner]
    },
    "艾希": {
        displayName: "艾希",
        price: 4,
        traits: [UnitOrigin.CrystalGambit, UnitClass.Duelist],
        origins: [UnitOrigin.CrystalGambit],
        classes: [UnitClass.Duelist]
    },
    "布隆": {
        displayName: "布隆",
        price: 5,
        traits: [UnitOrigin.TheChamp, UnitOrigin.Luchador, UnitClass.Bastion],
        origins: [UnitOrigin.TheChamp, UnitOrigin.Luchador],
        classes: [UnitClass.Bastion]
    },
    "凯特琳": {
        displayName: "凯特琳",
        price: 3,
        traits: [UnitOrigin.BattleAcademia, UnitClass.Sniper],
        origins: [UnitOrigin.BattleAcademia],
        classes: [UnitClass.Sniper]
    },
    "德莱厄斯": {
        displayName: "德莱厄斯",
        price: 3,
        traits: [UnitOrigin.SupremeCells, UnitClass.Heavyweight],
        origins: [UnitOrigin.SupremeCells],
        classes: [UnitClass.Heavyweight]
    },
    "蒙多医生": {
        displayName: "蒙多医生",
        price: 2,
        traits: [UnitOrigin.Luchador, UnitClass.Juggernaut],
        origins: [UnitOrigin.Luchador],
        classes: [UnitClass.Juggernaut]
    },
    "艾克": {
        displayName: "艾克",
        price: 0,
        traits: [],
        origins: [],
        classes: []
    },
    "伊泽瑞尔": {
        displayName: "伊泽瑞尔",
        price: 1,
        traits: [UnitOrigin.BattleAcademia, UnitClass.Prodigy],
        origins: [UnitOrigin.BattleAcademia],
        classes: [UnitClass.Prodigy]
    },
    "超级机甲": {
        displayName: "超级机甲",
        price: 0,
        traits: [],
        origins: [],
        classes: []
    },
    "普朗克": {
        displayName: "普朗克",
        price: 2,
        traits: [UnitOrigin.MightyMech, UnitClass.Duelist],
        origins: [UnitOrigin.MightyMech],
        classes: [UnitClass.Duelist]
    },
    "盖伦": {
        displayName: "盖伦",
        price: 1,
        traits: [UnitOrigin.BattleAcademia, UnitClass.Bastion],
        origins: [UnitOrigin.BattleAcademia],
        classes: [UnitClass.Bastion]
    },
    "纳尔": {
        displayName: "纳尔",
        price: 1,
        traits: [UnitOrigin.Luchador, UnitClass.Sniper],
        origins: [UnitOrigin.Luchador],
        classes: [UnitClass.Sniper]
    },
    "格温": {
        displayName: "格温",
        price: 5,
        traits: [UnitOrigin.SoulFighter, UnitClass.Sorcerer],
        origins: [UnitOrigin.SoulFighter],
        classes: [UnitClass.Sorcerer]
    },
    "迦娜": {
        displayName: "迦娜",
        price: 2,
        traits: [UnitOrigin.CrystalGambit, UnitClass.Protector, UnitClass.Strategist],
        origins: [UnitOrigin.CrystalGambit],
        classes: [UnitClass.Protector, UnitClass.Strategist]
    },
    "嘉文四世": {
        displayName: "嘉文四世",
        price: 4,
        traits: [UnitOrigin.MightyMech, UnitClass.Strategist],
        origins: [UnitOrigin.MightyMech],
        classes: [UnitClass.Strategist]
    },
    "杰斯": {
        displayName: "杰斯",
        price: 3,
        traits: [UnitOrigin.BattleAcademia, UnitClass.Heavyweight],
        origins: [UnitOrigin.BattleAcademia],
        classes: [UnitClass.Heavyweight]
    },
    "烬": {
        displayName: "烬",
        price: 2,
        traits: [UnitOrigin.Wraith, UnitClass.Sniper],
        origins: [UnitOrigin.Wraith],
        classes: [UnitClass.Sniper]
    },
    "金克丝": {
        displayName: "金克丝",
        price: 4,
        traits: [UnitOrigin.StarGuardian, UnitClass.Sniper],
        origins: [UnitOrigin.StarGuardian],
        classes: [UnitClass.Sniper]
    },
    "卡莎": {
        displayName: "卡莎",
        price: 2,
        traits: [UnitOrigin.SupremeCells, UnitClass.Duelist],
        origins: [UnitOrigin.SupremeCells],
        classes: [UnitClass.Duelist]
    },
    "卡莉丝塔": {
        displayName: "卡莉丝塔",
        price: 1,
        traits: [UnitOrigin.SoulFighter, UnitClass.Executioner],
        origins: [UnitOrigin.SoulFighter],
        classes: [UnitClass.Executioner]
    },
    "卡尔玛": {
        displayName: "卡尔玛",
        price: 4,
        traits: [UnitOrigin.MightyMech, UnitClass.Sorcerer],
        origins: [UnitOrigin.MightyMech],
        classes: [UnitClass.Sorcerer]
    },
    "卡特琳娜": {
        displayName: "卡特琳娜",
        price: 2,
        traits: [UnitOrigin.BattleAcademia, UnitClass.Executioner],
        origins: [UnitOrigin.BattleAcademia],
        classes: [UnitClass.Executioner]
    },
    "凯尔": {
        displayName: "凯尔",
        price: 1,
        traits: [UnitOrigin.Wraith, UnitClass.Duelist],
        origins: [UnitOrigin.Wraith],
        classes: [UnitClass.Duelist]
    },
    "凯南": {
        displayName: "凯南",
        price: 1,
        traits: [UnitOrigin.SupremeCells, UnitClass.Protector, UnitClass.Sorcerer],
        origins: [UnitOrigin.SupremeCells],
        classes: [UnitClass.Protector, UnitClass.Sorcerer]
    },
    "可酷伯": {
        displayName: "可酷伯",
        price: 2,
        traits: [UnitOrigin.Mentor, UnitClass.Heavyweight],
        origins: [UnitOrigin.Mentor],
        classes: [UnitClass.Heavyweight]
    },
    "克格莫": {
        displayName: "克格莫",
        price: 3,
        traits: [UnitOrigin.MonsterTrainer],
        origins: [UnitOrigin.MonsterTrainer],
        classes: []
    },
    "奎桑提": {
        displayName: "奎桑提",
        price: 4,
        traits: [UnitOrigin.Wraith, UnitClass.Protector],
        origins: [UnitOrigin.Wraith],
        classes: [UnitClass.Protector]
    },
    "李青": {
        displayName: "李青",
        price: 5,
        traits: [UnitOrigin.StanceMaster],
        origins: [UnitOrigin.StanceMaster],
        classes: []
    },
    "李青-裁决使者": {
        displayName: "李青-裁决使者",
        price: 5,
        traits: [UnitOrigin.StanceMaster, UnitClass.Executioner],
        origins: [UnitOrigin.StanceMaster],
        classes: [UnitClass.Executioner]
    },
    "李青-决斗大师": {
        displayName: "李青-决斗大师",
        price: 5,
        traits: [UnitOrigin.StanceMaster, UnitClass.Duelist],
        origins: [UnitOrigin.StanceMaster],
        classes: [UnitClass.Duelist]
    },
    "李青-主宰": {
        displayName: "李青-主宰",
        price: 5,
        traits: [UnitOrigin.StanceMaster, UnitClass.Juggernaut],
        origins: [UnitOrigin.StanceMaster],
        classes: [UnitClass.Juggernaut]
    },
    "蕾欧娜": {
        displayName: "蕾欧娜",
        price: 4,
        traits: [UnitOrigin.BattleAcademia, UnitClass.Bastion],
        origins: [UnitOrigin.BattleAcademia],
        classes: [UnitClass.Bastion]
    },
    "卢锡安": {
        displayName: "卢锡安",
        price: 1,
        traits: [UnitOrigin.MightyMech, UnitClass.Sorcerer],
        origins: [UnitOrigin.MightyMech],
        classes: [UnitClass.Sorcerer]
    },
    "璐璐": {
        displayName: "璐璐",
        price: 3,
        traits: [UnitOrigin.MonsterTrainer],
        origins: [UnitOrigin.MonsterTrainer],
        classes: []
    },
    "拉克丝": {
        displayName: "拉克丝",
        price: 2,
        traits: [UnitOrigin.SoulFighter, UnitClass.Sorcerer],
        origins: [UnitOrigin.SoulFighter],
        classes: [UnitClass.Sorcerer]
    },
    "墨菲特": {
        displayName: "墨菲特",
        price: 1,
        traits: [UnitOrigin.TheCrew, UnitClass.Protector],
        origins: [UnitOrigin.TheCrew],
        classes: [UnitClass.Protector]
    },
    "玛尔扎哈": {
        displayName: "玛尔扎哈",
        price: 3,
        traits: [UnitOrigin.Wraith, UnitClass.Prodigy],
        origins: [UnitOrigin.Wraith],
        classes: [UnitClass.Prodigy]
    },
    "纳亚菲利": {
        displayName: "纳亚菲利",
        price: 1,
        traits: [UnitOrigin.SoulFighter, UnitClass.Juggernaut],
        origins: [UnitOrigin.SoulFighter],
        classes: [UnitClass.Juggernaut]
    },
    "妮蔻": {
        displayName: "妮蔻",
        price: 3,
        traits: [UnitOrigin.StarGuardian, UnitClass.Protector],
        origins: [UnitOrigin.StarGuardian],
        classes: [UnitClass.Protector]
    },
    "波比": {
        displayName: "波比",
        price: 4,
        traits: [UnitOrigin.StarGuardian, UnitClass.Heavyweight],
        origins: [UnitOrigin.StarGuardian],
        classes: [UnitClass.Heavyweight]
    },
    "洛": {
        displayName: "洛",
        price: 2,
        traits: [UnitOrigin.BattleAcademia, UnitClass.Protector],
        origins: [UnitOrigin.BattleAcademia],
        classes: [UnitClass.Protector]
    },
    "拉莫斯": {
        displayName: "拉莫斯",
        price: 3,
        traits: [UnitOrigin.MonsterTrainer],
        origins: [UnitOrigin.MonsterTrainer],
        classes: []
    },
    "芮尔": {
        displayName: "芮尔",
        price: 1,
        traits: [UnitOrigin.StarGuardian, UnitClass.Bastion],
        origins: [UnitOrigin.StarGuardian],
        classes: [UnitClass.Bastion]
    },
    "瑞兹": {
        displayName: "瑞兹",
        price: 4,
        traits: [UnitOrigin.Mentor, UnitClass.Executioner, UnitClass.Strategist],
        origins: [UnitOrigin.Mentor],
        classes: [UnitClass.Executioner, UnitClass.Strategist]
    },
    "莎弥拉": {
        displayName: "莎弥拉",
        price: 4,
        traits: [UnitOrigin.SoulFighter, UnitClass.Edgelord],
        origins: [UnitOrigin.SoulFighter],
        classes: [UnitClass.Edgelord]
    },
    "赛娜": {
        displayName: "赛娜",
        price: 3,
        traits: [UnitOrigin.MightyMech, UnitClass.Executioner],
        origins: [UnitOrigin.MightyMech],
        classes: [UnitClass.Executioner]
    },
    "萨勒芬妮": {
        displayName: "萨勒芬妮",
        price: 5,
        traits: [UnitOrigin.StarGuardian, UnitClass.Prodigy],
        origins: [UnitOrigin.StarGuardian],
        classes: [UnitClass.Prodigy]
    },
    "瑟提": {
        displayName: "瑟提",
        price: 4,
        traits: [UnitOrigin.SoulFighter, UnitClass.Juggernaut],
        origins: [UnitOrigin.SoulFighter],
        classes: [UnitClass.Juggernaut]
    },
    "慎": {
        displayName: "慎",
        price: 2,
        traits: [UnitOrigin.TheCrew, UnitClass.Bastion, UnitClass.Edgelord],
        origins: [UnitOrigin.TheCrew],
        classes: [UnitClass.Bastion, UnitClass.Edgelord]
    },
    "希维尔": {
        displayName: "希维尔",
        price: 1,
        traits: [UnitOrigin.TheCrew, UnitClass.Sniper],
        origins: [UnitOrigin.TheCrew],
        classes: [UnitClass.Sniper]
    },
    "斯莫德": {
        displayName: "斯莫德",
        price: 3,
        traits: [UnitOrigin.MonsterTrainer],
        origins: [UnitOrigin.MonsterTrainer],
        classes: []
    },
    "斯维因": {
        displayName: "斯维因",
        price: 3,
        traits: [UnitOrigin.CrystalGambit, UnitClass.Bastion, UnitClass.Sorcerer],
        origins: [UnitOrigin.CrystalGambit],
        classes: [UnitClass.Bastion, UnitClass.Sorcerer]
    },
    "辛德拉": {
        displayName: "辛德拉",
        price: 1,
        traits: [UnitOrigin.CrystalGambit, UnitOrigin.StarGuardian, UnitClass.Prodigy],
        origins: [UnitOrigin.CrystalGambit, UnitOrigin.StarGuardian],
        classes: [UnitClass.Prodigy]
    },
    "崔斯特": {
        displayName: "崔斯特",
        price: 5,
        traits: [UnitOrigin.RogueCaptain, UnitOrigin.TheCrew],
        origins: [UnitOrigin.RogueCaptain, UnitOrigin.TheCrew],
        classes: []
    },
    "乌迪尔": {
        displayName: "乌迪尔",
        price: 3,
        traits: [UnitOrigin.Mentor, UnitClass.Juggernaut, UnitClass.Duelist],
        origins: [UnitOrigin.Mentor],
        classes: [UnitClass.Juggernaut, UnitClass.Duelist]
    },
    "韦鲁斯": {
        displayName: "韦鲁斯",
        price: 5,
        traits: [UnitOrigin.Wraith, UnitClass.Sniper],
        origins: [UnitOrigin.Wraith],
        classes: [UnitClass.Sniper]
    },
    "蔚": {
        displayName: "蔚",
        price: 2,
        traits: [UnitOrigin.CrystalGambit, UnitClass.Juggernaut],
        origins: [UnitOrigin.CrystalGambit],
        classes: [UnitClass.Juggernaut]
    },
    "佛耶戈": {
        displayName: "佛耶戈",
        price: 3,
        traits: [UnitOrigin.SoulFighter, UnitClass.Duelist],
        origins: [UnitOrigin.SoulFighter],
        classes: [UnitClass.Duelist]
    },
    "沃利贝尔": {
        displayName: "沃利贝尔",
        price: 4,
        traits: [UnitOrigin.Luchador, UnitClass.Edgelord],
        origins: [UnitOrigin.Luchador],
        classes: [UnitClass.Edgelord]
    },
    "霞": {
        displayName: "霞",
        price: 2,
        traits: [UnitOrigin.StarGuardian, UnitClass.Edgelord],
        origins: [UnitOrigin.StarGuardian],
        classes: [UnitClass.Edgelord]
    },
    "赵信": {
        displayName: "赵信",
        price: 2,
        traits: [UnitOrigin.SoulFighter, UnitClass.Bastion],
        origins: [UnitOrigin.SoulFighter],
        classes: [UnitClass.Bastion]
    },
    "亚索": {
        displayName: "亚索",
        price: 3,
        traits: [UnitOrigin.Mentor, UnitClass.Edgelord],
        origins: [UnitOrigin.Mentor],
        classes: [UnitClass.Edgelord]
    },
    "永恩": {
        displayName: "永恩",
        price: 5,
        traits: [UnitOrigin.MightyMech, UnitClass.Edgelord],
        origins: [UnitOrigin.MightyMech],
        classes: [UnitClass.Edgelord]
    },
    "悠米": {
        displayName: "悠米",
        price: 4,
        traits: [UnitOrigin.BattleAcademia, UnitClass.Prodigy],
        origins: [UnitOrigin.BattleAcademia],
        classes: [UnitClass.Prodigy]
    },
    "扎克": {
        displayName: "扎克",
        price: 1,
        traits: [UnitOrigin.Wraith, UnitClass.Heavyweight],
        origins: [UnitOrigin.Wraith],
        classes: [UnitClass.Heavyweight]
    },
    "吉格斯": {
        displayName: "吉格斯",
        price: 3,
        traits: [UnitOrigin.TheCrew, UnitClass.Strategist],
        origins: [UnitOrigin.TheCrew],
        classes: [UnitClass.Strategist]
    },
    "婕拉": {
        displayName: "婕拉",
        price: 5,
        traits: [UnitOrigin.CrystalGambit, UnitOrigin.Rosemother],
        origins: [UnitOrigin.CrystalGambit, UnitOrigin.Rosemother],
        classes: []
    },
    "缠绕之根": {
        displayName: "缠绕之根",
        price: 0,
        traits: [],
        origins: [],
        classes: []
    },
    "致命棘刺": {
        displayName: "致命棘刺",
        price: 0,
        traits: [],
        origins: [],
        classes: []
    },
};