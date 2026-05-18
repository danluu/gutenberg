# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T01:47:49Z`

Trigger event:
`pr-split-2026-05-18T01-46-37Z-20260518T013352Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T01-46-37Z-20260518T013352Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis is
`pr-split-20260518T013352Z-synthesis.md`. It keeps the Cycle320/i40
three-lane split as the active replacement target. The non-PR07 lanes are
structurally usable, but the stack is still not filing-ready: the latest PR07
owner wrapper reused old Cycle296/Cycle293 replay artifacts, omitted
`HOLD-07B2`, and left all `15` PR07 comparison rows classified as
`runtime-readiness-blocked`. Cycle320 still has a completed local-only i40
manifest/bundle artifact with `32` manifest rows, `0` base/adjacent failures,
`0` head/bundle/manifest agreement failures, and freshness `PASS`; it did not
push to GitHub. Filing and broad final-stack fuzzing remain blocked by PR07
owner evidence plus seed `1020002`. Zero-byte, stale, wrapper-only, setup-only,
wait-only, old-ref, or `runtime-readiness-blocked` artifacts remain no
filing evidence.

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
(hold PR07B2 and PR07C as siblings off PR07B1; no raw PR07D)

Independent CRDT/data-loss lane from PR06:
PR09 -> PR10 -> grouped PR11 -> grouped PR12
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> grouped PR15
```

Active status changes since the prior report:

- Keep iteration 40 as the active split target. The completed Cycle320 local
  publication artifact is current host-publication planning evidence only;
  i36/i38/i39 are older provenance for the same accepted shape.
- Keep grouped PR06, PR11, PR12, and PR15 as the current maintainer-facing
  shape; preserve adjacent diffstat and patch-id evidence in case maintainers
  request a smaller split later.
- Keep PR07B2 and PR07C held. PR07 owner replay still has to prove
  `collaborationEnabled=true` and compare PR07B0, PR07B1, HOLD-07B2, and
  HOLD-07C with REST/meta, Y.Doc, provider, awareness, and block-tree
  first-divergence snapshots before either held row can be promoted.
- Treat the Cycle320 PR07 owner replay wrapper as invalid owner evidence: the
  latest synthesis says it reuses stale Cycle296/Cycle293 replay artifacts,
  omits `HOLD-07B2`, and leaves all `15` rows
  `runtime-readiness-blocked`.
- Reject raw PR07D, PR17, PR18/PR18x, stale local publish manifests,
  `ready/*`, raw `candidate/*`, raw `deferred/*`, Cycle293/Cycle306/local
  publish rows, and fallback-tail PR05D.
- Clean PR05D is only `27c6e7924217038ed9b4ff71585e8041c67765a4`. Any PR05D
  based on `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or the
  fallback/PR15 tail is invalid.
- The latest duplicate/noise synthesis is control-plane-only and made no file
  edits. It identifies a novelty-monitor producer/scheduler leak:
  cross-output-root rotation can let explicit no-product
  `pre_action_bootstrap_stall` producers run again after their current-root
  pause expires. The smallest next fix is a bounded cross-root
  startup-noise cooldown that preserves product-evidence bypasses; this does
  not change the maintainer-facing product PR split.

Hard blockers remain:

- Do not file GitHub PRs, launch broad final-stack fuzz, or claim rebuilt
  stack-wide validation yet.
- The Cycle320/i40 local manifest/bundle is current publication-planning
  evidence, but it is not a GitHub push and it does not clear PR07 owner,
  seed-`1020002`, exact branch-link, or final-stack validation gates. Refresh
  the manifest if newer deferred outputs land before filing.
- Rows that still say `No verified branch link yet` need explicit product refs
  published, fetched, and audited before filing.
- PR07 runtime ownership remains product-evidence blocked. The active
  Cycle320 wrapper is invalid owner evidence because it reuses stale Cycle296 /
  Cycle293 machinery, omits `HOLD-07B2`, and leaves all `15` rows
  `runtime-readiness-blocked`; it does not justify PR07B2, PR07C, or raw PR07D
  filing.
- Seed `1020002` blocks final-stack fuzz, GitHub filing, and rebuilt
  stack-wide validation only. It must not block branch audit, manifest
  generation, PR07 readiness repair, deferred promotion/downscope, PR02A, PR5,
  PR11 grouping evidence, or loop repair.
- Stale, zero-byte, `report.tmp`, wrong-base, setup-only,
  runtime-preflight-only, disk-preflight-only, active-session-only, or
  stale-manifest artifacts are not filing evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-18T01:47:45Z`.

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

The branch-link audit was generated at `2026-05-18T01:47:49Z` from fetched
`danluu` refs. Proposed PR rows below use only audit rows marked
`verified-content`, or explicitly say `No verified branch link yet`. A verified
branch link confirms that the linked ref exists and has a non-empty audited
diff; it does not prove exact i40 publication shape, ancestry, owner evidence,
or filing readiness.

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
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row |
| PR 5D | Clean semicolonless/entity-validation after PR 5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail PR05D |
| PR 6 | Grouped save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | 4 | +738 / -6 | verified aggregate content; Cycle320/i40 local manifest supports grouped shape but exact filing refs still need GitHub audit |
| PR 6E | Malformed outgoing RTC save sidecar from PR06 | No verified branch link yet | TBD | TBD | sidecar must hang from PR06, not PR07 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row; runtime owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row; rerun only after readiness is true |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row; held PR07B2 and PR07C branch from here |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06 | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; latest-fresh/i40 must prove PR06 ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11 | Grouped explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | 2 | +1145 / -4 | verified aggregate content; Cycle320/i40 keeps grouping, preserve adjacent diffstat/patch-id evidence |
| PR 12 | Grouped previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | 2 | +1391 / -5 | verified aggregate content; Cycle320/i40 keeps grouping, preserve adjacent diffstat/patch-id evidence |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row; repaired PR13C is supporting fallback evidence |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row; repaired PR13B is supporting fallback evidence |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active latest-fresh/i40 row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before grouped PR15 |
| PR 15 | Grouped fallback-group operations after PR14B | No verified branch link yet | TBD | TBD | active latest-fresh/i40 grouped row; PR15A-C component links are only supporting prior art until grouped PR15 is audited |

### Held Sidecars, Fallbacks, And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| PR 7B2 | Save response terminal manager/base-record microhead | No verified branch link yet | held until PR07B0/PR07B1/HOLD-07C replay proves a distinct product delta |
| PR 7C | Save response/reload sibling evidence after PR07B1 | No verified branch link yet | held until owner replay proves coverage and distinctness; raw PR07D remains rejected |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not substitute for PR06E or active latest-fresh/i40 PR06 evidence |
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
collected_at_utc: 2026-05-18T01:47:45Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T013540Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw `novelty-status.md` collected for this update was written at
`2026-05-18T01:47:10.504Z` for `run-20260518T013540Z`. It is startup status
only: the monitor has started, but the first full coverage pass for this output
root has not completed. It is not final-stack validation and not a
filing-readiness claim.

Current novelty numbers:

```text
status: monitor started; full coverage pass pending
observed roots: 371
previous records loaded: 75801
supervisor groups file: 2
active run dirs: 2
coverage guidance: pending until first pass
triage yield: pending until first pass
health: startup status only; full novelty pass has not completed yet
```

Because the latest novelty file is startup-only, use the graph-derived trend
packet only as background health evidence. Do not substitute it for a completed
current-root novelty pass or final-stack validation.

The latest trend packet was generated at `2026-05-18T01:31:57Z` from monitor
data through `2026-05-18T01:28:13Z`, before the newest startup-only novelty
root:

```text
monitor passes: 2171
coverage files: 272 -> 48768
coverage files delta: 48496
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3451
summary startup failures last: 0
quality issues: 1
memory free: 423.2 GB
load averages: 43.29 / 50.59 / 57.01 on 64 cores
enabled groups current in trend snapshot: novelty-ws-real-user-rich-text, novelty-ws-real-user-save-reload
largest unmet goals:
  reload-post-action: 1084/2000
  title-save-reload: 540/1000
  body-save-reload: 599/1000
  real-user-editing success: 602/1000
  ui-format-paragraph: 1770/2000
latest fuzz level mix:
  browser-e2e=31 lanes/27 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5456330
browser-e2e likely-real findings: 651 over 1996.8 runner-hours
latest suggested PR net LOC total: 5411
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. Browser/E2E still dominates capacity, so top-offs
should be guarded by startup-stall, supervisor-state, and materialization
checks instead of simply adding browser concurrency.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T013352Z-synthesis.md`, says:

- Filing and broad final-stack fuzzing remain blocked.
- Use the finalized Cycle320/i40 shape as the active replacement split.
- Keep grouped PR06, PR11, PR12, and PR15; the current blocker is PR07 owner
  evidence, not a structural redesign.
- Treat PR07 owner evidence as missing/invalid. The latest wrapper reused old
  Cycle296/Cycle293 replay artifacts, omitted `HOLD-07B2`, and left all `15`
  rows classified as `runtime-readiness-blocked`.
- Replace PR07 owner replay with a corrected i40 replay that proves
  `collaborationEnabled=true` and captures REST/meta, `_crdt_document`, edited
  record, Y.Doc, provider, awareness, and block-tree first-divergence snapshots
  for `PR07B0`, `PR07B1`, `HOLD-07B2`, and `HOLD-07C`.
- Complete seed `1020002` repair/classification, but only as a blocker for
  final-stack fuzz, filing, and rebuilt stack-wide validation.
- Refresh i40 deferred/manifest evidence when newer deferred outputs land.
- Compare rich-text suffix ownership against PR05B, PR05C, and clean PR05D
  before assigning PR18x-style ownership.
- Run PR03 versus held PR03B browser revision-restore comparison before
  promoting stale-newer-checkpoint work.
- Keep stale Cycle293/Cycle306/local-publish rows, fallback-tail PR05D, raw
  PR07D, PR17, PR18, PR18x, and strict-expansion/rich-text reductions without
  PR05 comparison out of filing.
- Enforce the progress gate so zero-byte reports/logs, wrapper-only reports,
  `report.tmp`, old Cycle293/Cycle296 refs, stale manifests, stale script
  reuse, disk-preflight-only output, active-session-only status, and
  `runtime-readiness-blocked` rows with marker divergence count as no progress.

The matching `pr-split-20260518T005351Z-feedback-action.md` and raw
`current-pr-split.md` record completed Cycle320 i40 local publication evidence.
The artifact directory is:

```text
/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260518T005351Z/jobs/outputs/rtc-cycle320-i40-local-push-manifest-and-bundle-guard/
```

It produced nonzero `report.md`, `push-manifest.tsv`,
`rtc-cycle320-i40-finalized-refs.bundle`, `manifest-age.tsv`,
`base-allowlist.tsv`, `head-bundle-manifest-check.tsv`, `branch-graph.txt`,
adjacent diffstat/patch-id artifacts, `latest-fresh-audit.tsv`,
`finalization-staleness-audit.tsv`, and `artifact-verification.tsv`. It records
`32` manifest rows, `0` base/adjacent failures, `0`
head/bundle/manifest agreement failures, and freshness `PASS`; the manifest is
newer than `latest-fresh-pr-set.md`, the current deferred queue/status, and the
Cycle320 i40 finalization report. It did not push to GitHub.

The same action launched `rtc-cycle320-pr07-owner-replay-with-snapshots`, but
the latest synthesis invalidates that replay as owner evidence because the
wrapper used stale Cycle296/Cycle293 artifacts and omitted `HOLD-07B2`. Treat
it as no PR07 progress unless a later corrected i40 replay produces durable
first-divergence artifacts.

The latest duplicate/noise synthesis,
`duplicate-noise-20260518T012323Z-synthesis.md`, made no file edits and
identifies a producer/scheduler leak in
`bin/rtc-browser-fuzz-novelty-monitor.mjs`: explicit no-product
`startup-noise` pauses for `pre_action_bootstrap_stall` are scoped to the
current output root, so output-root rotation can re-enable known no-product
producers until they are rediscovered. The smallest safe next pass is to reuse
unexpired, explicit, no-product startup-noise cooldowns across output roots as
producer scheduling cooldowns only, with `originOutputDir` metadata and
product-evidence bypasses preserved. Do not turn historical duplicate share
into global signature suppression. Secondary aggregate-hold, materialization
backfill, stale live-analysis cleanup, and threshold changes remain follow-up
work unless validation still shows `pre_action_bootstrap_stall` returning.
This does not change the product PR split.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, the Cycle320/i40 split recommendation, the PR07 invalid-owner-evidence
decision, the latest startup-only novelty status, and later duplicate/noise
evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Cycle320/i40 local publication | `fresh-prset/iteration-40/*` and finalized local aliases under `finalized/cycle320-i40/*` | completed local-only manifest/bundle has `32` rows, `0` base/adjacent failures, `0` head/bundle/manifest failures, and freshness `PASS`; no GitHub push | Publish/fetch/audit explicit GitHub refs before filing; refresh if newer deferred outputs land |
| i36/i38/i39 split evidence | prior `fresh-prset/iteration-36/*`, `fresh-prset/iteration-38/*`, and audited `fresh-prset/iteration-39/*` evidence | provenance only for the same accepted topology | Do not use old manifests as active filing evidence unless a newer synthesis explicitly rejects i40 |
| Required latest-fresh artifacts | `report.md`, `push-manifest.tsv`, bundle, manifest age, base allowlist, head/bundle/manifest agreement, branch graph, adjacent diffstat/numstat, patch-id/range-diff, finalization staleness audit, artifact verification | present for the local Cycle320/i40 artifact; still not a GitHub branch audit for every row | Keep zero-byte, stale, wrong-base, setup-only, wrapper-only, wait-only, and preflight-only artifacts out of filing evidence |
| Missing verified product refs | PR02A, PR05A-D, PR06E, PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C, PR13B0-B3, PR14B, grouped PR15, and any exact latest-fresh/i40 refs not covered by verified audit links | rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, held PR07B2, held PR07C; seeds `5200011`, `5200015`, `5200017`, `5200010`, `5200008`, `7110004`, `7110017`, `1100001`, and `1100002` | Cycle320 wrapper is invalid owner evidence because it reuses Cycle296/Cycle293 machinery, omits `HOLD-07B2`, and leaves all `15` rows `runtime-readiness-blocked`; PR07B2 and PR07C remain held | Run corrected i40 replay with `collaborationEnabled=true`, REST/meta, `_crdt_document`, edited record, Y.Doc/provider/awareness, and block-tree first-divergence snapshots |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only after fresh PR07 replay proves red-at-held-PR07C non-coverage |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet | Publish/fetch/audit clean PR05D; keep fallback-tail PR05D rejected |
| PR06 grouping and PR06E | grouped PR06 plus malformed-save sidecar | grouped PR06 has verified aggregate prior content; PR06E has no verified link | Prove `PR06 -> PR06E`, `PR07 !-> PR06E`, and preserve adjacent evidence for possible PR06 re-splitting |
| PR09 placement | PR09 through grouped PR15 | latest-fresh/i40 requires lane from PR06, not PR07 | Prove `PR06 -> PR09`, `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15`, and no PR07 serialization |
| PR11 / PR12 grouping | grouped PR11 and grouped PR12 | verified aggregate content exists; Cycle320/i40 keeps grouping | Preserve adjacent diffstat and patch-id evidence so maintainers can require microheads without losing provenance |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; PR13B/C repaired links are fallback/supporting evidence | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | table query-array suffix and grouped PR15 after PR14B | PR15A-C have verified component links, but active topology lacks verified grouped PR15 placement proof | Publish/fetch/audit explicit PR14B-based grouped PR15 refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| PR05B/PR05C/PR05D owner comparison | parser/rich-text/linebreak/suffix residuals | previous comparison kept residual suffix cases on the PR05 path and assigned no PR18x owner | Keep future residuals on this comparison path unless fresh evidence disproves earlier ownership |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Revisit only after refreshed stack validation produces newer product evidence |
| Active deferred sessions | reload-hydration, pre-save search/live-collapse, rich-text suffix | active sessions are not progress by themselves | Count only nonempty durable reports/artifacts or a clear downscope/promotion decision |
| Reload hydration, rich-text suffix, malformed-save residuals, HTTP room isolation | diagnostic/deferred families | evidence-only unless a focused owner replay proves otherwise | Keep out of PR rows until branch, owner, and fuzz evidence are refreshed |
| Duplicate/noise consumer cap | timeout/reload-rejoin current-run families | source-stable terminal family caps remain implemented and validated | Keep product-evidence representatives visible while avoiding duplicate analysis |
| Duplicate/noise producer leak | cross-output-root startup-noise scheduling | latest synthesis says explicit no-product `pre_action_bootstrap_stall` pauses are current-root-local, so root rotation can re-enable known no-product producers | Reuse unexpired explicit no-product startup-noise cooldowns across output roots as producer scheduling cooldowns only, preserving product-evidence bypasses |
| Current fuzz validation | `run-20260518T013540Z` | startup-only novelty status; full coverage pass pending; no final-stack validation | Use only after the current root completes a full novelty pass and refreshed stack product evidence materializes |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, Cycle312,
Cycle314, Cycle316, Cycle318, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, PR17, PR18, PR18x, or
zero-byte/stale finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the finalized Cycle320/i40 topology as the current working target.
2. Treat the completed Cycle320 local manifest/bundle as host-publication
   planning evidence only. Refresh it if newer deferred outputs land, and do
   not treat it as a GitHub push.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Replace the invalid PR07 owner replay with a corrected i40 replay that
   includes `HOLD-07B2` and proves `collaborationEnabled=true`.
5. Prove grouped PR06/PR11/PR12/PR15 are reviewable, with adjacent
   diffstat/numstat and patch-id evidence sufficient to re-split if grouping is
   rejected.
6. Prove `PR06 -> PR06E`, `PR07 !-> PR06E`, `PR06 -> PR09`,
   `PR07B1 !-> PR09`, held `PR07B2 !-> PR09/PR15`, clean PR05D only, grouped
   PR15 after PR14B, and no fallback-tail PR05D.
7. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
8. Keep old aggregate or stale prior art, broad PR8, dirty evidence branches,
   stale/misordered PR13 refs, fallback-tail PR15/PR05D confusion, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
9. Prove runtime readiness and rerun the PR07A/PR07B0/PR07B1/held-PR07B2/
   held-PR07C owner matrix before any PR07B2, PR07C, or PR07D filing decision.
10. Patch/enforce the progress gate so active sessions, active/terminal
   `1020002`, zero-byte artifacts, `report.tmp`, stale manifests, old
   Cycle293/Cycle296 refs, stale-wrapper replays, disk/runtime-preflight-only
   reports, setup-only PR07 matrices, `runtime-readiness-blocked` rows, and
   stderr growth are not counted as durable progress while actionable rows
   exist.
11. Treat duplicate/noise fixes as control-plane hygiene only. They should keep
    product-evidence signatures visible while avoiding duplicate analysis or
    noisy producer launches; they are not product validation or final-stack
    fuzzing. Reuse only explicit no-product startup-noise cooldowns across
    output roots, and keep product-evidence bypasses intact.
12. Run focused checks, touched-file lint, branch graph/containment evidence,
    adjacent range-diffs/diffstats/numstats, `git diff --check`, and feasible
    runtime checks on refreshed audited refs.
13. Treat novelty, trend, and duplicate/noise reports as fuzz/control-plane
    health and triage evidence. They are not final-stack validation, a
    validated final-stack pass or failure, or filing readiness.

The next useful bounded jobs are the corrected i40 PR07 owner replay
(`rtc-cycle322-i40-pr07-owner-replay-with-snapshots-fixed`), the i40 deferred
refresh / PR07 owner classifier
(`rtc-cycle322-i40-deferred-refresh-and-pr07-owner-classifier`), the PR03 vs
HOLD-03B browser comparison, and the rich-text suffix PR05B/PR05C/clean-PR05D
owner comparison. In parallel, repair the novelty monitor cross-root
startup-noise cooldown. Do not launch broad final-stack fuzz, a duplicate seed
`1020002` job, raw PR07D, PR17, PR18, or PR18x.
