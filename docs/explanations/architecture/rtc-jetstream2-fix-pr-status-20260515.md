# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T00:04:39Z`

Trigger event:
`pr-split-2026-05-19T00-04-00Z-20260518T235127Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-19T00-04-00Z-20260518T235127Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Still blocked and not fileable as a final stack. The newest split-persona
synthesis, `pr-split-20260518T235127Z-synthesis.md`, keeps the Cycle406
replacement split and rejects the old linear `PR07 -> PR17 -> PR18/PR18x`
tail. The fileable maintainer-facing rows remain the ready/local lane and the
CRDT/data-loss lane; `PR02B`, PR07 arms, `DIAG-*`, strict `117126135e5e`,
`PR17`, `PR18`, and `PR18x` stay outside filing until they have owner
evidence, clean refs, and verified branch links.

PR07 is still tracked as the runtime-gated owner-comparison fork, not as a
fileable row. `PR07B0D-215248` remains the active clean B0D comparison arm;
older `PR07B0D-205218`, `PR07B0D-212232`, and `PR07B0D-213739` are historical
controls. Raw `deferred/rtc-reload-hydration-20260518T231829Z` remains
evidence for `PR07B0D-215248`, but it is stack-based and must not be
published. Raw `deferred/rtc-reload-hydration-20260518T233340Z` is new
evidence only: its manifest is based on validation-stack `72854f05ed...`, not
clean `PR07B0`, so track it only as pending audit candidate
`PR07B0E-233340` until it is restacked, audited, and compared against
`PR07B0B/C/D`.

The latest PR07 readiness evidence is setup-blocked before oracle. Earlier
evidence reached the editor with `collaborationEnabled:null`; the Cycle406
shared readiness report is now terminal `setup-smoke-failed`, and the PR07B0
seed `966001` plus strict seed `5400020` sentinels did not run. No PR07 arm is
fileable, and the full owner matrix must wait until a repaired readiness job
proves PHP `wp_is_collaboration_enabled()` and browser
`window._wpCollaborationEnabled === true`.

Strict `117126135e5e` remains owner-unassigned. Do not name `PR18x` until seed
`5400020` reaches oracle-bearing rows across PR03/held PR03B, the PR07 queue,
PR05B, PR05C, clean PR05D, PR14, and canonical PR15D.

The `20260518T225829Z`, `20260518T232839Z`, and `20260518T233843Z`
finalization reports are nonzero, but they add only evidence. Keep
`DIAG-HTTP-REJOIN-220755` / `DIAG-RELOAD-220755`, `DIAG-RELOAD-225820`,
`DIAG-SEARCH-225317`, and `DIAG-RICHTEXT-230324` / `DIAG-RICHTEXT-232836` as
diagnostic/test side lanes until focused replay identifies a repeatable
product-owned first-loss boundary.

The latest novelty status for `run-20260518T225956Z` was updated at
`2026-05-19T00:04:13.461Z`. It reports `55460` coverage files, `90753` total
records seen, `31` current-run HTTP `persistence-no-title` records, `4` unmet
coverage goals, `0` current-run actionable signatures, `0` current-run
likely-real visible signatures, current duplicate share `0`, and historical
duplicate share `0.3409`. This is fuzz/control-plane health, not final-stack
validation.

The latest trend packet was generated at `2026-05-18T23:59:12Z`: `55455`
coverage files at the latest snapshot, `4` unmet goals, duplicate share
current `0`, historical duplicate share `0.3409`, browser-E2E `778`
likely-real findings over `2547.2` runner-hours, `41` browser-E2E lanes across
`38` groups, and `5975201` total fuzz-level test executions. CPU/load remain
high, so new work should stay bounded and oracle-specific rather than adding
broad browser concurrency.

The newest duplicate/noise synthesis,
`duplicate-noise-20260518T234438Z-synthesis.md`, says the old strict
no-product startup-noise leak is mostly fixed in the normal pipeline. The
current active leak is product-evidence duplicate handling:
`novelty-http-persistence-probe` is still consuming capacity on current-run
HTTP `timeout` signatures that are non-actionable and family-capped with
`0` visible likely-real failures. The next control-plane fix should add a
narrow represented product-evidence duplicate-family hold while preserving one
current representative and all product evidence. This is a fuzz/control-plane
capacity issue, not product validation.

Current replacement shape and filing status:

```text
Fileable ready/local lane:
PR01 -> PR02
  + PR02A ready sidecar
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D
  + PR06E ready sidecar from PR06D

Non-fileable PR07 owner-comparison fork:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0
  compare PR07B0A-155713, PR07B0B-195150, PR07B0C-201201,
  PR07B0D-215248, HOLD-07C, and PR07B0E-233340 if it survives
  restack/audit

Fileable CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3 target
  (current audited maintainer-facing links are repaired PR13A/B/C)
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

PR13 source-family review still wants the finer `PR13B0 -> PR13B1 -> PR13B2
-> PR13B3` split, but the branch-link audit currently verifies only repaired
PR13A/B/C review refs. Use those repaired PR13A/B/C links as the current
maintainer-facing PR13 content until PR13B0-B3 refs are published, fetched, and
audited.

Current non-fileable queues and blockers:

- `PR02B` is no longer part of the fileable ready/local lane. It remains a
  blocked validation/ownership item because seed `1030001` passed on both
  PR02B and the PR02 base; the next bounded work is
  `rtc-cycle408-pr02b-base-nonrepro-downscope`, then owner/repro explanation
  or downscope, PR CI, and a verified branch-link audit.
- `PR07B0A-155713`, `PR07B0B-195150`, `PR07B0C-201201`,
  `PR07B0D-215248`, and `HOLD-07C` are sibling owner candidates after
  `PR07B0`, not sequential PRs and not fileable PR rows. Cycle400 produced
  `36/36` `blocked-before-oracle` rows, later readiness evidence remained
  blocked on `collaborationEnabled:null`, and Cycle406 readiness is now
  terminal `setup-smoke-failed` with the PR07/strict sentinels not run. Raw
  `231829` is evidence-only for `PR07B0D-215248`; raw `233340` is evidence-only
  pending clean restack/audit as possible `PR07B0E-233340`.
- Failed `PR07B0D-203210`, raw `210726`, raw PR07D, raw deferred reload heads,
  stale PR07C ready refs, raw `HOLD-07C`, `PR07B0D-205218`/`212232`/`213739`
  controls, raw `233340`, PR17, PR18, and PR18x stay out of the active
  fileable split.
- Parser, linebreak, rich-text, search/live-collapse, and reload reductions
  still require owner comparison against PR05B, PR05C, clean PR05D, the PR07
  queue, PR14, and canonical PR15D before promotion.
- The branch-link audit verifies several aggregate/prior-art branches, but the
  active micro-split rows remain unfileable where they say
  `No verified branch link yet`.
- Do not start broad final-stack fuzzing, stack filing, or final PR publication
  until PR07 readiness and owner replay, PR02B ownership/downscope,
  PR15 final-PR14B materialization, exact branch links, reload-marker downscope,
  seed `1020002` handling, and rebuilt final-stack validation are no longer
  blocking.

## Branch And Ref Status

Remote status was collected at `2026-05-19T00:04:33Z`.

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

The branch-link audit was generated at `2026-05-19T00:04:39Z` from fetched
`danluu` refs. A row marked `verified-content` means the branch exists on
`danluu` and has a non-empty audited diff against the listed base. It does not
prove exact Cycle325/i40 publication shape, ancestry, owner evidence, or filing
readiness.

The audit now also verifies aggregate or progress links for PR05, PR06, PR06A,
PR06B progress, PR07A, PR07B, PR08, PR11, PR12, and PR15A-C component
branches. Those links are listed below as prior-art/progress rows only where
the active micro-split still needs exact branch publication or owner evidence.

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
verified branch link are not file-ready. The current proposed fileable rows are
the ready/local lane and the CRDT/data-loss lane only; PR02B and the PR07 queue
are tracked below as blockers, not proposed filing rows. The newest synthesis
keeps PR07 as part of the replacement split design, but still runtime-gated and
not fileable.

### Common Mainline

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | Ready sidecar after PR2 | No verified branch link yet | TBD | TBD | active sidecar; not file-ready until pushed, fetched, and audited |
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

### Blocked Owner-Comparison Queue

These rows are not in the fileable split. They stay here so the PR07 owner gate
is easy to scan.

| Queue item | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR02B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | moved out of fileable split; needs seed `1030001` owner/repro explanation or downscope, then PR CI and verified branch link |
| PR07A1/A2/A3 | Save response guard microheads | No verified branch link yet | TBD | TBD | non-fileable setup for PR07 owner comparison; exact refs and owner evidence missing |
| PR07B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | decision base for the PR07 queue; compare PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, HOLD-07C, and PR07B0E-233340 only if readiness passes and B0E survives restack/audit |
| PR07B0A-155713 | Saved-CRDT hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable owner candidate from earlier cycles; raw `155713` full-stack ref must not be pushed |
| PR07B0B-195150 | Persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable owner candidate; owner replay and verified GitHub branch link are still missing |
| PR07B0C-201201 | Corrected persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable sibling owner candidate; current-run audit passed, but owner replay and verified GitHub branch link are still missing |
| PR07B0D-215248 | Clean PR07B0-based derived-content authority arm | No verified branch link yet | TBD | TBD | active clean B0D comparison arm; Cycle400 replay produced `36/36` `blocked-before-oracle` rows, readiness remains blocked, and raw `231829` is evidence-only |
| PR07B0E-233340 | Pending reload/provider candidate from raw `233340` | No verified branch link yet | TBD | TBD | evidence-only; validation-stack base `72854f05ed...` is not clean PR07B0, so restack/audit and compare with B0B/C/D before any product claim |
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
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-D; needs final-PR14B materialization/audit |
| PR 15A-on-PR14B | Fallback-group move green on PR14B | No verified branch link yet | TBD | TBD | exact final-PR14B ref still missing; header-only push manifest is not progress |
| PR 15B-on-PR14B | Fallback-group insert-anchor green on PR14B | No verified branch link yet | TBD | TBD | exact final-PR14B ref still missing; needs nonzero materializer/audit report |
| PR 15C-on-PR14B | Fallback-group delete green on PR14B | No verified branch link yet | TBD | TBD | exact final-PR14B ref still missing; needs nonzero materializer/audit report |
| PR 15D | Canonical PR15 endpoint after PR15C | No verified branch link yet | TBD | TBD | lower-control endpoint still unresolved; old divergent refs are not filing proof |

### Verified Fallbacks And Prior Art

These rows have verified audit links, but they are not the exact active
micro-split PR rows unless the status says so.

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
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; not the exact final-PR14B materialized ref |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; not the exact final-PR14B materialized ref |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not the exact final-PR14B materialized ref and not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T00:04:33Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T225956Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-19T00:04:13.461Z`. This is fuzz/control-plane health, not
final-stack validation.

Current root health:

```text
output dir: run-20260518T225956Z
coverage files: 55460
total records seen: 90753
records processed this pass: 5
current-run records: 31
current-run successful records: 27
current-run profile: persistence-no-title
current-run transport: http
active run dirs: 1
enabled groups: novelty-http-persistence-probe
```

Interpretation:

- Current-run triage has `0` actionable signatures, `0` product-evidence
  signatures, and `0` likely-real visible signatures. There are `3` raw
  timeout signatures, all non-actionable and family-capped; raw
  product-evidence records remain visible.
- Coverage guidance still has `4` unmet goals, all in save/reload and
  real-user depth. Recommended groups remain WS real-user save/reload, editing,
  and rich-text, but reusable startup-noise cooldowns and duplicate-family
  holds skipped re-enabling those noisy producers while preserving current
  product-evidence visibility.
- Historical duplicate/noise remains dominated by old startup/no-product and
  high-volume families and must not be presented as live product failure.
- Current duplicate share is `0`; historical duplicate share is `0.3409` in
  the novelty monitor and the latest trend packet.
- This status does not clear PR filing, PR07 owner replay, PR02B validation,
  PR15 final-PR14B materialization, reload-marker replay, seed `1020002`,
  exact branch-link gaps, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-18T23:59:12Z`:

```text
monitor passes: 2307
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T23:56:51Z
coverage files: 272 -> 55455
coverage files delta: 55183
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3409
summary startup failures last: 0
quality issues last: 0
memory free: 422 GB
load averages: 87.35 / 80.73 / 77.43 on 64 cores
enabled groups current: novelty-http-persistence-probe
latest fuzz level mix:
  browser-e2e=41 lanes/38 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5975201
browser-e2e likely-real findings: 778 over 2547.2 runner-hours
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
and high browser E2E yield. Current-run likely-real output is clean, but
represented HTTP timeout duplicates are still consuming capacity and should be
handled as control-plane policy, not as product validation or final-stack
evidence.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T235127Z-synthesis.md`, says the Cycle406 replacement split
is still the right active shape, but PR07, strict `117126135e5e`, PR02B, and
final-stack validation are blocked. Ready/local and CRDT remain the fileable
lanes once their missing refs and validation gates are satisfied. PR07 remains
a runtime-gated owner-comparison queue, not a fileable row. `PR02B`, `DIAG-*`,
strict `117126135e5e`, `PR17`, `PR18`, and `PR18x` are also outside the
fileable split.

Latest split/persona statuses:

- Keep `PR07B0D-215248` only as the active B0D comparison arm. It supersedes
  `PR07B0D-205218`/`212232`/`213739`, but it is not a PR row until owner
  evidence and a verified branch link exist. Raw
  `deferred/rtc-reload-hydration-20260518T231829Z` has the same stable
  patch-id, but its validation-stack base makes it evidence-only.
- Track raw `deferred/rtc-reload-hydration-20260518T233340Z` only as pending
  `PR07B0E-233340` evidence. Its report is newer than the previous
  finalization cycle, but the manifest base is validation-stack
  `72854f05ed...`, not clean `PR07B0`, so reject it as a pushable/product
  manifest until restack/audit and B0B/C/D comparison finish.
- PR07 readiness is still setup-blocked: Cycle400 owner replay produced
  `36/36` `blocked-before-oracle` rows, Cycle402 readiness remained blocked on
  `collaborationEnabled:null`, and the Cycle406 readiness report is now
  terminal `setup-smoke-failed` with PR07B0 seed `966001` and strict seed
  `5400020` not run. Do not count setup-smoke output, browser collaboration
  `null`, or sentinel `not-run` rows as progress.
- Strict `117126135e5e` remains unassigned. Do not name `PR18x` until seed
  `5400020` reaches oracle-bearing rows across PR03/PR03B, the PR07 queue,
  PR05B, PR05C, clean PR05D, PR14, and canonical PR15D.
- `DIAG-HTTP-REJOIN-220755` / `DIAG-RELOAD-220755`, `DIAG-RELOAD-225820`,
  `DIAG-SEARCH-225317`, and `DIAG-RICHTEXT-230324` / `DIAG-RICHTEXT-232836`
  stay diagnostic/test-only until focused first-loss replay proves product
  ownership. The nonzero `20260518T233843Z` finalization report adds
  `DIAG-RICHTEXT-232836` evidence only; it does not make PR07, PR02B, or strict
  restore fileable.
- `PR02B` is blocked on ownership/reproduction, not bootstrap. Seed `1030001`
  passed on PR02B and on the PR02 base, so the intended base/head failure
  boundary is missing until owner/repro evidence or a downscope decision
  explains it. The next independent bounded job should be
  `rtc-cycle408-pr02b-base-nonrepro-downscope`.
- Materialize and audit exact PR15 final-PR14B refs before treating
  `PR15A-on-PR14B -> PR15B-on-PR14B -> PR15C-on-PR14B -> PR15D` as final.
  Required evidence includes allowed base, branch/head/manifest agreement,
  adjacent diffstat/numstat, `git diff --check`, and focused CRDT validation.
- Keep loop hardening so active sessions, zero-byte reports, `report.tmp`,
  prompt-only outputs, all-`not-run` matrices, setup-smoke output,
  pre-oracle runtime output, disk-preflight-only reports, stale/fallback-tail
  PR05D manifests, stale `PR07C`, raw `PR07D`, raw deferred reload heads,
  PR17, PR18, PR18x, and active seed `1020002` do not satisfy progress while
  actionable independent rows remain.

Cycle406 current-run split work launched two bounded jobs:

```text
runs/20260518T232725Z/jobs/run-rtc-cycle406-shared-collaboration-readiness-single-plugin-repair.sh
  tmux: rtc-cycle406-shared-collaboration-readiness-single-plugin-repair
  output: runs/20260518T232725Z/jobs/outputs/rtc-cycle406-shared-collaboration-readiness-single-plugin-repair/report.md
  status: terminal setup-smoke-failed; PR07/strict sentinels not run

runs/20260518T232725Z/jobs/run-rtc-cycle406-progress-gate-no-wait-hardening.sh
  tmux: rtc-cycle406-progress-gate-no-wait-hardening
  output: runs/20260518T232725Z/jobs/outputs/rtc-cycle406-progress-gate-no-wait-hardening/report.md
  status: PASS
```

The next readiness job must fix only disposable replay setup until exactly one
Gutenberg plugin copy is active, PHP `wp_is_collaboration_enabled()` exists and
returns true, and browser `window._wpCollaborationEnabled === true`; then it
should rerun only the PR07B0 seed `966001` and strict seed `5400020` sentinels
before any full owner matrix. The separate `PR07B0D-215248` seed `6000007`
replay remains the next evidence job after readiness proves collaboration is
enabled; prepare it now but gate actual replay on the readiness sentinel.

The latest split synthesis also calls for independent bounded work instead of
waiting only on readiness or seed `1020002`: run
`rtc-cycle408-pr02b-base-nonrepro-downscope`, audit/restack raw `233340` as
possible `PR07B0E-233340`, and harden the progress gate so
`setup-smoke-failed`, `function_exists=false`, browser collaboration `null`,
sentinel `not-run`, zero-byte/stderr-only reports, stale manifests, fallback
PR05D manifests, raw PR07D, and active-but-terminal tmux sessions do not
satisfy progress.

The newest duplicate/noise synthesis,
`duplicate-noise-20260518T234438Z-synthesis.md`, says strict no-product
startup noise is mostly fixed in the normal pipeline. The remaining
control-plane issue is represented product-evidence duplicate handling: the
HTTP persistence probe is spending producer/browser capacity on non-actionable,
family-capped `timeout` signatures with no visible likely-real failure. Add a
narrow represented product-evidence family hold only after verifying there is a
current representative, active analysis job, completed analysis, or intentional
family-cap state; do not globally suppress `timeout`, `unknown`, or signatures
with user/action/save/reload/revision/operation-witness evidence.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance, and
old PR13 GitHub-ref caveats are superseded by the current branch-link audit,
the repaired PR13 review refs, the latest replacement split, and the latest
novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A/B/C-on-PR14B, PR15D | active proposed rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | moved out of the fileable split; fresh PR02B validation passed seed `1030001`, the short HTTP probe, and targeted PHPUnit on PR02B, but the PR02 base also passed seed `1030001`, so the owner/repro boundary is missing | Run `rtc-cycle408-pr02b-base-nonrepro-downscope`, then require owner/repro evidence or a downscope decision, PR CI, and exact branch-link audit before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, PR07B0E-233340 candidate, HOLD-07C, reload/provider evidence | non-fileable owner-comparison fork; PR07B0D-215248 is the active clean arm, but Cycle400 produced `36/36` `blocked-before-oracle` rows, earlier readiness was blocked from `collaborationEnabled:null`, Cycle406 readiness is now terminal `setup-smoke-failed`, and raw `231829`/`233340` are evidence-only | Repair setup, prove PR07B0 seed `966001` reaches `collaborationEnabled:true`, restack/audit `233340` if it remains relevant, then replay clean `PR07B0D-215248` seed `6000007` before any full owner matrix |
| Historical PR07B0D controls / failed raw reload refs | raw `deferred/rtc-reload-hydration-20260518T203210Z`, raw `deferred/rtc-reload-hydration-20260518T231829Z`, raw `deferred/rtc-reload-hydration-20260518T233340Z`, raw `210726`, `PR07B0D-205218`, `PR07B0D-212232`, `PR07B0D-213739`, and related manifests | out of the active fork; `PR07B0D-215248` supersedes older B0D variants, Cycle394 `203210` failed on both touched files, `231829` has the matching patch-id but wrong validation-stack base, and `233340` is only pending B0E audit evidence | Reconsider only after bounded conflict-resolution/downscope or restack/audit produces a clean allowed-base artifact with bundle/head/manifest agreement and owner replay justifies promotion |
| PR07D / PR17 / PR18 / PR18x | reload/post-save/rejoin residuals and old linear tail | rejected for the current split | Reconsider only after owner replay proves a product-owned boundary not covered by the accepted PR07 fork |
| DIAG-HTTP-REJOIN-220755 | source `deferred/rtc-reload-hydration-20260518T220755Z`, head `f50864062e0f`, base `72854f05ed...`, seed `6000034` | diagnostic side lane only; latest nonzero report downscopes the ack theory and does not promote product code | Continue with server storage/cursor response or joined-peer apply diagnostics before assigning any product PR row |
| DIAG reload/search/rich-text diagnostics | `DIAG-RELOAD-220755`, `DIAG-RELOAD-225820`, `DIAG-SEARCH-225317`, `DIAG-RICHTEXT-230324`, `DIAG-RICHTEXT-232836`, rich-text suffix diagnostics | diagnostic/test side lanes only; nonzero finalization reports add evidence but no product PR | Run focused first-loss replay before assigning reload, search, or rich-text product ownership |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the PR07 owner queue, holds, PR14, and canonical PR15D before assigning any new owner row |
| Revision-restore strict signal | `117126135e5e`, PR03, held PR03B, PR07 arms | owner-comparison target only; not a split row or product fix by itself; latest comparison produced no passing or restore-failure oracle rows | Repair runtime setup and rerun the bounded strict owner comparison for seed `5400020`, then compare against PR03, held PR03B, PR07 arms, and lower controls before claiming a new owner boundary |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06, PR06A prior-art, and PR06B progress refs are verified; active PR06A-D and PR06E still have no exact verified micro-split links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, accepted PR07 fork non-ancestry where required, old HOLD non-ancestry, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B, PR15A/B/C-on-PR14B, and PR15D | branch-link audit verifies PR15A-C component prior art, but no exact final-PR14B materialized refs or PR15D endpoint link; zero-byte finalization and header-only manifests do not count | Publish/fetch/audit exact PR14B-based refs, resolve PR15D, confirm ancestry, and require nonzero materializer/audit evidence |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only; do not wait on it before running independent PR07/PR02B/strict-owner work | Repair or explicitly reclassify before final-stack validation and filing |
| Reload marker/lifecycle work | HARNESS reload markers, seeds `990001`/`990003`, same-user lifecycle seeds, PR07C seeds, deferred reload outputs | harness/diagnostic only until replay proves product ownership | Consume PR07 owner replay when present, then require product-owned first-loss boundary before promotion |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, startup-noise cooldowns, empty materialization rescue, family-capped duplicate holds, current-run negative gates, live/analysis duplicate-family admission, represented product-evidence duplicates | cycle-222 no-product startup remediation is complete, but the latest active leak is represented product-evidence `timeout` duplicates in `novelty-http-persistence-probe` consuming capacity while remaining non-actionable/family-capped | Add a narrow represented product-evidence family hold with a current-representative guard; preserve product evidence and do not treat this as product validation |
| Current fuzz validation | `run-20260518T225956Z`, novelty status at `2026-05-19T00:04:13.461Z`, trend generated at `2026-05-18T23:59:12Z` | latest novelty status has `55460` coverage files, `90753` records, `31` current-run HTTP persistence records, `4` unmet goals, current duplicate share `0`, current likely-real visible `0`, and browser-e2e `778` historical likely-real findings over `2547.2` runner-hours | Use as health/control-plane evidence only; still require owner replay, PR02B ownership/downscope, PR15 final-PR14B audit, exact branch audit, reload-marker downscope, seed `1020002` handling, and final PR-stack validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw `155713`, raw
`PR07B0B-195150`, raw `PR07B0C-201201`,
`PR07B0D-205218`/`212232`/`213739` historical controls, raw
`PR07B0D-215248`, raw
`203210`, raw `210726`, raw `231829`, raw `233340`, raw PR07D, raw
`HOLD-07C`, PR17, PR18, PR18x, zero-byte finalization output,
header-only push manifests, or local finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement fileable split above: ready/local lane plus
   CRDT/data-loss lane only. PR02B and PR07 are tracked as blocked queues, not
   proposed filing rows.
2. Treat PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, possible
   PR07B0E-233340, and HOLD-07C as blocked sibling owner candidates. Keep
   failed `203210`, raw `210726`, raw `231829`, raw `233340`, raw PR07D, stale
   PR07C ready refs, raw `HOLD-07C`, historical `205218`/`212232`/`213739`
   controls, PR17, PR18, and PR18x out unless later restack/audit,
   conflict-resolution, or downscope work produces clean allowed-base evidence.
3. Do not file PR02B before the seed `1030001` base/head nonreproduction is
   explained or downscoped, then PR CI and verified GitHub branch-link audit
   pass.
4. Do not promote PR07 into the fileable split until PR07B0A/B/C/D, any
   surviving audited PR07B0E, and the hold/lower-control matrix have
   oracle-bearing owner replay outputs, first-divergence evidence, clean
   materialized refs, exact branch links, and `git diff --check`.
5. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
6. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   PR15A/B/C/D after final PR14B materialization, and no fallback-tail PR05D.
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
11. After PR07 readiness and owner evidence, exact branch-link audit for
   missing rows, PR02B validation, PR15 final-PR14B materialization,
   reload-marker replay/downscope, strict `117126135e5e` comparison if it
   remains product-owned, and seed `1020002` repair or reclassification land,
   rebuild the combined validation stack from explicit Cycle325/i40 heads plus
   accepted epoch work, then run focused checks, touched-file lint, branch
   graph/containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

Useful bounded work now:

- launch one bounded
  `rtc-cycle408-shared-collaboration-readiness-bootstrap-loader-repair` job:
  repair only disposable replay setup, prove one active Gutenberg plugin copy,
  prove PHP `wp_is_collaboration_enabled()` and browser
  `window._wpCollaborationEnabled === true`, then rerun only the PR07B0 seed
  `966001` and strict seed `5400020` sentinels before any full owner matrix;
- run `rtc-cycle408-pr02b-base-nonrepro-downscope`: replay seed `1030001`, the
  short HTTP persistence probe, and targeted PHPUnit after bootstrap, then
  decide whether PR02B is fileable, downscoped, or diagnostic-only;
- run `rtc-cycle408-reload-233340-audit-readiness-sentinel`: restack/audit
  commit `592b75cebf4` from raw `233340` onto clean `PR07B0`, emit branch
  audit and push manifest, and compare with `PR07B0B/C/D` before any product
  claim;
- prepare the `PR07B0D-215248` seed `6000007` replay, but gate actual replay on
  readiness proving collaboration enabled: treat raw
  `231829` only as evidence for clean `PR07B0D-215248`, then replay seed
  `6000007` with HTTP polling faults, save checkpoints, reload step 8, and
  final persistence oracle;
- keep `DIAG-RELOAD-220755/225820`, `DIAG-SEARCH-225317`, and
  `DIAG-RICHTEXT-230324/232836` diagnostic-only until focused replay proves a
  repeatable product-owned first-loss boundary;
- keep the completed `rtc-cycle406-progress-gate-no-wait-hardening` PASS in
  force so wait-only, active-session, zero-byte, setup-only,
  `blocked-before-oracle`, stale-manifest, and raw-PR07D-style artifacts never
  count as completed progress;
- run `rtc-cycle408-progress-gate-manifest-and-stale-report-hardening` so
  `setup-smoke-failed`, `function_exists=false`, browser collaboration `null`,
  sentinel `not-run`, stale manifests, fallback PR05D manifests, and
  active-but-terminal tmux sessions never count as completed progress;
- publish/fetch/audit exact GitHub refs for the active PR15A/B/C-on-PR14B
  rows only after a nonzero final-PR14B materializer/audit report, then resolve
  and audit the canonical PR15D endpoint;
- add the represented product-evidence duplicate-family hold for
  `novelty-http-persistence-probe` only after confirming a current
  representative exists; do not broaden suppression or hide product-evidence
  failures;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw `203210`, raw `210726`, raw `231829`, or raw `233340`
publication/replay, raw `PR07B0D-215248` publication before owner replay and
verified GitHub branch audit,
`PR07B0D-205218`/`212232`/`213739` promotion, raw PR07D, raw deferred
publication, raw `HOLD-07C`, PR17, PR18, PR18x promotion,
`DIAG-HTTP-REJOIN-220755` promotion before product-owned replay,
reload-marker product promotion before replay, `DIAG-RELOAD-220755/225820`,
`DIAG-SEARCH-225317`, or `DIAG-RICHTEXT-230324/232836` product promotion
before focused first-loss replay, broad consumer duplicate/noise suppression,
or extra browser lanes.
