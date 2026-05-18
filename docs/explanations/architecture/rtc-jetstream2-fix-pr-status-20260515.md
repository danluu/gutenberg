# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T02:51:22Z`

Trigger event:
`pr-split-2026-05-18T02-49-43Z-20260518T024108Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T02-49-43Z-20260518T024108Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis is
`pr-split-20260518T024108Z-synthesis.md`. It keeps the Cycle324 ungrouped i40
replacement split and supersedes the older grouped i40 shape. The completed
Cycle324 action pass also produced a non-Docker local manifest/audit artifact
with `43` manifest rows, `0` base/diff check failures, `0`
head/bundle/manifest failures, and bundle status `PASS`. That is useful local
branch/audit evidence, but it is not GitHub filing readiness: exact product
refs are still missing for many active rows, PR07 owner replay is still
runtime-gated, and the latest synthesis still asks for a fresh Cycle326
manifest/deferred refresh before filing.

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
  review units. The Cycle324 non-Docker audit passed locally for the ungrouped
  rows, but their audited aggregate refs remain prior art only until explicit
  sub-PR branches are published, fetched, and audited.
- Filing and broad final-stack fuzzing remain blocked by missing PR07 owner
  evidence, root disk space below the 2048 MB replay threshold (`712 MB` free
  at the latest exact prior split snapshot), seed `1020002`, and stale or zero-byte
  publication artifacts.
- The latest named zero-byte artifact is
  `20260518T024222Z/finalization.report.md`; it is not evidence.
- The Cycle322/Cycle324 PR07 replay evidence is still setup/header/preflight
  style only.
  Treat it as no PR07 owner evidence until it produces durable first-divergence
  artifacts for the current i40 refs.
- The latest split synthesis calls for bounded follow-up jobs only: a
  fresh Cycle326 non-Docker manifest/deferred refresh from the latest nonzero
  finalization work, root-space cleanup and one gated PR07 owner replay,
  loop progress-gate hardening, and rich-text PR05 owner-comparison dependency
  repair.
- The Cycle322 PR05B/PR05C/clean-PR05D owner comparison accepted the diagnostic
  cherry-pick on all three refs, but unit execution was blocked by the same
  missing `framer-motion` dependency. It assigns no PR18x owner.
- The latest novelty status for `run-20260518T024309Z` has completed a pass:
  `49229` coverage files, `76601` records seen, `5` unmet goals, active
  current-run likely-real visible `0`, and current-drain likely-real visible
  `0`. This is fuzz/control-plane health evidence, not final-stack validation.
- The latest completed duplicate/noise action implemented the bounded control-plane fix
  in `rtc-browser-fuzz-novelty-monitor.mjs`: explicit no-product
  `pre_action_bootstrap_stall` startup-noise cooldowns can now survive
  output-root rotation as producer scheduling cooldowns, while product-evidence
  bypasses remain preserved. The newest duplicate/noise synthesis still calls
  for bounded producer/scheduler and product-evidence duplicate-family caps; it
  does not change the product PR split.

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- Publish, fetch, and audit exact product refs for every active row that says
  `No verified branch link yet`.
- Refresh the non-Docker Cycle324 manifest/deferred audit from the latest
  nonzero finalization/deferred state before treating the replacement split as
  publishable.
- Recover root free space above 2048 MB from the latest reported `712 MB` and
  record before/after `df -m /` before any Docker/wp-env/browser PR07 replay.
- Run exactly one corrected i40 PR07 owner replay after readiness is true. It
  must compare `PR07B0`, `PR07B1`, `HOLD-07B2`, and `HOLD-07C` with
  `collaborationEnabled=true`, REST/meta, `_crdt_document`, edited record,
  Y.Doc/provider/awareness, and block-tree first-divergence snapshots.
- Keep stale Cycle293/Cycle306/local-publish rows, fallback-tail PR05D, raw
  PR07D, PR17, PR18, PR18x, wait-only output, active-session-only status,
  setup-only output, header-only TSVs, and zero-byte reports out of filing
  evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-18T02:51:14Z`.

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

The branch-link audit was generated at `2026-05-18T02:51:22Z` from fetched
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
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; local Cycle324 audit passed, exact branch still missing |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; local Cycle324 audit passed, exact branch still missing |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; local Cycle324 audit passed, exact branch still missing |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active i40 row; runtime owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active i40 row; rerun only after readiness is true |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active i40 row; held PR07B2 and PR07C branch from here |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; local Cycle324 audit passed, exact branch still missing |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; local Cycle324 audit passed, exact branch still missing |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; local Cycle324 audit passed, exact branch still missing |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; local Cycle324 audit passed, exact branch still missing |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; local Cycle324 audit passed, exact branch still missing |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; local Cycle324 audit passed, exact branch still missing |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; local Cycle324 audit passed, exact branch still missing |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; local Cycle324 audit passed, exact branch still missing |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13C is supporting fallback evidence |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13B is supporting fallback evidence |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-D |
| PR 15A | Fallback-group operation subhead `687a13` after PR14B | No verified branch link yet | TBD | TBD | replaces grouped PR15 as active split; local Cycle324 audit passed, exact PR14B-based link missing |
| PR 15B | Fallback-group operation subhead `17569a` after PR15A | No verified branch link yet | TBD | TBD | replaces grouped PR15 as active split; local Cycle324 audit passed, exact PR14B-based link missing |
| PR 15C | Fallback-group operation subhead `bcf1c4` after PR15B | No verified branch link yet | TBD | TBD | replaces grouped PR15 as active split; local Cycle324 audit passed, exact PR14B-based link missing |
| PR 15D | Fallback-group operation subhead `276709` after PR15C | No verified branch link yet | TBD | TBD | replaces grouped PR15 as active split; local Cycle324 audit passed, exact PR14B-based link missing |

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
collected_at_utc: 2026-05-18T02:51:14Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T024309Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` collected for this update was written at
`2026-05-18T02:48:16.547Z` for `run-20260518T024309Z`.

Current novelty numbers:

```text
coverage files: 49229
total records seen: 76601
records processed this pass: 104
current-run records: 1, in novelty-ws-multi-reload-lifecycle
unmet goals: 5
harness-work candidates: 0
active-scope triage signatures: 0
active-scope likely-real visible: 0
current-drain triage signatures: 1
current-drain product-evidence signatures: 1
current-drain likely-real visible: 0
current-drain top family: unknown
suppressed strict startup records in current drain: 0
historical likely-real visible: 282
historical raw top family: pre_action_bootstrap_stall, 21963
combined likely-real visible: 282
enabled groups: novelty-ws-three-user-late-join,
  novelty-ws-multi-reload-lifecycle
```

Interpretation:

- The active current-run scope has no visible likely-real signatures and no
  bootstrap-stall signatures. The current-drain scope contains one actionable
  product-evidence representative in an `unknown` family, but no visible
  likely-real signature and no suppressed strict startup records.
- Historical triage is still dominated by raw
  `pre_action_bootstrap_stall`, but that is historical/control-plane context,
  not a current product failure count.
- This is a current novelty/control-plane health pass, not final-stack
  validation, a validated PR stack, or filing readiness.

The latest trend packet was generated at `2026-05-18T02:37:51Z` from monitor
data through `2026-05-18T02:34:42Z`:

```text
monitor passes: 2178
coverage files: 272 -> 49146
coverage files delta: 48874
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3448
summary startup failures last: 0
quality issues last: 0
memory free: 415.5 GB
load averages: 83.67 / 75.96 / 71.26 on 64 cores
enabled groups in trend snapshot:
  novelty-ws-three-user-late-join
  novelty-ws-revision-persistence
  novelty-ws-revision-recovery
  novelty-ws-multi-reload-lifecycle
latest fuzz level mix:
  browser-e2e=29 lanes/29 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5482364
browser-e2e likely-real findings: 657 over 2020.0 runner-hours
latest suggested PR net LOC total: 2152
```

Largest unmet goals remain real-user/save-reload depth:

```text
reload-post-action: 1090/2000
title-save-reload: 546/1000
body-save-reload: 605/1000
real-user-editing success: 602/1000
ui-format-paragraph: 1808/2000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. Browser/E2E still dominates capacity, so top-offs
should be guarded by startup-stall, supervisor-state, materialization, and
product-evidence checks instead of simply adding browser concurrency.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T024108Z-synthesis.md`, says:

- The grouped i40 split should be replaced by the Cycle324 ungrouped i40
  shape from `finalized/cycle324-i40/*`.
- The completed Cycle324 ungrouped action pass produced a non-Docker local
  manifest/audit artifact with `43` manifest rows, `0` base/diff failures, `0`
  head/bundle/manifest failures, and bundle `PASS`.
- Replace grouped PR06, PR11, PR12, and PR15 with PR06A-D, PR11A-E, PR12A-C,
  and PR15A-D, plus the PR06E malformed-payload sidecar from PR06D.
- Treat stale Cycle293/Cycle306/local-publish rows, stale `ready/*`,
  fallback-tail PR05D, `d06e3528cbd`, raw PR07D, PR17, PR18, and PR18x as
  rejected filing material.
- Treat the Cycle322/Cycle324 PR07 replay evidence as no owner evidence while
  it has only setup/header/preflight output.
- Free `/` above 2048 MB from the latest reported `712 MB`, and record
  before/after `df -m /`.
- Run exactly one corrected i40 PR07 owner matrix over `PR07B0`, `PR07B1`,
  `HOLD-07B2`, and `HOLD-07C`, with `collaborationEnabled=true` and REST/meta,
  `_crdt_document`, edited-record, Y.Doc/provider/awareness, and block-tree
  first-divergence snapshots.
- Run a fresh Cycle326 non-Docker manifest/deferred refresh from the latest
  nonzero finalization work, newer than deferred queue/status
  `2026-05-18T02:39:53Z`. Required outputs remain `push-manifest.tsv`,
  `manifest-age.tsv`, `base-allowlist.tsv`, `head-bundle-manifest-check.tsv`,
  branch graph, adjacent range-diff/diffstat, bundle agreement, artifact
  verification, and deferred freshness checks.
- Repair the rich-text owner-comparison environment before assigning any
  PR18x owner.
- Harden the loop gate so active sessions, setup-only PR07 output,
  disk-preflight-only reports, zero-byte files such as
  `20260518T024222Z/finalization.report.md`, `report.tmp`, stale manifests, and
  header-only TSVs do not score as durable progress.
- Treat seed `1020002` as blocking final-stack fuzz, filing, and stack-wide
  validation only. It must not block independent branch/audit/deferred work.

The `pr-split-20260518T020732Z-feedback-action.md` action is the latest
completed split action:

- It updated remote `current-pr-split.md` to use the Cycle324 ungrouped shape.
- It patched the remote review loop so ungrouped PR06A-D, PR12A-C, and PR15A-D
  audit/manifest work counts as independent progress.
- It completed
  `rtc-cycle324-i40-ungroup-pr06-pr11-pr12-pr15-manifest-refresh`, with `43`
  manifest rows, `0` base/diff failures, `0` head/bundle/manifest failures, and
  bundle `PASS`.
- PR07 owner replay, root cleanup, PR18/PR18x, raw PR07D, broad fuzzing,
  GitHub filing, and duplicate seed `1020002` work remained deferred.

The latest duplicate/noise synthesis,
`duplicate-noise-20260518T022520Z-synthesis.md`, says strict no-product
`pre_action_bootstrap_stall` is mostly blocked at analysis consumers, but
producer/scheduler lag can still waste browser time before durable pause or
representative-cap state is enforced. The prior paired feedback action
implemented the first bounded cross-root startup-noise fix in the remote fuzz
repo:

- Reusable no-product `startup-noise` / `pre_action_bootstrap_stall` cooldowns
  now survive output-root rotation.
- Startup-stall imports and strict startup pauses now carry `noProductOnly`,
  `productEvidenceRecords`, and `preserveProductEvidence`.
- Product-evidence bypass no longer clears a matching no-product startup hold.
- `pauseGroup` can infer no-product startup metadata from explicit no-product
  startup reasons as a fallback.
- `node --check` passed for the changed monitor and related consumer scripts;
  the post-sentinel triage gate, analysis tier once-run, and live-analysis
  monitor once-run all exited `0`.
- The latest collected root `run-20260518T024309Z` now has a current pass with
  no active-scope likely-real signatures and no current-drain likely-real
  signatures, while one current-drain product-evidence representative remains
  visible.

Do not turn historical duplicate share into global signature suppression.
The remaining safe duplicate/noise work is producer/scheduler hardening,
durable `no-analysis` sentinels with `preserveProductEvidence: true`,
signal-safe policy persistence, strict runner startup predicate alignment if
needed, and early representative caps for product-evidence duplicate siblings.
This does not change the product PR split.

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
| i40 source family | `fresh-prset/iteration-40/*`, Cycle324 local ungrouped aliases, and Cycle324 local finalization outputs | active source family; the Cycle324 non-Docker manifest/audit artifact passed locally with `43` manifest rows and bundle `PASS`, but exact GitHub refs are still missing for many rows and the latest synthesis still asks for a Cycle326 deferred refresh | Refresh the Cycle324 manifest/deferred audit, then publish/fetch/audit exact refs |
| Zero-byte / stale publication artifacts | `20260518T024222Z/finalization.report.md`, local-publish rows, old Cycle293/Cycle306 rows | no evidence; do not use for filing or validation claims | Replace with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, and freshness evidence |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C; seeds `5200011`, `5200015`, `5200017`, `5200010`, `5200008`, `7110004`, `7110017`, `1100001`, and `1100002` | latest available replay output is setup/header/preflight only; `/` is `712 MB` free against the 2048 MB replay threshold; PR07B2 and PR07C remain held | Free root space, prove readiness, then run corrected i40 owner replay with first-divergence artifacts |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only after fresh PR07 replay proves red-at-held-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet; PR05B/PR05C/PR05D comparison blocked by missing `framer-motion` during unit execution | Publish/fetch/audit clean PR05D and fix the unit dependency before assigning any PR18x owner |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | local Cycle324 ungrouped audit passed; grouped PR06 has verified aggregate prior art only; active PR06A-D and PR06E have no exact verified links | Refresh deferred audit, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | latest replacement requires the CRDT/data-loss lane from PR06D, not PR07 | Prove `PR06D -> PR09`, `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | local Cycle324 ungrouped audit passed; grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; PR13B/C repaired links are fallback/supporting evidence | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | local Cycle324 ungrouped audit passed for PR15A-D shape; branch-link audit has verified PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | previous comparison kept residual suffix cases on the PR05 path and assigned no PR18x owner | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix | active sessions are not progress by themselves | Count only nonempty durable reports/artifacts or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise consumer cap | timeout/reload-rejoin current-run families | source-stable terminal family caps remain implemented and validated | Keep product-evidence representatives visible while avoiding duplicate analysis |
| Duplicate/noise producer leak | cross-output-root startup-noise scheduling and product-evidence duplicate-family capping | bounded cross-root startup-noise fix implemented; latest pass shows no active-scope bootstrap-stall signatures, while drain-scope product evidence remains visible and family-capped | Continue bounded producer/scheduler hardening and confirm product-evidence representatives stay eligible |
| Current fuzz validation | `run-20260518T024309Z` | current novelty/control-plane pass: `49229` coverage files, `76601` records, `5` unmet goals, active-scope likely-real `0`, current-drain likely-real `0`; no final-stack validation | Use only as fuzz/control-plane health until refreshed stack product evidence and final-stack validation exist |

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
2. Refresh the non-Docker Cycle324 manifest/deferred audit from the latest
   nonzero finalization/deferred state. Require
   `push-manifest.tsv`, `manifest-age.tsv`, `base-allowlist.tsv`,
   `head-bundle-manifest-check.tsv`, branch graph, adjacent
   range-diff/diffstat/numstat/patch-id, bundle agreement, artifact
   verification, and deferred freshness checks.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Treat the completed Cycle324 finalization report as source/finalization
   context only. It is not a GitHub push, and it does not clear the PR07 owner,
   seed-`1020002`, exact branch-link, or final-stack validation gates.
5. Treat `20260518T024222Z/finalization.report.md` and any other zero-byte
   report as no evidence.
6. Recover root space above 2048 MB from the latest reported `712 MB` and
   record before/after `df -m /` before any Docker/wp-env/browser PR07 replay.
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
    fuzzing. The bounded cross-root startup-noise cooldown fix is implemented,
    and the latest pass shows no active-scope bootstrap-stall signatures, but
    producer/scheduler hardening and duplicate-family caps remain bounded
    follow-up work.
13. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.
14. Treat novelty, trend, and duplicate/noise reports as fuzz/control-plane
    health and triage evidence. They are not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

The next useful bounded jobs are
`rtc-cycle326-cycle324-i40-finalization-manifest-refresh-after-deferred`,
`rtc-cycle326-rootspace-and-cycle324-pr07-owner-replay-unblock`,
`rtc-cycle326-rich-text-pr05-owner-comparison-env-repair`, and loop
progress-gate hardening. Gate the PR07 replay on root free-space recovery and
duplicate-session checks. Do not launch broad final-stack fuzz, a duplicate
seed `1020002` job, raw PR07D, PR17, PR18, or PR18x promotion.
