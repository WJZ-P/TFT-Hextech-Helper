# Android Foreground Next Commands

## Current Pack

Use the curated pack at:

- `examples/recordings/android-foreground-na-captures/`

Current real screenshots are already normalized under:

- `examples/recordings/android-foreground-na-captures/current-real/`

Next real screenshots should be dropped into:

- `examples/recordings/android-foreground-na-captures/pending-real-captures/lobby/`
- `examples/recordings/android-foreground-na-captures/pending-real-captures/queue/`
- `examples/recordings/android-foreground-na-captures/pending-real-captures/accept-ready/`
- `examples/recordings/android-foreground-na-captures/pending-real-captures/in-game-transition/`

## Suggested Agent Instruction

After reading `docs/android-foreground-status.md`, continue from the current pack instead of rebuilding paths by hand.

1. Treat `examples/recordings/android-foreground-na-captures/current-real/` as the canonical verified-real screenshot bundle already present in the repo.
2. As soon as new screenshots appear under `pending-real-captures/`, ingest them into `REAL_CAPTURE_DRAFT`.
3. Replace synthetic placeholder coverage for `LOBBY`, `QUEUE`, `ACCEPT_READY`, and `IN_GAME_TRANSITION` in that order once real drafts exist.
4. For each state replacement, update anchors, action points, replay expectations, and smoke validation together.
5. Keep reporting which states remain `SYNTHETIC_PLACEHOLDER`, which are `REAL_CAPTURE_DRAFT`, and which become `VERIFIED_REAL`.

## Ready-To-Run Commands

Replay the current real frontend screenshots:

```powershell
npm run android:smoke -- `
  --screenshot "examples/recordings/android-foreground-na-captures/current-real/na_bluestacks_boot_01.png" `
  --screenshot "examples/recordings/android-foreground-na-captures/current-real/na_update_ready_01.png" `
  --screenshot "examples/recordings/android-foreground-na-captures/current-real/na_login_required_01.png"
```

Replay current verified live content:

```powershell
npm run android:smoke -- `
  --screenshot "examples/recordings/android-foreground-na-captures/current-real/na_live_content_opening_augment_01.png" `
  --screenshot "examples/recordings/android-foreground-na-captures/current-real/na_live_content_shop_01.png" `
  --screenshot "examples/recordings/android-foreground-na-captures/current-real/na_live_content_board_01.png"
```

Ingest new accept-ready captures once present:

```powershell
node --import tsx scripts/ingest-android-foreground-captures.ts `
  --output-dir temp/android-na-accept-ready `
  --id android-na-accept-ready-draft `
  --label "安卓 ready-check 真实草稿" `
  --description "从 curated capture pack 接入 accept-ready 截图" `
  --state ACCEPT_READY `
  --screenshot "examples/recordings/android-foreground-na-captures/pending-real-captures/accept-ready/na_accept_ready_01.png" `
  --screenshot "examples/recordings/android-foreground-na-captures/pending-real-captures/accept-ready/na_accept_ready_02.png" `
  --screenshot "examples/recordings/android-foreground-na-captures/pending-real-captures/accept-ready/na_accept_ready_03.png"
```

Diff the new accept-ready draft against the current synthetic baseline:

```powershell
node --import tsx scripts/compare-android-foreground-fixtures.ts `
  --baseline "examples/android-foreground-replay/android-na-frontend-synthetic-flow.json" `
  --candidate "temp/android-na-accept-ready/android-na-accept-ready-draft.json"
```
