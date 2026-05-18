# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T12:40:42Z`

Trigger event:
`pr-split-2026-05-18T12-33-23Z-20260518T122404Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T12-33-23Z-20260518T122404Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Cycle 360 remains the latest applied split-feedback action in
`current-pr-split.md`, but the newest split-persona synthesis
(`pr-split-20260518T122404Z-synthesis.md`) tightens the PR07 shape again. Keep
the Cycle325/i40 parallel-lane review frame, but replace the PR07 linear tail
with a two-stage decision structure: first decide current `PR07B0` versus the
fresh `121507` saved-response/persisted-CRDT hydration candidate, then decide
current `PR07B1A` versus a conflict-resolved `111430`/`114448` stale-epoch
candidate.

The current maintainer-facing split recommendation is:

```text
Ready/local lane:
PR01 -> PR02 (+ PR02A) -> PR03 (hold PR03B) -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D (+ PR06E)

Runtime-gated PR07 lane:
PR07A1 -> PR07A2 -> PR07A3
then first decision fork:
  current PR07B0
  vs restacked 121507 saved-response/persisted-CRDT hydration candidate
winner -> PR07B1
then second decision fork:
  current PR07B1A
  vs restacked 111430/114448 candidate, if conflict-resolved
  plus PR03B, HOLD-07B2, and HOLD-07C as comparison/hold arms

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

Current blockers and status changes:

- PR07 is blocked on ownership and is not file-ready. The latest recommendation
  is to compare current `PR07B0` against the `121507` saved-response/persisted
  CRDT hydration candidate before accepting a `PR07B1` base.
- `PR07B1A` is still not proven to cover the newer `111430`/`114448`
  reload/stale-epoch candidate. The Cycle 360 PR07 job passed with `0` hard
  failures and verified distinct patch IDs: current `PR07B1A` is
  `9964238035d698b2ca22e0ece2cf09de0cb00b07`, while `111430` and `114448` are
  `652e07a70d6b259b3ea37da84526cfb8b48f8d4b`. Both still conflict in
  `packages/sync/src/test/manager.ts` when cherry-picked onto `PR07B1`, so no
  conflict-resolved restacked candidate exists yet.
- The PR07 outcome rule now has two gates: choose current `PR07B0` or the
  restacked `121507` candidate after `PR07A3`; then, after the chosen
  `PR07B1`, choose whether current `PR07B1A`, a conflict-resolved
  `111430`/`114448` candidate, or a replace/add/reorder shape owns the
  stale-epoch behavior.
- `20260518T120507Z` is now a nonzero finalization input, not a zero-byte
  artifact. The post-`120507Z` audit passed with `0` hard failures, generated
  `cycle325-i40-120507-audit.bundle`, and verified manifest/live-head/bundle
  agreement for all `70` main rows. It still has `14` deferred-freshness
  warnings, so it is branch/bundle/manifest evidence, not complete
  deferred-coverage proof.
- The `120507Z` freshness warnings include `115957Z` reload uncovered by
  `120507Z` and `121003Z` rich-text completing after `120507Z`. Newer split
  synthesis also says not to treat `121510Z` as full deferred-coverage proof
  because `121507` completed after it, and not to treat `122513Z` as evidence
  while its finalization report is `0` bytes.
- Seed `1020002` remains a blocker only for final-stack fuzzing, GitHub filing,
  rebuilt stack-wide validation, and its own repair or reclassification. It
  must not serialize independent ready/local work, CRDT-lane work, PR07
  restack/owner work, branch audit, deferred downscope, PR02A/PR5/PR11 shaping,
  or loop repair.
- Duplicate/noise control-plane work advanced immediately before this trigger.
  The `duplicate-noise-20260518T120846Z` feedback action patched
  `rtc-browser-fuzz-novelty-monitor.mjs`, removed the
  empty-materialization/bootstrap rescue startup-noise cooldown bypass, bumped
  `RUN_LOCAL_NOISE_POLICY_VERSION` to `27`, cleared stale bypass state, and
  restarted the novelty monitor. Syntax checks passed for the monitor,
  supervisor, session watchdog, triage watcher, analysis tier, deep-analysis
  tier, and live-analysis monitor.
- The duplicate/noise fix is control-plane health evidence, not product
  validation. It preserved product-evidence visibility and only blocks strict
  no-product startup rescue paths.

## Branch And Ref Status

Remote status was collected at `2026-05-18T12:40:37Z`.

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

The branch-link audit was generated at `2026-05-18T12:40:42Z` from fetched
`danluu` refs. It proves only that rows marked `verified-content` exist on
`danluu` and have non-empty audited diffs against the listed bases. It does not
prove exact Cycle325/i40 publication shape, ancestry, owner evidence, or filing
readiness.

Use only these repaired audited PR13 review refs for PR13 maintainer-facing
content:

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
| PR 2A | HTTP room-isolation regression sidecar after PR2 | No verified branch link yet | TBD | TBD | evidence-only until pushed, fetched, and audited |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i40 row; aggregate PR05 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback-tail PR05D |
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
| PR 7B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | first decision-fork arm; compare against `121507` before accepting the PR07B1 base |
| PR 7B0-alt? | Restacked `121507` saved-response/persisted-CRDT hydration candidate | No verified branch link yet | TBD | TBD | first decision-fork arm; no accepted restacked ref yet |
| PR 7B1 | Save response manager/base-record owner microhead after the chosen PR07B0 arm | No verified branch link yet | TBD | TBD | not file-ready until PR07B0-current vs `121507` is decided; old holds stay comparison arms |
| PR 7B1A | Current stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | second decision-fork arm after PR07B1; not file-ready as coverage for `111430/114448` |
| PR 7B1B? | Restacked `111430/114448` reload/stale-epoch candidate | No verified branch link yet | TBD | TBD | second decision-fork arm; no ref exists while `packages/sync/src/test/manager.ts` conflicts |

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
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired verified content; use until exact PR13B0-B3 refs are published and audited |
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
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-current vs `121507` decision, the chosen PR07B1 row, or the PR07B1A vs `111430`/`114448` decision |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T12:40:37Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T120601Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw novelty monitor status at `2026-05-18T12:35:24.260Z` completed a
current pass for the current output root:

```text
coverage files: 52579
total records seen: 84345
records processed this pass: 98
unmet goals: 4
recommended groups: novelty-ws-real-user-save-reload,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text
enabled groups: novelty-http-persistence-probe
active current-run dirs: 0
current-run records by group: none
current-run likely-real visible: 0
current drain raw signatures: 5
current drain no-product raw signatures: 1
current drain raw product-evidence signatures: 4
current drain likely-real visible: 0
historical likely-real visible: 339
historical likely-real merged duplicates: 1419
historical oracle/noise questions: 47
quality issues: 0
```

Interpretation:

- The latest raw novelty read shows no current visible likely-real failures and
  no current startup summary failures, but it is not final-stack validation.
- Current and drain triage must stay separate from historical noise. Historical
  raw noise is still dominated by `pre_action_bootstrap_stall`; the current
  active scope has no visible likely-real signal, and the drain scope has five
  raw signatures with four product-evidence raw signatures preserved for
  triage/reporting.
- The duplicate/noise feedback action verified the targeted strict startup leak
  is blocked in the consumer path: `real-user-rich-text` had `candidates=0`,
  `suppressedStartup=2`, `analysisJobs=0`, `deepJobs=0`; `async-server-blocks`
  had `candidates=0`, `suppressedStartup=1`, `analysisJobs=0`, `deepJobs=0`.
- After the `12:31` policy pause, the latest novelty status has only
  `novelty-http-persistence-probe` enabled. The older trend packet below still
  saw `novelty-ws-permissions-auth-locks` because it was generated before that
  pause.
- The fuzz repo is still active validation infrastructure. It is not the final
  PR stack and cannot substitute for a rebuilt combined validation stack from
  explicit Cycle325/i40 heads.

The latest trend packet was generated at `2026-05-18T12:29:18Z`:

```text
monitor passes: 2253
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T12:19:24Z
coverage files: 272 -> 52506
coverage files delta: 52234
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3427
summary startup failures last: 0
quality issues last: 0
memory free: 411.3 GB
load averages: 73.47 / 79.51 / 76.68 on 64 cores
enabled groups current: novelty-http-persistence-probe,
  novelty-ws-permissions-auth-locks
latest fuzz level mix:
  browser-e2e=27 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5709006
browser-e2e likely-real findings: 742 over 2283.2 runner-hours
```

Latest trend unmet goals remain concentrated in save/reload and real-user
depth:

```text
reload-post-action: 1114/2000, remaining 886
title-save-reload: 569/1000, remaining 431
real-user-editing success: 609/1000, remaining 391
body-save-reload: 628/1000, remaining 372
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. CPU/load are already high; new fuzz work should stay
bounded and oracle-specific rather than adding broad browser concurrency.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T122404Z-synthesis.md`, says the split is blocked with a
required PR07 change, not a full topology rewrite. The Cycle325/i40 ready/local
and CRDT/data-loss lanes remain the right review frame, but PR07 must become a
two-stage decision fork:

1. Compare current `PR07B0` against a restacked `121507`
   saved-response/persisted-CRDT hydration candidate after `PR07A3`.
2. After the chosen `PR07B1`, compare current `PR07B1A` against a
   conflict-resolved `111430`/`114448` stale-epoch candidate, with `PR03B`,
   `HOLD-07B2`, and `HOLD-07C` as comparison arms.

Completed split feedback results:

- PR07 restack/owner-prep: `PASS`, `0` hard failures, `2` warnings; patch IDs
  differ; no restacked `111430/114448` candidate was produced because
  `packages/sync/src/test/manager.ts` still conflicts.
- Post-`120507Z` audit: `PASS`, `0` hard failures, `14` warnings; verified all
  `70` manifest rows against live heads and bundle.
- Browser PR07 owner replay remains intentionally deferred until a
  conflict-resolved PR07 candidate exists or the conflict is explicitly
  downscoped.
- The next bounded PR07 work is a decision-matrix job: restack `121507` onto
  `PR07A3`, restack `111430`/`114448` onto `PR07B1`, resolve or explicitly
  downscope the `packages/sync/src/test/manager.ts` conflict, compare patch
  IDs/range-diffs/diffstats, and only then run owner replay.
- The next deferred-freshness work is a fresh bundle/head/manifest/base-allowlist
  audit. If `122513Z` becomes nonzero, audit that; otherwise audit `121510Z`
  and explicitly mark `121507`, active `122010`, and zero-byte `122513Z` as
  uncovered or stale.

The newest duplicate/noise synthesis and feedback action,
`duplicate-noise-20260518T120846Z-synthesis.md` and
`duplicate-noise-20260518T120846Z-feedback-action.md`, identify and patch the
producer/control-plane leak in novelty scheduling:

- removed empty-materialization/bootstrap rescue startup-noise cooldown bypass;
- bumped `RUN_LOCAL_NOISE_POLICY_VERSION` to `27`;
- cleared stale `emptyMaterializationRescueCooldownBypass` state on migration;
- made rescue use `shouldBlockGroupEnableForCurrentStartupHold()` so current
  and drain no-product startup holds block fallback producers globally, not only
  exact producer matches;
- restarted `rtc-coverage-guided-novelty` on
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T120601Z`;
- left the supervisor running;
- verified post-restart state had no
  `emptyMaterializationRescueCooldownBypass` and no new
  `bootstrap-rescue-bypass-previous-startup-cooldown` changes.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, old enabled-group claims, and old "do not
add PR06B" recommendations are superseded by the repaired PR13 audit links,
the newer two-stage PR07 decision fork, PR06E/PR02A sidecar status, the
completed duplicate/noise control-plane patch, and the latest novelty/trend
evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle325/i40 manifests, current nonzero `20260518T120507Z`, `121507`, `121510Z`, active `122010Z`, zero-byte `122513Z`, current `PR07B0`, current `PR07B1A`, raw reload candidates `111430`/`114448`, deferred reload/search/rich-text diagnostics | active source family; `120507Z` is branch/bundle/manifest evidence but not complete deferred-coverage proof; `121510Z` is not full proof because `121507` completed after it; `122513Z` is not evidence while zero-byte; filing remains blocked by PR07 owner evidence, missing verified GitHub links, seed `1020002`, unresolved deferred freshness, and final validation | Run a fresh bundle/head/manifest/base-allowlist/deferred-freshness audit; if `122513Z` becomes nonzero, audit it, otherwise audit `121510Z` and explicitly mark `121507`, active `122010Z`, and zero-byte `122513Z` as uncovered or stale; then publish/fetch/audit exact GitHub links, repair or reclassify seed `1020002`, and run final-stack validation gates |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-current, PR07B0-alt/`121507`, PR07B1, PR07B1A, possible PR07B1B, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, current PR07B0, `121507`, chosen PR07B1, current PR07B1A, raw `111430/114448`, `HOLD-07B2`, `HOLD-07C`, reload diagnostics | runtime readiness has durable `repaired_ready` evidence, but setup readiness is not product proof; PR07 now has two decision forks and no accepted file-ready owner shape | Restack `121507` onto `PR07A3`; restack `111430`/`114448` onto `PR07B1`; resolve or explicitly downscope the `packages/sync/src/test/manager.ts` conflict; compare patch IDs/range-diffs/diffstats; then run owner replay across the chosen PR07B0/PR07B1 path, current PR07B1A, restacked stale-epoch candidate if produced, PR03B, HOLD-07B2, and HOLD-07C with REST/meta, `_crdt_document`, edited-record, Y.Doc/provider/awareness, UI, branch-head, and first-divergence artifacts |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-HOLD-07C non-coverage with first-divergence evidence |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the chosen PR07B0/PR07B1 path, PR07B1A, and holds before assigning any new owner row |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, chosen `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, mixed product-evidence/startup-noise lanes, empty materialization rescue, coverage recommendation fallback enables | policy `27` patch completed and restarted novelty monitor; strict startup drain dirs are suppressed and not queued/analyzed | Treat as control-plane health only; keep product-evidence representatives visible/family-capped, and validate further scheduler work with syntax checks, gate-only triage, targeted monitor restart, and startup-analysis/job checks |
| Current fuzz validation | `run-20260518T120601Z`, novelty read at `2026-05-18T12:35:24.260Z`, trend generated at `2026-05-18T12:29:18Z` | current fuzz health has `0` visible likely-real failures and `4` unmet goals, but is not final-stack validation; only `novelty-http-persistence-probe` is enabled in the latest novelty status | Accepted product evidence, owner replay, exact branch audit, seed `1020002` repair/reclassification, and final PR-stack validation are still required before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw PR07D, PR17, PR18,
PR18x, or zero-byte/stale finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle325/i40 parallel-lane shape above. Treat `20260518T120507Z` as
   current branch/bundle/manifest proof for `70` rows, but not complete
   deferred-coverage proof while the `14` deferred-freshness warnings remain.
   Do not treat `121510Z` as complete deferred proof because `121507` completed
   after it, and do not treat zero-byte `122513Z` as evidence.
2. Treat PR07 as a two-stage decision fork: first compare current `PR07B0`
   against the restacked `121507` saved-response/persisted-CRDT hydration
   candidate after `PR07A3`; then compare current `PR07B1A` against a
   conflict-resolved `111430`/`114448` stale-epoch candidate after the chosen
   `PR07B1`. Do not file the PR07 lane until conflict resolution, exact branch
   links, and owner replay choose replace/add/reorder for both forks.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Use the `105353Z` PR07 runtime `repaired_ready` evidence only as a
   precondition, not as product proof.
5. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   chosen `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old
   `HOLD-07B2 !-> PR09/PR15D`, clean PR05D only, PR15A-D after PR14B, and no
   fallback-tail PR05D.
6. Run held owner comparisons for strict projection, common-blocks, rich-text,
   search/live-collapse, and reload candidates before creating new product rows.
7. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
8. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
9. Treat duplicate/noise policy `27` and the latest novelty/trend status as
   control-plane health, not product validation or final-stack readiness.
10. After the PR07 decision fork has owner evidence, exact branch-link audit
   for missing rows, and seed `1020002` repair or reclassification land, rebuild
   the combined validation stack from explicit Cycle325/i40 heads plus accepted
   epoch work, then run focused checks, touched-file lint, branch
   graph/containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

The current useful bounded work is:

- run the PR07 decision matrix: restack `121507` onto `PR07A3`, restack
  `111430`/`114448` onto `PR07B1`, resolve or intentionally downscope the
  `packages/sync/src/test/manager.ts` conflict, and compare patch
  IDs/range-diffs/diffstats before any owner replay;
- run PR07 owner replay after conflict-resolved candidates exist, comparing the
  chosen PR07B0/PR07B1 path, current PR07B1A, restacked `111430/114448` if
  produced, PR03B, HOLD-07B2, HOLD-07C, and reload diagnostics;
- resolve the `120507Z` deferred-freshness warnings and the newer `121507`,
  active `122010Z`, and zero-byte `122513Z` coverage questions with a later
  finalization, downscope, or owner comparison;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`;
- refresh candidate/deferred status using only nonzero completed reports; never
  count `report.tmp`, setup-only, disk-preflight-only, zero-byte reports, or job
  launch alone as evidence;
- continue monitoring policy-27 novelty output and verify product-evidence
  representative preservation before making any yield or product claims.

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, raw deferred
publication, PR17, PR18, PR18x promotion, duplicate PR07 replay, or extra
browser lanes.
