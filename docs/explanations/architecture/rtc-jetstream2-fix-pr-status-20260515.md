# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T23:59:35Z`

Trigger event:
`pr-split-2026-05-16T23-58-22Z-20260516T235306Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T23-58-22Z-20260516T235306Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The current maintainer-facing recommendation is:

```text
ready PR01-PR06A
-> PR6B malformed outgoing RTC save request-payload restack if it is clean
   after PR6A; otherwise restack the same two commits as PR16 after PR15C
-> ready PR07A-PR15C, plus PR02A as the PR02 sidecar once audited
-> PR17 seed 1020002 follower-side Yjs update application repair or
   proof-based reclassification
-> rebuilt combined validation stack
-> focused 1020002 gate
-> final-stack fuzz and filing
```

The latest split-persona synthesis,
`pr-split-20260516T235306Z-synthesis.md`, keeps the Cycle 208 replacement tail.
The ready heads remain a known-fix prefix, not a complete filing stack, and the
malformed-save restack belongs immediately after PR6A if that placement is
clean. `deferred/rtc-malformed-save-payload-20260516T230550Z` must not be filed
as-is because it is based on the validation/deferred stack. Restack only these
two request-payload commits:

```text
8340c5d794a Avoid valid block originalContent in CRDT saves
008b7258fe4 Protect RTC saves from malformed evaluated content
```

The deterministic restack audit proved the first commit cherry-picks cleanly,
but the second commit conflicts in `packages/core-data/src/actions.js` and
`packages/core-data/src/test/actions.js` on both the PR6A and PR15C bases. The
current bounded branch-shaping blocker is the active conflict-resolution job:

```text
runs/20260516T233834Z/jobs/run-rtc-pr06b-malformed-save-conflict-resolve-20260516T235212Z.sh
```

If it produces a clean branch, try that restack first as PR6B after
`ready/rtc-pr06a-persisted-empty-content-guard`, before the PR7A-PR15C tail. If
that placement depends on later stack state, file the same cleaned delta as
PR16 after `ready/rtc-pr15c-fallback-group-delete-green`. If the active job
exits with only a zero-byte `report.tmp`, no usable branch, or no nonempty
report, rerun exactly one bounded replacement and make sure the job clone sets
local `git config user.name` and `user.email`. Broader malformed post-save
settlement residuals and sidecar seed `7410076` stay deferred.

PR17 remains separate from PR6, PR13, PR15, PR16, reload hydration, pre-save
search/live-collapse, HTTP room isolation, and rich-text suffix work. Current
evidence says the marker-bearing update reaches the relay/page 1, while page 0
applies the remote client range as deleted. The next PR17 gate is follower-side
Yjs update application repair or proof-based reclassification for seed
`1020002`.

Seed `5700084` is no longer a product PR candidate. The latest comparison
classifies it as PR5C-covered plus strict oracle/exact-content drift, not
PR18A or PR5D. Keep strict-expansion rows as source-reduction evidence only
until they are source-reduced to uncovered product behavior.

The latest duplicate/noise feedback action applied a bounded fuzzer
control-plane fix, but that is infrastructure progress rather than product
validation. Do not launch broad final-stack fuzz or file PRs yet. Final filing
still waits on the malformed-save restack/audit, PR17 repair or
reclassification, rebuilt combined validation, a focused `1020002` gate, and
final-stack fuzz over the rebuilt stack.

## Branch And Ref Status

The remote status input was generated at `2026-05-16T23:59:30Z`.

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

The branch-link audit was generated at `2026-05-16T23:59:35Z` from fetched
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
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | 1 | +115 / -0 | local ready head exists per prior manifest work; publish/fetch/audit a remote review branch or fold/restack before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; local ready head still needs remote verified-content branch link |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old aggregate PR 5; seed `5700084` now classifies as PR5C-covered plus strict oracle/exact-content drift, not a new product PR |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save restack and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B preferred / PR 16 fallback | Malformed outgoing RTC save request-payload restack from `8340c5d794a` and `008b7258fe4` only | No verified branch link yet | TBD | TBD | do not file `deferred/rtc-malformed-save-payload-20260516T230550Z` as-is; deterministic audit found the second commit conflicts on both PR6A and PR15C bases; consume the active conflict-resolution job before deciding PR6B vs PR16 |
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
| PR 17 | Seed `1020002` WebSocket/Yjs follower-side update application repair or proof-based reclassification | No verified branch link yet | TBD | TBD | active final-stack blocker; shape only after the focused diagnostic proves repair or reclassification |

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
collected_at_utc: 2026-05-16T23:59:30Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T235427Z
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
stack because PR02A still needs a verified review branch, malformed-save must
be cleanly restacked and audited, PR17 still needs seed `1020002`
repair/reclassification, and the rebuilt validation stack has not been rerun
over those final decisions.

The collected `raw/novelty-status.md` is non-empty for this update. It was
updated at `2026-05-16T23:59:07.604Z` and reports current-output-dir-only
triage with `0` signatures, `0` likely-real visible, `0` likely-real merged
duplicates, and no paused groups. It saw `37,019` coverage files and `56,639`
total records, with `load1: 46.12 / 64 cores`, `431.7G` free memory, and
headroom for adding groups. It still reports `current-run records by profile:
{}` and a health warning that no behavioral coverage files were found under the
current novelty output dir. Treat the raw novelty data as current
health/control-plane evidence, not product validation.

The same novelty status is holding open-ended coverage-guidance Codex because
historical raw `pre_action_bootstrap_stall` noise dominates observed triage
(`13,828/26,552`, share `0.5208`). That hold is a control-plane safeguard; it
does not change the maintainer-facing PR split. It also skips re-enabling
`novelty-ws-block-gauntlet` while a recent duplicate-noise cooldown remains
inside the six-hour window.

The latest trend evidence packet was generated at `2026-05-16T23:48:22Z` from
monitor data through `2026-05-16T23:47:43Z`:

```text
monitor passes: 1758
coverage files: 272 -> 36961
coverage files delta: 36689
unmet coverage goals: 24 -> 7
likely_real_max: 0
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3527
summary_startup_failures_last: 0
quality_issues_last: 1
fuzz level mix: browser-e2e=30 lanes/30 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 2408051
browser-e2e execution: 91303 cumulative / 400 per-hour
unit-property execution: 2099056 cumulative / 52976 per-hour
coverage-guided-lower-level execution: 214686 cumulative / 7168 per-hour
load1/load5/load15: 38.31 / 35.59 / 35.62 on 64 cores
memory: 434.7G free
```

Enabled current groups:

```text
novelty-ws-persistence-no-title
novelty-ws-lifecycle
novelty-http-persistence-probe
novelty-ws-real-user-editing
novelty-ws-real-user-rich-text
```

Largest remaining coverage gaps in the trend evidence are `reload-post-action`
`613/1000`, `ui-heading-shortcut` `649/1000`, title-save-reload `225/500`,
body-save-reload `284/500`, successful real-user-editing records `346/500`,
`ui-format-paragraph` `925/1000`, and `core/html` `491/500`.

The `0` likely-real trend result and the raw novelty `0` current signatures are
useful health evidence, not final-stack validation and not filing unblockers.
Historical duplicate/noise remains a separate control-plane concern and must
not be presented as current product failure.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T235306Z-synthesis.md`. It keeps the Cycle 208 tail and adds
the current branch-shaping blocker:

- keep the replacement tail as `ready PR01-PR06A -> PR6B if clean after PR6A
  -> otherwise clean PR16 after PR15C -> ready PR07A-PR15C plus PR02A sidecar
  -> PR17 -> rebuilt validation -> focused 1020002 -> final-stack fuzz and
  filing`;
- do not file `deferred/rtc-malformed-save-payload-20260516T230550Z` as-is;
  restack only commits `8340c5d794a` and `008b7258fe4`;
- consume the active PR6B/PR16 conflict-resolution job before deciding
  placement, because the deterministic audit found the second malformed-save
  commit conflicts on both PR6A and PR15C bases;
- keep PR17 framed as seed `1020002` follower-side Yjs update application
  repair or proof-based reclassification;
- drop `5700084` from product PR consideration because the latest comparison
  classifies it as PR5C-covered plus strict oracle/exact-content drift;
- keep reload hydration, pre-save search/live-collapse, rich-text suffix, HTTP
  residuals, and post-save settlement residuals deferred unless separately
  promoted with clean source evidence.

The latest split synthesis asks for only bounded follow-up work:

- resolve PR6B/PR16 placement from
  `runs/20260516T233834Z/jobs/run-rtc-pr06b-malformed-save-conflict-resolve-20260516T235212Z.sh`;
- require a nonempty report, a clean PR6B or fallback PR16 ref, branch graph,
  containment checks, range-diff or patch-id evidence, diffstat/numstat, bundle
  or push-manifest row, and validation logs;
- if that job exits with only zero-byte temp output or no usable branch, rerun
  exactly one bounded replacement and make sure the job clone has local git
  identity configured;
- continue PR17 diagnostics, but do not count active `1020002` work as progress
  by itself while independent non-`1020002` rows remain actionable;
- consume the Cycle 208 push-manifest refresh and keep HTTP room isolation
  pointed at `ready/rtc-pr02a-http-room-isolation-regression`;
- keep reload hydration, pre-save search/live-collapse, and rich-text suffix
  diagnostic/deferred unless product evidence matures;
- enforce the Parallel Progress Gate: zero-byte reports, `report.tmp`, stale
  manifests, missing rc files, disk-preflight-only reports, and wait-only
  feedback count as no progress while actionable rows remain.

The raw current split report records that Cycle 208 created bounded job scripts
for malformed-save restack/audit, conflict-resolution, push-manifest refresh,
and the PR17 `1020002` follower-apply diagnostic:

```text
runs/20260516T233834Z/jobs/run-rtc-pr06b-malformed-save-restack-audit-20260516T234705Z.sh
runs/20260516T233834Z/jobs/run-rtc-pr06b-malformed-save-conflict-resolve-20260516T235212Z.sh
runs/20260516T233834Z/jobs/run-rtc-push-manifest-refresh-cycle208-20260516T234705Z.sh
runs/20260516T233834Z/jobs/run-rtc-ws-seed-1020002-follower-apply-live-struct-diagnostic-20260516T234705Z.sh
```

Those jobs are progress on blockers, not completed filing evidence. The failed
deterministic restack audit is not a publishable branch. Active or new
`1020002` diagnostics still do not satisfy the Parallel Progress Gate by
themselves while independent non-`1020002` rows remain actionable.

Do not launch broad final-stack fuzz or extra fuzz lanes from this state.

The latest duplicate/noise synthesis is
`duplicate-noise-20260516T234703Z-synthesis.md`; it edited no files and keeps
the issue framed as control-plane/admission leakage, not a confirmed RTC
product failure. The latest non-empty feedback action remains
`duplicate-noise-20260516T231459Z-feedback-action.md`, which reports a bounded
fuzzer control-plane patch: strict no-product `pre-action-bootstrap-stall`
records are suppressed before triage/analysis, stale or bad current-root
pointers fail closed, live-analysis avoids exporting missing or stale child
pointers, historical duplicate awareness families are canonicalized/capped,
novelty uses raw duplicate/noise dominance, and supervisor backs off repeated
`wp-env start failed` startup loops. Syntax checks and targeted fixtures passed,
but current-run improvement still cannot be measured until productive
`wp-env`/MySQL startup recovers and the supervisor produces current-run
behavioral records. The current duplicate/noise next action is to repair
startup, make live analysis current-output-pointer aware, add watcher/analysis
family caps before Codex launch, and preserve every failure that carries real
product evidence.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older
"keep existing split", "do not add PR6B", and stale PR13 review-ref warnings
are superseded by the `2026-05-16T23:59:35Z` branch-link audit and the
`20260516T235306Z` split synthesis.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Malformed-save request-payload restack | `deferred/rtc-malformed-save-payload-20260516T230550Z`; commits `8340c5d794a`, `008b7258fe4`; active resolver `run-rtc-pr06b-malformed-save-conflict-resolve-20260516T235212Z.sh` | useful evidence, but the deferred branch is not a filing source because it is based on the validation/deferred stack; deterministic audit found the second commit conflicts on both PR6A and PR15C bases | Consume the active conflict-resolution job; require a nonempty report, clean PR6B or PR16 ref, branch graph, containment, range-diff or patch-id evidence, diffstat/numstat, manifest row, focused tests, lint, Prettier, `git diff --check`, build, and seed replay evidence |
| Malformed post-save settlement residuals and sidecar | `f51c425df8a5`, `f46859898576`, `7410076` | deferred/evidence-only; not part of PR6B or PR16 unless separately source-proven | Keep source-reducing; promote only with clean local source evidence and a verified branch link |
| Seed `1020002` WebSocket marker divergence | marker-bearing relay/page-1 evidence plus follower-side update evidence | active PR17/final-stack blocker; no verified filing branch exists | Run at most one bounded follower-side update-application replay with live `Y.applyUpdate` struct refs and deleted-state before/after apply; then repair or proof-classify |
| Seed `5700084` strict linebreak divergence | live `core/verse.attributes.content` `\n` vs `<br>` comparison | no product PR and no active PR18x row; classified as PR5C-covered plus strict oracle/exact-content drift | Downscope/update the strict oracle; do not create PR18A or PR5D for this seed |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR 8A is revived |
| Reload hydration empty live editor | latest deferred row `20260516T233554Z` plus prior reload-hydration candidates and gate branches | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | latest deferred row `20260516T233555Z` plus prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | current diagnostic publication candidate `deferred/rtc-rich-text-formatted-suffix-20260516T230547Z` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | HTTP downscope row `20260516T232052Z`; PR02A has no verified branch link yet | PR02A remains in the known-fix prefix and points back to `ready/rtc-pr02a-http-room-isolation-regression`, but broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| Duplicate/noise control-plane leak | latest synthesis `duplicate-noise-20260516T234703Z`; latest non-empty feedback action `20260516T231459Z` | bounded control-plane fix applied and syntax/fixture checks passed; this is fuzzer infrastructure progress, not product validation, and current-run improvement is still unmeasured while productive `wp-env`/MySQL startup is blocked | Verify fresh productive current-run triage after startup recovers; make live analysis current-output-pointer aware; keep no-product startup noise gated without suppressing failures that have real product evidence |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Verify environment health first. A disk-preflight-only report, zero-byte
   report, missing rc file, or stale active session is not durable progress
   while actionable Parallel Progress Gate rows remain.
2. Use the explicit ready prefix. Do not wildcard import or file
   `final/rtc-pr*`, validation-stack branches, deferred branches, or dirty
   evidence branches.
3. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered
   PR13 refs, old dropped save snapshot/no-op PR6B material, PR 6C, dirty
   evidence branches, and the untracked reload-hydration gate spec out of
   filing branches and push allow-lists.
4. Publish/fetch and audit PR02A plus individual PR 5A/5B/5C, PR 8A, PR11A-E,
   and the malformed-save restack branch, or keep rows marked
   `No verified branch link yet`.
5. Use the repaired audited PR13A/B/C review refs for maintainer-facing PR13
   links until any finer PR13 subheads have verified audit rows.
6. Restack malformed-save from only commits `8340c5d794a` and `008b7258fe4`.
   Consume the active conflict-resolution job before choosing placement. Prefer
   PR6B after PR6A if clean; otherwise file the same cleaned delta as PR16 after
   PR15C. Require a nonempty report, clean ref, focused tests, lint,
   formatting, build, `git diff --check`, seed replay evidence,
   manifest/branch audit, and a verified branch link before filing it. Do not
   launch a duplicate PR6B/PR16 job while the current resolver is alive; if it
   fails with no usable report/ref, rerun exactly one bounded replacement.
7. Consume the PR17 follower-side Yjs update application evidence. Run at most
   one bounded follow-up with the diagnostic provider patch, only if no
   equivalent active job exists. Require seed `1020002` to pass or be explicitly
   reclassified, then shape PR17 and add a verified branch link before filing.
8. Treat `5700084` as PR5C-covered plus strict oracle/exact-content drift. Do
   not name PR18A or PR5D from that seed.
9. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
10. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
11. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
12. Keep dirty analysis-only artifacts out of product PR branches.
13. Rebuild the combined stack from explicit PR01-PR06A heads, PR02A, the
    accepted malformed-save restack, PR07A-PR15C, the PR17 `1020002` decision,
    and any accepted source-reduced residual branches. Rerun bounded
    final-stack validation against the rebuilt stack and count it only if it
    reaches action-level product coverage.
14. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after the environment preflight is healthy. Do not
run broad/final-stack fuzz while the malformed-save resolver, PR17 decision,
rebuilt validation, and branch-link audits are open. The latest trend packet
reports `likely_real_max: 0`, and this run's non-empty
`raw/novelty-status.md` reports `0` current signatures, but none of that is
final-stack fuzz validation or a filing unblocker.
