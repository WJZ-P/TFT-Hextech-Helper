# Test Failure Triage Report

**Date**: 2026-03-26
**Test Run**: Partial (timeout after 180s)
**TypeScript Check**: FAILED (multiple errors)

---

## Test Count Summary (from partial run)

From the visible output:
- **Total tests observed**: ~70+
- **Passing tests (✔)**: ~50+
- **Failing tests (✖)**: ~20+
- **Test runner status**: Timeout after 180s (incomplete run)

**Note**: Static scan shows 342 test declarations, but test runner cannot complete in reasonable time.

---

## Failure Categories

### Category 1: SettingsStore Environmental Error (HIGH PRIORITY)
**Affected Tests**: Multiple Android tests
**Error Message**: `Error: Please specify the 'projectName' option.`
**Root Cause**: SettingsStore requires `projectName` option from conf package, but tests don't provide it.

**Affected Tests**:
- `android emulator adapter can be imported from node cli context`
- `tft operator can bootstrap templates even when OpenCV finished before operator import`
- `android emulator diagnose CLI reports summary and interesting entries`
- `android_window_helper_diagnostics.test.ts` (entire file fails)
- `android live smoke CLI tests` (all 13 tests fail)
- `android recognition replay CLI tests`
- `android static snapshot replay tests`
- `Android long-run stability tests` (3 tests fail)

**Fix Recommendation**: 
- Option 1: Mock SettingsStore in test setup
- Option 2: Provide default `projectName` in test environment
- Option 3: Skip these tests if SettingsStore not available
- **Priority**: HIGH - Blocks many Android tests

### Category 2: Test Timeouts (MEDIUM PRIORITY)
**Affected Tests**: 
- OCR accuracy tests (take 10-20s each)
- Long-run stability tests (take 20-40s each)
- Android emulator adapter tests (take 1-10 minutes)

**Root Cause**: Tests involve real OCR processing or long-running simulations.

**Fix Recommendation**:
- Increase timeout for these specific tests
- Mock OCR for faster tests
- Separate slow integration tests from unit tests
- **Priority**: MEDIUM - Tests are valid but slow

### Category 3: OpenCV/Missing Dependencies (MEDIUM PRIORITY)
**Affected Tests**: 
- `tft operator can bootstrap templates even when OpenCV finished before operator import`

**Root Cause**: OpenCV native module may not load in test environment.

**Fix Recommendation**:
- Mock OpenCV for unit tests
- Check if OpenCV is installed/configured correctly
- **Priority**: MEDIUM - Only affects OpenCV-dependent tests

### Category 4: TypeScript Compilation Errors (HIGH PRIORITY)
**Affected Files**: Multiple backend files
**Error Types**:
1. Unused variables (TS6133) - 10+ instances
2. Missing types (`BenchLocation`, `cv` namespace) - 6+ instances  
3. Type mismatches - 2 instances
4. Missing module declarations - 1 instance (Playwright)
5. Build output not generated - 2 instances

**Key Files with Errors**:
- `src-backend/services/DataCollector.ts` (unused variables)
- `src-backend/services/GameStateManager.ts` (missing types)
- `src-backend/services/StrategyService.ts` (unused variables)
- `src-backend/states/GameRunningState.ts` (property doesn't exist)
- `src-backend/states/LobbyState.ts` (property doesn't exist)
- `src-backend/TftOperator.ts` (cv possibly undefined, unused vars)
- `src-backend/utils/OverlayBridge.ts` (output file not built)
- `tests/backend/android_stability_long_run.test.ts` (unused vars)
- `tests/backend/ocr_service_worker_lifecycle.test.ts` (unused vars)
- `tests/playwright/settings-onboarding.test.ts` (missing module)

**Fix Recommendation**:
- Fix unused variable errors (simple)
- Add missing type definitions
- Ensure build outputs exist
- **Priority**: HIGH - Blocks type checking

### Category 5: Long-running Tests (LOW PRIORITY)
**Affected Tests**:
- `ocr: benchmark optimized vs baseline` (91 seconds)
- Various Android stability tests

**Fix Recommendation**:
- Mark as slow tests with separate test command
- Use in CI but not in local development
- **Priority**: LOW - Tests are correct but slow

---

## Test Coverage Gaps (from test file inventory)

**Test Files Found**: 46 files
**Test Declarations**: 342 (from static scan)

**Key Missing Coverage Areas** (based on file structure):
1. **Main Electron Process**: `electron/main.ts` - No direct tests
2. **Preload Bridge**: `electron/preload.ts` - Limited testing
3. **Renderer Components**: `src/components/` - Some integration tests
4. **StrategyService**: Large file (3513 lines) with many methods
5. **TftOperator**: Complex operator with many dependencies
6. **Android Adapters**: Multiple adapter implementations

---

## Recommended Fix Priority

### HIGH Priority (Fix immediately)
1. **SettingsStore error** - Mock or configure for tests
2. **TypeScript compilation errors** - Fix unused variables, add missing types
3. **Test timeouts** - Increase timeouts or mock slow operations

### MEDIUM Priority (Fix soon)
1. **OpenCV dependency** - Mock for unit tests
2. **Long-running test separation** - Create separate test suite
3. **Coverage gaps** - Add tests for uncovered critical paths

### LOW Priority (Document and monitor)
1. **OCR accuracy tests** - Keep as integration tests
2. **Stability tests** - Run in CI only
3. **Performance benchmarks** - Track over time

---

## Actionable Next Steps

1. **Fix SettingsStore test issue** - This blocks ~20+ Android tests
2. **Run TypeScript fix for unused variables** - Simple automated fixes
3. **Separate slow tests** - Create `npm run test:slow` command
4. **Run coverage on specific test files** - Start with rule_based_engine.test.ts
5. **Update test documentation** - Reflect actual test status

---

## Evidence Files Created
- `.sisyphus/evidence/task-1-test-run.txt` - Partial test output
- This file: `.sisyphus/evidence/task-3-failure-triage.md` - Triage report

---

## Next Actions

**Immediate** (Wave 2 Task 4):
1. Fix SettingsStore issue in test setup
2. Fix unused TypeScript variables (automated fix possible)
3. Update test timeouts

**Short-term** (Wave 2 Task 5):
1. Update documentation with actual test counts
2. Document known test failures
3. Update NEXT_WAVE_PLAN with test status

**Long-term** (Future waves):
1. Add coverage for critical paths
2. Separate unit vs integration tests
3. Implement CI test gates