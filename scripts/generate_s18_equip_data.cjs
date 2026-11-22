/**
 * 生成 S18（自然之力）装备数据与装备图标模板
 *
 * 数据来源（腾讯官方云顶数据，和官网资料站同源）：
 *   - 装备数据：https://game.gtimg.cn/images/lol/act/img/tft/js/equip.js
 *   - 装备图标：https://game.gtimg.cn/images/lol/act/img/tft/equip/{equipId}.png
 *   同目录下还有 chess.js（棋子）、race.js / job.js（羁绊）、hex.js（海克斯强化），返回的都是当前赛季的数据。
 *
 * 产出：
 *   1. public/TFTInfo/S18/equip.ts
 *        接口原始数据，原样保存
 *   2. public/resources/assets/images/equipment/<分类>/<englishName>.png
 *        S18 新增的装备图标，按分类放置
 *   3. src-backend/TFTInfo/equip.ts 中的 _TFT_18_EQUIP_DATA
 *        识别和策略用的装备表，在 <generated:S18-equip> 标记之间，重跑会整段替换
 *
 * 分类规则（和现有图片目录一致）：
 *   type 1 → component（基础散件）
 *   type 2 → core（成装）；englishName 含 Emblem 的放 emblem（纹章）
 *   type 3 → radiant（光明装备）
 *   type 5 → emblem（独立纹章）
 *   type 6 / 7 → artifact（奥恩神器 / 金鳞龙装备）
 *   type 9 → 资源目录在 hud/zaps/wands 的放 zap（S18 新机制的法杖类道具，不参与识别）；
 *            其余（拆卸器、复制器、药水、补剂等消耗品）放 special
 *
 * 图标复用：
 *   虚幻客户端的装备英文名全换成了资源名（如 DA_EdgeOfNight），和老图的文件名（TFT_Item_GuardianAngel）对不上，
 *   而且有些装备跨赛季换过名字、个别换过美术，所以按图像去重：
 *   把每个 S18 图标和同分类下的老图都缩到 24x24（和识别时一致）比较相似度，≥ REUSE_THRESHOLD 视为同一张图，
 *   直接复用老图，装备表里的 englishName 填老图文件名；否则保存新图标，以 S18 的 englishName 命名。
 *   老图一律不删除、不覆盖。
 *
 * 透明处理：
 *   TemplateLoader 加载模板时会直接丢掉 alpha 通道，透明像素底下的 RGB 是不确定的（黑白都有），
 *   所以放进识别目录的新图标铺黑底去掉透明；zap 目录不参与识别，保留原图。
 *
 * 特殊道具：
 *   沿用 specialEquip 的约定，equipId 记为 "-1"（策略层据此判断"不可穿戴"），真实 ID 写在注释里。
 *
 * 用法（在项目根目录）：node scripts/generate_s18_equip_data.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const EQUIP_DATA_URL = 'https://game.gtimg.cn/images/lol/act/img/tft/js/equip.js';
const RAW_DATA_FILE = path.join(ROOT, 'public/TFTInfo/S18/equip.ts');
const IMAGE_ROOT = path.join(ROOT, 'public/resources/assets/images/equipment');
const TABLE_FILE = path.join(ROOT, 'src-backend/TFTInfo/equip.ts');
const ICON_CACHE_DIR = path.join(require('os').tmpdir(), 'tft-s18-equip-icons');

/** 相似度（归一化互相关）不低于这个值就认为是同一张图。实测同图 ≥ 0.98，换过美术的 < 0.2 */
const REUSE_THRESHOLD = 0.95;

/** 识别时模板统一缩放的尺寸（与 TemplateLoader 一致） */
const TEMPLATE_SIZE = 24;

const GENERATED_BEGIN = '// <generated:S18-equip>';
const GENERATED_END = '// </generated:S18-equip>';

// ----------------------------------------------------------------------------
// 工具函数
// ----------------------------------------------------------------------------

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
            res.on('end', () => resolve(Buffer.concat(chunks)));
        });
        req.on('error', reject);
        req.setTimeout(20000, () => req.destroy(new Error(`timeout: ${url}`)));
    });
}

/** 并发执行，limit 个一组 */
async function runPool(list, limit, fn) {
    const queue = [...list];
    const worker = async () => {
        for (let item; (item = queue.shift()) !== undefined;) await fn(item);
    };
    await Promise.all(Array.from({ length: limit }, worker));
}

const toCrlf = text => text.replace(/\r?\n/g, '\r\n');

function getCategory(item) {
    switch (item.type) {
        case '1': return 'component';
        case '2': return /Emblem/i.test(item.englishName) ? 'emblem' : 'core';
        case '3': return 'radiant';
        case '4': return 'trait';
        case '5': return 'emblem';
        case '6':
        case '7': return 'artifact';
        case '9': return (item.json_image_url || '').includes('/zaps/wands/') ? 'zap' : 'special';
        default: return null;
    }
}

/**
 * 缩到 24x24 并做零均值、单位化，两张图的点积即归一化互相关
 * 必须保留颜色：药水、复制器这类图标形状相同、只有颜色不同，灰度比较会把它们误判成同一张图
 */
async function toFeature(file) {
    const { data } = await sharp(file)
        .flatten({ background: '#000000' })
        .resize(TEMPLATE_SIZE, TEMPLATE_SIZE, { fit: 'fill' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
    const values = Float64Array.from(data);
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    const centered = values.map(v => v - mean);
    const norm = Math.sqrt(centered.reduce((s, v) => s + v * v, 0)) || 1;
    return centered.map(v => v / norm);
}

const similarity = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

const esc = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');

// ----------------------------------------------------------------------------
// 主流程
// ----------------------------------------------------------------------------

async function main() {
    // 1. 拉取装备数据
    const payload = JSON.parse((await download(EQUIP_DATA_URL)).toString('utf8'));
    const items = payload.data.filter(item => String(item.isShow) === '1');
    console.log(`装备数据: season=${payload.season} version=${payload.version} time=${payload.time}，共 ${payload.data.length} 个（展示 ${items.length} 个）`);

    // 2. 原始数据原样保存
    fs.mkdirSync(path.dirname(RAW_DATA_FILE), { recursive: true });
    const rawHeader = [
        '// S18（自然之力）装备原始数据，由 scripts/generate_s18_equip_data.cjs 生成，请勿手改',
        `// 来源: ${EQUIP_DATA_URL}`,
        `// season=${payload.season} version=${payload.version} 数据时间=${payload.time}`,
        '',
    ].join('\n');
    fs.writeFileSync(RAW_DATA_FILE, toCrlf(`${rawHeader}export const TEST_TFT_S18_EQUIP = ${JSON.stringify(payload.data, null, 4)}\n`));

    // 3. 下载图标（缓存到系统临时目录，重跑时不重复下载）
    fs.mkdirSync(ICON_CACHE_DIR, { recursive: true });
    const iconFile = item => path.join(ICON_CACHE_DIR, `${item.equipId}.png`);
    await runPool(items, 8, async item => {
        if (!fs.existsSync(iconFile(item))) fs.writeFileSync(iconFile(item), await download(item.imagePath));
    });

    // 4. 读取现有模板图的特征（只看规范命名的 TFT* 文件，以及 special 目录）
    const library = {};
    for (const category of fs.readdirSync(IMAGE_ROOT)) {
        const dir = path.join(IMAGE_ROOT, category);
        if (!fs.statSync(dir).isDirectory()) continue;
        library[category] = [];
        for (const file of fs.readdirSync(dir)) {
            if (!/^(TFT|DA_)/i.test(file)) continue;
            library[category].push({ name: path.parse(file).name, feature: await toFeature(path.join(dir, file)) });
        }
    }

    // 5. 逐个装备决定：复用老图还是保存新图标
    const entries = [];
    const stats = {};
    for (const item of items) {
        const category = getCategory(item);
        if (!category || category === 'trait') continue;

        const stat = (stats[category] ??= { total: 0, reused: 0, added: 0 });
        stat.total++;

        let templateName = item.englishName;
        let reusedScore = null;
        if (category !== 'zap') {
            const feature = await toFeature(iconFile(item));
            let best = null;
            for (const candidate of library[category] || []) {
                const score = similarity(feature, candidate.feature);
                if (!best || score > best.score) best = { name: candidate.name, score };
            }
            if (best && best.score >= REUSE_THRESHOLD) {
                templateName = best.name;
                reusedScore = best.score;
            }
        }

        if (reusedScore === null) {
            const target = path.join(IMAGE_ROOT, category, `${item.englishName}.png`);
            fs.mkdirSync(path.dirname(target), { recursive: true });
            if (category === 'zap') {
                fs.copyFileSync(iconFile(item), target);
            } else {
                await sharp(iconFile(item)).flatten({ background: '#000000' }).png().toFile(target);
                // 新图也加入候选，后面同图的装备（如升级版）可以复用它
                (library[category] ??= []).push({ name: item.englishName, feature: await toFeature(target) });
            }
            stat.added++;
        } else {
            stat.reused++;
        }

        entries.push({ item, category, templateName });
    }
    console.log('图标处理结果:', stats);

    // 6. 生成后端装备表（zap 不是可识别的装备，只保留在原始数据里）
    const sections = [
        { title: 'Type 1: 基础散件 (Base Items)', match: e => e.category === 'component' },
        { title: 'Type 2: 标准合成装备 (Standard Completed Items)', match: e => e.category === 'core' },
        { title: 'Type 2 / 5: 羁绊纹章 (Emblems)', match: e => e.category === 'emblem' },
        { title: 'Type 3: 光明装备 (Radiant Items)', match: e => e.category === 'radiant' },
        { title: 'Type 6 / 7: 奥恩神器 / 金鳞龙装备 (Artifacts)', match: e => e.category === 'artifact' },
        { title: 'Type 9: 特殊道具 (拆卸器 / 复制器 / 药水 / 补剂等消耗品，equipId 记为 -1)', match: e => e.category === 'special' },
    ];

    const usedKeys = new Set();
    let body = '';
    for (const section of sections) {
        const list = entries.filter(section.match);
        if (list.length === 0) continue;
        body += `    // ==========================================\n`;
        body += `    // ${section.title} (共 ${list.length} 个)\n`;
        body += `    // ==========================================\n`;
        for (const { item, category, templateName } of list) {
            let key = item.name;
            if (usedKeys.has(key)) key = `${key}_${item.equipId}`;
            usedKeys.add(key);

            const isSpecial = category === 'special';
            const notes = [];
            if (templateName !== item.englishName) notes.push(`S18 资源名 ${item.englishName}`);
            if (isSpecial) notes.push(`真实 equipId ${item.equipId}`);

            body += `    "${esc(key)}": {${notes.length ? `   // ${notes.join('，')}` : ''}\n`;
            body += `        name: "${esc(item.name)}",\n`;
            body += `        englishName: "${esc(templateName)}",\n`;
            body += `        equipId: "${isSpecial ? '-1' : esc(item.equipId)}",\n`;
            body += `        formula: "${esc(item.formula)}"\n`;
            body += `    },\n`;
        }
        body += '\n';
    }

    const block = [
        GENERATED_BEGIN,
        '/**',
        ' * 云顶十八赛季（自然之力）的装备数据',
        ' * @description 由 scripts/generate_s18_equip_data.cjs 生成，请勿手改（重跑脚本会整段替换）。',
        ` *              来源：${EQUIP_DATA_URL}（season=${payload.season} version=${payload.version}）`,
        ' *              englishName 是装备图标模板的文件名：和老赛季同图的装备直接复用老图（注释里标了 S18 资源名），',
        ' *              S18 新增的装备以 S18 资源名（DA_xxx）命名。',
        ' *              S18 法杖类道具（type 9，zaps/wands）不是装备，只保留在原始数据 public/TFTInfo/S18/equip.ts 里。',
        ' */',
        'export const _TFT_18_EQUIP_DATA: Record<string, TFTEquip> = {',
        body.trimEnd(),
        '} satisfies Record<string, TFTEquip>',
        GENERATED_END,
    ].join('\n');

    const current = fs.readFileSync(TABLE_FILE, 'utf8').replace(/\r\n/g, '\n');
    const begin = current.indexOf(GENERATED_BEGIN);
    const end = current.indexOf(GENERATED_END);
    const updated = begin >= 0 && end > begin
        ? current.slice(0, begin) + block + current.slice(end + GENERATED_END.length)
        : `${current.replace(/\n*$/, '\n')}\n${block}\n`;
    fs.writeFileSync(TABLE_FILE, toCrlf(updated));

    console.log(`装备表: ${entries.filter(e => e.category !== 'zap').length} 个装备 → ${path.relative(ROOT, TABLE_FILE)}`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
