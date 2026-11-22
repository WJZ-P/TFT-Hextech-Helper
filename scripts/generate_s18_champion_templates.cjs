/**
 * 生成 S18（自然之力，虚幻客户端）商店英雄名字模板
 *
 * 数据来源：
 *   https://game.gtimg.cn/images/lol/act/img/tft/js/chess.js（腾讯官方云顶棋子数据，返回当前赛季）
 *   原始数据由 scripts/generate_s18_chess_data.cjs 保存到 public/TFTInfo/S18/chess.ts
 *
 * 产出：
 *   public/resources/assets/images/champion/s18/<英雄名>.png
 *   只生成 1~5 费可购买的英雄（0 费是沙兵、生命花这类召唤物，不进商店）；
 *   拉克丝的各羁绊形态（"拉克丝 (魔女)" 等）在商店里都显示为"拉克丝"，只生成一张。
 *
 * 和老赛季模板（generate_champion_templates.cjs）的区别：
 *   老模板直接用 31px 大字渲染，参数是针对老客户端调的，在虚幻客户端上平均匹配分只有 0.50、最差 0.38，
 *   已低于识别阈值。这里改为"按游戏内原始尺寸渲染 + 走一遍和截图完全相同的预处理"，
 *   让模板和截图经历同样的放大、二值化、锐化过程：
 *     1. 按游戏内大小（12px）渲染，底色、字色取自截图里的名字栏（底 #1a2833，字 #f0e6d2）
 *     2. 预处理与 ScreenCapture.captureRegionAsPng(forOCR=true) 一致：
 *        3 倍放大（lanczos3）→ 灰度 → normalize → 阈值 160 → 锐化
 *     3. 裁到文字范围，四周留 2px
 *
 * 参数校准（public/gamePhotos/S18 截图中的 14 个真实名字样本，按 TFTProtocolS18 的区域截取）：
 *   遍历 微软雅黑 / 黑体 / 等线 / 微软正黑 × 常规 / 粗体 × 10~14px × 字间距 0~2px，
 *   用 TM_CCOEFF_NORMED 与 S18 全部英雄名比较，选"全部认对且正确答案领先第二名最多"的一组：
 *     微软雅黑 粗体 12px 字间距 0 → 14/14 认对，平均 0.647，最差 0.473，领先第二名至少 0.073
 *   S18 客户端的字体不是微软雅黑，0.65 左右基本是系统字体能达到的上限。
 *   换赛季或客户端改字体时，用新截图重新校准这几个参数。
 *
 * 用法（在项目根目录）：node scripts/generate_s18_champion_templates.cjs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');
const { createCanvas } = require('canvas');

const ROOT = path.resolve(__dirname, '..');
const CHESS_DATA_URL = 'https://game.gtimg.cn/images/lol/act/img/tft/js/chess.js';
const OUTPUT_DIR = path.join(ROOT, 'public/resources/assets/images/champion/s18');

// 校准得到的渲染参数（见文件头说明）
const FONT_FAMILY = 'Microsoft YaHei';
const FONT_WEIGHT = 'bold';
const FONT_SIZE = 12;
const LETTER_SPACING = 0;
const CANVAS_HEIGHT = 16;           // 与 shopSlotNameRegions 的高度一致
const BACKGROUND_COLOR = '#1a2833'; // 名字栏底色 (26,40,51)
const TEXT_COLOR = '#f0e6d2';       // 名字文字颜色 (240,230,210)

// 与 ScreenCapture.captureRegionAsPng(forOCR=true) 保持一致
const UPSCALE = 3;
const BINARY_THRESHOLD = 160;
const CROP_PADDING = 2;

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

/** 与识别时对截图做的预处理完全一致 */
async function preprocessLikeCapture(pngBuffer) {
    const { data, info } = await sharp(pngBuffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
        .resize({ width: info.width * UPSCALE, height: info.height * UPSCALE, kernel: 'lanczos3' })
        .grayscale()
        .normalize()
        .threshold(BINARY_THRESHOLD)
        .sharpen()
        .png()
        .toBuffer();
}

/** 按游戏内尺寸渲染名字，经过同样的预处理后裁到文字范围 */
async function renderTemplate(text) {
    const font = `${FONT_WEIGHT} ${FONT_SIZE}px "${FONT_FAMILY}"`;
    const measure = createCanvas(10, 10).getContext('2d');
    measure.font = font;
    let textWidth = 0;
    for (const char of text) textWidth += measure.measureText(char).width;
    textWidth += (text.length - 1) * LETTER_SPACING;

    const canvas = createCanvas(Math.ceil(textWidth) + 4, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    let x = 2;
    for (const char of text) {
        ctx.fillText(char, x, CANVAS_HEIGHT / 2);
        x += ctx.measureText(char).width + LETTER_SPACING;
    }

    const processed = await preprocessLikeCapture(canvas.toBuffer('image/png'));

    // 裁到文字范围（白色像素的包围盒）+ 四周留白
    const { data, info } = await sharp(processed).grayscale().raw().toBuffer({ resolveWithObject: true });
    let minX = info.width, maxX = -1, minY = info.height, maxY = -1;
    for (let py = 0; py < info.height; py++) {
        for (let px = 0; px < info.width; px++) {
            if (data[py * info.width + px] > 128) {
                minX = Math.min(minX, px); maxX = Math.max(maxX, px);
                minY = Math.min(minY, py); maxY = Math.max(maxY, py);
            }
        }
    }
    if (maxX < 0) throw new Error(`渲染结果为空: ${text}`);
    const left = Math.max(0, minX - CROP_PADDING);
    const top = Math.max(0, minY - CROP_PADDING);
    const width = Math.min(info.width - left, maxX - left + CROP_PADDING + 1);
    const height = Math.min(info.height - top, maxY - top + CROP_PADDING + 1);
    return sharp(processed).extract({ left, top, width, height }).grayscale().png().toBuffer();
}

async function main() {
    const payload = JSON.parse((await download(CHESS_DATA_URL)).toString('utf8'));
    console.log(`棋子数据: season=${payload.season} version=${payload.version} time=${payload.time}，共 ${payload.data.length} 个`);

    // 可购买的英雄名（拉克丝各形态合并）
    const names = [...new Set(
        payload.data
            .filter(c => Number(c.price) >= 1 && Number(c.price) <= 5)
            .map(c => c.displayName.replace(/\s*\(.*\)$/, '').trim())
    )];

    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    for (const name of names) {
        fs.writeFileSync(path.join(OUTPUT_DIR, `${name}.png`), await renderTemplate(name));
    }
    console.log(`英雄名字模板: ${names.length} 张 → ${path.relative(ROOT, OUTPUT_DIR)}`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
