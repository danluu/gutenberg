# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T02:06:59Z`

Trigger event:
`pr-split-2026-05-19T02-05-46Z-20260519T015616Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-19T02-05-46Z-20260519T015616Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Still blocked for GitHub filing and final-stack validation. The latest
split-persona synthesis keeps the Cycle414/Cycle416 replacement shape rather
than the old linear `PR07` / `PR17` / `PR18` / `PR18x` tail, but it rejects the
Cycle416 progress-unblock `003407` manifest as PR progress. The current
maintainer shape remains two filing lanes plus non-fileable owner/control
queues:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A ready sidecar
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D
  + PR06E ready sidecar from PR06D

Non-fileable owner queues:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0
  compare PR07B0A/B/C/D-215248/E-233340/F-003407/G-004916
  and HOLD-07C
  against PR03, PR04, PR05A, PR03B, PR05B, PR05C, clean PR05D,
  PR14, and the current PR15C-on-PR14B endpoint

Strict revision-restore owner queue:
signature 117126135e5e / seed 5400020
  compare PR03, PR03B, PR07 arms, PR05B/C/clean PR05D, PR14,
  and the current PR15C-on-PR14B endpoint before naming PR18x

CRDT/data-loss lane:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> repaired PR13A -> PR13B0/B1/B2/B3 target once exact refs are audited
   (use repaired PR13B/PR13C audit links until then)
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C

Blocked/control-only:
PR15D, PR17, PR18, PR18x
```

The latest split-persona synthesis,
`pr-split-20260519T015616Z-synthesis.md`, confirms the Cycle414/Cycle416
replacement shape with these corrections:

- `PR02B` is now downscoped/no-file. The nonzero downscope report says PR02
  base and PR02B both pass seed `1030001`, with `promote: no`.
- PR07 remains non-fileable. The active Cycle416 owner-matrix path now has a
  nonzero report with two failing seed `966001` rows, `PR03` and `PR04`, but
  those rows are not owner attribution and do not promote any PR07 arm.
  Continue row-bearing current-endpoint owner comparison across `PR07B0`,
  `PR07B0A-G`, `HOLD-07C`, `PR03`, `PR04`, `PR05A`, `PR03B`,
  `PR05B/C/clean PR05D`, `PR14`, and current `PR15C-on-PR14B`; then add
  `6000007`, `1020001`, and `990001` as budget allows.
- The Cycle416 progress-unblock manifest for
  `deferred/rtc-reload-hydration-20260519T003407Z` is invalid as PR progress:
  the row is based on validation stack `72854f05...`, not a clean PR07 slot,
  and lacks PR07B/PR07C non-coverage proof. Do not publish raw PR07D or
  reload-hydration branches unless a PR07B/PR07C ownership audit proves a
  distinct delta.
- `PR07B0F-003407` and `PR07B0G-004916` are comparison arms only. The nonzero
  `20260519T010912Z` finalization report repaired stale PR15 ready rows,
  retained Cycle396 `PR15C-on-PR14B` as the endpoint, and added `B0G` based on
  `B0F`; neither arm is a fileable product PR without current-endpoint owner
  replay and audited refs.
- Strict `117126135e5e` / seed `5400020` still has no durable owner evidence.
  Do not name `PR18x`; current rows still fail through earlier controls,
  current `PR15C`, and PR07 arms rather than isolating a product-owned strict
  delta.
- The canonical CRDT endpoint is Cycle396 `PR15C-on-PR14B`. `PR15D` is
  blocked/control-only unless fresh current-base head/bundle/manifest evidence
  proves it after PR15C.
- The raw split now names a finer PR13B0/B1/B2/B3 target after PR13A, but the
  branch-link audit still has no verified links for those heads. Until exact
  B0-B3 refs are published and audited, the repaired PR13A/B/C audit refs are
  the only current PR13 PR-content links.
- `VALIDATION-LOCAL-DELETE-012938` remains deferred validation/test only. Replay
  seed `1000009` on the current `PR15C-on-PR14B` endpoint before any product
  promotion. Rich-text, linebreak, parser, search/live-collapse, and PR05D
  candidates still need PR05B/PR05C/current-endpoint owner comparison before
  product promotion.

Seed `1020002` still blocks final-stack fuzzing, rebuilt stack-wide validation,
GitHub filing, and its own final repair/reclassification only. It must not
block PR07 owner comparison, strict `117126135e5e` owner comparison, branch
audits, push manifests, PR02A/PR5/PR11 shaping, deferred downscope/promotion,
or loop repair.

The latest duplicate/noise synthesis is control-plane analysis, not a product
fix and not final-stack validation. It identifies the active leak in the
novelty producer scheduler: strict no-product `pre_action_bootstrap_stall`
records are mostly suppressed before expensive analysis, but novelty can still
misclassify mixed/productive runs as `noProductOnly` and block unrelated
replacement groups. The newest novelty status is startup-only and has not
completed a full coverage pass.

Do not file `PR02B`, any PR07 arm, `PR15D`, raw `PR07D`, stale `PR07C`, raw
deferred reload/search/rich-text heads, `PR17`, `PR18`, or `PR18x`.

## Branch And Ref Status

Remote status was collected at `2026-05-19T02:06:53Z`.

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

The branch-link audit was generated at `2026-05-19T02:06:59Z` from fetched
`danluu` refs. A row marked `verified-content` means the branch exists on
`danluu` and has a non-empty audited diff against the listed base. It does not
prove exact Cycle325/i40 publication shape, ancestry, owner evidence, or filing
readiness.

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
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | TBD | active PR06A-D split row; do not substitute grouped PR06 or PR06A prior-art refs |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | TBD | active PR06A-D split row; PR06B progress ref is useful evidence only |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | TBD | active PR06A-D split row |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07 |

### No-File Owner Queues

These rows are not in the fileable split. They stay here so the owner gates are
easy to scan.

| Queue item | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR02B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | downscoped/no-file; nonzero report says PR02 base and PR02B both pass seed `1030001`, `promote: no` |
| PR07A1/A2/A3 | Save response guard microheads | No verified branch link yet | TBD | TBD | non-fileable setup for PR07 owner comparison; exact refs and owner evidence missing |
| PR07B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | decision base for the PR07 queue; compare B0A, B0B, B0C, B0D-215248, B0E-233340, B0F-003407, B0G-004916, and HOLD-07C against PR03/PR04/PR05A plus current controls |
| PR07B0A-155713 | Saved-CRDT hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable owner candidate; raw `155713` full-stack ref must not be pushed |
| PR07B0B-195150 | Persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable owner candidate; owner replay and verified GitHub branch link are still missing |
| PR07B0C-201201 | Corrected persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable sibling owner candidate; owner replay and verified GitHub branch link are still missing |
| PR07B0D-215248 | Clean PR07B0-based derived-content authority arm | No verified branch link yet | TBD | TBD | active clean B0D comparison arm; needs row-bearing owner matrix before promotion |
| PR07B0E-233340 | Clean blocked runtime-gated candidate from raw `233340` | No verified branch link yet | TBD | TBD | evidence-only; clean base/head/bundle/manifest agreement exists, but seed `6000007` still fails post-readiness, so this is only a comparison arm |
| PR07B0F-003407 | Clean audit/replay candidate from nonzero source report | No verified branch link yet | TBD | TBD | evidence-only comparison arm; the raw `003407` progress-unblock manifest is invalid PR progress and must not be used as publication evidence |
| PR07B0G-004916 | Runtime-gated candidate based on B0F | No verified branch link yet | TBD | TBD | evidence-only comparison arm added by the nonzero `20260519T010912Z` finalization report; not a fileable product PR |
| HOLD-07C | Held PR07C/runtime control arm | No verified branch link yet | TBD | TBD | comparison control only; stale ready PR07C refs are not fileable |
| Strict 117126135e5e | Revision-restore strict owner queue / seed `5400020` | No verified branch link yet | TBD | TBD | unnamed owner queue; row-bearing strict evidence exists, but current failures still do not isolate ownership or justify a PR18x name |
| PR15D endpoint/control | Stale endpoint candidate after PR15C | No verified branch link yet | TBD | TBD | blocked/control-only; current endpoint remains Cycle396 PR15C-on-PR14B unless fresh current-base head/bundle/manifest proof exists |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | active split row; grouped PR11 is aggregate prior art only |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | active split row |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | TBD | active split row |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | TBD | active split row |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | TBD | active split row |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | TBD | active split row; grouped PR12 is aggregate prior art only |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | TBD | active split row |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | TBD | active split row |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired verified content; use until exact PR13B0-B3 refs are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired verified content; source-family PR13B0-B3 remain evidence-only without verified links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-C; needs final-PR14B materialization/audit |
| PR 15A-on-PR14B | Fallback-group move green on PR14B | No verified branch link yet | TBD | TBD | Cycle396 lane row; local evidence supports it, but exact final-PR14B ref is still missing from the branch audit |
| PR 15B-on-PR14B | Fallback-group insert-anchor green on PR14B | No verified branch link yet | TBD | TBD | Cycle396 lane row; local evidence supports it, but exact final-PR14B ref is still missing from the branch audit |
| PR 15C-on-PR14B | Fallback-group delete green on PR14B | No verified branch link yet | TBD | TBD | current canonical CRDT endpoint; exact final-PR14B ref is still missing from the branch audit |

### Verified Fallbacks And Prior Art

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

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T02:06:53Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T015651Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-19T02:06:07.269Z` for
`run-20260519T015651Z`:

```text
output dir: run-20260519T015651Z
status: monitor started; full coverage pass pending
observed roots: 615
previous records loaded: 90905
supervisor groups file: 2
active run dirs: 2
unmet goals: pending until first pass
harness-work candidates: pending until first pass
triage signatures: pending until first pass
likely-real visible: pending until first pass
```

Interpretation:

- Do not claim final-stack cleanliness. The newest novelty output is startup
  status only; the full pass has not completed and does not validate the
  accepted final PR stack.
- Treat current producer scheduling as control-plane context. It does not prove
  product cleanliness or product failure.
- The completed duplicate/noise gate-only checks report `candidates=0`,
  `suppressedStartup=0`, `signatures=0`, and live analysis skipped with no
  actionable signature. That is control-plane health evidence only.
- The fuzz repo remains active validation infrastructure, not the final PR
  stack.
- Current fuzz health does not clear PR filing, PR07 owner replay, strict
  owner replay, PR15C-on-PR14B branch-link gaps, PR15D control-only endpoint
  repair, reload-marker replay, seed `1020002`, exact branch-link gaps, or
  final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T01:53:11Z`:

```text
monitor passes: 2317
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-19T01:49:54Z
coverage files: 272 -> 55599
coverage files delta: 55327
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3407
summary startup failures last: 0
quality issues last: 0
memory free: 423 GB
load averages: 48.54 / 47.53 / 61.31 on 64 cores
enabled group current in trend snapshot: none listed
latest fuzz level mix:
  browser-e2e=27 lanes/24 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6028696
browser-e2e likely-real findings: 780 over 2589.5 runner-hours
```

Largest unmet goals remain save/reload and real-user depth:

```text
reload-post-action: 1175/2000
title-save-reload: 628/1000
real-user-editing success: 644/1000
body-save-reload: 687/1000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. CPU/load remain substantial, so new fuzz work should
stay bounded and oracle-specific rather than increasing broad browser
concurrency. Trend duplicate share was zero in the latest completed graph
snapshot, but the newer novelty status is startup-only, so it still cannot
confirm live product cleanliness.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260519T015616Z-synthesis.md`, keeps the Cycle414/Cycle416
replacement split but rejects the Cycle416 progress-unblock publication claim:

- Consume the PR02B downscope result: `PR02B` is no-file/downscoped, not a
  blocked fileable sidecar.
- Keep PR07 non-fileable. The active Cycle416 owner refresh has two failing
  seed `966001` rows, `PR03` and `PR04`, but that is still no owner attribution
  and no PR07 promotion. Continue only for row-bearing outputs across `PR07B0`,
  `PR07B0A-G`, `HOLD-07C`, `PR03`, `PR04`, `PR05A`, `PR03B`,
  `PR05B/C/clean PR05D`, `PR14`, and current `PR15C-on-PR14B`; then cover
  `6000007`, `1020001`, and `990001` as budget allows.
- Reject the `003407` progress-unblock push manifest as invalid parking input,
  not publication evidence. It is based on validation stack `72854f05...`, not
  a clean PR07 slot, and has no PR07B/PR07C non-coverage proof.
- Treat `PR07B0F-003407` and `PR07B0G-004916` as comparison arms only. The
  `20260519T010912Z` finalization report is nonzero and repaired the stale
  PR15-ready manifest rows, but B0F/B0G still need current-endpoint owner replay
  and verified links before any promotion.
- Strict `117126135e5e` / seed `5400020` still has no durable owner evidence
  and no `PR18x` name. Current rows still fail through earlier controls,
  current `PR15C`, and PR07 arms.
- Treat Cycle396 `PR15C-on-PR14B` as the current canonical CRDT endpoint. Demote
  `PR15D` to blocked/control-only unless fresh current-base proof exists.
- Reject fallback-tail, `d06e3528cbd`, stale PR05D, raw validation-stack claims,
  and stale PR15D publication evidence without fresh current-base manifest,
  bundle, head, and base agreement.
- Reject PR05D manifests based on `fix/rtc-fallback-group-delete-stale-local`,
  `d06e3528cbd`, or other fallback/PR15 tails. Rich-text, linebreak, parser,
  search/live-collapse, and reload diagnostics remain evidence-only until
  current-endpoint owner/control comparisons isolate a product-owned delta.
- Keep seed `1020002` scoped to final-stack fuzzing, rebuilt validation,
  filing, and its own repair/reclassification.
- Keep `VALIDATION-LOCAL-DELETE-012938` as deferred validation/test only.
  Replay seed `1000009` on current `PR15C-on-PR14B` before product promotion.

The same synthesis recommends one bounded loop/manifest repair to invalidate
the raw `003407` manifest in split text and harden the progress validator. It
also keeps final-stack fuzzing, rebuilt validation, and filing blocked on seed
`1020002`, while allowing independent PR07 owner comparison, strict owner
comparison, seed `1000009` current-PR15C replay, and branch-link audits to
continue.

The latest duplicate/noise synthesis file,
`duplicate-noise-20260519T015303Z-synthesis.md`, is nonzero. It treats the
remaining issue as producer/control-plane scheduling, not a product failure:
`rtc-browser-fuzz-novelty-monitor.mjs` can over-apply strict no-product
`pre_action_bootstrap_stall` holds, misclassify mixed/productive runs as
`noProductOnly`, and block unrelated replacement groups when `currentRunDirs`
are empty. The next safe remediation is novelty-scheduler-only: count
run-local product evidence, keep strict no-product startup records suppressed,
scope startup holds to the leaking producer/profile, and allow one unrelated
healthy fallback/materialization group when triage is clear.

The `duplicate-noise-20260519T011600Z-feedback-action.md` file is now nonzero
and completed. It implemented the bounded control-plane remediation from cycle
228:

- `rtc-browser-fuzz-novelty-monitor.mjs` prunes expired stored noise pauses and
  includes paused/no-analysis drain dirs when writing fallback no-analysis
  sentinels.
- `rtc-browser-fuzz-live-analysis-monitor.mjs` adds a gate-only triage timeout
  and normalizes strict/source-gated startup signatures before stale family
  fields.
- `rtc-browser-fuzz-triage-watcher.mjs`, `rtc-browser-fuzz-analysis-tier.mjs`,
  and `rtc-browser-fuzz-deep-analysis-tier.mjs` fail closed without
  current-output/supervisor context unless explicitly overridden for offline
  inspection.

Validation for that action passed `node --check` on all five changed `.mjs`
files. Old-root gate-only refresh covered five triage dirs with strict startup
queued/running count `0`; old-root live analysis launched only
product-evidence work. On the current root, gate-only refresh reported
`candidates=0`, `suppressedStartup=0`, `signatures=0`; live-analysis `--once`
returned `skipped-analysis-no-actionable-signature`; analysis-tier and
deep-analysis-tier `--once` saw zero source signatures and launched nothing.
The active coverage-guided watchdog has since restarted the campaign at
`run-20260519T015651Z`. The newest novelty status is startup-only, so recurrence
and remediation effectiveness still need the next full pass; previous-root
product-evidence duplicate/awareness signatures remain visible by design and
were not suppressed as startup noise.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance, and
old PR13 GitHub-ref caveats are superseded by the current branch-link audit,
the repaired PR13 review refs, the latest replacement split, and the latest
novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A/B/C-on-PR14B | active proposed rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | downscoped/no-file; base PR02 and PR02B both pass seed `1030001`, `promote: no` | Do not file. Reopen only with new owner/repro evidence and a verified branch-link audit |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, PR07B0E-233340, PR07B0F-003407, PR07B0G-004916, HOLD-07C | non-fileable owner-comparison fork; active Cycle416 matrix has two failing seed `966001` rows (`PR03`, `PR04`) but no owner attribution and no PR07 promotion | Require row-bearing PR07 current-endpoint owner matrix over seed `966001` first, then `6000007`, `1020001`, and `990001`, plus clean refs, current PR15C endpoint controls, first-divergence evidence, and branch audit before promotion |
| Cycle410/Cycle416 owner matrices | `rtc-cycle410-pr07-strict-post-readiness-owner-matrices`; `rtc-cycle416-pr07-current-endpoint-owner-matrix-refresh` | Cycle410 rows are same-divergence candidates only, and stale PR15D endpoint rows are not durable current-endpoint evidence; Cycle416 has started but only with failing `PR03`/`PR04` rows | Continue only while outputs are row-bearing and use current PR15C controls; otherwise repair the loop gate and avoid wait-only progress |
| PR07B0E-233340 | clean blocked candidate from raw `233340` | evidence-only; clean base/head/bundle/manifest agreement exists, but seed `6000007` still fails post-readiness before persistence parity | Compare with B0B/C/D and lower controls through the row-bearing owner matrix |
| PR07B0F-003407 / raw `003407` manifest | clean audit/replay candidate from a nonzero source report; `deferred/rtc-reload-hydration-20260519T003407Z` progress-unblock row | evidence-only comparison arm; the raw progress-unblock manifest is invalid PR progress because it is based on validation stack `72854f05...`, not a clean PR07 slot, and lacks PR07B/PR07C non-coverage proof | Replay seed `6000007` across B0/B/C/D/E/F/G/HOLD-07C and controls after current-base audit; do not publish raw reload-hydration/PR07D branches without ownership proof |
| PR07B0G-004916 | runtime-gated candidate based on B0F | evidence-only comparison arm added by the nonzero `20260519T010912Z` finalization report; not a fileable product PR | Include in the bounded PR07 current-endpoint owner-matrix refresh and require branch audit before promotion |
| Historical PR07 controls / failed raw reload refs | raw `203210`, raw `210726`, raw `231829`, raw `233340`, `PR07B0D-205218`, `PR07B0D-212232`, `PR07B0D-213739`, and related manifests | out of the active fork; `PR07B0D-215248` supersedes older B0D variants, and raw validation-stack heads are not pushable product refs | Reconsider only after clean allowed-base restack/audit plus owner replay justifies promotion |
| PR07D / PR17 / PR18 / PR18x | reload/post-save/rejoin residuals and old linear tail | rejected for the current split | Reconsider only after owner replay proves a product-owned boundary not covered by the accepted PR07 fork |
| DIAG reload/search/rich-text diagnostics | `DIAG-HTTP-REJOIN-220755`, `DIAG-RELOAD-220755`, `DIAG-RELOAD-225820`, `DIAG-SEARCH-225317`, `DIAG-RICHTEXT-230324`, `DIAG-RICHTEXT-232836` | diagnostic/test side lanes only; nonzero finalization reports add evidence but no product PR | Run focused first-loss replay before assigning reload, search, rich-text, or rejoin product ownership |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the PR07 owner queue, PR14, and the current PR15C-on-PR14B endpoint before assigning any new owner row |
| Revision-restore strict signal | `117126135e5e`, seed `5400020`, PR03, held PR03B, PR07 arms | owner-comparison target only; current rows still fail through earlier controls/current PR15C/PR07 arms and do not assign ownership | Require row-bearing strict owner comparison against PR03, held PR03B, PR07 arms, PR05C, clean PR05D, PR14, and the current PR15C-on-PR14B endpoint before naming PR18x |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06, PR06A prior-art, and PR06B progress refs are verified; active PR06A-D and PR06E still have no exact verified micro-split links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15C-on-PR14B | CRDT/data-loss lane starts from PR06D, not PR07, and currently ends at Cycle396 PR15C-on-PR14B | Prove `PR06D -> PR09`, accepted PR07 fork non-ancestry where required, old HOLD non-ancestry, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B, PR15A/B/C-on-PR14B | Cycle396 PR15C-on-PR14B is the current canonical CRDT endpoint, but branch-link audit verifies only PR15A-C component prior art and no exact final-PR14B materialized refs | Publish/fetch/audit exact PR14B-based refs, confirm ancestry, and require nonzero materializer/audit evidence |
| PR15D endpoint/control | stale Cycle324/Cycle325/Cycle376 PR15D rows and the repaired `20260519T010912Z` endpoint manifest | blocked/control-only; the nonzero `010912Z` finalization removed PR15D from ready/push rows and restored Cycle396 PR15C-on-PR14B as the endpoint | Accept PR15D only with fresh current-base head/bundle/manifest proof after PR15C |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only; do not wait on it before running independent PR07/strict/branch-audit work | Repair or explicitly reclassify before final-stack validation and filing |
| `VALIDATION-LOCAL-DELETE-012938` / seed `1000009` | deferred local-delete validation/test lane | deferred validation/test only; not product PR evidence and not part of filing rows | Replay seed `1000009` on current PR15C-on-PR14B before product promotion |
| Reload marker/lifecycle work | HARNESS reload markers, seeds `990001`/`990003`, same-user lifecycle seeds, PR07C seeds, deferred reload outputs | harness/diagnostic only until replay proves product ownership | Consume PR07 owner replay when present, then require product-owned first-loss boundary before promotion |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, startup-noise cooldowns, family-capped duplicate holds, current-run negative gates, represented product-evidence duplicates, stale/no-analysis drain admission | prior novelty/supervisor/live-analysis hardening exists, but the latest `015303Z` synthesis identifies a remaining novelty scheduler leak: mixed/productive runs can be over-classified as no-product startup noise and block unrelated replacements | Patch only the novelty scheduler to count run-local product evidence, scope startup holds to the leaking producer/profile, preserve product-evidence signatures, and allow one unrelated healthy fallback when triage is clear; validate with `node --check` and gate-only/current-root checks |
| Current fuzz validation | `run-20260519T015651Z`, novelty status at `2026-05-19T02:06:07.269Z`, trend generated at `2026-05-19T01:53:11Z` | current novelty output is startup-only: full coverage pass pending, `615` observed roots, `90905` previous records loaded, `2` active run dirs; latest completed trend context has `55599` coverage files and `4` unmet goals | Use as health/control-plane evidence only; still require owner replay, PR15C-on-PR14B branch audit, PR15D control-only proof, reload-marker downscope, seed `1020002` handling, and final PR-stack validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw `155713`, raw
`PR07B0B-195150`, raw `PR07B0C-201201`,
`PR07B0D-205218`/`212232`/`213739` historical controls, raw
`PR07B0D-215248`, raw `PR07B0F-003407`, raw `PR07B0G-004916`, raw `203210`,
raw `210726`, raw `231829`, raw `233340`, raw PR07D, raw `HOLD-07C`, the
Cycle416 `deferred/rtc-reload-hydration-20260519T003407Z` progress-unblock
manifest, PR02B, stale/ready-marked PR15D, PR17, PR18, PR18x, zero-byte
finalization output, header-only matrices, header-only push manifests, the
`20260519T005908Z` stale-PR15D ready output, or local finalization artifacts
as-is.

Before filing any maintainer-facing PR:

1. Use the replacement fileable shape above: ready/local lane plus
   CRDT/data-loss lane ending at Cycle396 `PR15C-on-PR14B`. PR02B, PR07,
   strict `117126135e5e`, and PR15D are not proposed filing rows.
2. Treat PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, clean blocked
   PR07B0E-233340, `PR07B0F-003407`, `PR07B0G-004916`, and HOLD-07C as sibling owner
   candidates. Require
   oracle-bearing owner replay outputs, first-divergence evidence, PR07B/PR07C
   non-coverage proof for reload-hydration deltas, clean materialized refs,
   exact branch links, and `git diff --check` before promoting any PR07 arm.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   and PR15A/B/C after final PR14B materialization. Keep PR15D control-only
   unless a fresh current-base head/bundle/manifest audit proves it belongs.
5. Run held owner comparisons for strict projection, common-blocks, rich-text,
   search/live-collapse, revision-restore `117126135e5e`, and reload
   candidates before creating new product rows.
6. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
7. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
8. Treat the latest duplicate/noise producer/scheduler analysis and the current
   startup-only fuzz root as control-plane/fuzz health, not product validation
   or final-stack readiness.
9. After PR07/strict owner evidence, exact branch-link audit for missing rows,
   PR15C-on-PR14B endpoint materialization, PR15D control-only repair or fresh
   proof, reload-marker replay/downscope, and seed `1020002` repair or
   reclassification land, rebuild the combined validation stack from explicit
   accepted heads excluding stale PR15D, then run focused checks, touched-file
   lint, branch graph/containment evidence, adjacent range-diffs/diffstats/
   numstats, `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

Useful bounded work now:

- keep the `20260519T010912Z` endpoint repair in force: Cycle396
  `PR15C-on-PR14B` is canonical, and PR15D stays blocked/control-only unless a
  fresh current-base audit proves it;
- continue the bounded PR07 current-endpoint owner-matrix refresh only while it
  produces row-bearing output:
  `run-rtc-cycle416-pr07-current-endpoint-owner-matrix-refresh.sh`, starting
  with seed `966001` and then `6000007`, `1020001`, and `990001` as budget
  allows, against current `PR15C-on-PR14B` controls and the PR07 arms;
- continue or replace the strict `117126135e5e` seed `5400020`
  current-endpoint matrix only if the active strict job is not still producing
  fresh rows; rows that still fail through earlier controls/current PR15C/PR07
  arms are not owner evidence;
- invalidate the raw `003407` progress-unblock manifest in split/loop state and
  harden the progress gate so wait-only feedback, stale endpoint controls,
  header-only matrices, raw deferred manifests, and active `1020002` sessions
  cannot satisfy progress;
- replay seed `1000009` on the current `PR15C-on-PR14B` endpoint for
  `VALIDATION-LOCAL-DELETE-012938` before any product promotion;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`;
- patch the novelty scheduler only if continuing duplicate/noise work proceeds:
  count run-local product evidence, avoid broad `noProductOnly` holds for mixed
  productive runs, scope startup holds to the leaking producer/profile, and
  allow one unrelated healthy fallback when triage is clear.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw deferred publication/replay, raw PR07D, raw `HOLD-07C`, raw
`003407` reload-hydration publication, PR17, PR18, PR18x promotion, PR15D
promotion from stale endpoint evidence, diagnostic product promotion before
focused first-loss replay, broad consumer duplicate/noise suppression, or extra
browser lanes.
