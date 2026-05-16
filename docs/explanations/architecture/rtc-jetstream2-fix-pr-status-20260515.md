# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T23:21:27Z`

Trigger event:
`pr-split-2026-05-16T23-20-38Z-20260516T231356Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T23-20-38Z-20260516T231356Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The latest completed split-persona synthesis,
`pr-split-20260516T231356Z-synthesis.md`, keeps the known-fix prefix but
continues to replace the tail with explicit pass/drop,
repair/reclassification, source comparison, and residual source-reduction
gates:

```text
ready PR01-PR15C + PR02A known-fix prefix
-> PR16 seed 950109 corrected pass/drop localization
-> PR17 seed 1020002 follower-side Yjs update application
   repair or proof-based reclassification
-> strict-expansion source comparison, starting with
   5700084 vs PR5C / ready prefix
-> PR18x only for source-reduced, uncovered families
-> rebuilt combined validation stack
-> focused 1020002 gate
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

The `231356Z` split synthesis tightens that into a corrected single-seed
pass/drop replay request:

```text
run-rtc-malformed-save-payload-950109-corrected-single-seed-replay-20260516T231356Z.sh
```

Because the matching feedback-action file is empty, there is no completed
action evidence that this newer replay has launched or passed.

PR17 remains a separate final-stack blocker. Latest PR17 evidence points past
merge-update emission: the relay and page 1 receive marker-bearing state, but
offline decode still points at page 0 integrating a marker-bearing update as a
deleted remote client range. Fresh browser replay still needs a healthy
`wp-env`/MySQL environment before it can verify or reclassify that boundary. Do
not fold PR17 into PR6, PR13, PR15, PR16, reload hydration, pre-save
search/live-collapse, HTTP room isolation, or rich-text work without exact
same-source proof.

The strict-expansion split audit is no longer just "launched". Recent split
syntheses report `307` likely-real rows, `58` buckets, and `9` split-relevant
clusters. Those rows are evidence for source reduction and ownership
comparison, not PRs by themselves. The first source-reduction target remains
`live-ws-block-tree-divergence`, seed `5700084`. The prior artifact-audit-only
script was:

```text
run-rtc-strict-expansion-source-reduce-5700084-live-ws-block-tree-divergence-20260516T215150Z.sh
```

The prior `215150Z` job only completed artifact audit and says the replay was
not started. Cycle 202 launched the bounded focused replay/source-reduction
replacement:

```text
run-rtc-strict-5700084-focused-replay-20260516T224004Z.sh
```

The latest split synthesis says the `5700084` focused report is now nonempty and
points to a `core/verse.attributes.content` live divergence: `\n` vs `<br>`.
That makes the next gate a PR5C/ready-prefix comparison, not PR18A naming. If
PR5C already covers the behavior, classify it as covered; if the behavior is an
oracle issue, drop it from product split work; if PR5C misses a real product
gap, prefer a small PR5D near the parser/rich-text equivalence series before
creating any late PR18 branch.

The latest split feedback-action file,
`pr-split-20260516T231356Z-feedback-action.md`, is zero bytes, so it is not a
completed action. The last completed split feedback action remains
`pr-split-20260516T225001Z-feedback-action.md`, which applied Cycle 204 to
`current-pr-split.md`. It completed a current-run push-manifest refresh and a
loop-progress hygiene audit. The manifest refresh wrote a `33`-row handoff
manifest: `29` ready filing-prefix refs plus `4` current deferred candidates,
with zero branch-audit failures. It intentionally excluded the held PR16
malformed-save product candidate and the downscoped malformed-save
`20260516T222038Z` row until corrected seed `950109` localization reaches
product behavior. Do not launch broad final-stack fuzz, push GitHub branches
from Jetstream, or create speculative PR18x branches. Final-stack fuzz, rebuilt
combined validation, and filing stay blocked by PR16 pass/drop, PR17
repair/reclassification, seed `5700084` classification, and strict residual
source reduction.

The `231356Z` synthesis names the useful bounded parallel work as the
`5700084` PR5C/ready-prefix comparison, corrected seed `950109` replay, and a
latest-deferred manifest refresh. It says to launch another `1020002` job only
if no equivalent active one exists. None of those count as completed in this
report unless a nonempty action report or later collected artifact proves it.

The latest split synthesis also flags a loop-health rule: zero-byte reports,
stale active sessions, active `1020002` work by itself, and
disk-preflight-only reports do not count as progress while actionable Parallel
Progress Gate rows exist. An active job only counts when it has fresh logs,
artifacts, a report, branch output, or a bounded replacement/downscope or
loop-repair action. Waiting only for `1020002` while other gate rows exist is a
loop bug.

The latest duplicate/noise synthesis,
`duplicate-noise-20260516T230450Z-synthesis.md`, still diagnoses a fuzzing
control-plane leak, not a WordPress product bug. It recommends another bounded
hardening pass for stale current-root guards, live-analysis current-output
pointer handling, strict no-product `pre_action_bootstrap_stall` gating,
semantic caps for duplicate product-evidence families, and novelty scheduling
that considers raw/pre-decision duplicate share plus bounded startup cooldowns.
It did not edit files. The last completed duplicate/noise feedback action
remains `duplicate-noise-20260516T223603Z-feedback-action.md`, which made a
bounded fuzzer-control-plane update to the watcher, analysis tier, deep
analysis tier, live monitor, and novelty monitor. Syntax checks passed for all
five touched `.mjs` files. Gate-only validation queued zero strict-startup and
zero no-product infra signatures for `ws-common-blocks`,
`ws-block-gauntlet`, and `boost-real-user-title-rich-text`, while preserving
product-evidence queues. This is fuzzer control-plane remediation only; it is
not product validation or a filing unblocker. Remaining risk: the latest
duplicate/noise synthesis still says `wp-env` health must be checked before
judging noise state.

The latest trend evidence still reports `likely_real_max: 0`, and the collected
`raw/novelty-status.md` is now nonempty. Treat the current fuzz state as health,
coverage, and control-plane evidence only, not final-stack validation.

## Branch And Ref Status

The remote status input was generated at `2026-05-16T23:21:23Z`.

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

The branch-link audit was generated at `2026-05-16T23:21:27Z` from fetched
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
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link; compare seed `5700084` here first |
| PR 5D | Conditional `core/verse` linebreak equivalence follow-up | No verified branch link yet | TBD | TBD | only if the `5700084` PR5C/ready-prefix comparison proves a real product gap that PR5C does not cover; prefer this small parser/rich-text slot before any late PR18 branch |
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
| PR 18x | Source-reduced strict-expansion residual branches | No verified branch link yet | TBD | TBD | not speculative; strict-expansion audit found `307` likely-real rows, `58` buckets, and `9` split-relevant clusters; seed `5700084` now points first to PR5C/possible PR5D/oracle classification, so no PR18A owner is named yet |

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
collected_at_utc: 2026-05-16T23:21:23Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T231717Z
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
follower-side update repair or proof-based reclassification, and seed `5700084`
must be compared against PR5C/the ready prefix before any PR18x is named.

The collected `raw/novelty-status.md` is nonempty for this update. It was
updated at `2026-05-16T23:19:07.302Z` for
`run-20260516T231717Z` and reports:

```text
coverage files: 36815
total records seen: 56159
records processed this pass: 48
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
novelty-ws-lifecycle
novelty-ws-real-user-editing
novelty-ws-real-user-rich-text
novelty-http-persistence-probe
```

Paused groups:

```text
none
```

The current detail still has no current-run behavioral records under the new
output dir and carries the same health warning. Treat `0` visible likely-real
as fuzz-health/control-plane evidence only, not a product pass and not
final-stack validation. Historical raw noise is still dominated by
`pre_action_bootstrap_stall` (`13824` raw rows, raw historical duplicate share
`0.5232`), so current-run and historical triage must stay separated.

The latest trend evidence packet was generated at `2026-05-16T23:17:31Z` from
monitor data through `2026-05-16T23:14:54Z`:

```text
monitor passes: 1746
coverage files: 272 -> 36798
coverage files delta: 36526
unmet coverage goals: 24 -> 7
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3528
summary_startup_failures_last: 0
quality_issues_last: 1
fuzz level mix: browser-e2e=30 lanes/30 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 2269654
browser-e2e execution: 90278 cumulative / 272 per-hour
unit-property execution: 1979860 cumulative / 28896 per-hour
coverage-guided-lower-level execution: 196510 cumulative / 4864 per-hour
load1/load5/load15: 47.64 / 39.38 / 37.79 on 64 cores
memory: 436.3G free
```

Largest remaining coverage gaps in the current novelty detail are
`reload-post-action` `613/1000`, `ui-heading-shortcut` `644/1000`,
title-save-reload `225/500`, body-save-reload `284/500`, successful
real-user-editing records `346/500`, `ui-format-paragraph` `922/1000`, and
`core/html` `481/500`.

This is useful health and coverage evidence. It is not final-stack validation
for filing.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T231356Z-synthesis.md`. It keeps `PR01` through `PR15C` plus
PR02A as a known-fix prefix, says the stack still needs a split change before
filing, and requires:

- treat rootfs recovery as completed, with `/` recovered to about `42G` free,
  but keep environment health as a precondition for replay evidence;
- consume PR16 corrected seed `950109` pass/drop localization before PR16 can
  remain in the filing stack; if it fails before product save behavior or
  cannot localize to product behavior, drop or downscope PR16;
- consume PR17 seed `1020002` follower-side Yjs update-application diagnostics
  before PR17 can be repaired or proof-classified; only launch another
  `1020002` job if no equivalent active one exists;
- consume the now-nonempty `5700084` focused replay result and classify the
  `core/verse.attributes.content` `\n` vs `<br>` divergence against PR5C and
  the ready prefix before naming any PR18x;
- prefer a small PR5D near the parser/rich-text series if PR5C does not cover a
  real product gap; otherwise classify the result as covered or oracle-only;
- continue branch publication/push-manifest work and deferred-family
  promotion/downscope work in parallel instead of serializing every path behind
  `1020002`;
- rebuild combined validation only after PR16, PR17, seed `5700084`, and strict
  residual classification are resolved;
- repair the loop so zero-byte reports, missing rc files, stale active
  sessions, active `1020002` alone, and disk-preflight-only reports cannot
  satisfy the Parallel Progress Gate while actionable rows remain.

The latest split feedback-action file,
`pr-split-20260516T231356Z-feedback-action.md`, is zero bytes and made no
report update. The last completed split feedback action remains
`pr-split-20260516T225001Z-feedback-action.md`, which applied Cycle 204. It
appended the current split update, completed
`rtc-push-manifest-refresh-cycle204-20260516T225001Z`, and completed
`rtc-loop-progress-hygiene-audit-cycle204-20260516T225001Z-rerun2`. The
manifest refresh wrote `33` rows: `29` ready refs plus `4` current deferred
candidates. It kept PR16 unpublished until corrected seed `950109`
localization reaches product behavior, did not duplicate the then-active
`5700084` replay, did not launch another `1020002` job, and did not launch
final-stack fuzz, rebuilt validation, or filing. The newer `231356Z` synthesis
is analysis-only, but supersedes the Cycle 204 wording that treated `5700084`
as still waiting for a nonempty report and explicitly names the bounded
`5700084` PR5C comparison and corrected `950109` replay as next actions.

The latest duplicate/noise synthesis is
`duplicate-noise-20260516T230450Z-synthesis.md`. It converges on fragmented
control-plane scope, not a product failure: stale current-root checks, bad or
stale live-analysis current-output pointers, no-product
`pre_action_bootstrap_stall` handling, detailed-family caps, and raw
pre-decision duplicate-share scheduling can still steer current work. It did
not edit files. The last completed duplicate/noise feedback action remains
`duplicate-noise-20260516T223603Z-feedback-action.md`, which implemented the
bounded control-plane pass across five fuzzer `.mjs` files. `node --check`
passed for all five. Gate-only isolated validation queued `0` strict startup
and `0` no-product infra signatures for three noisy groups while preserving
product-evidence queues of `102`, `102`, and `52`. A synthetic no-product
`ENOSPC`/`wp-env` analysis-tier case produced `analysisJobs=0`. Preserve all
product-evidence exceptions and do not treat any of this as product validation.
Remaining risk: the latest synthesis still says to check `wp-env` status before
judging noise state, and focused-shards/gap-booster live monitors may still
need restart if they remain active consumers.

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
review-ref warning is superseded by the `2026-05-16T23:21:27Z` branch-link
audit, which contains repaired `verified-content` PR13A/B/C review links.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Dropped PR 6B save snapshot/no-op guard | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | dropped from filing path and allow-list after corrected replay classification | Do not rerun as the next gate; track seed `5500002` separately as revision-restore marker retention if it reproduces cleanly |
| Revision-restore marker retention | seed `5500002`; active lifecycle seed `970001` triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| Possible PR03A revision-restore marker-retention sidecar | no verified filing branch; latest split synthesis calls this a strong minority signal only | not in the consensus split and not a proposed PR row yet | Run independent replay/promotion only if capacity allows; insert after PR03 only if it proves a maintainer-sized product branch, otherwise keep deferred |
| PR 16 malformed-save payload candidate lane | `deferred/rtc-malformed-save-payload-20260516T215029Z` at `2270c2e955a`; no verified filing branch; stuck `rtc-pr16-950109-diagnostic-20260516T212950Z` terminated; old bounded rerun path was `run-rtc-malformed-save-payload-950109-diagnostic-noninteractive-destroy-20260516T215150Z.sh`; latest split synthesis requests `run-rtc-malformed-save-payload-950109-corrected-single-seed-replay-20260516T231356Z.sh` | independent conditional lane, not filing-ready and not the dropped PR 6B candidate; latest built-assets replay is `1 passed` / `7 failed`; rootfs recovered to about `42G`, but the latest seed `950109` replay still failed and needs product-vs-infra localization; Cycle 204 intentionally excluded both the held PR16 product candidate and downscoped malformed-save `20260516T222038Z` from the handoff manifest; the `231356Z` feedback-action file is empty, so no newer completed action proves launch or pass/drop | Run or consume the corrected single-seed `950109` replay with isolated `wp-env`, no retries, and immediate browser/container logs; then decide repair vs drop/downscope and require focused Jest/lint/replay evidence plus a verified branch link before PR16 can stay in the filing stack |
| PR 6C malformed evaluated save content | no verified filing branch | superseded by the broader PR16 candidate-lane decision unless focused evidence narrows it again | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR 8A is revived |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; current deferred publication candidate `deferred/rtc-reload-hydration-20260516T220533Z`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Strict-expansion residual source reduction / PR18x | `strict-expansion-20260516T165042Z`; audit found `307` likely-real rows, `58` buckets, and `9` split-relevant clusters; `run-rtc-strict-expansion-source-reduce-5700084-live-ws-block-tree-divergence-20260516T215150Z.sh` completed only artifact audit; `run-rtc-strict-5700084-focused-replay-20260516T224004Z.sh` now has a nonempty focused result; latest split synthesis names `rtc-strict-5700084-verse-linebreak-pr05c-comparison-20260516T231356Z` as the bounded comparison job | required classification gate before final validation; not itself a PR and not speculative filing content | Compare seed `5700084` against PR5C and the ready prefix first; classify as covered, oracle-only, or a small PR5D parser/rich-text follow-up before naming any PR18A; continue source reduction for `5200001`, `5200101`, `5400020`/`5600031`, and `5500003` only after this ownership decision |
| Reload/rejoin unsaved-edits UI repro (`PR18` idea) | Tptacek reload/rejoin gate from split synthesis history | evidence-only and lower priority; not a consensus PR slot by itself | Run only as a bounded UI repro job; promote only if a real UI repro proves the family and source reduction supports a branch-sized fix |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; current deferred publication candidate `deferred/rtc-pre-save-search-collapse-20260516T220535Z`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff`; current diagnostic publication candidate `deferred/rtc-rich-text-formatted-suffix-20260516T222037Z` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals outside PR16 | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | still not fixed or filing-ready outside the conditional PR16 lane | Keep broader residuals deferred until a source-level `saveEntityRecord()` / `prePersistPostType()` repro proves clean local blocks but malformed evaluated outgoing `content` |
| Seed `1020002` WebSocket marker divergence | completed `143821Z`, `151306Z`, `153219Z`, `160617Z`, `172434Z`, `180529Z`, `185531Z`, merge-update-emission reports, and follower-side update evidence from `rtc-pr17-1020002-follower-update-20260516T213345Z` | active PR17/final-stack blocker; no verified filing branch exists; latest report confirms relay/page 1 marker-bearing state while offline decode points at page 0 applying the remote client range as deleted | Run at most one bounded follower-side update-application replay with the diagnostic provider patch, and only if no equivalent active job exists; repair or proof-classify the Yjs update path, require focused seed `1020002` to pass or be explicitly reclassified, then shape PR17 with a verified branch link before filing |
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
4. Publish/fetch only explicit manifest rows if doing branch publication. The
   latest Cycle 204 refresh wrote `33` rows: `29` ready refs plus `4` current
   deferred candidates; the `231356Z` split feedback-action file is empty, so
   no newer manifest-refresh action is completed. Push/import and audit PR02A
   plus individual PR 5A/5B/5C, PR 8A, and PR11A-E review branches, or keep the
   table rows marked `No verified branch link yet`.
5. Use the repaired audited PR13A/B/C review refs for maintainer-facing PR13
   links until any finer PR13 subheads have verified audit rows.
6. Run or consume the corrected single-seed PR16 `950109` localization
   diagnostic with isolated `wp-env`, no retries, and immediate
   browser/container logs. Decide repair vs drop/downscope before PR16 can stay
   in the stack. Add a verified branch link before filing it.
7. Consume the PR17 follower-side Yjs update application evidence and run at
   most one bounded follow-up with the diagnostic provider patch, only if no
   equivalent active job exists. Require the focused seed gate to pass or be
   explicitly reclassified, then shape PR17 and add a verified branch link
   before filing.
8. Consume the completed strict-expansion `5700084` focused replay before final
   validation, then run or consume the bounded PR5C/ready-prefix comparison.
   Compare the `core/verse.attributes.content` `\n` vs `<br>` divergence
   against PR5C and the ready prefix. Classify it as covered, oracle-only, or a
   small PR5D product follow-up before adding any PR18x row. Add PR18x branches
   only for source-reduced uncovered product families, and give every added row
   a verified branch link or `No verified branch link yet`.
9. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
10. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
11. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
12. Keep dirty analysis-only artifacts out of product PR branches.
13. Rebuild the combined stack from the explicit `ready/rtc-*` known-fix
    prefix, PR02A, the accepted PR16 decision, the PR17 `1020002` decision, the
    `5700084` PR5C/PR5D/oracle decision, and any accepted PR18x branches, then
    rerun bounded final-stack validation against the rebuilt stack. Count it
    only if it reaches action-level product coverage.
14. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue only where healthy, and
strict-expansion source reduction is an allowed analysis gate after the
environment preflight is healthy. Do not run broad/final-stack fuzz while the
PR16/PR17 decisions, `5700084` classification, strict residual source reduction,
and rebuilt validation
are open. The latest trend packet reports `likely_real_max: 0`, with
historical bootstrap noise separated from current live product evidence. This
update's collected `raw/novelty-status.md` is nonempty and shows five enabled
novelty groups and no paused groups, but also no current-run behavioral records
under the new output dir and historical raw `pre_action_bootstrap_stall` still
dominating observed noise. None of this is final-stack fuzz validation or a
filing unblocker.
