/**
 * 生成 S18（自然之力）英雄原画（阵容页 hover 头像时展示）
 *
 * 老赛季的原画直接用腾讯 CDN（tftstore/sxx/624x318/{chessId}.jpg），但 S18 在这个路径下没有原画（404），
 * 腾讯棋子数据里的 originalImage 也只有 64x64。所以改从 CommunityDragon 取解包原画并打包到本地：
 *   - 英雄的资源目录取自 public/TFTInfo/S18/chess.ts 的 json_chess_image_url
 *     （如 assets/characters/tft18_sivir/... → tft18_sivir）
 *   - 原画：https://raw.communitydragon.org/latest/game/assets/characters/{目录}/skins/base/images/*_splash_centered_*.png
 *     原图 1024x512，缩到与老赛季原画同档的 624x312、转 webp（每张约 20KB）
 *
 * 产出：src/assets/splash/s18/{chessId}.webp（只处理 1~5 费可购买英雄，拉克丝取基础形态）
 *
 * 用法（在项目根目录）：node scripts/generate_s18_splash_art.cjs
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const https = require('https');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const CHESS_DATA_FILE = path.join(ROOT, 'public/TFTInfo/S18/chess.ts');
const OUTPUT_DIR = path.join(ROOT, 'src/assets/splash/s18');
const CDRAGON = 'https://raw.communitydragon.org/latest';
const SPLASH_WIDTH = 624;
const SPLASH_HEIGHT = 312;

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
        req.setTimeout(60000, () => req.destroy(new Error(`timeout: ${url}`)));
    });
}

function loadChessData() {
    const code = fs.readFileSync(CHESS_DATA_FILE, 'utf8').replace(/export const\s+\w+\s*=\s*/, 'module.exports = ');
    const context = { module: { exports: {} } };
    new vm.Script(code, { filename: CHESS_DATA_FILE }).runInNewContext(context);
    return context.module.exports;
}

async function main() {
    // 可购买英雄（拉克丝的羁绊形态在商店和阵容里都显示为"拉克丝"，只取基础形态）
    const champions = loadChessData()
        .filter(c => Number(c.price) >= 1 && Number(c.price) <= 5)
        .filter(c => !/\s*\(.*\)$/.test(c.displayName));

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    const failed = [];
    let saved = 0;

    for (const champion of champions) {
        try {
            const folder = (champion.json_chess_image_url || '').match(/^assets\/characters\/([^/]+)\//)?.[1];
            if (!folder) throw new Error(`json_chess_image_url 里没有资源目录: ${champion.json_chess_image_url}`);

            const imagesDir = `game/assets/characters/${folder}/skins/base/images`;
            const listing = JSON.parse((await download(`${CDRAGON.replace('/latest', '/json/latest')}/${imagesDir}/`)).toString('utf8'));
            const names = listing.map(e => e.name);
            // 优先居中原画；野怪类英雄没有，用阵容规划器原画；再没有就用方形裁切图
            const pick = pattern => names.find(n => pattern.test(n));
            let splashPath = null;
            const centered = pick(/_splash_centered_\d+\.png$/i);
            const planner = pick(/teamplanner_?splash\.png$/i);
            const tile = pick(/_splash_tile_\d+\.png$/i);
            if (centered) {
                splashPath = `${imagesDir}/${centered}`;
            } else if (planner) {
                splashPath = `${imagesDir}/${planner}`;
            } else {
                // 部分英雄的阵容规划器原画放在 ux/tft/championsplashes/patching/ 下
                const patched = `game/assets/ux/tft/championsplashes/patching/${folder}_teamplanner_splash.png`;
                try {
                    await download(`${CDRAGON}/${patched}`);
                    splashPath = patched;
                } catch {
                    if (tile) splashPath = `${imagesDir}/${tile}`;
                }
            }
            if (!splashPath) throw new Error(`${folder} 下没有可用的原画`);

            const image = await download(`${CDRAGON}/${splashPath}`);
            await sharp(image)
                .resize(SPLASH_WIDTH, SPLASH_HEIGHT, { fit: 'cover', position: 'centre' })
                .webp({ quality: 82 })
                .toFile(path.join(OUTPUT_DIR, `${champion.chessId}.webp`));
            saved++;
        } catch (error) {
            failed.push(`${champion.displayName}(${champion.chessId}): ${error.message}`);
        }
    }

    console.log(`原画: ${saved}/${champions.length} 张 → ${path.relative(ROOT, OUTPUT_DIR)}`);
    failed.forEach(f => console.log(`  ✘ ${f}`));
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
