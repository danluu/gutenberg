# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T09:02:11Z`

Trigger event:
`duplicate-noise-2026-05-17T09-01-37Z-112`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-17T09-01-37Z-112/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked, and this is not a wait-only cycle. The newest completed
split-persona synthesis, `pr-split-20260517T084549Z-synthesis.md`, changes the
current recommendation: the Cycle 250 `ready-pr03b/*` branch set is still the
best recent branch inventory, but PR03B should no longer be treated as stable in
the main product spine while its browser/PHP replay is blocked by unavailable or
uninitialized `wp-env`.

Current maintainer-facing shape:

```text
PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR04
   plus PR03B as a PR03 sidecar / validation-only sidecar until runtime replay passes
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

Use only fresh audited product refs from the Cycle 250 branch inventory. Old
downstream `ready/*`, `final/*`, raw `deferred/*`, `try/*`, validation-only
heads, candidate PR16 refs, PR17-as-product, and PR18/PR18x refs are not product
PR heads. If the final audited branch set still uses `ready-pr03b/*` names, the
report must treat the name as inventory provenance, not proof that PR03B belongs
in the main base chain.

Current blockers and status changes:

- The nonempty `20260517T082257Z` finalization report remains useful branch
  inventory, but the latest synthesis supersedes its PR03B-in-spine assumption.
  Refresh manifests/audits after the latest deferred-candidate reports and
  explicitly prove the PR03B sidecar topology before filing.
- PR03B still lacks runtime browser/PHP replay evidence because recent runtime
  gates recorded unavailable or uninitialized `wp-env`.
- Rebuilt combined validation must wait for the PR03B sidecar/spine decision,
  then include validation-only PR03B, PR06B, PR07C, PR14B, and PR15C as needed.
  Settle seed `1020002` only if the rebuilt stack still requires it.
- The latest synthesis keeps `980007` as a bounded owner-replay gate, starting
  from the validation head and then PR12, PR15C, and PR07C only if still red.
  Keep `980017` blocked until its missing `result.json` and `handoff.md` exist.
- Provider-lifecycle diagnostics for seeds `5900001` and `5400002` remain
  bounded diagnostic work before any reload-hydration product promotion.
- The latest raw novelty summary is populated for
  `run-20260517T085929Z`: current-run triage has `0` signatures, `0`
  product-evidence signatures, and `0` visible likely-real failures. This is an
  early post-restart control-plane sample, not rebuilt final-stack validation.
  Historical duplicate/noise and likely-real aggregates remain historical only.

PR17, PR18, and PR18x remain absent as product slots. Seed `1020002` is
final-stack validation/fuzz/filing-only unless newer product-owned evidence
appears. Parser, rich-text, entity, and linebreak residual rows must compare
against PR05B/PR05C before assigning any later owner.

The duplicate/noise work is fuzzer control-plane health work, not product PR
work. The newest duplicate/noise action,
`duplicate-noise-20260517T082922Z-feedback-action.md`, implemented the
run-local `no-analysis.json` gate for no-product startup/known-noise work,
keeps product-evidence and visible likely-real signatures analyzable, restarted
the novelty/supervisor path into `run-20260517T085929Z`, and found the next
blocker is environment health: browser groups are blocked by `wp-env` REST
HTTP 500, default `wp-env` is uninitialized, and `npm run wp-env start` failed
because port `8888` is already allocated.

## Branch And Ref Status

Remote status was collected at `2026-05-17T09:02:05Z`.

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

The branch-link audit was generated at `2026-05-17T09:02:11Z` from fetched
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
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified original branch; sidecar-aware replacement still needs verified branch link |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; comparison point for parser/rich-text residuals |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` is PR05C-covered plus oracle-equivalence downscope unless new evidence contradicts it |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified original branch; excludes malformed-save restack and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified original branch; narrow persisted-body guard |
| PR 6B | Minimal malformed outgoing RTC save request-payload guard after PR06A | No verified branch link yet | 2 | TBD | recommended PR06A sidecar; include in rebuilt validation but do not file until audited |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified original branch; sidecar-aware replacement still needs verified branch link |
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
collected_at_utc: 2026-05-17T09:02:05Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T085929Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw novelty monitor input was updated at `2026-05-17T09:01:16.760Z`
for `run-20260517T085929Z`. Current output-dir triage is clean, but early:

```text
coverage files: 42397
total records seen: 65631
records processed this pass: 17
current-run records by profile: {}
current-run successful records by profile: {}
unmet coverage goals: 5
quality issues: 1
current-run signatures: 0
current-run product-evidence signatures: 0
current-run likely-real visible: 0
current-run likely-real merged duplicates: 0
enabled groups: novelty-ws-lifecycle,
  novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text,
  novelty-http-persistence-probe
health warning: no behavioral coverage files found under novelty output dir
```

The enabled group list is scheduler intent, not proof of active browser
generation. The latest duplicate/noise action records that both browser groups
are currently blocked by `wp-env` REST health returning HTTP 500.

The same raw novelty input reports historical aggregate triage separately:

```text
historical triage roots: 260
historical signatures: 9838
historical raw signatures: 35055
historical product-evidence signatures: 9747
historical likely-real visible: 128
historical likely-real merged duplicates: 1309
historical top duplicate family share: 0.3533
historical no-product raw top duplicate family share: 0.9501
```

Keep current-run triage and historical triage separate. Historical aggregate
counts are useful for control-plane health, but must not be promoted into
current product blockers.

The latest trend evidence packet was generated at `2026-05-17T08:52:40Z` from
monitor data through `2026-05-17T08:49:15Z`:

```text
monitor passes: 1907
coverage files: 272 -> 42283
coverage files delta: 42011
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 0.6667
duplicate_share_historical_last: 0.3526
summary_startup_failures_last: 0
quality issues: 0
enabled groups current: novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text
fuzz level mix: browser-e2e=27 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 4497213
browser-e2e execution: 100616 cumulative / 128 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
unit-property execution: 3965256 cumulative / 115584 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 42.13 / 50.46 / 81.25 on 64 cores
memory: 443.4G free
```

Largest trend-recorded novelty gaps are `ui-heading-shortcut` `780/1000`,
`reload-post-action` `793/1000`, title-save-reload `314/500`,
body-save-reload `373/500`, and successful real-user-editing records
`446/500`.

This is coverage/control-plane health evidence only. It is not rebuilt
final-stack validation and must not be treated as either filing readiness or a
validated final-stack failure for the current branch inventory.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T084549Z-synthesis.md`. It says:

- status is blocked, not filing-ready, and not wait-only;
- the Cycle 250 branch inventory is useful, but PR03B should move out of the
  main spine and become a PR03 sidecar / validation-only sidecar until runtime
  replay passes;
- the stack still needs a PR03B sidecar branch audit/manifest, rebuilt
  final-stack validation after that decision, `980007` owner replay, and
  provider-lifecycle diagnostics for `5900001` and `5400002`;
- `980017` remains blocked until its missing `result.json` and `handoff.md`
  exist, and no PR18x product slot should be created from the current evidence.

The latest nonempty PR-split feedback action,
`pr-split-20260517T082453Z-feedback-action.md`, confirms that the Cycle 250
action updated `current-pr-split.md`, verified the `20260517T082257Z`
finalization artifacts as newer than the `080545` deferred reload-hydration
state, launched bounded `980007` and reload-diagnostics jobs, and deferred
PR03B runtime replay because `wp-env` was unavailable or uninitialized.

The latest duplicate/noise synthesis,
`duplicate-noise-20260517T082922Z-synthesis.md`, keeps duplicate/noise work in
the fuzzer control plane. It recommended an authoritative run-local
`no-analysis.json` gate for no-product startup/known-noise work,
product-evidence drain preservation, live-analysis suppression for
no-product-only gated runs, and sentinel propagation before producer enabled
checks. The matching completed action,
`duplicate-noise-20260517T082922Z-feedback-action.md`, patched novelty,
supervisor, triage, analysis, deep-analysis, and live-analysis consumers;
`node --check` passed for all changed `.mjs` files; gate-only validation found
`badStartupQueued=0` and `noProductLaunchable=0`; and
`live-analysis-monitor --once` started analysis only for product-evidence
signatures. It restarted
novelty and supervisor into `run-20260517T085929Z`, but post-restart browser
generation is blocked by `wp-env` REST HTTP 500.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR6B", stale PR13 review-ref warnings, and "only
novelty-http is enabled" claims are superseded by the current branch-link
audit, raw novelty status, trend packet, PR03B sidecar synthesis, and completed
duplicate/noise gate action.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR14B / PR15-on-PR14B finalization | `20260517T074254Z` and `20260517T082257Z` finalization reports; `ready-pr03b/*` branch inventory | mandatory replacement topology; PR07C conflict is resolved, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B and the latest synthesis requires PR03B sidecar-aware audit before filing | Refresh/publish/fetch/audit only explicit product refs after the PR03B sidecar decision and keep validation-only heads out of product PRs |
| Malformed-save request-payload PR6B | minimal PR06A sidecar | active recommended sidecar after PR06A; no current `verified-content` branch-link row | Publish/fetch/audit the minimal product branch, keep validation-only heads out of filing branches, verify inclusion in rebuilt validation |
| PR07C reload record snapshots | accepted sidecar after PR07B; `20260517T074254Z` finalization report | accepted product sidecar; prior PR03B restack conflict is resolved, but no current `verified-content` branch-link row exists | Publish/fetch/audit the sidecar-aware PR07C product branch and run focused runtime checks only if environment is usable |
| PR03B browser `restoreRevision` CRDT invalidation | `ee0d01a82e12`; Cycle 250 branch inventory | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes; no verified branch link and focused runtime replay is environment-gated | Run a bounded `wp-env`-owning runtime gate and generate a sidecar branch audit/manifest; rebuild validation only after the sidecar/spine decision is evidenced |
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
| Fresh strict/focused/current likely-real residuals | current strict-expansion and focused-shard rows; raw novelty current-run triage has `0` signatures and `0` visible likely-real failures; trend packet still has `likely_real_max: 4` historically | owner-triage input only; do not name PR18x from historical duplicate/noise aggregates or early post-restart current-run emptiness | Compare parser/rich-text/entity/linebreak rows against PR05B/PR05C first, revision rows against PR03/PR03B/PR07C, and block-tree rows against PR11C/PR12 before later owners |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T082922Z-synthesis.md`; `duplicate-noise-20260517T082922Z-feedback-action.md`; raw novelty `run-20260517T085929Z` | no product-code split change; run-local no-analysis gating and product-evidence drain preservation are implemented, but post-restart browser generation is blocked by `wp-env` REST HTTP 500 and default `wp-env` is uninitialized | Keep current-run and historical duplicate/noise scopes separate, preserve real product-evidence signatures, resolve the environment health blocker, and require rebuilt final-stack monitor evidence before filing |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use only explicit product refs. Do not wildcard import or file `final/rtc-pr*`,
   validation-stack branches, deferred branches, dirty evidence branches, old
   downstream `ready/*` refs, or PR03B-spine refs that have not been refreshed
   after the sidecar decision.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR13
   refs, old PR6B/PR16 material, dirty evidence branches, and the untracked
   reload-hydration gate spec out of filing branches and push allow-lists.
3. Publish/fetch and audit explicit sidecar-aware product refs for PR02A, PR03B,
   PR04-through-PR07B, PR05A/B/C, PR6B, PR07C, PR11A-E, PR13B0/B1/B2/B3 if
   available, PR14B, and PR15A/B/C-on-PR14B before treating those finer refs as
   maintainer-facing links. Treat the `082257Z` finalization artifacts as useful
   inventory, not as final filing proof for PR03B-in-spine topology.
4. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
5. Rebuild the combined stack from explicit sidecar-aware product refs and the
   audited PR13 fallback or finer PR13 split decision.
6. Rerun focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, and any feasible
   PR03B/PR07C runtime checks.
7. Settle seed `1020002` only as a final-stack validation/fuzz/filing gate.
8. Replay `980007`; keep `980017` blocked until its missing `result.json` and
   `handoff.md` exist.
9. Keep reload-hydration diagnostics diagnostic-only until focused replay proves
   product ownership and a clean branch is shaped.
10. Treat the populated raw novelty summary as current-run control-plane
    health only. Refresh it after browser generation is healthy and block
    filing if fresh final-stack monitor evidence shows visible product
    failures.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. The current
raw novelty input is populated and clean for the active output dir, but it is an
early post-restart sample with browser generation blocked by `wp-env` REST
health. None of the current trend, duplicate/noise, residual reducer, or
status-persona evidence is final-stack fuzz validation or a filing unblocker.
