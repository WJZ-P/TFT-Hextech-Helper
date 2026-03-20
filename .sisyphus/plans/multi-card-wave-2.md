# Multi-Card Wave 2 — Stability & Enhancement

## Overview

5 parallel task cards targeting: GUI smoke stabilization, Android live stability, PC rule engine enhancement, TftDataHub migration, and English support expansion.

## Task Summary

| Card | Task | Priority | Files | Status |
|------|------|----------|-------|--------|
| A | gui_lineups_offline_smoke root cause fix | P0 | `tests/backend/gui_lineups_offline_smoke.test.ts`, `scripts/verify-lineups-gui.ts` | pending |
| B | Android live recognition stability round 3 | P1 | `src-backend/adapters/AndroidEmulatorAdapter.ts`, `src-backend/tft/recognition/RecognitionUtils.ts` | pending |
| C | PC rule engine round 3 enhancement | P1 | `src-backend/core/RuleBasedDecisionEngine.ts`, `tests/backend/rule_based_engine.test.ts` | pending |
| D | StrategyService→TftDataHub migration round 3 | P2 | `src-backend/services/StrategyService.ts`, `src-backend/data/TftDataHub.ts`, `docs/tft-data-architecture.md` | pending |
| E | English support round 4 | P2 | `src-backend/data/TftNameNormalizer.ts`, `tests/backend/tft_name_normalizer.test.ts` | pending |

## Dependencies

- Cards A, B, C, D, E are all **independent** — no inter-card dependencies.
- All cards share the same verification gate: `npm run typecheck` + `npm run test:unit`

## Final Verification Wave

- [ ] F1: Oracle review — Card A root cause explanation and fix
- [ ] F2: Oracle review — Card B live-vs-replay differences documented
- [ ] F3: Oracle review — Card C combo strategy fixtures and logic explanation
- [ ] F4: Oracle review — Card D migration progress and doc updated
- [ ] F5: Oracle review — Card E English boundary documented

---

## TODOs

### Card A: Fix / Stabilize gui_lineups_offline_smoke

- [ ] A1: Reproduce the smoke — run `scripts/verify-lineups-gui.ts` and capture full error output
- [ ] A2: Read `scripts/verify-lineups-gui.ts` — understand how it spawns the Electron subprocess and what `maxBuffer` is used
- [ ] A3: Identify root cause — determine which of: OpenCV init failure, Electron renderer load issue, subprocess buffer too small, test harness problem
- [ ] A4: If low-risk fix exists — apply it (e.g., increase stderr maxBuffer, suppress OpenCV stderr noise, fix Electron preload path)
- [ ] A5: If no low-risk fix — document root cause and provide explicit mitigation/next-steps recommendation
- [ ] A6: Verify: `npm run typecheck` passes
- [ ] A7: Verify: `npm run test:unit` — smoke test passes (107/106/1/0/0 or better)

### Card B: Android Live Recognition Stability Round 3

- [ ] B1: Read current `AndroidEmulatorAdapter.ts` observe() method and existing logger.warn for UNKNOWN stage
- [ ] B2: Analyze 2-3 live-vs-replay difference sources: crop offset drift, shop-open UI compression, frame timing, emulator resolution mismatch
- [ ] B3: If any low-risk stabilization fixes identified — implement them (e.g., retry logic, wider OCR tolerance, timing guards)
- [ ] B4: Document each identified live-vs-replay difference with evidence (file path, line, specific trigger condition)
- [ ] B5: Verify: `npm run typecheck` passes
- [ ] B6: Verify: `npm run test:unit` — all Android recognition tests pass

### Card C: PC Rule Engine Round 3 Enhancement

- [ ] C1: Read `RuleBasedDecisionEngine.ts` current logic — map what IS covered vs. what is "compositional judgment" gaps
- [ ] C2: Identify 2-4 combo strategy scenarios NOT yet covered (e.g., stabilize-vs-greedy, mid-game small-D threshold, fast8/standard/preserve-HP branching)
- [ ] C3: Add 2-4 new test cases with realistic fixtures — each test includes combo judgment rationale
- [ ] C4: For each new test, add corresponding JSON fixture in `examples/pc-logic/`
- [ ] C5: Write brief explanation of new logic added (1-2 sentences per scenario)
- [ ] C6: Verify: `npm run typecheck` passes
- [ ] C7: Verify: `npm run test:unit` — all rule engine tests pass (should be 10+ now)

### Card D: StrategyService → TftDataHub Migration Round 3

- [ ] D1: Audit `StrategyService.ts` for remaining direct static protocol/table dependencies (grep for `_DATA`, `_INFO`, raw `getChessData*`, raw `getEquipData*`, raw `TFTProtocol` enum accesses)
- [ ] D2: For each remaining direct dependency — determine if TftDataHub already has equivalent method
- [ ] D3: Add missing methods to TftDataHub for champion lookup, trait lookup, item definition, trait catalog access
- [ ] D4: Update StrategyService callers to use TftDataHub methods instead of direct static access
- [ ] D5: Update `docs/tft-data-architecture.md` — mark completed migrations, list remaining static deps
- [ ] D6: Verify: `npm run typecheck` passes
- [ ] D7: Verify: `npm run test:unit` — all tests pass

### Card E: English Support Round 4

- [ ] E1: Audit current `TftNameNormalizer.ts` aliases — count equipment vs champion coverage
- [ ] E2: Add 5+ additional English equipment aliases (e.g., "quicksilver"→"水银", "lw"→"最后的轻语", "zhonya"→"中娅", "rabadon"→"灭世者的死亡之帽", etc.)
- [ ] E3: Add 2-3 champion shorthand aliases not yet covered
- [ ] E4: Add trait shorthands where applicable
- [ ] E5: Expand test cases to cover new aliases
- [ ] E6: Document current English capability boundary — what IS supported, what is NOT
- [ ] E7: Verify: `npm run typecheck` passes
- [ ] E8: Verify: `npm run test:unit` — normalizer tests pass, no Chinese regression

---

## Acceptance Criteria

### Card A
- [ ] Root cause of stderr buffer overflow is explained (not just suppressed)
- [ ] If fix applied: `npm run test:unit` — gui_lineups_offline_smoke passes
- [ ] If no fix: explicit recommendation written in comments/code/doc

### Card B
- [ ] 2-3 live-vs-replay difference sources documented with file/line evidence
- [ ] Any stabilization fixes include regression tests
- [ ] `npm run test:unit` — all Android tests pass

### Card C
- [ ] 2-4 new combo strategy test cases added
- [ ] 2-4 corresponding JSON fixtures in `examples/pc-logic/`
- [ ] Written explanation of new logic (1-2 sentences per scenario)

### Card D
- [ ] Direct static dependencies in StrategyService continue to decrease
- [ ] `docs/tft-data-architecture.md` updated with migration status

### Card E
- [ ] 5+ equipment aliases, 2-3 champion shorthands added
- [ ] English capability boundary documented
- [ ] `npm run test:unit` — no regression on Chinese

---

## Final Checklist

- [ ] All 5 cards complete
- [ ] `npm run typecheck` — exit 0
- [ ] `npm run test:unit` — 108+ tests pass, 0 failures (gui_lineups_smoke must be fixed or documented)
- [ ] Test report shows: X run / Y pass / Z fail / A skip / B todo / C cancelled (FULL ACCOUNTING)
- [ ] Final Verification Wave — all 5 oracle reviews APPROVE
