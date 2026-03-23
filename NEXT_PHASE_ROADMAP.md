# 下一阶段任务卡规划 - Phase 1 & 2

**规划日期**: 2026-03-22  
**计划执行**: 2026-03-25 开始  
**总工期**: 1-1.5 周（5-7 天高效执行）

---

## 🎯 Phase 1: 持续改进与基础设施（3-4 周）

### 任务卡 D: PC 多融合并行评估

**优先级**: 🟡 MEDIUM  
**工期估计**: 1 天  
**复杂度**: 低-中  

#### 目标
扩展 RuleBasedDecisionEngine，支持同时评估 3+ 融合路线并排序。

#### 分工

**D1: 多融合评分 + 风险调整** (0.6 天)
- 编辑：`src-backend/core/RuleBasedDecisionEngine.ts`
- 新增 2 方法：
  - `evaluateMultiFusionPaths(currentUnits, shopPool, rounds)`: 返回排序路线列表
  - `computeRiskAdjustedScore(quality, hp, rounds)`: 融合质量 × 生存率

**D2: Fixtures + 测试** (0.4 天)
- 2 个 fixtures：多融合对比、对手制衡
- 8 个新测试用例

#### 验收标准
- [ ] 2 个新方法，代码量 < 100 行
- [ ] `npm run typecheck` ✅
- [ ] 8 个新测试全通过
- [ ] 多融合评分合理，分差明显

---

### 任务卡 E: CI/CD 压力测试集成

**优先级**: 🟢 LOW  
**工期估计**: 0.5 天  

#### 目标
 GitHub Actions 自动化 android-stress-test，日报告已知限制。

#### 分工

- 新建：`.github/workflows/android-stability-nightly.yml`
  - 触发：Daily 3AM UTC
  - 步骤：npm install → `npm run android:stress -- --rounds 10` → Upload artifacts
  - 若崩溃或内存增长 > 20MB，则通知

#### 验收标准
- [ ] 工作流 YAML 语法正确
- [ ] Local `act` 测试通过
- [ ] 报告生成成功

---

### 任务卡 F: 多分辨率适配

**优先级**: 🟡 MEDIUM  
**工期估计**: 1 天  

#### 目标
支持 720p 和 1440p 分辨率，建立坐标缩放机制。

#### 分工

**F1: 坐标缩放** (0.6 天)
- 编辑：`src-backend/TFTProtocol.ts`
- 新增方法：`scaleRegionToResolution(region, fromRes, toRes)`
  - 支持 1024x768 → {960×540, 1920×1080}
- 更新 OcrService 使用动态坐标

**F2: 性能基准 + 文档** (0.4 天)
- 新建：`tests/backend/multi-device-stress.test.ts`（简化版，3 个场景）
- 更新 docs：分辨率矩阵 + 已知问题

#### 验收标准
- [ ] `npm run typecheck` ✅
- [ ] 3 个分辨率测试通过
- [ ] 文档更新完成

---

## 🎯 Phase 2: 功能扩展与云端集成（3-4 周）

### 任务卡 G: 决策链路可视化 UI 对接

**优先级**: 🟡 MEDIUM  
**工期估计**: 3-4 天  
**复杂度**: 中-高  
**前置条件**: 完成任务卡 D

#### G1 目标
在 React 前端展示 RuleBasedDecisionEngine 的决策推理链路（why did agent pick action X?）。

#### G2 详细分工

**G2a: IPC 通道扩展** (1 天)
- 编辑：`electron/main.ts` 与 `electron/preload.ts`
- 新增 IPC 方法：`window.decision.getLatestPlanChain()`
  - 返回：`{ plans[], reasoning[], scores[] }`
  - StrategyService 在生成 plan 时记录到 GameStateManager

**G2b: 前端展示组件** (2 天)
- 新建：`src/components/DecisionChain.tsx`
  - Timeline 视图，显示 plan 执行顺序
  - 每个 plan 展开显示：reason、priority、score
  - 失效 plan 标为灰色（为什么被跳过）

**G2c: 实时 debug 面板** (1 天)
- 新建：`src/pages/DebugDecisionPage.tsx`
  - 可选的"决策日志"标签页
  - 展示当前游戏状态 + 决策链
  - 导出为 JSON 方便离线分析

#### G3 验收标准
- [ ] IPC 通道传送决策数据无错误
- [ ] 前端组件能正确渲染 plan timeline
- [ ] npm run dev - 无编译错误，UI 响应速度 < 100ms
- [ ] 导出 JSON 格式合理，可用于离线分析

---

### 任务卡 H: 实时内存监控仪表板

**优先级**: 🟢 LOW  
**工期估计**: 2 天  
**复杂度**: 中  
**前置条件**: 完成任务卡 C, G

#### H1 目标
在前端实时显示后端内存使用曲线、Worker 生命周期事件。

#### H2 详细分工

**H2a: 内存数据 IPC 推送** (1 天)
- 编辑：`electron/main.ts`
- 新增 IPC 事件：`memory-sample` (每 500ms 推送)
- 传送：`{ timestamp, peakMB, avgMB, growthRate }`

**H2b: 前端内存图表** (1 天)
- 新建：`src/components/MemoryChart.tsx`
  - 使用 ECharts 或类似库
  - X 轴：时间，Y 轴：内存 (MB)
  - 标注 Worker 回收事件

#### H3 验收标准
- [ ] IPC 事件传送无延迟卡顿
- [ ] 图表渲染流畅，100+ 数据点无性能问题
- [ ] npm run dev - 运行中内存稳定不增长

---

### 任务卡 I: 云端数据收集与反馈环

**优先级**: 🟡 MEDIUM  
**工期估计**: 4-5 天  
**复杂度**: 高  
**前置条件**: 完成任务卡 D, G

#### I1 目标
（可选，需用户同意）收集真实对局的决策数据，用于模型优化与反馈。

#### I2 详细分工

**I2a: 数据采集与加密** (2 天)
- 配置文件 `config/data-sync.json`
  - Enable/Disable 开关
  - 数据签名、加密密钥
- 编辑：GameStateManager 与 StrategyService
  - 可选的决策结果上报（最小化：plan type, reason hash, outcome）
  - 不收集棋子名、玩家名等隐私信息

**I2b: 云端 API 设计** (1.5 天)
- 新建：`docs/cloud-api-spec.md`
  - endpoint: POST /api/v1/decision-feedback
  - schema: `{ decisionId, planType, outcome, timestamp }`
  - 数据脱敏与聚合策略

**I2c: 前端同意管理** (1.5 天)
- 新建：`src/pages/DataPrivacySettingsPage.tsx`
  - 单选：不上报 / 匿名上报 / 允许科研使用
  - 清晰的隐私说明与链接

#### I3 验收标准
- [ ] 数据加密流畅，无性能显著影响
- [ ] API schema 文档完整
- [ ] 前端隐私设置 UI 清晰，易于理解
- [ ] 数据可完全禁用，无强制上报

---

## 📊 工作量估算

| 任务卡 | 工期 | 难度 | 优先级 |
|-------|------|------|--------|
| D - 多融合 | 1d | 低-中 | 🟡 |
| E - CI/CD | 0.5d | 低 | 🟢 |
| F - 多分辨率 | 1d | 低-中 | 🟡 |
| G - UI 可视化 | 1.5d | 中 | 🟡 |
| H - 内存图表 | 0.5d | 低 | 🟢 |
| I - 云端框架 | 1.5d | 中 | 🟡 |

**总计**: 5-7 天（完整执行）

---

## 🔄 执行顺序建议

### Day 1-2 (Mar 25-26)
- **D**: PC 多融合（1 天）
- **E**: CI/CD 集成（0.5 天）

### Day 2-3 (Mar 26-27)
- **F**: 多分辨率适配（1 天）
- **G 早期**: IPC 协议设计

### Day 4-5 (Mar 28-29)
- **G**: UI 可视化完成（1.5 天）

### Day 5-6 (Mar 29-30)
- **H**: 内存图表（0.5 天）
- **I**: 云端框架（1.5 天）

### 总耗时
**6 个工作日**（周一至周六），或 1-1.5 周（含审查）

---

## 🎯 MVP 清单

### 优先 (Day 1-3)
- ✅ D: 多融合评分通过验收
- ✅ E: CI/CD 工作流可执行
- ✅ F: 多分辨率支持从坐标缩放可用

### 次优 (Day 4-6)
- ✅ G: 前端 Timeline 显示决策链
- ✅ H: 内存图表实时更新
- ✅ I: 云端框架就绪（可选启用）

---

## 📝 关键风险与缓解

| 风险 | 概率 | 影响 | 缓解策略 |
|------|------|------|---------|
| 多融合评分算法复杂超期 | 中 | 高 | 预先充分设计，Week 1 完成原型评审 |
| 多分辨率适配 UI 坐标混乱 | 中 | 中 | 提前建立 1024→720p 转换的单元测试 |
| 前端图表性能不佳 | 低 | 中 | 使用 virtualization library，限制显示窗口 |
| 云端 API 设计冲突 | 低 | 低 | Week 1 充分讨论 API schema，获得 stakeholder 同意 |

---

## ✅ 检查清单（每周回顾）

### Weekly Standup Template
```markdown
## Week N Standup (Date)

### Completed
- [ ] Task X: ...
- [ ] Task Y: ...

### Blockers
- ...

### Next Week Focus
- ...

### Code Quality
- [ ] npm run typecheck ✅
- [ ] npm run test:unit ✅
- [ ] No new TSLint warnings
```

---

## 📌 备注

1. **Branch Strategy**: 每个任务卡对应 feature branch (`feature/D-multi-fusion` 等)，PR 前充分测试
2. **代码审查**: 重点关注 UI/IPC 通道、内存采样逻辑、多分辨率坐标计算
3. **文档优先**: 完成代码后 15 分钟内更新对应文档
4. **性能基准**: Phase 1 末期建立性能基准线（memory, response time），作为未来回归检测的参考

---

**规划完成**: 2026-03-22  
**执行开始**: 2026-03-25  
**预期完成**: 2026-03-30（1 周内全部交付）

