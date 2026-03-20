# Completion Report: Android OCR Shop-Open 5-1 (Mar 2026)

## Regression and Manual Verification Results

This file confirms the final, evidence-based closure of the shop-open 5-1 OCR stage regression (sample: `recording-shop-5-1-stage-raw.png`), per Task Card A and Oracle's ultrawork/code-red verification criteria.

### Mechanism of Resolution

The only mechanism responsible for stabilization is the inclusion of the `stage/threshold-110` OCR variant in `buildAndroidStageOcrVariants`. No sample-specific heuristic or hidden boost is present—selection relies solely on real variant yields and code-documented scoring. 

### Automated Regression Run

Command:

```
node --import tsx --test tests/backend/android_hud_recognition.test.ts
```

Result output (excerpt):

```
✔ android HUD gold OCR recognizes real-device 2-5 / 5-1 / 5-2 frames (...)
✔ android HUD XP OCR can derive level info from real-device 2-5 / 5-1 / 5-2 frames (...)
✔ android HUD self HP can be matched from self nameplate and scoreboard OCR (...)
✔ android stage OCR recognizes opening, shop-open, and topbar variant crops from real-device samples (...)
ℹ pass 4
ℹ fail 0
```

### Manual QA Command / Observation

Manual replay yields real OCR evidence confirming correct recognition:

```
node --import tsx scripts/run-android-recognition-replay.ts --fixture android-s16-shop-open-stage-5-1
```

Observed output:

```json
{
  "stageResult": {
    "rawText": "5-1",
    "extractedText": "5-1",
    "expectedText": "5-1",
    "recognizedType": "PVP",
    "expectedType": "PVP",
    "passed": true
  }
}
```

---

- As of Mar 2026, all regression and manual QA pass for the 5-1 sample with expected value '5-1' and support traceable only to OCR variant evidence—not heuristics, fudge factors, or overrides.
- If new instability is observed for this crop, update this report and regression/test docblocks immediately, following process discipline.
