# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T10:42:07Z`

Trigger event:
`pr-split-2026-05-16T10-40-52Z-20260516T103450Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T10-40-52Z-20260516T103450Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The plan remains filing-blocked, but the active blocker changed in the latest
split-persona synthesis, `pr-split-20260516T103450Z-synthesis.md`.

- `PR 6B` is no longer a blocked filing candidate. The corrected replay report
  is nonempty and the latest split synthesis classifies it as `PR6B drop`.
  Remove `final/rtc-pr06b-save-snapshot-noop-guard` from the filing path and
  push/import allow-list. Do not rerun it as the next gate.
- Seed `5500002` from that replay is now a separate revision-restore
  marker-retention follow-up. It is not evidence for filing `PR 6B`.
- Aggregate `PR 11` remains rejected. The next bounded work is the
  `PR 11A-E` explicit-base split-shaping/check job:
  `append -> delete -> middle insert -> move/reorder -> delete+insert anchor`.
- The active PR13/14/15 recommendation remains the green identity-first
  sequence:
  `PR 13A -> PR 13B0 -> PR 13B1 -> PR 13B2 -> PR 13B3 -> PR 14 -> PR 15A -> PR 15B -> PR 15C`.

Deferred/evidence-only work remains outside the filing split: dropped `PR 6B`,
`PR 6C`, broad PR8 persisted-record hydration, reload-hydration
empty-live-editor, pre-save search/live-collapse, rich-text formatted suffix
corruption, broader malformed-save/save-settlement residuals, HTTP polling
room-isolation residuals, and `PR 1A`.

The branch-link audit generated at `2026-05-16T10:42:07Z` verifies current
review content links for most proposed PR rows. The maintainer-facing table
below uses only audit rows marked `verified-content`, or says
`No verified branch link yet`. For repaired PR 13 content, use only these audit
refs:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link the stale or misordered PR 13 refs listed in the audit under
"Explicitly Not PR-Content Links":
`review/rtc-pr13a-observed-delete-provenance`,
`review/rtc-pr13b-stale-block-identity-smear`, or
`review/rtc-pr13c-cross-parent-source-retirement`.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T10:42:02Z`.

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
evidence, and final branch claims unless it is deliberately copied into a clean
evidence worktree for the reload-hydration gate.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack still has modified product/test files and many untracked fuzz,
analysis, and documentation artifacts. It is active validation infrastructure,
not the final PR stack.

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the repaired PR 13A compare link has the source base.

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; final rebase/checks still required |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; final rebase/checks still required |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; also the likely home for the new seed `5500002` marker-retention follow-up if it reproduces cleanly |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; final rebase/checks still required |
| PR 5A | Entity/entity-reference normalization in `crdt.ts` | No verified branch link yet | 2 | TBD | accepted replacement for old aggregate PR 5; needs audited review branch |
| PR 5B | Parser/rich-text HTML equivalence in `crdt-blocks.ts` | No verified branch link yet | 2 | TBD | accepted replacement for old aggregate PR 5; needs audited review branch |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | TBD | accepted replacement for old aggregate PR 5; needs audited review branch |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes dropped PR 6B and broader malformed-save residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | accepted split; final filing refresh still required |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | stacked after PR 7A; final filing refresh still required |
| PR 8A | Narrow reload-title prior-art path | No verified branch link yet | TBD | TBD | replace broad PR 8; broader persisted-record hydration remains deferred |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; final rebase/checks still required |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; next split-shaping/check job |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; next split-shaping/check job |
| PR 11C | Explicit-base middle insert | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; next split-shaping/check job |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; next split-shaping/check job |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; next split-shaping/check job |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; final export/rebase still required |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; use green `final/rtc-pr13a-observed-delete-provenance-green` for filing after import/rebase |
| PR 13B0 | Identity/provenance guard | No verified branch link yet | 2 | +430 / -50 | green final head exists; needs pushed/audited review branch before filing |
| PR 13B1 | Direct cross-parent source retirement | No verified branch link yet | 2 | +482 / -0 | green final head exists; do not use Cycle 110 red head |
| PR 13B2 | Current-only cross-parent source retirement | No verified branch link yet | 2 | +410 / -0 | green final head exists; do not use Cycle 110 red head |
| PR 13B3 | Explicit-base cross-parent source retirement | No verified branch link yet | 2 | +758 / -0 | green final head exists; tree-equivalent to old accepted aggregate source-retirement tree |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; final rebase/checks still required |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |

Verified branches that are now prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5 (`4` files, `+1664 / -52`), not
  the recommended maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8 (`11` files, `+618 / -61`), not the
  active PR 8A shape.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11 (`2` files, `+1145 / -4`), but
  the active recommendation is to replace it with PR 11A-E.
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
  and [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)
  are the only verified repaired PR 13B/13C audit refs. They are useful
  repaired content links, but the active filing recommendation is the newer
  green identity-first `PR 13B0/B1/B2/B3` sequence once those heads are pushed
  or audited.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T10:42:02Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T102020Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest novelty monitor snapshot:

```text
updated: 2026-05-16T10:41:28.256Z
coverage files: 29654
total records seen: 43497
records processed this pass: 51
coverage lines seen this pass: 45085
summary startup failures processed this pass: 0
new behavioral feature keys this pass: 1
new CDP coverage hashes this pass: 1
unmet goals: 8
recommended groups: none
startup-noise held recommended groups: 8 broad WS coverage-gap groups
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
load1: 68.88 / 64 cores
memory: 425.4G free / 492.0G total
headroom for adding groups: no
```

Enabled coverage-guided groups in the latest monitor snapshot:

- `novelty-http-persistence-probe`

Paused groups are `novelty-ws-persistence-no-title`, `novelty-ws-lifecycle`,
`novelty-ws-real-user-editing`, `novelty-ws-real-user-rich-text`,
`novelty-ws-block-gauntlet`, `novelty-ws-common-blocks`, and
`novelty-ws-parser-transform`. The monitor is also holding recommended broad
WS groups for real-user editing, rich text, block gauntlet, common blocks,
parser transform, async-server blocks, media-cross-entity, and long-session
large-doc while strict startup-noise is present and current-run successful
records remain zero.

Current-run triage has no visible likely-real signal, but it is still too
immature to count as final-stack validation:

```text
current output dir scope:
triage roots: 1
triage state files: 1
signatures: 49
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
normalization-noise candidates: 0
bootstrap stalls: 8
known-noise signatures: 11
top duplicate family share: 0.2041
top semantic families: collaboration_non_convergence (10), pre_action_bootstrap_stall (8), rest_meta_database_error (7), timeout (6)
```

Historical and external live triage remain reporting/advisory unless
current-run evidence confirms product failures:

```text
closed historical scope:
triage roots: 105
triage state files: 161
signatures: 9508
bootstrap stalls: 4387
known-noise signatures: 2283
top duplicate family share: 0.4614
top semantic family: pre_action_bootstrap_stall

external live sidecar scope:
triage roots: 3
triage state files: 104
signatures: 11321
bootstrap stalls: 8127
known-noise signatures: 4226
top duplicate family share: 0.7179
top semantic family: pre_action_bootstrap_stall

combined reporting scope:
triage roots: 109
triage state files: 266
signatures: 20878
bootstrap stalls: 12522
known-noise signatures: 6520
top duplicate family share: 0.5998
top semantic family: pre_action_bootstrap_stall
```

Largest current unmet goals:

- CDP coverage records: `4574/5000`
- successful real-user-editing records: `268/500`
- `core/html`: `340/500`
- `core/details`: `377/500`
- `core/more`: `383/500`
- `ui-heading-shortcut`: `447/500`
- `reload-post-action`: `453/500`
- `core/gallery`: `495/500`

Health caveat: the current run has only a small number of fresh records under
the new output dir and no current-run successful records yet. Current fuzz
health is useful evidence for active validation infrastructure, but it is not
final-stack validation and does not make the PR split filing-ready.

The trend evidence packet was generated at `2026-05-16T10:35:08Z` from monitor
data through `2026-05-16T10:32:54Z`. Use it for trend interpretation, not
current enabled-group membership; the novelty snapshot above is newer.

```text
monitor passes: 1433
coverage files: 272 -> 29512
coverage files delta: 29240
unmet coverage goals: 24 -> 8
likely_real_max: 0
duplicate_share_current_last: 0.4
duplicate_share_historical_last: 0.4614
summary_startup_failures_last: 2
quality_issues_last: 0
fuzz level mix: browser-e2e=25 lanes/25 groups; transport-integration=1 lane/1 group
```

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T103450Z-synthesis.md`. It says:

- The split needs a change because `PR 6B` is now a drop, not a blocked
  possible filing unit.
- Remove `final/rtc-pr06b-save-snapshot-noop-guard` from the filing path and
  allow-list. Do not rerun it as the next gate.
- Treat seed `5500002` as a separate revision-restore marker-retention
  follow-up, not PR 6B coverage.
- Keep aggregate `PR 11` out of filing. Replace it with the stacked
  `PR 11A-E` sequence after `PR 10`:
  `append -> delete -> middle insert -> move/reorder -> delete+insert anchor`.
- Preserve the green PR13 continuation:
  `PR 13A -> PR 13B0 -> PR 13B1 -> PR 13B2 -> PR 13B3 -> PR 14 -> PR 15A -> PR 15B -> PR 15C`.
- Keep broad `PR 8`, `PR 1A`, `PR 6C`, reload-hydration,
  pre-save live-collapse, rich-text suffix corruption, HTTP room-isolation
  residuals, and broader malformed-save residuals evidence-only/deferred.
- Next remote work is exactly one bounded `PR 11A-E` shaping/check job, with
  branch graph, containment checks, adjacent `range-diff`, adjacent
  `diff --stat --numstat`, focused CRDT tests, touched-file JS lint, and
  `git diff --check`.
- After clean PR11 evidence, rebuild the final combined validation stack from
  an explicit allow-list that excludes `PR 6B` and old aggregate/red heads.

The latest duplicate-noise synthesis is
`duplicate-noise-20260516T103118Z-synthesis.md`. It classifies the dominant
duplicate/noise family as strict pre-action startup noise that can still reach
triage or analysis when stale/non-`seed` startup stalls are not consistently
demoted. The proposed smallest control-plane fix is a strict
zero-user/no-action startup predicate shared by the triage watcher and
analysis tier. It explicitly blocks historical/live scheduling-policy changes
for now because the reports disagree on whether external historical dominance
should throttle current browser capacity.

The earlier duplicate-noise action remains relevant context: the novelty
monitor was patched and restarted so broad WS coverage-gap groups are held
when current-run strict startup noise appears while current-run successful
records are still zero. The newer synthesis says triage/analysis
canonicalization still needs a separate, bounded control-plane pass. This is
not a substitute for PR 11A-E split shaping, focused post-rebase checks, public
branch audit, or fresh combined-stack validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current-run fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older PR 13
review-link warning is superseded by the `10:42:07Z` branch-link audit, which
verifies the repaired PR 13 review refs listed above.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Dropped PR 6B save snapshot/no-op guard | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | dropped from filing path after corrected replay classification; not in proposed split or allow-list | Do not rerun as the next gate; track seed `5500002` separately as revision-restore marker retention if it reproduces cleanly |
| PR 6C malformed evaluated save content | no verified filing branch | blocked pending Jest, lint, and replay evidence | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; active PR 8A is only the narrow title-reload prior-art path | Shape and audit the narrowed title-reload branch; give any remaining persisted-record hydration claim separate product evidence and a verified branch link |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond dropped PR 6B and isolated PR 6C candidate | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; possible PR 1A | deferred; possible PR 1A is not in the active split | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use only an explicit filing/push allow-list. Do not wildcard import or file
   `final/rtc-pr*`.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR 13
   refs, dropped PR 6B, PR 6C, dirty evidence branches, and the untracked
   reload-hydration gate spec out of filing branches and push allow-lists.
3. Run one bounded PR 11A-E split-shaping/check job now that PR 6B has been
   dropped. Require branch graph, containment checks, adjacent range-diffs,
   adjacent diffstats/numstats, focused CRDT tests, touched-file lint, and
   `git diff --check`.
4. Push/import and audit the green PR 13B0/B1/B2/B3 heads before filing the
   PR 13 replacement sequence; do not file old aggregate PR 13B, old PR 13C,
   Cycle 110 red tri-split refs, or stale/misordered review refs.
5. Shape and audit PR 5A/5B/5C and narrow PR 8A, or explicitly defer them.
6. Rebase or recreate each intended PR branch on the intended upstream base.
7. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the actual filing repo.
8. Rerun focused checks, touched-file lint, and `git diff --check` on every
   imported/rebased branch.
9. Keep dirty analysis-only artifacts out of product PR branches.
10. Assemble a fresh final combined validation stack from the actual PR heads.
11. Run final focused checks and coverage-guided fuzzing on that stack.
12. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The current novelty
snapshot has `0` visible likely-real failures and `8` unmet goals, but the
current-run triage directory is still immature after the output-dir reset and
the current run has no successful records yet. None of this is broad final-stack
coverage or PR-filing validation. Broad fuzzing waits for corrected final PR
heads, a fresh combined validation stack, and clean PR 11A-E evidence.
