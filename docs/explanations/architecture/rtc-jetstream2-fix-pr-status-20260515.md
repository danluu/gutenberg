# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T23:08:03Z`

Trigger event:
`pr-split-2026-05-18T23-00-41Z-20260518T225231Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T23-00-41Z-20260518T225231Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Still blocked on evidence. The newest split-persona synthesis,
`pr-split-20260518T225231Z-synthesis.md`, keeps the Cycle400/402 replacement
split: the old linear `PR07 -> PR17 -> PR18/PR18x` tail remains rejected, and
PR07 is still a runtime-gated owner-decision fork. `PR07B0D-215248` has valid
Cycle400 branch-audit/manifest evidence. The Cycle400 owner replay produced
`36/36` `blocked-before-oracle` rows because `collaborationEnabled` was `null`,
and the Cycle402 PR07 readiness repair is now nonzero but still setup-blocked
before oracle with `collaborationEnabled:null`. No PR07 arm is fileable. Keep
the parallel ready/local and CRDT lanes. Treat
`PR07B0D-205218`, `PR07B0D-212232`, and `PR07B0D-213739` as historical
comparison arms only. The active PR07 sibling arms remain `PR07B0A-155713`,
`PR07B0B-195150`, `PR07B0C-201201`, `PR07B0D-215248`, and `HOLD-07C`.

The ready/local and CRDT lanes stay intact. Use clean PR05D on PR05C and
canonical PR15 endpoint evidence only. Do not use fallback-tail, `d06e3528cbd`
PR05D/PR15-derived manifests, old divergent PR15D refs, zero-byte output, or
header-only push manifests as filing proof.

The newest raw novelty status for `run-20260518T225956Z` was updated at
`2026-05-18T23:07:07.412Z` and is startup-only: the monitor has loaded `90517`
previous records, sees `605` observed roots, sees one supervisor groups file,
and sees one active run dir, but its first full coverage pass is still pending.
Use the trend packet generated at `2026-05-18T22:59:42Z` for the
latest completed-pass metrics: `55267` coverage files, `4` unmet goals,
current duplicate share `1`, historical duplicate share `0.341`, and `777`
browser-E2E likely-real findings over `2522.9` runner-hours. This is
fuzz/control-plane health, not final-stack validation.

The latest duplicate/noise synthesis,
`duplicate-noise-20260518T223507Z-synthesis.md`, keeps the remaining
control-plane focus narrow and producer-side: restore durable producer holds
from structured `no-analysis.json` sentinel fields, let current-output
`family-capped` duplicate/noise representatives pause the emitting producer,
and preserve product-evidence signatures. It does not support broad product
failure suppression.

The completed cycle-220 duplicate/noise feedback action patched the remote
novelty monitor plus triage, analysis, deep-analysis, and live-analysis
consumers, passed `node --check` on all five changed `.mjs` files, validated
that strict no-product startup queues were clean, restarted the
coverage-guided control plane, and left one startup-noise no-analysis sentinel
with `reasonKind=startup-noise`, `family=pre_action_bootstrap_stall`,
`noProductOnly=true`, and `hasProductEvidence=false`. Those remote script
edits are not part of this report branch, and the current root still needs its
first post-restart full novelty pass.

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
then compare sibling arms:
  PR07B0A-155713
  PR07B0B-195150 persisted CRDT content/block hydration
  PR07B0C-201201 stale persisted CRDT content-from-blocks hydration
  PR07B0D-215248 clean derived-content authority arm
  HOLD-07C
owner replay decides whether one arm wins or an additive sequence is justified;
use PR03B, PR05B, PR05C, clean PR05D, PR14, and canonical PR15D as controls.

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

Current blocker/status changes:

- `PR07B0A-155713`, `PR07B0B-195150`, `PR07B0C-201201`, and
  `PR07B0D-215248` are sibling owner candidates after `PR07B0`, not
  sequential PRs. `PR07B0D-215248` supersedes `PR07B0D-205218`/`212232`/`213739`
  as the active clean arm. Its Cycle400 audit/manifest artifacts are nonzero
  and passed freshness checks, but the owner replay is setup-blocked with
  `36/36` rows blocked before oracle due `collaborationEnabled:null`. The
  Cycle402 readiness repair is also nonzero but still blocked before oracle on
  the same readiness condition.
- Failed `PR07B0D-203210`, raw `210726`, raw PR07D, raw deferred reload heads,
  stale PR07C ready refs, raw `HOLD-07C`, `PR07B0D-205218`/`212232`/`213739`
  controls, PR17, PR18, and PR18x stay out of the active split.
- `DIAG-HTTP-REJOIN-220755` is a blocked diagnostic side lane, not a PR07 row:
  source `deferred/rtc-reload-hydration-20260518T220755Z`, head
  `f50864062e0f`, base `72854f05ed...`, seed `6000034`. It has no verified
  branch link yet and needs audit/replay before any product PR decision.
- `PR02B` remains a blocked-validation sidecar after PR02. It still needs seed
  `1030001` owner/repro explanation because the fresh PR02B validation report
  passed on both PR02B and the PR02 base; after that it still needs PR CI and
  a verified branch-link audit.
- Cycle398 PR07 replay produced `0` oracle-bearing rows, Cycle400 produced
  only `blocked-before-oracle` rows, and Cycle402 readiness is still
  setup-blocked, so PR07 remains a runtime-gated owner fork. PR02B remains
  blocked despite targeted PHPUnit passing because the
  fresh PR02B validation report passed on both PR02B and its PR02 base; the
  intended base/head failure boundary did not reproduce.
- Strict `117126135e5e` is owner-unassigned until compared against PR03, held
  PR03B, PR07 arms, and lower controls. Do not name PR18x from it yet.
- Parser, linebreak, rich-text, search/live-collapse, and reload reductions
  still require owner comparison against PR05B, PR05C, clean PR05D, the chosen
  PR07 path, PR14, and canonical PR15D before promotion.
- The branch-link audit verifies several aggregate/prior-art branches, but the
  active micro-split rows remain unfileable where they say
  `No verified branch link yet`.
- Do not start broad final-stack fuzzing, stack filing, or final PR publication
  until PR07 owner replay, PR02B validation, PR15 final-PR14B materialization,
  exact branch links, reload-marker downscope, seed `1020002` handling, and
  rebuilt final-stack validation are no longer blocking.

## Branch And Ref Status

Remote status was collected at `2026-05-18T23:07:58Z`.

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

The branch-link audit was generated at `2026-05-18T23:08:03Z` from fetched
`danluu` refs. A row marked `verified-content` means the branch exists on
`danluu` and has a non-empty audited diff against the listed base. It does not
prove exact Cycle325/i40 publication shape, ancestry, owner evidence, or filing
readiness.

The audit now also verifies aggregate or progress links for PR06, PR06A,
PR06B progress, PR07A, PR07B, and PR15A-C component branches. Those links are
listed below as prior-art/progress rows only where the active micro-split still
needs exact branch publication or owner evidence.

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
| PR 2B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | blocked-validation sidecar; needs owner/repro explanation after both PR02B and PR02 base passed seed `1030001`, then PR CI and verified branch link |
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
| PR 7B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | decision base for the PR07B0 fork; compare PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, and HOLD-07C before filing |
| PR 7B0A-155713 | Saved-CRDT hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | runtime-gated candidate from earlier cycles; raw `155713` full-stack ref must not be pushed |
| PR 7B0B-195150 | Persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | current audit evidence exists, but seed `966001`, seed `1020001`, `990001` comparison, owner replay, and verified GitHub branch link are still missing |
| PR 7B0C-201201 | Corrected persisted CRDT content/block hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | sibling decision-fork arm with PR07B0B; corrected current-run audit passed, but owner replay and verified GitHub branch link are still missing |
| PR 7B0D-215248 | Clean PR07B0-based derived-content authority arm | No verified branch link yet | TBD | TBD | active clean arm from nonzero `20260518T220814Z` finalization and Cycle400 audit/manifest evidence; owner replay produced `36/36` `blocked-before-oracle` rows from `collaborationEnabled:null`; still blocked on replay repair and verified GitHub branch link |
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
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-D; needs final-PR14B materialization/audit |
| PR 15A-on-PR14B | Fallback-group move green on PR14B | No verified branch link yet | TBD | TBD | exact final-PR14B ref still missing; header-only push manifest is not progress |
| PR 15B-on-PR14B | Fallback-group insert-anchor green on PR14B | No verified branch link yet | TBD | TBD | exact final-PR14B ref still missing; needs nonzero materializer/audit report |
| PR 15C-on-PR14B | Fallback-group delete green on PR14B | No verified branch link yet | TBD | TBD | exact final-PR14B ref still missing; needs nonzero materializer/audit report |
| PR 15D | Canonical PR15 endpoint after PR15C | No verified branch link yet | TBD | TBD | lower-control endpoint still unresolved; old divergent refs are not filing proof |

### Verified Fallbacks And Prior Art

These rows have verified audit links, but they are not the exact active
micro-split PR rows unless the status says so.

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
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; not the exact final-PR14B materialized ref |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; not the exact final-PR14B materialized ref |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not the exact final-PR14B materialized ref and not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T23:07:58Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T225956Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-18T23:07:07.412Z`. It is startup-only for the new coverage root, so
coverage guidance, triage yield, likely-real counts, duplicate share, unmet
goals, and quality issues are pending until the first full pass. This is
fuzz/control-plane health, not final-stack validation.

Current startup health:

```text
output dir: run-20260518T225956Z
observed roots: 605
previous records loaded: 90517
supervisor groups file: 1
active run dirs: 1
full coverage pass: pending
```

Interpretation:

- The latest novelty status does not yet provide a completed full-pass
  likely-real or duplicate/noise result for `run-20260518T225956Z`; do not
  publish the previous root's current-run counts as live results for this root.
- The duplicate/noise remediation supports the intended bounded control-plane
  direction: pause known startup/noise/duplicate producers even below
  materialization floor, let capacity under-fill when all replacements are
  held, require fresh gate/no-analysis state before live-analysis launch, and
  keep product-evidence signatures visible until a real current representative
  exists.
- Historical duplicate/noise remains dominated by startup/no-product families
  and must not be presented as live product failure.
- This status does not clear PR filing, PR07 owner replay, PR02B validation,
  PR15 final-PR14B materialization, reload-marker replay, seed `1020002`,
  exact branch-link gaps, or final-stack validation.

The latest trend evidence packet was generated at `2026-05-18T22:59:42Z` and
is the latest completed-pass evidence available in this input bundle:

```text
monitor passes: 2301
first pass: 2026-05-15T01:21:42Z
last completed pass: 2026-05-18T22:38:39Z
coverage files: 272 -> 55267
coverage files delta: 54995
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 1
duplicate_share_historical_last: 0.341
summary startup failures last: 0
quality issues last: 0
memory free: 420.1 GB
load averages: 62.69 / 61.33 / 58.42 on 64 cores
enabled groups current: novelty-ws-parser-transform
latest fuzz level mix:
  browser-e2e=41 lanes/38 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5946760
browser-e2e likely-real findings: 777 over 2522.9 runner-hours
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
the trend packet still shows four unmet goals, current duplicate share of `1`,
high historical duplicate share, and high browser E2E yield. Its enabled-group
line predates the `23:07:07Z` startup-only novelty status for the new root; use
the startup status only for current root liveness until a full pass completes.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T225231Z-synthesis.md`, keeps the replacement split and
confirms the active PR07 fork. `PR07B0D-215248` supersedes
`PR07B0D-205218`/`212232`/`213739` as the active clean PR07B0D arm after
nonzero `20260518T220814Z` finalization evidence plus Cycle400 audit/manifest
evidence. The Cycle400 owner replay itself is setup-blocked: all `36/36` rows
are `blocked-before-oracle` because `collaborationEnabled` was `null`. The
new Cycle402 PR07 readiness repair has a nonzero report, but it is still
setup-blocked before oracle with `collaborationEnabled:null`, so no PR07 arm is
promoted. Strict `117126135e5e` and HTTP rejoin `220755` still have no
`report.md` in the latest synthesis. The ready/local and CRDT lanes stay
intact; PR15 must still use canonical endpoint evidence, not fallback-tail or
`d06e3528cbd` PR05D/PR15-derived manifests.

Latest split/persona statuses:

- Run PR07 owner replay for seeds `966001`, `1020001`, and `990001` across
  PR07B0, PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, HOLD-07C, PR03B, PR05B,
  PR05C, clean PR05D, PR14, and canonical PR15D. Do not stack the PR07 arms
  linearly.
- Consume the Cycle400 audit/manifest evidence at
  `runs/20260518T221236Z/jobs/outputs/rtc-cycle400-pr07b0d-215248-audit-owner-replay/`
  as valid branch/audit progress only. Its owner replay has no oracle-bearing
  rows, and the Cycle402 readiness report is still setup-blocked. The next
  PR07 action must reap/mark the completed Cycle402 session and run one
  bounded readiness successor that adjusts only disposable replay setup,
  proves `PR07B0` seed `966001` reaches `collaborationEnabled:true`, and runs
  the full owner matrix only after that sentinel passes.
- Cycle398 PR07 replay produced `0` oracle-bearing rows, and Cycle400 produced
  `36/36` `blocked-before-oracle` rows. Zero-byte, setup-only, all-not-run,
  and all-pre-oracle output is not durable evidence, so PR07 remains blocked
  before owner replay.
- PR02B remains blocked, but the latest blocker is ownership/reproduction, not
  the earlier environment/bootstrap failure. The fresh PR02B validation report
  passed seed `1030001`, the short HTTP persistence probe, and targeted
  `vendor/bin/phpunit phpunit/tests/collaboration/wpHttpPollingSyncServer.php`
  on PR02B, but the PR02 base also passed seed `1030001`. That removes the
  intended base/head failure boundary until owner/repro evidence or a downscope
  decision explains the result.
- Materialize and audit exact PR15 final-PR14B refs before treating
  `PR15A-on-PR14B -> PR15B-on-PR14B -> PR15C-on-PR14B -> PR15D` as final.
  Required evidence includes allowed base, branch/head/manifest agreement,
  adjacent diffstat/numstat, `git diff --check`, and focused CRDT validation.
- Keep strict `117126135e5e`, linebreak/parser/rich-text reductions, and
  reload/rejoin residuals owner-unassigned until lower-control comparison
  proves product ownership. Do not name PR18x from those diagnostics.
- Track `DIAG-HTTP-REJOIN-220755` as a diagnostic side lane only. Its source is
  `deferred/rtc-reload-hydration-20260518T220755Z`, head `f50864062e0f`, base
  `72854f05ed...`, and seed `6000034`; it is HTTP polling rejoin/ack territory
  and must stay out of PR07 unless audit/replay proves a product boundary.
- Keep loop hardening so active sessions, zero-byte reports, `report.tmp`,
  prompt-only outputs, all-`not-run` matrices, setup-smoke output,
  pre-oracle runtime output, disk-preflight-only reports, stale/fallback-tail
  PR05D manifests, stale `PR07C`, raw `PR07D`, raw deferred reload heads,
  zero-byte `20260518T223823Z/finalization.report.md`, PR17, PR18, PR18x, and
  active seed `1020002` do not satisfy progress while actionable independent
  rows remain.

Bounded follow-up jobs named by the split-persona synthesis for the next
evidence pass:

```text
rtc-cycle402-pr07-owner-replay-ws-readiness-repair-215248
  completed with nonzero setup-blocked evidence; reap or mark it, then run one
  bounded readiness successor that proves PR07B0 seed 966001 reaches
  collaborationEnabled:true before running the full
  PR07B0/A/B/C/D-215248/HOLD-07C owner matrix

rtc-cycle402-strict-117126135e5e-owner-comparison
  still reportless in the latest synthesis; let the active job continue, and
  if it exits reportless launch exactly one bounded replacement before
  assigning any product row or PR18x name

rtc-cycle402-http-rejoin-220755-audit-replay
  still reportless in the latest synthesis; let the active job continue, and
  if it exits reportless launch exactly one bounded replacement before
  assigning any HTTP rejoin product row

PR02B owner/repro pass
  explain seed 1030001 base nonreproduction or downscope PR02B before filing

loop/audit hardening
  enforce manifest freshness, bundle/head agreement, and no-zero-byte,
  no-wait-only, and no-all-pre-oracle progress rules
```

The newest duplicate/noise synthesis,
`duplicate-noise-20260518T223507Z-synthesis.md`, finds no blocking
disagreement for a narrow producer-control fix. It recommends restoring
producer pauses from structured sentinel fields, treating current-output
`family-capped` duplicate/noise representatives as enough evidence to hold the
emitting producer, and preserving product-evidence signatures. The latest
completed duplicate feedback-action already performed a bounded cycle-220
remediation on the remote fuzz/control scripts, restarted the coverage-guided
control plane, and validated that strict no-product startup leakage was clean
in the checked consumer path. Its graph duplicate/noise share has not been
refreshed after restart, and the latest raw novelty status is still
startup-only, so this remains control-plane health rather than product or
final-stack validation.

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
| Missing verified product refs | PR02A, PR02B, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-current, PR07B0A-155713, PR07B0B-195150, PR07B0C-201201, PR07B0D-215248, HOLD-07C, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A/B/C-on-PR14B, PR15D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | recommended sidecar, but still blocked; the fresh PR02B validation report passed seed `1030001`, short HTTP probe, and targeted PHPUnit on PR02B, but the PR02 base also passed seed `1030001`, so the owner/repro boundary is missing | Require owner/repro evidence or a downscope decision, then PR CI and exact branch-link audit before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0, PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, HOLD-07C, reload/provider evidence | runtime readiness remains unresolved; PR07B0D-215248 is the active clean arm with fresh Cycle400 audit/manifest evidence, but Cycle398 replay produced `0` oracle-bearing rows and Cycle400 produced `36/36` `blocked-before-oracle` rows from `collaborationEnabled:null` | Repair PR07 collaboration readiness first, then replay seeds `966001`, `1020001`, and `990001` across the required arms and controls; require first-divergence/owner evidence plus clean materialized refs |
| Historical PR07B0D controls / failed raw reload refs | raw `deferred/rtc-reload-hydration-20260518T203210Z`, raw `210726`, `PR07B0D-205218`, `PR07B0D-212232`, `PR07B0D-213739`, and related manifests | out of the active fork; `PR07B0D-215248` supersedes those B0D variants, while Cycle394 `203210` failed on both touched files | Reconsider only after bounded conflict-resolution/downscope produces a clean allowed-base artifact with bundle/head/manifest agreement and owner replay justifies promotion |
| PR07D / PR17 / PR18 / PR18x | reload/post-save/rejoin residuals and old linear tail | rejected for the current split | Reconsider only after owner replay proves a product-owned boundary not covered by the accepted PR07 fork |
| DIAG-HTTP-REJOIN-220755 | source `deferred/rtc-reload-hydration-20260518T220755Z`, head `f50864062e0f`, base `72854f05ed...`, seed `6000034` | blocked diagnostic side lane only; no verified branch link yet and not part of PR07 | Audit/replay the HTTP polling rejoin/ack signal before assigning any product PR row |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates | diagnostic or held until owner comparison proves product ownership | Compare against PR05B, PR05C, clean PR05D, the chosen PR07 path, holds, PR14, and canonical PR15D before assigning any new owner row |
| Revision-restore strict signal | `117126135e5e`, PR03, held PR03B, PR07 arms | owner-comparison target only; not a split row or product fix by itself | Compare against PR03, held PR03B, PR07 arms, and lower controls before claiming a new owner boundary |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06, PR06A prior-art, and PR06B progress refs are verified; active PR06A-D and PR06E still have no exact verified micro-split links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, accepted PR07 fork non-ancestry where required, old HOLD non-ancestry, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B, PR15A/B/C-on-PR14B, and PR15D | branch-link audit verifies PR15A-C component prior art, but no exact final-PR14B materialized refs or PR15D endpoint link; zero-byte finalization and header-only manifests do not count | Publish/fetch/audit exact PR14B-based refs, resolve PR15D, confirm ancestry, and require nonzero materializer/audit evidence |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only; do not wait on it before running independent PR07/PR02B/strict-owner work | Repair or explicitly reclassify before final-stack validation and filing |
| Reload marker/lifecycle work | HARNESS reload markers, seeds `990001`/`990003`, same-user lifecycle seeds, PR07C seeds, deferred reload outputs | harness/diagnostic only until replay proves product ownership | Consume PR07 owner replay when present, then require product-owned first-loss boundary before promotion |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, startup-noise cooldowns, empty materialization rescue, family-capped duplicate holds, live/analysis duplicate-family admission | cycle-220 remediation is complete on the remote control scripts; node syntax checks passed, the checked consumer path was clean for strict no-product startup leakage, and the new-root novelty status is startup-only, so group enablement, paused-family state, and graph duplicate/noise share must be reread after a full pass instead of inferred from the previous root | Continue watching the replacement run; do not treat this control-plane fix as product validation or final-stack readiness |
| Current fuzz validation | `run-20260518T225956Z`, novelty status at `2026-05-18T23:07:07.412Z`, trend generated at `2026-05-18T22:59:42Z` | latest novelty status is startup-only with `90517` previous records loaded, `605` observed roots, one supervisor groups file, and one active run dir; latest completed trend packet has `55267` coverage files, `4` unmet goals, current duplicate share `1`, and browser-e2e `777` historical likely-real findings over `2522.9` runner-hours | Use as health/control-plane evidence only; still require owner replay, PR02B validation/downscope, PR15 final-PR14B audit, exact branch audit, reload-marker downscope, seed `1020002` handling, and final PR-stack validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw `155713`, raw
`PR07B0B-195150`, raw `PR07B0C-201201`,
`PR07B0D-205218`/`212232`/`213739` historical controls, raw
`PR07B0D-215248`, raw
`203210`, raw `210726`, raw PR07D, raw `HOLD-07C`, PR17, PR18, PR18x,
zero-byte finalization output including `20260518T223823Z/finalization.report.md`,
header-only push manifests, or local finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement split above: ready/local lane, CRDT/data-loss lane, and
   PR07 converted into a runtime-gated decision fork rather than the old
   PR07/PR17/PR18 tail.
2. Treat PR07B0A, PR07B0B, PR07B0C, PR07B0D-215248, and HOLD-07C as blocked
   sibling owner candidates. Keep failed `203210`, raw `210726`, raw PR07D,
   stale PR07C ready refs, raw `HOLD-07C`, historical `205218`/`212232`/`213739`
   controls, PR17, PR18, and PR18x out unless later conflict-resolution/downscope
   work produces clean allowed-base evidence.
3. Do not file PR02B before the seed `1030001` base/head nonreproduction is
   explained or downscoped, then PR CI and verified GitHub branch-link audit
   pass.
4. Do not file PR07 until PR07B0A/B/C/D and the hold/lower-control matrix has
   oracle-bearing owner replay outputs, first-divergence evidence, clean
   materialized refs, exact branch links, and `git diff --check`.
5. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
6. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, clean PR05D only,
   PR15A/B/C/D after final PR14B materialization, and no fallback-tail PR05D.
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
   missing rows, PR02B validation, PR15 final-PR14B materialization,
   reload-marker replay/downscope, strict `117126135e5e` comparison if it
   remains product-owned, and seed `1020002` repair or reclassification land,
   rebuild the combined validation stack from explicit Cycle325/i40 heads plus
   accepted epoch work, then run focused checks, touched-file lint, branch
   graph/containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

Useful bounded work now:

- reap or mark the completed Cycle402 PR07 readiness session, then run exactly
  one bounded readiness successor so `PR07B0` seed `966001` proves
  `collaborationEnabled:true` before the full matrix; include
  `PR07B0D-215248` only after readiness passes and require a nonzero
  owner-replay report plus non-header `classification.tsv`, `replay-runs.tsv`,
  `first-divergence.tsv`, `owner-matrix.tsv`, and per-arm artifacts;
- let the active `rtc-cycle402-strict-117126135e5e-owner-comparison` continue;
  if it exits reportless, launch exactly one bounded replacement before
  assigning any strict revision-restore product row or PR18x name;
- let the active `rtc-cycle402-http-rejoin-220755-audit-replay` continue; if it
  exits reportless, launch exactly one bounded replacement before assigning any
  HTTP polling rejoin/ack product row, and keep it out of PR07 unless replay
  proves a product-owned boundary;
- consume PR02B validation as blocked-owner/repro evidence: it already passed
  seed `1030001`, the HTTP probe, and targeted PHPUnit on the head, but the
  base also passed, so do not launch a duplicate validation repair without a
  new owner/downscope reason;
- publish/fetch/audit exact GitHub refs for the active PR15A/B/C-on-PR14B
  rows only after a nonzero final-PR14B materializer/audit report, then resolve
  and audit the canonical PR15D endpoint;
- keep the progress-controller hardening in force so prompt-only, manifest-only,
  preflight-only, blocked-validation, owner-unassigned, setup-only, zero-byte,
  header-only, duplicate-head, stale-manifest, or stopped-child artifacts never
  count as completed progress;
- do not launch another duplicate/noise control-plane job before the first
  post-restart novelty full pass unless the current root shows renewed leakage;
  if needed, keep any follow-up bounded to producer holds from structured
  sentinel/family-capped evidence while preserving product-evidence visibility;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw `203210` or raw `210726` publication/replay, raw
`PR07B0D-215248` publication before owner replay and verified GitHub branch
audit,
`PR07B0D-205218`/`212232`/`213739` promotion, raw PR07D, raw deferred
publication, raw `HOLD-07C`, PR17, PR18, PR18x promotion,
`DIAG-HTTP-REJOIN-220755` promotion before audit/replay, reload-marker product
promotion before replay, broad consumer duplicate/noise suppression, or extra
browser lanes.
