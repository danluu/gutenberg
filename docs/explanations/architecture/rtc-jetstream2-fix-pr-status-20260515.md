# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T11:05:06Z`

Trigger event:
`pr-split-2026-05-17T11-04-04Z-20260517T105433Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T11-04-04Z-20260517T105433Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The active maintainer-facing hypothesis is still the
Cycle 260 no-PR03B main spine, with PR03B runtime-gated after PR03, PR07C
runtime/validation-gated after PR07B, and PR06B repaired as a PR07B-based
sidecar candidate. The latest split-persona pass (`pr-split-20260517T105433Z`)
does not justify another structural split change, but the raw split file's
`20260517T105428Z` progress-unblock addendum updates the branch/ref status:
PR05B/PR05C now map to corrected no-PR03B local refs, PR06B maps to the repaired
Cycle258 sidecar, PR07C maps to the accepted sidecar, and the newest
reload-hydration deferred candidate is `72854f05ed2`.

Current maintainer-facing product spine, excluding runtime-gated and
validation-only sidecars:

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
PR06B after PR07B: repaired malformed-save request-payload sidecar candidate
PR07C after PR07B: reload record snapshots
validation heads: fetch-only evidence, not product PRs
```

Current blockers:

- Do not file or push product PRs yet.
- Do not run broad final-stack fuzzing yet.
- Rebuild stack-wide validation only after runtime readiness is classified
  against the repaired topology.
- Focused seed `1020002` should run only if rebuilt validation still requires
  it; it is a final-stack proof gate, not a product branch-discovery gate.
- Let the Cycle260 PR05B/PR05C owner-comparison job finish and require nonempty
  comparison artifacts before naming any PR18x slot.
- Keep reload-hydration, pre-save collapse, rich-text suffix, malformed-save
  residuals, and broader HTTP room-isolation residuals evidence-only until a
  focused owner replay produces product evidence and a clean audited branch.

## Branch And Ref Status

Remote status was collected at `2026-05-17T11:05:01Z`.

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

The branch-link audit was generated at `2026-05-17T11:05:06Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

The newest raw split addendum records these local-machine refs as useful
branch/ref status, but they are not `verified-content` rows in the fetched
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
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | corrected no-PR03B local ref exists; Cycle260 owner-comparison remains active |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | corrected no-PR03B local ref exists; seed `5700084` still waits for owner-comparison output |
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
collected_at_utc: 2026-05-17T11:05:01Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T104119Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Raw novelty status is present for `run-20260517T104119Z`, but it is
coverage/control-plane health evidence only. It is not rebuilt final-stack
validation and must not be treated as either filing readiness or a validated
final-stack failure.

Latest novelty monitor snapshot, updated at `2026-05-17T11:03:33.818Z`:

```text
coverage files: 43394
total records seen: 67114
records processed this pass: 77
new behavioral feature keys this pass: 3
new CDP coverage hashes this pass: 3
current-run records by profile: real-user-editing=19
current-run successful records by profile: real-user-editing=19
current-run actionable signatures: 0
current-run likely-real visible: 0
current-run product-evidence signatures: 0
current drain actionable signatures: 0
current drain likely-real visible: 0
historical signatures: 9891
historical likely-real visible: 156
enabled groups: novelty-ws-real-user-editing, novelty-ws-real-user-rich-text
paused groups: novelty-ws-lifecycle, novelty-http-persistence-probe
load1: 63.72 / cores: 64
memory free: 427.9G / 492.0G
headroom for adding groups: yes
```

The current run reset from `run-20260517T101235Z` to `run-20260517T104119Z` at
`2026-05-17T10:41:31Z`, preserving the two unexpired startup-noise cooldowns
while resetting current-run startup and quality counters. It is producing
successful `real-user-editing` records, but it currently has no current-run
actionable, likely-real, product-evidence, or active duplicate-family-dominated
signatures. The paused lifecycle and HTTP probe groups remain inside
startup-noise cooldowns; the enabled groups are the two WS real-user lanes.

Largest current novelty gaps in the newer novelty monitor are
title-save-reload `364/500`, `ui-heading-shortcut` `839/1000`,
body-save-reload `423/500`, `reload-post-action` `860/1000`, and successful
real-user-editing records `489/500`.

The latest trend evidence packet was generated at `2026-05-17T10:54:47Z` from
monitor data through `2026-05-17T10:51:29Z`:

```text
monitor passes: 1941
coverage files: 272 -> 43183
coverage files delta: 42911
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.353
summary_startup_failures_last: 0
quality issues: 0
enabled groups current: novelty-ws-real-user-rich-text,
  novelty-ws-real-user-editing
fuzz level mix: browser-e2e=28 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 4989400
browser-e2e execution: 101571 cumulative / 572 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
unit-property execution: 4456488 cumulative / 130032 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 66.81 / 67.62 / 65.36 on 64 cores
memory: 423.9G free
```

The trend packet remains graph-derived input evidence, not an instruction and
not a product-bug count. Browser E2E remains the only level with confirmed
likely-real findings in the trend packet, but lower-level lanes are under
triaged and should not be declared useless from zero likely-real output.
Because CPU load is already near or above core count, prefer guarded top-offs,
startup-stall reduction, and bounded lower-level targets with clear oracles
over broad browser concurrency increases.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T105433Z-synthesis.md`. It says no new structural PR split is
justified, keeps reload-hydration, pre-save collapse, rich-text suffix,
malformed-save residuals, and HTTP room-isolation residuals out of the product
split, and keeps current zero likely-real fuzz status as health evidence rather
than final-stack validation. Its older PR13 shape-ref wording and stale
`novelty-http-persistence-probe` enablement claim are superseded here by the
current branch-link audit and the `2026-05-17T11:03:33Z` novelty snapshot.

The raw split file's latest `Cycle 260 Progress-Unblock Addendum` records
fresh non-`1020002` branch/audit/manifest work:

- fresh artifacts under
  `runs/20260517T103916Z/jobs/progress-unblock-20260517T105428Z/`;
- corrected local PR05B/PR05C refs in the no-PR03B stack;
- repaired local PR06B-on-PR07B sidecar ref;
- accepted local PR07C sidecar ref;
- latest reload-hydration deferred candidate `20260517T103640Z` at
  `72854f05ed2`;
- loop repair so markdown-formatted split-file updates and verified fresh
  artifact wording count as independent progress;
- `bash -n rtc-pr-split-review-loop.sh` passed after that loop patch.

The latest duplicate/noise synthesis (`duplicate-noise-20260517T105234Z`) says
the active current run is not duplicate/noise dominated: current scoped triage
has zero signatures. The remaining risk is control-plane leakage where stale
no-product startup/bootstrap noise can be reactivated by stale triage/analysis
consumers. The recommended work is consumer-boundary gating and stale direct
watcher cleanup, not product PR split changes or broad suppression. Product
evidence must remain eligible when it appears.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR06B", stale PR13 review-ref warnings, and "only
novelty-http is enabled" claims are superseded by the current branch-link
audit, current novelty/trend inputs, Cycle 260 topology, repaired PR13 audit
refs, and PR06B/PR07B composability evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR06B / PR07B helper dedupe | Cycle258 repair artifacts; `cycle258/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b` at `b7addcd16ae9ca4a2f7a1255e6580a74f89ccb88` | old independent PR06A sidecar is superseded; repaired PR06B-on-PR07B candidate and fetch-only validation head exist locally; `actions.js`, `entities.js`, touched JS lint, and `git diff --check` passed in the Cycle258 evidence | Publish/fetch/audit an explicit PR06B product branch before filing; classify runtime readiness and rebuild stack validation against the Cycle258 topology |
| PR14B / PR15-on-PR14B finalization | Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology; active no-PR03B main spine tip is `98034aa49b4b`, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Publish/fetch/audit explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| PR07C reload record snapshots | accepted sidecar after PR07B; `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at `2d112932f0e3` | included in the Cycle258 fetch-only validation topology; no current `verified-content` branch-link row exists | Publish/fetch/audit the sidecar-aware PR07C product branch and keep validation-only heads out of product PR rows |
| PR03B browser `restoreRevision` CRDT invalidation | `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760` | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes; current replay is still runtime-readiness gated | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR05B/PR05C owner comparison | Cycle260 job `rtc-cycle260-pr05b-pr05c-owner-comparison` | active independent gate for parser/rich-text/entity/linebreak strict-expansion rows; PR05B/PR05C local refs now map to corrected no-PR03B stack refs | Require nonempty `report.md`, `classification.tsv`, `owner-comparison.tsv`, `branch-audit.tsv`, and `artifact-verification.tsv` before naming PR18x or PR05D |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split remains PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | final-stack validation/fuzz history | final-stack validation/fuzz/filing-only; not an independent-work blocker and not PR17 product work | Keep it out of product blocker scans unless later evidence proves product ownership; settle only after runtime readiness is classified and rebuilt validation still requires it |
| `980007` / `980017` marker-divergence owner comparison | Cycle 248/250 owner-comparison queue; runtime unblock replays | no PR18x from current evidence; replay `980007` against the validation head first, then PR12, PR15C, and PR07C only if still red; keep `980017` blocked on missing `result.json` and `handoff.md` | Emit provider snapshots and consume runtime replay outputs before assigning ownership |
| `9f4dcc759070` Search button undo/history issue | Cycle 252 owner comparison | classified as sync undo/history redo-stack loss through `core/search.buttonText`, not PR05B/PR05C and not PR18x | Add a narrow sync undo-manager red test or instrumented repro around Search button-text undo after PR05 owner-comparison is active or complete |
| Reload/post-save `5200005` table-delete replay | completed reducer evidence | PR12-covered by previous-local-cache block delete; not a new product branch | Consume the classification into filing notes; reopen only if later evidence contradicts PR12 coverage |
| Strict `5200005` nested-group signal | `a914c862c29e` | latest source-local evidence marks it PR11C-covered; no PR18x assignment | Consume PR11C-covered classification; reopen only on fresh red evidence |
| Parser-sensitive seed `1060015` | prior focused WebSocket/browser artifacts | downscoped out of current product blockers unless new red evidence appears | Keep out of PR5D/PR18 unless a fresh prepared-browser repro and source-owner reducer prove product ownership |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B | downscoped out of current product blockers unless new red evidence appears | Keep out of PR18A unless a fresh UI-only browser repro proves source ownership |
| Reload-hydration diagnostics | `045710`, `055716`, `062719`, `065722`, `073541`, `093634`, `100637`, `103640` diagnostics | diagnostic-only unless newer evidence proves product ownership; newest deferred candidate is `deferred/rtc-reload-hydration-20260517T103640Z` at `72854f05ed2` | Keep branch audit / push manifest fresh if newer diagnostics land; replay `6dffde406703` / seed `5900001` as diagnostics only after runtime is usable |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | Cycle 240 owner/downscope artifacts | consumed as PR05C-covered / oracle-equivalence downscope unless the active PR05 owner-comparison proves otherwise | Keep out of PR18x/PR5D unless new source-owned product evidence appears |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | not fixed; latest split keeps it out of active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T105234Z-synthesis.md` | control-plane only; no product-code split change; current active/drain triage both report zero signatures | Harden consumer-boundary launch eligibility for stale/no-product startup noise; keep product-evidence failures visible and avoid broad suppression |

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
5. Before rebuilt combined validation or filing, classify runtime readiness
   against the repaired topology and rerun any feasible PR03B/PR07C runtime
   checks. Cycle258 already passed bounded `actions.js`, `entities.js`, touched
   JS lint, and `git diff --check`.
6. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07B, PR05A/B/C, repaired PR06B, PR07C, PR11A-E,
   PR13B0/B1/B2/B3 if available, PR14B, and PR15A/B/C-on-PR14B before treating
   those finer refs as maintainer-facing links.
7. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
8. Use the refreshed branch-audit and push-manifest artifacts that cover
   `deferred/rtc-reload-hydration-20260517T103640Z`; refresh again if newer
   deferred diagnostics land.
9. Rerun focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, and any feasible
   PR03B/PR07C runtime checks.
10. Settle seed `1020002` only as a final-stack validation/fuzz/filing gate
    after runtime readiness is classified against the repaired topology and
    rebuilt validation still requires it.
11. Consume `980007`, `5900001`, and `5400002` runtime replay outputs; keep
    `980017` blocked until its missing `result.json` and `handoff.md` exist.
12. Let the Cycle260 PR05B/PR05C owner-comparison job emit nonempty comparison
    artifacts, then add the narrow `9f4dcc759070` sync undo/history red test or
    instrumented repro before inventing a PR18x bucket.
13. Keep reload-hydration diagnostics diagnostic-only until focused replay
    proves product ownership and a clean branch is shaped.
14. Treat the current novelty status and trend packet as fuzz/control-plane
    health evidence, not as final-stack validation, a validated final-stack pass
    or failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
