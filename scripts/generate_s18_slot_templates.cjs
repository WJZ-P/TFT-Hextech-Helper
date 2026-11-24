/**
 * 生成 S18（虚幻客户端）的空槽位模板
 *
 * 识别棋盘 / 备战席时，会先把每个格子的截图和空槽模板比对，差异很小就判定为空格子、直接跳过。
 * 地图图案会直接影响比对，所以模板截自默认棋盘 + 最低画质（挂机时会提醒用户这样设置）。
 *
 * 输入：public/gamePhotos/S18/经典棋盘.png（1280x720 客户区，棋盘和备战席上都没有棋子）
 * 区域：src-backend/TFTProtocolS18.ts 的 benchSlotRegion / fightBoardSlotRegion，改了区域要重新生成
 * 输出：public/resources/assets/images/benchSlot/s18/SLOT_x.png
 *       public/resources/assets/images/fightBoardSlot/s18/Rx_Cx.png
 *
 * 用法（在项目根目录）：node scripts/generate_s18_slot_templates.cjs
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const sharp = require('sharp');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'public/gamePhotos/S18/经典棋盘.png');
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

async function cropAll(regions, outputDir) {
    fs.mkdirSync(outputDir, { recursive: true });
    for (const [key, { leftTop, rightBottom }] of Object.entries(regions)) {
        await sharp(SOURCE)
            .extract({
                left: leftTop.x,
                top: leftTop.y,
                width: rightBottom.x - leftTop.x,
                height: rightBottom.y - leftTop.y,
            })
            .ensureAlpha()
            .png()
            .toFile(path.join(outputDir, `${key}.png`));
    }
    console.log(`${Object.keys(regions).length} 个 → ${path.relative(ROOT, outputDir)}`);
}

async function main() {
    const { width, height } = await sharp(SOURCE).metadata();
    if (width !== 1280 || height !== 720) {
        throw new Error(`截图尺寸应为 1280x720，实际是 ${width}x${height}`);
    }
    const { benchSlotRegion, fightBoardSlotRegion } = loadProtocol();
    await cropAll(benchSlotRegion, path.join(IMAGES, 'benchSlot/s18'));
    await cropAll(fightBoardSlotRegion, path.join(IMAGES, 'fightBoardSlot/s18'));
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
