# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T20:20:52Z`

Trigger event:
`pr-split-2026-05-18T20-20-00Z-20260518T200804Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T20-20-00Z-20260518T200804Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The split remains blocked and not fileable. The newest split-persona synthesis,
`pr-split-20260518T200804Z-synthesis.md`, keeps the Cycle378/Cycle386/Cycle388
parallel-lane replacement shape and rejects the older linear
`PR07 -> PR17 -> PR18/PR18x` tail. Cycle 390 did not redesign the split; it
tightened setup/accounting gates and exposed one new real PR07 comparison
candidate.

Current decision state:

- `PR07B0B-195150` is real candidate evidence. The source report is nonzero,
  source head is `ddac5524fb46`, and the finalized runtime-gated head is
  `a8098b87d80`. It is not file-ready, has no verified branch link yet, and the
  raw deferred branch must not be filed directly.
- Cycle 390 loop repair passed and should keep setup-only output,
  header-only TSVs, zero-byte reports, stopped child processes, and
  port-collision wrappers from satisfying progress gates.
- Cycle 390 PR07 produced a nonzero `setup-blocked` report. That is useful
  setup evidence, not owner evidence and not a PR07 promotion.
- Cycle 390 `PR02B` still has no `report.md` and has stopped PHPUnit child
  processes. `PR02B` remains a blocked sidecar after `PR02`.
- Final-stack validation, GitHub filing, and broad final-stack fuzzing remain
  blocked until PR07 owner adjudication, PR02B validation, exact branch-link
  audit, and a fresh rebuilt stack validation pass all complete.

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
PR07A1 -> PR07A2 -> PR07A3
then compare:
  PR07B0
  PR07B0A-155713
  PR07B0B-195150 persisted CRDT content/block hydration
  materialized 121507 / 134558 only if distinct
  HOLD-07C
winner or additive result -> PR07B1 only if still independent
then compare:
  PR07B1
  PR07B1A
  PR07B1A-ALT-131542 and stale-epoch alternates
  PR03B, HOLD-07B2, HOLD-07C, PR05B, PR05C, clean PR05D, PR14, PR15D

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

The current branch-link audit still provides verified content links only for a
smaller set of review refs. Rows without verified audit links are listed as
`No verified branch link yet` and are not file-ready.

## Branch And Ref Status

Remote status was collected at `2026-05-18T20:20:47Z`.

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

The branch-link audit was generated at `2026-05-18T20:20:52Z` from fetched
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
| PR 2B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | preflight passed earlier, but Cycle 388 was setup/bootstrap-only and Cycle 390 still has no `report.md` with stopped PHPUnit child processes; remains blocked until seed `1030001`, HTTP probe, targeted PHPUnit, CI, and verified branch link pass |
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
| PR 7B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | first decision-fork arm; compare against PR07B0A, PR07B0B, distinct re-materialized `121507`/`134558` only if they exist, and HOLD-07C before accepting the PR07B1 base |
| PR 7B0A-155713 | Saved-CRDT hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | key runtime-gated candidate from earlier cycles; raw `155713` full-stack ref must not be pushed |
| PR 7B0B-195150 | Persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | new real candidate; source report nonzero, source head `ddac5524fb46`, finalized runtime-gated head `a8098b87d80`; current `20260518T200738Z` finalization report is zero bytes, so this is evidence for audit/replay only |
| PR 7B0-alt? | Restacked `121507`/`134558` saved-response/persisted-CRDT hydration candidate | No verified branch link yet | TBD | TBD | first decision-fork arm only if re-materialized as distinct current refs |
| PR 7B1 | Save response manager/base-record owner microhead after the chosen PR07B0 arm | No verified branch link yet | TBD | TBD | not file-ready until the first PR07 decision comparison is decided; include as a comparison arm in the second owner matrix |
| PR 7B1A | Current stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | second decision-fork arm; compare against PR07B1, PR07B1A-ALT, stale-epoch alternates, PR03B, HOLD-07B2, HOLD-07C, and lower-layer controls before claiming coverage |
| PR 7B1B? | Restacked `111430/114448/123016/124525/130034/131542/133049` reload/stale-epoch candidate | No verified branch link yet | TBD | TBD | second decision-fork arm; no accepted ref exists |

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
collected_at_utc: 2026-05-18T20:20:47Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T200511Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-18T20:20:28.682Z`. This is current fuzz/control-plane health, not
final-stack validation.

Current-run health:

```text
output dir: run-20260518T200511Z
coverage files: 54818
total records seen: 89455
unmet goals: 4
headroom for adding groups: no
load1: 72.89 / 64 cores
memory: 407.9G free / 492.0G total
enabled groups: none
active current-run dirs: 0
current active-scope likely-real visible: 0
current drain triage roots: 1
current drain product-evidence signatures: 2
current drain likely-real visible: 0
current drain top families: persisted_content_mismatch, reload_rejoin_awareness_stall
health warning: heartbeat refreshed at 20:20:28Z; metrics are from 20:02:58Z
```

Interpretation:

- Current active-scope triage has no visible likely-real signal, but there are
  no active current-run dirs and no enabled groups. This is not a clean final
  validation result.
- The current drain has two product-evidence signatures, both with likely-real
  visible count `0`, and one of the duplicate/noise actions paused
  `novelty-ws-multi-reload-lifecycle` because a product-evidence duplicate
  representative was already visible or family-capped.
- Historical combined triage still reports `368` likely-real visible and
  `1448` likely-real merged duplicates; those are historical reporting context,
  not live current-root failures.
- Historical duplicate/noise remains dominated by startup/no-product families
  and must not be presented as live product failure.
- This status does not clear PR filing, final-stack validation, PR02B
  validation, PR07 owner replay, reload-marker replay, or seed `1020002`.

The latest trend evidence packet was generated at `2026-05-18T20:12:52Z`:

```text
monitor passes: 2288
first pass: 2026-05-15T01:21:42Z
last completed pass: 2026-05-18T20:02:58Z
coverage files: 272 -> 54760
coverage files delta: 54488
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3414
summary startup failures last: 0
quality issues last: 0
memory free: 404.5 GB
load averages: 61.07 / 66.98 / 66.92 on 64 cores
enabled groups current: none
latest fuzz level mix:
  browser-e2e=27 lanes/24 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5883309
browser-e2e likely-real findings: 770 over 2477.9 runner-hours
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
the current producer state has no enabled groups, CPU/load is already high, and
the evidence supports targeted owner/replay work rather than broad final-stack
claims.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T200804Z-synthesis.md`, says the report should keep the
Cycle378/Cycle386/Cycle388 parallel-lane replacement shape, amend the PR07 fork
to include `PR07B0B-195150`, and keep filing blocked. It explicitly rejects
raw `PR07C`, raw `PR07D`, raw deferred heads, `PR17`, `PR18`, `PR18x`,
fallback-tail PR05D claims, and any PR18x naming before PR05B/PR05C/clean
PR05D comparison.

Latest gate statuses from the persona inputs:

- Cycle 390 loop repair passed.
- Cycle 390 PR07 produced a nonzero setup-blocked report. It is setup evidence
  only; a later bounded owner-matrix replay must still produce oracle-level
  owner evidence.
- Cycle 390 PR02B still has no `report.md` and has stopped PHPUnit child
  processes. Reap/report it if stale, then rerun seed `1030001`, HTTP probe,
  and targeted PHPUnit with shorter timeouts.
- The current `20260518T200738Z` finalization report is zero bytes. Its
  manifest row can support candidate evidence, but not filing clearance.
- Broad final-stack fuzzing, stack-wide validation, GitHub filing, raw PR07D,
  PR17, PR18, PR18x, and product promotion of reload/rejoin, pre-save
  search/live-collapse, or rich-text suffix diagnostics remain deferred.

The newest duplicate/noise synthesis,
`duplicate-noise-20260518T195055Z-synthesis.md`, identifies a remaining
producer-side scheduler leak in `bin/rtc-browser-fuzz-novelty-monitor.mjs`.
With the fleet startup-noise canary enabled, the empty-materialization canary
path can relaunch groups that are still under no-product
`pre_action_bootstrap_stall` cooldown. The latest paired feedback-action file
is zero bytes, so treat this as completed analysis and next-action guidance,
not a completed code change.

Smallest duplicate/noise follow-up from that synthesis:

- Patch only `bin/rtc-browser-fuzz-novelty-monitor.mjs`.
- Hard-skip no-product startup-noise cooldowns in empty-materialization and
  fleet canary paths unless there is current product evidence.
- Do not delete the paused-group entry for no-product startup cooldowns.
- Leave materialization empty if every candidate is blocked.
- Restart with `RTC_FUZZ_NOVELTY_ALLOW_FLEET_STARTUP_NOISE_CANARY=0`.
- Validate with `node --check`, a gate-only pass, restart, and a short monitor
  check that product-evidence representatives remain analyzable.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance, and
old PR13 GitHub-ref caveats are superseded by the current branch-link audit,
the repaired PR13 review refs, the Cycle 390 split/action state, and the latest
novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, Cycle325/i40 manifests, Cycle 386 audited `183710`, Cycle 382 PR07C owner snapshot classification, Cycle 386 PR07 branch/replay artifacts, Cycle 388 and Cycle 390 PR07/PR02B outputs, `PR07B0A-155713`, `PR07B0B-195150`, `121507`, `134558`, current PR07B0/PR07B1A, stale-epoch alternates, deferred reload/search/rich-text diagnostics | active source family; Cycle 390 keeps the split blocked; PR07 has setup-blocked evidence only, PR02B has no report and stopped child processes, and `20260518T200738Z` finalization is zero bytes | Run bounded PR07B0B audit/replay, bounded PR07 setup-bypass owner matrix, PR02B reaper/validation, exact branch-link audit, seed `1020002` repair/reclassification, and final-stack validation |
| Missing verified product refs | PR02A, PR02B, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-current, PR07B0A-155713, PR07B0B-195150, PR07B0-alt, PR07B1, PR07B1A/B, HOLD-07B2, HOLD-07C, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | recommended sidecar; Cycle 388 was setup/bootstrap-only and Cycle 390 still has no `report.md` with stopped PHPUnit child processes; no product validation, CI, or branch-link proof is collected | Reap/report stale job, rerun with verified-free ports and shorter timeouts, then require seed `1030001`, short HTTP persistence-probe, targeted PHPUnit, PR CI, and exact branch-link audit |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, `PR07B0A-155713`, `PR07B0B-195150`, `121507`/`134558`, chosen PR07B1, PR07B1A, stale-epoch alternates, HOLD arms, reload/provider evidence | runtime readiness remains unresolved; Cycle 390 PR07 is setup-blocked and does not provide owner evidence; `PR07B0B-195150` is candidate evidence only | Audit/replay PR07B0B seed `966001`, run setup-bypass owner matrix, compare against controls, and require first-divergence/owner evidence plus clean materialized refs |
| PR07D / PR17 / PR18 / PR18x | reload/post-save/rejoin residuals and old linear tail | rejected for the current split | Reconsider only after owner replay proves a product-owned boundary that is not covered by the accepted PR07 fork |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the chosen PR07 path, holds, PR14, and PR15D before assigning any new owner row |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, chosen `PR07B1 !-> PR09`, PR07B1A non-ancestry where required, old HOLD non-ancestry, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Reload marker/lifecycle work | HARNESS reload markers, seeds `990001`/`990003`, same-user lifecycle seeds, PR07C seeds, deferred reload outputs | harness/diagnostic only until replay proves product ownership; Cycle 390 does not promote them | Consume PR07 owner replay when present, then require product-owned first-loss boundary before promotion |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, startup-noise cooldowns, empty materialization rescue, fleet canary policy | latest synthesis identifies a remaining producer-side canary leak; no nonzero latest feedback action was written | Patch novelty monitor canary handling, disable fleet startup-noise canary, syntax check, restart, and verify producer materialization without hiding product evidence |
| Current fuzz validation | `run-20260518T200511Z`, novelty status at `2026-05-18T20:20:28.682Z`, trend generated at `2026-05-18T20:12:52Z` | current active scope has zero likely-real visible but also zero active dirs and no enabled groups; current drain has two product-evidence signatures and zero likely-real visible; trend has `4` unmet goals and high load | Use as health/control-plane evidence only; still require owner replay, PR02B validation, exact branch audit, reload-marker downscope, seed `1020002` handling, and final PR-stack validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw `155713`, raw
`PR07B0B-195150`, raw PR07D, PR17, PR18, PR18x, or local finalization artifacts
as-is.

Before filing any maintainer-facing PR:

1. Use the replacement Cycle378/Cycle386/Cycle388/Cycle390 parallel-lane shape
   above, including `PR02B` as a blocked-validation sidecar after PR02 and
   `PR07B0B-195150` as a new blocked PR07 decision-fork candidate.
2. Treat Cycle 386 local-publish proof, Cycle 382 PR07C owner classification,
   Cycle 388 setup attempts, and Cycle 390 setup/loop evidence as gate evidence
   only. None is complete filing proof, GitHub-publication proof,
   product-promotion proof, final-stack validation, PR07 owner proof, PR02B
   validation proof, or exact branch-link proof.
3. Do not file `PR02B` before seed `1030001`, HTTP persistence-probe, targeted
   PHPUnit, PR CI, and verified GitHub branch-link audit pass.
4. Do not file PR07 until the `PR07B0` / `PR07B0A-155713` /
   `PR07B0B-195150` / `121507`-`134558` / `HOLD-07C` comparison and the
   `PR07B1` / `PR07B1A` / stale-epoch comparison are both resolved with clean
   materialized refs, exact branch links, `git diff --check`, and owner replay
   evidence.
5. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
6. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, chosen
   `PR07B1 !-> PR09`, PR07B1A non-ancestry where required, old HOLD
   non-ancestry, clean PR05D only, PR15A-D after PR14B, and no fallback-tail
   PR05D.
7. Run held owner comparisons for strict projection, common-blocks, rich-text,
   search/live-collapse, and reload candidates before creating new product rows.
8. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
9. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
10. Treat the latest duplicate/noise scheduler analysis and the current fuzz
   root as control-plane/fuzz health, not product validation or final-stack
   readiness.
11. After PR07 decision-fork owner evidence, exact branch-link audit for
   missing rows, PR02B validation, reload-marker replay/downscope, and seed
   `1020002` repair or reclassification land, rebuild the combined validation
   stack from explicit Cycle325/i40 heads plus accepted epoch work, then run
   focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, feasible runtime
   checks, and fresh stack-wide validation.

Useful bounded work now:

- run a bounded `PR07B0B-195150` split audit and replay seed `966001`;
- run one bounded PR07 setup-bypass owner replay with non-hanging plugin/config
  checks and hard timeouts;
- reap/report Cycle 390 PR02B if it remains stopped or reportless, then rerun
  seed `1030001`, HTTP probe, and targeted PHPUnit with shorter timeouts;
- harden progress gates so reportless jobs, zero-byte reports, header-only
  TSVs, setup-only output, and stopped child processes never count as progress;
- patch duplicate/noise producer-side canary handling in the novelty monitor
  before restarting additional browser producers;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw PR07D, raw deferred publication, PR17, PR18, PR18x promotion,
reload-marker product promotion before replay, or extra browser lanes.
