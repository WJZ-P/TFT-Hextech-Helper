//  定义一下棋子相关的一些协议。

//  棋子类型接口
export interface TFTUnit {
    displayName: string;                //  棋子的英雄名称，用于ocr
    cost: number;                       //  棋子的购买花费
    traits: UnitOrigin[] | UnitClass[]; //  棋子所属羁绊，含种族和职业
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

}
