# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T12:16:21Z`

Trigger event:
`pr-split-2026-05-18T12-15-34Z-20260518T120257Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T12-15-34Z-20260518T120257Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest split-persona synthesis,
`pr-split-20260518T120257Z-synthesis.md`, says the split needs a PR07-tail
change. Keep the Cycle325/i40 ready/local lane and CRDT/data-loss lane, but do
not treat current `PR07B1A` as the review-safe tail or as covering
`111430/114448`. Current `PR07B1A`, raw `111430`, `HOLD-07B2`, and `HOLD-07C`
have different patch IDs, `patch_equivalent=none`, and the `111430` restack
onto the PR07B1 base still conflicts in `packages/sync/src/test/manager.ts`.
The latest applied feedback in `current-pr-split.md` is still Cycle 358:
`20260518T113458Z` is the freshest nonzero finalization input, and the
post-`113458Z` bundle/head/manifest audit completed with `PASS` for all `70`
manifest rows. The `20260518T120507Z` finalization report is zero-byte and
counts as no evidence. The current split remains blocked for GitHub filing,
final-stack fuzzing, and stack-wide validation because `1020002`, PR07 owner
evidence, missing exact GitHub refs, and deferred-freshness warnings remain
open. Ready/local work and the CRDT/data-loss lane can continue independently
while those blockers remain open.

Current blockers and status changes:

- `PR07B1A` is no longer a file-ready tail by default. Treat the PR07 tail as a
  decision fork after `PR07B1`: compare current `PR07B1A` against a restacked
  `111430/114448` candidate, while keeping `HOLD-07B2` and `HOLD-07C` as hold
  arms. The current evidence explicitly says current `PR07B1A` cannot be
  treated as covering `111430/114448`; patch IDs differ, `patch_equivalent=none`,
  and the `111430` restack conflicts in `packages/sync/src/test/manager.ts`.
  After conflict resolution and owner replay, `111430/114448` should either
  replace `PR07B1A`, become additive `PR07B1B`, or force a PR07 reorder after
  `PR07B0` with old `PR07B1` demoted to hold/comparison. Do not file raw
  deferred branches and do not create raw `PR07D`, `PR17`, `PR18`, or `PR18x`.
- PR07 runtime readiness has moved: the `105353Z` continuation produced durable
  `repaired_ready` evidence. PR07 product ownership is still unresolved because
  seed `5200011` now reaches a post-readiness marker-set divergence. The next
  useful PR07 action is the bounded `111430/114448` restack plus owner replay
  across `PR07B0`, `PR07B1`, current `PR07B1A`, the restacked candidate if
  produced, `HOLD-07B2`, and `HOLD-07C`, with REST/meta, `_crdt_document`,
  edited-record, Y.Doc/provider/awareness, UI, branch-head, and block-tree
  first-divergence artifacts.
- Seed `1020002` blocks broad final-stack fuzzing, GitHub filing, rebuilt
  stack-wide validation, and its own repair or reclassification. It must not
  serialize independent ready/local work, CRDT-lane work, branch audit,
  deferred downscope, PR07 owner replay, PR02A/PR5/PR11 shaping, or loop repair
  work.
- Verified GitHub branch links are still missing for many exact Cycle325/i40
  rows, including the owner-gated PR07 microheads and most ungrouped CRDT
  source-family rows. Rows below either use verified audit links or explicitly
  say `No verified branch link yet`.
- For PR13 maintainer-facing content, use only the repaired audit refs:
  `review/rtc-pr13a-observed-delete-provenance-repaired`,
  `review/rtc-pr13b-source-retirement`, and
  `review/rtc-pr13c-stale-block-identity-smear-guard`. The finer PR13B0-B3
  source-family split remains evidence-only until exact refs are published and
  audited.
- Duplicate/noise control-plane work is not the immediate product blocker. The
  latest duplicate/noise synthesis,
  `duplicate-noise-20260518T115752Z-synthesis.md`, still identifies the novelty
  monitor producer scheduler as the remaining leak: historical or cross-output
  duplicate/noise pause state must not hard-block current producer
  materialization. The latest paired feedback action available in this input set,
  `duplicate-noise-20260518T113229Z-feedback-action.md`, had already patched the
  novelty monitor to policy `26`, expanded represented duplicate-family holds,
  and passed syntax checks. Treat this as control-plane hygiene, not product
  validation.
- The latest raw novelty read for `run-20260518T120601Z` is a full current pass,
  not startup-only. It saw `52,459` coverage files and `84,053` total records,
  still has `4` unmet goals, recommended only real-user save/reload/editing/rich
  text top-offs, and reports `0` current likely-real visible failures. Current
  active run dirs are `0`; the drain scope has one raw no-product
  `pre_action_bootstrap_stall` signature. This is current fuzz health/control
  evidence only, not final-stack validation.
- Trend evidence remains useful but not a filing gate. The latest trend packet
  was generated at `2026-05-18T12:02:14Z`, reports `4` unmet goals, browser-E2E
  as the only level with confirmed likely-real findings, zero quality issues,
  latest graph duplicate share `0`, historical duplicate share `0.3427`, and a
  browser-heavy mix. The raw novelty read at `12:14:18Z` is newer than that
  graph snapshot and confirms no current visible likely-real failures, but it is
  not final-stack validation. New fuzz work should stay bounded and
  oracle-specific.

The active replacement topology is:

```text
Ready/local lane:
PR01 -> PR02 (+ PR02A) -> PR03 (hold PR03B) -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D (+ PR06E)

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B
-> PR15A -> PR15B -> PR15C -> PR15D

Runtime-gated PR07 lane:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1-current
  -> decision fork:
     current PR07B1A
     restacked 111430/114448 comparison candidate
(after owner replay, the candidate either replaces PR07B1A, becomes PR07B1B,
or reorders PR07 after PR07B0; hold HOLD-07B2, HOLD-07C, and PR03B as
comparison arms; no raw PR07D)
```

Reject grouped `PR06`, `PR11`, `PR12`, and `PR15`; stale
Cycle293/Cycle306/local-publish rows; fallback-tail `PR05D`;
`d06e3528cbd`; `fix/rtc-fallback-group-delete-stale-local`; raw
`deferred/*` product-filing heads; raw `PR07D`; `PR17`; `PR18`; and `PR18x`.
Clean `PR05D` remains only `27c6e7924217038ed9b4ff71585e8041c67765a4`.

## Branch And Ref Status

Remote status was collected at `2026-05-18T12:16:16Z`.

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

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-18T12:16:21Z` from fetched
`danluu` refs. It proves only that rows marked `verified-content` exist on
`danluu` and have non-empty audited diffs against the listed bases. It does not
prove exact i40 publication shape, ancestry, owner evidence, or filing
readiness.

Use only these repaired audited PR13 review refs for PR13 content or fallback
evidence:

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

### Common Mainline

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | HTTP room-isolation regression sidecar after PR2 | No verified branch link yet | TBD | TBD | evidence-only until pushed/fetched/audited |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i40 row; aggregate PR05 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail PR05D |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07 |

### Runtime/Owner-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active i40 row; owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active i40 row; prior replay evidence is stale/pre-oracle |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active i40 row; old holds stay siblings from here |
| PR 7B1A | Current stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | decision-fork side after PR07B1; patch IDs differ from `111430`, so it is not file-ready as coverage for `111430/114448` until owner replay proves that |
| PR 7B1B? | Restacked `111430/114448` reload/stale-epoch candidate | No verified branch link yet | TBD | TBD | comparison candidate only; no ref exists while `packages/sync/src/test/manager.ts` conflicts; after conflict resolution and owner replay it may replace PR07B1A, become additive PR07B1B, or force PR07 reorder |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired verified content; use this branch until exact PR13B0-B3 refs are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired verified content; source-family PR13B0-B3 remain evidence-only without verified links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-D |
| PR 15A | Fallback-group operation subhead `687a13` after PR14B | No verified branch link yet | TBD | TBD | active i40 row; verified component prior art is not exact PR14B-based ref |
| PR 15B | Fallback-group operation subhead `17569a` after PR15A | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15C | Fallback-group operation subhead `bcf1c4` after PR15B | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15D | Fallback-group operation subhead `276709` after PR15C | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |

### Verified Fallbacks And Prior Art

These rows have verified audit links, but they are not the exact active
Cycle325/i40 proposed PR rows unless the status says so.

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-B1 plus PR07B1A split |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T12:16:16Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T120601Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw novelty monitor status at `2026-05-18T12:14:18.189Z` completed a
current pass for the current output root:

```text
coverage files: 52459
total records seen: 84053
unmet goals: 4
recommended groups: novelty-ws-real-user-save-reload,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text
current-run active dirs: 0
current-run likely-real visible: 0
current drain raw signatures: 1
current drain likely-real visible: 0
current drain top raw family: pre_action_bootstrap_stall
historical likely-real visible: 338
historical likely-real merged duplicates: 1419
historical oracle/noise questions: 46
quality issues: 0
```

Interpretation:

- The newest novelty read proves the policy-26 monitor can complete a current
  pass with no current visible likely-real failures, but it also shows `0`
  active current-run dirs and only drain-scope startup noise. It does not prove
  final-stack readiness or product-family ownership.
- The latest duplicate/noise synthesis says strict no-product startup stalls are
  mostly fixed in analysis consumers, and the remaining control-plane risk is
  still producer scheduling for represented product-evidence duplicate families
  and mixed startup-noise/product-evidence lanes.
- Product-evidence failures must remain visible through one representative or
  family-capped metadata; strict no-product startup noise should be held at the
  producer/scheduler boundary without globally hiding product evidence.
- The fuzz repo is still active validation infrastructure. It is not the final
  PR stack and cannot substitute for a rebuilt combined validation stack from
  explicit Cycle325/i40 heads.

The latest trend packet was generated at `2026-05-18T12:02:14Z`:

```text
monitor passes: 2250
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T11:49:39Z
coverage files: 272 -> 52364
coverage files delta: 52092
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3427
summary startup failures last: 0
quality issues last: 0
memory free: 417.5 GB
load averages: 45.54 / 58.94 / 67 on 64 cores
enabled groups current: none recorded in trend snapshot
latest fuzz level mix:
  browser-e2e=25 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5698932
browser-e2e likely-real findings: 739 over 2271.6 runner-hours
latest suggested PR net LOC total: 4114
```

Latest trend unmet goals remain concentrated in save/reload and real-user
depth:

```text
reload-post-action: 1113/2000, remaining 887
title-save-reload: 568/1000, remaining 432
real-user-editing success: 609/1000, remaining 391
body-save-reload: 627/1000, remaining 373
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. The latest mix is still browser-heavy; new work should
stay bounded and oracle-specific rather than simply adding broad browser
concurrency.

## Status-Persona Analysis

The newest split-persona synthesis available in the collected persona inputs,
`pr-split-20260518T120257Z-synthesis.md`, says the split needs a PR07-tail
change. The Cycle325/i40 parallel-lane shape still holds for the ready/local
and CRDT/data-loss lanes, but current `PR07B1 -> PR07B1A` is not review-safe as
the fixed PR07 tail. Current `PR07B1A` cannot be treated as covering
`111430/114448`: patch IDs differ, `patch_equivalent=none`, and the restack
conflicts in `packages/sync/src/test/manager.ts`. The latest paired feedback
action remains `pr-split-20260518T113235Z-feedback-action.md`:
`current-pr-split.md` ends with the Cycle 358 action note, uses nonzero
`20260518T113458Z` as the freshest useful finalization input, and records a
completed post-`113458Z` bundle/head/manifest audit with `status=PASS`, `0`
hard failures, `5` deferred-freshness warnings, and `70` verified manifest
rows. Those warnings mean `113458Z` is current branch/audit evidence, but not
complete deferred-coverage proof. The `20260518T120507Z` finalization report is
zero-byte and must be ignored as evidence.

The ready/local lane and CRDT/data-loss lane remain independent from PR07 and
seed `1020002`; the PR07 lane remains separate:
`PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1-current`, then current
`PR07B1A` and the restacked `111430/114448` candidate must be compared before
choosing the maintainer-facing tail. `HOLD-07B2`, `HOLD-07C`, and `PR03B`
remain hold/comparison arms. Raw `PR07D`, `PR17`, `PR18`, and `PR18x` remain
rejected. Parser, linebreak, and rich-text reductions must compare against
`PR05B`, `PR05C`, and clean `PR05D` before any new owner or `PR18x` naming.

`PR07B1A` remains plausible as one side of the fork, but it is not file-ready
and is not sufficient evidence for `111430/114448`. The next PR07 gate is one
bounded restack/owner job for `111430/114448`: resolve or explicitly downscope
the `packages/sync/src/test/manager.ts` conflict, emit patch IDs, range-diffs,
diffstats, base/head/bundle/manifest checks, and then run owner replay. If owner
replay shows that candidate supersedes current `PR07B1A`, replace `PR07B1A`; if
distinct and additive, file it as `PR07B1B`; if it supersedes current `PR07B1`,
reorder after `PR07B0` and demote old `PR07B1` to hold/comparison. The owner
replay must compare `PR07B0`, `PR07B1`, current `PR07B1A`, restacked
`111430/114448` if produced, `HOLD-07B2`, and `HOLD-07C`, with seeds
`5200020`, `5200013`, `5200024`, and current reload/rejoin seed `5100001` at
minimum, plus durable REST/meta, `_crdt_document`, edited-record,
Y.Doc/provider/awareness, UI collaborator state, branch head, root-space, and
first-divergence snapshots.

The latest duplicate/noise synthesis,
`duplicate-noise-20260518T115752Z-synthesis.md`, is nonzero and supersedes the
older duplicate/noise synthesis. It identifies a novelty-monitor producer
scheduling leak: historical or cross-output pause state must stay reporting
context and must not hard-block current producer materialization unless it
belongs to the current `OUTPUT_DIR` and has no product evidence. The latest
feedback action available here,
`duplicate-noise-20260518T113229Z-feedback-action.md`, implemented a bounded
fuzzer-side policy-`26` fix in `rtc-browser-fuzz-novelty-monitor.mjs`, expanded
duplicate-family producer holds, blocked top-off bypass for represented
product-evidence duplicate families, and passed syntax checks. The new raw
novelty status is a full policy-26 pass with no current visible likely-real
failures, one drain startup-noise raw signature, and `0` active current-run
dirs. That is useful control-plane evidence, not product validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, current Cycle325/i40 parallel-lane recommendation, PR06E/PR02A sidecar
status, PR07 decision-fork owner evidence requirements, the completed
duplicate/noise control-plane patch, and the latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle325/i40 `20260518T103442Z`, non-superseding `104444Z`/audited diagnostic wrapper `105447Z`, superseded `20260518T112455Z`, current nonzero `20260518T113458Z`, zero-byte `20260518T120507Z`, current `PR07B1A`, raw reload candidates `111430`/`114448`, deferred candidates `105921Z`, `105418Z`, `105924Z`, `113945Z`, `114951`, `115454`, active/no-report `115957`, `120501`, `112436`, `111933`, `110927`, `104415Z`, `104413Z`, `103910Z`, reload/search/rich-text diagnostics, harness rows | active source family; latest applied Cycle358 action uses Cycle325/i40 parallel lanes, `113458Z` as freshest useful finalization input, and a completed post-`113458Z` audit with `PASS`, `0` hard failures, `5` deferred-freshness warnings, and `70` verified manifest rows; latest split synthesis says a split change is needed because PR07B1A is not review-safe for `111430/114448`; filing remains blocked by PR07 owner evidence, missing verified GitHub links, seed `1020002`, unresolved deferred freshness, zero-byte `120507Z`, and final validation | Resolve/downscope the `111430/114448` restack conflict, complete PR07 owner replay, choose replace/add/reorder for the PR07 tail, publish/fetch/audit exact GitHub links, run a post-`115504` deferred-freshness/bundle audit covering at least `114448`, `114951`, `115454`, active/no-report `115957`, and `120501`, repair or reclassify seed `1020002`, then run final-stack validation gates |
| Stale or incomplete publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, previous zero-byte reports, zero-byte `20260518T120507Z`, superseded `20260518T112455Z`, `113458Z` before the completed audit, deferred reports not covered by `113458Z` freshness (`105921Z`, `105418Z`, `105924Z`, `113945Z`, `114448`, `114951`, `115454`, `115957`, `120501`), `report.tmp`, header-only outputs, stale manifests, stale `093423Z`, historical `095429Z`, historical `101435Z`, historical `102438Z`, non-superseding wrapper `104444Z`, and diagnostic-only `105447Z` | no filing evidence unless freshness and head agreement are proven; `113458Z` is current branch/audit evidence but not complete deferred-coverage proof; zero-byte, header-only, setup-only, pre-oracle, disk-preflight-only, stale, superseded, wrapper-only, diagnostic-only, active-without-report, or unaudited artifacts are no progress | Replace stale or unaudited artifacts with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, PR07B1A, possible PR07B1B/restacked `111430/114448`, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, current PR07B1A, raw `111430/114448` candidate, `HOLD-07B2`, `HOLD-07C`, `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`, `DIAG-RELOAD-092834`, pending reload diagnostics; seeds `5200020`, `5200013`, `5200024`, `5100001`, plus broader witnesses `5200011`, `5200017`, `5200010`, `5200001`, `5200005`, `7110004`, `7110017` | runtime readiness produced durable `repaired_ready` evidence in the `105353Z` continuation, but setup/reload evidence is not product proof; current PR07B1A remains plausible but not file-ready and cannot be treated as covering `111430/114448`; patch IDs differ, `patch_equivalent=none`, and the PR07B1 restack conflicted in `packages/sync/src/test/manager.ts`, so no replacement ref exists; latest synthesis requires a PR07 decision fork | Resolve or downscope the `111430/114448` conflict, then run owner replay across `PR07B0`, `PR07B1`, current `PR07B1A`, restacked candidate if produced, `HOLD-07B2`, and `HOLD-07C`, capturing REST/meta, `_crdt_document`, edited-record, Y.Doc/provider/awareness, UI collaborator state, branch head, root-space, block-tree first-divergence snapshots, replay logs, validation/classification TSVs, and nonzero `report.md` |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-`HOLD-07C` non-coverage with first-divergence evidence |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet; rich-text residuals stay diagnostic | Publish/fetch/audit clean PR05D and compare PR05B/PR05C/clean PR05D before assigning any PR18x owner |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | latest replacement requires the CRDT/data-loss lane from PR06D, not PR07 | Prove `PR06D -> PR09`, `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use the repaired verified audit refs and are the only current PR13 PR-content links; PR13B0/B1/B2/B3 remain source-family/evidence-only until explicit refs exist | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| Strict stale projection owner comparison | `HOLD-STRICT-STALE-PROJECTION-5200005/5200008`; compare `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`, `PR07B1A`, and `HOLD-07C` | held comparison lane only; not a product PR slot | Run focused owner replay for seeds `5200005` and `5200008` before creating any new strict-projection product row |
| Common-blocks owner comparison | `HOLD-COMMON-BLOCKS-965003`, plus related seeds `965010` and `5800001` | held comparison row; `965003` is likely real but currently reads as post-save/reload common-block canonical drift, not clean pre-save search loss | Compare against `PR05B`, `PR05C`, clean `PR05D`, `PR07B0`, `PR07B1`, `PR07B1A`, and `HOLD-07C` |
| Block-library canonicalization side evidence | `SIDE-BLOCKLIB-COVER-965004` | likely `core/cover` or block-library canonicalization issue; not RTC-stack product work yet | Track separately as block-library diagnostic unless ownership evidence changes |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Active deferred sessions | reload-hydration, search/live-collapse, rich-text suffix, diagnostics, duplicate search/rich-text evidence, harness rows, newer candidates `111430`/`114448`, `114951`, `115454`, active/no-report `115957`, `120501`, `113945Z`, `112436`, `111933`, `110927`, `105921Z`, `105924Z`, `104415Z`, `104413Z`, `103910Z`, `105418Z` | active sessions are not progress by themselves; `DIAG-SEARCH-104415` and `DIAG-RICH-TEXT-103910` are diagnostic/test refs only; older `105921Z` reload, `105418Z` rich-text, `105924Z` search, newer `113945Z` rich-text, and later candidates need a post-`115504` freshness/bundle audit; raw reload guards must be range-diffed/restacked before they can affect the PR07 tail; harness rows are not product fixes | Count only nonempty durable reports/artifacts, audited harness refs, focused owner proof, or a clear downscope/promotion decision |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, real-user duplicate-family holds, novelty recommendation/fallback enable paths, empty materialization rescue, paused/no-analysis drain holds, `.triage-watcher/no-analysis.json` sentinel lifetime, mixed product-evidence/startup-noise runs, and max-failed deep-analysis jobs | latest `115752Z` synthesis identifies novelty-monitor producer scheduling as the remaining leak; `113229Z` feedback action patched `rtc-browser-fuzz-novelty-monitor.mjs`, set policy `26`, expanded duplicate-family producer holds, blocked top-off bypass for represented product-evidence duplicate families, and passed syntax checks; latest raw novelty completed a policy-26 pass with `0` active current-run dirs, `0` current likely-real visible failures, and one drain startup-noise raw signature | Treat the full policy-26 pass as control-plane health only; keep product-evidence representatives visible/family-capped, do not re-enable noisy groups through coverage recommendations while cooldowns hold, and validate any further scheduler work with `node --check`, gate-only triage, targeted monitor restart, and startup-analysis/job checks |
| Current fuzz validation | `run-20260518T120601Z`, novelty read at `2026-05-18T12:14:18.189Z`, trend generated at `2026-05-18T12:02:14Z` | raw novelty full pass has `52459` coverage files, `84053` total records, `4` unmet goals, `0` active current-run dirs, `0` current likely-real visible failures, and one drain no-product startup-noise raw signature; trend evidence has `52364` latest coverage files, `4` unmet goals, latest graph duplicate share `0`, historical duplicate share `0.3427`, browser-heavy mix, and 739 browser-E2E likely-real findings over 2271.6 runner-hours | Treat as current fuzz health/control-plane/trend evidence only; accepted product evidence, owner replay, exact branch audit, seed `1020002` repair/reclassification, and final PR-stack validation are still required before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, grouped
Cycle320/i40, grouped PR06/PR11/PR12/PR15 as active units, `ready/*`,
validation-stack, dirty evidence, fallback-tail branches, raw
deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale finalization
artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle325/i40 parallel-lane shape. Treat `20260518T113458Z` as the
   freshest finalization input and the completed post-`113458Z` audit as
   current branch/bundle/manifest proof for its `70` rows, but not as complete
   deferred-coverage proof while the `5` deferred-freshness warnings remain.
   Treat zero-byte `20260518T120507Z` as no evidence. Ready/local work and the
   CRDT/data-loss lane should not wait behind PR07 or seed `1020002`. Treat the
   PR07 tail as a decision fork after `PR07B1`: current `PR07B1A` remains one
   side, and restacked `111430/114448` is the comparison side. Do not file the
   PR07 lane until conflict resolution, exact branch links, and owner replay
   choose replace/add/reorder for that fork.
2. Treat audited `20260518T095429Z`, `20260518T101435Z`, and
   `20260518T102438Z` as historical. Treat `20260518T104444Z` as a
   non-superseding wrapper and `105447Z` as an audited non-superseding
   diagnostic wrapper over `103442Z`; it provides diagnostic
   `DIAG-SEARCH-104415` and `DIAG-RICH-TEXT-103910` support. Treat `112455Z`
   as superseded by the `113458Z` audit. Do not count deferred reports such as
   `105921Z`, `105418Z`, `105924Z`, or `113945Z` as covered until a later
   finalization/downscope pass proves terminal deferred evidence, base
   allowlist, live heads, branch audit, bundle heads, manifest SHAs, shape
   policy, and deferred freshness all agree. The next freshness pass should be
   post-`115504` and cover at least `114448`, `114951`, `115454`,
   active/no-report `115957`, and `120501`.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Before treating PR07 output as product evidence, use the `105353Z`
   `repaired_ready` runtime evidence only as a precondition, not as product
   proof. The latest `PR07B1A`/`111430` comparison found distinct patch IDs,
   `patch_equivalent=none`, and a `packages/sync/src/test/manager.ts` restack
   conflict; resolve or downscope the `111430/114448` conflict before
   replacing, adding to, or reordering the PR07 tail. Then run narrow PR07
   owner replay before the broader matrix.
   Compare `PR07B0`, `PR07B1`, current `PR07B1A`, restacked candidate if
   produced, `HOLD-07B2`, `HOLD-07C`, `DIAG-RELOAD-080250`,
   `DIAG-RELOAD-082300`, `DIAG-RELOAD-092834`, and any newly audited reload
   diagnostic rows.
5. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old
   `HOLD-07B2 !-> PR09/PR15D`, clean PR05D only, PR15A-D after PR14B, and no
   fallback-tail PR05D.
6. Run held owner comparisons for `5200005`, `5200008`, `965003`, `965010`,
   `5800001`, and any rich-text/search/reload candidates before creating new
   product rows. Keep `965004` separate as block-library canonicalization
   evidence unless ownership changes.
7. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
8. Keep old aggregate or stale prior art, broad PR08, dirty evidence branches,
   stale/misordered PR13 refs, fallback-tail PR15/PR05D confusion, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
9. Treat duplicate/noise active-sentinel work, producer-cooldown repair, and
   scheduler-deadlock repair as control-plane hygiene only. The latest
   duplicate/noise action already patched the novelty monitor for represented
   product-evidence duplicate-family holds, and the newest raw novelty read is a
   full policy-26 pass with `0` current visible likely-real failures. That still
   does not count as product validation or final-stack readiness.
10. After the PR07 decision fork has owner evidence, exact branch-link audit
   for missing rows, and seed `1020002` repair or reclassification land,
   rebuild the combined validation stack from explicit Cycle325/i40 heads plus
   accepted epoch work,
   then run focused checks, touched-file lint, branch graph/containment
   evidence, adjacent range-diffs/diffstats/numstats, `git diff --check`,
   feasible runtime checks, and fresh stack-wide validation.

The current useful bounded work is:

- run a post-`115504` deferred-freshness/bundle audit covering at least
  `114448`, `114951`, `115454`, active/no-report `115957`, and `120501`, while
  still accounting for older warnings such as `105921Z`, `105418Z`,
  `105924Z`, and `113945Z`
- resolve or intentionally downscope the `111430/114448` restack conflict in
  `packages/sync/src/test/manager.ts`, then regenerate the chosen PR07 tail
  manifest if the slot changes
- run PR07 owner replay now that runtime readiness has `repaired_ready`
  evidence, comparing `PR07B0`, `PR07B1`, current `PR07B1A`, restacked
  `111430/114448` if produced, `HOLD-07B2`, `HOLD-07C`, and reload diagnostics
- run focused PR03B revision-restore owner comparison against strict witnesses
  `5400020`, `5300049`, and `5300051`
- run strict parser/linebreak/rich-text owner comparison only after PR05B,
  PR05C, and clean PR05D comparison is available
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`
- refresh candidate/deferred status using only nonzero completed reports; never
  count `report.tmp`, setup-only, disk-preflight-only, zero-byte `120507Z`, or
  other zero-byte artifacts as evidence
- run strict owner comparison before assigning any new rich-text/search/parser
  owner rows
- run common-blocks owner comparison for `965003`, `965010`, and `5800001`
- separately classify likely `core/cover` or block-library canonicalization
  seed `965004`
- audit `111933` pre-save search against `DIAG-SEARCH-104415`; keep it
  diagnostic-only until replay identifies a product boundary
- audit `110927` rich-text against `PR05B`, `PR05C`, clean `PR05D`, and
  `DIAG-RICH-TEXT-103910`; keep it diagnostic-only unless owner evidence
  appears
- continue monitoring policy-26 novelty output after the completed full pass;
  verify current duplicate share, likely-real visibility, and product-evidence
  representative preservation before making any yield or product claims
- repair the loop-progress gate if it still counts active/stopped sessions,
  zero-byte reports, `report.tmp`, setup-only replay, disk-preflight-only
  output, stale manifests, or job launch alone as progress while the Parallel
  Progress Gate has actionable rows

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, raw deferred
publication, PR17, PR18, PR18x promotion, duplicate PR07 replay, or extra
browser lanes.
