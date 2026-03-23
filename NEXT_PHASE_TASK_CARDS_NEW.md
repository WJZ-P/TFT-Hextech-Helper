# 下一阶段任务卡分发 - Phase 1 & 2 (简明版)

**生成日期**: 2026-03-22  
**执行周期**: 1-1.5 周 (2026-03-25 至 2026-03-30)  
**总工时**: 5-7 天

---

## 📋 任务卡快速索引

| 卡号 | 标题 | 优先级 | 估时 | 验收标准 |
|------|------|--------|------|---------|
| **D** | PC 多融合并行评估 | 🟡 | 1d | 2 方法 + 8 测试 ✅ |
| **E** | CI/CD 压力测试集成 | 🟢 | 0.5d | Actions YAML 通过 ✅ |
| **F** | 多分辨率适配 | 🟡 | 1d | 3 分辨率测试 ✅ |
| **G** | 前端决策 UI | 🟡 | 1.5d | IPC 通畅 + Timeline 100ms ✅ |
| **H** | 内存实时图表 | 🟢 | 0.5d | 图表流畅 ✅ |
| **I** | 云端数据框架 | 🟡 | 1.5d | 框架就绪 ✅ |

**总计**: 5-7 工作天

---

## 🔷 **Task D: PC 多融合并行评估** (Day 1)

**目标**: RuleBasedDecisionEngine 支持同时评估 3-4 个融合路线并排序。

### 文件改动
```
src-backend/core/RuleBasedDecisionEngine.ts       (+60 行, 2 方法)
tests/backend/rule_based_engine.test.ts           (+50 行, 8 测试)
examples/pc-logic/                                (2 new fixtures)
```

### 核心变更
```typescript
evaluateMultiFusionPaths(currentUnits, shopPool, rounds): { path, score }[]
computeRiskAdjustedScore(quality, hp, rounds): number
```

### 验收标准 ✅
- [ ] typecheck 无错误
- [ ] 8 个新测试全通过

---

## 🔷 **Task E: CI/CD 压力测试集成** (Day 1.5)

**目标**: GitHub Actions 自动化日压力测试。

### 文件改动
```
.github/workflows/android-stability-nightly.yml   (新建)
```

### 配置
- 触发: Daily 3AM UTC  
- 执行: `npm run android:stress -- --rounds 10`

### 验收标准 ✅
- [ ] YAML 语法正确
- [ ] 本地 `act` 测试通过

---

## 🔷 **Task F: 多分辨率适配** (Day 2)

**目标**: 支持 720p 和 1440p 分辨率。

### 文件改动
```
src-backend/TFTProtocol.ts                       (+30 行, 1 方法)
tests/backend/multi-device-stress.test.ts        (新建)
docs/android-stability-limits.md                 (扩展)
```

### 核心方法
```typescript
scaleRegionToResolution(region, fromRes, toRes): typeof region
```

### 验收标准 ✅
- [ ] typecheck 无错误
- [ ] 3 分辨率测试通过

---

## 🔷 **Task G: 前端决策链 UI** (Day 3-4)

**目标**: React 显示后端决策推理链路（why did agent pick action X?）

### 文件改动
```
electron/main.ts                                 (IPC 方法扩展)
electron/preload.ts                              (IPC 暴露)
src/components/DecisionChain.tsx                 (新建)
```

### IPC 通道
```typescript
window.decision.getLatestPlanChain(): {
  plans: { reason: string; priority: number; score: number }[]
}
```

### 验收标准 ✅
- [ ] IPC 通道正常
- [ ] Timeline 组件渲染 < 100ms

---

## 🔷 **Task H: 内存实时图表** (Day 5)

**目标**: 前端实时显示后端内存曲线。

### 文件改动
```
electron/main.ts                                 (IPC 事件推送)
src/components/MemoryChart.tsx                   (新建)
```

### 验收标准 ✅
- [ ] 100+ 数据点流畅
- [ ] 无性能影响

---

## 🔷 **Task I: 云端数据框架** (Day 5-6)

**目标**: (可选) 数据采集框架，支持隐私开关。

### 文件改动
```
config/data-sync.json                            (新建)
src-backend/services/DataCollector.ts            (新建)
src/pages/DataPrivacySettingsPage.tsx            (新建)
```

### 配置
```json
{ "enabled": false, "mode": "anonymous" }
```

### 验收标准 ✅
- [ ] 框架不影响性能
- [ ] 隐私设置清晰易用

---

## 📅 执行计划

**Day 1 (Mar 25)**
- Task D: PC 多融合 (1d)
- Task E: CI/CD (0.5d, 并行)

**Day 2 (Mar 26)**
- Task E: 完成
- Task F: 多分辨率 (1d)

**Day 3-4 (Mar 27-28)**
- Task G: 前端 UI (1.5d)

**Day 5-6 (Mar 29-30)**
- Task H: 内存图表 (0.5d)
- Task I: 云端框架 (1.5d)

**预期完成**: 2026-03-30（约 1 周）

---

**关键指标**:
- 代码: `npm run typecheck` ✅
- 测试: `npm run test:unit` ✅  
- UI: `npm run dev` ✅
- CI: Actions 工作流正常

**ALL DONE!** 预计总工时 5-7 个工作天。
