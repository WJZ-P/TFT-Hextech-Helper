// ==========================================
//
// 下面是装备
//
// ==========================================
//
// 装备图标资源获取方式：
// URL 模板: https://game.gtimg.cn/images/lol/act/img/tft/equip/{equipId}.png
// 示例: https://game.gtimg.cn/images/lol/act/img/tft/equip/91840.png
//
// ==========================================

import {TFTEquip} from "../TFTProtocol.ts";

export const specialEquip: Record<string, TFTEquip> = {
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

export const _TFT_16_EQUIP_DATA: Record<string, TFTEquip> = {
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

export const _TFT_4_EQUIP_DATA: Record<string, TFTEquip> = {
    ...specialEquip,
    // ==========================================
    // Type 1: 基础散件 (Base Items)
    // ==========================================
    "暴风之剑": {
        name: "暴风之剑",
        englishName: "TFT_Item_BFSword",
        equipId: "91811",
        formula: ""
    },
    "锁子甲": {
        name: "锁子甲",
        englishName: "TFT_Item_ChainVest",
        equipId: "91817",
        formula: ""
    },
    "金锅锅": {
        name: "金锅锅",
        englishName: "TFT_Item_FryingPan",
        equipId: "91836",
        formula: ""
    },
    "巨人腰带": {
        name: "巨人腰带",
        englishName: "TFT_Item_GiantsBelt",
        equipId: "91838",
        formula: ""
    },
    "无用大棒": {
        name: "无用大棒",
        englishName: "TFT_Item_NeedlesslyLargeRod",
        equipId: "91851",
        formula: ""
    },
    "负极斗篷": {
        name: "负极斗篷",
        englishName: "TFT_Item_NegatronCloak",
        equipId: "91852",
        formula: ""
    },
    "反曲之弓": {
        name: "反曲之弓",
        englishName: "TFT_Item_RecurveBow",
        equipId: "91859",
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
    "女神之泪": {
        name: "女神之泪",
        englishName: "TFT_Item_TearOfTheGoddess",
        equipId: "91874",
        formula: ""
    },

    // ==========================================
    // Type 2: 标准合成装备 (Standard Completed Items)
    // ==========================================
    "刺客纹章": {
        name: "刺客纹章",
        englishName: "TFT4_Item_AssassinEmblemItem",
        equipId: "91886",
        formula: "91865,91836"
    },
    "斗士纹章": {
        name: "斗士纹章",
        englishName: "TFT4_Item_BrawlerEmblemItem",
        equipId: "91887",
        formula: "91836,91838"
    },
    "腥红之月纹章": {
        name: "腥红之月纹章",
        englishName: "TFT4_Item_CultistEmblemItem",
        equipId: "91888",
        formula: "91817,91866"
    },
    "天神纹章": {
        name: "天神纹章",
        englishName: "TFT4_Item_DivineEmblemItem",
        equipId: "91889",
        formula: "91866,91811"
    },
    "龙魂纹章": {
        name: "龙魂纹章",
        englishName: "TFT4_Item_DragonsoulEmblemItem",
        equipId: "91890",
        formula: "91851,91866"
    },
    "决斗大师纹章": {
        name: "决斗大师纹章",
        englishName: "TFT4_Item_DuelistEmblemItem",
        equipId: "91891",
        formula: "91859,91836"
    },
    "永恒之森纹章": {
        name: "永恒之森纹章",
        englishName: "TFT4_Item_ElderwoodEmblemItem",
        equipId: "91892",
        formula: "91852,91866"
    },
    "玉剑仙纹章": {
        name: "玉剑仙纹章",
        englishName: "TFT4_Item_EnlightenedEmblemItem",
        equipId: "91893",
        formula: "91874,91866"
    },
    "福星纹章": {
        name: "福星纹章",
        englishName: "TFT4_Item_FortuneEmblemItem",
        equipId: "91894",
        formula: "91865,91866"
    },
    "神盾使纹章": {
        name: "神盾使纹章",
        englishName: "TFT4_Item_KeeperEmblemItem",
        equipId: "91896",
        formula: "91852,91836"
    },
    "法师纹章": {
        name: "法师纹章",
        englishName: "TFT4_Item_MageEmblemItem",
        equipId: "91897",
        formula: "91874,91836"
    },
    "战神纹章": {
        name: "战神纹章",
        englishName: "TFT4_Item_SlayerEmblemItem",
        equipId: "91900",
        formula: "91836,91811"
    },
    "灵魂莲华明昼纹章": {
        name: "灵魂莲华明昼纹章",
        englishName: "TFT4_Item_SpiritEmblemItem",
        equipId: "91901",
        formula: "91859,91866"
    },
    "摄魂使纹章": {
        name: "摄魂使纹章",
        englishName: "TFT4_Item_SyphonerEmblemItem",
        equipId: "91902",
        formula: "91851,91836"
    },
    "重装战士纹章": {
        name: "重装战士纹章",
        englishName: "TFT4_Item_VanguardEmblemItem",
        equipId: "91903",
        formula: "91817,91836"
    },
    "三国猛将纹章": {
        name: "三国猛将纹章",
        englishName: "TFT4_Item_WarlordEmblemItem",
        equipId: "91904",
        formula: "91866,91838"
    },
    "适应性头盔": {
        name: "适应性头盔",
        englishName: "TFT_Item_AdaptiveHelm",
        equipId: "91774",
        formula: "91852,91874"
    },
    "大天使之杖": {
        name: "大天使之杖",
        englishName: "TFT_Item_ArchangelsStaff",
        equipId: "91776",
        formula: "91851,91874"
    },
    "饮血剑": {
        name: "饮血剑",
        englishName: "TFT_Item_Bloodthirster",
        equipId: "91814",
        formula: "91811,91852"
    },
    "蓝霸符": {
        name: "蓝霸符",
        englishName: "TFT_Item_BlueBuff",
        equipId: "91815",
        formula: "91874,91874"
    },
    "棘刺背心": {
        name: "棘刺背心",
        englishName: "TFT_Item_BrambleVest",
        equipId: "91816",
        formula: "91817,91817"
    },
    "冕卫": {
        name: "冕卫",
        englishName: "TFT_Item_Crownguard",
        equipId: "91819",
        formula: "91851,91817"
    },
    "死亡之刃": {
        name: "死亡之刃",
        englishName: "TFT_Item_Deathblade",
        equipId: "91820",
        formula: "91811,91811"
    },
    "巨龙之爪": {
        name: "巨龙之爪",
        englishName: "TFT_Item_DragonsClaw",
        equipId: "91831",
        formula: "91852,91852"
    },
    "金铲铲冠冕": {
        name: "金铲铲冠冕",
        englishName: "TFT_Item_ForceOfNature",
        equipId: "91834",
        formula: "91866,91866"
    },
    "圣盾使的誓约": {
        name: "圣盾使的誓约",
        englishName: "TFT_Item_FrozenHeart",
        equipId: "91835",
        formula: "91874,91817"
    },
    "石像鬼石板甲": {
        name: "石像鬼石板甲",
        englishName: "TFT_Item_GargoyleStoneplate",
        equipId: "91837",
        formula: "91817,91852"
    },
    "夜之锋刃": {
        name: "夜之锋刃",
        englishName: "TFT_Item_GuardianAngel",
        equipId: "91839",
        formula: "91811,91817"
    },
    "鬼索的狂暴之刃": {
        name: "鬼索的狂暴之刃",
        englishName: "TFT_Item_GuinsoosRageblade",
        equipId: "91840",
        formula: "91859,91851"
    },
    "海克斯科技枪刃": {
        name: "海克斯科技枪刃",
        englishName: "TFT_Item_HextechGunblade",
        equipId: "91841",
        formula: "91811,91851"
    },
    "无尽之刃": {
        name: "无尽之刃",
        englishName: "TFT_Item_InfinityEdge",
        equipId: "91842",
        formula: "91811,91865"
    },
    "离子火花": {
        name: "离子火花",
        englishName: "TFT_Item_IonicSpark",
        equipId: "91843",
        formula: "91851,91852"
    },
    "珠光护手": {
        name: "珠光护手",
        englishName: "TFT_Item_JeweledGauntlet",
        equipId: "91844",
        formula: "91851,91865"
    },
    "最后的轻语": {
        name: "最后的轻语",
        englishName: "TFT_Item_LastWhisper",
        equipId: "91845",
        formula: "91859,91865"
    },
    "纳什之牙": {
        name: "纳什之牙",
        englishName: "TFT_Item_Leviathan",
        equipId: "91846",
        formula: "91859,91838"
    },
    "巨人杀手": {
        name: "巨人杀手",
        englishName: "TFT_Item_MadredsBloodrazor",
        equipId: "91848",
        formula: "91811,91859"
    },
    "莫雷洛秘典": {
        name: "莫雷洛秘典",
        englishName: "TFT_Item_Morellonomicon",
        equipId: "91850",
        formula: "91851,91838"
    },
    "坚定之心": {
        name: "坚定之心",
        englishName: "TFT_Item_NightHarvester",
        equipId: "91853",
        formula: "91817,91865"
    },
    "强袭者的链枷": {
        name: "强袭者的链枷",
        englishName: "TFT_Item_PowerGauntlet",
        equipId: "91854",
        formula: "91838,91865"
    },
    "水银": {
        name: "水银",
        englishName: "TFT_Item_Quicksilver",
        equipId: "91855",
        formula: "91865,91852"
    },
    "灭世者的死亡之帽": {
        name: "灭世者的死亡之帽",
        englishName: "TFT_Item_RabadonsDeathcap",
        equipId: "91856",
        formula: "91851,91851"
    },
    "红霸符": {
        name: "红霸符",
        englishName: "TFT_Item_RapidFireCannon",
        equipId: "91858",
        formula: "91859,91859"
    },
    "日炎斗篷": {
        name: "日炎斗篷",
        englishName: "TFT_Item_RedBuff",
        equipId: "91860",
        formula: "91817,91838"
    },
    "振奋盔甲": {
        name: "振奋盔甲",
        englishName: "TFT_Item_Redemption",
        equipId: "91861",
        formula: "91874,91838"
    },
    "海妖之怒": {
        name: "海妖之怒",
        englishName: "TFT_Item_RunaansHurricane",
        equipId: "91862",
        formula: "91852,91859"
    },
    "朔极之矛": {
        name: "朔极之矛",
        englishName: "TFT_Item_SpearOfShojin",
        equipId: "91867",
        formula: "91811,91874"
    },
    "薄暮法袍": {
        name: "薄暮法袍",
        englishName: "TFT_Item_SpectralGauntlet",
        equipId: "91868",
        formula: "91852,91838"
    },
    "虚空之杖": {
        name: "虚空之杖",
        englishName: "TFT_Item_StatikkShiv",
        equipId: "91869",
        formula: "91859,91874"
    },
    "斯特拉克的挑战护手": {
        name: "斯特拉克的挑战护手",
        englishName: "TFT_Item_SteraksGage",
        equipId: "91870",
        formula: "91811,91838"
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
    "窃贼手套": {
        name: "窃贼手套",
        englishName: "TFT_Item_ThiefsGloves",
        equipId: "91875",
        formula: "91865,91865"
    },
    "泰坦的坚决": {
        name: "泰坦的坚决",
        englishName: "TFT_Item_TitansResolve",
        equipId: "91877",
        formula: "91817,91859"
    },
    "正义之手": {
        name: "正义之手",
        englishName: "TFT_Item_UnstableConcoction",
        equipId: "91878",
        formula: "91874,91865"
    },
    "狂徒铠甲": {
        name: "狂徒铠甲",
        englishName: "TFT_Item_WarmogsArmor",
        equipId: "91881",
        formula: "91838,91838"
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
    "兹若特传送门": {
        name: "兹若特传送门",
        englishName: "TFT5_Item_ZzRotPortalRadiant",
        equipId: "91657",
        formula: ""
    },

    // ==========================================
    // Type 4: 特殊道具 (Special Items)
    // ==========================================
    "德玛西亚王冠": {
        name: "德玛西亚王冠",
        englishName: "TFT9_Item_CrownOfDemacia",
        equipId: "91669",
        formula: ""
    },

    // ==========================================
    // Type 6: 奥恩神器 (Ornn Artifacts)
    // ==========================================
    "生命盔甲": {
        name: "生命盔甲",
        englishName: "TFT4_Item_OrnnAnimaVisage",
        equipId: "91898",
        formula: ""
    },
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
    "胖胖龙的火箭助推铁拳": {
        name: "胖胖龙的火箭助推铁拳",
        englishName: "TFT4_Item_OrnnRocketPropelledFist",
        equipId: "91899",
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
    "投机者之刃_HR": {
        name: "投机者之刃",
        englishName: "TFT7_Item_ShimmerscaleGamblersBlade_HR",
        equipId: "91662",
        formula: ""
    },
    "无用大宝石": {
        name: "无用大宝石",
        englishName: "TFT7_Item_ShimmerscaleHeartOfGold",
        equipId: "91663",
        formula: ""
    },
    "无用大宝石_HR": {
        name: "无用大宝石",
        englishName: "TFT7_Item_ShimmerscaleHeartOfGold_HR",
        equipId: "91664",
        formula: ""
    },
    "大亨之铠": {
        name: "大亨之铠",
        englishName: "TFT7_Item_ShimmerscaleMogulsMail",
        equipId: "91665",
        formula: ""
    },
    "大亨之铠_HR": {
        name: "大亨之铠",
        englishName: "TFT7_Item_ShimmerscaleMogulsMail_HR",
        equipId: "91666",
        formula: ""
    },
} satisfies  Record<string, TFTEquip> 
/**
 * 云顶十七赛季(科幻主题：观星者/幻灵战队/太空律动)的装备数据
 * @description 本赛季完整装备表，来源：public/TFTInfo/S17/equip.ts
 *              - Type 1: 基础散件 (10 个)
 *              - Type 2: 标准合成装 + 羁绊纹章合成装 (按 type 分类，包含所有纹章)
 *              - Type 3: 光明装备 (Radiant 版本)
 *              - Type 4: 羁绊专属装备 (幻灵战队进化装/灵能特工改装件/神器类)
 *              - Type 5: 独立纹章
 *              - Type 6: 奥恩神器 (Artifact 类)
 *              - Type 7: 金鳞龙装备 (Shimmerscale 类)
 *              - Support: 辅助装 (来自 type=9 中标记了 [辅助装] 的装备)
 *              - 特殊消耗品(强化果实/装备拆卸器等)复用顶部 specialEquip
 */
export const _TFT_17_EQUIP_DATA: Record<string, TFTEquip> = {
    ...specialEquip,

    // ==========================================
    // Type 1: 基础散件 (Base Items) (共 10 个)
    // ==========================================
    "暴风之剑": {
        name: "暴风之剑",
        englishName: "TFT_Item_BFSword",
        equipId: "92506",
        formula: ""
    },
    "锁子甲": {
        name: "锁子甲",
        englishName: "TFT_Item_ChainVest",
        equipId: "92512",
        formula: ""
    },
    "金锅锅": {
        name: "金锅锅",
        englishName: "TFT_Item_FryingPan",
        equipId: "92531",
        formula: ""
    },
    "巨人腰带": {
        name: "巨人腰带",
        englishName: "TFT_Item_GiantsBelt",
        equipId: "92533",
        formula: ""
    },
    "无用大棒": {
        name: "无用大棒",
        englishName: "TFT_Item_NeedlesslyLargeRod",
        equipId: "92547",
        formula: ""
    },
    "负极斗篷": {
        name: "负极斗篷",
        englishName: "TFT_Item_NegatronCloak",
        equipId: "92548",
        formula: ""
    },
    "反曲之弓": {
        name: "反曲之弓",
        englishName: "TFT_Item_RecurveBow",
        equipId: "92555",
        formula: ""
    },
    "拳套": {
        name: "拳套",
        englishName: "TFT_Item_SparringGloves",
        equipId: "92561",
        formula: ""
    },
    "金铲铲": {
        name: "金铲铲",
        englishName: "TFT_Item_Spatula",
        equipId: "92562",
        formula: ""
    },
    "女神之泪": {
        name: "女神之泪",
        englishName: "TFT_Item_TearOfTheGoddess",
        equipId: "92570",
        formula: ""
    },

    // ==========================================
    // Type 2: 标准合成装备 + 羁绊纹章合成装 (Standard Completed + Emblem Items) (共 55 个)
    // ==========================================
    "挑战者纹章": {
        name: "挑战者纹章",
        englishName: "TFT17_Item_ASTraitEmblemItem",
        equipId: "92120",
        formula: "92531,92555"
    },
    "游侠纹章": {
        name: "游侠纹章",
        englishName: "TFT17_Item_AssassinTraitEmblemItem",
        equipId: "92132",
        formula: "92531,92561"
    },
    "木灵族纹章": {
        name: "木灵族纹章",
        englishName: "TFT17_Item_AstronautEmblemItem",
        equipId: "92133",
        formula: "92562,92512"
    },
    "新星特攻队纹章": {
        name: "新星特攻队纹章",
        englishName: "TFT17_Item_DRXEmblemItem",
        equipId: "92134",
        formula: "92562,92561"
    },
    "暗星纹章": {
        name: "暗星纹章",
        englishName: "TFT17_Item_DarkStarEmblemItem",
        equipId: "92135",
        formula: "92562,92506"
    },
    "法官纹章": {
        name: "法官纹章",
        englishName: "TFT17_Item_FavoredEmblemItem",
        equipId: "92136",
        formula: "92562,92548"
    },
    "旅人纹章": {
        name: "旅人纹章",
        englishName: "TFT17_Item_FlexTraitEmblemItem",
        equipId: "92137",
        formula: "92531,92547"
    },
    "斗士纹章": {
        name: "斗士纹章",
        englishName: "TFT17_Item_HPTankEmblemItem",
        equipId: "92138",
        formula: "92531,92533"
    },
    "狂战士纹章": {
        name: "狂战士纹章",
        englishName: "TFT17_Item_MeleeTraitEmblemItem",
        equipId: "92139",
        formula: "92531,92506"
    },
    "海魔人纹章": {
        name: "海魔人纹章",
        englishName: "TFT17_Item_PrimordianEmblemItem",
        equipId: "92143",
        formula: "92562,92533"
    },
    "未来战士纹章": {
        name: "未来战士纹章",
        englishName: "TFT17_Item_PulsefireEmblemItem",
        equipId: "92157",
        formula: "92562,92555"
    },
    "堡垒卫士纹章": {
        name: "堡垒卫士纹章",
        englishName: "TFT17_Item_ResistTankEmblemItem",
        equipId: "92159",
        formula: "92531,92512"
    },
    "重装战士纹章": {
        name: "重装战士纹章",
        englishName: "TFT17_Item_ShieldTankEmblemItem",
        equipId: "92160",
        formula: "92531,92548"
    },
    "太空律动纹章": {
        name: "太空律动纹章",
        englishName: "TFT17_Item_SpaceGrooveEmblemItem",
        equipId: "92161",
        formula: "92562,92570"
    },
    "观星者纹章": {
        name: "观星者纹章",
        englishName: "TFT17_Item_StargazerEmblemItem",
        equipId: "92162",
        formula: "92562,92547"
    },
    "牧羊人纹章": {
        name: "牧羊人纹章",
        englishName: "TFT17_Item_SummonTraitEmblemItem",
        equipId: "92163",
        formula: "92531,92570"
    },
    "适应性头盔": {
        name: "适应性头盔",
        englishName: "TFT_Item_AdaptiveHelm",
        equipId: "92469",
        formula: "92548,92570"
    },
    "大天使之杖": {
        name: "大天使之杖",
        englishName: "TFT_Item_ArchangelsStaff",
        equipId: "92471",
        formula: "92547,92570"
    },
    "饮血剑": {
        name: "饮血剑",
        englishName: "TFT_Item_Bloodthirster",
        equipId: "92509",
        formula: "92506,92548"
    },
    "蓝霸符": {
        name: "蓝霸符",
        englishName: "TFT_Item_BlueBuff",
        equipId: "92510",
        formula: "92570,92570"
    },
    "棘刺背心": {
        name: "棘刺背心",
        englishName: "TFT_Item_BrambleVest",
        equipId: "92511",
        formula: "92512,92512"
    },
    "冕卫": {
        name: "冕卫",
        englishName: "TFT_Item_Crownguard",
        equipId: "92514",
        formula: "92547,92512"
    },
    "死亡之刃": {
        name: "死亡之刃",
        englishName: "TFT_Item_Deathblade",
        equipId: "92515",
        formula: "92506,92506"
    },
    "巨龙之爪": {
        name: "巨龙之爪",
        englishName: "TFT_Item_DragonsClaw",
        equipId: "92526",
        formula: "92548,92548"
    },
    "金铲铲冠冕": {
        name: "金铲铲冠冕",
        englishName: "TFT_Item_ForceOfNature",
        equipId: "92529",
        formula: "92562,92562"
    },
    "圣盾使的誓约": {
        name: "圣盾使的誓约",
        englishName: "TFT_Item_FrozenHeart",
        equipId: "92530",
        formula: "92570,92512"
    },
    "石像鬼石板甲": {
        name: "石像鬼石板甲",
        englishName: "TFT_Item_GargoyleStoneplate",
        equipId: "92532",
        formula: "92512,92548"
    },
    "夜之锋刃": {
        name: "夜之锋刃",
        englishName: "TFT_Item_GuardianAngel",
        equipId: "92535",
        formula: "92506,92512"
    },
    "鬼索的狂暴之刃": {
        name: "鬼索的狂暴之刃",
        englishName: "TFT_Item_GuinsoosRageblade",
        equipId: "92536",
        formula: "92555,92547"
    },
    "海克斯科技枪刃": {
        name: "海克斯科技枪刃",
        englishName: "TFT_Item_HextechGunblade",
        equipId: "92537",
        formula: "92506,92547"
    },
    "无尽之刃": {
        name: "无尽之刃",
        englishName: "TFT_Item_InfinityEdge",
        equipId: "92538",
        formula: "92506,92561"
    },
    "离子火花": {
        name: "离子火花",
        englishName: "TFT_Item_IonicSpark",
        equipId: "92539",
        formula: "92547,92548"
    },
    "珠光护手": {
        name: "珠光护手",
        englishName: "TFT_Item_JeweledGauntlet",
        equipId: "92540",
        formula: "92547,92561"
    },
    "最后的轻语": {
        name: "最后的轻语",
        englishName: "TFT_Item_LastWhisper",
        equipId: "92541",
        formula: "92555,92561"
    },
    "纳什之牙": {
        name: "纳什之牙",
        englishName: "TFT_Item_Leviathan",
        equipId: "92542",
        formula: "92555,92533"
    },
    "巨人杀手": {
        name: "巨人杀手",
        englishName: "TFT_Item_MadredsBloodrazor",
        equipId: "92544",
        formula: "92506,92555"
    },
    "莫雷洛秘典": {
        name: "莫雷洛秘典",
        englishName: "TFT_Item_Morellonomicon",
        equipId: "92546",
        formula: "92547,92533"
    },
    "坚定之心": {
        name: "坚定之心",
        englishName: "TFT_Item_NightHarvester",
        equipId: "92549",
        formula: "92512,92561"
    },
    "强袭者的链枷": {
        name: "强袭者的链枷",
        englishName: "TFT_Item_PowerGauntlet",
        equipId: "92550",
        formula: "92533,92561"
    },
    "水银": {
        name: "水银",
        englishName: "TFT_Item_Quicksilver",
        equipId: "92551",
        formula: "92561,92548"
    },
    "灭世者的死亡之帽": {
        name: "灭世者的死亡之帽",
        englishName: "TFT_Item_RabadonsDeathcap",
        equipId: "92552",
        formula: "92547,92547"
    },
    "红霸符": {
        name: "红霸符",
        englishName: "TFT_Item_RapidFireCannon",
        equipId: "92554",
        formula: "92555,92555"
    },
    "日炎斗篷": {
        name: "日炎斗篷",
        englishName: "TFT_Item_RedBuff",
        equipId: "92556",
        formula: "92512,92533"
    },
    "振奋盔甲": {
        name: "振奋盔甲",
        englishName: "TFT_Item_Redemption",
        equipId: "92557",
        formula: "92570,92533"
    },
    "海妖之怒": {
        name: "海妖之怒",
        englishName: "TFT_Item_RunaansHurricane",
        equipId: "92558",
        formula: "92548,92555"
    },
    "朔极之矛": {
        name: "朔极之矛",
        englishName: "TFT_Item_SpearOfShojin",
        equipId: "92563",
        formula: "92506,92570"
    },
    "薄暮法袍": {
        name: "薄暮法袍",
        englishName: "TFT_Item_SpectralGauntlet",
        equipId: "92564",
        formula: "92548,92533"
    },
    "虚空之杖": {
        name: "虚空之杖",
        englishName: "TFT_Item_StatikkShiv",
        equipId: "92565",
        formula: "92555,92570"
    },
    "斯特拉克的挑战护手": {
        name: "斯特拉克的挑战护手",
        englishName: "TFT_Item_SteraksGage",
        equipId: "92566",
        formula: "92506,92533"
    },
    "金锅铲冠冕": {
        name: "金锅铲冠冕",
        englishName: "TFT_Item_TacticiansRing",
        equipId: "92568",
        formula: "92562,92531"
    },
    "金锅锅冠冕": {
        name: "金锅锅冠冕",
        englishName: "TFT_Item_TacticiansScepter",
        equipId: "92569",
        formula: "92531,92531"
    },
    "窃贼手套": {
        name: "窃贼手套",
        englishName: "TFT_Item_ThiefsGloves",
        equipId: "92571",
        formula: "92561,92561"
    },
    "泰坦的坚决": {
        name: "泰坦的坚决",
        englishName: "TFT_Item_TitansResolve",
        equipId: "92573",
        formula: "92512,92555"
    },
    "正义之手": {
        name: "正义之手",
        englishName: "TFT_Item_UnstableConcoction",
        equipId: "92574",
        formula: "92570,92561"
    },
    "狂徒铠甲": {
        name: "狂徒铠甲",
        englishName: "TFT_Item_WarmogsArmor",
        equipId: "92577",
        formula: "92533,92533"
    },

    // ==========================================
    // Type 3: 光明装备 (Radiant Items) (共 37 个)
    // ==========================================
    "光明版适应性头盔": {
        name: "光明版适应性头盔",
        englishName: "TFT5_Item_AdaptiveHelmRadiant",
        equipId: "92310",
        formula: ""
    },
    "光明版大天使之杖": {
        name: "光明版大天使之杖",
        englishName: "TFT5_Item_ArchangelsStaffRadiant",
        equipId: "92311",
        formula: ""
    },
    "光明版饮血剑": {
        name: "光明版饮血剑",
        englishName: "TFT5_Item_BloodthirsterRadiant",
        equipId: "92312",
        formula: ""
    },
    "光明版蓝霸符": {
        name: "光明版蓝霸符",
        englishName: "TFT5_Item_BlueBuffRadiant",
        equipId: "92313",
        formula: ""
    },
    "光明版棘刺背心": {
        name: "光明版棘刺背心",
        englishName: "TFT5_Item_BrambleVestRadiant",
        equipId: "92314",
        formula: ""
    },
    "光明版冕卫": {
        name: "光明版冕卫",
        englishName: "TFT5_Item_CrownguardRadiant",
        equipId: "92315",
        formula: ""
    },
    "光明版死亡之刃": {
        name: "光明版死亡之刃",
        englishName: "TFT5_Item_DeathbladeRadiant",
        equipId: "92316",
        formula: ""
    },
    "光明版巨龙之爪": {
        name: "光明版巨龙之爪",
        englishName: "TFT5_Item_DragonsClawRadiant",
        equipId: "92317",
        formula: ""
    },
    "光明版圣盾使的誓约": {
        name: "光明版圣盾使的誓约",
        englishName: "TFT5_Item_FrozenHeartRadiant",
        equipId: "92318",
        formula: ""
    },
    "光明版石像鬼石板甲": {
        name: "光明版石像鬼石板甲",
        englishName: "TFT5_Item_GargoyleStoneplateRadiant",
        equipId: "92319",
        formula: ""
    },
    "光明版巨人杀手": {
        name: "光明版巨人杀手",
        englishName: "TFT5_Item_GiantSlayerRadiant",
        equipId: "92320",
        formula: ""
    },
    "光明版夜之锋刃": {
        name: "光明版夜之锋刃",
        englishName: "TFT5_Item_GuardianAngelRadiant",
        equipId: "92321",
        formula: ""
    },
    "光明版鬼索的狂暴之刃": {
        name: "光明版鬼索的狂暴之刃",
        englishName: "TFT5_Item_GuinsoosRagebladeRadiant",
        equipId: "92322",
        formula: ""
    },
    "光明版正义之手": {
        name: "光明版正义之手",
        englishName: "TFT5_Item_HandOfJusticeRadiant",
        equipId: "92323",
        formula: ""
    },
    "光明版海克斯科技枪刃": {
        name: "光明版海克斯科技枪刃",
        englishName: "TFT5_Item_HextechGunbladeRadiant",
        equipId: "92324",
        formula: ""
    },
    "光明版无尽之刃": {
        name: "光明版无尽之刃",
        englishName: "TFT5_Item_InfinityEdgeRadiant",
        equipId: "92325",
        formula: ""
    },
    "光明版离子火花": {
        name: "光明版离子火花",
        englishName: "TFT5_Item_IonicSparkRadiant",
        equipId: "92326",
        formula: ""
    },
    "光明版珠光护手": {
        name: "光明版珠光护手",
        englishName: "TFT5_Item_JeweledGauntletRadiant",
        equipId: "92327",
        formula: ""
    },
    "光明版最后的轻语": {
        name: "光明版最后的轻语",
        englishName: "TFT5_Item_LastWhisperRadiant",
        equipId: "92328",
        formula: ""
    },
    "光明版纳什之牙": {
        name: "光明版纳什之牙",
        englishName: "TFT5_Item_LeviathanRadiant",
        equipId: "92329",
        formula: ""
    },
    "光明版莫雷洛秘典": {
        name: "光明版莫雷洛秘典",
        englishName: "TFT5_Item_MorellonomiconRadiant",
        equipId: "92330",
        formula: ""
    },
    "光明版坚定之心": {
        name: "光明版坚定之心",
        englishName: "TFT5_Item_NightHarvesterRadiant",
        equipId: "92331",
        formula: ""
    },
    "光明版水银": {
        name: "光明版水银",
        englishName: "TFT5_Item_QuicksilverRadiant",
        equipId: "92332",
        formula: ""
    },
    "光明版灭世者的死亡之帽": {
        name: "光明版灭世者的死亡之帽",
        englishName: "TFT5_Item_RabadonsDeathcapRadiant",
        equipId: "92333",
        formula: ""
    },
    "光明版红霸符": {
        name: "光明版红霸符",
        englishName: "TFT5_Item_RapidFirecannonRadiant",
        equipId: "92334",
        formula: ""
    },
    "光明版振奋盔甲": {
        name: "光明版振奋盔甲",
        englishName: "TFT5_Item_RedemptionRadiant",
        equipId: "92335",
        formula: ""
    },
    "光明版海妖之怒": {
        name: "光明版海妖之怒",
        englishName: "TFT5_Item_RunaansHurricaneRadiant",
        equipId: "92336",
        formula: ""
    },
    "光明版朔极之矛": {
        name: "光明版朔极之矛",
        englishName: "TFT5_Item_SpearOfShojinRadiant",
        equipId: "92337",
        formula: ""
    },
    "光明版薄暮法袍": {
        name: "光明版薄暮法袍",
        englishName: "TFT5_Item_SpectralGauntletRadiant",
        equipId: "92338",
        formula: ""
    },
    "光明版虚空之杖": {
        name: "光明版虚空之杖",
        englishName: "TFT5_Item_StatikkShivRadiant",
        equipId: "92339",
        formula: ""
    },
    "光明版斯特拉克的挑战护手": {
        name: "光明版斯特拉克的挑战护手",
        englishName: "TFT5_Item_SteraksGageRadiant",
        equipId: "92340",
        formula: ""
    },
    "光明版日炎斗篷": {
        name: "光明版日炎斗篷",
        englishName: "TFT5_Item_SunfireCapeRadiant",
        equipId: "92341",
        formula: ""
    },
    "光明版窃贼手套": {
        name: "光明版窃贼手套",
        englishName: "TFT5_Item_ThiefsGlovesRadiant",
        equipId: "92342",
        formula: ""
    },
    "光明版泰坦的坚决": {
        name: "光明版泰坦的坚决",
        englishName: "TFT5_Item_TitansResolveRadiant",
        equipId: "92343",
        formula: ""
    },
    "光明版强袭者的链枷": {
        name: "光明版强袭者的链枷",
        englishName: "TFT5_Item_TrapClawRadiant",
        equipId: "92344",
        formula: ""
    },
    "光明版狂徒铠甲": {
        name: "光明版狂徒铠甲",
        englishName: "TFT5_Item_WarmogsArmorRadiant",
        equipId: "92345",
        formula: ""
    },
    "兹若特传送门": {
        name: "兹若特传送门",
        englishName: "TFT5_Item_ZzRotPortalRadiant",
        equipId: "92346",
        formula: ""
    },

    // ==========================================
    // Type 4: 羁绊/特殊装备 (幻灵战队进化装 / 灵能特工改装件 / 神器等) (共 44 个)
    // ==========================================
    "破损原型": {
        name: "破损原型",
        englishName: "TFT17_AnimaSquadItem_Tier0_ClunkyPrototype",
        equipId: "91924",
        formula: ""
    },
    "泄露原型": {
        name: "泄露原型",
        englishName: "TFT17_AnimaSquadItem_Tier0_LeakyPrototype",
        equipId: "91925",
        formula: ""
    },
    "闪光原型": {
        name: "闪光原型",
        englishName: "TFT17_AnimaSquadItem_Tier0_SparkingPrototype",
        equipId: "91926",
        formula: ""
    },
    "附灵飞弹": {
        name: "附灵飞弹",
        englishName: "TFT17_AnimaSquadItem_Tier1_GuidingHex",
        equipId: "91927",
        formula: ""
    },
    "火箭狂潮": {
        name: "火箭狂潮",
        englishName: "TFT17_AnimaSquadItem_Tier1_RocketSwarm",
        equipId: "91928",
        formula: ""
    },
    "无情砍削": {
        name: "无情砍削",
        englishName: "TFT17_AnimaSquadItem_Tier1_SavageSlicer",
        equipId: "91929",
        formula: ""
    },
    "触手重击": {
        name: "触手重击",
        englishName: "TFT17_AnimaSquadItem_Tier1_TentacleSlam",
        equipId: "91930",
        formula: ""
    },
    "歼灭者": {
        name: "歼灭者",
        englishName: "TFT17_AnimaSquadItem_Tier2_Annihilator",
        equipId: "91931",
        formula: ""
    },
    "战兔十字弩": {
        name: "战兔十字弩",
        englishName: "TFT17_AnimaSquadItem_Tier2_BattleBunnyCrossbow",
        equipId: "91932",
        formula: ""
    },
    "旋风切割器": {
        name: "旋风切割器",
        englishName: "TFT17_AnimaSquadItem_Tier2_CyclonicSlicers",
        equipId: "91933",
        formula: ""
    },
    "回响蝠刃": {
        name: "回响蝠刃",
        englishName: "TFT17_AnimaSquadItem_Tier2_EchoingBatblades",
        equipId: "91934",
        formula: ""
    },
    "冰爆护甲": {
        name: "冰爆护甲",
        englishName: "TFT17_AnimaSquadItem_Tier2_IceblastArmor",
        equipId: "91935",
        formula: ""
    },
    "雌狮之怨": {
        name: "雌狮之怨",
        englishName: "TFT17_AnimaSquadItem_Tier2_LionessLament",
        equipId: "91936",
        formula: ""
    },
    "耀光力场": {
        name: "耀光力场",
        englishName: "TFT17_AnimaSquadItem_Tier2_RadiantField",
        equipId: "91937",
        formula: ""
    },
    "炽烈短弓": {
        name: "炽烈短弓",
        englishName: "TFT17_AnimaSquadItem_Tier2_SearingShortbow",
        equipId: "91938",
        formula: ""
    },
    "UwU魔爆炮": {
        name: "UwU魔爆炮",
        englishName: "TFT17_AnimaSquadItem_Tier2_UwuBlaster",
        equipId: "91939",
        formula: ""
    },
    "幻灵启示录": {
        name: "幻灵启示录",
        englishName: "TFT17_AnimaSquadItem_Tier3_Annihilator",
        equipId: "91940",
        formula: ""
    },
    "战兔至尊弩炮": {
        name: "战兔至尊弩炮",
        englishName: "TFT17_AnimaSquadItem_Tier3_BattleBunnyCrossbow",
        equipId: "91941",
        formula: ""
    },
    "不息气旋": {
        name: "不息气旋",
        englishName: "TFT17_AnimaSquadItem_Tier3_CyclonicSlicers",
        equipId: "91942",
        formula: ""
    },
    "薇恩的炫彩战刃": {
        name: "薇恩的炫彩战刃",
        englishName: "TFT17_AnimaSquadItem_Tier3_EchoingBatblades",
        equipId: "91943",
        formula: ""
    },
    "深度冻结": {
        name: "深度冻结",
        englishName: "TFT17_AnimaSquadItem_Tier3_IceblastArmor",
        equipId: "91944",
        formula: ""
    },
    "猛狮之殇": {
        name: "猛狮之殇",
        englishName: "TFT17_AnimaSquadItem_Tier3_LionessLament",
        equipId: "91945",
        formula: ""
    },
    "日蚀之刻": {
        name: "日蚀之刻",
        englishName: "TFT17_AnimaSquadItem_Tier3_RadiantField",
        equipId: "91946",
        formula: ""
    },
    "进化余烬射击": {
        name: "进化余烬射击",
        englishName: "TFT17_AnimaSquadItem_Tier3_SearingShortbow",
        equipId: "91947",
        formula: ""
    },
    "OwO魔爆炮": {
        name: "OwO魔爆炮",
        englishName: "TFT17_AnimaSquadItem_Tier3_UwuBlaster",
        equipId: "91948",
        formula: ""
    },
    "幻灵合体至尊炮": {
        name: "幻灵合体至尊炮",
        englishName: "TFT17_AnimaSquadItem_Tier4_Omniweapon",
        equipId: "91949",
        formula: ""
    },
    "异常突变": {
        name: "异常突变",
        englishName: "TFT17_EkkoOffering_AnomalyItem",
        equipId: "92046",
        formula: ""
    },
    "阿狸的光环": {
        name: "阿狸的光环",
        englishName: "TFT17_Item_Artifact_AhriArtifact",
        equipId: "92122",
        formula: ""
    },
    "艾克的耐心": {
        name: "艾克的耐心",
        englishName: "TFT17_Item_Artifact_EkkoArtifact",
        equipId: "92123",
        formula: ""
    },
    "伊芙琳的本能": {
        name: "伊芙琳的本能",
        englishName: "TFT17_Item_Artifact_EvelynnArtifact",
        equipId: "92124",
        formula: ""
    },
    "凯尔的崇拜": {
        name: "凯尔的崇拜",
        englishName: "TFT17_Item_Artifact_KayleArtifact",
        equipId: "92125",
        formula: ""
    },
    "凯尔的光明崇拜": {
        name: "凯尔的光明崇拜",
        englishName: "TFT17_Item_Artifact_KayleArtifact_Radiant",
        equipId: "92126",
        formula: ""
    },
    "索拉卡的奇迹": {
        name: "索拉卡的奇迹",
        englishName: "TFT17_Item_Artifact_SorakaArtifact",
        equipId: "92127",
        formula: ""
    },
    "锤石的灯笼": {
        name: "锤石的灯笼",
        englishName: "TFT17_Item_Artifact_ThreshLantern",
        equipId: "92128",
        formula: ""
    },
    "韦鲁斯的执念": {
        name: "韦鲁斯的执念",
        englishName: "TFT17_Item_Artifact_VarusArtifact",
        equipId: "92129",
        formula: ""
    },
    "亚索的剑艺": {
        name: "亚索的剑艺",
        englishName: "TFT17_Item_Artifact_YasuoArtifact",
        equipId: "92130",
        formula: ""
    },
    "基克的阴森先驱": {
        name: "基克的阴森先驱",
        englishName: "TFT17_Item_Artifact_ZekesHeraldShadow",
        equipId: "92131",
        formula: ""
    },
    "恶意软件矩阵": {
        name: "恶意软件矩阵",
        englishName: "TFT17_Item_PsyOps_ChemicalCapacitorMod",
        equipId: "92145",
        formula: ""
    },
    "无人机上行链路": {
        name: "无人机上行链路",
        englishName: "TFT17_Item_PsyOps_DroneMod",
        equipId: "92147",
        formula: ""
    },
    "生物质维护器": {
        name: "生物质维护器",
        englishName: "TFT17_Item_PsyOps_GrenadeMod",
        equipId: "92149",
        formula: ""
    },
    "半导体装置": {
        name: "半导体装置",
        englishName: "TFT17_Item_PsyOps_SemiconductorMod",
        equipId: "92151",
        formula: ""
    },
    "共感植入": {
        name: "共感植入",
        englishName: "TFT17_Item_PsyOps_SympatheticImplantMod",
        equipId: "92153",
        formula: ""
    },
    "锁敌光学设备": {
        name: "锁敌光学设备",
        englishName: "TFT17_Item_PsyOps_TargetlockMod",
        equipId: "92155",
        formula: ""
    },
    "德玛西亚王冠": {
        name: "德玛西亚王冠",
        englishName: "TFT9_Item_CrownOfDemacia",
        equipId: "92358",
        formula: ""
    },

    // ==========================================
    // Type 5: 独立纹章 (Emblems) - 部分特殊羁绊纹章 (共 3 个)
    // ==========================================
    "幻灵战队纹章": {
        name: "幻灵战队纹章",
        englishName: "TFT17_Item_AnimaSquadEmblemItem",
        equipId: "92121",
        formula: ""
    },
    "灵能特工纹章": {
        name: "灵能特工纹章",
        englishName: "TFT17_Item_PsyOpsEmblemItem",
        equipId: "92144",
        formula: ""
    },
    "狙神纹章": {
        name: "狙神纹章",
        englishName: "TFT17_Item_RangedTraitEmblemItem",
        equipId: "92158",
        formula: ""
    },

    // ==========================================
    // Type 6: 奥恩神器 (Ornn Artifacts) (共 48 个)
    // ==========================================
    "3费：奥恩": {
        name: "3费：奥恩",
        englishName: "TFT17_ChampionItem_Chosen_Ornn",
        equipId: "92006",
        formula: ""
    },
    "死亡之蔑": {
        name: "死亡之蔑",
        englishName: "TFT4_Item_OrnnDeathsDefiance",
        equipId: "92302",
        formula: ""
    },
    "永恒凛冬": {
        name: "永恒凛冬",
        englishName: "TFT4_Item_OrnnEternalWinter",
        equipId: "92303",
        formula: ""
    },
    "三相之力": {
        name: "三相之力",
        englishName: "TFT4_Item_OrnnInfinityForce",
        equipId: "92304",
        formula: ""
    },
    "魔蕴": {
        name: "魔蕴",
        englishName: "TFT4_Item_OrnnMuramana",
        equipId: "92305",
        formula: ""
    },
    "黑曜石切割者": {
        name: "黑曜石切割者",
        englishName: "TFT4_Item_OrnnObsidianCleaver",
        equipId: "92306",
        formula: ""
    },
    "兰顿之兆": {
        name: "兰顿之兆",
        englishName: "TFT4_Item_OrnnRanduinsSanctum",
        equipId: "92307",
        formula: ""
    },
    "金币收集者": {
        name: "金币收集者",
        englishName: "TFT4_Item_OrnnTheCollector",
        equipId: "92308",
        formula: ""
    },
    "中娅悖论": {
        name: "中娅悖论",
        englishName: "TFT4_Item_OrnnZhonyasParadox",
        equipId: "92309",
        formula: ""
    },
    "冥火之拥": {
        name: "冥火之拥",
        englishName: "TFT9_Item_OrnnDeathfireGrasp",
        equipId: "92359",
        formula: ""
    },
    "狙击手的专注": {
        name: "狙击手的专注",
        englishName: "TFT9_Item_OrnnHorizonFocus",
        equipId: "92360",
        formula: ""
    },
    "碎舰者": {
        name: "碎舰者",
        englishName: "TFT9_Item_OrnnHullbreaker",
        equipId: "92361",
        formula: ""
    },
    "铁匠手套": {
        name: "铁匠手套",
        englishName: "TFT9_Item_OrnnPrototypeForge",
        equipId: "92362",
        formula: ""
    },
    "诡术师之镜": {
        name: "诡术师之镜",
        englishName: "TFT9_Item_OrnnTrickstersGlass",
        equipId: "92363",
        formula: ""
    },
    "黎明圣盾": {
        name: "黎明圣盾",
        englishName: "TFT_Item_Artifact_AegisOfDawn",
        equipId: "92472",
        formula: ""
    },
    "黄昏圣盾": {
        name: "黄昏圣盾",
        englishName: "TFT_Item_Artifact_AegisOfDusk",
        equipId: "92473",
        formula: ""
    },
    "枯萎珠宝": {
        name: "枯萎珠宝",
        englishName: "TFT_Item_Artifact_BlightingJewel",
        equipId: "92474",
        formula: ""
    },
    "帽子饮品": {
        name: "帽子饮品",
        englishName: "TFT_Item_Artifact_CappaJuice",
        equipId: "92475",
        formula: ""
    },
    "黑暗吸血鬼节杖": {
        name: "黑暗吸血鬼节杖",
        englishName: "TFT_Item_Artifact_CursedVampiricScepter",
        equipId: "92476",
        formula: ""
    },
    "黎明核心": {
        name: "黎明核心",
        englishName: "TFT_Item_Artifact_Dawncore",
        equipId: "92477",
        formula: ""
    },
    "永恒契约": {
        name: "永恒契约",
        englishName: "TFT_Item_Artifact_EternalPact",
        equipId: "92478",
        formula: ""
    },
    "鱼骨头": {
        name: "鱼骨头",
        englishName: "TFT_Item_Artifact_Fishbones",
        equipId: "92479",
        formula: ""
    },
    "禁忌雕像": {
        name: "禁忌雕像",
        englishName: "TFT_Item_Artifact_ForbiddenIdol",
        equipId: "92480",
        formula: ""
    },
    "恶火小斧": {
        name: "恶火小斧",
        englishName: "TFT_Item_Artifact_HellfireHatchet",
        equipId: "92481",
        formula: ""
    },
    "视界专注": {
        name: "视界专注",
        englishName: "TFT_Item_Artifact_HorizonFocus",
        equipId: "92482",
        formula: ""
    },
    "激发之匣": {
        name: "激发之匣",
        englishName: "TFT_Item_Artifact_InnervatingLocket",
        equipId: "92483",
        formula: ""
    },
    "次级镜像人格面具": {
        name: "次级镜像人格面具",
        englishName: "TFT_Item_Artifact_LesserMirroredPersona",
        equipId: "92484",
        formula: ""
    },
    "巫妖之祸": {
        name: "巫妖之祸",
        englishName: "TFT_Item_Artifact_LichBane",
        equipId: "92485",
        formula: ""
    },
    "光盾徽章": {
        name: "光盾徽章",
        englishName: "TFT_Item_Artifact_LightshieldCrest",
        equipId: "92486",
        formula: ""
    },
    "卢登的激荡": {
        name: "卢登的激荡",
        englishName: "TFT_Item_Artifact_LudensTempest",
        equipId: "92487",
        formula: ""
    },
    "修复型回响": {
        name: "修复型回响",
        englishName: "TFT_Item_Artifact_MendingEchoes",
        equipId: "92488",
        formula: ""
    },
    "镜像人格面具": {
        name: "镜像人格面具",
        englishName: "TFT_Item_Artifact_MirroredPersona",
        equipId: "92489",
        formula: ""
    },
    "连指手套": {
        name: "连指手套",
        englishName: "TFT_Item_Artifact_Mittens",
        equipId: "92490",
        formula: ""
    },
    "烁刃": {
        name: "烁刃",
        englishName: "TFT_Item_Artifact_NavoriFlickerblades",
        equipId: "92491",
        formula: ""
    },
    "暗行者之爪": {
        name: "暗行者之爪",
        englishName: "TFT_Item_Artifact_ProwlersClaw",
        equipId: "92492",
        formula: ""
    },
    "疾射火炮": {
        name: "疾射火炮",
        englishName: "TFT_Item_Artifact_RapidFirecannon",
        equipId: "92493",
        formula: ""
    },
    "探索者的护臂": {
        name: "探索者的护臂",
        englishName: "TFT_Item_Artifact_SeekersArmguard",
        equipId: "92494",
        formula: ""
    },
    "暗影木偶": {
        name: "暗影木偶",
        englishName: "TFT_Item_Artifact_ShadowPuppet",
        equipId: "92495",
        formula: ""
    },
    "密银黎明": {
        name: "密银黎明",
        englishName: "TFT_Item_Artifact_SilvermereDawn",
        equipId: "92496",
        formula: ""
    },
    "幽魂弯刀": {
        name: "幽魂弯刀",
        englishName: "TFT_Item_Artifact_SpectralCutlass",
        equipId: "92497",
        formula: ""
    },
    "斯塔缇克电刃": {
        name: "斯塔缇克电刃",
        englishName: "TFT_Item_Artifact_StatikkShiv",
        equipId: "92498",
        formula: ""
    },
    "迷离风衣": {
        name: "迷离风衣",
        englishName: "TFT_Item_Artifact_SuspiciousTrenchCoat",
        equipId: "92499",
        formula: ""
    },
    "飞升护符": {
        name: "飞升护符",
        englishName: "TFT_Item_Artifact_TalismanOfAscension",
        equipId: "92500",
        formula: ""
    },
    "顽强不屈": {
        name: "顽强不屈",
        englishName: "TFT_Item_Artifact_TheIndomitable",
        equipId: "92501",
        formula: ""
    },
    "巨型九头蛇": {
        name: "巨型九头蛇",
        englishName: "TFT_Item_Artifact_TitanicHydra",
        equipId: "92502",
        formula: ""
    },
    "无终恨意": {
        name: "无终恨意",
        englishName: "TFT_Item_Artifact_UnendingDespair",
        equipId: "92503",
        formula: ""
    },
    "虚空护手": {
        name: "虚空护手",
        englishName: "TFT_Item_Artifact_VoidGauntlet",
        equipId: "92504",
        formula: ""
    },
    "智慧末刃": {
        name: "智慧末刃",
        englishName: "TFT_Item_Artifact_WitsEnd",
        equipId: "92505",
        formula: ""
    },

    // ==========================================
    // Type 7: 金鳞龙装备 (Shimmerscale Items) (共 5 个)
    // ==========================================
    "坚定投资器": {
        name: "坚定投资器",
        englishName: "TFT7_Item_ShimmerscaleDeterminedInvestor",
        equipId: "92348",
        formula: ""
    },
    "钻石之手": {
        name: "钻石之手",
        englishName: "TFT7_Item_ShimmerscaleDiamondHands",
        equipId: "92349",
        formula: ""
    },
    "投机者之刃": {
        name: "投机者之刃",
        englishName: "TFT7_Item_ShimmerscaleGamblersBlade",
        equipId: "92350",
        formula: ""
    },
    "无用大宝石": {
        name: "无用大宝石",
        englishName: "TFT7_Item_ShimmerscaleHeartOfGold",
        equipId: "92352",
        formula: ""
    },
    "大亨之铠": {
        name: "大亨之铠",
        englishName: "TFT7_Item_ShimmerscaleMogulsMail",
        equipId: "92354",
        formula: ""
    },

    // ==========================================
    // Type support: 辅助装 (Support Items) - 战斗开始时给友军提供增益 (共 11 个)
    // ==========================================
    "军团圣盾": {
        name: "军团圣盾",
        englishName: "TFT_Item_AegisOfTheLegion",
        equipId: "92470",
        formula: ""
    },
    "女妖面纱": {
        name: "女妖面纱",
        englishName: "TFT_Item_BansheesVeil",
        equipId: "92507",
        formula: ""
    },
    "能量圣杯": {
        name: "能量圣杯",
        englishName: "TFT_Item_Chalice",
        equipId: "92513",
        formula: ""
    },
    "永恒烈焰": {
        name: "永恒烈焰",
        englishName: "TFT_Item_EternalFlame",
        equipId: "92528",
        formula: ""
    },
    "钢铁烈阳之匣": {
        name: "钢铁烈阳之匣",
        englishName: "TFT_Item_LocketOfTheIronSolari",
        equipId: "92543",
        formula: ""
    },
    "月石再生器": {
        name: "月石再生器",
        englishName: "TFT_Item_Moonstone",
        equipId: "92545",
        formula: ""
    },
    "殉道美德": {
        name: "殉道美德",
        englishName: "TFT_Item_RadiantVirtue",
        equipId: "92553",
        formula: ""
    },
    "静止法衣": {
        name: "静止法衣",
        englishName: "TFT_Item_Shroud",
        equipId: "92560",
        formula: ""
    },
    "骑士之誓": {
        name: "骑士之誓",
        englishName: "TFT_Item_SupportKnightsVow",
        equipId: "92567",
        formula: ""
    },
    "基克的先驱": {
        name: "基克的先驱",
        englishName: "TFT_Item_ZekesHerald",
        equipId: "92578",
        formula: ""
    },
    "灵风": {
        name: "灵风",
        englishName: "TFT_Item_Zephyr",
        equipId: "92579",
        formula: ""
    },
} satisfies  Record<string, TFTEquip>
