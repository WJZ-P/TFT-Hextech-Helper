import sharp from "sharp";
import type { LootOrb, LootOrbType } from "../tft";

interface Component {
    type: LootOrbType;
    pixels: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    sumX: number;
    sumY: number;
}

interface PixelClass {
    matched: boolean;
    type: LootOrbType;
}

const DETECT_WIDTH = 480;
const BOARD_REGION = {
    left: 0.16,
    top: 0.38,
    right: 0.86,
    bottom: 0.82,
};

function classifyLootPixel(red: number, green: number, blue: number): PixelClass {
    if (blue > 145 && green > 75 && red < 120 && blue > red + 70 && blue > green + 10) {
        return { matched: true, type: "blue" };
    }

    if (red > 145 && green > 105 && green < 230 && blue < 130 && red > blue + 55) {
        return { matched: true, type: "gold" };
    }

    if (red > 175 && green > 175 && blue > 175 && Math.abs(red - green) < 35 && Math.abs(green - blue) < 35) {
        return { matched: true, type: "normal" };
    }

    return { matched: false, type: "normal" };
}

function shouldKeepComponent(component: Component): boolean {
    const width = component.maxX - component.minX + 1;
    const height = component.maxY - component.minY + 1;
    if (component.pixels < 10 || component.pixels > 900) {
        return false;
    }
    if (width < 4 || height < 4 || width > 42 || height > 42) {
        return false;
    }

    const aspect = width / Math.max(1, height);
    return aspect > 0.45 && aspect < 2.2;
}

function computeLocalRatios(
    data: Buffer,
    info: sharp.OutputInfo,
    centerX: number,
    centerY: number
): { darkRatio: number; purpleRatio: number } {
    const radius = 13;
    let dark = 0;
    let purple = 0;
    let total = 0;

    for (let y = Math.max(0, centerY - radius); y <= Math.min(info.height - 1, centerY + radius); y += 1) {
        for (let x = Math.max(0, centerX - radius); x <= Math.min(info.width - 1, centerX + radius); x += 1) {
            const index = (y * info.width + x) * info.channels;
            const red = data[index];
            const green = data[index + 1];
            const blue = data[index + 2];
            total += 1;
            if (red < 70 && green < 90 && blue < 120) {
                dark += 1;
            }
            if (blue > 120 && red > 55 && red < 190 && green < 130) {
                purple += 1;
            }
        }
    }

    return {
        darkRatio: dark / Math.max(1, total),
        purpleRatio: purple / Math.max(1, total),
    };
}

export async function detectAndroidLootOrbsFromScreenshot(screenshot: Buffer): Promise<LootOrb[]> {
    const metadata = await sharp(screenshot).metadata();
    const sourceWidth = metadata.width ?? 0;
    const sourceHeight = metadata.height ?? 0;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
        return [];
    }

    const detectHeight = Math.max(1, Math.round((sourceHeight / sourceWidth) * DETECT_WIDTH));
    const { data, info } = await sharp(screenshot)
        .resize({ width: DETECT_WIDTH, height: detectHeight, fit: "fill" })
        .raw()
        .toBuffer({ resolveWithObject: true });

    const left = Math.max(0, Math.round(info.width * BOARD_REGION.left));
    const right = Math.min(info.width - 1, Math.round(info.width * BOARD_REGION.right));
    const top = Math.max(0, Math.round(info.height * BOARD_REGION.top));
    const bottom = Math.min(info.height - 1, Math.round(info.height * BOARD_REGION.bottom));
    const visited = new Uint8Array(info.width * info.height);
    const components: Component[] = [];
    const queue: number[] = [];

    const pixelIndex = (x: number, y: number): number => (y * info.width + x) * info.channels;
    const maskIndex = (x: number, y: number): number => y * info.width + x;

    for (let y = top; y <= bottom; y += 1) {
        for (let x = left; x <= right; x += 1) {
            const startMaskIndex = maskIndex(x, y);
            if (visited[startMaskIndex]) {
                continue;
            }

            const startPixel = pixelIndex(x, y);
            const startClass = classifyLootPixel(data[startPixel], data[startPixel + 1], data[startPixel + 2]);
            if (!startClass.matched) {
                visited[startMaskIndex] = 1;
                continue;
            }

            const component: Component = {
                type: startClass.type,
                pixels: 0,
                minX: x,
                maxX: x,
                minY: y,
                maxY: y,
                sumX: 0,
                sumY: 0,
            };

            queue.length = 0;
            queue.push(startMaskIndex);
            visited[startMaskIndex] = 1;

            for (let cursor = 0; cursor < queue.length; cursor += 1) {
                const current = queue[cursor];
                const currentX = current % info.width;
                const currentY = Math.floor(current / info.width);
                const currentPixel = pixelIndex(currentX, currentY);
                const currentClass = classifyLootPixel(
                    data[currentPixel],
                    data[currentPixel + 1],
                    data[currentPixel + 2]
                );
                if (!currentClass.matched) {
                    continue;
                }

                component.pixels += 1;
                component.minX = Math.min(component.minX, currentX);
                component.maxX = Math.max(component.maxX, currentX);
                component.minY = Math.min(component.minY, currentY);
                component.maxY = Math.max(component.maxY, currentY);
                component.sumX += currentX;
                component.sumY += currentY;
                if (currentClass.type === "gold" || component.type === "normal") {
                    component.type = currentClass.type;
                }

                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
                    const nextX = currentX + dx;
                    const nextY = currentY + dy;
                    if (nextX < left || nextX > right || nextY < top || nextY > bottom) {
                        continue;
                    }
                    const nextMaskIndex = maskIndex(nextX, nextY);
                    if (visited[nextMaskIndex]) {
                        continue;
                    }
                    const nextPixel = pixelIndex(nextX, nextY);
                    const nextClass = classifyLootPixel(data[nextPixel], data[nextPixel + 1], data[nextPixel + 2]);
                    visited[nextMaskIndex] = 1;
                    if (nextClass.matched) {
                        queue.push(nextMaskIndex);
                    }
                }
            }

            if (shouldKeepComponent(component)) {
                components.push(component);
            }
        }
    }

    const candidates = components
        .map((component) => {
            const x = component.sumX / component.pixels / info.width;
            const y = component.sumY / component.pixels / info.height;
            const width = component.maxX - component.minX + 1;
            const height = component.maxY - component.minY + 1;
            const local = computeLocalRatios(
                data,
                info,
                Math.round(x * info.width),
                Math.round(y * info.height)
            );
            return {
                x,
                y,
                type: component.type,
                confidence: Math.min(1, component.pixels / 80),
                darkRatio: local.darkRatio,
                purpleRatio: local.purpleRatio,
                width,
                height,
            };
        })
        .filter((orb) => {
            const likelyProbabilityTriangle =
                orb.y < 0.53 &&
                orb.width <= 10 &&
                orb.height <= 8 &&
                orb.darkRatio > 0.45;
            const lowPurpleLootSignal = orb.darkRatio >= 0.04 && orb.purpleRatio <= 0.35;
            const roundBlueLootSignal =
                orb.confidence >= 0.45 &&
                orb.y >= 0.53 &&
                orb.width >= 12 &&
                orb.height >= 12 &&
                orb.purpleRatio >= 0.50;
            const smallBlueQuestionSignal =
                orb.confidence >= 0.14 &&
                orb.y >= 0.55 &&
                orb.width >= 5 &&
                orb.height >= 9 &&
                orb.darkRatio <= 0.10 &&
                orb.purpleRatio >= 0.50;
            const whiteQuestionSignal =
                orb.type === "normal" &&
                orb.confidence >= 0.55 &&
                orb.y >= 0.54 &&
                orb.width >= 10 &&
                orb.height >= 10 &&
                orb.darkRatio <= 0.08 &&
                orb.purpleRatio >= 0.45;
            return (
                orb.x >= 0.25 &&
                orb.x <= 0.80 &&
                orb.y >= 0.44 &&
                orb.y <= 0.78 &&
                !likelyProbabilityTriangle &&
                (
                    (
                        orb.type === "blue" &&
                        (
                            (orb.confidence >= 0.25 && lowPurpleLootSignal) ||
                            roundBlueLootSignal ||
                            smallBlueQuestionSignal
                        )
                    ) ||
                    whiteQuestionSignal
                )
            );
        })
        .sort((leftOrb, rightOrb) => rightOrb.confidence - leftOrb.confidence);

    const unique: typeof candidates = [];
    for (const candidate of candidates) {
        const duplicate = unique.some((kept) => {
            const dx = kept.x - candidate.x;
            const dy = kept.y - candidate.y;
            return Math.sqrt(dx * dx + dy * dy) < 0.05;
        });
        if (!duplicate) {
            unique.push(candidate);
        }
    }

    return unique
        .slice(0, 4)
        .map(({ x, y, type, confidence }) => ({ x, y, type, confidence }));
}
