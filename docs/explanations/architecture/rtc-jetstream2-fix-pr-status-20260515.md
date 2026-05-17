# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T21:58:42Z`

Trigger event:
`duplicate-noise-2026-05-17T21-51-34Z-150`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-17T21-51-34Z-150/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest completed split-persona synthesis,
`pr-split-20260517T213858Z-synthesis.md`, replaces the prior Cycle293 and
Cycle304 iteration-18 shapes with a corrected Cycle304-style lane split.
Cycle293 remains supporting evidence only because it serializes `PR09+` behind
the unresolved `PR07B1` runtime/reload lane. Cycle304 iteration-18 is rejected
as an active filing source because `PR06E` is still downstream of `PR07B1`.
Use `fresh-prset/iteration-23/*` only after a fresh manifest/audit proves the
corrected branch shape.

Final filing, GitHub PR opening, broad final-stack fuzzing, and rebuilt
stack-wide validation remain blocked. The common blockers are still unresolved
PR07 reload/post-save/rejoin ownership, root-space/browser replay preflight,
and final validation. Seed `1020002` blocks final-stack validation and filing;
it must not block independent branch audit, split replacement, deferred
promotion, owner comparisons, or loop repair.

Current replacement review target:

```text
Common mainline:
PR01 -> PR02 (+ PR02A sidecar)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> grouped PR06A-D save-request-payload guards
(+ PR06E sidecar from PR06D, not from PR07B1)

Runtime-gated lane:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1
(hold PR07C)

Independent CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> grouped PR11 -> grouped PR12
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> grouped PR15
```

The current branch-link audit does not yet verify the corrected grouped or
rebased Cycle304 PR rows as GitHub review PR-content links. Proposed rows that
only exist in that replacement split therefore say `No verified branch link
yet` even when older aggregate or prior-art `review/*` refs exist. Those older
refs remain useful for content comparison, but they are not maintainer-facing
links for the replacement split unless the row itself is still the active unit.

Keep out or held: Cycle293, Cycle304 iteration-18 for `PR06E`, raw `PR07D`,
`PR17`, `PR18`, `PR18x`, monolithic `PR07B`, fallback/PR15-tail `PR05D`, old
`origin/trunk`, `ready/*`, stale `ready-pr03b/*`, dirty evidence branches,
validation-stack heads, and stale or misordered PR13 refs. `PR07D` requires
fresh red-at-active-PR07C first-divergence proof. Rich-text/parser/linebreak
reductions must compare `PR05B`, `PR05C`, and clean `PR05D` before any later
owner is named.

## Branch And Ref Status

Remote status was collected at `2026-05-17T21:58:37Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6A-D, PR 7, PR 8, PR 15, fallback-group
evidence, and final branch claims unless it is deliberately copied into a
clean evidence worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T21:58:42Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

Use only these repaired audited PR13 review refs for current PR13 content:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link these stale or misordered PR13 refs as current PR content:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`. When the
Cycle304 replacement row has no audited `review/*` ref yet, do not substitute
an older aggregate branch as if it were the current PR content.

### Mainline Replacement Target

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content; keep the explicit-base two-file range |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content; keep in the known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; needs fetched `verified-content` audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held separately |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | Cycle304 split row; old aggregate PR 5 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine evidence exists; GitHub verified-content link is still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | strict seed `5700084` remains covered by PR05C in current evidence |
| PR 5D | Semicolonless entity/reference block validation after PR 5C | No verified branch link yet | TBD | TBD | only the clean PR05C-adjacent branch is valid; fallback/PR15-tail PR05D is rejected |
| PR 6A-D | Grouped save-request-payload guards and PR09 base | No verified branch link yet | TBD | TBD | corrected Cycle304-style grouped row; requires iteration-23 audit proving `PR06D -> PR09` before filing |
| PR 9 | Core-data lock fairness, rebased onto PR06D | No verified branch link yet | TBD | TBD | Cycle304 row; old verified PR09 branch is prior art until the PR06D-based row has a verified review link |
| PR 10 | CRDT block reconciliation foundation | No verified branch link yet | TBD | TBD | Cycle304 row; audit after refreshed PR09 placement |
| PR 11 | Grouped explicit-base top-level block operations | No verified branch link yet | TBD | TBD | corrected grouped row; old aggregate PR11 review ref is prior art until iteration-23 content is audited |
| PR 12 | Grouped previous-local-cache top-level block operations | No verified branch link yet | TBD | TBD | corrected grouped row; old aggregate PR12 review ref is prior art until iteration-23 content is audited |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; current PR13 first delta |
| PR 13B0 | PR13 source-retirement finer split row 0 | No verified branch link yet | TBD | TBD | preferred source split target; publish/fetch/audit before replacing repaired fallback links |
| PR 13B1 | PR13 source-retirement finer split row 1 | No verified branch link yet | TBD | TBD | preferred source split target; publish/fetch/audit before replacing repaired fallback links |
| PR 13B2 | PR13 source-retirement finer split row 2 | No verified branch link yet | TBD | TBD | preferred source split target; publish/fetch/audit before replacing repaired fallback links |
| PR 13B3 | PR13 source-retirement finer split row 3 | No verified branch link yet | TBD | TBD | preferred source split target; publish/fetch/audit before replacing repaired fallback links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` proves PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR 14 | No verified branch link yet | TBD | TBD | mandatory replacement topology; publish/fetch/audit before filing |
| PR 15 | Grouped fallback-group move/insert/delete, restacked on PR14B | No verified branch link yet | TBD | TBD | corrected grouped row; old pre-PR14B audited branches are prior art only |

### Runtime-Gated Side Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | First save-response/runtime guard split row | No verified branch link yet | TBD | TBD | Cycle304 row; old aggregate PR07A is prior art only |
| PR 7A2 | Second save-response/runtime guard split row | No verified branch link yet | TBD | TBD | runtime-gated; audit after root/browser preflight |
| PR 7A3 | Third save-response/runtime guard split row | No verified branch link yet | TBD | TBD | runtime-gated; audit after root/browser preflight |
| PR 7B0 | Saved CRDT response hydration split from old opaque PR 7B | No verified branch link yet | TBD | TBD | local split evidence exists, but no branch-link-audit verified GitHub PR-content link exists yet |
| PR 7B1 | Stale base-record/title filtering split from old opaque PR 7B | No verified branch link yet | TBD | TBD | local split evidence exists, but no branch-link-audit verified GitHub PR-content link exists yet |
| PR 7C | Reload record snapshots sidecar after PR 7B1 | No verified branch link yet | TBD | TBD | held; only run after root/browser readiness and owner matrix evidence |

### Held Sidecars And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR 3 | No verified branch link yet | held until PR03-vs-PR03B replay proves revision-restore ownership |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified content for the older aggregate shape; compare only until the grouped iteration-23 row has a verified link |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified content for the older narrow persisted-body guard; remap only after the grouped PR06A-D review-link audit |
| PR 6E sidecar | Malformed outgoing RTC save request-payload guard | No verified branch link yet | must be a sidecar from PR06D, not PR07B1; iteration-18 is rejected for this row |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified content for old aggregate PR07A; active target is PR07A1/A2/A3 |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified content for old opaque PR07B; active target is PR07B0/B1 |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified content for old broad PR 8, not an active filing unit |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified content for old aggregate PR 5, not the recommended PR05A/B/C/D split |
| PR 9 prior art | Core-data lock fairness on old base | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | verified content, but active PR09 must be audited on PR06D |
| PR 10 prior art | CRDT block reconciliation foundation on old base | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | verified content, but active PR10 follows the refreshed PR09 placement |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified prior art for the grouped PR11 scope; do not use as the iteration-23 PR-content link |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified prior art for the grouped PR12 scope; do not use as the iteration-23 PR-content link |
| PR13 fallback B | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired audited fallback link; use only until PR13B0/B1/B2/B3 are published and audited |
| PR13 fallback C | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired audited fallback link; use only until PR13B0/B1/B2/B3 are published and audited |
| PR15 prior art | Pre-PR14B fallback group rows | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder), [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor), [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified content for the pre-PR14B PR15 shape, not the recommended grouped PR15-on-PR14B replacement |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T21:58:37Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T205339Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` collected for this run is nonempty and gives the
freshest bounded control-plane view:

```text
novelty updated: 2026-05-17T21:56:06.041Z
coverage files: 47873
records seen: 74083
current-run records: 18
current-run records by group:
  novelty-ws-parser-serialization=16
  novelty-ws-three-user-late-join=2
current-run successful records: 8
current-run pre-action startup failures: 3
unmet goals: 5
current active signatures: 0
current active product-evidence signatures: 0
current active likely-real visible: 0
current drain actionable signatures: 2
current drain product-evidence signatures: 2
current drain likely-real visible: 1
current active raw top semantic families:
  reload_rejoin_awareness_stall, pre_action_bootstrap_stall,
  fuzz_helper_rest_endpoint_construction
current drain top semantic families: timeout, reload_rejoin_awareness_stall
historical top duplicate family share: 0.3462
health: ok
enabled groups:
  novelty-ws-three-user-late-join: ws, lanes=1
  novelty-ws-parser-serialization: ws, lanes=1
paused groups:
  novelty-ws-real-user-save-reload
  novelty-ws-real-user-rich-text
  novelty-ws-parser-transform
  novelty-ws-block-gauntlet
  novelty-ws-common-blocks
  novelty-http-persistence-probe
  novelty-ws-real-user-editing
```

This is current fuzz/control-plane health, not final-stack validation and not a
no-bugs claim. Active current-run triage has zero actionable signatures and
zero visible likely-real findings; raw current-run product evidence remains
visible but family-capped. The drain view intentionally preserves
product-evidence `reload_rejoin_awareness_stall` and `timeout`
representatives. Real-user save/reload, real-user editing, rich-text, and other
duplicate/noise-heavy producers remain paused; the latest pass records
`hold-materialization-floor-no-safe-group` instead of re-enabling a paused or
noise-held group to satisfy the browser materialization floor.

The latest trend packet was generated at `2026-05-17T21:45:46Z` from monitor
data through `2026-05-17T21:42:42Z`:

```text
monitor passes: 2121
coverage files: 272 -> 47849
coverage files delta: 47577
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3462
summary startup failures last: 0
quality issues last: 1
memory free: 428.6 GB
load averages: 41.36 / 40.63 / 45.04 on 64 cores
trend enabled groups current:
  novelty-ws-real-user-editing,
  novelty-ws-parser-serialization,
  novelty-http-persistence-probe
latest fuzz level mix:
  browser-e2e=31 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5366337
browser-e2e likely-real findings: 613 over 1947.3 runner-hours
largest unmet goals:
  reload-post-action 1066/2000,
  title-save-reload 522/1000,
  body-save-reload 581/1000,
  real-user-editing success 592/1000,
  ui-format-paragraph 1661/2000
```

The novelty state at `21:56:06Z` supersedes the trend packet for current
enabled/paused groups. The trend packet remains graph-derived evidence for
coverage, load, and fuzzing effectiveness. Browser E2E remains the only level
with confirmed likely-real findings in the trend packet, but lower-level lanes
are under-triaged and should not be declared useless from zero likely-real
output.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T213858Z-synthesis.md`. It confirms:

- The current status is blocked, and the split should change.
- Move off Cycle293 and Cycle304 iteration-18 as primary filing shapes. Cycle293
  serializes `PR09+` behind PR07/root/browser blockers; iteration-18 still has
  `PR06E` downstream of `PR07B1`.
- Use the corrected Cycle304-style lane split: common work through grouped
  `PR06A-D`, `PR06E` as a sidecar from `PR06D`, a runtime-gated
  `PR07A1..PR07B1` lane, and an independent `PR09..PR15` CRDT/data-loss lane
  based on `PR06D`.
- Treat `fresh-prset/iteration-23/*` as the preferred source set only after a
  fresh audit/manifest newer than the current deferred queue timestamp at job
  start.
- The next audit must prove `PR06D -> PR06E`, `PR07B1 !-> PR06E`,
  `PR06D -> PR09`, and `PR07B1 !-> PR09/PR15C`.
- Keep clean `PR05D` as `27c6e7924217`; reject
  `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, and any
  PR15/fallback-tail manifest row as `PR05D`.
- Do not file GitHub PRs or launch broad final-stack fuzz from the current
  state.
- Do not wait only on seed `1020002`; it blocks final-stack
  validation/filing, not branch audit, split replacement, deferred promotion,
  or loop repair.
- After root recovery, run the bounded PR07 owner matrix against PR07B0,
  PR07B1, and held PR07C for seeds `5200011`, `5200017`, `5200010`,
  `7110004`, `7110017`, and `5200008`.
- Loop repair completed in the paired `pr-split-20260517T213858Z` feedback
  action: `rtc-pr-split-review-loop.sh` replaced the invalid `rg -Eiq`
  predicate with `rg -iq -e` and passed `bash -n`. Keep enforcing that
  zero-byte reports, active sessions, stderr growth, `report.tmp`, stale
  manifests, disk-preflight-only reports, and runtime-readiness-only reports do
  not count as progress while actionable rows remain.
- The strict-expansion PR05 owner comparison completed at
  `2026-05-17T21:29:52Z` with `0` check failures; it keeps parser/rich-text,
  linebreak, suffix, and semicolonless residuals on the
  `PR05B -> PR05C -> clean PR05D` path and assigns no `PR18x` owner.

The latest duplicate/noise synthesis is
`duplicate-noise-20260517T212928Z-synthesis.md`; its paired feedback action
completed the narrow producer/control-plane fix:

- Added a one-hit threshold only for zero-product strict
  `pre_action_bootstrap_stall`.
- Made supervisor startup-stall pausing use that same zero-product rule.
- Changed materialization-floor refill so it uses normal enable gates and
  rejects paused, disabled, noise-held, and max-budget-blocked groups.
- Bumped novelty run-local noise policy version to `20`.
- Passed `node --check` for `rtc-browser-fuzz-novelty-monitor.mjs`,
  `rtc-browser-fuzz-supervisor.mjs`, `rtc-browser-fuzz-triage-watcher.mjs`,
  `rtc-browser-fuzz-analysis-tier.mjs`,
  `rtc-browser-fuzz-deep-analysis-tier.mjs`, and
  `rtc-browser-fuzz-live-analysis-monitor.mjs`.
- Refreshed gate-only triage for `17` run dirs, ran live analysis once, and
  verified zero queued/retry/running startup-family triage, analysis-tier, or
  deep-analysis-tier jobs.
- Restarted the active novelty monitor, supervisor, and live-analysis child.

Current duplicate/noise status after the latest action: active current-run
triage has zero actionable signatures and zero visible likely-real findings;
the drain view intentionally keeps `timeout` and
`reload_rejoin_awareness_stall` product evidence visible. Save/reload,
real-user editing, and rich-text remain paused or family-capped rather than
hidden. Strict no-product startup stalls are no longer being queued for
triage/analysis or kept alive as productive work. The remaining risk is
duplicate-heavy product-evidence `reload_rejoin_awareness_stall`, which should
stay visible or family-capped rather than suppressed.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, the corrected Cycle304-style split recommendation, the PR07
runtime-gated lane, grouped PR06/PR11/PR12/PR15 rows, and the later
duplicate/noise evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Corrected Cycle304 split audit | corrected Cycle304-style lane split; preferred `fresh-prset/iteration-23/*` after fresh audit | not completed in the collected inputs; prior iteration-18 evidence is rejected for active filing because `PR06E` is downstream of `PR07B1`, and finer/current grouped GitHub `verified-content` links are missing | Launch exactly one bounded `rtc-cycle306-fresh-iteration23-audit-pr07-owner-matrix` job; publish/fetch/audit explicit review refs before treating grouped rows as maintainer-facing links |
| PR09+ mainline placement | PR09 through grouped PR15 | must prove `PR06D` is an ancestor of `PR09`, and `PR07B1` is not an ancestor of `PR09` or `PR15C`; Cycle293 remains supporting evidence only | Preserve that base shape in the iteration-23 manifest and review-link audit |
| PR07 runtime / root-space gate | PR07A1/A2/A3, PR07B0, PR07B1, held PR07C; seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`, and `5200008` | unresolved; `/` is below the `2048 MB` browser replay floor and the latest completed artifact recorded `11 MB` free | Recover `/` above threshold with before/after free-space evidence and cleanup ledger, repair runtime readiness, then run the PR07 owner matrix with snapshots |
| PR07D | reload/post-save/rejoin residuals | absent; not justified by current evidence | Add only after fresh replay proves red-at-active-PR07C non-coverage with first-divergence snapshots |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; Cycle304 audit rejects fallback/PR15-tail `PR05D`; no fetched `verified-content` product branch link exists yet | Publish/fetch/audit PR05D; keep `fix/rtc-fallback-group-delete-stale-local` and `d06e3528cbd` rejected |
| PR06E malformed-save sidecar | current PR06B-style sidecar | still useful, but must attach to `PR06D`, not `PR07B1`; iteration-18 is rejected for this row | Publish/fetch/audit as `PR06E` or explicit `PR06-sidecar` after the grouped PR06A-D row is fresh |
| PR14B / grouped PR15-on-PR14B finalization | PR14B and grouped PR15-on-PR14B | mandatory replacement topology, but no current `verified-content` branch links exist | Publish/fetch/audit explicit no-PR03B product refs; keep old pre-PR14B PR15 audit links as prior art only |
| PR03B browser `restoreRevision` CRDT invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B for revision-restore-shaped residuals after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | strict seed `5700084`; parser/rich-text/linebreak/suffix residuals | completed at `2026-05-17T21:29:52Z` with `0` check failures; residuals stay on PR05B/PR05C/clean-PR05D and no `PR18x` owner is assigned | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| PR11 / PR12 grouped rows | grouped PR11 and grouped PR12 targets; old aggregate PR11/PR12 audit links | corrected split now groups these rows, but no iteration-23 `verified-content` links exist | Publish/fetch/audit grouped PR11 and grouped PR12 before replacing aggregate prior-art rows |
| PR13 finer split | PR13A/B0/B1/B2/B3 target; repaired PR13A/B/C fallback links | preferred source split is finer than the repaired audited fallback links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after rebuilt validation produces fresh product evidence newer than terminal/downscope classifications |
| Pre-save search/live document collapse | seed `961308` / `ddf9559af37e`; run `0932bed35c7a` only if red or ambiguous | evidence-only; not in active split | Run one bounded owner comparison against PR06A-D, PR06E, PR07B0, PR07B1, and PR07C after PR07 stops consuming E2E capacity |
| Duplicate/noise control-plane recycling | duplicate synthesis/action `20260517T212928Z`; novelty status `2026-05-17T21:56:06.041Z` | one-hit zero-product strict startup draining and materialization-floor gating are patched; active current-run triage has no actionable signatures and no visible likely-real findings; drain product evidence remains visible; save/reload, real-user editing, and rich-text stay paused or family-capped | Monitor that startup-family signatures stay out of queued/running triage and analysis, keep product-evidence families visible or capped, and tune lane/family policy only with fresh product evidence |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr`, `ready/*`, `ready-pr03b/*`, Cycle293, validation-stack, or
dirty evidence branches as-is.

Before filing any maintainer-facing PR:

1. Use only explicit product refs. Do not wildcard import or file
   validation-stack branches, deferred branches, dirty evidence branches, old
   downstream `ready/*` refs, stale `ready-pr03b/*` main-spine refs, or
   validation-only heads.
2. Use the corrected Cycle304-style split as the active replacement shape.
   Treat Cycle293, Cycle304 iteration-18 for `PR06E`, and older local push
   manifests as historical progress only.
3. Prove the corrected ancestry checks true in the iteration-23 manifest:
   `PR06D -> PR06E`, `PR07B1 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09/PR15C`, clean `PR05D` only, and no fallback-tail
   `PR05D`.
4. Publish/fetch and audit explicit product refs for PR02A, PR05A/B/C, clean
   PR05D, grouped PR06A-D, PR06E, PR07A1/A2/A3, PR07B0, PR07B1, held PR07C,
   grouped PR11, grouped PR12, PR13B0/B1/B2/B3, PR14B, and grouped
   PR15-on-PR14B before treating those rows as maintainer-facing links.
5. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for PR13 fallback content.
6. Keep old aggregate PR 5, aggregate PR 6, broad PR 8, aggregate PR 11,
   aggregate PR 12, stale/misordered PR13 refs, old pre-PR14B PR15 refs, dirty
   evidence branches, and the untracked reload-hydration gate spec out of
   filing branches and push allow-lists.
7. Recover root space above the `2048 MB` replay floor with a cleanup ledger,
   prove runtime readiness, and rerun the PR07A/PR07B/PR07C owner matrix before
   any PR07D decision.
8. Do not publish raw reload-hydration deferred refs as PR07D. Current evidence
   treats raw reload branches as rejected/held unless fresh replay proves
   PR07A/B/C non-coverage.
9. Run PR03 vs PR03B for revision-restore-shaped residuals, and PR05B vs
   PR05C vs clean PR05D for parser/rich-text/linebreak residuals before naming
   any later owner.
10. Patch/enforce the loop gate so active sessions, active/terminal `1020002`,
    zero-byte artifacts, `report.tmp`, stale manifests, disk/runtime-preflight
    reports, and stderr growth are not counted as durable progress while
    actionable rows exist.
11. Keep the duplicate/noise scheduler fix enforced: one-hit zero-product
    strict startup drain, materialization-floor enabling that respects
    pause/hold/max-group gates, and product-evidence families visible or
    family-capped rather than hidden.
12. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.
13. Treat the raw novelty input, trend packet, and duplicate/noise reports as
    fuzz/control-plane health and triage evidence. They are not final-stack
    validation, a validated final-stack pass or failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. The next
useful work is one bounded `rtc-cycle306-fresh-iteration23-audit-pr07-owner-matrix`
job, publishing/fetching/auditing explicit corrected Cycle304 review refs,
root-space cleanup, loop-gate enforcement, post-patch duplicate/noise
monitoring, and after root recovery the bounded PR07 owner matrix. Do not
launch broad final-stack
fuzz, a duplicate seed `1020002` job, raw `PR07D`, or `PR18x`.
