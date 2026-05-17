# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T09:42:05Z`

Trigger event:
`pr-split-2026-05-17T09-39-28Z-20260517T093136Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T09-39-28Z-20260517T093136Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The newest completed split-persona synthesis,
`pr-split-20260517T093136Z-synthesis.md`, says all six non-empty split-review
reports converge on replacing the stale `ready-pr03b/*` PR03B-in-main-spine
topology. Use the Cycle 252 no-PR03B main product spine. PR03B, PR06B, and
PR07C are sidecars.

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
PR03B after PR03: browser restoreRevision CRDT invalidation, runtime-gated
PR06B after PR06A: minimal malformed-save guard
PR07C after PR07B: reload record snapshots
validation-only head: no-PR03B PR15C + PR03B + PR06B + repaired PR07C
```

Current blockers and status changes:

- PR07C sidecar repair is durable at `2d112932f0e3`, but the combined
  validation-only head still cannot be built because PR06B now conflicts in
  `packages/core-data/src/test/actions.js`.
- PR03B runtime replay is still not durable proof. The runtime unblock job got
  `wp-env status` to a running state and an HTTP probe to `200`, but the
  latest synthesis says PHP/runtime replay remains active and should not be
  treated as passed.
- Build the validation-only head only after the PR06B conflict is repaired.
  Then run rebuilt combined validation, focused seed `1020002` only if still
  required, broad final-stack fuzz, and filing checks.
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
`duplicate-noise-20260517T091228Z-synthesis.md`, says the main leak is still
source-truth drift across producer, triage, analysis, live-analysis, and
novelty accounting. It recommends strict no-product startup classification,
Playwright `--retries=0` for fuzz attempts, source-aware family selection,
paused `no-analysis` dirs in current-run accounting, and live-analysis drain
dir fixes. The matching `duplicate-noise-20260517T091228Z-feedback-action.md`
now records completed control-plane remediation in the fuzzer scripts, with
`node --check` passing on touched `.mjs` files and the known retry
misnormalization leak changing to a suppressed bootstrap-stall while a separate
product-evidence late-session signature remained queued. This is completed
fuzzer control-plane progress, not a product PR or filing unblocker.

## Branch And Ref Status

Remote status was collected at `2026-05-17T09:42:00Z`.

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

The branch-link audit was generated at `2026-05-17T09:42:05Z` from fetched
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
| PR 6B | Minimal malformed outgoing RTC save request-payload guard after PR06A | No verified branch link yet | 2 | TBD | recommended PR06A sidecar; currently blocks validation-only head because of conflict in `packages/core-data/src/test/actions.js` |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified original branch; no-PR03B replacement still needs verified branch link |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified original branch stacked after PR 7A |
| PR 7C | Reload record snapshots sidecar after PR07B | No verified branch link yet | TBD | TBD | accepted sidecar; repair is durable at `2d112932f0e3`, but product branch still needs verified link |
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
collected_at_utc: 2026-05-17T09:42:00Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T092302Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw novelty status input is populated in this collection. It was updated at
`2026-05-17T09:41:08.754Z` for
`/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T092302Z`.
It reports health `ok`, two current-run actionable/product-evidence signatures,
and one visible current-run likely-real signal. The no-product startup signal is
suppressed as startup noise; the remaining current actionable family is
product-evidence `timeout`, so it is not safe to suppress as duplicate/noise:

```text
coverage files: 42507
total records seen: 65839
records processed this pass: 2
summary startup failures processed this pass: 0
current-run records by profile: persistence-no-title=11, real-user-editing=3
current-run successful records by profile: persistence-no-title=7
current-run records by transport: http=11, ws=3
current-run pre-action startup failures by profile: persistence-no-title=1
current-run triage roots: 2
current-run signatures/actionable/product-evidence signatures: 2 / 2 / 2
current-run likely-real visible: 1
current-run no-product likely-real visible: 0
suppressed strict startup records: 1
current-run top duplicate family share: 1
current-run top semantic families: timeout=2
historical top duplicate family share: 0.3535
historical raw top duplicate family share: 0.597
```

The monitor lists `novelty-ws-real-user-rich-text` and
`novelty-http-persistence-probe` as enabled, with `novelty-ws-lifecycle` paused
inside a six-hour strict startup-noise cooldown. The latest monitor recommends
the real-user-editing and real-user-rich-text groups for coverage goals, but its
enabled list still contains only rich-text and HTTP persistence. The latest
recent-change log writes a `no-analysis` sentinel only for the no-product
HTTP-persistence pre-action bootstrap signal while preserving product-evidence
signatures for analysis.

The latest trend evidence packet was generated at `2026-05-17T09:32:40Z` from
monitor data through `2026-05-17T09:31:21Z`:

```text
monitor passes: 1919
coverage files: 272 -> 42497
coverage files delta: 42225
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 0.5
duplicate_share_historical_last: 0.3535
summary_startup_failures_last: 0
quality issues: 0
enabled groups current: novelty-ws-real-user-rich-text,
  novelty-http-persistence-probe
fuzz level mix: browser-e2e=27 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 4647839
browser-e2e execution: 100742 cumulative / 8 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
unit-property execution: 4115756 cumulative / 28896 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 29 / 143.96 / 172.96 on 64 cores
memory: 445.6G free
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
`pr-split-20260517T093136Z-synthesis.md`. It says:

- status needs split change and is not filing-ready;
- all six non-empty split-review reports agree to replace the stale
  `ready-pr03b/*` PR03B-in-main-spine topology;
- use the Cycle 252 no-PR03B main spine, with PR03B, PR06B, and PR07C as
  sidecars;
- PR07C sidecar repair is durable at `2d112932f0e3`;
- the validation-only head is blocked by a PR06B conflict in
  `packages/core-data/src/test/actions.js`;
- final-stack work starts only after that conflict is repaired and the
  validation-only head is built;
- runtime replay for PR03B, `980007`, `5900001`, and `5400002` is still active
  and not durable proof despite `wp-env` progress;
- `9f4dcc759070` should get a narrow sync undo/history red test or
  instrumented repro;
- finalization/manifest logic should reject stale `ready-pr03b/*` main-spine
  manifests as topology-stale.

The latest current split input, `current-pr-split.md`, records the Cycle 252
action result behind that synthesis:

- `rtc-cycle252-pr03b-sidecar-audit-manifest` rebased the no-PR03B
  PR04-through-PR15C main spine, verified adjacent ancestry and
  `git diff --check`, and wrote branch audit, push manifest, graph,
  range-diff, diffstat, and numstat evidence. It also rebased PR06B as a PR06A
  sidecar, but PR07C then conflicted in
  `packages/core-data/src/test/entities.js`, so the validation-only sidecar
  head was not created at that point.
- A later split-review synthesis records PR07C as repaired at `2d112932f0e3`.
  That removes the earlier `entities.js` PR07C blocker, but the validation-only
  head is still blocked by the separate PR06B conflict in
  `packages/core-data/src/test/actions.js`.
- `rtc-cycle252-9f4dcc759070-search-button-undo-redo-owner-comparison`
  completed and classified `9f4dcc759070` as sync undo/history ownership.
- `rtc-cycle252-wp-env-runtime-unblock-replays` got `npm run wp-env status` to
  a running state on HTTP port `8890` with MySQL `33987` and an HTTP probe
  returning `200`, but replay outputs were still active.

The latest duplicate/noise synthesis,
`duplicate-noise-20260517T091228Z-synthesis.md`, keeps duplicate/noise work in
the fuzzer control plane. It recommends making strict runner/source startup
classification authoritative only for no-product startup noise, disabling
Playwright internal retries for fuzz attempts, applying the gate before retry
coverage can veto suppression, making semantic family selection source-aware,
including paused `no-analysis` dirs in current-run accounting, fixing
`live-analysis-monitor` drain dir recursion, and preserving any product
evidence or visible likely-real signature. The matching feedback-action file now
records the completed control-plane pass: novelty, live-analysis, triage-watcher,
analysis-tier, and deep-analysis-tier scripts were updated; `node --check`
passed for all five touched `.mjs` files; the known
`ws_test_provider_pre_action_bootstrap_stall_retry_misnormalization` leak is
source-gated as bootstrap-stall; analysis/deep-analysis copied-state checks
mark the bootstrap-stall job `source-suppressed`; novelty and live-analysis
were restarted. The newest novelty pass shows the no-product startup signal
suppressed and the remaining current duplicate share as product-evidence
`timeout`, so it is intentionally not suppressed.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR06B", stale PR13 review-ref warnings, and "only
novelty-http is enabled" claims are superseded by the current branch-link
audit, raw novelty status, trend packet, Cycle 252 no-PR03B topology, PR06B
conflict status, and repaired PR13 audit refs.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR14B / PR15-on-PR14B finalization | `20260517T074254Z`, `20260517T082257Z`, and Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology; no current `verified-content` branch links exist for PR14B or PR15-on-PR14B, and stale `ready-pr03b/*` main-spine reports are topology-stale | Publish/fetch/audit only explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| Malformed-save request-payload PR06B | minimal PR06A sidecar | active recommended sidecar after PR06A; latest synthesis says validation-only head is blocked by PR06B conflict in `packages/core-data/src/test/actions.js`; no current `verified-content` branch-link row | Resolve the PR06B conflict, publish/fetch/audit the minimal product branch, then rebuild validation-only head |
| PR07C reload record snapshots | accepted sidecar after PR07B; latest sidecar repair evidence | repair is durable at `2d112932f0e3`; no current `verified-content` branch-link row exists | Publish/fetch/audit the sidecar-aware PR07C product branch and include it in the validation-only head after PR06B is repaired |
| PR03B browser `restoreRevision` CRDT invalidation | `ee0d01a82e12`; Cycle 252 sidecar decision | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes; `wp-env` reached running state but replay proof is not durable yet | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split is PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | final-stack validation/fuzz history | final-stack validation/fuzz/filing-only; not an independent-work blocker and not PR17 product work | Keep it out of product blocker scans unless later evidence proves product ownership; settle before final-stack fuzz/filing if rebuilt validation still requires it |
| `980007` / `980017` marker-divergence owner comparison | Cycle 248/250 owner-comparison queue; runtime unblock replays | no PR18x from current evidence; replay `980007` against the validation head first, then PR12, PR15C, and PR07C only if still red; keep `980017` blocked on missing `result.json` and `handoff.md` | Consume the active runtime replay outputs before assigning ownership |
| `9f4dcc759070` Search button undo/history issue | Cycle 252 owner comparison | classified as sync undo/history redo-stack loss through `core/search.buttonText`, not PR05B/PR05C and not PR18x | Add a narrow sync undo-manager red test or instrumented repro around Search button-text undo |
| Reload/post-save `5200005` table-delete replay | completed reducer evidence | PR12-covered by previous-local-cache block delete; not a new product branch | Consume the classification into filing notes; reopen only if later evidence contradicts PR12 coverage |
| Strict `5200005` nested-group signal | `a914c862c29e` | latest source-local evidence marks it PR11C-covered; no PR18x assignment | Consume PR11C-covered classification; reopen only on fresh red evidence |
| Parser-sensitive seed `1060015` | prior focused WebSocket/browser artifacts | downscoped out of current product blockers unless new red evidence appears | Keep out of PR5D/PR18 unless a fresh prepared-browser repro and source-owner reducer prove product ownership |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B | downscoped out of current product blockers unless new red evidence appears | Keep out of PR18A unless a fresh UI-only browser repro proves source ownership |
| Reload-hydration diagnostics | `045710`, `055716`, `062719`, `065722`, `073541` diagnostics | diagnostic-only unless newer evidence proves product ownership; latest mapped diagnostic is `20260517T073541Z` | Replay seeds `5900001` and `5400002` plus strict reload/revision-persistence families against the provider-lifecycle diagnostics before any product promotion |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | Cycle 240 owner/downscope artifacts | consumed as PR05C-covered / oracle-equivalence downscope; not an open PR18x gate | Keep out of PR18x/PR5D unless new source-owned product evidence appears |
| Fresh strict/focused/current likely-real residuals | current strict-expansion and focused-shard rows; current raw novelty has 2 product-evidence signatures and 1 visible likely-real signal | owner-triage input only; do not name PR18x from historical duplicate/noise aggregates or from early current-run novelty output | Compare parser/rich-text/entity/linebreak rows against PR05B/PR05C first, revision rows against PR03/PR03B/PR07C, and block-tree rows against PR11C/PR12 before later owners |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T091228Z-synthesis.md`; completed `duplicate-noise-20260517T091228Z-feedback-action.md` | no product-code split change; strict no-product startup gating, retry suppression, source-aware family handling, current-run accounting, and live-analysis drain handling were patched and validated on the known retry-misnormalization leak | Let the running analysis classify the remaining product-evidence `timeout` signatures; only add suppression after non-real/infra/duplicate evidence, not from the historical aggregate |

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
3. Resolve the PR06B conflict in `packages/core-data/src/test/actions.js`,
   rebuild the validation-only head from PR03B, PR06B, PR07C, PR14B, and PR15C,
   and only then run rebuilt combined validation.
4. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07B, PR05A/B/C, PR06B, PR07C, PR11A-E,
   PR13B0/B1/B2/B3 if available, PR14B, and PR15A/B/C-on-PR14B before treating
   those finer refs as maintainer-facing links.
5. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
6. Rerun focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, and any feasible
   PR03B/PR07C runtime checks.
7. Settle seed `1020002` only as a final-stack validation/fuzz/filing gate.
8. Consume `980007`, `5900001`, and `5400002` runtime replay outputs; keep
   `980017` blocked until its missing `result.json` and `handoff.md` exist.
9. Add the narrow `9f4dcc759070` sync undo/history red test or instrumented
   repro before inventing a PR18x bucket.
10. Keep reload-hydration diagnostics diagnostic-only until focused replay
    proves product ownership and a clean branch is shaped.
11. Treat the current novelty status as fuzz/control-plane health evidence with
    `1` current-run visible likely-real product-evidence signal, not as
    final-stack validation, a validated final-stack failure, or filing
    readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
