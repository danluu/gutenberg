# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T05:48:01Z`

Trigger event:
`pr-split-2026-05-19T05-47-08Z-20260519T053603Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-19T05-47-08Z-20260519T053603Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The split shape is settled for now, but GitHub filing, rebuilt full-stack
validation, and broad final-stack fuzzing remain blocked by seed `1020002`,
unresolved `RLH-A` ownership, and the unfinished Parallel Progress Gate
controller patch. The current split-persona synthesis,
`pr-split-20260519T053603Z-synthesis.md`, says all six nonzero review reports
agree that the Cycle428/Cycle430/Cycle432 replacement split is still the right
current shape. It records the same ready local branch set: `35` fresh non-base
`044015Z` rows in `latest-local-publish-manifest.tsv`, backed by the Cycle428
audit with `36` ready rows including `BASE`, `0` blocked rows, and `0`
already-published rows. Treat that as local publication and audit evidence
only; it is not GitHub filing, CI, upstream rebase, final-stack validation, or
a reason to ignore missing verified branch-link audit rows.

The same synthesis keeps the lower-boundary classification from
`2026-05-19T04:35:30Z`: `ENTITY-SERIALIZATION-1000009` and
`PERSISTENCE-PARITY-6000007` are `base-or-harness-pre-stack`, not `PR02`,
`PR05`, `PR07`, `PR17`, `PR18`, or `PR18x` product ownership.

Current maintainer-facing split hypothesis:

```text
Pre-stack/base-or-harness queues:
  ENTITY-SERIALIZATION-1000009
  PERSISTENCE-PARITY-6000007

Main ready lane:
  PR01 -> PR02 -> PR03 -> PR04 -> PR05A -> PR05B -> PR05C
  -> clean PR05D -> PR06A -> PR06B -> PR06C -> PR06D
  + PR02A and PR06E sidecars

CRDT/data-loss lane:
  PR09 -> PR10
  -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
  -> PR12A -> PR12B -> PR12C
  -> local PR13A -> local PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
  -> PR14 -> PR14B -> PR15A -> PR15B -> PR15C

Harness-only sidecar:
  HARNESS-WS-CONFIG-022004

Non-fileable or evidence-only:
  PR05E
  PR07 owner/raw reload-hydration arms
  stale PR15D
  PR17 / PR18 / PR18x
  seed 1020002 repair/reclassification
  fallback/PR15-tailed PR05D manifests
  raw deferred search/rich-text/malformed-save/HTTP-room-isolation evidence
```

Do not file grouped aggregate rows or stale/raw branches just because they
exist locally. Specifically keep raw `PR07D`, raw reload-hydration heads,
raw `003407`, raw `012938`, raw `020456`, stale `PR15D`, `PR17`, `PR18`,
`PR18x`, fallback/PR15-tailed `PR05D` manifests, and
`fix/rtc-fallback-group-delete-stale-local` / `d06e3528cbd` out of product PR
claims.

For PR13 content links, use only the repaired audited PR13A/PR13B/PR13C review
refs listed below. The `PR13B0`-`PR13B3` names describe the Cycle428 local
manifest shape; they do not yet have separate verified branch-link audit rows.

Seed `1020002` still blocks final-stack fuzzing, rebuilt stack-wide
validation, GitHub filing, and its own repair/reclassification. It did not
block the completed post-boundary manifest audit and must not block strict
owner comparisons, reload-hydration clean-head replay, branch-link audits,
deferred downscope, or control-plane repair.

The latest Cycle432 status check found both active follow-ups incomplete.
`RLH-A` reload-hydration owner proof is still blocked: the runtime setup/replay
job has no `report.md`, `owner-matrix.tsv`, or `classification.tsv` yet. The
controller progress-gate patch has `test-results.tsv`, but still has no
`report.md`, and `T002` fails because it expected `progress_bounded_job` and got
`progress_loop_repair`.

## Branch And Ref Status

Remote status was collected at `2026-05-19T05:47:55Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

It still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR06, PR06E, PR07, PR08, PR15, fallback-group evidence,
and final branch claims unless it is deliberately copied into a clean evidence
worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That checkout is dirty with modified product/test files and many untracked
fuzz, analysis, and documentation artifacts. It is active validation
infrastructure, not the final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-19T05:48:01Z` from fetched
`danluu` refs. A row marked `verified-content` means the branch exists on
`danluu` and has a non-empty audited diff against the listed base. It does not
prove final publication shape, owner evidence, CI, upstream rebase, or filing
readiness.

Use only these repaired audited PR13 review refs for PR13 content:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link these stale or misordered PR13 refs as current PR content:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

Supporting provenance base:
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
exists only so the repaired PR13A compare has the correct source base.

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`. Rows with
no verified branch link are not file-ready.

### Pre-Stack Or Harness Queues

These are not maintainer-facing product PRs yet.

| Queue | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| ENTITY-SERIALIZATION-1000009 | Seed `1000009` lower-boundary failure | No verified branch link yet | classified `base-or-harness-pre-stack`; remove from PR02/PR05/PR07/PR18x ownership unless a newer row-bearing report contradicts this |
| PERSISTENCE-PARITY-6000007 | Seed `6000007` lower-boundary/reload-persistence failure | No verified branch link yet | classified `base-or-harness-pre-stack`; raw reload-hydration branches remain non-fileable evidence |

### Main Ready Lane

| PR | Scope | Audit branch link | Files / diff | Current status |
| --- | --- | --- | --- | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 files, +181 / -19 | verified content; Cycle428 local manifest audit complete; GitHub filing still blocked |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 files, +57 / -5 | verified content; Cycle428 local manifest audit complete; GitHub filing still blocked |
| PR 2A | HTTP room-isolation sidecar | No verified branch link yet | TBD | keep as sidecar only after exact pushed/audited ref exists |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 files, +58 / -5 | verified content; released by Cycle428 pre-stack classification and local manifest audit |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 files, +160 / -1 | verified content; Cycle428 local manifest audit complete; GitHub filing still blocked |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | active split row in Cycle428 manifest; aggregate PR5 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | active split row in Cycle428 manifest; do not insert PR05E from stale lower-boundary prose |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | active split row in Cycle428 manifest |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | active split row in Cycle428 manifest; reject fallback/PR15-tailed PR05D manifests |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | active split row in Cycle428 manifest; do not confuse with the older persisted-empty-content PR6A audit row |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | active split row in Cycle428 manifest; progress branch is evidence only |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | active split row in Cycle428 manifest |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | active split row in Cycle428 manifest; PR09 and PR06E ancestry still need GitHub branch-link proof before filing |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | sidecar must hang from PR06D, not PR07 |
| HARNESS-WS-CONFIG-022004 | WebSocket harness configuration sidecar | No verified branch link yet | TBD | harness-only; not a product fix and not final-stack validation |

### CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files / diff | Current status |
| --- | --- | --- | --- | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 files, +185 / -2 | verified content; Cycle428 local manifest audit complete; GitHub filing still blocked |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 files, +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | active split row; grouped PR11 is aggregate prior art only |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | active split row |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | active split row |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | active split row |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | active split row |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | active split row; grouped PR12 is aggregate prior art only |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | active split row |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | active split row |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 files, +1151 / -25 | repaired verified content; use this audited ref for PR13A |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 files, +1672 / -4 | repaired verified content; use this audited ref for PR13B unless a later audit publishes PR13B0-B3 links |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 files, +345 / -51 | repaired verified content; use this audited ref for PR13C unless a later audit publishes PR13B0-B3 links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 files, +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | required before active PR15A-C; needs final-PR14B materialization/audit |
| PR 15A | Fallback-group move green on PR14B | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 files, +123 / -4 | verified component content; filing still waits on exact publication links, owner gates, and final validation |
| PR 15B | Fallback-group insert-anchor green on PR14B | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 files, +197 / -4 | verified component content; filing still waits on exact publication links, owner gates, and final validation |
| PR 15C | Fallback-group delete green on PR14B | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 files, +161 / -4 | canonical endpoint; Cycle428 local manifest audit complete; final-stack gates remain |

### Verified Prior Art, Not Active Proposed Rows

These rows have verified audit links, but they are not the exact active
micro-split PR rows unless the status says so.

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 6B progress | Malformed save request payload minimal branch | [`danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal) | verified progress branch; evidence only, not a substitute for PR06A-D/PR06E placement proof |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07 owner fork |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07 owner fork |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |

## Deferred Or Evidence-Only Work

These rows must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified active refs | PR02A, PR05A-D, PR06A-D, PR06E, PR11A-E, PR12A-C, PR14B, exact refreshed stack refs, `HARNESS-WS-CONFIG-022004` | active rows with no branch-link audit entry correctly say `No verified branch link yet`; Cycle428 `044015Z` local manifest audit has `36` ready rows including `BASE`, and the latest synthesis records `35` fresh non-base `044015Z` rows in `latest-local-publish-manifest.tsv`, but neither fact is a verified GitHub branch-link audit for these micro rows | Publish/fetch/audit explicit GitHub refs for every active row that still lacks a verified branch link |
| ENTITY-SERIALIZATION-1000009 | seed `1000009`, lower-boundary rows | latest persona consensus says completed lower-boundary evidence classifies this as `base-or-harness-pre-stack`, not a PR02/PR05/PR07/PR18x product owner | Keep out of product PR split unless a newer row-bearing report contradicts the classification |
| PERSISTENCE-PARITY-6000007 / reload hydration | seed `6000007`, clean reload-hydration heads `5edcd4acdf6` / `079387bd18b2`, PR07 controls | latest persona consensus classifies the main signal as `base-or-harness-pre-stack`; raw reload branches remain non-fileable; the Cycle432 runtime setup/replay still lacks `report.md`, `owner-matrix.tsv`, and `classification.tsv` | Finish or rerun exactly one bounded clean-head replay for seeds `6000007` and `966001`; do not publish raw old-base branches |
| Seed `1020002` WebSocket marker divergence | final-stack repair/reclassification lane | blocks final-stack fuzzing, filing, rebuilt validation, and its own repair/reclassification only | Repair or explicitly reclassify before final-stack validation and filing |
| PR07 runtime / owner gate | PR07A/B arms and raw PR07D variants | non-fileable owner-comparison fork | Require row-bearing owner matrices with first-divergence evidence, current endpoint controls, clean refs, and branch audit before promotion |
| Strict revision-restore signal | `117126135e5e`, seed `5400020`, PR03, PR05B/C/D, PR14, current PR15C, PR07B/PR07C arms | held in parser/rich-text/entity territory after PR05B/PR05C/clean PR05D comparison; does not justify PR18x | Do not name PR18x unless a newer row-bearing owner matrix moves first durable failure out of this held lane |
| HTTP persistence owner signal | strict `c5c009f618b2`, seed `6000034` | owner-comparison target only | Launch/consume bounded owner comparison before assigning a product PR |
| PR15D endpoint/control | stale Cycle324/Cycle325/Cycle376 PR15D rows and later repaired endpoint manifests | blocked/control-only; current endpoint remains PR15C | Accept PR15D only with fresh current-base head/bundle/manifest proof after PR15C |
| Raw deferred manifests | raw `003407`, raw `020456`, raw `024016`, fallback/PR15-tail bases, raw `PR07D` | invalid PR progress; wrong/stale base or missing same-cycle allowlisted base/head/bundle/manifest agreement | Keep as no-progress unless a new audit proves clean allowlisted base, head/bundle/manifest agreement, and ownership/non-coverage |
| PR05E and rich-text/search reductions | PR05E text, search/live-collapse, rich-text suffix, parser/linebreak candidates | dropped or held; latest lower-boundary classification does not justify PR05E | Compare against lower controls and clean split heads before promotion |
| Duplicate/noise producer control-plane | no-product `pre_action_bootstrap_stall`, supervisor seed-drain recovery, novelty bootstrap/admission | latest `duplicate-noise-20260519T052256Z-synthesis.md` keeps the leak producer-side: below-threshold zero-product startup seed drains can still turn into group-level `paused-startup-stall`; the earlier `045255Z` supervisor patch passed syntax/gate checks but does not close this consensus follow-up by itself | Patch the narrow supervisor seed-drain path first, then add a current-first novelty policy pass only if active duplicate/noise producers still refill |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T05:47:55Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T052537Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The latest raw novelty monitor status was written at
`2026-05-19T05:47:49.032Z` for
`run-20260519T052537Z`. It is startup-only:

```text
status: monitor started; full coverage pass pending
observed roots: 632
previous records loaded: 92800
supervisor groups file: 0
active run dirs: 0
health: startup status only; full novelty pass has not completed yet
```

Interpretation:

- Do not claim final-stack cleanliness. The newest novelty output is a startup
  heartbeat for active fuzz infrastructure, not validation of the accepted final
  PR stack.
- Because the raw novelty pass is pending, use the trend packet only as the
  latest completed aggregate evidence, not as a fresh current-run pass for the
  new `052537Z` root.
- Current fuzz health does not clear PR filing, exact branch-link gaps,
  PR07 owner replay, strict owner replay, `PERSISTENCE-PARITY-6000007`
  clean-head replay, seed `1020002`, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T05:40:40Z`:

```text
monitor passes: 2322
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-19T04:53:01Z
coverage files: 272 -> 56184
coverage files delta: 55912
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3404
summary startup failures last: 0
quality issues last: 0
memory free: 413.8 GB
load averages: 81.51 / 75.89 / 74.14 on 64 cores
enabled group current: novelty-ws-permissions-auth-locks
latest fuzz level mix:
  browser-e2e=28 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6120441
browser-e2e likely-real findings: 789 over 2664.1 runner-hours
```

Largest unmet goals remain save/reload and real-user depth:

```text
reload-post-action: 1183/2000
title-save-reload: 636/1000
real-user-editing success: 652/1000
body-save-reload: 695/1000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. CPU/load are high enough that new fuzz work should stay
bounded and oracle-specific rather than increasing broad browser concurrency.

## Status-Persona Analysis

The current split-persona synthesis, `pr-split-20260519T053603Z-synthesis.md`,
supersedes the older `052241Z`, `051407Z`, `045950Z`, `045031Z`, `043141Z`,
`042241Z`, `040320Z`, `035309Z`, `033443Z`, `032351Z`, and `030649Z` wording
where they differ:

- The completed lower-boundary artifact now classifies `ENTITY-SERIALIZATION-1000009`
  and `PERSISTENCE-PARITY-6000007` as `base-or-harness-pre-stack`.
- The old lower-boundary-held lane is replaced by a main ready lane:
  `PR01 -> PR02 -> PR03 -> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D ->
  PR06A-D`, plus PR02A and PR06E sidecars.
- The `044015Z` Cycle428 post-boundary push-manifest audit is complete and
  authoritative for local publication planning: `36` ready rows including
  `BASE`, `0` blocked rows, and `0` already-published rows. The current
  synthesis additionally records `35` fresh non-base `044015Z` rows in
  `latest-local-publish-manifest.tsv`. Use
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260519T043141Z/jobs/outputs/rtc-cycle428-post-boundary-push-manifest-audit/push-manifest.tsv`
  as the manifest provenance, not stale/header-only manifests or raw deferred
  manifests.
- The CRDT local manifest lane names `PR13A -> PR13B0-B3 -> PR14`, but the
  verified branch-link audit currently exposes only the repaired PR13A/PR13B/
  PR13C content refs. Keep using those audited PR13 links until a newer
  branch-link audit publishes separate PR13B0-B3 rows.
- Do not preserve or revive `PR05E`, raw reload/`PR07D`, stale `PR15D`,
  `PR17`, `PR18`, `PR18x`, fallback/PR15-tailed PR05D manifests, or raw
  deferred branches.
- Strict `117126135e5e` is held in parser/rich-text/entity territory after the
  PR05B/PR05C/clean PR05D comparison and still does not justify PR18x.
- Final filing and final-stack fuzzing are still blocked by seed `1020002`,
  unresolved `RLH-A` ownership, the unfinished controller progress-gate patch,
  missing verified GitHub branch links for some active micro rows, and rebuilt
  final-stack validation.
- `RLH-A` reload hydration remains evidence-only and
  `runtime-setup-blocked`. The Cycle432 runtime setup/replay job still lacks
  nonempty `report.md`, `owner-matrix.tsv`, and `classification.tsv`, so it has
  not produced durable product-owner evidence.
- The live controller patch still needs completion. The Cycle432 controller job
  has `test-results.tsv`, but no `report.md`, and `T002` fails with
  `progress_loop_repair` where the expected result is `progress_bounded_job`.
- Useful next work is to finish those two Cycle432 jobs or, if either exits
  without the required artifacts, rerun exactly one bounded replacement for the
  same scope. The optional owner comparison for strict `c5c009f618b2` / seed
  `6000034` remains behind row-bearing progress or clear spare capacity, and
  finalization/report prompt fixes should keep excluded runtime/validation rows
  out of push commands. Do not serialize these behind seed `1020002`.

The latest duplicate/noise persona files,
`duplicate-noise-20260519T052256Z-synthesis.md` and
`duplicate-noise-20260519T045255Z-feedback-action.md`, plus the zero-byte
`duplicate-noise-20260519T052256Z-feedback-action.md`, are the current
control-plane signal:

- The latest synthesis still treats this as a producer/scheduler control-plane
  leak, not an expensive-analysis consumer leak. It narrows the first follow-up
  to `maybePauseGroupForStartupStallNoise()` in
  `rtc-browser-fuzz-supervisor.mjs`: below-threshold zero-product startup seed
  drains should write `no-analysis`, advance/skip the bad seed, stop current
  lanes, and recover/relaunch the producer group without setting
  `paused-startup-stall` or startup-stall cooldowns. The existing full pause
  behavior should remain once the configured repeated-failure threshold is met.
- The earlier feedback action patched the supervisor path and passed `node
  --check` on the supervisor, triage watcher, analysis tier, deep-analysis tier,
  live-analysis monitor, and novelty monitor. Its gate-only check reported
  `candidates=4`, `suppressedStartup=7`, `signatures=4`, and `active=0`;
  queued/running `pre_action_bootstrap_stall` was `0` in triage,
  analysis-tier, and deep-analysis-tier, while product-evidence visible
  signatures remained `4`.
- The latest synthesis keeps broader live-analysis or downstream suppression
  blocked until reproduced. If duplicate/noise producers still refill after the
  narrow supervisor fix, the next follow-up is a current-first novelty policy
  pass that preserves product-evidence representatives, writes no-analysis for
  no-product strict startup/known-noise, and pauses/rotates matching producers
  before historical reporting.
- Product-evidence signatures, visible likely-real failures, and representative
  analysis for product-evidence duplicate families such as
  `late_session_awareness_stall` and `reload_rejoin_awareness_stall` must remain
  visible. This is harness/control-plane health context, not product
  validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance,
and old PR13 GitHub-ref caveats are superseded by the current branch-link
audit, the repaired PR13 review refs, the latest replacement split, and the
latest novelty/trend evidence.

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped PR05, PR06, PR11, PR12,
or PR15 as active units unless a newer row-bearing audit explicitly replaces
the micro-split with a clearer grouped unit. Do not file stale Cycle293/Cycle306
rows, stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw PR07 arms, stale
PR15D, raw reload-hydration refs, zero-byte reports, header-only matrices,
header-only push manifests, or local finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Start from the completed Cycle428 post-boundary manifest audit at
   `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260519T043141Z/jobs/outputs/rtc-cycle428-post-boundary-push-manifest-audit/push-manifest.tsv`.
   It is newer than the `2026-05-19T04:35:30Z` lower-boundary classification
   and records `36` ready local-publish rows with `0` blocked rows; the latest
   synthesis also records `35` fresh non-base `044015Z` rows in
   `latest-local-publish-manifest.tsv`.
2. Preserve that audit's exclusions for raw deferred heads, raw `PR07D`, stale
   `PR15D`, `PR17`, `PR18`, `PR18x`, fallback tails, runtime-gated
   reload-hydration refs, validation-local-delete refs, and seed `1020002`.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`, including `HARNESS-WS-CONFIG-022004` if it
   is to be filed as a harness-only sidecar.
4. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, only the corrected
   clean PR05D path, and PR15A/B/C after final PR14B materialization.
5. Use only the repaired PR13A/PR13B/PR13C audit links listed above as PR13
   content links. Do not use stale/misordered PR13 refs.
6. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
7. After branch-link audit for missing rows, PR15C endpoint materialization,
   PR15D control-only proof or fresh rejection, reload-marker replay/downscope,
   seed `1020002` repair or reclassification, upstream rebase, and PR CI land,
   rebuild the combined validation stack from explicit accepted heads. Then run
   focused checks, touched-file lint, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide validation.

Useful bounded work now:

- continue seed `1020002` repair or proof-based reclassification without
  converting it into a wait-only progress loop;
- finish `rtc-cycle432-reload-hydration-runtime-setup-replay`; it must write
  nonempty `report.md`, `branch-inputs.tsv`, `replay-runs.tsv`,
  `owner-matrix.tsv`, `first-divergence.tsv`, `classification.tsv`, and
  `manifest-audit.tsv` for seeds `6000007` and `966001` against current
  `PR15C`, the clean reload head, `PR07B0`, and `PR07C` before any
  reload-hydration owner or filing claim;
- finish `rtc-cycle432-controller-progress-gate-patch` by fixing the failing
  `T002` fixture, writing nonempty `report.md`, and keeping row-bearing
  `test-results.tsv`;
- optionally run owner comparison for strict `c5c009f618b2` / seed `6000034`;
- treat the duplicate/noise follow-up as producer-side and narrow: fix the
  below-threshold startup seed-drain supervisor path first, then implement the
  current-first novelty-monitor policy pass only if active producer capacity
  still feeds no-product startup/known-noise families; preserve representative
  product-evidence signatures;
- for rich-text suffix and pre-save search/live-collapse, require owner
  matrices or deterministic first-loss evidence instead of relaunching
  duplicate diagnostics;
- keep duplicate/noise follow-up narrow: verify the restarted/fresh root under
  load, preserve family-specific likely-real visibility, and adjust only
  family-aware producer holds or stale-drain promotion if represented duplicate
  families start refilling again.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, a wait-only seed `1020002` loop, duplicate lower-boundary work,
duplicate Cycle432 jobs while their sessions are active, raw deferred
publication, raw PR07D, raw `HOLD-07C`, raw `003407`, raw `020456`, raw
`024016`, reload-hydration filing before clean-head replay, PR17, PR18, PR18x
promotion, PR15D promotion from stale endpoint evidence, diagnostic product
promotion before focused first-loss replay, broad consumer duplicate/noise
suppression, duplicate reload-hydration owner replays, or extra browser lanes.
