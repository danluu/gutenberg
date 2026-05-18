# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T21:29:39Z`

Trigger event:
`pr-split-2026-05-18T21-28-53Z-20260518T212123Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T21-28-53Z-20260518T212123Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Blocked, with a required split update. The newest split-persona synthesis,
`pr-split-20260518T212123Z-synthesis.md`, keeps the old linear
PR07/PR17/PR18/PR18x tail rejected and expands the active PR07 shape into a
parallel owner-decision fork that includes `PR07B0D-205218`. The split is still
not fileable because PR07 owner replay, PR02B validation, seed `1020002`
handling, exact verified branch links for many active rows, and final
rebuilt-stack validation are still missing.

Current maintainer-facing replacement shape:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A ready sidecar
  + PR02B blocked-validation sidecar
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D (+ PR06E)

Runtime-gated PR07 decision fork:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0
then compare sibling owner candidates:
  PR07B0A-155713
  PR07B0B-195150 persisted CRDT content/block hydration
  PR07B0C-201201 stale persisted CRDT content-from-blocks hydration
  PR07B0D-205218 corrected two-file PR07B0-based arm
  HOLD-07C
owner replay decides whether one arm wins or an additive sequence is justified;
use PR03B, PR05B, PR05C, clean PR05D, PR14, and the current canonical PR15
endpoint as lower controls.

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B
-> ready/rtc-pr15a-fallback-group-move-green-on-pr14b
-> ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b
-> ready/rtc-pr15c-fallback-group-delete-green-on-pr14b
```

Current blocker/status changes:

- `PR07B0A-155713`, `PR07B0B-195150`, `PR07B0C-201201`, and
  `PR07B0D-205218` are sibling owner candidates after `PR07B0`, not sequential
  PRs. The `20260518T211800Z` finalization report is now nonzero and validates
  `PR07B0D-205218` as corrected audit evidence, but no PR07 arm is fileable
  before owner replay.
- Failed `PR07B0D-203210`, raw `210726`, raw PR07D, raw deferred reload heads,
  stale PR07C ready refs, PR17, PR18, and PR18x stay out of the active split.
- `PR02B` remains a blocked-validation sidecar after PR02. It still needs seed
  `1030001`, the HTTP persistence probe, targeted PHPUnit, PR CI, and a
  verified branch-link audit.
- Strict `117126135e5e` is owner-unassigned until compared against PR03, held
  PR03B, PR07 arms, and lower controls. Do not name PR18x from it yet.
- Parser, linebreak, and rich-text reductions still require comparison against
  PR05B, PR05C, and clean PR05D before any PR18x naming.
- The independent progress-controller publish path is PR14 -> PR14B -> the
  three `ready/*-on-pr14b` PR15 rows. Duplicate non-`on-pr14b` PR15 variants
  remain held.
- Do not start broad final-stack fuzzing, stack filing, or final PR publication
  until PR07 owner replay, PR02B validation, and seed `1020002` handling are no
  longer blocking.

## Branch And Ref Status

Remote status was collected at `2026-05-18T21:29:34Z`.

The fix-planning repo is checked out at:

```text
## fix/rtc-fallback-group-delete-stale-local
d06e3528cbd Fix stale fallback group deletes
```

It still has an untracked reload-hydration E2E gate spec:

```text
test/e2e/specs/editor/collaboration/websocket-only/collaboration-reload-hydration-empty-live-gate.spec.ts
```

Keep that spec out of PR06, PR06E, PR07, PR08, PR15, fallback-group evidence,
and final branch claims unless it is deliberately copied into a clean evidence
worktree.

The fuzz repo remains on the validation stack:

```text
## try/rtc-fix-stack-validation
72854f05ed2 Hydrate saved CRDT responses without invalidation
```

That checkout is dirty with modified product/test files and many untracked
fuzz, analysis, and documentation artifacts. It is active validation
infrastructure, not the final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-18T21:29:39Z` from fetched
`danluu` refs. A row marked `verified-content` means the branch exists on
`danluu` and has a non-empty audited diff against the listed base. It does not
prove exact Cycle325/i40 publication shape, ancestry, owner evidence, or filing
readiness.

Use only these repaired audited PR13 review refs for current PR13
maintainer-facing content:

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
branch-link audit or explicitly says `No verified branch link yet`. Rows with no
verified branch link are not file-ready.

### Common Mainline

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | Ready sidecar after PR2 | No verified branch link yet | TBD | TBD | active sidecar; not file-ready until pushed, fetched, and audited |
| PR 2B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | blocked-validation sidecar; needs seed `1030001`, HTTP probe, targeted PHPUnit, PR CI, and verified branch link |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i40 row; aggregate PR05 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback-tail PR05D |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07 |

### Runtime/Owner-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active i40 row; owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active i40 row; prior replay evidence is stale/pre-oracle |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | decision base for the PR07B0 fork; compare PR07B0A, PR07B0B, PR07B0C, PR07B0D, and HOLD-07C before filing |
| PR 7B0A-155713 | Saved-CRDT hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | runtime-gated candidate from earlier cycles; raw `155713` full-stack ref must not be pushed |
| PR 7B0B-195150 | Persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | current audit evidence exists, but seed `966001`, seed `1020001`, `990001` comparison, owner replay, and verified GitHub branch link are still missing |
| PR 7B0C-201201 | Corrected persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | sibling decision-fork arm with PR07B0B; corrected current-run audit passed, but owner replay and verified GitHub branch link are still missing |
| PR 7B0D-205218 | Corrected two-file PR07B0-based blocked/runtime arm | No verified branch link yet | TBD | TBD | nonzero finalization validates it as an audit-evidence arm; still blocked on owner replay and verified GitHub branch link |
| HOLD-07C | Held PR07C/runtime control arm | No verified branch link yet | TBD | TBD | comparison control only; stale ready PR07C refs are not fileable |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; next progress-controller repair target |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired verified content; use until exact PR13B0-B3 refs are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired verified content; source-family PR13B0-B3 remain evidence-only without verified links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-C-on-PR14B |
| PR 15A-on-PR14B | Fallback-group move green on PR14B | No verified branch link yet | TBD | TBD | publish path should use `ready/rtc-pr15a-fallback-group-move-green-on-pr14b`; verified component prior art is not exact PR14B-based ref |
| PR 15B-on-PR14B | Fallback-group insert-anchor green on PR14B | No verified branch link yet | TBD | TBD | publish path should use `ready/rtc-pr15b-fallback-group-insert-anchor-green-on-pr14b`; exact verified link missing |
| PR 15C-on-PR14B | Fallback-group delete green on PR14B | No verified branch link yet | TBD | TBD | publish path should use `ready/rtc-pr15c-fallback-group-delete-green-on-pr14b`; exact verified link missing |

### Verified Fallbacks And Prior Art

These rows have verified audit links, but they are not the exact active
Cycle325/i40 proposed PR rows unless the status says so.

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 6B progress | Malformed save request payload minimal branch | [`danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal) | verified progress branch from the PR progress controller; still not a substitute for active PR06A-D/PR06E placement proof |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07 decision fork |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T21:29:34Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T212355Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-18T21:29:04.122Z`. This is current fuzz/control-plane health, not
final-stack validation.

Current-run health:

```text
output dir: run-20260518T212355Z
status: monitor started; full coverage pass pending
observed roots: 585
previous records loaded: 90000
supervisor groups file: 0
active run dirs: 0
unmet goals: pending until first pass
harness-work candidates: pending until first pass
quality issues: pending until first pass
triage signatures: pending until first pass
likely-real visible: pending until first pass
health warning: startup status only; full novelty pass has not completed yet
```

Interpretation:

- The latest novelty status is startup status for the new root. It has not
  completed a full pass, and it currently reports zero supervisor groups and
  zero active run dirs, so live likely-real and signature counts are pending.
- This matches the latest duplicate/noise zero-producer concern. It is fuzzer
  control-plane health, not product validation, and does not clear PR filing,
  PR07 owner replay, PR02B validation, reload-marker replay, seed `1020002`, or
  final-stack validation.
- Historical duplicate/noise remains dominated by startup/no-product families
  and must not be presented as live product failure.
- The latest duplicate/noise synthesis points at historical `startup-noise` /
  `pre_action_bootstrap_stall` holds becoming current hard scheduling blockers.
  Treat the first fix as novelty-monitor scheduling/admission work, not product
  fix evidence.

The latest trend evidence packet was generated at `2026-05-18T21:20:50Z`:

```text
monitor passes: 2294
first pass: 2026-05-15T01:21:42Z
last completed pass: 2026-05-18T21:14:43Z
coverage files: 272 -> 54996
coverage files delta: 54724
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3412
summary startup failures last: 0
quality issues last: 1
memory free: 431.9 GB
load averages: 59.22 / 45.98 / 54.99 on 64 cores
enabled groups current: none listed in packet
latest fuzz level mix:
  browser-e2e=27 lanes/24 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5909707
browser-e2e likely-real findings: 774 over 2497.4 runner-hours
```

The largest unmet goals remain save/reload and real-user depth:

```text
reload-post-action: 1143/2000
title-save-reload: 596/1000
real-user-editing success: 613/1000
body-save-reload: 655/1000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. New fuzz work should stay bounded and oracle-specific:
the trend packet still shows four unmet goals, high historical duplicate share,
and no enabled groups listed in the packet, while the novelty status is only a
startup snapshot.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T212123Z-synthesis.md`, updates the active replacement split
by adding `PR07B0D-205218` as a sibling PR07 decision-fork arm. It explicitly
keeps the old linear PR07/PR17/PR18/PR18x tail rejected and keeps failed
`PR07B0D-203210`, raw `210726`, raw PR07D, raw deferred reload branches, stale
PR07C ready refs, PR17, PR18, PR18x, stale fallback-tail PR05D claims, and
stale manifests out of the filing split.

Latest split/persona statuses:

- Run PR07 owner replay for seeds `966001`, `1020001`, and `990001` across
  PR07B0A, PR07B0B, PR07B0C, PR07B0D, HOLD-07C, PR03B, PR05B, PR05C, clean
  PR05D, PR14, and the current canonical PR15 endpoint. Do not stack the PR07
  arms linearly.
- PR02B clean validation should use
  seed `1030001`, an HTTP persistence probe, targeted
  `vendor/bin/phpunit phpunit/tests/collaboration/wpHttpPollingSyncServer.php`,
  PR CI, and a verified branch audit before it can be filed.
- Publish the three `ready/*-on-pr14b` PR15 rows from
  `/media/volume/danluu-fuzz-data/rtc-pr-progress-controller-20260518/current-push-manifest.tsv`.
  Hold duplicate non-`on-pr14b` PR15 variants.
- Continue progress-controller branch repair and full head/bundle/manifest
  audits for ready branches, especially PR11B next. Manifest-only PR10
  progress is useful but not sufficient unless head, bundle, and manifest
  agree.
- Keep loop hardening so `preflight-only`, `queued-not-run`,
  `blocked-validation`, `owner-unassigned`, prompt-only `PASS`, setup smoke,
  manifest-only rows, zero-byte reports, header-only TSVs, and stopped
  processes do not satisfy progress. Stale PR07C/HOLD-07C consumed state must
  not suppress newer PR07B0B/B0C/B0D matrices.

Recommended automatic follow-up jobs from the persona synthesis:

```text
rtc-cycle396-pr07-b0a-b0b-b0c-b0d-owner-replay
  required outputs: nonzero report.md, classification.tsv, replay-runs.tsv,
  first-divergence.tsv, and per-arm artifacts

rtc-cycle396-pr02b-validation-1030001-oracle
  run seed 1030001, HTTP persistence probe, and
  vendor/bin/phpunit phpunit/tests/collaboration/wpHttpPollingSyncServer.php

controller self-repair
  enforce the no-progress rules above and prevent stale PR07C/HOLD-07C state
  from serializing newer PR07B0B/B0C/B0D work
```

The newest duplicate/noise synthesis,
`duplicate-noise-20260518T211045Z-synthesis.md`, edited no files. It frames
the duplicate/noise issue as fuzzer control-plane scheduling/admission state,
not product failure: historical no-product `startup-noise` /
`pre_action_bootstrap_stall` holds must not become current hard producer
blocks when the active output root has no product-evidence runs. The current
collector snapshot again shows zero active run dirs, so the bounded follow-up
is to patch `bin/rtc-browser-fuzz-novelty-monitor.mjs` so historical
startup-noise pauses are advisory for current hard scheduling decisions, then
validate with `node --check`, a gate-only pass, monitor restart, and a short
check that product-evidence-capable groups can materialize.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance, and
old PR13 GitHub-ref caveats are superseded by the current branch-link audit,
the repaired PR13 review refs, the latest PR07 decision-fork shape, and the
latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified product refs | PR02A, PR02B, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-current, PR07B0A-155713, PR07B0B-195150, PR07B0C-201201, PR07B0D-205218, HOLD-07C, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A/B/C-on-PR14B | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | recommended sidecar, but still blocked; earlier preflight/setup-only/reportless jobs do not count as validation | Rerun with verified-free ports and clean `wp-env`, then require seed `1030001`, short HTTP persistence probe, targeted PHPUnit, PR CI, and exact branch-link audit |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B0A, PR07B0B, PR07B0C, PR07B0D-205218, HOLD-07C, reload/provider evidence | runtime readiness remains unresolved; PR07B0D-205218 has corrected audit evidence, but no PR07 arm has owner replay | Replay seeds `966001`, `1020001`, and `990001` across the required arms and controls; require first-divergence/owner evidence plus clean materialized refs |
| Failed PR07B0D / `203210` | raw `deferred/rtc-reload-hydration-20260518T203210Z`, raw `210726`, and related manifests | out of the active fork; Cycle394 restack failed on both touched files, and `PR07B0D-205218` is the current corrected arm | Reconsider only after a bounded conflict-resolution/downscope job produces a clean two-file allowed-base artifact with bundle/head/manifest agreement |
| PR07D / PR17 / PR18 / PR18x | reload/post-save/rejoin residuals and old linear tail | rejected for the current split | Reconsider only after owner replay proves a product-owned boundary not covered by the accepted PR07 fork |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the chosen PR07 path, holds, PR14, and the current canonical PR15 endpoint before assigning any new owner row |
| Revision-restore strict signal | `117126135e5e`, PR03, held PR03B, PR07 arms | owner-comparison target only; not a split row or product fix by itself | Compare against PR03, held PR03B, PR07 arms, and lower controls before claiming a new owner boundary |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15C-on-PR14B | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, accepted PR07 fork non-ancestry where required, old HOLD non-ancestry, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A/B/C-on-PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based ready refs | Publish/fetch/audit the three `ready/*-on-pr14b` refs and confirm ancestry |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only; do not wait on it before running independent PR07/PR02B/strict-owner work | Repair or explicitly reclassify before final-stack validation and filing |
| Reload marker/lifecycle work | HARNESS reload markers, seeds `990001`/`990003`, same-user lifecycle seeds, PR07C seeds, deferred reload outputs | harness/diagnostic only until replay proves product ownership | Consume PR07 owner replay when present, then require product-owned first-loss boundary before promotion |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, startup-noise cooldowns, empty materialization rescue, fleet canary policy, live/analysis duplicate-family admission | latest synthesis edited no files and keeps this as control-plane scheduling/admission work; current novelty snapshot has zero active run dirs and no full pass yet | Keep product-evidence signatures visible; make historical startup-noise holds advisory for current hard scheduling decisions, then validate one bounded product-evidence-capable rescue |
| Current fuzz validation | `run-20260518T212355Z`, novelty status at `2026-05-18T21:29:04.122Z`, trend generated at `2026-05-18T21:20:50Z` | startup-only novelty status with zero active run dirs; full pass and live triage counts pending; trend has `4` unmet goals and `1` quality issue | Use as health/control-plane evidence only; still require owner replay, PR02B validation, exact branch audit, reload-marker downscope, seed `1020002` handling, and final PR-stack validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw `155713`, raw
`PR07B0B-195150`, raw `PR07B0C-201201`, raw `PR07B0D-205218`, raw `203210`,
raw `210726`, raw PR07D, PR17, PR18, PR18x, or local finalization artifacts
as-is.

Before filing any maintainer-facing PR:

1. Use the replacement split above: ready/local lane, CRDT/data-loss lane, and
   PR07 converted into a runtime-gated decision fork rather than the old
   PR07/PR17/PR18 tail.
2. Treat PR07B0A, PR07B0B, PR07B0C, PR07B0D-205218, and HOLD-07C as blocked
   sibling owner candidates. Keep failed `203210`, raw `210726`, raw PR07D,
   stale PR07C ready refs, PR17, PR18, and PR18x out unless later
   conflict-resolution/downscope work produces clean allowed-base evidence.
3. Do not file PR02B before seed `1030001`, HTTP persistence probe, targeted
   PHPUnit, PR CI, and verified GitHub branch-link audit pass.
4. Do not file PR07 until PR07B0A/B/C/D and the hold/lower-control matrix has
   nonzero owner replay outputs, first-divergence evidence, clean materialized
   refs, exact branch links, and `git diff --check`.
5. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
6. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   PR15A/B/C after PR14B, and no fallback-tail PR05D.
7. Run held owner comparisons for strict projection, common-blocks, rich-text,
   search/live-collapse, revision-restore `117126135e5e`, and reload
   candidates before creating new product rows.
8. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
9. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
10. Treat the latest duplicate/noise producer/admission analysis and the
   current fuzz root as control-plane/fuzz health, not product validation or
   final-stack readiness.
11. After PR07 decision-fork owner evidence, exact branch-link audit for
   missing rows, PR02B validation, reload-marker replay/downscope, strict
   `117126135e5e` comparison if it remains product-owned, and seed `1020002`
   repair or reclassification land, rebuild the combined validation stack from
   explicit Cycle325/i40 heads plus accepted epoch work, then run focused
   checks, touched-file lint, branch graph/containment evidence, adjacent
   range-diffs/diffstats/numstats, `git diff --check`, feasible runtime checks,
   and fresh stack-wide validation.

Useful bounded work now:

- launch `rtc-cycle396-pr07-b0a-b0b-b0c-b0d-owner-replay` and require nonzero
  `report.md`, `classification.tsv`, `replay-runs.tsv`,
  `first-divergence.tsv`, `owner-matrix.tsv`, and per-arm artifacts;
- launch `rtc-cycle396-pr02b-validation-1030001-oracle` with seed `1030001`, the HTTP
  persistence probe, and
  `vendor/bin/phpunit phpunit/tests/collaboration/wpHttpPollingSyncServer.php`;
- publish the three `ready/*-on-pr14b` PR15 rows from the current progress
  manifest, then fetch and audit their exact links;
- keep the progress-controller hardening in force so prompt-only, manifest-only,
  preflight-only, blocked-validation, owner-unassigned, setup-only, zero-byte,
  header-only, duplicate-head, stale-manifest, or stopped-child artifacts never
  count as completed progress;
- patch the novelty-monitor scheduler so historical startup-noise holds cannot
  pause all current product-evidence producers, then verify a bounded canary can
  materialize;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw `203210` or raw `210726` publication/replay, raw PR07D, raw
deferred publication, PR17, PR18, PR18x promotion, reload-marker product
promotion before replay, or extra browser lanes.
