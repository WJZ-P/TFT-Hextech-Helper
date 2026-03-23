# Android Stability Limits

**Last updated:** 2026-03-22  
**Author:** TFT-Hextech-Helper  
**Scope:** Android emulator OCR stability, long-run sessions (1-2 hours), Worker lifecycle, memory management

---

## Purpose & Scope

本文档定义 Android 端 OCR 长时间运行会话的稳定性边界与限制。适用于：
- 安卓模拟器（BlueStacks/雷电等）
- 长时间挂机会话（1-2 小时）
- OCR Worker 生命周期管理
- 内存泄漏检测与回收机制

**不包含：**
- 电脑端 Riot Client 自动流程
- 实机测试（USB/网络投屏）
- 非 OCR 相关稳定性（网络、客户端崩溃等）

---

## Definitions

### Stability (稳定性)

本 repo 中 "stability" 指：
1. **Foreground classification** — 窗口分类准确率（`classifyAndroidWindowScreenshot`）
2. **HUD readability** — 金币/经验/血量 OCR 识别率（`extractLikelyHudNumber`）
3. **OCR reliability** — 阶段/棋子名称识别准确率（`selectBestStageText`, `normalizeStageText`）
4. **Worker lifecycle** — Tesseract Worker 回收触发及时性
5. **Memory growth** — 内存增长率（每轮 < 15MB 可接受）

### Long-Run Session (长时间会话)

定义：连续运行 >= 5 轮对局，或持续时间 >= 1 小时。

---

## Measured Limits (Numeric)

### Table 1: Stage Recognition

| Metric | Limit | Rationale |
|--------|-------|-----------|
| Majority voting threshold | >= 50% (2/4 votes) | 防止 OCR 误读（如 3-1 vs 5-1） |
| Minimum history length | 4 samples | 数据不足时不确认 |
| Stage normalization fixes | 0→6, round 0→6 | 常见 OCR 误读修正 |
| Stage 1 max rounds | 4 | TFT 规则（1-1 到 1-4） |
| Invalid stage rejection | stage > 7 or round > 7 | 防止完全误读 |

**Code reference:** `src-backend/TftOperator.ts:confirmStageWithHistory()`

### Table 2: Worker Recycling

| Metric | Limit | Rationale |
|--------|-------|-----------|
| Recognition count trigger | 500 ops | Tesseract.js 官方建议 |
| Worker lifetime trigger | 30 minutes | 防止 WASM 内存膨胀 |
| Idle time trigger | 10 minutes | 释放未用资源 |
| Memory growth alert | +50% baseline | 泄漏检测阈值 |

**Code reference:** `src-backend/tft/recognition/OcrService.ts:WORKER_RECYCLE_CONFIG`

### Table 3: HUD Digit OCR

| Metric | Limit | Rationale |
|--------|-------|-----------|
| Gold text region | `androidHudGoldTextRegion` | 固定坐标裁切 |
| XP text region | `androidHudXpTextRegion` | 固定坐标裁切 |
| Character whitelist | `0123456789/` | 限制输出，提升准确率 |
| PSM mode | `SPARSE_TEXT` | 短数字串最佳模式 |

**Code reference:** `src-backend/TFTProtocol.ts` regions, `src-backend/tft/recognition/OcrService.ts`

### Table 4: Memory Growth

| Metric | Ideal | Acceptable | Critical |
|--------|-------|------------|----------|
| Growth per round | < 10MB | <= 15MB | > 20MB |
| Total growth (5 rounds) | < 50MB | <= 75MB | > 100MB |
| RSS peak (startup baseline ~120MB) | < 180MB | <= 200MB | > 250MB |
| Growth rate | < 30% | <= 50% | > 80% |

**Measurement:** `memoryMonitor.sample()` at round start/end

### Table 5: Capture Retries

| Metric | Limit | Rationale |
|--------|-------|-----------|
| Max capture attempts | 3 | 避免无限循环 |
| Retry interval | 500ms | 避免过快重试 |
| Timeout per attempt | 10s | 防止卡死 |
| Fallback strategies | 4 (selected-window, child, PrintWindow, full-screen) | 兼容性兜底 |

**Code reference:** `scripts/run-android-live-smoke.ts`

---

## Reproduce & Validate (Commands)

### Run Stress Test (5 Rounds)

```bash
# 压力测试：5 轮连续运行
node --import tsx scripts/run-android-stress-test.ts --rounds 5 --scenario android-reroll-midgame --output-report reports/stress-test.json

# 查看报告
cat reports/stress-test.json | jq '.summary'
```

### Expected Output

```json
{
  "totalRounds": 5,
  "successfulRounds": 5,
  "failedAt": [],
  "timeline": {
    "memoryPeak": 175.3,
    "memoryGrowthRate": 28.5,
    "errorCount": 0
  },
  "summary": {
    "passed": true,
    "recommendation": "压力测试通过，内存增长在可控范围内"
  }
}
```

### Run Unit Tests

```bash
# 长时间稳定性测试
node --import tsx --test tests/backend/android_stability_long_run.test.ts

# Worker 生命周期测试
node --import tsx --test tests/backend/ocr_service_worker_lifecycle.test.ts

# 阶段确认测试
node --import tsx --test tests/backend/tft_operator_stage_confirmation.test.ts
```

### Manual Smoke Test

```bash
# 实时烟雾测试（实际模拟器）
npm run android:smoke -- --fixture examples/android-foreground-replay/android-na-frontend-synthetic-flow.json

# 查看日志输出
tail -f logs/*.log | grep "StressTest\|OcrService\|TftOperator"
```

---

## Resolution Matrix (多分辨率支持)

All UI regions use percentage-based coordinates (0-1 range) relative to base resolution 1024×768.
Use `scaleRegionToResolution()` and `scalePointToResolution()` from `TFTProtocol.ts` for pixel conversion.

### Supported Resolutions

| Resolution | Name | Aspect Ratio | Scale Factor (X) | Scale Factor (Y) | Status |
|------------|------|--------------|------------------|------------------|--------|
| 960×540 | 720p | 16:9 | 0.9375 | 0.703125 | ✅ Tested |
| 1024×768 | base | 4:3 | 1.0 | 1.0 | ✅ Primary |
| 1920×1080 | 1080p | 16:9 | 1.875 | 1.40625 | ✅ Tested |
| 2560×1440 | 1440p | 16:9 | 2.5 | 1.875 | ✅ Tested |

### Resolution Scaling API

```typescript
import {
    scaleRegionToResolution,
    scalePointToResolution,
    getResolutionScaleFactor,
    BASE_RESOLUTION,
} from "../../src-backend/TFTProtocol";

// Convert percentage region to pixel region
const pixelRegion = scaleRegionToResolution(
    androidGameStageDisplayNormal,
    { width: 1920, height: 1080 }
);

// Convert percentage point to pixel point
const pixelPoint = scalePointToResolution(
    shopSlot.SHOP_SLOT_3,
    { width: 1920, height: 1080 }
);

// Get scale factors for custom calculations
const { scaleX, scaleY } = getResolutionScaleFactor({ width: 1920, height: 1080 });
```

### Region Size Guidelines

| Region Type | Min Width (px) | Min Height (px) | Notes |
|-------------|----------------|-----------------|-------|
| Stage display | 150 | 20 | OCR requires readable text |
| HUD digits | 20 | 8 | Single number recognition |
| Shop slots | 80 | 40 | Template matching tolerance |
| Bench slots | 40 | 60 | Unit detection accuracy |

### Testing Multi-Resolution

```bash
# Run multi-resolution unit tests
node --import tsx --test tests/backend/multi-device-stress.test.ts
```

---

## Example Failure Modes & Mitigations

### Failure Mode 1: Stage Recognition Drift

**Symptom:** 连续 3 轮识别为 "3-1"，实际为 "5-1"（shop-open 高对比度误读）

**Mitigation:**
- Majority voting: 4 次采样中 >= 2 次相同即确认
- Normalization: `0-2` → `6-2`, `2-0` → `2-6`
- Variant thresholds: `stage/threshold-100`, `stage/threshold-110`, `stage/threshold-120`, `stage/threshold-130`

**Code:** `src-backend/tft/recognition/RecognitionUtils.ts:selectBestStageText()`

### Failure Mode 2: Worker Memory Leak

**Symptom:** RSS 持续增长，5 轮后 > 250MB

**Mitigation:**
- Auto-recycling at 500 ops / 30min / 10min idle
- Memory sampling after each recognize
- `destroy()` on app exit

**Code:** `src-backend/tft/recognition/OcrService.ts:recycleIfNeeded()`

### Failure Mode 3: State Corruption After Edge Cases

**Symptom:** 连续 2 轮低置信度 OCR 后，状态污染（买错棋子、上错人）

**Mitigation:**
- Stage majority voting prevents drift
- Worker recycling prevents stale state
- `memoryMonitor.clear()` between test rounds

**Test:** `tests/backend/android_stability_long_run.test.ts: "handles 2+ consecutive low-confidence OCR"`

---

## Monitoring & Logs

### Log Files

- Location: `C:\Users\<user>\AppData\Roaming\tft-hextech-helper\logs\tft-*.log`
- Key patterns:
  - `[TftOperator] 阶段确认成功 (投票 X/4): Y-Y`
  - `[OcrService] Worker XXX 触发回收：识别次数=XXX, 存活=XXXs`
  - `[StressTest] 第 X 轮成功 (耗时=XXXms, RSS=XXX MB)`

### Frontend Display

Memory metrics sent via `analyticsManager.trackEvent()`:
- Event: `memory_stress_test_result`
- Params: `{peak_heap_mb, avg_heap_mb, run_duration_ms, recognitions}`

---

## Recommended Experiments & Datasets

### Fixture Paths

- Simulation scenarios: `examples/android-simulator/*.json`
- Recognition fixtures: `examples/android-recognition-replay/*.json`
- Foreground replay: `examples/android-foreground-replay/`
- Smoke screenshots: `examples/recordings/smoke/`

### Test Scenarios

1. **Reroll midgame** — `android-reroll-midgame.json`
2. **S16 opening** — `android-s16-opening-recognition.json`
3. **Synthetic flow** — `android-na-frontend-synthetic-flow.json`

---

## References

### Related Docs

- [docs/android-recognition-notes.md](./android-recognition-notes.md) — Android OCR 识别细节
- [docs/android-foreground-status.md](./android-foreground-status.md) — 前台状态分类
- [docs/android-foreground-next-commands.md](./android-foreground-next-commands.md) — 下一步命令
- [docs/tft-data-architecture.md](./tft-data-architecture.md) — 数据架构

### Architecture & API

- [public/ARCHITECTURE.md](../public/ARCHITECTURE.md) — IPC/API 架构
- [TEST_CHECKLIST.md](../TEST_CHECKLIST.md) — 测试清单

### Code References

- `src-backend/TftOperator.ts` — Stage confirmation, normalization
- `src-backend/tft/recognition/OcrService.ts` — Worker lifecycle, recycling
- `src-backend/utils/MemoryMonitor.ts` — Memory sampling
- `scripts/run-android-stress-test.ts` — Stress test harness
- `tests/backend/android_stability_long_run.test.ts` — Long-run tests

---

## Future Improvements

### Planned

- [ ] Brightness-aware OCR preprocessing for difficult displays
- [ ] Multi-language OCR support (currently Chinese-optimized)
- [ ] Distributed worker pool for parallel data validation
- [ ] Real-device testing (USB/Network) stability validation

### Experimental

- [ ] Histogram normalization for shop-open stage detection
- [ ] Worker thread isolation for per-worker memory tracking
- [ ] Heap snapshot integration (Node inspector API, gated by `MEM_SNAPSHOT=1`)

---

## Testing & Validation

### Last Validation

- **Date:** 2026-03-22
- **Environment:** Windows 10 + Android emulator (RTX3090)
- **Test Coverage:**
  - Stage confirmation: 18 tests pass
  - Worker lifecycle: 8 tests pass
  - Long-run stability: 5 tests pass (3 new + 2 memory growth)

### Recommendations

- Retest on other hardware (Apple Silicon, older GPUs)
- Extend to real-device testing (USB/Network)
- Add CI integration for nightly stress tests

---

## Changelog

### 2026-03-22 (Initial)

- Added `MemoryMonitor` utility
- Integrated memory sampling into OcrService + TftOperator
- Created stress test harness (`run-android-stress-test.ts`)
- Added long-run stability tests
- Documented stability boundaries
