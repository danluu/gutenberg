# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T21:25:58Z`

Trigger event:
`pr-split-2026-05-16T21-20-55Z-20260516T211251Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T21-20-55Z-20260516T211251Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The latest completed split-persona synthesis,
`pr-split-20260516T211251Z-synthesis.md`, keeps the known-fix prefix but changes
the tail. Do not go directly from PR16/PR17 into final validation/fuzz. Insert a
strict-expansion residual split-audit gate first:

```text
ready PR01-PR15C known-fix prefix, plus PR02A as the PR02 sidecar
-> conditional PR16 malformed-save payload candidate
-> separate PR17 seed 1020002 WebSocket/Yjs merge-update-emission repair/reclassification
-> strict-expansion residual split audit gate
-> PR18x source-reduced branches only for confirmed uncovered families
-> rebuilt combined validation stack
-> focused seed 1020002 gate
-> final-stack fuzz and filing
```

That is a known-fix prefix plus a conditional tail, not a complete filing
stack. PR16 is not publishable. The latest synthesis says the built-assets
replay produced `1 passed` and `7 failed`; seed `950109` reached product
actions and failed before `wp-env` stopped. Treat PR16 as blocked pending a
focused `950109` localization and a repair/drop/downscope decision, not as a
ready branch.

PR17 remains separate and unfixed. Seed `1020002` is still the WebSocket/Yjs
marker-propagation blocker. Do not fold it into PR6, PR13, PR15, PR16, reload
hydration, pre-save search/live-collapse, HTTP room-isolation, or rich-text
work without exact same-source proof. The active PR17 diagnostic is the
source-side normalized semantic-helper overlay plus `try`/`catch`/`finally`
instrumentation around `mergeYBlocksStaleBaseSemanticInsert`.

The new strict-expansion residual split-audit gate is analysis-only until it
source-reduces an uncovered family. Candidate PR18x branches must come from
confirmed residuals, especially live WebSocket block-tree divergence,
same-user/reload loss, post-save non-convergence, revision-restore leakage, and
awareness/reconnect stalls.

Cycle 194 also fixed split-loop progress hygiene. The loop now throttles
duplicate singleton-lock rejection logs, recognizes job-health/hygiene
artifacts as independent progress, and requires fresh logs, reports, manifests,
branch output, or one bounded replacement/downscope/loop-repair job before a
pre-existing non-`1020002` job satisfies the Parallel Progress Gate.

The latest duplicate/noise feedback action completed a bounded fuzzer-side
control-plane patch, not a product-code change. It mapped
`novelty-http-persistence-probe` to `persistence-no-title`, added a strict
startup cap, bumped run-local noise policy to `6`, removed the global
`likelyRealVisible` bypass from sticky noise cooldown, added the HTTP
persistence probe to strict startup pause ordering, and restarted the novelty
and analysis monitors. Validation from that action:

```text
node --check bin/rtc-browser-fuzz-novelty-monitor.mjs: exit 0
previous root live-analysis --once: active=0
fresh live-analysis: one block-gauntlet session with product evidence
HTTP persistence probe: skipped as no actionable signature
```

This improves duplicate/noise scheduling and analysis accounting. It is not
final-stack validation and does not unblock filing.

## Branch And Ref Status

The remote status input was generated at `2026-05-16T21:25:54Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6A, PR 8A, PR 15A/15B/15C, fallback-group
evidence, and final branch claims unless it is deliberately copied into a clean
evidence worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack has modified product/test files and many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-16T21:25:58Z` from fetched
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
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | 1 | +115 / -0 | local ready head exists per progress-unblock audit; publish/fetch/audit a remote review branch or fold/restack before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes dropped PR 6B and broader malformed-save residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A |
| PR 8A | Narrow title reload replacement | No verified branch link yet | TBD | TBD | broad verified PR 8 is prior art only; shape a narrow title-reload branch only if revived |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | green in validation-stack rebuild; local ready head still needs remote verified-content branch link |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; keep in known-fix prefix |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first maintainer-facing PR13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; carries the source-retirement delta |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; third maintainer-facing PR13 delta |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; keep after PR13 source sequence |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 16 | Malformed-save payload candidate lane | No verified branch link yet | TBD | TBD | conditional lane; latest replay is `1 passed` / `7 failed`, with seed `950109` needing focused localization before PR16 can stay in the stack |
| PR 17 | Seed `1020002` WebSocket/Yjs marker-propagation repair | No verified branch link yet | TBD | TBD | active final-stack blocker; source-side merge-update-emission instrumentation still must produce a repair branch or proof-based reclassification |
| PR 18x | Source-reduced strict-expansion residual branches | No verified branch link yet | TBD | TBD | not speculative; add only after strict-expansion split audit proves uncovered product families and branch-sized fixes |

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
collected_at_utc: 2026-05-16T21:25:54Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T211759Z
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
stack because PR02A still needs a verified review branch, PR16 needs a
focused `950109` localization, PR17 still needs the seed `1020002` repair or
proof-based reclassification, and the strict-expansion residual split audit is
now required before final validation.

The collected `raw/novelty-status.md` is now non-empty for
`run-20260516T211759Z`. It was updated at `2026-05-16T21:24:51.315Z` and
reported:

```text
coverage files: 36345
total records seen: 55061
current-run records: 5
current-run successful records: 0
current-run triage roots: 4
current-run raw/actionable signatures: 0 / 0
visible likely-real failures: 0
unmet coverage goals: 7
health: ok
```

Enabled groups:

```text
novelty-ws-lifecycle
novelty-ws-persistence-no-title
novelty-ws-real-user-editing
novelty-ws-real-user-rich-text
novelty-http-persistence-probe
```

Paused group:

```text
novelty-ws-block-gauntlet: 2/2 strict pre-action discovery/startup failures
```

The current-run novelty status is clean of visible likely-real failures, but
there are no successful current-run records yet. This is fuzz-health and
control-plane evidence only.

The latest trend evidence packet was generated at `2026-05-16T21:19:13Z` from
monitor data through `2026-05-16T21:16:21Z`:

```text
monitor passes: 1701
coverage files: 272 -> 36295
coverage files delta: 36023
unmet coverage goals: 24 -> 7
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3535
summary_startup_failures_last: 0
quality_issues_last: 0
fuzz level mix: browser-e2e=31 lanes/31 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 1734920
browser-e2e execution: 81786 cumulative / 1740 per-hour
unit-property execution: 1527156 cumulative / 57792 per-hour
coverage-guided-lower-level execution: 122972 cumulative / 8192 per-hour
load1/load5/load15: 69.99 / 69.7 / 72.23 on 64 cores
memory: 429.7G free
```

Largest remaining coverage gaps in that packet are `reload-post-action`
`610/1000`, `ui-heading-shortcut` `633/1000`, title-save-reload `223/500`,
body-save-reload `282/500`, successful real-user-editing records `346/500`,
`ui-format-paragraph` `915/1000`, and `core/html` `463/500`.

This is useful fuzz-health and control-plane evidence. It is not final-stack
validation for filing.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T211251Z-synthesis.md`. It changes the tail by adding a
strict-expansion residual split-audit gate before final validation/fuzz:

- Keep `PR01` through `PR15C` plus PR02A as a known-fix prefix, not a
  filing-ready final stack.
- Keep PR13 logically as the green source sequence `13A`, `13B0`, `13B1`,
  `13B2`, and `13B3`, followed by PR14 and PR15A-C. The table still uses the
  repaired audited PR13A/B/C links because those are the current
  `verified-content` PR13 links.
- Keep conditional PR16 malformed-save payload work independent, but block it
  on focused seed `950109` localization after the latest built-assets replay
  produced `1 passed` and `7 failed`.
- Keep PR17 as the seed `1020002` WebSocket/Yjs marker-propagation repair
  unless exact same-source ownership by an existing ready PR is proven.
- Add a strict-expansion likely-real split audit before rebuilding the combined
  validation stack. Create PR18x branches only for source-reduced, uncovered
  product families, not for speculative residuals.
- Treat the PR03A revision-restore proposal as a strong minority signal, not a
  consensus PR row.
- Treat Tptacek's PR18 reload/rejoin gate as evidence-only until a real UI
  repro proves a distinct product bug.
- After PR16, PR17, and the strict-expansion audit are decided, rebuild the
  combined validation stack, run the focused `1020002` gate, then run final
  stack fuzz.

The latest split synthesis recommends two bounded next actions, not broad
final-stack fuzz:

```text
strict-expansion split audit root:
/media/volume/danluu-fuzz-data/rtc-fuzz-strict-expansion-20260515/runs/strict-expansion-20260516T165042Z

focused PR16 diagnostic:
seed 950109, using the command in the new PR16 report
```

The latest non-empty split feedback action,
`pr-split-20260516T210039Z-feedback-action.md`, recorded Cycle 194 in the
remote split report, kept the same conditional topology, confirmed PR16 is the
current non-`1020002` Parallel Progress Gate lane, and patched
`rtc-pr-split-review-loop.sh` to require fresh non-`1020002` evidence or a
bounded replacement/downscope/loop-repair job. It launched and completed:

```text
rtc-prsplit-loop-progress-hygiene-20260516T210900Z
rtc-prsplit-loop-progress-hygiene-20260516T210900Z-rerun
```

Final report:
`/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T210039Z/jobs/outputs/rtc-prsplit-loop-progress-hygiene-20260516T210900Z/report.md`

The action recorded these then-active sessions:

```text
rtc-malformed-save-payload-202017-built-assets-restack-replay-20260516T204851Z
rtc-ws-seed-1020002-merge-semantic-exit-instrumentation-20260516T204851Z
```

The newer `211251Z` synthesis supersedes the PR16 part of that status: a PR16
report appeared, but it is not a pass. It requires focused `950109`
localization before PR16 can remain in the stack.

The latest duplicate/noise synthesis and feedback action are
`duplicate-noise-20260516T205241Z-synthesis.md` and
`duplicate-noise-20260516T205241Z-feedback-action.md`. The synthesis converged
on a control-plane duplicate/noise leak: strict `pre_action_bootstrap_stall`
signatures are mostly suppressed downstream, but producer pause logic,
novelty/live accounting, and analysis gating did not share an effective
semantic decision model. The paired action implemented the narrow first
fuzzer-side patch described in the executive status and restarted the
coverage-guided novelty/analysis services. Product-evidence failures remain
visible by design.

Earlier duplicate/noise actions remain relevant control-plane history:

- `201946Z` made duplicate/noise pauses sticky, wrote
  `.triage-watcher/no-analysis.json` for producer-side no-product-evidence
  groups, and taught triage/analysis/deep/live consumers to honor it while
  preserving product-evidence failures.
- `194153Z` made source state authoritative across watcher and novelty
  accounting.
- `190835Z` separated raw/actionable signatures and kept known-infra REST/meta
  noise out of the binding productive duplicate-share gate.
- `183238Z` capped first-tier analysis by family, propagated high-confidence
  non-actionable gates, scoped current-run accounting to active run dirs, and
  cleaned stale old-root analysis sessions.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older
PR13-ref warnings and then-current constrained group mix are superseded by the
`2026-05-16T21:25:58Z` branch-link audit and the latest collected fuzz state.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Dropped PR 6B save snapshot/no-op guard | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | dropped from filing path and allow-list after corrected replay classification | Do not rerun as the next gate; track seed `5500002` separately as revision-restore marker retention if it reproduces cleanly |
| Revision-restore marker retention | seed `5500002`; active lifecycle seed `970001` triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| Possible PR03A revision-restore marker-retention sidecar | no verified filing branch; latest split synthesis calls this a strong minority signal only | not in the consensus split and not a proposed PR row yet | Run independent replay/promotion only if capacity allows; insert after PR03 only if it proves a maintainer-sized product branch, otherwise keep deferred |
| PR 16 malformed-save payload candidate lane | `deferred/rtc-malformed-save-payload-20260516T202017Z` at `2270c2e955a`; no verified filing branch | independent conditional lane, not filing-ready and not the dropped PR 6B candidate; latest built-assets replay is `1 passed` / `7 failed` and seed `950109` reached product actions before failing | Run the focused `950109` diagnostic from the new PR16 report, decide repair vs drop/downscope, then require focused Jest/lint/replay evidence and a verified branch link before PR16 can stay in the filing stack |
| PR 6C malformed evaluated save content | no verified filing branch | superseded by the broader PR16 candidate-lane decision unless focused evidence narrows it again | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR 8A is revived |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Strict-expansion residual split audit / PR18x | `strict-expansion-20260516T165042Z`; no verified filing branch | new audit gate before final validation; not itself a PR and not speculative filing content | Source-reduce likely-real strict-expansion residuals; add PR18x rows only for confirmed uncovered product families with branch-sized fixes |
| Reload/rejoin unsaved-edits UI repro (`PR18` idea) | Tptacek reload/rejoin gate from latest split synthesis | evidence-only and lower priority; not a consensus PR slot by itself | Run only as a bounded UI repro job; promote only if a real UI repro proves the family and the strict-expansion audit supports a source-reduced branch |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals outside PR16 | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | still not fixed or filing-ready outside the conditional PR16 lane | Keep broader residuals deferred until a source-level `saveEntityRecord()` / `prePersistPostType()` repro proves clean local blocks but malformed evaluated outgoing `content` |
| Seed `1020002` WebSocket marker divergence | completed `143821Z`, `151306Z`, `153219Z`, `160617Z`, `172434Z`, `180529Z`, `185531Z`, and latest merge-update-emission reports; the `185531Z` caller/base-provenance diagnostic says caller/base propagation is not the owner | active PR17/final-stack blocker; no verified filing branch exists | Consume the active source-helper/exit-instrumentation result around `mergeYBlocksStaleBaseSemanticInsert`; require focused seed `1020002` to pass or be explicitly reclassified, then shape PR17 with a verified branch link before filing |
| Seed `7410083` final-persistence `_crdt_document` absence | queued by latest split persona | queued behind seed `1020002`; no automatic PR slot | Triage only after `1020002` is repaired, reclassified, and the rebuilt stack is available |
| Possible seed `5200001` same-user reload stale title/body | queued by latest split persona | possible follow-up only; no automatic PR slot | Deep-triage after `1020002` if it remains visible on the rebuilt stack |
| Old PR16 valid-block `originalContent` candidate | seed replay candidate only | still blocked/deferred; distinct from the new malformed-save PR16 lane | Replay and classify the seed before considering any product branch or verified branch link |
| HTTP smoke `rest_crdt_document_stale` | final-stack bootstrap repair reached one HTTP action before this signal | separate triage signal; not split coverage and not a final-stack fuzz pass | Classify separately after the seed `1020002` repair/split decision |
| Broader HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; PR02A local ready head exists but has no remote verified branch link yet | PR02A is in the current split recommendation, but broader room-isolation residuals stay deferred until focused evidence narrows them | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2/2A |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use the explicit `ready/rtc-*` prefix from the `20260516T181934Z`
   finalization report. Do not wildcard import or file `final/rtc-pr*`.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered
   PR13 refs, dropped PR 6B, PR 6C, old PR16 seed-replay candidates, dirty
   evidence branches, and the untracked reload-hydration gate spec out of
   filing branches and push allow-lists.
3. Publish/fetch only the explicit `33` rows from the progress-unblock
   `push-manifest.tsv` if doing branch publication. Push/import and audit PR02A
   plus individual PR 5A/5B/5C, PR 8A, and PR11A-E review branches, or keep the
   table rows marked `No verified branch link yet`.
4. Use the repaired audited PR13A/B/C review refs for maintainer-facing PR13
   links until the green PR13B0/B1/B2/B3 subheads have verified audit rows.
5. Consume the latest PR16 malformed-save built-assets replay report. Because
   it produced `1 passed` and `7 failed`, run the focused seed `950109`
   diagnostic from that report and decide repair vs drop/downscope before PR16
   can stay in the stack. Add a verified branch link before filing it.
6. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
7. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the actual filing repo.
8. Rerun focused checks, touched-file lint, and `git diff --check` on every
   imported/rebased branch.
9. Keep dirty analysis-only artifacts out of product PR branches.
10. Consume the active PR17 source-helper/exit-instrumentation result around
    `mergeYBlocksStaleBaseSemanticInsert`. Require the focused seed gate to
    pass or be explicitly reclassified, then shape PR17 and add a verified
    branch link before filing.
11. Run the strict-expansion residual split audit before final validation. Add
    PR18x branches only for source-reduced uncovered product families, and give
    every added row a verified branch link or `No verified branch link yet`.
12. Rebuild the combined stack from the explicit `ready/rtc-*` known-fix
    prefix, PR02A, the accepted PR16 decision, the PR17 `1020002` decision, and
    any accepted PR18x branches, then rerun bounded final-stack validation
    against the rebuilt stack. Count it only if it reaches action-level product
    coverage.
13. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy, and the
strict-expansion audit is an allowed analysis gate. Do not run broad/final-stack
fuzz while the PR16/PR17 decisions and residual audit are open. The latest
collected inputs show zero visible likely-real failures in current novelty and
trend evidence, with historical bootstrap noise separated from current live
product evidence. None of this is final-stack fuzz validation or a filing
unblocker.
