# RTC Fuzz Findings Report - 2026-05-07

Generated: 2026-05-07 11:17 PDT / 2026-05-07T18:17:37Z.

Report base: `origin/trunk` at
`12a12af12a48b86223152498c688d7f87fbfae2f`
(`Content types: flush rewrite rules on rewrite-impacting changes (#78058)`,
committed 2026-05-07T17:00:38Z).

Local processing root:
`/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing`.

## Current Status

- Confirmed real bugs with artifacts pushed to the `danluu` remote: 8.
- Every confirmed real bug has an explanation branch and a separate `-pr`
  branch on `danluu`.
- Refreshed repro sweep against recent trunk plus the known-fixes branch:
  184 total repros, 71 passed, 113 failed.
- First-pass triage state: 36 summaries, 36 done markers, 77 historical failed
  markers.
- Repeated deep-analysis state: 688 completed deep summaries and 2822
  historical failed markers.
- Active deep pass: pass 165, seeded from `confirmed-real-candidates.tsv`
  after pass 164 drained to no remaining likely/unresolved candidates.
- Active workers: 8 `tmux` windows in `rtc-bug-deep-processing`, one for each
  confirmed real bug. As of generation time, pass 165 had 8 claimed signatures
  and no final pass-165 summaries/done/failed markers yet.
- Monitors: `rtc-worker-health:0` and `rtc-disk-cleanup:0` are running. Latest
  health samples show `deep_active=8`, `alive=8`, and disk still above the
  cleanup guard thresholds.

## Disk And Artifact State

The disk-space failure was handled before this report. Cleanup started with
about 249 MiB free on `/System/Volumes/Data` and ended with about 184 GiB free.
At report time the live monitor was still seeing about 179 GiB free while pass
165 was running.

Safe/reproducible artifacts removed:

- 797 `/private/tmp` fuzz/RTC scratch roots matching saved run patterns.
- 52 `deep-state/pass-*/work` scratch worktrees.
- 531 transient Playwright/blob report directories under `deep-state`.
- 3624 completed worker logs compressed; live monitor logs were left alone.
- 216 stale fuzz/e2e `.wp-env` directories.
- 5 duplicate non-current `node_modules` installs.

Preserved artifacts:

- Bug rollup, per-signature summaries, prompts, final videos, pushed branches,
  and original fuzz-run output trees.
- Current checkout dependencies:
  `/Users/danluu/dev/fuzz/gutenberg/node_modules`.
- Current stopped wp-env install:
  `/Users/danluu/.wp-env/wp-env-gutenberg-e0139f20`.
- Cleanup manifests and ledgers in `cleanup-20260507/`.

The cleanup guard now performs idle cleanup and conservative active-run cleanup,
and the dispatchers include disk-free checks before launching more work.

## Confirmed Real Bugs

### `07f8eb5c4218`

- Bug type:
  `rtc_top_level_block_move_duplicates_paragraph_and_drops_sibling_after_collaborative_structural_edits`.
- Latest completed deep summary: `deep-state/pass-114/07f8eb5c4218.summary.md`.
- Explanation:
  https://github.com/danluu/gutenberg/blob/try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218/docs/fuzz-bugs/07f8eb5c4218-rtc-top-level-block-move.md
- `-pr` branch:
  https://github.com/danluu/gutenberg/tree/try/rtc-top-level-block-move-duplicates-paragraph-and-drops-si-07f8eb5c4218-pr
- Video:
  `/Users/danluu/dev/fuzz/gutenberg-bug-07f8eb5c4218/artifacts/fuzz-bug-videos/rtc-top-level-block-move-07f8eb5c4218.mp4`.

### `440c86261e16`

- Bug type: `rtc-entity-normalization-save-loop`.
- Latest completed deep summary: `deep-state/pass-39/440c86261e16.summary.md`.
- Explanation:
  https://github.com/danluu/gutenberg/blob/try/rtc-entity-normalization-save-loop-440c86261e16/docs/fuzz-bugs/rtc-entity-normalization-save-loop-440c86261e16.md
- `-pr` branch:
  https://github.com/danluu/gutenberg/tree/try/rtc-entity-normalization-save-loop-440c86261e16-pr
- Video:
  `/Users/danluu/dev/fuzz/gutenberg-bug-440c86261e16/artifacts/fuzz-bug-videos/rtc-entity-normalization-save-loop-440c86261e16-pass39.mp4`.

### `4af28404874c`

- Original bug type:
  `rtc_sync_http_polling_oom_due_to_oversized_shared_rooms`.
- Current evidence: the original label is misleading; the reproduced bug is a
  deferred local-update race in the HTTP sync path.
- Latest completed deep summary: `deep-state/pass-36/4af28404874c.summary.md`.
- Explanation:
  https://github.com/danluu/gutenberg/blob/try/rtc-sync-http-polling-oom-due-to-oversized-shared-rooms-4af28404874c/docs/fuzz-bugs/4af28404874c-rtc-sync-http-polling-deferred-local-update-race.md
- `-pr` branch:
  https://github.com/danluu/gutenberg/tree/try/rtc-sync-http-polling-oom-due-to-oversized-shared-rooms-4af28404874c-pr
- Video:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-36/artifacts/4af28404874c-annotated.mp4`.

### `5ee0be2f9b7d`

- Bug type:
  `rtc_top_level_move_reconciliation_duplicates_adjacent_paragraph_and_drops_moved_paragraph_after_structural_edits`.
- Latest completed deep summary: `deep-state/pass-163/5ee0be2f9b7d.summary.md`.
- Explanation:
  https://github.com/danluu/gutenberg/blob/try/rtc-top-level-move-reconciliation-duplicates-adjacent-para-5ee0be2f9b7d/docs/fuzz-bugs/5ee0be2f9b7d-rtc-top-level-move-reconciliation.md
- `-pr` branch:
  https://github.com/danluu/gutenberg/tree/try/rtc-top-level-move-reconciliation-duplicates-adjacent-para-5ee0be2f9b7d-pr
- Video:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-79/video/5ee0be2f9b7d/rtc-top-level-move-reconciliation-pass79-verified-pass78-annotated.mp4`.

### `6f589c89600c`

- Bug type: `rtc-safe-sync-title-lost-after-reload`.
- Latest completed deep summary: `deep-state/pass-122/6f589c89600c.summary.md`.
- Explanation:
  https://github.com/danluu/gutenberg/blob/try/rtc-safe-sync-title-lost-after-reload-6f589c89600c/docs/fuzz-bugs/rtc-safe-sync-title-lost-after-reload-6f589c89600c.md
- `-pr` branch:
  https://github.com/danluu/gutenberg/tree/try/rtc-safe-sync-title-lost-after-reload-6f589c89600c-pr
- Video:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-77/6f589c89600c-pass77-annotated.mp4`.

### `7eff71786d0e`

- Bug type:
  `stale-local table-body row append after remote divergence drops the appended row`.
- Latest completed deep summary: `deep-state/pass-97/7eff71786d0e.summary.md`.
- Explanation:
  https://github.com/danluu/gutenberg/blob/try/stale-local-table-body-row-append-after-remote-divergence--7eff71786d0e/docs/fuzz-bugs/7eff71786d0e-stale-local-table-row-append.md
- `-pr` branch:
  https://github.com/danluu/gutenberg/tree/try/stale-local-table-body-row-append-after-remote-divergence--7eff71786d0e-pr
- Video:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-79/7eff71786d0e-pass79-annotated-stitch.mp4`.

### `da6c1f4bcecd`

- Bug type: `rtc_save_reload_persistence_corruption`.
- Latest completed deep summary: `deep-state/pass-162/da6c1f4bcecd.summary.md`.
- Explanation:
  https://github.com/danluu/gutenberg/blob/try/rtc-save-reload-persistence-corruption-da6c1f4bcecd/docs/fuzz-bugs/rtc-save-reload-persistence-corruption-da6c1f4bcecd.md
- `-pr` branch:
  https://github.com/danluu/gutenberg/tree/try/rtc-save-reload-persistence-corruption-da6c1f4bcecd-pr
- Video:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-79/da6c1f4bcecd-pass79-verified-existing-annotated.mp4`.

### `ec47d94c5251`

- Bug type:
  `rtc_top_level_paragraph_move_duplicates_and_drops_sibling_after_delete_plus_add_before`.
- Latest completed deep summary: `deep-state/pass-79/ec47d94c5251.summary.md`.
- Explanation:
  https://github.com/danluu/gutenberg/blob/try/rtc-top-level-paragraph-move-duplicates-and-drops-sibling--ec47d94c5251/docs/fuzz-bugs/ec47d94c5251-rtc-top-level-paragraph-move.md
- `-pr` branch:
  https://github.com/danluu/gutenberg/tree/try/rtc-top-level-paragraph-move-duplicates-and-drops-sibling--ec47d94c5251-pr
- Video:
  `/Users/danluu/dev/fuzz/gutenberg-rtc-known-fixes-refresh-20260505/fuzz-handoff/distinct-manifest-20260505/bug-processing/deep-state/pass-79/video/ec47d94c5251/ec47d94c5251-pass79-fresh-annotated.mp4`.

## Pass 165 Live Notes

Pass 165 is a deeper repeat over the eight confirmed-real signatures, not a new
first-pass sweep. The active worker windows are:

- `deep-p165-07f8eb5c4218`
- `deep-p165-440c86261e16`
- `deep-p165-4af28404874c`
- `deep-p165-5ee0be2f9b7d`
- `deep-p165-6f589c89600c`
- `deep-p165-7eff71786d0e`
- `deep-p165-da6c1f4bcecd`
- `deep-p165-ec47d94c5251`

The workers are currently doing a mix of known-fixes checks, focused unit
repros, Playwright repro setup, and dependency/environment repair caused by
cleaning duplicate dependency trees. These are not final findings until the
workers write pass-165 summaries.

## Remote Branch Verification

`git ls-remote --heads danluu` showed explanation and `-pr` branches for all
eight confirmed-real signatures at report generation time. This report itself
is intended to live on:

https://github.com/danluu/gutenberg/tree/try/rtc-fuzz-findings-report-20260507
