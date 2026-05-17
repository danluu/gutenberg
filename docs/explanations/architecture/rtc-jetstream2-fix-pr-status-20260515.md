# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T22:43:22Z`

Trigger event:
`pr-split-2026-05-17T22-40-58Z-20260517T223220Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T22-40-58Z-20260517T223220Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest completed split-persona synthesis,
`pr-split-20260517T223220Z-synthesis.md`, says a real split change is required.
It rejects the Cycle308 grouped iteration-26 filing shape as stale and promotes
the six-report iteration-27 microhead consensus as the current working target.
Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
stack-wide validation from the current evidence.

Current replacement target:

```text
Common mainline:
PR01 -> PR02 (+ PR02A sidecar)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D
(+ PR06E sidecar from PR06D)

Runtime-gated lane:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1
(hold PR07C; no raw PR07D)

Independent CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C
```

Important source-set caveat: `latest-fresh-pr-set.md` advanced to an
iteration-28 grouped proposal after the iteration-27 review context. Treat that
as unaudited drift, not filing evidence. The next audit must explicitly
reconcile iteration-27 microhead consensus against iteration-28 grouped drift
before changing the target again.

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- PR07 reload/post-save/rejoin ownership is still unproven. The Cycle306 PR07
  matrix produced all `18` requested rows, but every row was `setup-only` with
  `collaborationEnabled=null`; that is not product coverage and does not
  justify raw `PR07D`.
- Seed `1020002` blocks final-stack validation, filing, and rebuilt full-stack
  validation only. It must not block independent branch audit, split refresh,
  deferred promotion/downscope, PR07 readiness repair, or loop repair.
- The Cycle308 iteration-26 non-Docker manifest/deferred artifact generated at
  `2026-05-17T22:23:11Z` remains useful audit evidence, but it is no longer the
  active filing split.
- Keep raw `PR07D`, `PR17`, `PR18`, and `PR18x` absent. Parser/rich-text and
  linebreak residuals stay on the `PR05B -> PR05C -> clean PR05D` comparison
  path unless fresh owner evidence disproves that.

## Branch And Ref Status

Remote status was collected at `2026-05-17T22:43:17Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

That checkout still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR 6, PR 6E, PR 7, PR 8, PR 15, fallback-group
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

The branch-link audit was generated at `2026-05-17T22:43:22Z` from fetched
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
branch link confirms that the linked ref exists and has a non-empty audited
diff; it does not remove the filing blockers above. Because the latest split
now prefers microheads, many active rows do not yet have verified GitHub branch
links even when an older grouped or prior-art branch exists.

### Common Mainline

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | evidence-only until pushed/fetched/audited |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active microhead; old aggregate PR5 is prior art |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active microhead |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active microhead |
| PR 5D | Clean semicolonless/entity-validation after PR 5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail `PR05D` |
| PR 6A | Save request payload guard microhead A | No verified branch link yet | TBD | TBD | active microhead; do not substitute old grouped PR6 without audit |
| PR 6B | Save request payload guard microhead B | No verified branch link yet | TBD | TBD | active microhead |
| PR 6C | Save request payload guard microhead C | No verified branch link yet | TBD | TBD | active microhead |
| PR 6D | Save request payload guard microhead D | No verified branch link yet | TBD | TBD | active base for PR06E and PR09+ lanes |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07B1 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response runtime guard microhead A1 | No verified branch link yet | TBD | TBD | active microhead; runtime ownership still setup-only |
| PR 7A2 | Save response runtime guard microhead A2 | No verified branch link yet | TBD | TBD | active microhead |
| PR 7A3 | Save response runtime guard microhead A3 | No verified branch link yet | TBD | TBD | active microhead |
| PR 7B0 | Saved-response persisted-CRDT hydration | No verified branch link yet | TBD | TBD | rerun owner matrix only after readiness is true |
| PR 7B1 | Base-record/title save-response guard | No verified branch link yet | TBD | TBD | must remain independent from PR09+ |
| PR 7C | Reload record snapshots sidecar after PR7B1 | No verified branch link yet | TBD | TBD | held; no raw PR07D without first-divergence evidence |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | No verified branch link yet | TBD | TBD | active row must prove PR06D ancestry; old PR9 branch is prior art |
| PR 10 | CRDT block reconciliation foundation after PR9 | No verified branch link yet | TBD | TBD | active row needs refreshed GitHub ref |
| PR 11A | Explicit-base top-level operation microhead A | No verified branch link yet | TBD | TBD | active microhead; old grouped PR11 is prior art |
| PR 11B | Explicit-base top-level operation microhead B | No verified branch link yet | TBD | TBD | active microhead |
| PR 11C | Explicit-base top-level operation microhead C | No verified branch link yet | TBD | TBD | active microhead |
| PR 11D | Explicit-base top-level operation microhead D | No verified branch link yet | TBD | TBD | active microhead |
| PR 11E | Explicit-base delete-plus-insert anchor microhead | No verified branch link yet | TBD | TBD | active microhead |
| PR 12A | Previous-local-cache top-level operation microhead A | No verified branch link yet | TBD | TBD | active microhead; old grouped PR12 is prior art |
| PR 12B | Previous-local-cache top-level operation microhead B | No verified branch link yet | TBD | TBD | active microhead |
| PR 12C | Previous-local-cache top-level operation microhead C | No verified branch link yet | TBD | TBD | active microhead |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | desired active microhead; not yet a verified PR-content link |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | desired active microhead |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | desired active microhead |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | desired active microhead |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before PR15A-C |
| PR 15A | Fallback group move stale reorder after PR14B | No verified branch link yet | TBD | TBD | active microhead needs PR14B-based GitHub ref |
| PR 15B | Fallback group insert-anchor after PR14B | No verified branch link yet | TBD | TBD | active microhead needs PR14B-based GitHub ref |
| PR 15C | Fallback group delete after PR14B | No verified branch link yet | TBD | TBD | active microhead needs PR14B-based GitHub ref |

### Held Sidecars, Fallbacks, And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| Grouped PR 6 prior art | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified prior art; superseded as filing recommendation by PR06A-D until a fresh audit chooses grouping again |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not substitute for active PR06A without mapping |
| PR 7A/7B prior art | Old save-response grouped lane | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard), [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art; active PR07A1-A3/B0/B1 still need refreshed links and runtime owner evidence |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 9 prior art | Core-data lock fairness on old base | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | verified prior art; active PR9 must be audited from PR06D |
| PR 10 prior art | CRDT foundation on old base | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | verified prior art until refreshed PR09 placement is audited |
| Grouped PR 11 prior art | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified prior art; not the active PR11A-E recommendation |
| Grouped PR 12 prior art | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified prior art; not the active PR12A-C recommendation |
| PR 13B repaired fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired verified fallback until PR13B0-B3 have verified links |
| PR 13C repaired fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired verified fallback and supporting evidence |
| PR15 prior art | Pre-PR14B fallback-group rows | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder), [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor), [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified prior art only; active PR15A-C must be after PR14B |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T22:43:17Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T222443Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The current novelty/control-plane snapshot was updated at
`2026-05-17T22:41:11.319Z`:

```text
coverage files: 48067
total records seen: 74499
records processed this pass: 45
coverage lines seen this pass: 76859
new behavioral feature keys this pass: 0
new CDP coverage hashes this pass: 0
all-time records by transport:
  ws=71100
  http=3399
active current-run triage signatures: 0
active current-run likely-real visible: 0
current-drain triage signatures: 2
current-drain raw signatures: 8
current-drain no-product raw signatures: 5
current-drain product-evidence signatures: 2
current-drain likely-real visible: 0
suppressed strict startup records: 9
unmet goals: 5
quality issues: 0
health: ok
enabled groups:
  novelty-ws-real-user-editing
  novelty-ws-real-user-rich-text
paused groups:
  novelty-ws-parser-transform
  novelty-ws-lifecycle
  novelty-ws-real-user-save-reload
  novelty-http-persistence-probe
```

This is current fuzz/control-plane health, not final-stack validation and not a
no-bugs claim. Active current-run triage is clean at this pass; the current
drain scope still has product-evidence signatures in the `timeout` and
`reload_rejoin_awareness_stall` families, with no visible likely-real failure.
The no-product `pre_action_bootstrap_stall` startup failures remain suppressed
as startup noise and are used for producer scheduling/holds rather than being
reported as product failures.

Coverage guidance still has five unmet auto-ratchet goals:

```text
reload-post-action: 1068/2000
title-save-reload: 524/1000
body-save-reload: 583/1000
real-user-editing success: 592/1000
ui-format-paragraph: 1677/2000
```

The latest trend packet was generated at `2026-05-17T22:34:33Z` from monitor
data through `2026-05-17T22:31:06Z`:

```text
monitor passes: 2133
coverage files: 272 -> 48013
coverage files delta: 47741
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3459
summary startup failures last: 0
quality issues last: 0
memory free: 421.5 GB
load averages: 71.71 / 51.55 / 47.93 on 64 cores
latest fuzz level mix:
  browser-e2e=28 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5375749
browser-e2e likely-real findings: 619 over 1957.1 runner-hours
```

The novelty snapshot supersedes the trend packet for current enabled/paused
groups. The trend packet remains evidence for load, coverage growth, and fuzz
level effectiveness. Browser E2E remains the only level with confirmed
likely-real findings, but the lower-level lanes are under-triaged and should
not be declared useless from zero likely-real output.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T223220Z-synthesis.md`. It confirms:

- The Cycle308 grouped iteration-26 shape is stale and should be replaced by
  the six-report iteration-27 microhead consensus above.
- Cycle293, Cycle306, Cycle308 grouped manifests, `ready/*`, fallback-tail
  `PR05D`, raw `PR07D`, `PR17`, `PR18`, and `PR18x` are rejected as active
  filing sources.
- Clean `PR05D` means only
  `27c6e7924217038ed9b4ff71585e8041c67765a4`; any `PR05D` based on
  `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or another
  fallback/PR15 tail is invalid.
- `PR09` must be based on `PR06D`; `PR07B1` must not be an ancestor of `PR09`
  or of the `PR09 -> PR15C` CRDT/data-loss lane.
- `PR07D` remains held until product-phase replay proves red-at-active-`PR07C`
  non-coverage with first-divergence REST/meta, Y.Doc, provider, awareness, and
  block-tree snapshots.
- `latest-fresh-pr-set.md` has advanced to an unaudited iteration-28 grouped
  proposal. The next audit must explicitly reconcile iteration-27 consensus
  against iteration-28 before filing-source changes.
- Waiting only on seed `1020002` is invalid while independent branch audit,
  deferred-owner, PR07 readiness, and loop-repair rows remain actionable.

The newest split feedback action,
`pr-split-20260517T220648Z-feedback-action.md`, completed the older Cycle308
iteration-26 manifest/deferred refresh. It produced the local
`push-manifest.tsv`, manifest-age, base allowlist, head/bundle/manifest checks,
grouped-head audit, branch graph, adjacent diffstat/numstat,
deferred-output audit, latest-fresh audit, and artifact-verification files with
`5/0` topology checks and no hard/head/manifest/grouped-head failures. That is
valid evidence for its timestamp, but the later synthesis supersedes it as a
filing recommendation.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T220328Z-synthesis.md`. It identified a producer-side
scheduler leak in `bin/rtc-browser-fuzz-novelty-monitor.mjs`: mixed
product-evidence producers could classify no-product `pre_action_bootstrap_stall`
as `known-noise`, write a product-preserving `no-analysis.json`, and keep
running. The matching feedback action,
`duplicate-noise-20260517T220328Z-feedback-action.md`, implemented the bounded
policy-`21` novelty-monitor fix, applied the effective startup hold to producer
pause, re-enable/materialization blocking, no-analysis reason text, and
coverage-Codex launch gating, then restarted the monitor. It passed
`node --check` on the monitor and related consumers, but the current root is
still young, so this is control-plane and immediate-cleanup evidence, not
long-run proof against recurrence.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, old enabled-group claims, and "do not add
PR06B" recommendations are superseded by the repaired PR13 audit links, the
iteration-27 microhead split recommendation, the PR07 runtime-gated lane, and
later duplicate/noise evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Iteration-27 split audit | PR01-PR15C microhead consensus | active working target, but many rows lack verified branch links | Run bounded fresh-split audit/manifest and reconcile iteration-27 against unaudited iteration-28 grouped drift |
| Cycle308 iteration-26 artifact | local `push-manifest.tsv`, branch graph, adjacent diffstats, allowlist, bundle checks from `2026-05-17T22:23:11Z` | useful evidence, but stale as filing recommendation | Use only as input to the next reconciliation audit |
| Missing verified product refs | PR02A, PR05A-D, PR06A-E, PR07A1-A3/B0/B1/C, PR09-PR12C, PR13B0-B3, PR14B, PR15A-C | rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B1, held PR07C; seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`, and `5200008` | setup-only because collaboration readiness was null | Prove readiness true, then run owner matrix with first-divergence snapshots |
| PR07D | reload/post-save/rejoin residuals | absent; raw PR07D is not justified | Add only after fresh PR07 replay proves red-at-active-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet | Publish/fetch/audit clean PR05D; keep fallback-tail `PR05D` rejected |
| PR06E malformed-save sidecar | outgoing RTC save request-payload guard | useful only as a PR06D sidecar | Publish/fetch/audit explicit sidecar and prove `PR07B1` is not in its ancestry |
| PR09 placement | PR09 through PR15C | independent CRDT/data-loss lane must fork from PR06D, not PR07B1 | Prove `PR06D -> PR09` and `PR07B1 !-> PR09/PR15C` in filing refs |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; PR13B/C repaired links are fallback/supporting evidence | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15A-C | table query-array suffix and fallback-group rows after PR14B | active topology lacks verified current PR14B and PR15 branch links | Publish/fetch/audit explicit PR14B-based product refs |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | completed at `2026-05-17T21:29:52Z` with `0` check failures; no `PR18x` owner assigned | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Pre-save search/live document collapse | seed `961308` / `ddf9559af37e`; run `0932bed35c7a` only if red or ambiguous | evidence-only; not in active split | Run a bounded owner comparison after PR07 stops consuming E2E capacity |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise producer scheduling | `duplicate-noise-20260517T220328Z-synthesis.md`, `duplicate-noise-20260517T220328Z-feedback-action.md` | policy `21` patch is applied and restarted; latest snapshot shows `health: ok` and no visible likely-real failures | Watch for recurrence in the young root; keep startup holds product-evidence-preserving and do not treat suppressed startup noise as product failure |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file `ready/*`, `ready-pr03b/*`,
Cycle293, Cycle306, Cycle308 grouped manifests, validation-stack, dirty
evidence, or fallback-tail branches as-is.

Before filing any maintainer-facing PR:

1. Use the iteration-27 microhead consensus as the current working target.
2. Reconcile iteration-27 against the newer unaudited iteration-28 grouped drift
   before changing the target again.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Prove `PR06D -> PR06E`, `PR07B1 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09/PR15C`, clean `PR05D` only, and no fallback-tail `PR05D`.
5. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
6. Keep old aggregate PR5, broad PR8, old-base PR9/10, grouped PR11/12,
   stale/misordered PR13 refs, old pre-PR14B PR15 refs, dirty evidence
   branches, and the untracked reload-hydration gate spec out of filing
   branches and push allow-lists.
7. Prove runtime readiness and rerun the PR07A1-A3/PR07B0/PR07B1/held-PR07C
   owner matrix before any PR07D decision.
8. Patch/enforce the progress gate so active sessions, active/terminal
   `1020002`, zero-byte artifacts, `report.tmp`, stale manifests,
   disk/runtime-preflight-only reports, setup-only PR07 matrices, and stderr
   growth are not counted as durable progress while actionable rows exist.
9. Keep the duplicate/noise policy-21 scheduler behavior in force: current
   no-product startup dominance should gate producer scheduling while
   product-evidence families stay visible or family-capped.
10. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.
11. Treat novelty, trend, and duplicate/noise reports as fuzz/control-plane
    health and triage evidence. They are not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

The next useful work is a bounded current fresh-split audit that reconciles
iteration-27 microheads against iteration-28 grouped drift, publishing and
auditing missing branch refs, PR07 collaboration bootstrap/root-cause work, the
bounded PR07 owner matrix after readiness is true, loop-gate enforcement, and
monitoring the policy-21 duplicate/noise producer scheduling fix in the young
root. Do not launch broad final-stack fuzz, a duplicate seed `1020002` job, raw
`PR07D`, `PR17`, or `PR18x`.
