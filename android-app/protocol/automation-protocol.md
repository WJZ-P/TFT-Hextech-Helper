# Android Automation Protocol

The Android MVP mirrors the desktop backend protocol at a coarse level.

## ObservedState

Required fields for the first Android OCR milestone:

```json
{
  "timestamp": 0,
  "stageText": "2-1",
  "stageType": "AUGMENT",
  "level": 4,
  "currentXp": 0,
  "totalXp": 10,
  "gold": 10,
  "hp": 100,
  "bench": [],
  "board": [],
  "shop": [],
  "items": [],
  "metadata": {
    "hasValidStage": "true"
  }
}
```

If OCR is not confident, emit:

```json
{
  "stageText": "",
  "stageType": "UNKNOWN",
  "metadata": {
    "hasValidStage": "false",
    "reason": "stage-ocr-low-confidence"
  }
}
```

## ActionPlan

Matches the desktop action type vocabulary:

- `BUY`
- `SELL`
- `ROLL`
- `LEVEL_UP`
- `MOVE`
- `EQUIP`
- `PICK_AUGMENT`
- `NOOP`

Android-specific execution should always pass through `ExecutionStep`, not direct `click(x,y)` calls from strategy code.

## Safety rule

The strategy layer may request actions, but only the execution layer may convert them to gestures. If the observer reports `UNKNOWN`, missing HUD, black frame, permission loss, or repeated unverified actions, the loop must skip or pause.
