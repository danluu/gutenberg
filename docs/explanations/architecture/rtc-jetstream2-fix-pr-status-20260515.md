# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T10:09:11Z`

Trigger event:
`duplicate-noise-2026-05-16T10-03-47Z-30`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Base handoff:
`docs/explanations/architecture/rtc-likely-real-bug-handoff-20260514.md`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-16T10-03-47Z-30/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The plan is still filing-blocked. The latest split-persona synthesis,
`pr-split-20260516T095712Z-synthesis.md`, keeps most of the current split but
adds one required replacement: do not file aggregate PR 11. Split it into
PR 11A-E for explicit-base append, delete, middle insert, top-level
move/reorder, and delete-plus-insert anchor behavior.

The latest duplicate-noise action pass completed a control-plane change in the
fuzz validation repo: `rtc-browser-fuzz-novelty-monitor.mjs` now holds
high-noise WebSocket expansion while current-run startup noise dominates. That
action passed `node --check`, passed one gate-only monitor pass, restarted the
coverage-guided loop on `run-20260516T095910Z`, and left only the HTTP canary
enabled in the latest monitor snapshot. It does not change product PR status
and does not fix triage-watcher duplicate ingestion, which remained outside
that action's edit set.

Current filing blockers:

- PR 6B remains blocked on the focused replay job
  `rtc-pr06b-ws-parser-transform-replay-5500001-5500002-5500006-20260516T095229Z`.
  The latest synthesis reports that the tmux session is active and its
  `report.md` is still zero bytes. If it exits empty, rerun that exact job once;
  if marker duplication reproduces or no usable oracle is produced, drop PR 6B.
- PR 11A-E need a bounded split-shaping/check job before maintainer filing.
  The current audit still verifies only aggregate PR 11, so the proposed
  PR 11A-E rows below intentionally say `No verified branch link yet`.
- Broad PR 8 remains replaced by a narrow PR 8A title-reload branch; the
  broader persisted-record hydration work stays deferred.
- Broad final-stack fuzzing is premature until the final filing branches are
  shaped, rebased, checked, and assembled into a fresh validation stack.

Current completed branch-link audit status:

- All currently audited review rows are fetched from `danluu` refs and marked
  `verified-content` in the `2026-05-16T10:09:11Z` audit.
- For PR 13, use only the repaired review refs from the audit:
  `review/rtc-pr13a-observed-delete-provenance-repaired`,
  `review/rtc-pr13b-source-retirement`, and
  `review/rtc-pr13c-stale-block-identity-smear-guard`.
- Do not link the stale or misordered PR 13 refs listed under
  "Explicitly Not PR-Content Links" as current PR content.

Deferred/evidence-only work remains outside the filing split: reload-hydration
empty-live-editor, pre-save search/live-collapse, rich-text formatted suffix
corruption, broader malformed-save/save-settlement residuals, and HTTP polling
room-isolation residuals.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T10:09:06Z`.

The fix-planning repo is currently checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 15A/15B/15C, PR 6, PR 6A, PR 8A, fallback-group
evidence, and any final branch claim unless it is deliberately copied into a
clean evidence worktree for the reload-hydration gate.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack still has modified product/test files plus many untracked fuzz,
analysis, and documentation artifacts. It is active validation infrastructure,
not the final PR stack.

The branch-link audit was generated at `2026-05-16T10:09:11Z` from fetched
`danluu` refs. Use only rows marked `verified-content` as PR-content links.

Current repaired PR 13 audit refs:

| Purpose | Verified branch containing audited content | Current SHA | Status |
| --- | --- | --- | --- |
| PR 13A observed-delete provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | `eddf2dd38c09` | repaired audit link; use this for PR 13A review content |
| PR 13B source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | `6ea7f425b009` | repaired audit link; replaces stale/misordered PR 13B links |
| PR 13C stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | `fa0f00a1c025` | repaired audit link; replaces stale/misordered PR 13C links |

Do not use these stale or misordered refs as PR-content links for repaired
PR 13:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the repaired PR 13A compare link has the source base.

## Proposed PR Split

This table is the current working split. Every proposed row either uses a
clickable branch link from the `verified-content` branch-link audit or
explicitly says `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; final rebase/checks still required |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; final rebase/checks still required |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; final rebase/checks still required |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; final rebase/checks still required |
| PR 5A | Entity/entity-reference normalization in `crdt.ts` | No verified branch link yet | 2 | TBD | accepted replacement for old aggregate PR 5; needs reviewed branch audit |
| PR 5B | Parser/rich-text HTML equivalence in `crdt-blocks.ts` | No verified branch link yet | 2 | TBD | accepted replacement for old aggregate PR 5; needs reviewed branch audit |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | TBD | accepted replacement for old aggregate PR 5; needs reviewed branch audit |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified scope does not include PR 6B or broader malformed-save residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | accepted split; final filing refresh still required |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | stacked after PR 7A; final filing refresh still required |
| PR 8A | Narrow reload-title prior-art path | No verified branch link yet | TBD | TBD | replace broad PR 8; broader persisted-record hydration remains deferred |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; final rebase/checks still required |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | start CRDT stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; split-shaping/check job required |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; split-shaping/check job required |
| PR 11C | Explicit-base middle insert | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; split-shaping/check job required |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; split-shaping/check job required |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; split-shaping/check job required |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; final export/rebase still required |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; do not use stale PR 13A ref |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; do not use stale/misordered PR 13B ref |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; do not use stale/misordered PR 13C ref |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; final rebase/checks still required |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |

Old verified branches that are now prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  remains a verified content link for old aggregate PR 5 (`4` files,
  `+1664 / -52`), but not the recommended maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  remains a verified content link for old broad PR 8 (`11` files,
  `+618 / -61`), but not the active PR 8A shape.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  remains a verified content link for old aggregate PR 11 (`2` files,
  `+1145 / -4`), but the latest split-persona synthesis recommends replacing
  it with PR 11A-E.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T10:09:06Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T095910Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest novelty monitor snapshot:

```text
updated: 2026-05-16T10:08:56.635Z
coverage files: 29108
total records seen: 42673
records processed this pass: 56
coverage lines seen this pass: 44201
summary startup failures processed this pass: 8
new behavioral feature keys this pass: 0
new CDP coverage hashes this pass: 0
unmet goals: 8
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
load1: 76.46 / 64 cores
memory: 424.0G free / 492.0G total
headroom for adding groups: no
```

Enabled coverage-guided groups in the latest monitor snapshot:

- `novelty-http-persistence-probe`

High-noise WS expansion is currently held while current-run triage is immature
and then while current-run triage is dominated by strict startup known-noise.
The held recommended groups are `novelty-ws-real-user-editing`,
`novelty-ws-real-user-rich-text`, `novelty-ws-block-gauntlet`,
`novelty-ws-common-blocks`, `novelty-ws-parser-transform`,
`novelty-ws-async-server-blocks`, `novelty-ws-media-cross-entity`, and
`novelty-ws-long-session-large-doc`. The latest monitor has paused or rotated
out all WS groups, including `novelty-ws-lifecycle` and
`novelty-ws-persistence-no-title`; only the HTTP canary remains enabled.

Current-run triage has begun to accumulate signatures, but still has no visible
likely-real signal and is known-noise dominated:

```text
current output dir scope:
triage roots: 1
triage state files: 1
signatures: 14
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
normalization-noise candidates: 0
bootstrap stalls: 10
known-noise signatures: 6
top duplicate family share: 0.7143
top semantic family: pre_action_bootstrap_stall
```

Historical and external live triage remain reporting/advisory unless
current-run evidence confirms product failures:

```text
closed historical scope:
triage roots: 101
triage state files: 158
signatures: 9460
bootstrap stalls: 4364
top duplicate family share: 0.4613
top semantic family: pre_action_bootstrap_stall

external live sidecar scope:
triage roots: 3
triage state files: 103
signatures: 10825
bootstrap stalls: 7799
top duplicate family share: 0.7205
top semantic family: pre_action_bootstrap_stall

combined reporting scope:
triage roots: 105
triage state files: 262
signatures: 20308
bootstrap stalls: 12179
top duplicate family share: 0.5997
top semantic family: pre_action_bootstrap_stall
```

Largest current unmet goals:

- CDP coverage records: `4559/5000`
- successful real-user-editing records: `267/500`
- `core/html`: `338/500`
- `core/details`: `373/500`
- `core/more`: `377/500`
- `ui-heading-shortcut`: `436/500`
- `reload-post-action`: `448/500`
- `core/gallery`: `492/500`

The trend evidence packet was generated at `2026-05-16T10:02:51Z` from monitor
data through `2026-05-16T10:02:21Z`, before the latest `10:08:56Z`
current-run group hold.
Use it for trend interpretation, not current enabled-group membership:

```text
monitor passes: 1418
coverage files: 272 -> 29014
coverage files delta: 28742
unmet coverage goals: 24 -> 8
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.4613
summary_startup_failures_last: 4
quality_issues_last: 0
fuzz level mix: browser-e2e=27 lanes/27 groups; transport-integration=1 lane/1 group
```

This fuzz status is health and coverage-depth evidence for active validation
infrastructure. It is not final-stack validation and does not make the PR split
filing-ready.

## Status-Persona Analysis

Completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` are still useful for report hygiene:
separate current-run fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older PR 13
review-link warning is superseded by the `10:09:11Z` branch-link audit, which
now verifies the repaired PR 13 review refs.

The newest completed split-persona synthesis is
`pr-split-20260516T095712Z-synthesis.md`. It says:

- The project is still filing-blocked.
- Keep `PR 5A/5B/5C`; do not resurrect aggregate PR 5.
- Replace broad PR 8 with narrow PR 8A from `origin/try/rtc-title-reload-pr`.
- Exclude PR 6B from filing unless the active focused replay passes cleanly.
- Do not file old aggregate PR 13B, old separate PR 13C, Cycle 110 red
  PR 13 refs, broad PR 8, PR 6C, or wildcard `final/rtc-pr*`.
- Split aggregate PR 11 into PR 11A-E.
- Do not start new fuzz lanes, duplicate PR 6B work, PR 13 repair work,
  reload diagnostics, another split-review loop, or final-stack fuzz while the
  PR 6B replay is unresolved.

The newest completed duplicate-noise synthesis and action are
`duplicate-noise-20260516T094506Z-synthesis.md` and
`duplicate-noise-20260516T094506Z-feedback-action.md`. They change no product
PR validation status. The synthesis identifies a control-loop leak: strict
pre-action bootstrap/startup stalls were being ingested as many distinct
signatures, and the novelty monitor could re-enable noisy WS groups before
current-run triage/startup counters matured.

The action pass completed the novelty-monitor side of that remediation:

- `bin/rtc-browser-fuzz-novelty-monitor.mjs` now holds high-noise WS expansion
  groups while current-run startup noise dominates, filters coverage-guidance
  recommendations through that hold, preserves same-run startup evidence on
  re-enable, fixes startup-failure rates to include summary-only startup
  attempts, and avoids collapsing literal `unknown` when a better
  family/hash is available.
- Validation passed with
  `node --check bin/rtc-browser-fuzz-novelty-monitor.mjs` and a one-shot
  monitor pass with supervisor/Codex disabled; artifacts were written under
  `/media/volume/danluu-fuzz-data/rtc-duplicate-noise-persona-loop-20260516/runs/20260516T094506Z/artifacts/`.
- The active coverage-guided loop was restarted on
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T095910Z`.

The watcher-side duplicate ingestion remains unresolved because
`rtc-browser-fuzz-triage-watcher.mjs` was outside the action pass's allowed
edit set. Do not broadly suppress `unknown`, `timeout`, `assertion`,
`collaboration_non_convergence`, late-session stalls, or any failure with
user/action/product evidence. This control-plane work is useful, but it is not
a substitute for PR 6B replay, PR 11A-E split shaping, focused post-rebase
tests, public branch audit, or fresh combined-stack validation.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR 6B save snapshot/no-op guard candidate | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | blocked candidate; not part of filing-ready split; exclude from wildcard final-ref import and from PR 6 claims | Wait for active focused `ws-parser-transform` replay; rerun exactly once only if the active report exits empty; drop PR 6B if replay fails |
| PR 6C malformed evaluated save content | no verified filing branch | blocked pending Jest, lint, and replay evidence | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; active PR 8A is only the narrow title-reload prior-art path | Shape and audit the narrowed title-reload branch; give any remaining persisted-record hydration claim separate product evidence and a verified branch link |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond isolated PR 6B/6C candidates | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; possible `PR 1A` | deferred; possible PR 1A is not in the active split | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR, require:

1. Use only an explicit filing/push allow-list. Do not wildcard import or file
   `final/rtc-pr*`.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered
   PR 13 refs, PR 6C, and dirty evidence branches out of filing branches and
   push allow-lists.
3. Let the active PR 6B replay finish; rerun it exactly once only if it exits
   with an empty report, and drop PR 6B if seeds `5500001`, `5500002`, or
   `5500006` still reproduce duplicated persisted CRDT projection or produce no
   usable oracle.
4. Run one bounded PR 11A-E split-shaping/check job after PR 6B is classified.
   Require branch graph, containment checks, adjacent range-diffs/diffstats,
   focused CRDT tests, touched-file lint, and `git diff --check`.
5. Shape and audit PR 5A/5B/5C and narrow PR 8A, or explicitly defer them.
6. Rebase or recreate each intended PR branch on the intended upstream base.
7. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the actual filing repo.
8. Rerun focused checks, touched-file lint, and `git diff --check` on every
   imported/rebased branch.
9. Keep dirty analysis-only artifacts and the untracked reload-hydration gate
   spec out of product PR branches.
10. Assemble a fresh final combined validation stack from the actual PR heads.
11. Run final focused checks and coverage-guided fuzzing on that stack.
12. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The current novelty
snapshot has `0` visible likely-real failures and `8` unmet goals, but the
current-run triage directory is known-noise dominated and high-noise WS
expansion is held; only `novelty-http-persistence-probe` is enabled. None of
this is broad final-stack coverage or PR-filing validation. Broad fuzzing waits
for corrected final PR heads and a fresh combined validation stack.
