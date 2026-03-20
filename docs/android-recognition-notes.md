# Android Recognition Notes

## Current False-End Root Cause

The most common false-end pattern was not a true emulator exit. It was:

1. stage OCR temporarily returned `UNKNOWN`
2. the top bar shifted because of opening/detail/shop/augment UI variants
3. `GameRunningState` kept incrementing the Android unknown-stage counter
4. after enough consecutive misses, runtime treated the match as ended

## Current Mitigation

- widen Android stage OCR variants for brighter/higher-contrast top bars
- add replayable real-sample stage fixtures for:
  - opening PVE combat (`1-1`) — `examples/android-recognition-replay/android-s16-stage-1-1-combat.json`
  - opening shop-closed (`1-2`) — `examples/android-recognition-replay/android-s16-stage-1-2-shop-closed.json`
  - normal PVP shop-open (`2-1`) — `examples/android-recognition-replay/android-s16-stage-2-1-normal-shop-open.json`
  - shop-open stage strip (`5-1`) — via `android-real-recording-20260315-ionia` recording-derived crops
  - topbar augment variant (`3-2`) — via `android-real-recording-20260315-ionia` recording-derived crops
- during Android runtime, do not count an `UNKNOWN` stage toward end detection when level/gold HUD is still readable

## Boundary

- OCR correction remains text normalization only
- canonical item aliases remain in `TftNameNormalizer`
- English alias support for recognition: champion IDs resolved via `resolveChampionAlias` (e.g. `Ekko` → `艾克` via `TFT16_Ekko`), equipment via `normalizeEquipmentName` (e.g. `bfsword` → `暴风之剑`)
- false-end mitigation stays incremental inside runtime checks, not a state-machine rewrite
