# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T06:08:22Z`

Trigger event:
`pr-split-2026-05-16T06-07-12Z-20260516T060039Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Base handoff:
`docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md`

## Executive Status

The Jetstream2 fix-planning loop completed all `40/40` requested iterations and
produced a stable RTC split. The split is still accepted: no latest persona or
status-analysis report recommends a redesign, and the old aggregate PR 15 is
replaced by PR 15A/15B/15C.

The latest split synthesis, `pr-split-20260516T060039Z-synthesis`, moves the
branch-shape status forward: the `20260516T053947Z` finalization produced
repaired `final/rtc-pr*` heads for PR 7A/7B, PR 14, and PR 15A/15B/15C, with
focused unit checks, touched-file lint, and `git diff --check` passing. That
does not make the stack filing-ready. Remaining blockers are PR 8 comparison,
ref import/push/rebase, evidence cleanup, branch-link refresh, and final
combined-stack validation.

Current state:

- Current fuzz health is clean for visible likely-real product failures:
  `0` current-output-dir likely-real failures and `0` historical likely-real
  failures in the latest novelty snapshot. This is health evidence only, not
  final-stack validation.
- The live coverage root reset to
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T060355Z`.
  The latest monitor reports `24,800` coverage files, `36,533` total records,
  `11` unmet goals, `0` current signatures, and `0` current visible likely-real
  failures.
- PR 13 repair/import is complete. The repaired source-repo heads passed the
  source-import gate with `63/63` focused stale top-level CRDT tests, touched
  file JS lint, and `git diff --check`.
- PR 7A/7B, PR 14, and PR 15A/15B/15C are no longer described as waiting on the
  old branch-shape job. The latest synthesis says finalization repaired them
  into `final/rtc-pr*` heads. They still need import/fetch into the PR-prep
  repo, push or verified branch-link refresh, rebase onto the intended upstream
  base, and final validation.
- PR 8 remains blocked. It needs comparison against `try/rtc-title-reload-pr`
  with range-diff, diffstat/numstat, changed-file and claim audit, focused
  tests, touched-file lint, and `git diff --check`. It must not claim
  reload-hydration empty-live-editor coverage.
- Reload-hydration empty-live-editor, pre-save search/live-collapse, rich-text
  suffix corruption, malformed save payload residuals, HTTP room-isolation
  residuals, `PR 1A`, and `PR 6B` remain evidence-only or deferred.

## Latest Branch And Ref Status

The fix-planning repo is currently checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 15A/15B/15C, PR 6, PR 6A, PR 8, fallback-group
evidence, and any final branch claims unless it is deliberately copied into a
clean evidence worktree for the reload-hydration gate.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack has modified fuzz harness files and many untracked fuzz/analysis
scripts. It is active validation infrastructure, not the final PR stack.

The branch-link audit was generated at `2026-05-16T06:08:22Z` from fetched
`danluu` refs. It verifies GitHub-facing `review/rtc-pr*` branches with
non-empty diffs against the listed bases. The proposed PR table below uses only
audit rows marked `verified-content` as PR-content links.

The latest split synthesis is stricter for filing than the audit table: use the
repaired `final/rtc-pr*` heads from
`/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/worktrees/pr-stack-20260516T053947Z`
as PR-head candidates after they are imported, pushed or linked, rebased, and
validated. Do not file or review `shape/*`, `finalize/*`, `deferred/*`,
`try/rtc-fix-stack-validation`, dirty worktrees, or the old aggregate PR 15 as
current PR heads.

PR 13 must use the repaired review refs from the audit:

| Purpose | Verified branch containing current PR content | Current SHA |
| --- | --- | --- |
| PR 13A observed-delete provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | `eddf2dd38c09` |
| PR 13B source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | `6ea7f425b009` |
| PR 13C identity-smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | `fa0f00a1c025` |

Do not use these stale/misordered refs as PR-content links for repaired PR 13:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the PR 13A compare link has the repaired source base.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T06:08:16Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T060355Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
novelty-status.md updated: 2026-05-16T06:06:44.686Z
```

The current novelty monitor reports:

```text
coverage files: 24800
total records seen: 36533
records processed this pass: 25
new behavioral feature keys this pass: 1
new CDP coverage hashes this pass: 1
unmet goals: 11
current output-dir signatures: 0
current visible likely-real failures: 0
historical signatures: 16289
historical bootstrap stalls: 9938
historical visible likely-real failures: 0
headroom for adding groups: yes
load1: 56.19 on 64 cores
memory free: 422.2G
```

Use the current `novelty-status.md` snapshot for live group enablement. The
`latest-trend-evidence.md` packet was generated at `2026-05-16T06:02:37Z` from
monitor data through `2026-05-16T06:00:38Z`; it predates the `06:04Z` root
reset and group changes.

Enabled groups in the latest monitor snapshot are:

- `novelty-ws-common-blocks`
- `novelty-ws-real-user-editing`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-async-server-blocks`
- `novelty-ws-media-cross-entity`
- `novelty-ws-long-session-large-doc`
- `novelty-http-persistence-probe`

Paused groups are `novelty-ws-lifecycle`, `novelty-ws-block-gauntlet`, and
`novelty-ws-parser-transform`, all from current-run pre-action startup failure
cooldowns. `novelty-ws-persistence-no-title` was terminated shortly before the
root reset after a current-run startup failure; HTTP persistence remains enabled
through `novelty-http-persistence-probe`.

The latest trend packet supports longer-running coverage progress with no
visible likely-real failures so far:

```text
monitor passes: 1300
coverage files: 272 -> 24739
coverage files delta: 24467
unmet coverage goals: 24 -> 11
likely_real_max: 0
pr_review_events: 292
pr_suggested_net_loc_latest_total: 11801
```

The largest unmet goals remain CDP coverage records, real-user-editing success
count, `core/html`, `core/more`, heading shortcuts, `core/details`, reload-post
actions, `core/gallery`, body save/reload, `core/file`, and undo/redo
paragraph. Treat those as fuzz-depth gaps, not PR blockers by themselves.

Completed validation evidence:

- PR 13 source-import gate:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260515T212143Z/jobs/outputs/pr13-source-import-verify-retry3-20260515T212143Z/report.md`
- That report records `63/63` focused stale top-level CRDT tests passing,
  touched-file JS lint passing, and `git diff --check` passing.
- The latest split synthesis says the `20260516T053947Z` finalization repaired
  PR 7A/7B, PR 14, and PR 15A/15B/15C into `final/rtc-pr*` heads with focused
  unit checks, touched-file lint, and `git diff --check` passing.

What remains before filing:

1. Import or fetch the repaired `final/rtc-pr*` heads into the local PR-prep
   repo and refresh verified branch links after push.
2. Run the bounded PR 8 title-reload comparison against `try/rtc-title-reload-pr`.
3. Rebase or recreate each intended PR branch on the intended upstream base.
4. Drop analysis-only artifacts and keep only product code plus focused tests.
5. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the rebased branch heads.
6. Rerun focused checks, touched-file lint, and `git diff --check` on every
   branch after rebase.
7. Assemble a fresh final combined validation stack from the actual PR heads.
8. Run final focused checks and coverage-guided fuzzing on that stack.
9. Block filing if new visible likely-real failures appear.

## Status-Persona Analysis

Completed status-analysis reports through
`final-20260516T040744Z-final-analysis` agree on the status-report shape:
remove stale PR 13 repair-missing language, separate current-run fuzz health
from historical noise, keep evidence-only families out of the split, and make
filing gates explicit.

The newest split persona synthesis is
`pr-split-20260516T060039Z-synthesis`. It says:

- The split is on track but not filing-ready.
- Finalization repaired prior branch-shape blockers for PR 7A/7B, PR 14, and
  PR 15A/15B/15C into `final/rtc-pr*` heads with focused checks passing.
- PR 8 is still blocked on comparison against `try/rtc-title-reload-pr`.
- The final refs still need import/push/rebase and final combined-stack
  validation.
- Reload-hydration and pre-save search deferred jobs were active:
  `rtc-deferred-job-reload-hydration-20260516T060000Z` and
  `rtc-deferred-job-pre-save-search-live-collapse-20260516T060001Z`. Wait for
  nonempty reports before promoting either family.
- Do not add `PR 1A` or `PR 6B`; malformed save-payload work is either
  deferred or already represented by PR 6.

The latest duplicate-noise synthesis,
`duplicate-noise-20260516T055200Z-synthesis`, changes no product PR validation
status. It identifies a control-plane follow-up: align strict pre-action
startup suppression across the triage watcher and analysis tier, and make
novelty startup pausing current-run and success-aware. It explicitly does not
justify broad suppression of `timeout`, `unknown`, assertions,
late-session-awareness, non-convergence, save/reload/persistence/revision/media
failures, or linebreak drift.

The latest collected `pr-split-20260516T060039Z-feedback-action.md` was empty,
so this report uses the `060039Z` synthesis itself as the newest completed
status-persona input.

## Proposed PR Split

The old aggregate PR 15 is stale. Use PR 15A/15B/15C. The table below includes
only verified `branch-link-audit.md` PR-content links. For PRs whose final
filing head is now expected to come from a repaired `final/rtc-pr*` ref, the
audit link is the latest verified GitHub content link, not proof that the branch
is ready to file without import/rebase/validation.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified GitHub branch; final rebase/checks still required |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified GitHub branch; final rebase/checks still required |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified GitHub branch; final rebase/checks still required |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified GitHub branch; final rebase/checks still required |
| PR 5 | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | 4 | +1664 / -52 | large review unit; split only if reviewers prefer |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | does not claim browser-only gates or malformed-save residuals beyond its audited scope |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | finalization says repaired `final/rtc-pr*` head exists; import/push/rebase/link refresh still required |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | finalization says repaired `final/rtc-pr*` head exists; stacked after PR 7A |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | 11 | +618 / -61 | blocked on `try/rtc-title-reload-pr` comparison; must not claim empty-live-editor coverage |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified GitHub branch; final rebase/checks still required |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | start CRDT stack |
| PR 11 | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | stacked on PR 10 |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified content branch; final export/rebase still required |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | corrected repaired review branch |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | corrected repaired review branch |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | corrected repaired review branch |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | finalization says repaired `final/rtc-pr*` head exists after PR 13C; import/push/rebase/link refresh still required |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | finalization says repaired `final/rtc-pr*` head exists; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | finalization says repaired `final/rtc-pr*` head exists; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | finalization says repaired `final/rtc-pr*` head exists; keep reload-hydration gate spec out |

Largest audited review risks by size are PR 13B, PR 5, PR 7A, and PR 12.
PR 13 is deliberately split into observed-delete provenance, source retirement,
and identity-smear protection so reviewers can evaluate each CRDT invariant
separately.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; `rtc-deferred-job-reload-hydration-20260516T060000Z` active | evidence-only; latest split synthesis says wait for a nonempty deferred report and keep it out of PR 8/PR 15 claims | One bounded checkpoint/phase diagnostics pass; promote only if live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `rtc-deferred-job-pre-save-search-live-collapse-20260516T060001Z` active | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split synthesis still keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred; possible `PR 6B` is not consensus, and the latest synthesis says malformed save-payload work is either deferred or already represented by PR 6 | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1` | deferred; possible `PR 1A` is not consensus | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

File order after import, rebase, evidence cleanup, and validation should be:

1. Small independent HTTP, revision, CRDT-save-meta, parser/entity,
   save-request, persisted-body, and lock-fairness fixes.
2. Save-response PR 7A/7B from the repaired `final/rtc-pr*` heads after
   import/push/rebase/link refresh.
3. PR 8 only after the bounded title-reload comparison confirms its changed
   files and claims.
4. The CRDT block reconciliation stack, with PR 13 reviewed only through the
   repaired 13A/13B/13C refs.
5. Table and fallback-group structural residuals from repaired final heads
   after evidence hygiene is clean.

Existing fuzz infrastructure can continue where healthy. The current
coverage-guided run has `0` visible likely-real failures and `11` unmet goals,
but it is not broad final-stack coverage or PR-filing validation. The next
concrete branch work is PR 8 comparison plus import/rebase/link-refresh of the
finalized heads. Do not start new broad fuzzing, another PR 13 repair/import,
duplicate split-review, or open-ended control-plane jobs from this status
update.
