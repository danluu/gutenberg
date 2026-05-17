# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T16:39:02Z`

Trigger event:
`pr-split-2026-05-17T16-37-48Z-20260517T162903Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T16-37-48Z-20260517T162903Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing, broad final-stack fuzzing, GitHub push/open decisions, and stack-wide
validation remain blocked by stale publication evidence, unresolved owner
replays for reload/rich-text residuals, clean local filing gates, and rebuilt
validation. They are not blocked by seed `1020002` alone. The current working
split remains the Cycle 282/Cycle 284 PR07B split/adoption topology:

```text
PR01 -> PR02 (+ PR02A sidecar)
-> PR03 -> PR04 -> PR05A -> PR05B -> PR05C -> PR05D
-> PR06 -> PR06A -> PR07A -> PR07B0 -> PR07B1
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14 -> PR14B
-> PR15A/B/C-on-PR14B
```

Current sidecars and runtime-gated work:

```text
PR02A after PR02: HTTP room-isolation regression
PR03B after PR03: browser restoreRevision CRDT invalidation, runtime-gated
PR06B after PR07B1: repaired malformed-save request-payload sidecar
PR07C after PR07B1: reload record snapshots
validation heads: fetch-only evidence, not product PR links
```

Split details:

- `PR07B0` is saved CRDT response hydration, represented by `e746c32e3f9` and
  deferred evidence commit `72854f05ed2`.
- `PR07B1` is stale base-record/title filtering, represented by current
  `4bdd9465a97`.
- The existing audited `review/rtc-pr07b-save-response-manager-base-record`
  branch is now prior art for the old opaque `PR07B`, not a replacement for
  audited `PR07B0` / `PR07B1` filing branches.

Do not add `PR07D`, `PR17`, `PR18`, or `PR18x` from current evidence. The
Cycle 276 replay classifies `06441205b872` / seed `1100002` as
`covered-by-pr07c`, so `PR07D` remains closed/no-change unless future fresh
evidence proves active `PR07B0` / `PR07B1` / `PR07C` non-coverage. Seed
`1020002` remains terminal/downscoped for product-branch purposes unless
rebuilt validation produces newer product-owned evidence.

Cycle 280 is now prior evidence. It generated a manifest at
`2026-05-17T15:43:25Z`, verified all `34` active manifest rows, harvested
`covered-by-pr07c` for seed `1100002`, kept `PR07D` closed, and left zero queue
rows for `1020002`, `PR17`, stale PR06B/PR07C, split report signals, or `PR18`
/ `PR18x` product work.

Cycle 282 completed the replacement PR07B split/deferred-adoption proof and is
still the active topology evidence. The bounded job emitted nonempty
`branch-audit.tsv`, `push-manifest.tsv`, `manifest-age.tsv`,
`deferred-adoption.tsv`, `stale-row-rejections.tsv`, and artifact verification
at `2026-05-17T16:15:44Z`; it verifies `PR07B0` is an ancestor of `PR07B1`,
rejects stale `ready/*`, raw `deferred/*` filing refs, stale PR06B/PR07C rows,
`PR17` / `1020002`, and `PR18` / `PR18x`, and maps raw reload-hydration
deferred work to active `PR07B0` lineage instead of publishing it as `PR07D`.
The latest split-persona synthesis now treats that Cycle 282 manifest as stale
for filing freshness because it predates the `2026-05-17T16:17:59Z`
reload-hydration report/push manifest and the `2026-05-17T16:23:13Z` current
deferred queue. A fresh manifest/audit newer than both timestamps must reverify
the named `PR07B0` / `PR07B1` refs, the ancestor relation, PR06B/PR07C sidecars,
and raw deferred rejection before filing or stack-wide validation.

Cycle 282 also completed the strict/rich-text owner-comparison proof. It keeps
strict seed `5700084` and the current `rich-text-suffix-corruption` diagnostic
branch out of `PR18` / `PR18x`; the next owner gate is replay against active
`PR05B`, `PR05C`, and `PR05D` with per-peer block trees, edited content,
serialized content, rich-text / verse attributes, client IDs, and
operation-ledger snapshots.

Cycle 284 did not replace that topology; it makes the filing block more
explicit. The latest split-persona synthesis says the next durable progress is
a fresh active manifest/audit and push manifest newer than the
`2026-05-17T16:23:13Z` deferred queue and newer deferred reload artifacts,
named `PR07B0` / `PR07B1` source-ref verification, PR06B/PR07C sidecar
placement verification, reload residual replay against `PR07B0` / `PR07B1` /
`PR07C`, and strict seed `5700084` replay against `PR05B -> PR05C -> PR05D`.
The refreshed branch-link audit in this report verifies available GitHub branch
links, including repaired PR13 links, but it is not by itself the active
manifest/deferred-adoption proof needed for filing.

Independent bounded work can continue in parallel: manifest refresh/deferred
adoption; strict seed `5700084` replay against `PR05B -> PR05C -> PR05D`; reload
residual owner replay for `5200011`, `5200017`, `5200010`, `7110004`, and
`7110017`, with `7500002`, `7700005`, and `7310002` if capacity allows;
pre-save search/live-collapse owner comparison; PR02A/PR05/PR11 shaping; PR05D
publication prep; and PR06B/PR07C sidecar validation. Do not launch broad
final-stack fuzzing, another `1020002` job, or raw deferred branch validation.

The duplicate/noise issue remains control-plane work, not a product split
change. The strict no-product startup gate is already implemented across the
fuzzer-side scripts, but the latest duplicate/noise synthesis identifies a
remaining live-analysis state/capacity leak: current-output family caps can
skip first-level analysis without materializing terminal `family-capped` state.
The next safe control-plane fix is a bounded analysis-tier reconciliation or
equivalent state write, preserving all product-evidence signatures.

## Branch And Ref Status

Remote status was collected at `2026-05-17T16:38:57Z`.

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

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T16:39:02Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

Use only these repaired audited PR13 review refs for current PR13 content:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link these stale or misordered PR13 refs as current PR content:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; needs fetched `verified-content` audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR 3 | No verified branch link yet | TBD | TBD | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | replacement for old aggregate PR 5; needs verified branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine ref exists; GitHub verified-content link is still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine ref exists; linebreak/core-verse rows are PR05C-covered or downscoped, but GitHub verified-content link is still missing |
| PR 5D | Semicolonless entity/reference block validation after PR 5C | No verified branch link yet | TBD | TBD | Cycle 264 clean-base candidate is importable and included in the Cycle 266 validation head; publish/fetch/audit before filing |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save sidecar and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Malformed outgoing RTC save request-payload guard, revised against PR07B0/PR07B1 helper shape | No verified branch link yet | TBD | TBD | repaired PR06B sidecar now after PR07B1; stale ready rows are rejected and a verified branch link is still missing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; no-PR03B product ref still needs verified audit if republished |
| PR 7B0 | Saved CRDT response hydration split from old opaque PR 7B | No verified branch link yet | TBD | TBD | Cycle 282 maps deferred `72854f05ed2` to active PR07B0 lineage, but its manifest is stale for filing freshness after the `16:17:59Z` reload report and `16:23:13Z` deferred queue; no verified PR-content branch link yet |
| PR 7B1 | Stale base-record/title filtering split from old opaque PR 7B | No verified branch link yet | TBD | TBD | Cycle 282 verifies PR07B0 as ancestor and current evidence points at `4bdd9465a97`, but a fresh audit is required before filing; no verified PR-content branch link yet |
| PR 7C | Reload record snapshots sidecar after PR 7B1 | No verified branch link yet | TBD | TBD | latest replay classifies `06441205b872` / seed `1100002` as `covered-by-pr07c`; no PR07D unless future fresh evidence proves PR07B0/PR07B1/PR07C non-coverage |
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
- [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record)
  is verified content for old opaque PR 7B. The active recommendation is to
  publish and audit separate PR07B0 and PR07B1 branches before filing.
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
collected_at_utc: 2026-05-17T16:38:57Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T163722Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Raw `novelty-status.md` in this collection is zero bytes. Do not infer a
current-run likely-real count, a current pass/fail, filing readiness, or final
stack validation from that file. Use the trend packet as fuzz/control-plane
evidence and re-read raw novelty state before publishing exact current-run
triage numbers.

The latest trend packet was generated at `2026-05-17T16:29:30Z` from monitor
data through `2026-05-17T16:24:06Z`:

```text
monitor passes: 2034
coverage files: 272 -> 46359
coverage files delta: 46087
unmet coverage goals: 7
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3452
summary startup failures last: 0
quality issues last: 0
fuzz level mix: browser-e2e=31 lanes/26 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5299968
browser-e2e execution: 105683 cumulative / 432 per-hour
unit-property execution: 4762944 cumulative / 8960 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
browser-e2e likely-real findings: 579 over 1860.5 runner-hours
largest unmet goals: reload-post-action 1015/2000,
  ui-format-paragraph 1467/2000, title-save-reload 475/1000,
  body-save-reload 534/1000, real-user-editing success 561/1000
```

The trend packet is graph-derived input evidence, not an instruction and not a
product-bug count. Browser E2E remains the only level with confirmed
likely-real findings in the trend packet, but lower-level lanes are
under-triaged and should not be declared useless from zero likely-real output.
Recent CPU/load remains variable, with recent samples reaching high CPU and
load on a 64-core host. Prefer startup-stall reduction, reload/rejoin duplicate
control, and bounded lower-level targets with clear oracles over broad browser
concurrency increases.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T162903Z-synthesis.md`. It says:

- Replace opaque `PR07B` with `PR07B0` saved-response hydration and `PR07B1`
  stale base-record/title filtering.
- Keep `PR06B` and `PR07C` as sidecars after `PR07B1`; keep `PR03B`
  runtime-gated after `PR03`.
- Filing, GitHub push/open decisions, broad final-stack fuzzing, and stack-wide
  validation are blocked by stale publication evidence, unresolved owner
  replays for reload/rich-text residuals, and incomplete final validation, not
  by seed `1020002` alone.
- Cycle 282's `2026-05-17T16:15:44Z` manifest predates the newer
  `2026-05-17T16:17:59Z` reload report/push manifest and the
  `2026-05-17T16:23:13Z` current deferred queue, so a fresh manifest/audit is
  required before filing.
- Do not add `PR07D`, `PR17`, `PR18`, or `PR18x`. Add `PR07D` only if fresh
  replay proves active `PR07B0` / `PR07B1` / `PR07C` non-coverage.
- Do not publish raw `deferred/rtc-reload-hydration-20260517T153807Z`,
  `72854f05ed2`, or `try/rtc-fix-stack-validation` as filing refs.
- Parser/rich-text/linebreak reductions must compare against `PR05B` /
  `PR05C` / `PR05D` before naming any later owner.
- Use bounded Cycle 284 jobs for active manifest refresh/deferred adoption,
  strict `5700084` PR05B/PR05C/PR05D replay, reload residual PR07B0/PR07B1/PR07C
  owner replay, and optionally pre-save search/live-collapse owner comparison.
- Patch the deferred-promotion loop issue before more wait-only cycles: fix the
  unescaped-backtick heredoc causing `fg: no job control`, run `bash -n`, and
  add fairness so repeated reload "same branch, no new commit" cycles rotate to
  pre-save/rich-text owner work.
- Wait-only feedback must hard-fail when the Parallel Progress Gate still has
  actionable rows.

The paired `pr-split-20260517T155857Z-feedback-action.md` says the Cycle 282
action updated `current-pr-split.md`, made `PR07B0 -> PR07B1` the active filing
shape, rejected raw deferred reload-hydration refs as direct publish rows, kept
`PR07D`, `PR17`, `PR18`, and `PR18x` closed, and completed two bounded jobs:
`rtc-cycle282-pr07b-split-adoption-manifest-refresh` and
`rtc-cycle282-strict-rich-text-pr05-owner-comparison`.

The latest duplicate/noise persona synthesis,
`duplicate-noise-20260517T162203Z-synthesis.md`, says no product split change
is justified. It identifies the remaining issue as a control-plane state/cap
leak: `rtc-browser-fuzz-live-analysis-monitor.mjs` can skip first-level
analysis due to current-output family caps without materializing terminal
`family-capped` state, so triage/novelty can keep treating already-capped
duplicate product-evidence families as queued work. The recommended next pass
is a bounded analysis-tier reconciliation or equivalent state write, then
validation on the active `novelty-ws-common-blocks` run. The earlier
`duplicate-noise-20260517T154741Z-feedback-action.md` still records completed
startup-gate work across novelty monitor, supervisor, triage watcher,
analysis-tier, deep-analysis-tier, and live-analysis monitor scripts; that work
must remain separate from product PR branches.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, and old enabled-group claims are
superseded by the current branch-link audit, repaired PR13 refs, PR06B/PR07C
sidecar evidence, PR05D's real slot after PR05C, the Cycle 278/280 executor and
manifest proofs, the completed Cycle 282 PR07B0/PR07B1 split/adoption proof,
the current Cycle 284 freshness requirement, the duplicate/noise startup gate,
and the no-PR17/no-PR18/no-PR18x classification.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR07B split and deferred adoption | `PR07B0` saved-response hydration at `e746c32e3f9` / deferred `72854f05ed2`; `PR07B1` stale base-record/title filter at `4bdd9465a97`; Cycle 282 manifest at `2026-05-17T16:15:44Z`; branch-link audit refreshed at `2026-05-17T16:39:02Z` | Cycle 282 manifest/deferred-adoption proof completed and rejected raw deferred publish rows, but it now predates the `2026-05-17T16:17:59Z` reload report/push manifest and `2026-05-17T16:23:13Z` deferred queue; the refreshed branch-link audit verifies existing review links but still has no `verified-content` PR links for PR07B0/PR07B1 | Run `rtc-cycle284-active-manifest-refresh-and-deferred-adoption`; publish/fetch/audit explicit PR07B0 and PR07B1 product branches; rerun focused checks and rebuilt stack validation against those audited refs |
| Reload/post-save residual witnesses | latest seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`; older residuals `7500002`, `7700005`, `7310002` if capacity allows | focused residual replay target after PR07B split/adoption; not a product PR slot yet | Run `rtc-cycle284-reload-residual-pr07b0-pr07b1-pr07c-owner-replay`; compare against PR07B0/PR07B1/PR07C before naming PR07D and capture block trees, serialized content, clientIds, marker attributes, REST content, REST `_crdt_document`, Y.Doc vectors, operation ledger, focus/selection, and snapshots after each save/reload/mutation |
| PR05D semicolonless entity validation | Cycle 264 clean-base branch `cycle264/pr05d-clean-base/semicolonless-entity-validation` at `27c6e7924217`; Cycle 266 validation head `b9bf4ccb7940` | real PR05-family work after PR05C; bundle import and validation-head refresh completed, but no fetched `verified-content` product branch link exists yet | Publish/fetch/audit PR05D; consume the Cycle 266 validation head; keep the Cycle 262 fallback-tail manifest rejected |
| PR06B / PR07B helper dedupe | active candidate `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b` at `e91d2fe829f2`; stale `ready/rtc-pr06b-*` manifest rows | old independent PR06A sidecar is superseded; Cycle 274/278/280/282 evidence rejects stale rows; still no verified branch link and the active topology places the sidecar after PR07B1 | Publish/fetch/audit an explicit PR06B product branch after PR07B0/PR07B1, classify runtime readiness, and rebuild stack validation against the active topology |
| PR14B / PR15-on-PR14B finalization | Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Publish/fetch/audit explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| PR07C reload record snapshots | accepted sidecar after PR07B1; `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at `2d112932f0e3`; replay target `06441205b872` | included in Cycle 266 fetch-only validation topology; latest replay classifies seed `1100002` as `covered-by-pr07c`; no current verified branch-link row exists | Publish/fetch/audit sidecar-aware PR07C product branch after PR07B0/PR07B1; reopen PR07D only on future fresh non-coverage proof |
| PR03B browser `restoreRevision` CRDT invalidation | `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760` | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR05B/PR05C/PR05D owner comparison | Cycle 260 owner-comparison evidence plus Cycle 282 strict/rich-text owner-comparison proof | current parser/rich-text/linebreak evidence, strict seed `5700084`, and the current rich-text suffix diagnostic remain out of PR18/PR18x; semicolonless/entity false-invalid rows are routed to PR05D; actual strict-seed replay against PR05B/PR05C/PR05D is still pending | Run `rtc-cycle284-strict-5700084-pr05b-pr05c-pr05d-replay`; reopen PR18x only on fresh source-owned evidence outside PR05B/PR05C/PR05D after replay captures per-peer block trees, edited content, serialized content, rich-text / verse attributes, client IDs, and operation-ledger snapshots |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split remains PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Nested parent-delete / descendant-edit triage | seed `7500019` | tracking-only evidence from split persona; no product slot named | Compare against PR13 and PR15 coverage before adding any new slot |
| Seed `1020002` WebSocket marker divergence | critical-path classification under `runs/20260517T120127Z/continuations/pr17-1020002/classification.tsv`; latest nonempty continuation repeats `reclassify_downscope_not_product_owned` | downscoped unless rebuilt validation produces fresh product evidence; not an independent-work blocker and not a current PR17 product slot | Revisit only after rebuilt validation produces fresh product evidence newer than the terminal/downscope classifications |
| Sync undo/history issue | `9f4dcc759070`, `44110608ba86`, `977ed437bafe`; seeds `1090016` / `1090017`; completed Cycle 268 isolated runtime replay artifacts | completed isolated runtime replay reached the owner path but did not reproduce a stable redo-stack-loss product owner; not PR05B/PR05C and not PR18x | Use a lower-intrusion history subscription repro or source-level sync/core-data history test before naming any product PR |
| Reload-hydration diagnostics | retained raw branch `72854f05ed2`; latest deferred reload branch `deferred/rtc-reload-hydration-20260517T153807Z`; replay row `06441205b872` | Cycle 282 maps raw deferred reload-hydration to active PR07B0 lineage and keeps it out of PR07D, but the newer reload report/push manifest means filing needs a refreshed manifest/audit; residual replay still must prove any distinct owner before naming PR07D | Run residual owner replay against PR07B0/PR07B1/PR07C; keep diagnostics downscoped unless a focused replay proves a distinct product delta |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | evidence-only; Cycle 282 owner-comparison keeps it out of active PR split and out of PR18/PR18x | Replay against PR05B/PR05C/PR05D and recover exact replay artifact or emitted delta before product changes |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Run `rtc-cycle284-pre-save-search-live-collapse-owner-comparison`; capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion before naming an owner |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T154741Z-feedback-action.md`; `duplicate-noise-20260517T162203Z-synthesis.md`; zero-byte `novelty-status.md` in this collection | bounded fuzzer-side startup gate is implemented; latest synthesis says family-cap terminal state materialization is still pending in live-analysis/analysis-tier flow; raw novelty state from this collection cannot support an exact current-run likely-real count | Run bounded analysis-tier reconciliation or equivalent `family-capped` state materialization; validate that capped reload/rejoin duplicates become non-actionable, strict no-product startup stays suppressed, and product-evidence signatures remain visible |

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
3. Treat the completed Cycle 280 manifest/queue proof as prior evidence only.
   Use the completed Cycle 282 split/adoption proof as topology evidence, not as
   current filing freshness: it was generated at `2026-05-17T16:15:44Z`, splits
   old opaque `PR07B` into `PR07B0` / `PR07B1`, verifies `PR07B0` is an ancestor
   of `PR07B1`, and rejects raw deferred reload-hydration publication, but it
   predates the `2026-05-17T16:17:59Z` reload report/push manifest and the
   `2026-05-17T16:23:13Z` current deferred queue.
4. Run a fresh active manifest/push-manifest/deferred-adoption audit newer than
   both `2026-05-17T16:17:59Z` and `2026-05-17T16:23:13Z` before filing, broad
   final-stack fuzzing, or stack-wide validation. The branch-link audit in this
   report is fresh for GitHub links, but it does not reverify the full active
   manifest. The active refresh must reverify named PR07B0/PR07B1 refs, the
   ancestor relation, PR06B/PR07C sidecars, and raw deferred rejection.
5. Do not treat the Cycle 282 manifest proof as a GitHub branch-link audit for
   PR07B0/PR07B1. Those proposed PR rows still require explicit
   `verified-content` PR-content branch links before filing.
6. Reject stale `ready/*`, raw `deferred/*` filing refs, stale PR06B/PR07C
   rows, `PR17` / `1020002`, and `PR18` / `PR18x` from the active manifest and
   executor queue. Active sessions, zero-byte reports, `report.tmp`,
   preflight-only output, stale manifests, and wait-only feedback are not
   durable progress while actionable rows remain.
7. Use the repaired PR06B sidecar candidate only after the PR07B0/PR07B1 shape
   is audited:
   `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`.
   The old PR06B sidecar is superseded and must stay historical input evidence
   only.
8. Treat `cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
   `b9bf4ccb794004b634d1427bf18d1a7d788af03f` as fetch-only validation
   evidence, not product content.
9. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07A, PR07B0, PR07B1, PR05A/B/C, clean-base PR05D,
   repaired PR06B, PR07C, PR11A-E, PR13B0/B1/B2/B3 if available, PR14B, and
   PR15A/B/C-on-PR14B before treating those finer refs as maintainer-facing
   links.
10. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
11. Do not publish raw reload-hydration deferred refs as PR07D. Current
    evidence treats the raw reload branch as rejected/held unless fresh replay
    proves PR07B0/PR07B1/PR07C non-coverage.
12. Run the remaining bounded owner-comparison jobs: strict seed `5700084`
    against PR05B/PR05C/PR05D, reload residual witnesses against
    PR07B0/PR07B1/PR07C, and pre-save search/live-collapse. The Cycle 282
    strict/rich-text owner-comparison proof is complete as a gate, but
    parser/rich-text/linebreak cases still need replay against
    PR05B/PR05C/PR05D before naming any later owner.
13. Repair the deferred-promotion loop before accepting more wait-only progress:
    fix the unescaped-backtick heredoc causing `fg: no job control`, run
    `bash -n`, and rotate repeated reload "same branch, no new commit" cycles
    toward pre-save/rich-text owner work.
14. Rerun focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    PR03B/PR07B0/PR07B1/PR07C runtime checks.
15. Treat seed `1020002` as downscoped by the
    `reclassify_downscope_not_product_owned` classification. Do not launch a
    new `1020002` repair rerun unless rebuilt validation produces fresh product
    evidence.
16. Treat PR18x as rejected for the current parser/rich-text/linebreak and
    strict/rich-text suffix evidence. The narrow PR05D semicolonless
    entity-validation path belongs after PR05C, and the completed isolated sync
    undo/history runtime replay did not produce a stable owner proof.
17. Treat the trend packet and duplicate/noise synthesis as fuzz/control-plane
    health and triage evidence. The raw novelty status file collected for this
    update is zero bytes, so exact current-run triage and likely-real counts
    must be re-read before publication; in any case, this evidence is not
    final-stack validation, a validated final-stack pass or failure, or filing
    readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
