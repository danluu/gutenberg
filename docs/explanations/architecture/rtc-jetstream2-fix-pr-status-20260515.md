# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T08:40:21Z`

Trigger event:
`pr-split-2026-05-17T08-39-12Z-20260517T082453Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T08-39-12Z-20260517T082453Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked, and this is not a wait-only cycle. The newest completed
split-persona synthesis, `pr-split-20260517T082453Z-synthesis.md`, keeps the
Cycle 248 `ready-pr03b/*` topology as the authoritative replacement stack and
supersedes the older PR07C-conflict state.

Current maintainer-facing shape:

```text
PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR03B -> PR04
-> PR05A/B/C -> PR06 -> PR06A, PR6B-min sidecar
-> PR07A/B, PR07C sidecar
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 if published and audited;
   otherwise repaired audited PR13A/B/C fallback
-> PR14 -> PR14B -> PR15A/B/C-on-PR14B
-> validation-only PR6B + PR07C + PR03B + PR14B + PR15C head
-> rebuilt combined validation stack
-> final-stack fuzz and filing
```

Use only explicit `ready-pr03b/*` refs from the Cycle 248 finalization worktree
for the corrected product stack. Old downstream `ready/*`, `final/*`, raw
`deferred/*`, `try/*`, validation-only heads, and candidate PR16 refs are not
product PR heads.

Current blockers and status changes:

- Verify and consume the nonempty `20260517T082257Z` finalization report, or
  refresh the manifest/audit if those artifacts are not accepted as fresh. The
  manifest must be newer than the deferred `20260517T080545Z` reload-hydration
  state before filing from the `ready-pr03b/*` topology.
- PR03B still lacks runtime browser/PHP replay evidence because the Cycle 248
  sync job recorded `wp-env-status-rc-127`.
- Rebuilt combined validation must start from
  `validation/rtc-pr03b-pr06b-pr07c-plus-pr14b-pr15c-sidecar-20260517T074254Z`
  and then settle seed `1020002` only if the rebuilt stack still requires it.
- The latest synthesis keeps `980007` as a bounded owner-replay gate, starting
  from the validation head and then PR12, PR15C, and PR07C only if still red.
  Keep `980017` blocked until its missing `result.json` and `handoff.md` exist.
- Provider-lifecycle diagnostics for seeds `5900001` and `5400002` remain
  bounded diagnostic work before any reload-hydration product promotion.
- Current active-run fuzz is no longer clean: the latest novelty snapshot has
  `2` actionable product-evidence signatures and `1` visible likely-real
  signal. That is live health evidence, not rebuilt final-stack validation.

PR17, PR18, and PR18x remain absent as product slots. Seed `1020002` is
final-stack validation/fuzz/filing-only unless newer product-owned evidence
appears. Parser, rich-text, entity, and linebreak residual rows must compare
against PR05B/PR05C before assigning any later owner.

The duplicate/noise work is fuzzer control-plane health work, not product PR
work. The latest completed action hardened no-product known-noise handling and
restarted into `run-20260517T081057Z`. The newest duplicate/noise synthesis,
`duplicate-noise-20260517T082102Z-synthesis.md`, recommends another
control-plane-only pass for current-root scoping, active-dir-only policy,
stale-session reaping, and strict startup seed advancement. It explicitly keeps
product-evidence failures visible.

## Branch And Ref Status

Remote status was collected at `2026-05-17T08:40:17Z`.

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

The branch-link audit was generated at `2026-05-17T08:40:21Z` from fetched
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
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | active prefix sidecar; publish/fetch/audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR03 | No verified branch link yet | TBD | TBD | required PR03-family slot; runtime replay remains environment-gated |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified original branch; `ready-pr03b/*` replacement still needs verified branch link |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; comparison point for parser/rich-text residuals |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` is PR05C-covered plus oracle-equivalence downscope unless new evidence contradicts it |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified original branch; excludes malformed-save restack and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified original branch; narrow persisted-body guard |
| PR 6B | Minimal malformed outgoing RTC save request-payload guard after PR06A | No verified branch link yet | 2 | TBD | recommended PR06A sidecar; include in rebuilt validation but do not file until audited |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified original branch; `ready-pr03b/*` replacement still needs verified branch link |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified original branch stacked after PR 7A |
| PR 7C | Reload record snapshots sidecar after PR07B | No verified branch link yet | TBD | TBD | accepted sidecar; PR07C conflict resolved in Cycle 248, but product branch still needs verified link and feasible runtime checks |
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
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | mandatory replacement topology; publish/fetch/audit before filing |
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
collected_at_utc: 2026-05-17T08:40:17Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T081057Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The current raw novelty monitor snapshot was updated at
`2026-05-17T08:38:17.008Z`:

```text
coverage files: 42279
total records seen: 65466
unmet goals: 5
recommended groups: novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text
headroom for adding groups: no
current output-dir actionable signatures: 2
current output-dir product-evidence signatures: 2
likely-real visible: 1
likely-real merged duplicates: 0
oracle/noise questions: 0
current-run records: 34 ws records
current-run successful records: 31
current-run summary-only startup failures: 1 session-lifecycle
load1: 119.98 / 64 cores
memory: 437.6G free / 492.0G total
enabled groups: novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text
paused groups: novelty-ws-persistence-no-title, novelty-ws-lifecycle
health: ok
```

The latest trend evidence packet was generated at `2026-05-17T08:24:57Z` from
monitor data through `2026-05-17T08:24:23Z`. It is slightly older than the raw
novelty snapshot above:

```text
monitor passes: 1899
coverage files: 272 -> 42264
coverage files delta: 41992
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3527
summary_startup_failures_last: 0
quality issues: 0
enabled groups current: novelty-ws-lifecycle, novelty-ws-real-user-editing
fuzz level mix: browser-e2e=27 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 4386364
browser-e2e execution: 100535 cumulative / 88 per-hour
unit-property execution: 3854488 cumulative / 168560 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 20.26 / 35.13 / 50.16 on 64 cores
memory: 445.3G free
```

Largest current raw novelty gaps are `ui-heading-shortcut` `779/1000`,
`reload-post-action` `793/1000`, title-save-reload `314/500`,
body-save-reload `373/500`, and successful real-user-editing records
`446/500`.

Current-run triage and historical triage must remain separate. The current
output dir reports `2` signatures, `2` product-evidence signatures, and `1`
visible likely-real signal. Historical aggregates still include duplicate/noise
and prior likely-real signals. Historical top families remain led by
`late_session_awareness_stall`, `unknown`, `timeout`,
`collaboration_non_convergence`, and `assertion`.

This is coverage/control-plane health evidence only. It is not rebuilt
final-stack validation and must not be treated as either filing readiness or a
validated final-stack failure for the `ready-pr03b/*` stack.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T082453Z-synthesis.md`. It says:

- status is blocked, not filing-ready, and not wait-only;
- the old split is superseded by the Cycle 248 `ready-pr03b/*` topology;
- accept the `20260517T082257Z` finalization artifacts only if their manifest is
  newer than the deferred `080545` reload-hydration state; otherwise refresh the
  manifest/audit;
- the stack still needs rebuilt final-stack validation, PR03B runtime evidence
  or a recorded environment gap, `980007` owner replay, and provider-lifecycle
  diagnostics for `5900001` and `5400002`;
- `980017` remains blocked until its missing `result.json` and `handoff.md`
  exist, and no PR18x product slot should be created from the current evidence.

The latest `pr-split-20260517T075636Z-feedback-action.md` confirms that the
Cycle 248 sync/runtime-gates job completed, checked `33` product rows with `0`
failures, wrote fresh `branch-audit.tsv` and `push-manifest.tsv`, and recorded
`wp-env-status-rc-127` for PR03B runtime replay.

The latest duplicate/noise synthesis,
`duplicate-noise-20260517T082102Z-synthesis.md`, keeps duplicate/noise work in
the fuzzer control plane. It says the next safe pass is current-root guard
hardening, active-current-dir-only policy, stale live-analysis session reaping,
and strict startup seed advancement. The latest completed action,
`duplicate-noise-20260517T075352Z-feedback-action.md`, already completed
no-product infra/startup suppression before Codex launch, current-run state
reset on output-root rotation, and old-output startup-cooldown cleanup. Neither
pass should suppress product-evidence failures.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR6B", stale PR13 review-ref warnings, and "only
novelty-http is enabled" claims are superseded by the current branch-link
audit, raw novelty status, trend packet, and latest split and duplicate/noise
syntheses/actions.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR14B / PR15-on-PR14B finalization | `20260517T074254Z` finalization report; latest synthesis mentions nonempty `20260517T082257Z` finalization artifacts; `ready-pr03b/*` refs | mandatory replacement topology; PR07C conflict is resolved, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Consume `082257Z` only if its manifest is newer than deferred `080545`; otherwise publish/fetch/audit only explicit `ready-pr03b/*` product refs and keep validation-only heads out of product PRs |
| Malformed-save request-payload PR6B | minimal PR06A sidecar | active recommended sidecar after PR06A; no current `verified-content` branch-link row | Publish/fetch/audit the minimal product branch, keep validation-only heads out of filing branches, verify inclusion in rebuilt validation |
| PR07C reload record snapshots | accepted sidecar after PR07B; `20260517T074254Z` finalization report | accepted product sidecar; prior PR03B restack conflict is resolved, but no current `verified-content` branch-link row exists | Publish/fetch/audit the `ready-pr03b/*` PR07C product branch and run focused runtime checks only if environment is usable |
| PR03B browser `restoreRevision` CRDT invalidation | `ee0d01a82e12`; Cycle 248 topology | active required PR03-family product slot; no verified branch link and focused runtime replay is environment-gated; one dissent keeps it sidecar-only until runtime proof, but consensus keeps it in the spine | Publish/fetch/audit the explicit `ready-pr03b/*` PR03B product ref, run feasible runtime checks or record the environment gap, then rebuild validation |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split is PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | latest split synthesis removes it as product work | final-stack validation/fuzz/filing-only; not an independent-work blocker and not PR17 product work | Keep it out of product blocker scans unless later evidence proves product ownership; settle before final-stack fuzz/filing if rebuilt validation still requires it |
| `980007` / `980017` marker-divergence owner comparison | Cycle 248 owner-comparison artifacts and `next-owner-replay.prompt.md` | no PR18x from current evidence; replay `980007` against the validation head first, then PR12, PR15C, and PR07C only if still red; keep `980017` blocked on missing `result.json` and `handoff.md` | Run bounded `980007` owner replay; do not assign or replay `980017` until its analysis artifacts exist |
| Reload/post-save `5200005` table-delete replay | completed reducer evidence | PR12-covered by previous-local-cache block delete; not a new product branch | Consume the classification into filing notes; reopen only if later evidence contradicts PR12 coverage |
| Strict `5200005` nested-group signal | `a914c862c29e` | latest source-local evidence marks it PR11C-covered; no PR18x assignment | Consume PR11C-covered classification; reopen only on fresh red evidence |
| Parser-sensitive seed `1060015` | prior focused WebSocket/browser artifacts | downscoped out of current product blockers unless new red evidence appears | Keep out of PR5D/PR18 unless a fresh prepared-browser repro and source-owner reducer prove product ownership |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B | downscoped out of current product blockers unless new red evidence appears | Keep out of PR18A unless a fresh UI-only browser repro proves source ownership |
| Reload-hydration diagnostics | `045710`, `055716`, `062719`, `065722`, `073541` diagnostics | diagnostic-only unless newer evidence proves product ownership; latest mapped diagnostic is `20260517T073541Z` | Replay seeds `5900001` and `5400002` plus strict reload/revision-persistence families against the provider-lifecycle diagnostics before any product promotion |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | Cycle 240 owner/downscope artifacts | consumed as PR05C-covered / oracle-equivalence downscope; not an open PR18x gate | Keep out of PR18x/PR5D unless new source-owned product evidence appears |
| Fresh strict/focused/current likely-real residuals | current strict-expansion and focused-shard rows; current raw novelty has `1` visible likely-real signal | owner-triage input only; do not name PR18x from historical duplicate/noise aggregates or the current raw novelty count alone | Compare parser/rich-text/entity/linebreak rows against PR05B/PR05C first, revision rows against PR03/PR03B/PR07C, and block-tree rows against PR11C/PR12 before later owners |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T075352Z-*`; `duplicate-noise-20260517T082102Z-synthesis.md`; current raw novelty status | no product-code split change; completed no-product hardening is in place, and the latest synthesis proposes another control-plane-only scoping/guard pass | Keep current-run and historical duplicate/noise scopes separate, preserve real product-evidence signatures, resolve the narrow `userCount`-only suppression question before broadening semantics, and require rebuilt final-stack monitor evidence before filing |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use only explicit product refs. Do not wildcard import or file `final/rtc-pr*`,
   validation-stack branches, deferred branches, dirty evidence branches, or old
   downstream `ready/*` refs that omit PR03B.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR13
   refs, old PR6B/PR16 material, dirty evidence branches, and the untracked
   reload-hydration gate spec out of filing branches and push allow-lists.
3. Publish/fetch and audit explicit `ready-pr03b/*` product refs for PR02A,
   PR03B, PR04-through-PR07B-on-PR03B, PR05A/B/C, PR6B, PR07C, PR11A-E,
   PR13B0/B1/B2/B3 if available, PR14B, and PR15A/B/C-on-PR14B before treating
   those finer refs as maintainer-facing links. Consume the `082257Z`
   finalization artifacts only if their manifest is fresh enough.
4. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
5. Rebuild the combined stack from the explicit `ready-pr03b/*` product refs and
   the audited PR13 fallback or finer PR13 split decision.
6. Rerun focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, and any feasible
   PR03B/PR07C runtime checks.
7. Settle seed `1020002` only as a final-stack validation/fuzz/filing gate.
8. Replay `980007`; keep `980017` blocked until its missing `result.json` and
   `handoff.md` exist.
9. Keep reload-hydration diagnostics diagnostic-only until focused replay proves
   product ownership and a clean branch is shaped.
10. Triage the current active-run `1` visible likely-real signal and block
    filing if fresh final-stack monitor evidence shows visible product failures.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. The current
raw novelty input is active-run health evidence; none of the current trend,
duplicate/noise, residual reducer, or status-persona evidence is final-stack
fuzz validation or a filing unblocker.
