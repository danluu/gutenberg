# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T13:48:40Z`

Trigger event:
`pr-split-2026-05-16T13-47-23Z-20260516T133729Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T13-47-23Z-20260516T133729Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The final combined validation-stack rebuild is clean,
but final-stack fuzz is still not a filing-quality product validation pass.
The newest nonempty split-persona synthesis,
`pr-split-20260516T133729Z-synthesis.md`, keeps the replacement split on the
Cycle 134/138/140/142 explicit 28-head allow-list from:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T111438Z/jobs/outputs/rtc-final-combined-validation-stack-rebuild-after-pr11-20260516T110608Z/filing-push-allowlist.md
```

The clean validation ref is:

```text
validation/rtc-final-combined-stack-post-pr11-20260516T110608Z
921f093cc47b46844bf8fb48552483686c55ef6b
```

That rebuild reports focused CRDT checks, touched-file JS lint,
`git diff --check`, containment, range-diff, and diffstat evidence passing.
The remaining hard validation blocker is final-stack fuzz on this ref. The
bounded collaboration-bootstrap repair has a report and is classified
`bootstrap-not-repaired`: the local harness repair fixed the original null
collaboration flag, HTTP reached one fuzz action and then hit
`rest_crdt_document_stale`, and WebSocket still failed before first action at
the sync-cycle wait. The active WS diagnostics report is still missing and the
diagnostics tmux session is still running, so the `0` visible likely-real
signal is not useful final-stack validation.

Current split changes to carry forward:

- Keep `PR 1` through `PR 4` as independent small fixes.
- Replace old aggregate `PR 5` with `PR 5A`, `PR 5B`, and `PR 5C`.
- Keep `PR 6` and `PR 6A`; drop former `PR 6B` and defer `PR 6C`.
- Keep repaired `PR 7A` and `PR 7B`.
- Exclude broad `PR 8`; `PR 8A` remains blocked/deferred pending a narrow
  title-reload branch and audit.
- Keep `PR 9`, `PR 10`, and `PR 12`.
- Replace aggregate `PR 11` with the green `PR 11A` through `PR 11E` split.
- Use the green PR13 source sequence
  `PR 13A -> PR 13B0 -> PR 13B1 -> PR 13B2 -> PR 13B3` for the final
  allow-list, while the maintainer-facing branch audit currently exposes only
  the repaired `PR 13A/B/C` review refs listed below.
- Keep green `PR 14` and split `PR 15A`, `PR 15B`, and `PR 15C`.

The bounded final-stack fuzz validation job was launched:

```text
rtc-final-stack-fuzz-validation-post-pr11-20260516T110608Z
```

It should check out
`validation/rtc-final-combined-stack-post-pr11-20260516T110608Z` at
`921f093cc47b46844bf8fb48552483686c55ef6b`. That run exposed the
collaboration bootstrap blocker, so the bounded repair job ran:

```text
rtc-final-stack-fuzz-collab-bootstrap-repair-post-pr11-20260516T122029Z
```

That repair produced a generated follow-up and did not validate WebSocket
product coverage. The latest nonempty split synthesis says the already launched
bounded WS provider sync-cycle diagnostics pass is still active, seeded from:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T122029Z/jobs/outputs/rtc-final-stack-fuzz-collab-bootstrap-repair-post-pr11-20260516T122029Z/followups/rtc-ws-provider-sync-cycle-followup.md
```

The launched diagnostics job is:

```text
rtc-final-stack-fuzz-ws-provider-sync-cycle-diagnostics-post-pr11-20260516T131309Z
```

Its expected report is still missing:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T131309Z/jobs/outputs/rtc-final-stack-fuzz-ws-provider-sync-cycle-diagnostics-post-pr11-20260516T131309Z/report.md
```

Its scope is to explain why WS shows two collaborators but
`waitForSyncCycle()` times out and relay health reports `docs:0`. Only after WS
smoke reaches readiness, sync-cycle, first action, and behavioral coverage
should the bounded final-stack fuzz be rerun once against the validation ref.
The generated helper script for that bounded diagnostics pass is:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T122029Z/jobs/outputs/rtc-final-stack-fuzz-collab-bootstrap-repair-post-pr11-20260516T122029Z/followups/run-ws-provider-sync-diagnostics.sh
```

If that diagnostics session exits without a usable report, rerun exactly once
from the existing generated diagnostics script while preserving the same bounded
`20260516T131309Z` scope. Do not launch broad fuzz expansion, duplicate
split-review jobs, PR13 repair/import, PR6B replay, PR6C promotion, reload
diagnostics, or extra final-stack fuzz lanes while that bounded WS diagnosis is
active. The split itself is not the active blocker; stale ref contamination and
invalid/immature fuzz signal remain the main risks.

The latest nonempty split synthesis did not change the PR split. The latest
duplicate-noise synthesis also did not change product PR content, but it
supersedes the previous novelty-monitor scheduling status: startup-noise
probation pauses groups, then the capacity-floor path can re-enable an
ineligible noisy group. In the latest diagnosed run that kept
`novelty-ws-real-user-editing` active despite current-run
`pre_action_bootstrap_stall` dominance and zero current successful records. The
earlier one-group capacity-floor mitigation reduced browser fanout but did not
fully make the floor current-run/profile-aware. The smallest safe
control-plane fix is to make the novelty-monitor capacity floor reject groups
with excessive current-run startup failures, honor active startup cooldowns and
supervisor startup-stall pauses, stop deleting the chosen group's pause entry,
and allow an empty supervisor policy when no eligible floor group exists.
Watcher/analysis suppression and `wp_collaboration_enabled` verification remain
secondary follow-ups, not product PR content.

Deferred/evidence-only work remains outside the filing split: dropped `PR 6B`,
`PR 6C`, broad `PR 8` persisted-record hydration, reload-hydration
empty-live-editor, pre-save search/live-collapse, rich-text formatted suffix
corruption, broader malformed-save/save-settlement residuals, HTTP polling
room-isolation residuals, seed `5500002` revision-restore marker retention,
and `PR 1A`.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T13:48:35Z`.

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
copied into a clean evidence worktree for the reload-hydration gate.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That stack still has modified product/test files and many untracked fuzz,
analysis, and documentation artifacts. It is active validation infrastructure,
not the final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-16T13:48:40Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

For repaired PR 13 content, use only these audit refs:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link the stale or misordered PR 13 refs listed in the audit under
"Explicitly Not PR-Content Links":
`review/rtc-pr13a-observed-delete-provenance`,
`review/rtc-pr13b-stale-block-identity-smear`, or
`review/rtc-pr13c-cross-parent-source-retirement`.

The supporting provenance base
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
is pushed only so the repaired PR 13A compare link has the source base.

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; include in final-stack fuzz allow-list |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; include in final-stack fuzz allow-list |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains a separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; include in final-stack fuzz allow-list |
| PR 5A | Entity/entity-reference normalization in `crdt.ts` | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; allow-list head exists but needs audited review branch |
| PR 5B | Parser/rich-text HTML equivalence in `crdt-blocks.ts` | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; allow-list head exists but needs audited review branch |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old aggregate PR 5; allow-list head exists but needs audited review branch |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes dropped PR 6B and broader malformed-save residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A; repaired split head |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; include in final-stack fuzz allow-list |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; include in final-stack fuzz allow-list |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first delta in the green PR13 source sequence |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; covers source-retirement content while green B1/B2/B3 subheads lack individual audit rows |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; covers identity/provenance guard content while green B0 lacks its own audit row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; green continuation after PR13 source sequence |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |

Verified branches that are now prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5 (`4` files, `+1664 / -52`), not
  the recommended maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8 (`11` files, `+618 / -61`), not an
  active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11 (`2` files, `+1145 / -4`), but
  the active recommendation is the now-green PR 11A-E split.

The latest allow-list shape still names green source subheads
`PR 13B0/B1/B2/B3`. Those are source-shaping facts for the validation ref.
Until individual branch-link-audit rows exist for those subheads, the
maintainer-facing PR13 links are the repaired audited `PR 13A/B/C` refs shown
above.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T13:48:35Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T134541Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The clean validation-stack rebuild is now available:

```text
validation ref: validation/rtc-final-combined-stack-post-pr11-20260516T110608Z
validation sha: 921f093cc47b46844bf8fb48552483686c55ef6b
report: /media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T111438Z/jobs/outputs/rtc-final-combined-validation-stack-rebuild-after-pr11-20260516T110608Z/report.md
```

Treat that as structural and focused-check evidence for the rebuilt stack. It
is not final-stack fuzz validation.

The final-stack fuzz validation remains invalid as product validation. The
bootstrap repair report now exists:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T122029Z/jobs/outputs/rtc-final-stack-fuzz-collab-bootstrap-repair-post-pr11-20260516T122029Z/report.md
```

The latest split synthesis classifies that repair as
`bootstrap-not-repaired`: HTTP reached one fuzz action and then hit
`rest_crdt_document_stale`, while WS still failed before first action at the
sync-cycle wait. The active validation gate is the launched bounded WS provider
sync-cycle diagnostics pass. Its report is still missing while the diagnostics
session is running. After a usable diagnostics report, rerun bounded final-stack
fuzz exactly once only after WS smoke reaches readiness, sync-cycle, first
action, and behavioral coverage.

The required raw `novelty-status.md` input in this collection is empty. Do not
carry forward the previous coverage root's exact current-run triage counters as
the current snapshot for `run-20260516T134541Z`. The last available trend packet
is still useful for direction, but it is graph-derived trend evidence, not a
fresh current-root novelty snapshot and not final-stack validation.

The latest trend evidence packet was generated at `2026-05-16T13:40:26Z` from
monitor data through `2026-05-16T13:37:40Z`:

```text
monitor passes: 1515
coverage files: 272 -> 32559
coverage files delta: 32287
unmet coverage goals: 24 -> 6
likely_real_max: 0
duplicate_share_current_last: 0.88
duplicate_share_historical_last: 0.6262
summary_startup_failures_last: 2
quality_issues_last: 2
enabled groups at trend snapshot: novelty-ws-real-user-editing
fuzz level mix: browser-e2e=25 lanes/25 groups; transport-integration=1 lane/1 group
browser-e2e execution: 48448 cumulative / 756 per-hour
transport-integration execution: 3005 cumulative / 16 per-hour
load1: 34.89 / 64 cores
memory: 428.9G free / 492.0G total
```

Largest unmet trend goals:

- CDP coverage records: `4763/5000`
- successful real-user-editing records: `282/500`
- `core/html`: `355/500`
- `core/details`: `403/500`
- `core/more`: `408/500`
- `ui-heading-shortcut`: `490/500`

Weak completion profiles remain a reason to prefer guarded top-offs and
startup-stall reduction over simply increasing browser concurrency. The weakest
success ratios in the trend packet are `full` (`18/840`),
`revision-persistence` (`76/3286`), `multi-reload-lifecycle` (`58/2470`),
`parser-serialization` (`60/1938`), and `real-user-editing` (`282/4965`).

## Status-Persona Analysis

The newest nonempty completed split-persona synthesis is
`pr-split-20260516T133729Z-synthesis.md`. It says the replacement split is the
Cycle 134/138/140/142 explicit 28-head allow-list and that filing is blocked on
valid final-stack fuzz, not split design. The `13:37Z` synthesis keeps the WS
provider sync-cycle diagnostics job as the active blocker: the report is still
missing and the tmux session is still running, so current `0` likely-real
coverage is not approval to file.

The split synthesis supersedes the older rebuild, bootstrap, and report-missing
snapshots from `pr-split-20260516T113338Z` through
`pr-split-20260516T132918Z`; the split and negative filing rules are unchanged:

- Do not file or validate from wildcard `final/rtc-pr*`.
- Do not file aggregate PR 11, old/red PR13 heads, old PR14/PR15 heads,
  broad PR 8, former PR 6B, PR 6C, `shape/*`, `finalize/*`, `deferred/*`,
  dirty worktrees, or `try/rtc-fix-stack-validation`.
- Block filing on any new visible likely-real failure from final-stack fuzz.
- Do not count a final-stack fuzz run as a pass if it has no successful
  action-level product coverage and is dominated by pre-action startup stalls.
- If the upstream base changes before filing, recreate or rebase the allow-list
  heads and rerun focused checks plus final-stack validation.

The latest split feedback action file, `pr-split-20260516T132918Z-feedback-action.md`,
launched no jobs. The already active bounded WS provider sync-cycle diagnostics
job remains:

```text
rtc-final-stack-fuzz-ws-provider-sync-cycle-diagnostics-post-pr11-20260516T131309Z
```

It was seeded from:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T122029Z/jobs/outputs/rtc-final-stack-fuzz-collab-bootstrap-repair-post-pr11-20260516T122029Z/followups/rtc-ws-provider-sync-cycle-followup.md
```

The bounded generated helper is:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T122029Z/jobs/outputs/rtc-final-stack-fuzz-collab-bootstrap-repair-post-pr11-20260516T122029Z/followups/run-ws-provider-sync-diagnostics.sh
```

That job should diagnose why WS sees two collaborators but
`waitForSyncCycle()` times out and relay health has `docs:0`. Do not rerun
final-stack fuzz until WS smoke reaches readiness, sync-cycle, first action,
and behavioral coverage. Do not launch a duplicate diagnostics job while this
one is active. The expected report path is:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T131309Z/jobs/outputs/rtc-final-stack-fuzz-ws-provider-sync-cycle-diagnostics-post-pr11-20260516T131309Z/report.md
```

Treat HTTP `rest_crdt_document_stale` as a separate triage signal, not current
split coverage.

The newest duplicate/noise synthesis file,
`duplicate-noise-20260516T133256Z-synthesis.md`, is nonempty and supersedes
the earlier `13:24Z` monitor-scheduling status. Its consensus root cause is
that the novelty monitor's startup-noise policy pauses groups and then defeats
itself with the capacity floor: `ensureStartupNoiseCapacityFloor()` can
re-enable a group whose profile already has current-run strict startup noise.
In the diagnosed run that left `novelty-ws-real-user-editing` enabled despite
`pre_action_bootstrap_stall` dominance and zero current successful records.
The `13:04Z` action already implemented the allowed-side one-group fanout
reduction and validated it with `node --check`, but the newest synthesis says
the remaining smallest safe control-plane fix is stricter eligibility:
capacity-floor candidates should be rejected when they have excessive
current-run startup failures, active startup cooldowns, active supervisor
startup-stall pauses, or too few current successes, and the monitor should be
allowed to write an empty supervisor policy when every candidate is
current-run startup-noisy. Watcher/analysis suppression and
`wp_collaboration_enabled` verification are plausible follow-ups but not
blockers. None of this is product PR content.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current-run fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "only
`novelty-http-persistence-probe` is enabled" warning is superseded by later
trend/persona evidence that the capacity-floor
`novelty-ws-real-user-editing` lane was active under startup-noise pressure.
The current collection's raw novelty file is empty, so exact current-root
triage counts must be re-read before they are used as filing evidence. Their
old "review links still stale" warning is superseded by the `13:48:40Z`
branch-link audit, which verifies the repaired PR 13 review refs listed above.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Dropped PR 6B save snapshot/no-op guard | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | dropped from filing path and allow-list after corrected replay classification | Do not rerun as the next gate; track seed `5500002` separately as revision-restore marker retention if it reproduces cleanly |
| PR 6C malformed evaluated save content | no verified filing branch | blocked/deferred pending focused Jest, lint, and replay evidence | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch if PR 8A is revived; give any persisted-record hydration claim separate product evidence and a verified branch link |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond dropped PR 6B and isolated PR 6C candidate | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| HTTP smoke `rest_crdt_document_stale` | final-stack bootstrap repair reached one HTTP action before this signal | separate triage signal; not split coverage and not a final-stack fuzz pass | Classify separately after the WS provider sync-cycle diagnostics makes WS smoke valid |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; possible PR 1A | deferred; possible PR 1A is not in the active split | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use only the explicit filing/push allow-list from the clean validation-stack
   rebuild. Do not wildcard import or file `final/rtc-pr*`.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR 13
   refs, dropped PR 6B, PR 6C, dirty evidence branches, and the untracked
   reload-hydration gate spec out of filing branches and push allow-lists.
3. Push/import and audit individual PR 5A/5B/5C and PR 11A-E review branches,
   or keep the table rows marked `No verified branch link yet`.
4. Use the repaired audited PR13A/B/C review refs for maintainer-facing PR13
   links until the green PR13B0/B1/B2/B3 subheads have verified audit rows.
   Do not file old aggregate PR 13B, old PR 13C, Cycle 110 red tri-split refs,
   or stale/misordered review refs.
5. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
6. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the actual filing repo.
7. Rerun focused checks, touched-file lint, and `git diff --check` on every
   imported/rebased branch.
8. Keep dirty analysis-only artifacts out of product PR branches.
9. Complete the already launched final-stack fuzz validation job against
   `validation/rtc-final-combined-stack-post-pr11-20260516T110608Z` at
   `921f093cc47b46844bf8fb48552483686c55ef6b`. Count it only if it reaches
   action-level product coverage. The collaboration-bootstrap repair report is
   now `bootstrap-not-repaired`: HTTP reached one action before
   `rest_crdt_document_stale`, but WS failed before first action at sync-cycle.
   Use exactly one bounded WS provider sync-cycle diagnostics pass from the
   generated follow-up script; its report is still missing while the diagnostics
   session is running. If the session exits without a usable report, rerun that
   bounded diagnostics flow exactly once. Rerun bounded final-stack fuzz only
   after WS smoke reaches readiness, sync-cycle, first action, and behavioral
   coverage.
10. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The latest trend
evidence has `likely_real_max: 0`, `6` unmet goals, and current duplicate share
`0.88`, while the current collection's raw `novelty-status.md` is empty for
the new coverage root. Treat this as useful control-plane trend evidence and a
novelty-scheduling follow-up, not final-stack fuzz validation.
