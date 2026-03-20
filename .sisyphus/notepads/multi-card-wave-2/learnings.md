# Multi-Card Wave 2 — Learnings

## Session Start
- Prior wave (wave 1): Cards B/C/D/E completed, StrategyService fully migrated off TFT_16_EQUIP_DATA
- Last test run: 107 run / 105 pass / 1 fail / 1 skip / 0 cancelled
- Known failure: gui_lineups_offline_smoke — stderr buffer overflow from OpenCV.js WASM dump
- Known skip: ??? — need to identify

## English Support Round 4 (2026-03-20)

### Changes Made
- Added capability boundary documentation at top of TftNameNormalizer.ts (清晰定义了什么是支持的，什么不支持)
- Added 16 new equipment English aliases:
  - quicksilver, lastwhisper, lw, rabadon, dcap, morello, shojin, hoj, gs, jgs
  - 以及完整的 englishId 名称: rabadonsdeathcap, spearofshojin, hextechgunblade, giantslayer, madredsbloodrazor, jeweledgauntlet
- Added 4 new champion shorthands: morg, morgana, heimer, viego
- Added comprehensive test coverage for all new aliases

### Canonical Equipment Names (from equip.ts)
Verified against TFTProtocol.ts canonical names:
- 水银: "TFT_Item_Quicksilver"
- 最后的轻语: "TFT_Item_LastWhisper"
- 灭世者的死亡之帽: "TFT_Item_RabadonsDeathcap"
- 莫雷洛秘典: "TFT_Item_Morellonomicon"
- 朔极之矛: "TFT_Item_SpearOfShojin"
- 海克斯科技枪刃: "TFT_Item_HextechGunblade"
- 巨人杀手: "TFT_Item_MadredsBloodrazor"
- 珠光护手: "TFT_Item_JeweledGauntlet"

### Test Results
- Typecheck: PASS (no TypeScript errors)
- Unit tests: 108 pass / 1 fail (same known failure: gui_lineups_offline_smoke)
- All normalizer tests pass including new Round 4 expansion tests

### Pattern Notes
- normalizeEquipmentName() uses strict explicit mapping (only aliases in EQUIPMENT_NAME_ALIASES resolve)
- resolveChampionAlias() uses fuzzy auto-simplification (simplifies englishId tokens for coverage)
- Both use normalizeAliasToken() for case-insensitive matching

## Android Live Stability Round 3 (2026-03-20)

### Three Concrete Live-vs-Replay Difference Sources

#### Source 1: Crop offset drift from non-standard emulator aspect ratios
- **File**: `src-backend/TFTProtocol.ts` lines 603-611; `src-backend/TftOperator.ts` lines 1783-1814
- **Trigger**: Emulator has non-4:3 or non-standard window proportions (e.g., 16:9, 18:9, title-bar offsets)
- **Mechanism**: Percentage-based crop regions (e.g., `androidGameStageDisplayNormal`: x=0.330-0.430) assume a specific window geometry. Non-standard geometries shift stage text outside these bounds.
- **Severity**: Medium
- **Mitigation (already in place)**: `getAndroidStageFallbackRegions()` (TftOperator.ts lines 1783-1814) provides 9 fallback scan windows with varying percentages from `{x:0.32,y:0.00,w:0.10,h:0.06}` to `{x:0.18,y:0.00,w:0.44,h:0.20}`.

#### Source 2: Shop-open UI compression (stage text drifts leftward)
- **File**: `src-backend/TFTProtocol.ts` lines 608-611; `src-backend/TftOperator.ts` lines 1677-1743
- **Trigger**: When shop is open, the topbar compresses horizontally, shifting stage text left
- **Mechanism**: `androidGameStageDisplayShopOpen` was originally identical to `androidGameStageDisplayNormal` (both x=0.330-0.430), which could miss leftward-drifting stage text during shop-open frames.
- **Severity**: Low-Medium
- **Fix applied (wave 3)**: Widened `androidGameStageDisplayShopOpen` to x=0.310-0.470 (shifted left 2 percentage points, widened by 8 points). Added explanatory comment. Additionally, `recognizeAndroidStageWithVoting()` already includes `shop-open` and `shop-open-wide` variants (lines 1680, 1704-1709) that further cover this case.

#### Source 3: Frame timing — mid-transition frames with partially obscured text
- **File**: `src-backend/TftOperator.ts` lines 1816-1847
- **Trigger**: During stage transitions (e.g., 2-1→2-2), a single-frame capture may read partially-transitioning text (e.g., "2-" without the round number)
- **Mechanism**: Regression fixtures use settled frames (captured after animations complete). Live capture can hit mid-animation frames.
- **Severity**: Medium
- **Mitigation (already in place)**: `confirmStageWithHistory()` requires 4 consecutive matching reads (STAGE_CONFIRM_THRESHOLD=4, MAX_HISTORY_LENGTH=8) before confirming a stage. This naturally filters out transient misreads.

### Low-Risk Fix Applied (wave 3)
- **File**: `src-backend/TFTProtocol.ts` line 608-612
- Changed `androidGameStageDisplayShopOpen` from `{x:0.330,y:0.000}` to `{x:0.430,y:0.060}` → `{x:0.310,y:0.000}` to `{x:0.470,y:0.080}` (wider + leftward shift to match actual shop-open text position)
- **Rationale**: `androidGameStageDisplayShopOpen` was previously identical to the normal constant — a regression risk. The voting mechanism already provides fallback, but the wider base crop reduces reliance on fallback scan for standard shop-open frames.

### Updated Documentation
- **File**: `src-backend/adapters/AndroidEmulatorAdapter.ts` lines 84-106
- Expanded the comment block to explicitly document which of the 3 instability sources are mitigated vs. remaining risk
- Key insight: All three sources already had some mitigation; the fix just makes the protocol constant more accurate for shop-open frames

### Test Results
- `npm run typecheck`: PASS (exit code 0)
- `npm run test:unit` (android tests): 4/4 pass, 0 fail, 0 cancelled, 0 skipped
- Pre-existing failures: `gui_lineups_offline_smoke` (OpenCV WASM stderr buffer overflow, unrelated), `rule_based_engine` preset divergence test (unrelated to Android OCR)

### Key Architectural Insight
The stability problem is fundamentally a **multi-layer mitigation** architecture, not a single-point fix:
1. Voting across 7 regions in `recognizeAndroidStageWithVoting()` (spatial diversity)
2. 9 fallback region scans (broader spatial coverage)
3. 4-frame confirmation history (temporal consistency)
4. Protocol constants (calibrated base positions)
5. UNKNOWN fallback → safe "stay in place" behavior

Each layer catches what the previous layer misses. The fix to `androidGameStageDisplayShopOpen` tightens the protocol constants so layer 4 catches more, reducing load on layers 1-3.

## StrategyService Migration Round 3 (2026-03-20)

### Audit Method
- grep tool was COMPLETELY BROKEN for StrategyService.ts (returned zero matches for all identifiers including `gameStageMonitor`, `ChampionKey`, etc.)
- Used LSP diagnostics via Edit tool AND ast_grep_search for actual call-site discovery
- Key lesson: For large TypeScript files with complex characters, LSP/ast_grep is reliable; grep is not

### Audit Findings
- StrategyService.ts (3513 lines): ZERO direct static protocol or table accesses
- All catalog access goes through `strategyDataHub` (TftDataHub instance)
- Active strategyDataHub calls: getChampionRange (3), getSelectedAutomationLineups (1), isWearableEquipment wrapper (4), getEquipmentRoleHint wrapper (3), isBaseComponentEquipment (2), getEquipmentComponents (1 via dead wrapper)
- Dead wrapper `getComponentNamesOfItem()` at line 458: delegates to `strategyDataHub.getEquipmentComponents()`, 0 call sites, retained per no-deletion rule
- All imports verified as in-use (no dead import cleanup needed beyond what was already done)

### Test Results
- npm run typecheck: PASS
- npm run test:unit: 113 run / 111 pass / 2 fail
  - gui_lineups_offline_smoke: pre-existing OpenCV WASM crash
  - rule_based_engine preset divergence: pre-existing, unrelated

## PC Rule Engine Round 3 — Compositional Judgment Tests (2026-03-20)

### Changes Made
- Added 4 new combination strategy test cases to `tests/backend/rule_based_engine.test.ts`
- Added 4 new JSON fixtures to `examples/pc-logic/`:
  - `stabilize-medium-hp-3-2.json`: 3-2 medium-HP stabilize scenario
  - `fast8-vs-standard-4-1.json`: FAST8 vs standard economy floor divergence
  - `small-roll-threshold-3-2.json`: Small-roll threshold at borderline HP
  - `loss-streak-sell-4-3.json`: Loss-streak sell when bench overflows

### Key Trace Findings (Engine Behavior)

#### weakBoard has TWO triggers (not just board strength)
The `weakBoard` condition in `RuleBasedDecisionEngine.ts` line 132-133:
```typescript
weakBoard = boardStrength < expectedBoardStrength || board.length < Math.max(1, level - 1)
```
- Trigger 1: Board strength below expected for stage/level
- Trigger 2: Board unit count below `level - 1` (slot underfill)
- **Lesson**: A 3-unit board at level 6 triggers weakBoard even if the units are individually strong (3x 5-cost 2-star = 33 strength, which is above the stage-4 expected 27.6, but board.length=3 < level-1=5 → weakBoard=TRUE)

#### FAST8 vs Standard preset divergence is subtle
Both presets share the same `mustStabilize` condition (hp <= 42 || weakBoard). The actual divergence:
- FAST8 has a `keyStabilizeRound` bonus at 3-2 and 4-2 (rolls even when gold < floor+6, via the key-round branch)
- BUT this bonus is redundant with weakBoard→mustStabilize: if weakBoard=true, mustStabilize=true for both → both roll
- Real FAST8 vs standard divergence: **economy floor**. FAST8's floor at stage 4 = 24 vs standard = 30. When mustStabilize fires, FAST8's lower floor means more gold available for rolling
- The `keyStabilizeRound` branch in FAST8 (`keyStabilizeRound && weakBoard && gold >= 16`) is only usable when weakBoard=true, which ALSO triggers mustStabilize for standard

#### Economy floor roll budget formula
```typescript
rollBudget = Math.max(0, state.gold - (hp <= hpThreshold ? 0 : economyFloor))
```
When `mustStabilize=true`: budget = gold - economyFloor (no softBudget subtraction)
When `mustStabilize=false`: budget = softBudget = gold - economyFloor (same result, different label)

#### The preset test required multiple iterations
- Initial test idea (4-2 with weak board): both presets roll (mustStabilize fires for both)
- Correct scenario: 4-1 with 3 board units at level 6 (slot underfill → weakBoard=true for both) → both roll, but FAST8 rolls MORE due to lower economy floor (24 vs 30)

### Test Results
- `npm run typecheck`: PASS
- `npm run test:unit` (rule_based_engine.test.ts): 12 tests / 12 pass / 0 fail
- `npm run lint`: 51 pre-existing issues in other files (not touched in this session)

