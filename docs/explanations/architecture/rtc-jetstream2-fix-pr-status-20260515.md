# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T06:37:49Z`

Trigger event:
`pr-split-2026-05-16T06-36-49Z-20260516T063020Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Base handoff:
`docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md`

## Executive Status

The continuous Jetstream2 PR split review loop is active. The split is still
accepted: no latest persona or status-analysis report recommends a redesign,
and the old aggregate PR 15 is replaced by PR 15A/15B/15C.

The latest split synthesis, `pr-split-20260516T063020Z-synthesis`, keeps the
split unchanged and makes the current blocker operational: only repaired
`final/rtc-pr*` refs are valid PR-head candidates, and the latest finalization
source to import is
`/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/worktrees/pr-stack-20260516T061949Z`.
Those heads are not imported into the fix-plan repo yet. That does not make the
stack filing-ready. Remaining blockers are final-ref import/push/rebase, PR 8
comparison, evidence cleanup, branch-link refresh, and final combined-stack
validation.

Current state:

- The live coverage root is
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T062428Z`.
  The current novelty monitor snapshot is populated at
  `2026-05-16T06:37:06.913Z`: `25220` coverage files, `37132` total records,
  `10` unmet goals, `0` current visible likely-real signatures, `7` enabled WS
  groups, and `novelty-http-persistence-probe` paused by the max-enabled-group
  resource guard.
- The latest trend evidence still shows clean visible likely-real product
  health: `likely_real_max: 0`, current duplicate share `0`, historical
  duplicate share about `0.5983`, and `10` unmet goals through
  `2026-05-16T06:31:14Z`; the current monitor has since advanced to `25220`
  coverage files with the same unmet-goal count. This is background health
  evidence only, not final-stack validation.
- PR 13 repair/import is complete. The repaired source-repo heads passed the
  source-import gate with `63/63` focused stale top-level CRDT tests, touched
  file JS lint, and `git diff --check`.
- PR 7A/7B, PR 14, and PR 15A/15B/15C are no longer described as waiting on the
  old branch-shape job. The latest synthesis says finalization repaired them
  into `final/rtc-pr*` heads, but those heads still need import into the
  fix-plan repo, push or verified branch-link refresh, rebase onto the intended
  upstream base, and final validation.
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

The branch-link audit was generated at `2026-05-16T06:37:49Z` from fetched
`danluu` refs. It verifies GitHub-facing `review/rtc-pr*` branches with
non-empty diffs against the listed bases. The proposed PR table below uses only
audit rows marked `verified-content` as PR-content links.

The latest split synthesis is stricter for filing than the audit table: use only
repaired `final/rtc-pr*` heads as PR-head candidates after they are imported,
pushed or linked, rebased, and validated. Import from the latest finalization
worktree,
`/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/worktrees/pr-stack-20260516T061949Z`.
One report also named `053947Z`, but the consensus and latest finalization point
to `061949Z`. Do not file or review `shape/*`, `finalize/*`, `deferred/*`,
`try/rtc-fix-stack-validation`, dirty worktrees, or the old aggregate PR 15 as
current PR heads. As of `pr-split-20260516T063020Z-synthesis`, the repaired
final heads are not yet imported into the fix-plan repo.

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
collected_at_utc: 2026-05-16T06:37:44Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T062428Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
novelty-status.md: populated at 2026-05-16T06:37:06.913Z
current visible likely-real signatures: 0
enabled groups: 7 WS groups
paused groups: novelty-http-persistence-probe
```

The current `novelty-status.md` file is populated for the `062428Z` root. It is
usable as a current-run health snapshot, but still not final PR-stack
validation because the repaired final PR heads have not been imported, rebased,
assembled into a fresh combined validation stack, and fuzzed as that stack.

The `latest-trend-evidence.md` packet was generated at
`2026-05-16T06:31:42Z` from monitor data through `2026-05-16T06:31:14Z`. At
that trend snapshot, the enabled-group list was:

- `novelty-ws-common-blocks`
- `novelty-ws-long-session-large-doc`
- `novelty-ws-async-server-blocks`
- `novelty-ws-real-user-editing`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-media-cross-entity`
- `novelty-ws-block-gauntlet`

The current novelty monitor has since reset to the `062428Z` output root and
now reports `7` enabled WS groups. `novelty-http-persistence-probe` is paused by
the max-enabled-group resource guard, while `session-lifecycle` is still held
out by the existing pre-action startup-failure cooldown. Current-run triage
remains clean: `0` signatures, `0` likely-real visible, `0` likely-real merged
duplicates, and top duplicate family share `0`.

The latest trend packet supports longer-running coverage progress with no
visible likely-real failures so far:

```text
monitor passes: 1316
coverage files: 272 -> 25119
coverage files delta: 24847
unmet coverage goals: 24 -> 10
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.5983
summary_startup_failures_last: 0
pr_review_events: 304
pr_suggested_net_loc_latest_total: 11801
```

The current novelty monitor has advanced slightly beyond the trend packet:
`25220` coverage files, `37132` total records, `45` records processed in the
pass, `10` unmet goals, and no quality issues. The largest unmet goals remain
CDP coverage records, real-user-editing success count, `core/html`,
`core/more`, `core/details`, heading shortcuts, reload-post actions,
`core/gallery`, body save/reload, and `core/file`. Treat those as fuzz-depth
gaps, not PR blockers by themselves.

Completed validation evidence:

- PR 13 source-import gate:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260515T212143Z/jobs/outputs/pr13-source-import-verify-retry3-20260515T212143Z/report.md`
- That report records `63/63` focused stale top-level CRDT tests passing,
  touched-file JS lint passing, and `git diff --check` passing.
- The latest split synthesis says `pr-stack-20260516T061949Z` contains the
  repaired `final/rtc-pr*` heads for PR 7A/7B, PR 14, and PR 15A/15B/15C with
  focused checks, touched file lint, and `git diff --check` passing. A prior
  report also named the matching `053947Z` worktree, but `061949Z` is the
  current import target.

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
`pr-split-20260516T063020Z-synthesis`. It says:

- The split is on track but not filing-ready.
- The main blocker is branch-head hygiene: import the repaired `final/rtc-pr*`
  refs from `pr-stack-20260516T061949Z`, then verify, push or link, rebase, and
  validate them before filing.
- PR 8 is still blocked on comparison against `try/rtc-title-reload-pr`.
- The final refs still need import, verification, push, upstream rebase,
  focused checks, and final combined-stack validation.
- Reload-hydration empty-live-editor, pre-save search/live-collapse, broad
  rich-text suffix corruption, malformed-save residuals, and HTTP room-isolation
  residuals remain evidence-only.
- Do not add `PR 1A` or `PR 6B`; malformed save-payload work is either
  deferred or already represented by PR 6.
- Launch no automatic new fuzz lanes, broad final-stack fuzz, duplicate
  finalization, or another split-review loop from this updater pass.

The newest duplicate-noise synthesis,
`duplicate-noise-20260516T062141Z-synthesis.md`, changes no product PR
validation status. It recommends one narrow control-plane fix: use an all-record
strict no-user/no-action startup predicate across the runner, triage watcher,
analysis tier, and novelty monitor, while preserving any seed with users,
actions, saves, reloads, faults, lifecycle events, operation evidence,
non-convergence, assertions, or persistence mismatches. Its paired
`duplicate-noise-20260516T062141Z-feedback-action.md` is zero bytes.

The latest completed duplicate-noise feedback action remains
`duplicate-noise-20260516T055200Z-feedback-action.md`. It patched
`rtc-browser-fuzz-novelty-monitor.mjs` to dedupe current-run pre-action startup
failures by profile/seed, avoid double-counting matching summary pre-analysis
records, make early startup pausing success-aware, ignore stale low-rate
cooldowns, and bump run-local noise policy to `5`. Validation passed
`node --check` plus a mini monitor pass over copied block-gauntlet and
parser-transform data, with no paused groups in that mini validation.

The remaining duplicate-noise control-plane gap is the stricter
runner/watcher/analysis-tier suppression path. The synthesis still explicitly
rejects broad suppression of `timeout`, `unknown`, assertions,
late-session-awareness, non-convergence, save/reload/persistence/revision/media
failures, or linebreak drift.

The paired `pr-split-20260516T063020Z-feedback-action.md` is zero bytes. The
latest non-empty split feedback action,
`pr-split-20260516T061642Z-feedback-action.md`, applied the Cycle 98 report
update and launched no jobs. The latest split synthesis,
`pr-split-20260516T063020Z-synthesis`, is the newest completed status-persona
input for branch status.

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
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; latest bounded retry fixed throwaway plugin mapping/build setup and passed collaboration readiness, but the focused reload-hydration spec failed before the reload product assertion at post-checkpoint convergence; final classification `product-evidence-inconclusive` | Reuse the corrected harness mapping, then collect phase diagnostics around every pre-reload convergence wait; promote only if the gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `rtc-deferred-job-pre-save-search-live-collapse-20260516T060001Z` active | evidence-only; not in active split; latest split synthesis says the deferred report is now nonempty input for the next review cycle, not a promotion signal | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split synthesis keeps it out of the active PR split and says the now-nonempty deferred report should be reviewed before any promotion | Recover exact replay artifact or emitted delta before product changes |
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

Existing fuzz infrastructure can continue where healthy. The current populated
novelty snapshot has `0` visible likely-real failures and `10` unmet goals, but
none of this is broad final-stack coverage or PR-filing validation. The next
concrete branch work is importing the repaired final refs into the fix-plan
repo, verifying and rebasing them, resolving the PR 8 comparison, and then
assembling a fresh combined validation stack. Do not start new fuzz lanes,
broad final-stack fuzzing, duplicate finalization, another PR 13 repair/import,
another split-review loop, or duplicate open-ended control-plane jobs from this
status update.
