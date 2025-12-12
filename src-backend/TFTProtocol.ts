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
        rightBottom: {x: 32, y: 258}
    },
    SLOT_3: {
        leftTop: {x: 9, y: 271},
        rightBottom: {x: 32, y: 295}
    },
    SLOT_4: {
        leftTop: {x: 9, y: 307},
        rightBottom: {x: 32, y: 331}
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
export const benchSlotPoints = {
    SLOT_1: new Point(135, 555),
    SLOT_2: new Point(210, 555),
    SLOT_3: new Point(295, 555),
    SLOT_4: new Point(385, 555),
    SLOT_5: new Point(465, 555),
    SLOT_6: new Point(550, 555),
    SLOT_7: new Point(630, 555),
    SLOT_8: new Point(720, 555),
    SLOT_9: new Point(800, 555),
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
//  S16 赛季更新 (基于 race.ts 中的 TFT_16_RACE)
export enum UnitOrigin {
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

//  所有class，棋子职业
//  S16 赛季更新 (基于 job.ts 中的 TFT_16_CHESS [实际包含职业数据])
export enum UnitClass {
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

const _TFT_16_CHAMPION_DATA = {
    // 1 费棋子
    "俄洛伊": {
        displayName: "俄洛伊",
        price: 1,
        traits: [UnitOrigin.Bilgewater, UnitClass.Bruiser],
        origins: [UnitOrigin.Bilgewater],
        classes: [UnitClass.Bruiser]
    },
    "贝蕾亚": {
        displayName: "贝蕾亚",
        price: 1,
        traits: [UnitOrigin.Noxus, UnitClass.Slayer, UnitClass.Juggernaut],
        origins: [UnitOrigin.Noxus],
        classes: [UnitClass.Slayer, UnitClass.Juggernaut]
    },
    "艾尼维亚": {
        displayName: "艾尼维亚",
        price: 1,
        traits: [UnitOrigin.Freljord, UnitClass.Invoker],
        origins: [UnitOrigin.Freljord],
        classes: [UnitClass.Invoker]
    },
    "嘉文四世": {
        displayName: "嘉文四世",
        price: 1,
        traits: [UnitOrigin.Demacia, UnitClass.Defender],
        origins: [UnitOrigin.Demacia],
        classes: [UnitClass.Defender]
    },
    "烬": {
        displayName: "烬",
        price: 1,
        traits: [UnitOrigin.Ionia, UnitClass.Gunslinger],
        origins: [UnitOrigin.Ionia],
        classes: [UnitClass.Gunslinger]
    },
    "凯特琳": {
        displayName: "凯特琳",
        price: 1,
        traits: [UnitOrigin.Piltover, UnitClass.Longshot],
        origins: [UnitOrigin.Piltover],
        classes: [UnitClass.Longshot]
    },
    "克格莫": {
        displayName: "克格莫",
        price: 1,
        traits: [UnitOrigin.Void, UnitClass.Sorcerer, UnitClass.Longshot],
        origins: [UnitOrigin.Void],
        classes: [UnitClass.Sorcerer, UnitClass.Longshot]
    },
    "璐璐": {
        displayName: "璐璐",
        price: 1,
        traits: [UnitOrigin.Yordle, UnitClass.Sorcerer],
        origins: [UnitOrigin.Yordle],
        classes: [UnitClass.Sorcerer]
    },
    "奇亚娜": {
        displayName: "奇亚娜",
        price: 1,
        traits: [UnitOrigin.Ixtal, UnitClass.Slayer],
        origins: [UnitOrigin.Ixtal],
        classes: [UnitClass.Slayer]
    },
    "兰博": {
        displayName: "兰博",
        price: 1,
        traits: [UnitOrigin.Yordle, UnitClass.Defender],
        origins: [UnitOrigin.Yordle],
        classes: [UnitClass.Defender]
    },
    "慎": {
        displayName: "慎",
        price: 1,
        traits: [UnitOrigin.Ionia, UnitClass.Bruiser],
        origins: [UnitOrigin.Ionia],
        classes: [UnitClass.Bruiser]
    },
    "娑娜": {
        displayName: "娑娜",
        price: 1,
        traits: [UnitOrigin.Demacia, UnitClass.Invoker],
        origins: [UnitOrigin.Demacia],
        classes: [UnitClass.Invoker]
    },
    "佛耶戈": {
        displayName: "佛耶戈",
        price: 1,
        traits: [UnitOrigin.ShadowIsles, UnitClass.Rapidfire],
        origins: [UnitOrigin.ShadowIsles],
        classes: [UnitClass.Rapidfire]
    },
    "布里茨": {
        displayName: "布里茨",
        price: 1,
        traits: [UnitOrigin.Zaun, UnitClass.Juggernaut],
        origins: [UnitOrigin.Zaun],
        classes: [UnitClass.Juggernaut]
    },

    // 2 费棋子
    "厄斐琉斯": {
        displayName: "厄斐琉斯",
        price: 2,
        traits: [UnitOrigin.Targon],
        origins: [UnitOrigin.Targon],
        classes: []
    },
    "艾希": {
        displayName: "艾希",
        price: 2,
        traits: [UnitOrigin.Freljord, UnitClass.Rapidfire],
        origins: [UnitOrigin.Freljord],
        classes: [UnitClass.Rapidfire]
    },
    "科加斯": {
        displayName: "科加斯",
        price: 2,
        traits: [UnitOrigin.Void, UnitClass.Juggernaut],
        origins: [UnitOrigin.Void],
        classes: [UnitClass.Juggernaut]
    },
    "崔斯特": {
        displayName: "崔斯特",
        price: 2,
        traits: [UnitOrigin.Bilgewater, UnitClass.Rapidfire],
        origins: [UnitOrigin.Bilgewater],
        classes: [UnitClass.Rapidfire]
    },
    "艾克": {
        displayName: "艾克",
        price: 2,
        traits: [UnitOrigin.Zaun, UnitClass.Magus],
        origins: [UnitOrigin.Zaun],
        classes: [UnitClass.Magus]
    },
    "格雷福斯": {
        displayName: "格雷福斯",
        price: 2,
        traits: [UnitOrigin.Bilgewater, UnitClass.Gunslinger],
        origins: [UnitOrigin.Bilgewater],
        classes: [UnitClass.Gunslinger]
    },
    "妮蔻": {
        displayName: "妮蔻",
        price: 2,
        traits: [UnitOrigin.Ixtal, UnitClass.Sorcerer, UnitClass.Defender],
        origins: [UnitOrigin.Ixtal],
        classes: [UnitClass.Sorcerer, UnitClass.Defender]
    },
    "奥莉安娜": {
        displayName: "奥莉安娜",
        price: 2,
        traits: [UnitOrigin.Piltover, UnitClass.Invoker],
        origins: [UnitOrigin.Piltover],
        classes: [UnitClass.Invoker]
    },
    "波比": {
        displayName: "波比",
        price: 2,
        traits: [UnitOrigin.Demacia, UnitOrigin.Yordle, UnitClass.Juggernaut],
        origins: [UnitOrigin.Demacia, UnitOrigin.Yordle],
        classes: [UnitClass.Juggernaut]
    },
    "雷克塞": {
        displayName: "雷克塞",
        price: 2,
        traits: [UnitOrigin.Void, UnitClass.Vanquisher],
        origins: [UnitOrigin.Void],
        classes: [UnitClass.Vanquisher]
    },
    "赛恩": {
        displayName: "赛恩",
        price: 2,
        traits: [UnitOrigin.Noxus, UnitClass.Bruiser],
        origins: [UnitOrigin.Noxus],
        classes: [UnitClass.Bruiser]
    },
    "提莫": {
        displayName: "提莫",
        price: 2,
        traits: [UnitOrigin.Yordle, UnitClass.Longshot],
        origins: [UnitOrigin.Yordle],
        classes: [UnitClass.Longshot]
    },
    "崔丝塔娜": {
        displayName: "崔丝塔娜",
        price: 2,
        traits: [UnitOrigin.Yordle, UnitClass.Gunslinger],
        origins: [UnitOrigin.Yordle],
        classes: [UnitClass.Gunslinger]
    },
    "蔚": {
        displayName: "蔚",
        price: 2,
        traits: [UnitOrigin.Piltover, UnitOrigin.Zaun, UnitClass.Defender],
        origins: [UnitOrigin.Piltover, UnitOrigin.Zaun],
        classes: [UnitClass.Defender]
    },
    "亚索": {
        displayName: "亚索",
        price: 2,
        traits: [UnitOrigin.Ionia, UnitClass.Slayer],
        origins: [UnitOrigin.Ionia],
        classes: [UnitClass.Slayer]
    },
    "约里克": {
        displayName: "约里克",
        price: 2,
        traits: [UnitOrigin.ShadowIsles, UnitClass.Warden],
        origins: [UnitOrigin.ShadowIsles],
        classes: [UnitClass.Warden]
    },
    "赵信": {
        displayName: "赵信",
        price: 2,
        traits: [UnitOrigin.Demacia, UnitOrigin.Ionia, UnitClass.Warden],
        origins: [UnitOrigin.Demacia, UnitOrigin.Ionia],
        classes: [UnitClass.Warden]
    },

    // 3 费棋子
    "阿狸": {
        displayName: "阿狸",
        price: 3,
        traits: [UnitOrigin.Ionia, UnitClass.Sorcerer],
        origins: [UnitOrigin.Ionia],
        classes: [UnitClass.Sorcerer]
    },
    "巴德": {
        displayName: "巴德",
        price: 3,
        traits: [UnitOrigin.Caretaker],
        origins: [UnitOrigin.Caretaker],
        classes: []
    },
    "德莱文": {
        displayName: "德莱文",
        price: 3,
        traits: [UnitOrigin.Noxus, UnitClass.Rapidfire],
        origins: [UnitOrigin.Noxus],
        classes: [UnitClass.Rapidfire]
    },
    "德莱厄斯": {
        displayName: "德莱厄斯",
        price: 3,
        traits: [UnitOrigin.Noxus, UnitClass.Defender],
        origins: [UnitOrigin.Noxus],
        classes: [UnitClass.Defender]
    },
    "格温": {
        displayName: "格温",
        price: 3,
        traits: [UnitOrigin.ShadowIsles, UnitClass.Magus],
        origins: [UnitOrigin.ShadowIsles],
        classes: [UnitClass.Magus]
    },
    "金克丝": {
        displayName: "金克丝",
        price: 3,
        traits: [UnitOrigin.Zaun, UnitClass.Gunslinger],
        origins: [UnitOrigin.Zaun],
        classes: [UnitClass.Gunslinger]
    },
    "凯南": {
        displayName: "凯南",
        price: 3,
        traits: [UnitOrigin.Ionia, UnitOrigin.Yordle, UnitClass.Defender],
        origins: [UnitOrigin.Ionia, UnitOrigin.Yordle],
        classes: [UnitClass.Defender]
    },
    "可酷伯与悠米": {
        displayName: "可酷伯与悠米",
        price: 3,
        traits: [UnitOrigin.Yordle, UnitClass.Bruiser, UnitClass.Invoker],
        origins: [UnitOrigin.Yordle],
        classes: [UnitClass.Bruiser, UnitClass.Invoker]
    },
    "乐芙兰": {
        displayName: "乐芙兰",
        price: 3,
        traits: [UnitOrigin.Noxus, UnitClass.Invoker],
        origins: [UnitOrigin.Noxus],
        classes: [UnitClass.Invoker]
    },
    "洛里斯": {
        displayName: "洛里斯",
        price: 3,
        traits: [UnitOrigin.Piltover, UnitClass.Warden],
        origins: [UnitOrigin.Piltover],
        classes: [UnitClass.Warden]
    },
    "玛尔扎哈": {
        displayName: "玛尔扎哈",
        price: 3,
        traits: [UnitOrigin.Void, UnitClass.Magus],
        origins: [UnitOrigin.Void],
        classes: [UnitClass.Magus]
    },
    "米利欧": {
        displayName: "米利欧",
        price: 3,
        traits: [UnitOrigin.Ixtal, UnitClass.Invoker],
        origins: [UnitOrigin.Ixtal],
        classes: [UnitClass.Invoker]
    },
    "诺提勒斯": {
        displayName: "诺提勒斯",
        price: 3,
        traits: [UnitOrigin.Bilgewater, UnitClass.Juggernaut, UnitClass.Warden],
        origins: [UnitOrigin.Bilgewater],
        classes: [UnitClass.Juggernaut, UnitClass.Warden]
    },
    "普朗克": {
        displayName: "普朗克",
        price: 3,
        traits: [UnitOrigin.Bilgewater, UnitClass.Slayer, UnitClass.Vanquisher],
        origins: [UnitOrigin.Bilgewater],
        classes: [UnitClass.Slayer, UnitClass.Vanquisher]
    },
    "瑟庄妮": {
        displayName: "瑟庄妮",
        price: 3,
        traits: [UnitOrigin.Freljord, UnitClass.Defender],
        origins: [UnitOrigin.Freljord],
        classes: [UnitClass.Defender]
    },
    "薇恩": {
        displayName: "薇恩",
        price: 3,
        traits: [UnitOrigin.Demacia, UnitClass.Longshot],
        origins: [UnitOrigin.Demacia],
        classes: [UnitClass.Longshot]
    },

    // 4 费棋子
    "安蓓萨": {
        displayName: "安蓓萨",
        price: 4,
        traits: [UnitOrigin.Noxus, UnitClass.Vanquisher],
        origins: [UnitOrigin.Noxus],
        classes: [UnitClass.Vanquisher]
    },
    "卑尔维斯": {
        displayName: "卑尔维斯",
        price: 4,
        traits: [UnitOrigin.Void, UnitClass.Slayer],
        origins: [UnitOrigin.Void],
        classes: [UnitClass.Slayer]
    },
    "布隆": {
        displayName: "布隆",
        price: 4,
        traits: [UnitOrigin.Freljord, UnitClass.Warden],
        origins: [UnitOrigin.Freljord],
        classes: [UnitClass.Warden]
    },
    "黛安娜": {
        displayName: "黛安娜",
        price: 4,
        traits: [UnitOrigin.Targon],
        origins: [UnitOrigin.Targon],
        classes: []
    },
    "盖伦": {
        displayName: "盖伦",
        price: 4,
        traits: [UnitOrigin.Demacia, UnitClass.Defender],
        origins: [UnitOrigin.Demacia],
        classes: [UnitClass.Defender]
    },
    "卡莉丝塔": {
        displayName: "卡莉丝塔",
        price: 4,
        traits: [UnitOrigin.ShadowIsles, UnitClass.Vanquisher],
        origins: [UnitOrigin.ShadowIsles],
        classes: [UnitClass.Vanquisher]
    },
    "卡莎": {
        displayName: "卡莎",
        price: 4,
        traits: [UnitOrigin.Assimilator, UnitOrigin.Void, UnitClass.Longshot],
        origins: [UnitOrigin.Assimilator, UnitOrigin.Void],
        classes: [UnitClass.Longshot]
    },
    "蕾欧娜": {
        displayName: "蕾欧娜",
        price: 4,
        traits: [UnitOrigin.Targon],
        origins: [UnitOrigin.Targon],
        classes: []
    },
    "丽桑卓": {
        displayName: "丽桑卓",
        price: 4,
        traits: [UnitOrigin.Freljord, UnitClass.Invoker],
        origins: [UnitOrigin.Freljord],
        classes: [UnitClass.Invoker]
    },
    "拉克丝": {
        displayName: "拉克丝",
        price: 4,
        traits: [UnitOrigin.Demacia, UnitClass.Sorcerer],
        origins: [UnitOrigin.Demacia],
        classes: [UnitClass.Sorcerer]
    },
    "厄运小姐": {
        displayName: "厄运小姐",
        price: 4,
        traits: [UnitOrigin.Bilgewater, UnitClass.Gunslinger],
        origins: [UnitOrigin.Bilgewater],
        classes: [UnitClass.Gunslinger]
    },
    "内瑟斯": {
        displayName: "内瑟斯",
        price: 4,
        traits: [UnitOrigin.Shurima],
        origins: [UnitOrigin.Shurima],
        classes: []
    },
    "奈德丽": {
        displayName: "奈德丽",
        price: 4,
        traits: [UnitOrigin.Ixtal, UnitOrigin.Huntress],
        origins: [UnitOrigin.Ixtal, UnitOrigin.Huntress],
        classes: []
    },
    "雷克顿": {
        displayName: "雷克顿",
        price: 4,
        traits: [UnitOrigin.Shurima],
        origins: [UnitOrigin.Shurima],
        classes: []
    },
    "萨勒芬妮": {
        displayName: "萨勒芬妮",
        price: 4,
        traits: [UnitOrigin.Piltover, UnitClass.Magus],
        origins: [UnitOrigin.Piltover],
        classes: [UnitClass.Magus]
    },
    "辛吉德": {
        displayName: "辛吉德",
        price: 4,
        traits: [UnitOrigin.Zaun, UnitClass.Juggernaut],
        origins: [UnitOrigin.Zaun],
        classes: [UnitClass.Juggernaut]
    },
    "斯卡纳": {
        displayName: "斯卡纳",
        price: 4,
        traits: [UnitOrigin.Ixtal],
        origins: [UnitOrigin.Ixtal],
        classes: []
    },
    "斯维因": {
        displayName: "斯维因",
        price: 4,
        traits: [UnitOrigin.Noxus, UnitClass.Sorcerer, UnitClass.Juggernaut],
        origins: [UnitOrigin.Noxus],
        classes: [UnitClass.Sorcerer, UnitClass.Juggernaut]
    },
    "孙悟空": {
        displayName: "孙悟空",
        price: 4,
        traits: [UnitOrigin.Ionia, UnitClass.Bruiser],
        origins: [UnitOrigin.Ionia],
        classes: [UnitClass.Bruiser]
    },
    "塔里克": {
        displayName: "塔里克",
        price: 4,
        traits: [UnitOrigin.Targon],
        origins: [UnitOrigin.Targon],
        classes: []
    },
    "维迦": {
        displayName: "维迦",
        price: 4,
        traits: [UnitOrigin.Yordle, UnitClass.Sorcerer],
        origins: [UnitOrigin.Yordle],
        classes: [UnitClass.Sorcerer]
    },
    "沃里克": {
        displayName: "沃里克",
        price: 4,
        traits: [UnitOrigin.Zaun, UnitClass.Rapidfire],
        origins: [UnitOrigin.Zaun],
        classes: [UnitClass.Rapidfire]
    },
    "永恩": {
        displayName: "永恩",
        price: 4,
        traits: [UnitOrigin.Ionia, UnitClass.Slayer],
        origins: [UnitOrigin.Ionia],
        classes: [UnitClass.Slayer]
    },
    "芸阿娜": {
        displayName: "芸阿娜",
        price: 4,
        traits: [UnitOrigin.Ionia, UnitClass.Rapidfire],
        origins: [UnitOrigin.Ionia],
        classes: [UnitClass.Rapidfire]
    },

    // 5 费棋子
    "亚托克斯": {
        displayName: "亚托克斯",
        price: 5,
        traits: [UnitOrigin.Darkin, UnitClass.Slayer],
        origins: [UnitOrigin.Darkin],
        classes: [UnitClass.Slayer]
    },
    "安妮": {
        displayName: "安妮",
        price: 5,
        traits: [UnitOrigin.DarkChild, UnitClass.Sorcerer],
        origins: [UnitOrigin.DarkChild],
        classes: [UnitClass.Sorcerer]
    },
    "阿兹尔": {
        displayName: "阿兹尔",
        price: 5,
        traits: [UnitOrigin.Shurima, UnitOrigin.Emperor, UnitClass.Magus],
        origins: [UnitOrigin.Shurima, UnitOrigin.Emperor],
        classes: [UnitClass.Magus]
    },
    "费德提克": {
        displayName: "费德提克",
        price: 5,
        traits: [UnitOrigin.Harvester, UnitClass.Vanquisher],
        origins: [UnitOrigin.Harvester],
        classes: [UnitClass.Vanquisher]
    },
    "吉格斯": {
        displayName: "吉格斯",
        price: 5,
        traits: [UnitOrigin.Zaun, UnitOrigin.Yordle, UnitClass.Longshot],
        origins: [UnitOrigin.Zaun, UnitOrigin.Yordle],
        classes: [UnitClass.Longshot]
    },
    "加里奥": {
        displayName: "加里奥",
        price: 5,
        traits: [UnitOrigin.Demacia, UnitOrigin.Heroic],
        origins: [UnitOrigin.Demacia, UnitOrigin.Heroic],
        classes: []
    },
    "基兰": {
        displayName: "基兰",
        price: 5,
        traits: [UnitOrigin.Chronokeeper, UnitClass.Invoker],
        origins: [UnitOrigin.Chronokeeper],
        classes: [UnitClass.Invoker]
    },
    "千珏": {
        displayName: "千珏",
        price: 5,
        traits: [UnitOrigin.Kindred, UnitClass.Rapidfire],
        origins: [UnitOrigin.Kindred],
        classes: [UnitClass.Rapidfire]
    },
    "卢锡安与赛娜": {
        displayName: "卢锡安与赛娜",
        price: 5,
        traits: [UnitOrigin.Soulbound, UnitClass.Gunslinger],
        origins: [UnitOrigin.Soulbound],
        classes: [UnitClass.Gunslinger]
    },
    "梅尔": {
        displayName: "梅尔",
        price: 5,
        traits: [UnitOrigin.Noxus, UnitClass.Magus],
        origins: [UnitOrigin.Noxus],
        classes: [UnitClass.Magus]
    },
    "奥恩": {
        displayName: "奥恩",
        price: 5,
        traits: [UnitOrigin.Blacksmith, UnitClass.Warden],
        origins: [UnitOrigin.Blacksmith],
        classes: [UnitClass.Warden]
    },
    "瑟提": {
        displayName: "瑟提",
        price: 5,
        traits: [UnitOrigin.Ionia, UnitOrigin.TheBoss],
        origins: [UnitOrigin.Ionia, UnitOrigin.TheBoss],
        classes: []
    },
    "希瓦娜": {
        displayName: "希瓦娜",
        price: 5,
        traits: [UnitOrigin.Dragonborn, UnitClass.Juggernaut],
        origins: [UnitOrigin.Dragonborn],
        classes: [UnitClass.Juggernaut]
    },
    "塔姆": {
        displayName: "塔姆",
        price: 5,
        traits: [UnitOrigin.Bilgewater, UnitOrigin.Glutton, UnitClass.Bruiser],
        origins: [UnitOrigin.Bilgewater, UnitOrigin.Glutton],
        classes: [UnitClass.Bruiser]
    },
    "锤石": {
        displayName: "锤石",
        price: 5,
        traits: [UnitOrigin.ShadowIsles, UnitClass.Warden],
        origins: [UnitOrigin.ShadowIsles],
        classes: [UnitClass.Warden]
    },
    "沃利贝尔": {
        displayName: "沃利贝尔",
        price: 5,
        traits: [UnitOrigin.Freljord, UnitClass.Bruiser],
        origins: [UnitOrigin.Freljord],
        classes: [UnitClass.Bruiser]
    },

    // 特殊/高费羁绊单位（价格 7）
    "奥瑞利安·索尔": {
        displayName: "奥瑞利安·索尔",
        price: 7,
        traits: [UnitOrigin.Starforger, UnitOrigin.Targon],
        origins: [UnitOrigin.Starforger, UnitOrigin.Targon],
        classes: []
    },
    "纳什男爵": {
        displayName: "纳什男爵",
        price: 7,
        traits: [UnitOrigin.Void, UnitOrigin.Baron],
        origins: [UnitOrigin.Void, UnitOrigin.Baron],
        classes: []
    },
    "瑞兹": {
        displayName: "瑞兹",
        price: 7,
        traits: [UnitOrigin.RuneMage],
        origins: [UnitOrigin.RuneMage],
        classes: []
    },
    "亚恒": {
        displayName: "亚恒",
        price: 7,
        traits: [UnitOrigin.Darkin, UnitOrigin.Immortal],
        origins: [UnitOrigin.Darkin, UnitOrigin.Immortal],
        classes: []
    },
} satisfies Record<string, TFTUnit>;

export const TFT_16_CHAMPION_DATA: Record<keyof typeof _TFT_16_CHAMPION_DATA, TFTUnit> = _TFT_16_CHAMPION_DATA;






// ==========================================


// 下面是装备


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

const _TFT_16_EQUIP_DATA: Record<string, TFTEquip> ={
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
export type EquipKey = keyof typeof TFT_16_EQUIP_DATA;

export interface LineupUnit {
    name: ChampionKey;
    isCore: boolean;
    items?: EquipKey[];
    starTarget?: 1 | 2 | 3;
}

export interface TeamComposition {
    name: string;
    description?: string;
    earlyGame: LineupUnit[];
    midGame: LineupUnit[];
    lateGame: LineupUnit[];
}
