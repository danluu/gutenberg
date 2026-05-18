# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T09:00:31Z`

Trigger event:
`duplicate-noise-2026-05-18T08-52-43Z-180`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-18T08-52-43Z-180/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis,
`pr-split-20260518T084544Z-synthesis.md`, keeps the maintainer-facing
recommendation on the Cycle324/i40 ungrouped topology, but the stack is still
blocked for filing.

Current blockers and status changes:

- `PR07` remains the main blocker. The old Cycle346 replay was stopped in `T`
  state at `wp option update wp_collaboration_enabled 1` and had only
  header/preflight output, so it is stale evidence.
- The Cycle348 replacement replay recorded and killed the stale Cycle346 process
  tree, verified no old Cycle346 PR07 processes remained, and started the
  current Cycle324/i40 matrix from the `084407Z` worktree. It is not PR07
  product evidence until it writes durable replay rows and state snapshots.
- The replacement replay must compare `PR07B0`, `PR07B1`, `PR07B1A`,
  `HOLD-07B2`, `HOLD-07C`, `DIAG-RELOAD-080250`, and `DIAG-RELOAD-082300` on
  seeds `5200001`, `5200005`, `5200013`, `5200020`, `5200024`, plus witnesses
  `5200011`, `5200017`, `5200010`, `7110004`, and `7110017`.
- Seed `1020002` blocks only broad final-stack fuzzing, GitHub filing, rebuilt
  stack-wide validation, and its own repair or reclassification. It must not
  block branch audit, deferred downscope, PR07 replay replacement, or loop
  repair work.
- The `20260518T084407Z` bundle/manifest audit completed with `63` manifest
  rows, `63` branch-audit rows, and `0` live-head, base-allowlist,
  branch-audit, head/bundle/manifest, or shape-policy failures. It is the
  current manifest/audit basis; `083403Z` is only a deliberate historical
  freeze point.
- Verified GitHub branch links are still missing for many exact Cycle324/i40
  rows, including all runtime-gated PR07 microheads and most ungrouped CRDT
  rows. Rows below either use verified audit links or explicitly say
  `No verified branch link yet`.

The active replacement topology remains:

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

Remote status was collected at `2026-05-18T09:00:27Z`.

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

The branch-link audit was generated at `2026-05-18T09:00:31Z` from fetched
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
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active i40 row; Cycle346 replay is stuck/pre-oracle |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active i40 row; old holds stay siblings from here |
| PR 7B1A | Stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | runtime-gated Cycle324/i40 row after PR07B1; strict same-user reload witnesses, corrected owner replay, and verified GitHub link are still missing |

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
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13C is supporting fallback evidence only |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13B is supporting fallback evidence only |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
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
| PR 13B repaired fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired verified fallback until PR13B0-B3 have verified exact links |
| PR 13C repaired fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired verified fallback and supporting evidence |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T09:00:27Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T085240Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw novelty monitor at `2026-05-18T08:59:50.689Z` has advanced past the
previous startup-only stub for the new `run-20260518T085240Z` coverage root, but
it is still control-plane/coverage health, not final-stack validation:

```text
coverage files: 51474
total records seen: 81804
records processed this pass: 536
new behavioral feature keys this pass: 2
new CDP coverage hashes this pass: 1
unmet goals: 5
current-run active dirs: 0
current-drain triage roots: 2
current-drain raw no-product signatures: 2
suppressed strict startup records: 3
likely-real visible in current/drain scope: 0
enabled groups: novelty-ws-real-user-editing, novelty-ws-real-user-save-reload
```

Interpretation:

- The latest raw novelty status proves the restarted monitor processed coverage,
  preserved product-capable replacement groups, and kept no-product startup
  noise gate-only. It does not prove product correctness or PR-stack readiness.
- The previous current/drain split remains evidence context only. Product
  evidence must stay visible and family-capped, while no-product startup noise
  must not become a global producer veto again.
- Current likely-real/product-evidence counts are `0` for the active/drain scope;
  historical likely-real counts remain evidence context, not live current-run
  product failures.
- The fuzz repo is still active validation infrastructure. It is not the final
  PR stack and cannot substitute for a rebuilt combined validation stack from
  explicit Cycle324/i40 heads.

The latest trend packet was generated at `2026-05-18T08:51:23Z` and remains
the newest full trend evidence:

```text
monitor passes: 2233
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T08:43:13Z
coverage files: 272 -> 51228
coverage files delta: 50956
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3435
summary startup failures last: 0
quality issues last: 0
memory free: 415.2 GB
load averages: 101.12 / 95.72 / 88.5 on 64 cores
latest fuzz level mix:
  browser-e2e=27 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5627589
browser-e2e likely-real findings: 718 over 2197.6 runner-hours
latest suggested PR net LOC total: 2152
```

Latest trend unmet goals remain concentrated in save/reload and real-user
depth:

```text
reload-post-action: 1099/2000
title-save-reload: 555/1000
real-user-editing success: 603/1000
body-save-reload: 614/1000
ui-format-paragraph: 1920/2000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. The latest mix is browser-heavy while CPU/load is
already high, so new work should be bounded and oracle-specific.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T084544Z-synthesis.md`, says:

- Overall status is blocked, with the Cycle324/i40 ungrouped topology as the
  active replacement split.
- The stack is not file-ready because PR07 owner/runtime evidence is missing
  and seed `1020002` still blocks final-stack fuzzing, filing, and rebuilt
  stack validation.
- The Cycle346 PR07 replay is stopped/stuck in `T` state at
  `wp option update wp_collaboration_enabled 1`; it has no durable replay
  classification rows.
- Audit the latest nonzero `20260518T084407Z` finalization/manifest before
  relying on it. It now claims the same `63`-row shape with no new split
  branches; use `083403Z` only if intentionally freezing to that artifact set.
- Launch at most one bounded PR07 replacement/root-cause replay and one
  bounded non-Docker `084407Z` deferred bundle/manifest audit. Do not launch
  broad final-stack fuzzing, raw `PR07D`, duplicate PR07 replay, duplicate
  seed `1020002` work, or another review-only loop.

The raw `current-pr-split.md` tail now includes Cycle 348 action state that
supersedes those two action items:

- Use the nonzero `20260518T084407Z` finalization as the current
  manifest/audit basis. It records a `63`-row manifest with `63/63`
  branch-audit pass, keeps `DIAG-RELOAD-082300` and `DIAG-SEARCH-082303` as
  diagnostic/test-only rows, and records that no new split branches were
  needed after the latest raw deferred heads.
- `rtc-cycle348-post-084407-bundle-manifest-audit` completed at
  `2026-05-18T08:57:50Z`, created `cycle324-i40-084407.bundle`, verified `63`
  manifest rows and `63` branch-audit rows, and found `0` live-head,
  base-allowlist, branch-audit PASS-column, head/bundle/manifest, or
  shape-policy failures.
- `rtc-cycle348-pr07-owner-replay-stopped-job-replacement` recorded the stopped
  Cycle346 process tree, killed the old tmux/process chain, verified no old
  Cycle346 PR07 processes remained, and started the current Cycle324/i40 PR07
  matrix from the `084407Z` worktree. It has checked out `PR07B0` and begun
  runtime setup, but it is not product evidence until it writes durable replay
  rows and state snapshots.

The previous split feedback-action file,
`pr-split-20260518T081631Z-feedback-action.md`, remains useful as provenance
for the now-superseded `082401Z` audit and the stale Cycle346 replay state.

The latest duplicate/noise persona file,
`duplicate-noise-20260518T081624Z-synthesis.md`, identified the same
novelty-monitor scheduler deadlock risk: drain or paused no-product
`pre_action_bootstrap_stall` could become a global producer veto while active
dirs were empty. Its paired feedback-action file is now nonzero and reports
completed control-plane remediation:

- `rtc-browser-fuzz-novelty-monitor.mjs` no longer lets drain-only startup
  holds globally block unrelated fallback/materialization groups.
- `rtc-browser-fuzz-live-analysis-monitor.mjs` keeps product-evidence
  no-analysis drains visible while strict no-product startup signatures remain
  gate-only.
- `node --check` passed for both changed monitor files.
- Gate-only startup triage suppressed the startup-only canary, product-evidence
  drain still launched deep-analysis work, the novelty and analysis monitors
  were restarted, `duplicateShareCurrent=0`, and replacement groups were
  queued.

This is control-plane hygiene, not product validation. The latest raw novelty
read now shows a coverage-processing pass with `0` current/drain likely-real
signatures and two product-capable groups enabled, but active current dirs were
`0` after policy actions. The next useful evidence is continued producer
materialization with current-run records or product evidence, without reopening
no-product startup analysis noise.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, current Cycle324/i40 ungrouped source-family recommendation,
`PR07B1A`, the newer durable manifest audits, latest duplicate/noise persona
analysis, and latest novelty/trend/control-plane evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, `20260518T082401Z`, `20260518T083403Z`, `20260518T084407Z`, `PR07B1A`, reload diagnostics, `DIAG-SEARCH-072229`, `DIAG-RICH-TEXT-074239`, and harness rows | active source family; latest split consensus uses the Cycle324/i40 ungrouped shape plus runtime-gated `PR07B1A`; `084407Z` is now audited as the current 63-row manifest basis with `0` live-head, base-allowlist, branch-audit, head/bundle/manifest, or shape-policy failures; filing remains blocked by PR07 owner evidence, missing verified GitHub links, and seed `1020002` | Publish/fetch/audit exact GitHub links for missing i40 rows, complete PR07 owner replay evidence, repair or reclassify seed `1020002`, then run final-stack validation gates |
| Stale or incomplete publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, previous zero-byte reports, `report.tmp`, header-only outputs, stale manifests, stale `20260518T073347Z/finalization.report.md` | no filing evidence; zero-byte, header-only, setup-only, pre-oracle, or stale artifacts are no progress; the `084407Z` report/bundle audit is the current nonzero replacement basis | Replace remaining stale artifacts with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, PR07B1A, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, PR07B1A, `HOLD-07B2`, `HOLD-07C`, `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`; seeds `5200001`, `5200005`, `5200013`, `5200020`, `5200024`, plus witnesses `5200011`, `5200017`, `5200010`, `7110004`, `7110017` | Cycle346 replay is terminated stale evidence; Cycle348 replacement started from the `084407Z` worktree with a timeout around the CLI enable step, but has no durable classification rows yet; PR07 remains the main blocker | Complete the bounded replacement replay with REST/meta, `_crdt_document`, edited-record, Y.Doc/provider/awareness, UI collaborator state, block-tree first-divergence snapshots, branch heads, root free-space record, replay logs, validation/classification TSVs, and nonzero `report.md` |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-`HOLD-07C` non-coverage with first-divergence evidence |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet; rich-text residuals stay diagnostic | Publish/fetch/audit clean PR05D and compare PR05B/PR05C/clean-PR05D before assigning any PR18x owner |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | latest replacement requires the CRDT/data-loss lane from PR06D, not PR07 | Prove `PR06D -> PR09`, `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; repaired PR13B/C links are the only verified fallback/supporting PR13 links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| Strict stale projection owner comparison | `HOLD-STRICT-STALE-PROJECTION-5200005/5200008`; compare `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`, `PR07B1A`, and `HOLD-07C` | held comparison lane only; not a product PR slot | Run focused owner replay for seeds `5200005` and `5200008` before creating any new strict-projection product row |
| Common-blocks owner comparison | `HOLD-COMMON-BLOCKS-965003`, plus related seeds `965010` and `5800001` | held comparison row; `965003` is likely real but currently reads as post-save/reload common-block canonical drift, not clean pre-save search loss | Compare against `PR05B`, `PR05C`, clean `PR05D`, `PR07B0`, `PR07B1`, `PR07B1A`, and `HOLD-07C` |
| Block-library canonicalization side evidence | `SIDE-BLOCKLIB-COVER-965004` | likely `core/cover` or block-library canonicalization issue; not RTC-stack product work yet | Track separately as block-library diagnostic unless ownership evidence changes |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Active deferred sessions | reload-hydration, search/live-collapse, rich-text suffix, `DIAG-RELOAD-045607`, `DIAG-RELOAD-063159`, `DIAG-RELOAD-064709`, `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`, `DIAG-SEARCH-072229`, `DIAG-SEARCH-082303`, duplicate search evidence, `DIAG-RICH-TEXT-074239`, duplicate rich-text evidence, `DIAG-RICH-TEXT-051616`, `HARNESS-WS-URL`, `HARNESS-PLUGIN-STATUS`, `HARNESS-WS-BOOTSTRAP-051619` | active sessions are not progress by themselves; reload/search/rich-text diagnostics are test evidence, not product slots; `082300` reload and `082303` search are diagnostic/test-only rows in the audited `084407Z` basis; harness rows are not product fixes | Count only nonempty durable reports/artifacts, audited harness refs, focused owner proof, or a clear downscope/promotion decision |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, real-user duplicate-family holds, novelty recommendation/fallback enable paths, paused/no-analysis drain holds, and `.triage-watcher/no-analysis.json` sentinel lifetime | latest synthesis identified the scheduler deadlock; paired feedback-action reports the novelty/live monitor remediation landed, `node --check` passed, startup-only analysis stayed suppressed, product-evidence drain stayed visible, monitors restarted, replacement groups queued, and `duplicateShareCurrent=0`; latest raw novelty processed `536` records this pass and has two product-capable groups enabled, with `0` current/drain likely-real signatures | Keep validating that restarted producer materialization continues into current-run records or product evidence, that expired/wrong-root sentinels do not drive scheduling, and that product evidence remains visible and family-capped |
| Current fuzz validation | `run-20260518T085240Z`, novelty read at `2026-05-18T08:59:50Z`, trend generated at `2026-05-18T08:51:23Z` | latest raw novelty processed coverage but still shows `0` active current dirs after policy actions, `2` current-drain no-product startup signatures, `0` current/drain likely-real signatures, `5` unmet goals, and enabled `novelty-ws-real-user-editing` plus `novelty-ws-real-user-save-reload`; trend evidence has `5` unmet goals, `0` current duplicate share, `0.3435` historical duplicate share, browser-heavy mix, and high load | Wait for accepted current-run product evidence and final PR-stack validation before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, grouped
Cycle320/i40, grouped PR06/PR11/PR12/PR15 as active units, `ready/*`,
validation-stack, dirty evidence, fallback-tail branches, raw
deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale finalization
artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle324/i40 ungrouped source family as the base, with `PR07B1A`
   as the current runtime-gated epoch row after `PR07B1`.
2. Use the audited `20260518T084407Z` finalization/manifest as the current
   63-row basis. Use `083403Z` only if deliberately freezing to that
   report-time artifact set.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Complete the one corrected current-Cycle324 PR07 owner replay that already
   recorded and terminated the stuck Cycle346 replay. Compare `PR07B0`,
   `PR07B1`, `PR07B1A`, `HOLD-07B2`, `HOLD-07C`, `DIAG-RELOAD-080250`, and
   `DIAG-RELOAD-082300`.
5. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old
   `HOLD-07B2 !-> PR09/PR15D`, clean PR05D only, PR15A-D after PR14B, and no
   fallback-tail PR05D.
6. Run held owner comparisons for `5200005`, `5200008`, `965003`, `965010`,
   `5800001`, and any rich-text/search/reload candidates before creating new
   product rows. Keep `965004` separate as block-library canonicalization
   evidence unless ownership changes.
7. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
8. Keep old aggregate or stale prior art, broad PR08, dirty evidence branches,
   stale/misordered PR13 refs, fallback-tail PR15/PR05D confusion, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
9. Treat duplicate/noise active-sentinel work and scheduler-deadlock repair as
   control-plane hygiene only. Product evidence must remain visible and
   family-capped; control-plane health does not count as product validation.
10. After PR07B1A owner evidence, exact branch-link audit for missing rows, and
   seed `1020002` repair or reclassification land, rebuild the combined
   validation stack from explicit Cycle324/i40 heads plus accepted epoch work,
   then run focused checks, touched-file lint, branch graph/containment
   evidence, adjacent range-diffs/diffstats/numstats, `git diff --check`,
   feasible runtime checks, and fresh stack-wide validation.

The latest completed bounded action is
`rtc-cycle348-post-084407-bundle-manifest-audit`.

The current useful bounded jobs are:

- complete `rtc-cycle348-pr07-owner-replay-stopped-job-replacement` and treat it
  as evidence only if it writes durable replay rows and snapshots
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`
- common-blocks owner comparison for `965003`, `965010`, and `5800001`
- separate classification/tracking for likely `core/cover` or block-library
  canonicalization seed `965004`
- focused search diagnostic replay against `965003`, `965010`, `5800001`, and
  the pre-save search spec
- rich-text setup-health repair and focused replay for `5100009`, current
  strict `5100002`, and focused rich-text seeds against the `074239Z`
  diagnostic branch
- bounded duplicate/noise follow-up/check that confirms the remediated
  producer/materialization path completes a first pass and keeps
  product-evidence signatures visible

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, PR17, PR18, PR18x
promotion, duplicate PR07 replay, or extra browser lanes.
