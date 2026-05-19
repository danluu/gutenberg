# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T00:37:54Z`

Trigger event:
`pr-split-2026-05-19T00-32-39Z-20260519T002200Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-19T00-32-39Z-20260519T002200Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Still blocked and not fileable as a final stack, but not blocked for independent
progress. The newest split-persona synthesis,
`pr-split-20260519T002200Z-synthesis.md`, keeps the ready/local lane and
CRDT/data-loss lane as the maintainer-facing target shape, while treating PR07
and strict `117126135e5e` as owner-comparison queues, not setup-wait work. Do
not serialize that work behind another readiness-repair job or behind seed
`1020002`.

The old linear `PR07 -> PR17 -> PR18/PR18x` tail remains rejected. `PR02B`,
the PR07 arms, `DIAG-*`, strict `117126135e5e`, `PR17`, `PR18`, and `PR18x`
stay outside filing until they have owner evidence, clean refs, and verified
branch links.

Current replacement shape:

```text
Ready/local maintainer-facing lane:
PR01 -> PR02
  + PR02A ready sidecar
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D
  + PR06E ready sidecar from PR06D

Non-fileable PR07 owner-comparison fork:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0
  compare PR07B0A-155713, PR07B0B-195150, PR07B0C-201201,
  PR07B0D-215248, clean blocked PR07B0E-233340, and HOLD-07C
  against PR03B, PR05B, PR05C, clean PR05D, PR14, and canonical PR15D

CRDT/data-loss maintainer-facing lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0-B3 target
  (current audited maintainer-facing links are repaired PR13A/B/C)
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

PR07 is tracked as a runtime-gated owner-comparison fork, not as a fileable
row. The newest synthesis says Cycle408 readiness repair proved
`collaborationEnabled:true` and turned the key sentinels into post-readiness
oracle failures, so the next work is a bounded PR07 plus strict owner matrix,
not more readiness repair.

`PR07B0E-233340` may now be tracked as a clean blocked runtime-gated candidate
from the nonzero `20260518T235849Z` finalization, but it is not fileable. First
verify base/head/manifest/bundle agreement, verify the allowed clean PR07B0
base, and replay seed `6000007`. Ignore the zero-byte
`20260519T000852Z` finalization report.

Strict `117126135e5e` remains owner-unassigned. Run seed `5400020` through the
same bounded owner-matrix work across `PR03`, held `PR03B`, PR07 arms, `PR05B`,
`PR05C`, clean `PR05D`, `PR14`, and `PR15D`; do not name `PR18x` from
strict-expansion reductions until owner comparisons produce oracle-bearing rows.

`PR02B` remains blocked validation/downscope work. Let the existing Cycle408
PR02B job finish only if it is still active; if it exits without a nonzero
report, run exactly one bounded replacement after fixing the wp-env dev/test
port collision. Require owner/repro evidence or a downscope decision, PR CI,
and a verified branch-link audit before filing.

The latest novelty input has now completed a pass for the new coverage root.
Active current-run scope has no visible likely-real signal, but there are also
zero active current-run dirs; the current-drain scope has one product-evidence
signature with no likely-real visibility. The latest trend packet remains the
graph-backed health snapshot: high browser-E2E yield, four unmet coverage
goals, high CPU/load, and no basis for broad new browser concurrency. New work
should stay bounded and oracle-specific.

The newest duplicate/noise feedback action,
`duplicate-noise-20260518T235517Z-feedback-action.md`, implemented the bounded
fuzzer-side remediation for that leak in
`bin/rtc-browser-fuzz-novelty-monitor.mjs`: group-scoped product-evidence
duplicate holds now include `unknown`, representatives are counted by semantic
family, visible likely-real failures veto the hold, and a current-run
product-evidence duplicate hold blocks coverage-guidance Codex launch while a
represented/family-capped duplicate family is active. This preserves product
evidence visibility and remains fuzz/control-plane health work, not product
validation or PR readiness.

Current non-fileable queues and blockers:

- `PR02B` is out of the fileable ready/local lane until the seed `1030001`
  base/head nonreproduction is explained or downscoped.
- PR07 arms are sibling owner candidates after `PR07B0`, not sequential PRs.
  Run the owner matrix now that readiness is no longer the gating blocker.
- Parser, linebreak, rich-text, search/live-collapse, and reload reductions
  still require owner comparison against PR05B, PR05C, clean PR05D, the PR07
  queue, PR14, and canonical PR15D before promotion.
- Do not start broad final-stack fuzzing, stack filing, or final PR
  publication until PR07 owner replay, PR02B ownership/downscope,
  PR15 final-PR14B materialization, exact branch links, reload-marker
  downscope, seed `1020002` handling, and rebuilt final-stack validation are
  no longer blocking.

## Branch And Ref Status

Remote status was collected at `2026-05-19T00:37:49Z`.

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

The branch-link audit was generated at `2026-05-19T00:37:54Z` from fetched
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
verified branch link are not file-ready. The proposed maintainer-facing rows
are the ready/local lane and the CRDT/data-loss lane; PR02B and the PR07 queue
are tracked as blockers, not proposed filing rows.

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

These rows are not in the fileable split. They stay here so the PR02B and PR07
owner gates are easy to scan.

| Queue item | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR02B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | moved out of fileable split; seed `1030001` base/head boundary still needs owner/repro explanation or downscope, then PR CI and verified branch link |
| PR07A1/A2/A3 | Save response guard microheads | No verified branch link yet | TBD | TBD | non-fileable setup for PR07 owner comparison; exact refs and owner evidence missing |
| PR07B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | decision base for the PR07 queue; compare PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, clean blocked PR07B0E-233340, and HOLD-07C |
| PR07B0A-155713 | Saved-CRDT hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable owner candidate from earlier cycles; raw `155713` full-stack ref must not be pushed |
| PR07B0B-195150 | Persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable owner candidate; owner replay and verified GitHub branch link are still missing |
| PR07B0C-201201 | Corrected persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable sibling owner candidate; current-run audit passed, but owner replay and verified GitHub branch link are still missing |
| PR07B0D-215248 | Clean PR07B0-based derived-content authority arm | No verified branch link yet | TBD | TBD | active clean B0D comparison arm; run owner matrix seeds `966001`, `990001`, `1020001`, and `6000007` before promotion |
| PR07B0E-233340 | Clean blocked runtime-gated candidate from raw `233340` | No verified branch link yet | TBD | TBD | evidence-only; nonzero `20260518T235849Z` finalization may support tracking, but verify base/head/manifest/bundle agreement and replay seed `6000007`; ignore zero-byte `20260519T000852Z` |
| HOLD-07C | Held PR07C/runtime control arm | No verified branch link yet | TBD | TBD | comparison control only; stale ready PR07C refs are not fileable |

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
collected_at_utc: 2026-05-19T00:37:49Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T002227Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-19T00:37:36.333Z`. The monitor has completed a pass for the new root;
the status heartbeat was refreshed at `2026-05-19T00:37:36.333Z`, with metrics
from the most recent full pass at `2026-05-19T00:35:22.278Z`:

```text
output dir: run-20260519T002227Z
coverage files: 55491
total records seen: 90781
records processed this pass: 10
unmet goals: 4
quality issues: 0
current-run active dirs: 0
active current-run triage roots: 0
active current-run likely-real visible: 0
current-drain triage roots: 1
current-drain product-evidence signatures: 1
current-drain likely-real visible: 0
historical likely-real visible: 374
historical likely-real merged duplicates: 1448
historical duplicate share: 0.3408
enabled group: novelty-ws-async-server-blocks
headroom for adding groups: no
load1: 80.65 / 64 cores
memory free: 424.3 GB
```

Interpretation:

- Do not claim final-stack cleanliness. The active current-run scope has no
  visible likely-real signal, but there are no active current-run dirs; the
  drain scope has one non-visible product-evidence signature.
- The fuzz repo remains active validation infrastructure, not the final PR
  stack.
- Current fuzz health does not clear PR filing, PR07 owner replay, PR02B
  validation/downscope, PR15 final-PR14B materialization, reload-marker replay,
  seed `1020002`, exact branch-link gaps, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T00:26:19Z`:

```text
monitor passes: 2310
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-19T00:22:26Z
coverage files: 272 -> 55483
coverage files delta: 55211
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3409
summary startup failures last: 0
quality issues last: 0
memory free: 425.7 GB
load averages: 67.63 / 73.72 / 75.2 on 64 cores
enabled groups current in trend snapshot: novelty-ws-parser-transform
enabled group in latest novelty status: novelty-ws-async-server-blocks
latest fuzz level mix:
  browser-e2e=41 lanes/38 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5988162
browser-e2e likely-real findings: 778 over 2557.4 runner-hours
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
zero likely-real output. CPU/load are still high, so new fuzz work should stay
bounded and oracle-specific rather than increasing broad browser concurrency.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260519T002200Z-synthesis.md`, says the split should be updated to
consume the fresh readiness results. Ready/local and CRDT lanes remain the
target maintainer-facing shape. PR07 and strict `117126135e5e` are no longer
readiness-repair work; they are owner-comparison queues.

Latest split/persona statuses:

- Mark collaboration readiness unblocked and suppress duplicate readiness
  repair jobs.
- Run one bounded post-readiness owner-matrix job for PR07 and strict
  `117126135e5e`, rather than separate wait/repair jobs.
- PR07 matrix inputs are seeds `966001`, `1020001`, `990001`, plus `6000007`
  for the `PR07B0E` save-serialization candidate; compare `PR07B0`,
  `PR07B0A/B/C/D-215248/E-233340`, `HOLD-07C`, and controls `PR03B`, `PR05B`,
  `PR05C`, clean `PR05D`, `PR14`, and `PR15D`.
- Verify `PR07B0E-233340` by checking base/head/manifest/bundle agreement,
  confirming an allowed PR07B0 base, then replaying seed `6000007`. It remains
  non-fileable while that evidence is missing.
- Strict matrix input is seed `5400020` across `PR03`, `PR03B`, active PR07
  arms, `PR05B/C/D`, `PR14`, and `PR15D`.
- Required owner-matrix outputs are `report.md`, `classification.tsv`,
  `replay-runs.tsv`, `first-divergence.tsv`, and `owner-matrix.tsv`.
- Let Cycle408 PR02B and reload-233340 jobs finish only if still active. Their
  named `report.md` files were missing at synthesis time, so they cannot clear
  gates; if they exit without nonzero reports, run exactly one bounded
  replacement. For PR02B, fix the wp-env dev/test port collision first.
- Keep pre-save search/live-collapse and rich-text suffix as diagnostic
  replay/downscope work; linebreak/parser/rich-text reductions must compare
  `PR05B`/`PR05C`/clean `PR05D` before late-slot ownership.

Cycle410 targeted job called out by the latest synthesis:

```text
rtc-cycle410-pr07-strict-post-readiness-owner-matrices
```

Do not launch broad fuzzing. Do not count active sessions, zero-byte reports,
`report.tmp`, stale manifests, raw deferred heads, wait-only feedback,
setup-only output, or all-`not-run` matrices as progress while independent
actionable rows remain.

The newest duplicate/noise feedback action,
`duplicate-noise-20260518T235517Z-feedback-action.md`, completed that narrow
scheduler-side change in `bin/rtc-browser-fuzz-novelty-monitor.mjs`.
Validation passed `node --check`; stale old-root HTTP duplicate input was
rejected by the triage watcher; the current active-root gate-only triage had
`candidates=0`, `signatures=0`, `active=0`, and no startup/duplicate leakage;
the current live-analysis once result was
`novelty-ws-parser-transform:skipped-analysis-no-actionable-signature`. The
novelty, supervisor, analysis, and watchdog sessions were restarted. The later
novelty pass shows no active current-run likely-real visibility, but it also
has zero active current-run dirs and only one current-drain product-evidence
signature, so this remains bounded capacity-control evidence only. It does not
globally suppress product-evidence `timeout` or `unknown`, and it is not
product validation.

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
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | moved out of the fileable split; owner/repro boundary or downscope remains missing, and the existing reportless job cannot clear gates | If the Cycle408 job exits without a nonzero report, fix the wp-env port collision and run one bounded replacement, then require owner/repro evidence or downscope, PR CI, and exact branch-link audit before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, PR07B0E-233340 candidate, HOLD-07C, reload/provider evidence | non-fileable owner-comparison fork; readiness is no longer the blocker, but owner evidence and verified refs are missing | Run the bounded PR07/strict owner matrix using seeds `966001`, `1020001`, `990001`, and `6000007`; require clean refs, first-divergence evidence, and branch audit before promotion |
| PR07B0E-233340 | clean blocked candidate from raw `233340` | evidence-only; nonzero `20260518T235849Z` may justify tracking, zero-byte `20260519T000852Z` is ignored | Verify base/head/manifest/bundle agreement, allowed PR07B0 base, then replay seed `6000007` and compare with B0B/C/D |
| Historical PR07 controls / failed raw reload refs | raw `203210`, raw `210726`, raw `231829`, raw `233340`, `PR07B0D-205218`, `PR07B0D-212232`, `PR07B0D-213739`, and related manifests | out of the active fork; `PR07B0D-215248` supersedes older B0D variants, and raw validation-stack heads are not pushable product refs | Reconsider only after clean allowed-base restack/audit plus owner replay justifies promotion |
| PR07D / PR17 / PR18 / PR18x | reload/post-save/rejoin residuals and old linear tail | rejected for the current split | Reconsider only after owner replay proves a product-owned boundary not covered by the accepted PR07 fork |
| DIAG reload/search/rich-text diagnostics | `DIAG-HTTP-REJOIN-220755`, `DIAG-RELOAD-220755`, `DIAG-RELOAD-225820`, `DIAG-SEARCH-225317`, `DIAG-RICHTEXT-230324`, `DIAG-RICHTEXT-232836` | diagnostic/test side lanes only; nonzero finalization reports add evidence but no product PR | Run focused first-loss replay before assigning reload, search, rich-text, or rejoin product ownership |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the PR07 owner queue, holds, PR14, and canonical PR15D before assigning any new owner row |
| Revision-restore strict signal | `117126135e5e`, PR03, held PR03B, PR07 arms | owner-comparison target only; not a split row or product fix by itself | Include seed `5400020` in the bounded PR07/strict owner matrix, then compare against PR03, held PR03B, PR07 arms, and lower controls before claiming a new owner boundary |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06, PR06A prior-art, and PR06B progress refs are verified; active PR06A-D and PR06E still have no exact verified micro-split links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, accepted PR07 fork non-ancestry where required, old HOLD non-ancestry, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B, PR15A/B/C-on-PR14B, and PR15D | branch-link audit verifies PR15A-C component prior art, but no exact final-PR14B materialized refs or PR15D endpoint link | Publish/fetch/audit exact PR14B-based refs, resolve PR15D, confirm ancestry, and require nonzero materializer/audit evidence |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only; do not wait on it before running independent PR07/PR02B/strict-owner work | Repair or explicitly reclassify before final-stack validation and filing |
| Reload marker/lifecycle work | HARNESS reload markers, seeds `990001`/`990003`, same-user lifecycle seeds, PR07C seeds, deferred reload outputs | harness/diagnostic only until replay proves product ownership | Consume PR07 owner replay when present, then require product-owned first-loss boundary before promotion |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, startup-noise cooldowns, family-capped duplicate holds, current-run negative gates, represented product-evidence duplicates | narrow scheduler-side remediation is implemented and restarted; current gate-only/live-analysis checks show no active duplicate/startup leakage, and the latest novelty pass has no active current-run likely-real visibility, but also no active current-run dirs | Add only explicit group-scoped entries if another producer shows the same represented duplicate behavior; do not treat this as product validation |
| Current fuzz validation | `run-20260519T002227Z`, novelty status at `2026-05-19T00:37:36.333Z`, trend generated at `2026-05-19T00:26:19Z` | latest novelty pass has `55491` coverage files, `90781` total records, `4` unmet goals, `0` active current-run likely-real visible, `1` current-drain product-evidence signature with `0` likely-real visible, and no headroom for new groups; latest graph trend has `55483` coverage files, historical duplicate share `0.3409`, and browser-E2E `778` historical likely-real findings over `2557.4` runner-hours | Use as health/control-plane evidence only; still require owner replay, PR02B ownership/downscope, PR15 final-PR14B audit, exact branch audit, reload-marker downscope, seed `1020002` handling, and final PR-stack validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw `155713`, raw
`PR07B0B-195150`, raw `PR07B0C-201201`,
`PR07B0D-205218`/`212232`/`213739` historical controls, raw
`PR07B0D-215248`, raw `203210`, raw `210726`, raw `231829`, raw `233340`,
raw PR07D, raw `HOLD-07C`, PR17, PR18, PR18x, zero-byte finalization output,
header-only push manifests, or local finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement fileable shape above: ready/local lane plus
   CRDT/data-loss lane. PR02B and PR07 are blocked queues, not proposed filing
   rows.
2. Treat PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, clean blocked
   PR07B0E-233340, and HOLD-07C as sibling owner candidates. Require
   oracle-bearing owner replay outputs, first-divergence evidence, clean
   materialized refs, exact branch links, and `git diff --check` before
   promoting any PR07 arm.
3. Do not file PR02B before the seed `1030001` base/head nonreproduction is
   explained or downscoped, then PR CI and verified GitHub branch-link audit
   pass.
4. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
5. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   PR15A/B/C/D after final PR14B materialization, and no fallback-tail PR05D.
6. Run held owner comparisons for strict projection, common-blocks, rich-text,
   search/live-collapse, revision-restore `117126135e5e`, and reload
   candidates before creating new product rows.
7. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
8. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
9. Treat the latest duplicate/noise producer/admission analysis and the current
   fuzz root as control-plane/fuzz health, not product validation or
   final-stack readiness.
10. After PR07 owner evidence, exact branch-link audit for missing rows, PR02B
   validation/downscope, PR15 final-PR14B materialization, reload-marker
   replay/downscope, strict `117126135e5e` comparison if it remains
   product-owned, and seed `1020002` repair or reclassification land, rebuild
   the combined validation stack from explicit Cycle325/i40 heads plus accepted
   epoch work, then run focused checks, touched-file lint, branch
   graph/containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

Useful bounded work now:

- run `rtc-cycle410-pr07-strict-post-readiness-owner-matrices`, producing
  `report.md`, `classification.tsv`, `replay-runs.tsv`,
  `first-divergence.tsv`, and `owner-matrix.tsv`;
- let the Cycle408 PR02B and reload-233340 jobs finish only if still active;
  if their named reports remain missing or zero-byte, run exactly one bounded
  replacement and fix the PR02B wp-env dev/test port collision first;
- monitor the implemented represented product-evidence duplicate-family hold on
  the current root; the latest pass has no active current-run likely-real
  visibility but also no active current-run dirs, so keep treating it as
  control-plane evidence;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw deferred publication/replay, raw PR07D, raw `HOLD-07C`, PR17,
PR18, PR18x promotion, diagnostic product promotion before focused first-loss
replay, broad consumer duplicate/noise suppression, or extra browser lanes.
