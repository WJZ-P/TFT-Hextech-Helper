const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const sharp = require('sharp');

// ==========================================
// 配置区域
// ==========================================

/** 英雄模板输出根目录（各赛季有子文件夹：s16/, s4/ 等） */
const OUTPUT_ROOT = path.join(__dirname, '../public/resources/assets/images/champion');

/** 棋子数据源文件 */
const CHESS_DATA_PATH = path.join(__dirname, '../src-backend/TFTInfo/chess.ts');

// 最佳参数配置 (Golden Params)
const FONT_FAMILY = "Microsoft YaHei";
const FONT_SIZE = 31;
const FONT_WEIGHT = "bold";
const LETTER_SPACING = 5;

/**
 * 赛季配置表
 * 每个赛季对应一个子文件夹和数据源变量名
 *
 * dataVarName: 在 chess.ts 中的变量名（用于正则定位数据区域）
 * outputDir:   模板输出子文件夹名
 * extraSkip:   该赛季特有的、需要额外跳过的棋子名（数组）
 *              —— 这里放"不可购买"的场上召唤物 / 羁绊生成道具
 *              —— 因为这类棋子永远不会出现在商店栏位，无需生成商店识别模板
 */
const SEASON_CONFIGS = [
    {
        name: 'S16 英雄联盟传奇',
        dataVarName: '_TFT_16_CHESS_DATA',
        outputDir: 's16',
        extraSkip: [],
    },
    {
        name: 'S4 瑞兽闹新春',
        dataVarName: '_TFT_4_CHESS_DATA',
        outputDir: 's4',
        extraSkip: [],
    },
    {
        name: 'S17 星神',
        dataVarName: '_TFT_17_CHESS_DATA',
        outputDir: 's17',
        // S17 里不可购买的棋子：
        //   - 迷你黑洞：暗星羁绊场上召唤物（price=1 但不进商店）
        //   - 未来战士核心：羁绊攒经验生成的道具（price=0）
        extraSkip: ['迷你黑洞', '未来战士核心'],
    },
];

// ==========================================
// 从 chess.ts 中提取英雄名称列表
// ==========================================

/**
 * 从 chess.ts 中提取某个赛季数据块的所有英雄名称
 *
 * 原理：
 * 1. 用 `export const {变量名} = {` 定位数据块开始位置
 * 2. 用 `} satisfies Record<string, TFTUnit>;` 定位数据块结束位置
 * 3. 在这个区间内，正则匹配所有 `"英雄名": {` 格式的 key
 * 4. 过滤掉公共特殊棋子（锻造器、假人等）+ 赛季特有的不可购买棋子
 *
 * @param {string} content - chess.ts 文件的完整内容
 * @param {string} varName - 要提取的变量名，如 '_TFT_16_CHESS_DATA'
 * @param {string[]} extraSkip - 该赛季额外需要跳过的棋子名
 * @returns {string[]} 英雄名称数组（去重后）
 */
function extractChampionNames(content, varName, extraSkip = []) {
    // 定位数据块的起止位置
    const startMarker = `export const ${varName} = {`;
    const startIdx = content.indexOf(startMarker);
    if (startIdx === -1) {
        console.error(`❌ 找不到 ${varName} 的定义`);
        return [];
    }

    // 从 startMarker 后面找第一个 `} satisfies` 作为结束
    const endMarker = '} satisfies Record<string, TFTUnit>;';
    const endIdx = content.indexOf(endMarker, startIdx);
    if (endIdx === -1) {
        console.error(`❌ 找不到 ${varName} 的结束标记`);
        return [];
    }

    const block = content.substring(startIdx, endIdx);

    // 把 extraSkip 转成 Set 提高查找性能
    const skipSet = new Set(extraSkip);

    // 提取所有 "xxx": { 格式的 key（英雄名称）
    // 注意：用非贪婪 [^"]+ 避免跨字段吞字符
    // 同时需要排除那些被注释掉的行（以 // 开头）
    const names = [];
    const regex = /^\s*"([^"]+)"\s*:\s*\{/gm;
    let match;
    while ((match = regex.exec(block)) !== null) {
        const name = match[1];

        // 过滤掉公共特殊棋子（锻造器、假人、提伯斯等，通过 ...TFT_SPECIAL_CHESS 展开进来）
        if (name.includes('锻造器') || name === '训练假人' || name === '提伯斯') {
            continue;
        }

        // 过滤掉该赛季特有的不可购买棋子（羁绊道具、场上召唤物等）
        if (skipSet.has(name)) {
            continue;
        }

        names.push(name);
    }

    return [...new Set(names)];
}

// ==========================================
// 模板生成逻辑
// ==========================================

/**
 * 生成单个英雄的二值化文字模板
 *
 * 流程：
 * 1. 用 canvas 在黑底上绘制白色中文文字（模拟游戏内的棋子名称）
 * 2. 通过 sharp 做灰度 + 二值化处理
 * 3. 写入指定目录
 *
 * @param {string} text - 英雄名称
 * @param {string} outputDir - 输出目录路径
 */
async function generateTemplate(text, outputDir) {
    // 1. 预计算文字宽度（需要临时 canvas 来测量）
    const tempCanvas = createCanvas(100, 100);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${FONT_WEIGHT} ${FONT_SIZE}px "${FONT_FAMILY}"`;

    let totalWidth = 0;
    for (const char of text) {
        totalWidth += tempCtx.measureText(char).width;
    }
    if (text.length > 1) {
        totalWidth += (text.length - 1) * LETTER_SPACING;
    }

    // 2. 确定 Canvas 尺寸（宽度 + 左右各 2px padding）
    const width = Math.ceil(totalWidth) + 4;
    const height = FONT_SIZE + 4;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 3. 黑底
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // 4. 白字
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${FONT_WEIGHT} ${FONT_SIZE}px "${FONT_FAMILY}"`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // 手动处理 letterSpacing（canvas API 不支持原生 letterSpacing）
    let currentX = 2;
    for (const char of text) {
        ctx.fillText(char, currentX, height / 2);
        currentX += ctx.measureText(char).width + LETTER_SPACING;
    }

    // 5. 转 Buffer
    const buffer = canvas.toBuffer('image/png');

    // 6. sharp 后处理：灰度 + 二值化（阈值 128，与 OpenCV 处理一致）
    const processedBuffer = await sharp(buffer)
        .grayscale()
        .threshold(128)
        .toBuffer();

    // 7. 写入文件
    const outputPath = path.join(outputDir, `${text}.png`);
    fs.writeFileSync(outputPath, processedBuffer);
}

// ==========================================
// 主入口
// ==========================================
async function main() {
    console.log("🐱 模板生成脚本 - 多赛季支持版");
    console.log(`🎨 参数配置: ${FONT_SIZE}px ${FONT_WEIGHT} ${FONT_FAMILY}, Spacing: ${LETTER_SPACING}`);
    console.log(`📂 输出根目录: ${OUTPUT_ROOT}\n`);

    // 读取棋子数据源
    if (!fs.existsSync(CHESS_DATA_PATH)) {
        console.error(`❌ 找不到棋子数据文件: ${CHESS_DATA_PATH}`);
        process.exit(1);
    }
    const content = fs.readFileSync(CHESS_DATA_PATH, 'utf-8');

    // 遍历每个赛季配置，提取英雄名 → 生成模板
    for (const season of SEASON_CONFIGS) {
        console.log(`\n======== ${season.name} ========`);

        // 1. 提取英雄名（跳过公共特殊棋子 + 该赛季特有的不可购买棋子）
        const names = extractChampionNames(content, season.dataVarName, season.extraSkip);
        if (names.length === 0) {
            console.warn(`⚠️ ${season.name}: 未提取到任何英雄，跳过`);
            continue;
        }
        console.log(`📝 提取到 ${names.length} 个英雄`);

        // 2. 准备输出目录
        const outputDir = path.join(OUTPUT_ROOT, season.outputDir);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // 3. 生成模板
        let successCount = 0;
        for (const name of names) {
            try {
                await generateTemplate(name, outputDir);
                successCount++;
                if (successCount % 10 === 0) {
                    process.stdout.write('.');
                }
            } catch (e) {
                console.error(`\n❌ 生成失败 [${name}]:`, e);
            }
        }

        console.log(`\n✨ ${season.name} 完成！共生成 ${successCount} 张模板 → ${outputDir}`);
    }

    console.log("\n🎉 所有赛季模板生成完毕！");
}

main().catch(err => console.error(err));
