# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T13:14:15Z`

Trigger event:
`pr-split-2026-05-18T13-12-16Z-20260518T130408Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T13-12-16Z-20260518T130408Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Cycle 362 is still the latest applied split-feedback action in
`current-pr-split.md`. The newest split-persona synthesis
(`pr-split-20260518T130408Z-synthesis.md`) makes no topology rewrite for the
ready/local or CRDT lanes, but keeps PR07 as the active blocker: the old linear
PR07 tail is replaced by a two-stage decision fork, `124525` is part of the
stale-epoch comparison arm, and current `PR07B1A` still must not be claimed to
cover `111430`/`114448`/`123016`/`124525`.

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
  vs restacked 111430/114448/123016/124525 candidate, if conflict-resolved
  plus PR03B, HOLD-07B2, and HOLD-07C as comparison/hold arms

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

Current blockers and status changes:

- PR07 is blocked on ownership and is not file-ready. The completed Cycle 362
  PR07 matrix passed with `0` hard failures and `4` warnings, but produced `0`
  restacked candidates: `121507` still conflicts in
  `packages/core-data/src/actions.js`, while `111430`, `114448`, and `123016`
  still conflict in `packages/sync/src/test/manager.ts`.
- `PR07B1A` is still not proven to cover the newer stale-epoch family. The
  relevant patch IDs remain distinct: current `PR07B1A` is
  `9964238035d698b2ca22e0ece2cf09de0cb00b07`; `111430`/`114448`/`123016` are
  `652e07a70d6b259b3ea37da84526cfb8b48f8d4b`; and the newest `124525`
  candidate is `056aa92f2934`. `124525` is comparison evidence only until it is
  restacked, conflict-resolved, and owner-replayed.
- The PR07 outcome rule now has two gates: choose current `PR07B0` or the
  restacked `121507` candidate after `PR07A3`; then, after the chosen
  `PR07B1`, choose whether current `PR07B1A`, a conflict-resolved
  `111430`/`114448`/`123016`/`124525` candidate, or a replace/add/reorder shape
  owns the stale-epoch behavior.
- `20260518T123516Z` remains the latest audited nonzero finalization input
  consumed by `current-pr-split.md`. The post-`123516Z` audit passed with `0`
  hard failures and `6` warnings; it verified all `70` manifest rows against
  live heads, generated bundle heads, manifest SHAs, and the base allowlist. It
  still leaves deferred freshness warnings for `115454Z` rich-text, `120501Z`
  pre-save search, `115957Z` reload, `121003Z` rich-text, and newer `123520Z`
  pre-save search.
- The newest synthesis says post-`124519Z` finalization/deferred state needs a
  fresh audit, including `125028Z`, `125531Z`, and now-nonzero `125522Z` as
  post-context input only. `130525Z` remains zero-byte/no evidence. Any newer
  manifest must be newer than the deferred candidates it claims to cover and
  must pass live-head, bundle-head, manifest, base-allowlist, and freshness
  checks.
- Seed `1020002` remains a blocker only for final-stack fuzzing, GitHub filing,
  rebuilt stack-wide validation, and its own repair or reclassification. It
  must not serialize independent ready/local work, CRDT-lane work, PR07
  restack/owner work, branch audit, deferred downscope, PR02A/PR5/PR11 shaping,
  or loop repair.
- Duplicate/noise control-plane work has two current layers. The
  `duplicate-noise-20260518T120846Z` feedback action patched novelty policy
  `27` and restarted the novelty monitor. The newer
  `duplicate-noise-20260518T124635Z-synthesis.md` made no edits and narrows the
  next smallest fix to current-scope accounting: paused/no-analysis drain dirs
  must still be included in `getCurrentRunDirs(...,
  { includePausedNoAnalysis: true })` even when a group is active or recovering,
  so materialization/refill and Codex launch stay held for no-product startup
  noise.
- Treat duplicate/noise status as control-plane health, not product validation.
  Product-evidence signatures must remain visible/family-capped; strict
  no-product startup stalls should be durably paused in the producer path before
  any yield or product-readiness claims depend on the scheduler state.

## Branch And Ref Status

Remote status was collected at `2026-05-18T13:14:10Z`.

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

The branch-link audit was generated at `2026-05-18T13:14:15Z` from fetched
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
| PR 7B1A | Current stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | second decision-fork arm after PR07B1; not file-ready as coverage for `111430/114448/123016/124525` |
| PR 7B1B? | Restacked `111430/114448/123016/124525` reload/stale-epoch candidate | No verified branch link yet | TBD | TBD | second decision-fork arm; `124525` candidate is `056aa92f2934`; no accepted ref exists |

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
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-current vs `121507` decision, the chosen PR07B1 row, or the PR07B1A vs `111430`/`114448`/`123016`/`124525` decision |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T13:14:10Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T131240Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The latest raw novelty monitor status at `2026-05-18T13:13:50.394Z` is
startup-only for the new output root:

```text
status: monitor started; full coverage pass pending
observed roots: 467
previous records loaded: 84847
supervisor groups file: 0
active run dirs: 0
coverage guidance: pending until first pass
triage yield: pending until first pass
health warning: startup status only; full novelty pass has not completed yet
```

Interpretation:

- The latest raw novelty read is not a completed monitor pass. It must not be
  used as health proof, product proof, or final-stack validation.
- The startup read only proves the new run root exists, the monitor loaded
  previous state, the supervisor groups file currently lists `0` groups, and
  there are `0` active run dirs at startup.
- Current-run, current-drain, and historical triage must stay separate. The
  last completed full pass is the `13:05:14Z` pass represented in the trend
  packet below, not the startup-only `13:13:50Z` raw read.
- The newest duplicate/noise synthesis says the smallest safe follow-up is
  current-scope accounting in `rtc-browser-fuzz-novelty-monitor.mjs`, so paused
  no-analysis drain dirs still block materialization/refill/Codex launch while
  product-evidence candidates remain visible.
- The fuzz repo is still active validation infrastructure. It is not the final
  PR stack and cannot substitute for a rebuilt combined validation stack from
  explicit Cycle325/i40 heads.

The latest trend packet was generated at `2026-05-18T13:08:07Z`:

```text
monitor passes: 2257
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T13:05:14Z
coverage files: 272 -> 52796
coverage files delta: 52524
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3426
summary startup failures last: 0
quality issues last: 0
memory free: 409.5 GB
load averages: 65.72 / 70.79 / 73.64 on 64 cores
enabled groups current at trend time: none listed
latest fuzz level mix:
  browser-e2e=25 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5724007
browser-e2e likely-real findings: 744 over 2303.6 runner-hours
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
zero likely-real output. The trend packet predates the `13:12:40Z` output-root
restart, so treat its completed-pass metrics as last-pass evidence and the
latest raw novelty status as startup-only/pending. CPU/load remain high; new
fuzz work should stay bounded and oracle-specific rather than adding broad
browser concurrency.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T130408Z-synthesis.md`, says the six reports converge on a
PR07 split change, not a full topology rewrite. The Cycle325/i40 ready/local
and CRDT/data-loss lanes remain usable, but PR07 is not reviewable as a linear
tail and must remain a two-stage decision fork:

1. Compare current `PR07B0` against a restacked `121507`
   saved-response/persisted-CRDT hydration candidate after `PR07A3`.
2. After the chosen `PR07B1`, compare current `PR07B1A` against a
   conflict-resolved `111430`/`114448`/`123016`/`124525` stale-epoch candidate,
   with `PR03B`, `HOLD-07B2`, and `HOLD-07C` as comparison arms.

Completed split feedback results:

- Cycle 362 PR07 matrix: `PASS`, `0` hard failures, `4` warnings, `0` restacked
  candidates; `121507` conflicts in `packages/core-data/src/actions.js`, while
  `111430`/`114448`/`123016` conflict in `packages/sync/src/test/manager.ts`.
- Cycle 362 post-`123516Z` audit: `PASS`, `0` hard failures, `6` warnings;
  verified all `70` manifest rows against live heads, generated bundle heads,
  manifest SHAs, and base allowlist.
- Cycle 362 strict parser/linebreak/rich-text comparison: `PASS`; clean `PR05D`
  is only `27c6e7924217038ed9b4ff71585e8041c67765a4`, and `122513` remains a
  diagnostic rich-text suffix match, not `PR18x`.
- Browser PR07 owner replay remains intentionally deferred until a
  conflict-resolved PR07 candidate exists or the conflict is explicitly
  downscoped.
- The next bounded PR07 work is `rtc-cycle364-pr07-124525-stale-sync-epochs-integration`:
  restack `056aa92f2934` onto the Cycle325/i40 PR07 base, resolve or explicitly
  downscope conflicts in `packages/sync/src/test/manager.ts` and
  `packages/core-data/src/actions.js`, compare patch IDs/range-diffs against
  current PR07B0/B1/B1A and hold arms, and emit branch graph, diffstat,
  bundle/head/manifest/base/deferred-freshness checks plus Jest, lint,
  Prettier, and diff checks.
- The next deferred/finalization freshness work is
  `rtc-cycle364-post-latest-current-deferred-bundle-manifest-audit`: audit
  post-`124519Z` state, including `125028Z`, `125531Z`, and now-nonzero
  `125522Z` as post-context input only. `130525Z` remains zero-byte/no
  evidence. Any manifest must be newer than the deferred candidates it claims
  to cover and must pass live-head, bundle-head, manifest, base-allowlist, and
  freshness checks.
- Loop progress rules still need repair/enforcement: active sessions, zero-byte
  reports, `report.tmp`, disk-preflight-only output, and manifest-only output
  are no progress while the Parallel Progress Gate has actionable rows.

The newest duplicate/noise synthesis,
`duplicate-noise-20260518T124635Z-synthesis.md`, made no edits. It supersedes
the earlier "supervisor pause only" framing for scheduler readiness:

- consensus root cause is still producer/control-plane churn, not current
  Codex-analysis leakage;
- the next smallest fix is current-scope accounting in
  `rtc-browser-fuzz-novelty-monitor.mjs`, so `includePausedNoAnalysis` includes
  supervisor `noAnalysisRunDirs` and `startupStallRunDirs` even for active or
  recovering groups;
- validate that `drainOnlyCurrentRunStartupHold` blocks materialization/refill
  and Codex launch for no-product startup noise;
- preserve product-evidence signatures, including reload/save/autosave/revision
  evidence and visible likely-real/uncertain representatives.

The earlier `duplicate-noise-20260518T120846Z` feedback action still counts as
completed control-plane work: it removed the empty-materialization/bootstrap
rescue startup-noise cooldown bypass, bumped novelty policy to `27`, cleared
stale bypass state, restarted novelty, and passed syntax checks. It is not a
complete producer-side fix.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, old enabled-group claims, and old "do not
add PR06B" recommendations are superseded by the repaired PR13 audit links,
the newer two-stage PR07 decision fork with the `124525` comparison arm,
PR06E/PR02A sidecar status, the policy-27 duplicate/noise patch plus the newer
current-scope accounting follow-up, and the latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle325/i40 manifests, audited nonzero `20260518T123516Z`, post-context `125028Z`/`125531Z`/now-nonzero `125522Z`, zero-byte `130525Z`, `121507`, `123016`, `123520`, current `PR07B0`, current `PR07B1A`, raw reload/stale-epoch candidates `111430`/`114448`/`123016`/`124525`, deferred reload/search/rich-text diagnostics | active source family; `123516Z` is branch/bundle/manifest evidence but not complete deferred-coverage proof; `125522Z` is post-context input only until audited; `130525Z` is no evidence while zero-byte; filing remains blocked by PR07 owner evidence, missing verified GitHub links, seed `1020002`, unresolved deferred freshness, and final validation | Run the bounded `124525` PR07 restack/adjudication; run the post-latest deferred/bundle/manifest audit covering `125028Z`, `125531Z`, and `125522Z`; then publish/fetch/audit exact GitHub links, repair or reclassify seed `1020002`, and run final-stack validation gates |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-current, PR07B0-alt/`121507`, PR07B1, PR07B1A, possible PR07B1B including `124525`, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, current PR07B0, `121507`, chosen PR07B1, current PR07B1A, raw `111430/114448/123016/124525`, `HOLD-07B2`, `HOLD-07C`, reload diagnostics | runtime readiness has durable `repaired_ready` evidence, but setup readiness is not product proof; PR07 now has two decision forks and no accepted file-ready owner shape; `124525` candidate `056aa92f2934` is comparison evidence only | Restack `121507` against current `PR07B0`; restack `111430`/`114448`/`123016`/`124525` against the chosen PR07 base; resolve or explicitly downscope conflicts in `packages/sync/src/test/manager.ts` and `packages/core-data/src/actions.js`; compare patch IDs/range-diffs/diffstats; then run owner replay across the chosen PR07B0/PR07B1 path, current PR07B1A, restacked stale-epoch candidate if produced, PR03B, HOLD-07B2, and HOLD-07C with REST/meta, `_crdt_document`, edited-record, Y.Doc/provider/awareness, UI, branch-head, and first-divergence artifacts |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-HOLD-07C non-coverage with first-divergence evidence |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the chosen PR07B0/PR07B1 path, PR07B1A, and holds before assigning any new owner row |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, chosen `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, mixed product-evidence/startup-noise lanes, empty materialization rescue, coverage recommendation fallback enables | policy `27` patch completed and restarted novelty monitor; latest synthesis says paused/no-analysis drain dirs can still fall out of current scope when groups are active/recovering | Treat as control-plane health only; patch/validate current-scope accounting so drain-only startup holds block materialization/refill/Codex launch while product-evidence representatives stay visible/family-capped |
| Current fuzz validation | `run-20260518T131240Z`, startup-only novelty read at `2026-05-18T13:13:50.394Z`, trend generated at `2026-05-18T13:08:07Z` from last completed pass at `2026-05-18T13:05:14Z` | latest raw novelty status is startup-only with full pass pending; last completed-pass trend still has `4` unmet goals, `0` current duplicate share, no enabled groups listed, and no final-stack validation claim | Accepted product evidence, owner replay, exact branch audit, seed `1020002` repair/reclassification, and final PR-stack validation are still required before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw PR07D, PR17, PR18,
PR18x, or zero-byte/stale finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle325/i40 parallel-lane shape above. Treat `20260518T123516Z` as
   current branch/bundle/manifest proof for `70` rows, but not complete
   deferred-coverage proof while the `6` deferred-freshness warnings remain. Do
   not treat now-nonzero `20260518T125522Z` as more than post-context input
   until a live-head/bundle/manifest/base/freshness audit consumes it, and do
   not treat zero-byte `130525Z` as evidence.
2. Treat PR07 as a two-stage decision fork: first compare current `PR07B0`
   against the restacked `121507` saved-response/persisted-CRDT hydration
   candidate after `PR07A3`; then compare current `PR07B1A` against a
   conflict-resolved `111430`/`114448`/`123016`/`124525` stale-epoch candidate
   after the chosen `PR07B1`. Do not file the PR07 lane until conflict
   resolution, exact branch links, and owner replay choose replace/add/reorder
   for both forks.
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
9. Treat duplicate/noise policy `27`, the newer current-scope accounting
   analysis, and the latest novelty/trend status as control-plane health, not
   product validation or final-stack readiness.
10. After the PR07 decision fork has owner evidence, exact branch-link audit
   for missing rows, and seed `1020002` repair or reclassification land, rebuild
   the combined validation stack from explicit Cycle325/i40 heads plus accepted
   epoch work, then run focused checks, touched-file lint, branch
   graph/containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

The current useful bounded work is:

- run the bounded PR07 `124525` integration/adjudication job
  (`rtc-cycle364-pr07-124525-stale-sync-epochs-integration`): restack
  `056aa92f2934` onto the Cycle325/i40 PR07 base, resolve or intentionally
  downscope conflicts in `packages/sync/src/test/manager.ts` and
  `packages/core-data/src/actions.js`, and compare patch IDs/range-diffs/
  diffstats against PR07B0/B1/B1A and hold arms before any owner replay;
- run PR07 owner replay after conflict-resolved candidates exist, comparing the
  chosen PR07B0/PR07B1 path, current PR07B1A, restacked
  `111430`/`114448`/`123016`/`124525` if produced, PR03B, HOLD-07B2, HOLD-07C,
  and reload diagnostics;
- run the post-latest current deferred/bundle/manifest audit over post-`124519Z`
  state, including `125028Z`, `125531Z`, and now-nonzero `125522Z`; keep
  zero-byte `130525Z` as no evidence;
- resolve the `123516Z` deferred-freshness warnings and the newer `123520Z` and
  `124525` questions with a later finalization, downscope, or owner comparison;
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
- continue monitoring policy-27 novelty output and the newer current-scope
  accounting follow-up, and verify product-evidence representative preservation
  before making any yield or product claims.

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, raw deferred
publication, PR17, PR18, PR18x promotion, duplicate PR07 replay, or extra
browser lanes.
