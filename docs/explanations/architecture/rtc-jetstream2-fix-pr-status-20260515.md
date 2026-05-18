# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T21:49:57Z`

Trigger event:
`pr-split-2026-05-18T21-47-39Z-20260518T213915Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T21-47-39Z-20260518T213915Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Blocked on evidence, not on split design. The newest split-persona synthesis,
`pr-split-20260518T213915Z-synthesis.md`, keeps the Cycle396 replacement split:
parallel ready/local and CRDT lanes, with PR07 as a runtime-gated owner-decision
fork that includes sibling arms `PR07B0A-155713`, `PR07B0B-195150`,
`PR07B0C-201201`, `PR07B0D-205218`, and `HOLD-07C`. The split is still not
fileable because PR07 owner replay, PR02B validation, seed `1020002` handling,
exact verified branch links for many active rows, and final rebuilt-stack
validation are still missing.

The latest duplicate/noise feedback action,
`duplicate-noise-20260518T211045Z-feedback-action.md`, did patch the remote
fuzz control plane: historical previous-root `startup-noise` /
`pre_action_bootstrap_stall` pauses are now advisory for hard scheduling,
`runLocalNoisePolicyVersion` is `34`, and its immediate restart check produced
one active run dir with a product-evidence candidate. The latest raw novelty
status is now a fresh-root startup snapshot for `run-20260518T214927Z` with the
supervisor groups file still pending and `active run dirs: 0`, so treat the
duplicate/noise work as scheduler health progress that still needs a refreshed
full novelty pass and continued product-evidence materialization. It does not
clear PR filing, PR07 owner replay, PR02B validation, seed `1020002`,
branch-link gaps, or rebuilt final-stack validation.

Current maintainer-facing replacement shape:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A ready sidecar
  + PR02B blocked-validation sidecar
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D (+ PR06E)

Runtime-gated PR07 decision fork:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0
then compare sibling owner candidates:
  PR07B0A-155713
  PR07B0B-195150 persisted CRDT content/block hydration
  PR07B0C-201201 stale persisted CRDT content-from-blocks hydration
  PR07B0D-205218 corrected two-file PR07B0-based arm
  HOLD-07C
owner replay decides whether one arm wins or an additive sequence is justified;
use PR03B, PR05B, PR05C, clean PR05D, PR14, and the current canonical PR15
endpoint as lower controls.

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B
-> ready/rtc-pr15a-fallback-group-move-green-on-pr14b
-> ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b
-> ready/rtc-pr15c-fallback-group-delete-green-on-pr14b
```

Current blocker/status changes:

- `PR07B0A-155713`, `PR07B0B-195150`, `PR07B0C-201201`, and
  `PR07B0D-205218` are sibling owner candidates after `PR07B0`, not sequential
  PRs. The `20260518T211800Z` finalization report is now nonzero and validates
  `PR07B0D-205218` as corrected audit evidence, but no PR07 arm is fileable
  before owner replay.
- Failed `PR07B0D-203210`, raw `210726`, raw PR07D, raw deferred reload heads,
  stale PR07C ready refs, PR17, PR18, and PR18x stay out of the active split.
- `PR02B` remains a blocked-validation sidecar after PR02. It still needs seed
  `1030001`, the HTTP persistence probe, targeted PHPUnit, PR CI, and a
  verified branch-link audit.
- Strict `117126135e5e` is owner-unassigned until compared against PR03, held
  PR03B, PR07 arms, and lower controls. Do not name PR18x from it yet.
- Parser, linebreak, and rich-text reductions still require comparison against
  PR05B, PR05C, and clean PR05D before any PR18x naming.
- The independent progress-controller publish path is PR14 -> PR14B -> the
  three `ready/*-on-pr14b` PR15 rows. Duplicate non-`on-pr14b` PR15 variants
  remain held.
- Duplicate/noise remediation landed and passed syntax/restart checks, but the
  latest collected novelty status for `run-20260518T214927Z` is startup-only:
  supervisor groups are pending, active run dirs are `0`, and full graph/triage
  refresh is still pending. This is not product validation.
- Do not start broad final-stack fuzzing, stack filing, or final PR publication
  until PR07 owner replay, PR02B validation, and seed `1020002` handling are no
  longer blocking.

## Branch And Ref Status

Remote status was collected at `2026-05-18T21:49:52Z`.

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

That checkout is dirty with modified product/test files and many untracked
fuzz, analysis, and documentation artifacts. It is active validation
infrastructure, not the final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-18T21:49:57Z` from fetched
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
| PR 2B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | blocked-validation sidecar; needs seed `1030001`, HTTP probe, targeted PHPUnit, PR CI, and verified branch link |
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
| PR 7B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | decision base for the PR07B0 fork; compare PR07B0A, PR07B0B, PR07B0C, PR07B0D, and HOLD-07C before filing |
| PR 7B0A-155713 | Saved-CRDT hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | runtime-gated candidate from earlier cycles; raw `155713` full-stack ref must not be pushed |
| PR 7B0B-195150 | Persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | current audit evidence exists, but seed `966001`, seed `1020001`, `990001` comparison, owner replay, and verified GitHub branch link are still missing |
| PR 7B0C-201201 | Corrected persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | sibling decision-fork arm with PR07B0B; corrected current-run audit passed, but owner replay and verified GitHub branch link are still missing |
| PR 7B0D-205218 | Corrected two-file PR07B0-based blocked/runtime arm | No verified branch link yet | TBD | TBD | nonzero finalization validates it as an audit-evidence arm; still blocked on owner replay and verified GitHub branch link |
| HOLD-07C | Held PR07C/runtime control arm | No verified branch link yet | TBD | TBD | comparison control only; stale ready PR07C refs are not fileable |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; next progress-controller repair target |
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
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-C-on-PR14B |
| PR 15A-on-PR14B | Fallback-group move green on PR14B | No verified branch link yet | TBD | TBD | publish path should use `ready/rtc-pr15a-fallback-group-move-green-on-pr14b`; verified component prior art is not exact PR14B-based ref |
| PR 15B-on-PR14B | Fallback-group insert-anchor green on PR14B | No verified branch link yet | TBD | TBD | publish path should use `ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b`; exact verified link missing |
| PR 15C-on-PR14B | Fallback-group delete green on PR14B | No verified branch link yet | TBD | TBD | publish path should use `ready/rtc-pr15c-fallback-group-delete-green-on-pr14b`; exact verified link missing |

### Verified Fallbacks And Prior Art

These rows have verified audit links, but they are not the exact active
Cycle325/i40 proposed PR rows unless the status says so.

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 6B progress | Malformed save request payload minimal branch | [`danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal) | verified progress branch from the PR progress controller; still not a substitute for active PR06A-D/PR06E placement proof |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07 decision fork |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T21:49:52Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T214927Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-18T21:49:36.801Z`. This is current fuzz/control-plane health, not
final-stack validation.

Current-run health:

```text
output dir: run-20260518T214927Z
status: monitor started; full coverage pass pending
observed roots: 592
previous records loaded: 90100
supervisor groups file: pending
active run dirs: 0
unmet goals: pending until first pass
harness-work candidates: pending until first pass
quality issues: pending until first pass
triage signatures: pending until first pass
likely-real visible: pending until first pass
health warning: startup status only; full novelty pass has not completed yet
```

Interpretation:

- The latest novelty status is startup status for the new root. It has not
  completed a full pass, so live likely-real and signature counts are pending.
- The duplicate/noise zero-producer concern has a landed scheduler/control-plane
  remediation, but the latest collected raw novelty status is an early snapshot
  before supervisor groups materialized for the new root. Treat the earlier
  `runLocalNoisePolicyVersion: 34`, `pausedGroupCount: 0`, and product-evidence
  candidate restart check as evidence that the scheduler patch applied, not as
  proof that the new root has completed a full productive pass.
- This status does not clear PR filing, PR07 owner replay, PR02B validation,
  reload-marker replay, seed `1020002`, or final-stack validation.
- Historical duplicate/noise remains dominated by startup/no-product families
  and must not be presented as live product failure.
- The latest duplicate/noise synthesis identified historical `startup-noise` /
  `pre_action_bootstrap_stall` holds becoming current hard scheduling blockers;
  the follow-up feedback action patched the novelty monitor and supervisor,
  restarted both, and syntax-checked the monitor, supervisor, triage watcher,
  analysis tier, deep-analysis tier, and live-analysis monitor. Remaining risk:
  the full novelty graph pass had not refreshed, so graph-level duplicate share
  is not newly measurable yet.

The latest trend evidence packet was generated at `2026-05-18T21:41:32Z`:

```text
monitor passes: 2295
first pass: 2026-05-15T01:21:42Z
last completed pass: 2026-05-18T21:21:03Z
coverage files: 272 -> 55014
coverage files delta: 54742
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3413
summary startup failures last: 0
quality issues last: 1
memory free: 420.8 GB
load averages: 57.82 / 49.73 / 49.17 on 64 cores
enabled groups current: novelty-ws-media-cross-entity
latest fuzz level mix:
  browser-e2e=28 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5917570
browser-e2e likely-real findings: 774 over 2502.2 runner-hours
```

The largest unmet goals remain save/reload and real-user depth:

```text
reload-post-action: 1143/2000
title-save-reload: 596/1000
real-user-editing success: 613/1000
body-save-reload: 655/1000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. New fuzz work should stay bounded and oracle-specific:
the trend packet still shows four unmet goals, high historical duplicate share,
and one enabled WS group in the trend packet, while the raw novelty status is
only a startup snapshot for a newer root.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T213915Z-synthesis.md`, keeps the Cycle396 replacement split
authoritative for now: ready/local and CRDT lanes stay parallel, while PR07 is
a runtime-gated decision fork with sibling arms on `PR07B0`. It explicitly
keeps the old linear PR07/PR17/PR18/PR18x tail rejected and keeps failed
`PR07B0D-203210`, raw `210726`, raw PR07D, raw deferred reload branches, stale
PR07C ready refs, PR17, PR18, PR18x, stale fallback-tail PR05D claims, and
stale manifests out of the filing split.

Latest split/persona statuses:

- Run PR07 owner replay for seeds `966001`, `1020001`, and `990001` across
  PR07B0A, PR07B0B, PR07B0C, PR07B0D, HOLD-07C, PR03B, PR05B, PR05C, clean
  PR05D, PR14, and the current canonical PR15 endpoint. Do not stack the PR07
  arms linearly.
- PR02B clean validation should use
  seed `1030001`, an HTTP persistence probe, targeted
  `vendor/bin/phpunit phpunit/tests/collaboration/wpHttpPollingSyncServer.php`,
  PR CI, and a verified branch audit before it can be filed.
- Publish the three `ready/*-on-pr14b` PR15 rows from
  `/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/current-push-manifest.tsv`.
  Hold duplicate non-`on-pr14b` PR15 variants.
- Continue progress-controller branch repair and full head/bundle/manifest
  audits for ready branches, especially PR11B next. Manifest-only PR10
  progress is useful but not sufficient unless head, bundle, and manifest
  agree.
- Keep loop hardening so `preflight-only`, `queued-not-run`,
  `blocked-validation`, `owner-unassigned`, prompt-only `PASS`, setup smoke,
  manifest-only rows, zero-byte reports, header-only TSVs, and stopped
  processes do not satisfy progress. Stale PR07C/HOLD-07C consumed state must
  not suppress newer PR07B0B/B0C/B0D matrices.

Bounded follow-up jobs allowed by the persona synthesis:

```text
rtc-cycle396-pr07-b0a-b0b-b0c-b0d-owner-replay
  required outputs: nonzero report.md, classification.tsv, replay-runs.tsv,
  first-divergence.tsv, and per-arm artifacts

rtc-cycle396-pr02b-validation-1030001-oracle
  run or replace only if the active validation is stale/reportless; require
  seed 1030001, HTTP persistence probe, and
  vendor/bin/phpunit phpunit/tests/collaboration/wpHttpPollingSyncServer.php

strict 117126135e5e owner replay
  compare against PR03, held PR03B, PR07 arms, and lower controls before
  assigning any product row or PR18x name

controller self-repair
  enforce the no-progress rules above and prevent stale PR07C/HOLD-07C state
  from serializing newer PR07B0B/B0C/B0D work
```

The preceding feedback action at `pr-split-20260518T212123Z-feedback-action.md`
launched the PR07 owner replay, PR02B validation, and PR07 loop-freshness
hardening jobs. The hardening job completed `PASS`; the PR07 and PR02B jobs
remain evidence gates unless or until they write complete nonzero reports with
the required TSV artifacts. Do not treat queued, setup-only, or reportless job
state as progress.

The newest duplicate/noise synthesis,
`duplicate-noise-20260518T211045Z-synthesis.md`, frames the duplicate/noise
issue as fuzzer control-plane scheduling/admission state, not product failure:
historical no-product `startup-noise` / `pre_action_bootstrap_stall` holds
must not become current hard producer blocks when the active output root has no
product-evidence runs. Its feedback action,
`duplicate-noise-20260518T211045Z-feedback-action.md`, then applied the
bounded scheduler fix in the remote fuzz repo:

- `bin/rtc-browser-fuzz-novelty-monitor.mjs` now treats historical
  previous-root startup-noise pauses as advisory for hard scheduling decisions.
- `bin/rtc-browser-fuzz-supervisor.mjs` no longer pauses the whole group on one
  strict no-product startup seed.
- `node --check` passed for the novelty monitor, supervisor, triage watcher,
  analysis tier, deep-analysis tier, and live-analysis monitor.
- `rtc-coverage-guided-novelty` and `rtc-coverage-guided-supervisor` were
  restarted, yielding `activeRunDirs: 1`, `noAnalysisRunDirs: 0`,
  `startupStallRunDirs: 0`, and one queued product-evidence candidate in that
  immediate post-restart check.

The duplicate/noise fix is therefore control-plane progress, but not a PR
filing signal. The latest raw novelty status for the newer `run-20260518T214927Z`
root is still startup-only with supervisor groups pending and no active run
dirs, so the full novelty graph pass still needs to refresh. Consumer-side
`startup-noise` family capping remains a validation-driven follow-up only if
post-scheduler validation shows startup-noise dirs still reach analysis.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance, and
old PR13 GitHub-ref caveats are superseded by the current branch-link audit,
the repaired PR13 review refs, the latest PR07 decision-fork shape, and the
latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified product refs | PR02A, PR02B, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-current, PR07B0A-155713, PR07B0B-195150, PR07B0C-201201, PR07B0D-205218, HOLD-07C, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A/B/C-on-PR14B | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | recommended sidecar, but still blocked; earlier preflight/setup-only/reportless jobs do not count as validation | Rerun with verified-free ports and clean `wp-env`, then require seed `1030001`, short HTTP persistence probe, targeted PHPUnit, PR CI, and exact branch-link audit |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B0A, PR07B0B, PR07B0C, PR07B0D-205218, HOLD-07C, reload/provider evidence | runtime readiness remains unresolved; PR07B0D-205218 has corrected audit evidence, but no PR07 arm has owner replay | Replay seeds `966001`, `1020001`, and `990001` across the required arms and controls; require first-divergence/owner evidence plus clean materialized refs |
| Failed PR07B0D / `203210` | raw `deferred/rtc-reload-hydration-20260518T203210Z`, raw `210726`, and related manifests | out of the active fork; Cycle394 restack failed on both touched files, and `PR07B0D-205218` is the current corrected arm | Reconsider only after a bounded conflict-resolution/downscope job produces a clean two-file allowed-base artifact with bundle/head/manifest agreement |
| PR07D / PR17 / PR18 / PR18x | reload/post-save/rejoin residuals and old linear tail | rejected for the current split | Reconsider only after owner replay proves a product-owned boundary not covered by the accepted PR07 fork |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the chosen PR07 path, holds, PR14, and the current canonical PR15 endpoint before assigning any new owner row |
| Revision-restore strict signal | `117126135e5e`, PR03, held PR03B, PR07 arms | owner-comparison target only; not a split row or product fix by itself | Compare against PR03, held PR03B, PR07 arms, and lower controls before claiming a new owner boundary |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15C-on-PR14B | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, accepted PR07 fork non-ancestry where required, old HOLD non-ancestry, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A/B/C-on-PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based ready refs | Publish/fetch/audit the three `ready/*-on-pr14b` refs and confirm ancestry |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only; do not wait on it before running independent PR07/PR02B/strict-owner work | Repair or explicitly reclassify before final-stack validation and filing |
| Reload marker/lifecycle work | HARNESS reload markers, seeds `990001`/`990003`, same-user lifecycle seeds, PR07C seeds, deferred reload outputs | harness/diagnostic only until replay proves product ownership | Consume PR07 owner replay when present, then require product-owned first-loss boundary before promotion |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, startup-noise cooldowns, empty materialization rescue, fleet canary policy, live/analysis duplicate-family admission | scheduler remediation landed in the remote fuzz repo; immediate restart evidence showed `runLocalNoisePolicyVersion: 34`, no startup/no-analysis dirs, and one queued product-evidence candidate, but the latest newer-root novelty status is startup-only with active run dirs `0` | Keep product-evidence signatures visible; recheck the full novelty graph pass and only patch consumer-side `startup-noise` family capping if startup-noise dirs still reach analysis |
| Current fuzz validation | `run-20260518T214927Z`, novelty status at `2026-05-18T21:49:36.801Z`, trend generated at `2026-05-18T21:41:32Z` | startup-only novelty status with supervisor groups pending and active run dirs `0`; full pass and live triage counts pending; trend has `4` unmet goals, `1` quality issue, and enabled group `novelty-ws-media-cross-entity` | Use as health/control-plane evidence only; still require owner replay, PR02B validation, exact branch audit, reload-marker downscope, seed `1020002` handling, and final PR-stack validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw `155713`, raw
`PR07B0B-195150`, raw `PR07B0C-201201`, raw `PR07B0D-205218`, raw `203210`,
raw `210726`, raw PR07D, PR17, PR18, PR18x, or local finalization artifacts
as-is.

Before filing any maintainer-facing PR:

1. Use the replacement split above: ready/local lane, CRDT/data-loss lane, and
   PR07 converted into a runtime-gated decision fork rather than the old
   PR07/PR17/PR18 tail.
2. Treat PR07B0A, PR07B0B, PR07B0C, PR07B0D-205218, and HOLD-07C as blocked
   sibling owner candidates. Keep failed `203210`, raw `210726`, raw PR07D,
   stale PR07C ready refs, PR17, PR18, and PR18x out unless later
   conflict-resolution/downscope work produces clean allowed-base evidence.
3. Do not file PR02B before seed `1030001`, HTTP persistence probe, targeted
   PHPUnit, PR CI, and verified GitHub branch-link audit pass.
4. Do not file PR07 until PR07B0A/B/C/D and the hold/lower-control matrix has
   nonzero owner replay outputs, first-divergence evidence, clean materialized
   refs, exact branch links, and `git diff --check`.
5. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
6. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   PR15A/B/C after PR14B, and no fallback-tail PR05D.
7. Run held owner comparisons for strict projection, common-blocks, rich-text,
   search/live-collapse, revision-restore `117126135e5e`, and reload
   candidates before creating new product rows.
8. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
9. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
10. Treat the latest duplicate/noise producer/admission analysis and the
   current fuzz root as control-plane/fuzz health, not product validation or
   final-stack readiness.
11. After PR07 decision-fork owner evidence, exact branch-link audit for
   missing rows, PR02B validation, reload-marker replay/downscope, strict
   `117126135e5e` comparison if it remains product-owned, and seed `1020002`
   repair or reclassification land, rebuild the combined validation stack from
   explicit Cycle325/i40 heads plus accepted epoch work, then run focused
   checks, touched-file lint, branch graph/containment evidence, adjacent
   range-diffs/diffstats/numstats, `git diff --check`, feasible runtime checks,
   and fresh stack-wide validation.

Useful bounded work now:

- consume or restart `rtc-cycle396-pr07-b0a-b0b-b0c-b0d-owner-replay` only if
  it is stale/reportless, and require nonzero `report.md`,
  `classification.tsv`, `replay-runs.tsv`, `first-divergence.tsv`,
  `owner-matrix.tsv`, and per-arm artifacts;
- consume or replace `rtc-cycle396-pr02b-validation-1030001-oracle` only if it
  is stale/reportless, with seed `1030001`, the HTTP persistence probe, and
  `vendor/bin/phpunit phpunit/tests/collaboration/wpHttpPollingSyncServer.php`;
- publish the three `ready/*-on-pr14b` PR15 rows from the current progress
  manifest, then fetch and audit their exact links;
- keep the progress-controller hardening in force so prompt-only, manifest-only,
  preflight-only, blocked-validation, owner-unassigned, setup-only, zero-byte,
  header-only, duplicate-head, stale-manifest, or stopped-child artifacts never
  count as completed progress;
- recheck novelty/supervisor after `runLocalNoisePolicyVersion: 34`: require a
  refreshed full novelty graph pass, supervisor materialization for the latest
  root, continued product-evidence-capable run dirs, and no no-product
  startup-noise dirs reaching analysis before treating duplicate/noise as
  stable;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw `203210` or raw `210726` publication/replay, raw PR07D, raw
deferred publication, PR17, PR18, PR18x promotion, reload-marker product
promotion before replay, or extra browser lanes.
