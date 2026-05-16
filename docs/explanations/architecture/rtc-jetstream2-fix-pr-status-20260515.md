# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T22:51:14Z`

Trigger event:
`pr-split-2026-05-16T22-49-56Z-20260516T224352Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T22-49-56Z-20260516T224352Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The latest completed split-persona synthesis,
`pr-split-20260516T224352Z-synthesis.md`, keeps the known-fix prefix but
continues to replace the tail with explicit pass/drop,
repair/reclassification, and residual source-reduction gates:

```text
ready PR01-PR15C + PR02A
-> PR16 malformed-save seed 950109 diagnostic, then pass/drop
-> PR17 seed 1020002 follower-side Yjs update-application
   repair or reclassification
-> strict-expansion residual source-reduction gate
-> PR18x only for source-reduced uncovered product owners
-> rebuilt combined validation stack
-> focused seed 1020002 gate
-> final-stack fuzz and filing
```

The split is not filing-ready. PR16 is still held: the root-filesystem recovery
wrapper completed and recovered `/` to roughly `42G` free, but the latest
focused seed `950109` work still failed and needs product-vs-infra
localization. Do not publish PR16 until a single-seed diagnostic either proves a
maintainer-sized product fix and replay pass or gives enough evidence to drop or
downscope it. Cycle 198 records that the stuck interactive `wp-env destroy` tmux
session `rtc-pr16-950109-diagnostic-20260516T212950Z` was terminated, and a
bounded noninteractive replacement path remains the intended rerun script:

```text
run-rtc-malformed-save-payload-950109-diagnostic-noninteractive-destroy-20260516T215150Z.sh
```

PR17 remains a separate final-stack blocker. Latest PR17 evidence points past
merge-update emission: the relay and page 1 receive marker-bearing state, but
offline decode still points at page 0 integrating a marker-bearing update as a
deleted remote client range. Fresh browser replay still needs a healthy
`wp-env`/MySQL environment before it can verify or reclassify that boundary. Do
not fold PR17 into PR6, PR13, PR15, PR16, reload hydration, pre-save
search/live-collapse, HTTP room isolation, or rich-text work without exact
same-source proof.

The strict-expansion split audit is no longer just "launched". The latest split
synthesis reports `307` likely-real rows, `58` buckets, and `9` split-relevant
clusters. Those rows are evidence for source reduction, not PRs by themselves.
The first source-reduction target remains `live-ws-block-tree-divergence`, seed
`5700084`. The prior artifact-audit-only script was:

```text
run-rtc-strict-expansion-source-reduce-5700084-live-ws-block-tree-divergence-20260516T215150Z.sh
```

The prior `215150Z` job only completed artifact audit and says the replay was
not started. Cycle 202 launched the bounded focused replay/source-reduction
replacement:

```text
run-rtc-strict-5700084-focused-replay-20260516T224004Z.sh
```

Use or continue that job only. It still needs a real focused replay/source
reduction capture and a nonempty `report.md`. Capture both peers' block trees,
edited content, serialized content, and collaboration apply/sync logs after step
1. Compare the reduced source ownership against PR13/PR15/PR16/PR17 before
naming any PR18A.

The latest split feedback action,
`pr-split-20260516T222853Z-feedback-action.md`, is nonempty. It appended the
Cycle 202 update, kept `ready/rtc-*` PR01-PR15C plus PR02A as a known-fix prefix
only, reconfirmed the PR16/PR17/strict residual tail, recorded that rootfs
recovery completed while PR16 seed `950109` still failed, launched
`rtc-strict-5700084-focused-replay-20260516T224004Z`, and patched the split
loop so zero-byte progress-unblock reports count as no progress and reports are
written atomically. Do not launch broad final-stack fuzz, push GitHub branches
from Jetstream, or create speculative PR18x branches. Final-stack fuzz, rebuilt
combined validation, and filing stay blocked by PR16 pass/drop, PR17
repair/reclassification, and strict residual source reduction.

The latest split synthesis also flags a loop-health rule: zero-byte reports,
stale active sessions, active `1020002` work by itself, and
disk-preflight-only reports do not count as progress while actionable Parallel
Progress Gate rows exist. An active job only counts when it has fresh logs,
artifacts, a report, branch output, or a bounded replacement/downscope or
loop-repair action. Waiting only for `1020002` while other gate rows exist is a
loop bug.

The latest duplicate/noise synthesis,
`duplicate-noise-20260516T223603Z-synthesis.md`, edited no files and keeps the
same core diagnosis: duplicate/noise control is fragmented across producer,
triage, scheduler, and analysis consumers. The next control-plane pass should
make startup/bootstrap suppression run-local, product-evidence-aware, and shared
across the path; it must not use static family-name blacklists for
`late-session-awareness-stall`, `timeout`, `unknown`, or `assertion`. The latest
duplicate feedback action, `duplicate-noise-20260516T223603Z-feedback-action.md`,
is zero bytes. The latest implemented duplicate feedback action remains
`duplicate-noise-20260516T220113Z-feedback-action.md`: it aligned strict
no-product startup gating across watcher/analysis/deep/live consumers, updated
novelty current-run scope, preserved product-evidence signatures, validated the
five touched `.mjs` files with `node --check`, ran gate-only validation that
suppressed `64` startup-only records while keeping `56` product-evidence
signatures visible, and restarted novelty. This is fuzzer control-plane
remediation only; it is not product validation or a filing unblocker.

Current coverage-guided novelty and trend evidence still show `0` visible
likely-real current-run failures, but that is health/control-plane evidence
only. It is not final-stack validation.

## Branch And Ref Status

The remote status input was generated at `2026-05-16T22:51:09Z`.

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

The branch-link audit was generated at `2026-05-16T22:51:14Z` from fetched
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
| PR 16 | Malformed-save payload candidate lane | No verified branch link yet | TBD | TBD | held, not publishable; rootfs recovered but latest seed `950109` still failed; run one focused localization diagnostic, then repair, drop, or downscope before any branch link is useful |
| PR 17 | Seed `1020002` WebSocket/Yjs marker-propagation repair | No verified branch link yet | TBD | TBD | active final-stack blocker; follower-side evidence points to page 0 applying marker-bearing update as a deleted remote client range; next work is follower-side Yjs update application or proof-based reclassification |
| PR 18x | Source-reduced strict-expansion residual branches | No verified branch link yet | TBD | TBD | not speculative; strict-expansion audit found `307` likely-real rows, `58` buckets, and `9` split-relevant clusters; the `5700084` artifact-audit-only job has a bounded focused replay replacement active, so no PR18A owner is named yet |

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
collected_at_utc: 2026-05-16T22:51:09Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T224827Z
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
stack because PR02A still needs a verified review branch, PR16 needs the
focused `950109` pass/drop diagnostic, PR17 still needs the seed `1020002`
follower-side update repair or proof-based reclassification, and strict
residual source reduction is required before any PR18x is named.

The collected `raw/novelty-status.md` was updated at
`2026-05-16T22:50:04.888Z` for `run-20260516T224827Z` and reported:

```text
coverage files: 36674
total records seen: 55814
records processed this pass: 32
current-run records by profile: {}
current-run triage roots: 1
current-run raw/actionable signatures: 0 / 0
visible likely-real failures: 0
unmet coverage goals: 7
quality issues: 1
health warning: no behavioral coverage files found under the new output dir
```

Enabled groups:

```text
novelty-ws-persistence-no-title
```

Paused groups:

```text
novelty-ws-real-user-editing
novelty-ws-real-user-rich-text
novelty-ws-lifecycle
novelty-http-persistence-probe
```

Current-run novelty is clean of visible likely-real failures, but the new run
root has not yet produced current-run behavioral records. This is fuzz-health
and control-plane evidence only. Recent changes show the supervisor restarted
on `run-20260516T224827Z`, high-noise WS and HTTP expansion groups are on sticky
known-noise cooldowns until each profile reaches successful current-run records,
and `novelty-ws-block-gauntlet` is still skipped because its recent
triage-duplicate-noise cooldown is active. Do not count this as final-stack
validation.

The latest trend evidence packet was generated at `2026-05-16T22:44:59Z` from
monitor data through `2026-05-16T22:42:54Z`:

```text
monitor passes: 1733
coverage files: 272 -> 36636
coverage files delta: 36364
unmet coverage goals: 24 -> 7
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3465
summary_startup_failures_last: 0
quality_issues_last: 1
fuzz level mix: browser-e2e=26 lanes/26 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 2118726
browser-e2e execution: 89210 cumulative / 1928 per-hour
unit-property execution: 1848624 cumulative / 240800 per-hour
coverage-guided-lower-level execution: 177886 cumulative / 32512 per-hour
load1/load5/load15: 34.41 / 34.33 / 35.34 on 64 cores
memory: 437.9G free
```

Largest remaining coverage gaps in the latest novelty status are
`reload-post-action` `613/1000`, `ui-heading-shortcut` `641/1000`,
title-save-reload `225/500`, body-save-reload `284/500`, successful
real-user-editing records `346/500`, `ui-format-paragraph` `920/1000`, and
`core/html` `471/500`.

This is useful health and coverage evidence. It is not final-stack validation
for filing.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T224352Z-synthesis.md`. It keeps `PR01` through `PR15C` plus
PR02A as a known-fix prefix, then requires:

- treat rootfs recovery as completed, with `/` recovered to about `42G` free,
  but keep environment health as a precondition for replay evidence;
- consume PR16 focused seed `950109` diagnostics before PR16 can remain in the
  filing stack; the latest `950109` replay still failed and needs
  product-vs-infra localization;
- consume PR17 seed `1020002` follower-side Yjs update-application diagnostics
  before PR17 can be repaired or proof-classified;
- use or continue the active `5700084` focused replay/source-reduction job and
  require a nonempty `report.md`; launch only one bounded replacement if that
  job exits without a usable report;
- continue branch publication/push-manifest work and deferred-family
  promotion/downscope work in parallel instead of serializing every path behind
  `1020002`;
- rebuild combined validation only after PR16, PR17, and strict residual
  classification are resolved;
- repair the loop so zero-byte reports, missing rc files, stale active
  sessions, active `1020002` alone, and disk-preflight-only reports cannot
  satisfy the Parallel Progress Gate while actionable rows remain.

The latest split feedback action,
`pr-split-20260516T222853Z-feedback-action.md`, is nonempty. It recorded that
Cycle 202 was applied to `current-pr-split.md`, rootfs recovery completed while
PR16 seed `950109` still failed, the prior `5700084` source-reduction job still
had not run the real replay, the bounded `5700084` focused replay was launched,
and the split-review loop was hardened so zero-byte progress reports count as no
progress and progress-unblock reports are written atomically. The current split
synthesis also points at the explicit manifest
`progress-unblock-20260516T215710Z/push-manifest.tsv`, now nonempty with `34`
publish rows for local publication/fetch auditing.

The latest duplicate/noise synthesis is
`duplicate-noise-20260516T223603Z-synthesis.md`. It edited no files and
converges on fragmented control-plane scope, not a product failure: historical
startup cooldowns, first-record bootstrap classification, granular family caps,
and mixed retry/product-evidence handling can still steer current work. The
recommended next action is to make startup/bootstrap suppression run-local and
product-evidence-aware across producer, watcher, novelty scheduler, analysis
tier, deep tier, and live monitor consumers. Do not add a static blacklist for
`late-session-awareness-stall`, `timeout`, `unknown`, or `assertion`; those
families must remain visible when user/action/save/reload/fault/witness or
product-oracle evidence exists. Its matching latest feedback-action file is
zero bytes, so the last implemented duplicate/noise change is still the
`220113Z` control-plane pass.

The latest implemented duplicate feedback-action file remains
`duplicate-noise-20260516T220113Z-feedback-action.md`. It updated strict
no-product startup gating across watcher, analysis, deep-analysis, and live
monitor consumers; updated novelty current-run scoping and historical
known-noise holds; validated the five touched `.mjs` files with `node --check`;
ran gate-only validation that suppressed startup-only noise while keeping
product-evidence signatures visible; restarted novelty; and reported root disk
recovered to about `20G` free while `wp-env` remained `uninitialized` and MySQL
still exited during compose startup. Preserve all product-evidence exceptions
and do not treat this as product validation.

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
families out of the split, and make filing gates explicit. Their older PR13
review-ref warning is superseded by the `2026-05-16T22:51:14Z` branch-link
audit, which contains repaired `verified-content` PR13A/B/C review links.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Dropped PR 6B save snapshot/no-op guard | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | dropped from filing path and allow-list after corrected replay classification | Do not rerun as the next gate; track seed `5500002` separately as revision-restore marker retention if it reproduces cleanly |
| Revision-restore marker retention | seed `5500002`; active lifecycle seed `970001` triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| Possible PR03A revision-restore marker-retention sidecar | no verified filing branch; latest split synthesis calls this a strong minority signal only | not in the consensus split and not a proposed PR row yet | Run independent replay/promotion only if capacity allows; insert after PR03 only if it proves a maintainer-sized product branch, otherwise keep deferred |
| PR 16 malformed-save payload candidate lane | `deferred/rtc-malformed-save-payload-20260516T215029Z` at `2270c2e955a`; no verified filing branch; stuck `rtc-pr16-950109-diagnostic-20260516T212950Z` terminated; `run-rtc-malformed-save-payload-950109-diagnostic-noninteractive-destroy-20260516T215150Z.sh` preserved the bounded rerun path | independent conditional lane, not filing-ready and not the dropped PR 6B candidate; latest built-assets replay is `1 passed` / `7 failed`; rootfs recovered to about `42G`, but the latest seed `950109` replay still failed and needs product-vs-infra localization | Run a fresh single-seed `950109` diagnostic with isolated `wp-env`, no retries, and immediate browser/container logs; then decide repair vs drop/downscope and require focused Jest/lint/replay evidence plus a verified branch link before PR16 can stay in the filing stack |
| PR 6C malformed evaluated save content | no verified filing branch | superseded by the broader PR16 candidate-lane decision unless focused evidence narrows it again | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR 8A is revived |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; latest local candidate `deferred/rtc-reload-hydration-20260516T212023Z`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Strict-expansion residual source reduction / PR18x | `strict-expansion-20260516T165042Z`; audit found `307` likely-real rows, `58` buckets, and `9` split-relevant clusters; `run-rtc-strict-expansion-source-reduce-5700084-live-ws-block-tree-divergence-20260516T215150Z.sh` completed only artifact audit and did not start replay; Cycle 202 launched `run-rtc-strict-5700084-focused-replay-20260516T224004Z.sh` | required source-reduction gate before final validation; not itself a PR and not speculative filing content | Use/continue the focused `5700084` replay, capture both peers' block trees/content/apply logs, and compare ownership against PR13/PR15/PR16/PR17 before naming PR18A; if it exits without a usable report, launch exactly one bounded replacement; continue with `5200001`, `5200101`, `5400020`/`5600031`, and `5500003` |
| Reload/rejoin unsaved-edits UI repro (`PR18` idea) | Tptacek reload/rejoin gate from split synthesis history | evidence-only and lower priority; not a consensus PR slot by itself | Run only as a bounded UI repro job; promote only if a real UI repro proves the family and source reduction supports a branch-sized fix |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; latest diagnostic `deferred/rtc-pre-save-search-collapse-20260516T213525Z`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff`; latest diagnostic `deferred/rtc-rich-text-formatted-suffix-20260516T213527Z` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals outside PR16 | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | still not fixed or filing-ready outside the conditional PR16 lane | Keep broader residuals deferred until a source-level `saveEntityRecord()` / `prePersistPostType()` repro proves clean local blocks but malformed evaluated outgoing `content` |
| Seed `1020002` WebSocket marker divergence | completed `143821Z`, `151306Z`, `153219Z`, `160617Z`, `172434Z`, `180529Z`, `185531Z`, merge-update-emission reports, and follower-side update evidence from `rtc-pr17-1020002-follower-update-20260516T213345Z` | active PR17/final-stack blocker; no verified filing branch exists; latest report confirms relay/page 1 marker-bearing state while offline decode points at page 0 applying the remote client range as deleted | Run one bounded follower-side update-application replay with the diagnostic provider patch, repair or proof-classify the Yjs update path, require focused seed `1020002` to pass or be explicitly reclassified, then shape PR17 with a verified branch link before filing |
| Seed `7410083` final-persistence `_crdt_document` absence | queued by split persona | queued behind seed `1020002`; no automatic PR slot | Triage only after `1020002` is repaired, reclassified, and the rebuilt stack is available |
| Possible seed `5200001` same-user reload stale title/body | queued by split persona and strict-expansion source-reduction order | possible follow-up only; no automatic PR slot | Deep-triage after `1020002` unless strict-expansion source reduction proves a separate branch-sized family |
| Old PR16 valid-block `originalContent` candidate | seed replay candidate only | still blocked/deferred; distinct from the new malformed-save PR16 lane | Replay and classify the seed before considering any product branch or verified branch link |
| HTTP smoke `rest_crdt_document_stale` | final-stack bootstrap repair reached one HTTP action before this signal | separate triage signal; not split coverage and not a final-stack fuzz pass | Classify separately after the seed `1020002` repair/split decision |
| Broader HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; latest companion `deferred/rtc-http-room-isolation-companion-20260516T215031Z`; PR02A local ready head exists but has no remote verified branch link yet | PR02A is in the current split recommendation, but broader room-isolation residuals stay deferred until focused evidence narrows them | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2/2A |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Verify environment health first. Rootfs recovery now appears completed with
   `/` at roughly `42G` free, but `wp-env`/MySQL/REST health must still be
   proven before replay evidence counts. A `disk-preflight-blocked` report,
   zero-byte report, missing rc file, or stale active session is not durable
   progress while actionable Parallel Progress Gate rows remain.
2. Use the explicit `ready/rtc-*` prefix from the `20260516T181934Z`
   finalization report. Do not wildcard import or file `final/rtc-pr*`.
3. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered
   PR13 refs, dropped PR 6B, PR 6C, old PR16 seed-replay candidates, dirty
   evidence branches, and the untracked reload-hydration gate spec out of
   filing branches and push allow-lists.
4. Publish/fetch only the explicit `34` rows from the progress-unblock
   `push-manifest.tsv` if doing branch publication. Push/import and audit PR02A
   plus individual PR 5A/5B/5C, PR 8A, and PR11A-E review branches, or keep the
   table rows marked `No verified branch link yet`.
5. Use the repaired audited PR13A/B/C review refs for maintainer-facing PR13
   links until any finer PR13 subheads have verified audit rows.
6. Run a fresh single-seed PR16 `950109` localization diagnostic with isolated
   `wp-env`, no retries, and immediate browser/container logs. Decide repair vs
   drop/downscope before PR16 can stay in the stack. Add a verified branch link
   before filing it.
7. Consume the PR17 follower-side Yjs update application evidence and run at
   most one bounded follow-up with the diagnostic provider patch. Require the
   focused seed gate to pass or be explicitly reclassified, then shape PR17 and
   add a verified branch link before filing.
8. Complete the strict-expansion `5700084` source-reduction replay before final
   validation. Capture both peers' block trees, edited content, serialized
   content, and collaboration apply/sync logs. Add PR18x branches only for
   source-reduced uncovered product families, and give every added row a
   verified branch link or `No verified branch link yet`.
9. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
10. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
11. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
12. Keep dirty analysis-only artifacts out of product PR branches.
13. Rebuild the combined stack from the explicit `ready/rtc-*` known-fix
    prefix, PR02A, the accepted PR16 decision, the PR17 `1020002` decision, and
    any accepted PR18x branches, then rerun bounded final-stack validation
    against the rebuilt stack. Count it only if it reaches action-level product
    coverage.
14. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue only where healthy, and
strict-expansion source reduction is an allowed analysis gate after the
environment preflight is healthy. Do not run broad/final-stack fuzz while the
PR16/PR17 decisions, strict residual source reduction, and rebuilt validation
are open. Current collected inputs show zero visible likely-real failures in
coverage-guided novelty and trend evidence, with historical bootstrap noise
separated from current live product evidence, but the current run still has no
current-run behavioral records under the latest output dir and only one enabled
novelty group. None of this is final-stack fuzz validation or a filing
unblocker.
