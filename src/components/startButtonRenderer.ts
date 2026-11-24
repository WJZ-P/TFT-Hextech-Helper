/**
 * 开始按钮的流光绘制（仿云顶之弈客户端的"开始游戏"按钮）
 *
 * 在 CPU 上逐像素画到 2D canvas，不用 WebGL：用户的显卡驱动有问题、GPU 不可用时也能正常显示。
 *
 * 为了让开销足够小：
 * - 形状用有向距离场（SDF：像素到轮廓的距离，里面为负）描述，只在尺寸变化时计算一次
 * - 流光的噪声场在粗网格上计算，再双线性插值到每个像素
 * - 渐变、光片的亮度曲线用查找表
 *
 * 从外到内的层次：深色描边 → 金环 → 深色底 → 青色描边 → 本体 → 内侧蓝线
 *
 * 流光是一条 45° 的斜带，从左上往右下扫过整个按钮，所有层都按"离斜带多远"变色：
 * 上边比下边先亮，最后在右下角汇合。本体上另有往右飘的锐利光片
 */

type RGB = [number, number, number];

/** 一组配色，数值 0~255 */
interface Palette {
    /** 金环：斜带处 / 最远处 */
    ring: [RGB, RGB];
    /** 金环上的斜带：两端 / 中间 */
    runner: [RGB, RGB];
    /** 青色描边：斜带处 / 中间 / 最远处 */
    edge: [RGB, RGB, RGB];
    /** 青色描边向两侧晕开的颜色 */
    edgeGlow: RGB;
    /** 青色描边上的斜带 */
    edgeRunner: RGB;
    /** 本体渐变，从斜带处到最远处 4 个色标（位置见 BODY_STOPS） */
    body: [RGB, RGB, RGB, RGB];
    /** 内侧线条：最远处 / 靠近斜带处 */
    line: [RGB, RGB];
    /** 柔和的光晕 / 锐利的光片 */
    cloud: RGB;
    shard: RGB;
    /** 右侧直角区域里的细线 */
    corner: RGB;
}

export type StartButtonVariant = 'ready' | 'running' | 'disabled';

const hex = (value: string): RGB => [
    parseInt(value.slice(1, 3), 16),
    parseInt(value.slice(3, 5), 16),
    parseInt(value.slice(5, 7), 16),
];

/** 各状态的配色：normal 是常态，hot 是 hover 亮起后的颜色。ready 取色自客户端截图 */
const PALETTES: Record<StartButtonVariant, { normal: Palette; hot: Palette; life: number }> = {
    ready: {
        life: 1,
        normal: {
            ring: [hex('#C8982A'), hex('#95701E')],
            runner: [hex('#F5A63A'), hex('#FAEF57')],
            edge: [hex('#06C4D0'), hex('#0398AC'), hex('#006387')],
            edgeGlow: hex('#0A86B4'),
            edgeRunner: hex('#00FFFF'),
            body: [hex('#2192B6'), hex('#1E7CB6'), hex('#1A5AB6'), hex('#1747B6')],
            line: [hex('#2470FF'), hex('#28C4FF')],
            cloud: hex('#1BA3E6'),
            shard: hex('#8FC8F4'),
            corner: hex('#1C434B'),
        },
        hot: {
            ring: [hex('#CB9E35'), hex('#9E781F')],
            runner: [hex('#FAB04F'), hex('#FFF67A')],
            edge: [hex('#C4FFFF'), hex('#B4FFFF'), hex('#9CFFFF')],
            edgeGlow: hex('#12E0FF'),
            edgeRunner: hex('#E6FFFF'),
            body: [hex('#2CF2FF'), hex('#24C4F2'), hex('#1F9CF6'), hex('#1D5FEA')],
            line: [hex('#45C4FF'), hex('#7AF4FF')],
            cloud: hex('#30F0FF'),
            shard: hex('#B8FFFF'),
            corner: hex('#15798F'),
        },
    },
    running: {
        life: 1,
        normal: {
            ring: [hex('#C8982A'), hex('#95701E')],
            runner: [hex('#F5A63A'), hex('#FAEF57')],
            edge: [hex('#E8AC44'), hex('#C07A22'), hex('#8A4E12')],
            edgeGlow: hex('#B8661C'),
            edgeRunner: hex('#FFE27A'),
            body: [hex('#C2702A'), hex('#A5551F'), hex('#86381A'), hex('#742B18')],
            line: [hex('#E0702A'), hex('#FFC45A')],
            cloud: hex('#E38A2E'),
            shard: hex('#FFCF94'),
            corner: hex('#4B331C'),
        },
        hot: {
            ring: [hex('#CB9E35'), hex('#9E781F')],
            runner: [hex('#FAB04F'), hex('#FFF67A')],
            edge: [hex('#FFF6CE'), hex('#FFEDB0'), hex('#FFE49A')],
            edgeGlow: hex('#FFA41E'),
            edgeRunner: hex('#FFFBE8'),
            body: [hex('#FFC450'), hex('#F59A38'), hex('#E36E2A'), hex('#C24A22')],
            line: [hex('#FFB04A'), hex('#FFE39A')],
            cloud: hex('#FFD060'),
            shard: hex('#FFF2CC'),
            corner: hex('#8F6015'),
        },
    },
    disabled: {
        life: 0,
        normal: {
            ring: [hex('#57451C'), hex('#463714')],
            runner: [hex('#57451C'), hex('#57451C')],
            edge: [hex('#46525A'), hex('#353D43'), hex('#3C444A')],
            edgeGlow: hex('#353D43'),
            edgeRunner: hex('#46525A'),
            body: [hex('#2A333A'), hex('#252D34'), hex('#21282E'), hex('#1E242A')],
            line: [hex('#343E46'), hex('#343E46')],
            cloud: hex('#2A333A'),
            shard: hex('#2A333A'),
            corner: hex('#262C32'),
        },
        hot: undefined as unknown as Palette,
    },
};
PALETTES.disabled.hot = PALETTES.disabled.normal;

/** 本体渐变 4 个色标的位置：0 是斜带处，1 是最远处 */
const BODY_STOPS = [0, 0.32, 0.66, 1];

/** 深色描边、右侧直角区域的底色 */
const OUTLINE: RGB = [12, 17, 19];
const BASE: RGB = [30, 35, 40];

/** 各层到外轮廓的距离，按 60px 高的按钮标定，其他高度等比缩放 */
const REFERENCE_HEIGHT = 60;
const LAYOUT = {
    outline: 1.4,
    ring: 3.4,
    /** 内部箭头形相对外轮廓的内缩 */
    capsuleInset: 7.4,
    /** 青色描边宽度；hover 时向外 / 向内各扩一些 */
    edge: 2.6,
    edgeGrowOut: 2.4,
    edgeGrowIn: 1.5,
    /** 内侧线条到箭头形边缘的距离、宽度 */
    lineOffset: 4.8,
    lineWidth: 2.2,
    /** 右侧直角区域细线到外轮廓的距离 */
    corner: 8.8,
    /** hover 时青色描边的外发光半径 */
    glowRadius: 6,
};

/** 流光斜带的尺寸，按 60px 高的按钮标定（CSS 像素，沿水平方向量） */
const BAND = {
    /** 金环：中间黄色、两端橙色的长度 */
    ringCore: 36,
    ringTail: 17,
    /** 青色描边：整段的长度，以及比金环落后多少 */
    edgeLength: 83,
    edgeLag: 8,
    /** 相邻两条斜带的间距，相对"按钮宽 + 高"（斜带走完全程的距离） */
    spacing: 1.08,
    /** 速度（像素 / 秒） */
    speed: 140,
};

/** 流光粗网格的间距（CSS 像素） */
const GRID = 4;

/** hover 稳定后的亮度；刚移上去时会先冲到更亮再回落 */
const HOVER_LEVEL = 0.6;
const FLASH_STRENGTH = 0.55;
const FLASH_RISE = 0.13;
const FLASH_DECAY = 0.3;

const clamp01 = (v: number) => v < 0 ? 0 : v > 1 ? 1 : v;
const smoothstep = (a: number, b: number, v: number) => {
    const t = clamp01((v - a) / (b - a));
    return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** @param edgeT 描边单独的混合比例，不传就和其他颜色一样 */
const mixPalette = (a: Palette, b: Palette, t: number, edgeT = t): Palette => {
    const list = <T extends RGB[]>(x: T, y: T, k = t) => x.map((c, i) => mixRGB(c, y[i], k)) as T;
    return {
        ring: list(a.ring, b.ring),
        runner: list(a.runner, b.runner),
        edge: list(a.edge, b.edge, edgeT),
        edgeGlow: mixRGB(a.edgeGlow, b.edgeGlow, edgeT),
        edgeRunner: mixRGB(a.edgeRunner, b.edgeRunner, edgeT),
        body: list(a.body, b.body),
        line: list(a.line, b.line),
        cloud: mixRGB(a.cloud, b.cloud, t),
        shard: mixRGB(a.shard, b.shard, t),
        corner: mixRGB(a.corner, b.corner, t),
    };
};

// ---------------------------------------------------------------------------
// 噪声：固定种子的二维值噪声，返回 0~1
// ---------------------------------------------------------------------------
const NOISE_SIZE = 64;
const NOISE = (() => {
    const table = new Float32Array(NOISE_SIZE * NOISE_SIZE);
    let seed = 20261124;
    for (let i = 0; i < table.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        table[i] = (seed >>> 8) / 0xffffff;
    }
    return table;
})();

const noise = (x: number, y: number): number => {
    const fx = Math.floor(x), fy = Math.floor(y);
    let tx = x - fx, ty = y - fy;
    tx = tx * tx * (3 - 2 * tx);
    ty = ty * ty * (3 - 2 * ty);
    const mask = NOISE_SIZE - 1;
    const x0 = fx & mask, x1 = (fx + 1) & mask;
    const y0 = (fy & mask) * NOISE_SIZE, y1 = ((fy + 1) & mask) * NOISE_SIZE;
    const a = NOISE[y0 + x0] + (NOISE[y0 + x1] - NOISE[y0 + x0]) * tx;
    const b = NOISE[y1 + x0] + (NOISE[y1 + x1] - NOISE[y1 + x0]) * tx;
    return a + (b - a) * ty;
};

/** 光片的亮度曲线：从尾部慢慢变亮，到前缘突然截断（前缘朝右，所以看起来是往右飘的锐利光片） */
const SHARD_LUT_SIZE = 1024;
const SHARD_LUT = (() => {
    const lut = new Float32Array(SHARD_LUT_SIZE + 1);
    for (let i = 0; i <= SHARD_LUT_SIZE; i++) {
        const f = i / SHARD_LUT_SIZE;
        lut[i] = Math.pow(f, 2.6) * (1 - smoothstep(0.978, 1, f));
    }
    return lut;
})();

/** 只和尺寸有关的数据，尺寸不变就一直复用 */
interface Geometry {
    width: number;      // 画布像素
    height: number;
    dpr: number;
    scale: number;      // 相对 REFERENCE_HEIGHT 的缩放
    /** 到外轮廓 / 内部箭头形的有向距离（CSS 像素） */
    outer: Float32Array;
    inner: Float32Array;
    /** 沿 45° 方向的位置：左上角为 0，越往右下越大 */
    diagonal: Float32Array;
    /** 相邻两条斜带的间距 */
    period: number;
    /** 流光粗网格的尺寸，以及每列 / 每行像素对应的网格坐标 */
    gridCols: number;
    gridRows: number;
    image: ImageData;
    // 粗网格上的各个场
    phase1: Float32Array;
    phase2: Float32Array;
    mask1: Float32Array;
    mask2: Float32Array;
    cloud: Float32Array;
}

const buildGeometry = (ctx: CanvasRenderingContext2D, cssWidth: number, cssHeight: number, dpr: number): Geometry => {
    const width = Math.max(1, Math.round(cssWidth * dpr));
    const height = Math.max(1, Math.round(cssHeight * dpr));
    const total = width * height;
    const outer = new Float32Array(total);
    const inner = new Float32Array(total);
    const diagonal = new Float32Array(total);

    const scale = cssHeight / REFERENCE_HEIGHT;
    // 轮廓往里收半个像素，抗锯齿的边缘不会被画布裁掉
    const hw = cssWidth / 2 - 0.5;
    const hh = cssHeight / 2 - 0.5;
    const inset = LAYOUT.capsuleInset * scale;
    const ih = hh - inset;                  // 箭头形的半高
    const leftCenter = -hw + hh;            // 左侧半圆的圆心（外轮廓和箭头形同心）
    const tip = hw - inset;                 // 箭头尖端

    for (let y = 0, i = 0; y < height; y++) {
        const py = (y + 0.5) / dpr - cssHeight / 2;
        const ay = Math.abs(py);
        for (let x = 0; x < width; x++, i++) {
            const px = (x + 0.5) / dpr - cssWidth / 2;

            // 外轮廓：左半圆 + 右直角
            if (px < leftCenter) {
                outer[i] = Math.hypot(px - leftCenter, py) - hh;
            } else {
                outer[i] = Math.max(ay - hh, px - hw);
            }

            // 内部箭头形：左半圆 + 右侧 45° 箭头
            if (px < leftCenter) {
                inner[i] = Math.hypot(px - leftCenter, py) - ih;
            } else {
                inner[i] = Math.max(ay - ih, (px + ay - tip) * Math.SQRT1_2);
            }

            diagonal[i] = (px + hw) + (py + hh);
        }
    }

    const gridCols = Math.ceil(cssWidth / GRID) + 2;
    const gridRows = Math.ceil(cssHeight / GRID) + 2;
    const field = () => new Float32Array(gridCols * gridRows);
    return {
        width, height, dpr, scale, outer, inner, diagonal, gridCols, gridRows,
        period: (cssWidth + cssHeight) * BAND.spacing,
        image: ctx.createImageData(width, height),
        phase1: field(), phase2: field(), mask1: field(), mask2: field(), cloud: field(),
    };
};

/** 在粗网格上计算这一帧的流场 */
const updateFields = (g: Geometry, time: number) => {
    const { gridCols, gridRows, phase1, phase2, mask1, mask2, cloud } = g;
    const unit = GRID / (30 * g.scale);     // 一格对应多少个"半高"
    for (let row = 0, i = 0; row < gridRows; row++) {
        const y = row * unit;
        for (let col = 0; col < gridCols; col++, i++) {
            const x = col * unit;
            const warpA = noise(x * 0.55 + 3.1, y * 0.8 + time * 0.23);
            const warpB = noise(x * 0.9 - time * 0.17 + 21.7, y * 1.2 + 9.3);
            // 光片的相位：往右移动，y 项让前缘和斜带同向倾斜，扰动让它弯曲
            phase1[i] = x / 3.6 - time * 0.2 + warpA * 1.15 + y * 0.14;
            phase2[i] = x / 2.5 - time * 0.31 + warpB * 0.95 + y * 0.24 + 0.37;
            // 遮罩：把整条光带打碎成一片一片的
            mask1[i] = smoothstep(0.38, 0.66, noise(x * 0.8 - time * 0.33 + 40.2, y * 1.15 + time * 0.12));
            mask2[i] = smoothstep(0.46, 0.7, noise(x * 1.05 - time * 0.42 + 11.9, y * 1.5 - time * 0.15 + 31.4));
            cloud[i] = smoothstep(0.34, 0.86,
                noise(x * 0.6 - time * 0.36 + warpB, y * 0.9 + warpA) * 0.65
                + noise(x * 1.3 - time * 0.55 + 7.7, y * 1.7 + 2.2) * 0.35);
        }
    }
};

/** 到最近一条斜带中心的有符号距离 */
const bandDistance = (position: number, center: number, period: number) => {
    const d = position - center;
    return d - period * Math.round(d / period);
};

/** 斜带的硬边，只留一个像素的抗锯齿 */
const bandCover = (distance: number, halfLength: number, dpr: number) => clamp01((halfLength - Math.abs(distance)) * dpr * Math.SQRT1_2 + 0.5);

/** 描边的亮度曲线：hover 稳定后描边仍要很亮，所以比其他部分升得更快 */
const edgeHeatOf = (glow: number) => Math.pow(clamp01(glow), 0.55);

interface FrameState {
    palette: Palette;
    /** 流光强度：禁用时为 0 */
    life: number;
    /** hover 亮度，0~1 左右 */
    glow: number;
    /** 刚移上去时的闪光，0~1 */
    flash: number;
    /** 按下的程度，0~1 */
    press: number;
    time: number;
}

const paint = (ctx: CanvasRenderingContext2D, g: Geometry, state: FrameState) => {
    const { width, height, dpr, scale, outer, inner, diagonal, period, gridCols, image } = g;
    const { palette: c, life, glow, flash, press, time } = state;
    const data = image.data;
    const animated = life > 0.01;
    if (animated) updateFields(g, time);

    // 各层颜色的查找表，按离斜带的远近取色：下标 0 是斜带中心，最后一个是最远处
    const LUT = 256;
    const bodyLut = new Float32Array(LUT * 3);
    const edgeLut = new Float32Array(LUT * 3);
    const ringLut = new Float32Array(LUT * 3);
    const lineFade = new Float32Array(LUT);
    const lineHeat = new Float32Array(LUT);
    for (let k = 0; k < LUT; k++) {
        // 余弦过渡，斜带两侧平滑地暗下去
        const t = 0.5 - 0.5 * Math.cos(Math.PI * k / (LUT - 1));
        let stop = 0;
        while (stop < 2 && t > BODY_STOPS[stop + 1]) stop++;
        const bodyT = clamp01((t - BODY_STOPS[stop]) / (BODY_STOPS[stop + 1] - BODY_STOPS[stop]));
        for (let ch = 0; ch < 3; ch++) {
            bodyLut[k * 3 + ch] = lerp(c.body[stop][ch], c.body[stop + 1][ch], bodyT);
            edgeLut[k * 3 + ch] = t < 0.5
                ? lerp(c.edge[0][ch], c.edge[1][ch], t * 2)
                : lerp(c.edge[1][ch], c.edge[2][ch], t * 2 - 1);
            ringLut[k * 3 + ch] = lerp(c.ring[0][ch], c.ring[1][ch], t);
        }
        // 内侧线条只在远离斜带的深色区域显现，靠近斜带的一侧偏亮
        lineFade[k] = smoothstep(0.3, 0.72, t) * 0.92;
        lineHeat[k] = 1 - smoothstep(0.5, 0.95, t);
    }

    // 斜带中心的位置；青色描边、本体、内侧线条比金环稍微落后
    const ringCenter = time * BAND.speed * scale;
    const edgeCenterPos = ringCenter - BAND.edgeLag * scale;
    const ringCore = BAND.ringCore / 2 * scale;
    const ringTail = ringCore + BAND.ringTail * scale;
    const edgeBand = BAND.edgeLength / 2 * scale;
    const toLut = (LUT - 1) / (period / 2);

    const outline = LAYOUT.outline * scale;
    const ringEnd = outline + LAYOUT.ring * scale;
    const cornerAt = LAYOUT.corner * scale;
    const edgeHeat = edgeHeatOf(glow);
    const edgeOut = LAYOUT.edgeGrowOut * scale * edgeHeat;
    const edgeIn = LAYOUT.edge * scale + LAYOUT.edgeGrowIn * scale * edgeHeat;
    const edgeCenter = (edgeOut - edgeIn) / 2;
    const edgeHalf = (edgeOut + edgeIn) / 2;
    const lineFrom = LAYOUT.lineOffset * scale + LAYOUT.edgeGrowIn * scale * edgeHeat * 0.5;
    const lineTo = lineFrom + LAYOUT.lineWidth * scale;
    const glowRadius = LAYOUT.glowRadius * scale;
    const shardGain = life * (0.52 + 0.4 * Math.min(glow, 1));
    const cloudGain = life * (0.36 + 0.24 * Math.min(glow, 1));
    const flashGain = flash * 0.5 * life;
    const dim = 1 - press * 0.18;
    const gridStep = 1 / (dpr * GRID);

    for (let y = 0, i = 0, o = 0; y < height; y++) {
        const gy = (y + 0.5) * gridStep;
        const row = gy | 0;
        const ty = gy - row;
        const rowOffset = row * gridCols;
        for (let x = 0; x < width; x++, i++, o += 4) {
            const dOuter = outer[i];
            const alpha = clamp01(0.5 - dOuter * dpr);
            if (alpha === 0) {
                data[o + 3] = 0;
                continue;
            }

            const dInner = inner[i];
            const edgeDist = bandDistance(diagonal[i], edgeCenterPos, period);
            const tone = (Math.abs(edgeDist) * toLut) | 0;
            const lut = tone * 3;
            let r: number, gr: number, b: number;

            const bodyCover = clamp01(0.5 - (dInner + edgeIn) * dpr);
            if (bodyCover < 1) {
                // ---- 外层：描边、金环、底色、右侧细线、青色描边 ----
                r = OUTLINE[0]; gr = OUTLINE[1]; b = OUTLINE[2];

                const ringCover = clamp01(0.5 - (dOuter + outline) * dpr);
                const baseCover = clamp01(0.5 - (dOuter + ringEnd) * dpr);
                if (ringCover > 0 && baseCover < 1) {
                    const ringDist = bandDistance(diagonal[i], ringCenter, period);
                    const ringTone = ((Math.abs(ringDist) * toLut) | 0) * 3;
                    let rr = ringLut[ringTone], rg = ringLut[ringTone + 1], rb = ringLut[ringTone + 2];
                    if (animated) {
                        const tail = bandCover(ringDist, ringTail, dpr) * life;
                        if (tail > 0) {
                            const core = bandCover(ringDist, ringCore, dpr) * life;
                            rr = lerp(lerp(rr, c.runner[0][0], tail), c.runner[1][0], core);
                            rg = lerp(lerp(rg, c.runner[0][1], tail), c.runner[1][1], core);
                            rb = lerp(lerp(rb, c.runner[0][2], tail), c.runner[1][2], core);
                        }
                    }
                    r = lerp(r, rr, ringCover); gr = lerp(gr, rg, ringCover); b = lerp(b, rb, ringCover);
                }
                r = lerp(r, BASE[0], baseCover); gr = lerp(gr, BASE[1], baseCover); b = lerp(b, BASE[2], baseCover);

                const cornerCover = clamp01((0.5 * scale - Math.abs(dOuter + cornerAt)) * dpr + 0.5);
                if (cornerCover > 0) {
                    // 斜带靠近时跟着亮一点
                    const lit = (1 - tone / (LUT - 1)) * 0.35 * life;
                    r = lerp(r, lerp(c.corner[0], c.edge[1][0], lit), cornerCover);
                    gr = lerp(gr, lerp(c.corner[1], c.edge[1][1], lit), cornerCover);
                    b = lerp(b, lerp(c.corner[2], c.edge[1][2], lit), cornerCover);
                }

                // hover 时青色描边往外发光，盖在底色和金环内侧上
                if (glow > 0.01 && dInner > 0 && dInner < glowRadius) {
                    const k = 1 - dInner / glowRadius;
                    const strength = k * k * 0.95 * edgeHeat * life;
                    r = lerp(r, c.edgeGlow[0], strength);
                    gr = lerp(gr, c.edgeGlow[1], strength);
                    b = lerp(b, c.edgeGlow[2], strength);
                }

                const edgeCover = clamp01(0.5 - (dInner - edgeOut) * dpr);
                if (edgeCover > 0) {
                    let er = edgeLut[lut], eg = edgeLut[lut + 1], eb = edgeLut[lut + 2];
                    if (animated) {
                        const run = bandCover(edgeDist, edgeBand, dpr) * life;
                        if (run > 0) {
                            er = lerp(er, c.edgeRunner[0], run);
                            eg = lerp(eg, c.edgeRunner[1], run);
                            eb = lerp(eb, c.edgeRunner[2], run);
                        }
                    }
                    // hover 时中间亮、两侧晕开，像发光的灯管
                    if (edgeHeat > 0.01) {
                        const core = smoothstep(0, 0.75, 1 - Math.abs(dInner - edgeCenter) / edgeHalf);
                        const bleed = (1 - core) * edgeHeat * life;
                        er = lerp(er, c.edgeGlow[0], bleed);
                        eg = lerp(eg, c.edgeGlow[1], bleed);
                        eb = lerp(eb, c.edgeGlow[2], bleed);
                    }
                    r = lerp(r, er, edgeCover); gr = lerp(gr, eg, edgeCover); b = lerp(b, eb, edgeCover);
                }
            } else {
                r = gr = b = 0;
            }

            if (bodyCover > 0) {
                // ---- 本体：渐变 + 光晕 + 光片 + 内侧线条 ----
                let br = bodyLut[lut], bg = bodyLut[lut + 1], bb = bodyLut[lut + 2];
                if (animated) {
                    const gx = (x + 0.5) * gridStep;
                    const col = gx | 0;
                    const tx = gx - col;
                    const n = rowOffset + col;
                    const w00 = (1 - tx) * (1 - ty), w10 = tx * (1 - ty), w01 = (1 - tx) * ty, w11 = tx * ty;
                    const m = n + gridCols;
                    const sample = (f: Float32Array) => f[n] * w00 + f[n + 1] * w10 + f[m] * w01 + f[m + 1] * w11;

                    const cl = sample(g.cloud) * cloudGain;
                    br = lerp(br, c.cloud[0], cl); bg = lerp(bg, c.cloud[1], cl); bb = lerp(bb, c.cloud[2], cl);

                    const p1 = sample(g.phase1), p2 = sample(g.phase2);
                    const s1 = SHARD_LUT[((p1 - Math.floor(p1)) * SHARD_LUT_SIZE) | 0] * sample(g.mask1);
                    const s2 = SHARD_LUT[((p2 - Math.floor(p2)) * SHARD_LUT_SIZE) | 0] * sample(g.mask2);
                    const shard = Math.min(1, s1 + s2 * 0.75) * shardGain;
                    br = lerp(br, c.shard[0], shard); bg = lerp(bg, c.shard[1], shard); bb = lerp(bb, c.shard[2], shard);
                }

                // 内侧线条
                const lineCover = clamp01(0.5 - (dInner + lineFrom) * dpr) * clamp01(0.5 + (dInner + lineTo) * dpr);
                if (lineCover > 0) {
                    const fade = lineFade[tone] * lineCover;
                    let lr = c.line[0][0], lg = c.line[0][1], lb = c.line[0][2];
                    const heat = lineHeat[tone];
                    lr = lerp(lr, c.line[1][0], heat); lg = lerp(lg, c.line[1][1], heat); lb = lerp(lb, c.line[1][2], heat);
                    br = lerp(br, lr, fade); bg = lerp(bg, lg, fade); bb = lerp(bb, lb, fade);
                }

                // 贴着描边的一圈内发光，hover 时更明显
                const rimFade = clamp01(1 + (dInner + edgeIn) / (9 * scale));
                const rim = rimFade * rimFade * (0.22 + 0.68 * edgeHeat) * life;
                if (rim > 0) {
                    br = lerp(br, c.edgeGlow[0], rim); bg = lerp(bg, c.edgeGlow[1], rim); bb = lerp(bb, c.edgeGlow[2], rim);
                }

                r = lerp(r, br, bodyCover); gr = lerp(gr, bg, bodyCover); b = lerp(b, bb, bodyCover);
            }

            if (flashGain > 0.002 && dInner < edgeOut) {
                // 滤色叠加发光色，提亮的同时保持饱和，不会发灰
                r += (255 - r) * flashGain * c.edgeGlow[0] / 255;
                gr += (255 - gr) * flashGain * c.edgeGlow[1] / 255;
                b += (255 - b) * flashGain * c.edgeGlow[2] / 255;
            }

            data[o] = r * dim;
            data[o + 1] = gr * dim;
            data[o + 2] = b * dim;
            data[o + 3] = alpha * 255;
        }
    }
    ctx.putImageData(image, 0, 0);
};

/** 指数逼近：每过 tau 秒，离目标的距离缩小到约 37% */
const approach = (value: number, target: number, dt: number, tau: number) =>
    target + (value - target) * Math.exp(-dt / tau);

/** 常态 30fps 足够流畅；hover 时有快速的亮度变化，用屏幕刷新率 */
const IDLE_FRAME_MS = 1000 / 30;

/** 开始按钮的动画控制器 */
export class StartButtonRenderer {
    private readonly ctx: CanvasRenderingContext2D | null;
    private geometry: Geometry | null = null;
    private variant: StartButtonVariant;
    private paletteNormal: Palette;
    private paletteHot: Palette;
    private life: number;
    private paletteSettled = true;

    private frameId = 0;
    private running = false;
    private lastTime = 0;
    private lastPaint = 0;
    /** 流光时间，只在播放时前进，页面切走再回来不会跳变 */
    private time = Math.random() * 60;

    private level = 0;
    private flash = 0;
    private press = 0;
    private hovering = false;
    private hoverElapsed = 0;

    /**
     * @param canvas 画布，铺满整个按钮
     * @param button 用来读取 hover / 按下状态
     */
    constructor(
        private readonly canvas: HTMLCanvasElement,
        private readonly button: HTMLElement,
        variant: StartButtonVariant,
    ) {
        this.ctx = canvas.getContext('2d');
        this.variant = variant;
        this.paletteNormal = PALETTES[variant].normal;
        this.paletteHot = PALETTES[variant].hot;
        this.life = PALETTES[variant].life;
    }

    public setVariant(variant: StartButtonVariant) {
        if (variant === this.variant) return;
        this.variant = variant;
        this.paletteSettled = false;
        this.wake();
    }

    public start() {
        this.running = true;
        this.wake();
    }

    public stop() {
        this.running = false;
        cancelAnimationFrame(this.frameId);
        this.frameId = 0;
    }

    /** 尺寸变化后重画 */
    public resize() {
        this.geometry = null;
        this.wake();
    }

    private wake() {
        if (!this.running || this.frameId || !this.ctx) return;
        this.lastTime = performance.now();
        this.lastPaint = 0;
        this.frameId = requestAnimationFrame(this.tick);
    }

    private readonly tick = (now: number) => {
        this.frameId = 0;
        if (!this.running || !this.ctx) return;

        const active = this.variant !== 'disabled';
        const busy = this.hovering || this.level > 0.01 || this.flash > 0.01 || !this.paletteSettled;
        // 减 4ms 余量，避免因为计时误差把 30fps 拖成 20fps
        if (busy || now - this.lastPaint >= IDLE_FRAME_MS - 4) {
            const dt = Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000));
            this.lastTime = now;
            this.lastPaint = now;
            this.update(dt, active);
            this.paintFrame();
        }

        // 禁用状态是静止的，颜色过渡完就不再占用 CPU
        if (active || !this.paletteSettled || this.level > 0.01 || this.flash > 0.01) {
            this.frameId = requestAnimationFrame(this.tick);
        }
    };

    private update(dt: number, active: boolean) {
        this.time += dt;

        const target = PALETTES[this.variant];
        if (!this.paletteSettled) {
            const t = 1 - Math.exp(-dt / 0.12);
            this.paletteNormal = mixPalette(this.paletteNormal, target.normal, t);
            this.paletteHot = mixPalette(this.paletteHot, target.hot, t);
            this.life = lerp(this.life, target.life, t);
            if (Math.abs(this.life - target.life) < 0.004
                && Math.abs(this.paletteNormal.body[0][0] - target.normal.body[0][0]) < 1) {
                this.paletteNormal = target.normal;
                this.paletteHot = target.hot;
                this.life = target.life;
                this.paletteSettled = true;
            }
        }

        const hovering = active && this.button.matches(':hover, :focus-visible');
        if (hovering && !this.hovering) this.hoverElapsed = 0;
        this.hovering = hovering;

        if (hovering) {
            this.hoverElapsed += dt;
            this.level = approach(this.level, HOVER_LEVEL, dt, 0.08);
            // 先冲亮，再回落到稳定亮度
            this.flash = this.hoverElapsed < FLASH_RISE
                ? Math.max(this.flash, this.hoverElapsed / FLASH_RISE)
                : Math.exp(-(this.hoverElapsed - FLASH_RISE) / FLASH_DECAY);
        } else {
            this.level = approach(this.level, 0, dt, 0.14);
            this.flash = approach(this.flash, 0, dt, 0.08);
        }
        this.press = approach(this.press, active && this.button.matches(':active') ? 1 : 0, dt, 0.04);
    }

    private paintFrame() {
        if (!this.ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const cssWidth = this.button.offsetWidth;
        const cssHeight = this.button.offsetHeight;
        if (cssWidth < 8 || cssHeight < 8) return;

        let g = this.geometry;
        if (!g || g.dpr !== dpr) {
            this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
            this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
            g = this.geometry = buildGeometry(this.ctx, cssWidth, cssHeight, dpr);
        }

        const glow = this.level + this.flash * FLASH_STRENGTH;
        paint(this.ctx, g, {
            palette: mixPalette(this.paletteNormal, this.paletteHot, Math.min(glow, 1), edgeHeatOf(glow)),
            life: this.life,
            glow,
            flash: this.flash,
            press: this.press,
            time: this.time,
        });
    }
}
