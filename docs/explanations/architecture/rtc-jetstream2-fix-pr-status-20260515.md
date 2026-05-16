# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T11:22:42Z`

Trigger event:
`pr-split-2026-05-16T11-20-22Z-20260516T111438Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T11-20-22Z-20260516T111438Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The plan remains filing-blocked, but the blocker has moved. The latest
split-persona synthesis, `pr-split-20260516T111438Z-synthesis.md`, says the
`PR 11A-E` shaping/check blocker is cleared and the remaining blocker is to
rebuild and validate the final combined stack from an explicit allow-list.

- `PR 6B` is no longer a blocked filing candidate. The corrected replay report
  is nonempty and the latest split synthesis classifies it as `PR6B drop`.
  Remove `final/rtc-pr06b-save-snapshot-noop-guard` from the filing path and
  push/import allow-list. Do not rerun it as the next gate.
- Seed `5500002` from that replay is now a separate revision-restore
  marker-retention follow-up. It is not evidence for filing `PR 6B`.
- Aggregate `PR 11` remains rejected. The replacement
  `PR 11A-E` explicit-base stack is now supported by the nonempty green report
  at
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T104057Z/jobs/outputs/rtc-pr11a-e-split-shaping-check-20260516T104057Z/report.md`.
  It verifies clean ancestry
  `PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E -> PR12`, focused CRDT
  tests, touched-file lint, and `git diff --check`. The branch-link audit still
  has no verified content rows for the individual PR11A-E heads, so the
  proposed PR rows below remain `No verified branch link yet`.
- The active PR13/14/15 recommendation remains the green identity-first
  sequence:
  `PR 13A -> PR 13B0 -> PR 13B1 -> PR 13B2 -> PR 13B3 -> PR 14 -> PR 15A -> PR 15B -> PR 15C`.
  Until the green PR13B0/B1/B2/B3 heads are pushed and audited, the only
  verified PR13 review-content links are the repaired PR13A/B/C refs from the
  branch-link audit.
- The immediate next validation action is not more split review. Rebuild the
  final combined validation stack from the explicit allow-list, excluding
  dropped `PR 6B`, broad PR8, aggregate PR11, old aggregate/red PR13 refs,
  wildcard `final/rtc-pr*`, `finalize/*`, `deferred/*`, dirty worktrees, and
  stale refs. Final-stack fuzz waits until that rebuilt stack has a clean
  report.
- The duplicate/noise persona synthesis is now converged on a narrow
  control-plane quarantine for strict zero-user/no-action pre-action startup
  stalls. The monitor-side current-run scheduling fix remains useful, but the
  latest synthesis still calls for triage-watcher and analysis-tier suppression
  before treating the duplicate/noise loop as handled. This is not a
  product-code PR and not final-stack validation.

Deferred/evidence-only work remains outside the filing split: dropped `PR 6B`,
`PR 6C`, broad PR8 persisted-record hydration, reload-hydration
empty-live-editor, pre-save search/live-collapse, rich-text formatted suffix
corruption, broader malformed-save/save-settlement residuals, HTTP polling
room-isolation residuals, and `PR 1A`.

The branch-link audit generated at `2026-05-16T11:22:42Z` verifies current
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

The collected remote status input was generated at `2026-05-16T11:22:37Z`.

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
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; PR11A-E shaping/check is green, branch audit still needed |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; PR11A-E shaping/check is green, branch audit still needed |
| PR 11C | Explicit-base middle insert | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; PR11A-E shaping/check is green, branch audit still needed |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; PR11A-E shaping/check is green, branch audit still needed |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; PR11A-E shaping/check is green, branch audit still needed |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; final export/rebase still required |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first delta in the preferred green PR13 sequence |
| PR 13B0 | Identity/provenance guard | No verified branch link yet | TBD | TBD | preferred green split moves stale block identity guard before source retirement; repaired aggregate guard content is audited at [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) |
| PR 13B1 | Direct cross-parent source retirement | No verified branch link yet | TBD | TBD | preferred green split; repaired aggregate source-retirement content is audited at [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) |
| PR 13B2 | Current-only cross-parent source retirement | No verified branch link yet | TBD | TBD | preferred green split; no verified branch-link-audit row for this subhead yet |
| PR 13B3 | Explicit-base cross-parent source retirement | No verified branch link yet | TBD | TBD | preferred green split; no verified branch-link-audit row for this subhead yet |
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
  the active recommendation is to replace it with the now-green PR 11A-E stack.
The green identity-first `PR 13B0/B1/B2/B3` sequence remains the preferred
filing replacement after import/rebase, but those heads do not yet have
verified branch-link-audit rows. Until they do, use only the repaired
`review/rtc-pr13a-observed-delete-provenance-repaired`,
`review/rtc-pr13b-source-retirement`, and
`review/rtc-pr13c-stale-block-identity-smear-guard` links for PR13 content.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T11:22:37Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T105736Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The latest raw novelty input is nonempty and was updated at
`2026-05-16T11:20:49.237Z` for the same active coverage root. Current-run
triage is still immature and has no visible likely-real failures. WS lifecycle
and common-blocks groups are paused for current-run profile-local startup
failure evidence, while the other selected HTTP/WS groups remain enabled:

```text
coverage files: 30303
total records seen: 44483
records processed this pass: 64
current-run records: 51 (http=10, ws=41)
current-run successful records: 7
current-run triage signatures: 95
current-run likely-real visible: 0
current-run known-noise families: rest_meta_database_error=10, pre_action_bootstrap_stall=12
current-run bootstrap stalls: 23
paused groups: novelty-ws-lifecycle, novelty-ws-common-blocks
enabled groups: novelty-ws-block-gauntlet, novelty-ws-parser-transform,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text,
  novelty-ws-async-server-blocks, novelty-http-persistence-probe
quality issues: 0
top duplicate family share: 0.2421
```

Treat this as active fuzz infrastructure health, not as proof that the final PR
stack is clean. The current-run snapshot is scoped to the current output dir;
historical and external-live triage remain reporting context only and must not
be presented as live product failure.

The latest trend evidence packet was generated at `2026-05-16T11:17:27Z` from
monitor data through `2026-05-16T11:16:26Z`; use it for trend interpretation and
broad health context, not as final-stack validation.

```text
monitor passes: 1453
coverage files: 272 -> 30226
coverage files delta: 29954
unmet coverage goals: 24 -> 7
likely_real_max: 0
duplicate_share_current_last: 0.2388
duplicate_share_historical_last: 0.4591
summary_startup_failures_last: 1
quality_issues_last: 0
enabled groups: novelty-http-persistence-probe, novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text, novelty-ws-block-gauntlet,
  novelty-ws-parser-transform, novelty-ws-async-server-blocks
fuzz level mix: browser-e2e=30 lanes/30 groups; transport-integration=1 lane/1 group
browser-e2e execution: 45374 cumulative / 192 per-hour
transport-integration execution: 2951 cumulative / 4 per-hour
load1: 66.16 / 64 cores
memory: 421.2G free / 492.0G total
```

Largest unmet goals in the latest trend packet:

- CDP coverage records: `4611/5000`
- successful real-user-editing records: `270/500`
- `core/html`: `341/500`
- `core/details`: `383/500`
- `core/more`: `387/500`
- `ui-heading-shortcut`: `455/500`
- `reload-post-action`: `463/500`

Weak completion profiles still show that validation depth is uneven: `full`
is `18/840`, `revision-persistence` is `76/3111`, `multi-reload-lifecycle` is
`58/2293`, `parser-serialization` is `60/1748`, and `real-user-editing` is
`270/4624`.

Health caveat: the latest trend evidence still has `likely_real_max: 0`, but
this is health evidence for the active validation infrastructure, not a clean
fuzz pass on the final maintainer-facing PR stack. The raw novelty body now has
a current-run snapshot with no visible likely-real failures, but lifecycle and
common-blocks groups are paused for current-run startup failures, and the final
combined stack has not been rebuilt from audited/rebased PR heads.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T111438Z-synthesis.md`. It says:

- The replacement split direction is accepted and the PR11A-E blocker is
  cleared.
- The PR11A-E report at
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T104057Z/jobs/outputs/rtc-pr11a-e-split-shaping-check-20260516T104057Z/report.md`
  is nonempty and green. It verifies clean ancestry
  `PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E -> PR12`, focused CRDT
  tests, touched-file lint, and `git diff --check`.
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
- The next action is to record the green PR11A-E report into the action-owned
  split/filing allow-list, then rebuild the final combined validation stack
  from explicit refs only.
- Do not start another split review, broad fuzz, or final-stack fuzz until that
  rebuilt validation stack has a clean report.

The latest split feedback action file,
`pr-split-20260516T111438Z-feedback-action.md`, is zero bytes, so it launched no
new job and adds no newer action result. The `20260516T111438Z` synthesis is the
current split-analysis input.

The latest duplicate-noise synthesis is
`duplicate-noise-20260516T110917Z-synthesis.md`. It treats duplicate/noise as a
control-plane policy gap, not a product-code PR. The consensus smallest safe fix
is still narrow:

- add a shared strict pre-action startup predicate in
  `rtc-browser-fuzz-triage-watcher.mjs`;
- classify strict zero-user/no-editor-action/no-save-reload-checkpoint-product
  evidence startup or awareness failures as terminal `bootstrap-stall` before
  analysis;
- defensively skip the same predicate in
  `rtc-browser-fuzz-analysis-tier.mjs`;
- use historical/external-live startup dominance only as bounded novelty
  scheduling probation when the current run is immature and has no likely-real
  failures.

The latest duplicate-noise feedback action file,
`duplicate-noise-20260516T110917Z-feedback-action.md`, is zero bytes. The
earlier monitor/supervisor feedback action still matters as completed
control-plane work: novelty scheduling uses current-run triage rather than
historical/external-live dominance, stale pause reasons were cleared by policy
version `7`, canary rotation was protected, and `node --check` passed for the
touched monitor/supervisor scripts. The latest synthesis says that was not the
whole duplicate/noise fix because triage-watcher and analysis-tier suppression
remain to be implemented.

The current raw novelty snapshot shows `novelty-ws-lifecycle` paused after
`3/3` pre-action WS discovery/startup failures and `novelty-ws-common-blocks`
paused after current-run startup failures. That is current-run profile-local
evidence, not historical/external-live dominance. This bounded control-plane
improvement is not a substitute for public branch audit, final combined-stack
rebuild, or fresh combined-stack validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current-run fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older PR 13
review-link warning is superseded by the `11:22:42Z` branch-link audit, which
verifies the repaired PR 13 review refs listed above. Their older "only
`novelty-http-persistence-probe` is enabled" warning is superseded by the latest
raw novelty snapshot, which shows active HTTP persistence plus WS block-gauntlet,
parser-transform, real-user, real-user-rich-text, and async-server-blocks
groups, with WS lifecycle and common-blocks paused on current-run startup
evidence.

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
3. Treat PR 11A-E split-shaping/check as green evidence, but do not file the
   individual PR11A-E heads until they are pushed/imported and audited. The
   green report is:
   `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T104057Z/jobs/outputs/rtc-pr11a-e-split-shaping-check-20260516T104057Z/report.md`.
   It reports clean ancestry, focused CRDT tests, touched-file lint, and
   `git diff --check`; the branch-link audit still has no verified rows for the
   individual PR11A-E heads.
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
    The next bounded job should rebuild this stack from the explicit allow-list
    after PR11A-E, excluding dropped `PR 6B`, broad PR8, aggregate PR11,
    aggregate/old PR13 refs, stale refs, wildcard `final/rtc-pr*`,
    `finalize/*`, `deferred/*`, and dirty worktrees.
11. Run final focused checks and coverage-guided fuzzing on that rebuilt stack
    only after the rebuild report is clean.
12. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The latest trend
evidence has `likely_real_max: 0` and `7` unmet goals, and the latest raw
novelty snapshot shows no visible likely-real failures, active HTTP plus WS
real-user/real-user-rich-text/block-gauntlet/parser-transform/async-server
groups, with `novelty-ws-lifecycle` and `novelty-ws-common-blocks` paused for
current-run startup failures. Current-run triage is still immature, PR11A-E
needs audited branch rows, and none of this is broad final-stack coverage or
PR-filing validation. Broad fuzzing waits for corrected final PR heads and a
fresh combined validation stack.
