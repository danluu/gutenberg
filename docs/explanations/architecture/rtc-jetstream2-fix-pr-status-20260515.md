# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T17:15:11Z`

Trigger event:
`pr-split-2026-05-18T17-14-12Z-20260518T170339Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T17-14-12Z-20260518T170339Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The split remains blocked and not fileable. The latest split-persona consensus
keeps the ready/local and CRDT lanes usable, but treats the old linear `PR07`
tail as stale. The current maintainer-facing recommendation is the
Cycle378/Cycle325-i40 parallel-lane shape:

- keep the ready/local lane;
- keep the CRDT/data-loss lane from `PR06D`;
- keep `PR02B` only as a blocked-validation sidecar after `PR02`;
- treat `PR07` as a runtime-gated decision fork, not as a linear tail;
- add `PR07B0A-155713` to the first `PR07` decision comparison.

The latest applied proof in `current-pr-split.md` is now the Cycle 378 action:

```text
runs/20260518T163556Z/jobs/outputs/rtc-cycle378-post-163628-current-finalization-audit/report.md
status=PASS, hard failures=0, warnings=55
verified: 78 push-manifest rows, 11 diagnostic-manifest rows,
          5 current-cycle supplemental rows
```

That audit verified the nonzero `20260518T163628Z` finalization report, live
heads, generated bundle heads, manifest SHAs, base allowlist checks, raw
deferred rejection, and PR02B/PR07 blocked-state gates. It is still local-host
publication input only: Jetstream did not push the audited Cycle325/i40
destinations to GitHub, and the diagnostic/harness/current-cycle rows are not
product-promotion proof.

Two Cycle 376 preflights also passed:

- `PR02B` exists as
  `refs/heads/finalized/cycle325-i40/sidecar/rtc-pr02b-http-awareness-rejoin-retry-140108`,
  is clean against PR02, and has seed `1030001` source evidence, but runtime
  setup is uninitialized and validation has not run.
- `HARNESS-RELOAD-MARKERS-154206` exists at
  `35c685bb148bf84372365e0e187d5308bd28f41f`, has replay JSON candidates for
  seeds `990001` and `990003`, and has a clean diff, but remains
  harness/diagnostic setup only.

The newest split-persona synthesis, `pr-split-20260518T170339Z-synthesis.md`,
still recommends the Cycle378/Cycle325-i40 replacement split, not the older
linear PR07 tail. It keeps the `163628` audit as the latest applied local
proof, but says the split is still blocked by unresolved PR07 owner replay,
`PR02B` validation, and a current-finalization/deferred-freshness audit. A
newer `20260518T165635Z/finalization.report.md` is now nonzero, but it still
needs a matching post-`165635` audit before it counts as durable
publish/manifest progress. `PR07B0A-155713` remains the key split candidate at
`finalized/cycle325-i40/runtime-gated/rtc-pr07b0a-saved-crdt-hydration-reconcile-155713`,
on top of `PR07B0`, and remains blocked on seed `990001` replay plus PR07 owner
adjudication. The raw `155713` full-stack output remains a hazard and must not
be pushed as a PR.

Current split recommendation:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A ready sidecar
  + PR02B blocked-validation HTTP polling awareness rejoin retry
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D (+ PR06E)

Runtime-gated PR07 decision fork:
PR07A1 -> PR07A2 -> PR07A3
then compare:
  current PR07B0
  PR07B0A-155713
  materialized 121507 / 134558 saved-response persisted-CRDT hydration,
    if distinct
  HOLD-07C
winner or additive result -> PR07B1 only if still independent
then compare:
  PR07B1A vs 111430 / 114448 / 123016 / 124525 /
  130034 / 131542 / 133049
with PR03B, HOLD-07B2, and HOLD-07C kept as comparison/hold arms

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

Do not file raw `PR07D`, raw `deferred/*`, raw diagnostic heads, raw `155713`,
fallback-tail `PR05D`, `PR17`, `PR18`, or `PR18x`. Do not treat
`PR02B`, `PR07B0A-155713`, reload-marker diagnostics, pre-save search,
rich-text suffix, post-`163628` diagnostic/harness/current-cycle rows, the
audited `163628` finalization, or the newer unaudited `165635` finalization as
product PRs until their specific replay, owner, branch-link, and validation
gates pass.

## Branch And Ref Status

Remote status was collected at `2026-05-18T17:15:06Z`.

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

The branch-link audit was generated at `2026-05-18T17:15:11Z` from fetched
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
| PR 2B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | preflight passed in Cycle 376, but validation is blocked on initialized runtime, seed `1030001`, HTTP persistence-probe, targeted PHPUnit, PR CI, and verified GitHub branch link |
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
| PR 7B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | first decision-fork arm; compare against `PR07B0A-155713`, `121507`/`134558`, and `HOLD-07C` before accepting the PR07B1 base |
| PR 7B0A-155713 | Saved-CRDT hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | key runtime-gated candidate at `finalized/cycle325-i40/runtime-gated/rtc-pr07b0a-saved-crdt-hydration-reconcile-155713`; `163628` local audit passed, but seed `990001` replay, owner adjudication, and exact verified branch link are still missing; raw `155713` full-stack ref must not be pushed |
| PR 7B0-alt? | Restacked `121507`/`134558` saved-response/persisted-CRDT hydration candidate | No verified branch link yet | TBD | TBD | first decision-fork arm; no accepted restacked ref yet |
| PR 7B1 | Save response manager/base-record owner microhead after the chosen PR07B0 arm | No verified branch link yet | TBD | TBD | not file-ready until the first PR07 decision comparison is decided |
| PR 7B1A | Current stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | second decision-fork arm after PR07B1; not file-ready as coverage for `111430/114448/123016/124525/130034/131542/133049` |
| PR 7B1B? | Restacked `111430/114448/123016/124525/130034/131542/133049` reload/stale-epoch candidate | No verified branch link yet | TBD | TBD | second decision-fork arm; `124525/130034/131542/133049` are the `056aa92f293` hold/evidence family; no accepted ref exists |

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
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0/PR07B0A/alternate decision, chosen PR07B1 row, or stale-epoch decision |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T17:15:06Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T171335Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-18T17:14:45.679Z`. This is a startup-only snapshot for a new coverage
root, not a completed novelty pass and not final-stack validation.

Current-run health:

```text
output dir: run-20260518T171335Z
monitor status: monitor started; full coverage pass pending
observed roots: 518
previous records loaded: 88304
supervisor groups file: 1
active run dirs: 1
coverage guidance: pending until first pass
triage yield: pending until first pass
health: startup status only; full novelty pass has not completed yet
```

Interpretation:

- Do not reuse the previous `run-20260518T165740Z` startup snapshot or earlier
  full-pass numbers as current status for this root. The latest raw status has
  not yet produced unmet-goal,
  harness-work, quality, signature, likely-real, or duplicate-share numbers.
- The new startup snapshot is health/control-plane evidence only. It does not
  clear PR filing, final-stack validation, PR02B validation, PR07 owner replay,
  reload-marker replay, or seed `1020002`.
- Historical `pre_action_bootstrap_stall` and other startup/no-product noise
  must not be presented as current product failure.
- The latest duplicate/noise remediation remains relevant. The newest
  duplicate-noise synthesis file, `duplicate-noise-20260518T165312Z-synthesis.md`,
  is nonzero and still frames the issue as control-plane producer selection:
  historical startup-noise state must not become a current fleet-wide producer
  hold, and live analysis must not run normal sessions for no-analysis
  startup/noise drains without product evidence.

The latest trend evidence packet was generated at `2026-05-18T17:07:57Z`:

```text
monitor passes: 2276
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T17:05:44Z
coverage files: 272 -> 54288
coverage files delta: 54016
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3418
summary startup failures last: 0
quality issues last: 0
memory free: 428.5 GB
load averages: 28.89 / 35.57 / 54.59 on 64 cores
latest fuzz level mix:
  browser-e2e=28 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5817505
browser-e2e likely-real findings: 766 over 2426.2 runner-hours
```

The largest unmet goals remain save/reload and real-user depth:

```text
reload-post-action: 1134/2000
title-save-reload: 587/1000
real-user-editing success: 612/1000
body-save-reload: 646/1000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. Recent load is lower than the previous snapshot, but
new fuzz work should stay bounded and oracle-specific rather than adding broad
browser concurrency.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T170339Z-synthesis.md`, says the report still needs the
Cycle378/Cycle325-i40 replacement split, not the older linear PR07 tail. The
split is not fileable and not ready for broad final-stack fuzzing because
`PR07` owner replay, `PR02B` validation, and the current
finalization/deferred-freshness audit remain unresolved. The synthesis says
`20260518T165635Z/finalization.report.md` is now nonzero, but still unaudited;
do not count it as durable publish/manifest progress until a post-`165635`
audit passes.

The active split shape remains:

1. Keep `PR02B` as a blocked-validation sidecar after `PR02`. Cycle 376
   preflight proved branch/source readiness, but not runtime validation.
2. Run `PR07A1 -> PR07A2 -> PR07A3`, then compare current `PR07B0`,
   `PR07B0A-155713`, materialized `121507`/`134558` saved-response
   persisted-CRDT hydration if distinct, and `HOLD-07C`.
3. Move to `PR07B1` only if the winning or additive `PR07B0` result is still
   independent.
4. Then compare current `PR07B1A` against
   `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`.
5. Keep `PR03B`, `HOLD-07B2`, and `HOLD-07C` as comparison/hold arms.
6. Keep raw `PR07D`, raw deferred heads, `PR17`, `PR18`, `PR18x`, broad
   reload-hydration publication, and fallback-tail `PR05D` out of the filing
   plan.

The latest applied action in `current-pr-split.md` is still Cycle 378. Its
bounded `20260518T163628Z` audit completed with `status=PASS`, `0` hard
failures, and `55` warnings after fixing a local status-allowlist bug in the
audit script. It verified the nonzero finalization report, live heads, bundle
heads, manifest SHAs, base allowlist, raw deferred rejection, and split
blocked-state gates. Treat it as the current local-host Parallel Progress Gate
proof, not as GitHub publication, product-promotion proof, final-stack
validation, or coverage for later deferred outputs. The newer `165635`
finalization changes freshness status only after the requested post-`165635`
audit passes.

The next useful work is bounded, not broad:

- run `rtc-cycle380-post-165635-current-finalization-audit` against
  `/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/cycles/20260518T165635Z`,
  with freshness checks for deferred `164740`, `164742`, `165245`, and the
  completed `170248` reload-hydration report; do not count `170250` yet because
  it has no final report;
- replay `PR07C` from repaired runtime `http://localhost:12201` with same-user
  seeds `5200011`, `5200017`, `5200010` and late-join seeds `7110004`,
  `7110017`;
- run the `PR07B0A-155713` owner matrix on seed `990001`, plus
  `5200001`/`5200002`/`5200005`/`1130001` if no active job already owns them;
- run `PR02B` seed `1030001`, HTTP persistence-probe, and targeted PHPUnit
  once runtime/bootstrap is available;
- keep broad final-stack fuzzing, filing, and stack validation blocked.

Loop repair remains part of the status: feedback cycles with actionable
Parallel Progress Gate rows must create or verify a nonzero independent
artifact. Active sessions, seed `1020002`, zero-byte reports, `report.tmp`,
disk-preflight-only output, stale manifests, fallback-tail PR05D manifests, and
ownerless strict-expansion reductions must not count as progress.

The newest duplicate/noise synthesis file,
`duplicate-noise-20260518T165312Z-synthesis.md`, is nonzero. It identifies the
same producer-side scheduler problem: no-product strict startup noise is mostly
filtered by triage/analysis consumers, but historical/fleet startup-noise state
can still block normal producer selection, fall back to a startup-noise canary,
and either repeat duplicate `reload_rejoin_awareness_stall` noise or starve
with no current dirs. It also calls out `rtc-browser-fuzz-live-analysis-monitor.mjs`
as a secondary place to guard no-analysis startup/noise drains.

The matching feedback-action file records a completed bounded remediation in
`rtc-browser-fuzz-novelty-monitor.mjs`: a fleet-wide no-product
`pre_action_bootstrap_stall` hold, preserved product-evidence metadata on
reused startup-noise pauses, a single canary escape hatch, and a clamped
coverage-guided browser lane floor. `node --check` passed. Validation showed
the product-evidence canary stayed visible to triage before being paused as an
already-represented duplicate, the historical strict no-product startup run
queued zero signatures with stale guard disabled, and analysis/deep/live
monitors refused the stale strict-startup root under the current-output guard.

The duplicate/noise remediation restarted the coverage-guided novelty monitor,
supervisor, watchdog, and live-analysis monitor on `run-20260518T164603Z`.
Current raw status has since advanced to `run-20260518T171335Z`, but only a
startup-only novelty snapshot exists for that root. Use the completed
remediation as control-plane evidence and the latest startup snapshot as health
evidence only, not product validation or final-stack readiness.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance, and
old PR13 GitHub-ref caveats are superseded by the current branch-link audit,
the Cycle378/Cycle325-i40 split shape, the repaired PR13 review refs, and the
latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle325/i40 manifests, audited nonzero `20260518T130525Z`, `133533Z`, Cycle 368 `135539Z`, audited `143551Z`, `145558Z`, `150601Z`, `152607Z`, `153610Z`, `160619Z`, and `163628Z`, later `164632`, completed deferred `164740` reload and `164742` pre-save reports, `165245`, nonzero but unaudited `165635`, completed harness-only `170248` reload-hydration report, no-report `170250`, `HARNESS-RELOAD-MARKERS-154206`, `HARNESS-RELOAD-REPLAY-163231`, `PR07B0A-155713`, `121507`, `134558`, `123016`, `123520`, current `PR07B0`, current `PR07B1A`, raw reload/stale-epoch candidates `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`, deferred reload/search/rich-text diagnostics | active source family; `163628` is the latest applied audited local-host proof with `55` warnings, not GitHub publication or product-promotion proof; `165635` is nonzero but still needs a post-`165635` audit; `164742` stays merged into `DIAG-SEARCH-142622`, `165245` stays covered by `HARNESS-RICH-TEXT-152154`, and `164740`/`170248` are harness/diagnostic only until replay proves a product-owned first-loss boundary; `170250` is not review evidence without a report; filing remains blocked by PR07 owner evidence, missing verified GitHub links, seed `1020002`, PR02B validation, reload-marker replay/downscope, and final validation | Audit current finalization/deferred freshness, replay `PR07B0A-155713`, run PR02B validation and PR07 owner matrix, publish/fetch/audit exact GitHub links, repair or reclassify seed `1020002`, and run final-stack validation gates |
| Missing verified product refs | PR02A, PR02B, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-current, PR07B0A-155713, PR07B0-alt/`121507`/`134558`, PR07B1, PR07B1A, possible PR07B1B including `124525`/`130034`/`131542`/`133049`, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | recommended sidecar; Cycle 376 preflight passed branch/source checks, but runtime is uninitialized and validation has not run | Initialize runtime, run seed `1030001`, short HTTP persistence-probe, targeted PHPUnit after bootstrap is available, PR CI, and exact branch-link audit |
| PR07 runtime / owner gate | PR07A1-A3, current PR07B0, `PR07B0A-155713`, `121507`/`134558`, chosen PR07B1, current PR07B1A, raw `111430/114448/123016/124525/130034/131542/133049`, `HOLD-07B2`, `HOLD-07C`, reload/provider rejoin evidence `5817434bb6cf` / seed `1100001` | runtime readiness has durable repaired-ready evidence and `163628` local audit proof, but product ownership is unresolved; PR07 now has two decision comparisons and no accepted file-ready owner shape | Replay `PR07B0A-155713` on seed `990001`, run owner matrix, and require clean materialized refs with `git diff --check`, owner snapshots, durable REST/meta, `_crdt_document`, edited-record, provider/awareness, UI collaborator, branch-head, and first-divergence evidence |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-HOLD-07C non-coverage with first-divergence evidence |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates, rich-text `142117` harness/setup hardening | diagnostic or held until owner comparison proves product ownership; strict owner comparison assigns no `PR18x` yet | Compare against PR05B, PR05C, clean PR05D, the chosen PR07B0/PR07B1 path, PR07B1A, and holds before assigning any new owner row |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, chosen `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Reload marker/lifecycle work | `HARNESS-RELOAD-MARKERS-154206`, `HARNESS-RELOAD-REPLAY-163231`, seeds `990001`/`990003`, same-user lifecycle seeds `5200001`/`5200002`/`5200005`/`1130001`, PR07C seeds `5200011`/`5200017`/`5200010` and `7110004`/`7110017`, completed `170248`, no-report `170250` | preflight passed for marker branch and replay JSON candidates; product ownership not established; `164740` and `170248` reload reports are harness/diagnostic only until replay proves product ownership; `170250` is not evidence | Run focused marker/reload replay and PR07 owner replay; require product-owned first-loss boundary before promotion |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, startup-noise cooldowns, empty materialization rescue, fallback enablement, current no-analysis drains, ordinary fallback rotation, bounded canary policy | completed consumer layers and novelty scheduler remediation exist; `node --check` passed for the applied `162155` remediation; `165312` synthesis is nonzero and reinforces the scheduler/canary/live-analysis guard problem; latest raw novelty status is only startup for `run-20260518T171335Z` | Wait for a full novelty pass or choose a fresh bounded canary only if it is outside startup-noise and duplicate-family cooldowns; confirm no ordinary no-product materialization rescue while startup holds are active and product-evidence signatures remain launchable |
| Current fuzz validation | `run-20260518T171335Z`, raw novelty status at `2026-05-18T17:14:45.679Z`, trend generated at `2026-05-18T17:07:57Z` | startup-only novelty snapshot: `518` observed roots, `88304` previous records loaded, `1` supervisor groups file, `1` active run dir, coverage guidance and triage yield pending; trend shows `54016` coverage-file delta, `4` unmet goals, current duplicate share `0`, `0` quality issues, lower recent load, and browser-heavy confirmed findings | Use as current health/control-plane evidence only; wait for full novelty pass and still require accepted product evidence, owner replay, exact branch audit, PR02B validation, reload-marker replay/downscope, seed `1020002` repair/reclassification, and final PR-stack validation before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw `155713`, raw PR07D,
PR17, PR18, PR18x, or stale/unaudited finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement Cycle378/Cycle325-i40 parallel-lane shape above, including
   `PR02B` as a blocked-validation sidecar after PR02 and `PR07B0A-155713` as
   a blocked PR07 decision-fork candidate.
2. Treat the Cycle 378 post-`163628` audit as current applied local-host proof,
   but not complete filing proof, GitHub-publication proof, product-promotion
   proof, final-stack validation, or evidence for the newer `164632`/`164740`/
   `164742`/`165245`/`170248` deferred-freshness set. Treat nonzero `165635`
   as unaudited until a post-`165635` audit passes, and treat `170250` as
   non-evidence until it has a report.
3. Do not file `PR02B` before seed `1030001`, HTTP persistence-probe, targeted
   PHPUnit, PR CI, and verified GitHub branch-link audit pass.
4. Do not file PR07 until the `PR07B0` / `PR07B0A-155713` / `121507`-`134558` /
   `HOLD-07C` comparison and the `PR07B1A` / stale-epoch comparison are both
   resolved with clean materialized refs, exact branch links, `git diff --check`,
   and owner replay evidence.
5. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
6. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   chosen `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old
   `HOLD-07B2 !-> PR09/PR15D`, clean PR05D only, PR15A-D after PR14B, and no
   fallback-tail PR05D.
7. Run held owner comparisons for strict projection, common-blocks, rich-text,
   search/live-collapse, and reload candidates before creating new product rows.
8. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
9. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
10. Treat duplicate/noise policy work, novelty scheduler changes, the
   startup-only `run-20260518T171335Z` novelty status, and the latest trend
   status as control-plane health, not product validation or final-stack
   readiness.
11. After PR07 decision-fork owner evidence, exact branch-link audit for
   missing rows, PR02B validation, post-`165635` finalization/deferred-freshness
   audit, reload-marker replay/downscope, and seed `1020002` repair or
   reclassification land, rebuild the combined validation stack from explicit
   Cycle325/i40 heads plus accepted epoch work, then run focused checks,
   touched-file lint, branch graph/containment evidence, adjacent
   range-diffs/diffstats/numstats, `git diff --check`, feasible runtime checks,
   and fresh stack-wide validation.

Useful bounded work now:

- run `rtc-cycle380-post-165635-current-finalization-audit` against
  `/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/cycles/20260518T165635Z`,
  including freshness checks for deferred `164740`, `164742`, `165245`, and
  completed `170248`; do not count `170250` without a final report;
- run PR07C owner replay from repaired runtime `http://localhost:12201` with
  same-user seeds `5200011`, `5200017`, `5200010` and late-join seeds
  `7110004`, `7110017`;
- run the `PR07B0A-155713` owner-matrix replay on seed `990001`, plus
  `5200001`/`5200002`/`5200005`/`1130001` if no active job already owns them;
- run `rtc-cycle378-pr02b-validation-1030001-http-persistence-probe` once
  runtime/bootstrap exists;
- enforce the loop-repair rule that actionable status cycles must create or
  verify a nonzero independent artifact;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`;
- wait for a full novelty pass on `run-20260518T171335Z`, then monitor
  duplicate/noise saturation/canary behavior and only try a fresh bounded
  canary if it avoids the startup-noise and duplicate-family cooldowns.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw PR07D, raw deferred publication, PR17, PR18, PR18x promotion,
reload-marker product promotion before replay, or extra browser lanes.
