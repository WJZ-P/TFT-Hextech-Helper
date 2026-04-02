# Final QA Results

## Test Run Date: 2026-03-25

---

## Task 1: GUI Lineups Offline Smoke Test
**Command:** `node --import tsx --test tests/backend/gui_lineups_offline_smoke.test.ts`

**Result:** ✔ PASS

```
✔ Electron lineup GUI verification reports local assets when season-pack resources are available offline (25447.4273ms)
ℹ tests 1
ℹ pass 1
ℹ fail 0
```

---

## Task 2: TFT Data Hub Test
**Command:** `node --import tsx --test tests/backend/tft_data_hub.test.ts`

**Result:** ✔ PASS

```
✔ TftDataHub merges snapshot display access with automation lineup access (0.8535ms)
✔ TftDataHub champion/trait helpers (1.2682ms)
ℹ tests 2
ℹ pass 2
ℹ fail 0
```

---

## Task 3: Rule Based Engine Test
**Command:** `node --import tsx --test tests/backend/rule_based_engine.test.ts`

**Result:** ✔ PASS

All 50 test cases passed:
- Economy state handling (buy/move/level actions)
- NOOP emission when no profitable action
- Tempo level-up on 2-1
- Stabilize roll on low HP
- Level 7 timing on 4-1 for fast-8
- D-card roll window on 3-2
- Winstreak tempo protection
- And 42 more scenarios...

```
ℹ tests 50
ℹ pass 50
ℹ fail 0
```

---

## Summary
- **Total Tests:** 53
- **Passed:** 53
- **Failed:** 0
- **Skipped:** 0