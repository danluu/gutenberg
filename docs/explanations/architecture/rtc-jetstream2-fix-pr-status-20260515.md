# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T05:08:52Z`

Trigger event:
`duplicate-noise-2026-05-17T05-05-28Z-100`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-17T05-05-28Z-100/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The newest split-persona synthesis,
`pr-split-20260517T045201Z-synthesis.md`, keeps the Cycle 232 replacement as
the active recommendation: the old PR14/PR15/PR6B tail is stale, PR14 alone is
incomplete for seed `7110017`, and the replacement maintainer-facing topology
is:

```text
PR14 -> PR14B -> PR15A-on-PR14B -> PR15B-on-PR14B -> PR15C-on-PR14B
```

The broader current topology is:

```text
ready PR01 -> PR02, with PR02A as a PR02 sidecar
-> PR03 -> PR04 -> PR05A/B/C -> PR06 -> PR06A
-> PR6B minimal malformed outgoing RTC save payloads as a PR06A sidecar
-> PR07A/B, with conditional PR07C after PR07B if browser replay and branch-link validation pass
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 source split, using audited PR13A/B/C fallback links for now
-> PR14 -> PR14B -> PR15A/B/C-on-PR14B
-> validation-only PR6B-minimal+PR14B+PR15C integration head
-> pre-final evidence gates: PR17 seed 1020002, 5200005, 1060015, and 7510029
-> rebuilt combined validation stack
-> focused seed 1020002 gate
-> final-stack fuzz and filing
```

The latest split synthesis says to use the finalized PR14B/PR15-on-PR14B refs
from `20260517T034240Z` as the replacement shape:

```text
PR14B: ready/rtc-pr14b-table-query-array-local-suffix-append @ c3d45173ed9
PR15A: ready/rtc-pr15a-fallback-group-move-green-on-pr14b @ 125b5d030d8
PR15B: ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b @ acb367667da
PR15C: ready/rtc-pr15c-fallback-group-delete-green-on-pr14b @ 8decb9081f9
validation-only: validation/rtc-pr06b-minimal-plus-pr14b-pr15c-sidecar-20260517T034240Z @ ab8ce1e515e
```

Those refs are still not `verified-content` rows in the current GitHub
branch-link audit, so the proposed PR table marks PR14B and
PR15A/B/C-on-PR14B as `No verified branch link yet`. Use the completed Cycle
232 finalization audit as input evidence only until a branch-link audit exposes
those refs as verified PR-content links.

PR6B remains the minimal malformed-save sidecar after PR06A:

```text
ready/rtc-pr06b-malformed-save-request-payload-minimal
7b123e0ef2334a03b22e9a968d402de9da4c5379
```

It is not the old polluted `ready/rtc-pr06b-malformed-save-request-payload`
branch, not the old PR6B+PR15C validation head, and not an old post-PR15C
`PR16` tail. It also lacks a current `verified-content` GitHub branch-link
audit row, so it remains `No verified branch link yet`.

PR07C is now plausible as a sidecar after PR07B:

```text
ready/rtc-pr07c-reload-record-snapshots
025c7638361
```

It has adjacent ancestry, `git diff --check`, Prettier, sync-manager unit
coverage, installed dependencies, `entities.js` unit coverage, targeted normal
lint, and targeted strict lint evidence from Jetstream. It remains conditional
because focused browser replay is still blocked by missing Playwright host
libraries and a missing built `@wordpress/e2e-test-utils-playwright` artifact.
It is therefore a conditional row with no verified branch link.

PR17 / seed `1020002` remains separate. It blocks rebuilt combined validation,
focused seed rerun, broad final-stack fuzz, and filing. It does not block
branch audits, push manifests, PR14B/PR15-on-PR14B verification, PR07C
validation, owner reducers for `5200005` and `1060015`, the `7510029` UI
discriminator path, or control-plane hardening. The latest split synthesis says
current `1020002` evidence points toward follower-side Yjs/WebSocketProvider
update application rather than WordPress merge emission, but that is not yet a
filing-ready reclassification.

The current `raw/novelty-status.md` input is nonempty and was generated at
`2026-05-17T05:07:42.424Z`. It shows current-run triage has no visible
likely-real failures, no product-evidence signatures, no queued signatures, and
no current bootstrap-stall signatures. The active enabled group is only
`novelty-http-persistence-probe`; the noisy real-user WS groups are held in
startup-noise cooldown after the duplicate/noise control-plane fix. This is
health evidence only. It is not final-stack validation, and it does not prove
that the final exported PR set is filing ready.

## Branch And Ref Status

The remote status input was generated at `2026-05-17T05:08:46Z`.

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

The branch-link audit was generated at `2026-05-17T05:08:52Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

For repaired PR13 content, use only these audited review refs:

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
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | local ready head exists in prior manifest evidence; publish/fetch/audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; local ready head still needs a verified GitHub branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; required comparison point for parser/rich-text residuals |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | seed `5700084` remains PR5C-covered plus strict oracle/exact-content drift, not a new product PR |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes malformed-save restack and broader residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 6B | Minimal malformed outgoing RTC save request-payload guard after PR06A | No verified branch link yet | 2 | TBD | recommended minimal PR06A sidecar at `7b123e0ef233`; publish/fetch/audit before filing |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A; scoped to saved-CRDT-response hydration |
| PR 7C | Reload record snapshots sidecar after PR07B | No verified branch link yet | TBD | TBD | plausible sidecar at `025c7638361`; installed-clone unit/lint evidence exists, but focused browser replay and branch-link validation are still open |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | local ready head still needs a verified GitHub branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | local ready head still needs a verified GitHub branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | local ready head still needs a verified GitHub branch link |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | local ready head still needs a verified GitHub branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | local ready head still needs a verified GitHub branch link |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; keep in known-fix prefix |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first PR13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; maintainer-facing fallback until PR13B0/B1/B2/B3 are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; use this audited ref instead of stale/misordered PR13C refs |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; seed `7110017` proves PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | mandatory replacement topology; verify/audit `c3d45173ed9` and the `034240Z`/`042242Z` finalization outputs |
| PR 15A | Fallback group move stale reorder, restacked on PR14B | No verified branch link yet | TBD | TBD | use the PR14B topology; verify/audit `125b5d030d8`; old pre-PR14B audited branch is prior art only |
| PR 15B | Fallback group insert anchor, restacked on PR14B | No verified branch link yet | TBD | TBD | use the PR14B topology; verify/audit `acb367667da`; older Cycle 230 conflict artifacts should be superseded only after ingest/audit |
| PR 15C | Fallback group delete, restacked on PR14B | No verified branch link yet | TBD | TBD | use the PR14B topology; verify/audit `8decb9081f9` and rebuild/use validation-only PR6B-minimal+PR14B+PR15C evidence only after verification |
| PR 17 | Seed `1020002` WebSocket/Yjs proof, reclassification, or focused product fix | No verified branch link yet | TBD | TBD | active final-stack blocker; latest evidence leans follower-side provider/Yjs application, but no product/non-product decision is filing-ready |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended PR5A/B/C
  split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation
  is the PR11A-E split.
- [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder),
  [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor),
  and [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete)
  are verified content for the pre-PR14B PR15 shape, not the recommended
  PR15A/B/C-on-PR14B replacement.
- The finer PR13B0/B1/B2/B3 refs remain source-level evidence only until they
  are published, fetched, and reported as `verified-content` in a branch-link
  audit.

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T05:08:46Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T045920Z
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
stack because PR02A, PR5A/B/C, PR11A-E, PR6B, PR07C if accepted, PR14B,
PR15A/B/C-on-PR14B, and the finer PR13B0-B3 rows still need verified branch
links or explicit fallback decisions, and PR17 still needs a proof,
reclassification, or fix decision.

The latest raw novelty monitor snapshot was generated at
`2026-05-17T05:07:42.424Z`:

```text
coverage files: 40515
total records seen: 62793
records processed this pass: 46
current-run records: 3, all http persistence-no-title and all successful
current-run signatures: 0
current-run product-evidence signatures: 0
current-run likely-real visible: 0
current-run bootstrap-stall signatures: 0
enabled groups: novelty-http-persistence-probe
paused WS groups:
  novelty-ws-persistence-no-title
  novelty-ws-lifecycle
  novelty-ws-real-user-editing
  novelty-ws-real-user-rich-text
health: ok
```

The monitor still recommends real-user coverage top-offs, but the real-user
editing and rich-text groups are intentionally skipped while their restored
startup-noise cooldown remains active. Treat this as live health evidence only,
not final-stack validation.

The latest trend evidence packet was generated at `2026-05-17T04:57:40Z` from
monitor data through `2026-05-17T04:55:23Z`:

```text
monitor passes: 1841
coverage files: 272 -> 40327
coverage files delta: 40055
unmet coverage goals: 5
likely_real_max: 2
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3518
summary_startup_failures_last: 0
quality issues: 1
enabled groups in packet: novelty-http-persistence-probe,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text
fuzz level mix: browser-e2e=28 lanes/28 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 3510035
browser-e2e execution: 97754 cumulative / 724 per-hour
unit-property execution: 3027340 cumulative / 158928 per-hour
coverage-guided-lower-level execution: 381935 cumulative / 30144 per-hour
load1/load5/load15: 81.17 / 86.13 / 95.35 on 64 cores
memory: 422.7G free
```

The raw novelty snapshot is newer than the trend packet for active group state:
use the raw snapshot's single enabled HTTP group as authoritative for current
scheduling. Largest remaining coverage gaps are `ui-heading-shortcut`
`747/1000`, `reload-post-action` `757/1000`, title-save-reload `298/500`,
body-save-reload `357/500`, and successful real-user-editing records
`435/500`.

Treat `likely_real_max: 2` as rolling/historical classification context, not a
current final-stack blocker by itself. Current-run triage and historical triage
must remain separate: the current run is clean, while historical raw noise is
dominated by no-product startup and duplicate families.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T045201Z-synthesis.md`. It keeps the stale PR14/PR15/PR6B
tail replaced by the Cycle 232 topology, keeps old PR6B/old PR15/candidate
PR16, wildcard `final/*`, raw `deferred/*`, `try/*`, and validation-only heads
out of product PRs, and says PR17 / seed `1020002` still blocks rebuilt
combined validation, final fuzz, and filing. It also says "wait for `1020002`"
cannot be the only next action while Parallel Progress Gate work remains
available.

Latest completed or active Cycle 234 evidence from `current-pr-split.md` and
`pr-split-20260517T045201Z-feedback-action.md`:

- `rtc-cycle232-finalization-audit` completed after rerun as
  `rtc-cycle232-finalization-audit-rerun`; it produced ready-ref manifest
  evidence, but the GitHub branch-link audit in this report still has no
  `verified-content` rows for PR6B, PR07C, PR14B, or PR15A/B/C-on-PR14B.
- `rtc-pr-split-review-loop.sh` was patched so Markdown backticks in prompt
  heredocs no longer execute shell commands such as `disk-preflight-blocked`,
  `report.tmp`, and `PR17.*merge-update`.
- PR07C now has installed dependencies, `entities.js` unit coverage, targeted
  normal lint, targeted strict lint, and PR07B..PR07C `git diff --check`
  passing. Focused browser replay remains blocked by missing Playwright host
  libraries and a missing built `@wordpress/e2e-test-utils-playwright`
  artifact.
- `5200005` and `1060015` are both classified as
  `needs-source-local-reducer`. Current evidence says `5200005` is an aligned
  same-user post-reload table-delete propagation split not covered by PR07B/C,
  PR11, PR13, PR14B, PR15, PR17, or PR6B minimal. `1060015` stays near
  PR05B/PR05C/possible PR5D until a red source-local owner test proves
  ownership.
- The `7510029` source-local nested-delete red test is inconclusive in the
  opposite direction because the added CRDT adapter regression passed on the
  PR15C-on-PR14B base. Do not name PR18A from that evidence; defer the UI-only
  Playwright discriminator until the PR07C Playwright environment blockers are
  repaired or an explicit job owns that setup.
- The zero-byte
  `/media/volume/danluu-fuzz-data/rtc-pr-finalization-20260516/cycles/20260517T050245Z/finalization.report.md`
  is no progress and must not be consumed as validation evidence.

The current bounded work list is:

- `runs/20260517T045201Z/jobs/run-rtc-cycle234-loop-heredoc-quote-repair.sh`
  with tmux session `rtc-cycle234-loop-heredoc-repair`
- `run-rtc-cycle234-5200005-post-reload-table-delete-source-reducer.sh`
  with tmux session `rtc-cycle234-5200005-table-reducer`
- `run-rtc-cycle234-1060015-pr05-invalid-binding-red-test.sh`
  with tmux session `rtc-cycle234-1060015-pr05-red`
- bounded PR07C browser replay environment/gate continuation remains useful,
  but only after the host-library/build-artifact blocker is explicitly owned.
- bounded `7510029` UI-only Playwright repro remains useful, but launching it
  is deferred behind the same browser environment blocker.
- if no `1020002` proof job is active, a bounded
  `run-rtc-cycle234-pr17-1020002-minimal-yjs-provider-apply-repro-or-reclassify.sh`
  job is still the right PR17 path.

No final-stack fuzz should run until PR17/`1020002` and the rebuilt combined
stack are settled.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T042417Z-synthesis.md`, and the newest nonempty
duplicate/noise action report is
`duplicate-noise-20260517T042417Z-feedback-action.md`. The action implemented
the narrow producer-side fix in
`bin/rtc-browser-fuzz-novelty-monitor.mjs`: preserve unexpired startup-noise
cooldowns during expansion-policy migration, restore compatibility cooldowns
for already-cleared startup-noise pauses, and remove fallback behavior that
overrode active noise cooldowns just to avoid empty coverage. Syntax checks
passed for the novelty monitor, supervisor, triage watcher, analysis tiers, and
live analysis monitor. The active novelty monitor was restarted, stale/orphan
novelty monitor processes were stopped, and the current active root is
`/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T045920Z`.

After the fix, current novelty state enables only
`novelty-http-persistence-probe`. `novelty-ws-real-user-editing` and
`novelty-ws-real-user-rich-text` are held out until
`2026-05-17T10:24:59.833Z` unless product evidence justifies re-entry. The
current-run consumer-path audit reports `stateFiles: 1`, `signatures: 0`,
`leakingStrictStartupNoProduct: 0`, and no queued product-evidence signatures.
Historical duplicate/noise metrics remain noisy because old runs were not
deleted, but the active current root is no longer queuing strict no-product
startup signatures into triage or analysis.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", "do not add PR6B", and stale PR13 review-ref warnings are superseded by
the `2026-05-17T05:08:52Z` branch-link audit, the latest trend packet, and the
latest split and duplicate/noise syntheses. Their "only novelty-http is
enabled" claim is now confirmed by the current raw novelty snapshot, but that
clean current-run health is not final-stack validation.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| PR14B / PR15-on-PR14B finalization | `c3d45173ed9`, `125b5d030d8`, `acb367667da`, `8decb9081f9`, and validation-only `ab8ce1e515e`; older Cycle 230 PR15C conflict artifacts | mandatory replacement topology with Cycle 232 manifest evidence, but no current `verified-content` branch links for PR14B or PR15-on-PR14B | Publish/fetch/audit the ready refs until the GitHub branch-link audit exposes verified PR-content links; keep validation-only heads out of product PRs |
| Malformed-save request-payload PR6B | minimal replacement `7b123e0ef233`; old polluted PR6B `87e0ed20ab8`; historical validation heads `243411d46169`, `0662b838eaf`, and `ab8ce1e515e` | active recommended sidecar after PR06A with manifest evidence, but no current `verified-content` branch-link audit row exists | Publish/fetch/audit the minimal product branch, keep validation-only heads out of filing branches, verify inclusion in the PR14B/PR15-on-PR14B validation stack |
| PR07C reload record snapshots | `ready/rtc-pr07c-reload-record-snapshots` at `025c7638361` | plausible PR07B sidecar only; adjacent ancestry, diff check, Prettier, sync-manager, installed dependencies, `entities.js`, and targeted lint evidence exist, but no verified branch link or focused browser replay completion exists | Repair or explicitly own the Playwright host-library/build-artifact blocker; then run focused reload/title/excerpt replay before adding it to filing |
| PR13 finer split | `final/rtc-pr13b0-identity-provenance-guard`, `final/rtc-pr13b1-direct-source-retirement-green`, `final/rtc-pr13b2-current-only-source-retirement-green`, `final/rtc-pr13b3-explicit-base-source-retirement-green`; repaired audited PR13A/B/C refs | preferred source split is PR13A/B0/B1/B2/B3, but proposed rows currently use only repaired audited PR13A/B/C links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13B/C fallback rows |
| Reload/post-save `5200005` | generated owner-reducer work from the current split synthesis; `rtc-cycle234-5200005-table-reducer` launched | no product branch assignment; current evidence says it is an aligned same-user post-reload table-delete propagation split not covered by PR07B/C, PR11, PR13, PR14B, PR15, PR17, or PR6B minimal | Require the source-local reducer to write durable `report.md` plus `classification.tsv`; capture delete target clientId plus both pages' pre/post-delete block trees before assigning to any product PR |
| Parser-sensitive seed `1060015` | `f3f7e9990751` / seed `1060015`; `rtc-cycle234-1060015-pr05-red` launched | unassigned evidence; current reducer classifies it as invalid-block collaboration binding/recovery near PR05B/PR05C/possible PR5D, not reload-only hydration | Require the invalid-binding red test to prove source ownership before naming a PR5D-style branch |
| Seed `7510029` nested-child delete residual | source-local nested-delete red test passed on PR15C-on-PR14B; UI-only discriminator prompt pending | evidence-only; do not name PR18A yet; current source-local result is inconclusive in the non-product direction | Run the UI-only Playwright discriminator only after the PR07C browser environment blocker is repaired or explicitly owned; compare against PR11, PR13, PR14B, PR15, PR17, reload/post-save gates, and PR6B before promotion |
| Seed `7700055` table query-array identity loss | earlier split synthesis called this a credible minority signal; not in the latest active Cycle 234 work list | lower-priority evidence-only; do not create a generic PR18 bucket | Run a lower-priority red test only after comparing against PR14/PR14B, then decide whether a new product PR is warranted |
| Seed `1020002` WebSocket marker divergence | marker-bearing relay/page-1 evidence plus latest PR17 reports | active PR17/final-stack blocker; latest evidence points toward follower-side Yjs/WebSocketProvider update application, but no verified filing branch or final reclassification exists | Accept proof-based reclassification or run one focused browser/provider diagnostic with runtime fingerprints and exact raw update capture; then repair, reclassify, or defer |
| Seed `5700084` strict linebreak divergence | live `core/verse.attributes.content` `\n` vs `<br>` comparison | no product PR; classified as PR5C-covered plus strict oracle/exact-content drift | Downscope/update the strict oracle; do not create PR18A or PR5D for this seed |
| Fresh parser/rich-text/linebreak residuals | strict-expansion and focused-shard residuals, including invalid/deprecated/parser stress and rich-text suffix candidates | source-reduction input only; latest synthesis says do not name PR18x yet | Source-reduce and compare against PR5B/PR5C, PR11, PR13, PR14B, PR15, PR17, and existing parser/oracle coverage before naming any product branch |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR8A is revived |
| Reload hydration empty live editor / broader reload-post-save sync loss | prior replay seeds `5300002`, `5700013`, `5200005`, `5200009`, and `6000004` or `6000005`; latest reload-hydration product candidate in manifest work | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only with clean replay, command evidence, live editor state, REST body, persisted `_crdt_document`, provider phase, provider-synced skip path, and update/application witnesses |
| Pre-save search/live document collapse | prior pre-save search/live-collapse candidate rows | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | diagnostic publication candidates and prior `deferred/rtc-rich-text-formatted-suffix-*` refs | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Broader HTTP polling room-isolation residuals | PR02A local ready head; stale deferred HTTP room-isolation relaunches | PR02A remains in the known-fix prefix but has no verified branch link; broader residuals stay deferred | Publish/fetch/audit a PR02A review branch before filing; promote additional residuals only with narrowed healthy-user product evidence |
| Revision-restore marker retention | seed `5500002`; active lifecycle triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| Duplicate/noise control-plane recycling | latest synthesis `duplicate-noise-20260517T042417Z-synthesis.md`; action report `duplicate-noise-20260517T042417Z-feedback-action.md` | producer-side monitor fix implemented and restarted; current root has only `novelty-http-persistence-probe` enabled, no queued signatures, and no leaking strict no-product startup signatures | Keep WS real-user groups out until cooldown expiry or product evidence, and continue separating current clean health from historical duplicate/noise metrics |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use the explicit ready/review prefix. Do not wildcard import or file
   `final/rtc-pr*`, validation-stack branches, deferred branches, or dirty
   evidence branches.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered
   PR13 refs, old PR6B/PR16 material, PR6C, dirty evidence branches, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
3. Publish/fetch and audit PR02A, PR5A/B/C, PR11A-E, PR6B minimal, PR07C if
   accepted, PR13B0/B1/B2/B3, and the current PR14B/PR15A/B/C-on-PR14B refs
   before treating those finer refs as maintainer-facing links.
4. Until PR13B0/B1/B2/B3 have verified branch links, keep using only repaired
   PR13A/B/C links from the audit for PR13 content.
5. Finish PR14B/PR15-on-PR14B ingestion. Require a nonempty report, branch
   audit, push manifest, range-diff, diffstat/numstat, focused validation,
   `git diff --check`, and verified branch links before filing those rows.
6. Finish PR6B publication and branch-link verification before filing it.
   Require a clean GitHub review ref, sidecar manifest/validation evidence,
   focused tests, lint, formatting, build, seed replay evidence, branch audit,
   explicit inclusion in the PR14B/PR15-on-PR14B validation stack, and a
   verified branch link.
7. Finish PR07C's focused browser replay from the installed clone, after the
   Playwright host-library/build-artifact blocker is repaired or explicitly
   owned, before deciding whether to add it after PR07B.
8. Consume the latest PR17 report. If medium-confidence "not product-owned"
   evidence is enough, reclassify seed `1020002`; otherwise run one focused
   browser/provider ownership diagnostic with runtime fingerprints and exact raw
   update capture. Add a verified PR17 branch link only if a product branch is
   still warranted.
9. Run the generated `5200005` source reducer and the `1060015` invalid-binding
   red test before assigning those signals to PR05, PR07B, PR13, PR15, PR17,
   PR18, PR5D, or a new reload/post-save PR.
10. Run the `7510029` UI-only Playwright discriminator before naming any
    PR18A-style product branch.
11. Compare lower-priority `7700055` against PR14/PR14B before treating it as a
    new product PR.
12. Rebase or recreate each intended PR branch on the intended upstream base if
    that base moves.
13. Regenerate branch graph/containment evidence and adjacent
    range-diffs/diffstats from the actual filing repo.
14. Rerun focused checks, touched-file lint, and `git diff --check` on every
    imported/rebased branch.
15. Rebuild the combined stack from explicit PR01-PR06A heads, PR02A, PR6B as
    a sidecar, PR07A/B plus PR07C if accepted, PR09-PR15C-on-PR14B, the PR13
    finer split or audited fallback decision, the PR17 `1020002` decision, and
    any accepted source-reduced residual branches.
16. Rerun bounded final-stack validation against the rebuilt stack and count it
    only if it reaches action-level product coverage and proves PR6B and the
    PR14B/PR15-on-PR14B refs were included.
17. Block filing if any visible current likely-real failures appear in a fresh
    nonempty monitor snapshot.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. Do not run
broad/final-stack fuzz while PR14B/PR15-on-PR14B branch links, PR6B GitHub
branch links, PR07C validation, PR13 finer branch links or fallback decision,
the PR17 decision, the `5200005`, `1060015`, and `7510029` evidence gates,
rebuilt validation, branch-link audits, and fresh nonempty final-stack monitor
evidence are open. None of the current trend, duplicate/noise, or residual
reducer evidence is final-stack fuzz validation or a filing unblocker.
