# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T04:04:30Z`

Trigger event:
`pr-split-2026-05-19T04-03-15Z-20260519T035309Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-19T04-03-15Z-20260519T035309Z/inputs/remote`

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
latest split-persona synthesis, `pr-split-20260519T035309Z-synthesis.md`,
makes the PR05/parser-entity gate stricter: `PR05B-D` and downstream
`PR06A-D` are held candidates, not final-fileable rows.

The key status remains seed `1000009`. Cycle420 has a real nonzero
`report.md` and row-bearing TSV evidence showing the same
`entity-serialization-mismatch:tag-escaping-nbsp-semicolonless-entities` on
`PR05B`, `PR05C`, clean `PR05D`, and current `PR15C`. Cycle424 then added
fresh failure rows on `PR03` and `PR04`, but still lacks a durable nonempty
`report.md`, and its `classification.tsv` / `manifest-audit.tsv` are still
header-only. That means clean `PR05D` is not the completion point, and the
ready lane must be reshaped around the earliest proved owner boundary. If
Cycle424 proves `PR02` passes and `PR03` fails, insert a PR03-adjacent fix
before PR03. If `PR05A` passes and `PR05B` fails, make the correction a PR05B
split/follow-up or PR05E before restacking PR05C/clean PR05D and PR06A-D.

Seed `1020002` still blocks final-stack fuzzing, rebuilt stack-wide
validation, GitHub filing, and its own repair/reclassification only. It must
not block independent owner-boundary work, branch-link audits, manifest
audits, deferred downscope, or loop/control-plane repair.

The latest duplicate/noise synthesis does not change the product PR split. It
now identifies a remaining scheduler/classification drift, not a product-code
fix: no-product strict startup paths are mostly gated, but duplicate-family
producer holds need to be family-aware, no-product startup holds must block
refill/materialization fallback, and deep/live family precedence must preserve
the explicit `persisted_content_mismatch` product signal. Treat this as
control-plane follow-up only, not product validation or final-stack cleanliness.

Current maintainer-facing split hypothesis:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A sidecar
-> PR03/PR04 owner boundary
-> PR05A
-> PR05B correction or PR05E/parser-entity serialization follow-up
-> restacked PR05C/clean PR05D as needed
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

Remote status was collected at `2026-05-19T04:04:30Z`.

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

The branch-link audit was generated at `2026-05-19T04:04:35Z` from fetched
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
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 files, +58 / -5 | verified content, but Cycle424 now has seed `1000009` failure rows; held until PR02/PR03 owner boundary is durable |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 files, +160 / -1 | verified content, but Cycle424 now has seed `1000009` failure rows; held until PR03/PR04/PR05A boundary is durable |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | needs durable owner-boundary replay against seed `1000009` |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | held candidate; seed `1000009` fails here and may require a PR05B correction/split |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | held candidate; restack only after the parser/entity owner boundary is fixed |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | held candidate; clean `PR05D` still fails seed `1000009`; reject fallback-tail PR05D |
| PR 5E / PR05B correction | Parser/entity serialization correction at earliest failing boundary | No verified branch link yet | TBD | required before treating PR05B-D or PR06A-D as fileable; exact slot depends on Cycle424 durable rows |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | held active split row; do not substitute grouped PR06 |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | held active split row; progress ref is evidence only |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | held active split row |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | held until PR05 boundary/fix is proved; PR09 and PR06E must hang from this row |
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
| Missing verified active refs | PR02A, PR05A-E/correction, PR06A-D, PR06E, PR11A-E, PR12A-C, PR14B, exact `031951Z` stack refs, `HARNESS-WS-CONFIG-022004` | active rows with no audit entry correctly say `No verified branch link yet`; `023939Z` audit is planning evidence only | Publish/fetch/audit explicit GitHub refs before filing or promoting any row, after the PR05 owner boundary/fix is known |
| ENTITY-SERIALIZATION-1000009 | seed `1000009`, PR03/PR04/PR05A boundary, PR05B/PR05C/clean PR05D/current PR15C | Cycle420 proves PR05B/C/clean PR05D/current PR15C fail; Cycle424 has fresh PR03/PR04 failure rows but still lacks nonempty report and row-bearing classification/manifest audit | Let active Cycle424 finish or run one bounded continuation on PR02/PR03/PR04/PR05A plus controls; insert the earliest proved parser/entity correction before filing PR05B-D or PR06A-D |
| PERSISTENCE-PARITY-6000007 / reload hydration | seed `6000007`, PR03/PR04/PR05A boundary, PR05B/C/D, current PR15C, clean reload-hydration heads, PR07 controls | non-fileable owner queue; current controls still show marker/root-block divergence | Replay `PR03`, `PR04`, `PR05A`, and enough existing controls to find first pass/fail boundary; keep reload hydration non-fileable |
| Seed `1020002` WebSocket marker divergence | final-stack repair/reclassification lane | blocks final-stack fuzzing, filing, rebuilt validation, and its own repair/reclassification only | Repair or explicitly reclassify before final-stack validation and filing |
| PR07 runtime / owner gate | PR07A/B arms and raw PR07D variants | non-fileable owner-comparison fork | Require row-bearing owner matrices with first-divergence evidence, current endpoint controls, clean refs, and branch audit before promotion |
| Strict revision-restore signal | `117126135e5e`, seed `5400020`, PR03, held PR03B, PR07 arms | owner-comparison target only; current rows still do not assign ownership | Require row-bearing strict owner comparison against PR03, held PR03B, PR07 arms, PR05B, PR05C, clean PR05D, PR14, and current PR15C before naming PR18x |
| PR15D endpoint/control | stale Cycle324/Cycle325/Cycle376 PR15D rows and later repaired endpoint manifests | blocked/control-only; current endpoint remains PR15C | Accept PR15D only with fresh current-base head/bundle/manifest proof after PR15C |
| Raw deferred manifests | raw `003407`, raw `020456`, raw `024016`, fallback/PR15-tail bases, raw `PR07D` | invalid PR progress; wrong/stale base or missing same-cycle allowlisted base/head/bundle/manifest agreement | Keep as no-progress unless a new audit proves clean allowlisted base, head/bundle/manifest agreement, and ownership/non-coverage |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR04, PR05A, PR05B, PR05C, clean PR05D, the PR07 owner queue, PR14, and current PR15C |
| Duplicate/noise producer control-plane | family-aware producer holds, startup-noise refill/materialization fallback, deep/live semantic family precedence | `031512Z` bounded fix landed, but `034456Z` synthesis finds remaining scheduler/classification drift; product-evidence signatures must remain visible | Patch only scheduler/classification follow-up if authorized: family-aware holds, no-product startup hold fail-closed refill, `novelty-ws-block-gauntlet` duplicate-family handling, and explicit source-family precedence; no broad suppression |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T04:04:30Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T032703Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-19T04:04:18.334Z` for
`run-20260519T032703Z`:

```text
health: ok; status heartbeat refreshed at 2026-05-19T04:04:18.334Z
metrics from completed full pass: 2026-05-19T03:59:26.089Z
coverage files: 55982
total records seen: 91607
active current-run dirs: 1
enabled group: novelty-ws-block-gauntlet
current-run records: block-gauntlet=15, successes=4, startup failures=5
coverage guidance unmet goals: 4
recommended groups: novelty-ws-real-user-save-reload,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text
active triage signatures: 1 actionable / 3 raw
product-evidence signatures: 1 actionable / 3 raw
likely-real visible: 0
suppressed strict startup records: 1
suppressed strict startup identities: 1
active top semantic family: persisted_content_mismatch=1
raw active top families: reload_rejoin_awareness_stall=2,
  persisted_content_mismatch=1
```

Interpretation:

- Do not claim final-stack cleanliness. The newest novelty output is current-run
  health for active fuzz infrastructure, not validation of the accepted final PR
  stack.
- Current-run triage has one actionable product-evidence signature and zero
  visible likely-real findings. Keep product-evidence visible; do not suppress it
  as startup noise.
- The latest raw monitor shows the strict startup path is still being suppressed
  in current scope, while raw duplicate-family evidence remains visible and
  capped. The current duplicate-family hold is scheduler/control-plane context,
  not a product PR row.
- Historical aggregate noise must not be reported as a live product failure.
- Current fuzz health does not clear PR filing, exact branch-link gaps, PR05
  owner-boundary replay, PR07 owner replay, strict owner replay, PR15C owner
  reductions, PR15D control-only endpoint repair, the
  `PERSISTENCE-PARITY-6000007` gate, seed `1020002`, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T03:59:16Z`:

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
load averages: 53.7 / 58.19 / 60.76 on 64 cores
enabled group current: novelty-ws-block-gauntlet
latest fuzz level mix:
  browser-e2e=28 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6077982
browser-e2e likely-real findings: 785 over 2627.7 runner-hours
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

The current split-persona synthesis, `pr-split-20260519T035309Z-synthesis.md`,
supersedes the older `033443Z`, `032351Z`, and `030649Z` wording where they
differ:

- The current split needs another change: seed `1000009` reproduces through
  PR05B/C/clean PR05D/current PR15C, and Cycle424 now has fresh PR03/PR04
  failure rows. Treat PR05B-D and PR06A-D as held candidates, not final-fileable
  rows.
- Replace the ready lane with `PR01 -> PR02 -> PR03/PR04 owner boundary ->
  PR05A -> PR05B correction or PR05E parser/entity follow-up -> restacked
  PR05C/clean PR05D as needed -> PR06A-D`, plus PR02A and PR06E sidecars.
- If Cycle424 proves `PR02` passes and `PR03` fails, insert a PR03-adjacent fix
  before PR03. If PR05A passes and PR05B fails, make it a PR05B correction/split
  or PR05E.
- Keep the CRDT lane through PR15C. For PR13 content links, use only the
  repaired audited PR13A/PR13B/PR13C refs listed above; the finer PR13B0-B3
  shape is not file-ready until exact repaired B0/B1/B2/B3 refs are pushed and
  audited.
- Keep PR07, raw reload hydration, `PERSISTENCE-PARITY-6000007`, strict
  `117126135e5e`, PR15D, PR17, PR18, PR18x, stale PR15D, fallback/PR15-tailed
  PR05D manifests, and raw deferred heads non-fileable.
- Let active Cycle424 continue:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260519T033443Z/jobs/run-rtc-cycle424-pr05-entity-persistence-owner-boundary.sh`.
  Its required output remains a nonempty `report.md` plus row-bearing
  `classification.tsv` and `manifest-audit.tsv`; current PR03/PR04 rows are
  useful but not durable completion.
- Keep loop no-progress rules strict: active sessions, wait-only feedback,
  zero-byte reports, `report.tmp`, header-only TSVs, disk-preflight-only output,
  stale manifests, and seed `1020002` waiting do not count as progress while
  actionable owner-boundary rows exist.

The latest duplicate/noise synthesis,
`duplicate-noise-20260519T034456Z-synthesis.md`, agrees that strict no-product
`pre_action_bootstrap_stall` is mostly no longer leaking into expensive
analysis. The remaining issue is scheduler/classification drift: duplicate/noise
producer holds should be family-aware, no-product startup holds should block
refill/materialization fallback and fail closed if gate-only triage refresh
fails, `novelty-ws-block-gauntlet` should participate in product-evidence
duplicate-family holds, and deep/live semantic family selection should prefer
explicit source family or `distinctBugType` over lifecycle regex inference.
Product-evidence likely-real cases, especially `persisted_content_mismatch`,
must remain visible. This is harness/control-plane health context, not product
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
   `finalized/rtc-pr-stack-20260519T031951Z`, but hold PR05B-D and PR06A-D
   until the Cycle424 owner boundary identifies the earliest required PR03/PR05
   parser/entity correction.
2. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`, including `HARNESS-WS-CONFIG-022004` if it
   is to be filed as a harness-only sidecar.
3. Let active Cycle424 complete or run one bounded continuation for seed
   `1000009` on PR02/PR03/PR04/PR05A plus matching controls. If PR02 passes and
   PR03 fails, insert a PR03-adjacent fix before PR03; if PR05A passes and PR05B
   fails, split/add the PR05B/PR05E parser/entity correction before restacking
   PR05C/PR05D and PR06A-D.
4. Replay seed `6000007` on `PR03`, `PR04`, `PR05A`, and enough existing
   controls to find the first pass/fail boundary; keep reload hydration
   non-fileable while current controls fail.
5. Repair or explicitly reclassify seed `1020002` before rebuilt stack-wide
   validation, broad final-stack fuzzing, or GitHub filing.
6. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, only the corrected
   clean PR05D path, and PR15A/B/C after final PR14B materialization.
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

- let the active Cycle424 owner-boundary job finish, then consume only durable
  nonempty `report.md` and row-bearing TSV artifacts; if it exits incomplete,
  run exactly one same-scope continuation for seed `1000009` on
  PR02/PR03/PR04/PR05A plus controls;
- replay seed `6000007` on `PR03`, `PR04`, `PR05A`, and enough controls to
  locate the first pass/fail boundary, while keeping reload hydration
  non-fileable;
- create a fresh `031951Z` manifest/ref audit only after the PR03/PR05
  parser/entity gap is fixed and the intended slot allowlist is current;
- keep duplicate/noise follow-up narrow: family-aware producer holds,
  startup-noise refill fail-closed behavior, block-gauntlet duplicate-family
  handling, and explicit source-family precedence only; do not add broad
  suppression while product-evidence signatures remain visible/capped.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate owner-reduction jobs, seed `1020002` outside focused
diagnostic replay, raw deferred publication/replay, raw PR07D, raw `HOLD-07C`,
raw `003407`, raw `020456`, raw `024016`, reload-hydration filing before
`PERSISTENCE-PARITY-6000007` owner replay/gate repair, PR17, PR18, PR18x
promotion, PR15D promotion from stale endpoint evidence, diagnostic product
promotion before focused first-loss replay, broad consumer duplicate/noise
suppression, or extra browser lanes.
