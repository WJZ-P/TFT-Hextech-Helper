# Hermes Continuation Brief - TFT Android Automation

Last updated: 2026-05-25 23:58 -05:00

## Mission

Continue the TFT-Hextech-Helper-t Android automation work from the Codex Desktop thread named "改进商店英雄识别".

Target outcome:
- Train and debug the Android TFT helper in real matches.
- Stay in normal matchmaking while training. Never enter or auto-start ranked.
- Move toward fully automated OCR/vision/control until the helper can consistently reach top 4 before ranked use.

Architecture:
- Hermes is the orchestrator.
- Codex MCP is the coding/execution lane for source edits.
- Use MCP `codex`/`codex-reply` for code changes in `D:\Github\TFT-Hextech-Helper-t`.
- Do not make Codex the orchestrator.
- Important: historical Codex Desktop session ids below are for reading context only. Do not pass them to MCP `codex-reply`. `codex-reply` can only continue Codex threads that are still known by the current Codex MCP server process. If an MCP `codex` call times out, Hermes may still have created a persistent Codex rollout on disk, but a later/restarted MCP server may not know that thread for `codex-reply`.
- If MCP `codex-reply` returns `Session not found` for a real Codex rollout id, stop retrying `codex-reply`. Use the Codex CLI persisted-session path instead: `codex exec resume <codex-session-id> "<next prompt>"`. For example: `codex exec resume 019e633c-745e-7201-a231-87095628c84c "Continue from the latest failing tests. Do not start a new task. Summarize changed files and verification."`
- Use MCP `codex` for new bounded tasks. Use MCP `codex-reply` only immediately after a successful MCP `codex` call if Hermes has the exact live MCP thread id and the server has not timed out/restarted.

## Source Context

Primary Codex session:
- Codex thread name: "改进商店英雄识别"
- Codex session id: `019e4eaa-9649-7db1-9065-be01f2450443`
- Session file: `C:\Users\ASUS\.codex\sessions\2026\05\22\rollout-2026-05-22T02-51-07-019e4eaa-9649-7db1-9065-be01f2450443.jsonl`

Later related Codex session:
- Codex thread name: "调试并优化自动化助手"
- Codex session id: `019e607e-d0e8-7d43-bcd8-1668d694e8a1`
- Session file: `C:\Users\ASUS\.codex\sessions\2026\05\25\rollout-2026-05-25T13-56-29-019e607e-d0e8-7d43-bcd8-1668d694e8a1.jsonl`

Do not call MCP `codex-reply` with `019e4eaa-9649-7db1-9065-be01f2450443` or `019e607e-d0e8-7d43-bcd8-1668d694e8a1`. Those are historical Desktop rollout ids, not live MCP thread ids.

Current repo:
- `D:\Github\TFT-Hextech-Helper-t`
- Branch: `codex/android-auto-v1`
- Last commit: `dabe78f Add stress test reports for Android games`
- Working tree is dirty with many modified and untracked files. Do not reset or discard anything.

Windows command notes:
- Use `npm.cmd`, not bare `npm`, from PowerShell. Bare `npm` may resolve to `npm.ps1` and fail under the local execution policy.
- The Android project currently has no committed Gradle wrapper (`gradlew` / `gradlew.bat` is absent). Do not run `.\gradlew.bat`.
- For Android unit tests on this machine, use:
  `C:\Users\ASUS\AppData\Local\Gradle\gradle-8.10.2\bin\gradle.bat --no-daemon testDebugUnitTest --tests com.tfthextech.helper.automation.AndroidRulePolicyTest --tests com.tfthextech.helper.automation.AndroidAutomationCoordinatorTest --tests com.tfthextech.helper.vision.AndroidFrontendVisualDetectorTest`
- Fresh verification on 2026-05-26: that explicit Gradle command returned `BUILD SUCCESSFUL`; Android target test XML showed 167 tests, 0 failures, 0 errors.
- Fresh verification on 2026-05-26: `npm.cmd run typecheck` returned exit 0; targeted TS tests `node --import tsx --test tests/backend/android_window_classifier.test.ts tests/backend/android_foreground_progression.test.ts` returned 41 tests, 0 failures.

## What Has Already Been Improved

Important completed work from the Codex sessions:
- Android APK installed and live-tested repeatedly in BlueStacks.
- Normal matchmaking safety guard added after a ranked mis-entry.
- `requestedQueueMode`, `detectedQueueMode`, and verified `queueMode` were separated.
- `START_GAME`, `ACCEPT_QUEUE`, and mode selection should require verified normal where appropriate.
- Lobby mode parsing was split into a testable parser.
- Shop OCR was improved with name-strip crops, full-shop fallback, parser/normalizer changes, and S16 name additions.
- Overlay now exposes mode state such as `req/det/ok/title`.
- Live visibility policy prevents hiding the overlay when capture/accessibility/mode preconditions are missing.
- Result screen exit/rematch flow has been worked on.
- Gold/level OCR corrections were added for known misreads.
- Loot orb detection and repeated loot click cooldown were improved.
- ADB screenshot observation was added to `scripts/run-android-automation-loop.ts` for skipped foreground states.

## Critical User Preference

The user does not want blind synthetic stress testing when the goal is real training.

Correct approach:
- Use ADB screenshots and logs to observe the emulator state even if BlueStacks is minimized.
- Prefer the installed APK/helper and real TFT screen state.
- Use ADB primarily for observation: screenshots, focused app, UI tree, logs.
- Avoid ADB clicks/drags unless doing explicit recovery or setup. The helper should normally act through its own accessibility/control path.
- If the run is stuck, capture evidence first, classify the screen, then fix the APK/helper logic.

Wrong approach to avoid:
- Do not simply run `npm run android:stress` and call that training.
- Do not start a long loop without screenshot/log capture.
- Do not keep spinning if it is stuck in `CONFIRM_MODAL`, login, network dialog, no-capture-frame, or accessibility-disabled.

## Current Machine Snapshot

Checked at handoff time:
- `adb devices` shows `emulator-5554 device`.
- Focused Android app is TFT:
  `com.riotgames.league.teamfighttactics/com.riotgames.leagueoflegends.RiotNativeActivity`
- No active TFT project `android:auto` / `run-android-*` background process was found by command-line filter.
- Old log `reports\live-5h-vision-20260525-141126.err.log` shows a prior failure mode:
  `C:\Program Files\BlueStacks_nxt\HD-Adb.exe -s 127.0.0.1:5555 ... error: device not found`.
- Current generic Android SDK adb sees `emulator-5554`, so any ADB integration should detect the active device instead of hard-coding `127.0.0.1:5555`.

## Immediate Next Steps

1. Inspect current emulator state with ADB:
   - `adb devices`
   - `adb shell dumpsys window | Select-String -Pattern 'mCurrentFocus|mFocusedApp'`
   - `adb exec-out screencap -p > reports/hermes-current.png`
   - If needed: `adb shell uiautomator dump /sdcard/window.xml` then pull/read it.

2. Inspect helper/APK state before starting live automation:
   - Confirm MediaProjection capture is active.
   - Confirm accessibility service is enabled.
   - Confirm helper overlay/live status is not stale.
   - Confirm normal queue mode is requested and ranked is blocked.

3. If code changes are needed:
   - Use Codex MCP as coding lane.
   - Keep edits narrow.
   - Add/update focused tests first where practical.
   - Run targeted tests before building APK.
   - Build/install debug APK only after tests pass.

4. When running real training:
   - Use a bounded window first, not immediately five hours.
   - Start with 10-20 minutes of live observation with screenshots/logs.
   - Fix any clear blocker.
   - Then extend the run.
   - Track placements and failure modes.

## Required Safety Rules

- Do not enter ranked.
- Do not discard the dirty working tree.
- Do not delete screenshots/logs unless explicitly asked.
- Do not kill unrelated Node/Hermes/Codex processes. Filter process command lines by this repo path or `run-android-*`.
- Do not claim "training" unless real TFT/BlueStacks state was observed via ADB screenshot/log evidence.
- If capture/accessibility/login/network state blocks automation, report that blocker and collect a screenshot.

## Useful Commands

```powershell
cd D:\Github\TFT-Hextech-Helper-t
git status --short
adb devices
adb shell dumpsys window | Select-String -Pattern 'mCurrentFocus|mFocusedApp'
adb exec-out screencap -p > reports\hermes-current.png
npm.cmd run android:auto -- --dry-run --ticks 5 --interval-ms 1000 --snapshot-dir reports\hermes-live-snapshots
npm.cmd run android:auto -- --live --full-observe --ticks 60 --interval-ms 2000 --snapshot-dir reports\hermes-live-snapshots --snapshot-every-ticks 10
```
