# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T23:28:46Z`

Trigger event:
`pr-split-2026-05-18T23-27-20Z-20260518T231757Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T23-27-20Z-20260518T231757Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Still blocked, with the fileable split narrowed. The newest split-persona
synthesis, `pr-split-20260518T231757Z-synthesis.md`, moves the fileable
maintainer-facing recommendation to two lanes only: the ready/local lane and
the CRDT/data-loss lane. `PR02B`, all PR07 arms, `DIAG-*`, strict
`117126135e5e`, `PR17`, `PR18`, and `PR18x` are outside the fileable split
until they have owner evidence, clean refs, and verified branch links.

PR07 is still tracked, but only as a non-fileable owner-comparison queue.
`PR07B0D-215248` remains the active clean B0D comparison arm; older
`PR07B0D-205218`, `PR07B0D-212232`, and `PR07B0D-213739` are historical
controls. The latest PR07 readiness evidence is nonzero but still
setup-blocked before oracle: seed `966001` reaches the editor with
`collaborationEnabled:null`, and the latest synthesis points at duplicate
Gutenberg plugin/disposable runtime setup as the next setup-repair target. No
PR07 arm is fileable, and the full owner matrix must wait until a PR07B0
sentinel proves `collaborationEnabled:true`.

Strict `117126135e5e` remains owner-unassigned. The latest comparison produced
no passing or restore-failure oracle rows, so `PR18x` stays unnamed until seed
`5400020` reaches oracle-bearing rows across PR03/held PR03B, the PR07 queue,
PR05B, PR05C, clean PR05D, PR14, and canonical PR15D.

The `20260518T225829Z` finalization report is nonzero, but it only adds
`DIAG-SEARCH-225317` as diagnostic/test evidence. `DIAG-HTTP-REJOIN-220755` now
also has nonzero diagnostic evidence; the latest synthesis downscopes the
local-update-ack angle and points next to server storage/cursor response or
joined-peer apply diagnostics for seed `6000034`. Keep
`DIAG-HTTP-REJOIN-220755`, `DIAG-RELOAD-224313`, and `DIAG-SEARCH-225317` as
diagnostic/test side lanes, not product PRs.

The latest novelty status for `run-20260518T225956Z` was updated at
`2026-05-18T23:28:07.463Z` and now has a completed pass. It reports `55399`
coverage files, `90666` total records seen, `7` current-run HTTP
`persistence-no-title` records, `4` unmet coverage goals, `0` current-run
actionable signatures, `0` current-run likely-real visible signatures, current
duplicate share `0`, and historical duplicate share `0.3409`. This is
fuzz/control-plane health, not final-stack validation.

The latest trend packet was generated at `2026-05-18T23:16:31Z`: `55361`
coverage files at the latest snapshot, `4` unmet goals, duplicate share
current `0`, historical duplicate share `0.3409`, browser-E2E `777`
likely-real findings over `2530.1` runner-hours, and `41` browser-E2E lanes
across `38` groups. CPU/load are high, so new work should stay bounded and
oracle-specific rather than adding broad browser concurrency.

The newest duplicate/noise synthesis,
`duplicate-noise-20260518T231214Z-synthesis.md`, treats the remaining problem
as fuzz/control-plane feedback, not product code. The smallest safe next pass
is to make no-product startup/noise holds authoritative across output-root
rollover, producer refill/bootstrap/fallback, drain-only state, and
live-analysis admission, while preserving product-evidence failures. Its
matching feedback-action file is zero-byte in this input bundle, so there is no
new completed duplicate/noise action after the prior cycle-220 remediation.

Current maintainer-facing fileable replacement shape:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A ready sidecar
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D
  + PR06E ready sidecar from PR06D

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B -> PR13C
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

PR13 source-family review still wants the finer `PR13B0 -> PR13B1 -> PR13B2
-> PR13B3` split, but the branch-link audit currently verifies only repaired
PR13A/B/C review refs. Use those repaired PR13A/B/C links as the current
maintainer-facing PR13 content until PR13B0-B3 refs are published, fetched, and
audited.

Current non-fileable queues and blockers:

- `PR02B` is no longer part of the fileable ready/local lane. It remains a
  blocked validation/ownership item because seed `1030001` passed on both
  PR02B and the PR02 base; it needs owner/repro explanation or downscope, then
  PR CI and a verified branch-link audit.
- `PR07B0A-155713`, `PR07B0B-195150`, `PR07B0C-201201`, `PR07B0D-215248`, and
  `HOLD-07C` are sibling owner candidates after `PR07B0`, not sequential PRs
  and not fileable PR rows. Cycle400 produced `36/36` `blocked-before-oracle`
  rows, and later readiness evidence remains blocked on `collaborationEnabled:null`.
- Failed `PR07B0D-203210`, raw `210726`, raw PR07D, raw deferred reload heads,
  stale PR07C ready refs, raw `HOLD-07C`, `PR07B0D-205218`/`212232`/`213739`
  controls, PR17, PR18, and PR18x stay out of the active fileable split.
- Parser, linebreak, rich-text, search/live-collapse, and reload reductions
  still require owner comparison against PR05B, PR05C, clean PR05D, the PR07
  queue, PR14, and canonical PR15D before promotion.
- The branch-link audit verifies several aggregate/prior-art branches, but the
  active micro-split rows remain unfileable where they say
  `No verified branch link yet`.
- Do not start broad final-stack fuzzing, stack filing, or final PR publication
  until PR07 readiness and owner replay, PR02B ownership/downscope,
  PR15 final-PR14B materialization, exact branch links, reload-marker downscope,
  seed `1020002` handling, and rebuilt final-stack validation are no longer
  blocking.

## Branch And Ref Status

Remote status was collected at `2026-05-18T23:28:41Z`.

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

The branch-link audit was generated at `2026-05-18T23:28:46Z` from fetched
`danluu` refs. A row marked `verified-content` means the branch exists on
`danluu` and has a non-empty audited diff against the listed base. It does not
prove exact Cycle325/i40 publication shape, ancestry, owner evidence, or filing
readiness.

The audit now also verifies aggregate or progress links for PR05, PR06, PR06A,
PR06B progress, PR07A, PR07B, PR08, PR11, PR12, and PR15A-C component
branches. Those links are listed below as prior-art/progress rows only where
the active micro-split still needs exact branch publication or owner evidence.

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
verified branch link are not file-ready. The current proposed fileable rows are
the ready/local lane and the CRDT/data-loss lane only; PR02B and the PR07 queue
are tracked below as blockers, not proposed PR rows.

### Common Mainline

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | Ready sidecar after PR2 | No verified branch link yet | TBD | TBD | active sidecar; not file-ready until pushed, fetched, and audited |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i40 row; aggregate PR05 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback-tail PR05D |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07 |

### Blocked Owner-Comparison Queue

These rows are not in the fileable split. They stay here so the PR07 owner gate
is easy to scan.

| Queue item | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR02B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | moved out of fileable split; needs seed `1030001` owner/repro explanation or downscope, then PR CI and verified branch link |
| PR07A1/A2/A3 | Save response guard microheads | No verified branch link yet | TBD | TBD | non-fileable setup for PR07 owner comparison; exact refs and owner evidence missing |
| PR07B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | decision base for the PR07 queue; compare PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, and HOLD-07C only after readiness passes |
| PR07B0A-155713 | Saved-CRDT hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable owner candidate from earlier cycles; raw `155713` full-stack ref must not be pushed |
| PR07B0B-195150 | Persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable owner candidate; owner replay and verified GitHub branch link are still missing |
| PR07B0C-201201 | Corrected persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable sibling owner candidate; current-run audit passed, but owner replay and verified GitHub branch link are still missing |
| PR07B0D-215248 | Clean PR07B0-based derived-content authority arm | No verified branch link yet | TBD | TBD | active clean B0D comparison arm; Cycle400 replay produced `36/36` `blocked-before-oracle` rows and latest readiness remains blocked on `collaborationEnabled:null` |
| HOLD-07C | Held PR07C/runtime control arm | No verified branch link yet | TBD | TBD | comparison control only; stale ready PR07C refs are not fileable |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; next progress-controller repair target |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired verified content; use until exact PR13B0-B3 refs are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired verified content; source-family PR13B0-B3 remain evidence-only without verified links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-D; needs final-PR14B materialization/audit |
| PR 15A-on-PR14B | Fallback-group move green on PR14B | No verified branch link yet | TBD | TBD | exact final-PR14B ref still missing; header-only push manifest is not progress |
| PR 15B-on-PR14B | Fallback-group insert-anchor green on PR14B | No verified branch link yet | TBD | TBD | exact final-PR14B ref still missing; needs nonzero materializer/audit report |
| PR 15C-on-PR14B | Fallback-group delete green on PR14B | No verified branch link yet | TBD | TBD | exact final-PR14B ref still missing; needs nonzero materializer/audit report |
| PR 15D | Canonical PR15 endpoint after PR15C | No verified branch link yet | TBD | TBD | lower-control endpoint still unresolved; old divergent refs are not filing proof |

### Verified Fallbacks And Prior Art

These rows have verified audit links, but they are not the exact active
micro-split PR rows unless the status says so.

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 6B progress | Malformed save request payload minimal branch | [`danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal) | verified progress branch from the PR progress controller; still not a substitute for active PR06A-D/PR06E placement proof |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07 decision fork |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; not the exact final-PR14B materialized ref |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; not the exact final-PR14B materialized ref |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not the exact final-PR14B materialized ref and not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T23:28:41Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T225956Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-18T23:28:07.463Z`. Unlike the prior startup-only status, this one has
metrics from a completed full pass at `2026-05-18T23:26:22.856Z`. This is
fuzz/control-plane health, not final-stack validation.

Current root health:

```text
output dir: run-20260518T225956Z
coverage files: 55399
total records seen: 90666
records processed this pass: 68
current-run records: 7
current-run profile: persistence-no-title
current-run transport: http
active run dirs: 1
enabled groups: novelty-http-persistence-probe
```

Interpretation:

- Current-run triage is empty: `0` actionable signatures, `0` raw signatures,
  `0` product-evidence signatures, and `0` likely-real visible signatures.
- Coverage guidance still has `4` unmet goals, all in save/reload and
  real-user depth. Recommended groups remain WS real-user save/reload, editing,
  and rich-text, but the policy guard skipped re-enabling them because the
  real-user duplicate-family hold is active.
- Historical duplicate/noise remains dominated by old startup/no-product and
  high-volume families and must not be presented as live product failure.
- Current duplicate share is `0`; historical duplicate share remains `0.3409`.
- This status does not clear PR filing, PR07 owner replay, PR02B validation,
  PR15 final-PR14B materialization, reload-marker replay, seed `1020002`,
  exact branch-link gaps, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-18T23:16:31Z`:

```text
monitor passes: 2302
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T23:13:16Z
coverage files: 272 -> 55361
coverage files delta: 55089
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3409
summary startup failures last: 0
quality issues last: 0
memory free: 420.2 GB
load averages: 103.72 / 81.88 / 71.8 on 64 cores
enabled groups current: novelty-http-persistence-probe
latest fuzz level mix:
  browser-e2e=41 lanes/38 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5954460
browser-e2e likely-real findings: 777 over 2530.1 runner-hours
```

The largest unmet goals remain save/reload and real-user depth:

```text
reload-post-action: 1143/2000
title-save-reload: 596/1000
real-user-editing success: 613/1000
body-save-reload: 655/1000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. New fuzz work should stay bounded and oracle-specific:
the trend packet still shows four unmet goals, high historical duplicate share,
and high browser E2E yield. Current-run duplicate/noise is clean in the latest
pass, but that does not validate the final stack or any PR branch.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T231757Z-synthesis.md`, changes the recommendation from
"ready/local plus PR07 queue plus CRDT" to a smaller fileable shape:
ready/local plus CRDT only. PR07 remains important, but it is now explicitly a
non-fileable runtime owner-comparison queue. `PR02B`, `DIAG-*`, strict
`117126135e5e`, `PR17`, `PR18`, and `PR18x` are also outside the fileable split.

Latest split/persona statuses:

- Keep `PR07B0D-215248` only as the active B0D comparison arm. It supersedes
  `PR07B0D-205218`/`212232`/`213739`, but it is not a PR row until owner
  evidence and a verified branch link exist.
- PR07 readiness is still setup-blocked: Cycle400 owner replay produced
  `36/36` `blocked-before-oracle` rows, Cycle402 readiness remained blocked on
  `collaborationEnabled:null`, and the latest synthesis points to duplicate
  Gutenberg plugin/disposable runtime setup. The next action is one shared
  collaboration-readiness repair, then a PR07B0 seed `966001` sentinel before
  any full PR07 matrix.
- Strict `117126135e5e` remains unassigned. Do not name `PR18x` until seed
  `5400020` reaches oracle-bearing rows across PR03/PR03B, the PR07 queue,
  PR05B, PR05C, clean PR05D, PR14, and canonical PR15D.
- `DIAG-HTTP-REJOIN-220755` has nonzero diagnostic evidence now, but the latest
  synthesis says it downscopes the local-update-ack theory and points next to
  server storage/cursor response or joined-peer apply diagnostics for seed
  `6000034`. It stays diagnostic/test-only.
- `DIAG-SEARCH-225317`, `DIAG-RELOAD-224313`, and rich-text suffix work stay
  diagnostic/test-only until focused first-loss replay proves product ownership.
- `PR02B` is blocked on ownership/reproduction, not bootstrap. Seed `1030001`
  passed on PR02B and on the PR02 base, so the intended base/head failure
  boundary is missing until owner/repro evidence or a downscope decision
  explains it.
- Materialize and audit exact PR15 final-PR14B refs before treating
  `PR15A-on-PR14B -> PR15B-on-PR14B -> PR15C-on-PR14B -> PR15D` as final.
  Required evidence includes allowed base, branch/head/manifest agreement,
  adjacent diffstat/numstat, `git diff --check`, and focused CRDT validation.
- Keep loop hardening so active sessions, zero-byte reports, `report.tmp`,
  prompt-only outputs, all-`not-run` matrices, setup-smoke output,
  pre-oracle runtime output, disk-preflight-only reports, stale/fallback-tail
  PR05D manifests, stale `PR07C`, raw `PR07D`, raw deferred reload heads,
  PR17, PR18, PR18x, and active seed `1020002` do not satisfy progress while
  actionable independent rows remain.

Bounded follow-up jobs named by the latest split-persona synthesis:

```text
rtc-cycle405-shared-collaboration-readiness-single-plugin-repair
  fix only disposable replay setup so exactly one Gutenberg plugin copy is
  active, then prove wp_is_collaboration_enabled() and
  window._wpCollaborationEnabled === true

PR07 sentinel and strict sentinel
  rerun only PR07B0 seed 966001 and strict PR03 seed 5400020 sentinels before
  any full matrices

HTTP 220755 successor
  consume the nonzero report as a downscope of the ack diagnostic, then target
  server storage/cursor response or joined-peer apply diagnostics for seed
  6000034 before assigning any product row

PR02B owner/repro pass
  explain seed 1030001 base nonreproduction or downscope PR02B before filing

loop/audit hardening
  reap stale/reportless Cycle398 PR07 subprocesses and keep zero-byte,
  setup-blocked, wait-only, and active-session artifacts from counting as
  progress
```

The newest duplicate/noise synthesis,
`duplicate-noise-20260518T231214Z-synthesis.md`, finds consensus on a
control-plane feedback bug: strict no-product startup noise is mostly filtered
by triage/analysis, but producer scheduling and live-analysis admission do not
reliably honor that state across drain, fallback, stale state, and output-root
rollover. The next pass should patch only fuzz/control-plane code: import
previous supervisor startup-stall pauses, make no-product holds block refill
and fallback unless current product evidence exists, create no-analysis
sentinels for matching active/drain dirs, and make live-analysis fail closed on
gate failure, no-analysis drain, stale state, or family-capped-only work. The
matching `duplicate-noise-20260518T231214Z-feedback-action.md` file is
zero-byte, so no new completed duplicate/noise action is recorded in this
bundle.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance, and
old PR13 GitHub-ref caveats are superseded by the current branch-link audit,
the repaired PR13 review refs, the latest narrowed fileable split, and the
latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A/B/C-on-PR14B, PR15D | active proposed rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | moved out of the fileable split; fresh PR02B validation passed seed `1030001`, the short HTTP probe, and targeted PHPUnit on PR02B, but the PR02 base also passed seed `1030001`, so the owner/repro boundary is missing | Require owner/repro evidence or a downscope decision, then PR CI and exact branch-link audit before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, HOLD-07C, reload/provider evidence | non-fileable owner-comparison queue; PR07B0D-215248 is the active clean arm, but Cycle400 produced `36/36` `blocked-before-oracle` rows and the latest readiness evidence is still blocked from `collaborationEnabled:null` | Run the shared single-plugin readiness repair, prove PR07B0 seed `966001` reaches `collaborationEnabled:true`, then replay seeds `966001`, `1020001`, and `990001` across the required arms and controls |
| Historical PR07B0D controls / failed raw reload refs | raw `deferred/rtc-reload-hydration-20260518T203210Z`, raw `210726`, `PR07B0D-205218`, `PR07B0D-212232`, `PR07B0D-213739`, and related manifests | out of the active fork; `PR07B0D-215248` supersedes those B0D variants, while Cycle394 `203210` failed on both touched files | Reconsider only after bounded conflict-resolution/downscope produces a clean allowed-base artifact with bundle/head/manifest agreement and owner replay justifies promotion |
| PR07D / PR17 / PR18 / PR18x | reload/post-save/rejoin residuals and old linear tail | rejected for the current split | Reconsider only after owner replay proves a product-owned boundary not covered by the accepted PR07 fork |
| DIAG-HTTP-REJOIN-220755 | source `deferred/rtc-reload-hydration-20260518T220755Z`, head `f50864062e0f`, base `72854f05ed...`, seed `6000034` | diagnostic side lane only; latest nonzero report downscopes the ack theory and does not promote product code | Continue with server storage/cursor response or joined-peer apply diagnostics before assigning any product PR row |
| DIAG reload/search diagnostics | `DIAG-RELOAD-224313`, `DIAG-SEARCH-225317`, rich-text suffix diagnostics | diagnostic/test side lanes only; `20260518T225829Z` is nonzero but does not create a product PR | Run focused first-loss replay before assigning search, reload, or rich-text product ownership |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the PR07 owner queue, holds, PR14, and canonical PR15D before assigning any new owner row |
| Revision-restore strict signal | `117126135e5e`, PR03, held PR03B, PR07 arms | owner-comparison target only; not a split row or product fix by itself; latest comparison produced no passing or restore-failure oracle rows | Repair runtime setup and rerun the bounded strict owner comparison for seed `5400020`, then compare against PR03, held PR03B, PR07 arms, and lower controls before claiming a new owner boundary |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06, PR06A prior-art, and PR06B progress refs are verified; active PR06A-D and PR06E still have no exact verified micro-split links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, accepted PR07 fork non-ancestry where required, old HOLD non-ancestry, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B, PR15A/B/C-on-PR14B, and PR15D | branch-link audit verifies PR15A-C component prior art, but no exact final-PR14B materialized refs or PR15D endpoint link; zero-byte finalization and header-only manifests do not count | Publish/fetch/audit exact PR14B-based refs, resolve PR15D, confirm ancestry, and require nonzero materializer/audit evidence |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only; do not wait on it before running independent PR07/PR02B/strict-owner work | Repair or explicitly reclassify before final-stack validation and filing |
| Reload marker/lifecycle work | HARNESS reload markers, seeds `990001`/`990003`, same-user lifecycle seeds, PR07C seeds, deferred reload outputs | harness/diagnostic only until replay proves product ownership | Consume PR07 owner replay when present, then require product-owned first-loss boundary before promotion |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, startup-noise cooldowns, empty materialization rescue, family-capped duplicate holds, current-run negative gates, live/analysis duplicate-family admission | cycle-220 remediation is complete, but the newest synthesis identifies remaining producer/live-analysis feedback leaks; the latest feedback-action file is zero-byte, so no new completed control-plane patch is recorded | Patch only fuzzer/control-plane admission and producer hold behavior; preserve product-evidence visibility and do not treat this as product validation |
| Current fuzz validation | `run-20260518T225956Z`, novelty status at `2026-05-18T23:28:07.463Z`, trend generated at `2026-05-18T23:16:31Z` | latest novelty status has a completed pass: `55399` coverage files, `90666` records, `7` current-run HTTP persistence records, `4` unmet goals, current duplicate share `0`, current likely-real visible `0`, and browser-e2e `777` historical likely-real findings over `2530.1` runner-hours | Use as health/control-plane evidence only; still require owner replay, PR02B ownership/downscope, PR15 final-PR14B audit, exact branch audit, reload-marker downscope, seed `1020002` handling, and final PR-stack validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw `155713`, raw
`PR07B0B-195150`, raw `PR07B0C-201201`,
`PR07B0D-205218`/`212232`/`213739` historical controls, raw
`PR07B0D-215248`, raw
`203210`, raw `210726`, raw PR07D, raw `HOLD-07C`, PR17, PR18, PR18x,
zero-byte finalization output,
header-only push manifests, or local finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement fileable split above: ready/local lane plus
   CRDT/data-loss lane only. PR02B and PR07 are tracked as blocked queues, not
   proposed filing rows.
2. Treat PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, and HOLD-07C as blocked
   sibling owner candidates. Keep failed `203210`, raw `210726`, raw PR07D,
   stale PR07C ready refs, raw `HOLD-07C`, historical `205218`/`212232`/`213739`
   controls, PR17, PR18, and PR18x out unless later conflict-resolution/downscope
   work produces clean allowed-base evidence.
3. Do not file PR02B before the seed `1030001` base/head nonreproduction is
   explained or downscoped, then PR CI and verified GitHub branch-link audit
   pass.
4. Do not promote PR07 into the fileable split until PR07B0A/B/C/D and the
   hold/lower-control matrix has oracle-bearing owner replay outputs,
   first-divergence evidence, clean materialized refs, exact branch links, and
   `git diff --check`.
5. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
6. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   PR15A/B/C/D after final PR14B materialization, and no fallback-tail PR05D.
7. Run held owner comparisons for strict projection, common-blocks, rich-text,
   search/live-collapse, revision-restore `117126135e5e`, and reload
   candidates before creating new product rows.
8. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
9. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
10. Treat the latest duplicate/noise producer/admission analysis and the
   current fuzz root as control-plane/fuzz health, not product validation or
   final-stack readiness.
11. After PR07 readiness and owner evidence, exact branch-link audit for
   missing rows, PR02B validation, PR15 final-PR14B materialization,
   reload-marker replay/downscope, strict `117126135e5e` comparison if it
   remains product-owned, and seed `1020002` repair or reclassification land,
   rebuild the combined validation stack from explicit Cycle325/i40 heads plus
   accepted epoch work, then run focused checks, touched-file lint, branch
   graph/containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

Useful bounded work now:

- launch the shared single-plugin collaboration-readiness repair, prove
  `wp_is_collaboration_enabled()` and browser
  `window._wpCollaborationEnabled === true`, then rerun only the PR07B0 seed
  `966001` sentinel before any full PR07 matrix; include `PR07B0D-215248` only
  after readiness passes and require a nonzero owner-replay report plus
  non-header `classification.tsv`, `replay-runs.tsv`, `first-divergence.tsv`,
  `owner-matrix.tsv`, and per-arm artifacts;
- repair strict `117126135e5e` runtime setup using the generated repair prompt,
  then rerun the bounded strict owner comparison for seed `5400020` before
  assigning any strict revision-restore product row or PR18x name;
- consume the now-nonzero HTTP `220755` report as diagnostic downscope, then
  continue with server storage/cursor response or joined-peer apply diagnostics
  for seed `6000034` before assigning any HTTP polling product row;
- run focused first-loss replay for `DIAG-SEARCH-225317` and rich-text suffix
  diagnostics before any product promotion;
- consume PR02B validation as blocked-owner/repro evidence: it already passed
  seed `1030001`, the HTTP probe, and targeted PHPUnit on the head, but the
  base also passed, so do not launch a duplicate validation repair without a
  new owner/downscope reason;
- publish/fetch/audit exact GitHub refs for the active PR15A/B/C-on-PR14B
  rows only after a nonzero final-PR14B materializer/audit report, then resolve
  and audit the canonical PR15D endpoint;
- keep the progress-controller hardening in force so prompt-only, manifest-only,
  preflight-only, blocked-validation, owner-unassigned, setup-only, zero-byte,
  header-only, duplicate-head, stale-manifest, or stopped-child artifacts never
  count as completed progress;
- if duplicate/noise follow-up is needed, keep it to the newest narrow plan:
  current-run negative gating before historical scanning, sticky no-product
  startup/noise producer holds, gate-only/live monitor validation, and preserved
  product-evidence visibility;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw `203210` or raw `210726` publication/replay, raw
`PR07B0D-215248` publication before owner replay and verified GitHub branch
audit,
`PR07B0D-205218`/`212232`/`213739` promotion, raw PR07D, raw deferred
publication, raw `HOLD-07C`, PR17, PR18, PR18x promotion,
`DIAG-HTTP-REJOIN-220755` promotion before product-owned replay,
reload-marker product promotion before replay, `DIAG-RELOAD-224313` or
`DIAG-SEARCH-225317` product
promotion before focused first-loss replay, broad consumer duplicate/noise
suppression, or extra browser lanes.
