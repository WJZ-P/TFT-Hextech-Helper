# TypeScript Build Blockers Plan

## Overview

This plan addresses the 51 TypeScript compilation errors that prevent successful `tsc --noEmit` execution. The errors are blocking CI builds, developer productivity, and type safety confidence. The plan prioritizes critical OpenCV type issues first, then methodically fixes remaining errors.

## TL;DR

**Quick Summary**: Fix 51 TypeScript errors across 12+ files, prioritizing critical OpenCV/cv namespace issues, protocol.d.ts mismatches, and type inconsistencies. Establish reliable type-safe build baseline.

**Deliverables**:
1. Global OpenCV type declaration file
2. Fixed electron/protocol.d.ts mismatch
3. Resolved GameStateManager/StrategyService type inconsistencies
4. Cleaned unused variable errors (TS6133)
5. Fixed state typing issues (GameRunningState, LobbyState)
6. Optional: Playwright test type resolution

**Estimated Effort**: Low-Medium (1-2 days)
**Parallel Execution**: YES - Wave 1 (3 parallel tasks), Wave 2 (2 parallel tasks), Wave 3 (1 task)
**Critical Path**: Task 1 → Task 4 → Task 6 (OpenCV types → protocol fix → final validation)

---

## Context

### Current State
- **TypeScript errors**: 51 errors (increased from 47 earlier)
- **Error categories**:
  1. OpenCV/cv namespace (CRITICAL) - TftOperator.ts, TemplateMatcher.ts
  2. Missing types (HIGH) - GameStateManager.ts (TFTEquip, BenchLocation)
  3. Protocol.d.ts mismatch (MEDIUM) - OverlayBridge.ts, ToastBridge.ts
  4. State typing (MEDIUM) - GameRunningState.ts, LobbyState.ts
  5. Unused variables (LOW) - StrategyService.ts, DataCollector.ts, tests
  6. Test types (LOW) - Playwright test missing @playwright/test types
- **Recent work**: Test/CI verification, SettingsStore fix, documentation updates
- **Known issues**: Build fails due to type errors, CI cannot run

### Why This Matters
1. **Build reliability**: `npm run typecheck` fails with 51 errors
2. **CI/CD blocking**: Cannot run reliable builds or deployments
3. **Developer experience**: Type safety compromised, IDE errors everywhere
4. **Code confidence**: Type mismatches may indicate runtime bugs
5. **Test integrity**: Some test errors block test execution

---

## Work Objectives

### Core Objective
Achieve zero TypeScript compilation errors, establish reliable type-safe build baseline.

### Concrete Deliverables
1. Global OpenCV type declaration for cv namespace
2. Fixed electron/protocol.d.ts mismatch
3. Resolved type inconsistencies in GameStateManager/StrategyService
4. Cleaned unused variable errors
5. Fixed state typing issues
6. Optional: Playwright test type resolution
7. Final validation: `npm run typecheck` exits with 0

### Definition of Done
- [ ] `npm run typecheck` exits with code 0
- [ ] No TS2503 (cannot find namespace) errors
- [ ] No TS6305 (output file not built) errors
- [ ] Unused variable errors reduced or eliminated
- [ ] Type mismatches resolved with proper adapters
- [ ] State typing issues fixed with proper interfaces

### Must Have
1. Global OpenCV type declaration
2. Protocol.d.ts resolution
3. Type consistency in core services
4. Clean unused variables

### Must NOT Have (Guardrails)
- No breaking runtime changes (types only)
- No feature additions (fix only)
- No test modifications (unless fixing test type errors)
- No ESLint config changes

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (`npm run typecheck`, TypeScript compiler)
- **Automated verification**: YES (typecheck exit code, error count reduction)
- **Framework**: TypeScript compiler (`tsc --noEmit`)
- **If TDD**: Each task follows ERROR (typecheck fails) → FIX (type changes) → VERIFY (typecheck passes)

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Typecheck**: Use Bash - Run `npm run typecheck`, capture output, verify error reduction
- **File verification**: Use Read - Confirm changes applied correctly
- **Pattern matching**: Use Grep - Verify no new errors introduced

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Each wave completes before the next begins.

```
Wave 1 (Start immediately — foundation fixes):
├── Task 1: Create global OpenCV type declaration [quick]
├── Task 2: Fix electron/protocol.d.ts mismatch [quick]
└── Task 3: Fix unused variable errors (TS6133) [quick]

Wave 2 (After Wave 1 — type consistency):
├── Task 4: Fix GameStateManager type mismatches [deep]
└── Task 5: Fix state typing issues (GameRunning, Lobby) [quick]

Wave 3 (After Wave 2 — validation):
└── Task 6: Final validation and cleanup [deep]

Critical Path: Task 1 → Task 4 → Task 6 (or Task 2 → Task 4 → Task 6)
Parallel Speedup: ~70% faster than sequential
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix

- 1,2,3 → 4,5 → 6
- 4 depends on 1 (OpenCV types affect TftOperator)
- 5 depends on nothing (independent state fixes)
- 6 depends on all (final validation)

### Agent Dispatch Summary

- **Wave 1**: 3 tasks → `quick` category for simple fixes
- **Wave 2**: 2 tasks → 1 `deep` (complex), 1 `quick` (simple)
- **Wave 3**: 1 task → `deep` for final validation

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

### Task 1: Create global OpenCV type declaration

**Status**: COMPLETED
**Agent Profile**: `quick` category
**Parallelization**: Independent (runs in Wave 1)

**Description**: Create a global type declaration file for OpenCV cv namespace to resolve TS2503 errors in TftOperator.ts and TemplateMatcher.ts.

**Expected Outcome**:
- New file: `src/types/opencv-global.d.ts`
- Global cv type declaration that matches @techstark/opencv-js usage
- TS2503 errors eliminated from TftOperator.ts
- TS18048 errors reduced (cv possibly undefined)

**Required Tools**: Write, Read, Bash (typecheck)

**MUST DO**:
1. Create `src/types/opencv-global.d.ts` with proper OpenCV type declaration
2. Declare global cv namespace matching @techstark/opencv-js exports
3. Export empty to make it a module declaration
4. Run `npm run typecheck` to verify TS2503 errors eliminated
5. Save evidence of error reduction

**MUST NOT DO**:
1. Do NOT modify runtime code
2. Do NOT change OpenCV imports in existing files
3. Do NOT add new dependencies

**Context**:
- TftOperator.ts has many "Cannot find namespace 'cv'" errors
- TemplateMatcher.ts also uses cv namespace
- @techstark/opencv-js is the actual package providing cv
- Global declaration should match the package's exported types

**QA Scenarios**:
- Test 1.1: Create opencv-global.d.ts file
- Test 1.2: Run typecheck and verify TS2503 errors eliminated
- Test 1.3: Verify no new errors introduced
- Test 1.4: Save evidence file with before/after error counts

---

### Task 2: Fix electron/protocol.d.ts mismatch

**Status**: COMPLETED
**Agent Profile**: `quick` category
**Parallelization**: Independent (runs in Wave 1)

**Description**: Fix TS6305 errors in OverlayBridge.ts and ToastBridge.ts caused by missing protocol.d.ts build artifact.

**Expected Outcome**:
- TS6305 errors eliminated
- Protocol types properly resolved
- OverlayBridge and ToastBridge type-safe

**Required Tools**: Read, Edit, Bash (typecheck)

**MUST DO**:
1. Investigate protocol.ts and protocol.d.ts relationship
2. Option A: Add protocol.ts to tsconfig include/files
3. Option B: Create hand-maintained protocol.d.ts with minimal types
4. Option C: Use skipLibCheck temporarily (not recommended)
5. Run typecheck to verify TS6305 errors eliminated
6. Save evidence of fix

**MUST NOT DO**:
1. Do NOT modify electron protocol implementation
2. Do NOT break preload/main process communication
3. Do NOT add unnecessary type complexity

**Context**:
- OverlayBridge.ts imports from electron/protocol.d.ts
- protocol.d.ts should be generated from protocol.ts
- tsconfig may not include protocol.ts in compilation
- This is a build configuration issue, not a code issue

**QA Scenarios**:
- Test 2.1: Investigate protocol.ts/d.ts relationship
- Test 2.2: Apply minimal fix (include or create d.ts)
- Test 2.3: Run typecheck and verify TS6305 errors eliminated
- Test 2.4: Save evidence file

---

### Task 3: Fix unused variable errors (TS6133)

**Status**: COMPLETED
**Agent Profile**: `quick` category
**Parallelization**: Independent (runs in Wave 1)

**Description**: Clean up TS6133 unused variable errors across multiple files by removing dead code or prefixing with underscore.

**Expected Outcome**:
- TS6133 errors eliminated or significantly reduced
- Dead code removed or marked appropriately
- No functional changes to code behavior

**Required Tools**: Edit, Read, Grep, Bash (typecheck)

**MUST DO**:
1. Identify all TS6133 errors in TypeScript output
2. For each error, determine: dead code vs placeholder vs temporary
3. Remove genuinely dead code
4. Prefix placeholder variables with underscore (_variableName)
5. For test files: remove unused variables or prefix
6. Run typecheck to verify error reduction
7. Save evidence of changes

**MUST NOT DO**:
1. Do NOT change variable names that are used elsewhere
2. Do NOT remove functions that might be called dynamically
3. Do NOT change test logic or assertions

**Context**:
- StrategyService.ts has many unused helper functions
- DataCollector.ts has unused payload variable
- Test files have unused variables from copy/paste
- Some unused variables are placeholders for future features

**QA Scenarios**:
- Test 3.1: Run typecheck to get list of TS6133 errors
- Test 3.2: Fix StrategyService.ts unused variables
- Test 3.3: Fix DataCollector.ts unused variables
- Test 3.4: Fix test file unused variables
- Test 3.5: Run typecheck and verify error reduction

---

### Task 4: Fix GameStateManager type mismatches

**Status**: COMPLETED
**Agent Profile**: `deep` category
**Parallelization**: Depends on Task 1 (OpenCV types)

**Description**: Fix type mismatches in GameStateManager.ts including TFTEquip shape mismatches and missing BenchLocation types.

**Expected Outcome**:
- TS2345 errors eliminated (TFTEquip mismatch)
- TS2304 errors eliminated (BenchLocation not found)
- Type-safe conversions between OCR results and domain types

**Required Tools**: Read, Edit, Grep, Bash (typecheck)

**MUST DO**:
1. Investigate TFTEquip interface and usage
2. Find where {name: string} objects are passed as TFTEquip
3. Create type adapter/converter function if needed
4. Add BenchLocation type definition if missing
5. Ensure type safety without breaking runtime
6. Run typecheck to verify errors eliminated
7. Save evidence of changes

**MUST NOT DO**:
1. Do NOT change runtime behavior
2. Do NOT modify OCR/template matching logic
3. Do NOT break existing tests

**Context**:
- GameStateManager.ts line 626 passes {name: string} where TFTEquip expected
- BenchLocation type referenced but not defined
- This suggests incomplete type migration or missing shared types
- Need to ensure proper type conversions at boundaries

**QA Scenarios**:
- Test 4.1: Investigate TFTEquip interface and usage
- Test 4.2: Create type adapter for {name: string} → TFTEquip
- Test 4.3: Add BenchLocation type definition
- Test 4.4: Run typecheck and verify TS2345/TS2304 errors eliminated
- Test 4.5: Save evidence file

---

### Task 5: Fix state typing issues

**Status**: COMPLETED
**Agent Profile**: `quick` category
**Parallelization**: Independent (runs in Wave 2)

**Description**: Fix TS2339 property access errors in GameRunningState.ts and LobbyState.ts by properly typing state objects.

**Expected Outcome**:
- TS2339 errors eliminated
- State objects properly typed with phase/state properties
- Type-safe state transitions

**Required Tools**: Read, Edit, Grep, Bash (typecheck)

**MUST DO**:
1. Investigate state object types in GameRunningState.ts
2. Investigate state object types in LobbyState.ts
3. Add proper type definitions for state objects
4. Ensure type safety without breaking runtime
5. Run typecheck to verify errors eliminated
6. Save evidence of changes

**MUST NOT DO**:
1. Do NOT change state machine logic
2. Do NOT break existing state transitions
3. Do NOT modify runtime behavior

**Context**:
- GameRunningState.ts line 379 accesses 'phase' on type {}
- LobbyState.ts lines 383, 404 access 'state' and 'phase' on type {}
- This suggests state objects are untyped or incorrectly typed
- Need proper interface for state objects with phase/state properties

**QA Scenarios**:
- Test 5.1: Investigate state object types
- Test 5.2: Add proper type definitions
- Test 5.3: Run typecheck and verify TS2339 errors eliminated
- Test 5.4: Save evidence file

---

### Task 6: Final validation and cleanup

**Status**: COMPLETED
**Agent Profile**: `deep` category
**Parallelization**: Final validation (Wave 3)

**Description**: Run final typecheck validation, document results, and clean up any remaining issues.

**Expected Outcome**:
- `npm run typecheck` exits with code 0
- All type errors resolved or documented
- Evidence files complete
- Summary of changes and remaining work

**Required Tools**: Bash (typecheck, lint), Read, Write

**MUST DO**:
1. Run `npm run typecheck` and verify exit code 0
2. Run `npm run lint` to check for new warnings
3. Document any remaining issues or decisions
4. Create final validation report
5. Save all evidence files

**MUST NOT DO**:
1. Do NOT make new changes (validation only)
2. Do NOT modify files
3. Do NOT skip validation steps

**Context**:
- Final check that all type errors are resolved
- Ensure no regressions introduced
- Document any trade-offs or decisions made

**QA Scenarios**:
- Test 6.1: Run typecheck and verify exit code 0
- Test 6.2: Run lint and check for new warnings
- Test 6.3: Create final validation report
- Test 6.4: Save evidence file

---

## Success Criteria

### Verification Commands
```bash
npm run typecheck     # Expected: exit 0, 0 errors
npm run lint          # Expected: exit 0 or exit 1 with warnings (acceptable)
npm run test:unit     # Expected: no new test failures
```

### Final Checklist
- [x] `npm run typecheck` exits with code 0
- [x] 0 TypeScript errors remaining
- [x] OpenCV global types declared (via CvMat type alias)
- [x] Protocol.d.ts mismatch resolved
- [x] Unused variables cleaned (36 errors fixed)
- [x] GameStateManager types fixed
- [x] State typing issues resolved
- [x] Evidence files complete for all tasks
- [x] Final validation report created

---

## Appendix: File Inventory

### Files to Modify
1. `src/types/opencv-global.d.ts` (NEW) - Global OpenCV type declaration
2. `src-backend/services/GameStateManager.ts` - Type mismatches
3. `src-backend/services/StrategyService.ts` - Unused variables
4. `src-backend/services/DataCollector.ts` - Unused variables
5. `src-backend/states/GameRunningState.ts` - State typing
6. `src-backend/states/LobbyState.ts` - State typing
7. `src-backend/TftOperator.ts` - cv namespace (after global types)
8. `src-backend/tft/recognition/TemplateMatcher.ts` - cv namespace
9. `src-backend/utils/OverlayBridge.ts` - Protocol types
10. `src-backend/utils/ToastBridge.ts` - Protocol types
11. `tests/backend/**/*.test.ts` - Unused test variables

### Evidence Directory
`.sisyphus/evidence/` - All evidence files from this plan