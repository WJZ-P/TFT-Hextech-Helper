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

        traits.push({
            key: traitName, // 暂时使用中文名
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
 * 转换单个英雄
 */
function convertChampion(champ, defaultStarTarget = 2) {
    // 即使 s4_data 里没有数据，也允许生成，只是羁绊算不出来
    const items = champ.items || [];
    return {
        name: champ.name,
        isCore: items.length > 0, // 有装备的就是核心棋子，否则就不是
        items: items,      // 优先使用模板中的值，默认为空数组
        position: champ.position || "", // 优先使用模板中的值，默认为空字符串
        starTarget: champ.starTarget || defaultStarTarget  // 优先使用模板值，否则使用默认值
    };
}

/**
 * 处理单个阵容阶段（计算羁绊并转换英雄）
 */
function processStage(stageData, defaultStarTarget = 2) {
    if (!stageData || !stageData.champions) return null;

    const champions = stageData.champions.map(c => convertChampion(c, defaultStarTarget));
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
            finalComp: processStage(lineupData.finalComp, 3), // finalComp 默认 3 星
            stages: {}
        };

        // 处理各个阶段 (level4 - level10)
        if (lineupData.stages) {
            for (const [levelKey, stageData] of Object.entries(lineupData.stages)) {
                outputData.stages[levelKey] = processStage(stageData, 2); // 过渡阶段默认 2 星
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
