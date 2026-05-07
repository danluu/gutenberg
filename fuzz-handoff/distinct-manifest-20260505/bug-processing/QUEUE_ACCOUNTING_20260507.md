# Queue Accounting - 2026-05-07

Status: the current eight-issue deep/likelihood loop is not full coverage of the
original handoff queue.

The original handoff file reported:

- 279 distinct likely-real bug groups in `likely-real-issues.jsonl`
- 184 runnable canonical repro specs
- 95 likely-real groups needing repro reconstruction
- 2704 supplemental analysis-only likely-real rows, representing 1990 distinct labels

What this machine processed:

- The refreshed-base sweep ran only the 184 runnable canonical repro specs.
- Refreshed sweep result: 71 passed, 113 failed.
- `run-bug-dispatcher.sh` queued only `result == "failed"` rows from
  `results-refresh-*/results.jsonl`.
- Therefore the 71 runnable rows that passed were not triaged or summarized.
  They were not proven false; they were only excluded by the failed-only queue.
- The 95 non-runnable reconstruction-needed groups were never queued by this
  dispatcher.

First-pass state:

- 113 failed refreshed signatures were claimed.
- 36 first-pass summaries exist.
- 77 first-pass workers exited with failure and no first-pass summary. The
  sampled logs show Codex/API websocket or DNS connection failures, not product
  classifications.
- All 77 first-pass-failed/no-summary signatures later appeared in at least one
  deep-pass summary.

Deep-pass narrowing:

- Pass 2 started with 83 candidates.
- Pass 39 had 14 candidates.
- Pass 40 had 11 candidates.
- Pass 79 had 6 candidates.
- Pass 80 had 5 candidates.
- Pass 121 had 3 candidates.
- Pass 160 had 2 candidates.
- Pass 164 drained to 0 candidates.

After the practical real-user-likelihood change, the loop was deliberately
reseeded from `confirmed-real-candidates.tsv`, which contains these eight
artifact-complete confirmed bugs:

- `07f8eb5c4218`
- `440c86261e16`
- `4af28404874c`
- `5ee0be2f9b7d`
- `6f589c89600c`
- `7eff71786d0e`
- `da6c1f4bcecd`
- `ec47d94c5251`

Accounting conclusion:

- 113 of 279 handoff signatures have at least one first-pass or deep-pass
  summary.
- 166 of 279 handoff signatures have no local summary:
  - 71 runnable signatures whose refreshed canonical repro passed
  - 95 non-runnable signatures needing repro reconstruction
- The current eight-issue loop should be described as repeated deeper analysis
  of confirmed artifact-complete bugs, not as evidence that all original
  likely-real handoff bugs were ruled out.

Immediate repair needed:

- Create a second queue for the 71 passed runnable signatures to decide whether
  each is fixed by known fixes, non-reproducing due harness/oracle issues, a
  duplicate, or still real with a better repro.
- Create a reconstruction queue for the 95 non-runnable likely-real groups.
- Keep the current eight confirmed-real likelihood loop running separately.

Repair started:

- Created `coverage-queue.tsv` with 166 rows:
  - 71 `passed-runnable`
  - 95 `nonrunnable`
- Added `run-coverage-dispatcher.sh` and `run-coverage-worker.sh`.
- Started tmux session `rtc-handoff-coverage` with
  `RTC_COVERAGE_MAX_PARALLEL=8`.
- Updated `run-worker-health-monitor.sh` so the monitor keeps
  `rtc-handoff-coverage` alive and logs `coverage_active`,
  `coverage_queue`, `coverage_done`, and `coverage_failed`.
