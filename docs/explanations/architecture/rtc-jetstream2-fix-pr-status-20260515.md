# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T03:36:11Z`

Trigger event:
`pr-split-2026-05-19T03-34-38Z-20260519T032351Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-19T03-34-38Z-20260519T032351Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Still blocked for GitHub filing and final-stack validation. The current
split-persona synthesis, `pr-split-20260519T032351Z-synthesis.md`, keeps the
Cycle420/422 replacement split and treats the old linear
`PR07 -> PR17 -> PR18/PR18x` tail as replaced. The latest usable namespace is
`finalized/rtc-pr-stack-20260519T031951Z`; it has ref/ancestry and
`git diff --check` validation, but it is not final-stack-ready.

The blocker set changed from "missing Cycle420 artifacts" to "owner and
publication gates are still open." Cycle420 now has a nonzero `report.md` and
row-bearing `classification.tsv` / `manifest-audit.tsv`; the earlier
`20260519T023939Z` ready-set audit remains useful planning evidence, but it
predates the `031951Z` namespace refresh. There is still no fresh publish
manifest for `031951Z`, no PR CI/upstream rebase, unresolved owner queues, and
seed `1020002` still blocks final-stack validation and filing.

Treat the seed failures as owner-reduction problems, not promotable deferred
PRs:

- seed `1000009` still reproduces the same
  `entity-serialization-mismatch` on `PR05B`, `PR05C`, clean `PR05D`, and
  current `PR15C`; add a PR05 owner gate and compare `PR04` / `PR05A` before
  claiming PR05D closes the area;
- seed `6000007` remains a marker/root-block divergence owner queue while
  current controls fail; compare current `PR15C`, `PR14B` if missing, clean
  `RELOAD-HYDRATION-024016`, and PR07 controls before promoting reload
  hydration.

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
-> repaired PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
   (active finer source split, but not file-ready until exact
   verified refs exist)
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C

Harness-only sidecar:
HARNESS-WS-CONFIG-022004

Non-fileable owner queues:
ENTITY-SERIALIZATION-1000009 owner reduction
PERSISTENCE-PARITY-6000007 / reload-hydration owner reduction
PR07 owner comparison
strict 117126135e5e / seed 5400020 owner comparison
seed 1020002 final-stack repair/reclassification
```

Current blocker/status changes:

- Seed `1020002` still blocks final-stack fuzzing, rebuilt stack-wide
  validation, GitHub filing, and its own repair/reclassification only. It must
  not block PR07 owner comparison, strict owner comparison, branch audits, push
  manifests, PR02A/PR5/PR11 shaping, deferred downscope/promotion, owner
  reductions for seeds `1000009` and `6000007`, or loop repair.
- `ENTITY-SERIALIZATION-1000009` is now a non-fileable owner queue. The newest
  rows reproduce the same `entity-serialization-mismatch` on `PR05B`, `PR05C`,
  clean `PR05D`, and current `PR15C`; compare lower owners next, especially
  `PR04` and `PR05A`. If `PR05A` passes and `PR05B` fails, treat this as a
  PR05B correction/split or follow-up, not a tail PR. Do not promote raw
  `VALIDATION-LOCAL-DELETE-012938`.
- `PERSISTENCE-PARITY-6000007` is now a non-fileable owner queue. Current
  controls still show marker/root-block divergence, so reload promotion waits
  on lower controls, PR07 evidence, and bounded replay/repair against current
  `PR15C`, `PR14B` if missing, and clean `RELOAD-HYDRATION-024016`.
- Reject stale or wrong-base manifests and raw heads as progress:
  raw `003407`, raw `020456`, raw `024016`, fallback/PR15-tail bases,
  `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, raw
  reload-hydration publication, and raw `PR07D` publication without PR07B/PR07C
  ownership audit proving a distinct delta.
- Keep PR07, strict `117126135e5e`, `PR15D`, `PR17`, `PR18`, and `PR18x`
  non-fileable. No `PR18x` naming until strict rows compare plausible earlier
  owners, including PR05B/PR05C/clean PR05D and the current endpoint.
- Treat Cycle420 owner-reduction artifacts as useful but not filing clearance:
  `report.md`, `classification.tsv`, and `manifest-audit.tsv` are now nonzero
  / row-bearing, but the PR05 `PR04` / `PR05A` owner gate and the
  `6000007` marker/root-block repair path remain unresolved.

Do not file `PR02B`, any PR07 arm, `RELOAD-HYDRATION-020456` / `014448` /
`024016`, `PR15D`, raw `PR07D`, stale `PR07C`, raw deferred
reload/search/rich-text heads, `VALIDATION-LOCAL-DELETE-012938`, `PR17`,
`PR18`, `PR18x`, or any zero-byte/header-only/stale-manifest output.

## Branch And Ref Status

Remote status was collected at `2026-05-19T03:36:05Z`.

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

The branch-link audit was generated at `2026-05-19T03:36:11Z` from fetched
`danluu` refs. A row marked `verified-content` means the branch exists on
`danluu` and has a non-empty audited diff against the listed base. It does not
prove exact publication shape, ancestry, owner evidence, or filing readiness.

Use only these repaired audited PR13 review refs for linked PR13 content. The
active PR13B0-B3 split rows still have no verified branch links:

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
| PR 2A | Ready sidecar after PR2 | No verified branch link yet | TBD | included in the Cycle420/422 split hypothesis; needs exact pushed/audited ref |
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
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 files, +1151 / -25 | repaired verified content; active PR13 prefix |
| PR 13B0 | Source-family split part 0 after PR13A | No verified branch link yet | TBD | active finer split row; not file-ready until exact pushed/audited ref exists |
| PR 13B1 | Source-family split part 1 after PR13B0 | No verified branch link yet | TBD | active finer split row; not file-ready until exact pushed/audited ref exists |
| PR 13B2 | Source-family split part 2 after PR13B1 | No verified branch link yet | TBD | active finer split row; not file-ready until exact pushed/audited ref exists |
| PR 13B3 | Source-family split part 3 before PR14 | No verified branch link yet | TBD | active finer split row; not file-ready until exact pushed/audited ref exists |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 files, +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | required before active PR15A-C; needs final-PR14B materialization/audit |
| PR 15A | Fallback-group move green on PR14B | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 files, +123 / -4 | verified component content; filing still waits on `031951Z` publication audit and owner gates |
| PR 15B | Fallback-group insert-anchor green on PR14B | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 files, +197 / -4 | verified component content; filing still waits on `031951Z` publication audit and owner gates |
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
| PR 13B repaired aggregate | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired verified content; use as current verified aggregate/prior art until exact PR13B0-B3 refs are published and audited |
| PR 13C repaired aggregate | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired verified content; use as current verified aggregate/prior art until exact PR13B0-B3 refs are published and audited |

## Deferred Or Evidence-Only Work

These rows must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified active refs | PR02A, PR05A-D, PR06A-D, PR06E, PR11A-E, PR12A-C, PR13B0-B3, PR14B, exact `031951Z` stack refs, `HARNESS-WS-CONFIG-022004` | active rows with no audit entry correctly say `No verified branch link yet`; `023939Z` audit is planning evidence only | Publish/fetch/audit explicit GitHub refs before filing or promoting any row |
| ENTITY-SERIALIZATION-1000009 | seed `1000009`, PR05B/PR05C/clean PR05D/current PR15C | those rows fail with `entity-serialization-mismatch`; non-fileable PR05/parser-entity owner queue | Run bounded owner comparison on `PR04` and `PR05A`; if they pass and `PR05B` fails, add/split the PR05 correction before PR06A |
| VALIDATION-LOCAL-DELETE-012938 | deferred local-delete validation/test lane | remains validation/test-only; raw `012938` is not product PR evidence | Promote nothing unless owner reduction proves a product row and exact clean refs are audited |
| PERSISTENCE-PARITY-6000007 / reload hydration | seed `6000007`, current PR15C, PR14B if missing, clean `RELOAD-HYDRATION-024016`, PR07 controls | non-fileable owner queue; current controls still fail marker/root-block divergence | Run bounded marker/root-block owner/repair work; do not promote reload hydration while current controls fail |
| Seed `1020002` WebSocket marker divergence | final-stack repair/reclassification lane | blocks final-stack fuzzing, filing, rebuilt validation, and its own repair/reclassification only | Repair or explicitly reclassify before final-stack validation and filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | downscoped/no-file; prior report says PR02 base and PR02B both pass seed `1030001`, `promote: no` | Do not file. Reopen only with new owner/repro evidence and a verified branch-link audit |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B0A/B/C, PR07B0D-215248, PR07B0E-233340, PR07B0F-003407, PR07B0G-004916, HOLD-07C | non-fileable owner-comparison fork; active row-bearing work is useful only when it compares current endpoint controls | Require row-bearing owner matrices with first-divergence evidence, current PR15C controls, clean refs, and branch audit before promotion |
| Strict revision-restore signal | `117126135e5e`, seed `5400020`, PR03, held PR03B, PR07 arms | owner-comparison target only; current rows still do not assign ownership | Require row-bearing strict owner comparison against PR03, held PR03B, PR07 arms, PR05B, PR05C, clean PR05D, PR14, and current PR15C before naming PR18x |
| PR15D endpoint/control | stale Cycle324/Cycle325/Cycle376 PR15D rows and later repaired endpoint manifests | blocked/control-only; current endpoint remains PR15C | Accept PR15D only with fresh current-base head/bundle/manifest proof after PR15C |
| Raw deferred manifests | raw `003407`, raw `020456`, raw `024016`, fallback/PR15-tail bases, raw `PR07D` | invalid PR progress; wrong/stale base or missing same-cycle allowlisted base/head/bundle/manifest agreement | Keep as no-progress unless a new audit proves clean allowlisted base, head/bundle/manifest agreement, and ownership/non-coverage |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the PR07 owner queue, PR14, and current PR15C |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06, PR06A prior-art, and PR06B progress refs are verified; active PR06A-D and PR06E still have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A plus active but unaudited PR13B0/B1/B2/B3; repaired PR13B/PR13C aggregate refs remain available | PR13B0-B3 are the active finer split rows but have no verified branch links yet; repaired PR13B/C are verified aggregate/prior-art refs only | Publish/fetch/audit PR13B0/B1/B2/B3 before filing the finer split or replacing repaired PR13B/C aggregate evidence |
| Duplicate/noise producer control-plane | mixed startup-stall recovery, novelty materialization/fallback/canary scope, product-evidence duplicate-family drain visibility | latest `duplicate-noise-20260519T031512Z-synthesis.md` converges on producer/control-plane leakage, not broad triage suppression | Pause mixed startup-stall producers, make novelty cooldown/policy scope authoritative, refresh materialized run dirs before empty scope publication, and keep product-evidence signatures visible/capped |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T03:36:05Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T032703Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-19T03:35:12.622Z` for
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
```

Interpretation:

- Do not claim final-stack cleanliness. The newest novelty output is a
  startup-only monitor status for a new active fuzz root, not validation of the
  accepted final PR stack and not a completed current-run likely-real count.
- Do not replace the startup-only novelty status with historical aggregate
  noise. The latest completed trend evidence still reports current duplicate
  share `0`, historical duplicate share `0.3407`, startup failures `0`, and
  quality issues `0`, but the raw monitor's current triage-yield fields are
  pending until its first full pass.
- Historical triage remains dominated by known/noisy families, especially raw
  `pre_action_bootstrap_stall`. Historical aggregate noise must not be reported
  as a live product failure.
- Current fuzz health does not clear PR filing, exact branch-link gaps,
  PR07 owner replay, strict owner replay, PR15C owner reductions, PR15D
  control-only endpoint repair, the `PERSISTENCE-PARITY-6000007` gate,
  seed `1020002`, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T03:28:00Z`:

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
load averages: 60.33 / 65.82 / 76.75 on 64 cores
enabled group current:
  novelty-ws-parser-transform
  novelty-ws-common-blocks
latest fuzz level mix:
  browser-e2e=29 lanes/26 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6064210
browser-e2e likely-real findings: 783 over 2617.5 runner-hours
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
zero likely-real output. CPU/load remain high, so new fuzz work should stay
bounded and oracle-specific rather than increasing broad browser concurrency.

## Status-Persona Analysis

The current split-persona synthesis, `pr-split-20260519T032351Z-synthesis.md`,
supersedes the older Cycle418 / `022946` wording and the earlier
`030649Z` wording where they differ:

- Use the Cycle420/422 replacement split shape refreshed at
  `finalized/rtc-pr-stack-20260519T031951Z`: ready/local through `PR06D` with
  `PR02A` / `PR06E` sidecars, CRDT through `PR15C`, and harness-only
  `HARNESS-WS-CONFIG-022004`.
- Treat the ready/local and CRDT lanes as usable prefixes, but not
  final-stack-ready. The latest namespace has ref/ancestry and
  `git diff --check` validation; it still lacks PR CI/upstream rebase and a
  fresh publish manifest for `031951Z`.
- Treat `PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3` as the active finer
  CRDT split shape. Because the audit has no verified PR13B0-B3 branch links
  yet, repaired PR13B/PR13C remain verified aggregate/prior-art refs rather
  than active filed rows.
- Treat seed `1000009` as the `ENTITY-SERIALIZATION-1000009` owner queue. The
  latest completed rows show `PR05B`, `PR05C`, clean `PR05D`, and current
  `PR15C` all fail with the same entity serialization mismatch. Add a PR05
  owner gate: compare `PR04` / `PR05A` before claiming PR05D closes the area.
- Keep `PERSISTENCE-PARITY-6000007` blocked/runtime-gated. Current controls
  still fail marker/root-block divergence, so run bounded owner/repair work
  against current `PR15C`, `PR14B` if missing, clean
  `RELOAD-HYDRATION-024016`, and PR07 controls.
- Keep PR07, strict `117126135e5e`, `PR15D`, `PR17`, `PR18`, and `PR18x`
  non-fileable.
- Reject stale or wrong-base manifests: raw `003407`, raw `020456`, raw
  `024016`, fallback/PR15-tail bases, `fix/rtc-fallback-group-delete-stale-local`,
  `d06e3528cbd`, and raw reload/`PR07D` publication without ownership audit.
- Keep the loop no-progress rules strict: zero-byte reports, header-only TSVs,
  active-session-only status, stderr-only evidence, stale manifests, and broad
  historical scans are not progress.

The latest duplicate/noise synthesis,
`duplicate-noise-20260519T031512Z-synthesis.md`, converges on a
producer/control-plane scheduling leak, not a missing broad suppression rule.
Strict no-product `pre_action_bootstrap_stall` consumer paths are mostly
gated, but supervisor/novelty can still recover, refill, or publish stale
scope for startup-noisy producers, especially mixed runs with product
evidence. The next bounded fix should pause mixed startup-stall producers
instead of entering recovery, make novelty cooldown/policy scope authoritative
for fallback/canary/materialization selection, refresh materialized run dirs
before writing empty `currentRunDirs`, and preserve product-evidence
signatures under existing family caps. This is harness/control-plane health
context, not product validation.

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

1. Use the Cycle420/422 replacement shape above, refreshed at
   `finalized/rtc-pr-stack-20260519T031951Z`. Treat older `022936Z` /
   `023939Z` artifacts as planning/provenance evidence, not the latest
   publication target.
2. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`, including `HARNESS-WS-CONFIG-022004` if it
   is to be filed as a harness-only sidecar.
3. Consume the now nonzero Cycle420 report and row-bearing classification /
   manifest artifacts as owner evidence, not filing clearance. The PR05
   `PR04` / `PR05A` comparison and the `6000007` marker/root-block owner/repair
   path still need bounded follow-up before any affected product row can file.
4. Repair or explicitly reclassify seed `1020002` before rebuilt stack-wide
   validation, broad final-stack fuzzing, or GitHub filing.
5. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   and PR15A/B/C after final PR14B materialization.
6. Use the repaired PR13A audit link for the active PR13 prefix, and use the
   repaired PR13B/PR13C audit links listed above only as verified aggregate
   prior art until exact PR13B0/B1/B2/B3 branch links exist.
7. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
8. After owner reductions, exact branch-link audit for missing rows, PR15C
   endpoint materialization, PR15D control-only proof or fresh rejection,
   reload-marker replay/downscope, seed `1020002` repair or reclassification,
   upstream rebase, and PR CI land, rebuild the combined validation stack from
   explicit accepted heads. Then run focused checks, touched-file lint, branch
   graph and containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide validation.

Useful bounded work now:

- create a fresh bounded `031951Z` ready-set manifest audit with row-bearing
  `push-manifest.tsv`, `ref-audit.tsv`, and `report.md`, excluding
  runtime/deferred/PR07/PR18 rows;
- run bounded seed `1000009` owner comparison on `PR04` and `PR05A`; if those
  pass and `PR05B` fails, split/add the PR05 parser/entity correction before
  `PR06A`;
- run bounded seed `6000007` marker/root-block owner/repair work against
  current `PR15C`, `PR14B` if missing, clean `RELOAD-HYDRATION-024016`, and
  PR07 controls;
- apply the `031512Z` duplicate/noise producer fix only as control-plane
  work: pause mixed startup-stall producers, make novelty cooldown/policy scope
  authoritative, and keep product-evidence signatures visible/capped. Do not
  treat that remediation as product evidence.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw deferred publication/replay, raw PR07D, raw `HOLD-07C`, raw
`003407`, raw `020456`, or raw `024016` reload-hydration publication,
RELOAD-HYDRATION filing before `PERSISTENCE-PARITY-6000007` owner replay/gate
repair, PR17, PR18, PR18x promotion, PR15D promotion from stale endpoint
evidence, diagnostic product promotion before focused first-loss replay, broad
consumer duplicate/noise suppression, or extra browser lanes.
