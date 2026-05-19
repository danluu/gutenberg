# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-19T09:39:47Z`

Trigger event:
`duplicate-noise-2026-05-19T07-32-19Z-244`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-19T07-32-19Z-244/inputs/remote`

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
`duplicate-noise-20260519T090846Z-synthesis.md`, still keeps the problem in the
fuzz control plane, not in RTC product code. Strict no-product
`pre_action_bootstrap_stall` records are mostly filtered by triage, analysis,
deep-analysis, and live Codex consumers, but novelty/scheduler materialization,
no-analysis restoration, and product-evidence escape paths can still recycle
startup/noise producers. The latest completed feedback action remains
`duplicate-noise-20260519T083141Z-feedback-action.md`; the newer
`duplicate-noise-20260519T090846Z-feedback-action.md` is zero bytes, so it did
not apply another fix. The newest raw novelty monitor, `run-20260519T093644Z`,
completed a full pass but found no current-run behavioral coverage files and no
active run dirs. Current/drain triage is therefore empty (`0` visible
likely-real failures), while historical/combined triage still carries prior
product-evidence signatures. This is fail-closed health evidence for the
duplicate/noise control plane, not broad browser coverage recovery and not
final-stack validation. Preserve one representative product-evidence signal,
then hold/cap later noise-family siblings; do not broaden downstream
suppression.

Seed `1020002` still blocks final-stack fuzzing, rebuilt stack-wide validation,
GitHub filing, and its own repair/reclassification. It must not serialize
independent branch audits, deferred closeout, strict owner comparison, or loop
repair.

## Branch And Ref Status

Remote status was collected at `2026-05-19T09:39:41Z`.

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

The branch-link audit was generated at `2026-05-19T09:39:47Z` from fetched
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
| Duplicate/noise producer control-plane | no-product `pre_action_bootstrap_stall`, endpoint-mismatch port bleed, `fuzz_helper_rest_endpoint_construction`, supervisor seed-drain recovery, novelty bootstrap/admission | latest `090846Z` synthesis says the remaining bug is control-plane recycling of startup/noise producers and product-evidence harness-noise siblings; paired `083141Z` feedback is still the latest completed fix, while `090846Z` feedback is zero bytes; the newest `093644Z` raw monitor completed a pass with `0` current active run dirs, `0` current/drain signatures, and a quality warning that no behavioral coverage files exist under the current novelty output dir | Keep product-evidence signatures visible, preserve one representative per semantic family, cap or hold later siblings in producer scheduling, and treat the fail-closed empty/current-run state as health evidence rather than broad coverage recovery |
| Evidence-only residual families | reload-hydration, pre-save collapse, rich-text suffix, malformed-save residuals, HTTP room isolation | not accepted product PR rows | Promote only with focused product-owned evidence, exact clean refs, branch audit, and owner comparison against lower-layer controls |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-19T09:39:41Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260519T093644Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The latest raw novelty monitor status was written at
`2026-05-19T09:39:35.463Z` for `run-20260519T093644Z`. It completed a pass,
but current-run materialization is empty:

```text
coverage files: 1729
total records seen: 99813
records processed this pass: 79
active run dirs: 0
current-run records: {}
current-run triage signatures: 0
current-drain triage signatures: 0
current/drain likely-real visible: 0
quality issues: 1
quality issue: no behavioral coverage files found under novelty output dir
enabled groups: none listed
```

Interpretation:

- Do not claim final-stack cleanliness. The newest novelty output is current
  monitor health for a constrained coverage-guided run, not validation of the
  accepted final PR stack.
- Current and current-drain triage have `0` signatures and `0` visible
  likely-real failures because no current-run behavioral files were found.
  Historical/combined triage still contains `6` actionable signatures and `3`
  likely-real visible signatures from prior roots; do not present those as
  current live product failures.
- The producer-side duplicate/noise policy fix has fired in the completed
  `083141Z` feedback action, but the `090846Z` synthesis says producer
  recycling can still leak through materialization/refill paths. The newest
  raw monitor now shows the control plane fail-closed with no safe producer
  group, not broad browser coverage recovery.
- Current fuzz health does not clear PR filing, branch-link gaps, PR07 owner
  replay, strict owner replay, reload-hydration downscope, seed `1020002`, or
  final-stack validation.

The latest trend evidence packet was generated at `2026-05-19T09:26:27Z`:

```text
monitor passes: 2346
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-19T09:23:37Z
coverage files: 272 -> 1648
coverage files delta: 1376
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.4286
summary startup failures last: 0
quality issues last: 0
enabled group: novelty-ws-permissions-auth-locks
memory free: 417.2 GB
load averages: 43.59 / 41.56 / 45.3 on 64 cores
latest fuzz level mix:
  browser-e2e=28 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 6208822
browser-e2e likely-real findings: 793 over 2750.4 runner-hours
```

Largest unmet goals remain save/reload and real-user depth:

```text
reload-post-action: 1223/2000
title-save-reload: 676/1000
real-user-editing success: 691/1000
body-save-reload: 735/1000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. Load is high enough that new fuzz work should stay
bounded and oracle-specific rather than increasing broad browser concurrency.
The graph-derived trend packet remains the latest graph/trend evidence, but it
lags the newest raw novelty monitor. The `09:39:35Z` raw status supersedes the
trend snapshot for current-run control-plane state: no current behavioral
coverage files, no active run dirs, no current/drain signatures, and no safe
enabled group.

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
`duplicate-noise-20260519T090846Z-synthesis.md`, classifies the remaining issue
as a control-plane feedback-loop bug rather than an RTC product failure. Its
paired `duplicate-noise-20260519T090846Z-feedback-action.md` is zero bytes, so
the synthesis is guidance for the next action pass, not an applied fix:

- Triage, analysis, deep analysis, and live Codex consumers mostly suppress
  strict no-product `pre_action_bootstrap_stall` records correctly.
- The scheduler/live-analysis path still does not consistently turn known
  duplicate/noise with possible product evidence into "preserve one
  representative, then stop feeding the family."
- The next bounded patch should be in
  `bin/rtc-browser-fuzz-novelty-monitor.mjs`: enforce current no-product
  startup holds even without exact group metadata, block producer
  refill/materialization for those holds, allow materialization to go
  temporarily empty instead of rescuing into another startup producer, and add
  scheduler holds for product-evidence harness-noise families such as
  `rtc_test_ws_runtime_config_port_bleed` and
  `fuzz_helper_rest_endpoint_construction`.
- Preserve one product-evidence representative per semantic family, mark later
  siblings held/family-capped rather than suppressed, bump the novelty/noise
  policy version, and validate with `node --check` plus one bounded
  novelty/live-analysis pass.
- Do not implement broad suppression of product-evidence failures, WebSocket
  failures, startup failures, awareness failures, or `waitForSyncCycle`
  failures.

The latest completed duplicate/noise feedback action remains
`duplicate-noise-20260519T083141Z-feedback-action.md`, which completed the
bounded control-plane fix:

- `rtc-browser-fuzz-novelty-monitor.mjs` now has a mixed strict-startup
  threshold defaulting to `2`, creates strict startup-noise producer holds for
  mixed product-evidence runs, recognizes the same hold in supervisor startup
  summaries, and avoids product-evidence vetoes when pausing/refill-blocking the
  noisy producer.
- `rtc-browser-fuzz-supervisor.mjs` now uses the same mixed absolute startup
  guard default of `2`.
- `node --check` passed for novelty monitor, supervisor, triage watcher,
  analysis tier, deep-analysis tier, and live-analysis monitor.
- After the `083141Z` restart, strict startup signatures were not queued to
  consumer paths, `no-analysis.json` sentinels preserved product evidence, and
  the patched policy paused the then-active noisy producers. The latest graph
  trend pass still has `novelty-ws-permissions-auth-locks` as the enabled
  group, but the newer `093644Z` raw monitor completed a pass with no current
  behavioral coverage files, no active run dirs, and no safe enabled group.
- Remaining risk: coverage-guided browser progress is fail-closed/empty while
  several groups are paused on startup-stall history and real-user
  recommendations remain inside cooldown. Current/drain triage reported no
  active visible likely-real failures, but only because current-run
  materialization is empty, so treat this as constrained health evidence rather
  than broad coverage recovery or final-stack validation.

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
- consume the `090846Z` duplicate/noise guidance in a bounded producer-policy
  patch: preserve one product-evidence representative, hold/cap later
  startup/noise-family siblings before producer refill/materialization, avoid
  broad consumer suppression, and resume browser coverage only through a
  non-leaking replacement group or startup-stability repair;
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
