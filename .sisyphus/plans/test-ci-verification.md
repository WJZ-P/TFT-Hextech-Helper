# Test/CI Verification & Coverage Plan

## Overview

This plan addresses the critical test/CI verification gap identified in the current project state. Static analysis shows 342 test declarations across 46 files, but documentation claims only 203-208 tests. This discrepancy needs resolution before proceeding with feature development.

## TL;DR

**Quick Summary**: Resolve test count discrepancies, run comprehensive coverage analysis, fix any failing tests, ensure CI reliability, and establish baseline metrics for future development.

**Deliverables**:
1. Authoritative test count with validation
2. Coverage report with gap analysis
3. Fixed failing tests (if any)
4. Updated documentation with accurate metrics
5. CI reliability improvements

**Estimated Effort**: Medium (2-3 days)
**Parallel Execution**: YES - Wave 1 (3 parallel tasks), Wave 2 (2 parallel tasks), Wave 3 (1 task)
**Critical Path**: Task 1 → Task 4 → Task 5 (or Task 2 → Task 4 → Task 5)

---

## Context

### Current State
- **Static test count**: 342 test declarations in 46 test files
- **Documentation claims**: 203-208 tests (inconsistent with static scan)
- **Recent work**: Focus on PC fusion scoring, OCR/Android stability
- **Known issues**: Test runner times out, some Android tests fail due to SettingsStore error

### Why This Matters
1. **Foundation for all work**: Reliable test/CI is prerequisite for feature development
2. **Release readiness**: Cannot ship with uncertain test status
3. **Technical debt**: Discrepancies indicate potential stale documentation
4. **Team productivity**: CI failures block development workflow

---

## Work Objectives

### Core Objective
Establish reliable test/CI baseline with accurate metrics, fix any failures, and create documentation that matches actual code state.

### Concrete Deliverables
1. Run full test suite and document authoritative test count
2. Generate coverage report with gap analysis
3. Fix any failing tests or document acceptable failures
4. Update all documentation with accurate test metrics
5. Improve CI reliability (if needed)

### Definition of Done
- [ ] `npm run test:unit` completes without timeout
- [ ] Test count matches between runner and documentation
- [ ] Coverage report generated with gap analysis
- [ ] All documented failures have explanations
- [ ] Documentation updated with accurate metrics
- [ ] CI runs reliably (no environmental blockers)

### Must Have
1. Authoritative test count from test runner
2. Coverage report with file-level details
3. Fixed or documented failing tests
4. Updated documentation with accurate metrics

### Must NOT Have (Guardrails)
- No changes to test logic (only fix failures, don't modify tests)
- No new test creation (existing tests only)
- No breaking changes to build configuration
- No environmental modifications that affect other work

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Node test runner, `npm run test:unit`, `npm run test:coverage`)
- **Automated tests**: YES (existing test suite)
- **Framework**: Node test runner (`node --import tsx --test`)
- **If TDD**: Each task follows RED (failing test) → GREEN (minimal fix) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios. Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Test runner**: Use Bash - Run `npm run test:unit`, capture output, parse results
- **Coverage**: Use Bash - Run `npm run test:coverage`, analyze report
- **Documentation**: Use Read/Edit - Update files, verify changes
- **CI validation**: Use Bash - Test commands, verify exit codes

---

## Execution Strategy

### Parallel Execution Waves

> Maximize throughput by grouping independent tasks into parallel waves.
> Each wave completes before the next begins.

```
Wave 1 (Start immediately — baseline establishment):
├── Task 1: Run test suite and capture authoritative count [deep]
├── Task 2: Generate coverage report and gap analysis [deep]
└── Task 3: Identify and triage failing tests [deep]

Wave 2 (After Wave 1 — remediation):
├── Task 4: Fix documented failures or update documentation [deep]
└── Task 5: Update all documentation with accurate metrics [quick]

Wave 3 (After Wave 2 — validation):
└── Task 6: Final validation and CI reliability check [deep]

Critical Path: Task 1 → Task 4 → Task 6 (or Task 2 → Task 4 → Task 6)
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 3 (Wave 1)
```

### Dependency Matrix

- 1,2,3 → 4,5 → 6
- 4 depends on 1 and 3 (need test results and failure list)
- 5 depends on 1 and 2 (need test count and coverage data)
- 6 depends on 4 and 5 (final validation)

### Agent Dispatch Summary

- **Wave 1**: 3 tasks → `deep` category for complex analysis
- **Wave 2**: 2 tasks → 1 `deep` (fix), 1 `quick` (doc update)
- **Wave 3**: 1 task → `deep` for final validation

---

## TODOs

> Implementation + Test = ONE Task. Never separate.
> EVERY task MUST have: Recommended Agent Profile + Parallelization info + QA Scenarios.

### Task 1: Run test suite and capture authoritative count

**Status**: PENDING
**Agent Profile**: `deep` category
**Parallelization**: Independent (runs in Wave 1)

**Description**: Execute full test suite to get authoritative test count, pass/fail rates, and execution time.

**Expected Outcome**:
- Test runner summary with total tests, passed, failed, skipped
- Execution time metrics
- List of any timeouts or environmental issues
- Evidence file: `.sisyphus/evidence/task-1-test-run.txt`

**Required Tools**: Bash (npm run test:unit), file read/write

**MUST DO**:
1. Run `npm run test:unit` with sufficient timeout (120s+)
2. Capture complete output including summary line
3. Parse output for test counts (total, pass, fail, skip, todo)
4. Document any timeouts or environmental errors
5. Save raw output to evidence file
6. Run `npm run typecheck` to verify no compilation errors

**MUST NOT DO**:
1. Do NOT modify test files
2. Do NOT change build configuration
3. Do NOT fix any failures (just document)
4. Do NOT create new tests

**Context**:
- Current documentation claims 203-208 tests
- Static scan shows 342 test declarations
- Previous runs timed out after 120s
- Some Android tests fail due to SettingsStore error

**QA Scenarios**:
- Test 1.1: Run `npm run test:unit` and verify it completes
- Test 1.2: Parse output for test count accuracy
- Test 1.3: Run `npm run typecheck` and verify exit code 0
- Test 1.4: Save evidence file with complete output

---

### Task 2: Generate coverage report and gap analysis

**Status**: PENDING
**Agent Profile**: `deep` category
**Parallelization**: Independent (runs in Wave 1)

**Description**: Generate test coverage report and identify gaps in test coverage.

**Expected Outcome**:
- Coverage report in text and lcov formats
- Gap analysis showing uncovered files/functions
- Recommendations for high-impact coverage improvements
- Evidence file: `.sisyphus/evidence/task-2-coverage-report.txt`

**Required Tools**: Bash (npm run test:coverage), file read/write, report parsing

**MUST DO**:
1. Run `npm run test:coverage` (c8 + lcov)
2. Capture both text summary and detailed report
3. Identify files with 0% coverage
4. Identify functions/lines with no tests
5. Prioritize gaps by importance (core logic vs utils)
6. Save report to evidence file
7. Generate recommendations for next coverage improvements

**MUST NOT DO**:
1. Do NOT create new tests (just report gaps)
2. Do NOT modify coverage configuration
3. Do NOT change test files

**Context**:
- Coverage command: `npx c8 --reporter=text --reporter=lcov node --import tsx --test tests/backend/**/*.test.ts`
- Key areas: RuleBasedDecisionEngine, TftDataHub, OcrService, Android adapters
- Target coverage mentioned in docs: >90% for PC decision coverage

**QA Scenarios**:
- Test 2.1: Run `npm run test:coverage` and verify it completes
- Test 2.2: Parse coverage summary for percentage metrics
- Test 2.3: Identify top 10 files with lowest coverage
- Test 2.4: Generate prioritized gap analysis

---

### Task 3: Identify and triage failing tests

**Status**: PENDING
**Agent Profile**: `deep` category
**Parallelization**: Independent (runs in Wave 1)

**Description**: Identify all failing tests, categorize failures, and create triage report.

**Expected Outcome**:
- List of all failing tests with error messages
- Categorization: environmental, flaky, logic errors, missing dependencies
- Triage report with recommended actions for each failure
- Evidence file: `.sisyphus/evidence/task-3-failure-triage.md`

**Required Tools**: Bash (test runner), file read/write, log parsing

**MUST DO**:
1. Run test suite and capture all failures
2. Categorize each failure:
   - Environmental (SettingsStore, missing dependencies)
   - Flaky (timing-dependent, race conditions)
   - Logic errors (actual bugs)
   - Missing fixtures/data
3. Document failure patterns (e.g., all Android tests fail same way)
4. Recommend fix priority (critical, high, medium, low)
5. Create triage report with clear categories

**MUST NOT DO**:
1. Do NOT attempt to fix failures (just document)
2. Do NOT modify test files
3. Do NOT change environment configuration

**Context**:
- Known issue: SettingsStore error for Android tests
- Previous test runs show some timeouts
- Need to distinguish real bugs from environmental issues

**QA Scenarios**:
- Test 3.1: Run test suite and capture all failures
- Test 3.2: Categorize each failure by type
- Test 3.3: Generate triage report with priorities
- Test 3.4: Identify patterns across failures

---

### Task 4: Fix documented failures or update documentation

**Status**: PENDING
**Agent Profile**: `deep` category
**Parallelization**: Depends on Task 1 and 3 results

**Description**: Based on triage report, either fix simple failures or document acceptable failures.

**Expected Outcome**:
- Fixed failing tests (if simple fixes available)
- Documented failures with clear explanations
- Updated documentation about known issues
- Evidence file: `.sisyphus/evidence/task-4-fixes.md`

**Required Tools**: Read/Edit, Bash (test runner for verification)

**MUST DO**:
1. Review triage report from Task 3
2. For simple fixes (typos, imports, configuration):
   - Apply minimal fix
   - Verify fix with test run
   - Document what was changed
3. For complex/environmental failures:
   - Document why they fail
   - Note acceptable workarounds
   - Update documentation with known issues
4. Do NOT modify test logic (only fix infrastructure)

**MUST NOT DO**:
1. Do NOT rewrite test logic
2. Do NOT change test assertions
3. Do NOT add new test cases
4. Do NOT modify core business logic

**Context**:
- Simple fixes might include: missing imports, environment variables, path issues
- Environmental failures (SettingsStore) may need documentation, not code changes
- Focus on making test suite run reliably

**QA Scenarios**:
- Test 4.1: Fix 1-2 simple environmental failures
- Test 4.2: Document all remaining failures
- Test 4.3: Run test suite to verify improvements
- Test 4.4: Update documentation with known issues

---

### Task 5: Update all documentation with accurate metrics

**Status**: PENDING
**Agent Profile**: `quick` category
**Parallelization**: Independent (runs in Wave 2)

**Description**: Update all documentation files with accurate test counts, coverage metrics, and status.

**Expected Outcome**:
- Updated NEXT_WAVE_PLAN.md with current test count
- Updated COMPLETION_REPORT_CURRENT_WAVE.md with accurate metrics
- Updated docs/tft-data-architecture.md if needed
- Evidence file: `.sisyphus/evidence/task-5-doc-updates.txt`

**Required Tools**: Read/Edit, file read/write

**MUST DO**:
1. Review all documentation files for outdated metrics
2. Update test counts to match authoritative results from Task 1
3. Update coverage percentages from Task 2
4. Update status of completed tasks (A/B/C from NEXT_WAVE_PLAN)
5. Fix any stale references to "Round 4 gap" if methods exist
6. Update README TODOs if appropriate

**MUST NOT DO**:
1. Do NOT modify code files
2. Do NOT change architectural decisions
3. Do NOT remove historical information (mark as outdated instead)

**Context**:
- Documents needing updates:
  - NEXT_WAVE_PLAN.md (test counts, task status)
  - COMPLETION_REPORT_CURRENT_WAVE.md (metrics)
  - docs/tft-data-architecture.md (gap notes)
  - README.md (TODO items)
- Current inaccuracies: test counts (203 vs 342), gap status

**QA Scenarios**:
- Test 5.1: Update test counts in all documents
- Test 5.2: Update coverage metrics
- Test 5.3: Fix stale gap references
- Test 5.4: Verify document consistency

---

### Task 6: Final validation and CI reliability check

**Status**: PENDING
**Agent Profile**: `deep` category
**Parallelization**: Final validation (Wave 3)

**Description**: Final validation of all changes and CI reliability verification.

**Expected Outcome**:
- Clean test run with updated metrics
- All documentation consistent
- CI commands verified working
- Final evidence report
- Evidence file: `.sisyphus/evidence/task-6-final-validation.md`

**Required Tools**: Bash (full validation suite), file read/write

**MUST DO**:
1. Run complete validation suite:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test:unit`
2. Verify all documentation updates are correct
3. Check for any remaining inconsistencies
4. Generate final validation report
5. Ensure all evidence files are complete

**MUST NOT DO**:
1. Do NOT make new changes (validation only)
2. Do NOT modify files
3. Do NOT skip validation steps

**Context**:
- Validation commands from package.json
- Need to confirm all work is complete and consistent
- Final check before declaring task complete

**QA Scenarios**:
- Test 6.1: Run full validation suite
- Test 6.2: Verify documentation consistency
- Test 6.3: Generate final evidence report
- Test 6.4: Confirm all tasks complete

---

## Success Criteria

### Verification Commands
```bash
npm run lint          # Expected: exit 0, no warnings
npm run typecheck     # Expected: exit 0, no errors
npm run test:unit     # Expected: all tests run, count documented
npm run test:coverage # Expected: coverage report generated
```

### Final Checklist
- [ ] Authoritative test count documented
- [ ] Coverage report generated with gap analysis
- [ ] Failing tests triaged and documented
- [ ] Simple failures fixed (if any)
- [ ] All documentation updated with accurate metrics
- [ ] Final validation passes
- [ ] Evidence files complete for all tasks
- [ ] CI reliability verified

---

## Appendix: File Inventory

### Documentation Files to Update
1. `NEXT_WAVE_PLAN.md` - Test counts, task status
2. `COMPLETION_REPORT_CURRENT_WAVE.md` - Metrics, completion status
3. `docs/tft-data-architecture.md` - Gap notes, method status
4. `README.md` - TODO items, features
5. `.sisyphus/plans/multi-card-wave-2.md` - Test counts

### Key Test Files
1. `tests/backend/rule_based_engine.test.ts` - Core PC logic (54 tests)
2. `tests/backend/ocr_service_worker_lifecycle.test.ts` - OCR tests
3. `tests/backend/tft_operator_stage_confirmation.test.ts` - Stage tests
4. `tests/backend/tft_data_hub.test.ts` - TftDataHub tests

### Evidence Directory
`.sisyphus/evidence/` - All evidence files from this plan