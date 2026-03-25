# PC Rule Engine Test Coverage Validation Report

Generated: 2026-03-25

Summary
-------
- Test file: tests/backend/rule_based_engine.test.ts
- Fixture folder: examples/pc-logic/ (39 JSON files)
- Test runner: node --import tsx --test tests/backend/rule_based_engine.test.ts
- Test run result: 50 tests passed, 0 failed

Covered Scenarios
------------------
- Basic action generation (BUY, MOVE, LEVEL_UP, EQUIP, ROLL, NOOP)
- Key tempo level-up rounds (2-1, 2-5, 3-2, 4-1, 4-2, 4-5, 5-1)
- Stabilize logic when HP is low or board is weak (small D, roll-down, all-in)
- Strategy presets: FAST8 vs STANDARD (economy floor differences)
- Target-pair logic: target-champion chase, exit/keep behavior, pair all-in windows
- Bench overflow and SELL behavior under low gold and critical HP
- Multi-fusion evaluation and ordering: evaluateMultiFusionPaths usage via fixtures
- computeRiskAdjustedScore effects on priorities (HP & gold driven adjustments)
- Priority ordering and tick-based tie-breaking

Test Count
----------
- Observed tests in file: ~50 (test runner reports 50 tests ran)
- The file contains many individual, narrowly-scoped tests (each validating one behavior)

Fixture Analysis
----------------
- Fixture count: 39 JSON files present under examples/pc-logic/
- Representative fixtures inspected: multi-fusion-comparison.json, opponent-counter.json, winstreak-tempo-2-5.json (others used similarly)
- Fixtures encode full ObservedState + DecisionContext pairs and are reused by multiple tests (multi-fusion, risk adjustment, tempo, etc.)
- Coverage appears broad across midgame/late-game stageText values and hp/gold permutations

Gaps Identified
---------------
1) Boundary / edge numeric values
   - Tests cover many hp brackets (<=20, <=30, <=42, etc.) but do not exhaustively test off-by-one edges (e.g., hp=41 vs hp=42, gold exactly at economyFloor boundaries in every preset). Consider adding table-driven tests for immediate neighbor values.

2) Unhandled parsed stage variations
   - parseStage tolerates only "N-M" patterns. No tests exercise malformed stageText (e.g., "Stage4" or empty string) and code paths relying on parsed===null.

3) Shop offer cost null / missing fields
   - Some branches guard for offer.cost === null; fixtures mostly include explicit numeric costs. Tests don't exercise unusual shop shapes (all nulls, mixed nulls with unexpected unit shapes).

4) Augment (AUGMENT) stage handling
   - generatePlan contains a PICK_AUGMENT branch when stageType === AUGMENT and augments exist. There are no tests covering augment selection.

5) importStrategy / exportStrategy
   - Methods exportStrategy and importStrategy exist; there are no unit tests validating importStrategy input validation and context mutation behaviors.

6) computeRiskAdjustedScore sensitivity
   - Risk factors combine hp, economy floor, and weakBoard; tests assert elevated priority qualitatively but do not test the numeric mapping across the full 0-100 output range or edge cases for economyFloor==0.

7) evaluateFusionPath variations
   - evaluateFusionPath considers shopPotential via unitPower; fixtures use limited shop compositions. No tests vary item counts or star tiers to confirm synergy weighting math.

8) Concurrency & ordering guarantees
   - Tests assert sorting by priority/tick on the returned array. They do not stress plans at array length > 8 (generatePlan slices to 8). No tests assert slice correctness when more than 8 candidate plans exist.

9) Negative / invalid inputs
   - ObservedState fields missing (e.g., undefined board, bench) are not tested. Defensive branches in helpers assume arrays exist.

Recommendations (non-code changes)
--------------------------------
- Add table-driven tests for numeric boundaries around hp thresholds (41/42/43), gold/economy floor edges, and rollBudget calculations.
- Add tests for parseStage fallback (parsed === null) and behavior when stageText is malformed or missing.
- Add a test to cover PICK_AUGMENT (stageType AUGMENT + augments present) to ensure augment selection plan is generated.
- Add tests for importStrategy/exportStrategy to validate JSON parsing, field validation, and context mutation side-effects.
- Add fixtures that exercise odd shop shapes (all null offers, offers with null cost, offers with unexpected unit shapes) and missing arrays in state to harden defensive code.
- Add explicit numeric assertions for computeRiskAdjustedScore mapping across several synthetic baseScore/hp/gold combinations to pin down expected adjustedScore outputs.

Files created by this validation
-------------------------------
- .sisyphus/evidence/task-3-rule-engine-tests.txt  (captured test run output)
- .sisyphus/evidence/task-3-validation-report.md  (this report)

Verification performed
----------------------
- Ran: node --import tsx --test tests/backend/rule_based_engine.test.ts
  - Result: 50 tests passed, 0 failed
- Read and inspected: tests/backend/rule_based_engine.test.ts and src-backend/core/RuleBasedDecisionEngine.ts
- Verified fixtures exist: examples/pc-logic/ (39 files)

Notes and assumptions
---------------------
- Assumed the user's expected "~83 tests" in the instruction was an overestimate; observed test count is 50 in the current repository state.
- Assumed fixtures in examples/pc-logic are the canonical set (39 files) and that tests reference them directly via readExampleFixture.
- Did not change any production or test code; this task only reads, runs tests, and writes reports.

Appendix
--------
- Command run: node --import tsx --test tests/backend/rule_based_engine.test.ts
- Test summary saved to .sisyphus/evidence/task-3-rule-engine-tests.txt
