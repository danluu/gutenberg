# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T21:06:40Z`

Trigger event:
`pr-split-2026-05-17T21-05-27Z-20260517T205522Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T21-05-27Z-20260517T205522Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest completed split-persona synthesis,
`pr-split-20260517T205522Z-synthesis.md`, changes the active review
recommendation. The prior Cycle 293 shape is still useful historical
publication evidence, but it should no longer be treated as the filing topology
because it serializes `PR09+` behind the PR07 runtime/readiness lane.

Final filing, GitHub PR opening, broad final-stack fuzzing, and rebuilt
stack-wide validation remain blocked. The common blockers are still missing
PR07 reload/post-save/rejoin owner evidence, root/runtime readiness, and the
post-PR15C `1020002` gate. Seed `1020002` blocks final-stack fuzz, filing, and
rebuilt stack validation only; it must not serialize independent branch/audit,
deferred owner/downscope, manifest refresh, loop repair, or control-plane work.

Current replacement review target:

```text
Mainline:
PR01 -> PR02 (+ PR02A sidecar) -> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> split/retitled PR06 save-payload guard stack
-> PR09 -> PR10 -> PR11A-E -> PR12
-> PR13A/B0/B1/B2/B3 -> PR14 -> PR14B -> PR15A/B/C-on-PR14B

Runtime-gated side lane after the PR06 guard stack:
PR07A -> PR07B0 -> PR07B1
+ PR07C sidecar
+ PR07D only with fresh red-at-active-PR07C first-divergence evidence
```

The current PR06 malformed-save sidecar should be preserved, but renamed or
explicitly labeled so it does not collide with the new PR06 sub-split. Use
`PR06E` or an explicit `PR06-sidecar` label until a fresh audit gives the exact
maintainer-facing name.

Do not file `PR09` from the current PR07B1-based Cycle 293 stack. Rebase and
audit `PR09+` onto the last non-runtime PR06 mainline slot. Do not use Cycle
302 or older local push manifests as filing evidence: the Cycle 302 manifest
generated at `2026-05-17T20:52:49Z` is stale against the deferred queue now
generated at `2026-05-17T21:01:47Z`.

The PR07C browser-env continuation is now nonzero, but it only classifies prior
evidence as `resolved_by_active_artifact_runtime_readiness_not_product`. It is
not PR07 coverage and does not justify PR07D. Root space is again below the
replay threshold, about `814 MB` free versus the `2048 MB` threshold.

Keep out or held: monolithic `PR07B`, raw `PR07D`, `PR17`, `PR18`/`PR18x`,
fallback/PR15-tail `PR05D`, old `origin/trunk`, `ready/*`, and stale
`ready-pr03b/*` publication rows. `PR03B` stays held unless PR03-vs-PR03B
evidence proves revision-restore ownership. Parser/rich-text/linebreak
residuals require PR05B/PR05C/clean-PR05D comparison before naming any later
owner.

## Branch And Ref Status

Remote status was collected at `2026-05-17T21:06:35Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6A, PR 8, PR 15, fallback-group evidence, and
final branch claims unless it is deliberately copied into a clean evidence
worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T21:06:40Z` from fetched
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
branch-link audit or explicitly says `No verified branch link yet`.

### Mainline Replacement Target

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content; keep the explicit-base two-file range |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content; keep in the known-fix prefix |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | sidecar; needs fetched `verified-content` audit before filing |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held separately |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | replacement for old aggregate PR 5; needs verified branch link |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | progress-unblock local-machine evidence exists; GitHub verified-content link is still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | strict seed `5700084` remains covered by PR05C in current evidence |
| PR 5D | Semicolonless entity/reference block validation after PR 5C | No verified branch link yet | TBD | TBD | only the clean PR05C-adjacent branch is valid; fallback/PR15-tail PR05D is rejected |
| PR 6 | Save request payload guard stack, current verified aggregate | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified content, but fresh audit should split/retitle the PR06 guard stack if smaller rows are available |
| PR 6A | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | 2 | +64 / -1 | verified content; narrow persisted-body guard |
| PR 6 sidecar / PR06E TBD | Malformed outgoing RTC save request-payload guard | No verified branch link yet | TBD | TBD | preserve as renamed sidecar after the PR06 guard stack; avoid colliding with the new PR06 sub-split |
| PR 9 | Core-data lock fairness | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content, but must be rebased/audited onto the non-runtime PR06 mainline slot before filing |
| PR 10 | CRDT block reconciliation foundation | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content; rebase after refreshed PR09 placement |
| PR 11A | Explicit-base stale suffix append | No verified branch link yet | TBD | TBD | finer split target; GitHub verified-content link is still missing |
| PR 11B | Explicit-base top-level delete | No verified branch link yet | TBD | TBD | finer split target; GitHub verified-content link is still missing |
| PR 11C | Explicit-base middle insert | No verified branch link yet | TBD | TBD | source-local evidence marks seed `5200005` covered here; verified-content link is still missing |
| PR 11D | Explicit-base top-level move/reorder | No verified branch link yet | TBD | TBD | finer split target; GitHub verified-content link is still missing |
| PR 11E | Explicit-base delete-plus-insert anchor | No verified branch link yet | TBD | TBD | finer split target; GitHub verified-content link is still missing |
| PR 12 | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified content; old `5200005` table-delete replay remains PR12-covered |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired audit link; first PR13 delta |
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
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified content, but moved out of the mainline filing path into the PR07 runtime-gated side lane |
| PR 7B0 | Saved CRDT response hydration split from old opaque PR 7B | No verified branch link yet | TBD | TBD | local split evidence exists, but no branch-link-audit verified GitHub PR-content link exists yet |
| PR 7B1 | Stale base-record/title filtering split from old opaque PR 7B | No verified branch link yet | TBD | TBD | local split evidence exists, but no branch-link-audit verified GitHub PR-content link exists yet |
| PR 7C | Reload record snapshots sidecar after PR 7B1 | No verified branch link yet | TBD | TBD | nonzero browser-env continuation is runtime-readiness-only, not PR07 coverage |

### Held Sidecars And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR 3 | No verified branch link yet | held until PR03-vs-PR03B replay proves revision-restore ownership |
| PR13 fallback B | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired audited fallback link; use only until PR13B0/B1/B2/B3 are published and audited |
| PR13 fallback C | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired audited fallback link; use only until PR13B0/B1/B2/B3 are published and audited |

Verified branches that are prior art or staging only:

- [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence)
  is verified content for old aggregate PR 5, not the recommended PR05A/B/C/D
  split.
- [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record)
  is verified content for old opaque PR 7B. The active recommendation is to
  publish and audit separate PR07B0 and PR07B1 branches before filing.
- [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record)
  is verified content for old broad PR 8, not an active filing unit.
- [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops)
  is verified content for old aggregate PR 11, but the active recommendation is
  the PR11A-E split.
- [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder),
  [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor), and
  [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete)
  are verified content for the pre-PR14B PR15 shape, not the recommended
  PR15A/B/C-on-PR14B replacement.

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T21:06:35Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T205339Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` collected for this run is nonempty and gives the
freshest bounded control-plane view:

```text
novelty updated: 2026-05-17T21:04:16.962Z
coverage files: 47715
records seen: 73855
current-run records: 6
current-run records by group:
  novelty-ws-real-user-rich-text=4
  novelty-ws-real-user-save-reload=2
current actionable signatures: 1
current product-evidence signatures: 1
raw current product-evidence signatures: 6
current likely-real visible: 0
current family-capped signatures: 5
top current semantic family: reload_rejoin_awareness_stall
health: ok
enabled groups:
  novelty-ws-real-user-save-reload: ws, lanes=2
  novelty-ws-real-user-rich-text: ws, lanes=4
paused groups:
  novelty-ws-parser-transform
  novelty-http-persistence-probe
```

This is current fuzz/control-plane health, not final-stack validation and not a
no-bugs claim. The current active run has one actionable product-evidence
signature, but zero visible likely-real findings at the snapshot. Historical
triage still contains large known-noise aggregates and must not be presented as
live product failure.

The latest trend packet was generated at `2026-05-17T20:57:37Z` from monitor
data through `2026-05-17T20:56:35Z`:

```text
monitor passes: 2109
coverage files: 272 -> 47690
coverage files delta: 47418
unmet goals: 6
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3465
summary startup failures last: 0
quality issues last: 1
memory free: 421.5 GB
load averages: 43.82 / 62.27 / 62.64 on 64 cores
trend enabled groups current:
  novelty-http-persistence-probe,
  novelty-ws-real-user-save-reload,
  novelty-ws-real-user-rich-text
latest fuzz level mix:
  browser-e2e=34 lanes/27 groups;
  unit-property=1 lane/1 group;
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5356170
browser-e2e likely-real findings: 607 over 1937.1 runner-hours
largest unmet goals:
  reload-post-action 1043/2000,
  title-save-reload 499/1000,
  body-save-reload 558/1000,
  real-user-editing success 578/1000,
  ui-format-paragraph 1615/2000
```

The novelty state at `21:04:16Z` supersedes the trend packet for current
enabled/paused groups. The trend packet remains graph-derived evidence for
coverage, load, and fuzzing effectiveness. Browser E2E remains the only level
with confirmed likely-real findings in the trend packet, but lower-level lanes
are under-triaged and should not be declared useless from zero likely-real
output.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T205522Z-synthesis.md`. It confirms:

- The current status is blocked, and the split should change.
- The better synthesis is to stop keeping `PR09+` serialized behind PR07
  runtime readiness.
- Move PR07 into a runtime-gated side lane after the PR06 guard stack.
- Rebase/audit `PR09+` onto the last non-runtime PR06 mainline slot.
- Do not file GitHub PRs or launch broad final-stack fuzz from the current
  state.
- Do not use Cycle 302 or older local push manifests as filing evidence because
  the deferred queue advanced to `2026-05-17T21:01:47Z`.
- Treat the nonzero PR07C browser-env classification as runtime/setup evidence
  only, then require a newer product-phase owner matrix before PR07D.
- Recover `/` above the `2048 MB` replay threshold, with cleanup ledger, before
  running the PR07B0/PR07B1/PR07C owner matrix.
- Patch/enforce the loop gate so active sessions, active/terminal `1020002`,
  zero-byte files, `report.tmp`, stale manifests, disk/runtime-preflight-only
  reports, and stderr growth are not counted as durable progress while
  actionable gate rows exist.

The latest duplicate/noise synthesis is
`duplicate-noise-20260517T204820Z-synthesis.md`. It finds that the strict
no-product `pre_action_bootstrap_stall` consumer path is mostly sealed, but a
producer/control-plane leak remains in `rtc-browser-fuzz-novelty-monitor.mjs`.
Coverage-guidance bypass, materialization-floor replacement, and mixed-run
product-evidence logic can still re-enable or keep alive groups that are under
active startup/noise holds. The next bounded control-plane fix is to make
active no-product startup/noise holds survive coverage recommendations and
floor replacement while preserving product-evidence failures for normal
analysis. This is a control-plane item, not a product PR split change.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, old enabled-group claims, and "do not add
PR06B" recommendations are superseded by the repaired PR13 audit links, the
PR07B0/PR07B1 split evidence, the current PR07 side-lane recommendation, the
PR06 malformed-save sidecar rename requirement, and the latest novelty-monitor
producer scheduling analysis.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Fresh replacement split audit | replacement topology after deferred queue `2026-05-17T21:01:47Z` | Cycle 302 is stale for filing evidence; it remains historical local-machine progress only | Generate fresh branch graph, containment, adjacent diffstats, range-diff or patch-id evidence, base allowlist, and head/bundle/manifest agreement newer than `2026-05-17T21:01:47Z` |
| PR09+ mainline placement | PR09 through PR15C | Do not file from PR07B1-based Cycle293 stack | Rebase/audit `PR09+` after the last non-runtime PR06 mainline slot |
| PR07 runtime / root-space gate | PR07A, PR07B0, PR07B1, PR07C; seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`, and `5200008`; include `5200002`/`5200005` only if the harness fits | PR07C browser-env is nonzero but runtime-readiness-only; root space is about `814 MB`, below the `2048 MB` replay threshold | Recover `/` above threshold with before/after free-space evidence and cleanup ledger, repair `collaborationEnabled=null`, then run the PR07 owner matrix with snapshots |
| PR07D | reload/post-save/rejoin residuals | absent; not justified by current PR07C runtime-only classification | Add only after fresh replay proves red-at-active-PR07C non-coverage with first-divergence snapshots |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch evidence | real PR05-family work after PR05C; no fetched `verified-content` product branch link exists yet | Publish/fetch/audit PR05D; keep fallback/PR15-tail PR05D rows rejected |
| PR06 malformed-save sidecar | current PR06B-style sidecar | still useful, but must be renamed or explicitly labeled to avoid collision with a split/retitled PR06 guard stack | Publish/fetch/audit as `PR06E` or explicit `PR06-sidecar` after fresh PR06 split naming exists |
| PR14B / PR15-on-PR14B finalization | PR14B and PR15A/B/C-on-PR14B | mandatory replacement topology, but no current `verified-content` branch links exist | Publish/fetch/audit explicit no-PR03B product refs; keep old pre-PR14B PR15 audit links as prior art only |
| PR03B browser `restoreRevision` CRDT invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B for revision-restore-shaped residuals after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | strict seed `5700084`; parser/rich-text/linebreak residuals | strict seed remains `covered-by-PR05C`; parser/rich-text/linebreak evidence stays out of PR18/PR18x | Compare against PR05B, PR05C, and clean PR05D before allowing any later owner |
| PR13 finer split | PR13A/B0/B1/B2/B3 target; repaired PR13A/B/C fallback links | preferred source split is finer than the repaired audited fallback links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing repaired PR13B/C fallback rows |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after rebuilt validation produces fresh product evidence newer than terminal/downscope classifications |
| Pre-save search/live document collapse | seed `961308` / `ddf9559af37e`; run `0932bed35c7a` only if red or ambiguous | evidence-only; not in active split | Run one bounded owner comparison against PR06, PR06A, PR07B0, PR07B1, and PR07C after PR07 stops consuming E2E capacity |
| Duplicate/noise control-plane recycling | latest novelty status at `2026-05-17T21:04:16.962Z`; duplicate synthesis `20260517T204820Z` | consumer filters are mostly sealed, but novelty producer scheduling can still re-enable startup/noise-held groups; current run has one actionable product-evidence signature and no visible likely-real finding | Patch novelty scheduling so active no-product startup/noise holds are hard stops for coverage-guidance and materialization-floor enablement, while preserving product-evidence analysis |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file the large stacked
`*-stock-repro-pr`, `ready/*`, `ready-pr03b/*`, Cycle 293, or validation-stack
branches as-is.

Before filing any maintainer-facing PR:

1. Use only explicit product refs. Do not wildcard import or file
   validation-stack branches, deferred branches, dirty evidence branches, old
   downstream `ready/*` refs, stale `ready-pr03b/*` main-spine refs, or
   validation-only heads.
2. Generate a fresh replacement split audit and manifest newer than the
   `2026-05-17T21:01:47Z` deferred queue. Treat Cycle 302 as historical
   progress only.
3. Rebase/audit `PR09+` onto the last non-runtime PR06 mainline slot. Do not
   file PR09 from the PR07B1-based Cycle 293 stack.
4. Publish/fetch and audit explicit product refs for PR02A, PR05A/B/C, clean
   PR05D, split/retitled PR06 rows, the renamed PR06 malformed-save sidecar,
   PR07B0, PR07B1, PR07C, PR11A-E, PR13B0/B1/B2/B3, PR14B, and
   PR15A/B/C-on-PR14B before treating those finer rows as maintainer-facing
   links.
5. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for PR13 fallback content.
6. Keep old aggregate PR 5, broad PR 8, aggregate PR 11, stale/misordered PR13
   refs, old pre-PR14B PR15 refs, dirty evidence branches, and the untracked
   reload-hydration gate spec out of filing branches and push allow-lists.
7. Treat the PR07C browser-env classification as setup/runtime evidence only.
   Recover root space above `2048 MB`, prove runtime readiness, and rerun the
   PR07B0/PR07B1/PR07C owner matrix before any PR07D decision.
8. Do not publish raw reload-hydration deferred refs as PR07D. Current evidence
   treats raw reload branches as rejected/held unless fresh replay proves
   PR07B0/PR07B1/PR07C non-coverage.
9. Run PR03 vs PR03B for revision-restore-shaped residuals, and PR05B vs PR05C
   vs clean PR05D for parser/rich-text/linebreak residuals before naming any
   later owner.
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
useful work is non-Docker split/manifest audit newer than the current deferred
queue, executor ledger cleanup for the PR07C runtime-only classification,
root/runtime readiness repair, and the bounded control-plane novelty scheduler
fix.
