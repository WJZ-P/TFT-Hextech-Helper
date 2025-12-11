const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const sharp = require('sharp');

// ==========================================
// 配置区域
// ==========================================
const PROTOCOL_PATH = path.join(__dirname, '../src-backend/TFTProtocol.ts');
const OUTPUT_DIR = path.join(__dirname, '../public/resources/assets/images/champion');

// 黄金参数 (Golden Params)
const FONT_SIZE = 12;
const FONT_WEIGHT = 600; // SemiBold
const FONT_FAMILY = 'Microsoft YaHei'; 
const CANVAS_WIDTH = 100; // 足够容纳长名字
const CANVAS_HEIGHT = 24; // 游戏内实际高度约为 24px

// ==========================================
// 主逻辑
// ==========================================

async function main() {
    console.log("🐱 猫娘老师正在读取英雄列表...");

    // 1. 读取 TFTProtocol.ts
    const content = fs.readFileSync(PROTOCOL_PATH, 'utf8');

    // 2. 精准定位 TFT_16_CHAMPION_DATA 对象块
    // 我们寻找 export const TFT_16_CHAMPION_DATA ... = { ... }; 这一块
    const startMarker = 'export const TFT_16_CHAMPION_DATA: Record<string, TFTUnit> = {';
    const startIndex = content.indexOf(startMarker);

    if (startIndex === -1) {
        console.error("❌ 找不到 TFT_16_CHAMPION_DATA 定义！请检查 Protocol 文件。");
        process.exit(1);
    }

    // 3. 提取对象内容 (利用大括号计数法，确保只提取该对象)
    let braceCount = 0;
    let endIndex = -1;
    let foundStartBrace = false;

    // 从标记位置开始往后找
    for (let i = startIndex; i < content.length; i++) {
        const char = content[i];
        if (char === '{') {
            braceCount++;
            foundStartBrace = true;
        } else if (char === '}') {
            braceCount--;
        }

        // 当大括号计数归零，且已经开始过，说明对象结束了
        if (foundStartBrace && braceCount === 0) {
            endIndex = i;
            break;
        }
    }

    if (endIndex === -1) {
        console.error("❌ 解析 TFT_16_CHAMPION_DATA 失败，未找到结束大括号。");
        process.exit(1);
    }

    const dataBlock = content.substring(startIndex, endIndex + 1);

    // 4. 从代码块中提取 Key
    // 匹配模式： "英雄名": {
    const keyRegex = /"([^"]+)":\s*\{/g;
    const championNames = [];
    let match;

    while ((match = keyRegex.exec(dataBlock)) !== null) {
        championNames.push(match[1]);
    }

    console.log(`✅ 成功解析到 ${championNames.length} 个英雄！`);

    // 5. 准备输出目录
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 6. 遍历生成图片
    let successCount = 0;
    
    console.log("🚀 开始生成模板图片 (二值化处理)...");

    for (const name of championNames) {
        try {
            await generateTemplate(name);
            successCount++;
            // 小小的进度条
            if (successCount % 20 === 0) {
                process.stdout.write('.');
            }
        } catch (e) {
            console.error(`\n❌ 生成失败 [${name}]:`, e);
        }
    }

    console.log(`\n\n✨ 全部完成！共生成 ${successCount} 张模板图片。`);
    console.log(`📂 保存路径: ${OUTPUT_DIR}`);
}

/**
 * 生成单个英雄的二值化模板
 */
async function generateTemplate(text) {
    // A. 创建 Canvas 绘图
    const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
    const ctx = canvas.getContext('2d');

    // 1. 黑色背景 (模拟二值化前的背景)
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // 2. 绘制白色文字
    ctx.font = `${FONT_WEIGHT} ${FONT_SIZE}px "${FONT_FAMILY}"`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center'; // 居中绘制，方便裁切
    ctx.fillStyle = '#ffffff';
    
    // 黄金参数：无描边，无模糊
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

    // B. 转为 Buffer 并进行 Sharp 后处理
    const buffer = canvas.toBuffer('image/png');

    // C. 模拟 TemplateLoader 的处理逻辑 (转灰度 -> 二值化)
    // 虽然我们画的是纯黑白，但为了保证格式（位深等）完全一致，还是走一遍流程
    const processedBuffer = await sharp(buffer)
        .grayscale()
        .threshold(180) // 核心步骤：二值化
        .toBuffer();

    // D. 写入文件
    const outputPath = path.join(OUTPUT_DIR, `${text}.png`);
    fs.writeFileSync(outputPath, processedBuffer);
}

// 运行
main().catch(err => console.error(err));
