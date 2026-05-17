# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T12:51:42Z`

Trigger event:
`duplicate-noise-2026-05-17T12-48-13Z-124`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-17T12-48-13Z-124/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing is still blocked, but the blocker is no longer "decide the split." The
latest raw split adds a Cycle 268 active-state fence that keeps the Cycle 266
replacement topology: PR05D is a clean PR05C-adjacent semicolonless
entity/reference block-validation fix, PR03B/PR06B/PR07C remain sidecars, and
PR07D, PR17, PR18, and PR18x remain rejected from current evidence.

Current maintainer-facing product spine, excluding runtime-gated and
validation-only sidecars:

```text
PR01 -> PR02 -> PR03 -> PR04 -> PR05A -> PR05B -> PR05C -> PR05D
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
bundle is importable, rebuilt the local push manifest, held the latest raw reload
publish rows as no-PR07D, and created fetch-only validation head
`cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
`b9bf4ccb794004b634d1427bf18d1a7d788af03f`. `git diff --check` passed for that
validation delta. No shared product repository was edited and nothing was
pushed to GitHub by that remote job.

Current blockers:

- Do not file or push product PRs yet.
- Do not run broad final-stack fuzzing yet.
- Consume and validate the refreshed Cycle 266 validation head before claiming
  final-stack readiness.
- Seed `1020002` has a completed
  `reclassify_downscope_not_product_owned` classification. Do not launch another
  `1020002` repair or product PR job unless rebuilt validation produces fresh
  product evidence.
- Complete or verify only the bounded Cycle 268 follow-ups named by the latest
  split synthesis: first
  `rtc-cycle268-critical-executor-terminal-downscope-and-active-manifest-filter`
  so `pr17-1020002` is terminally downscoped and stale manifests are ignored,
  then `rtc-cycle268-sync-undo-history-isolated-runtime-replay` with job-owned
  WP/runtime config. Do not name a sync undo/history product PR until nonempty
  owner evidence exists.
- Publish/fetch/audit PR05D and the remaining sidecar-aware product refs before
  treating them as maintainer-facing links.
- The latest duplicate/noise persona action is control-plane work only. It
  patched and restarted the novelty monitor so current/drain no-product startup
  holds quarantine producer enablement and coverage-Codex launch while
  preserving product-evidence analysis. It does not change the product PR
  split.

## Branch And Ref Status

Remote status was collected at `2026-05-17T12:51:37Z`.

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

The branch-link audit was generated at `2026-05-17T12:51:42Z` from fetched
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
- Latest raw reload-hydration deferred rows still retain
  `72854f05ed20106daac3d125206f2643dac41677`; the Cycle 266 audit holds the
  `20260517T113646Z` and `20260517T120649Z` raw publish rows as
  `hold-no-pr07d-raw-publish-rejected`.

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
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | corrected no-PR03B local ref exists; current owner comparison rejects PR18x |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | corrected no-PR03B local ref exists; linebreak/core-verse rows are PR05C-covered or downscoped |
| PR 5D | Semicolonless entity/reference block validation after PR 5C | No verified branch link yet | TBD | TBD | Cycle 264 clean-base candidate is importable and included in the Cycle 266 validation head; publish/fetch/audit before filing |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save sidecar and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Malformed outgoing RTC save request-payload guard, revised against PR07B helper shape | No verified branch link yet | TBD | TBD | active local candidate is the Cycle 258 PR06B-on-PR07B sidecar; publish/fetch/audit before filing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A |
| PR 7C | Reload record snapshots sidecar after PR 7B | No verified branch link yet | TBD | TBD | accepted sidecar included in Cycle 266 fetch-only validation evidence; publish/fetch/audit product branch before filing |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | TBD | TBD | finer split still needs verified branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | TBD | TBD | finer split still needs verified branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | TBD | TBD | source-local evidence marks `a914c862c29e` / seed `5200005` covered here |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | TBD | TBD | finer split still needs verified branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | TBD | TBD | finer split still needs verified branch link |
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
collected_at_utc: 2026-05-17T12:51:37Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T124122Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Raw novelty status is present for `run-20260517T124122Z`, but it is
coverage/control-plane health evidence only. It is not rebuilt final-stack
validation and must not be treated as either filing readiness or a validated
final-stack failure.

Latest novelty monitor snapshot, updated at `2026-05-17T12:49:42.841Z`:

```text
coverage files: 44322
total records seen: 68602
records processed this pass: 23
new behavioral feature keys this pass: 3
new CDP coverage hashes this pass: 2
current-run records by profile: {"real-user-editing":2}
current-run successful records by profile: {}
current-run actionable signatures: 2
current-run likely-real visible: 0
current-run product-evidence signatures: 2
current drain actionable signatures: 2
current drain likely-real visible: 0
current drain product-evidence signatures: 2
historical signatures: 9966
historical product-evidence signatures: 9875
historical likely-real visible: 177
enabled groups: novelty-ws-real-user-rich-text
paused groups: novelty-ws-lifecycle, novelty-http-persistence-probe,
  novelty-ws-real-user-editing
load1: 32.87 / cores: 64
memory free: 437.2G / 492.0G
headroom for adding groups: yes
quality issues: 0
health: ok
```

The current coverage-guided run reset from `run-20260517T123057Z` to
`run-20260517T124122Z` at `2026-05-17T12:41:34Z`. The supervisor preserved the
three recent startup-noise cooldowns, bootstrapped bounded supervisor groups
before the first coverage scan, kept `novelty-ws-real-user-rich-text` enabled,
and skipped re-enabling the noisy real-user editing group. Current triage has
two current/drain product-evidence signatures and no visible likely-real product
failure. The active current/drain no-product startup path is clean after the
duplicate/noise action: no current/drain no-product raw signatures or
bootstrap-stall signatures are entering analysis, and the two visible current
signatures remain available for product-evidence analysis. At
`2026-05-17T12:46:45Z`, one earlier coverage quality issue had launched
`rtc-coverage-guidance-codex-20260517T124645Z`; the later `12:49:42Z` monitor
snapshot reports `quality issues: 0` and `health: ok`.

Largest current novelty gaps are title-save-reload `416/500`,
`ui-heading-shortcut` `903/1000`, reload-post-action `930/1000`, and
body-save-reload `475/500`.

The latest trend evidence packet was generated at `2026-05-17T12:40:25Z` from
monitor data through `2026-05-17T12:37:54Z`:

```text
monitor passes: 1973
coverage files: 272 -> 44211
coverage files delta: 43939
unmet coverage goals: 4
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3514
summary_startup_failures_last: 0
quality issues: 0
enabled groups current: novelty-ws-real-user-rich-text
fuzz level mix: browser-e2e=27 lanes/26 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5255049
browser-e2e execution: 102748 cumulative / 624 per-hour
unit-property execution: 4720960 cumulative / 13568 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 63.28 / 55.93 / 47.34 on 64 cores
memory: 417.3G free
browser-e2e likely-real findings: 510 over 1803.9 runner-hours
```

The trend packet remains graph-derived input evidence, not an instruction and
not a product-bug count. Browser E2E remains the only level with confirmed
likely-real findings in the trend packet, but lower-level lanes are under-
triaged and should not be declared useless from zero likely-real output. Recent
load has been variable, and the newest novelty snapshot reports headroom, but
startup-noise cooldowns remain active and current product-evidence signatures
are still unclassified. Prefer guarded top-offs, startup-stall reduction, and
bounded lower-level targets with clear oracles over broad browser concurrency
increases.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T123821Z-synthesis.md`. It says the split itself is no longer
the undecided blocker. The raw split file now records the Cycle 268 review
update as the active-state fence over the Cycle 266 topology. The operational
blockers are stale-work revival in the executor, independent work serialized
behind seed `1020002`, lack of an isolated sync undo/history owner replay, and
final-stack validation not yet consuming the refreshed Cycle 266 validation
head.

The preceding feedback action `pr-split-20260517T121005Z-feedback-action.md`
applied the Cycle 266 consensus to `current-pr-split.md`, recorded `1020002` as
downscoped/final-stack-only, launched a bounded non-`1020002` PR05D import,
reload ownership, manifest, and validation-head refresh job, and reported that
job completed green. It produced validation head
`cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
`b9bf4ccb794004b634d1427bf18d1a7d788af03f`.

The same split synthesis and raw Cycle 268 section name only two bounded
follow-up jobs:

- `rtc-cycle268-critical-executor-terminal-downscope-and-active-manifest-filter`
- `rtc-cycle268-sync-undo-history-isolated-runtime-replay`

The executor repair should run first and must make
`reclassify_downscope_not_product_owned` terminal for `pr17-1020002`, parse only
the latest active topology/manifest, and reject stale `ready/*`, raw deferred
reload, HTTP, pre-save, rich-text, zero-byte, disk-preflight-only, and
stale-manifest "progress." The sync undo/history replay should use job-owned
runtime config and run `1090016` table keyboard, table store-dispatch redo,
no-table keyboard/store redo, sync-faults-disabled, and `1090017` only if
needed. Do not launch another `1020002` job, do not treat raw reload rows as
PR07D, and do not create PR07D, PR17, PR18, or PR18x from current evidence.
Marc's standalone-PR05D idea is a minority optimization and should not replace
the Cycle 266/Cycle 268 active shape unless a bounded restack proves it cleaner.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T121544Z-synthesis.md`; its matching feedback-action
file is nonempty and reports the narrow monitor-side action completed. It
updated `rtc-browser-fuzz-novelty-monitor.mjs`, passed `node --check`,
restarted `rtc-coverage-guided-novelty`, and created active root
`run-20260517T124122Z`. The monitor now tracks current-run startup failures by
producer group, includes paused `no-analysis.json` drain dirs in startup-noise
hold decisions, blocks group enablement and coverage-Codex launch while
current/drain no-product `pre_action_bootstrap_stall` dominates, and preserves
product-evidence signatures. The open disagreement remains whether `userCount >
0` alone should count as product evidence; that should block a broad predicate
rewrite, not the narrow startup/discovery/no-action quarantine.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR06B", stale PR13 review-ref warnings, and "only
novelty-http is enabled" claims are superseded by the current branch-link audit,
current novelty/trend inputs, Cycle 266 persona synthesis, repaired PR13 audit
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
| PR07C reload record snapshots | accepted sidecar after PR07B; `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at `2d112932f0e3` | included in the Cycle 266 fetch-only validation topology; no current `verified-content` branch-link row exists | Publish/fetch/audit the sidecar-aware PR07C product branch and keep validation-only heads out of product PR rows |
| PR03B browser `restoreRevision` CRDT invalidation | `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760` | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR05B/PR05C owner comparison | Cycle 260 owner-comparison evidence | comparison is sufficient to reject PR18x from current parser/rich-text/linebreak evidence; semicolonless/entity false-invalid rows are routed to PR05D | Reopen PR18x only on fresh source-owned evidence outside PR05B/PR05C/PR05D |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split remains PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | critical-path classification under `runs/20260517T120127Z/continuations/pr17-1020002/classification.tsv` | downscoped unless rebuilt validation produces fresh product evidence; not an independent-work blocker and not a current PR17 product slot | Repair the executor if it revives `pr17-1020002`; revisit only after rebuilt validation produces fresh product evidence |
| Sync undo/history issue | `9f4dcc759070`, `44110608ba86`, `977ed437bafe`; seeds `1090016` / `1090017` | unresolved sync undo/history owner work around redo behavior, not PR05B/PR05C and not PR18x | Run isolated owner replay and require nonempty `report.md`, `classification.tsv`, `replay-comparison.tsv`, and `artifact-verification.tsv` before naming any product PR |
| Reload-hydration diagnostics | `100637`, `103640`, `110644`, `113646`, `120649`, and retained raw branch `72854f05ed2` | diagnostic-only; Cycle 266 holds raw `113646` / `120649` publish rows as `hold-no-pr07d-raw-publish-rejected` | Reopen PR07D only if a future PR07B/PR07C ownership replay captures a distinct non-PR07B/PR07C product witness and emits a clean branch manifest |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T121544Z-synthesis.md` and feedback-action; novelty snapshot at `2026-05-17T12:49:42Z` | monitor-side hard quarantine is applied and restarted; active current/drain startup-noise path is clean, product-evidence signatures remain visible, current-run likely-real visible is zero, and historical aggregates still include old startup-noise dominance | Keep the startup/no-action quarantine narrow, preserve product-evidence analysis, watch the two current unknown product-evidence signatures, and do not change the product split from duplicate/noise evidence |

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
6. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07B, PR05A/B/C, clean-base PR05D, repaired PR06B,
   PR07C, PR11A-E, PR13B0/B1/B2/B3 if available, PR14B, and
   PR15A/B/C-on-PR14B before treating those finer refs as maintainer-facing
   links. Reject any PR05D manifest based on
   `fix/rtc-fallback-group-delete-stale-local`, raw `work/*`, deferred tails,
   `origin/HEAD`, or PR15/fallback bases.
7. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
8. Do not publish raw reload-hydration deferred refs as PR07D. Current
   split-persona evidence treats latest raw reload publish rows as rejected;
   create a PR07D sidecar only after a newer audit proves a distinct
   non-PR07B/PR07C product delta.
9. Rerun focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, and any feasible
   PR03B/PR07C runtime checks.
10. Treat seed `1020002` as downscoped by the
    `reclassify_downscope_not_product_owned` classification. Do not launch a new
    `1020002` repair rerun unless rebuilt validation produces fresh product
    evidence.
11. Consume `980007`, `5900001`, and `5400002` runtime replay outputs; keep
    `980017` blocked until its missing `result.json` and `handoff.md` exist.
12. Treat PR18x as rejected for the current parser/rich-text/linebreak evidence.
    The narrow PR05D semicolonless entity-validation path belongs after PR05C,
    and sync undo/history must produce a smaller isolated owner proof before
    getting any product PR slot.
13. Keep reload-hydration diagnostics diagnostic-only until focused replay
    proves ownership outside PR07B/PR07C and a clean branch is shaped.
14. Treat the current novelty status and trend packet as fuzz/control-plane
    health evidence, not as final-stack validation, a validated final-stack pass
    or failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
