# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T16:09:11Z`

Trigger event:
`pr-split-2026-05-17T16-08-04Z-20260517T155857Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T16-08-04Z-20260517T155857Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked by split/adoption freshness, not by seed `1020002` and
not by a need for broad final-stack fuzz. The current working split should be
replaced by the Cycle 282 PR07B split/adoption topology:

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

Cycle 280 completed the previous manifest refresh and remains useful prior
evidence: it generated a manifest at `2026-05-17T15:43:25Z`, verified all `34`
active manifest rows, harvested `covered-by-pr07c` for seed `1100002`, kept
`PR07D` closed, and left zero queue rows for `1020002`, `PR17`, stale
PR06B/PR07C, split report signals, or `PR18` / `PR18x` product work.

The newest split-persona synthesis, `pr-split-20260517T155857Z-synthesis.md`,
supersedes the older "run Cycle 280" recommendation. It says Cycle 280 is
mostly right but incomplete because `PR07B` should be split before filing, and
because the Cycle 280 manifest at `2026-05-17T15:43:25Z` is stale against the
`2026-05-17T15:53:11Z` deferred queue and later reload-hydration report.

The active bounded gate is therefore
`rtc-cycle282-pr07b0-pr07b1-split-and-deferred-adoption`. It must emit fresh
`branch-audit.tsv`, `push-manifest.tsv`, `manifest-age.tsv`,
`deferred-adoption.tsv`, `stale-row-rejections.tsv`, and artifact verification
newer than the `15:53:11Z` deferred queue. It must reject stale `ready/*`, raw
`deferred/*` filing refs, stale PR06B/PR07C rows, `PR17` / `1020002`, and
`PR18` / `PR18x`, and prove deferred reload adoption instead of publishing raw
deferred refs.

Independent bounded work can continue in parallel: reload residual first
divergence witnesses for `7110004`, `7500002`, `7700005`, then `7310002`;
pre-save search/live-collapse owner comparison; rich-text suffix owner
comparison against `PR05B` / `PR05C`; PR02A/PR05/PR11 shaping; PR05D
publication prep; and PR06B/PR07C sidecar validation. Do not launch broad
final-stack fuzzing, another `1020002` job, or raw deferred branch validation
while this split/adoption gate is stale.

The duplicate/noise issue remains control-plane work, not a product split
change. The newest synthesis says the shared invariant is still incomplete:
strict pre-action startup/discovery/readiness failures with no product evidence
must be classified as bootstrap-stall/no-analysis before any producer,
triage-watcher, analysis, deep-analysis, or live-analysis path can queue them.
Product-evidence signatures must still be preserved for bounded analysis.

## Branch And Ref Status

Remote status was collected at `2026-05-17T16:09:11Z`.

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

The branch-link audit was generated at `2026-05-17T16:09:15Z` from fetched
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
| PR 7B0 | Saved CRDT response hydration split from old opaque PR 7B | No verified branch link yet | TBD | TBD | new recommended split; represented by `e746c32e3f9` / deferred `72854f05ed2`, but no audited filing branch yet |
| PR 7B1 | Stale base-record/title filtering split from old opaque PR 7B | No verified branch link yet | TBD | TBD | new recommended split; current evidence points at `4bdd9465a97`, but no audited filing branch yet |
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
collected_at_utc: 2026-05-17T16:09:11Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T155950Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Raw `novelty-status.md` was updated at `2026-05-17T16:06:11.492Z` for
`run-20260517T155950Z`. Treat it as coverage/control-plane state, not as
final-stack validation, filing readiness, or a validated final-stack pass or
failure.

```text
coverage files: 46064
total records seen: 71143
records processed this pass: 25
current-run records: 3
current-run successful records: 1
current-run product-evidence signatures: 2
current-run likely-real visible: 0
historical product-evidence signatures: 10029
historical likely-real visible: 221
combined likely-real visible: 221
enabled group: novelty-ws-common-blocks
paused groups: real-user-save-reload, http-persistence-probe,
  real-user-editing, real-user-rich-text, parser-serialization,
  parser-transform, lifecycle, block-gauntlet
policy guards: startup=enabled, triage-noise=enabled
health: ok
unmet coverage goals: 7
quality issues: 0
resource snapshot: load1=54.32 on 64 cores, memory=421.7G free,
  headroom for adding groups=yes
```

The monitor recent-change log shows a root restart into
`run-20260517T155950Z`, backfilled current-run noise counters from `3`
behavioral records and zero strict summary startup failures, preserved
unexpired startup-noise cooldowns, skipped re-enabling noisy recommended
real-user groups, and kept `novelty-ws-common-blocks` enabled. Current active
triage has `2` actionable product-evidence signatures but zero visible
likely-real findings.

The latest trend packet was generated at `2026-05-17T15:57:48Z` from monitor
data through `2026-05-17T15:53:43Z`:

```text
monitor passes: 2026
coverage files: 272 -> 45906
coverage files delta: 45634
unmet coverage goals: 7
likely_real_max: 4
duplicate_share_current_last: 0.5
duplicate_share_historical_last: 0.3463
summary startup failures last: 0
quality issues last: 0
fuzz level mix: browser-e2e=31 lanes/26 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5294765
browser-e2e execution: 105280 cumulative / 812 per-hour
unit-property execution: 4758144 cumulative / 8960 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
browser-e2e likely-real findings: 575 over 1853.2 runner-hours
largest unmet goals: reload-post-action 1013/2000,
  ui-format-paragraph 1456/2000, title-save-reload 475/1000,
  body-save-reload 534/1000, real-user-editing success 561/1000
```

The trend packet is graph-derived input evidence, not an instruction and not a
product-bug count. Browser E2E remains the only level with confirmed
likely-real findings in the trend packet, but lower-level lanes are
under-triaged and should not be declared useless from zero likely-real output.
Recent CPU/load remains variable. Prefer startup-stall reduction,
reload/rejoin duplicate control, and bounded lower-level targets with clear
oracles over broad browser concurrency increases.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T155857Z-synthesis.md`. It says:

- Replace opaque `PR07B` with `PR07B0` saved-response hydration and `PR07B1`
  stale base-record/title filtering.
- Keep `PR06B` and `PR07C` as sidecars after `PR07B1`; keep `PR03B`
  runtime-gated after `PR03`.
- Filing/final-stack fuzz remains blocked by a stale manifest/deferred-adoption
  gate, not by seed `1020002` alone.
- Do not add `PR07D`, `PR17`, `PR18`, or `PR18x`. Add `PR07D` only if fresh
  replay proves active `PR07B0` / `PR07B1` / `PR07C` non-coverage.
- Do not publish raw `deferred/rtc-reload-hydration-20260517T153807Z`,
  `72854f05ed2`, or `try/rtc-fix-stack-validation` as filing refs.
- Parser/rich-text/linebreak reductions must compare against `PR05B` /
  `PR05C` before naming any later owner.
- Launch bounded Cycle 282 split/adoption and owner-comparison jobs, not broad
  fuzz: `rtc-cycle282-pr07b0-pr07b1-split-and-deferred-adoption`,
  `rtc-cycle282-reload-residual-first-divergence-witness`,
  `rtc-cycle282-pre-save-search-live-collapse-owner-comparison`, and
  `rtc-cycle282-rich-text-suffix-pr05b-pr05c-owner-comparison`.

The paired `pr-split-20260517T152820Z-feedback-action.md` says the previous
Cycle 280 action completed: it kept the no-`PR07D` topology, consumed the
Cycle 276 `covered-by-pr07c` result for seed `1100002`, refreshed the
manifest/audit path, and produced nonempty artifacts. That proof is now prior
evidence, not the current PR07B split/adoption unblocker.

The latest duplicate/noise persona synthesis,
`duplicate-noise-20260517T154741Z-synthesis.md`, is nonempty and says no files
were edited. It identifies the remaining issue as a cross-script control-plane
contract failure for strict no-product pre-action bootstrap stalls. The next
bounded action should verify current queued/running state, enable existing
pause guards explicitly, align the runner startup predicate with supervisor
coverage, suppress stale no-product startup records before analysis, and
preserve all product-evidence signatures. The paired latest feedback-action
file is zero bytes.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, and old enabled-group claims are
superseded by the current branch-link audit, repaired PR13 refs, PR06B/PR07C
sidecar evidence, PR05D's real slot after PR05C, the Cycle 278/280 executor and
manifest proofs, the Cycle 282 PR07B0/PR07B1 split recommendation, and the
no-PR17/no-PR18/no-PR18x classification.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR07B split and deferred adoption | `PR07B0` saved-response hydration at `e746c32e3f9` / deferred `72854f05ed2`; `PR07B1` stale base-record/title filter at `4bdd9465a97`; deferred queue at `2026-05-17T15:53:11Z` | current filing blocker; Cycle 280 manifest is prior evidence but stale and too opaque for PR07B filing | Run `rtc-cycle282-pr07b0-pr07b1-split-and-deferred-adoption` with fresh branch audit, push manifest, manifest age, deferred adoption, stale-row rejection, and artifact verification newer than the deferred queue |
| Reload/post-save residual witnesses | seeds `7110004`, `7500002`, `7700005`, then `7310002` | focused residual replay target after PR07B split/adoption; not a product PR slot yet | Run `rtc-cycle282-reload-residual-first-divergence-witness`; compare against PR07B0/PR07B1/PR07C before naming PR07D and capture block trees, serialized content, clientIds, marker attributes, REST content, REST `_crdt_document`, Y.Doc vectors, operation ledger, focus/selection, and snapshots after each save/reload/mutation |
| PR05D semicolonless entity validation | Cycle 264 clean-base branch `cycle264/pr05d-clean-base/semicolonless-entity-validation` at `27c6e7924217`; Cycle 266 validation head `b9bf4ccb7940` | real PR05-family work after PR05C; bundle import and validation-head refresh completed, but no fetched `verified-content` product branch link exists yet | Publish/fetch/audit PR05D; consume the Cycle 266 validation head; keep the Cycle 262 fallback-tail manifest rejected |
| PR06B / PR07B helper dedupe | active candidate `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b` at `e91d2fe829f2`; stale `ready/rtc-pr06b-*` manifest rows | old independent PR06A sidecar is superseded; Cycle 274/278/280 evidence rejects stale rows; still no verified branch link and the active topology now places the sidecar after PR07B1 | Publish/fetch/audit an explicit PR06B product branch after PR07B0/PR07B1, classify runtime readiness, and rebuild stack validation against the active topology |
| PR14B / PR15-on-PR14B finalization | Cycle 252 no-PR03B branch-shaping artifacts | mandatory replacement topology, but no current `verified-content` branch links exist for PR14B or PR15-on-PR14B | Publish/fetch/audit explicit no-PR03B product refs after sidecar-aware audit and keep validation-only heads out of product PRs |
| PR07C reload record snapshots | accepted sidecar after PR07B1; `finalized/cycle252/sidecar/rtc-pr07c-reload-record-snapshots` at `2d112932f0e3`; replay target `06441205b872` | included in Cycle 266 fetch-only validation topology; latest replay classifies seed `1100002` as `covered-by-pr07c`; no current verified branch-link row exists | Publish/fetch/audit sidecar-aware PR07C product branch after PR07B0/PR07B1; reopen PR07D only on future fresh non-coverage proof |
| PR03B browser `restoreRevision` CRDT invalidation | `ready-pr03b/rtc-pr03b-browser-revision-restore-crdt-invalidation` at `cbab481fe760` | PR03 sidecar / validation-only sidecar until browser/PHP runtime replay passes | Finish bounded runtime replay for PR03B; do not put PR03B back into the main spine without passing evidence |
| PR05B/PR05C owner comparison | Cycle 260 owner-comparison evidence | comparison is sufficient to reject PR18x from current parser/rich-text/linebreak evidence; semicolonless/entity false-invalid rows are routed to PR05D | Reopen PR18x only on fresh source-owned evidence outside PR05B/PR05C/PR05D |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split remains PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Nested parent-delete / descendant-edit triage | seed `7500019` | tracking-only evidence from split persona; no product slot named | Compare against PR13 and PR15 coverage before adding any new slot |
| Seed `1020002` WebSocket marker divergence | critical-path classification under `runs/20260517T120127Z/continuations/pr17-1020002/classification.tsv`; latest nonempty continuation repeats `reclassify_downscope_not_product_owned` | downscoped unless rebuilt validation produces fresh product evidence; not an independent-work blocker and not a current PR17 product slot | Revisit only after rebuilt validation produces fresh product evidence newer than the terminal/downscope classifications |
| Sync undo/history issue | `9f4dcc759070`, `44110608ba86`, `977ed437bafe`; seeds `1090016` / `1090017`; completed Cycle 268 isolated runtime replay artifacts | completed isolated runtime replay reached the owner path but did not reproduce a stable redo-stack-loss product owner; not PR05B/PR05C and not PR18x | Use a lower-intrusion history subscription repro or source-level sync/core-data history test before naming any product PR |
| Reload-hydration diagnostics | retained raw branch `72854f05ed2`; latest deferred reload branch `deferred/rtc-reload-hydration-20260517T153807Z`; replay row `06441205b872` | diagnostic/adoption evidence for PR07B0/PR07B1/PR07C; do not publish as PR07D unless fresh replay proves non-coverage | Consume in Cycle 282 PR07B split/adoption and residual replay; keep diagnostics downscoped unless a focused replay proves a distinct product delta |
| Rich-text formatted suffix corruption | diagnostic candidates and prior deferred refs | evidence-only; latest split keeps it out of active PR split | Run `rtc-cycle282-rich-text-suffix-pr05b-pr05c-owner-comparison`; compare PR05B/PR05C first and recover exact replay artifact or emitted delta before product changes |
| Pre-save search/live document collapse | prior candidate rows | evidence-only; not in active split | Run `rtc-cycle282-pre-save-search-live-collapse-owner-comparison`; capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion before naming an owner |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit PR02A before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T154741Z-synthesis.md`; `novelty-status.md` updated `2026-05-17T16:06:11.492Z` | no product split change; remaining issue is shared strict no-product bootstrap-stall invariant enforcement across producer/supervisor/triage/analysis/live-analysis paths | Verify queued/running state, enable pause guards explicitly, align runner and supervisor startup predicates, suppress stale no-product startup records before analysis, preserve all product-evidence signatures, and validate with `node --check`, gate-only triage, live-analysis `--once`, and a capped canary if patched again |

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
   The active manifest/audit must be refreshed after the
   `2026-05-17T15:53:11Z` deferred queue and must split old opaque `PR07B`
   before filing, GitHub push decisions, rebuilt combined validation, or
   final-stack fuzz.
4. Run the recommended
   `rtc-cycle282-pr07b0-pr07b1-split-and-deferred-adoption` job. Require fresh,
   nonempty `branch-audit.tsv`, `push-manifest.tsv`, `manifest-age.tsv`,
   `deferred-adoption.tsv`, `stale-row-rejections.tsv`, and artifact
   verification newer than the deferred queue.
5. Reject stale `ready/*`, raw `deferred/*` filing refs, stale PR06B/PR07C
   rows, `PR17` / `1020002`, and `PR18` / `PR18x` from the active manifest and
   executor queue. Active sessions, zero-byte reports, `report.tmp`,
   preflight-only output, stale manifests, and wait-only feedback are not
   durable progress while actionable rows remain.
6. Use the repaired PR06B sidecar candidate only after the PR07B0/PR07B1 shape
   is audited:
   `finalized/cycle268/sidecar/rtc-pr06b-malformed-save-request-payload-minimal-on-pr07b`.
   The old PR06B sidecar is superseded and must stay historical input evidence
   only.
7. Treat `cycle266/validation/no-pr03b-pr05d-plus-pr06b-pr07c-sidecars` at
   `b9bf4ccb794004b634d1427bf18d1a7d788af03f` as fetch-only validation
   evidence, not product content.
8. Publish/fetch and audit explicit sidecar-aware product refs for PR02A,
   PR03B, PR04-through-PR07A, PR07B0, PR07B1, PR05A/B/C, clean-base PR05D,
   repaired PR06B, PR07C, PR11A-E, PR13B0/B1/B2/B3 if available, PR14B, and
   PR15A/B/C-on-PR14B before treating those finer refs as maintainer-facing
   links.
9. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
10. Do not publish raw reload-hydration deferred refs as PR07D. Current
    evidence treats the raw reload branch as rejected/held unless fresh replay
    proves PR07B0/PR07B1/PR07C non-coverage.
11. Run the bounded Cycle 282 owner-comparison jobs for reload residual
    witnesses, pre-save search/live-collapse, and rich-text suffix. Compare
    parser/rich-text/linebreak cases against PR05B/PR05C before naming any
    later owner.
12. Rerun focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    PR03B/PR07B0/PR07B1/PR07C runtime checks.
13. Treat seed `1020002` as downscoped by the
    `reclassify_downscope_not_product_owned` classification. Do not launch a
    new `1020002` repair rerun unless rebuilt validation produces fresh product
    evidence.
14. Treat PR18x as rejected for the current parser/rich-text/linebreak
    evidence. The narrow PR05D semicolonless entity-validation path belongs
    after PR05C, and the completed isolated sync undo/history runtime replay
    did not produce a stable owner proof.
15. Treat the current novelty state, trend packet, and duplicate/noise
    synthesis as fuzz/control-plane health and triage evidence. The raw novelty
    status file is populated now, but it is still not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. None of the
current trend, duplicate/noise, residual reducer, or status-persona evidence is
final-stack fuzz validation or a filing unblocker.
