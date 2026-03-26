Android Stability Limits (Canonical)

Last updated: 2026-03-25

Scope
- Canonical summary of Android-specific stability limits, boundaries, and recommended runtime configuration for the OCR / recognition pipeline used by TFT Hextech Helper.
- Intended audience: engineers running stress tests, QA, and operators tuning emulator/live sessions.

Source of truth
- Worker lifecycle constants: src-backend/tft/recognition/OcrService.ts (WORKER_RECYCLE_CONFIG)
- Stage confirmation voting: src-backend/TftOperator.ts (STAGE_CONFIRM_THRESHOLD, confirmStageWithHistory)

Known stable ranges (explicit)
- Tesseract worker recycling
  - MAX_RECOGNITIONS = 500 recognitions per worker
  - MAX_LIFETIME_MS = 30 * 60 * 1000 (30 minutes)
  - MAX_IDLE_MS = 10 * 60 * 1000 (10 minutes)
  - Practical guidance: schedule worker prewarm / graceful recycle at session boundaries (every ~25 minutes) when running 1+ hour sessions to reduce peak memory jitter.

- Stage confirmation / majority voting
  - STAGE_CONFIRM_THRESHOLD = 4 (sliding window length)
  - Confirmation rule used: require highest-vote candidate to have >= 2 votes and >= 50% of window (i.e. at least 2 of 4)
  - Practical guidance: the operator waits for at least 4 samples before confirming; transient single-frame misreads are ignored.

- OCR accuracy (observed)
  - Typical HUD / numeric OCR accuracy on recommended emulator profiles: ~95% under clean screenshots and accurate scaling.
  - Observed variance: allow ±3–5 percentage points depending on emulator, font smoothing and lighting.

Known boundaries and failure regions
- Max session length before worker recycling
  - Workers are auto-recycled by three triggers: recognition count >= 500, lifetime >= 30 minutes, or idle >= 10 minutes.
  - Long-run sessions (>= 1 hour) should expect multiple recycle events; validate that recycle causes no visible pause in critical flows by prewarming replacements.

- Network sensitivity for stage confirmation
  - Stage confirmation is purely local (OCR + in-process voting). However, higher-latency log shipping / metrics ingestion can create delayed observability; do not rely on remote metrics for live-stage decisions.

- Memory / handle accumulation points
  - Known hotspots: Tesseract.js WASM module and template matching OpenCV Mats. MemoryMonitor.sample() is used throughout to detect growth.
  - Failure mode: sustained RSS growth > 20% over 5 rounds (see docs/android-stability-limits.md Table: Growth thresholds) indicates a leak and should trigger worker recycling / process restart.

Recommended configurations (practical)
- Emulator / display
  - Base resolution used by the pipeline: 1024×768 (4:3). Use this as canonical mapping for region percentages.
  - Recommended emulator window sizes: use resolutions that preserve the 4:3 mapping (1024×768 primary). 16:9 can work but requires careful scaling testing.
  - Keep emulator window unobscured and in foreground. Use the `android-foreground-*` fixtures to validate.

- Memory & CPU
  - Minimum host RAM: 8 GB recommended for stable multi-process runs; 16 GB for repeatable stress tests.
  - Worker prewarm: call OcrService.prewarmWorkers() at session start to avoid first-use latency.
  - If you observe RSS peaks > 200–250MB, enable more aggressive recycling and collect heap snapshots for offline analysis.

- Network
  - Live mode requires a stable network for telemetry and optional remote control. Stage confirmation itself is local; however, unstable network can increase log flush latency and complicate debugging.

- OCR / engine
  - For HUD digits and short numeric reads use: tessedit_char_whitelist = "0123456789/" and PSM = SPARSE_TEXT
  - For game stage reads use: tessedit_char_whitelist = "0123456789-" and PSM = SINGLE_LINE
  - For Chinese champion names use: chi_sim with an extracted season-specific whitelist (OcrService builds this from getChessDataForMode())
  - Optimized mode: OcrService.setOptimizedMode(true) reduces retries and uses OEM=1 (LSTM_ONLY) for lower CPU/latency at the cost of potential accuracy regressions. Test before enabling in production.

Operational checks and alerts
- Sample memory after each recognition via memoryMonitor.sample(). Alert when per-round growth > 15MB or total growth over 5 rounds > 75MB.
- Monitor OcrService worker health (ocrService.getWorkerHealth(type)) to detect workers nearing MAX_RECOGNITIONS or MAX_LIFETIME_MS.
- On worker recycle events, check logs for pre/post RSS deltas. If post-RSS is not lower than pre-RSS by expected margin, escalate.

Quick references (code)
- WORKER_RECYCLE_CONFIG (OcrService): MAX_RECOGNITIONS=500, MAX_LIFETIME_MS=30min, MAX_IDLE_MS=10min
- STAGE_CONFIRM_THRESHOLD (TftOperator): 4; confirmStageWithHistory requires maxVotes >= Math.max(2, ceil(4/2)) and >=50% of the window

Notes / caveats
- This file is documentation-only and should not be used as the runtime configuration source of truth; the code constants in OcrService.ts and TftOperator.ts are authoritative.
- If you change worker-recycle behavior in code, update this document accordingly.

Appendix: Short checklist for running a stability session
1) Prewarm OCR workers
2) Start stress harness (scripts/run-android-stress-test.ts) for 5+ rounds
3) Watch memoryMonitor samples and OcrService logs for recycle events
4) Validate stage majority voting via logs: `[TftOperator] 阶段确认成功 (投票X/4): Y-Y`
