/**
 * 应用级别的类型定义
 * @description 这个文件只包含纯类型/枚举，不依赖任何 Node.js 模块
 *              前端和后端都可以安全导入
 */

/**
 * 日志模式枚举
 * @description 控制日志的详细程度
 * - SIMPLE: 简略模式，不打印 debug 级别日志
 * - DETAILED: 详细模式，打印所有日志（包括 debug）
 */
export enum LogMode {
    SIMPLE = 'SIMPLE',      //  简略模式，不打印 debug
    DETAILED = 'DETAILED',  //  详细模式，打印所有日志
}
