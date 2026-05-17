# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-17T23:53:48Z`

Trigger event:
`pr-split-2026-05-17T23-53-03Z-20260517T234303Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-17T23-53-03Z-20260517T234303Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest completed split-persona synthesis,
`pr-split-20260517T234303Z-synthesis.md`, supersedes i34. The current target is
`fresh-prset/iteration-35/*`, not i31, i32, i33, i34, Cycle293, Cycle306,
Cycle312, `ready/*`, raw `candidate/*`, raw `deferred/*`, the validation stack,
or stale local publish manifests.

Current replacement target:

```text
Common mainline:
PR01 -> PR02 (+ PR02A)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> grouped PR06
(+ PR06E sidecar from PR06)

Runtime-gated lane from PR06:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1 -> PR07B2
(hold PR07C as sibling evidence; no raw PR07D)

Independent CRDT/data-loss lane from PR06:
PR09 -> PR10 -> grouped PR11 -> grouped PR12
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> grouped PR15
```

Active split changes since the prior report:

- Replace i33/i34 with i35 as the active working target.
- Keep PR05A-D, PR07A1-A3, PR07B0-B2, PR13B0-B3, and PR14/PR14B split.
- Use grouped i35 PR06, PR11, PR12, and PR15 for now. Two reports still wanted
  microheads, so the next audit must preserve adjacent diffstat and patch-id
  evidence so those groups can be re-split if review rejects grouping.
- Promote i34 `HOLD-07B2` to explicit runtime-gated `PR07B2`. Keep `PR07C`
  held as sibling evidence and reject raw `PR07D` until a PR07 owner replay
  proves a distinct uncovered delta.
- Keep the CRDT/data-loss lane forked from PR06, not serialized behind PR07.
- Clean PR05D is only `27c6e7924217038ed9b4ff71585e8041c67765a4`; any PR05D
  based on `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or the
  fallback/PR15 tail is invalid.

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- i35 still needs a fresh audit/manifest. The latest completed audit is the
  Cycle 314 i34 artifact, which is now provenance only.
- Rows that still say `No verified branch link yet` need explicit product refs
  published, fetched, and audited before filing.
- PR07 runtime ownership remains product-evidence blocked. Prior owner matrix
  rows were setup-only or readiness-blocked; they do not justify PR07C filing
  or raw PR07D.
- Seed `1020002` blocks final-stack fuzz, GitHub filing, and rebuilt
  stack-wide validation only. It must not block branch audit, manifest
  generation, PR07 readiness repair, deferred promotion/downscope, PR02A, PR5,
  PR11 grouping evidence, or loop repair.
- Stale, zero-byte, `report.tmp`, wrong-base, setup-only,
  runtime-preflight-only, disk-preflight-only, active-session-only, or
  stale-manifest artifacts are not filing evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-17T23:53:43Z`.

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

The branch-link audit was generated at `2026-05-17T23:53:48Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`. A verified
branch link confirms that the linked ref exists and has a non-empty audited
diff; it does not prove i35 topology, ancestry, owner evidence, or filing
readiness.

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
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i35 row |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i35 row |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i35 row |
| PR 5D | Clean semicolonless/entity-validation after PR 5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail PR05D |
| PR 6 | Grouped save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified aggregate content; active i35 grouped row still needs fresh i35 audit evidence |
| PR 6E | Malformed outgoing RTC save sidecar from PR06 | No verified branch link yet | TBD | TBD | sidecar must hang from PR06, not PR07 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active i35 row; runtime owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active i35 row; rerun only after readiness is true |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active i35 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active i35 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active i35 row; held PR07C branches from here |
| PR 7B2 | Save response terminal manager/base-record microhead | No verified branch link yet | TBD | TBD | promoted in i35; still runtime-gated and owner-blocked |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06 | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; i35 must prove PR06 ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11 | Grouped explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | verified aggregate content; grouping still needs i35 adjacent diffstat/patch-id evidence |
| PR 12 | Grouped previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified aggregate content; grouping still needs i35 adjacent diffstat/patch-id evidence |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active i35 row; repaired PR13C is supporting fallback evidence |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i35 row; repaired PR13B is supporting fallback evidence |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i35 row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i35 row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before grouped PR15 |
| PR 15 | Grouped fallback-group operations after PR14B | No verified branch link yet | TBD | TBD | active i35 grouped row; PR15A-C component links are only supporting prior art until grouped PR15 is audited |

### Held Sidecars, Fallbacks, And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not substitute for PR06E or active i35 PR06 evidence |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-B2 split |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 13B repaired fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired verified fallback until PR13B0-B3 have verified exact links |
| PR 13C repaired fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired verified fallback and supporting evidence |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art, not an audited grouped PR15 link |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art, not an audited grouped PR15 link |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-17T23:53:43Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260517T234258Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The current novelty/control-plane snapshot was updated at
`2026-05-17T23:49:42.073Z`:

```text
coverage files: 48336
total records seen: 74848
records processed this pass: 17
coverage lines seen this pass: 77208
new behavioral feature keys this pass: 1
new CDP coverage hashes this pass: 1
current-run records by group:
  novelty-http-persistence-probe=2
current-run successful records:
  persistence-no-title=1
active current-run triage signatures: 1
active current-run product-evidence signatures: 1
active current-run raw product-evidence signatures: 1
active current-run likely-real visible: 0
current-drain product-evidence signatures: 1
current-drain likely-real visible: 0
current-run no-product raw signatures: 0
suppressed strict startup records: 0 active / 2 current-drain
top duplicate family share: 1.0
top semantic family: timeout
unmet goals: 5
quality issues: 0
health: ok
headroom for adding groups: yes
enabled groups:
  novelty-ws-real-user-save-reload
  novelty-http-persistence-probe
paused groups:
  novelty-ws-real-user-editing
  novelty-ws-lifecycle
```

This is current fuzz/control-plane health, not final-stack validation and not a
filing-readiness claim. The active current-run scope currently has one
product-evidence timeout signature and `0` visible likely-real failures. The
current-drain scope still reports two suppressed strict startup records from
paused/no-analysis drain directories; `pre_action_bootstrap_stall` must remain
startup/no-product noise, not a product failure.

Coverage guidance still has five unmet auto-ratchet goals:

```text
title-save-reload: 536/1000
reload-post-action: 1080/2000
body-save-reload: 595/1000
real-user-editing success: 601/1000
ui-format-paragraph: 1712/2000
```

The latest trend packet was generated at `2026-05-17T23:41:55Z` from monitor
data through `2026-05-17T23:38:36Z`:

```text
monitor passes: 2148
coverage files: 272 -> 48283
coverage files delta: 48011
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3455
summary startup failures last: 0
quality issues last: 0
memory free: 424.5 GB
load averages: 67.45 / 67.99 / 67.12 on 64 cores
latest fuzz level mix:
  browser-e2e=28 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5396727
browser-e2e likely-real findings: 633 over 1973.0 runner-hours
latest suggested PR net LOC total: 2621
```

The novelty snapshot supersedes the trend packet for current enabled/paused
groups and likely-real visibility. The trend packet remains evidence for load,
coverage growth, and fuzz level effectiveness. Browser E2E remains the only
level with confirmed likely-real findings, but lower-level lanes are
under-triaged and should not be declared useless from zero likely-real output.

## Status-Persona Analysis

The newest completed split-persona synthesis is
`pr-split-20260517T234303Z-synthesis.md`. It says:

- Adopt `fresh-prset/iteration-35/*` as the active split target.
- Treat i34 as superseded provenance, even though the i34 audit completed.
- Promote `PR07B2` into the runtime-gated lane; keep `PR07C` held and reject
  raw `PR07D` unless a PR07B/PR07C ownership audit proves a distinct delta.
- Use grouped PR06, PR11, PR12, and PR15 for the current maintainer-facing
  split, while preserving adjacent evidence so they can be re-split if needed.
- Reject Cycle293/Cycle306/Cycle312, stale local publish manifests, `ready/*`,
  raw `candidate/*`, raw `deferred/*`, fallback-tail PR05D, PR17, PR18, and
  PR18x.
- Filing, final-stack fuzz, and rebuilt stack validation remain blocked on a
  fresh i35 audit/manifest, PR07 owner replay with `collaborationEnabled=true`,
  and seed `1020002`.

The completed Cycle 314 i34 audit/manifest is now provenance only. Its artifact
directory is:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260517T232422Z/jobs/outputs/rtc-cycle314-i34-audit-manifest-and-stale-finalization-guard/
```

It produced `report.md`, `push-manifest.tsv`, `manifest-age.tsv`,
`base-allowlist.tsv`, `head-bundle-manifest-check.tsv`, `branch-graph.txt`,
`adjacent-diffstat-numstat.tsv`, `adjacent-patch-id.tsv`,
`i34-vs-i32-i33-cycle306-drift.tsv`, `deferred-output-audit.tsv`,
`latest-fresh-audit.tsv`, `finalization-staleness-audit.tsv`, and
`artifact-verification.tsv`. It records `31` manifest rows, `8` topology checks
passing, `0` hard check failures, `0` head/bundle/manifest agreement failures,
and `0` provenance-match failures. The push manifest was refreshed at
`2026-05-17T23:40:59Z`, newer than the i34 fresh split and deferred queue it
covered, but older than the new i35 recommendation.

The latest duplicate/noise synthesis,
`duplicate-noise-20260517T233909Z-synthesis.md`, supersedes the previous
consumer-only duplicate cap as the next control-plane diagnosis. It says the
remaining leak is primarily in the novelty-monitor producer/scheduler, not in
normal triage or analysis consumers. Strict no-product
`pre_action_bootstrap_stall` is mostly blocked from Codex, but producers can be
re-enabled through mixed product-evidence runs, output-root changes, or sibling
real-user groups.

The smallest proposed follow-up is to patch
`bin/rtc-browser-fuzz-novelty-monitor.mjs` so no-product startup holds use the
strict startup threshold even inside mixed product-evidence runs, pause the
producer before the `likelyRealVisible` exception, preserve startup-noise
cooldowns across output-root changes, and add or verify sibling real-user
duplicate-family cooldown behavior. That is control-plane hygiene, not product
validation, final-stack fuzzing, or PR filing readiness.

The previous duplicate/noise feedback action remains completed progress: it
implemented source-stable launch-family keys and terminal `family-capped`
siblings in `bin/rtc-browser-fuzz-analysis-tier.mjs` and
`bin/rtc-browser-fuzz-live-analysis-monitor.mjs`, with `node --check` passing
on both files. Product-evidence representatives were preserved.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, the i35 split recommendation, the PR07 runtime-gated lane, and later
duplicate/noise evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i35 split audit | `fresh-prset/iteration-35/*` | required and not yet completed in the collected inputs | Run one fresh audit/manifest newer than the i35 split and deferred queue before filing or final-stack fuzz |
| i34 split audit | `fresh-prset/iteration-34/*` | completed with nonempty artifacts and `0` hard failures, but now provenance only | Do not use i34 as the active filing manifest unless i35 is explicitly rejected later |
| Required i35 artifacts | `report.md`, `push-manifest.tsv`, manifest age, base allowlist, head/bundle/manifest agreement, branch graph, adjacent diffstat/numstat, patch-id/range-diff, deferred audit, finalization staleness audit, artifact verification | missing for i35 | Keep zero-byte, stale, wrong-base, setup-only, and preflight-only artifacts out of filing evidence |
| Missing verified product refs | PR02A, PR05A-D, PR06E, PR07A1-A3, PR07B0-B2, held PR07C, PR13B0-B3, PR14B, grouped PR15, and any exact i35 refs not covered by verified audit links | rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B2, held PR07C; seeds `5200011`, `5200015`, `5200017`, `5200010`, `5200008`, `7110004`, `7110017`, `1100001`, and `1100002` | prior matrix was setup-only or readiness-blocked; PR07B2 is now an active runtime-gated row | First prove `collaborationEnabled=true`, then rerun owner matrix with REST/meta/Y.Doc/provider/awareness/block-tree first-divergence snapshots |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only after fresh PR07 replay proves red-at-held-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet | Publish/fetch/audit clean PR05D; keep fallback-tail PR05D rejected |
| PR06 grouping and PR06E | grouped PR06 plus malformed-save sidecar | grouped PR06 has verified aggregate prior content; PR06E has no verified link | Prove `PR06 -> PR06E`, `PR07 !-> PR06E`, and preserve adjacent evidence for possible PR06 re-splitting |
| PR09 placement | PR09 through grouped PR15 | i35 requires lane from PR06, not PR07 | Prove `PR06 -> PR09`, `PR07B2 !-> PR09`, `PR07B2 !-> PR15`, and no PR07 serialization |
| PR11 / PR12 grouping | grouped PR11 and grouped PR12 | verified aggregate content exists; i35 grouping still needs exact audit evidence | Preserve adjacent diffstat and patch-id evidence so maintainers can require microheads without losing provenance |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; PR13B/C repaired links are fallback/supporting evidence | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | table query-array suffix and grouped PR15 after PR14B | PR15A-C have verified component links, but active topology lacks verified grouped PR15 placement proof | Publish/fetch/audit explicit PR14B-based grouped PR15 refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | previous comparison kept residual suffix cases on the PR05 path and assigned no PR18x owner | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix | active sessions are not progress by themselves | Count only nonempty durable reports/artifacts or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise consumer cap | timeout/reload-rejoin current-run families | consumer-side source-stable terminal family caps are implemented and validated | Let normal monitor/reporting passes absorb the control-plane fix; keep product-evidence representatives visible |
| Duplicate/noise producer leak | novelty-monitor startup/noise producer scheduling | latest synthesis identifies remaining producer/scheduler leak | Patch novelty monitor narrowly, validate with `node --check`, gate-only triage, live-analysis `--once`, and bounded restart only |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, Cycle293,
Cycle306, Cycle312, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, PR17, PR18, PR18x, or
zero-byte/stale finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the i35 topology as the current working target.
2. Generate a fresh i35 audit/manifest newer than both the latest fresh split
   and deferred queue, and refresh again if a newer fresh split or stale
   finalization artifact supersedes it before filing.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Prove grouped PR06/PR11/PR12/PR15 are reviewable, with adjacent
   diffstat/numstat and patch-id evidence sufficient to re-split if grouping is
   rejected.
5. Prove `PR06 -> PR06E`, `PR07 !-> PR06E`, `PR06 -> PR09`,
   `PR07B2 !-> PR09/PR15`, clean PR05D only, grouped PR15 after PR14B, and no
   fallback-tail PR05D.
6. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
7. Keep old aggregate or stale prior art, broad PR8, dirty evidence branches,
   stale/misordered PR13 refs, fallback-tail PR15/PR05D confusion, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
8. Prove runtime readiness and rerun the PR07A/PR07B/held-PR07C owner matrix
   before any PR07C filing or PR07D decision.
9. Patch/enforce the progress gate so active sessions, active/terminal
   `1020002`, zero-byte artifacts, `report.tmp`, stale manifests,
   disk/runtime-preflight-only reports, setup-only PR07 matrices, and stderr
   growth are not counted as durable progress while actionable rows exist.
10. Treat duplicate/noise fixes as control-plane hygiene only. They should keep
    product-evidence signatures visible while avoiding duplicate analysis or
    noisy producer launches; they are not product validation or final-stack
    fuzzing.
11. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.
12. Treat novelty, trend, and duplicate/noise reports as fuzz/control-plane
    health and triage evidence. They are not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

The next useful work is the bounded i35 audit/manifest and PR07 owner replay
after root, ports, and `wp-env` are healthy, plus continued deferred
downscope/promotion and the narrow novelty-monitor producer fix. Do not launch
broad final-stack fuzz, a duplicate seed `1020002` job, raw PR07D, PR17, PR18,
or PR18x.
