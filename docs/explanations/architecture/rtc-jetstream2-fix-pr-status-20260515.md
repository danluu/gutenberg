# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T07:06:24Z`

Trigger event:
`pr-split-2026-05-19T07-04-05Z-20260519T065428Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-19T07-04-05Z-20260519T065428Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest split-persona synthesis, `pr-split-20260519T065428Z-synthesis.md`,
keeps the Cycle436 / `044015Z` replacement split as the consensus fileable
shape. The stack is blocked, but not idle: strict `8fb598778357` / seed
`6000007` still lacks durable owner evidence, seed `1020002` still blocks
final-stack validation and filing, and a new reload-hydration candidate at
`ba186c18166b` exists but is not fileable. The Cycle438 pass verified the
pre-save-search/live-collapse diagnostic manifest, but it remains
diagnostic-only and still needs focused replay/validation before any product
promotion; the rich-text suffix diagnostic branch still needs fresh
row-bearing hardening or replay evidence.

- `RLH-A`, raw reload-hydration heads, raw `PR07D`, stale `PR07C`, stale
  `PR15D`, `PR17`, `PR18`, and `PR18x` stay non-fileable.
- Strict `8fb598778357` / seed `6000007` is now the top owner-comparison queue,
  not a named PR. The active strict owner job is alive and has begun rows, but
  it still has no top-level `report.md` or classification rows, so it is not
  durable owner evidence yet.
- Strict `c5c009f618b2` / seed `6000034` remains the next bounded
  owner-comparison queue, but should not start until the `8fb598778357` matrix
  has durable classification or fails cleanly.
- `deferred/rtc-reload-hydration-20260519T063921Z` at `ba186c18166b` is a
  gated candidate only. If current-base audit and strict replay clear it, the
  replacement split should restack it as `PR06F` after `PR06D`; until then it
  is evidence-only.
- Strict `117126135e5e` / seed `5400020`, pre-save search/live-collapse, and
  rich-text suffix remain unnamed diagnostic queues; do not create `PR18x`.

Current maintainer-facing split hypothesis:

```text
Main ready lane:
  PR01 -> PR02 -> PR03 -> PR04 -> PR05A -> PR05B -> PR05C
  -> clean PR05D -> PR06A -> PR06B -> PR06C -> PR06D
  + PR02A and PR06E sidecars

CRDT/data-loss lane:
  PR09 -> PR10
  -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
  -> PR12A -> PR12B -> PR12C
  -> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
  -> PR14 -> PR14B -> PR15A -> PR15B -> PR15C

Harness-only sidecar:
  HARNESS-WS-CONFIG-022004

Non-fileable or evidence-only:
  ENTITY-SERIALIZATION-1000009
  strict 8fb598778357 / seed 6000007 owner comparison
  strict c5c009f618b2 / seed 6000034 owner comparison after 8fb settles
  strict 117126135e5e / seed 5400020 unnamed diagnostic queue
  PR06F candidate ba186c18166b / deferred reload hydration, gated on replay
  seed 1020002 repair/reclassification
  RLH-A, raw reload hydration, raw PR07D, stale PR07C, stale PR15D
  PR17, PR18, PR18x
  fallback/PR15-tailed PR05D manifests
  raw deferred search/rich-text/malformed-save/HTTP-room-isolation evidence
```

The ready local branch set is still the Cycle428/Cycle430 `044015Z`/`061047Z`
artifact family: the current synthesis keeps the `35` fresh non-base rows in
`latest-local-publish-manifest.tsv`, backed by the Cycle428 audit with `36`
ready rows including `BASE`, `0` blocked rows, and `0` already-published rows.
Treat that as local publication and audit evidence only; it is not GitHub
filing, CI, upstream rebase, final-stack validation, or a substitute for
verified branch-link audit rows.

Cycle432 reload replay is now row-bearing and reached the browser oracle:
current `PR15C`, `RLH-CLEAN`, `PR07B0`, and `PR07C` all fail seeds `6000007`
and `966001`. That keeps reload hydration evidence-only/downscope; it does not
promote `RLH-A`, raw reload branches, `PR07D`, `PR17`, `PR18`, or `PR18x`.
The `060902Z` reload-hydration report is non-empty, but it is unit/format
validation only and is based on validation head `72854f05ed2`; treat it as
candidate/control evidence, not a fileable PR. The newer
`deferred/rtc-reload-hydration-20260519T063921Z` head at `ba186c18166b` is
also non-fileable today; it can become `PR06F` only after current-base audit
and strict replay clear it against `6000007` plus relevant controls.
Strict/rich-text/parser reductions also cannot name `PR18x` until plausible
earlier owners, especially `PR05B`, `PR05C`, and clean `PR05D`, have been
compared.

The controller progress-gate patch moved forward since the previous report:
the fixture test set passed `48/48`, and the latest synthesis reports a
non-header verdict row. The remaining loop rule is policy, not basic
activation: strict likely-real signals must become actionable Parallel Progress
Gate rows, and a failed deep triage with `process-missing` must relaunch once
or create a bounded repro job instead of being treated as progress because a
queue is merely active.

The duplicate/noise pass also moved forward. The latest
`duplicate-noise-20260519T061546Z-feedback-action.md` implemented a bounded
fuzzer-side remediation, not product-code or PR-branch changes: seed-drain
startup stalls now stay paused with durable no-analysis cooldown, novelty
monitor startup restores seed-drain sentinels before supervisor launch and can
rescue empty current-run materialization, and exact
`rtc_test_ws_runtime_config_port_bleed` signatures are family-capped across
triage, analysis, deep-analysis, and live-analysis. `node --check` passed on
all six touched `.mjs` files and the synthetic endpoint-mismatch fixture stayed
out of analysis/deep/live startup. The remaining risk is deliberately narrow:
`rtc-browser-fuzz-runner.mjs` was outside that action's allowed edit list, so
some browser work may still start before supervisor/consumer gates observe a
leaking family. The latest duplicate/noise synthesis keeps this as
control-plane work and recommends a narrow product-preserving no-analysis
sentinel plus novelty hold-family updates if the fresh run still refills
startup/no-product or endpoint-mismatch producers.

Seed `1020002` still blocks final-stack fuzzing, rebuilt stack-wide validation,
GitHub filing, and its own repair/reclassification. It must not serialize
independent branch audits, deferred closeout, strict owner comparison, or loop
repair.

## Branch And Ref Status

Remote status was collected at `2026-05-19T07:06:20Z`.

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

The branch-link audit was generated at `2026-05-19T07:06:24Z` from fetched
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

### Main Ready Lane

| PR | Scope | Audit branch link | Files / diff | Current status |
| --- | --- | --- | --- | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 files, +181 / -19 | verified content; Cycle428 local manifest audit complete; GitHub filing still blocked |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 files, +57 / -5 | verified content; Cycle428 local manifest audit complete; GitHub filing still blocked |
| PR 2A | HTTP room-isolation sidecar | No verified branch link yet | TBD | active sidecar candidate; needs deferred closeout proof that it covers HTTP room isolation and a pushed/audited ref |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 files, +58 / -5 | verified content; released by lower-boundary classification and local manifest audit |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 files, +160 / -1 | verified content; Cycle428 local manifest audit complete; GitHub filing still blocked |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | active split row in Cycle428 manifest; aggregate PR5 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | active split row; compare strict/rich-text signals here before naming PR18x |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | active split row; compare strict/rich-text signals here before naming PR18x |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | active split row; must stay the clean semicolonless/entity branch; reject fallback/PR15-tailed PR05D manifests |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | active split row; do not confuse with the older persisted-empty-content PR6A audit row |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | active split row; progress branch is evidence only |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | active split row |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | active split row; PR09 and PR06E ancestry still need GitHub branch-link proof before filing |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | sidecar must hang from PR06D, not PR07; needs deferred closeout proof that it covers malformed-save |
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
| PR 15C | Fallback-group delete green on PR14B | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 files, +161 / -4 | canonical endpoint; Cycle432 reload replay failures mean reload hydration is still an owner-comparison/evidence queue, not a PR15C filing blocker by itself |

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
| Missing verified active refs | PR02A, PR05A-D, PR06A-D, PR06E, PR11A-E, PR12A-C, PR14B, exact refreshed stack refs, `HARNESS-WS-CONFIG-022004` | active rows with no branch-link audit entry correctly say `No verified branch link yet`; local `044015Z` manifest evidence is not a verified GitHub branch-link audit | Publish/fetch/audit explicit GitHub refs for every active row that still lacks a verified branch link |
| ENTITY-SERIALIZATION-1000009 | seed `1000009`, lower-boundary rows | completed lower-boundary evidence classifies this as `base-or-harness-pre-stack`, not a PR02/PR05/PR07/PR18x product owner | Keep out of product PR split unless a newer row-bearing report contradicts the classification |
| Strict persistence parity owner queue | strict `8fb598778357`, seed `6000007` | top non-`1020002` owner-comparison queue, not a named PR; active Cycle436 job is alive and has begun rows, but still lacks nonempty `report.md` plus row-bearing `classification.tsv` evidence | Let the current owner comparison continue; launch exactly one bounded continuation only if it exits or stalls without durable artifacts, covering `PR06D`, current `PR15C`, `RLH-CLEAN`, `PR07B0`, `PR07C`, `PR14`, base/harness, and earlier PR05/PR06 controls |
| Next strict owner queue | strict `c5c009f618b2`, seed `6000034` | next strict likely-real owner-comparison queue; not a named PR and not `PR18x` | Do not launch until `8fb598778357` has durable classification or clean failure |
| Unnamed strict diagnostic | strict `117126135e5e`, seed `5400020` | remains unnamed; no `PR18x` until earlier plausible owners are compared | Keep as diagnostic evidence until owner replay proves a product-owned branch |
| RLH-A / reload hydration | `RLH-A`, raw reload heads, `RLH-CLEAN`, `PR07B0`, `PR07C`, `deferred/rtc-reload-hydration-20260519T063921Z` at `ba186c18166b` | evidence-only/downscope; Cycle432 row-bearing replay shows `PR15C`, `RLH-CLEAN`, `PR07B0`, and `PR07C` all fail seeds `6000007` and `966001`; the new `ba186c18166b` manifest is useful but base `72854f05...` is not the current fileable stack | Keep raw reload and PR07 arms out of filing; if `ba186c18166b` clears current-base audit and strict replay against `6000007` plus relevant controls, restack it as gated `PR06F` after `PR06D` |
| Seed `1020002` WebSocket marker divergence | final-stack repair/reclassification lane | blocks final-stack fuzzing, filing, rebuilt validation, and its own repair/reclassification only | Repair or explicitly reclassify before final-stack validation and filing; do not serialize independent work behind it |
| PR07 runtime / owner gate | PR07A/B arms and raw PR07D variants | non-fileable owner-comparison fork; raw `PR07D` remains excluded | Require row-bearing owner matrices with first-divergence evidence, current endpoint controls, clean refs, and branch audit before promotion |
| Deferred closeout | PR02A HTTP room isolation, PR06E malformed-save, RLH-A downscope | latest synthesis asks for a fresh deferred-gate closeout newer than `2026-05-19T05:52:46Z` | Verify PR02A covers HTTP room isolation, PR06E covers malformed-save, and RLH-A is recorded as downscope/evidence-only |
| Pre-save search/live-collapse | search/live-collapse candidates, diagnostic branch around `5cc25e...` | Cycle438 pre-save diagnostic hardening verified base/head/manifest agreement and `diff_check=pass`; this is local-machine diagnostic publication evidence only, not product promotion | Run focused replay/validation before adding any PR row |
| PR05E and rich-text/parser reductions | PR05E text, rich-text suffix around `868cd...`, parser/linebreak candidates, `PR18x` | rich-text suffix remains diagnostic and still needs fresh row-bearing hardening or replay output; latest guidance still says do not name `PR18x` until PR05B/PR05C/clean PR05D and other plausible owners are compared | Harden the diagnostic manifest first, then compare against lower controls and clean split heads before promotion |
| PR15D endpoint/control | stale Cycle324/Cycle325/Cycle376 PR15D rows and later repaired endpoint manifests | blocked/control-only; current endpoint remains PR15C | Accept PR15D only with fresh current-base head/bundle/manifest proof after PR15C |
| Raw deferred manifests | raw `003407`, raw `020456`, raw `024016`, fallback/PR15-tail bases, raw `PR07D` | invalid PR progress; wrong/stale base or missing same-cycle allowlisted base/head/bundle/manifest agreement | Keep as no-progress unless a new audit proves clean allowlisted base, head/bundle/manifest agreement, and ownership/non-coverage |
| Duplicate/noise producer control-plane | no-product `pre_action_bootstrap_stall`, endpoint-mismatch port bleed, `fuzz_helper_rest_endpoint_construction`, supervisor seed-drain recovery, novelty bootstrap/admission | latest duplicate/noise synthesis says the remaining leak is producer/control-plane side: consumers mostly reject strict no-product startup noise, but mixed runs can still proceed below the dominance threshold; the prior `061546Z` action already added seed-drain cooldown, novelty sentinel restore/rescue, and exact endpoint-mismatch family-capping | Consume the first full pass for `run-20260519T070429Z`; if startup/no-product or endpoint-mismatch producers still refill, prefer a narrow product-preserving no-analysis sentinel and novelty hold-family update over broad runner suppression |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T07:06:20Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T070429Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The latest raw novelty monitor status was written at
`2026-05-19T07:05:40.040Z` for `run-20260519T070429Z`. It is startup status
only; the full coverage pass has not completed:

```text
observed roots: 639
previous records loaded: 92393
supervisor groups file: 1
active run dirs: 1
unmet goals: pending until first pass
triage signatures: pending until first pass
likely-real visible: pending until first pass
quality issues: pending until first pass
```

Interpretation:

- Do not claim final-stack cleanliness. The newest novelty output is current
  startup infrastructure status, not validation of the accepted final PR stack
  or a completed duplicate/noise validation pass.
- The bounded duplicate/noise remediation still needs a full pass on the fresh
  root to prove producer refill is stable under load.
- Current fuzz health does not clear PR filing, exact branch-link gaps, PR07
  owner replay, strict owner replay, reload-hydration downscope, seed
  `1020002`, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T06:53:25Z`:

```text
monitor passes: 2333
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-19T06:04:39Z
coverage files: 272 -> 36
coverage files delta: -236
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0
summary startup failures last: 0
quality issues last: 0
enabled group: novelty-ws-parser-transform
memory free: 413.5 GB
load averages: 68.62 / 71.17 / 75.37 on 64 cores
latest fuzz level mix:
  browser-e2e=28 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6151768
browser-e2e likely-real findings: 789 over 2695.1 runner-hours
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
zero likely-real output. Load is high enough that new fuzz work should stay
bounded and oracle-specific rather than increasing broad browser concurrency.
The graph-derived enabled-group row is from the `06:53:25Z` trend packet and
matches the latest duplicate/noise action state: `novelty-ws-parser-transform`
is active while `novelty-ws-long-session-large-doc` remains paused as reusable
startup noise.

## Status-Persona Analysis

The current split-persona synthesis, `pr-split-20260519T065428Z-synthesis.md`,
supersedes `063936Z`, `063036Z`, `061132Z`, `060311Z`, `054713Z`,
`053603Z`, `052241Z`, `051407Z`, `045950Z`, `045031Z`, `043141Z`, and earlier
wording where they differ:

- Keep the Cycle436 / `044015Z` fileable lanes as the review shape: main
  `PR01`-`PR06D` plus `PR02A`/`PR06E`, CRDT `PR09`-`PR15C`, and the
  harness-only `HARNESS-WS-CONFIG-022004` sidecar.
- Keep `RLH-A`, raw reload hydration, raw `PR07D`, stale `PR15D`, `PR17`,
  `PR18`, `PR18x`, `PR05E`, and fallback-tail `PR05D` non-fileable.
- Treat strict `8fb598778357` / seed `6000007` as the top owner-comparison
  queue, not a named PR. The active job is alive and has begun rows, but still
  lacks nonempty `report.md` plus row-bearing `classification.tsv`, so it is
  not durable owner evidence.
- Do not duplicate the active `8fb598778357` job. If it exits without durable
  classification, the replacement should be one bounded continuation covering
  `PR06D`, current `PR15C`, `RLH-CLEAN`, `PR07B0`, `PR07C`, `PR14`,
  base/harness, and earlier PR05/PR06 controls.
- Do not launch strict `c5c009f618b2` / seed `6000034` until `8fb598778357`
  has durable classification or clean failure. Keep strict `117126135e5e` /
  seed `5400020` unnamed.
- Treat deferred reload-hydration candidate
  `deferred/rtc-reload-hydration-20260519T063921Z` at `ba186c18166b` as a
  gated non-fileable candidate. If it clears current-base audit and strict
  replay, restack it as `PR06F` after `PR06D`; do not use its
  `72854f05...` base as current fileable-stack proof.
- Treat the `progress-unblock-20260519T063031Z` pre-save-search branch around
  `5cc25e...` and rich-text suffix branch around `868cd...` as diagnostic
  publication evidence only. The pre-save branch now has Cycle438
  base/head/manifest and `diff_check=pass` hardening; the rich-text suffix
  branch still needs equivalent hardening. Both need focused replay/validation
  before product promotion.
- Keep `PR05D` as the clean semicolonless/entity branch; reject manifests
  based on `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or
  fallback/PR15 tails.
- Seed `1020002` blocks final-stack fuzzing, stack-wide validation, and filing
  only. It must not block independent branch audits, diagnostic publication,
  deferred closeout, strict owner comparison, or loop repair.
- Repair the loop/gate accounting if the next cycle treats wait-only feedback,
  active sessions, stderr growth, header-only matrices, zero-byte reports,
  setup smoke, prompt-only PASS rows, duplicate diagnostic heads, stale
  PR07C/HOLD-07C state, wrong-family artifacts, or stale manifests as real
  progress while actionable gate rows exist. PR07 owner matrices must be keyed
  by arm set, branch head, report timestamp, and seed set.

The latest duplicate/noise synthesis,
`duplicate-noise-20260519T065124Z-synthesis.md`, still classifies the live
problem as producer/control-plane noise rather than confirmed RTC product
failure. Its paired `061546Z` feedback action is nonempty and records a
completed bounded fuzzer-side remediation:

- Supervisor seed-drain startup stalls now remain paused with durable
  no-analysis cooldown instead of recovering and relaunching the same family.
- The novelty monitor restores seed-drain no-analysis sentinels before
  supervisor start and rescues empty current-run materialization before
  historical fallback.
- Triage, analysis, deep-analysis, and live-analysis now family-cap exact
  `rtc_test_ws_runtime_config_port_bleed` endpoint-mismatch signatures. The
  matcher is intentionally narrow: explicit endpoint-mismatch text or the
  trimmed exact throw-site plus fuzz-only test title.
- `node --check` passed on all six changed `.mjs` files. A synthetic endpoint
  mismatch fixture produced signature `2f9461a181b9`, was classified as
  `family-capped`, and launched `0` analysis/deep jobs; live analysis returned
  `skipped-analysis-no-actionable-signature`.
- Active coverage-guided novelty/supervisor/live-analysis processes had
  already restarted at `2026-05-19T06:45:05Z`, after the patched file mtimes,
  so the action did not kill additional active sessions. At action time the
  active output was `run-20260519T064455Z`, the active group was
  `novelty-ws-parser-transform`, two endpoint-bleed signatures were
  family-capped with analysis/deep counts `{}`, and
  `novelty-ws-long-session-large-doc` stayed paused as reusable
  `pre_action_bootstrap_stall` noise until `2026-05-19T11:22:54.717Z`.

The newest synthesis says the smallest safe follow-up is sentinel-first, not a
broad pause/kill of mixed product-evidence producers: add a product-preserving
no-analysis sentinel path for strict startup/no-product records when they cross
a count threshold, and add `rtc_test_ws_runtime_config_port_bleed` plus likely
`fuzz_helper_rest_endpoint_construction` to the novelty producer-hold family
set. Consume the first full novelty pass for `run-20260519T070429Z`; if
no-product startup or endpoint-mismatch producers still refill, use that narrow
producer/refill fix. Do not broaden suppression to generic WebSocket, startup,
awareness, or `waitForSyncCycle` failures.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance,
and old PR13 GitHub-ref caveats are superseded by the current branch-link
audit, the repaired PR13 review refs, the `065428Z` split synthesis, and the
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
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

Useful bounded work now:

- let the active strict `8fb598778357` / seed `6000007` owner comparison
  continue, currently named
  `rtc-cycle436-strict-8fb598778357-persistence-parity-owner-comparison-current-endpoint`;
- launch exactly one replacement strict `8fb598778357` job only if the current
  session exits or stalls without the required row-bearing outputs, covering
  `PR06D`, current `PR15C`, `RLH-CLEAN`, `PR07B0`, `PR07C`, `PR14`,
  base/harness, and earlier PR05/PR06 controls;
- do not launch strict `c5c009f618b2` / seed `6000034` until
  `8fb598778357` has durable classification or clean failure;
- run a fresh deferred-gate closeout newer than `2026-05-19T05:52:46Z` to
  verify PR02A covers HTTP room isolation, PR06E covers malformed-save, and
  `RLH-A` is downscope/evidence-only;
- run bounded publish/audit/replay for
  `deferred/rtc-reload-hydration-20260519T063921Z` at `ba186c18166b`; promote
  it only as `PR06F` after `PR06D` if current-base audit and strict replay
  clear it;
- harden the remaining rich-text suffix diagnostic manifest from
  `progress-unblock-20260519T063031Z`, and run focused replay/validation for
  the already-hardened pre-save diagnostic branch before product promotion;
- continue seed `1020002` repair or proof-based reclassification without
  converting it into a wait-only progress loop;
- consume the first full novelty pass for `run-20260519T070429Z` after the
  `061546Z` duplicate/noise remediation; require no active queued
  startup/no-product analysis, no uncapped endpoint-mismatch analysis, and no
  duplicate-family producer refill before treating the producer-side fix as
  stable;
- if duplicate/noise refill persists, apply the latest sentinel-first
  producer-control fix rather than broad consumer suppression;
- repair the loop/gate accounting if another cycle accepts wait-only or
  wrong-family feedback while actionable gate rows remain.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, a wait-only seed `1020002` loop, duplicate lower-boundary work,
duplicate reload-hydration owner replays, raw deferred publication, raw PR07D,
raw `HOLD-07C`, raw `003407`, raw `020456`, raw `024016`, reload-hydration
filing before clean-head replay, PR17, PR18, PR18x promotion, PR15D promotion
from stale endpoint evidence, diagnostic product promotion before focused
first-loss replay, broad consumer duplicate/noise suppression, or extra
browser lanes.
