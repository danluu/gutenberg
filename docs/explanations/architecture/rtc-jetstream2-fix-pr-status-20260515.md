# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T10:16:49Z`

Trigger event:
`duplicate-noise-2026-05-17T10-16-06Z-116`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-17T10-16-06Z-116/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The newest completed split-persona synthesis,
`pr-split-20260517T100930Z-synthesis.md`, keeps the Cycle 252/254/256
replacement topology: no PR03B in the main product spine. PR02A, PR03B, PR06B,
and PR07C are sidecars, and the Cycle 254 validation head is fetch-only
validation evidence, not product PR content.

Current maintainer-facing product spine:

```text
PR01 -> PR02 -> PR03 -> PR04 -> PR05A/B/C -> PR06 -> PR06A
-> PR07A/B -> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14 -> PR14B
-> PR15A/B/C-on-PR14B
```

Sidecar and validation-only shape:

```text
PR02A after PR02: HTTP room-isolation regression
PR03B after PR03: browser restoreRevision CRDT invalidation, runtime-gated
PR06B after PR06A: minimal malformed-save guard
PR07C after PR07B: reload record snapshots
validation-only head: no-PR03B PR15C + PR03B + PR06B + repaired PR07C
```

Current blockers and status changes:

- The fetch-only validation head exists as
  `finalized/cycle254/validation/no-pr03b-main-plus-pr03b-pr06b-pr07c-sidecars`
  at `6b36a3bd79afc6e8c63b1d7c6200d52d22f0b179`. Do not file it as product
  content.
- The active Cycle 256 dependency/runtime job must not count as progress unless
  it writes nonempty `report.md`, `classification.tsv`,
  `validation-checks.tsv`, `runtime-replay.tsv`, `branch-audit.tsv`,
  `push-manifest.tsv`, and `artifact-verification.tsv`. The latest progress
  unblock found only launcher/log/script output at audit time.
- Dependency-backed focused JS checks for `actions.js` and `entities.js`,
  touched-file lint, `git diff --check`, and runtime replay remain blockers.
- PR03B runtime replay still fails before product evidence: the PHP bootstrap
  hits `gutenberg_override_style()`, and browser replay hits
  `collaborationEnabled:null`.
- Runtime readiness for PR03B, `980007`, `5900001`, and `5400002` still needs
  provider snapshots or equivalent pre-oracle repair evidence before ownership
  can be assigned.
- Seed `1020002` remains final-stack validation/fuzz/filing-only. It does not
  block branch shaping, manifests, sidecar validation, runtime readiness work,
  deferred downscope, owner comparisons, or loop repair.
- `9f4dcc759070` is sync undo/history around `core/search.buttonText`, not
  PR05B/PR05C and not PR18x. The next evidence is a narrow sync undo-manager
  red test or instrumented repro.
- Parser, rich-text, entity, and linebreak residuals must compare against
  PR05B/PR05C before assigning any later owner. PR17, PR18, and PR18x remain
  absent as product slots.

Duplicate/noise work is fuzzer control-plane work, not product PR work. The
latest duplicate/noise synthesis, `duplicate-noise-20260517T094826Z-synthesis.md`,
identified the remaining leak as product-evidence `timeout` / `unknown` /
harness duplicate analysis, not strict no-product startup noise. The completed
feedback action implemented the bounded control-plane fix: representative
analysis caps, safe non-actionable gate propagation, producer rotation, and
preserved product-evidence visibility. `node --check` passed for the touched
monitor/analysis scripts. Remaining risk is limited to ambiguous raw
product-evidence `timeout` / `unknown` signatures that need one representative
analysis before safe sibling capping.

## Branch And Ref Status

Remote status was collected at `2026-05-17T10:16:44Z`.

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

The branch-link audit was generated at `2026-05-17T10:16:49Z` from fetched
`danluu` refs. Proposed PR rows below use only rows marked `verified-content`,
or explicitly say `No verified branch link yet`.

For repaired PR13 content, use only these audited review refs:

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
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; publish/fetch/audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR 3 | No verified branch link yet | TBD | TBD | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified original branch; no-PR03B product ref still needs verified audit if republished |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; comparison point for parser/rich-text residuals |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` is PR05C-covered plus oracle-equivalence downscope unless new evidence contradicts it |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified original branch; excludes malformed-save sidecar and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified original branch; narrow persisted-body guard |
| PR 6B | Minimal malformed outgoing RTC save request-payload guard after PR 6A | No verified branch link yet | 2 | TBD | recommended PR06A sidecar; included in fetch-only Cycle 254 validation head but still needs verified product branch link and dependency-backed validation |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified original branch; no-PR03B product ref still needs verified audit if republished |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified original branch stacked after PR 7A |
| PR 7C | Reload record snapshots sidecar after PR 7B | No verified branch link yet | TBD | TBD | accepted sidecar; repair is durable at `2d112932f0e3` and included in the fetch-only validation head, but product branch still needs verified link |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | finer split still needs verified GitHub branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | finer split still needs verified GitHub branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | latest source-local evidence marks `a914c862c29e` / seed `5200005` covered here |
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
  is verified content for old aggregate PR 5, not the recommended PR05A/B/C
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
collected_at_utc: 2026-05-17T10:16:44Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T101235Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Raw novelty status is now present for `run-20260517T101235Z`, but it is
coverage/control-plane health evidence only. It is not rebuilt final-stack
validation and must not be treated as either filing readiness or a validated
final-stack failure.

Latest novelty monitor snapshot, updated at `2026-05-17T10:15:41.306Z`:

```text
coverage files: 42704
total records seen: 66145
records processed this pass: 146
new behavioral feature keys this pass: 3
new CDP coverage hashes this pass: 3
current-run actionable signatures: 0
current-run likely-real visible: 0
current-run product-evidence signatures: 0
historical signatures: 9869
historical likely-real visible: 155
top historical duplicate family share: 0.3537
enabled groups: novelty-ws-real-user-editing, novelty-ws-real-user-rich-text
paused groups: novelty-ws-lifecycle, novelty-http-persistence-probe
load1: 67.94 / cores: 64
memory free: 424.8G / 492.0G
headroom for adding groups: no
```

The current novelty health warning is that no behavioral coverage files were
found under the new output dir yet. That is a monitor/materialization warning,
not product evidence. The paused lifecycle and HTTP probe groups are inside
startup-noise cooldowns; the enabled groups are the two WS real-user lanes.

The latest trend evidence packet was generated at `2026-05-17T10:04:26Z` from
monitor data through `2026-05-17T10:01:06Z`:

```text
monitor passes: 1930
coverage files: 272 -> 42546
coverage files delta: 42274
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3536
summary_startup_failures_last: 0
quality issues: 1
enabled groups current: novelty-ws-real-user-rich-text,
  novelty-ws-real-user-editing
fuzz level mix: browser-e2e=27 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 4786391
browser-e2e execution: 100834 cumulative / 144 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
unit-property execution: 4254216 cumulative / 48160 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 51.99 / 38.23 / 51.15 on 64 cores
memory: 433.2G free
```

Largest trend-recorded novelty gaps are `ui-heading-shortcut` `785/1000`,
`reload-post-action` `799/1000`, title-save-reload `318/500`,
body-save-reload `377/500`, and successful real-user-editing records
`448/500`. The later novelty snapshot has nearby ratcheted values:
`ui-heading-shortcut` `792/1000`, `reload-post-action` `807/1000`,
title-save-reload `323/500`, body-save-reload `382/500`, and
real-user-editing `451/500`.

The fuzzing level mix is still browser-heavy. Do not add broad browser
concurrency while load/headroom is constrained. Prefer guarded top-offs,
startup-stall reduction, and bounded lower-level targets with clear oracles.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T100930Z-synthesis.md`. It says:

- status remains blocked and not filing-ready;
- use the Cycle 252/254 no-PR03B main product spine with PR02A, PR03B, PR06B,
  and PR07C as sidecars;
- the fetch-only validation head exists at
  `cycle254/validation/no-pr03b-main-plus-pr03b-pr06b-pr07c-sidecars`
  (`6b36a3bd79afc6e8c63b1d7c6200d52d22f0b179`);
- seed `1020002` may block final validation/fuzz/filing only, not branch
  shaping, audits, sidecar validation, owner comparisons, or loop repair;
- dependency-backed JS checks and runtime replay are still blocked;
- PR03B PHP bootstrap fails on `gutenberg_override_style()`, browser replay
  fails with `collaborationEnabled:null`, and `980007` / `5900001` /
  `5400002` still need provider snapshots before ownership can be assigned;
- `9f4dcc759070` should get a narrow sync undo/history red test or
  instrumented repro;
- PR18x naming remains deferred until PR05B/PR05C owner comparisons cover
  parser/rich-text/entity/linebreak reductions;
- finalization/manifest logic must reject wait-only feedback, zero-byte
  reports, `report.tmp`, stale manifests, and launch-only text while the
  Parallel Progress Gate has actionable rows.

The latest duplicate/noise synthesis and feedback action together say:

- strict no-product `pre_action_bootstrap_stall` is mostly suppressed;
- the active leak was product-evidence `timeout` / `unknown` / harness
  duplicate analysis because active-job keys were too specific and
  non-actionable gates did not propagate to safe siblings;
- the implemented fix caps repeated analysis by stable mechanism, propagates
  non-actionable gates only when no visible likely-real result exists, rotates
  noisy producers, and preserves product-evidence visibility;
- current active roots had `signatureCount=0`, `bootstrapStalls=0`,
  `topDuplicateFamilyShare=0`, and no queued/running/retry
  `pre_action_bootstrap_stall` jobs when the feedback action completed.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR06B", stale PR13 review-ref warnings, and "only
novelty-http is enabled" claims are superseded by the current branch-link
audit, current novelty/trend inputs, Cycle 252/254 no-PR03B topology,
fetch-only validation head, repaired PR13 audit refs, and the completed
duplicate/noise control-plane fix.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR14B / PR15-on-PR14B finalization | `20260517T074254Z`, `20260517T082257Z`, and Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology; no current `verified-content` branch links exist for PR14B or PR15-on-PR14B, and stale `ready-pr03b/*` main-spine reports are topology-stale | Publish/fetch/audit only explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| Malformed-save request-payload PR06B | minimal PR06A sidecar | active recommended sidecar after PR06A; included in the fetch-only Cycle 254 validation head; no current `verified-content` branch-link row | Publish/fetch/audit the minimal product branch and rerun dependency-backed validation checks before filing |
| PR07C reload record snapshots | accepted sidecar after PR07B; latest sidecar repair evidence | repair is durable at `2d112932f0e3` and included in the fetch-only validation head; no current `verified-content` branch-link row exists | Publish/fetch/audit the sidecar-aware PR07C product branch and keep validation-only heads out of product PR rows |
| PR03B browser `restoreRevision` CRDT invalidation | `ee0d01a82e12`; Cycle 252 sidecar decision | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes; current replay is blocked by `gutenberg_override_style()` and `collaborationEnabled:null` | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split is PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | final-stack validation/fuzz history | final-stack validation/fuzz/filing-only; not an independent-work blocker and not PR17 product work | Keep it out of product blocker scans unless later evidence proves product ownership; settle before final-stack fuzz/filing if rebuilt validation still requires it |
| `980007` / `980017` marker-divergence owner comparison | Cycle 248/250 owner-comparison queue; runtime unblock replays | no PR18x from current evidence; replay `980007` against the validation head first, then PR12, PR15C, and PR07C only if still red; keep `980017` blocked on missing `result.json` and `handoff.md` | Emit provider snapshots and consume runtime replay outputs before assigning ownership |
| `9f4dcc759070` Search button undo/history issue | Cycle 252 owner comparison | classified as sync undo/history redo-stack loss through `core/search.buttonText`, not PR05B/PR05C and not PR18x | Add a narrow sync undo-manager red test or instrumented repro around Search button-text undo |
| Reload/post-save `5200005` table-delete replay | completed reducer evidence | PR12-covered by previous-local-cache block delete; not a new product branch | Consume the classification into filing notes; reopen only if later evidence contradicts PR12 coverage |
| Strict `5200005` nested-group signal | `a914c862c29e` | latest source-local evidence marks it PR11C-covered; no PR18x assignment | Consume PR11C-covered classification; reopen only on fresh red evidence |
| Parser-sensitive seed `1060015` | prior focused WebSocket/browser artifacts | downscoped out of current product blockers unless new red evidence appears | Keep out of PR5D/PR18 unless a fresh prepared-browser repro and source-owner reducer prove product ownership |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B | downscoped out of current product blockers unless new red evidence appears | Keep out of PR18A unless a fresh UI-only browser repro proves source ownership |
| Reload-hydration diagnostics | `045710`, `055716`, `062719`, `065722`, `073541`, `093634` diagnostics | diagnostic-only unless newer evidence proves product ownership; latest mapped diagnostic is `deferred/rtc-reload-hydration-20260517T093634Z` | Replay seeds `5900001` and `5400002` plus strict reload/revision-persistence families against the provider-lifecycle diagnostics before any product promotion |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | Cycle 240 owner/downscope artifacts | consumed as PR05C-covered / oracle-equivalence downscope; not an open PR18x gate | Keep out of PR18x/PR5D unless new source-owned product evidence appears |
| Fresh strict/focused/current likely-real residuals | current strict-expansion and focused-shard rows | owner-triage input only; do not name PR18x from historical duplicate/noise aggregates or incomplete current-run novelty output | Compare parser/rich-text/entity/linebreak rows against PR05B/PR05C first, revision rows against PR03/PR03B/PR07C, and block-tree rows against PR11C/PR12 before later owners |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T094826Z-synthesis.md`; completed feedback action | bounded control-plane fix implemented; no product-code split change | Keep product-evidence failures visible; continue to require one representative analysis before capping ambiguous raw `timeout` / `unknown` siblings |

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
3. Treat
   `cycle254/validation/no-pr03b-main-plus-pr03b-pr06b-pr07c-sidecars` at
   `6b36a3bd79afc6e8c63b1d7c6200d52d22f0b179` as fetch-only validation
   evidence, not product content.
4. Repair/install validation worktree dependencies, rerun focused
   `actions.js` / `entities.js` unit checks, touched-file lint, and
   `git diff --check`, and only then run rebuilt combined validation.
5. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07B, PR05A/B/C, PR06B, PR07C, PR11A-E,
   PR13B0/B1/B2/B3 if available, PR14B, and PR15A/B/C-on-PR14B before treating
   those finer refs as maintainer-facing links.
6. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
7. Rerun focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, and any feasible
   PR03B/PR07C runtime checks.
8. Settle seed `1020002` only as a final-stack validation/fuzz/filing gate.
9. Consume `980007`, `5900001`, and `5400002` runtime replay outputs; keep
   `980017` blocked until its missing `result.json` and `handoff.md` exist.
10. Add the narrow `9f4dcc759070` sync undo/history red test or instrumented
    repro before inventing a PR18x bucket.
11. Keep reload-hydration diagnostics diagnostic-only until focused replay
    proves product ownership and a clean branch is shaped.
12. Treat the current novelty status and trend packet as fuzz/control-plane
    health evidence, not as final-stack validation, a validated final-stack
    pass or failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
