# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T01:14:37Z`

Trigger event:
`pr-split-2026-05-19T01-13-12Z-20260519T010416Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-19T01-13-12Z-20260519T010416Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Still blocked for GitHub filing and final-stack validation. The latest
split-persona synthesis keeps the Cycle412 replacement shape, but rejects the
newer `20260519T005908Z` finalization output because it revived stale Cycle325
`PR15D` as ready. The current maintainer shape remains two filing lanes plus
non-fileable owner/control queues:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A ready sidecar
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D
  + PR06E ready sidecar from PR06D

Non-fileable owner queues:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0
  compare PR07B0A/B/C/D-215248/E-233340 and HOLD-07C
  against PR03B, PR05B, PR05C, clean PR05D, PR14,
  and the current PR15C-on-PR14B endpoint

Strict revision-restore owner queue:
signature 117126135e5e / seed 5400020
  compare PR03, PR03B, PR07 arms, PR05B/C/clean PR05D, PR14,
  and the current PR15C-on-PR14B endpoint before naming PR18x

CRDT/data-loss lane:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> repaired PR13A -> PR13B0/B1/B2/B3 target once exact refs are audited
   (use repaired PR13B/PR13C audit links until then)
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C

Blocked/control-only:
PR15D, unless fresh current-base head/bundle/manifest proof exists
```

The latest split-persona synthesis,
`pr-split-20260519T010416Z-synthesis.md`, supersedes the prior Cycle412 status
where it differs:

- `PR02B` is now downscoped/no-file. The nonzero downscope report says PR02
  base and PR02B both pass seed `1030001`, with `promote: no`.
- PR07 remains non-fileable. The latest synthesis says the current PR07
  evidence is only three seed `966001` failing candidate rows with the same
  stable-root-block-count divergence; that is not owner attribution.
- Strict `117126135e5e` still has zero owner rows, so no `PR18x` should be
  named.
- The canonical CRDT endpoint is Cycle396 `PR15C-on-PR14B`. `PR15D` is
  blocked/control-only, and the `20260519T005908Z` finalization output must be
  repaired because it marked stale Cycle325 `PR15D` ready.
- The raw split now names a finer PR13B0/B1/B2/B3 target after PR13A, but the
  branch-link audit still has no verified links for those heads. Until exact
  B0-B3 refs are published and audited, the repaired PR13A/B/C audit refs are
  the only current PR13 PR-content links.

Seed `1020002` still blocks final-stack fuzzing, rebuilt stack-wide validation,
GitHub filing, and its own final repair/reclassification only. It must not
block PR07 owner comparison, strict `117126135e5e` owner comparison, branch
audits, push manifests, PR02A/PR5/PR11 shaping, deferred downscope/promotion,
or loop repair.

Do not file `PR02B`, any PR07 arm, `PR15D`, raw `PR07D`, stale `PR07C`, raw
deferred reload/search/rich-text heads, `PR17`, `PR18`, or `PR18x`.

## Branch And Ref Status

Remote status was collected at `2026-05-19T01:14:31Z`.

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

The branch-link audit was generated at `2026-05-19T01:14:37Z` from fetched
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
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i40 row; aggregate PR05 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback-tail PR05D |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | TBD | active PR06A-D split row; do not substitute grouped PR06 or PR06A prior-art refs |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | TBD | active PR06A-D split row; PR06B progress ref is useful evidence only |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | TBD | active PR06A-D split row |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07 |

### No-File Owner Queues

These rows are not in the fileable split. They stay here so the owner gates are
easy to scan.

| Queue item | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR02B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | downscoped/no-file; nonzero report says PR02 base and PR02B both pass seed `1030001`, `promote: no` |
| PR07A1/A2/A3 | Save response guard microheads | No verified branch link yet | TBD | TBD | non-fileable setup for PR07 owner comparison; exact refs and owner evidence missing |
| PR07B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | decision base for the PR07 queue; compare B0A, B0B, B0C, B0D-215248, B0E-233340, and HOLD-07C |
| PR07B0A-155713 | Saved-CRDT hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable owner candidate; raw `155713` full-stack ref must not be pushed |
| PR07B0B-195150 | Persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable owner candidate; owner replay and verified GitHub branch link are still missing |
| PR07B0C-201201 | Corrected persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | non-fileable sibling owner candidate; owner replay and verified GitHub branch link are still missing |
| PR07B0D-215248 | Clean PR07B0-based derived-content authority arm | No verified branch link yet | TBD | TBD | active clean B0D comparison arm; needs row-bearing owner matrix before promotion |
| PR07B0E-233340 | Clean blocked runtime-gated candidate from raw `233340` | No verified branch link yet | TBD | TBD | evidence-only; clean base/head/bundle/manifest agreement exists, but seed `6000007` still fails post-readiness, so this is only a comparison arm |
| HOLD-07C | Held PR07C/runtime control arm | No verified branch link yet | TBD | TBD | comparison control only; stale ready PR07C refs are not fileable |
| Strict 117126135e5e | Revision-restore strict owner queue / seed `5400020` | No verified branch link yet | TBD | TBD | unnamed owner queue; zero owner rows in latest synthesis; no PR18x until oracle-bearing rows compare PR03/PR03B, PR07 arms, PR05B/C/D, PR14, and the current PR15C-on-PR14B endpoint |
| PR15D endpoint/control | Stale Cycle325 endpoint candidate after PR15C | No verified branch link yet | TBD | TBD | blocked/control-only; reject the `20260519T005908Z` ready marking until fresh current-base head/bundle/manifest proof exists |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | active split row; grouped PR11 is aggregate prior art only |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | active split row |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | TBD | active split row |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | TBD | active split row |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | TBD | active split row |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | TBD | active split row; grouped PR12 is aggregate prior art only |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | TBD | active split row |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | TBD | active split row |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired verified content; use until exact PR13B0-B3 refs are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired verified content; source-family PR13B0-B3 remain evidence-only without verified links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-C; needs final-PR14B materialization/audit |
| PR 15A-on-PR14B | Fallback-group move green on PR14B | No verified branch link yet | TBD | TBD | Cycle396 lane row; local evidence supports it, but exact final-PR14B ref is still missing from the branch audit |
| PR 15B-on-PR14B | Fallback-group insert-anchor green on PR14B | No verified branch link yet | TBD | TBD | Cycle396 lane row; local evidence supports it, but exact final-PR14B ref is still missing from the branch audit |
| PR 15C-on-PR14B | Fallback-group delete green on PR14B | No verified branch link yet | TBD | TBD | current canonical CRDT endpoint; exact final-PR14B ref is still missing from the branch audit |

### Verified Fallbacks And Prior Art

These rows have verified audit links, but they are not the exact active
micro-split PR rows unless the status says so.

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 6B progress | Malformed save request payload minimal branch | [`danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal) | verified progress branch; evidence only, not a substitute for PR06A-D/PR06E placement proof |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07 decision fork |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; not the exact final-PR14B materialized ref |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; not the exact final-PR14B materialized ref |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not the exact Cycle396 PR15C-on-PR14B endpoint and not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T01:14:31Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T002227Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-19T01:13:55.525Z`. Metrics are from the most recent completed full
pass at `2026-05-19T01:08:09.170Z`:

```text
output dir: run-20260519T002227Z
coverage files: 55547
total records seen: 90846
records processed this pass: 19
unmet goals: 4
quality issues: 0
current-run active dirs: 1
active current-run triage roots: 1
active current-run product-evidence signatures: 0
active current-run likely-real visible: 0
current-drain product-evidence signatures: 1
current-drain likely-real visible: 1
historical likely-real visible: 374
historical likely-real merged duplicates: 1448
historical duplicate share: 0.3409
enabled group listing: novelty-ws-three-user-late-join
active producer note: three-user-late-join has 7 current-run records and no
  active signatures; async-server-blocks is paused with product evidence in drain
headroom for adding groups: no
load1: 74.59 / 64 cores
memory free: 423.8 GB
```

Interpretation:

- Do not claim final-stack cleanliness. The active current-run scope has one
  active directory and zero active product-evidence signatures; current drain
  still has one product-evidence signature and one visible likely-real family
  (`save_response_crdt_hydration_marker_loss`).
- Historical likely-real and duplicate/noise numbers are reporting context, not
  live product failure evidence for the active root.
- The fuzz repo remains active validation infrastructure, not the final PR
  stack.
- Current fuzz health does not clear PR filing, PR07 owner replay, strict
  owner replay, PR15C-on-PR14B branch-link gaps, PR15D control-only endpoint
  repair, reload-marker replay, seed `1020002`, exact branch-link gaps, or
  final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T01:05:43Z`:

```text
monitor passes: 2313
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-19T00:50:40Z
coverage files: 272 -> 55530
coverage files delta: 55258
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.3407
summary startup failures last: 0
quality issues last: 0
memory free: 423.1 GB
load averages: 69.99 / 77.15 / 77.12 on 64 cores
enabled group current in trend snapshot: novelty-ws-three-user-late-join
latest fuzz level mix:
  browser-e2e=41 lanes/38 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6007020
browser-e2e likely-real findings: 779 over 2572.8 runner-hours
```

Largest unmet goals remain save/reload and real-user depth:

```text
reload-post-action: 1143/2000
title-save-reload: 596/1000
real-user-editing success: 613/1000
body-save-reload: 655/1000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. CPU/load are still high, so new fuzz work should stay
bounded and oracle-specific rather than increasing broad browser concurrency.
The current duplicate-share trend value is from one represented current/drain
family, and novelty status now shows the product-evidence representative in
drain rather than active current-run scope.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260519T010416Z-synthesis.md`, supersedes the prior Cycle412 status
where it differs:

- Consume the PR02B downscope result: `PR02B` is no-file/downscoped, not a
  blocked fileable sidecar.
- Keep PR07 non-fileable. The latest synthesis notes three PR07 seed `966001`
  failing candidate rows with the same stable-root-block-count divergence; that
  is not owner attribution.
- Strict `117126135e5e` still has zero owner rows. Guard-launch a strict-only
  comparison only if Cycle410 has not already produced strict rows.
- Treat Cycle396 `PR15C-on-PR14B` as the current canonical CRDT endpoint. Demote
  `PR15D` to blocked/control-only and repair the `20260519T005908Z`
  finalization output that marked stale Cycle325 `PR15D` ready.
- Reject fallback-tail, `d06e3528cbd`, stale PR05D, raw validation-stack claims,
  and stale PR15D publication evidence without fresh current-base manifest,
  bundle, head, and base agreement.
- Keep seed `1020002` scoped to final-stack fuzzing, rebuilt validation,
  filing, and its own repair/reclassification.

The latest duplicate/noise synthesis file,
`duplicate-noise-20260519T003819Z-synthesis.md`, is nonzero and edited no
files. It says the expensive downstream consumers are mostly guarded, and the
smallest safe control-plane fix was to make supervisor no-product startup
drain cooldown beat recovery/relaunch in
`bin/rtc-browser-fuzz-supervisor.mjs`, preserving the product-evidence veto.

The latest completed duplicate/noise feedback action is
`duplicate-noise-20260519T003819Z-feedback-action.md`. It implemented that
supervisor recovery-vs-drain fix, passed `node --check` for the supervisor,
triage watcher, live-analysis monitor, analysis tier, and deep-analysis tier,
and confirmed no queued/running `pre_action_bootstrap_stall` in the
live/analysis/deep paths. Product-evidence was preserved: `f32bcb5537e2`
remained visible and advanced as `persisted-content-mismatch`. The older
novelty-monitor scheduler-side fix remains completed compatible hardening, not
product validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance, and
old PR13 GitHub-ref caveats are superseded by the current branch-link audit,
the repaired PR13 review refs, the latest replacement split, and the latest
novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A/B/C-on-PR14B | active proposed rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | downscoped/no-file; base PR02 and PR02B both pass seed `1030001`, `promote: no` | Do not file. Reopen only with new owner/repro evidence and a verified branch-link audit |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, PR07B0E-233340, HOLD-07C | non-fileable owner-comparison fork; latest synthesis reports only three same-divergence seed `966001` failing candidate rows, not owner attribution | Require row-bearing PR07 owner matrix over seeds `966001`, `1020001`, `990001`, and `6000007`, plus clean refs, first-divergence evidence, controls, and branch audit before promotion |
| Cycle410 owner matrix | `rtc-cycle410-pr07-strict-post-readiness-owner-matrices` | collected raw split still records header-only TSVs and `Rows recorded: 0`; latest synthesis says any newer PR07 rows are same-divergence candidates only; strict still has zero owner rows | Continue only while it is adding row-level evidence; otherwise run bounded repair/reconcile work and a guarded strict-only comparison |
| PR07B0E-233340 | clean blocked candidate from raw `233340` | evidence-only; clean base/head/bundle/manifest agreement exists, but seed `6000007` still fails post-readiness before persistence parity | Compare with B0B/C/D and lower controls through the row-bearing owner matrix |
| Historical PR07 controls / failed raw reload refs | raw `203210`, raw `210726`, raw `231829`, raw `233340`, `PR07B0D-205218`, `PR07B0D-212232`, `PR07B0D-213739`, and related manifests | out of the active fork; `PR07B0D-215248` supersedes older B0D variants, and raw validation-stack heads are not pushable product refs | Reconsider only after clean allowed-base restack/audit plus owner replay justifies promotion |
| PR07D / PR17 / PR18 / PR18x | reload/post-save/rejoin residuals and old linear tail | rejected for the current split | Reconsider only after owner replay proves a product-owned boundary not covered by the accepted PR07 fork |
| DIAG reload/search/rich-text diagnostics | `DIAG-HTTP-REJOIN-220755`, `DIAG-RELOAD-220755`, `DIAG-RELOAD-225820`, `DIAG-SEARCH-225317`, `DIAG-RICHTEXT-230324`, `DIAG-RICHTEXT-232836` | diagnostic/test side lanes only; nonzero finalization reports add evidence but no product PR | Run focused first-loss replay before assigning reload, search, rich-text, or rejoin product ownership |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the PR07 owner queue, PR14, and the current PR15C-on-PR14B endpoint before assigning any new owner row |
| Revision-restore strict signal | `117126135e5e`, seed `5400020`, PR03, held PR03B, PR07 arms | owner-comparison target only; latest synthesis says strict still has zero owner rows | Require row-bearing strict owner comparison against PR03, held PR03B, PR07 arms, PR05B/C/D, PR14, and the current PR15C-on-PR14B endpoint before naming PR18x |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06, PR06A prior-art, and PR06B progress refs are verified; active PR06A-D and PR06E still have no exact verified micro-split links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15C-on-PR14B | CRDT/data-loss lane starts from PR06D, not PR07, and currently ends at Cycle396 PR15C-on-PR14B | Prove `PR06D -> PR09`, accepted PR07 fork non-ancestry where required, old HOLD non-ancestry, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B, PR15A/B/C-on-PR14B | Cycle396 PR15C-on-PR14B is the current canonical CRDT endpoint, but branch-link audit verifies only PR15A-C component prior art and no exact final-PR14B materialized refs | Publish/fetch/audit exact PR14B-based refs, confirm ancestry, and require nonzero materializer/audit evidence |
| PR15D endpoint/control | stale Cycle324/Cycle325/Cycle376 PR15D rows and the `20260519T005908Z` finalization output | blocked/control-only; latest synthesis rejects the `005908Z` ready marking as stale endpoint evidence, not zero-byte evidence | Run bounded finalization repair/reconcile: remove PR15D from ready/push rows, keep Cycle396 PR15C-on-PR14B as endpoint, and accept PR15D only with fresh current-base head/bundle/manifest proof |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only; do not wait on it before running independent PR07/strict/branch-audit work | Repair or explicitly reclassify before final-stack validation and filing |
| Reload marker/lifecycle work | HARNESS reload markers, seeds `990001`/`990003`, same-user lifecycle seeds, PR07C seeds, deferred reload outputs | harness/diagnostic only until replay proves product ownership | Consume PR07 owner replay when present, then require product-owned first-loss boundary before promotion |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, startup-noise cooldowns, family-capped duplicate holds, current-run negative gates, represented product-evidence duplicates | novelty-monitor remediation and the supervisor no-product startup-drain cooldown/recovery fix are implemented and restarted; strict startup records are suppressed rather than queued, and product-evidence remains visible in drain | Add only bounded runner/novelty follow-up hardening if the same leak recurs; do not treat this as product validation |
| Current fuzz validation | `run-20260519T002227Z`, novelty status at `2026-05-19T01:13:55.525Z`, trend generated at `2026-05-19T01:05:43Z` | active current run has `55547` coverage files, `90846` records, `4` unmet goals, `0` active current-run product-evidence signatures, `1` current-drain product-evidence signature, `1` current-drain likely-real visible, and no headroom for new groups | Use as health/control-plane evidence only; still require owner replay, PR15C-on-PR14B branch audit, PR15D control-only repair, reload-marker downscope, seed `1020002` handling, and final PR-stack validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw `155713`, raw
`PR07B0B-195150`, raw `PR07B0C-201201`,
`PR07B0D-205218`/`212232`/`213739` historical controls, raw
`PR07B0D-215248`, raw `203210`, raw `210726`, raw `231829`, raw `233340`,
raw PR07D, raw `HOLD-07C`, PR02B, stale/ready-marked PR15D, PR17, PR18,
PR18x, zero-byte finalization output, header-only matrices, header-only push
manifests, the `20260519T005908Z` stale-PR15D ready output, or local
finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement fileable shape above: ready/local lane plus
   CRDT/data-loss lane ending at Cycle396 `PR15C-on-PR14B`. PR02B, PR07,
   strict `117126135e5e`, and PR15D are not proposed filing rows.
2. Treat PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, clean blocked
   PR07B0E-233340, and HOLD-07C as sibling owner candidates. Require
   oracle-bearing owner replay outputs, first-divergence evidence, clean
   materialized refs, exact branch links, and `git diff --check` before
   promoting any PR07 arm.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   and PR15A/B/C after final PR14B materialization. Keep PR15D control-only
   unless a fresh current-base head/bundle/manifest audit proves it belongs.
5. Run held owner comparisons for strict projection, common-blocks, rich-text,
   search/live-collapse, revision-restore `117126135e5e`, and reload
   candidates before creating new product rows.
6. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
7. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
8. Treat the latest duplicate/noise producer/admission analysis and the current
   fuzz root as control-plane/fuzz health, not product validation or
   final-stack readiness.
9. After PR07/strict owner evidence, exact branch-link audit for missing rows,
   PR15C-on-PR14B endpoint materialization, PR15D control-only repair or fresh
   proof, reload-marker replay/downscope, and seed `1020002` repair or
   reclassification land, rebuild the combined validation stack from explicit
   accepted heads excluding stale PR15D, then run focused checks, touched-file
   lint, branch graph/containment evidence, adjacent range-diffs/diffstats/
   numstats, `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

Useful bounded work now:

- repair/reconcile the `20260519T005908Z` finalization output: remove stale
  `PR15D` from ready/push rows and restore Cycle396 `PR15C-on-PR14B` as the
  canonical CRDT endpoint;
- continue Cycle410 PR07 owner comparison only while it is adding useful rows;
  three same-divergence seed `966001` candidate failures are not owner
  attribution;
- run a guarded strict-only `117126135e5e` comparison if Cycle410 has not
  produced strict rows;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`;
- monitor the completed duplicate/noise supervisor cooldown fix, and apply
  only bounded runner/novelty follow-up hardening if current-scope startup or
  stale-triage leakage recurs.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw deferred publication/replay, raw PR07D, raw `HOLD-07C`, PR17,
PR18, PR18x promotion, PR15D promotion from stale endpoint evidence,
diagnostic product promotion before focused first-loss replay, broad consumer
duplicate/noise suppression, or extra browser lanes.
