# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T04:23:51Z`

Trigger event:
`pr-split-2026-05-18T04-22-19Z-20260518T040712Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T04-22-19Z-20260518T040712Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis is
`pr-split-20260518T040712Z-synthesis.md`. It keeps the active
maintainer-facing split on the Cycle324/Cycle330 ungrouped i40 replacement
shape, not the older grouped PR06/PR11/PR12/PR15 topology. It also adds a
held strict stale-projection comparison lane for seeds `5200005` and `5200008`
without promoting that lane to a product PR.

Filing, final-stack fuzzing, and stack-wide validation remain blocked. The
Cycle330 manifest refresh from `20260518T035243Z` is the latest completed
audited manifest evidence in this report, but the newest split synthesis says
`20260518T041248Z` is now the latest nonzero finalization and still needs a
fresh non-Docker manifest/audit. Seed `1020002`, missing PR07 owner evidence,
missing verified GitHub refs for many active rows, and missing
publication/final-stack freshness still block maintainer-facing PR filing.

Important status changes since the prior report:

- `20260518T035243Z/finalization.report.md` and the Cycle330 manifest refresh
  are the latest completed audit evidence captured in the existing report:
  `53` audited rows, `0` failures, bundle `PASS`, base allowlist `PASS`,
  head/bundle/manifest agreement `PASS`, and freshness `PASS`. The newer split
  synthesis says `20260518T041248Z` is now nonzero, while the current audited
  manifest still points back to Cycle330/`035243Z`.
- The latest split synthesis still recommends the ungrouped i40 shape:
  PR06A-D, PR11A-E, PR12A-C, PR15A-D, plus PR06E as a sidecar from PR06D.
  Verified aggregate refs in the branch audit are prior art unless the active
  row below links that exact branch. `HARNESS-WS-URL` and
  `HARNESS-PLUGIN-STATUS` are harness rows only, not product fixes.
- The branch-link audit generated at `2026-05-18T04:23:51Z` verifies PR01,
  PR02, PR03, PR04, aggregate PR05, aggregate PR06, PR06A prior art, aggregate
  PR07A/PR07B, PR08 prior art, PR09, PR10, aggregate PR11, aggregate PR12,
  repaired PR13A/B/C, PR14, and PR15A-C component refs. It does not verify the
  exact active sub-PR refs for PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3,
  PR07B0-B1, PR11A-E, PR12A-C, PR13B0-B3, PR14B, or PR15D.
- The latest raw novelty monitor for `run-20260518T041857Z` completed a pass at
  `2026-05-18T04:22:27.218Z`. It reports `49687` coverage files, `77578`
  records seen, `5` unmet goals, `0` current active triage signatures, `0`
  current visible likely-real failures, and `2` current drain triage roots.
  Treat it as coverage/control-plane health, not final-stack validation.
- The latest trend packet, generated at `2026-05-18T04:12:33Z`, still shows
  broad fuzz/control-plane health rather than final-stack validation:
  `49544` coverage files, `5` unmet goals, current duplicate share `0` in the
  graph snapshot, and `5517822` cumulative fuzz-level test executions.
- Completed deferred reports named by the latest split synthesis are rich-text
  `040035Z`, pre-save Search/live-collapse `040538Z`, and reload hydration
  `041040Z`. They must be included in the next manifest/deferred freshness
  audit, but they do not create PR17, PR18, PR18x, or raw PR07D.
- The latest duplicate/noise synthesis
  `duplicate-noise-20260518T035853Z-synthesis.md` says the narrow scheduler
  fix is clear: disable coverage-guidance-only startup-noise cooldown bypass
  while preserving product-evidence paths. That is control-plane work only, not
  product validation and not a product PR gate.

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

Held owner-comparison lane:
HOLD-STRICT-STALE-PROJECTION-5200005/5200008

Independent CRDT/data-loss lane from PR06D:
PR09 -> PR10
-> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B
-> PR15A -> PR15B -> PR15C -> PR15D
```

Non-product harness rows:

```text
HARNESS-WS-URL
HARNESS-PLUGIN-STATUS
```

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- Publish, fetch, and audit exact product refs for every active row that says
  `No verified branch link yet`.
- Run a fresh Cycle332 non-Docker finalization/manifest refresh using the
  now-nonzero `041248Z` finalization and the completed rich-text `040035Z`,
  pre-save search `040538Z`, and reload hydration `041040Z` deferred reports
  before making publication claims.
- Queue or publish the `rtc-plugin-status-json-stall-retry` harness sidecar
  only as harness infrastructure, then rerun focused reload shards. Keep it
  out of product reload-fix rows.
- Treat the current Cycle328 PR07 replay as no progress unless it writes real
  replay rows and snapshots. Current artifacts are setup-only: `replay-runs.tsv`
  is header-only, `refs.tsv` only has `PR07B0`, and the process is stopped in
  `wp_collaboration_enabled`. Reap/timeout that path, then run exactly one
  bounded Cycle324 PR07 owner replay over `PR07B0`, `PR07B1`, `HOLD-07B2`, and
  `HOLD-07C`, with
  `collaborationEnabled=true`, REST/meta, `_crdt_document`, edited record,
  Y.Doc/provider/awareness, block-tree first-divergence snapshots, and per-step
  `wp-env run cli` timeouts.
- Run the held strict projection comparison for seeds `5200005` and `5200008`
  against `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`, and `HOLD-07C` before
  assigning a new owner or product slot.
- Keep stale Cycle293/Cycle306/local-publish rows, fallback-tail PR05D, raw
  PR07D, PR17, PR18, PR18x, active-session-only status, setup-only output,
  disk-preflight-only output, header-only TSVs, `report.tmp`, and zero-byte
  reports out of filing evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-18T04:23:45Z`.

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

The branch-link audit was generated at `2026-05-18T04:23:51Z` from fetched
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
| HOLD-STRICT-STALE-PROJECTION-5200005/5200008 | Strict stale projection/reload owner comparison against earlier plausible owners | No verified branch link yet | held comparison lane only; not a product PR slot |
| HARNESS-WS-URL | WebSocket/reload harness URL evidence | No verified branch link yet | ready harness row from latest synthesis; not a product fix |
| HARNESS-PLUGIN-STATUS | Plugin status JSON stall/retry harness sidecar | No verified branch link yet | ready harness row from latest synthesis; queue separately from product PRs |
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
collected_at_utc: 2026-05-18T04:23:45Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T041857Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` for this update was written at
`2026-05-18T04:22:27.218Z` for `run-20260518T041857Z`. It completed a pass
after the run-local noise state reset and supervisor restart:

```text
coverage files: 49687
total records seen: 77578
records processed this pass: 211
new behavioral feature keys this pass: 1
new CDP coverage hashes this pass: 0
unmet goals: 5
active current-run dirs: 2
current drain triage roots: 2
current active triage signatures: 0
current visible likely-real failures: 0
combined visible likely-real failures: 290
enabled groups: novelty-ws-same-user-lifecycle,
  novelty-ws-same-user-stale-tabs
recommended groups: novelty-ws-real-user-save-reload,
  novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text
```

Interpretation:

- The latest raw novelty file shows no current visible likely-real failures,
  no active current-run signatures, and no current drain signatures. That is
  still not final-stack validation or filing readiness.
- The current monitor also reports a health warning: no behavioral coverage
  files were found under the new novelty output dir yet. Treat this as a
  current-run scoping/control-plane caveat, not as proof of product health.
- Historical/combined likely-real and duplicate counters remain useful for
  trend context only; do not mix them into current active-run status.

The latest trend packet was generated at `2026-05-18T04:12:33Z`:

```text
monitor passes: 2191
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T04:05:06Z
coverage files: 272 -> 49544
coverage files delta: 49272
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3444
summary startup failures last: 0
quality issues last: 0
memory free: 410.8 GB
load averages: 82.75 / 79.83 / 76.39 on 64 cores
enabled groups: novelty-ws-revision-persistence,
  novelty-ws-revision-recovery
latest fuzz level mix:
  browser-e2e=29 lanes/26 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5517822
browser-e2e likely-real findings: 678 over 2054.6 runner-hours
latest suggested PR net LOC total: 2152
```

Largest unmet goals remain save/reload and real-user depth:

```text
reload-post-action: 1091/2000
title-save-reload: 547/1000
real-user-editing success: 602/1000
body-save-reload: 606/1000
ui-format-paragraph: 1824/2000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. CPU is already high enough that top-offs should be
guarded by startup-stall, supervisor-state, materialization, and
product-evidence checks rather than simply adding browser concurrency.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T040712Z-synthesis.md`, says:

- The split itself has consensus: use the Cycle324/Cycle330 ungrouped i40
  replacement, not grouped PR06/PR11/PR12/PR15 and not the older grouped or
  linear split.
- `20260518T041248Z` is now a nonzero finalization, while the current audited
  manifest still points back to Cycle330/`035243Z`. The next independent step
  is a fresh non-Docker manifest/audit from `041248Z` plus the latest completed
  deferred reports.
- Keep `HARNESS-WS-URL` and `HARNESS-PLUGIN-STATUS` as harness-only rows, not
  product fixes.
- Completed deferred reports now include rich-text `040035Z`, pre-save
  Search/live-collapse `040538Z`, and reload hydration `041040Z`. Include them
  in freshness/deferred audit; do not turn them into PR17, PR18, PR18x, or raw
  PR07D.
- Add `HOLD-STRICT-STALE-PROJECTION-5200005/5200008` as a held owner-comparison
  lane only. Compare seeds `5200005` and `5200008` against `PR11A`, `PR11E`,
  `PR12C`, `PR13B3`, `PR07B1`, and `HOLD-07C` before assigning a product slot.
- Reject grouped PR06/PR11/PR12/PR15 as active review units; stale
  Cycle293/Cycle306/local-publish rows; raw `deferred/*`, `candidate/*`,
  `ready/*`, `ready-pr03b/*`; fallback-tail PR05D; raw PR07D; PR17; PR18; and
  PR18x.
- Clean PR05D is only `27c6e7924217038ed9b4ff71585e8041c67765a4`.
- PR07 filing still needs owner evidence. The current Cycle328 PR07 replay is
  setup-only unless it writes real replay rows and snapshots: `replay-runs.tsv`
  is header-only, `refs.tsv` only has `PR07B0`, and the process is stopped in
  `wp_collaboration_enabled`.
- Seed `1020002` blocks final-stack fuzz, filing, and stack-wide validation
  only. It must not block independent manifest refresh, branch audit, PR07
  replay repair, held owner comparison, harness queueing, diagnostic reduction,
  or loop repair.

The completed split-action
`pr-split-20260518T034456Z-feedback-action.md` remains the latest nonzero
action evidence:

- Appended the Cycle330 status to remote `current-pr-split.md`.
- Completed
  `rtc-cycle330-cycle324-i40-manifest-refresh-from-035243-finalization`:
  `53` audited rows, `0` failures, bundle `PASS`, base allowlist `PASS`,
  head/bundle/manifest agreement `PASS`, and freshness `PASS` against the
  `035243Z` finalization, current deferred queue/status, latest local publish
  manifest, and latest deferred report at that time.
- Added `HARNESS-WS-URL` and `HARNESS-PLUGIN-STATUS` as harness-only rows.
- Did not launch duplicate PR07 browser replay because the Cycle328 PR07 path
  and a newer continuation were already active. Those sessions are not product
  evidence unless they produce `collaborationEnabled=true` plus durable
  REST/meta, CRDT, edited-record, Y.Doc/provider/awareness, and block-tree
  first-divergence artifacts.

The latest duplicate/noise synthesis,
`duplicate-noise-20260518T035853Z-synthesis.md`, says:

- The duplicate/noise leak is producer scheduling, not strict-startup analysis
  consumption.
- The smallest safe follow-up is to disable coverage-guidance-only
  startup-noise cooldown bypass while preserving product-evidence paths.
- Broader product-evidence and stale-session cleanup remains follow-up; it does
  not block the narrow scheduler fix.

The completed `duplicate-noise-20260518T030811Z-feedback-action.md` remains
useful background control-plane work: it tightened startup-stall defaults,
added producer caps, restarted coverage-guided novelty/supervisor/live-analysis
sessions, and passed `node --check` plus gate-only validation at that time.
However, the newer `035853Z` synthesis means duplicate/noise remediation should
stay open as control-plane follow-up. It does not change the product PR split
and is not product validation.

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
| i40 source family | `fresh-prset/iteration-40/*`, Cycle324 local ungrouped aliases, Cycle330 manifest output, `20260518T035243Z/finalization.report.md`, `20260518T041248Z/finalization.report.md`, and harness rows | active source family; `035243Z` validates `53/53` local ranges and the Cycle330 manifest audits `53` rows, while latest synthesis says `041248Z` is now nonzero but unaudited | Run Cycle332 non-Docker finalization/manifest freshness audit from `041248Z`; publish/fetch/audit exact GitHub refs before filing |
| Zero-byte / stale publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, previous zero-byte-at-review reports after they are superseded, `report.tmp` | no evidence; `031230Z`, `033236Z`, `035243Z`, and the Cycle330 manifest are useful local evidence but not GitHub publication; `041248Z` needs the next audit | Replace stale rows with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C; seeds `5200011`, `5200015`, `5200017`, `5200010`, `5200008`, `7110004`, `7110017`, `1100001`, `1100002` | Current Cycle328 replay output is setup-only unless it writes real rows/snapshots; `replay-runs.tsv` is header-only, `refs.tsv` only has `PR07B0`, and the process is stopped in `wp_collaboration_enabled` | Reap/timeout the stuck `wp-env` path and rerun one corrected Cycle324 owner replay with per-step timeouts |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-held-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet; PR05B/PR05C/PR05D comparison blocked by missing `framer-motion` during unit execution | Publish/fetch/audit clean PR05D and fix the unit dependency before assigning any PR18x owner |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | latest replacement requires the CRDT/data-loss lane from PR06D, not PR07 | Prove `PR06D -> PR09`, `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; repaired PR13B/C links are fallback/supporting evidence | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | previous comparison kept residual suffix cases on the PR05 path and assigned no PR18x owner | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Strict stale projection owner comparison | `HOLD-STRICT-STALE-PROJECTION-5200005/5200008`; compare `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`, and `HOLD-07C` | held comparison lane only; not a product PR slot and no verified branch link yet | Run the owner comparison before creating any new strict-projection product row |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix, `HARNESS-WS-URL`, `HARNESS-PLUGIN-STATUS` | active sessions are not progress by themselves; latest named completed reports are rich-text `040035Z`, pre-save search `040538Z`, and reload hydration `041040Z`; harness rows are not product fixes | Count only nonempty durable reports/artifacts, audited harness refs, or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families, including the plugin-status harness sidecar and completed reload `041040Z` report | evidence-only unless a focused owner replay proves otherwise; reload/plugin-status work remains harness-sidecar material unless ownership evidence changes | Queue/publish harness sidecars separately, rerun targeted reload/revision shards, and keep these out of product PR rows until ownership evidence is refreshed |
| Duplicate/noise consumer cap | timeout/reload-rejoin current-run families | source-stable terminal family caps remain implemented and previously validated | Keep product-evidence representatives visible while avoiding duplicate analysis |
| Duplicate/noise producer leak | scheduler startup-noise cooldown bypass, supervisor relaunch/re-enable behavior, possible broader stale/product-evidence cleanup | latest synthesis says the narrow scheduler fix is to disable coverage-guidance-only startup-noise cooldown bypass while preserving product-evidence paths | Patch the scheduler bypass, preserve product-evidence signatures, and validate with `node --check`, gate-only triage, restart/watch evidence |
| Current fuzz validation | `run-20260518T041857Z` plus trend through `2026-05-18T04:05:06Z` and raw novelty through `2026-05-18T04:22:27.218Z` | latest raw novelty pass shows `0` active current signatures, `0` current visible likely-real failures, and `2` drain triage roots; trend evidence shows fuzz/control-plane health, not final-stack validation | Use refreshed stack product evidence, not broad coverage health, for filing or validation claims |

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
2. Run a fresh Cycle332 non-Docker finalization/manifest refresh using the
   now-nonzero `20260518T041248Z` finalization plus the completed rich-text
   `040035Z`, pre-save Search/live-collapse `040538Z`, and reload hydration
   `041040Z` deferred reports. Outputs must include `push-manifest.tsv`,
   `manifest-age.tsv`, `base-allowlist.tsv`,
   `head-bundle-manifest-check.tsv`, bundle verification, branch graph,
   artifact verification, and deferred-output audit.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Treat Cycle324/Cycle326/Cycle330, `031230Z`, `033236Z`, `035243Z`, and the
   Cycle330 manifest evidence as source/local-audit context only. They are not
   a GitHub push, and they do not clear PR07 owner, seed-`1020002`, exact
   branch-link, deferred-freshness, harness publication, or final-stack
   validation gates.
5. Treat any zero-byte report, stale manifest, setup-only matrix, or
   disk-preflight-only report as no evidence.
6. Reap/timeout the stuck Cycle328 PR07 `wp-env` path if it remains setup-only,
   then run one current Cycle324 owner replay over `PR07B0`, `PR07B1`,
   `HOLD-07B2`, and `HOLD-07C` with the required REST/meta, `_crdt_document`,
   edited-record, Y.Doc/provider, awareness, block-tree first-divergence
   artifacts, and per-step `wp-env run cli` timeouts.
7. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15D`, clean PR05D only,
   PR15A-D after PR14B, and no fallback-tail PR05D.
8. Run the held strict stale-projection owner comparison for `5200005` and
   `5200008` before creating any new strict-projection product row.
9. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
10. Keep old aggregate or stale prior art, broad PR08, dirty evidence branches,
   stale/misordered PR13 refs, fallback-tail PR15/PR05D confusion, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
11. Patch/enforce the progress gate so active sessions, active/terminal
    `1020002`, zero-byte artifacts, `report.tmp`, stale manifests,
    old Cycle293/Cycle296 refs, stale-wrapper replays, disk/runtime-preflight
    only reports, setup-only PR07 matrices, `runtime-readiness-blocked` rows,
    and stderr growth are not counted as durable progress while actionable
    rows exist.
12. Treat duplicate/noise fixes as control-plane hygiene only. They should keep
    product-evidence signatures visible while avoiding duplicate analysis or
    noisy producer launches; they are not product validation or final-stack
    fuzzing.
13. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.

The next useful bounded jobs are:

- `rtc-cycle332-cycle324-i40-manifest-refresh-after-041248-finalization-and-deferred`
- `rtc-cycle332-pr07-owner-replay-repair-current-i40`, after stale-session
  cleanup and root-space preflight
- `rtc-cycle332-strict-stale-top-level-owner-comparison`
- a loop-repair Codex job that makes active-session-only, zero-byte,
  `report.tmp`, disk-preflight-only, stale-manifest, and setup-only outputs
  count as no progress when gate rows are actionable
- `rtc-focused-reload-after-plugin-status-retry` after the
  `rtc-plugin-status-json-stall-retry` harness branch is queued
- focused pre-save Search/live-collapse replay for `DIAG-SEARCH-032013`
  against strict `5200002`, coverage `1100002` / `1110002`, and focused search
- focused rich-text suffix replay/env repair and PR05B/PR05C/clean-PR05D
  owner comparison before any PR18x assignment
- duplicate/noise follow-up only if a later current-root scan shows renewed
  producer leakage or an active no-product REST empty-JSON family

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, PR17, PR18, or
PR18x promotion.
