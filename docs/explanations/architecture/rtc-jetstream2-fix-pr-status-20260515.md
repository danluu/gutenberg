# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T14:11:24Z`

Trigger event:
`pr-split-2026-05-17T14-10-35Z-20260517T135955Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T14-10-35Z-20260517T135955Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing is still blocked, but the blocker is no longer "decide the split" or
executor drift. The latest split synthesis
(`pr-split-20260517T135955Z-synthesis.md`) keeps the Cycle 266/268/270/272
replacement topology as the current working hypothesis: PR05D is a clean
PR05C-adjacent semicolonless entity/reference block-validation fix,
PR03B/PR06B/PR07C remain sidecars, and PR17, PR18, and generic PR18x remain
rejected from current evidence. Cycle 272 applied the corrected executor filter
and proved `job-pr17-1020002` plus raw reload validation rows went from runnable
to zero. The active blockers are now reload/rejoin ownership and manifest
hygiene: the completed Cycle 272 source comparison classifies
`d309f5c83a8e` / `06441205b872` as
`needs-bounded-pr07b-pr07c-replay`, and the latest persona synthesis says the
active manifest still admits stale PR06B rows. Do not name PR07D unless the
bounded PR07B/PR07C replay proves non-coverage, and do not accept the stale
`ready/rtc-pr06b-malformed-save-request-payload-minimal` row as active content.

Current maintainer-facing product spine, excluding runtime-gated and
validation-only sidecars:

```text
PR01 -> PR02 (+ PR02A sidecar)
-> PR03 -> PR04 -> PR05A -> PR05B -> PR05C -> PR05D
-> PR06 -> PR06A -> PR07A -> PR07B
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14 -> PR14B
-> PR15A/B/C-on-PR14B
```

Sidecar and validation-only shape:

```text
PR02A after PR02: HTTP room-isolation regression
PR03B after PR03: browser restoreRevision CRDT invalidation, runtime-gated
PR06B after PR07B: repaired malformed-save request-payload sidecar candidate
PR07C after PR07B: reload record snapshots
validation heads: fetch-only evidence, not product PRs
```

Cycle 266 completed the bounded non-`1020002` PR05D import, reload ownership,
manifest, and validation-head refresh job. It verified the Cycle 264 PR05D
bundle is importable, rebuilt the local push manifest, held the raw reload
publish rows as no-PR07D, and created fetch-only validation head
`cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
`b9bf4ccb794004b634d1427bf18d1a7d788af03f`. `git diff --check` passed for that
validation delta. No shared product repository was edited and nothing was
pushed to GitHub by that remote job.

The `20260517T125331Z` progress-unblock pass then refreshed local-machine
branch/audit and push-manifest evidence without waiting on `1020002`. It mapped
PR02A, held PR03B, PR05B/PR05C, clean-base PR05D, repaired PR06B, PR07C,
PR11A-E, the Cycle 266 validation head, and the latest deferred reload branch
`deferred/rtc-reload-hydration-20260517T123652Z` in local artifacts. Those
local refs still are not GitHub `verified-content` branch-link rows unless the
branch-link audit below says so.

Current blockers:

- Do not file or push product PRs yet.
- Do not run broad final-stack fuzzing yet.
- Consume and validate the refreshed Cycle 266 validation head before claiming
  final-stack readiness.
- Seed `1020002` has a completed
  `reclassify_downscope_not_product_owned` classification. Do not launch another
  `1020002` repair or product PR job unless rebuilt validation produces fresh
  product evidence.
- Treat the Cycle 272 executor queue proof as completed control-plane evidence:
  `job-pr17-1020002` went from one runnable/active queue row to zero, and raw
  `validate-branch-deferred-rtc-reload-hydration-*` rows went from nine queued to
  zero. Reopen seed `1020002` only on fresh rebuilt validation evidence.
- Treat the completed Cycle 268 sync undo/history isolated runtime replay as
  owner-unproven. It wrote the required nonempty artifacts and reached the owner
  path, but did not reproduce a stable redo-stack-loss product owner; use a
  lower-intrusion history subscription repro or source-level sync/core-data test
  before naming any sync undo/history product PR.
- Run exactly one bounded PR07B/PR07C replay using `06441205b872` / seed
  `1100002` first because it has a valid trace, then `d309f5c83a8e` if needed.
  If it proves non-coverage, shape and verify a narrow PR07D after PR07C and
  before PR09; otherwise record PR07B/PR07C coverage or diagnostic downscope.
- Repair the active manifest so PR06B has one canonical sidecar row after PR07B:
  `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`
  at `b7addcd16ae9ca4a2f7a1255e6580a74f89ccb88`. Reject the stale
  `ready/rtc-pr06b-malformed-save-request-payload-minimal` row.
- Publish/fetch/audit PR05D and the remaining sidecar-aware product refs before
  treating them as maintainer-facing links.
- The newest duplicate/noise synthesis is control-plane evidence, not a product
  split change. The current novelty monitor state shows run-local policy cleanup
  has been applied and historical pauses were cleared, but an active-current
  no-product startup-noise hold is still pausing
  `novelty-ws-real-user-save-reload`. Product-evidence signatures remain
  eligible and this does not change the PR split.

## Branch And Ref Status

Remote status was collected at `2026-05-17T14:11:19Z`.

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

That repo has modified product/test files and many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T14:11:24Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

Useful local-machine refs from the raw split remain unaudited in this fetched
branch-link audit and are not used as PR-content links below:

- PR02A:
  `ready-pr03b/rtc-pr02a-http-room-isolation-regression` at
  `9303a7715cf3e2495e743c90ec5a4f8f0080e2dc`.
- PR03B:
  `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at
  `cbab481fe76057c17cafeea6353d7bf75c904052`.
- PR05B and PR05C:
  finalized no-PR03B local refs at
  `e1fda090dce3ca3d277d0e31135cc40bcc0b9801` and
  `6a2eba716e070c8db1ffbb583fbc77ea9c033845`.
- PR05D clean-base repair:
  `cycle264/pr05d-clean-base/semicolonless-entity-validation` at
  `27c6e7924217038ed9b4ff71585e8041c67765a4`, based on PR05C
  `6a2eba716e070c8db1ffbb583fbc77ea9c033845`.
- PR06B sidecar candidate:
  `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`
  at `b7addcd16ae9ca4a2f7a1255e6580a74f89ccb88`.
- PR07C:
  `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at
  `2d112932f0e30bb50f6a0277d6803d3a1d6dd1d5`.
- Cycle 266 fetch-only validation evidence head:
  `cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
  `b9bf4ccb794004b634d1427bf18d1a7d788af03f`.
- Latest raw reload-hydration deferred rows include
  `deferred/rtc-reload-hydration-20260517T123652Z`; the current push manifest
  holds it as `hold-no-pr07d-raw-publish-rejected`. Older raw rows still retain
  `72854f05ed20106daac3d125206f2643dac41677` and remain diagnostic only.

Fresh Cycle 268 unblock artifacts:

```text
runs/20260517T123821Z/jobs/progress-unblock-20260517T125331Z/report.md
runs/20260517T123821Z/jobs/progress-unblock-20260517T125331Z/branch-audit.tsv
runs/20260517T123821Z/jobs/progress-unblock-20260517T125331Z/push-manifest.tsv
```

That progress pass also patched `rtc-pr-split-review-loop.sh` so a feedback
action with non-`1020002` jobs and fresh independent job runner/prompt files
counts as Parallel Progress Gate progress; `bash -n` passed. The Cycle 268
executor terminal-filter job wrote nonempty `report.md`, `patch.diff`,
`terminal-ledger.tsv`, `before-after-queue.tsv`, and
`active-manifest-filter.tsv`. Its patch targets
`/tmp/start_rtc_critical_path_pr_executor_loop.sh`, so Cycle 270 copied and
corrected it in an allowed output directory rather than editing the live script.

Fresh Cycle 270 executor artifacts:

```text
runs/20260517T130206Z/jobs/outputs/rtc-cycle270-critical-executor-terminal-filter-apply-verify/report.md
runs/20260517T130206Z/jobs/outputs/rtc-cycle270-critical-executor-terminal-filter-apply-verify/terminal-ledger.tsv
runs/20260517T130206Z/jobs/outputs/rtc-cycle270-critical-executor-terminal-filter-apply-verify/before-after-queue.tsv
runs/20260517T130206Z/jobs/outputs/rtc-cycle270-critical-executor-terminal-filter-apply-verify/active-manifest-filter.tsv
runs/20260517T130206Z/jobs/outputs/rtc-cycle270-critical-executor-terminal-filter-apply-verify/patch.corrected.diff
runs/20260517T130206Z/jobs/outputs/rtc-cycle270-critical-executor-terminal-filter-apply-verify/patch-application-status.tsv
runs/20260517T130206Z/jobs/outputs/rtc-cycle270-critical-executor-terminal-filter-apply-verify/artifact-verification.tsv
```

The copied Cycle 268 patch dry-ran as malformed; `patch.corrected.diff` dry-ran
cleanly against the live executor script. Cycle 272 then consumed that corrected
patch in the executor owner context.

Fresh Cycle 272 executor queue-proof artifacts:

```text
runs/20260517T132830Z/jobs/outputs/rtc-cycle272-critical-executor-filter-apply-queue-proof/report.md
runs/20260517T132830Z/jobs/outputs/rtc-cycle272-critical-executor-filter-apply-queue-proof/patch-application-status.tsv
runs/20260517T132830Z/jobs/outputs/rtc-cycle272-critical-executor-filter-apply-queue-proof/before-after-queue.tsv
runs/20260517T132830Z/jobs/outputs/rtc-cycle272-critical-executor-filter-apply-queue-proof/terminal-ledger.tsv
runs/20260517T132830Z/jobs/outputs/rtc-cycle272-critical-executor-filter-apply-queue-proof/branch-audit.tsv
runs/20260517T132830Z/jobs/outputs/rtc-cycle272-critical-executor-filter-apply-queue-proof/push-manifest.tsv
runs/20260517T132830Z/jobs/outputs/rtc-cycle272-critical-executor-filter-apply-queue-proof/active-manifest-filter.tsv
runs/20260517T132830Z/jobs/outputs/rtc-cycle272-critical-executor-filter-apply-queue-proof/artifact-verification.tsv
```

The Cycle 272 proof moved `job-pr17-1020002` from one runnable/active queue row
to zero and raw `validate-branch-deferred-rtc-reload-hydration-*` rows from nine
queued rows to zero. The executor is no longer the active filing blocker; the
remaining blocker is reload/rejoin ownership.

Cycle 270 also verified that
`rtc-cycle268-sync-undo-isolated-runtime` completed with nonempty `report.md`,
`classification.tsv`, `replay-comparison.tsv`, and
`artifact-verification.tsv`. That replay reached the owner path but did not
reproduce a stable redo-stack-loss product owner, so it does not justify any
`packages/sync`, `core-data`, block/parser, PR18, or PR18x product PR.

For PR13, use only these repaired audited review refs:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link stale or misordered PR13 refs listed by the audit under
`Explicitly Not PR-Content Links`.

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
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine ref exists; current owner comparison rejects PR18x, but GitHub verified-content link is still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine ref exists; linebreak/core-verse rows are PR05C-covered or downscoped, but GitHub verified-content link is still missing |
| PR 5D | Semicolonless entity/reference block validation after PR 5C | No verified branch link yet | TBD | TBD | Cycle 264 clean-base candidate is importable and included in the Cycle 266 validation head; publish/fetch/audit before filing |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save sidecar and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Malformed outgoing RTC save request-payload guard, revised against PR07B helper shape | No verified branch link yet | TBD | TBD | active local candidate is the Cycle 258 PR06B-on-PR07B sidecar; publish/fetch/audit before filing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A |
| PR 7C | Reload record snapshots sidecar after PR 7B | No verified branch link yet | TBD | TBD | accepted sidecar included in Cycle 266 fetch-only validation evidence; Cycle 272 comparison found PR07B/PR07C adjacent but not proven for `d309f5c83a8e` / `06441205b872`; run bounded replay before filing or naming PR07D |
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
collected_at_utc: 2026-05-17T14:11:19Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T135832Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Raw `novelty-status.md` now contains a current monitor snapshot for
`run-20260517T135832Z`. Treat it as coverage/control-plane state, not as
final-stack validation, filing readiness, or a validated final-stack
pass/failure.

```text
novelty updated: 2026-05-17T14:10:53.228Z
coverage files: 45044
total records seen: 69702
current-run records: real-user-editing=16, successful=12
current-run groups: novelty-ws-real-user-save-reload=12,
  novelty-ws-real-user-rich-text=4
current-run triage: 3 signatures, 4 raw signatures,
  3 product-evidence signatures, 0 likely-real visible
current-run no-product raw signatures: 1
historical signatures: 9998
historical product-evidence signatures: 9907
historical likely-real visible: 218
combined likely-real visible: 219
enabled groups: novelty-ws-real-user-rich-text
paused groups: novelty-ws-real-user-save-reload
pause reason: active-current no-product startup-noise family
  pre_action_bootstrap_stall from novelty-ws-real-user-save-reload
  (2 signatures, share=1, source=suppressed-strict-startup-only)
health: ok
resource snapshot: load1=587.69 on 64 cores, memory=433.1G free,
  headroom for adding groups=no
```

The current monitor has applied the run-local noise-policy reset and cleared
historical known-noise pauses, then paused only the active-current
`novelty-ws-real-user-save-reload` producer for strict no-product startup noise.
Product-evidence signatures remain visible to triage. This is not product
evidence and does not change the PR split.

The latest trend evidence packet was generated at `2026-05-17T14:00:59Z` from
monitor data through `2026-05-17T13:55:56Z`:

```text
monitor passes: 1993
coverage files: 272 -> 44906
coverage files delta: 44634
unmet coverage goals: 4 in the trend snapshot; 8 after the later novelty
  auto-ratchet expansion
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3503
summary_startup_failures_last: 0
quality issues: 1
enabled groups current: novelty-ws-real-user-rich-text,
  novelty-ws-real-user-save-reload
fuzz level mix: browser-e2e=31 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5275827
browser-e2e execution: 103974 cumulative / 40 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
unit-property execution: 4740512 cumulative / 768 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15 at 14:00: 73.59 / 72.59 / 63.06 on 64 cores
memory: 418.9G free at 14:00
browser-e2e likely-real findings: 568 over 1826.7 runner-hours
largest unmet goals: title-save-reload 435/500,
  ui-heading-shortcut 941/1000, reload-post-action 959/1000,
  body-save-reload 494/500
```

The trend packet remains graph-derived input evidence, not an instruction and
not a product-bug count. Browser E2E remains the only level with confirmed
likely-real findings in the trend packet, but lower-level lanes are under-
triaged and should not be declared useless from zero likely-real output. Recent
load remains variable and the later novelty snapshot had no headroom for adding
groups. Prefer startup-stall reduction, reload/rejoin duplicate control, and
bounded lower-level targets with clear oracles over broad browser concurrency
increases.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T135955Z-synthesis.md`. It says filing and final-stack fuzz
remain blocked, but not by seed `1020002` alone or by the old split decision.
The active split is still the Cycle 266/268/270/272 replacement stack with PR05D
included near PR05C, PR03B/PR06B/PR07C as sidecars, and no PR17/PR18/PR18x
product slots. The current blockers are bounded reload/rejoin ownership and
active-manifest hygiene: reload rows `d309f5c83a8e` / `06441205b872` still need
PR07B/PR07C replay classification, and stale PR06B rows must be removed from the
canonical manifest.

The raw split records the Cycle 272 launch state, and the latest persona files
record the completed result: `rtc-cycle272-critical-executor-filter` completed
with `rc=0`, moved `job-pr17-1020002` from one runnable/active queue row to
zero, moved raw deferred reload validation rows from nine queued to zero, and
generated fresh queue proof, terminal ledger, branch-audit copy,
push-manifest copy, and active-manifest filter. Those artifacts remain
local-machine evidence; they do not replace the GitHub branch-link audit's
`verified-content` requirement.

Current bounded follow-up work is:

- Launch exactly one bounded Codex replay job:
  `rtc-cycle274-reload-d309f5c83a8e-06441205b872-pr07b-pr07c-bounded-replay`.
  It should use `06441205b872` / seed `1100002` first because that row has a
  valid trace, then `d309f5c83a8e` if needed. Required outputs are nonempty
  `report.md`, `classification.tsv`, `replay-comparison.tsv`, and real
  byte/mtime/status `artifact-verification.tsv`.
- Run `rtc-cycle274-pr06b-active-manifest-filter-repair` or an equivalent
  canonical manifest audit. It must keep one row per active slot, reject stale
  `ready/rtc-pr06b-*`, accept only the repaired PR06B-on-PR07B sidecar or
  validation-only heads, and write nonempty `report.md`,
  `before-after-manifest.tsv`, `branch-audit.tsv`, `push-manifest.tsv`,
  `active-manifest-filter.tsv`, and `artifact-verification.tsv`.
- Refresh the one-row-per-slot manifest again after replay if PR07D becomes
  real. Reject duplicate accepted PR14B/PR15 rows, old PR15 refs, wrong-base
  PR05D, raw reload branches, PR17, PR18, and PR18x.
- Treat `rtc-cycle268-sync-undo-isolated-runtime` as completed but
  owner-unproven. It wrote the required nonempty artifacts, repaired the
  job-owned runtime, and reached the owner path, but did not reproduce a stable
  redo-stack-loss product owner. The next useful work is a lower-intrusion
  history subscription repro or source-level sync/core-data history test, not
  another raw retry or a PR18x product slot.
- Track seed `7500019` nested parent-delete/descendant-edit triage, but compare
  against PR13 and PR15 coverage before adding any product slot.

Do not launch another `1020002` product/repair job, do not treat raw reload rows
as PR07D, and do not create PR17, PR18, or PR18x from current evidence. Do not
create PR07D yet. If bounded replay proves PR07B/PR07C do not cover the
reload/rejoin awareness stall, insert a narrow PR07D after PR07C and before
PR09, scoped only to reload/rejoin provider-awareness recovery. Raw
reload-hydration branches and diagnostic `100637` are not product PRs. Marc's
standalone-PR05D idea remains a minority optimization and should not replace the
Cycle 266/268/270/272 active shape unless a bounded restack proves it cleaner.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T134847Z-synthesis.md`. It reports no product split
change and no completed edits in that persona cycle. The consensus root cause
was a control-plane scoping leak, especially in
`bin/rtc-browser-fuzz-novelty-monitor.mjs`: stale paused-drain/historical
startup-noise state could affect scheduling or Codex holds outside the active
current run. The newer novelty monitor state shows that run-local policy cleanup
has since been applied for the current run: historical known-noise pauses were
cleared, auto-ratchet goals were normalized, and scheduling/Codex holds are now
based on active-current startup noise. The current remaining hold is therefore a
current-run no-product `pre_action_bootstrap_stall` pause for
`novelty-ws-real-user-save-reload`, not stale historical product evidence.
Broader runner suppression, live-analysis cleanup, or supervisor threshold
changes should still wait. Product-evidence failures must remain eligible.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR06B", stale PR13 review-ref warnings, and "only
novelty-http is enabled" claims are superseded by the current branch-link audit,
current novelty/trend inputs, current split-persona syntheses, repaired PR13
audit refs, PR06B/PR07B composability evidence, PR05D's real slot after PR05C,
reload `113646` / `120649` rejection as raw PR07D, the completed Cycle 272
executor queue proof, the `1020002` `reclassify_downscope_not_product_owned`
status, and the no-PR18x classification.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR05D semicolonless entity validation | Cycle 264 clean-base branch `cycle264/pr05d-clean-base/semicolonless-entity-validation` at `27c6e7924217`; Cycle 266 validation head `b9bf4ccb7940` | real PR05-family work after PR05C; bundle import and validation-head refresh completed, but no fetched `verified-content` product branch link exists yet | Publish/fetch/audit PR05D; consume the Cycle 266 validation head; keep the Cycle 262 fallback-tail manifest rejected |
| PR06B / PR07B helper dedupe | Cycle 258 repair artifacts; `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b` at `b7addcd16ae9`; stale `ready/rtc-pr06b-malformed-save-request-payload-minimal` manifest rows | old independent PR06A sidecar is superseded; repaired PR06B-on-PR07B candidate is part of the Cycle 266 validation evidence, but the latest split synthesis says active-manifest hygiene still admits stale PR06B rows | Repair the active manifest to one canonical PR06B-on-PR07B row, reject stale `ready/rtc-pr06b-*`, publish/fetch/audit an explicit PR06B product branch before filing, classify runtime readiness, and rebuild stack validation against the Cycle 266 topology |
| PR14B / PR15-on-PR14B finalization | Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Publish/fetch/audit explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| PR07C reload record snapshots | accepted sidecar after PR07B; `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at `2d112932f0e3`; Cycle 272 comparison targets `d309f5c83a8e` / `06441205b872` | included in the Cycle 266 fetch-only validation topology; no current `verified-content` branch-link row exists; Cycle 272 found PR07B/PR07C adjacent but not coverage-proven | Publish/fetch/audit the sidecar-aware PR07C product branch, run one bounded PR07B/PR07C replay using `06441205b872` / seed `1100002` first, and keep validation-only heads out of product PR rows |
| PR03B browser `restoreRevision` CRDT invalidation | `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760` | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR05B/PR05C owner comparison | Cycle 260 owner-comparison evidence | comparison is sufficient to reject PR18x from current parser/rich-text/linebreak evidence; semicolonless/entity false-invalid rows are routed to PR05D | Reopen PR18x only on fresh source-owned evidence outside PR05B/PR05C/PR05D |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split remains PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Nested parent-delete / descendant-edit triage | seed `7500019` | tracking-only evidence from latest split persona; no product slot named | Compare against PR13 and PR15 coverage before adding any new slot |
| Seed `1020002` WebSocket marker divergence | critical-path classification under `runs/20260517T120127Z/continuations/pr17-1020002/classification.tsv`; latest nonempty continuation repeats `reclassify_downscope_not_product_owned`; Cycle 272 queue proof moved `job-pr17-1020002` from one runnable/active row to zero | downscoped unless rebuilt validation produces fresh product evidence; not an independent-work blocker and not a current PR17 product slot; executor drift is now repaired | Revisit only after rebuilt validation produces fresh product evidence newer than the terminal/downscope classifications |
| Sync undo/history issue | `9f4dcc759070`, `44110608ba86`, `977ed437bafe`; seeds `1090016` / `1090017`; completed Cycle 268 isolated runtime replay artifacts | completed isolated runtime replay reached the owner path but did not reproduce a stable redo-stack-loss product owner; not PR05B/PR05C and not PR18x | Use a lower-intrusion history subscription repro or source-level sync/core-data history test before naming any product PR |
| Reload-hydration diagnostics | `100637`, `103640`, `110644`, `113646`, `120649`, latest `deferred/rtc-reload-hydration-20260517T123652Z`, retained raw branch `72854f05ed2`, and Cycle 272 compare rows `d309f5c83a8e` / `06441205b872` | diagnostic-only unless bounded replay proves PR07B/PR07C non-coverage; Cycle 272 queue proof stopped raw deferred reload validation rows from re-entering as runnable, but reload/rejoin ownership is still unresolved | Reopen PR07D only if the bounded PR07B/PR07C replay captures a distinct non-PR07B/PR07C product witness and emits a clean branch manifest; otherwise record PR07B/PR07C coverage or diagnostic downscope |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T134847Z-synthesis.md`; zero-byte `duplicate-noise-20260517T134847Z-feedback-action.md`; current `novelty-status.md` updated `2026-05-17T14:10:53.228Z` | no product split change; run-local novelty policy cleanup has been applied, historical known-noise pauses were cleared, and current scheduling/Codex hold state is now driven by active-current no-product `pre_action_bootstrap_stall` on `novelty-ws-real-user-save-reload`; product-evidence signatures remain eligible | Keep monitoring active-current startup noise, do not broaden suppression from this evidence, avoid broad lane increases while load/headroom are poor, and do not change the product split from duplicate/noise evidence |

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
3. Use the repaired Cycle 258 PR06B-on-PR07B sidecar candidate for further
   validation. The old PR06B sidecar is superseded and must stay historical
   input evidence only.
4. Treat
   `cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
   `b9bf4ccb794004b634d1427bf18d1a7d788af03f` as fetch-only validation
   evidence, not product content.
5. Consume and validate the Cycle 266 head before rebuilt combined validation or
   final-stack fuzz. Then publish/fetch/audit PR05D, classify runtime readiness
   against the repaired topology, and rerun any feasible PR03B/PR07C runtime
   checks.
6. Keep the Cycle 272 executor queue proof in the control-plane evidence set:
   `job-pr17-1020002` and raw deferred reload validation rows are no longer
   runnable. Do not relaunch executor or `1020002` work unless rebuilt
   validation creates fresh product evidence.
7. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07B, PR05A/B/C, clean-base PR05D, repaired PR06B,
   PR07C, PR11A-E, PR13B0/B1/B2/B3 if available, PR14B, and
   PR15A/B/C-on-PR14B before treating those finer refs as maintainer-facing
   links. Reject any PR05D manifest based on
   `fix/rtc-fallback-group-delete-stale-local`, raw `work/*`, deferred tails,
   `origin/HEAD`, or PR15/fallback bases.
8. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
9. Do not publish raw reload-hydration deferred refs as PR07D. Current
   split-persona evidence treats latest raw reload publish rows, including
   `deferred/rtc-reload-hydration-20260517T123652Z`, as rejected. Run the
   bounded PR07B/PR07C replay for `06441205b872` / seed `1100002` first, then
   `d309f5c83a8e` if needed. Create a PR07D sidecar only after that replay proves
   a distinct non-PR07B/PR07C product delta.
10. Rerun focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, and any feasible
   PR03B/PR07C runtime checks.
11. Treat seed `1020002` as downscoped by the
    `reclassify_downscope_not_product_owned` classification. Do not launch a new
    `1020002` repair rerun unless rebuilt validation produces fresh product
    evidence.
12. Consume `980007`, `5900001`, and `5400002` runtime replay outputs; keep
    `980017` blocked until its missing `result.json` and `handoff.md` exist.
13. Treat PR18x as rejected for the current parser/rich-text/linebreak evidence.
    The narrow PR05D semicolonless entity-validation path belongs after PR05C,
    and the completed isolated sync undo/history runtime replay did not produce
    a stable owner proof. Require a lower-intrusion history subscription repro or
    source-level sync/core-data history test before giving that family any
    product PR slot.
14. Keep reload-hydration diagnostics diagnostic-only until focused replay
    proves ownership outside PR07B/PR07C and a clean branch is shaped.
15. Treat the current novelty state, trend packet, and duplicate/noise synthesis
    as fuzz/control-plane health and triage evidence. The raw novelty status file
    is populated now, but it is still not final-stack validation, a validated
    final-stack pass or failure, or filing readiness. The current control-plane
    concern is active-current no-product startup noise on
    `novelty-ws-real-user-save-reload` after run-local cleanup, not historical
    product evidence. Duplicate/noise fixes must not suppress product-evidence
    failures outright.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
