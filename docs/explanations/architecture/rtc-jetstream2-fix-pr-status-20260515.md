# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T20:54:36Z`

Trigger event:
`duplicate-noise-2026-05-16T20-44-41Z-74`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-16T20-44-41Z-74/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The latest split-persona consensus from
`pr-split-20260516T203941Z-synthesis.md` keeps the replacement split: the
`PR01` through `PR15C` `ready/rtc-*` set plus PR02A is useful and auditable, but
still only a known-fix prefix. The tail remains conditional `PR16`
malformed-save replay/restack, then separate `PR17` seed `1020002`
WebSocket/Yjs repair. Both latest tail reports now exist, but neither produces a
filing-ready repair: PR16 is maintainer-sized but its replay failed before
product evidence because the throwaway clone lacked built assets, and PR17 still
fails marker propagation for seed `1020002`.

The current maintainer-facing filing shape is:

```text
ready/rtc-* PR01-PR15C prefix, including PR02A
-> conditional PR16 malformed-save payload candidate after built-assets replay passes
-> separate PR17 seed 1020002 WebSocket/Yjs merge-update-emission repair
-> rebuilt combined validation stack
-> focused seed 1020002 gate
-> final-stack fuzz and filing
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
the `180529Z` CRDT block-array semantic-diff repair report, the completed
`185531Z` caller/base-provenance diagnostic report, and the latest
merge-update-emission report are diagnostic-only because their candidates did
not pass the focused seed gate. The caller/base diagnostic says caller/base
propagation is not the owner; the latest PR17 report still leaves the owner in
CRDT/Yjs merge-update emission after `mergeYBlocksStaleBaseSemanticInsert`.
Keep `1020002` separate unless a new report proves exact ownership by an
existing ready PR. The next bounded PR17 attempt should add full source-side
normalized semantic helper overlay plus `try`/`catch`/`finally` instrumentation
around `mergeYBlocksStaleBaseSemanticInsert`.

Malformed-save is no longer merely "queued behind `1020002`." Treat it as an
independent `PR16` candidate lane, still conditional and not filing-ready. The
latest split synthesis keeps the preferred source material at
`deferred/rtc-malformed-save-payload-20260516T202017Z` at `2270c2e955a`,
restacked on `ready/rtc-pr15c-fallback-group-delete-green`. The latest PR16
report says the restack is maintainer-sized, but replay failed before product
evidence because the throwaway clone lacked built assets. Run a built-assets
replay before filing: `npm run build`, isolated `wp-env-test`, malformed rows
`954627`, `950109`, `954076`, `952863`, `954223`, `954557`, plus seeds
`7410076` and `7410083`. Then run focused validation and add a verified branch
link. Do not revive the dropped old `PR6B` save-snapshot/no-op candidate.

The duplicate/noise control plane has two completed relevant fixes plus one new
actionable follow-up from `duplicate-noise-20260516T204441Z-synthesis.md`. The
`194153Z` action made source state authoritative across watcher and novelty
accounting. The `201946Z` action completed the sticky scheduler fix:
duplicate/noise pauses now hold for a 6h cooldown, a
`.triage-watcher/no-analysis.json` sentinel is written for producer-side
no-product-evidence groups, and triage/analysis/deep-analysis/live analysis
consumers honor that sentinel while preserving product-evidence failures. The
newest synthesis says strict pre-action bootstrap suppression is mostly working
downstream, but remaining no-product noise can still leak through producer and
analysis controls. Its smallest safe next pass is to map
`novelty-http-persistence-probe` to `persistence-no-title`, let suppressed
strict startup counts/identities drive per-profile or per-group pauses, preserve
all `hasProductEvidence` paths, and fix mechanical duplicate-analysis gates if
confirmed. This is fuzz control-plane hygiene, not product validation and not a
filing unblocker.

The prior bounded `1020002` caller/base diagnostic has completed, and the
follow-on PR16/PR17 jobs now have reports. The latest split synthesis confirms
that no new structural split is needed, but the Parallel Progress Gate remains
non-empty because both reports are blocking/non-filing outcomes. The newest
split feedback action, `pr-split-20260516T203941Z-feedback-action.md`, updated
the remote split report to Cycle 192 consensus, recorded that the `33`-row push
manifest is local-machine-only and not for Jetstream-to-GitHub publication, and
launched two bounded follow-up jobs:

```text
rtc-malformed-save-payload-202017-built-assets-restack-replay-20260516T204851Z
rtc-ws-seed-1020002-merge-semantic-exit-instrumentation-20260516T204851Z
```

Those jobs supersede the earlier `195842Z` active-job status. They do not
unblock filing yet: PR16 still needs built-assets replay evidence and audit,
and PR17 still needs seed `1020002` to pass or be proof-reclassified. The older
Cycle 188 feedback action launched the now-reported jobs:

```text
rtc-ws-seed-1020002-merge-update-emission-diagnostic-repair-20260516T195842Z
rtc-malformed-save-payload-ready-restack-and-replay-20260516T195842Z
```

The older manifest audit/link job verified `12/12` manifest rows. A newer
progress-unblock audit then verified all `29` local `ready/rtc-*` heads for the
PR01-PR15C plus PR02A prefix and wrote a `33`-row local-only push manifest.
That still does not create remote PR-content links for the table below; the
table uses only `verified-content` rows from the branch-link audit, with
unaudited rows explicitly marked `No verified branch link yet`.

The latest novelty snapshot confirms the completed duplicate/noise scheduler
fix is active: `novelty-ws-block-gauntlet` is held by sticky
triage-duplicate-noise cooldown, coverage recommendations still include it, and
the monitor skips re-enable while the cooldown is active and likely-real remains
zero.

Do not launch broad final-stack fuzz yet. Do not fold seed `1020002` into PR13,
PR15, PR6B/PR6C, old PR16, PR8, reload hydration, pre-save collapse,
rich-text suffix, malformed-save work, broader HTTP room isolation, seed
`5500002`, seed `7410083`, or possible seed `5200001` without proof of exact
same-source ownership. Also do not let `1020002` serialize independent branch
audit/link work, PR02A/PR5A-C/PR11A-E handoff, malformed-save restack/replay,
or control-plane loop repair.

## Latest Branch And Ref Status

The remote status input was generated at `2026-05-16T20:54:31Z`.

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

The branch-link audit was generated at `2026-05-16T20:54:36Z` from fetched
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
| PR 16 | Malformed-save payload candidate lane | No verified branch link yet | TBD | TBD | independent conditional lane; latest report says maintainer-sized restack but replay failed before product evidence because built assets were missing; Cycle 192 built-assets restack/replay job is active; audit required before filing |
| PR 17 | Seed `1020002` WebSocket/Yjs marker-propagation repair | No verified branch link yet | TBD | TBD | active final-stack blocker; latest merge-update-emission report still fails seed `1020002`; Cycle 192 source-helper/exit-instrumentation job is active; focused seed gate and audited review branch required |

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
collected_at_utc: 2026-05-16T20:54:31Z
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
`2026-05-16T20:51:43.009Z` for `run-20260516T185058Z`:

```text
coverage files: 36127
total records seen: 54591
records processed this pass: 45
new behavioral feature keys this pass: 3
new CDP coverage hashes this pass: 3
current-run records by profile:
  async-server-blocks=93, block-gauntlet=87, session-lifecycle=63,
  long-session-large-doc=27, real-user-editing=76, persistence-no-title=15
current-run successful records by profile:
  async-server-blocks=74, block-gauntlet=66, session-lifecycle=45,
  real-user-editing=34, persistence-no-title=3
current-run records by transport: ws=349, http=12
current-run pre-action startup failures:
  async-server-blocks=10, persistence-no-title=6,
  block-gauntlet=4, session-lifecycle=4,
  long-session-large-doc=2, real-user-editing=4
current-run summary-only startup failures:
  block-gauntlet=3, async-server-blocks=5, session-lifecycle=2,
  long-session-large-doc=1, real-user-editing=2
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
current-output triage roots: 6
current-output state files: 6
current-output signatures: 15
current-output actionable signatures: 15
current-output raw signatures: 49
current-output non-actionable signatures: 34
current-output known-infra signatures: 14
current-output family-capped signatures: 9
current-output analysis-gated non-actionable signatures: 11
likely-real visible: 0
likely-real merged duplicates: 6
oracle/noise questions: 0
normalization-noise candidates: 0
bootstrap stalls: 0
suppressed strict startup records: 32
suppressed strict startup identities: 16
actionable top duplicate family share: 0.5333
raw top duplicate family share: 0.2857
top actionable semantic families:
  timeout=8, unknown=3, collaboration_non_convergence=2, assertion=2
top raw semantic families:
  rest_meta_database_error=14, timeout=12, collaboration_non_convergence=5,
  unknown=4, assertion=3
historical likely-real merged duplicates: 465
historical normalization-noise candidates: 456
historical bootstrap stalls: 14433
historical actionable top duplicate family share: 0.3542
historical raw top duplicate family share: 0.5451
quality issues: 3
health: warning, triage yield duplicate/noise dominated
headroom for adding groups: yes
load1: 62.11 / 64 cores
memory: 428.5G free / 492.0G total
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
sticky triage-duplicate-noise cooldown. The monitor then skipped
coverage-guided re-enable for that group at `20:40:15Z`, `20:43:03Z`, and
`20:45:47Z`, `20:48:53Z`, and `20:51:42Z` because the cooldown was still
active.
The current `0` visible likely-real count is fuzz-health evidence only.
Historical known-noise remains advisory/control-plane evidence; do not treat it
as live product failure or as final-stack validation.

The latest novelty snapshot still has `novelty-ws-common-blocks` paused after
startup/discovery failures and `novelty-ws-persistence-no-title` paused for
budget rotation. `novelty-ws-block-gauntlet` is now paused for sticky
duplicate/noise cooldown rather than immediately reenabled for the `core/html`
coverage gap. The current novelty snapshot has `15` actionable signatures
visible and a duplicate-dominated warning. Treat the completed `194153Z`
source-state fix, the completed `201946Z` sticky cooldown/no-analysis-sentinel
fix, and the `204441Z` follow-up synthesis as control-plane evidence, not
product validation.

The latest trend evidence packet was generated at `2026-05-16T20:46:22Z` from
monitor data through `2026-05-16T20:45:47Z`. Use it for trend shape, while the
later novelty snapshot above is the current group and policy state:

```text
monitor passes: 1691
coverage files: 272 -> 36083
coverage files delta: 35811
unmet coverage goals: 24 -> 7
likely_real_max: 0
duplicate_share_current_last: 0.3846
duplicate_share_historical_last: 0.3544
summary_startup_failures_last: 1
quality_issues_last: 1
fuzz level mix: browser-e2e=31 lanes/31 groups; unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 1599966
browser-e2e execution: 78174 cumulative / 468 per-hour
unit-property execution: 1412776 cumulative / 9632 per-hour
coverage-guided-lower-level execution: 106010 cumulative / 2304 per-hour
load1: 69.7 / 64 cores
memory: 429.7G free
```

Largest remaining coverage gaps in the later novelty snapshot are
`reload-post-action` (`608/1000`), `ui-heading-shortcut` (`631/1000`),
title-save-reload (`222/500`), body-save-reload (`281/500`), successful
real-user-editing records (`345/500`), `ui-format-paragraph` (`911/1000`),
and `core/html` (`458/500`).

This is useful fuzz-health and control-plane evidence. It is not final-stack
validation for filing.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T203941Z-synthesis.md`. Its consensus:

- Keep the replacement shape; no new structural PR split is justified.
- Treat `PR01` through `PR15C` plus PR02A as a useful and auditable known-fix
  prefix, not a filing-ready final stack.
- Keep PR13 logically as the green source sequence `13A`, `13B0`, `13B1`,
  `13B2`, and `13B3`, followed by PR14 and PR15A-C. The table still uses the
  repaired audited PR13A/B/C links because those are the current
  `verified-content` PR13 links.
- Keep conditional `PR16` malformed-save payload work independent. The latest
  report exists and says the restack is maintainer-sized, but it failed before
  product replay evidence because built assets were missing. Run the built-assets
  replay before any filing slot.
- Keep `PR17` as the seed `1020002` WebSocket/Yjs marker-propagation repair
  unless exact same-source ownership by an existing ready PR is proven. The
  latest PR17 report exists and still fails marker propagation. The next bounded
  owner remains CRDT/Yjs merge/update emission after
  `mergeYBlocksStaleBaseSemanticInsert`, with source-side normalized semantic
  helper overlay and `try`/`catch`/`finally` instrumentation.
- Do not launch broad final-stack fuzz. The Jetstream loop has launched the
  PR16 built-assets replay and PR17 source-helper/exit-instrumentation repair.
  A lower-priority reload/rejoin unsaved-edits UI repro remains evidence-only.
- Treat wait-only feedback as invalid while the Parallel Progress Gate still has
  actionable rows. Active `1020002`, an active tmux session without an artifact,
  or a zero-byte `report.md` must not satisfy the gate while non-`1020002`
  rows exist.
- Tptacek's `PR18` reload/rejoin gate is worth a bounded evidence job, but it is
  not a consensus PR slot yet. Treat it as evidence-only until a real UI repro
  proves the family.
- After PR16 and PR17 are decided, rebuild the combined validation stack, run the
  focused `1020002` gate, then run final-stack fuzz.

The latest split feedback action file in the collected inputs is
`pr-split-20260516T203941Z-feedback-action.md`, and it was non-empty. It added
Cycle 192 consensus to the remote split report, kept the tail as conditional
`PR16 -> PR17/1020002 -> rebuilt validation -> focused seed gate -> final
fuzz/filing`, recorded that the explicit `33`-row push manifest is
local-machine-only, and launched:

```text
rtc-malformed-save-payload-202017-built-assets-restack-replay-20260516T204851Z
rtc-ws-seed-1020002-merge-semantic-exit-instrumentation-20260516T204851Z
```

Both tmux sessions were verified active and `bash -n` passed for both launcher
scripts. The earlier `195842Z` PR16 and PR17 jobs now have reports but did not
unblock filing. The progress-unblock audit verified all `29` local
`ready/rtc-*` PR01-PR15C plus PR02A heads and wrote a `33`-row local-only push
manifest: the `29` ready heads plus latest malformed-save product candidate,
pre-save diagnostic branch, reload-hydration standalone candidate, and HTTP
room-isolation standalone companion. That does not override the branch-link
audit: the branch-link audit still has no remote `verified-content` rows for
PR02A, PR5A-C, PR8A, PR11A-E, PR16, or PR17, so those table rows remain
`No verified branch link yet`. Publishing should consume the explicit `33`-row
manifest, not wildcard refs.

The latest duplicate/noise synthesis is
`duplicate-noise-20260516T204441Z-synthesis.md`. It says strict
`pre_action_bootstrap_stall` suppression is no longer the main
triage-analysis leak; the remaining leak is control-plane code that measures
suppressed or known no-product noise but does not consistently stop producers,
cool down noisy groups, or prevent duplicate analysis launches. The clearest
shared concrete leak is `novelty-http-persistence-probe` missing from
`PROFILE_BY_GROUP`, so `persistence-no-title` startup failures can bypass
profile-based pause logic. Its next bounded action is to add that profile
mapping, make suppressed strict startup counts/identities drive per-profile or
per-group pauses, preserve all `hasProductEvidence` paths, and fix mechanical
duplicate-analysis gates such as the analysis family-count cap or attempt/final
duplicate ingestion if confirmed.

The previous duplicate/noise synthesis,
`duplicate-noise-20260516T201946Z-synthesis.md`, identified the scheduler
re-feeding noisy producers as the previous leak. The paired feedback action,
`duplicate-noise-20260516T201946Z-feedback-action.md`, completed the bounded
control-plane fix:

- made `novelty-ws-block-gauntlet` duplicate/noise pauses sticky for a 6h
  cooldown so coverage guidance cannot immediately re-enable the same noisy
  family;
- wrote `.triage-watcher/no-analysis.json` for producer-side duplicate/noise
  pauses;
- updated triage, analysis, deep-analysis, and live-analysis consumers to honor
  that sentinel for no-product-evidence signatures while preserving
  product-evidence failures;
- prevented live analysis from treating stale recovering generation dirs as
  active.

Validation for that completed duplicate/noise action:

```text
node --check passed:
  rtc-browser-fuzz-novelty-monitor.mjs
  rtc-browser-fuzz-triage-watcher.mjs
  rtc-browser-fuzz-analysis-tier.mjs
  rtc-browser-fuzz-deep-analysis-tier.mjs
  rtc-browser-fuzz-live-analysis-monitor.mjs

consumer-path checks:
  novelty monitor paused novelty-ws-block-gauntlet under sticky cooldown
  no-analysis sentinel was written for the block-gauntlet producer generation
  triage watcher --once --gate-only recorded producerNoAnalysis
  live-analysis --once marked stale block-gauntlet state stale
  product-evidence queued signatures remained visible
```

The action restarted `rtc-coverage-guided-novelty` and
`rtc-coverage-guided-analysis`, then ran one bounded live-analysis pass for
stale-session cleanup. Its measured post-action status showed
`novelty-ws-block-gauntlet` paused, coverage recommendations still including it
but skipping re-enable due to sticky cooldown, `likelyReal=0`, and no active
coverage-guided live/deep analysis sessions for block-gauntlet. The latest
novelty snapshot now reports:

```text
actionable signatures: 15
raw signatures: 49
non-actionable signatures: 34
bootstrap-stall signatures: 0
family-capped signatures: 9
analysis-gated non-actionable signatures: 11
top duplicate family share: 0.5333
raw top duplicate family share: 0.2857
```

The previous duplicate/noise synthesis,
`duplicate-noise-20260516T194153Z-synthesis.md`, drove the earlier completed
source-state reconciliation action. That prior work remains valid: source
states `family-capped`, `source-suppressed`, and `stale-source` are
non-launchable, absent queued/retry signatures are stale-marked, terminal
non-actionable analysis/deep-analysis states are propagated back to triage, and
effective actionability is read from watcher plus analysis/deep-analysis state.

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

Remaining duplicate/noise risk: active triage now has `15` actionable
signatures, led by `timeout`, `unknown`, collaboration non-convergence, and two
assertions. Those are intentionally left visible because they may include product
evidence such as users, actions, reload/save/fault context. The newest novelty
snapshot reports actionable and raw signature counts separately after the policy
reset and completed control-plane fixes, and the newest duplicate/noise
synthesis identifies the remaining no-product producer/startup and duplicate
analysis gates to patch next. Known-infra REST/meta noise should no longer drive
the binding product-policy gate. Historical/combined metrics still carry old
raw bootstrap noise, so use them as trend/control-plane context rather than live
product-failure evidence.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older PR13
GitHub-facing review-ref warnings and then-current constrained group mix are
superseded by the `2026-05-16T20:54:36Z` branch-link audit and the
`2026-05-16T20:51:43Z` novelty snapshot. The audit verifies the repaired PR13
review refs listed above, while the novelty snapshot still does not count as
final-stack validation.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Dropped PR 6B save snapshot/no-op guard | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | dropped from filing path and allow-list after corrected replay classification | Do not rerun as the next gate; track seed `5500002` separately as revision-restore marker retention if it reproduces cleanly |
| Revision-restore marker retention | seed `5500002`; active lifecycle seed `970001` triage | queued behind final-stack blockers; no automatic PR slot | Triage only after `1020002` is repaired or reclassified and the rebuilt stack is available |
| PR 16 malformed-save payload candidate lane | `deferred/rtc-malformed-save-payload-20260516T202017Z` at `2270c2e955a`; no verified filing branch | independent conditional lane, not filing-ready and not the dropped PR 6B candidate; latest report says the restack is maintainer-sized but replay failed before product evidence because built assets were missing; Cycle 192 built-assets restack/replay job is active | Consume the Cycle 192 restack/replay result, require built assets plus malformed rows `954627`, `950109`, `954076`, `952863`, `954223`, `954557` and seeds `7410076`/`7410083` to pass or clearly fail, run focused Jest/lint/replay evidence, and add a verified branch link |
| PR 6C malformed evaluated save content | no verified filing branch | superseded by the broader PR16 candidate-lane decision unless focused evidence narrows it again | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR 8A is revived |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Reload/rejoin unsaved-edits UI repro (`PR18` idea) | Tptacek reload/rejoin gate from latest split synthesis | evidence-only and lower priority; not a consensus PR slot | Run only as a bounded UI repro job; promote only if a real UI repro proves the family |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, edited core-data record, live CRDT record, provider state, REST body, and save state around `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals outside PR16 | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | still not fixed or filing-ready outside the conditional PR16 lane | Keep any broader residuals deferred until a source-level `saveEntityRecord()` / `prePersistPostType()` repro proves clean local blocks but malformed evaluated outgoing `content` |
| Seed `1020002` WebSocket marker divergence | completed `143821Z`, `151306Z`, `153219Z`, `160617Z`, `172434Z`, `180529Z`, `185531Z`, and latest merge-update-emission reports; the `185531Z` caller/base-provenance diagnostic says caller/base propagation is not the owner | active PR17/final-stack blocker; latest PR17 report still fails marker propagation and no verified filing branch exists; page 0 still misses marker `async-server-1020002-0-1-589451` while page 1/relay retain it; Cycle 192 source-helper/exit-instrumentation job is active | Consume the Cycle 192 source-helper/exit-instrumentation result around `mergeYBlocksStaleBaseSemanticInsert`; require focused seed `1020002` to pass or be explicitly reclassified, then shape PR17 with a verified branch link before filing |
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
5. Consume the active Cycle 192 PR16 malformed-save built-assets restack/replay
   job for
   `deferred/rtc-malformed-save-payload-20260516T202017Z` at `2270c2e955a` onto
   `ready/rtc-pr15c-fallback-group-delete-green`. It must repair the
   built-assets setup, run `npm run build`, start an isolated `wp-env-test`,
   replay malformed rows
   `954627`, `950109`, `954076`, `952863`, `954223`, `954557`, plus seeds
   `7410076` and `7410083`, run focused checks, and add a verified branch link
   before filing it. Exclude `f51c425df8a5` and `f46859898576` from PR16 claims
   unless they are localized.
6. Rebase or recreate each intended PR branch on the intended upstream base if
   that base moves.
7. Regenerate branch graph/containment evidence and adjacent
   range-diffs/diffstats from the actual filing repo.
8. Rerun focused checks, touched-file lint, and `git diff --check` on every
   imported/rebased branch.
9. Keep dirty analysis-only artifacts out of product PR branches.
10. Treat the latest seed `1020002` merge/update-emission report as a
    non-filing result. Consume the active Cycle 192 PR17 repair with full
    source-side normalized semantic helper overlay plus
    `try`/`catch`/`finally` instrumentation around
    `mergeYBlocksStaleBaseSemanticInsert`. Require the focused seed gate to pass
    or be explicitly reclassified, then shape PR17 and add a verified branch
    link before filing.
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
accounting split, source-state reconciliation, sticky pause cooldown, and
no-analysis sentinel are now patched in the control plane; the current `15`
actionable signatures need ordinary monitoring; the `204441Z` duplicate/noise
synthesis identifies one more bounded producer/startup/analysis control-plane
pass; and old historical bootstrap noise should stay separated from current
live product evidence.
None of this is final-stack fuzz validation or a filing unblocker.
