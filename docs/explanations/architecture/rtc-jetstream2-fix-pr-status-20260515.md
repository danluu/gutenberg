# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T05:45:53Z`

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
produced a concrete source branch inventory plus a stable PR split. The split
review/persona loop has continued since then. Its latest completed synthesis
does not recommend a redesign, but it does require status/shape updates: use
the split PR 15A/15B/15C rows instead of the stale aggregate PR 15, and mark
several final heads as blocked until branch-shape or integration work is done.

Current state:

- The split is reviewable, but it is not final-file-ready. PR 7A/7B, PR 14,
  and PR 15A/15B/15C have branch-shape or ordered-integration blockers; PR 8
  must not claim reload-hydration empty-live-editor coverage and still needs
  comparison/shape checking before filing.
- The remaining filing blockers are export/rebase, evidence cleanup, branch
  graph/containment evidence, adjacent range-diffs/diffstats, focused
  post-rebase checks, and a fresh final combined-stack validation run.
- Current coverage-guided fuzzing still reports `0` visible likely-real
  failures, but this is health evidence only. It is not running against a final
  rebased PR stack and must not be treated as PR-filing or final-stack
  validation.
- The earlier historical-noise scheduling problem is separated from current-run
  triage. The new collection selected coverage root
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T053837Z`.
  The current monitor detail body is present again: it reports `0` current
  visible likely-real failures, `24,575` coverage files, `36,207` total records,
  `11` unmet goals, and five enabled groups. `novelty-ws-async-server-blocks`,
  `novelty-ws-real-user-editing`, and `novelty-ws-real-user-rich-text` are
  paused from current-run startup evidence/cooldowns. This is health evidence
  only, not proof of final-stack validation.
- PR 13 repair/import is no longer missing. The repaired source-repo heads exist
  and passed the source-import gate with `63/63` focused CRDT tests, touched-file
  JS lint, and `git diff --check`.
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

Keep that spec out of PR 15, PR 6, PR 6A, PR 8, fallback-group evidence, and
any final branch claims unless it is deliberately copied into a clean evidence
worktree for the reload-hydration gate.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack has modified fuzz harness files and many untracked fuzz/analysis
scripts. It is useful active validation infrastructure, not the final PR stack.

The latest split persona is stricter about filing refs: only finalized
`final/rtc-pr*` heads should become PR heads after the branch-shape blockers are
resolved. Do not file or cite `finalize/*`, `deferred/*`,
`try/rtc-fix-stack-validation`, dirty worktrees, or the old aggregate PR 15 as
current PR heads. The `review/rtc-pr*` links in the tables below are the
branch-link-audit's verified PR-content links for this report, not proof that
those branches are ready to file without the remaining export/rebase and
shape-validation gates.

The old `fix/rtc-*` and most `shape/rtc-*` refs are source/provenance refs. PR
13 is the exception where the repaired source heads were used to push corrected
GitHub-facing review branches:

| Purpose | Review branch containing current PR content | Current SHA |
| --- | --- | --- |
| PR 13A observed-delete provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | `eddf2dd38c09` |
| PR 13B source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | `6ea7f425b009` |
| PR 13C identity-smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | `fa0f00a1c025` |

Ignore stale PR 13 refs such as
`shape/rtc-crdt-pr13a-cross-parent-source-retirement`,
`shape/rtc-crdt-pr13b-identity-smear-guard`, and
`shape/rtc-crdt-pr13d-explicit-base-source-retirement` when filing or reviewing
the CRDT series.

The older `review/rtc-pr13a-observed-delete-provenance`,
`review/rtc-pr13b-stale-block-identity-smear`, and
`review/rtc-pr13c-cross-parent-source-retirement` refs still exist but are not
current PR-content links for the repaired PR 13 split.

## Fuzz And Validation Status

Latest collected coverage-guided fuzz state:

```text
collected_at_utc: 2026-05-16T05:45:47Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T053837Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
raw novelty-status.md updated: 2026-05-16T05:45:34.215Z
```

The current monitor snapshot reports:

```text
coverage files: 24575
total records seen: 36207
records processed this pass: 34
new behavioral feature keys this pass: 5
new CDP coverage hashes this pass: 5
unmet goals: 11
current output-dir signatures: 0
current visible likely-real failures: 0
historical signatures: 16002
historical bootstrap stalls: 9717
headroom for adding groups: yes
load1: 47.03 on 64 cores
memory free: 421.0G
```

Current-output-dir triage is clean: one current triage root, zero signatures,
and zero visible likely-real failures. Current-run startup counters are not
clean, though: the monitor saw pre-action startup failures for
`persistence-no-title` and `real-user-editing`, plus one real-user summary-only
startup failure. Treat those as scheduling/quality signals, not product
failures. Historical triage remains noisy but reporting-only: `88` observed
prior roots, `16,002` signatures, `9,717` bootstrap stalls, and
`pre_action_bootstrap_stall` as the dominant family.

Enabled groups are `novelty-ws-common-blocks`, `novelty-ws-block-gauntlet`,
`novelty-ws-parser-transform`, `novelty-ws-media-cross-entity`, and
`novelty-http-persistence-probe`. Paused groups are
`novelty-ws-async-server-blocks`, `novelty-ws-real-user-editing`, and
`novelty-ws-real-user-rich-text`. The async-server pause is inside a 6-hour
current-run pre-action startup cooldown from `2026-05-16T05:34:55.975Z`; the
real-user pauses were triggered by current-run startup failures with no current
successful records.

Latest graph trend evidence:

```text
generated_at_utc: 2026-05-16T05:36:12Z
monitor passes: 1286
coverage files: 272 -> 24461
coverage files delta: 24189
unmet coverage goals: 24 -> 11
likely_real_max: 0
enabled groups current: novelty-http-persistence-probe,
  novelty-ws-block-gauntlet, novelty-ws-parser-transform,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text,
  novelty-ws-common-blocks, novelty-ws-media-cross-entity
goals_unmet: 11
pr_review_events: 280
pr_suggested_net_loc_latest_total: 11801
memory free: 422.7G
load: 50.12 / 51.19 / 52.06 on 64 cores
```

This supports longer-running coverage progress with no visible likely-real
product failures so far. It also shows remaining coverage depth gaps: the
largest unmet goals are CDP coverage records, real-user-editing successes,
`core/html`, `core/more`, heading shortcut, `core/details`, reload-post action,
`core/gallery`, body save/reload, `core/file`, and undo/redo paragraph. Treat
those as fuzz-depth gaps, not PR blockers by themselves. The graph packet and
current monitor snapshot are not final-stack validation results. The graph
packet predates the latest `05:45Z` monitor pauses, so use the current
`novelty-status.md` snapshot for live group enablement.

Completed validation evidence:

- PR 13 source-import gate:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260515T212143Z/jobs/outputs/pr13-source-import-verify-retry3-20260515T212143Z/report.md`
- That report records `63/63` focused stale top-level CRDT tests passing,
  touched-file JS lint passing, and `git diff --check` passing.
- Many individual branches have focused unit/PHPUnit/lint checks from the
  fix-planning summaries, but those checks must be rerun after the final
  export/rebase.

What remains before filing:

1. Export or recreate each intended PR branch on the intended upstream base.
2. Drop analysis-only artifacts and keep only product code plus focused tests.
3. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the rebased branch heads.
4. Rerun focused checks, touched-file lint, and `git diff --check` on every
   branch after rebase.
5. Assemble a fresh final combined validation stack from the actual PR heads.
6. Run final focused and coverage-guided fuzzing on that stack.
7. Block filing if new visible likely-real failures appear.

## Status-Persona Analysis

The completed status-report persona syntheses at
`20260516T035208Z-iter-1`, `20260516T035706Z-iter-2`,
`20260516T040218Z-iter-3`, and final analysis
`20260516T040744Z-final-analysis`, plus the split persona syntheses through
`pr-split-20260516T053120Z-synthesis`, agree that the split needs status
updates, not a redesign. Cycle 90 split the old aggregate PR 15 into
PR 15A/15B/15C, marked only `final/rtc-pr*` refs as PR-head candidates, and
marked PR 7A/7B, PR 8, PR 14, and PR 15A-C blocked/not filing-ready. The
`053120Z` split synthesis keeps that shape: the split is valid in concept, but
not filing-ready until a bounded branch-shape/evidence pass resolves PR 7A on
PR 6, then PR 7B, PR 14 after repaired PR 13C, and PR 15A -> PR 15B -> PR 15C
after PR 14.

- Replace stale 2026-05-15 coverage snapshots with the verified 2026-05-16
  trend packet, the current coverage root, and the nonempty current monitor
  snapshot.
- Say explicitly that current fuzz has `0` visible likely-real failures but is
  not final-stack validation.
- Separate current-run triage from historical triage noise.
- Remove stale language that PR 13 repair/import is still missing.
- Call out the dirty reload-hydration E2E spec as an evidence-contamination
  risk.
- Treat current `0` visible likely-real failures as health evidence only, not
  PR-filing evidence.
- Make the filing gates explicit: export/rebase, evidence cleanup, branch
  graph/containment, adjacent range-diffs/diffstats, focused post-rebase tests,
  lint, `git diff --check`, and fresh combined-stack validation.
- Do not add `PR 1A`, `PR 6B`, reload-hydration, pre-save collapse,
  rich-text suffix, malformed-save residuals, or HTTP room-isolation residuals
  to the split.
- The latest split persona recommends exactly one bounded branch-shape/evidence
  job, `rtc-final-branch-shape-blocked-prs-20260516T053120Z`, to produce branch
  graph, containment, adjacent `range-diff`, diffstat/numstat, focused tests,
  touched-file lint or `npm run lint:js`, and `git diff --check`. The latest
  feedback-action created the prompt/launcher and launched that single bounded
  job with initial output root
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T053120Z/jobs/outputs/rtc-final-branch-shape-blocked-prs-20260516T054134Z/`.
  Expected report path:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T053120Z/jobs/outputs/rtc-final-branch-shape-blocked-prs-*/report.md`.
  This updater did not launch a duplicate job.
- Do not launch new fuzz lanes, broad final-stack fuzzing, PR 13 repair/import,
  duplicate reload-hydration diagnostics, or another split-review loop from this
  updater. Existing coverage fuzz may continue, but final-stack fuzz still waits
  for resolved/rebased final branches.
- The final status-analysis report predates the current `05:36Z` trend packet.
  For group enablement and fuzz health, use `remote-status.md`,
  `latest-trend-evidence.md`, and the nonempty `novelty-status.md` snapshot in
  this report. The latest duplicate-noise synthesis at
  `duplicate-noise-20260516T052614Z-synthesis` changes no PR validation status;
  it keeps remaining control-plane hardening as a separate follow-up.

The latest duplicate/noise feedback-action completed the allowed-scope
novelty-monitor remediation on the remote fuzz checkout and restarted the active
coverage-guided monitor/supervisor path. Startup failure rates now use
`attempts = max(current-run behavioral records, strict startup failures)`, and
historical startup noise is only a scheduling prior when paired with fresh
current-run strict startup failures and zero current successes. That remote work
did not touch the triage watcher or analysis tier, so strict no-user/no-action
bootstrap/open/join stalls can still leak from runner summaries into triage and
analysis as queued `timeout` or `unknown` variants. Do not present the
monitor-only fix as PR validation or full browser-scheduling recovery; the
current monitor still has async-server and real-user groups paused from
current-run startup evidence/cooldowns.

The split-review analysis keeps this bounded manual action available for
reload-hydration evidence:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T021951Z/jobs/rtc-reload-hydration-checkpoint-diagnostics-next-action.md
```

Expected report if launched:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T021951Z/jobs/outputs/rtc-reload-hydration-checkpoint-diagnostics-20260516T021951Z/report.md
```

Do not auto-launch that job from this report update. Launch it only as an
explicit bounded evidence pass.

## Proposed PR Split

The review-unit split below is current; the old aggregate PR 15 is stale and is
replaced by PR 15A/15B/15C. The table uses the verified GitHub branch links
generated by the status-loop branch audit. Sizes are the audited compare deltas
for those links, not final post-rebase diffs.

| PR | Scope | Verified branch containing PR content | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified GitHub branch |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified GitHub branch |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified GitHub branch |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified GitHub branch |
| PR 5 | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | 4 | +1664 / -52 | split if reviewers prefer |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | does not claim browser-only gates |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | blocked on branch-shape conflict against PR 6 |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | stacked on PR 7A; blocked on branch-shape conflict against PR 6 |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | 11 | +618 / -61 | does not claim empty-live-editor; comparison/shape check required |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified GitHub branch |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | start CRDT stack |
| PR 11 | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | stacked on PR 10 |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified content branch; final export/rebase still required |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | corrected repaired review branch |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | corrected repaired review branch |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | corrected repaired review branch |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | blocked until replay/conflict after repaired PR 13C is resolved |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | ordered CRDT-stack integration required; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | ordered CRDT-stack integration required; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | ordered CRDT-stack integration required; keep reload-hydration gate spec out |

Largest review risks by size are PR 13B, PR 5, and PR 7A. PR 13 is deliberately
split into observed-delete provenance, source retirement, and identity-smear
protection so reviewers can evaluate each CRDT invariant separately.

## Verified Branch Links

The status loop now generates a branch-link audit and the report updater is
required to use only rows marked `verified-content`. The latest audit was
generated at `2026-05-16T05:45:53Z` from fetched `danluu` refs. A verified row
means the branch exists on `danluu` and has a non-empty diff against the listed
base.

| PR | Branch containing PR content | Compare | Files | Diff |
| --- | --- | --- | ---: | --- |
| PR 1 | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | [`review/rtc-shared-base-20260515...review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 |
| PR 2 | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | [`review/rtc-shared-base-20260515...review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 |
| PR 3 | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | [`review/rtc-shared-base-20260515...review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 |
| PR 4 | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | [`review/rtc-shared-base-20260515...review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 |
| PR 5 | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | [`review/rtc-shared-base-20260515...review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr05-parser-entity-normalization-equivalence) | 4 | +1664 / -52 |
| PR 6 | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | [`review/rtc-shared-base-20260515...review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 |
| PR 6A | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | [`review/rtc-shared-base-20260515...review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 |
| PR 7A | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | [`review/rtc-shared-base-20260515...review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 |
| PR 7B | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | [`review/rtc-pr07a-save-response-actions-guard...review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/compare/review/rtc-pr07a-save-response-actions-guard...review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 |
| PR 8 | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | [`review/rtc-shared-base-20260515...review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr08-title-reload-persisted-record) | 11 | +618 / -61 |
| PR 9 | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | [`review/rtc-shared-base-20260515...review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 |
| PR 10 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | [`review/rtc-shared-base-20260515...review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 |
| PR 11 | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | [`review/rtc-pr10-crdt-block-rebase-foundation...review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/compare/review/rtc-pr10-crdt-block-rebase-foundation...review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 |
| PR 12 | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | [`review/rtc-shared-base-20260515...review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 |
| PR 13A | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | [`shape/rtc-crdt-pr12-previous-local...review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/compare/shape/rtc-crdt-pr12-previous-local...review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 |
| PR 13B | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | [`review/rtc-pr13a-observed-delete-provenance-repaired...review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/compare/review/rtc-pr13a-observed-delete-provenance-repaired...review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 |
| PR 13C | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | [`review/rtc-pr13b-source-retirement...review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/compare/review/rtc-pr13b-source-retirement...review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 |
| PR 14 | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | [`review/rtc-shared-base-20260515...review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 |
| PR 15A | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | [`review/rtc-shared-base-20260515...review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 |
| PR 15B | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | [`review/rtc-shared-base-20260515...review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 |
| PR 15C | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | [`review/rtc-shared-base-20260515...review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/compare/review/rtc-shared-base-20260515...review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 |

Do not use these stale/misordered refs as PR-content links for repaired PR 13:
`review/rtc-pr13a-observed-delete-provenance`,
`review/rtc-pr13b-stale-block-identity-smear`, and
`review/rtc-pr13c-cross-parent-source-retirement`. The supporting provenance
base [`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the PR 13A compare link has the repaired source base.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393` | `product-evidence-inconclusive`; the `20260516T045945Z` deferred report keeps `deferred/rtc-reload-hydration-20260516T045945Z` at `72854f05ed2` only as a narrow saved-response hydration candidate and downscopes the broader empty-live claim because checkpoint diagnostics are still missing | One bounded checkpoint/phase diagnostics pass; classify as precondition/product-inconclusive if the checkpoint timeout repeats |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8` | evidence gate only; the latest split synthesis still keeps it out of the active PR split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split synthesis still keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred; possible `PR 6B`, not consensus | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1` | deferred; possible `PR 1A`, not consensus | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Current Recommendation

Do not file a single mega-PR and do not file the large stacked `*-stock-repro-pr`
branches as-is.

File order after export/rebase should be:

1. Small independent HTTP, revision, CRDT-save-meta, parser/entity, save-request,
   persisted-body, and lock-fairness fixes.
2. Save-response PR 7A/7B and title/reload PR 8 after the PR 6 branch-shape
   conflicts and PR 8 comparison/shape check are resolved.
3. The CRDT block reconciliation stack, with PR 13 reviewed only through the
   repaired source-verified 13A/13B/13C heads.
4. Table and fallback-group structural residuals after PR 14 replay, PR 15
   ordered-integration blockers, and evidence hygiene are clean.

Existing fuzz infrastructure can continue where healthy. The latest collection
selected `run-20260516T053837Z` as the coverage root. The current monitor
snapshot reports `24,575` coverage files, `36,207` total records, `11` unmet
goals, five enabled groups, `novelty-ws-async-server-blocks`,
`novelty-ws-real-user-editing`, and `novelty-ws-real-user-rich-text` paused
from current-run startup evidence/cooldowns, and `0` current visible
likely-real failures. The trend packet shows coverage growth to `24,461` files
and `likely_real_max: 0`; that is health evidence only, not broad final-stack
coverage or PR-filing validation.

The next concrete branch action is to consume the bounded branch-shape/evidence
job output for PR 7A/7B, PR 14, and PR 15A/15B/15C once present, or run that
single intended job if it was not actually started. Do not start new fuzz lanes,
broad final-stack fuzzing, PR 13 repair/import, duplicate reload-hydration
harness work, or another split-review loop from this status update.
