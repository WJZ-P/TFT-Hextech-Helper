/**
 * OP.GG 阵容数据转换脚本（多赛季版本）
 *
 * 功能：将从 OP.GG 抓取的原始阵容 JSON 转换为我们自定义的 LineupConfig 格式
 *
 * 转换规则：
 * 1. 阵容名称直接从输入文件名读取（文件名格式: "神盾使-海克斯霸龙.json"）
 * 2. buildUp 中同一 level 只保留第一个（使用次数最多的）
 * 3. 英雄/装备的英文ID转换为中文名
 * 4. 保留羁绊信息，丢弃 badge 和 stat
 *
 * 📂 目录约定：
 *   输入：public/resources/assets/阵容搭配/{S16,S17,...}/ *.json
 *   输出：public/lineups/{S16,S17,...}/ *.json
 *
 * 🔄 英文→中文映射来源：
 *   - 英雄：src-backend/TFTInfo/chess.ts（_TFT_xx_CHESS_DATA 里的 displayName + englishId）
 *   - 装备：src-backend/TFTInfo/equip.ts（_TFT_xx_EQUIP_DATA 里的 name + englishName）
 *   脚本会在启动时**动态解析**这两个文件，自动生成映射表，无需手抄。
 *
 * 使用方法：
 *   node scripts/convert-opgg-lineup.cjs            # 转换所有赛季
 *   node scripts/convert-opgg-lineup.cjs S17        # 只转换 S17
 */

const fs = require('fs');
const path = require('path');

// ==========================================
// 配置
// ==========================================

/** 输入根目录：OP.GG 原始数据，下面按 S16/S17 分子目录 */
const INPUT_ROOT = path.join(__dirname, '../public/resources/assets/阵容搭配');
/** 输出根目录：转换后的阵容配置，同样按赛季分子目录 */
const OUTPUT_ROOT = path.join(__dirname, '../public/lineups');

/** 棋子数据源文件（用于提取英雄映射表） */
const CHESS_DATA_PATH = path.join(__dirname, '../src-backend/TFTInfo/chess.ts');
/** 装备数据源文件（用于提取装备映射表） */
const EQUIP_DATA_PATH = path.join(__dirname, '../src-backend/TFTInfo/equip.ts');

// ==========================================
// 动态映射表构建：从 chess.ts / equip.ts 里自动提取
// ==========================================

/**
 * 从 chess.ts 中提取"英文 ID → 中文名"映射
 *
 * chess.ts 里每个棋子长这样：
 *   "烬": {
 *       displayName: "烬",
 *       englishId: "TFT17_Jhin",
 *       ...
 *   }
 *
 * 我们用正则匹配"中文名" + 随后 N 行内的 englishId 字段，生成反向映射
 *
 * @returns {Record<string, string>} 英文 ID → 中文名
 */
function buildChampionMap() {
    const content = fs.readFileSync(CHESS_DATA_PATH, 'utf8');
    const map = {};

    // 匹配 "中文名": { ... englishId: "英文ID" ... }
    // 使用多行模式，非贪婪匹配到 englishId
    //   [\s\S]*? 允许跨行，非贪婪确保不会吞掉其他棋子
    const regex = /"([^"]+)":\s*\{[\s\S]*?englishId:\s*"([^"]+)"/g;

    let match;
    while ((match = regex.exec(content)) !== null) {
        const chineseName = match[1];
        const englishId = match[2];

        // 跳过"注释掉的"条目（行首有 //）：虽然正则已经尝试过滤，但保险起见再检查一次
        // 通过查找匹配位置所在行是否以 // 开头
        const beforeMatch = content.slice(0, match.index);
        const lineStart = beforeMatch.lastIndexOf('\n') + 1;
        const currentLine = content.slice(lineStart, match.index);
        if (currentLine.trim().startsWith('//')) continue;

        map[englishId] = chineseName;
    }

    return map;
}

/**
 * 从 equip.ts 中提取"英文名 → 中文名"映射
 *
 * equip.ts 里每件装备长这样：
 *   "暴风之剑": {
 *       name: "暴风之剑",
 *       englishName: "TFT_Item_BFSword",
 *       ...
 *   }
 *
 * 同样用正则抓对应关系
 *
 * @returns {Record<string, string>} 英文名 → 中文名
 */
function buildEquipMap() {
    const content = fs.readFileSync(EQUIP_DATA_PATH, 'utf8');
    const map = {};

    // 装备字段是 englishName 而不是 englishId（和英雄不同）
    // englishName 可能包含逗号分隔的多个别名（同一装备在不同 ID 下存在）
    const regex = /"([^"]+)":\s*\{[\s\S]*?englishName:\s*"([^"]+)"/g;

    let match;
    while ((match = regex.exec(content)) !== null) {
        const chineseName = match[1];
        const englishNames = match[2];

        // 跳过注释行
        const beforeMatch = content.slice(0, match.index);
        const lineStart = beforeMatch.lastIndexOf('\n') + 1;
        const currentLine = content.slice(lineStart, match.index);
        if (currentLine.trim().startsWith('//')) continue;

        // 一个装备可能有多个别名，逗号分隔
        for (const enName of englishNames.split(',')) {
            const trimmed = enName.trim();
            if (trimmed) map[trimmed] = chineseName;
        }
    }

    return map;
}

// 启动时构建映射表（一次性）
const CHAMPION_EN_TO_CN = buildChampionMap();
const EQUIP_EN_TO_CN = buildEquipMap();

// 额外的 OP.GG 别名补充（OP.GG 可能用的英文 ID 和官方不一致）
// 把它们 merge 进映射表喵
const OPGG_ALIASES = {
    // === S16 的 OP.GG 别名 ===
    "TFT16_Kaisa": CHAMPION_EN_TO_CN["TFT16_KaiSa"],       // 我们用的是 TFT16_KaiSa
    "TFT16_BelVeth": CHAMPION_EN_TO_CN["TFT16_Belveth"],
    "TFT16_Wukong": CHAMPION_EN_TO_CN["TFT16_MonkeyKing"],
    "TFT16_Yunara": CHAMPION_EN_TO_CN["TFT16_Yuumi"],
    "TFT16_Kobuko": CHAMPION_EN_TO_CN["TFT16_KoobAndYuumi"],
    "TFT16_Brock": CHAMPION_EN_TO_CN["TFT16_KoobAndYuumi"],
    "TFT16_Briar": CHAMPION_EN_TO_CN["TFT16_Bellara"],

    // === S17 的 OP.GG 别名 ===
    "TFT17_RekSai": CHAMPION_EN_TO_CN["TFT17_Reksai"],     // 我们用的小写 s：TFT17_Reksai
};
for (const [k, v] of Object.entries(OPGG_ALIASES)) {
    if (v) CHAMPION_EN_TO_CN[k] = v;
}

/**
 * 判断一个英文 ID 是否是"应该被丢弃"的非棋子单位
 *
 * 云顶数据里存在一些**场上召唤物 / 标记物 / 道具单位**，OP.GG 会把它们也塞进阵容 units，
 * 但它们并不是玩家可以购买/摆放的棋子，也不在我们的 _TFT_xx_CHESS_DATA 里，
 * 应该在转换时过滤掉，否则后端校验阵容会失败。
 *
 * 判断原则喵（特别重要）：
 *   先检查映射表有没有——如果能找到对应中文名，说明是真棋子（比如 TFT17_IvernMinion = "小木灵"），绝不丢弃。
 *   只有映射表找不到时，才看命名模式是否符合"召唤物/道具"的模式。
 *
 * 典型命名规律：
 *   - Summon：牧羊人等羁绊的召唤物（TFT17_Summon）
 *   - Prop：场上临时标记物（TFT17_ShenProp，慎技能标记，注意没有下划线连字）
 *   - FakeUnit：占位的假单位（TFT17_DarkStar_FakeUnit，迷你黑洞）
 *
 * @param {string} enId OP.GG 的英雄 key
 * @returns {boolean} 是否需要丢弃
 */
function isDiscardableUnit(enId) {
    if (!enId) return true;
    // 🛡️ 守门员规则：映射表里有就不丢弃
    if (CHAMPION_EN_TO_CN[enId]) return false;
    // 只对映射表找不到的 ID 做命名匹配
    return /(Summon|Prop|FakeUnit)$/i.test(enId);
}

// ==========================================
// 工具函数
// ==========================================

/**
 * 将英雄英文ID转换为中文名
 * @param {string} enId - 英文ID，如 "TFT17_Jhin"
 * @returns {string} - 中文名，如 "烬"
 */
function translateChampion(enId) {
    const cnName = CHAMPION_EN_TO_CN[enId];
    if (!cnName) {
        console.warn(`  ⚠️ 未知英雄ID: ${enId}`);
        return enId; // fallback：返回原始ID避免丢数据
    }
    return cnName;
}

/**
 * 将装备英文ID转换为中文名
 * @param {string} enId - 英文ID，如 "TFT_Item_InfinityEdge"
 * @returns {string|null} - 中文名；null 输入返回 null
 */
function translateEquip(enId) {
    if (!enId) return null;
    const cnName = EQUIP_EN_TO_CN[enId];
    if (!cnName) {
        console.warn(`  ⚠️ 未知装备ID: ${enId}`);
        return enId;
    }
    return cnName;
}

/**
 * 将 OP.GG 的 cell 坐标转换为 BoardPosition 格式
 * @param {{x: number, y: number}} cell
 * @returns {string} "R{y}_C{x}"
 */
function convertPosition(cell) {
    return `R${cell.y}_C${cell.x}`;
}

/**
 * 转换单个棋子数据
 * @returns {Object|null} 转换后的棋子数据；如果是召唤物等非棋子单位，返回 null（会被调用方过滤）
 */
function convertUnit(unit) {
    // OP.GG 的英雄 ID 可能放在 key 或 characterId 字段
    const championId = unit.key || unit.characterId;

    // 过滤掉召唤物/道具等非棋子单位——它们不可购买，也不在 chess.ts 字典中
    if (isDiscardableUnit(championId)) {
        return null;
    }

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
 * 对 buildUp 数组按 level 去重，每个 level 只保留第一个（出现次数最多的）
 * 同时把召唤物等非棋子单位过滤掉
 */
function deduplicateBuildUp(buildUp) {
    const stages = {};
    const seenLevels = new Set();

    for (const stage of buildUp) {
        const level = stage.level;
        if (seenLevels.has(level)) continue;
        seenLevels.add(level);

        // .filter(Boolean) 把 convertUnit 返回 null 的条目（召唤物等）过滤掉
        const champions = stage.units.map(convertUnit).filter(Boolean);
        stages[`level${level}`] = {
            champions,
            traits: stage.traits,
        };
    }

    return stages;
}

/**
 * 转换单个 OP.GG 阵容文件
 *
 * @param {string} inputPath 输入文件绝对路径
 * @param {string} outputDir 输出目录（某个赛季的子目录）
 * @param {string} season 赛季 ID，如 "S17"，用于写入阵容 JSON 的 season 字段
 */
function convertLineupFile(inputPath, outputDir, season) {
    const baseName = path.basename(inputPath);
    console.log(`  📄 ${baseName}`);

    const rawContent = fs.readFileSync(inputPath, 'utf8');
    const opggData = JSON.parse(rawContent);

    // 阵容名：文件名去掉 .json 后缀
    // 文件名里的 - 替换成空格用于显示（e.g. "重装战士-乐芙兰" → "重装战士 乐芙兰"）
    const inputFileName = path.basename(inputPath, '.json');
    const lineupName = inputFileName.replace(/-/g, ' ');

    const outputPath = path.join(outputDir, inputFileName + '.json');

    // 转换最终成型阵容（units）和各阶段（buildUp）
    // filter(Boolean) 把召唤物等非棋子过滤掉
    const finalChampions = opggData.units.map(convertUnit).filter(Boolean);
    const stages = deduplicateBuildUp(opggData.buildUp || []);

    const outputData = {
        id: opggData.id,
        name: lineupName,
        season,   // 🌟 标记阵容所属赛季，方便后端按 SeasonRegistry 映射到对应棋子/装备数据
        finalComp: {
            champions: finalChampions,
            traits: opggData.traits,
        },
        stages,
    };

    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');
    return { inputPath, outputPath, lineupName };
}

/**
 * 处理单个赛季目录下的所有阵容
 * @param {string} season 赛季 ID，如 "S17"
 */
function convertSeason(season) {
    const inputDir = path.join(INPUT_ROOT, season);
    const outputDir = path.join(OUTPUT_ROOT, season);

    if (!fs.existsSync(inputDir)) {
        console.warn(`⚠️ 跳过 ${season}：输入目录不存在（${inputDir}）`);
        return { season, count: 0 };
    }

    const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
        console.log(`  （${season} 目录为空）`);
        return { season, count: 0 };
    }

    // 确保输出目录存在
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`\n======== ${season} （${files.length} 个阵容） ========`);

    let successCount = 0;
    for (const file of files) {
        try {
            convertLineupFile(path.join(inputDir, file), outputDir, season);
            successCount++;
        } catch (error) {
            console.error(`  ❌ 转换失败: ${file}\n     ${error.message}`);
        }
    }

    console.log(`✨ ${season} 完成：${successCount}/${files.length}`);
    return { season, count: successCount };
}

/**
 * 主入口
 * 支持通过命令行参数指定只转换某个赛季：
 *   node scripts/convert-opgg-lineup.cjs        # 所有赛季
 *   node scripts/convert-opgg-lineup.cjs S17    # 只 S17
 */
function main() {
    console.log('🚀 OP.GG 阵容转换脚本 - 多赛季版');
    console.log(`📘 映射表已加载：${Object.keys(CHAMPION_EN_TO_CN).length} 个英雄 / ${Object.keys(EQUIP_EN_TO_CN).length} 个装备\n`);

    // 命令行参数：第一个位置参数是指定的赛季（可选）
    const targetSeason = process.argv[2];

    let seasonsToProcess;
    if (targetSeason) {
        seasonsToProcess = [targetSeason];
    } else {
        // 自动发现输入根目录下的所有赛季子文件夹
        if (!fs.existsSync(INPUT_ROOT)) {
            console.error(`❌ 输入根目录不存在: ${INPUT_ROOT}`);
            process.exit(1);
        }
        seasonsToProcess = fs.readdirSync(INPUT_ROOT)
            .filter(entry => {
                const entryPath = path.join(INPUT_ROOT, entry);
                return fs.statSync(entryPath).isDirectory();
            })
            .sort();
    }

    if (seasonsToProcess.length === 0) {
        console.warn('⚠️ 没有找到任何赛季目录');
        return;
    }

    // 逐个处理
    const results = seasonsToProcess.map(convertSeason);

    // 汇总
    const total = results.reduce((sum, r) => sum + r.count, 0);
    console.log(`\n🎉 全部完成！共转换 ${total} 个阵容`);
    console.log(`📂 输出根目录: ${OUTPUT_ROOT}`);
}

main();
