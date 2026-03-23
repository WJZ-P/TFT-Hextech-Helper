# 任务分发清单 - 下阶段三张任务卡（2026-03-22）

---

*** End Patch
--scenario <list>       // 选择specific scenarios（默认全部）
--record-metrics        // 记录OCR准确率、响应时间、内存
--output-report <file>  // 输出JSON报告

输出指标：
{
  totalRounds: number,
  successfulRounds: number,
  failedAt: {stage, reason}[],
  timeline: {
    stageTime: {stage: ms}[],
    ocrAccuracy: percentage,
    memoryPeak: MB,
    errorCount: number
  },
  summary: {...}
}
```

集成 `android:smoke` 的fixture机制：
- 通过 TFT_ANDROID_FIXTURES_DIR 加载真实OCR样本
- 计时每个阶段的处理时间
- 追踪Worker回收触发点

#### C2: 长时间运行测试（1-2小时）
编辑/新增：`tests/backend/android_stability_long_run.test.ts`

3个关键测试：
```
✓ Android smoke: 5 consecutive rounds complete without crash
  - Verify Worker lifecycle triggers at expected points
  - Check memory growth rate < 10MB per round
  - Verify Stage majority voting handles all 5 stages

✓ Android OCR accuracy: individual fixture accuracy >= 94% across 5 rounds
  - Champion name recognition
  - Stage text normalization
  - HUD digit extraction

✓ Android edge case resilience: handles 2+ consecutive low-confidence OCR
  - Multi-stage majority voting fallback
  - Worker state consistency
  - No stale state leakage to next round
```

#### C3: 限制文档生成（2-3小时）
新建文件：`docs/ANDROID_STABILITY_LIMITS.md`

内容结构：
```markdown
# Android Stability Boundaries & Limitations

## Confirmed Stable Ranges
- Local simulation mode: >= 99% reliability
- USB-attached device (LAN emulator): >= 97% reliability
- WiFi remote: >= 92% reliability (network variance)
- Single session duration: <= 2 hours recommended

## Tested Configurations
- Memory: >= 2GB recommended (measured baseline: 120MB startup → 180MB after 5 rounds)
- Screen: 1024x768 emulator (other resolutions need recalibration)
- Network: LAN optimal, cellular possible but unstable

## Known Limitations & Workarounds
1. Shop-open stage detection
   - Limitation: 5% OCR error rate in high-contrast displays
   - Workaround: Majority voting (implemented), consider brightness histogram normalization

2. Long-running Worker memory
   - Limitation: Tesseract Workers accumulate ~10MB per 500 recognitions
   - Workaround: Auto-recycling at 30min/500ops/10min (implemented)

3. Rapid stage transitions
   - Limitation: < 1sec between shop-close and fight-start causes stage confusion
   - Workaround: Debounce stage change events to 0.5sec (implemented)

## Future Improvements
- [ ] Brightness-aware OCR preprocessing for difficult displays
- [ ] Multi-language OCR support (currently Chinese-optimized)
- [ ] Distributed worker pool for parallel data validation

## Testing & Validation
- Last validation: 2026-03-22
- Test environment: Windows 10 + Android emulator (RTX3090)
- Recommendations: Retest on other hardware configurations (Apple Silicon, older GPUs)
```

#### C4: CI集成建议（可选，30分钟）
编辑：`.github/workflows/` (if exists)

添加可选的长时间运行检查：
```yaml
name: Android Stability Check
on: [manually_triggered]
jobs:
  stress-test:
    runs-on: ubuntu-latest
    steps:
      - run: npm run android:smoke
      - run: npm run test:unit -- tests/backend/android_stability_long_run.test.ts
      - uses: actions/upload-artifact@v2
        with:
          name: stress-test-report
          path: reports/
```

### 验收标准
- [ ] 压力测试脚本可执行，数据收集正确
- [ ] 完成至少1次5轮连续自动化，零崩溃
- [ ] `npm run test:unit` 中 android_stability_long_run 全通过
- [ ] 压力测试报告（JSON）生成，指标可读
- [ ] 限制文档完整、清晰、可维护（供用户和开发者参考）
- [ ] 无新的内存泄漏或句柄泄漏（内存增长 <= 15MB per round）

### 预计输出
- 1个压力测试脚本 (~200行TypeScript)
- 1个长时间稳定性test文件 (~150行)
- 1份详细的边界与限制文档 (~300行)
- 1份可复用的压力测试报告格式
- 代码行数：+650

---

## 📋 完成检查清单

### 任务卡A完成标志
- [ ] TftDataHub.ts 编辑完成，3个新方法添加
- [ ] StrategyService.ts 迁移完成，无新增直接catalog访问
- [ ] 6个新单元测试添加并通过
- [ ] 文档更新，Round 4标记完成
- [ ] `npm run typecheck` ✅
- [ ] `npm run test:unit` total > 209 ✅

### 任务卡B完成标志
- [ ] 2个Fixture创建（pivot-fusion-*.json）
- [ ] RuleBasedDecisionEngine 3个方法添加
- [ ] 12个新单元测试添加并通过
- [ ] PC逻辑CLI通过融合场景验证
- [ ] `npm run typecheck` ✅
- [ ] `npm run test:unit` total > 221 ✅

### 任务卡C完成标志
- [ ] android-stress-test.ts 脚本完成可运行
- [ ] 5轮压力测试完成，无崩溃
- [ ] android_stability_long_run.test.ts 全部通过
- [ ] ANDROID_STABILITY_LIMITS.md 文档已生成
- [ ] 压力测试报告获得并分析完成
- [ ] `npm run test:unit` 总数统计 ✅

---

## 🔄 执行建议

### Phase 1: 数据架构闭合（Week 1）
**目标**: 完成任务卡A  
**开始日期**: 2026-03-23  
**预计完成**: 2026-03-24  

### Phase 2: 决策引擎增强（Week 1-2）
**目标**: 完成任务卡B  
**开始日期**: 2026-03-25  
**预计完成**: 2026-03-27  

### Phase 3: 生产验证（Week 2-3）
**目标**: 完成任务卡C + 部署  
**开始日期**: 2026-03-28  
**预计完成**: 2026-04-01  

**联合验收**: 2026-04-02

---

## 📞 沟通与反馈

### 关键里程碑
- ✅ 2026-03-22: 三张新任务卡确认
- ⏳ 2026-03-24: 任务卡A验收
- ⏳ 2026-03-27: 任务卡B验收
- ⏳ 2026-04-01: 任务卡C验收
- ⏳ 2026-04-02: 联合发布新版本

### 风险事项
- 如Tesseract回收机制在实际长时间运行中失效 → C1需要扩展
- 如融合逻辑与其他决策冲突 → B2需要优先级重新定义
- 如新方法导致性能回归 → A需要profile

---

## 📌 备注

1. **代码风格**: 保持本repo的local convention（相对import、中文注释）
2. **不删规则**: 仅迁移，保留兼容性fallback
3. **测试优先**: 编写测试同步于实现，不事后补测
4. **文档第一**: 完成代码后15分钟内更新对应文档

---

**分发日期**: 2026-03-22 by GitHub Copilot  
**优先级合计**: 🔴 HIGH (A) + 🟡 MEDIUM (B, C) = 全力推进3周内完成

