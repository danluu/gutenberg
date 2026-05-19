# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T02:40:59Z`

Trigger event:
`pr-split-2026-05-19T02-40-16Z-20260519T022946Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-19T02-40-16Z-20260519T022946Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Still blocked for GitHub filing and final-stack validation. The latest
split-persona synthesis, `pr-split-20260519T022946Z-synthesis.md`, keeps the
Cycle418 / `20260519T021933Z` split as the best current shape, but explicitly
marks it not filing-ready. The old tail must stay replaced: no linear
`PR07 -> PR17 -> PR18/PR18x`, no stale `PR15D`, no raw `PR07D`, and no raw
reload-hydration publication.

Current maintainer-facing split:

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
   (desired finer PR13B0-B3 source split still needs verified refs)
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C

Non-fileable owner queues:
PR07 owner comparison
strict 117126135e5e / seed 5400020 owner comparison
post-PR15C reload/persistence-parity queue

Blocked/runtime-gated:
RELOAD-HYDRATION-020456, also referred to by the older clean alias
RELOAD-HYDRATION-014448, at clean head
5edcd4acdf60f9ea2e0313756e8b01749f9ecef6

Deferred validation/test:
VALIDATION-LOCAL-DELETE-012938 / seed 1000009
```

Current blocker/status changes:

- Seed `1020002` blocks final-stack fuzzing, rebuilt stack-wide validation,
  GitHub filing, and its own repair/reclassification only. It must not block
  PR07 owner comparison, strict owner comparison, branch audits, push manifests,
  PR02A/PR5/PR11 shaping, deferred downscope/promotion, or loop repair.
- The `20260519T022936Z/finalization.report.md` output is zero bytes and is
  not evidence.
- `VALIDATION-LOCAL-DELETE-012938` remains validation/test-only. The completed
  seed `1000009` replay found current-PR15C HTML/entity serialization
  non-convergence, so the next evidence step is owner reduction across PR05B,
  PR05C, clean PR05D, and current PR15C. Do not promote raw `012938`.
- `RELOAD-HYDRATION-020456` / `014448` remains blocked runtime-gated work after
  current PR15C. It is not fileable until seed `6000007` passes on the exact
  clean head and compares cleanly against current PR15C plus PR07B0F/G.
- The raw `deferred/rtc-reload-hydration-20260519T003407Z` progress-unblock
  path is invalid PR progress: wrong validation-stack base, no same-cycle
  allowlisted base/head/bundle/manifest agreement, and no PR07B/PR07C/current
  non-coverage proof.

Do not file `PR02B`, any PR07 arm, `RELOAD-HYDRATION-020456` / `014448`,
`PR15D`, raw `PR07D`, stale `PR07C`, raw deferred reload/search/rich-text
heads, `VALIDATION-LOCAL-DELETE-012938`, `PR17`, `PR18`, or `PR18x`.

## Branch And Ref Status

Remote status was collected at `2026-05-19T02:40:54Z`.

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

The branch-link audit was generated at `2026-05-19T02:40:59Z` from fetched
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
| PR 2A | Ready sidecar after PR2 | No verified branch link yet | TBD | active sidecar; needs exact pushed/audited ref |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 files, +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 files, +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | active i40 row; aggregate PR05 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | active i40 row; exact branch still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | active i40 row; exact branch still missing |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | valid only for clean `27c6e7924217`; reject fallback-tail PR05D |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | active PR06A-D split row; do not substitute grouped PR06 or PR06A prior-art refs |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | active PR06A-D split row; PR06B progress ref is useful evidence only |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | active PR06A-D split row |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | sidecar must hang from PR06D, not PR07 |

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
| PR 15A-on-PR14B | Fallback-group move green on PR14B | No verified branch link yet | TBD | Cycle396 lane row; exact final-PR14B ref is still missing from the branch audit |
| PR 15B-on-PR14B | Fallback-group insert-anchor green on PR14B | No verified branch link yet | TBD | Cycle396 lane row; exact final-PR14B ref is still missing from the branch audit |
| PR 15C-on-PR14B | Fallback-group delete green on PR14B | No verified branch link yet | TBD | current canonical CRDT endpoint; exact final-PR14B ref is still missing from the branch audit |

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
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; not the exact final-PR14B materialized ref |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; not the exact final-PR14B materialized ref |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not the exact Cycle396 PR15C-on-PR14B endpoint and not a clean PR05D substitute |

## Deferred Or Evidence-Only Work

These rows must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified active refs | PR02A, PR05A-D, PR06A-D, PR06E, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A/B/C-on-PR14B, RELOAD-HYDRATION-020456 | active rows with no audit entry correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing or promoting any row |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | downscoped/no-file; prior report says PR02 base and PR02B both pass seed `1030001`, `promote: no` | Do not file. Reopen only with new owner/repro evidence and a verified branch-link audit |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B0A/B/C, PR07B0D-215248, PR07B0E-233340, PR07B0F-003407, PR07B0G-004916, HOLD-07C | non-fileable owner-comparison fork; active row-bearing work is useful only when it compares current endpoint controls | Require row-bearing owner matrices with first-divergence evidence, current PR15C controls, clean refs, and branch audit before promotion |
| Strict revision-restore signal | `117126135e5e`, seed `5400020`, PR03, held PR03B, PR07 arms | owner-comparison target only; current rows still do not assign ownership | Require row-bearing strict owner comparison against PR03, held PR03B, PR07 arms, PR05C, clean PR05D, PR14, and current PR15C-on-PR14B before naming PR18x |
| PR15D endpoint/control | stale Cycle324/Cycle325/Cycle376 PR15D rows and later repaired endpoint manifests | blocked/control-only; current endpoint remains Cycle396 PR15C-on-PR14B | Accept PR15D only with fresh current-base head/bundle/manifest proof after PR15C |
| RELOAD-HYDRATION-020456 / 014448 | clean blocked reload head `5edcd4acdf60f9ea2e0313756e8b01749f9ecef6` | blocked/runtime-gated only; no verified branch link yet and not fileable | Complete seed `6000007` on that exact head with current PR15C as control and PR07B0F/G as comparisons |
| Raw `003407` reload-hydration manifest | `deferred/rtc-reload-hydration-20260519T003407Z`; progress-unblock `20260519T015611Z` manifest | invalid PR progress; wrong validation-stack base and no same-cycle non-coverage proof | Keep as no-progress unless a new audit proves allowlisted base, head/bundle/manifest agreement, and PR07B/PR07C/current non-coverage |
| VALIDATION-LOCAL-DELETE-012938 / seed `1000009` | deferred local-delete validation/test lane | completed current-PR15C replay found HTML/entity serialization non-convergence; still not product PR evidence | Run owner reduction across PR05B, PR05C, clean PR05D, and current PR15C before assigning any product row |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the PR07 owner queue, PR14, and current PR15C-on-PR14B |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06, PR06A prior-art, and PR06B progress refs are verified; active PR06A-D and PR06E still have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15C-on-PR14B | CRDT/data-loss lane starts from PR06D, not PR07, and currently ends at Cycle396 PR15C-on-PR14B | Prove `PR06D -> PR09`, accepted PR07 fork non-ancestry where required, old HOLD non-ancestry, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B, PR15A/B/C-on-PR14B | Cycle396 PR15C-on-PR14B is the current canonical CRDT endpoint, but audit verifies only PR15A-C component prior art | Publish/fetch/audit exact PR14B-based refs, confirm ancestry, and require nonzero materializer/audit evidence |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, rebuilt validation, and its own repair/reclassification only | Repair or explicitly reclassify before final-stack validation and filing |
| Duplicate/noise producer control-plane | startup-noise holds, family-capped duplicate holds, stale/no-analysis drain admission | latest duplicate-noise synthesis (`20260519T022053Z`) calls this producer/scheduler policy, not product failure; earlier `015303Z` action patched novelty monitor policy `36` and restarted novelty | Keep monitoring; do not treat control-plane remediation as product validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T02:40:54Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T015651Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-19T02:40:26.635Z` for
`run-20260519T015651Z`:

```text
coverage files: 55605
total records seen: 90905
records processed this pass: 10
unmet goals: 4
recommended groups:
  novelty-ws-real-user-save-reload
  novelty-ws-real-user-editing
  novelty-ws-real-user-rich-text
active current-run dirs: 0
active likely-real visible: 0
active likely-real merged duplicates: 0
active oracle/noise questions: 0
current drain signatures: 2
current drain product-evidence signatures: 2
current drain likely-real visible: 0
enabled groups:
  novelty-ws-lifecycle
  novelty-ws-real-user-save-reload
paused groups:
  novelty-http-persistence-probe
  novelty-ws-block-gauntlet
  novelty-ws-parser-transform
load1: 56.97 / 64 cores
memory: 425.2G free / 492.0G total
headroom for adding groups: yes
health note: heartbeat refreshed at 02:40:26Z; metrics are from the
  completed 02:09:18Z full pass
```

Interpretation:

- Do not claim final-stack cleanliness. The newest novelty output is a
  coverage-guided health pass for the active fuzz root, not validation of the
  accepted final PR stack.
- Active current-run triage has zero visible likely-real signatures. The drain
  view still has two product-evidence signatures, both non-likely-real.
- Historical triage remains dominated by known/noisy families, especially raw
  `pre_action_bootstrap_stall`; historical aggregate noise must not be reported
  as a live product failure.
- Current fuzz health does not clear PR filing, PR07 owner replay, strict
  owner replay, PR15C-on-PR14B branch-link gaps, PR15D control-only endpoint
  repair, the `RELOAD-HYDRATION-020456` seed `6000007` gate, seed `1020002`,
  exact branch-link gaps, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T02:32:03Z`:

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
load averages: 59.11 / 60.22 / 63.33 on 64 cores
enabled groups current:
  novelty-ws-lifecycle
  novelty-ws-real-user-save-reload
latest fuzz level mix:
  browser-e2e=30 lanes/26 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6043103
browser-e2e likely-real findings: 781 over 2601.2 runner-hours
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
zero likely-real output. CPU/load remain substantial, so new fuzz work should
stay bounded and oracle-specific rather than increasing broad browser
concurrency.

## Status-Persona Analysis

The newest split-persona synthesis, `pr-split-20260519T022946Z-synthesis.md`,
supersedes the older Cycle416/Cycle418 text where they differ:

- Treat Cycle418 / `20260519T021933Z` as the current replacement split, but
  not filing-ready.
- Keep ready/local and CRDT lanes as the active maintainer shape; PR13 uses the
  repaired audited PR13A/B/C links until exact PR13B0-B3 refs exist.
- Keep PR07 and strict `117126135e5e` as non-fileable owner queues.
- Treat clean reload `020456` / seed `6000007` as blocked runtime-gated work
  after PR15C; promote it only as a new post-PR15C slot if it passes exact-head
  clean comparison.
- Treat `VALIDATION-LOCAL-DELETE-012938` / seed `1000009` as validation/test
  only. The completed current-PR15C replay found HTML/entity serialization
  non-convergence, so the next useful work is PR05B/PR05C/clean-PR05D/current
  owner reduction.
- Reject fallback-tail PR05D evidence based on
  `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or PR15 tails.
- Reject zero-byte `20260519T022936Z`, raw `003407`, raw `020456`, PR15D,
  PR07D, PR17, PR18, PR18x, and any raw reload-hydration publication.

The latest duplicate/noise synthesis,
`duplicate-noise-20260519T022053Z-synthesis.md`, did not edit files. It
continues to frame duplicate/noise pressure as a novelty/scheduler control-plane
issue, not product evidence. The prior completed feedback action
`duplicate-noise-20260519T015303Z-feedback-action.md` changed only
`rtc-browser-fuzz-novelty-monitor.mjs`, moved novelty to policy `36`, restarted
the active novelty session, and validated that strict startup-noise records were
suppressed instead of queued into analysis/deep/live paths. Treat both as
control-plane health context, not final-stack validation.

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
as active units. Do not file stale Cycle293/Cycle306 rows, stale/unpushed i40
rows, `ready/*`, validation-stack, dirty evidence, fallback-tail branches, raw
deferred/candidate refs, raw PR07 arms, stale PR15D, raw reload-hydration refs,
zero-byte reports, header-only matrices, header-only push manifests, or local
finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement fileable shape above: ready/local lane plus
   CRDT/data-loss lane ending at Cycle396 `PR15C-on-PR14B`.
2. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
3. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   and PR15A/B/C after final PR14B materialization.
4. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
5. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
6. Treat the completed duplicate/noise producer/scheduler remediation and the
   current full-pass fuzz root as control-plane/fuzz health, not product
   validation or final-stack readiness.
7. After PR07/strict owner evidence, exact branch-link audit for missing rows,
   PR15C-on-PR14B endpoint materialization, PR15D control-only proof or fresh
   rejection, reload-marker replay/downscope, and seed `1020002` repair or
   reclassification land, rebuild the combined validation stack from explicit
   accepted heads. Then run focused checks, touched-file lint, branch graph and
   containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide validation.

Useful bounded work now:

- keep Cycle418 / `20260519T021933Z` as the current replacement split while
  treating the split as provisional and not filing-ready;
- launch or consume a bounded `20260519T021933Z` manifest/audit job for ready
  lanes only. It must produce row-bearing manifest validation, exclude
  runtime-gated/validation/raw branches, verify base allowlists, and ignore
  zero-byte `20260519T022936Z`;
- complete the active `rtc-cycle418-reload-020456-seed6000007-clean-pr15c-replay`
  job, or launch exactly one bounded replacement only if it exits without a
  nonzero `report.md` and row-bearing TSVs;
- launch or consume
  `rtc-cycle420-validation-local-delete-1000009-pr05b-pr05c-pr05d-owner-reduction`
  across PR05B, PR05C, clean PR05D, and current PR15C;
- continue PR07 and strict owner queues only as bounded current-endpoint
  comparisons. Do not publish PR07 arms or name `PR18x`;
- keep monitoring novelty policy `36` for recurrent startup-noise starvation,
  but do not treat the control-plane fix as product evidence.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw deferred publication/replay, raw PR07D, raw `HOLD-07C`, raw
`003407` or raw `020456` reload-hydration publication, RELOAD-HYDRATION filing
before its seed `6000007` gate, PR17, PR18, PR18x promotion, PR15D promotion
from stale endpoint evidence, diagnostic product promotion before focused
first-loss replay, broad consumer duplicate/noise suppression, or extra browser
lanes.
