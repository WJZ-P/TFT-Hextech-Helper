/**
 * 从 public/TFTInfo/S4/chess.ts 提取 S4 棋子数据
 * 生成 _TFT_4_CHESS_DATA，格式对齐 _TFT_16_CHESS_DATA
 *
 * 核心逻辑：
 *   1. 读取 chess.ts，提取 JSON 数组
 *   2. 过滤掉 chessId < 100123 的（非英雄单位：锻造器、野怪等）
 *   3. 把 races/jobs 中文名映射为 UnitOrigin_S4_5 / UnitClass_S4_5 枚举键
 *   4. 输出 TypeScript 代码并写入 src-backend/TFTInfo/chess.ts
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ---- 1. 读取原始棋子数据 ----
const chessPath = path.resolve(__dirname, '../public/TFTInfo/S4/chess.ts');
let chessContent = fs.readFileSync(chessPath, 'utf8');
// 把 export const TFT_4_CHESS = 替换为 module.exports =
chessContent = chessContent.replace(/export const\s+TFT_4_CHESS\s*=\s*/, 'module.exports = ');
const ctx = { module: { exports: {} } };
new vm.Script(chessContent, { filename: chessPath }).runInNewContext(ctx);
const allChess = ctx.module.exports;

// ---- 2. 中文名 → 枚举键 映射表 ----

// UnitOrigin_S4_5 映射 (races)
const originMap = {
    '腥红之月': 'UnitOrigin_S4_5.Cultist',
    '天神': 'UnitOrigin_S4_5.Divine',
    '龙魂': 'UnitOrigin_S4_5.Dragonsoul',
    '永恒之森': 'UnitOrigin_S4_5.Elderwood',
    '玉剑仙': 'UnitOrigin_S4_5.Enlightened',
    '福星': 'UnitOrigin_S4_5.Fortune',
    '灵魂莲华明昼': 'UnitOrigin_S4_5.Spirit',
    '三国猛将': 'UnitOrigin_S4_5.Warlord',
    '浪人': 'UnitOrigin_S4_5.Exile',
    '山海绘卷': 'UnitOrigin_S4_5.Fabled',
    '忍者': 'UnitOrigin_S4_5.Ninja',
    '铁匠': 'UnitOrigin_S4_5.Blacksmith',
    '霸王': 'UnitOrigin_S4_5.Boss',
    '主宰': 'UnitOrigin_S4_5.Daredevil',
    '枭雄': 'UnitOrigin_S4_5.Emperor',
};

// UnitClass_S4_5 映射 (jobs)
const classMap = {
    '宗师': 'UnitClass_S4_5.Adept',
    '刺客': 'UnitClass_S4_5.Assassin',
    '斗士': 'UnitClass_S4_5.Brawler',
    '决斗大师': 'UnitClass_S4_5.Duelist',
    '裁决使': 'UnitClass_S4_5.Executioner',
    '神盾使': 'UnitClass_S4_5.Keeper',
    '魔法师': 'UnitClass_S4_5.Mage',
    '秘术师': 'UnitClass_S4_5.Mystic',
    '神射手': 'UnitClass_S4_5.Sharpshooter',
    '战神': 'UnitClass_S4_5.Slayer',
    '摄魂使': 'UnitClass_S4_5.Syphoner',
    '重装战士': 'UnitClass_S4_5.Vanguard',
};

// ---- 3. 过滤真正的英雄棋子 ----
// chessId >= 100123 且 races 或 jobs 不为空的才是真英雄
const heroes = allChess.filter(c => {
    const id = parseInt(c.chessId, 10);
    // 100123 开始是真英雄（亚托克斯）
    if (id < 100123) return false;
    // races 和 jobs 都为空的是野怪/特殊单位
    const hasRaces = c.races && c.races.trim() !== '';
    const hasJobs = c.jobs && c.jobs.trim() !== '';
    return hasRaces || hasJobs;
});

console.log(`Found ${heroes.length} hero chess pieces for S4.`);

// ---- 4. 按费用分组 ----
const byPrice = {};
for (const hero of heroes) {
    const price = parseInt(hero.price, 10);
    if (!byPrice[price]) byPrice[price] = [];
    byPrice[price].push(hero);
}

// ---- 5. 生成 TypeScript 代码 ----
function parseTraits(racesStr, jobsStr) {
    const origins = [];
    const classes = [];
    const traits = [];

    if (racesStr && racesStr.trim()) {
        for (const r of racesStr.split(',')) {
            const trimmed = r.trim();
            if (originMap[trimmed]) {
                origins.push(originMap[trimmed]);
                traits.push(originMap[trimmed]);
            } else {
                console.warn(`  ⚠ 未知 race: "${trimmed}"`);
            }
        }
    }
    if (jobsStr && jobsStr.trim()) {
        for (const j of jobsStr.split(',')) {
            const trimmed = j.trim();
            if (classMap[trimmed]) {
                classes.push(classMap[trimmed]);
                traits.push(classMap[trimmed]);
            } else {
                console.warn(`  ⚠ 未知 job: "${trimmed}"`);
            }
        }
    }
    return { origins, classes, traits };
}

function formatArray(arr) {
    if (arr.length === 0) return '[]';
    return '[' + arr.join(', ') + ']';
}

let output = '';
const usedNames = new Set();
const priceOrder = [1, 2, 3, 4, 5];

for (const price of priceOrder) {
    const list = byPrice[price];
    if (!list || !list.length) continue;

    output += `    // ${price} 费棋子\n`;

    for (const hero of list) {
        let key = hero.displayName;
        // 处理重名
        if (usedNames.has(key)) {
            key = `${key}_${hero.chessId}`;
        }
        usedNames.add(key);

        const { origins, classes, traits } = parseTraits(hero.races, hero.jobs);
        const attackRange = parseInt(hero.attackRange, 10) || 0;

        const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

        output += `    "${esc(key)}": {\n`;
        output += `        displayName: "${esc(hero.displayName)}",\n`;
        output += `        englishId: "${esc(hero.hero_EN_name)}",\n`;
        output += `        price: ${price},\n`;
        output += `        traits: ${formatArray(traits)},\n`;
        output += `        origins: ${formatArray(origins)},\n`;
        output += `        classes: ${formatArray(classes)},\n`;
        output += `        attackRange: ${attackRange}\n`;
        output += `    },\n`;
    }

    output += '\n';
}

// ---- 6. 写入到目标文件 ----
const targetPath = path.resolve(__dirname, '../src-backend/TFTInfo/chess.ts');
let target = fs.readFileSync(targetPath, 'utf8');

// 检查是否已存在 _TFT_4_CHESS_DATA
if (target.includes('_TFT_4_CHESS_DATA')) {
    console.log('_TFT_4_CHESS_DATA already exists in chess.ts, replacing...');
    // 替换已有块
    target = target.replace(
        /export const _TFT_4_CHESS_DATA[\s\S]*?} satisfies Record<string, TFTUnit>;/,
        `export const _TFT_4_CHESS_DATA = {\n${output.trimEnd()}\n} satisfies Record<string, TFTUnit>;`
    );
} else {
    // 追加到文件末尾
    // 去掉末尾空行
    target = target.trimEnd();
    target += '\n\nexport const _TFT_4_CHESS_DATA = {\n' + output.trimEnd() + '\n} satisfies Record<string, TFTUnit>;\n';
}

fs.writeFileSync(targetPath, target, 'utf8');
console.log(`Successfully wrote _TFT_4_CHESS_DATA with ${heroes.length} heroes to chess.ts`);
