# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T03:24:11Z`

Trigger event:
`pr-split-2026-05-18T03-22-58Z-20260518T031247Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T03-22-58Z-20260518T031247Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis is
`pr-split-20260518T031247Z-synthesis.md`. It keeps the active
maintainer-facing split on the Cycle324/Cycle326 ungrouped i40 replacement
shape, not the older grouped PR06/PR11/PR12/PR15 topology.

The split itself is no longer the main blocker. Final-stack fuzzing, GitHub
filing, and stack-wide validation remain blocked by missing PR07 owner
evidence, seed `1020002`, missing verified GitHub refs for many active rows,
and missing publication freshness around the newest nonzero finalization.

Important status changes since the prior report:

- `20260518T031230Z/finalization.report.md` is now nonzero and validates
  `50/50` ranges. Treat it as useful local finalization evidence, not
  publication readiness, until a fresh push-manifest, manifest-age,
  base-allowlist, head-bundle freshness, branch-graph, and artifact audit
  passes.
- The latest split synthesis still recommends the ungrouped i40 shape:
  PR06A-D, PR11A-E, PR12A-C, PR15A-D, plus PR06E as a sidecar from PR06D.
  Verified aggregate refs in the branch audit are prior art unless the active
  row below links that exact branch.
- The branch-link audit generated at `2026-05-18T03:24:11Z` verifies PR01,
  PR02, PR03, PR04, aggregate PR05, aggregate PR06, PR06A prior art, aggregate
  PR07A/PR07B, PR08 prior art, PR09, PR10, aggregate PR11, aggregate PR12,
  repaired PR13A/B/C, PR14, and PR15A-C component refs. It does not verify the
  exact active sub-PR refs for PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3,
  PR07B0-B1, PR11A-E, PR12A-C, PR13B0-B3, PR14B, or PR15D.
- The latest raw novelty monitor is startup-only for
  `run-20260518T032331Z`; a full coverage pass had not completed yet. Do not
  claim it as a current full novelty pass or final-stack validation.
- The latest trend packet, generated at `2026-05-18T03:13:48Z`, still shows
  broad fuzz/control-plane health rather than final-stack validation:
  `49258` coverage files, `5` unmet goals, `0` current duplicate share, and
  `5495060` cumulative fuzz-level test executions.
- The latest duplicate/noise synthesis
  `duplicate-noise-20260518T030811Z-synthesis.md` identifies remaining
  producer/control-plane churn. Its paired feedback-action file is zero bytes,
  so there is no completed latest action to count from that synthesis.

Current replacement target:

```text
Common mainline:
PR01 -> PR02 (+ PR02A)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D
(+ PR06E sidecar)

Runtime-gated lane:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1
(hold HOLD-07B2 and HOLD-07C; no raw PR07D)

Independent CRDT/data-loss lane from PR06D:
PR09 -> PR10
-> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B
-> PR15A -> PR15B -> PR15C -> PR15D
```

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- Publish, fetch, and audit exact product refs for every active row that says
  `No verified branch link yet`.
- Run a non-Docker manifest refresh from the now-nonzero
  `20260518T031230Z` finalization before making publication claims.
- Clear or replace the stale active PR07 replay session without launching a
  duplicate owner matrix. Then run exactly one current-namespace i40 PR07 owner
  replay over `PR07B0`, `PR07B1`, `HOLD-07B2`, and `HOLD-07C`, with
  `collaborationEnabled=true`, REST/meta, `_crdt_document`, edited record,
  Y.Doc/provider/awareness, and block-tree first-divergence snapshots.
- Keep stale Cycle293/Cycle306/local-publish rows, fallback-tail PR05D, raw
  PR07D, PR17, PR18, PR18x, active-session-only status, setup-only output,
  disk-preflight-only output, header-only TSVs, `report.tmp`, and zero-byte
  reports out of filing evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-18T03:24:06Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

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

The branch-link audit was generated at `2026-05-18T03:24:11Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`. A verified
branch link confirms that the linked ref exists and has a non-empty audited
diff; it does not prove exact i40 publication shape, ancestry, owner evidence,
or filing readiness.

Use only these repaired audited PR13 review refs for current PR13 content or
fallback evidence:

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
branch-link audit or explicitly says `No verified branch link yet`.

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
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; exact branch still missing |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; exact branch still missing |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; exact branch still missing |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active i40 row; runtime owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active i40 row; stale active replay must be cleared before rerun |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active i40 row; held PR07B2 and PR07C branch from here |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; exact branch still missing |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; exact branch still missing |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; exact branch still missing |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13C is supporting fallback evidence |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13B is supporting fallback evidence |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-D |
| PR 15A | Fallback-group operation subhead `687a13` after PR14B | No verified branch link yet | TBD | TBD | active i40 row; verified component prior art is not exact PR14B-based ref |
| PR 15B | Fallback-group operation subhead `17569a` after PR15A | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15C | Fallback-group operation subhead `bcf1c4` after PR15B | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15D | Fallback-group operation subhead `276709` after PR15C | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |

### Held Sidecars, Fallbacks, And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| PR 7B2 | Save response terminal manager/base-record microhead | No verified branch link yet | held until PR07B0/PR07B1/HOLD-07C replay proves a distinct product delta |
| PR 7C | Save response/reload sibling evidence after PR07B1 | No verified branch link yet | held until owner replay proves coverage and distinctness; raw PR07D remains rejected |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-B1 plus held PR07B2 split |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 13B repaired fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired verified fallback until PR13B0-B3 have verified exact links |
| PR 13C repaired fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired verified fallback and supporting evidence |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T03:24:06Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T032331Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` for this update was written at
`2026-05-18T03:23:42.594Z` for `run-20260518T032331Z`. It is startup-only:

```text
status: monitor started; full coverage pass pending
observed roots: 392
previous records loaded: 76725
supervisor groups file: pending
active run dirs: 0
unmet goals: pending until first pass
triage signatures: pending until first pass
likely-real visible: pending until first pass
```

Interpretation:

- Do not use the latest raw novelty file as a full pass, a current likely-real
  count, final-stack validation, or filing readiness.
- The latest usable trend evidence remains graph-derived input through the
  preceding monitor pass. It supports fuzz/control-plane health only.

The latest trend packet was generated at `2026-05-18T03:13:48Z`:

```text
monitor passes: 2183
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T03:06:56Z
coverage files: 272 -> 49258
coverage files delta: 48986
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3447
summary startup failures last: 0
quality issues last: 0
memory free: 409.4 GB
load averages: 41.69 / 50.36 / 57.82 on 64 cores
enabled groups: novelty-ws-same-user-lifecycle,
  novelty-ws-same-user-stale-tabs
latest fuzz level mix:
  browser-e2e=29 lanes/26 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5495060
browser-e2e likely-real findings: 666 over 2029.7 runner-hours
latest suggested PR net LOC total: 2152
```

Largest unmet goals remain save/reload and real-user depth:

```text
reload-post-action: 1091/2000
title-save-reload: 547/1000
real-user-editing success: 602/1000
body-save-reload: 606/1000
ui-format-paragraph: 1809/2000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. CPU is already high enough that top-offs should be
guarded by startup-stall, supervisor-state, materialization, and
product-evidence checks rather than simply adding browser concurrency.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T031247Z-synthesis.md`, says:

- The split itself has consensus: use the Cycle324/Cycle326 ungrouped i40
  replacement, not grouped PR06/PR11/PR12/PR15.
- `20260518T031230Z/finalization.report.md` is now nonzero and validates
  `50/50` ranges. It still needs a fresh non-Docker manifest refresh with
  push-manifest, base-allowlist, head-bundle, branch graph, artifact
  verification, and deferred-candidate freshness before publication claims.
- Reject grouped PR06/PR11/PR12/PR15 as active review units; stale
  Cycle293/Cycle306/local-publish rows; raw `deferred/*`, `candidate/*`,
  `ready/*`, `ready-pr03b/*`; fallback-tail PR05D; raw PR07D; PR17; PR18; and
  PR18x.
- Clean PR05D is only `27c6e7924217038ed9b4ff71585e8041c67765a4`.
- Malformed-save-payload stays downscoped to PR06E; HTTP room isolation stays
  downscoped to PR02A. Reload-hydration, pre-save Search/live-collapse, and
  rich-text suffix remain diagnostic only.
- PR07 must consume the repaired-ready browser-env artifact, clean the stale
  `rtc-cycle322-i40-pr07-owner-replay-with-snapshots-fixed` session, and then
  run one bounded owner replay against current `finalized/cycle324-i40/*`
  refs only.
- Seed `1020002` blocks final-stack fuzz, filing, and stack-wide validation
  only. It must not block independent manifest refresh, branch audit, PR07
  cleanup, or diagnostic owner work.

The completed split-action
`pr-split-20260518T024108Z-feedback-action.md` remains the latest nonzero
action evidence:

- Updated remote `current-pr-split.md` to the Cycle324 ungrouped i40 shape.
- Recorded `20260518T024222Z` local finalization evidence with `46/46` audited
  ranges.
- Completed
  `rtc-cycle326-cycle324-i40-finalization-manifest-refresh-after-deferred`:
  `46` rows, `0` failures, fresh `push-manifest.tsv`, bundle `PASS`.
- Completed `rtc-cycle326-pr07-active-replay-health-downscope` as
  `stale-env-hung-active-replay`; the old PR07 session stayed active and had
  no durable owner evidence.

The latest duplicate/noise synthesis,
`duplicate-noise-20260518T030811Z-synthesis.md`, says:

- Strict no-product `pre_action_bootstrap_stall` is mostly blocked from
  expensive Codex analysis; the remaining problem is producer/control-plane
  churn from supervisor and novelty scheduling.
- The next bounded control-plane fix should tighten supervisor startup-stall
  pause thresholds, prevent novelty materialization-floor backfill while
  current no-product startup noise is hot, and preserve product-evidence
  signatures.
- A separate no-product global setup REST empty JSON family may need a narrow
  infra classifier if it is currently queued or running.
- The paired `duplicate-noise-20260518T030811Z-feedback-action.md` is
  zero bytes, so none of those latest producer-side changes should be counted
  as completed yet.

The prior duplicate/noise action
`duplicate-noise-20260518T022520Z-feedback-action.md` is still useful bounded
control-plane evidence: it implemented durable `no-analysis.json` for strict
no-product startup seed drains, kept active supervisor drains visible to
consumers, preserved product-evidence signatures, and passed `node --check`,
gate-only triage, live-analysis one-shot, and direct queued/running
strict-startup scans. That does not change the product PR split.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, current i40 source-family recommendation, ungrouped replacement split,
PR07 setup-only evidence decision, and latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, Cycle324 local ungrouped aliases, Cycle326 manifest outputs, and `20260518T031230Z/finalization.report.md` | active source family; `031230Z` validates `50/50` local ranges but still lacks publication freshness | Run non-Docker manifest refresh from `031230Z`; publish/fetch/audit exact GitHub refs before filing |
| Zero-byte / stale publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, zero-byte reports, `report.tmp` | no evidence; `20260518T024222Z`, `20260518T025225Z`, and nonzero `20260518T031230Z` are useful local finalization evidence but not GitHub publication | Replace stale rows with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C; seeds `5200011`, `5200015`, `5200017`, `5200010`, `5200008`, `7110004`, `7110017`, `1100001`, `1100002` | latest owner output is still setup/header/preflight only; old active replay is stale-env-hung; root space was previously above the `2048 MB` replay threshold | Clean or replace stale active replay, prove readiness, then run one corrected i40 owner replay with first-divergence artifacts |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-held-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet; PR05B/PR05C/PR05D comparison blocked by missing `framer-motion` during unit execution | Publish/fetch/audit clean PR05D and fix the unit dependency before assigning any PR18x owner |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | latest replacement requires the CRDT/data-loss lane from PR06D, not PR07 | Prove `PR06D -> PR09`, `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; repaired PR13B/C links are fallback/supporting evidence | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | previous comparison kept residual suffix cases on the PR05 path and assigned no PR18x owner | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix | active sessions are not progress by themselves | Count only nonempty durable reports/artifacts or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise consumer cap | timeout/reload-rejoin current-run families | source-stable terminal family caps remain implemented and previously validated | Keep product-evidence representatives visible while avoiding duplicate analysis |
| Duplicate/noise producer leak | supervisor startup thresholds, novelty materialization-floor backfill, possible global setup REST empty JSON family | latest synthesis identifies remaining control-plane churn; latest feedback action is zero bytes, so no new producer-side fix is completed | Run bounded control-plane action only; validate with `node --check`, gate-only passes, restart checks, and product-evidence visibility |
| Current fuzz validation | `run-20260518T032331Z` plus trend through `2026-05-18T03:06:56Z` | latest raw novelty file is startup-only; trend evidence shows fuzz/control-plane health, not final-stack validation | Wait for full novelty pass and use only refreshed stack product evidence for filing or validation claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, Cycle312,
Cycle314, Cycle316, Cycle318, grouped Cycle320/i40, grouped PR06/PR11/PR12/PR15
as active units, `ready/*`, validation-stack, dirty evidence, fallback-tail
branches, raw deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale
finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle324 `finalized/cycle324-i40/*` source family, but keep the
   active ungrouped rows in this report.
2. Run a fresh non-Docker manifest refresh from
   `20260518T031230Z/finalization.report.md`, including `push-manifest.tsv`,
   `manifest-age.tsv`, `base-allowlist.tsv`,
   `head-bundle-manifest-check.tsv`, branch graph, artifact verification, and
   deferred-candidate freshness.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Treat Cycle324/Cycle326 and `031230Z` finalization evidence as
   source/local-audit context only. They are not a GitHub push, and they do
   not clear PR07 owner, seed-`1020002`, exact branch-link,
   deferred-freshness, or final-stack validation gates.
5. Treat any zero-byte report, stale manifest, setup-only matrix, or
   disk-preflight-only report as no evidence.
6. Clean or replace the stale active PR07 replay, then run one current i40 owner
   replay over `PR07B0`, `PR07B1`, `HOLD-07B2`, and `HOLD-07C` with the
   required REST/meta, `_crdt_document`, edited-record, Y.Doc/provider,
   awareness, and block-tree first-divergence artifacts.
7. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15D`, clean PR05D only,
   PR15A-D after PR14B, and no fallback-tail PR05D.
8. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
9. Keep old aggregate or stale prior art, broad PR08, dirty evidence branches,
   stale/misordered PR13 refs, fallback-tail PR15/PR05D confusion, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
10. Patch/enforce the progress gate so active sessions, active/terminal
    `1020002`, zero-byte artifacts, `report.tmp`, stale manifests,
    old Cycle293/Cycle296 refs, stale-wrapper replays, disk/runtime-preflight
    only reports, setup-only PR07 matrices, `runtime-readiness-blocked` rows,
    and stderr growth are not counted as durable progress while actionable
    rows exist.
11. Treat duplicate/noise fixes as control-plane hygiene only. They should keep
    product-evidence signatures visible while avoiding duplicate analysis or
    noisy producer launches; they are not product validation or final-stack
    fuzzing.
12. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.

The next useful bounded jobs are:

- `rtc-cycle330-cycle324-i40-manifest-refresh-from-031230-finalization`
- `rtc-cycle330-pr07-stale-session-reap-and-owner-replay`
- focused reload replay for seeds `990001`, `1070001`, `1020002`, and
  `1020003`
- focused pre-save Search replay for seeds `5200002` and `5800001`
- focused rich-text suffix replay/env repair for seed `5100002`
- a bounded duplicate/noise producer-side control-plane action if the
  supervisor/novelty churn and REST empty JSON scan confirm active leakage

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, PR17, PR18, or
PR18x promotion.
