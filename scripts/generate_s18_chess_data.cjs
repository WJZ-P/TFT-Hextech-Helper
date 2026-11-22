/**
 * 生成 S18（自然之力）棋子与羁绊数据
 *
 * 数据来源（腾讯官方云顶数据，返回当前赛季）：
 *   - 棋子：https://game.gtimg.cn/images/lol/act/img/tft/js/chess.js
 *   - 种族：https://game.gtimg.cn/images/lol/act/img/tft/js/race.js
 *   - 职业：https://game.gtimg.cn/images/lol/act/img/tft/js/job.js
 *
 * 产出：
 *   1. public/TFTInfo/S18/{chess,race,job}.ts —— 接口原始数据，原样保存
 *   2. src-backend/TFTInfo/trait.ts 中的 UnitOrigin_S18 / UnitClass_S18 / TFT_18_TRAIT_DATA
 *   3. src-backend/TFTInfo/chess.ts 中的 _TFT_18_CHESS_DATA
 *   2、3 写在 <generated:S18-...> 标记之间，重跑会整段替换，写法与 S17 一致。
 *
 * 规则：
 *   - 只收 1~5 费可购买的棋子（0 费是沙兵、生命花这类召唤物 / 形态）
 *   - 拉克丝有 1 个基础形态和 9 个羁绊形态（"拉克丝 (魔女)" 等），商店里买到的是基础形态，只收基础形态
 *   - englishId 用 S18 的资源名（如 DA_18_Akali_AD），与虚幻客户端日志里的名字一致
 *   - 枚举 key 取自羁绊资源名（DA_18_Blackthorn → Blackthorn）
 *   - 激活人数为 0 的羁绊（如"日月双蚀"，没有激活节点）levels 记为 []
 *
 * 用法（在项目根目录）：node scripts/generate_s18_chess_data.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DATA_BASE_URL = 'https://game.gtimg.cn/images/lol/act/img/tft/js';
const RAW_DIR = path.join(ROOT, 'public/TFTInfo/S18');
const TRAIT_FILE = path.join(ROOT, 'src-backend/TFTInfo/trait.ts');
const CHESS_FILE = path.join(ROOT, 'src-backend/TFTInfo/chess.ts');

function download(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, res => {
            if (res.statusCode !== 200) {
                res.resume();
                reject(new Error(`HTTP ${res.statusCode}: ${url}`));
                return;
            }
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))));
        });
        req.on('error', reject);
        req.setTimeout(20000, () => req.destroy(new Error(`timeout: ${url}`)));
    });
}

const toCrlf = text => text.replace(/\r?\n/g, '\r\n');
const esc = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

function saveRaw(name, constName, payload) {
    const url = `${DATA_BASE_URL}/${name}.js`;
    const header = [
        `// S18（自然之力）${name} 原始数据，由 scripts/generate_s18_chess_data.cjs 生成，请勿手改`,
        `// 来源: ${url}`,
        `// season=${payload.season} version=${payload.version} 数据时间=${payload.time}`,
        '',
    ].join('\n');
    fs.writeFileSync(path.join(RAW_DIR, `${name}.ts`), toCrlf(`${header}export const ${constName} = ${JSON.stringify(payload.data, null, 4)}\n`));
}

/** 羁绊资源名 → 枚举 key：DA_18_Blackthorn → Blackthorn，DA_AluneUniqueTrait18 → AluneUniqueTrait */
function enumKeyOf(characterId) {
    return characterId
        .replace(/^DA_18_/, '')
        .replace(/^DA_/, '')
        .replace(/18$/, '')
        .replace(/_/g, '');
}

/** 把生成的内容写到文件里 begin/end 标记之间；没有标记时追加到文件末尾 */
function writeGeneratedBlock(file, tag, content) {
    const begin = `// <generated:${tag}>`;
    const end = `// </generated:${tag}>`;
    const current = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const block = `${begin}\n${content}\n${end}`;
    const b = current.indexOf(begin);
    const e = current.indexOf(end);
    const updated = b >= 0 && e > b
        ? current.slice(0, b) + block + current.slice(e + end.length)
        : `${current.replace(/\n*$/, '\n')}\n${block}\n`;
    fs.writeFileSync(file, toCrlf(updated));
}

function levelsOf(trait) {
    return Object.keys(trait.level || {}).map(Number).filter(n => n > 0).sort((a, b) => a - b);
}

async function main() {
    const [chess, race, job] = await Promise.all(['chess', 'race', 'job'].map(n => download(`${DATA_BASE_URL}/${n}.js`)));
    console.log(`数据版本: season=${chess.season} version=${chess.version}；棋子 ${chess.data.length}，种族 ${race.data.length}，职业 ${job.data.length}`);

    fs.mkdirSync(RAW_DIR, { recursive: true });
    saveRaw('chess', 'TEST_TFT_S18_CHESS', chess);
    saveRaw('race', 'TEST_TFT_S18_RACE', race);
    saveRaw('job', 'TEST_TFT_S18_JOB', job);

    // ---------------- 羁绊 ----------------
    const originKey = new Map();   // 中文名 → 枚举 key
    const classKey = new Map();
    const enumLines = (list, keyMap, idField) => list
        .slice()
        .sort((a, b) => Number(a[idField]) - Number(b[idField]))
        .map(t => {
            const key = enumKeyOf(t.characterid);
            keyMap.set(t.name, key);
            return `    ${key} = "${esc(t.name)}",`.padEnd(44) + `// ${t[idField]} ${t.characterid}`;
        });
    const originEnum = enumLines(race.data, originKey, 'raceId');
    const classEnum = enumLines(job.data, classKey, 'jobId');

    const traitDataLines = [
        ...race.data.map(t => ({ t, type: 'origins', id: t.raceId })),
        ...job.data.map(t => ({ t, type: 'classes', id: t.jobId })),
    ].sort((a, b) => (a.type === b.type ? Number(a.id) - Number(b.id) : a.type === 'origins' ? -1 : 1))
        .map(({ t, type, id }) => `    "${esc(t.name)}": { id: "${id}", name: "${esc(t.name)}", type: "${type}", levels: [${levelsOf(t).join(', ')}] },`);

    writeGeneratedBlock(TRAIT_FILE, 'S18-trait', [
        '// =====================================================================================',
        `// S18: 自然之力（虚幻客户端），由 scripts/generate_s18_chess_data.cjs 生成，请勿手改`,
        `// 来源: ${DATA_BASE_URL}/{race,job}.js（season=${race.season} version=${race.version}）`,
        '// =====================================================================================',
        'export enum UnitOrigin_S18 {',
        ...originEnum,
        '}',
        '',
        'export enum UnitClass_S18 {',
        ...classEnum,
        '}',
        '',
        '/**',
        ' * S18 羁绊详细数据 Map（key 为中文名）',
        ' * @description levels 为空表示该羁绊没有激活节点（如"日月双蚀"）',
        ' */',
        'export const TFT_18_TRAIT_DATA: Record<string, TraitData> = {',
        ...traitDataLines,
        '};',
    ].join('\n'));

    // ---------------- 棋子 ----------------
    const traitRef = name => {
        if (originKey.has(name)) return { ref: `UnitOrigin_S18.${originKey.get(name)}`, kind: 'origin' };
        if (classKey.has(name)) return { ref: `UnitClass_S18.${classKey.get(name)}`, kind: 'class' };
        throw new Error(`未知羁绊: ${name}`);
    };
    const splitNames = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);

    const units = chess.data
        .filter(c => Number(c.price) >= 1 && Number(c.price) <= 5)
        .filter(c => !/\s*\(.*\)$/.test(c.displayName))   // 拉克丝的羁绊形态，只保留基础形态
        .sort((a, b) => Number(a.price) - Number(b.price) || Number(a.chessId) - Number(b.chessId));

    const seen = new Set();
    let body = '    //  特殊棋子（魔像、锻造器、训练假人等）跨赛季共用\n    ...TFT_SPECIAL_CHESS,\n';
    for (let price = 1; price <= 5; price++) {
        const list = units.filter(c => Number(c.price) === price);
        body += `\n    // ====================================================================\n`;
        body += `    // ${price} 费棋子 (共 ${list.length} 个)\n`;
        body += `    // ====================================================================\n`;
        for (const c of list) {
            if (seen.has(c.displayName)) throw new Error(`重复的棋子名: ${c.displayName}`);
            seen.add(c.displayName);
            const origins = splitNames(c.races).map(traitRef);
            const classes = splitNames(c.jobs).map(traitRef);
            const all = [...origins, ...classes].map(x => x.ref);
            body += `    "${esc(c.displayName)}": {\n`;
            body += `        displayName: "${esc(c.displayName)}",\n`;
            body += `        englishId: "${esc(c.hero_EN_name)}",\n`;
            body += `        price: ${Number(c.price)},\n`;
            body += `        traits: [${all.join(', ')}],\n`;
            body += `        origins: [${origins.map(x => x.ref).join(', ')}],\n`;
            body += `        classes: [${classes.map(x => x.ref).join(', ')}],\n`;
            body += `        attackRange: ${Number(c.attackRange) || 0}\n`;
            body += `    },\n`;
        }
    }

    writeGeneratedBlock(CHESS_FILE, 'S18-chess', [
        '/**',
        ' * 云顶十八赛季（自然之力，虚幻客户端）的棋子数据',
        ' * @description 由 scripts/generate_s18_chess_data.cjs 生成，请勿手改（重跑会整段替换）。',
        ` *              来源：${DATA_BASE_URL}/chess.js（season=${chess.season} version=${chess.version}）`,
        ' *              englishId 为 S18 资源名；拉克丝只收基础形态（羁绊形态在商店里同样显示为"拉克丝"）。',
        ' */',
        'export const _TFT_18_CHESS_DATA = {',
        body.trimEnd(),
        '} satisfies Record<string, TFTUnit>;',
    ].join('\n'));

    console.log(`羁绊: 种族 ${originEnum.length}、职业 ${classEnum.length} → ${path.relative(ROOT, TRAIT_FILE)}`);
    console.log(`棋子: ${units.length} 个 → ${path.relative(ROOT, CHESS_FILE)}`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
