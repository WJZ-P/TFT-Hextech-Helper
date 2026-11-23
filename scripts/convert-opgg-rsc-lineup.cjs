/**
 * OP.GG 阵容数据转换脚本（S18 起的网页 RSC 格式）
 *
 * S18 起 OP.GG 的阵容详情页不再走老的 JSON 接口，抓包拿到的是 Next.js 的 RSC 数据流：
 *   0:{...请求信息...}
 *   1:{"ok":true,"data":{"comp":{...},"guide":{...},...}}
 * 其中字符串里可能带真实换行；重复出现的对象只写一次，之后用 "$1:data:comp:units:0:traits:1" 这样的路径引用。
 * 老格式（S16/S17）请继续用 scripts/convert-opgg-lineup.cjs。
 *
 * 转换规则（输出格式与 convert-opgg-lineup.cjs 一致，即 LineupConfig）：
 *   - 阵容名：输入文件名，"-" 换成空格（如 "召唤师-深红锋喙鸟" → "召唤师 深红锋喙鸟"）
 *   - finalComp：data.comp.units —— 星级、是否核心、装备；站位来自 data.guide.positioning
 *       positioning 是 4 行 x 7 列、从前排到后排编号（cell = 行 * 7 + 列，第 0 行是前排），
 *       对应我们的 R1（前排）~ R4（后排，靠近备战席）
 *   - stages.levelN：data.guide.timeline.levels 中该等级出场率最高的 N 个棋子（列表已按出场率降序）
 *   - 羁绊：按棋子身上的羁绊统计人数，用羁绊的 styleEffects 算出激活档位，格式 { key, style, numUnits }
 *   - 棋子 / 装备：OP.GG 数据直接带中文名，用 S18 棋子数据、装备表校验；
 *     拉克丝的羁绊形态（"拉克丝 (魔女)"）统一记为"拉克丝"；不在可购买棋子里的单位（召唤物等）丢弃
 *
 * 📂 目录约定：
 *   输入：public/resources/assets/阵容搭配/{S18,...}/ *.json（抓包原始数据）
 *   输出：public/lineups/{S18,...}/ *.json
 *
 * 使用方法：
 *   node scripts/convert-opgg-rsc-lineup.cjs        # 默认转换 S18
 *   node scripts/convert-opgg-rsc-lineup.cjs S18
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const INPUT_ROOT = path.join(ROOT, 'public/resources/assets/阵容搭配');
const OUTPUT_ROOT = path.join(ROOT, 'public/lineups');
const BOARD_COLUMNS = 7;

/** 读取 public/TFTInfo/<season>/xxx.ts 里导出的原始数组 */
function loadRawData(season, name) {
    const file = path.join(ROOT, 'public/TFTInfo', season, `${name}.ts`);
    const code = fs.readFileSync(file, 'utf8').replace(/export const\s+\w+\s*=\s*/, 'module.exports = ');
    const context = { module: { exports: {} } };
    new vm.Script(code, { filename: file }).runInNewContext(context);
    return context.module.exports;
}

/** 装备表（src-backend/TFTInfo/equip.ts）里某个赛季的全部 key */
function loadEquipTableKeys(season) {
    const text = fs.readFileSync(path.join(ROOT, 'src-backend/TFTInfo/equip.ts'), 'utf8');
    const num = season.replace(/^S/, '');
    const start = text.indexOf(`export const _TFT_${num}_EQUIP_DATA`);
    if (start < 0) throw new Error(`equip.ts 中没有 _TFT_${num}_EQUIP_DATA`);
    const end = text.indexOf('satisfies', start);
    return new Set([...text.slice(start, end).matchAll(/^\s*"([^"]+)":\s*\{/gm)].map(m => m[1]));
}

/** 解析抓包得到的 RSC 数据流，返回 "1:" 行的对象（已展开 $1: 引用） */
function parseRscPayload(file) {
    const text = fs.readFileSync(file, 'utf8');
    const start = text.indexOf('\n1:{');
    if (start < 0) throw new Error('文件为空或缺少 "1:" 数据行');
    // "1:" 行到下一个行号标记（如 "\n0:{"）为止：有的抓包结果把同一份响应存了两遍
    const rest = text.slice(start + 3);
    const nextRow = rest.search(/\r?\n[0-9a-f]+:[{[]/);
    const row = nextRow >= 0 ? rest.slice(0, nextRow) : rest;
    let root;
    try {
        root = JSON.parse(row.replace(/\r?\n/g, '\\n').replace(/(\\n)+$/, ''));
    } catch (e) {
        throw new Error(`数据不完整（JSON 在第 ${text.length} 个字符处被截断，可能是抓包时没抓完整）`);
    }
    const resolve = node => {
        if (typeof node === 'string' && node.startsWith('$1:')) {
            let cur = root;
            for (const k of node.slice(3).split(':')) cur = cur?.[/^\d+$/.test(k) ? Number(k) : k];
            return resolve(cur);
        }
        if (Array.isArray(node)) return node.map(resolve);
        if (node && typeof node === 'object') {
            for (const k of Object.keys(node)) node[k] = resolve(node[k]);
        }
        return node;
    };
    return resolve(root);
}

function convertSeason(season) {
    const inputDir = path.join(INPUT_ROOT, season);
    const outputDir = path.join(OUTPUT_ROOT, season);
    if (!fs.existsSync(inputDir)) throw new Error(`输入目录不存在: ${inputDir}`);
    fs.mkdirSync(outputDir, { recursive: true });

    // 校验用的名字表
    // 棋子优先按英文 ID 映射（OP.GG 的 key 与腾讯数据的 hero_EN_name 是同一套资源名），
    // 不依赖中文名：有的抓包文件编码出错，中文名会变成乱码
    const purchasable = loadRawData(season, 'chess').filter(c => Number(c.price) >= 1 && Number(c.price) <= 5);
    const stripForm = name => String(name || '').replace(/\s*\(.*\)$/, '').trim();
    const chessNames = new Set(purchasable.map(c => stripForm(c.displayName)));
    const chessNameByKey = new Map(purchasable.map(c => [c.hero_EN_name, stripForm(c.displayName)]));
    const equipKeys = loadEquipTableKeys(season);
    const equipNameByDa = new Map(loadRawData(season, 'equip').map(e => [e.englishName, e.name]));

    const warnings = new Set();
    const championName = unit => {
        const byKey = chessNameByKey.get(unit.key);
        if (byKey) return byKey;
        const name = stripForm(unit.name);
        if (chessNames.has(name)) return name;
        warnings.add(`未知或不可购买的棋子（已丢弃）: ${unit.name} (${unit.key})`);
        return null;
    };
    const equipName = item => {
        for (const candidate of [item.name, equipNameByDa.get(item.key)]) {
            if (candidate && equipKeys.has(candidate)) return candidate;
        }
        warnings.add(`未知装备（已丢弃）: ${item.name} (${item.key})`);
        return null;
    };

    const results = { ok: [], failed: [] };
    for (const file of fs.readdirSync(inputDir).filter(f => f.endsWith('.json'))) {
        const inputPath = path.join(inputDir, file);
        try {
            const { data } = parseRscPayload(inputPath);
            if (!data?.comp?.units?.length) throw new Error('缺少 data.comp.units');

            // 每个棋子的羁绊定义（用于统计激活档位），从所有出现过的棋子对象里收集
            const traitsByUnit = new Map();
            const collect = node => {
                if (Array.isArray(node)) return node.forEach(collect);
                if (!node || typeof node !== 'object') return;
                if (typeof node.key === 'string' && Array.isArray(node.traits) && node.traits.every(t => t && t.key)) {
                    if (!traitsByUnit.has(node.key)) traitsByUnit.set(node.key, node.traits);
                }
                Object.values(node).forEach(collect);
            };
            collect(data);

            const computeTraits = unitKeys => {
                const counts = new Map();
                for (const key of new Set(unitKeys)) {
                    for (const trait of traitsByUnit.get(key) || []) {
                        const entry = counts.get(trait.key) || { trait, numUnits: 0 };
                        entry.numUnits++;
                        counts.set(trait.key, entry);
                    }
                }
                return [...counts.values()]
                    .map(({ trait, numUnits }) => {
                        const effect = (trait.styleEffects || []).find(s => numUnits >= s.minUnits && numUnits <= s.maxUnits);
                        return { key: trait.key, style: effect ? effect.style : 0, numUnits };
                    })
                    .sort((a, b) => b.style - a.style || b.numUnits - a.numUnits);
            };

            // 站位：cell → R{行}_C{列}
            const cellByUnit = new Map(
                (data.guide?.positioning?.units || [])
                    .filter(u => Number.isInteger(u.cell))
                    .map(u => [u.unit.key, u.cell])
            );
            const positionOf = key => {
                const cell = cellByUnit.get(key);
                return cell === undefined ? undefined : `R${Math.floor(cell / BOARD_COLUMNS) + 1}_C${(cell % BOARD_COLUMNS) + 1}`;
            };

            // 最终阵容
            const coreByUnit = new Map();
            const finalUnits = data.comp.units.filter(u => championName(u));
            const finalChampions = finalUnits.map(u => {
                coreByUnit.set(u.key, !!u.isCore);
                const items = (u.items || []).map(equipName).filter(Boolean);
                return {
                    name: championName(u),
                    isCore: !!u.isCore,
                    items: items.length > 0 ? items : undefined,
                    position: positionOf(u.key),
                    starTarget: u.star || undefined,
                };
            });

            // 各等级阵容
            const toStage = units => ({
                champions: units.map(u => ({
                    name: championName(u),
                    isCore: coreByUnit.get(u.key) ?? false,
                    position: positionOf(u.key),
                })),
                traits: computeTraits(units.map(u => u.key)),
            });
            const stageSources = {};
            // 1) 时间线：该等级出场率最高的 N 个棋子
            for (const level of data.guide?.timeline?.levels || []) {
                const units = [...level.units]
                    .sort((a, b) => (b.appearanceRate ?? 0) - (a.appearanceRate ?? 0))
                    .map(e => e.unit)
                    .filter(u => championName(u))
                    .slice(0, level.level);
                if (units.length) stageSources[level.level] = units;
            }
            // 2) 时间线没有的等级（有的阵容 OP.GG 没有时间线数据，9/10 级时间线也常缺）：
            //    用该等级最常见的成型阵容（finishBoards 的第一套）
            for (const finish of data.guide?.finishBoards || []) {
                if (stageSources[finish.level] || !finish.boards?.length) continue;
                const units = finish.boards[0].units.filter(u => championName(u)).slice(0, finish.level);
                if (units.length) stageSources[finish.level] = units;
            }
            // 3) OP.GG 没有前期数据的阵容（时间线缺失，成型阵容只从 7/8 级开始）：
            //    从已知的最低等级往下逐级推算到 4 级，每降一级去掉一个棋子——
            //    优先去掉费用最高的（前期拿不到），同费用先去掉非核心棋子，保证每一级都是上一级的子集
            const derivedFrom = {};
            const knownLevels = Object.keys(stageSources).map(Number).sort((a, b) => a - b);
            if (knownLevels.length) {
                for (let level = knownLevels[0] - 1; level >= 4; level--) {
                    const higher = stageSources[level + 1];
                    const dropOrder = higher
                        .map((unit, index) => ({ unit, index }))
                        .sort((a, b) =>
                            (b.unit.cost ?? 0) - (a.unit.cost ?? 0)
                            || Number(coreByUnit.get(a.unit.key) ?? false) - Number(coreByUnit.get(b.unit.key) ?? false)
                            || b.index - a.index
                        );
                    const dropped = new Set(dropOrder.slice(0, Math.max(0, higher.length - level)).map(x => x.index));
                    stageSources[level] = higher.filter((_, index) => !dropped.has(index));
                    derivedFrom[level] = derivedFrom[level + 1] ?? (level + 1);
                }
            }

            const stages = {};
            for (const level of Object.keys(stageSources).map(Number).sort((a, b) => a - b)) {
                if (level < 4 || level > 10) continue;
                const stage = toStage(stageSources[level]);
                if (derivedFrom[level]) {
                    stage.tips = `OP.GG 没有该阵容的前期数据，由 ${derivedFrom[level]} 级阵容推算（优先保留低费和核心棋子）`;
                }
                stages[`level${level}`] = stage;
            }
            // 3) level8 是必填项：都没有时用最终阵容代替
            if (!stages.level8) {
                stages.level8 = {
                    champions: finalChampions.map(({ name, isCore, position }) => ({ name, isCore, position })),
                    traits: computeTraits(finalUnits.map(u => u.key)),
                };
            }

            const lineupName = path.basename(file, '.json').replace(/-/g, ' ');
            const output = {
                id: crypto.createHash('md5').update(data.comp.id || lineupName).digest('hex'),
                name: lineupName,
                season,
                finalComp: {
                    champions: finalChampions,
                    traits: computeTraits(finalUnits.map(u => u.key)),
                },
                stages,
            };
            fs.writeFileSync(path.join(outputDir, file), JSON.stringify(output, null, 2), 'utf8');
            const levelList = Object.keys(stages)
                .map(k => k.replace('level', '') + (stages[k].tips ? '*' : ''))
                .join('/');
            results.ok.push(`${lineupName}（${finalChampions.length} 个棋子，等级 ${levelList}）`);
        } catch (e) {
            results.failed.push(`${file}: ${e.message}`);
        }
    }

    console.log(`\n======== ${season} ========`);
    console.log(`✅ 转换成功 ${results.ok.length} 个 → ${path.relative(ROOT, outputDir)}`);
    results.ok.forEach(s => console.log(`   ${s}`));
    if (results.failed.length) {
        console.log(`❌ 转换失败 ${results.failed.length} 个`);
        results.failed.forEach(s => console.log(`   ${s}`));
    }
    if (warnings.size) {
        console.log(`⚠️ 提示`);
        warnings.forEach(s => console.log(`   ${s}`));
    }
}

const seasons = process.argv.slice(2);
(seasons.length ? seasons : ['S18']).forEach(convertSeason);
