# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T10:02:42Z`

Trigger event:
`pr-split-2026-05-17T10-01-47Z-20260517T095247Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T10-01-47Z-20260517T095247Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The newest completed split-persona synthesis,
`pr-split-20260517T095247Z-synthesis.md`, keeps the stale `ready-pr03b/*`
PR03B-in-main-spine topology replaced. Use the Cycle 252/254 no-PR03B main
product spine. PR02A, PR03B, PR06B, and PR07C are sidecars, and the Cycle 254
validation head is fetch-only validation evidence, not a product PR ref.

Current maintainer-facing shape:

```text
PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR04 -> PR05A/B/C -> PR06 -> PR06A
-> PR07A/B
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 if published and audited;
   otherwise repaired audited PR13A/B/C fallback
-> PR14 -> PR14B
-> PR15A/B/C-on-PR14B
```

Sidecar and validation-only shape:

```text
PR02A after PR02: HTTP room-isolation regression, publish/audit gated
PR03B after PR03: browser restoreRevision CRDT invalidation, runtime-gated
PR06B after PR06A: minimal malformed-save guard
PR07C after PR07B: reload record snapshots
validation-only head: no-PR03B PR15C + PR03B + PR06B + repaired PR07C
```

Current blockers and status changes:

- The Cycle 254 validation head now exists as fetch-only validation evidence:
  `cycle254/validation/no-pr03b-main-plus-pr03b-pr06b-pr07c-sidecars` at
  `6b36a3bd79afc6e8c63b1d7c6200d52d22f0b179`. Do not file it as product
  content.
- That validation head is still not filing proof. Dependency-backed JS checks,
  touched-file lint, `git diff --check`, and runtime replay remain blocked.
- PR03B runtime replay still has product/runtime blockers: PHP bootstrap fails
  on `gutenberg_override_style()`, browser replay fails with
  `collaborationEnabled:null`, and `980007` / `5900001` / `5400002` still lack
  owner evidence until provider snapshots are emitted.
- Repair/install validation worktree dependencies, rerun focused
  `actions.js` / `entities.js` checks, lint, and `git diff --check`, then
  rerun PR03B PHP/browser first, followed by `980007` and the
  `5900001` / `5400002` diagnostics.
- Seed `1020002` remains final-stack validation/fuzz/filing-only. It does not
  block branch shaping, manifests, sidecar repair, runtime replay, deferred
  downscope, or owner comparisons.
- `980007` remains a bounded owner-replay gate starting from the validation
  head, then PR12, PR15C, and PR07C only if still red. Keep `980017` blocked
  until its missing `result.json` and `handoff.md` exist.
- Provider-lifecycle diagnostics for seeds `5900001` and `5400002` remain
  bounded diagnostic work before any reload-hydration product promotion.
- `9f4dcc759070` is now classified as a sync undo/history issue around
  `core/search.buttonText`, not PR05B/PR05C and not PR18x. The next evidence
  gate is a narrow sync undo-manager red test or instrumented repro around
  redo-stack clearing after Search button-text undo.
- Parser, rich-text, entity, and linebreak residual rows must compare against
  PR05B/PR05C before assigning any later owner.
- PR17, PR18, and PR18x remain absent as product slots.

The duplicate/noise work is fuzzer control-plane health work, not product PR
work. The latest duplicate/noise synthesis,
`duplicate-noise-20260517T094826Z-synthesis.md`, still classifies the issue as
a control-plane leak rather than a new RTC product failure family. Strict
no-product `pre_action_bootstrap_stall` is mostly suppressed; the active leak is
product-evidence `timeout` / `unknown` / harness noise being relaunched because
active-job keys are too specific and non-actionable analysis gates do not
propagate to sibling signatures. The smallest safe fix is a representative
analysis cap plus safe gate propagation and producer rotation, while preserving
product-evidence visibility. This remains fuzzer control-plane progress, not a
product PR or filing unblocker.

## Branch And Ref Status

Remote status was collected at `2026-05-17T10:02:37Z`.

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

The branch-link audit was generated at `2026-05-17T10:02:42Z` from fetched
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
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR03 | No verified branch link yet | TBD | TBD | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified original branch; no-PR03B spine replacement still needs verified branch link |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; comparison point for parser/rich-text residuals |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` is PR05C-covered plus oracle-equivalence downscope unless new evidence contradicts it |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified original branch; excludes malformed-save restack and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified original branch; narrow persisted-body guard |
| PR 6B | Minimal malformed outgoing RTC save request-payload guard after PR06A | No verified branch link yet | 2 | TBD | recommended PR06A sidecar; included in fetch-only Cycle 254 validation head, but still needs a verified product branch link and dependency-backed validation |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified original branch; no-PR03B replacement still needs verified branch link |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified original branch stacked after PR 7A |
| PR 7C | Reload record snapshots sidecar after PR07B | No verified branch link yet | TBD | TBD | accepted sidecar; repair is durable at `2d112932f0e3` and included in the fetch-only validation head, but product branch still needs verified link |
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
collected_at_utc: 2026-05-17T10:02:37Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T100203Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw novelty status input is empty in this collection, so do not carry
forward the prior pass's per-signature novelty counts as newly read facts. The
available fresh fuzz evidence is the trend packet plus the duplicate/noise
persona synthesis. That evidence supports control-plane health and scheduling
decisions only; it is not final-stack validation.

The latest trend evidence packet was generated at `2026-05-17T09:55:50Z` from
monitor data through `2026-05-17T09:52:12Z`:

```text
monitor passes: 1927
coverage files: 272 -> 42515
coverage files delta: 42243
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 0.6667
duplicate_share_historical_last: 0.3535
summary_startup_failures_last: 0
quality issues: 0
enabled groups current: novelty-ws-real-user-rich-text,
  novelty-http-persistence-probe
fuzz level mix: browser-e2e=27 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 4751414
browser-e2e execution: 100773 cumulative / 52 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
unit-property execution: 4219300 cumulative / 173376 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 30.52 / 26.73 / 64.89 on 64 cores
memory: 444.6G free
```

Largest trend-recorded novelty gaps are `ui-heading-shortcut` `785/1000`,
`reload-post-action` `799/1000`, title-save-reload `318/500`,
body-save-reload `377/500`, and successful real-user-editing records
`448/500`.

This is coverage/control-plane health evidence only. It is not rebuilt
final-stack validation and must not be treated as either filing readiness or a
validated final-stack failure for the current branch inventory.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T095247Z-synthesis.md`. It says:

- status remains blocked and not filing-ready;
- use the Cycle 252/254 no-PR03B main product spine, with PR02A, PR03B, PR06B,
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

The latest current split input, `current-pr-split.md`, records the Cycle 252
and Cycle 254 action results behind that synthesis:

- `rtc-cycle252-pr03b-sidecar-audit-manifest` rebased the no-PR03B
  PR04-through-PR15C main spine, verified adjacent ancestry and
  `git diff --check`, and wrote branch audit, push manifest, graph,
  range-diff, diffstat, and numstat evidence. It also rebased PR06B as a PR06A
  sidecar, but PR07C then conflicted in
  `packages/core-data/src/test/entities.js`, so the validation-only sidecar
  head was not created at that point.
- A later split-review synthesis records PR07C as repaired at `2d112932f0e3`.
  That removes the earlier `entities.js` PR07C blocker.
- Cycle 254 launched `rtc-cycle254-pr06b-validation-repair` from
  `runs/20260517T093136Z/jobs/run-rtc-cycle254-pr06b-validation-conflict-repair-and-sidecar-validation-head.sh`.
  The newest synthesis says that work produced the fetch-only validation head
  at `6b36a3bd79afc6e8c63b1d7c6200d52d22f0b179`, but not dependency-backed
  validation proof.
- The `20260517T094510Z` progress-unblock pass wrote fresh branch/audit and
  push-manifest supplement artifacts for PR02A, PR03B, PR06B, PR07C, the
  no-PR03B PR15C stack tip, and reload-hydration diagnostic/product
  candidates. These are source/audit inputs; the status report still uses only
  `verified-content` rows from `branch-link-audit.md` as PR-content links.
- `rtc-cycle252-9f4dcc759070-search-button-undo-redo-owner-comparison`
  completed and classified `9f4dcc759070` as sync undo/history ownership.
- `rtc-cycle252-wp-env-runtime-unblock-replays` got `npm run wp-env status` to
  a running state on HTTP port `8890` with MySQL `33987` and an HTTP probe
  returning `200`, but replay outputs are still blocked by the PR03B PHP
  bootstrap and browser `collaborationEnabled:null` failures.

The latest duplicate/noise synthesis,
`duplicate-noise-20260517T094826Z-synthesis.md`, keeps duplicate/noise work in
the fuzzer control plane. It says strict no-product
`pre_action_bootstrap_stall` suppression is mostly in place, but
product-evidence `timeout` / `unknown` / harness families still leak repeated
analysis because active-job keys are too detailed and non-actionable gates do
not propagate to siblings. The safe ordering is: cap consumer launches to one
representative per stable mechanism, propagate non-actionable gates only when a
representative has no visible likely-real result, then rotate noisy producers.
Do not add broad raw `timeout` suppression.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR06B", stale PR13 review-ref warnings, and "only
novelty-http is enabled" claims are superseded by the current branch-link
audit, empty raw novelty input, trend packet, Cycle 252/254 no-PR03B topology,
fetch-only validation head, and repaired PR13 audit refs.

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
| Reload-hydration diagnostics | `045710`, `055716`, `062719`, `065722`, `073541` diagnostics | diagnostic-only unless newer evidence proves product ownership; latest mapped diagnostic is `20260517T073541Z` | Replay seeds `5900001` and `5400002` plus strict reload/revision-persistence families against the provider-lifecycle diagnostics before any product promotion |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | Cycle 240 owner/downscope artifacts | consumed as PR05C-covered / oracle-equivalence downscope; not an open PR18x gate | Keep out of PR18x/PR5D unless new source-owned product evidence appears |
| Fresh strict/focused/current likely-real residuals | current strict-expansion and focused-shard rows; raw novelty status is empty in this collection | owner-triage input only; do not name PR18x from historical duplicate/noise aggregates or from incomplete current-run novelty output | Compare parser/rich-text/entity/linebreak rows against PR05B/PR05C first, revision rows against PR03/PR03B/PR07C, and block-tree rows against PR11C/PR12 before later owners |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T094826Z-synthesis.md`; completed prior feedback actions | no product-code split change; strict no-product startup noise is mostly suppressed, but product-evidence timeout/unknown/harness families still need representative-analysis caps, safe gate propagation, and producer rotation | Preserve product-evidence visibility; only cap or gate siblings after a non-actionable representative exists and no visible likely-real result is present |

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
12. Treat the empty raw novelty status and latest trend packet as
    fuzz/control-plane health evidence, not as final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
