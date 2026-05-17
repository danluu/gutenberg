# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T22:16:31Z`

Trigger event:
`pr-split-2026-05-17T22-15-16Z-20260517T220648Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T22-15-16Z-20260517T220648Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest completed split-persona synthesis,
`pr-split-20260517T220648Z-synthesis.md`, says filing is still blocked and the
old Cycle293 linear stack must no longer drive filing, final manifests, or
stack-wide validation. The current replacement recommendation is the Cycle306
`fresh-prset/iteration-23/*` shape, refreshed before use because the Cycle306
manifest predates later deferred-queue movement.

Current replacement target:

```text
Common:
PR01 -> PR02 (+ PR02A)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> grouped PR06A-D
(+ PR06E sidecar from PR06D, not PR07B1)

Runtime-gated:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1
(hold PR07C; no raw PR07D)

Independent CRDT/data-loss from PR06D:
PR09 -> PR10 -> grouped PR11 -> grouped PR12
-> PR13A -> PR13B0/B1/B2/B3 -> PR14 -> PR14B -> grouped PR15
```

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- PR07 reload/post-save/rejoin ownership is still unproven. The Cycle306 PR07
  matrix is setup-only because its rows hit `collaborationEnabled=null`.
- Seed `1020002` blocks final-stack validation and filing only. It must not
  block independent branch audit, split refresh, deferred promotion/downscope,
  PR07 owner comparison, or loop repair.
- The current manifest/audit must be refreshed newer than the current deferred
  queue before publication or filing.
- Keep raw `PR07D`, `PR17`, `PR18`, and `PR18x` absent. Parser/rich-text and
  linebreak residuals stay on the `PR05B -> PR05C -> clean PR05D` comparison
  path unless fresh owner evidence disproves that.

## Branch And Ref Status

Remote status was collected at `2026-05-17T22:16:25Z`.

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

The branch-link audit was generated at `2026-05-17T22:16:31Z` from fetched
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
branch-link audit or explicitly says `No verified branch link yet`. A verified
branch link does not remove the filing blockers above; it only confirms that
the linked ref exists and has a non-empty diff against the audited base.

### Common And Independent Lanes

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; needs refreshed iteration-23 audit |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active fresh row; old aggregate PR5 is prior art |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active fresh row |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active fresh row |
| PR 5D | Clean semicolonless/entity-validation after PR 5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail `PR05D` |
| PR 6A-D | Grouped save-request-payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified grouped content; refresh ancestry before filing |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | must hang from PR06D, not PR07B1 |
| PR 9 | Core-data lock fairness from PR06D | No verified branch link yet | TBD | TBD | active row must prove PR06D ancestry; old PR9 branch is prior art |
| PR 10 | CRDT block reconciliation foundation after PR9 | No verified branch link yet | TBD | TBD | active row needs refreshed audit |
| PR 11 | Grouped explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | verified grouped content; refresh in iteration-23 manifest before filing |
| PR 12 | Grouped previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified grouped content; refresh in iteration-23 manifest before filing |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0-B3 | Finer source-retirement rows | No verified branch link yet | TBD | TBD | preferred finer split still needs published/audited refs |
| PR 13B fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired verified fallback until PR13B0-B3 exist |
| PR 13C fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired verified fallback only |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | mandatory before grouped PR15 |
| PR 15 | Grouped fallback-group move/insert/delete after PR14B | No verified branch link yet | TBD | TBD | active grouped row needs refreshed PR14B-based audit |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | First save-response/runtime guard split row | No verified branch link yet | TBD | TBD | setup-only until runtime readiness is true |
| PR 7A2 | Second save-response/runtime guard split row | No verified branch link yet | TBD | TBD | setup-only until runtime readiness is true |
| PR 7A3 | Third save-response/runtime guard split row | No verified branch link yet | TBD | TBD | setup-only until runtime readiness is true |
| PR 7B0 | Saved CRDT response hydration split from old opaque PR7B | No verified branch link yet | TBD | TBD | owner matrix still required |
| PR 7B1 | Stale base-record/title filtering split from old opaque PR7B | No verified branch link yet | TBD | TBD | owner matrix still required |
| PR 7C | Reload record snapshots sidecar after PR7B1 | No verified branch link yet | TBD | TBD | held; no raw PR07D without first-divergence evidence |

### Held Sidecars And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not substitute for the active PR06A-D grouped row unless the refresh maps it there |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art; active lane is PR07A1/A2/A3 |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art; active lane is PR07B0/B1 |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 9 prior art | Core-data lock fairness on old base | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | verified prior art; active PR9 must be audited from PR06D |
| PR 10 prior art | CRDT foundation on old base | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | verified prior art until the refreshed PR09 placement is audited |
| PR15 prior art | Pre-PR14B fallback-group rows | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder), [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor), [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified prior art only; active grouped PR15 must be after PR14B |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T22:16:25Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T205339Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The current novelty/control-plane snapshot was updated at
`2026-05-17T22:13:46.554Z`:

```text
coverage files: 47895
total records seen: 74115
current-run records: 33
current-run records by group:
  novelty-ws-parser-serialization=27
  novelty-ws-three-user-late-join=6
current-run successful records: 12
current-run pre-action startup failures: 9
unmet goals: 5
active current-run actionable signatures: 1
active current-run product-evidence signatures: 1
active current-run likely-real visible: 0
current-drain actionable signatures: 3
current-drain product-evidence signatures: 3
current-drain likely-real visible: 1
active top semantic family: reload_rejoin_awareness_stall
historical top duplicate family share: 0.3462
health warning: triage yield is duplicate/noise dominated
enabled groups:
  novelty-ws-three-user-late-join
  novelty-ws-parser-serialization
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
no-bugs claim. Active current-run triage has zero visible likely-real findings;
the drain view intentionally keeps product-evidence `reload_rejoin_awareness_stall`
and `timeout` representatives visible.

The latest trend packet was generated at `2026-05-17T22:10:57Z` from monitor
data through `2026-05-17T22:06:48Z`:

```text
monitor passes: 2127
coverage files: 272 -> 47886
coverage files delta: 47614
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3462
summary startup failures last: 0
quality issues last: 0
memory free: 427.1 GB
load averages: 69.84 / 62.78 / 54.14 on 64 cores
latest fuzz level mix:
  browser-e2e=27 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5371375
browser-e2e likely-real findings: 617 over 1953.5 runner-hours
largest unmet goals:
  reload-post-action 1067/2000
  title-save-reload 523/1000
  body-save-reload 582/1000
  real-user-editing success 592/1000
  ui-format-paragraph 1664/2000
```

The novelty snapshot supersedes the trend packet for current enabled/paused
groups. The trend packet remains evidence for load, coverage growth, and fuzz
level effectiveness. Browser E2E remains the only level with confirmed
likely-real findings, but the lower-level lanes are under-triaged and should
not be declared useless from zero likely-real output.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T220648Z-synthesis.md`. It confirms:

- The split changed again from the previous `215559Z` ungrouped fresh-lane
  recommendation. Use the Cycle306 `fresh-prset/iteration-23/*` grouped shape
  as the current working target, after a fresh manifest/deferred refresh.
- Cycle293 and the local-machine Cycle293 publication rows are historical
  only. They serialize PR09+ behind PR07 and must not drive filing.
- `PR09+` must be independent from `PR07B1`: prove `PR06D -> PR09` and
  `PR07B1 !-> PR09/PR15C`.
- `PR06E` is a sidecar from `PR06D`, not from `PR07B1`: prove
  `PR06D -> PR06E` and `PR07B1 !-> PR06E`.
- The Cycle306 PR07 matrix remains setup-only while
  `window._wpCollaborationEnabled === null`. Any PR07 owner replay must wait
  for readiness true and must capture REST/meta, Y.Doc, provider, awareness,
  and block-tree first-divergence snapshots.
- Clean `PR05D` means `27c6e7924217`. Reject
  `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, and any
  fallback/PR15-tail row as `PR05D`.
- Waiting only on seed `1020002` is invalid while independent Progress Gate
  rows are actionable.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T220328Z-synthesis.md`. It identifies a remaining
producer-side scheduler leak in `bin/rtc-browser-fuzz-novelty-monitor.mjs`:
mixed product-evidence producers can classify no-product
`pre_action_bootstrap_stall` as `known-noise`, write a product-preserving
`no-analysis.json`, and keep running. The recommended small fix is to treat
current no-product `pre_action_bootstrap_stall` as startup-pause-worthy for
pause, enable, materialization/top-off, and coverage-Codex gating while
preserving product-evidence signatures. The latest collected
`duplicate-noise-20260517T220328Z-feedback-action.md` is empty, so no completed
feedback action accompanies that synthesis in these inputs.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, old enabled-group claims, and "do not add
PR06B" recommendations are superseded by the repaired PR13 audit links, the
Cycle306 grouped replacement split, the PR07 runtime-gated lane, and later
duplicate/noise evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Fresh iteration-23 refresh | Cycle306 `fresh-prset/iteration-23/*`, deferred queue, branch graph, adjacent diffstats, allowlist, bundle checks | Cycle306 is the active split target, but its manifest is stale relative to later deferred queue movement | Run a fresh non-Docker Cycle308 iteration-23 manifest/deferred refresh newer than the current deferred queue |
| PR07 runtime / root-space gate | PR07A1/A2/A3, PR07B0, PR07B1, held PR07C; seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`, and `5200008` | setup-only because collaboration readiness was null; root `/` was still below the `2048 MB` browser replay floor in prior artifacts | Recover root space, prove readiness true, then run the owner matrix with first-divergence snapshots |
| PR07D | reload/post-save/rejoin residuals | absent; raw PR07D is not justified | Add only after fresh PR07 replay proves red-at-active-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet | Publish/fetch/audit clean PR05D; keep fallback-tail `PR05D` rejected |
| PR06E malformed-save sidecar | outgoing RTC save request-payload guard | still useful, but only as a PR06D sidecar | Publish/fetch/audit explicit sidecar and prove `PR07B1` is not in its ancestry |
| PR09+ placement | PR09 through grouped PR15 | independent CRDT/data-loss lane must fork from PR06D, not PR07B1 | Prove `PR06D -> PR09` and `PR07B1 !-> PR09/PR15C` in the refreshed manifest |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | repaired PR13A/B/C review refs are the only verified current PR13 content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired fallback refs |
| PR14B / grouped PR15 | PR14B and grouped fallback-group PR15 after PR14B | active topology lacks verified current PR14B and PR15 branch links | Publish/fetch/audit explicit PR14B-based product refs |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | completed at `2026-05-17T21:29:52Z` with `0` check failures; no `PR18x` owner assigned | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Pre-save search/live document collapse | seed `961308` / `ddf9559af37e`; run `0932bed35c7a` only if red or ambiguous | evidence-only; not in active split | Run a bounded owner comparison after PR07 stops consuming E2E capacity |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise producer scheduling | `duplicate-noise-20260517T220328Z-synthesis.md` | strict startup noise is suppressed downstream, but mixed product-evidence producers can still leak capacity | Patch novelty scheduling for current no-product startup dominance while preserving product evidence |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file `ready/*`, `ready-pr03b/*`,
Cycle293, validation-stack, dirty evidence, or fallback-tail branches as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle306 iteration-23 grouped shape as the current working target,
   but refresh its manifest and deferred-output audit first.
2. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
3. Prove `PR06D -> PR06E`, `PR07B1 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09/PR15C`, clean `PR05D` only, and no fallback-tail `PR05D`.
4. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for PR13 content.
5. Keep old aggregate PR5, old PR7 aggregate rows, broad PR8, old-base PR9/10,
   stale/misordered PR13 refs, old pre-PR14B PR15 refs, dirty evidence
   branches, and the untracked reload-hydration gate spec out of filing
   branches and push allow-lists.
6. Recover root space above the `2048 MB` replay floor, prove runtime readiness,
   and rerun the PR07B0/PR07B1/held-PR07C owner matrix before any PR07D
   decision.
7. Patch/enforce the progress gate so active sessions, active/terminal
   `1020002`, zero-byte artifacts, `report.tmp`, stale manifests,
   disk/runtime-preflight-only reports, and stderr growth are not counted as
   durable progress while actionable rows exist.
8. Apply the duplicate/noise mixed-run scheduler follow-up so current
   no-product startup dominance gates producer scheduling while product-evidence
   families stay visible or family-capped.
9. Run focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
   runtime checks on refreshed audited refs.
10. Treat novelty, trend, and duplicate/noise reports as fuzz/control-plane
    health and triage evidence. They are not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

The next useful work is a fresh non-Docker Cycle308 iteration-23
manifest/deferred refresh, PR07 collaboration bootstrap/root-cause work, the
bounded PR07 owner matrix after readiness is true, loop-gate enforcement, and
the duplicate/noise producer-scheduling patch. Do not launch broad final-stack
fuzz, a duplicate seed `1020002` job, raw `PR07D`, `PR17`, or `PR18x`.
