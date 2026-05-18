# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T10:22:49Z`

Trigger event:
`pr-split-2026-05-18T10-21-37Z-20260518T101132Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T10-21-37Z-20260518T101132Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis,
`pr-split-20260518T101132Z-synthesis.md`, keeps the Cycle324/i40 ungrouped
topology as the active replacement split, but treats the previous 68-row
Cycle352 written basis as stale. The current recommendation is a narrow
split-basis update to the latest audited/nonzero 69-row Cycle324/i40
finalization that includes `DIAG-SEARCH-094345` as diagnostic/test support.
The stack is still blocked for filing: do not file GitHub PRs, run broad
final-stack fuzzing, or treat PR07 as product-ready.

Current blockers and status changes:

- `PR07` remains pre-oracle/runtime-blocked. The latest completed preflight
  proved the option can be set, but runtime readiness still needs
  `function_exists=yes` for `wp_is_collaboration_allowed()`, `allowed=true`,
  and browser `window._wpCollaborationEnabled === true` before owner replay
  output can count as product evidence.
- The replacement replay still must compare `PR07B0`, `PR07B1`, `PR07B1A`,
  `HOLD-07B2`, `HOLD-07C`, `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`,
  `DIAG-RELOAD-092834`, and any newly audited reload diagnostic support on
  seeds `5200001`, `5200005`, `5200013`, `5200020`, `5200024`, plus witnesses
  `5200011`, `5200017`, `5200010`, `7110004`, and `7110017`.
- Seed `1020002` blocks only broad final-stack fuzzing, GitHub filing, rebuilt
  stack-wide validation, and its own repair or reclassification. It must not
  block branch audit, deferred downscope, PR07 replay replacement, or loop
  repair work.
- The `20260518T095429Z` bundle/manifest audit completed and verified `68`
  manifest rows and `68` branch-audit rows with `0` live-head,
  base-allowlist, branch-audit PASS-column, head/bundle/manifest,
  shape-policy, or deferred-freshness failures. It is now a superseded
  historical 68-row basis, not the recommended written basis.
- Replace the stale 68-row written basis with the latest audited/nonzero
  69-row Cycle324/i40 basis that includes `DIAG-SEARCH-094345`. If
  `20260518T100432Z` is the latest nonzero finalization, audit that; if
  `20260518T101435Z` became nonzero, audit that instead. The audit must verify
  row count, base allowlist, live heads, branch audit, bundle heads, manifest
  SHAs, shape policy, and deferred freshness before the basis is treated as
  publication evidence.
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
  `run-20260518T102029Z`; the full coverage pass is pending. Treat it as
  control-plane startup health, not product validation.
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

Remote status was collected at `2026-05-18T10:22:49Z`.

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

The branch-link audit was generated at `2026-05-18T10:22:54Z` from fetched
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
collected_at_utc: 2026-05-18T10:22:49Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T102029Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw novelty monitor at `2026-05-18T10:22:38.902Z` is startup-only:

```text
status: monitor started; full coverage pass pending
observed roots: 432
previous records loaded: 82886
supervisor groups file: 2
active run dirs: 2
unmet goals: pending until first pass
signatures / likely-real / duplicate yield: pending until first pass
warning: startup status only; full novelty pass has not completed yet
```

Interpretation:

- The latest raw novelty read does not yet provide current-run likely-real,
  duplicate/noise, unmet-goal, or product-evidence conclusions. It only proves
  the new monitor started against `run-20260518T102029Z`.
- Do not compare this startup-only read as if it supersedes the prior full
  pass. Wait for the first full novelty pass before claiming current-run
  likely-real status, enabled-group health, or duplicate/noise yield.
- Product evidence must stay visible and family-capped after the next pass,
  while no-product startup noise must not become a global producer veto again.
- The fuzz repo is still active validation infrastructure. It is not the final
  PR stack and cannot substitute for a rebuilt combined validation stack from
  explicit Cycle324/i40 heads.

The latest trend packet was generated at `2026-05-18T10:16:41Z` and remains
the newest full trend evidence:

```text
monitor passes: 2242
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T10:12:30Z
coverage files: 272 -> 51738
coverage files delta: 51466
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3433
summary startup failures last: 0
quality issues last: 0
memory free: 429.7 GB
load averages: 38.57 / 38.03 / 60.72 on 64 cores
enabled group current: novelty-ws-parser-serialization
latest fuzz level mix:
  browser-e2e=26 lanes/26 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5658915
browser-e2e likely-real findings: 725 over 2234.6 runner-hours
latest suggested PR net LOC total: 4114
```

Latest trend unmet goals remain concentrated in save/reload and real-user
depth:

```text
reload-post-action: 1105/2000, remaining 895
title-save-reload: 560/1000, remaining 440
real-user-editing success: 605/1000, remaining 395
body-save-reload: 619/1000, remaining 381
ui-format-paragraph: 1966/2000, remaining 34
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. The latest mix is still browser-heavy, but load is
lower than the previous snapshot; new work should still be bounded and
oracle-specific rather than simply adding broad browser concurrency.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T101132Z-synthesis.md`, says:

- Overall status is blocked, with a narrow split-basis update required. Keep
  the Cycle324/i40 ungrouped topology, but replace the stale 68-row written
  basis with the latest audited/nonzero 69-row finalization that includes
  `DIAG-SEARCH-094345`.
- Add `DIAG-SEARCH-094345` only as diagnostic/test support. Do not promote raw
  reload-hydration, pre-save search/live-collapse, rich-text suffix,
  common-blocks, malformed-save, HTTP room-isolation, raw PR07D, PR17, PR18, or
  PR18x work to product PRs without owner proof.
- PR07 is still pre-oracle/runtime-blocked. Repair runtime loading until
  `option=1`, `function_exists=yes`, `allowed=true`, and browser
  `window._wpCollaborationEnabled === true`; only then rerun narrow PR07 owner
  replay across `PR07B0`, `PR07B1`, `PR07B1A`, `HOLD-07B2`, `HOLD-07C`, and
  current reload diagnostics.
- Seed `1020002` still blocks final-stack fuzzing, GitHub filing, rebuilt
  stack-wide validation, and its own repair/reclassification. It does not block
  independent branch audit, finalization freshness audit, PR07 runtime repair,
  owner comparisons, or loop repair.
- The next audit should be a bounded non-Docker bundle/manifest audit of
  `20260518T100432Z`, or `20260518T101435Z` if that newer finalization is now
  nonzero. It must verify 69 rows, live heads, bundle heads, manifest SHAs,
  branch audit, base allowlist, shape policy, and deferred freshness.
- Do not make "wait for 1020002" the only next action while the Parallel
  Progress Gate has actionable rows.
- Reload, search, and rich-text work remains diagnostic or test-only until a
  focused replay identifies a distinct product owner.
- Active `1020002`, active PR07 sessions, zero-byte reports, `report.tmp`,
  pre-oracle replay output, and job launch alone are no progress while the
  Parallel Progress Gate has actionable rows.

The previous feedback-action file,
`pr-split-20260518T095036Z-feedback-action.md`, records the now-historical
Cycle352 work: the audit selected the nonzero `20260518T095429Z` finalization
and verified `68` manifest rows and `68` branch-audit rows with zero
head/base/shape/freshness failures; the PR07 runtime preflight then proved
`option=1` but `function_exists=no`, so PR07 remained runtime-readiness
blocked. The latest synthesis supersedes that 68-row basis with the 69-row
`DIAG-SEARCH-094345` basis.

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
novelty read is startup-only for `run-20260518T102029Z`; it has not completed
the first full coverage pass, so it cannot yet establish current duplicate/noise
yield or product-evidence health. The next useful fuzz evidence is a post-fix
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
links, current Cycle324/i40 ungrouped source-family recommendation, `PR07B1A`,
the superseding 69-row `DIAG-SEARCH-094345` basis recommendation, latest
duplicate/noise persona analysis, and latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, `20260518T082401Z`, `20260518T083403Z`, `20260518T084407Z`, `20260518T090413Z`, `20260518T091416Z`, prior completed basis `20260518T092419Z`, stale `20260518T093423Z`, audited historical 68-row basis `20260518T095429Z`, target 69-row basis `20260518T100432Z` or newer nonzero `20260518T101435Z`, `PR07B1A`, reload diagnostics, `DIAG-SEARCH-072229`, `DIAG-SEARCH-083811`, `DIAG-SEARCH-094345`, `DIAG-RELOAD-085318`, `DIAG-RELOAD-090824`, `DIAG-RELOAD-092834`, `DIAG-RICH-TEXT-074239`, `DIAG-RICH-TEXT-084314`, `091831Z`, `092834Z`, `092836Z`, `093839Z`, `094343Z`, `094345Z`, `095349Z`, `095851Z`, and harness rows | active source family; latest split consensus uses the Cycle324/i40 ungrouped shape plus runtime-gated `PR07B1A`; `091416Z` is audited historical evidence with freshness failures; `095429Z` verified 68 rows with zero audit failures but is now superseded; the current recommendation is the latest audited/nonzero 69-row basis including `DIAG-SEARCH-094345`; filing remains blocked by PR07 runtime/owner evidence, missing verified GitHub links, seed `1020002`, and final validation | Run or consume a fresh current-deferred bundle/manifest audit of `20260518T100432Z` or newer nonzero `20260518T101435Z`, publish/fetch/audit exact GitHub links for missing i40 rows, complete PR07 runtime repair and owner replay evidence, repair or reclassify seed `1020002`, then run final-stack validation gates |
| Stale or incomplete publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, previous zero-byte reports, `report.tmp`, header-only outputs, stale manifests, stale `20260518T073347Z/finalization.report.md`, stale `093423Z`, superseded 68-row `095429Z`, and unaudited 69-row successors until bundle/head/manifest audit passes | no filing evidence; zero-byte, header-only, setup-only, pre-oracle, disk-preflight-only, stale, superseded, or unaudited artifacts are no progress; `091416Z` is audited historical evidence with freshness failures; `093423Z` is stale; `095429Z` is historical after the 69-row recommendation | Replace remaining stale or unaudited artifacts with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, PR07B1A, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, PR07B1A, `HOLD-07B2`, `HOLD-07C`, `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`, `DIAG-RELOAD-092834`, pending reload diagnostics; seeds `5200001`, `5200005`, `5200013`, `5200020`, `5200024`, plus witnesses `5200011`, `5200017`, `5200010`, `7110004`, `7110017` | Cycle346 replay is terminated stale evidence; Cycle352 preflight showed `option=1` but `function_exists=no`, so `allowed` was unavailable and browser `_wpCollaborationEnabled` did not become usable; this is setup/readiness failure, not product evidence; PR07 remains the main blocker | First repair/classify collaboration runtime loading (`wp_collaboration_enabled=1`, `wp_is_collaboration_allowed()` exists, `allowed=true`, script enqueue/page source, and browser `_wpCollaborationEnabled === true`), then replay narrowly for `PR07B1A` seeds `5200013`, `5200020`, and `5200024` before the broader bounded matrix with REST/meta, `_crdt_document`, edited-record, Y.Doc/provider/awareness, UI collaborator state, block-tree first-divergence snapshots, branch heads, root free-space record, replay logs, validation/classification TSVs, and nonzero `report.md` |
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
| Active deferred sessions | reload-hydration, search/live-collapse, rich-text suffix, `DIAG-RELOAD-045607`, `DIAG-RELOAD-063159`, `DIAG-RELOAD-064709`, `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`, `DIAG-RELOAD-085318`, `DIAG-RELOAD-090824`, `DIAG-RELOAD-092834`, `DIAG-SEARCH-072229`, `DIAG-SEARCH-082303`, `DIAG-SEARCH-083811`, `DIAG-SEARCH-094345`, duplicate search evidence, `DIAG-RICH-TEXT-074239`, `DIAG-RICH-TEXT-084314`, duplicate rich-text evidence, `DIAG-RICH-TEXT-051616`, deferred freshness artifacts `090321`, `090824`, `091328`, completed `091831Z`, `092834Z`, `092836Z`, `093839Z`, `094343Z`, `094345Z`, `095349Z`, `095851Z`, `HARNESS-WS-URL`, `HARNESS-PLUGIN-STATUS`, `HARNESS-WS-BOOTSTRAP-051619` | active sessions are not progress by themselves; reload/search/rich-text diagnostics are test evidence, not product slots; `DIAG-SEARCH-094345` is diagnostic/test support only; completed/current deferred work must be consumed by the next current-deferred finalization/bundle audit; harness rows are not product fixes | Count only nonempty durable reports/artifacts, audited harness refs, focused owner proof, or a clear downscope/promotion decision |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, real-user duplicate-family holds, novelty recommendation/fallback enable paths, empty materialization rescue, paused/no-analysis drain holds, `.triage-watcher/no-analysis.json` sentinel lifetime, and max-failed deep-analysis jobs | latest synthesis keeps the leak in novelty-monitor producer/control-plane behavior; empty materialization rescue must not bypass drain/current no-product startup holds or startup-noise cooldowns unless the group has current product evidence; latest feedback-action file is zero bytes; latest raw novelty is startup-only for `run-20260518T102029Z` with full coverage pass pending | Verify the next post-fix novelty/supervisor/live-analysis pass: no queued/running/launching no-product `pre_action_bootstrap_stall`, no new `bypass-noise-cooldown-empty-materialization-rescue` entries while startup-noise drain holds exist, max-failed deep jobs are terminal, productive materialization resumes only for groups not under drain/cooldown, and product-evidence paths remain visible and family-capped |
| Current fuzz validation | `run-20260518T102029Z`, novelty read at `2026-05-18T10:22:38Z`, trend generated at `2026-05-18T10:16:41Z` | latest raw novelty is startup-only with `432` observed roots, `82886` previous records loaded, `2` supervisor groups, and `2` active run dirs; trend evidence has `5` unmet goals, `0` current duplicate share, `0.3433` historical duplicate share, browser-heavy mix, lower current load, and 725 browser-E2E likely-real findings over 2234.6 runner-hours | Wait for the first full current-run novelty pass, accepted product evidence, and final PR-stack validation before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, grouped
Cycle320/i40, grouped PR06/PR11/PR12/PR15 as active units, `ready/*`,
validation-stack, dirty evidence, fallback-tail branches, raw
deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale finalization
artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle324/i40 ungrouped source family as the base, with `PR07B1A`
   as the current runtime-gated epoch row after `PR07B1`, and move the written
   basis to the latest audited/nonzero 69-row finalization that includes
   `DIAG-SEARCH-094345`.
2. Treat the audited `20260518T095429Z` 68-row basis as historical, not current
   publication evidence. Audit `20260518T100432Z` or, if now nonzero, the newer
   `20260518T101435Z` finalization before using the 69-row basis. The audit
   must verify row count, base allowlist, live heads, branch audit, bundle
   heads, manifest SHAs, shape policy, and deferred freshness.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Repair/classify PR07 collaboration readiness before treating replay output
   as product evidence: require `wp_collaboration_enabled=1`,
   `wp_is_collaboration_allowed()` present, `allowed=true`, and browser
   `window._wpCollaborationEnabled === true`. Then run the narrow PR07 owner
   replay before the broader matrix. Compare `PR07B0`, `PR07B1`, `PR07B1A`,
   `HOLD-07B2`, `HOLD-07C`, `DIAG-RELOAD-080250`, `DIAG-RELOAD-082300`,
   `DIAG-RELOAD-092834`, and any newly audited reload diagnostic rows.
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

The latest completed bounded audit reflected in the raw split log is the
Cycle352 `095429Z` bundle/manifest audit. It verified `68` rows and zero audit
failures, but the latest split-persona synthesis now treats that 68-row basis
as stale because the 69-row basis with `DIAG-SEARCH-094345` supersedes it.

The current useful bounded jobs are:

- run `rtc-cycle354-post-100432-current-deferred-bundle-manifest-audit`, or the
  same bounded audit against newer nonzero `20260518T101435Z`, to verify the
  69-row basis, branch audit, live heads, bundle heads, manifest SHAs, base
  allowlist, shape policy, and deferred freshness
- run `rtc-cycle354-pr07-runtime-loading-repair` until the PHP/runtime/browser
  collaboration readiness checks pass, then rerun only
  `rtc-cycle354-current-pr07-owner-replay-after-runtime-ready`
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
