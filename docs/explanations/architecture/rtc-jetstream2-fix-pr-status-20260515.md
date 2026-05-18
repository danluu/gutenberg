# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T10:35:24Z`

Trigger event:
`pr-split-2026-05-18T10-34-09Z-20260518T102142Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T10-34-09Z-20260518T102142Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis,
`pr-split-20260518T102142Z-synthesis.md`, keeps the Cycle324/i40 ungrouped
topology as the active replacement split, but marks the written basis stale
again. `20260518T101435Z` is now the latest audited 69-row historical
manifest, but it predates the completed `20260518T101357Z` reload-hydration
candidate. `20260518T102438Z/finalization.report.md` is still zero bytes and
is not evidence. The stack is still blocked for filing: do not file GitHub
PRs, run broad final-stack fuzzing, or treat PR07 as product-ready.

Current blockers and status changes:

- `PR07B1A` must be refreshed against the completed reload-hydration
  candidate: compare `deferred/rtc-reload-hydration-20260518T101357Z` at
  `f77cf109dda` with current `PR07B1A` at `c1d8ca017bc`. If it is
  equivalent/restack-only, keep `PR07B1A` and update the evidence; otherwise
  replace it with a restacked `101357Z` head. Do not file the raw `101357Z`
  branch off `72854f05ed2`.
- `PR07` still lacks durable owner replay evidence in the collected inputs.
  The latest synthesis says to run owner replay once runtime readiness is
  repaired-ready; no product proof is present here yet.
- The replacement replay still must compare `PR07B0`, `PR07B1`, `PR07B1A`,
  `HOLD-07B2`, `HOLD-07C`, `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`,
  `DIAG-RELOAD-092834`, and any newly audited reload diagnostic support on
  seeds `5200001`, `5200005`, `5200013`, `5200020`, `5200024`, plus witnesses
  `5200011`, `5200017`, `5200010`, `7110004`, and `7110017`.
- Seed `1020002` blocks only broad final-stack fuzzing, GitHub filing, rebuilt
  stack-wide validation, and its own repair or reclassification. It must not
  block branch audit, deferred downscope, PR07 replay replacement, or loop
  repair work.
- The `20260518T095429Z` bundle/manifest audit remains only historical 68-row
  evidence. `20260518T101435Z` supersedes it as an audited 69-row historical
  manifest, but it is also stale for publication because it predates the
  completed `101357Z` reload-hydration report.
- Do not use `20260518T102438Z` unless its report becomes nonzero and proves
  freshness, base allowlist, branch audit, bundle heads, manifest SHAs, live
  heads, shape policy, and deferred freshness.
- Add `DIAG-SEARCH-094345` only as diagnostic/test support. Reload-hydration,
  pre-save search/live-collapse, rich-text suffix, common-blocks, malformed
  save, and HTTP room-isolation residuals remain diagnostic/downscope work
  until replay proves a product-owned first-loss layer.
- Verified GitHub branch links are still missing for many exact Cycle324/i40
  rows, including all runtime-gated PR07 microheads and most ungrouped CRDT
  rows. Rows below either use verified audit links or explicitly say
  `No verified branch link yet`.
- For PR13, the only current PR-content links are the repaired audit refs:
  `review/rtc-pr13a-observed-delete-provenance-repaired`,
  `review/rtc-pr13b-source-retirement`, and
  `review/rtc-pr13c-stale-block-identity-smear-guard`. The finer
  `PR13B0`-`PR13B3` source-family split remains unaudited and must not be
  filed as linked PR content yet.
- The latest raw novelty status is startup-only for
  `run-20260518T103343Z`; the launcher has started and the monitor process is
  pending. Treat it as control-plane startup health, not product validation.
- The latest duplicate/noise synthesis keeps the remaining leak in the
  novelty-monitor producer/control plane: empty materialization rescue can still
  refill browser capacity from paused/no-analysis drain startup holds unless the
  group has current product evidence. The latest duplicate/noise feedback-action
  file is zero bytes, so this is still planned control-plane work, not product
  evidence, PR07 owner evidence, or final-stack validation.

The active replacement topology remains:

```text
PR01 -> PR02 (+ PR02A)
-> PR03 (hold PR03B)
-> PR04 -> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D (+ PR06E)

Runtime-gated:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1 -> PR07B1A
(hold HOLD-07B2 and HOLD-07C as siblings off PR07B1; no raw PR07D)

From PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B
-> PR15A -> PR15B -> PR15C -> PR15D
```

Reject grouped `PR06`, `PR11`, `PR12`, and `PR15`; stale
Cycle293/Cycle306/local-publish rows; fallback-tail `PR05D`;
`d06e3528cbd`; `fix/rtc-fallback-group-delete-stale-local`; raw
`deferred/*` product-filing heads; raw `PR07D`; `PR17`; `PR18`; and `PR18x`.
Clean `PR05D` remains only `27c6e7924217038ed9b4ff71585e8041c67765a4`.

## Branch And Ref Status

Remote status was collected at `2026-05-18T10:35:24Z`.

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

That repo has modified product/test files plus many untracked fuzz, analysis,
and documentation artifacts. It is active validation infrastructure, not the
final PR stack and not a filing source.

The branch-link audit was generated at `2026-05-18T10:35:29Z` from fetched
`danluu` refs. It proves only that rows marked `verified-content` exist on
`danluu` and have non-empty audited diffs against the listed bases. It does not
prove exact i40 publication shape, ancestry, owner evidence, or filing
readiness.

Use only these repaired audited PR13 review refs for PR13 content or fallback
evidence:

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

### Common Mainline

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 1 | HTTP polling generated update size guard | [`review/rtc-pr01-http-polling-generated-update-size`](https://github.com/danluu/gutenberg/tree/review/rtc-pr01-http-polling-generated-update-size) | 2 | +181 / -19 | verified content |
| PR 2 | HTTP polling storage read window | [`review/rtc-pr02-http-polling-storage-read-window`](https://github.com/danluu/gutenberg/tree/review/rtc-pr02-http-polling-storage-read-window) | 2 | +57 / -5 | verified content |
| PR 2A | HTTP room-isolation regression sidecar after PR2 | No verified branch link yet | TBD | TBD | evidence-only until pushed/fetched/audited |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i40 row; aggregate PR05 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail PR05D |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active i40 row; runtime owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active i40 row; prior replay evidence is stale/pre-oracle |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active i40 row; old holds stay siblings from here |
| PR 7B1A | Stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | runtime-gated Cycle324/i40 row after PR07B1; strict same-user reload witnesses, corrected owner replay, and verified GitHub link are still missing |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired verified content; use this branch until exact PR13B0-B3 refs are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired verified content; source-family PR13B0-B3 remain evidence-only without verified links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-D |
| PR 15A | Fallback-group operation subhead `687a13` after PR14B | No verified branch link yet | TBD | TBD | active i40 row; verified component prior art is not exact PR14B-based ref |
| PR 15B | Fallback-group operation subhead `17569a` after PR15A | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15C | Fallback-group operation subhead `bcf1c4` after PR15B | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15D | Fallback-group operation subhead `276709` after PR15C | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |

### Verified Fallbacks And Prior Art

These rows have verified audit links, but they are not the exact active
Cycle324/i40 proposed PR rows unless the status says so.

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-B1 plus PR07B1A split |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T10:35:24Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T103343Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw novelty monitor status at `2026-05-18T10:33:52Z` is startup-only:

```text
status: launcher started; monitor process pending
unmet goals: pending until first pass
signatures / likely-real / duplicate yield: pending until first pass
warning: launcher startup status only; novelty monitor has not started yet
```

Interpretation:

- The latest raw novelty read does not yet provide current-run likely-real,
  duplicate/noise, unmet-goal, or product-evidence conclusions. It only proves
  the launcher started against `run-20260518T103343Z`.
- Do not compare this startup-only read as if it supersedes the prior full
  pass. Wait for the first full novelty pass before claiming current-run
  likely-real status, enabled-group health, or duplicate/noise yield.
- Product evidence must stay visible and family-capped after the next pass,
  while no-product startup noise must not become a global producer veto again.
- The fuzz repo is still active validation infrastructure. It is not the final
  PR stack and cannot substitute for a rebuilt combined validation stack from
  explicit Cycle324/i40 heads.

The latest trend packet was generated at `2026-05-18T10:24:24Z` and remains
the newest full trend evidence:

```text
monitor passes: 2243
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T10:17:44Z
coverage files: 272 -> 51929
coverage files delta: 51657
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3434
summary startup failures last: 0
quality issues last: 1
memory free: 424.8 GB
load averages: 51.6 / 46.4 / 53.73 on 64 cores
enabled group current: novelty-ws-parser-serialization, novelty-ws-real-user-save-reload
latest fuzz level mix:
  browser-e2e=30 lanes/26 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5661468
browser-e2e likely-real findings: 725 over 2236.0 runner-hours
latest suggested PR net LOC total: 4114
```

Latest trend unmet goals remain concentrated in save/reload and real-user
depth:

```text
reload-post-action: 1112/2000, remaining 888
title-save-reload: 567/1000, remaining 433
real-user-editing success: 609/1000, remaining 391
body-save-reload: 626/1000, remaining 374
ui-format-paragraph: 1985/2000, remaining 15
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. The latest mix is still browser-heavy, but load is
lower than the previous snapshot; new work should still be bounded and
oracle-specific rather than simply adding broad browser concurrency.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T102142Z-synthesis.md`, says:

- Overall status needs a split-basis refresh, not a topology change. Keep the
  Cycle324/i40 ungrouped topology, but do not publish from the stale current
  basis.
- `20260518T101435Z` is the latest audited 69-row historical manifest, but it
  predates the completed `101357Z` reload-hydration report.
  `20260518T102438Z` is still zero-byte for `finalization.report.md`, so it is
  not evidence.
- `PR07B1A` must be refreshed by comparing
  `deferred/rtc-reload-hydration-20260518T101357Z` at `f77cf109dda` against the
  current `PR07B1A` head `c1d8ca017bc`. Keep `PR07B1A` only if the comparison
  is equivalent/restack-only; otherwise replace it with a restacked `101357Z`
  head. Do not file the raw `101357Z` branch off `72854f05ed2`.
- Keep `DIAG-SEARCH-094345`, rich-text suffix, reload-hydration, malformed-save,
  HTTP room-isolation, and pre-save search/live-collapse work diagnostic or
  test-only unless owner replay proves a product-owned first-loss layer.
- Seed `1020002` still blocks final-stack fuzzing, GitHub filing, rebuilt
  stack-wide validation, and its own repair/reclassification. It does not block
  independent branch audit, PR07B1A refresh, PR07 owner replay, strict owner
  comparisons, or loop repair.
- The next useful bounded work is `rtc-cycle354-pr07b1a-101357-refresh-and-manifest-audit`,
  `rtc-cycle354-current-pr07-owner-replay-after-runtime-ready`, and
  `rtc-cycle354-current-strict-owner-comparison-pr05b-pr05c-pr05d`.
- Wait-only feedback, active `1020002`, zero-byte reports, setup-only output,
  stale manifests, and job launch alone are no progress while the Parallel
  Progress Gate has actionable rows.

The previous feedback-action file,
`pr-split-20260518T095036Z-feedback-action.md`, records the now-historical
Cycle352 work: the audit selected the nonzero `20260518T095429Z` finalization
and verified `68` manifest rows and `68` branch-audit rows with zero
head/base/shape/freshness failures; the PR07 runtime preflight then proved
`option=1` but `function_exists=no`, so PR07 remained runtime-readiness
blocked. The later `101132Z` synthesis superseded that 68-row basis with a
69-row `DIAG-SEARCH-094345` basis, and the newest `102142Z` synthesis now
treats audited `101435Z` as historical because it predates the completed
`101357Z` reload-hydration candidate.

The latest duplicate/noise persona file,
`duplicate-noise-20260518T094242Z-synthesis.md`, keeps the leak in the
novelty-monitor producer/control plane, not in triage/reporting consumers.
Strict no-product `pre_action_bootstrap_stall` is mostly suppressed before
Codex analysis, but empty materialization rescue can still bypass current or
drain-only no-product startup holds and active startup-noise cooldowns unless
the group has current product evidence. The synthesis also keeps failed
deep-analysis retry exhaustion as a secondary live-analysis follow-up. The
matching `duplicate-noise-20260518T094242Z-feedback-action.md` is zero bytes,
so this newest control-plane fix is not yet applied.

This remains control-plane hygiene, not product validation. The latest raw
novelty read is startup-only for `run-20260518T103343Z`; the launcher has
started but the monitor process is still pending, so it cannot yet establish
current duplicate/noise yield or product-evidence health. The next useful fuzz
evidence is a post-fix
novelty/supervisor pass that does not emit new
`bypass-noise-cooldown-empty-materialization-rescue` events while startup-noise
drain holds exist, plus a live-analysis check that max-failed deep jobs are not
relaunched.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, current Cycle324/i40 ungrouped source-family recommendation, the
`PR07B1A`/`101357Z` refresh recommendation, latest duplicate/noise persona
analysis, and latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, `20260518T082401Z`, `20260518T083403Z`, `20260518T084407Z`, `20260518T090413Z`, `20260518T091416Z`, prior completed basis `20260518T092419Z`, stale `20260518T093423Z`, audited historical 68-row basis `20260518T095429Z`, audited historical 69-row basis `20260518T101435Z`, zero-byte successor `20260518T102438Z`, `PR07B1A`, `deferred/rtc-reload-hydration-20260518T101357Z`, reload diagnostics, `DIAG-SEARCH-072229`, `DIAG-SEARCH-083811`, `DIAG-SEARCH-094345`, `DIAG-RELOAD-085318`, `DIAG-RELOAD-090824`, `DIAG-RELOAD-092834`, `DIAG-RICH-TEXT-074239`, `DIAG-RICH-TEXT-084314`, `091831Z`, `092834Z`, `092836Z`, `093839Z`, `094343Z`, `094345Z`, `095349Z`, `095851Z`, and harness rows | active source family; latest split consensus uses the Cycle324/i40 ungrouped shape plus runtime-gated `PR07B1A`; `095429Z` verified 68 rows with zero audit failures but is historical; `101435Z` is the latest audited 69-row historical manifest but predates completed `101357Z`; `102438Z` is zero-byte and unusable; filing remains blocked by `PR07B1A` refresh, PR07 owner evidence, missing verified GitHub links, seed `1020002`, and final validation | Compare `f77cf109dda` from `101357Z` against current `PR07B1A` `c1d8ca017bc`, regenerate the manifest from the chosen PR07B1A, verify deferred freshness and head/bundle/manifest/branch-audit agreement, publish/fetch/audit exact GitHub links for missing i40 rows, complete PR07 owner replay evidence, repair or reclassify seed `1020002`, then run final-stack validation gates |
| Stale or incomplete publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, previous zero-byte reports, `report.tmp`, header-only outputs, stale manifests, stale `20260518T073347Z/finalization.report.md`, stale `093423Z`, superseded 68-row `095429Z`, historical `101435Z`, and zero-byte `102438Z` | no filing evidence; zero-byte, header-only, setup-only, pre-oracle, disk-preflight-only, stale, superseded, or unaudited artifacts are no progress; `091416Z` is audited historical evidence with freshness failures; `093423Z` is stale; `095429Z` and `101435Z` are historical after the latest `101357Z` reload-hydration candidate | Replace stale or unaudited artifacts with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, PR07B1A, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, PR07B1A, `HOLD-07B2`, `HOLD-07C`, `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`, `DIAG-RELOAD-092834`, pending reload diagnostics; seeds `5200001`, `5200005`, `5200013`, `5200020`, `5200024`, plus witnesses `5200011`, `5200017`, `5200010`, `7110004`, `7110017` | Cycle346 replay is terminated stale evidence; Cycle352 preflight showed `option=1` but `function_exists=no`; the latest split synthesis says runtime readiness is repaired-ready, but these collected inputs contain no durable owner replay output; PR07 remains product-evidence blocked until `PR07B1A` is refreshed and replayed | Refresh `PR07B1A` against `101357Z`, then run same-user seeds `5200011`, `5200017`, `5200010` and late-join seeds `7110004`, `7110017`, capturing REST/meta, `_crdt_document`, edited-record, Y.Doc/provider/awareness, UI collaborator state, branch head, block-tree first-divergence snapshots, root free-space record, replay logs, validation/classification TSVs, and nonzero `report.md` |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-`HOLD-07C` non-coverage with first-divergence evidence |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet; rich-text residuals stay diagnostic | Publish/fetch/audit clean PR05D and compare PR05B/PR05C/clean-PR05D before assigning any PR18x owner |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | latest replacement requires the CRDT/data-loss lane from PR06D, not PR07 | Prove `PR06D -> PR09`, `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use the repaired verified audit refs and are the only current PR13 PR-content links; PR13B0/B1/B2/B3 remain source-family/evidence-only until explicit refs exist | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| Strict stale projection owner comparison | `HOLD-STRICT-STALE-PROJECTION-5200005/5200008`; compare `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`, `PR07B1A`, and `HOLD-07C` | held comparison lane only; not a product PR slot | Run focused owner replay for seeds `5200005` and `5200008` before creating any new strict-projection product row |
| Common-blocks owner comparison | `HOLD-COMMON-BLOCKS-965003`, plus related seeds `965010` and `5800001` | held comparison row; `965003` is likely real but currently reads as post-save/reload common-block canonical drift, not clean pre-save search loss | Compare against `PR05B`, `PR05C`, clean `PR05D`, `PR07B0`, `PR07B1`, `PR07B1A`, and `HOLD-07C` |
| Block-library canonicalization side evidence | `SIDE-BLOCKLIB-COVER-965004` | likely `core/cover` or block-library canonicalization issue; not RTC-stack product work yet | Track separately as block-library diagnostic unless ownership evidence changes |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Active deferred sessions | reload-hydration, search/live-collapse, rich-text suffix, `deferred/rtc-reload-hydration-20260518T101357Z`, `DIAG-RELOAD-045607`, `DIAG-RELOAD-063159`, `DIAG-RELOAD-064709`, `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`, `DIAG-RELOAD-085318`, `DIAG-RELOAD-090824`, `DIAG-RELOAD-092834`, `DIAG-SEARCH-072229`, `DIAG-SEARCH-082303`, `DIAG-SEARCH-083811`, `DIAG-SEARCH-094345`, duplicate search evidence, `DIAG-RICH-TEXT-074239`, `DIAG-RICH-TEXT-084314`, duplicate rich-text evidence, `DIAG-RICH-TEXT-051616`, deferred freshness artifacts `090321`, `090824`, `091328`, completed `091831Z`, `092834Z`, `092836Z`, `093839Z`, `094343Z`, `094345Z`, `095349Z`, `095851Z`, `100854Z`, `101357Z`, `101359Z`, `HARNESS-WS-URL`, `HARNESS-PLUGIN-STATUS`, `HARNESS-WS-BOOTSTRAP-051619` | active sessions are not progress by themselves; reload/search/rich-text diagnostics are test evidence, not raw product slots; `DIAG-SEARCH-094345` is diagnostic/test support only; completed `101357Z` reload-hydration work must be range-diffed/restacked before it can affect `PR07B1A`; harness rows are not product fixes | Count only nonempty durable reports/artifacts, audited harness refs, focused owner proof, or a clear downscope/promotion decision |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, real-user duplicate-family holds, novelty recommendation/fallback enable paths, empty materialization rescue, paused/no-analysis drain holds, `.triage-watcher/no-analysis.json` sentinel lifetime, and max-failed deep-analysis jobs | latest synthesis keeps the leak in novelty-monitor producer/control-plane behavior; empty materialization rescue must not bypass drain/current no-product startup holds or startup-noise cooldowns unless the group has current product evidence; latest feedback-action file is zero bytes; latest raw novelty is startup-only for `run-20260518T103343Z` with the monitor process pending | Verify the next post-fix novelty/supervisor/live-analysis pass: no queued/running/launching no-product `pre_action_bootstrap_stall`, no new `bypass-noise-cooldown-empty-materialization-rescue` entries while startup-noise drain holds exist, max-failed deep jobs are terminal, productive materialization resumes only for groups not under drain/cooldown, and product-evidence paths remain visible and family-capped |
| Current fuzz validation | `run-20260518T103343Z`, novelty read at `2026-05-18T10:33:52Z`, trend generated at `2026-05-18T10:24:24Z` | latest raw novelty is startup-only with launcher started and monitor pending; trend evidence has `5` unmet goals, `0` current duplicate share, `0.3434` historical duplicate share, browser-heavy mix, `1` quality issue, and 725 browser-E2E likely-real findings over 2236.0 runner-hours | Wait for the first full current-run novelty pass, accepted product evidence, and final PR-stack validation before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, grouped
Cycle320/i40, grouped PR06/PR11/PR12/PR15 as active units, `ready/*`,
validation-stack, dirty evidence, fallback-tail branches, raw
deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale finalization
artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle324/i40 ungrouped source family as the base, with `PR07B1A`
   as the current runtime-gated epoch row after `PR07B1`, but refresh that row
   against the completed `20260518T101357Z` reload-hydration candidate before
   treating the written basis as current.
2. Treat the audited `20260518T095429Z` 68-row basis and audited
   `20260518T101435Z` 69-row basis as historical, not current publication
   evidence. Do not use `20260518T102438Z` unless its report becomes nonzero
   and proves row count, base allowlist, live heads, branch audit, bundle
   heads, manifest SHAs, shape policy, and deferred freshness.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Before treating replay output as product evidence, compare `f77cf109dda`
   from `deferred/rtc-reload-hydration-20260518T101357Z` against current
   `PR07B1A` `c1d8ca017bc` and regenerate the manifest from the chosen
   PR07B1A. Then run the narrow PR07 owner replay before the broader matrix.
   Compare `PR07B0`, `PR07B1`, `PR07B1A`, `HOLD-07B2`, `HOLD-07C`,
   `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`, `DIAG-RELOAD-092834`, and any
   newly audited reload diagnostic rows.
5. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old
   `HOLD-07B2 !-> PR09/PR15D`, clean PR05D only, PR15A-D after PR14B, and no
   fallback-tail PR05D.
6. Run held owner comparisons for `5200005`, `5200008`, `965003`, `965010`,
   `5800001`, and any rich-text/search/reload candidates before creating new
   product rows. Keep `965004` separate as block-library canonicalization
   evidence unless ownership changes.
7. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
8. Keep old aggregate or stale prior art, broad PR08, dirty evidence branches,
   stale/misordered PR13 refs, fallback-tail PR15/PR05D confusion, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
9. Treat duplicate/noise active-sentinel work, producer-cooldown repair, and
   scheduler-deadlock repair as control-plane hygiene only. Product evidence
   must remain visible and family-capped; control-plane health does not count as
   product validation.
10. After PR07B1A owner evidence, exact branch-link audit for missing rows, and
   seed `1020002` repair or reclassification land, rebuild the combined
   validation stack from explicit Cycle324/i40 heads plus accepted epoch work,
   then run focused checks, touched-file lint, branch graph/containment
   evidence, adjacent range-diffs/diffstats/numstats, `git diff --check`,
   feasible runtime checks, and fresh stack-wide validation.

The latest completed bounded audit reflected in the raw split log remains the
Cycle352 `095429Z` bundle/manifest audit. It verified `68` rows and zero audit
failures. The latest split-persona synthesis adds that `101435Z` is now the
latest audited 69-row historical manifest, but that it also predates the
completed `101357Z` reload-hydration candidate. `102438Z` is still zero-byte
and unusable.

The current useful bounded jobs are:

- run `rtc-cycle354-pr07b1a-101357-refresh-and-manifest-audit` to consume
  `101357Z`, `101359Z`, and `100854Z`, range-diff `f77cf109dda` against
  `c1d8ca017bc`, regenerate the manifest from the chosen `PR07B1A`, and verify
  deferred freshness plus head/bundle/manifest/branch-audit agreement
- run `rtc-cycle354-current-pr07-owner-replay-after-runtime-ready`
- run `rtc-cycle354-current-strict-owner-comparison-pr05b-pr05c-pr05d`
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`
- refresh candidate/deferred status using only nonzero completed reports; never
  count `report.tmp`, setup-only, disk-preflight-only, or zero-byte artifacts
  as evidence
- fix strict-expansion context gating to current strict-run roots only, and
  enforce `PR05B` / `PR05C` / clean `PR05D` comparison before any parser,
  linebreak, or rich-text `PR18x` labels
- run `rtc-cycle354-current-strict-owner-comparison` before assigning any new
  rich-text/search/parser owner rows
- common-blocks owner comparison for `965003`, `965010`, and `5800001`
- separate classification/tracking for likely `core/cover` or block-library
  canonicalization seed `965004`
- focused search diagnostic replay against `965003`, `965010`, `5800001`, and
  the pre-save search spec
- rich-text setup-health repair and focused replay for `5100009`, current
  strict `5100002`, and focused rich-text seeds against the `074239Z`
  diagnostic branch
- patch/check the novelty-monitor materialization-rescue gate: no rescue,
  fallback, or materialization path should bypass current/drain-only no-product
  startup holds or startup-noise cooldowns unless the group has current product
  evidence; also verify max-failed deep-analysis jobs are terminal and product
  evidence analysis stays visible
- optional loop-progress gate repair if the loop still counts active/stopped
  sessions, zero-byte reports, `report.tmp`, setup-only PR07 output,
  disk-preflight-only output, or `collaborationEnabled:null` as progress

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, PR17, PR18, PR18x
promotion, duplicate PR07 replay, or extra browser lanes.
