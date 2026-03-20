/**
 * ---
 * ANDROID OCR REGRESSION — TEST BOUNDARIES & COVERAGE
 *
 * This service underpins all OCR flows for Android game-stage, augment, shop, and HUD text recognition.
 *
 * ## Automated Regression Scope
 * - Automated tests in `tests/backend/android_hud_recognition.test.ts` assert recognition of real-device crops for:
 *   - Opening detail (e.g., `recording-opening-detail-1-4-stage-raw.png`)
 *   - Augment selection (e.g., `recording-augment-3-2-stage-raw.png`)
 *   - Board/Shop crops (e.g., `recording-board-2-5-stage-raw.png`, `recording-shop-5-1-stage-raw.png`)
 * - All main stage types (EARLY_PVE, AUGMENT, PVP) included in fixture set.
 * - The regression pipeline checks extracted text & type against expected values for each crop.
 *
 * ## Current Boundaries (Mar 2026)
 * - As of Mar 2026, all provided fixture crops, including shop-open 5-1, pass both text & type assertions and manual QA.
 * - The 5-1 shop-open crop is now stably recognized; if new issues emerge, update regression and doc notes immediately.
 *
 * ## Manual QA & Workflow Guidance
 * - Manual QA must be performed on new variants outside fixture scope.
 * - Use results from regression as source of truth.
 * - If adding/changing OCR/correction logic:
 *   - Update both this docblock and the test to clearly record boundaries and actual QA/output.
 *
 * ## References
 * - See `tests/backend/android_hud_recognition.test.ts`, fixtures in `examples/recordings/derived/android-real-recording-20260315-ionia/crops/`, and OCR normalization helpers in `RecognitionUtils.ts`.
 *
 * ---
 */
