# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T19:21:07Z`

Trigger event:
`pr-split-2026-05-16T19-19-44Z-20260516T191336Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T19-19-44Z-20260516T191336Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The latest split-persona consensus says the previous
`PR01` through `PR15C` set is only a known-fix prefix, not a complete filing
stack.

The current maintainer-facing filing shape is:

```text
ready/rtc-* PR01-PR15C prefix, including PR02A
-> new narrow post-PR15C seed 1020002 WebSocket/Yjs repair PR
-> rebuilt combined validation stack
-> focused seed 1020002 gate
-> final-stack fuzz
```

Use the `ready/rtc-*` allow-list from the `20260516T181934Z` finalization
report, not wildcard `final/rtc-pr*`, aggregate `final/*`, `deferred/*`,
`try/*`, validation refs, dirty worktrees, or
`candidate/rtc-pr16-malformed-save-payload-split`.

PR02A is part of the proposed prefix as the
`ready/rtc-pr02a-http-room-isolation-regression` sidecar after PR02. It still
has no verified branch link in the branch-link audit, so it must not be filed
until a review branch is audited, or it is deliberately folded into PR02 or
PR03+ is restacked on top of it.

Seed `1020002` remains the active filing blocker. It is confirmed
WebSocket/Yjs marker divergence: page 0 reports connected/synced but loses
marker `async-server-1020002-0-1-589451` while page 1 and the relay retain it.
The sync-manager load/hydrate report, the Gutenberg store-to-CRDT candidate,
and the `180529Z` CRDT block-array semantic-diff repair report are now all
diagnostic-only because their candidates did not pass the focused seed gate.

The current bounded follow-up job is still active and reportless:

```text
rtc-ws-seed-1020002-caller-base-provenance-diagnostic-20260516T185531Z
```

Expected report:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T184659Z/jobs/outputs/rtc-ws-seed-1020002-caller-base-provenance-diagnostic-20260516T185531Z/report.md
```

Do not launch a duplicate Codex repair, broad final-stack fuzz, extra fuzz
lanes, PR13 work, PR6B/PR6C work, reload diagnostics, old PR16 replay, or
another split-review loop while this diagnostic is active. If it exits without
a usable report, rerun exactly one bounded instance from the generated
`run-rtc-ws-seed-1020002-caller-base-provenance-diagnostic-20260516T185531Z.sh`
script in the `20260516T184659Z` run directory. Do not fold seed
`1020002` into PR13, PR15, PR6B/PR6C, old PR16, PR8, reload hydration,
pre-save collapse, rich-text suffix, malformed-save residuals, broader HTTP
room isolation, seed `5500002`, seed `7410083`, or possible seed `5200001`
without proof of exact same-source ownership.

## Latest Branch And Ref Status

The remote status input was generated at `2026-05-16T19:21:02Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6A, PR 8A, PR 15A/15B/15C,
fallback-group evidence, and final branch claims unless it is deliberately
copied into a clean evidence worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack has modified product/test files and many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-16T19:21:07Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

For repaired PR 13 content, use only these audit refs:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link the stale or misordered PR13 refs listed in the audit under
"Explicitly Not PR-Content Links":
`review/rtc-pr13a-observed-delete-provenance`,
`review/rtc-pr13b-stale-block-identity-smear`, or
`review/rtc-pr13c-cross-parent-source-retirement`.

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the repaired PR13A compare link has the source base.

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | 1 | +115 / -0 | added by `20260516T181934Z` finalization; audit or fold/restack before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs audited review branch |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; needs audited review branch |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old aggregate PR 5; needs audited review branch |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes dropped PR 6B and broader malformed-save residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A |
| PR 8A | Narrow title reload replacement | No verified branch link yet | TBD | TBD | broad verified PR 8 is prior art only; shape a narrow title-reload branch only if revived |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | green in validation-stack rebuild; needs audited review branch |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | green in validation-stack rebuild; needs audited review branch |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | green in validation-stack rebuild; needs audited review branch |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | green in validation-stack rebuild; needs audited review branch |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | green in validation-stack rebuild; needs audited review branch |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; keep in known-fix prefix |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first maintainer-facing PR13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; covers source-retirement content while green B1/B2/B3 subheads lack individual audit rows |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; covers identity/provenance guard content while green B0 lacks its own audit row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; keep after PR13 source sequence |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |
| New post-PR15C PR | Seed `1020002` WebSocket/Yjs marker-propagation repair | No verified branch link yet | TBD | TBD | active blocker; await caller/base-provenance diagnostic, focused seed gate, and audited review branch |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended
  maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation
  is the PR11A-E split.

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T19:21:02Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T185058Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The clean structural validation ref remains:

```text
validation/rtc-final-combined-stack-post-pr11-20260516T110608Z
921f093cc47b46844bf8fb48552483686c55ef6b
```

That rebuild reported focused CRDT checks, touched-file JS lint,
`git diff --check`, containment, range-diff, and diffstat evidence passing.
Treat it as structural and focused-check evidence for the known-fix prefix. It
is not final-stack fuzz validation and no longer represents the complete filing
stack because PR02A still needs a verified review branch and seed `1020002`
still needs the post-PR15C repair decision.

The latest `novelty-status.md` snapshot was updated at
`2026-05-16T19:19:59.519Z` for `run-20260516T185058Z`:

```text
coverage files: 35444
total records seen: 53263
records processed this pass: 48
new behavioral feature keys this pass: 11
new CDP coverage hashes this pass: 11
current-run records by profile:
  block-gauntlet=26, common-blocks=17, async-server-blocks=23,
  session-lifecycle=16, long-session-large-doc=8, real-user-editing=17
current-run successful records by profile:
  block-gauntlet=20, common-blocks=10, async-server-blocks=20,
  real-user-editing=8, session-lifecycle=12
current-run records by transport: ws=107
current-run pre-action startup failures: common-blocks=2
current-run summary-only startup failures: common-blocks=1
enabled groups:
  novelty-ws-block-gauntlet, novelty-ws-lifecycle,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text,
  novelty-ws-async-server-blocks, novelty-ws-long-session-large-doc
paused groups:
  novelty-ws-common-blocks, due 2/17 pre-action WS discovery/startup failures
recommended groups:
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text,
  novelty-ws-block-gauntlet
current-output triage roots: 6
current-output state files: 6
current-output signatures: 76
likely-real visible: 0
likely-real merged duplicates: 24
oracle/noise questions: 0
normalization-noise candidates: 4
bootstrap stalls: 0
top duplicate family share: 0.3026
top current semantic families:
  rest_meta_database_error=23,
  test_oracle_false_negative_marker_split_by_inline_markup=11,
  revision_restore_reverts_block_content_to_an_older_checkpoint_but_leaves_the_editor_title_at_a_newer_checkpoint_title=10,
  assertion=6,
  rtc_revision_restore_leaves_newer_collaborative_content_in_the_editor_after_restoring_an_older_revision=6,
  unknown=4, collaboration_non_convergence=3, timeout=3
historical likely-real merged duplicates: 335
historical normalization-noise candidates: 429
historical bootstrap stalls: 14433
historical top duplicate family share: 0.5492
quality issues: 0
health: ok
headroom for adding groups: no
load1: 73.00 / 64 cores
memory: 422.1G free / 492.0G total
```

At `2026-05-16T18:51:08Z`, the novelty state moved from
`run-20260516T175536Z` to `run-20260516T185058Z`, preserving coverage counters
but resetting run-local startup, pause, and quality gates. The current run has
now accumulated a larger WS-only coverage sample and 76 current-output triage
signatures. The current `0` visible likely-real count is fuzz-health evidence
only. Historical known-noise remains advisory/control-plane evidence; do not
treat it as live product failure or as final-stack validation. The latest
novelty snapshot paused `novelty-ws-common-blocks` after startup/discovery
failures, so any broad concurrency increase should wait for control-plane
cleanup or a guarded top-off.

The latest trend evidence packet was generated at `2026-05-16T19:14:12Z` from
monitor data through `2026-05-16T19:12:48Z`. It predates the later
`novelty-ws-common-blocks` pause, so use it for trend shape, not current group
state:

```text
monitor passes: 1660
coverage files: 272 -> 35372
coverage files delta: 35100
unmet coverage goals: 24 -> 9
likely_real_max: 0
duplicate_share_current_last: 0.3378
duplicate_share_historical_last: 0.5495
summary_startup_failures_last: 0
quality_issues_last: 0
fuzz level mix: browser-e2e=32 lanes/32 groups; unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 1300581
browser-e2e execution: 68643 cumulative / 5972 per-hour
unit-property execution: 1168364 cumulative / 120400 per-hour
coverage-guided-lower-level execution: 60568 cumulative / 28160 per-hour
load1: 81.59 / 64 cores
memory: 429.0G free
```

Largest remaining coverage gaps in the later novelty snapshot are
`reload-post-action` (`571/1000`), `ui-heading-shortcut` (`591/1000`),
title-save-reload (`193/500` and `193/200`), body-save-reload (`252/500`),
successful real-user-editing records (`319/500`), `ui-format-paragraph`
(`870/1000`), `core/html` (`428/500`), and `core/details` (`482/500`).

This is useful fuzz-health and control-plane evidence. It is not final-stack
validation for filing.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T191336Z-synthesis.md`. Its consensus:

- Filing remains blocked because the current `PR01` through `PR15C` stack is
  only a known-fix prefix.
- Use the `20260516T181934Z` `ready/rtc-*` allow-list, including PR02A, as the
  prefix source.
- Append a new narrow post-PR15C seed `1020002` WebSocket/Yjs repair PR unless
  the active job proves exact same-source ownership in an existing ready head.
- Keep revision-restore marker retention including seed `5500002` and active
  lifecycle seed `970001` triage, reload hydration, pre-save live collapse,
  rich-text suffix corruption, malformed-save residuals, HTTP room-isolation
  residuals, seed `7410083`, and possible seed `5200001` queued behind
  `1020002`.
- Launch no new automatic Codex or fuzzing jobs now.
- A read-only check still shows the caller/base-provenance successor report
  missing, and the corresponding tmux session is still active.

The latest split feedback action file is
`pr-split-20260516T190541Z-feedback-action.md`; it added the Cycle 184
consensus to `current-pr-split.md`, kept seed `1020002` as the required narrow
post-PR15C repair unless caller/base provenance proves exact ownership in an
existing ready head, recorded the active caller/base-provenance diagnostic as
the only bounded next action, and launched no new jobs.

The latest duplicate/noise synthesis is
`duplicate-noise-20260516T190835Z-synthesis.md`. It classifies the remaining
duplicate/noise issue as control-plane accounting, primarily in
`bin/rtc-browser-fuzz-novelty-monitor.mjs`: non-actionable signatures such as
`known-infra`, `bootstrap-stall`, stale/source-suppressed records, and
analysis-gated duplicates are still counted as ordinary current-run signatures.
That lets known noise, currently `rest_meta_database_error`, dominate
duplicate/noise policy even though strict startup suppression is clean in the
current run. The smallest safe next fix is to split raw noise volume from
actionable triage yield, compute duplicate-family share and policy decisions
from actionable current-run signatures, and narrowly canonicalize the
persisted-preferences/database-noise pattern without hiding broader REST/meta
or database failures with product evidence.

The latest duplicate/noise feedback action file,
`duplicate-noise-20260516T190835Z-feedback-action.md`, is empty. The latest
non-empty duplicate/noise feedback action remains
`duplicate-noise-20260516T183238Z-feedback-action.md`. It implemented the
bounded control-plane fix:

- capped first-tier analysis to `RTC_FUZZ_ANALYSIS_MAX_PER_FAMILY=1` by
  default and made family-capped jobs terminal/non-actionable;
- propagated high-confidence non-actionable family gates through triage while
  preserving product-evidence failures;
- made live analysis ignore capped, suppressed, and stale tier jobs, clean
  inactive run state, avoid stale-root sessions, and start deep analysis only
  after first-tier completed candidates request it;
- scoped novelty current-run accounting to active supervisor run dirs instead
  of the whole output root;
- counted suppressed strict startup noise even when signatures exist.

Validation for that completed duplicate/noise action:

```text
node --check passed:
  rtc-browser-fuzz-novelty-monitor.mjs
  rtc-browser-fuzz-analysis-tier.mjs
  rtc-browser-fuzz-deep-analysis-tier.mjs
  rtc-browser-fuzz-live-analysis-monitor.mjs
  rtc-browser-fuzz-triage-watcher.mjs

active triage consumer-path check:
  files=7
  signatures=22
  strictZeroEvidenceQueued=0
  strictZeroEvidenceNonActionable=7
  statuses: known-infra=12, queued=10

active analysis-tier check:
  jobs=4
  maxJobsPerFamily=1
```

The action also killed stale `rtc-coverage-guided-analysis*` sessions attached
to old root `run-20260516T175536Z`, ran a bounded live-analysis pass against
active root `run-20260516T185058Z`, started persistent
`rtc-coverage-guided-analysis` for that active root, verified child sessions
export `RTC_FUZZ_ANALYSIS_MAX_PER_FAMILY=1`, and aligned novelty/supervisor to
`run-20260516T185058Z`.

Remaining duplicate/noise risk: active triage still has actionable
`unknown`/`assertion`/`timeout` style failures. Those are intentionally left
visible because they include product evidence such as users, actions,
reload/save/fault context. Current novelty still reports duplicate share from
known/non-actionable signatures; the latest synthesis says the next safe fix is
an actionability filter in novelty-monitor accounting, not broader product
suppression.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older PR13
GitHub-facing review-ref warnings and then-current constrained group mix are
superseded by the `2026-05-16T19:21:07Z` branch-link audit and the
`2026-05-16T19:19:59Z` novelty snapshot. The audit verifies the repaired PR13
review refs listed above, while the novelty snapshot still does not count as
final-stack validation.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Dropped PR 6B save snapshot/no-op guard | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | dropped from filing path and allow-list after corrected replay classification | Do not rerun as the next gate; track seed `5500002` separately as revision-restore marker retention if it reproduces cleanly |
| Revision-restore marker retention | seed `5500002`; active lifecycle seed `970001` triage | queued behind seed `1020002`; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| PR 6C malformed evaluated save content | no verified filing branch | blocked/deferred pending focused Jest, lint, and replay evidence | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR 8A is revived |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond dropped PR 6B and isolated PR 6C candidate | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| Seed `1020002` WebSocket marker divergence | completed `143821Z`, `151306Z`, `153219Z`, `160617Z`, `172434Z`, and `180529Z` reports; active `185531Z` caller/base-provenance diagnostic | active final-stack blocker; page 0 still misses marker `async-server-1020002-0-1-589451` while page 1/relay retain it | Consume the caller/base-provenance report, require focused seed `1020002` to pass or be explicitly reclassified, then shape a new post-PR15C PR with a verified branch link before filing |
| Seed `7410083` final-persistence `_crdt_document` absence | queued by latest split persona | queued behind seed `1020002`; no automatic PR slot | Triage only after `1020002` is repaired, reclassified, and the rebuilt stack is available |
| Possible seed `5200001` same-user reload stale title/body | queued by latest split persona | possible follow-up only; no automatic PR slot | Deep-triage after `1020002` if it remains visible on the rebuilt stack |
| PR 16 valid-block `originalContent` candidate | seed replay candidate only | blocked/deferred; latest split synthesis says it is not part of the filing stack | Replay and classify the seed before considering any product branch or verified branch link |
| HTTP smoke `rest_crdt_document_stale` | final-stack bootstrap repair reached one HTTP action before this signal | separate triage signal; not split coverage and not a final-stack fuzz pass | Classify separately after the seed `1020002` repair/split decision |
| Broader HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; PR02A sidecar has no verified branch link yet | PR02A is in the current split recommendation, but broader room-isolation residuals stay deferred until focused evidence narrows them | Audit a PR02A review branch before filing; promote additional residuals only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2/2A |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use the explicit `ready/rtc-*` prefix from the `20260516T181934Z`
   finalization report. Do not wildcard import or file `final/rtc-pr*`.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered
   PR13 refs, dropped PR 6B, PR 6C, PR16 seed-replay candidates, dirty evidence
   branches, and the untracked reload-hydration gate spec out of filing
   branches and push allow-lists.
3. Push/import and audit PR02A plus individual PR 5A/5B/5C, PR 8A, and
   PR11A-E review branches, or keep the table rows marked
   `No verified branch link yet`.
4. Use the repaired audited PR13A/B/C review refs for maintainer-facing PR13
   links until the green PR13B0/B1/B2/B3 subheads have verified audit rows.
5. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
6. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the actual filing repo.
7. Rerun focused checks, touched-file lint, and `git diff --check` on every
   imported/rebased branch.
8. Keep dirty analysis-only artifacts out of product PR branches.
9. Consume the active `1020002` caller/base-provenance diagnostic report.
   Require the focused seed gate to pass or be explicitly reclassified, then
   shape the new post-PR15C repair PR and add a verified branch link before
   filing.
10. Rebuild the combined stack from the explicit `ready/rtc-*` known-fix
   prefix, PR02A, and the new seed `1020002` repair PR, then rerun bounded
   final-stack validation against the rebuilt stack. Count it only if it
   reaches action-level product coverage.
11. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy, but do not add broad
lanes while the seed `1020002` diagnostic is active. The latest remote status,
novelty, and trend packets show current fuzz health with zero visible
likely-real failures, one current common-blocks WS startup/discovery pause, and
a remaining duplicate/noise accounting issue in novelty-monitor actionable
triage yield. None of that is final-stack fuzz validation, and none of it
unblocks filing.
