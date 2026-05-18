# RTC Jetstream2 Fix And PR Status Report

Snapshot time: `2026-05-18T19:56:25Z`

Trigger event:
`pr-split-2026-05-18T19-55-38Z-20260518T194610Z`

Remote host:
`exouser@danluu-fuzzer.cis251402.projects.jetstream-cloud.org`

Remote fix-planning workspace:
`/media/volume/danluu-fuzz-data/rtc-fix-plan-20260514`

Remote fuzz workspace:
`/media/volume/danluu-fuzz-data/rtc-fuzz-validation-20260515/repo`

Inputs for this update were collected under:
`/private/tmp/rtc-jetstream2-fix-pr-status-autoupdate/runs/pr-split-2026-05-18T19-55-38Z-20260518T194610Z/inputs/remote`

## PR Split Refinement Policy

The PR split here is a working hypothesis, not a constraint. Replace, split,
merge, reorder, or drop PRs when newer fixes, fuzz evidence, branch shape, or
reviewability show a smaller, clearer, more independent, or more complete
maintainer-facing split. Do not preserve old PR numbers, old branch groupings,
or the original split merely for continuity.

## Executive Status

The split remains blocked and not fileable. The latest split-persona synthesis
at `20260518T194610Z` agrees with the Cycle 388 feedback action: keep the
Cycle378/Cycle386/Cycle388 parallel-lane replacement shape and reject the older
linear `PR07 -> PR17 -> PR18/PR18x` tail. The blocker is evidence quality, not
split design: PR07 owner replay is still setup-blocked, `PR02B` validation is
setup/bootstrap-only despite a top-level `PASS` report, and current fuzz status
is startup/full-pass-pending, not split evidence.
The current maintainer-facing recommendation is still the parallel-lane shape
over the Cycle325/i40 source material:

- keep the ready/local lane;
- keep the CRDT/data-loss lane from `PR06D`;
- keep `PR02B` only as a blocked-validation sidecar after `PR02`;
- treat `PR07` as a runtime-gated decision fork, not as a linear tail;
- add `PR07B0A-155713` to the first `PR07` decision comparison;
- include `PR07B1`, `PR07B1A`, `PR07B1A-ALT-131542`, `PR03B`,
  `HOLD-07B2`, `HOLD-07C`, and lower-layer controls in the second comparison;
- keep final-stack fuzzing, stack-wide validation, and GitHub filing blocked
  until PR07 owner evidence and PR02B validation are resolved.

The latest applied action in `current-pr-split.md` is now Cycle 388. It keeps
the Cycle 386 finalization/PR07 setup evidence, then launches the two bounded
jobs that the split-persona synthesis requested:

```text
runs/20260518T183752Z/jobs/outputs/rtc-cycle386-post-latest-finalization-local-publish-audit/report.md
runs/20260518T183752Z/jobs/outputs/rtc-cycle386-post-latest-finalization-local-publish-audit/cycle386-local-push-manifest.tsv
runs/20260518T183752Z/jobs/outputs/rtc-cycle386-pr07-owner-matrix-replay-repaired/branch-links.tsv
runs/20260518T183752Z/jobs/outputs/rtc-cycle386-pr07-owner-matrix-replay-repaired/candidate-downscope.tsv
runs/20260518T183752Z/jobs/outputs/rtc-cycle386-pr07-owner-matrix-replay-repaired/replay-plan.tsv
runs/20260518T183752Z/jobs/outputs/rtc-cycle386-pr07-owner-matrix-replay-repaired/report.md
runs/20260518T191310Z/jobs/outputs/rtc-cycle388-pr07-missing-test-plugin-setup-repair-owner-replay/report.md
runs/20260518T191310Z/jobs/outputs/rtc-cycle388-pr07-missing-test-plugin-setup-repair-owner-replay/classification.tsv
runs/20260518T191310Z/jobs/outputs/rtc-cycle388-pr02b-validation-1030001/report.md
runs/20260518T191310Z/jobs/outputs/rtc-cycle388-pr02b-validation-1030001/classification.tsv
```

The Cycle 386 finalization/local-publish audit completed `PASS` for the latest
nonzero finalization, `20260518T183710Z`. It found `33` ready product rows,
`2` ready sidecar rows, `8` ready harness rows, `12` blocked rows, `0`
ready/sidecar base allowlist violations, and `43` ready/sidecar/harness rows
missing from `latest-local-publish-manifest.tsv`. Treat this as local-host
freshness and job-local push-manifest evidence only; the cycle325/i40 ready
rows still need local-machine publication through that manifest before GitHub
filing claims.

The Cycle 386 PR07 owner-matrix rerun regenerated branch links from
`20260518T183710Z` / Cycle325-i40, used finalized `PR07B0A-155713` at
`d96bd2c719f9838a1e87ac9bbf500eaf31afdf74`, and downscoped
`121507`/`134558` unless they are re-materialized as distinct current refs.
`wp-env start` succeeded on isolated ports `12231` / `12232` / `12233`, and all
`48` replay rows were attempted. Every row failed before the oracle because the
job-local environment is missing
`gutenberg-test-plugin-disables-the-css-animations`; no first-divergence
snapshots were produced, and no PR07 arm is promoted by branch-link,
runtime-startup, or pre-oracle replay evidence alone.

Cycle 388 did not promote any PR07 arm or file `PR02B`. It created a PR07
missing-test-plugin setup repair/owner replay job that consumes the Cycle 386
branch links and replay plan, merges the needed `.wp-env.test.json` plugin
mappings into the job-local `.wp-env.json`, verifies the CSS-animation and RTC
WebSocket provider test plugins before fanout, and reruns only the owner-matrix
rows needed to reach the oracle. It also created the isolated `PR02B`
validation job for seed `1030001`, a short HTTP persistence-probe shard, and
targeted `phpunit/tests/collaboration/wpHttpPollingSyncServer.php` after
bootstrap.

The `20260518T194610Z` split-persona synthesis checked those artifacts and
keeps both gates blocked. The Cycle 388 PR07 job still has no `report.md` and
only header-only `classification.tsv` / `replay-runs.tsv` output, so it
provides no owner evidence. The Cycle 388 `PR02B` job has a nonzero report, but
all three validation rows are setup/bootstrap failures, including the `12301`
`wp-env` port collision and uninitialized `wp-env`. The top-level `PASS` in
that report must be treated as bad status accounting, not validation success.
The newer `20260518T193728Z` finalization report is nonzero, but it explicitly
keeps both PR07 and `PR02B` blocked.

Cycle 380 remains local-host proof for the older nonzero `20260518T170639Z`
finalization. Cycle 382 remains completed PR07C/HOLD-07C red-owner evidence.
Cycle 386 supersedes Cycle 384 for finalization freshness and PR07 replay setup,
but it is not GitHub publication, product-promotion proof, final-stack
validation, PR07 owner proof, or exact branch-link proof for rows that still say
`No verified branch link yet`. Cycle 388 now proves the next gates are still
blocked: PR07 lacks a nonzero report, and the `PR02B` report is setup-only due
to the `12301` port collision and uninitialized `wp-env`.

Two Cycle 376 preflights also passed:

- `PR02B` exists as
  `refs/heads/finalized/cycle325-i40/sidecar/rtc-pr02b-http-awareness-rejoin-retry-140108`,
  is clean against PR02, and has seed `1030001` source evidence. Cycle 388
  launched its validation job, but `PR02B` remains blocked until seed/probe,
  targeted PHPUnit, PR CI, and exact branch-link evidence pass.
- `HARNESS-RELOAD-MARKERS-154206` exists at
  `35c685bb148bf84372365e0e187d5308bd28f41f`, has replay JSON candidates for
  seeds `990001` and `990003`, and has a clean diff, but remains
  harness/diagnostic setup only.

The newest split-persona synthesis, `pr-split-20260518T194610Z-synthesis.md`,
still recommends that replacement split, not the older linear PR07 tail. The
split is still blocked by PR07 owner-matrix adjudication, `PR02B` validation,
missing exact verified GitHub refs for many active rows, seed `1020002`
handling or reclassification, and final-stack validation. Cycle 386 moved the
finalization/local-publish audit from unaudited to `PASS`, but also proved PR07
was setup-blocked at the missing e2e test plugin before any owner oracle could
run. Cycle 388 launched the bounded setup repair and PR02B validation jobs; the
latest artifact check shows PR07 still lacks a nonzero report, `PR02B` failed
only in setup/bootstrap on port `12301` / uninitialized `wp-env`, and the
nonzero `20260518T193728Z` finalization still leaves both blocked.
`PR07B0A-155713` remains the key split candidate after `PR07B0`; raw `155713`
full-stack output remains a hazard and must not be pushed as a PR.

Current split recommendation:

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
then compare:
  current PR07B0
  PR07B0A-155713
  materialized 121507 / 134558 saved-response persisted-CRDT hydration,
    if distinct
  HOLD-07C
winner or additive result -> PR07B1 only if still independent
then compare:
  PR07B1
  PR07B1A
  PR07B1A-ALT-131542 and 111430 / 114448 / 123016 / 124525 /
    130034 / 131542 / 133049 stale-epoch alternates
with PR03B, HOLD-07B2, HOLD-07C, PR05B, PR05C, clean PR05D,
PR14, and PR15D kept as comparison/control arms

CRDT/data-loss lane from PR06D:
PR09 -> PR10 -> PR11A -> PR11B -> PR11C -> PR11D -> PR11E
-> PR12A -> PR12B -> PR12C
-> PR13A -> PR13B0 -> PR13B1 -> PR13B2 -> PR13B3
-> PR14 -> PR14B -> PR15A -> PR15B -> PR15C -> PR15D
```

Do not file raw `PR07D`, raw `deferred/*`, raw diagnostic heads, raw `155713`,
fallback-tail `PR05D`, `PR17`, `PR18`, or `PR18x`. Do not treat `PR02B`,
`PR07B0A-155713`, reload-marker diagnostics, pre-save search, rich-text suffix,
the audited `170639` finalization, the Cycle 386 audited `183710`
finalization/local-publish manifest, Cycle 386 PR07 branch/replay artifacts,
Cycle 388 PR07/PR02B outputs, PR07C red replay evidence, or the Cycle 382 PR07C
owner classification as product PRs until their specific replay, owner,
branch-link, publication, and validation gates pass.

The latest raw novelty status is root `run-20260518T195211Z`. It is still a
startup status only because the full coverage pass is pending, but it now has
`supervisor-groups.json` present with one group and one active run dir. The
latest duplicate/noise synthesis identifies the scheduler leak as historical
no-product startup cooldowns starving bootstrap materialization; the completed
feedback action moved the novelty policy to version `31`, tightened no-product
startup handling, preserved product-evidence representatives, restarted the
active novelty/supervisor sessions, and cleaned stale orphan monitors. Treat
this as completed control-plane remediation plus startup-only follow-up
evidence, not product validation, PR validation, or final-stack evidence.

## Branch And Ref Status

Remote status was collected at `2026-05-18T19:56:20Z`.

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

The branch-link audit was generated at `2026-05-18T19:56:25Z` from fetched
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
| PR 2B | HTTP polling awareness rejoin retry after PR2 | No verified branch link yet | TBD | TBD | preflight passed in Cycle 376; Cycle 388 validation produced a nonzero report with a top-level `PASS`, but all three rows are setup/bootstrap failures including the `12301` `wp-env` port collision and uninitialized `wp-env`, so the row remains blocked until seed/probe/PHPUnit validation, PR CI, and verified GitHub branch link pass |
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
| PR 7B0-current | Current save-response manager/base-record entry candidate after PR07A3 | No verified branch link yet | TBD | TBD | first decision-fork arm; compare against `PR07B0A-155713`, distinct re-materialized `121507`/`134558` only if they exist, and `HOLD-07C` before accepting the PR07B1 base |
| PR 7B0A-155713 | Saved-CRDT hydration candidate after PR07B0 | No verified branch link yet | TBD | TBD | key runtime-gated candidate; Cycle 386 used finalized head `d96bd2c719f9838a1e87ac9bbf500eaf31afdf74`, regenerated branch/replay artifacts from the audited `183710` finalization, then failed all 48 replay rows before the oracle because `gutenberg-test-plugin-disables-the-css-animations` is missing; Cycle 388 launched the bounded plugin-setup repair/owner replay, but the latest artifact check still has no `report.md` and only header-only TSVs, so owner adjudication, exact verified branch link, and seed `990001` replay are still missing; raw `155713` full-stack ref must not be pushed |
| PR 7B0-alt? | Restacked `121507`/`134558` saved-response/persisted-CRDT hydration candidate | No verified branch link yet | TBD | TBD | first decision-fork arm only if re-materialized as distinct; Cycle 386 downscopes them unless distinct current refs exist |
| PR 7B1 | Save response manager/base-record owner microhead after the chosen PR07B0 arm | No verified branch link yet | TBD | TBD | not file-ready until the first PR07 decision comparison is decided; include as a comparison arm in the second owner matrix |
| PR 7B1A | Current stale sync-manager entity epoch guard | No verified branch link yet | TBD | TBD | second decision-fork arm; compare against `PR07B1`, `PR07B1A-ALT-131542`, stale-epoch alternates, `PR03B`, `HOLD-07B2`, `HOLD-07C`, and lower-layer controls before claiming coverage |
| PR 7B1B? | Restacked `111430/114448/123016/124525/130034/131542/133049` reload/stale-epoch candidate | No verified branch link yet | TBD | TBD | second decision-fork arm; compare `PR07B1A-ALT-131542` and the `056aa92f293` hold/evidence family, but no accepted ref exists |

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
| PR 7B aggregate | Save response manager/base-record guards | [`review/rtc-pr07b-save-response-manager-base-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr07b-save-response-manager-base-record) | verified prior art, not the active PR07B0/PR07B0A/alternate decision, chosen PR07B1 row, or stale-epoch decision |
| PR 8 | Reload title and persisted-record hydration | [`review/rtc-pr08-title-reload-persisted-record`](https://github.com/danluu/gutenberg/tree/review/rtc-pr08-title-reload-persisted-record) | verified prior art, not an active filing unit |
| PR 11 aggregate | Explicit-base top-level block operations | [`review/rtc-pr11-explicit-base-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr11-explicit-base-top-level-ops) | verified aggregate prior art; replaced by active PR11A-E recommendation |
| PR 12 aggregate | Previous-local-cache top-level block operations | [`review/rtc-pr12-previous-local-cache-top-level-ops`](https://github.com/danluu/gutenberg/tree/review/rtc-pr12-previous-local-cache-top-level-ops) | verified aggregate prior art; replaced by active PR12A-C recommendation |
| PR 15A component | Fallback group move stale reorder | [`review/rtc-pr15a-fallback-group-move-stale-reorder`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15a-fallback-group-move-stale-reorder) | verified component prior art; active PR15A-D exact PR14B-based refs still missing |
| PR 15B component | Fallback group insert anchor | [`review/rtc-pr15b-fallback-group-insert-anchor`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15b-fallback-group-insert-anchor) | verified component prior art; active PR15A-D exact PR14B-based links still missing |
| PR 15C component | Fallback group delete | [`review/rtc-pr15c-fallback-group-delete`](https://github.com/danluu/gutenberg/tree/review/rtc-pr15c-fallback-group-delete) | verified component prior art; not a clean PR05D substitute |

## Validation And Fuzz Status

Latest collected status input:

```text
collected_at_utc: 2026-05-18T19:56:20Z
coverage_root: /media/volume/danluu-fuzz-data/rtc-coverage-guided-20260515/run-20260518T195211Z
fuzz repo branch: try/rtc-fix-stack-validation
fuzz repo head: 72854f05ed2 Hydrate saved CRDT responses without invalidation
```

Latest raw novelty monitor status was written at
`2026-05-18T19:55:21.785Z`. The current root is startup-only: the full coverage
pass, guidance, and triage yield are still pending. Unlike the previous empty
root, the supervisor groups file exists and one run dir is active. This is
current fuzz/control-plane health, not final-stack validation.

Current-run health:

```text
output dir: run-20260518T195211Z
status: monitor started; full coverage pass pending
observed roots: 563
previous records loaded: 89008
supervisor groups file: 1
active run dirs: 1
coverage guidance: pending until first pass
triage yield: pending until first pass
health warning: startup status only; full novelty pass has not completed
```

Interpretation:

- The latest current-run status has not completed its first monitor pass. Do
  not infer current product coverage, likely-real yield, duplicate share, or
  final-stack validation from this root yet.
- Historical duplicate/noise remains dominated by startup/no-product families
  and must not be presented as a live product failure. Historical raw top
  families are led by `pre_action_bootstrap_stall`; the new current root has
  one materialized group but no completed triage yield yet to support product
  validation claims.
- This status does not clear PR filing, final-stack validation, PR02B
  validation, PR07 owner replay, reload-marker replay, or seed `1020002`.
- The latest duplicate/noise feedback action completed the bounded
  scheduler/admission remediation and restarted the novelty/supervisor sessions.
  The successor root still needs a full monitor pass or bounded canary evidence
  before claiming producer materialization is healthy.

The latest trend evidence packet was generated at `2026-05-18T19:47:40Z`:

```text
monitor passes: 2287
first pass: 2026-05-15T01:21:42Z
last completed pass: 2026-05-18T19:18:33Z
coverage files: 272 -> 54640
coverage files delta: 54368
unmet goals: 4
likely_real_max: 4
duplicate_share_current_last: 0
duplicate_share_historical_last: 0.3415
summary startup failures last: 0
quality issues last: 1
memory free: 419.1 GB
load averages: 50.32 / 49.27 / 50.44 on 64 cores
enabled groups current: novelty-ws-common-blocks
latest fuzz level mix:
  browser-e2e=28 lanes/25 groups
  unit-property=1 lane/1 group
  coverage-guided-lower-level=1 lane/1 group
total fuzz-level test executions: 5873513
browser-e2e likely-real findings: 769 over 2466.7 runner-hours
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
the current root is still startup-only despite one active group, historical
startup-stall/noise must remain separated from current product evidence, and
the evidence still supports targeted owner/replay work rather than broad
final-stack claims.

## Status-Persona Analysis

The newest split-persona synthesis,
`pr-split-20260518T194610Z-synthesis.md`, says the report needs the
Cycle378/Cycle386/Cycle388 replacement split, not the older linear PR07 tail.
It also checked the latest artifacts: Cycle 388 PR07 still has no `report.md`
and only header-only `classification.tsv` / `replay-runs.tsv`; Cycle 388
`PR02B` has a nonzero report, but all three rows failed during setup/bootstrap
because port `12301` was already occupied or `wp-env` was uninitialized; and
the new `20260518T193728Z` finalization report is nonzero but still keeps PR07
and `PR02B` blocked. The top-level `PASS` in the `PR02B` report is explicitly
not valid validation evidence and should drive status-accounting repair. The
split is still not fileable and not ready for broad final-stack fuzzing because
owner/validation proof is missing, exact branch publication/audit is still
missing for many active rows, seed `1020002` still needs handling or
reclassification, and final-stack validation remains unresolved.

Cycle 380 remains local-host proof for the older nonzero `20260518T170639Z`
finalization, not filing proof. Cycle 382 added a completed `PASS`
owner-snapshot classification from the Cycle 380 PR07C replay reds; it
classified PR07C/HOLD-07C as red-held and not promotable, with five
first-divergence rows across seeds `5200011`, `5200017`, `5200010`, `7110004`,
and `7110017`. Cycle 386 supersedes Cycle 384 for finalization freshness
and PR07 replay setup: the post-latest-finalization/local-publish audit passed
for `20260518T183710Z`, and the repaired PR07 owner-matrix job wrote nonzero
branch links, candidate downscope, replay plan, and report artifacts. The PR07
replay still produced no owner evidence because all 48 rows failed before the
oracle on missing `gutenberg-test-plugin-disables-the-css-animations`. Cycle
388 is the repair attempt for that setup blocker; it is not owner evidence until
the report and classification complete.

The active split shape remains:

1. Keep `PR02B` as a blocked-validation sidecar after `PR02`. Cycle 376
   preflight proved branch/source readiness; Cycle 388 launched validation, but
   does not prove runtime validation yet.
2. Run `PR07A1 -> PR07A2 -> PR07A3`, then compare current `PR07B0`,
   `PR07B0A-155713`, materialized `121507`/`134558` saved-response
   persisted-CRDT hydration only if distinct, and `HOLD-07C`.
3. Move to `PR07B1` only if the winning or additive `PR07B0` result is still
   independent.
4. Then compare `PR07B1`, current `PR07B1A`, `PR07B1A-ALT-131542`, and
   `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`.
5. Keep `PR03B`, `HOLD-07B2`, `HOLD-07C`, `PR05B`, `PR05C`, clean `PR05D`,
   `PR14`, and `PR15D` as comparison/control arms.
6. Downscope `121507`/`134558` unless they are re-materialized as distinct
   refs; Cycle 386 also downscoped them unless distinct current refs exist.
7. Keep raw `PR07D`, raw deferred heads, `PR17`, `PR18`, `PR18x`, broad
   reload-hydration publication, and fallback-tail `PR05D` out of the filing
   plan.

The latest applied action in `current-pr-split.md` is Cycle 388. Treat the
Cycle 386 local-publish audit as local-host evidence only: it reports `33`
ready product rows, `2` ready sidecar rows, `8` ready harness rows, `12`
blocked rows, `0` ready/sidecar base allowlist violations, and `43`
ready/sidecar/harness rows missing from `latest-local-publish-manifest.tsv`.
Treat the Cycle 386 PR07 branch/replay files as setup evidence only, and treat
the Cycle 388 PR07/PR02B outputs as blocked gate work: PR07 lacks a nonzero
report, and `PR02B` is setup/bootstrap-only due to the `12301` port collision
and uninitialized `wp-env`.
Cycle 382 remains completed Parallel
Progress Gate owner-classification proof only, and Cycle 380 remains local-host
`170639` finalization freshness proof only. None clears GitHub publication,
product-promotion, final-stack validation, PR07 owner proof, PR02B validation,
or exact branch-link gates for rows that still say `No verified branch link
yet`.

The `20260518T194610Z` split-persona synthesis recommends bounded Cycle 390
automation only, and no broad fuzzing or filing:
`rtc-cycle390-pr07-plugin-map-hard-timeout-owner-replay`,
`rtc-cycle390-pr02b-port-clean-validation-1030001`, and
`rtc-cycle390-loop-progress-gate-repair`. These are next-action
recommendations, not completed artifacts in `current-pr-split.md`.

The next useful work is bounded, not broad:

- reap or terminally mark the setup-blocked Cycle 388 PR07 job, then rerun one
  bounded PR07 owner replay with hard process-group timeouts around plugin-map
  and WP-CLI smoke; do not promote an arm unless oracle-level owner evidence is
  produced;
- rerun `PR02B` validation with verified-free ports and a fresh `WP_ENV_HOME`;
  keep `PR02B` blocked until seed `1030001`, HTTP persistence-probe, targeted
  PHPUnit, PR CI, and branch-link audit pass;
- use the Cycle386 job-local push manifest for ready/local publication audit
  work; do not rely on stale `latest-local-publish-manifest.tsv`;
- publish/fetch/audit exact GitHub refs for active rows that still have no
  verified branch link;
- repair status accounting so setup/bootstrap failures are `blocked` or `FAIL`,
  not top-level validation `PASS`;
- keep broad final-stack fuzzing, filing, and stack validation blocked.

Loop repair remains part of the status: feedback cycles with actionable
Parallel Progress Gate rows must create or verify a nonzero independent
artifact. Active sessions, seed `1020002`, zero-byte reports, missing
`report.md`, `report.tmp`, disk-preflight-only output, stale manifests,
fallback-tail PR05D manifests, and runtime-startup-only output must not count as
progress.

The newest duplicate/noise synthesis,
`duplicate-noise-20260518T193941Z-synthesis.md`, identifies the remaining
producer/scheduler admission issue: historical/reusable no-product
`pre_action_bootstrap_stall` cooldowns can be carried into a new coverage root
and treated as hard active bootstrap blockers, starving current-run browser
capacity. The paired `20260518T185711Z` feedback action already implemented the
bounded control-plane fix: no-product startup stall guard default `1`, novelty
monitor policy version `31`, producer-state precedence for no-product startup
holds, reusable duplicate-family cooldowns for producer gating, preserved
product-evidence representatives, and restarted coverage-guided
novelty/supervisor sessions. The successor root `run-20260518T195211Z` is still
startup-only, but it now has one supervisor group and one active run dir, so
this is completed scheduler remediation plus pending observation, not product
or final-stack validation.

The completed status-analysis reports through
`final-20260516T040744Z-final-analysis.md` remain useful for report hygiene:
separate current fuzz health from historical noise, keep evidence-only
families out of the split, and make filing gates explicit. Their older exact
fuzz numbers, old enabled-group claims, old "keep existing split" guidance, and
old PR13 GitHub-ref caveats are superseded by the current branch-link audit,
the Cycle388 split/action state, the repaired PR13 review refs, and the latest
novelty/trend evidence.

## Deferred Or Evidence-Only Work

These must not be described as fixed or filing-ready.

| Family | Rows / refs | Current status | Next evidence gate |
| --- | --- | --- | --- |
| i40 source family | `fresh-prset/iteration-40/*`, `finalized/cycle324-i40/*`, Cycle325/i40 manifests, audited nonzero `20260518T130525Z`, `133533Z`, Cycle 368 `135539Z`, audited `143551Z`, `145558Z`, `150601Z`, `152607Z`, `153610Z`, `160619Z`, `163628Z`, Cycle 380 `170639`, unaudited `175655`, zero-byte-report `180659`, unaudited nonzero `182705`, Cycle 386 audited latest nonzero `183710`, Cycle 382 PR07C owner snapshot classification, Cycle 386 PR07 owner-matrix branch/downscope/replay/report artifacts, Cycle 388 PR07 setup-repair and PR02B validation outputs, nonzero `20260518T193728` finalization, `PR07B0A-155713`, `121507`, `134558`, `123016`, `123520`, current `PR07B0`, current `PR07B1A`, raw reload/stale-epoch candidates `111430`/`114448`/`123016`/`124525`/`130034`/`131542`/`133049`, deferred reload/search/rich-text diagnostics | active source family; Cycle 386 local audit passed for `183710` with a job-local push manifest, `33` ready product rows, `2` ready sidecar rows, `8` ready harness rows, `12` blocked rows, `0` ready/sidecar base allowlist violations, and `43` ready/sidecar/harness rows still missing from `latest-local-publish-manifest.tsv`; Cycle 386 PR07 replay setup attempted 48 rows but all failed before the oracle on missing `gutenberg-test-plugin-disables-the-css-animations`; Cycle 388 PR07 still has no `report.md` and only header-only TSVs, Cycle 388 PR02B has a nonzero report whose top-level `PASS` is invalid because all rows are setup/bootstrap failures from the `12301` port collision or uninitialized `wp-env`, and the nonzero `20260518T193728` finalization still keeps PR07 and PR02B blocked; none is GitHub publication, product-promotion proof, exact branch-link proof, owner-matrix proof, PR02B validation proof, or final-stack validation; `121507`/`134558` remain downscoped unless re-materialized as distinct current refs; filing remains blocked by PR07 owner evidence, missing verified GitHub links, seed `1020002`, PR02B validation, reload-marker replay/downscope, and final validation | Repair/rerun PR07 setup-repair and PR02B free-port validation, publish/fetch/audit exact GitHub links, use the Cycle386 job-local push manifest for local publication audit work, repair or reclassify seed `1020002`, repair setup-only status accounting, and run final-stack validation gates |
| Missing verified product refs | PR02A, PR02B, PR05A-D, PR06A-D, PR06E, PR07A1-A3, PR07B0-current, PR07B0A-155713, PR07B0-alt/`121507`/`134558`, PR07B1, PR07B1A, possible PR07B1B including `124525`/`130034`/`131542`/`133049`, `HOLD-07B2`, `HOLD-07C`, PR11A-E, PR12A-C, PR13B0-B3, PR14B, PR15A-D | active rows correctly say `No verified branch link yet` | Publish/fetch/audit explicit GitHub refs before filing |
| PR02B | HTTP polling awareness rejoin retry after PR2, seed `1030001` | recommended sidecar; Cycle 376 preflight passed branch/source checks; Cycle 388 validation has a nonzero report with a misleading top-level `PASS`, but all three rows are setup/bootstrap failures from the `12301` `wp-env` port collision or uninitialized `wp-env`; no product validation, CI, or branch-link proof is in the collected status yet | Rerun with verified-free ports or Playwright webServer reuse and fresh `WP_ENV_HOME`, then require seed `1030001`, short HTTP persistence-probe, targeted PHPUnit after bootstrap, PR CI, and exact branch-link audit |
| PR07 runtime / owner gate | PR07A1-A3, current PR07B0, `PR07B0A-155713`, `121507`/`134558`, chosen PR07B1, current PR07B1A, raw `111430/114448/123016/124525/130034/131542/133049`, `HOLD-07B2`, `HOLD-07C`, reload/provider rejoin evidence `5817434bb6cf` / seed `1100001` | runtime readiness has durable repaired-ready evidence and Cycle 386 local audit proof, but product ownership is unresolved; Cycle 386 regenerated PR07 branch links, used finalized `PR07B0A-155713` at `d96bd2c719f9838a1e87ac9bbf500eaf31afdf74`, started `wp-env` on isolated ports, and attempted 48 replay rows, but all failed before the oracle because `gutenberg-test-plugin-disables-the-css-animations` is missing; Cycle 388 attempted the plugin-map/setup repair and owner replay, but the latest artifact check still has no `report.md` and only header-only TSVs; no first-divergence snapshots or promotion decision are collected yet | Repair the Cycle 388 PR07 setup path so it emits a nonzero report, then require plugin-map smoke success, oracle-level replay rows across seeds `5200011`, `5200017`, `5200010`, `7110004`, `7110017`, and `990001`, comparison of `PR07B0`, finalized `PR07B0A-155713`, materialized `121507`/`134558` only if distinct, `PR07B1`, `PR07B1A`, `PR07B1A-ALT-131542`, `PR03B`, `HOLD-07B2`, `HOLD-07C`, and lower-layer controls, plus clean materialized refs with `git diff --check`, owner snapshots, durable REST/meta, `_crdt_document`, edited-record, provider/awareness, UI collaborator, branch-head, and first-divergence evidence |
| PR07D | reload/post-save/rejoin residuals | raw PR07D is rejected | Add only if fresh PR07 replay proves red-at-HOLD-07C non-coverage with first-divergence evidence |
| PR05D and rich-text/search reductions | clean PR05D `27c6e7924217`, search/live-collapse, rich-text suffix, parser/linebreak candidates, rich-text `142117` harness/setup hardening | diagnostic or held until owner comparison proves product ownership; strict owner comparison assigns no `PR18x` yet | Compare against PR05B, PR05C, clean PR05D, the chosen PR07B0/PR07B1 path, PR07B1A, and holds before assigning any new owner row |
| PR06 ungrouping and PR06E | active PR06A-D plus PR06E | grouped PR06 and PR06A prior-art refs are verified; active PR06A-D and PR06E have no exact verified links | Publish/fetch/audit exact refs, then prove `PR06D -> PR06E`, `PR07 !-> PR06E`, and adjacent evidence for PR06A-D |
| PR09 placement | PR09 through PR15D | CRDT/data-loss lane starts from PR06D, not PR07 | Prove `PR06D -> PR09`, chosen `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old `HOLD-07B2 !-> PR09/PR15D`, and no PR07 serialization |
| PR11 / PR12 ungrouping | PR11A-E and PR12A-C | grouped PR11/PR12 have verified aggregate prior-art links only; active sub-PR refs are missing | Publish/fetch/audit explicit sub-PR refs and preserve adjacent diffstat/patch-id evidence |
| PR13 finer split | repaired PR13A/PR13B/PR13C plus desired but unaudited PR13B0/B1/B2/B3 | PR13A/B/C use repaired verified audit refs and are the only current PR13 PR-content links | Publish/fetch/audit PR13B0/B1/B2/B3 before replacing the repaired PR13A/B/C maintainer-facing rows |
| PR14B / PR15 placement | PR14B and active PR15A-D after PR14B | branch-link audit verifies PR15A-C component prior art, but no exact PR14B-based PR15A-D refs | Publish/fetch/audit explicit PR14B-based PR15A-D refs and confirm ancestry |
| Seed `1020002` WebSocket marker divergence | terminal/downscope classifications | blocks final-stack fuzzing, filing, and rebuilt validation only | Repair or explicitly reclassify before final-stack validation and filing |
| Reload marker/lifecycle work | `HARNESS-RELOAD-MARKERS-154206`, `HARNESS-RELOAD-REPLAY-163231`, `HARNESS-RELOAD-WS-CONFIG-164740`, seeds `990001`/`990003`, same-user lifecycle seeds `5200001`/`5200002`/`5200005`/`1130001`/`1130002`, PR07C seeds `5200011`/`5200017`/`5200010` and `7110004`/`7110017`, completed `170248`, no-report `170250`, reload deferred output `173306` | preflight passed for marker branch and replay JSON candidates; Cycle 380 PR07C replay is durable red evidence, and Cycle 382 classified PR07C/HOLD-07C as red-held/not promotable, but Cycle 386 showed the full owner replay blocked before the oracle by missing test-plugin setup; Cycle 388 is the pending setup repair; `164740` and `170248` reload reports are harness/diagnostic only until replay proves product ownership; `170250` is not evidence and `173306` still needs deferred audit | Consume the Cycle 388 PR07 owner replay when present, run WS-config replay on seed `1130001` and then `1130002` only as diagnostic harness validation if still needed, then require product-owned first-loss boundary before promotion |
| Duplicate/noise producer/control-plane churn | strict no-product startup stalls, startup-noise cooldowns, empty materialization rescue, fallback enablement, current no-analysis drains, ordinary fallback rotation, bounded canary policy | latest synthesis identified a producer/scheduler admission leak in historical/reusable no-product startup cooldowns; Cycle 210 feedback action implemented the bounded fix, including no-product startup hold precedence, reusable duplicate-family cooldowns, product-evidence representative preservation, policy version `31`, syntax checks, novelty/supervisor restart, and stale monitor cleanup; the latest raw novelty root `run-20260518T195211Z` is startup-only with full pass pending, but now has one supervisor group and one active run dir | Observe the successor root through a full pass or bounded canary; verify current producer materialization remains nonempty without hiding product-evidence representatives; do not treat this as product validation |
| Current fuzz validation | `run-20260518T195211Z`, raw novelty status at `2026-05-18T19:55:21.785Z`, trend generated at `2026-05-18T19:47:40Z` | current raw status is startup-only with full pass pending, observed roots `563`, previous records loaded `89008`, supervisor groups file `1`, and active run dirs `1`; latest trend shows `54640` graph coverage files, `4` unmet goals, current duplicate share `0`, historical duplicate share about `0.3415`, quality issues `1`, browser-e2e at `28` lanes / `25` groups, enabled current group `novelty-ws-common-blocks`, and `769` browser-e2e likely-real findings over `2466.7` runner-hours | Use as current health/control-plane evidence only; still require accepted product evidence, owner replay, exact branch audit, PR02B validation, reload-marker replay/downscope, seed `1020002` repair/reclassification, and final PR-stack validation before filing claims |

## Filing Gates And Current Recommendation

Do not file a single mega-PR and do not file grouped Cycle320/i40 PR06, PR11,
PR12, or PR15 as active units. Do not file stale Cycle293/Cycle306 rows,
stale/unpushed i40 rows, `ready/*`, validation-stack, dirty evidence,
fallback-tail branches, raw deferred/candidate refs, raw `155713`, raw PR07D,
PR17, PR18, PR18x, or local finalization artifacts as-is.

Before filing any maintainer-facing PR:

1. Use the replacement Cycle378/Cycle386/Cycle388 parallel-lane shape
   above, including `PR02B` as a blocked-validation sidecar after PR02 and
   `PR07B0A-155713` as a blocked PR07 decision-fork candidate.
2. Treat the Cycle 380 post-`165635` audit of the later nonzero `170639`
   finalization as local-host freshness proof only, and treat the Cycle 382
   PR07C owner-snapshot classification as red-held owner evidence only. Treat
   the Cycle 386 `183710` finalization/local-publish audit as local-host
   freshness plus job-local push-manifest evidence only. Treat Cycle 386 PR07
   branch/replay files as setup evidence only because all 48 rows failed before
   the oracle on the missing e2e test plugin. Treat the Cycle 388 PR07 output
   as still blocked because it has no report and only header-only TSVs; treat
   the Cycle 388 PR02B output as setup-only because its nonzero report's
   top-level `PASS` is contradicted by three setup/bootstrap failures from the
   `12301` port collision or uninitialized `wp-env`; and treat the nonzero
   `20260518T193728`
   finalization as blocked because it keeps PR07 and PR02B unresolved. None is
   complete filing proof, GitHub-publication proof, product-promotion proof,
   final-stack validation, PR07 owner proof, PR02B validation proof, or exact
   branch-link proof. Treat `170250` as non-evidence until it has a report.
3. Do not file `PR02B` before seed `1030001`, HTTP persistence-probe, targeted
   PHPUnit, PR CI, and verified GitHub branch-link audit pass.
4. Do not file PR07 until the `PR07B0` / `PR07B0A-155713` /
   `121507`-`134558` / `HOLD-07C` comparison and the `PR07B1` / `PR07B1A` /
   `PR07B1A-ALT-131542` / stale-epoch comparison are both resolved with clean
   materialized refs, exact branch links, `git diff --check`, and owner replay
   evidence.
5. Publish/fetch/audit explicit product refs for every row that currently says
   `No verified branch link yet`.
6. Prove `PR06D -> PR06E`, `PR07 !-> PR06E`, `PR06D -> PR09`,
   chosen `PR07B1 !-> PR09`, `PR07B1A !-> PR09` where required, old
   `HOLD-07B2 !-> PR09/PR15D`, clean PR05D only, PR15A-D after PR14B, and no
   fallback-tail PR05D.
7. Run held owner comparisons for strict projection, common-blocks, rich-text,
   search/live-collapse, and reload candidates before creating new product rows.
8. Use the repaired PR13A/B/C audit links listed above for current PR13
   maintainer-facing content. Treat PR13B0/B1/B2/B3 as source-family
   evidence-only until exact verified branch links exist.
9. Keep the untracked reload-hydration gate spec out of filing branches and
   push allow-lists unless it is deliberately copied into a clean evidence
   worktree.
10. Treat the completed duplicate/noise scheduler change, the startup-only
   current-root `run-20260518T195211Z` novelty status with one active group,
   and the latest trend status as control-plane/fuzz health, not product
   validation or final-stack readiness.
11. After PR07 decision-fork owner evidence, exact branch-link audit for
   missing rows, PR02B validation, reload-marker replay/downscope, and seed
   `1020002` repair or reclassification land, rebuild the combined validation
   stack from explicit Cycle325/i40 heads plus accepted epoch work, then run
   focused checks, touched-file lint, branch graph/containment evidence,
   adjacent range-diffs/diffstats/numstats, `git diff --check`, feasible runtime
   checks, and fresh stack-wide validation.

Useful bounded work now:

- consume the completed Cycle 386 `183710` finalization/local-publish audit as
  local-host proof only, consume the completed Cycle 382 PR07C owner-snapshot
  classification as red-held/not-promotable evidence only, treat Cycle 386 PR07
  branch/downscope/replay/report artifacts as pre-oracle setup evidence, and
  repair or rerun the Cycle 388 PR07 setup-repair/owner-replay path so it emits
  a nonzero report;
- use the Cycle386 job-local push manifest for ready/local publication audit
  work because latest local-publish rows still miss Cycle325/i40 destinations;
- rerun the Cycle 388 `PR02B` validation with verified-free ports or webServer
  reuse and a fresh `WP_ENV_HOME`, and keep the sidecar blocked until
  seed/probe/PHPUnit/CI/branch-link evidence pass;
- repair status accounting so setup/bootstrap failures cannot produce a
  top-level validation `PASS`;
- run `HARNESS-RELOAD-WS-CONFIG-164740` on seed `1130001`, then `1130002` if
  needed, as diagnostic harness validation only;
- enforce the loop-repair rule that actionable status cycles must create or
  verify a nonzero independent artifact;
- publish/fetch/audit explicit GitHub refs for active i40 rows that still say
  `No verified branch link yet`;
- monitor `run-20260518T195211Z` or its successor after the completed
  duplicate/noise scheduler/admission fix until current producer materialization
  stays nonempty without hiding product-evidence signatures.

Do not launch broad final-stack fuzz, GitHub filing, rebuilt stack-wide
validation, duplicate broad seed `1020002` work outside focused diagnostic
replay, raw PR07D, raw deferred publication, PR17, PR18, PR18x promotion,
reload-marker product promotion before replay, or extra browser lanes.
