/**
 * 从 public/gamePhotos/S18 的截图（都是 1280x720 客户区）裁出 S18（虚幻客户端）的识别模板
 *
 * 【空槽位】识别棋盘 / 备战席时，会先把每个格子的截图和空槽模板比对，差异很小就判定为空格子、直接跳过。
 * 地图图案会直接影响比对，所以模板截自默认棋盘 + 最低画质（挂机时会提醒用户这样设置）。
 *
 *   来源：经典棋盘.png（棋盘和备战席上都没有棋子）
 *   区域：src-backend/TFTProtocolS18.ts 的 benchSlotRegion / fightBoardSlotRegion，改了区域要重新生成
 *   输出：benchSlot/s18/SLOT_x.png、fightBoardSlot/s18/Rx_Cx.png
 *
 * 【星级】详情面板顶部的星星，1 星铜色、2 星银色、3 星金色，都以 x 1200 居中
 *   来源：基本布局.png（1 星）、二星棋子.png、三星棋子.png
 *   输出：starLevel/s18/{1,2,3}.png，比识别区域 detailChampionStarRegion 四周各小几个像素
 *
 * 【现在退出】普通对局阵亡后结算界面的按钮文字（不含边框）
 *   来源：经典结算界面.png
 *   输出：button/exit_game_button.png，比检测区域 exitGameButtonRegion 四周各小几个像素
 *
 * 用法（在项目根目录）：node scripts/generate_s18_screenshot_templates.cjs
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sharp = require('sharp');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const PHOTOS = path.join(ROOT, 'public/gamePhotos/S18');
const SLOT_SOURCE = '经典棋盘.png';

/** 星级模板的裁剪区域，覆盖 3 颗星 */
const STAR_BOX = { left: 1184, top: 125, width: 32, height: 10 };
const STAR_SOURCES = { 1: '基本布局.png', 2: '二星棋子.png', 3: '三星棋子.png' };

/** "现在退出"文字的裁剪区域 */
const EXIT_BUTTON_BOX = { left: 603, top: 326, width: 74, height: 20 };
const EXIT_BUTTON_SOURCE = '经典结算界面.png';

const PROTOCOL = path.join(ROOT, 'src-backend/TFTProtocolS18.ts');
const IMAGES = path.join(ROOT, 'public/resources/assets/images');

/** 直接读取 TFTProtocolS18.ts 里的区域，避免两处各写一份 */
function loadProtocol() {
    const { code } = esbuild.transformSync(fs.readFileSync(PROTOCOL, 'utf8'), { loader: 'ts', format: 'cjs' });
    const context = { module: { exports: {} } };
    context.exports = context.module.exports;
    vm.runInNewContext(code, context, { filename: PROTOCOL });
    return context.module.exports;
}

async function crop(photo, box, output) {
    const source = path.join(PHOTOS, photo);
    const { width, height } = await sharp(source).metadata();
    if (width !== 1280 || height !== 720) {
        throw new Error(`${photo} 的尺寸应为 1280x720，实际是 ${width}x${height}`);
    }
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await sharp(source).extract(box).ensureAlpha().png().toFile(output);
}

async function cropSlots(regions, outputDir) {
    for (const [key, { leftTop, rightBottom }] of Object.entries(regions)) {
        const box = {
            left: leftTop.x,
            top: leftTop.y,
            width: rightBottom.x - leftTop.x,
            height: rightBottom.y - leftTop.y,
        };
        await crop(SLOT_SOURCE, box, path.join(outputDir, `${key}.png`));
    }
    console.log(`${Object.keys(regions).length} 个 → ${path.relative(ROOT, outputDir)}`);
}

async function main() {
    const { benchSlotRegion, fightBoardSlotRegion } = loadProtocol();
    await cropSlots(benchSlotRegion, path.join(IMAGES, 'benchSlot/s18'));
    await cropSlots(fightBoardSlotRegion, path.join(IMAGES, 'fightBoardSlot/s18'));

    for (const [level, photo] of Object.entries(STAR_SOURCES)) {
        await crop(photo, STAR_BOX, path.join(IMAGES, `starLevel/s18/${level}.png`));
    }
    console.log(`${Object.keys(STAR_SOURCES).length} 个 → ${path.relative(ROOT, path.join(IMAGES, 'starLevel/s18'))}`);

    await crop(EXIT_BUTTON_SOURCE, EXIT_BUTTON_BOX, path.join(IMAGES, 'button/exit_game_button.png'));
    console.log('1 个 → ' + path.relative(ROOT, path.join(IMAGES, 'button/exit_game_button.png')));
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
