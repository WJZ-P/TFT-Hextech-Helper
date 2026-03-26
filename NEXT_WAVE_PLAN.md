# 下一阶段任务分配 - 2026年3月面包阶段

## 阶段总结
当前已完成：
- ✅ 任务卡1：PC转阵/弃牌边界（all 203 tests passing）
- ✅ 任务卡2：安卓Live长时间稳定性（26 new tests）
- ✅ 任务卡3审计：StrategyService已零直接静态依赖，gap确认
- ✅ 任务卡A（TftDataHub 方法补充）：`getChampionDefinition`, `getTraitDefinition`, `getTraitBreakpointsForChampion` 已实现并测试
- ✅ 任务卡C3：Android稳定边界文档 - `docs/ANDROID_STABILITY_LIMITS.md` 已创建（2026-03-25）

---

## 任务卡 A：TftDataHub 缺失方法补充

**状态：已完成** — 方法已存在且通过测试，无需额外工作。

**目标**  
基于StrategyService审计结果，补充TftDataHub中掉缺的champion和trait方法，完成数据入口统一。

**主要工作**
- T1: TftDataHub 添加方法
  - `getChampionDefinition(name, season?)` → TFTUnit
  - `getTraitDefinition(name, traitKey?, season?)` → TraitData
  - `getTraitBreakpoints(unit)` → number[] (根据星级和trait规则)
  
- T2: StrategyService 迁移调用点
  - line 1785-1795: 棋子特性查询，改用 `getChampionDefinition()`
  - line 1799-1810: 羁绊激活阈值，改用 `getTraitDefinition()`
  - 审计所有其他 inline 的 trait 计算逻辑，评估是否迁移

- T3: 更新架构文档
  - `docs/tft-data-architecture.md` 完整更新迁移完成状态
  - 标记 Round 4 完成，归档 champion/trait 方法

**验收标准**
- TftDataHub 至少新增 2 个公开方法
- StrategyService 没有 inline trait 逻辑，使用统一方法
- 测试：`npm run typecheck` + `npm run test:unit` 全通过
- 文档：列出所有已迁移的调用点

---

## 任务卡 B：PC逻辑 - 高级融合与过渡策略

**目标**  
升级"转向"逻辑，处理更复杂的融合场景和过渡路径选择。

**主要工作**
- B1: 新增复杂融合 fixtures（2-3个）
  - 副本融合（对方落地）转向主要融合的决策
  - 高费单位出现时是否立即all-in还是等待优化排列
  - 融合品质评分与当前融合评分的对比阈值

- B2: 增强 RuleBasedDecisionEngine
  - 融合品质快速评估接口
  - 过渡融合成本模型（多少gold可以承受滑铁卢）
  - 融合成功率预测（基于剩余轮次和店铁建议）

- B3: 新增单元测试
  - 融合对比决策
  - 融合成本评估

**验收标准**
- 至少 2 个新 fixture（融合决策相关）
- RuleBasedDecisionEngine 新增 1-2 个内部方法
- 新增 10+ 个相关test case
- `npm run typecheck` + `npm run test:unit` 全通过

---

## 任务卡 C：安卓完整流程压力测试与边界确认

**目标**  
通过真实场景回放和长时间运行，验证安卓自动化的完整稳定性，确认当前边界与限制。

**主要工作**
- C1: 压力测试脚本
  - 写一个 5-10 局连续自动化脚本（基于 android:smoke）
  - 记录各阶段平均响应时间、OCR准确率、误操作次数
  - 输出报告：性能指标、失败点、崩溃点

- C2: 长时间运行边界确认
  - Tesseract Worker 回收机制是否充分（长于30分钟一局）
  - Stage确认多数投票是否够稳（低网络环境）
  - 其他可能积累的内存或句柄泄漏点

- C3: 文档化当前限制（Limitation doc）
  - 已知稳定范围（如 local 模式稳定，联网模式波动）
  - 已知边界（如最长单局支持时长、并发自动化数量）
  - 推荐运行配置（内存、网络带宽、分辨率）

**验收标准**
- 完成至少 1 次 5+ 局连续自动化运行
- 输出压力测试报告（markdown格式）
- 新建 `docs/ANDROID_STABILITY_LIMITS.md` 文档
- 压力测试中零崩溃、零关键错误（允许OCR波动）

---

## 实施顺序建议

**Phase 1 (优先级高)**
1. 任务卡 A - TftDataHub 补充（1-2天）
   - 最小化，完成数据架构闭环
   
**Phase 2 (优先级中)**
2. 任务卡 B - PC 融合决策（2-3天）
   - 增强现有决策引擎
   
**Phase 3 (优先级中)**
3. 任务卡 C - 安卓压力测试（2-3天）
   - 验证运生产稳定性

---

## 关键指标追踪

| 指标 | 现状 | 目标 |
|------|------|------|
| TypeScript clean | ✅ yes | Maintain |
| Unit tests passing | 203/203 | > 220 (新增) |
| StrategyService static deps | 0 | 0 (maintain) |
| Android avg OCR accuracy | ~95% | > 96% |
| Android session crash rate | < 1% | 0% |
| PC decision coverage | ~85% | > 90% |

---

## 注意事项

1. **不删除代码**：仅迁移，保留兼容性
2. **fallback策略**：始终保持safe fallback
3. **新方法隔离**：TftDataHub新方法独立测试
4. **文档优先**：完成代码后立即更新对应文档

