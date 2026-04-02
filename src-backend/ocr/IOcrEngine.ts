/**
 * @file OCR Engine Interface — 定义所有 OCR 引擎的统一接口
 * @description 本文件定义了多引擎 OCR 系统的核心接口，支持 Tesseract、EasyOCR 等引擎的插件式集成。
 *              通过统一接口实现引擎切换、投票表决和性能比较。
 *
 * 设计原则:
 * - 所有引擎实现统一接口，便于替换和比较
 * - 置信度归一化到 0-1 范围，方便跨引擎投票
 * - 支持引擎健康检查和可用性检测
 *
 * @see IOcrEngine 主接口
 * @see OcrResult 识别结果类型
 * @see ConfidenceNormalizer 置信度归一化
 */

/**
 * OCR 区域信息 — 包含文字块的位置和置信度
 */
export interface OcrRegion {
    /** 识别的文字内容 */
    text: string;
    /** 区域置信度 (0-1) */
    confidence: number;
    /** 边界框 x 坐标 */
    x: number;
    /** 边界框 y 坐标 */
    y: number;
    /** 边界框宽度 */
    width: number;
    /** 边界框高度 */
    height: number;
}

/**
 * 识别结果 — 统一的 OCR 输出格式
 */
export interface OcrResult {
    /** 识别的文字内容 (已清理) */
    text: string;
    /** 归一化置信度 (0-1) */
    confidence: number;
    /** 区域信息 (可选) */
    regions?: OcrRegion[];
    /** 引擎标识符 */
    engine: string;
    /** 引擎原始置信度 (未归一化) */
    rawConfidence?: number;
    /** 识别耗时 (毫秒) */
    processingTimeMs?: number;
}

/**
 * 识别选项 — 控制 OCR 行为的参数
 */
export interface RecognitionOptions {
    /** 自定义 ROI (Region of Interest) 裁剪 */
    roi?: { x: number; y: number; width: number; height: number };
    /** 预处理选项 */
    preprocessing?: {
        /** 是否灰度化 */
        grayscale?: boolean;
        /** 是否二值化 */
        threshold?: number;
        /** 是否使用 CLAHE 增强 */
        clahe?: boolean;
        /** 是否降噪 */
        denoise?: boolean;
        /** 缩放因子 */
        scale?: number;
    };
    /** 字符白名单 (仅 Tesseract 支持) */
    charWhitelist?: string;
    /** 最大置信度过滤阈值 (低于此值的结果将被丢弃) */
    minConfidence?: number;
}

/**
 * 引擎信息 — 描述 OCR 引擎的能力和状态
 */
export interface EngineInfo {
    /** 引擎名称 (如 "tesseract", "easyocr") */
    name: string;
    /** 引擎版本 */
    version?: string;
    /** 支持的语言列表 */
    languages: string[];
    /** 引擎类型标识 */
    type: "tesseract" | "easyocr" | "custom";
    /** 是否需要 GPU */
    requiresGpu: boolean;
    /** 估计的初始化时间 (毫秒) */
    estimatedInitTimeMs: number;
}

/**
 * OCR 引擎接口 — 所有 OCR 引擎必须实现的标准接口
 *
 * @example
 * ```typescript
 * // 使用 Tesseract 引擎
 * const tesseract = new TesseractEngine();
 * await tesseract.initialize();
 * const result = await tesseract.recognize(imageBuffer);
 *
 * // 使用 EasyOCR 引擎
 * const easyocr = new EasyOcrEngine();
 * await easyocr.initialize();
 * const result = await easyocr.recognize(imageBuffer);
 * ```
 */
export interface IOcrEngine {
    /** 引擎名称 (只读) */
    readonly name: string;

    /**
     * 初始化引擎 — 加载模型、准备资源
     * @throws 如果初始化失败
     */
    initialize(): Promise<void>;

    /**
     * 执行 OCR 识别
     * @param imageBuffer 图片缓冲区 (PNG/JPG)
     * @param options 识别选项
     * @returns 识别结果
     * @throws 如果识别失败或引擎未初始化
     */
    recognize(imageBuffer: Buffer, options?: RecognitionOptions): Promise<OcrResult>;

    /**
     * 检查引擎是否可用 — 确认依赖是否安装、GPU 是否可用
     * @returns true 表示引擎可以正常工作
     */
    isAvailable(): boolean;

    /**
     * 获取引擎信息 — 名称、版本、支持的语言等
     * @returns 引擎元数据
     */
    getEngineInfo(): EngineInfo;

    /**
     * 销毁引擎 — 释放内存和资源
     */
    destroy(): Promise<void>;

    /**
     * 获取引擎健康状态 — 用于监控和故障排除
     * @returns 健康状态信息
     */
    getHealthStatus(): EngineHealthStatus;
}

/**
 * 引擎健康状态 — 用于监控引擎运行状态
 */
export interface EngineHealthStatus {
    /** 是否已初始化 */
    initialized: boolean;
    /** 是否正在处理 */
    busy: boolean;
    /** 累计识别次数 */
    recognitionCount: number;
    /** 累计失败次数 */
    failureCount: number;
    /** 平均识别耗时 (毫秒) */
    averageProcessingTimeMs: number;
    /** 最后一次识别时间 */
    lastRecognitionAt?: number;
    /** 最后一次错误信息 */
    lastError?: string;
}

/**
 * 引擎工厂函数类型 — 用于动态创建引擎实例
 */
export type EngineFactory = () => IOcrEngine;
