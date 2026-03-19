/**
 * Services 模块统一导出
 * @description 导出所有服务层的单例实例和类型
 */

// 游戏状态管理器
export { GameStateManager, gameStateManager } from "./GameStateManager";
export type { GameStateSnapshot, GameProgress } from "./GameStateManager";

// 游戏阶段监视器
export { GameStageMonitor, gameStageMonitor } from "./GameStageMonitor";
export type { GameStageEvent, GameStageEvents } from "./GameStageMonitor";

// 策略服务
export { StrategyService, strategyService } from "./StrategyService";

// 海克斯服务
export { HexService, hexService } from "./HexService";

// 美服 PC 纯逻辑 runner（不执行输入）
export { pcLogicRunner } from "./PcLogicRunner";

// 安卓离线回放 runner（不依赖模拟器）
export { androidSimulationRunner } from "./AndroidSimulationRunner";

// 安卓识别回放 runner（截图裁片 + OCR mock）
export { androidRecognitionReplayRunner } from "./AndroidRecognitionReplayRunner";

// TFT 数据服务（官方接口 + 本地兜底）
export { tftDataService } from "./TftDataService";
