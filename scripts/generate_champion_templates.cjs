const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const sharp = require('sharp');

// ==========================================
// 配置区域
// ==========================================
const OUTPUT_DIR = path.join(__dirname, '../public/resources/assets/images/champion');

// 最佳参数配置 (Golden Params)
const FONT_FAMILY = "Microsoft YaHei";
const FONT_SIZE = 31;
const FONT_WEIGHT = "bold";
const LETTER_SPACING = 5;

// 英雄列表 (从 TFTProtocol.ts 提取)
const championNames = [
    // 1 费
    "俄洛伊", "贝蕾亚", "艾尼维亚", "嘉文四世", "烬", "凯特琳", "克格莫", "璐璐", "奇亚娜", "兰博", "慎", "娑娜", "佛耶戈", "布里茨",
    // 2 费
    "厄斐琉斯", "艾希", "科加斯", "崔斯特", "艾克", "格雷福斯", "妮蔻", "奥莉安娜", "波比", "雷克塞", "赛恩", "提莫", "崔丝塔娜", "蔚", "亚索", "约里克", "赵信",
    // 3 费
    "阿狸", "巴德", "德莱文", "德莱厄斯", "格温", "金克丝", "凯南", "可酷伯与悠米", "乐芙兰", "洛里斯", "玛尔扎哈", "米利欧", "诺提勒斯", "普朗克", "瑟庄妮", "薇恩",
    // 4 费
    "安蓓萨", "卑尔维斯", "布隆", "黛安娜", "盖伦", "卡莉丝塔", "卡莎", "蕾欧娜", "丽桑卓", "拉克丝", "厄运小姐", "内瑟斯", "奈德丽", "雷克顿", "萨勒芬妮", "辛吉德", "斯卡纳", "斯维因", "孙悟空", "塔里克", "维迦", "沃里克", "永恩", "芸阿娜",
    // 5 费
    "亚托克斯", "安妮", "阿兹尔", "费德提克", "吉格斯", "加里奥", "基兰", "千珏", "卢锡安与赛娜", "梅尔", "奥恩", "瑟提", "希瓦娜", "塔姆", "锤石", "沃利贝尔",
    // 7 费
    "奥瑞利安·索尔", "纳什男爵", "瑞兹", "亚恒"
];

// ==========================================
// 主逻辑
// ==========================================

async function main() {
    console.log("🐱 猫娘老师正在准备生成模板...");
    console.log(`📝 英雄数量: ${championNames.length}`);
    console.log(`🎨 参数配置: ${FONT_SIZE}px ${FONT_WEIGHT} ${FONT_FAMILY}, Spacing: ${LETTER_SPACING}`);

    // 准备输出目录
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let successCount = 0;
    
    console.log("🚀 开始生成模板图片 (黑底白字 + 二值化)...");

    for (const name of championNames) {
        try {
            await generateTemplate(name);
            successCount++;
            if (successCount % 10 === 0) {
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
    // 1. 预计算文字宽度
    // 我们需要创建一个临时 canvas 来测量文字
    const tempCanvas = createCanvas(100, 100);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `${FONT_WEIGHT} ${FONT_SIZE}px "${FONT_FAMILY}"`;

    let totalWidth = 0;
    for (const char of text) {
        totalWidth += tempCtx.measureText(char).width;
    }
    // 加上字间距
    if (text.length > 1) {
        totalWidth += (text.length - 1) * LETTER_SPACING;
    }

    // 2. 确定 Canvas 尺寸
    // 宽度：文字宽度 + 左右 padding (各2px)
    // 高度：字体大小 + 上下 padding (共4px，保持与测试脚本一致)
    const width = Math.ceil(totalWidth) + 4;
    const height = FONT_SIZE + 4; // 约 35px

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 3. 绘制背景 (黑色)
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, width, height);

    // 4. 绘制文字 (白色)
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `${FONT_WEIGHT} ${FONT_SIZE}px "${FONT_FAMILY}"`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // 绘制每个字符 (手动处理 letterSpacing)
    let currentX = 2; // 左边距
    for (const char of text) {
        ctx.fillText(char, currentX, height / 2);
        currentX += ctx.measureText(char).width + LETTER_SPACING;
    }

    // 5. 转为 Buffer
    const buffer = canvas.toBuffer('image/png');

    // 6. Sharp 后处理 (模拟 OpenCV 的二值化)
    // 之前的测试证明二值化后的骨架匹配率最高
    const processedBuffer = await sharp(buffer)
        .grayscale() // 转灰度
        .threshold(128) // 二值化，阈值128 (与测试脚本一致)
        .toBuffer();

    // 7. 写入文件
    // 文件名直接使用英雄名字 (覆盖旧文件)
    const outputPath = path.join(OUTPUT_DIR, `${text}.png`);
    fs.writeFileSync(outputPath, processedBuffer);
}

// 运行
main().catch(err => console.error(err));
