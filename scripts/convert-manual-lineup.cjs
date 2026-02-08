/**
 * 手动阵容转换脚本
 * 
 * 功能：读取 manual-lineup-template.json，结合内置的 S4 英雄数据，
 * 自动计算羁绊并生成游戏可用的阵容文件。
 * 
 * 使用方法：
 * 1. 修改 scripts/manual-lineup-template.json
 * 2. 运行 node scripts/convert-manual-lineup.cjs
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { S4_CHAMPIONS, S4_TRAITS } = require('./s4_data.cjs');

// ==========================================
// 配置
// ==========================================

const INPUT_FILE = path.join(__dirname, 'manual-lineup-template.json');
const OUTPUT_DIR = path.join(__dirname, '../public/lineups/S4');

// ==========================================
// 映射加载
// ==========================================

let TRAIT_NAME_MAP = {};

function loadTraitMap() {
    const map = {};
    const files = [
        path.join(__dirname, '../public/TFTInfo/S4/job.ts'),
        path.join(__dirname, '../public/TFTInfo/S4/race.ts')
    ];

    files.forEach(file => {
        if (fs.existsSync(file)) {
            try {
                let content = fs.readFileSync(file, 'utf8');
                // 去掉 export const ... = 
                content = content.replace(/export\s+const\s+\w+\s*=\s*/, '');
                // 去掉结尾的分号
                content = content.trim().replace(/;$/, '');
                
                const data = JSON.parse(content);
                data.forEach(item => {
                    if (item.name && item.characterid) {
                        map[item.name] = item.characterid;
                    }
                });
                console.log(`✅ 已加载羁绊映射文件: ${path.basename(file)}`);
            } catch (e) {
                console.warn(`⚠️ 解析文件 ${path.basename(file)} 失败，尝试使用正则提取: ${e.message}`);
                // 正则兜底
                let content = fs.readFileSync(file, 'utf8');
                const regex = /"name":\s*"([^"]+)"[\s\S]*?"characterid":\s*"([^"]+)"/g;
                let match;
                let count = 0;
                while ((match = regex.exec(content)) !== null) {
                    map[match[1]] = match[2];
                    count++;
                }
                console.log(`✅ 正则提取到 ${count} 个映射: ${path.basename(file)}`);
            }
        } else {
            console.warn(`⚠️ 未找到文件: ${file}`);
        }
    });
    return map;
}

// ==========================================
// 工具函数
// ==========================================

/**
 * 生成 UUID
 */
function generateUUID() {
    return crypto.randomUUID();
}

/**
 * 计算羁绊信息
 * @param {Array} champions - 英雄列表
 * @returns {Array} - 羁绊列表 [{ key, style, numUnits }]
 */
function calculateTraits(champions) {
    const traitCounts = {};

    // 1. 统计每个羁绊的英雄数量
    const uniqueChampions = new Set();
    
    champions.forEach(champ => {
        if (uniqueChampions.has(champ.name)) return;
        uniqueChampions.add(champ.name);

        const champData = S4_CHAMPIONS[champ.name];
        if (champData && champData.traits) {
            champData.traits.forEach(trait => {
                traitCounts[trait] = (traitCounts[trait] || 0) + 1;
            });
        } else {
            console.warn(`⚠️ 警告: 未找到英雄 [${champ.name}] 的数据，无法计算其羁绊。请在 scripts/s4_data.cjs 中添加该英雄。`);
        }
    });

    // 2. 计算羁绊等级 (Style)
    const traits = [];
    for (const [traitName, count] of Object.entries(traitCounts)) {
        const traitData = S4_TRAITS[traitName];
        if (!traitData) {
            console.warn(`⚠️ 警告: 未知羁绊 [${traitName}]`);
            continue;
        }

        // 计算 Style (0: 无, 1: 铜, 2: 银, 3: 金, 4: 彩)
        let style = 0;
        for (let i = 0; i < traitData.levels.length; i++) {
            if (count >= traitData.levels[i]) {
                style = i + 1;
            }
        }

        // 尝试转换中文名为英文 ID
        const traitKey = TRAIT_NAME_MAP[traitName] || traitName;
        if (!TRAIT_NAME_MAP[traitName]) {
            console.warn(`⚠️ 警告: 未找到羁绊 [${traitName}] 的英文映射，将使用中文名。`);
        }

        traits.push({
            key: traitKey, 
            style: style,
            numUnits: count
        });
    }

    // 按 style 降序排序，style 相同按 numUnits 降序
    traits.sort((a, b) => {
        if (b.style !== a.style) return b.style - a.style;
        return b.numUnits - a.numUnits;
    });

    return traits;
}

/**
 * 转换单个英雄（用于 finalComp）
 * 
 * 输出格式对齐 S16 标准：
 * - 有装备时才输出 items 字段（纯字符串数组），无装备则省略
 * - 有位置时才输出 position，无位置则省略
 * - starTarget 在 finalComp 中始终输出
 */
function convertChampionForFinal(champ, defaultStarTarget = 2) {
    const items = champ.items && champ.items.length > 0 ? champ.items : undefined;
    
    // 构建结果对象，undefined 的字段在 JSON.stringify 时会被自动忽略
    return {
        name: champ.name,
        isCore: !!items,  // 有装备 = 核心棋子
        items: items,     // 无装备时为 undefined，JSON 中不会出现该字段
        position: champ.position || undefined,  // 无位置时省略
        starTarget: champ.starTarget || defaultStarTarget
    };
}

/**
 * 转换单个英雄（用于 stages 过渡阵容）
 * 
 * S16 标准：stages 中的英雄只保留 name, isCore, position 三个字段
 * 不包含 items 和 starTarget（这些只在 finalComp 中出现）
 */
function convertChampionForStage(champ) {
    return {
        name: champ.name,
        isCore: false,  // 过渡阶段的英雄默认都不是核心
        position: champ.position || undefined  // 无位置时省略
    };
}

/**
 * 处理 finalComp（最终成型阵容）
 * 使用 convertChampionForFinal，保留 items 和 starTarget
 */
function processFinalComp(stageData, defaultStarTarget = 3) {
    if (!stageData || !stageData.champions) return null;

    const champions = stageData.champions.map(c => {
        return convertChampionForFinal(c, defaultStarTarget);
    });
    
    const traits = calculateTraits(stageData.champions);

    return {
        champions,
        traits
    };
}

/**
 * 处理 stages 中的过渡阵容
 * S16 标准：过渡阵容只有 name, isCore, position，不含 items/starTarget
 */
function processStageLevel(stageData) {
    if (!stageData || !stageData.champions) return null;

    const champions = stageData.champions.map(c => {
        return convertChampionForStage(c);
    });
    
    const traits = calculateTraits(stageData.champions);

    return {
        champions,
        traits
    };
}

// ==========================================
// 主逻辑
// ==========================================

function main() {
    console.log("🐱 猫娘老师正在启动转换程序...");

    // 加载羁绊映射
    TRAIT_NAME_MAP = loadTraitMap();
    console.log(`📊 共加载 ${Object.keys(TRAIT_NAME_MAP).length} 个羁绊映射关系`);

    // 1. 检查输入文件
    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ 找不到模板文件: ${INPUT_FILE}`);
        return;
    }

    // 2. 读取模板
    let templates;
    try {
        templates = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
    } catch (e) {
        console.error("❌ JSON 解析失败，请检查模板文件格式是否正确。");
        return;
    }

    const lineupNames = Object.keys(templates);
    console.log(`📄 读取到 ${lineupNames.length} 个阵容配置`);

    // 3. 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 4. 遍历处理每个阵容
    for (const [lineupName, lineupData] of Object.entries(templates)) {
        console.log(`\n🔄 正在处理阵容: ${lineupName}`);

        // 构建输出数据结构
        const outputData = {
            id: generateUUID(),
            name: lineupName, // 使用 Key 作为阵容名称
            finalComp: processFinalComp(lineupData.finalComp, 3), // finalComp 默认 3 星
            stages: {}
        };

        // 处理各个阶段 (level3 - level10)
        // S16 标准：stages 中的英雄精简输出，不含 items/starTarget
        if (lineupData.stages) {
            for (const [levelKey, stageData] of Object.entries(lineupData.stages)) {
                outputData.stages[levelKey] = processStageLevel(stageData); 
            }
        }

        // 写入文件
        // 处理文件名中的非法字符，避免写入失败
        const safeFileName = lineupName.replace(/[/\\?%*:|"<>]/g, '-');
        const fileName = `${safeFileName}.json`;
        const outputPath = path.join(OUTPUT_DIR, fileName);
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf8');

        console.log(`  ✅ 已生成: ${fileName}`);
    }

    console.log(`\n🎉 所有阵容转换完成！文件已保存至: ${OUTPUT_DIR}`);
    console.log("提示: 生成的文件中 position, items, isCore 均为空值，请手动填写。");
}

main();
