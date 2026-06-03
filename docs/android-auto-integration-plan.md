# Android Automation Integration Notes

## Branch Decision

- Use `origin/main` as the clean integration baseline for future PRs.
- Use `wave/multi-card-wave-2` only as a feature source.
- Do not use local `feat--Implement-PC-Logic-Adapter-and-Decision-Engine` as a base; it is stale.

## Keep From `wave/multi-card-wave-2`

These are the minimum source/test groups worth migrating into a clean integration PR:

- Android foreground flow: `AndroidWindowClassifier`, `AndroidForegroundProtocol`, `AndroidForegroundProgression`, `run-android-live-smoke`.
- Android runtime adapter: `AndroidEmulatorAdapter`, `AndroidActionPlanner`, `AndroidUnknownStageGuard`, `GameLoadingState`, `GameRunningState`.
- Android live/OCR replay tests and compact fixtures under `tests/backend/` and `examples/android-foreground-replay/`.
- PC decision engine fixtures and tests under `examples/pc-logic/`, `RuleBasedDecisionEngine`, and `pc_logic_cli.test.ts`.
- Data/resource fixes required by current renderer behavior, especially local season-pack asset resolution.
- This loop implementation: `AndroidAutomationLoop` and its backend tests.

## Drop Or Keep Local Only

These should not be committed into the clean integration PR unless explicitly curated:

- `.cache/`, `.sisyphus/`, `reports/`, `tmp/`.
- Full Android screen recordings (`examples/recordings/*.mp4`).
- Generated recording frame/crop dumps unless selected as compact regression fixtures.
- OCR benchmark output JSON/TXT files.
- Generated `public/resources/season-packs/**/asset-map.json` and `metadata.json`.
- Experimental OCR scripts that are not used by npm scripts or tests.

## Current Gate

- `npm run typecheck` must pass.
- `npm run test:unit` must pass before merge.
- `npm run android:smoke -- --fixture examples/android-foreground-replay/android-na-frontend-real-flow.json` must pass for Android foreground regression.

