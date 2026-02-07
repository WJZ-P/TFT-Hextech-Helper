import {UnitClass_S16, UnitOrigin_S16} from "./trait.ts";
import {TFTUnit} from "../TFTProtocol.ts";

export const TFT_SPECIAL_CHESS = {
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
export const _TFT_16_CHESS_DATA = {
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

