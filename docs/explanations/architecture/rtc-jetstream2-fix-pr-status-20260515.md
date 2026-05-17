# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T21:25:42Z`

Trigger event:
`duplicate-noise-2026-05-17T21-18-04Z-148`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-17T21-18-04Z-148/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest completed split-persona synthesis,
`pr-split-20260517T210532Z-synthesis.md`, changes the active filing topology
again. Treat `fresh-prset/iteration-20/*` as the candidate source set and
treat `finalized/cycle293/*` as supporting evidence only. Cycle293 is no
longer the primary shape because it serializes `PR09+` behind `PR07B1`; the
fresh iteration-20 topology keeps `PR09` based on `PR06D` and not downstream
of `PR07B1`.

Final filing, GitHub PR opening, broad final-stack fuzzing, and rebuilt
stack-wide validation remain blocked. The common blockers are still unresolved
PR07 reload/post-save/rejoin ownership, root-space/browser replay preflight,
and final validation. Seed `1020002` blocks final-stack validation and filing;
it must not block independent branch audit, split replacement, deferred
promotion, owner comparisons, or loop repair.

Current replacement review target:

```text
Mainline:
PR01 -> PR02 (+ PR02A)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D

Runtime-gated lane:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1
+ PR06E sidecar
+ hold PR07C

Independent CRDT/data-loss lane:
PR09 -> PR10 -> PR11A-E -> PR12A-C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C
```

The current branch-link audit does not yet verify the fresh iteration-20 PR
rows. Proposed rows that only exist in fresh iteration-20 therefore say
`No verified branch link yet` even when older aggregate or prior-art
`review/*` refs exist. Those older refs remain useful for content comparison,
but they are not maintainer-facing links for the replacement split unless the
row itself is still the active unit.

Keep out or held: raw `PR07D`, `PR17`, `PR18`, `PR18x`, monolithic `PR07B`,
fallback/PR15-tail `PR05D`, old `origin/trunk`, `ready/*`, stale
`ready-pr03b/*`, dirty evidence branches, validation-stack heads, and stale or
misordered PR13 refs. `PR07D` requires fresh red-at-active-PR07C
first-divergence proof. Rich-text/parser/linebreak reductions must compare
`PR05B`, `PR05C`, and clean `PR05D` before any later owner is named.

## Branch And Ref Status

Remote status was collected at `2026-05-17T21:25:37Z`.

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

The branch-link audit was generated at `2026-05-17T21:25:42Z` from fetched
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
fresh iteration-20 replacement row has no audited `review/*` ref yet, do not
substitute an older aggregate branch as if it were the current PR content.

### Mainline Replacement Target

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content; keep the explicit-base two-file range |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content; keep in the known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; needs fetched `verified-content` audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held separately |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | fresh iteration-20 split row; old aggregate PR 5 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine evidence exists; GitHub verified-content link is still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | strict seed `5700084` remains covered by PR05C in current evidence |
| PR 5D | Semicolonless entity/reference block validation after PR 5C | No verified branch link yet | TBD | TBD | only the clean PR05C-adjacent branch is valid; fallback/PR15-tail PR05D is rejected |
| PR 6A | First save-payload guard split row | No verified branch link yet | TBD | TBD | fresh iteration-20 row; do not substitute old aggregate PR 6 |
| PR 6B | Second save-payload guard split row | No verified branch link yet | TBD | TBD | fresh iteration-20 row; needs audit and diffstat |
| PR 6C | Third save-payload guard split row | No verified branch link yet | TBD | TBD | fresh iteration-20 row; needs audit and diffstat |
| PR 6D | Fourth save-payload guard split row and PR09 base | No verified branch link yet | TBD | TBD | PR09 must be based here; audit must prove PR07B1 is not an ancestor of PR09 |
| PR 9 | Core-data lock fairness, rebased onto PR06D | No verified branch link yet | TBD | TBD | fresh iteration-20 row; old verified PR09 branch is prior art until the PR06D base is audited |
| PR 10 | CRDT block reconciliation foundation | No verified branch link yet | TBD | TBD | fresh iteration-20 row; audit after refreshed PR09 placement |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | TBD | TBD | finer split target; GitHub verified-content link is still missing |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | TBD | TBD | finer split target; GitHub verified-content link is still missing |
| PR 11C | Explicit-base middle insert | No verified branch link yet | TBD | TBD | source-local evidence marks seed `5200005` covered here; verified-content link is still missing |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | TBD | TBD | finer split target; GitHub verified-content link is still missing |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | TBD | TBD | finer split target; GitHub verified-content link is still missing |
| PR 12A | Previous-local-cache top-level block operations split row 1 | No verified branch link yet | TBD | TBD | fresh iteration-20 finer split; old aggregate PR12 is prior art only |
| PR 12B | Previous-local-cache top-level block operations split row 2 | No verified branch link yet | TBD | TBD | fresh iteration-20 finer split; needs fetched audit |
| PR 12C | Previous-local-cache top-level block operations split row 3 | No verified branch link yet | TBD | TBD | fresh iteration-20 finer split; needs fetched audit |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; current PR13 first delta |
| PR 13B0 | PR13 source-retirement finer split row 0 | No verified branch link yet | TBD | TBD | preferred source split target; publish/fetch/audit before replacing repaired fallback links |
| PR 13B1 | PR13 source-retirement finer split row 1 | No verified branch link yet | TBD | TBD | preferred source split target; publish/fetch/audit before replacing repaired fallback links |
| PR 13B2 | PR13 source-retirement finer split row 2 | No verified branch link yet | TBD | TBD | preferred source split target; publish/fetch/audit before replacing repaired fallback links |
| PR 13B3 | PR13 source-retirement finer split row 3 | No verified branch link yet | TBD | TBD | preferred source split target; publish/fetch/audit before replacing repaired fallback links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` proves PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR 14 | No verified branch link yet | TBD | TBD | mandatory replacement topology; publish/fetch/audit before filing |
| PR 15A | Fallback group move stale reorder, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; old pre-PR14B audited branch is prior art only |
| PR 15B | Fallback group insert anchor, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; publish/fetch/audit before filing |
| PR 15C | Fallback group delete, restacked on PR14B | No verified branch link yet | TBD | TBD | use PR14B topology; do not file until audited |

### Runtime-Gated Side Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | First save-response/runtime guard split row | No verified branch link yet | TBD | TBD | fresh iteration-20 row; old aggregate PR07A is prior art only |
| PR 7A2 | Second save-response/runtime guard split row | No verified branch link yet | TBD | TBD | runtime-gated; audit after root/browser preflight |
| PR 7A3 | Third save-response/runtime guard split row | No verified branch link yet | TBD | TBD | runtime-gated; audit after root/browser preflight |
| PR 7B0 | Saved CRDT response hydration split from old opaque PR 7B | No verified branch link yet | TBD | TBD | local split evidence exists, but no branch-link-audit verified GitHub PR-content link exists yet |
| PR 7B1 | Stale base-record/title filtering split from old opaque PR 7B | No verified branch link yet | TBD | TBD | local split evidence exists, but no branch-link-audit verified GitHub PR-content link exists yet |
| PR 7C | Reload record snapshots sidecar after PR 7B1 | No verified branch link yet | TBD | TBD | held; only run after root/browser readiness and owner matrix evidence |

### Held Sidecars And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR 3 | No verified branch link yet | held until PR03-vs-PR03B replay proves revision-restore ownership |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified content for the older aggregate shape; do not use as the fresh PR06A-D filing unit |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified content for the older narrow persisted-body guard; remap only after iteration-20 audit |
| PR 6E sidecar | Malformed outgoing RTC save request-payload guard | No verified branch link yet | preserve as renamed sidecar after PR06A-D; avoid colliding with the fresh PR06 split |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified content for old aggregate PR07A; active target is PR07A1/A2/A3 |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified content for old opaque PR07B; active target is PR07B0/B1 |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified content for old broad PR 8, not an active filing unit |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified content for old aggregate PR 5, not the recommended PR05A/B/C/D split |
| PR 9 prior art | Core-data lock fairness on old base | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | verified content, but active PR09 must be audited on PR06D |
| PR 10 prior art | CRDT block reconciliation foundation on old base | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | verified content, but active PR10 follows the refreshed PR09 placement |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified content for old aggregate PR11; active target is PR11A-E |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified content for old aggregate PR12; active target is PR12A-C |
| PR13 fallback B | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired audited fallback link; use only until PR13B0/B1/B2/B3 are published and audited |
| PR13 fallback C | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired audited fallback link; use only until PR13B0/B1/B2/B3 are published and audited |
| PR15 prior art | Pre-PR14B fallback group rows | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder), [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor), [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified content for the pre-PR14B PR15 shape, not the recommended PR15A/B/C-on-PR14B replacement |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T21:25:37Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T205339Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` collected for this run is nonempty and gives the
freshest bounded control-plane view:

```text
novelty updated: 2026-05-17T21:25:04.985Z
coverage files: 47782
records seen: 73960
current-run records: 9
current-run records by group:
  novelty-ws-parser-serialization=6
  novelty-ws-parser-transform=1
  novelty-ws-real-user-editing=2
current-run successful records: 3
current-run pre-action startup failures: 1
unmet goals: 5
current active signatures: 0
current active product-evidence signatures: 0
current active likely-real visible: 0
current drain actionable signatures: 1
current drain product-evidence signatures: 1
current drain likely-real visible: 1
current drain top semantic family: reload_rejoin_awareness_stall
historical top duplicate family share: 0.3461
health: ok
enabled groups:
  novelty-ws-block-gauntlet: ws, lanes=1
  novelty-ws-parser-serialization: ws, lanes=1
  novelty-ws-real-user-editing: ws, lanes=2
paused groups:
  novelty-http-persistence-probe
  novelty-ws-parser-transform
  novelty-ws-real-user-save-reload
  novelty-ws-real-user-rich-text
```

This is current fuzz/control-plane health, not final-stack validation and not a
no-bugs claim. Active current-run triage is clean at the snapshot. The drain
view intentionally preserves one product-evidence `reload_rejoin_awareness_stall`
representative while holding noisy real-user save/reload and rich-text
producers in duplicate/noise pauses. The latest pass also paused
`novelty-ws-parser-transform` for current-run no-product startup noise after a
materialization-floor re-enable; that is control-plane churn to watch, not new
PR-content evidence.

The latest trend packet was generated at `2026-05-17T21:17:34Z` from monitor
data through `2026-05-17T21:14:17Z`:

```text
monitor passes: 2113
coverage files: 272 -> 47749
coverage files delta: 47477
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3461
summary startup failures last: 0
quality issues last: 0
memory free: 411.9 GB
load averages: 95.52 / 77.13 / 66.75 on 64 cores
trend enabled groups current:
  novelty-ws-real-user-editing,
  novelty-ws-parser-transform,
  novelty-ws-parser-serialization
latest fuzz level mix:
  browser-e2e=31 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5360643
browser-e2e likely-real findings: 612 over 1943.4 runner-hours
largest unmet goals:
  reload-post-action 1054/2000,
  title-save-reload 510/1000,
  body-save-reload 569/1000,
  real-user-editing success 585/1000,
  ui-format-paragraph 1644/2000
```

The novelty state at `21:25:04Z` supersedes the trend packet for current
enabled/paused groups. The trend packet remains graph-derived evidence for
coverage, load, and fuzzing effectiveness. Browser E2E remains the only level
with confirmed likely-real findings in the trend packet, but lower-level lanes
are under-triaged and should not be declared useless from zero likely-real
output.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T210532Z-synthesis.md`. It confirms:

- The current status is blocked, and the split should change.
- Move off Cycle293 as the primary split because it serializes `PR09+` behind
  PR07/root/browser blockers.
- Use fresh `fresh-prset/iteration-20/*` as the candidate source set.
- Require a fresh iteration-20 manifest/audit job newer than the current
  deferred queue, with branch graph, containment, adjacent diffstats,
  patch-id or range-diff evidence, `base-allowlist.tsv`,
  `push-manifest.tsv`, `head-bundle-manifest-check.tsv`, and artifact
  verification.
- Hard-check that PR09 is based on PR06D, PR07B1 is not an ancestor of PR09,
  clean PR05D is the only PR05D, `fix/rtc-fallback-group-delete-stale-local`
  and `d06e3528cbd` are absent, and wrong-base/fallback manifests are absent.
- Do not file GitHub PRs or launch broad final-stack fuzz from the current
  state.
- Do not wait only on seed `1020002`; it blocks final-stack
  validation/filing, not branch audit, split replacement, deferred promotion,
  or loop repair.
- Recover `/` above the `2048 MB` browser replay floor with a cleanup ledger
  before Docker/wp-env/browser replay.
- After root recovery, run the bounded PR07 owner matrix against PR07B0,
  PR07B1, and held PR07C for seeds `5200011`, `5200017`, `5200010`,
  `7110004`, `7110017`, and `5200008`.
- Repair the loop gate so zero-byte reports, active sessions, stderr growth,
  `report.tmp`, stale manifests, `disk-preflight-blocked`, and wait-only
  feedback do not count as progress while actionable rows remain.

The latest duplicate/noise synthesis and feedback action are
`duplicate-noise-20260517T204820Z-synthesis.md` and
`duplicate-noise-20260517T204820Z-feedback-action.md`. The synthesis found
that strict no-product `pre_action_bootstrap_stall` consumers were mostly
sealed and that the remaining leak was producer/control-plane churn in
`rtc-browser-fuzz-novelty-monitor.mjs`. The completed action then:

- Patched `rtc-browser-fuzz-novelty-monitor.mjs` so startup/noise holds are
  tighter, unsafe save/reload bypass is removed, and actively noise-paused
  groups are not used to satisfy materialization floor.
- Patched `rtc-browser-fuzz-supervisor.mjs` to preserve unexpired
  startup-stall/no-analysis cooldown metadata across disable/remove/re-add.
- Patched `rtc-browser-fuzz-analysis-tier.mjs` and
  `rtc-browser-fuzz-live-analysis-monitor.mjs` so current-output family caps
  count completed first-level representatives.
- Passed `node --check` for all changed `.mjs` files and other present
  allowed scripts that were checked.
- Restarted the active coverage-guided novelty monitor, supervisor, and live
  analysis child.
- Left existing product-evidence analysis/deep-analysis sessions running to
  avoid hiding likely-real evidence.

Current duplicate/noise status after the action: save/reload and rich-text are
still paused as duplicate/noise-dominated, product-evidence representatives
remain visible by design, and the latest current-run active view has zero
actionable or product-evidence signatures. The remaining control-plane risk is
now visible in the latest pass: materialization-floor/max-enabled-group churn
briefly re-enabled `novelty-ws-parser-transform`, then paused it for
no-product `pre_action_bootstrap_stall` startup noise. The important guardrail
still holds for this snapshot: the noisy save/reload and rich-text groups were
not re-enabled through coverage recommendations.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, the fresh iteration-20 split recommendation, the PR07 runtime-gated
lane, and the completed duplicate/noise control-plane remediation.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Fresh iteration-20 split audit | `fresh-prset/iteration-20/*` | active candidate source set, but not yet a fetched verified GitHub PR-link set | Generate branch graph, containment, adjacent diffstats, patch-id/range-diff evidence, `base-allowlist.tsv`, `push-manifest.tsv`, `head-bundle-manifest-check.tsv`, and artifact verification newer than the current deferred queue |
| PR09+ mainline placement | PR09 through PR15C | use the iteration-20 topology; Cycle293 is supporting evidence only | Audit that PR09 is based on PR06D and PR07B1 is not an ancestor of PR09 |
| PR07 runtime / root-space gate | PR07A1/A2/A3, PR07B0, PR07B1, held PR07C; seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`, and `5200008` | unresolved; `/` is below the `2048 MB` browser replay floor | Recover `/` above threshold with before/after free-space evidence and cleanup ledger, repair runtime readiness, then run the PR07 owner matrix with snapshots |
| PR07D | reload/post-save/rejoin residuals | absent; not justified by current evidence | Add only after fresh replay proves red-at-active-PR07C non-coverage with first-divergence snapshots |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch evidence | real PR05-family work after PR05C; no fetched `verified-content` product branch link exists yet | Publish/fetch/audit PR05D; keep fallback/PR15-tail PR05D rows rejected |
| PR06E malformed-save sidecar | current PR06B-style sidecar | still useful, but must be renamed or explicitly labeled to avoid collision with PR06A-D | Publish/fetch/audit as `PR06E` or explicit `PR06-sidecar` after fresh PR06A-D naming exists |
| PR14B / PR15-on-PR14B finalization | PR14B and PR15A/B/C-on-PR14B | mandatory replacement topology, but no current `verified-content` branch links exist | Publish/fetch/audit explicit no-PR03B product refs; keep old pre-PR14B PR15 audit links as prior art only |
| PR03B browser `restoreRevision` CRDT invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B for revision-restore-shaped residuals after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | strict seed `5700084`; parser/rich-text/linebreak residuals | strict seed remains `covered-by-PR05C`; parser/rich-text/linebreak evidence stays out of PR18/PR18x | Compare against PR05B, PR05C, and clean PR05D before allowing any later owner |
| PR12 finer split | PR12A/B/C target; old aggregate PR12 audit link | preferred split is finer than the repaired audited aggregate link | Publish/fetch/audit PR12A/B/C before replacing aggregate prior-art rows |
| PR13 finer split | PR13A/B0/B1/B2/B3 target; repaired PR13A/B/C fallback links | preferred source split is finer than the repaired audited fallback links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after rebuilt validation produces fresh product evidence newer than terminal/downscope classifications |
| Pre-save search/live document collapse | seed `961308` / `ddf9559af37e`; run `0932bed35c7a` only if red or ambiguous | evidence-only; not in active split | Run one bounded owner comparison against PR06A-D, PR06E, PR07B0, PR07B1, and PR07C after PR07 stops consuming E2E capacity |
| Duplicate/noise control-plane recycling | duplicate synthesis/action `20260517T204820Z`; novelty status `2026-05-17T21:25:04.985Z` | scheduler and family-cap fixes are applied and restarted; save/reload and rich-text remain paused while preserving product evidence; parser-transform was re-enabled by the materialization floor and then paused for no-product startup noise | Watch for 30-45 minutes equivalent evidence: no unsafe startup/noise bypass, no re-enable of save/reload or rich-text through coverage recommendations, bounded handling of parser-transform/max-enabled churn, and product-evidence representatives still visible |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr`, `ready/*`, `ready-pr03b/*`, Cycle293, validation-stack, or
dirty evidence branches as-is.

Before filing any maintainer-facing PR:

1. Use only explicit product refs. Do not wildcard import or file
   validation-stack branches, deferred branches, dirty evidence branches, old
   downstream `ready/*` refs, stale `ready-pr03b/*` main-spine refs, or
   validation-only heads.
2. Generate a fresh iteration-20 split audit and manifest newer than the
   current deferred queue. Treat Cycle293 and older local push manifests as
   historical progress only.
3. Prove PR09 is based on PR06D and PR07B1 is not an ancestor of PR09.
4. Publish/fetch and audit explicit product refs for PR02A, PR05A/B/C, clean
   PR05D, PR06A/B/C/D, PR06E, PR07A1/A2/A3, PR07B0, PR07B1, held PR07C,
   PR11A-E, PR12A-C, PR13B0/B1/B2/B3, PR14B, and PR15A/B/C-on-PR14B before
   treating those finer rows as maintainer-facing links.
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
11. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.
12. Treat the raw novelty input, trend packet, and duplicate/noise reports as
    fuzz/control-plane health and triage evidence. They are not final-stack
    validation, a validated final-stack pass or failure, or filing readiness.

Existing fuzz infrastructure can continue only where healthy, and bounded
source reduction is allowed after environment preflight is healthy. The next
useful work is the non-Docker iteration-20 split/manifest audit, root-space
cleanup ledger, loop-gate repair, and after root recovery the bounded PR07
owner matrix.
