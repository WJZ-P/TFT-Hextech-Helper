//  定义一下棋子相关的一些协议，包含棋子单位信息，各种位置信息和约定各种枚举值

/**
 * 游戏阶段的具体类型
 * 这里的分类决定了我们的 AI 应该采取什么策略
 */
export enum GameStageType {
    PVE = 'PVE',             // 打野怪/小兵 (Stage 1 全阶段, 以及 x-7)
    CAROUSEL = 'CAROUSEL',   // 选秀环节 (x-4)
    AUGMENT = 'AUGMENT',     // 海克斯强化选择环节 (2-1, 3-2, 4-2)
    PVP = 'PVP',             // 正常的玩家对战 (其他回合)
    UNKNOWN = 'UNKNOWN'      // 无法识别或不在游戏内
}


export enum TFTMode {
    CLASSIC = 'CLASSIC',    //  经典模式，包括匹配和排位。
    NORMAL = 'NORMAL',      //  匹配模式
    RANK = 'RANK',          //  排位模式
    CLOCKWORK_TRAILS,       //  PVE，发条鸟的试炼。
}


//  英雄购买槽坐标
import {Point} from "@nut-tree-fork/nut-js";

export const shopSlot = {
    SHOP_SLOT_1: new Point(240, 700),
    SHOP_SLOT_2: new Point(380, 700),
    SHOP_SLOT_3: new Point(520, 700),
    SHOP_SLOT_4: new Point(660, 700),
    SHOP_SLOT_5: new Point(800, 700),
}
//  英雄购买槽英雄名字Region
export const shopSlotNameRegions = {
    SLOT_1: {   // width: 108 height:18
        leftTop: {x: 173, y: 740},
        rightBottom: {x: 281, y: 758}
    },
    SLOT_2: {
        leftTop: {x: 315, y: 740},
        rightBottom: {x: 423, y: 758}
    },
    SLOT_3: {
        leftTop: {x: 459, y: 740},
        rightBottom: {x: 567, y: 758}
    },
    SLOT_4: {
        leftTop: {x: 602, y: 740},
        rightBottom: {x: 710, y: 758}
    },
    SLOT_5: {
        leftTop: {x: 746, y: 740},
        rightBottom: {x: 854, y: 758}
    },
}
//  选中英雄时，右侧英雄详情的英雄idregion，必须分毫不差以复用商店英雄名称模板！
export const detailChampionNameRegion = {
    leftTop: {x: 870, y: 226},
    rightBottom: {x: 978, y: 244},
}
//  选中英雄时，右侧查看英雄星级的
export const detailChampionStarRegion = {
    leftTop: {x: 919, y: 122},
    rightBottom: {x: 974, y: 132}
}

//  装备槽位坐标
export const equipmentSlot = {
    EQ_SLOT_1: new Point(20, 210),//+35
    EQ_SLOT_2: new Point(20, 245),
    EQ_SLOT_3: new Point(20, 280),
    EQ_SLOT_4: new Point(20, 315),
    EQ_SLOT_5: new Point(20, 350),
    EQ_SLOT_6: new Point(20, 385),
    EQ_SLOT_7: new Point(20, 430),//   这里重置下准确位置
    EQ_SLOT_8: new Point(20, 465),
    EQ_SLOT_9: new Point(20, 500),
    EQ_SLOT_10: new Point(20, 535),
}
//  装备槽位具体区域
export const equipmentRegion = {   //  宽24，高25
    SLOT_1: {                   //  y+=36
        leftTop: {x: 9, y: 198},
        rightBottom: {x: 32, y: 222}
    },
    SLOT_2: {
        leftTop: {x: 9, y: 234},
        rightBottom: {x: 32, y: 259}
    },
    SLOT_3: {
        leftTop: {x: 9, y: 271},
        rightBottom: {x: 32, y: 295}
    },
    SLOT_4: {
        leftTop: {x: 9, y: 307},
        rightBottom: {x: 32, y: 332}
    },
    SLOT_5: {
        leftTop: {x: 9, y: 344},
        rightBottom: {x: 32, y: 368}
    },
    SLOT_6: {
        leftTop: {x: 9, y: 380},
        rightBottom: {x: 32, y: 404}
    },
    SLOT_7: {
        leftTop: {x: 9, y: 417},
        rightBottom: {x: 32, y: 441}
    },
    SLOT_8: {
        leftTop: {x: 9, y: 453},
        rightBottom: {x: 32, y: 477}
    },
    SLOT_9: {
        leftTop: {x: 9, y: 490},
        rightBottom: {x: 32, y: 514}
    },
    SLOT_10: {
        leftTop: {x: 9, y: 526},
        rightBottom: {x: 32, y: 550}
    },
}
//  棋子在战场上的位置
export const fightBoardSlot = {
    // x+=80
    //  第一行的棋子位置
    R1_C1: new Point(230, 315),
    R1_C2: new Point(310, 315),
    R1_C3: new Point(390, 315),
    R1_C4: new Point(470, 315),
    R1_C5: new Point(550, 315),
    R1_C6: new Point(630, 315),
    R1_C7: new Point(710, 315),
    //  第二行的棋子位置        //  x+=85
    R2_C1: new Point(260, 370),
    R2_C2: new Point(345, 370),
    R2_C3: new Point(430, 370),
    R2_C4: new Point(515, 370),
    R2_C5: new Point(600, 370),
    R2_C6: new Point(685, 370),
    R2_C7: new Point(770, 370),
    //  第三行棋子的位置        //  x+=90
    R3_C1: new Point(200, 420),
    R3_C2: new Point(290, 420),
    R3_C3: new Point(380, 420),
    R3_C4: new Point(470, 420),
    R3_C5: new Point(560, 420),
    R3_C6: new Point(650, 420),
    R3_C7: new Point(740, 420),
    //  第四行棋子的位置        //  x+=90
    R4_C1: new Point(240, 475),
    R4_C2: new Point(330, 475),
    R4_C3: new Point(420, 475),
    R4_C4: new Point(510, 475),
    R4_C5: new Point(600, 475),
    R4_C6: new Point(690, 475),
    R4_C7: new Point(780, 475),
}
//  备战席
export const benchSlotPoints = { //  x+=75
    SLOT_1: new Point(135, 555),
    SLOT_2: new Point(210, 555),
    SLOT_3: new Point(285, 555),
    SLOT_4: new Point(360, 555),
    SLOT_5: new Point(435, 555),
    SLOT_6: new Point(510, 555),
    SLOT_7: new Point(585, 555),
    SLOT_8: new Point(660, 555),
    SLOT_9: new Point(735, 555),
    SLOT_10: new Point(810, 555),
}
//  海克斯选择槽位
export const hexSlot = {   //  x+=295
    SLOT_1: new Point(215, 410),
    SLOT_2: new Point(510, 410),
    SLOT_3: new Point(805, 410),
}
//  选秀站位，为离自己最近的棋子位置。
export const sharedDraftPoint = {x: 530, y: 400}
//  游戏战斗阶段展示坐标，第一阶段。因为第一阶段只有四个回合，跟其他阶段的不一样。
export const gameStageDisplayStageOne = {
    leftTop: {x: 411, y: 6},
    rightBottom: {x: 442, y: 22}
}
//  游戏战斗阶段展示坐标，从2-1开始。
export const gameStageDisplayNormal = {
    leftTop: {x: 374, y: 6},
    rightBottom: {x: 403, y: 22}
}
//  发条鸟的战斗阶段，布局跟其他的都不一样，因为发条鸟一个大阶段有10场
export const gameStageDisplayTheClockworkTrails = {
    leftTop: {x: 337, y: 6},
    rightBottom: {x: 366, y: 22}
}


//  棋子类型接口
export interface TFTUnit {
    displayName: string;                //  棋子的英雄名称，用于ocr
    price: number;                       //  棋子的购买花费
    traits: (UnitOrigin | UnitClass)[]; //  棋子所属羁绊，含种族和职业
    origins: UnitOrigin[];              //  棋子种族
    classes: UnitClass[];               //  棋子职业
}

//  装备类型接口
export interface TFTEquip {
    name: string;               //  中文名
    englishName: string;        //  英文名，基本对应图片名字，方便检索
    equipId: string;            //  装备ID
    formula: string;            // 合成公式，例如 "501,502"
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
export const TFT_15_CHAMPION_DATA: Record<string, TFTUnit> = {
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

const specialEquip: Record<string, TFTEquip> = {
    //  特殊类型的装备，比如装备拆卸器，强化果实等
    "强化果实": {
        name: "强化果实",
        englishName: "TFT_Item_PowerSnax",
        equipId: "-1",  //  不知道装备ID
        formula: ""
    },
    "装备拆卸器": {
        name: "强化果实",
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
        name: "微型英雄复制器",
        englishName: "TFT_Item_Reforger",
        equipId: "-1",  //  不知道装备ID
        formula: ""
    },
}

export const TFT_15_EQUIP_DATA: Record<string, TFTEquip> = {
    //  特殊类型的装备
    ...specialEquip,

    // ==========================================
    // Type 1: 基础散件 (Base Items)
    // ==========================================
    "暴风大剑": {
        name: "暴风大剑",
        englishName: "TFT_Item_BFSword",
        equipId: "501",
        formula: ""
    },
    "反曲之弓": {
        name: "反曲之弓",
        englishName: "TFT_Item_RecurveBow",
        equipId: "502",
        formula: ""
    },
    "无用大棒": {
        name: "无用大棒",
        englishName: "TFT_Item_NeedlesslyLargeRod",
        equipId: "503",
        formula: ""
    },
    "女神之泪": {
        name: "女神之泪",
        englishName: "TFT_Item_TearOfTheGoddess",
        equipId: "504",
        formula: ""
    },
    "锁子甲": {
        name: "锁子甲",
        englishName: "TFT_Item_ChainVest",
        equipId: "505",
        formula: ""
    },
    "负极斗篷": {
        name: "负极斗篷",
        englishName: "TFT_Item_NegatronCloak",
        equipId: "506",
        formula: ""
    },
    "巨人腰带": {
        name: "巨人腰带",
        englishName: "TFT_Item_GiantsBelt",
        equipId: "507",
        formula: ""
    },
    "金铲铲": {
        name: "金铲铲",
        englishName: "TFT_Item_Spatula",
        equipId: "508",
        formula: ""
    },
    "拳套": {
        name: "拳套",
        englishName: "TFT_Item_SparringGloves",
        equipId: "509",
        formula: ""
    },
    "金锅锅": {
        name: "金锅锅",
        englishName: "TFT_Item_FryingPan",
        equipId: "91163",
        formula: ""
    },

    // ==========================================
    // Type 2: S15 赛季纹章 (Set 15 Emblems)
    // ==========================================
    // 金锅锅 (91163) 系列合成
    "护卫纹章": {
        name: "护卫纹章",
        englishName: "TFT15_Item_BastionEmblemItem",
        equipId: "91292",
        formula: "91163,505" // 金锅锅 + 锁子甲
    },
    "决斗大师纹章": {
        name: "决斗大师纹章",
        englishName: "TFT15_Item_ChallengerEmblemItem",
        equipId: "91294",
        formula: "91163,502" // 金锅锅 + 反曲之弓
    },
    "裁决使者纹章": {
        name: "裁决使者纹章",
        englishName: "TFT15_Item_DestroyerEmblemItem",
        equipId: "91295",
        formula: "91163,509" // 金锅锅 + 拳套
    },
    "刀锋领主纹章": {
        name: "刀锋领主纹章",
        englishName: "TFT15_Item_EdgelordEmblemItem",
        equipId: "91296",
        formula: "91163,501" // 金锅锅 + 暴风大剑
    },
    "重量级斗士纹章": {
        name: "重量级斗士纹章",
        englishName: "TFT15_Item_HeavyweightEmblemItem",
        equipId: "91300",
        formula: "91163,507" // 金锅锅 + 巨人腰带
    },
    "法师纹章": {
        name: "法师纹章",
        englishName: "TFT15_Item_SpellslingerEmblemItem",
        equipId: "91301",
        formula: "91163,503" // 金锅锅 + 无用大棒
    },
    "天才纹章": {
        name: "天才纹章",
        englishName: "TFT15_Item_ProdigyEmblemItem",
        equipId: "91302",
        formula: "91163,504" // 金锅锅 + 女神之泪
    },
    "主宰纹章": {
        name: "主宰纹章",
        englishName: "TFT15_Item_JuggernautEmblemItem",
        equipId: "91304",
        formula: "91163,506" // 金锅锅 + 负极斗篷
    },
    "金锅铲冠冕": {
        name: "金锅铲冠冕",
        englishName: "TFT_Item_TacticiansRing",
        equipId: "91164",
        formula: "91163,508" // 金锅锅 + 金铲铲
    },
    "金锅锅冠冕": {
        name: "金锅锅冠冕",
        englishName: "TFT_Item_TacticiansScepter",
        equipId: "91165",
        formula: "91163,91163" // 金锅锅 + 金锅锅
    },

    // 金铲铲 (508) 系列合成
    "战斗学院纹章": {
        name: "战斗学院纹章",
        englishName: "TFT15_Item_BattleAcademiaEmblemItem",
        equipId: "91293",
        formula: "508,504" // 金铲铲 + 女神之泪
    },
    "至高天纹章": {
        name: "至高天纹章",
        englishName: "TFT15_Item_EmpyreanEmblemItem",
        equipId: "91297",
        formula: "508,505" // 金铲铲 + 锁子甲
    },
    "假面摔角手纹章": {
        name: "假面摔角手纹章",
        englishName: "TFT15_Item_RingKingsEmblemItem",
        equipId: "91298",
        formula: "508,509" // 金铲铲 + 拳套
    },
    "水晶玫瑰纹章": {
        name: "水晶玫瑰纹章",
        englishName: "TFT15_Item_CrystalRoseEmblemItem",
        equipId: "91299",
        formula: "508,507" // 金铲铲 + 巨人腰带
    },
    "斗魂战士纹章": {
        name: "斗魂战士纹章",
        englishName: "TFT15_Item_SoulFighterEmblemItem",
        equipId: "91305",
        formula: "508,501" // 金铲铲 + 暴风大剑
    },
    "星之守护者纹章": {
        name: "星之守护者纹章",
        englishName: "TFT15_Item_StarGuardianEmblemItem",
        equipId: "91306",
        formula: "508,503" // 金铲铲 + 无用大棒
    },
    "兵王纹章": {
        name: "兵王纹章",
        englishName: "TFT15_Item_SupremeCellsEmblemItem",
        equipId: "91307",
        formula: "508,502" // 金铲铲 + 反曲之弓
    },
    "司令纹章": {
        name: "司令纹章",
        englishName: "TFT15_Item_ShotcallerEmblemItem",
        equipId: "91309",
        formula: "508,506" // 金铲铲 + 负极斗篷
    },
    "金铲铲冠冕": {
        name: "金铲铲冠冕",
        englishName: "TFT_Item_ForceOfNature",
        equipId: "603",
        formula: "508,508" // 金铲铲 + 金铲铲
    },

    // ==========================================
    // Type 2: 常驻合成成装 (Standard Craftable Items)
    // ==========================================
    "死亡之刃": {
        name: "死亡之刃",
        englishName: "TFT_Item_Deathblade",
        equipId: "519",
        formula: "501,501"
    },
    "巨人杀手": {
        name: "巨人杀手",
        englishName: "TFT_Item_MadredsBloodrazor",
        equipId: "521",
        formula: "501,502"
    },
    "海克斯科技枪刃": {
        name: "海克斯科技枪刃",
        englishName: "TFT_Item_HextechGunblade",
        equipId: "523",
        formula: "501,503"
    },
    "朔极之矛": {
        name: "朔极之矛",
        englishName: "TFT_Item_SpearOfShojin",
        equipId: "525",
        formula: "501,504"
    },
    "夜之锋刃": {
        name: "夜之锋刃",
        englishName: "TFT_Item_GuardianAngel",
        equipId: "6022",
        formula: "501,505"
    },
    "饮血剑": {
        name: "饮血剑",
        englishName: "TFT_Item_Bloodthirster",
        equipId: "529",
        formula: "501,506"
    },
    "斯特拉克的挑战护手": {
        name: "斯特拉克的挑战护手",
        englishName: "TFT_Item_SteraksGage",
        equipId: "1001",
        formula: "501,507"
    },
    "无尽之刃": {
        name: "无尽之刃",
        englishName: "TFT_Item_InfinityEdge",
        equipId: "535",
        formula: "501,509"
    },
    "红霸符": {
        name: "红霸符",
        englishName: "TFT_Item_RapidFireCannon",
        equipId: "1007",
        formula: "502,502"
    },
    "鬼索的狂暴之刃": {
        name: "鬼索的狂暴之刃",
        englishName: "TFT_Item_GuinsoosRageblade",
        equipId: "539",
        formula: "502,503"
    },
    "斯塔缇克电刃": {
        name: "斯塔缇克电刃",
        englishName: "TFT_Item_StatikkShiv",
        equipId: "541",
        formula: "502,504"
    },
    "泰坦的坚决": {
        name: "泰坦的坚决",
        englishName: "TFT_Item_TitansResolve",
        equipId: "543",
        formula: "502,505"
    },
    "卢安娜的飓风": {
        name: "卢安娜的飓风",
        englishName: "TFT_Item_RunaansHurricane",
        equipId: "545",
        formula: "502,506"
    },
    "纳什之牙": {
        name: "纳什之牙",
        englishName: "TFT_Item_Leviathan",
        equipId: "547",
        formula: "502,507"
    },
    "最后的轻语": {
        name: "最后的轻语",
        englishName: "TFT_Item_LastWhisper",
        equipId: "551",
        formula: "502,509"
    },
    "灭世者的死亡之帽": {
        name: "灭世者的死亡之帽",
        englishName: "TFT_Item_RabadonsDeathcap",
        equipId: "553",
        formula: "503,503"
    },
    "大天使之杖": {
        name: "大天使之杖",
        englishName: "TFT_Item_ArchangelsStaff",
        equipId: "555",
        formula: "503,504"
    },
    "冕卫": {
        name: "冕卫",
        englishName: "TFT_Item_Crownguard",
        equipId: "1003",
        formula: "503,505"
    },
    "离子火花": {
        name: "离子火花",
        englishName: "TFT_Item_IonicSpark",
        equipId: "559",
        formula: "503,506"
    },
    "莫雷洛秘典": {
        name: "莫雷洛秘典",
        englishName: "TFT_Item_Morellonomicon",
        equipId: "561",
        formula: "503,507"
    },
    "珠光护手": {
        name: "珠光护手",
        englishName: "TFT_Item_JeweledGauntlet",
        equipId: "565",
        formula: "503,509"
    },
    "蓝霸符": {
        name: "蓝霸符",
        englishName: "TFT_Item_BlueBuff",
        equipId: "567",
        formula: "504,504"
    },
    "圣盾使的誓约": {
        name: "圣盾使的誓约",
        englishName: "TFT_Item_FrozenHeart",
        equipId: "7034",
        formula: "505,504"
    },
    "棘刺背心": {
        name: "棘刺背心",
        englishName: "TFT_Item_BrambleVest",
        equipId: "579",
        formula: "505,505"
    },
    "石像鬼石板甲": {
        name: "石像鬼石板甲",
        englishName: "TFT_Item_GargoyleStoneplate",
        equipId: "581",
        formula: "505,506"
    },
    "日炎斗篷": {
        name: "日炎斗篷",
        englishName: "TFT_Item_RedBuff",
        equipId: "583",
        formula: "507,505"
    },
    "坚定之心": {
        name: "坚定之心",
        englishName: "TFT_Item_NightHarvester",
        equipId: "1009",
        formula: "505,509"
    },
    "巨龙之爪": {
        name: "巨龙之爪",
        englishName: "TFT_Item_DragonsClaw",
        equipId: "589",
        formula: "506,506"
    },
    "适应性头盔": {
        name: "适应性头盔",
        englishName: "TFT_Item_AdaptiveHelm",
        equipId: "1004",
        formula: "504,506"
    },
    "薄暮法袍": {
        name: "薄暮法袍",
        englishName: "TFT_Item_SpectralGauntlet",
        equipId: "1006",
        formula: "507,506"
    },
    "水银": {
        name: "水银",
        englishName: "TFT_Item_Quicksilver",
        equipId: "595",
        formula: "506,509"
    },
    "救赎": {
        name: "救赎",
        englishName: "TFT_Item_Redemption",
        equipId: "573",
        formula: "507,504"
    },
    "狂徒铠甲": {
        name: "狂徒铠甲",
        englishName: "TFT_Item_WarmogsArmor",
        equipId: "597",
        formula: "507,507"
    },
    "强袭者的链枷": {
        name: "强袭者的链枷",
        englishName: "TFT_Item_PowerGauntlet",
        equipId: "801",
        formula: "507,509"
    },
    "正义之手": {
        name: "正义之手",
        englishName: "TFT_Item_UnstableConcoction",
        equipId: "577",
        formula: "509,504"
    },
    "窃贼手套": {
        name: "窃贼手套",
        englishName: "TFT_Item_ThiefsGloves",
        equipId: "607",
        formula: "509,509"
    }
};