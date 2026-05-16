# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T07:13:57Z`

Trigger event:
`pr-split-2026-05-16T07-13-03Z-20260516T070609Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Base handoff:
`docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md`

## Executive Status

The latest split synthesis, `pr-split-20260516T070609Z-synthesis`, changes the
working split and still keeps the stack blocked rather than filing-ready.
Current aggregate `PR 5` is now too broad to preserve. Replace it with:

- `PR 5A`: entity/entity-reference normalization in `crdt.ts`
  (`f39c621c90d` plus `589226af0fe`).
- `PR 5B`: parser/rich-text HTML equivalence in `crdt-blocks.ts`
  (`1a78db8d4ab`).
- `PR 5C`: preserve-whitespace linebreak equivalence (`a517f83913c`), stacked
  after PR 5B because it extends the same helper path.

Keep the already repaired and reviewed split shape for PR 7A/7B, PR 13A/13B/13C,
and PR 15A/15B/15C. Do not import or file by wildcard `final/rtc-pr*`: the
latest synthesis reports that `final/rtc-pr06b-save-snapshot-noop-guard` exists,
but it is blocked and must be excluded from filing-ready heads unless a focused
replay later proves it.

Current blockers:

1. Run one corrected import/rebase/check pass from
   `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T063020Z/jobs/rtc-final-refs-import-rebase-next-action.prompt.md`.
2. Source repaired heads from the latest finalization worktree:
   `/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/worktrees/pr-stack-20260516T065952Z`.
3. Use an explicit final-ref allow-list; do not wildcard-import blocked
   candidates such as `final/rtc-pr06b-*`.
4. Produce or adjudicate the new PR 5A/5B/5C branches and branch links.
5. Resolve PR 8 against `origin/try/rtc-title-reload-pr`.
6. Rebase or recreate each intended head on the upstream target base.
7. Rerun focused checks, touched-file lint, and `git diff --check`.
8. Build and fuzz a fresh combined validation stack from the rebased final
   heads.

Background coverage-guided fuzzing is healthy but is not final-stack
validation. The latest novelty monitor snapshot reports `0` visible likely-real
failures, `10` unmet goals, `7` enabled WS groups, and
`novelty-ws-parser-transform` paused in a strict 6-hour pre-action startup
cooldown.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T07:13:51Z`.

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

The branch-link audit was generated at `2026-05-16T07:13:57Z` from fetched
`danluu` refs. The proposed PR table below uses only audit rows marked
`verified-content` as PR-content links. For PR 5A/5B/5C, no verified branch
links exist yet, so those rows explicitly say `No verified branch link yet`.

PR 13 must use the repaired review refs from the audit:

| Purpose | Verified branch containing current PR content | Current SHA |
| --- | --- | --- |
| PR 13A observed-delete provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | `eddf2dd38c09` |
| PR 13B source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | `6ea7f425b009` |
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
collected_at_utc: 2026-05-16T07:13:51Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T064057Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
novelty-status.md: populated at 2026-05-16T07:12:34.534Z
current visible likely-real signatures: 0
enabled groups: 7 WS groups
paused groups: novelty-ws-parser-transform in 6h startup cooldown
```

Current novelty monitor snapshot:

```text
coverage files: 25878
total records seen: 38067
records processed this pass: 58
coverage lines seen this pass: 39240
summary files read this pass: 7
summary startup failures processed this pass: 0
unmet goals: 10
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
load1: 82.87 / 64 cores
memory: 421.5G free / 492.0G total
```

Enabled groups:

- `novelty-ws-common-blocks`
- `novelty-ws-block-gauntlet`
- `novelty-ws-real-user-editing`
- `novelty-ws-real-user-rich-text`
- `novelty-ws-async-server-blocks`
- `novelty-ws-media-cross-entity`
- `novelty-ws-long-session-large-doc`

Paused recommended group:

- `novelty-ws-parser-transform`: strict pre-action startup cooldown from
  `2026-05-16T05:00:22.923Z` after `2/2` pre-action WS discovery/startup
  failures.

Current-run triage remains clean: `0` raw signatures, `0` actionable
signatures, `0` likely-real visible, `0` likely-real merged duplicates, and
current duplicate share `0`. Historical triage is still noisy but separated
from current-run product health: `17180` raw signatures, `6649` actionable
signatures, `10531` suppressed known-noise signatures, and `10505` bootstrap
stalls, with `pre_action_bootstrap_stall` dominating raw historical signatures.

The trend evidence packet was generated at `2026-05-16T07:03:32Z` from monitor
data through `2026-05-16T07:01:39Z`. It supports longer-running coverage
progress with no visible likely-real failures so far:

```text
monitor passes: 1331
coverage files: 272 -> 25680
coverage files delta: 25408
unmet coverage goals: 24 -> 10
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3993
summary_startup_failures_last: 0
pr_review_events: 9694
pr_suggested_net_loc_latest_total: 11801
```

The largest unmet fuzz-depth goals remain CDP coverage records,
real-user-editing success count, `core/html`, `core/more`, `core/details`,
heading shortcuts, reload-post actions, `core/gallery`, body save/reload, and
`core/file`. Treat these as fuzz-depth gaps, not as proof of final-stack
readiness or product failure.

Completed validation evidence:

- PR 13 source-import gate:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260515T212143Z/jobs/outputs/pr13-source-import-verify-retry3-20260515T212143Z/report.md`
- That report records `63/63` focused stale top-level CRDT tests passing,
  touched-file JS lint passing, and `git diff --check` passing.
- The latest split synthesis keeps PR 7A/7B, PR 13A/13B/13C, and
  PR 15A/15B/15C as repaired split shapes, but the final heads still need the
  corrected import/rebase/check pass from `pr-stack-20260516T065952Z`.

What remains before filing:

1. Import or fetch the explicitly allowed repaired final heads if the queue
   audit still finds gaps.
2. Create or verify PR 5A/5B/5C and refresh verified branch links after push.
3. Exclude `final/rtc-pr06b-*` from filing-ready heads until a focused replay
   proves it.
4. Run the bounded PR 8 title-reload comparison against
   `origin/try/rtc-title-reload-pr`.
5. Rebase or recreate each intended PR branch on the intended upstream base.
6. Drop analysis-only artifacts and keep only product code plus focused tests.
7. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the rebased branch heads.
8. Rerun focused checks, touched-file lint, and `git diff --check` on every
   branch after rebase.
9. Assemble a fresh final combined validation stack from the actual PR heads.
10. Run final focused checks and coverage-guided fuzzing on that stack.
11. Block filing if new visible likely-real failures appear.

## Status-Persona Analysis

Completed status-analysis reports through
`final-20260516T040744Z-final-analysis` agree on the report shape: remove stale
PR 13 repair-missing language, separate current-run fuzz health from historical
noise, keep evidence-only families out of the split, and make filing gates
explicit. Earlier status-analysis warned not to claim corrected PR 13 GitHub
links until the repaired refs were pushed; the current `branch-link-audit.md`
now verifies the repaired PR 13 review refs, so this report uses those repaired
audit links.

The newest split persona synthesis is `pr-split-20260516T070609Z-synthesis`.
It says:

- The split needs a targeted change and is still not filing-ready.
- Replace the old aggregate PR 5 with PR 5A/5B/5C.
- Keep PR 7A/7B, PR 13A/13B/13C, and PR 15A/15B/15C.
- Use the latest finalization worktree
  `/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/worktrees/pr-stack-20260516T065952Z`.
- Import/rebase/check by explicit final-ref allow-list; exclude
  `final/rtc-pr06b-*` from filing-ready heads.
- Keep PR 8 blocked pending comparison with `origin/try/rtc-title-reload-pr`.
- Keep PR 1A, reload-hydration empty-live-editor, pre-save search/live-collapse,
  broad rich-text suffix corruption, malformed-save residuals beyond isolated
  PR 6B evidence, and HTTP room-isolation residuals deferred or evidence-only.
- Do not start broad fuzzing or final-stack fuzzing until the rebased final
  stack exists.

The newest duplicate-noise synthesis,
`duplicate-noise-20260516T065434Z-synthesis.md`, changes no product PR
validation status. It identifies the remaining control-plane leak as strict
zero-user pre-action bootstrap/open/join startup noise that can still reach
`rtc-browser-fuzz-triage-watcher.mjs` and
`rtc-browser-fuzz-analysis-tier.mjs`. The paired feedback action changed
startup-failure cross-run carryover in `rtc-browser-fuzz-novelty-monitor.mjs`
from `15` minutes to the full configured `STARTUP_FAILURE_COOLDOWN_HOURS`
window, passed `node --check bin/rtc-browser-fuzz-novelty-monitor.mjs`, and
restarted only the active coverage-guided novelty monitor. It did not change
product PR readiness.

## Proposed PR Split

The old aggregate PR 15 is stale. Use PR 15A/15B/15C. The old aggregate PR 5 is
also stale. Use PR 5A/5B/5C if the import/rebase/check pass can produce clean
audited branches. The table below includes only verified `branch-link-audit.md`
PR-content links, or explicitly says `No verified branch link yet`.

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
| PR 5A | Entity/entity-reference normalization in `crdt.ts` | No verified branch link yet | pending split audit | pending split audit | replacement for old PR 5; adjudicate from `f39c621c90d` plus `589226af0fe` |
| PR 5B | Parser/rich-text HTML equivalence in `crdt-blocks.ts` | No verified branch link yet | pending split audit | pending split audit | replacement for old PR 5; adjudicate from `1a78db8d4ab` |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | pending split audit | pending split audit | replacement for old PR 5; adjudicate from `a517f83913c`, stacked after PR 5B |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | does not claim browser-only gates, PR 6B, or malformed-save residuals beyond audited scope |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | repaired final head expected; import/push/rebase/link refresh still required |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | repaired final head expected; stacked after PR 7A |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | 11 | +618 / -61 | blocked on `origin/try/rtc-title-reload-pr` comparison; must not claim empty-live-editor coverage |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified GitHub branch; final rebase/checks still required |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | start CRDT stack |
| PR 11 | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | stacked on PR 10 |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified content branch; final export/rebase still required |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | corrected repaired review branch; starts after PR 12 |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | corrected repaired review branch |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | corrected repaired review branch |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | repaired final head expected after PR 13C; import/push/rebase/link refresh still required |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | repaired final head expected; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | repaired final head expected; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | repaired final head expected; keep reload-hydration gate spec out |

The current large PR 5 audit branch,
[`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence),
is still a verified content link for the old grouping (`4` files,
`+1664 / -52`), but it is no longer the recommended maintainer-facing split.
Use it only as prior art unless the PR 5A/5B/5C adjudication fails.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR 6B save snapshot/no-op guard candidate | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | blocked candidate, not part of filing-ready split; exclude from wildcard final-ref import and from PR 6 claims | After import/rebase, run a bounded focused `ws-parser-transform` replay; pass condition is no duplicated content marker at `save-checkpoint-persisted-crdt-projection`; drop PR 6B if replay fails |
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

1. Small independent HTTP, revision, CRDT-save-meta, save-request,
   persisted-body, and lock-fairness fixes, plus PR 5A/5B/5C if the replacement
   split produces clean audited branches.
2. Save-response PR 7A/7B from repaired final heads after
   import/push/rebase/link refresh.
3. PR 8 only after the bounded title-reload comparison confirms its changed
   files and claims.
4. The CRDT block reconciliation stack, with PR 13 reviewed only through the
   repaired 13A/13B/13C refs.
5. Table and fallback-group structural residuals from repaired final heads
   after evidence hygiene is clean.

Existing fuzz infrastructure can continue where healthy. The current populated
novelty snapshot has `0` visible likely-real failures, `10` unmet goals, `7`
enabled WS groups, and `novelty-ws-parser-transform` paused in the strict
startup cooldown, but none of this is broad final-stack coverage or PR-filing
validation. Do not start broad final-stack fuzzing until the rebased combined
stack exists. Do not start duplicate finalization, another PR 13 repair/import,
another split-review loop, or open-ended control-plane jobs from this status
update.
