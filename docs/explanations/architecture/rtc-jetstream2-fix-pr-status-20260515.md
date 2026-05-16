# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-16T18:37:43Z`

Trigger event:
`pr-split-2026-05-16T18-36-31Z-20260516T183027Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-16T18-36-31Z-20260516T183027Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Filing remains blocked. The old PR01 through PR15C / 28-head allow-list is
only a known-fix prefix, not a complete filing stack.

The latest split-persona synthesis,
`pr-split-20260516T183027Z-synthesis.md`, changes the maintainer-facing split
recommendation: use the `ready/rtc-*` split from the `20260516T181934Z`
finalization report as the current prefix, not wildcard `final/rtc-pr*`, add a
PR02A HTTP room-isolation regression sidecar after PR02, and keep seed
`1020002` as the blocking post-PR15C repair slot.

```text
ready PR01-PR15C known-fix prefix
+ PR02A HTTP room-isolation regression sidecar after PR02
+ new narrow post-PR15C seed 1020002 WebSocket/Yjs repair PR
-> rebuilt combined validation stack
-> focused seed 1020002 gate
-> final-stack fuzz
```

The filing path is therefore:

```text
ready/rtc-* prefix
+ PR02A mechanics decision
-> new narrow post-PR15C seed 1020002 WebSocket/Yjs repair PR
-> rebuilt combined validation stack
-> focused seed 1020002 gate
-> final-stack fuzz
```

Seed `1020002` is confirmed WebSocket/Yjs marker divergence. Page 0 reports
connected/synced but lacks marker `async-server-1020002-0-1-589451`; page 1
and the relay retain it.

The completed sync-manager load/hydrate repair report exists:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T160617Z/jobs/outputs/rtc-ws-seed-1020002-sync-manager-load-hydrate-repair-20260516T160617Z/report.md
```

Treat that report as diagnostic evidence, not a fix branch. Its candidate did
not pass the focused seed gate: seed `1020002` still fails with page 0 missing
the marker while page 1 and the relay retain it. The subsequent
Gutenberg-origin store-to-CRDT candidate also passed unit coverage but failed
the focused browser seed gate.

The next maintainer-facing split should therefore keep the `ready/rtc-*`
known-fix prefix, add the PR02A sidecar once its branch mechanics are decided,
and append a new post-`PR15C` WebSocket/Yjs repair PR only after a bounded
repair passes the focused `1020002` gate. The latest split synthesis says the
bounded repair job is already running:

```text
rtc-ws-seed-1020002-crdt-array-semantic-diff-repair-20260516T180529Z
```

Expected report:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T175703Z/jobs/outputs/rtc-ws-seed-1020002-crdt-array-semantic-diff-repair-20260516T180529Z/report.md
```

At the latest check, the tmux session was active and the report was still
missing or empty. If it exits without a usable report, rerun exactly that
launcher once. Scope the repair to `packages/core-data/src/utils/crdt*.ts` and
the active installed `core-data.js` overlay. Dump `yblocks.toJSON()`,
`options.baseRecord.blocks`, and `changes.blocks`; compare semantic keys while
ignoring `clientId`, `originalContent`, `isValid`, and validation-only fields,
with rich-text and attribute normalization. If the semantic diff confirms the
ownership boundary, implement the smallest explicit-base insert repair that
preserves current CRDT identities and inserts only the marker-bearing
`core/search` block, then rerun the focused seed `1020002` gate.

Do not fold seed `1020002` into PR13, PR15A-C, PR6B/PR6C, old PR16, reload
hydration, pre-save collapse, rich-text suffix, malformed-save residuals, or
broader HTTP room-isolation work unless a later passing repair proves exact
same-source ownership. Do not restart broad final-stack fuzz, extra fuzz lanes,
reload diagnostics, PR6B/PR6C work, old PR16 replay, PR13 repair/import work,
or another split-review loop before the bounded `1020002` repair passes or is
explicitly reclassified.

The latest split feedback-action file,
`pr-split-20260516T183027Z-feedback-action.md`, is empty and adds no completed
action. The latest completed split action remains
`pr-split-20260516T181436Z-feedback-action.md`, which recorded the Cycle 178
consensus in `current-pr-split.md` and launched no new jobs. Its follow-up is
superseded only by the `183027Z` synthesis additions: use the `ready/rtc-*`
prefix, include PR02A as a sidecar or fold/restack it if a linear stack is
required, wait for the active `1020002` report, rerun that same launcher at
most once if it exits without a usable report, and do not start duplicate
PR-split, PR13, PR6B/PR6C, reload, old PR16, extra fuzz lanes, or final-stack
fuzz work.

The latest duplicate/noise work is control-plane evidence, not product PR
evidence. The completed `180428Z` feedback action implemented the bounded
control-plane fix: `rtc-browser-fuzz-triage-watcher.mjs` now suppresses strict
zero-product-evidence startup records before signature enqueue, and
`rtc-browser-fuzz-novelty-monitor.mjs` holds duplicate/noise top-offs when
dominant `pre_action_bootstrap_stall` has zero visible likely-real signal.
`node --check` passed for both files. The newer
`duplicate-noise-20260516T182500Z-synthesis.md` says the remaining duplicate
noise is still a consumer control-plane leak: same-family queued signatures,
analysis caps, inactive run dirs, and stale live-analysis sessions need
current-run actionability cleanup. That is future control-plane work and does
not unblock final-stack fuzz or create product PR evidence.

## Latest Branch And Ref Status

The collected remote status input was generated at `2026-05-16T18:37:38Z`.

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

The branch-link audit was generated at `2026-05-16T18:37:43Z` from fetched
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
is the maintainer-facing split recommendation: the `ready/rtc-*` known-fix
prefix, a PR02A HTTP room-isolation sidecar from the latest finalization
consensus, and the current post-`PR15C` blocker slot for seed `1020002`.

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified branch; keep in known-fix prefix |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified branch; keep in known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | latest split-persona consensus adds this from the `20260516T181934Z` `ready/rtc-*` finalization; decide sidecar vs fold/restack mechanics before filing and audit a review branch |
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
| New post-PR15C PR | Seed `1020002` WebSocket/Yjs marker-propagation repair, narrowed to a CRDT/base/incoming block-array semantic-diff repair path | No verified branch link yet | TBD | TBD | active blocker; `160617Z` sync-manager and latest Gutenberg store-to-CRDT candidates failed the focused seed gate; `rtc-ws-seed-1020002-crdt-array-semantic-diff-repair-20260516T180529Z` is running and must pass or explicitly reclassify seed `1020002` before branch shaping |

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
collected_at_utc: 2026-05-16T18:37:38Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260516T175536Z
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
still needs the post-`PR15C` repair decision.

The fresh `novelty-status.md` snapshot was updated at
`2026-05-16T18:36:14.039Z` for
`run-20260516T175536Z`:

```text
coverage files: 35040
total records seen: 52550
records processed this pass: 31
current-run records by profile: common-blocks=31, parser-transform=20,
  async-server-blocks=32, long-session-large-doc=12, media-cross-entity=16,
  real-user-editing=28, block-gauntlet=6
current-run successful records by profile: common-blocks=21,
  parser-transform=13, async-server-blocks=23, real-user-editing=14,
  media-cross-entity=6, block-gauntlet=5
current-run records by transport: ws=145
current-run pre-action startup failures: parser-transform=2,
  media-cross-entity=2
current-run summary-only startup failures: media-cross-entity=1,
  parser-transform=1
recommended groups: novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text, novelty-ws-block-gauntlet
enabled groups: novelty-ws-common-blocks, novelty-ws-block-gauntlet,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text,
  novelty-ws-async-server-blocks, novelty-ws-long-session-large-doc
paused groups: novelty-http-persistence-probe, novelty-ws-parser-transform,
  novelty-ws-media-cross-entity
likely-real visible: 0
likely-real merged duplicates: 9
oracle/noise questions: 0
normalization-noise candidates: 0
current-output triage signatures: 86
current-output bootstrap stalls: 0
current top duplicate family share: 0.2674
current top semantic families: unknown=23, rest_meta_database_error=19,
  timeout=12, collaboration_non_convergence=11, assertion=10
historical likely-real merged duplicates: 174
historical normalization-noise candidates: 415
historical bootstrap stalls: 14433
historical top duplicate family share: 0.5537
quality issues: 1
health: ok
headroom for adding groups: no
load1: 76.04 / 64 cores
memory: 426.3G free / 492.0G total
```

The current output dir has visible triage signatures, but no visible likely-real
product failures and no current bootstrap-stall signatures. It does have nine
merged likely-real duplicates that are not currently visible failures. The
duplicate/noise feedback action's current-root triage scan reported `55` total
records, `39` queued, `0` queued strict startup records, `0` bootstrap status
records, `47` product-visible records, `4` suppressed records, and `2`
suppressed identities.
The new run has WS behavioral coverage, but this is still coverage-guided
health evidence, not final-stack validation. Historical triage remains
dominated by known startup/control-plane noise, especially
`pre_action_bootstrap_stall`, and must not be presented as live product
failure.

The latest trend evidence packet was generated at `2026-05-16T18:30:45Z` from
monitor data through `2026-05-16T18:28:54Z`:

```text
monitor passes: 1642
coverage files: 272 -> 34975
coverage files delta: 34703
unmet coverage goals: 24 -> 4
likely_real_max: 0
duplicate_share_current_last: 0.3088
duplicate_share_historical_last: 0.554
summary_startup_failures_last: 0
quality_issues_last: 0
enabled groups current in trend snapshot: novelty-ws-real-user-editing,
  novelty-ws-real-user-rich-text, novelty-ws-common-blocks,
  novelty-ws-async-server-blocks, novelty-ws-long-session-large-doc,
  novelty-ws-block-gauntlet
fuzz level mix: browser-e2e=31 lanes/31 groups; unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
browser-e2e execution: 63943 cumulative / 176 per-hour
transport-integration execution: 3006 cumulative / 0 per-hour
unit-property execution: 1061208 cumulative / 4816 per-hour
coverage-guided-lower-level execution: 38294 cumulative / 768 per-hour
load1: 72.2 / 64 cores
memory: 426.0G free
```

Largest remaining current unmet goals from the trend packet:

- successful real-user-editing records: `299/500` in the trend packet,
  `302/500` in the later novelty snapshot
- `core/html`: `405/500` in the trend packet, `406/500` in the later novelty snapshot
- `core/details`: `451/500` in the trend packet, `453/500` in the later novelty snapshot
- `core/more`: `499/500` in the trend packet
- title-save-reload: `176/200` in the later novelty snapshot

Weak completion profiles still argue for startup-stall reduction and guarded
top-offs over simply increasing browser concurrency. The weakest success ratios
in the trend packet are `full` (`18/840`), `revision-persistence`
(`103/3596`), `multi-reload-lifecycle` (`80/2721`),
`parser-serialization` (`75/2249`), and `real-user-editing` (`299/5346`).

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260516T183027Z-synthesis.md`. Its consensus:

- Filing remains blocked and the old PR01-PR15C / 28-head allow-list is only
  a known-fix prefix, not a complete filing stack.
- Use the `ready/rtc-*` split from the `20260516T181934Z` finalization report
  as the current prefix, not wildcard `final/rtc-pr*`.
- Add PR02A as an HTTP room-isolation regression sidecar after PR02. If the
  filing process requires one linear stack, fold PR02A into PR02 or restack
  PR03+ on top of PR02A.
- Keep a new narrow post-`PR15C` seed `1020002` WebSocket/Yjs repair PR unless
  the active repair proves exact same-source ownership in an existing head.
- The `160617Z` sync-manager load/hydrate repair report now exists, but did
  not produce a seed-passing repair.
- The later Gutenberg store-to-CRDT candidate passed unit coverage but failed
  the focused browser seed gate, so it is not a filing branch and should not be
  folded into PR13, PR15, PR6B/PR6C, old PR16, reload hydration, pre-save
  collapse, malformed-save, rich-text suffix, or broader HTTP room-isolation
  work.
- The active bounded repair is
  `rtc-ws-seed-1020002-crdt-array-semantic-diff-repair-20260516T180529Z`.
- The expected report is
  `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260516T175703Z/jobs/outputs/rtc-ws-seed-1020002-crdt-array-semantic-diff-repair-20260516T180529Z/report.md`.
- At the latest persona check, the tmux session was still active and that
  report was missing or empty; if it exits without a usable report, rerun
  exactly the same launcher once.
- That repair should instrument `packages/core-data/src/utils/crdt*.ts` and the
  active installed `core-data.js` overlay to compare `yblocks.toJSON()`,
  `options.baseRecord.blocks`, and `changes.blocks`, ignoring `clientId`,
  `originalContent`, `isValid`, and validation-only fields with rich-text and
  attribute normalization.
- If that semantic diff confirms ownership, implement the smallest
  explicit-base insert repair that preserves current CRDT identities and
  inserts only the marker-bearing `core/search` block.
- Require a passing focused `1020002` gate, then shape the repair as the
  post-`PR15C` PR or reclassify only if ownership is proven.
- After seed `1020002` passes, rebuild combined validation from the explicit
  `ready/` prefix plus the `1020002` repair decision, regenerate graph,
  containment, adjacent range-diffs and diffstats, rerun focused tests, lint,
  and `git diff --check`, then run final-stack fuzz.
- Keep broad PR8, PR8A until shaped/validated, PR6B, PR6C, old PR16, reload
  hydration, pre-save collapse, rich-text suffix, malformed-save residuals,
  seed `5500002`, seed `7410083`, possible seed `5200001`, and broader HTTP
  room-isolation work deferred unless new focused evidence promotes them.

The latest split feedback-action file,
`pr-split-20260516T183027Z-feedback-action.md`, is zero bytes. The latest
split feedback action with completed content remains
`pr-split-20260516T181436Z-feedback-action.md`: it updated
`current-pr-split.md`, launched no new jobs, and left the already-active
`1020002` semantic-diff repair job as the required next input. The `183027Z`
synthesis supersedes it by adding PR02A and the `ready/rtc-*` prefix rule.

The latest duplicate/noise synthesis is
`duplicate-noise-20260516T182500Z-synthesis.md`. It classifies the remaining
duplicate/noise problem as a control-plane consumer leak, not a product
failure. The smallest safe next control-plane cleanup is current-run and
run-local:

- gate same-family queued siblings after one current-run representative is
  classified non-actionable;
- default first-tier analysis to one job per family and persist capped/gated
  statuses;
- make live analysis skip or kill sessions for inactive, paused, or fully
  gated run dirs;
- make novelty monitor policy use active dirs from `supervisor-state.json`,
  while historical/output-root data remains reporting-only;
- keep broad historical suppression away from product-evidence families such as
  `unknown`, `timeout`, `assertion`, and `collaboration_non_convergence`.

The latest duplicate/noise feedback action,
`duplicate-noise-20260516T180428Z-feedback-action.md`, implemented the common
subset. It changed `bin/rtc-browser-fuzz-triage-watcher.mjs` so strict
zero-product-evidence startup records, including raw
`preAnalysisGate.bucket === pre-action-bootstrap-stall`, are suppressed before
signature enqueue. It also changed `bin/rtc-browser-fuzz-novelty-monitor.mjs`
so duplicate/noise top-off holds cover dominant `pre_action_bootstrap_stall`
when visible likely-real count is zero. Validation passed with:

```text
node --check bin/rtc-browser-fuzz-novelty-monitor.mjs
node --check bin/rtc-browser-fuzz-triage-watcher.mjs
```

That action killed stale `rtc-coverage-guided-triage`, ran one current-root
live-analysis pass for `run-20260516T175536Z`, started persistent
`rtc-coverage-guided-analysis` with stable live/deep prefixes, and respawned
`rtc-coverage-guided-novelty` on the current-root `run-monitor.sh`. Supervisor
was not restarted because supervisor code was unchanged. Current state from
that feedback action:

```text
current triage scan: files=7, total=55, queued=39, queuedStrict=0,
  bootstrapStatus=0, productVisible=47, suppressedRecords=4, suppressedIds=2
novelty post-respawn: duplicateShareCurrent=0.2979, summaryStartupFailures=0
rtc-coverage-guided-triage: absent
active coverage sessions: rtc-coverage-guided-novelty,
  rtc-coverage-guided-supervisor, rtc-coverage-guided-analysis
```

The feedback action notes one remaining operational risk: coverage
start/cleanup shell scripts were outside the allowed edit list for that action,
so the current-root live-analysis ownership was arranged through tmux for the
active root rather than made permanent for future coverage roots. Product
evidence signatures remain visible and eligible for analysis.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older warnings
about stale PR13 GitHub-facing review refs and the then-current constrained
group mix are superseded by the `2026-05-16T18:37:43Z` branch-link audit and
the `2026-05-16T18:36:14Z` novelty snapshot. The audit verifies the repaired
PR 13 review refs listed above, while the novelty snapshot still does not count
as final-stack validation.

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
| Seed `1020002` WebSocket marker divergence | completed `143821Z` repair report; completed `151306Z` state-vector/diff diagnostic; completed `153219Z` peer-client store-transition report; completed `160617Z` sync-manager load/hydrate report; latest Gutenberg store-to-CRDT candidate; active `rtc-ws-seed-1020002-crdt-array-semantic-diff-repair-20260516T180529Z` job | active final-stack blocker; classified as product divergence; `160617Z` report exists but failed the focused gate; the later Gutenberg store-to-CRDT candidate passed unit coverage but failed the focused browser seed gate; page 0 still misses marker `async-server-1020002-0-1-589451` while page 1/relay retain it; active repair report was still missing/empty at the latest persona check | Wait for the active CRDT/base/incoming block-array semantic-diff repair report, rerun its launcher exactly once only if it exits without a usable report, require focused seed `1020002` to pass or be explicitly reclassified, then shape a new post-`PR15C` PR with a verified branch link before filing |
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
2. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR 13
   refs, dropped PR 6B, PR 6C, PR16 seed-replay candidates, dirty evidence
   branches, and the untracked reload-hydration gate spec out of filing
   branches and push allow-lists.
3. Push/import and audit PR02A plus individual PR 5A/5B/5C, PR 8A, and
   PR 11A-E review branches, or keep the table rows marked
   `No verified branch link yet`.
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
9. Wait for
   `rtc-ws-seed-1020002-crdt-array-semantic-diff-repair-20260516T180529Z`;
   rerun its launcher exactly once only if it exits without a usable report.
   Require the focused seed gate to pass or be explicitly reclassified, then
   shape the new post-`PR15C` repair PR and add a verified branch link before
   filing.
10. Rebuild the combined stack from the explicit `ready/rtc-*` known-fix
   prefix, PR02A, and the new seed `1020002` repair PR, then rerun bounded
   final-stack validation against the rebuilt stack. Count it only if it
   reaches action-level product coverage.
11. Block filing if new visible likely-real failures appear.

Existing fuzz infrastructure can continue where healthy. The latest trend
evidence has `likely_real_max: 0`, `4` unmet goals, current-run duplicate share
`0.3088`, historical duplicate share `0.554`, summary startup failures `0`,
quality issues `0`, and browser-e2e execution at `63943` cumulative / `176`
per hour. The latest novelty snapshot has `35040` coverage files, `52550`
total records seen, `145` current-run WS records, `86` current-output triage
signatures, `0` visible likely-real failures, six enabled WS novelty groups,
`novelty-http-persistence-probe` paused by the max-enabled-group resource
budget, `novelty-ws-parser-transform` paused after `2/19` current-run
pre-action WS discovery/startup failures, and `novelty-ws-media-cross-entity`
paused after `2/15` current-run pre-action WS discovery/startup failures. Treat
these remote status, novelty, and trend packets as useful control-plane and
fuzz-health evidence, not final-stack fuzz validation.
