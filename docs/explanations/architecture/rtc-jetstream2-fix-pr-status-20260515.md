# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T22:57:59Z`

Trigger event:
`pr-split-2026-05-17T22-56-37Z-20260517T224751Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T22-56-37Z-20260517T224751Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest completed split-persona synthesis,
`pr-split-20260517T224751Z-synthesis.md`, says the Cycle310 iteration-27
microhead split should be replaced by the `fresh-prset/iteration-29/*` grouped
topology, pending a fresh audit/manifest. This is a recommendation for the next
filing shape, not a filing-ready branch stack.

Current replacement target:

```text
Common:
PR01 -> PR02 (+ PR02A)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06
(+ PR06E sidecar from PR06)

Runtime-gated:
PR07A -> PR07B
(hold PR07C; no raw PR07D)

Independent CRDT/data-loss lane from PR06:
PR09 -> PR10 -> PR11 -> PR12
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15
```

Review-shape constraints:

- Group `PR06`, `PR11`, `PR12`, and `PR15`.
- Keep `PR05A-D` and `PR13B0-B3` split.
- `PR09+` must fork from `PR06`, not serialize behind `PR07`.
- Clean `PR05D` is only `27c6e7924217...`; reject fallback/PR15-tail
  `PR05D`, including `fix/rtc-fallback-group-delete-stale-local` and
  `d06e3528cbd`.
- Keep Cycle293/Cycle306 local-publish rows, raw `PR07D`, `PR17`, `PR18`, and
  `PR18x` out of the active split.
- Treat `deferred/rtc-reload-hydration-20260517T223235Z` / `4eaf5d621b4` as a
  held `PR07D` candidate, not fileable, until `PR07B`/`PR07C` owner replay
  proves a distinct product delta.
- Parser, linebreak, and rich-text reductions must compare against `PR05B`,
  `PR05C`, and clean `PR05D` before naming any later owner.

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- Seed `1020002` still blocks final-stack fuzz, filing, and rebuilt full-stack
  validation. It must not block the independent i29 branch audit, manifest
  refresh, PR07 readiness/root-cause work, deferred owner comparison, or loop
  repair.
- PR07 runtime ownership remains setup-blocked. Existing PR07 matrix rows were
  `setup-only` with `collaborationEnabled=null`; they are not product coverage.
- The active `rtc-pr-finalize-job-20260517T225115Z` had a zero-byte
  `finalization.report.md` when checked by the latest persona synthesis; that
  is not evidence. If it exits without a fresh nonempty allowlisted manifest,
  invalidate it.
- Many active i29 rows still lack verified GitHub branch links. Rows below say
  `No verified branch link yet` where the branch-link audit has no current
  PR-content row for that proposed filing unit.

## Branch And Ref Status

Remote status was collected at `2026-05-17T22:57:54Z`.

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
evidence, and final branch claims unless it is deliberately copied into a clean
evidence worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-17T22:57:59Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`.

Use only these repaired audited PR13 review refs for current PR13 content or
fallback evidence:

- [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired)
- [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement)
- [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard)

Do not link these stale or misordered PR13 refs as current PR content:

- `review/rtc-pr13a-observed-delete-provenance`
- `review/rtc-pr13b-stale-block-identity-smear`
- `review/rtc-pr13c-cross-parent-source-retirement`

Supporting provenance base:
[`shape/rtc-crdt-pr12-previous-local`](https://github.com/danluu/gutenberg/tree/shape/rtc-crdt-pr12-previous-local)
exists only so the repaired PR13A compare has the correct source base.

## Proposed PR Split

Every proposed row either uses a clickable branch link from the verified
branch-link audit or explicitly says `No verified branch link yet`. A verified
branch link confirms that the linked ref exists and has a non-empty audited
diff; it does not remove the i29 audit, topology, PR07 runtime, seed-1020002,
or final-stack validation blockers.

### Common Mainline

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | evidence-only until pushed/fetched/audited |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active split row; old aggregate PR5 is prior art |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active split row |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active split row |
| PR 5D | Clean semicolonless/entity-validation after PR 5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail `PR05D` |
| PR 6 | Grouped save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified content; fresh i29 audit must confirm grouped filing source |
| PR 6E | Malformed outgoing RTC save sidecar from PR06 | No verified branch link yet | TBD | TBD | sidecar must hang from PR06, not PR07 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified content; runtime ownership still setup-only |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified content; rerun owner matrix only after readiness is true |
| PR 7C | Reload record snapshots sidecar after PR7B | No verified branch link yet | TBD | TBD | held; no raw PR07D without first-divergence evidence |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06 | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; i29 audit must prove PR06 ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11 | Grouped explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | verified content; grouped by latest synthesis |
| PR 12 | Grouped previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified content; grouped by latest synthesis |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active split row; repaired PR13C is fallback/supporting evidence only |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active split row; repaired PR13B is aggregate fallback/supporting evidence only |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active split row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active split row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before grouped PR15 |
| PR 15 | Grouped fallback group move/insert/delete after PR14B | No verified branch link yet | TBD | TBD | latest synthesis groups PR15; audit only has older PR15A-C prior-art links |

### Held Sidecars, Fallbacks, And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not substitute for active grouped PR06 without i29 audit mapping |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 13B repaired fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired verified fallback until PR13B0-B3 have verified links |
| PR 13C repaired fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired verified fallback and supporting evidence |
| PR15A prior art | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified prior art only; active recommendation is grouped PR15 after PR14B |
| PR15B prior art | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified prior art only; active recommendation is grouped PR15 after PR14B |
| PR15C prior art | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified prior art only; active recommendation is grouped PR15 after PR14B |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T22:57:54Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T222443Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The current novelty/control-plane snapshot was updated at
`2026-05-17T22:56:29.708Z`:

```text
coverage files: 48118
total records seen: 74589
records processed this pass: 3
coverage lines seen this pass: 76949
new behavioral feature keys this pass: 1
new CDP coverage hashes this pass: 1
current-run records by profile:
  real-user-editing=9
current-run successful records:
  real-user-editing=4
all-time records by transport:
  ws=71185
  http=3404
active current-run triage signatures: 0
active current-run raw signatures: 5
active current-run product-evidence signatures: 0
active current-run likely-real visible: 0
current-drain triage signatures: 1
current-drain raw signatures: 15
current-drain product-evidence signatures: 1
current-drain likely-real visible: 0
suppressed strict startup records in drain scope: 11
unmet goals: 5
quality issues: 0
health: ok
enabled group:
  novelty-ws-real-user-rich-text
paused groups:
  novelty-ws-parser-transform
  novelty-ws-lifecycle
  novelty-ws-real-user-save-reload
  novelty-http-persistence-probe
  novelty-ws-real-user-editing
```

This is current fuzz/control-plane health, not final-stack validation and not a
no-bugs claim. Active current-run triage is clean at this pass; drain scope
still has one product-evidence signature and suppressed no-product startup
noise. Startup-noise holds are scheduling evidence, not product failures.

Coverage guidance still has five unmet auto-ratchet goals:

```text
reload-post-action: 1076/2000
title-save-reload: 532/1000
body-save-reload: 591/1000
real-user-editing success: 600/1000
ui-format-paragraph: 1695/2000
```

The latest trend packet was generated at `2026-05-17T22:53:15Z` from monitor
data through `2026-05-17T22:49:21Z`:

```text
monitor passes: 2137
coverage files: 272 -> 48107
coverage files delta: 47835
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3458
summary startup failures last: 0
quality issues last: 0
memory free: 424 GB
load averages: 43.12 / 59.66 / 62.82 on 64 cores
latest fuzz level mix:
  browser-e2e=29 lanes/26 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5379785
browser-e2e likely-real findings: 622 over 1962.6 runner-hours
latest suggested PR net LOC total: 1828
```

The novelty snapshot supersedes the trend packet for current enabled/paused
groups. The trend packet remains evidence for load, coverage growth, and fuzz
level effectiveness. Browser E2E remains the only level with confirmed
likely-real findings, but the lower-level lanes are under-triaged and should
not be declared useless from zero likely-real output.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T224751Z-synthesis.md`. It confirms:

- The Cycle310 iteration-27 microhead split should be replaced by the
  `fresh-prset/iteration-29/*` grouped topology above, pending a fresh
  audit/manifest.
- Group `PR06`, `PR11`, `PR12`, and `PR15`; keep `PR05A-D` and
  `PR13B0-B3` split.
- `PR09+` must fork from `PR06`, not serialize behind PR07.
- Clean `PR05D` means only
  `27c6e7924217038ed9b4ff71585e8041c67765a4`; any `PR05D` based on
  `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or another
  fallback/PR15 tail is invalid.
- Cycle293/Cycle306/local-publish rows, raw `PR07D`, `PR17`, `PR18`, and
  `PR18x` are rejected as active filing sources.
- `deferred/rtc-reload-hydration-20260517T223235Z` / `4eaf5d621b4` is a held
  PR07D candidate only.
- Filing, broad final-stack fuzzing, and stack-wide validation remain blocked
  by seed `1020002`, PR07 runtime ownership, stale or zero-byte publication
  evidence, and lack of a fresh i29 audit/manifest.

The newest split feedback action available in the collected inputs is
`pr-split-20260517T223220Z-feedback-action.md`. It completed the Cycle310
split-drift audit and produced `41` manifest rows, newer than that pass's
deferred queue and latest fresh split, with `0` hard failures,
`0` head/bundle/manifest failures, and iteration-28 grouped heads matching the
terminal iteration-27 microhead SHAs. That is useful prior evidence, but it is
superseded by the later i29 grouped recommendation and is not a fresh i29
manifest.

The newest duplicate/noise synthesis is
`duplicate-noise-20260517T224618Z-synthesis.md`. It says the producer-side
strict `pre_action_bootstrap_stall` path is mostly controlled: active-current
triage is clean, strict no-product startup records are suppressed before
expensive analysis, and noisy producers are paused with `no-analysis.json`
while preserving product evidence. The remaining consensus root cause is a
consumer-scope leak: paused/no-analysis drain dirs can still be treated by
live-analysis as partly live and can start or retain analysis work for stale
startup-noise groups or preserved product-evidence siblings.

The latest duplicate/noise feedback-action file collected for that timestamp is
empty, so there is no completed 22:46Z action evidence to claim here. The next
safe action is narrow: split active launch scope from drain scope in
`bin/rtc-browser-fuzz-live-analysis-monitor.mjs`, stop analysis sessions
attached to startup-noise/no-analysis drain dirs when they are no longer
active, keep drain dirs for gate-only triage/cleanup/dedupe, and patch
`bin/rtc-browser-fuzz-supervisor.mjs` only if inspection confirms stale
startup-drain state survives pause expiry.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, old enabled-group claims, and "do not add
PR06B" recommendations are superseded by the repaired PR13 audit links, the i29
grouped split recommendation, the PR07 runtime-gated lane, and later
duplicate/noise evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i29 split audit | `fresh-prset/iteration-29/*` grouped topology | active working target, but not audited as a filing manifest | Run bounded fresh audit/manifest newer than `latest-fresh-pr-set.md` and the deferred queue/reports through the reload candidate at `2026-05-17T22:48:23Z` |
| Required i29 artifacts | `push-manifest.tsv`, `manifest-age.tsv`, `base-allowlist.tsv`, `head-bundle-manifest-check.tsv`, `branch-graph.txt`, adjacent diffstat/numstat, patch-id or range-diff, deferred-output audit, artifact verification | missing for the new i29 recommendation | Produce nonempty allowlisted artifacts; reject zero-byte or stale reports |
| Missing verified product refs | PR02A, PR05A-D, PR06E, PR07C, PR13B0-B3, PR14B, grouped PR15 | rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A, PR07B, held PR07C; seeds `5200011`, `5200015`, `5200017`, `5200010`, `5200008`, `7110004`, `7110017`, `1100001`, and `1100002` | setup-only because collaboration readiness was null; `/` was reported at about `2266 MB` free, just above the `2048 MB` threshold | Run PR07 readiness/root-cause repair before Docker replay, then rerun owner matrix with REST/meta/Y.Doc/provider/awareness/block-tree first-divergence snapshots |
| PR07D | reload/post-save/rejoin residuals | absent; raw PR07D is not justified | Add only after fresh PR07 replay proves red-at-active-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet | Publish/fetch/audit clean PR05D; keep fallback-tail `PR05D` rejected |
| PR06E malformed-save sidecar | outgoing RTC save request-payload guard | useful only as a PR06 sidecar | Publish/fetch/audit explicit sidecar and prove `PR07` is not in its ancestry |
| PR09 placement | PR09 through PR15 | independent CRDT/data-loss lane must fork from PR06, not PR07 | Prove `PR06 -> PR09` and `PR07 !-> PR09/PR15` in filing refs |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; PR13B/C repaired links are fallback/supporting evidence | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / grouped PR15 | table query-array suffix and fallback-group rows after PR14B | active topology lacks verified current PR14B and grouped PR15 links | Publish/fetch/audit explicit PR14B-based product refs |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | previous comparison kept residual suffix cases on the PR05 path and assigned no `PR18x` owner | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix | active sessions are not progress by themselves | Count only nonempty durable reports/artifacts or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise live-analysis leak | `duplicate-noise-20260517T224618Z-synthesis.md` | producer-side strict startup path is mostly controlled; remaining leak is live-analysis/drain scope | Patch launch scope, validate with `node --check` and one monitor `--once` pass, restart only affected control-plane sessions |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file `ready/*`, Cycle293, Cycle306,
Cycle308, Cycle310, validation-stack, dirty evidence, fallback-tail branches,
or zero-byte/stale finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the i29 grouped topology as the current working target.
2. Produce a fresh i29 audit/manifest with nonempty durable artifacts newer
   than the latest fresh split and deferred queue.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Prove `PR06 -> PR06E`, `PR07 !-> PR06E`, `PR06 -> PR09`,
   `PR07 !-> PR09/PR15`, clean `PR05D` only, and no fallback-tail `PR05D`.
5. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
6. Keep old aggregate PR5, broad PR8, dirty evidence branches, stale/misordered
   PR13 refs, old pre-PR14B PR15 refs, and the untracked reload-hydration gate
   spec out of filing branches and push allow-lists.
7. Prove runtime readiness and rerun the PR07A/PR07B/held-PR07C owner matrix
   before any PR07D decision.
8. Patch/enforce the progress gate so active sessions, active/terminal
   `1020002`, zero-byte artifacts, `report.tmp`, stale manifests,
   disk/runtime-preflight-only reports, setup-only PR07 matrices, and stderr
   growth are not counted as durable progress while actionable rows exist.
9. Apply the duplicate/noise live-analysis scope fix narrowly: active
   supervisor dirs should be the only analysis-launch scope, while
   no-analysis/startup-noise drain dirs remain available for gate-only
   triage/cleanup/dedupe without suppressing product-evidence signatures.
10. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.
11. Treat novelty, trend, and duplicate/noise reports as fuzz/control-plane
    health and triage evidence. They are not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

The next useful work is a bounded i29 audit/deferred refresh, then targeted
PR07 readiness and owner replay after the audit and readiness pass. Do not
launch broad final-stack fuzz, a duplicate seed `1020002` job, raw `PR07D`,
`PR17`, or `PR18x`.
