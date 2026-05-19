# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T15:53:50Z`

Trigger event:
`duplicate-noise-2026-05-19T15-53-03Z-266`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-19T15-53-03Z-266/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The latest split-persona synthesis, `pr-split-20260519T082842Z-synthesis.md`,
keeps the ready `044015Z` split through `PR15C` as the usable maintainer-facing
shape. The split now records reload hydration only as a blocked
`RLH-6000007-candidate` / working label `PR16-RLH@0788a6e3713`, not as a
fileable PR. Cycle444 produced fresh row-bearing manifest/audit evidence for
that clean candidate, but strict `8fb598778357` / seed `6000007` stopped before
the final `createPersistedCRDTDoc()` persistence parity oracle, leaving owner
`undetermined`. Cycle446 therefore launched one bounded strict-head
reproduction-repair job; its report is still pending.

- The fileable prefix remains `PR01` through `PR15C`, with `PR02A`, `PR06E`,
  and `HARNESS-WS-CONFIG-022004` as side/support rows.
- `RLH-6000007-candidate` / `PR16-RLH@0788a6e3713` is a replay candidate only.
  It must not move earlier as `PR06F`, be filed as `PR16`, or justify raw
  `PR07`/reload publication until strict `6000007` reaches the final
  persistence oracle and owner rows prove it clears while preserving final
  convergence, REST/editor alignment, and `operationLedger.missing=0`.
- `RLH-A`, raw reload-hydration heads, raw `PR07D`, stale `PR07C`, stale
  `PR15D`, `PR17`, `PR18`, `PR18x`, stale `PR05E`, and fallback/PR15-tail
  `PR05D` stay non-fileable.
- Strict `8fb598778357` / seed `6000007` remains likely-real but ownerless.
  Cycle444 has nonzero row-bearing artifacts, but classification is
  `strict-head-not-reproduced` and `owner=undetermined`; next evidence must be
  the Cycle446 strict-head reproduction repair, not owner naming.
- Strict `c5c009f618b2` / seed `6000034` waits until seed `6000007` has durable
  owner rows or is explicitly classified stale/inactionable.
- Pre-save search/live-collapse and rich-text suffix stay diagnostic/deferred.
  Do not assign `PR18x` or product ownership until focused replay compares the
  right parser/rich-text owners and produces row-bearing owner evidence.

Current maintainer-facing split hypothesis:

```text
Main ready lane:
  PR01 -> PR02 -> PR03 -> PR04 -> PR05A -> PR05B -> PR05C
  -> clean PR05D -> PR06A -> PR06B -> PR06C -> PR06D
  + PR02A and PR06E sidecars

CRDT/data-loss lane:
  PR09 -> PR10
  -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
  -> PR12A -> PR12B -> PR12C
  -> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
  -> PR14 -> PR14B -> PR15A -> PR15B -> PR15C

Harness-only sidecar:
  HARNESS-WS-CONFIG-022004

Non-fileable or evidence-only:
  ENTITY-SERIALIZATION-1000009
  RLH-6000007-candidate / PR16-RLH@0788a6e3713, blocked on strict replay
  strict 8fb598778357 / seed 6000007 strict-head reproduction repair
  strict c5c009f618b2 / seed 6000034 after 6000007 settles
  strict 117126135e5e / seed 5400020 unnamed diagnostic queue
  seed 1020002 repair/reclassification
  RLH-A, raw reload hydration, raw PR07D, stale PR07C, stale PR15D
  PR17, PR18, PR18x, stale PR05E
  fallback/PR15-tailed PR05D manifests
  raw deferred search/rich-text/malformed-save/HTTP-room-isolation evidence
```

The ready local branch set is still anchored by the `044015Z` prefix through
`PR15C`. The `081123Z` finalization report created `47` clean refs under
`finalized/rtc-pr-stack-20260519T081123Z/*`, kept the reload candidate blocked,
verified adjacent ancestry and `git diff --check`, and showed the clean
`080005` candidate is patch-equivalent to raw
`deferred/rtc-reload-hydration-20260519T080005Z@60b32830a23`. That is
publication/audit evidence for local planning only. It is not GitHub filing,
CI, upstream rebase, final-stack validation, or a substitute for verified
branch-link audit rows.

Cycle432 reload replay remains important background evidence: current `PR15C`,
`RLH-CLEAN`, `PR07B0`, and `PR07C` all failed seeds `6000007` and `966001`.
Cycle444 then showed `RLH-6000007-candidate` is clean and patch-equivalent to
the deferred reload fix, but did not reproduce strict head through the final
persistence oracle. The new candidate is therefore blocked evidence, not a PR.

The latest duplicate/noise synthesis,
`duplicate-noise-20260519T152550Z-synthesis.md`, keeps the remaining issue in
the fuzz control plane, not in RTC product code. The consensus root cause is
inconsistent current-output product-evidence semantic-family capping: real
reload/save/collaboration failures should remain visible, but sibling
signatures from the same current semantic family should not keep launching
first-level, deep, or live analysis work.

The paired `duplicate-noise-20260519T152550Z-feedback-action.md` is now the
latest completed control-plane action. It made current-output family caps apply
to all product-evidence semantic families in first-level analysis, live
analysis, deep analysis, novelty scheduling, and direct triage launch paths:
`rtc-browser-fuzz-analysis-tier.mjs`,
`rtc-browser-fuzz-live-analysis-monitor.mjs`,
`rtc-browser-fuzz-deep-analysis-tier.mjs`,
`rtc-browser-fuzz-novelty-monitor.mjs`, and
`rtc-browser-fuzz-triage-watcher.mjs`. Product-evidence representatives remain
visible; duplicate siblings are family-capped rather than globally suppressed.

Validation for that action passed `node --check` on all five touched fuzz
scripts. Gate-only triage refreshes and a live-analysis one-shot capped
product-evidence duplicate siblings such as `collaboration_non_convergence`
and `persisted_content_mismatch` while preserving representatives. Strict
startup queued/running signatures are `0`. `rtc-coverage-guided-novelty` and
`rtc-coverage-guided-analysis` were restarted; the supervisor was not changed.
The latest collected novelty status is for
`/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T145026Z`;
it has two active current-run dirs, enabled `parser-transform` and
`real-user-rich-text` producers, 35 current-run WebSocket records, 23
successful current-run records, 0 current actionable signatures, 12 raw
product-evidence signatures, 1 known-infra signature, 8 family-capped
signatures, 3 analysis-gated non-actionable signatures, 1 visible likely-real
representative, and current actionable duplicate share `0`. Treat that as
constrained control-plane health evidence, not final-stack validation or
product-fix evidence.

Seed `1020002` still blocks final-stack fuzzing, rebuilt stack-wide validation,
GitHub filing, and its own repair/reclassification. It must not serialize
independent branch audits, deferred closeout, strict owner comparison, or loop
repair.

## Branch And Ref Status

Remote status was collected at `2026-05-19T15:53:45Z`.

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

The branch-link audit was generated at `2026-05-19T15:53:50Z` from fetched
`danluu` refs. A row marked `verified-content` means the branch exists on
`danluu` and has a non-empty audited diff against the listed base. It does not
prove final publication shape, owner evidence, CI, upstream rebase, or filing
readiness.

Use only these repaired audited PR13 review refs for PR13 content:

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
branch-link audit or explicitly says `No verified branch link yet`. Rows with
no verified branch link are not file-ready.

### Main Ready Lane

| PR | Scope | Audit branch link | Files / diff | Current status |
| --- | --- | --- | --- | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 files, +181 / -19 | verified content; Cycle428 local manifest audit complete; GitHub filing still blocked |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 files, +57 / -5 | verified content; Cycle428 local manifest audit complete; GitHub filing still blocked |
| PR 2A | HTTP room-isolation sidecar | No verified branch link yet | TBD | active sidecar candidate; needs deferred closeout proof that it covers HTTP room isolation and a pushed/audited ref |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 files, +58 / -5 | verified content; released by lower-boundary classification and local manifest audit |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 files, +160 / -1 | verified content; Cycle428 local manifest audit complete; GitHub filing still blocked |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | active split row in Cycle428 manifest; aggregate PR5 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | active split row; compare strict/rich-text signals here before naming PR18x |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | active split row; compare strict/rich-text signals here before naming PR18x |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | active split row; must stay the clean semicolonless/entity branch; reject fallback/PR15-tailed PR05D manifests |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | active split row; do not confuse with the older persisted-empty-content PR6A audit row |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | active split row; progress branch is evidence only |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | active split row |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | active split row; PR09 and PR06E ancestry still need GitHub branch-link proof before filing |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | sidecar must hang from PR06D, not PR07; needs deferred closeout proof that it covers malformed-save |
| HARNESS-WS-CONFIG-022004 | WebSocket harness configuration sidecar | No verified branch link yet | TBD | harness-only; not a product fix and not final-stack validation |

### CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files / diff | Current status |
| --- | --- | --- | --- | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 files, +185 / -2 | verified content; Cycle428 local manifest audit complete; GitHub filing still blocked |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 files, +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | active split row; grouped PR11 is aggregate prior art only |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | active split row |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | active split row |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | active split row |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | active split row |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | active split row; grouped PR12 is aggregate prior art only |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | active split row |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | active split row |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 files, +1151 / -25 | repaired verified content; use this audited ref for PR13A |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 files, +1672 / -4 | repaired verified content; use this audited ref for PR13B unless a later audit publishes PR13B0-B3 links |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 files, +345 / -51 | repaired verified content; use this audited ref for PR13C unless a later audit publishes PR13B0-B3 links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 files, +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | required before active PR15A-C; needs final-PR14B materialization/audit |
| PR 15A | Fallback-group move green on PR14B | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | 2 files, +123 / -4 | verified component content; filing still waits on exact publication links, owner gates, and final validation |
| PR 15B | Fallback-group insert-anchor green on PR14B | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | 2 files, +197 / -4 | verified component content; filing still waits on exact publication links, owner gates, and final validation |
| PR 15C | Fallback-group delete green on PR14B | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | 2 files, +161 / -4 | canonical endpoint; Cycle432 reload replay failures mean reload hydration is still an owner-comparison/evidence queue, not a PR15C filing blocker by itself |

### Verified Prior Art, Not Active Proposed Rows

These rows have verified audit links, but they are not the exact active
micro-split PR rows unless the status says so.

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 6B progress | Malformed save request payload minimal branch | [`danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal`](https://github.com/danluu/gutenberg/tree/danluu/rtc-pr-progress-rtc-pr06b-malformed-save-request-payload-minimal) | verified progress branch; evidence only, not a substitute for PR06A-D/PR06E placement proof |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07 owner fork |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07 owner fork |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |

## Deferred Or Evidence-Only Work

These rows must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| Missing verified active refs | PR02A, PR05A-D, PR06A-D, PR06E, PR11A-E, PR12A-C, PR14B, exact refreshed stack refs, `HARNESS-WS-CONFIG-022004` | active rows with no branch-link audit entry correctly say `No verified branch link yet`; local `044015Z` and `081123Z` publication/finalization evidence is not a verified GitHub branch-link audit | Publish/fetch/audit explicit GitHub refs for every active row that still lacks a verified branch link |
| ENTITY-SERIALIZATION-1000009 | seed `1000009`, lower-boundary rows | completed lower-boundary evidence classifies this as `base-or-harness-pre-stack`, not a PR02/PR05/PR07/PR18x product owner | Keep out of product PR split unless a newer row-bearing report contradicts the classification |
| Strict persistence parity repair | strict `8fb598778357`, seed `6000007` | top non-`1020002` likely-real queue; Cycle444 produced nonzero row-bearing artifacts but `strict-head-not-reproduced` and `owner=undetermined`; Cycle446 launched one strict-head reproduction repair job and its report is pending | Consume `runs/20260519T082842Z/jobs/outputs/rtc-cycle446-strict-8fb598778357-seed6000007-head-reproduction-repair/report.md` when nonempty; require row-bearing `branch-inputs.tsv`, `replay-runs.tsv`, `owner-matrix.tsv`, `first-divergence.tsv`, `classification.tsv`, and `manifest-audit.tsv` before assigning ownership |
| Next strict owner queue | strict `c5c009f618b2`, seed `6000034` | next strict likely-real owner-comparison queue; not a named PR and not `PR18x` | Do not launch until seed `6000007` has durable owner rows or is explicitly classified stale/inactionable |
| Unnamed strict diagnostic | strict `117126135e5e`, seed `5400020` | remains unnamed; no `PR18x` until earlier plausible owners are compared | Keep as diagnostic evidence until owner replay proves a product-owned branch |
| RLH-6000007 candidate | clean candidate `finalized/rtc-pr-stack-20260519T081123Z/candidate/rtc-pr16-reload-hydration-block-content-invalidation-080005` at `0788a6e3713`, patch-equivalent to raw `deferred/rtc-reload-hydration-20260519T080005Z@60b32830a23` | blocked replay candidate only; Cycle444 verified clean manifest/audit evidence but did not reproduce strict head to the final persistence oracle | Do not file as `PR16` or move to `PR06F`; first reproduce strict head for seed `6000007`, then prove owner rows clear against `HARNESS-WS-CONFIG`, `PR06D`, `PR15C`, `RLH-CLEAN`, this candidate, `PR05B`, `PR05C`, clean `PR05D`, `PR07B0`, `PR07C`, and `PR14` |
| RLH-A / raw reload hydration | `RLH-A`, raw reload heads, `RLH-CLEAN`, `PR07B0`, `PR07C`, older deferred candidates including `ba186c18166b` | evidence-only/downscope; Cycle432 row-bearing replay shows `PR15C`, `RLH-CLEAN`, `PR07B0`, and `PR07C` all fail seeds `6000007` and `966001`; older raw/deferred candidates are stale relative to the clean `081123Z` candidate | Keep raw reload and PR07 arms out of filing; use only fresh strict replay and verified clean refs for any future promotion |
| Seed `1020002` WebSocket marker divergence | final-stack repair/reclassification lane | blocks final-stack fuzzing, filing, rebuilt validation, and its own repair/reclassification only | Repair or explicitly reclassify before final-stack validation and filing; do not serialize independent work behind it |
| PR07 runtime / owner gate | PR07A/B arms and raw PR07D variants | non-fileable owner-comparison fork; raw `PR07D` remains excluded | Require row-bearing owner matrices with first-divergence evidence, current endpoint controls, clean refs, and branch audit before promotion |
| Deferred closeout | PR02A HTTP room isolation, PR06E malformed-save, reload downscope | still evidence/placement work; not a reason to block strict `6000007` repair or branch-link audit | Verify PR02A covers HTTP room isolation, PR06E covers malformed-save, and reload candidates remain downscope/evidence-only unless strict replay proves otherwise |
| Pre-save search/live-collapse | search/live-collapse candidates, diagnostic branch around `5cc25e...` | Cycle438 pre-save diagnostic hardening verified base/head/manifest agreement and `diff_check=pass`; this is local-machine diagnostic publication evidence only, not product promotion | Run focused replay/validation before adding any PR row |
| PR05E and rich-text/parser reductions | PR05E text, rich-text suffix around `868cd...`, parser/linebreak candidates, `PR18x` | rich-text suffix remains diagnostic and still needs fresh row-bearing hardening or replay output; latest guidance still says do not name `PR18x` until PR05B/PR05C/clean PR05D and other plausible owners are compared | Harden the diagnostic manifest first, then compare against lower controls and clean split heads before promotion |
| PR15D endpoint/control | stale Cycle324/Cycle325/Cycle376 PR15D rows and later repaired endpoint manifests | blocked/control-only; current endpoint remains PR15C | Accept PR15D only with fresh current-base head/bundle/manifest proof after PR15C |
| Raw deferred manifests | raw `003407`, raw `020456`, raw `024016`, fallback/PR15-tail bases, raw `PR07D` | invalid PR progress; wrong/stale base or missing same-cycle allowlisted base/head/bundle/manifest agreement | Keep as no-progress unless a new audit proves clean allowlisted base, head/bundle/manifest agreement, and ownership/non-coverage |
| Duplicate/noise producer control-plane | no-product `pre_action_bootstrap_stall`, endpoint-mismatch port bleed, `fuzz_helper_rest_endpoint_construction`, supervisor seed-drain recovery, novelty bootstrap/admission, stale historical/cross-root duplicate holds, product-preserving no-analysis drain promotion, product-evidence semantic-family sibling launches | `152550Z` is now the latest completed feedback action: first-level analysis, live analysis, deep analysis, novelty scheduling, and direct triage launch paths now apply current-output product-evidence semantic-family representative caps; syntax checks passed for all five touched scripts; novelty and analysis monitors were restarted; latest active-current state is `enabledGroups=novelty-ws-parser-transform,novelty-ws-real-user-rich-text`, current-run `parser-transform=31`, `real-user-editing=4`, successful `parser-transform=20`, successful `real-user-editing=3`, raw signatures `12`, actionable signatures `0`, known-infra `1`, family-capped `8`, analysis-gated non-actionable `3`, product-evidence signatures `0`, likely-real visible `1`, strict startup queued/running `0`, and current actionable duplicate share `0` | Keep product-evidence signatures visible, preserve one representative per semantic family, monitor drain-visible representatives separately from active current output, and treat the active parser-transform / real-user-rich-text root as constrained control-plane health evidence rather than final-stack validation |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T15:53:45Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T145026Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The latest raw novelty monitor status was written at
`2026-05-19T15:53:03.395Z` for `run-20260519T145026Z`. Its heartbeat is fresh;
metrics are from the most recent completed full pass at
`2026-05-19T15:51:53.386Z`. It has completed a full pass for the current root
and is running parser-transform plus real-user rich-text producers:

```text
coverage files: 3120
total records seen: 105467
current-run active dirs: 2
enabled groups:
  novelty-ws-parser-transform
  novelty-ws-real-user-rich-text
current-run records:
  parser-transform=31
  real-user-editing=4
current-run successful records:
  parser-transform=20
  real-user-editing=3
current-run transport:
  ws=35
unmet goals: 15
recommended groups:
  novelty-ws-real-user-title-body-save-reload
  novelty-ws-real-user-save-reload
  novelty-ws-real-user-editing
  novelty-ws-real-user-rich-text
  novelty-ws-common-blocks
  novelty-ws-block-gauntlet
  novelty-ws-parser-transform
  novelty-ws-async-server-blocks
  novelty-ws-media-cross-entity
  novelty-ws-long-session-large-doc
headroom for adding groups: no
active current-run likely-real visible: 1
active current-run raw signatures: 12
active current-run actionable signatures: 0
active current-run product-evidence signatures: 0
active current-run raw product-evidence signatures: 12
active current-run known-infra signatures: 1
active current-run family-capped signatures: 8
active current-run analysis-gated non-actionable signatures: 3
active current-run top duplicate family share: 0
active current-run raw top duplicate family share: 0.4167
current drain visible signatures: 2
current drain raw signatures: 29
current drain product-evidence signatures: 2
current drain likely-real visible: 3
current drain family-capped signatures: 18
current drain top duplicate family share: 0.5
historical likely-real visible: 49
historical likely-real merged duplicates: 92
historical oracle/noise questions: 3
historical top duplicate family share: 0.1111
historical raw top duplicate family share: 0.2952
```

Interpretation:

- Do not claim final-stack cleanliness. The newest novelty output is current
  monitor health for a constrained coverage-guided run, not validation of the
  accepted final PR stack.
- The completed `152550Z` control-plane action made product-evidence
  current-output semantic-family capping authoritative across novelty
  scheduling, triage launch, first-level analysis, deep analysis, and live
  analysis. The latest full novelty pass confirms no active current-root
  actionable signature pressure; raw signatures are known-infra, family-capped,
  or analysis-gated non-actionable while one likely-real representative remains
  visible.
- The current materialization has moved from real-user save/reload to
  parser-transform plus real-user rich-text depth. Save/reload and common-block
  producers are paused under duplicate/noise cooldowns rather than deleted; the
  active root still has fifteen auto-ratchet goals open and no resource
  headroom for broad new groups.
- Historical/combined reporting still carries prior product-evidence signatures,
  startup-noise history, and historical likely-real counts. Keep those as
  context rather than live current failures unless the new root reproduces them
  with current evidence.
- Current fuzz health does not clear PR filing, branch-link gaps, PR07 owner
  replay, strict owner replay, reload-hydration downscope, seed `1020002`, or
  final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T15:40:18Z`:

```text
monitor passes: 2505
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-19T15:37:11Z
coverage files: 272 -> 2945
coverage files delta: 2673
unmet goals: 15
likely_real_max: 4
duplicate_share_current_last: 0.25
duplicate_share_historical_last: 0.2
summary startup failures last: 0
quality issues last: 0
memory free: 413.1 GB
load averages: 84.75 / 75.52 / 73.03 on 64 cores
latest fuzz level mix:
  browser-e2e=38 lanes/26 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6254201
browser-e2e likely-real findings: 858 over 2845.9 runner-hours
```

Largest unmet goals in the trend packet now include CDP coverage and real-user
action depth:

```text
cdp-coverage-records: 7576/20000
ui-heading-shortcut: 1617/5000
ui-undo-redo-paragraph: 2168/5000
ui-format-paragraph: 2540/5000
real-user-editing success: 938/2000
```

The newer novelty status shows those goals continuing to advance:

```text
cdp-coverage-records: 7602/20000
ui-heading-shortcut: 1621/5000
ui-undo-redo-paragraph: 2172/5000
ui-format-paragraph: 2544/5000
real-user-editing success: 941/2000
title-save-reload: 945/2000
body-save-reload: 1004/2000
reload-post-action: 1492/2000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. Load is high enough that new fuzz work should stay
bounded and oracle-specific rather than increasing broad browser concurrency.
The graph-derived trend packet reports current duplicate share `0.25`,
historical duplicate share `0.2`, no latest summary startup failures, and no
latest quality issues. The raw novelty status is newer and more specific for
the active root; it reports current actionable duplicate share `0`, no current
actionable product-evidence signatures, and one preserved likely-real
representative. Treat both as constrained health evidence, not publication
readiness.

## Status-Persona Analysis

The current split-persona synthesis, `pr-split-20260519T082842Z-synthesis.md`,
and its paired `pr-split-20260519T082842Z-feedback-action.md` supersede
`081549Z`, `075928Z`, `074855Z`, `073322Z`, `072342Z`, `070410Z`, `065428Z`,
and earlier wording where they differ:

- Keep the ready `044015Z` fileable prefix through `PR15C`: main
  `PR01`-`PR06D` plus `PR02A`/`PR06E`, CRDT `PR09`-`PR15C`, and the
  harness-only `HARNESS-WS-CONFIG-022004` sidecar.
- Change `PR16-RLH` from a fileable numbered slot to blocked
  `RLH-6000007-candidate` on the clean `081123Z` candidate `0788a6e3713`.
- Keep `RLH-A`, raw reload hydration, raw `PR07D`, stale `PR15D`, `PR17`,
  `PR18`, `PR18x`, `PR05E`, and fallback-tail `PR05D` non-fileable.
- Treat strict `8fb598778357` / seed `6000007` as likely-real but ownerless.
  Cycle444 produced a fresh nonzero manifest/audit for the clean candidate, but
  replay stopped before the persistence parity oracle, so no owner rows are
  valid.
- Consume the single Cycle446 strict-head reproduction-repair job instead of
  launching another owner matrix. It must first make
  `try/rtc-fix-stack-validation@72854f05ed20106daac3d125206f2643dac41677`
  reach the final persistence parity oracle; only then may it run owner rows
  against `HARNESS-WS-CONFIG`, `PR06D`, `PR15C`, `RLH-CLEAN`,
  `RLH-6000007-candidate`, `PR05B`, `PR05C`, clean `PR05D`, `PR07B0`,
  `PR07C`, and `PR14`.
- Do not launch strict `c5c009f618b2` / seed `6000034` until seed `6000007`
  has durable owner rows or is explicitly classified stale/inactionable. Keep
  strict `117126135e5e` / seed `5400020` unnamed.
- Treat pre-save-search/live-collapse and rich-text suffix as
  diagnostic/deferred only. The pre-save branch has Cycle438
  base/head/manifest and `diff_check=pass` hardening; rich-text suffix still
  needs row-bearing hardening or replay. Neither should become `PR18x` without
  owner comparison against `PR05B`, `PR05C`, clean `PR05D`, and other plausible
  owners.
- Keep `PR05D` as the clean semicolonless/entity branch; reject manifests
  based on `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or
  fallback/PR15 tails.
- Seed `1020002` blocks final-stack fuzzing, stack-wide validation, GitHub
  filing, and its own proof/reclassification only. It must not block strict
  `6000007` repair, diagnostic audits, branch audits, deferred closeout, or
  loop repair.
- Repair/enforce loop-gate accounting: if Parallel Progress Gate rows remain
  actionable, wait-only/no-progress feedback must fail acceptance. Active
  sessions, stale manifests, duplicate diagnostic heads, prompt-only PASS rows,
  zero-byte reports, setup smoke, and stale PR07C/HOLD state are not progress.

The latest duplicate/noise synthesis,
`duplicate-noise-20260519T152550Z-synthesis.md`, classifies the remaining issue
as current-output product-evidence semantic-family admission/accounting, not an
RTC product failure. Its paired
`duplicate-noise-20260519T152550Z-feedback-action.md` is now the latest applied
control-plane fix:

- Product-evidence failures remain visible, but current-output semantic-family
  caps now preserve one representative and cap duplicate siblings across
  first-level analysis, live analysis, deep analysis, novelty scheduling, and
  direct triage launch paths.
- `node --check` passed for `rtc-browser-fuzz-analysis-tier.mjs`,
  `rtc-browser-fuzz-live-analysis-monitor.mjs`,
  `rtc-browser-fuzz-deep-analysis-tier.mjs`,
  `rtc-browser-fuzz-novelty-monitor.mjs`, and
  `rtc-browser-fuzz-triage-watcher.mjs`.
- Gate-only triage refreshes and a live-analysis one-shot capped
  product-evidence duplicate siblings, including
  `collaboration_non_convergence` and `persisted_content_mismatch`, while
  keeping representatives visible.
- Strict startup queued/running signatures are `0`.
- `rtc-coverage-guided-novelty` and `rtc-coverage-guided-analysis` were
  restarted with new processes at `2026-05-19 15:49:02 UTC`; the supervisor
  remains the earlier active process because supervisor code was not changed.
- Current measurable status from the collector is
  `enabledGroups=novelty-ws-parser-transform,novelty-ws-real-user-rich-text`,
  current-run `parser-transform=31`, current-run `real-user-editing=4`,
  successful `parser-transform=20`, successful `real-user-editing=3`, raw
  signatures `12`, actionable signatures `0`, known-infra `1`,
  family-capped `8`, analysis-gated non-actionable `3`,
  product-evidence signatures `0`, likely-real visible `1`, and current
  actionable duplicate share `0`.
- Remaining risk: paused/no-analysis drain dirs still expose two
  product-evidence representatives for reporting/cleanup. That is intentional
  visibility, not authority to launch duplicate sibling analysis.

The earlier `083141Z`, `090846Z`, `100615Z`, `104720Z`, `113555Z`,
`122914Z`, `131020Z`, `135628Z`, and `143930Z` actions remain valid background
for mixed strict-startup thresholds, supervisor guardrails, consumer-side
duplicate family capping, representative accounting, first recovery from empty
materialization, product-evidence duplicate holds, fleet startup holds,
product-evidence fallback parsing, no-product minimums, producer/admission
recovery, and product-preserving no-analysis drain admission. The `152550Z`
action supersedes the active duplicate/noise control-plane status. Do not
broaden the fix into blanket product-evidence, WebSocket, startup, awareness,
or `waitForSyncCycle` suppression.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance,
and old PR13 GitHub-ref caveats are superseded by the current branch-link
audit, the repaired PR13 review refs, the `082842Z` split synthesis, and the
latest novelty/trend evidence.

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped PR05, PR06, PR11, PR12,
or PR15 as active units unless a newer row-bearing audit explicitly replaces
the micro-split with a clearer grouped unit. Do not file stale Cycle293/Cycle306
rows, stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw PR07 arms, stale
PR15D, raw reload-hydration refs, zero-byte reports, header-only matrices,
header-only push manifests, or local finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Start from the completed Cycle428 post-boundary manifest audit at
   `/media/volume/danluu-fuzz-data/rtc-pr-split-review-20260515/runs/20260519T043141Z/jobs/outputs/rtc-cycle428-post-boundary-push-manifest-audit/push-manifest.tsv`.
2. Preserve that audit's exclusions for raw deferred heads, raw `PR07D`, stale
   `PR15D`, `PR17`, `PR18`, `PR18x`, fallback tails, runtime-gated
   reload-hydration refs, validation-local-delete refs, and seed `1020002`.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`, including `HARNESS-WS-CONFIG-022004` if it
   is to be filed as a harness-only sidecar.
4. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`, accepted PR07
   fork non-ancestry where required, old HOLD non-ancestry, only the corrected
   clean PR05D path, and PR15A/B/C after final PR14B materialization.
5. Use only the repaired PR13A/PR13B/PR13C audit links listed above as PR13
   content links. Do not use stale/misordered PR13 refs.
6. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
7. After branch-link audit for missing rows, PR15C endpoint materialization,
   PR15D control-only proof or fresh rejection, reload-marker replay/downscope,
   seed `1020002` repair or reclassification, upstream rebase, and PR CI land,
   rebuild the combined validation stack from explicit accepted heads. Then run
   focused checks, touched-file lint, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

Useful bounded work now:

- consume the active Cycle446 strict `8fb598778357` / seed `6000007`
  reproduction-repair job:
  `runs/20260519T082842Z/jobs/outputs/rtc-cycle446-strict-8fb598778357-seed6000007-head-reproduction-repair/report.md`;
- require that job to reach the final persistence parity oracle before
  accepting owner rows for `HARNESS-WS-CONFIG`, `PR06D`, `PR15C`, `RLH-CLEAN`,
  `RLH-6000007-candidate`, `PR05B`, `PR05C`, clean `PR05D`, `PR07B0`,
  `PR07C`, and `PR14`;
- do not launch duplicate strict owner/reload jobs, strict `c5c009f618b2`, or
  broad/final-stack fuzzing while the Cycle446 strict repair is the active
  same-cycle gate action;
- keep `RLH-6000007-candidate` blocked until strict replay proves owner and
  green behavior; do not file it as `PR16` or move it to `PR06F` from the
  current evidence;
- publish/fetch/audit explicit GitHub refs for every proposed row that still
  says `No verified branch link yet`;
- run focused deferred closeout for PR02A HTTP room isolation, PR06E
  malformed-save, and reload downscope without treating that as a product PR;
- harden the remaining rich-text suffix diagnostic manifest and run focused
  replay/validation for the already-hardened pre-save diagnostic branch before
  any product promotion;
- continue seed `1020002` repair or proof-based reclassification without
  converting it into a wait-only progress loop;
- treat the `152550Z` duplicate/noise semantic-family representative cap as
  applied; the new root's full novelty pass shows no active current-run
  actionable signature pressure while parser-transform and real-user rich-text
  producers are running, so do not launch another duplicate producer-policy
  patch unless a fresh current-run leak appears;
- repair the loop-gate accounting if another cycle accepts wait-only,
  wrong-family, stale-manifest, zero-byte, or active-session feedback while
  actionable gate rows remain.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, a wait-only seed `1020002` loop, duplicate lower-boundary work,
duplicate reload-hydration owner replays, raw deferred publication, raw PR07D,
raw `HOLD-07C`, raw `003407`, raw `020456`, raw `024016`, `PR16-RLH` filing,
`PR06F` movement from current reload evidence, PR17, PR18, PR18x promotion,
PR15D promotion from stale endpoint evidence, diagnostic product promotion
before focused first-loss replay, broad consumer duplicate/noise suppression,
or extra browser lanes.
