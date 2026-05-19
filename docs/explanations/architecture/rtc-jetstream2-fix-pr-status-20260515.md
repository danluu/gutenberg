# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T04:32:55Z`

Trigger event:
`pr-split-2026-05-19T04-31-36Z-20260519T042241Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-19T04-31-36Z-20260519T042241Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

GitHub filing, rebuilt full-stack validation, broad final-stack fuzzing, and
publication of the current ready-set remain blocked.

The latest split-persona synthesis,
`pr-split-20260519T042241Z-synthesis.md`, supersedes the previous `040320Z`
wording. Six nonzero reports agree the old `023939Z`/`031951Z` ready/local lane
is not filing-clean. The replacement remains a lower-boundary held shape, but
the active Cycle426 evidence jobs have not yet produced durable closure:
`1000009` now has live rows failing at `BASE` and `PR01`, while
`6000007` should be treated as non-fileable base/pre-stack or harness-owned
unless a refreshed durable report contradicts the Cycle424 `BASE` failure. Do
not revive PR05E or a PR05B/PR05D correction unless lower rows later prove the
first durable failure really moves back to that boundary.

Current maintainer-facing split hypothesis:

```text
Ready/local lane:
PR01 -> PR02
  -> [1000009 / 6000007 lower-boundary owner gate]
  -> PR03 -> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
  -> PR06A -> PR06B -> PR06C -> PR06D
  + PR02A and PR06E sidecars

CRDT/data-loss lane:
PR09 -> PR10
  -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
  -> PR12A -> PR12B -> PR12C
  -> repaired PR13A -> repaired PR13B -> repaired PR13C
  -> PR14 -> PR14B -> PR15A -> PR15B -> PR15C

Harness-only sidecar:
HARNESS-WS-CONFIG-022004

Non-fileable owner queues:
PR07 owner comparison
strict 117126135e5e / seed 5400020 owner comparison
seed 1020002 final-stack repair/reclassification
reload-hydration / PERSISTENCE-PARITY-6000007
deferred search/rich-text/malformed-save/HTTP-room-isolation evidence
```

Treat `BASE`, `PR01`, and `PR02` rows as the next blocking evidence. If `PR02`
passes and `PR03` fails, split or repair `PR03` or insert a `PR03B` before
PR03. If `BASE`, `PR01`, or `PR02` fail, move ownership earlier or classify the
signal as base, harness, pre-stack, `PR01`, or `PR02`. The current live rows
already point below PR03 for `1000009` and at base/pre-stack/harness for
`6000007`, but the durable report/classification output has not caught up.
Do not create or preserve a PR05E/PR05B correction based only on stale Cycle424
prose.

Seed `1020002` still blocks only final-stack fuzzing, rebuilt stack-wide
validation, GitHub filing, and its own repair/reclassification. It must not
block the lower-boundary owner job, branch-link audits, push-manifest audits,
deferred downscope, or loop/control-plane repair.

Do not file grouped aggregate rows or stale/raw branches just because they
exist locally. Specifically keep raw `PR07D`, raw reload-hydration heads,
raw `003407`, raw `012938`, raw `020456`, stale `PR15D`, `PR17`, `PR18`,
`PR18x`, fallback/PR15-tailed `PR05D` manifests, and
`fix/rtc-fallback-group-delete-stale-local` / `d06e3528cbd` out of product PR
claims.

## Branch And Ref Status

Remote status was collected at `2026-05-19T04:32:55Z`.

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

The branch-link audit was generated at `2026-05-19T04:33:00Z` from fetched
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

### Ready/Local Lane

| PR | Scope | Audit branch link | Files / diff | Current status |
| --- | --- | --- | --- | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 files, +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 files, +57 / -5 | verified content |
| PR 2A | Ready sidecar after PR2 | No verified branch link yet | TBD | keep in split; needs exact pushed/audited ref |
| Owner gate | `1000009` / `6000007` lower-boundary owner decision before PR03 | No verified branch link yet | Evidence gate | current blocker; live rows point below PR03, but durable report/classification output is still missing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 files, +58 / -5 | verified content, but non-fileable until lower-boundary gate proves ownership |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 files, +160 / -1 | verified content, but non-fileable until lower-boundary gate proves ownership |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | held candidate; Cycle424 rows already fail before or at this boundary |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | held candidate; drop PR05B correction unless lower rows move first durable failure back here |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | held candidate; restack only after lower-boundary decision |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | held candidate; reject fallback-tail PR05D manifests |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | held active split row; downstream of unresolved lower gate |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | held active split row; progress ref is evidence only |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | held active split row |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | held; PR09 and PR06E must hang from this row after lower gate is fixed |
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
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 files, +1672 / -4 | repaired verified content |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 files, +345 / -51 | repaired verified content |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 files, +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | required before active PR15A-C; needs final-PR14B materialization/audit |
| PR 15A | Fallback-group move green on PR14B | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 files, +123 / -4 | verified component content; filing still waits on publication audit and owner gates |
| PR 15B | Fallback-group insert-anchor green on PR14B | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 files, +197 / -4 | verified component content; filing still waits on publication audit and owner gates |
| PR 15C | Fallback-group delete green on PR14B | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 files, +161 / -4 | canonical endpoint, but lower-boundary and `6000007` classification still block filing |

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
| Missing verified active refs | PR02A, lower-boundary owner gate, PR05A-D, PR06A-D, PR06E, PR11A-E, PR12A-C, PR14B, exact refreshed stack refs, `HARNESS-WS-CONFIG-022004` | active rows with no audit entry correctly say `No verified branch link yet`; old ready manifests are planning evidence only | Publish/fetch/audit explicit GitHub refs before filing or promoting any row, after the lower-boundary decision is known |
| ENTITY-SERIALIZATION-1000009 | seed `1000009`, `BASE`/PR01/PR02 lower-boundary, PR03/PR04/PR05A, PR05B/C/D/current PR15C | live Cycle426 rows now fail at `BASE` and `PR01`, but durable report/classification output has not caught up; not PR05-owned on current evidence | Finish durable lower-boundary classification before publishing PR03+; only move ownership back to PR05B/PR05D if lower rows later pass |
| PERSISTENCE-PARITY-6000007 / reload hydration | seed `6000007`, lower-boundary rows, PR03/PR04/PR05A, PR05B/C/D, current PR15C, clean reload-hydration heads, PR07 controls | treat as base/pre-stack or harness-owned unless a refreshed durable report contradicts the Cycle424 `BASE` failure; keep reload hydration non-fileable | Finish durable `BASE`, `PR01`, and `PR02` classification and require current endpoint controls before any reload/persistence promotion |
| Seed `1020002` WebSocket marker divergence | final-stack repair/reclassification lane | blocks final-stack fuzzing, filing, rebuilt validation, and its own repair/reclassification only | Repair or explicitly reclassify before final-stack validation and filing |
| PR07 runtime / owner gate | PR07A/B arms and raw PR07D variants | non-fileable owner-comparison fork | Require row-bearing owner matrices with first-divergence evidence, current endpoint controls, clean refs, and branch audit before promotion |
| Strict revision-restore signal | `117126135e5e`, seed `5400020`, PR03, held PR03B, PR07 arms | owner-comparison target only; current rows still do not assign ownership | Require row-bearing strict owner comparison against lower controls, PR07 arms, PR05B/C/D, PR14, and current PR15C before naming PR18x |
| PR15D endpoint/control | stale Cycle324/Cycle325/Cycle376 PR15D rows and later repaired endpoint manifests | blocked/control-only; current endpoint remains PR15C | Accept PR15D only with fresh current-base head/bundle/manifest proof after PR15C |
| Raw deferred manifests | raw `003407`, raw `020456`, raw `024016`, fallback/PR15-tail bases, raw `PR07D` | invalid PR progress; wrong/stale base or missing same-cycle allowlisted base/head/bundle/manifest agreement | Keep as no-progress unless a new audit proves clean allowlisted base, head/bundle/manifest agreement, and ownership/non-coverage |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against lower controls, PR04, PR05A, PR05B, PR05C, clean PR05D, the PR07 owner queue, PR14, and current PR15C |
| Duplicate/noise producer control-plane | family-aware producer holds, live process/source alignment, stale drain promotion, deep/live semantic family precedence | latest duplicate/noise synthesis finds producer/control-plane backpressure: represented product-evidence `reload_rejoin_awareness_stall` duplicates are still refilling, while `persisted_content_mismatch` must stay visible | Patch only scheduler/classification follow-up if authorized: verify current source is live, complete family-specific likely-real/product-evidence hold propagation, pause represented duplicate-family producers, and keep product-evidence cases visible |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T04:32:55Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T043040Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The latest raw novelty monitor status was written at
`2026-05-19T04:32:51.030Z` for
`run-20260519T043040Z`. It is startup-only:

```text
status: monitor started; full coverage pass pending
observed roots: 625
previous records loaded: 91607
supervisor groups file: 1
active run dirs: 1
health: startup status only; full novelty pass has not completed yet
```

Interpretation:

- Do not claim final-stack cleanliness. The newest novelty output is a startup
  heartbeat for active fuzz infrastructure, not validation of the accepted final
  PR stack.
- Because the raw novelty pass is pending, use the trend packet only as the
  latest completed aggregate evidence, not as a fresh current-run pass for the
  new `043040Z` root.
- Current fuzz health does not clear PR filing, exact branch-link gaps, the
  lower-boundary owner replay, PR07 owner replay, strict owner replay, PR15C
  owner reductions, PR15D control-only endpoint repair,
  `PERSISTENCE-PARITY-6000007`, seed `1020002`, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T04:22:09Z`:

```text
monitor passes: 2321
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-19T03:59:26Z
coverage files: 272 -> 55982
coverage files delta: 55710
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3406
summary startup failures last: 0
quality issues last: 0
memory free: 418.7 GB
load averages: 70.36 / 70.97 / 68.78 on 64 cores
enabled group current: novelty-ws-permissions-auth-locks
latest fuzz level mix:
  browser-e2e=28 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6087855
browser-e2e likely-real findings: 785 over 2635.9 runner-hours
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

The current split-persona synthesis, `pr-split-20260519T042241Z-synthesis.md`,
supersedes the older `040320Z`, `035309Z`, `033443Z`, `032351Z`, and `030649Z`
wording where they differ:

- The old `023939Z`/`031951Z` ready/local lane is not filing-clean. The current
  replacement is a lower-boundary held shape: `PR01 -> PR02 -> [1000009 /
  6000007 lower-boundary owner gate] -> PR03 -> PR04 -> PR05A -> PR05B ->
  PR05C -> clean PR05D -> PR06A-D`, plus PR02A and PR06E sidecars.
- Do not publish `PR03+`, `PR05B-D`, `PR06A-D`, `PR07`, `PR17`, `PR18`,
  `PR18x`, raw reload hydration, or the old `023939Z`/`031951Z` manifests as
  filing-ready.
- `PERSISTENCE-PARITY-6000007` should be treated as non-fileable base/pre-stack
  or harness-owned unless a refreshed durable report contradicts the Cycle424
  `BASE` failure.
- `ENTITY-SERIALIZATION-1000009` is also not PR05-owned on current evidence.
  Live Cycle426 rows now show it failing on `BASE` and `PR01`, but the durable
  classification/report output has not caught up.
- Drop PR05E unless lower rows later prove the first durable failure really
  moves back to PR05B or clean PR05D.
- Keep the active Cycle426 lower-boundary and strict-owner jobs moving, but do
  not count launched jobs, header-only TSVs, stale reports, zero-byte outputs,
  missing reports, or `report.tmp` as progress. A launched job counts for one
  cycle only unless it produces row-bearing artifacts.
- Seed `1020002` still blocks final-stack filing/fuzzing, rebuilt validation,
  and its own repair/reclassification, but it must not serialize independent
  owner/audit work.
- Keep PR07, raw reload hydration, strict `117126135e5e`, PR15D, PR17, PR18,
  PR18x, fallback/PR15-tailed PR05D manifests, and raw deferred heads
  non-fileable.

The latest duplicate/noise persona file,
`duplicate-noise-20260519T040043Z-synthesis.md`, is the current completed
control-plane signal:

- Strict `pre_action_bootstrap_stall` is no longer the main expensive-consumer
  leak; it is already suppressed or rejected by triage, analysis,
  deep-analysis, and live-analysis.
- The remaining issue is producer/control-plane backpressure:
  `novelty-ws-block-gauntlet` can keep generating represented product-evidence
  duplicate `reload_rejoin_awareness_stall` siblings while a separate
  likely-real `persisted_content_mismatch` must stay visible.
- The next control-plane pass should verify current process/source alignment,
  complete family-specific likely-real/product-evidence hold propagation, pause
  already-represented duplicate-family producers, fix no-producer-match
  sentinels, and gate live-analysis drain promotion to actionable,
  unrepresented product-evidence work.
- Product-evidence likely-real cases, especially `persisted_content_mismatch`,
  must remain visible. This is harness/control-plane health context, not
  product validation.

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

1. Use the replacement shape above, but hold PR03+ until the lower-boundary
   owner job adds durable `BASE`, `PR01`, and `PR02` classification for seeds
   `1000009` and `6000007`.
2. If `PR02` passes and `PR03` fails, split or repair PR03 or insert PR03B
   before PR03. If `BASE`, `PR01`, or `PR02` fail, move ownership earlier or
   classify as base, harness, pre-stack, `PR01`, or `PR02`.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`, including `HARNESS-WS-CONFIG-022004` if it
   is to be filed as a harness-only sidecar.
4. Repair or explicitly reclassify seed `1020002` before rebuilt stack-wide
   validation, broad final-stack fuzzing, or GitHub filing.
5. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, only the corrected
   clean PR05D path, and PR15A/B/C after final PR14B materialization.
6. Use only the repaired PR13A/PR13B/PR13C audit links listed above as PR13
   content links. Do not use stale/misordered PR13 refs.
7. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
8. After owner reductions, exact branch-link audit for missing rows, PR15C
   endpoint materialization, PR15D control-only proof or fresh rejection,
   reload-marker replay/downscope, seed `1020002` repair or reclassification,
   upstream rebase, and PR CI land, rebuild the combined validation stack from
   explicit accepted heads. Then run focused checks, touched-file lint, branch
   graph and containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

Useful bounded work now:

- continue the active `rtc-cycle426-pr02-entity-persistence-lower-boundary` job
  for seeds `1000009` and `6000007` on `BASE`, `PR01`, and `PR02`; if it exits
  stale, launch exactly one bounded continuation that finishes durable
  classification and consumes `6000007` BASE/PR01/PR02 evidence;
- continue the active `rtc-cycle426-strict-117126-owner-comparison` job for
  strict seed `5400020`; if it exits stale, launch exactly one bounded
  continuation that completes PR05C, clean PR05D, PR14, current PR15C, and
  PR07B/PR07C comparisons before any PR18x naming;
- patch the controller/progress gate so lower failing rows force
  lower-boundary classification, not PR05E text; zero-byte reports,
  header-only TSVs, active seed `1020002`, duplicate PR07C jobs, stale
  manifests, wait-only feedback, and launched jobs without row-bearing output
  count as no durable progress;
- rerun or create a fresh manifest/ref audit only after the lower-boundary
  decision and repaired branch exist;
- keep duplicate/noise follow-up narrow: family-aware producer holds,
  startup-noise refill fail-closed behavior, block-gauntlet duplicate-family
  handling, and explicit source-family precedence only; do not add broad
  suppression while product-evidence signatures remain visible/capped.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, seed `1020002` outside focused diagnostic replay, duplicate
owner-reduction jobs, raw deferred publication/replay, raw PR07D, raw
`HOLD-07C`, raw `003407`, raw `020456`, raw `024016`, reload-hydration filing
before `PERSISTENCE-PARITY-6000007` owner replay/gate repair, PR17, PR18,
PR18x promotion, PR15D promotion from stale endpoint evidence, diagnostic
product promotion before focused first-loss replay, broad consumer
duplicate/noise suppression, or extra browser lanes.
