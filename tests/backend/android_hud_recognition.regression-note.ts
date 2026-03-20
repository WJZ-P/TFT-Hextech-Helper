/**
 * Regression coverage — Android OCR (opening, augment, shop, board stages)
 *
 * - Each test below asserts expected behavior on real-device crops from
 *   `examples/recordings/derived/android-real-recording-20260315-ionia/crops/`
 * - Shop-open 5-1 (`recording-shop-5-1-stage-raw.png`) has been stabilized as of Mar 2026, now passes all regression and manual QA consistently.
 * - All crop/fixture/synthetic paths and selection logic exercised here must be kept in sync with doc notes in OcrService.ts and RecognitionUtils.ts
 * - If adding new OCR/correction/selection logic or expanding fixture set:
 *     1. Add/annotate regression doc in core OCR files
 *     2. Update/expand tests here
 */
