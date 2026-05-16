# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T20:40:52Z`

Trigger event:
`pr-split-2026-05-16T20-39-36Z-20260516T203203Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T20-39-36Z-20260516T203203Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The latest split-persona consensus from
`pr-split-20260516T203203Z-synthesis.md` keeps the replacement split: the
`PR01` through `PR15C` `ready/rtc-*` set plus PR02A is useful and auditable, but
still only a known-fix prefix. The tail remains conditional `PR16`
malformed-save replay/restack, then separate `PR17` seed `1020002`
WebSocket/Yjs repair. PR16 still lacks product replay evidence, and PR17 still
has no completed report or branch.

The current maintainer-facing filing shape is:

```text
ready/rtc-* PR01-PR15C prefix, including PR02A
-> conditional PR16 malformed-save payload candidate after restack/replay passes
-> PR17 seed 1020002 WebSocket/Yjs merge-update-emission repair
-> rebuilt combined validation stack
-> focused seed 1020002 gate
-> final-stack fuzz
```

Use the `ready/rtc-*` allow-list from the `20260516T181934Z` finalization
report, not wildcard `final/rtc-pr*`, aggregate `final/*`, `deferred/*`,
`try/*`, validation refs, dirty worktrees, or unaudited candidate refs.

PR02A is part of the proposed prefix as the
`ready/rtc-pr02a-http-room-isolation-regression` sidecar after PR02. It still
has no verified branch link in the branch-link audit, so it must not be filed
until a review branch is audited, or it is deliberately folded into PR02 or
PR03+ is restacked on top of it.

Seed `1020002` remains the active final-stack blocker. It is confirmed
WebSocket/Yjs marker divergence: page 0 reports connected/synced but loses
marker `async-server-1020002-0-1-589451` while page 1 and the relay retain it.
The sync-manager load/hydrate report, the Gutenberg store-to-CRDT candidate,
the `180529Z` CRDT block-array semantic-diff repair report, and the completed
`185531Z` caller/base-provenance diagnostic report are now all diagnostic-only
because their candidates did not pass the focused seed gate. The caller/base
diagnostic now says caller/base propagation is not the owner. The newest split
synthesis moves the next `1020002` repair target to CRDT/Yjs merge-update
emission after `mergeYBlocksStaleBaseSemanticInsert`; seed the next attempt
from the `185531Z` report and inspect Yjs update emission, encoded marker
presence, and relay emission. Keep `1020002` separate unless a new report
proves exact ownership by an existing ready PR.

Malformed-save is no longer merely "queued behind `1020002`." Treat it as an
independent `PR16` candidate lane, still conditional and not filing-ready. The
latest split synthesis moves the preferred source material to
`deferred/rtc-malformed-save-payload-20260516T202017Z` at `2270c2e955a`,
restacked on `ready/rtc-pr15c-fallback-group-delete-green`. Existing PR16
replay evidence is insufficient because it hit `collaborationEnabled=null`
before product actions. Restack/compare, replay malformed rows plus seeds
`7410076` and `7410083`, run focused validation, and add a verified branch link
before filing. Do not revive the dropped old `PR6B` save-snapshot/no-op
candidate.

The duplicate/noise control-plane action from
`duplicate-noise-20260516T194153Z-feedback-action.md` completed the next
source-state reconciliation fix. The triage watcher now treats
`family-capped`, `source-suppressed`, and `stale-source` as non-launchable,
stale-marks absent queued/retry signatures, and propagates terminal
non-actionable analysis/deep-analysis states back to source triage state. The
novelty monitor now reads effective actionability from watcher plus
analysis/deep-analysis state before counting triage yield. This is fuzz
control-plane hygiene, not product validation and not a filing unblocker.

The prior bounded `1020002` caller/base diagnostic has completed, so wait-only
feedback is stale. The latest split synthesis confirms that no new structural
split is needed, but the Parallel Progress Gate is still non-empty. The
`201519Z` feedback-action file is empty, and there is no newer non-empty split
feedback action in the collected inputs; the newest `203203Z` synthesis confirms
the already-launched bounded PR17 job still lacks a completed report/branch, and
PR16 still needs a built-assets restack/replay follow-up before it can be a
filing candidate. The latest non-empty split feedback action,
`pr-split-20260516T195005Z-feedback-action.md`, updated the remote split report
to Cycle 188 consensus and launched the bounded merge/update-emission repair
job:

```text
rtc-ws-seed-1020002-merge-update-emission-diagnostic-repair-20260516T195842Z
```

It also launched the independent malformed-save restack/replay job:

```text
rtc-malformed-save-payload-ready-restack-and-replay-20260516T195842Z
```

The older manifest audit/link job verified `12/12` manifest rows. A newer
progress-unblock audit then verified all `29` local `ready/rtc-*` heads for the
PR01-PR15C plus PR02A prefix and wrote a `33`-row local-only push manifest.
That still does not create remote PR-content links for the table below; the
table uses only `verified-content` rows from the branch-link audit, with
unaudited rows explicitly marked `No verified branch link yet`.

The newest duplicate/noise synthesis,
`duplicate-noise-20260516T201946Z-synthesis.md`, narrows the remaining
control-plane leak to the scheduler: novelty can pause noisy groups, but
coverage guidance must not immediately re-enable them during a duplicate/noise
cooldown. The latest novelty snapshot now shows `novelty-ws-block-gauntlet`
held by a sticky triage-duplicate-noise cooldown and skipped by coverage
recommendations. This is fuzz control-plane hygiene, not product validation and
not a filing unblocker.

Do not launch broad final-stack fuzz yet. Do not fold seed `1020002` into PR13,
PR15, PR6B/PR6C, old PR16, PR8, reload hydration, pre-save collapse,
rich-text suffix, malformed-save work, broader HTTP room isolation, seed
`5500002`, seed `7410083`, or possible seed `5200001` without proof of exact
same-source ownership. Also do not let `1020002` serialize independent branch
audit/link work, PR02A/PR5A-C/PR11A-E handoff, malformed-save restack/replay,
or control-plane loop repair.

## Latest Branch And Ref Status

The remote status input was generated at `2026-05-16T20:40:47Z`.

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

The branch-link audit was generated at `2026-05-16T20:40:52Z` from fetched
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

The Cycle 188 logical CRDT source split remains the green PR13 sequence
`PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3`, followed by PR14 and
PR15A-C. The maintainer-facing table below still uses the repaired audited
PR13A, PR13B, and PR13C review refs because those are the verified content
links available now and because the branch-link audit explicitly names them for
PR13. Do not revive the stale or misordered PR13 refs called out above.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | 1 | +115 / -0 | local ready head exists per progress-unblock audit; needs remote verified-content branch link, or fold/restack before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; local ready head exists but still needs remote verified-content branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; local ready head exists but still needs remote verified-content branch link |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old aggregate PR 5; local ready head exists but still needs remote verified-content branch link |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes dropped PR 6B and broader malformed-save residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A |
| PR 8A | Narrow title reload replacement | No verified branch link yet | TBD | TBD | broad verified PR 8 is prior art only; shape a narrow title-reload branch only if revived |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | green in validation-stack rebuild; local ready head exists but still needs remote verified-content branch link |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | green in validation-stack rebuild; local ready head exists but still needs remote verified-content branch link |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | green in validation-stack rebuild; local ready head exists but still needs remote verified-content branch link |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | green in validation-stack rebuild; local ready head exists but still needs remote verified-content branch link |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | green in validation-stack rebuild; local ready head exists but still needs remote verified-content branch link |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; keep in known-fix prefix |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first maintainer-facing PR13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; carries the source-retirement delta |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; third maintainer-facing PR13 delta |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; keep after PR13 source sequence |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 16 | Malformed-save payload candidate lane | No verified branch link yet | TBD | TBD | independent conditional lane; source material is `deferred/rtc-malformed-save-payload-20260516T202017Z` at `2270c2e955a`; built-assets restack/replay and audit required before filing |
| PR 17 | Seed `1020002` WebSocket/Yjs marker-propagation repair | No verified branch link yet | TBD | TBD | active final-stack blocker; no completed report/branch yet; next repair should target Yjs merge/update emission, then focused seed gate and audited review branch |

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
collected_at_utc: 2026-05-16T20:40:47Z
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
stack because PR02A still needs a verified review branch, the new PR16
malformed-save candidate needs restack/replay/audit, and seed `1020002` still
needs the PR17 repair decision.

The latest `novelty-status.md` snapshot was updated at
`2026-05-16T20:40:15.345Z` for `run-20260516T185058Z`:

```text
coverage files: 36041
total records seen: 54406
records processed this pass: 73
new behavioral feature keys this pass: 11
new CDP coverage hashes this pass: 11
current-run records by profile:
  async-server-blocks=86, block-gauntlet=87, session-lifecycle=59,
  long-session-large-doc=25, real-user-editing=72, persistence-no-title=11
current-run successful records by profile:
  async-server-blocks=71, block-gauntlet=66, session-lifecycle=44,
  real-user-editing=34, persistence-no-title=3
current-run records by transport: ws=332, http=8
current-run pre-action startup failures:
  async-server-blocks=5, persistence-no-title=5,
  block-gauntlet=4, session-lifecycle=2
current-run summary-only startup failures:
  block-gauntlet=3, async-server-blocks=3, session-lifecycle=1
enabled groups:
  novelty-ws-lifecycle, novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text, novelty-ws-async-server-blocks,
  novelty-ws-long-session-large-doc, novelty-http-persistence-probe
paused groups:
  novelty-ws-common-blocks, due 2/17 pre-action WS discovery/startup failures
  novelty-ws-persistence-no-title, browser budget rotated to block-gauntlet
  novelty-ws-block-gauntlet, sticky triage-duplicate-noise cooldown
recommended groups:
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text,
  novelty-ws-block-gauntlet
current-output triage roots: 7
current-output state files: 7
current-output signatures: 17
current-output actionable signatures: 17
current-output raw signatures: 40
current-output non-actionable signatures: 23
current-output known-infra signatures: 12
current-output family-capped signatures: 6
current-output analysis-gated non-actionable signatures: 5
likely-real visible: 0
likely-real merged duplicates: 4
oracle/noise questions: 0
normalization-noise candidates: 0
bootstrap stalls: 0
suppressed strict startup records: 20
suppressed strict startup identities: 10
actionable top duplicate family share: 0.4706
raw top duplicate family share: 0.3
top actionable semantic families:
  unknown=8, timeout=6, collaboration_non_convergence=2, assertion=1
top raw semantic families:
  rest_meta_database_error=12, timeout=10, unknown=10,
  collaboration_non_convergence=2
historical likely-real merged duplicates: 453
historical normalization-noise candidates: 454
historical bootstrap stalls: 14433
historical actionable top duplicate family share: 0.3544
historical raw top duplicate family share: 0.5456
quality issues: 1
health: ok
headroom for adding groups: no
load1: 68.04 / 64 cores
memory: 428.9G free / 492.0G total
```

At `2026-05-16T18:51:08Z`, the novelty state moved from
`run-20260516T175536Z` to `run-20260516T185058Z`, preserving coverage counters
but resetting run-local startup, pause, and quality gates. The current run has
now accumulated a larger WS-only coverage sample. A later
`2026-05-16T19:24:11Z` policy reset rebuilt run-local startup/quality counters
and switched current-run triage policy to actionable signatures while still
reporting raw and non-actionable noise volume. At `2026-05-16T20:00:35Z`,
`novelty-ws-persistence-no-title` was enabled, and the patched novelty monitor
was running with effective-actionability accounting; at `2026-05-16T20:13:29Z`
that group was paused to rotate browser budget back to block-gauntlet. At
`2026-05-16T20:21:57Z`, the monitor also enabled
`novelty-http-persistence-probe` as a low-fault HTTP persistence canary. By
`2026-05-16T20:40:09Z`, `novelty-ws-block-gauntlet` was paused again under a
sticky triage-duplicate-noise cooldown, and at `20:40:15Z` the monitor skipped
coverage-guided re-enable for that group because the cooldown was still active.
The current `0` visible likely-real count is fuzz-health evidence only.
Historical known-noise remains advisory/control-plane evidence; do not treat it
as live product failure or as final-stack validation.

The latest novelty snapshot still has `novelty-ws-common-blocks` paused after
startup/discovery failures and `novelty-ws-persistence-no-title` paused for
budget rotation. `novelty-ws-block-gauntlet` is now paused for sticky
duplicate/noise cooldown rather than immediately reenabled for the `core/html`
coverage gap. The current novelty snapshot has `17` actionable signatures
visible. Treat the completed `194153Z` source-state fix, the `200720Z`
sticky-pause/no-analysis-sentinel proposal, and the later `201946Z`
novelty-monitor cooldown synthesis as control-plane hygiene, not product
validation.

The latest trend evidence packet was generated at `2026-05-16T20:35:28Z` from
monitor data through `2026-05-16T20:33:10Z`. Use it for trend shape, while the
later novelty snapshot above is the current group and policy state:

```text
monitor passes: 1687
coverage files: 272 -> 35981
coverage files delta: 35709
unmet coverage goals: 24 -> 7
likely_real_max: 0
duplicate_share_current_last: 0.5556
duplicate_share_historical_last: 0.3543
summary_startup_failures_last: 1
quality_issues_last: 1
fuzz level mix: browser-e2e=32 lanes/32 groups; unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 1560552
browser-e2e execution: 76964 cumulative / 2240 per-hour
unit-property execution: 1380268 cumulative / 72240 per-hour
coverage-guided-lower-level execution: 100314 cumulative / 10496 per-hour
load1: 70.01 / 64 cores
memory: 429.5G free
```

Largest remaining coverage gaps in the later novelty snapshot are
`reload-post-action` (`607/1000`), `ui-heading-shortcut` (`629/1000`),
title-save-reload (`221/500`), body-save-reload (`280/500`), successful
real-user-editing records (`345/500`), `ui-format-paragraph` (`909/1000`),
and `core/html` (`449/500`).

This is useful fuzz-health and control-plane evidence. It is not final-stack
validation for filing.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T203203Z-synthesis.md`. Its consensus:

- Keep the replacement shape; no new structural PR split is justified.
- Treat `PR01` through `PR15C` plus PR02A as a useful and auditable known-fix
  prefix, not a filing-ready final stack.
- Keep PR13 logically as the green source sequence `13A`, `13B0`, `13B1`,
  `13B2`, and `13B3`, followed by PR14 and PR15A-C. The table still uses the
  repaired audited PR13A/B/C links because those are the current
  `verified-content` PR13 links.
- Keep conditional `PR16` malformed-save payload work independent and require
  built-assets restack/compare of
  `deferred/rtc-malformed-save-payload-20260516T202017Z` at `2270c2e955a`
  onto `ready/rtc-pr15c-fallback-group-delete-green`, plus replay of malformed
  rows and seeds before any filing slot.
- Keep `PR17` as the seed `1020002` WebSocket/Yjs marker-propagation repair
  unless exact same-source ownership by an existing ready PR is proven. The
  next bounded owner remains CRDT/Yjs merge/update emission after
  `mergeYBlocksStaleBaseSemanticInsert`, but no completed PR17 report or branch
  exists yet.
- Do not launch broad final-stack fuzz, duplicate `1020002` repair, or duplicate
  PR17 work now; the bounded `1020002` job already exists under the
  `20260516T195005Z` run, and PR16 should get one bounded built-assets replay
  follow-up using the latest source material.
- Treat wait-only feedback as invalid while the Parallel Progress Gate still has
  actionable rows. Active `1020002`, an active tmux session without an artifact,
  or a zero-byte `report.md` must not satisfy the gate while non-`1020002`
  rows exist.
- After PR16 and PR17 are decided, rebuild the combined validation stack, run the
  focused `1020002` gate, then run final-stack fuzz.

The latest split feedback action file in the collected inputs remains
`pr-split-20260516T201519Z-feedback-action.md`, and it is empty: no files were
edited and no new job was launched in that pass. The newest `203203Z` split
synthesis records the progress-unblock audit and branch handoff state, but has
no paired non-empty feedback-action file in the collected inputs. The latest
non-empty split feedback action,
`pr-split-20260516T195005Z-feedback-action.md`, applied that consensus to the
remote split report. It replaced the stale caller/base wait tail with the
known-fix `PR01` through `PR15C` prefix plus PR02A, then conditional PR16
malformed-save, then PR17 seed `1020002`. It launched two active jobs:
`rtc-ws-seed-1020002-merge-update-emission-diagnostic-repair-20260516T195842Z`
and `rtc-malformed-save-payload-ready-restack-and-replay-20260516T195842Z`.
Its manifest audit/link job completed and verified `12/12` manifest rows. The
newer progress-unblock audit verified all `29` local `ready/rtc-*` PR01-PR15C
plus PR02A heads and wrote a `33`-row local-only push manifest: the `29` ready
heads plus latest malformed-save product candidate, pre-save diagnostic branch,
reload-hydration standalone candidate, and HTTP room-isolation standalone
companion. That does not override the branch-link audit: the branch-link audit
still has no remote `verified-content` rows for PR02A, PR5A-C, PR8A, PR11A-E,
PR16, or PR17, so those table rows remain `No verified branch link yet`. The
newest synthesis says PR17 still lacks a completed report/branch; for PR16, it
also says existing replay evidence is insufficient and the follow-up must use
built assets, the latest `202017Z` source, the PR15C ready base, malformed rows,
and seeds `7410076` and `7410083`.

The latest duplicate/noise synthesis is
`duplicate-noise-20260516T201946Z-synthesis.md`. It says strict
`pre_action_bootstrap_stall` is mostly gated downstream and the remaining leak is
the novelty scheduler re-feeding noisy producers. Its smallest safe next fix is
sticky duplicate/noise cooldowns in `rtc-browser-fuzz-novelty-monitor.mjs` so
coverage-guidance rotation cannot re-enable a group while the cooldown is
active and no likely-real failures are visible. The broader
`duplicate-noise-20260516T200720Z-synthesis.md` remains relevant for the
no-analysis-sentinel and consumer-visibility follow-up. This is control-plane
cleanup only; do not broaden product-failure suppression.

The previous duplicate/noise synthesis,
`duplicate-noise-20260516T194153Z-synthesis.md`, drove the latest completed
control-plane action. It made source state authoritative across watcher and
novelty accounting, which remains valid prior work.

The latest duplicate/noise feedback action,
`duplicate-noise-20260516T194153Z-feedback-action.md`, completed that bounded
control-plane fix:

- updated `rtc-browser-fuzz-triage-watcher.mjs` so `family-capped`,
  `source-suppressed`, and `stale-source` are non-launchable source states;
- stale-marked absent queued/retry signatures and propagated terminal
  non-actionable analysis/deep-analysis states back to triage;
- updated `rtc-browser-fuzz-novelty-monitor.mjs` to count effective
  actionability from watcher plus analysis/deep-analysis state;
- kept broader `unknown`, `timeout`, and `assertion` families visible when
  they have product evidence.

Validation for that completed duplicate/noise action:

```text
node --check passed:
  rtc-browser-fuzz-triage-watcher.mjs
  rtc-browser-fuzz-novelty-monitor.mjs
  rtc-browser-fuzz-analysis-tier.mjs
  rtc-browser-fuzz-deep-analysis-tier.mjs
  rtc-browser-fuzz-live-analysis-monitor.mjs

gate-only reconciliation ran across active coverage-guided run dirs
consumer path:
  launchableFamilyCapped=0
  launchableStrictStartupZeroEvidence=0
  active launchable sample before final monitor pass: 13/13 had product evidence
```

The action restarted `rtc-coverage-guided-novelty`, killed stale orphan novelty
PID `425706`, did not restart the supervisor, and killed a newly launched
coverage-guidance Codex session so no new open-ended Codex work remained. Its
measured post-action status was:

```text
actionable signatures: 15
non-actionable signatures: 167
bootstrap-stall signatures: 0
family-capped signatures: 58
analysis-gated non-actionable signatures: 68
top duplicate family share: 0.4
raw top duplicate family share: 0.2253
```

The earlier completed duplicate/noise action
`duplicate-noise-20260516T190835Z-feedback-action.md` remains relevant prior
control-plane work: it separated raw/actionable signatures, preserved
known-infra REST/meta noise as raw/non-actionable, excluded known noise from
the productive duplicate-share gate, and aligned the binding duplicate/noise
threshold.

The earlier non-empty duplicate/noise feedback action
`duplicate-noise-20260516T183238Z-feedback-action.md` remains relevant prior
control-plane work: it capped first-tier analysis by family, propagated
high-confidence non-actionable gates through triage, scoped novelty current-run
accounting to active supervisor run dirs, counted suppressed strict startup
noise, cleaned stale old-root analysis sessions, and aligned novelty/supervisor
to `run-20260516T185058Z`.

Remaining duplicate/noise risk: active triage now has `17` actionable
signatures, led by `unknown`, `timeout`, collaboration non-convergence, and one
assertion. Those are intentionally left visible because they may include product
evidence such as users, actions, reload/save/fault context. The newest novelty
snapshot reports actionable and raw signature counts separately after the policy
reset and control-plane fix; known-infra REST/meta noise should no longer drive
the binding product-policy gate, and source-state reconciliation is now applied.
Historical/combined metrics still carry old raw bootstrap noise, so use them as
trend/control-plane context rather than live product-failure evidence.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older PR13
GitHub-facing review-ref warnings and then-current constrained group mix are
superseded by the `2026-05-16T20:40:52Z` branch-link audit and the
`2026-05-16T20:40:15Z` novelty snapshot. The audit verifies the repaired PR13
review refs listed above, while the novelty snapshot still does not count as
final-stack validation.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Dropped PR 6B save snapshot/no-op guard | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | dropped from filing path and allow-list after corrected replay classification | Do not rerun as the next gate; track seed `5500002` separately as revision-restore marker retention if it reproduces cleanly |
| Revision-restore marker retention | seed `5500002`; active lifecycle seed `970001` triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| PR 16 malformed-save payload candidate lane | `deferred/rtc-malformed-save-payload-20260516T202017Z` at `2270c2e955a`; no verified filing branch | independent conditional lane, not filing-ready and not the dropped PR 6B candidate; existing replay hit `collaborationEnabled=null` before product actions | Restack/compare onto `ready/rtc-pr15c-fallback-group-delete-green` with built assets, replay malformed rows plus seeds `7410076` and `7410083`, run focused Jest/lint/replay evidence, and add a verified branch link |
| PR 6C malformed evaluated save content | no verified filing branch | superseded by the broader PR16 candidate-lane decision unless focused evidence narrows it again | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR 8A is revived |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals outside PR16 | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | still not fixed or filing-ready outside the conditional PR16 lane | Keep any broader residuals deferred until a source-level `saveEntityRecord()` / `prePersistPostType()` repro proves clean local blocks but malformed evaluated outgoing `content` |
| Seed `1020002` WebSocket marker divergence | completed `143821Z`, `151306Z`, `153219Z`, `160617Z`, `172434Z`, `180529Z`, and `185531Z` reports; the `185531Z` caller/base-provenance diagnostic says caller/base propagation is not the owner | active PR17/final-stack blocker; no completed PR17 report or branch yet; page 0 still misses marker `async-server-1020002-0-1-589451` while page 1/relay retain it | Consume the active bounded merge/update-emission repair seeded from the `185531Z` report, or run exactly one bounded replacement if it exits reportless; require focused seed `1020002` to pass or be explicitly reclassified, then shape PR17 with a verified branch link before filing |
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
5. Restack/compare the new PR16 malformed-save candidate
   `deferred/rtc-malformed-save-payload-20260516T202017Z` at `2270c2e955a` onto
   `ready/rtc-pr15c-fallback-group-delete-green`, repair the replay harness and
   built-assets setup if needed, replay the malformed rows plus seeds `7410076`
   and `7410083`, run focused checks, and add a verified branch link before
   filing it. Exclude `f51c425df8a5` and `f46859898576` from PR16 claims unless
   they are localized.
6. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
7. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the actual filing repo.
8. Rerun focused checks, touched-file lint, and `git diff --check` on every
   imported/rebased branch.
9. Keep dirty analysis-only artifacts out of product PR branches.
10. Consume the active bounded seed `1020002` merge/update-emission repair
    seeded from the completed caller/base diagnostic, or run exactly one
    bounded replacement if it exits reportless. Require the focused seed gate
    to pass or be explicitly reclassified, then shape PR17 and add a verified
    branch link before filing.
11. Rebuild the combined stack from the explicit `ready/rtc-*` known-fix
    prefix, PR02A, the accepted PR16 decision, and the PR17 `1020002` decision,
    then rerun bounded final-stack validation against the rebuilt stack. Count
    it only if it reaches action-level product coverage.
12. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy, but do not add broad
lanes while the PR16/PR17 decisions are open. The latest remote status, novelty,
and trend packets show current fuzz health with zero visible likely-real
failures, current common-blocks WS startup/discovery pause, persistence-no-title
browser-budget rotation, a low-fault HTTP persistence canary, and block-gauntlet
held by sticky duplicate/noise cooldown. The actionable/raw duplicate-noise
accounting split and source-state reconciliation have been patched in the
control plane; the current `17` actionable signatures need ordinary monitoring,
and old historical bootstrap noise should stay separated from current live
product evidence. The sticky-pause/no-analysis sentinel work remains
control-plane follow-up only.
None of this is final-stack fuzz validation or a filing unblocker.
