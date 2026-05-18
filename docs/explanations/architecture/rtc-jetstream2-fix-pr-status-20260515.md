# RTC Jetstream2 fix and PR status report

Snapshot time: `2026-05-18T07:58:49Z`

Trigger event:
`pr-split-2026-05-18T07-57-36Z-20260518T074559Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T07-57-36Z-20260518T074559Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The newest completed split-persona synthesis,
`pr-split-20260518T074559Z-synthesis.md`, keeps the maintainer-facing split on
the Cycle324/i40 ungrouped topology, but supersedes the older `072938Z`
blocker state. This is a report/status update, not a filing green light.

Current status is blocked:

- `PR07` remains the main filing blocker.
- The latest synthesis says `/` is back above the Docker/browser replay
  threshold. The next PR07 owner replay must still record root free space in
  its durable output.
- Seed `1020002` blocks broad final-stack fuzzing, GitHub filing, and rebuilt
  stack-wide validation only. It must not serialize independent branch audit,
  deferred downscope, PR07 owner replay preparation, or loop repair work.
- `20260518T074350Z` is now nonzero and has a `60`-row manifest/audit, but it
  is stale for next-cycle use because it did not consume completed
  `073736Z` search and `074239Z` rich-text reports. `20260518T075352Z` is zero
  bytes and is not evidence.
- Exact verified GitHub branch links are still missing for many active i40
  rows, including `PR07B1A`.

The active replacement topology is:

```text
Ready/product:
PR01 -> PR02 (+ PR02A) -> PR03 -> PR04
-> PR05A -> PR05B -> PR05C -> clean PR05D
-> PR06A -> PR06B -> PR06C -> PR06D (+ PR06E)

Runtime-gated:
PR07A1 -> PR07A2 -> PR07A3 -> PR07B0 -> PR07B1 -> PR07B1A
hold HOLD-07B2 and HOLD-07C; no raw PR07D

CRDT/data-loss from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

Reject grouped `PR06`, `PR11`, `PR12`, and `PR15`; stale
Cycle293/Cycle306/local-publish rows; fallback-tail `PR05D`;
`d06e3528cbd`; `fix/rtc-fallback-group-delete-stale-local`; raw deferred
product filing heads; raw `PR07D`; `PR17`; `PR18`; and `PR18x`. Clean
`PR05D` is only `27c6e7924217038ed9b4ff71585e8041c67765a4`.

New or newly emphasized held/evidence rows:

- `HOLD-COMMON-BLOCKS-965003`: compare against `PR05B`, `PR05C`, clean
  `PR05D`, `PR07B0`, `PR07B1`, `PR07B1A`, and `HOLD-07C`; include related
  owner checks for `965010` and `5800001`.
- `SIDE-BLOCKLIB-COVER-965004`: likely block-library canonicalization issue,
  not RTC-stack product work yet.
- `DIAG-SEARCH-073736` at `87316e63a3d` and `DIAG-RICH-TEXT-074239` at
  `fd44eb7e3ae` are diagnostic evidence to consume in the next manifest
  refresh, not product PR slots.
- Search and rich-text remain diagnostic. No `PR18x` should be named until
  rich-text, linebreak, and parser reductions compare against `PR05B`,
  `PR05C`, and clean `PR05D`.

## Branch And Ref Status

Remote status was collected at `2026-05-18T07:58:44Z`.

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

The branch-link audit was generated at `2026-05-18T07:58:49Z` from fetched
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
| PR 2A | HTTP room-isolation regression sidecar after PR2 | No verified branch link yet | TBD | TBD | evidence-only until pushed/fetched/audited |
| PR 3 | Revision restore CRDT meta reset | [`review/rtc-pr03-revision-restore-crdt-reset`](https://github.com/danluu/gutenberg/tree/review/rtc-pr03-revision-restore-crdt-reset) | 2 | +58 / -5 | verified content; PR03B remains held |
| PR 4 | Persisted CRDT save-meta idempotence | [`review/rtc-pr04-crdt-save-meta-idempotence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr04-crdt-save-meta-idempotence) | 2 | +160 / -1 | verified content |
| PR 5A | Entity/reference normalization equivalence | No verified branch link yet | TBD | TBD | active i40 row; aggregate PR05 is prior art only |
| PR 5B | Parser/rich-text HTML equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5C | Preserve-whitespace linebreak equivalence | No verified branch link yet | TBD | TBD | active i40 row; exact branch still missing |
| PR 5D | Clean semicolonless/entity-validation after PR5C | No verified branch link yet | TBD | TBD | valid only for clean `27c6e7924217`; reject fallback/PR15-tail PR05D |
| PR 6A | Save-request payload guard subhead `705d84c` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; exact branch still missing |
| PR 6B | Save-request payload guard subhead `d127d3d` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; exact branch still missing |
| PR 6C | Save-request payload guard subhead `d4041cc` | No verified branch link yet | TBD | TBD | replaces grouped PR06 as active split; exact branch still missing |
| PR 6D | Save-request payload guard subhead `e072401` | No verified branch link yet | TBD | TBD | PR09 and PR06E must hang from this row |
| PR 6E | Malformed outgoing RTC save sidecar from PR06D | No verified branch link yet | TBD | TBD | sidecar must hang from PR06D, not PR07 |

### Runtime-Gated Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 7A1 | Save response entity-state guard microhead | No verified branch link yet | TBD | TBD | active i40 row; runtime owner evidence still missing |
| PR 7A2 | Save response skipped/base guard microhead | No verified branch link yet | TBD | TBD | active i40 row; stale replay must be cleared before rerun |
| PR 7A3 | Save response stale block/content guard microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B0 | Save response manager/base-record entry microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 7B1 | Save response manager/base-record owner microhead | No verified branch link yet | TBD | TBD | active i40 row; old holds stay siblings from here |
| PR 7B1A | Stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | runtime-gated Cycle324/i40 row after PR07B1; local head `c1d8ca017bce`; strict same-user reload witnesses, corrected owner replay, and a verified GitHub branch link are still missing |

### Independent CRDT/Data-Loss Lane

| PR | Scope | Audit branch link | Files | Diff | Current status |
| --- | --- | --- | ---: | ---: | --- |
| PR 9 | Core-data lock fairness from PR06D | [`review/rtc-pr09-store-lock-fairness`](https://github.com/danluu/gutenberg/tree/review/rtc-pr09-store-lock-fairness) | 2 | +185 / -2 | verified content; replacement manifest must prove PR06D ancestry and PR07 non-ancestry |
| PR 10 | CRDT block reconciliation foundation after PR9 | [`review/rtc-pr10-crdt-block-rebase-foundation`](https://github.com/danluu/gutenberg/tree/review/rtc-pr10-crdt-block-rebase-foundation) | 2 | +145 / -4 | verified content |
| PR 11A | Explicit-base top-level operation subhead `9376ea9` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11B | Explicit-base top-level operation subhead `3d228d0` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11C | Explicit-base top-level operation subhead `eb02980` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11D | Explicit-base top-level operation subhead `0f18951` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 11E | Explicit-base top-level operation subhead `75e065` | No verified branch link yet | TBD | TBD | replaces grouped PR11 as active split; exact branch still missing |
| PR 12A | Previous-local-cache operation subhead `fa13d1` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; exact branch still missing |
| PR 12B | Previous-local-cache operation subhead `80d6a4` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; exact branch still missing |
| PR 12C | Previous-local-cache operation subhead `95d3a0` | No verified branch link yet | TBD | TBD | replaces grouped PR12 as active split; exact branch still missing |
| PR 13A | Observed-delete top-level provenance | [`review/rtc-pr13a-observed-delete-provenance-repaired`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13a-observed-delete-provenance-repaired) | 2 | +1151 / -25 | repaired verified content |
| PR 13B0 | Identity/provenance guard microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13C is supporting fallback evidence |
| PR 13B1 | Direct cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row; repaired PR13B is supporting fallback evidence |
| PR 13B2 | Current-only cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 13B3 | Explicit-base cross-parent source retirement microhead | No verified branch link yet | TBD | TBD | active i40 row |
| PR 14 | Table body nested array merge | [`review/rtc-pr14-table-body-array-merge`](https://github.com/danluu/gutenberg/tree/review/rtc-pr14-table-body-array-merge) | 2 | +294 / -18 | verified content; seed `7110017` still shows PR14 alone is incomplete |
| PR 14B | Stale-shorter query-array local suffix append after PR14 | No verified branch link yet | TBD | TBD | required before active PR15A-D |
| PR 15A | Fallback-group operation subhead `687a13` after PR14B | No verified branch link yet | TBD | TBD | active i40 row; verified component prior art is not exact PR14B-based ref |
| PR 15B | Fallback-group operation subhead `17569a` after PR15A | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15C | Fallback-group operation subhead `bcf1c4` after PR15B | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |
| PR 15D | Fallback-group operation subhead `276709` after PR15C | No verified branch link yet | TBD | TBD | active i40 row; exact PR14B-based link missing |

### Held Sidecars, Fallbacks, And Prior Art

| Row | Scope | Audit branch link | Current status |
| --- | --- | --- | --- |
| PR 3B | Browser `restoreRevision` CRDT invalidation after PR3 | No verified branch link yet | held until PR03-vs-PR03B replay proves ownership |
| HOLD-07B2 | Save response terminal manager/base-record microhead | No verified branch link yet | still held as a sibling off PR07B1; do not confuse it with the `PR07B1A` epoch guard or local `PR07B2` alias |
| HOLD-07C | Save response/reload sibling evidence after PR07B1 | No verified branch link yet | held until owner replay proves coverage and distinctness; raw PR07D remains rejected |
| HOLD-COMMON-BLOCKS-965003/965010/5800001 | Common-blocks owner comparison for seeds `965003`, `965010`, and `5800001` | No verified branch link yet | compare against `PR05B`, `PR05C`, clean `PR05D`, `PR07B0`, `PR07B1`, `PR07B1A`, and `HOLD-07C`; not a product PR slot yet |
| SIDE-BLOCKLIB-COVER-965004 | Block-library canonicalization evidence for seed `965004` | No verified branch link yet | likely `core/cover` or block-library issue; track separately from RTC product stack |
| HOLD-STRICT-STALE-PROJECTION-5200005/5200008 | Strict stale projection/reload owner comparison against earlier plausible owners | No verified branch link yet | held comparison lane only; not a product PR slot |
| HARNESS-WS-URL | WebSocket/reload harness URL evidence | No verified branch link yet | harness-only row; not a product fix |
| HARNESS-PLUGIN-STATUS | Plugin status JSON stall/retry harness sidecar | No verified branch link yet | harness-only row; queue separately from product PRs |
| HARNESS-WS-BOOTSTRAP-051619 | WebSocket bootstrap harness guard | No verified branch link yet | harness-only row from an earlier handoff; not a product fix |
| DIAG-RELOAD-045607 | Reload diagnostic row from earlier Cycle324/i40 finalization | No verified branch link yet | diagnostic/evidence-only row; not a product PR slot |
| DIAG-RELOAD-063159 | Reload diagnostic row from the 60-row handoff | No verified branch link yet | diagnostic/evidence-only row; not a product PR slot |
| DIAG-RELOAD-064709 | Reload diagnostic row from the 60-row handoff | No verified branch link yet | diagnostic/evidence-only row; not a product PR slot |
| DIAG-SEARCH-073736 | Search/live-collapse diagnostic evidence at `87316e63a3d` | No verified branch link yet | diagnostic/evidence-only row; consume in the next manifest refresh before any owner promotion |
| DIAG-RICH-TEXT-074239 | Rich-text diagnostic evidence at `fd44eb7e3ae` | No verified branch link yet | diagnostic/evidence-only row; setup health and focused replay still required |
| DIAG-RICH-TEXT-051616 | Rich-text suffix instrumentation row | No verified branch link yet | diagnostic/test-only row; not a product PR slot |
| PR 5 aggregate | Parser/entity normalization equivalence | [`review/rtc-pr05-parser-entity-normalization-equivalence`](https://github.com/danluu/gutenberg/tree/review/rtc-pr05-parser-entity-normalization-equivalence) | verified prior art, not the active PR05A-D split |
| PR 6 aggregate | Save request payload guards | [`review/rtc-pr06-save-request-payload-guards`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06-save-request-payload-guards) | verified aggregate prior art; replaced by active PR06A-D recommendation |
| PR 6A prior art | Persisted empty-content CRDT body guard | [`review/rtc-pr06a-persisted-empty-content-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr06a-persisted-empty-content-guard) | verified prior art; do not confuse with active PR06A-D payload split |
| PR 7A aggregate | Save response entity-state guards | [`review/rtc-pr07a-save-response-actions-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07a-save-response-actions-guard) | verified prior art, not the active PR07A1-A3 split |
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0-B1 plus PR07B1A split |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 13B repaired fallback | Cross-parent source retirement fallback | [`review/rtc-pr13b-source-retirement`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13b-source-retirement) | repaired verified fallback until PR13B0-B3 have verified exact links |
| PR 13C repaired fallback | Stale block identity smear guard fallback | [`review/rtc-pr13c-stale-block-identity-smear-guard`](https://github.com/danluu/gutenberg/tree/review/rtc-pr13c-stale-block-identity-smear-guard) | repaired verified fallback and supporting evidence |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T07:58:44Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T072506Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The raw novelty monitor at `2026-05-18T07:58:25.768Z` completed a full pass
for `run-20260518T072506Z`, but it remains coverage/control-plane evidence,
not final-stack validation:

```text
coverage files: 51111
total records seen: 80922
coverage lines seen this pass: 83289
new behavioral feature keys this pass: 0
new CDP coverage hashes this pass: 0
unmet goals: 5
quality issues: 0
health: ok
enabled groups: none listed in the raw novelty status
active current-run triage roots: 0
active current-run signatures: 0
active current-run likely-real visible: 0
current drain triage roots: 3
current drain signatures: 1
current drain raw signatures: 9
current drain product-evidence signatures: 1
current drain likely-real visible: 1
current drain top family: reload_rejoin_awareness_stall
historical likely-real visible: 307
combined likely-real visible: 308
```

Interpretation:

- The active current-run scope has no visible likely-real product failure. That
  does not clear filing or final-stack validation because this is still the
  `try/rtc-fix-stack-validation` fuzz repo, not a refreshed final PR stack.
- The current drain scope has one visible likely-real/product-evidence
  signature in `reload_rejoin_awareness_stall`. Keep it visible and
  family-capped; do not suppress it as startup noise and do not count it as
  validation success.
- No-product startup noise still controls scheduling. Many WS groups are
  paused or held for `pre_action_bootstrap_stall`; the monitor skipped several
  recommended groups because the current startup-noise hold was active, and no
  bounded safe fallback was available.
- Historical/raw historical duplicates remain dominated by older startup and
  session families, especially raw `pre_action_bootstrap_stall`. These are
  useful for scheduler hygiene but must not be presented as live product
  failures.

Latest raw unmet coverage goals remain concentrated in save/reload and
real-user depth:

```text
reload-post-action: 1098/2000
title-save-reload: 554/1000
real-user-editing success: 603/1000
body-save-reload: 613/1000
ui-format-paragraph: 1899/2000
```

The latest trend packet was generated at `2026-05-18T07:53:38Z`:

```text
monitor passes: 2224
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T07:50:18Z
coverage files: 272 -> 51095
coverage files delta: 50823
unmet goals: 5
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3435
summary startup failures last: 0
quality issues last: 0
memory free: 419.1 GB
load averages: 60.74 / 60.22 / 66.44 on 64 cores
latest fuzz level mix:
  browser-e2e=26 lanes/26 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5605894
browser-e2e likely-real findings: 710 over 2171.2 runner-hours
latest suggested PR net LOC total: 2152
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. CPU/load is high enough that top-offs should be
guarded by startup-stall, supervisor-state, materialization, and
product-evidence checks rather than simply adding browser concurrency.

## Status-Persona Analysis

The newest completed split-persona synthesis,
`pr-split-20260518T074559Z-synthesis.md`, says:

- Overall status is blocked, with the active split staying on the Cycle324/i40
  ungrouped topology.
- `20260518T074350Z` is nonzero and has a `60`-row manifest/audit, but it is
  stale for next-cycle use because it did not consume completed `073736Z`
  search and `074239Z` rich-text reports. `20260518T075352Z` is zero bytes and
  must be rejected.
- `PR07` remains the filing blocker. The latest synthesis says `/` is back
  above threshold, so run exactly one corrected PR07 owner replay now and
  include a root free-space record in the durable output.
- Seed `1020002` blocks final-stack fuzzing, filing, and stack-wide validation
  only; it should not block independent manifest audit, owner comparison, or
  deferred downscope work.
- Consume `073736Z` as diagnostic search evidence at `87316e63a3d` and
  `074239Z` as diagnostic rich-text evidence at `fd44eb7e3ae`; do not promote
  either without focused owner comparison.
- Keep `965003` as likely-real held/common-blocks owner evidence, including
  `965010` and `5800001` comparisons. Keep `965004` separate as a `core/cover`
  or block-library canonicalization question until owner comparison proves
  otherwise.
- Treat wait-only feedback as invalid while Parallel Progress Gate rows exist.
  Zero-byte reports, `report.tmp`, active-session-only status,
  disk-preflight-only output, stale manifests, and "active `1020002` exists"
  count as no progress.

The latest duplicate/noise persona file,
`duplicate-noise-20260518T073243Z-synthesis.md`, is nonzero. Its primary
finding is that preserved `.triage-watcher/no-analysis.json` sentinels can leak
across output roots or outlive their intended cooldown if expiry and
product-evidence metadata are missing or dropped on rewrite. The smallest safe
follow-up is a consistent active-sentinel rule in novelty, live analysis,
triage watcher, analysis tier, and deep-analysis tier: valid only for the
current output root, valid only before `expiresAt` or `pauseUntil`, preserve
product-evidence metadata, and never blanket-suppress product-evidence
signatures. The latest matching duplicate/noise feedback-action file is zero
bytes, so it is not completion evidence.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older "keep
existing split", old PR13 review-ref warnings, old enabled-group claims, and
"do not add PR06B" recommendations are superseded by the repaired PR13 audit
links, current Cycle324/i40 ungrouped source-family recommendation,
`PR07B1A`, the newer durable manifest audits, latest duplicate/noise persona
analysis, and latest novelty/trend/control-plane evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, `20260518T074350Z`, `PR07B1A`, reload diagnostics, search diagnostic `073736Z`, rich-text diagnostic `074239Z`, and harness rows | active source family; latest split consensus uses the Cycle324/i40 ungrouped shape plus runtime-gated `PR07B1A`; `074350Z` is nonzero with a `60`-row manifest/audit but stale until it consumes `073736Z` and `074239Z`; `075352Z` is zero bytes | Run a post-`074350Z` nonzero manifest/bundle/head audit that consumes `073736Z` and `074239Z`, rejects `075352Z`, writes base allowlist and head/bundle/manifest checks, and publish/fetch/audit verified GitHub links for missing exact i40 rows |
| Stale or incomplete publication artifacts | stale local-publish rows, old Cycle293/Cycle306 rows, previous zero-byte reports after they are superseded, `report.tmp`, header-only outputs, stale manifests, `20260518T073347Z/finalization.report.md`, and `20260518T075352Z` | no filing evidence; zero-byte or stale artifacts are no progress | Replace with nonzero report, manifest, bundle, branch graph, range-diff/diffstat/numstat/patch-id, freshness evidence, and verified GitHub refs |
| Missing verified product refs | PR02A, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-B1, PR07B1A, old `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, PR07B0-B1, PR07B1A, old `HOLD-07B2`, `HOLD-07C`; current replay seeds `5200013`, `5200020`, and `5200024` plus `5200005` where applicable | existing replay/continuation evidence is setup/runtime-readiness only unless it writes durable rows and snapshots; latest synthesis says `/` is back above threshold; PR07 remains the main blocker | Run exactly one corrected PR07 owner replay with REST/meta, `_crdt_document`, edited-record, Y.Doc/provider/awareness, UI collaborator state, block-tree first-divergence snapshots, branch heads, root free-space record, and nonzero `report.md` |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-`HOLD-07C` non-coverage with first-divergence evidence |
| PR05D semicolonless entity validation | clean PR05C-adjacent branch `27c6e7924217` | real PR05-family work after PR05C; no verified product branch link yet; rich-text residuals stay diagnostic | Publish/fetch/audit clean PR05D and compare PR05B/PR05C/clean-PR05D before assigning any PR18x owner |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | latest replacement requires the CRDT/data-loss lane from PR06D, not PR07 | Prove `PR06D -> PR09`, `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | PR13A plus desired PR13B0/B1/B2/B3 | PR13A has repaired verified link; repaired PR13B/C links are the only verified fallback/supporting PR13 links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing fallback refs |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| PR03B browser restoreRevision invalidation | held PR03 sidecar | held until runtime replay distinguishes PR03 from PR03B ownership | Run PR03 vs PR03B after runtime readiness is healthy |
| Strict stale projection owner comparison | `HOLD-STRICT-STALE-PROJECTION-5200005/5200008`; compare `PR11A`, `PR11E`, `PR12C`, `PR13B3`, `PR07B1`, `PR07B1A`, and `HOLD-07C` | held comparison lane only; not a product PR slot | Run focused owner replay for seeds `5200005` and `5200008` before creating any new strict-projection product row |
| Common-blocks owner comparison | `HOLD-COMMON-BLOCKS-965003`, plus related seeds `965010` and `5800001` | held comparison row; `965003` is likely real but currently reads as post-save/reload common-block canonical drift, not clean pre-save search loss | Compare against `PR05B`, `PR05C`, clean `PR05D`, `PR07B0`, `PR07B1`, `PR07B1A`, and `HOLD-07C` |
| Block-library canonicalization side evidence | `SIDE-BLOCKLIB-COVER-965004` | likely `core/cover` or block-library canonicalization issue; not RTC-stack product work yet | Track separately as block-library diagnostic unless ownership evidence changes |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzz, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Active deferred sessions | reload-hydration, search/live-collapse, rich-text suffix, `DIAG-RELOAD-045607`, `DIAG-RELOAD-063159`, `DIAG-RELOAD-064709`, `DIAG-SEARCH-073736`, `DIAG-RICH-TEXT-074239`, `DIAG-RICH-TEXT-051616`, `HARNESS-WS-URL`, `HARNESS-PLUGIN-STATUS`, `HARNESS-WS-BOOTSTRAP-051619` | active sessions are not progress by themselves; `073736Z` and `074239Z` are diagnostic evidence to consume, not product slots; harness rows are not product fixes | Count only nonempty durable reports/artifacts, audited harness refs, or a clear downscope/promotion decision |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, real-user duplicate-family holds, novelty recommendation/fallback enable paths, and `.triage-watcher/no-analysis.json` sentinel lifetime | newest duplicate/noise synthesis says the immediate risk is stale or malformed no-analysis sentinel state leaking across output roots or past expiry; active-scope product evidence must stay visible | Add a current-root and expiry-bounded active-sentinel rule across novelty, live analysis, triage watcher, analysis tier, and deep-analysis tier; preserve product-evidence metadata; validate with `node --check` and bounded gate-only/live-analysis checks |
| Current fuzz validation | `run-20260518T072506Z`, novelty read at `2026-05-18T07:58:25Z`, trend generated at `2026-05-18T07:53:38Z` | full pass completed with active current-run likely-real `0`, drain likely-real/product-evidence `1`, `5` unmet goals, no quality issues, no raw enabled groups listed, and improved but still high load; this is control-plane/coverage health, not final-stack validation | Wait for refreshed stack product evidence and final PR-stack validation before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file i31, i32, i33, i34, i35, i36,
i37, stale i38, stale i39, stale/unpushed i40, Cycle293, Cycle306, grouped
Cycle320/i40, grouped PR06/PR11/PR12/PR15 as active units, `ready/*`,
validation-stack, dirty evidence, fallback-tail branches, raw
deferred/candidate refs, PR17, PR18, PR18x, or zero-byte/stale finalization
artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the Cycle324/i40 ungrouped source family as the base, with
   `PR07B1A` at `c1d8ca017bce4f43aa89cc0128e45fe5568d74e2` as the current
   runtime-gated epoch row after `PR07B1`.
2. Treat `20260518T074350Z` as useful but stale nonzero evidence until a
   post-deferred manifest/bundle/head audit consumes `073736Z` search and
   `074239Z` rich-text diagnostics. Reject zero-byte or stale reports,
   including `20260518T073347Z/finalization.report.md` and `075352Z`.
3. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
4. Because the latest synthesis says `/` is back above replay threshold, run
   exactly one corrected PR07 owner replay over `PR07B0`, `PR07B1`,
   `PR07B1A`, `HOLD-07B2`, and `HOLD-07C` for seeds `5200013`, `5200020`,
   `5200024`, plus `5200005` where applicable. Require REST/meta,
   `_crdt_document`, edited-record, Y.Doc/provider, awareness, UI collaborator
   state, block-tree first-divergence artifacts, branch heads, root free-space
   record, and a nonzero `report.md`.
5. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old
   `HOLD-07B2 !-> PR09/PR15D`, clean PR05D only, PR15A-D after PR14B, and no
   fallback-tail PR05D.
6. Run held owner comparisons for `5200005`, `5200008`, `965003`, `965010`,
   `5800001`, and any rich-text/search/reload candidates before creating new
   product rows. Keep `965004` separate as block-library canonicalization
   evidence unless ownership changes.
7. Until PR13B0/B1/B2/B3 have verified branch links, use only the repaired
   PR13A/B/C audit links listed above for current PR13 content/fallback
   evidence.
8. Keep old aggregate or stale prior art, broad PR08, dirty evidence branches,
   stale/misordered PR13 refs, fallback-tail PR15/PR05D confusion, and the
   untracked reload-hydration gate spec out of filing branches and push
   allow-lists.
9. Treat duplicate/noise fixes as control-plane hygiene only. Product evidence
   must remain visible and family-capped; control-plane health does not count
   as product validation or final-stack fuzzing.
10. After the post-`074350Z` manifest refresh, PR07B1A owner evidence, exact
   branch-link audit, and seed `1020002` repair or reclassification land,
   rebuild the combined validation stack from explicit Cycle324/i40 heads plus
   accepted epoch work, then run focused checks, touched-file lint, branch
   graph/containment evidence, adjacent range-diffs/diffstats/numstats,
   `git diff --check`, feasible runtime checks, and fresh stack-wide
   validation.

The current or next useful bounded jobs are:

- post-`074350Z` manifest refresh and bundle/head audit that consumes
  `073736Z` and `074239Z`, rejects `075352Z`, and writes nonzero evidence
- one corrected PR07 owner replay for `5200013`, `5200020`, `5200024`, and
  `5200005` where applicable
- common-blocks owner comparison for `965003`, `965010`, and `5800001`
- separate classification/tracking for likely `core/cover` or block-library
  canonicalization seed `965004`
- focused search diagnostic replay against `965003`, `965010`, `5800001`, and
  the pre-save search spec
- rich-text setup-health repair and focused replay for `5100009`, `5100002`,
  and `7310038` against the `074239Z` diagnostic branch
- duplicate/noise active-sentinel lifetime repair and a bounded gate-only /
  live-analysis validation pass

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, PR17, PR18, PR18x
promotion, or extra browser lanes.
