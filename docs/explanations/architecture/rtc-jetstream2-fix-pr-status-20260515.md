# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T23:25:37Z`

Trigger event:
`pr-split-2026-05-17T23-24-17Z-20260517T231630Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T23-24-17Z-20260517T231630Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest completed split-persona synthesis,
`pr-split-20260517T231630Z-synthesis.md`, supersedes the prior i31 microhead
recommendation with a `fresh-prset/iteration-32/*` grouped topology. Treat i32
as the active filing hypothesis, pending a fresh i32 audit. The completed i31
audit remains useful prior evidence, but it is no longer the target to publish.

Current replacement target:

```text
Common:
PR01 -> PR02 (+ PR02A sidecar)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> grouped PR06
(+ PR06E sidecar from grouped PR06)

Runtime-gated:
PR07A -> PR07B
(hold PR07C and PR07D until replay evidence exists)

Independent CRDT/data-loss lane from grouped PR06:
PR09 -> PR10 -> grouped PR11 -> grouped PR12
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> grouped PR15
```

Active split changes since the prior report:

- Replace i31's 43 microheads with i32's 29-ref grouped topology.
- Keep PR05A-D, PR13B0-B3, and PR14/PR14B split.
- Group PR06A-D into PR06, PR11A-E into PR11, PR12A-C into PR12, and PR15A-C
  into PR15.
- Keep PR07 as a runtime-gated lane (`PR07A -> PR07B`) and do not promote raw
  PR07D or held PR07C without product replay evidence.
- Keep the CRDT/data-loss lane forked from grouped PR06, not serialized behind
  PR07.
- Clean PR05D is only `27c6e7924217038ed9b4ff71585e8041c67765a4`; any PR05D
  based on `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or the
  fallback/PR15 tail is invalid.

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- i32 lacks a fresh non-Docker branch audit and manifest. The next bounded job
  should produce i32 `report.md`, `push-manifest.tsv`, `manifest-age.tsv`,
  `base-allowlist.tsv`, `head-bundle-manifest-check.tsv`, `branch-graph.txt`,
  adjacent diffstat/numstat, patch-id or range-diff evidence against prior
  splits, deferred-output audit, finalization-staleness audit, and artifact
  verification.
- Seed `1020002` blocks only final-stack fuzz, GitHub filing, and rebuilt
  stack-wide validation. It must not block branch audit, push-manifest
  generation, deferred promotion/downscope, PR02A/PR5/PR11 shaping, PR07
  readiness repair, or loop repair.
- PR07 runtime ownership remains setup-blocked. Prior PR07 owner matrix rows
  were `setup-only` with `collaborationEnabled=null`; they are not product
  coverage and do not justify PR07D.
- Stale, zero-byte, `report.tmp`, wrong-base, setup-only,
  runtime-preflight-only, disk-preflight-only, or stale-manifest artifacts are
  not filing evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-17T23:25:32Z`.

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

The branch-link audit was generated at `2026-05-17T23:25:37Z` from fetched
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
diff; it does not remove the i32 audit, topology, PR07 runtime, seed-1020002,
or final-stack validation blockers.

### Common Mainline

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | evidence-only until pushed/fetched/audited |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i32 split row |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i32 split row |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i32 split row |
| PR 5D | Clean semicolonless/entity-validation after PR 5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail PR05D |
| PR 6 | Grouped save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified grouped content; i32 audit must confirm this is the grouped PR06 target |
| PR 6E | Malformed outgoing RTC save sidecar from PR06 | No verified branch link yet | TBD | TBD | sidecar must hang from grouped PR06, not PR07 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | 2 | +1339 / -8 | verified grouped content; runtime ownership still setup-blocked |
| PR 7B | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | 5 | +404 / -8 | verified grouped content; rerun owner matrix only after readiness is true |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from grouped PR06 | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; i32 audit must prove grouped PR06 ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11 | Grouped explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | verified grouped content |
| PR 12 | Grouped previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified grouped content |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active i32 row; repaired PR13C is supporting fallback evidence |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i32 row; repaired PR13B is supporting fallback evidence |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i32 row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i32 row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before grouped PR15 |
| PR 15 | Grouped fallback group move/insert/delete after PR14B | No verified branch link yet | TBD | TBD | active i32 grouped row; PR15A-C links below are supporting components only |

### Held Sidecars, Fallbacks, And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not substitute for active grouped PR06/PR06E without i32 audit mapping |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 13B repaired fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired verified fallback until PR13B0-B3 have verified exact links |
| PR 13C repaired fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired verified fallback and supporting evidence |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art, not a grouped PR15 link |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art, not a grouped PR15 link |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art, not a grouped PR15 link and not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T23:25:32Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T230103Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The current novelty/control-plane snapshot was updated at
`2026-05-17T23:22:28.803Z`:

```text
coverage files: 48218
total records seen: 74719
records processed this pass: 22
coverage lines seen this pass: 77079
new behavioral feature keys this pass: 2
new CDP coverage hashes this pass: 2
current-run records by group:
  novelty-http-persistence-probe=7
  novelty-ws-real-user-save-reload=7
current-run successful records:
  persistence-no-title=1
  real-user-editing=1
active current-run triage signatures: 5
active current-run product-evidence signatures: 5
active current-run likely-real visible: 3
current-run no-product raw signatures: 2
suppressed strict startup records: 2
unmet goals: 5
quality issues: 0
health: ok
enabled groups:
  novelty-ws-real-user-save-reload
  novelty-http-persistence-probe
paused groups:
  novelty-ws-parser-transform
  novelty-ws-lifecycle
```

This is current fuzz/control-plane health, not final-stack validation and not a
filing-readiness claim. The active current run now has visible product-evidence
signals (`likely-real visible: 3`) dominated by timeout and reload/rejoin
awareness-stall families. The no-product `pre_action_bootstrap_stall` noise is
still visible as suppressed startup-only evidence and is not being treated as a
product failure.

Coverage guidance still has five unmet auto-ratchet goals:

```text
title-save-reload: 536/1000
reload-post-action: 1080/2000
body-save-reload: 595/1000
real-user-editing success: 601/1000
ui-format-paragraph: 1705/2000
```

The latest trend packet was generated at `2026-05-17T23:16:19Z` from monitor
data through `2026-05-17T23:14:52Z`:

```text
monitor passes: 2143
coverage files: 272 -> 48164
coverage files delta: 47892
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0.75
duplicate_share_historical_last: 0.3453
summary startup failures last: 0
quality issues last: 0
memory free: 418.7 GB
load averages: 75.0 / 61.48 / 56.66 on 64 cores
latest fuzz level mix:
  browser-e2e=28 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5387411
browser-e2e likely-real findings: 626 over 1967.2 runner-hours
latest suggested PR net LOC total: 2621
```

The novelty snapshot supersedes the trend packet for current enabled/paused
groups. The trend packet remains evidence for load, coverage growth, and fuzz
level effectiveness. Browser E2E remains the only level with confirmed
likely-real findings, but lower-level lanes are under-triaged and should not be
declared useless from zero likely-real output.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T231630Z-synthesis.md`. It says:

- Replace i31 with `fresh-prset/iteration-32/*`, pending a fresh i32 audit.
- File grouped PR06, PR11, PR12, and PR15 if i32 audit verifies them.
- Keep PR05A-D, PR13B0-B3, and PR14/PR14B split.
- Keep PR07A/B runtime-gated and keep PR07C/PR07D held until readiness and
  replay evidence exist.
- Reject i31, Cycle293/Cycle306, `ready/*`, raw `candidate/*`, raw
  `deferred/*`, raw PR07D, PR17, PR18/PR18x, and fallback-tail PR05D as active
  filing sources.
- Clean PR05D is only `27c6e7924217038ed9b4ff71585e8041c67765a4`.
- Filing, GitHub push, broad final-stack fuzz, and rebuilt stack-wide
  validation remain blocked. Seed `1020002` blocks only final-stack/final
  filing work, not parallel branch audit, manifest generation, PR07 readiness,
  deferred work, or loop repair.

The newest split feedback action in the collected inputs is
`pr-split-20260517T225642Z-feedback-action.md`. It completed the Cycle312 i31
audit/manifest and produced 42 manifest rows, 0 hard failures, 0
head/bundle/manifest failures, and manifest mtime `2026-05-17T23:15:24Z`,
newer than that pass's deferred queue and latest fresh split. That artifact is
now prior evidence because the later persona synthesis moved the active target
to i32.

The latest duplicate/noise persona file by name,
`duplicate-noise-20260517T231501Z-synthesis.md`, is zero bytes. The latest
nonempty duplicate/noise synthesis is `duplicate-noise-20260517T230540Z` and
classifies the issue as mostly fuzz control-plane drift, not a product failure:
only current actionable source signatures should launch/count analysis; strict
no-product startup holds should remain producer-scoped; product-evidence
signatures must remain visible; and family-cap accounting should not let stale
no-product jobs dominate live analysis.

The matching completed duplicate/noise action from
`duplicate-noise-20260517T224618Z-feedback-action.md` made the narrow
control-plane fix in the remote fuzz repo:

- `bin/rtc-browser-fuzz-live-analysis-monitor.mjs` now separates launch dirs
  from `no-analysis` drain dirs. Drain dirs get gate-only refresh/session
  cleanup, but cannot start or keep live/deep analysis sessions.
- `bin/rtc-browser-fuzz-supervisor.mjs` now clears stale
  `noAnalysisRunDirs`, `startupStallRunDirs`, and no-analysis metadata when a
  `paused-startup-stall` pause expires.
- `node --check` passed for both touched scripts.
- A patched one-shot live monitor showed `no-analysis-drain` as
  `skipped-analysis-gate-only-drain` even with product-evidence actionable
  work.
- Strict no-product pre-action startup queued/running/retry count was `0` in
  both the old root and active current root after restart.

This duplicate/noise fix is control-plane evidence. It improves analysis
launch hygiene, but it is not product validation, final-stack fuzzing, or PR
filing readiness.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, old enabled-group claims, and "do not add
PR06B" recommendations are superseded by the repaired PR13 audit links, the i32
split recommendation, the PR07 runtime-gated lane, and later duplicate/noise
evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i32 split audit | `fresh-prset/iteration-32/*` | active working target, but not audited as a filing manifest | Run bounded fresh i32 audit/manifest newer than latest fresh split, stale finalization artifacts, and deferred queue |
| Required i32 artifacts | `report.md`, `push-manifest.tsv`, `manifest-age.tsv`, `base-allowlist.tsv`, `head-bundle-manifest-check.tsv`, `branch-graph.txt`, adjacent diffstat/numstat, patch-id or range-diff, deferred-output audit, finalization-staleness audit, artifact verification | missing for the new i32 recommendation | Produce nonempty allowlisted artifacts; reject zero-byte or stale reports |
| Missing verified product refs | PR02A, PR05A-D, PR06E, PR07 held sidecars, PR13B0-B3, PR14B, grouped PR15 | rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A, PR07B, held PR07C/PR07D; seeds `5200011`, `5200015`, `5200017`, `5200010`, `5200008`, `7110004`, `7110017`, `1100001`, and `1100002` | prior matrix was setup-only because collaboration readiness was null | Run PR07 readiness/root-cause repair before Docker replay, then rerun owner matrix with REST/meta/Y.Doc/provider/awareness/block-tree first-divergence snapshots |
| PR07D | reload/post-save/rejoin residuals | absent; raw PR07D is not justified | Add only after fresh PR07 replay proves red-at-active-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet | Publish/fetch/audit clean PR05D; keep fallback-tail PR05D rejected |
| PR06E malformed-save sidecar | outgoing RTC save request-payload guard | useful only as a grouped-PR06 sidecar | Publish/fetch/audit explicit sidecar and prove PR07 is not in its ancestry |
| PR09 placement | PR09 through grouped PR15 | independent CRDT/data-loss lane must fork from grouped PR06, not PR07 | Prove `PR06 -> PR09` and `PR07 !-> PR09/PR15` in filing refs |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; PR13B/C repaired links are fallback/supporting evidence | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / grouped PR15 placement | table query-array suffix and grouped fallback-group rows after PR14B | PR15A-C have verified component links, but active topology lacks verified grouped PR15 and current PR14B placement proof | Publish/fetch/audit explicit PR14B-based grouped PR15 ref and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | previous comparison kept residual suffix cases on the PR05 path and assigned no PR18x owner | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix | active sessions are not progress by themselves | Count only nonempty durable reports/artifacts or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise latest zero-byte file | `duplicate-noise-20260517T231501Z-synthesis.md` | zero-byte synthesis; no status change and no durable progress claim | Consume a nonempty synthesis or action report before changing duplicate/noise status |
| Duplicate/noise live-analysis leak | `duplicate-noise-20260517T224618Z-feedback-action.md` | narrow control-plane fix completed; inactive product-evidence drain dirs remain visible but no longer auto-launch analysis | Watch active/current runs or explicit manual analysis selection; do not treat this as product validation |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, Cycle293, Cycle306, Cycle312
i31, `ready/*`, validation-stack, dirty evidence, fallback-tail branches, raw
deferred/candidate refs, or zero-byte/stale finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the i32 topology as the current working target.
2. Produce a fresh i32 audit/manifest with nonempty durable artifacts newer
   than the latest fresh split, stale finalization artifacts, and deferred
   queue.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Prove `PR06 -> PR06E`, `PR07 !-> PR06E`, `PR06 -> PR09`,
   `PR07 !-> PR09/PR15`, clean PR05D only, grouped PR15 after PR14B, and no
   fallback-tail PR05D.
5. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
6. Keep old aggregate PR5, PR6A prior art, broad PR8, PR15A-C component refs,
   dirty evidence branches, stale/misordered PR13 refs, fallback-tail
   PR15/PR05D confusion, and the untracked reload-hydration gate spec out of
   filing branches and push allow-lists.
7. Prove runtime readiness and rerun the PR07A/PR07B/held-sidecar owner matrix
   before any PR07C or PR07D decision.
8. Patch/enforce the progress gate so active sessions, active/terminal
   `1020002`, zero-byte artifacts, `report.tmp`, stale manifests,
   disk/runtime-preflight-only reports, setup-only PR07 matrices, and stderr
   growth are not counted as durable progress while actionable rows exist.
9. Treat the duplicate/noise fix as control-plane hygiene only. It should keep
   active supervisor dirs as the only analysis-launch scope, while
   no-analysis/startup-noise drain dirs remain available for gate-only
   triage/cleanup/dedupe without suppressing product-evidence signatures.
10. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.
11. Treat novelty, trend, and duplicate/noise reports as fuzz/control-plane
    health and triage evidence. They are not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

The next useful work is a bounded i32 audit/manifest and stale-finalization
guard, then targeted PR07 readiness and owner replay after the audit and
readiness pass. Do not launch broad final-stack fuzz, a duplicate seed
`1020002` job, raw PR07D, PR17, PR18, or PR18x.
