# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T00:35:54Z`

Trigger event:
`pr-split-2026-05-18T00-34-23Z-20260518T002449Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T00-34-23Z-20260518T002449Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis is
`pr-split-20260518T002449Z-synthesis.md`. It keeps the Cycle 316/i36 topology,
but says the active filing target has advanced again: use the latest
`fresh-prset` alias, currently `fresh-prset/iteration-39/*`, not the older i36
or i38 manifests. Do not file GitHub PRs or claim final-stack validation until
the selected latest-fresh audit/manifest is newer than both
`latest-fresh-pr-set.md` and the current deferred queue, with base allowlist and
head/bundle/manifest checks passing. Zero-byte artifacts remain no evidence.

Current replacement target:

```text
Common mainline:
PR01 -> PR02 (+ PR02A)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> grouped PR06
(+ PR06E sidecar from PR06)

Runtime-gated lane from PR06:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1
(hold PR07B2 and PR07C until owner replay proves distinct product deltas)

Independent CRDT/data-loss lane from PR06:
PR09 -> PR10 -> grouped PR11 -> grouped PR12
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> grouped PR15
```

Active status changes since the prior report:

- Replace i36 and i38 as active filing targets with the latest fresh
  iteration-39 alias. i36 remains useful provenance because its completed audit
  proved topology checks for the same shape, but it is no longer current enough
  to file from.
- Keep grouped PR06, PR11, PR12, and PR15 as the current maintainer-facing
  shape, with adjacent diffstat and patch-id evidence preserved so maintainers
  can require a smaller split without losing provenance.
- Keep PR07B2 and PR07C held. PR07 owner replay still has to prove
  `collaborationEnabled=true` and compare PR07B0, PR07B1, HOLD-07B2, and
  HOLD-07C with REST/meta, Y.Doc, provider, awareness, and block-tree
  first-divergence snapshots before either held row can be promoted.
- Reject raw PR07D, PR17, PR18/PR18x, stale local publish manifests,
  `ready/*`, raw `candidate/*`, raw `deferred/*`, Cycle293/Cycle306/local
  publish rows, and fallback-tail PR05D.
- Clean PR05D is only `27c6e7924217038ed9b4ff71585e8041c67765a4`. Any PR05D
  based on `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or the
  fallback/PR15 tail is invalid.

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- The latest-fresh/i39 target needs a fresh non-Docker audit/manifest newer
  than the current fresh split and deferred queue. The completed Cycle 316 i36
  audit is provenance only for the current target.
- Rows that still say `No verified branch link yet` need explicit product refs
  published, fetched, and audited before filing.
- PR07 runtime ownership remains product-evidence blocked. Prior owner-matrix
  rows were setup-only or readiness-blocked; they do not justify PR07B2,
  PR07C, or raw PR07D filing.
- Seed `1020002` blocks final-stack fuzz, GitHub filing, and rebuilt
  stack-wide validation only. It must not block branch audit, manifest
  generation, PR07 readiness repair, deferred promotion/downscope, PR02A, PR5,
  PR11 grouping evidence, or loop repair.
- Stale, zero-byte, `report.tmp`, wrong-base, setup-only,
  runtime-preflight-only, disk-preflight-only, active-session-only, or
  stale-manifest artifacts are not filing evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-18T00:35:49Z`.

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

The branch-link audit was generated at `2026-05-18T00:35:54Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`. A verified
branch link confirms that the linked ref exists and has a non-empty audited
diff; it does not prove latest-fresh/i39 topology, ancestry, owner evidence, or
filing readiness.

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
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row |
| PR 5D | Clean semicolonless/entity-validation after PR 5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail PR05D |
| PR 6 | Grouped save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified aggregate content; active latest-fresh/i39 grouped row still needs fresh audit evidence |
| PR 6E | Malformed outgoing RTC save sidecar from PR06 | No verified branch link yet | TBD | TBD | sidecar must hang from PR06, not PR07 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row; runtime owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row; rerun only after readiness is true |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row; held PR07B2 and PR07C branch from here |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06 | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; latest-fresh/i39 must prove PR06 ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11 | Grouped explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | verified aggregate content; grouping still needs latest-fresh/i39 adjacent diffstat/patch-id evidence |
| PR 12 | Grouped previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified aggregate content; grouping still needs latest-fresh/i39 adjacent diffstat/patch-id evidence |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row; repaired PR13C is supporting fallback evidence |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row; repaired PR13B is supporting fallback evidence |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i39 row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before grouped PR15 |
| PR 15 | Grouped fallback-group operations after PR14B | No verified branch link yet | TBD | TBD | active latest-fresh/i39 grouped row; PR15A-C component links are only supporting prior art until grouped PR15 is audited |

### Held Sidecars, Fallbacks, And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| PR 7B2 | Save response terminal manager/base-record microhead | No verified branch link yet | held until PR07B0/PR07B1/HOLD-07C replay proves a distinct product delta |
| PR 7C | Save response/reload sibling evidence after PR07B1 | No verified branch link yet | held until owner replay proves coverage and distinctness; raw PR07D remains rejected |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not substitute for PR06E or active latest-fresh/i39 PR06 evidence |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-B1 plus held PR07B2 split |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 13B repaired fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired verified fallback until PR13B0-B3 have verified exact links |
| PR 13C repaired fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired verified fallback and supporting evidence |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art, not an audited grouped PR15 link |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art, not an audited grouped PR15 link |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T00:35:49Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T002507Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` collected for this update has a full current pass
for the coverage root. It reports `48502` coverage files, `75174` total
records seen, `4` new behavioral feature keys, and `4` new CDP coverage hashes
this pass. Current active-run triage has `2` actionable/product-evidence
signatures and `0` no-product actionable signatures; visible likely-real
remains `0`. The current drain scope has the same `2` product-evidence
signatures. This is fuzz/control-plane health only; it is not final-stack
validation or filing readiness.

The latest trend packet was generated at `2026-05-18T00:22:53Z` from monitor
data through `2026-05-18T00:16:52Z`:

```text
monitor passes: 2156
coverage files: 272 -> 48441
coverage files delta: 48169
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3454
summary startup failures last: 0
quality issues: 1
memory free: 423.7 GB
load averages: 41.74 / 51.10 / 60.98 on 64 cores
enabled groups current: novelty-ws-parser-serialization, novelty-ws-lifecycle
latest fuzz level mix:
  browser-e2e=27 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5420544
browser-e2e likely-real findings: 640 over 1981.2 runner-hours
latest suggested PR net LOC total: 5411
```

This is fuzz/control-plane health, not final-stack validation and not a
filing-readiness claim. Browser E2E remains the only level with confirmed
likely-real findings, but lower-level lanes are under-triaged and should not be
declared useless from zero likely-real output. Current duplicate share and
current startup-failure indicators are clean in the latest trend snapshot, while
historical duplicate/noise remains material.

Coverage guidance still has five unmet auto-ratchet goals:

```text
reload-post-action: 1082/2000
title-save-reload: 538/1000
body-save-reload: 597/1000
real-user-editing success: 602/1000
ui-format-paragraph: 1738/2000
```

The novelty pass reports headroom for adding groups (`load1: 58.02` on `64`
cores, `412.3G` free memory), but the scheduler still held browser
materialization below the floor because no safe group was available without
overriding max-group budget, disabled state, pause state, current
startup/noise hold, or active noise cooldown. Enabled groups are
`novelty-ws-lifecycle` and `novelty-ws-parser-serialization`; save/reload,
HTTP persistence, real-user editing, parser-transform, and rich-text groups
remain paused/cooldown-gated for startup-noise control. Treat these as current
producer-control signals, not as product validation.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T002449Z-synthesis.md`, says:

- Filing and final-stack fuzzing are still blocked. Use the latest fresh alias,
  currently `fresh-prset/iteration-39/*`, not stale Cycle293/Cycle306/local
  publish rows, not raw i37, not i38, and no longer i36 as the active filing
  target.
- Keep the Cycle 316/i36 topology: common mainline through grouped PR06, runtime-gated
  PR07A1/A2/A3/B0/B1 with PR07B2 and PR07C held, and the independent
  CRDT/data-loss lane from PR06 through grouped PR15.
- Require the selected latest-fresh audit manifest to be newer than
  `latest-fresh-pr-set.md` and the current deferred queue before filing or
  final-stack fuzzing.
- Keep PR07 owner evidence and seed `1020002` as blockers for final-stack fuzz
  and filing only; they must not block audit, manifest, replay, or loop-repair
  work.
- Reject fallback-tail PR05D, `d06e3528cbd`, raw PR07D, PR17, PR18/PR18x,
  stale local publish manifests, old `ready/*`, raw `deferred/*`, and raw
  `candidate/*`.
- Compare PR05B, PR05C, and clean PR05D before assigning any later
  linebreak/parser/rich-text residual owner or naming PR18x.
- The next bounded split job should be
  `rtc-cycle318-latest-fresh-audit-manifest-and-stale-finalization-guard`;
  launch exactly one PR07 owner-readiness matrix only if no durable equivalent
  is active.

The completed Cycle 316 i36 audit/manifest is now provenance for the same
shape, not the active filing manifest. Its artifact directory is:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260517T235308Z/jobs/outputs/rtc-cycle316-i36-audit-manifest-and-stale-finalization-guard/
```

It produced nonzero `report.md`, `push-manifest.tsv`, `manifest-age.tsv`,
`base-allowlist.tsv`, `head-bundle-manifest-check.tsv`, `branch-graph.txt`,
adjacent diffstat and patch-id artifacts, `deferred-output-audit.tsv`,
`latest-fresh-audit.tsv`, `finalization-staleness-audit.tsv`, and
`artifact-verification.tsv`. It records `31` manifest rows, `8` topology
checks passing, `0` hard check failures, and `0` head/bundle/manifest
agreement failures. Its push manifest was refreshed at
`2026-05-18T00:07:47Z`, newer than the fresh split and deferred reports it
covered at the time, but the later latest-fresh/i39 recommendation requires a
replacement audit.

The i36 artifact verifies selected base allowlist ancestry, grouped
`PR06 -> PR06E`, grouped `PR06 -> PR09`, `PR07B1 -> HOLD-07B2`,
`PR07B1 -> HOLD-07C`, `PR07B1 !-> PR09`, `HOLD-07B2 !-> PR09`,
`HOLD-07B2 !-> PR15`, `HOLD-07C !-> HOLD-07B2`, and clean
`PR05D = 27c6e7924217038ed9b4ff71585e8041c67765a4`.

Loop repair from the same action pass is completed progress:
`rtc-pr-split-review-loop.sh` now rejects manifest/audit progress artifacts
older than `latest-fresh-pr-set.md`, and treats `.last-message.tmp`,
active-session-only, setup-only, `collaborationEnabled=null`, and stale
latest-fresh outputs as no progress. `bash -n rtc-pr-split-review-loop.sh`
passed after that patch.

The latest duplicate/noise synthesis,
`duplicate-noise-20260517T235105Z-synthesis.md`, says the remaining
duplicate/noise issue is producer/control-plane steering, not a reason to
suppress product evidence or change the product PR split. Its consensus action
was to enable novelty pause guards, let startup/noise pauses drop below the
browser lane materialization floor when needed, and restart bounded live
analysis so product-evidence timeout signatures are analyzed or capped rather
than hidden.

The matching feedback action,
`duplicate-noise-20260517T235105Z-feedback-action.md`, reports completed
control-plane changes in `bin/rtc-browser-fuzz-novelty-monitor.mjs` and
`bin/rtc-browser-fuzz-supervisor.mjs`, with:

- `node --check bin/rtc-browser-fuzz-novelty-monitor.mjs` passing.
- `node --check bin/rtc-browser-fuzz-supervisor.mjs` passing.
- Coverage-guided novelty/supervisor/watchdog restarted.
- Bounded live analysis restarted for the current root.
- Current root reporting `runLocalNoisePolicyVersion: 22`.
- No strict no-product startup signatures queued after the restart, while one
  product-evidence parser-serialization signature remained visible.

This is control-plane hygiene and triage-health evidence. It is not product
validation, final-stack fuzzing, or filing readiness. The active coverage root
has since rolled to `run-20260518T002507Z`; the latest full novelty pass for
that root has no current visible likely-real signatures, but does have two
actionable product-evidence signatures and no no-product actionable signatures.
Its paused-group/cooldown state should be treated as the current control-plane
status until the next root rollover.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, the latest-fresh/i39 split recommendation, the PR07 hold decision, and
later duplicate/noise evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Latest-fresh split audit | `fresh-prset/iteration-39/*` from the Cycle 316/i36 topology | required and not yet completed in the collected inputs | Run one fresh audit/manifest newer than the latest fresh split and deferred queue before filing or final-stack fuzz |
| i36/i38 split evidence | prior `fresh-prset/iteration-36/*` and `fresh-prset/iteration-38/*` evidence | i36 completed audit has nonzero artifacts and `0` hard failures, but i36/i38 are now provenance only | Do not use old manifests as active filing evidence unless a newer synthesis explicitly rejects i39 |
| Required latest-fresh artifacts | `report.md`, `push-manifest.tsv`, manifest age, base allowlist, head/bundle/manifest agreement, branch graph, adjacent diffstat/numstat, patch-id/range-diff, deferred audit, finalization staleness audit, artifact verification | missing for i39 in the collected inputs | Keep zero-byte, stale, wrong-base, setup-only, and preflight-only artifacts out of filing evidence |
| Missing verified product refs | PR02A, PR05A-D, PR06E, PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C, PR13B0-B3, PR14B, grouped PR15, and any exact latest-fresh/i39 refs not covered by verified audit links | rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C; seeds `5200011`, `5200015`, `5200017`, `5200010`, `5200008`, `7110004`, `7110017`, `1100001`, and `1100002` | prior matrix was setup-only or readiness-blocked; PR07B2 and PR07C remain held | First prove `collaborationEnabled=true`, then rerun owner matrix with REST/meta/Y.Doc/provider/awareness/block-tree first-divergence snapshots |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only after fresh PR07 replay proves red-at-held-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet | Publish/fetch/audit clean PR05D; keep fallback-tail PR05D rejected |
| PR06 grouping and PR06E | grouped PR06 plus malformed-save sidecar | grouped PR06 has verified aggregate prior content; PR06E has no verified link | Prove `PR06 -> PR06E`, `PR07 !-> PR06E`, and preserve adjacent evidence for possible PR06 re-splitting |
| PR09 placement | PR09 through grouped PR15 | latest-fresh/i39 requires lane from PR06, not PR07 | Prove `PR06 -> PR09`, `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15`, and no PR07 serialization |
| PR11 / PR12 grouping | grouped PR11 and grouped PR12 | verified aggregate content exists; latest-fresh/i39 grouping still needs exact audit evidence | Preserve adjacent diffstat and patch-id evidence so maintainers can require microheads without losing provenance |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; PR13B/C repaired links are fallback/supporting evidence | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | table query-array suffix and grouped PR15 after PR14B | PR15A-C have verified component links, but active topology lacks verified grouped PR15 placement proof | Publish/fetch/audit explicit PR14B-based grouped PR15 refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | previous comparison kept residual suffix cases on the PR05 path and assigned no PR18x owner | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix | active sessions are not progress by themselves | Count only nonempty durable reports/artifacts or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise consumer cap | timeout/reload-rejoin current-run families | source-stable terminal family caps remain implemented and validated | Keep product-evidence representatives visible while avoiding duplicate analysis |
| Duplicate/noise producer leak | novelty-monitor startup/noise producer scheduling | latest feedback action patched novelty-monitor/supervisor, restarted novelty/supervisor/watchdog, and restarted bounded live analysis; the current root now has a full current triage pass with no no-product actionable signatures and startup-noise cooldowns still active | If leakage returns after cooldown expiry or the next root rollover, extend the family/profile cooldown narrowly |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, Cycle293, Cycle306, Cycle312, Cycle314, Cycle316, `ready/*`,
validation-stack, dirty evidence, fallback-tail branches, raw
deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale finalization
artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the latest fresh iteration-39 topology as the current working target.
2. Generate a fresh latest-fresh/i39 audit/manifest newer than both the latest
   fresh split and deferred queue, and refresh again if a newer fresh split or
   stale finalization artifact supersedes it before filing.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Prove grouped PR06/PR11/PR12/PR15 are reviewable, with adjacent
   diffstat/numstat and patch-id evidence sufficient to re-split if grouping is
   rejected.
5. Prove `PR06 -> PR06E`, `PR07 !-> PR06E`, `PR06 -> PR09`,
   `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15`, clean PR05D only, grouped
   PR15 after PR14B, and no fallback-tail PR05D.
6. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
7. Keep old aggregate or stale prior art, broad PR8, dirty evidence branches,
   stale/misordered PR13 refs, fallback-tail PR15/PR05D confusion, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
8. Prove runtime readiness and rerun the PR07A/PR07B0/PR07B1/held-PR07B2/
   held-PR07C owner matrix before any PR07B2, PR07C, or PR07D filing decision.
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

The next useful work is the bounded latest-fresh/i39 audit/manifest
(`rtc-cycle318-latest-fresh-audit-manifest-and-stale-finalization-guard`),
plus exactly one PR07 owner replay after root, ports, and `wp-env` are healthy
if no durable equivalent is active. Continue deferred downscope/promotion and
keep the duplicate/noise control-plane fix under the current root cooldown
checks. Do not launch broad final-stack fuzz, a duplicate seed `1020002` job,
raw PR07D, PR17, PR18, or PR18x.
