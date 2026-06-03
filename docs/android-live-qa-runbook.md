# Android Live QA Runbook

## Environment

- Use one fixed emulator profile and one fixed resolution for a test batch.
- Primary monitor is easiest, but secondary-monitor BlueStacks is supported. Do not force-move it during live QA unless calibration fails.
- Keep the emulator content unobstructed and in landscape mode.
- Start with Android client mode and NA region in app settings.
- If ADB `input tap` fails but ADB screenshot still works, the helper falls back to host-window mouse clicks against the resolved emulator content rect.
- If the game shows a network/account confirmation modal, fix the emulator network/account state first; automation will dismiss it at most twice and then stop.

## Commands

### 0. Standalone Android APK

Environment check:

```bash
npm run android:app:doctor
```

Build debug APK:

```bash
cd android-app
gradle :app:assembleDebug --no-daemon
```

Install to BlueStacks:

```bash
adb -s 127.0.0.1:5555 install -r android-app/app/build/outputs/apk/debug/app-debug.apk
```

Runtime permission sequence:

- Open `TFT Hextech Helper`.
- Grant screen capture when Android prompts.
- Enable the accessibility service.
- Allow display over other apps.
- After every APK reinstall, grant screen capture again. MediaProjection tokens do not survive reinstall.
- Main screen `Frame: missing` means screen capture is not active yet; press `1. Request screen capture`.
- Use `Start dry-run + open TFT` to start overlay, enable dry-run, and return to TFT in one step.
- In TFT, press `Start Dry` on the overlay only if dry-run is not already enabled.

Current pass condition:

- Overlay shows `dry-run`.
- In live match, HUD line updates with `stage`, `gold`, `lv`, and `shop`.
- If an equipment choice/tooltip panel exposes readable item text, overlay may show `items>0` and `item=<first item>`.
- Overlay `icons=<count> <names>` is the icon-only equipment diagnostic. `icons=0` means no equipment icon signature matched the current conservative crops.
- Result or scoreboard screens show no actions, preferably `skipped: android-result-screen`, with `shop=0` and `steps=0`.
- Do not press `Live` unless actively testing click execution.

Live execution safety currently implemented in the APK:

- After BUY / ROLL / LEVEL_UP, the coordinator waits for a verifying tick before issuing another action.
- BUY verifies by gold drop or shop signature change.
- ROLL verifies by gold drop of at least 2 or shop signature change.
- LEVEL_UP verifies by level, XP, or gold change.
- If verification times out, the coordinator pauses live mode instead of repeating clicks.

Known item-recognition boundary:

- Text OCR can read item names from choice or tooltip text.
- Icon-only recognition now has a tested signature/matcher path and is wired into `ObservedState.items` through conservative crops. Treat it as calibration-stage until real in-game item icon screenshots confirm the crop coordinates.

Offline item-icon crop diagnostics:

```bash
npm run android:app:items -- examples/recordings/smoke/android-app-icon-diagnostics-result-wait.png android-app/app/src/main/assets/tft-season-pack/catalog.json
```

Use this after saving any Android screenshot. The output lists each configured crop, its 8x8 signature, and the nearest catalog match if the distance is within threshold. If overlay shows `icons=0`, this command helps decide whether to adjust crop coordinates or regenerate template signatures.

If the fixed crops miss everything, scan the whole screenshot for candidate matches:

```bash
npm run android:app:items -- --scan examples/recordings/smoke/android-app-icon-diagnostics-result-wait.png android-app/app/src/main/assets/tft-season-pack/catalog.json
```

`--scan` is slower because it walks a coarse grid, but it is useful for finding approximate item-icon coordinates before editing `itemIconCrops`. Each match includes a normalized `crop` object that can be copied into the Kotlin crop list after manual review.
Each match also includes `kotlinCrop`, for example:

```kotlin
crop(frame, 0.262500f, 0.311111f, 0.021875f, 0.038889f)
```

During early calibration, loosen thresholds and cap output:

```bash
npm run android:app:items -- --scan --max-distance 12 --max-results 5 <screenshot> android-app/app/src/main/assets/tft-season-pack/catalog.json
```

To visually review scan candidates, write matched crops to disk:

```bash
npm run android:app:items -- --scan --max-distance 12 --max-results 5 --write-crops .cache/android-item-crops <screenshot> android-app/app/src/main/assets/tft-season-pack/catalog.json
```

Only promote a `kotlinCrop` into APK code after checking the generated PNG is a real item icon, not a UI decoration or result-screen artifact.

### 1. Window Diagnosis

```bash
node --import tsx scripts/diagnose-android-emulator-window.ts
```

Pass condition:
- A selectable BlueStacks/TFT window is found.
- The selected capture path is not black or invalid.

### 2. Foreground Smoke

```bash
npm run android:smoke -- --fixture examples/android-foreground-replay/android-na-frontend-real-flow.json
```

Pass condition:
- The replay reaches `LIVE_CONTENT`.
- `allExpectedMatched` is true.

Live frontend smoke against the already-open emulator:

```bash
npm run android:smoke -- --skip-launch --wait-seconds 30
```

Expected secondary-monitor behavior:
- `detectedWindow.left/top` may be outside the primary monitor bounds, including negative `top`.
- `WindowHelper` should report `resized=0` unless the emulator is smaller than the minimum content size or `TFT_ANDROID_FORCE_WINDOW_BOUNDS=1` is set.
- `foregroundTrace[].blocker` may say `ADB tap unavailable; used副屏窗口鼠标点击 (...)`; this is acceptable when ADB shell input is unavailable.

Expected network-modal behavior:
- `contentClassification.confirmModalVariant` is `NETWORK_ERROR`.
- `verificationGate.blockerReason` says manual emulator network/account recovery is required.
- Do not continue live execution until the modal stops reappearing.

### 3. Offline Automation Dry-Run

```bash
npm run android:auto -- --state examples/android-simulator/android-reroll-midgame.json --ticks 1 --dry-run
```

Pass condition:
- JSON output contains at least one planned action.
- No click execution occurs.

### 4. Live Automation Dry-Run

```bash
npm run android:auto -- --ticks 20 --interval-ms 1000 --dry-run
```

Pass condition:
- The emulator is observed repeatedly.
- UNKNOWN stage or missing HUD produces `SKIPPED`, not clicks.
- Valid states produce executable plans and action traces.

### 5. Live Automation Execution

```bash
npm run android:auto -- --ticks 20 --interval-ms 1000 --live
```

Pass condition:
- BUY / ROLL / LEVEL_UP actions include post-action verification.
- Repeated verification failures pause the same action signature.
- No login, payment, system, or non-game screen is clicked.

## Per-Game QA Record

Use this template after every manual run:

```json
{
  "date": "YYYY-MM-DD",
  "server": "NA",
  "emulator": "BlueStacks version / device profile",
  "resolution": "width x height",
  "mode": "dry-run | live",
  "durationMinutes": 0,
  "enteredGame": false,
  "stableTenMinutes": false,
  "actionsObserved": {
    "buy": 0,
    "roll": 0,
    "levelUp": 0,
    "move": 0,
    "equip": 0,
    "pickAugment": 0
  },
  "safetyIssues": [],
  "ocrFailures": [],
  "foregroundBlockers": [],
  "notes": ""
}
```

## MVP Acceptance

- One real Android emulator game reaches live content from frontend flow.
- The live automation loop runs for at least 10 minutes.
- It performs at least BUY, ROLL or LEVEL_UP once with trace output.
- It pauses instead of repeating an unverified action.
- It never clicks login, payment, system dialogs, or unknown black screens.
