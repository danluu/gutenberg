# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T03:51:59Z`

Trigger event:
`duplicate-noise-2026-05-19T03-44-56Z-234`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-19T03-44-56Z-234/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Still blocked for GitHub filing and broad final-stack validation. The old
linear tail `PR07 -> PR17 -> PR18/PR18x` is replaced by the Cycle420/422
split shape, refreshed in `finalized/rtc-pr-stack-20260519T031951Z`, but the
latest split-persona synthesis, `pr-split-20260519T033443Z-synthesis.md`,
adds a new PR05/parser-entity gate before `PR06A`.

The key status change is seed `1000009`: Cycle420 now has a real nonzero
`report.md` and row-bearing TSV evidence showing the same
`entity-serialization-mismatch:tag-escaping-nbsp-semicolonless-entities` on
`PR05B`, `PR05C`, clean `PR05D`, and current `PR15C`. That means clean
`PR05D` is not the completion point for the parser/entity area. The next split
should insert a PR05 parser/entity serialization fix, or a PR05B correction,
after clean `PR05D` and before `PR06A`. The exact slot name depends on the
next owner-boundary rows for `PR04` and `PR05A`.

Seed `1020002` still blocks final-stack fuzzing, rebuilt stack-wide
validation, GitHub filing, and its own repair/reclassification only. It must
not block independent owner-boundary work, branch-link audits, manifest
audits, deferred downscope, or loop/control-plane repair.

The duplicate/noise trigger did not change the product PR split. It completed
the bounded control-plane fix for startup-stall duplicate/noise scheduling:
no-product strict startup signatures now remain suppressed, product-evidence
signatures remain visible/capped, and novelty/supervisor/watchdog freshness was
validated after restart. This is harness/control-plane progress, not product
validation or final-stack cleanliness.

Current maintainer-facing split hypothesis:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A sidecar
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR05E/parser-entity serialization fix or PR05B correction
-> PR06A -> PR06B -> PR06C -> PR06D
  + PR06E sidecar

CRDT/data-loss lane:
PR09 -> PR10
-> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> repaired PR13A -> repaired PR13B -> repaired PR13C
   (the earlier PR13B0-B3 finer split remains planning-only until exact
   verified links exist)
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C

Harness-only sidecar:
HARNESS-WS-CONFIG-022004

Non-fileable owner queues:
ENTITY-SERIALIZATION-1000009 owner boundary
PERSISTENCE-PARITY-6000007 / reload-hydration owner boundary
PR07 owner comparison
strict 117126135e5e / seed 5400020 owner comparison
seed 1020002 final-stack repair/reclassification
```

Do not file grouped aggregate rows or stale/raw branches just because they
exist locally. Specifically keep raw `PR07D`, raw reload-hydration heads,
raw `003407`, raw `012938`, raw `020456`, stale `PR15D`, `PR17`, `PR18`,
`PR18x`, fallback/PR15-tailed `PR05D` manifests, and
`fix/rtc-fallback-group-delete-stale-local` / `d06e3528cbd` out of product PR
claims.

## Branch And Ref Status

Remote status was collected at `2026-05-19T03:51:59Z`.

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

The branch-link audit was generated at `2026-05-19T03:52:05Z` from fetched
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
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 files, +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 files, +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | needs owner-boundary replay against seed `1000009` |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | seed `1000009` fails here; likely boundary candidate |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | seed `1000009` still fails here |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | clean `PR05D` still fails seed `1000009`; reject fallback-tail PR05D |
| PR 5E / PR05B correction | Parser/entity serialization correction after clean PR05D | No verified branch link yet | TBD | new recommended slot unless `PR04` / `PR05A` rows prove an earlier boundary |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | active PR06A-D split row; do not substitute grouped PR06 |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | active PR06A-D split row; progress ref is evidence only |
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
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 files, +1672 / -4 | repaired verified content |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 files, +345 / -51 | repaired verified content |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 files, +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | required before active PR15A-C; needs final-PR14B materialization/audit |
| PR 15A | Fallback-group move green on PR14B | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 files, +123 / -4 | verified component content; filing still waits on publication audit and owner gates |
| PR 15B | Fallback-group insert-anchor green on PR14B | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 files, +197 / -4 | verified component content; filing still waits on publication audit and owner gates |
| PR 15C | Fallback-group delete green on PR14B | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 files, +161 / -4 | canonical endpoint, but seeds `1000009` and `6000007` still block filing |

### Verified Prior Art, Not Active Proposed Rows

These rows have verified audit links, but they are not the exact active
micro-split PR rows unless the status says so.

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-E split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 6B progress | Malformed save request payload minimal branch | [`danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal) | verified progress branch; evidence only, not a substitute for PR06A-D/PR06E placement proof |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07 owner fork |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07 owner fork |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 13B0-B3 finer split | Source-family finer split after PR13A | No verified branch link yet | planning-only until exact repaired B0/B1/B2/B3 refs are pushed and audited |

## Deferred Or Evidence-Only Work

These rows must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified active refs | PR02A, PR05A-E/correction, PR06A-D, PR06E, PR11A-E, PR12A-C, PR14B, exact `031951Z` stack refs, `HARNESS-WS-CONFIG-022004` | active rows with no audit entry correctly say `No verified branch link yet`; `023939Z` audit is planning evidence only | Publish/fetch/audit explicit GitHub refs before filing or promoting any row |
| ENTITY-SERIALIZATION-1000009 | seed `1000009`, PR05B/PR05C/clean PR05D/current PR15C | Cycle420 now has nonzero report and row-bearing TSVs proving those heads fail with the same entity serialization mismatch | Run bounded owner comparison on `PR04` and `PR05A`; if they pass and `PR05B` fails, add/split the PR05 correction before `PR06A` |
| PERSISTENCE-PARITY-6000007 / reload hydration | seed `6000007`, PR03/PR04/PR05A boundary, PR05B/C/D, current PR15C, clean reload-hydration heads, PR07 controls | non-fileable owner queue; current controls still show marker/root-block divergence | Replay `PR03`, `PR04`, `PR05A`, and enough existing controls to find first pass/fail boundary; keep reload hydration non-fileable |
| Seed `1020002` WebSocket marker divergence | final-stack repair/reclassification lane | blocks final-stack fuzzing, filing, rebuilt validation, and its own repair/reclassification only | Repair or explicitly reclassify before final-stack validation and filing |
| PR07 runtime / owner gate | PR07A/B arms and raw PR07D variants | non-fileable owner-comparison fork | Require row-bearing owner matrices with first-divergence evidence, current endpoint controls, clean refs, and branch audit before promotion |
| Strict revision-restore signal | `117126135e5e`, seed `5400020`, PR03, held PR03B, PR07 arms | owner-comparison target only; current rows still do not assign ownership | Require row-bearing strict owner comparison against PR03, held PR03B, PR07 arms, PR05B, PR05C, clean PR05D, PR14, and current PR15C before naming PR18x |
| PR15D endpoint/control | stale Cycle324/Cycle325/Cycle376 PR15D rows and later repaired endpoint manifests | blocked/control-only; current endpoint remains PR15C | Accept PR15D only with fresh current-base head/bundle/manifest proof after PR15C |
| Raw deferred manifests | raw `003407`, raw `020456`, raw `024016`, fallback/PR15-tail bases, raw `PR07D` | invalid PR progress; wrong/stale base or missing same-cycle allowlisted base/head/bundle/manifest agreement | Keep as no-progress unless a new audit proves clean allowlisted base, head/bundle/manifest agreement, and ownership/non-coverage |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR04, PR05A, PR05B, PR05C, clean PR05D, the PR07 owner queue, PR14, and current PR15C |
| Duplicate/noise producer control-plane | mixed startup-stall recovery, novelty materialization/fallback/canary scope, product-evidence duplicate-family drain visibility | bounded fix applied in `20260519T031512Z`: changed supervisor/novelty/session-watchdog/triage-watcher control scripts, passed `node --check`, gate-only triage, active-output scan, live-analysis `--once`, and restarted novelty/supervisor/live-analysis/watchdog sessions | Monitor post-restart current-run triage freshness and active scope; do not add broad suppression while product-evidence signatures remain visible/capped |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T03:51:59Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T032703Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-19T03:51:18.303Z` for
`run-20260519T032703Z`:

```text
status: monitor started; full coverage pass pending
observed roots: 619
previous records loaded: 91252
supervisor groups file: 1
active run dirs: 1
coverage guidance: pending until first pass
triage yield: pending until first pass
health warning: startup status only; full novelty pass has not completed yet
latest completed full pass: 2026-05-19T03:22:09.629Z
```

Post-fix duplicate/noise feedback recorded the restarted control-plane state as:

```text
lastCurrentRunTriageCompletedAt: 2026-05-19T03:43:20.848Z
currentRunDirs: 1
suppressedStrictStartupRecords: 0
productEvidenceSignatures: 1
active-output strictStartupQueuedOrRunning: 0
active-output productEvidenceVisible: 5
gate-only triage candidates: 2
gate-only triage product evidence visible: 2
```

Interpretation:

- Do not claim final-stack cleanliness. The newest novelty output is a
  startup-only monitor status for a new active fuzz root, not validation of the
  accepted final PR stack and not a completed current-run likely-real count.
- Do not replace the startup-only novelty status with historical aggregate
  noise. The latest completed trend evidence reports current duplicate share
  `0`, historical duplicate share `0.3407`, startup failures `0`, and quality
  issues `0`, but the raw monitor's current triage-yield fields are pending
  until its first full pass.
- Historical aggregate noise must not be reported as a live product failure.
- Current fuzz health does not clear PR filing, exact branch-link gaps, PR05
  owner-boundary replay, PR07 owner replay, strict owner replay, PR15C owner
  reductions, PR15D control-only endpoint repair, the
  `PERSISTENCE-PARITY-6000007` gate, seed `1020002`, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T03:38:42Z`:

```text
monitor passes: 2320
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-19T03:22:09Z
coverage files: 272 -> 55800
coverage files delta: 55528
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3407
summary startup failures last: 0
quality issues last: 0
memory free: 424.3 GB
load averages: 43.77 / 48.69 / 62.4 on 64 cores
enabled group current: novelty-ws-parser-transform
latest fuzz level mix:
  browser-e2e=28 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6068498
browser-e2e likely-real findings: 783 over 2620.5 runner-hours
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
zero likely-real output. CPU/load are still meaningful enough that new fuzz
work should stay bounded and oracle-specific rather than increasing broad
browser concurrency.

## Status-Persona Analysis

The current split-persona synthesis, `pr-split-20260519T033443Z-synthesis.md`,
supersedes the older `030649Z` and `032351Z` wording where they differ:

- Keep the Cycle420/422 replacement split and the `031951Z` namespace, but
  insert a PR05 parser/entity correction or PR05B follow-up between clean
  `PR05D` and `PR06A` unless `PR04` / `PR05A` rows prove an earlier owner.
- Keep `PR02A`, `PR06E`, `HARNESS-WS-CONFIG-022004`, and the CRDT lane through
  PR15C. For PR13 content links, use the repaired audited PR13A/PR13B/PR13C
  refs listed above; the finer PR13B0-B3 shape is not file-ready until exact
  branch links exist.
- Treat `ENTITY-SERIALIZATION-1000009` as a PR05/parser-entity owner queue,
  not a tail PR, reload-hydration PR, validation-local-delete product PR, or
  PR18x.
- Treat `PERSISTENCE-PARITY-6000007` as runtime/owner-gated. Replay lower
  boundaries including `PR03`, `PR04`, and `PR05A` before promoting reload
  hydration or any post-PR15C slot.
- Keep PR07, strict `117126135e5e`, `PR15D`, `PR17`, `PR18`, and `PR18x`
  non-fileable.
- Reject stale or wrong-base manifests: raw `003407`, raw `020456`, raw
  `024016`, fallback/PR15-tail bases, `fix/rtc-fallback-group-delete-stale-local`,
  `d06e3528cbd`, raw reload publication, and raw `PR07D` publication without
  ownership audit.
- Keep loop no-progress rules strict: zero-byte reports, `report.tmp`,
  header-only TSVs, active-session-only status, stderr-only evidence, stale
  manifests, broad historical scans, and wait-only feedback are not progress.

The latest duplicate/noise synthesis,
`duplicate-noise-20260519T031512Z-synthesis.md`, converges on a
producer/control-plane scheduling leak, not a missing broad suppression rule.
Strict no-product `pre_action_bootstrap_stall` consumer paths are mostly
gated, but supervisor/novelty can still recover, refill, or publish stale
scope for startup-noisy producers, especially mixed runs with product
evidence. The matching feedback action,
`duplicate-noise-20260519T031512Z-feedback-action.md`, implemented the bounded
control-plane fix without product-code changes: mixed startup-stall/product
evidence runs now pause instead of recovering, novelty selection no longer uses
product evidence as a scheduling bypass, current-run triage freshness is
published before slow scans, the watchdog keys off triage/full-pass timestamps,
and legacy no-`facts` strict startup signatures are source-gated. Validation
passed `node --check` for the four touched scripts, gate-only triage,
active-output scan, and live-analysis `--once`; novelty, supervisor,
live-analysis, and watchdog sessions were restarted. Remaining risk is limited
to small-scope product-evidence family share, which was deliberately not
suppressed. This is harness/control-plane health context, not product
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

1. Use the replacement shape above, refreshed at
   `finalized/rtc-pr-stack-20260519T031951Z`, with the new PR05 correction gate
   before `PR06A`.
2. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`, including `HARNESS-WS-CONFIG-022004` if it
   is to be filed as a harness-only sidecar.
3. Run the bounded seed `1000009` owner-boundary job on `PR04` and `PR05A`;
   if those pass and `PR05B` fails, split/add the PR05 parser/entity
   correction before `PR06A`.
4. Replay seed `6000007` on `PR03`, `PR04`, `PR05A`, and enough existing
   controls to find the first pass/fail boundary; keep reload hydration
   non-fileable while current controls fail.
5. Repair or explicitly reclassify seed `1020002` before rebuilt stack-wide
   validation, broad final-stack fuzzing, or GitHub filing.
6. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   and PR15A/B/C after final PR14B materialization.
7. Use only the repaired PR13A/PR13B/PR13C audit links listed above as PR13
   content links. Do not use stale/misordered PR13 refs.
8. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
9. After owner reductions, exact branch-link audit for missing rows, PR15C
   endpoint materialization, PR15D control-only proof or fresh rejection,
   reload-marker replay/downscope, seed `1020002` repair or reclassification,
   upstream rebase, and PR CI land, rebuild the combined validation stack from
   explicit accepted heads. Then run focused checks, touched-file lint, branch
   graph and containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

Useful bounded work now:

- launch exactly one bounded Cycle424 owner-boundary job for seed `1000009`
  on `PR04` and `PR05A`, reusing PR05B/C/D rows only when head SHAs match;
- replay seed `6000007` on `PR03`, `PR04`, `PR05A`, and enough controls to
  locate the first pass/fail boundary, while keeping reload hydration
  non-fileable;
- create a fresh `031951Z` manifest/ref audit only after the PR05 parser/entity
  gap is fixed and the intended slot allowlist is current;
- monitor the duplicate/noise control-plane fix after restart; do not relaunch
  the same fix or add broad suppression unless current-run triage shows strict
  startup signatures queued/running or product-evidence visibility regresses.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate owner-reduction jobs, seed `1020002` outside focused
diagnostic replay, raw deferred publication/replay, raw PR07D, raw `HOLD-07C`,
raw `003407`, raw `020456`, raw `024016`, reload-hydration filing before
`PERSISTENCE-PARITY-6000007` owner replay/gate repair, PR17, PR18, PR18x
promotion, PR15D promotion from stale endpoint evidence, diagnostic product
promotion before focused first-loss replay, broad consumer duplicate/noise
suppression, or extra browser lanes.
