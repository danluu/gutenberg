# RTC Jetstream2 PR Status For Maintainers

Snapshot: `2026-06-10T18:23:05Z`

This page summarizes the Jetstream2 RTC branch set in maintainer-readable form.
It is derived from the live PR progress controller; the raw controller dump and
TSVs are linked at the end for audit.

## Short Version

There is a reviewable set of small public branches on `danluu/gutenberg`. The
large all-merge branch exists for integration and reproduction, not for normal
review.

Published here means the branch exists on the `danluu` remote and is being kept
under fuzz/validation. It does not mean a WordPress/Gutenberg pull request has
already been opened upstream.

Current blocker for filing/promotion is not branch publication. The controller
is holding promotion because the latest benchmark canary root
`run-20260610T160049Z` still has open forced rows
(`current_run_green=no`, `explicit_downscope=no`) and build-clean preflight is
required before ready/finalized publication.

## What This Stack Is About

This is an RTC correctness stack produced from the Jetstream2 fuzzing run. The
current public branches cover:

- HTTP room isolation and malformed save payload handling.
- Browser revision restore and save-response/base-record behavior.
- Core-data lock fairness and CRDT block rebase behavior.
- Stale-base append/delete handling.
- Table body/query-array and fallback-group move/insert/delete convergence.

The maintainer review question is whether each small branch is a reasonable
isolated fix with the right base and test shape. The all-merge branch answers a
different question: whether the current selected set behaves correctly when
combined.

## Branches To Use

Use the all-merge branch to reproduce the whole candidate stack:

- Full candidate stack:
  [`candidate/rtc-risk-reducing-pr07c-all-merged-20260525T183601Z`](https://github.com/danluu/gutenberg/tree/candidate/rtc-risk-reducing-pr07c-all-merged-20260525T183601Z)
  at `9617d576354444657e7278c0dd9abc5d4f05dcb9`.

The all-merge branch is large (`1049` files, `+68027/-9148` against
`origin/trunk` in the current controller manifest). It should be treated as an
integration target and final-behavior reproducer. The review path should be the
smaller branches below.

## Recommended Review Order

1. Early RTC/HTTP/save-manager correctness:
   PR02A, PR03B, PR06B-minimal, PR07B.
2. Core-data and CRDT ordering:
   PR09, PR10, PR11A, PR11B.
3. Table/fallback-group sequence:
   PR14, PR14B, then the on-PR14B PR15A/PR15B/PR15C branches.

The PR15 direct variants are intentionally not the review target. Use the
`*-on-pr14b` branches because the controller has already selected those as the
canonical published sequence.

## Reviewable Sub-PR Branches

| Area | Public branch | Head | Maintainer note |
| --- | --- | --- | --- |
| HTTP room isolation sidecar | [`danluu/rtc-pr-progress-rtc-pr02a-http-room-isolation-regression`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr02a-http-room-isolation-regression) | `9303a7715cf3` | Published after branch repair; keep validating against fuzz. |
| Browser revision restore / CRDT invalidation | [`danluu/rtc-pr-progress-rtc-pr03b-browser-revision-restore-crdt-invalidation`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr03b-browser-revision-restore-crdt-invalidation) | `cbab481fe760` | Published after branch repair; keep validating against fuzz. |
| Malformed save request payload, minimal fix | [`danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal) | `7b123e0ef233` | Canonical minimal PR06B; the full PR06B branch is superseded. |
| Save response manager base record | [`danluu/rtc-pr-progress-rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr07b-save-response-manager-base-record) | `c2592d5fd583` | Published after branch repair; keep validating against fuzz. |
| Store lock fairness | [`danluu/rtc-pr-progress-rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr09-store-lock-fairness) | `87b82b3be657` | Published after branch repair; keep validating against fuzz. |
| CRDT block rebase | [`danluu/rtc-pr-progress-rtc-pr10-crdt-block-rebase`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr10-crdt-block-rebase) | `ba7235bc8825` | Published after branch repair; keep validating against fuzz. |
| Stale-base record block append | [`danluu/rtc-pr-progress-rtc-pr11a-stale-base-record-block-append`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr11a-stale-base-record-block-append) | `78f6df2a91a2` | Published after branch repair; keep validating against fuzz. |
| Stale-base block delete | [`danluu/rtc-pr-progress-rtc-pr11b-stale-base-block-delete`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr11b-stale-base-block-delete) | `0cdcd5ffca89` | Published after branch repair; keep validating against fuzz. |
| Table body array merge | [`danluu/rtc-pr-progress-rtc-pr14-table-body-array-green`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr14-table-body-array-green) | `9b090fc7e660` | Review as part of the PR14/PR14B/PR15 sequence. |
| Table query-array local suffix append | [`danluu/rtc-pr-progress-rtc-pr14b-table-query-array-local-suffix-append`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr14b-table-query-array-local-suffix-append) | `c3d45173ed99` | Canonical bridge before the PR15 fallback-group tail. |
| Fallback-group move on PR14B | [`danluu/rtc-pr-progress-rtc-pr15a-fallback-group-move-green-on-pr14b`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr15a-fallback-group-move-green-on-pr14b) | `125b5d030d8c` | Canonical PR15A branch; use this instead of the direct variant. |
| Fallback-group insert-anchor on PR14B | [`danluu/rtc-pr-progress-rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b) | `acb367667da1` | Canonical PR15B branch; use this instead of the direct variant. |
| Fallback-group delete on PR14B | [`danluu/rtc-pr-progress-rtc-pr15c-fallback-group-delete-green-on-pr14b`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr15c-fallback-group-delete-green-on-pr14b) | `8decb9081f9f` | Canonical PR15C branch; use this instead of the direct variant. |

## Held Or Non-Review Targets

These are useful for understanding the controller state, but they should not be
used as the maintainer review path right now.

| Branch or family | Public link if available | Status | Why it is not the review target |
| --- | --- | --- | --- |
| Repaired PR07C head | [`repair/pr07c-exact-stack-build-20260525T004721Z`](https://github.com/danluu/gutenberg/tree/repair/pr07c-exact-stack-build-20260525T004721Z) and [`danluu/rtc-pr-progress-repair-pr07c-exact-stack-build-20260525T004721Z`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-repair-pr07c-exact-stack-build-20260525T004721Z) | Held by controller | Same head as the all-merge candidate; exact validation and current canary gates still apply. |
| Stale direct PR07C reload snapshots | [`danluu/rtc-pr-progress-rtc-pr07c-reload-record-snapshots`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr07c-reload-record-snapshots) | Superseded by repair | The direct branch lacks the build/type repair and is superseded by the repaired PR07C head. |
| PR15A/PR15B/PR15C direct variants | Internal `ready/rtc-pr15*` targets | Held by controller | The canonical on-PR14B variants are already published; reviewing direct variants would duplicate work and use the wrong base. |
| Full PR06B malformed-save branch | Internal `ready/rtc-pr06b-malformed-save-request-payload` target | Superseded | The minimal PR06B branch is the canonical review target. |
| Reload hydration, pre-save search/live-collapse, rich-text suffix corruption | No public review branch in this status set | Downscoped | The controller consumed explicit downscope evidence and suppresses generic relaunch until newer exact product evidence appears. |

## Why Filing Is Currently Gated

The controller has selected the branch set and has materialized the all-merge
candidate, but promotion is blocked by current validation policy:

- Current canary gate is open for
  `benchmark-canary/current-root@run-20260610T160049Z`.
- The controller requires direct `current_run_green=yes` or
  `explicit_downscope=yes` before publication decisions can close.
- Ready/finalized promotion now requires same-head build-clean preflight.
- Heavy browser PR validation is temporarily held because discovery reserve is
  marginal; cheap manifest/accounting/exact non-browser work is still allowed.

This is intentionally conservative: old retained product evidence and exact
stack green are not allowed to close a new current-root publication gate by
themselves.

## Validation Claims

The published sub-PR branches have controller evidence rows and are being kept
under fuzz validation. The raw evidence paths are in
[`raw-controller-status.md`](rtc-jetstream2-pr-progress-status-20260515/raw-controller-status.md)
and
[`current-pr-progress.tsv`](rtc-jetstream2-pr-progress-status-20260515/current-pr-progress.tsv).

This page does not claim upstream CI has passed, that WordPress/Gutenberg PRs
are filed, or that the all-merge candidate is ready to merge. The current
controller state explicitly says PR07C and the all-merge candidate still inherit
the current canary and build-preflight gates.

## What A Maintainer Should Review First

Start with the smaller published branches, not the all-merge branch. The
smallest low-risk review sequence is:

1. [`danluu/rtc-pr-progress-rtc-pr02a-http-room-isolation-regression`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr02a-http-room-isolation-regression)
2. [`danluu/rtc-pr-progress-rtc-pr03b-browser-revision-restore-crdt-invalidation`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr03b-browser-revision-restore-crdt-invalidation)
3. [`danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal)
4. [`danluu/rtc-pr-progress-rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr07b-save-response-manager-base-record)

After those, review the ordered CRDT/table tail:

1. PR09 store lock fairness.
2. PR10 CRDT block rebase.
3. PR11A and PR11B stale-base fixes.
4. PR14, PR14B, PR15A-on-PR14B, PR15B-on-PR14B, PR15C-on-PR14B.

Use the all-merge branch only when you want to reproduce the complete combined
state or compare the stack-level behavior.

## Raw Evidence And Machine-Readable State

- Raw controller status:
  [`raw-controller-status.md`](rtc-jetstream2-pr-progress-status-20260515/raw-controller-status.md)
- Current progress table:
  [`current-pr-progress.tsv`](rtc-jetstream2-pr-progress-status-20260515/current-pr-progress.tsv)
- Controller decisions:
  [`current-control-decisions.tsv`](rtc-jetstream2-pr-progress-status-20260515/current-control-decisions.tsv)
- Current push manifest:
  [`current-push-manifest.tsv`](rtc-jetstream2-pr-progress-status-20260515/current-push-manifest.tsv)
- Trend graphs:
  [`rtc-jetstream2-fuzz-trend-analysis-20260515.md`](https://github.com/danluu/gutenberg/blob/explain/rtc-jetstream2-fuzz-progress-20260515/docs/explanations/architecture/rtc-jetstream2-fuzz-trend-analysis-20260515.md)
