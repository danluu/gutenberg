# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T10:24:59Z`

Trigger event:
`pr-split-2026-05-16T10-23-56Z-20260516T101712Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T10-23-56Z-20260516T101712Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The plan is still filing-blocked. The latest split-persona synthesis,
`pr-split-20260516T101712Z-synthesis.md`, keeps the current maintainer-facing
split mostly stable but preserves two gates before filing:

- `PR 6B` is a blocked candidate, not a filing-ready PR. The corrected replay
  is active and its report was still `0` bytes when the persona synthesis read
  it. Wait for that run to classify the candidate before launching anything
  else.
- Aggregate `PR 11` should not be filed. After `PR 6B` is classified, run one
  bounded split-shaping/check job that turns the explicit-base work into
  `PR 11A` through `PR 11E`.

The branch-link audit generated at `2026-05-16T10:24:59Z` verifies current
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

Deferred/evidence-only work remains outside the filing split:
reload-hydration empty-live-editor, pre-save search/live-collapse, rich-text
formatted suffix corruption, broader malformed-save/save-settlement residuals,
and HTTP polling room-isolation residuals.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T10:24:54Z`.

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
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; final rebase/checks still required |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; final rebase/checks still required |
| PR 5A | Entity/entity-reference normalization in `crdt.ts` | No verified branch link yet | 2 | TBD | accepted replacement for old aggregate PR 5; needs audited review branch |
| PR 5B | Parser/rich-text HTML equivalence in `crdt-blocks.ts` | No verified branch link yet | 2 | TBD | accepted replacement for old aggregate PR 5; needs audited review branch |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | TBD | accepted replacement for old aggregate PR 5; needs audited review branch |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes PR 6B and broader malformed-save residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | accepted split; final filing refresh still required |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | stacked after PR 7A; final filing refresh still required |
| PR 8A | Narrow reload-title prior-art path | No verified branch link yet | TBD | TBD | replace broad PR 8; broader persisted-record hydration remains deferred |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; final rebase/checks still required |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; split-shaping/check job required |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; split-shaping/check job required |
| PR 11C | Explicit-base middle insert | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; split-shaping/check job required |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; split-shaping/check job required |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | TBD | TBD | replacement for aggregate PR 11; split-shaping/check job required |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; final export/rebase still required |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; do not use stale PR 13A ref |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; do not use stale/misordered PR 13B refs |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; do not use stale/misordered PR 13C refs |
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

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T10:24:54Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T102020Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest novelty monitor snapshot:

```text
updated: 2026-05-16T10:23:14.688Z
coverage files: 29354
total records seen: 43067
records processed this pass: 38
coverage lines seen this pass: 44621
summary startup failures processed this pass: 0
new behavioral feature keys this pass: 0
new CDP coverage hashes this pass: 0
unmet goals: 8
recommended groups: none
startup-noise held recommended groups: 8 WS groups
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
load1: 54.12 / 64 cores
memory: 423.2G free / 492.0G total
headroom for adding groups: yes
```

Enabled coverage-guided groups in the latest monitor snapshot:

- `novelty-ws-lifecycle`
- `novelty-ws-persistence-no-title`
- `novelty-http-persistence-probe`

The monitor reset run-local noise state when the output dir moved to
`run-20260516T102020Z`, restarted the current-run triage watcher, and then held
the broad WS recommended groups while current-run triage was immature and
external live observed triage remained dominated by strict startup known-noise.

Current-run triage has no visible likely-real signal, but it is too immature to
count as final-stack validation:

```text
current output dir scope:
triage roots: 1
triage state files: 1
signatures: 0
likely-real visible: 0
likely-real merged duplicates: 0
likely-real oracle/noise questions: 0
normalization-noise candidates: 0
bootstrap stalls: 0
known-noise signatures: 0
top duplicate family share: 0
```

Historical and external live triage remain reporting/advisory unless
current-run evidence confirms product failures:

```text
closed historical scope:
triage roots: 104
triage state files: 160
signatures: 9496
bootstrap stalls: 4386
known-noise signatures: 2282
top duplicate family share: 0.4619
top semantic family: pre_action_bootstrap_stall

external live sidecar scope:
triage roots: 4
triage state files: 105
signatures: 11071
bootstrap stalls: 7959
known-noise signatures: 4140
top duplicate family share: 0.7189
top semantic family: pre_action_bootstrap_stall

combined reporting scope:
triage roots: 109
triage state files: 266
signatures: 20567
bootstrap stalls: 12345
known-noise signatures: 6422
top duplicate family share: 0.6002
top semantic family: pre_action_bootstrap_stall
```

Largest current unmet goals:

- CDP coverage records: `4564/5000`
- successful real-user-editing records: `268/500`
- `core/html`: `339/500`
- `core/details`: `376/500`
- `core/more`: `382/500`
- `ui-heading-shortcut`: `438/500`
- `reload-post-action`: `451/500`
- `core/gallery`: `495/500`

Health caveat: the latest novelty status reports no behavioral coverage files
under the new output dir yet. Current fuzz health is useful evidence for active
validation infrastructure, but it is not final-stack validation and does not
make the PR split filing-ready.

The trend evidence packet was generated at `2026-05-16T10:15:30Z` from monitor
data through `2026-05-16T10:12:55Z`, before the latest output-dir reset. Use it
for trend interpretation, not current enabled-group membership:

```text
monitor passes: 1423
coverage files: 272 -> 29185
coverage files delta: 28913
unmet coverage goals: 24 -> 8
likely_real_max: 0
duplicate_share_current_last: 0.6667
duplicate_share_historical_last: 0.4613
summary_startup_failures_last: 0
quality_issues_last: 2
fuzz level mix: browser-e2e=26 lanes/26 groups; transport-integration=1 lane/1 group
```

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T101712Z-synthesis.md`. It says:

- The project is blocked, not redesigned from scratch.
- Keep `PR 5A/5B/5C`, `PR 7A/7B`, and `PR 15A/15B/15C`.
- Replace broad PR 8 with narrow PR 8A.
- Keep PR 6B as a blocked candidate only. Its corrected replay report path is
  still empty while the tmux session is active:
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T100238Z/jobs/outputs/rtc-pr06b-corrected-ws-parser-transform-replay-5500001-5500002-5500006-20260516T101224Z/report.md`.
- Classify `final/rtc-pr06b-save-snapshot-noop-guard` only if seeds `5500001`,
  `5500002`, and `5500006` reach the persisted-CRDT-projection oracle. File if
  it passes; drop if marker duplication or the same-family product failure
  reproduces; leave blocked if infrastructure prevents reaching the oracle.
- If the active PR 6B session exits without a usable report, rerun exactly once
  with the existing script.
- After PR 6B is classified, run one bounded PR 11A-E split-shaping/check job.
- Do not start broad fuzz, final-stack fuzz, reload diagnostics, PR 13 repair,
  another split-review loop, or PR 11 shaping while PR 6B remains unclassified.

The latest duplicate-noise synthesis,
`duplicate-noise-20260516T101325Z-synthesis.md`, edited no files. It classifies
the duplicate/noise issue as a harness policy problem, not a product failure:
strict zero-product-evidence startup/setup failures can still influence browser
scheduling and fragment into multiple triage signatures before the current run
has enough clean successes. Its smallest safe future control-plane fix is:

- hold broad/non-canary WS expansion while likely-real is `0`, current-run
  successes are below probation threshold, and startup-noise evidence is
  present;
- canonicalize strict pre-action/no-user/no-action setup failures before
  signature hashing in the triage watcher;
- keep failures with user/action/reload/save/lifecycle/fault evidence visible.

That control-plane work may improve fuzz scheduling quality, but it is not a
substitute for PR 6B classification, PR 11 split shaping, focused post-rebase
tests, public branch audit, or fresh combined-stack validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current-run fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older PR 13
review-link warning is superseded by the `10:24:59Z` branch-link audit, which
now verifies the repaired PR 13 review refs listed above.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR 6B save snapshot/no-op guard candidate | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | blocked candidate; corrected replay active with empty report at latest synthesis; not filing-ready and not part of PR 6 | Wait for active corrected `ws-parser-transform` replay with the collaboration fuzz harness and WebSocket sync server; file only if the persisted-CRDT-projection oracle passes, drop on marker duplication/same-family product failure, leave blocked on infra-only result |
| PR 6C malformed evaluated save content | no verified filing branch | blocked pending Jest, lint, and replay evidence | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; active PR 8A is only the narrow title-reload prior-art path | Shape and audit the narrowed title-reload branch; give any remaining persisted-record hydration claim separate product evidence and a verified branch link |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond isolated PR 6B/6C candidates | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; possible PR 1A | deferred; possible PR 1A is not in the active split | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use only an explicit filing/push allow-list. Do not wildcard import or file
   `final/rtc-pr*`.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR 13
   refs, PR 6C, dirty evidence branches, and the untracked reload-hydration
   gate spec out of filing branches and push allow-lists.
3. Wait for the active corrected PR 6B replay. Drop PR 6B if seeds `5500001`,
   `5500002`, or `5500006` reproduce duplicated persisted CRDT projection or
   the same product-failure family. Leave PR 6B blocked if the corrected run
   still cannot reach the oracle.
4. Run one bounded PR 11A-E split-shaping/check job after PR 6B is classified.
   Require branch graph, containment checks, adjacent range-diffs/diffstats,
   focused CRDT tests, touched-file lint, and `git diff --check`.
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
current-run triage directory is immature after the output-dir reset and the
latest health warning says no behavioral coverage files have appeared under
the new output dir yet. None of this is broad final-stack coverage or PR-filing
validation. Broad fuzzing waits for corrected final PR heads and a fresh
combined validation stack.
