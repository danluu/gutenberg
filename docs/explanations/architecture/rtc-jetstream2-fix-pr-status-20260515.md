# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T23:40:47Z`

Trigger event:
`duplicate-noise-2026-05-17T23-39-09Z-156`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-17T23-39-09Z-156/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest completed split-persona synthesis,
`pr-split-20260517T232422Z-synthesis.md`, supersedes the previous i32 grouped
recommendation. Four of six reports converge on `fresh-prset/iteration-33/*`,
and the latest fresh split file confirms i33 as the current durable candidate.
Treat Cycle312/i31 and i32 as provenance only, even where i33 aliases the same
i31/i30 object IDs.

Current replacement target:

```text
Common mainline:
PR01 -> PR02 (+ PR02A)
-> PR03 (hold PR03B)
-> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D
(+ PR06E sidecar from PR06D)

Runtime-gated lane:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1 -> PR07B2
(HOLD-07C sibling off PR07B1; no raw PR07D)

Independent CRDT/data-loss lane from PR06D:
PR09 -> PR10
-> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B
-> PR15A -> PR15B -> PR15C
```

Active split changes since the prior report:

- Replace i32 grouped refs with i33 microheads. The i32 grouped refs hide
  independent mechanisms and are no longer the recommended maintainer-facing
  shape.
- Keep PR05A-D, PR06A-D, PR07A1-A3, PR07B0-B2, PR11A-E, PR12A-C,
  PR13B0-B3, PR14/PR14B, and PR15A-C split.
- Keep PR07 runtime-gated. Held PR07C is a sibling off PR07B1; raw PR07D is
  rejected.
- Keep the CRDT/data-loss lane forked from PR06D, not serialized behind PR07.
- Clean PR05D is only `27c6e7924217038ed9b4ff71585e8041c67765a4`; any PR05D
  based on `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or the
  fallback/PR15 tail is invalid.

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- The Cycle 314 i33 non-Docker audit/manifest completed and is the current
  branch-shape evidence, but it does not make the stack filing-ready by itself.
  It produced `42` manifest rows, `7` passing topology checks, `0` hard check
  failures, `0` head/bundle/manifest agreement failures, and `0` i33-vs-i31
  alias failures.
- Rows that still say `No verified branch link yet` need explicit product refs
  published, fetched, and audited before filing.
- PR07 runtime ownership remains product-evidence blocked. Prior PR07 owner
  matrix rows were setup-only or readiness-blocked; they are not product
  coverage and do not justify PR07D.
- Seed `1020002` blocks final-stack fuzz, GitHub filing, and rebuilt
  stack-wide validation only. It must not block branch audit, manifest
  generation, PR07 readiness repair, deferred promotion/downscope, PR02A,
  PR5, PR11 shaping, or loop repair.
- Stale, zero-byte, `report.tmp`, wrong-base, setup-only,
  runtime-preflight-only, disk-preflight-only, or stale-manifest artifacts are
  not filing evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-17T23:40:42Z`.

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

The branch-link audit was generated at `2026-05-17T23:40:47Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`. A verified
branch link confirms that the linked ref exists and has a non-empty audited
diff; it does not prove the i33 topology, ancestry, or final filing readiness.

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
branch-link audit or explicitly says `No verified branch link yet`.

### Common Mainline

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | HTTP room-isolation regression sidecar after PR 2 | No verified branch link yet | TBD | TBD | evidence-only until pushed/fetched/audited |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i33 row |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i33 row |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i33 row |
| PR 5D | Clean semicolonless/entity-validation after PR 5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail PR05D |
| PR 6A | Save request stale-content guard microhead | No verified branch link yet | TBD | TBD | active i33 row; grouped PR6 is prior art only |
| PR 6B | Save request CRDT document/base guard microhead | No verified branch link yet | TBD | TBD | active i33 row |
| PR 6C | Save request skipped/stale block guard microhead | No verified branch link yet | TBD | TBD | active i33 row |
| PR 6D | Save request hydration/base-version terminal microhead | No verified branch link yet | TBD | TBD | active i33 row; CRDT lane forks here |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active i33 row; runtime owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active i33 row; rerun only after readiness is true |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active i33 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active i33 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active i33 row; held PR07C branches from here |
| PR 7B2 | Save response terminal manager/base-record microhead | No verified branch link yet | TBD | TBD | active i33 row |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; Cycle 314 audit proves PR06D ancestry and PR07 non-ancestry for the i33 manifest |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level delete operation | No verified branch link yet | TBD | TBD | active i33 row |
| PR 11B | Explicit-base top-level insert operation | No verified branch link yet | TBD | TBD | active i33 row |
| PR 11C | Explicit-base top-level move/reorder operation | No verified branch link yet | TBD | TBD | active i33 row |
| PR 11D | Explicit-base source/provenance operation | No verified branch link yet | TBD | TBD | active i33 row |
| PR 11E | Explicit-base terminal operation | No verified branch link yet | TBD | TBD | active i33 row |
| PR 12A | Previous-local-cache block delete operation | No verified branch link yet | TBD | TBD | active i33 row |
| PR 12B | Previous-local-cache block reorder operation | No verified branch link yet | TBD | TBD | active i33 row |
| PR 12C | Previous-local-cache delete/reorder terminal operation | No verified branch link yet | TBD | TBD | active i33 row |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active i33 row; repaired PR13C is supporting fallback evidence |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i33 row; repaired PR13B is supporting fallback evidence |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i33 row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i33 row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before PR15A-C |
| PR 15A | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 | +123 / -4 | verified component content; Cycle 314 audit records the active i33 placement |
| PR 15B | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 | +197 / -4 | verified component content; Cycle 314 audit records the active i33 placement |
| PR 15C | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 | +161 / -4 | verified component content; not a clean PR05D substitute |

### Held Sidecars, Fallbacks, And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified prior art, not the active PR06A-D split |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not substitute for active PR06A-D/PR06E without i33 audit mapping |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-B2 split |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified prior art, not the active PR11A-E split |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified prior art, not the active PR12A-C split |
| PR 13B repaired fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired verified fallback until PR13B0-B3 have verified exact links |
| PR 13C repaired fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired verified fallback and supporting evidence |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T23:40:42Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T230103Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The current novelty/control-plane snapshot was updated at
`2026-05-17T23:38:36.870Z`:

```text
coverage files: 48283
total records seen: 74791
records processed this pass: 25
coverage lines seen this pass: 77151
new behavioral feature keys this pass: 2
new CDP coverage hashes this pass: 2
current-run records by group:
  novelty-http-persistence-probe=13
current-run successful records:
  persistence-no-title=1
active current-run triage signatures: 0
active current-run product-evidence signatures: 0
active current-run raw product-evidence signatures: 11
active current-run likely-real visible: 3
current-drain product-evidence signatures: 3
current-drain likely-real visible: 4
current-run no-product raw signatures: 1
suppressed strict startup records: 2
top duplicate family share: 0
current-drain top duplicate family share: 1.0
unmet goals: 5
quality issues: 0
health: ok
enabled groups:
  novelty-ws-real-user-editing
  novelty-http-persistence-probe
paused groups:
  novelty-ws-parser-transform
  novelty-ws-lifecycle
  novelty-ws-real-user-save-reload
```

This is current fuzz/control-plane health, not final-stack validation and not a
filing-readiness claim. The active current-run scope has no actionable
product-evidence signatures after the latest pass, while the current-drain
scope still retains visible product-evidence representatives from paused
no-analysis drain directories. The no-product `pre_action_bootstrap_stall`
family is still visible as suppressed startup/no-product noise and must not be
reported as a product failure.

Coverage guidance still has five unmet auto-ratchet goals:

```text
title-save-reload: 536/1000
reload-post-action: 1080/2000
body-save-reload: 595/1000
real-user-editing success: 601/1000
ui-format-paragraph: 1709/2000
```

The latest trend packet was generated at `2026-05-17T23:32:01Z` from monitor
data through `2026-05-17T23:28:12Z`:

```text
monitor passes: 2146
coverage files: 272 -> 48227
coverage files delta: 47955
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0.8
duplicate_share_historical_last: 0.3456
summary startup failures last: 0
quality issues last: 0
memory free: 419.0 GB
load averages: 74.15 / 73.49 / 66.59 on 64 cores
latest fuzz level mix:
  browser-e2e=28 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5392930
browser-e2e likely-real findings: 628 over 1970.5 runner-hours
latest suggested PR net LOC total: 2621
```

The novelty snapshot supersedes the trend packet for current enabled/paused
groups and likely-real visibility. The trend packet remains evidence for load,
coverage growth, and fuzz level effectiveness. Browser E2E remains the only
level with confirmed likely-real findings, but lower-level lanes are
under-triaged and should not be declared useless from zero likely-real output.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T232422Z-synthesis.md`. It says:

- Adopt `fresh-prset/iteration-33/*` as the active split target.
- Treat Cycle312/i31 as provenance only, even where i33 aliases i31/i30 object
  IDs.
- Reject i32 grouped refs because they hide independent mechanisms.
- Keep PR07 runtime-gated as `PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 ->
  PR07B1 -> PR07B2`, with held PR07C off PR07B1 and no raw PR07D.
- Reject Cycle293/Cycle306, the current stale local publish manifest,
  `ready/*`, `try/rtc-fix-stack-validation`, raw `candidate/*`, raw
  `deferred/*`, fallback-tail PR05D, raw PR07D, PR17, PR18, and PR18x.
- Clean PR05D is only `27c6e7924217038ed9b4ff71585e8041c67765a4`.
- Filing, final-stack fuzz, and rebuilt stack validation remain blocked, but
  independent work remains actionable: consume the completed i33
  audit/manifest, then run PR07 readiness/owner replay after root/ports/wp-env
  are healthy, and continue deferred downscope/promotion work.

The previous `pr-split-20260517T231630Z-synthesis.md` i32 recommendation is
now superseded. The Cycle312 i31 audit/manifest remains prior evidence only:
it produced durable nonzero artifacts and useful alias checks, but it is not
the current filing manifest.

The Cycle 314 action pass completed the bounded i33 audit/manifest and
stale-finalization guard. The artifact directory is:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260517T232422Z/jobs/outputs/rtc-cycle314-current-fresh-audit-manifest-and-stale-finalization-guard/
```

It produced `report.md`, `push-manifest.tsv`, `manifest-age.tsv`,
`base-allowlist.tsv`, `head-bundle-manifest-check.tsv`, `branch-graph.txt`,
`adjacent-diffstat-numstat.tsv`, `adjacent-patch-id.tsv`,
`i33-vs-i31-i32-cycle306-drift.tsv`, `deferred-output-audit.tsv`,
`latest-fresh-audit.tsv`, `finalization-staleness-audit.tsv`, and
`artifact-verification.tsv`. It records `42` manifest rows, `7` passing
topology checks, `0` hard check failures, `0` head/bundle/manifest agreement
failures, and `0` i33-vs-i31 alias failures. The push manifest was refreshed
at `2026-05-17T23:36:59Z`, newer than the deferred queue timestamp
`2026-05-17T23:33:08Z` and the latest fresh split timestamp
`2026-05-17T23:26:18Z`.

The latest duplicate/noise synthesis,
`duplicate-noise-20260517T231501Z-synthesis.md`, says the active leak is not
strict no-product startup suppression. The current gate is tripped by
product-evidence duplicates, mostly `timeout`, with `noProductSignatureCount=0`.
The proposed smallest safe control-plane fix is source-stable, terminal
first-level family caps:

- preserve product-evidence signatures and one representative analysis;
- store or recompute a pre-analysis launch-family key that ignores
  `analysisGate` / `result`;
- count completed/running representatives under that key;
- convert capped active-only product-evidence siblings into `family-capped`
  jobs instead of leaving them queued;
- mirror the same key in the live-analysis monitor.

The matching latest duplicate/noise feedback-action file is durable progress.
It implemented the consumer-side cap in
`bin/rtc-browser-fuzz-analysis-tier.mjs` and
`bin/rtc-browser-fuzz-live-analysis-monitor.mjs`: source-stable launch-family
keys, terminal `family-capped` siblings, and mirrored live-monitor counting.
Validation passed `node --check` on both scripts. The patched active HTTP pass
reported `sourceSignatures=10`, `analysisJobs=10`, `completed=4`, and
`family-capped=6`; after restart, the active HTTP timeout family had no active
first-level analysis/codex process and product-evidence representatives
remained visible. This is control-plane duplicate/noise hygiene, not product
validation, final-stack fuzzing, or PR filing readiness.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, the i33 split recommendation, the PR07 runtime-gated lane, and later
duplicate/noise evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i33 split audit | `fresh-prset/iteration-33/*` | Cycle 314 non-Docker audit/manifest completed with nonempty artifacts and `0` hard failures | Consume this as branch-shape evidence, but refresh if a newer fresh split or deferred queue supersedes it before filing |
| Required i33 artifacts | `report.md`, `push-manifest.tsv`, manifest age, base allowlist, head/bundle/manifest agreement, branch graph, adjacent diffstat/numstat, patch-id/range-diff, deferred audit, finalization staleness audit, artifact verification | present in the Cycle 314 artifact directory | Keep zero-byte, stale, wrong-base, setup-only, and preflight-only artifacts out of filing evidence |
| Missing verified product refs | PR02A, PR05A-D, PR06A-E, PR07A1-A3, PR07B0-B2, held PR07C, PR11A-E, PR12A-C, PR13B0-B3, PR14B | rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B2, held PR07C; seeds `5200011`, `5200015`, `5200017`, `5200010`, `5200008`, `7110004`, `7110017`, `1100001`, and `1100002` | prior matrix was setup-only or readiness-blocked | Run PR07 readiness/root-cause repair before Docker replay, then rerun owner matrix with REST/meta/Y.Doc/provider/awareness/block-tree first-divergence snapshots |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only after fresh PR07 replay proves red-at-held-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet | Publish/fetch/audit clean PR05D; keep fallback-tail PR05D rejected |
| PR06E malformed-save sidecar | outgoing RTC save request-payload guard | useful only as a PR06D sidecar | Publish/fetch/audit explicit sidecar and prove PR07 is not in its ancestry |
| PR09 placement | PR09 through PR15C | Cycle 314 audit proves the active i33 branch-shape requirement: `PR06D -> PR09`, `PR07B1 !-> PR09`, `PR07B2 !-> PR09`, and `PR07B2 !-> PR15C` | Preserve those ancestry checks in filing refs |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; PR13B/C repaired links are fallback/supporting evidence | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | table query-array suffix and PR15A-C after PR14B | PR15A-C have verified component links, but active topology lacks verified PR14B placement proof | Publish/fetch/audit explicit PR14B-based PR15A-C refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | previous comparison kept residual suffix cases on the PR05 path and assigned no PR18x owner | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix | active sessions are not progress by themselves | Count only nonempty durable reports/artifacts or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise product-evidence duplicate leak | timeout/reload-rejoin current-run families | consumer-side source-stable terminal family caps are implemented and validated in the latest feedback-action report | Let normal monitor/reporting passes absorb the control-plane fix; keep product-evidence representatives visible |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, Cycle293, Cycle306,
Cycle312, `ready/*`, validation-stack, dirty evidence, fallback-tail branches,
raw deferred/candidate refs, or zero-byte/stale finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the i33 topology as the current working target.
2. Use the completed Cycle 314 i33 audit/manifest as current branch-shape
   evidence, and refresh it if a newer fresh split, stale finalization artifact,
   or deferred queue supersedes it before filing.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   `PR07 !-> PR09/PR15C`, clean PR05D only, PR15A-C after PR14B, and no
   fallback-tail PR05D.
5. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
6. Keep old aggregate PR5/PR6/PR7/PR11/PR12 prior art, broad PR8, dirty
   evidence branches, stale/misordered PR13 refs, fallback-tail PR15/PR05D
   confusion, and the untracked reload-hydration gate spec out of filing
   branches and push allow-lists.
7. Prove runtime readiness and rerun the PR07A/PR07B/held-PR07C owner matrix
   before any PR07C filing or PR07D decision.
8. Patch/enforce the progress gate so active sessions, active/terminal
   `1020002`, zero-byte artifacts, `report.tmp`, stale manifests,
   disk/runtime-preflight-only reports, setup-only PR07 matrices, and stderr
   growth are not counted as durable progress while actionable rows exist.
9. Treat duplicate/noise fixes as control-plane hygiene only. They should keep
   product-evidence signatures visible while avoiding duplicate analysis
   launches; they are not product validation or final-stack fuzzing.
10. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.
11. Treat novelty, trend, and duplicate/noise reports as fuzz/control-plane
    health and triage evidence. They are not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

The next useful work is targeted PR07 readiness and owner replay after root,
ports, and `wp-env` are healthy, plus continued deferred downscope/promotion
work that produces nonempty durable artifacts. Do not launch broad final-stack
fuzz, a duplicate seed `1020002` job, raw PR07D, PR17, PR18, or PR18x.
