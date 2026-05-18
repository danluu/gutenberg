# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T10:56:22Z`

Trigger event:
`pr-split-2026-05-18T10-55-37Z-20260518T104730Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T10-55-37Z-20260518T104730Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest raw split log and `pr-split-20260518T104730Z-synthesis.md` keep the
Cycle324/i40 ungrouped topology, but frame it as two lanes: a ready/local-filing
lane and a blocked PR07 runtime/owner lane. The durable current audited basis is
the Cycle325/i40 `20260518T103442Z` finalization, which records `70` manifest
rows and `70` branch-audit rows with zero live-head, base-allowlist,
branch-audit, head/bundle/manifest, shape-policy, or deferred-freshness
failures. A later `104444Z` report is now nonzero on disk, but it reuses
`103442Z` and adds no terminal evidence for newer deferred branches, so it does
not supersede the split for this review cycle.

Current blockers and status changes:

- `PR07B1A` remains the runtime-gated stale sync-manager entity epoch row after
  `PR07B1`. The Cycle354 audit compared raw `101357Z`/`102905Z` reload guard
  commits against finalized `PR07B1A`; they had the same diffstat but different
  commit patch IDs. Keep those commits as PR07B1A evidence until a restack or
  range-diff proves the slot should be replaced. Do not file the raw deferred
  branches and do not create raw `PR07D`.
- `PR07` still lacks durable owner replay evidence in these collected inputs.
  Runtime/setup and reload guard evidence is not product proof until the
  focused same-user and late-join owner replay captures the required
  REST/meta, `_crdt_document`, edited-record, Y.Doc/provider/awareness, UI, and
  block-tree divergence artifacts.
- Seed `1020002` blocks broad final-stack fuzzing, GitHub filing, rebuilt
  stack-wide validation, and its own repair or reclassification. It must not
  block branch audit, deferred downscope, PR07 replay replacement, PR02A/PR5/
  PR11 shaping, or loop repair work.
- Verified GitHub branch links are still missing for many exact Cycle324/i40
  rows, including the runtime-gated PR07 microheads and most ungrouped CRDT
  source-family rows. Rows below either use verified audit links or explicitly
  say `No verified branch link yet`.
- For PR13 maintainer-facing content, use only the repaired audit refs:
  `review/rtc-pr13a-observed-delete-provenance-repaired`,
  `review/rtc-pr13b-source-retirement`, and
  `review/rtc-pr13c-stale-block-identity-smear-guard`. The finer PR13B0-B3
  source-family split remains evidence-only until exact refs are published and
  audited.
- Duplicate/noise control-plane work advanced in the completed `094242Z`
  feedback action: the novelty monitor rescue path now respects
  paused/cooldown-held no-product startup groups, live-analysis retry exhaustion
  is terminal, and both patched scripts passed `node --check`. The latest
  `104440Z` duplicate/noise synthesis still identifies that novelty-monitor
  scheduler leak as the right control-plane boundary and leaves runner
  quarantine or stale-analysis cleanup as follow-up hardening, not blockers.
- The latest raw novelty read is startup-only for
  `run-20260518T105509Z`: the monitor has started, full coverage pass is
  pending, `supervisor-groups.json` has `2` groups, and active run dirs are
  `2`. Do not treat it as current likely-real, duplicate/noise, post-fix
  scheduler verification, or final-stack validation evidence.
- Trend evidence remains useful but not a filing gate. The latest trend packet
  reports `5` unmet goals, current duplicate share `0`, historical duplicate
  share `0.3432`, browser-E2E as the only level with confirmed likely-real
  findings, and a browser-heavy mix. New fuzz work should stay bounded and
  oracle-specific.

The active replacement topology is:

```text
PR01 -> PR02 (+ PR02A)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D (+ PR06E)

Runtime-gated:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1 -> PR07B1A
(hold HOLD-07B2 and HOLD-07C as siblings off PR07B1; no raw PR07D)

From PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B
-> PR15A -> PR15B -> PR15C -> PR15D
```

Reject grouped `PR06`, `PR11`, `PR12`, and `PR15`; stale
Cycle293/Cycle306/local-publish rows; fallback-tail `PR05D`;
`d06e3528cbd`; `fix/rtc-fallback-group-delete-stale-local`; raw
`deferred/*` product-filing heads; raw `PR07D`; `PR17`; `PR18`; and `PR18x`.
Clean `PR05D` remains only `27c6e7924217038ed9b4ff71585e8041c67765a4`.

## Branch And Ref Status

Remote status was collected at `2026-05-18T10:56:22Z`.

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

The branch-link audit was generated at `2026-05-18T10:56:27Z` from fetched
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

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active i40 row; runtime owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active i40 row; prior replay evidence is stale/pre-oracle |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active i40 row; old holds stay siblings from here |
| PR 7B1A | Stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | runtime-gated Cycle324/i40 row after PR07B1; raw reload guard commits are evidence only until restack/range-diff and owner replay |

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
Cycle324/i40 proposed PR rows unless the status says so.

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
collected_at_utc: 2026-05-18T10:56:22Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T105509Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw novelty monitor status at `2026-05-18T10:56:19Z` is startup-only:

```text
status: monitor started; full coverage pass pending
observed roots: 450
previous records loaded: 83203
supervisor groups file: 2
active run dirs: 2
unmet goals / triage yield / duplicate share: pending until first pass
warning: startup status only; full novelty pass has not completed yet
```

Interpretation:

- The latest raw novelty read does not yet provide current-run likely-real,
  duplicate/noise, unmet-goal, or product-evidence conclusions. It only proves
  the monitor started against `run-20260518T105509Z`.
- The earlier duplicate/noise feedback action verified fail-closed behavior on
  `run-20260518T104124Z`. The current root has already moved and now shows `2`
  supervisor groups and `2` active run dirs before the first full novelty pass,
  so do not carry forward the previous root's fail-closed state as current
  product or scheduler evidence.
- Product evidence must stay visible and family-capped after the first full
  pass, while no-product startup noise must not become a global producer veto.
- The fuzz repo is still active validation infrastructure. It is not the final
  PR stack and cannot substitute for a rebuilt combined validation stack from
  explicit Cycle324/i40 heads.

The latest trend packet was generated at `2026-05-18T10:47:59Z`:

```text
monitor passes: 2244
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T10:38:05Z
coverage files: 272 -> 52010
coverage files delta: 51738
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3432
summary startup failures last: 0
quality issues last: 1
memory free: 423.1 GB
load averages: 73.52 / 64.44 / 61.67 on 64 cores
enabled group current: novelty-ws-real-user-rich-text
latest fuzz level mix:
  browser-e2e=29 lanes/26 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5670407
browser-e2e likely-real findings: 730 over 2243.2 runner-hours
latest suggested PR net LOC total: 4114
```

Latest trend unmet goals remain concentrated in save/reload and real-user
depth:

```text
reload-post-action: 1112/2000, remaining 888
title-save-reload: 567/1000, remaining 433
real-user-editing success: 609/1000, remaining 391
body-save-reload: 626/1000, remaining 374
ui-format-paragraph: 1985/2000, remaining 15
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. The latest mix is still browser-heavy; new work should
stay bounded and oracle-specific rather than simply adding broad browser
concurrency.

## Status-Persona Analysis

The newest split-persona synthesis available in the collected persona inputs,
`pr-split-20260518T104730Z-synthesis.md`, keeps the Cycle324/i40 ungrouped
topology but makes the blocker split explicit. The ready/local-filing lane is
PR01 through PR06D/PR06E plus the CRDT lane from PR09 through PR15D. The PR07
lane is separate and blocked on runtime loading plus owner replay:
`PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1 -> PR07B1A`, with
`HOLD-07B2` and `HOLD-07C` comparison-only. `PR03B` remains held for focused
browser revision-restore comparison against PR03, and raw `PR07D`, `PR17`,
`PR18`, and `PR18x` remain rejected.

That synthesis treats Cycle325/i40 `20260518T103442Z` as the durable current
audited basis. It has `70` manifest rows, `70` branch-audit rows, and no audit
failures. A later `104444Z` report is nonzero but explicitly wraps/reuses
`103442Z` and adds no terminal deferred evidence, so it should be consumed only
as non-superseding wrapper evidence unless a fresh audit proves otherwise.
Raw `101357Z`/`102905Z` reload guard commits remain PR07B1A evidence until a
restack/range-diff and focused owner replay prove whether to replace the slot.

The latest duplicate/noise synthesis,
`duplicate-noise-20260518T104440Z-synthesis.md`, still puts the leak in the
novelty-monitor producer/control plane: empty materialization rescue must not
override active `startup-noise` or known-noise pauses/cooldowns unless the
product-evidence bypass predicate says it is safe. The latest completed
matching feedback-action file is `duplicate-noise-20260518T094242Z`; it
records:

- `bin/rtc-browser-fuzz-novelty-monitor.mjs` now carries duplicate/noise
  cooldowns across root resets and blocks materialization/bootstrap rescue from
  reviving paused or cooldown-held groups.
- `bin/rtc-browser-fuzz-live-analysis-monitor.mjs` no longer relaunches or
  counts failed-at-max-attempt first/deep analysis jobs as actionable.
- `node --check` passed for both patched files.
- coverage-guided novelty, supervisor, and live-analysis sessions were
  restarted; stale orphan monitors and the leaked
  `run-20260518T103900Z/novelty-ws-real-user-rich-text-gen-1-20260518T103916Z`
  process tree were killed.
- `run-20260518T104124Z` was fail-closed with no active browser producers while
  bootstrap candidates were under duplicate/noise cooldown.

This remains control-plane hygiene, not product validation. The next useful
fuzz evidence is a full post-fix novelty/supervisor/live-analysis pass showing
no queued/running/launching no-product `pre_action_bootstrap_stall`, no new
`bypass-noise-cooldown-empty-materialization-rescue` entries while drain holds
exist, terminal max-failed deep jobs, and preserved visibility for product
evidence. The current `run-20260518T105509Z` startup-only status has `2`
supervisor groups and `2` active run dirs, so it has not yet supplied that
post-fix pass.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, current Cycle325/i40/Cycle324 ungrouped recommendation, PR06E/PR02A
sidecar status, PR07B1A runtime/owner evidence requirements, the latest
duplicate/noise action and synthesis, and latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle325/i40 `20260518T103442Z`, non-superseding `104444Z`, `PR07B1A`, `deferred/rtc-reload-hydration-20260518T101357Z`, `deferred/rtc-reload-hydration-20260518T102905Z`, reload/search/rich-text diagnostics, harness rows | active source family; latest raw split log uses the Cycle324/i40 ungrouped shape with `103442Z` as the current audited 70-row basis; `104444Z` is nonzero but only wraps/reuses `103442Z`; filing remains blocked by PR07B1A runtime/owner evidence, missing verified GitHub links, seed `1020002`, and final validation | Audit current finalization/deferred freshness before treating any wrapper as superseding, compare raw reload guard commits against current PR07B1A, regenerate the manifest from the chosen PR07B1A, publish/fetch/audit exact GitHub links, complete PR07 owner replay, repair or reclassify seed `1020002`, then run final-stack validation gates |
| Stale or incomplete publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, previous zero-byte reports, `report.tmp`, header-only outputs, stale manifests, stale `093423Z`, historical `095429Z`, historical `101435Z`, historical `102438Z`, and non-superseding wrapper `104444Z` | no filing evidence unless freshness and head agreement are proven; zero-byte, header-only, setup-only, pre-oracle, disk-preflight-only, stale, superseded, wrapper-only, or unaudited artifacts are no progress | Replace stale or unaudited artifacts with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, PR07B1A, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, PR07B1A, `HOLD-07B2`, `HOLD-07C`, `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`, `DIAG-RELOAD-092834`, pending reload diagnostics; seeds `5200001`, `5200005`, `5200013`, `5200020`, `5200024`, plus witnesses `5200011`, `5200017`, `5200010`, `7110004`, `7110017` | setup/reload evidence is not product proof; raw reload guard commits are evidence-only until restack/range-diff; collected inputs contain no durable owner replay output | Refresh PR07B1A, then run same-user seeds `5200011`, `5200017`, `5200010` and late-join seeds `7110004`, `7110017`, capturing REST/meta, `_crdt_document`, edited-record, Y.Doc/provider/awareness, UI collaborator state, branch head, block-tree first-divergence snapshots, root free-space record, replay logs, validation/classification TSVs, and nonzero `report.md` |
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
| Active deferred sessions | reload-hydration, search/live-collapse, rich-text suffix, diagnostics, duplicate search/rich-text evidence, harness rows | active sessions are not progress by themselves; reload/search/rich-text diagnostics are test evidence, not raw product slots; raw reload guards must be range-diffed/restacked before they can affect PR07B1A; harness rows are not product fixes | Count only nonempty durable reports/artifacts, audited harness refs, focused owner proof, or a clear downscope/promotion decision |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, real-user duplicate-family holds, novelty recommendation/fallback enable paths, empty materialization rescue, paused/no-analysis drain holds, `.triage-watcher/no-analysis.json` sentinel lifetime, and max-failed deep-analysis jobs | latest completed feedback action patched novelty-monitor rescue/cooldown handling and live-analysis retry exhaustion; latest synthesis reconfirms that scheduler boundary and treats runner quarantine/stale-analysis cleanup as follow-up hardening; current root startup status is not yet post-fix proof | Verify the next post-fix novelty/supervisor/live-analysis pass: no queued/running/launching no-product `pre_action_bootstrap_stall`, no new `bypass-noise-cooldown-empty-materialization-rescue` entries while startup-noise drain holds exist, max-failed deep jobs are terminal, productive materialization resumes only for groups not under drain/cooldown, and product-evidence paths remain visible and family-capped |
| Current fuzz validation | `run-20260518T105509Z`, novelty read at `2026-05-18T10:56:19Z`, trend generated at `2026-05-18T10:47:59Z` | latest raw novelty is startup-only with monitor started and full pass pending; trend evidence has `5` unmet goals, `0` current duplicate share, `0.3432` historical duplicate share, browser-heavy mix, `1` quality issue, and 730 browser-E2E likely-real findings over 2243.2 runner-hours | Wait for the first full current-run novelty pass, accepted product evidence, and final PR-stack validation before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, grouped
Cycle320/i40, grouped PR06/PR11/PR12/PR15 as active units, `ready/*`,
validation-stack, dirty evidence, fallback-tail branches, raw
deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale finalization
artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle324/i40 ungrouped source family with Cycle325/i40
   `20260518T103442Z` as the current audited `70`-row basis. Keep `PR07B1A` as
   the runtime-gated epoch row after `PR07B1`, but do not file that lane until
   runtime loading and owner replay are durable.
2. Treat audited `20260518T095429Z`, `20260518T101435Z`, and
   `20260518T102438Z` as historical. Treat `20260518T104444Z` as a
   non-superseding wrapper over `103442Z` unless a newer audit proves terminal
   deferred evidence, base allowlist, live heads, branch audit, bundle heads,
   manifest SHAs, shape policy, and deferred freshness all agree.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Before treating replay output as product evidence, compare the raw reload
   guard commits against current `PR07B1A`, regenerate the manifest from the
   chosen PR07B1A, then run the narrow PR07 owner replay before the broader
   matrix. Compare `PR07B0`, `PR07B1`, `PR07B1A`, `HOLD-07B2`, `HOLD-07C`,
   `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`, `DIAG-RELOAD-092834`, and any
   newly audited reload diagnostic rows.
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
   scheduler-deadlock repair as control-plane hygiene only. Product evidence
   must remain visible and family-capped; control-plane health does not count
   as product validation.
10. After PR07B1A owner evidence, exact branch-link audit for missing rows, and
   seed `1020002` repair or reclassification land, rebuild the combined
   validation stack from explicit Cycle324/i40 heads plus accepted epoch work,
   then run focused checks, touched-file lint, branch graph/containment
   evidence, adjacent range-diffs/diffstats/numstats, `git diff --check`,
   feasible runtime checks, and fresh stack-wide validation.

The current useful bounded work is:

- audit current finalization/deferred freshness, consuming `104444Z` only as a
  non-superseding wrapper over `103442Z` unless a fresh audit proves otherwise
- range-diff/restack raw reload guard commits against `PR07B1A` and regenerate
  the manifest from the chosen epoch guard
- run PR07 runtime loading repair, proving `option=1`, `function_exists=yes`,
  `allowed=true`, and browser `window._wpCollaborationEnabled === true`
- then run PR07 owner replay across `PR07B0`, `PR07B1`, `PR07B1A`,
  `HOLD-07B2`, `HOLD-07C`, and reload diagnostics
- run focused PR03B revision-restore owner comparison against strict witnesses
  `5400020`, `5300049`, and `5300051`
- run strict parser/linebreak/rich-text owner comparison only after PR05B,
  PR05C, and clean PR05D comparison is available
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`
- refresh candidate/deferred status using only nonzero completed reports; never
  count `report.tmp`, setup-only, disk-preflight-only, or zero-byte artifacts
  as evidence
- run strict owner comparison before assigning any new rich-text/search/parser
  owner rows
- run common-blocks owner comparison for `965003`, `965010`, and `5800001`
- separately classify likely `core/cover` or block-library canonicalization
  seed `965004`
- focused search diagnostic replay against `965003`, `965010`, `5800001`, and
  the pre-save search spec
- rich-text setup-health repair and focused replay for `5100009`, current
  strict `5100002`, and focused rich-text seeds against the diagnostic branch
- verify the post-fix novelty-monitor/live-analysis behavior on the current
  root; no new no-product startup rescue bypasses, max-failed deep jobs remain
  terminal, and product evidence remains visible
- optional loop-progress gate repair if the loop still counts active/stopped
  sessions, zero-byte reports, `report.tmp`, setup-only PR07 output,
  disk-preflight-only output, or `collaborationEnabled:null` as progress

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, PR17, PR18, PR18x
promotion, duplicate PR07 replay, or extra browser lanes.
