# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T15:37:34Z`

Trigger event:
`duplicate-noise-2026-05-17T15-36-50Z-132`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-17T15-36-50Z-132/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The latest split-persona synthesis
`pr-split-20260517T151727Z-synthesis.md` keeps the Cycle 278 topology as the
best current working hypothesis, but says it is not filing-ready or
final-fuzz-ready. All six split reports were nonzero and counted as evidence.

The active blocker is now reload/rejoin ownership evidence, not seed `1020002`
and not the old split decision:

- The Cycle 278 executor owner-path repair completed cleanly. Its proof reports
  `status: clean`, `syntax_status: pass`, `executor_restart: restarted`, and a
  regenerated live queue with only one gated row, `job-pr07c-browser-env`.
  Forbidden rows for `1020002`, `pr17-1020002`, `seed-5200005-reducer`,
  `seed-1060015-reducer`, stale PR06B, stale PR07C, split report signals, and
  PR18/PR18x product work are all zero after repair.
- The PR07B/PR07C reload/rejoin replay is still unresolved. Cycle 274 produced
  nonempty artifacts but classified `blocked-env`, so it proved neither PR07B
  coverage, PR07C coverage, nor PR07D need. The latest split synthesis still
  treats `rtc-cycle276-reload-pr07bc-continuation` as alive and missing final
  `report.md`, `classification.tsv`, `replay-comparison.tsv`, and
  `artifact-verification.tsv`.
- Do not add `PR07D` yet. Add `PR07D: reload/rejoin awareness recovery` after
  `PR07C` and before `PR09` only if a bounded PR07B/PR07C owner replay reaches
  the save/reload awareness phase and proves active PR07B/PR07C non-coverage
  for `06441205b872` / seed `1100002` or `d309f5c83a8e` / seed `1100001`.
- Seed `1020002` remains terminal/downscoped for product-branch purposes unless
  rebuilt validation produces fresh product-owned evidence. Do not launch a new
  `1020002` repair job from current evidence.
- Do not create PR17, PR18, or PR18x from current evidence. Parser/rich-text
  and linebreak reductions must compare PR05B/PR05C/PR05D before any late-tail
  owner can be named.

Current product spine, excluding runtime-gated and validation-only sidecars:

```text
PR01 -> PR02 (+ PR02A sidecar)
-> PR03 -> PR04 -> PR05A -> PR05B -> PR05C -> PR05D
-> PR06 -> PR06A -> PR07A -> PR07B
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14 -> PR14B
-> PR15A/B/C-on-PR14B
```

Current sidecar and validation-only shape:

```text
PR02A after PR02: HTTP room-isolation regression
PR03B after PR03: browser restoreRevision CRDT invalidation, runtime-gated
PR06B after PR07B: repaired malformed-save request-payload sidecar
PR07C after PR07B: reload record snapshots
validation heads: fetch-only evidence, not product PR links
```

The next non-product control-plane action recommended by the latest synthesis
is a bounded post-`20260517T150804Z` manifest/audit refresh, because older
manifests may predate deferred reload candidates they claim to cover. Do not
launch broad final-stack fuzzing, a duplicate PR07 replay, or any new
`1020002` job while the PR07 continuation and manifest/audit refresh are the
current gates.

This duplicate-noise event does not change the proposed PR split. It does
confirm that the bounded scheduler-control fix is active: novelty monitor
policy `17` preserves only unexpired explicit no-product startup-noise producer
cooldowns across output-root rotation, while current-run triage remains scoped
to the active root and product-evidence failures remain visible for bounded
analysis.

## Branch And Ref Status

Remote status was collected at `2026-05-17T15:37:29Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6A, PR 8, PR 15, fallback-group evidence, and
final branch claims unless it is deliberately copied into a clean evidence
worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T15:37:34Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

Use only these repaired audited PR13 review refs for current PR13 content:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link these stale or misordered PR13 refs as current PR content:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; local-machine ref exists but needs fetched `verified-content` audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR 3 | No verified branch link yet | TBD | TBD | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | replacement for old aggregate PR 5; needs verified branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine ref exists; GitHub verified-content link is still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine ref exists; linebreak/core-verse rows are PR05C-covered or downscoped, but GitHub verified-content link is still missing |
| PR 5D | Semicolonless entity/reference block validation after PR 5C | No verified branch link yet | TBD | TBD | Cycle 264 clean-base candidate is importable and included in the Cycle 266 validation head; publish/fetch/audit before filing |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save sidecar and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Malformed outgoing RTC save request-payload guard, revised against PR07B helper shape | No verified branch link yet | TBD | TBD | repaired PR06B-on-PR07B sidecar accepted by Cycle 274 manifest; Cycle 278 repaired stale PR06B executor regeneration; still needs verified branch link and validation before filing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A |
| PR 7C | Reload record snapshots sidecar after PR 7B | No verified branch link yet | TBD | TBD | accepted sidecar included in Cycle 266 fetch-only validation evidence; current reload/rejoin owner proof is still the blocking gate; do not file or name PR07D yet |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
| PR 11C | Explicit-base middle insert | No verified branch link yet | TBD | TBD | source-local evidence marks `a914c862c29e` / seed `5200005` covered here; verified-content link is still missing |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | TBD | TBD | progress-unblock manifest includes PR11A-E rows, but GitHub verified-content link is still missing |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; old `5200005` table-delete replay is PR12-covered |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first PR13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; maintainer-facing fallback until PR13B0/B1/B2/B3 are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; use instead of stale/misordered PR13C refs |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; seed `7110017` proves PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR 14 | No verified branch link yet | TBD | TBD | mandatory replacement topology; publish/fetch/audit before filing |
| PR 15A | Fallback group move stale reorder, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; old pre-PR14B audited branch is prior art only |
| PR 15B | Fallback group insert anchor, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; publish/fetch/audit before filing |
| PR 15C | Fallback group delete, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; include in validation-only sidecar but do not file until audited |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended PR05A/B/C/D
  split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation is
  the PR11A-E split.
- [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder),
  [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor), and
  [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete)
  are verified content for the pre-PR14B PR15 shape, not the recommended
  PR15A/B/C-on-PR14B replacement.

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T15:37:29Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T153426Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Raw `novelty-status.md` was updated at `2026-05-17T15:36:45.442Z` for
`run-20260517T153426Z`. Treat it as coverage/control-plane state, not as
final-stack validation, filing readiness, or a validated final-stack pass or
failure.

```text
coverage files: 45785
total records seen: 70753
current-run records: none
current-run successful records: none
current-run product-evidence signatures: 0
current-run likely-real visible: 0
current-run top duplicate family share: 0
current-run top family: none
historical product-evidence signatures: 10012
historical likely-real visible: 221
combined likely-real visible: 221
enabled group: novelty-ws-common-blocks
paused groups: real-user-save-reload, http-persistence-probe,
  real-user-editing, real-user-rich-text, parser-serialization,
  parser-transform, lifecycle, block-gauntlet
health: warning: no behavioral coverage files found under active output dir
unmet coverage goals: 7
resource snapshot: load1=57.43 on 64 cores, memory=425.5G free,
  headroom for adding groups=yes
```

The monitor recent-change log shows the policy survived another output-root
rotation. It preserved startup-noise cooldowns inside their six-hour windows,
skipped re-enabling noisy recommended real-user groups, cleared one stale
pause, reset active-current counters for the new root, and enabled
`novelty-ws-common-blocks` as the current unrelated productive fallback.
Preserve product-evidence failures for bounded analysis; the current active
root has no actionable or product-evidence signatures yet.

The latest trend packet was generated at `2026-05-17T15:27:52Z` from monitor
data through `2026-05-17T15:26:01Z`:

```text
monitor passes: 2019
coverage files: 272 -> 45610
coverage files delta: 45338
unmet coverage goals: 7
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3477
summary startup failures last: 0
quality issues last: 0
fuzz level mix: browser-e2e=26 lanes/26 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5289524
browser-e2e execution: 104679 cumulative / 864 per-hour
unit-property execution: 4753504 cumulative / 7168 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
browser-e2e likely-real findings: 575 over 1845.1 runner-hours
largest unmet goals: reload-post-action 1004/2000,
  ui-format-paragraph 1453/2000, title-save-reload 472/1000,
  body-save-reload 531/1000, real-user-editing success 561/1000
```

The trend packet is graph-derived input evidence, not an instruction and not a
product-bug count. Browser E2E remains the only level with confirmed
likely-real findings in the trend packet, but lower-level lanes are under-
triaged and should not be declared useless from zero likely-real output. Recent
load remains variable. Prefer startup-stall reduction, reload/rejoin duplicate
control, and bounded lower-level targets with clear oracles over broad browser
concurrency increases.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T151727Z-synthesis.md`. It says:

- The Cycle 278 topology remains the best split hypothesis.
- Filing and final-stack fuzz remain blocked by reload/rejoin ownership and
  manifest/audit freshness, not by more `1020002` work.
- `PR07D` is conditional only on successful PR07B/PR07C non-coverage proof.
- Stale `ready/rtc-pr06b-*`, stale `ready/rtc-pr07c-*`, raw reload branches,
  PR17, PR18, PR18x, and prose-derived report-signal rows must stay out of
  active filing content.
- A fresh post-`20260517T150804Z` manifest/audit refresh is the next bounded
  non-Docker control-plane job.

The latest completed duplicate/noise synthesis is
`duplicate-noise-20260517T150403Z-synthesis.md`. It identifies the durable
root cause as scheduler memory loss across output-root rotation: explicit
no-product `startup-noise` / `pre_action_bootstrap_stall` pauses were treated
as current-output-local and could be forgotten before TTL expiry. The smallest
safe fix is to preserve only unexpired, explicit, producer-specific no-product
startup-noise cooldowns across output-root changes while keeping current-run
triage metrics scoped to active current dirs and preserving all product-evidence
failures.

The paired feedback action says that bounded fix was implemented in
`rtc-browser-fuzz-novelty-monitor.mjs`, policy version `17` is active, the
novelty monitor was restarted, and current consumer-path checks showed
`strictStartupQueuedOrRunning: 0` and `noProductQueuedOrRunning: 0`. Continue to
treat duplicate/noise work as control-plane hardening, not as product split
evidence.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR06B", stale PR13 review-ref warnings, and old
enabled-group claims are superseded by the current branch-link audit, repaired
PR13 refs, PR06B/PR07C sidecar evidence, PR05D's real slot after PR05C, the
Cycle 278 executor repair proof, and the no-PR17/no-PR18/no-PR18x
classification.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR05D semicolonless entity validation | Cycle 264 clean-base branch `cycle264/pr05d-clean-base/semicolonless-entity-validation` at `27c6e7924217`; Cycle 266 validation head `b9bf4ccb7940` | real PR05-family work after PR05C; bundle import and validation-head refresh completed, but no fetched `verified-content` product branch link exists yet | Publish/fetch/audit PR05D; consume the Cycle 266 validation head; keep the Cycle 262 fallback-tail manifest rejected |
| PR06B / PR07B helper dedupe | active candidate `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b` at `e91d2fe829f2`; stale `ready/rtc-pr06b-*` manifest rows | old independent PR06A sidecar is superseded; Cycle 274 manifest repair accepted the repaired sidecar and rejected stale rows; Cycle 278 live executor repair now proves stale PR06B rows no longer regenerate | Publish/fetch/audit an explicit PR06B product branch, classify runtime readiness, and rebuild stack validation against the active topology |
| PR14B / PR15-on-PR14B finalization | Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Publish/fetch/audit explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| PR07C reload record snapshots | accepted sidecar after PR07B; `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at `2d112932f0e3`; Cycle 272 comparison targets `d309f5c83a8e` / `06441205b872` | included in the Cycle 266 fetch-only validation topology; no current `verified-content` branch-link row exists; Cycle 274 replay ended `blocked-env`, and Cycle 276 continuation remains the blocking evidence gate | Publish/fetch/audit the sidecar-aware PR07C product branch, complete bounded PR07B/PR07C replay using `06441205b872` / seed `1100002` first, and keep validation-only heads out of product PR rows |
| PR03B browser `restoreRevision` CRDT invalidation | `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760` | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR05B/PR05C owner comparison | Cycle 260 owner-comparison evidence | comparison is sufficient to reject PR18x from current parser/rich-text/linebreak evidence; semicolonless/entity false-invalid rows are routed to PR05D | Reopen PR18x only on fresh source-owned evidence outside PR05B/PR05C/PR05D |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split remains PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Nested parent-delete / descendant-edit triage | seed `7500019` | tracking-only evidence from latest split persona; no product slot named | Compare against PR13 and PR15 coverage before adding any new slot |
| Seed `1020002` WebSocket marker divergence | critical-path classification under `runs/20260517T120127Z/continuations/pr17-1020002/classification.tsv`; latest nonempty continuation repeats `reclassify_downscope_not_product_owned` | downscoped unless rebuilt validation produces fresh product evidence; not an independent-work blocker and not a current PR17 product slot; Cycle 278 keeps it out of the live regenerated queue | Revisit only after rebuilt validation produces fresh product evidence newer than the terminal/downscope classifications |
| Sync undo/history issue | `9f4dcc759070`, `44110608ba86`, `977ed437bafe`; seeds `1090016` / `1090017`; completed Cycle 268 isolated runtime replay artifacts | completed isolated runtime replay reached the owner path but did not reproduce a stable redo-stack-loss product owner; not PR05B/PR05C and not PR18x | Use a lower-intrusion history subscription repro or source-level sync/core-data history test before naming any product PR |
| Reload-hydration diagnostics | `100637`, `103640`, `110644`, `113646`, `120649`, latest `deferred/rtc-reload-hydration-20260517T123652Z`, retained raw branch `72854f05ed2`, and replay rows `d309f5c83a8e` / `06441205b872` | diagnostic-only unless bounded replay proves PR07B/PR07C non-coverage; Cycle 274 replay ended `blocked-env`, and Cycle 276 continuation is the active evidence gate | Reopen PR07D only if bounded PR07B/PR07C replay captures a distinct non-PR07B/PR07C product witness and emits a clean branch manifest; otherwise record PR07B/PR07C coverage or diagnostic downscope |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T150403Z-synthesis.md`; `duplicate-noise-20260517T150403Z-feedback-action.md`; `novelty-status.md` updated `2026-05-17T15:36:45.442Z` | no product split change; policy `17` preserves unexpired explicit no-product startup cooldowns across output-root rotation, current-run triage remains active-scope-only, and product-evidence failures remain preserved for bounded analysis | Keep current-run triage active-scope-only, keep startup cooldowns bounded by their existing six-hour expiry, cap duplicate product-evidence siblings only when preserving one representative, and validate with `node --check`, gate-only triage, live-analysis `--once`, and control-plane restart if patched again |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use only explicit product refs. Do not wildcard import or file `final/rtc-pr*`,
   validation-stack branches, deferred branches, dirty evidence branches, old
   downstream `ready/*` refs, stale `ready-pr03b/*` main-spine refs, or
   validation-only heads.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR13
   refs, old PR06B/PR16 material, dirty evidence branches, and the untracked
   reload-hydration gate spec out of filing branches and push allow-lists.
3. Use the repaired PR06B-on-PR07B sidecar candidate for further validation,
   currently `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`.
   The old PR06B sidecar is superseded and must stay historical input evidence
   only.
4. Treat `cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
   `b9bf4ccb794004b634d1427bf18d1a7d788af03f` as fetch-only validation
   evidence, not product content.
5. Consume and validate the Cycle 266 head before rebuilt combined validation
   or final-stack fuzz. Then publish/fetch/audit PR05D, classify runtime
   readiness against the repaired topology, and rerun feasible PR03B/PR07C
   runtime checks.
6. Treat the completed Cycle 278 live executor repair as the current
   control-plane proof that stale PR06B/PR07C, resolved reducer, PR17/1020002,
   report-signal, and PR18/PR18x rows do not regenerate after restart. Keep the
   Cycle 272, Cycle 274, and Cycle 276 executor/manifest artifacts as prior
   evidence, but do not relaunch `1020002` work from them.
7. Run the recommended post-`20260517T150804Z` manifest/audit refresh before
   filing, because older manifests may predate deferred reload candidates they
   claim to cover.
8. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07B, PR05A/B/C, clean-base PR05D, repaired PR06B,
   PR07C, PR11A-E, PR13B0/B1/B2/B3 if available, PR14B, and
   PR15A/B/C-on-PR14B before treating those finer refs as maintainer-facing
   links. Reject any PR05D manifest based on
   `fix/rtc-fallback-group-delete-stale-local`, raw `work/*`, deferred tails,
   `origin/HEAD`, or PR15/fallback bases.
9. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
10. Do not publish raw reload-hydration deferred refs as PR07D. Current
    split-persona evidence treats latest raw reload publish rows, including
    `deferred/rtc-reload-hydration-20260517T123652Z`, as rejected. Run the
    bounded PR07B/PR07C replay for `06441205b872` / seed `1100002` first, then
    `d309f5c83a8e` if needed. Create a PR07D sidecar only after that replay
    proves a distinct non-PR07B/PR07C product delta.
11. Rerun focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    PR03B/PR07C runtime checks.
12. Treat seed `1020002` as downscoped by the
    `reclassify_downscope_not_product_owned` classification. Do not launch a
    new `1020002` repair rerun unless rebuilt validation produces fresh product
    evidence.
13. Treat PR18x as rejected for the current parser/rich-text/linebreak
    evidence. The narrow PR05D semicolonless entity-validation path belongs
    after PR05C, and the completed isolated sync undo/history runtime replay
    did not produce a stable owner proof. Require a lower-intrusion history
    subscription repro or source-level sync/core-data history test before
    giving that family any product PR slot.
14. Keep reload-hydration diagnostics diagnostic-only until focused replay
    proves ownership outside PR07B/PR07C and a clean branch is shaped.
15. Treat the current novelty state, trend packet, and duplicate/noise
    synthesis as fuzz/control-plane health and triage evidence. The raw novelty
    status file is populated now, but it is still not final-stack validation, a
    validated final-stack pass or failure, or filing readiness. Current novelty
    shows zero visible likely-real signatures and zero current-run product-
    evidence signatures in the new active root; historical product-evidence
    families remain preserved for bounded analysis.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
