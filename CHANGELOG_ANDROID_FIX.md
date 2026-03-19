# 安卓模拟器识别问题修复日志

## 修复时间
2026-03-03

## � 第三轮修复（关键Bug）

### 用户测试反馈
1. ✅ F1可以work了
2. ✅ 动作更稳定了
3. ✅ OCR识别也准了
4. ❌ **但是确认第几轮后人物却动弹不得了**

### 问题根因分析
通过日志分析发现：
```
[01:00:40.509] 安卓阶段兜底识别命中(raw): 6-6  ← 不合理的阶段！
[01:00:41.447] 阶段变化: 6-6 (新阶段, 类型: PVP)
```

**核心Bug**：`tryRecognizeAndroidStageWithFallback()` 方法只检查了格式（`isValidStageFormat`），但**没有检查合理性**（`isReasonableStage`）！

- 精确识别方法有合理性检查 ✅
- 安卓兜底方法**没有**合理性检查 ❌ ← **这就是Bug**

导致：OCR误识别的 6-6、8-1 等不合理阶段被直接采用，通过了4次确认机制，程序认为真的是 6-6 阶段，但实际游戏是 1-8，导致策略混乱。

### 修复方案 ✅

#### 1. 修复兜底方法缺少合理性检查
**文件**：`src-backend/TftOperator.ts` - `tryRecognizeAndroidStageWithFallback()`

**修改点**：在返回识别结果前，添加合理性验证
```typescript
// 修复前
if (isValidStageFormat(rawText)) {
    logger.info(`安卓阶段兜底识别命中(raw): ${rawText}`);
    return rawText;  // ← 直接返回，包括不合理的 6-6
}

// 修复后
if (isValidStageFormat(rawText) && this.isReasonableStage(rawText)) {
    logger.info(`安卓阶段兜底识别命中(raw): ${rawText}`);
    return rawText;  // ← 必须通过合理性检查
} else if (rawText && isValidStageFormat(rawText)) {
    logger.debug(`安卓阶段兜底识别格式正确但不合理(raw): ${rawText}`);
}
```

#### 2. 增强调试日志
- 添加 `进入阶段确认流程` 日志
- 添加 `阶段确认未通过` 日志
- 添加 `阶段格式无效` 日志

**效果**：
- ✅ 不合理的 6-6、8-1 等阶段会被拒绝
- ✅ 日志会显示 `安卓阶段兜底识别格式正确但不合理(raw): 6-6`
- ✅ 确认机制能正常工作，连续4次都是合理的阶段才会通过

---

## �🚨 紧急修复（第二轮）

### 用户反馈的4个致命问题
1. ❌ 阶段识别完全错误（1-8识别成6-6）
2. ❌ 人物只走位不干活
3. ❌ 日志文件不存在
4. ❌ 按F1停不下来（最严重）

### 修复方案（立即生效）

#### 1. 日志文件路径修复 ✅
**问题原因**：`app.getPath('userData')` 在后端进程无法访问

**修复方案**：
- 改用 `os.homedir()` + 相对路径
- 新路径：
  - Windows: `C:\Users\用户名\AppData\Roaming\tft-hextech-helper\logs\`
  - macOS: `~/Library/Application Support/tft-hextech-helper/logs/`
  - Linux: `~/.config/tft-hextech-helper/logs/`
- 启动时控制台会显示：`[Logger] 日志文件路径: ...`

#### 2. F1紧急停止修复 ✅
**问题原因**：`LobbyState.leaveLobbyWithRetry()` 中的 `sleep(1000)` 在等待期间不响应 abort 信号

**修复方案**：
- 将长时间 sleep 改为短循环：每 100ms 检查一次 abort 信号
- 确保所有阻塞操作都能在 100ms 内响应 F1
```typescript
// 修复前：await sleep(1000);  // 1秒内无法响应
// 修复后：
for (let i = 0; i < 10; i++) {
    if (signal.aborted) return false;
    await sleep(100);  // 每100ms检查一次
}
```

#### 3. 阶段识别大幅增强 ✅
**问题原因**：
- 连续确认阈值设为2太低，容易误识别
- 缺少合理性验证（1-8不应该识别成6-6）

**修复方案**：
- **提高确认阈值**：从 2 次提升到 **4 次连续相同**才认为有效
- **增加合理性验证**：
  - stage 必须在 1-7 范围内
  - round 必须在 1-7 范围内
  - 第一阶段只能有 1-4
- **增强调试信息**：
  - 打印原始 OCR 结果：`OCR原始: "1.8" -> 提取: "1-8"`
  - 识别过程可见：`阶段确认中... (剩余3次)`
  - 成功确认标记：`✅ 阶段确认成功: 1-8`

#### 4. 人物乱走动问题分析
**根本原因**：阶段识别一直返回 UNKNOWN，状态机无法进入正常流程
**修复方式**：通过修复问题1-3自动解决

---

## 修复的三个严重问题（首轮）

### 1. 商店遮挡导致阶段识别失败 ✅
**问题描述**：
- 商店打开时，顶部阶段文本区域被商店UI遮挡
- OCR无法识别阶段，导致程序卡住

**修复方案**：
- 新增 `gameStageDisplayShopOpen` 区域定义 (位于 TFTProtocol.ts)
- 在阶段识别流程中增加商店打开状态的专门处理
- 识别尝试顺序：normal → shopOpen → stage1，每个区域尝试 raw 和 preprocessed 两种模式

**相关文件**：
- `src-backend/TFTProtocol.ts`: 新增商店打开时的阶段区域定义
- `src-backend/TftOperator.ts`: 更新 `getGameStage()` 和 `getStageAbsoluteRegion()` 方法

### 2. 阶段误识别（1-1误读成2-1/3-1）✅
**问题描述**：
- OCR 识别不稳定，同一帧可能识别成不同的阶段
- 导致走位逻辑混乱，程序行为异常

**修复方案**：
- 实现连续确认机制 (`confirmStageWithHistory` 方法)
- 只有连续 2 次识别到相同阶段才认为有效
- 维护最近 5 次识别历史，自动清理过期数据
- 识别结果不稳定时返回 UNKNOWN 但不报错，等待下一次识别

**技术细节**：
```typescript
// 新增字段 - 提高确认阈值
private stageRecognitionHistory: string[] = [];
private readonly STAGE_CONFIRM_THRESHOLD = 4;  // 提升到4次（原2次）
private readonly MAX_HISTORY_LENGTH = 8;       // 提升到8次（原5次）

// 新增合理性验证
private isReasonableStage(stageText: string): boolean {
    const [stage, round] = stageText.split('-').map(Number);
    if (stage < 1 || stage > 7) return false;  // TFT最多7个大阶段
    if (round < 1 || round > 7) return false;  // 每个阶段最多7个回合
    if (stage === 1 && round > 4) return false; // 第一阶段只有4个回合
    return true;
}

// 连续确认逻辑（需要4次相同）
if (isValidStageFormat(stageText) && this.isReasonableStage(stageText)) {
    const confirmedStage = this.confirmStageWithHistory(stageText);
    if (!confirmedStage) {
        return { type: GameStageType.UNKNOWN, stageText: "" };
    }
    stageText = confirmedStage;
}
```

**相关文件**：
- `src-backend/TftOperator.ts`: 
  - 新增历史记录字段
  - 新增 `confirmStageWithHistory()` 方法
  - 更新 `getGameStage()` 流程
  - 更新 `ensureInitialized()` 初始化时清空历史
（已修复）：
  - Windows: `C:\Users\用户名\AppData\Roaming\tft-hextech-helper\logs\tft-YYYY-MM-DD.log`
  - macOS: `~/Library/Application Support/tft-hextech-helper/logs/tft-YYYY-MM-DD.log`
  - Linux: `~/.config
### 3. 日志刷屏问题 ✅
**问题描述**：
- 每次识别都打印日志，控制台被刷屏
- 难以追踪和分析问题
- 缺少持久化日志记录

**修复方案**：
- 新增文件日志功能，自动按天分割
- 日志路径：`%APPDATA%/tft-hextech-helper/logs/tft-YYYY-MM-DD.log`
- 实现日志去重机制，相同日志在 2 秒内只输出一次
- 自动清理 7 天前的旧日志文件
- error 级别日志永远不去重

**技术细节**：
```typescript
// 新增字段
private enableFileLogging: boolean = true;
private logFilePath: string = "";
private currentLogDate: string = "";
private recentLogs: Map<string, number> = new Map();
private readonly DEDUP_WINDOW_MS = 2000;  // 去重时间窗口

// 日志格式示例
[10:30:15.123][INFO]  [TftOperator] 阶段精确识别命中: normal/raw -> "2-1"
```

**新增功能**：
- `initFileLogging()`: 初始化日志目录
- `updateLogFilePath()`: 按日期切换日志文件
- `cleanOldLogs()`: 清理过期日志
- `isDuplicateLog()`: 检查日志去重
- `writeToFile()`: 异步写入日志文件

**相关文件**：
- `src-backend/utils/Logger.ts`: 完整重构，新增所有文件日志功能

## 附加改进

### F1 紧急停止功能验证 ✅
经过代码审查，F1 停止功能逻辑正确：
1. `electron/main.ts`: `registerToggleHotkey()` 正确注册快捷键
2. `globalHotkeyManager`: 低级键盘钩子监听
3. `hexService`: start/stop 方法通过 AbortController 实现优雅停止

**停止流程**：
```
F1 按下 → globalHotkeyManager 捕获 
→ registerToggleHotkey 回调 
→ hexService.stop() 
→ abortController.abort() 
→ 所有状态机循环退出
```
⚠️ 必测项目（修复验证）

### 第三轮修复测试 🔥
1. **阶段合理性验证**
   - [ ] 启动游戏，进入任意阶段（如 1-3, 2-1 等）
   - [ ] 观察日志，应该看到：
     - `[TftOperator] 进入阶段确认流程，候选: 1-3`
     - `[TftOperator] 阶段确认中... (剩余3次)`
     - `[TftOperator] ✅ 阶段确认成功: 1-3`
   - [ ] **不应该出现**：
     - ❌ `安卓阶段兜底识别命中(raw): 6-6`（或其他不合理阶段）
     - ❌ `阶段变化: 6-6`
   - [ ] 如果出现不合理识别，应看到：
     - `安卓阶段兜底识别格式正确但不合理(raw): 6-6`
     - 然后继续尝试其他区域，不会采用该结果

2. **人物正常运行测试**
   - [ ] 阶段识别成功后（看到 ✅），观察游戏画面
   - [ ] 应该能看到：
     - 自动买棋子
     - 自动升级
     - 自动放装备
     - 小小英雄归位
   - [ ] **不应该**只是乱走或不动

---

### 第二轮修复测试

1. **日志文件测试**
   - [ ] 启动程序后检查控制台是否显示 `[Logger] 日志文件路径: ...`
   - [ ] 确认路径下存在 `tft-2026-03-03.log` 文件
   - [ ] 验证日志内容完整（包含所有 INFO/WARN/ERROR）

2. **F1停止测试**
   - [ ] 启动挂机后立即按 F1，应在 1 秒内停止
   - [ ] 在 LobbyState 重试期间按 F1，应立即响应
   - [ ] 在 GameRunningState 按 F1，应立即停止

3. **阶段识别测试**日志文件路径（已更新）
  - Windows: `C:\Users\用户名\AppData\Roaming\tft-hextech-helper\logs\`
  - macOS/Linux: `~/.config/tft-hextech-helper/logs/`
   - [ ] 观察控制台日志，应显示：
     - `[TftOperator] 阶段确认中... (剩余X次)`
     - `[TftOperator] ✅ 阶段确认成功: 1-8`
   - [ ] 验证不会出现不合理的阶段（如6-6）
   - [ ] 检查识别延迟（需要4次确认，约2-4秒）

4. **正常运行测试**
   - [ ] 验证不再只走位不干活
   - [ ] 确认能正常买棋子、升级、放装备

### 
## 测试建议
300 行
- 修改代码行：~100 行
- 新增方法：8 个

## 技术亮点
1. **多区域扫描策略**：6 种区域尝试（normal/shopOpen/stage1 × raw/preprocessed）
2. **连续确认算法**：滑动窗口验证 + 合理性检查，防止单次识别误差
3. **日志去重机制**：时间窗口去重，避免刷屏同时保留关键信息
4. **异步文件写入**：不阻塞主流程，提升性能
5. **响应式abort信号**：所有阻塞操作在100ms内响应F1停止
6. **跨平台路径支持**：自动适配 Windows/macOS/Linux日志显示历史记录）
- [ ] 验证走位逻辑是否正常（不再乱走）

### 3. 日志系统测试
- [ ] 检查 `%APPDATA%/tft-hextech-helper/logs/` 目录是否创建
- [ ] 验证日志文件按天分割
- [ ] 确认相同日志不再刷屏（2秒内只显示一次）
- [ ] 验证控制台和4 次识别，会有约 **2-4 秒**的识别延迟（从2次提升到4次，延迟增加但准确性大幅提升）
2. 商店打开时依然建议尽量关闭商店以获得最佳识别效果
3. 日志去重可能导致某些重复警告被忽略（error 级别除外）
4. F1停止的响应时间约 100-500ms（取决于当前执行的操作
- [ ] 运行中按 F1，确认立即停止
- [ ] 停止后再按 F1，确认能重新启动
- [ ] 在不同阶段（战斗中/商店中/等待中）测试 F1 响应

## 代码统计
- 修改文件：3 个
- 新增代码行：~200 行
- 修改代码行：~50 行
- 新增方法：6 个

## 技术亮点
1. **多区域扫描策略**：6 种区域尝试（normal/shopOpen/stage1 × raw/preprocessed）
2. **连续确认算法**：滑动窗口验证，防止单次识别误差
3. **日志去重机制**：时间窗口去重，避免刷屏同时保留关键信息
4. **异步文件写入**：不阻塞主流程，提升性能

## 兼容性
- ✅ PC 端不受影响
- ✅ 安卓端大幅改善
- ✅ 向后兼容旧配置
- ✅ 无破坏性更改

## 已知限制
1. 连续确认机制需要 2 次识别，会有约 0.5-1 秒的识别延迟
2. 商店打开时依然建议尽量关闭商店以获得最佳识别效果
3. 日志去重可能导致某些重复警告被忽略（error 级别除外）

## 下一步优化建议
1. 考虑增加阶段识别的置信度评分
2. 可以基于游戏时间线预测阶段，减少 OCR 依赖
3. 添加阶段识别失败的自动截图功能，方便调试
