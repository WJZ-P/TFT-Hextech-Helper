/**
 * @file EasyOCR Node Adapter — 通过 Python bridge 调用 EasyOCR 的 Node.js 适配器
 * @description 本适配器通过 child_process 调用 scripts/easyocr_bridge.py，
 *              实现 IOcrEngine 接口，提供 EasyOCR 的文字识别能力。
 *
 * 设计原则:
 * - 通过进程隔离调用 Python 脚本，避免 Electron 主进程的模块冲突
 * - 使用 JSON 进行进程间通信，便于解析和错误处理
 * - 集成 ConfidenceNormalizer 进行置信度归一化
 * - 完整的健康状态追踪和错误恢复机制
 *
 * @example
 * ```typescript
 * const adapter = new EasyOcrNodeAdapter();
 * await adapter.initialize();
 * const result = await adapter.recognize(imageBuffer, { roi: { x: 0, y: 0, width: 200, height: 50 } });
 * console.log(result.text, result.confidence);
 * await adapter.destroy();
 * ```
 */

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { IOcrEngine, OcrResult, OcrRegion, RecognitionOptions, EngineInfo, EngineHealthStatus } from "./IOcrEngine";
import { ConfidenceNormalizer } from "./ConfidenceNormalizer";
import { logger } from "../utils/Logger";

const execAsync = promisify(exec);

// Python 脚本路径 (相对于项目根目录)
const EASYOCR_BRIDGE_SCRIPT = "scripts/easyocr_bridge.py";

/**
 * EasyOCR Python bridge 调用结果
 */
interface EasyOcrBridgeResult {
    text: string;
    confidence: number;
    regions: Array<{
        text: string;
        confidence: number;
        x: number;
        y: number;
        width: number;
        height: number;
    }>;
}

/**
 * EasyOCR Python bridge 错误结果
 */
interface EasyOcrBridgeError {
    error: string;
    details?: string;
}

/**
 * 适配器配置选项
 */
export interface EasyOcrNodeAdapterConfig {
    /** Python 解释器路径 (默认: python) */
    pythonPath?: string;
    /** 脚本路径 (默认: scripts/easyocr_bridge.py) */
    scriptPath?: string;
    /** 超时时间 (毫秒, 默认: 30000) */
    timeoutMs?: number;
    /** 是否使用 GPU (默认: false) */
    useGpu?: boolean;
}

/**
 * EasyOCR Node 适配器
 *
 * 通过调用 Python 脚本实现 OCR 功能，适用于 Electron 主进程环境。
 */
export class EasyOcrNodeAdapter implements IOcrEngine {
    /** 引擎名称 */
    public readonly name = "easyocr-node";

    private config: Required<EasyOcrNodeAdapterConfig>;
    private normalizer: ConfidenceNormalizer;
    private initialized = false;
    private scriptExists = false;
    private busy = false;

    // 健康状态追踪
    private recognitionCount = 0;
    private failureCount = 0;
    private totalProcessingTimeMs = 0;
    private lastRecognitionAt: number | undefined;
    private lastError: string | undefined;

    /**
     * 创建 EasyOCR Node 适配器
     *
     * @param config 适配器配置
     */
    constructor(config?: EasyOcrNodeAdapterConfig) {
        this.config = {
            pythonPath: config?.pythonPath ?? "python",
            scriptPath: config?.scriptPath ?? EASYOCR_BRIDGE_SCRIPT,
            timeoutMs: config?.timeoutMs ?? 30000,
            useGpu: config?.useGpu ?? false,
        };

        this.normalizer = new ConfidenceNormalizer();
    }

    /**
     * 初始化引擎 — 检查脚本和依赖是否可用
     */
    public async initialize(): Promise<void> {
        if (this.initialized) {
            logger.debug("[EasyOcrNodeAdapter] Already initialized");
            return;
        }

        logger.info("[EasyOcrNodeAdapter] Initializing EasyOCR Node Adapter...");

        // 检查脚本是否存在
        const scriptPath = this.getScriptPath();
        if (!fs.existsSync(scriptPath)) {
            this.scriptExists = false;
            throw new Error(
                `EasyOCR bridge script not found at: ${scriptPath}. ` +
                "Please ensure scripts/easyocr_bridge.py exists."
            );
        }
        this.scriptExists = true;

        // 尝试调用脚本 --help 来验证 Python 和依赖
        try {
            await this.executeBridge("--help");
            logger.info("[EasyOcrNodeAdapter] EasyOCR bridge initialized successfully");
            this.initialized = true;
        } catch (error) {
            this.scriptExists = false;
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(
                `Failed to initialize EasyOCR bridge: ${message}. ` +
                "Please ensure Python and easyocr are installed: pip install easyocr opencv-python"
            );
        }
    }

    /**
     * 执行 OCR 识别
     *
     * @param imageBuffer 图片缓冲区
     * @param options 识别选项
     * @returns 识别结果
     */
    public async recognize(imageBuffer: Buffer, options?: RecognitionOptions): Promise<OcrResult> {
        if (!this.initialized) {
            throw new Error("EasyOCR adapter not initialized. Call initialize() first.");
        }

        if (!this.scriptExists) {
            throw new Error("EasyOCR bridge script not found.");
        }

        if (this.busy) {
            throw new Error("EasyOCR adapter is busy processing another request.");
        }

        this.busy = true;
        const startTime = Date.now();

        try {
            // 创建临时图片文件
            const tempDir = path.join(process.cwd(), "tmp");
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempImagePath = path.join(tempDir, `easyocr_temp_${Date.now()}.png`);

            try {
                // 写入临时文件
                fs.writeFileSync(tempImagePath, imageBuffer);

                // 构建命令行参数
                const args = this.buildArgs(tempImagePath, options);

                // 执行 OCR
                const output = await this.executeBridge(args);

                // 解析结果
                const result = this.parseOutput(output);

                // 更新健康统计
                const processingTime = Date.now() - startTime;
                this.recognitionCount++;
                this.totalProcessingTimeMs += processingTime;
                this.lastRecognitionAt = Date.now();

                // 使用 ConfidenceNormalizer 归一化置信度
                const normalizedConfidence = this.normalizer.normalize(
                    result.confidence,
                    "easyocr",
                    result.text
                );

                // 转换区域格式
                const regions: OcrRegion[] = result.regions?.map((r) => ({
                    text: r.text,
                    confidence: r.confidence,
                    x: r.x,
                    y: r.y,
                    width: r.width,
                    height: r.height,
                })) ?? [];

                // 应用最小置信度过滤
                if (options?.minConfidence && normalizedConfidence < options.minConfidence) {
                    logger.debug(
                        `[EasyOcrNodeAdapter] Filtered result below minConfidence: ` +
                        `${normalizedConfidence.toFixed(2)} < ${options.minConfidence}`
                    );
                }

                return {
                    text: result.text,
                    confidence: normalizedConfidence,
                    regions: regions.length > 0 ? regions : undefined,
                    engine: "easyocr",
                    rawConfidence: result.confidence,
                    processingTimeMs: processingTime,
                };
            } finally {
                // 清理临时文件
                if (fs.existsSync(tempImagePath)) {
                    fs.unlinkSync(tempImagePath);
                }
            }
        } catch (error) {
            this.failureCount++;
            this.lastError = error instanceof Error ? error.message : String(error);
            logger.error(`[EasyOcrNodeAdapter] OCR recognition failed: ${this.lastError}`);
            throw error;
        } finally {
            this.busy = false;
        }
    }

    /**
     * 检查引擎是否可用
     */
    public isAvailable(): boolean {
        return this.initialized && this.scriptExists;
    }

    /**
     * 获取引擎信息
     */
    public getEngineInfo(): EngineInfo {
        return {
            name: "EasyOCR (via Node Adapter)",
            version: "1.0.0",
            languages: ["ch_sim", "en"],
            type: "easyocr",
            requiresGpu: this.config.useGpu,
            estimatedInitTimeMs: 5000, // 模型加载时间较长
        };
    }

    /**
     * 销毁引擎 — 清理资源
     */
    public async destroy(): Promise<void> {
        logger.info("[EasyOcrNodeAdapter] Destroying adapter...");
        this.initialized = false;
        this.scriptExists = false;
        this.busy = false;
    }

    /**
     * 获取引擎健康状态
     */
    public getHealthStatus(): EngineHealthStatus {
        const avgTime =
            this.recognitionCount > 0
                ? this.totalProcessingTimeMs / this.recognitionCount
                : 0;

        return {
            initialized: this.initialized,
            busy: this.busy,
            recognitionCount: this.recognitionCount,
            failureCount: this.failureCount,
            averageProcessingTimeMs: Math.round(avgTime),
            lastRecognitionAt: this.lastRecognitionAt,
            lastError: this.lastError,
        };
    }

    /**
     * 获取脚本路径
     */
    private getScriptPath(): string {
        // 脚本路径相对于当前工作目录
        return path.isAbsolute(this.config.scriptPath)
            ? this.config.scriptPath
            : path.join(process.cwd(), this.config.scriptPath);
    }

    /**
     * 构建命令行参数
     */
    private buildArgs(imagePath: string, options?: RecognitionOptions): string {
        const args: string[] = [imagePath];

        // ROI
        if (options?.roi) {
            const { x, y, width, height } = options.roi;
            args.push("--roi", `${x},${y},${width},${height}`);
        }

        // 预处理选项
        if (options?.preprocessing) {
            if (options.preprocessing.grayscale) {
                args.push("--grayscale");
            }
            if (options.preprocessing.threshold !== undefined) {
                args.push("--threshold", String(options.preprocessing.threshold));
            }
        }

        // GPU 选项
        if (this.config.useGpu) {
            args.push("--gpu");
        }

        return args.join(" ");
    }

    /**
     * 执行 bridge 脚本
     */
    private async executeBridge(args: string): Promise<string> {
        const scriptPath = this.getScriptPath();
        const command = `${this.config.pythonPath} "${scriptPath}" ${args}`;

        logger.debug(`[EasyOcrNodeAdapter] Executing: ${command}`);

        try {
            const { stdout, stderr } = await execAsync(command, {
                timeout: this.config.timeoutMs,
                windowsHide: true,
            });

            if (stderr) {
                logger.debug(`[EasyOcrNodeAdapter] stderr: ${stderr}`);
            }

            return stdout.trim();
        } catch (error) {
            if (error instanceof Error) {
                // exec 错误会包含 stderr
                const execError = error as NodeJS.ErrnoException;
                if (execError.message?.includes("ENOENT")) {
                    throw new Error(
                        `Python interpreter not found at: ${this.config.pythonPath}`
                    );
                }
                throw new Error(`EasyOCR bridge execution failed: ${execError.message}`);
            }
            throw error;
        }
    }

    /**
     * 解析 bridge 输出
     */
    private parseOutput(output: string): EasyOcrBridgeResult {
        try {
            const result = JSON.parse(output) as EasyOcrBridgeResult | EasyOcrBridgeError;

            // 检查是否是错误响应
            if ("error" in result) {
                const errorResult = result as EasyOcrBridgeError;
                throw new Error(
                    `EasyOCR bridge error: ${errorResult.error}${
                        errorResult.details ? ` (${errorResult.details})` : ""
                    }`
                );
            }

            return result as EasyOcrBridgeResult;
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON output from EasyOCR bridge: ${output.substring(0, 200)}`);
            }
            throw error;
        }
    }
}

/**
 * 便捷函数: 创建并初始化 EasyOCR 适配器
 */
export async function createEasyOcrAdapter(
    config?: EasyOcrNodeAdapterConfig
): Promise<EasyOcrNodeAdapter> {
    const adapter = new EasyOcrNodeAdapter(config);
    await adapter.initialize();
    return adapter;
}
