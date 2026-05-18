# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T14:40:07Z`

Trigger event:
`pr-split-2026-05-18T14-38-40Z-20260518T142714Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T14-38-40Z-20260518T142714Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Cycle 368 is the latest applied split-feedback action in `current-pr-split.md`,
and the newest split-persona synthesis
(`pr-split-20260518T142714Z-synthesis.md`) recommends replacing the prior report
shape with a `PR02B` sidecar plus a stricter PR07 decision fork. The ready/local
and CRDT/data-loss lanes remain usable, but the split is still not fileable:
final-stack fuzzing, GitHub filing, and stack-wide validation are blocked by
seed `1020002`, missing verified branch links, and PR07 ownership gaps.

`PR02B` is now part of the recommended split. It is the HTTP polling awareness
rejoin retry for seed `1030001` from `20260518T140108Z`, not PR07 reload
hydration. The live `20260518T142548Z` finalization now contains it, but it still
needs a post-finalization bundle/manifest/freshness audit and seed `1030001`
replay before filing.

The old linear PR07 tail remains rejected. First compare current `PR07B0` with
the `121507`/`134558` saved-response/persisted-CRDT hydration candidate family;
then, only after the chosen or additive `PR07B1`, compare current `PR07B1A` with
the collapsed stale sync-manager/entity-epoch family
`111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`. Current
`PR07B1A` still must not be claimed to cover that family. The Cycle 368 PR07
restack summary is not enough: the latest synthesis says `restack-probe.tsv`
reports clean, but apply logs still contain "with conflicts" in
`packages/core-data/src/actions.js` and `packages/sync/src/test/manager.ts`.
Require `git ls-files -u` empty, no conflict markers, `git diff --check`,
materialized refs, and owner replay snapshots before accepting a PR07 branch
shape. `5817434bb6cf` / seed `1100001` remains separate reload/provider rejoin
awareness evidence, not coverage from the stale sync-manager epoch guard.

The current maintainer-facing split recommendation is:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A HTTP room-isolation sidecar
  + PR02B HTTP polling awareness rejoin retry, blocked validation
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D (+ PR06E)

Runtime-gated PR07 decision fork:
PR07A1 -> PR07A2 -> PR07A3
then fork:
  current PR07B0
  vs conflict-resolved 121507 / 134558 saved-response/persisted-CRDT hydration
winner or additive result -> PR07B1 only if still independent
then fork:
  current PR07B1A
  vs collapsed stale sync-manager / entity-epoch family:
     111430 / 114448 / 123016 / 124525 / 130034 / 131542 / 133049
comparison arms:
  PR03B, HOLD-07B2, HOLD-07C

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

Current blockers and status changes:

- PR02B is recommended but not file-ready. It has no verified GitHub branch link
  yet, needs the `142548Z` post-finalization audit, and must replay seed
  `1030001` before becoming a maintainer-facing PR row.
- PR07 is blocked on ownership and is not file-ready. The PR07C browser-env
  repair should be considered terminal/resolved for readiness, but that only
  removes a setup blocker; it is not product proof. The next PR07 job must
  materialize conflict-free candidate refs before owner replay.
- `PR07B1A` is still not proven to cover the newer stale-epoch family. Current
  `PR07B1A` is still `9964238035d698b2ca22e0ece2cf09de0cb00b07`; the newer
  `124525`/`130034`/`131542`/`133049` evidence is the same `056aa92f293` stale
  sync-manager/entity-epoch family. That family is comparison or hold evidence
  only until it is restacked, conflict-resolved, materialized, and owner-replayed.
- Raw `PR07D` and raw reload-hydration publication remain rejected unless the
  PR07B/PR07C ownership audit proves a distinct delta. `PR18x` is rejected by
  the Cycle 368 strict owner comparison against `PR05B`, `PR05C`, and clean
  `PR05D`; rich-text `142117` is harness/setup hardening only, not product
  rich-text coverage.
- Seed `1020002` remains a blocker only for final-stack fuzzing, GitHub filing,
  rebuilt stack-wide validation, and its own repair or reclassification. It must
  not serialize independent PR02B audit, ready/local work, CRDT-lane work, PR07
  materialization/owner work, branch audit, deferred downscope, strict owner
  checks, or loop repair.
- Duplicate/noise control-plane work has policy `28` as the latest completed
  remediation, but the newest duplicate-noise synthesis
  (`duplicate-noise-20260518T141322Z-synthesis.md`) says browser producer
  scheduling still burns capacity on current no-product startup-noise sentinels.
  Patch novelty-monitor materialization/refill/fallback/recommended-group
  enables first, while preserving product-evidence signatures. Treat
  duplicate/noise status as control-plane health, not product validation.

## Branch And Ref Status

Remote status was collected at `2026-05-18T14:40:02Z`.

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

The branch-link audit was generated at `2026-05-18T14:40:07Z` from fetched
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
| PR 2B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | live `142548Z` finalization contains this seed `1030001` sidecar; blocked on post-finalization audit and replay |
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
| PR 7B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | first decision-fork arm; compare against `121507`/`134558` before accepting the PR07B1 base |
| PR 7B0-alt? | Restacked `121507`/`134558` saved-response/persisted-CRDT hydration candidate | No verified branch link yet | TBD | TBD | first decision-fork arm; no accepted restacked ref yet |
| PR 7B1 | Save response manager/base-record owner microhead after the chosen PR07B0 arm | No verified branch link yet | TBD | TBD | not file-ready until PR07B0-current vs `121507`/`134558` is decided; old holds stay comparison arms |
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
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-current vs `121507`/`134558` decision, the chosen PR07B1 row, or the PR07B1A vs `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049` decision |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T14:40:02Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T143428Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The latest raw novelty monitor status at `2026-05-18T14:35:37.206Z` is
startup-only for the new output root:

```text
status: monitor started; full coverage pass pending
observed roots: 492
previous records loaded: 86083
supervisor groups file: 1
active run dirs: 1
coverage guidance: pending until first pass
triage yield: pending until first pass
health warning: startup status only; full novelty pass has not completed yet
```

Interpretation:

- The latest raw novelty read is not a completed monitor pass. It must not be
  used as health proof, product proof, or final-stack validation.
- The startup read only proves the new run root exists, the monitor loaded
  previous state, the supervisor groups file exists, one run directory is
  active, and the first full pass is pending. It does not yet prove steady-state
  health or triage yield.
- Current-run, current-drain, and historical triage must stay separate. The
  last completed full pass is the `14:26:06Z` pass represented in the trend
  packet below, not the startup-only `14:35:37Z` raw read.
- Policy `28` remains the latest completed duplicate/noise remediation, but the
  newest duplicate-noise synthesis says producer scheduling still refills or
  materializes browser groups while current no-product startup-noise holds are
  active. The latest raw novelty read is still a fresh startup snapshot, not
  steady-state proof.
- The fuzz repo is still active validation infrastructure. It is not the final
  PR stack and cannot substitute for a rebuilt combined validation stack from
  explicit Cycle325/i40 heads.

The latest trend packet was generated at `2026-05-18T14:32:54Z`:

```text
monitor passes: 2262
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T14:26:06Z
coverage files: 272 -> 53319
coverage files delta: 53047
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3423
summary startup failures last: 0
quality issues last: 0
memory free: 413.5 GB
load averages: 77.95 / 73.39 / 71.14 on 64 cores
enabled groups current at trend time:
  novelty-ws-async-server-blocks, novelty-ws-permissions-auth-locks
latest fuzz level mix:
  browser-e2e=27 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5757455
browser-e2e likely-real findings: 747 over 2342.6 runner-hours
```

Latest trend unmet goals remain concentrated in save/reload and real-user
depth:

```text
reload-post-action: 1118/2000, remaining 882
title-save-reload: 573/1000, remaining 427
real-user-editing success: 611/1000, remaining 389
body-save-reload: 632/1000, remaining 368
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. The trend packet's completed-pass metrics come from
`14:26:06Z`; treat them as last-pass evidence and the latest raw novelty status
as startup-only/pending. CPU/load remain high; new fuzz work should stay
bounded and oracle-specific rather than adding broad browser concurrency.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T142714Z-synthesis.md`, says the six reports require a split
change. The Cycle325/i40 ready/local and CRDT/data-loss lanes remain usable, but
the maintainer-facing recommendation should now include `PR02B` and keep PR07 as
a runtime-gated decision fork:

1. Add `PR02B` after PR02 for HTTP polling awareness rejoin retry from
   `20260518T140108Z`. It is present in the live `20260518T142548Z`
   finalization, but is blocked on post-finalization audit and seed `1030001`
   replay before filing.
2. Compare current `PR07B0` against the `121507` / `134558`
   saved-response/persisted-CRDT hydration candidate family after `PR07A3`.
3. After the chosen or additive `PR07B1`, compare current `PR07B1A` against a
   conflict-resolved
   `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049` stale-epoch
   candidate, with `PR03B`, `HOLD-07B2`, and `HOLD-07C` as comparison arms.
4. Keep `5817434bb6cf` / seed `1100001` as distinct reload/provider rejoin
   awareness evidence until focused deep triage with room, provider, and
   awareness snapshots proves its owner.

Completed or newly interpreted split feedback:

- Cycle 368 is the latest applied split-feedback action in `current-pr-split.md`.
  Its current Parallel Progress Gate artifacts are the post-`135539Z` audit, the
  strict `67cd59` PR05 owner comparison, and the PR07 decision-fork report with
  `restack-probe.tsv` and owner-replay tables.
- The latest synthesis warns that the Cycle 368 PR07 restack summary overstates
  cleanliness: `restack-probe.tsv` says clean, but apply logs still contain
  "with conflicts" in `packages/core-data/src/actions.js` and
  `packages/sync/src/test/manager.ts`. Treat PR07 as unresolved until a new job
  proves `git ls-files -u` empty, no conflict markers, `git diff --check`,
  materialized refs, and owner replay snapshots.
- Cycle 368 strict owner comparison against `PR05B`, `PR05C`, and clean `PR05D`
  passed and assigned no `PR18x`. Clean `PR05D` remains only
  `27c6e7924217038ed9b4ff71585e8041c67765a4`; fallback-tail PR05D manifests
  based on `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or PR15
  tails remain invalid.
- `PR07C` browser-env repair should be marked terminal/resolved for readiness;
  the next work is owner replay and branch adjudication, not another readiness
  repair loop.
- Rich-text `142117` is harness/setup hardening only, not product rich-text
  coverage. Pre-save search and rich-text suffix diagnostics remain held until
  focused replay proves an owner.
- Loop progress rules still need enforcement: active sessions, zero-byte reports,
  `report.tmp`, stderr-only output, disk-preflight-only output, active
  `1020002`, stale manifests, and manifest-only output are no progress while the
  Parallel Progress Gate has actionable rows.

The latest duplicate/noise persona report,
`duplicate-noise-20260518T141322Z-synthesis.md`, says the remaining leak is
producer/control-plane scheduling, not downstream analysis. Strict no-product
`pre_action_bootstrap_stall` is mostly suppressed by consumers, but browser
producer policy still materializes, refills, or recommends groups after current
startup-noise `no-analysis.json` sentinels exist. The latest feedback-action
file, `duplicate-noise-20260518T141322Z-feedback-action.md`, is zero bytes, so
there is no completed new code remediation from that cycle.

Smallest safe duplicate/noise fix:

- add pass-local detection for active current-output no-product startup-noise
  holds/sentinels in `rtc-browser-fuzz-novelty-monitor.mjs`;
- thread that hold through `applyPolicy` so lane-floor rescue, materialization
  refill, productive fallback, and recommended-group enable paths do not launch
  replacement browser groups merely to satisfy `MIN_ENABLED_BROWSER_LANES`;
- tighten producer pause/reason handling for current
  `startup-noise/pre_action_bootstrap_stall` producers while preserving product
  evidence signatures such as `persisted_content_mismatch` and
  `reload_rejoin_awareness_stall`;
- validate with `node --check`, then run a one-shot live-analysis/triage refresh
  and restart only the relevant control-plane JS sessions. Supervisor mixed-run
  pause thresholds are a follow-up only if noisy mixed producers remain.

The completed duplicate/noise feedback action,
`duplicate-noise-20260518T133351Z-feedback-action.md`, remains the latest
applied scheduler remediation:

- consensus root cause is still producer/control-plane churn, not current
  Codex-analysis leakage;
- novelty policy is now `28`;
- strict startup/noProductOnly no-analysis drains are gate-only and do not
  launch live analysis;
- product-evidence drain promotion is capped to one semantic family at a time;
- empty-materialization/bootstrap rescue bypasses for `triage-duplicate-noise`
  were removed;
- active plus current no-analysis drain duplicate/noise evidence now steers
  scheduling;
- no-product startup cooldown inheritance is preserved across real-user sibling
  groups unless the target has current product evidence.

The `133351Z` feedback action passed `node --check` for novelty, live-analysis,
triage watcher, analysis tier, deep-analysis tier, supervisor, and session
watchdog. Static checks confirmed the executable bypass/raw-count patterns were
removed. A gate-only startup drain check produced `candidates=0`,
`suppressedStartup=2`, `signatures=0`, and `active=0`. A live-analysis one-shot
skipped `novelty-ws-multi-reload-lifecycle` as
`skipped-analysis-gate-only-drain`, while the product-evidence-capable
`novelty-http-persistence-probe` remained visible and later family-capped.
Novelty, supervisor, and analysis were restarted on `run-20260518T135142Z`.
Remaining risk: the latest raw novelty root is now `run-20260518T143428Z` and
is startup-only; full steady-state duplicate-share metrics and the
producer-scheduling fix above are still pending. Product-evidence duplicates
remain visible by design for one representative.

The earlier `duplicate-noise-20260518T120846Z` and
`duplicate-noise-20260518T124635Z` feedback actions still count as completed
control-plane layers: policy `27` removed the empty-materialization/bootstrap
rescue startup-noise cooldown bypass, and `124635Z` added current-scope
accounting plus supervisor startup-stall pause behavior. Those layers are
superseded by policy `28` for current readiness claims.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, old enabled-group claims, and old "do not
add PR06B" recommendations are superseded by the repaired PR13 audit links,
the newer two-stage PR07 decision fork with the
`121507`/`134558` hydration arm and the
`124525`/`130034`/`131542`/`133049` stale-epoch comparison arm, PR06E/PR02A
sidecar status plus the new PR02B sidecar, the policy `28` duplicate/noise
remediation plus the newest producer-scheduling follow-up, the completed Cycle
368 artifacts, the live `142548Z` PR02B finalization note, the Cycle 370
next-job recommendations, and the latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle325/i40 manifests, audited nonzero `20260518T130525Z`, now-nonzero `20260518T132530Z`, audited nonzero `20260518T133533Z`, Cycle 368 artifacts for `20260518T135539Z`, zero-byte/no-evidence `20260518T140542Z`, live `20260518T142548Z` finalization containing PR02B, `121507`, `134558`, `123016`, `123520`, current `PR07B0`, current `PR07B1A`, raw reload/stale-epoch candidates `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`, deferred reload/search/rich-text diagnostics | active source family; `130525Z`, `133533Z`, and Cycle 368 artifacts are branch/bundle/manifest evidence but not complete deferred-coverage proof; `142548Z` adds PR02B evidence but still needs post-finalization audit and seed `1030001` replay; `140542Z` remains rejected while zero-byte/no-evidence; filing remains blocked by PR07 owner evidence, missing verified GitHub links, seed `1020002`, unresolved deferred freshness, and final validation | Run `rtc-cycle370-post-142548-pr02b-bundle-manifest-audit`; run bounded PR07 materialization/adjudication for `121507`/`134558` and the `056aa92f293` family including `133049`; resolve deferred freshness through later finalization, downscope, or focused replay; then publish/fetch/audit exact GitHub links, repair or reclassify seed `1020002`, and run final-stack validation gates |
| Missing verified product refs | PR02A, PR02B, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-current, PR07B0-alt/`121507`/`134558`, PR07B1, PR07B1A, possible PR07B1B including `124525`/`130034`/`131542`/`133049`, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, current PR07B0, `121507`/`134558`, chosen PR07B1, current PR07B1A, raw `111430/114448/123016/124525/130034/131542/133049`, `HOLD-07B2`, `HOLD-07C`, reload/provider rejoin evidence `5817434bb6cf` / seed `1100001` | runtime readiness has durable `repaired_ready` evidence and PR07C readiness repair is terminal/resolved, but setup readiness is not product proof; PR07 now has two decision forks and no accepted file-ready owner shape; latest synthesis says apply logs still show conflicts despite a clean restack summary; the `056aa92f293` family is comparison/hold evidence only; `5817434bb6cf` / seed `1100001` is separate provider-rejoin awareness evidence | Run `rtc-cycle370-pr07-conflict-resolve-materialize-owner-replay`; require `git ls-files -u` empty, no conflict markers, `git diff --check`, materialized refs, and owner replay snapshots; deep-triage `5817434bb6cf` / seed `1100001` with room/provider/awareness snapshots; compare patch IDs/range-diffs/diffstats before assigning any PR07 owner |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-HOLD-07C non-coverage with first-divergence evidence |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates, rich-text `142117` harness/setup hardening | diagnostic or held until owner comparison proves product ownership; Cycle 368 strict owner comparison assigned no `PR18x` | Compare against PR05B, PR05C, clean PR05D, the chosen PR07B0/PR07B1 path, PR07B1A, and holds before assigning any new owner row |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, chosen `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, mixed product-evidence/startup-noise lanes, empty materialization rescue, coverage recommendation fallback enables, historical cooldown reuse, current no-analysis drains, producer-local duplicate/noise holds | policy `28` remediation completed; latest duplicate-noise synthesis says the remaining loop is browser producer scheduling after current no-product startup-noise sentinels; novelty/supervisor/analysis restarted on `run-20260518T135142Z`; latest raw novelty root is `run-20260518T143428Z`; full steady-state duplicate-share metrics are still pending | Treat as control-plane health only; patch current-output startup-noise hold detection through materialization/refill/fallback/recommended-group enables; keep strict startup/noProductOnly drains gate-only, preserve one product-evidence representative per semantic family/tier, and do not convert scheduler health into product validation |
| Current fuzz validation | `run-20260518T143428Z`, startup-only novelty read at `2026-05-18T14:35:37.206Z`, trend generated at `2026-05-18T14:32:54Z` from last completed pass at `2026-05-18T14:26:06Z` | latest raw novelty status is startup-only with full pass pending; last completed-pass trend still has `4` unmet goals, `0` current duplicate share, `novelty-ws-async-server-blocks` and `novelty-ws-permissions-auth-locks` enabled at trend time, and no final-stack validation claim | Accepted product evidence, owner replay, exact branch audit, seed `1020002` repair/reclassification, and final PR-stack validation are still required before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw PR07D, PR17, PR18,
PR18x, or zero-byte/stale finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement Cycle325/i40 parallel-lane shape above, now including
   PR02B as a sidecar after PR02. Treat the Cycle 368 artifacts as current
   Parallel Progress Gate proof, but not complete filing proof. Treat the live
   `20260518T142548Z` finalization as PR02B evidence that still needs a
   post-finalization bundle/manifest/freshness audit, local-publish currentness
   check, raw deferred rejection, and seed `1030001` replay. Continue rejecting
   zero-byte/no-evidence `20260518T140542Z` as progress.
2. Treat PR07 as a two-stage decision fork: first compare current `PR07B0`
   against the restacked `121507`/`134558` saved-response/persisted-CRDT hydration
   candidate after `PR07A3`; then compare current `PR07B1A` against a
   conflict-resolved
   `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`
   stale-epoch candidate after the chosen `PR07B1`. Do not file the PR07 lane
   until conflict resolution, exact branch links, materialized refs,
   `git diff --check`, and owner replay choose replace/add/reorder for both
   forks.
   Treat `5817434bb6cf` / seed `1100001` as separate reload/provider rejoin
   awareness evidence, not coverage from `PR07B1A`.
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
9. Treat duplicate/noise policy `28`, the completed `133351Z` remediation, the
   latest `141322Z` duplicate-noise synthesis, and the latest novelty/trend
   status as control-plane health, not product validation or final-stack
   readiness. Full steady-state duplicate-share metrics and the producer
   scheduling fix are still pending.
10. After the PR07 decision fork has owner evidence, exact branch-link audit
   for missing rows, and seed `1020002` repair or reclassification land, rebuild
   the combined validation stack from explicit Cycle325/i40 heads plus accepted
   epoch work, then run focused checks, touched-file lint, branch
   graph/containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

The current useful bounded work is:

- run `rtc-cycle370-post-142548-pr02b-bundle-manifest-audit`: verify the
  nonzero finalization report, bundle/head/manifest agreement, base allowlist,
  deferred freshness, PR02B source freshness over `140108`, local-publish
  currentness, and raw deferred rejection;
- run `rtc-cycle370-pr07-conflict-resolve-materialize-owner-replay`: resolve the
  `121507`/`134558` and `056aa92f293` decision-fork material, require
  `git ls-files -u` empty, no conflict markers, `git diff --check`,
  materialized refs, and only then owner replay snapshots;
- replay seed `1030001` on audited PR02B and run a short HTTP persistence-probe
  shard after the PR02B branch audit succeeds;
- run PR07 owner replay after conflict-free materialized candidates exist,
  comparing the chosen PR07B0/PR07B1 path, current PR07B1A, restacked
  `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049` if produced,
  PR03B, HOLD-07B2, HOLD-07C, and reload diagnostics;
- run focused deep triage for `5817434bb6cf` / seed `1100001` with
  room/provider/awareness snapshots before assigning ownership;
- keep the Cycle 368 strict parser-transform `67cd59` PR05 owner comparison as
  current evidence that assigns no `PR18x`;
- resolve the remaining deferred-freshness warnings, including blocked
  `134558Z`, post-finalization pre-save search and rich-text reports,
  still-open stale-epoch/reload coverage/downscope, zero-byte/no-evidence
  `140542Z`, and live `142548Z` PR02B audit requirements, with later
  finalization, downscope, or owner comparison;
- keep the completed strict parser/linebreak/rich-text owner comparison against
  PR05B, PR05C, and clean PR05D as current evidence;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`;
- refresh candidate/deferred status using only nonzero completed reports; never
  count `report.tmp`, setup-only, disk-preflight-only, zero-byte reports, or job
  launch alone as evidence;
- repair/enforce loop behavior so wait-only feedback, active sessions,
  `report.tmp`, zero-byte reports, disk-preflight-only output, job launch
  alone, stale or manifest-only output, and strict reductions without owner
  comparison cannot satisfy progress while actionable gate rows exist;
- patch the duplicate/noise producer-scheduler leak identified by
  `duplicate-noise-20260518T141322Z-synthesis.md`: current-output
  startup-noise hold detection, materialization/refill/fallback/recommended
  group blocking, and product-evidence preservation;
- continue monitoring policy `28` novelty output after the `133351Z`
  producer-scheduler/live-analysis-cap remediation, wait for a completed
  steady-state monitor pass before relying on duplicate-share metrics, and verify
  product-evidence representative preservation before making any yield or
  product claims.

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, raw deferred
publication, PR17, PR18, PR18x promotion, duplicate PR07 replay, or extra
browser lanes.
