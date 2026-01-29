/**
 * OP.GG 阵容数据转换脚本
 * 
 * 功能：将从 OP.GG 抓取的原始阵容 JSON 转换为我们自定义的 LineupConfig 格式
 * 
 * 转换规则：
 * 1. 阵容名称直接从输入文件名读取（文件名格式: "神盾使-海克斯霸龙.json"）
 * 2. buildUp 中同一 level 只保留第一个（使用次数最多的）
 * 3. 英雄/装备的英文ID转换为中文名
 * 4. 保留羁绊信息，丢弃 badge 和 stat
 * 
 * 使用方法：node scripts/convert-opgg-lineup.cjs
 */

const fs = require('fs');
const path = require('path');

// ==========================================
// 配置
// ==========================================

// 输入目录：OP.GG 原始数据
const INPUT_DIR = path.join(__dirname, '../public/resources/assets/阵容搭配');
// 输出目录：转换后的阵容配置
const OUTPUT_DIR = path.join(__dirname, '../public/lineups');

// ==========================================
// 英雄英文ID到中文名的映射
// ==========================================

const CHAMPION_EN_TO_CN = {
    // 特殊棋子
    "TFT16_ItemForge": "基础装备锻造器",
    "TFT16_TrainingDummy": "训练假人",
    "TFT16_AnnieTibbers": "提伯斯",
    
    // 1 费棋子
    "TFT16_Tryndamere": "泰达米尔",
    "TFT16_Illaoi": "俄洛伊",
    "TFT16_Bellara": "贝蕾亚",
    "TFT16_Anivia": "艾尼维亚",
    "TFT16_JarvanIV": "嘉文四世",
    "TFT16_Jhin": "烬",
    "TFT16_Caitlyn": "凯特琳",
    "TFT16_KogMaw": "克格莫",
    "TFT16_Lulu": "璐璐",
    "TFT16_Qiyana": "奇亚娜",
    "TFT16_Rumble": "兰博",
    "TFT16_Shen": "慎",
    "TFT16_Sona": "娑娜",
    "TFT16_Viego": "佛耶戈",
    "TFT16_Blitzcrank": "布里茨",
    
    // 2 费棋子
    "TFT16_Aphelios": "厄斐琉斯",
    "TFT16_Ashe": "艾希",
    "TFT16_ChoGath": "科加斯",
    "TFT16_TwistedFate": "崔斯特",
    "TFT16_Ekko": "艾克",
    "TFT16_Graves": "格雷福斯",
    "TFT16_Neeko": "妮蔻",
    "TFT16_Orianna": "奥莉安娜",
    "TFT16_Poppy": "波比",
    "TFT16_RekSai": "雷克塞",
    "TFT16_Sion": "赛恩",
    "TFT16_Teemo": "提莫",
    "TFT16_Tristana": "崔丝塔娜",
    "TFT16_Vi": "蔚",
    "TFT16_Yasuo": "亚索",
    "TFT16_Yorick": "约里克",
    "TFT16_XinZhao": "赵信",
    "TFT16_Zoe": "佐伊",
    
    // 3 费棋子
    "TFT16_Ahri": "阿狸",
    "TFT16_Bard": "巴德",
    "TFT16_Draven": "德莱文",
    "TFT16_Darius": "德莱厄斯",
    "TFT16_Gwen": "格温",
    "TFT16_Jinx": "金克丝",
    "TFT16_Kennen": "凯南",
    "TFT16_KoobAndYuumi": "可酷伯与悠米",
    "TFT16_Leblanc": "乐芙兰",
    "TFT16_Loris": "洛里斯",
    "TFT16_Malzahar": "玛尔扎哈",
    "TFT16_Milio": "米利欧",
    "TFT16_Nautilus": "诺提勒斯",
    "TFT16_Gangplank": "普朗克",
    "TFT16_Sejuani": "瑟庄妮",
    "TFT16_Vayne": "薇恩",
    "TFT16_DrMundo": "蒙多医生",
    "TFT16_Fizz": "菲兹",
    
    // 4 费棋子
    "TFT16_Ambessa": "安蓓萨",
    "TFT16_Belveth": "卑尔维斯",
    "TFT16_Braum": "布隆",
    "TFT16_Diana": "黛安娜",
    "TFT16_Garen": "盖伦",
    "TFT16_Kalista": "卡莉丝塔",
    "TFT16_KaiSa": "卡莎",
    "TFT16_Leona": "蕾欧娜",
    "TFT16_Lissandra": "丽桑卓",
    "TFT16_Lux": "拉克丝",
    "TFT16_MissFortune": "厄运小姐",
    "TFT16_Nasus": "内瑟斯",
    "TFT16_Nidalee": "奈德丽",
    "TFT16_Renekton": "雷克顿",
    "TFT16_Seraphine": "萨勒芬妮",
    "TFT16_Singed": "辛吉德",
    "TFT16_Skarner": "斯卡纳",
    "TFT16_Swain": "斯维因",
    "TFT16_MonkeyKing": "孙悟空",
    "TFT16_Taric": "塔里克",
    "TFT16_Veigar": "维迦",
    "TFT16_Warwick": "沃里克",
    "TFT16_Yone": "永恩",
    "TFT16_Yuumi": "芸阿娜",
    
    // 5 费棋子
    "TFT16_Aatrox": "亚托克斯",
    "TFT16_Annie": "安妮",
    "TFT16_Azir": "阿兹尔",
    "TFT16_Fiddlesticks": "费德提克",
    "TFT16_Ziggs": "吉格斯",
    "TFT16_Galio": "加里奥",
    "TFT16_Zilean": "基兰",
    "TFT16_Kindred": "千珏",
    "TFT16_Lucian": "卢锡安与赛娜",
    "TFT16_Mel": "梅尔",
    "TFT16_Ornn": "奥恩",
    "TFT16_Sett": "瑟提",
    "TFT16_Shyvana": "希瓦娜",
    "TFT16_TahmKench": "塔姆",
    "TFT16_Thresh": "锤石",
    "TFT16_Volibear": "沃利贝尔",
    
    // 特殊/高费羁绊单位（价格 7）
    "TFT16_AurelionSol": "奥瑞利安·索尔",
    "TFT16_BaronNashor": "纳什男爵",
    "TFT16_Ryze": "瑞兹",
    "TFT16_Xayah": "亚恒",
    
    // 特殊棋子 - 海克斯霸龙
    "TFT16_THex": "海克斯霸龙",
    
    // OP.GG 数据中使用的别名（与我们的 key 不同）
    "TFT16_Kaisa": "卡莎",           // 我们用的是 TFT16_KaiSa
    "TFT16_BelVeth": "卑尔维斯",      // 我们用的是 TFT16_Belveth
    "TFT16_Wukong": "孙悟空",         // 我们用的是 TFT16_MonkeyKing
    "TFT16_Yunara": "芸阿娜",         // OP.GG 用的别名
    "TFT16_Kobuko": "可酷伯与悠米",    // OP.GG 用的别名
    "TFT16_Brock": "可酷伯与悠米",    // OP.GG 用的另一个别名
    "TFT16_Briar": "贝蕾亚",          // 注意：不是"布莱尔"，是"贝蕾亚"！
};

// ==========================================
// 装备英文ID到中文名的映射
// ==========================================

const EQUIP_EN_TO_CN = {
    // 基础散件
    "TFT_Item_BFSword": "暴风之剑",
    "TFT_Item_RecurveBow": "反曲之弓",
    "TFT_Item_NeedlesslyLargeRod": "无用大棒",
    "TFT_Item_TearOfTheGoddess": "女神之泪",
    "TFT_Item_ChainVest": "锁子甲",
    "TFT_Item_NegatronCloak": "负极斗篷",
    "TFT_Item_GiantsBelt": "巨人腰带",
    "TFT_Item_SparringGloves": "拳套",
    "TFT_Item_Spatula": "金铲铲",
    "TFT_Item_FryingPan": "金锅锅",
    
    // 合成装备
    "TFT_Item_Deathblade": "死亡之刃",
    "TFT_Item_MadredsBloodrazor": "巨人杀手",
    "TFT_Item_HextechGunblade": "海克斯科技枪刃",
    "TFT_Item_SpearOfShojin": "朔极之矛",
    "TFT_Item_GuardianAngel": "夜之锋刃",
    "TFT_Item_Bloodthirster": "饮血剑",
    "TFT_Item_SteraksGage": "斯特拉克的挑战护手",
    "TFT_Item_InfinityEdge": "无尽之刃",
    "TFT_Item_GuinsoosRageblade": "鬼索的狂暴之刃",
    "TFT_Item_StatikkShiv": "虚空之杖",
    "TFT_Item_TitansResolve": "泰坦的坚决",
    "TFT_Item_RunaansHurricane": "海妖之怒",
    "TFT_Item_Leviathan": "纳什之牙",
    "TFT_Item_LastWhisper": "最后的轻语",
    "TFT_Item_RabadonsDeathcap": "灭世者的死亡之帽",
    "TFT_Item_ArchangelsStaff": "大天使之杖",
    "TFT_Item_Crownguard": "冕卫",
    "TFT_Item_IonicSpark": "离子火花",
    "TFT_Item_Morellonomicon": "莫雷洛秘典",
    "TFT_Item_JeweledGauntlet": "珠光护手",
    "TFT_Item_BlueBuff": "蓝霸符",
    "TFT_Item_FrozenHeart": "圣盾使的誓约",
    "TFT_Item_BrambleVest": "棘刺背心",
    "TFT_Item_GargoyleStoneplate": "石像鬼石板甲",
    "TFT_Item_RedBuff": "日炎斗篷",
    "TFT_Item_NightHarvester": "坚定之心",
    "TFT_Item_DragonsClaw": "巨龙之爪",
    "TFT_Item_AdaptiveHelm": "适应性头盔",
    "TFT_Item_SpectralGauntlet": "薄暮法袍",
    "TFT_Item_Quicksilver": "水银",
    "TFT_Item_Redemption": "振奋盔甲",
    "TFT_Item_WarmogsArmor": "狂徒铠甲",
    "TFT_Item_PowerGauntlet": "强袭者的链枷",
    "TFT_Item_UnstableConcoction": "正义之手",
    "TFT_Item_ThiefsGloves": "窃贼手套",
    "TFT_Item_RapidFireCannon": "红霸符",
    
    // 纹章
    "TFT_Item_ForceOfNature": "金铲铲冠冕",
    "TFT16_Item_BilgewaterEmblemItem": "比尔吉沃特纹章",
    "TFT16_Item_BrawlerEmblemItem": "斗士纹章",
    "TFT16_Item_DefenderEmblemItem": "护卫纹章",
    "TFT16_Item_DemaciaEmblemItem": "德玛西亚纹章",
    "TFT16_Item_FreljordEmblemItem": "弗雷尔卓德纹章",
    "TFT16_Item_GunslingerEmblemItem": "枪手纹章",
    "TFT16_Item_InvokerEmblemItem": "神谕者纹章",
    "TFT16_Item_IoniaEmblemItem": "艾欧尼亚纹章",
    "TFT16_Item_IxtalEmblemItem": "以绪塔尔纹章",
    "TFT16_Item_JuggernautEmblemItem": "主宰纹章",
    "TFT16_Item_LongshotEmblemItem": "狙神纹章",
    "TFT16_Item_MagusEmblemItem": "耀光使纹章",
    "TFT16_Item_NoxusEmblemItem": "诺克萨斯纹章",
    "TFT16_Item_PiltoverEmblemItem": "皮尔特沃夫纹章",
    "TFT16_Item_RapidfireEmblemItem": "迅击战士纹章",
    "TFT16_Item_SlayerEmblemItem": "裁决战士纹章",
    "TFT16_Item_SorcererEmblemItem": "法师纹章",
    "TFT16_Item_VanquisherEmblemItem": "征服者纹章",
    "TFT16_Item_VoidEmblemItem": "虚空纹章",
    "TFT16_Item_WardenEmblemItem": "神盾使纹章",
    "TFT16_Item_YordleEmblemItem": "约德尔人纹章",
    "TFT16_Item_ZaunEmblemItem": "祖安纹章",
    
    // 比尔吉沃特羁绊特殊装备（名称与 TFTProtocol.ts 保持一致）
    "TFT16_Item_Bilgewater_DeadmansDagger": "亡者的短剑",
    "TFT16_Item_Bilgewater_FirstMatesFlintlock": "大副的燧发枪",
    "TFT16_Item_Bilgewater_PileOCitrus": "成堆柑橘",
};

// ==========================================
// 工具函数
// ==========================================

/**
 * 将英雄英文ID转换为中文名
 * @param {string} enId - 英文ID，如 "TFT16_Graves"
 * @returns {string} - 中文名，如 "格雷福斯"
 */
function translateChampion(enId) {
    const cnName = CHAMPION_EN_TO_CN[enId];
    if (!cnName) {
        console.warn(`⚠️ 未知英雄ID: ${enId}`);
        return enId; // 返回原始ID作为fallback
    }
    return cnName;
}

/**
 * 将装备英文ID转换为中文名
 * @param {string} enId - 英文ID，如 "TFT_Item_InfinityEdge"
 * @returns {string|null} - 中文名，如 "无尽之刃"；如果是null则返回null
 */
function translateEquip(enId) {
    if (!enId) return null;
    const cnName = EQUIP_EN_TO_CN[enId];
    if (!cnName) {
        console.warn(`⚠️ 未知装备ID: ${enId}`);
        return enId; // 返回原始ID作为fallback
    }
    return cnName;
}

/**
 * 将 OP.GG 的 cell 坐标转换为 BoardPosition 格式
 * @param {{x: number, y: number}} cell - OP.GG 的坐标格式
 * @returns {string} - BoardPosition 格式，如 "R4_C3"
 */
function convertPosition(cell) {
    // OP.GG 的 y 对应我们的 Row，x 对应 Column
    return `R${cell.y}_C${cell.x}`;
}

/**
 * 转换单个棋子数据
 * @param {Object} unit - OP.GG 的棋子数据
 * @returns {Object} - 转换后的棋子数据
 */
function convertUnit(unit) {
    // 获取英雄ID（可能是 key 或 characterId）
    const championId = unit.key || unit.characterId;
    
    // 过滤掉 null 的装备
    const items = (unit.items || [])
        .filter(item => item !== null)
        .map(item => translateEquip(item));
    
    return {
        name: translateChampion(championId),
        isCore: unit.isCore || false,
        items: items.length > 0 ? items : undefined,
        position: unit.cell ? convertPosition(unit.cell) : undefined,
        starTarget: unit.tier || undefined,
    };
}

/**
 * 对 buildUp 数组按 level 去重，每个 level 只保留第一个
 * @param {Array} buildUp - OP.GG 的 buildUp 数组
 * @returns {Object} - 按 level 分组的阵容，每个 level 只有一个阵容
 */
function deduplicateBuildUp(buildUp) {
    const stages = {};
    const seenLevels = new Set();
    
    for (const stage of buildUp) {
        const level = stage.level;
        
        // 每个 level 只保留第一个（play 次数最多的）
        if (seenLevels.has(level)) {
            continue;
        }
        seenLevels.add(level);
        
        // 转换棋子数据
        const champions = stage.units.map(unit => convertUnit(unit));
        
        stages[`level${level}`] = {
            champions,
            traits: stage.traits, // 保留羁绊信息
        };
    }
    
    return stages;
}

/**
 * 转换单个 OP.GG 阵容文件
 * @param {string} inputPath - 输入文件路径
 * @param {string} outputDir - 输出目录
 */
function convertLineupFile(inputPath, outputDir) {
    console.log(`📄 处理文件: ${path.basename(inputPath)}`);
    
    // 读取原始 JSON
    const rawContent = fs.readFileSync(inputPath, 'utf8');
    const opggData = JSON.parse(rawContent);
    
    // 直接从输入文件名获取阵容名称（去掉 .json 后缀）
    // 文件名格式: "神盾使-海克斯霸龙.json" -> "神盾使-海克斯霸龙"
    const inputFileName = path.basename(inputPath, '.json');
    
    // 阵容名称：将文件名中的 - 替换回空格，用于显示
    const lineupName = inputFileName.replace(/-/g, ' ');
    
    // 输出文件名保持和输入一致（已经是 - 分隔的格式）
    const fileName = inputFileName + '.json';
    const outputPath = path.join(outputDir, fileName);
    
    // 转换最终成型阵容（units）
    const finalChampions = opggData.units.map(unit => convertUnit(unit));
    
    // 转换各阶段过渡阵容（buildUp），去重
    const stages = deduplicateBuildUp(opggData.buildUp || []);
    
    // 构建输出数据
    const outputData = {
        id: opggData.id,
        name: lineupName,
        
        // 最终成型阵容
        finalComp: {
            champions: finalChampions,
            traits: opggData.traits,
        },
        
        // 各阶段过渡阵容
        stages,
    };
    
    // 写入文件
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
    console.log(`✅ 输出: ${fileName}`);
    
    return { inputPath, outputPath, lineupName };
}

/**
 * 主函数：批量转换所有阵容文件
 */
function main() {
    console.log('🚀 开始转换 OP.GG 阵容数据...\n');
    
    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // 检查输入目录是否存在
    if (!fs.existsSync(INPUT_DIR)) {
        console.error(`❌ 输入目录不存在: ${INPUT_DIR}`);
        process.exit(1);
    }
    
    // 获取所有 JSON 文件
    const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));
    
    if (files.length === 0) {
        console.log('⚠️ 没有找到 JSON 文件');
        return;
    }
    
    console.log(`📁 找到 ${files.length} 个阵容文件\n`);
    
    // 转换每个文件
    const results = [];
    for (const file of files) {
        try {
            const result = convertLineupFile(path.join(INPUT_DIR, file), OUTPUT_DIR);
            results.push(result);
        } catch (error) {
            console.error(`❌ 转换失败: ${file}`, error.message);
        }
    }
    
    console.log(`\n🎉 转换完成！共处理 ${results.length} 个文件`);
    console.log(`📂 输出目录: ${OUTPUT_DIR}`);
}

// 运行主函数
main();
