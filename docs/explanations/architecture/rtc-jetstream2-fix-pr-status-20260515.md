# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T13:37:13Z`

Trigger event:
`pr-split-2026-05-17T13-35-59Z-20260517T132830Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T13-35-59Z-20260517T132830Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing is still blocked, but the blocker is no longer "decide the split." The
latest split synthesis keeps the Cycle 266/268/270 no-PR03B replacement
topology: PR05D is a clean PR05C-adjacent semicolonless entity/reference
block-validation fix, PR03B/PR06B/PR07C remain sidecars, and PR07D, PR17,
PR18, and PR18x remain rejected from current evidence. The active blocker is
structural automation drift: the latest `1020002` continuation has a nonempty
report, but it only repeats `reclassify_downscope_not_product_owned`, while the
critical-path queue still marks `job-pr17-1020002` and raw deferred
reload-hydration validation rows runnable. The next bounded automation action is
to consume the Cycle 270 corrected executor patch in the executor owner context,
regenerate queue/audit/manifest evidence, and prove the stale rows are terminal
or held. The newest split persona recommends one bounded
`rtc-cycle272-critical-executor-filter-apply-queue-proof` job for that proof,
not another fuzz or `1020002` repair job.

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
- Apply or consume the Cycle 270 corrected executor terminal-filter patch, or
  run the bounded Cycle 272 queue-proof job recommended by the latest persona,
  so `job-pr17-1020002` becomes terminal in the critical-path queue and stale raw
  deferred reload rows stop re-entering as runnable product work.
- Treat the completed Cycle 268 sync undo/history isolated runtime replay as
  owner-unproven. It wrote the required nonempty artifacts and reached the owner
  path, but did not reproduce a stable redo-stack-loss product owner; use a
  lower-intrusion history subscription repro or source-level sync/core-data test
  before naming any sync undo/history product PR.
- Run the bounded PR07B/PR07C owner replay for `dac3496c2de2` / seed `1090002`
  only as a focused sidecar ownership check. Do not create PR07D unless it
  proves PR07B/PR07C non-coverage.
- Publish/fetch/audit PR05D and the remaining sidecar-aware product refs before
  treating them as maintainer-facing links.
- The latest duplicate/noise persona output is control-plane work only. It
  narrows a product-evidence duplicate-analysis leak to reload/rejoin variants
  that can fan out before analysis, plus an `analysis-tier`
  `product_evidence_` / `active_product_evidence_` family-key mismatch. The
  newest novelty snapshot has zero current/drain product-evidence signatures,
  so this remains a control-plane follow-up, not a product split change, and it
  must preserve or create one visible product-evidence representative when that
  family recurs.

## Branch And Ref Status

Remote status was collected at `2026-05-17T13:37:08Z`.

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

The branch-link audit was generated at `2026-05-17T13:37:13Z` from fetched
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

The copied Cycle 268 patch dry-ran as malformed; `patch.corrected.diff` dry-runs
cleanly against the live executor script. The latest split-persona synthesis
still treats the executor as unconsumed because the corrected patch has not been
applied in the executor owner context: `job-pr17-1020002` and raw
`validate-branch-deferred-rtc-reload-hydration-*` rows remain runnable, and old
historical split text is still leaking into the active queue. It recommends one
bounded `rtc-cycle272-critical-executor-filter-apply-queue-proof` job to
apply/verify the corrected patch, regenerate `queue.tsv`, branch audit, and push
manifest, and prove those stale rows are terminal or held.

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
| PR 7C | Reload record snapshots sidecar after PR 7B | No verified branch link yet | TBD | TBD | accepted sidecar included in Cycle 266 fetch-only validation evidence; publish/fetch/audit product branch before filing |
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
collected_at_utc: 2026-05-17T13:37:08Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T133022Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Raw novelty status is present for `run-20260517T133022Z`, but it is
coverage/control-plane health evidence only. It is not rebuilt final-stack
validation and must not be treated as either filing readiness or a validated
final-stack failure.

Latest novelty monitor snapshot, updated at `2026-05-17T13:33:17.794Z`:

```text
coverage files: 44767
total records seen: 69321
records processed this pass: 92
new behavioral feature keys this pass: 2
new CDP coverage hashes this pass: 2
current-run records by profile: {}
current-run records by group: {}
current-run successful records by profile: {}
current-run no-product raw signatures: 0
current-run actionable signatures: 0
current-run likely-real visible: 0
current-run product-evidence signatures: 0
current drain no-product raw signatures: 0
current drain actionable signatures: 0
current drain likely-real visible: 0
current drain product-evidence signatures: 0
current top semantic family: []
historical signatures: 9980
historical product-evidence signatures: 9889
historical likely-real visible: 197
enabled groups: novelty-ws-real-user-rich-text,
  novelty-ws-real-user-save-reload
paused groups: novelty-ws-lifecycle, novelty-http-persistence-probe,
  novelty-ws-real-user-editing
load1: 59.67 / cores: 64
memory free: 435.8G / 492.0G
headroom for adding groups: yes
quality issues: 0
health: ok
```

The current coverage-guided run reset again after the previous report, moving
from `run-20260517T132052Z` to `run-20260517T133022Z` at
`2026-05-17T13:30:31Z`. The supervisor preserved the three explicit
startup-noise cooldowns, enabled `novelty-ws-real-user-rich-text` and
`novelty-ws-real-user-save-reload`, and continued holding
`novelty-ws-real-user-editing` because its startup-noise pause is still inside
the six-hour cooldown. Current triage now has zero current/drain signatures,
zero current/drain visible likely-real signals, zero no-product raw signatures,
zero no-product actionable signatures, and zero bootstrap-stall signatures
entering analysis. Product-evidence signatures remain analyzable and must not be
suppressed when they recur.

Largest current novelty gaps are title-save-reload `421/500`,
`ui-heading-shortcut` `918/1000`, reload-post-action `940/1000`, and
body-save-reload `480/500`.

The latest trend evidence packet was generated at `2026-05-17T13:28:50Z` from
monitor data through `2026-05-17T13:28:06Z`:

```text
monitor passes: 1986
coverage files: 272 -> 44703
coverage files delta: 44431
unmet coverage goals: 4
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3509
summary_startup_failures_last: 0
quality issues: 0
enabled groups current: novelty-ws-real-user-rich-text,
  novelty-ws-real-user-save-reload
fuzz level mix: browser-e2e=29 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5270154
browser-e2e execution: 103229 cumulative / 824 per-hour
unit-property execution: 4735584 cumulative / 8320 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 89.29 / 62.41 / 55.82 on 64 cores
memory: 415.9G free
browser-e2e likely-real findings: 548 over 1817.8 runner-hours
```

The trend packet remains graph-derived input evidence, not an instruction and
not a product-bug count. Browser E2E remains the only level with confirmed
likely-real findings in the trend packet, but lower-level lanes are under-
triaged and should not be declared useless from zero likely-real output. The
trend snapshot still shows high recent load, while the later novelty snapshot
reports fresh headroom after the run reset; treat that as guarded capacity, not
a broad browser-concurrency invitation. Prefer guarded top-offs,
startup-stall reduction, reload/rejoin duplicate control, and bounded
lower-level targets with clear oracles over broad browser concurrency increases.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T132830Z-synthesis.md`. It says the split itself is no longer
the undecided blocker and the old file-wide split should be replaced by the
Cycle 266/270 active fence: no-PR03B main spine, clean PR05D after PR05C,
PR03B/PR06B/PR07C as sidecars, and no PR07D/PR17/PR18/PR18x from current
evidence. The active blocker is structural automation drift. The executor still
has not consumed the terminal/downscope filter, so `job-pr17-1020002`, raw
deferred reload-hydration validation rows, and historical split-text signals can
still re-enter as runnable product work. Final-stack validation also has not
consumed the refreshed Cycle 266 validation head.

The raw split still records the `20260517T125331Z` progress-unblock pass and
the Cycle 270 executor verification. The progress pass performed non-`1020002`
branch/audit, manifest, and loop-repair work under
`runs/20260517T123821Z/jobs/progress-unblock-20260517T125331Z/`. Cycle 270 then
verified the executor patch path under
`runs/20260517T130206Z/jobs/outputs/rtc-cycle270-critical-executor-terminal-filter-apply-verify/`,
including a clean-dry-run `patch.corrected.diff`. Those artifacts are
local-machine evidence; they do not replace the GitHub branch-link audit's
`verified-content` requirement.

Current bounded follow-up work is:

- Apply or consume
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260517T130206Z/jobs/outputs/rtc-cycle270-critical-executor-terminal-filter-apply-verify/patch.corrected.diff`
  against `/tmp/start_rtc_critical_path_pr_executor_loop.sh` in the executor
  owner context, run `bash -n`, regenerate/reconcile the queue, branch audit,
  and push manifest, and verify `job-pr17-1020002` plus raw deferred reload rows
  are no longer runnable product work. The latest persona recommends one
  bounded `rtc-cycle272-critical-executor-filter-apply-queue-proof` job for
  exactly that apply/queue-proof work.
- Treat `rtc-cycle268-sync-undo-isolated-runtime` as completed but
  owner-unproven. It wrote the required nonempty artifacts, repaired the
  job-owned runtime, and reached the owner path, but did not reproduce a stable
  redo-stack-loss product owner. The next useful work is a lower-intrusion
  history subscription repro or source-level sync/core-data history test, not
  another raw retry or a PR18x product slot.
- Launch only a bounded PR07B/PR07C owner replay for `dac3496c2de2` / seed
  `1090002` after the executor is fixed, comparing default HTTP/shipped sync,
  WS test-provider behavior, PR07B, PR07C, and the Cycle 266 validation head.
  Required outputs are `report.md`, `classification.tsv`,
  `replay-comparison.tsv`, `provider-lifecycle.tsv`, and
  `artifact-verification.tsv`.
- Track seed `7500019` nested parent-delete/descendant-edit triage, but compare
  against PR13 and PR15 coverage before adding any product slot.

Do not launch another `1020002` product/repair job, do not treat raw reload rows
as PR07D, and do not create PR07D, PR17, PR18, or PR18x from current evidence.
Marc's standalone-PR05D idea remains a minority optimization and should not
replace the Cycle 266/268/270 active shape unless a bounded restack proves it
cleaner.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T125933Z-synthesis.md`; its feedback-action file is
empty and it edited no files. It says strict no-product startup suppression is
mostly working, but reload/rejoin awareness stalls with real product evidence
are still classified as `unknown` or overly detailed families before Codex
analysis. That fans out first-level analysis across variants, and it is
amplified by `rtc-browser-fuzz-analysis-tier.mjs` because
`getAnalysisLaunchFamilyKey()` emits `product_evidence_...` while
`isActiveOnlyAnalysisLaunchFamily()` checks `active_product_evidence_...`. The
next narrow control-plane work is to classify reload/rejoin awareness stalls
before analysis, fix the prefix mismatch, cap duplicate product-evidence
analysis behind one visible representative, and optionally pause or rotate the
real-user lane after that representative exists. This does not change the
product PR split and must not suppress product-evidence failures outright.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR06B", stale PR13 review-ref warnings, and "only
novelty-http is enabled" claims are superseded by the current branch-link audit,
current novelty/trend inputs, current split-persona syntheses, repaired PR13 audit
refs, PR06B/PR07B composability evidence, PR05D's real slot after PR05C, reload
`113646` / `120649` rejection as raw PR07D, the `1020002`
`reclassify_downscope_not_product_owned` status, and the no-PR18x
classification.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR05D semicolonless entity validation | Cycle 264 clean-base branch `cycle264/pr05d-clean-base/semicolonless-entity-validation` at `27c6e7924217`; Cycle 266 validation head `b9bf4ccb7940` | real PR05-family work after PR05C; bundle import and validation-head refresh completed, but no fetched `verified-content` product branch link exists yet | Publish/fetch/audit PR05D; consume the Cycle 266 validation head; keep the Cycle 262 fallback-tail manifest rejected |
| PR06B / PR07B helper dedupe | Cycle 258 repair artifacts; `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b` at `b7addcd16ae9` | old independent PR06A sidecar is superseded; repaired PR06B-on-PR07B candidate is part of the Cycle 266 validation evidence | Publish/fetch/audit an explicit PR06B product branch before filing; classify runtime readiness and rebuild stack validation against the Cycle 266 topology |
| PR14B / PR15-on-PR14B finalization | Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Publish/fetch/audit explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| PR07C reload record snapshots | accepted sidecar after PR07B; `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at `2d112932f0e3`; fresh PR07B/PR07C owner replay target `dac3496c2de2` / seed `1090002` | included in the Cycle 266 fetch-only validation topology; no current `verified-content` branch-link row exists; possible PR07D remains blocked unless PR07B/PR07C non-coverage is proven | Publish/fetch/audit the sidecar-aware PR07C product branch, run the bounded PR07B/PR07C owner replay, and keep validation-only heads out of product PR rows |
| PR03B browser `restoreRevision` CRDT invalidation | `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760` | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR05B/PR05C owner comparison | Cycle 260 owner-comparison evidence | comparison is sufficient to reject PR18x from current parser/rich-text/linebreak evidence; semicolonless/entity false-invalid rows are routed to PR05D | Reopen PR18x only on fresh source-owned evidence outside PR05B/PR05C/PR05D |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split remains PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Nested parent-delete / descendant-edit triage | seed `7500019` | tracking-only evidence from latest split persona; no product slot named | Compare against PR13 and PR15 coverage before adding any new slot |
| Seed `1020002` WebSocket marker divergence | critical-path classification under `runs/20260517T120127Z/continuations/pr17-1020002/classification.tsv`; latest nonempty continuation repeats `reclassify_downscope_not_product_owned`; live queue still showed `job-pr17-1020002` runnable at `2026-05-17T13:11:55Z` | downscoped unless rebuilt validation produces fresh product evidence; not an independent-work blocker and not a current PR17 product slot; current issue is executor drift, not product ownership | Apply/verify the Cycle 270 corrected executor terminal filter, or run the bounded Cycle 272 queue-proof job, so `pr17-1020002` becomes terminal; revisit only after rebuilt validation produces fresh product evidence |
| Sync undo/history issue | `9f4dcc759070`, `44110608ba86`, `977ed437bafe`; seeds `1090016` / `1090017`; completed Cycle 268 isolated runtime replay artifacts | completed isolated runtime replay reached the owner path but did not reproduce a stable redo-stack-loss product owner; not PR05B/PR05C and not PR18x | Use a lower-intrusion history subscription repro or source-level sync/core-data history test before naming any product PR |
| Reload-hydration diagnostics | `100637`, `103640`, `110644`, `113646`, `120649`, latest `deferred/rtc-reload-hydration-20260517T123652Z`, and retained raw branch `72854f05ed2` | diagnostic-only; current manifest holds raw reload rows as `hold-no-pr07d-raw-publish-rejected`, but the latest persona says raw deferred reload validation rows still re-enter the executor queue as runnable | Reopen PR07D only if a future PR07B/PR07C ownership replay captures a distinct non-PR07B/PR07C product witness and emits a clean branch manifest; meanwhile apply/verify the executor filter so stale raw reload rows are terminal or held |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T125933Z-synthesis.md`; novelty snapshot at `2026-05-17T13:33:17Z`; empty latest feedback-action file | strict no-product startup suppression is mostly working; the latest current run has zero current/drain signatures after reset, but the control-plane leak remains reload/rejoin product-evidence duplicate fanout when that family recurs, caused by weak semantic classification and the `product_evidence_` / `active_product_evidence_` analysis-tier prefix mismatch | Preserve or create one visible product-evidence representative, classify reload/rejoin awareness stalls before analysis, fix the analysis-tier prefix mismatch, cap duplicate analysis behind the representative, validate with `node --check`, gate-only triage, one analysis pass, and monitor/live-analysis restarts; do not change the product split from duplicate/noise evidence |

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
6. Apply or consume the Cycle 270 corrected executor terminal-filter patch, or
   run the bounded
   `rtc-cycle272-critical-executor-filter-apply-queue-proof` job recommended by
   the latest persona, and verify the critical-path queue no longer revives
   `job-pr17-1020002`, raw deferred reload rows, or stale historical split text
   as runnable product work.
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
   `deferred/rtc-reload-hydration-20260517T123652Z`, as rejected. Create a PR07D
   sidecar only after a bounded PR07B/PR07C owner replay proves a distinct
   non-PR07B/PR07C product delta.
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
15. Treat the current novelty status, trend packet, and duplicate/noise
    synthesis as fuzz/control-plane health and triage evidence. The newest
    current run has zero visible likely-real signals and zero current/drain
    product-evidence signatures after reset; this is not final-stack validation,
    a validated final-stack pass or failure, or filing readiness, and
    duplicate/noise fixes must not suppress product-evidence failures outright.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
