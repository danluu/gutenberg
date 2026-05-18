# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T16:03:25Z`

Trigger event:
`duplicate-noise-2026-05-18T16-02-34Z-200`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-18T16-02-34Z-200/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The split remains blocked, not fileable. The active split shape is still the
Cycle370/Cycle325-i40 parallel-lane framing with `PR02B` blocked after `PR02`
and PR07 held as a two-stage decision fork. The latest applied split artifact
is now the Cycle 374 current-finalization follow-up in `current-pr-split.md`,
not the older Cycle 372 `150601` audit and not the review-time zero-byte
interpretation of `153610`.

Current split proof:

```text
runs/20260518T153253Z/jobs/outputs/rtc-cycle374-post-153610-current-finalization-audit/report.md
status=PASS, hard failures=0, warnings=5, manifest rows=80
```

That proof verifies the nonzero `20260518T153610Z` finalization report, push
manifest, and standardized supplemental manifest for three current-cycle
diagnostic/harness refs. It is local-host publication input only: Jetstream did
not push those supplemental refs to GitHub, the latest local publish manifest
does not yet contain the three supplemental destinations at the audited SHAs,
and the diagnostic/harness rows are not product-promotion proof.

The ready/local lane and CRDT/data-loss lane remain usable as planning
structure. Filing remains blocked by seed `1020002` for final-stack validation
and filing, by `PR02B` validation, by PR07 owner adjudication, by missing exact
verified branch links for many active i40 sub-PR rows, by deferred evidence-only
families, and by the need to rebuild and validate the final combined PR stack.

The current maintainer-facing split recommendation is:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A ready sidecar
  + PR02B blocked-validation HTTP polling awareness rejoin retry
-> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D (+ PR06E)

Runtime-gated PR07 decision fork:
PR07A1 -> PR07A2 -> PR07A3
then fork:
  current PR07B0
  vs conflict-resolved 121507 / 134558 saved-response/persisted-CRDT hydration
winner or additive result -> PR07B1 only if still independent
then fork:
  current PR07B1A
  vs collapsed stale sync-manager / entity-epoch family:
     111430 / 114448 / 123016 / 124525 / 130034 / 131542 / 133049
comparison arms:
  PR03B, HOLD-07B2, HOLD-07C

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

Do not file raw `PR07D`, raw `deferred/*`, raw diagnostic heads, `PR17`,
`PR18`, or `PR18x`. Do not treat post-`153610` diagnostic/harness rows as
product-promotion proof. Do not treat any later finalization as evidence until
it has a nonzero report and a matching head, bundle, manifest, and base audit.

The latest duplicate/noise feedback action at `20260518T153904Z` patched the
novelty scheduler so empty materialization rescue is blocked by any
current-output startup-noise hold unless product-evidence bypass applies. This
was a control-plane script change only, not product validation. It passed
`node --check`, gate-only startup-drain checks, first-level/deep analysis
checks, and a live-analysis `--once` check, then restarted
`rtc-coverage-guided-novelty`. The raw novelty status collected here still
predates a full post-restart novelty pass, so keep the scheduler fix as
validated control-plane progress with pending monitor-cycle confirmation.

## Branch And Ref Status

Remote status was collected at `2026-05-18T16:03:20Z`.

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

The branch-link audit was generated at `2026-05-18T16:03:25Z` from fetched
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
| PR 2A | Ready sidecar after PR2 | No verified branch link yet | TBD | TBD | active sidecar, not file-ready until pushed, fetched, and audited |
| PR 2B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | current blocked-validation status verified by Cycle 374 artifacts; blocked on seed `1030001`, HTTP persistence-probe, targeted PHPUnit, PR CI, and a verified GitHub branch link |
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
| PR 7B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | first decision-fork arm; compare against `121507`/`134558` before accepting the PR07B1 base |
| PR 7B0-alt? | Restacked `121507`/`134558` saved-response/persisted-CRDT hydration candidate | No verified branch link yet | TBD | TBD | first decision-fork arm; no accepted restacked ref yet |
| PR 7B1 | Save response manager/base-record owner microhead after the chosen PR07B0 arm | No verified branch link yet | TBD | TBD | not file-ready until PR07B0-current vs `121507`/`134558` is decided |
| PR 7B1A | Current stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | second decision-fork arm after PR07B1; not file-ready as coverage for `111430/114448/123016/124525/130034/131542/133049` |
| PR 7B1B? | Restacked `111430/114448/123016/124525/130034/131542/133049` reload/stale-epoch candidate | No verified branch link yet | TBD | TBD | second decision-fork arm; `124525/130034/131542/133049` are the `056aa92f293` hold/evidence family; no accepted ref exists |

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
| PR 13B | Cross-parent source retirement | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | 2 | +1672 / -4 | repaired verified content; use until exact PR13B0-B3 refs are published and audited |
| PR 13C | Stale block identity smear guard | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | 2 | +345 / -51 | repaired verified content; source-family PR13B0-B3 remain evidence-only without verified links |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-D |
| PR 15A | Fallback-group operation subhead `687a13` after PR14B | No verified branch link yet | TBD | TBD | active i40 row; verified component prior art is not exact PR14B-based ref |
| PR 15B | Fallback-group operation subhead `17569a` after PR15A | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15C | Fallback-group operation subhead `bcf1c4` after PR15B | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15D | Fallback-group operation subhead `276709` after PR15C | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |

### Verified Fallbacks And Prior Art

These rows have verified audit links, but they are not the exact active
Cycle325/i40 proposed PR rows unless the status says so.

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-current vs `121507`/`134558` decision, the chosen PR07B1 row, or the PR07B1A vs `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049` decision |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T16:03:20Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T153026Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-18T15:48:39.742Z`. It still reflects the state before the
`153904Z` novelty scheduler restart completed a fresh full pass:

```text
coverage files: 53834
total records seen: 87250
records processed this pass: 171
active current-run dirs: 0
unmet goals: 4
current-run triage signatures: 0
current-run likely-real visible: 0
current-drain triage roots: 3
current-drain signatures: 2
current-drain raw signatures: 4
current-drain product-evidence signatures: 2
current-drain top families: unknown=1,
  persisted_crdt_save_response_hydration_drops_marker_bearing_block_content_when_invalid_html_entity_blocks_are_present_causing_blocks_content_divergence_after_save=1
current-drain raw top families: reload_rejoin_awareness_stall=2,
  unknown=1,
  persisted_crdt_save_response_hydration_drops_marker_bearing_block_content_when_invalid_html_entity_blocks_are_present_causing_blocks_content_divergence_after_save=1
historical likely-real visible: 355
historical likely-real merged duplicates: 1443
historical likely-real oracle/noise questions: 48
combined likely-real visible: 357
enabled groups: novelty-ws-permissions-auth-locks,
  novelty-ws-long-session-large-doc
recommended groups: novelty-ws-real-user-save-reload,
  novelty-ws-real-user-editing, novelty-ws-real-user-rich-text
load1: 104.01 / 64 cores
memory: 402.6G free / 492.0G total
health: ok
```

Interpretation:

- Current active-run triage is clear: no active current-run dirs, no current
  triage signatures, and no visible likely-real current-run failures.
- The current-drain signatures are product-evidence duplicate/noise work and
  startup-drain cleanup context, not active current-run product failures.
- Historical likely-real and duplicate counts are prior-root context only. They
  must not be presented as live product failures in the current run.
- The fuzz repo is still active validation infrastructure. It is not the final
  PR stack and cannot substitute for a rebuilt combined validation stack from
  explicit Cycle325/i40 heads.
- The `153904Z` scheduler patch is newer than this novelty status. Its direct
  gate checks passed, but post-restart full-pass monitor status is still needed
  before making scheduler-yield claims.

The latest trend packet was generated at `2026-05-18T15:53:02Z`:

```text
monitor passes: 2271
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T15:48:39Z
coverage files: 272 -> 53834
coverage files delta: 53562
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3419
summary startup failures last: 0
quality issues last: 0
memory free: 402.6 GB
load averages: 80.5 / 86.88 / 90.66 on 64 cores
latest fuzz level mix:
  browser-e2e=26 lanes/26 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5789150
browser-e2e likely-real findings: 762 over 2390.9 runner-hours
```

The largest unmet goals are still save/reload and real-user depth:

```text
reload-post-action: 1127/2000
title-save-reload: 582/1000
real-user-editing success: 611/1000
body-save-reload: 641/1000
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. CPU/load remain high; new fuzz work should stay
bounded and oracle-specific rather than adding broad browser concurrency.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T153253Z-synthesis.md`, keeps the Cycle370/Cycle372
replacement topology and says the split is blocked, not fileable. The matching
feedback action then updated `current-pr-split.md` with Cycle 374, completed
the post-`152607` audit, and completed the current post-`153610` audit. The
current proof artifact is:

```text
runs/20260518T153253Z/jobs/outputs/rtc-cycle374-post-153610-current-finalization-audit/report.md
```

Current split-persona status:

1. Keep `PR02B` as a blocked-validation sidecar after `PR02`. It still needs
   seed `1030001`, HTTP persistence-probe, targeted PHPUnit, CI, and a verified
   GitHub branch link.
2. Keep PR07 as two decision forks: `PR07B0` versus `121507`/`134558`, then
   `PR07B1A` versus
   `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`, with
   `PR03B`, `HOLD-07B2`, and `HOLD-07C` as comparison arms.
3. Keep raw `PR07D`, raw deferred heads, `PR17`, `PR18`, and `PR18x` out of the
   filing plan.
4. Treat the post-`153610` audit as current artifact proof, but only as
   local-host publication input. RichText, reload, and pre-save-search
   diagnostic/harness refs remain evidence-only until owner comparison or
   focused replay assigns product ownership.
5. Treat `153703` rich-text output as newer than the audited finalization and
   deferred for a later replay/downscope pass.

The latest duplicate/noise synthesis and feedback action at
`20260518T153904Z` completed the next control-plane layer:

- `rtc-browser-fuzz-novelty-monitor.mjs` now blocks empty materialization rescue
  on any current-output startup-noise hold, not only producer-local matching
  holds.
- `node --check bin/rtc-browser-fuzz-novelty-monitor.mjs` passed.
- Gate-only startup-drain, first-level analysis, deep-analysis, and
  live-analysis `--once` checks passed with startup-noise drains skipped and
  product-evidence work still visible.
- `rtc-coverage-guided-novelty` was restarted; supervisor was not restarted
  because supervisor code was unchanged.
- `npm run wp-env status` reported `Environment not initialized`; wp-env was
  not started because this was a control-plane script change.

This duplicate/noise work is health and scheduler-control evidence only. It
does not validate product fixes, does not make the PR stack file-ready, and
still needs a post-restart novelty full pass before making scheduler-yield
claims.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older exact fuzz
numbers, older enabled-group claims, old "keep existing split" guidance, and old
PR13 GitHub-ref caveats are superseded by the current branch-link audit, the
Cycle370/Cycle374 split shape, the repaired PR13 review refs listed above, and
the latest novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle325/i40 manifests, audited nonzero `20260518T130525Z`, audited `20260518T133533Z`, Cycle 368 artifacts for `20260518T135539Z`, Cycle 370 audited `20260518T143551Z`, audited `20260518T145558Z`, audited `20260518T150601Z`, audited `20260518T152607Z`, current audited `20260518T153610Z`, `121507`, `134558`, `123016`, `123520`, current `PR07B0`, current `PR07B1A`, raw reload/stale-epoch candidates `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`, deferred reload/search/rich-text diagnostics | active source family; `153610` is the latest audited local-host proof with `5` warnings, not GitHub-publication proof; filing remains blocked by PR07 owner evidence, missing verified GitHub links, seed `1020002`, PR02B validation, and final validation | Run PR02B validation and PR07 decision-fork owner replay; resolve deferred freshness through later finalization, downscope, focused replay, or loop-repair proof; then publish/fetch/audit exact GitHub links, repair or reclassify seed `1020002`, and run final-stack validation gates |
| Missing verified product refs | PR02A, PR02B, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-current, PR07B0-alt/`121507`/`134558`, PR07B1, PR07B1A, possible PR07B1B including `124525`/`130034`/`131542`/`133049`, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | recommended sidecar but not file-ready | Run seed `1030001`, short HTTP persistence-probe, targeted PHPUnit after bootstrap is available, PR CI, and exact branch-link audit |
| PR07 runtime / owner gate | PR07A1-A3, current PR07B0, `121507`/`134558`, chosen PR07B1, current PR07B1A, raw `111430/114448/123016/124525/130034/131542/133049`, `HOLD-07B2`, `HOLD-07C`, replay seeds `5200011`/`5200017`/`5200010`, reload/provider rejoin evidence `5817434bb6cf` / seed `1100001` | runtime readiness has durable `repaired_ready` evidence and PR07C readiness repair is terminal/resolved, but setup readiness is not product proof; PR07 now has two decision forks and no accepted file-ready owner shape; the `056aa92f293` family is comparison/hold evidence only; `5817434bb6cf` / seed `1100001` is separate provider-rejoin awareness evidence | Run owner matrix; require `git ls-files -u` empty, no conflict markers, `git diff --check`, materialized refs, and owner replay snapshots with durable REST/meta, `_crdt_document`, edited-record, provider/awareness, UI collaborator, branch-head, and first-divergence evidence |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-HOLD-07C non-coverage with first-divergence evidence |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates, rich-text `142117` harness/setup hardening | diagnostic or held until owner comparison proves product ownership; Cycle 368 strict owner comparison assigned no `PR18x` | Compare against PR05B, PR05C, clean PR05D, the chosen PR07B0/PR07B1 path, PR07B1A, and holds before assigning any new owner row |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, chosen `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, mixed product-evidence/startup-noise lanes, empty materialization rescue, coverage recommendation fallback enables, historical cooldown reuse, current no-analysis drains, producer-local duplicate/noise holds, duplicate family relaunches from paused/drain dirs | policy `28`, the `141322Z` remediation, the `145858Z` consumer-side cap, and the `153904Z` novelty scheduler patch are completed control-plane layers; latest direct gate checks passed, but raw novelty status still predates a full post-restart pass | Wait for the restarted novelty monitor to complete a full pass; confirm no no-product materialization rescue while a current-output startup hold is active and product-evidence signatures remain launchable |
| Current fuzz validation | `run-20260518T153026Z`, raw novelty pass at `2026-05-18T15:48:39.742Z`, trend generated at `2026-05-18T15:53:02Z` | current active-run triage has `0` signatures and `0` visible likely-real failures; current-drain triage has two product-evidence duplicate/noise signatures; unmet goals remain `4`, current duplicate share is `0`, historical duplicate share is about `0.3419`, and CPU/load remain high | Use this as current health/control-plane evidence only; accepted product evidence, owner replay, exact branch audit, PR02B validation, seed `1020002` repair/reclassification, and final PR-stack validation are still required before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw PR07D, PR17, PR18,
PR18x, or zero-byte/stale finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement Cycle325/i40 parallel-lane shape above, now including
   PR02B as a blocked-validation sidecar after PR02. Treat the Cycle 374
   post-`153610` audit as the current Parallel Progress Gate proof, but not
   complete filing proof or GitHub-publication proof. PR02B still needs seed
   `1030001`, HTTP persistence-probe, targeted PHPUnit, PR CI, and a verified
   GitHub branch link.
2. Treat PR07 as a two-stage decision fork: first compare current `PR07B0`
   against the restacked `121507`/`134558` saved-response/persisted-CRDT
   hydration candidate after `PR07A3`; then compare current `PR07B1A` against a
   conflict-resolved
   `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`
   stale-epoch candidate after the chosen `PR07B1`. Do not file the PR07 lane
   until conflict resolution, exact branch links, materialized refs,
   `git diff --check`, and owner replay choose replace/add/reorder for both
   forks.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Use the `105353Z` PR07 runtime `repaired_ready` evidence only as a
   precondition, not as product proof.
5. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   chosen `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old
   `HOLD-07B2 !-> PR09/PR15D`, clean PR05D only, PR15A-D after PR14B, and no
   fallback-tail PR05D.
6. Run held owner comparisons for strict projection, common-blocks, rich-text,
   search/live-collapse, and reload candidates before creating new product rows.
7. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
8. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
9. Treat duplicate/noise policy `28`, the completed `141322Z` remediation, the
   `145858Z` consumer cap, the `153904Z` novelty scheduler patch, and the latest
   novelty/trend status as control-plane health, not product validation or
   final-stack readiness.
10. After PR07 decision-fork owner evidence, exact branch-link audit for
   missing rows, PR02B validation, and seed `1020002` repair or
   reclassification land, rebuild the combined validation stack from explicit
   Cycle325/i40 heads plus accepted epoch work, then run focused checks,
   touched-file lint, branch graph/containment evidence, adjacent
   range-diffs/diffstats/numstats, `git diff --check`, feasible runtime checks,
   and fresh stack-wide validation.

The current useful bounded work is:

- use the completed `rtc-cycle374-post-153610-current-finalization-audit` as
  the latest audited proof that the `153610` finalization is nonzero and
  locally publish-current, while preserving its `5` warnings and its note that
  local publish currentness is not GitHub publication;
- run `rtc-cycle374-pr02b-focused-validation-1030001`: validate PR02B with
  seed `1030001`, a short HTTP persistence-probe shard, targeted PHPUnit after
  bootstrap is available, then PR CI;
- run PR07 decision-fork owner work only after conflict-free materialized
  candidates exist, comparing the chosen PR07B0/PR07B1 path, current PR07B1A,
  restacked `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049` if
  produced, PR03B, HOLD-07B2, HOLD-07C, and reload diagnostics;
- run focused deep triage for `5817434bb6cf` / seed `1100001` with
  room/provider/awareness snapshots before assigning ownership;
- run diagnostic-only owner replays for pre-save search seed `1100005` with
  `305c7bf515c3` and RichText seed `5100002` with `b021f220fc0`; keep the
  earlier reload/search/rich-text diagnostics evidence-only until a boundary
  result exists;
- keep the Cycle 368 strict parser-transform `67cd59` PR05 owner comparison as
  current evidence that assigns no `PR18x`;
- resolve remaining deferred-freshness warnings, including uncovered rich-text,
  reload, and pre-save-search diagnostics and the newer `153703` rich-text
  output, with later finalization, downscope, owner comparison, or a newer
  bounded audit;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`;
- refresh candidate/deferred status using only nonzero completed reports; never
  count `report.tmp`, setup-only, disk-preflight-only, zero-byte reports, or job
  launch alone as evidence;
- enforce the progress-gate rule so wait-only feedback, active sessions,
  `report.tmp`, zero-byte reports, disk-preflight-only output, job launch alone,
  stale or manifest-only output, and strict reductions without owner comparison
  cannot satisfy progress while actionable gate rows exist;
- monitor the bounded duplicate/noise family cap and the `153904Z` novelty
  scheduler patch through a post-restart full novelty pass before making yield
  or product claims;
- use the full raw novelty pass on `run-20260518T153026Z` only as current
  health/control-plane evidence: active current-run likely-real is `0`, but
  final-stack validation and filing still require the branch, PR02B, PR07, and
  seed `1020002` gates above.

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, raw deferred
publication, PR17, PR18, PR18x promotion, duplicate PR07 replay, or extra
browser lanes.
