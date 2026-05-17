# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T12:21:02Z`

Trigger event:
`pr-split-2026-05-17T12-19-51Z-20260517T121005Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T12-19-51Z-20260517T121005Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked, but the current state is not wait-only blocked. The
latest split-persona synthesis makes Cycle 264 the replacement split: PR05D is
a real PR05-family review slot after PR05C for the semicolonless
entity/reference block-validation fix in `packages/blocks`. It is not
file-ready because the clean PR05D head currently exists only in the Cycle 264
job bundle/output, not as a verified shared fix-plan ref with a fetched
`verified-content` branch-link audit.

Cycle 264 completed the clean-base PR05D restack/verify job and rejected the
older Cycle 262 fallback-tail manifest. The clean PR05C-based PR05D branch has
local red/green evidence, a branch audit, push manifest, bundle verification,
focused validation unit coverage, touched-file JS lint, and `git diff --check`.
The next action is to import and verify that bundle in the shared fix-plan repo,
refresh the global push manifest and validation head against newer reload
candidates, then run final-stack validation when runtime readiness is classified.

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

Current blockers:

- Do not file or push product PRs yet.
- Do not run broad final-stack fuzzing yet.
- Rebuild stack-wide validation only after the Cycle 264 PR05D bundle is
  imported/verified into the shared fix-plan repo and dependency/runtime
  readiness is classified.
- Seed `1020002` now has a nonempty `reclassify_downscope_not_product_owned`
  classification. Treat it as downscoped unless rebuilt validation produces
  fresh product evidence; do not launch another `1020002` repair rerun now.
- Use the Cycle 264 PR05C-based PR05D clean-base artifacts instead of the stale
  Cycle 262 wrong-base manifest. Before filing, publish/fetch/audit the PR05D
  branch so it has a `verified-content` branch-link row.
- Do not publish raw `72854f05ed2` /
  `deferred/rtc-reload-hydration-20260517T103640Z` as PR07D. The latest persona
  asks for reload ownership and manifest refresh against the newer
  `20260517T113646Z` / `20260517T120649Z` candidates before any raw PR07D claim
  is accepted.
- Do not create PR17, PR18, or PR18x from current evidence. PR05B/PR05C
  comparison downscopes linebreak/core-verse rows to PR05C and routes
  semicolonless validation to PR05D, not PR18x.
- The next independent owner proof is the launched narrow sync undo/history
  replay for `9f4dcc759070`, `44110608ba86`, and `977ed437bafe`, not a broad
  PR18x bucket.
- Cycle 266 should run one bounded non-`1020002` PR05D import plus reload
  ownership plus manifest/validation refresh job. Do not duplicate the Cycle
  264 sync undo/history owner-replay unless it exits or stalls without required
  nonempty artifacts.
- The completed duplicate/noise persona action was a fuzz control-plane fix. It
  does not change the product PR split and must preserve product-evidence
  visibility.

## Branch And Ref Status

Remote status was collected at `2026-05-17T12:20:56Z`.

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

The branch-link audit was generated at `2026-05-17T12:21:02Z` from fetched
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
- PR05B:
  `finalized/cycle252/no-pr03b/rtc-pr05b-parser-rich-text-equivalence` at
  `e1fda090dce3ca3d277d0e31135cc40bcc0b9801`.
- PR05C:
  `finalized/cycle252/no-pr03b/rtc-pr05c-preserve-whitespace-linebreak-equivalence`
  at `6a2eba716e070c8db1ffbb583fbc77ea9c033845`.
- Active no-PR03B main-spine tip:
  `finalized/cycle252/no-pr03b/rtc-pr15c-fallback-group-delete-green-on-pr14b`
  at `98034aa49b4b7bff7f3d61b2a247bca807bef08d`.
- Active PR06B sidecar candidate:
  `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`
  at `b7addcd16ae9ca4a2f7a1255e6580a74f89ccb88`.
- PR07C:
  `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at
  `2d112932f0e30bb50f6a0277d6803d3a1d6dd1d5`.
- Current fetch-only validation evidence head:
  `cycle258/validation/no-pr03b-main-plus-pr03b-pr06b-on-pr07b-pr07c-sidecars`
  at `b13c888954fce271c3f64e48d2f83e9b1403fbbf`.
- Latest reload-hydration deferred candidate:
  `deferred/rtc-reload-hydration-20260517T103640Z` at
  `72854f05ed20106daac3d125206f2643dac41677`; the earlier
  `deferred/rtc-reload-hydration-20260517T100637Z` at
  `c59a2fba4ff1223a501cd470b904d3308459f1e0` remains diagnostic-review only.
- PR05D wrong-base red/green head:
  `46ea178373c690e0a8799a02583a66efb6a5fff4`; this Cycle 262 branch/manifest is
  stale because it is based on the fallback-group tail.
- PR05D clean-base repair:
  `cycle264/pr05d-clean-base/semicolonless-entity-validation` at
  `27c6e7924217038ed9b4ff71585e8041c67765a4`, based on PR05C
  `6a2eba716e070c8db1ffbb583fbc77ea9c033845`. This is the active PR05D content
  candidate, but it is still only in the Cycle 264 job bundle/output and is not
  a verified shared fix-plan ref in the fetched branch-link audit. It is not
  used as a PR-content link below.

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
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified original branch; no-PR03B product ref still needs verified audit if republished |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | corrected no-PR03B local ref exists; latest owner-comparison rejects a PR18x follow-up |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | corrected no-PR03B local ref exists; linebreak/core-verse rows are PR05C-covered or downscoped |
| PR 5D | Semicolonless entity/reference block validation after PR 5C | No verified branch link yet | TBD | TBD | Cycle 264 PR05C-based candidate exists at `27c6e7924217` with red/green proof, focused validation, lint, diff check, and bundle verification; import/verify the bundle into the shared fix-plan repo, then publish/fetch/audit before filing |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified original branch; excludes malformed-save sidecar and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified original branch; narrow persisted-body guard |
| PR 6B | Malformed outgoing RTC save request-payload guard, revised against PR07B helper shape | No verified branch link yet | TBD | TBD | active local candidate is `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`; publish/fetch/audit before filing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified original branch; no-PR03B product ref still needs verified audit if republished |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified original branch stacked after PR 7A |
| PR 7C | Reload record snapshots sidecar after PR 7B | No verified branch link yet | TBD | TBD | accepted sidecar included in Cycle258 fetch-only validation evidence; publish/fetch/audit product branch before filing |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | finer split still needs verified GitHub branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | finer split still needs verified GitHub branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | source-local evidence marks `a914c862c29e` / seed `5200005` covered here |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | finer split still needs verified GitHub branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | finer split still needs verified GitHub branch link |
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
collected_at_utc: 2026-05-17T12:20:56Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T120146Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Raw novelty status is present for `run-20260517T120146Z`, but it is
coverage/control-plane health evidence only. It is not rebuilt final-stack
validation and must not be treated as either filing readiness or a validated
final-stack failure.

Latest novelty monitor snapshot, updated at `2026-05-17T12:18:54.895Z`:

```text
coverage files: 44044
total records seen: 68108
records processed this pass: 11
new behavioral feature keys this pass: 2
new CDP coverage hashes this pass: 2
current-run records by profile: {"real-user-editing":4,"parser-serialization":3}
current-run successful records by profile: {"parser-serialization":2}
current-run actionable signatures: 1
current-run likely-real visible: 0
current-run product-evidence signatures: 1
current drain actionable signatures: 1
current drain likely-real visible: 0
current-run no-product actionable signatures: 0
current-run no-product likely-real visible: 0
historical signatures: 9938
historical product-evidence signatures: 9847
historical likely-real visible: 158
historical no-product actionable signatures: 91
enabled groups: novelty-ws-parser-serialization
paused groups: novelty-ws-lifecycle, novelty-http-persistence-probe,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text,
  novelty-ws-parser-transform
load1: 26.13 / cores: 64
memory free: 443.1G / 492.0G
headroom for adding groups: yes
quality issues: 0
```

The current coverage-guided run reset from `run-20260517T115528Z` to
`run-20260517T120146Z` at `2026-05-17T12:01:58Z`. By `12:18:54Z`, the novelty
monitor had parser-serialization running as the minimum productive fallback,
kept the real-user groups inside startup-noise cooldown, and wrote a
no-analysis sentinel for a no-product parser-serialization startup signature
while preserving the product-evidence signature in the same run. Treat older
current-run likely-real counts from prior roots as superseded by the `120146Z`
novelty snapshot.

Largest current novelty gaps in the newer novelty monitor are
title-save-reload `412/500`, `ui-heading-shortcut` `896/1000`,
reload-post-action `922/1000`, and body-save-reload `471/500`.

The latest trend evidence packet was generated at `2026-05-17T12:08:12Z` from
monitor data through `2026-05-17T12:04:10Z`, early in the `120146Z` run:

```text
monitor passes: 1963
coverage files: 272 -> 44022
coverage files delta: 43750
unmet coverage goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.352
summary_startup_failures_last: 0
quality issues: 1
enabled groups current: novelty-ws-real-user-rich-text,
  novelty-ws-real-user-editing
fuzz level mix: browser-e2e=29 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5242812
browser-e2e execution: 102479 cumulative / 164 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
unit-property execution: 4708992 cumulative / 10368 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 65.57 / 66.78 / 56.79 on 64 cores
memory: 423.2G free
browser-e2e likely-real findings: 492 over 1795.8 runner-hours
```

The trend packet remains graph-derived input evidence, not an instruction and
not a product-bug count. Its `enabled_groups_current` row predates the later
`12:18:54Z` novelty snapshot, where the current enabled group is
`novelty-ws-parser-serialization`. Browser E2E remains the only level with
confirmed likely-real findings in the trend packet, but lower-level lanes are
under-triaged and should not be declared useless from zero likely-real output.
Prefer guarded top-offs, startup-stall reduction, and bounded lower-level
targets with clear oracles over broad browser concurrency increases.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T121005Z-synthesis.md`. It agrees that filing is blocked, but
not wait-only blocked. The replacement split is Cycle 264 with PR05D as a real
PR05-family slot after PR05C; PR05D is not file-ready only because the clean
head exists in the Cycle 264 job bundle/output rather than as a verified shared
fix-plan ref.

The preceding Cycle 264 feedback action
`pr-split-20260517T113645Z-feedback-action.md` launched and completed
`rtc-cycle264-pr05d-clean-base-restack-and-verify`, producing clean PR05D branch
`cycle264/pr05d-clean-base/semicolonless-entity-validation` at
`27c6e7924217038ed9b4ff71585e8041c67765a4` on PR05C base
`6a2eba716e070c8db1ffbb583fbc77ea9c033845`. The Cycle 264 report lists
nonempty `report.md`, `classification.tsv`, `branch-audit.tsv`,
`push-manifest.tsv`, `artifact-verification.tsv`, and a bundle. The job passed
focused validation unit coverage (`69` tests), touched-file JS lint,
`git diff --check`, and bundle verification. This supersedes the older Cycle
262 PR05D wrong-base manifest, but it does not yet create a verified branch
link in the fetched audit. The next review action is to import and verify that
bundle in the shared fix-plan repo, rebuild the global push manifest and
validation head, and only then run final-stack validation.

The same feedback action launched `rtc-cycle264-sync-undo-history-owner-replay`
for `9f4dcc759070`, `44110608ba86`, and `977ed437bafe`. That job must emit
nonempty `report.md`, `classification.tsv`, `replay-comparison.tsv`, and
`artifact-verification.tsv` before any product PR slot is named for sync
undo/history behavior.

Reload `103640` / `110644` was PR07B-covered by the Cycle 262 ownership audit,
and `100637` remains diagnostic-only, but the latest persona calls for reload
ownership and manifest refresh against the newer `20260517T113646Z` /
`20260517T120649Z` candidates before accepting or rejecting any raw PR07D
claim. Current evidence still rejects PR07D/PR17/PR18/PR18x product slots.

The latest duplicate/noise feedback action is
`duplicate-noise-20260517T113758Z-feedback-action.md`; the newest synthesis is
`duplicate-noise-20260517T120534Z-synthesis.md`. The action implemented a
bounded control-plane fix across triage watcher, live-analysis monitor, novelty
monitor, and analysis/deep-analysis tiers; `node --check` passed for all five
changed `.mjs` files, gate-only triage on current active dirs passed, and live
analysis was relaunched against `run-20260517T120146Z`. The duplicate/noise
synthesis identifies the remaining scheduler risk as group/run-dir scoping in
the novelty monitor and fallback selection, while preserving product-evidence
signatures. The later `12:18:54Z` novelty snapshot has one current-run
product-evidence signature, no visible likely-real failures, a no-analysis
sentinel for no-product parser-serialization startup noise, and
`novelty-ws-parser-serialization` enabled as fallback. This is fuzz
control-plane health work, not a product PR split change.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR06B", stale PR13 review-ref warnings, and "only
novelty-http is enabled" claims are superseded by the current branch-link
audit, current novelty/trend inputs, Cycle 260/262/264 persona synthesis plus
the latest `121005Z` split synthesis, repaired PR13 audit refs, PR06B/PR07B
composability evidence, PR05D's real Cycle 264 slot after PR05C, reload
`113646` / `120649` freshness requirements, the `1020002`
`reclassify_downscope_not_product_owned` status, and the no-PR18x
classification.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR05D semicolonless entity validation | Cycle 262 red/green proof at `46ea178373c690e0a8799a02583a66efb6a5fff4`; Cycle 264 clean-base branch `cycle264/pr05d-clean-base/semicolonless-entity-validation` at `27c6e7924217` | real PR05-family work after PR05C; Cycle 264 produced clean PR05C-based artifacts, validation, lint, diff check, and bundle verification, but no fetched `verified-content` branch link exists yet | Import/verify the Cycle 264 bundle into the shared fix-plan repo, rebuild the global manifest and validation head, publish/fetch/audit PR05D, and keep the Cycle 262 fallback-tail manifest rejected |
| PR06B / PR07B helper dedupe | Cycle258 repair artifacts; `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b` at `b7addcd16ae9ca4a2f7a1255e6580a74f89ccb88` | old independent PR06A sidecar is superseded; repaired PR06B-on-PR07B candidate and fetch-only validation head exist locally; `actions.js`, `entities.js`, touched JS lint, and `git diff --check` passed in Cycle258 evidence | Publish/fetch/audit an explicit PR06B product branch before filing; classify runtime readiness and rebuild stack validation against the Cycle258 topology |
| PR14B / PR15-on-PR14B finalization | Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology; active no-PR03B main spine tip is `98034aa49b4b`, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Publish/fetch/audit explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| PR07C reload record snapshots | accepted sidecar after PR07B; `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at `2d112932f0e3` | included in the Cycle258 fetch-only validation topology; no current `verified-content` branch-link row exists | Publish/fetch/audit the sidecar-aware PR07C product branch and keep validation-only heads out of product PR rows |
| PR03B browser `restoreRevision` CRDT invalidation | `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760` | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes; current replay is still runtime-readiness gated | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR05B/PR05C owner comparison | Cycle260 job `rtc-cycle260-pr05b-pr05c-owner-comparison` | comparison is sufficient to reject PR18x from current parser/rich-text/linebreak evidence; semicolonless/entity false-invalid rows are routed to PR05D | Consume nonempty comparison artifacts into filing notes; reopen PR18x only on fresh source-owned evidence outside PR05B/PR05C/PR05D |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split remains PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | final-stack validation/fuzz history; nonempty `reclassify_downscope_not_product_owned` classification | downscoped unless rebuilt validation produces fresh product evidence; not an independent-work blocker and not a current PR17 product slot | Do not launch another `1020002` repair rerun now; revisit only after runtime readiness is classified and rebuilt validation produces fresh product evidence |
| `980007` / `980017` marker-divergence owner comparison | Cycle 248/250 owner-comparison queue; runtime unblock replays | no PR18x from current evidence; replay `980007` against the validation head first, then PR12, PR15C, and PR07C only if still red; keep `980017` blocked on missing `result.json` and `handoff.md` | Emit provider snapshots and consume runtime replay outputs before assigning ownership |
| Sync undo/history issue | `9f4dcc759070`, `44110608ba86`, `977ed437bafe`; seeds `1090016` / `1090017` | classified as sync undo/history owner work around redo behavior, not PR05B/PR05C and not PR18x; Cycle 264 owner-replay job is launched | Wait for nonempty `report.md`, `classification.tsv`, `replay-comparison.tsv`, and `artifact-verification.tsv` before naming any product PR |
| Reload-hydration diagnostics | `045710`, `055716`, `062719`, `065722`, `073541`, `093634`, `100637`, `103640`, `110644`, and latest `20260517T113646Z` / `20260517T120649Z` diagnostics | diagnostic-only; `103640` / `110644` were PR07B-covered and `100637` is diagnostic-only, but newer reload candidates make older no-PR07D freshness stale | Refresh PR07B/PR07C ownership and the manifest against the newer reload candidates; reopen PR07D only if that newer audit proves a distinct non-PR07B/PR07C product delta and emits a clean branch manifest |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T113758Z-feedback-action.md`; `duplicate-noise-20260517T120534Z-synthesis.md`; novelty snapshot at `2026-05-17T12:18:54Z` | bounded control-plane fix implemented and validated; newest active status has one product-evidence signature, no visible likely-real failures, no-product parser-serialization startup noise marked no-analysis, real-user groups paused under fresh startup-noise cooldown, and parser-serialization fallback enabled | Keep monitoring current-run gating and group/run-dir pause scoping; do not broaden suppression or change the product split from duplicate/noise evidence |

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
3. Use the repaired Cycle258 PR06B-on-PR07B sidecar candidate for further
   validation. The old PR06B sidecar is superseded and must stay historical
   input evidence only.
4. Treat
   `cycle258/validation/no-pr03b-main-plus-pr03b-pr06b-on-pr07b-pr07c-sidecars`
   at `b13c888954fce271c3f64e48d2f83e9b1403fbbf` as fetch-only validation
   evidence, not product content.
5. Before rebuilt combined validation or filing, import and verify the
   PR05C-based Cycle 264 PR05D bundle in the shared fix-plan repo, refresh the
   global push manifest and validation head, publish/fetch/audit PR05D, classify
   runtime readiness against the repaired topology, and rerun any feasible
   PR03B/PR07C runtime checks.
6. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07B, PR05A/B/C, clean-base PR05D, repaired PR06B,
   PR07C, PR11A-E, PR13B0/B1/B2/B3 if available, PR14B, and
   PR15A/B/C-on-PR14B before treating those finer refs as maintainer-facing
   links. Reject any PR05D manifest based on `fix/rtc-fallback-group-delete-stale-local`,
   raw `work/*`, deferred tails, `origin/HEAD`, or PR15/fallback bases.
7. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
8. Do not publish raw reload-hydration deferred refs as PR07D. Current
   split-persona evidence treats reload `103640` / `110644` as PR07B-covered
   and `100637` as diagnostic-only, but latest `20260517T113646Z` /
   `20260517T120649Z` candidates still need fresh PR07B/PR07C ownership and
   manifest refresh; create a PR07D sidecar only after that newer audit proves a
   distinct non-PR07B/PR07C product delta.
9. Rerun focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, and any feasible
   PR03B/PR07C runtime checks.
10. Treat seed `1020002` as downscoped by the
    `reclassify_downscope_not_product_owned` classification. Do not launch a new
    `1020002` repair rerun unless runtime readiness is classified against the
    repaired topology and rebuilt validation produces fresh product evidence.
11. Consume `980007`, `5900001`, and `5400002` runtime replay outputs; keep
    `980017` blocked until its missing `result.json` and `handoff.md` exist.
12. Treat PR18x as rejected for the current parser/rich-text/linebreak evidence.
    The narrow PR05D semicolonless entity-validation path belongs after PR05C,
    but its Cycle 264 branch still needs shared-repo import/verification and a
    fetched verified branch link before filing. Do not promote sync undo/history
    until its owner replay emits a smaller proof.
13. Keep reload-hydration diagnostics diagnostic-only until focused replay
    proves ownership outside PR07B/PR07C and a clean branch is shaped.
14. Treat the current novelty status and trend packet as fuzz/control-plane
    health evidence, not as final-stack validation, a validated final-stack pass
    or failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
