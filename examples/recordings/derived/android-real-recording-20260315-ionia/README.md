# ANDROID OCR REGRESSION BOUNDARIES

This document summarizes the current regression test boundaries for Android opening, augment, and shop stage OCR (as of 2026-03-19).

## Test Coverage

The following real-device crops (see file list below) are covered by regression tests:
- Opening/augment stage (2-1, 3-2)
- Main board stages (2-5, 5-2)
- Shop-open stages (5-1, tested via shop/overlay frames)

Unit and integration tests driven from `tests/backend/android_hud_recognition.test.ts` and `tests/backend/android_recognition_replay_cli.test.ts` validate stage, champion, and overlay OCR for each crop using current image variant pipeline.

## Passing Cases

- Opening/augment crops ("recording-opening-augment-2-1-stage-raw.png", "recording-augment-3-2-stage-raw.png"): OCR reliably extracts correct stage text (e.g., "2-1", "3-2").
- Main board crops ("recording-board-2-5-stage-raw.png", "recording-board-5-2-stage-raw.png"): OCR is robust and matches expected stage ("2-5", "5-2").
- Shop-open 5-1 crop ("recording-shop-5-1-stage-raw.png"): As of Mar 2026, this sample passes all regression and manual QA and is no longer a known unstable/failing case.
- Most variant overlays and shop slots pass stage and parsing reliably under normal and shaded/blurred conditions.

## Boundaries / Current Notes

- Shop-open overlays may visually challenge simple OCR, but all listed test crops (including 5-1) are now stably recognized.
- Future failures should be accompanied by cases and actual test/QA result updates here.

---
**Relevant fixture crops:**
- recording-opening-augment-2-1-stage-raw.png
- recording-opening-detail-1-4-stage-raw.png
- recording-augment-3-2-stage-raw.png
- recording-board-2-5-stage-raw.png
- recording-board-5-2-stage-raw.png
- recording-shop-5-1-stage-raw.png

For full fixture/execution state, see test logs and test scripts referenced above.
