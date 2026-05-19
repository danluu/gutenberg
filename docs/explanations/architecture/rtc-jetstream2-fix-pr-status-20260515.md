# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T02:52:06Z`

Trigger event:
`pr-split-2026-05-19T02-50-51Z-20260519T024021Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-19T02-50-51Z-20260519T024021Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Still blocked for GitHub filing and final-stack validation. The newest
split-persona synthesis, `pr-split-20260519T024021Z-synthesis.md`, changes the
headline from the prior Cycle418 wording: use
`finalized/rtc-pr-stack-20260519T022936Z` as the current replacement working
split, with product lanes through `PR15C` plus harness-only
`HARNESS-WS-CONFIG-022004`. The split is not final-stack-ready.

The `20260519T023939Z/finalization.report.md` output is zero bytes and is not
evidence. Both Cycle418 replay reports are now nonzero:

- seed `1000009` proves current clean `PR15C` fails with
  `entity-serialization-mismatch`;
- seed `6000007` proves both current `PR15C` and
  `RELOAD-HYDRATION-020456` fail the same marker-set divergence.

Treat those as owner-reduction problems, not promotable deferred PRs.

Current maintainer-facing split hypothesis:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A sidecar
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D
  + PR06E sidecar

CRDT/data-loss lane:
PR09 -> PR10
-> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> repaired PR13A -> PR13B -> PR13C
   (desired finer PR13B0-B3 source split remains evidence-only
   until exact verified refs exist)
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C

Harness-only sidecar:
HARNESS-WS-CONFIG-022004

Non-fileable owner queues:
ENTITY-SERIALIZATION-1000009 owner reduction
RELOAD-HYDRATION-020456 / seed 6000007 current-control owner replay
PR07 owner comparison
strict 117126135e5e / seed 5400020 owner comparison
post-PR15C persistence/parity queue
seed 1020002 final-stack repair/reclassification
```

Current blocker/status changes:

- Seed `1020002` still blocks final-stack fuzzing, rebuilt stack-wide
  validation, GitHub filing, and its own repair/reclassification only. It must
  not block PR07 owner comparison, strict owner comparison, branch audits, push
  manifests, PR02A/PR5/PR11 shaping, deferred downscope/promotion, owner
  reductions for seeds `1000009` and `6000007`, or loop repair.
- `ENTITY-SERIALIZATION-1000009` is now a non-fileable owner queue. Compare at
  least `PR05B`, `PR05C`, clean `PR05D`, and current `PR15C`; include cheaper
  earlier controls when available. Do not promote raw
  `VALIDATION-LOCAL-DELETE-012938`.
- `RELOAD-HYDRATION-020456` / `014448` remains blocked/runtime-gated. The
  seed `6000007` replay now shows current `PR15C` already fails, so promotion
  waits on owner replay or repair of that current-control marker divergence.
- Reject stale or wrong-base manifests and raw heads as progress:
  raw `003407`, raw `020456`, raw `024016`, fallback/PR15-tail bases,
  `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, raw
  reload-hydration publication, and raw `PR07D` publication without PR07B/PR07C
  ownership audit proving a distinct delta.
- Keep PR07, strict `117126135e5e`, `PR15D`, `PR17`, `PR18`, and `PR18x`
  non-fileable. No `PR18x` naming until strict rows compare plausible earlier
  owners, including PR05B/PR05C/clean PR05D and the current endpoint.

Do not file `PR02B`, any PR07 arm, `RELOAD-HYDRATION-020456` / `014448`,
`PR15D`, raw `PR07D`, stale `PR07C`, raw deferred reload/search/rich-text
heads, `VALIDATION-LOCAL-DELETE-012938`, `PR17`, `PR18`, `PR18x`, or any
zero-byte/header-only/stale-manifest output.

## Branch And Ref Status

Remote status was collected at `2026-05-19T02:52:01Z`.

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

The branch-link audit was generated at `2026-05-19T02:52:06Z` from fetched
`danluu` refs. A row marked `verified-content` means the branch exists on
`danluu` and has a non-empty audited diff against the listed base. It does not
prove exact publication shape, ancestry, owner evidence, or filing readiness.

Use only these repaired audited PR13 review refs for current PR13
maintainer-facing content:

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
branch-link audit or explicitly says `No verified branch link yet`. Rows with no
verified branch link are not file-ready.

### Ready/Local Lane

| PR | Scope | Audit branch link | Files / diff | Current status |
| --- | --- | --- | --- | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 files, +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 files, +57 / -5 | verified content |
| PR 2A | Ready sidecar after PR2 | No verified branch link yet | TBD | included in `022936` split hypothesis; needs exact pushed/audited ref |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 files, +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 files, +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | active row; aggregate PR05 is prior art only unless the split is explicitly regrouped |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | active row; needed for seed `1000009` owner reduction |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | active row; needed for seed `1000009` owner reduction |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | valid only for clean `27c6e7924217`; reject fallback-tail PR05D |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | active PR06A-D split row; do not substitute grouped PR06 or PR06A prior-art refs |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | active PR06A-D split row; PR06B progress ref is useful evidence only |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | active PR06A-D split row |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | sidecar must hang from PR06D, not PR07 |
| HARNESS-WS-CONFIG-022004 | WebSocket harness configuration sidecar | No verified branch link yet | TBD | harness-only; not a product fix and not final-stack validation |

### CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files / diff | Current status |
| --- | --- | --- | --- | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 files, +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 files, +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | active split row; grouped PR11 is aggregate prior art only |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | active split row |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | active split row |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | active split row |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | active split row |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | active split row; grouped PR12 is aggregate prior art only |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | active split row |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | active split row |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 files, +1151 / -25 | repaired verified content |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 files, +1672 / -4 | repaired verified content; use until exact PR13B0-B3 refs are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 files, +345 / -51 | repaired verified content; source-family PR13B0-B3 remain evidence-only without verified links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 files, +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | required before active PR15A-C; needs final-PR14B materialization/audit |
| PR 15A | Fallback-group move green on PR14B | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 files, +123 / -4 | verified component content; filing still waits on `022936` stack audit and PR15C owner reductions |
| PR 15B | Fallback-group insert-anchor green on PR14B | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 files, +197 / -4 | verified component content; filing still waits on `022936` stack audit and PR15C owner reductions |
| PR 15C | Fallback-group delete green on PR14B | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 files, +161 / -4 | current canonical endpoint, but seeds `1000009` and `6000007` prove current-control failures that block filing |

### Verified Prior Art, Not Active Proposed Rows

These rows have verified audit links, but they are not the exact active
micro-split PR rows unless the status says so.

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 6B progress | Malformed save request payload minimal branch | [`danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal) | verified progress branch; evidence only, not a substitute for PR06A-D/PR06E placement proof |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07 decision fork |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |

## Deferred Or Evidence-Only Work

These rows must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified active refs | PR02A, PR05A-D, PR06A-D, PR06E, PR11A-E, PR12A-C, PR13B0-B3, PR14B, exact `022936` stack refs, `HARNESS-WS-CONFIG-022004` | active rows with no audit entry correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing or promoting any row |
| ENTITY-SERIALIZATION-1000009 | seed `1000009`, current clean PR15C | current `PR15C` fails with `entity-serialization-mismatch`; non-fileable owner queue | Run owner reduction across PR05B, PR05C, clean PR05D, and current PR15C; include cheaper earlier controls where available |
| VALIDATION-LOCAL-DELETE-012938 | deferred local-delete validation/test lane | remains validation/test-only; raw `012938` is not product PR evidence | Promote nothing unless owner reduction proves a product row and exact clean refs are audited |
| RELOAD-HYDRATION-020456 / 014448 | clean blocked reload head `5edcd4acdf60f9ea2e0313756e8b01749f9ecef6`, seed `6000007` | blocked/runtime-gated only; current PR15C and the reload head both fail the same marker-set divergence | Run current-PR15C owner replay/repair first, then rerun current PR15C and `RELOAD-HYDRATION-020456` |
| Seed `1020002` WebSocket marker divergence | final-stack repair/reclassification lane | blocks final-stack fuzzing, filing, rebuilt validation, and its own repair/reclassification only | Repair or explicitly reclassify before final-stack validation and filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | downscoped/no-file; prior report says PR02 base and PR02B both pass seed `1030001`, `promote: no` | Do not file. Reopen only with new owner/repro evidence and a verified branch-link audit |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B0A/B/C, PR07B0D-215248, PR07B0E-233340, PR07B0F-003407, PR07B0G-004916, HOLD-07C | non-fileable owner-comparison fork; active row-bearing work is useful only when it compares current endpoint controls | Require row-bearing owner matrices with first-divergence evidence, current PR15C controls, clean refs, and branch audit before promotion |
| Strict revision-restore signal | `117126135e5e`, seed `5400020`, PR03, held PR03B, PR07 arms | owner-comparison target only; current rows still do not assign ownership | Require row-bearing strict owner comparison against PR03, held PR03B, PR07 arms, PR05B, PR05C, clean PR05D, PR14, and current PR15C before naming PR18x |
| PR15D endpoint/control | stale Cycle324/Cycle325/Cycle376 PR15D rows and later repaired endpoint manifests | blocked/control-only; current endpoint remains PR15C | Accept PR15D only with fresh current-base head/bundle/manifest proof after PR15C |
| Raw deferred manifests | raw `003407`, raw `020456`, raw `024016`, fallback/PR15-tail bases, raw `PR07D` | invalid PR progress; wrong/stale base or missing same-cycle allowlisted base/head/bundle/manifest agreement | Keep as no-progress unless a new audit proves clean allowlisted base, head/bundle/manifest agreement, and ownership/non-coverage |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the PR07 owner queue, PR14, and current PR15C |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06, PR06A prior-art, and PR06B progress refs are verified; active PR06A-D and PR06E still have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13A/B/C maintainer-facing rows |
| Duplicate/noise producer control-plane | startup-noise holds, product-evidence duplicate-family holds, stale/no-analysis drain admission | latest duplicate-noise synthesis (`20260519T023513Z`) calls this a producer/admission control-plane leak, not product failure; latest feedback-action file is zero bytes | Patch and validate novelty/scheduler/runner gates separately; do not treat control-plane remediation as product validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T02:52:01Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T015651Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-19T02:51:26.643Z` for
`run-20260519T015651Z`:

```text
coverage files: 55671
total records seen: 91016
records processed this pass: 111
unmet goals: 4
recommended groups:
  novelty-ws-real-user-save-reload
  novelty-ws-real-user-editing
  novelty-ws-real-user-rich-text
active current-run dirs: 0
active likely-real visible: 0
active likely-real merged duplicates: 0
active oracle/noise questions: 0
current drain raw product-evidence signatures: 14
current drain likely-real visible: 0
current drain likely-real merged duplicates: 3
current drain raw top family:
  reload_rejoin_awareness_stall, count 14
historical likely-real visible: 377
historical top duplicate family share: 0.3407
enabled groups:
  novelty-ws-parser-serialization
paused groups:
  novelty-http-persistence-probe
  novelty-ws-block-gauntlet
  novelty-ws-parser-transform
  novelty-ws-lifecycle
  novelty-ws-real-user-save-reload
load1: 66.31 / 64 cores
memory: 420.3G free / 492.0G total
headroom for adding groups: no
health note: heartbeat refreshed at 02:51:26Z; metrics are from the
  completed 02:44:04Z full pass
```

Interpretation:

- Do not claim final-stack cleanliness. The newest novelty output is a
  coverage-guided health pass for the active fuzz root, not validation of the
  accepted final PR stack.
- Active current-run triage has zero visible likely-real signatures. Drain
  triage has raw duplicate product-evidence for `reload_rejoin_awareness_stall`,
  but zero visible likely-real signatures.
- Historical triage remains dominated by known/noisy families, especially raw
  `pre_action_bootstrap_stall`. Historical aggregate noise must not be reported
  as a live product failure.
- Current fuzz health does not clear PR filing, exact branch-link gaps,
  PR07 owner replay, strict owner replay, PR15C owner reductions, PR15D
  control-only endpoint repair, the `RELOAD-HYDRATION-020456` seed `6000007`
  gate, seed `1020002`, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T02:42:50Z`:

```text
monitor passes: 2318
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-19T02:09:19Z
coverage files: 272 -> 55605
coverage files delta: 55333
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3407
summary startup failures last: 0
quality issues last: 0
memory free: 425.2 GB
load averages: 61.07 / 60.31 / 65.22 on 64 cores
enabled group current:
  novelty-ws-parser-serialization
latest fuzz level mix:
  browser-e2e=28 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6047548
browser-e2e likely-real findings: 781 over 2604.4 runner-hours
```

Largest unmet goals remain save/reload and real-user depth:

```text
reload-post-action: 1181/2000
title-save-reload: 634/1000
real-user-editing success: 650/1000
body-save-reload: 693/1000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. CPU/load remain high, so new fuzz work should stay
bounded and oracle-specific rather than increasing broad browser concurrency.

## Status-Persona Analysis

The newest split-persona synthesis, `pr-split-20260519T024021Z-synthesis.md`,
supersedes the older Cycle418 / `022946` wording where they differ:

- Use `finalized/rtc-pr-stack-20260519T022936Z` as the current replacement
  working split: product lanes through `PR15C`, plus harness-only
  `HARNESS-WS-CONFIG-022004`.
- Treat the ready/local and CRDT lanes as usable prefixes, but not
  final-stack-ready.
- Treat seed `1000009` as the new `ENTITY-SERIALIZATION-1000009` owner queue.
  Current clean `PR15C` fails with entity serialization mismatch, so raw
  `VALIDATION-LOCAL-DELETE-012938` stays validation/test-only.
- Keep `RELOAD-HYDRATION-020456` blocked/runtime-gated. Seed `6000007` now
  shows current `PR15C` fails the same marker-set divergence as the reload
  head, so promotion waits on owner replay or current-control repair.
- Keep PR07, strict `117126135e5e`, `PR15D`, `PR17`, `PR18`, and `PR18x`
  non-fileable.
- Reject stale or wrong-base manifests: raw `003407`, raw `020456`, raw
  `024016`, fallback/PR15-tail bases, `fix/rtc-fallback-group-delete-stale-local`,
  `d06e3528cbd`, and raw reload/`PR07D` publication without ownership audit.
- Patch the progress loop rule: missing/zero-byte reports, header-only TSVs,
  active sessions, stderr-only evidence, and stale manifests are no progress.

The latest duplicate/noise synthesis,
`duplicate-noise-20260519T023513Z-synthesis.md`, did not produce a completed
feedback-action file; `duplicate-noise-20260519T023513Z-feedback-action.md` is
zero bytes. The synthesis frames current duplicate/noise pressure as a
producer/admission control-plane leak: no-product startup noise can still be
re-enabled, preserved, or misclassified before downstream analysis gates apply.
This is control-plane health context, not product validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older exact fuzz
numbers, old enabled-group claims, old "keep existing split" guidance, and old
PR13 GitHub-ref caveats are superseded by the current branch-link audit, the
repaired PR13 review refs, the latest replacement split, and the latest
novelty/trend evidence.

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped PR06, PR11, PR12, or PR15
as active units unless a newer row-bearing audit explicitly replaces the
micro-split with a clearer grouped unit. Do not file stale Cycle293/Cycle306
rows, stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw PR07 arms, stale
PR15D, raw reload-hydration refs, zero-byte reports, header-only matrices,
header-only push manifests, or local finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement `022936` fileable shape above while treating it as
   provisional and not final-stack-ready.
2. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`, including `HARNESS-WS-CONFIG-022004` if it
   is to be filed as a harness-only sidecar.
3. Complete owner reductions for seed `1000009` across PR05B, PR05C, clean
   PR05D, and current PR15C; then complete seed `6000007` owner replay for the
   current-PR15C marker-set divergence before promoting reload-hydration work.
4. Repair or explicitly reclassify seed `1020002` before rebuilt stack-wide
   validation, broad final-stack fuzzing, or GitHub filing.
5. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   and PR15A/B/C after final PR14B materialization.
6. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
7. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
8. After owner reductions, exact branch-link audit for missing rows, PR15C
   endpoint materialization, PR15D control-only proof or fresh rejection,
   reload-marker replay/downscope, and seed `1020002` repair or
   reclassification land, rebuild the combined validation stack from explicit
   accepted heads. Then run focused checks, touched-file lint, branch graph and
   containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide validation.

Useful bounded work now:

- run or consume
  `runs/20260519T024021Z/jobs/run-rtc-cycle420-pr15c-persistence-entity-owner-reduction.sh`
  over seeds `1000009` and `6000007` using
  `finalized/rtc-pr-stack-20260519T022936Z`;
- produce nonzero `report.md`, `owner-matrix.tsv`, `classification.tsv`,
  `replay-runs.tsv`, `first-divergence.tsv`, `branch-inputs.tsv`, and
  `manifest-audit.tsv` for that owner-reduction job;
- optionally run a publication-only `rtc-cycle420-022936-ready-push-manifest-audit`
  allowlisting only ready product branches and `HARNESS-WS-CONFIG-022004`;
- patch the duplicate/noise control-plane leak in bounded steps, starting with
  `rtc-browser-fuzz-novelty-monitor.mjs` cooldown/bypass handling, then validate
  with `node --check` and a short canary. Do not treat that remediation as
  product evidence.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw deferred publication/replay, raw PR07D, raw `HOLD-07C`, raw
`003407`, raw `020456`, or raw `024016` reload-hydration publication,
RELOAD-HYDRATION filing before owner replay/seed `6000007` gate repair, PR17,
PR18, PR18x promotion, PR15D promotion from stale endpoint evidence, diagnostic
product promotion before focused first-loss replay, broad consumer
duplicate/noise suppression, or extra browser lanes.
