# Android Foreground NA Capture Pack

This pack is the handoff-ready foreground material bundle built from the current repository screenshots.

## Current Real Screenshots

These files already exist under `current-real/` and can be used immediately for screenshot replay, classifier verification, and baseline review:

- `na_bluestacks_boot_01.png`
- `na_update_ready_01.png`
- `na_login_required_01.png`
- `na_unknown_01.png`
- `na_live_content_opening_augment_01.png`
- `na_live_content_shop_01.png`
- `na_live_content_board_01.png`

## Missing Required Real States

Drop the next real screenshots into these directories:

- `pending-real-captures/lobby/`
- `pending-real-captures/queue/`
- `pending-real-captures/accept-ready/`
- `pending-real-captures/in-game-transition/`

Recommended minimum per state:

- 3 screenshots per state
- first frame
- stable frame
- edge frame before/after click or transition

Keep all captures on the same emulator profile, resolution, and window chrome.

## Suggested File Names

- `na_lobby_01.png`
- `na_lobby_02.png`
- `na_lobby_03.png`
- `na_queue_01.png`
- `na_queue_02.png`
- `na_queue_03.png`
- `na_accept_ready_01.png`
- `na_accept_ready_02.png`
- `na_accept_ready_03.png`
- `na_in_game_transition_01.png`
- `na_in_game_transition_02.png`
- `na_in_game_transition_03.png`

## Useful Commands

Replay one real screenshot:

```powershell
npm run android:smoke -- --screenshot "examples/recordings/android-foreground-na-captures/current-real/na_update_ready_01.png"
```

Ingest new lobby captures after they are dropped in:

```powershell
node --import tsx scripts/ingest-android-foreground-captures.ts `
  --output-dir temp/android-na-lobby `
  --id android-na-lobby-draft `
  --label "安卓大厅真实草稿" `
  --description "从现有 capture pack 接入" `
  --state LOBBY `
  --screenshot "examples/recordings/android-foreground-na-captures/pending-real-captures/lobby/na_lobby_01.png" `
  --screenshot "examples/recordings/android-foreground-na-captures/pending-real-captures/lobby/na_lobby_02.png" `
  --screenshot "examples/recordings/android-foreground-na-captures/pending-real-captures/lobby/na_lobby_03.png"
```

Compare a real draft against the synthetic baseline:

```powershell
node --import tsx scripts/compare-android-foreground-fixtures.ts `
  --baseline "examples/android-foreground-replay/android-na-frontend-synthetic-flow.json" `
  --candidate "temp/android-na-lobby/android-na-lobby-draft.json"
```
