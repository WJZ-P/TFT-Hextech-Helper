/**
 * OP.GG 阵容数据转换脚本
 * 
 * 功能：将从 OP.GG 抓取的原始阵容 JSON 转换为我们自定义的 LineupConfig 格式
 * 
 * 转换规则：
 * 1. 阵容名称直接从输入文件名读取（文件名格式: "神盾使-海克斯霸龙.json"）
 * 2. buildUp 中同一 level 只保留第一个（使用次数最多的）
 * 3. 英雄/装备的英文ID转换为中文名（从 TFTProtocol.ts 动态解析）
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
// TFTProtocol.ts 文件路径
const PROTOCOL_FILE = path.join(__dirname, '../src-backend/TFTProtocol.ts');

// ==========================================
// 从 TFTProtocol.ts 动态解析映射数据
// ==========================================

/**
 * 从 TFTProtocol.ts 解析英雄的 englishId -> 中文名 映射
 * @returns {Record<string, string>}
 */
function parseChampionMapping() {
    const content = fs.readFileSync(PROTOCOL_FILE, 'utf8');
    const mapping = {};
    
    // 匹配模式: "中文名": { ... englishId: "TFT16_Xxx" ... }
    // 使用正则匹配每个英雄定义块
    const championRegex = /"([^"]+)":\s*\{\s*displayName:\s*"[^"]+",\s*englishId:\s*"([^"]+)"/g;
    
    let match;
    while ((match = championRegex.exec(content)) !== null) {
        const cnName = match[1];
        const englishId = match[2];
        mapping[englishId] = cnName;
    }
    
    // 添加 OP.GG 使用的别名（从 CHAMPION_ALIASES 解析）
    const aliasRegex = /CHAMPION_ALIASES[^{]*\{([^}]+)\}/s;
    const aliasMatch = content.match(aliasRegex);
    if (aliasMatch) {
        const aliasContent = aliasMatch[1];
        const aliasItemRegex = /"([^"]+)":\s*"([^"]+)"/g;
        while ((match = aliasItemRegex.exec(aliasContent)) !== null) {
            mapping[match[1]] = match[2];
        }
    }
    
    return mapping;
}

/**
 * 从 TFTProtocol.ts 解析装备的 englishName -> 中文名 映射
 * @returns {Record<string, string>}
 */
function parseEquipMapping() {
    const content = fs.readFileSync(PROTOCOL_FILE, 'utf8');
    const mapping = {};
    
    // 匹配模式: "中文名": { name: "...", englishName: "TFT_Item_Xxx" ... }
    const equipRegex = /"([^"]+)":\s*\{\s*name:\s*"[^"]+",\s*englishName:\s*"([^"]+)"/g;
    
    let match;
    while ((match = equipRegex.exec(content)) !== null) {
        const cnName = match[1];
        const englishNames = match[2].split(',');
        for (const enName of englishNames) {
            mapping[enName.trim()] = cnName;
        }
    }
    
    // 添加 OP.GG 使用的装备别名（从 EQUIP_ALIASES 解析）
    const aliasRegex = /EQUIP_ALIASES[^{]*\{([^}]+)\}/s;
    const aliasMatch = content.match(aliasRegex);
    if (aliasMatch) {
        const aliasContent = aliasMatch[1];
        const aliasItemRegex = /"([^"]+)":\s*"([^"]+)"/g;
        while ((match = aliasItemRegex.exec(aliasContent)) !== null) {
            mapping[match[1]] = match[2];
        }
    }
    
    return mapping;
}

// 初始化映射表
console.log('📖 从 TFTProtocol.ts 解析映射数据...');
const CHAMPION_EN_TO_CN = parseChampionMapping();
const EQUIP_EN_TO_CN = parseEquipMapping();
console.log(`   ✅ 解析到 ${Object.keys(CHAMPION_EN_TO_CN).length} 个英雄映射`);
console.log(`   ✅ 解析到 ${Object.keys(EQUIP_EN_TO_CN).length} 个装备映射`);

// ==========================================
// 工具函数
// ==========================================

/**
 * 将英雄英文ID转换为中文名
 * @param {string} englishId 
 * @returns {string}
 */
function championEnToCn(englishId) {
    const cnName = CHAMPION_EN_TO_CN[englishId];
    if (!cnName) {
        console.warn(`⚠️  未知的英雄ID: ${englishId}`);
        return englishId; // 返回原始ID作为fallback
    }
    return cnName;
}

/**
 * 将装备英文ID转换为中文名
 * @param {string} englishId 
 * @returns {string}
 */
function equipEnToCn(englishId) {
    const cnName = EQUIP_EN_TO_CN[englishId];
    if (!cnName) {
        console.warn(`⚠️  未知的装备ID: ${englishId}`);
        return englishId; // 返回原始ID作为fallback
    }
    return cnName;
}

/**
 * 将 OP.GG 的 cell 坐标转换为 BoardPosition 格式
 * @param {{x: number, y: number}} cell 
 * @returns {string} 例如 "R2_C4"
 */
function cellToBoardPosition(cell) {
    if (!cell || cell.x === undefined || cell.y === undefined) {
        return null;
    }
    // OP.GG 的坐标系：x 是列 (1-7)，y 是行 (1-4)
    return `R${cell.y}_C${cell.x}`;
}

/**
 * 转换单个棋子数据
 * @param {object} unit - OP.GG 的 unit 数据
 * @returns {object} - 转换后的棋子数据
 */
function convertUnit(unit) {
    // OP.GG 使用 "key" 字段存储英雄ID，而不是 "characterId"
    const englishId = unit.key || unit.characterId;
    
    const result = {
        name: championEnToCn(englishId),
        position: cellToBoardPosition(unit.cell),
    };
    
    // 处理装备
    if (unit.items && unit.items.length > 0) {
        const validItems = unit.items.filter(item => item !== null);
        if (validItems.length > 0) {
            result.items = validItems.map(item => equipEnToCn(item));
        }
    }
    
    return result;
}

/**
 * 转换羁绊数据
 * @param {Array} traits - OP.GG 的 traits 数据
 * @returns {Array} - 转换后的羁绊数据
 */
function convertTraits(traits) {
    if (!traits || traits.length === 0) return [];
    
    return traits.map(trait => ({
        key: trait.key,
        style: trait.style,
        numUnits: trait.numUnits
    }));
}

/**
 * 转换 buildUp 数据，每个 level 只保留第一个
 * @param {Array} buildUp - OP.GG 的 buildUp 数据
 * @returns {object} - 按 level 分组的阵容数据
 */
function convertBuildUp(buildUp) {
    if (!buildUp || buildUp.length === 0) return {};
    
    const stages = {};
    const seenLevels = new Set();
    
    for (const stage of buildUp) {
        const level = `level${stage.level}`;
        
        // 每个 level 只保留第一个（使用次数最多的）
        if (seenLevels.has(level)) continue;
        seenLevels.add(level);
        
        stages[level] = {
            champions: stage.units.map(unit => convertUnit(unit)),
            traits: convertTraits(stage.traits),
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
    
    // 转换数据
    const convertedData = {
        id: opggData.id,
        name: lineupName,
        
        // 最终成型阵容（来自 units 字段）
        finalComp: {
            champions: opggData.units.map(unit => convertUnit(unit)),
            traits: convertTraits(opggData.traits),
        },
        
        // 各阶段过渡阵容
        stages: convertBuildUp(opggData.buildUp),
    };
    
    // 写入转换后的 JSON
    fs.writeFileSync(outputPath, JSON.stringify(convertedData, null, 2), 'utf8');
    console.log(`   ✅ 输出: ${fileName}`);
    
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
    
    // 获取所有 JSON 文件
    const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.json'));
    
    if (files.length === 0) {
        console.log('❌ 没有找到任何 JSON 文件');
        return;
    }
    
    console.log(`📁 找到 ${files.length} 个阵容文件\n`);
    
    // 转换每个文件
    const results = [];
    for (const file of files) {
        const inputPath = path.join(INPUT_DIR, file);
        try {
            const result = convertLineupFile(inputPath, OUTPUT_DIR);
            results.push(result);
        } catch (error) {
            console.error(`❌ 转换失败: ${file}`);
            console.error(`   ${error.message}`);
        }
    }
    
    console.log(`\n✨ 转换完成！共处理 ${results.length} 个文件`);
}

// 运行主函数
main();
