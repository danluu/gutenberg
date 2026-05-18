# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T15:28:21Z`

Trigger event:
`duplicate-noise-2026-05-18T15-27-08Z-198`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/duplicate-noise-2026-05-18T15-27-08Z-198/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

Cycle 372 is now the latest applied split-feedback action in
`current-pr-split.md`. It keeps the Cycle370/Cycle325-i40 maintainer-facing
topology, but updates the current proof artifact: the `20260518T145558Z` audit
passed first, then the newer `20260518T150601Z` finalization became nonzero and
passed the bounded head/bundle/manifest audit with `0` hard failures and `6`
warnings. Treat the `150601` audit as current local-host publication input, not
GitHub publication proof or product-promotion proof.

The ready/local and CRDT/data-loss lanes remain usable, but the split is still
not fileable: final-stack fuzzing, GitHub filing, and stack-wide validation are
blocked by seed `1020002`, PR02B validation, PR07 decision-fork ownership,
unresolved deferred-freshness warnings from the `150601` audit, missing
verified branch links, and final validation. The Cycle 372 `150601` audit
supersedes the Cycle 370 post-`143551Z` proof for artifact freshness, but it is
still local-host publication input only.

`PR02B` remains part of the recommended split. It is the HTTP polling awareness
rejoin retry for seed `1030001` from `20260518T140108Z`, not PR07 reload
hydration. The completed Cycle 372 `150601` audit verified PR02B
blocked-validation status, but PR02B still needs seed `1030001`, a short HTTP
persistence-probe shard, targeted PHPUnit once bootstrap is available, PR CI,
and a verified GitHub branch link before filing.

The old linear PR07 tail remains rejected. First compare current `PR07B0` with
the `121507`/`134558` saved-response/persisted-CRDT hydration candidate family;
then, only after the chosen or additive `PR07B1`, compare current `PR07B1A` with
the collapsed stale sync-manager/entity-epoch family
`111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`. Current
`PR07B1A` still must not be claimed to cover that family. The Cycle 368 PR07
restack summary is not enough; the next PR07 job must materialize clean
candidates and prove `git ls-files -u` empty, no conflict markers,
`git diff --check`, materialized refs, and owner replay snapshots before
accepting a PR07 branch shape. `5817434bb6cf` / seed `1100001` remains separate
reload/provider rejoin awareness evidence, not coverage from the stale
sync-manager epoch guard.

The current maintainer-facing split recommendation is:

```text
Ready/local lane:
PR01 -> PR02
  + PR02A HTTP room-isolation sidecar
  + PR02B HTTP polling awareness rejoin retry, blocked validation
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

Current blockers and status changes:

- PR02B is recommended but not file-ready. It has no verified GitHub branch link
  yet; the Cycle 372 post-`150601` audit verifies only blocked-validation
  status. Seed `1030001`, HTTP persistence-probe, targeted PHPUnit, PR CI, and
  a verified GitHub branch link still block it from becoming a maintainer-facing
  PR row.
- PR07 is blocked on ownership and is not file-ready. The PR07C browser-env
  repair should be considered terminal/resolved for readiness, but that only
  removes a setup blocker; it is not product proof. The next PR07 job must
  materialize conflict-free candidate refs before owner replay.
- `PR07B1A` is still not proven to cover the newer stale-epoch family. Current
  `PR07B1A` is still `9964238035d698b2ca22e0ece2cf09de0cb00b07`; the newer
  `124525`/`130034`/`131542`/`133049` evidence is the same `056aa92f293` stale
  sync-manager/entity-epoch family. That family is comparison or hold evidence
  only until it is restacked, conflict-resolved, materialized, and owner-replayed.
- Raw `PR07D` and raw reload-hydration publication remain rejected unless the
  PR07B/PR07C ownership audit proves a distinct delta. `PR18x` is rejected by
  the Cycle 368 strict owner comparison against `PR05B`, `PR05C`, and clean
  `PR05D`; rich-text `142117` is harness/setup hardening only, not product
  rich-text coverage.
- Seed `1020002` remains a blocker only for final-stack fuzzing, GitHub filing,
  rebuilt stack-wide validation, and its own repair or reclassification. It must
  not serialize independent PR02B audit, ready/local work, CRDT-lane work, PR07
  materialization/owner work, branch audit, deferred downscope, strict owner
  checks, or loop repair.
- Duplicate/noise control-plane work has policy `28` plus the completed
  `141322Z` remediation as prior layers. The newest duplicate/noise feedback
  action at `20260518T145858Z` implemented the bounded consumer-side
  current-output family cap in the remote fuzz repo, validated the three
  patched scripts with `node --check`, restarted the live analysis session, and
  measured the current root with `noProductQueuedOrRunning=0`,
  `productEvidenceQueuedOrRunning=1`, and one `persisted_content_mismatch`
  representative. Treat this as control-plane health only, not product
  validation or final-stack readiness.

## Branch And Ref Status

Remote status was collected at `2026-05-18T15:28:17Z`.

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

The branch-link audit was generated at `2026-05-18T15:28:21Z` from fetched
`danluu` refs. It proves only that rows marked `verified-content` exist on
`danluu` and have non-empty audited diffs against the listed bases. It does not
prove exact Cycle325/i40 publication shape, ancestry, owner evidence, or filing
readiness.

Use only these repaired audited PR13 review refs for PR13 maintainer-facing
content:

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
| PR 2A | HTTP room-isolation regression sidecar after PR2 | No verified branch link yet | TBD | TBD | evidence-only until pushed, fetched, and audited |
| PR 2B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | current blocked-validation status verified by Cycle 372 post-`150601` audit; blocked on seed `1030001`, HTTP persistence-probe, targeted PHPUnit, PR CI, and a verified GitHub branch link |
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
| PR 7B1 | Save response manager/base-record owner microhead after the chosen PR07B0 arm | No verified branch link yet | TBD | TBD | not file-ready until PR07B0-current vs `121507`/`134558` is decided; old holds stay comparison arms |
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
collected_at_utc: 2026-05-18T15:28:17Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T152256Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

The latest raw novelty monitor status at `2026-05-18T15:28:07.653Z` is
startup-only on the new output root:

```text
status: monitor started; full coverage pass pending
observed roots: 497
previous records loaded: 86722
supervisor groups file: 1
active run dirs: 1
unmet goals: pending until first pass
triage signatures: pending until first pass
likely-real visible: pending until first pass
top duplicate family share: pending until first pass
health: warning, startup status only
```

Interpretation:

- The latest raw novelty read cannot support current-run likely-real, duplicate,
  unmet-goal, or recommended-group claims yet because the first full pass on
  `run-20260518T152256Z` has not completed.
- Do not carry forward the previous full-pass numbers as
  current raw status. Use them only as historical/control-plane context.
- The fuzz repo is still active validation infrastructure. It is not the final
  PR stack and cannot substitute for a rebuilt combined validation stack from
  explicit Cycle325/i40 heads.

The latest trend packet was generated at `2026-05-18T15:21:01Z`. It is graph
evidence from the last completed monitor pass before the startup-only raw
novelty read:

```text
monitor passes: 2267
first pass: 2026-05-15T01:21:42Z
last pass: 2026-05-18T15:03:35Z
coverage files: 272 -> 53536
coverage files delta: 53264
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3421
summary startup failures last: 0
quality issues last: 0
memory free: 404.2 GB
load averages: 92.01 / 91.09 / 90.13 on 64 cores
enabled groups current at trend time: none listed in packet
latest fuzz level mix:
  browser-e2e=25 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5776634
browser-e2e likely-real findings: 758 over 2370.7 runner-hours
```

The latest trend packet still has the largest unmet goals concentrated in
save/reload and real-user depth:

```text
reload-post-action: 1123/2000, remaining 877
title-save-reload: 578/1000, remaining 422
real-user-editing success: 611/1000, remaining 389
body-save-reload: 637/1000, remaining 363
```

Browser E2E remains the only level with confirmed likely-real findings, but
lower-level lanes are under-triaged and should not be declared useless from
zero likely-real output. CPU/load remain high; new fuzz work should stay
bounded and oracle-specific rather than adding broad browser concurrency.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T150146Z-synthesis.md`, plus its paired feedback action,
keeps the same topology and still says the split is not fileable. The feedback
action added Cycle 372 to `current-pr-split.md` and verified fresh independent
progress through the newer `150601` audit. Keep the ready/local and
CRDT/data-loss lanes, keep `PR02B` as a blocked-validation sidecar after PR02,
and keep PR07 as a runtime-gated decision fork rather than a linear tail.

The new split-persona status changes are:

1. Treat `20260518T150601Z` as the current local-host publication proof after
   `rtc-cycle372-post-150601-current-deferred-bundle-manifest-audit` completed
   with `status=PASS`, `0` hard failures, and `6` warnings. The earlier
   `145558` audit passed but is superseded for artifact freshness.
2. Treat the `150601` audit as local-host evidence only. Jetstream did not push
   to GitHub, the latest local publish manifest has no rows matching the
   `150601` manifest destination/SHA pairs, and raw deferred work is still not
   product-promotion proof.
3. Keep `PR02B` blocked on seed `1030001`, HTTP persistence probe, targeted
   PHPUnit, CI, and a verified GitHub branch link.
4. Keep PR07 as two decision forks: `PR07B0` versus `121507`/`134558`, then
   `PR07B1A` versus
   `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`, with
   `PR03B`, `HOLD-07B2`, and `HOLD-07C` as comparison arms.
5. Keep raw `PR07D`, raw deferred heads, `PR17`, `PR18`, and `PR18x` out of the
   filing plan. Pre-save search, rich-text suffix, and reload/post-save
   residuals remain diagnostic until owner comparison or replay proves a product
   delta.

Completed or newly interpreted split feedback:

- Cycle 372 is the latest applied split-feedback action in
  `current-pr-split.md`. It preserves the Cycle370 shape, verifies nonzero
  progress without waiting on seed `1020002`, and sets
  `runs/20260518T150146Z/jobs/outputs/rtc-cycle372-post-150601-current-deferred-bundle-manifest-audit/report.md`
  as the current Parallel Progress Gate proof.
- The `150601` audit verified a nonzero finalization report, `77` manifest
  rows, live heads, generated bundle heads, head/bundle/manifest agreement,
  base allowlist, PR02B blocked-validation status, raw deferred rejection, and
  local publish currentness. It is local-host publication input, not GitHub
  publication proof.
- The next bounded split jobs are no longer the post-`145558` audit; they are
  PR02B validation and PR07 materialized decision-fork owner replay. Any newer
  finalization still needs its own nonzero report and matching
  head/bundle/manifest/base audit before it becomes evidence.
- Additional bounded diagnostics are current but evidence-only: reload replay
  using `145637` with seeds `1100005`, `1100003`, `5200002`, and `5200003`;
  rich-text/button undo-redo replay using `145134` with seed `5100002`; and
  pre-save search replay using the `145132` branch. Do not promote any of these
  without a boundary result.
- PR07 remains unresolved until a new job proves clean materialized candidates,
  `git ls-files -u` empty, no conflict markers, `git diff --check`, and owner
  replay snapshots with durable REST/meta, `_crdt_document`, edited-record,
  provider/awareness, UI collaborator, branch-head, and first-divergence
  evidence.
- Cycle 368 strict owner comparison against `PR05B`, `PR05C`, and clean `PR05D`
  passed and assigned no `PR18x`. Clean `PR05D` remains only
  `27c6e7924217038ed9b4ff71585e8041c67765a4`; fallback-tail PR05D manifests
  based on `fix/rtc-fallback-group-delete-stale-local`, `d06e3528cbd`, or PR15
  tails remain invalid.
- `PR07C` browser-env repair should be marked terminal/resolved for readiness;
  the next work is owner replay and branch adjudication, not another readiness
  repair loop.
- Loop progress rules still need enforcement: active sessions, zero-byte reports,
  `report.tmp`, stderr-only output, disk-preflight-only output, active
  `1020002`, stale manifests, and manifest-only output are no progress while the
  Parallel Progress Gate has actionable rows.

The latest duplicate/noise persona report,
`duplicate-noise-20260518T145858Z-synthesis.md`, identified a fragmented
control-plane invariant across novelty, live analysis, first-level analysis,
and deep analysis. The paired
`duplicate-noise-20260518T145858Z-feedback-action.md` then implemented the
bounded consumer-side cap in the remote fuzz repo:

- `bin/rtc-browser-fuzz-analysis-tier.mjs` now scans all current-output
  `.triage-watcher` run dirs and counts `family-capped` representatives.
- `bin/rtc-browser-fuzz-deep-analysis-tier.mjs` now scans all current-output
  dirs and counts `running`, `completed`, `family-capped`, and failed-at-max
  deep jobs for known duplicate/noise families.
- `bin/rtc-browser-fuzz-live-analysis-monitor.mjs` now uses the same
  current-output caps and no longer lets stale `noProductOnly` sentinels block
  current product-evidence signatures.
- `node --check` passed for all three scripts. The measured current root was
  `/media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T152256Z`
  with `rawSignatures=1`, `noProductQueuedOrRunning=0`,
  `productEvidenceQueuedOrRunning=1`, one `persisted_content_mismatch`
  representative, one first-level product-evidence job running, and zero deep
  jobs.

The earlier `duplicate-noise-20260518T120846Z`,
`duplicate-noise-20260518T124635Z`, and
`duplicate-noise-20260518T141322Z` feedback actions still count as completed
control-plane layers. They are superseded for current readiness claims by the
latest `145858Z` implementation: treat duplicate/noise improvements as
control-plane health only, and do not convert scheduler or family-cap health
into product validation. The active coverage pointer advanced during
validation, so follow-up should monitor the current root rather than claim a
stable product-yield result.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only families
out of the split, and make filing gates explicit. Their older "keep existing
split", old PR13 review-ref warnings, old enabled-group claims, and old "do not
add PR06B" recommendations are superseded by the repaired PR13 audit links, the
two-stage PR07 decision fork, PR06E/PR02A sidecar status plus PR02B, policy
`28`, the completed Cycle 368 artifacts, the completed Cycle 372 post-`150601`
audit, the implemented duplicate/noise consumer cap, and the latest
startup-only raw novelty plus trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle325/i40 manifests, audited nonzero `20260518T130525Z`, now-nonzero `20260518T132530Z`, audited nonzero `20260518T133533Z`, Cycle 368 artifacts for `20260518T135539Z`, zero-byte/no-evidence `20260518T140542Z`, live `20260518T142548Z` finalization containing PR02B, Cycle 370 audited `20260518T143551Z`, zero-byte/no-evidence `20260518T144555Z`, audited `20260518T145558Z`, current audited `20260518T150601Z`, `121507`, `134558`, `123016`, `123520`, current `PR07B0`, current `PR07B1A`, raw reload/stale-epoch candidates `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`, deferred reload/search/rich-text diagnostics | active source family; `130525Z`, `133533Z`, Cycle 368 artifacts, Cycle 370 post-`143551Z`, and Cycle 372 post-`150601` are branch/bundle/manifest evidence but not complete deferred-coverage or GitHub-publication proof; `150601` is the current local-host proof with `6` warnings; `140542Z` and `144555Z` remain rejected while zero-byte/no-evidence; filing remains blocked by PR07 owner evidence, missing verified GitHub links, seed `1020002`, PR02B validation, unresolved deferred freshness warnings, and final validation | Run `rtc-cycle372-pr02b-http-awareness-rejoin-1030001-validation` and `rtc-cycle372-pr07-materialized-decision-fork-owner-replay`; resolve deferred freshness through later finalization, downscope, focused replay, or loop-repair proof; then publish/fetch/audit exact GitHub links, repair or reclassify seed `1020002`, and run final-stack validation gates |
| Missing verified product refs | PR02A, PR02B, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-current, PR07B0-alt/`121507`/`134558`, PR07B1, PR07B1A, possible PR07B1B including `124525`/`130034`/`131542`/`133049`, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR07 runtime / owner gate | PR07A1-A3, current PR07B0, `121507`/`134558`, chosen PR07B1, current PR07B1A, raw `111430/114448/123016/124525/130034/131542/133049`, `HOLD-07B2`, `HOLD-07C`, reload/provider rejoin evidence `5817434bb6cf` / seed `1100001` | runtime readiness has durable `repaired_ready` evidence and PR07C readiness repair is terminal/resolved, but setup readiness is not product proof; PR07 now has two decision forks and no accepted file-ready owner shape; the `056aa92f293` family is comparison/hold evidence only; `5817434bb6cf` / seed `1100001` is separate provider-rejoin awareness evidence | Run `rtc-cycle372-pr07-materialized-decision-fork-owner-replay`; require `git ls-files -u` empty, no conflict markers, `git diff --check`, materialized refs, and owner replay snapshots with durable REST/meta, `_crdt_document`, edited-record, provider/awareness, UI collaborator, branch-head, and first-divergence evidence; deep-triage `5817434bb6cf` / seed `1100001` with room/provider/awareness snapshots; compare patch IDs/range-diffs/diffstats before assigning any PR07 owner |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-HOLD-07C non-coverage with first-divergence evidence |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates, rich-text `142117` harness/setup hardening | diagnostic or held until owner comparison proves product ownership; Cycle 368 strict owner comparison assigned no `PR18x` | Compare against PR05B, PR05C, clean PR05D, the chosen PR07B0/PR07B1 path, PR07B1A, and holds before assigning any new owner row |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, chosen `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, mixed product-evidence/startup-noise lanes, empty materialization rescue, coverage recommendation fallback enables, historical cooldown reuse, current no-analysis drains, producer-local duplicate/noise holds, duplicate family relaunches from paused/drain dirs | policy `28` and the `141322Z` remediation remain prior control-plane layers; the `20260518T145858Z` action implemented the consumer-side current-output family cap across deep analysis, live analysis, and first-level analysis, passed `node --check` for the three scripts, restarted live analysis, and measured `noProductQueuedOrRunning=0` on current root `run-20260518T152256Z` | Monitor the moving current root after the cap, preserve one product-evidence representative and likely-real records, and treat the result as control-plane health only |
| Current fuzz validation | `run-20260518T152256Z`, startup-only raw novelty status at `2026-05-18T15:28:07.653Z`, trend generated at `2026-05-18T15:21:01Z` from last full pass at `2026-05-18T15:03:35Z` | latest raw novelty status is not a full pass: observed roots `497`, previous records loaded `86722`, active run dirs `1`, and unmet/triage/likely-real/duplicate metrics are pending; the trend snapshot still shows `4` unmet goals, current duplicate share `0`, historical duplicate share `0.3421`, and high CPU/load | Wait for a full raw novelty pass before making current-run likely-real or duplicate claims; accepted product evidence, owner replay, exact branch audit, PR02B validation, seed `1020002` repair/reclassification, and final PR-stack validation are still required before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw PR07D, PR17, PR18,
PR18x, or zero-byte/stale finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement Cycle325/i40 parallel-lane shape above, now including
   PR02B as a sidecar after PR02. Treat the Cycle 372 post-`150601` audit as
   the current Parallel Progress Gate proof, but not complete filing proof or
   GitHub-publication proof. PR02B still needs seed `1030001`, HTTP
   persistence-probe, targeted PHPUnit, PR CI, and a verified GitHub branch
   link. Continue rejecting zero-byte/no-evidence `20260518T140542Z` and
   `20260518T144555Z` as progress.
2. Treat PR07 as a two-stage decision fork: first compare current `PR07B0`
   against the restacked `121507`/`134558` saved-response/persisted-CRDT hydration
   candidate after `PR07A3`; then compare current `PR07B1A` against a
   conflict-resolved
   `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`
   stale-epoch candidate after the chosen `PR07B1`. Do not file the PR07 lane
   until conflict resolution, exact branch links, materialized refs,
   `git diff --check`, and owner replay choose replace/add/reorder for both
   forks.
   Treat `5817434bb6cf` / seed `1100001` as separate reload/provider rejoin
   awareness evidence, not coverage from `PR07B1A`.
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
   implemented `145858Z` consumer cap, and the latest novelty/trend status as
   control-plane health, not product validation or final-stack readiness.
10. After PR07 decision fork owner evidence, exact branch-link audit for
   missing rows, PR02B validation, and seed `1020002` repair or
   reclassification land, rebuild the combined validation stack from explicit
   Cycle325/i40 heads plus accepted epoch work, then run focused checks,
   touched-file lint, branch graph/containment evidence, adjacent
   range-diffs/diffstats/numstats, `git diff --check`, feasible runtime checks,
   and fresh stack-wide validation.

The current useful bounded work is:

- use the completed `rtc-cycle372-post-150601-current-deferred-bundle-manifest-audit`
  as the current proof that the `150601` finalization is nonzero and locally
  publish-current, while preserving its `6` warnings and its note that local
  publish currentness is not GitHub publication;
- run `rtc-cycle372-pr07-materialized-decision-fork-owner-replay`: resolve the
  `121507`/`134558` and `056aa92f293` decision-fork material, require
  `git ls-files -u` empty, no conflict markers, `git diff --check`,
  materialized refs, and only then owner replay snapshots;
- run `rtc-cycle372-pr02b-http-awareness-rejoin-1030001-validation`: validate
  PR02B with seed `1030001`, a short HTTP persistence-probe shard, targeted
  PHPUnit after bootstrap is available, then PR CI;
- run PR07 owner replay after conflict-free materialized candidates exist,
  comparing the chosen PR07B0/PR07B1 path, current PR07B1A, restacked
  `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049` if produced,
  PR03B, HOLD-07B2, HOLD-07C, and reload diagnostics;
- run focused deep triage for `5817434bb6cf` / seed `1100001` with
  room/provider/awareness snapshots before assigning ownership;
- run bounded reload diagnostics using `145637` with seeds `1100005`,
  `1100003`, `5200002`, and `5200003`; run rich-text/button undo-redo
  diagnostics using `145134` with seed `5100002`; continue pre-save search
  diagnostics using `145132`; keep all three evidence-only until a boundary
  result exists;
- keep the Cycle 368 strict parser-transform `67cd59` PR05 owner comparison as
  current evidence that assigns no `PR18x`;
- resolve the remaining deferred-freshness warnings, including blocked
  `134558Z`, post-finalization pre-save search and rich-text reports,
  still-open stale-epoch/reload coverage/downscope, zero-byte/no-evidence
  `140542Z`, zero-byte/no-evidence `144555Z`, newer deferred rows such as
  `142620`, `142622`, `143625`, `144128`, and the `150642` pre-save search
  mismatch noted by the `150601` audit, with later finalization, downscope,
  owner comparison, or a newer bounded audit;
- keep the completed strict parser/linebreak/rich-text owner comparison against
  PR05B, PR05C, and clean PR05D as current evidence;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`;
- refresh candidate/deferred status using only nonzero completed reports; never
  count `report.tmp`, setup-only, disk-preflight-only, zero-byte reports, or job
  launch alone as evidence;
- enforce the progress-gate rule so wait-only feedback, active sessions,
  `report.tmp`, zero-byte reports, disk-preflight-only output, job launch alone,
  stale or manifest-only output, and strict reductions without owner comparison
  cannot satisfy progress while actionable gate rows exist;
- monitor the bounded consumer-side duplicate/noise family cap implemented by
  `duplicate-noise-20260518T145858Z-feedback-action.md`, and verify
  product-evidence representative preservation on the moving current root
  before making any yield or product claims;
- wait for a full raw novelty pass on `run-20260518T152256Z` before making
  current-run duplicate/noise or likely-real claims.

Do not launch broad final-stack fuzz, a duplicate broad/final-stack seed
`1020002` job outside focused diagnostic replay, raw PR07D, raw deferred
publication, PR17, PR18, PR18x promotion, duplicate PR07 replay, or extra
browser lanes.
