# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T10:58:13Z`

Trigger event:
`pr-split-2026-05-16T10-57-14Z-20260516T105143Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T10-57-14Z-20260516T105143Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The plan remains filing-blocked on the active `PR 11A-E` shaping/check job.
The latest split-persona synthesis, `pr-split-20260516T105143Z-synthesis.md`,
keeps the current split direction but says filing must wait for usable PR11A-E
evidence.

- `PR 6B` is no longer a blocked filing candidate. The corrected replay report
  is nonempty and the latest split synthesis classifies it as `PR6B drop`.
  Remove `final/rtc-pr06b-save-snapshot-noop-guard` from the filing path and
  push/import allow-list. Do not rerun it as the next gate.
- Seed `5500002` from that replay is now a separate revision-restore
  marker-retention follow-up. It is not evidence for filing `PR 6B`.
- Aggregate `PR 11` remains rejected. The current bounded work is the
  `PR 11A-E` explicit-base split-shaping/check job:
  `append -> delete -> middle insert -> move/reorder -> delete+insert anchor`.
  Its expected `report.md` is still `0 bytes`; the active tmux session still
  exists. Current generated evidence has touched-file lint exit `0`, but
  focused unit exits are `1` for PR11A-E/PR12, so this is not clean yet.
- The active PR13/14/15 recommendation remains the green identity-first
  sequence:
  `PR 13A -> PR 13B0 -> PR 13B1 -> PR 13B2 -> PR 13B3 -> PR 14 -> PR 15A -> PR 15B -> PR 15C`.
  Until the green PR13B0/B1/B2/B3 heads are pushed and audited, the only
  verified PR13 review-content links are the repaired PR13A/B/C refs from the
  branch-link audit.

Deferred/evidence-only work remains outside the filing split: dropped `PR 6B`,
`PR 6C`, broad PR8 persisted-record hydration, reload-hydration
empty-live-editor, pre-save search/live-collapse, rich-text formatted suffix
corruption, broader malformed-save/save-settlement residuals, HTTP polling
room-isolation residuals, and `PR 1A`.

The branch-link audit generated at `2026-05-16T10:58:13Z` verifies current
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

The collected remote status input was generated at `2026-05-16T10:58:08Z`.

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
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; green filing head still needs import/rebase/audit |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; green identity-first replacement should split this into PR 13B1/B2/B3 once those heads are pushed/audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; green identity/provenance guard should move this earlier as PR 13B0 once pushed/audited |
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
The green identity-first `PR 13B0/B1/B2/B3` sequence remains the preferred
filing replacement after import/rebase, but those heads do not yet have
verified branch-link-audit rows. Until they do, use only the repaired
`review/rtc-pr13a-observed-delete-provenance-repaired`,
`review/rtc-pr13b-source-retirement`, and
`review/rtc-pr13c-stale-block-identity-smear-guard` links for PR13 content.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T10:58:08Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T105736Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The latest raw novelty input collected for this update is empty:

```text
raw/novelty-status.md: 0 bytes
```

Do not infer a fresh `10:58Z` per-run novelty count from this update. The trend
evidence packet was generated at `2026-05-16T10:50:13Z` from monitor data
through `2026-05-16T10:48:07Z`; use it for trend interpretation, enabled-group
membership, and broad health context, not as final-stack validation.

```text
monitor passes: 1440
coverage files: 272 -> 29764
coverage files delta: 29492
unmet coverage goals: 24 -> 8
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.4614
summary_startup_failures_last: 0
quality_issues_last: 1
enabled groups: novelty-http-persistence-probe, novelty-ws-lifecycle
fuzz level mix: browser-e2e=26 lanes/26 groups; transport-integration=1 lane/1 group
browser-e2e execution: 44779 cumulative / 408 per-hour
transport-integration execution: 2941 cumulative / 8 per-hour
load1: 70.64 / 64 cores
memory: 424.2G free / 492.0G total
```

Largest unmet goals in the latest trend packet:

- CDP coverage records: `4578/5000`
- successful real-user-editing records: `268/500`
- `core/html`: `340/500`
- `core/details`: `377/500`
- `core/more`: `384/500`
- `ui-heading-shortcut`: `450/500`
- `reload-post-action`: `455/500`
- `core/gallery`: `495/500`

Weak completion profiles still show that validation depth is uneven: `full`
is `18/840`, `revision-persistence` is `76/3074`, `multi-reload-lifecycle` is
`58/2263`, `parser-serialization` is `60/1716`, and `real-user-editing` is
`268/4547`.

Health caveat: the latest trend evidence still has `likely_real_max: 0`, but
this is health evidence for the active validation infrastructure, not a clean
fuzz pass on the final maintainer-facing PR stack. The raw novelty body for
this collection is empty, PR11A-E is not clean, and the final combined stack
has not been rebuilt from audited/rebased PR heads.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T105143Z-synthesis.md`. It says:

- The split direction is accepted, but PR filing is blocked on the active
  PR11A-E shaping/check job.
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
- The required PR11A-E output is
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T104057Z/jobs/outputs/rtc-pr11a-e-split-shaping-check-20260516T104057Z/report.md`.
  It is still `0 bytes`, and the active tmux session still exists.
- That report must include branch graph, containment, adjacent `range-diff`,
  adjacent diffstat/numstat, focused CRDT tests, touched-file JS lint, and
  `git diff --check`.
- Current evidence has touched-file lint exit `0`, but focused unit exits are
  `1` for PR11A-E/PR12. If the active session exits with an empty or unusable
  report, rerun exactly once from
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T104057Z/jobs/run-rtc-pr11a-e-split-shaping-check-20260516T104057Z.sh`.
- After clean PR11 evidence, rebuild the final combined validation stack from
  an explicit allow-list that excludes `PR 6B` and old aggregate/red heads.
- Launch no new Codex, fuzzing, PR13 repair, PR6B replay, reload diagnostics,
  duplicate PR11 shaping, broad fuzz, or final-stack fuzz jobs while PR11A-E is
  unresolved.

The latest duplicate-noise synthesis is
`duplicate-noise-20260516T103851Z-synthesis.md`. It classifies the current
duplicate/noise issue as a control-plane boundary bug, not a product-code bug:
historical and external-live `pre_action_bootstrap_stall` dominance is still
affecting current-run WS browser scheduling, and strict pre-action startup
failures are only partially suppressed before analysis.

The proposed smallest control-plane pass is to make browser scheduling
current-run authoritative in the novelty monitor, keep a WS canary such as
`novelty-ws-lifecycle` able to unpause during probation, broaden the triage
watcher suppression predicate to strict no-user/no-action startup phases, and
add the same analysis-tier backstop for stale queued startup-noise signatures.
The latest trend evidence shows `novelty-ws-lifecycle` enabled as a canary,
but no automatic control-plane job should start from this report. Supervisor
threshold and live-analysis sidecar changes are optional follow-ups after a
bounded canary validation. This is not a substitute for PR 11A-E split shaping,
focused post-rebase checks, public branch audit, or fresh combined-stack
validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current-run fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older PR 13
review-link warning is superseded by the `10:58:13Z` branch-link audit, which
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
3. Let the active PR 11A-E split-shaping/check job finish now that PR 6B has
   been dropped. Its expected report is still empty:
   `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T104057Z/jobs/outputs/rtc-pr11a-e-split-shaping-check-20260516T104057Z/report.md`.
   Require branch graph, containment checks, adjacent range-diffs, adjacent
   diffstats/numstats, focused CRDT tests, touched-file lint, and
   `git diff --check`. Rerun the existing job script exactly once only if the
   active session exits with an empty or unusable report.
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

Existing fuzz infrastructure can continue where healthy. The latest trend
evidence has `likely_real_max: 0`, `8` unmet goals, and enabled groups
`novelty-http-persistence-probe` plus `novelty-ws-lifecycle`, but this
update's `10:58Z` raw novelty input is empty and PR11A-E evidence is still not
clean. None of this is broad final-stack coverage or PR-filing validation.
Broad fuzzing waits for corrected final PR heads, a fresh combined validation
stack, and clean PR 11A-E evidence.
