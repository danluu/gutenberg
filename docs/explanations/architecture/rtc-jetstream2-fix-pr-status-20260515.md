# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T17:42:51Z`

Trigger event:
`pr-split-2026-05-16T17-41-54Z-20260516T173627Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T17-41-54Z-20260516T173627Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The explicit PR01 through PR15C set is only a
known-fix prefix, not a filing-ready stack.

The latest split-persona synthesis,
`pr-split-20260516T173627Z-synthesis.md`, keeps the blocker state:

```text
explicit 28-head known-fix prefix
-> new narrow post-PR15C seed 1020002 WebSocket/Yjs store-transition repair PR
-> rebuilt combined validation stack
-> focused seed 1020002 gate
-> final-stack fuzz
```

Seed `1020002` is confirmed WebSocket/Yjs marker divergence. Page 0 reports
connected/synced but lacks marker `async-server-1020002-0-1-589451`; page 1
and the relay retain it.

The previously missing repair report now exists:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T160617Z/jobs/outputs/rtc-ws-seed-1020002-sync-manager-load-hydrate-repair-20260516T160617Z/report.md
```

Treat that report as diagnostic evidence, not a fix branch. Its candidate did
not pass the focused seed gate: seed `1020002` still fails with page 0 missing
the marker while page 1 and the relay retain it. The latest synthesis moves
the likely boundary away from pure `@wordpress/sync` load/hydrate replay and
toward Gutenberg-origin store-to-CRDT replacement / receiver-side Yjs
integration.

The next maintainer-facing split should therefore keep the known-fix prefix and
append a new post-`PR15C` WebSocket/Yjs repair PR only after a bounded repair
passes the focused `1020002` gate. The latest feedback action launched that
bounded repair:

```text
rtc-ws-seed-1020002-gutenberg-store-crdt-repair-20260516T172434Z
```

Scope it to `packages/core-data/src/utils/crdt*.ts`,
`syncConfig.applyChangesToCRDTDoc`, and receiver-side Yjs integration where a
new marker-bearing client range is present but fully deleted.

As of the `173627Z` synthesis, the expected report was still absent and the
tmux session was active:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T172434Z/jobs/outputs/rtc-ws-seed-1020002-gutenberg-store-crdt-repair-20260516T172434Z/report.md
```

Consume that report before launching any new split-review or fuzz-expansion
work. If the job exits without a usable report, rerun exactly one bounded
instance of:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T172434Z/jobs/run-rtc-ws-seed-1020002-gutenberg-store-crdt-repair-20260516T172434Z.sh
```

Do not fold seed `1020002` into PR13, PR15A-C, PR6B/PR6C, old PR16, reload
hydration, pre-save collapse, rich-text suffix, malformed-save residuals, or
HTTP room isolation unless a later passing repair proves exact same-source
ownership. Do not restart broad final-stack fuzz, extra fuzz lanes, reload
diagnostics, PR6B/PR6C work, old PR16 replay, PR13 repair/import work, or
another split-review loop before the bounded `1020002` repair passes or is
explicitly reclassified.

The latest duplicate/noise work is control-plane evidence, not product PR
evidence. The completed `170226Z` feedback action applied a global
startup-noise admission hold in `rtc-browser-fuzz-novelty-monitor.mjs` and
validated it. The later `172740Z` duplicate/noise synthesis edited no files and
recommends narrower runner, triage-watcher, novelty-monitor, and optional
supervisor handling for strict zero-product pre-action startup stalls. Neither
item unblocks final-stack fuzz.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T17:42:46Z`.

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

That stack has modified product/test files and many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-16T17:42:51Z` from fetched
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
branch-link audit or explicitly says `No verified branch link yet`. This table
is the maintainer-facing split recommendation: the known-fix prefix plus the
current post-`PR15C` blocker slot for seed `1020002`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified branch; seed `5500002` marker-retention remains separate follow-up |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified branch; keep in known-fix prefix |
| PR 5A | Entity/entity-reference normalization in `crdt.ts` | No verified branch link yet | 2 | +465 / -8 | replacement for old aggregate PR 5; needs audited review branch |
| PR 5B | Parser/rich-text HTML equivalence in `crdt-blocks.ts` | No verified branch link yet | 2 | +925 / -42 | replacement for old aggregate PR 5; needs audited review branch |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | 2 | +287 / -15 | replacement for old aggregate PR 5; needs audited review branch |
| PR 6 | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified branch; excludes dropped PR 6B and broader malformed-save residuals |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified branch; narrow persisted-body guard |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified branch; repaired split head |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified branch stacked after PR 7A; repaired split head |
| PR 8A | Narrow title reload replacement | No verified branch link yet | TBD | TBD | broad verified PR 8 is not the active filing unit; shape a narrow title-reload branch only if revived |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified branch; keep in known-fix prefix |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified branch; start CRDT block stack |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | 2 | +257 / -3 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | 2 | +240 / -2 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11C | Explicit-base middle insert | No verified branch link yet | 2 | +220 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | 2 | +259 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | 2 | +170 / -0 | green in validation-stack rebuild; needs audited review branch before filing |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified branch; keep in known-fix prefix |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first maintainer-facing PR 13 delta |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired audit link; covers source-retirement content while green B1/B2/B3 subheads lack individual audit rows |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired audit link; covers identity/provenance guard content while green B0 lacks its own audit row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified branch; keep after PR13 source sequence |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified branch; keep reload-hydration gate spec out |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified branch; keep reload-hydration gate spec out |
| New post-PR15C PR | Seed `1020002` WebSocket/Yjs store-transition repair, now narrowed toward Gutenberg-origin store-to-CRDT replacement / receiver-side Yjs integration | No verified branch link yet | TBD | TBD | active blocker; `160617Z` repair report exists but failed the focused seed gate; `172434Z` store-to-CRDT/Yjs repair job is active and must pass or reclassify before branch shaping |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5 (`4` files, `+1664 / -52`), not
  the recommended maintainer-facing split.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8 (`11` files, `+618 / -61`), not an
  active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11 (`2` files, `+1145 / -4`), but
  the active recommendation is the green PR 11A-E split.

The latest allow-list shape still names green source subheads
`PR 13B0/B1/B2/B3`. Those are source-shaping facts for the validation ref.
Until individual branch-link-audit rows exist for those subheads, the
maintainer-facing PR13 links are the repaired audited `PR 13A/B/C` refs shown
above.

## Fuzz And Validation Status

Latest collected status input:

```text
collected_at_utc: 2026-05-16T17:42:46Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T163736Z
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
stack because seed `1020002` still needs the post-`PR15C` repair decision.

The fresh `novelty-status.md` snapshot was updated at
`2026-05-16T17:40:42.040Z` for
`run-20260516T163736Z`:

```text
coverage files: 34481
total records seen: 51410
records processed this pass: 16
current-run records: async-server-blocks=3, block-gauntlet=3, common-blocks=3,
  long-session-large-doc=3, media-cross-entity=3, parser-transform=3,
  persistence-no-title=2, real-user-editing=4, session-lifecycle=3
current-run successful records: 0
current-run pre-action startup failures: async-server-blocks=3,
  block-gauntlet=3, common-blocks=3, long-session-large-doc=3,
  media-cross-entity=3, parser-transform=3, persistence-no-title=2,
  real-user-editing=4, session-lifecycle=3
recommended groups: none
enabled groups: none
startup-noise held recommended groups: novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text, novelty-ws-block-gauntlet,
  novelty-ws-common-blocks, novelty-ws-parser-transform,
  novelty-ws-async-server-blocks, novelty-ws-media-cross-entity,
  novelty-ws-long-session-large-doc
likely-real visible: 0
likely-real merged duplicates: 0
oracle/noise questions: 0
normalization-noise candidates: 0
current-run signatures: 36
known-noise signatures: 18
current-run top duplicate family share: 1
historical top duplicate family share: 0.5862
headroom for adding groups: yes
load1: 57.43 / 64 cores
memory: 431.1G free / 492.0G total
```

The current-run triage family is fully dominated by strict
`pre_action_bootstrap_stall` startup noise (`36/36`, share `1`). This is useful
control-plane health evidence, not final-stack validation and not product
failure evidence.

The latest trend evidence packet was generated at `2026-05-16T17:37:06Z` from
monitor data through `2026-05-16T17:36:31Z`:

```text
monitor passes: 1620
coverage files: 272 -> 34466
coverage files delta: 34194
unmet coverage goals: 24 -> 5
likely_real_max: 0
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.5862
summary_startup_failures_last: 0
quality_issues_last: 2
enabled groups current in trend snapshot: none
fuzz level mix: browser-e2e=25 lanes/25 groups; unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
browser-e2e execution: 58086 cumulative / 2736 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
unit-property execution: 910708 cumulative / 72240 per-hour
coverage-guided-lower-level execution: 21814 cumulative / 3456 per-hour
load1: 66.0 / 64 cores
memory: 422.9G free
```

Largest remaining current unmet goals from the trend packet:

- successful real-user-editing records: `287/500`
- CDP coverage records: `4887/5000`
- `core/html`: `390/500` in the trend packet, `392/500` in the later novelty snapshot
- `core/details`: `439/500` in the trend packet, `440/500` in the later novelty snapshot
- `core/more`: `471/500` in the trend packet, `472/500` in the later novelty snapshot

Weak completion profiles still argue for startup-stall reduction and guarded
top-offs over simply increasing browser concurrency. The weakest success ratios
in the trend packet are `full` (`18/840`), `revision-persistence`
(`93/3510`), `multi-reload-lifecycle` (`79/2678`),
`parser-serialization` (`72/2171`), and `real-user-editing` (`287/5260`).

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T173627Z-synthesis.md`. Its consensus:

- Filing remains blocked and the split still needs the known-fix prefix plus a
  new post-`PR15C` seed `1020002` repair PR.
- The `160617Z` sync-manager load/hydrate repair report now exists, but did
  not produce a seed-passing repair.
- The report narrows the remaining boundary toward Gutenberg-origin
  store-to-CRDT replacement / receiver-side Yjs integration.
- The `172434Z` feedback action launched one bounded repair for that path:
  `rtc-ws-seed-1020002-gutenberg-store-crdt-repair-20260516T172434Z`.
- As of the `173627Z` synthesis, that repair report was still absent and the
  tmux session was active. Consume it before launching new review or fuzz
  expansion work.
- Require a passing focused `1020002` gate, then shape the repair as the
  post-`PR15C` PR or reclassify only if ownership is proven.
- After seed `1020002` passes, rebuild the combined stack, regenerate graph,
  containment, range-diff, and diffstat evidence, rerun focused tests, lint,
  and `git diff --check`, then run final-stack fuzz.
- Keep broad PR8, PR8A until shaped/validated, PR1A HTTP room isolation, PR6B,
  PR6C, old PR16, reload hydration, pre-save collapse, rich-text suffix,
  malformed-save residuals, seed `7410083`, possible seed `5200001`, and other
  secondary families deferred.

The latest `pr-split-20260516T172434Z-feedback-action.md` completed the
feedback action by updating `current-pr-split.md`, treating PR01-PR15C as a
28-head known-fix prefix only, consuming the failed `160617Z` sync-manager
repair report as diagnostic-only, and launching the bounded
`rtc-ws-seed-1020002-gutenberg-store-crdt-repair-20260516T172434Z` tmux job.

The latest duplicate/noise synthesis is
`duplicate-noise-20260516T172740Z-synthesis.md`. It edited no files. It says
the current run is still dominated by strict pre-action startup noise:
`36/36` current triage signatures are `pre_action_bootstrap_stall`, with `0`
visible likely-real failures. Its smallest safe next control-plane fix is to
write only one gated infra/noise record for strict pre-action startup stalls in
`rtc-browser-fuzz-runner.mjs`, aggregate those stalls outside normal actionable
signature state in `rtc-browser-fuzz-triage-watcher.mjs`, make startup-noise
probation a hard admission gate in `rtc-browser-fuzz-novelty-monitor.mjs`, and
optionally pause zero-product strict-startup lanes earlier in
`rtc-browser-fuzz-supervisor.mjs`.

The latest duplicate/noise feedback action,
`duplicate-noise-20260516T172740Z-feedback-action.md`, is zero bytes, so no
new control-plane patch landed after that synthesis.

The latest completed duplicate/noise feedback action remains
`duplicate-noise-20260516T170226Z-feedback-action.md`. It changed
`bin/rtc-browser-fuzz-novelty-monitor.mjs`: current-run strict startup
dominance now holds every non-clean-release, non-floor profile instead of
rotating into fresh profiles with no current startup sample, and
`RUN_LOCAL_NOISE_POLICY_VERSION` is now `16`. Validation passed with:

```text
node --check bin/rtc-browser-fuzz-novelty-monitor.mjs
node --check bin/rtc-browser-fuzz-triage-watcher.mjs
node --check bin/rtc-browser-fuzz-analysis-tier.mjs
node --check bin/rtc-browser-fuzz-deep-analysis-tier.mjs
node --check bin/rtc-browser-fuzz-live-analysis-monitor.mjs
```

The isolated gate-only triage check found `36` signatures, all
`bootstrap-stall`, with `0` queued/retry and no analysis/deep-analysis state
created. Restart action restarted `rtc-coverage-guided-novelty` on the
existing active run script and killed one orphaned old-code novelty monitor
process. Current state from that feedback action:

```text
supervisor-groups.json: []
novelty-state.json runLocalNoisePolicyVersion: 16
novelty-state.json enabledGroups: []
active triage: 36 total signatures, all bootstrap stalls, 0 queued, 0 retry
```

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older warning
that GitHub-facing PR13 review links were stale is superseded by the
`2026-05-16T17:42:51Z` branch-link audit, which verifies the repaired PR 13
review refs listed above.

## Deferred Or Evidence-Only Work

These must not be described as fixed.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Dropped PR 6B save snapshot/no-op guard | `final/rtc-pr06b-save-snapshot-noop-guard`; seeds `5500001`, `5500002`, `5500006` | dropped from filing path and allow-list after corrected replay classification | Do not rerun as the next gate; track seed `5500002` separately as revision-restore marker retention if it reproduces cleanly |
| PR 6C malformed evaluated save content | no verified filing branch | blocked/deferred pending focused Jest, lint, and replay evidence | Promote only after focused product evidence and a verified branch link exist |
| Broad PR 8 persisted-record hydration | old audit branch [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | deferred; no active filing unit | Shape and audit a narrowed title-reload branch only if PR 8A is revived; give persisted-record hydration claims separate product evidence and a verified branch link |
| Reload hydration empty live editor | `e75c8829e4e9`, `3bbdc3cdb393`; gate branch `try/rtc-reload-hydration-gate-e75c8829` | evidence-only; not in PR 6, PR 6A, PR 8A, PR 15, or fallback-group claims | Promote only if a clean gate reaches the post-reload assertion and live editor state stays empty after exact-room WebSocket sync while REST body and persisted `_crdt_document` remain populated |
| Pre-save search/live document collapse | `ddf9559af37e`, `0932bed35c7a`, conditional `1e0ade5ec5a8`; `try/rtc-pre-save-search-collapse-gate-ddf9559` | evidence-only; not in active split | Capture editor blocks, serialized content, core-data edited record, live CRDT record, provider state, REST body, and save state before/after `core/search` insertion |
| Rich-text formatted suffix corruption | `4148230f681d`, `b0db7b80c6f2`, `dc8ea6e78d4d`, `1ccac75d7faa`, `2722f0e897de`, `712b98ba96ff` | not fixed; latest split keeps it out of the active PR split | Recover exact replay artifact or emitted delta before product changes |
| Malformed save payload and save-settlement residuals | `fc154ebec48c`, `e40aa1b7863d`, `f51c425df8a5`, `f46859898576`, `afd389d7f139`, `02289235f55f`, `eef8b8932e11`, `b60eecd4ac03` | deferred beyond dropped PR 6B and isolated PR 6C candidate | Create a source-level `saveEntityRecord()` / `prePersistPostType()` repro where clean local blocks exist but evaluated outgoing `content` is malformed |
| Seed `1020002` WebSocket marker divergence | completed `143821Z` repair report; completed `151306Z` state-vector/diff diagnostic; completed `153219Z` peer-client store-transition report; completed `160617Z` sync-manager load/hydrate report; active `172434Z` Gutenberg-origin store-to-CRDT/Yjs repair job | active final-stack blocker; classified as product divergence; `160617Z` report exists but failed the focused gate; page 0 still misses marker `async-server-1020002-0-1-589451` while page 1/relay retain it; likely owner is now Gutenberg-origin store-to-CRDT replacement / receiver-side Yjs integration; `172434Z` report was absent as of the latest synthesis | Consume the active `172434Z` repair report, require focused seed `1020002` to pass or be explicitly reclassified, then shape a new post-`PR15C` PR with a verified branch link before filing |
| Seed `7410083` final-persistence `_crdt_document` absence | queued by latest split persona | queued behind seed `1020002`; no automatic PR slot | Triage only after `1020002` is repaired, reclassified, and the rebuilt stack is available |
| Possible seed `5200001` same-user reload stale title/body | queued by latest split persona | possible follow-up only; no automatic PR slot | Deep-triage after `1020002` if it remains visible on the rebuilt stack |
| PR 16 valid-block `originalContent` candidate | seed replay candidate only | blocked/deferred; latest split synthesis says it is not part of the filing stack | Replay and classify the seed before considering any product branch or verified branch link |
| HTTP smoke `rest_crdt_document_stale` | final-stack bootstrap repair reached one HTTP action before this signal | separate triage signal; not split coverage and not a final-stack fuzz pass | Classify separately after the seed `1020002` repair/split decision |
| HTTP polling room-isolation residuals | `f5738470d026`, `fda8d2334e65`, conditional `fc99825fb6c2`, `b75435787be1`; possible PR 1A | deferred; possible PR 1A is not in the active split | Promote only if fuzzing still shows healthy post rooms stalled by auxiliary room failures after PR 1/2 |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr` branches as-is.

Before filing any maintainer-facing PR:

1. Use only the explicit filing/push allow-list from the clean validation-stack
   rebuild. Do not wildcard import or file `final/rtc-pr*`.
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR 13
   refs, dropped PR 6B, PR 6C, PR16 seed-replay candidates, dirty evidence
   branches, and the untracked reload-hydration gate spec out of filing
   branches and push allow-lists.
3. Push/import and audit individual PR 5A/5B/5C, PR 8A, and PR 11A-E review
   branches, or keep the table rows marked `No verified branch link yet`.
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
9. Consume the active `172434Z` store-to-CRDT/Yjs repair for seed `1020002`,
   require the focused seed gate to pass or be explicitly reclassified, then
   shape the new post-`PR15C` repair PR and add a verified branch link before
   filing.
10. Rebuild the combined stack from the 28-head known-fix prefix plus the new
   seed `1020002` repair PR, then rerun bounded final-stack validation against
   the rebuilt stack. Count it only if it reaches action-level product coverage.
11. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The latest trend
evidence has `likely_real_max: 0`, `5` unmet goals, current-run duplicate share
`1`, historical duplicate share `0.5862`, summary startup failures `0`,
quality issues `2`, and browser-e2e execution at `58086` cumulative / `2736`
per hour. The latest novelty snapshot has `34481` coverage files, `51410`
total records seen, `36` current-run signatures, `0` visible likely-real
failures, strict startup known-noise as the current-run dominant triage family,
no enabled groups, and the broader WS groups held by startup-noise probation.
Treat these remote status, novelty, and trend packets as useful control-plane
and fuzz-health evidence, not final-stack fuzz validation.
