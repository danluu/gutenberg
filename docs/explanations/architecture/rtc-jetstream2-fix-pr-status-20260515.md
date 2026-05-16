# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T08:16:41Z`

Trigger event:
`duplicate-noise-2026-05-16T08-06-31Z-22`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Base handoff:
`docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest split synthesis, `pr-split-20260516T080500Z-synthesis`, keeps the
stack blocked rather than filing-ready. The Cycle 108 source-retirement
tri-split is the current review shape. The matching Cycle 110 feedback action
has launched exactly one bounded PR13B tri-split shaping/check job, but the
latest branch audit still has no verified PR 13B1/13B2/13B3 content links, so
the branch evidence does not match the accepted PR split yet.

Current aggregate `PR 5` is now too broad to preserve. Replace it with:

- `PR 5A`: entity/entity-reference normalization in `crdt.ts`
  (`f39c621c90d` plus `589226af0fe`).
- `PR 5B`: parser/rich-text HTML equivalence in `crdt-blocks.ts`
  (`1a78db8d4ab`).
- `PR 5C`: preserve-whitespace linebreak equivalence (`a517f83913c`), stacked
  after PR 5B because it extends the same helper path.

Keep the already repaired and reviewed split shape for PR 7A/7B and
PR 15A/15B/15C. For PR 13, keep repaired 13A and 13C, and replace the current
aggregate 13B source-retirement branch with:

- `PR 13B1`: direct cross-parent source retirement (`e46efcf5328`).
- `PR 13B2`: current-only cross-parent source retirement (`e783d0fe1a2`).
- `PR 13B3`: explicit-base cross-parent source retirement (`6ea7f425b00`).

The latest synthesis keeps that replacement as the current filing shape, and
the current intended CRDT order is
`PR 10 -> PR 11 -> PR 12 -> PR 13A -> PR 13B1 -> PR 13B2 -> PR 13B3 -> PR 13C -> PR 14 -> PR 15A -> PR 15B -> PR 15C`.
No verified branch links exist yet for PR 13B1/13B2/13B3. Until those refs are
created and audited, the only verified source-retirement content link remains
the repaired aggregate `review/rtc-pr13b-source-retirement` audit row, which is
fallback/provenance only. Do not import or file by wildcard `final/rtc-pr*`: the
latest synthesis reports that
`final/rtc-pr06b-save-snapshot-noop-guard` exists, but it is blocked and must
be excluded from filing-ready heads unless a focused replay later proves it.
This report marks every finer source-retirement row unaudited until verified
branch links exist.

Also replace the broad `PR 8` filing shape: use the narrow prior-art title
reload path from `origin/try/rtc-title-reload-pr`, and keep broader
persisted-record hydration deferred until it has its own evidence and branch.
There is no verified branch link yet for the narrowed PR 8 row.

Current blockers:

1. Wait for and consume the already launched bounded PR13B tri-split
   shaping/check job:
   `rtc-pr13b-trisplit-shape-check-20260516T080500Z`.
2. The job was launched from:
   `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T071308Z/jobs/outputs/rtc-final-refs-import-rebase-check-20260516T071308Z/jobs/repos/rtc-final-rebase-cycle104`.
3. Its output directory is:
   `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T080500Z/jobs/outputs/rtc-pr13b-trisplit-shape-check-20260516T080500Z`.
4. That job must create and check
   `final/rtc-pr13b1-direct-source-retirement`,
   `final/rtc-pr13b2-current-only-source-retirement`, and
   `final/rtc-pr13b3-explicit-base-source-retirement`.
5. Required PR13B tri-split evidence: branch graph, ancestry/containment
   checks, adjacent `range-diff`, adjacent `diff --stat --numstat`, focused
   CRDT tests, touched-file lint or a justified full-lint handling, and
   `git diff --check`.
6. Rebuild or prove unchanged the combined validation stack without aggregate
   `final/rtc-pr13b-source-retirement`.
7. Source repaired heads from the latest finalization worktree:
   `/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/worktrees/pr-stack-20260516T065952Z`.
8. Use an explicit final-ref allow-list; do not wildcard-import blocked
   candidates such as `final/rtc-pr06b-*`.
9. Apply or adjudicate the new PR 5A/5B/5C branches and branch links.
10. Replace/split PR 8 around the narrow title-reload prior-art branch; keep
   broader persisted-record hydration deferred.
11. After PR13B tri-split evidence exists, run the focused PR 6B replay for
   `ws-parser-transform` seeds `5500001`, `5500002`, and `5500006`; drop
   PR 6B if it fails.
12. Rebase or recreate each intended head on the upstream target base. Do not
   file against trunk until the trunk port/rebase base is explicit.
13. Rerun focused checks, touched-file lint, and `git diff --check`.
14. Build and fuzz a fresh combined validation stack from the rebased final
   heads.

Background coverage-guided fuzzing is healthy but is not final-stack
validation. The latest novelty monitor snapshot reports `0` visible likely-real
failures, `9` unmet goals, `7` enabled WS groups, no paused groups, and
no headroom for adding groups. The current run was reset at
`2026-05-16T08:01:03Z`, so its clean current-run triage is still low-volume
background signal, not final-stack validation.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T08:16:37Z`.

The fix-planning repo is currently checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 15A/15B/15C, PR 6, PR 6A, PR 8, fallback-group
evidence, and any final branch claim unless it is deliberately copied into a
clean evidence worktree for the reload-hydration gate.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack has modified fuzz harness files and many untracked fuzz/analysis
scripts. It is active validation infrastructure, not the final PR stack.

The branch-link audit was generated at `2026-05-16T08:16:41Z` from fetched
`danluu` refs. The proposed PR table below uses only audit rows marked
`verified-content` as PR-content links. For PR 5A/5B/5C and the proposed
PR 13B1/13B2/13B3 replacement split, and for the narrowed PR 8 title-reload
row, no verified branch links exist yet, so those rows explicitly say
`No verified branch link yet`.

PR 13 must use the repaired review refs from the audit:

| Purpose | Verified branch containing current PR content | Current SHA |
| --- | --- | --- |
| PR 13A observed-delete provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | `eddf2dd38c09` |
| Aggregate PR 13B source-retirement fallback/provenance | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | `6ea7f425b009` |
| PR 13C identity-smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | `fa0f00a1c025` |

Do not use these stale or misordered refs as PR-content links for repaired
PR 13:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the PR 13A compare link has the repaired source base.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T08:16:37Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T080053Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
novelty-status.md: populated at 2026-05-16T08:14:50.210Z
current visible likely-real signatures: 0
enabled groups: 7 WS groups
paused groups: none
```

Current novelty monitor snapshot:

```text
coverage files: 27061
total records seen: 39749
records processed this pass: 54
coverage lines seen this pass: 41049
summary files read this pass: 7
summary startup failures processed this pass: 0
unmet goals: 9
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
load1: 71.97 / 64 cores
memory: 417.5G free / 492.0G total
headroom for adding groups: no
```

Enabled groups:

- `novelty-ws-common-blocks`
- `novelty-ws-block-gauntlet`
- `novelty-ws-real-user-editing`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-async-server-blocks`
- `novelty-ws-media-cross-entity`
- `novelty-ws-long-session-large-doc`

Paused groups: none.

Current-run triage remains clean in the generated snapshot: current output dir
scope has `1` triage root, `0` state files, `0` signatures, `0` likely-real
visible, `0` likely-real merged duplicates, and `0` oracle/noise questions.
Historical and sidecar triage are still noisy but separated from current-run
product health: closed historical scope has `96` roots, `155` state files,
`8801` signatures, and `4209` bootstrap stalls; external live sidecar scope has
`4` roots, `98` state files, `9244` signatures, and `6840` bootstrap stalls.
Combined reporting scope has `101` triage roots, `253` triage state files,
`18048` signatures, `11049` bootstrap stalls, and top semantic family
`pre_action_bootstrap_stall` with `10804` entries. Treat that as harness
control-plane noise unless current-run evidence produces a product signal.

The trend evidence packet was generated at `2026-05-16T08:07:31Z` from monitor
data through `2026-05-16T08:06:14Z`. It supports longer-running coverage
progress with no visible likely-real failures so far:

```text
monitor passes: 1362
coverage files: 272 -> 26899
coverage files delta: 26627
unmet coverage goals: 24 -> 9
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.4672
summary_startup_failures_last: 0
pr_review_events: 9716
pr_suggested_net_loc_latest_total: 11801
```

The largest unmet fuzz-depth goals remain CDP coverage records (`4286/5000`),
real-user-editing success count (`255/500`), `core/html` (`311/500`),
`core/details` (`345/500`), `core/more` (`354/500`), heading shortcuts
(`387/500`), reload-post actions (`408/500`), `core/gallery` (`448/500`), and
the real-user body save/reload template (`185/200`). Treat these as fuzz-depth
gaps, not as proof of final-stack readiness or product failure.

Completed validation evidence:

- PR 13 source-import gate:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260515T212143Z/jobs/outputs/pr13-source-import-verify-retry3-20260515T212143Z/report.md`
- That report records `63/63` focused stale top-level CRDT tests passing,
  touched-file JS lint passing, and `git diff --check` passing.
- The latest split synthesis keeps PR 5A/5B/5C, PR 7A/7B, and
  PR 15A/15B/15C as repaired split shapes and records PR 13B1/13B2/13B3 as
  the intended replacement for aggregate PR 13B. The latest import/rebase/check
  output is useful but still validates aggregate
  `final/rtc-pr13b-source-retirement`; the Cycle 110 feedback action launched
  one bounded PR13B tri-split shaping/check job, and clean audited links for
  the three source-retirement refs still depend on that job's output.

What remains before filing:

1. Consume the launched bounded PR13B tri-split shaping/check job output and
   verify `final/rtc-pr13b1-*`, `final/rtc-pr13b2-*`, and
   `final/rtc-pr13b3-*`.
2. Rebuild or prove unchanged the combined validation stack without aggregate
   `final/rtc-pr13b-source-retirement`.
3. Import or fetch the explicitly allowed repaired final heads if the queue
   audit still finds gaps.
4. Create or verify PR 5A/5B/5C and refresh verified branch links after push.
5. Replace/split PR 8 so the active row is the narrow title-reload prior-art
   path from `origin/try/rtc-title-reload-pr`; keep broader persisted-record
   hydration deferred.
6. Exclude `final/rtc-pr06b-*` from filing-ready heads until a focused replay
   proves it.
7. After the tri-split evidence exists, run the bounded PR 6B focused replay for
   seeds `5500001`, `5500002`, and `5500006`; drop PR 6B if it fails.
8. Rebase or recreate each intended PR branch on the intended upstream base.
9. Drop analysis-only artifacts and keep only product code plus focused tests.
10. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the rebased branch heads.
11. Rerun focused checks, touched-file lint, and `git diff --check` on every
   branch after rebase.
12. Assemble a fresh final combined validation stack from the actual PR heads.
13. Run final focused checks and coverage-guided fuzzing on that stack.
14. Block filing if new visible likely-real failures appear.

## Status-Persona Analysis

Completed status-analysis reports through
`final-20260516T040744Z-final-analysis` agree on the report shape: remove stale
PR 13 repair-missing language, separate current-run fuzz health from historical
noise, keep evidence-only families out of the split, and make filing gates
explicit. Earlier status-analysis warned not to claim corrected PR 13 GitHub
links until the repaired refs were pushed; the current `branch-link-audit.md`
now verifies the repaired PR 13A and PR 13C review refs and the aggregate
PR 13B fallback/provenance ref. One older status-analysis claim that only an
HTTP persistence probe was enabled is stale; the raw
`2026-05-16T08:14:50Z` novelty snapshot is the source for the current seven
enabled WS groups.

The newest split persona synthesis is `pr-split-20260516T080500Z-synthesis`.
The matching feedback-action, `pr-split-20260516T080500Z-feedback-action.md`,
applied Cycle 110 feedback and launched
`rtc-pr13b-trisplit-shape-check-20260516T080500Z`. The newest synthesis says:

- The split is not filing-ready because active final refs still include
  aggregate `final/rtc-pr13b-source-retirement`.
- Replace aggregate PR 13B with PR 13B1/13B2/13B3: direct cross-parent source
  retirement, current-only cross-parent source retirement, then explicit-base
  source retirement, between repaired PR 13A and PR 13C.
- Run one bounded PR13B tri-split shaping/check job from the cycle-104 rebase
  clone under the latest import/rebase/check output; that job has now been
  launched and must not be duplicated while its output is pending.
- Replace/split broad PR 8: use the narrow prior-art title reload path from
  `origin/try/rtc-title-reload-pr`, and keep broader persisted-record hydration
  deferred.
- Keep PR 6B blocked pending focused replay of `ws-parser-transform` seeds
  `5500001`, `5500002`, and `5500006`; drop PR 6B if the replay fails.
- Keep reload-hydration empty-live-editor, pre-save live-collapse, rich-text
  suffix corruption, HTTP room-isolation residuals, and PR 1A evidence-only.
- Do not file against trunk until the trunk port/rebase base is explicit, and
  do not start final-stack fuzzing until the corrected final stack exists.

The newest duplicate-noise synthesis,
`duplicate-noise-20260516T080631Z-synthesis.md`, changes no product PR
validation status and edited no files. It narrows the remaining control-plane
work to strict no-user/no-action `pre_action_bootstrap_stall` handling: add a
shared triage-watcher predicate, add an analysis-tier backstop, fix the
live-analysis loop command, and keep historical known-noise advisory unless
current-run evidence confirms it. The latest nonempty duplicate-noise
feedback-action remains `duplicate-noise-20260516T073829Z-feedback-action.md`:
that action split historical and external live triage in
`rtc-browser-fuzz-novelty-monitor.mjs`, stopped historical known-noise from
driving coverage-Codex holds without current-run confirmation, added a
conservative startup-stall guard in `rtc-browser-fuzz-supervisor.mjs`, passed
`node --check` on both touched scripts, and restarted the active supervisor and
novelty monitor. After the `08:01Z` current-run reset, the current output dir
still has no signatures, while combined historical/sidecar status remains
dominated by `pre_action_bootstrap_stall`.

## Proposed PR Split

The old aggregate PR 15 is stale. Use PR 15A/15B/15C. The old aggregate PR 5 is
also stale; the current working split is PR 5A/5B/5C, pending clean audited
branches from the import/rebase/check pass. The newest persona now recommends
replacing the current broad PR 13B with PR 13B1/13B2/13B3, but no verified
branch links exist yet for those finer rows. The broad PR 8 row is also stale:
the current working split keeps only the narrow title-reload prior-art path and
defers broader persisted-record hydration. The table below includes only
verified `branch-link-audit.md` PR-content links, or explicitly says
`No verified branch link yet`.

For PRs whose final filing head is expected to come from a repaired
`final/rtc-pr*` ref, the audit link is the latest verified GitHub content link,
not proof that the branch is ready to file without import, rebase, checks, and
final validation.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified GitHub branch; final rebase/checks still required |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified GitHub branch; final rebase/checks still required |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified GitHub branch; final rebase/checks still required |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified GitHub branch; final rebase/checks still required |
| PR 5A | Entity/entity-reference normalization in `crdt.ts` | No verified branch link yet | 2 | +465 / -8 | replacement for old PR 5; create/audit from `f39c621c90d` plus `589226af0fe` |
| PR 5B | Parser/rich-text HTML equivalence in `crdt-blocks.ts` | No verified branch link yet | 2 | +925 / -42 | replacement for old PR 5; create/audit from `1a78db8d4ab` |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old PR 5; create/audit from `a517f83913c`, stacked after PR 5B |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | does not claim browser-only gates, PR 6B, or malformed-save residuals beyond audited scope |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | repaired final head expected; import/push/rebase/link refresh still required |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | repaired final head expected; stacked after PR 7A |
| PR 8 | Narrow reload-title prior-art path | No verified branch link yet | TBD | TBD | replacement for old broad PR 8; shape from `origin/try/rtc-title-reload-pr`; broader persisted-record hydration remains deferred |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified GitHub branch; final rebase/checks still required |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | start CRDT stack |
| PR 11 | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | stacked on PR 10 |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified content branch; final export/rebase still required |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | corrected repaired review branch; starts after PR 12 |
| PR 13B1 | Direct cross-parent source retirement | No verified branch link yet | 2 | about +484 / -0 | recommended replacement for broad PR 13B; launched tri-split job should create/audit from `e46efcf5328` |
| PR 13B2 | Current-only cross-parent source retirement | No verified branch link yet | 2 | about +412 / -4 | recommended replacement for broad PR 13B; launched tri-split job should create/audit from `e783d0fe1a2` |
| PR 13B3 | Explicit-base cross-parent source retirement | No verified branch link yet | 2 | about +778 / -2 | recommended replacement for broad PR 13B; launched tri-split job should create/audit from `6ea7f425b00` |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | corrected repaired review branch |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | repaired final head expected after PR 13C; import/push/rebase/link refresh still required |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | repaired final head expected; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | repaired final head expected; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | repaired final head expected; keep reload-hydration gate spec out |

The current large PR 5 audit branch,
[`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence),
is still a verified content link for the old grouping (`4` files,
`+1664 / -52`), but it is no longer the recommended maintainer-facing split.
Use it only as prior art unless the PR 5A/5B/5C import/rebase/check pass fails.

The current aggregate PR 13B audit branch,
[`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement),
is still the only verified content link for source-retirement work (`2` files,
`+1672 / -4`). Use it as the current aggregate fallback or provenance link, not
as proof that PR 13B1/13B2/13B3 have been created.

The current broad PR 8 audit branch,
[`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record),
is still a verified content link for the old grouping (`11` files,
`+618 / -61`), but it is no longer the recommended maintainer-facing split. Use
it only as prior art until the narrowed title-reload branch is shaped and
audited.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR 6B save snapshot/no-op guard candidate | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | blocked candidate, not part of filing-ready split; exclude from wildcard final-ref import and from PR 6 claims | After import/rebase, run a bounded focused `ws-parser-transform` replay; pass condition is no duplicated content marker at `save-checkpoint-persisted-crdt-projection`; drop PR 6B if replay fails |
| Broad PR 8 persisted-record hydration | old audit branch `review/rtc-pr08-title-reload-persisted-record` | deferred; the active PR 8 row is only the narrow title-reload prior-art path | Promote only after the narrowed title-reload branch is shaped and any remaining persisted-record hydration claim has separate product evidence and a verified branch link |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; latest bounded retry fixed throwaway plugin mapping/build setup and passed collaboration readiness, but the focused reload-hydration spec failed before the reload product assertion at post-checkpoint convergence; final classification `product-evidence-inconclusive` | Reuse the corrected harness mapping, then collect phase diagnostics around every pre-reload convergence wait; promote only if the gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split synthesis keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond the isolated PR 6B candidate; latest synthesis does not promote malformed-save residual work into the active split | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; possible `PR 1A` | deferred; possible PR 1A is not in the active split | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Use this filing order after import, rebase, evidence cleanup, branch-link
refresh, focused checks, and validation:

1. Small independent HTTP, revision, CRDT-save-meta, PR 5A/5B/5C,
   save-request, persisted-body, and lock-fairness fixes after their final heads
   are cleanly imported, rebased, checked, and linked.
2. Save-response PR 7A/7B from repaired final heads after
   import/push/rebase/link refresh.
3. PR 8 only after the narrow title-reload prior-art path is shaped, audited,
   and checked; keep broader persisted-record hydration deferred.
4. The CRDT block reconciliation stack, with PR 13 reviewed through repaired
   13A and 13C plus PR 13B1/13B2/13B3 after those branch links are verified.
   If that shaping fails, fall back to the audited repaired aggregate
   PR 13B source-retirement branch rather than stale PR 13 refs.
5. Table and fallback-group structural residuals from repaired final heads
   after evidence hygiene is clean.

Existing fuzz infrastructure can continue where healthy. The current populated
novelty snapshot has `0` visible likely-real failures, `9` unmet goals,
`7` enabled WS groups, no paused groups, and no headroom for adding groups, but
none of this is broad final-stack coverage or PR-filing validation. Do not
start broad final-stack fuzzing until the rebased combined stack exists. Do not
start duplicate finalization, another PR 13 repair/import, another split-review
loop, or open-ended control-plane jobs from this status update. The next
maintainer-facing branch step is to consume the already launched bounded
PR13B tri-split shaping/check job; run PR 6B replay only after that evidence
exists.
