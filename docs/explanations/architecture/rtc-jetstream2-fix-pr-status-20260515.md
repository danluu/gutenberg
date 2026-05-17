# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T07:58:10Z`

Trigger event:
`pr-split-2026-05-17T07-56-31Z-20260517T074713Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T07-56-31Z-20260517T074713Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked, and the newest completed split-persona synthesis,
`pr-split-20260517T074713Z-synthesis.md`, keeps the Cycle 244/246 replacement
split: insert a narrow PR03-family `PR03B` immediately after PR03 for browser
`restoreRevision` CRDT invalidation. The synthesis adds a new concrete blocker:
PR03B itself is local-ready and PR04 through PR07B were restacked on top of it,
but the downstream restack stopped at PR07C with a conflict in
`packages/core-data/src/test/entities.js`. PR07C through PR15C-on-PR14B remain
unrestacked on PR03B, no combined validation-only head exists, and the stack is
not review-ready.

The PR01-through-PR15C-on-PR14B spine remains the working hypothesis, PR07C
stays an accepted PR07B sidecar, PR6B stays the minimal malformed-save sidecar
near PR06A, PR17 / seed `1020002` remains removed as product work, and seed
`5700084` remains PR05C-covered / oracle-equivalence downscoped.
`ee0d01a82e12` is no longer a generic pre-final owner gate, PR07C slot, or
PR18x candidate; it is PR03B work until the PR03B branch and every affected
downstream branch are validated, published, fetched, and audited.

The active independent gates are now the PR07C `entities.js` conflict and
downstream PR03B restack, branch-link/manifest refreshes as new product refs
appear, owner-ordered strict/focused comparison for fresh rows, and targeted
reload/revision diagnostics replay. PR03B has nonempty report, classification,
branch-audit, push-manifest, and artifact-validation outputs; commit
`cbab481fe76057c17cafeea6353d7bf75c904052` on
`ready/rtc-pr03b-browser-revision-restore-crdt-invalidation`; focused JS unit
tests, touched-file JS lint, PHP standards, and adjacent `git diff --check`
passed. Browser/PHP runtime replay was still not run because the isolated PR03B
worktree's `wp-env` was uninitialized, and PR03B still has no verified GitHub
PR-content link in the branch-link audit.

The `20260517T074708Z` progress-unblock pass produced fresh local-machine
publication data for PR02A, PR03B, the latest reload-hydration diagnostics
branch, and the PR04-through-PR07B-on-PR03B refs from the completed downstream
restack. It intentionally did not republish PR07C or later downstream refs
because the restack stopped at the PR07C conflict. `a914c862c29e` / seed
`5200005` remains PR11C-covered, and none of the remaining gates justify a
generic PR18x slot.

The duplicate/noise work remains fuzzer control-plane health work, not a
product PR split change. The newest duplicate/noise synthesis,
`duplicate-noise-20260517T074332Z-synthesis.md`, keeps the smallest safe path
limited to current-root/current-output consumer hardening and launcher config
cleanup while preserving product-evidence signatures. It also records a
blocking policy disagreement for any broad producer cooldown/quarantine change:
whether startup/noise strikes should persist across output rotations or be
treated as stale when they come from prior roots. The earlier
`duplicate-noise-20260517T071132Z-feedback-action.md` consumer/control-plane
fix remains applied and syntax-checked, but the producer runner/start wrapper
was not changed, so this is not product evidence and must not suppress real
product-evidence failures.

The active maintainer-facing shape is now:

```text
PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR03B browser restoreRevision CRDT invalidation -> PR04
-> PR05A/B/C -> PR06 -> PR06A
-> PR6B minimal malformed outgoing RTC save payloads as a PR06A sidecar
-> PR07A/B, with PR07C accepted as a PR07B sidecar
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 if published and audited; otherwise the repaired audited PR13A/B/C fallback
-> PR14 -> PR14B -> PR15A/B/C-on-PR14B
-> validation-only PR6B + PR07C + PR03B + PR14B + PR15C head
-> residual owner gates: fresh strict/focused owner triage, parser/rich-text/
   entity/linebreak rows only after PR05B/PR05C comparison, and
   reload-hydration diagnostics only if newer nonempty product evidence appears
-> rebuilt combined validation stack
-> final-stack fuzz and filing
```

The Cycle 232/234 replacement topology still supersedes the older
PR14/PR15/PR6B/PR16 tail:

```text
PR14 -> PR14B -> PR15A-on-PR14B -> PR15B-on-PR14B -> PR15C-on-PR14B
```

Do not publish old PR15 refs, the old polluted PR6B, candidate PR16, wildcard
`final/*` refs, raw `deferred/*` refs, `try/*` refs, validation-only heads, or
PR17-as-product.

Current residual handling:

- Seed `1020002`: removed as product work; it is final-stack
  validation/fuzz/filing-only unless newer product-owned evidence appears. It
  is not a valid sole wait item while the Parallel Progress Gate is nonempty.
- Old `5200005` table-delete replay: PR12-covered by the previous-local-cache
  block delete fix; not a new PR candidate.
- Possible strict-expansion `5200005` nested-group signal: the latest
  split-persona synthesis marks `a914c862c29e` as PR11C-covered, so remove it
  from the open tail gates. Reopen only if newer red evidence contradicts the
  source-local PR11C coverage.
- Seed `5700084`: consumed as PR05C-covered / oracle-equivalence downscoped;
  do not use it as an open PR18x gate unless fresh product evidence appears.
- `1060015`: downscoped out of the current product-blocker set unless new red
  evidence appears; do not name PR5D or PR18 from the current evidence.
- `7510029`: downscoped out of the current product-blocker set unless new red
  evidence appears; do not name PR18A from the current evidence.
- `ee0d01a82e12`: consumed by the latest split synthesis as a narrow
  PR03-family browser `restoreRevision` CRDT invalidation gap. Insert PR03B
  after PR03 and before PR04; do not assign it to PR07C or PR18x.
- `045710` / `055716` / `20260517T062719Z` / `20260517T065722Z` /
  `20260517T073541Z`: reload-hydration diagnostics only; the Cycle 246
  progress-unblock manifest maps the `073541` diagnostic and keeps it optional
  diagnostic / product-plus-diagnostic candidate output, not PR03B or product
  coverage. Do not make a product PR unless newer evidence proves product
  ownership.
- Fresh strict/focused likely-real rows: triage by owner first. Parser,
  rich-text, entity, and linebreak rows must compare against PR5B/PR5C before
  any PR18x naming.

## Branch And Ref Status

The remote status input was generated at `2026-05-17T07:58:04Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6A, PR 8A, PR 15A/15B/15C,
fallback-group evidence, and final branch claims unless it is deliberately
copied into a clean evidence worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack has modified product/test files and many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T07:58:10Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

The current split report's progress-unblock and Cycle 246 artifacts map several
missing filing units to ready refs, and PR03B is now local-ready. They also map
local PR04-through-PR07B-on-PR03B refs, but the downstream restack stopped at
PR07C because of the `packages/core-data/src/test/entities.js` conflict. The
local branch-link audit below still has no `verified-content` rows for PR02A,
PR03B, PR5A/B/C, PR6B, PR07C, PR11A-E, PR13B0/B1/B2/B3, PR14B, or
PR15A/B/C-on-PR14B. Keep using `No verified branch link yet` for those proposed
PR rows until a refreshed GitHub audit verifies their content. The existing
verified PR04-through-PR07B review links remain content evidence for the older
review branches, not proof that the PR03B-based restack is published and ready
to file.

For repaired PR13 content, use only these audited review refs:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link the stale or misordered PR13 refs listed in the audit under
"Explicitly Not PR-Content Links":
`review/rtc-pr13a-observed-delete-provenance`,
`review/rtc-pr13b-stale-block-identity-smear`, or
`review/rtc-pr13c-cross-parent-source-retirement`.

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the repaired PR13A compare link has the source base.

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar remains in the active prefix; progress-unblock maps a ready ref, but publish/fetch/audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR03 | No verified branch link yet | TBD | TBD | active required slot from `pr-split-20260517T074713Z-synthesis.md`; local-ready at `cbab481fe76057c17cafeea6353d7bf75c904052` with focused JS unit, lint, PHP standards, and adjacent `git diff --check` passing, but browser/PHP replay was blocked by uninitialized `wp-env`; PR04-PR07B restacked on PR03B locally, PR07C now conflicts in `packages/core-data/src/test/entities.js`, and no verified link exists |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified original branch; Cycle 246 also produced a local PR04-on-PR03B ref, but it needs publication/fetch/audit before filing in the PR03B topology |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; comparison point for parser/rich-text residuals |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` remains PR5C-covered plus strict oracle/exact-content drift |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified original branch; excludes malformed-save restack and broader residuals; PR03B-based restack evidence remains local only |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified original branch; narrow persisted-body guard; PR03B-based restack evidence remains local only |
| PR 6B | Minimal malformed outgoing RTC save request-payload guard after PR06A | No verified branch link yet | 2 | TBD | recommended PR06A sidecar; progress-unblock maps a ready ref, but publish/fetch/audit before filing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified original branch; repaired split head; PR03B-based restack evidence remains local only |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified original branch stacked after PR 7A; scoped to saved-CRDT-response hydration; PR03B-based restack evidence remains local only |
| PR 7C | Reload record snapshots sidecar after PR07B | No verified branch link yet | TBD | TBD | accepted sidecar from Cycle 236 browser-pass evidence; PR03B downstream restack now stops here with a conflict in `packages/core-data/src/test/entities.js`; resolve/restack/publish/fetch/audit before filing |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | finer split still needs verified GitHub branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | finer split still needs verified GitHub branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | finer split still needs verified GitHub branch link; latest source-local evidence marks `a914c862c29e` / seed `5200005` covered here |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | finer split still needs verified GitHub branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | finer split still needs verified GitHub branch link |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; `5200005` table-delete replay is PR12-covered |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first PR13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; maintainer-facing fallback until PR13B0/B1/B2/B3 are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; use instead of stale/misordered PR13C refs |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; seed `7110017` proves PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | mandatory replacement topology; ready ref exists from earlier progress-unblock, but it must be restacked after the PR07C-on-PR03B conflict is resolved and then publish/fetch/audited |
| PR 15A | Fallback group move stale reorder, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; ready ref exists from earlier progress-unblock, but old pre-PR14B audited branch is prior art only and PR03B downstream restack has not reached it |
| PR 15B | Fallback group insert anchor, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; ready ref exists from earlier progress-unblock, but older conflict artifacts are superseded only after PR03B-based ingest/audit |
| PR 15C | Fallback group delete, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; ready ref exists from earlier progress-unblock, but validation-only PR6B/PR14B/PR15C head is not a product PR and PR03B downstream restack has not reached it |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended PR5A/B/C
  split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation is
  the PR11A-E split.
- [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder),
  [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor),
  and [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete)
  are verified content for the pre-PR14B PR15 shape, not the recommended
  PR15A/B/C-on-PR14B replacement.
- The finer PR13B0/B1/B2/B3 refs remain source-level evidence only until they
  are published, fetched, and reported as `verified-content` in a branch-link
  audit.

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T07:58:04Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T075630Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The clean structural validation ref remains:

```text
validation/rtc-final-combined-stack-post-pr11-20260516T110608Z
921f093cc47b46844bf8fb48552483686c55ef6b
```

That rebuild reported focused CRDT checks, touched-file JS lint,
`git diff --check`, containment, range-diff, and diffstat evidence passing.
Treat it as structural and focused-check evidence for the known-fix prefix. It
is not final-stack fuzz validation and no longer represents the complete filing
stack because PR02A, PR03B, the PR04-through-PR07B-on-PR03B restack,
PR5A/B/C, PR11A-E, PR6B, PR07C, PR13B0-B3, PR14B, and
PR15A/B/C-on-PR14B still need verified branch links, runtime replay, conflict
resolution, or final branch-shaping evidence. Until PR13B0/B1/B2/B3 have
verified branch links, the repaired audited PR13A/B/C fallback remains the only
usable PR13 link set.

The collected `raw/novelty-status.md` input is empty for this update. Do not
reuse the previous raw novelty snapshot as current-run product health evidence.
The remote status input still identifies the active coverage-guided root as
`/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T075630Z`,
but this bundle does not include a fresh raw triage table for that root.

The latest trend evidence packet was generated at `2026-05-17T07:50:02Z` from
monitor data through `2026-05-17T07:47:05Z`:

```text
monitor passes: 1888
coverage files: 272 -> 41883
coverage files delta: 41611
unmet coverage goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3521
summary_startup_failures_last: 0
quality issues: 0
enabled groups current: novelty-ws-lifecycle, novelty-ws-persistence-no-title
fuzz level mix: browser-e2e=27 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 4234940
browser-e2e execution: 99611 cumulative / 244 per-hour
unit-property execution: 3703988 cumulative / 57792 per-hour
coverage-guided-lower-level execution: 428335 cumulative / 0 per-hour
load1/load5/load15: 55.37 / 58.61 / 60.83 on 64 cores
memory: 426.5G free
```

The trend packet is graph-derived evidence. In this collection it is the only
nonempty novelty/coverage status input, because `raw/novelty-status.md` is
empty. It supports only control-plane/coverage health statements: current
duplicate share is zero, startup failures are zero, quality issues are zero,
and historical duplicate share remains nonzero. It does not prove final-stack
health or a clean current product run.

Largest remaining coverage gaps in the latest trend packet are
`ui-heading-shortcut` `762/1000`, `reload-post-action` `783/1000`,
title-save-reload `305/500`, body-save-reload `364/500`, and successful
real-user-editing records `437/500`. Weak completion profiles remain `full`
`18/840`, `multi-reload-lifecycle` `102/3146`, `revision-persistence`
`149/4256`, `parser-serialization` `144/3055`, and `real-user-editing`
`437/6176`.

Current-run triage and historical triage must remain separate. This bundle has
no fresh raw current-run triage table, while the trend packet still shows
historical duplicate/noise data and aggregate likely-real maxima. Require
strict-current owner triage, rebuilt combined validation, and bounded
final-stack monitor evidence before filing; the active coverage-guided root is
not the rebuilt filing stack.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T074713Z-synthesis.md`. It says the replacement split is
still correct, but filing is blocked and the downstream stack is not
review-ready: PR03B is local-ready, PR04 through PR07B restacked on PR03B, and
PR07C now conflicts in `packages/core-data/src/test/entities.js`. PR07C through
PR15C-on-PR14B remain blocked until that conflict is resolved and the restack
continues.

The active topology remains:

```text
PR01 -> PR02/PR02A -> PR03 -> PR03B -> PR04
-> PR05A/B/C -> PR06 -> PR06A + PR6B-min
-> PR07A/B + PR07C
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14 -> PR14B
-> PR15A/B/C-on-PR14B
```

PR03B has nonempty local `report.md`, `classification.tsv`,
`branch-audit.tsv`, `push-manifest.tsv`, and `artifact-validation.tsv`; source
branch `ready/rtc-pr03b-browser-revision-restore-crdt-invalidation`; intended
local publication branch
`danluu/rtc-pr03b-browser-revision-restore-crdt-invalidation`; commit
`cbab481fe76057c17cafeea6353d7bf75c904052`; and base
`ready/rtc-pr03-revision-restore-crdt-reset`. Focused JS unit tests,
touched-file JS lint, PHP standards, and adjacent `git diff --check` passed in
the PR03B job. Browser/PHP runtime replay was still not run because the
isolated PR03B worktree's `wp-env status` was uninitialized, and no verified
GitHub branch link exists yet.

The `20260517T074708Z` progress-unblock update says the completed Cycle 246
downstream restack produced PR04-through-PR07B-on-PR03B refs and local-machine
publication rows for PR02A, PR03B, the latest reload-hydration diagnostics
branch, and those PR04-through-PR07B refs. It intentionally did not republish
PR07C or later downstream refs because the restack stopped at the PR07C
`entities.js` conflict. These remain local branch/manifest progress only, not
verified GitHub branch-link evidence.

The next branch queue is now:

1. Resolve PR07C's `packages/core-data/src/test/entities.js` conflict on top of
   PR03B.
2. Continue restacking PR07C through PR15C-on-PR14B on PR03B.
3. Regenerate nonempty `report.md`, `classification.tsv`, `restack-map.tsv`,
   `branch-audit.tsv`, `push-manifest.tsv`, adjacent range-diffs, diffstats,
   and numstats.
4. Rebuild the validation-only head containing PR6B minimal, PR07C, PR03B,
   PR14B, and PR15C-on-PR14B.
5. Run focused PR03B browser/PHP runtime replay if required before filing, or
   explicitly downscope the missing runtime replay as an environment gap.

The latest raw split report also records the new reload-hydration diagnostic
branch `deferred/rtc-reload-hydration-20260517T073541Z` at
`c59a2fba4ff1223a501cd470b904d3308459f1e0`, with intended local publication
branch `danluu/rtc-ws-provider-lifecycle-diagnostics-20260517`. It is
diagnostics-only. Replay `d4490d81e882` / seed `5900001` and
`df41c4c0e0a1` / seed `5400002`, plus the strict reload/revision-persistence
families, against those diagnostics before any reload-hydration product
promotion.

The older Cycle 240/242 trail remains useful for durable classification:
PR07C is a product sidecar, seed `5700084` is PR05C-covered /
oracle-equivalence downscoped, `5200005` table-delete replay is PR12-covered,
`a914c862c29e` is PR11C-covered, `1060015` and `7510029` are downscoped unless
new red evidence appears, and `045710` / `055716` / `062719` / `065722`
reload-hydration rows remain diagnostic-only unless newer evidence proves
product ownership.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T074332Z-synthesis.md`. It keeps duplicate/noise work
in the fuzzer control plane, not in the product PR split, and says the current
strict no-product `pre_action_bootstrap_stall` path is mostly suppressed before
Codex analysis. Remaining duplicate/noise risk comes from stale or mis-scoped
scheduler/consumer state across output roots, sidecar sessions, and historical
raw accounting. The safe next step is a narrow current-root/current-output
hardening pass and launcher config cleanup while keeping product-evidence
signatures launchable. A broad producer cooldown/quarantine patch is blocked by
an unresolved policy disagreement over whether startup/noise strikes should
persist across output rotations.

The earlier paired `duplicate-noise-20260517T071132Z-feedback-action.md` applied
the bounded consumer/control-plane fix: analysis and deep-analysis run fresh
gate-only triage before consuming state; live-analysis skips completed
non-actionable output; the supervisor persists paused startup-stall no-analysis
metadata; and the novelty monitor accounts for paused no-analysis dirs and
repairs invalid bootstrap supervisor groups. Syntax checks passed for the
changed `.mjs` files, consumer-path checks on `run-20260517T073752Z` started no
analysis sessions, old paused strict-startup noise remained suppressed, and the
coverage-guided stack was restarted. The producer runner/start wrapper was not
changed, so any future startup/bootstrap family with real product evidence
still needs normal triage.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR6B", stale PR13 review-ref warnings, and "only novelty-
http is enabled" claims are superseded by the `2026-05-17T07:58:10Z`
branch-link audit, the latest trend packet, the empty raw novelty-status input
for this collection, and the latest split and duplicate/noise syntheses/actions.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR14B / PR15-on-PR14B finalization | Cycle 232/234 replacement topology and progress-unblock ready-ref mapping | mandatory replacement topology, but no current `verified-content` branch links for PR14B or PR15-on-PR14B; PR03B downstream restack has not reached these rows because PR07C conflicts first | Resolve the PR07C-on-PR03B conflict, continue the downstream restack, then publish/fetch/audit the ready refs until the GitHub branch-link audit exposes verified PR-content links; keep validation-only heads out of product PRs |
| Malformed-save request-payload PR6B | minimal PR06A sidecar; old polluted PR6B and historical validation heads are superseded | active recommended sidecar after PR06A; progress-unblock maps a ready ref, but no current `verified-content` branch-link audit row exists | Publish/fetch/audit the minimal product branch, keep validation-only heads out of filing branches, verify inclusion in the rebuilt PR03B/PR14B/PR15-on-PR14B validation stack |
| PR07C reload record snapshots | accepted sidecar after PR07B | Cycle 236 browser-pass evidence promotes it into the split and Cycle 240 marks it `product-sidecar`; PR03B downstream restack now stops here with a conflict in `packages/core-data/src/test/entities.js`, and no current `verified-content` branch-link audit row exists | Resolve the PR07C conflict on PR03B, continue downstream restack, publish/fetch/audit the PR07C review branch, and keep validation-only heads out of product PRs |
| PR03B browser `restoreRevision` CRDT invalidation | `ee0d01a82e12`; `pr-split-20260517T074713Z-synthesis.md`; `ready/rtc-pr03b-browser-revision-restore-crdt-invalidation` local branch at `cbab481fe76057c17cafeea6353d7bf75c904052` | active required PR03-family product slot; PR03B is local-ready with nonempty report/classification/branch-audit/push-manifest/artifact-validation outputs and focused JS unit, lint, PHP standards, and adjacent `git diff --check` passing; browser/PHP replay was blocked by uninitialized `wp-env`; PR04-PR07B restacked locally, but PR07C conflicts and no verified branch link exists | Resolve PR07C and finish the PR03B downstream restack/manifest chain, initialize/run or explicitly downscope browser/PHP replay, rebuild validation-only head with PR6B/PR07C/PR03B/PR14B/PR15C-on-PR14B, then publish/fetch/audit before filing |
| PR13 finer split | PR13B0/B1/B2/B3 source-level evidence; repaired audited PR13A/B/C fallback links | preferred source split is PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | latest split synthesis removes it as product work | final-stack validation/fuzz/filing-only; not an independent-work blocker and not a PR17 product branch | Keep it out of product blocker scans unless later evidence proves product ownership; do not relaunch duplicate work while other Parallel Progress Gate rows exist |
| Reload/post-save `5200005` table-delete replay | completed reducer evidence | PR12-covered by previous-local-cache block delete; not a new product branch | Consume the classification into filing notes; do not assign a PR18/reload product branch unless later evidence contradicts the PR12-covered result |
| Strict `5200005` nested-group signal | newer strict-expansion signal `a914c862c29e` | latest source-local evidence marks it PR11C-covered; no PR18x assignment and no longer an open tail gate | Consume the PR11C-covered classification; reopen only if newer red evidence contradicts the current source-local result |
| `ee0d01a82e12` revision-restore owner gate | latest split-persona synthesis | resolved into PR03B branch-shaping work, not PR07C or PR18x | Track through the PR03B row above; do not leave it as a passive pre-final owner gate |
| Parser-sensitive seed `1060015` | prior focused WebSocket/browser artifacts | downscoped out of the current product-blocker set unless new red evidence appears | Keep out of PR5D/PR18 unless a fresh prepared-browser repro and source-owner reducer prove product ownership |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B; UI-only discriminator prompt pending | downscoped out of the current product-blocker set unless new red evidence appears | Keep out of PR18A unless a fresh UI-only browser repro proves source ownership |
| Reload-hydration diagnostics | nonempty diagnostic-only branch/report for `045710`; `055716` still diagnostic-only; newer nonempty `20260517T062719Z`, `20260517T065722Z`, and `20260517T073541Z` diagnostics | diagnostic-only unless newer evidence proves product ownership; latest mapped branch is `deferred/rtc-reload-hydration-20260517T073541Z` at `c59a2fba4ff1223a501cd470b904d3308459f1e0` with intended local publication branch `danluu/rtc-ws-provider-lifecycle-diagnostics-20260517` | Keep out of PR 6, PR 6A, PR 8A, PR 15, and fallback-group claims unless a later focused browser replay proves product ownership and a clean branch is shaped; replay `d4490d81e882` / seed `5900001`, `df41c4c0e0a1` / seed `5400002`, and strict reload/revision-persistence families against the `073541` diagnostics before promotion |
| Seed `7700055` table query-array identity loss | earlier minority signal | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B |
| Seed `5700084` strict linebreak divergence | Cycle 240 owner/downscope artifacts | freshly consumed as PR05C-covered / oracle-equivalence downscope; not an open PR18x gate | Keep out of PR18x/PR5D unless new source-owned product evidence appears |
| Fresh strict/focused likely-real residuals | current strict-expansion and focused-shard rows; raw novelty status is empty in this collection, while trend evidence is aggregate/control-plane only | owner-triage input only; do not name PR18x from raw rows, missing raw rows, or historical duplicate/noise aggregates | Continue or run owner-only classification; compare parser/rich-text/entity/linebreak rows against PR5B/PR5C first, revision-restore rows against PR03/PR03B/PR07C, and block-tree rows against PR11C/PR12 before later owners |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Pre-save search/live document collapse | prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic publication candidates and prior deferred refs | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A sidecar plus stale deferred relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack preparation; no automatic PR slot | Triage only after the rebuilt stack is available |
| Duplicate/noise control-plane recycling | `duplicate-noise-20260517T074332Z-synthesis.md`; `duplicate-noise-20260517T071132Z-feedback-action.md`; empty `raw/novelty-status.md` in this collection | no product-code split change; bounded consumer/control-plane fix is applied, syntax-checked, restarted, and clean on consumer-path checks, but producer runner/start wrapper was not changed; broad producer cooldown/quarantine semantics remain blocked by policy disagreement | Keep current-run and historical duplicate/noise scopes separate, preserve real product-evidence signatures, avoid broad suppression, complete only narrow current-root/current-output hardening, and require rebuilt final-stack monitor evidence before filing |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use the explicit ready/review prefix. Do not wildcard import or file
   `final/rtc-pr*`, validation-stack branches, deferred branches, or dirty
   evidence branches.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered
   PR13 refs, old PR6B/PR16 material, PR6C, dirty evidence branches, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
3. Publish/fetch and audit PR02A, PR03B, the PR04-through-PR07B-on-PR03B
   restack refs, PR5A/B/C, PR11A-E, PR6B minimal, PR07C,
   PR13B0/B1/B2/B3, and the current PR14B/PR15A/B/C-on-PR14B refs before
   treating those finer refs as maintainer-facing links. The progress-unblock
   ready-ref mapping is not a substitute for `verified-content` GitHub
   branch-link audit rows.
4. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
5. Resolve the PR07C `entities.js` conflict and finish the PR03B downstream
   restack before treating PR14B/PR15-on-PR14B ingestion as current. Require a
   nonempty report, branch audit, push manifest, range-diff, diffstat/numstat,
   focused validation, `git diff --check`, and verified branch links before
   filing those rows.
6. Finish PR6B publication and branch-link verification before filing it.
   Require a clean GitHub review ref, sidecar manifest/validation evidence,
   focused tests, lint, formatting, build, seed replay evidence, branch audit,
   explicit inclusion in the PR14B/PR15-on-PR14B validation stack, and a
   verified branch link.
7. Treat PR07C as an accepted PR07B sidecar from the Cycle 236 browser-pass
   evidence and Cycle 240 `product-sidecar` manifest entry, but resolve its
   PR03B restack conflict and verify a `verified-content` PR07C branch link
   before filing it.
8. Use the Cycle 246 progress-unblock branch audit and push manifest as the
   current reload-hydration diagnostic context, including the newer `073541`
   diagnostic branch, but do not treat those rows as product coverage. Refresh
   again only if a newer diagnostic/product candidate appears.
9. Consume PR17/seed `1020002` as removed from product work. Treat it as
   final-stack validation/fuzz/filing-only unless newer evidence proves product
   ownership, and do not let it block independent gate work.
10. Consume the completed `5200005` table-delete reducer as PR12-covered
   evidence and the newer strict-expansion `a914c862c29e` / seed `5200005`
   result as PR11C-covered. Do not leave either as an open tail blocker or
   PR18x candidate unless fresh red evidence contradicts the source-local
   coverage result.
11. Treat `ee0d01a82e12` as PR03B work. The narrow browser
    `restoreRevision` CRDT invalidation branch after PR03 is now local-ready
    with nonempty artifacts and focused checks, but filing still requires
    resolving the PR07C-on-PR03B conflict, finishing downstream restack,
    browser/PHP replay or an explicit environment downscope, publication/fetch,
    and a verified branch link. Do not assign this signal to PR07C or PR18x.
12. Keep `1060015` downscoped out of the current product-blocker set unless new
    prepared browser/source-owner evidence appears; do not assign it to PR05,
    PR18, PR5D, or another product branch from current evidence.
13. Keep `7510029` downscoped out of the current product-blocker set unless a
    fresh UI-only browser repro proves source ownership; do not name PR18A from
    current evidence.
14. Treat `045710`, `055716`, `20260517T062719Z`, `20260517T065722Z`, and
    `20260517T073541Z` reload-hydration evidence as diagnostic-only unless
    focused browser replay proves product ownership and a clean branch is
    shaped.
15. Compare lower-priority `7700055` against PR14/PR14B before treating it as a
    new product PR.
16. Consume seed `5700084` as PR05C-covered / oracle-equivalence downscoped.
    Reopen it only if fresh source-owned product evidence appears.
17. Treat the latest duplicate/noise work as a fuzzer control-plane update, not
    product PR work. The consumer/control-plane gate fix is applied,
    syntax-checked, restarted, and clean on the current consumer-path checks,
    while the producer runner/start wrapper remains unchanged. Startup/no-
    analysis gates must still require real session/editor progress and must keep
    real product-evidence signatures visible; broad producer cooldown/quarantine
    semantics remain blocked by policy disagreement.
18. Rebase or recreate each intended PR branch on the intended upstream base if
    that base moves.
19. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
20. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
21. Rebuild the combined stack from explicit PR01-PR06A heads, PR02A, PR03B,
    the PR04-through-PR07B-on-PR03B restack, PR6B as a sidecar, PR07C,
    PR09-PR15C-on-PR14B, the PR13 finer split or audited fallback decision,
    and any accepted source-reduced residual branches.
22. Rerun bounded final-stack validation against the rebuilt stack and count it
    only if it reaches action-level product coverage and proves PR6B and the
    PR14B/PR15-on-PR14B refs were included.
23. Block filing if any visible current likely-real failures appear in a fresh
    final-stack monitor snapshot. This collection's raw novelty status is empty,
    and the latest trend packet is graph-derived control-plane evidence only;
    neither is rebuilt final-stack product-health evidence.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. Do not run
broad/final-stack fuzz while the PR07C-on-PR03B conflict, PR03B downstream
restack/link validation, PR14B/PR15-on-PR14B branch links, PR6B GitHub branch
links, PR07C branch-link validation, PR13 finer branch links or fallback
decision, current strict/focused owner triage, reload-hydration diagnostic
adjudication, rebuilt validation, branch-link audits, and fresh nonempty
final-stack monitor evidence are open. The raw novelty input for this
collection is empty, and none of the current trend, duplicate/noise, or
residual reducer evidence is final-stack fuzz validation or a filing unblocker.
