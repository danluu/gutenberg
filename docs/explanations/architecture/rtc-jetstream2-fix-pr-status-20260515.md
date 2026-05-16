# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T04:21:35Z`

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
review/persona loop has continued since then. Its latest completed reports keep
the same split and do not recommend another redesign.

Current state:

- The split is reviewable, but it is not final-file-ready.
- The remaining filing blockers are export/rebase, evidence cleanup, branch
  graph/containment evidence, adjacent range-diffs/diffstats, focused
  post-rebase checks, and a fresh final combined-stack validation run.
- Current coverage-guided fuzzing still reports `0` visible likely-real
  failures, but this is health evidence only. It is not running against a final
  rebased PR stack and must not be treated as PR-filing or final-stack
  validation.
- The earlier historical-noise scheduling problem has been remediated enough for
  browser groups to run again: the latest `04:20Z` raw monitor status shows WS
  browser groups enabled, no paused groups, and a small amount of current-run WS
  coverage. Treat this as active monitor recovery, not proof of final-stack
  validation.
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

The old `fix/rtc-*` and `shape/rtc-*` refs are source/provenance refs. The most
important PR 13 source refs are:

| Purpose | Ref | Current SHA |
| --- | --- | --- |
| PR 13A observed-delete provenance | `shape/rtc-crdt-pr13a-observed-delete-provenance` | `eddf2dd38c0` |
| PR 13B source retirement | `shape/rtc-crdt-pr13b-source-retirement` | `6ea7f425b00` |
| PR 13C identity-smear guard | `shape/rtc-crdt-pr13c-stale-block-identity-smear-guard` | `fa0f00a1c02` |

Ignore stale PR 13 refs such as
`shape/rtc-crdt-pr13a-cross-parent-source-retirement`,
`shape/rtc-crdt-pr13b-identity-smear-guard`, and
`shape/rtc-crdt-pr13d-explicit-base-source-retirement` when filing or reviewing
the CRDT series.

Previously pushed `review/rtc-*` compare refs exist as GitHub-facing review
attempts, but the latest status-persona analysis warns that the PR 13 compare
refs may be stale or misordered. Do not claim the PR 13 GitHub compare links are
corrected until those review refs are repushed or explicitly qualified against
the repaired source heads above.

## Fuzz And Validation Status

Latest durable coverage-guided novelty state:

```text
updated: 2026-05-16T04:20:37.959Z
output dir: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T041738Z
coverage files: 23619
total records seen: 34875
current-run records by profile: {"block-gauntlet":1,"common-blocks":1,"parser-transform":1}
current-run successful records by profile: {"common-blocks":1,"parser-transform":1}
current-run records by transport: {"ws":3}
unmet goals: 13
likely-real visible: 0
likely-real merged duplicates: 0
oracle/noise questions: 0
headroom for adding groups: no
enabled groups: novelty-ws-common-blocks, novelty-ws-block-gauntlet,
  novelty-ws-parser-transform, novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text, novelty-ws-async-server-blocks,
  novelty-ws-media-cross-entity, novelty-http-persistence-probe
paused groups: none
health: ok
```

Current-run triage is clean, and the latest raw status shows browser scheduling
recovered after the earlier historical-noise hold:

- Current-run triage has `0` signatures, `0` bootstrap stalls, and `0`
  likely-real visible failures.
- Historical triage has `14899` signatures, including `8704`
  `pre_action_bootstrap_stall` signatures and `8931` bootstrap stalls. That
  historical signal remains reporting/advisory only and must not be presented as
  a current product failure.
- The duplicate/noise remediation changed the novelty monitor so historical
  known-noise no longer pauses browser groups, stale historical holds are
  cleared, startup cooldown checks are scoped to the current output dir, and
  new pause records include the output dir.
- Validation for that narrow remediation included
  `node --check bin/rtc-browser-fuzz-novelty-monitor.mjs`. The persona report
  also recommended triage-watcher and analysis-tier backstops, but those were
  not part of the completed remediation.
- The active run has begun producing current-run WS records, but only `3`
  current-run records are visible in this snapshot, so do not claim broad fresh
  WS coverage yet.

The collector also captured this monitor sequence:

```text
2026-05-16T04:14:41Z enabled WS groups for real-user, block,
  common-block, parser-transform, async-server, and media coverage
2026-05-16T04:17:49Z reset-run-local-noise-state and moved the active
  output dir to run-20260516T041738Z while preserving coverage counters
2026-05-16T04:18:37Z rebuilt startup/quality counters from current-run
  behavioral coverage and restarted rtc-coverage-guided-supervisor
```

This supersedes the earlier "only HTTP enabled" state. It does not supersede the
final-stack-validation blocker, and it does not prove broad current-run WS
coverage from only the first few current-run records.

Latest graph trend evidence:

```text
generated_at_utc: 2026-05-16T04:14:52Z
monitor passes: 1243
coverage files: 272 -> 23556
unmet coverage goals: 24 -> 13
likely_real_max: 0
enabled groups current at graph time: novelty-http-persistence-probe,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text,
  novelty-ws-block-gauntlet, novelty-ws-common-blocks,
  novelty-ws-parser-transform, novelty-ws-async-server-blocks,
  novelty-ws-media-cross-entity
memory free: 431.7G
```

This supports longer-running coverage progress with no visible likely-real
product failures so far. Use the newer raw novelty status above for exact
current counts, and do not treat either source as broad final-stack validation.

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
`20260516T040744Z-final-analysis`, plus the latest split persona synthesis
`pr-split-20260516T041505Z-synthesis`, agree on these report updates:

- Replace stale 2026-05-15 coverage snapshots with the verified 2026-05-16
  novelty monitor status, using a compact timestamped snapshot because exact
  counts differ by read time.
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
- Launch no automatic follow-up jobs from this status update.
- The latest split persona still finds no structural split redesign. Its
  proposed next reload-hydration checkpoint diagnostics remain a manual,
  explicitly authorized evidence pass, not an updater-launched job.
- The final status-analysis report predates the `04:20Z` raw monitor pass. For
  group enablement and current monitor health, use the newer raw novelty status
  in this report.

The latest duplicate/noise persona synthesis completed the narrow
monitor-scheduling remediation: historical `pre_action_bootstrap_stall` noise
is now advisory/reporting-only for browser group scheduling, stale historical
holds are cleared, and the active monitor shows WS groups enabled with no paused
groups. Remaining optional hardening is the previously recommended
triage-watcher and analysis-tier backstop work; do not treat it as a blocker for
this status update.

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

The split remains stable. The table below is the current review plan, using the
Jetstream2 source refs and intended review units. Sizes are the source-repo
review deltas recorded in the split artifacts, not final post-rebase diffs.

| PR | Scope | Branches | Files | Diff | Current status |
| --- | --- | ---: | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | 1 | 2 | +181 / -19 | fix branch exists |
| PR 2 | HTTP polling storage read window | 1 | 2 | +57 / -5 | fix branch exists |
| PR 3 | Revision restore CRDT meta reset | 1 | 2 | +58 / -5 | fix branch exists |
| PR 4 | Persisted CRDT save-meta idempotence | 1 | 2 | +160 / -1 | fix branch exists |
| PR 5 | Parser/entity normalization equivalence | 4 | 4 | +1680 / -68 | split if reviewers prefer |
| PR 6 | Save request payload guards | 3 | 4 | +738 / -6 | does not claim browser-only gates |
| PR 6A | Persisted empty-content CRDT body guard | 1 | 2 | +64 / -1 | narrow persisted-body guard |
| PR 7A | Save response entity-state guards | 1 | 2 | +1339 / -8 | actions-side response guard |
| PR 7B | Save response manager/base-record guards | 1 | 5 | +404 / -8 | stacked on PR 7A |
| PR 8 | Reload title and persisted-record hydration | 1 | 11 | +618 / -61 | compare with `try/rtc-title-reload-pr`; does not claim empty-live-editor |
| PR 9 | Core-data lock fairness | 1 | 2 | +185 / -2 | fix branch exists |
| PR 10 | CRDT block reconciliation foundation | 1 | 2 | +145 / -4 | start CRDT stack |
| PR 11 | Explicit-base top-level block operations | 5 | 2 | +1190 / -16 | stacked CRDT review unit |
| PR 12 | Previous-local-cache top-level block operations | 3 | 2 | +833 / -6 | stacked CRDT review unit |
| PR 13A | Observed-delete top-level provenance | 1 | 2 | +1171 / -21 | repaired/source-verified head exists |
| PR 13B | Cross-parent source retirement | 3 | 2 | +1687 / -0 | repaired/source-verified head exists |
| PR 13C | Stale block identity smear guard | 1 | 2 | +470 / -39 | repaired/source-verified head exists |
| PR 14 | Table body nested array merge | 1 | 2 | +294 / -18 | fix branch exists |
| PR 15 | Fallback group residual structural fixes | 3 | 2 | +481 / -12 | keep reload-hydration gate spec out |

Largest review risks by size are PR 13B, PR 5, and PR 7A. PR 13 is deliberately
split into observed-delete provenance, source retirement, and identity-smear
protection so reviewers can evaluate each CRDT invariant separately.

## Branch Mapping

Small independent branches:

```text
fix/rtc-http-polling-generated-update-size
fix/rtc-http-polling-storage-read-window
fix/rtc-revision-restore-crdt-reset
fix/rtc-crdt-save-meta-churn
fix/rtc-entity-normalization-save-loop
fix/rtc-entity-reference-normalization
fix/rtc-parser-entity-block-equivalence
fix/rtc-preserve-whitespace-linebreak-equivalence
fix/rtc-empty-content-crdt-guard
fix/rtc-stale-save-crdt-raw-fields
fix/rtc-save-projection-content-guard
fix/rtc-persisted-empty-content-guard
fix/rtc-store-lock-fairness
```

Save-response and reload/title branches:

```text
shape/rtc-save-response-actions-guard
shape/rtc-save-response-manager-base-record
fix/rtc-title-reload-persisted-record
```

CRDT block reconciliation stack:

```text
fix/rtc-crdt-block-rebase
fix/rtc-stale-base-record-block-append
fix/rtc-stale-base-block-delete
fix/rtc-stale-base-block-middle-insert
fix/rtc-stale-top-level-move-reorder
fix/rtc-top-level-insert-anchor-after-delete
fix/rtc-previous-local-cache-block-delete
fix/rtc-previous-local-cache-block-reorder
fix/rtc-previous-local-cache-delete-reorder
shape/rtc-crdt-pr13a-observed-delete-provenance
shape/rtc-crdt-pr13b-source-retirement
shape/rtc-crdt-pr13c-stale-block-identity-smear-guard
fix/rtc-table-body-array-stale-local-merge
fix/rtc-fallback-group-move-stale-reorder
fix/rtc-fallback-group-insert-anchor-stale-local
fix/rtc-fallback-group-delete-stale-local
```

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393` | `product-evidence-inconclusive`; corrected Cycle 50 harness passed collaboration readiness but failed before the post-reload assertion at the post-`saveCheckpoint()` convergence wait | One bounded checkpoint/phase diagnostics pass; classify as precondition/product-inconclusive if the checkpoint timeout repeats |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8` | evidence gate only | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; focused local repro did not fail | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred; possible `PR 6B`, not consensus | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1` | deferred; possible `PR 1A`, not consensus | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Current Recommendation

Do not file a single mega-PR and do not file the large stacked `*-stock-repro-pr`
branches as-is.

File order after export/rebase should be:

1. Small independent HTTP, revision, CRDT-save-meta, parser/entity, save-request,
   persisted-body, and lock-fairness fixes.
2. Save-response PR 7A/7B and title/reload PR 8.
3. The CRDT block reconciliation stack, with PR 13 reviewed only through the
   repaired source-verified 13A/13B/13C heads.
4. Table and fallback-group structural residuals after evidence hygiene is
   clean.

Existing fuzz infrastructure can continue where healthy. The active
`run-20260516T041738Z` has started to emit current-run WS coverage, but the
snapshot still shows only `3` current-run records, so do not present it as broad
fresh coverage or final-stack validation. Do not start new fuzz lanes, broad
final-stack fuzzing, PR 13 repair/import, gate shaping, duplicate
reload-hydration harness work, or another split-review loop from this status
update.
