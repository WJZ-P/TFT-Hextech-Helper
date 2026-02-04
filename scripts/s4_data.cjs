const S4_CHAMPIONS = {
    // 1费
    "布兰德": { price: 1, traits: ["龙魂", "魔法师"] },
    "崔斯特": { price: 1, traits: ["腥红之月", "魔法师"] },
    "伊莉丝": { price: 1, traits: ["腥红之月", "神盾使"] },
    "菲奥娜": { price: 1, traits: ["玉剑仙", "决斗大师"] },
    "盖伦": { price: 1, traits: ["三国猛将", "重装战士"] },
    "茂凯": { price: 1, traits: ["永恒之森", "斗士"] },
    "内瑟斯": { price: 1, traits: ["天神", "摄魂使"] },
    "奈德丽": { price: 1, traits: ["三国猛将", "神射手"] },
    "黛安娜": { price: 1, traits: ["灵魂莲华明昼", "刺客"] },
    "塔姆": { price: 1, traits: ["福星", "斗士"] },
    "崔丝塔娜": { price: 1, traits: ["龙魂", "神射手"] },
    "孙悟空": { price: 1, traits: ["天神", "重装战士"] },
    "亚索": { price: 1, traits: ["浪人", "决斗大师"] },

    // 2费
    "安妮": { price: 2, traits: ["福星", "魔法师"] },
    "布隆": { price: 2, traits: ["龙魂", "重装战士"] },
    "嘉文四世": { price: 2, traits: ["三国猛将", "神盾使"] },
    "迦娜": { price: 2, traits: ["玉剑仙", "秘术师"] },
    "贾克斯": { price: 2, traits: ["天神", "决斗大师"] },
    "诺提勒斯": { price: 2, traits: ["山海绘卷", "重装战士"] },
    "派克": { price: 2, traits: ["腥红之月", "战神", "刺客"] },
    "洛": { price: 2, traits: ["永恒之森", "神盾使"] },
    "提莫": { price: 2, traits: ["灵魂莲华明昼", "神射手"] },
    "弗拉基米尔": { price: 2, traits: ["腥红之月", "摄魂使"] },
    "蔚": { price: 2, traits: ["三国猛将", "斗士"] },
    "劫": { price: 2, traits: ["忍者", "战神"] },

    // 3费
    "阿卡丽": { price: 3, traits: ["忍者", "刺客"] },
    "德莱厄斯": { price: 3, traits: ["福星", "战神"] },
    "艾瑞莉娅": { price: 3, traits: ["天神", "玉剑仙", "宗师"] },
    "卡莉丝塔": { price: 3, traits: ["腥红之月", "决斗大师"] },
    "卡特琳娜": { price: 3, traits: ["三国猛将", "福星", "刺客"] },
    "凯南": { price: 3, traits: ["忍者", "神盾使"] },
    "千珏": { price: 3, traits: ["灵魂莲华明昼", "裁决使"] },
    "璐璐": { price: 3, traits: ["永恒之森", "魔法师"] },
    "妮蔻": { price: 3, traits: ["山海绘卷", "秘术师"] },
    "努努": { price: 3, traits: ["永恒之森", "斗士"] },
    "希瓦娜": { price: 3, traits: ["龙魂", "斗士"] },
    "希维尔": { price: 3, traits: ["腥红之月", "神射手"] },
    "维迦": { price: 3, traits: ["永恒之森", "魔法师"] },
    "悠米": { price: 3, traits: ["灵魂莲华明昼", "秘术师"] },

    // 4费
    "亚托克斯": { price: 4, traits: ["腥红之月", "重装战士"] },
    "奥瑞利安·索尔": { price: 4, traits: ["龙魂", "魔法师"] },
    "科加斯": { price: 4, traits: ["山海绘卷", "斗士"] },
    "凯尔": { price: 4, traits: ["天神", "裁决使"] },
    "莫甘娜": { price: 4, traits: ["玉剑仙", "摄魂使"] },
    "奥拉夫": { price: 4, traits: ["龙魂", "战神"] },
    "瑟庄妮": { price: 4, traits: ["福星", "重装战士"] },
    "慎": { price: 4, traits: ["忍者", "宗师", "秘术师"] },
    "泰隆": { price: 4, traits: ["玉剑仙", "刺客"] },
    "泰达米尔": { price: 4, traits: ["三国猛将", "战神", "决斗大师"] },
    "霞": { price: 4, traits: ["永恒之森", "裁决使", "神盾使"] },

    // 5费
    "阿兹尔": { price: 5, traits: ["三国猛将", "枭雄", "神盾使"] },
    "李青": { price: 5, traits: ["天神", "决斗大师"] },
    "奥恩": { price: 5, traits: ["永恒之森", "重装战士", "铁匠"] },
    "莎弥拉": { price: 5, traits: ["主宰", "神射手", "战神"] },
    "瑟提": { price: 5, traits: ["霸王", "斗士"] },
    "斯维因": { price: 5, traits: ["龙魂", "摄魂使"] },
    "永恩": { price: 5, traits: ["浪人", "宗师"] },
    "基兰": { price: 5, traits: ["腥红之月", "秘术师"] },
};

// 羁绊数据 (从 trait.ts 提取并简化)
const S4_TRAITS = {
    // Origins
    "铁匠": { type: "origins", levels: [1] },
    "霸王": { type: "origins", levels: [1] },
    "腥红之月": { type: "origins", levels: [3, 6, 9, 11] }, // 召唤加里奥
    "主宰": { type: "origins", levels: [1] },
    "天神": { type: "origins", levels: [2, 4, 6, 8] },
    "龙魂": { type: "origins", levels: [3, 6, 9] },
    "永恒之森": { type: "origins", levels: [3, 6, 9] },
    "枭雄": { type: "origins", levels: [1] },
    "玉剑仙": { type: "origins", levels: [2, 4, 6, 8] },
    "浪人": { type: "origins", levels: [1, 2] },
    "山海绘卷": { type: "origins", levels: [3] },
    "福星": { type: "origins", levels: [3, 6, 10] }, // 10福星是S4.5的特色吗？好像是6
    "忍者": { type: "origins", levels: [1, 4] },
    "灵魂莲华明昼": { type: "origins", levels: [2, 4, 6] },
    "三国猛将": { type: "origins", levels: [3, 6, 9, 11] }, // 11三国？通常是9

    // Classes
    "宗师": { type: "classes", levels: [2, 3, 4] },
    "刺客": { type: "classes", levels: [2, 4, 6] },
    "斗士": { type: "classes", levels: [2, 4, 6, 8] },
    "决斗大师": { type: "classes", levels: [2, 4, 6, 8] },
    "裁决使": { type: "classes", levels: [2, 3, 4] },
    "神盾使": { type: "classes", levels: [2, 4, 6, 8] },
    "魔法师": { type: "classes", levels: [3, 5, 7, 10] }, // 10法师？
    "秘术师": { type: "classes", levels: [2, 3, 4, 5] },
    "神射手": { type: "classes", levels: [2, 4, 6] },
    "战神": { type: "classes", levels: [3, 6, 9] },
    "摄魂使": { type: "classes", levels: [2, 4, 6] },
    "重装战士": { type: "classes", levels: [2, 4, 6, 8] },
};

module.exports = {
    S4_CHAMPIONS,
    S4_TRAITS
};
