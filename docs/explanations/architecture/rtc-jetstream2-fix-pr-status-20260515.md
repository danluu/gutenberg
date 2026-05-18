# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T03:14:01Z`

Trigger event:
`pr-split-2026-05-18T03-12-42Z-20260518T025948Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T03-12-42Z-20260518T025948Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis is
`pr-split-20260518T025948Z-synthesis.md`. It keeps the active
maintainer-facing split on the Cycle324/Cycle326 ungrouped i40 replacement
shape, not the older grouped i40 shape. The split itself is no longer the main
blocker. Filing, rebuilt stack-wide validation, and broad final-stack fuzzing
remain blocked by missing PR07 owner evidence and seed `1020002`.

The completed Cycle324 action pass produced a `43`-row non-Docker local
manifest/audit with bundle `PASS`; the completed Cycle326 pass refreshed from
the latest Cycle324 finalization and recorded `46` audited rows, `0` failures,
bundle `PASS`, and freshness `PASS`. The latest synthesis now treats that as
useful but stale local audit context for filing because newer deferred
candidates exist. A later nonzero `20260518T025225Z` finalization is useful
publication evidence, but it still does not cover all newer deferred
candidates named by the reviews. The zero-byte
`20260518T030228Z/finalization.report.md` is no evidence.

Exact product refs are still missing for many active rows, PR07 owner evidence
is still absent, and the next publication step is a fresh non-Docker
Cycle328-style finalization/manifest refresh from the latest nonzero Cycle324
refs and newer deferred reports.

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
(hold PR07B2 and PR07C as siblings off PR07B1; no raw PR07D)

Independent CRDT/data-loss lane from PR06D:
PR09 -> PR10
-> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B
-> PR15A -> PR15B -> PR15C -> PR15D
```

Split boundaries named by the latest synthesis:

- `PR06A-D`: `705d84c`, `d127d3d`, `d4041cc`, `e072401`
- `PR11A-E`: `9376ea9`, `3d228d0`, `eb02980`, `0f18951`, `75e065`
- `PR12A-C`: `fa13d1`, `80d6a4`, `95d3a0`
- `PR15A-D`: `687a13`, `17569a`, `bcf1c4`, `276709`

Active status changes since the prior report:

- Grouped PR06, PR11, PR12, and PR15 are no longer the recommended active
  review units. The Cycle324 ungrouped audit and the Cycle326 finalization
  manifest refresh both passed locally, but audited aggregate or synthetic refs
  remain prior art only until explicit sub-PR branches are published, fetched,
  and audited. A fresh manifest/finalization refresh is required before filing
  because deferred evidence moved after the last usable manifest.
- Filing and broad final-stack fuzzing remain blocked by missing PR07 owner
  evidence, seed `1020002`, stale active PR07 replay state, and missing verified
  GitHub refs for many active rows.
- The `20260518T024222Z/finalization.report.md` report remains useful Cycle324
  local finalization evidence: it records `35` ready product/sidecar rows, `8`
  blocked hold/runtime rows, `3` diagnostic refs, and `46/46` proposed
  PR/hold/diagnostic ranges passing ancestry and `git diff --check`. It is not
  a GitHub push and does not clear the PR07 owner or exact branch-link gates.
  The later nonzero `20260518T025225Z` evidence is useful but incomplete, and
  the zero-byte `20260518T030228Z` report must not be used.
- The Cycle326 PR07 health/downscope job classified the older
  `rtc-cycle322-i40-pr07-owner-replay-with-snapshots-fixed` session as
  `stale-env-hung-active-replay`: the session was still active, the latest
  source artifact was only `preflight.tsv`, the artifact age was `3771` seconds
  at `2026-05-18T02:58:12Z`, and no durable PR07 owner evidence existed.
- The current root free-space snapshot is above the `2048 MB` replay threshold,
  so disk is no longer the immediate PR07 blocker. The remaining PR07 blocker is
  stale-session cleanup/replacement followed by exactly one current-namespace
  owner replay with first-divergence artifacts.
- The Cycle322 PR05B/PR05C/clean-PR05D owner comparison accepted the diagnostic
  cherry-pick on all three refs, but unit execution was blocked by the same
  missing `framer-motion` dependency. It assigns no PR18x owner.
- The latest novelty status for `run-20260518T024309Z` has completed a pass:
  `49258` coverage files, `76661` records seen, `5` unmet goals, active
  current-run likely-real visible `0`, current-drain likely-real visible `1`,
  `1` current-drain product-evidence signature, and `6` current-drain
  family-capped signatures. This is fuzz/control-plane health evidence, not
  final-stack validation.
- The latest completed duplicate/noise action implemented the bounded
  fuzzer-control fix across supervisor, novelty/live-analysis consumers, and
  triage watcher. Strict no-product startup drains now write durable
  `no-analysis.json` with product-evidence preservation, active supervisor
  drains remain visible to consumers, and source-gated startup hash suppression
  no longer marks product-evidence signatures as `bootstrap-stall`. The newest
  status has no queued/running strict `pre_action_bootstrap_stall` signatures
  with zero product evidence. This does not change the product PR split.

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- Publish, fetch, and audit exact product refs for every active row that says
  `No verified branch link yet`.
- Treat the completed Cycle326 `46`-row manifest/deferred refresh as prior
  local audit evidence. Rerun a fresh Cycle328-style finalization/manifest
  refresh before filing because finalization/deferred state has moved.
- Clear or replace the stale active PR07 replay session without launching a
  duplicate owner matrix, keep root preflight above the `2048 MB` threshold, and
  then run exactly one corrected i40 PR07 owner replay. It must compare
  `PR07B0`, `PR07B1`, `HOLD-07B2`, and `HOLD-07C` with
  `collaborationEnabled=true`, REST/meta, `_crdt_document`, edited record,
  Y.Doc/provider/awareness, and block-tree first-divergence snapshots.
- Keep stale Cycle293/Cycle306/local-publish rows, fallback-tail PR05D, raw
  PR07D, PR17, PR18, PR18x, wait-only output, active-session-only status,
  setup-only output, header-only TSVs, and zero-byte reports out of filing
  evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-18T03:13:56Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6E, PR 7, PR 8, PR 15, fallback-group
evidence, and final branch claims unless it is deliberately copied into a clean
evidence worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-18T03:14:01Z` from fetched
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
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | evidence-only until pushed/fetched/audited |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5D | Clean semicolonless/entity-validation after PR 5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail PR05D |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; local Cycle324 and Cycle326 audits passed, exact branch still missing |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; local Cycle324 and Cycle326 audits passed, exact branch still missing |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; local Cycle324 and Cycle326 audits passed, exact branch still missing |
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
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; local Cycle324 and Cycle326 audits passed, exact branch still missing |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; local Cycle324 and Cycle326 audits passed, exact branch still missing |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; local Cycle324 and Cycle326 audits passed, exact branch still missing |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; local Cycle324 and Cycle326 audits passed, exact branch still missing |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; local Cycle324 and Cycle326 audits passed, exact branch still missing |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; local Cycle324 and Cycle326 audits passed, exact branch still missing |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; local Cycle324 and Cycle326 audits passed, exact branch still missing |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; local Cycle324 and Cycle326 audits passed, exact branch still missing |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13C is supporting fallback evidence |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13B is supporting fallback evidence |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-D |
| PR 15A | Fallback-group operation subhead `687a13` after PR14B | No verified branch link yet | TBD | TBD | replaces grouped PR15 as active split; local Cycle324 and Cycle326 audits passed, exact PR14B-based link missing |
| PR 15B | Fallback-group operation subhead `17569a` after PR15A | No verified branch link yet | TBD | TBD | replaces grouped PR15 as active split; local Cycle324 and Cycle326 audits passed, exact PR14B-based link missing |
| PR 15C | Fallback-group operation subhead `bcf1c4` after PR15B | No verified branch link yet | TBD | TBD | replaces grouped PR15 as active split; local Cycle324 and Cycle326 audits passed, exact PR14B-based link missing |
| PR 15D | Fallback-group operation subhead `276709` after PR15C | No verified branch link yet | TBD | TBD | replaces grouped PR15 as active split; local Cycle324 and Cycle326 audits passed, exact PR14B-based link missing |

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
collected_at_utc: 2026-05-18T03:13:56Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T024309Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` collected for this update was written at
`2026-05-18T03:06:56.905Z` for `run-20260518T024309Z`.

Current novelty numbers:

```text
coverage files: 49258
total records seen: 76661
records processed this pass: 25
current-run active dirs: 0
unmet goals: 5
harness-work candidates: 0
active-scope triage signatures: 0
active-scope product-evidence signatures: 0
active-scope family-capped signatures: 0
active-scope likely-real visible: 0
current-drain triage signatures: 1
current-drain raw signatures: 11
current-drain product-evidence signatures: 1
current-drain family-capped signatures: 6
current-drain likely-real visible: 1
current-drain top family: reload_rejoin_awareness_stall
current-drain raw top families: reload_rejoin_awareness_stall,
  pre_action_bootstrap_stall, shared_ws_runtime_config_race, unknown
suppressed strict startup records in current drain: 3
historical likely-real visible: 282
historical raw top family: pre_action_bootstrap_stall, 21963
combined likely-real visible: 283
enabled groups: novelty-ws-same-user-lifecycle,
  novelty-ws-same-user-stale-tabs
```

Interpretation:

- The active current-run scope has no active dirs, no visible likely-real
  signatures, and no product-evidence signatures. Current-drain still preserves
  one visible product-evidence `reload_rejoin_awareness_stall` representative
  while capping six duplicate-family siblings.
- Strict no-product startup noise is suppressed in the current drain rather
  than treated as a live product failure. The active scope has no bootstrap
  stall signatures.
- Historical triage is still dominated by raw
  `pre_action_bootstrap_stall`, but that is historical/control-plane context,
  not a current product failure count.
- This is a current novelty/control-plane health pass, not final-stack
  validation, a validated PR stack, or filing readiness.

The latest trend packet was generated at `2026-05-18T03:05:36Z` from monitor
data through `2026-05-18T03:00:07Z`:

```text
monitor passes: 2182
coverage files: 272 -> 49246
coverage files delta: 48974
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3447
summary startup failures last: 0
quality issues last: 0
memory free: 420.6 GB
load averages: 84.1 / 67.64 / 60.8 on 64 cores
enabled groups in trend snapshot:
  novelty-ws-revision-persistence
  novelty-ws-revision-recovery
latest fuzz level mix:
  browser-e2e=27 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5492336
browser-e2e likely-real findings: 665 over 2028.4 runner-hours
latest suggested PR net LOC total: 2152
```

Largest unmet goals remain real-user/save-reload depth:

```text
reload-post-action: 1091/2000
title-save-reload: 547/1000
body-save-reload: 606/1000
real-user-editing success: 602/1000
ui-format-paragraph: 1809/2000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. Browser/E2E still dominates capacity, so top-offs
should be guarded by startup-stall, supervisor-state, materialization, and
product-evidence checks instead of simply adding browser concurrency.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T025948Z-synthesis.md`, says:

- The split itself is not the current blocker. The consensus replacement is
  still the Cycle324/Cycle326 ungrouped i40 shape from
  `finalized/cycle324-i40/*`.
- Replace grouped PR06, PR11, PR12, and PR15 with PR06A-D, PR11A-E, PR12A-C,
  and PR15A-D, plus the PR06E malformed-payload sidecar from PR06D.
- Treat stale Cycle293/Cycle306/local-publish rows, stale `ready/*`,
  fallback-tail PR05D, `d06e3528cbd`, raw PR07D, PR17, PR18, and PR18x as
  rejected filing material.
- Treat the latest usable finalization/manifest evidence as stale for filing
  after newer deferred diagnostics. The nonzero `20260518T025225Z`
  finalization is useful, but it does not cover all newer deferred candidates;
  the zero-byte `20260518T030228Z/finalization.report.md` is no evidence.
- Treat the Cycle322/Cycle324 PR07 replay evidence as no owner evidence while
  it has only setup/header/preflight output. Stop or capture the stale PR07
  session before launching exactly one replacement owner replay.
- Run that corrected i40 PR07 owner matrix only over `PR07B0`, `PR07B1`,
  `HOLD-07B2`, and `HOLD-07C`, with `collaborationEnabled=true` and REST/meta,
  `_crdt_document`, edited-record, Y.Doc/provider/awareness, and block-tree
  first-divergence snapshots.
- Repair the rich-text owner-comparison environment before assigning any
  PR18x owner.
- Harden the loop gate so active sessions, setup-only PR07 output,
  disk-preflight-only reports, zero-byte files, `report.tmp`, stale manifests,
  and header-only TSVs do not score as durable progress.
- Treat seed `1020002` as blocking final-stack fuzz, filing, and stack-wide
  validation only. It must not block independent branch/audit/deferred work.

The raw `current-pr-split.md` still has the latest durable completed action
result from Cycle326. Treat it as prior local audit evidence, not current
publication readiness:

- `20260518T024222Z/finalization.report.md` is nonzero local evidence. It
  preserves the corrected Cycle324 split, records `35` ready product/sidecar
  rows, `8` blocked hold/runtime rows, `3` diagnostic refs, and validated
  `46/46` proposed PR/hold/diagnostic ranges with ancestry and
  `git diff --check`.
- `rtc-cycle326-cycle324-i40-finalization-manifest-refresh-after-deferred`
  completed from that finalization report and wrote a fresh local manifest,
  branch graph, root free-space snapshot, and report. It recorded `46` audited
  rows, `0` failures, bundle `PASS`, and freshness `PASS`; it did not push to
  GitHub or edit product/fuzz code.
- `rtc-cycle326-pr07-active-replay-health-downscope` completed and classified
  the older Cycle322 PR07 replay as `stale-env-hung-active-replay`. The session
  was still active, the latest source artifact was only `preflight.tsv`, the
  artifact age was `3771` seconds at `2026-05-18T02:58:12Z`, and an
  environment-hung `wp-env`/Docker signature was present. It did not stop the
  old session or launch a duplicate replay.
- The current root free-space snapshot is above the `2048 MB` replay threshold.
  Docker-backed PR07 owner replay remains deferred because stale active replay
  ownership must be cleaned up or replaced first.
- The latest synthesis requests a fresh non-Docker Cycle328 finalization and
  manifest refresh from the latest nonzero Cycle324 refs and newer deferred
  reports, including reload `024959`, pre-save `024456`, and rich-text
  `023953`, before any publication claim.

The `pr-split-20260518T020732Z-feedback-action.md` action remains the completed
split-change action:

- It updated remote `current-pr-split.md` to use the Cycle324 ungrouped shape.
- It patched the remote review loop so ungrouped PR06A-D, PR12A-C, and PR15A-D
  audit/manifest work counts as independent progress.
- It completed
  `rtc-cycle324-i40-ungroup-pr06-pr11-pr12-pr15-manifest-refresh`, with `43`
  manifest rows, `0` base/diff failures, `0` head/bundle/manifest failures, and
  bundle `PASS`.
- PR07 owner replay, PR18/PR18x, raw PR07D, broad fuzzing, GitHub filing, and
  duplicate seed `1020002` work remained deferred. That remains true after the
  latest `025948Z` synthesis.

The latest duplicate/noise synthesis,
`duplicate-noise-20260518T025502Z-synthesis.md`, says the remaining issue is a
control-plane duplicate/noise leak, not a product-failure spike. Strict
no-product `pre_action_bootstrap_stall` should drain quickly, while
product-evidence signatures stay visible and family-capped. The earlier
`duplicate-noise-20260518T022520Z-feedback-action.md` implemented the bounded
fuzzer-control fix in the remote fuzz repo:

- `bin/rtc-browser-fuzz-supervisor.mjs` now writes durable `no-analysis.json`
  for strict no-product startup seed drains, preserves product evidence, records
  drain dirs in supervisor state, and keeps them visible during the guard
  window.
- `bin/rtc-browser-fuzz-novelty-monitor.mjs` and
  `bin/rtc-browser-fuzz-live-analysis-monitor.mjs` include active supervisor
  drain records, not only paused startup-stall records.
- `bin/rtc-browser-fuzz-triage-watcher.mjs` refuses to mark product-evidence
  signatures as `bootstrap-stall` through source-gated startup hash
  suppression.
- `node --check` passed for all four changed `.mjs` files; gate-only triage,
  live-analysis one-shot, and a direct queued/running strict-startup scan
  passed.
- The active root is `run-20260518T024309Z`; novelty/live-analysis restarted at
  `2026-05-18T02:43:18Z`, and the supervisor restarted at
  `2026-05-18T02:52:33Z`. The latest novelty pass has no active current-run
  dirs, preserves one current-drain product-evidence
  `reload_rejoin_awareness_stall` representative, and caps six current-drain
  duplicate-family siblings.

Do not turn historical duplicate share into global signature suppression.
Remaining duplicate/noise risk is bounded: old pre-patch drained dirs may lack
sentinels, and product-evidence representatives can intentionally keep top
share at threshold while analysis is pending. This does not change the product
PR split.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, current i40 source-family recommendation, the replacement ungrouped
split recommendation, the PR07 setup-only evidence decision, and the latest
novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, Cycle324 local ungrouped aliases, and Cycle324 local finalization outputs | active source family; Cycle324 passed locally with `43` manifest rows and bundle `PASS`, and Cycle326 refreshed the latest Cycle324 finalization with `46` audited rows, `0` failures, bundle `PASS`, and freshness `PASS`; latest synthesis treats that as stale for filing after newer deferred candidates; exact GitHub refs are still missing for many rows | Publish/fetch/audit exact refs; run a fresh Cycle328-style manifest/deferred audit before filing |
| Zero-byte / stale publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, any zero-byte reports | no evidence; do not use for filing or validation claims; `20260518T024222Z` and nonzero `20260518T025225Z` are useful local finalization evidence but not a GitHub push, and the zero-byte `20260518T030228Z/finalization.report.md` is no evidence | Replace stale rows with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C; seeds `5200011`, `5200015`, `5200017`, `5200010`, `5200008`, `7110004`, `7110017`, `1100001`, and `1100002` | latest owner output is still setup/header/preflight only; Cycle326 classifies the old active replay as `stale-env-hung-active-replay`; root free space is now above the 2048 MB replay threshold; PR07B2 and PR07C remain held | Clear/replace the stale active replay without duplicating it, prove readiness, then run corrected i40 owner replay with first-divergence artifacts |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only after fresh PR07 replay proves red-at-held-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet; PR05B/PR05C/PR05D comparison blocked by missing `framer-motion` during unit execution | Publish/fetch/audit clean PR05D and fix the unit dependency before assigning any PR18x owner |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | local Cycle324 and Cycle326 audits passed; grouped PR06 has verified aggregate prior art only; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | latest replacement requires the CRDT/data-loss lane from PR06D, not PR07 | Prove `PR06D -> PR09`, `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | local Cycle324 and Cycle326 audits passed; grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; PR13B/C repaired links are fallback/supporting evidence | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | local Cycle324 and Cycle326 audits passed for PR15A-D shape; branch-link audit has verified PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | previous comparison kept residual suffix cases on the PR05 path and assigned no PR18x owner | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix | active sessions are not progress by themselves | Count only nonempty durable reports/artifacts or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise consumer cap | timeout/reload-rejoin current-run families | source-stable terminal family caps remain implemented and validated | Keep product-evidence representatives visible while avoiding duplicate analysis |
| Duplicate/noise producer leak | cross-output-root startup-noise scheduling and product-evidence duplicate-family capping | bounded supervisor/novelty/live-analysis/triage-watcher fix implemented; latest pass shows no active-scope bootstrap-stall signatures, one current-drain product-evidence representative remains visible, and six current-drain siblings are family-capped | Continue bounded validation and confirm product-evidence representatives stay eligible |
| Current fuzz validation | `run-20260518T024309Z` | current novelty/control-plane pass: `49258` coverage files, `76661` records, `5` unmet goals, active-scope likely-real `0`, current-drain likely-real `1`; no final-stack validation | Use only as fuzz/control-plane health until refreshed stack product evidence and final-stack validation exist |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, Cycle312,
Cycle314, Cycle316, Cycle318, grouped Cycle320/i40, `ready/*`,
validation-stack, dirty evidence, fallback-tail branches, raw
deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale finalization
artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle324 `finalized/cycle324-i40/*` source family, but replace
   grouped PR06, PR11, PR12, and PR15 with the explicit active sub-PR rows in
   this report.
2. Treat the completed Cycle326 non-Docker manifest/deferred refresh as prior
   local audit evidence: `46` audited rows, `0` failures, bundle `PASS`, and
   freshness `PASS`. Run a fresh Cycle328-style finalization/manifest refresh
   before filing because newer deferred candidates moved after that evidence.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Treat the completed Cycle324 finalization and Cycle326 manifest reports as
   source/local-audit context only. They are not a GitHub push, and they do not
   clear the PR07 owner, seed-`1020002`, exact branch-link, deferred-freshness,
   or final-stack validation gates.
5. Treat any zero-byte report or stale manifest as no evidence. The
   `20260518T024222Z/finalization.report.md` file and the later nonzero
   `20260518T025225Z` finalization are useful local evidence, not filing
   readiness. The zero-byte `20260518T030228Z/finalization.report.md` is no
   evidence.
6. Keep root preflight above the `2048 MB` replay threshold, then clear or
   replace the stale active PR07 replay without launching a duplicate matrix.
7. Replace setup/header/preflight PR07 output with a corrected i40 owner replay
   that includes `HOLD-07B2`, `HOLD-07C`, proves `collaborationEnabled=true`,
   and captures REST/meta, `_crdt_document`, edited record, Y.Doc, provider,
   awareness, and block-tree first-divergence snapshots.
8. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15D`, clean PR05D only,
   PR15A-D after PR14B, and no fallback-tail PR05D.
9. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
10. Keep old aggregate or stale prior art, broad PR8, dirty evidence branches,
    stale/misordered PR13 refs, fallback-tail PR15/PR05D confusion, and the
    untracked reload-hydration gate spec out of filing branches and push
    allow-lists.
11. Patch/enforce the progress gate so active sessions, active/terminal
    `1020002`, zero-byte artifacts, `report.tmp`, stale manifests, old
    Cycle293/Cycle296 refs, stale-wrapper replays, disk/runtime-preflight-only
    reports, setup-only PR07 matrices, `runtime-readiness-blocked` rows, and
    stderr growth are not counted as durable progress while actionable rows
    exist.
12. Treat duplicate/noise fixes as control-plane hygiene only. They should keep
    product-evidence signatures visible while avoiding duplicate analysis or
    noisy producer launches; they are not product validation or final-stack
    fuzzing. The bounded supervisor/novelty/live-analysis/triage-watcher fix is
    implemented, and the latest pass shows no active-scope bootstrap-stall
    signatures while product-evidence representatives remain visible.
13. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.
14. Treat novelty, trend, and duplicate/noise reports as fuzz/control-plane
    health and triage evidence. They are not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

The next useful bounded jobs are publishing/fetching/auditing exact active PR
refs and the latest synthesis' Cycle328 follow-ups:
`rtc-cycle328-cycle324-i40-finalization-manifest-refresh-after-deferred`,
`rtc-cycle328-pr07-stale-session-cleanup-and-i40-owner-replay`,
`rtc-cycle328-reload-ws-diagnostics-focused-replay` for seeds `990001`,
`1070001`, `1020002`, and `1020003`,
`rtc-cycle328-pre-save-search-diagnostics-focused-replay` for seed `5200002`,
and `rtc-cycle328-rich-text-pr05-owner-comparison-env-repair`. Gate PR07
replay on fresh root preflight and duplicate-session checks. Do not launch
broad final-stack fuzz, a duplicate broad/final-stack seed `1020002` job
outside that focused diagnostic replay, raw PR07D, PR17, PR18, or PR18x
promotion.
